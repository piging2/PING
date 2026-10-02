const { Client } = require('pg');
(async () => {
  const c = new Client({ host: '127.0.0.1', port: 15444, database: 'postgres', user: 'postgres', password: 'postgres' });
  await c.connect();
  const ce = await c.query("SELECT event_id, event_type, source, processed, created_at FROM canonical_events ORDER BY created_at");
  console.log('CANONICAL_EVENTS:'); ce.rows.forEach(r => console.log(' ', JSON.stringify(r)));
  const m = await c.query("SELECT mission_id, mission_type, status, payload->>'event_id' AS ev, created_at FROM ping_missions ORDER BY created_at");
  console.log('MISSIONS:'); m.rows.forEach(r => console.log(' ', JSON.stringify(r)));
  const pe = await c.query("SELECT event_id, event_type, source, created_at FROM ping_events ORDER BY created_at");
  console.log('PING_EVENTS:'); pe.rows.forEach(r => console.log(' ', JSON.stringify(r)));
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
