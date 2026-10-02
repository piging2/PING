const { Pool } = require('/tmp/orca-pgcheck/node_modules/pg');
(async () => {
  const pool = new Pool({ host: '127.0.0.1', port: 5432, user: 'postgres',
    password: process.env.PGPASSWORD, database: 'ping_runtime', connectionTimeoutMillis: 8000 });
  const mid = '70bd4b9d034b94a4';
  const m = await pool.query(
    'SELECT mission_id, status, (result IS NOT NULL) AS result_recorded, retries FROM ping_missions WHERE mission_id = $1', [mid]);
  console.log('mission:', JSON.stringify(m.rows));
  const e = await pool.query(
    "SELECT event_type FROM ping_events WHERE payload->>'missionId' = $1 AND event_type LIKE 'MISSION_%' ORDER BY timestamp", [mid]);
  console.log('lifecycle events:', JSON.stringify(e.rows.map(r => r.event_type)));
  const w = await pool.query(
    "SELECT event_id, event_type, timestamp, metadata->>'correlation_id' AS corr, metadata->>'causation_id' AS caus, payload->>'work_order_id' AS woid, payload->>'result_id' AS rid FROM ping_events WHERE event_type IN ('WORKER_COMPLETED','WORKER_FAILED') AND timestamp > NOW() - INTERVAL '1 hour' ORDER BY timestamp");
  for (const r of w.rows) console.log('worker event:', JSON.stringify(r));
  await pool.end();
})().catch(e => { console.error('AUDIT-ERROR:', e.message); process.exit(1); });
