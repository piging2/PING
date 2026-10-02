// FAIL-BEFORE forensic script — completion reconciliation lane, READ-ONLY on worktree.
// Proves at HEAD 1995f0a59 (no worktree edits; uses production code paths only):
//   F1: MISSION_COMPLETED identity is nondeterministic (duration_ms/completed_at in preimage)
//   F2: crash after emit-accept before UPDATE leaves event-exists/row-running, unreconciled
//   F3: complete() on an already-completed row still emits (emit precedes the running-check)
// Scratch PG only. Run on Pig: NODE_PATH=<worktree>/gateway/node_modules node failbefore-completion.js
'use strict';

const WT = '/home/nolan/worktrees/constitutional-convergence-authority-law';
const { Pool } = require('pg');
const { UnifiedEventRuntime } = require(WT + '/ping-runtime/events/unified_event_runtime.js');
const { MissionRuntime } = require(WT + '/ping-runtime/orchestration/mission_runtime.js');

const admin = new Pool({ host: 'localhost', port: 5432, database: 'postgres', user: 'postgres', password: 'postgres' });

async function main() {
  const db = 'scratch_completion_forensic';
  await admin.query(`DROP DATABASE IF EXISTS "${db}"`).catch(() => {});
  await admin.query(`CREATE DATABASE "${db}"`);
  const pool = new Pool({ host: 'localhost', port: 5432, database: db, user: 'postgres', password: 'postgres' });

  const uer = new UnifiedEventRuntime({ pool }); // no validator/governance: checks skipped, same persist path
  await uer.initialize();
  const mr = new MissionRuntime({ pool, eventRuntime: uer });
  await mr.initialize();

  let failures = 0;
  const check = (name, cond, detail) => {
    console.log(`${cond ? 'PROVEN' : 'NOT-REPRODUCED'} ${name}: ${detail}`);
    if (cond) failures++;
  };

  // ---- F1: two emissions of the same logical completion -> two event_ids ----
  const m1 = 'm_failbefore_1';
  await pool.query(`INSERT INTO ping_missions (mission_id, mission_type, status) VALUES ($1,'T','running')`, [m1]);
  // Replicates MissionRuntime.complete()'s exact emit call shape (no logical_id option):
  const e1 = await uer.emit('MISSION_COMPLETED', 'mission-runtime',
    { missionId: m1, result: { worker: 'w', completed_at: '2026-09-19T14:00:00.000Z' }, duration_ms: 1200 });
  const e2 = await uer.emit('MISSION_COMPLETED', 'mission-runtime',
    { missionId: m1, result: { worker: 'w', completed_at: '2026-09-19T14:00:05.000Z' }, duration_ms: 1733 });
  const r1 = await pool.query(`SELECT event_id FROM ping_events WHERE event_type='MISSION_COMPLETED' AND payload->>'missionId'=$1`, [m1]);
  check('F1-nondeterministic-completion-identity',
    e1.status === 'ok' && e2.status === 'ok' && r1.rows.length === 2 && r1.rows[0].event_id !== r1.rows[1].event_id,
    `same logical completion minted ${r1.rows.length} distinct event_ids (${r1.rows.map(r => r.event_id).join(', ')})`);

  // F1b control: byte-identical payload dedups (mechanism exists, unreachable via complete())
  const e3 = await uer.emit('MISSION_COMPLETED', 'mission-runtime',
    { missionId: m1, result: { worker: 'w', completed_at: '2026-09-19T14:00:00.000Z' }, duration_ms: 1200 });
  check('F1b-dedup-only-when-preimage-matches',
    e3.status === 'ok' && e3.deduplicated === true && e3.eventId === e1.eventId,
    `identical retry dedups (deduplicated=${!!e3.deduplicated}); complete() can never produce this because duration_ms/completed_at differ every call`);

  // ---- F2: crash after emit-accept, before UPDATE -> unreconciled state ----
  const m2 = 'm_failbefore_2';
  await pool.query(
    `INSERT INTO ping_missions (mission_id, mission_type, status, lease_until) VALUES ($1,'T','running', NOW() - interval '1 hour')`, [m2]);
  const ec = await uer.emit('MISSION_COMPLETED', 'mission-runtime',
    { missionId: m2, result: { worker: 'w', completed_at: '2026-09-19T14:00:00.000Z' }, duration_ms: 42 });
  // crash: UPDATE never issued
  const st = await pool.query(`SELECT status FROM ping_missions WHERE mission_id=$1`, [m2]);
  const ev = await pool.query(`SELECT count(*)::int c FROM ping_events WHERE event_type='MISSION_COMPLETED' AND payload->>'missionId'=$1`, [m2]);
  check('F2-event-exists-row-running-unreconciled',
    ec.status === 'ok' && st.rows[0].status === 'running' && ev.rows[0].c === 1,
    `emit accepted, row still '${st.rows[0].status}', ${ev.rows[0].c} MISSION_COMPLETED; P0B bridge only reconciles event->mission, nothing reconciles completion->row`);
  // lease reaper turns it into re-execution, which mints a SECOND event (F1)
  await mr.reapExpiredLeases();
  const st2 = await pool.query(`SELECT status FROM ping_missions WHERE mission_id=$1`, [m2]);
  check('F2-reaper-recycles-into-reexecution',
    st2.rows[0].status === 'created',
    `lease reaper reset to '${st2.rows[0].status}' -> scheduler re-claims -> worker re-executes -> second complete() mints a second MISSION_COMPLETED (F1)`);

  // ---- F3: complete() on already-completed row still emits ----
  await pool.query(`UPDATE ping_missions SET status='completed' WHERE mission_id=$1`, [m2]);
  const before = await pool.query(`SELECT count(*)::int c FROM ping_events WHERE event_type='MISSION_COMPLETED' AND payload->>'missionId'=$1`, [m2]);
  const n = await mr.complete(m2, { worker: 'w' }); // production complete(); row not 'running'
  const after = await pool.query(`SELECT count(*)::int c FROM ping_events WHERE event_type='MISSION_COMPLETED' AND payload->>'missionId'=$1`, [m2]);
  check('F3-noop-complete-emits-spurious-event',
    n === 0 && after.rows[0].c === before.rows[0].c + 1,
    `complete() returned rowCount=${n} but emitted anyway (events ${before.rows[0].c} -> ${after.rows[0].c}): emit precedes the conditional UPDATE`);

  console.log(`\nFAIL-BEFORE SUMMARY: ${failures}/4 defect shapes reproduced on scratch PG at HEAD 1995f0a59`);
  await pool.end();
  await admin.query(`DROP DATABASE "${db}"`).catch((e) => console.log('cleanup note:', e.message));
  await admin.end();
  process.exit(0);
}

main().catch((e) => { console.error('SCRIPT ERROR:', e.message); process.exit(2); });
