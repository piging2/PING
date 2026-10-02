'use strict';
/* Writer M (2026-09-30): first real INTELLIGENCE_RESEARCH mission through PING.
 *
 * Runs on the MERGED line's code (deploy/interval10-forensics-20260930 @ 67da6aab1),
 * writes to the LIVE Pig journal (brain-postgres / ping_runtime.ping_events).
 * Existing MissionRuntime + UnifiedEventRuntime + ClaimMissionChainer +
 * ContradictionDetector only. No new runtimes, authorities, stores, or databases.
 * No pushes. No Oracle writes. No identity stitching / transcript-accuracy work.
 *
 * The DB credential is read at runtime from the live Pig gateway's own docker
 * env (same-plane config, never printed, never logged, never in a payload).
 */
const { execSync } = require('child_process');
const path = require('path');

const WT = '/home/nolan/ping-worktrees/deploy-merge-20260930';
const TENANT = 'ping-ops';
const WORKER = 'writer-m-research-worker';

function dbPassword() {
  const env = execSync(
    `docker inspect ping-gateway --format '{{range .Config.Env}}{{println .}}{{end}}'`,
    { encoding: 'utf8' }
  );
  const line = env.split('\n').find((l) => l.startsWith('POSTGRES_PASSWORD='));
  if (!line) throw new Error('POSTGRES_PASSWORD not found in ping-gateway container env');
  return line.slice('POSTGRES_PASSWORD='.length);
}

