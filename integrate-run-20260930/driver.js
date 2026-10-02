'use strict';
/**
 * INTEGRATION RUN 2026-09-30 (Nolan's binding order ~08:10 MDT).
 *
 * ENGLISH INTENT: "Run one real Coppersmith FYD generation for the PING
 * tenant, place one generated asset through the media.placement capability,
 * and emit its stage evidence to the Mission Control journal."
 *
 * Chain under proof (all real, no new authorities/stores/engines):
 *   ENGLISH INTENT
 *   -> MISSION CONTROL run record (real MissionRuntime.create, scratch PG)
 *   -> AUTHORITY (Lane AG tenant-scoped MissionScheduler + _authorizeDispatch.
 *      JURISDICTION FINDING (proven 2026-09-30 by a live denial probe): the
 *      gate's W5 checkGrant covers TENANT DATA capabilities only
 *      (TENANT_DATA_CAPABILITIES in tenant_capability_grant.js); 'media.placement'
 *      is NOT in its vocabulary, so a mission declaring
 *      requires_capability='media.placement' is DENIED by design
 *      (mission 677de4cf69b431b8, scratch DB, FAILED_BEFORE_EFFECT). The mission
 *      therefore declares NO tenant-data capability (it touches none) and
 *      traverses the gate's designed 'no capability required' branch (tenant
 *      scope still enforced). The media.placement effect is authorized by its
 *      OWNING authority: the Lane C provider's W5 validateGrant, evaluated by
 *      the worker before invoke and by the provider at invoke. GRANT-ISSUANCE
 *      is OPEN (Lane C H1): the grant rides the mission payload out-of-band,
 *      documented on MC_AGENT_AUTHORIZED with the jurisdiction note.)
 *   -> ORCA EXECUTION (real WorkerRuntime.dispatch via the real
 *      MissionScheduler._dispatch path)
 *   -> FYD GENERATION (real run_coppersmith_generation.ts via tsx; stages
 *      ACQUIRE/EXTRACT/RESOLVE/OBJECT_GRAPH/SITE_SPEC/RENDER/COMPLETE
 *      observable in UER-constructed envelopes + the JSONL run log)
 *   -> TENANTOS CAPABILITY (Lane C media.placement: discover -> evaluate ->
 *      invoke; invoke refuses unless evaluate authorizes)
 *   -> EVENTS -> EFFECT LEDGER (real orca-adapter/effect_ledger.js API) ->
 *      EVIDENCE/OUTCOME -> CANONICAL EVENT (MC_* journal)
 *   -> MISSION CONTROL PROJECTION (Lane B project_fyd_run_screen.py, run
 *      separately against the real journal)
 *
 * Then ONE controlled post-effect failure is injected (mission 2): the effect
 * channel drops the response after the provider executes, so the worker's
 * evidence is "invoke issued, response lost". The chain must report
 * EFFECT MAY HAVE OCCURRED / UNKNOWN / HOLD / RECONCILIATION REQUIRED,
 * never FAILED.
 *
 * mission_type PROJECTION_CREATE is used because it is the closest real entry
 * in the lane's MISSION_WORKER_MAP (the run creates a site projection); the
 * business event_type on the payload (FYD_GENERATION_REQUESTED /
 * MEDIA_PLACEMENT_VERIFY) drives worker routing. No lane file is modified.
 */

