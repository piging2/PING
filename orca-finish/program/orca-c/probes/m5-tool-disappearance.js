'use strict';
// ORCA-C mission 5 probe: tool disappearance.
// Branch side: the dispatcher "tool" is a child process. Test the real spawn
// contract: nonexistent dispatcher script -> child exits nonzero, no rendezvous
// -> matches the loop's verbatim no-rendezvous branch -> bounded retry ->
// FAILED retry-budget-exhausted (honest; classifyRetry proven bounded in m8).
// Mainline side: REAL MissionScheduler with stub runtimes. Tool absent before
// dispatch -> what happens across repeated polls?
const { spawn } = require('child_process');
const { MissionScheduler } = require('./vendor/ping-runtime/orchestration/mission_scheduler.js');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name); }
}

(async () => {
  // ---- branch: tool absent before spawn ----
  const t0 = Date.now();
  const child = spawn(process.execPath, ['/nonexistent/orca-c-m5-dispatcher.js']);
  const exitCode = await new Promise((resolve) => child.on('close', resolve));
  check('branch: missing dispatcher script -> child exits nonzero fast (tool absence visible, not fabricated success)',
    exitCode !== 0 && Date.now() - t0 < 5000);
  // In runDispatcherSpawn this yields { exitCode: 1, no rendezvous }; the loop's
  // verbatim path: collectRendezvousDrop=false, readRendezvousResult throws ->
  // dispatchFailure classification -> attempt loop -> classifyRetry bounds ->
  // FAILED retry-budget-exhausted (m8 proves the bound). No fabricated success.

  // ---- mainline scheduler: worker absent ----
  const missions = new Map([
    ['mm-1', { mission_id: 'mm-1', mission_type: 'UNMAPPED_TYPE', status: 'pending' }],
    ['mm-2', { mission_id: 'mm-2', mission_type: 'REVIEW_RESPONSE', status: 'pending' }], // mapped -> 'observation', but not registered
  ]);
  const failed = [];
  const missionRuntime = {
    getPending: async () => Array.from(missions.values()).filter(m => m.status === 'pending'),
    reapExpiredLeases: async () => 0,
    failWithRetry: async (id, err) => { failed.push({ id, err }); return 1; },
  };
  const workerRuntime = { getStats: () => ({ workers: {} }) }; // nothing registered
  const sched = new MissionScheduler({ missionRuntime, workerRuntime, pollIntervalMs: 100000 });
  await sched._poll();
  await sched._poll();
  await sched._poll();
  const s1 = sched.getStats();
  check('scheduler: unmapped + unregistered-worker missions skipped, never dispatched',
    s1.dispatched === 0 && s1.skipped >= 6);
  check('VULN/note: skipped missions stay pending forever (no escalation, no fail, no event)',
    missions.get('mm-1').status === 'pending' && missions.get('mm-2').status === 'pending' && failed.length === 0);

  // ---- contrast: worker registered but dispatch() returns null -> honest fail path ----
  const workerRuntime2 = { getStats: () => ({ workers: { observation: {} } }) };
  const sched2 = new MissionScheduler({ missionRuntime, workerRuntime: workerRuntime2, pollIntervalMs: 100000 });
  // _dispatch needs more stubs (assign/start/dispatch); emulate null dispatch result path minimally:
  // dispatch path calls assign/start then WorkerRuntime.dispatch -> returns null.
  // We stub enough to reach that branch.
  const missions2 = new Map([['mm-3', { mission_id: 'mm-3', mission_type: 'REVIEW_RESPONSE', status: 'pending', payload: { event_type: 'SOME_EVENT' } }]]);
  const failed2 = [];
  const missionRuntime2 = {
    getPending: async () => Array.from(missions2.values()).filter(m => m.status === 'pending'),
    reapExpiredLeases: async () => 0,
    assign: async () => {}, start: async () => {},
    failWithRetry: async (id, err) => { failed2.push({ id, err }); missions2.get(id).status = 'retry_pending'; return 1; },
  };
  const workerRuntime2b = { getStats: () => ({ workers: { observation: {} } }), dispatch: async () => null };
  const sched3 = new MissionScheduler({ missionRuntime: missionRuntime2, workerRuntime: workerRuntime2b, pollIntervalMs: 100000 });
  await sched3._poll();
  check('scheduler: registered worker + null dispatch -> _failMission (honest retry path, not phantom-complete)',
    failed2.length === 1 && /no worker matched/.test(failed2[0].err));

  console.log(`\n${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR', e); process.exit(2); });
