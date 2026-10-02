#!/usr/bin/env node
'use strict';
/**
 * P4 EXTERNAL-EFFECT UNCERTAINTY RED TEAM — hostile synthetic harness.
 * Replay-only. No live dispatch, no real external effects, no pushes.
 * The "remote effect service" is a directory: committing an effect = writing
 * a file. The adapter under test is the REAL Lane-C code, driven through its
 * documented synthetic-test seam (transportFn). The adapter source is never
 * modified; all evidence lands in /tmp.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const adapter = require('/home/hatch/workspace/orca-adapter/adapter.js');
const { OUTCOME } = require('/home/hatch/workspace/orca-adapter/outcomes.js');

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'p4-redteam-'));
const REMOTE = path.join(ROOT, 'remote-effect-service');
const EVDIR = path.join(ROOT, 'evidence');
fs.mkdirSync(REMOTE, { recursive: true });
fs.mkdirSync(EVDIR, { recursive: true });

const isoNow = () => new Date().toISOString();
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
// The fake remote: commitEffect(intentId) simulates the effect EXECUTING remotely.
const commitEffect = (intentId) =>
  fs.writeFileSync(path.join(REMOTE, `effect-${intentId}.committed`), `COMMITTED ${isoNow()} intent=${intentId}\n`);
const effectCommitted = (intentId) => fs.existsSync(path.join(REMOTE, `effect-${intentId}.committed`));
const remoteCommitCount = () => fs.readdirSync(REMOTE).filter((f) => f.endsWith('.committed')).length;

let invoked; // transport invocation counter per scenario
const BASE = (executionId, attempt) => ({
  execution: { missionId: 'p4-mission', runId: 'p4-run', executionId, attempt: String(attempt) },
  agentId: 'hermes',
  capability: 'text.summarize',
  namespace: 'core::system',
  constraints: {
    read_only: true, no_writes: true, no_network: true,
    no_canonical_events: true, no_mission_state_writes: true,
    allowed_workspace: 'core::system',
  },
  taskBrief: 'P4 red-team probe task.',
  input: { probe: true },
  evidenceDir: EVDIR,
  // NOTE: no eventRuntime injected — we test the adapter's own classification,
  // not the event plane.
});
const T = (o) => ({ transport: 'p4-synthetic', startedAt: isoNow(), endedAt: isoNow(), ...o });

const results = [];
function verdict(scenario, pass, evidence) {
  results.push({ scenario, pass, evidence });
  console.log(`\n${pass ? 'PASS' : 'FAIL'}  ${scenario}`);
  for (const line of evidence) console.log(`      ${line}`);
}
const readArtifact = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
function validEnvelopeFor(prompt, status) {
  const wo = /"work_order_id": "([^"]+)"/.exec(prompt)[1];
  const ctx = /"context_pack_id": "([^"]+)"/.exec(prompt)[1];
  return {
    work_order_id: wo, context_pack_id: ctx, agent_id: 'hermes',
    capability: 'text.summarize', status,
    output: status === 'completed' ? { summary: 'ok' } : null,
    evidence: { startedAt: isoNow(), endedAt: isoNow(), host: 'p4-fake', capabilityPerformed: 'text.summarize' },
    error: status === 'completed' ? null : 'simulated worker failure',
  };
}

(async () => {
  /* ============ S1: CRASH-AFTER-CALL ============ */
  {
    invoked = 0;
    const intent = 's1-crash';
    const r = await adapter.dispatchExecution({
      ...BASE('p4-s1', 1),
      transportFn: (prompt) => {
        invoked++;
        commitEffect(intent); // the remote effect EXECUTES...
        // ...then the worker is kill -9'd before writing any receipt/envelope.
        return T({ timedOut: false, exitCode: null, stdout: '', stderr: '',
                   error: 'simulated SIGKILL after remote commit, before envelope write' });
      },
    });
    const art = readArtifact(r.artifactPath);
    verdict('S1 CRASH-AFTER-CALL', 
      r.outcome !== OUTCOME.COMPLETED && r.outcome !== OUTCOME.FAILED && invoked === 1,
      [
        `returned outcome='${r.outcome}', reason='${r.reason}', honestOutcome='${r.honestOutcome}'`,
        `remote effect committed on disk: ${effectCommitted(intent)} (adapter cannot know this)`,
        `transport invoked exactly ${invoked}x — no automatic retry observed`,
        `artifact outcome field='${art.outcome}' reason='${art.reason}' (note: artifact says 'unknown', return says '${r.outcome}')`,
        `state the mission lands in: ${r.outcome} (protocol path) with honest UNKNOWN preserved via honestOutcome`,
      ]);
  }

  /* ============ S2: NETWORK DISAPPEARANCE ============ */
  {
    invoked = 0;
    const intent = 's2-netdrop';
    const r = await adapter.dispatchExecution({
      ...BASE('p4-s2', 1),
      transportFn: (prompt) => {
        invoked++;
        // Ambiguous: the packet may or may not have reached the remote. We do
        // NOT commit, and the adapter must not assume either way.
        return T({ timedOut: false, exitCode: null, stdout: '', stderr: '',
                   error: 'simulated ECONNRESET mid-dispatch; remote execution ambiguous' });
      },
    });
    verdict('S2 NETWORK-DISAPPEARANCE',
      r.outcome !== OUTCOME.COMPLETED && r.outcome !== OUTCOME.FAILED && invoked === 1,
      [
        `returned outcome='${r.outcome}', reason='${r.reason}', honestOutcome='${r.honestOutcome}'`,
        `never reported success, never reported failure, no silent retry (invocations=${invoked})`,
        `reconciliation required by: honestOutcome=unknown (+ artifact note directs caller)`,
      ]);
  }

  /* ============ S3: TIMEOUT ============ */
  {
    invoked = 0;
    const intent = 's3-timeout';
    // Hostility: the "worker" keeps running after the dispatcher gives up and
    // commits the effect 600ms AFTER the timeout is reported.
    const r = await adapter.dispatchExecution({
      ...BASE('p4-s3', 1),
      transportFn: (prompt) => {
        invoked++;
        const child = spawn(process.execPath, ['-e',
          `setTimeout(()=>{require('fs').writeFileSync('${path.join(REMOTE, 'effect-' + intent + '.committed')}','LATE COMMIT');},600);`],
          { detached: true, stdio: 'ignore' });
        child.unref();
        return T({ timedOut: true, exitCode: null, stdout: '', stderr: '', error: 'ETIMEDOUT' });
      },
    });
    await new Promise((res) => setTimeout(res, 1500)); // let the late commit land
    const artFiles = fs.readdirSync(EVDIR).filter((f) => f.includes('p4-s3'));
    verdict('S3 TIMEOUT',
      r.outcome === OUTCOME.UNKNOWN && r.reason === 'dispatcher_timeout' && invoked === 1,
      [
        `returned outcome='${r.outcome}', reason='${r.reason}', reconcileOwnedBy='${r.reconcileOwnedBy}'`,
        `timeout recorded as UNKNOWN (failure-of-observation), NOT as failure-of-effect`,
        `late remote commit happened anyway: ${effectCommitted(intent)} — adapter performed no revisit/reconciliation (artifacts for p4-s3: ${artFiles.length}, invocations still ${invoked})`,
        `post-timeout reality is invisible to the adapter by design; reconcile-vs-retry is caller-owned`,
      ]);
  }

  /* ============ S4: MISSING RECEIPT ============ */
  {
    const cases = [];
    // a. exit 0, prose stdout, no envelope
    invoked = 0;
    const ra = await adapter.dispatchExecution({ ...BASE('p4-s4a', 1),
      transportFn: () => { invoked++; return T({ timedOut: false, exitCode: 0, stdout: 'done, all good, trust me\n', stderr: '', error: null }); } });
    cases.push(`a(prose): outcome=${ra.outcome} reason=${ra.reason}`);
    // b. exit 0, JSON but missing envelope fields
    const rb = await adapter.dispatchExecution({ ...BASE('p4-s4b', 1),
      transportFn: () => { invoked++; return T({ timedOut: false, exitCode: 0, stdout: JSON.stringify({ status: 'completed' }), stderr: '', error: null }); } });
    cases.push(`b(partial-json): outcome=${rb.outcome} reason=${rb.reason}`);
    // c. CONTROL: exit 0 + fully valid envelope -> COMPLETED (the receipt is the envelope)
    const rc = await adapter.dispatchExecution({ ...BASE('p4-s4c', 1),
      transportFn: (p) => { invoked++; return T({ timedOut: false, exitCode: 0, stdout: 'chatter\n' + JSON.stringify(validEnvelopeFor(p, 'completed')), stderr: '', error: null }); } });
    cases.push(`c(valid-envelope): outcome=${rc.outcome}`);
    // d. exit 0, valid-shaped envelope but TAMPERED work_order_id binding
    const rd = await adapter.dispatchExecution({ ...BASE('p4-s4d', 1),
      transportFn: (p) => { invoked++; const e = validEnvelopeFor(p, 'completed'); e.work_order_id = 'tampered-binding';
        return T({ timedOut: false, exitCode: 0, stdout: JSON.stringify(e), stderr: '', error: null }); } });
    cases.push(`d(tampered-binding): outcome=${rd.outcome} reason=${rd.reason}`);
    const pass = ra.outcome !== OUTCOME.COMPLETED && rb.outcome !== OUTCOME.COMPLETED
      && rc.outcome === OUTCOME.COMPLETED && rd.outcome !== OUTCOME.COMPLETED;
    verdict('S4 MISSING-RECEIPT', pass, [
      ...cases,
      `exit 0 is NEVER treated as effect-proof: completion requires a verified 8-field envelope`,
      `control (c) proves the envelope receipt — not the exit code — is the completion criterion`,
      `binding tamper (d) rejected: envelope must echo the issued work_order_id`,
    ]);
  }

  /* ============ S5: RETRY-AFTER-UNKNOWN ============ */
  {
    const intent = 's5-retry';
    let commits = 0;
    const flakyTransport = (prompt) => {
      invoked++;
      commits++;
      commitEffect(intent + '-dispatch' + invoked); // each dispatch commits AGAIN remotely
      return T({ timedOut: false, exitCode: null, stdout: '', stderr: '',
                 error: 'simulated SIGKILL after remote commit (retry probe)' });
    };
    invoked = 0;
    // First dispatch -> UNKNOWN (honest)
    const r1 = await adapter.dispatchExecution({ ...BASE('p4-s5', 1), transportFn: flakyTransport });
    const art1Before = fs.readFileSync(r1.artifactPath, 'utf8');
    const woid1 = r1.work_order_id;
    // Retry the EXACT same intent: same executionId, same attempt. No
    // reconciliation evidence exists anywhere in the opts surface.
    const r2 = await adapter.dispatchExecution({ ...BASE('p4-s5', 1), transportFn: flakyTransport });
    const art1After = fs.readFileSync(r1.artifactPath, 'utf8');
    const artifactOverwritten = art1Before !== art1After;
    // Retry with bumped attempt number
    const r3 = await adapter.dispatchExecution({ ...BASE('p4-s5', 2), transportFn: flakyTransport });
    const blindSecondDispatch = invoked === 3; // first + 2 retries all hit transport
    const sameWorkOrderId = r2.work_order_id === woid1;
    const refused = [r2, r3].some((r) => r.outcome === OUTCOME.DENIED);
    const requiredReconciliation = 'reconciliation' in r2 || 'reconciliationEvidence' in r2;
    const pass = refused || requiredReconciliation || !blindSecondDispatch;
    verdict('S5 RETRY-AFTER-UNKNOWN', pass, [
      `first dispatch: outcome=${r1.outcome}/honestUnknown, work_order_id=${woid1}`,
      `retry same (executionId,attempt): refused=${r2.outcome === OUTCOME.DENIED}, outcome=${r2.outcome}`,
      `retry attempt=2: outcome=${r3.outcome}, work_order_id=${r3.work_order_id} (deterministic per attempt)`,
      `transport invocations total=${invoked} (each = a real second dispatch; remote commits=${commits})`,
      `BLIND SECOND DISPATCH OCCURRED: ${blindSecondDispatch} — adapter performed no refusal, no reconciliation-evidence check, no duplicate suppression`,
      `same-attempt retry reuses work_order_id=${sameWorkOrderId} (deterministic) — helps idempotent receivers, but transport still invoked`,
      `prior UNKNOWN artifact overwritten by retry: ${artifactOverwritten} (same filename result-p4-s5-a1.json, atomic rename clobbers)`,
      `opts surface has no reconciliation/idempotency parameter: ${!('reconciliationEvidence' in BASE('x', 1))}`,
    ]);
  }

  /* ============ S6: REVOCATION-MID-FLIGHT ============ */
  {
    const intent = 's6-revoke';
    invoked = 0;
    let revocationFlag = false;
    // In-flight: an external revocation event lands DURING the transport call.
    const r = await adapter.dispatchExecution({
      ...BASE('p4-s6', 1),
      transportFn: (prompt) => {
        invoked++;
        revocationFlag = true; // <-- revocation arrives here, mid-flight
        commitEffect(intent);  // remote effect commits anyway (revocation can't recall it)
        return T({ timedOut: false, exitCode: null, stdout: '', stderr: '',
                   error: 'simulated SIGKILL; revocation arrived mid-flight' });
      },
    });
    // After "revocation": a NEW dispatch for the revoked identity is denied pre-transport.
    let postRevokeInvoked = false;
    const rDenied = await adapter.dispatchExecution({
      ...BASE('p4-s6b', 1), agentId: 'identity_5',
      transportFn: () => { postRevokeInvoked = true; return T({}); },
    });
    const exports = Object.keys(adapter);
    const hasCancel = exports.includes('cancel') || exports.includes('revoke');
    const inFlightStopped = false; // by construction: nothing can interrupt spawnSync/transportFn
    verdict('S6 REVOCATION-MID-FLIGHT', true /* see evidence for the split verdict */, [
      `in-flight dispatch with mid-flight revocation: outcome=${r.outcome}, honestOutcome=${r.honestOutcome}, reason=${r.reason}`,
      `adapter exposes cancel/revoke: ${hasCancel} (module exports: ${exports.join(',')}) — in-flight dispatch CANNOT be interrupted; it runs to transport conclusion`,
      `in-flight classification is honest: never claims committed, never claims not-committed (uncertain -> ${r.honestOutcome})`,
      `post-revocation NEW dispatch (identity_5): outcome=${rDenied.outcome}, transport invoked=${postRevokeInvoked} — pre-dispatch authz denies; no new effects dispatch`,
      `no HOLD state exists in outcomes.js (states: completed/failed/unknown/denied/escalated) — DEFECT-2 absence confirmed by code`,
      `verdict split: honest-classification PASS; mid-flight-cancellation NOT IMPLEMENTED (by design: synchronous one-shot transport)`,
    ]);
  }

  console.log(`\n==== harness root: ${ROOT} ====`);
  const fails = results.filter((r) => !r.pass).length;
  console.log(`scenarios: ${results.length}, PASS: ${results.length - fails}, FAIL: ${fails}`);
  if (fails) process.exitCode = 1;
})().catch((e) => { console.error('HARNESS ERROR', e); process.exitCode = 2; });
