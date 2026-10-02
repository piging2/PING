#!/usr/bin/env node
'use strict';
/* Phase 13: fanout exactly-once (2026-09-19).
 *
 * Proves duplicate delivery at each fanout point of the converged
 * architecture produces no duplicate effects:
 *   F1  mission bridge: natural duplicate emit + direct redelivery of the
 *       same accepted event -> exactly one mission row, one MISSION_CREATED
 *   F2  mission bridge: 10 concurrent duplicate deliveries -> one mission
 *   F3  worker runtime: duplicate dispatch runs the worker twice
 *       (at-least-once execution is honest) but yields exactly one
 *       WITNESS_CREATED canonical row
 *   F4  witness path: 6 concurrent attestations of the same certified replay
 *       -> exactly one WITNESS_CREATED row
 *   F5  replay reader: duplicate replay runs deliver the identical ordered
 *       sequence and write nothing
 *   F6  envelope derivation: 6 concurrent deriveRepresentationAfterCommit of
 *       the same commit -> one row, one downstream dispatch
 *   F7  lineage chain: duplicate WITNESS_CREATED deliveries -> exactly one
 *       LINEAGE_CREATE mission (lineage work is mission-triggered; duplicates
 *       collapse to one mission)
 *   F8  derive/rebuild race: concurrent derivation and rebuild converge to
 *       one representation with deterministic identities
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

const R = path.resolve(__dirname, '..', '..');

let pg;
try { pg = require('pg'); } catch (e) {
  pg = require('/home/nolan/worktrees/constitutional-convergence/tests/mc1-legacy-ingress/node_modules/pg');
}
const { Pool } = pg;

const { UnifiedEventRuntime } = require(path.join(R, 'ping-runtime/events/unified_event_runtime.js'));
const { CanonicalEventEnvelope } = require(path.join(R, 'gateway/canonical_event_envelope.js'));
const { MissionRuntime } = require(path.join(R, 'ping-runtime/orchestration/mission_runtime.js'));
const { EventToMissionBridge } = require(path.join(R, 'ping-runtime/orchestration/event_to_mission_bridge.js'));
const { WorkerRuntime } = require(path.join(R, 'ping-runtime/workers/worker_runtime.js'));
const { WitnessWorker } = require(path.join(R, 'ping-runtime/workers/canonical_workers.js'));
const {
  deriveRepresentationAfterCommit, rebuildMissingRepresentations,
} = require(path.join(R, 'ping-runtime/events/convergence_derivation.js'));
const { deriveEnvelopeId } = require(path.join(R, 'ping-runtime/events/convergence_identity.js'));

const PGHOST = process.env.PGHOST || '127.0.0.1';
const PGPORT = parseInt(process.env.PGPORT || '15439', 10);
const PGUSER = process.env.PGUSER || 'postgres';
const PGPASSWORD = process.env.PGPASSWORD;
if (!PGPASSWORD) { console.error('FATAL: PGPASSWORD is required'); process.exit(2); }

const NONCE = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const DB = 'conv13_' + NONCE.replace(/[^a-z0-9]/g, '');

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
  const missions = new MissionRuntime({ pool, eventRuntime: uer });
  await missions.initialize();
  const bridge = new EventToMissionBridge({ eventRuntime: uer, missionRuntime: missions });
  bridge.start();

  const missionCount = async (type) =>
    (await pool.query('SELECT COUNT(*)::int AS c FROM ping_missions' + (type ? ' WHERE mission_type=$1': ''), type ? [type]: [])).rows[0].c;
  const eventCount = async (type) =>
    (await pool.query('SELECT COUNT(*)::int AS c FROM ping_events WHERE event_type=$1', [type])).rows[0].c;

  // ---- F1: mission bridge, natural duplicate emit + redelivery ----
  note('F1: mission bridge duplicate delivery');
  const r1 = await uer.emit('REPLAY_COMPLETED', 'f13-harness', { doc: 'f1' },
    { namespace: 'core::system', logical_id: 'f13-f1-' + NONCE });
  check(r1.status === 'ok', 'F1 trigger event accepted');
  check((await missionCount('WITNESS_ATTEST')) === 1, 'F1 one WITNESS_ATTEST mission from the accepted event');
  // direct redelivery of the same accepted event object (duplicate delivery)
  await bridge._handleEvent(r1.event);
  await bridge._handleEvent(r1.event);
  await bridge._handleEvent(r1.event);
  check((await missionCount('WITNESS_ATTEST')) === 1, 'F1 still one mission after 3 redeliveries');
  // natural duplicate: re-emit the same logical event (dedup path dispatches handlers again)
  const r1b = await uer.emit('REPLAY_COMPLETED', 'f13-harness', { doc: 'f1' },
    { namespace: 'core::system', logical_id: 'f13-f1-' + NONCE });
  check(r1b.eventId === r1.eventId, 'F1 re-emit dedups to the same identity');
  check((await missionCount('WITNESS_ATTEST')) === 1, 'F1 still one mission after duplicate emit');
  check((await eventCount('MISSION_CREATED')) === 1, 'F1 exactly one MISSION_CREATED downstream event');

  // ---- F2: 10 concurrent duplicate deliveries at the bridge ----
  note('F2: 10 concurrent duplicate deliveries');
  const r2 = await uer.emit('REPLAY_COMPLETED', 'f13-harness', { doc: 'f2' },
    { namespace: 'core::system', logical_id: 'f13-f2-' + NONCE });
  const beforeF2 = await missionCount();
  await Promise.all(Array.from({ length: 10 }, () => bridge._handleEvent(r2.event)));
  // r2's own emit already created one mission; the 10 concurrent redeliveries must add none
  check((await missionCount()) === beforeF2, 'F2 10 concurrent redeliveries create zero additional missions');
  check((await eventCount('MISSION_CREATED')) === 2, 'F2 MISSION_CREATED count unchanged by the race (one per distinct trigger)');

  // ---- F3: worker runtime duplicate dispatch ----
  note('F3: worker runtime duplicate dispatch');
  const wr = new WorkerRuntime({ pool });
  const witness = new WitnessWorker({ eventRuntime: uer, pool });
  wr.register('witness', witness, { eventTypes: ['REPLAY_COMPLETED'] });
  const wrRoot = 'wr-f3-' + NONCE;
  const r3 = await uer.emit('REPLAY_COMPLETED', 'f13-harness',
    { documentId: 'doc-f3', replay: { verified: true, witness_root: wrRoot, fingerprint: 'fp', event_count: 5, violations: [], reason: 'ok' } },
    { namespace: 'core::system', logical_id: 'f13-f3-' + NONCE });
  const d3a = await wr.dispatch(r3.event);
  const d3b = await wr.dispatch(r3.event);
  check(d3a && d3a.status === 'ok' && d3b && d3b.status === 'ok', 'F3 both dispatches completed ok');
  const wstats = wr.getStats();
  check(wstats.workers.witness.totalProcessed === 2,
    'F3 worker honestly executed twice (at-least-once delivery; execution is not suppressed)');
  check((await eventCount('WITNESS_CREATED')) === 1, 'F3 exactly one WITNESS_CREATED canonical row despite two executions');
  const wrow = (await pool.query("SELECT payload FROM ping_events WHERE event_type='WITNESS_CREATED'")).rows[0];
  const wpayload = typeof wrow.payload === 'string' ? JSON.parse(wrow.payload): wrow.payload;
  check(wpayload.witness && wpayload.witness.replay_event_id === r3.eventId,
    'F3 the single attestation references the certified replay event');

  // ---- F4: witness path, 6 concurrent attestations ----
  note('F4: 6 concurrent witness attestations');
  const f4Root = 'wr-f4-' + NONCE;
  const r4 = await uer.emit('REPLAY_COMPLETED', 'f13-harness',
    { documentId: 'doc-f4', replay: { verified: true, witness_root: f4Root, fingerprint: 'fp', event_count: 2, violations: [], reason: 'ok' } },
    { namespace: 'core::system', logical_id: 'f13-f4-' + NONCE });
  const witness2 = new WitnessWorker({ eventRuntime: uer, pool });
  const f4res = await Promise.all(Array.from({ length: 6 }, () => witness2.handle(r4.event)));
  check(f4res.every((r) => r && r.status === 'ok'), 'F4 all 6 concurrent attestations returned ok');
  const f4count = (await pool.query(
    "SELECT COUNT(*)::int AS c FROM ping_events WHERE event_type='WITNESS_CREATED' AND payload->'witness'->>'witness_root'=$1",
    [f4Root])).rows[0].c;
  check(f4count === 1, 'F4 exactly one WITNESS_CREATED row for the raced attestation');

  // ---- F5: replay reader duplicate runs ----
  note('F5: duplicate replay runs');
  for (let i = 0; i < 5; i++) {
    await uer.emit('P13_TEST', 'f13-harness', { i }, { namespace: 'core::system', logical_id: `f13-f5-${NONCE}-${i}` });
  }
  const pingBefore = (await pool.query('SELECT COUNT(*)::int AS c FROM ping_events')).rows[0].c;
  const runReplay = async () => {
    const seen = [];
    const res = await uer.replay({ afterSequence: 0, limit: 10000, consumer: async (ev) => { seen.push(ev.event_id + ':' + ev.sequence); } });
    return { res, seen };
  };
  const ra = await runReplay();
  const rb = await runReplay();
  check(ra.res.status === 'ok' && rb.res.status === 'ok', 'F5 both replay runs ok');
  check(JSON.stringify(ra.seen) === JSON.stringify(rb.seen) && ra.seen.length > 0,
    'F5 duplicate replay delivers the identical ordered sequence', `n=${ra.seen.length}`);
  check(ra.res.lastSequence === rb.res.lastSequence, 'F5 identical cursor position across runs');
  const pingAfter = (await pool.query('SELECT COUNT(*)::int AS c FROM ping_events')).rows[0].c;
  check(pingAfter === pingBefore, 'F5 replay wrote nothing (read-only; no second execution state)');

  // ---- F6: concurrent derivation race vs the legacy (tenant_id, sequence) unique key ----
  note('F6: concurrent derivations of the same commit (race probe)');
  // F6-STATIC: deterministic defect proof. canonical_events carries TWO unique keys
  // (PRIMARY KEY event_id; UNIQUE tenant_id/sequence, a legacy receipt-ordering key),
  // but the envelope INSERT arbitrates only ON CONFLICT (event_id). Under a same-event
  // derivation race a loser can block on the winner's speculative (tenant_id, sequence)
  // tuple and raise 23505 instead of taking the DO NOTHING path. gateway/canonical_event_envelope.js ~L436.
  const uq = await pool.query(
    "SELECT c.conname FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid " +
    "JOIN pg_namespace n ON n.oid = t.relnamespace " +
    "WHERE t.relname = 'canonical_events' AND n.nspname = 'public' AND c.contype IN ('p','u') ORDER BY c.conname");
  const uqNames = uq.rows.map((r) => r.conname).join(',');
  check(uq.rows.length === 1 && uq.rows[0].conname === 'canonical_events_pkey',
    'F6-STATIC: envelope ON CONFLICT (event_id) arbiter covers every unique key on canonical_events',
    'unique keys: ' + uqNames);
  // Contrast: ping_events has ONLY the event_id PK, so the UER arbiter is complete and race-safe.
  const uqPing = await pool.query(
    "SELECT c.conname FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid " +
    "JOIN pg_namespace n ON n.oid = t.relnamespace " +
    "WHERE t.relname = 'ping_events' AND n.nspname = 'public' AND c.contype IN ('p','u')");
  check(uqPing.rows.length === 1 && uqPing.rows[0].conname === 'ping_events_pkey',
    'F6-STATIC: UER ON CONFLICT (event_id) covers the sole unique key on ping_events (race-safe)',
    'unique keys: ' + uqPing.rows.map((r) => r.conname).join(','));
  // F6-RACE: dynamic probe. 30 rounds x 12 concurrent same-event derivations.
  // A 23505 here is a spurious loud error on what must be an idempotent duplicate delivery.
  let race23505 = 0, cleanRounds = 0, hook6 = 0, rowsBad = 0;
  for (let round = 0; round < 30; round++) {
    const rr = await uer.emit('P13_TEST', 'f13-harness', { k: 600 + round },
      { namespace: 'core::system', logical_id: 'f13-f6-' + NONCE + '-' + round });
    const outs = await Promise.all(Array.from({ length: 12 }, () =>
      deriveRepresentationAfterCommit({ envelope, emitResult: rr, onDerived: async () => { hook6++; } }).then(
        (v) => ({ ok: true, v }),
        (e) => ({ ok: false, code: e.code }))));
    const errs = outs.filter((o) => !o.ok);
    if (errs.length === 0) {
      cleanRounds++;
      if (outs.filter((o) => o.v.inserted === true).length !== 1) rowsBad++;
    } else {
      race23505 += errs.length;
    }
    const rc = (await pool.query('SELECT COUNT(*)::int AS c FROM canonical_events WHERE source_event_id = $1', [rr.eventId])).rows[0].c;
    if (rc !== 1) rowsBad++;
  }
  check(race23505 === 0, 'F6-RACE: no spurious 23505 under 30x12 concurrent same-event derivations',
    '23505 errors=' + race23505 + ' cleanRounds=' + cleanRounds);
  check(rowsBad === 0, 'F6-RACE: every round (clean or dirty) converged to exactly one representation row',
    'badRounds=' + rowsBad);
  check(hook6 === 30, 'F6-RACE: exactly one downstream dispatch per round (30 rounds)', 'dispatches=' + hook6);

  // ---- F7: lineage chain under duplicate WITNESS_CREATED delivery ----
  note('F7: duplicate WITNESS_CREATED delivery');
  const r7 = await uer.emit('WITNESS_CREATED', 'f13-harness', { witness_root: 'wr-f7-' + NONCE },
    { namespace: 'core::system', logical_id: 'f13-f7-' + NONCE });
  // the emit itself dispatched to the bridge once; the 3 manual redeliveries must add nothing
  const lcBefore = await missionCount('LINEAGE_CREATE');
  await bridge._handleEvent(r7.event);
  await bridge._handleEvent(r7.event);
  await bridge._handleEvent(r7.event);
  check((await missionCount('LINEAGE_CREATE')) === lcBefore,
    'F7 duplicate WITNESS_CREATED deliveries -> no additional LINEAGE_CREATE mission (exactly one total)');

  // ---- F8: derive/rebuild race ----
  note('F8: derive/rebuild race');
  const r8 = await uer.emit('P13_TEST', 'f13-harness', { k: 8 }, { namespace: 'core::system', logical_id: 'f13-f8-' + NONCE });
  const [d8, rb8] = await Promise.all([
    deriveRepresentationAfterCommit({ envelope, emitResult: r8 }),
    rebuildMissingRepresentations({ pool, envelope }),
  ]);
  check(d8.status === 'ok', 'F8 derivation resolved ok under rebuild race');
  check(rb8.status === 'ok', 'F8 rebuild resolved ok under derivation race');
  const row8 = (await pool.query('SELECT * FROM canonical_events WHERE source_event_id=$1', [r8.eventId])).rows;
  check(row8.length === 1, 'F8 exactly one representation row after the race');
  check(row8[0].envelope_id === deriveEnvelopeId(r8.eventId) && row8[0].event_id === r8.eventId,
    'F8 deterministic identities after the race');
  const rb8b = await rebuildMissingRepresentations({ pool, envelope });
  check(rb8b.rebuilt === 0, 'F8 follow-up rebuild is a no-op (idempotent)');

  await pool.end();
  const admin2 = adminPool();
  if (fail === 0) {
    await admin2.query(`DROP DATABASE "${DB}"`);
    note('scratch database dropped');
  } else {
    note('FAILURES: scratch database left in place for forensics: ' + DB);
  }
  await admin2.end();

  console.log(`\nphase 13 fanout exactly-once: ${pass} pass, ${fail} fail`);
  process.exit(fail === 0 ? 0: 1);
}

main().catch((err) => {
  console.error('HARNESS ERROR:', err);
  process.exit(2);
});
