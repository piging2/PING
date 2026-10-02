// laneB5 verify driver: runs ON PIG WSL via pigwsl-exec.sh -s. READ-ONLY.
// Re-issues the synthetic WorkOrder (deterministic id) with a fresh deadline,
// then verifies each supplied envelope. Reads JSON array [{name,envelope}] on stdin.
const M = require('/home/nolan/workspace/orca-adapter/vendor/external_agent_adapter.js');
const BASE_C = { read_only: true, no_writes: true, no_network: true,
  no_canonical_events: true, no_mission_state_writes: true };
const deadline = new Date(Date.now() + 300000).toISOString();
const WO = M.issueWorkOrder({
  agentId: 'hermes', capability: 'text.transform', namespace: 'core::ping24h',
  taskId: 'laneb5-synth:attempt-1', missionId: 'ping-24h:laneB5',
  correlationId: 'laneb5-run1', contextPackId: 'ctx-laneb5-synth',
  input: { task: 'text.transform', op: 'reverse_words', text: 'alpha bravo charlie delta',
    note: 'synthetic scratch input; no external effects' },
  constraints: BASE_C, resultPath: '/tmp/laneb5-synth-result.json',
  deadline, causationId: null, attempt: 1,
});
let s = '';
process.stdin.on('data', d => s += d).on('end', () => {
  const items = JSON.parse(s);
  const verifiedAt = new Date(Date.now() + 60000).toISOString();
  const lines = [`reissued deadline=${deadline} wo_id=${WO.work_order_id}`];
  for (const { name, envelope } of items) {
    let r;
    try { r = M.verifyResultEnvelope(envelope, WO, { invokedAgentId: 'hermes', verifiedAt }); }
    catch (e) { r = { valid: false, reason: 'THREW:' + e.message }; }
    lines.push(`${name}: valid=${r.valid} reason=${r.reason || 'none'} retryable=${r.retryable} result_id=${r.result_id ? r.result_id.slice(0,12) : 'n/a'}`);
  }
  console.log(lines.join('\n'));
});
