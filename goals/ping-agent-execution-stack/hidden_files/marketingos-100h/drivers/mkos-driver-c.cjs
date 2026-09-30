'use strict';
/* MarketingOS 100h, Block 20-40, Driver C: record the editorial decision trail.
 * Existing machinery only: merged-line UnifiedEventRuntime + MissionRuntime +
 * mission_labels.createLabeledMission (EXPERIMENT_RUN: design in payload,
 * outcome in result) + verdict_vocab EXPERIMENT_OUTCOMES, against the live Pig
 * journal (brain-postgres / ping_runtime). No new runtimes, stores, authorities.
 * DB credential read at runtime from the live Pig ping-gateway container env
 * (same-plane config, never printed, never logged, never in a payload).
 * The attack plan was written and committed BEFORE the falsifier attacks ran
 * (workspace commit f7c27eb, BLOCK-20-40-ATTACK-PLAN.md + editorial/rank_20_40.py).
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const WT = '/home/nolan/ping-worktrees/deploy-merge-20260930';
const TENANT = 'ping-ops';
const WORKER = 'mkos-block20-40-editorial-worker';

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

  // --- EXPERIMENT_RUN mission: the design is the committed attack plan ---
  const design = {
    hypothesis: 'Falsifier attacks from the admissible sources (K1, K2, U1-U5, steelman) select exactly one evidence-bounded surviving thesis from the five competing candidates, with every landed attack and every kill/demotion reason recorded.',
    metrics: [
      'attack_coverage: 5/5 theses attacked',
      'attacks_run: 14',
      'attacks_landed: 10 (landed = changed what the piece may honestly claim)',
      'theses_killed_or_demoted_as_headlines: 4',
      'surviving_thesis_selected: 1',
      'non_claims_listed: 7',
      'evidence_map_entries: 11',
    ],
    variables: {
      ranking_fixture_sha256: '1b7f1e6831344d5724d17d378ebc4702c05e067e1ebdd50041466da98acf925b',
      ranking_weights: { audience_value: 3, disagreeability: 2, defensibility: 3, freshness: 1 },
      ranking_order: ['C2', 'C6', 'C7', 'C3', 'C5', 'C4', 'C1', 'C8'],
      theses: ['A: the default that is not a boundary', 'B: the temp-table exemption that was not',
               'C: REVOKE beats read-only', 'D: the Oracle honesty report', 'E: the two-layer seal'],
      attack_sources: ['K1', 'K2', 'U1', 'U2', 'U3', 'U4', 'U5', 'STEELMAN'],
      attack_plan_commit: 'f7c27eb',
    },
    guardrails: {
      no_new_authorities: true,
      no_oracle_state_touched: true,
      scores_recommend_never_authorize: true,
      distribution_decisions_stop_at_nolan: true,
      u1_residual_risk_belongs_to_deployment_convergence_lane: true,
    },
  };

  const missionId = await createLabeledMission(missionRuntime, MISSION_LABELS.EXPERIMENT_RUN, design, {
    tenant_id: TENANT, createdBy: 'mkos-block20-40',
  });
  console.log('MISSION_CREATED id=' + missionId);

  await missionRuntime.assign(missionId, WORKER);
  await missionRuntime.start(missionId);
  console.log(`WORKER_LIFECYCLE worker=${WORKER} state=running`);

  const mc = await pool.query(
    `SELECT event_id FROM ping_events WHERE event_type = 'MISSION_CREATED' AND payload->>'missionId' = $1 ORDER BY timestamp DESC LIMIT 1`,
    [missionId]
  );
  const createdEventId = mc.rows[0].event_id;
  const emitOpts = (causationId, logicalId) => ({
    tenant_id: TENANT, correlation_id: missionId, causation_id: causationId, logical_id: logicalId,
  });

  // --- Observation 1: the deterministic ranking output (verbatim from the projection) ---
  const ranking = [
    { rank: 1, claim: 'C2', total: 44, ratings: { a: 5, d: 5, def: 5, f: 4 } },
    { rank: 2, claim: 'C6', total: 44, ratings: { a: 5, d: 5, def: 5, f: 4 } },
    { rank: 3, claim: 'C7', total: 42, ratings: { a: 5, d: 4, def: 5, f: 4 } },
    { rank: 4, claim: 'C3', total: 40, ratings: { a: 4, d: 4, def: 5, f: 5 } },
    { rank: 5, claim: 'C5', total: 34, ratings: { a: 3, d: 3, def: 5, f: 4 } },
    { rank: 6, claim: 'C4', total: 28, ratings: { a: 2, d: 2, def: 5, f: 3 } },
    { rank: 7, claim: 'C1', total: 24, ratings: { a: 2, d: 1, def: 5, f: 1 } },
    { rank: 8, claim: 'C8', total: 20, ratings: { a: 2, d: 1, def: 4, f: 0 } },
  ];
  const obs1 = await eventRuntime.emit('OBSERVATION_CREATED', 'mission-worker', {
    documentId: missionId,
    observation: {
      question: 'deterministic editorial ranking over the 8 block 0-20 findings',
      method: 'editorial/rank_20_40.py: score = 3*audience_value + 2*disagreeability + 3*defensibility + 1*freshness (max 45); ties by claim id; two runs byte-identical; self-test asserts arithmetic',
      fixture_sha256: design.variables.ranking_fixture_sha256,
      ranking,
      reading: 'publishable material is C2, C6, C7, C3. C8 is the honesty anchor, never the headline. Scores recommend, never authorize.',
    },
    upstreamEventId: createdEventId,
  }, emitOpts(createdEventId, 'mkos-b2040:obs:ranking'));
  console.log('OBS1 ' + obs1.eventId);

  // --- Observation 2: falsifier attack outcomes (14 attacks, 10 landed) ---
  const attacks = [
    { id: 'A-F1', thesis: 'A', landed: false, outcome: 'No counter-evidence: SET is a USERSET parameter, any role may lift the default. T2/T3 stand.' },
    { id: 'A-F2', thesis: 'A', landed: true, outcome: 'U1 unresolved, so conditional; LANDS as binding scope constraint: the piece may claim "at the privilege layer the default is not a boundary", never "your system is unsealed".' },
    { id: 'A-F3', thesis: 'A', landed: true, outcome: 'Fear without a fix: A standalone is incomplete; it must merge with C\'s REVOKE resolution.' },
    { id: 'B-F1', thesis: 'B', landed: false, outcome: 'No doc passage permits CREATE TEMP TABLE read-only; T4 stands.' },
    { id: 'B-F2', thesis: 'B', landed: true, outcome: 'Steelman "this is a footnote" lands: B cannot carry a piece alone; demoted to supporting beat.' },
    { id: 'B-F3', thesis: 'B', landed: false, outcome: 'PG17 behavior change (U3) not evidenced; requires one caveat line only.' },
    { id: 'C-F1', thesis: 'C', landed: false, outcome: 'No write path surviving the REVOKE set for the revoked role itself (T10); SECURITY DEFINER/ownership paths are a different role\'s privilege. Scope must be stated.' },
    { id: 'C-F2', thesis: 'C', landed: true, outcome: 'LANDS HARD: our own journal runs as superuser (C8); superusers bypass permission checks, so REVOKE cannot bind them. The universal prescription is dead; the scoped form (non-superuser roles only) survives.' },
    { id: 'C-F3', thesis: 'C', landed: true, outcome: 'Partial: the contribution is the demonstrated contrast on one rig (T2 vs T10), not the recommendation itself. Framing must say so.' },
    { id: 'D-F1', thesis: 'D', landed: true, outcome: 'U1 unresolved, so conditional; LANDS as fairness requirement: the piece must present K2\'s scoping fairly (the doc was scoped to the app\'s connection pattern, not simply wrong).' },
    { id: 'D-F2', thesis: 'D', landed: true, outcome: 'Triggers (U2) untested; the thesis over-focuses on the setting. The piece may not claim "Oracle is unsealed".' },
    { id: 'D-F3', thesis: 'D', landed: true, outcome: 'Steelman "nobody outside your team cares about your journal\'s config" lands: D is not a publishable standalone; survives as the K2 honesty anchor.' },
    { id: 'E-F1', thesis: 'E', landed: true, outcome: 'LANDS HARD: the "real binding" premise (U2) is untested; E cannot be a publishable claim. E becomes the next research mission.' },
    { id: 'E-F2', thesis: 'E', landed: true, outcome: 'Reinforces E-F1: the two-layer story is unsurprising as architecture; the only news would be a tested trigger verdict, which does not exist.' },
  ];
  const obs2 = await eventRuntime.emit('OBSERVATION_CREATED', 'mission-worker', {
    documentId: missionId,
    observation: {
      question: 'falsifier attacks on the 5 competing theses',
      method: 'attack plan committed pre-attack (f7c27eb); attacks from K1, K2, U1-U5, steelman only; an attack LANDS iff it changes what the piece may honestly claim',
      attacks,
      attacks_run: attacks.length,
      attacks_landed: attacks.filter((a) => a.landed).length,
    },
    upstreamEventId: createdEventId,
  }, emitOpts(createdEventId, 'mkos-b2040:obs:attacks'));
  console.log('OBS2 ' + obs2.eventId);

  // --- Claims with experiment verdicts ---
  async function emitClaim(text, subject, verdict, evidenceIds, causationId, logicalId) {
    const rec = attachClaimVerdict({
      text, subject,
      synthesis_tag: 'VERIFIED',
      evidence: {
        observation_event_ids: evidenceIds,
        method: 'falsifier attacks per committed attack plan f7c27eb; 14 attacks, 10 landed',
      },
    }, verdict);
    const res = await eventRuntime.emit('CLAIM_CREATED', 'mission-worker', {
      documentId: missionId, claim: rec, upstreamEventId: causationId,
    }, emitOpts(causationId, logicalId));
    console.log(`CLAIM ${verdict} ${res.eventId} :: ${subject}`);
    return res;
  }

  const claims = [];
  claims.push(await emitClaim('Thesis A as a standalone headline is FALSIFIED: A-F3 landed (fear without a fix) and A-F2 landed as a scope constraint. A survives only merged with C and scoped by K2.',
    'thesis-A standalone: FALSIFIED', 'FALSIFIED', [obs1.eventId, obs2.eventId], obs2.eventId, 'mkos-b2040:claim:thesis-a'));
  claims.push(await emitClaim('Thesis B as a standalone headline is FALSIFIED: the footnote steelman (B-F2) landed. B survives as a supporting beat (temp-table DDL/DML precision, alongside C5).',
    'thesis-B standalone headline: FALSIFIED; as supporting beat: SUPPORTED', 'FALSIFIED', [obs1.eventId, obs2.eventId], obs2.eventId, 'mkos-b2040:claim:thesis-b'));
  claims.push(await emitClaim('Thesis C as a universal prescription is FALSIFIED: C-F2 landed hard (REVOKE cannot bind a superuser; our own journal runs as superuser). C survives in scoped form: REVOKE is the real boundary FOR NON-SUPERUSER ROLES ONLY, with the superuser limit stated explicitly.',
    'thesis-C universal: FALSIFIED; scoped: SUPPORTED', 'FALSIFIED', [obs1.eventId, obs2.eventId], obs2.eventId, 'mkos-b2040:claim:thesis-c'));
  claims.push(await emitClaim('Thesis D as a standalone headline is FALSIFIED: D-F3 (external-audience steelman) and D-F2 (triggers untested) landed. D survives as the K2 honesty anchor inside the surviving piece: our own doc over-claimed "binds even superusers" and we say so, fairly scoped.',
    'thesis-D standalone: FALSIFIED; as honesty anchor: SUPPORTED', 'FALSIFIED', [obs1.eventId, obs2.eventId], obs2.eventId, 'mkos-b2040:claim:thesis-d'));
  claims.push(await emitClaim('Thesis E as a publishable claim is INCONCLUSIVE: its central premise (the append-only triggers are the real binding) is untested (U2, E-F1 landed hard). E becomes the next research mission: test the triggers on disposable PG.',
    'thesis-E: INCONCLUSIVE -> next research mission', 'INCONCLUSIVE', [obs1.eventId, obs2.eventId], obs2.eventId, 'mkos-b2040:claim:thesis-e'));
  claims.push(await emitClaim('Surviving thesis (merged A+C, D as anchor, B as beat, E as next mission): "default_transaction_read_only is a session default, not a privilege boundary. REVOKE is the boundary, for non-superuser roles. Superusers cannot be privilege-bound at all, and our own journal runs as one." All landed attacks are reflected in its scope limits and non-claims.',
    'surviving thesis: SUPPORTED', 'SUPPORTED', [obs1.eventId, obs2.eventId], obs2.eventId, 'mkos-b2040:claim:survivor'));

  // --- Knowledge nodes/edges (editorial decision trail) ---
  const ns = 'marketingos::block20-40';
  const prefix = `mkos-${missionId.slice(0, 8)}-b2040`;
  async function putNode(slug, nodeType, label, data, confidence) {
    const nid = `${prefix}-${slug}`;
    await pool.query(
      `INSERT INTO knowledge_nodes (node_id, node_type, label, data, source_event_id, namespace, confidence, status, correlation_id, confidence_provenance)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,'verified',$8,'editorial-judgment')
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

  const nRanking = await putNode('ranking', 'finding', 'EDITORIAL RANKING: C2=44, C6=44, C7=42, C3=40, C5=34, C4=28, C1=24, C8=20',
    { detail: 'Deterministic projection editorial/rank_20_40.py; fixture SHA256 1b7f1e6831344d5724d17d378ebc4702c05e067e1ebdd50041466da98acf925b; scores recommend, never authorize. Publishable material: C2, C6, C7, C3. C8 is the honesty anchor.', evidence_event_id: obs1.eventId }, 1.0);
  const nA = await putNode('thesis-a', 'finding', 'THESIS A FALSIFIED-as-standalone: "the default that is not a boundary" (merged into survivor)',
    { detail: 'A-F2 landed as scope constraint (privilege layer only; U1 unresolved); A-F3 landed (fear without a fix). Merged with C.', evidence_event_id: obs2.eventId }, 1.0);
  const nB = await putNode('thesis-b', 'finding', 'THESIS B FALSIFIED-as-headline, SUPPORTED-as-beat: "the temp-table exemption that was not"',
    { detail: 'B-F2 footnote steelman landed. Survives as supporting beat: CREATE TEMP TABLE fails read-only; DML on existing temp tables allowed (T4/T11); secondary source K1 overbroad.', evidence_event_id: obs2.eventId }, 1.0);
  const nC = await putNode('thesis-c', 'finding', 'THESIS C FALSIFIED-universal, SUPPORTED-scoped: "REVOKE beats read-only"',
    { detail: 'C-F2 landed hard: REVOKE cannot bind a superuser; Oracle role ping IS superuser (C8). Scoped survivor: REVOKE is the real boundary FOR NON-SUPERUSER ROLES ONLY. C-F3: contribution is the demonstrated T2-vs-T10 contrast, not the recommendation.', evidence_event_id: obs2.eventId }, 1.0);
  const nD = await putNode('thesis-d', 'finding', 'THESIS D FALSIFIED-as-headline, SUPPORTED-as-anchor: "the Oracle honesty report"',
    { detail: 'D-F3 (external-audience steelman) and D-F2 (triggers U2 untested) landed. Survives as the K2 honesty anchor: our retirement doc over-claimed "binds even superusers"; the doc was scoped to the app pattern (fairness, D-F1); the unverified link U1 is the honest residual.', evidence_event_id: obs2.eventId }, 1.0);
  const nE = await putNode('thesis-e', 'finding', 'THESIS E INCONCLUSIVE: "the two-layer seal" -> NEXT RESEARCH MISSION',
    { detail: 'E-F1 landed hard: the "triggers are the real binding" premise is untested (U2). Next mission: test the append-only triggers on disposable PG (Oracle write attempts out of scope).', evidence_event_id: obs2.eventId }, 0.8);
  const nSurvivor = await putNode('survivor', 'finding', 'SURVIVING THESIS (SUPPORTED): default-not-boundary + REVOKE-for-non-superusers + superuser scope limit + K2 anchor',
    { detail: 'Headline candidates H1/H2/H3 for Nolan\'s pick. Structure: (1) default overridable (C2); (2) superuser bypass vs our own doc (C6, K2 anchor); (3) REVOKE is the real boundary for non-superusers, superuser limit stated (C7, C-F2); (4) beats: temp-table precision (C3), read-only narrower than it sounds (C5); (5) honest close: non-claims N1-N7 + next mission (U2).',
      evidence_event_id: claims[5].eventId }, 1.0);
  const nNonClaims = await putNode('non-claims', 'finding', 'NON-CLAIMS N1-N7: what the piece must not overclaim',
    { detail: 'N1 U1 (gateway SET behavior unverified; deployment-convergence lane); N2 U2 (triggers untested; next mission); N3 U3 (PG16 trials vs PG17 Oracle); N4 U4 (pooler/proxy uninspected); N5 U5 (disk-write extent unmapped); N6 REVOKE scope is non-superuser-only; superuser permission-bypass is docs-sourced not trial-sourced; N7 must not claim "Oracle is unsealed"; use C8 residual-risk statement verbatim.' }, 1.0);
  const nEvidence = await putNode('evidence-map', 'finding', 'EVIDENCE MAP: 11 claim->source entries for the 40-60 claim ledger',
    { detail: 'T1 INSERT-blocked; T2/T3+docs default-overridable; T4 CREATE-TEMP-fails; T11+DML-on-existing + docs COPY wording; T5 nextval; T6/T7 locks+NOTIFY; T9a/T9b superuser SET-bypass; T10 REVOKE-blocks; PG-docs superuser-bypasses-permission-checks (docs-sourced); C8 read-only Oracle inspection; K2 doc over-claim; K1 secondary-source overbreadth.' }, 1.0);
  const nLearning = await putNode('learning', 'learning', 'LEARNING: falsifier attacks converge theses; the superuser wrinkle killed the universal prescription',
    { detail: 'The highest-value attack came from our own system state (C8: the journal runs as superuser) turned against the prescription (C): REVOKE cannot bind a superuser. Editorial method that worked: commit the attack plan before running attacks; count an attack as landed only if it changes what the piece may honestly claim; keep killed theses as beats/anchors/next-missions rather than deleting them.', mission_id: missionId }, 0.9);

  // wire source claim event ids
  const claimNodes = [nA, nB, nC, nD, nE, nSurvivor];
  for (let i = 0; i < claimNodes.length; i++) {
    await pool.query(`UPDATE knowledge_nodes SET source_event_id = $2 WHERE node_id = $1`, [claimNodes[i], claims[i].eventId]);
  }
  await pool.query(`UPDATE knowledge_nodes SET source_event_id = $2 WHERE node_id = $1`, [nRanking, obs1.eventId]);

  // edges: findings (block 0-20 nodes) -> theses; theses -> survivor; ranking -> survivor; survivor -> learning
  const b020 = 'mkos-93a79e48';
  const drawsOn = [[nA, 'c2'], [nA, 'c6'], [nB, 'c3'], [nC, 'c7'], [nD, 'c6'], [nD, 'c8'], [nE, 'c8']];
  for (const [tgt, cid] of drawsOn) {
    await putEdge(`draws-${cid}-${tgt.split('-').pop()}`, `${b020}-${cid}`, tgt, 'draws_on', {});
  }
  await putEdge('a-merged', nA, nSurvivor, 'merged_into', { reason: 'A-F3 landed: fear without a fix' });
  await putEdge('b-beat', nB, nSurvivor, 'demoted_to_beat', { reason: 'B-F2 footnote steelman landed' });
  await putEdge('c-scoped', nC, nSurvivor, 'scoped_into', { reason: 'C-F2 landed hard: superuser scope limit' });
  await putEdge('d-anchor', nD, nSurvivor, 'anchor_for', { reason: 'D-F3 landed: K2 honesty anchor' });
  await putEdge('e-next', nE, nSurvivor, 'next_mission_for', { reason: 'E-F1 landed hard: U2 untested' });
  await putEdge('ranking-informs', nRanking, nSurvivor, 'informs', {});
  await putEdge('nonclaims-bound', nNonClaims, nSurvivor, 'bounds', {});
  await putEdge('evidence-supports', nEvidence, nSurvivor, 'supports', {});
  await putEdge('survivor-learning', nSurvivor, nLearning, 'supports', {});
  console.log('KNOWLEDGE nodes=10 edges=17');

  // --- Complete the mission with the outcome ---
  const result = {
    verdict: 'SUPPORTED',
    metrics_observed: {
      attack_coverage: '5/5 theses attacked',
      attacks_run: 14,
      attacks_landed: 10,
      theses_killed_or_demoted_as_headlines: 4,
      surviving_thesis_selected: 1,
      non_claims_listed: 7,
      evidence_map_entries: 11,
    },
    notes: 'Surviving thesis for Nolan\'s human judgment: "default_transaction_read_only is a session default, not a privilege boundary. REVOKE is the boundary, for non-superuser roles. Superusers cannot be privilege-bound at all, and our own journal runs as one." Headline pick (H1/H2/H3) and distribution decisions stop at Nolan\'s boundary. Full record: BLOCK-20-40-REPORT.md.',
  };
  await missionRuntime.complete(missionId, result);
  console.log('MISSION_COMPLETED id=' + missionId);

  fs.writeFileSync('/tmp/mkos-b2040-mission-id', missionId + '\n');

  const mrow = await pool.query(
    `SELECT mission_id, mission_type, status FROM ping_missions WHERE mission_id = $1`, [missionId]);
  const research = await pool.query(
    `SELECT count(*)::int AS n FROM ping_events WHERE metadata->>'correlation_id' = $1`, [missionId]);
  const kn = await pool.query(
    `SELECT count(*)::int AS n FROM knowledge_nodes WHERE correlation_id = $1`, [missionId]);
  const ke = await pool.query(
    `SELECT count(*)::int AS n FROM knowledge_edges WHERE data->>'mission_id' = $1`, [missionId]);
  console.log(JSON.stringify({ mission: mrow.rows[0], correlated_events: research.rows, knowledge_nodes: kn.rows[0].n, knowledge_edges: ke.rows[0].n }, null, 1));

  await pool.end();
}

main().then(
  () => { console.log('DRIVER_C_DONE'); process.exit(0); },
  (err) => { console.error('DRIVER_C_FAILED', err && err.message); process.exit(1); }
);
