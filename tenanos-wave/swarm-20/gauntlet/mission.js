'use strict';
/**
 * SWARM-20 AUTONOMY GAUNTLET — the end-to-end tenant execution loop (harness).
 *
 * Loop: TENANT INTENT -> MISSION -> DURABLE RUN -> MEMORY RETRIEVAL (permitted) ->
 *   CONTEXT -> PLAN (bounded) -> CAPABILITY DECISION -> MCP/TOOL EXECUTION ->
 *   RESULT -> VERIFY -> CHECKPOINT -> MEMORY CANDIDATE (justified) ->
 *   MISSION CONTROL (snapshot) -> NEXT TASK -> CLOSE.
 *
 * Reuses the REAL PING contract modules read-only (see lib/real_modules.js):
 *   external_agent_adapter.authorizeWorkOrder / issueWorkOrder /
 *     verifyResultEnvelope / recordVerifiedResult
 *   orca_policy.classifyDelegation / classifyRetry / classifyResultAcceptance
 *   recovery_decisions.decideRecovery
 *   orca_status_model.OrcaStatusLedger (transition legality enforced)
 *
 * Synthetic doubles (lib/harness.js, TEST DOUBLES, not authorities):
 *   SyntheticEventRuntime (emit contract + logical_id dedup),
 *   SyntheticMemoryStore (tenant-scoped permits), SyntheticMcpRegistry,
 *   ObjectiveStore (durable work orders + lockfile coordinator lease).
 *
 * Dispatch transport substitution: authorization names agentId 'hermes'
 * (LIVE profile, real gate), but the dispatcher spawns the SYNTHETIC worker
 * stub (lib/worker.js) instead of hermes.exe. Recorded in evidence as
 * transport_substituted:'synthetic-harness'. Never touches the live Pig
 * worker path, the repo, or live Postgres.
 *
 * Exit codes (mirror orca_control_loop.js): 0 closed, 2 fatal, 3 escalated,
 * 4 cancelled, 5 coordinator-lease contention.
 *
 * Env (see GAUNTLET-MISSION.md for the full table):
 *   GAUNTLET_EVIDENCE_DIR (required), GAUNTLET_DATA_ROOT,
 *   GAUNTLET_TENANT, GAUNTLET_REQUEST_TENANT, GAUNTLET_OBJECTIVE,
 *   GAUNTLET_FAULT, GAUNTLET_MCP_MODE, GAUNTLET_MEMORY_MODE,
 *   GAUNTLET_CAPABILITY_REVOKED, GAUNTLET_MAX_WORK_ORDERS,
 *   GAUNTLET_MAX_ATTEMPTS, GAUNTLET_DISPATCH_TIMEOUT_MS,
 *   GAUNTLET_SELF_TEST_DEDUP, GAUNTLET_RUN_ID
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const H = require('./lib/harness.js');
const R = require('./lib/real_modules.js');

const EVIDENCE_DIR = process.env.GAUNTLET_EVIDENCE_DIR;
if (!EVIDENCE_DIR) { console.error('GAUNTLET_EVIDENCE_DIR required'); process.exit(2); }
const DATA_ROOT = process.env.GAUNTLET_DATA_ROOT || path.join(EVIDENCE_DIR, 'data');
const TENANT = process.env.GAUNTLET_TENANT || 'gauntlet-tenant-01';
const REQUEST_TENANT = process.env.GAUNTLET_REQUEST_TENANT || TENANT;
const NAMESPACE = `tenant::${TENANT}`;
const OBJECTIVE_TEXT = process.env.GAUNTLET_OBJECTIVE ||
  'Gauntlet synthetic objective: transform the tenant status line, then verify the transform chain.';
const FAULT = process.env.GAUNTLET_FAULT || 'honest';
const MCP_MODE = process.env.GAUNTLET_MCP_MODE || 'normal';
const MEMORY_MODE = process.env.GAUNTLET_MEMORY_MODE || 'normal';
const CAPABILITY_REVOKED = process.env.GAUNTLET_CAPABILITY_REVOKED || null;
const MAX_WORK_ORDERS = parseInt(process.env.GAUNTLET_MAX_WORK_ORDERS || '2', 10);
const MAX_ATTEMPTS = parseInt(process.env.GAUNTLET_MAX_ATTEMPTS || '2', 10);
const DISPATCH_TIMEOUT_MS = parseInt(process.env.GAUNTLET_DISPATCH_TIMEOUT_MS || '12000', 10);
const SELF_TEST_DEDUP = process.env.GAUNTLET_SELF_TEST_DEDUP === '1';
const RUN_ID = process.env.GAUNTLET_RUN_ID || ('run-' + Date.now().toString(36));

const AGENT_ID = 'hermes'; // LIVE profile in the real adapter; transport substituted by harness
const CAPABILITY = 'text.transform';
const CONSTRAINTS = {
  read_only: true, no_writes: true, no_network: true,
  no_canonical_events: true, no_mission_state_writes: true,
};

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const store = new H.ObjectiveStore(DATA_ROOT);
const eventRuntime = new H.SyntheticEventRuntime(EVIDENCE_DIR);
const memory = new H.SyntheticMemoryStore();
const mcp = new H.SyntheticMcpRegistry();
mcp.setMode(MCP_MODE);

const ledger = new R.statusModel.OrcaStatusLedger();
ledger.setDir(EVIDENCE_DIR);

function log(stage, msg) {
  const line = `[${new Date().toISOString()}] ${stage}: ${msg}`;
  console.log(line);
  fs.appendFileSync(path.join(EVIDENCE_DIR, 'run.log'), line + '\n');
}
function save(name, obj) {
  fs.writeFileSync(path.join(EVIDENCE_DIR, name), JSON.stringify(obj, null, 2) + '\n');
}
function transition(unit, to, evidence, detail) {
  return ledger.transition(unit, to, { evidence, detail });
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function pidAlive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch (_) { return false; }
}

class Escalation extends Error {
  constructor(reason, detail) { super(reason); this.detail = detail || null; }
}

// ---------------------------------------------------------------------------
// STAGE: memory seeding + permitted retrieval
// ---------------------------------------------------------------------------

function seedMemory() {
  if (MEMORY_MODE === 'normal') {
    memory.seed([{ id: 'mem-001', tenant_id: TENANT, fact: 'Tenant prefers concise uppercase status summaries.', confidence: 0.8, provenance: 'gauntlet-seed' }]);
  } else if (MEMORY_MODE === 'stale') {
    memory.seed([
      { id: 'mem-old', tenant_id: TENANT, fact: 'Tenant status line format is v1 (deprecated).', confidence: 0.6, provenance: 'gauntlet-seed', superseded_by: 'mem-new' },
      { id: 'mem-new', tenant_id: TENANT, fact: 'Tenant status line format is v2 (current).', confidence: 0.9, provenance: 'gauntlet-seed' },
    ]);
  } else if (MEMORY_MODE === 'contradictory') {
    memory.seed([
      { id: 'mem-a', tenant_id: TENANT, fact: 'Tenant requires status summaries in UPPERCASE.', confidence: 0.7, provenance: 'gauntlet-seed' },
      { id: 'mem-b', tenant_id: TENANT, fact: 'Tenant forbids UPPERCASE in status summaries.', confidence: 0.7, provenance: 'gauntlet-seed' },
    ]);
  } else if (MEMORY_MODE === 'cross-tenant') {
    memory.seed([{ id: 'mem-other', tenant_id: 'tenant-b', fact: 'Other tenant secret preference.', confidence: 0.9, provenance: 'gauntlet-seed' }]);
  }
}

/**
 * Retrieve permitted memories and build the context pack. Fail-closed on
 * cross-tenant. Stale (superseded) facts are excluded from the active
 * context and recorded. Irreconcilable contradictions escalate.
 */
