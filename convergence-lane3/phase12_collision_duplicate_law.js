#!/usr/bin/env node
'use strict';
/* Phase 12: collision + duplicate law (2026-09-19).
 *
 * Proves the converged collision/duplicate law on real PostgreSQL:
 *   C1  same event_id + byte-equivalent canonical event = idempotent
 *       duplicate (one authoritative event, deterministic duplicate result,
 *       zero collision suppression)
 *   C2  envelope-layer duplicate derivation is idempotent (no duplicate row,
 *       no redispatch)
 *   C3  same event_id + different canonical content = COLLISION, fail closed
 *       deterministically (CONVERGENCE_IDENTITY_CONFLICT, no overwrite,
 *       no downstream dispatch)
 *   C4  12 concurrent submissions of the equivalent logical event ->
 *       exactly one authoritative event, deterministic duplicates
 *   C5  conflicting content under the same identity, submitted concurrently
 *       -> deterministic rejection, no dispatch, exactly one row
 *   C6  structural: no bare ON CONFLICT DO NOTHING on the converged path;
 *       every conflict site checks equivalence first (or resolves through a
 *       deterministic equivalence check)
 *   C7  UER logical_id + payload drift: commit layer keeps the first commit
 *       (identity law); the collision law fails closed at the representation
 *       layer (layered, documented, deterministic)
 *   C8  content-hash properties: deterministic, payload-sensitive,
 *       sequence/timestamp/envelope-metadata insensitive
 *   C9  preserved-key static proof: the legacy UNIQUE (tenant_id, sequence)
 *       remains on canonical_events (preservation law), and the D-1 23505
 *       absorption path is present in the envelope (static companion to the
 *       phase13 F6-RACE dynamic probe; revised 2026-09-19)
 *
 * Real PostgreSQL only: self-contained scratch database on the w1a scratch
 * container (127.0.0.1:15439), created and dropped by this harness. Never
 * touches shared stores.
 *
 * Env: PGHOST (default 127.0.0.1), PGPORT (default 15439),
 *      PGUSER (default postgres), PGPASSWORD (required).
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
const {
  deriveEnvelopeId, canonicalEventHash,
} = require(path.join(R, 'ping-runtime/events/convergence_identity.js'));
const {
  deriveRepresentationAfterCommit,
} = require(path.join(R, 'ping-runtime/events/convergence_derivation.js'));

const PGHOST = process.env.PGHOST || '127.0.0.1';
const PGPORT = parseInt(process.env.PGPORT || '15439', 10);
const PGUSER = process.env.PGUSER || 'postgres';
const PGPASSWORD = process.env.PGPASSWORD;
if (!PGPASSWORD) { console.error('FATAL: PGPASSWORD is required'); process.exit(2); }

const NONCE = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const DB = 'conv12_' + NONCE.replace(/[^a-z0-9]/g, '');

let pass = 0, fail = 0;
function check(cond, name, detail) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? ' :: ' + detail: '')); }
}
function note(msg) { console.log(msg); }

// Stable stringify (sorted keys) for order-independent deep comparison of
// JSONB round-tripped payloads.
function canon(o) {
  if (o === null || typeof o !== 'object') return JSON.stringify(o);
  if (Array.isArray(o)) return '[' + o.map(canon).join(',') + ']';
  return '{' + Object.keys(o).sort().map((k) => JSON.stringify(k) + ':' + canon(o[k])).join(',') + '}';
}

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

async function main() {
  const admin = adminPool();
  await admin.query(`CREATE DATABASE "${DB}"`);
  await admin.end();
  const pool = dbPool();
  note('scratch database: ' + DB);

  const uer = new UnifiedEventRuntime({ pool, eventValidator: null, eventGovernance: null });
  await uer.initialize();
  const envelope = new CanonicalEventEnvelope(pool, { repoRoot: R });
  await envelope.initialize();

  const countPing = async (eventId) =>
    (await pool.query('SELECT COUNT(*)::int AS c FROM ping_events WHERE event_id=$1', [eventId])).rows[0].c;
  const countRepr = async (eventId) =>
    (await pool.query('SELECT COUNT(*)::int AS c FROM canonical_events WHERE source_event_id=$1', [eventId])).rows[0].c;

  // ---- C1: byte-equivalent duplicate at the UER commit layer ----
  note('C1: idempotent duplicate (byte-equivalent)');
  const lid1 = 'p12-c1-' + NONCE;
  const r1a = await uer.emit('P12_TEST', 'p12-harness', { order: 1 }, { namespace: 'core::system', logical_id: lid1 });
  const r1b = await uer.emit('P12_TEST', 'p12-harness', { order: 1 }, { namespace: 'core::system', logical_id: lid1 });
  check(r1a.status === 'ok' && r1b.status === 'ok', 'C1 both submissions accepted');
  check(r1a.eventId === r1b.eventId, 'C1 same canonical identity for both');
  check(r1a.sequence === r1b.sequence, 'C1 duplicate resolves to the one persisted sequence (no phantom allocation)');
  check(JSON.stringify({ s: r1a.status, id: r1a.eventId, q: r1a.sequence }) ===
        JSON.stringify({ s: r1b.status, id: r1b.eventId, q: r1b.sequence }),
    'C1 deterministic duplicate result shape');
  check((await countPing(r1a.eventId)) === 1, 'C1 exactly one authoritative event row');
  check(!r1b.code, 'C1 zero collision suppression on equivalent content', r1b.code || '');
  check((uer._stats.deduplicated || 0) >= 1, 'C1 duplicate counted as deduplicated, not failed');

  // ---- C2: envelope-layer duplicate derivation ----
  note('C2: envelope duplicate derivation');
  let hookCalls = 0;
  const onDerived = async () => { hookCalls++; };
  const d1 = await deriveRepresentationAfterCommit({ envelope, emitResult: r1a, onDerived });
  const d2 = await deriveRepresentationAfterCommit({ envelope, emitResult: r1b, onDerived });
  check(d1.status === 'ok' && d1.inserted === true, 'C2 first derivation inserted');
  check(d2.status === 'ok' && d2.inserted === false && d2.deduped === true, 'C2 retry deduped (same identity, same content)');
  check(hookCalls === 1, 'C2 exactly one downstream dispatch');
  check((await countRepr(r1a.eventId)) === 1, 'C2 exactly one representation row');

  // ---- C3: conflicting content fails closed (sequential) ----
  note('C3: collision fails closed');
  const tampered = Object.assign({}, r1a.event, { payload: { order: 999, injected: true } });
  const beforePayload = (await pool.query('SELECT payload FROM canonical_events WHERE source_event_id=$1', [r1a.eventId])).rows[0].payload;
  const c3 = await envelope.acceptCanonicalEvent(tampered, { onDerived });
  check(c3.status === 'error' && c3.code === 'CONVERGENCE_IDENTITY_CONFLICT', 'C3 deterministic rejection code', c3.code);
  check(hookCalls === 1, 'C3 no downstream dispatch on conflict');
  const afterPayload = (await pool.query('SELECT payload FROM canonical_events WHERE source_event_id=$1', [r1a.eventId])).rows[0].payload;
  check(canon(afterPayload) === canon(beforePayload), 'C3 certified representation byte-unchanged (no overwrite)');
  check((await countRepr(r1a.eventId)) === 1, 'C3 no duplicate row on conflict');

  // ---- C4: 12 concurrent equivalent submissions ----
  note('C4: 12 concurrent equivalent submissions');
  const lid4 = 'p12-c4-' + NONCE;
  const conc4 = await Promise.all(Array.from({ length: 12 }, () =>
    uer.emit('P12_TEST', 'p12-harness', { batch: 4 }, { namespace: 'core::system', logical_id: lid4 })));
  const ids4 = new Set(conc4.map((r) => r.eventId));
  const seqs4 = new Set(conc4.map((r) => r.sequence));
  check(conc4.every((r) => r.status === 'ok'), 'C4 all 12 concurrent submissions accepted');
  check(ids4.size === 1, 'C4 exactly one canonical identity across 12 concurrent submissions');
  check(seqs4.size === 1, 'C4 all duplicates resolve to the single persisted sequence');
  const id4 = [...ids4][0];
  check((await countPing(id4)) === 1, 'C4 exactly one authoritative event row after the race');
  check(conc4.every((r) => !r.code), 'C4 no collision suppression on any duplicate');
  // envelope race: 12 concurrent derivations of the same event
  const ev4 = conc4[0].event;
  let hook4 = 0;
  const d4 = await Promise.all(Array.from({ length: 12 }, () =>
    envelope.acceptCanonicalEvent(ev4, { onDerived: async () => { hook4++; } })));
  check(d4.filter((r) => r.inserted === true).length === 1, 'C4 exactly one derivation inserted');
  check(d4.every((r) => r.status === 'ok'), 'C4 every concurrent derivation resolved ok');
  check(d4.filter((r) => r.deduped === true).length === 11, 'C4 11 losers deterministically deduped');
  check(hook4 === 1, 'C4 exactly one downstream dispatch under derivation race');
  check((await countRepr(id4)) === 1, 'C4 exactly one representation row after the race');

  // ---- C5: concurrent conflicting content under the same identity ----
  note('C5: concurrent conflicting content');
  const lid5 = 'p12-c5-' + NONCE;
  const r5 = await uer.emit('P12_TEST', 'p12-harness', { v: 'A' }, { namespace: 'core::system', logical_id: lid5 });
  const evA = r5.event;
  const evB = Object.assign({}, evA, { payload: { v: 'B' } });
  let hook5 = 0;
  const racers = await Promise.all([
    ...Array.from({ length: 3 }, () => envelope.acceptCanonicalEvent(evA, { onDerived: async () => { hook5++; } })),
    ...Array.from({ length: 3 }, () => envelope.acceptCanonicalEvent(evB, { onDerived: async () => { hook5++; } })),
  ]);
  const inserted5 = racers.filter((r) => r.inserted === true).length;
  const conflicts5 = racers.filter((r) => r.code === 'CONVERGENCE_IDENTITY_CONFLICT').length;
  const deduped5 = racers.filter((r) => r.deduped === true).length;
  check(inserted5 === 1, 'C5 exactly one winner inserted', `inserted=${inserted5}`);
  check(inserted5 + conflicts5 + deduped5 === 6, 'C5 every racer resolved deterministically (inserted|conflict|deduped)',
    `inserted=${inserted5} conflicts=${conflicts5} deduped=${deduped5}`);
  check(conflicts5 >= 1, 'C5 at least one conflicting submission deterministically rejected');
  check(hook5 === 1, 'C5 exactly one downstream dispatch (no dispatch for losers or conflicts)');
  check((await countRepr(r5.eventId)) === 1, 'C5 exactly one representation row after the conflict race');
  const winPayload = (await pool.query('SELECT payload FROM canonical_events WHERE source_event_id=$1', [r5.eventId])).rows[0].payload;
  const winIsA = canon(winPayload) === canon(evA.payload);
  const winIsB = canon(winPayload) === canon(evB.payload);
  check((winIsA ? 1: 0) + (winIsB ? 1: 0) === 1, 'C5 stored content is exactly one of the two raced contents (no merge, no overwrite)');
  // Whichever side won: its 3 racers resolve to 1 inserted + 2 deduped; the
  // losing side's 3 racers all see the winner's row with a different content
  // hash and fail closed. Fully deterministic loser accounting.
  check(conflicts5 === 3 && deduped5 === 2,
    'C5 loser accounting deterministic: 3 conflicts (losing side) + 2 deduped (winning side)',
    `conflicts=${conflicts5} deduped=${deduped5} winner=${winIsA ? 'A': 'B'}`);

  // ---- C6: structural: no bare ON CONFLICT on the converged path ----
  note('C6: structural conflict-path audit');
  const uerSrc = readFile('ping-runtime/events/unified_event_runtime.js');
  const envSrc = readFile('gateway/canonical_event_envelope.js');
  const mrSrc = readFile('ping-runtime/orchestration/mission_runtime.js');
  const derivSrc = readFile('ping-runtime/events/convergence_derivation.js');
  const genIdx = uerSrc.indexOf("identityAuthority.generateIdWithDigest('event'");
  const uerOC = uerSrc.indexOf('ON CONFLICT (event_id) DO NOTHING');
  check(genIdx !== -1 && uerOC !== -1 && genIdx < uerOC,
    'C6 UER: identity minted from content BEFORE the conflict site (equivalence by construction; PATCH-03: digest carried alongside the ID)');
  check(uerSrc.indexOf('SELECT sequence, canonical_hash FROM ping_events WHERE event_id = $1') !== -1,
    'C6 UER: conflict path re-reads the canonical row WITH the collision witness (PATCH-03: duplicate-vs-collision decided by witness, no phantom sequence)');
  const accStart = envSrc.indexOf('async acceptCanonicalEvent(event');
  const accTail = envSrc.slice(accStart);
  const preIdx = accTail.indexOf('WHERE source_event_id = $1');
  const hashCmp = accTail.indexOf('env.canonical_hash === canonicalHash');
  const envOC = accTail.indexOf('ON CONFLICT (event_id) DO NOTHING');
  const ccIdx = accTail.indexOf('CONVERGENCE_IDENTITY_CONFLICT');
  check(accStart !== -1 && preIdx !== -1 && hashCmp !== -1 && envOC !== -1 && ccIdx !== -1 &&
        preIdx < envOC && hashCmp < envOC,
    'C6 envelope: equivalence pre-check (source_event_id lookup + content-hash compare) precedes the ON CONFLICT race guard');
  const idemIdx = mrSrc.indexOf('idempotencyKey');
  const mrOC = mrSrc.indexOf('ON CONFLICT (mission_id) DO NOTHING');
  check(idemIdx !== -1 && mrOC !== -1 && idemIdx < mrOC,
    'C6 mission runtime: deterministic idempotency key computed BEFORE the ON CONFLICT site');
  const execEmitStart = envSrc.indexOf('async executeEmitEvent(');
  const legacyOC = envSrc.indexOf('ON CONFLICT (tenant_id, sequence) DO NOTHING');
  check(execEmitStart !== -1 && legacyOC !== -1 && legacyOC > execEmitStart && legacyOC < accStart,
    'C6 legacy receipt ON CONFLICT confined to executeEmitEvent (receipt surface, not the converged path)');
  check(derivSrc.indexOf('executeEmitEvent') === -1 && derivSrc.indexOf('getNextSequence') === -1,
    'C6 model-B coordinator never touches the legacy receipt path');

  // ---- C7: logical_id + payload drift layering ----
  note('C7: logical_id/payload drift layering');
  const lid7 = 'p12-c7-' + NONCE;
  const r7a = await uer.emit('P12_TEST', 'p12-harness', { v: 1 }, { namespace: 'core::system', logical_id: lid7 });
  const r7b = await uer.emit('P12_TEST', 'p12-harness', { v: 2 }, { namespace: 'core::system', logical_id: lid7 });
  check(r7b.status === 'ok' && r7b.eventId === r7a.eventId, 'C7 same logical identity dedups at commit (payload is observation data under logical_id)');
  const storedPayload = (await pool.query('SELECT payload FROM ping_events WHERE event_id=$1', [r7a.eventId])).rows[0].payload;
  check(canon(storedPayload) === canon({ v: 1 }), 'C7 commit layer keeps the first commit (no overwrite)');
  const d7a = await deriveRepresentationAfterCommit({ envelope, emitResult: r7a });
  check(d7a.status === 'ok' && d7a.inserted === true, 'C7 first content derives');
  const d7b = await envelope.acceptCanonicalEvent(r7b.event);
  check(d7b.status === 'error' && d7b.code === 'CONVERGENCE_IDENTITY_CONFLICT',
    'C7 drifted content fails closed at the representation layer', d7b.code);

  // ---- C8: content-hash properties ----
  note('C8: content-hash properties');
  const h1 = canonicalEventHash(r1a.event);
  const h1b = canonicalEventHash(Object.assign({}, r1a.event));
  check(h1 === h1b, 'C8 hash deterministic for byte-equivalent events');
  check(canonicalEventHash(tampered) !== h1, 'C8 hash sensitive to payload content');
  const seqVariant = Object.assign({}, r1a.event, { sequence: 424242 });
  check(canonicalEventHash(seqVariant) === h1, 'C8 hash insensitive to sequence (storage metadata, not identity)');
  const tsVariant = Object.assign({}, r1a.event, { timestamp: '1999-01-01T00:00:00.000Z' });
  check(canonicalEventHash(tsVariant) === h1, 'C8 hash insensitive to timestamp (observation metadata, not identity)');
  const envVariant = Object.assign({}, r1a.event, { metadata: Object.assign({}, r1a.event.metadata, { envelope: { era: 'x' } }) });
  check(canonicalEventHash(envVariant) === h1, 'C8 hash insensitive to derivation-added metadata.envelope');
  check(deriveEnvelopeId(r1a.eventId) === deriveEnvelopeId(r1a.eventId), 'C8 envelope_id deterministic from canonical identity');
  check(deriveEnvelopeId(r1a.eventId) !== r1a.eventId, 'C8 envelope_id != canonical event_id (standing distinction)');

  // ---- C9: preserved-key static proof (deterministic; dynamic probe lives in phase13 F6) ----
  // Revised 2026-09-19 (Phase 15): the old C9 demanded the legacy UNIQUE
  // (tenant_id, sequence) be REMOVED so that ON CONFLICT (event_id) would
  // cover every unique key. The preservation law forbids that removal, and
  // D-1 repaired the race the other way: the derivation INSERT keeps
  // ON CONFLICT (event_id) but now absorbs a 23505 from the preserved
  // legacy key into the same deterministic equivalence path (fail-closed
  // bounded retry; no spurious loud error, no duplicate row, no
  // redispatch). So C9 now asserts the preserved-law intent:
  //   (a) the legacy (tenant_id, sequence) key REMAINS on canonical_events
  //       (mechanism preserved; fails if the key is removed);
  //   (b) the D-1 absorption path is present in the envelope source
  //       (fails if the 23505 absorb guard is deleted, in which case the
  //       race the old C9 guarded would regress).
  note('C9: preserved legacy key + 23505 absorption on the representation commit site');
  const cuq = await pool.query(
    "SELECT c.conname, c.contype, pg_get_constraintdef(c.oid) AS def " +
    "FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid " +
    "JOIN pg_namespace n ON n.oid = t.relnamespace " +
    "WHERE t.relname = 'canonical_events' AND n.nspname = 'public' AND c.contype IN ('p','u') ORDER BY c.conname");
  const cuqNames = cuq.rows.map((r) => r.conname).join(',');
  check(cuq.rows.length === 2 && cuq.rows.some((r) => r.conname === 'canonical_events_pkey'),
    'C9 canonical_events keeps exactly two unique keys: the event_id PK plus the preserved legacy key',
    'unique keys: ' + cuqNames);
  const legacyUq = cuq.rows.find((r) => r.contype === 'u');
  check(!!legacyUq && /UNIQUE\s*\(\s*tenant_id\s*,\s*sequence\s*\)/i.test(legacyUq.def || ''),
    'C9 the preserved legacy unique key still covers (tenant_id, sequence)',
    legacyUq ? (legacyUq.conname + ': ' + legacyUq.def) : 'no unique constraint found');
  // D-1 absorb-path tokens in the envelope source. If the 23505 catch, the
  // bounded-retry guard, or the fail-closed terminal code is removed, the
  // derivation race regresses to a spurious loud 23505 and C9 goes red.
  const envelopeSrc = fs.readFileSync(path.join(R, 'gateway/canonical_event_envelope.js'), 'utf8');
  check(/err\s*&&\s*err\.code\s*===\s*['"]23505['"]/.test(envelopeSrc),
    'C9 envelope absorbs 23505 from the non-arbiter legacy key (D-1 guard present)');
  check(envelopeSrc.includes('_conflictRetry') && envelopeSrc.includes('CONVERGENCE_DERIVATION_CONFLICT_UNRESOLVED'),
    'C9 absorbed conflict re-enters the deterministic equivalence path with a bounded fail-closed retry');
  check(/ON CONFLICT \(event_id\) DO NOTHING/.test(envelopeSrc),
    'C9 derivation INSERT still arbitrates ON CONFLICT (event_id) (event-id arbiter unchanged)');

  await pool.end();
  const admin2 = adminPool();
  if (fail === 0) {
    await admin2.query(`DROP DATABASE "${DB}"`);
    note('scratch database dropped');
  } else {
    note('FAILURES: scratch database left in place for forensics: ' + DB);
  }
  await admin2.end();

  console.log(`\nphase 12 collision+duplicate law: ${pass} pass, ${fail} fail`);
  process.exit(fail === 0 ? 0: 1);
}

main().catch((err) => {
  console.error('HARNESS ERROR:', err);
  process.exit(2);
});
