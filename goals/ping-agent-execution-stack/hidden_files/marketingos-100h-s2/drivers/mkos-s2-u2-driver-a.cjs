'use strict';
/* MarketingOS 100h, Sprint 2, Block 0-15, Driver U2-A: create the INTELLIGENCE_RESEARCH mission.
 * Existing machinery only: merged-line UnifiedEventRuntime + MissionRuntime +
 * mission_labels.createLabeledMission against the live Pig journal
 * (brain-postgres / ping_runtime). No new runtimes, stores, authorities.
 * DB credential read at runtime from the live Pig ping-gateway container env
 * (same-plane config, never printed, never logged, never in a payload).
 * The research brief was written and committed BEFORE any research began
 * (BLOCK-S2-0-15-RESEARCH-BRIEF.md, commit ff6fca5).
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const WT = '/home/nolan/ping-worktrees/deploy-merge-20260930';
const TENANT = 'ping-ops';
const WORKER = 'mkos-s2-u2-research-worker';

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

  // Design = the committed brief's hypothesis (BLOCK-S2-0-15-RESEARCH-BRIEF.md, commit ff6fca5).
  // Sprint 1 left thesis E ("the triggers are the real seal") INCONCLUSIVE for lack of this test.
  const brief = {
    hypothesis: 'Thesis E: the two append-only triggers on the journal table (trg_ping_events_append_only / trg_ping_events_append_only_truncate, function ping_events_no_mutation) are the real seal: they bind every role that can reach the table. The triggers are SUPPORTED as the seal only if U2-C1..C4 and U2-C7 hold as predicted. Thesis E is FALSIFIED or SCOPED if U2-C5 or U2-C6 is CONFIRMED (a superuser session_replication_role bypass or an owner DROP TRIGGER means the triggers bind only non-owner, non-superuser roles -- the same scoping pattern as sprint 1 C-F2).',
    questions: [
      'Q1: Does an UPDATE on a trigger-protected table raise the append-only exception (C1)?',
      'Q2: Does a DELETE on a trigger-protected table raise the append-only exception (C2)?',
      'Q3: Does a TRUNCATE on a trigger-protected table raise the append-only exception (C3)?',
      'Q4: Can a non-superuser, non-owner role bypass via SET session_replication_role (C4)?',
      'Q5: Can a superuser bypass via SET session_replication_role = replica (C5)?',
      'Q6: Can the table owner (non-superuser) DROP TRIGGER on its own table (C6)?',
      'Q7: With default_transaction_read_only=on + explicit START TRANSACTION READ WRITE, does the trigger still fire on UPDATE (C7)?',
    ],
    claims_to_verify: [
      'U2-C1: UPDATE on a trigger-protected table raises the append-only exception. (method: trial, disposable PG; predicted CONFIRMED)',
      'U2-C2: DELETE on a trigger-protected table raises the append-only exception. (method: trial, disposable PG; predicted CONFIRMED)',
      'U2-C3: TRUNCATE on a trigger-protected table raises the append-only exception. (method: trial, disposable PG; predicted CONFIRMED)',
      'U2-C4: a non-superuser, non-owner role CANNOT bypass via SET session_replication_role (permission denied). (method: trial, disposable PG; predicted CONFIRMED)',
      'U2-C5: a superuser CAN bypass via SET session_replication_role = replica (triggers do not fire). (method: trial, disposable PG; predicted CONFIRMED)',
      'U2-C6: the table owner (non-superuser) CAN DROP TRIGGER on its own table. (method: trial + PG docs; predicted CONFIRMED)',
      'U2-C7: with default_transaction_read_only=on + explicit START TRANSACTION READ WRITE, the trigger still fires on UPDATE (defense in depth, trigger is the second layer). (method: trial, disposable PG; predicted CONFIRMED)',
    ],
    evidence_requirements: {
      primary_source_first: true,
      acceptable_sources: [
        'trial matrix on disposable database mkos_u2_disposable on the Pig postgres (PG 15): function + triggers recreated VERBATIM from the Oracle capture; exact SQL + verbatim result per trial',
        'PostgreSQL official documentation for owner/superuser semantics (cited as docs where not trialed)',
      ],
      forbidden_sources: ['Oracle writes of any kind', 'prior reports from memory', 'inference without observation'],
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
    synthesis_rule: 'Verdict each claim only from observations made during this run. CONFIRMED requires direct experimental or documented evidence; REFUTED requires a contradicting observation; anything not directly observed is UNCLEAR. Record every contradiction. Trials run on PG 15 (Pig); Oracle runs PG 17 -- record the version caveat (U3 still open).',
  };

  const missionId = await createLabeledMission(missionRuntime, MISSION_LABELS.INTELLIGENCE_RESEARCH, brief, {
    tenant_id: TENANT, createdBy: 'mkos-s2-u2',
  });
  console.log('MISSION_CREATED id=' + missionId);

  await missionRuntime.assign(missionId, WORKER);
  await missionRuntime.start(missionId);
  console.log(`WORKER_LIFECYCLE worker=${WORKER} state=running`);

  fs.writeFileSync('/tmp/mkos-s2-u2-mission-id', missionId + String.fromCharCode(10));
  await pool.end();
}

main().then(
  () => { console.log('DRIVER_U2_A_DONE'); process.exit(0); },
  (err) => { console.error('DRIVER_U2_A_FAILED', err && err.message); process.exit(1); }
);
