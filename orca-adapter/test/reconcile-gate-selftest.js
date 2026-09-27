#!/usr/bin/env node
'use strict';
/**
 * reconcile-gate-selftest.js — HOSTILE tests for the S5 reconcile gate.
 *
 * Mirrors the P4 RETRY-AFTER-UNKNOWN red-team scenario against the REAL
 * adapter through its synthetic transportFn seam. No live dispatch, no real
 * external effects. Each test gets a fresh evidence dir (fresh gate memory).
 *
 * What must hold:
 *   - 3x retry of an unknown intent -> exactly 1 transport invocation.
 *   - The attempt-1 UNKNOWN artifact is byte-identical after refused retries.
 *   - A valid reconciliation record unlocks exactly one NEW attempt number,
 *     written as a NEW artifact file.
 *   - Invalid/absent reconciliation -> typed refusal, transport never runs.
 *   - Contract: every unknown outcome carries {status:'unknown', summary,
 *     effect_may_have_occurred}; artifact and API agree on the outcome label.
 *   - 1b: every unknown-path return carries reconcileOwnedBy.
 *   - 1c: the spawn signal lands in the artifact evidence, never silently null.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const adapter = require('../adapter.js');
const { OUTCOME, EFFECT_STATE } = require('../outcomes.js');

let failures = 0;
function check(name, cond, detail) {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}

const freshDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'orca-reconcile-gate-'));
const BASE = (dir, executionId, attempt) => ({
  execution: { missionId: 'rg-m', runId: 'rg-r', executionId, attempt: String(attempt) },
  agentId: 'hermes',
  capability: 'text.summarize',
  namespace: 'core::system',
  constraints: {
    read_only: true, no_writes: true, no_network: true,
    no_canonical_events: true, no_mission_state_writes: true,
    allowed_workspace: 'core::system',
  },
  taskBrief: 'Reconcile-gate probe task.',
  input: { probe: 's5' },
  evidenceDir: dir,
});
const readArtifact = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const indexLines = (dir) => fs.readFileSync(path.join(dir, adapter.IDEMPOTENCY_INDEX), 'utf8')
  .split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));

function fakeCompletedTransport() {
  return (prompt) => {
    const wo = /"work_order_id": "([^"]+)"/.exec(prompt)[1];
    const ctx = /"context_pack_id": "([^"]+)"/.exec(prompt)[1];
    const env = {
      work_order_id: wo, context_pack_id: ctx, agent_id: 'hermes',
      capability: 'text.summarize', status: 'completed',
      output: { summary: 'ok' },
      evidence: { startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), host: 'fake', capabilityPerformed: 'text.summarize' },
      error: null,
    };
    return { startedAt: 't0', endedAt: 't1', timedOut: false, exitCode: 0, error: null,
             stdout: 'chatter\n' + JSON.stringify(env), stderr: '' };
  };
}

(async () => {
  /* ---- 1. idempotency key stability ---- */
  {
    const k1 = adapter.idempotencyKeyFor({ execution: { missionId: 'm', runId: 'r', executionId: 'e', attempt: '1' }, input: { a: 1, b: [2, 3] }, tenant_id: null, capability: 'text.summarize' });
    const k2 = adapter.idempotencyKeyFor({ execution: { missionId: 'm', runId: 'r', executionId: 'e', attempt: '7' }, input: { b: [2, 3], a: 1 }, tenant_id: null, capability: 'text.summarize' });
    const k3 = adapter.idempotencyKeyFor({ execution: { missionId: 'm', runId: 'r', executionId: 'e', attempt: '1' }, input: { a: 2, b: [2, 3] }, tenant_id: null, capability: 'text.summarize' });
    const k4 = adapter.idempotencyKeyFor({ execution: { missionId: 'm', runId: 'r', executionId: 'e', attempt: '1' }, input: { a: 1, b: [2, 3] }, tenant_id: 'acme', capability: 'text.summarize' });
    const k5 = adapter.idempotencyKeyFor({ execution: { missionId: 'm', runId: 'r', executionId: 'e', attempt: '1' }, input: { a: 1, b: [2, 3] }, tenant_id: null, capability: 'image.caption' });
    check('key stable: same intent (any attempt, key order) -> same key', k1 === k2 && /^idem-[0-9a-f]{32}$/.test(k1), k1);
    check('key changes on input change', k1 !== k3);
    check('key changes on tenant change', k1 !== k4);
    check('key changes on capability change', k1 !== k5);
  }

  /* ---- 2. S5 mirror: 3x retry of an unknown intent ---- */
  {
    const dir = freshDir();
    let invoked = 0;
    const flaky = () => {
      invoked++;
      // Remote commits, then the worker is SIGKILLed before any envelope.
      return { startedAt: 't0', endedAt: 't1', timedOut: false, exitCode: null, stdout: '', stderr: '',
               error: 'simulated SIGKILL after remote commit (retry probe)' };
    };
    const r1 = await adapter.dispatchExecution({ ...BASE(dir, 'rg-s5', 1), transportFn: flaky });
    check('s5 first dispatch -> escalated with honest unknown', r1.outcome === OUTCOME.ESCALATED && r1.honestOutcome === OUTCOME.UNKNOWN, JSON.stringify(r1).slice(0, 200));
    check('s5 contract signal on unknown path', r1.status === 'unknown' && typeof r1.summary === 'string' && r1.summary.length > 0 && r1.effect_may_have_occurred === true, JSON.stringify({ status: r1.status, summary: r1.summary, emho: r1.effect_may_have_occurred }));
    check('s5 1b: crash path carries reconcileOwnedBy', r1.reconcileOwnedBy === 'caller', String(r1.reconcileOwnedBy));
    const art1 = readArtifact(r1.artifactPath);
    check('s5 1a: artifact and API agree on the outcome label', art1.outcome === r1.outcome && art1.outcome === 'escalated' && art1.honestOutcome === 'unknown', `artifact=${art1.outcome} api=${r1.outcome}`);
    check('s5 1c: spawn signal captured in artifact evidence', art1.signal === 'SIGKILL' && art1.signal_source === 'error-text', JSON.stringify({ signal: art1.signal, signal_source: art1.signal_source }));
    const art1Bytes = fs.readFileSync(r1.artifactPath, 'utf8');

    // Retry the EXACT same intent: same executionId, same attempt. Hostile:
    // the transport throws if the gate lets it through.
    let r2TransportRan = false;
    const r2 = await adapter.dispatchExecution({ ...BASE(dir, 'rg-s5', 1),
      transportFn: () => { r2TransportRan = true; throw new Error('gate bypassed'); } });
    check('s5 same-attempt retry refused as duplicate', r2.outcome === OUTCOME.DENIED && r2.reason === 'duplicate_attempt' && !r2TransportRan, JSON.stringify(r2).slice(0, 300));
    check('s5 refusal is typed (reconciliation_required=false, duplicate named)', r2.reconciliation_required === false && r2.reconciliation && r2.reconciliation.duplicate === true, JSON.stringify(r2.reconciliation).slice(0, 200));

    // Retry with a bumped attempt number but NO reconciliation record.
    let r3TransportRan = false;
    const r3 = await adapter.dispatchExecution({ ...BASE(dir, 'rg-s5', 2),
      transportFn: () => { r3TransportRan = true; throw new Error('gate bypassed'); } });
    check('s5 new-attempt retry without reconciliation refused', r3.outcome === OUTCOME.DENIED && r3.reason === 'reconciliation_required' && !r3TransportRan, JSON.stringify(r3).slice(0, 300));
    check('s5 refusal names what the caller must supply', r3.reconciliation_required === true && /checked/.test(r3.reconciliation.requires) && /decidedBy/.test(r3.reconciliation.requires) && r3.reconciliation.prior_attempt === '1', JSON.stringify(r3.reconciliation).slice(0, 300));
    check('s5 exactly 1 transport invocation across 3 dispatches', invoked === 1, `invoked=${invoked}`);
    check('s5 attempt-1 UNKNOWN artifact byte-identical after refused retries', fs.readFileSync(r1.artifactPath, 'utf8') === art1Bytes);
    check('s5 no attempt-2 artifact written by refused retries', !fs.existsSync(path.join(dir, 'result-rg-s5-a2.json')));
  }

  /* ---- 3. reconciliation unlocks exactly one NEW attempt as a NEW file ---- */
  {
    const dir = freshDir();
    let invoked = 0;
    const flaky = () => { invoked++; return { startedAt: 't0', endedAt: 't1', timedOut: false, exitCode: null, stdout: '', stderr: '', error: 'simulated SIGKILL after remote commit' }; };
    const r1 = await adapter.dispatchExecution({ ...BASE(dir, 'rg-r', 1), transportFn: flaky });
    const art1Bytes = fs.readFileSync(r1.artifactPath, 'utf8');
    const recon = { checked: 'remote effect-service dir + worker host logs', found: 'effect file present for attempt 1; worker dead before receipt', decidedBy: 'rg-test-harness' };
    const r2 = await adapter.dispatchExecution({ ...BASE(dir, 'rg-r', 2), transportFn: flaky, reconciliation: recon });
    check('reconciled retry proceeds as a new attempt', r2.outcome === OUTCOME.ESCALATED && invoked === 2, `outcome=${r2.outcome} invoked=${invoked}`);
    check('reconciled retry writes a NEW artifact file', fs.existsSync(path.join(dir, 'result-rg-r-a2.json')) && r2.artifactPath.endsWith('result-rg-r-a2.json'), r2.artifactPath);
    check('prior UNKNOWN artifact still intact', fs.readFileSync(r1.artifactPath, 'utf8') === art1Bytes);
    const lines = indexLines(dir);
    const rl = lines.find((l) => l.type === 'reconciliation');
    check('reconciliation record persisted with what/who', !!rl && rl.reconciles_attempt === '1' && rl.authorizes_attempt === '2' && rl.checked === recon.checked && rl.found === recon.found && rl.decidedBy === recon.decidedBy, JSON.stringify(rl));
    // The reconciled attempt itself ended unknown: attempt 3 needs its OWN reconciliation.
    const r3 = await adapter.dispatchExecution({ ...BASE(dir, 'rg-r', 3),
      transportFn: () => { throw new Error('gate bypassed'); } });
    check('each unknown needs its own reconciliation', r3.outcome === OUTCOME.DENIED && r3.reason === 'reconciliation_required' && r3.reconciliation.prior_attempt === '2', JSON.stringify(r3.reconciliation).slice(0, 200));
  }

  /* ---- 4. invalid reconciliation records are refused, transport never runs ---- */
  {
    const dir = freshDir();
    let invoked = 0;
    const flaky = () => { invoked++; return { startedAt: 't0', endedAt: 't1', timedOut: false, exitCode: null, stdout: '', stderr: '', error: 'boom SIGKILL' }; };
    await adapter.dispatchExecution({ ...BASE(dir, 'rg-i', 1), transportFn: flaky });
    const bad1 = await adapter.dispatchExecution({ ...BASE(dir, 'rg-i', 2),
      transportFn: () => { invoked++; throw new Error('must not run'); },
      reconciliation: { checked: 'x', found: 'y' } }); // missing decidedBy
    check('missing decidedBy -> reconciliation_invalid', bad1.outcome === OUTCOME.DENIED && bad1.reason === 'reconciliation_invalid' && /decidedBy/.test(JSON.stringify(bad1.reconciliation.problems)), JSON.stringify(bad1.reconciliation).slice(0, 250));
    const bad2 = await adapter.dispatchExecution({ ...BASE(dir, 'rg-i', 2),
      transportFn: () => { invoked++; throw new Error('must not run'); },
      reconciliation: { checked: 'x', found: 'y', decidedBy: 'z', authorizesAttempt: '9' } });
    check('authorizesAttempt mismatch -> reconciliation_invalid', bad2.outcome === OUTCOME.DENIED && bad2.reason === 'reconciliation_invalid', JSON.stringify(bad2.reconciliation).slice(0, 250));
    const bad3 = await adapter.dispatchExecution({ ...BASE(dir, 'rg-i', 2),
      transportFn: () => { invoked++; throw new Error('must not run'); },
      reconciliation: 'not-an-object' });
    check('non-object reconciliation -> reconciliation_invalid', bad3.outcome === OUTCOME.DENIED && bad3.reason === 'reconciliation_invalid');
    check('no transport ran for any invalid reconciliation', invoked === 1, `invoked=${invoked}`);
  }

  /* ---- 5. prior COMPLETED (effect_unknown) also gates a new attempt ---- */
  {
    const dir = freshDir();
    let invoked = 0;
    const completing = (...a) => { invoked++; return fakeCompletedTransport()(...a); };
    const r1 = await adapter.dispatchExecution({ ...BASE(dir, 'rg-c', 1), transportFn: completing });
    check('first dispatch completed', r1.outcome === OUTCOME.COMPLETED && r1.effect_state === EFFECT_STATE.UNKNOWN, r1.outcome);
    const r2 = await adapter.dispatchExecution({ ...BASE(dir, 'rg-c', 2),
      transportFn: () => { invoked++; throw new Error('must not run'); } });
    check('new attempt after completed-with-effect_unknown requires reconciliation', r2.outcome === OUTCOME.DENIED && r2.reason === 'reconciliation_required', `${r2.outcome}/${r2.reason}`);
    const r3 = await adapter.dispatchExecution({ ...BASE(dir, 'rg-c', 2), transportFn: completing,
      reconciliation: { checked: 'downstream idempotency of the completed effect', found: 'effect already applied; retry would double-apply', decidedBy: 'rg-test-harness' } });
    check('reconciled retry after completed proceeds', r3.outcome === OUTCOME.COMPLETED && invoked === 2, `${r3.outcome} invoked=${invoked}`);
    check('no transport ran for the refused retry', invoked === 2);
  }

  /* ---- 6. worker-reported unknown -> honest UNKNOWN, never ESCALATED ---- */
  {
    const dir = freshDir();
    const r = await adapter.dispatchExecution({ ...BASE(dir, 'rg-w', 1),
      transportFn: (prompt) => {
        const wo = /"work_order_id": "([^"]+)"/.exec(prompt)[1];
        const ctx = /"context_pack_id": "([^"]+)"/.exec(prompt)[1];
        const env = { work_order_id: wo, context_pack_id: ctx, agent_id: 'hermes', capability: 'text.summarize',
          status: 'unknown', output: null, evidence: { startedAt: 't0', endedAt: 't1', host: 'fake' }, error: null,
          summary: 'effect may have executed; receipt lost', effect_may_have_occurred: true };
        return { startedAt: 't0', endedAt: 't1', timedOut: false, exitCode: 0, error: null, stdout: JSON.stringify(env), stderr: '' };
      } });
    check('worker unknown -> UNKNOWN (not escalated)', r.outcome === OUTCOME.UNKNOWN && r.reason === 'worker_reported_unknown', `${r.outcome}/${r.reason}`);
    check('worker unknown carries the contract signal', r.status === 'unknown' && /receipt lost/.test(r.summary) && r.effect_may_have_occurred === true, JSON.stringify({ status: r.status, summary: r.summary }));
    check('worker unknown carries reconcileOwnedBy', r.reconcileOwnedBy === 'caller');
    const art = readArtifact(r.artifactPath);
    check('worker unknown: artifact and API agree', art.outcome === r.outcome && art.outcome === 'unknown', `artifact=${art.outcome} api=${r.outcome}`);
  }

  /* ---- 7. timeout path: contract signal + reconcileOwnedBy ---- */
  {
    const dir = freshDir();
    const r = await adapter.dispatchExecution({ ...BASE(dir, 'rg-t', 1),
      transportFn: () => ({ startedAt: 't0', endedAt: 't1', timedOut: true, exitCode: null, stdout: '', stderr: '', error: 'ETIMEDOUT' }) });
    check('timeout -> UNKNOWN with contract signal', r.outcome === OUTCOME.UNKNOWN && r.reason === 'dispatcher_timeout' && r.status === 'unknown' && r.effect_may_have_occurred === true && typeof r.summary === 'string', JSON.stringify({ outcome: r.outcome, status: r.status }));
    check('timeout carries reconcileOwnedBy', r.reconcileOwnedBy === 'caller');
  }

  /* ---- 8. corrupt idempotency index -> fail-closed typed refusal ---- */
  {
    const dir = freshDir();
    fs.writeFileSync(path.join(dir, adapter.IDEMPOTENCY_INDEX), '{"type":"attempt"\nNOT JSON\n', 'utf8');
    let ran = false;
    const r = await adapter.dispatchExecution({ ...BASE(dir, 'rg-x', 1),
      transportFn: () => { ran = true; throw new Error('must not run'); } });
    check('corrupt index -> fail-closed refusal', r.outcome === OUTCOME.DENIED && r.reason === 'idempotency_index_corrupt' && !ran, `${r.outcome}/${r.reason} ran=${ran}`);
  }

  /* ---- 9. transport-reported signal plumbed through (not just error text) ---- */
  {
    const dir = freshDir();
    const r = await adapter.dispatchExecution({ ...BASE(dir, 'rg-s', 1),
      transportFn: () => ({ startedAt: 't0', endedAt: 't1', timedOut: false, exitCode: null, signal: 'SIGTERM', stdout: '', stderr: 'killed', error: 'worker died' }) });
    const art = readArtifact(r.artifactPath);
    check('transport signal field reaches the artifact', art.signal === 'SIGTERM' && art.signal_source === 'transport', JSON.stringify({ signal: art.signal, signal_source: art.signal_source }));
    check('F1: stderr + transportError survive in the artifact', art.stderr === 'killed' && art.transportError === 'worker died', JSON.stringify({ stderr: art.stderr, transportError: art.transportError }));
  }

  /* ---- 10. contract envelope on completed/failed (front-door H5b) ---- */
  // The front door's _check_executor_result requires top-level status in
  // {'completed','failed','unknown'} + string summary on EVERY executor
  // result (unknown was proven above; completed/failed must carry it too
  // so the future translator needs no synthesis). Envelopes are built to
  // pass the vendored verifier (echo work_order_id + context_pack_id).
  {
    const dir = freshDir();
    const envelopeFor = (prompt, status, extra) => {
      const wo = /"work_order_id": "([^"]+)"/.exec(prompt)[1];
      const ctx = /"context_pack_id": "([^"]+)"/.exec(prompt)[1];
      return JSON.stringify({
        work_order_id: wo, context_pack_id: ctx, agent_id: 'hermes',
        capability: 'text.summarize', status,
        output: status === 'failed' ? null : { summary: 'ok' },
        evidence: { startedAt: 't0', endedAt: 't1', host: 'fake', capabilityPerformed: 'text.summarize' },
        error: status === 'failed' ? 'boom' : null,
        ...extra,
      });
    };
    const okT = (p, t) => ({ startedAt: 't0', endedAt: 't1', timedOut: false, exitCode: 0, error: null,
      stdout: envelopeFor(p, 'completed'), stderr: '', transport: 'test' });
    const comp = await adapter.dispatchExecution({ ...BASE(dir, 'rg-c', 1), transportFn: okT });
    check('completed return carries contract status/summary',
      comp.outcome === 'completed' && comp.status === 'completed' && typeof comp.summary === 'string' && comp.summary.length > 0,
      JSON.stringify({ outcome: comp.outcome, status: comp.status, summary: (comp.summary || '').slice(0, 60) }));
    const badT = (p, t) => ({ startedAt: 't0', endedAt: 't1', timedOut: false, exitCode: 0, error: null,
      stdout: envelopeFor(p, 'failed'), stderr: '', transport: 'test' });
    const fail = await adapter.dispatchExecution({ ...BASE(dir, 'rg-f', 1), transportFn: badT });
    check('failed return carries contract status/summary',
      fail.outcome === 'failed' && fail.status === 'failed' && typeof fail.summary === 'string' && fail.summary.length > 0,
      JSON.stringify({ outcome: fail.outcome, status: fail.status, summary: (fail.summary || '').slice(0, 60) }));
  }

  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error('SELFTEST CRASH:', e); process.exit(1); });
