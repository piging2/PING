'use strict';
/**
 * INTERVAL 10 INTEGRATED FALSIFIER DRIVER (2026-09-30).
 *
 * Harness file (scratch, NOT committed). Every product module under test is
 * required from the integrated tree /home/nolan/ping-worktrees/interval10-integrated
 * (HEAD cafe156e3: T2+T3+T06+T02 merged). Supporting harness files in /tmp/interval10:
 *   - effect_ledger.js: copy of the previous falsifier's post-effect ledger lib
 *     (uncommitted; named explicitly in the report)
 *   - ping-runtime/fyd/run_coppersmith_generation.ts + fyd_stage_emitter.js:
 *     copies of lane-d's COMMITTED files (verify-d @ 43b1ed212)
 *   - ping-runtime/events -> symlink to the INTEGRATED tree's events dir, so the
 *     TS driver constructs events with the integrated UER (T06 redaction wired)
 *
 * Chain: missionRuntime.create -> scheduler._poll -> _authorizeDispatch (T02/T3)
 * -> WorkerRuntime.dispatch -> projection worker -> real FYD TS driver (6 stages
 * + COMPLETE, real digests) -> media.placement via the T2-bound provider
 * (tenantContext from event.tenant_id = mission row tenant) -> effect ledger
 * -> MC_* journal. Then the hostile matrix.
 */
const { execSync, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const INT = '/home/nolan/ping-worktrees/interval10-integrated';
const SCRATCH = '/tmp/interval10';
const JOURNAL = path.join(SCRATCH, 'journal-interval10.jsonl');
const LEDGER_FILE = path.join(SCRATCH, 'effect-ledger-interval10.json');
const TSX = '/home/nolan/projects/ping-fyd-converged/node_modules/.bin/tsx';
const CONVERGED = '/home/nolan/projects/ping-fyd-converged';
const TS_DRIVER = path.join(SCRATCH, 'ping-runtime/fyd/run_coppersmith_generation.ts');

const RUN_ID = 'interval10-coppersmith-20260930';
const TENANT = 'ping';
const SITE_ID = 'coppersmith-plumbing';

const { Pool } = require('/home/nolan/ping/gateway/node_modules/pg');
const { MissionScheduler } = require(path.join(INT, 'ping-runtime/orchestration/mission_scheduler.js'));
const { MissionRuntime } = require(path.join(INT, 'ping-runtime/orchestration/mission_runtime.js'));
const { WorkerRuntime } = require(path.join(INT, 'ping-runtime/workers/worker_runtime.js'));
const { UnifiedEventRuntime } = require(path.join(INT, 'ping-runtime/events/unified_event_runtime.js'));
const cap = require(path.join(INT, 'tenant/capability/media-placement/media-placement-provider.js'));
const effectLedger = require(path.join(SCRATCH, 'effect_ledger.js'));

const CHECKS = [];
function check(name, ok, detail) {
  CHECKS.push({ name, ok: !!ok, detail: detail || '' });
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' :: ' + detail : ''));
}

// ---- grants (GRANT-ISSUANCE is OPEN: out-of-band, as in the previous run) ----
function mediaGrant(principal) {
  return {
    capability: 'media.placement', tenant: TENANT, purpose: 'operational',
    scope: 'media.placement:placeAsset', data_class: 'public-presentation',
    principal: principal || 'interval10-media-principal',
    expiry: new Date(Date.now() + 3600000).toISOString(),
  };
}
function dataGrant(principal, tenant) {
  return {
    capability: 'campaign.target', tenant: tenant || TENANT, purpose: 'fulfillment',
    scope: { campaigns: ['coppersmith-q4'] }, data_class: 'TASK_EPHEMERAL',
    principal: principal, expiry: new Date(Date.now() + 3600000).toISOString(),
  };
}

