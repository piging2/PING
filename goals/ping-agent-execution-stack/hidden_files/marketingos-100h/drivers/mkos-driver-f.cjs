'use strict';
/* MarketingOS 100h, Block 80-100, Driver F: record the learning-loop trail.
 * Existing machinery only: merged-line UnifiedEventRuntime + MissionRuntime +
 * mission_labels.createLabeledMission (EXPERIMENT_RUN: design in payload,
 * outcome in result — the "experiment" is the learning loop itself:
 * LearningRecord schema + 6 seeded records + playbook rule format +
 * outcome-intake seam + validator dry run; CONTENT_PRODUCTION does not exist
 * in mission_labels.js on the Pig and the directive forbids inventing
 * vocabulary) + verdict_vocab.attachClaimVerdict (CLAIM_VERDICTS ONLY:
 * CONFIRMED | REFUTED | UNCLEAR — lesson I1), against the live Pig journal
 * (brain-postgres / ping_runtime). No new runtimes, stores, authorities.
 * DB credential read at runtime from the live Pig ping-gateway container env
 * (same-plane config, never printed, never logged, never in a payload).
 * Lessons I2/I3: complete() only transitions from status='running' — use
 * assign -> start -> complete and READ THE ROW BACK; ping_events correlation
 * lives at metadata->>'correlation_id'.
 * The learnings/, intake spec, fixtures, validator, and block report were
 * written and committed BEFORE this driver ran. This driver only records
 * the trail. Falsifier certification is a separate pass with its own record.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const WT = '/home/nolan/ping-worktrees/deploy-merge-20260930';
const TENANT = 'ping-ops';
const WORKER = 'mkos-block80-100-learn-worker';

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

  const design = {
    hypothesis: 'The learning loop can be closed on existing machinery: LearningRecord schema + 6 records seeded from this sprint\'s real learnings + playbook rule format with decay + outcome-intake seam (5 outcome classes, no magic score) + validator dry run — with no new authorities, stores, or subsystems, and with learnings never silently becoming policy.',
    metrics: [
      'learning_records_seeded: 6 (LR-20260930-001..006)',
      'playbook_candidate_rules: 6 (PR-01..PR-06, all CANDIDATE)',
      'outcome_classes: 5 (ATTENTION / INTELLECTUAL_ENGAGEMENT / INTENT / AUTHORITY / BUSINESS)',
      'validator_dry_run: valid fixture 1/1 VALID; malformed fixture 1/1 INVALID (4 errors)',
      'real_outcomes_journaled: 0 (no distributions; boundary holds)',
      'falsifier_certification: separate pass, own record',
    ],
    variables: {
      machinery_files: ['learnings/LEARNING-RECORD-SCHEMA.md', 'learnings/learning-records.json', 'learnings/PLAYBOOK.md', 'learnings/OUTCOME-INTAKE.md', 'learnings/outcome-intake-schema.json', 'learnings/validate-intake.cjs', 'learnings/fixtures/'],
      learnings: ['I1 verdict-vocab scope', 'I2 read-the-row-back', 'I3 correlation-in-metadata', 'ledger-before-accuracy-pass', 'rendered-evidence-frames default', 'headline-parameterization'],
    },
    guardrails: {
      no_new_authorities: true,
      no_new_stores: true,
      no_oracle_state_touched: true,
      learnings_never_silently_policy: true,
      expired_rules_reverified_or_dropped: true,
      no_manufactured_outcomes: true,
      distribution_decisions_stop_at_nolan: true,
    },
  };

  const missionId = await createLabeledMission(missionRuntime, MISSION_LABELS.EXPERIMENT_RUN, design, {
    tenant_id: TENANT, createdBy: 'mkos-block80-100',
  });
  console.log('MISSION_CREATED id=' + missionId);

  const emitOpts = (causationId, logicalId) => ({
    tenant_id: TENANT, correlation_id: missionId, causation_id: causationId, logical_id: logicalId,
  });

  async function emitObs(question, findings, upstreamId, logicalId) {
    const res = await eventRuntime.emit('OBSERVATION_CREATED', WORKER, {
      documentId: missionId,
      observation: { question, findings, method: 'learning-loop construction, block 80-100' },
      upstreamEventId: upstreamId || null,
    }, emitOpts(upstreamId || null, logicalId));
    console.log('OBS ' + res.eventId + ' :: ' + question.slice(0, 60));
    return res;
  }

  const obs1 = await emitObs(
    'LearningRecord machinery: schema + 6 records seeded from the sprint\'s real learnings only',
    ['schema: learnings/LEARNING-RECORD-SCHEMA.md — fields id/title/learned_in_block/statement/support_set/scope/confidence/sample_count/counterexamples/freshness/expiration/status/policy_boundary; expiration rule: re-verify or drop, no third option',
     'LR-20260930-001 (I1): attachClaimVerdict accepts CONFIRMED|REFUTED|UNCLEAR only; experiment outcomes go in the mission result verdict field. confidence 1.0, n=1 deterministic failure+fix',
     'LR-20260930-002 (I2): complete() is a silent no-op unless status=running; never print COMPLETED without reading the row back. confidence 1.0',
     'LR-20260930-003 (I3): ping_events has no correlation_id column; correlation is metadata->>\'correlation_id\'. confidence 1.0',
     'LR-20260930-004: ledger-before-accuracy-pass — the ledger caught the "app never issues SET" near-miss (narrowed to attributed CL-07). confidence 0.8, n=1',
     'LR-20260930-005: rendered-evidence-frames as compiler default for technical pieces; the render caught invented RETURNING ids 7/8/12 pre-assembly. confidence 0.9',
     'LR-20260930-006: headline-parameterization until human pick; slot in with zero other changes. confidence 0.85',
     'nothing the sprint did not actually learn was seeded'],
    null, 'mkos-b80100:obs:learnings');

  const obs2 = await emitObs(
    'playbook rule format + outcome-intake seam built; validator dry run green',
    ['PLAYBOOK.md: 6 candidate rules PR-01..PR-06 (verdict-vocab discipline; assign-start-complete-read-back; correlation-in-metadata; ledger-before-accuracy-pass; rendered-evidence-frames; headline-parameterization). ALL status CANDIDATE. Promotion to ACTIVE requires an explicit recorded human decision. Expiration -> re-verify or drop, never silently kept',
     'OUTCOME-INTAKE.md + outcome-intake-schema.json: canonical post-distribution intake contract. 5 outcome classes: ATTENTION / INTELLECTUAL_ENGAGEMENT / INTENT / AUTHORITY / BUSINESS. No magic score. Causality claim required: none (default) | correlated (confounders listed) | causally-tested. Open windows are never converted into success metrics',
     'dry run: validate-intake.cjs against fixtures/valid-synthetic.json -> 1/1 VALID; against fixtures/malformed-synthetic.json -> 1/1 INVALID (4 errors: bad class, missing confounders, inverted window, bad date). Fixtures are synthetic and never journaled as real outcomes',
     'real outcomes journaled: 0. Zero distributions happened; the boundary holds'],
    obs1.eventId, 'mkos-b80100:obs:playbook-intake');

  async function emitClaim(text, subject, verdict, logicalId) {
    const rec = attachClaimVerdict({
      text, subject,
      synthesis_tag: 'VERIFIED',
      evidence: {
        observation_event_ids: [obs1.eventId, obs2.eventId],
        method: 'learning-loop construction + validator dry run, block 80-100',
      },
    }, verdict);
    const res = await eventRuntime.emit('CLAIM_CREATED', WORKER, {
      documentId: missionId, claim: rec, upstreamEventId: obs2.eventId,
    }, emitOpts(obs2.eventId, logicalId));
    console.log(`CLAIM ${verdict} ${res.eventId} :: ${subject}`);
    return res;
  }

  const claims = [];
  claims.push(await emitClaim('The learning loop is closed on existing machinery: CONFIRMED. LearningRecord schema + 6 seeded records (real learnings only) + playbook format with decay + outcome-intake seam + green validator dry run. No new authorities, stores, subsystems. No Oracle state touched.',
    'learning loop closed on existing machinery: CONFIRMED', 'CONFIRMED', 'mkos-b80100:claim:loop'));
  claims.push(await emitClaim('Learnings never silently become policy: CONFIRMED as machinery. Every LearningRecord carries policy_boundary=true; every playbook rule starts CANDIDATE; ACTIVE requires an explicit recorded human decision; expired rules are re-verified or dropped, never silently kept.',
    'learnings never silently policy: CONFIRMED', 'CONFIRMED', 'mkos-b80100:claim:boundary'));
  claims.push(await emitClaim('The outcome intake is built and untested-on-real-data by design: CONFIRMED. Validator dry run: valid 1/1, malformed 1/1 with 4 errors. Zero real outcomes journaled because zero distributions happened. The intake will receive observations only after Nolan authorizes distribution.',
    'intake built, zero real outcomes: CONFIRMED', 'CONFIRMED', 'mkos-b80100:claim:intake'));

  // --- Knowledge nodes/edges ---
  const ns = 'marketingos::block80-100';
  const prefix = `mkos-${missionId.slice(0, 8)}-b80100`;
  async function putNode(slug, nodeType, label, data, confidence) {
    const nid = `${prefix}-${slug}`;
    await pool.query(
      `INSERT INTO knowledge_nodes (node_id, node_type, label, data, source_event_id, namespace, confidence, status, correlation_id, confidence_provenance)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,'verified',$8,'learning-loop-construction')
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

  const lrNodes = [];
  const lrDefs = [
    ['lr01', 'LR-01: attachClaimVerdict accepts CLAIM_VERDICTS only', 1.0, claims[0].eventId],
    ['lr02', 'LR-02: complete() is a silent no-op unless running; read the row back', 1.0, claims[0].eventId],
    ['lr03', 'LR-03: ping_events correlation is metadata->>\'correlation_id\'', 1.0, claims[0].eventId],
    ['lr04', 'LR-04: ledger-before-accuracy-pass; the ledger is the detection surface', 0.8, claims[0].eventId],
    ['lr05', 'LR-05: rendered-evidence-frames as compiler default for technical pieces', 0.9, claims[0].eventId],
    ['lr06', 'LR-06: headline-parameterization until the human pick', 0.85, claims[0].eventId],
  ];
  for (const [slug, label, conf, evId] of lrDefs) {
    const nid = await putNode(slug, 'learning', label,
      { learning_id: 'LR-20260930-' + slug.slice(2), file: 'learnings/learning-records.json' }, conf);
    await pool.query(`UPDATE knowledge_nodes SET source_event_id = $2 WHERE node_id = $1`, [nid, evId]);
    lrNodes.push(nid);
  }
  const nPlaybook = await putNode('playbook', 'finding',
    'PLAYBOOK: 6 candidate rules PR-01..PR-06, all CANDIDATE; decay law; promotion requires recorded human decision',
    { file: 'learnings/PLAYBOOK.md', rules: 6, active: 0 }, 1.0);
  const nIntake = await putNode('intake', 'finding',
    'OUTCOME INTAKE: 5 outcome classes, causality-honesty contract, validator dry run green, zero real outcomes',
    { file: 'learnings/OUTCOME-INTAKE.md', classes: 5, real_outcomes: 0 }, 1.0);
  await pool.query(`UPDATE knowledge_nodes SET source_event_id = $2 WHERE node_id = $1`, [nPlaybook, claims[1].eventId]);
  await pool.query(`UPDATE knowledge_nodes SET source_event_id = $2 WHERE node_id = $1`, [nIntake, claims[2].eventId]);

  for (let i = 0; i < lrNodes.length; i++) {
    await putEdge(`lr-supports-playbook-${i + 1}`, lrNodes[i], nPlaybook, 'supports', {});
  }
  await putEdge('intake-closes-loop', nIntake, nPlaybook, 'feeds', {});
  console.log('KNOWLEDGE nodes=8 edges=7');

  // --- assign -> start -> complete (I2 lesson: read the row back) ---
  await missionRuntime.assign(missionId, WORKER);
  await missionRuntime.start(missionId);
  const result = {
    verdict: 'SUPPORTED',
    metrics_observed: {
      learning_records_seeded: 6,
      playbook_candidate_rules: 6,
      playbook_active_rules: 0,
      outcome_classes: 5,
      validator_dry_run_valid: '1/1',
      validator_dry_run_malformed: '1/1 rejected (4 errors)',
      real_outcomes_journaled: 0,
      new_authorities: 0,
      new_stores: 0,
    },
    notes: 'Learning-loop machinery built on existing homes: LearningRecord schema + 6 seeded records (real learnings only) + PLAYBOOK.md (6 CANDIDATE rules, decay law) + outcome-intake seam (5 classes, causality-honesty, validator dry run green). Falsifier certification is a separate pass with its own record; the sprint is not closed until its report is committed. Distribution remains stopped at Nolan\'s boundary.',
  };
  await missionRuntime.complete(missionId, result);
  console.log('MISSION_COMPLETED id=' + missionId);

  fs.writeFileSync('/tmp/mkos-b80100-mission-id', missionId + '\n');

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
  () => { console.log('DRIVER_F_DONE'); process.exit(0); },
  (err) => { console.error('DRIVER_F_FAILED', err && err.message); process.exit(1); }
);
