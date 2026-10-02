// Driver 1: objective-runtime.js durable-state semantics (real module).
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const R = require('/tmp/audit-u/orca/control-loop/objective-runtime.js');
const DATA = '/tmp/audit-u/data/d1';
fs.rmSync(DATA, { recursive: true, force: true });

let pass = 0;
function ok(name, cond) { if (!cond) { console.error('FAIL: ' + name); process.exitCode = 1; } else { pass++; console.log('pass: ' + name); } }

// A1: objective id deterministic, logical-intent-only
const idA = R.deriveObjectiveId({ namespace: 'orca', objectiveText: 'audit objective one', constraints: { a: 1 } });
const idB = R.deriveObjectiveId({ namespace: 'orca', objectiveText: 'audit objective one', constraints: { a: 1 } });
const idC = R.deriveObjectiveId({ namespace: 'orca', objectiveText: 'audit objective two', constraints: { a: 1 } });
ok('A1 same-intent same id', idA === idB && /^[0-9a-f]{64}$/.test(idA));
ok('A1 different text different id', idA !== idC);

// A2: registration re-entrant, single file
const r1 = R.registerObjective(DATA, 'orca', 'audit objective one', { constraints: { a: 1 }, maxWorkOrders: 2 });
const r2 = R.registerObjective(DATA, 'orca', 'audit objective one', { constraints: { a: 1 }, maxWorkOrders: 2 });
ok('A2 register re-entrant same id', r1.objective_id === r2.objective_id);
ok('A2 single objective.json', fs.readdirSync(path.join(DATA, 'objectives', r1.objective_id)).includes('objective.json'));
const OID = r1.objective_id;

// A2b: work order authorize re-entrant, single file
const w1 = R.authorizeWorkOrder(DATA, OID, 'task-alpha', { brief: 'x' });
const w2 = R.authorizeWorkOrder(DATA, OID, 'task-alpha', { brief: 'x' });
ok('A2b authorize re-entrant same wo id', w1.work_order_id === w2.work_order_id);
const woFiles = fs.readdirSync(path.join(DATA, 'objectives', OID, 'work_orders'));
ok('A2b single work-order file (no duplicate)', woFiles.length === 1);
ok('A2b work order id stable per (objective,task)', w1.work_order_id === R.deriveWorkOrderId(OID, 'task-alpha'));
ok('A2b attempt id deterministic', R.deriveAttemptId(w1.work_order_id, 1) === w1.work_order_id + '-attempt-1');

// A3: durable budget cap 2
const b1 = R.reserveWorkOrderBudget(DATA, OID, w1.work_order_id);
const wB = R.authorizeWorkOrder(DATA, OID, 'task-beta', {});
const b2 = R.reserveWorkOrderBudget(DATA, OID, wB.work_order_id);
const wC = R.authorizeWorkOrder(DATA, OID, 'task-gamma', {});
const b3 = R.reserveWorkOrderBudget(DATA, OID, wC.work_order_id);
ok('A3 first two reservations ok', b1.ok && b2.ok && b2.used === 2);
ok('A3 third denied budget-exhausted', !b3.ok && b3.reason === 'budget-exhausted');
const b1again = R.reserveWorkOrderBudget(DATA, OID, w1.work_order_id);
ok('A3 re-reserve idempotent, no double consume', b1again.ok && R.budgetUsage(DATA, OID).used === 2);

// A4: cancellation durable
const cancelled = R.recordCancellation(DATA, OID, 'audit test');
const loaded = R.loadObjective(DATA, OID);
ok('A4 cancellation persisted', loaded.state === 'CANCELLED' && !!loaded.cancellation && loaded.cancellation.requested_at);
ok('A4 cancel request path inside objective dir', R.cancelRequestPath(DATA, OID).startsWith(path.join(DATA, 'objectives', OID)));

// A5: coordinator lock key deterministic
const k1 = R.coordinatorLockKey(OID), k2 = R.coordinatorLockKey(OID);
ok('A5 lock key deterministic', k1.k1 === k2.k1 && k1.k2 === k2.k2 && Number.isInteger(k1.k1));

// A6: atomic write leaves complete file, no tmp litter
R.atomicWrite(path.join(DATA, 'probe.txt'), 'hello');
ok('A6 atomic write readable', fs.readFileSync(path.join(DATA, 'probe.txt'), 'utf8') === 'hello');
ok('A6 no tmp litter', !fs.readdirSync(DATA).some((f) => f.includes('.tmp-')));

// E: work-order state machine persisted on disk
R.updateWorkOrder(DATA, OID, w1.work_order_id, { state: 'RUNNING', attempt_count: 1, last_attempt_id: R.deriveAttemptId(w1.work_order_id, 1) });
const reloaded = R.loadWorkOrder(DATA, OID, w1.work_order_id);
ok('E state transition durable', reloaded.state === 'RUNNING' && reloaded.attempt_count === 1);
console.log('DRIVER1 passes=' + pass);
