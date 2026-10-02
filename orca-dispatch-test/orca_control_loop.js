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
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = __dirname;
const adapter = require('./vendor/external-agent/external_agent_adapter.js');
const { MissionRuntime } = require('../../ping-runtime/orchestration/mission_runtime.js');
const { UnifiedEventRuntime } = require('../../ping-runtime/events/unified_event_runtime.js');

let PgPool;
try {
  PgPool = require('/tmp/orca-pgcheck/node_modules/pg').Pool;
} catch (_) {
  PgPool = require('pg').Pool;
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

const RUN_TS = new Date().toISOString().replace(/[:.]/g, '-');
const RUN_ID = 'orca-run-' + Date.now().toString(36);
const EVIDENCE_DIR = path.join(ROOT, 'evidence', 'run-' + RUN_TS);

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
  return {
    mission_id: m.mission_id, mission_type: m.mission_type, status: m.status,
    priority: m.priority, retries: m.retries, assigned_to: m.assigned_to || null,
    created_at: m.created_at, started_at: m.started_at || null, completed_at: m.completed_at || null,
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
function buildPlan(objective, observation) {
  const plan = {
    objective,
    runId: RUN_ID,
    plannedAt: isoNow(),
    tasks: [
      {
        taskKey: 't1-queue-summary',
        capability: 'text.summarize',
        description: 'Summarize the live mission queue state from observed data; enumerate non-terminal missions.',
        input: {
          queue_stats: observation.queueStats,
          pending_top10: observation.pendingTop10,
          active: observation.active,
          recent_event_counts_24h: observation.recentEventCounts24h,
        },
      },
    ],
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

function dispatchHermes(promptText, workOrderId) {
  const base = `orca-${workOrderId}`;
  const winDispatch = 'C:\\Windows\\Temp\\orca-hermes-dispatch.py';
  const winPrompt = `C:\\Windows\\Temp\\${base}-prompt.txt`;
  fs.copyFileSync(path.join(ROOT, 'hermes_dispatch.py'), WIN_TMP + '/orca-hermes-dispatch.py');
  fs.writeFileSync(WIN_TMP + `/${base}-prompt.txt`, promptText, 'utf8');
  const startedAt = isoNow();
  try {
    const r = spawnSync(VENV_PY, [winDispatch, winPrompt], {
      timeout: DISPATCH_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8',
    });
    const endedAt = isoNow();
    const timedOut = r.error && (r.error.code === 'ETIMEDOUT' || /timed out/i.test(r.error.message));
    return { stdout: r.stdout || '', stderr: (r.stderr || '').slice(0, 2000), exitCode: r.status, timedOut: !!timedOut, startedAt, endedAt };
  } finally {
    for (const f of [WIN_TMP + '/orca-hermes-dispatch.py', WIN_TMP + `/${base}-prompt.txt`]) {
      try { fs.unlinkSync(f); } catch (_) {}
    }
  }
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

// --------------------------------------------------------------- DELEGATE ---
// One authorized delegation: authorize -> issue -> dispatch -> monitor.
// Returns { workOrder, result, verified, record } or throws Escalation.
class Escalation extends Error {
  constructor(reason, detail) {
    super(reason);
    this.detail = detail;
  }
}

async function delegate({ pool, eventRuntime, taskKey, capability, taskBrief, input, causationId, tag }) {
  const taskId = `${RUN_ID}-${taskKey}`;
  log('AUTHORIZE', `${taskKey}: requesting ${capability} for ${AGENT_ID} in ${NAMESPACE}`);
  const auth = adapter.authorizeWorkOrder({ agentId: AGENT_ID, capability, namespace: NAMESPACE, constraints: CONSTRAINTS });
  if (!auth.granted) {
    throw new Escalation(`authorization denied for ${taskKey}`, auth);
  }
  const deadline = new Date(Date.now() + WORK_ORDER_TTL_MS).toISOString();
  const workOrder = adapter.issueWorkOrder({
    agentId: AGENT_ID, capability, namespace: NAMESPACE, taskId,
    missionId: `orca-loop:${RUN_ID}:${taskKey}`,
    correlationId: RUN_ID, contextPackId: `orca-context-${RUN_ID}`,
    input, constraints: CONSTRAINTS,
    resultPath: path.join(EVIDENCE_DIR, `result-${tag}.json`),
    deadline, causationId: causationId || null, attempt: 1,
  });
  save(`workorder-${tag}.json`, workOrder);
  log('DELEGATE', `${taskKey}: work_order_id=${workOrder.work_order_id} deadline=${deadline}`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const wo = attempt === 1 ? workOrder : { ...workOrder, attempt };
    const prompt = buildWorkerPrompt(wo, taskBrief);
    log('MONITOR', `${taskKey}: dispatching to ${AGENT_ID} (attempt ${attempt}, timeout ${DISPATCH_TIMEOUT_MS}ms)`);
    const disp = dispatchHermes(prompt, wo.work_order_id);
    let result;
    let extractionNote = null;
    if (disp.timedOut) {
      result = timeoutEnvelope(wo, disp.startedAt, disp.endedAt);
      extractionNote = 'dispatcher timeout; honest failed envelope constructed by dispatcher (no success fabricated)';
    } else {
      const ext = extractEnvelope(disp.stdout);
      if (!ext.ok) {
        // No parseable envelope: worker protocol failure. Contract: validation
        // failure is non-retryable and can never reach canonical event authority.
        save(`dispatch-${tag}-a${attempt}.json`, { timedOut: false, exitCode: disp.exitCode, stderr: disp.stderr, stdoutTail: disp.stdout.slice(-2000), extraction: ext });
        throw new Escalation(`worker protocol failure on ${taskKey} (attempt ${attempt}): ${ext.reason}`, { tag, attempt });
      }
      result = ext.envelope;
      extractionNote = 'envelope extracted from worker stdout';
    }
    save(`dispatch-${tag}-a${attempt}.json`, {
      attempt, timedOut: disp.timedOut, exitCode: disp.exitCode,
      stderr: disp.stderr, extractionNote, envelope: result,
    });

    const verifiedAt = isoNow();
    const record = await adapter.recordVerifiedResult({
      eventRuntime, result, workOrder: wo, invokedAgentId: AGENT_ID, verifiedAt,
    });
    save(`verify-${tag}-a${attempt}.json`, { verifiedAt, record });
    save(`result-${tag}.json`, result); // PING-side persistence of the captured envelope

    if (!record.valid) {
      throw new Escalation(`result verification failed on ${taskKey} (non-retryable): ${record.reason}`, { tag, attempt, record });
    }
    log('VERIFY', `${taskKey}: ${record.event_type} event_id=${record.event_id} result_id=${record.result_id}`);

    if (result.status === 'failed' && attempt < MAX_ATTEMPTS) {
      log('RETRY', `${taskKey}: worker reported failure; re-issuing same task (attempt ${attempt + 1}) through the authorized path`);
      continue;
    }
    return { workOrder: wo, result, record, attempts: attempt };
  }
  throw new Escalation(`worker reported failure on ${taskKey} after ${MAX_ATTEMPTS} attempts`, { tag });
}

// -------------------------------------------------------- ASSESS / FOLLOW-UP ---
async function assessAndFollowUp({ pool, eventRuntime, observation, t1 }) {
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
  const chainEvents = (trace ? trace.events : []).map(e => ({
    event_id: e.event_id, event_type: e.event_type, timestamp: e.timestamp,
    correlation_id: (e.metadata && e.metadata.correlation_id) || null,
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
async function main() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const objective = (process.argv.find(a => a.startsWith('--objective=')) || '')
    .slice('--objective='.length)
    || 'Audit the live PING mission queue: summarize backlog by status, then verify the evidence chain of the most recent completed mission.';
  save('00-objective.json', { objective, runId: RUN_ID, suppliedBy: 'human-once', at: isoNow() });
  log('START', `run ${RUN_ID}; objective recorded`);

  const pool = new PgPool({
    host: process.env.PGHOST || '127.0.0.1',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'ping_runtime',
    connectionTimeoutMillis: 10000,
  });
  // PING's canonical event runtime, injected into recordVerifiedResult.
  // Identity stays with UnifiedEventRuntime.computeEventId; this process mints nothing.
  const eventRuntime = new UnifiedEventRuntime({ pool });

  try {
    const observation = await observe(pool);          // OBSERVE
    const plan = buildPlan(objective, observation);   // PLAN
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
      capability: 'text.summarize', taskBrief: t1Brief,
      input: plan.tasks[0].input, causationId: null, tag: 't1',
    });
    const { assessment, t2 } = await assessAndFollowUp({ pool, eventRuntime, observation, t1 }); // ASSESS -> FOLLOW-UP
    const close = {
      closedAt: isoNow(), runId: RUN_ID, outcome: 'closed',
      workOrders: [
        { tag: 't1', work_order_id: t1.workOrder.work_order_id, event_id: t1.record.event_id, attempts: t1.attempts },
        ...(t2 ? [{ tag: 't2', work_order_id: t2.workOrder.work_order_id, event_id: t2.record.event_id, attempts: t2.attempts }] : []),
      ],
      assessment,
    };
    save('99-close.json', close);
    log('CLOSE', `run closed; ${close.workOrders.length} work order(s), events: ${close.workOrders.map(w => w.event_id).join(', ')}`);
    await pool.end();
    process.exit(0);
  } catch (err) {
    if (err instanceof Escalation) {
      const esc = { escalatedAt: isoNow(), runId: RUN_ID, reason: err.message, detail: err.detail || null };
      try { save('99-escalate.json', esc); } catch (_) {}
      log('ESCALATE', err.message);
      await pool.end();
      process.exit(3);
    }
    try { save('99-fatal.json', { at: isoNow(), runId: RUN_ID, error: String(err && err.stack || err) }); } catch (_) {}
    log('FATAL', String(err && err.stack || err));
    await pool.end();
    process.exit(2);
  }
}

main();