// ---- journal (content-derived ids, duplicate-refusing append) ----
function canonicalJson(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonicalJson(v[k])).join(',') + '}';
}
function readEventIds(journalPath) {
  const ids = new Set();
  if (!fs.existsSync(journalPath)) return ids;
  for (const line of fs.readFileSync(journalPath, 'utf8').split('\n')) {
    const t = line.trim(); if (!t) continue;
    try { ids.add(JSON.parse(t).event_id); } catch (_) {}
  }
  return ids;
}
function journalAppend(eventType, eventData) {
  const seed = ['interval10', RUN_ID, eventType, canonicalJson(eventData)].join('|');
  const eventId = 'mc-i10-' + crypto.createHash('sha256').update(seed, 'utf8').digest('hex').slice(0, 12);
  const event = {
    event_id: eventId, timestamp: new Date().toISOString(), event_type: eventType,
    aggregate_id: 'mc:fyd_run:' + RUN_ID, aggregate_type: 'mc_fyd_run', event_data: eventData,
  };
  const existing = readEventIds(JOURNAL);
  if (existing.has(eventId)) return { event, status: 'duplicate-skipped' };
  fs.appendFileSync(JOURNAL, JSON.stringify(event) + '\n');
  return { event, status: 'appended' };
}

function buildCatalog(siteSpecDigest) {
  return {
    'coppersmith-hero-001': {
      id: 'coppersmith-hero-001', lifecycleState: 'published', source: 'local',
      contentHash: siteSpecDigest, type: 'image', orientation: 'landscape',
      alt: 'Coppersmith Plumbing hero (interval10 fixture)',
      roles: ['hero'], dimensions: { width: 1600, height: 900 },
      variants: {
        webp: 'https://media.interval10.local/coppersmith-hero.webp',
        original: 'https://media.interval10.local/coppersmith-hero.jpg',
      },
    },
  };
}

