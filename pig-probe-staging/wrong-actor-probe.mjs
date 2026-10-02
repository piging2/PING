// T02 wrong-actor probe (Reader R1 archaeology, falsifier reproduction).
// Scenario: correct tenant + valid W5 capability grant issued to principal
// 'observation', but the mission's event_type routes to worker 'campaign'.
// Expected once T02 lands: DENY. Current (pre-T02): AUTHORIZED (defect).
// READ-ONLY: loads the lane-ag checkout, mutates nothing.
import Module from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AG = '/home/nolan/ping-worktrees/verify-ag/ping-runtime/orchestration';

function loadCommonJs(filename) {
  const loaded = new Module(filename);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(dirname(filename));
  Module._cache[filename] = loaded;
  loaded._compile(readFileSync(filename, 'utf8'), filename);
  return loaded.exports;
}

const { MissionScheduler } = loadCommonJs(join(AG, 'mission_scheduler.js'));
const { WorkerRuntime } = loadCommonJs(join(AG, '..', 'workers', 'worker_runtime.js'));

const mrStub = {
  assign: async () => 1,
  start: async () => {},
  complete: async () => {},
  failWithRetry: async () => 1,
  markHold: async () => 1,
  getMission: async () => null,
};

const rt = new WorkerRuntime();
let campaignRan = false;
let observationRan = false;
rt.register('observation', { handle: async () => { observationRan = true; return { status: 'ok' }; } }, { eventTypes: ['DOCUMENT_IMPORTED'] });
rt.register('campaign', { handle: async () => { campaignRan = true; return { status: 'ok' }; } }, { eventTypes: ['CAMPAIGN_SEND'] });

const scheduler = new MissionScheduler({
  missionRuntime: mrStub,
  workerRuntime: rt,
  tenantId: 'tenant-a',
  dispatchTimeoutMs: 5000,
});

const failures = [];
scheduler._failMission = async (mission, error) => { failures.push({ mission: mission.mission_id, error: String(error) }); };

// Grant is VALID for tenant-a / customer.lookup / principal 'observation'...
// ...but the mission's event_type routes to worker 'campaign'.
const mission = {
  mission_id: 'm-wrongactor-probe',
  mission_type: 'DOCUMENT_IMPORT', // MISSION_WORKER_MAP -> 'observation' (guard passes)
  tenant_id: 'tenant-a',
  payload: {
    event_type: 'CAMPAIGN_SEND', // WorkerRuntime routes to 'campaign'
    requires_capability: 'customer.lookup',
    grant_purpose: 'customer_service',
    capability_grant: {
      capability: 'customer.lookup',
      principal: 'observation',
      tenant: 'tenant-a',
      purpose: 'customer_service',
      scope: { customer_id: 'c-1' },
      expiry: new Date(Date.now() + 3600000).toISOString(),
      data_class: 'TASK_EPHEMERAL',
    },
  },
};

await scheduler._dispatch(mission);

console.log(JSON.stringify({
  campaign_worker_ran: campaignRan,
  observation_worker_ran: observationRan,
  denied: failures.length > 0,
  deny_reason: failures.length ? failures[0].error : null,
}, null, 1));

if (campaignRan && failures.length === 0) {
  console.log('VERDICT: WRONG-ACTOR AUTHORIZED (T02 defect present: principal never enforced)');
} else if (failures.length > 0) {
  console.log('VERDICT: DENIED (T02 fix active)');
} else {
  console.log('VERDICT: INCONCLUSIVE');
}
