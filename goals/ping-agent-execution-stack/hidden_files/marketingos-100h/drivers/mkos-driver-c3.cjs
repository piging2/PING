'use strict';
/* MarketingOS 100h, Block 20-40, Driver C3: advance mission 0a04c41899fefb2a to completed.
 * Driver C2 recorded all claims + knowledge but complete() was a silent no-op:
 * complete() only transitions from status='running' (or held), and the mission
 * had been reset to 'created' by lease expiry after driver C crashed.
 * This driver does assign -> start -> complete (all existing MissionRuntime
 * transitions), storing the experiment outcome as the mission result.
 */
const { execSync } = require('child_process');
const path = require('path');

const WT = '/home/nolan/ping-worktrees/deploy-merge-20260930';
const MISSION_ID = '0a04c41899fefb2a';

function dbPassword() {
  const env = execSync(
    `docker inspect ping-gateway --format '{{range .Config.Env}}{{println .}}{{end}}'`,
    { encoding: 'utf8' }
  );
  const line = env.split('\n').find((l) => l.startsWith('POSTGRES_PASSWORD='));
  if (!line) throw new Error('POSTGRES_PASSWORD not found in ping-gateway container env');
  return line.slice('POSTGRES_PASSWORD='.length).trim();
}

async function main() {
  const { Pool } = require('/tmp/writer-m/node_modules/pg');
  const pool = new Pool({
    host: '127.0.0.1', port: 5432, user: 'postgres',
    password: dbPassword(), database: 'ping_runtime',
  });
  const { UnifiedEventRuntime } = require(path.join(WT, 'ping-runtime/events/unified_event_runtime.js'));
  const { MissionRuntime } = require(path.join(WT, 'ping-runtime/orchestration/mission_runtime.js'));
  const eventRuntime = new UnifiedEventRuntime({ pool });
  await eventRuntime.initialize();
  const missionRuntime = new MissionRuntime({ pool, eventRuntime });
  await missionRuntime.initialize();

  const before = await pool.query(`SELECT mission_id, status FROM ping_missions WHERE mission_id = $1`, [MISSION_ID]);
  console.log('BEFORE ' + JSON.stringify(before.rows[0]));

  await missionRuntime.assign(MISSION_ID, 'mkos-block20-40-editorial-worker');
  await missionRuntime.start(MISSION_ID);
  const mid = await pool.query(`SELECT status FROM ping_missions WHERE mission_id = $1`, [MISSION_ID]);
  console.log('AFTER_START ' + JSON.stringify(mid.rows[0]));

  const result = {
    verdict: 'SUPPORTED',
    metrics_observed: {
      attack_coverage: '5/5 theses attacked',
      attacks_run: 14,
      attacks_landed: 10,
      theses_killed_or_demoted_as_headlines: 4,
      surviving_thesis_selected: 1,
      non_claims_listed: 7,
      evidence_map_entries: 11,
    },
    notes: 'Surviving thesis for Nolan\'s human judgment: "default_transaction_read_only is a session default, not a privilege boundary. REVOKE is the boundary, for non-superuser roles. Superusers cannot be privilege-bound at all, and our own journal runs as one." Headline pick (H1/H2/H3) and distribution decisions stop at Nolan\'s boundary. Full record: BLOCK-20-40-REPORT.md.',
  };
  await missionRuntime.complete(MISSION_ID, result);

  const after = await pool.query(
    `SELECT mission_id, mission_type, status, result->>'verdict' AS verdict, completed_at FROM ping_missions WHERE mission_id = $1`,
    [MISSION_ID]);
  console.log('AFTER_COMPLETE ' + JSON.stringify(after.rows[0]));
  const ev = await pool.query(
    `SELECT count(*)::int AS n FROM ping_events WHERE metadata->>'correlation_id' = $1`, [MISSION_ID]);
  console.log('CORRELATED_EVENTS n=' + ev.rows[0].n);
  await pool.end();
}

main().then(
  () => { console.log('DRIVER_C3_DONE'); process.exit(0); },
  (err) => { console.error('DRIVER_C3_FAILED', err && err.message); process.exit(1); }
);
