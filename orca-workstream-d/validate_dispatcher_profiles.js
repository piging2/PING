'use strict';
/**
 * Validation for the ORCA AUTONOMY dispatcher-family profile registrations
 * (2026-09-18, workstream d). Uses only the registry's own mechanism:
 * AGENT_PROFILES + authorizeWorkOrder + issueWorkOrder + verifyResultEnvelope
 * + recordVerifiedResult (stub event runtime).
 *
 * Run from the worktree root:
 *   node ping-runtime/external-agent/validate_dispatcher_profiles.js
 */
const assert = require('assert');
const {
  AGENT_PROFILES, workOrderId, authorizeWorkOrder,
  issueWorkOrder, verifyResultEnvelope, recordVerifiedResult,
} = require('./external_agent_adapter');

const CONSTRAINTS = {
  read_only: true, no_writes: true, no_network: true,
  no_canonical_events: true, no_mission_state_writes: true,
  allowed_workspace: 'validation.dispatcher-profiles',
};

let n = 0;
function ok(cond, name) { n++; assert(cond, 'FAIL: ' + name); console.log('ok ' + n + ' - ' + name); }

// 1. Registry lists the four dispatcher families (from the contract, section 3).
const families = {};
for (const [id, p] of Object.entries(AGENT_PROFILES)) {
  const f = p.family || 'legacy';
  families[f] = families[f] || [];
  families[f].push(id);
}
for (const f of ['cloud-subagent', 'hermes', 'ollama', 'copilot']) {
  ok(families[f] && families[f].length > 0, 'family registered: ' + f + ' (' + (families[f] || []).join(',') + ')');
}
ok(families['copilot'].length === 4, 'copilot family holds exactly the four pre-authorized identities');

// 2. Port fidelity: deterministic work_order_id matches the proven live value.
ok(workOrderId('task-uppercase-001') === '0d598aef352b9a8a', 'work_order_id deterministic and equals live value 0d598aef352b9a8a');

// 3. Grant path resolves for every LIVE family profile.
const CAP = {
  'cloud-subagent': 'orchestration.review',
  'hermes': 'text.transform',
  'ollama': 'test.generate',
  'identity_1': 'test.generate', 'identity_2': 'test.generate',
  'identity_3': 'test.generate', 'identity_4': 'test.generate',
};
for (const id of Object.keys(CAP)) {
  ok(AGENT_PROFILES[id] && AGENT_PROFILES[id].status === 'LIVE', 'profile ' + id + ' marked LIVE');
  const g = authorizeWorkOrder({ agentId: id, capability: CAP[id], namespace: 'core::owner', constraints: CONSTRAINTS });
  ok(g.granted === true, 'authorizeWorkOrder grants ' + id + '/' + CAP[id]);
}

// 4. Fail-closed: anything outside the four identities fails.
const bad = authorizeWorkOrder({ agentId: 'identity_5', capability: 'test.generate', namespace: 'core::owner', constraints: CONSTRAINTS });
ok(bad.granted === false && /Unknown/.test(bad.reason), 'denies unregistered copilot identity identity_5');

// 5. Fail-closed: PENDING_AUTH profiles register but never grant (mechanism check).
AGENT_PROFILES['tmp-pending-auth'] = {
  transport: null, allowedCapabilities: ['text.transform'],
  maxConstraints: {}, status: 'PENDING_AUTH', family: 'tmp',
};
const pa = authorizeWorkOrder({ agentId: 'tmp-pending-auth', capability: 'text.transform', namespace: 'core::owner', constraints: CONSTRAINTS });
ok(pa.granted === false && /pending one-time authorization/.test(pa.reason), 'PENDING_AUTH profile is registered but not grantable');
delete AGENT_PROFILES['tmp-pending-auth'];

// 6. issueWorkOrder + verifyResultEnvelope round trip for one LIVE family (ollama).
const wo = issueWorkOrder({
  agentId: 'ollama', capability: 'test.generate', namespace: 'core::owner',
  taskId: 'task-validate-001', missionId: 'mission-validate-001',
  correlationId: 'corr-validate-001', contextPackId: 'ctx_validate_001',
  input: { prompt: 'write a unit test' }, constraints: CONSTRAINTS,
  resultPath: '/results/validate-001.json', deadline: '2026-09-19T00:00:00Z',
});
ok(wo.agent_id === 'ollama' && wo.principal === 'ping:external-agent-adapter' && wo.attempt === 1,
  'issueWorkOrder builds bound envelope for ollama');
const res = {
  work_order_id: wo.work_order_id, context_pack_id: 'ctx_validate_001',
  agent_id: 'ollama', capability: 'test.generate', status: 'completed',
  output: 'TEST', evidence: { model: 'qwen2.5-coder:1.5b' }, error: null,
};
const v = verifyResultEnvelope(res, wo, { invokedAgentId: 'ollama', verifiedAt: '2026-09-18T12:00:00Z' });
ok(v.valid === true && /^[0-9a-f]{64}$/.test(v.result_id), 'verifyResultEnvelope accepts the bound ollama result');

// 7. recordVerifiedResult reenters only through the injected event runtime.
async function main() {
  const emitted = [];
  const eventRuntime = {
    async emit(eventType, source, payload, options) {
      emitted.push({ eventType, source, options });
      return { status: 'ok', eventId: 'evt-test-001', deduplicated: false };
    },
  };
  const r = await recordVerifiedResult({ eventRuntime, result: res, workOrder: wo, invokedAgentId: 'ollama', verifiedAt: '2026-09-18T12:00:00Z' });
  ok(r.valid === true && r.event_type === 'WORKER_COMPLETED' && emitted.length === 1,
    'recordVerifiedResult emits WORKER_COMPLETED via injected runtime only');
  ok(emitted[0].source === 'worker-runtime:external-agent-adapter' && emitted[0].options.logical_id === r.result_id,
    'event logical_id is the adapter result identity; exterior agent never emits');
  console.log('\nPASS: ' + n + ' assertions');
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
