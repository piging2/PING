/**
 * P0A fail-before test: boot-order mission loss (M1 boot instance).
 *
 * Defect: in gateway/bootstrap/gateway_runtime.js _initializeServices(),
 * LegacyIngressAdapter.start() (immediate first poll) runs BEFORE
 * EventToMissionBridge.start() (UER handler registration). An event swept in
 * that window enters ping_events, is marked canonical_events.processed=TRUE,
 * and NEVER gets a mission. Permanent, silent, on ordinary boot.
 *
 * The test boots the REAL GatewayRuntime._initializeServices() against a
 * scratch Postgres, with a pre-seeded canonical_events row of a bridge-mapped
 * type (REVIEW_RECEIVED -> REVIEW_RESPONSE).
 *
 * Determinism (no timing luck): the test wraps EventToMissionBridge.start so
 * that, when the adapter has already started polling, handler registration is
 * held on an explicit barrier until the adapter's sweep of the seed row has
 * completed. This realizes the interleaving the source ordering permits on an
 * ordinary boot (the init window spans multiple DB/network awaits). After the
 * boot-order fix, the barrier never engages because the bridge registers
 * before the adapter can poll.
 *
 * Desired invariants (FAIL on current source, PASS after the fix):
 *   A1: bridge handler registration happens-before adapter polling starts.
 *   A2: the converged seed event has exactly one mission.
 *   A3: after one more adapter poll cycle the mission still exists exactly
 *       once (no duplicate derivation on re-poll).
 *
 * Run: NODE_PATH=<modules> node tests/test_boot_order_mission_loss.js
 * Env: P0A_PGHOST (127.0.0.1), P0A_PGPORT (15444), P0A_PGUSER (postgres),
 *      P0A_PGPASSWORD (postgres), P0A_PGDATABASE (postgres)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const { LegacyIngressAdapter } = require('../ping-runtime/events/legacy_ingress_adapter');
const { EventToMissionBridge } = require('../ping-runtime/orchestration/event_to_mission_bridge');
const { GatewayRuntime } = require('../gateway/bootstrap/gateway_runtime.js');

const SEED_UUID = '11111111-1111-1111-1111-111111111111';
const DUMMY_EVENT_ID = 'event_0000000000000000';

const pool = new Pool({
  host: process.env.P0A_PGHOST || '127.0.0.1',
  port: parseInt(process.env.P0A_PGPORT || '15444', 10),
  database: process.env.P0A_PGDATABASE || 'postgres',
  user: process.env.P0A_PGUSER || 'postgres',
  password: process.env.P0A_PGPASSWORD || 'postgres',
  max: 5,
  connectionTimeoutMillis: 5000,
});

async function waitFor(label, fn, { timeoutMs = 60000, intervalMs = 200 } = {}) {
  const start = Date.now();
  for (;;) {
    if (await fn()) return Date.now() - start;
    if (Date.now() - start > timeoutMs) {
      throw new Error('TIMEOUT waiting for: ' + label);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

async function main() {
  const failures = [];
  const check = (name, fn) => {
    try { fn(); console.log('  PASS ' + name); }
    catch (e) { failures.push(name); console.log('  FAIL ' + name + ': ' + e.message); }
  };

  // ---- setup: clean tables, schema, seed rows ----
  const schemaSql = fs.readFileSync(
    path.join(__dirname, '..', 'database', 'canonical_events.sql'), 'utf8');
  await pool.query(schemaSql);
  await pool.query('TRUNCATE canonical_events, ping_events, ping_missions');
  // Dummy ping_events row: keeps _seedBusinessEvents skipped so the only
  // ingress in this test is the controlled seed row.
  await pool.query(
    `INSERT INTO ping_events (event_id, event_type, source, payload, metadata)
     VALUES ($1, 'P0A_SEED_GUARD', 'p0a-test', '{}', '{}')`,
    [DUMMY_EVENT_ID]);
  await pool.query(
    `INSERT INTO canonical_events
       (event_id, event_type, event_version, tenant_id, timestamp, sequence,
        source, actor, payload, metadata, processed)
     VALUES ($1, 'REVIEW_RECEIVED', '1.0.0', 'hpp', NOW(), 900001,
             'p0a-boot-test', 'p0a',
             '{"review_id":"rev_p0a_1","rating":2,"text":"boot order probe"}',
             '{}', FALSE)`,
    [SEED_UUID]);
  console.log('[p0a] seed canonical_events row inserted: ' + SEED_UUID);

  // ---- deterministic interleaving instrumentation ----
  let adapterStartedAt = 0;
  let bridgeStartAt = 0;
  let sweepDoneAt = 0;

  const origAdapterStart = LegacyIngressAdapter.prototype.start;
  const origBridgeStart = EventToMissionBridge.prototype.start;
  LegacyIngressAdapter.prototype.start = function () {
    adapterStartedAt = Date.now();
    return origAdapterStart.call(this);
  };
  EventToMissionBridge.prototype.start = async function () {
    bridgeStartAt = Date.now();
    if (adapterStartedAt > 0) {
      // Adapter already polling: hold handler registration until its sweep
      // of the seed row is durably complete. This is the interleaving the
      // current source ordering permits on ordinary boot.
      await waitFor('seed sweep complete (canonical_events.processed=TRUE)',
        async () => {
          const r = await pool.query(
            'SELECT processed FROM canonical_events WHERE event_id = $1', [SEED_UUID]);
          const done = r.rows.length > 0 && r.rows[0].processed === true;
          if (done && !sweepDoneAt) sweepDoneAt = Date.now();
          return done;
        });
    }
    return origBridgeStart.call(this);
  };

  // ---- boot the real runtime ----
  const rt = new GatewayRuntime(pool);
  const services = await rt._initializeServices();
  assert.ok(services.eventToMissionBridge, 'bridge booted');
  assert.ok(services.legacyIngressAdapter, 'adapter booted');
  const bridge = services.eventToMissionBridge;
  const adapter = services.legacyIngressAdapter;
  console.log('[p0a] boot done. adapterStart=%d bridgeStart=%d sweepDone=%d',
    adapterStartedAt, bridgeStartAt, sweepDoneAt);

  const conv = await pool.query(
    "SELECT event_id FROM ping_events WHERE metadata->>'original_event_id' = $1",
    [SEED_UUID]);
  const convergedId = conv.rows.length === 1 ? conv.rows[0].event_id : null;
  const missionsFor = async () => (await pool.query(
    "SELECT mission_id, status FROM ping_missions WHERE payload->>'event_id' = $1",
    [convergedId])).rows;

  // ---- desired invariants ----
  check('A1 bridge registers before adapter polls', () => {
    assert.ok(adapterStartedAt > 0 && bridgeStartAt > 0, 'both started');
    assert.ok(bridgeStartAt <= adapterStartedAt,
      `bridge registered at ${bridgeStartAt}, adapter started polling at ${adapterStartedAt}`);
  });
  check('A2 seed event converged into ping_events', () => {
    assert.strictEqual(conv.rows.length, 1,
      `expected 1 converged ping_events row, got ${conv.rows.length}`);
  });
  let missionRows = [];
  if (convergedId) {
    missionRows = await missionsFor();
    check('A3 exactly one mission derived from the converged event', () => {
      assert.strictEqual(missionRows.length, 1,
        `expected 1 mission for event ${convergedId}, got ${missionRows.length}` +
        ' (M1 violated: durable event with no mission)');
    });
    check('A4 bridge observed the event', () => {
      assert.ok(bridge._stats.listened >= 1,
        `bridge listened=${bridge._stats.listened}, expected >= 1`);
    });
  } else {
    failures.push('A3/A4 (no converged event)');
  }

  // ---- permanence diagnostic: one more adapter poll cycle, then re-check ----
  const pollsAtBoot = adapter._stats.polls;
  await waitFor('next adapter poll cycle',
    async () => adapter._stats.polls > pollsAtBoot,
    { timeoutMs: 30000 });
  const missionRowsAfter = convergedId ? await missionsFor() : [];
  console.log('[p0a] permanence: missions before=%d after=%d (extra poll cycle)',
    missionRows.length, missionRowsAfter.length);
  check('A5 mission still exactly one after re-poll (no loss, no dup)', () => {
    assert.strictEqual(missionRowsAfter.length, 1,
      `expected 1 mission after re-poll, got ${missionRowsAfter.length}`);
  });

  // ---- cleanup ----
  LegacyIngressAdapter.prototype.start = origAdapterStart;
  EventToMissionBridge.prototype.start = origBridgeStart;
  try { if (adapter._timer) clearInterval(adapter._timer); } catch (_) {}
  try {
    if (services.missionScheduler && services.missionScheduler.stop) {
      services.missionScheduler.stop();
    }
  } catch (_) {}
  await pool.end();

  console.log(failures.length === 0
    ? '[p0a] RESULT: PASS — boot order closes the mission-loss window'
    : `[p0a] RESULT: FAIL — ${failures.length} invariant(s) violated: ${failures.join(', ')}`);
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((e) => { console.error('[p0a] TEST ERROR ' + (e && e.stack || e)); process.exit(2); });