function retrieveMemory(objectiveId) {
  let retrieval;
  try {
    retrieval = memory.retrieve({ tenantId: REQUEST_TENANT, requesterTenantId: TENANT, purpose: OBJECTIVE_TEXT.slice(0, 80) });
  } catch (err) {
    if (err.code === 'MEMORY_DENIED') {
      save('memory-denied.json', { at: H.isoNow(), tenant: TENANT, requested_tenant: REQUEST_TENANT, reason: err.message });
      log('MEMORY', `DENIED (fail-closed): ${err.message}`);
      return { pack: null, denied: err.message, memories: [] };
    }
    throw err;
  }
  const active = retrieval.memories.filter((m) => !m.stale);
  const excludedStale = retrieval.memories.filter((m) => m.stale);
  // Contradiction detection: naive but explicit — two active facts that
  // directly negate each other with no supersession chain. The harness
  // declares contradiction only for the seeded attack pair.
  const facts = active.map((m) => m.fact.toLowerCase());
  const contradictory = facts.some((f) => f.includes('requires') && f.includes('uppercase')) &&
    facts.some((f) => f.includes('forbids') && f.includes('uppercase'));
  const pack = {
    context_pack_id: 'ctx-' + H.deriveObjectiveId({ namespace: NAMESPACE, objectiveText: OBJECTIVE_TEXT }).slice(0, 16),
    tenant_id: TENANT,
    permit: retrieval.permit,
    retrieved_at: retrieval.retrieved_at,
    memories: active,
    excluded_stale: excludedStale.map((m) => m.id),
    contradictory,
  };
  save('context-pack.json', pack);
  log('MEMORY', `retrieved ${active.length} active, excluded ${excludedStale.length} stale, contradictory=${contradictory}`);
  return { pack, denied: null, memories: active };
}

