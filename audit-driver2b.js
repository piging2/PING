// Driver 2b: adapter stableWorkOrderId + issueWorkOrder override (real module).
'use strict';
const assert = require('assert');
const A = require('/tmp/audit-u2/ping-runtime/external-agent/external_agent_adapter.js');
let pass = 0;
function ok(name, cond) { if (!cond) { console.error('FAIL: ' + name); process.exitCode = 1; } else { pass++; console.log('pass: ' + name); } }

// C1: valid explicit override passes through
const hex64 = 'ab'.repeat(32);
ok('C1 valid override passthrough', A.stableWorkOrderId(hex64, 'task-1') === hex64);

// C2: invalid override throws WORK_ORDER_DENIED
let threw = null;
try { A.stableWorkOrderId('not-hex!!', 'task-1'); } catch (e) { threw = e; }
ok('C2 invalid override throws', threw && threw.code === 'WORK_ORDER_DENIED');
threw = null;
try { A.stableWorkOrderId('ABCDEF1234567890ABCDEF1234567890', 'task-1'); } catch (e) { threw = e; }
ok('C2 uppercase hex rejected', threw && threw.code === 'WORK_ORDER_DENIED');

// C3: null/undefined fall back to deterministic 16-hex minter
const f1 = A.stableWorkOrderId(null, 'task-9');
const f2 = A.stableWorkOrderId(undefined, 'task-9');
ok('C3 fallback deterministic 16-hex', f1 === f2 && /^[0-9a-f]{16}$/.test(f1));
ok('C3 fallback matches legacy minter', f1 === A.workOrderId('task-9'));

// C4: issueWorkOrder honors the stable override end-to-end
const wo = A.issueWorkOrder({
  agentId: 'hermes', capability: 'text.summarize', namespace: 'core::test',
  taskId: 'task-9', missionId: 'm1', correlationId: 'c1', contextPackId: 'cp1',
  input: { q: 'x' }, constraints: { no_canonical_events: true, no_mission_state_writes: true, read_only: true, no_writes: true, no_network: true },
  resultPath: '/tmp/r.json', deadline: new Date(Date.now() + 60000).toISOString(),
  workOrderId: hex64,
});
ok('C4 issueWorkOrder uses override', wo.work_order_id === hex64);
// and without override it falls back to the legacy minter
const wo2 = A.issueWorkOrder({
  agentId: 'hermes', capability: 'text.summarize', namespace: 'core::test',
  taskId: 'task-9', missionId: 'm1', correlationId: 'c1', contextPackId: 'cp1',
  input: { q: 'x' }, constraints: { no_canonical_events: true, no_mission_state_writes: true, read_only: true, no_writes: true, no_network: true },
  resultPath: '/tmp/r.json', deadline: new Date(Date.now() + 60000).toISOString(),
});
ok('C4 no-override falls back to minter', wo2.work_order_id === A.workOrderId('task-9'));
console.log('DRIVER2B passes=' + pass);
