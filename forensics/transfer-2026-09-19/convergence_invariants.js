#!/usr/bin/env node
'use strict';
/* Phase 3/4/5/8/9/10 convergence invariant tests (2026-09-19).
 *
 * Real PostgreSQL only: self-contained scratch database on the w1a scratch
 * container (127.0.0.1:15439), created and dropped by this harness. Never
 * touches shared stores.
 *
 * Env: PGHOST (default 127.0.0.1), PGPORT (default 15439),
 *      PGUSER (default postgres), PGPASSWORD (required).
 *
 * Invariants under test:
 *   T0  contract reflects the converged role (no stale identity-minting claims)
 *   T8  legacy bridge converges pre-migration (metadata-only marking fallback)
 *   T1  one logical event -> one canonical identity across both tables
 *   T2  cross-reference round-trip both directions by explicit identity
 *   T3  retry with same identity is idempotent (no duplicate row, no redispatch)
 *   T4  conflicting content under same identity fails closed
 *   T5  envelope never remints identity on the converged path
 *   T6  legacy bridge convergence post-migration (explicit identity roles)
 *   T7  consistency model B: coordinator requires commit; rebuild restores
 *
 * Exit 0 = all pass; exit 1 = any fail (DB left in place for forensics).
 */

const path = require('path');
const fs = require('fs');

const R = path.resolve(__dirname, '..', '..');

let pg;
try { pg = require('pg'); } catch (e) {
  pg = require('/home/nolan/worktrees/constitutional-convergence/tests/mc1-legacy-ingress/node_modules/pg');
}
const { Pool } = pg;

const { UnifiedEventRuntime } = require(path.join(R, 'ping-runtime/events/unified_event_runtime.js'));
const { CanonicalEventEnvelope } = require(path.join(R, 'gateway/canonical_event_envelope.js'));
const { LegacyIngressAdapter } = require(path.join(R, 'ping-runtime/events/legacy_ingress_adapter.js'));
const {
  deriveEnvelopeId, canonicalEventHash, ENVELOPE_VERSION, CONVERGED_ERA,
} = require(path.join(R, 'ping-runtime/events/convergence_identity.js'));
const {
  deriveRepresentationAfterCommit, rebuildMissingRepresentations, auditCrossReferences,
} = require(path.join(R, 'ping-runtime/events/convergence_derivation.js'));

const PGHOST = process.env.PGHOST || '127.0.0.1';
const PGPORT = parseInt(process.env.PGPORT || '15439', 10);
const PGUSER = process.env.PGUSER || 'postgres';
const PGPASSWORD = process.env.PGPASSWORD;
if (!PGPASSWORD) { console.error('FATAL: PGPASSWORD is required'); process.exit(2); }

const NONCE = Date.now().toString(36);
const DB = 'conv_3_5_' + NONCE.replace(/[^a-z0-9]/g, '');

let pass = 0, fail = 0;
function check(cond, name, detail) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}
function note(msg) { console.log(msg); }

const adminPool = () => {
  const p = new Pool({ host: PGHOST, port: PGPORT, user: PGUSER, password: PGPASSWORD, database: 'postgres', connectionTimeoutMillis: 8000 });
  p.on('error', () => {});
  return p;
};
const dbPool = () => {
  const p = new Pool({ host: PGHOST, port: PGPORT, user: PGUSER, password: PGPASSWORD, database: DB, connectionTimeoutMillis: 8000 });
  p.on('error', () => {});
  return p;
};
const readFile = (rel) => fs.readFileSync(path.join(R, rel), 'utf8');
const baseSchemaSql = () => readFile('database/canonical_events.sql');
const migrationSql = () => readFile('database/migrations/2026-09-19_event_authority_convergence.sql');

async function hasColumn(pool, name) {
  const r = await pool.query(
    "SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='canonical_events' AND column_name=$1",
    [name]
  );
  return r.rowCount > 0;
}

