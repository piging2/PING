/**
 * LANE 2 (P0B) — FAIL-BEFORE test for the general M1 invariant.
 *
 * Axiom M1: DURABLE(event E) AND ROUTING_LAW(E) => mission M IMPLIES EVENTUALLY DURABLE(M).
 *
 * This test runs against the PRE-patch bridge (git HEAD, no reconcile()).
 * It proves the violation independent of boot order:
 *   1. Persist an event through UER.
 *   2. Prevent/skip its handler execution (deterministic test barrier:
 *      emit BEFORE any bridge subscription exists, equivalent to a crash
 *      between persistence and handler dispatch — in both cases the handler
 *      never observes the durable event).
 *   3. Let the system settle, then ASSERT:
 *      - event IS durable in ping_events
 *      - mission M is MISSING
 *      - the current bridge.start() never recovers it (no recovery path)
 *
 * Exit 0 + "FAIL-BEFORE PROVEN" means the defect is real.
 * Any failed assertion exits 1.
 */
'use strict';

const { Pool } = require('pg');

const WT = '/home/nolan/worktrees/constitutional-convergence-authority-law';
const { UnifiedEventRuntime } = require(`${WT}/ping-runtime/events/unified_event_runtime.js`);
const { MissionRuntime } = require(`${WT}/ping-runtime/orchestration/mission_runtime.js`);
const { EventToMissionBridge } = require(`${WT}/ping-runtime/orchestration/event_to_mission_bridge.js`);

function assert(cond, msg) {
  if (!cond) { console.error(`ASSERT FAILED: ${msg}`); process.exit(1); }
  console.log(`  ok: ${msg}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const pool = new Pool({
    host: '127.0.0.1', port: 15442, user: 'p0b',
    password: process.env.P0B_PW, database: 'p0b_ping',
    connectionTimeoutMillis: 8000,
  });

  const uer = new UnifiedEventRuntime({ pool }); // no validator/governance: registry check skipped
  await uer.initialize();
  const mr = new MissionRuntime({ pool, eventRuntime: null });
  await mr.initialize();

  console.log('Step 1: persist an event with NO bridge subscription active (test barrier)');
  const res = await uer.emit('LEAD_CREATED', 'fail-before-probe', { lead_id: 'L-FAIL-1' });
  assert(res.status === 'ok', `emit accepted (${res.eventId})`);

  console.log('Step 2: assert the defect');
  const ev = await pool.query('SELECT event_id, event_type, sequence FROM ping_events WHERE event_id = $1', [res.eventId]);
  assert(ev.rows.length === 1, 'event IS durable in ping_events');
  const m0 = await pool.query(
    "SELECT mission_id FROM ping_missions WHERE mission_type = 'LEAD_FOLLOWUP' AND payload->>'event_id' = $1",
    [res.eventId]
  );
  assert(m0.rows.length === 0, 'mission M is MISSING (handler never ran)');

  console.log('Step 3: run the CURRENT bridge.start() and let the system settle');
  const bridge = new EventToMissionBridge({ eventRuntime: uer, missionRuntime: mr });
  assert(typeof bridge.reconcileMissingMissions !== 'function', 'pre-patch bridge exposes no reconcile path');
  bridge.start();
  await sleep(1500);

  const m1 = await pool.query(
    "SELECT mission_id FROM ping_missions WHERE mission_type = 'LEAD_FOLLOWUP' AND payload->>'event_id' = $1",
    [res.eventId]
  );
  assert(m1.rows.length === 0, 'current behavior NEVER recovers the missed mission');

  console.log('\nFAIL-BEFORE PROVEN: durable event E with ROUTING_LAW(E)=>LEAD_FOLLOWUP, mission permanently lost.');
  await pool.end();
  process.exit(0);
}

main().catch((e) => { console.error('HARNESS ERROR:', e.message); process.exit(2); });