// ---------------------------------------------------------------------------
// STAGE: dispatch + monitor (synthetic transport)
// ---------------------------------------------------------------------------

function timeoutEnvelope(workOrder, startedAt, endedAt) {
  return {
    work_order_id: workOrder.work_order_id,
    context_pack_id: workOrder.context_pack_id,
    agent_id: workOrder.agent_id,
    capability: workOrder.capability,
    status: 'failed',
    output: null,
    error: `dispatcher timeout after ${endedAt - startedAt}ms (no worker output); honest failure, no success fabricated`,
    evidence: { timedOut: true, started_at: new Date(startedAt).toISOString(), ended_at: new Date(endedAt).toISOString() },
  };
}

function extractEnvelope(stdout) {
  const text = (stdout || '').trim();
  if (!text) return null;
  try { return JSON.parse(text); } catch (_) {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch (_) { return null; } }
    return null;
  }
}

async function dispatchWorker({ workOrder, attemptId, tag }) {
  const startedAt = Date.now();
  const child = spawn(process.execPath, [path.join(__dirname, 'lib/worker.js')], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: Object.assign({}, process.env, {
      GAUNTLET_FAULT: FAULT,
      GAUNTLET_MCP_MODE: MCP_MODE,
      GAUNTLET_EFFECT_DIR: EVIDENCE_DIR,
    }),
  });
  log('DISPATCH', `${tag}: spawned synthetic worker pid ${child.pid} (attempt ${workOrder.attempt}, fault=${FAULT})`);
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => { stdout += d.toString(); });
  child.stderr.on('data', (d) => { stderr += d.toString(); });
  child.stdin.write(JSON.stringify(workOrder));
  child.stdin.end();

  const dispatchRecord = {
    attempt_id: attemptId, work_order_id: workOrder.work_order_id, tag,
    dispatch_pid: child.pid, started_at: new Date(startedAt).toISOString(),
    transport_substituted: 'synthetic-harness', fault: FAULT, mcp_mode: MCP_MODE,
  };

  const outcome = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch (_) {}
      resolve({ kind: 'timeout' });
    }, DISPATCH_TIMEOUT_MS);
    child.on('exit', (code, signal) => {
      clearTimeout(timer);
      resolve({ kind: 'exit', code, signal });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ kind: 'error', error: String(err && err.message || err) });
    });
  });
  const endedAt = Date.now();
  dispatchRecord.ended_at = new Date(endedAt).toISOString();
  dispatchRecord.outcome = outcome.kind;
  dispatchRecord.exit_code = outcome.code != null ? outcome.code : null;

  if (outcome.kind === 'timeout') {
    dispatchRecord.timedOut = true;
    save(`dispatch-${tag}-a${workOrder.attempt}.json`, dispatchRecord);
    log('DISPATCH', `${tag}: TIMEOUT after ${endedAt - startedAt}ms; honest failed envelope`);
    return { envelope: timeoutEnvelope(workOrder, startedAt, endedAt), timedOut: true, dispatchRecord };
  }
  const envelope = extractEnvelope(stdout);
  dispatchRecord.stdout_chars = stdout.length;
  dispatchRecord.stderr_tail = stderr.slice(-300);
  save(`dispatch-${tag}-a${workOrder.attempt}.json`, dispatchRecord);
  if (!envelope) {
    log('DISPATCH', `${tag}: worker protocol failure (exit=${outcome.code}, no parseable envelope)`);
    return { envelope: null, protocolFailure: true, dispatchRecord, exitCode: outcome.code };
  }
  return { envelope, timedOut: false, dispatchRecord };
}

// ---------------------------------------------------------------------------
// STAGE: startup reconciliation (mirrors orca reconcileStartup)
// ---------------------------------------------------------------------------

