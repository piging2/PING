'use strict';
/* MarketingOS 100h, Block 0-20, Driver B: record findings, verdicts, knowledge, complete.
 * Research was performed AFTER the brief was committed (28c38d1) and BEFORE this
 * driver runs: experiment matrix on disposable Postgres 16 (container
 * mkos-research-pg on the Pig, destroyed after), PG 16 official docs, and
 * READ-ONLY inspection of the Oracle host (zero write attempts anywhere
 * outside the mission's own journal events).
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const WT = '/home/nolan/ping-worktrees/deploy-merge-20260930';
const TENANT = 'ping-ops';
const MISSION_ID = fs.readFileSync('/tmp/mkos-mission-id', 'utf8').trim();

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
  console.log('INIT_OK mission=' + MISSION_ID);

  const mc = await pool.query(
    `SELECT event_id FROM ping_events WHERE event_type = 'MISSION_CREATED' AND payload->>'missionId' = $1 ORDER BY timestamp DESC LIMIT 1`,
    [MISSION_ID]
  );
  const createdEventId = mc.rows[0].event_id;
  const emitOpts = (causationId, logicalId) => ({
    tenant_id: TENANT, correlation_id: MISSION_ID, causation_id: causationId, logical_id: logicalId,
  });

  // --- Observation 1: disposable-PG-16 experiment matrix (verbatim) ---
  const trials = [
    { id: 'T1', role: 'app_ro (non-superuser, default_transaction_read_only=on), fresh session',
      sql: "SHOW default_transaction_read_only; INSERT INTO journal(body) VALUES('t1') RETURNING id;",
      result: "SHOW -> on. INSERT -> ERROR: cannot execute INSERT in a read-only transaction." },
    { id: 'T2', role: 'app_ro, same session',
      sql: 'SET default_transaction_read_only = off; SHOW default_transaction_read_only; INSERT INTO journal(body) VALUES(\'t2\') RETURNING id;',
      result: 'SET ok. SHOW -> off. INSERT -> id=1, INSERT 0 1 (write succeeded after session override).' },
    { id: 'T3', role: 'app_ro, fresh session',
      sql: "START TRANSACTION READ WRITE; INSERT INTO journal(body) VALUES('t3') RETURNING id; COMMIT;",
      result: 'INSERT -> id=2, INSERT 0 1, COMMIT ok (per-transaction override succeeds).' },
    { id: 'T4', role: 'app_ro, read-only transaction',
      sql: 'CREATE TEMP TABLE t1(i int); INSERT INTO t1 VALUES(1); SELECT count(*) FROM t1;',
      result: 'CREATE TEMP TABLE -> ERROR: cannot execute CREATE TABLE in a read-only transaction. Follow-ups -> ERROR: relation "t1" does not exist.' },
    { id: 'T5', role: 'app_ro, read-only transaction',
      sql: "SELECT nextval('testseq');",
      result: 'ERROR: cannot execute nextval() in a read-only transaction.' },
    { id: 'T6', role: 'app_ro, read-only transaction',
      sql: 'SELECT pg_advisory_lock(42); SELECT pg_advisory_unlock(42);',
      result: 'lock acquired (empty result = success); unlock -> t. Advisory locks WORK in read-only transactions.' },
    { id: 'T7', role: 'app_ro, read-only transaction',
      sql: "LISTEN mkos_ch; NOTIFY mkos_ch, 'ping';",
      result: "LISTEN ok; NOTIFY ok; async notification received with payload 'ping'. LISTEN/NOTIFY WORK in read-only transactions." },
    { id: 'T8', role: 'app_ro, read-only transaction',
      sql: 'CREATE TABLE perm_table(i int);',
      result: 'ERROR: cannot execute CREATE TABLE in a read-only transaction.' },
    { id: 'T9a', role: 'su_ro (SUPERUSER, default_transaction_read_only=on), fresh session',
      sql: "SHOW default_transaction_read_only; SELECT rolsuper FROM pg_roles WHERE rolname=current_user; INSERT INTO journal(body) VALUES('t9a') RETURNING id;",
      result: 'SHOW -> on; rolsuper -> t; INSERT -> ERROR: cannot execute INSERT in a read-only transaction (default binds superusers too).' },
    { id: 'T9b', role: 'su_ro, same session',
      sql: "SET default_transaction_read_only = off; INSERT INTO journal(body) VALUES('t9b') RETURNING id;",
      result: 'SET ok; INSERT -> id=3, INSERT 0 1 (superuser bypasses at will).' },
    { id: 'T10', role: 'app_append (non-superuser; INSERT/UPDATE/DELETE/TRUNCATE REVOKEd), read-only default off',
      sql: 'SELECT count(*) FROM journal; INSERT ...; UPDATE journal SET ...; DELETE FROM journal ...; TRUNCATE journal; START TRANSACTION READ WRITE; INSERT ...;',
      result: 'SELECT -> 3 rows ok. INSERT/UPDATE/DELETE/TRUNCATE -> ERROR: permission denied for table journal (each). Explicit READ WRITE + INSERT -> permission denied. Privilege revocation holds regardless of transaction mode.' },
    { id: 'T11', role: 'app_ro',
      sql: 'SET default_transaction_read_only=off; CREATE TEMP TABLE t2(i int); SET default_transaction_read_only=on; INSERT INTO t2 VALUES(10); COPY t2 FROM STDIN ...;',
      result: 'Temp table created while writable. Read-only INSERT -> INSERT 0 1 (1 row). Read-only COPY FROM -> COPY 1 (2 rows). DML on EXISTING temp tables is allowed in read-only transactions; only the CREATE is blocked.' },
  ];
  const obs1 = await eventRuntime.emit('OBSERVATION_CREATED', 'mission-worker', {
    documentId: MISSION_ID,
    observation: {
      question: 'Q1/Q2/Q3 experiment matrix',
      substrate: 'disposable postgres:16-alpine container (mkos-research-pg) on the Pig; roles app_ro/app_append NOSUPERUSER, su_ro SUPERUSER; table journal; destroyed after the run',
      trials,
      trial_count: trials.length,
    },
    upstreamEventId: createdEventId,
  }, emitOpts(createdEventId, 'mkos-b020:obs:experiment-matrix'));
  console.log('OBS1 ' + obs1.eventId);

  // --- Observation 2: PG 16 official docs ---
  const obs2 = await eventRuntime.emit('OBSERVATION_CREATED', 'mission-worker', {
    documentId: MISSION_ID,
    observation: {
      question: 'Q1/Q2 documentary corroboration',
      source: 'PostgreSQL 16 official documentation',
      set_transaction: 'When a transaction is read-only, the following SQL commands are disallowed: INSERT, UPDATE, DELETE, MERGE, and COPY FROM if the table they would write to is not a temporary table; all CREATE, ALTER, and DROP commands; COMMENT, GRANT, REVOKE, TRUNCATE; and EXPLAIN ANALYZE and EXECUTE if the command they would execute is among those listed. "This is a high-level notion of read-only that does not prevent all writes to disk."',
      default_transaction_read_only: '"A read-only SQL transaction cannot alter non-temporary tables. This parameter controls the default read-only status of each new transaction." (i.e. it is a DEFAULT, overridable per session/transaction)',
      temp_table_nuance: 'The temp-table exemption in SET TRANSACTION covers DML on existing temp tables ("if the table they would write to is not a temporary table"); CREATE is categorically disallowed. Matches T4/T11 exactly.',
    },
    upstreamEventId: createdEventId,
  }, emitOpts(createdEventId, 'mkos-b020:obs:pg16-docs'));
  console.log('OBS2 ' + obs2.eventId);

  // --- Observation 3: Oracle read-only inspection (zero writes) ---
  const obs3 = await eventRuntime.emit('OBSERVATION_CREATED', 'mission-worker', {
    documentId: MISSION_ID,
    observation: {
      question: 'Q4 Oracle deployed configuration',
      method: 'read-only inspection only: docker inspect (no secrets), SELECT on pg_roles / pg_db_role_setting / ping_events / pg_trigger. Zero write attempts against Oracle.',
      host: 'ping-core-01 (129.146.60.17); postgres container ping-postgres (postgres:17-alpine)',
      gateway_container: { name: 'ping-gateway', state: 'running', restart: 'unless-stopped', image: 'ping-gateway:candidate-3c5d280dd' },
      role_ping: { rolsuper: true },
      db_role_setting: [{ datname: 'crx_runtime', rolname: 'ping', setconfig: ['default_transaction_read_only=on'] }],
      fresh_session_show: 'on',
      journal_rows: 2557,
      append_only_triggers: ['trg_ping_events_append_only', 'trg_ping_events_append_only_truncate'],
      note: 'Matches the claimed ALTER ROLE ping IN DATABASE crx_runtime SET default_transaction_read_only = on exactly.',
    },
    upstreamEventId: createdEventId,
  }, emitOpts(createdEventId, 'mkos-b020:obs:oracle-inspection'));
  console.log('OBS3 ' + obs3.eventId);

  // --- Claims with verdicts ---
  async function emitClaim(text, subject, verdict, evidenceIds, causationId, logicalId, extra) {
    const rec = attachClaimVerdict({
      text, subject,
      synthesis_tag: verdict === 'UNCLEAR' ? 'UNKNOWN' : 'VERIFIED',
      evidence: {
        observation_event_ids: evidenceIds,
        method: 'disposable-Postgres-16 experiment matrix + PG16 docs + read-only Oracle inspection, all during this run',
        ...(extra || {}),
      },
    }, verdict);
    const res = await eventRuntime.emit('CLAIM_CREATED', 'mission-worker', {
      documentId: MISSION_ID, claim: rec, upstreamEventId: causationId,
    }, emitOpts(causationId, logicalId));
    console.log(`CLAIM ${verdict} ${res.eventId} :: ${subject}`);
    return res;
  }

  const claims = [];
  claims.push(await emitClaim('A non-superuser role with default_transaction_read_only=on cannot INSERT in a fresh session.',
    'C1: read-only default blocks writes', 'CONFIRMED', [obs1.eventId], obs1.eventId, 'mkos-b020:claim:c1',
    { trial: 'T1', verbatim: 'ERROR: cannot execute INSERT in a read-only transaction' }));
  claims.push(await emitClaim('The same role regains write ability via SET default_transaction_read_only = off or START TRANSACTION READ WRITE: the setting is a session/transaction default, not a privilege boundary.',
    'C2: default is overridable', 'CONFIRMED', [obs1.eventId, obs2.eventId], obs1.eventId, 'mkos-b020:claim:c2',
    { trials: ['T2', 'T3'], doc: 'default_transaction_read_only "controls the default read-only status of each new transaction"' }));
  claims.push(await emitClaim('CREATE TEMP TABLE does NOT succeed in a read-only transaction (ERROR: cannot execute CREATE TABLE in a read-only transaction). The real exemption is narrower: DML (INSERT, COPY FROM) on an already-existing temp table IS allowed read-only.',
    'C3: temp-table boundary (REFUTED as worded, refined)', 'REFUTED', [obs1.eventId, obs2.eventId], obs1.eventId, 'mkos-b020:claim:c3',
    { trials: ['T4', 'T11'], refinement: 'docs: COPY FROM disallowed "if the table they would write to is not a temporary table"; CREATE categorically disallowed' }));
  claims.push(await emitClaim('SELECT nextval(seq) fails in a read-only transaction.',
    'C4: sequences blocked', 'CONFIRMED', [obs1.eventId], obs1.eventId, 'mkos-b020:claim:c4',
    { trial: 'T5', verbatim: 'ERROR: cannot execute nextval() in a read-only transaction' }));
  claims.push(await emitClaim('Session advisory locks (pg_advisory_lock/unlock) and LISTEN/NOTIFY function normally inside read-only transactions.',
    'C5: advisory locks + notify work read-only', 'CONFIRMED', [obs1.eventId], obs1.eventId, 'mkos-b020:claim:c5',
    { trials: ['T6', 'T7'] }));
  claims.push(await emitClaim('A SUPERUSER role is bound by the default in a fresh session but bypasses it at will with SET: default_transaction_read_only is not a privilege boundary for superusers.',
    'C6: superuser bypass', 'CONFIRMED', [obs1.eventId], obs1.eventId, 'mkos-b020:claim:c6',
    { trials: ['T9a', 'T9b'] }));
  claims.push(await emitClaim('REVOKE INSERT, UPDATE, DELETE, TRUNCATE from a non-superuser role blocks writes even in explicit READ WRITE transactions: privilege revocation, unlike the read-only default, is a real boundary.',
    'C7: revoke is a real boundary', 'CONFIRMED', [obs1.eventId], obs1.eventId, 'mkos-b020:claim:c7',
    { trial: 'T10' }));
  claims.push(await emitClaim('The Oracle journal matches the claimed configuration exactly: role ping is superuser, pg_db_role_setting holds crx_runtime|ping|{default_transaction_read_only=on}, fresh sessions show on, journal sealed at 2557 rows, append-only triggers present. Residual risk (per C6): any client connecting as ping can SET the default off; the seal therefore rests on the app never issuing SET/START TRANSACTION plus the append-only triggers, not on a Postgres privilege boundary.',
    'C8: oracle config verified; residual risk stated', 'CONFIRMED', [obs3.eventId], obs3.eventId, 'mkos-b020:claim:c8',
    { write_attempts_against_oracle: 0 }));

  // --- Knowledge nodes/edges (findings + learning) ---
  const ns = 'marketingos::block0-20';
  const nodeIds = [];
  const claimVerdicts = [
    ['c1', 'C1 CONFIRMED: read-only default blocks INSERT in fresh sessions', 'Postgres 16 trial T1; ERROR: cannot execute INSERT in a read-only transaction.'],
    ['c2', 'C2 CONFIRMED: default_transaction_read_only is overridable per session/transaction', 'Trials T2/T3; PG16 docs: it "controls the default read-only status of each new transaction".'],
    ['c3', 'C3 REFUTED-as-worded: CREATE TEMP TABLE fails read-only; DML on existing temp tables allowed', 'Trials T4/T11; docs: COPY FROM exempt only "if the table they would write to is not a temporary table".'],
    ['c4', 'C4 CONFIRMED: nextval() blocked in read-only transactions', 'Trial T5.'],
    ['c5', 'C5 CONFIRMED: advisory locks and LISTEN/NOTIFY work in read-only transactions', 'Trials T6/T7.'],
    ['c6', 'C6 CONFIRMED: superuser bypasses default_transaction_read_only at will', 'Trials T9a/T9b; the setting is a default, not a privilege boundary.'],
    ['c7', 'C7 CONFIRMED: REVOKE INSERT/UPDATE/DELETE/TRUNCATE is a real boundary for non-superusers', 'Trial T10; holds even under explicit READ WRITE.'],
    ['c8', 'C8 CONFIRMED: Oracle journal matches claimed seal config; residual risk = app discipline + triggers', 'Read-only inspection of ping-core-01: role ping superuser, setting present, 2557 rows sealed, triggers present. Zero write attempts.'],
  ];
  for (const [cid, label, detail] of claimVerdicts) {
    const nid = `mkos-${MISSION_ID.slice(0, 8)}-${cid}`;
    nodeIds.push(nid);
    await pool.query(
      `INSERT INTO knowledge_nodes (node_id, node_type, label, data, source_event_id, namespace, confidence, status, correlation_id, confidence_provenance)
       VALUES ($1,'finding',$2,$3::jsonb,$4,$5,1.0,'verified',$6,'experiment')
       ON CONFLICT (node_id) DO NOTHING`,
      [nid, label, JSON.stringify({ detail, mission_id: MISSION_ID }), null, ns, MISSION_ID]
    );
  }
  // attach source claim event ids
  for (let i = 0; i < nodeIds.length; i++) {
    await pool.query(`UPDATE knowledge_nodes SET source_event_id = $2 WHERE node_id = $1`, [nodeIds[i], claims[i].eventId]);
  }
  const learnId = `mkos-${MISSION_ID.slice(0, 8)}-learning`;
  await pool.query(
    `INSERT INTO knowledge_nodes (node_id, node_type, label, data, namespace, confidence, status, correlation_id, confidence_provenance)
     VALUES ($1,'learning',$2,$3::jsonb,$4,0.9,'verified',$5,'experiment')
     ON CONFLICT (node_id) DO NOTHING`,
    [learnId,
     'LEARNING: "sealed read-only" in Postgres means default + app discipline + triggers, not a privilege boundary',
     JSON.stringify({
       detail: 'default_transaction_read_only is a default any session owner can lift (T2/T3) and any superuser can bypass (T9b). A genuine boundary for non-superusers is privilege revocation (T10). The honest seal statement for Oracle: read-only default verified present (C8) + app never issues SET/START TRANSACTION (UNVERIFIED here) + append-only triggers present (verified).',
       mission_id: MISSION_ID,
       publishable_framing: 'We sealed our audit journal with default_transaction_read_only. Here is the exact boundary of that claim.',
     }),
     ns, MISSION_ID]
  );
  for (let i = 0; i < nodeIds.length; i++) {
    await pool.query(
      `INSERT INTO knowledge_edges (edge_id, source_id, target_id, edge_type, data)
       VALUES ($1,$2,$3,'supports',$4::jsonb) ON CONFLICT (edge_id) DO NOTHING`,
      [`mkos-${MISSION_ID.slice(0, 8)}-edge-${i}`, nodeIds[i], learnId, JSON.stringify({ mission_id: MISSION_ID })]
    );
  }
  console.log(`KNOWLEDGE nodes=${nodeIds.length + 1} edges=${nodeIds.length}`);

  // --- Synthesis + complete ---
  const synthesis = {
    findings: [
      { claim: 'C1', answer: 'Non-superuser, read-only default, fresh session: INSERT errors.', verdict: 'CONFIRMED', evidence_event_ids: [obs1.eventId, claims[0].eventId] },
      { claim: 'C2', answer: 'SET off or START TRANSACTION READ WRITE restores writes: it is a default, not a boundary.', verdict: 'CONFIRMED', evidence_event_ids: [obs1.eventId, obs2.eventId, claims[1].eventId] },
      { claim: 'C3', answer: 'CREATE TEMP TABLE fails read-only; DML on existing temp tables succeeds. Claim REFUTED as worded; refined boundary recorded.', verdict: 'REFUTED', evidence_event_ids: [obs1.eventId, obs2.eventId, claims[2].eventId] },
      { claim: 'C4', answer: 'nextval() fails in read-only transactions.', verdict: 'CONFIRMED', evidence_event_ids: [obs1.eventId, claims[3].eventId] },
      { claim: 'C5', answer: 'Advisory locks and LISTEN/NOTIFY work in read-only transactions.', verdict: 'CONFIRMED', evidence_event_ids: [obs1.eventId, claims[4].eventId] },
      { claim: 'C6', answer: 'Superuser bypasses the default at will via SET.', verdict: 'CONFIRMED', evidence_event_ids: [obs1.eventId, claims[5].eventId] },
      { claim: 'C7', answer: 'REVOKE INSERT/UPDATE/DELETE/TRUNCATE is a real boundary for non-superusers, even under READ WRITE.', verdict: 'CONFIRMED', evidence_event_ids: [obs1.eventId, claims[6].eventId] },
      { claim: 'C8', answer: 'Oracle matches the claimed seal config exactly (read-only inspection, zero write attempts). Residual risk stated, not euphemized.', verdict: 'CONFIRMED', evidence_event_ids: [obs3.eventId, claims[7].eventId] },
    ],
    contradictions: [
      { claim: 'Prior belief + secondary sources: "temp tables are exempt from read-only"',
        observed: 'T4: CREATE TEMP TABLE -> ERROR: cannot execute CREATE TABLE in a read-only transaction',
        resolution: 'Exemption covers DML on existing temp tables only (T11; PG16 SET TRANSACTION wording). Secondary source (agent-sql design doc) was overbroad.' },
      { claim: 'Retirement doc framing: "read-only enforced at the database boundary... binds even superusers"',
        observed: 'T9b: superuser SET default_transaction_read_only=off -> writes succeed',
        resolution: 'The doc itself scopes the claim to the app connection pattern (app never issues SET/START TRANSACTION). No doc rewrite proposed here; residual risk recorded as U1 for the deployment-convergence lane.' },
    ],
    unresolved_questions: [
      'U1: Does the Oracle gateway application code ever issue SET default_transaction_read_only or START TRANSACTION READ WRITE? (code inspection of image candidate-3c5d280dd; not done in this block)',
      'U2: Do the Oracle append-only triggers actually block UPDATE/DELETE? (testable on disposable PG with equivalent triggers; write attempts against Oracle out of scope)',
      'U3: Experiments ran on PG 16; Oracle runs PG 17. Docs indicate no change; direct PG-17 trial not run.',
      'U4: Does any pooler/proxy between the gateway and PG reset session defaults?',
      'U5: Full extent of "high-level notion of read-only that does not prevent all writes to disk" beyond tested ops (large objects, stats writes).',
    ],
    synthesis_tag: 'INFERRED',
    synthesis_tag_reason: 'All eight verdicts rest on direct experiment/docs/inspection evidence; the publishable framing ("here is the exact boundary of the seal claim") generalizes one step beyond the readback.',
    learning: 'In Postgres, "sealed read-only" via default_transaction_read_only means default + application discipline + triggers, never a privilege boundary. Say exactly that, or say nothing.',
    next_question: 'U1: does the Oracle gateway code ever issue SET/START TRANSACTION (the one unverified link in the seal chain)?',
    consequential_action_proposed: false,
  };
  await missionRuntime.complete(MISSION_ID, synthesis);
  console.log('MISSION_COMPLETED id=' + MISSION_ID);

  // --- Proof readback ---
  const mrow = await pool.query(
    `SELECT mission_id, mission_type, status, tenant_id, created_by, result->>'synthesis_tag' AS synthesis_tag,
            result->>'consequential_action_proposed' AS action_proposed
     FROM ping_missions WHERE mission_id = $1`, [MISSION_ID]);
  const research = await pool.query(
    `SELECT event_type, count(*)::int AS n FROM ping_events WHERE metadata->>'correlation_id' = $1 GROUP BY 1 ORDER BY 1`, [MISSION_ID]);
  const kn = await pool.query(
    `SELECT count(*)::int AS n FROM knowledge_nodes WHERE correlation_id = $1`, [MISSION_ID]);
  const ke = await pool.query(
    `SELECT count(*)::int AS n FROM knowledge_edges WHERE data->>'mission_id' = $1`, [MISSION_ID]);
  console.log('PROOF_BEGIN');
  console.log(JSON.stringify({ mission: mrow.rows[0], correlated_events: research.rows, knowledge_nodes: kn.rows[0].n, knowledge_edges: ke.rows[0].n }, null, 1));
  console.log('PROOF_END');

  await pool.end();
}

main().then(
  () => { console.log('DRIVER_B_DONE'); process.exit(0); },
  (err) => { console.error('DRIVER_B_FAILED', err && err.message); process.exit(1); }
);
