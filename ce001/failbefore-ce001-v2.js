// CE-001 FAIL-BEFORE — v2 code (constitutional-convergence-v2), read-only staging.
// Proves the completion-identity defects against production code paths on scratch PG.
// Exit 0 = all expected shapes observed. Run with the Pig portable node.
'use strict';
const WT = 'C:/Users/nolan/ce001-scratch';
const { Pool } = require('C:/Users/nolan/PING/gateway/node_modules/pg');
const { UnifiedEventRuntime } = require(WT + '/ping-runtime/events/unified_event_runtime.js');
const { MissionRuntime } = require(WT + '/ping-runtime/orchestration/mission_runtime.js');

const PORT = 15445;
const admin = new Pool({ host: '127.0.0.1', port: PORT, database: 'postgres', user: 'postgres', password: 'postgres' });

async function main() {
  const db = 'scratch_ce001';
  await admin.query(`DROP DATABASE IF EXISTS "${db}"`).catch(() => {});
  await admin.query(`CREATE DATABASE "${db}"`);
  const pool = new Pool({ host: '127.0.0.1', port: PORT, database: db, user: 'postgres', password: 'postgres' });

  const uer = new UnifiedEventRuntime({ pool });
  await uer.initialize();
  const mr = new MissionRuntime({ pool, eventRuntime: uer });
  await mr.initialize();

  let mismatches = 0;
  const verdict = (name, expected, actual, detail) => {
    const ok = expected === actual;
    console.log(`${ok ? 'OK' : 'MISMATCH'} ${name} (expected-reproduced=${expected}): ${detail}`);
    if (!ok) mismatches++;
  };
  const eventCount = async (m) => (await pool.query(
    `SELECT count(*)::int c FROM ping_events WHERE event_type='MISSION_COMPLETED' AND payload->>'missionId'=$1`, [m])).rows[0].c;
  const eventIds = async (m) => (await pool.query(
    `SELECT event_id FROM ping_events WHERE event_type='MISSION_COMPLETED' AND payload->>'missionId'=$1 ORDER BY event_id`, [m])).rows.map(r => r.event_id);
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // ---- F1: same logical completion, two complete() calls -> two event_ids ----
  const m1 = 'm_ce001_f1';
  await pool.query(`INSERT INTO ping_missions (mission_id, mission_type, status, started_at) VALUES ($1,'T','running', NOW() - interval '2 seconds')`, [m1]);
  await mr.complete(m1, { worker: 'w' });
  await sleep(60);
  await pool.query(`UPDATE ping_missions SET status='running', started_at=NOW() WHERE mission_id=$1`, [m1]);
  await mr.complete(m1, { worker: 'w' });
  const ids1 = await eventIds(m1);
  verdict('F1-nondeterministic-completion-identity', true, ids1.length === 2 && ids1[0] !== ids1[1],
    `same logical completion minted ${ids1.length} distinct event_id(s): ${ids1.join(', ')}`);

  // ---- F1b control: byte-identical re-emit reaches the dedup machinery ----
  const before = await eventCount(m1);
  const px = { missionId: m1, result: { worker: 'w' }, duration_ms: 1200 };
  const e1 = await uer.emit('MISSION_COMPLETED', 'mission-runtime', JSON.parse(JSON.stringify(px)));
  const e2 = await uer.emit('MISSION_COMPLETED', 'mission-runtime', JSON.parse(JSON.stringify(px)));
  const after = await eventCount(m1);
  verdict('F1b-dedup-machinery-works-when-preimage-matches', true,
    e1.status === 'ok' && e2.status === 'ok' && e1.eventId === e2.eventId && after === before + 1,
    `identical re-emit: same eventId=${e1.eventId === e2.eventId}, rows ${before} -> ${after}`);

  // ---- F2: event-exists / row-running, then reaper recycles into re-execution ----
  const m2 = 'm_ce001_f2';
  await pool.query(
    `INSERT INTO ping_missions (mission_id, mission_type, status, started_at, lease_until) VALUES ($1,'T','running', NOW() - interval '1 hour', NOW() - interval '30 minutes')`, [m2]);
  const ec = await uer.emit('MISSION_COMPLETED', 'mission-runtime', { missionId: m2, result: { worker: 'w' }, duration_ms: 42 });
  const st = await pool.query(`SELECT status FROM ping_missions WHERE mission_id=$1`, [m2]);
  verdict('F2-event-exists-row-running', true,
    ec.status === 'ok' && st.rows[0].status === 'running' && (await eventCount(m2)) === 1,
    `emit accepted, row '${st.rows[0].status}', 1 MISSION_COMPLETED`);
  await mr.reapExpiredLeases();
  const st2 = await pool.query(`SELECT status FROM ping_missions WHERE mission_id=$1`, [m2]);
  // scheduler re-claims the recycled mission and the worker re-executes + completes
  await pool.query(`UPDATE ping_missions SET status='running', started_at=NOW(), lease_until=NOW() + interval '5 minutes' WHERE mission_id=$1`, [m2]);
  await sleep(60);
  await mr.complete(m2, { worker: 'w' });
  const c2 = await eventCount(m2);
  verdict('F2b-reexecution-mints-second-event', true, st2.rows[0].status === 'created' && c2 === 2,
    `reaper recycled to '${st2.rows[0].status}'; after re-execution: ${c2} MISSION_COMPLETED events for one logical completion`);

  // ---- F3: complete() on an already-completed row (v2: emit-after-won-UPDATE) ----
  const m3 = 'm_ce001_f3';
  await pool.query(`INSERT INTO ping_missions (mission_id, mission_type, status, started_at) VALUES ($1,'T','running', NOW() - interval '1 second')`, [m3]);
  await mr.complete(m3, { worker: 'w' });
  const b3 = await eventCount(m3);
  await mr.complete(m3, { worker: 'w' }); // row already completed
  const a3 = await eventCount(m3);
  verdict('F3-noop-complete-emits-spurious-event', false, a3 === b3 + 1,
    `second complete() on completed row: events ${b3} -> ${a3} (v2 emits only after a won UPDATE; defect NOT reproduced here)`);

  console.log(`\nCE-001 FAIL-BEFORE: ${mismatches === 0 ? 'all shapes as expected' : mismatches + ' MISMATCH(es)'}`);
  await pool.end();
  await admin.query(`DROP DATABASE "${db}"`).catch((e) => console.log('cleanup note:', e.message));
  await admin.end();
  process.exit(mismatches === 0 ? 0 : 1);
}

main().catch((e) => { console.error('SCRIPT ERROR:', e.message); process.exit(2); });
