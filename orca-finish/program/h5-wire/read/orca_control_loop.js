#!/usr/bin/env node
'use strict';
/**
 * ORCA Control Loop — section 20 vertical slice (Nolan directive sections 3, 4, 20).
 *
 * The smallest real control loop:
 *   OBSERVE -> PLAN -> AUTHORIZE -> DELEGATE -> MONITOR -> VERIFY EVIDENCE
 *     -> ASSESS -> (FOLLOW-UP -> ... | CLOSE) / (RETRY | ESCALATE) -> OBSERVE
 *
 * Constitutional posture (orca/ORCA-ROLE.md):
 * - ORCA observes state it does not own (MissionRuntime reads, ping_events reads).
 * - ORCA never emits canonical events itself. The ONLY writer of canonical
 *   events in this process is PING's own external_agent_adapter.recordVerifiedResult,
 *   called with PING's UnifiedEventRuntime (identity owned by computeEventId).
 * - Delegation goes through authorizeWorkOrder / issueWorkOrder (fail-closed).
 *   ORCA executes nothing; the registered Hermes worker executes.
 * - No new stores, queues, or authorities. Evidence lands in ./evidence/ as
 *   plain JSON artifacts plus canonical WORKER_COMPLETED / WORKER_FAILED events.
 * - Every stage transition is backed by a persisted artifact or live runtime state.
 *
 * Bounds (bounded autonomy): max 2 work orders per run, max 2 attempts per work
 * order, 180s dispatcher timeout, 10-minute work-order deadline. No 0.8 knowledge
 * threshold anywhere on this path.
 *
 * CRASH-SAFE REMEDIATION (2026-09-18, Nolan directive): one tightly bounded unit
 *   DURABLE OBJECTIVE IDENTITY -> DURABLE RUN RECORD -> DURABLE WORK ORDER
 *   -> CRASH-SAFE DISPATCH RENDEZVOUS -> STARTUP RECONCILIATION
 * objective_id is derived from logical intent only (namespace + objective text
 * + constraints); work_order_id from (objective_id, task_key); attempt_id from
 * (work_order_id, attempt_number). RUN_ID remains the correlation root of one
 * execution/reconciliation epoch; no identity is derived from it, from wall
 * clock, or from PIDs. Durable state lives under PING_DATA_ROOT/objectives/
 * (PING-side module ./objective-runtime.js); dispatch results rendezvous via
 * an atomic dispatcher-written file; startup reconciles before dispatching.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const ROOT = __dirname;
// Canonical adapter (2026-09-18 reconciliation, workstream (e)): one adapter,
// not two. The vendored byte-copy under vendor/ was retired; the loop requires
// the canonical module owned by workstream (d) (7 LIVE profiles, validated 26/26).
const adapter = require('../../ping-runtime/external-agent/external_agent_adapter.js');
const orcaPolicy = require('./policy/orca_policy.js');
const { OrcaStatusLedger } = require('./policy/orca_status_model.js');
const { MissionRuntime } = require('../../ping-runtime/orchestration/mission_runtime.js');
const { UnifiedEventRuntime } = require('../../ping-runtime/events/unified_event_runtime.js');
// Crash-safe remediation: PING-side objective identity + durable run state.
// Owns objective_id derivation, the durable objective/work-order store, the
// coordinator claim, the durable budget, and cancellation. Emits no canonical
// events; creates no new event store, scheduler, or mission authority.
const objRuntime = require('./objective-runtime.js');
// H5 unknown-block (harvest spec H5): post-side-effect-boundary timeouts
// are OUTCOME_UNKNOWN — blocked from auto-claim and auto-retry; only a
// recorded operator decision releases them.
const unknownBlock = require('./orca_unknown_block.js');

let PgPool;
let PgClient;
try {
  const pgm = require('/tmp/orca-pgcheck/node_modules/pg');
  PgPool = pgm.Pool;
  PgClient = pgm.Client;
} catch (_) {
  const pgm = require('pg');
  PgPool = pgm.Pool;
  PgClient = pgm.Client;
}

// One PG config for both the event pool and the dedicated coordinator-claim
// client. The claim client is a separate session: session-level advisory
// locks must be acquired and released on the same connection.
function pgConfig() {
  return {
    host: process.env.PGHOST || '127.0.0.1',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'ping_runtime',
    connectionTimeoutMillis: 10000,
  };
}

// ---------------------------------------------------------------- config ---
const NAMESPACE = 'core::system';
const AGENT_ID = 'hermes'; // only currently-authorized dispatcher family with a registered profile
const MAX_WORK_ORDERS = 2;
const MAX_ATTEMPTS = 2;
const DISPATCH_TIMEOUT_MS = 180000;
const WORK_ORDER_TTL_MS = 600000;
const CONSTRAINTS = {
  read_only: true,
  allowed_workspace: 'core::system',
  no_network: true,
  no_writes: true,
  no_canonical_events: true,
  no_mission_state_writes: true,
};
const VENV_PY = '/mnt/c/Users/nolan/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe';
const WIN_TMP = '/mnt/c/Windows/Temp';

// Crash-safe durable state: PING_DATA_ROOT/objectives/<objective_id>/
// Overridable via env; defaults to a PING-owned data dir outside the repo.
const DATA_ROOT = process.env.PING_DATA_ROOT || path.join(os.homedir(), '.ping', 'data');
// Set in main(): the durable identity of this objective (logical intent only).
let OBJECTIVE_ID = null;
// Bounded wait for a possibly-still-running dispatcher to leave its
// rendezvous file before reconciliation decides the attempt is lost.
const RECONCILE_WAIT_MS = 30000;
const RECONCILE_POLL_MS = 2000;

const RUN_TS = new Date().toISOString().replace(/[:.]/g, '-');
// RUN_ID is the correlation root of ONE execution/reconciliation epoch.
// It is NOT an identity: no objective_id, work_order_id, or attempt_id is
// derived from it, from wall clock, or from any PID (remediation 2026-09-18).
const RUN_ID = 'orca-run-' + Date.now().toString(36);
const EVIDENCE_DIR = path.join(ROOT, 'evidence', 'run-' + RUN_TS);

// Causal hierarchy (section 6): GOAL -> PROGRAM -> MISSION -> WORK ORDER -> WORKER ACTION.
// goal_id/program_id are the standing program; run_id is the correlation root.
// NOTE: the loop's mission_id (`orca-loop:<objective12>:<task>`) is an ORCA-scoped
// correlation label, NOT a MissionRuntime-minted mission: the loop never calls
// MissionRuntime.create (mission truth stays with PING). See SECTION-6 doc.
const GOAL_ID = 'orca-autonomy';
const PROGRAM_ID = 'orca-autonomy';
let workOrdersUsed = 0;
const statusLedger = new OrcaStatusLedger();
function transition(unit, to, evidence, detail) {
  return statusLedger.transition(unit, to, { evidence, detail });
}

function log(stage, msg) {
  console.log(`[orca-loop:${stage}] ${msg}`);
}
function save(name, obj) {
  fs.writeFileSync(path.join(EVIDENCE_DIR, name), JSON.stringify(obj, null, 2) + '\n');
}
function isoNow() {
  return new Date().toISOString();
}
function trimMission(m) {
  // G1 fix (part 1): the t2 trace assembly dropped mission.result, causing a
  // false-negative chain assessment. Presence (not content) is what the
  // verifier needs, so only the presence bit is preserved.
  const r = m.result;
  const resultRecorded = r !== null && r !== undefined
    && (typeof r === 'object' ? Object.keys(r).length > 0 : String(r).length > 0);
  return {
    mission_id: m.mission_id, mission_type: m.mission_type, status: m.status,
    priority: m.priority, retries: m.retries, assigned_to: m.assigned_to || null,
    created_at: m.created_at, started_at: m.started_at || null, completed_at: m.completed_at || null,
    result_recorded: resultRecorded,
  };
}

// --------------------------------------------------------------- OBSERVE ---
async function observe(pool) {
  const mr = new MissionRuntime({ pool });
  const stats = await mr.getStats();
  const pending = (await mr.getPending(10)).map(trimMission);
  const active = (await mr.getActive()).map(trimMission);
  const recent = await pool.query(
    `SELECT event_type, COUNT(*)::int AS c FROM ping_events
     WHERE timestamp > NOW() - INTERVAL '24 hours' GROUP BY 1 ORDER BY 2 DESC LIMIT 15`);
  const lastDone = await pool.query(
    `SELECT mission_id, mission_type, completed_at, retries FROM ping_missions
     WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 1`);
  let gateway = { reachable: false };
  try {
    const res = await fetch('http://127.0.0.1:8080/health');
    gateway = { reachable: true, http: res.status };
  } catch (e) {
    gateway = { reachable: false, error: String(e.message || e).slice(0, 120) };
  }
  const observation = {
    observedAt: isoNow(),
    runId: RUN_ID,
    queueStats: stats,
    pendingTop10: pending,
    active,
    recentEventCounts24h: recent.rows,
    lastCompletedMission: lastDone.rows[0] ? trimMission(lastDone.rows[0]) : null,
    gatewayHealth: gateway,
  };
  save('01-observe.json', observation);
  log('OBSERVE', `queue=${JSON.stringify(stats)} pending=${pending.length} active=${active.length} gateway=${gateway.reachable ? 'up' : 'down'}`);
  return observation;
}

// ------------------------------------------------------------------ PLAN ---
// `fault` is the section-9 recovery witness hook: 'deny' makes t1 request a
// capability in no profile's allowlist so the LIVE authorization gate genuinely
// denies it (no failure is fabricated).
function buildPlan(objective, observation, fault) {
  const plan = {
    objective,
    runId: RUN_ID,
    plannedAt: isoNow(),
    tasks: [
      {
        taskKey: 't1-queue-summary',
        capability: fault === 'deny' ? 'video.render' : 'text.summarize',
        description: 'Summarize the live mission queue state from observed data; enumerate non-terminal missions.',
        input: {
          queue_stats: observation.queueStats,
          pending_top10: observation.pendingTop10,
          active: observation.active,
          recent_event_counts_24h: observation.recentEventCounts24h,
        },
      },
    ],
    faultInjection: fault || null,
    followUpPolicy: 'After task-1 verifies: ORCA assesses remaining work from the verified output. '
      + 'Structural remaining work for this audit: evidence-chain verification of the most recent '
      + 'completed mission (task-2, text.transform, input derived from live trace at that time). '
      + 'Any non-terminal missions found are disposed in task-2 as well.',
    bounds: {
      maxWorkOrders: MAX_WORK_ORDERS, maxAttempts: MAX_ATTEMPTS,
      dispatchTimeoutMs: DISPATCH_TIMEOUT_MS, workOrderTtlMs: WORK_ORDER_TTL_MS,
    },
  };
  save('02-plan.json', plan);
  log('PLAN', `1 task planned (${plan.tasks[0].capability}); follow-up conditional on verified output`);
  return plan;
}

// ------------------------------------------------------- AUTHORIZE/DELEGATE ---
function buildWorkerPrompt(workOrder, taskBrief) {
  return [
    'You are a worker executing a PING work order. Read the whole brief, then reply',
    'with ONLY one JSON object. No prose, no markdown fences, no explanation.',
    '',
    'The JSON object must have exactly these 8 fields (echo the values exactly):',
    `  "work_order_id": "${workOrder.work_order_id}"`,
    `  "context_pack_id": "${workOrder.context_pack_id}"`,
    `  "agent_id": "${workOrder.agent_id}"`,
    `  "capability": "${workOrder.capability}"`,
    '  "status": "completed" or "failed"',
    '  "output": findings as a JSON object (must be non-null when completed, null when failed)',
    '  "evidence": {"startedAt": "<ISO>", "endedAt": "<ISO>", "host": "hermes-pig", "capabilityPerformed": "<capability>"}',
    '  "error": null when completed; a non-empty string when failed',
    '',
    `Your capability task (${workOrder.capability}):`,
    taskBrief,
    '',
    'Input data (use ONLY this data; do not invent facts):',
    JSON.stringify(workOrder.input),
    '',
    'Remember: output ONLY the JSON object.',
  ].join('\n');
}

// ------------------------------------------------- DISPATCH RENDEZVOUS ---
// Crash-safe dispatch (remediation 2026-09-18). The dispatcher (Windows
// python, independent process) atomically writes a rendezvous record to
// WIN_TMP carrying attempt metadata plus the FULL worker stdout/stderr.
// The coordinator collects that file into the durable objective results
// dir. If the coordinator is killed mid-dispatch (SIGKILL), the dispatcher
// may still finish and leave the file; startup reconciliation finds the
// same work order and the same result instead of creating a second one.
// Semantics stay: at-least-once physical transport, idempotent logical work.
// Exactly-once execution is NOT claimed.
function rendezvousDropPath(attemptId) {
  // WSL view of the same C:\Windows\Temp the Windows dispatcher writes.
  return WIN_TMP + `/orca-rendezvous-${attemptId}.json`;
}

function rendezvousDropWinPath(attemptId) {
  // Windows form of rendezvousDropPath: the dispatcher is a Windows process
  // and receives a Windows path. The filename MUST match rendezvousDropPath
  // exactly; a mismatch means the collector can never find the drop file.
  return `C:\\Windows\\Temp\\orca-rendezvous-${attemptId}.json`;
}

/**
 * Move a dispatcher-written rendezvous drop file into the durable objective
 * results dir (same filesystem: /mnt/c -> atomic rename). Returns true when
 * a drop file was collected.
 */
