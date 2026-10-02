// Agent 19 TEST: hung-worker wedge against the COPIED mission_scheduler source.
// Proves: a never-resolving worker.handle() leaves the mission in _processing
// forever (finally never runs); _poll Arrow 0 renews those leases every poll;
// Arrow 2 refuses new dispatches once _processing.size >= maxConcurrent.
// Scratch harness only. Subject: probes/mission_scheduler_under_test.js (copy).
const Module = require('module');
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request.endsWith('constitutional_time_authority.js')) {
    return { constitutionalTimeAuthority: { nowAsISOString: () => new Date().toISOString() } };
  }
  return origLoad.apply(this, arguments);
};
const { MissionScheduler } = require('./mission_scheduler_under_test.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
function check(name, cond, detail) {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  if (!cond) failures++;
}

const calls = { renewLease: [], dispatch: [], getPending: 0, reap: 0 };
const pendingIds = ['m1', 'm2', 'm3', 'm4'];
const missionRuntime = {
  async getPending(n) { calls.getPending++; return pendingIds.splice(0, n).map((id) => ({ mission_id: id, mission_type: 'DOCUMENT_IMPORT', payload: {} })); },
  async assign() { return 1; },
  async start() { return 1; },
  async renewLease(id) { calls.renewLease.push(id); return 1; },
  async reapExpiredLeases() { calls.reap++; return 0; },
  async complete() { return 1; },
  async failWithRetry() { return 1; },
};
const workerRuntime = {
  getStats() { return { workers: { observation: {} } }; },
  dispatch(event) { calls.dispatch.push(event.mission_id); return new Promise(() => {}); }, // HUNG: never resolves
};

(async () => {
  const s = new MissionScheduler({ missionRuntime, workerRuntime, maxConcurrent: 3 });

  // Phase A: one hung dispatch sticks in _processing (finally never runs).
  const mk = (id) => ({ mission_id: id, mission_type: 'DOCUMENT_IMPORT', payload: {} });
  s._dispatch(mk('m1')); s._dispatch(mk('m2')); s._dispatch(mk('m3')); // detached: hang
  await sleep(150);
  check('A1 hung dispatches remain in _processing', s._processing.size === 3, `size=${s._processing.size}`);
  check('A2 dispatch called 3 times', calls.dispatch.length === 3, `dispatches=${calls.dispatch.length}`);

  // Phase C: poll with full _processing -> Arrow 0 renews all 3, Arrow 2 early-returns.
  const gpBefore = calls.getPending;
  await s._poll();
  const renewed = ['m1', 'm2', 'm3'].every((id) => calls.renewLease.includes(id));
  check('C1 Arrow 0 renewed all 3 hung leases', renewed, `renewals=${JSON.stringify(calls.renewLease)}`);
  check('C2 Arrow 2 dispatched nothing new', calls.dispatch.length === 3, `dispatches=${calls.dispatch.length}`);
  check('C3 getPending not called (early return)', calls.getPending === gpBefore, `getPending delta=${calls.getPending - gpBefore}`);
  check('C4 m4 never dispatched (starved)', !calls.dispatch.includes('m4'));

  // Phase D: second poll -> leases renewed AGAIN (forever while hung).
  await s._poll();
  check('D1 renewals repeat every poll', calls.renewLease.length === 6, `total renewals=${calls.renewLease.length}`);
  check('D2 reaper never reclaims (renewed before reap)', calls.reap === 2, `reap calls=${calls.reap}`);

  // Phase E (control): freeing one slot resumes dispatch.
  s._processing.delete('m1');
  await s._poll();
  check('E1 dispatch resumes when a slot frees', calls.dispatch.includes('m4'), `dispatches=${JSON.stringify(calls.dispatch)}`);

  console.log(failures === 0 ? '\nWEDGE-TEST: ALL PASS (8/8)' : `\nWEDGE-TEST: ${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
