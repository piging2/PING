#!/usr/bin/env node
'use strict';
/* Phase 14: ordering (2026-09-19).
 *
 * Refactor-free verification of the converged law's actual ordering claims
 * (Phase 2 decision 4; P0-certified at ce3f8687c5):
 *   - canonical order = PostgreSQL-allocated global sequence on the UER path
 *     (nextval DEFAULT at insert; the INSERT never supplies it)
 *   - contract: unique, monotonically allocated; NOT gapless, NOT commit
 *     order, NOT wall-clock, NOT causal; sequence is storage metadata
 *     assigned AFTER identity, never an input to identity or hash
 *   - the envelope's per-tenant MAX(sequence)+1 (getNextSequence) is a
 *     RETIRED authority decision: receipt ordering only, never canonical
 *     order, never called on the converged path
 *
 *   O1  24 concurrent emits of distinct logical events -> 24 unique sequences
 *   O2  derived representation rows carry the commit's sequence exactly
 *       (carried, never recomputed), including under concurrent derivation
 *   O3  replay delivers in certified sequence order (deterministic total
 *       order where the law requires it)
 *   O4  identity/sequence separation under concurrency: re-emitting a
 *       committed logical event after many allocations returns the same
 *       identity and the original sequence
 *   O5  structural: no MAX(sequence) on any converged-path sequence
 *       allocation; the single MAX(sequence) site is confined to the retired
 *       getNextSequence; the UER INSERT never supplies sequence
 *   O6  dynamic: the full converged flow (emit + derive + rebuild) never
 *       calls getNextSequence
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
  deriveRepresentationAfterCommit, rebuildMissingRepresentations,
} = require(path.join(R, 'ping-runtime/events/convergence_derivation.js'));

const PGHOST = process.env.PGHOST || '127.0.0.1';
const PGPORT = parseInt(process.env.PGPORT || '15439', 10);
const PGUSER = process.env.PGUSER || 'postgres';
const PGPASSWORD = process.env.PGPASSWORD;
if (!PGPASSWORD) { console.error('FATAL: PGPASSWORD is required'); process.exit(2); }

const NONCE = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const DB = 'conv14_' + NONCE.replace(/[^a-z0-9]/g, '');

let pass = 0, fail = 0;
function check(cond, name, detail) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? ' :: ' + detail: '')); }
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

  // ---- O1: 24 concurrent emits -> 24 unique sequences ----
  note('O1: concurrent sequence allocation');
  const N = 24;
  const emits = await Promise.all(Array.from({ length: N }, (_, i) =>
    uer.emit('P14_TEST', 'p14-harness', { i }, { namespace: 'core::system', logical_id: `p14-o1-${NONCE}-${i}` })));
  check(emits.every((r) => r.status === 'ok'), 'O1 all 24 concurrent emits accepted');
  check(emits.every((r) => r.sequence !== null && r.sequence !== undefined), 'O1 every emit observed a sequence');
  const seqSet = new Set(emits.map((r) => String(r.sequence)));
  check(seqSet.size === N, 'O1 24 unique sequences under concurrency (no MAX+1 race, no silent conflict)', `unique=${seqSet.size}`);
  const idSet = new Set(emits.map((r) => r.eventId));
  check(idSet.size === N, 'O1 24 distinct canonical identities');

  // ---- O2: derived rows carry the commit sequence (concurrent derivation) ----
  note('O2: representation carries the commit sequence');
  const derives = await Promise.all(emits.map((e) => deriveRepresentationAfterCommit({ envelope, emitResult: e })));
  check(derives.every((r) => r.status === 'ok' && r.inserted === true), 'O2 all 24 concurrent derivations inserted');
  let seqMatch = true;
  for (const e of emits) {
    const row = (await pool.query('SELECT sequence FROM canonical_events WHERE source_event_id=$1', [e.eventId])).rows[0];
    if (!row || String(row.sequence) !== String(e.sequence)) { seqMatch = false; break; }
  }
  check(seqMatch, 'O2 every representation row carries its commit sequence exactly (carried, never recomputed)');

  // ---- O3: replay delivers certified sequence order ----
  note('O3: replay order');
  const rep = await uer.replay({ afterSequence: 0, limit: 10000 });
  check(rep.status === 'ok', 'O3 replay ok');
  const repSeqs = rep.events.map((e) => Number(e.sequence));
  let strictlyIncreasing = true;
  for (let i = 1; i < repSeqs.length; i++) {
    if (!(repSeqs[i] > repSeqs[i - 1])) { strictlyIncreasing = false; break; }
  }
  check(repSeqs.length === N && strictlyIncreasing,
    'O3 replay delivers the 24 events in strictly increasing certified sequence order');
  const repSet = new Set(repSeqs.map(String));
  check(repSet.size === N && [...seqSet].every((s) => repSet.has(s)),
    'O3 replayed set equals the allocated set (deterministic total order, no loss, no duplication)');

  // ---- O4: identity/sequence separation under concurrency ----
  note('O4: identity unaffected by allocation position');
  const re = await uer.emit('P14_TEST', 'p14-harness', { i: 0 }, { namespace: 'core::system', logical_id: `p14-o1-${NONCE}-0` });
  check(re.status === 'ok' && re.eventId === emits[0].eventId, 'O4 re-emit of a committed logical event returns the same identity');
  check(String(re.sequence) === String(emits[0].sequence), 'O4 duplicate resolves to the original sequence (sequence is storage metadata, not identity)');

  // ---- O5: structural: no MAX(sequence) on the converged allocation path ----
  note('O5: structural MAX(sequence) audit');
  const uerSrc = readFile('ping-runtime/events/unified_event_runtime.js');
  const envSrc = readFile('gateway/canonical_event_envelope.js');
  const derivSrc = readFile('ping-runtime/events/convergence_derivation.js');
  const adapterSrc = readFile('ping-runtime/events/legacy_ingress_adapter.js');
  const identSrc = readFile('ping-runtime/events/convergence_identity.js');
  // Strip comments so doc mentions do not count as computation sites.
  const stripComments = (src) => src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^\n'":])\/\/[^\n]*/g, '$1');
  const maxSeqCode = /MAX\s*\(\s*sequence\s*\)/gi;
  const codeIn = (src) => stripComments(src);
  // UER: the only max(sequence) computations are the two initialize-time migration uses
  // (legacy backfill offset + post-backfill setval), classified LEGACY BACKFILL ORDER.
  // The emit path allocates via the nextval DEFAULT and never computes MAX(sequence).
  const codeUer = codeIn(uerSrc);
  const uerHits = [...codeUer.matchAll(maxSeqCode)];
  const initIdx = codeUer.indexOf('async initialize(');
  const emitIdx = codeUer.indexOf('async emit(eventType');
  const uerHitsInInit = uerHits.filter((h) => h.index > initIdx && h.index < emitIdx);
  const uerHitsAtOrAfterEmit = uerHits.filter((h) => h.index >= emitIdx);
  check(uerHitsAtOrAfterEmit.length === 0,
    'O5 UER emit path: no MAX(sequence) computation (allocation is the nextval DEFAULT)',
    'code hits at/after emit: ' + uerHitsAtOrAfterEmit.length);
  check(uerHitsInInit.length === 2,
    'O5 UER initialize: exactly the two documented migration uses (backfill offset + setval)',
    'init hits=' + uerHitsInInit.length);
  check([...codeIn(derivSrc).matchAll(maxSeqCode)].length === 0, 'O5 derivation coordinator: no MAX(sequence)');
  check([...codeIn(adapterSrc).matchAll(maxSeqCode)].length === 0, 'O5 legacy ingress adapter: no MAX(sequence)');
  check([...codeIn(identSrc).matchAll(maxSeqCode)].length === 0, 'O5 convergence identity: no MAX(sequence)');
  // Envelope: the only MAX(sequence) COMPUTATION is inside getNextSequence
  // (retired receipt ordering). Remaining mentions are docs: block comments
  // (stripped above) and one authority-registration invariant string below.
  const codeEnv = codeIn(envSrc);
  const envHits = [...codeEnv.matchAll(maxSeqCode)];
  const gnsStart = codeEnv.indexOf('async getNextSequence(');
  const accIdx = codeEnv.indexOf('async acceptCanonicalEvent(event');
  const invStart = codeEnv.indexOf('invariants: [');
  const invEnd = codeEnv.indexOf('],', invStart);
  const inGns = (h) => h.index > gnsStart && h.index < accIdx;
  const inInv = (h) => invStart !== -1 && h.index > invStart && h.index < invEnd;
  check(envHits.length > 0 && envHits.every((h) => inGns(h) || inInv(h)) && envHits.some(inGns),
    'O5 envelope: every MAX(sequence) mention is the getNextSequence computation or a documented invariant string',
    'hits=' + envHits.length);
  check(envHits.filter(inGns).length === 1,
    'O5 the single MAX(sequence) computation is confined to getNextSequence (retired receipt ordering, never the converged path)');
  const insMatch = uerSrc.match(/INSERT INTO ping_events \(([^)]+)\)/);
  check(!!insMatch && !/\bsequence\b/.test(insMatch[1]),
    'O5 UER INSERT column list never supplies sequence (PostgreSQL DEFAULT allocates)', insMatch ? insMatch[1]: 'no match');
  const accTail = envSrc.slice(accIdx);
  check(/event\.sequence/.test(accTail), 'O5 acceptCanonicalEvent carries event.sequence (never computes one)');

  // ---- O6: dynamic: converged flow never calls getNextSequence ----
  note('O6: getNextSequence unused on the converged path');
  let seqCalls = 0;
  const origSeq = envelope.getNextSequence.bind(envelope);
  envelope.getNextSequence = async (...a) => { seqCalls++; return origSeq(...a); };
  const e6 = await uer.emit('P14_TEST', 'p14-harness', { v: 1 }, { namespace: 'core::system', logical_id: 'p14-o6-' + NONCE });
  await deriveRepresentationAfterCommit({ envelope, emitResult: e6 });
  await rebuildMissingRepresentations({ pool, envelope });
  check(seqCalls === 0, 'O6 emit + derive + rebuild never called getNextSequence');
  envelope.getNextSequence = origSeq;

  await pool.end();
  const admin2 = adminPool();
  if (fail === 0) {
    await admin2.query(`DROP DATABASE "${DB}"`);
    note('scratch database dropped');
  } else {
    note('FAILURES: scratch database left in place for forensics: ' + DB);
  }
  await admin2.end();

  console.log(`\nphase 14 ordering: ${pass} pass, ${fail} fail`);
  process.exit(fail === 0 ? 0: 1);
}

main().catch((err) => {
  console.error('HARNESS ERROR:', err);
  process.exit(2);
});
