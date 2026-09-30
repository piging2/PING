'use strict';
/* MarketingOS 100h, Block 40-60, Driver D: record the evidence-native script trail.
 * Existing machinery only: merged-line UnifiedEventRuntime + MissionRuntime +
 * mission_labels.createLabeledMission (EXPERIMENT_RUN: design in payload,
 * outcome in result — the "experiment" is the script-production + verification
 * protocol: script -> ledger -> accuracy pass -> overclaim pass -> L6 review;
 * CONTENT_PRODUCTION does not exist in mission_labels.js on the Pig and the
 * directive forbids inventing vocabulary, so EXPERIMENT_RUN is the honest
 * existing label, same as block 20-40) + verdict_vocab.attachClaimVerdict (CLAIM_VERDICTS ONLY:
 * CONFIRMED | REFUTED | UNCLEAR — lesson I1), against the live Pig journal
 * (brain-postgres / ping_runtime). No new runtimes, stores, authorities.
 * DB credential read at runtime from the live Pig ping-gateway container env
 * (same-plane config, never printed, never logged, never in a payload).
 * Lessons I2/I3: complete() only transitions from status='running' — use
 * assign -> start -> complete and READ THE ROW BACK; ping_events correlation
 * lives at metadata->>'correlation_id'.
 * The script (BLOCK-40-60-SCRIPT.md), ledger (claim-ledger-40-60.json), and
 * report (BLOCK-40-60-REPORT.md) were written and committed BEFORE this driver
 * ran (workspace commit 692134e). This driver only records the trail.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const WT = '/home/nolan/ping-worktrees/deploy-merge-20260930';
const TENANT = 'ping-ops';
const WORKER = 'mkos-block40-60-script-worker';

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

  // --- EXPERIMENT_RUN mission: design = script brief + pass methodology ---
  // NOTE: CONTENT_PRODUCTION is not in mission_labels.js on the Pig (grep -c = 0);
  // the directive forbids new vocabulary, so EXPERIMENT_RUN is used, as in 20-40.
  const design = {
    hypothesis: 'A spoken script draft can be produced from the surviving thesis ONLY, with every atomic claim machine-readable in a ledger, and survive a separate accuracy pass, an overclaim pass, and a hostile L6 review without asserting anything outside the 11-entry evidence map or inside N1-N7.',
    metrics: [
      'script_parts: 5 (per 20-40 report section 3)',
      'ledger_claims: 23 (CL-01..CL-23, all 13 fields)',
      'accuracy_cuts_or_narrows: 1 (the "a lot of teams" generalization)',
      'overclaim_flagged_words: 0 beyond supported uses',
      'l6_narrowings_confirmed: 4',
      'headline: PARAMETERIZED (H1/H2/H3, Nolan\'s pick pending)',
      'u2_trigger_testing: NOT RUN (task constraint; queued as next research mission)',
    ],
    variables: {
      surviving_thesis: 'default_transaction_read_only is a session default, not a privilege boundary. REVOKE is the boundary, for non-superuser roles. Superusers cannot be privilege-bound at all, and our own journal runs as one.',
      inputs: ['BLOCK-20-40-REPORT.md sections 3/4/5', 'SPRINT.md', 'evidence map (11 entries)', 'non-claims N1-N7'],
      script_commit: '692134e',
      ledger_fields: ['claim','type','support_set','primary_source','independent_support','evidence_grade','verdict','scope','time_bound','counterevidence','public_wording','maximum_defensible_wording'],
      overclaim_words: ['solves','guarantees','proves','always','never','production-ready','deterministic','secure','autonomous','self-healing','exactly-once','zero-downtime','fault-tolerant','verified','canonical'],
    },
    guardrails: {
      no_new_authorities: true,
      no_new_stores: true,
      no_oracle_state_touched: true,
      headline_never_stronger_than_evidence_map: true,
      distribution_decisions_stop_at_nolan: true,
      u2_not_run_this_block: true,
    },
  };

  const missionId = await createLabeledMission(missionRuntime, MISSION_LABELS.EXPERIMENT_RUN, design, {
    tenant_id: TENANT, createdBy: 'mkos-block40-60',
  });
  console.log('MISSION_CREATED id=' + missionId);

  const emitOpts = (causationId, logicalId) => ({
    tenant_id: TENANT, correlation_id: missionId, causation_id: causationId, logical_id: logicalId,
  });

  async function emitObs(question, findings, upstreamId, logicalId) {
    const res = await eventRuntime.emit('OBSERVATION_CREATED', WORKER, {
      documentId: missionId,
      observation: { question, findings, method: 'evidence-native script production, block 40-60' },
      upstreamEventId: upstreamId || null,
    }, emitOpts(upstreamId || null, logicalId));
    console.log('OBS ' + res.eventId + ' :: ' + question.slice(0, 60));
    return res;
  }

  const obs1 = await emitObs(
    'script draft from the surviving thesis: 5 parts, 23 atomic claims, headline parameterized',
    ['BLOCK-40-60-SCRIPT.md: spoken draft, technical-credibility register',
     'part 1: default overridable (C2: T2/T3 + docs) [CL-01..CL-04, CL-20]',
     'part 2: superuser bypass vs our own doc over-claim (C6: T9b; K2 anchor) [CL-05..CL-07]',
     'part 3: REVOKE is the real boundary for non-superusers; superuser limit stated; production non-claim explicit [CL-08..CL-11, CL-21, CL-23]',
     'part 4: temp-table DDL/DML precision (C3, K1) + read-only-narrower-than-it-sounds (C5) [CL-12..CL-15, CL-22]',
     'part 5: honest close — the five non-verifications (U1..U5) + queued next mission (triggers on disposable PG) [CL-16..CL-19]',
     'headline slot: [NOLAN\'S PICK — H1/H2/H3]; script is headline-agnostic'],
    null, 'mkos-b4060:obs:script');
  const obs2 = await emitObs(
    'separate accuracy pass: every script sentence vs evidence map (inclusion) and N1-N7 (exclusion)',
    ['all 23 ledger claims checked against the 11-entry evidence map: all resolve',
     'exclusion check: no sentence asserts anything in N1-N7 as verified fact',
     '1 NARROW: "the way a lot of teams do" cut to "We sealed our journal with ALTER ROLE ..." (unevidenced generalization about others)',
     'near-miss caught in drafting: "the app never issues SET" entered only in the attributed, narrowed CL-07 form with U1 stated as unverified in the same paragraph'],
    obs1.eventId, 'mkos-b4060:obs:accuracy');
  const obs3 = await emitObs(
    'overclaim pass + hostile L6 review',
    ['flagged words (solves/guarantees/proves/always/never/production-ready/deterministic/secure/autonomous/self-healing/exactly-once/zero-downtime/fault-tolerant/verified/canonical): zero hits beyond supported uses (verified/never in true senses)',
     'L6 STRONGEST OBJECTION: footgun nobody fires + rediscovering the manual',
     'L6 WHERE RIGHT: contribution = demonstrated contrast + self-correction, never novel prescription; production non-claim prominent (A-F2)',
     'L6 WHERE EVIDENCE DIFFERS: "nobody fires it" is unevidenced; our own doc fired the conceptual version; K1 shows a secondary source got temp-tables wrong; the reproducible matrix is the product',
     'L6 REMAINING UNCERTAINTY: U1 (deployment-convergence lane), PG17 parity (docs-indicated, untrialed), audience (D-F3, mitigated by method framing)',
     'L6 narrowing: 4 narrowings confirmed in the draft (no change needed)'],
    obs2.eventId, 'mkos-b4060:obs:overclaim-l6');

  async function emitClaim(text, subject, verdict, logicalId) {
    const rec = attachClaimVerdict({
      text, subject,
      synthesis_tag: 'VERIFIED',
      evidence: {
        observation_event_ids: [obs1.eventId, obs2.eventId, obs3.eventId],
        method: 'separate accuracy/overclaim/L6 passes per block 40-60 method; workspace commit 692134e',
      },
    }, verdict);
    const res = await eventRuntime.emit('CLAIM_CREATED', WORKER, {
      documentId: missionId, claim: rec, upstreamEventId: obs3.eventId,
    }, emitOpts(obs3.eventId, logicalId));
    console.log(`CLAIM ${verdict} ${res.eventId} :: ${subject}`);
    return res;
  }

  const claims = [];
  claims.push(await emitClaim('The script is evidence-bounded: CONFIRMED. Every spoken sentence resolves to the 11-entry evidence map; the separate accuracy pass cut or narrowed exactly 1 sentence (the "a lot of teams" generalization). No sentence asserts anything in N1-N7 as verified fact.',
    'script evidence-bounded: CONFIRMED', 'CONFIRMED', 'mkos-b4060:claim:bounded'));
  claims.push(await emitClaim('The overclaim pass is clean: CONFIRMED. Zero flagged words (solves/guarantees/proves/always/never/production-ready/deterministic/secure/autonomous/self-healing/exactly-once/zero-downtime/fault-tolerant/verified/canonical) beyond supported uses: "verified"/"never" appear only in true senses.',
    'overclaim pass clean: CONFIRMED', 'CONFIRMED', 'mkos-b4060:claim:overclaim'));
  claims.push(await emitClaim('The L6 review is pre-answered: CONFIRMED. The strongest objection (footgun nobody fires + rediscovering the manual) was run against the draft; where it is right the draft already carries the non-claim and the contrast-not-prescription framing; where evidence differs is recorded; remaining uncertainty is U1 + PG17 parity + audience.',
    'L6 pre-answered: CONFIRMED', 'CONFIRMED', 'mkos-b4060:claim:l6'));
  claims.push(await emitClaim('U2 trigger-testing was NOT run in this block: CONFIRMED. Per the block constraint; recorded as the next research mission (disposable PG only; Oracle write attempts out of scope).',
    'U2 not run this block: CONFIRMED', 'CONFIRMED', 'mkos-b4060:claim:u2'));
  claims.push(await emitClaim('Headline remains parameterized: CONFIRMED. H1/H2/H3 scored in 20-40; Nolan\'s pick pending; the script slots it on his word only and never invents a stronger headline than the evidence map supports.',
    'headline parameterized: CONFIRMED', 'CONFIRMED', 'mkos-b4060:claim:headline'));

  // --- Knowledge nodes/edges (script production trail) ---
  const ns = 'marketingos::block40-60';
  const prefix = `mkos-${missionId.slice(0, 8)}-b4060`;
  async function putNode(slug, nodeType, label, data, confidence) {
    const nid = `${prefix}-${slug}`;
    await pool.query(
      `INSERT INTO knowledge_nodes (node_id, node_type, label, data, source_event_id, namespace, confidence, status, correlation_id, confidence_provenance)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,'verified',$8,'script-production')
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

  const nScript = await putNode('script', 'finding', 'SCRIPT DRAFT: 5 parts from the surviving thesis; headline parameterized (H1/H2/H3)',
    { detail: 'BLOCK-40-60-SCRIPT.md, workspace commit 692134e. Parts: (1) default overridable; (2) superuser bypass vs our doc; (3) REVOKE for non-superusers + scope limit + production non-claim; (4) temp-table precision + read-only-narrower beats; (5) honest close U1-U5 + next mission.', evidence_event_id: obs1.eventId }, 1.0);
  const nLedger = await putNode('ledger', 'finding', 'CLAIM LEDGER: 23 atomic claims CL-01..CL-23, all 13 fields, machine-readable',
    { detail: 'claim-ledger-40-60.json. Types: trial_result x12, docs_sourced x2, inspection, synthesis, contradiction record, caveat, non_verification x2, plan pointer, thesis/scope/explanatory syntheses. All verdicts CONFIRMED (non-verifications confirm "we did not verify X").', evidence_event_id: obs1.eventId }, 1.0);
  const nAccuracy = await putNode('accuracy', 'finding', 'ACCURACY PASS: 1 narrow ("a lot of teams" cut); near-miss CL-07 caught in drafting',
    { detail: 'Every script sentence checked vs evidence map (inclusion) and N1-N7 (exclusion). The "app never issues SET" near-miss entered only in the attributed, narrowed CL-07 form with U1 unverified in the same paragraph.', evidence_event_id: obs2.eventId }, 1.0);
  const nOverclaim = await putNode('overclaim', 'finding', 'OVERCLAIM PASS: clean; flagged words only in true senses',
    { detail: 'Scanned: solves/guarantees/proves/always/never/production-ready/deterministic/secure/autonomous/self-healing/exactly-once/zero-downtime/fault-tolerant/verified/canonical. Zero hits beyond supported uses.', evidence_event_id: obs3.eventId }, 1.0);
  const nL6 = await putNode('l6', 'finding', 'L6 HOSTILE REVIEW: strongest objection pre-answered; 4 narrowings confirmed; remaining uncertainty U1 + PG17 + audience',
    { detail: 'Objection: footgun nobody fires + rediscovering the manual. Right where: contribution is contrast + self-correction, never prescription; production non-claim prominent. Evidence differs where: our own doc fired the conceptual footgun; K1 shows a secondary source got temp-tables wrong.', evidence_event_id: obs3.eventId }, 0.9);
  const nLearning = await putNode('learning', 'learning', 'LEARNING: the ledger-before-pass order catches near-misses while drafting',
    { detail: 'Building the ledger (with MAXIMUM DEFENSIBLE WORDING per claim) BEFORE the accuracy pass caught the CL-07 near-miss during drafting rather than after. Method that worked: script -> ledger with max-defensible wording -> accuracy vs inclusion/exclusion -> overclaim scan -> L6. Keep this order for the video compiler block.', evidence_event_id: claims[2].eventId }, 0.9);

  const claimNodes = [nScript, nLedger, nAccuracy, nOverclaim, nL6];
  const claimEvs = [claims[0].eventId, claims[0].eventId, claims[1].eventId, claims[1].eventId, claims[2].eventId];
  for (let i = 0; i < claimNodes.length; i++) {
    await pool.query(`UPDATE knowledge_nodes SET source_event_id = $2 WHERE node_id = $1`, [claimNodes[i], claimEvs[i]]);
  }

  await putEdge('ledger-supports', nLedger, nScript, 'supports', {});
  await putEdge('accuracy-bounds', nAccuracy, nScript, 'bounds', {});
  await putEdge('overclaim-clears', nOverclaim, nScript, 'clears', {});
  await putEdge('l6-attacks', nL6, nScript, 'attacks', { outcome: 'pre-answered; 4 narrowings confirmed' });
  await putEdge('script-learning', nScript, nLearning, 'supports', {});
  console.log('KNOWLEDGE nodes=6 edges=5');

  // --- assign -> start -> complete (I2 lesson: read the row back) ---
  await missionRuntime.assign(missionId, WORKER);
  await missionRuntime.start(missionId);
  const result = {
    verdict: 'SUPPORTED',
    metrics_observed: {
      script_parts: 5,
      ledger_claims: 23,
      accuracy_cuts_or_narrows: 1,
      overclaim_flagged_words: 0,
      l6_narrowings_confirmed: 4,
      headline: 'PARAMETERIZED',
      u2_trigger_testing: 'NOT_RUN_THIS_BLOCK',
    },
    notes: 'Evidence-native script produced: BLOCK-40-60-SCRIPT.md + claim-ledger-40-60.json + BLOCK-40-60-REPORT.md (workspace commit 692134e). Headline pick (H1/H2/H3) and distribution decisions stop at Nolan\'s boundary. Ready for 60-80 video compiler path: transcript recheck can verify each spoken line against the ledger\'s PUBLIC WORDING -> MAXIMUM DEFENSIBLE WORDING chain.',
  };
  await missionRuntime.complete(missionId, result);
  console.log('MISSION_COMPLETED id=' + missionId);

  fs.writeFileSync('/tmp/mkos-b4060-mission-id', missionId + '\n');

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
  () => { console.log('DRIVER_D_DONE'); process.exit(0); },
  (err) => { console.error('DRIVER_D_FAILED', err && err.message); process.exit(1); }
);