async function reconcileStartup(objectiveId) {
  const dwos = store.listWorkOrders(objectiveId);
  log('RECONCILE', `${dwos.length} durable work order(s) for objective ${objectiveId.slice(0, 12)}`);
  const summary = [];
  for (const dwo of dwos) {
    const tag = dwo.task_key || 'unknown';
    if (['VERIFIED', 'FAILED', 'VERIFICATION_FAILED', 'CLOSED'].includes(dwo.state)) {
      log('RECONCILE', `${tag}: terminal (${dwo.state}); no fresh work`);
      summary.push({ task_key: tag, action: 'left-terminal' });
      continue;
    }
    if (dwo.state === 'AUTHORIZED' || dwo.state === 'QUEUED') {
      log('RECONCILE', `${tag}: ${dwo.state}; will dispatch this run`);
      summary.push({ task_key: tag, action: 'will-dispatch' });
      continue;
    }
    if (dwo.state === 'RUNNING') {
      const result = store.readRendezvous(objectiveId, dwo.work_order_id);
      if (result && result.envelope) {
        log('RECONCILE', `${tag}: rendezvous result present; will verify/accept`);
        summary.push({ task_key: tag, action: 'rendezvous-recoverable' });
        continue;
      }
      if (pidAlive(dwo.dispatch_pid)) {
        store.updateWorkOrder(objectiveId, dwo.work_order_id, {
          reconcile_note: `dispatcher pid ${dwo.dispatch_pid} alive, no rendezvous; refusing redispatch`,
          reconciled_at: H.isoNow(),
        });
        log('RECONCILE', `${tag}: dispatcher possibly alive; will NOT redispatch`);
        summary.push({ task_key: tag, action: 'left-running-in-flight' });
        continue;
      }
      store.updateWorkOrder(objectiveId, dwo.work_order_id, {
        state: 'AUTHORIZED', dispatch_pid: null,
        reconcile_note: 'dispatch attempt lost (dispatcher dead, no rendezvous); re-dispatch allowed as new attempt within budget',
        reconciled_at: H.isoNow(),
      });
      log('RECONCILE', `${tag}: attempt lost; re-authorized for a new attempt`);
      summary.push({ task_key: tag, action: 'lost-redispatchable' });
      continue;
    }
    log('RECONCILE', `${tag}: unknown state '${dwo.state}'; leaving untouched`);
    summary.push({ task_key: tag, action: 'left-untouched' });
  }
  save('reconcile-startup.json', { at: H.isoNow(), run_id: RUN_ID, objective_id: objectiveId, workOrders: summary });
  return summary;
}

// ---------------------------------------------------------------------------
// STAGE: one authorized delegation (authorize -> issue -> dispatch -> verify)
// ---------------------------------------------------------------------------

