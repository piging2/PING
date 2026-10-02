'use strict';
// LANE 3 / PATCH-03 — PASS-AFTER verification (runs against PATCHED code).
// Proves axiom E2 on a REAL PostgreSQL pool:
//   P1 fresh emit persists with the full-digest witness
//   P2 equivalent redelivery -> ok + deduplicated:true (no collision)
//   P3 forced same event_id + different digest -> EVENT_IDENTITY_CONFLICT,
//      zero dispatch of conflicting content, stored row byte-untouched
//   P4 legacy NULL-witness row -> explicit legacy-dedup (witness_unavailable)
//   P5 same payload different namespace -> different event_id, no false dup
//   P6 retry with different metadata (causation_id) -> dedup, not collision
//      (preimage excludes metadata: resolves D-2 vs reverted-main in favor
//      of the identity law)
//   P7 10 concurrent equivalent emits -> 1 row + 9 duplicates
//   P8 10 concurrent forced collisions -> 1 accepted + 9 COLLISION,
//      canonical row untouched, only the winner dispatches
//   P9 historical IDs preserved: event_<16hex>, byte-identical format,
//      event_id == 'event_' + canonical_hash[0:16]
// Narrowest test seam for forced collisions: patch the IdentityAuthority
// singleton's generateIdWithDigest in the TEST ONLY. Production
// IdentityAuthority is not weakened.
const path = require('path');
const crypto = require('crypto');
const REPO = process.env.REPO || '/home/nolan/worktrees/constitutional-convergence-authority-law';
const pg = require('pg');
const { Pool } = pg;

const PGHOST = process.env.PGHOST || '127.0.0.1';
const PGPORT = parseInt(process.env.PGPORT || '15443', 10);
const PGUSER = process.env.PGUSER || 'postgres';
const PGPASSWORD = process.env.PGPASSWORD || 'lane3scratchpw';
const DB = 'lane3_passafter_' + Date.now().toString(36);

let pass = 0, fail = 0;
function check(cond, name, detail) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}

