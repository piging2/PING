/**
 * MC-1 certification harness: LegacyIngressAdapter convergence assertions.
 *
 * What this certifies: the MC-1 convergence path from the legacy ingress
 * surface (canonical_events) into canonical acceptance through
 * UnifiedEventRuntime.emit() and ping_events.
 *
 * Components under test (real repository code, no reimplementation):
 *   - ping-runtime/events/legacy_ingress_adapter.js  (LegacyIngressAdapter)
 *   - ping-runtime/events/unified_event_runtime.js    (UnifiedEventRuntime)
 *   - ping-runtime/authorities/identity_authority.js  (identityAuthority, via shim)
 *   - gateway/event_repository.js                     (EventRepository, via kernel shim)
 *
 * Test doubles (documented, minimal, behavior-only):
 *   - eventValidator:  records isRegistered(type) calls; membership is scripted
 *                      per scenario. The runtime only uses registration checks.
 *   - eventGovernance: records validateEvent(event) calls; returns valid or a
 *                      scripted throw / rejection. Used to inject deterministic
 *                      transient failures and governance violations.
 * Everything else (adapter state machine, runtime emit, identity, persistence,
 * namespace resolution, capability check) is the real implementation.
 *
 * Env (no hardcoded credentials; all required unless noted):
 *   PGHOST (default 127.0.0.1), PGPORT (default 5433)
 *   PGDATABASE, PGRUNTIME_USER, PGRUNTIME_PASSWORD
 *   PGLEGACY_USER, PGLEGACY_PASSWORD
 *   PGADMIN_USER (default crx_user), PGADMIN_PASSWORD
 *
 * Usage: ./run.sh   (sources the setup-generated env file, then runs this)
 */
'use strict';

const crypto = require('crypto');
const { Pool } = require('pg');
const { LegacyIngressAdapter } = require('../../ping-runtime/events/legacy_ingress_adapter');
const { UnifiedEventRuntime } = require('../../ping-runtime/events/unified_event_runtime');
const { EventRepository } = require('../../gateway/event_repository');
const { identityAuthority } = require('../../ping-runtime/authorities/identity_authority');
const {
  createReporter, makeAssert, makeExpectDenial, loud, deepEqual,
} = require('./lib/assert');

const reporter = createReporter();
const assert = makeAssert(reporter.record);
const expectDenial = makeExpectDenial(reporter.record);

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`assertions: missing required env ${name}`);
    process.exit(2);
  }
  return v;
}

const ENV = {
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5433),
  database: required('PGDATABASE'),
  runtimeUser: required('PGRUNTIME_USER'),
  runtimePassword: required('PGRUNTIME_PASSWORD'),
  legacyUser: required('PGLEGACY_USER'),
  legacyPassword: required('PGLEGACY_PASSWORD'),
  adminUser: process.env.PGADMIN_USER || 'crx_user',
  adminPassword: required('PGADMIN_PASSWORD'),
};

function makePool(user, password, database) {
  return new Pool({
    host: ENV.host, port: ENV.port,
    database: database || ENV.database,
    user, password, max: 5,
  });
}

const pool = makePool(ENV.runtimeUser, ENV.runtimePassword);       // adapter + runtime role
const legacyPool = makePool(ENV.legacyUser, ENV.legacyPassword);    // legacy producer role
const adminPool = makePool(ENV.adminUser, ENV.adminPassword);      // privileged checks only

/* ------------------------------------------------------------------ */
/* Capability mint: exact replica of gateway/bootstrap/gateway_runtime.js
 *   const legacyIngressCapability = Object.freeze({ surface: 'canonical_events', version: '1.0.0' });
 * handed ONLY to UnifiedEventRuntime and the allowlisted LegacyIngressAdapter.
 */
function mintBootstrapCapability() {
  return Object.freeze({ surface: 'canonical_events', version: '1.0.0' });
}

/* ------------------------- test doubles --------------------------- */
function makeValidator() {
  const types = new Set();
  const calls = [];
  return {
    types,
    calls,
    register(type) { types.add(type); },
    isRegistered(type) { calls.push(type); return types.has(type); },
  };
}

function makeGovernance() {
  const calls = [];
  const behaviors = new Map(); // type -> 'valid' | { throw } | { code, error } | fn(event)
  return {
    calls,
    setBehavior(type, b) { behaviors.set(type, b); },
    validateEvent(event) {
      calls.push({ event_type: event.event_type, namespace: event.namespace });
      const b = behaviors.get(event.event_type);
      if (!b || b === 'valid') return { valid: true };
      if (typeof b === 'function') return b(event);
      if (b.throw) throw b.throw;
      return { valid: false, code: b.code, error: b.error };
    },
  };
}

/** Build one wired scenario: real runtime + real adapter, stub validator/governance.
 *  opts.capability: 'mint' (default) | 'none' | <capability object to present>
 */
function makeScenario(opts = {}) {
  const capOpt = opts.capability === undefined ? 'mint' : opts.capability;
  const capability = capOpt === 'mint' ? mintBootstrapCapability() : (capOpt === 'none' ? undefined : capOpt);
  const validator = makeValidator();
  const governance = makeGovernance();
  const runtime = new UnifiedEventRuntime({
    pool,
    eventValidator: validator,
    eventGovernance: governance,
    integrationManager: null,
    legacyIngressCapability: capability,
  });
  const adapter = new LegacyIngressAdapter({
    pool,
    eventRuntime: runtime,
    legacyIngressCapability: capability,
    pollIntervalMs: 60000,
    batchSize: 50,
    maxRetries: opts.maxRetries || 5,
  });
  return { capability, validator, governance, runtime, adapter };
}

/* ------------------------- ingress fixtures ------------------------ */
const seqByTenant = new Map();
function nextSeq(tenant) {
  const n = (seqByTenant.get(tenant) || 0) + 1;
  seqByTenant.set(tenant, n);
  return n;
}