function collectRendezvousDrop(attemptId, workOrderId) {
  const drop = rendezvousDropPath(attemptId);
  if (!fs.existsSync(drop)) return false;
  const dest = objRuntime.rendezvousResultPath(DATA_ROOT, OBJECTIVE_ID, workOrderId);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    fs.renameSync(drop, dest);
  } catch (err) {
    // Cross-device fallback (should not happen on /mnt/c): copy then unlink.
    fs.copyFileSync(drop, dest);
    fs.unlinkSync(drop);
  }
  return true;
}

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (err) { return err && err.code !== 'ESRCH'; }
}

function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Dispatch one attempt. Async: uses spawn (not spawnSync) so the dispatcher
 * PID is recorded durably BEFORE the worker can finish, which is what lets
 * restart reconciliation tell "dispatcher may still be alive" apart from
 * "attempt lost". Never throws for transport outcomes; they are returned.
 */
async function dispatchHermes(promptText, { workOrderId, attemptId, tag }) {
  const base = `orca-${attemptId}`;
  const winDispatch = 'C:\\Windows\\Temp\\orca-hermes-dispatch.py';
  const winPrompt = `C:\\Windows\\Temp\\${base}-prompt.txt`;
  const winResult = rendezvousDropWinPath(attemptId);
  fs.copyFileSync(path.join(ROOT, 'hermes_dispatch.py'), WIN_TMP + '/orca-hermes-dispatch.py');
  fs.writeFileSync(WIN_TMP + `/${base}-prompt.txt`, promptText, 'utf8');
  const startedAt = isoNow();
  const metadata = JSON.stringify({ attempt_id: attemptId, work_order_id: workOrderId, objective_id: OBJECTIVE_ID });

  let child;
  try {
    child = spawn(VENV_PY, [winDispatch, winPrompt, winResult, metadata], { stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    return { transportError: `spawn failed: ${err.message}`, stdout: '', stderr: '', exitCode: null, timedOut: false, startedAt, endedAt: isoNow(), pid: null, rendezvous: null };
  }
  const pid = child.pid;
  // PID recorded durably the moment the dispatcher exists: the restart
  // reconciliation's orphan check depends on this write, not on dispatch
  // completing.
  try {
    objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, workOrderId, { dispatch_pid: pid });
  } catch (err) {
    log('WARN', `${tag}: could not persist dispatch pid: ${err.message}`);
  }

  const outcome = await new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (partial) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(Object.assign({ stdout, stderr }, partial));
    };
    // Coordinator-side timeout: kill the dispatcher hard. A timeout is an
    // honest failed attempt, never a silent orphan claim: the attempt record
    // says TIMED_OUT and the PID is dead, so reconciliation will not mistake
    // it for in-flight work.
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch (_) {}
      finish({ exitCode: null, signal: 'SIGKILL', timedOut: true, transportNote: 'coordinator timeout; dispatcher killed' });
    }, DISPATCH_TIMEOUT_MS);
    timer.unref();
    child.stdout.on('data', (d) => { if (stdout.length < 8 * 1024 * 1024) stdout += d.toString('utf8'); });
    child.stderr.on('data', (d) => { if (stderr.length < 512 * 1024) stderr += d.toString('utf8'); });
    child.on('error', (err) => finish({ exitCode: null, signal: null, timedOut: false, transportError: `spawn error: ${err.message}` }));
    child.on('close', (code, signal) => finish({ exitCode: code, signal: signal || null, timedOut: false }));
  });
  const endedAt = isoNow();

  // Collect the rendezvous file the dispatcher wrote (if it wrote one)
  // into the durable objective results dir.
  let collected = false;
  try { collected = collectRendezvousDrop(attemptId, workOrderId); }
  catch (err) { log('WARN', `${tag}: rendezvous collect failed: ${err.message}`); }
  let rendezvous = null;
  try { rendezvous = objRuntime.readRendezvousResult(DATA_ROOT, OBJECTIVE_ID, workOrderId); }
  catch (err) { log('WARN', `${tag}: rendezvous read failed: ${err.message}`); }

  try {
    for (const f of [WIN_TMP + '/orca-hermes-dispatch.py', WIN_TMP + `/${base}-prompt.txt`]) {
      try { fs.unlinkSync(f); } catch (_) {}
    }
  } catch (_) {}

  return {
    stdout: (rendezvous && rendezvous.stdout) || outcome.stdout || '',
    stderr: (outcome.stderr || '').slice(0, 2000),
    exitCode: outcome.exitCode,
    signal: outcome.signal || null,
    timedOut: !!outcome.timedOut,
    transportError: outcome.transportError || null,
    transportNote: outcome.transportNote || null,
    startedAt, endedAt,
    pid,
    rendezvousCollected: collected,
    rendezvous,
  };
}

