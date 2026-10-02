const fs = require('fs');
const { Client } = require('pg');
(async () => {
  const sql = fs.readFileSync(process.argv[2], 'utf8');
  const client = new Client({ host: '127.0.0.1', port: 15444, database: 'postgres', user: 'postgres', password: 'postgres' });
  await client.connect();
  await client.query(sql);
  const r = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1");
  console.log('TABLES: ' + r.rows.map(x => x.tablename).join(','));
  await client.end();
})().catch(e => { console.error('LOAD_FAILED ' + e.message); process.exit(1); });
