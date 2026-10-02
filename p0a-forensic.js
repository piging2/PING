const { Client } = require('pg');
(async () => {
  const c = new Client({ host: '127.0.0.1', port: 15444, database: 'postgres', user: 'postgres', password: 'postgres' });
  await c.connect();
  const m = await c.query("SELECT mission_id, mission_type, status, created_at FROM ping_missions WHERE payload->>'event_id' = 'event_60cf26b8854f63b4'");
  console.log('MISSIONS:', JSON.stringify(m.rows, null, 1));
  const e = await c.query("SELECT event_id, event_type, timestamp, created_at FROM ping_events WHERE event_id = 'event_60cf26b8854f63b4'");
  console.log('EVENT:', JSON.stringify(e.rows, null, 1));
  const r = await c.query("SELECT processed, processed_at, last_error FROM canonical_events WHERE event_id = '11111111-1111-1111-1111-111111111111'");
  console.log('ROW:', JSON.stringify(r.rows, null, 1));
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