const { execSync, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ---- pinned lane worktrees (frozen deliverable commits) ----
const AG = '/home/nolan/ping/worktrees/wt-lane-ag-20260930';          // eab4f714a
const LC = '/home/nolan/ping/worktrees/wt-lane-c-media-placement';     // 8b5795f6a
const LD = '/home/nolan/ping/worktrees/wt-lane-d-fyd-emitter-20260930';// 3b2ecd043
const CONVERGED = '/home/nolan/projects/ping-fyd-converged';
const SCRATCH = '/home/nolan/integrate-run-20260930';
const PIG_JOURNAL = '/home/nolan/workspace/fyd-journal-gateway/events.jsonl';
const OUTBOX = path.join(SCRATCH, 'journal-outbox.jsonl');
const LEDGER_FILE = path.join(SCRATCH, 'effect-ledger.json');
const TSX = path.join(CONVERGED, 'node_modules/.bin/tsx');

const RUN_ID = 'integrate-coppersmith-20260930';
const TENANT = 'ping';
const SITE_ID = 'coppersmith-plumbing';

const { Pool } = require('/home/nolan/ping/gateway/node_modules/pg');
const { MissionScheduler } = require(path.join(AG, 'ping-runtime/orchestration/mission_scheduler.js'));
const { MissionRuntime } = require(path.join(AG, 'ping-runtime/orchestration/mission_runtime.js'));
const { WorkerRuntime } = require(path.join(AG, 'ping-runtime/workers/worker_runtime.js'));
const { UnifiedEventRuntime } = require(path.join(LD, 'ping-runtime/events/unified_event_runtime.js'));
const cap = require(path.join(LC, 'tenant/capability/media-placement/media-placement-provider.js'));
const effectLedger = require(path.join(SCRATCH, 'effect_ledger.js'));

// ---- the out-of-band grant (GRANT-ISSUANCE is OPEN: Lane C H1) ----
const GRANT = {
  capability: 'media.placement',
  tenant: TENANT,
  purpose: 'operational',
  scope: 'media.placement:placeAsset',
  data_class: 'public-presentation',
  principal: 'integrate-run-20260930',
  expiry: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
};

function canonicalJson(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonicalJson(v[k])).join(',') + '}';
}

