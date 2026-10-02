/* Phase 12 leg 5: retry-then-success + bounded dead-letter rerun.
 * Real production classes from the live container tree (/app/...),
 * live Postgres, disposable probe mission rows, stub workers.
 * No eventRuntime is passed, so the harness emits zero canonical events.
 * All reapers are scoped to mission_type PHASE12_RETRY_PROBE so live rows
 * are never touched. The live gateway scheduler skips unmapped mission
 * types without state change (verified in source).
 * DB credentials come from the container's own env (process memory only).
 */
const { Pool } = require('pg');
const { MissionRuntime } = require('/app/ping-runtime/orchestration/mission_runtime.js');
const { MissionScheduler } = require('/app/ping-runtime/orchestration/mission_scheduler.js');
const { WorkerRuntime } = require('/app/ping-runtime/workers/worker_runtime.js');
const { DeadLetterAuthority } = require('/app/gateway/dead_letter_authority.js');

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  max: 3,
});
const PROBE = 'PHASE12_RETRY_PROBE';
const WORKER = 'phase12-probe-worker';

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`[PASS] ${name} ${detail || ''}`); }
  else { fail++; console.log(`[FAIL] ${name} ${detail || ''}`); }
}

class ScopedRuntime extends MissionRuntime {
  async getPending(limit = 10) {
    const rows = await super.getPending(limit * 5);
    return rows.filter(r => r.mission_type === PROBE).slice(0, limit);
  }
  async reclaimRetryPending() {
    const result = await this._pool.query(
      `UPDATE ping_missions
       SET status = 'created', assigned_to = NULL, lease_until = NULL,
           claimed_at = NULL, retry_at = NULL
       WHERE status = 'retry_pending' AND retry_at IS NOT NULL
         AND retry_at <= NOW() AND mission_type = $1
       RETURNING mission_id`, [PROBE]);
    return result.rowCount || 0;
  }
  async reapExpiredLeases() {
    const result = await this._pool.query(
      `UPDATE ping_missions
       SET status = 'created', assigned_to = NULL, lease_until = NULL,
           claimed_at = NULL, retry_at = NOW()
       WHERE status IN ('running', 'assigned')
         AND lease_until IS NOT NULL AND lease_until < NOW()
         AND mission_type = $1
       RETURNING mission_id`, [PROBE]);
    return result.rowCount || 0;
  }
}

// Stub workers: fail-once and always-fail. Track handle() calls per mission.
const calls = {};
class StubWorker {
  constructor(mode) { this.mode = mode; this.calls = 0; }
  async handle(event) {
    const mid = event.mission_id || '?';
    calls[mid] = (calls[mid] || 0) + 1;
    this.calls++;
    if (this.mode === 'always-fail') throw new Error('phase12 probe: always fails');
    if (this.mode === 'fail-once' && this.calls === 1) throw new Error('phase12 probe: attempt 1 boom');
    return { status: 'ok', probe: true };
  }
}