async function delegateRun({ objectiveId, contextPack, taskKey, taskBrief, input, causationId, tag }) {
  // Capability revocation pre-check is synchronous: R.policy.classifyDelegation
  // invokes adapter.authorizeWorkOrder synchronously, so an async wrapper would
  // return a Promise (auth.granted === undefined) and fail closed for the wrong
  // reason. Keep this sync, mirroring the real gate.
  const authorizeWithRevocationCheck = ({ agentId, capability, namespace, constraints }) => {
    // Chaos-injection pre-check (attack 09): models the authority revoking the
    // capability between runs. Shape mirrors the real gate's denial. The real
    // adapter module is NOT mutated.
    if (CAPABILITY_REVOKED && capability === CAPABILITY_REVOKED) {
      return { granted: false, reason: `Capability '${capability}' revoked by authority mid-run (simulated revocation)` };
    }
    return R.adapter.authorizeWorkOrder({ agentId, capability, namespace, constraints });
  };
  const woId = H.deriveWorkOrderId(objectiveId, taskKey);
  transition(tag, 'PLANNED', '02-plan.json', { taskKey, capability: CAPABILITY, agentId: AGENT_ID });
  log('PLAN', `${tag}: work_order_id=${woId.slice(0, 12)}...`);

  // Durable budget (restart cannot reset consumption).
  const usage = store.budgetUsage(objectiveId);
  log('BUDGET', `${tag}: durable usage ${usage.used}/${usage.limit}`);

  // Cancellation survives restarts and blocks new work.
  const objRec = store.loadObjective(objectiveId);
  if (objRec && objRec.cancellation) {
    transition(tag, 'BLOCKED', '00-objective.json', { reason: 'objective cancelled' });
    throw new Escalation(`objective cancelled at ${objRec.cancellation.requested_at}; no new work`, { tag });
  }

  // ---- CAPABILITY DECISION (real orca_policy.classifyDelegation) ----
  const decision = R.policy.classifyDelegation({
    adapter: { authorizeWorkOrder: authorizeWithRevocationCheck },
    agentId: AGENT_ID, capability: CAPABILITY, namespace: NAMESPACE,
    constraints: CONSTRAINTS, workOrdersUsed: usage.used,
    runBounds: { maxWorkOrders: MAX_WORK_ORDERS },
  });
  save(`policy-${tag}.json`, decision);
  log('POLICY', `${tag}: ${decision.decisionClass} (${decision.sourceRule})`);
  if (decision.decisionClass !== R.policy.DECISION_CLASSES.AUTO_EXECUTE) {
    transition(tag, 'BLOCKED', `policy-${tag}.json`, { decisionClass: decision.decisionClass });
    throw new Escalation(`delegation not auto-executable: ${decision.decisionClass}: ${decision.reason}`, { tag, decision });
  }
  transition(tag, 'AUTHORIZED', `policy-${tag}.json`, {});

  // ---- ISSUE (real adapter.issueWorkOrder; throws WORK_ORDER_DENIED) ----
  const attemptRecords = store.listWorkOrders(objectiveId).filter((w) => w.work_order_id === woId);
  const existing = attemptRecords[0] || null;
  const attempt = (existing ? (existing.attempt_count || 0) : 0) + 1;
  if (attempt > MAX_ATTEMPTS) {
    throw new Escalation(`retry budget exhausted for ${tag} (attempt ${attempt}/${MAX_ATTEMPTS})`, { tag });
  }
  if (!existing) store.reserveWorkOrderBudget(objectiveId);

  // ---- ISSUE (real adapter.issueWorkOrder; throws WORK_ORDER_DENIED) ----
  // Re-issued per attempt (attempt+1), same taskId -> same adapter work_order_id (idempotent).
  const issueForAttempt = (attemptNo) => {
    const dl = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    return R.adapter.issueWorkOrder({
      agentId: AGENT_ID, capability: CAPABILITY, namespace: NAMESPACE,
      taskId: `${objectiveId.slice(0, 8)}:${taskKey}`, missionId: objectiveId,
      correlationId: `${RUN_ID}:${objectiveId.slice(0, 8)}`, contextPackId: contextPack.context_pack_id,
      input: Object.assign({}, input, { task_brief: taskBrief }),
      constraints: CONSTRAINTS,
      resultPath: store.rendezvousPath(objectiveId, woId),
      deadline: dl, causationId: causationId || null, attempt: attemptNo,
    });
  };

  const durableId = woId;
  let attemptNo = attempt;
  let workOrder;
  try {
    workOrder = issueForAttempt(attemptNo);
  } catch (err) {
    transition(tag, 'BLOCKED', `policy-${tag}.json`, { reason: err.message });
    throw new Escalation(`work order issue denied: ${err.message}`, { tag, code: err.code });
  }
  // The adapter mints work_order_id from taskId; the harness's durable id is
  // the (objective_id, task_key) derivation. Bind them: durable id wins for
  // restart rediscovery; adapter id is recorded for the envelope binding.
  transition(tag, 'QUEUED', `workorder-${tag}.json`, {});
  store.saveWorkOrder(objectiveId, {
    work_order_id: durableId, adapter_work_order_id: workOrder.work_order_id,
    task_key: taskKey, state: 'QUEUED', attempt_count: 0,
    issued: workOrder, causation_id: causationId || null,
  });
  save(`workorder-${tag}.json`, workOrder);
  log('ISSUE', `${tag}: work order issued (durable=${durableId.slice(0, 12)}..., adapter=${workOrder.work_order_id.slice(0, 12)}...)`);

  // ---- DISPATCH + MONITOR ----
  for (;;) {
    const attemptId = H.deriveAttemptId(durableId, attemptNo);
    const attemptWorkOrder = workOrder; // issued for this exact attemptNo
    store.updateWorkOrder(objectiveId, durableId, {
      state: 'RUNNING', attempt_count: attemptNo, last_attempt_id: attemptId,
    });
    transition(tag, 'RUNNING', `dispatch-${tag}-a${attemptNo}.json`, {});

    const { envelope, timedOut, protocolFailure, dispatchRecord, exitCode } =
      await dispatchWorker({ workOrder: attemptWorkOrder, attemptId, tag });
    store.updateWorkOrder(objectiveId, durableId, { dispatch_pid: dispatchRecord.dispatch_pid });

    if (protocolFailure) {
      transition(tag, 'BLOCKED', `dispatch-${tag}-a${attemptNo}.json`, { reason: 'worker protocol failure' });
      throw new Escalation(`worker protocol failure for ${tag} (exit=${exitCode}, no parseable envelope)`, { tag });
    }

    // Rendezvous: the result is durable before verification.
    store.writeRendezvous(objectiveId, durableId, { envelope, timedOut: !!timedOut, attempt: attemptNo, at: H.isoNow() });
    store.updateWorkOrder(objectiveId, durableId, { state: 'EVIDENCE_PENDING' });
    transition(tag, 'EVIDENCE_PENDING', `dispatch-${tag}-a${attemptNo}.json`, {});

    // Attack 10: timeout AFTER a simulated external effect. The effect is
    // real (marker file) but unverified. The unit takes FAILED (the attempt
    // timed out); the run escalates as RECONCILIATION_REQUIRED. Never
    // success, never clean failure.
    //
    // Identity binding note: the worker writes the marker under the ISSUED
    // (adapter) work_order_id it received, not the harness durable id. The
    // check must use attemptWorkOrder.work_order_id; using durableId here
    // silently disabled this guard (found by the 2026-09-24 attack-matrix
    // run: marker present under the adapter id, guard never fired, and the
    // loop retried a possibly-effected work order).
    if (timedOut) {
      const issuedId = attemptWorkOrder.work_order_id;
      const marker = path.join(EVIDENCE_DIR, `side-effect-${issuedId}.marker`);
      if (fs.existsSync(marker)) {
        const rec = { at: H.isoNow(), work_order_id: durableId, issued_work_order_id: issuedId, attempt: attemptNo, reason: 'timeout after simulated external effect; effect is UNVERIFIED and may have occurred' };
        save('reconcile-required.json', rec);
        transition(tag, 'FAILED', 'reconcile-required.json', { reason: 'timeout with possible unrecorded effect' });
        throw new Escalation('RECONCILIATION_REQUIRED: worker timed out after a simulated external effect; human must reconcile before any retry', { tag, marker: true });
      }
    }

    // ---- VERIFY (real adapter.verifyResultEnvelope + recordVerifiedResult) ----
    const acceptance = R.policy.classifyResultAcceptance();
    save(`policy-${tag}-acceptance.json`, acceptance);
    const verifiedAt = H.isoNow();
    const verification = R.adapter.verifyResultEnvelope(envelope, attemptWorkOrder, { invokedAgentId: AGENT_ID, verifiedAt });
    save(`verify-${tag}-a${attemptNo}.json`, verification);
    if (!verification.valid) {
      transition(tag, 'VERIFICATION_FAILED', `verify-${tag}-a${attemptNo}.json`, { reason: verification.reason });
      throw new Escalation(`result verification failed (non-retryable): ${verification.reason}`, { tag, reason: verification.reason });
    }

    const record = await R.adapter.recordVerifiedResult({
      eventRuntime, result: envelope, workOrder: attemptWorkOrder,
      invokedAgentId: AGENT_ID, verifiedAt,
    });
    if (!record.valid) {
      // Mirrors orca_control_loop.js: recordVerifiedResult invalid (covers
      // both envelope-invalid and emit-rejected) -> VERIFICATION_FAILED,
      // non-retryable, then escalate.
      transition(tag, 'VERIFICATION_FAILED', `verify-${tag}-a${attemptNo}.json`, { reason: record.reason });
      throw new Escalation(`result verification/recording failed (non-retryable): ${record.reason}`, { tag, reason: record.reason });
    }
    save(`result-${tag}.json`, record);
    log('VERIFY', `${tag}: ${record.event_type} event_id=${record.event_id.slice(0, 12)}... deduplicated=${record.deduplicated}`);

    if (SELF_TEST_DEDUP) {
      const dup = await R.adapter.recordVerifiedResult({
        eventRuntime, result: envelope, workOrder: attemptWorkOrder,
        invokedAgentId: AGENT_ID, verifiedAt,
      });
      save(`result-${tag}-dedup-check.json`, { deduplicated: dup.deduplicated, event_id: dup.event_id });
      log('DEDUP', `${tag}: re-record deduplicated=${dup.deduplicated} (expected true)`);
    }

    if (envelope.status === 'failed') {
      const retryDecision = R.policy.classifyRetry({ attempt: attemptNo, maxAttempts: MAX_ATTEMPTS, failureKind: timedOut ? 'timeout' : 'worker-failed' });
      save(`policy-${tag}-retry-a${attemptNo}.json`, retryDecision);
      const recovery = R.recovery.decideRecovery(timedOut ? 'dispatcher timeout (no worker output)' : 'worker-reported failed (retryable)');
      save(`recovery-${tag}-a${attemptNo}.json`, recovery);
      if (retryDecision.decisionClass === R.policy.DECISION_CLASSES.AUTO_EXECUTE && attemptNo < MAX_ATTEMPTS) {
        // Legal retry path (mirrors orca_control_loop.js:884-903):
        // EVIDENCE_PENDING -> FAILED -> PLANNED -> AUTHORIZED -> QUEUED -> RUNNING.
        transition(tag, 'FAILED', `verify-${tag}-a${attemptNo}.json`, { reason: 'valid failed envelope; retry granted' });
        transition(tag, 'PLANNED', `policy-${tag}-retry-a${attemptNo}.json`, { reason: 're-plan from recorded failure' });
        attemptNo += 1;
        workOrder = issueForAttempt(attemptNo); // same taskId -> same adapter work_order_id (idempotent)
        transition(tag, 'AUTHORIZED', `policy-${tag}-retry-a${attemptNo - 1}.json`, { via: 'retry policy AUTO_EXECUTE (same authorized task)' });
        transition(tag, 'QUEUED', `workorder-${tag}.json`, { note: 'same authorized work order; new attempt' });
        store.updateWorkOrder(objectiveId, durableId, { state: 'AUTHORIZED', dispatch_pid: null, issued: workOrder });
        save(`workorder-${tag}-a${attemptNo}.json`, workOrder);
        log('RETRY', `${tag}: attempt ${attemptNo} (same durable work_order_id, idempotent)`);
        continue;
      }
      transition(tag, 'FAILED', `verify-${tag}-a${attemptNo}.json`, { reason: 'retry budget exhausted' });
      throw new Escalation(`worker failed and retry budget exhausted for ${tag}: ${envelope.error}`, { tag });
    }

    // status=completed, verified, recorded.
    transition(tag, 'VERIFIED', `result-${tag}.json`, { event_id: record.event_id });
    store.updateWorkOrder(objectiveId, durableId, { state: 'VERIFIED', event_id: record.event_id });
    return { workOrder: attemptWorkOrder, envelope, record, attempts: attemptNo, tag };
  }
}