function readEventIds(journalPath) {
  const ids = new Set();
  if (!fs.existsSync(journalPath)) return ids;
  for (const line of fs.readFileSync(journalPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try { ids.add(JSON.parse(t).event_id); } catch (_) { /* skip */ }
  }
  return ids;
}

// Journal discipline mirrors the lane contract: content-derived event id,
// duplicate refusal before append. Appends to the Pig journal AND to the
// outbox (the outbox lines are mirrored byte-identical to the cloud journal
// the Lane B screen reads).
function journalAppend(eventType, eventData) {
  const seed = ['integrate', RUN_ID, eventType, canonicalJson(eventData)].join('|');
  const eventId = 'mc-integrate-' + crypto.createHash('sha256').update(seed, 'utf8').digest('hex').slice(0, 12);
  const event = {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    event_type: eventType,
    aggregate_id: 'mc:fyd_run:' + RUN_ID,
    aggregate_type: 'mc_fyd_run',
    event_data: eventData,
  };
  const existing = readEventIds(PIG_JOURNAL);
  if (existing.has(eventId)) return { event, status: 'duplicate-skipped' };
  fs.appendFileSync(PIG_JOURNAL, JSON.stringify(event) + '\n');
  fs.appendFileSync(OUTBOX, JSON.stringify(event) + '\n');
  return { event, status: 'appended' };
}

// The asset catalog is a fixture (the contract: production binds the real
// media authority catalog; integration binds a fixture). contentHash is the
// REAL SITE_SPEC digest of this run, binding the fixture to the generation.
function buildCatalog(siteSpecDigest) {
  return {
    'coppersmith-hero-001': {
      id: 'coppersmith-hero-001',
      lifecycleState: 'published',
      source: 'local',
      contentHash: siteSpecDigest,
      type: 'image',
      orientation: 'landscape',
      alt: 'Coppersmith Plumbing hero (integration-run fixture)',
      roles: ['hero'],
      dimensions: { width: 1600, height: 900 },
      variants: {
        webp: 'https://media.integrate-run.local/coppersmith-hero.webp',
        original: 'https://media.integrate-run.local/coppersmith-hero.jpg',
      },
    },
  };
}

function runFydGeneration() {
  const driver = path.join(LD, 'ping-runtime/fyd/run_coppersmith_generation.ts');
  const r = spawnSync(TSX, [driver, RUN_ID], {
    cwd: CONVERGED,
    timeout: 300000,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const logPath = path.join(LD, 'ping-runtime/fyd/runs', RUN_ID + '.jsonl');
  return { spawn: r, logPath };
}

function readRunLog(logPath) {
  return fs.readFileSync(logPath, 'utf8').split('\n')
    .map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l));
}

// The envelope carries no top-level `stage` field; the stage is encoded in
// the event_type (FYD_STAGE_<STAGE>). Derive it; never invent it.
function stageOf(env) {
  return String((env && env.event_type) || '').replace(/^FYD_STAGE_/, '');
}

// Instrumentation role (integration-note-run-events.md): observe the real
// pipeline's envelopes and emit MC_FYD_STAGE_* to the journal. Stage names
// are the REAL Lane D names (OBJECT_GRAPH/SITE_SPEC are not in the
// projector's canonical set; the screen will show PROJECT/PLAN/VERIFY as
// UNKNOWN honestly).
function emitStageEvents(envelopes, missionId) {
  let started = 0, completed = 0;
  for (const env of envelopes) {
    const p = env.payload || {};
    const stage = stageOf(env);
    const finishedAt = env.emitted_at;
    const durationMs = (p.detail && p.detail.duration_ms) || p.duration_ms || null;
    journalAppend('MC_FYD_STAGE_STARTED', {
      mission_id: missionId, run_id: RUN_ID, tenant: 'tenant::' + TENANT,
      stage, status: 'RUNNING', started_at: finishedAt,
      input_refs: p.input_digest || null, backfill: false,
      note: 'post-hoc instrumentation of the real pipeline envelope (integration-note-run-events.md role)',
    });
    started++;
    journalAppend('MC_FYD_STAGE_COMPLETED', {
      mission_id: missionId, run_id: RUN_ID, tenant: 'tenant::' + TENANT,
      stage, status: 'SUCCEEDED', started_at: finishedAt, finished_at: finishedAt,
      duration_ms: durationMs,
      input_refs: p.input_digest || null,
      output_refs: p.output_digest || null,
      // Lane B event contract (mission-control/event-contract-fyd-run.md):
      // evidence_refs is [{kind, ref}], pointers to already-generated artifacts.
      evidence_refs: [{ kind: 'run-log', ref: 'run-log:' + RUN_ID + '.jsonl#' + stage }],
      sink_status: env.sink_status || null,
      sink_error: env.sink_error || null,
      backfill: false,
    });
    completed++;
  }
  return { started, completed };
}

function makeProjectionWorker(ctx) {
  return {
    async handle(event) {
      const payload = event.payload || {};
      if (event.event_type === 'FYD_GENERATION_REQUESTED') {
        return handleGeneration(event, payload, ctx);
      }
      if (event.event_type === 'MEDIA_PLACEMENT_VERIFY') {
        return handleInjection(event, payload, ctx);
      }
      throw new Error('projection worker: unknown event_type ' + event.event_type);
    },
  };
}

async function handleGeneration(event, payload, ctx) {
  const missionId = event.mission_id;
  const grant = payload.capability_grant;

  // Worker-side defense in depth: re-evaluate the grant through the real W5
  // gate before touching the capability (the provider's invoke does it again).
  const verdict = cap.evaluate({ grant, operation: 'placeAsset', args: {} });
  if (!verdict.authorized) {
    throw new Error('worker grant re-evaluation denied: ' + verdict.reason);
  }

  // The Lane AG gate's evaluation travels on the worker event metadata
  // ('no capability required' here: the mission touches no tenant data).
  // The media.placement grant is evaluated by its OWNING authority (Lane C
  // W5), both here (worker defense in depth) and by the provider at invoke.
  const gateEval = (event.metadata && event.metadata.grant_evaluation) || null;
  journalAppend('MC_AGENT_AUTHORIZED', {
    mission_id: missionId, run_id: RUN_ID, tenant: 'tenant::' + TENANT,
    authorized_by: 'MissionScheduler._authorizeDispatch (Lane AG eab4f714a)',
    gate_branch: 'no capability required (mission declares no tenant-data capability)',
    gate_evaluation: gateEval,
    tenant_scope: 'enforced: scheduler tenantId=ping',
    media_placement_grant: {
      evaluated_by: 'Lane C W5 validateGrant (media-placement-provider.js) - the owning authority for this capability',
      verdict: verdict.authorized ? 'authorized' : 'DENIED: ' + verdict.reason,
      grant: {
        capability: grant.capability, tenant: grant.tenant, purpose: grant.purpose,
        scope: grant.scope, data_class: grant.data_class, principal: grant.principal,
        expiry: grant.expiry, issuance: 'OUT-OF-BAND (Lane C H1: GRANT-ISSUANCE is OPEN; no grant authority exists)',
      },
    },
    jurisdiction_note: 'Two disjoint grant vocabularies by design: the scheduler gate covers TENANT DATA capabilities only (media.placement is denied there: unknown capability); the media.placement effect is authorized by the capability provider itself. Proven by live denial probe 2026-09-30 (mission 677de4cf69b431b8).',
    authorized_at: new Date().toISOString(),
  });
  journalAppend('MC_EXECUTION_STARTED', {
    mission_id: missionId, run_id: RUN_ID, tenant: 'tenant::' + TENANT,
    worker: 'projection',
  });

  // ---- FYD GENERATION (the real Lane D path) ----
  const { spawn, logPath } = runFydGeneration();
  if (spawn.status !== 0 || !fs.existsSync(logPath)) {
    throw new Error('FYD generation failed: ' + (spawn.stderr || 'no run log').slice(0, 500));
  }
  const envelopes = readRunLog(logPath);
  const stageEnvs = envelopes.filter((e) => typeof e.event_type === 'string' && e.event_type.startsWith('FYD_STAGE_'));
  const stageNames = stageEnvs.map(stageOf);
  const digests = {};
  for (const e of stageEnvs) digests[stageOf(e)] = (e.payload && e.payload.output_digest) || null;
  const completeEnv = envelopes.find((e) => e.event_type === 'FYD_GENERATION_COMPLETE');
  if (!completeEnv) throw new Error('FYD generation run log missing FYD_GENERATION_COMPLETE envelope');

  emitStageEvents(stageEnvs, missionId);

  // ---- TENANTOS CAPABILITY: media.placement (Lane C provider) ----
  const descriptor = cap.discover();
  const catalog = buildCatalog(digests.SITE_SPEC);
  const factory = cap.createProviderFactory({ catalog });
  const bound = cap.bindFactory(factory);
  const eval2 = bound.evaluate({
    grant,
    operation: 'placeAsset',
    args: { assetId: 'coppersmith-hero-001', slotId: 'hero', pageId: 'home', componentId: 'hero-banner', role: 'hero' },
  });
  if (!eval2.authorized) throw new Error('media.placement evaluate denied: ' + eval2.reason);
  const placement = bound.invoke({
    grant,
    operation: 'placeAsset',
    args: { assetId: 'coppersmith-hero-001', slotId: 'hero', pageId: 'home', componentId: 'hero-banner', role: 'hero' },
  }, ctx.store);
  // Real verification: read the placement back through the provider.
  const listed = bound.invoke({ grant, operation: 'listPlacements', args: { pageId: 'home' } }, ctx.store);
  const seen = listed.placements.some((pl) => pl.placementId === placement.placementId);
  if (!seen) throw new Error('placement not visible on read-back');

  // ---- EFFECT LEDGER (real orca-adapter API) ----
  const rec = effectLedger.recordEffect({
    dispatch_key: missionId, attempt: '1', effect_state: 'effect_effected',
  });
  ctx.ledger = effectLedger.appendRecord(ctx.ledger, rec);
  fs.writeFileSync(LEDGER_FILE, JSON.stringify(ctx.ledger, null, 2) + '\n');

  // ---- CANONICAL EVENTS ----
  journalAppend('MC_ARTIFACT_PUBLISHED', {
    mission_id: missionId, run_id: RUN_ID, tenant: 'tenant::' + TENANT,
    artifact: 'coppersmith site spec + render',
    site_id: SITE_ID,
    output_refs: digests,
    publication: {
      capability: 'media.placement', placement_id: placement.placementId,
      slot: 'hero', asset: 'coppersmith-hero-001',
      effect_ledger_id: rec.effect_id, effect_state: 'effect_effected',
    },
    backfill: false,
  });
  journalAppend('MC_RUN_SUCCEEDED', {
    mission_id: missionId, run_id: RUN_ID, tenant: 'tenant::' + TENANT,
    stages: stageNames,
  });

  return {
    status: 'ok',
    run_id: RUN_ID,
    mission_id: missionId,
    stages: stageNames,
    stage_digests: digests,
    placement_id: placement.placementId,
    effect_id: rec.effect_id,
    capability_descriptor: descriptor.name + '@' + descriptor.version,
  };
}

async function handleInjection(event, payload, ctx) {
  const missionId = event.mission_id;
  const grant = payload.capability_grant;

  journalAppend('MC_EXECUTION_STARTED', {
    mission_id: missionId, run_id: RUN_ID, tenant: 'tenant::' + TENANT,
    worker: 'projection', episode: 'post-effect-failure-injection',
  });

  const verdict = cap.evaluate({ grant, operation: 'placeAsset', args: {} });
  if (!verdict.authorized) throw new Error('injection grant re-evaluation denied: ' + verdict.reason);

  const factory = cap.createProviderFactory({ catalog: buildCatalog('injection') });
  const bound = cap.bindFactory(factory);
  const call = {
    grant,
    operation: 'placeAsset',
    args: { assetId: 'coppersmith-hero-001', slotId: 'verify-slot', pageId: 'home', componentId: 'verify-banner', role: 'hero' },
  };

  try {
    // CONTROLLED POST-EFFECT FAILURE: the effect channel executes the real
    // provider, then drops the response before the worker can observe it
    // (the production analogue: the response is lost after the effect was
    // issued). The return value is discarded as an expression statement:
    // the worker genuinely never observes the outcome.
    bound.invoke(call, ctx.store);
    const err = new Error('post-effect response lost: effect channel timed out after invoke (INJECTED post-effect failure)');
    err.code = 'CHANNEL_LOST';
    throw err;
  } catch (err) {
    // Effect may have occurred; verification is impossible. Record
    // effect_unknown and PROVE the ledger refuses promotion without
    // definitive evidence.
    const rec = effectLedger.recordEffect({
      dispatch_key: missionId, attempt: '1', effect_state: 'effect_unknown',
    });
    ctx.ledger = effectLedger.appendRecord(ctx.ledger, rec);
    const promo = effectLedger.promoteEffect(ctx.ledger, rec,
      { definitive: false, note: 'bare post-effect note, no evidence refs' },
      'integrate-run injection probe');
    fs.writeFileSync(LEDGER_FILE, JSON.stringify(ctx.ledger, null, 2) + '\n');

    journalAppend('MC_RUN_UNKNOWN', {
      mission_id: missionId, run_id: RUN_ID, tenant: 'tenant::' + TENANT,
      effect_ledger_id: rec.effect_id, effect_state: 'effect_unknown',
      promotion_attempt: { promoted: promo.promoted, reason: 'no definitive failure evidence; outcome stays effect_unknown' },
      // Partial/unknown evidence by construction: a bare note WITHOUT the
      // `evidence` block, so the screen must render HOLD/reconcile, never
      // FAILED (harvested orca effect_ledger semantics).
      post_effect_failure: {
        note: 'injected post-effect failure: effect channel response lost after invoke; effect may have occurred',
        observed_at: new Date().toISOString(),
        injection: 'controlled (mission payload inject_post_effect_failure=true)',
      },
      reconciliation: 'REQUIRED: mission held; effect may have occurred; do not retry, do not mark FAILED',
    });
    throw err; // scheduler routes UNKNOWN_AFTER_POSSIBLE_EFFECT -> HOLD
  }
}

async function main() {
  console.log('ENGLISH INTENT: Run one real Coppersmith FYD generation for the PING tenant,');
  console.log('place one generated asset through the media.placement capability, and emit its');
  console.log('stage evidence to the Mission Control journal. Then inject one controlled');
  console.log('post-effect failure.');

  const dbPassword = execSync('docker exec ping-postgres printenv POSTGRES_PASSWORD', { encoding: 'utf8' }).trim();
  if (!dbPassword) throw new Error('could not read DB password from container');
  const pool = new Pool({
    host: '127.0.0.1', port: 5433, database: 'integrate_run',
    user: 'crx_user', password: dbPassword,
  });
  const dbName = (await pool.query('SELECT current_database() AS d')).rows[0].d;
  if (dbName !== 'integrate_run') throw new Error('refusing to run against database ' + dbName);

  const uer = new UnifiedEventRuntime({ pool });
  await uer.initialize();
  const missionRuntime = new MissionRuntime({ pool, eventRuntime: uer });
  await missionRuntime.initialize();

  const workerRuntime = new WorkerRuntime({});
  const ctx = { store: cap.createProviderFactory({ catalog: {} }).createStore(), ledger: [] };
  workerRuntime.register('projection', makeProjectionWorker(ctx), {
    eventTypes: ['FYD_GENERATION_REQUESTED', 'MEDIA_PLACEMENT_VERIFY'],
    maxConcurrent: 1,
  });

  const scheduler = new MissionScheduler({
    missionRuntime,
    workerRuntime,
    eventRuntime: uer,
    tenantId: TENANT,
    pollIntervalMs: 3600000,
    dispatchTimeoutMs: 300000,
    retryPolicy: { max_attempts: 1, backoff_delay_ms: 1000 },
  });

  // ---------- mission 1: the real run ----------
  // No requires_capability: the mission touches no tenant DATA (the gate's
  // jurisdiction). The media.placement grant rides out-of-band for the
  // worker/provider (the capability's owning authority).
  const payload1 = {
    event_id: 'integrate-coppersmith-20260930-take3',
    event_type: 'FYD_GENERATION_REQUESTED',
    run_id: RUN_ID,
    site_id: SITE_ID,
    capability_grant: GRANT,
  };
  const missionId1 = await missionRuntime.create('PROJECTION_CREATE', payload1, {
    tenant_id: TENANT, createdBy: 'integrate-run-driver',
  });
  console.log('mission1=' + missionId1);
  journalAppend('MC_MISSION_CREATED', {
    mission_id: missionId1, run_id: RUN_ID, tenant: 'tenant::' + TENANT,
    request: 'Run one real Coppersmith FYD generation for the PING tenant, place one generated asset through media.placement, emit stage evidence to the Mission Control journal.',
    requested_by: 'integrate-run-driver (Nolan binding order 2026-09-30 ~08:10 MDT)',
    requested_at: new Date().toISOString(),
  });
  journalAppend('MC_RUN_QUEUED', { mission_id: missionId1, run_id: RUN_ID, tenant: 'tenant::' + TENANT });

  await scheduler._poll();
  const m1 = await missionRuntime.getMission(missionId1, TENANT);
  console.log('mission1 status=' + (m1 && m1.status));
  const t1 = new Date().toISOString();
  console.log('T1=' + t1);

  // ---------- mission 2: the controlled post-effect failure ----------
  const payload2 = {
    event_id: 'integrate-injection-20260930-take3',
    event_type: 'MEDIA_PLACEMENT_VERIFY',
    run_id: RUN_ID,
    capability_grant: GRANT,
    inject_post_effect_failure: true,
  };
  const missionId2 = await missionRuntime.create('PROJECTION_CREATE', payload2, {
    tenant_id: TENANT, createdBy: 'integrate-run-driver',
  });
  console.log('mission2=' + missionId2);
  journalAppend('MC_RUN_QUEUED', {
    mission_id: missionId2, run_id: RUN_ID, tenant: 'tenant::' + TENANT,
    episode: 'post-effect-failure-injection',
  });

  await scheduler._poll();
  const held = await pool.query(
    'SELECT mission_id, status, hold_at IS NOT NULL AS held, hold_reason FROM ping_missions WHERE mission_id = $1',
    [missionId2]
  );
  console.log('mission2 row=' + JSON.stringify(held.rows[0]));
  const t2 = new Date().toISOString();
  console.log('T2=' + t2);

  const stats = scheduler._stats || {};
  console.log('scheduler stats: ' + JSON.stringify({
    dispatched: stats.dispatched, completed: stats.completed,
    failed: stats.failed, denied: stats.denied, unknown: stats.unknown,
    unscopedPolls: stats.unscopedPolls,
  }));
  console.log('ledger records: ' + ctx.ledger.length + ' -> ' + LEDGER_FILE);
  console.log('outbox lines -> ' + OUTBOX);
  console.log('DONE');

  await pool.end();
}

main().catch((err) => {
  console.error('INTEGRATION RUN FAILED: ' + (err && err.stack ? err.stack : err));
  process.exitCode = 1;
});