function extractEnvelope(stdout) {
  const start = stdout.indexOf('{');
  if (start < 0) return { ok: false, reason: 'no JSON object found in worker stdout' };
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < stdout.length; i++) {
    const ch = stdout[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try {
          return { ok: true, envelope: JSON.parse(stdout.slice(start, i + 1)) };
        } catch (e) {
          return { ok: false, reason: 'envelope JSON parse failed: ' + e.message };
        }
      }
    }
  }
  return { ok: false, reason: 'unbalanced JSON in worker stdout' };
}

/**
 * RETIRED BY H5 (2026-09-24): the timeout path no longer constructs a failed
 * envelope. A post-boundary timeout is OUTCOME_UNKNOWN — blocked from
 * auto-claim and auto-retry until a recorded operator decision releases it —
 * so fabricating even an honest failed envelope would misclassify an
 * indeterminate outcome as failed and feed the at-least-once retry path.
 * Retained for evidence-artifact reference only.
 */
function timeoutEnvelope(workOrder, startedAt, endedAt) {
  return {
    work_order_id: workOrder.work_order_id,
    context_pack_id: workOrder.context_pack_id,
    agent_id: workOrder.agent_id,
    capability: workOrder.capability,
    status: 'failed',
    output: null,
    evidence: { startedAt, endedAt, host: 'orca-dispatcher', capabilityPerformed: workOrder.capability, note: 'dispatcher-side timeout report, not worker output' },
    error: `dispatcher timeout after ${DISPATCH_TIMEOUT_MS}ms; no worker output captured; no success fabricated`,
  };
}

// ------------------------------------------- ENFORCEMENT + RECONCILIATION ---
// Finding 10 (dead forbidden-action enforcement): prohibitedAction() is now
// called at the real ORCA dispatch boundary, before authorization becomes
// externally effective. A hit is PROHIBITED with durable evidence and the
// delegation is refused; the check itself is also persisted on the allow
// path so the gate is auditable, not merely asserted.
function enforceProhibitions({ action, briefText, taskKey, tag }) {
  let hit = orcaPolicy.prohibitedAction(action);
  if (!hit && typeof briefText === 'string' && briefText.length > 0) {
    hit = orcaPolicy.PROHIBITED_ACTIONS.find((p) => briefText.includes(p.action)) || null;
  }
  if (hit) {
    const record = {
      decisionClass: 'PROHIBITED',
      action: hit.action,
      sourceRule: hit.sourceRule,
      reason: hit.reason,
      taskKey, at: isoNow(),
    };
    save(`prohibition-${tag}.json`, record);
    log('PROHIBIT', `${taskKey}: REJECTED prohibited action '${hit.action}' (${hit.sourceRule})`);
    throw new Escalation(`prohibited action rejected before dispatch: ${hit.action}`, { tag, prohibition: record });
  }
  const allow = { decisionClass: 'ALLOWED', action, taskKey, prohibitionsChecked: orcaPolicy.PROHIBITED_ACTIONS.length, at: isoNow() };
  save(`prohibition-${tag}.json`, allow);
  log('PROHIBIT', `${taskKey}: action '${action}' not prohibited (${allow.prohibitionsChecked} prohibitions checked)`);
  return allow;
}

// Finding 11 (dead result-acceptance classifier): classifyResultAcceptance()
// is now called where worker output attempts to become accepted PING state,
// immediately before recordVerifiedResult. Its current verdict is
// REQUIRES_VERIFICATION, which routes to the verifier; a PROHIBITED verdict
// would refuse acceptance. External execution success can never self-certify
// canonical success: verification still decides.
function gateResultAcceptance({ tag }) {
  const decision = orcaPolicy.classifyResultAcceptance();
  save(`acceptance-${tag}.json`, decision);
  log('ACCEPT', `${tag}: result-acceptance gate: ${decision.decisionClass} (${decision.sourceRule})`);
  if (decision.decisionClass === 'PROHIBITED') {
    throw new Escalation(`result acceptance refused by policy: ${decision.reason}`, { tag, decision });
  }
  return decision;
}

const TERMINAL_WORK_ORDER_STATES = unknownBlock.WORK_ORDER_TERMINAL_STATES;

function isTerminalWorkOrder(dwo) {
  return !!dwo && TERMINAL_WORK_ORDER_STATES.includes(dwo.state);
}

/**
 * Append an attempt outcome to the durable work order's attempt history.
 */
function recordAttemptOutcome(workOrderId, attemptId, outcome) {
  const dwo = objRuntime.loadWorkOrder(DATA_ROOT, OBJECTIVE_ID, workOrderId);
  if (!dwo) return;
  const attempts = Array.isArray(dwo.attempt_history) ? dwo.attempt_history : [];
  const i = attempts.findIndex((a) => a.attempt_id === attemptId);
  const entry = Object.assign(
    { attempt_id: attemptId, ended_at: isoNow() },
    i >= 0 ? attempts[i] : {},
    outcome
  );
  if (i >= 0) attempts[i] = entry; else attempts.push(entry);
  objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, workOrderId, { attempt_history: attempts });
}

/**
 * Shared accept path: a rendezvous result (fresh dispatch or restart
 * reconciliation) becomes accepted PING state only through verification +
 * canonical event recording. Returns { record } or throws Escalation.
 */
async function acceptRendezvousResult({ eventRuntime, dwo, tag, result, workOrder }) {
  const ext = extractEnvelope(result.stdout || '');
  if (!ext.ok) {
    save(`dispatch-${tag}-reconcile.json`, { extraction: ext, stdoutTail: (result.stdout || '').slice(-2000) });
    objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, dwo.work_order_id, {
      state: 'VERIFICATION_FAILED',
      terminal: { status: 'protocol-failure', attempts: dwo.attempt_count || 0, reason: ext.reason, at: isoNow() },
    });
    transition(tag, 'VERIFICATION_FAILED', `dispatch-${tag}-reconcile.json`, { reason: ext.reason });
    throw new Escalation(`worker protocol failure on ${dwo.task_key} (reconciled): ${ext.reason}`, { tag });
  }
  gateResultAcceptance({ tag });
  const verifiedAt = isoNow();
  const record = await adapter.recordVerifiedResult({
    eventRuntime, result: ext.envelope, workOrder, invokedAgentId: AGENT_ID, verifiedAt,
  });
  save(`verify-${tag}-reconcile.json`, { verifiedAt, record, reconciled: true });
  if (!record.valid) {
    objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, dwo.work_order_id, {
      state: 'VERIFICATION_FAILED',
      terminal: { status: 'verification-failed', attempts: dwo.attempt_count || 0, reason: record.reason, at: isoNow() },
    });
    transition(tag, 'VERIFICATION_FAILED', `verify-${tag}-reconcile.json`, { reason: record.reason });
    throw new Escalation(`result verification failed on ${dwo.task_key} (reconciled, non-retryable): ${record.reason}`, { tag, record });
  }
  const terminalState = ext.envelope.status === 'completed' ? 'COMPLETED' : 'FAILED';
  objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, dwo.work_order_id, {
    state: terminalState,
    dispatch_pid: null,
    terminal: {
      status: ext.envelope.status,
      event_id: record.event_id,
      event_type: record.event_type,
      result_id: record.result_id,
      attempts: dwo.attempt_count || 0,
      envelope: ext.envelope,
      verified_at: verifiedAt,
      reconciled: true,
    },
  });
  transition(tag, terminalState === 'COMPLETED' ? 'VERIFIED' : 'FAILED', `verify-${tag}-reconcile.json`, { event_id: record.event_id });
  log('RECONCILE', `${dwo.task_key}: accepted reconciled result -> ${terminalState} event_id=${record.event_id}`);
  return { record, envelope: ext.envelope };
}

