#!/usr/bin/env node
'use strict';
/* Phase 9: consistency model B proof (2026-09-19).
 *
 * The coordinator chose model B (durable derived representation). This file
 * proves it explicitly, no half-A/half-B, extending the T7 coverage in
 * convergence_invariants.js only where T7 leaves a gap:
 *   B1  derivation failure -> source commit intact; retry with the same
 *       identity converges (simulated mid-derivation crash)
 *   B2  derivation validation failure -> source intact, nothing manufactured
 *   B3  mission execution does not wait on the derived representation:
 *       bridge triggers from the UER event alone, before any derivation
 *   B4  duplicate derivation does not duplicate missions
 *   B5  missing representations rebuild with byte-identical identities at
 *       scale (5 events); rebuild is idempotent; ping_events untouched
 *   B6  NO_AUTHORITATIVE_COMMIT for null / shapeless / failed emit results
 *       (extends T7's error-status case)
 *   B7  rebuild skips adapter-converged (legacy_converged) rows: no second
 *       representation for an already-converged canonical event
 *   B8  structural: the derivation layer never writes to ping_events
 *       (no INSERT/UPDATE into the authoritative store)
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
const { LegacyIngressAdapter } = require(path.join(R, 'ping-runtime/events/legacy_ingress_adapter.js'));
const { MissionRuntime } = require(path.join(R, 'ping-runtime/orchestration/mission_runtime.js'));
const { EventToMissionBridge } = require(path.join(R, 'ping-runtime/orchestration/event_to_mission_bridge.js'));
const {
  deriveRepresentationAfterCommit, rebuildMissingRepresentations, auditCrossReferences,
} = require(path.join(R, 'ping-runtime/events/convergence_derivation.js'));
const {
  deriveEnvelopeId, canonicalEventHash,
} = require(path.join(R, 'ping-runtime/events/convergence_identity.js'));

const PGHOST = process.env.PGHOST || '127.0.0.1';
const PGPORT = parseInt(process.env.PGPORT || '15439', 10);
const PGUSER = process.env.PGUSER || 'postgres';
const PGPASSWORD = process.env.PGPASSWORD;
if (!PGPASSWORD) { console.error('FATAL: PGPASSWORD is required'); process.exit(2); }

const NONCE = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const DB = 'conv9_' + NONCE.replace(/[^a-z0-9]/g, '');

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
  const missions = new MissionRuntime({ pool, eventRuntime: uer });
  await missions.initialize();
  const bridge = new EventToMissionBridge({ eventRuntime: uer, missionRuntime: missions });
  bridge.start();

  const pingRow = async (eventId) =>
    (await pool.query('SELECT event_id, payload FROM ping_events WHERE event_id=$1', [eventId])).rows[0] || null;
  const reprBySource = async (eventId) => envelope.getRepresentationBySourceEventId(eventId);

  // ---- B1: derivation crash -> source intact, retry converges ----
  note('B1: derivation failure, source intact, retry converges');
  const r1 = await uer.emit('P9_TEST', 'p9-harness', { k: 1 }, { namespace: 'core::system', logical_id: 'p9-b1-' + NONCE });
  check(r1.status === 'ok', 'B1 authoritative commit ok');
  const origAccept = envelope.acceptCanonicalEvent.bind(envelope);
  let crashed = false;
  envelope.acceptCanonicalEvent = async () => { crashed = true; throw new Error('simulated derivation crash'); };
  let threw = false;
  try {
    await deriveRepresentationAfterCommit({ envelope, emitResult: r1 });
  } catch (e) { threw = /simulated derivation crash/.test(e.message); }
  envelope.acceptCanonicalEvent = origAccept;
  check(crashed && threw, 'B1 simulated crash propagated (derivation failed)');
  const src1 = await pingRow(r1.eventId);
  check(!!src1, 'B1 source commit survives the derivation failure');
  const p1 = typeof src1.payload === 'string' ? JSON.parse(src1.payload): src1.payload;
  check(p1.k === 1, 'B1 source content byte-intact after the failure');
  check((await reprBySource(r1.eventId)) === null, 'B1 no representation manufactured by the failed derivation');
  const retry1 = await deriveRepresentationAfterCommit({ envelope, emitResult: r1 });
  check(retry1.status === 'ok' && retry1.inserted === true, 'B1 retry with the same identity converges');
  const row1 = await reprBySource(r1.eventId);
  check(!!row1 && row1.event_id === r1.eventId && row1.envelope_id === deriveEnvelopeId(r1.eventId),
    'B1 retried derivation carries the canonical identity and deterministic envelope_id');

  // ---- B2: derivation validation failure -> source intact ----
  note('B2: derivation validation failure');
  const r2 = await uer.emit('P9_TEST', 'p9-harness', { k: 2 }, { namespace: 'core::system', logical_id: 'p9-b2-' + NONCE });
  const badEvent = Object.assign({}, r2.event, { payload: 'not-an-object' });
  const b2 = await envelope.acceptCanonicalEvent(badEvent);
  check(b2.status === 'error' && b2.code === 'ENVELOPE_VALIDATION_FAILED', 'B2 invalid derivation input fails closed', b2.code);
  check(!!(await pingRow(r2.eventId)), 'B2 source commit intact after validation failure');
  check((await reprBySource(r2.eventId)) === null, 'B2 no representation row for the rejected derivation');

  // ---- B3: missions do not wait on the derived representation ----
  note('B3: mission execution independent of derivation');
  const r3 = await uer.emit('REPLAY_COMPLETED', 'p9-harness', { doc: 'b3' },
    { namespace: 'core::system', logical_id: 'p9-b3-' + NONCE });
  const m3 = (await pool.query("SELECT COUNT(*)::int AS c FROM ping_missions WHERE mission_type='WITNESS_ATTEST'")).rows[0].c;
  check(m3 === 1, 'B3 mission created from the UER event alone (bridge = accepted-event -> mission authority)');
  check((await reprBySource(r3.eventId)) === null, 'B3 no representation exists yet: mission did not wait on derivation');
  let hook3 = 0;
  const d3 = await deriveRepresentationAfterCommit({ envelope, emitResult: r3, onDerived: async () => { hook3++; } });
  check(d3.status === 'ok' && d3.inserted === true && hook3 === 1, 'B3 derivation after the mission still converges exactly once');
  const m3b = (await pool.query("SELECT COUNT(*)::int AS c FROM ping_missions WHERE mission_type='WITNESS_ATTEST'")).rows[0].c;
  check(m3b === 1, 'B3 derivation created no additional mission');

  // ---- B4: duplicate derivation does not duplicate missions ----
  note('B4: duplicate derivation, no duplicate mission');
  const d4 = await deriveRepresentationAfterCommit({ envelope, emitResult: r3 });
  check(d4.status === 'ok' && d4.inserted === false, 'B4 duplicate derivation deduped');
  const m4 = (await pool.query("SELECT COUNT(*)::int AS c FROM ping_missions WHERE mission_type='WITNESS_ATTEST'")).rows[0].c;
  const mc4 = (await pool.query("SELECT COUNT(*)::int AS c FROM ping_events WHERE event_type='MISSION_CREATED'")).rows[0].c;
  check(m4 === 1 && mc4 === 1, 'B4 still exactly one mission and one MISSION_CREATED after duplicate derivation');

  // ---- B5: rebuild at scale, byte-identical identities, source untouched ----
  note('B5: rebuild at scale');
  const r5 = [];
  for (let i = 0; i < 5; i++) {
    const e = await uer.emit('P9_TEST', 'p9-harness', { n: i }, { namespace: 'core::system', logical_id: `p9-b5-${NONCE}-${i}` });
    r5.push(e);
    const d = await deriveRepresentationAfterCommit({ envelope, emitResult: e });
    if (d.status !== 'ok' || d.inserted !== true) throw new Error('B5 setup derive failed');
  }
  const snapBefore = (await pool.query('SELECT event_id, payload FROM ping_events ORDER BY event_id')).rows
    .map((r) => r.event_id + '|' + JSON.stringify(r.payload));
  const expectedHashes = {};
  for (const e of r5) expectedHashes[e.eventId] = canonicalEventHash(e.event);
  await pool.query('DELETE FROM canonical_events WHERE source_event_id = ANY($1)', [r5.map((e) => e.eventId)]);
  for (const e of r5) check((await reprBySource(e.eventId)) === null, 'B5 representations deleted (all 5)');
  const rb5 = await rebuildMissingRepresentations({ pool, envelope });
  // 7, not 5: the rebuild also converges two earlier unrepresented commits, which is
  // correct model-B behavior (B2's stored r2 was always valid; only the direct bad
  // acceptCanonicalEvent failed. B3's MISSION_CREATED was never derived).
  check(rb5.status === 'ok' && rb5.rebuilt === 7, 'B5 rebuild restored all 7 missing representations (5 deleted + B2 stored event + B3 MISSION_CREATED)', JSON.stringify(rb5));
  let identOk = true;
  for (const e of r5) {
    const row = await reprBySource(e.eventId);
    if (!row || row.event_id !== e.eventId || row.envelope_id !== deriveEnvelopeId(e.eventId)) { identOk = false; break; }
    const storedHash = row.metadata && row.metadata.envelope && row.metadata.envelope.canonical_hash;
    if (storedHash !== expectedHashes[e.eventId]) { identOk = false; break; }
  }
  check(identOk, 'B5 rebuilt rows carry byte-identical identities and content hashes');
  const rb5b = await rebuildMissingRepresentations({ pool, envelope });
  check(rb5b.rebuilt === 0, 'B5 rebuild is idempotent');
  const snapAfter = (await pool.query('SELECT event_id, payload FROM ping_events ORDER BY event_id')).rows
    .map((r) => r.event_id + '|' + JSON.stringify(r.payload));
  check(JSON.stringify(snapBefore) === JSON.stringify(snapAfter), 'B5 ping_events untouched by delete+rebuild (source of truth never rewritten)');

  // ---- B6: NO_AUTHORITATIVE_COMMIT shapes ----
  note('B6: commit-required gate shapes');
  const g1 = await deriveRepresentationAfterCommit({ envelope, emitResult: null });
  const g2 = await deriveRepresentationAfterCommit({ envelope, emitResult: { status: 'ok' } });
  const g3 = await deriveRepresentationAfterCommit({ envelope, emitResult: { status: 'ok', event: {} } });
  const g4 = await deriveRepresentationAfterCommit({ envelope, emitResult: { status: 'error', code: 'X' } });
  check([g1, g2, g3, g4].every((g) => g.status === 'error' && g.code === 'NO_AUTHORITATIVE_COMMIT'),
    'B6 null / shapeless / failed emit results all fail closed with NO_AUTHORITATIVE_COMMIT');

  // ---- B7: rebuild skips adapter-converged rows ----
  note('B7: rebuild respects adapter convergence');
  const legacy = await envelope.executeEmitEvent({
    tenantId: 'acme', eventType: 'project.created', source: 'hpp-api',
    actor: 'owner-1', payload: { name: 'B7 shop' },
  });
  const adapter = new LegacyIngressAdapter({ pool, eventRuntime: uer, pollIntervalMs: 60000, batchSize: 10, maxRetries: 3 });
  await adapter.initialize();
  await adapter._convergeBatch();
  const legRow = (await pool.query('SELECT source_event_id FROM canonical_events WHERE event_id=$1', [legacy.event_id])).rows[0];
  const Y = legRow && legRow.source_event_id;
  check(!!Y && /^event_/.test(Y), 'B7 legacy row converged to a canonical identity', String(Y));
  const rb7 = await rebuildMissingRepresentations({ pool, envelope });
  check(rb7.status === 'ok', 'B7 rebuild ok');
  const refCount = (await pool.query(
    "SELECT COUNT(*)::int AS c FROM canonical_events WHERE source_event_id=$1 OR metadata->'legacy_ingress'->>'canonical_event_id'=$1",
    [Y])).rows[0].c;
  check(refCount === 1, 'B7 exactly one canonical_events row references the converged canonical event (no second representation)');

  // ---- B8: structural: derivation never writes ping_events ----
  note('B8: structural write-boundary audit');
  const derivSrc = readFile('ping-runtime/events/convergence_derivation.js');
  const envSrc = readFile('gateway/canonical_event_envelope.js');
  const accStart = envSrc.indexOf('async acceptCanonicalEvent(event');
  const accTail = envSrc.slice(accStart);
  check(derivSrc.indexOf('INSERT INTO ping_events') === -1 && derivSrc.indexOf('UPDATE ping_events') === -1,
    'B8 coordinator: no INSERT/UPDATE into ping_events');
  check(accTail.indexOf('INSERT INTO ping_events') === -1 && accTail.indexOf('UPDATE ping_events') === -1,
    'B8 acceptCanonicalEvent: no INSERT/UPDATE into ping_events (derivation never writes the authoritative store)');
  const audit = await auditCrossReferences({ pool });
  check(audit.status === 'ok' && audit.danglingRepresentations.length === 0,
    'B8 no dangling representations (every derived row resolves to one authoritative commit)');

  await pool.end();
  const admin2 = adminPool();
  if (fail === 0) {
    await admin2.query(`DROP DATABASE "${DB}"`);
    note('scratch database dropped');
  } else {
    note('FAILURES: scratch database left in place for forensics: ' + DB);
  }
  await admin2.end();

  console.log(`\nphase 9 model-B proof: ${pass} pass, ${fail} fail`);
  process.exit(fail === 0 ? 0: 1);
}

main().catch((err) => {
  console.error('HARNESS ERROR:', err);
  process.exit(2);
});
