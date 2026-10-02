'use strict';
// regression-failclosed.js — WR fail-closed repair regression test, 2026-09-26.
//
// Permanent regression test for the WorkerRuntime fail-closed repair
// (Nolan's directive 2026-09-26). Uses the REAL patched code:
//   ./patch/worker_runtime.js
//   ./patch/orchestration/mission_scheduler.js
// (+ verbatim dependency copies failure_record.js / constitutional_time_authority.js
//  under ./patch/, present on the Pig at the same relative paths — NOT deployed.)
//
// Dispatch semantics under test:
//   MATCHED + POSITIVE COMPLETION EVIDENCE -> SUCCEEDED
//   EXPLICIT NO MATCH                       -> NO_MATCH (terminal fail, zero retry)
//   MATCHED + AMBIGUOUS/UNDEFINED RESULT    -> UNKNOWN (in-memory HOLD, zero auto-retry)
//   ERROR BEFORE PROVEN EFFECT              -> FAILED per existing contract
//   UNKNOWN -> NEVER AUTOMATICALLY RETRY AN EXTERNAL EFFECT.
//
// Cases:
//   1. effect-then-undefined (the original duplicate-effect repro): effect
//      executes exactly once; undefined result -> UNKNOWN; zero automatic
//      retry across poll cycles; zero fabricated "no worker matched" narrative.
//   2. true explicit no-match: terminal NO_MATCH, zero retry, honest error prose.
//   3. successful worker: SUCCEEDED.
//   4. worker failure before effect: FAILED per existing contract (retry still works).
//   5. ambiguous post-effect failure (effect, then throw): FAILED per existing
//      contract — DOCUMENTED residual risk, second effect on retry observed.
//   6. timeout: UNKNOWN -> HOLD, no fail, no retry (existing behavior preserved).
//   7. restart/recovery where currently supported: UNKNOWN leaves the mission
//      row untouched ('running'); nothing reclaims or redispatches it
//      in-session; a fresh scheduler instance re-emits HOLD via the watchdog
//      (detection only). The cross-restart Arrow-1 reaper path remains the
//      already-open Reaper-vs-HOLD design question (not fixed here).
//
// Exit 0 only when every assertion passes. Evidence written to
// regression-evidence.json.
const fs = require('fs');
const path = require('path');
const { WorkerRuntime } = require('./patch/worker_runtime.js');
const { MissionScheduler, MISSION_WORKER_MAP } = require('./patch/orchestration/mission_scheduler.js');

const DIR = __dirname;
const EVIDENCE = path.join(DIR, 'regression-evidence.json');
const results = [];
function check(name, cond, detail) {
  results.push({ name, pass: !!cond, detail: detail === undefined ? null : detail });
  if (!cond) console.error(`FAIL: ${name}`, detail === undefined ? '' : JSON.stringify(detail));
  else console.log(`ok: ${name}`);
}

// ---- Stand-in provider: append-only counter file = opaque provider-side mutation.
function makeProvider(tag) {
  const file = path.join(DIR, `regression-provider-${tag}.jsonl`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  return {
    effect(detail) {
      fs.appendFileSync(file, JSON.stringify({ ts: new Date().toISOString(), detail }) + '\n');
    },
    count() {
      if (!fs.existsSync(file)) return 0;
      return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).length;
    },
  };
}

