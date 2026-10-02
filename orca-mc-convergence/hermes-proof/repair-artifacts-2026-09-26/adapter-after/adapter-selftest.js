#!/usr/bin/env node
'use strict';
/**
 * adapter-selftest.js — SYNTHETIC tests for the LANE C Orca headless-agent adapter.
 * No real external effects: the transport is always a fake (transportFn seam).
 * Real headless-agent invocation is covered separately by test/live-smoke.js.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const adapter = require('../adapter.js');
const { OUTCOME, unknownOutcome, terminalOutcome } = require('../outcomes.js');

const EVIDENCE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'orca-adapter-selftest-'));
let failures = 0;

function check(name, cond, detail) {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}

const BASE_OPTS = {
  execution: { missionId: 'm-1', runId: 'r-1', executionId: 'e-1', attempt: '1' },
  agentId: 'hermes',
  capability: 'text.summarize',
  namespace: 'core::system',
  constraints: {
    read_only: true, no_writes: true, no_network: true,
    no_canonical_events: true, no_mission_state_writes: true,
    allowed_workspace: 'core::system',
  },
  taskBrief: 'Summarize the input.',
  input: { text: 'hello world' },
  evidenceDir: EVIDENCE_DIR,
};

function fakeCompletedTransport(stdoutPrefix) {
  return (prompt) => {
    const wo = /"work_order_id": "([^"]+)"/.exec(prompt)[1];
    const ctx = /"context_pack_id": "([^"]+)"/.exec(prompt)[1];
    const env = {
      work_order_id: wo, context_pack_id: ctx, agent_id: 'hermes',
      capability: 'text.summarize', status: 'completed',
      output: { summary: 'hello world summarized' },
      evidence: { startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), host: 'fake', capabilityPerformed: 'text.summarize' },
      error: null,
    };
    return { startedAt: 't0', endedAt: 't1', timedOut: false, exitCode: 0, error: null,
             stdout: (stdoutPrefix || 'model chatter\n') + JSON.stringify(env), stderr: '' };
  };
}

const fakeEventRuntime = {
  calls: [],
  async emit(eventType, source, payload, opts) {
    this.calls.push({ eventType, source, payload, opts });
    return { status: 'ok', eventId: 'evt-test-1' };
  },
};

(async () => {
  // 1. Identity fence: identity_5 denied, transport never invoked.
  let invoked = false;
  const r1 = await adapter.dispatchExecution({
    ...BASE_OPTS, agentId: 'identity_5',
    transportFn: () => { invoked = true; return {}; },
  });
  check('identity_5 denied fail-closed', r1.outcome === OUTCOME.DENIED, JSON.stringify(r1));
  check('identity_5: no transport invoked', invoked === false);

  // 2. Unknown agent denied by the vendored fail-closed adapter.
  const r2 = await adapter.dispatchExecution({ ...BASE_OPTS, agentId: 'nope',
    transportFn: () => { throw new Error('must not run'); } });
  check('unknown agent denied', r2.outcome === OUTCOME.DENIED, JSON.stringify(r2));

  // 3. Capability outside the profile allowlist denied.
  const r3 = await adapter.dispatchExecution({ ...BASE_OPTS, capability: 'exec.write',
    transportFn: () => { throw new Error('must not run'); } });
  check('unlisted capability denied', r3.outcome === OUTCOME.DENIED, JSON.stringify(r3));

  // 4. extractEnvelope shapes.
  check('extractEnvelope: JSON in prose', adapter.extractEnvelope('blah {"a":1} blah').ok === true);
  check('extractEnvelope: no JSON', adapter.extractEnvelope('no json here').ok === false);
  check('extractEnvelope: unbalanced', adapter.extractEnvelope('{"a":1').ok === false);
  check('extractEnvelope: nested braces', (() => {
    const e = adapter.extractEnvelope('x {"a":{"b":[1,{"c":2}]}} y');
    return e.ok && e.envelope.a.b[1].c === 2;
  })());

  // 5. buildWorkerPrompt echoes the work order fields.
  const wo = { work_order_id: 'w1', context_pack_id: 'c1', agent_id: 'hermes', capability: 'text.summarize', mission_id: 'm-1', task_id: 't-1', attempt: 1, input: { x: 1 } };
  const p = adapter.buildWorkerPrompt(wo, 'do the thing');
  check('prompt echoes fields', p.includes('"work_order_id": "w1"') && p.includes('"context_pack_id": "c1"') && p.includes('do the thing'));

  // 6. Timeout -> honest UNKNOWN (never collapsed into failed).
  const r6 = await adapter.dispatchExecution({
    ...BASE_OPTS, execution: { missionId: 'm-1', runId: 'r-1', executionId: 'e-2', attempt: '1' },
    transportFn: () => ({ startedAt: 't0', endedAt: 't1', timedOut: true, exitCode: null, error: 'ETIMEDOUT', stdout: '', stderr: '' }),
  });
  check('timeout -> UNKNOWN', r6.outcome === OUTCOME.UNKNOWN && r6.reason === 'dispatcher_timeout', JSON.stringify(r6));
  check('timeout artifact saved', r6.artifactPath && fs.existsSync(r6.artifactPath));

  // 7. Unparseable stdout -> ESCALATED with honest UNKNOWN.
  const r7 = await adapter.dispatchExecution({
    ...BASE_OPTS, execution: { missionId: 'm-1', runId: 'r-1', executionId: 'e-3', attempt: '1' },
    transportFn: () => ({ startedAt: 't0', endedAt: 't1', timedOut: false, exitCode: 0, error: null, stdout: 'I refuse to use JSON', stderr: '' }),
  });
  check('protocol failure -> escalated+unknown', r7.outcome === OUTCOME.ESCALATED && r7.honestOutcome === OUTCOME.UNKNOWN, JSON.stringify(r7));

  // 8. Completed path with injected event runtime.
  fakeEventRuntime.calls = [];
  const r8 = await adapter.dispatchExecution({ ...BASE_OPTS,
    execution: { missionId: 'm-1', runId: 'r-1', executionId: 'e-4', attempt: '1' },
    transportFn: fakeCompletedTransport(), eventRuntime: fakeEventRuntime });
  check('completed outcome', r8.outcome === OUTCOME.COMPLETED, JSON.stringify(r8));
  check('completed event recorded', r8.event_id === 'evt-test-1' && r8.recorded === true);
  check('canonical event type', fakeEventRuntime.calls.length === 1 && fakeEventRuntime.calls[0].eventType === 'WORKER_COMPLETED');
  check('completed artifact saved', r8.artifactPath && fs.existsSync(r8.artifactPath));

  // 9. Failed envelope -> failed outcome + WORKER_FAILED event.
  fakeEventRuntime.calls = [];
  const r9 = await adapter.dispatchExecution({ ...BASE_OPTS,
    execution: { missionId: 'm-1', runId: 'r-1', executionId: 'e-5', attempt: '1' },
    transportFn: (prompt) => {
      const d = fakeCompletedTransport()(prompt);
      const env = JSON.parse(d.stdout.slice(d.stdout.indexOf('{')));
      env.status = 'failed'; env.output = null; env.error = 'worker could not summarize';
      return { ...d, stdout: 'x ' + JSON.stringify(env) };
    }, eventRuntime: fakeEventRuntime });
  check('failed outcome', r9.outcome === OUTCOME.FAILED, JSON.stringify(r9));
  check('WORKER_FAILED recorded', fakeEventRuntime.calls.length === 1 && fakeEventRuntime.calls[0].eventType === 'WORKER_FAILED');

  // 10. Emission rejected -> honest UNKNOWN (Lane-J fail-closed).
  const r10 = await adapter.dispatchExecution({ ...BASE_OPTS,
    execution: { missionId: 'm-1', runId: 'r-1', executionId: 'e-6', attempt: '1' },
    transportFn: fakeCompletedTransport(),
    eventRuntime: { async emit() { return { status: 'error', error: 'pg down' }; } } });
  check('emission rejected -> UNKNOWN', r10.outcome === OUTCOME.UNKNOWN && r10.reason === 'canonical_emission_rejected', JSON.stringify(r10));

  // 11. Envelope with wrong work_order_id -> escalated, never reaches the event plane.
  fakeEventRuntime.calls = [];
  const r11 = await adapter.dispatchExecution({ ...BASE_OPTS,
    execution: { missionId: 'm-1', runId: 'r-1', executionId: 'e-7', attempt: '1' },
    transportFn: () => ({ startedAt: 't0', endedAt: 't1', timedOut: false, exitCode: 0, error: null,
      stdout: JSON.stringify({ work_order_id: 'WRONG', context_pack_id: 'c', agent_id: 'hermes', capability: 'text.summarize', status: 'completed', output: {}, evidence: {}, error: null }), stderr: '' }),
    eventRuntime: fakeEventRuntime });
  check('bad echo -> escalated', r11.outcome === OUTCOME.ESCALATED, JSON.stringify(r11));
  check('bad echo: no canonical event', fakeEventRuntime.calls.length === 0);

  // 12. Deterministic work order idempotency: same (executionId, attempt) -> same work_order_id.
  const r12a = await adapter.dispatchExecution({ ...BASE_OPTS,
    execution: { missionId: 'm-1', runId: 'r-1', executionId: 'e-8', attempt: '1' }, transportFn: fakeCompletedTransport() });
  const r12b = await adapter.dispatchExecution({ ...BASE_OPTS,
    execution: { missionId: 'm-1', runId: 'r-1', executionId: 'e-8', attempt: '1' }, transportFn: fakeCompletedTransport() });
  check('work_order_id idempotent', r12a.work_order_id === r12b.work_order_id && typeof r12a.work_order_id === 'string' && r12a.work_order_id.length === 16);

  // 13. outcomes.js: terminalOutcome refuses to label UNKNOWN as terminal.
  let threw = false;
  try { terminalOutcome(OUTCOME.UNKNOWN, {}); } catch (_) { threw = true; }
  check('terminalOutcome rejects unknown', threw);
  check('unknownOutcome shape', (() => { const u = unknownOutcome('x', {}); return u.outcome === 'unknown' && u.reconcileOwnedBy === 'caller'; })());

  // 14. validateExecution rejects bad identity.
  let vthrew = false;
  try { adapter.validateExecution({ missionId: 'm' }); } catch (_) { vthrew = true; }
  check('validateExecution rejects incomplete', vthrew);

  // 15. DEFECT-2: effect-state dimension in outcomes.js.
  const { EFFECT_STATE, effectHold, isEffectState } = require('../outcomes.js');
  check('EFFECT_STATE vocabulary',
    EFFECT_STATE.UNKNOWN === 'effect_unknown' && EFFECT_STATE.HOLD === 'effect_hold' && EFFECT_STATE.NONE === 'effect_none');
  check('isEffectState validates', isEffectState('effect_unknown') && !isEffectState('clean'));
  check('unknownOutcome carries effect_unknown', unknownOutcome('x', {}).effect_state === EFFECT_STATE.UNKNOWN);
  let threwCompleted = false;
  try { terminalOutcome(OUTCOME.COMPLETED, {}); } catch (_) { threwCompleted = true; }
  check('COMPLETED without effect_state throws (never clean success)', threwCompleted);
  const tc15 = terminalOutcome(OUTCOME.COMPLETED, { effect_state: EFFECT_STATE.UNKNOWN });
  check('COMPLETED records effect_unknown', tc15.outcome === OUTCOME.COMPLETED && tc15.effect_state === EFFECT_STATE.UNKNOWN);
  const tf15 = terminalOutcome(OUTCOME.FAILED, {});
  check('FAILED defaults to effect_unknown', tf15.effect_state === EFFECT_STATE.UNKNOWN);
  const held15 = effectHold({ outcome: OUTCOME.UNKNOWN, effect_state: EFFECT_STATE.UNKNOWN }, 'reconcile now');
  check('effectHold UNKNOWN->HOLD', held15.effect_state === EFFECT_STATE.HOLD && held15.reconcileOwnedBy === 'caller' && held15.effect_hold_reason === 'reconcile now');
  let threwHold = false;
  try { effectHold({ outcome: OUTCOME.DENIED, effect_state: EFFECT_STATE.NONE }); } catch (_) { threwHold = true; }
  check('effectHold refuses non-unknown', threwHold);

  // 16. dispatch: verified completion records effect_unknown end-to-end (never clean success).
  fakeEventRuntime.calls = [];
  const r16 = await adapter.dispatchExecution({ ...BASE_OPTS,
    execution: { missionId: 'm-1', runId: 'r-1', executionId: 'e-20', attempt: '1' },
    transportFn: fakeCompletedTransport(), eventRuntime: fakeEventRuntime });
  check('dispatch completed -> effect_unknown', r16.effect_state === EFFECT_STATE.UNKNOWN, JSON.stringify(r16));
  const art16 = JSON.parse(fs.readFileSync(r16.artifactPath, 'utf8'));
  check('completed artifact carries effect_unknown', art16.effect_state === EFFECT_STATE.UNKNOWN);
  check('canonical event metadata carries effect_state',
    fakeEventRuntime.calls.length === 1 && fakeEventRuntime.calls[0].opts.metadata.effect_state === EFFECT_STATE.UNKNOWN,
    JSON.stringify(fakeEventRuntime.calls[0] && fakeEventRuntime.calls[0].opts.metadata));

  // 17. dispatch: denied -> effect_none; escalated -> effect_unknown; failed -> effect_unknown.
  const r17d = await adapter.dispatchExecution({ ...BASE_OPTS, agentId: 'identity_6',
    transportFn: () => { throw new Error('must not run'); } });
  check('denied -> effect_none', r17d.outcome === OUTCOME.DENIED && r17d.effect_state === EFFECT_STATE.NONE, JSON.stringify(r17d));
  const r17e = await adapter.dispatchExecution({ ...BASE_OPTS,
    execution: { missionId: 'm-1', runId: 'r-1', executionId: 'e-21', attempt: '1' },
    transportFn: () => ({ startedAt: 't0', endedAt: 't1', timedOut: false, exitCode: 0, error: null, stdout: 'not json', stderr: '' }) });
  check('escalated -> effect_unknown', r17e.outcome === OUTCOME.ESCALATED && r17e.effect_state === EFFECT_STATE.UNKNOWN);
  const r17f = await adapter.dispatchExecution({ ...BASE_OPTS,
    execution: { missionId: 'm-1', runId: 'r-1', executionId: 'e-22', attempt: '1' },
    transportFn: (prompt) => {
      const d = fakeCompletedTransport()(prompt);
      const env = JSON.parse(d.stdout.slice(d.stdout.indexOf('{')));
      env.status = 'failed'; env.output = null; env.error = 'boom';
      return { ...d, stdout: 'x ' + JSON.stringify(env) };
    } });
  check('failed -> effect_unknown', r17f.outcome === OUTCOME.FAILED && r17f.effect_state === EFFECT_STATE.UNKNOWN);

  // 18. buildWorkerPrompt renders the binding constraints (caveat-1 closure).
  const wo18 = { work_order_id: 'w1', context_pack_id: 'c1', agent_id: 'hermes', capability: 'text.summarize',
    mission_id: 'm-1', task_id: 't-1', attempt: 1, input: { x: 1 },
    constraints: { no_canonical_events: true, no_mission_state_writes: true, read_only: true } };
  const p18 = adapter.buildWorkerPrompt(wo18, 'do the thing');
  check('prompt renders binding constraints',
    p18.includes('Binding constraints') && p18.includes('- no_canonical_events: true') &&
    p18.includes('- read_only: true') && p18.includes('Never perform the violating action'));

  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error('SELFTEST CRASH:', e); process.exit(1); });
