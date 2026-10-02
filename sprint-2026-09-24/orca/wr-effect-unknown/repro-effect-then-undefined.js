'use strict';
// repro-effect-then-undefined.js — WR effect-then-undefined lane, 2026-09-26.
// Reproduces the reported case against the REAL dispatch code path:
//
//   handler performs an external effect, then returns `undefined`
//   -> WorkerRuntime.dispatch() returns undefined (passes the handler's
//      raw return through; see live_worker_runtime.verbatim.js lines 71/87/105)
//   -> MissionScheduler branch (b) (live_mission_scheduler.verbatim.js
//      lines 305-320) reads `!dispatchResult` as "no worker matched"
//   -> _failMission -> failWithRetry -> retry_pending
//   -> reclaimRetryPending (Arrow 2) -> redispatch -> SECOND EFFECT
//
// The "external effect" is a stand-in: an append-only counter file playing
// the role of a provider-side mutation (charge posted, post published,
// message sent). No real external calls are made.
const fs = require('fs');
const path = require('path');
const { WorkerRuntime } = require('./live_worker_runtime.verbatim.js');

const DIR = __dirname;
const COUNTER = path.join(DIR, 'evidence-provider-effects.jsonl');
const LOG = [];

// ---- Stand-in provider: append-only, exactly what a real provider-side
// mutation looks like to the coordinator (opaque, not queryable by the
// scheduler). One line per physical effect.
function providerEffect(label, detail) {
  fs.appendFileSync(COUNTER, JSON.stringify({ ts: new Date().toISOString(), label, detail }) + '\n');
}
function providerEffectCount() {
  if (!fs.existsSync(COUNTER)) return 0;
  return fs.readFileSync(COUNTER, 'utf8').trim().split('\n').filter(Boolean).length;
}

// ---- Fake MissionRuntime: mirrors the live scheduler's contract surface
// (assign/complete/failWithRetry/reclaimRetryPending). Attempts counted;
// retry_pending -> created after backoff; max_attempts=3.
class FakeMissionRuntime {
  constructor() { this.missions = new Map(); }
  seed(m) { this.missions.set(m.mission_id, { status: 'created', retries: 0, ...m }); }
  async assign(id) { const m = this.missions.get(id); if (!m || m.status !== 'created') return 0; m.status = 'assigned'; return 1; }
  async start(id) { const m = this.missions.get(id); if (m && m.status === 'assigned') m.status = 'running'; }
  async complete(id, result) { const m = this.missions.get(id); if (m && (m.status === 'running' || m.status === 'assigned')) { m.status = 'completed'; m.result = result; } }
  async failWithRetry(id, error, policy = { max_attempts: 3 }) {
    const m = this.missions.get(id);
    if (!m) return 0;
    m.retries = (m.retries || 0) + 1;
    m.last_error = String(error);
    m.status = m.retries >= (policy.max_attempts || 3) ? 'failed' : 'retry_pending';
    m.retry_at = Date.now(); // backoff already elapsed for the repro
    return m.retries;
  }
  async reclaimRetryPending() {
    let n = 0;
    for (const m of this.missions.values()) {
      if (m.status === 'retry_pending' && (m.retry_at || 0) <= Date.now()) { m.status = 'created'; n++; }
    }
    return n;
  }
  status(id) { return this.missions.get(id).status; }
  lastError(id) { return this.missions.get(id).last_error; }
}