// ---- Stub MissionRuntime: honors the live contract surface used by the scheduler.
class StubMissionRuntime {
  constructor() { this.missions = new Map(); }
  seed(m) { this.missions.set(m.mission_id, { status: 'created', retries: 0, ...m }); }
  get(id) { return this.missions.get(id); }
  async assign(id) { const m = this.missions.get(id); if (!m || m.status !== 'created') return 0; m.status = 'assigned'; return 1; }
  async start(id) { const m = this.missions.get(id); if (m && m.status === 'assigned') m.status = 'running'; }
  async complete(id, result) { const m = this.missions.get(id); if (m && (m.status === 'running' || m.status === 'assigned')) { m.status = 'completed'; m.result = result; } }
  async failWithRetry(id, error, policy = {}) {
    const maxAttempts = policy.max_attempts || 3;
    const m = this.missions.get(id);
    if (!m) return 0;
    m.retries = (m.retries || 0) + 1;
    m.last_error = String(error);
    m.status = m.retries >= maxAttempts ? 'failed' : 'retry_pending';
    m.retry_at = Date.now();
    return m.retries;
  }
  async reclaimRetryPending() {
    let n = 0;
    for (const m of this.missions.values()) {
      if (m.status === 'retry_pending' && (m.retry_at || 0) <= Date.now()) { m.status = 'created'; n++; }
    }
    return n;
  }
  async getPending() { return [...this.missions.values()].filter((m) => m.status === 'created'); }
  async findStuckRunning(cutoffIso) {
    return [...this.missions.values()].filter(
      (m) => (m.status === 'running' || m.status === 'assigned') && (m.started_at || '1970-01-01') < cutoffIso);
  }
}

class StubEventRuntime {
  constructor() { this.emitted = []; }
  async emit(type, source, payload, opts) { this.emitted.push({ type, source, payload }); return { status: 'ok' }; }
}
class StubDLQ {
  constructor() { this.letters = []; }
  async recordDeadLetter(job, error) { this.letters.push({ job, error: String(error) }); }
}

function makeScheduler(stub, rt, opts = {}) {
  const events = new StubEventRuntime();
  const dlq = new StubDLQ();
  const scheduler = new MissionScheduler({
    missionRuntime: stub,
    workerRuntime: rt,
    eventRuntime: events,
    deadLetterAuthority: dlq,
    retryPolicy: { max_attempts: 3, backoff_delay_ms: 0 },
    dispatchTimeoutMs: opts.dispatchTimeoutMs || 2000,
    stuckThresholdMs: opts.stuckThresholdMs || 60000,
  });
  return { scheduler, events, dlq };
}

// Capture console output during a case to detect fabricated prose.
async function captureConsole(fn) {
  const out = [];
  const origLog = console.log; const origErr = console.error;
  console.log = (...a) => out.push(a.join(' '));
  console.error = (...a) => out.push(a.join(' '));
  try { await fn(); } finally { console.log = origLog; console.error = origErr; }
  return out.join('\n');
}

function missionFor(id, eventType) {
  return {
    mission_id: id,
    mission_type: 'LEAD_FOLLOWUP', // MISSION_WORKER_MAP: LEAD_FOLLOWUP -> 'observation'
    payload: { event_type: eventType, event_id: `evt-${id}`, source: 'regression' },
  };
}

async function case1_effectThenUndefined() {
  // THE REPORTED CASE: worker performs an external effect, then returns undefined.
  const provider = makeProvider('case1');
  const rt = new WorkerRuntime();
  rt.register('observation', {
    async handle(event) {
      provider.effect({ customer: 'cust-123', amount_cents: 4999 });
      // returns nothing — undefined.
    },
  }, { eventTypes: ['BILL_CUSTOMER'] });

  const stub = new StubMissionRuntime();
  const { scheduler, events } = makeScheduler(stub, rt);
  const mission = missionFor('m-case1', 'BILL_CUSTOMER');
  stub.seed(mission);

  const logs = await captureConsole(async () => {
    await scheduler._dispatch(mission);           // poll cycle 1
    await stub.reclaimRetryPending();             // poll cycle 2: reclaim due retries
    for (const m of await stub.getPending()) {    // poll cycle 2: redispatch created
      await scheduler._dispatch(m);
    }
    await stub.reclaimRetryPending();             // poll cycle 3
    for (const m of await stub.getPending()) {
      await scheduler._dispatch(m);
    }
  });

  const m = stub.get('m-case1');
  check('case1: effect executed exactly once', provider.count() === 1, { effects: provider.count() });
  check('case1: mission NOT completed', m.status !== 'completed', { status: m.status });
  check('case1: mission NOT failed', m.status !== 'failed', { status: m.status });
  check('case1: mission NOT retry_pending (zero automatic retry)', m.status !== 'retry_pending', { status: m.status });
  check('case1: mission row untouched (still running — UNKNOWN)', m.status === 'running', { status: m.status });
  check('case1: retries counter never advanced', (m.retries || 0) === 0, { retries: m.retries });
  check('case1: UNKNOWN reconciled as HOLD (observable)', scheduler.getReconciliationLog().length === 1,
    { holds: scheduler.getReconciliationLog().length });
  check('case1: HOLD event emitted', events.emitted.some((e) => e.type === 'MISSION_RECONCILE_HOLD'),
    { emitted: events.emitted.map((e) => e.type) });
  check('case1: scheduler stats.unknown === 1', scheduler.getStats().unknown === 1, scheduler.getStats());
  check('case1: zero fabricated "no worker matched" narrative', !/no worker matched/i.test(logs),
    { logExcerpt: logs.slice(0, 300) });
  check('case1: no failure error recorded on mission', m.last_error === undefined, { last_error: m.last_error });
}