/**
 * Reconcile one RUNNING work order at startup. Never blindly redispatches:
 * - rendezvous result present -> verify/accept the existing result;
 * - no result, dispatcher possibly alive -> wait bounded, then leave RUNNING
 *   (delegate will refuse to redispatch while an attempt may be in flight);
 * - no result, dispatcher verifiably dead -> attempt DISPATCH_LOST, work
 *   order re-authorized so a NEW attempt may dispatch within budget.
 */
async function reconcileRunningWorkOrder({ eventRuntime, dwo, tag }) {
  const woId = dwo.work_order_id;
  const attemptId = dwo.last_attempt_id;
  collectRendezvousDrop(attemptId, woId);
  let result = null;
  try { result = objRuntime.readRendezvousResult(DATA_ROOT, OBJECTIVE_ID, woId); } catch (_) {}
  if (!result && pidAlive(dwo.dispatch_pid)) {
    log('RECONCILE', `${dwo.task_key}: dispatcher pid ${dwo.dispatch_pid} may still be alive; waiting up to ${RECONCILE_WAIT_MS}ms for rendezvous`);
    const deadline = Date.now() + RECONCILE_WAIT_MS;
    while (Date.now() < deadline) {
      await sleepMs(RECONCILE_POLL_MS);
      if (collectRendezvousDrop(attemptId, woId)) break;
    }
    try { result = objRuntime.readRendezvousResult(DATA_ROOT, OBJECTIVE_ID, woId); } catch (_) {}
  }
  if (result && result.stdout) {
    const workOrder = Object.assign(
      { work_order_id: woId, attempt: dwo.attempt_count || 1 },
      dwo.issued || {}
    );
    recordAttemptOutcome(woId, attemptId, { outcome: 'RENDEZVOUS_RECOVERED' });
    return await acceptRendezvousResult({ eventRuntime, dwo, tag, result, workOrder });
  }
  if (pidAlive(dwo.dispatch_pid)) {
    // Execution may still be in flight. Do NOT claim it stopped; do NOT
    // redispatch. The work order stays RUNNING and delegate() refuses a
    // parallel attempt.
    objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, {
      reconcile_note: `dispatcher pid ${dwo.dispatch_pid} alive, no rendezvous result; refusing redispatch`,
      reconciled_at: isoNow(),
    });
    log('RECONCILE', `${dwo.task_key}: left RUNNING (dispatcher possibly alive); will not redispatch`);
    return { status: 'in-flight' };
  }
  recordAttemptOutcome(woId, attemptId, { outcome: 'DISPATCH_LOST', note: 'dispatcher dead, no rendezvous result' });
  objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, {
    state: 'AUTHORIZED',
    dispatch_pid: null,
    last_attempt_id: null,
    reconcile_note: 'dispatch attempt lost (dispatcher dead, no rendezvous); re-dispatch allowed as a new attempt within budget',
    reconciled_at: isoNow(),
  });
  transition(tag, 'AUTHORIZED', 'reconcile-startup.json', { reason: 'attempt lost; re-authorized for a new attempt' });
  log('RECONCILE', `${dwo.task_key}: attempt ${attemptId} lost; work order re-authorized for a new attempt`);
  return { status: 'lost-redispatchable' };
}

/**
 * Startup reconciliation (remediation 2026-09-18): before any new dispatch,
 * rediscover durable work orders for this objective and reconcile them.
 * AUTHORIZED work orders dispatch normally; RUNNING ones reconcile; terminal
 * ones are never regenerated.
 */
async function reconcileStartup({ eventRuntime }) {
  const dwos = objRuntime.listWorkOrders(DATA_ROOT, OBJECTIVE_ID);
  log('RECONCILE', `${dwos.length} durable work order(s) for objective ${OBJECTIVE_ID.slice(0, 12)}`);
  save('reconcile-startup.json', {
    at: isoNow(), objective_id: OBJECTIVE_ID, run_id: RUN_ID,
    workOrders: dwos.map((w) => ({ work_order_id: w.work_order_id, task_key: w.task_key, state: w.state, attempt_count: w.attempt_count || 0 })),
  });
  for (const dwo of dwos) {
    const tag = String(dwo.task_key || 'unknown').replace(/[^a-z0-9-]/gi, '-');
    // H5 unknown-block (reconcile path): blocked work orders are never
    // re-dispatched, re-authorized, or reconciled toward dispatch here —
    // only a recorded operator decision releases them.
    if (unknownBlock.isWorkOrderBlocked(objRuntime, DATA_ROOT, OBJECTIVE_ID, dwo.work_order_id)) {
      log('RECONCILE', `${dwo.task_key}: OUTCOME_UNKNOWN blocked; awaiting recorded operator decision; leaving untouched`);
      continue;
    }
    if (isTerminalWorkOrder(dwo)) {
      log('RECONCILE', `${dwo.task_key}: terminal (${dwo.state}); no fresh work`);
      continue;
    }
    if (dwo.state === 'AUTHORIZED') {
      log('RECONCILE', `${dwo.task_key}: AUTHORIZED; will dispatch this run`);
      continue;
    }
    if (dwo.state === 'RUNNING') {
      await reconcileRunningWorkOrder({ eventRuntime, dwo, tag });
      continue;
    }
    log('RECONCILE', `${dwo.task_key}: unknown state '${dwo.state}'; leaving untouched`);
  }
}

// --------------------------------------------------------------- DELEGATE ---
// One authorized delegation: authorize -> issue -> dispatch -> monitor.
// Returns { workOrder, result, verified, record } or throws Escalation.
class Escalation extends Error {
  constructor(reason, detail) {
    super(reason);
    this.detail = detail;
  }
}

