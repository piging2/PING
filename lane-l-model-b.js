#!/usr/bin/env node
'use strict';
/* LANE L: model-B forensic certification for canonical_events (2026-09-19).
 * Tests the live derivation path at HEAD against an isolated scratch Postgres.
 * Never touches production. Scratch DB created + dropped by this harness.
 * Env: PGHOST (127.0.0.1), PGPORT (15439), PGUSER (postgres), PGPASSWORD (required).
 * Exit 0 = all pass; exit 1 = any fail (DB left for forensics).
 */
const path = require('path');
const crypto = require('crypto');

const R = '/home/nolan/worktrees/constitutional-convergence-authority-law';
let pg;
try { pg = require('pg'); } catch (e) {
  pg = require('/home/nolan/worktrees/constitutional-convergence/tests/mc1-legacy-ingress/node_modules/pg');
}
const { Pool } = pg;

const { UnifiedEventRuntime } = require(path.join(R, 'ping-runtime/events/unified_event_runtime.js'));
const { CanonicalEventEnvelope } = require(path.join(R, 'gateway/canonical_event_envelope.js'));
const {
  deriveRepresentationAfterCommit, rebuildMissingRepresentations, auditCrossReferences,
} = require(path.join(R, 'ping-runtime/events/convergence_derivation.js'));
const { deriveEnvelopeId, canonicalEventHash } = require(path.join(R, 'ping-runtime/events/convergence_identity.js'));

const PGHOST = process.env.PGHOST || '127.0.0.1';
const PGPORT = parseInt(process.env.PGPORT || '15439', 10);
const PGUSER = process.env.PGUSER || 'postgres';
const PGPASSWORD = process.env.PGPASSWORD;
if (!PGPASSWORD) { console.error('FATAL: PGPASSWORD is required'); process.exit(2); }

const NONCE = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const DB = 'lanel_' + NONCE.replace(/[^a-z0-9]/g, '').slice(0, 14);

let pass = 0, fail = 0;
function check(cond, name, detail) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}
function note(m) { console.log(m); }

/* Independent UUIDv5 recomputation per the documented spec constants. */
function uuidV5spec(ns, name) {
  const b = Buffer.from(ns.replace(/-/g, ''), 'hex');
  const h = crypto.createHash('sha1').update(b).update(name, 'utf8').digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const s = h.toString('hex');
  return s.slice(0, 8) + '-' + s.slice(8, 12) + '-' + s.slice(12, 16) + '-' + s.slice(16, 20) + '-' + s.slice(20, 32);
}
const SPEC_NS = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
const SPEC_PREFIX = 'ping-envelope-repr:v1:';