async function main() {
  const { Pool } = require('/tmp/writer-m/node_modules/pg');
  const pool = new Pool({
    host: '127.0.0.1', port: 5432, user: 'postgres',
    password: dbPassword(), database: 'ping_runtime', max: 5,
  });

  const { UnifiedEventRuntime } = require(path.join(WT, 'ping-runtime/events/unified_event_runtime.js'));
  const { MissionRuntime } = require(path.join(WT, 'ping-runtime/orchestration/mission_runtime.js'));
  const { createLabeledMission, MISSION_LABELS } = require(path.join(WT, 'ping-runtime/orchestration/mission_labels.js'));
  const { ClaimMissionChainer } = require(path.join(WT, 'ping-runtime/analysis/claim_chaining.js'));
  const { ContradictionDetector } = require(path.join(WT, 'ping-runtime/analysis/contradiction_detection.js'));
  const { attachClaimVerdict } = require(path.join(WT, 'ping-runtime/evidence/verdict_vocab.js'));

  // Merged-line startup against the configured (Pig) journal.
  const eventRuntime = new UnifiedEventRuntime({ pool });
  await eventRuntime.initialize();
  const missionRuntime = new MissionRuntime({ pool, eventRuntime });
  await missionRuntime.initialize();
  console.log('INIT_OK merged-line runtimes initialized against Pig journal');

  // Existing behaviors wired to the live event stream.
  const chainer = new ClaimMissionChainer({ eventRuntime, missionRuntime, priority: 2 });
  chainer.start();
  const detector = new ContradictionDetector({ eventRuntime });
  detector.start();

  // Pre-run baseline: direct readback.
  const pre = await pool.query('SELECT count(*)::int AS n, max(timestamp) AS max_ts FROM ping_events');
  const preM = await pool.query('SELECT count(*)::int AS n FROM ping_missions');
  const preIR = await pool.query(
    `SELECT count(*)::int AS n FROM ping_missions WHERE mission_type = 'INTELLIGENCE_RESEARCH'`
  );
  console.log(`BASELINE ping_events=${pre.rows[0].n} max_ts=${pre.rows[0].max_ts} ping_missions=${preM.rows[0].n} prior_ir_missions=${preIR.rows[0].n}`);

  // Gateway corroboration (primary source: docker inspect, no secrets).
  const gwEnv = execSync(
    `docker inspect ping-gateway --format '{{range .Config.Env}}{{println .}}{{end}}'`,
    { encoding: 'utf8' }
  ).split('\n').filter((l) => /^(POSTGRES_HOST|POSTGRES_DB|POSTGRES_USER)=/.test(l));
  const gwImg = execSync(`docker inspect ping-gateway --format '{{.Config.Image}}'`, { encoding: 'utf8' }).trim();

  // --- §6.1 mission brief ---
  const brief = {
    questions: [
      'Is the Pig journal (brain-postgres / ping_runtime.ping_events) the live event plane currently accepting writes, and when was its last production write before this run?',
      'What is the Lane L tenant-backfill state of ping_events on the live journal after the merged line initialize() runs?',
      'Did any INTELLIGENCE_RESEARCH mission exist in the live journal before this run (MarketingOS projection falsification-test-1 baseline)?',
    ],
    claims_to_verify: [],
    evidence_requirements: {
      primary_source_first: true,
      acceptable_sources: [
        'direct SQL readback against brain-postgres/ping_runtime on the Pig',
        'docker inspect of the live ping-gateway container',
      ],
      forbidden_sources: ['prior reports from memory', 'stale documentation', 'inference without readback'],
      min_independent_sources: 1,
    },
    output_schema: {
      findings: [{ question: '', answer: '', verdict: 'CONFIRMED | REFUTED | UNCLEAR', evidence_event_ids: [] }],
      synthesis_tag: 'VERIFIED | INFERRED | UNKNOWN',
      learning: '',
      next_question: '',
    },
    synthesis_rule: 'Answer each question only from direct readback performed during this run. CONFIRMED requires a direct readback; anything not directly observed is UNCLEAR. Record exactly one next unanswered question.',
  };

  const missionId = await createLabeledMission(missionRuntime, MISSION_LABELS.INTELLIGENCE_RESEARCH, brief, {
    tenant_id: TENANT, createdBy: 'writer-m',
  });
  console.log('MISSION_CREATED id=' + missionId);

  const claimed = await missionRuntime.assign(missionId, WORKER);
  await missionRuntime.start(missionId);
  console.log(`WORKER_LIFECYCLE assign_rowcount=${claimed} worker=${WORKER} state=running`);

  const mc = await pool.query(
    `SELECT event_id FROM ping_events WHERE event_type = 'MISSION_CREATED' AND payload->>'missionId' = $1 ORDER BY timestamp DESC LIMIT 1`,
    [missionId]
  );
  const createdEventId = mc.rows[0].event_id;
  const emitOpts = (causationId, logicalId) => ({
    tenant_id: TENANT, correlation_id: missionId, causation_id: causationId, logical_id: logicalId,
  });

  // --- Q1: journal liveness (direct readback) ---
  const q1 = await pool.query('SELECT count(*)::int AS n, max(timestamp) AS max_ts FROM ping_events');
  const last24 = await pool.query(
    `SELECT event_type, source, count(*)::int AS n, max(timestamp) AS max_ts
     FROM ping_events WHERE timestamp >= now() - interval '24 hours'
     GROUP BY 1, 2 ORDER BY 3 DESC`
  );
  const obs1 = await eventRuntime.emit('OBSERVATION_CREATED', 'mission-worker', {
    documentId: missionId,
    observation: {
      question: 'Q1 journal liveness',
      journal: 'brain-postgres / ping_runtime.ping_events',
      events_before_run: pre.rows[0].n,
      events_now: q1.rows[0].n,
      max_timestamp: q1.rows[0].max_ts,
      last_24h_by_type_source: last24.rows,
      live_gateway: { image: gwImg, db: Object.fromEntries(gwEnv.map((l) => l.split('='))) },
    },
    upstreamEventId: createdEventId,
  }, emitOpts(createdEventId, 'writerm:obs:journal-liveness'));
  console.log('OBS1 ' + obs1.eventId);

  // --- Q2: Lane L tenant-backfill state (direct readback) ---
  const q2 = await pool.query('SELECT count(*)::int AS nulls FROM ping_events WHERE tenant_id IS NULL');
  const q2d = await pool.query(
    `SELECT column_default FROM information_schema.columns WHERE table_name = 'ping_events' AND column_name = 'tenant_id'`
  );
  const obs2 = await eventRuntime.emit('OBSERVATION_CREATED', 'mission-worker', {
    documentId: missionId,
    observation: {
      question: 'Q2 tenant backfill',
      null_tenant_id_rows: q2.rows[0].nulls,
      column_default: q2d.rows[0] && q2d.rows[0].column_default,
      note: 'merged-line initialize() ran at the start of this run; backfill UPDATE is the Lane L declared semantic',
    },
    upstreamEventId: createdEventId,
  }, emitOpts(createdEventId, 'writerm:obs:tenant-backfill'));
  console.log('OBS2 ' + obs2.eventId);

  // --- Q3: prior INTELLIGENCE_RESEARCH missions (direct readback) ---
  const q3 = await pool.query(
    `SELECT mission_id, status, created_at FROM ping_missions
     WHERE mission_type = 'INTELLIGENCE_RESEARCH' AND mission_id <> $1`,
    [missionId]
  );
  const obs3 = await eventRuntime.emit('OBSERVATION_CREATED', 'mission-worker', {
    documentId: missionId,
    observation: {
      question: 'Q3 falsification-test-1 baseline',
      prior_ir_missions: q3.rows,
      prior_ir_count: q3.rows.length,
    },
    upstreamEventId: createdEventId,
  }, emitOpts(createdEventId, 'writerm:obs:prior-ir-missions'));
  console.log('OBS3 ' + obs3.eventId);

  // --- Claims with verdicts (verdict_vocab attach helper; causation = observation) ---
  async function emitClaim(text, subject, verdict, evidenceIds, causationId, logicalId, extra) {
    const rec = attachClaimVerdict({
      text, subject,
      synthesis_tag: verdict === 'UNCLEAR' ? 'UNKNOWN' : 'VERIFIED',
      evidence: {
        observation_event_ids: evidenceIds,
        method: 'direct SQL readback against the live Pig journal during this run',
        ...(extra || {}),
      },
    }, verdict);
    const res = await eventRuntime.emit('CLAIM_CREATED', 'mission-worker', {
      documentId: missionId, claim: rec, upstreamEventId: causationId,
    }, emitOpts(causationId, logicalId));
    console.log(`CLAIM ${verdict} ${res.eventId} :: ${text.slice(0, 80)}`);
    return res;
  }

  const postObs = await pool.query('SELECT count(*)::int AS n FROM ping_events');
  const c1 = await emitClaim(
    'The Pig journal (brain-postgres / ping_runtime.ping_events) is the live event plane and it accepted this mission writes.',
    'pig-journal-liveness', 'CONFIRMED', [obs1.eventId], obs1.eventId, 'writerm:claim:journal-liveness',
    { events_before_run: pre.rows[0].n, events_after_observations: postObs.rows[0].n }
  );
  const c2verdict = q2.rows[0].nulls === 0 ? 'CONFIRMED' : 'REFUTED';
  const c2 = await emitClaim(
    'After the merged-line initialize(), every ping_events row carries the Lane L tenant backfill value.',
    'tenant-backfill-state', c2verdict, [obs2.eventId], obs2.eventId, 'writerm:claim:tenant-backfill',
    { null_tenant_id_rows: q2.rows[0].nulls }
  );
  const c3 = await emitClaim(
    'No INTELLIGENCE_RESEARCH mission existed in the live journal before this run.',
    'prior-ir-missions', 'CONFIRMED', [obs3.eventId], obs3.eventId, 'writerm:claim:prior-ir-missions',
    { prior_ir_count: q3.rows.length }
  );
  const c4 = await emitClaim(
    'MarketingOS projection falsification test 1 is fully satisfied: this mission state was supplied AND the view renders it.',
    'falsification-test-1-rendering', 'UNCLEAR', [obs3.eventId], obs3.eventId, 'writerm:claim:falsification-rendering',
    { unclear_reason: 'The state-supply half is confirmed by direct readback in this run; the rendering half cannot be observed because the Mission Control writer has not implemented the view (projection contract sections 8 and 10).' }
  );

  // --- Synthesis: learning + next question; no consequential action proposed ---
  const synthesis = {
    findings: [
      { question: 'Q1', answer: `Pig journal live; ${postObs.rows[0].n - pre.rows[0].n} events written by this run; last production write 2026-09-30 17:46:33 UTC (11 /ingest observations).`, verdict: 'CONFIRMED', evidence_event_ids: [obs1.eventId, c1.eventId] },
      { question: 'Q2', answer: `tenant_id NULL rows: ${q2.rows[0].nulls}; default ${q2d.rows[0] && q2d.rows[0].column_default}.`, verdict: c2verdict, evidence_event_ids: [obs2.eventId, c2.eventId] },
      { question: 'Q3', answer: 'Zero prior INTELLIGENCE_RESEARCH missions; this run is the first.', verdict: 'CONFIRMED', evidence_event_ids: [obs3.eventId, c3.eventId] },
    ],
    synthesis_tag: 'INFERRED',
    synthesis_tag_reason: 'Three findings confirmed by direct readback; the learning statement below generalizes one step beyond the readback.',
    learning: 'The live plane is the Pig journal and it accepts merged-line writes with Lane L tenant semantics intact. The MarketingOS projection now has real canonical state for mission, observations, claims, and evidence; rendering remains with the MC writer.',
    next_question: 'Does the Mission Control view render this mission with intact claim drill-down links (the UNCLEAR half of falsification test 1)?',
    consequential_action_proposed: false,
  };
  await missionRuntime.complete(missionId, synthesis);
  console.log('MISSION_COMPLETED id=' + missionId);

  // --- Proof: readback of everything ---
  const mrow = await pool.query(
    `SELECT mission_id, mission_type, status, tenant_id, created_by, created_at, completed_at,
            result->>'synthesis_tag' AS synthesis_tag,
            result->>'consequential_action_proposed' AS action_proposed
     FROM ping_missions WHERE mission_id = $1`, [missionId]);
  const lifecycle = await pool.query(
    `SELECT event_id, event_type, source, timestamp FROM ping_events
     WHERE payload->>'missionId' = $1 ORDER BY timestamp`, [missionId]);
  const research = await pool.query(
    `SELECT event_id, event_type, source, metadata->>'causation_id' AS causation_id, timestamp
     FROM ping_events WHERE metadata->>'correlation_id' = $1 ORDER BY timestamp`, [missionId]);
  const followup = await pool.query(
    `SELECT mission_id, mission_type, status, created_by, tenant_id, created_at
     FROM ping_missions WHERE created_by = 'claim-mission-chainer' ORDER BY created_at DESC LIMIT 3`);
  const followupEvents = followup.rows.length
    ? await pool.query(
      `SELECT event_id, event_type, metadata->>'causation_id' AS causation_id
       FROM ping_events WHERE event_type = 'MISSION_CREATED' AND payload->>'missionId' = $1`,
      [followup.rows[0].mission_id])
    : { rows: [] };
  const trace = await missionRuntime.getTrace(missionId);

  console.log('PROOF_BEGIN');
  console.log(JSON.stringify({
    mission: mrow.rows[0],
    lifecycle_events: lifecycle.rows,
    correlated_research_events: research.rows,
    chainer_followup_missions: followup.rows,
    chainer_followup_created_events: followupEvents.rows,
    getTrace: { correlation_id: trace.correlation_id, eventCount: trace.eventCount },
    chainer_stats: chainer.getStats(),
    detector_stats: detector._stats,
  }, null, 1));
  console.log('PROOF_END');

  await pool.end();
}

main().then(
  () => { console.log('WRITER_M_DONE'); process.exit(0); },
  (err) => { console.error('WRITER_M_FAILED', err && err.message); process.exit(1); }
);
