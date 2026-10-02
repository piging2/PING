/**
 * MC-1 LegacyIngressAdapter certification harness.
 *
 * Reproducible preservation of the 2026-09-18 MC-1 certification
 * ("LegacyIngressAdapter repair; certify ingress to ping_events").
 *
 * What it proves: legacy ingress row (canonical_events) -> LegacyIngressAdapter
 * -> UnifiedEventRuntime.emit() acceptance -> ping_events, with durable
 * ingress<->canonical correlation, provenance/tenant preservation, default-deny
 * fail-closed behavior, and no unprocessed row permanently invisible under
 * failure injection. Production database is never touched; the suite runs
 * against a scratch database created by setup.sh and removed by teardown.sh.
 *
 * Usage (from this directory):
 *   node run-cert.js
 *
 * Required env (see README.md): MC1_PGHOST, MC1_PGPORT, MC1_DBNAME,
 * MC1_PGUSER, MC1_PGPASSWORD (or the libpq equivalents). The 'pg' npm package
 * must be resolvable (npm install pg, or NODE_PATH pointing at it).
 *
 * Output: one line per assertion, "PASS MC1-<nnn> <name>"; a final
 * "CERT_PASS <n> assertions" line on success, "CERT_FAIL ..." on failure.
 * Assertion IDs (MC1-001..MC1-085) are assigned in execution order and are
 * stable across runs because the suite is fully deterministic.
 *
 * Provenance: reconstructed 2026-09-18 from the original certification script
 * (~/workspace/mc1-evidence/02-mc1-cert.js, attested 85/85 the same day).
 * Hardcoded paths and credentials were replaced with repo-relative resolution
 * and env-var configuration; the assertion sequence is unchanged.
 */
const assert = require('assert');
const { randomUUID } = require('crypto');
const { Pool } = require('pg');

const path = require('path');
const REPO = path.resolve(__dirname, '..', '..'); // repo root
const { UnifiedEventRuntime } = require(REPO + '/ping-runtime/events/unified_event_runtime.js');
const { LegacyIngressAdapter } = require(REPO + '/ping-runtime/events/legacy_ingress_adapter.js');
const { EventValidator } = require(REPO + '/ping-runtime/events/event_validator.js');
const { EventGovernance } = require(REPO + '/ping-runtime/events/event_governance.js');

const pool = new Pool({
  host: process.env.MC1_PGHOST || 'localhost',
  port: parseInt(process.env.MC1_PGPORT || '5433', 10),
  database: process.env.MC1_DBNAME || 'mc1_legacy_ingress_scratch',
  user: process.env.MC1_PGUSER || undefined,
  password: process.env.MC1_PGPASSWORD || undefined,
});

// MC-1 capability, minted exactly as gateway bootstrap does: one opaque
// object, handed to both runtime and adapter, compared by object identity.
const capability = Object.freeze({ surface: 'canonical_events', version: '1.0.0' });

let passed = 0;
let seq = 0;
function ok(name, cond, extra) {
  seq++;
  const id = 'MC1-' + String(seq).padStart(3, '0');
  assert(cond, `FAIL ${id}: ${name}${extra ? ' — ' + extra : ''}`);
  passed++;
  console.log(`  PASS ${id} ${name}`);
}

function deepObj(n) {
  const o = {};
  let cur = o;
  for (let i = 0; i < n; i++) { cur.x = {}; cur = cur.x; }
  return o;
}