async function main() {
  // ---- setup: scratch database ----
  const admin = adminPool();
  await admin.query(`CREATE DATABASE "${DB}"`);
  await admin.end();
  const pool = dbPool();
  note('scratch database: ' + DB);

  const uer = new UnifiedEventRuntime({ pool, eventValidator: null, eventGovernance: null });
  await uer.initialize();

  // Base schema only (pre-migration) for T8.
  await pool.query(baseSchemaSql());
  check(await hasColumn(pool, 'event_id'), 'T8-setup base schema applied');
  check(!(await hasColumn(pool, 'source_event_id')), 'T8-setup convergence columns absent pre-migration');

  const envelopePre = new CanonicalEventEnvelope(pool, { repoRoot: R });

  // ---- T8: legacy bridge converges pre-migration (metadata-only fallback) ----
  note('T8: adapter pre-migration fallback');
  const legacyPre = await envelopePre.executeEmitEvent({
    tenantId: 'acme', eventType: 'project.created', source: 'hpp-api',
    actor: 'owner-1', payload: { name: 'T8 roof job' },
  });
  check(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(legacyPre.event_id),
    'T8 legacy path still mints ingress UUID pre-migration', legacyPre.event_id);
  const adapterPre = new LegacyIngressAdapter({ pool, eventRuntime: uer, pollIntervalMs: 60000, batchSize: 10, maxRetries: 3 });
  await adapterPre.initialize();
  check(adapterPre._hasConvergenceColumns === false, 'T8 adapter probes missing columns and selects fallback');
  await adapterPre._convergeBatch();
  const preRow = (await pool.query('SELECT * FROM canonical_events WHERE event_id=$1', [legacyPre.event_id])).rows[0];
  check(preRow.processed === true, 'T8 legacy row converged pre-migration');
  check(!!(preRow.metadata && preRow.metadata.legacy_ingress && preRow.metadata.legacy_ingress.canonical_event_id),
    'T8 metadata marks canonical_event_id pre-migration');
  check(preRow.metadata.legacy_ingress.canonical_event_id !== legacyPre.event_id,
    'T8 canonical identity is distinct from receipt identity (not silent)');
  const prePing = await pool.query('SELECT event_id FROM ping_events WHERE event_id=$1',
    [preRow.metadata.legacy_ingress.canonical_event_id]);
  check(prePing.rowCount === 1, 'T8 authoritative commit exists in ping_events');

  // ---- production DDL path: envelope.initialize() applies base + migration, idempotent ----
  note('DDL: envelope.initialize() applies additive migration');
  const envelope = new CanonicalEventEnvelope(pool, { repoRoot: R });
  await envelope.initialize();
  await envelope.initialize(); // second run must be a safe no-op
  check(await hasColumn(pool, 'source_event_id'), 'DDL source_event_id column exists');
  check(await hasColumn(pool, 'envelope_id'), 'DDL envelope_id column exists');
  const idType = await pool.query(
    "SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='canonical_events' AND column_name='event_id'");
  check(idType.rows[0].data_type === 'text', 'DDL event_id widened to text', idType.rows[0].data_type);
  const seqNull = await pool.query(
    "SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='canonical_events' AND column_name='sequence'");
  check(seqNull.rows[0].is_nullable === 'YES', 'DDL sequence nullable');

  // ---- T0: contract reflects converged role ----
  note('T0: contract');
  const contract = envelope.publishContract();
  check(contract.version === '2.0.0' && contract.authority_version === '2.0.0', 'T0 contract version 2.0.0');
  check(contract.guarantees.includes('identity_preserved'), 'T0 guarantees identity_preserved');
  check(!contract.guarantees.includes('deterministic_id'), 'T0 no longer claims identity minting');
  check(contract.invariants.some((i) => i.includes('never mints logical event identity')),
    'T0 invariants state the no-remint law');

  // ---- T1: one logical event -> one canonical identity across both tables ----
  note('T1: one logical event, one canonical identity');
  let hookCalls = 0;
  const onDerived = async () => { hookCalls++; };
  const emit1 = await uer.emit('CONVERGENCE_TEST', 'convergence-harness', { order: 1 },
    { namespace: 'tenant::acme', logical_id: 'conv-t1-' + NONCE });
  check(emit1.status === 'ok', 'T1 authoritative commit ok', emit1.status);
  check(/^event_/.test(emit1.eventId), 'T1 canonical identity is event_<hex>', emit1.eventId);
  const acc1 = await envelope.acceptCanonicalEvent(emit1.event, { onDerived });
  check(acc1.status === 'ok' && acc1.inserted === true, 'T1 derivation inserted', JSON.stringify(acc1).slice(0, 200));
  check(hookCalls === 1, 'T1 downstream hook fired once');
  const row1 = (await pool.query('SELECT * FROM canonical_events WHERE source_event_id=$1', [emit1.eventId])).rows[0];
  check(!!row1, 'T1 representation row exists by source_event_id');
  check(row1.event_id === emit1.eventId, 'T1 row event_id carries the canonical identity (not reminted)');
  check(row1.source_event_id === emit1.eventId, 'T1 source_event_id = canonical identity');
  check(row1.envelope_id === deriveEnvelopeId(emit1.eventId), 'T1 envelope_id deterministic from canonical identity');
  check(row1.envelope_id !== emit1.eventId, 'T1 envelope_id != canonical event_id (standing distinction)');
  check(row1.metadata.envelope.era === CONVERGED_ERA, 'T1 era marker converged');
  check(row1.metadata.envelope.envelope_version === ENVELOPE_VERSION, 'T1 envelope version');
  check(row1.metadata.envelope.canonical_hash === canonicalEventHash(emit1.event),
    'T1 stored canonical hash matches');
  check(Number(row1.sequence) === emit1.sequence, 'T1 row carries canonical log position, not receipt order');
  check(row1.tenant_id === 'tenant::acme', 'T1 tenant_id carries canonical namespace');
  const ping1 = (await pool.query('SELECT event_id FROM ping_events WHERE event_id=$1', [emit1.eventId])).rows[0];
  check(!!ping1 && ping1.event_id === row1.event_id, 'T1 one identity across both tables');

  // ---- T2: cross-reference round-trip both directions ----
  note('T2: cross-reference round-trip');
  const bySource = await envelope.getRepresentationBySourceEventId(emit1.eventId);
  check(!!bySource && bySource.event_id === emit1.eventId, 'T2 by source_event_id');
  const byEnvelope = await envelope.getRepresentationByEnvelopeId(bySource.envelope_id);
  check(!!byEnvelope && byEnvelope.source_event_id === emit1.eventId && byEnvelope.event_id === bySource.event_id,
    'T2 by envelope_id resolves to the same row');
  const rev = await pool.query(
    'SELECT c.event_id FROM canonical_events c WHERE c.source_event_id = (SELECT p.event_id FROM ping_events p WHERE p.event_id=$1)',
    [emit1.eventId]);
  check(rev.rows[0] && rev.rows[0].event_id === emit1.eventId, 'T2 ping_events -> canonical_events by explicit identity');

  // ---- T3: retry with same identity is idempotent ----
  note('T3: idempotent retry');
  const acc2 = await envelope.acceptCanonicalEvent(emit1.event, { onDerived });
  check(acc2.status === 'ok' && acc2.inserted === false && acc2.deduped === true, 'T3 same object retry deduped');
  check(hookCalls === 1, 'T3 no duplicate downstream dispatch on retry');
  // UER-level retry: same logical identity, new observation timestamp -> same logical content -> idempotent
  const emit1b = await uer.emit('CONVERGENCE_TEST', 'convergence-harness', { order: 1 },
    { namespace: 'tenant::acme', logical_id: 'conv-t1-' + NONCE });
  check(emit1b.eventId === emit1.eventId, 'T3 UER dedups same logical event');
  const acc3 = await envelope.acceptCanonicalEvent(emit1b.event, { onDerived });
  check(acc3.status === 'ok' && acc3.inserted === false, 'T3 re-emitted logical event deduped (timestamp is not identity)');
  check(hookCalls === 1, 'T3 still exactly one downstream dispatch');
  const cnt1 = await pool.query('SELECT COUNT(*)::int AS c FROM canonical_events WHERE source_event_id=$1', [emit1.eventId]);
  check(cnt1.rows[0].c === 1, 'T3 exactly one envelope row per canonical identity');

  // ---- T4: conflicting content under same identity fails closed ----
  note('T4: conflict fails closed');
  const tampered = Object.assign({}, emit1.event, { payload: { order: 999 } });
  const acc4 = await envelope.acceptCanonicalEvent(tampered, { onDerived });
  check(acc4.status === 'error' && acc4.code === 'CONVERGENCE_IDENTITY_CONFLICT',
    'T4 deterministic rejection', acc4.code);
  check(hookCalls === 1, 'T4 no downstream dispatch on conflict');
  const rowAfter = (await pool.query('SELECT payload FROM canonical_events WHERE source_event_id=$1', [emit1.eventId])).rows[0];
  const payloadAfter = typeof rowAfter.payload === 'string' ? JSON.parse(rowAfter.payload) : rowAfter.payload;
  check(payloadAfter.order === 1, 'T4 certified representation not mutated');
  const cntAfter = await pool.query('SELECT COUNT(*)::int AS c FROM canonical_events WHERE source_event_id=$1', [emit1.eventId]);
  check(cntAfter.rows[0].c === 1, 'T4 no duplicate row on conflict');

  // ---- T5: envelope never remints on the converged path ----
  note('T5: never remints');
  let remintCalls = 0, seqCalls = 0;
  const origGen = envelope.generateEventId.bind(envelope);
  const origSeq = envelope.getNextSequence.bind(envelope);
  envelope.generateEventId = (...a) => { remintCalls++; return origGen(...a); };
  envelope.getNextSequence = async (...a) => { seqCalls++; return origSeq(...a); };
  const emit5 = await uer.emit('CONVERGENCE_TEST', 'convergence-harness', { k: 5 },
    { namespace: 'core::system', logical_id: 'conv-t5-' + NONCE });
  const acc5 = await envelope.acceptCanonicalEvent(emit5.event);
  check(acc5.status === 'ok' && acc5.representation.canonical_event_id === emit5.eventId,
    'T5 representation carries the carried identity');
  check(remintCalls === 0 && seqCalls === 0, 'T5 generateEventId/getNextSequence never called on converged path');
  envelope.generateEventId = origGen; envelope.getNextSequence = origSeq;

  // ---- T6: legacy bridge convergence post-migration (explicit identity roles) ----
  note('T6: adapter post-migration');
  const legacy2 = await envelope.executeEmitEvent({
    tenantId: 'acme', eventType: 'project.created', source: 'hpp-api',
    actor: 'owner-1', payload: { name: 'T6 roof job' },
  });
  const countCanonical = async () =>
    (await pool.query("SELECT COUNT(*)::int AS c FROM ping_events WHERE metadata->>'ingress_surface'='canonical_events'")).rows[0].c;
  const before = await countCanonical();
  const adapter = new LegacyIngressAdapter({ pool, eventRuntime: uer, pollIntervalMs: 60000, batchSize: 10, maxRetries: 3 });
  await adapter.initialize();
  check(adapter._hasConvergenceColumns === true, 'T6 adapter detects convergence columns');
  await adapter._convergeBatch();
  const after = await countCanonical();
  check(after === before + 1, 'T6 exactly one canonical commit for the legacy row');
  const legRow = (await pool.query('SELECT * FROM canonical_events WHERE event_id=$1', [legacy2.event_id])).rows[0];
  check(legRow.processed === true, 'T6 legacy row marked accepted');
  const Y = legRow.source_event_id;
  check(!!Y && Y !== legacy2.event_id && /^event_/.test(Y), 'T6 source_event_id is the distinct canonical identity', String(Y));
  check(legRow.envelope_id === deriveEnvelopeId(Y), 'T6 envelope_id derived deterministically from canonical identity');
  check(legRow.metadata.envelope.era === 'legacy_converged', 'T6 era marker legacy_converged');
  const li = legRow.metadata.legacy_ingress;
  check(li.ingress_event_id === legacy2.event_id && li.canonical_event_id === Y && li.migrated_event_id === Y,
    'T6 identity roles explicit (ingress/canonical/migrated)');
  check(typeof li.identity_note === 'string' && li.identity_note.length > 0, 'T6 identity note present');
  check(legRow.event_id === legacy2.event_id, 'T6 receipt identity preserved on the row (not rewritten)');
  await adapter._convergeBatch();
  check((await countCanonical()) === after, 'T6 second batch converges nothing new (idempotent)');
  // Seam proof: converged representations are not ingress work — the adapter
  // must leave the T1 certified representation untouched.
  const t1AfterAdapter = (await pool.query('SELECT metadata FROM canonical_events WHERE source_event_id=$1', [emit1.eventId])).rows[0];
  check(t1AfterAdapter.metadata.envelope.era === 'converged' && !t1AfterAdapter.metadata.legacy_ingress,
    'T6 adapter leaves converged representations untouched (seam proof)');
  const counts = await adapter.getIngressStateCounts();
  check(counts.status === 'ok' && String(counts.unprocessed) === '0',
    'T6 ingress observability: no unprocessed rows remain', JSON.stringify(counts));
  // fail-closed: malformed tenant claim -> REJECTED, never silently collapsed
  const legacyBad = await envelope.executeEmitEvent({
    tenantId: 'bad tenant!!', eventType: 'project.created', source: 'hpp-api',
    actor: 'owner-1', payload: { name: 'bad' },
  });
  await adapter._convergeBatch();
  const badRow = (await pool.query('SELECT processed, metadata FROM canonical_events WHERE event_id=$1', [legacyBad.event_id])).rows[0];
  check(badRow.processed === false &&
    badRow.metadata.legacy_ingress.disposition === 'REJECTED' &&
    badRow.metadata.legacy_ingress.code === 'INVALID_TENANT_NAMESPACE',
    'T6 malformed tenant claim rejected fail-closed');

  // ---- T7: consistency model B ----
  note('T7: model B coordinator + rebuild + audit');
  const emit7 = await uer.emit('CONVERGENCE_TEST', 'convergence-harness', { k: 7 },
    { namespace: 'core::system', logical_id: 'conv-t7-' + NONCE });
  const d1 = await deriveRepresentationAfterCommit({ envelope, emitResult: emit7, onDerived });
  check(d1.status === 'ok' && d1.inserted === true, 'T7 derivation after commit inserted');
  const d2 = await deriveRepresentationAfterCommit({ envelope, emitResult: emit7, onDerived });
  check(d2.status === 'ok' && d2.inserted === false, 'T7 derivation retry idempotent');
  const noCommit = await deriveRepresentationAfterCommit({ envelope, emitResult: { status: 'error', code: 'X' } });
  check(noCommit.status === 'error' && noCommit.code === 'NO_AUTHORITATIVE_COMMIT',
    'T7 derivation without a commit fails closed (no manufactured commit)');
  await pool.query('DELETE FROM canonical_events WHERE source_event_id=$1', [emit7.eventId]);
  check((await envelope.getRepresentationBySourceEventId(emit7.eventId)) === null, 'T7 representation deleted');
  const rb = await rebuildMissingRepresentations({ pool, envelope });
  check(rb.status === 'ok' && rb.rebuilt >= 1, 'T7 rebuild restores missing representations', JSON.stringify(rb));
  const rbRow = await envelope.getRepresentationBySourceEventId(emit7.eventId);
  check(!!rbRow && rbRow.event_id === emit7.eventId && rbRow.envelope_id === deriveEnvelopeId(emit7.eventId),
    'T7 rebuilt row carries the same identities');
  const rb2 = await rebuildMissingRepresentations({ pool, envelope });
  check(rb2.rebuilt === 0, 'T7 rebuild is idempotent');
  const audit = await auditCrossReferences({ pool });
  check(audit.status === 'ok' && audit.danglingRepresentations.length === 0,
    'T7 no dangling representations', JSON.stringify(audit.danglingRepresentations).slice(0, 200));

  await pool.end();
  const admin2 = adminPool();
  if (fail === 0) {
    await admin2.query(`DROP DATABASE "${DB}"`);
    note('scratch database dropped');
  } else {
    note('FAILURES: scratch database left in place for forensics: ' + DB);
  }
  await admin2.end();

  console.log(`\nconvergence invariants: ${pass} pass, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('HARNESS ERROR:', err);
  process.exit(2);
});
