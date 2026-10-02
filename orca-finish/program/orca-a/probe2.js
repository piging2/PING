'use strict';
/* ORCA-A probes part 2: split-brain, idempotent claim, stuck-worker lease hole. */
const rt = require('/home/hatch/workspace/orca-finish/program/orca-a/src/objective-runtime.js');
const fs = require('fs'), os = require('os'), path = require('path');
let pass = 0, fail = 0;
function ok(name, cond, detail = '') {
  if (cond) { pass++; console.log(`PASS ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`); }
}

(async () => {
  // ---------------------------------------------------------------- H9: split-brain two coordinators (fake pg client)
  const mkClient = (advisoryFree) => ({
    query: async (sql, params) => {
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ acquired: advisoryFree }] };
      if (sql.includes('pg_backend_pid')) return { rows: [{ pid: 4242 }] };
      return { rows: [] };
    },
  });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orca-a-p2-'));
  rt.registerObjective(root, 'orca', 'split brain');
  const oid = rt.deriveObjectiveId({ namespace: 'orca', objectiveText: 'split brain', constraints: {} });

  const cA = await rt.acquireCoordinatorLock(mkClient(true), root, oid);
  ok('H9a first coordinator acquires', cA.acquired === true, `pg_backend_pid=${cA.pgBackendPid}`);
  const cB = await rt.acquireCoordinatorLock(mkClient(false), root, oid);
  ok('H9b second coordinator refused (must exit)', cB.acquired === false);
  const diag = rt.readJson(rt.coordinatorClaimPath(root, oid));
  ok('H9c diagnostic claim file is marked non-authoritative', diag && /not this file/i.test(diag.note));
  // Hung-but-connected coordinator: no TTL, no renewal, no takeover path exists.
  const src = rt.acquireCoordinatorLock.toString();
  ok('H9d no TTL/heartbeat on coordinator lock (stuck holder blocks forever)', !/ttl|expir|renew|heartbeat/i.test(src));

  // ---------------------------------------------------------------- H10: authorizeWorkOrder idempotent claim
  const w1 = rt.authorizeWorkOrder(root, oid, 'task-1', { text: 'do thing' });
  const w2 = rt.authorizeWorkOrder(root, oid, 'task-1', { text: 'do thing' });
  ok('H10a re-authorize returns same work_order_id (crash-safe rediscovery)', w1.work_order_id === w2.work_order_id);
  ok('H10b re-authorize does not reset attempt_count', w2.attempt_count === 0 && w2.state === 'AUTHORIZED');
  const r = rt.reserveWorkOrderBudget(root, oid, w1.work_order_id);
  const r2 = rt.reserveWorkOrderBudget(root, oid, w1.work_order_id);
  ok('H10c budget reserve idempotent (no double-spend)', r.ok && r2.ok && rt.budgetUsage(root, oid).used === 1);

  // ---------------------------------------------------------------- H11: PING stuck-worker lease hole (static, from scheduler source)
  const schedSrc = fs.readFileSync('/home/hatch/workspace/orca-finish/program/orca-a/src/mission_scheduler.js', 'utf8');
  const dispatchFn = schedSrc.slice(schedSrc.indexOf('async _dispatch'), schedSrc.indexOf('async _dispatch') + 4000);
  ok('H11a _dispatch awaits worker with NO timeout', !/timeout|setTimeout|Promise\.race|Abort/i.test(dispatchFn));
  const pollFn = schedSrc.slice(schedSrc.indexOf('async _poll'), schedSrc.indexOf('async _poll') + 1500);
  ok('H11b Arrow 0 renews every _processing mission before reaping', /Arrow 0/.test(pollFn) && /Arrow 1/.test(schedSrc));
  ok('H11c stuck worker renews forever: renew has no attempt/holder gate', /renewLease/.test(pollFn));
  const rtSrc = fs.readFileSync('/home/hatch/workspace/orca-finish/program/orca-a/src/mission_runtime.js', 'utf8');
  const renewSql = rtSrc.slice(rtSrc.indexOf('async renewLease'), rtSrc.indexOf('async renewLease') + 500);
  ok('H11d renewLease SQL has no holder/assigned_to check', !/assigned_to|holder/i.test(renewSql));
  ok('H11e ping_missions has no epoch/generation column', !/epoch|generation|fencing/i.test(rtSrc));

  // ---------------------------------------------------------------- H12: PING stale-worker write hazard (static)
  const completeSql = rtSrc.slice(rtSrc.indexOf('async complete'), rtSrc.indexOf('async complete') + 800);
  ok('H12a complete() conditional on status only (no holder, no epoch)', /status = 'running'/.test(completeSql) && !/assigned_to|epoch/i.test(completeSql));
  const failSql = rtSrc.slice(rtSrc.indexOf('async fail('), rtSrc.indexOf('async fail(') + 500);
  ok('H12b fail() conditional on status set only (no holder)', !/assigned_to|epoch/i.test(failSql));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
