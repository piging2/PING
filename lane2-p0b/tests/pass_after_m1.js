/**
 * LANE 2 (P0B) — PASS-AFTER + ADVERSARIAL + FAILURE-SEMANTICS tests for the
 * general M1 invariant.
 *
 * Axiom M1: DURABLE(event E) AND ROUTING_LAW(E) => mission M
 *           IMPLIES EVENTUALLY DURABLE(M).
 *
 * Runs against the PATCHED bridge (reconcileMissingMissions()).
 * Needs a scratch Postgres: set PING_TEST_PG_URL (connection string).
 * Skips cleanly when unset.
 *
 * Test barrier (same as fail-before): emit BEFORE any bridge subscription
 * exists == crash between UER persistence and handler dispatch.
 *
 * Exit 0: all assertions hold. Exit 1: any assertion failed. Exit 0+SKIP when
 * PING_TEST_PG_URL is unset.
 */
'use strict';

const { Pool } = require('pg');

const WT = '/home/nolan/worktrees/constitutional-convergence-authority-law';
const { UnifiedEventRuntime } = require(`${WT}/ping-runtime/events/unified_event_runtime.js`);
const { MissionRuntime } = require(`${WT}/ping-runtime/orchestration/mission_runtime.js`);
const {
  EventToMissionBridge,
  ROUTING_LAW_VERSION,
  classifyFailure,
} = require(`${WT}/ping-runtime/orchestration/event_to_mission_bridge.js`);