// Probe scheduler: real _poll/_failMission arrows, _dispatch mirrored from the
// live implementation but routed to the registered stub worker (PROBE type is
// intentionally absent from the live MISSION_WORKER_MAP so the live gateway
// scheduler skips these rows without state change).
class ProbeScheduler extends MissionScheduler {
  async _dispatch(mission) {
    const stats = this._workerRuntime.getStats();
    if (!stats.workers[WORKER]) { this._stats.skipped++; return; }
    this._processing.add(mission.mission_id);
    try {
      await this._missionRuntime.assign(mission.mission_id, WORKER);
      await this._missionRuntime.start(mission.mission_id);
      const payload = typeof mission.payload === 'string'
        ? JSON.parse(mission.payload) : (mission.payload || {});
      const event = {
        event_id: payload.event_id || mission.mission_id,
        event_type: payload.event_type || mission.mission_type,
        source: payload.source || 'mission-scheduler',
        namespace: payload.namespace,
        mission_id: mission.mission_id,
        payload: payload.payload || payload,
        metadata: { mission_type: mission.mission_type, correlation_id: payload.correlation_id || mission.mission_id },
      };
      let dispatchResult;
      try {
        dispatchResult = await this._workerRuntime.dispatch(event);
      } catch (err) {
        await this._failMission(mission, err.message);
        return;
      }
      this._stats.dispatched++;
      if (dispatchResult && dispatchResult.status === 'failed') {
        await this._failMission(mission, dispatchResult.error || 'worker returned failed status');
      } else if (!dispatchResult) {
        this._stats.skipped++;
        await this._failMission(mission, `no worker matched event_type=${event.event_type}`);
      } else {
        await this._missionRuntime.complete(mission.mission_id, { worker: WORKER });
        this._stats.completed++;
      }
    } catch (err) {
      await this._failMission(mission, err.message);
    } finally {
      this._processing.delete(mission.mission_id);
    }
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function mrow(id) {
  const r = await pool.query(
    `SELECT status, retries FROM ping_missions WHERE mission_id = $1`, [id]);
  return r.rows[0] || null;
}
async function dlqCount(id) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS c FROM repository_dead_letters WHERE mission_id = $1`, [id]);
  return r.rows[0].c;
}

(async () => {
  const runtime = new ScopedRuntime({ pool, eventRuntime: null });
  const workerRuntime = new WorkerRuntime({ pool });
  const failOnce = new StubWorker('fail-once');
  const alwaysFail = new StubWorker('always-fail');
  // NOTE: do NOT register failOnce/alwaysFail directly. WorkerRuntime.dispatch
  // fans out to EVERY registered worker whose eventTypes match, so direct
  // registration would double-handle each event. Only the alias is registered;
  // its underlying worker object is swapped per mission in _dispatch.
  workerRuntime.start();
  const dlq = new DeadLetterAuthority(pool);
  await dlq.initialize();
  const sched = new ProbeScheduler({
    missionRuntime: runtime,
    workerRuntime,
    eventRuntime: null,
    deadLetterAuthority: dlq,
    retryPolicy: { max_attempts: 2, backoff_delay_ms: 2000 },
    pollIntervalMs: 1000000,
    maxConcurrent: 3,
  });

  // Patch dispatch routing: pick stub worker by payload.probe
  const origDispatch = sched._dispatch.bind(sched);
  sched._dispatch = async (mission) => {
    const payload = typeof mission.payload === 'string' ? JSON.parse(mission.payload) : (mission.payload || {});
    const name = payload.probe === 'always-fail' ? 'phase12-alwaysfail' : 'phase12-failonce';
    // temporarily re-point WORKER name used in _dispatch via stats alias
    const s = workerRuntime.getStats();
    // _dispatch checks stats.workers[WORKER]; register alias entries
    if (!s.workers[WORKER]) {
      workerRuntime.register(WORKER, payload.probe === 'always-fail' ? alwaysFail : failOnce, { eventTypes: [PROBE] });
    } else {
      // swap the underlying worker object for this dispatch
      workerRuntime._workers.get(WORKER).worker = payload.probe === 'always-fail' ? alwaysFail : failOnce;
    }
    return origDispatch(mission);
  };

  // ---- Test A: fail-once-then-succeed ----
  const idA = await runtime.create(PROBE,
    { event_id: 'phase12-retry-A', event_type: PROBE, probe: 'fail-once',
      correlation_id: 'phase12-2026-09-17' }, { priority: 1 });
  let r = await mrow(idA);
  check('A created', r && r.status === 'created', `id=${idA}`);
  await sched._poll();
  r = await mrow(idA);
  check('A attempt1 retry_pending', r && r.status === 'retry_pending', `status=${r && r.status}`);
  check('A retries=1', r && r.retries === 1, `retries=${r && r.retries}`);
  check('A worker called once', calls[idA] === 1, `calls=${calls[idA]}`);
  await sleep(2600);
  await sched._poll(); // Arrow 1b reclaims, then re-dispatch succeeds
  r = await mrow(idA);
  check('A completed', r && r.status === 'completed', `status=${r && r.status}`);
  check('A retries still 1 (attempt 2)', r && r.retries === 1, `retries=${r && r.retries}`);
  check('A worker called twice total', calls[idA] === 2, `calls=${calls[idA]}`);

  // ---- Test B: bounded dead-letter ----
  const idB = await runtime.create(PROBE,
    { event_id: 'phase12-retry-B', event_type: PROBE, probe: 'always-fail',
      correlation_id: 'phase12-2026-09-17' }, { priority: 1 });
  await sched._poll();
  r = await mrow(idB);
  check('B attempt1 retry_pending', r && r.status === 'retry_pending', `status=${r && r.status}`);
  check('B retries=1', r && r.retries === 1, `retries=${r && r.retries}`);
  await sleep(2600);
  await sched._poll(); // attempt 2 fails -> exhaustion -> failed + DLQ
  r = await mrow(idB);
  check('B terminal failed', r && r.status === 'failed', `status=${r && r.status}`);
  check('B retries=2 (max_attempts)', r && r.retries === 2, `retries=${r && r.retries}`);
  check('B worker called exactly twice', calls[idB] === 2, `calls=${calls[idB]}`);
  let d = await dlqCount(idB);
  check('B exactly one dead-letter record', d === 1, `dlq=${d}`);
  // three further polls: no third attempt, no extra DLQ
  for (let i = 0; i < 3; i++) { await sleep(1200); await sched._poll(); }
  r = await mrow(idB);
  d = await dlqCount(idB);
  check('B no third attempt', calls[idB] === 2, `calls=${calls[idB]}`);
  check('B still failed', r && r.status === 'failed', `status=${r && r.status}`);
  check('B dlq still exactly one', d === 1, `dlq=${d}`);

  // ---- cleanup: remove disposable probe rows ----
  await pool.query(`DELETE FROM repository_dead_letters WHERE mission_id IN ($1, $2)`, [idA, idB]);
  await pool.query(`DELETE FROM ping_missions WHERE mission_type = $1`, [PROBE]);
  const left = await pool.query(`SELECT COUNT(*)::int AS c FROM ping_missions WHERE mission_type = $1`, [PROBE]);
  check('cleanup: no probe missions remain', left.rows[0].c === 0, `left=${left.rows[0].c}`);

  console.log(`RETRY DONE pass=${pass} fail=${fail}`);
  await pool.end();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS FATAL', e.message); process.exit(2); });
