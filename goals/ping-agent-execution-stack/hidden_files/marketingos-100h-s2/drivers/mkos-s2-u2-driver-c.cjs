'use strict';
/* MarketingOS 100h, Sprint 2, Block 0-15, Driver U2-C: correction run.
 * Driver B's trial matrix ran clean (7 trials, disposable DB dropped and
 * verified), but its verdict predicates were wrong for two trials: the
 * trial() helper returned "OK: undefined undefined" for successful
 * multi-statement queries (pg returns an array of results; command/rowCount
 * are undefined on the array), so the predicates that expected the strings
 * "OK: UPDATE 1" and "OK: DROP TRIGGER" mis-verdict U2-C5 and U2-C6 as
 * REFUTED even though both trials succeeded (post-trial state proves it:
 * row body = "bypassed"; the row trigger is gone from pg_trigger).
 * This driver does NOT re-run trials. It reads the recorded trial
 * observation back from the journal, emits a correction observation +
 * corrected claims (CONFIRMED) for U2-C5/U2-C6, re-points the two knowledge
 * nodes at the corrected claims, completes the mission, and reads the row back.
 * Existing machinery only: merged-line UnifiedEventRuntime + MissionRuntime +
 * verdict_vocab.attachClaimVerdict against the live Pig journal. No new
 * runtimes, stores, authorities. No Oracle contact.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const WT = '/home/nolan/ping-worktrees/deploy-merge-20260930';
const TENANT = 'ping-ops';
const WORKER = 'mkos-s2-u2-research-worker';
const DISP_DB = 'mkos_u2_disposable';
const NS = 'marketingos::s2-block0-15';
const MISSION_ID = fs.readFileSync('/tmp/mkos-s2-u2-mission-id', 'utf8').trim();

function dbPassword() {
  const env = execSync(
    `docker inspect ping-gateway --format '{{range .Config.Env}}{{println .}}{{end}}'`,
    { encoding: 'utf8' }
  );
  const NL = String.fromCharCode(10);
  const line = env.split(NL).find((l) => l.startsWith('POSTGRES_PASSWORD='));
  if (!line) throw new Error('POSTGRES_PASSWORD not found in ping-gateway container env');
  return line.slice('POSTGRES_PASSWORD='.length).trim();
}

async function main() {
  const { Pool } = require('/tmp/writer-m/node_modules/pg');
  const jpool = new Pool({
    host: '127.0.0.1', port: 5432, user: 'postgres',
    password: dbPassword(), database: 'ping_runtime',
  });

  const { UnifiedEventRuntime } = require(path.join(WT, 'ping-runtime/events/unified_event_runtime.js'));
  const { MissionRuntime } = require(path.join(WT, 'ping-runtime/orchestration/mission_runtime.js'));
  const { attachClaimVerdict } = require(path.join(WT, 'ping-runtime/evidence/verdict_vocab.js'));

  const eventRuntime = new UnifiedEventRuntime({ pool: jpool });
  await eventRuntime.initialize();
  const missionRuntime = new MissionRuntime({ pool: jpool, eventRuntime });
  await missionRuntime.initialize();
  console.log('INIT_OK mission=' + MISSION_ID);

  // --- Read the recorded trial-matrix observation back (the trials themselves are not re-run) ---
  const robs = await jpool.query(
    `SELECT event_id, payload FROM ping_events
     WHERE event_type = 'OBSERVATION_CREATED'
       AND metadata->>'correlation_id' = $1
       AND payload->'observation'->>'question' LIKE 'U2: do the append-only triggers actually bind?%'
     ORDER BY timestamp DESC LIMIT 1`, [MISSION_ID]);
  if (robs.rows.length !== 1) throw new Error('trial-matrix observation not found');
  const obs1Id = robs.rows[0].event_id;
  const obs1 = robs.rows[0].payload.observation;
  const byId = {};
  for (const t of obs1.trials) byId[t.id] = t;
  const t5 = byId['T-C5'], t6 = byId['T-C6'];
  console.log('READBACK T-C5 :: ' + t5.result);
  console.log('READBACK T-C6 :: ' + t6.result);
  console.log('READBACK post_trial_state :: ' + JSON.stringify(obs1.post_trial_state));

  // Correction predicates (the corrected driver-B predicates, applied to recorded data).
  const c5ok = t5.result.indexOf('OK:') === 0 && obs1.post_trial_state.row_body === 'bypassed';
  const c6ok = t6.result.indexOf('OK:') === 0 &&
    obs1.post_trial_state.triggers_remaining.indexOf('trg_ping_events_append_only') === -1;
  if (!c5ok || !c6ok) throw new Error('correction predicates failed on recorded data');
  console.log('CORRECTION_PREDICATES c5=' + c5ok + ' c6=' + c6ok);

  const mc = await jpool.query(
    `SELECT event_id FROM ping_events WHERE event_type = 'MISSION_CREATED' AND payload->>'missionId' = $1 ORDER BY timestamp DESC LIMIT 1`,
    [MISSION_ID]
  );
  const createdEventId = mc.rows[0].event_id;
  const emitOpts = (causationId, logicalId) => ({
    tenant_id: TENANT, correlation_id: MISSION_ID, causation_id: causationId, logical_id: logicalId,
  });

  // --- Correction observation ---
  const obsC = await eventRuntime.emit('OBSERVATION_CREATED', WORKER, {
    documentId: MISSION_ID,
    observation: {
      question: 'U2-C5 / U2-C6 verdict correction (driver bug, not a trial failure)',
      driver_bug: 'Driver B trial() built its success string as "OK: " + r.command + " " + r.rowCount. For multi-statement queries pg returns an ARRAY of result objects, so command/rowCount are undefined and the recorded result reads "OK: undefined undefined". The U2-C5/U2-C6 verdict predicates searched for "OK: UPDATE 1" / "OK: DROP TRIGGER" and mis-verdict both trials as REFUTED although both succeeded.',
      evidence_the_trials_succeeded: {
        'T-C5': 'result starts with "OK:"; post-trial SELECT shows body = "bypassed" (the UPDATE landed while session_replication_role=replica, row trigger silent)',
        'T-C6': 'result starts with "OK:"; post-trial pg_trigger lists only trg_ping_events_append_only_truncate (the row trigger was dropped)',
      },
      corrected_verdicts: { 'U2-C5': 'CONFIRMED', 'U2-C6': 'CONFIRMED' },
      supersedes: 'the two REFUTED claim events emitted by driver B for U2-C5 and U2-C6 (kept as history; not deleted)',
      driver_b_patched: 'mkos-s2-u2-driver-b.cjs fixed in the s2 drivers directory: trial() now formats multi-statement results; predicates use startsWith("OK:"). The patch is NOT re-run against the journal (that would duplicate the trial record).',
    },
    upstreamEventId: createdEventId,
  }, emitOpts(createdEventId, 'mkos-s2-u2:obs:correction'));
  console.log('OBS_CORRECTION ' + obsC.eventId);

  // --- Corrected claims ---
  async function emitClaim(text, subject, verdict, logicalId) {
    const rec = attachClaimVerdict({
      text, subject,
      synthesis_tag: 'VERIFIED',
      evidence: {
        observation_event_ids: [obs1Id, obsC.eventId],
        method: 'correction of driver-B verdict predicates against the recorded trial matrix; no new trials',
      },
    }, verdict);
    const res = await eventRuntime.emit('CLAIM_CREATED', WORKER, {
      documentId: MISSION_ID, claim: rec, upstreamEventId: obsC.eventId,
    }, emitOpts(obsC.eventId, logicalId));
    console.log(`CLAIM ${verdict} ${res.eventId} :: ${subject}`);
    return res;
  }
  const claimC5 = await emitClaim(
    'U2-C5 CORRECTED: a superuser CAN bypass via SET session_replication_role = replica (triggers do not fire). Recorded T-C5: OK; row body after = "bypassed". Supersedes the driver-B REFUTED claim for U2-C5.',
    'U2-C5: superuser bypass CONFIRMED (correction)', 'CONFIRMED', 'mkos-s2-u2:claim:u2-c5-corrected');
  const claimC6 = await emitClaim(
    'U2-C6 CORRECTED: the table owner (non-superuser) CAN DROP TRIGGER on its own table. Recorded T-C6: OK; pg_trigger after lists only the truncate trigger. Supersedes the driver-B REFUTED claim for U2-C6.',
    'U2-C6: owner DROP TRIGGER CONFIRMED (correction)', 'CONFIRMED', 'mkos-s2-u2:claim:u2-c6-corrected');

  // --- Re-point the two knowledge nodes at the corrected claims ---
  const prefix = `mkos-${MISSION_ID.slice(0, 8)}-u2`;
  await jpool.query(`UPDATE knowledge_nodes SET source_event_id = $2 WHERE node_id = $1`, [`${prefix}-u2-c5`, claimC5.eventId]);
  await jpool.query(`UPDATE knowledge_nodes SET source_event_id = $2 WHERE node_id = $1`, [`${prefix}-u2-c6`, claimC6.eventId]);
  console.log('KNOWLEDGE_NODES_REPOINTED u2-c5 u2-c6');

  // --- Complete (mission is running; assign/start are harmless no-ops) ---
  const result = {
    verdict: 'SCOPED',
    thesis_e: 'SCOPED: the triggers bind non-owner, non-superuser roles exactly; superuser bypass (U2-C5) and owner drop (U2-C6) are CONFIRMED.',
    metrics_observed: {
      trials_run: 7,
      confirmed: 7, refuted: 0, unclear: 0,
      triggers_recreated_verbatim: 2,
      disposable_db_dropped_verified: true,
      roles_dropped_verified: true,
      verdict_corrections: 2,
      oracle_contact: 'none (brief capture only, read-only, pre-committed)',
    },
    findings: [
      { claim: 'U2-C1', verdict: 'CONFIRMED', observed: byId['T-C1'].result, evidence_event_ids: [obs1Id, obsC.eventId, claimC5.eventId] },
      { claim: 'U2-C2', verdict: 'CONFIRMED', observed: byId['T-C2'].result, evidence_event_ids: [obs1Id, obsC.eventId] },
      { claim: 'U2-C3', verdict: 'CONFIRMED', observed: byId['T-C3'].result, evidence_event_ids: [obs1Id, obsC.eventId] },
      { claim: 'U2-C4', verdict: 'CONFIRMED', observed: byId['T-C4'].result, evidence_event_ids: [obs1Id, obsC.eventId] },
      { claim: 'U2-C5', verdict: 'CONFIRMED', observed: t5.result + ' | post-trial row body = "bypassed"', evidence_event_ids: [obs1Id, obsC.eventId, claimC5.eventId] },
      { claim: 'U2-C6', verdict: 'CONFIRMED', observed: t6.result + ' | triggers remaining = ' + JSON.stringify(obs1.post_trial_state.triggers_remaining), evidence_event_ids: [obs1Id, obsC.eventId, claimC6.eventId] },
      { claim: 'U2-C7', verdict: 'CONFIRMED', observed: byId['T-C7'].result, evidence_event_ids: [obs1Id, obsC.eventId] },
    ],
    contradictions: [
      { claim: 'Driver B verdict predicates vs recorded trial outcomes',
        observed: 'predicates searched for "OK: UPDATE 1" / "OK: DROP TRIGGER" in trial() success strings; pg returns an array for multi-statement queries so the strings were "OK: undefined undefined"; U2-C5/U2-C6 emitted as REFUTED while the trials succeeded',
        resolution: 'this correction run re-applied corrected predicates to the recorded (unchanged) trial data; U2-C5/U2-C6 corrected to CONFIRMED; original claim events kept as history; driver B patched in the drivers directory and not re-run' },
    ],
    unresolved_questions: [
      'U3: trials ran on PG 15 (Pig); Oracle runs PG 17. Semantics stable per docs, but no direct PG-17 trial was run.',
      'U4: the table owner of the real Oracle ping_events table was not captured (brief capture covered only the trigger definitions); which role could exercise the owner-drop on Oracle is unestablished.',
      'U5: sprint 1 C8 verified the deployed app role ping is a superuser on Oracle; the trigger seal therefore does not bind the production session -- the seal holds only via app discipline (never issuing the bypass), not via the database.',
    ],
    synthesis_tag: 'VERIFIED',
    synthesis_tag_reason: 'All seven verdicts rest on direct disposable-DB trials with verbatim triggers; the two corrected verdicts were re-derived from the unchanged recorded trial data; cleanup verified by re-query.',
    learning: 'A trigger seal is a class-bound seal: state the bound class (non-owner, non-superuser roles) or the claim overreaches.',
    next_question: 'U3: re-run the matrix against PG 17 to close the version caveat; U5: inspect whether the gateway code path could ever issue SET session_replication_role (the one unverified link for the production session).',
  };
  await missionRuntime.assign(MISSION_ID, WORKER);
  await missionRuntime.start(MISSION_ID);
  await missionRuntime.complete(MISSION_ID, result);
  console.log('MISSION_COMPLETED id=' + MISSION_ID);

  // --- Proof readback (lesson I2) ---
  const mrow = await jpool.query(
    `SELECT mission_id, mission_type, status, result->>'verdict' AS verdict FROM ping_missions WHERE mission_id = $1`, [MISSION_ID]);
  const mev = await jpool.query(
    `SELECT event_type, count(*)::int AS n FROM ping_events WHERE metadata->>'correlation_id' = $1 GROUP BY 1 ORDER BY 1`, [MISSION_ID]);
  const kn = await jpool.query(
    `SELECT count(*)::int AS n FROM knowledge_nodes WHERE correlation_id = $1`, [MISSION_ID]);
  const ke = await jpool.query(
    `SELECT count(*)::int AS n FROM knowledge_edges WHERE data->>'mission_id' = $1`, [MISSION_ID]);
  const dbGone = await jpool.query(`SELECT count(*)::int AS n FROM pg_database WHERE datname = $1`, [DISP_DB]);
  const rolesGone = await jpool.query(`SELECT count(*)::int AS n FROM pg_roles WHERE rolname IN ('u2_normal','u2_owner')`);
  console.log('PROOF_BEGIN');
  console.log(JSON.stringify({
    mission: mrow.rows[0],
    correlated_events: mev.rows,
    knowledge_nodes: kn.rows[0].n,
    knowledge_edges: ke.rows[0].n,
    disposable_db_still_exists: dbGone.rows[0].n,
    leftover_roles: rolesGone.rows[0].n,
  }));
  console.log('PROOF_END');

  await jpool.end();
}

main().then(
  () => { console.log('DRIVER_U2_C_DONE'); process.exit(0); },
  (err) => { console.error('DRIVER_U2_C_FAILED', err && err.message); process.exit(1); }
);
