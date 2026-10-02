'use strict';
// Boot smoke: every module on the gateway boot graph that touches the replay
// path must load, and the provider must construct.
const { KernelReplayExecutionProvider } = require('/home/nolan/worktrees/constitutional-convergence/gateway/kernel_replay_execution_provider.js');
const comp = require('/home/nolan/worktrees/constitutional-convergence/gateway/bootstrap/composition/core_event_spine.js');
const rt = require('/home/nolan/worktrees/constitutional-convergence/gateway/constitutional_runtime.js');
const cw = require('/home/nolan/worktrees/constitutional-convergence/ping-runtime/workers/canonical_workers.js');

const p = new KernelReplayExecutionProvider();
console.log('boot-path requires OK:',
  typeof KernelReplayExecutionProvider,
  Object.keys(comp).length > 0 ? 'composition-loaded' : 'composition-empty',
  typeof rt.ConstitutionalRuntime,
  typeof cw.ReplayWorker,
  JSON.stringify(p.getStats()));
