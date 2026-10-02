// CE-001 FAIL-BEFORE test scaffolding — completion identity determinism.
// READY TO RUN once Pig WSL + scratch PG are back. Does NOT modify the worktree.
// Run: PING_WORKTREE=/home/nolan/worktrees/constitutional-convergence-authority-law \
//       NODE_PATH=$PING_WORKTREE/gateway/node_modules node failbefore-ce001.js
//
// Exit code: 0 = all defect shapes reproduced (fail-before proven).
//            1 = a defect shape did NOT reproduce (investigate before claiming).
// After the CE-001 patch, run the same shapes inverted via --expect-fixed
// (F1: two completions -> exactly ONE event_id, second returns deduplicated:true).
'use strict';

const WT = process.env.PING_WORKTREE || '/home/nolan/worktrees/constitutional-convergence-authority-law';
const EXPECT_FIXED = process.argv.includes('--expect-fixed');
const { Pool } = require('pg');
const { UnifiedEventRuntime } = require(WT + '/ping-runtime/events/unified_event_runtime.js');
const { MissionRuntime } = require(WT + '/ping-runtime/orchestration/mission_runtime.js');

const admin = new Pool({ host: 'localhost', port: 5432, database: 'postgres', user: 'postgres', password: 'postgres' });

async function main() {
  const db = 'scratch_ce001_' + Date.now().toString(36);
  await admin.query(`DROP DATABASE IF EXISTS "${db}"`).catch(() => {});
  await admin.query(`CREATE DATABASE "${db}"`);
  const pool = new Pool({ host: 'localhost', port: 5432, database: db, user: 'postgres', password: 'postgres' });

  const uer = new UnifiedEventRuntime({ pool });
  await uer.initialize();
  const mr = new MissionRuntime({ pool, eventRuntime: uer });
  await mr.initialize();

  let bad = 0;
  const verdict = (name, reproduced, detail) => {
    const ok = EXPECT_FIXED ? !reproduced : reproduced;
    console.log(`${ok ? 'OK' : 'MISMATCH'} ${name}: ${detail}`);
    if (!ok) bad++;
  };

  // F1: two emissions of the same logical completion, payloads differing only in
  // wall-clock fields (as any real retry would). Fail-before: 2 distinct event_ids.
  const m1 = 'm_ce001_1';
  await pool.query(`INSERT INTO ping_missions (mission_id, mission_type, status) VALUES ($1,'T','running')`, [m1]);
  const e1 = await mr.complete(m1, { worker: 'w', completed_at: '2026-09-19T14:00:00.000Z' });
  // simulate retry: reset row to running, complete again with a later timestamp
  await pool.query(`UPDATE ping_missions SET status='running' WHERE mission_id=$1`, [m1]);
  const e2 = await mr.complete(m1, { worker: 'w', completed_at: '2026-09-19T14:00:05.000Z' });
  const r1 = await pool.query(
    `SELECT event_id FROM ping_events WHERE event_type='MISSION_COMPLETED' AND payload->>'missionId'=$1 ORDER BY event_id`, [m1]);
  verdict('F1-nondeterministic-completion-identity',
    r1.rows.length === 2 && r1.rows[0].event_id !== r1.rows[1].event_id,
    `same logical completion minted ${r1.rows.length} event_id(s): ${r1.rows.map(r => r.event_id).join(', ')}`);

  // F1b control: identical retry reaches the dedup machinery.
  const e3 = await uer.emit('MISSION_COMPLETED', 'mission-runtime',
    { missionId: m1, result: { worker: 'w', completed_at: '2026-09-19T14:00:00.000Z' }, duration_ms: 1200 });
  verdict('F1b-dedup-reachable-once-preimage-matches',
    e3.status === 'ok' && (EXPECT_FIXED ? true : e3.deduplicated === true),
    `identical re-emit: deduplicated=${!!e3.deduplicated}`);

  // F2: crash after emit-accept before UPDATE -> event-exists / row-running.
  const m2 = 'm_ce001_2';
  await pool.query(
    `INSERT INTO ping_missions (mission_id, mission_type, status, lease_until) VALUES ($1,'T','running', NOW() - interval '1 hour')`, [m2]);
  const ec = await uer.emit('MISSION_COMPLETED', 'mission-runtime',
    { missionId: m2, result: { worker: 'w', completed_at: '2026-09-19T14:00:00.000Z' }, duration_ms: 42 });
  const st = await pool.query(`SELECT status FROM ping_missions WHERE mission_id=$1`, [m2]);
  const ev = await pool.query(`SELECT count(*)::int c FROM ping_events WHERE event_type='MISSION_COMPLETED' AND payload->>'missionId'=$1`, [m2]);
  verdict('F2-event-exists-row-running-unreconciled',
    ec.status === 'ok' && st.rows[0].status === 'running' && ev.rows[0].c === 1,
    `emit accepted, row '${st.rows[0].status}', ${ev.rows[0].c} MISSION_COMPLETED`);

  // F2b: lease reaper recycles -> scheduler re-claims -> second complete() mints second event (F1 chain).
  await mr.reapExpiredLeases();
  const st2 = await pool.query(`SELECT status FROM ping_missions WHERE mission_id=$1`, [m2]);
  await pool.query(`UPDATE ping_missions SET status='running' WHERE mission_id=$1`, [m2]); // scheduler re-claim
  await mr.complete(m2, { worker: 'w', completed_at: '2026-09-19T14:00:09.000Z' });
  const ev2 = await pool.query(`SELECT count(*)::int c FROM ping_events WHERE event_type='MISSION_COMPLETED' AND payload->>'missionId'=$1`, [m2]);
  verdict('F2b-reexecution-mints-second-event',
    ev2.rows[0].c === 2,
    `after reaper recycle + re-execution: ${ev2.rows[0].c} MISSION_COMPLETED events for one logical completion`);

  // F3: complete() on an already-completed row still emits (emit precedes the running-check).
  const before = await pool.query(`SELECT count(*)::int c FROM ping_events WHERE event_type='MISSION_COMPLETED' AND payload->>'missionId'=$1`, [m2]);
  await pool.query(`UPDATE ping_missions SET status='completed' WHERE mission_id=$1`, [m2]);
  const n = await mr.complete(m2, { worker: 'w' });
  const after = await pool.query(`SELECT count(*)::int c FROM ping_events WHERE event_type='MISSION_COMPLETED' AND payload->>'missionId'=$1`, [m2]);
  verdict('F3-noop-complete-emits-spurious-event',
    n === 0 && after.rows[0].c === before.rows[0].c + 1,
    `complete() returned rowCount=${n}; events ${before.rows[0].c} -> ${after.rows[0].c}`);

  console.log(`\nCE-001 FAIL-BEFORE: ${bad === 0 ? 'all shapes reproduced' : bad + ' MISMATCH(es)'} (expect-fixed=${EXPECT_FIXED})`);
  await pool.end();
  await admin.query(`DROP DATABASE "${db}"`).catch((e) => console.log('cleanup note:', e.message));
  await admin.end();
  process.exit(bad === 0 ? 0 : 1);
}

main().catch((e) => { console.error('SCRIPT ERROR:', e.message); process.exit(2); });
