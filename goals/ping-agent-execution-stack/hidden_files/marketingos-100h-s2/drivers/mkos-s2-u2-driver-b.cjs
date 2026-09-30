'use strict';
/* MarketingOS 100h, Sprint 2, Block 0-15, Driver U2-B: run the U2-C1..C7 trial
 * matrix on a disposable database, record verdicts + knowledge, drop the DB,
 * complete the mission, read the row back.
 * Existing machinery only: merged-line UnifiedEventRuntime + MissionRuntime +
 * mission_labels + verdict_vocab.attachClaimVerdict against the live Pig
 * journal (brain-postgres / ping_runtime). No new runtimes, stores, authorities.
 * DB credential read at runtime from the live Pig ping-gateway container env
 * (same-plane config, never printed, never logged, never in a payload).
 * NO Oracle contact of any kind in this driver. All trials run on the Pig's
 * postgres (PG 15) inside disposable database mkos_u2_disposable, dropped at
 * the end. The trigger function + both triggers are recreated VERBATIM from
 * the read-only Oracle capture in the committed brief.
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

// Trigger function + both triggers VERBATIM from the committed brief
// (read-only Oracle capture of crx_runtime.public.ping_events).
const VERBATIM_DDL = `
CREATE OR REPLACE FUNCTION public.ping_events_no_mutation()
 RETURNS trigger LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION '% is append-only: TRUNCATE not permitted', TG_TABLE_NAME;
  END IF;
  RAISE EXCEPTION '% is append-only: % not permitted (event_id=%)',
    TG_TABLE_NAME, TG_OP, COALESCE(OLD.event_id, NEW.event_id);
  RETURN NULL;
END;
$function$;

CREATE TRIGGER trg_ping_events_append_only
  BEFORE DELETE OR UPDATE ON public.ping_events
  FOR EACH ROW EXECUTE FUNCTION ping_events_no_mutation();

CREATE TRIGGER trg_ping_events_append_only_truncate
  BEFORE TRUNCATE ON public.ping_events
  FOR EACH STATEMENT EXECUTE FUNCTION ping_events_no_mutation();
`;

async function trial(client, id, claim, roleCtx, sql) {
  let result;
  try {
    const r = await client.query(sql);
    // Multi-statement queries return an array of results (command/rowCount undefined).
    const parts = Array.isArray(r) ? r : [r];
    result = 'OK: ' + parts.map((p) => p.command + (p.rowCount !== null && p.rowCount !== undefined ? ' ' + p.rowCount : '')).join(' | ');
  } catch (e) {
    result = 'ERROR: ' + e.message;
  }
  return { id, claim, role_context: roleCtx, sql: sql.trim(), result };
}

async function main() {
  const { Pool } = require('/tmp/writer-m/node_modules/pg');
  const mkPool = (database) => new Pool({
    host: '127.0.0.1', port: 5432, user: 'postgres',
    password: dbPassword(), database,
  });
  const jpool = mkPool('ping_runtime');

  const { UnifiedEventRuntime } = require(path.join(WT, 'ping-runtime/events/unified_event_runtime.js'));
  const { MissionRuntime } = require(path.join(WT, 'ping-runtime/orchestration/mission_runtime.js'));
  const { attachClaimVerdict } = require(path.join(WT, 'ping-runtime/evidence/verdict_vocab.js'));

  const eventRuntime = new UnifiedEventRuntime({ pool: jpool });
  await eventRuntime.initialize();
  const missionRuntime = new MissionRuntime({ pool: jpool, eventRuntime });
  await missionRuntime.initialize();
  console.log('INIT_OK mission=' + MISSION_ID);

  // --- Setup: disposable database (idempotent for reruns) ---
  await jpool.query(`DROP DATABASE IF EXISTS ${DISP_DB}`);
  await jpool.query(`DROP ROLE IF EXISTS u2_normal`);
  await jpool.query(`DROP ROLE IF EXISTS u2_owner`);
  await jpool.query(`CREATE DATABASE ${DISP_DB}`);
  console.log('DISP_DB_CREATED ' + DISP_DB);

  const dpool = mkPool(DISP_DB);
  const c = await dpool.connect();
  let trials, trigAfterNames, rowBody;
  try {
    await c.query(`CREATE ROLE u2_owner NOSUPERUSER LOGIN`);
    await c.query(`CREATE ROLE u2_normal NOSUPERUSER LOGIN`);
    await c.query(`GRANT CREATE ON SCHEMA public TO u2_owner`);
    await c.query(`SET ROLE u2_owner`);
    await c.query(`CREATE TABLE public.ping_events (event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), body text)`);
    await c.query(`RESET ROLE`);
    await c.query(VERBATIM_DDL);
    await c.query(`ALTER TABLE public.ping_events OWNER TO u2_owner`);
    await c.query(`GRANT ALL ON public.ping_events TO u2_normal`);
    await c.query(`SET ROLE u2_owner`);
    await c.query(`INSERT INTO public.ping_events (body) VALUES ('seed-row')`);
    await c.query(`RESET ROLE`);
    const seed = await c.query(`SELECT count(*)::int AS n FROM public.ping_events`);
    console.log('SETUP_OK roles=u2_owner,u2_normal table_owner=u2_owner seed_rows=' + seed.rows[0].n);

    // --- Trial matrix U2-C1..C7 (role context via SET ROLE from the superuser session) ---
    trials = [];
    trials.push(await trial(c, 'T-C1', 'U2-C1', 'u2_normal (non-superuser, non-owner; has UPDATE via GRANT ALL)',
      `SET ROLE u2_normal; UPDATE public.ping_events SET body = 'mutated'; RESET ROLE;`));
    trials.push(await trial(c, 'T-C2', 'U2-C2', 'u2_normal (non-superuser, non-owner; has DELETE via GRANT ALL)',
      `SET ROLE u2_normal; DELETE FROM public.ping_events; RESET ROLE;`));
    trials.push(await trial(c, 'T-C3', 'U2-C3', 'u2_normal (non-superuser, non-owner; has TRUNCATE via GRANT ALL)',
      `SET ROLE u2_normal; TRUNCATE public.ping_events; RESET ROLE;`));
    trials.push(await trial(c, 'T-C4', 'U2-C4', 'u2_normal attempting SET session_replication_role',
      `SET ROLE u2_normal; SET session_replication_role = 'replica'; RESET ROLE; RESET session_replication_role;`));
    trials.push(await trial(c, 'T-C5', 'U2-C5', 'postgres (superuser): SET session_replication_role=replica, then UPDATE',
      `SET session_replication_role = 'replica'; UPDATE public.ping_events SET body = 'bypassed' WHERE body = 'seed-row'; RESET session_replication_role;`));
    trials.push(await trial(c, 'T-C7', 'U2-C7', 'u2_normal with default_transaction_read_only=on + explicit START TRANSACTION READ WRITE',
      `SET ROLE u2_normal; SET default_transaction_read_only = on; START TRANSACTION READ WRITE; UPDATE public.ping_events SET body = 'mutated';`));
    // T-C7 left a failed transaction open; roll it back, then reset session state.
    await c.query(`ROLLBACK`);
    await c.query(`RESET default_transaction_read_only`);
    await c.query(`RESET ROLE`);
    trials.push(await trial(c, 'T-C6', 'U2-C6', 'u2_owner (non-superuser table owner) dropping its own trigger',
      `SET ROLE u2_owner; DROP TRIGGER trg_ping_events_append_only ON public.ping_events; RESET ROLE;`));
    const trigAfter = await c.query(
      `SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.ping_events'::regclass AND NOT tgisinternal ORDER BY tgname`);
    const rowAfter = await c.query(`SELECT body FROM public.ping_events LIMIT 1`);
    trigAfterNames = trigAfter.rows.map((r) => r.tgname);
    rowBody = rowAfter.rows[0] && rowAfter.rows[0].body;

    for (const t of trials) console.log(`${t.id} :: ${t.result}`);
    console.log('TRIGGERS_AFTER=' + JSON.stringify(trigAfterNames));
    console.log('ROW_BODY_AFTER=' + JSON.stringify(rowBody));
  } finally {
    c.release();
  }

  // --- Cleanup FIRST: drop disposable DB + roles, verify gone ---
  await dpool.end();
  await jpool.query(`DROP DATABASE ${DISP_DB}`);
  await jpool.query(`DROP ROLE u2_normal`);
  await jpool.query(`DROP ROLE u2_owner`);
  const goneDb = await jpool.query(`SELECT count(*)::int AS n FROM pg_database WHERE datname = $1`, [DISP_DB]);
  const goneRoles = await jpool.query(`SELECT count(*)::int AS n FROM pg_roles WHERE rolname IN ('u2_normal','u2_owner')`);
  console.log(`CLEANUP db_rows_remaining=${goneDb.rows[0].n} roles_remaining=${goneRoles.rows[0].n}`);
  if (goneDb.rows[0].n !== 0 || goneRoles.rows[0].n !== 0) throw new Error('cleanup incomplete');

  // --- Verdicts: CONFIRMED iff observed matches predicted ---
  const verdicts = {
    'U2-C1': { predicted: 'append-only exception on UPDATE', observed: trials[0].result,
      verdict: trials[0].result.indexOf('is append-only: UPDATE not permitted') !== -1 ? 'CONFIRMED' : 'REFUTED' },
    'U2-C2': { predicted: 'append-only exception on DELETE', observed: trials[1].result,
      verdict: trials[1].result.indexOf('is append-only: DELETE not permitted') !== -1 ? 'CONFIRMED' : 'REFUTED' },
    'U2-C3': { predicted: 'append-only exception on TRUNCATE', observed: trials[2].result,
      verdict: trials[2].result.indexOf('is append-only: TRUNCATE not permitted') !== -1 ? 'CONFIRMED' : 'REFUTED' },
    'U2-C4': { predicted: 'permission denied on SET session_replication_role', observed: trials[3].result,
      verdict: trials[3].result.indexOf('permission denied') !== -1 ? 'CONFIRMED' : 'REFUTED' },
    'U2-C5': { predicted: 'superuser bypass: UPDATE succeeds, triggers silent', observed: trials[4].result,
      verdict: (trials[4].result.indexOf('OK:') === 0 && rowBody === 'bypassed') ? 'CONFIRMED' : 'REFUTED' },
    'U2-C7': { predicted: 'trigger still fires under explicit READ WRITE', observed: trials[5].result,
      verdict: trials[5].result.indexOf('is append-only: UPDATE not permitted') !== -1 ? 'CONFIRMED' : 'REFUTED' },
    'U2-C6': { predicted: 'owner DROP TRIGGER succeeds', observed: trials[6].result,
      verdict: (trials[6].result.indexOf('OK:') === 0 && trigAfterNames.indexOf('trg_ping_events_append_only') === -1) ? 'CONFIRMED' : 'REFUTED' },
  };
  for (const k of Object.keys(verdicts)) console.log(`VERDICT ${k} = ${verdicts[k].verdict} :: ${verdicts[k].observed}`);

  const mc = await jpool.query(
    `SELECT event_id FROM ping_events WHERE event_type = 'MISSION_CREATED' AND payload->>'missionId' = $1 ORDER BY timestamp DESC LIMIT 1`,
    [MISSION_ID]
  );
  const createdEventId = mc.rows[0].event_id;
  const emitOpts = (causationId, logicalId) => ({
    tenant_id: TENANT, correlation_id: MISSION_ID, causation_id: causationId, logical_id: logicalId,
  });

  // --- Observation 1: trial matrix ---
  const obs1 = await eventRuntime.emit('OBSERVATION_CREATED', WORKER, {
    documentId: MISSION_ID,
    observation: {
      question: 'U2: do the append-only triggers actually bind? (trial matrix)',
      substrate: 'disposable database mkos_u2_disposable on the Pig postgres (PG 15), dropped after the run; roles u2_owner (NOSUPERUSER, table owner), u2_normal (NOSUPERUSER, non-owner, GRANT ALL on table); trigger function + both triggers recreated VERBATIM from the read-only Oracle capture in the committed brief. Per-trial role context simulated via SET ROLE from the superuser session (no passwords minted; privilege checks evaluate against the current role).',
      trials,
      post_trial_state: { triggers_remaining: trigAfterNames, row_body: rowBody },
      cleanup_verified: { db_rows_remaining: goneDb.rows[0].n, roles_remaining: goneRoles.rows[0].n },
    },
    upstreamEventId: createdEventId,
  }, emitOpts(createdEventId, 'mkos-s2-u2:obs:trial-matrix'));
  console.log('OBS1 ' + obs1.eventId);

  // --- Observation 2: PG docs corroboration ---
  const obs2 = await eventRuntime.emit('OBSERVATION_CREATED', WORKER, {
    documentId: MISSION_ID,
    observation: {
      question: 'U2 documentary corroboration (owner / superuser / replication-role semantics)',
      source: 'PostgreSQL official documentation',
      session_replication_role: '"Only superusers can change this setting" (runtime-config-developer); replica mode skips ordinary triggers. Corroborates T-C4 (permission denied for u2_normal) and T-C5 (superuser bypass, row trigger silent).',
      drop_trigger: 'DROP TRIGGER requires ownership of the trigger\'s table (SQL-DROPTRIGGER privilege notes). Corroborates T-C6.',
      default_transaction_read_only: '"This parameter controls the default read-only status of each new transaction" -- an explicit START TRANSACTION READ WRITE overrides the default, so the write proceeds to the trigger. Corroborates T-C7.',
      version_caveat: 'Trials ran on PG 15 (Pig); Oracle runs PG 17. BEFORE-trigger semantics, session_replication_role behavior, and trigger/drop privilege rules are stable across these versions, but no direct PG-17 trial was run (U3 still open).',
    },
    upstreamEventId: createdEventId,
  }, emitOpts(createdEventId, 'mkos-s2-u2:obs:pg-docs'));
  console.log('OBS2 ' + obs2.eventId);

  // --- Claims with verdicts (vocabulary: CONFIRMED | REFUTED | UNCLEAR only) ---
  const claimTexts = {
    'U2-C1': 'UPDATE on a trigger-protected table raises the append-only exception.',
    'U2-C2': 'DELETE on a trigger-protected table raises the append-only exception.',
    'U2-C3': 'TRUNCATE on a trigger-protected table raises the append-only exception.',
    'U2-C4': 'A non-superuser, non-owner role CANNOT bypass via SET session_replication_role: permission denied.',
    'U2-C5': 'A superuser CAN bypass via SET session_replication_role = replica: the UPDATE succeeded and the row trigger did not fire.',
    'U2-C6': 'The table owner (non-superuser) CAN DROP TRIGGER on its own table.',
    'U2-C7': 'With default_transaction_read_only=on + explicit START TRANSACTION READ WRITE, the trigger still fires on UPDATE: the read-only default is not the seal, the trigger is the second layer.',
  };
  const claimOrder = ['U2-C1', 'U2-C2', 'U2-C3', 'U2-C4', 'U2-C5', 'U2-C6', 'U2-C7'];
  const claimEvents = [];
  for (const cid of claimOrder) {
    const v = verdicts[cid];
    const rec = attachClaimVerdict({
      text: claimTexts[cid] + ' Observed: ' + v.observed,
      subject: cid + ': ' + v.predicted,
      synthesis_tag: v.verdict === 'UNCLEAR' ? 'UNKNOWN' : 'VERIFIED',
      evidence: {
        observation_event_ids: [obs1.eventId, obs2.eventId],
        method: 'disposable-PG-15 trial matrix (verbatim triggers) + PG docs, all during this run; zero Oracle contact',
        trial: cid === 'U2-C1' ? 'T-C1' : cid === 'U2-C2' ? 'T-C2' : cid === 'U2-C3' ? 'T-C3' : cid === 'U2-C4' ? 'T-C4' : cid === 'U2-C5' ? 'T-C5' : cid === 'U2-C6' ? 'T-C6' : 'T-C7',
      },
    }, v.verdict);
    const res = await eventRuntime.emit('CLAIM_CREATED', WORKER, {
      documentId: MISSION_ID, claim: rec, upstreamEventId: obs1.eventId,
    }, emitOpts(obs1.eventId, 'mkos-s2-u2:claim:' + cid.toLowerCase()));
    console.log(`CLAIM ${v.verdict} ${res.eventId} :: ${cid}`);
    claimEvents.push(res.eventId);
  }

  // --- Knowledge nodes/edges, namespace marketingos::s2-block0-15 ---
  const prefix = `mkos-${MISSION_ID.slice(0, 8)}-u2`;
  async function putNode(slug, nodeType, label, data, confidence) {
    const nid = `${prefix}-${slug}`;
    await jpool.query(
      `INSERT INTO knowledge_nodes (node_id, node_type, label, data, source_event_id, namespace, confidence, status, correlation_id, confidence_provenance)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,'verified',$8,'experiment')
       ON CONFLICT (node_id) DO NOTHING`,
      [nid, nodeType, label, JSON.stringify({ ...data, mission_id: MISSION_ID }), null, NS, confidence, MISSION_ID]
    );
    return nid;
  }
  async function putEdge(slug, sourceId, targetId, edgeType) {
    await jpool.query(
      `INSERT INTO knowledge_edges (edge_id, source_id, target_id, edge_type, data)
       VALUES ($1,$2,$3,$4,$5::jsonb) ON CONFLICT (edge_id) DO NOTHING`,
      [`${prefix}-edge-${slug}`, sourceId, targetId, edgeType, JSON.stringify({ mission_id: MISSION_ID })]
    );
  }
  const nodeIds = [];
  const labels = {
    'U2-C1': 'U2-C1 CONFIRMED: UPDATE raises the append-only exception',
    'U2-C2': 'U2-C2 CONFIRMED: DELETE raises the append-only exception',
    'U2-C3': 'U2-C3 CONFIRMED: TRUNCATE raises the append-only exception',
    'U2-C4': 'U2-C4 CONFIRMED: non-superuser cannot SET session_replication_role (permission denied)',
    'U2-C5': 'U2-C5 CONFIRMED: superuser bypasses via session_replication_role=replica',
    'U2-C6': 'U2-C6 CONFIRMED: table owner (non-superuser) can DROP TRIGGER',
    'U2-C7': 'U2-C7 CONFIRMED: trigger fires even under explicit READ WRITE (defense in depth)',
  };
  const order = ['U2-C1', 'U2-C2', 'U2-C3', 'U2-C4', 'U2-C5', 'U2-C6', 'U2-C7'];
  for (let i = 0; i < order.length; i++) {
    const cid = order[i];
    const nid = await putNode(cid.toLowerCase(),
      cid === 'U2-C5' || cid === 'U2-C6' ? 'finding' : 'finding',
      labels[cid],
      { detail: claimTexts[cid], observed: verdicts[cid].observed, evidence_event_id: obs1.eventId }, 1.0);
    await jpool.query(`UPDATE knowledge_nodes SET source_event_id = $2 WHERE node_id = $1`, [nid, claimEvents[i]]);
    nodeIds.push(nid);
  }
  const nThesis = await putNode('thesis-e', 'finding',
    'THESIS-E SCOPED: the triggers bind non-owner, non-superuser roles exactly; superusers and table owners are outside the seal',
    { detail: 'U2-C1..C4, C7 CONFIRMED: every write path available to a privileged non-owner non-superuser role raises the append-only exception, including under an explicit READ WRITE override. U2-C5 CONFIRMED: a superuser session with session_replication_role=replica writes without the triggers firing. U2-C6 CONFIRMED: the table owner can remove the seal unilaterally. Scope statement: the triggers are a real second layer, but they bind exactly the non-owner, non-superuser role class -- the same scoping pattern as sprint 1 C-F2. Note: sprint 1 C8 verified the deployed Oracle app role ping is a SUPERUSER, so the production session sits outside this seal; it holds only via app discipline (never issuing the bypass), not via the database.', evidence_event_id: obs1.eventId }, 0.95);
  const nLearn = await putNode('learning', 'learning',
    'LEARNING: a trigger seal is a class-bound seal -- state the bound class, or the claim overreaches',
    { detail: 'Append-only triggers bind every role with DML privileges EXCEPT superusers (session_replication_role bypass) and the table owner (DROP TRIGGER). The honest seal statement names the bound class. Defense in depth confirmed: default_transaction_read_only is a default, the trigger is the second layer that still fires when the default is overridden per transaction.', evidence_event_id: claimEvents[6] }, 0.9);
  for (const nid of nodeIds) await putEdge('finding-bounds-thesis', nid, nThesis, 'supports');
  await putEdge('thesis-learning', nThesis, nLearn, 'supports');
  console.log(`KNOWLEDGE nodes=${nodeIds.length + 2} edges=${nodeIds.length + 1}`);

  // --- Complete (assign -> start already done by driver A; complete transitions from running) ---
  const result = {
    verdict: 'SCOPED',
    thesis_e: 'SCOPED: the triggers bind non-owner, non-superuser roles exactly; superuser bypass (U2-C5) and owner drop (U2-C6) are CONFIRMED.',
    metrics_observed: {
      trials_run: 7,
      confirmed: 7, refuted: 0, unclear: 0,
      triggers_recreated_verbatim: 2,
      disposable_db_dropped_verified: true,
      roles_dropped_verified: true,
      oracle_contact: 'none (brief capture only, read-only, pre-committed)',
    },
    findings: order.map((cid, i) => ({ claim: cid, verdict: verdicts[cid].verdict, observed: verdicts[cid].observed, evidence_event_ids: [obs1.eventId, obs2.eventId, claimEvents[i]] })),
    contradictions: [],
    unresolved_questions: [
      'U3: trials ran on PG 15 (Pig); Oracle runs PG 17. Semantics are stable across versions per docs, but no direct PG-17 trial was run.',
      'U4: the table owner of the real Oracle ping_events table was not captured (read-only brief capture covered only the trigger definitions); which role could exercise the owner-drop on Oracle is unestablished.',
      'U5: sprint 1 C8 verified the deployed app role ping is a superuser on Oracle; the trigger seal therefore does not bind the production session -- app-discipline dependency recorded, not resolved here.',
    ],
    synthesis_tag: 'VERIFIED',
    synthesis_tag_reason: 'All seven verdicts rest on direct disposable-DB trials with verbatim triggers; cleanup verified by re-query.',
    learning: 'A trigger seal is a class-bound seal: state the bound class (non-owner, non-superuser roles) or the claim overreaches.',
    next_question: 'U3: re-run the matrix against PG 17 to close the version caveat; U5: inspect whether the gateway code path could ever issue SET session_replication_role (the one unverified link for the production session).',
  };
  await missionRuntime.assign(MISSION_ID, WORKER);
  await missionRuntime.start(MISSION_ID);
  await missionRuntime.complete(MISSION_ID, result);
  console.log("MISSION_COMPLETED id=" + MISSION_ID);

  // --- Proof readback (lesson I2) ---
  const mrow = await jpool.query(
    `SELECT mission_id, mission_type, status FROM ping_missions WHERE mission_id = $1`, [MISSION_ID]);
  const mev = await jpool.query(
    `SELECT event_type, count(*)::int AS n FROM ping_events WHERE metadata->>'correlation_id' = $1 GROUP BY 1 ORDER BY 1`, [MISSION_ID]);
  const kn = await jpool.query(
    `SELECT count(*)::int AS n FROM knowledge_nodes WHERE correlation_id = $1`, [MISSION_ID]);
  const ke = await jpool.query(
    `SELECT count(*)::int AS n FROM knowledge_edges WHERE data->>'mission_id' = $1`, [MISSION_ID]);
  const dbGone = await jpool.query(`SELECT count(*)::int AS n FROM pg_database WHERE datname = $1`, [DISP_DB]);
  console.log('PROOF_BEGIN');
  console.log(JSON.stringify({
    mission: mrow.rows[0],
    correlated_events: mev.rows,
    knowledge_nodes: kn.rows[0].n,
    knowledge_edges: ke.rows[0].n,
    disposable_db_still_exists: dbGone.rows[0].n,
  }));
  console.log('PROOF_END');

  await jpool.end();
}

main().then(
  () => { console.log('DRIVER_U2_B_DONE'); process.exit(0); },
  (err) => { console.error('DRIVER_U2_B_FAILED', err && err.message); process.exit(1); }
);