let passed = 0;
function assert(cond, msg) {
  if (!cond) { console.error(`ASSERT FAILED: ${msg}`); process.exit(1); }
  passed++;
  console.log(`  ok: ${msg}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function missionCount(pool, missionType, eventId) {
  const r = await pool.query(
    'SELECT COUNT(*)::int AS n FROM ping_missions WHERE mission_type = $1 AND payload->>\'event_id\' = $2',
    [missionType, eventId]
  );
  return r.rows[0].n;
}

async function main() {
  if (!process.env.PING_TEST_PG_URL) {
    console.log('SKIP: PING_TEST_PG_URL not set (needs a scratch Postgres)');
    process.exit(0);
  }
  const pool = new Pool({ connectionString: process.env.PING_TEST_PG_URL, connectionTimeoutMillis: 8000 });

  const uer = new UnifiedEventRuntime({ pool });
  await uer.initialize();
  const mr = new MissionRuntime({ pool, eventRuntime: null });
  await mr.initialize();
  await pool.query('TRUNCATE ping_events, ping_missions');

  // ── T0: pure unit checks (no DB) ──────────────────────────────────
  console.log('T0: failure classification (pure)');
  assert(classifyFailure({ code: 'ECONNREFUSED', message: 'x' }) === 'TRANSIENT_FAILURE', 'ECONNREFUSED -> TRANSIENT_FAILURE');
  assert(classifyFailure({ code: '23502', message: 'null value in column' }) === 'DETERMINISTIC_REJECTION', '23502 -> DETERMINISTIC_REJECTION');
  assert(classifyFailure({ message: 'weird' }) === 'UNKNOWN', 'unknown -> UNKNOWN');
  assert(typeof ROUTING_LAW_VERSION === 'string' && ROUTING_LAW_VERSION.length > 0, 'ROUTING_LAW_VERSION exported');

  const bridge = new EventToMissionBridge({ eventRuntime: uer, missionRuntime: mr });

  // ── T1: PASS-AFTER — 3 lost events recovered at start() ────────────
  console.log('T1: reconcile recovers never-derived missions');
  const lost = [];
  for (let i = 1; i <= 3; i++) {
    const r = await uer.emit('LEAD_CREATED', 't1-probe', { lead_id: `L-T1-${i}` });
    assert(r.status === 'ok', `event ${i} persisted`);
    lost.push(r.eventId);
  }
  for (const eid of lost) assert((await missionCount(pool, 'LEAD_FOLLOWUP', eid)) === 0, `mission missing before start (${eid.slice(0, 14)}…)`);
  const report = await bridge.start();
  assert(report.status === 'completed', 'report status completed');
  assert(report.routing_law_version === ROUTING_LAW_VERSION, `routing_version pinned (${ROUTING_LAW_VERSION})`);
  assert(report.events_scanned === 3, `events_scanned=3 (got ${report.events_scanned})`);
  assert(report.missions_created === 3, `missions_created=3 (got ${report.missions_created})`);
  assert(report.events_failed === 0, 'events_failed=0');
  for (const eid of lost) assert((await missionCount(pool, 'LEAD_FOLLOWUP', eid)) === 1, `exactly one mission derived (${eid.slice(0, 14)}…)`);

  // ── T2: idempotent — second reconcile is a no-op ──────────────────
  console.log('T2: reconcile is idempotent');
  const r2 = await bridge.reconcileMissingMissions();
  assert(r2.events_scanned === 0, `no candidates on second run (got ${r2.events_scanned})`);
  assert(r2.missions_created === 0, 'no missions created on second run');
  assert(r2.missions_existing === 3, `missions_existing=3 (got ${r2.missions_existing})`);
  const total = await pool.query("SELECT COUNT(*)::int AS n FROM ping_missions WHERE mission_type='LEAD_FOLLOWUP'");
  assert(total.rows[0].n === 3, 'still exactly 3 missions (no duplicates)');

  // ── T3: live path still works after start() ────────────────────────
  console.log('T3: live handler path unaffected');
  const live = await uer.emit('LEAD_CREATED', 't3-probe', { lead_id: 'L-T3-1' });
  assert((await missionCount(pool, 'LEAD_FOLLOWUP', live.eventId)) === 1, 'live event -> mission via handler');

  // ── T4: unmapped event types are ignored (no mission forgery) ─────
  console.log('T4: unmapped types never derive missions');
  const bogus = await uer.emit('TOTALLY_BOGUS_TYPE', 't4-probe', { x: 1 });
  assert(bogus.status === 'ok', 'bogus event persisted (UER accepted it)');
  const r4 = await bridge.reconcileMissingMissions();
  assert(r4.events_unroutable === 0, 'unroutable counter stays 0 (query only selects mapped types)');
  const bogusM = await pool.query("SELECT COUNT(*)::int AS n FROM ping_missions WHERE payload->>'event_id' = $1", [bogus.eventId]);
  assert(bogusM.rows[0].n === 0, 'no mission derived for unmapped type');

  // ── T5: namespace passes through untouched ────────────────────────
  console.log('T5: namespace passthrough');
  const ns = await uer.emit('CUSTOMER_CREATED', 't5-probe', { customer_id: 'C-1' }, { namespace: 'tenant::x' });
  await bridge.reconcileMissingMissions();
  const nsRow = await pool.query("SELECT payload->>'namespace' AS ns FROM ping_missions WHERE payload->>'event_id' = $1", [ns.eventId]);
  assert(nsRow.rows.length === 1 && nsRow.rows[0].ns === 'tenant::x', 'mission carries tenant::x (bridge never rewrites namespace)');

  // ── T6: failure semantics ─────────────────────────────────────────
  // Fresh UER with no subscriptions: the live path cannot mask the poison.
  console.log('T6: poison event is loud, never silently successful; others unaffected');
  const uer2 = new UnifiedEventRuntime({ pool });
  const bridge2 = new EventToMissionBridge({ eventRuntime: uer2, missionRuntime: mr });
  const realCreate = mr.create.bind(mr);
  const poison = await uer2.emit('LEAD_CREATED', 't6-probe', { lead_id: 'L-POISON' });
  const good = await uer2.emit('LEAD_CREATED', 't6-probe', { lead_id: 'L-GOOD' });
  assert(poison.status === 'ok' && good.status === 'ok', 'both events persisted with no handlers active');
  const derr = new Error('null value in column "mission_type" violates not-null constraint');
  derr.code = '23502';
  mr.create = async (type, payload, options) => {
    if (payload.event_id === poison.eventId) throw derr;
    return realCreate(type, payload, options);
  };
  const r6 = await bridge2.start(); // subscribes uer2, then reconciles
  mr.create = realCreate;
  assert(r6.events_failed === 1, `one failure reported (got ${r6.events_failed})`);
  assert(r6.failures[0].error_class === 'DETERMINISTIC_REJECTION', `classified DETERMINISTIC_REJECTION (got ${r6.failures[0].error_class})`);
  assert(r6.failures[0].event_id === poison.eventId, 'failure names the poison event');
  assert((await missionCount(pool, 'LEAD_FOLLOWUP', poison.eventId)) === 0, 'poison mission NOT marked repaired (still missing)');
  assert((await missionCount(pool, 'LEAD_FOLLOWUP', good.eventId)) === 1, 'good event derived in the same batch despite poison (no head-of-line block)');
  // transient is never marked repaired either; recovery works after the fault clears
  const terr = new Error('connect ECONNREFUSED 127.0.0.1:5432');
  terr.code = 'ECONNREFUSED';
  mr.create = async (type, payload, options) => {
    if (payload.event_id === poison.eventId) throw terr;
    return realCreate(type, payload, options);
  };
  const r6b = await bridge2.reconcileMissingMissions();
  mr.create = realCreate;
  assert(r6b.events_failed === 1, 'transient failure still reported (not swallowed)');
  assert(r6b.failures[0].error_class === 'TRANSIENT_FAILURE', 'transient classified TRANSIENT_FAILURE');
  assert((await missionCount(pool, 'LEAD_FOLLOWUP', poison.eventId)) === 0, 'transient failure NOT marked repaired');
  const r6c = await bridge2.reconcileMissingMissions();
  assert(r6c.events_failed === 0, 'no failures once the fault clears');
  assert((await missionCount(pool, 'LEAD_FOLLOWUP', poison.eventId)) === 1, 'poison event recovered on next reconcile');

  // ── T7: ADVERSARIAL — 10 concurrent reconciles, one mission each ──
  // NOTE: reconcileMissingMissions() scans ping_events directly; it does not
  // depend on which UER emitted. uer3 has no bridge subscribed, so these
  // events are pure never-derived candidates for all 10 racers.
  console.log('T7: 10 concurrent reconciles on the same candidate set');
  const uer3 = new UnifiedEventRuntime({ pool });
  const adv = [];
  for (let i = 1; i <= 2; i++) {
    const r = await uer3.emit('ESTIMATE_CREATED', 't7-probe', { estimate_id: `E-T7-${i}` });
    adv.push(r.eventId);
  }
  for (const eid of adv) assert((await missionCount(pool, 'ESTIMATE_PREPARE', eid)) === 0, 'candidate has no mission before the race');
  await Promise.all(Array.from({ length: 10 }, () => bridge.reconcileMissingMissions()));
  for (const eid of adv) {
    assert((await missionCount(pool, 'ESTIMATE_PREPARE', eid)) === 1, `exactly one mission after 10-way reconcile race (${eid.slice(0, 14)}…)`);
  }

  // ── T8: ADVERSARIAL — live handler racing reconcile ───────────────
  // The emit is NOT awaited: its live handler stays in-flight (50ms derive
  // delay) while reconcile scans the just-persisted event concurrently.
  // Whichever path wins, ON CONFLICT + deterministic identity collapse to
  // exactly one durable mission.
  console.log('T8: live handler racing reconcile');
  const origDerive = bridge._deriveMission.bind(bridge);
  bridge._deriveMission = async (event) => { await sleep(50); return origDerive(event); };
  for (let i = 1; i <= 3; i++) {
    const emitP = uer.emit('INVOICE_CREATED', 't8-probe', { invoice_id: `I-T8-${i}` });
    const recP = bridge.reconcileMissingMissions();
    const [emitRes] = await Promise.all([emitP, recP]);
    assert(emitRes.status === 'ok', `race emit ${i} accepted`);
    assert((await missionCount(pool, 'INVOICE_TRACK', emitRes.eventId)) === 1, `one durable mission after handler/reconcile race (${i})`);
  }
  bridge._deriveMission = origDerive;

  console.log(`\nPASS-AFTER PROVEN: ${passed} assertions hold. M1 closed for the bridge boundary (A0, no migration).`);
  await pool.end();
  process.exit(0);
}

main().catch((e) => { console.error('HARNESS ERROR:', e && e.message); process.exit(2); });
