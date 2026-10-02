'use strict';
// ORCA-C mission 7 probe: context staleness — is a stale snapshot detected
// via fencing/version on the write path?
// Uses REAL modules: W2 orca_run_record + branch objective-runtime on scratch dirs.
const fs = require('fs');
const os = require('os');
const path = require('path');
const rt = require('../src/objective-runtime.js');
const rr = require('../src/orca_run_record.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orca-c-m7-'));
const NS = 'orca-c-m7';
const objText = 'm7 staleness probe objective';

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name); }
}

const oid = rt.deriveObjectiveId({ namespace: NS, objectiveText: objText });
rt.registerObjective(root, NS, objText, {});
const run = rr.registerRun(rt, root, oid, {});
const rid = run.run_id;

// 1. fencing-epoch CAS on the claim path: stale epoch refused
const c1 = rr.claimRun(rt, root, oid, rid, { holderId: 'holder-A', ttlMs: 60000, expectedEpoch: 0 });
check('claim epoch 0 -> ok, epoch becomes 1', c1.ok === true && c1.fencing_epoch === 1);
const stale = rr.claimRun(rt, root, oid, rid, { holderId: 'holder-B', ttlMs: 60000, expectedEpoch: 0 });
check('stale epoch 0 claim refused', stale.ok === false && stale.reason === 'stale-epoch');

// 2. lease changes hands: B claims with current epoch
const c2 = rr.claimRun(rt, root, oid, rid, { holderId: 'holder-B', ttlMs: 60000, expectedEpoch: 1 });
check('current-epoch claim ok (epoch 2, holder B)', c2.ok === true && c2.fencing_epoch === 2);

// 3. STALE HOLDER A (lost the lease) writes via transitionRun — no epoch check
let staleWriteOk = false;
try {
  rr.transitionRun(rt, root, oid, rid, 'START'); // A acts on its stale snapshot
  staleWriteOk = true;
} catch (e) { staleWriteOk = false; }
check('VULN: stale holder transitionRun succeeds (no epoch gate)', staleWriteOk === true);

// 4. STALE HOLDER A checkpoints — no epoch check either
let staleCkptOk = false;
try {
  rr.checkpointRun(rt, root, oid, rid, 'sha256:stale-snapshot');
  staleCkptOk = true;
} catch (e) { staleCkptOk = false; }
check('VULN: stale holder checkpointRun succeeds (no epoch gate)', staleCkptOk === true);

// 5. the epoch is readable -> staleness is DETECTABLE (just not prevented)
const loaded = rr.loadRun(rt, root, oid, rid);
check('epoch readable for detection (detect-not-prevent)',
  loaded.lease.fencing_epoch === 2 && loaded.lease.holder_id === 'holder-B');

// 6. branch work-order update path: no fencing at all (updateWorkOrder is blind overwrite)
const woId = rt.deriveWorkOrderId(oid, 'task-x');
rt.authorizeWorkOrder(root, oid, 'task-x', {});
rt.updateWorkOrder(root, oid, woId, { state: 'RUNNING', dispatch_pid: 111, attempt_count: 1, last_attempt_id: woId + '-attempt-1' });
// stale writer (e.g. a dead dispatcher's late report) overwrites with no check
rt.updateWorkOrder(root, oid, woId, { state: 'COMPLETED', terminal: { status: 'completed', note: 'stale writer' } });
const wo = rt.loadWorkOrder(root, oid, woId);
check('VULN: work-order updateWorkOrder overwrites with no epoch/holder check',
  wo.state === 'COMPLETED' && wo.terminal.note === 'stale writer');

console.log(`\n${pass} pass, ${fail} fail`);
console.log('scratch root:', root);
process.exit(fail ? 1 : 0);
