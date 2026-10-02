// Driver 2a: cross-process determinism of all derived identities.
'use strict';
const R = require('/tmp/audit-u/orca/control-loop/objective-runtime.js');
const out = {
  objective: R.deriveObjectiveId({ namespace: 'orca', objectiveText: 'xproc intent', constraints: {} }),
  workorder: R.deriveWorkOrderId('WIP', 'task-1'),
  attempt: R.deriveAttemptId('WIP', 3),
  lockkey: R.coordinatorLockKey('WIP'),
};
console.log(JSON.stringify(out));
