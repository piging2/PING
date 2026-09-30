'use strict';
/* MarketingOS 100h, Block 60-80, Driver E: record the video-compiler trail.
 * Existing machinery only: merged-line UnifiedEventRuntime + MissionRuntime +
 * mission_labels.createLabeledMission (EXPERIMENT_RUN: design in payload,
 * outcome in result — the "experiment" is the video-compilation + transcript-
 * recheck protocol: VideoSpec -> narration -> frames -> assembly -> recheck;
 * CONTENT_PRODUCTION does not exist in mission_labels.js on the Pig and the
 * directive forbids inventing vocabulary, so EXPERIMENT_RUN is the honest
 * existing label, same as blocks 20-40 and 40-60) + verdict_vocab.attachClaimVerdict
 * (CLAIM_VERDICTS ONLY: CONFIRMED | REFUTED | UNCLEAR — lesson I1), against the
 * live Pig journal (brain-postgres / ping_runtime). No new runtimes, stores, authorities.
 * DB credential read at runtime from the live Pig ping-gateway container env
 * (same-plane config, never printed, never logged, never in a payload).
 * Lessons I2/I3: complete() only transitions from status='running' — use
 * assign -> start -> complete and READ THE ROW BACK; ping_events correlation
 * lives at metadata->>'correlation_id'.
 * The VideoSpec (BLOCK-60-80-VIDEOSPEC.md), narration, frames, assembled mp4,
 * and block report were written and committed BEFORE this driver ran. This
 * driver only records the trail.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const WT = '/home/nolan/ping-worktrees/deploy-merge-20260930';
const TENANT = 'ping-ops';
const WORKER = 'mkos-block60-80-video-worker';

function dbPassword() {
  const env = execSync(
    `docker inspect ping-gateway --format '{{range .Config.Env}}{{println .}}{{end}}'`,
    { encoding: 'utf8' }
  );
  const line = env.split('\n').find((l) => l.startsWith('POSTGRES_PASSWORD='));
  if (!line) throw new Error('POSTGRES_PASSWORD not found in ping-gateway container env');
  return line.slice('POSTGRES_PASSWORD='.length).trim();
}

async function main() {
  const { Pool } = require('/tmp/writer-m/node_modules/pg');
  const pool = new Pool({
    host: '127.0.0.1', port: 5432, user: 'postgres',
    password: dbPassword(), database: 'ping_runtime',
  });

  const { UnifiedEventRuntime } = require(path.join(WT, 'ping-runtime/events/unified_event_runtime.js'));
  const { MissionRuntime } = require(path.join(WT, 'ping-runtime/orchestration/mission_runtime.js'));
  const { createLabeledMission, MISSION_LABELS } = require(path.join(WT, 'ping-runtime/orchestration/mission_labels.js'));
  const { attachClaimVerdict } = require(path.join(WT, 'ping-runtime/evidence/verdict_vocab.js'));

  const eventRuntime = new UnifiedEventRuntime({ pool });
  await eventRuntime.initialize();
  const missionRuntime = new MissionRuntime({ pool, eventRuntime });
  await missionRuntime.initialize();
  console.log('INIT_OK merged-line runtimes initialized against Pig journal');

  // --- EXPERIMENT_RUN mission: design = VideoSpec + recheck protocol ---
  const design = {
    hypothesis: 'The 40-60 script can be compiled into a review-ready video artifact whose narration is the script in spoken form, whose visuals are deterministic frames rendered from recorded evidence only, and which survives a separate transcript recheck against the 23-claim ledger — with the headline still parameterized and zero distribution.',
    metrics: [
      'shots: 12 (S01..S12)',
      'narration_segments: 12 (tts, single voice, spoken-form conversion)',
      'frames: 12 (1920x1080 PIL, rendered from recorded evidence)',
      'transcript_recheck_cuts_or_narrows: 0 (40-60 narrow remains cut)',
      'fabricated_values_removed: 3 (invented RETURNING ids replaced with recorded outcomes)',
      'headline: PARAMETERIZED (H1/H2/H3, Nolan\'s pick pending)',
      'distribution: ZERO (review artifact only; stops at Nolan\'s boundary)',
    ],
    variables: {
      inputs: ['BLOCK-40-60-SCRIPT.md', 'claim-ledger-40-60.json (CL-01..CL-23)', 'BLOCK-40-60-REPORT.md', 'BLOCK-60-80-VIDEOSPEC.md'],
      trial_sql: ['drivers/mkos-t9.sql', 'drivers/mkos-t10.sql', 'drivers/mkos-t11.sql', 'drivers/mkos-t12.sql', 'drivers/mkos-t38.sql'],
      recorded_outputs_source: 'BLOCK-0-20-REPORT.md (findings C1..C8, contradictions K1/K2, unresolved U1..U5)',
      voice: 'avocado_v2:MAI_03 (Smooth); synthetic, disclosed on every frame footer',
      assembly: 'ffmpeg per-shot loop+concat, libx264/yuv420p + aac',
    },
    guardrails: {
      no_new_authorities: true,
      no_new_stores: true,
      no_oracle_state_touched: true,
      no_ai_video_generation: 'deliberate — prompt-led synthetic footage would fabricate terminal sessions',
      headline_never_stronger_than_evidence_map: true,
      distribution_decisions_stop_at_nolan: true,
    },
  };

  const missionId = await createLabeledMission(missionRuntime, MISSION_LABELS.EXPERIMENT_RUN, design, {
    tenant_id: TENANT, createdBy: 'mkos-block60-80',
  });
  console.log('MISSION_CREATED id=' + missionId);

  const emitOpts = (causationId, logicalId) => ({
    tenant_id: TENANT, correlation_id: missionId, causation_id: causationId, logical_id: logicalId,
  });

  async function emitObs(question, findings, upstreamId, logicalId) {
    const res = await eventRuntime.emit('OBSERVATION_CREATED', WORKER, {
      documentId: missionId,
      observation: { question, findings, method: 'video compilation, block 60-80' },
      upstreamEventId: upstreamId || null,
    }, emitOpts(upstreamId || null, logicalId));
    console.log('OBS ' + res.eventId + ' :: ' + question.slice(0, 60));
    return res;
  }

  const obs1 = await emitObs(
    'VideoSpec: 12 shots from the 40-60 script; narration in spoken form; visuals from recorded evidence only',
    ['BLOCK-60-80-VIDEOSPEC.md: shot list S01..S12 with narration text, visual description, evidence source, and ledger mapping per shot',
     'narration: 12 segments, tts single voice (avocado_v2:MAI_03 Smooth); spoken-form edits are pronunciation mappings only (default_transaction_read_only -> "default transaction read only", DML -> "D M L", numbers spelled out); no semantic change',
     'visuals: 12 frames (1920x1080, PIL), deterministic renderings of recorded trial SQL (drivers/mkos-t*.sql) + recorded outputs (BLOCK-0-20-REPORT.md findings C1..C8, contradictions K1/K2, unresolved U1..U5)',
     'provenance footer on every frame: "Rendered from recorded evidence (trials 2026-09-30, disposable PG 16 — destroyed after run). Not a live capture. Narration: synthetic voice. Headline: pending Nolan\'s pick."',
     'headline: PARAMETERIZED on shot S01 ([ HEADLINE — NOLAN\'S PICK PENDING ]); narration S01 is headline-agnostic',
     'AI video generation deliberately NOT used: prompt-led synthetic footage would fabricate terminal sessions and undermine the technical-credibility register'],
    null, 'mkos-b6080:obs:videospec');
  const obs2 = await emitObs(
    'transcript recheck: every spoken line vs the 23-claim ledger PUBLIC WORDING -> MAXIMUM DEFENSIBLE WORDING chain',
    ['recheck method: the narration is the 40-60 script in spoken form; the 40-60 accuracy pass already verified every script sentence vs the 11-entry evidence map (inclusion) and N1-N7 (exclusion); this pass re-verifies the spoken conversion introduced no new claims',
     'S01: framing only, no claim; headline slot explicit. S02: CL-01. S03: CL-02+CL-03 ("bends the moment the session asks" = CL-20 public wording in plain speech). S04: CL-04 + CL-20. S05: CL-06 + CL-05 (= K2 resolution). S06: CL-07 (attributed, narrowed) + U1/N1 unverified. S07: CL-08 + CL-23 (scope arrives in S08, same constraint the script satisfied). S08: CL-09 (N6 trial disclaimer spoken) + CL-10. S09: CL-11 + CL-21 (N7). S10: CL-12/13/22. S11: CL-14/15. S12: N1/N2 + CL-16/17/18/19; closing synthesis within CL-20/CL-21 scope',
     'CUTS / NARROWS from this pass: 0. The 40-60 narrow ("a lot of teams" cut) remains cut. No spoken line asserts anything in N1-N7 as verified fact',
     '1 self-caught fabrication fixed BEFORE assembly: three invented RETURNING id values (7, 8, 12) in draft frames S03/S05 replaced with recorded outcomes (INSERT 0 1); ids were never recorded in the 0-20 mission record'],
    obs1.eventId, 'mkos-b6080:obs:recheck');
  const obs3 = await emitObs(
    'assembly + deviations + review-readiness',
    ['assembly: ffmpeg per-shot (-loop 1 frame + narration mp3, libx264/yuv420p + aac, -shortest), concat to marketingos-readonly-seal-2026-09-30.mp4; verified: duration, streams, per-shot audio/frame correspondence',
     'deviation 1 (honest): frames are rendered reconstructions of recorded evidence, not screenshots — the disposable PG was destroyed after the trials; the VideoSpec and every frame footer say so',
     'deviation 2 (honest): T10 frame shows recorded outcomes ("every write blocked — permission denied", "blocked again under explicit READ WRITE") rather than a captured transcript; the 0-20 record confirms the verdict, not the exact error string',
     'deviation 3 (honest): narration voice is synthetic; disclosed in the spec and on every frame footer',
     'open inputs: Nolan\'s headline pick (H1/H2/H3) — slots into S01 with zero other changes; human approval — this artifact is review-ready, not approved, not distributed',
     'NOT done in this block: no distribution, no posting, no scheduling, no provider calls; Qdrant untouched'],
    obs2.eventId, 'mkos-b6080:obs:assembly');

  async function emitClaim(text, subject, verdict, logicalId) {
    const rec = attachClaimVerdict({
      text, subject,
      synthesis_tag: 'VERIFIED',
      evidence: {
        observation_event_ids: [obs1.eventId, obs2.eventId, obs3.eventId],
        method: 'VideoSpec + transcript recheck + ffmpeg assembly per block 60-80 method',
      },
    }, verdict);
    const res = await eventRuntime.emit('CLAIM_CREATED', WORKER, {
      documentId: missionId, claim: rec, upstreamEventId: obs3.eventId,
    }, emitOpts(obs3.eventId, logicalId));
    console.log(`CLAIM ${verdict} ${res.eventId} :: ${subject}`);
    return res;
  }

  const claims = [];
  claims.push(await emitClaim('The video artifact is compiled from the ledgered script: CONFIRMED. 12 shots, 12 narration segments (spoken-form conversion, no semantic change), 12 evidence-rendered frames, ffmpeg-assembled to one mp4. Every shot carries its ledger mapping in the VideoSpec.',
    'video compiled from ledgered script: CONFIRMED', 'CONFIRMED', 'mkos-b6080:claim:compiled'));
  claims.push(await emitClaim('The transcript recheck is clean: CONFIRMED. Zero cuts or narrows; every spoken line resolves to its ledger claim within PUBLIC WORDING -> MAXIMUM DEFENSIBLE WORDING; no line asserts anything in N1-N7 as verified fact. One self-caught fabrication (invented RETURNING ids) was fixed before assembly.',
    'transcript recheck clean: CONFIRMED', 'CONFIRMED', 'mkos-b6080:claim:recheck'));
  claims.push(await emitClaim('The artifact is review-ready and undistributed: CONFIRMED. Headline parameterized (H1/H2/H3, Nolan\'s pick pending); no publication, no distribution, no posting, no scheduling, no provider calls. Distribution decisions stop at his boundary.',
    'review-ready, undistributed: CONFIRMED', 'CONFIRMED', 'mkos-b6080:claim:review'));
  claims.push(await emitClaim('Provenance is honest on every frame: CONFIRMED. Frames are rendered reconstructions of recorded evidence (not live captures), narration is synthetic voice, headline is pending. AI video generation was deliberately not used.',
    'provenance honest: CONFIRMED', 'CONFIRMED', 'mkos-b6080:claim:provenance'));

  // --- Knowledge nodes/edges (video compiler trail) ---
  const ns = 'marketingos::block60-80';
  const prefix = `mkos-${missionId.slice(0, 8)}-b6080`;
  async function putNode(slug, nodeType, label, data, confidence) {
    const nid = `${prefix}-${slug}`;
    await pool.query(
      `INSERT INTO knowledge_nodes (node_id, node_type, label, data, source_event_id, namespace, confidence, status, correlation_id, confidence_provenance)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,'verified',$8,'video-compilation')
       ON CONFLICT (node_id) DO NOTHING`,
      [nid, nodeType, label, JSON.stringify({ ...data, mission_id: missionId }), null, ns, confidence, missionId]
    );
    return nid;
  }
  async function putEdge(slug, sourceId, targetId, edgeType, data) {
    await pool.query(
      `INSERT INTO knowledge_edges (edge_id, source_id, target_id, edge_type, data)
       VALUES ($1,$2,$3,$4,$5::jsonb) ON CONFLICT (edge_id) DO NOTHING`,
      [`${prefix}-edge-${slug}`, sourceId, targetId, edgeType, JSON.stringify({ ...data, mission_id: missionId })]
    );
  }

  const nSpec = await putNode('videospec', 'finding', 'VIDEOSPEC: 12 shots, narration, visuals, ledger mapping per shot',
    { detail: 'BLOCK-60-80-VIDEOSPEC.md. Shots: S01 title+headline slot; S02 T1; S03 T2/T3; S04 docs; S05 K2 vs T9; S06 CL-07 chain; S07 T10; S08 scope limit; S09 honest seal board; S10 temp-table precision; S11 operation matrix; S12 honest close.', evidence_event_id: obs1.eventId }, 1.0);
  const nArtifact = await putNode('artifact', 'finding', 'ARTIFACT: marketingos-readonly-seal-2026-09-30.mp4, review-ready, undistributed',
    { detail: '12 shots, ffmpeg-assembled (libx264/yuv420p + aac). Narration: synthetic voice (avocado_v2:MAI_03). Frames: PIL renderings of recorded evidence. Headline parameterized. For Nolan\'s review only.', evidence_event_id: obs3.eventId }, 1.0);
  const nRecheck = await putNode('recheck', 'finding', 'TRANSCRIPT RECHECK: clean, 0 cuts/narrows; 1 self-caught fabrication fixed pre-assembly',
    { detail: 'Every spoken line resolves to its ledger claim within PUBLIC WORDING -> MAXIMUM DEFENSIBLE WORDING. Invented RETURNING ids (7, 8, 12) replaced with recorded outcomes before assembly.', evidence_event_id: obs2.eventId }, 1.0);
  const nProvenance = await putNode('provenance', 'finding', 'PROVENANCE: honest on every frame; no AI video generation',
    { detail: 'Frames = rendered reconstructions of recorded evidence (disposable PG destroyed); narration = synthetic voice; headline = pending. AI video gen deliberately unused: it would fabricate terminal sessions.', evidence_event_id: obs3.eventId }, 1.0);
  const nLearning = await putNode('learning', 'learning', 'LEARNING: render-evidence-frames beats AI footage for technical credibility',
    { detail: 'For evidence-native content, deterministic frames rendered from recorded trial outputs preserve the claim chain; prompt-led video generation would sever it. Keep this as the compiler default for technical pieces: narration + rendered evidence frames + ffmpeg assembly.', evidence_event_id: claims[0].eventId }, 0.9);

  const claimNodes = [nSpec, nArtifact, nRecheck, nProvenance];
  const claimEvs = [claims[0].eventId, claims[0].eventId, claims[1].eventId, claims[3].eventId];
  for (let i = 0; i < claimNodes.length; i++) {
    await pool.query(`UPDATE knowledge_nodes SET source_event_id = $2 WHERE node_id = $1`, [claimNodes[i], claimEvs[i]]);
  }

  await putEdge('spec-drives-artifact', nSpec, nArtifact, 'drives', {});
  await putEdge('recheck-bounds', nRecheck, nArtifact, 'bounds', {});
  await putEdge('provenance-marks', nProvenance, nArtifact, 'marks', {});
  await putEdge('artifact-learning', nArtifact, nLearning, 'supports', {});
  console.log('KNOWLEDGE nodes=5 edges=4');

  // --- assign -> start -> complete (I2 lesson: read the row back) ---
  await missionRuntime.assign(missionId, WORKER);
  await missionRuntime.start(missionId);
  const result = {
    verdict: 'SUPPORTED',
    metrics_observed: {
      shots: 12,
      narration_segments: 12,
      frames: 12,
      transcript_recheck_cuts_or_narrows: 0,
      fabricated_values_fixed_pre_assembly: 3,
      headline: 'PARAMETERIZED',
      distribution: 'ZERO',
    },
    notes: 'Video artifact compiled: BLOCK-60-80-VIDEOSPEC.md + 12 narration segments + 12 evidence-rendered frames + marketingos-readonly-seal-2026-09-30.mp4. Transcript recheck clean. Headline pick (H1/H2/H3) and distribution decisions stop at Nolan\'s boundary. Ready for 80-100 learning loop: once approved and distributed, observe the five outcome classes (ATTENTION / INTELLECTUAL ENGAGEMENT / INTENT / AUTHORITY / BUSINESS) through canonical intake, preserve the observation window, separate outcome classes, no manufactured causality.',
  };
  await missionRuntime.complete(missionId, result);
  console.log('MISSION_COMPLETED id=' + missionId);

  fs.writeFileSync('/tmp/mkos-b6080-mission-id', missionId + '\n');

  // --- self-verification readback (PROOF) ---
  const mrow = await pool.query(
    `SELECT mission_id, mission_type, status FROM ping_missions WHERE mission_id = $1`, [missionId]);
  const research = await pool.query(
    `SELECT event_type, count(*)::int AS n FROM ping_events WHERE metadata->>'correlation_id' = $1 GROUP BY 1 ORDER BY 1`, [missionId]);
  const kn = await pool.query(
    `SELECT count(*)::int AS n FROM knowledge_nodes WHERE correlation_id = $1`, [missionId]);
  const ke = await pool.query(
    `SELECT count(*)::int AS n FROM knowledge_edges WHERE data->>'mission_id' = $1`, [missionId]);
  console.log('PROOF_BEGIN');
  console.log(JSON.stringify({ mission: mrow.rows[0], correlated_events: research.rows, knowledge_nodes: kn.rows[0].n, knowledge_edges: ke.rows[0].n }, null, 1));
  console.log('PROOF_END');

  await pool.end();
}

main().then(
  () => { console.log('DRIVER_E_DONE'); process.exit(0); },
  (err) => { console.error('DRIVER_E_FAILED', err && err.message); process.exit(1); }
);
