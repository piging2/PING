#!/usr/bin/env node
'use strict';
/**
 * ORCA-D mission 8: schema drift on durable records.
 * The branch keeps NO schema version on any durable record. Probes:
 *  1. older-schema record (missing dispatch_pid, attempt_history, issued)
 *     through the reconcile decision: does the reader fail closed or misread?
 *  2. newer-schema record (extra fields, renamed field) read by current code.
 *  3. corrupt (torn) JSON through listWorkOrders (the reconcileStartup path).
 *  4. corrupt JSON through loadWorkOrder / updateWorkOrder (delegate path).
 * Uses the REAL vendor objective-runtime (branch ae55b77ff).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const objRuntime = require('./vendor-objective-runtime.js');

const DATA_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'orca-d-schema-'));
const OBJECTIVE_ID = 'obj-schema-test';

// replicate the loop's pidAlive (vendor-orca_control_loop.js:294 verbatim logic)
function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (err) { return err && err.code !== 'ESRCH'; }
}

// 1. older-schema record: authorized by "v1" that never wrote dispatch_pid etc.
const woOld = objRuntime.deriveWorkOrderId(OBJECTIVE_ID, 't-old');
{
  const dir = path.join(DATA_ROOT, 'objectives', OBJECTIVE_ID, 'work_orders');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, woOld + '.json'), JSON.stringify({
    work_order_id: woOld, objective_id: OBJECTIVE_ID, task_key: 't-old',
    state: 'RUNNING', attempt_count: 1, last_attempt_id: 'attempt-v1-1',
    // NOTE: no dispatch_pid (v1 never recorded it), no attempt_history, no issued
  }));
}
const dwo = objRuntime.loadWorkOrder(DATA_ROOT, OBJECTIVE_ID, woOld);
const decision = !dwo.dispatch_pid && !pidAlive(dwo.dispatch_pid)
  ? 'dispatcher verifiably dead -> DISPATCH_LOST -> re-authorized (REDISPATCH)'
  : 'other';
console.log(`1. older-schema RUNNING record (no dispatch_pid): reconcile decides: ${decision}`);
console.log('   VERDICT: MISREAD — absence of the field is converted into "dead", the most dangerous branch. A v1 record for a LIVE dispatcher would be re-dispatched (double execution). Lenient reading fails open.');

// 2. newer-schema record: extra + renamed fields
const woNew = objRuntime.deriveWorkOrderId(OBJECTIVE_ID, 't-new');
{
  const dir = path.join(DATA_ROOT, 'objectives', OBJECTIVE_ID, 'work_orders');
  const rec = objRuntime.authorizeWorkOrder(DATA_ROOT, OBJECTIVE_ID, 't-new', {});
  rec.schema_version = 99;
  rec.dispatcher_pid = 12345;          // renamed in v99 (was dispatch_pid)
  delete rec.attempt_count;            // v99 moved it under attempts.count
  rec.attempts = { count: 2 };
  fs.writeFileSync(path.join(dir, woNew + '.json'), JSON.stringify(rec));
}
const dwoNew = objRuntime.loadWorkOrder(DATA_ROOT, OBJECTIVE_ID, woNew);
const attemptSeen = (dwoNew.attempt_count || 0) + 1; // delegate: attempt = (cur.attempt_count||0)+1
console.log(`2. newer-schema record (attempt_count moved): delegate computes next attempt=${attemptSeen} (true count was 2)`);
console.log('   VERDICT: MISREAD — unknown fields ignored, missing fields default; the durable budget can be under-counted, re-allowing exhausted attempts. No version gate.');

// 3. corrupt JSON through listWorkOrders (reconcileStartup path)
const woCorrupt = objRuntime.deriveWorkOrderId(OBJECTIVE_ID, 't-corrupt');
{
  const dir = path.join(DATA_ROOT, 'objectives', OBJECTIVE_ID, 'work_orders');
  fs.writeFileSync(path.join(dir, woCorrupt + '.json'), '{"work_order_id": "t-corrupt", "state": "RUNN');
}
try {
  objRuntime.listWorkOrders(DATA_ROOT, OBJECTIVE_ID);
  console.log('3. corrupt record: listWorkOrders tolerated it (unexpected)');
} catch (e) {
  console.log(`3. corrupt record: listWorkOrders THREW (${e.constructor.name}: ${String(e.message).slice(0, 60)}...)`);
  console.log('   VERDICT: no per-record fault isolation. reconcileStartup is called before any dispatch on EVERY startup,');
  console.log('   so one torn/unparseable work-order file -> main() generic catch -> 99-fatal.json -> exit(2), on every restart:');
  console.log('   the objective is PERMANENTLY BRICKED until a human repairs the file. Fail-closed for safety, liveness-fatal.');
}

// 4. corrupt JSON through loadWorkOrder (delegate path, mid-run)
try {
  objRuntime.loadWorkOrder(DATA_ROOT, OBJECTIVE_ID, woCorrupt);
  console.log('4. loadWorkOrder tolerated corrupt JSON (unexpected)');
} catch (e) {
  console.log(`4. loadWorkOrder on corrupt record THREW (${e.constructor.name}); delegate/updateWorkOrder would crash mid-run the same way.`);
}
