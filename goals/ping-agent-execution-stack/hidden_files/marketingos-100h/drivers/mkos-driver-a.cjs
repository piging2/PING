'use strict';
/* MarketingOS 100h, Block 0-20, Driver A: create the INTELLIGENCE_RESEARCH mission.
 * Existing machinery only: merged-line UnifiedEventRuntime + MissionRuntime +
 * mission_labels.createLabeledMission against the live Pig journal
 * (brain-postgres / ping_runtime). No new runtimes, stores, authorities.
 * DB credential read at runtime from the live Pig ping-gateway container env
 * (same-plane config, never printed, never logged, never in a payload).
 * The research brief was written and committed BEFORE any research began
 * (workspace commit 28c38d1, BLOCK-0-20-RESEARCH-BRIEF.md).
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const WT = '/home/nolan/ping-worktrees/deploy-merge-20260930';
const TENANT = 'ping-ops';
const WORKER = 'mkos-block0-20-research-worker';

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

  const eventRuntime = new UnifiedEventRuntime({ pool });
  await eventRuntime.initialize();
  const missionRuntime = new MissionRuntime({ pool, eventRuntime });
  await missionRuntime.initialize();
  console.log('INIT_OK merged-line runtimes initialized against Pig journal');

  const pre = await pool.query('SELECT count(*)::int AS n FROM ping_events');
  const preM = await pool.query(
    `SELECT count(*)::int AS n FROM ping_missions WHERE mission_type = 'INTELLIGENCE_RESEARCH'`
  );
  console.log(`BASELINE ping_events=${pre.rows[0].n} prior_ir_missions=${preM.rows[0].n}`);

  const brief = {
    questions: [
      'Q1: Does ALTER ROLE r IN DATABASE d SET default_transaction_read_only = on prevent role r from writing, or can r override the default per session / per transaction?',
      'Q2: Inside a read-only transaction, which write-class operations still succeed? (temp tables, advisory locks, LISTEN/NOTIFY, sequence nextval, COPY, SET, DDL)',
      'Q3: What minimal privilege configuration gives a NON-superuser role a genuinely append-only (or read-only) journal table, and what residual operations remain possible?',
      'Q4: Does our Oracle journal deployed configuration (role ping, superuser, default_transaction_read_only=on in database crx_runtime) satisfy the Q3 bar? What is the precise residual risk?',
    ],
    claims_to_verify: [
      'C1: A non-superuser role with default_transaction_read_only=on cannot INSERT in a fresh session. (predicted CONFIRMED)',
      'C2: That same role regains write ability via SET default_transaction_read_only = off or START TRANSACTION READ WRITE. (predicted CONFIRMED)',
      'C3: In a read-only transaction, CREATE TEMP TABLE succeeds. (predicted CONFIRMED)',
      'C4: In a read-only transaction, SELECT nextval(seq) fails. (predicted CONFIRMED)',
      'C5: Session advisory locks and LISTEN/NOTIFY function inside read-only transactions. (predicted UNKNOWN)',
      'C6: A SUPERUSER role bypasses default_transaction_read_only at will; the setting is a default, not a privilege boundary. (predicted CONFIRMED)',
      'C7: REVOKE INSERT, UPDATE, DELETE, TRUNCATE on the table from a non-superuser role blocks writes even in explicit READ WRITE transactions. (predicted CONFIRMED)',
      'C8: The Oracle journal deployed setting matches the claimed ALTER ROLE ping IN DATABASE crx_runtime SET default_transaction_read_only = on. (predicted CONFIRMED; verify by READ-ONLY inspection only)',
    ],
    evidence_requirements: {
      primary_source_first: true,
      acceptable_sources: [
        'experiment matrix on a disposable Postgres 16 container (exact SQL + verbatim result per trial)',
        'PostgreSQL 16 official documentation (SET TRANSACTION, runtime-config-client)',
        'read-only inspection of Oracle role configuration (pg_roles, pg_db_role_setting; zero write attempts)',
      ],
      forbidden_sources: ['prior reports from memory', 'stale documentation', 'inference without observation'],
      contradictory_evidence_rule: 'any trial contradicting a prediction is recorded as-is; a REFUTED prediction is a successful mission outcome',
      min_independent_sources: 1,
    },
    output_schema: {
      findings: [{ claim: '', verdict: 'CONFIRMED | REFUTED | UNCLEAR', evidence_event_ids: [] }],
      contradictions: [{ claim: '', observed: '', resolution: '' }],
      unresolved_questions: [''],
      synthesis_tag: 'VERIFIED | INFERRED | UNKNOWN',
      learning: '',
      next_question: '',
    },
    synthesis_rule: 'Verdict each claim only from observations made during this run. CONFIRMED requires direct experimental or read-only-inspection evidence; REFUTED requires a contradicting observation; anything not directly observed is UNCLEAR. Record every contradiction and the automatically produced unresolved-question set.',
  };

  const missionId = await createLabeledMission(missionRuntime, MISSION_LABELS.INTELLIGENCE_RESEARCH, brief, {
    tenant_id: TENANT, createdBy: 'mkos-block0-20',
  });
  console.log('MISSION_CREATED id=' + missionId);

  await missionRuntime.assign(missionId, WORKER);
  await missionRuntime.start(missionId);
  console.log(`WORKER_LIFECYCLE worker=${WORKER} state=running`);

  fs.writeFileSync('/tmp/mkos-mission-id', missionId + '\n');
  await pool.end();
}

main().then(
  () => { console.log('DRIVER_A_DONE'); process.exit(0); },
  (err) => { console.error('DRIVER_A_FAILED', err && err.message); process.exit(1); }
);