// --------------------------------------------------------------- DELEGATE ---
// One authorized delegation: authorize -> issue -> dispatch -> monitor.
// Crash-safe (remediation 2026-09-18): the work order identity is stable
// across restarts (objective_id, task_key); the budget is durable; every
// attempt is recorded before dispatch; results rendezvous durably.
// Returns { workOrder, result, verified, record } or throws Escalation.
async function delegate({ pool, eventRuntime, taskKey, capability, taskBrief, input, causationId, tag }) {
  if (!OBJECTIVE_ID) throw new Error('delegate called before objective identity was established');
  const woId = objRuntime.deriveWorkOrderId(OBJECTIVE_ID, taskKey);
  transition(tag, 'PLANNED', '02-plan.json', { taskKey, capability, agentId: AGENT_ID, work_order_id: woId });
  log('AUTHORIZE', `${taskKey}: requesting ${capability} for ${AGENT_ID} in ${NAMESPACE} (work_order_id=${woId.slice(0, 12)}...)`);

  // H5 unknown-block (pre-dispatch path): a work order carrying an unresolved
  // OUTCOME_UNKNOWN attempt is never auto-claimed, even when its durable
  // state reads AUTHORIZED. Release requires a recorded operator decision
  // (unknownBlock.releaseBlockedWorkOrder); the loop never releases it.
  if (unknownBlock.isWorkOrderBlocked(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId)) {
    const blk = unknownBlock.blockEntry(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId);
    const blockEvidence = (blk && blk.evidence) || 'unknown-block.json';
    transition(tag, 'BLOCKED', blockEvidence, { reason: 'OUTCOME_UNKNOWN unresolved; release requires a recorded operator decision' });
    throw new Escalation(
      `task ${taskKey} is OUTCOME_UNKNOWN-blocked (attempt ${blk && blk.attempt_number}); refusing to auto-claim; release requires a recorded operator decision`,
      { tag, blocked: true }
    );
  }

  // Durable budget replaces the process-local counter (finding 5): a restart
  // cannot reset consumption.
  const usage = objRuntime.budgetUsage(DATA_ROOT, OBJECTIVE_ID);
  workOrdersUsed = usage.used;
  log('BUDGET', `${taskKey}: durable work-order usage ${usage.used}/${usage.limit}`);

  // Cancellation survives restarts and blocks new work. It never claims an
  // in-flight worker stopped.
  const objRec = objRuntime.loadObjective(DATA_ROOT, OBJECTIVE_ID);
  if (objRec && objRec.cancellation) {
    transition(tag, 'BLOCKED', '00-objective.json', { reason: 'objective cancelled' });
    throw new Escalation(`objective cancelled at ${objRec.cancellation.requested_at}; no new work`, { tag });
  }

  // Re-entrant: an ACCEPTED completed work order is rediscovered, never
  // regenerated. Only COMPLETED (accepted through verification + canonical
  // event recording) is returned as a cached success. FAILED,
  // VERIFICATION_FAILED, and BLOCKED are honest terminal states: they are
  // never returned as success and never silently retried here, so the
  // objective cannot close falsely on a failed task.
  let dwo = objRuntime.loadWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId);
  if (dwo && dwo.state === 'COMPLETED' && dwo.terminal) {
    log('RECONCILE', `${taskKey}: completed work order rediscovered; returning accepted result, no fresh dispatch`);
    return {
      workOrder: { work_order_id: woId, attempt: dwo.terminal.attempts },
      result: dwo.terminal.envelope,
      record: { valid: true, event_id: dwo.terminal.event_id, event_type: dwo.terminal.event_type, result_id: dwo.terminal.result_id },
      attempts: dwo.terminal.attempts,
      cached: true,
    };
  }
  if (dwo && isTerminalWorkOrder(dwo)) {
    const prior = { state: dwo.state, terminal: dwo.terminal || null, attempt_count: dwo.attempt_count || 0 };
    save(`reconcile-${tag}-terminal.json`, {
      at: isoNow(), runId: RUN_ID, objective_id: OBJECTIVE_ID, taskKey,
      work_order_id: woId, prior,
      decision: 'refusing to reuse terminal non-completed work as success; escalating for human disposition',
    });
    transition(tag, 'BLOCKED', `reconcile-${tag}-terminal.json`, { reason: `prior terminal state ${dwo.state}; not reusable as success` });
    throw new Escalation(
      `task ${taskKey} is terminal (${dwo.state}) from a prior run; refusing to reuse as success`,
      { tag, priorState: dwo.state }
    );
  }
  if (dwo && dwo.state === 'RUNNING') {
    // Startup reconciliation left this RUNNING because the dispatcher may
    // still be alive. A parallel dispatch would risk duplicate execution.
    throw new Escalation(
      `prior dispatch attempt for ${taskKey} may still be in flight (attempt ${dwo.last_attempt_id}); refusing to redispatch`,
      { tag }
    );
  }

  // Finding 10: the dead prohibitedAction() is now enforced at the real
  // dispatch boundary, before authorization becomes externally effective.
  enforceProhibitions({ action: capability, briefText: taskBrief, taskKey, tag });

  // Section 7: the loop consults the policy BEFORE the gate. The decision
  // record is persisted as evidence; the adapter remains the final fail-closed
  // gate, and a gate denial maps back to REQUIRES_HUMAN_APPROVAL (escalate),
  // never to a bypass.
  const decision = orcaPolicy.classifyDelegation({
    adapter, agentId: AGENT_ID, capability, namespace: NAMESPACE, constraints: CONSTRAINTS,
    workOrdersUsed, runBounds: { maxWorkOrders: MAX_WORK_ORDERS, maxAttempts: MAX_ATTEMPTS },
  });
  save(`policy-${tag}.json`, Object.assign({ taskKey, capability, agentId: AGENT_ID }, decision));
  log('POLICY', `${taskKey}: ${decision.decisionClass} (${decision.sourceRule})`);
  if (decision.decisionClass !== orcaPolicy.DECISION_CLASSES.AUTO_EXECUTE) {
    transition(tag, 'BLOCKED', `policy-${tag}.json`, { reason: decision.reason });
    throw new Escalation(`policy ${decision.decisionClass} for ${taskKey}: ${decision.reason}`, { tag, decision });
  }
  transition(tag, 'AUTHORIZED', `policy-${tag}.json`, { sourceRule: decision.sourceRule });
  const auth = adapter.authorizeWorkOrder({ agentId: AGENT_ID, capability, namespace: NAMESPACE, constraints: CONSTRAINTS });
  if (!auth.granted) {
    const denyDecision = orcaPolicy.escalateUndecidable(`authorization denied for ${taskKey}: ${auth.reason}`, { tag });
    save(`policy-${tag}-deny.json`, denyDecision);
    transition(tag, 'BLOCKED', `policy-${tag}-deny.json`, { reason: auth.reason });
    throw new Escalation(`authorization denied for ${taskKey}`, auth);
  }

  // Durable work-order authorization (findings 2/4): re-entrant; the same
  // (objective_id, task_key) on a restart returns the existing record.
  dwo = objRuntime.authorizeWorkOrder(DATA_ROOT, OBJECTIVE_ID, taskKey, {
    capability, agent_id: AGENT_ID, namespace: NAMESPACE,
    task_brief_sha256: crypto.createHash('sha256').update(taskBrief, 'utf8').digest('hex'),
  });
  // Durable budget reservation: idempotent per work order; a restart cannot
  // double-consume or reset the two-work-order budget (finding 5).
  const budget = objRuntime.reserveWorkOrderBudget(DATA_ROOT, OBJECTIVE_ID, woId);
  if (!budget.ok) {
    transition(tag, 'BLOCKED', `policy-${tag}.json`, { reason: budget.reason });
    throw new Escalation(`durable work-order budget exhausted (${budget.used}/${budget.limit})`, { tag, budget });
  }
  workOrdersUsed = budget.used;

  const deadline = new Date(Date.now() + WORK_ORDER_TTL_MS).toISOString();
  const workOrder = adapter.issueWorkOrder({
    agentId: AGENT_ID, capability, namespace: NAMESPACE, taskId: taskKey,
    missionId: `orca-loop:${OBJECTIVE_ID.slice(0, 12)}:${taskKey}`,
    correlationId: OBJECTIVE_ID, contextPackId: `orca-context-${OBJECTIVE_ID.slice(0, 16)}`,
    input, constraints: CONSTRAINTS,
    resultPath: objRuntime.rendezvousResultPath(DATA_ROOT, OBJECTIVE_ID, woId),
    deadline, causationId: causationId || null, attempt: 1, workOrderId: woId,
  });
  // Persist the issued fields so restart reconciliation can verify a
  // rendezvous result against the exact issued work order.
  objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, {
    issued: {
      mission_id: workOrder.mission_id,
      task_id: workOrder.task_id,
      correlation_id: workOrder.correlation_id,
      context_pack_id: workOrder.context_pack_id,
      causation_id: workOrder.causation_id,
      agent_id: workOrder.agent_id,
      capability: workOrder.capability,
      namespace: workOrder.namespace,
      deadline: workOrder.deadline,
      result_path: workOrder.result_path,
    },
  });
  save(`workorder-${tag}.json`, workOrder);
  transition(tag, 'QUEUED', `workorder-${tag}.json`, { work_order_id: workOrder.work_order_id, attempt: 1 });
  log('DELEGATE', `${taskKey}: work_order_id=${workOrder.work_order_id} deadline=${deadline}`);

  for (;;) {
    const cur = objRuntime.loadWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId);
    const attempt = (cur.attempt_count || 0) + 1;
    if (attempt > MAX_ATTEMPTS) {
      transition(tag, 'FAILED', `dispatch-${tag}-a${MAX_ATTEMPTS}.json`, { reason: 'retry budget exhausted' });
      objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, {
        state: 'FAILED',
        terminal: { status: 'retry-budget-exhausted', attempts: cur.attempt_count || 0, at: isoNow() },
      });
      throw new Escalation(`worker reported failure on ${taskKey} after ${MAX_ATTEMPTS} attempts`, { tag });
    }
    const attemptId = objRuntime.deriveAttemptId(woId, attempt);
    // Attempt recorded BEFORE dispatch: the crash window between "dispatched"
    // and "recorded" is closed by construction (finding 8).
    objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, {
      state: 'RUNNING',
      attempt_count: attempt,
      last_attempt_id: attemptId,
      dispatch_pid: null,
    });
    recordAttemptOutcome(woId, attemptId, { attempt_number: attempt, started_at: isoNow(), outcome: 'DISPATCHING' });

    const wo = { ...workOrder, attempt };
    const prompt = buildWorkerPrompt(wo, taskBrief);
    log('MONITOR', `${taskKey}: dispatching to ${AGENT_ID} (attempt ${attempt}, id ...${attemptId.slice(-10)}, timeout ${DISPATCH_TIMEOUT_MS}ms)`);
    const disp = await dispatchHermes(prompt, { workOrderId: woId, attemptId, tag });
    recordAttemptOutcome(woId, attemptId, {
      ended_at: disp.endedAt, exit_code: disp.exitCode, signal: disp.signal,
      timed_out: disp.timedOut, transport_error: disp.transportError,
      rendezvous_collected: disp.rendezvousCollected,
    });

    if (disp.transportError && !disp.rendezvous) {
      // The dispatcher never ran: no worker output exists, so retrying as a
      // new attempt is safe and bounded by MAX_ATTEMPTS. Ledger path uses
      // only legal edges: QUEUED -> BLOCKED -> PLANNED -> AUTHORIZED -> QUEUED.
      log('DISPATCH', `${taskKey}: transport failure on attempt ${attempt}: ${disp.transportError}; re-planning within attempt budget`);
      objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, { state: 'AUTHORIZED', dispatch_pid: null, last_attempt_id: null });
      save(`dispatch-${tag}-a${attempt}.json`, { attempt, attemptId, transportError: disp.transportError, outcome: 'transport-failure-replanned' });
      transition(tag, 'BLOCKED', `dispatch-${tag}-a${attempt}.json`, { reason: `transport failure: ${disp.transportError}` });
      transition(tag, 'PLANNED', `dispatch-${tag}-a${attempt}.json`, { reason: 're-plan after transport failure' });
      transition(tag, 'AUTHORIZED', `dispatch-${tag}-a${attempt}.json`, { via: 'same authorized work order; new attempt' });
      transition(tag, 'QUEUED', `workorder-${tag}.json`, { note: 'same authorized work order; new attempt' });
      continue;
    }

    let result;
    let extractionNote = null;
    if (disp.timedOut) {
      // H5 unknown-block (timeout-after-effect T2/T3): a coordinator timeout
      // lands AFTER the dispatch crossed the side-effect boundary (the
      // dispatcher spawned the exterior worker). The worker may have
      // completed (with or without a collected rendezvous), may still be
      // running and complete later, or may never have run — the coordinator
      // cannot distinguish these. Resolving the ambiguity as failed +
      // fail-path retry would re-dispatch blindly (at-least-once exterior
      // execution); resolving it as success would fabricate an outcome. So:
      // mark the attempt OUTCOME_UNKNOWN, block the work order from
      // auto-claim and auto-retry, and escalate for a recorded operator
      // decision. No canonical event is emitted (nothing is claimed), no
      // retry is scheduled, and a collected rendezvous is preserved as
      // evidence for the operator's idempotent-keyed reconcile — never
      // auto-accepted.
      const classification = unknownBlock.classifyDispatchOutcome(disp);
      const blockEntry = {
        blocked_at: isoNow(),
        run_id: RUN_ID,
        attempt_id: attemptId,
        attempt_number: attempt,
        reason: 'coordinator timeout after dispatch; worker may have executed; outcome indeterminate',
        evidence: `dispatch-${tag}-a${attempt}.json`,
        classification,
        timed_out: true,
        rendezvous_collected: !!disp.rendezvousCollected,
        dispatch_pid: disp.pid,
        started_at: disp.startedAt,
        ended_at: disp.endedAt,
      };
      save(`dispatch-${tag}-a${attempt}.json`, {
        attempt, attemptId, timedOut: true, exitCode: disp.exitCode,
        stderr: disp.stderr, outcome: 'post-boundary-timeout-unknown',
        classification, rendezvousCollected: disp.rendezvousCollected,
        blockEntry,
      });
      recordAttemptOutcome(woId, attemptId, {
        outcome: 'TIMED_OUT_POST_BOUNDARY',
        note: 'coordinator killed dispatcher after dispatch; worker may have executed; outcome indeterminate',
        rendezvous_collected: disp.rendezvousCollected,
      });
      // Section 8: RUNNING -> EVIDENCE_PENDING (timeout captured as
      // evidence) -> BLOCKED (OUTCOME_UNKNOWN; awaiting a recorded operator
      // decision). The BLOCKED edge is the H5 unknown-block edge.
      transition(tag, 'RUNNING', `dispatch-${tag}-a${attempt}.json`, { attempt });
      transition(tag, 'EVIDENCE_PENDING', `dispatch-${tag}-a${attempt}.json`, { attempt, note: 'timeout evidence captured; outcome indeterminate' });
      transition(tag, 'BLOCKED', `dispatch-${tag}-a${attempt}.json`, { via: 'H5 unknown-block: post-boundary timeout -> OUTCOME_UNKNOWN; awaiting recorded operator decision' });
      unknownBlock.blockWorkOrder(objRuntime, DATA_ROOT, OBJECTIVE_ID, woId, blockEntry);
      objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, {
        state: 'OUTCOME_UNKNOWN',
        dispatch_pid: null,
        terminal: {
          status: 'outcome-unknown',
          attempts: attempt,
          attempt_id: attemptId,
          reason: blockEntry.reason,
          evidence: blockEntry.evidence,
          rendezvous_collected: blockEntry.rendezvous_collected,
          at: isoNow(),
        },
      });
      log('UNKNOWN-BLOCK', `${taskKey}: attempt ${attempt} timed out after dispatch; OUTCOME_UNKNOWN; work order blocked from auto-claim and auto-retry`);
      throw new Escalation(
        `post-boundary timeout on ${taskKey} (attempt ${attempt}): OUTCOME_UNKNOWN; blocked from auto-claim and auto-retry; release requires a recorded operator decision`,
        { tag, attempt, attemptId, classification }
      );
    } else {
      const ext = extractEnvelope(disp.stdout);
      if (!ext.ok) {
        // No parseable envelope: worker protocol failure. Contract: validation
        // failure is non-retryable and can never reach canonical event authority.
        save(`dispatch-${tag}-a${attempt}.json`, { timedOut: false, exitCode: disp.exitCode, stderr: disp.stderr, stdoutTail: disp.stdout.slice(-2000), extraction: ext });
        recordAttemptOutcome(woId, attemptId, { outcome: 'PROTOCOL_FAILURE', reason: ext.reason });
        objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, {
          state: 'VERIFICATION_FAILED',
          terminal: { status: 'protocol-failure', attempts: attempt, reason: ext.reason, at: isoNow() },
        });
        throw new Escalation(`worker protocol failure on ${taskKey} (attempt ${attempt}): ${ext.reason}`, { tag, attempt });
      }
      result = ext.envelope;
      extractionNote = 'envelope extracted from rendezvous-backed worker stdout';
    }
    save(`dispatch-${tag}-a${attempt}.json`, {
      attempt, attemptId, timedOut: disp.timedOut, exitCode: disp.exitCode,
      stderr: disp.stderr, extractionNote, envelope: result,
      rendezvousCollected: disp.rendezvousCollected,
    });
    // Section 8: RUNNING (dispatched) -> EVIDENCE_PENDING (result captured,
    // awaiting verification). The capture artifact backs both transitions.
    transition(tag, 'RUNNING', `dispatch-${tag}-a${attempt}.json`, { attempt });
    transition(tag, 'EVIDENCE_PENDING', `dispatch-${tag}-a${attempt}.json`, { attempt, extractionNote });

    // Finding 11: the dead classifyResultAcceptance() now gates the exact
    // point where worker output attempts to become accepted PING state.
    gateResultAcceptance({ tag });
    const verifiedAt = isoNow();
    const record = await adapter.recordVerifiedResult({
      eventRuntime, result, workOrder: wo, invokedAgentId: AGENT_ID, verifiedAt,
    });
    save(`verify-${tag}-a${attempt}.json`, { verifiedAt, record });
    save(`result-${tag}.json`, result); // run-scoped evidence copy of the captured envelope

    if (!record.valid) {
      transition(tag, 'VERIFICATION_FAILED', `verify-${tag}-a${attempt}.json`, { reason: record.reason });
      recordAttemptOutcome(woId, attemptId, { outcome: 'VERIFICATION_FAILED', reason: record.reason });
      objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, {
        state: 'VERIFICATION_FAILED',
        terminal: { status: 'verification-failed', attempts: attempt, reason: record.reason, at: isoNow() },
      });
      throw new Escalation(`result verification failed on ${taskKey} (non-retryable): ${record.reason}`, { tag, attempt, record });
    }

    if (result.status === 'failed') {
      // Sections 7/8/9: a verified failed envelope is a FAILED unit outcome,
      // not a VERIFIED one. A granted retry is re-plan from recorded failure:
      // EVIDENCE_PENDING -> FAILED -> PLANNED -> AUTHORIZED -> QUEUED, then the
      // next attempt dispatches. VERIFIED may only CLOSE, so the failed
      // envelope must never take the VERIFIED state on the retry path.
      const retryDecision = orcaPolicy.classifyRetry({
        attempt, maxAttempts: MAX_ATTEMPTS, failureKind: disp.timedOut ? 'timeout' : 'worker-failed',
      });
      save(`policy-${tag}-retry-a${attempt}.json`, retryDecision);
      transition(tag, 'FAILED', `verify-${tag}-a${attempt}.json`, {
        reason: `worker-reported failed (attempt ${attempt}/${MAX_ATTEMPTS})`,
        event_id: record.event_id, retryDecision: retryDecision.decisionClass,
      });
      recordAttemptOutcome(woId, attemptId, { outcome: 'WORKER_FAILED', event_id: record.event_id });
      if (retryDecision.decisionClass !== orcaPolicy.DECISION_CLASSES.AUTO_EXECUTE) {
        objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, {
          state: 'FAILED',
          terminal: { status: 'failed', attempts: attempt, event_id: record.event_id, event_type: record.event_type, result_id: record.result_id, envelope: result, verified_at: verifiedAt },
        });
        throw new Escalation(`worker reported failure on ${taskKey} (attempt ${attempt}): ${retryDecision.reason}`, { tag, attempt, retryDecision });
      }
      objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, { state: 'AUTHORIZED', dispatch_pid: null, last_attempt_id: null });
      transition(tag, 'PLANNED', `policy-${tag}-retry-a${attempt}.json`, { reason: 're-plan from recorded failure' });
      transition(tag, 'AUTHORIZED', `policy-${tag}-retry-a${attempt}.json`, { via: 'retry policy AUTO_EXECUTE (same authorized task)' });
      transition(tag, 'QUEUED', `workorder-${tag}.json`, { note: 'same authorized work order; new attempt' });
      log('RETRY', `${taskKey}: worker reported failure; re-planned same task (attempt ${attempt + 1}) through the authorized path (${retryDecision.sourceRule})`);
      continue;
    }
    transition(tag, 'VERIFIED', `verify-${tag}-a${attempt}.json`, { event_id: record.event_id, result_id: record.result_id });
    recordAttemptOutcome(woId, attemptId, { outcome: 'ACCEPTED', event_id: record.event_id });
    objRuntime.updateWorkOrder(DATA_ROOT, OBJECTIVE_ID, woId, {
      state: 'COMPLETED',
      dispatch_pid: null,
      terminal: {
        status: 'completed', attempts: attempt,
        event_id: record.event_id, event_type: record.event_type, result_id: record.result_id,
        envelope: result, verified_at: verifiedAt,
      },
    });
    log('VERIFY', `${taskKey}: ${record.event_type} event_id=${record.event_id} result_id=${record.result_id}`);
    return { workOrder: wo, result, record, attempts: attempt };
  }
}

