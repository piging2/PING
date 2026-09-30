'use strict';
/* MarketingOS 100h, Block 20-40, Driver C2: resume mission 0a04c41899fefb2a.
 * Driver C created the EXPERIMENT_RUN mission and recorded OBS1 (ranking) +
 * OBS2 (attack outcomes), then failed on attachClaimVerdict: that helper only
 * accepts CLAIM_VERDICTS (CONFIRMED | REFUTED | UNCLEAR). EXPERIMENT_OUTCOMES
 * (SUPPORTED | FALSIFIED | INCONCLUSIVE) belong to the mission RESULT's verdict
 * field, not to claim records. This driver records the thesis outcomes as
 * claim verdicts (REFUTED/CONFIRMED/UNCLEAR on the survival statements) and
 * completes the mission with result.verdict = SUPPORTED.
 * Same machinery, same constraints as driver C. No new anything.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const WT = '/home/nolan/ping-worktrees/deploy-merge-20260930';
const TENANT = 'ping-ops';
const MISSION_ID = '0a04c41899fefb2a'; // created by driver C (failed before claims)

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
  const { attachClaimVerdict } = require(path.join(WT, 'ping-runtime/evidence/verdict_vocab.js'));

  const eventRuntime = new UnifiedEventRuntime({ pool });
  await eventRuntime.initialize();
  const missionRuntime = new MissionRuntime({ pool, eventRuntime });
  await missionRuntime.initialize();
  console.log('INIT_OK resume mission=' + MISSION_ID);

  const mrow = await pool.query(
    `SELECT mission_id, mission_type, status FROM ping_missions WHERE mission_id = $1`, [MISSION_ID]);
  if (mrow.rows.length !== 1) throw new Error('mission not found');
  console.log('MISSION_STATE ' + JSON.stringify(mrow.rows[0]));

  const evq = await pool.query(
    `SELECT event_id, payload->'observation'->>'question' AS question FROM ping_events
     WHERE metadata->>'correlation_id' = $1 AND event_type = 'OBSERVATION_CREATED'
     ORDER BY timestamp`, [MISSION_ID]);
  const obs1row = evq.rows.find((r) => (r.question || '').startsWith('deterministic editorial ranking'));
  const obs2row = evq.rows.find((r) => (r.question || '').startsWith('falsifier attacks'));
  const obs1Id = obs1row && obs1row.event_id;
  const obs2Id = obs2row && obs2row.event_id;
  if (!obs1Id || !obs2Id) throw new Error('OBS1/OBS2 not found under mission');
  console.log('FOUND_OBS obs1=' + obs1Id.slice(0, 8) + ' obs2=' + obs2Id.slice(0, 8));

  const emitOpts = (causationId, logicalId) => ({
    tenant_id: TENANT, correlation_id: MISSION_ID, causation_id: causationId, logical_id: logicalId,
  });

  // --- Claims: thesis survival statements with CLAIM_VERDICTS ---
  async function emitClaim(text, subject, verdict, logicalId) {
    const rec = attachClaimVerdict({
      text, subject,
      synthesis_tag: verdict === 'UNCLEAR' ? 'UNKNOWN' : 'VERIFIED',
      evidence: {
        observation_event_ids: [obs1Id, obs2Id],
        method: 'falsifier attacks per committed attack plan f7c27eb; 14 attacks, 10 landed (landed = changed what the piece may honestly claim)',
      },
    }, verdict);
    const res = await eventRuntime.emit('CLAIM_CREATED', 'mission-worker', {
      documentId: MISSION_ID, claim: rec, upstreamEventId: obs2Id,
    }, emitOpts(obs2Id, logicalId));
    console.log(`CLAIM ${verdict} ${res.eventId} :: ${subject}`);
    return res;
  }

  const claims = [];
  claims.push(await emitClaim('Thesis A ("the default that is not a boundary") survives as a standalone headline: REFUTED. A-F3 landed (fear without a fix) and A-F2 landed as a scope constraint (privilege layer only while U1 is unresolved). A survives only merged with C and scoped by K2.',
    'thesis-A standalone headline: REFUTED; merged into survivor', 'REFUTED', 'mkos-b2040:claim:thesis-a'));
  claims.push(await emitClaim('Thesis B ("the temp-table exemption that was not") survives as a standalone headline: REFUTED (B-F2 footnote steelman landed). It survives as a supporting beat: CONFIRMED that CREATE TEMP TABLE fails read-only while DML on existing temp tables is allowed (T4/T11), and CONFIRMED that the secondary source overstated the exemption (K1).',
    'thesis-B headline: REFUTED; as supporting beat: CONFIRMED', 'REFUTED', 'mkos-b2040:claim:thesis-b'));
  claims.push(await emitClaim('Thesis C ("REVOKE beats read-only") survives as a universal prescription: REFUTED. C-F2 landed hard: REVOKE cannot bind a superuser (superusers bypass permission checks), and our own journal role ping IS a superuser (C8). It survives in scoped form: CONFIRMED that REVOKE INSERT/UPDATE/DELETE/TRUNCATE is a real boundary FOR NON-SUPERUSER ROLES ONLY (T10), with the superuser limit stated explicitly.',
    'thesis-C universal: REFUTED; scoped (non-superuser): CONFIRMED', 'REFUTED', 'mkos-b2040:claim:thesis-c'));
  claims.push(await emitClaim('Thesis D ("the Oracle honesty report") survives as a standalone headline: REFUTED (D-F3 external-audience steelman and D-F2 triggers-untested landed). It survives as the K2 honesty anchor: CONFIRMED that our retirement doc over-claimed "binds even superusers", fairly scoped to the app\'s connection pattern, with U1 as the honest residual.',
    'thesis-D headline: REFUTED; as honesty anchor: CONFIRMED', 'REFUTED', 'mkos-b2040:claim:thesis-d'));
  claims.push(await emitClaim('Thesis E ("the two-layer seal") is publishable now: UNCLEAR. Its central premise (the append-only triggers are the real binding) is untested (U2; E-F1 landed hard). E becomes the next research mission: test the triggers on disposable PG (Oracle write attempts out of scope).',
    'thesis-E publishable now: UNCLEAR -> next research mission', 'UNCLEAR', 'mkos-b2040:claim:thesis-e'));
  claims.push(await emitClaim('The surviving merged thesis is evidence-bounded: CONFIRMED. "default_transaction_read_only is a session default, not a privilege boundary. REVOKE is the boundary, for non-superuser roles. Superusers cannot be privilege-bound at all, and our own journal runs as one." Every landed attack is reflected in its scope limits and the seven non-claims N1-N7.',
    'surviving thesis: CONFIRMED', 'CONFIRMED', 'mkos-b2040:claim:survivor'));

  // --- Knowledge nodes/edges (editorial decision trail) ---
  const ns = 'marketingos::block20-40';
  const prefix = `mkos-${MISSION_ID.slice(0, 8)}-b2040`;
  async function putNode(slug, nodeType, label, data, confidence) {
    const nid = `${prefix}-${slug}`;
    await pool.query(
      `INSERT INTO knowledge_nodes (node_id, node_type, label, data, source_event_id, namespace, confidence, status, correlation_id, confidence_provenance)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,'verified',$8,'editorial-judgment')
       ON CONFLICT (node_id) DO NOTHING`,
      [nid, nodeType, label, JSON.stringify({ ...data, mission_id: MISSION_ID }), null, ns, confidence, MISSION_ID]
    );
    return nid;
  }
  async function putEdge(slug, sourceId, targetId, edgeType, data) {
    await pool.query(
      `INSERT INTO knowledge_edges (edge_id, source_id, target_id, edge_type, data)
       VALUES ($1,$2,$3,$4,$5::jsonb) ON CONFLICT (edge_id) DO NOTHING`,
      [`${prefix}-edge-${slug}`, sourceId, targetId, edgeType, JSON.stringify({ ...data, mission_id: MISSION_ID })]
    );
  }

  const nRanking = await putNode('ranking', 'finding', 'EDITORIAL RANKING: C2=44, C6=44, C7=42, C3=40, C5=34, C4=28, C1=24, C8=20',
    { detail: 'Deterministic projection editorial/rank_20_40.py; fixture SHA256 1b7f1e6831344d5724d17d378ebc4702c05e067e1ebdd50041466da98acf925b; scores recommend, never authorize. Publishable material: C2, C6, C7, C3. C8 is the honesty anchor.', evidence_event_id: obs1Id }, 1.0);
  const nA = await putNode('thesis-a', 'finding', 'THESIS A REFUTED-as-standalone: "the default that is not a boundary" (merged into survivor)',
    { detail: 'A-F2 landed as scope constraint (privilege layer only; U1 unresolved); A-F3 landed (fear without a fix). Merged with C.', evidence_event_id: obs2Id }, 1.0);
  const nB = await putNode('thesis-b', 'finding', 'THESIS B REFUTED-as-headline, CONFIRMED-as-beat: "the temp-table exemption that was not"',
    { detail: 'B-F2 footnote steelman landed. Survives as supporting beat: CREATE TEMP TABLE fails read-only; DML on existing temp tables allowed (T4/T11); secondary source K1 overbroad.', evidence_event_id: obs2Id }, 1.0);
  const nC = await putNode('thesis-c', 'finding', 'THESIS C REFUTED-universal, CONFIRMED-scoped: "REVOKE beats read-only"',
    { detail: 'C-F2 landed hard: REVOKE cannot bind a superuser; Oracle role ping IS superuser (C8). Scoped survivor: REVOKE is the real boundary FOR NON-SUPERUSER ROLES ONLY. C-F3: contribution is the demonstrated T2-vs-T10 contrast, not the recommendation.', evidence_event_id: obs2Id }, 1.0);
  const nD = await putNode('thesis-d', 'finding', 'THESIS D REFUTED-as-headline, CONFIRMED-as-anchor: "the Oracle honesty report"',
    { detail: 'D-F3 (external-audience steelman) and D-F2 (triggers U2 untested) landed. Survives as the K2 honesty anchor: our retirement doc over-claimed "binds even superusers"; the doc was scoped to the app pattern (fairness, D-F1); the unverified link U1 is the honest residual.', evidence_event_id: obs2Id }, 1.0);
  const nE = await putNode('thesis-e', 'finding', 'THESIS E UNCLEAR: "the two-layer seal" -> NEXT RESEARCH MISSION',
    { detail: 'E-F1 landed hard: the "triggers are the real binding" premise is untested (U2). Next mission: test the append-only triggers on disposable PG (Oracle write attempts out of scope).', evidence_event_id: obs2Id }, 0.8);
  const nSurvivor = await putNode('survivor', 'finding', 'SURVIVING THESIS (CONFIRMED): default-not-boundary + REVOKE-for-non-superusers + superuser scope limit + K2 anchor',
    { detail: 'Headline candidates H1/H2/H3 for Nolan\'s pick. Structure: (1) default overridable (C2); (2) superuser bypass vs our own doc (C6, K2 anchor); (3) REVOKE is the real boundary for non-superusers, superuser limit stated (C7, C-F2); (4) beats: temp-table precision (C3), read-only narrower than it sounds (C5); (5) honest close: non-claims N1-N7 + next mission (U2).',
      evidence_event_id: claims[5].eventId }, 1.0);
  const nNonClaims = await putNode('non-claims', 'finding', 'NON-CLAIMS N1-N7: what the piece must not overclaim',
    { detail: 'N1 U1 (gateway SET behavior unverified; deployment-convergence lane); N2 U2 (triggers untested; next mission); N3 U3 (PG16 trials vs PG17 Oracle); N4 U4 (pooler/proxy uninspected); N5 U5 (disk-write extent unmapped); N6 REVOKE scope is non-superuser-only; superuser permission-bypass is docs-sourced not trial-sourced; N7 must not claim "Oracle is unsealed"; use C8 residual-risk statement verbatim.' }, 1.0);
  const nEvidence = await putNode('evidence-map', 'finding', 'EVIDENCE MAP: 11 claim->source entries for the 40-60 claim ledger',
    { detail: 'T1 INSERT-blocked; T2/T3+docs default-overridable; T4 CREATE-TEMP-fails; T11+DML-on-existing + docs COPY wording; T5 nextval; T6/T7 locks+NOTIFY; T9a/T9b superuser SET-bypass; T10 REVOKE-blocks; PG-docs superuser-bypasses-permission-checks (docs-sourced); C8 read-only Oracle inspection; K2 doc over-claim; K1 secondary-source overbreadth.' }, 1.0);
  const nLearning = await putNode('learning', 'learning', 'LEARNING: falsifier attacks converge theses; the superuser wrinkle killed the universal prescription',
    { detail: 'The highest-value attack came from our own system state (C8: the journal runs as superuser) turned against the prescription (C): REVOKE cannot bind a superuser. Editorial method that worked: commit the attack plan before running attacks; count an attack as landed only if it changes what the piece may honestly claim; keep killed theses as beats/anchors/next-missions rather than deleting them.' }, 0.9);

  const claimNodes = [nA, nB, nC, nD, nE, nSurvivor];
  for (let i = 0; i < claimNodes.length; i++) {
    await pool.query(`UPDATE knowledge_nodes SET source_event_id = $2 WHERE node_id = $1`, [claimNodes[i], claims[i].eventId]);
  }
  await pool.query(`UPDATE knowledge_nodes SET source_event_id = $2 WHERE node_id = $1`, [nRanking, obs1Id]);

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

  // --- Complete the mission with the experiment outcome ---
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
  await missionRuntime.complete(MISSION_ID, result);
  console.log('MISSION_COMPLETED id=' + MISSION_ID);

  fs.writeFileSync('/tmp/mkos-b2040-mission-id', MISSION_ID + '\n');

  const mrow2 = await pool.query(
    `SELECT mission_id, mission_type, status FROM ping_missions WHERE mission_id = $1`, [MISSION_ID]);
  const research = await pool.query(
    `SELECT count(*)::int AS n FROM ping_events WHERE metadata->>'correlation_id' = $1`, [MISSION_ID]);
  const kn = await pool.query(
    `SELECT count(*)::int AS n FROM knowledge_nodes WHERE correlation_id = $1`, [MISSION_ID]);
  const ke = await pool.query(
    `SELECT count(*)::int AS n FROM knowledge_edges WHERE data->>'mission_id' = $1`, [MISSION_ID]);
  console.log(JSON.stringify({ mission: mrow2.rows[0], correlated_events: research.rows, knowledge_nodes: kn.rows[0].n, knowledge_edges: ke.rows[0].n }, null, 1));

  await pool.end();
}

main().then(
  () => { console.log('DRIVER_C2_DONE'); process.exit(0); },
  (err) => { console.error('DRIVER_C2_FAILED', err && err.message); process.exit(1); }
);
