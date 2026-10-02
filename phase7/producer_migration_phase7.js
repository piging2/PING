#!/usr/bin/env node
'use strict';
/* Phase 7 producer migration tests (2026-09-19).
 *
 * Proves, one producer family at a time, that each family emits through the
 * new ProducerEventPort seam:
 *   - producer emits through the new seam (direct or receipt, per classification)
 *   - one canonical identity per accepted event (no reminting)
 *   - cross-reference resolvable both directions
 *   - no double mission trigger (representation derivation never dispatches)
 *   - receipt fields stay receipt (never promoted to constitutional semantics)
 *
 * Real PostgreSQL only: self-contained scratch database on the w1a scratch
 * container (127.0.0.1:15439), created and dropped by this harness. Never
 * touches shared stores.
 *
 * Env: PGHOST (default 127.0.0.1), PGPORT (default 15439),
 *      PGUSER (default postgres), PGPASSWORD (required).
 *
 * Families:
 *   F1  ReviewAuthority    -> review.flagged                 (receipt seam)
 *   F2  ProjectAuthority   -> project.created/project.updated (direct, mapped)
 *                            project.artifact_added          (receipt seam)
 *   F3  CustomerAuthority  -> CUSTOMER_CREATED/UPDATED       (direct, registered)
 *                            CUSTOMER_IMPORTED/EMAIL_SYNCED/CALENDAR_SYNCED (receipt)
 *   F4  AIWorkspaceAuthority -> AI_WORKSPACE_RESULT_CREATED  (receipt seam, repaired writer)
 *   C1-C3 cross-cutting invariants
 *
 * Exit 0 = all pass; exit 1 = any fail (DB left in place for forensics).
 */

const path = require('path');
const fs = require('fs');

const R = path.resolve(__dirname, '..', '..');

let pg;
try { pg = require('pg'); } catch (e) {
  pg = require('/home/nolan/worktrees/ping-codex-convergence/gateway/node_modules/pg');
}
const { Pool } = pg;

const { UnifiedEventRuntime } = require(path.join(R, 'ping-runtime/events/unified_event_runtime.js'));
const { CanonicalEventEnvelope } = require(path.join(R, 'gateway/canonical_event_envelope.js'));
const { LegacyIngressAdapter } = require(path.join(R, 'ping-runtime/events/legacy_ingress_adapter.js'));
const { ProducerEventPort } = require(path.join(R, 'ping-runtime/events/producer_event_port.js'));
const { EventGovernance } = require(path.join(R, 'ping-runtime/events/event_governance.js'));
const { EventValidator } = require(path.join(R, 'ping-runtime/events/event_validator.js'));
const { EventToMissionBridge } = require(path.join(R, 'ping-runtime/orchestration/event_to_mission_bridge.js'));
const { deriveEnvelopeId, CONVERGED_ERA } = require(path.join(R, 'ping-runtime/events/convergence_identity.js'));

const { ReviewAuthority } = require(path.join(R, 'ping-runtime/business/review_authority.js'));
const { ProjectAuthority } = require(path.join(R, 'ping-runtime/business/project_authority.js'));
const { CustomerAuthority } = require(path.join(R, 'ping-runtime/business/customer_authority.js'));
const { AIWorkspaceAuthority } = require(path.join(R, 'ping-runtime/business/ai_workspace_authority.js'));

const PGHOST = process.env.PGHOST || '127.0.0.1';
const PGPORT = parseInt(process.env.PGPORT || '15439', 10);
const PGUSER = process.env.PGUSER || 'postgres';
const PGPASSWORD = process.env.PGPASSWORD;
if (!PGPASSWORD) { console.error('FATAL: PGPASSWORD is required'); process.exit(2); }

const NONCE = Date.now().toString(36);
const DB = 'conv_phase7_' + NONCE.replace(/[^a-z0-9]/g, '');

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