// -------------------------------------------------------- ASSESS / FOLLOW-UP ---
async function assessAndFollowUp({ pool, eventRuntime, observation, t1 }) {
  // Section 7: follow-ups are proposed only from VERIFIED evidence.
  const followUpDecision = orcaPolicy.classifyFollowUp({
    derivedFromVerified: !!(t1 && t1.record && t1.record.valid),
    followUpKind: 'evidence-chain-verification',
  });
  save('policy-followup.json', followUpDecision);
  log('POLICY', `follow-up: ${followUpDecision.decisionClass} (${followUpDecision.sourceRule})`);
  if (followUpDecision.decisionClass === orcaPolicy.DECISION_CLASSES.REQUIRES_HUMAN_APPROVAL) {
    throw new Escalation(`follow-up not permitted: ${followUpDecision.reason}`, { followUpDecision });
  }
  const out = t1.result.output || {};
  const nonTerminal = Array.isArray(out.non_terminal) ? out.non_terminal : [];
  const assessment = {
    assessedAt: isoNow(),
    task1EventId: t1.record.event_id,
    nonTerminalFromTask1: nonTerminal,
    remainingWork: [],
  };
  if (nonTerminal.length > 0) {
    assessment.remainingWork.push({ kind: 'non-terminal-missions', count: nonTerminal.length });
  }
  // Structural remaining work for this audit objective: the summary in task-1 is
  // only as trustworthy as the evidence chain behind it. Verifying the chain of
  // the most recent completed mission is derived from observed state, not pre-scripted.
  const target = observation.lastCompletedMission;
  if (target) {
    assessment.remainingWork.push({ kind: 'evidence-chain-verification', mission_id: target.mission_id });
  } else {
    assessment.remainingWork.push({ kind: 'evidence-chain-verification', mission_id: null, note: 'no completed missions observed; nothing to verify' });
  }
  const followUpNeeded = assessment.remainingWork.some(r => r.kind === 'evidence-chain-verification' && r.mission_id)
    || nonTerminal.length > 0;
  assessment.followUpNeeded = followUpNeeded;
  save('20-assess.json', assessment);
  log('ASSESS', `remaining work: ${assessment.remainingWork.map(r => r.kind).join(', ')}; follow-up ${followUpNeeded ? 'SCHEDULED' : 'not needed'}`);
  if (!followUpNeeded) return { assessment, t2: null };

  // Build task-2 input from LIVE state at follow-up time (not from the plan).
  const mr = new MissionRuntime({ pool });
  const trace = await mr.getTrace(target.mission_id);
  // G1 fix (part 2): MISSION_* lifecycle events carry their own correlation_ids,
  // so the correlation trace misses them (this was the t2 false negative).
  // Query them by payload->>'missionId' and merge with the correlation trace.
  const lifecycle = await pool.query(
    `SELECT event_id, event_type, timestamp, metadata, payload FROM ping_events
     WHERE event_type LIKE 'MISSION\\_%' AND payload->>'missionId' = $1
     ORDER BY timestamp ASC`,
    [target.mission_id]
  );
  const seen = new Set((trace ? trace.events : []).map(e => e.event_id));
  const merged = (trace ? trace.events : []).concat(
    lifecycle.rows.filter(e => !seen.has(e.event_id))
  );
  merged.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const chainEvents = merged.map(e => ({
    event_id: e.event_id, event_type: e.event_type, timestamp: e.timestamp,
    correlation_id: (e.metadata && e.metadata.correlation_id) || null,
    event_source: seen.has(e.event_id) ? 'correlation-trace' : 'mission-lifecycle-query',
  }));
  const taskBrief = [
    'Verify the evidence chain for one completed mission, and dispose any non-terminal missions.',
    '(1) Confirm the chain contains MISSION_CREATED, MISSION_ASSIGNED, MISSION_STARTED, MISSION_COMPLETED in order,',
    '    with matching mission_id and one shared correlation_id; list any gap.',
    '(2) Confirm a result payload was recorded on the mission.',
    '(3) For each non-terminal mission below (empty list means none exist): disposition one of',
    '    retry-safe / escalate-human / no-action with a one-line reason each.',
    'Output: {"chain_complete": true/false, "gaps": [...], "result_recorded": true/false,',
    '         "dispositions": [{"mission_id": "...", "disposition": "...", "reason": "..."}], "verification_note": "..."}',
  ].join('\n');
  const t2 = await delegate({
    pool, eventRuntime,
    taskKey: 't2-chain-verify',
    capability: 'text.transform',
    taskBrief,
    input: {
      mission_under_verification: trimMission(trace ? trace.mission : target),
      chain_event_count: chainEvents.length,
      chain_events: chainEvents,
      non_terminal_missions: nonTerminal,
    },
    causationId: t1.record.event_id,
    tag: 't2',
  });
  return { assessment, t2 };
}

