// Driver 4 (T2): kill-before-dispatch across real process boundary.
'use strict';
const R = require('/tmp/audit-u2/orca/control-loop/objective-runtime.js');
const DATA = '/tmp/audit-u2/data/d4x';
const mode = process.argv[2];
if (mode === 'stage') {
  const reg = R.registerObjective(DATA, 'core::system', 't2 objective', { constraints: {}, maxWorkOrders: 2 });
  const wo = R.authorizeWorkOrder(DATA, reg.objective_id, 'task-t2', { brief: 'b' });
  const b = R.reserveWorkOrderBudget(DATA, reg.objective_id, wo.work_order_id);
  console.log(JSON.stringify({ oid: reg.objective_id, wo: wo.work_order_id, budget: b }));
} else {
  const fs = require('fs');
  const path = require('path');
  const dirs = fs.readdirSync(path.join(DATA, 'objectives'));
  const oid = dirs[0];
  const woId = R.deriveWorkOrderId(oid, 'task-t2');
  const dwo = R.loadWorkOrder(DATA, oid, woId);
  const woAgain = R.authorizeWorkOrder(DATA, oid, 'task-t2', { brief: 'b' });
  const usage = R.budgetUsage(DATA, oid);
  const files = fs.readdirSync(path.join(DATA, 'objectives', oid, 'work_orders'));
  const checks = {
    rediscovered: !!dwo && dwo.state === 'AUTHORIZED',
    same_id: woAgain.work_order_id === woId,
    single_file: files.length === 1,
    budget_survives: usage.used === 1 && usage.limit === 2,
    no_new_attempt: (dwo.attempt_count || 0) === 0,
  };
  console.log(JSON.stringify(checks));
  const bad = Object.entries(checks).filter(([, v]) => !v);
  if (bad.length) { console.error('T2 FAIL: ' + JSON.stringify(bad)); process.exit(1); }
  console.log('T2 PASS: restart rediscovers durable work, no duplicate logical work');
}