/** Insert one legacy ingress row into canonical_events. Returns the fixture. */
async function insertIngressRow(f = {}, client) {
  const c = client || pool;
  const tenant = f.tenant !== undefined ? f.tenant : 'acme';
  const row = {
    event_id: crypto.randomUUID(),
    event_type: f.type || 'mc1.registered',
    tenant,
    timestamp: f.timestamp || new Date().toISOString(),
    sequence: f.sequence !== undefined ? f.sequence : nextSeq(tenant),
    source: f.source || 'mc1-source',
    actor: f.actor || 'mc1-actor',
    causationId: f.causationId || null,
    correlationId: f.correlationId || null,
    payload: f.payload !== undefined ? f.payload : { n: 1 },
    metadata: { ...(f.metadata || {}), mc1_group: f.group || 'misc' },
  };
  await c.query(
    `INSERT INTO canonical_events
       (event_id, event_type, tenant_id, timestamp, sequence, source, actor,
        causation_id, correlation_id, payload, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [row.event_id, row.event_type, row.tenant, row.timestamp, row.sequence,
     row.source, row.actor, row.causationId, row.correlationId,
     JSON.stringify(row.payload), JSON.stringify(row.metadata)]
  );
  return row;
}

/* ------------------------- convergence drivers --------------------- */
/** One deterministic poll: _poll() with stats diff (never starts the timer). */
async function pollOnce(adapter) {
  const before = adapter.getStats();
  await adapter._poll();
  const after = adapter.getStats();
  return {
    polls: after.polls - before.polls,
    accepted: after.accepted - before.accepted,
    rejected: after.rejected - before.rejected,
    retried: after.retried - before.retried,
  };
}

/** Drive a single row through _convergeRow (used when the payload must be
 *  mutated in ways SQL JSONB cannot express, e.g. the F7 illegal value). */
async function convergeRowWithPayload(adapter, eventId, payload) {
  const r = await pool.query('SELECT * FROM canonical_events WHERE event_id = $1', [eventId]);
  const row = r.rows[0];
  row.payload = payload;
  await adapter._convergeRow(row);
}

/* ------------------------- state readers --------------------------- */
/** Durable row state, using the same disposition semantics as the adapter's
 *  getIngressStateCounts(): REJECTED/ACCEPTED from the marker, RETRYABLE from
 *  last_error, UNPROCESSED otherwise. */
async function rowState(eventId) {
  const r = await pool.query(
    `SELECT processed, retries, last_error, tenant_id,
            metadata->'legacy_ingress'->>'disposition' AS li_disposition,
            metadata->'legacy_ingress'->>'canonical_event_id' AS li_canonical,
            metadata->'legacy_ingress'->>'exception' AS li_exception
     FROM canonical_events WHERE event_id = $1`, [eventId]);
  const row = r.rows[0];
  if (!row) throw new Error(`rowState: no canonical_events row for ${eventId}`);
  let disposition = row.li_disposition || (row.last_error ? 'RETRYABLE' : 'UNPROCESSED');
  let namespace = null;
  if (row.li_canonical) {
    const c = await pool.query('SELECT namespace FROM ping_events WHERE event_id = $1', [row.li_canonical]);
    namespace = c.rows[0] ? c.rows[0].namespace : null;
  }
  return {
    disposition,
    dispositionStored: row.li_disposition || null,
    processed: row.processed,
    canonicalId: row.li_canonical || null,
    exception: row.li_exception || null,
    namespace,
    tenantStored: row.tenant_id,
    attempts: row.retries,
    error: row.last_error,
  };
}

async function countDispositions(group) {
  const where = group ? 'WHERE metadata->>\'mc1_group\' = $1' : '';
  const args = group ? [group] : [];
  const r = await pool.query(
    `SELECT CASE
       WHEN metadata->'legacy_ingress'->>'disposition' = 'ACCEPTED' THEN 'ACCEPTED'
       WHEN metadata->'legacy_ingress'->>'disposition' = 'REJECTED' THEN 'REJECTED'
       WHEN last_error IS NOT NULL THEN 'RETRYABLE'
       ELSE 'UNPROCESSED' END AS d,
     COUNT(*) AS n
     FROM canonical_events ${where} GROUP BY 1`, args);
  const m = { ACCEPTED: 0, REJECTED: 0, RETRYABLE: 0, UNPROCESSED: 0 };
  for (const row of r.rows) m[row.d] = Number(row.n);
  return m;
}

async function canonicalIdsForIngress(eventId) {
  const r = await pool.query(
    `SELECT event_id FROM ping_events WHERE metadata->>'original_event_id' = $1`, [eventId]);
  return r.rows.map((x) => x.event_id);
}

async function countCanonicalForGroup(group) {
  const r = await pool.query(
    `SELECT COUNT(*) AS n FROM ping_events p
     WHERE EXISTS (SELECT 1 FROM canonical_events c
                   WHERE c.metadata->>'mc1_group' = $1
                     AND p.metadata->>'original_event_id' = c.event_id::text)`, [group]);
  return Number(r.rows[0].n);
}

async function countCanonicalAll() {
  const r = await pool.query('SELECT COUNT(*) AS n FROM ping_events');
  return Number(r.rows[0].n);
}

/** Canonical rows carrying ingress provenance (converged by the adapter). */
async function countIngressCorrelatedCanonical() {
  const r = await pool.query(
    `SELECT COUNT(*) AS n FROM ping_events WHERE metadata->>'original_event_id' IS NOT NULL`);
  return Number(r.rows[0].n);
}

async function countIngressAll() {
  const r = await pool.query('SELECT COUNT(*) AS n FROM canonical_events');
  return Number(r.rows[0].n);
}

async function duplicateCanonicalIds() {
  const r = await pool.query(
    'SELECT event_id, COUNT(*) AS n FROM ping_events GROUP BY event_id HAVING COUNT(*) > 1');
  return r.rows;
}

async function canonicalRow(canonicalId) {
  const r = await pool.query(
    'SELECT event_id, event_type, source, namespace, timestamp, payload, metadata FROM ping_events WHERE event_id = $1',
    [canonicalId]);
  return r.rows[0] || null;
}

async function cursorTableExists() {
  const r = await pool.query(
    `SELECT COUNT(*) AS n FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%cursor%'`);
  return Number(r.rows[0].n) > 0;
}

/* ================================================================== */
async function groupS() {
  // S: scratch environment is fresh, isolated, and least-privileged.
  const dbCheck = makePool(ENV.adminUser, ENV.adminPassword, 'postgres');
  try {
    const r = await dbCheck.query('SELECT 1 FROM pg_database WHERE datname = $1', [ENV.database]);
    assert(r.rows.length === 1, 'S01', 'scratch database exists', () => `pg_database has no ${ENV.database}`);
  } finally {
    await dbCheck.end();
  }

  const tables = ['canonical_events', 'ping_events', 'repository_events'];
  const missing = [];
  for (const t of tables) {
    const r = await pool.query(
      'SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2',
      ['public', t]);
    if (r.rows.length !== 1) missing.push(t);
  }
  assert(missing.length === 0, 'S02', 'scratch tables exist (canonical_events, ping_events, repository_events)',
    () => `missing: ${missing.join(', ')}`);

  const nonEmpty = [];
  for (const t of tables) {
    const r = await pool.query(`SELECT COUNT(*) AS n FROM ${t}`);
    if (Number(r.rows[0].n) !== 0) nonEmpty.push(`${t}=${r.rows[0].n}`);
  }
  assert(nonEmpty.length === 0, 'S03', 'scratch tables start empty',
    () => `non-empty: ${nonEmpty.join(', ')}`);

  const su = await adminPool.query('SELECT usesuper FROM pg_user WHERE usename = $1', [ENV.legacyUser]);
  assert(su.rows.length === 1 && su.rows[0].usesuper === false,
    'S04', 'legacy producer role is not a superuser',
    () => `pg_user row for ${ENV.legacyUser}: ${JSON.stringify(su.rows[0])}`);

  const g = await adminPool.query(
    `SELECT table_name, privilege_type FROM information_schema.role_table_grants
     WHERE grantee = $1 AND table_schema = 'public'
       AND table_name IN ('ping_events', 'repository_events')
       AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')`,
    [ENV.legacyUser]);
  assert(g.rows.length === 0, 'S05', 'legacy role holds no write privileges on canonical tables',
    () => `unexpected grants: ${JSON.stringify(g.rows)}`);

  const cur = await cursorTableExists();
  assert(cur === false, 'S06', 'no cursor table exists anywhere in the scratch schema');
}

/* ================================================================== */
async function groupC() {
  // C: capability gating. The allowlist is the bootstrap wiring: the exact
  // capability object is handed ONLY to UnifiedEventRuntime and the
  // allowlisted LegacyIngressAdapter. Unknown/unsafe callers fail closed.

  // C01: the allowlisted adapter (genuine capability) converges a registered row.
  {
    const s = makeScenario();
    s.validator.register('mc1.registered');
    const f = await insertIngressRow({ group: 'c', type: 'mc1.registered', tenant: 'acme' });
    const d = await pollOnce(s.adapter);
    const st = await rowState(f.event_id);
    assert(d.polls === 1 && d.accepted === 1 && st.disposition === 'ACCEPTED' && st.processed === true,
      'C01', 'allowlisted caller with genuine capability converges a registered row',
      () => `delta=${JSON.stringify(d)} state=${JSON.stringify(st)}`);
  }

  // C02: no capability at all -> unregistered type fails closed (durable REJECTED).
  {
    const s = makeScenario({ capability: 'none' });
    const f = await insertIngressRow({ group: 'c', type: 'mc1.probe-unregistered', tenant: 'acme' });
    await pollOnce(s.adapter);
    const st = await rowState(f.event_id);
    const canon = await canonicalIdsForIngress(f.event_id);
    assert(st.disposition === 'REJECTED' && st.processed === false && loud(st.error, 'UNKNOWN_EVENT_TYPE') && canon.length === 0,
      'C02', 'caller without the capability fails closed on unregistered types',
      () => `state=${JSON.stringify(st)} canonical=${canon.length}`);
  }

  // C03: forged capability (same shape, different identity) is not honored.
  // The runtime holds the bootstrap-minted object; the adapter presents a clone.
  {
    const genuine = mintBootstrapCapability();
    const forged = mintBootstrapCapability();
    const validator = makeValidator();
    const governance = makeGovernance();
    const runtime = new UnifiedEventRuntime({
      pool, eventValidator: validator, eventGovernance: governance,
      integrationManager: null, legacyIngressCapability: genuine,
    });
    const adapter = new LegacyIngressAdapter({
      pool, eventRuntime: runtime, legacyIngressCapability: forged,
      pollIntervalMs: 60000, batchSize: 50, maxRetries: 5,
    });
    const f = await insertIngressRow({ group: 'c', type: 'mc1.probe-unregistered', tenant: 'acme' });
    await pollOnce(adapter);
    const st = await rowState(f.event_id);
    assert(st.disposition === 'REJECTED' && loud(st.error, 'UNKNOWN_EVENT_TYPE'),
      'C03', 'forged capability (shape-equal, identity-different) grants no exception',
      () => `state=${JSON.stringify(st)}`);
  }

  // C04: forgeable boolean flags without the capability grant nothing.
  {
    const s = makeScenario({ capability: 'none' });
    const res = await s.runtime.emit('mc1.probe-unregistered', 'mc1-source', { n: 1 },
      { _legacyIngress: true, _skipGovernance: true });
    assert(res.status === 'error' && res.code === 'UNKNOWN_EVENT_TYPE',
      'C04', 'boolean _legacyIngress/_skipGovernance flags are ignored without the capability',
      () => `emit returned ${JSON.stringify(res)}`);
  }

  // C05: _skipGovernance without the capability does not skip governance.
  {
    const s = makeScenario({ capability: 'none' });
    s.validator.register('mc1.gov-violation');
    s.governance.setBehavior('mc1.gov-violation',
      { code: 'GOVERNANCE_VIOLATION', error: 'policy denies mc1.gov-violation' });
    const res = await s.runtime.emit('mc1.gov-violation', 'mc1-source', { n: 1 }, { _skipGovernance: true });
    assert(res.status === 'error' && res.code === 'GOVERNANCE_VIOLATION',
      'C05', 'governance still enforced when _skipGovernance is passed without the capability',
      () => `emit returned ${JSON.stringify(res)}`);
  }

  // C06: the exception is bound to the capability OBJECT, not the adapter class:
  // a direct emit presenting the genuine object receives the documented exception.
  {
    const s = makeScenario();
    const res = await s.runtime.emit('mc1.probe-unregistered', 'mc1-source', { n: 1 },
      { legacyIngressCapability: s.capability, _skipGovernance: true });
    assert(res.status === 'ok' && typeof res.eventId === 'string' && res.eventId.length > 0,
      'C06', 'genuine capability object grants the documented exception to its holder',
      () => `emit returned ${JSON.stringify(res)}`);
  }

  // C07: every fail-closed rejection above carries a machine-readable code.
  {
    const r = await pool.query(
      `SELECT last_error FROM canonical_events
       WHERE metadata->>'mc1_group' = 'c'
         AND metadata->'legacy_ingress'->>'disposition' = 'REJECTED'`);
    const ok = r.rows.length >= 2
      && r.rows.every((x) => typeof x.last_error === 'string' && /^[A-Z_]+: /.test(x.last_error));
    assert(ok, 'C07', 'fail-closed rejections carry machine-readable codes',
      () => `rows=${JSON.stringify(r.rows)}`);
  }

  // C08: the minted capability is frozen and has the exact bootstrap shape.
  {
    const cap = mintBootstrapCapability();
    assert(Object.isFrozen(cap) && cap.surface === 'canonical_events' && cap.version === '1.0.0',
      'C08', 'capability mint matches bootstrap exactly and is frozen',
      () => `cap=${JSON.stringify(cap)} frozen=${Object.isFrozen(cap)}`);
  }
}

/* ================================================================== */
async function groupN() {
  // N: normal-path acceptance of a registered legacy event type.
  const s = makeScenario();
  s.validator.register('mc1.registered');
  const f = await insertIngressRow({ group: 'n', type: 'mc1.registered', tenant: 'acme', payload: { n: 7 } });
  const d = await pollOnce(s.adapter);
  const st = await rowState(f.event_id);

  const validatorSaw = s.validator.calls.includes('mc1.registered');
  const governanceSaw = s.governance.calls.some((c) => c.event_type === 'mc1.registered');
  assert(validatorSaw && governanceSaw && st.exception === 'none' && st.disposition === 'ACCEPTED',
    'N01', 'registered type accepted through the normal validator/governance path',
    () => `validatorSaw=${validatorSaw} governanceSaw=${governanceSaw} state=${JSON.stringify(st)}`);

  assert(st.namespace === 'tenant::acme',
    'N02', 'namespace resolved to tenant::acme on the canonical row',
    () => `namespace=${st.namespace}`);

  const canon = st.canonicalId ? await canonicalRow(st.canonicalId) : null;
  assert(!!canon && canon.event_id === st.canonicalId && canon.event_type === 'mc1.registered',
    'N03', 'canonical row exists in ping_events and matches the acceptance marker',
    () => `canonicalId=${st.canonicalId} row=${JSON.stringify(canon && canon.event_id)}`);

  assert(st.disposition === 'ACCEPTED' && st.processed === true && d.accepted === 1 && d.polls === 1,
    'N04', 'durable state: ACCEPTED, processed TRUE, exactly one poll delivery',
    () => `delta=${JSON.stringify(d)} state=${JSON.stringify(st)}`);

  const ids = await canonicalIdsForIngress(f.event_id);
  assert(ids.length === 1 && ids[0] === st.canonicalId,
    'N05', 'exactly one canonical row per accepted ingress row',
    () => `ids=${JSON.stringify(ids)}`);

  const c = await countDispositions('n');
  assert(c.ACCEPTED === 1 && c.REJECTED === 0 && c.RETRYABLE === 0 && c.UNPROCESSED === 0,
    'N06', 'group dispositions reconcile: 1 ACCEPTED, nothing else',
    () => `counts=${JSON.stringify(c)}`);
}

/* ================================================================== */
async function groupR() {
  // R: the documented registry compatibility exception (phase 2).
  const s = makeScenario(); // 'mc1.compat-unregistered' is NOT registered
  s.validator.register('mc1.registered');

  const f = await insertIngressRow({ group: 'r', type: 'mc1.compat-unregistered', tenant: 'acme' });
  await pollOnce(s.adapter);
  const st = await rowState(f.event_id);

  assert(st.disposition === 'ACCEPTED' && st.exception === 'registry_compat' && st.processed === true,
    'R01', 'unregistered type converges via the capability-bound exception, marked registry_compat',
    () => `state=${JSON.stringify(st)}`);

  const ids = await canonicalIdsForIngress(f.event_id);
  assert(ids.length === 1 && ids[0] === st.canonicalId,
    'R02', 'compatibility-accepted row still yields exactly one canonical row',
    () => `ids=${JSON.stringify(ids)}`);

  const direct = await s.runtime.emit('mc1.probe-unregistered', 'mc1-source', { n: 1 }, {});
  assert(direct.status === 'error' && direct.code === 'UNKNOWN_EVENT_TYPE',
    'R03', 'direct unregistered emit without the capability is still rejected',
    () => `emit returned ${JSON.stringify(direct)}`);

  // R04: the exception covers registry-membership ONLY; the F7 value-domain
  // boundary still applies on the phase-2 path.
  const bad = await insertIngressRow({ group: 'r', type: 'mc1.compat-bad', tenant: 'acme' });
  await convergeRowWithPayload(s.adapter, bad.event_id, { v: NaN });
  const stBad = await rowState(bad.event_id);
  const canonBad = await canonicalIdsForIngress(bad.event_id);
  assert(stBad.disposition === 'REJECTED' && loud(stBad.error, 'IDENTITY_VALUE_REJECTED') && canonBad.length === 0,
    'R04', 'compatibility path does not except the F7 value-domain boundary',
    () => `state=${JSON.stringify(stBad)} canonical=${canonBad.length}`);

  // R05/R06 pin the exact exception semantics: phase 1 exits at the validator
  // gate (governance never consulted); phase 2 skips both the validator and
  // governance under the capability-bound exception.
  const valCalls = s.validator.calls.filter((t) => t === 'mc1.compat-unregistered').length;
  assert(valCalls === 1,
    'R05', 'validator consulted exactly once for the compat type (phase-1 gate; skipped in phase 2)',
    () => `validator calls for type: ${valCalls}`);
  const govCalls = s.governance.calls.filter((c) => c.event_type === 'mc1.compat-unregistered').length;
  assert(govCalls === 0,
    'R06', 'governance never consulted for the compat type (phase 1 exits early; phase 2 excepts it)',
    () => `governance calls for type: ${govCalls}`);
}

/* ================================================================== */
async function groupP() {
  // P: provenance preservation from the ingress row to the canonical event.
  const s = makeScenario();
  s.validator.register('mc1.registered');
  const causationId = crypto.randomUUID();
  const correlationId = crypto.randomUUID();
  const f = await insertIngressRow({
    group: 'p', type: 'mc1.registered', tenant: 'acme',
    source: 'mc1-source', actor: 'mc1-actor',
    timestamp: '2026-09-18T12:00:00.000Z',
    causationId, correlationId,
    payload: { n: 42 }, metadata: { note: 'p-group' },
  });
  await pollOnce(s.adapter);
  const st = await rowState(f.event_id);
  assert(st.disposition === 'ACCEPTED' && st.canonicalId, 'P00', 'provenance fixture accepted',
    () => `state=${JSON.stringify(st)}`);
  const canon = await canonicalRow(st.canonicalId);
  const md = (canon && canon.metadata) || {};

  assert(canon && canon.source === f.source,
    'P01', 'canonical source preserves the true ingress origin',
    () => `source=${canon && canon.source}`);
  assert(md.original_timestamp === new Date(f.timestamp).toISOString(),
    'P02', 'original timestamp preserved in canonical metadata',
    () => `original_timestamp=${md.original_timestamp}`);
  assert(deepEqual(md.original_metadata, { note: 'p-group', mc1_group: 'p' }),
    'P03', 'original metadata preserved verbatim in canonical metadata',
    () => `original_metadata=${JSON.stringify(md.original_metadata)}`);
  // pg returns BIGINT as a string; the adapter stores row.sequence verbatim.
  assert(md.original_sequence === String(f.sequence),
    'P04', 'original sequence preserved in canonical metadata',
    () => `original_sequence=${JSON.stringify(md.original_sequence)} fixture=${f.sequence}`);
  assert(md.tenant_id === 'acme' && canon.namespace === 'tenant::acme',
    'P05', 'tenant preserved in canonical metadata and namespace',
    () => `tenant_id=${md.tenant_id} namespace=${canon && canon.namespace}`);
  assert(md.actor === 'mc1-actor',
    'P06', 'actor preserved as provenance in canonical metadata',
    () => `actor=${md.actor}`);
  assert(md.event_version === '1.0.0',
    'P07', 'event version preserved in canonical metadata',
    () => `event_version=${md.event_version}`);
  assert(md.causation_id === causationId,
    'P08', 'causation id carried onto the canonical event',
    () => `causation_id=${md.causation_id}`);
  assert(md.correlation_id === correlationId,
    'P09', 'correlation id carried onto the canonical event',
    () => `correlation_id=${md.correlation_id}`);
}

/* ================================================================== */
async function groupT() {
  // T: malformed tenant -> fail closed, no head-of-line blocking.
  const s = makeScenario();
  s.validator.register('mc1.registered');
  const good1 = await insertIngressRow({ group: 't', type: 'mc1.registered', tenant: 'acme' });
  const bad = await insertIngressRow({ group: 't', type: 'mc1.registered', tenant: '!!! not a tenant :::' });
  const good2 = await insertIngressRow({ group: 't', type: 'mc1.registered', tenant: 'acme' });
  const d = await pollOnce(s.adapter);
  const stBad = await rowState(bad.event_id);
  const stG1 = await rowState(good1.event_id);
  const stG2 = await rowState(good2.event_id);

  assert(stBad.disposition === 'REJECTED' && stBad.processed === false,
    'T01', 'malformed tenant row is durably REJECTED, processed stays FALSE',
    () => `state=${JSON.stringify(stBad)}`);
  assert(loud(stBad.error, 'INVALID_TENANT_NAMESPACE'),
    'T02', 'rejection code is INVALID_TENANT_NAMESPACE',
    () => `last_error=${stBad.error}`);
  const canonBad = await canonicalIdsForIngress(bad.event_id);
  assert(canonBad.length === 0,
    'T03', 'malformed tenant row yields no canonical row',
    () => `canonical=${canonBad.length}`);
  assert(d.polls === 1 && d.accepted === 2 && d.rejected === 1
    && stG1.disposition === 'ACCEPTED' && stG2.disposition === 'ACCEPTED',
    'T04', 'no head-of-line blocking: sibling rows still converge',
    () => `delta=${JSON.stringify(d)} g1=${stG1.disposition} g2=${stG2.disposition}`);
  assert(typeof stBad.error === 'string' && stBad.error.includes('!!! not a tenant :::'),
    'T05', 'rejection reason names the offending tenant for forensics',
    () => `last_error=${stBad.error}`);
}

/* ================================================================== */
async function groupF() {
  // F: F7 illegal value (NaN) -> deterministic rejection, no head-of-line blocking.
  // NaN cannot be stored in a JSONB column, so the row is inserted legally and
  // the illegal value is introduced at the _convergeRow boundary, exactly where
  // the identity authority would see it.
  const s = makeScenario();
  s.validator.register('mc1.registered');
  const sibling = await insertIngressRow({ group: 'f', type: 'mc1.registered', tenant: 'acme' });
  await pollOnce(s.adapter);
  const stSibling = await rowState(sibling.event_id);

  const f7row = await insertIngressRow({ group: 'f', type: 'mc1.registered', tenant: 'acme' });
  await convergeRowWithPayload(s.adapter, f7row.event_id, { v: NaN });
  const st = await rowState(f7row.event_id);

  assert(st.disposition === 'REJECTED' && loud(st.error, 'IDENTITY_VALUE_REJECTED'),
    'F01', 'F7 illegal value is deterministically rejected with IDENTITY_VALUE_REJECTED',
    () => `state=${JSON.stringify(st)}`);
  assert(st.processed === false,
    'F02', 'rejected F7 row leaves processed FALSE (durable, never retried as new)',
    () => `processed=${st.processed}`);
  const canon = await canonicalIdsForIngress(f7row.event_id);
  assert(canon.length === 0,
    'F03', 'F7-rejected row mints no canonical event ID and persists nothing',
    () => `canonical=${canon.length}`);
  assert(stSibling.disposition === 'ACCEPTED',
    'F04', 'no head-of-line blocking: sibling row converged normally',
    () => `sibling=${stSibling.disposition}`);
  assert(typeof st.error === 'string' && st.error.startsWith('IDENTITY_VALUE_REJECTED:'),
    'F05', 'F7 rejection code is machine-readable',
    () => `last_error=${st.error}`);
  assert(st.attempts === 0,
    'F06', 'deterministic rejection does not consume retry attempts',
    () => `retries=${st.attempts}`);
}

/* ================================================================== */
async function groupI() {
  // I: idempotent re-poll of an accepted row.
  const s = makeScenario();
  s.validator.register('mc1.registered');
  const f = await insertIngressRow({ group: 'i', type: 'mc1.registered', tenant: 'acme' });
  await pollOnce(s.adapter);
  const st0 = await rowState(f.event_id);
  await pollOnce(s.adapter);
  await pollOnce(s.adapter);
  const st = await rowState(f.event_id);

  const ids = await canonicalIdsForIngress(f.event_id);
  assert(ids.length === 1 && ids[0] === st0.canonicalId,
    'I01', 're-poll creates no second canonical row',
    () => `ids=${JSON.stringify(ids)}`);
  assert(st.disposition === 'ACCEPTED' && st.processed === true,
    'I02', 'disposition stays ACCEPTED across re-polls',
    () => `state=${JSON.stringify(st)}`);
  assert(st.canonicalId === st0.canonicalId,
    'I03', 'canonical_event_id marker is unchanged across re-polls',
    () => `before=${st0.canonicalId} after=${st.canonicalId}`);
  const dupes = await duplicateCanonicalIds();
  assert(dupes.length === 0,
    'I04', 'no duplicate canonical IDs exist after re-poll',
    () => `dupes=${JSON.stringify(dupes)}`);
}

/* ================================================================== */
async function groupY() {
  // Y: transient failure -> RETRYABLE -> recovery, and retry exhaustion.
  const s = makeScenario({ maxRetries: 5 });
  s.validator.register('mc1.flaky');
  s.validator.register('mc1.always-fails');
  let flakyCalls = 0;
  s.governance.setBehavior('mc1.flaky', () => {
    flakyCalls += 1;
    if (flakyCalls === 1) throw new Error('transient boom');
    return { valid: true };
  });
  s.governance.setBehavior('mc1.always-fails', () => { throw new Error('persistent boom'); });

  const flaky = await insertIngressRow({ group: 'y', type: 'mc1.flaky', tenant: 'acme' });
  await pollOnce(s.adapter);
  const stR = await rowState(flaky.event_id);
  assert(stR.disposition === 'RETRYABLE' && stR.processed === false,
    'Y01', 'transient failure leaves the row RETRYABLE with processed FALSE',
    () => `state=${JSON.stringify(stR)}`);
  assert(stR.attempts === 1,
    'Y02', 'retry attempt counter increments exactly once per failed poll',
    () => `retries=${stR.attempts}`);
  assert(loud(stR.error, 'EMIT_THROW'),
    'Y03', 'transient failure recorded as EMIT_THROW',
    () => `last_error=${stR.error}`);

  await pollOnce(s.adapter);
  const stA = await rowState(flaky.event_id);
  assert(stA.disposition === 'ACCEPTED' && stA.processed === true,
    'Y04', 'retry after a transient failure converges to ACCEPTED',
    () => `state=${JSON.stringify(stA)}`);
  const ids = await canonicalIdsForIngress(flaky.event_id);
  assert(ids.length === 1 && ids[0] === stA.canonicalId,
    'Y05', 'exactly one canonical row exists despite the retry',
    () => `ids=${JSON.stringify(ids)}`);
  const dupes = await duplicateCanonicalIds();
  assert(dupes.length === 0,
    'Y06', 'no duplicate canonical IDs after retry recovery',
    () => `dupes=${JSON.stringify(dupes)}`);

  // Exhaustion: a permanently failing row must reach a terminal state.
  const always = await insertIngressRow({ group: 'y', type: 'mc1.always-fails', tenant: 'acme' });
  await pollOnce(s.adapter);
  const stFirst = await rowState(always.event_id);
  assert(stFirst.disposition === 'RETRYABLE' && stFirst.processed === false
    && loud(stFirst.error, 'EMIT_THROW') && stFirst.attempts === 1,
    'Y07', 'persistent failure starts RETRYABLE with processed FALSE',
    () => `state=${JSON.stringify(stFirst)}`);
  let stE = stFirst;
  for (let i = 0; i < 10 && stE.disposition !== 'REJECTED'; i += 1) {
    await pollOnce(s.adapter);
    stE = await rowState(always.event_id);
  }
  assert(stE.disposition === 'REJECTED' && stE.processed === false
    && loud(stE.error, 'RETRY_EXHAUSTED') && stE.attempts === 4,
    'Y08', 'retry exhaustion is terminal: REJECTED, processed FALSE, attempts stop at maxRetries - 1',
    () => `state=${JSON.stringify(stE)}`);
  const canonE = await canonicalIdsForIngress(always.event_id);
  assert(canonE.length === 0,
    'Y09', 'exhausted row yields no canonical row',
    () => `canonical=${canonE.length}`);
}

/* ================================================================== */
async function groupM() {
  // M: several fresh adapter instances converge rows with no cursor state.
  const s = makeScenario();
  s.validator.register('mc1.registered');
  const extraPools = [];
  const mkAdapter = () => {
    const p = makePool(ENV.runtimeUser, ENV.runtimePassword);
    extraPools.push(p);
    return new LegacyIngressAdapter({
      pool: p,
      eventRuntime: s.runtime,
      legacyIngressCapability: s.capability,
      pollIntervalMs: 60000, batchSize: 50, maxRetries: 5,
    });
  };
  const adapters = [mkAdapter(), mkAdapter(), mkAdapter()];
  const rows = [];
  for (let i = 0; i < 5; i += 1) {
    rows.push(await insertIngressRow({ group: 'm', type: 'mc1.registered', tenant: 'acme' }));
  }
  await adapters[0]._poll();
  await adapters[1]._poll();
  await adapters[2]._poll();

  const c = await countDispositions('m');
  assert(c.ACCEPTED === 5,
    'M01', 'five rows accepted across three fresh adapter instances',
    () => `counts=${JSON.stringify(c)}`);
  const states = await Promise.all(rows.map((f) => rowState(f.event_id)));
  assert(states.every((st) => st.processed === true),
    'M02', 'every row durably processed TRUE',
    () => `states=${JSON.stringify(states.map((st) => st.processed))}`);
  const cc = await countCanonicalForGroup('m');
  assert(cc === 5,
    'M03', 'exactly five canonical rows for the five ingress rows',
    () => `canonical=${cc}`);
  const dupes = await duplicateCanonicalIds();
  assert(dupes.length === 0,
    'M04', 'no duplicate canonical IDs across instances',
    () => `dupes=${JSON.stringify(dupes)}`);
  assert(c.UNPROCESSED === 0 && c.RETRYABLE === 0,
    'M05', 'zero rows left unprocessed or retryable',
    () => `counts=${JSON.stringify(c)}`);
  assert(c.ACCEPTED + c.REJECTED + c.RETRYABLE + c.UNPROCESSED === 5,
    'M06', 'instance-group dispositions reconcile to the inserted total',
    () => `counts=${JSON.stringify(c)}`);
  for (const p of extraPools) {
    await p.end();
  }
}

/* ================================================================== */
async function groupD() {
  // D: direct legacy writes to canonical tables are prohibited; the sanctioned
  // ingress surface (canonical_events INSERT) is the only write path.
  const denied = /permission denied|insufficient privilege/i;

  await expectDenial(
    legacyPool.query(`INSERT INTO ping_events (event_id, event_type) VALUES ('x','y')`),
    'D01', 'legacy role cannot write directly to ping_events',
    (e) => denied.test(e.message));

  await expectDenial(
    legacyPool.query(`INSERT INTO repository_events (event_id) VALUES ('x')`),
    'D02', 'legacy role cannot write directly to repository_events',
    (e) => denied.test(e.message));

  const probe = await insertIngressRow({ group: 'd', type: 'mc1.registered', tenant: 'acme' });
  await expectDenial(
    legacyPool.query('UPDATE canonical_events SET processed = TRUE WHERE event_id = $1', [probe.event_id]),
    'D03', 'legacy role cannot mutate convergence state on canonical_events',
    (e) => denied.test(e.message));

  // D04/D05: the sanctioned surface works end to end.
  const f = await insertIngressRow({ group: 'd', type: 'mc1.registered', tenant: 'acme' }, legacyPool);
  const stInserted = await rowState(f.event_id);
  assert(stInserted.disposition === 'UNPROCESSED',
    'D04', 'legacy role can INSERT into canonical_events (the sanctioned ingress surface)',
    () => `state=${JSON.stringify(stInserted)}`);

  const s = makeScenario();
  s.validator.register('mc1.registered');
  await pollOnce(s.adapter);
  const st = await rowState(f.event_id);
  assert(st.disposition === 'ACCEPTED' && st.processed === true,
    'D05', 'sanctioned ingress row converges to ACCEPTED through the adapter',
    () => `state=${JSON.stringify(st)}`);
}

/* ================================================================== */
async function groupE() {
  // E: EventRepository writes reference the already-accepted canonical event.
  // The constitutional rule ("new EventRepository writes must reference an
  // already-accepted canonical event") is enforced by a fail-closed code
  // gate inside appendEvent (2026-09-19): _verifyCanonicalAcceptance looks
  // up ping_events before any repository_events insert and throws
  // UnanchoredCanonicalWriteError (code EVENT_REPOSITORY_UNANCHORED_WRITE)
  // on missing or unverifiable prior acceptance. This group pins both the
  // positive path (write referencing an accepted event succeeds, exact
  // reference stored) and the negative path (write without prior
  // acceptance fails closed, no row inserted).
  const s = makeScenario();
  s.validator.register('mc1.registered');
  const f = await insertIngressRow({ group: 'e', type: 'mc1.registered', tenant: 'acme' });
  await pollOnce(s.adapter);
  const st = await rowState(f.event_id);
  assert(st.disposition === 'ACCEPTED' && st.canonicalId, 'E00', 'event accepted before repository write',
    () => `state=${JSON.stringify(st)}`);

  const repo = new EventRepository(pool);
  await repo.initialize();
  // NOTE (product defect, not worked around silently): runtimeIdentityAuthority
  // .initialize() throws CANONICALIZATION_ERROR on Node 22 because
  // _generateFingerprint() includes `http_parser: process.versions.http_parser`
  // (undefined on modern Node) and the canonical serializer rejects undefined.
  // See IMPLEMENTATION_NOTES.md. Nothing in the repo calls initialize() today,
  // so production callers must supply an explicit RuntimeID, as this suite does.
  const RUNTIME_ID = 'mc1-harness-runtime/1';
  const canonicalEventHash = crypto.createHash('sha256').update(st.canonicalId).digest('hex');
  // In-repo convention (constitutional_execution_pipeline.js): the repository
  // row carries event_id = the canonical event's ID and pins its hash.
  const write = {
    event_id: st.canonicalId,
    object_id: 'mc1-obj-1',
    event_type: 'mc1.projected',
    aggregate_type: 'mc1',
    sequence: 1,
    payload: { ref: st.canonicalId },
    timestamp: Date.now(),
    authority: 'mc1-harness',
    authority_version: '1.0.0',
    RuntimeID: RUNTIME_ID,
    correlation_id: st.canonicalId,
    CanonicalEventHash: canonicalEventHash,
  };
  let appendErr = null;
  try {
    await repo.appendEvent(write, {});
  } catch (e) {
    appendErr = e;
  }
  assert(appendErr === null,
    'E01', 'repository write referencing the accepted canonical event succeeds',
    () => `appendEvent threw: ${appendErr && appendErr.message}`);

  const r = await pool.query(
    'SELECT correlation_id, CanonicalEventHash AS "CanonicalEventHash" FROM repository_events WHERE object_id = $1',
    ['mc1-obj-1']);
  assert(r.rows.length === 1 && r.rows[0].correlation_id === st.canonicalId,
    'E02', 'stored repository row references exactly the accepted canonical event ID',
    () => `row=${JSON.stringify(r.rows[0])}`);
  assert(r.rows.length === 1 && r.rows[0].CanonicalEventHash === canonicalEventHash,
    'E03', 'stored canonical event hash is exact',
    () => `row=${JSON.stringify(r.rows[0])}`);

  // Negative path: the code gate must fail closed for an unaccepted
  // canonical event id, before any repository insert.
  let gateErr = null;
  try {
    await repo.appendEvent({
      event_id: 'evt_mc1_unanchored',
      object_id: 'mc1-obj-negative',
      event_type: 'mc1.projected',
      aggregate_type: 'mc1',
      sequence: 1,
      payload: { ref: 'mc1-never-accepted' },
      timestamp: Date.now(),
      authority: 'mc1-harness',
      authority_version: '1.0.0',
      RuntimeID: RUNTIME_ID,
      canonical_event_id: 'mc1-never-accepted',
      CanonicalEventHash: crypto.createHash('sha256').update('mc1-never-accepted').digest('hex'),
    }, {});
  } catch (e) {
    gateErr = e;
  }
  assert(gateErr !== null && gateErr.code === 'EVENT_REPOSITORY_UNANCHORED_WRITE',
    'E04', 'repository write without prior acceptance fails closed with typed code',
    () => `threw=${gateErr && gateErr.code}`);

  const rn = await pool.query(
    'SELECT COUNT(*) AS n FROM repository_events WHERE object_id = $1',
    ['mc1-obj-negative']);
  assert(Number(rn.rows[0].n) === 0,
    'E05', 'no repository row inserted after a failed acceptance gate',
    () => `count=${rn.rows[0].n}`);
}

/* ================================================================== */
async function groupX() {
  // X: namespace handling, via the real _resolveNamespace and durable rows.
  const probe = new LegacyIngressAdapter({});

  const ns1 = probe._resolveNamespace({ tenant_id: 'acme' });
  const ns1b = probe._resolveNamespace({ tenant_id: 'acme' });
  assert(ns1.ok === true && ns1.namespace === 'tenant::acme' && deepEqual(ns1, ns1b),
    'X01', 'tenant namespace resolves deterministically to tenant::<id>',
    () => `result=${JSON.stringify(ns1)}`);

  const ns2 = probe._resolveNamespace({ tenant_id: null });
  assert(ns2.ok === true && ns2.namespace === 'core::system',
    'X02', 'absent tenant resolves to core::system (never silently collapsed from a bad tenant)',
    () => `result=${JSON.stringify(ns2)}`);

  const s = makeScenario();
  s.validator.register('mc1.registered');
  const f = await insertIngressRow({ group: 'x', type: 'mc1.registered', tenant: 'acme' });
  await pollOnce(s.adapter);
  const st = await rowState(f.event_id);
  const canon = st.canonicalId ? await canonicalRow(st.canonicalId) : null;
  assert(st.namespace === 'tenant::acme' && canon && canon.namespace === 'tenant::acme',
    'X03', 'resolved namespace is durable on the canonical event row',
    () => `state-ns=${st.namespace} row-ns=${canon && canon.namespace}`);

  const nsBad = probe._resolveNamespace({ tenant_id: 'bad tenant!' });
  assert(nsBad.ok === false && /does not form a valid canonical namespace/.test(nsBad.reason || ''),
    'X04', 'malformed tenant fails namespace resolution with a forensic reason',
    () => `result=${JSON.stringify(nsBad)}`);
}

/* ================================================================== */
async function groupZ() {
  // Z: deterministic canonical IDs via the real identityAuthority.
  const idA = identityAuthority.generateId('event',
    { event_type: 'mc1.z', source: 's', namespace: 'tenant::acme', payload: { n: 1 } });
  const idB = identityAuthority.generateId('event',
    { event_type: 'mc1.z', source: 's', namespace: 'tenant::acme', payload: { n: 1 } });
  assert(idA === idB && /^event_[0-9a-f]{16}$/.test(idA),
    'Z01', 'same identity material always mints the same canonical ID',
    () => `a=${idA} b=${idB}`);

  const idC = identityAuthority.generateId('event',
    { event_type: 'mc1.z', source: 's', namespace: 'tenant::acme', payload: { n: 2 } });
  assert(idC !== idA,
    'Z02', 'different payload mints a different canonical ID',
    () => `a=${idA} c=${idC}`);

  // Z03: the accepted canonical ID equals the recomputed deterministic ID,
  // including the adapter-owned ingress identity keys (_canonical_event_id,
  // _tenant_id, _actor) that are part of the identity input.
  const s = makeScenario();
  s.validator.register('mc1.registered');
  const f = await insertIngressRow({
    group: 'z', type: 'mc1.registered', tenant: 'acme',
    source: 'mc1-source', actor: 'mc1-actor', payload: { n: 3 },
  });
  await pollOnce(s.adapter);
  const st = await rowState(f.event_id);
  const recomputed = identityAuthority.generateId('event', {
    event_type: 'mc1.registered',
    source: 'mc1-source',
    namespace: 'tenant::acme',
    payload: {
      n: 3,
      _canonical_event_id: String(f.event_id),
      _tenant_id: 'acme',
      _actor: 'mc1-actor',
    },
  });
  assert(st.disposition === 'ACCEPTED' && st.canonicalId === recomputed,
    'Z03', 'accepted canonical ID equals the independently recomputed deterministic ID',
    () => `stored=${st.canonicalId} recomputed=${recomputed}`);

  let threw = null;
  try {
    identityAuthority.generateId('event',
      { event_type: 't', source: 's', namespace: 'tenant::acme', payload: { v: NaN } });
  } catch (e) {
    threw = e;
  }
  assert(threw !== null && /CANONICALIZATION/i.test(threw.message),
    'Z04', 'F7 illegal value throws at the identity boundary before any ID exists',
    () => (threw ? `threw: ${threw.message.slice(0, 80)}` : 'did not throw'));
}

/* ================================================================== */
async function groupV() {
  // V: durable state-machine details across all converged rows.
  const acc = await pool.query(
    `SELECT event_id, processed, retries,
            metadata->'legacy_ingress'->>'disposition' AS disposition,
            metadata->'legacy_ingress'->>'canonical_event_id' AS canonical_event_id,
            metadata->'legacy_ingress'->>'exception' AS exception
     FROM canonical_events
     WHERE metadata->'legacy_ingress'->>'disposition' = 'ACCEPTED'`);
  const rej = await pool.query(
    `SELECT event_id, processed, retries, last_error,
            metadata->'legacy_ingress'->>'disposition' AS disposition
     FROM canonical_events
     WHERE metadata->'legacy_ingress'->>'disposition' = 'REJECTED'`);

  const v01 = acc.rows.length > 0 && acc.rows.every((r) =>
    r.processed === true && r.disposition === 'ACCEPTED' && !!r.canonical_event_id);
  assert(v01, 'V01', 'every ACCEPTED row: processed TRUE, disposition stored, canonical_event_id present',
    () => `accepted=${acc.rows.length}`);

  const v02 = rej.rows.length > 0 && rej.rows.every((r) =>
    r.processed === false && r.disposition === 'REJECTED');
  assert(v02, 'V02', 'every REJECTED row: processed FALSE (explicit, never NULL)',
    () => `rejected=${rej.rows.length} sample=${JSON.stringify(rej.rows[0])}`);

  const exh = await pool.query(
    `SELECT retries, last_error, processed FROM canonical_events
     WHERE metadata->>'mc1_group' = 'y' AND event_type = 'mc1.always-fails'`);
  const e = exh.rows[0] || {};
  assert(exh.rows.length === 1 && e.processed === false && e.retries === 4
    && loud(e.last_error, 'RETRY_EXHAUSTED'),
    'V03', 'exhausted row: terminal, processed FALSE, attempts frozen at maxRetries - 1',
    () => `row=${JSON.stringify(e)}`);

  const v04 = rej.rows.every((r) => typeof r.last_error === 'string' && /^[A-Z_]+: /.test(r.last_error));
  assert(v04, 'V04', 'every REJECTED row carries a deterministic CODE-prefixed last_error',
    () => `rejected=${rej.rows.length}`);

  const v05ok = acc.rows.every((r) => r.exception === 'none' || r.exception === 'registry_compat');
  assert(v05ok, 'V05', 'every ACCEPTED row records its exception class (none | registry_compat)',
    () => `sample=${JSON.stringify(acc.rows.slice(0, 3).map((r) => r.exception))}`);
}

/* ================================================================== */
async function groupG() {
  // G: final reconciliation over the whole scratch database.
  const total = await countIngressAll();
  const d = await countDispositions();
  assert(d.ACCEPTED + d.REJECTED + d.RETRYABLE + d.UNPROCESSED === total && total > 0,
    'G01', 'every ingress row is in exactly one disposition bucket',
    () => `counts=${JSON.stringify(d)} total=${total}`);

  const cc = await countIngressCorrelatedCanonical();
  assert(cc === d.ACCEPTED,
    'G02', 'ingress-correlated canonical rows equal ACCEPTED rows (no strays, none missing)',
    () => `canonical=${cc} accepted=${d.ACCEPTED}`);

  const dupes = await duplicateCanonicalIds();
  assert(dupes.length === 0,
    'G03', 'no duplicate canonical IDs in the final database',
    () => `dupes=${JSON.stringify(dupes)}`);

  assert(d.UNPROCESSED === 0,
    'G04', 'no row left UNPROCESSED at the end of the run',
    () => `unprocessed=${d.UNPROCESSED}`);

  assert(d.RETRYABLE === 0,
    'G05', 'no row left RETRYABLE at the end of the run (all reached terminal dispositions)',
    () => `retryable=${d.RETRYABLE}`);
}

/* ================================================================== */
async function main() {
  const t0 = Date.now();
  try {
    await groupS();
    await groupC();
    await groupN();
    await groupR();
    await groupP();
    await groupT();
    await groupF();
    await groupI();
    await groupY();
    await groupM();
    await groupD();
    await groupE();
    await groupX();
    await groupZ();
    await groupV();
    await groupG();
  } catch (e) {
    reporter.record('FATAL', 'harness aborted with an exception', false,
      (e && e.stack) || String(e));
  } finally {
    await pool.end().catch(() => {});
    await legacyPool.end().catch(() => {});
    await adminPool.end().catch(() => {});
  }
  const s = reporter.summary();
  console.log(`MC1 ELAPSED ms=${Date.now() - t0}`);
  if (s.fail > 0) process.exitCode = 1;
}

main();
