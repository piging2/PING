const { Pool } = require('/tmp/orca-pgcheck/node_modules/pg');
(async () => {
  const pool = new Pool({ host: '127.0.0.1', port: 5432, user: 'postgres',
    password: process.env.PGPASSWORD, database: 'ping_runtime', connectionTimeoutMillis: 8000 });
  const m = await pool.query("SELECT COUNT(*)::int AS c FROM ping_missions");
  console.log('mission rows now:', m.rows[0].c, '(was 191 before run)');
  const f = await pool.query("SELECT COUNT(*)::int AS c FROM ping_events WHERE event_type='WORKER_FAILED' AND timestamp > NOW() - INTERVAL '1 hour'");
  console.log('WORKER_FAILED in last hour:', f.rows[0].c);
  const w = await pool.query("SELECT COUNT(*)::int AS c FROM ping_events WHERE event_type='WORKER_COMPLETED' AND timestamp > NOW() - INTERVAL '1 hour'");
  console.log('WORKER_COMPLETED in last hour:', w.rows[0].c);
  const n = await pool.query("SELECT COUNT(*)::int AS c FROM ping_missions WHERE created_at > NOW() - INTERVAL '1 hour'");
  console.log('missions created in last hour:', n.rows[0].c);
  await pool.end();
})().catch(e => { console.error('AUDIT-ERROR:', e.message); process.exit(1); });
