'use strict';
// ORCA-C mission 2 probe: dependency graphs — adversarial fixtures against the
// REAL W2 orca_ready_set.readyWorkOrders (pure query).
// Questions: missing dep / blocked dep / cyclic deps / self-dep / failed dep /
// unknown dep state / RUNNING dep -> deadlock? starve? proceed unsoundly?
const rs = require('../src/orca_ready_set.js');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name); }
}
const W = (id, state, deps) => ({ work_order_id: id, state, depends_on: deps });

// 1. missing dependency row -> never ready (not unsound, starves by design)
{
  const r = rs.readyWorkOrders([W('a', 'AUTHORIZED', ['ghost'])]);
  check('missing-dep: not ready', r.length === 0);
}
// 2. dependency on FAILED work order -> not ready
{
  const r = rs.readyWorkOrders([W('dep', 'FAILED'), W('a', 'AUTHORIZED', ['dep'])]);
  check('failed-dep: blocked', r.length === 0);
}
// 3. dependency RUNNING (in flight) -> not ready (no double-dispatch)
{
  const r = rs.readyWorkOrders([W('dep', 'RUNNING'), W('a', 'AUTHORIZED', ['dep'])]);
  check('running-dep: not ready', r.length === 0);
}
// 4. dependency in unknown state -> not ready (fail closed)
{
  const r = rs.readyWorkOrders([W('dep', 'WEIRD'), W('a', 'AUTHORIZED', ['dep'])]);
  check('unknown-dep-state: not ready', r.length === 0);
}
// 5. self-dependency -> never ready
{
  const r = rs.readyWorkOrders([W('a', 'AUTHORIZED', ['a'])]);
  check('self-dep: never ready', r.length === 0);
}
// 6. 3-cycle A->B->C->A, all AUTHORIZED -> cycle never ready; terminates (no hang)
{
  const t0 = Date.now();
  const r = rs.readyWorkOrders([
    W('a', 'AUTHORIZED', ['c']), W('b', 'AUTHORIZED', ['a']), W('c', 'AUTHORIZED', ['b']),
  ]);
  check('cycle: never ready, terminates', r.length === 0 && Date.now() - t0 < 1000);
}
// 7. diamond: d COMPLETED, b/c AUTHORIZED on d, a AUTHORIZED on b,c -> b,c ready; a not
{
  const r = rs.readyWorkOrders([
    W('d', 'COMPLETED'), W('b', 'AUTHORIZED', ['d']), W('c', 'AUTHORIZED', ['d']),
    W('a', 'AUTHORIZED', ['b', 'c']),
  ]).map(w => w.work_order_id).sort();
  check('diamond: only b,c ready', JSON.stringify(r) === JSON.stringify(['b', 'c']));
}
// 8. blockedWorkOrderIds (OUTCOME_UNKNOWN) -> never ready even if deps satisfied
{
  const r = rs.readyWorkOrders(
    [W('d', 'COMPLETED'), W('a', 'AUTHORIZED', ['d'])],
    { blockedWorkOrderIds: ['a'] }
  );
  check('blocked-unknown: never ready', r.length === 0);
}
// 9. RUNNING work order itself is never re-claimed
{
  const r = rs.readyWorkOrders([W('a', 'RUNNING', [])]);
  check('running-self: never re-claimed', r.length === 0);
}
// 10. unknown own state -> never claimable (fail closed)
{
  const r = rs.readyWorkOrders([W('a', 'SOME_NEW_STATE', [])]);
  check('unknown-own-state: not claimable', r.length === 0);
}
// 11. duplicate dep entries / dep listed twice -> still fine
{
  const r = rs.readyWorkOrders([W('d', 'COMPLETED'), W('a', 'AUTHORIZED', ['d', 'd'])]);
  check('dup-dep: ready', r.length === 1);
}
// 12. large cycle (100 nodes) terminates fast (no exponential blowup)
{
  const ws = [];
  for (let i = 0; i < 100; i++) ws.push(W('n' + i, 'AUTHORIZED', ['n' + ((i + 1) % 100)]));
  const t0 = Date.now();
  const r = rs.readyWorkOrders(ws);
  check('100-cycle: never ready, terminates fast', r.length === 0 && Date.now() - t0 < 1000);
}
console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