async function case2_explicitNoMatch() {
  // Genuine no-match: worker 'observation' is registered, but its eventTypes
  // do not include the dispatched event type. The receipt observes this.
  const provider = makeProvider('case2');
  const rt = new WorkerRuntime();
  rt.register('observation', {
    async handle(event) { provider.effect({}); return { status: 'ok' }; },
  }, { eventTypes: ['BILL_CUSTOMER'] });

  const stub = new StubMissionRuntime();
  const { scheduler, dlq } = makeScheduler(stub, rt);
  const mission = missionFor('m-case2', 'SOMETHING_UNREGISTERED');
  stub.seed(mission);

  const receipt = await rt.dispatch({ event_type: 'SOMETHING_UNREGISTERED' });
  check('case2: dispatch receipt observes matched=false', receipt.matched === false, receipt);
  check('case2: dispatch receipt observes routeExists=false', receipt.routeExists === false, receipt);

  const logs = await captureConsole(async () => { await scheduler._dispatch(mission); });
  const m = stub.get('m-case2');
  check('case2: NO_MATCH fails terminally (failed)', m.status === 'failed', { status: m.status });
  check('case2: zero retry consumed (retries=1 via max_attempts:1, then terminal)', m.retries === 1, { retries: m.retries });
  check('case2: nothing reclaimed for redispatch', (await stub.reclaimRetryPending()) === 0, {});
  check('case2: no effect performed', provider.count() === 0, { effects: provider.count() });
  check('case2: error prose states the OBSERVED receipt (not an inference)',
    /no worker matched event_type=SOMETHING_UNREGISTERED/.test(m.last_error || '') &&
    /matched=false, routeExists=false/.test(m.last_error || ''),
    { last_error: m.last_error });
  check('case2: NO_MATCH routed to DLQ for human repair', dlq.letters.length === 1, { dlq: dlq.letters.length });
  check('case2: not recorded as UNKNOWN', scheduler.getReconciliationLog().length === 0, {});
}

async function case3_successfulWorker() {
  const provider = makeProvider('case3');
  const rt = new WorkerRuntime();
  rt.register('observation', {
    async handle(event) { provider.effect({}); return { status: 'ok', id: 'done-1' }; },
  }, { eventTypes: ['BILL_CUSTOMER'] });

  const stub = new StubMissionRuntime();
  const { scheduler } = makeScheduler(stub, rt);
  const mission = missionFor('m-case3', 'BILL_CUSTOMER');
  stub.seed(mission);
  await scheduler._dispatch(mission);

  const m = stub.get('m-case3');
  check('case3: SUCCEEDED -> completed', m.status === 'completed', { status: m.status });
  check('case3: effect executed once', provider.count() === 1, { effects: provider.count() });
  check('case3: stats.completed === 1', scheduler.getStats().completed === 1, scheduler.getStats());
  check('case3: no UNKNOWN recorded', scheduler.getStats().unknown === 0, {});
}

