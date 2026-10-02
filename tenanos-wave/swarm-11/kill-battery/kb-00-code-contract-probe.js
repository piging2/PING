#!/usr/bin/env node
/**
 * KB-00 — Code-contract probe (READ-ONLY, executable now).
 *
 * Verifies the structural claims in STATE-MACHINE-MAP.md against byte-exact
 * copies of the live substrate sources (fixtures/, sha256-verified at fetch).
 * Each assertion is a check a kill-battery integration test depends on.
 *
 * Usage: node kb-00-code-contract-probe.js
 * Exit 0 = all contracts hold; exit 1 = a claim is falsified (map must be updated).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const FIX = path.join(__dirname, 'fixtures');
const RUNTIME_SRC = fs.readFileSync(path.join(FIX, 's11-mission_runtime.js'), 'utf8');
const SCHED_SRC = fs.readFileSync(path.join(FIX, 's11-mission_scheduler.js'), 'utf8');
const WORKER_SRC = fs.readFileSync(path.join(FIX, 's11-worker_runtime.js'), 'utf8');
const EXECAUTH_SRC = fs.readFileSync(path.join(FIX, 's11-mission_execution_authority.js'), 'utf8');

let pass = 0, fail = 0;
const results = [];
function check(id, desc, cond) {
  if (cond) { pass++; results.push(`PASS ${id} — ${desc}`); }
  else { fail++; results.push(`FAIL ${id} — ${desc}`); }
}

// ---- M1: mission states exist in DDL/defaults and transitions ----
check('M1-S1', "statuses created/assigned/running/completed/failed/retry_pending all appear in mission_runtime.js",
  ['created', 'assigned', 'running', 'completed', 'failed', 'retry_pending']
    .every(s => RUNTIME_SRC.includes(`'${s}'`)));
check('M1-S2', "claim is conditional on status='created' (P0-1)",
  /WHERE mission_id = \$2 AND status = 'created'/.test(RUNTIME_SRC));
check('M1-S3', 'claim sets lease_until +60s atomically with the claim',
  /lease_until = NOW\(\) \+ INTERVAL '60 seconds'/.test(RUNTIME_SRC));
check('M1-S4', 'start() only from assigned',
  /SET status = 'running'[^;]*WHERE mission_id = \$1 AND status = 'assigned'/.test(RUNTIME_SRC));
check('M1-S5', 'complete() only from running',
  /SET status = 'completed'[^;]*WHERE mission_id = \$2 AND status = 'running'/.test(RUNTIME_SRC));
check('M1-S6', 'reaper resets expired leases to created (R1 mechanism)',
  /SET status = 'created', assigned_to = NULL, lease_until = NULL, claimed_at = NULL/.test(RUNTIME_SRC));
check('M1-S7', 'reaper matches only running/assigned — retry_pending NOT reaped (stale comment G4)',
  /WHERE status IN \('running', 'assigned'\)\s*\n?\s*AND lease_until IS NOT NULL/.test(RUNTIME_SRC)
  && !/reclaimRetryPending\(\)\s*\{/.test(RUNTIME_SRC));

// ---- M1 gaps: required states missing ----
check('GAP-BLOCKED', 'no blocked state in mission runtime or scheduler',
  !/['"]blocked['"]/i.test(RUNTIME_SRC) && !/['"]blocked['"]/i.test(SCHED_SRC));
check('GAP-CANCELLED', 'no cancel/cancelled state in mission runtime, scheduler, execution authority',
  !/cancel/i.test(RUNTIME_SRC) && !/cancel/i.test(SCHED_SRC) && !/cancel/i.test(EXECAUTH_SRC));
check('GAP-UNKNOWN', 'no UNKNOWN_EXECUTION state anywhere in the three core files',
  !/UNKNOWN_EXECUTION/i.test(RUNTIME_SRC + SCHED_SRC + EXECAUTH_SRC));
check('GAP-RECONCILE', 'no NEEDS_RECONCILIATION state anywhere in the three core files',
  !/NEEDS_RECONCILIATION/i.test(RUNTIME_SRC + SCHED_SRC + EXECAUTH_SRC));

// ---- M1 scheduler behavior contracts ----
check('SCH-S1', 'scheduler renews leases for in-flight set before reaping (Arrow 0 before Arrow 1)',
  SCHED_SRC.indexOf('renewLease(missionId)') < SCHED_SRC.indexOf('reapExpiredLeases()'));
check('SCH-S2', 'null dispatch is failed, not phantom-completed (P0-3)',
  /No worker matched.*— skipping/.test(SCHED_SRC) && /no worker matched event_type=/.test(SCHED_SRC));
check('SCH-S3', 'exhaustion routes to DeadLetterAuthority when wired',
  /recordDeadLetter/.test(SCHED_SRC));
check('SCH-S4', 'dispatch failure path goes through failWithRetry (retry, not instant fail)',
  /_failMission\(mission, err\.message\)/.test(SCHED_SRC) && /failWithRetry/.test(SCHED_SRC));

// ---- M2: worker runtime ----
check('WRK-S1', 'worker states idle/processing/stale present',
  WORKER_SRC.includes("'idle'") && WORKER_SRC.includes("'processing'") && WORKER_SRC.includes("'stale'"));
check('WRK-S2', 'stale derived from 60s heartbeat threshold, not persisted',
  /staleThreshold = 60000/.test(WORKER_SRC) && !/UPDATE|INSERT/.test(WORKER_SRC));

// ---- M3: phase-15 execution authority gaps ----
check('EXA-G1', 'executeMission writes execution record only as completed at the end (no start record)',
  (() => {
    const body = EXECAUTH_SRC.slice(EXECAUTH_SRC.indexOf('async executeMission'));
    const inserts = (body.match(/INSERT INTO mission_executions/g) || []).length;
    const writesRunning = /execution_status[^;]*['"]running['"]/.test(body);
    const writesPending = /VALUES\s*\([^)]*'pending'/.test(body);
    return inserts === 1 && !writesRunning && !writesPending && body.includes("'completed'");
  })());
check('EXA-G2', 'no failed execution_status write in executeMission path',
  !/execution_status.*['"]failed['"]/.test(EXECAUTH_SRC));

console.log(results.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