async function main() {
  const admin = new Pool({ host: PGHOST, port: PGPORT, user: PGUSER, password: PGPASSWORD, database: 'postgres' });
  await admin.query('CREATE DATABASE "' + DB + '"');
  await admin.end();
  const pool = new Pool({ host: PGHOST, port: PGPORT, user: PGUSER, password: PGPASSWORD, database: DB });

  const { UnifiedEventRuntime } = require(path.join(REPO, 'ping-runtime/events/unified_event_runtime.js'));
  const ia = require(path.join(REPO, 'runtime/kernel/authorities/identity_authority.js'));
  const uer = new UnifiedEventRuntime({ pool, eventValidator: null, eventGovernance: null });
  await uer.initialize();

  const dispatched = [];
  uer.on('LANE3_TEST', async (ev) => { dispatched.push({ event_id: ev.event_id, payload: ev.payload }); });

  const rowOf = async (id) =>
    (await pool.query('SELECT event_id, event_type, source, namespace, payload, metadata, canonical_hash, sequence FROM ping_events WHERE event_id=$1', [id])).rows[0];

  // ---- P1: fresh emit persists with the witness ----
  console.log('P1: fresh emit + witness');
  const p1 = await uer.emit('LANE3_TEST', 'lane3-probe', { k: 'v1' }, { namespace: 'core::system' });
  check(p1.status === 'ok' && !p1.deduplicated, 'P1 fresh emit ok, not a dedup');
  check(/^event_[0-9a-f]{16}$/.test(p1.eventId), 'P1 event_id is event_<16hex> (compact IDs preserved)', p1.eventId);
  const r1 = await rowOf(p1.eventId);
  const expectedDigest = ia.identityAuthority.generateIdWithDigest('event',
    { event_type: 'LANE3_TEST', source: 'lane3-probe', namespace: 'core::system', payload: { k: 'v1' } }).digest;
  check(r1 && r1.canonical_hash === expectedDigest, 'P1 stored canonical_hash equals the full preimage digest');
  check(r1 && r1.event_id === 'event_' + r1.canonical_hash.substring(0, 16), 'P1 event_id is byte-identical to witness prefix');

  // ---- P2: equivalent redelivery -> dedup ----
  console.log('P2: equivalent redelivery');
  const base2 = { ...uer.getStats() };
  const p2 = await uer.emit('LANE3_TEST', 'lane3-probe', { k: 'v1' }, { namespace: 'core::system' });
  const d2 = uer.getStats();
  check(p2.status === 'ok' && p2.deduplicated === true && !p2.code, 'P2 redelivery ok + deduplicated:true, no collision code');
  check(p2.sequence === p1.sequence, 'P2 duplicate resolves to the one persisted sequence');
  check(d2.deduplicated - base2.deduplicated === 1 && d2.collisions_rejected === base2.collisions_rejected, 'P2 stats: one dedup, zero collisions');

  // ---- P3: forced collision fails closed ----
  console.log('P3: forced collision');
  const origMint = ia.identityAuthority.generateIdWithDigest;
  const forcedId = p1.eventId;
  const evilDigest = 'ff'.repeat(32);
  ia.identityAuthority.generateIdWithDigest = () => ({ id: forcedId, digest: evilDigest });
  const dispBefore = dispatched.length;
  const base3 = { ...uer.getStats() };
  let p3;
  try {
    p3 = await uer.emit('LANE3_TEST', 'lane3-probe', { k: 'EVIL' }, { namespace: 'core::system' });
  } finally {
    ia.identityAuthority.generateIdWithDigest = origMint;
  }
  const d3 = uer.getStats();
  check(p3.status === 'error' && p3.code === 'EVENT_IDENTITY_CONFLICT' && p3.collision === true,
    'P3 collision fails closed with EVENT_IDENTITY_CONFLICT', JSON.stringify(p3));
  check(dispatched.length === dispBefore, 'P3 zero handler dispatches for the conflicting content');
  const r3 = await rowOf(forcedId);
  check(r3 && r3.payload.k === 'v1' && r3.canonical_hash === expectedDigest,
    'P3 stored row byte-untouched (no overwrite to detect the collision)');
  check((await pool.query('SELECT COUNT(*)::int AS c FROM ping_events WHERE event_id=$1', [forcedId])).rows[0].c === 1,
    'P3 no second row created');
  check(d3.collisions_rejected - base3.collisions_rejected === 1 && d3.failed - base3.failed === 1, 'P3 stats: one collision rejection');

  // ---- P4: legacy NULL-witness row ----
  console.log('P4: legacy NULL-witness row');
  const legacyId = 'event_' + crypto.createHash('sha256').update('lane3-legacy').digest('hex').substring(0, 16);
  await pool.query(
    `INSERT INTO ping_events (event_id, event_type, source, timestamp, payload, metadata, namespace)
     VALUES ($1, $2, $3, NOW(), $4, $5, $6)`,
    [legacyId, 'LANE3_TEST', 'legacy-loader', JSON.stringify({ legacy: true }), JSON.stringify({}), 'core::system']);
  const legCheck = await rowOf(legacyId);
  check(legCheck && legCheck.canonical_hash === null, 'P4 legacy row simulated with canonical_hash=NULL (never backfilled)');
  ia.identityAuthority.generateIdWithDigest = () => ({ id: legacyId, digest: 'ab'.repeat(32) });
  let p4;
  try {
    p4 = await uer.emit('LANE3_TEST', 'legacy-loader', { legacy: true }, { namespace: 'core::system' });
  } finally {
    ia.identityAuthority.generateIdWithDigest = origMint;
  }
  check(p4.status === 'ok' && p4.deduplicated === true && p4.witness_unavailable === true,
    'P4 legacy row takes the explicit legacy-dedup return, never silently claiming duplication');
  const r4 = await rowOf(legacyId);
  check(r4 && r4.canonical_hash === null && r4.payload.legacy === true, 'P4 legacy row untouched by the dedup');

  // ---- P5: namespace in preimage ----
  console.log('P5: namespace separation');
  const p5a = await uer.emit('LANE3_TEST', 'lane3-probe', { k: 'ns' }, { namespace: 'tenant::a' });
  const p5b = await uer.emit('LANE3_TEST', 'lane3-probe', { k: 'ns' }, { namespace: 'tenant::b' });
  check(p5a.status === 'ok' && p5b.status === 'ok' && p5a.eventId !== p5b.eventId && !p5b.deduplicated,
    'P5 same payload, different namespace -> different event_id, no false duplicate');

  // ---- P6: metadata excluded from preimage ----
  console.log('P6: metadata-insensitive idempotency');
  const lid6 = 'lane3-p6-' + Date.now().toString(36);
  const p6a = await uer.emit('LANE3_TEST', 'lane3-probe', { k: 'retry' }, { namespace: 'core::system', logical_id: lid6, causation_id: 'cause-1' });
  const p6b = await uer.emit('LANE3_TEST', 'lane3-probe', { k: 'retry' }, { namespace: 'core::system', logical_id: lid6, causation_id: 'cause-2' });
  check(p6b.status === 'ok' && p6b.deduplicated === true && !p6b.code && p6b.eventId === p6a.eventId,
    'P6 retry with different causation_id is an idempotent duplicate, NOT a collision (identity law: metadata excluded)');

  // ---- P7: 10 concurrent equivalent emits ----
  console.log('P7: concurrent equivalent race');
  const lid7 = 'lane3-p7-' + Date.now().toString(36);
  const c7 = await Promise.all(Array.from({ length: 10 }, () =>
    uer.emit('LANE3_TEST', 'lane3-probe', { batch: 7 }, { namespace: 'core::system', logical_id: lid7 })));
  check(c7.every((r) => r.status === 'ok'), 'P7 all 10 concurrent equivalent emits accepted');
  check(new Set(c7.map((r) => r.eventId)).size === 1, 'P7 exactly one canonical identity');
  check(new Set(c7.map((r) => r.sequence)).size === 1, 'P7 all resolve to the single persisted sequence');
  check(c7.filter((r) => r.deduplicated === true).length === 9, 'P7 one insert + nine duplicates');
  check(c7.every((r) => !r.code), 'P7 no collision suppression on any duplicate');
  check((await pool.query('SELECT COUNT(*)::int AS c FROM ping_events WHERE event_id=$1', [c7[0].eventId])).rows[0].c === 1,
    'P7 exactly one authoritative row after the race');

  // ---- P8: 10 concurrent forced collisions ----
  console.log('P8: concurrent collision race');
  const raceId = 'event_' + crypto.createHash('sha256').update('lane3-race-' + Date.now()).digest('hex').substring(0, 16);
  const dispBefore8 = dispatched.length;
  // Digest is deterministic per candidate payload: the nth candidate always
  // mints the same digest, so the winner's witness is independently
  // recomputable from the stored payload.
  const digestForPayload = (payload) =>
    crypto.createHash('sha256')
      .update('lane3-p8:event:' + JSON.stringify({ event_type: 'LANE3_TEST', source: 'lane3-probe', namespace: 'core::system', payload }))
      .digest('hex');
  ia.identityAuthority.generateIdWithDigest = (type, data) => ({
    id: raceId,
    digest: crypto.createHash('sha256').update('lane3-p8:' + type + ':' + JSON.stringify(data)).digest('hex'),
  });
  let c8;
  try {
    c8 = await Promise.all(Array.from({ length: 10 }, (_, i) =>
      uer.emit('LANE3_TEST', 'lane3-probe', { racer: i }, { namespace: 'core::system' })));
  } finally {
    ia.identityAuthority.generateIdWithDigest = origMint;
  }
  const ok8 = c8.filter((r) => r.status === 'ok');
  const col8 = c8.filter((r) => r.code === 'EVENT_IDENTITY_CONFLICT');
  check(ok8.length === 1, 'P8 exactly one candidate accepted', 'ok=' + ok8.length);
  check(col8.length === 9, 'P8 nine conflicting candidates fail closed with EVENT_IDENTITY_CONFLICT', 'collisions=' + col8.length);
  const winnerRow = await rowOf(raceId);
  const winnerDigestOk = winnerRow && winnerRow.canonical_hash === digestForPayload(winnerRow.payload);
  check(!!winnerDigestOk, 'P8 stored witness equals the WINNER candidate digest (canonical row untouched by losers)');
  check(dispatched.length === dispBefore8 + 1, 'P8 exactly one dispatch: the winner only; losing content never dispatched',
    'dispatched_delta=' + (dispatched.length - dispBefore8));
  check((await pool.query('SELECT COUNT(*)::int AS c FROM ping_events WHERE event_id=$1', [raceId])).rows[0].c === 1,
    'P8 exactly one row after the collision race');

  // ---- P9: history preservation sweep ----
  console.log('P9: history sweep');
  const all = (await pool.query("SELECT event_id, canonical_hash FROM ping_events WHERE event_id LIKE 'event_%'")).rows;
  check(all.every((r) => /^event_[0-9a-f]{16}$/.test(r.event_id)), 'P9 every event_id is byte-identical event_<16hex>');
  // The forced-collision seam (P8) deliberately breaks the witness-prefix
  // relationship (that is the attack); it is excluded from this invariant.
  const honest = all.filter((r) => r.event_id !== raceId);
  const witnessed = honest.filter((r) => r.canonical_hash !== null);
  check(witnessed.every((r) => /^[0-9a-f]{64}$/.test(r.canonical_hash) && r.event_id === 'event_' + r.canonical_hash.substring(0, 16)),
    'P9 every honestly-minted witnessed row: 64-hex digest, event_id == witness prefix (IDs never rewritten)');

  await pool.end();
  const admin2 = new Pool({ host: PGHOST, port: PGPORT, user: PGUSER, password: PGPASSWORD, database: 'postgres' });
  if (fail === 0) { await admin2.query('DROP DATABASE "' + DB + '"'); console.log('scratch database dropped'); }
  else { console.log('FAILURES: scratch database left for forensics: ' + DB); }
  await admin2.end();

  console.log('\nPASS-AFTER: ' + pass + ' pass, ' + fail + ' fail');
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => { console.error('FATAL', err); process.exit(2); });