async function insertRow(o = {}) {
  const row = {
    event_id: randomUUID(),
    event_type: 'legacy.invoice.created',
    event_version: '1.0.0',
    tenant_id: 'acme',
    timestamp: new Date('2026-09-10T12:00:00.000Z'),
    sequence: 7,
    source: 'tenantos-billing',
    actor: 'svc-billing',
    causation_id: null,
    correlation_id: randomUUID(),
    payload: { invoice_id: 'INV-1', amount: 100 },
    metadata: { producer: 'tenants' },
    processed: null, processed_at: null, worker: null, retries: null, last_error: null,
    created_at: new Date().toISOString(),
    ...o,
  };
  await pool.query(
    `INSERT INTO canonical_events
     (event_id, event_type, event_version, tenant_id, timestamp, sequence, source, actor,
      causation_id, correlation_id, payload, metadata, processed, processed_at, worker,
      retries, last_error, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$14,$15,$16,$17,$18)`,
    [row.event_id, row.event_type, row.event_version, row.tenant_id, row.timestamp,
     row.sequence, row.source, row.actor, row.causation_id, row.correlation_id,
     JSON.stringify(row.payload), JSON.stringify(row.metadata), row.processed,
     row.processed_at, row.worker, row.retries, row.last_error, row.created_at]
  );
  return row;
}

async function getRow(eventId) {
  const r = await pool.query('SELECT * FROM canonical_events WHERE event_id = $1', [eventId]);
  return r.rows[0];
}
async function pingEventsByIngress(ingressId) {
  const r = await pool.query(
    `SELECT * FROM ping_events WHERE metadata->>'original_event_id' = $1`, [ingressId]);
  return r.rows;
}
async function pingEventsCount() {
  const r = await pool.query('SELECT count(*)::int AS c FROM ping_events');
  return r.rows[0].c;
}

