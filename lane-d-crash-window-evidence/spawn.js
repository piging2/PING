'use strict';
// LANE-D TEST-ONLY coordinator stand-in: registers a TEST objective,
// authorizes a TEST work order, records attempt 1 as RUNNING, spawns the TEST
// dispatcher (which spawns the mid-flight executor), persists the dispatcher
// pid durably (mirrors dispatchHermes ordering: spawn -> pid persisted),
// prints {objectiveId, woId, attemptId, dispatcherPid, driverPid} as JSON,
// then waits to be SIGKILLed.
const path = require('path');
const { spawn } = require('child_process');
const HERE = __dirname;
const CONTROL_DIR = '/home/nolan/worktrees/orca-autonomy/orca/control-loop';
const objRuntime = require(path.join(CONTROL_DIR, 'objective-runtime.js'));

async function main() {
  const dataRoot = process.argv[2];
  const marker = process.argv[3];
  const objective = objRuntime.registerObjective(dataRoot, 'core::system', 'laneD crash-window proof ' + Date.now(), {});
  const objectiveId = objective.objective_id;
  const dwo = objRuntime.authorizeWorkOrder(dataRoot, objectiveId, 'laneD-crash-task', {
    capability: 'test/physical-effect', agent_id: 'laneD-driver',
    namespace: 'core::system', task_brief_sha256: 'testonly',
  });
  const woId = dwo.work_order_id;
  const attempt = 1;
  const attemptId = objRuntime.deriveAttemptId(woId, attempt);
  objRuntime.updateWorkOrder(dataRoot, objectiveId, woId, {
    state: 'RUNNING', attempt_count: attempt, last_attempt_id: attemptId, dispatch_pid: null,
    attempt_history: [{ attempt_id: attemptId, attempt_number: attempt, started_at: new Date().toISOString(), outcome: 'DISPATCHING' }],
  });
  const disp = spawn(process.execPath, [path.join(HERE, 'dispatcher.js'), dataRoot, marker], { stdio: 'ignore' });
  objRuntime.updateWorkOrder(dataRoot, objectiveId, woId, { dispatch_pid: disp.pid });
  console.log(JSON.stringify({ objectiveId, woId, attemptId, dispatcherPid: disp.pid, driverPid: process.pid }));
  await new Promise(() => {}); // wait for SIGKILL
}
main().catch((e) => { console.error('SPAWN-FAIL', e && e.stack || e); process.exit(1); });
