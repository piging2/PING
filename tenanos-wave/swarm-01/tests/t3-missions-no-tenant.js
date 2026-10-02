#!/usr/bin/env node
// SWARM-01 T3: missions carry no tenant (mission runtime path).
// REAL code path: MissionRuntime.create/getPending with stubbed pool.
// Synthetic fixtures only. Read-only: no network, no DB.
const SUBSTRATE = process.env.PING_SUBSTRATE || '/home/nolan/ping';

async function main() {
  const { MissionRuntime } = require(SUBSTRATE + '/ping-runtime/orchestration/mission_runtime.js');
  const seen = [];
  const stubPool = {
    query: async (sql, params) => { seen.push({ sql, params }); return { rowCount: 1, rows: [] }; },
  };
  const rt = new MissionRuntime({ pool: stubPool, eventRuntime: null });

  await rt.create('SYNTH_MISSION', { _tenant_id: 'tenant::acme-synth', note: 'synthetic' }, { createdBy: 'synth' });
  const insert = seen.find((s) => /INSERT INTO ping_missions/.test(s.sql));
  console.log('create() SQL =>', insert ? insert.sql.replace(/\s+/g, ' ').trim() : 'NOT FOUND');

  seen.length = 0;
  await rt.getPending(10);
  const sel = seen.find((s) => /FROM ping_missions/.test(s.sql));
  console.log('getPending() SQL =>', sel ? sel.sql.replace(/\s+/g, ' ').trim() : 'NOT FOUND');

  const insertScoped = insert && /tenant_id/.test(insert.sql);
  const selectScoped = sel && /tenant/i.test(sel.sql);
  if (!insertScoped && !selectScoped) {
    console.log('LEAK DEMONSTRATED T3: ping_missions has no tenant_id; create/list are global (cross-tenant claim/read by design).');
  } else {
    console.log('BOUNDARY HOLDS T3: mission SQL carries tenant scoping.');
  }
}

main().catch((e) => { console.error('HARNESS ERROR T3:', e.message); process.exit(2); });