async function main() {
  const admin = new Pool({ host: PGHOST, port: PGPORT, user: PGUSER, password: PGPASSWORD, database: 'postgres', connectionTimeoutMillis: 8000 });
  admin.on('error', () => {});
  await admin.query('CREATE DATABASE "' + DB + '"');
  await admin.end();
  const pool = new Pool({ host: PGHOST, port: PGPORT, user: PGUSER, password: PGPASSWORD, database: DB, connectionTimeoutMillis: 8000 });
  pool.on('error', () => {});
  note('scratch database: ' + DB);

  const uer = new UnifiedEventRuntime({ pool, eventValidator: null, eventGovernance: null });
  await uer.initialize();
  const envelope = new CanonicalEventEnvelope(pool, { repoRoot: R });
  await envelope.initialize();

  const reprBySource = async (id) =>
    (await pool.query('SELECT * FROM canonical_events WHERE source_event_id=$1', [id])).rows[0] || null;
  const srcRows = async () =>
    (await pool.query('SELECT event_id, event_type, source, namespace, payload::text AS p, metadata::text AS m, sequence FROM ping_events ORDER BY event_id')).rows;
  const snap0 = await srcRows();

  /* ============ T1: commit source -> derive secondary ============ */
  note('T1: commit source -> derive secondary');
  const e1 = await uer.emit('LANE_L_T1', 'lane-l', { t: 1 }, { namespace: 'core::system', logical_id: 'lane-l-t1-' + NONCE });
  check(e1.status === 'ok', 'T1 authoritative commit ok', e1.code || '');
  const d1 = await deriveRepresentationAfterCommit({ envelope, emitResult: e1 });
  check(d1.status === 'ok' && d1.inserted === true, 'T1 derivation inserted', JSON.stringify({ status: d1.status, inserted: d1.inserted }));
  const row1 = await reprBySource(e1.eventId);
  check(!!row1, 'T1 representation row exists');
  check(!!row1 && row1.event_id === e1.eventId, 'T1 event_id carried verbatim from source');
  check(!!row1 && row1.source_event_id === e1.eventId, 'T1 source_event_id cross-reference set');
  const specEnv = uuidV5spec(SPEC_NS, SPEC_PREFIX + e1.eventId);
  check(!!row1 && row1.envelope_id === specEnv, 'T1 envelope_id = deterministic UUIDv5 (independent spec recompute)', row1 && row1.envelope_id);
  check(!!row1 && row1.envelope_id === deriveEnvelopeId(e1.eventId), 'T1 envelope_id matches deriveEnvelopeId()');
  check(!!row1 && row1.metadata && row1.metadata.envelope && row1.metadata.envelope.era === 'converged', 'T1 era marker = converged');
  check(!!row1 && row1.metadata.envelope.canonical_hash === canonicalEventHash(e1.event), 'T1 canonical_hash matches source content');
  check(!!row1 && Number(row1.sequence) === Number(e1.event.sequence), 'T1 sequence carried from authoritative commit');
  check(!!row1 && row1.tenant_id === 'core::system', 'T1 tenant_id = canonical namespace verbatim');

  /* ============ T2: retry derivation idempotent ============ */
  note('T2: retry derivation is idempotent');
  let hooks = 0;
  const d2 = await deriveRepresentationAfterCommit({ envelope, emitResult: e1, onDerived: async () => { hooks++; } });
  check(d2.status === 'ok' && d2.inserted === false, 'T2 retry deduped, no second insert', JSON.stringify({ inserted: d2.inserted, deduped: d2.deduped }));
  const cnt2 = (await pool.query('SELECT COUNT(*)::int AS c FROM canonical_events WHERE source_event_id=$1', [e1.eventId])).rows[0].c;
  check(cnt2 === 1, 'T2 exactly one representation row after retry');
  check(hooks === 0, 'T2 onDerived hook NOT refired on idempotent retry');
  const row2 = await reprBySource(e1.eventId);
  check(!!row2 && row2.envelope_id === specEnv, 'T2 envelope_id stable across retries');

  /* ============ T3: missing row rebuild, byte-identical ============ */
  note('T3: secondary missing row -> rebuild recreates it');
  const sigPromised = (r) => [r.event_id, r.envelope_id, r.source_event_id, r.event_type,
    JSON.stringify(r.payload), r.metadata.envelope.canonical_hash, r.metadata.envelope.era].join('|');
  const before3 = await reprBySource(e1.eventId);
  const sigBefore3 = sigPromised(before3);
  await pool.query('DELETE FROM canonical_events WHERE source_event_id=$1', [e1.eventId]);
  check((await reprBySource(e1.eventId)) === null, 'T3 representation row deleted (simulated loss)');
  const rb3 = await rebuildMissingRepresentations({ pool, envelope });
  check(rb3.status === 'ok' && rb3.rebuilt === 1, 'T3 rebuild recreated exactly the missing row', JSON.stringify(rb3));
  const after3 = await reprBySource(e1.eventId);
  check(!!after3 && sigPromised(after3) === sigBefore3, 'T3 rebuilt row byte-identical on all promised fields (identity/hash/payload/era)');
  check(!!after3 && after3.metadata.envelope.derived_at !== before3.metadata.envelope.derived_at,
    'T3 derived_at differs (honest: re-derivation timestamp, never a promised field)');
  const rb3b = await rebuildMissingRepresentations({ pool, envelope });
  check(rb3b.rebuilt === 0, 'T3 rebuild is idempotent on second run');

  /* ============ T4a: stale payload (hash untouched) ============ */
  note('T4a: secondary payload drifted, stored hash untouched');
  await pool.query('UPDATE canonical_events SET payload=$1 WHERE source_event_id=$2',
    [JSON.stringify({ tampered: true }), e1.eventId]);
  const d4a = await envelope.acceptCanonicalEvent(e1.event);
  check(d4a.status === 'ok' && d4a.inserted === false, 'T4a re-derive reports idempotent success (conflict check trusts stored hash)', JSON.stringify({ status: d4a.status, code: d4a.code }));
  const row4a = await reprBySource(e1.eventId);
  const p4a = typeof row4a.payload === 'string' ? JSON.parse(row4a.payload) : row4a.payload;
  check(!!p4a.tampered, 'T4a stale row persists: source does NOT auto-win, no silent repair');
  const src4a = (await pool.query('SELECT payload FROM ping_events WHERE event_id=$1', [e1.eventId])).rows[0];
  const sp4a = typeof src4a.payload === 'string' ? JSON.parse(src4a.payload) : src4a.payload;
  check(sp4a.t === 1 && !sp4a.tampered, 'T4a source row untouched by the stale secondary');
  await pool.query('DELETE FROM canonical_events WHERE source_event_id=$1', [e1.eventId]);
  const rb4a = await rebuildMissingRepresentations({ pool, envelope });
  const row4a2 = await reprBySource(e1.eventId);
  const p4a2 = typeof row4a2.payload === 'string' ? JSON.parse(row4a2.payload) : row4a2.payload;
  check(rb4a.rebuilt === 1 && p4a2.t === 1 && !p4a2.tampered, 'T4a destroy+rebuild restores the source-derived row');

  /* ============ T4b: stored hash tampered -> fail closed ============ */
  note('T4b: stored content hash drifted under stable identity');
  await pool.query(
    "UPDATE canonical_events SET metadata = jsonb_set(metadata, '{envelope,canonical_hash}', '\"deadbeef\"') WHERE source_event_id=$1",
    [e1.eventId]);
  const d4b = await envelope.acceptCanonicalEvent(e1.event);
  check(d4b.status === 'error' && d4b.code === 'CONVERGENCE_IDENTITY_CONFLICT', 'T4b conflicting content fails closed', d4b.code);
  const row4b = await reprBySource(e1.eventId);
  check(!!row4b && row4b.metadata.envelope.canonical_hash === 'deadbeef', 'T4b certified row NOT overwritten on conflict (immutable)');
  const src4b = (await pool.query('SELECT payload FROM ping_events WHERE event_id=$1', [e1.eventId])).rows[0];
  const sp4b = typeof src4b.payload === 'string' ? JSON.parse(src4b.payload) : src4b.payload;
  check(sp4b.t === 1, 'T4b source row intact after fail-closed conflict');
  await pool.query('DELETE FROM canonical_events WHERE source_event_id=$1', [e1.eventId]);
  const rb4b = await rebuildMissingRepresentations({ pool, envelope });
  const row4b2 = await reprBySource(e1.eventId);
  check(rb4b.rebuilt === 1 && !!row4b2 && row4b2.metadata.envelope.canonical_hash === canonicalEventHash(e1.event),
    'T4b destroy+rebuild restores source truth after conflict');

  /* ============ T5: rebuild subset, others untouched ============ */
  note('T5: rebuild subset is surgical');
  const evs = [];
  for (let i = 0; i < 3; i++) {
    const e = await uer.emit('LANE_L_T5', 'lane-l', { n: i }, { namespace: 'core::system', logical_id: 'lane-l-t5-' + NONCE + '-' + i });
    const d = await deriveRepresentationAfterCommit({ envelope, emitResult: e });
    if (d.status !== 'ok' || d.inserted !== true) throw new Error('T5 setup derive failed');
    evs.push(e);
  }
  const fullBefore = {};
  for (const e of evs) fullBefore[e.eventId] = JSON.stringify(await reprBySource(e.eventId));
  await pool.query('DELETE FROM canonical_events WHERE source_event_id=$1', [evs[1].eventId]);
  const rb5 = await rebuildMissingRepresentations({ pool, envelope });
  check(rb5.status === 'ok' && rb5.rebuilt === 1, 'T5 subset rebuild recreated exactly 1 row', JSON.stringify(rb5));
  check(JSON.stringify(await reprBySource(evs[0].eventId)) === fullBefore[evs[0].eventId], 'T5 sibling row A byte-untouched by subset rebuild');
  check(JSON.stringify(await reprBySource(evs[2].eventId)) === fullBefore[evs[2].eventId], 'T5 sibling row C byte-untouched by subset rebuild');
  const row5b = await reprBySource(evs[1].eventId);
  check(!!row5b && row5b.event_id === evs[1].eventId && row5b.envelope_id === uuidV5spec(SPEC_NS, SPEC_PREFIX + evs[1].eventId),
    'T5 rebuilt row B carries byte-identical identities');
  await pool.query('DELETE FROM canonical_events WHERE source_event_id = ANY($1)', [evs.map((e) => e.eventId)]);
  const rb5all = await rebuildMissingRepresentations({ pool, envelope });
  check(rb5all.status === 'ok' && rb5all.rebuilt === 3, 'T5 rebuild-all restored 3 rows', JSON.stringify(rb5all));
  let ident5 = true;
  for (const e of evs) {
    const r = await reprBySource(e.eventId);
    if (!r || r.event_id !== e.eventId || r.envelope_id !== uuidV5spec(SPEC_NS, SPEC_PREFIX + e.eventId)) { ident5 = false; break; }
  }
  check(ident5, 'T5 rebuild-all rows carry byte-identical identities');

  /* ============ T6a: crash between commit and derivation, restart recovers ============ */
  note('T6a: commit without derivation (crash) -> restart + rebuild recovers');
  const e6 = await uer.emit('LANE_L_T6', 'lane-l', { c: 'crash' }, { namespace: 'core::system', logical_id: 'lane-l-t6-' + NONCE });
  check((await reprBySource(e6.eventId)) === null, 'T6a no representation (derivation never ran: the crash)');
  const envelope2 = new CanonicalEventEnvelope(pool, { repoRoot: R });
  await envelope2.initialize();
  const rb6 = await rebuildMissingRepresentations({ pool, envelope: envelope2 });
  const row6 = await reprBySource(e6.eventId);
  check(rb6.rebuilt === 1 && !!row6 && row6.envelope_id === uuidV5spec(SPEC_NS, SPEC_PREFIX + e6.eventId),
    'T6a post-restart rebuild recovered the representation with deterministic identity');

  /* ============ T6b: hook failure boundary ============ */
  note('T6b: onDerived hook throws -> row durable, hook reported, no refire');
  const e6b = await uer.emit('LANE_L_T6B', 'lane-l', { h: 1 }, { namespace: 'core::system', logical_id: 'lane-l-t6b-' + NONCE });
  let hookCalls = 0;
  const d6b = await deriveRepresentationAfterCommit({
    envelope, emitResult: e6b,
    onDerived: async () => { hookCalls++; throw new Error('downstream boom'); },
  });
  check(d6b.status === 'ok' && d6b.inserted === true && d6b.hook_error === 'downstream boom',
    'T6b hook failure reported on the result, row still derived', d6b.hook_error);
  check(hookCalls === 1, 'T6b hook ran exactly once');
  check((await reprBySource(e6b.eventId)) !== null, 'T6b representation row durable despite hook failure');
  const d6b2 = await deriveRepresentationAfterCommit({ envelope, emitResult: e6b, onDerived: async () => { hookCalls++; } });
  check(d6b2.inserted === false && hookCalls === 1, 'T6b retry does not refire the hook');

  /* ============ T6c: secondary never mints event_id ============ */
  note('T6c: derivation never mints logical identity');
  const g1 = await envelope.acceptCanonicalEvent({});
  const g2 = await envelope.acceptCanonicalEvent({ event_type: 'X', source: 's', namespace: 'core::system', timestamp: new Date().toISOString(), payload: {} });
  check(g1.status === 'error' && g1.code === 'ENVELOPE_VALIDATION_FAILED', 'T6c empty event fails closed', g1.code);
  check(g2.status === 'error' && g2.code === 'ENVELOPE_VALIDATION_FAILED', 'T6c event without event_id fails closed (never minted)', g2.code);
  const g3 = await deriveRepresentationAfterCommit({ envelope, emitResult: null });
  check(g3.status === 'error' && g3.code === 'NO_AUTHORITATIVE_COMMIT', 'T6c derivation without commit fails closed (nothing manufactured)');

  /* ============ T7: concurrent derivation race ============ */
  note('T7: N concurrent derivations of the same event');
  const e7 = await uer.emit('LANE_L_T7', 'lane-l', { race: 1 }, { namespace: 'core::system', logical_id: 'lane-l-t7-' + NONCE });
  const racers = [];
  for (let i = 0; i < 10; i++) racers.push(envelope.acceptCanonicalEvent(e7.event));
  const r7 = await Promise.all(racers);
  const ok7 = r7.filter((x) => x.status === 'ok');
  const ins7 = r7.filter((x) => x.status === 'ok' && x.inserted === true);
  check(ok7.length === 10, 'T7 all 10 concurrent derivations returned ok (no throw, no 23505 surfaced)', ok7.length + '/10');
  check(ins7.length === 1, 'T7 exactly one winner inserted', ins7.length + ' winners');
  const cnt7 = (await pool.query('SELECT COUNT(*)::int AS c FROM canonical_events WHERE source_event_id=$1', [e7.eventId])).rows[0].c;
  check(cnt7 === 1, 'T7 exactly one representation row exists after the race');
  const row7 = await reprBySource(e7.eventId);
  check(!!row7 && row7.envelope_id === uuidV5spec(SPEC_NS, SPEC_PREFIX + e7.eventId), 'T7 raced row has the deterministic identity');

  /* ============ T8a: constraint inventory ============ */
  note('T8a: canonical_events unique-constraint inventory');
  const cons = (await pool.query(
    "SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conrelid='canonical_events'::regclass AND contype='u' ORDER BY conname"
  )).rows;
  const uidx = (await pool.query(
    "SELECT indexname, indexdef FROM pg_indexes WHERE tablename='canonical_events' AND indexdef ILIKE '%unique%' ORDER BY indexname"
  )).rows;
  note('  pg_constraint: ' + cons.map((c) => c.conname + ' ' + c.def).join(' | '));
  note('  unique indexes: ' + uidx.map((c) => c.indexname).join(', '));
  const hasLegacyUq = cons.some((c) => /UNIQUE \(tenant_id, sequence\)/.test(c.def));
  const srcUq = uidx.find((c) => c.indexname === 'uq_canonical_events_source_event_id');
  check(hasLegacyUq, 'T8a legacy UNIQUE (tenant_id, sequence) present');
  check(!!srcUq && /WHERE source_event_id IS NOT NULL/.test(srcUq.indexdef),
    'T8a partial UNIQUE index uq_canonical_events_source_event_id present (one representation row per canonical event; NULLs unconstrained)');

  /* ============ T8b: different events, same namespace -> no collision ============ */
  note('T8b: converged-era rows cannot collide on the legacy key among themselves');
  const e8a = await uer.emit('LANE_L_T8', 'lane-l', { u: 'a' }, { namespace: 'core::system', logical_id: 'lane-l-t8a-' + NONCE });
  const e8b = await uer.emit('LANE_L_T8', 'lane-l', { u: 'b' }, { namespace: 'core::system', logical_id: 'lane-l-t8b-' + NONCE });
  const d8a = await deriveRepresentationAfterCommit({ envelope, emitResult: e8a });
  const d8b = await deriveRepresentationAfterCommit({ envelope, emitResult: e8b });
  check(d8a.status === 'ok' && d8a.inserted && d8b.status === 'ok' && d8b.inserted,
    'T8b two events, same namespace: both derived, no legacy-UNIQUE collision (sequences are globally unique per commit)');

  /* ============ T8c: pathological cross-era (tenant_id, sequence) collision ============ */
  note('T8c: legacy row claims tenant_id equal to a converged namespace');
  await pool.query(
    "INSERT INTO canonical_events (event_id, event_type, tenant_id, timestamp, sequence, source, actor, payload) VALUES ($1,$2,$3,now(),$4,$5,$6,$7)",
    ['11111111-2222-3333-4444-555555555555', 'legacy.probe', 'core::system', 424242, 'legacy-probe', 'probe', '{}']
  );
  await pool.query("SELECT setval('ping_events_sequence_seq', 424241)");
  const e8c = await uer.emit('LANE_L_T8C', 'lane-l', { u: 'c' }, { namespace: 'core::system', logical_id: 'lane-l-t8c-' + NONCE });
  check(Number(e8c.event.sequence) === 424242, 'T8c setup: derived row would carry (core::system, 424242)', String(e8c.event.sequence));
  const d8c = await envelope.acceptCanonicalEvent(e8c.event);
  check(d8c.status === 'error' && d8c.code === 'CONVERGENCE_DERIVATION_CONFLICT_UNRESOLVED',
    'T8c cross-era legacy-UNIQUE collision fails closed LOUDLY (absorbed 23505, bounded retry, no silent anything)', d8c.code);
  check((await reprBySource(e8c.eventId)) === null, 'T8c no representation row manufactured for the blocked event');
  const legRow = (await pool.query("SELECT event_id FROM canonical_events WHERE event_id='11111111-2222-3333-4444-555555555555'")).rows[0];
  check(!!legRow, 'T8c legacy row untouched by the failed derivation');
  const src8c = (await pool.query('SELECT event_id FROM ping_events WHERE event_id=$1', [e8c.eventId])).rows[0];
  check(!!src8c, 'T8c authoritative commit intact despite blocked derivation');
  let rb8cThrew = false;
  try {
    await rebuildMissingRepresentations({ pool, envelope });
  } catch (err) {
    rb8cThrew = /CONVERGENCE_DERIVATION_CONFLICT_UNRESOLVED/.test(err.message);
  }
  check(rb8cThrew, 'T8c rebuild ABORTS (throws) on the poisoned event: fail-loud-abort, later rows not attempted (FINDING F1)');
  check((await reprBySource(e8c.eventId)) === null, 'T8c no representation row manufactured for the blocked event');

  /* ============ Final: source immutability + cross-ref audit ============ */
  note('FINAL: source-of-truth immutability across all failure tests');
  const snapF = await srcRows();
  let immut = true;
  for (const r0 of snap0) {
    const jf = JSON.parse(r0);
    const match = snapF.find((x) => JSON.parse(x).event_id === jf.event_id);
    if (!match || match !== r0) { immut = false; break; }
  }
  check(immut, 'FINAL every pre-existing ping_events row byte-identical after all failure/race/tamper tests');
  const audit = await auditCrossReferences({ pool });
  check(audit.status === 'ok' && audit.danglingRepresentations.length === 0,
    'FINAL no dangling representations (every derived row resolves to one authoritative commit)',
    JSON.stringify(audit.danglingRepresentations));
  note('FINAL unrepresented canonical events (expected: T8c blocked event): ' + audit.unrepresentedCanonicalEvents);

  await pool.end();
  const admin2 = new Pool({ host: PGHOST, port: PGPORT, user: PGUSER, password: PGPASSWORD, database: 'postgres', connectionTimeoutMillis: 8000 });
  admin2.on('error', () => {});
  if (fail === 0) {
    await admin2.query('DROP DATABASE "' + DB + '"');
    note('scratch database dropped');
  } else {
    note('FAILURES: scratch database left for forensics: ' + DB);
  }
  await admin2.end();
  console.log('\nlane-l model-B forensics: ' + pass + ' pass, ' + fail + ' fail');
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => { console.error('HARNESS ERROR:', err); process.exit(2); });