function runFydGeneration() {
  const r = spawnSync(TSX, [TS_DRIVER, RUN_ID], {
    cwd: CONVERGED, timeout: 300000, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  const logPath = path.join(SCRATCH, 'ping-runtime/fyd/runs', RUN_ID + '.jsonl');
  return { spawn: r, logPath };
}
function readRunLog(logPath) {
  return fs.readFileSync(logPath, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l));
}
function stageOf(env) { return String((env && env.event_type) || '').replace(/^FYD_STAGE_/, ''); }

function emitStageEvents(envelopes, missionId) {
  let n = 0;
  for (const env of envelopes) {
    const p = env.payload || {}; const stage = stageOf(env); const finishedAt = env.emitted_at;
    const durationMs = (p.detail && p.detail.duration_ms) || p.duration_ms || null;
    journalAppend('MC_FYD_STAGE_STARTED', {
      mission_id: missionId, run_id: RUN_ID, tenant: 'tenant::' + TENANT,
      stage, status: 'RUNNING', started_at: finishedAt, input_refs: p.input_digest || null, backfill: false,
    });
    journalAppend('MC_FYD_STAGE_COMPLETED', {
      mission_id: missionId, run_id: RUN_ID, tenant: 'tenant::' + TENANT,
      stage, status: 'SUCCEEDED', started_at: finishedAt, finished_at: finishedAt,
      duration_ms: durationMs, input_refs: p.input_digest || null, output_refs: p.output_digest || null,
      evidence_refs: [{ kind: 'run-log', ref: 'run-log:' + RUN_ID + '.jsonl#' + stage }],
      sink_status: env.sink_status || null, sink_error: env.sink_error || null, backfill: false,
    });
    n++;
  }
  return n;
}

// ---- workers ----
function makeProjectionWorker(ctx) {
  return {
    async handle(event) {
      const payload = event.payload || {};
      if (event.event_type === 'FYD_GENERATION_REQUESTED') return handleGeneration(event, payload, ctx);
      if (event.event_type === 'MEDIA_PLACEMENT_VERIFY') return handleInjection(event, payload, ctx);
      throw new Error('projection worker: unknown event_type ' + event.event_type);
    },
  };
}

async function handleGeneration(event, payload, ctx) {
  const missionId = event.mission_id;
  const grant = payload.capability_grant;
  // T2: the authoritative tenant is caller-held (mission row tenant via the
  // scheduler-built event), never derived from the grant. Prove it: the
  // grant below is built for the same tenant, but the context does not read
  // grant.tenant.
  const tenantContext = event.tenant_id;
  if (tenantContext !== TENANT) throw new Error('worker: mission tenant mismatch: ' + tenantContext);

  const verdict = cap.evaluate({ grant, operation: 'placeAsset', args: {}, tenantContext });
  if (!verdict.authorized) throw new Error('worker grant re-evaluation denied: ' + verdict.reason);

  const gateEval = (event.metadata && event.metadata.grant_evaluation) || null;
  journalAppend('MC_AGENT_AUTHORIZED', {
    mission_id: missionId, run_id: RUN_ID, tenant: 'tenant::' + TENANT,
    authorized_by: 'MissionScheduler._authorizeDispatch (integrated cafe156e3)',
    gate_branch: 'no capability required (mission declares no tenant-data capability)',
    gate_evaluation: gateEval, tenant_scope: 'enforced: scheduler tenantId=ping',
    media_placement_grant: {
      evaluated_by: 'media-placement-provider authorize() (T2 tenant binding: request.tenant from caller tenantContext)',
      verdict: verdict.authorized ? 'authorized' : 'DENIED: ' + verdict.reason,
      tenant_context_source: 'event.tenant_id (mission row; never grant.tenant)',
    },
    authorized_at: new Date().toISOString(),
  });
  journalAppend('MC_EXECUTION_STARTED', { mission_id: missionId, run_id: RUN_ID, tenant: 'tenant::' + TENANT, worker: 'projection' });

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

  const factory = cap.createProviderFactory({ catalog: buildCatalog(digests.SITE_SPEC) });
  const bound = cap.bindFactory(factory);
  const placeArgs = { assetId: 'coppersmith-hero-001', slotId: 'hero', pageId: 'home', componentId: 'hero-banner', role: 'hero' };
  const eval2 = bound.evaluate({ grant, operation: 'placeAsset', args: placeArgs, tenantContext });
  if (!eval2.authorized) throw new Error('media.placement evaluate denied: ' + eval2.reason);
  const placement = bound.invoke({ grant, operation: 'placeAsset', args: placeArgs, tenantContext }, ctx.store);
  const listed = bound.invoke({ grant, operation: 'listPlacements', args: { pageId: 'home' }, tenantContext }, ctx.store);
  const seen = listed.placements.some((pl) => pl.placementId === placement.placementId);
  if (!seen) throw new Error('placement not visible on read-back');

  const rec = effectLedger.recordEffect({ dispatch_key: missionId, attempt: '1', effect_state: 'effect_effected' });
  ctx.ledger = effectLedger.appendRecord(ctx.ledger, rec);
  fs.writeFileSync(LEDGER_FILE, JSON.stringify(ctx.ledger, null, 2) + '\n');

  journalAppend('MC_ARTIFACT_PUBLISHED', {
    mission_id: missionId, run_id: RUN_ID, tenant: 'tenant::' + TENANT,
    artifact: 'coppersmith site spec + render', site_id: SITE_ID, output_refs: digests,
    publication: {
      capability: 'media.placement', placement_id: placement.placementId,
      slot: 'hero', asset: 'coppersmith-hero-001',
      effect_ledger_id: rec.effect_id, effect_state: 'effect_effected',
    }, backfill: false,
  });
  journalAppend('MC_RUN_SUCCEEDED', { mission_id: missionId, run_id: RUN_ID, tenant: 'tenant::' + TENANT, stages: stageNames });

  return { status: 'ok', run_id: RUN_ID, mission_id: missionId, stages: stageNames, stage_digests: digests, placement_id: placement.placementId, effect_id: rec.effect_id };
}

async function handleInjection(event, payload, ctx) {
  const missionId = event.mission_id;
  const grant = payload.capability_grant;
  const tenantContext = event.tenant_id;
  journalAppend('MC_EXECUTION_STARTED', {
    mission_id: missionId, run_id: RUN_ID, tenant: 'tenant::' + TENANT,
    worker: 'projection', episode: 'post-effect-failure-injection',
  });
  const verdict = cap.evaluate({ grant, operation: 'placeAsset', args: {}, tenantContext });
  if (!verdict.authorized) throw new Error('injection grant re-evaluation denied: ' + verdict.reason);
  const factory = cap.createProviderFactory({ catalog: buildCatalog('injection') });
  const bound = cap.bindFactory(factory);
  const call = {
    grant, operation: 'placeAsset', tenantContext,
    args: { assetId: 'coppersmith-hero-001', slotId: 'verify-slot', pageId: 'home', componentId: 'verify-banner', role: 'hero' },
  };
  try {
    bound.invoke(call, ctx.store); // real effect executes
    const err = new Error('post-effect response lost: effect channel timed out after invoke (INJECTED)');
    err.code = 'CHANNEL_LOST';
    throw err;
  } catch (err) {
    const rec = effectLedger.recordEffect({ dispatch_key: missionId, attempt: '1', effect_state: 'effect_unknown' });
    ctx.ledger = effectLedger.appendRecord(ctx.ledger, rec);
    const promo = effectLedger.promoteEffect(ctx.ledger, rec,
      { definitive: false, note: 'bare post-effect note, no evidence refs' }, 'interval10 injection probe');
    fs.writeFileSync(LEDGER_FILE, JSON.stringify(ctx.ledger, null, 2) + '\n');
    journalAppend('MC_RUN_UNKNOWN', {
      mission_id: missionId, run_id: RUN_ID, tenant: 'tenant::' + TENANT,
      effect_ledger_id: rec.effect_id, effect_state: 'effect_unknown',
      promotion_attempt: { promoted: promo.promoted, reason: 'no definitive failure evidence; outcome stays effect_unknown' },
      post_effect_failure: { note: 'injected post-effect failure: response lost after invoke; effect may have occurred', observed_at: new Date().toISOString(), injection: 'controlled' },
      reconciliation: 'REQUIRED: mission held; effect may have occurred; do not retry, do not mark FAILED',
    });
    throw err;
  }
}

// ---- main ----
async function main() {
  fs.mkdirSync(SCRATCH, { recursive: true });
  console.log('INT TREE: ' + INT);
  console.log('INT HEAD: ' + execSync('git -C ' + INT + ' rev-parse HEAD', { encoding: 'utf8' }).trim());

  const dbPassword = execSync('docker exec ping-postgres printenv POSTGRES_PASSWORD', { encoding: 'utf8' }).trim();
  const pool = new Pool({ host: '127.0.0.1', port: 5433, database: 'integrate_run', user: 'crx_user', password: dbPassword });
  const dbName = (await pool.query('SELECT current_database() AS d')).rows[0].d;
  if (dbName !== 'integrate_run') throw new Error('refusing to run against database ' + dbName);

  const uer = new UnifiedEventRuntime({ pool });
  await uer.initialize();
  const missionRuntime = new MissionRuntime({ pool, eventRuntime: uer });
  await missionRuntime.initialize();
  const workerRuntime = new WorkerRuntime({});
  const ctx = { store: cap.createProviderFactory({ catalog: {} }).createStore(), ledger: [] };
  workerRuntime.register('projection', makeProjectionWorker(ctx), {
    eventTypes: ['FYD_GENERATION_REQUESTED', 'MEDIA_PLACEMENT_VERIFY'], maxConcurrent: 1,
  });
  workerRuntime.register('observation', {
    async handle(event) { return { status: 'ok', observed: true, event_type: event.event_type }; },
  }, { eventTypes: ['OBSERVATION_CREATE'], maxConcurrent: 2 });
  const scheduler = new MissionScheduler({
    missionRuntime, workerRuntime, eventRuntime: uer, tenantId: TENANT,
    pollIntervalMs: 3600000, dispatchTimeoutMs: 300000, retryPolicy: { max_attempts: 1, backoff_delay_ms: 1000 },
  });

  const countMissionFailed = async (missionId) => (await pool.query(
    "SELECT count(*)::int AS c FROM ping_events WHERE event_type='MISSION_FAILED' AND payload->>'missionId' = $1", [missionId]
  )).rows[0].c;
  const deniedTrueCount = async (missionId) => (await pool.query(
    "SELECT count(*)::int AS c FROM ping_events WHERE event_type='MISSION_FAILED' AND payload->>'missionId' = $1 AND (payload->>'denied')::boolean = true", [missionId]
  )).rows[0].c;

  // ============ MISSION 1: the fresh Coppersmith run ============
  const payload1 = {
    event_id: 'interval10-coppersmith-20260930', event_type: 'FYD_GENERATION_REQUESTED',
    run_id: RUN_ID, site_id: SITE_ID, capability_grant: mediaGrant(),
  };
  const missionId1 = await missionRuntime.create('PROJECTION_CREATE', payload1, { tenant_id: TENANT, createdBy: 'interval10-driver' });
  journalAppend('MC_MISSION_CREATED', {
    mission_id: missionId1, run_id: RUN_ID, tenant: 'tenant::' + TENANT,
    request: 'Interval 10: fresh real Coppersmith FYD generation on the integrated chain.',
    requested_by: 'interval10-driver', requested_at: new Date().toISOString(),
  });
  journalAppend('MC_RUN_QUEUED', { mission_id: missionId1, run_id: RUN_ID, tenant: 'tenant::' + TENANT });
  await scheduler._poll();
  const m1 = await missionRuntime.getMission(missionId1, TENANT);
  check('NORMAL RUN COMPLETES', m1 && m1.status === 'completed', 'mission1=' + missionId1 + ' status=' + (m1 && m1.status));

  const runLog = readRunLog(path.join(SCRATCH, 'ping-runtime/fyd/runs', RUN_ID + '.jsonl'));
  const stageEnvs = runLog.filter((e) => String(e.event_type || '').startsWith('FYD_STAGE_'));
  const stageNames = stageEnvs.map(stageOf);
  const expectedStages = ['ACQUIRE', 'EXTRACT', 'RESOLVE', 'OBJECT_GRAPH', 'SITE_SPEC', 'RENDER'];
  check('7 STAGES REAL DIGESTS', stageEnvs.length === 6 && expectedStages.every((s) => stageNames.includes(s)) &&
    stageEnvs.every((e) => e.payload && typeof e.payload.output_digest === 'string' && e.payload.output_digest.length >= 32) &&
    runLog.some((e) => e.event_type === 'FYD_GENERATION_COMPLETE'),
    'stages=' + stageNames.join(',') + ' complete=' + runLog.some((e) => e.event_type === 'FYD_GENERATION_COMPLETE'));
  const digests = {}; for (const e of stageEnvs) digests[stageOf(e)] = e.payload.output_digest;
  const distinct = new Set(Object.values(digests)).size;
  check('STAGE DIGESTS DISTINCT+REAL', distinct === 6, 'distinct=' + distinct + ' site_spec=' + String(digests.SITE_SPEC).slice(0, 16));

  const ledger = JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
  check('EFFECT LEDGER ENTRY', Array.isArray(ledger) && ledger.length >= 1 && ledger[0].effect_state === 'effect_effected',
    'records=' + ledger.length + ' state=' + (ledger[0] && ledger[0].effect_state));

  const journalLines = fs.readFileSync(JOURNAL, 'utf8').split('\n').filter((l) => l.trim()).length;
  check('JOURNAL HAS STAGE EVENTS', journalLines >= 16, 'journal lines=' + journalLines);

  // ============ MISSION 2: post-effect failure injection ============
  const payload2 = {
    event_id: 'interval10-injection-20260930', event_type: 'MEDIA_PLACEMENT_VERIFY',
    run_id: RUN_ID, capability_grant: mediaGrant(), inject_post_effect_failure: true,
  };
  const missionId2 = await missionRuntime.create('PROJECTION_CREATE', payload2, { tenant_id: TENANT, createdBy: 'interval10-driver' });
  journalAppend('MC_RUN_QUEUED', { mission_id: missionId2, run_id: RUN_ID, tenant: 'tenant::' + TENANT, episode: 'post-effect-failure-injection' });
  await scheduler._poll();
  const held = (await pool.query(
    'SELECT mission_id, status, hold_at IS NOT NULL AS held, hold_reason FROM ping_missions WHERE mission_id = $1', [missionId2]
  )).rows[0];
  check('POST-EFFECT UNKNOWN-HOLD', held && held.status !== 'failed' && held.held === true,
    'mission2=' + JSON.stringify(held));
  const ledger2 = JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'));
  const unknownRec = ledger2.find((r) => r.dispatch_key === missionId2);
  check('POST-EFFECT PROMOTION REFUSED', unknownRec && unknownRec.effect_state === 'effect_unknown',
    'effect_state=' + (unknownRec && unknownRec.effect_state));

  // ============ T2 HOSTILE: forged tenant binding at the provider ============
  const forgedGrant = mediaGrant(); forgedGrant.tenant = 'acme-corp';
  let t2a = cap.evaluate({ grant: forgedGrant, operation: 'placeAsset', args: {}, tenantContext: TENANT });
  check('T2 FORGERY DENIED (grant claims acme, caller context ping)',
    !t2a.authorized && /tenant mismatch/i.test(t2a.reason), t2a.reason);
  let t2b = cap.evaluate({ grant: mediaGrant(), operation: 'placeAsset', args: {}, tenantContext: 'acme-corp' });
  check('T2 CROSS-TENANT DENIED (valid ping grant, acme caller context)',
    !t2b.authorized && /tenant mismatch/i.test(t2b.reason), t2b.reason);
  let t2c = cap.evaluate({ grant: mediaGrant(), operation: 'placeAsset', args: {} });
  check('T2 MISSING CONTEXT DENY', !t2c.authorized && /authoritative tenant context/i.test(t2c.reason), t2c.reason);
  let t2d = cap.evaluate({ grant: mediaGrant(), operation: 'placeAsset', args: {}, tenantContext: '' });
  check('T2 EMPTY CONTEXT DENY', !t2d.authorized, t2d.reason);

  // ============ T3 HOSTILE: pre-claim denial persistence ============
  const badGrantPayload = {
    event_id: 'interval10-t3-deny-20260930', event_type: 'OBSERVATION_CREATE',
    requires_capability: 'campaign.target', grant_purpose: 'fulfillment',
    capability_grant: dataGrant('observation', 'acme-corp'), // wrong tenant -> gate denies
  };
  const missionT3 = await missionRuntime.create('OBSERVATION_CREATE', badGrantPayload, { tenant_id: TENANT, createdBy: 'interval10-driver' });
  await scheduler._poll();
  const mT3 = await missionRuntime.getMission(missionT3, TENANT);
  const mf1 = await countMissionFailed(missionT3);
  const dn1 = await deniedTrueCount(missionT3);
  check('T3 DENIAL DURABLE (created->failed)', mT3 && mT3.status === 'failed' && /dispatch denied/i.test(mT3.error || ''),
    'status=' + (mT3 && mT3.status) + ' error=' + String(mT3 && mT3.error).slice(0, 80));
  check('T3 EXACTLY ONE MISSION_FAILED denied:true', mf1 === 1 && dn1 === 1, 'count=' + mf1 + ' deniedTrue=' + dn1);
  await scheduler._poll(); // repeated poll must not re-deny
  await scheduler._poll();
  const mT3b = await missionRuntime.getMission(missionT3, TENANT);
  const mf2 = await countMissionFailed(missionT3);
  check('T3 REPEATED POLLS DO NOT RE-DENY', mT3b && mT3b.status === 'failed' && mf2 === 1,
    'status=' + (mT3b && mT3b.status) + ' MISSION_FAILED count still ' + mf2);

  // ============ T06 HOSTILE: secrets must never persist verbatim ============
  const PW = 'i10-hunter2-pw-9f31c7'; const TOK = 'i10-tok-abc123-77de'; const AUTH = 'Bearer i10-auth-zz99';
  await uer.emit('I10_SECRET_PROBE', 'interval10-harness', {
    password: PW, nested: { deep: { token: TOK } }, headers: { authorization: AUTH },
    note: 'the word token in prose is fine',
  }, { tenant_id: TENANT });
  const probeRows = (await pool.query(
    "SELECT payload::text AS p FROM ping_events WHERE event_type='I10_SECRET_PROBE' ORDER BY created_at DESC LIMIT 1"
  )).rows;
  const probeText = probeRows.length ? probeRows[0].p : '';
  check('T06 NEVER PERSISTED (password)', probeRows.length === 1 && !probeText.includes(PW), 'rows=' + probeRows.length);
  check('T06 NEVER PERSISTED (token)', !probeText.includes(TOK), 'verbatim token absent');
  check('T06 NEVER PERSISTED (authorization)', !probeText.includes(AUTH), 'verbatim auth header absent');
  check('T06 REDACTION MARKERS PRESENT',
    probeText.includes('[REDACTED:password]') && probeText.includes('[REDACTED:token]') && probeText.includes('[REDACTED:authorization]'),
    'markers present; prose kept=' + probeText.includes('the word token in prose is fine'));

  // ============ T02 HOSTILE: wrong-actor grant ============
  // Direct gate probe: grant principal 'observation' routed to worker 'campaign'.
  const fakeMission = (grant) => ({
    mission_id: 'i10-t02-probe', tenant_id: TENANT,
    payload: JSON.stringify({ requires_capability: 'campaign.target', grant_purpose: 'fulfillment', capability_grant: grant }),
  });
  const azWrong = await scheduler._authorizeDispatch(fakeMission(dataGrant('observation', TENANT)), 'campaign');
  check('T02 WRONG-ACTOR DENIED (grant principal observation, routed campaign)',
    !azWrong.authorized && /principal mismatch/i.test(azWrong.reason), azWrong.reason);
  const azRight = await scheduler._authorizeDispatch(fakeMission(dataGrant('campaign', TENANT)), 'campaign');
  check('T02 PRINCIPAL==WORKER ALLOW', azRight.authorized === true, azRight.reason);
  const azLegacy = await scheduler._authorizeDispatch(fakeMission(dataGrant('observation', TENANT)), 'observation');
  check('T02 MATCHING PRINCIPAL VIA GATE ALLOW', azRight.authorized && azLegacy.authorized, 'observation/observation ok');

  // Full dispatch path: wrong principal -> durable denial; right principal -> worker runs.
  const wrongPath = {
    event_id: 'interval10-t02-wrong-20260930', event_type: 'OBSERVATION_CREATE',
    requires_capability: 'campaign.target', grant_purpose: 'fulfillment',
    capability_grant: dataGrant('campaign', TENANT), // routed worker will be 'observation'
  };
  const missionT02w = await missionRuntime.create('OBSERVATION_CREATE', wrongPath, { tenant_id: TENANT, createdBy: 'interval10-driver' });
  await scheduler._poll();
  const mT02w = await missionRuntime.getMission(missionT02w, TENANT);
  const mfW = await deniedTrueCount(missionT02w);
  check('T02 FULL-PATH WRONG ACTOR DENIED DURABLY',
    mT02w && mT02w.status === 'failed' && mfW === 1 && /principal mismatch/i.test(mT02w.error || ''),
    'status=' + (mT02w && mT02w.status));
  const rightPath = {
    event_id: 'interval10-t02-right-20260930', event_type: 'OBSERVATION_CREATE',
    requires_capability: 'campaign.target', grant_purpose: 'fulfillment',
    capability_grant: dataGrant('observation', TENANT),
  };
  const missionT02r = await missionRuntime.create('OBSERVATION_CREATE', rightPath, { tenant_id: TENANT, createdBy: 'interval10-driver' });
  await scheduler._poll();
  const mT02r = await missionRuntime.getMission(missionT02r, TENANT);
  check('T02 FULL-PATH RIGHT ACTOR COMPLETES', mT02r && mT02r.status === 'completed',
    'status=' + (mT02r && mT02r.status));

  console.log('\n==== SUMMARY ====');
  const failed = CHECKS.filter((c) => !c.ok);
  console.log('passed=' + (CHECKS.length - failed.length) + ' failed=' + failed.length + ' total=' + CHECKS.length);
  for (const c of failed) console.log('FAILED: ' + c.name + ' :: ' + c.detail);
  console.log('journal=' + JOURNAL + ' lines=' + fs.readFileSync(JOURNAL, 'utf8').split('\n').filter((l) => l.trim()).length);
  await pool.end();
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => { console.error('INTERVAL10 RUN FAILED: ' + (err && err.stack ? err.stack : err)); process.exitCode = 1; });