// ------------------------------------------------------------------- MAIN ---
// ------------------------------------------------------------------- MAIN ---
// Crash-safe startup (remediation 2026-09-18):
//   1. derive + register the durable objective identity (logical intent only);
//   2. honor durable cancellation (blocks new work, survives restart);
//   3. refuse to regenerate work for a terminal objective;
//   4. claim the single-coordinator lock (second coordinator exits);
//   5. reconcile durable work orders BEFORE any new dispatch;
//   6. run the normal OBSERVE -> ... -> CLOSE flow on the reconciled state.
// Single-coordinator claim lifecycle. The claim is a PostgreSQL
// session-level advisory lock held on lockClient (a dedicated session) for
// the whole run. Graceful paths release explicitly below; a crash (including
// SIGKILL) drops the session and the database releases the lock, so no
// stale-holder detection is needed.
let lockReleased = false;
let lockClient = null;
async function releaseCoordinatorClaim() {
  if (lockReleased || !OBJECTIVE_ID || !lockClient) return;
  lockReleased = true;
  try { await objRuntime.releaseCoordinatorLock(lockClient, DATA_ROOT, OBJECTIVE_ID); } catch (_) {}
  try { await lockClient.end(); } catch (_) {}
}
function releaseClaimAndExit(code) {
  let done = false;
  const finish = () => { if (!done) { done = true; process.exit(code); } };
  releaseCoordinatorClaim().then(finish, finish);
  setTimeout(finish, 2000).unref();
}
process.on('SIGINT', () => releaseClaimAndExit(130));
process.on('SIGTERM', () => releaseClaimAndExit(143));