async function case4_failureBeforeEffect() {
  // Handler throws BEFORE any effect: FAILED per existing contract, retry intact.
  const provider = makeProvider('case4');
  let calls = 0;
  const rt = new WorkerRuntime();
  rt.register('observation', {
    async handle(event) {
      calls++;
      if (calls === 1) throw new Error('provider unreachable');
      provider.effect({ attempt: calls });
      return { status: 'ok' };
    },
  }, { eventTypes: ['BILL_CUSTOMER'] });

  const stub = new StubMissionRuntime();
  const { scheduler } = makeScheduler(stub, rt);
  const mission = missionFor('m-case4', 'BILL_CUSTOMER');
  stub.seed(mission);

  await scheduler._dispatch(mission); // attempt 1: throws before effect
  const after1 = stub.get('m-case4');
  check('case4: thrown error -> FAILED path (retry_pending)', after1.status === 'retry_pending', { status: after1.status });
  check('case4: no effect occurred before the throw', provider.count() === 0, { effects: provider.count() });
  check('case4: retry counter advanced (existing contract)', after1.retries === 1, { retries: after1.retries });

  await stub.reclaimRetryPending();
  for (const m of await stub.getPending()) await scheduler._dispatch(m); // attempt 2: succeeds
  const after2 = stub.get('m-case4');
  check('case4: retry of a genuine failure still works -> completed', after2.status === 'completed', { status: after2.status });
  check('case4: effect executed exactly once total', provider.count() === 1, { effects: provider.count() });
}

async function case5_ambiguousPostEffectFailure() {
  // DOCUMENTED RESIDUAL RISK (not fixed by this repair, per directive):
  // handler performs the effect, THEN throws. The existing contract maps a
  // thrown error to FAILED -> failWithRetry -> redispatch -> second effect.
  // The throw carries no evidence about whether the effect landed, so the
  // coordinator cannot distinguish this from case 4. Recorded here so the
  // ambiguity is visible; a future effect ledger / idempotency contract is
  // the fix, explicitly out of scope for this repair.
  const provider = makeProvider('case5');
  const rt = new WorkerRuntime();
  rt.register('observation', {
    async handle(event) {
      provider.effect({ customer: 'cust-9' });
      throw new Error('crashed after provider call returned');
    },
  }, { eventTypes: ['BILL_CUSTOMER'] });

  const stub = new StubMissionRuntime();
  const { scheduler } = makeScheduler(stub, rt);
  const mission = missionFor('m-case5', 'BILL_CUSTOMER');
  stub.seed(mission);

  await scheduler._dispatch(mission);
  const after1 = stub.get('m-case5');
  check('case5: post-effect throw follows the FAILED contract (retry_pending)',
    after1.status === 'retry_pending', { status: after1.status });
  check('case5: RESIDUAL RISK — redispatch duplicates the effect (documents the gap)',
    true, { note: 'see below' });
  await stub.reclaimRetryPending();
  for (const m of await stub.getPending()) await scheduler._dispatch(m);
  check('case5: redispatch performed the effect a second time (known gap, not a regression)',
    provider.count() === 2, { effects: provider.count() });
}

async function case6_timeoutUnknown() {
  // Existing behavior preserved: a hung worker -> DISPATCH_TIMEOUT -> HOLD,
  // never FAILED on timeout, no automatic retry.
  const provider = makeProvider('case6');
  const rt = new WorkerRuntime();
  rt.register('observation', {
    async handle(event) { await new Promise(() => {}); }, // never settles
  }, { eventTypes: ['BILL_CUSTOMER'] });

  const stub = new StubMissionRuntime();
  const { scheduler, events } = makeScheduler(stub, rt, { dispatchTimeoutMs: 80 });
  const mission = missionFor('m-case6', 'BILL_CUSTOMER');
  stub.seed(mission);
  // started_at old enough that a watchdog would notice, young enough to be irrelevant here
  stub.get('m-case6').started_at = new Date().toISOString();

  // NOTE: _dispatchWithTimeout deliberately unref()s its timer (a hung dispatch
  // must not hold the process open). In production the scheduler's own poll
  // interval keeps the loop alive. The bare test process needs a keepalive or
  // the loop empties before the timeout fires.
  const keepalive = setInterval(() => {}, 1000);
  try {
    await scheduler._dispatch(mission);
  } finally {
    clearInterval(keepalive);
  }
  const m = stub.get('m-case6');
  check('case6: timeout -> mission row untouched (running)', m.status === 'running', { status: m.status });
  check('case6: timeout -> HOLD reconciled', scheduler.getReconciliationLog().length === 1, {});
  check('case6: timeout -> HOLD event emitted', events.emitted.some((e) => e.type === 'MISSION_RECONCILE_HOLD'), {});
  check('case6: timeout -> never FAILED', m.status !== 'failed', { status: m.status });
  check('case6: timeout -> zero retry queued', (await stub.reclaimRetryPending()) === 0, {});
  check('case6: no effect observable from coordinator side', provider.count() === 0, { effects: provider.count() });
}