async function main() {
  // ---- setup ----
  // Schema is created by setup.sh (schema.sql). Preflight here so a missing
  // setup fails fast with a clear message instead of a confusing query error.
  const pre = await pool.query("SELECT to_regclass('public.canonical_events') AS t");
  assert(pre.rows[0].t !== null,
    'canonical_events missing: run setup.sh first (see README.md)');
  const prePing = await pool.query("SELECT to_regclass('public.ping_events') AS t");
  console.log('canonical_events present; ping_events will be ensured by runtime.initialize()'
    + (prePing.rows[0].t ? ' (exists)' : ' (absent)'));

  const validator = new EventValidator(REPO); validator.load();
  const governance = new EventGovernance(REPO); governance.load();
  console.log(`validator types=${validator.listEventTypes().length} (production registry)`);
  ok('production validator loaded', validator.listEventTypes().length === 233);

  const runtime = new UnifiedEventRuntime({ pool, eventValidator: validator, eventGovernance: governance,
    legacyIngressCapability: capability });
  await runtime.initialize();

  const adapter = new LegacyIngressAdapter({
    pool, eventRuntime: runtime, pollIntervalMs: 3600000, batchSize: 50, maxRetries: 3,
    legacyIngressCapability: capability,
  });
  await adapter.initialize();
  console.log('adapter initialized against canonical_events');

  // ---- T5a: validator is LIVE and flag-gated (F7-B interaction proof) ----
  const direct = await runtime.emit('legacy.invoice.created', 'direct-test', { a: 1 }, {});
  ok('direct emit of unregistered type rejected', direct.status === 'error' && direct.code === 'UNKNOWN_EVENT_TYPE', JSON.stringify(direct));
  ok('rejected direct emit minted no ID', !direct.eventId);
  ok('rejected direct emit persisted nothing', (await pingEventsCount()) === 0);

  // ---- T5c: the boolean bypass is dead; only the capability object works ----
  const boolBypass = await runtime.emit('legacy.bypass.test', 's', { a: 1 },
    { _legacyIngress: true, _skipGovernance: true });
  ok('T5c boolean _legacyIngress grants nothing', boolBypass.status === 'error'
    && boolBypass.code === 'UNKNOWN_EVENT_TYPE', JSON.stringify(boolBypass));
  const forged = await runtime.emit('legacy.bypass.test', 's', { a: 1 },
    { legacyIngressCapability: {}, _skipGovernance: true });
  ok('T5c forged capability object rejected', forged.status === 'error'
    && forged.code === 'UNKNOWN_EVENT_TYPE', JSON.stringify(forged));
  const realCap = await runtime.emit('legacy.capability.probe', 's', { a: 1 },
    { legacyIngressCapability: capability, _skipGovernance: true });
  ok('T5c genuine capability grants the narrow exception', realCap.status === 'ok' && /^event_[0-9a-f]{16}$/.test(realCap.eventId),
    JSON.stringify(realCap));
  const capBaseline = await pingEventsCount();

  // ---- T5b: REGISTERED legacy type uses the NORMAL path (no exception) ----
  const rowReg = await insertRow({ event_type: 'INVOICE_CREATED', tenant_id: 'acme',
    source: 'tenantos-billing', payload: { invoice_id: 'INV-REG', amount: 5 },
    created_at: new Date('2026-09-18T13:00:00.000Z').toISOString() });
  await adapter._poll();
  const stReg = await getRow(rowReg.event_id);
  ok('T5b registered type accepted', stReg.processed === true);
  ok('T5b registered type took the NORMAL path (no exception)',
    stReg.metadata.legacy_ingress.exception === 'none', JSON.stringify(stReg.metadata.legacy_ingress));
  ok('T5b registered type reached ping_events', (await pingEventsByIngress(rowReg.event_id)).length === 1);

  // ---- T5d: default-deny — adapter WITHOUT the capability fails closed ----
  const noCapAdapter = new LegacyIngressAdapter({
    pool, eventRuntime: runtime, pollIntervalMs: 3600000, batchSize: 50, maxRetries: 3,
  });
  await noCapAdapter.initialize();
  const rowNC = await insertRow({ event_type: 'legacy.nocap.test',
    created_at: new Date('2026-09-18T13:30:00.000Z').toISOString() });
  await noCapAdapter._poll();
  const stNC = await getRow(rowNC.event_id);
  ok('T5d no-capability adapter durably rejects unregistered type', stNC.metadata.legacy_ingress.disposition === 'REJECTED'
    && stNC.metadata.legacy_ingress.code === 'UNKNOWN_EVENT_TYPE', JSON.stringify(stNC.metadata.legacy_ingress));
  ok('T5d fail-closed row never reached ping_events', (await pingEventsByIngress(rowNC.event_id)).length === 0);

  // ---- T1: happy path, provenance, tenant, correlation ----
  const causationA = randomUUID(), correlationA = randomUUID();
  const rowA = await insertRow({ tenant_id: 'acme', source: 'tenantos-billing', actor: 'svc-billing',
    metadata: { region: 'west' }, causation_id: causationA, correlation_id: correlationA,
    created_at: new Date('2026-09-18T14:00:00.000Z').toISOString() });
  const rowB = await insertRow({ tenant_id: '', source: 'tenantos-crm', actor: 'svc-crm',
    event_type: 'legacy.customer.updated', payload: { customer: 'C-9' },
    created_at: new Date('2026-09-18T14:00:01.000Z').toISOString() });
  const rowC = await insertRow({ tenant_id: 'globex', source: 'tenantos-erp', processed: false,
    event_type: 'legacy.order.placed',
    created_at: new Date('2026-09-18T14:00:02.000Z').toISOString() });

  await adapter._poll();

  ok('T1 three rows accepted', (await pingEventsCount()) === capBaseline + 1 + 3);
  for (const [row, wantNs] of [[rowA, 'tenant::acme'], [rowB, 'core::system'], [rowC, 'tenant::globex']]) {
    const evs = await pingEventsByIngress(row.event_id);
    ok(`T1 exactly one canonical event for ${row.event_type}`, evs.length === 1);
    const ev = evs[0];
    ok('T1 V2 identity marker (event_<16hex>)', /^event_[0-9a-f]{16}$/.test(ev.event_id), ev.event_id);
    ok('T1 original source preserved (not overwritten)', ev.source === row.source, ev.source);
    ok('T1 tenant namespace resolved', ev.namespace === wantNs, ev.namespace);
    const md = ev.metadata;
    ok('T1 provenance: original_event_id', md.original_event_id === row.event_id);
    ok('T1 provenance: ingress_surface', md.ingress_surface === 'canonical_events');
    ok('T1 provenance: original_source', md.original_source === row.source);
    ok('T1 provenance: original_timestamp present', typeof md.original_timestamp === 'string' && !isNaN(Date.parse(md.original_timestamp)));
    ok('T1 provenance: actor preserved as claimed', md.actor === row.actor);
    ok('T1 provenance: tenant_id preserved', md.tenant_id === (row.tenant_id || null));
    const st = await getRow(row.event_id);
    ok('T1 ingress row ACCEPTED', st.processed === true && st.worker === 'legacy_ingress_adapter');
    ok('T1 forward correlation durable', st.metadata.legacy_ingress.disposition === 'ACCEPTED'
      && st.metadata.legacy_ingress.canonical_event_id === ev.event_id);
    ok('T1 unregistered type took the capability exception path',
      st.metadata.legacy_ingress.exception === 'registry_compat', JSON.stringify(st.metadata.legacy_ingress));
  }
  const evA = (await pingEventsByIngress(rowA.event_id))[0];
  ok('T1 original metadata nested intact', evA.metadata.original_metadata.region === 'west');
  ok('T1 causation passthrough', evA.metadata.causation_id === causationA);
  ok('T1 correlation passthrough', evA.metadata.correlation_id === correlationA);
  ok('T1 canonical timestamp is acceptance time (not original)',
    new Date(evA.timestamp).getTime() > new Date('2026-09-18T00:00:00Z').getTime());

  // ---- T2: idempotent re-poll (no dupes, no cursor needed) ----
  const before = await pingEventsCount();
  await adapter._poll();
  ok('T2 re-poll mints nothing new', (await pingEventsCount()) === before);

  // ---- T3: deterministic rejection (F7/D1 depth) — no silent loss, no HOL blocking ----
  const rowD = await insertRow({ event_type: 'legacy.ok.d', created_at: new Date('2026-09-18T15:00:00.000Z').toISOString() });
  const rowE = await insertRow({ event_type: 'legacy.bad.deep', payload: deepObj(70),
    created_at: new Date('2026-09-18T15:00:01.000Z').toISOString() });
  const rowF = await insertRow({ event_type: 'legacy.ok.f', created_at: new Date('2026-09-18T15:00:02.000Z').toISOString() });
  await adapter._poll();
  const stE = await getRow(rowE.event_id);
  ok('T3 poison row durably REJECTED', stE.metadata.legacy_ingress.disposition === 'REJECTED'
    && stE.metadata.legacy_ingress.code === 'IDENTITY_VALUE_REJECTED', JSON.stringify(stE.metadata.legacy_ingress));
  ok('T3 rejection is NOT acceptance', stE.processed === false);
  ok('T3 rejected row never reached ping_events', (await pingEventsByIngress(rowE.event_id)).length === 0);
  ok('T3 rows around the poison row still accepted (no head-of-line block)',
    (await pingEventsByIngress(rowD.event_id)).length === 1 && (await pingEventsByIngress(rowF.event_id)).length === 1);
  const workAfter = await adapter._selectWorkRows();
  ok('T3 rejected row excluded from future work (not retried forever)', workAfter.length === 0);
  await adapter._poll();
  ok('T3 second poll still mints nothing for rejected row', (await pingEventsByIngress(rowE.event_id)).length === 0);

  // ---- T3b: transient failure -> RETRYABLE -> RETRY_EXHAUSTED (durable, visible) ----
  const rowH = await insertRow({ event_type: 'legacy.flaky.h', created_at: new Date('2026-09-18T16:00:00.000Z').toISOString() });
  const origMark = adapter._markAccepted.bind(adapter);
  adapter._markAccepted = async () => { throw new Error('simulated downstream outage'); };
  await adapter._poll(); // emit ok, mark throws -> retryable
  let stH = await getRow(rowH.event_id);
  ok('T3b transient failure recorded as RETRYABLE', stH.processed === false && stH.retries === 1
    && String(stH.last_error).startsWith('ADAPTER_THROW'), stH.last_error);
  await adapter._poll(); // retries=2
  await adapter._poll(); // attempts hit max -> RETRY_EXHAUSTED
  stH = await getRow(rowH.event_id);
  ok('T3b exhausted retries become durable REJECTED', stH.metadata.legacy_ingress.disposition === 'REJECTED'
    && stH.metadata.legacy_ingress.code === 'RETRY_EXHAUSTED', JSON.stringify(stH.metadata.legacy_ingress));
  ok('T3b rejection not confused with acceptance', stH.processed === false);
  const evH = await pingEventsByIngress(rowH.event_id);
  ok('T3b idempotent re-emit produced exactly one canonical row', evH.length === 1);
  adapter._markAccepted = origMark;

  // ---- T4: restart mid-batch with fresh instances (no in-memory progress to lose) ----
  const rids = [];
  for (let i = 0; i < 5; i++) {
    const r = await insertRow({ event_type: 'legacy.restart.r' + i,
      created_at: new Date(`2026-09-18T17:00:0${i}.000Z`).toISOString() });
    rids.push(r.event_id);
  }
  const countBefore = await pingEventsCount();
  for (let k = 0; k < 3; k++) {
    const a = new LegacyIngressAdapter({ pool, eventRuntime: runtime, pollIntervalMs: 3600000, batchSize: 2, maxRetries: 3, legacyIngressCapability: capability });
    await a.initialize();
    await a._poll(); // fresh memory every poll: proves no cursor state is needed
  }
  ok('T4 all 5 rows accepted across restarts', (await pingEventsCount()) === countBefore + 5);
  for (const id of rids) {
    const st = await getRow(id);
    ok('T4 row durable ACCEPTED', st.processed === true);
    ok('T4 exactly one canonical event per ingress row', (await pingEventsByIngress(id)).length === 1);
  }
  const a4 = new LegacyIngressAdapter({ pool, eventRuntime: runtime, pollIntervalMs: 3600000, batchSize: 2, maxRetries: 3, legacyIngressCapability: capability });
  ok('T4 no work remains after convergence', (await a4._selectWorkRows()).length === 0);
  const cur = await pool.query(`SELECT to_regclass('public.ping_bridge_cursors') AS t`);
  ok('T4 no cursor table created/used', cur.rows[0].t === null);

  // ---- T6: malformed tenant is fail-closed, never silently collapsed ----
  const rowT = await insertRow({ event_type: 'legacy.bad.tenant', tenant_id: 'bad tenant!!',
    created_at: new Date('2026-09-18T18:00:00.000Z').toISOString() });
  await adapter._poll();
  const stT = await getRow(rowT.event_id);
  ok('T6 invalid tenant REJECTED', stT.metadata.legacy_ingress.disposition === 'REJECTED'
    && stT.metadata.legacy_ingress.code === 'INVALID_TENANT_NAMESPACE');
  ok('T6 rejected row not persisted', (await pingEventsByIngress(rowT.event_id)).length === 0);
  ok('T6 rejection not confused with acceptance', stT.processed === false);

  // ---- T7: state counts + stats ----
  const counts = await adapter.getIngressStateCounts();
  const total = await pool.query('SELECT count(*)::int AS c FROM canonical_events').then(r => r.rows[0].c);
  ok('T7 counts reconcile', Number(counts.accepted) + Number(counts.rejected) === total
    && Number(counts.unprocessed) === 0 && Number(counts.retryable) === 0,
    JSON.stringify(counts));
  const stats = adapter.getStats();
  ok('T7 stats shape', stats.adapter === 'LegacyIngressAdapter' && stats.surface === 'canonical_events'
    && typeof stats.accepted === 'number' && typeof stats.rejected === 'number');

  console.log(`\nCERT_PASS ${passed} assertions`);
  await pool.end();
}

main().catch(async (e) => {
  console.error('CERT_FAIL', e);
  try { await pool.end(); } catch (_) {}
  process.exit(1);
});