async function main() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  statusLedger.setDir(EVIDENCE_DIR);
  const objective = (process.argv.find(a => a.startsWith('--objective=')) || '')
    .slice('--objective='.length)
    || 'Audit the live PING mission queue: summarize backlog by status, then verify the evidence chain of the most recent completed mission.';
  const fault = (process.argv.find(a => a.startsWith('--fault=')) || '').slice('--fault='.length) || null;
  const probeProhibited = (process.argv.find(a => a.startsWith('--probe-prohibited=')) || '').slice('--probe-prohibited='.length) || null;

  // 1. Durable objective identity: logical intent only. The same objective
  // text on a restart yields the SAME objective_id; nothing here depends on
  // RUN_ID, wall clock, or PID.
  OBJECTIVE_ID = objRuntime.deriveObjectiveId({ namespace: NAMESPACE, objectiveText: objective, constraints: CONSTRAINTS });
  const objRec = objRuntime.registerObjective(DATA_ROOT, NAMESPACE, objective, { constraints: CONSTRAINTS, maxWorkOrders: MAX_WORK_ORDERS });
  save('00-objective.json', {
    objective, objective_id: OBJECTIVE_ID, runId: RUN_ID, suppliedBy: 'human-once', at: isoNow(),
    goal_id: GOAL_ID, program_id: PROGRAM_ID, data_root: DATA_ROOT,
    causal: { goal_id: GOAL_ID, program_id: PROGRAM_ID, run_id: RUN_ID, objective_id: OBJECTIVE_ID },
    faultInjection: fault,
  });
  log('START', `run ${RUN_ID}; objective ${OBJECTIVE_ID.slice(0, 12)} registered (state=${objRec.state})`);

  // 2. Durable cancellation: the operator signal is a cancel.requested file
  // in the objective dir. Cancellation blocks all new work and survives
  // restarts; it is never equated with killing a worker.
  if (fs.existsSync(objRuntime.cancelRequestPath(DATA_ROOT, OBJECTIVE_ID)) && !objRec.cancellation) {
    const cancelled = objRuntime.recordCancellation(DATA_ROOT, OBJECTIVE_ID, 'cancel.requested marker present at startup');
    save('00-cancelled.json', { at: isoNow(), runId: RUN_ID, cancellation: cancelled.cancellation });
    log('CANCEL', `objective cancelled (${cancelled.cancellation.reason}); no new work will be issued`);
  }
  const freshRec = objRuntime.loadObjective(DATA_ROOT, OBJECTIVE_ID);
  if (freshRec.cancellation) {
    log('CANCEL', `objective already cancelled at ${freshRec.cancellation.requested_at}; exiting without new work`);
    process.exit(4);
  }

  // 3. Terminal objective: never generate fresh work on restart. A genuinely
  // new budget epoch requires explicit operator intent: a new objective.
  if (freshRec.state === 'COMPLETED') {
    log('START', `objective ${OBJECTIVE_ID.slice(0, 12)} already COMPLETED; no fresh work`);
    process.exit(0);
  }

  // 4. Single-coordinator claim: exactly one live coordinator owns execution
  // for this objective. A second concurrent coordinator exits. The claim is
  // a PostgreSQL session-level advisory lock on a dedicated client: acquire
  // is atomic (no read-then-write race), and SIGKILL-safe because the
  // database releases the lock when the holder's session drops.
  lockClient = new PgClient(pgConfig());
  try {
    await lockClient.connect();
  } catch (err) {
    log('LOCK', `cannot reach PostgreSQL for coordinator claim: ${err.message}; exiting without dispatching`);
    lockClient = null;
    process.exit(5);
  }
  const claim = await objRuntime.acquireCoordinatorLock(lockClient, DATA_ROOT, OBJECTIVE_ID);
  if (!claim.acquired) {
    log('LOCK', `coordinator claim for objective ${OBJECTIVE_ID.slice(0, 12)} held by another live coordinator; this process exits`);
    try { await lockClient.end(); } catch (_) {}
    lockClient = null;
    process.exit(5);
  }
  log('LOCK', `coordinator claim acquired (pid ${process.pid}, pg_backend_pid ${claim.pgBackendPid})`);

  // Test hook for prohibition enforcement: --probe-prohibited=<action> must
  // be rejected with durable evidence, or the probe fails.
  if (probeProhibited) {
    try {
      enforceProhibitions({ action: probeProhibited, briefText: '', taskKey: 'probe', tag: 'probe' });
      log('PROBE', `FAILURE: prohibited action '${probeProhibited}' was NOT rejected`);
      await releaseCoordinatorClaim();
      process.exit(1);
    } catch (err) {
      if (err instanceof Escalation) {
        log('PROBE', `prohibited action '${probeProhibited}' rejected with durable evidence (prohibition-probe.json)`);
        await releaseCoordinatorClaim();
        process.exit(0);
      }
      throw err;
    }
  }

  const pool = new PgPool(pgConfig());
  // PING's canonical event runtime, injected into recordVerifiedResult.
  // Identity stays with UnifiedEventRuntime.computeEventId; this process mints nothing.
  const eventRuntime = new UnifiedEventRuntime({ pool });

  try {
    // 5. Startup reconciliation BEFORE any new dispatch.
    await reconcileStartup({ eventRuntime });

    const observation = await observe(pool);          // OBSERVE
    const plan = buildPlan(objective, observation, fault);   // PLAN
    const t1Brief = [
      'Summarize the live PING mission queue state for an operator, using ONLY the input data.',
      '(1) counts by status; (2) every non-terminal mission (created/retry_pending/assigned/running/failed)',
      '    with mission_id, mission_type, status, retries; (3) last-24h lifecycle event counts and whether',
      '    the pipeline looks healthy; (4) one-paragraph plain-language summary.',
      'Output: {"queue_summary": "...", "counts_by_status": {...}, "non_terminal": [...],',
      '         "pipeline_24h": "...", "health_note": "..."}',
    ].join('\n');
    const t1 = await delegate({                         // AUTHORIZE -> DELEGATE -> MONITOR -> VERIFY
      pool, eventRuntime, taskKey: plan.tasks[0].taskKey,
      capability: plan.tasks[0].capability, taskBrief: t1Brief,
      input: plan.tasks[0].input, causationId: null, tag: 't1',
    });
    const { assessment, t2 } = await assessAndFollowUp({ pool, eventRuntime, observation, t1 }); // ASSESS -> FOLLOW-UP
    const close = {
      closedAt: isoNow(), runId: RUN_ID, objective_id: OBJECTIVE_ID, outcome: 'closed',
      workOrders: [
        { tag: 't1', work_order_id: t1.workOrder.work_order_id, event_id: t1.record.event_id, attempts: t1.attempts },
        ...(t2 ? [{ tag: 't2', work_order_id: t2.workOrder.work_order_id, event_id: t2.record.event_id, attempts: t2.attempts }] : []),
      ],
      assessment,
    };
    save('99-close.json', close);
    transition('t1', 'CLOSED', '99-close.json', { work_order_id: t1.workOrder.work_order_id });
    if (t2) transition('t2', 'CLOSED', '99-close.json', { work_order_id: t2.workOrder.work_order_id });
    // 6. Mark the objective terminal: a restart with the same objective text
    // rediscovers COMPLETED and issues no fresh work.
    objRuntime.setObjectiveState(DATA_ROOT, OBJECTIVE_ID, 'COMPLETED', { closed_at: isoNow(), close_run_id: RUN_ID });
    log('CLOSE', `run closed; ${close.workOrders.length} work order(s), events: ${close.workOrders.map(w => w.event_id).join(', ')}; objective marked COMPLETED`);
    await releaseCoordinatorClaim();
    await pool.end();
    process.exit(0);
  } catch (err) {
    if (err instanceof Escalation) {
      const esc = { escalatedAt: isoNow(), runId: RUN_ID, objective_id: OBJECTIVE_ID, reason: err.message, detail: err.detail || null };
      try { save('99-escalate.json', esc); } catch (_) {}
      try {
        const tag = (err.detail && err.detail.tag) || 'run';
        const cur = statusLedger.current(tag);
        if (cur && !['FAILED', 'VERIFICATION_FAILED', 'CLOSED', 'BLOCKED'].includes(cur)) {
          transition(tag, 'BLOCKED', '99-escalate.json', { reason: err.message });
        }
      } catch (_) {}
      log('ESCALATE', err.message);
      await releaseCoordinatorClaim();
      await pool.end();
      process.exit(3);
    }
    try { save('99-fatal.json', { at: isoNow(), runId: RUN_ID, objective_id: OBJECTIVE_ID, error: String(err && err.stack || err) }); } catch (_) {}
    log('FATAL', String(err && err.stack || err));
    await releaseCoordinatorClaim();
    await pool.end();
    process.exit(2);
  }
}

main();
