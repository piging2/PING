const a = require('/home/nolan/worktrees/orca-autonomy/ping-runtime/external-agent/external_agent_adapter.js');
function mkW(extra) {
  return a.issueWorkOrder(Object.assign({
    agentId: 'hermes', capability: 'text.summarize', namespace: 'core::system',
    taskId: 't1', missionId: 'm1', correlationId: 'c1', contextPackId: 'p1',
    input: {}, constraints: { read_only: true, no_writes: true, no_network: true, no_canonical_events: true, no_mission_state_writes: true }, resultPath: '/tmp/x',
    deadline: new Date().toISOString(), causationId: null,
  }, extra || {}));
}
const w1 = mkW();
const w2 = mkW();
console.log('no-override deterministic:', w1.work_order_id === w2.work_order_id, w1.work_order_id);
console.log('no-override matches legacy minter:', w1.work_order_id === a.workOrderId('t1'));
const hex64 = 'a'.repeat(64);
const w3 = mkW({ workOrderId: hex64 });
console.log('override honored:', w3.work_order_id === hex64);
try {
  a.stableWorkOrderId('not-hex!!', 't1');
  console.log('invalid: NOT REJECTED (BAD)');
} catch (e) {
  console.log('invalid rejected:', e.code);
}
try {
  a.stableWorkOrderId('ABCDEF1234567890ABCDEF1234567890', 't1');
  console.log('uppercase: NOT REJECTED (BAD)');
} catch (e) {
  console.log('uppercase rejected:', e.code);
}
console.log('null falls back:', a.stableWorkOrderId(null, 't1') === a.workOrderId('t1'));
console.log('undefined falls back:', a.stableWorkOrderId(undefined, 't1') === a.workOrderId('t1'));
