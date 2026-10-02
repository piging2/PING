#!/usr/bin/env node
// SWARM-01 T6: Mission Control queries miss tenant filters.
// REAL code path: createMissionControlRoutes mounted on express with stubs;
// live HTTP GET /mc/missions/active. Synthetic fixtures only. Read-only.
const SUBSTRATE = process.env.PING_SUBSTRATE || '/home/nolan/ping';
const http = require('http');

async function main() {
  const createMissionControlRoutes = require(SUBSTRATE + '/gateway/routes/mission_control.js');
  const express = require(SUBSTRATE + '/gateway/node_modules/express');

  const mixedMissions = [
    { mission_id: 'm-acme', mission_type: 'SYNTH', payload: JSON.stringify({ _tenant_id: 'tenant::acme-synth' }) },
    { mission_id: 'm-victim', mission_type: 'SYNTH', payload: JSON.stringify({ _tenant_id: 'tenant::victim-synth' }) },
  ];
  const services = {
    unifiedEventRuntime: { query: async () => ({ status: 'ok', events: [] }) },
    missionRuntime: {
      getActive: async () => mixedMissions,
      getPending: async () => [],
      getStats: async () => ({}),
    },
  };

  const app = express();
  app.use('/mc', createMissionControlRoutes(services));
  const server = await new Promise((res) => { const s = app.listen(0, () => res(s)); });
  const port = server.address().port;

  const body = await new Promise((resolve, reject) => {
    http.get({ port, path: '/mc/missions/active' }, (resp) => {
      let data = '';
      resp.on('data', (c) => { data += c; });
      resp.on('end', () => resolve(data));
    }).on('error', reject);
  });
  server.close();

  const parsed = JSON.parse(body);
  const ids = (parsed.missions || []).map((m) => m.mission_id);
  console.log('GET /mc/missions/active ->', JSON.stringify(ids));
  const leaked = ids.includes('m-acme') && ids.includes('m-victim');
  if (leaked) {
    console.log('LEAK DEMONSTRATED T6: Mission Control returns all tenants\' missions with no tenant filter or tenant input.');
  } else {
    console.log('BOUNDARY HOLDS T6: Mission Control scopes missions by tenant.');
  }
}

main().catch((e) => { console.error('HARNESS ERROR T6:', e.message); process.exit(2); });
