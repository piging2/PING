const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const UER = require('/home/nolan/worktrees/constitutional-convergence-authority-law/ping-runtime/events/unified_event_runtime').UnifiedEventRuntime;
const { LegacyIngressAdapter } = require('/home/nolan/worktrees/constitutional-convergence-authority-law/ping-runtime/events/legacy_ingress_adapter');
const { EventToMissionBridge } = require('/home/nolan/worktrees/constitutional-convergence-authority-law/ping-runtime/orchestration/event_to_mission_bridge');
const { GatewayRuntime } = require('/home/nolan/worktrees/constitutional-convergence-authority-law/gateway/bootstrap/gateway_runtime.js');

const SEED_UUID = '22222222-2222-2222-2222-222222222222';
const pool = new Pool({ host: '127.0.0.1', port: 15444, database: 'postgres', user: 'postgres', password: 'postgres', max: 5 });

const origEmit = UER.prototype.emit;
UER.prototype.emit = async function (eventType, source, payload, options) {
  if (eventType === 'REVIEW_RECEIVED') {
    const t = Date.now();
    const stack = new Error().stack.split('\n').slice(2, 6).map(s => s.trim()).join(' | ');
    console.log(`[trace] EMIT START REVIEW_RECEIVED t=${t} stack: ${stack}`);
    const r = await origEmit.call(this, eventType, source, payload, options);
    console.log(`[trace] EMIT END REVIEW_RECEIVED t=${Date.now()} eventId=${r && r.eventId} status=${r && r.status}`);
    return r;
  }
  return origEmit.call(this, eventType, source, payload, options);
};
const origHandle = EventToMissionBridge.prototype._handleEvent;
EventToMissionBridge.prototype._handleEvent = async function (event) {
  console.log(`[trace] BRIDGE HANDLE t=${Date.now()} event=${event.event_id} type=${event.event_type}`);
  return origHandle.call(this, event);
};
const origOn = UER.prototype.on;
UER.prototype.on = function (eventType, handler) {
  if (eventType === 'REVIEW_RECEIVED') console.log(`[trace] HANDLER REGISTERED for REVIEW_RECEIVED t=${Date.now()}`);
  return origOn.call(this, eventType, handler);
};

(async () => {
  const schemaSql = fs.readFileSync('/home/nolan/worktrees/constitutional-convergence-authority-law/database/canonical_events.sql', 'utf8');
  await pool.query(schemaSql);
  await pool.query('TRUNCATE canonical_events, ping_events, ping_missions');
  await pool.query(`INSERT INTO ping_events (event_id, event_type, source, payload, metadata) VALUES ('event_0000000000000000','P0A_SEED_GUARD','p0a-test','{}','{}')`);
  await pool.query(`INSERT INTO canonical_events (event_id, event_type, event_version, tenant_id, timestamp, sequence, source, actor, payload, metadata, processed)
    VALUES ($1,'REVIEW_RECEIVED','1.0.0','hpp',NOW(),900002,'p0a-trace','p0a','{"review_id":"rev_trace_1"}','{}',FALSE)`, [SEED_UUID]);
  const rt = new GatewayRuntime(pool);
  const services = await rt._initializeServices();
  console.log('[trace] BOOT DONE t=' + Date.now());
  await new Promise(r => setTimeout(r, 8000));
  const m = await pool.query("SELECT count(*) FROM ping_missions WHERE payload->>'event_id' LIKE 'event_%'");
  console.log('[trace] missions for converged events: ' + m.rows[0].count);
  try { clearInterval(services.legacyIngressAdapter._timer); } catch (e) {}
  try { if (services.missionScheduler.stop) services.missionScheduler.stop(); } catch (e) {}
  await pool.end();
  process.exit(0);
})().catch(e => { console.error(e.stack); process.exit(1); });