// ---- Scheduler dispatch core: VERBATIM logic of the live scheduler's
// three-outcome branch (live_mission_scheduler.verbatim.js lines 305-320),
// minus the timeout wrapper and claim fencing (not relevant to the case).
async function schedulerDispatchOnce({ missionRuntime, workerRuntime, stats }, mission, event) {
  // W: worker registered for the mission type (live lines 235-250).
  const claimed = await missionRuntime.assign(mission.mission_id, 'effect-worker');
  if (claimed < 1) { LOG.push('claim lost, standing down'); return; }
  await missionRuntime.start(mission.mission_id);

  const dispatchResult = await workerRuntime.dispatch(event); // live line 302
  stats.dispatched++;

  // VERBATIM three-outcome branch, live lines 305-320.
  if (dispatchResult && dispatchResult.status === 'failed') {
    await failMission(missionRuntime, mission, stats, dispatchResult.error || 'worker returned failed status');
  } else if (!dispatchResult) {
    // (b) dispatchResult is null/undefined -> "no worker matched" (live line 308).
    stats.skipped++;
    await failMission(missionRuntime, mission, stats, `no worker matched event_type=${event.event_type}`);
  } else {
    await missionRuntime.complete(mission.mission_id, { worker: 'effect-worker' });
    stats.completed++;
  }
}
async function failMission(missionRuntime, mission, stats, error) {
  const retries = await missionRuntime.failWithRetry(mission.mission_id, error, { max_attempts: 3 });
  LOG.push(`failWithRetry: retries=${retries} error="${error}"`);
  stats.failed++;
}

async function main() {
  if (fs.existsSync(COUNTER)) fs.unlinkSync(COUNTER);

  const rt = new WorkerRuntime();

  // THE REPORTED CASE: a real worker whose handle() performs an external
  // effect and then returns `undefined` (an async function with no return
  // statement, or one that just does work). This is ordinary JS.
  rt.register('effect-worker', {
    async handle(event) {
      providerEffect('BILL_CUSTOMER', { customer: 'cust-123', amount_cents: 4999, attempt: event._attempt });
      // ...and returns nothing. undefined.
    },
  }, { eventTypes: ['BILL_CUSTOMER'] });

  const missionRuntime = new FakeMissionRuntime();
  const stats = { dispatched: 0, completed: 0, skipped: 0, failed: 0 };
  const mission = { mission_id: 'm-effect-001', mission_type: 'BILL_CUSTOMER' };
  missionRuntime.seed(mission);

  // Poll cycle 1 (Arrow 0): dispatch the mission.
  await schedulerDispatchOnce({ missionRuntime, workerRuntime: rt, stats }, mission, { event_type: 'BILL_CUSTOMER', _attempt: 1 });
  const after1 = { effects: providerEffectCount(), dispatchReturned: 'undefined (falsy)', status: missionRuntime.status('m-effect-001'), error: missionRuntime.lastError('m-effect-001') };

  // Poll cycle 2 (Arrow 2): reclaim due retries, redispatch.
  const reclaimed = await missionRuntime.reclaimRetryPending();
  if (reclaimed > 0) {
    await schedulerDispatchOnce({ missionRuntime, workerRuntime: rt, stats }, mission, { event_type: 'BILL_CUSTOMER', _attempt: 2 });
  }
  const after2 = { effects: providerEffectCount(), status: missionRuntime.status('m-effect-001') };

  // Observation-gap experiment: an UNREGISTERED event type. Same falsy return.
  const unmatchedReturn = await rt.dispatch({ event_type: 'SOMETHING_UNREGISTERED' });

  const verdict = {
    case: 'handler performs external effect, then returns undefined',
    attempt1: after1,
    attempt2: after2,
    observation_gap: {
      matched_worker_returned_undefined: true,
      unmatched_event_type_return: unmatchedReturn,
      distinguishable_by_scheduler: false,
      note: 'dispatch() returns the handler raw return (live_worker_runtime.verbatim.js:87/105). Both "no worker matched" (null) and "worker ran, returned undefined" are falsy; `!dispatchResult` cannot tell them apart.',
    },
    fabricated_prose: {
      recorded_error: after1.error,
      truth: 'a worker DID match and DID perform the external effect',
      claim_in_code: 'live_mission_scheduler.verbatim.js line 318',
    },
    duplicate_effect: after2.effects === 2,
    evidence_file: COUNTER,
    log: LOG,
  };
  console.log(JSON.stringify(verdict, null, 2));
  fs.writeFileSync(path.join(DIR, 'evidence-verdict.json'), JSON.stringify(verdict, null, 2));
  process.exit(after2.effects === 2 ? 0 : 1);
}
main().catch((e) => { console.error('REPRO FATAL', e); process.exit(2); });
