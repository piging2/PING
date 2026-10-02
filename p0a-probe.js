const { Pool } = require('pg');
const { GatewayRuntime } = require('/home/nolan/worktrees/constitutional-convergence-authority-law/gateway/bootstrap/gateway_runtime.js');
(async () => {
  const pool = new Pool({ host: '127.0.0.1', port: 15444, database: 'postgres', user: 'postgres', password: 'postgres', max: 5, connectionTimeoutMillis: 5000 });
  const rt = new GatewayRuntime(pool);
  const services = await rt._initializeServices();
  console.log('BOOT_DONE bridge=' + !!services.eventToMissionBridge
    + ' adapter=' + !!services.legacyIngressAdapter
    + ' uer=' + !!services.unifiedEventRuntime
    + ' scheduler=' + !!services.missionScheduler
    + ' missionRuntime=' + !!services.missionRuntime);
  await pool.end();
  process.exit(0);
})().catch(e => { console.error('BOOT_FAILED ' + (e && e.stack || e)); process.exit(1); });