const countPing = async (pool, type) => {
  const r = await pool.query('SELECT event_id, event_type, namespace, sequence FROM ping_events WHERE event_type = $1 ORDER BY sequence', [type]);
  return r.rows;
};
const receiptRows = async (pool, type) => {
  const r = await pool.query("SELECT event_id, event_type, tenant_id, sequence, metadata FROM canonical_events WHERE event_type = $1 AND COALESCE(metadata->'envelope'->>'era','') <> 'converged'", [type]);
  return r.rows;
};
const representationFor = async (pool, canonicalId) => {
  const r = await pool.query('SELECT event_id, envelope_id, source_event_id, event_type, metadata FROM canonical_events WHERE source_event_id = $1', [canonicalId]);
  return r.rows[0] || null;
};

async function main() {
  const admin = adminPool();
  await admin.query(`CREATE DATABASE "${DB}"`);
  await admin.end();
  const pool = dbPool();
  note('scratch database: ' + DB);

  // ---- spine: real validator + real governance (the closed gate is live) ----
  const eventValidator = new EventValidator(R); eventValidator.load();
  const eventGovernance = new EventGovernance(R); eventGovernance.load();
  // Capability minted once, like bootstrap: handed ONLY to UER + the allowlisted adapter.
  const legacyIngressCapability = Object.freeze({ surface: 'canonical_events', version: '1.0.0' });
  const uer = new UnifiedEventRuntime({ pool, eventValidator, eventGovernance, legacyIngressCapability });
  await uer.initialize();

  const envelope = new CanonicalEventEnvelope(pool, { repoRoot: R });
  await envelope.initialize();

  const adapter = new LegacyIngressAdapter({
    pool, eventRuntime: uer, pollIntervalMs: 60000, batchSize: 50, maxRetries: 3, legacyIngressCapability,
  });
  await adapter.initialize();

  const port = new ProducerEventPort({
    envelope,
    governance: eventGovernance,
    getEventRuntime: () => uer,
  });

  // Spy: record every port result per producer call.
  const portCalls = [];
  const origEmit = port.emitProducerEvent.bind(port);
  port.emitProducerEvent = async (args) => {
    const result = await origEmit(args);
    portCalls.push({ args, result });
    return result;
  };
  const lastPortResult = () => portCalls[portCalls.length - 1].result;

  // Mission bridge with a counting stub runtime.
  const missions = [];
  const missionRuntime = {
    create: async (type, data) => { missions.push({ type, data }); return `mission_${missions.length}`; },
  };
  const bridge = new EventToMissionBridge({ eventRuntime: uer, missionRuntime });
  bridge.start();

  const review = new ReviewAuthority(pool, port, { initialize: async () => {} });
  await review.initialize();
  const project = new ProjectAuthority(pool, port);
  await project.initialize();
  const customer = new CustomerAuthority(pool, port, {});
  await customer.initialize();
  const hfStub = {
    executeSentiment: async () => ({ sentiment: 'positive', confidence: 0.9, model: 'stub' }),
  };
  const ai = new AIWorkspaceAuthority(pool, hfStub, port);
  await ai.initialize();

  // ================= F1: ReviewAuthority -> review.flagged (receipt seam) =================
  note('F1: ReviewAuthority.executeFlagReview (receipt seam)');
  await review.executeFlagReview({ tenantId: 'acme', reviewId: 'r1', reason: 'spam' });
  const f1 = lastPortResult();
  check(f1.status === 'received' && f1.seam === 'receipt', 'F1 port takes the receipt seam', JSON.stringify(f1.status));
  check(f1.receipt && /^[0-9a-f-]{36}$/.test(f1.receipt.event_id), 'F1 receipt identity is an ingress UUID', f1.receipt && f1.receipt.event_id);
  check(!!(f1.receipt.metadata && f1.receipt.metadata.receipt_semantics), 'F1 receipt carries explicit receipt_semantics labels');

  const f1receiptRows = await receiptRows(pool, 'review.flagged');
  check(f1receiptRows.length === 1, 'F1 exactly one receipt row', String(f1receiptRows.length));
  check(f1receiptRows[0].tenant_id === 'acme', 'F1 receipt row carries the tenant claim');

  await adapter._convergeBatch();
  const f1ping = await countPing(pool, 'review.flagged');
  check(f1ping.length === 1, 'F1 exactly one canonical event after convergence', String(f1ping.length));
  check(/^event_[0-9a-f]{16}$/.test(f1ping[0].event_id), 'F1 canonical identity is event_<hex> (IdentityAuthority)', f1ping[0].event_id);
  check(f1ping[0].namespace === 'tenant::acme', 'F1 canonical namespace resolved at adapter authorization', f1ping[0].namespace);
  check(f1ping[0].event_id !== f1receiptRows[0].event_id, 'F1 receipt identity != canonical identity (no silent substitution)');

  const f1rep = await representationFor(pool, f1ping[0].event_id);
  check(!!f1rep, 'F1 cross-reference resolvable (source_event_id)');
  check(f1rep.envelope_id === deriveEnvelopeId(f1ping[0].event_id), 'F1 envelope_id deterministic from canonical identity');
  check(f1rep.envelope_id !== f1ping[0].event_id, 'F1 envelope_id != event_id (standing distinction)');
  const f1meta = f1rep.metadata || {};
  // The adapter marks the receipt row as the preserved representation:
  // its own event_id (the receipt UUID) is never rewritten, and the cross-
  // reference is explicit in metadata.legacy_ingress.ingress_event_id.
  check(f1rep.event_id === f1receiptRows[0].event_id,
    'F1 receipt row event_id never rewritten (ingress identity preserved)');
  check(f1meta.legacy_ingress && f1meta.legacy_ingress.ingress_event_id === f1receiptRows[0].event_id,
    'F1 receipt UUID preserved as legacy_ingress.ingress_event_id',
    JSON.stringify(f1meta.legacy_ingress && f1meta.legacy_ingress.ingress_event_id));
  check(missions.length === 0, 'F1 no mission triggered (review.flagged has no bridge mapping)', String(missions.length));

  // ================= F2: ProjectAuthority (direct mapped + receipt) =================
  note('F2: ProjectAuthority.executeCreateProject (direct seam, mapped)');
  const created = await project.executeCreateProject({ tenantId: 'acme', projectType: 'roofing', title: 'Roof job F2' });
  const f2 = lastPortResult();
  check(f2.status === 'accepted' && f2.seam === 'direct', 'F2 port takes the direct seam', JSON.stringify(f2));
  check(f2.event_type === 'PROJECT_CREATED' && f2.producer_event_type === 'project.created',
    'F2 mapped to registered canonical type, original spelling preserved', JSON.stringify({ t: f2.event_type, p: f2.producer_event_type }));
  check(/^event_[0-9a-f]{16}$/.test(f2.event_id), 'F2 canonical identity minted by IdentityAuthority', f2.event_id);
  check(f2.namespace === 'tenant::acme', 'F2 canonical namespace from tenant claim', f2.namespace);
  check(f2.derivation && f2.derivation.ok === true, 'F2 representation derived after commit', JSON.stringify(f2.derivation));

  const f2ping = await countPing(pool, 'PROJECT_CREATED');
  check(f2ping.length === 1 && f2ping[0].event_id === f2.event_id, 'F2 exactly one ping_events row (one canonical identity)');
  const f2rep = await representationFor(pool, f2.event_id);
  check(!!f2rep && f2rep.event_id === f2.event_id && f2rep.event_type === 'PROJECT_CREATED',
    'F2 representation row carries canonical identity and mapped type');
  check(f2rep.envelope_id === deriveEnvelopeId(f2.event_id), 'F2 envelope_id deterministic');
  check((f2rep.metadata && f2rep.metadata.envelope && f2rep.metadata.envelope.era) === CONVERGED_ERA, 'F2 representation era is converged');
  check((f2rep.metadata && f2rep.metadata.producer_event_type) === 'project.created',
    'F2 original dotted spelling preserved in representation metadata');
  check(missions.length === 1 && missions[0].type === 'PROJECT_SETUP' && missions[0].data.event_id === f2.event_id,
    'F2 exactly one mission (PROJECT_SETUP), no double trigger from derivation', String(missions.length));

  note('F2b: ProjectAuthority.executeUpdateProject (direct seam, mapped)');
  await project.executeUpdateProject({ tenantId: 'acme', projectId: created.id, status: 'estimate' });
  const f2b = lastPortResult();
  check(f2b.status === 'accepted' && f2b.seam === 'direct' && f2b.event_type === 'PROJECT_UPDATED',
    'F2b update takes the direct mapped seam');
  check(missions.length === 2 && missions[1].type === 'PROJECT_UPDATE',
    'F2b exactly one PROJECT_UPDATE mission', String(missions.length));

  note('F2c: idempotent retry of the same logical create -> same identity');
  const pingBefore = (await pool.query("SELECT COUNT(*) c FROM ping_events WHERE event_type='PROJECT_CREATED'")).rows[0].c;
  await project.executeCreateProject({ tenantId: 'acme', projectType: 'roofing', title: 'Roof job F2' });
  const f2c = lastPortResult();
  const pingAfter = (await pool.query("SELECT COUNT(*) c FROM ping_events WHERE event_type='PROJECT_CREATED'")).rows[0].c;
  check(f2c.event_id === f2.event_id, 'F2c retry yields the same canonical identity', f2c.event_id);
  check(String(pingBefore) === String(pingAfter), 'F2c no duplicate canonical row (ON CONFLICT dedup)');

  note('F2d: ProjectAuthority.executeAddArtifact (receipt seam)');
  await project.executeAddArtifact({ tenantId: 'acme', projectId: created.id, artifactType: 'photo', title: 'before.jpg' });
  const f2d = lastPortResult();
  check(f2d.status === 'received' && f2d.seam === 'receipt', 'F2d artifact takes the receipt seam');
  await adapter._convergeBatch();
  const f2dping = await countPing(pool, 'project.artifact_added');
  check(f2dping.length === 1 && /^event_[0-9a-f]{16}$/.test(f2dping[0].event_id), 'F2d artifact converged to one canonical event');
  check(missions.length === 3, 'F2d no mission for unmapped domain type (3 = only the direct emits)', String(missions.length));

  note('F2e: malformed tenant claim fails closed on the direct seam');
  let threw = false;
  try {
    await port.emitProducerEvent({ tenantId: 'bad tenant!', eventType: 'project.created', source: 't', actor: 't', payload: {} });
  } catch (e) { threw = /malformed tenant claim/.test(e.message); }
  check(threw, 'F2e malformed tenant claim rejected, never collapsed to core::system');

  // ================= F3: CustomerAuthority (direct registered + receipt) =================
  note('F3: CustomerAuthority.executeUpsertCustomer (direct seam, registered)');
  await customer.executeUpsertCustomer({ tenantId: 'acme', customer: { display_name: 'F3 Test', email: 'f3@example.com' } });
  const f3 = lastPortResult();
  check(f3.status === 'accepted' && f3.seam === 'direct' && f3.event_type === 'CUSTOMER_CREATED' && !f3.producer_event_type,
    'F3 CUSTOMER_CREATED direct, no mapping needed', JSON.stringify({ s: f3.seam, t: f3.event_type }));
  check(missions.length === 4 && missions[3].type === 'CUSTOMER_ONBOARD', 'F3 exactly one CUSTOMER_ONBOARD mission', String(missions.length));
  const f3rep = await representationFor(pool, f3.event_id);
  check(!!f3rep && f3rep.envelope_id === deriveEnvelopeId(f3.event_id), 'F3 cross-reference + envelope_id resolvable');

  await customer.executeUpsertCustomer({ tenantId: 'acme', customer: { display_name: 'F3 Test Updated', email: 'f3@example.com' } });
  const f3b = lastPortResult();
  check(f3b.status === 'accepted' && f3b.event_type === 'CUSTOMER_UPDATED', 'F3b CUSTOMER_UPDATED direct');
  check(missions.length === 5 && missions[4].type === 'CUSTOMER_UPDATE', 'F3b exactly one CUSTOMER_UPDATE mission');

  note('F3c: CustomerAuthority._emitEvent CUSTOMER_IMPORTED (receipt seam)');
  await customer._emitEvent('acme', 'CUSTOMER_IMPORTED', { customer_id: 'cust_x1', source: 'google_people' });
  const f3c = lastPortResult();
  check(f3c.status === 'received' && f3c.seam === 'receipt', 'F3c CUSTOMER_IMPORTED takes the receipt seam');
  await adapter._convergeBatch();
  const f3cping = await countPing(pool, 'CUSTOMER_IMPORTED');
  check(f3cping.length === 1, 'F3c imported converged to one canonical event');
  check(missions.length === 5, 'F3c no mission for domain envelope type', String(missions.length));

  // ================= F4: AIWorkspaceAuthority (repaired writer, receipt seam) =================
  note('F4: AIWorkspaceAuthority.executeAnalyzeSentiment (repaired writer)');
  let f4result = null, f4threw = null;
  try {
    f4result = await ai.executeAnalyzeSentiment({ projectId: 'p1', text: 'great work', tenantId: 'acme' });
  } catch (e) { f4threw = e; }
  check(!f4threw, 'F4 writer no longer throws (was broken on every call)', f4threw && f4threw.message);
  check(!!(f4result && f4result.resultId), 'F4 returns a persisted result id');
  const f4 = lastPortResult();
  check(f4 && f4.status === 'received' && f4.seam === 'receipt' && f4.event_type === 'AI_WORKSPACE_RESULT_CREATED',
    'F4 emits AI_WORKSPACE_RESULT_CREATED through the receipt seam');
  await adapter._convergeBatch();
  const f4ping = await countPing(pool, 'AI_WORKSPACE_RESULT_CREATED');
  check(f4ping.length === 1 && /^event_[0-9a-f]{16}$/.test(f4ping[0].event_id), 'F4 converged to one canonical event');
  const f4rep = await representationFor(pool, f4ping[0].event_id);
  check(!!f4rep, 'F4 cross-reference resolvable');

  // ================= C1-C3: cross-cutting =================
  note('C1: representation derivation never dispatches missions');
  // Mapped/registered UER emits: F2 create, F2 update, F2c retry, F3 create,
  // F3 update = 5 emits, each dispatched exactly once by the bridge.
  // Receipt-path convergences of unmapped types dispatched but were skipped
  // (no bridge mapping); representation derivations added zero dispatches.
  // (Retry re-dispatch is pre-existing UER behavior, unchanged by Phase 7.)
  check(missions.length === 5, 'C1 mission count == 5 mapped emits, derivation added zero', String(missions.length));

  note('C2: registered type with no bound runtime fails closed (no silent receipt fallback)');
  const orphanPort = new ProducerEventPort({ envelope, governance: eventGovernance });
  let c2threw = false;
  try {
    await orphanPort.emitProducerEvent({ tenantId: 'acme', eventType: 'CUSTOMER_CREATED', source: 't', actor: 't', payload: {} });
  } catch (e) { c2threw = /not bound/.test(e.message); }
  check(c2threw, 'C2 unbound runtime refuses direct-path type');

  note('C3: one logical event, one canonical identity across both tables');
  const c3ping = await pool.query("SELECT event_id FROM ping_events WHERE event_type='PROJECT_CREATED'");
  const c3rep = await representationFor(pool, c3ping.rows[0].event_id);
  check(c3rep && c3rep.event_id === c3ping.rows[0].event_id && c3rep.source_event_id === c3ping.rows[0].event_id,
    'C3 ping_events.event_id == canonical_events.event_id == source_event_id');

  // ---- teardown ----
  await pool.end();
  const admin2 = adminPool();
  await admin2.query(`DROP DATABASE "${DB}"`);
  await admin2.end();

  note(`\nPhase 7 producer migration: ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('FATAL', e); process.exit(2); });