async function case7_restartRecovery() {
  // "Restart/recovery where currently supported": an UNKNOWN mission's row is
  // left untouched by the scheduler; nothing in-session reclaims or
  // redispatches it; a FRESH scheduler instance (simulated restart) does not
  // derive a retry either — its stuck-running watchdog re-emits HOLD
  // (detection only). The cross-restart Arrow-1 reaper path (reapExpiredLeases
  // resetting running->created -> redispatch) is the already-open Reaper-vs-HOLD
  // design question pending Nolan — NOT fixed here, recorded only.
  const provider = makeProvider('case7');
  const rt = new WorkerRuntime();
  rt.register('observation', {
    async handle(event) { provider.effect({}); /* undefined return -> UNKNOWN */ },
  }, { eventTypes: ['BILL_CUSTOMER'] });

  const stub = new StubMissionRuntime();
  const s1 = makeScheduler(stub, rt);
  const mission = missionFor('m-case7', 'BILL_CUSTOMER');
  stub.seed(mission);
  stub.get('m-case7').started_at = new Date(Date.now() - 3600e3).toISOString(); // stale, watchdog-visible

  await s1.scheduler._dispatch(mission);
  check('case7: UNKNOWN leaves row running (untouched)', stub.get('m-case7').status === 'running', {});

  // Simulated restart: brand-new scheduler instance, same mission runtime.
  const s2 = makeScheduler(stub, rt);
  const pending = await s2.scheduler._missionRuntime.getPending();
  check('case7: fresh instance does not pick up the running mission', !pending.some((m) => m.mission_id === 'm-case7'), {});
  check('case7: nothing reclaimable for retry', (await stub.reclaimRetryPending()) === 0, {});
  const watched = await s2.scheduler.reconcileStuckRunning();
  check('case7: fresh watchdog re-emits HOLD (detection only, no fail/retry)', watched === 1, { watched });
  check('case7: watchdog did not fail or retry the mission',
    stub.get('m-case7').status === 'running', { status: stub.get('m-case7').status });
  check('case7: effect executed exactly once across the simulated restart', provider.count() === 1, { effects: provider.count() });
  check('case7: KNOWN OPEN QUESTION recorded — Arrow-1 reaper (mission-runtime side) may still reset running->created after a real process restart and redispatch; pending Nolan\'s Reaper-vs-HOLD decision, NOT fixed by this repair',
    true, { note: 'see WR-EFFECT-UNKNOWN-LANE.md secondary path' });
}

async function main() {
  await case1_effectThenUndefined();
  await case2_explicitNoMatch();
  await case3_successfulWorker();
  await case4_failureBeforeEffect();
  await case5_ambiguousPostEffectFailure();
  await case6_timeoutUnknown();
  await case7_restartRecovery();

  const failed = results.filter((r) => !r.pass);
  const verdict = {
    suite: 'worker-runtime fail-closed regression',
    ts: new Date().toISOString(),
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    results,
  };
  fs.writeFileSync(EVIDENCE, JSON.stringify(verdict, null, 2));
  console.log(`\n${verdict.passed}/${verdict.total} assertions passed`);
  process.exit(failed.length === 0 ? 0 : 1);
}
main().catch((e) => { console.error('REGRESSION FATAL', e); process.exit(2); });