// ---------------------------------------------------------------------------
// STAGE: memory candidate (justified) + mission control + assess/follow-up
// ---------------------------------------------------------------------------

function writeMemoryCandidate({ tenantId, fact, justification, confidence }) {
  const candidate = memory.proposeCandidate({ tenantId, fact, justification, confidence });
  const existing = fs.existsSync(path.join(EVIDENCE_DIR, 'memory-candidates.json'))
    ? JSON.parse(fs.readFileSync(path.join(EVIDENCE_DIR, 'memory-candidates.json'), 'utf8')) : [];
  existing.push(candidate);
  save('memory-candidates.json', existing);
  log('MEMORY', `candidate ${candidate.candidate_id} proposed (justified by ${justification.length} event(s), approval required)`);
  return candidate;
}

function snapshotMissionControl(objectiveId) {
  const candidates = fs.existsSync(path.join(EVIDENCE_DIR, 'memory-candidates.json'))
    ? JSON.parse(fs.readFileSync(path.join(EVIDENCE_DIR, 'memory-candidates.json'), 'utf8')) : [];
  const snapshot = H.buildMissionControlSnapshot({ eventRuntime, objectiveStore: store, objectiveId, memoryCandidates: candidates });
  save('mission-control.json', snapshot);
  return snapshot;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

async function releaseLease(objectiveId) {
  try { store.releaseCoordinatorLease(objectiveId); } catch (_) {}
}

async function main() {
  seedMemory();

  // 1. TENANT INTENT -> MISSION (durable objective identity from intent alone)
  const objectiveId = H.deriveObjectiveId({ namespace: NAMESPACE, objectiveText: OBJECTIVE_TEXT, constraints: CONSTRAINTS });
  const objRec = store.registerObjective(NAMESPACE, OBJECTIVE_TEXT, { constraints: CONSTRAINTS, maxWorkOrders: MAX_WORK_ORDERS });
  save('00-objective.json', {
    objective: OBJECTIVE_TEXT, objective_id: objectiveId, run_id: RUN_ID,
    tenant_id: TENANT, namespace: NAMESPACE, supplied_by: 'human-once', at: H.isoNow(),
    fault: FAULT, mcp_mode: MCP_MODE, memory_mode: MEMORY_MODE,
  });
  log('START', `run ${RUN_ID}; tenant=${TENANT}; objective ${objectiveId.slice(0, 12)} (state=${objRec.state})`);

  // 2. Durable cancellation.
  if (fs.existsSync(store.cancelRequestPath(objectiveId)) && !objRec.cancellation) {
    store.recordCancellation(objectiveId, 'cancel.requested marker present at startup');
    save('00-cancelled.json', { at: H.isoNow(), run_id: RUN_ID });
    log('CANCEL', 'objective cancelled; no new work');
  }
  if (store.loadObjective(objectiveId).cancellation) {
    log('CANCEL', 'objective already cancelled; exiting without new work');
    process.exit(4);
  }

  // 3. Terminal objective: never generate fresh work on restart.
  if (store.loadObjective(objectiveId).state === 'COMPLETED') {
    log('START', `objective ${objectiveId.slice(0, 12)} already COMPLETED; no fresh work`);
    process.exit(0);
  }

  // 4. Single-coordinator claim (lockfile lease; stale/dead-holder reclaimable).
  const claim = store.acquireCoordinatorLease(objectiveId);
  if (!claim.acquired) {
    log('LOCK', `coordinator lease held by live pid ${claim.holder_pid}; this process exits`);
    process.exit(5);
  }
  log('LOCK', `coordinator lease acquired (pid ${process.pid})`);
  process.on('SIGINT', () => { releaseLease(objectiveId); process.exit(130); });
  process.on('SIGTERM', () => { releaseLease(objectiveId); process.exit(143); });

  try {
    // 5. Startup reconciliation BEFORE any new dispatch.
    await reconcileStartup(objectiveId);

    // 6. MEMORY RETRIEVAL (permitted) -> CONTEXT PACK
    const { pack, denied } = retrieveMemory(objectiveId);
    if (denied) {
      log('MEMORY', 'proceeding with empty permitted memory set (denial is fail-closed and correct)');
    }
    const contextPack = pack || {
      context_pack_id: 'ctx-' + objectiveId.slice(0, 16),
      tenant_id: TENANT, permit: null, retrieved_at: H.isoNow(),
      memories: [], excluded_stale: [], contradictory: false, denial: denied,
    };
    if (contextPack.contradictory) {
      throw new Escalation('irreconcilable contradictory memories; planner cannot ground the task; human must resolve', { kind: 'contradictory-memory' });
    }

    // 7. PLAN (bounded): two tasks max, each with capability + constraints.
    const plan = {
      tasks: [
        { taskKey: 't1-summarize', brief: 'Transform the tenant status line per tenant preference.', input: { text: `tenant ${TENANT} status: 3 active objectives, 0 pending escalations`, op: 'upper' } },
        { taskKey: 't2-verify', brief: 'Re-transform the verified t1 output to confirm chain integrity.', input: null }, // built from t1 evidence
      ],
    };
    save('02-plan.json', plan);

    // 8/9. DELEGATE t1 (authorize -> issue -> dispatch -> monitor -> verify -> record)
    const t1 = await delegateRun({
      objectiveId, contextPack, taskKey: plan.tasks[0].taskKey,
      taskBrief: plan.tasks[0].brief, input: plan.tasks[0].input,
      causationId: null, tag: 't1',
    });

    // 10. MEMORY CANDIDATE (justified by the verified event).
    writeMemoryCandidate({
      tenantId: TENANT,
      fact: `Transform chain t1 for tenant ${TENANT} verified at ${t1.record.event_id.slice(0, 12)}.`,
      justification: [t1.record.event_id],
      confidence: 0.7,
    });

    // 11. ASSESS -> FOLLOW-UP (causation-linked) or CLOSE.
    const remainingWork = [{ taskKey: 't2-verify' }];
    const assessment = {
      at: H.isoNow(), t1_event_id: t1.record.event_id,
      remaining_work: remainingWork.map((t) => t.taskKey),
      note: 't1 verified; t2 follow-up derives from verified evidence with causation linkage',
    };
    save('20-assess.json', assessment);

    const t2Input = {
      text: `t1 verified output: ${JSON.stringify(t1.envelope.output)} (event ${t1.record.event_id.slice(0, 12)})`,
      op: 'reverse',
    };
    const t2 = await delegateRun({
      objectiveId, contextPack, taskKey: 't2-verify',
      taskBrief: plan.tasks[1].brief, input: t2Input,
      causationId: t1.record.event_id, tag: 't2',
    });

    writeMemoryCandidate({
      tenantId: TENANT,
      fact: `Full transform chain (t1+t2) for tenant ${TENANT} verified; causation ${t1.record.event_id.slice(0, 12)} -> ${t2.record.event_id.slice(0, 12)}.`,
      justification: [t1.record.event_id, t2.record.event_id],
      confidence: 0.8,
    });

    // 12. MISSION CONTROL snapshot.
    const mc = snapshotMissionControl(objectiveId);
    log('MISSION-CONTROL', `snapshot: workerActivity=${mc.dashboard.workerActivity}, candidates=${mc.dashboard.memoryCandidates.length}`);

    // 13. CLOSE: mark terminal; a restart rediscovers COMPLETED and issues nothing.
    const close = {
      closed_at: H.isoNow(), run_id: RUN_ID, objective_id: objectiveId, outcome: 'closed',
      workOrders: [
        { tag: 't1', work_order_id: t1.workOrder.work_order_id, event_id: t1.record.event_id, attempts: t1.attempts },
        { tag: 't2', work_order_id: t2.workOrder.work_order_id, event_id: t2.record.event_id, attempts: t2.attempts },
      ],
    };
    save('99-close.json', close);
    transition('t1', 'CLOSED', '99-close.json', {});
    transition('t2', 'CLOSED', '99-close.json', {});
    store.setObjectiveState(objectiveId, 'COMPLETED', { closed_at: H.isoNow(), close_run_id: RUN_ID });
    log('CLOSE', `run closed; events ${close.workOrders.map((w) => w.event_id.slice(0, 12)).join(', ')}; objective COMPLETED`);
    snapshotMissionControl(objectiveId);
    await releaseLease(objectiveId);
    process.exit(0);
  } catch (err) {
    if (err instanceof Escalation) {
      const esc = { escalated_at: H.isoNow(), run_id: RUN_ID, objective_id: objectiveId, reason: err.message, detail: err.detail || null };
      try { save('99-escalate.json', esc); } catch (_) {}
      try {
        const tag = (err.detail && err.detail.tag) || 'run';
        const cur = ledger.current(tag);
        if (cur && !['FAILED', 'VERIFICATION_FAILED', 'CLOSED', 'BLOCKED'].includes(cur)) {
          transition(tag, 'BLOCKED', '99-escalate.json', { reason: err.message });
        }
      } catch (_) {}
      snapshotMissionControl(objectiveId);
      log('ESCALATE', err.message);
      await releaseLease(objectiveId);
      process.exit(3);
    }
    try { save('99-fatal.json', { at: H.isoNow(), run_id: RUN_ID, objective_id: objectiveId, error: String(err && err.stack || err) }); } catch (_) {}
    log('FATAL', String(err && err.stack || err));
    await releaseLease(objectiveId);
    process.exit(2);
  }
}

main();
