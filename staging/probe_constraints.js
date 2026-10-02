let pg;
try { pg = require('pg'); } catch (e) { pg = require('/home/nolan/worktrees/constitutional-convergence/tests/mc1-legacy-ingress/node_modules/pg'); }
const { Pool } = pg;
const R = '/home/nolan/worktrees/constitutional-convergence-authority-law';
const { UnifiedEventRuntime } = require(R + '/ping-runtime/events/unified_event_runtime.js');
const { CanonicalEventEnvelope } = require(R + '/gateway/canonical_event_envelope.js');
const { MissionRuntime } = require(R + '/ping-runtime/orchestration/mission_runtime.js');
(async () => {
  const admin = new Pool({ host: '127.0.0.1', port: 15439, user: 'postgres', password: process.env.PGPASSWORD, database: 'postgres' });
  const DB = 'probec_' + Date.now().toString(36);
  await admin.query('CREATE DATABASE "' + DB + '"');
  await admin.end();
  const pool = new Pool({ host: '127.0.0.1', port: 15439, user: 'postgres', password: process.env.PGPASSWORD, database: DB });
  const uer = new UnifiedEventRuntime({ pool, eventValidator: null, eventGovernance: null });
  await uer.initialize();
  const envelope = new CanonicalEventEnvelope(pool, { repoRoot: R });
  await envelope.initialize();
  const missions = new MissionRuntime({ pool, uer });
  await missions.initialize();
  const r = await pool.query(
    "SELECT t.relname AS tbl, c.conname, pg_get_constraintdef(c.oid) AS def " +
    "FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid " +
    "JOIN pg_namespace n ON n.oid = t.relnamespace " +
    "WHERE t.relname IN ('canonical_events','ping_events','missions') " +
    "AND n.nspname = 'public' AND c.contype IN ('p','u') ORDER BY t.relname, c.conname;"
  );
  for (const row of r.rows) console.log(row.tbl + ' | ' + row.conname + ' | ' + row.def);
  await pool.end();
  const admin2 = new Pool({ host: '127.0.0.1', port: 15439, user: 'postgres', password: process.env.PGPASSWORD, database: 'postgres' });
  await admin2.query('DROP DATABASE "' + DB + '"');
  await admin2.end();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
