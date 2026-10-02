'use strict';
/**
 * ORCA / HEADLESS AGENT ADAPTER — LANE C (2026-09-26).
 *
 * The thinnest vertical slice over EXISTING authorities:
 *
 *   Execution {missionId, runId, executionId, attempt} (owned by lane A's
 *   WorkerRuntime / ExecutionAuthority — this module never touches those
 *   files and never alters dispatch semantics)
 *     -> this adapter (a consumer; owns nothing but its own mapping)
 *     -> real headless agent invocation (proven transports: hermes)
 *     -> stdout artifact captured (PING-owned result_path)
 *     -> 8-field result envelope extracted + verified
 *     -> existing event plane (injected runtime only) records lifecycle
 *     -> UNKNOWN outcomes propagate honestly, never collapsed
 *
 * REAL EXECUTION PATH (proven, witnessed 2026-09-18, orca-run-mu6wmbzn):
 *   authorizeWorkOrder / issueWorkOrder (vendored proven
 *   external_agent_adapter.js, sha256 pinned in VENDOR-PROVENANCE)
 *   -> hermes transport: ~/workspace/bin/prompt-hermes.sh "<prompt>"
 *      (scp prompt to Pig C:\\Windows\\Temp\\hermes-prompt.txt; runs
 *       `wsl -u nolan -- bash /mnt/c/Windows/Temp/hermes-run.sh`,
 *       which execs the venv python hermes_cli/main.py -z <prompt> —
 *       pig-side Claude Code CLI, hermes.exe, --safe-mode)
 *   -> envelope extracted from worker stdout (balanced-brace JSON scan)
 *   -> verifyResultEnvelope (proven contract: agent binding, echo fields,
 *      status in {completed, failed}, deadline) 
 *   -> recordVerifiedResult with the INJECTED event runtime
 *      (UnifiedEventRuntime) -> canonical WORKER_COMPLETED / WORKER_FAILED
 *      on ping_events. Event identity stays with computeEventId (the spine).
 *
 * FABRICATED / REJECTED paths (documented, never callable here):
 *   - Gateway ORCA ExecutionEngine: live-but-orphaned; executor:null on its
 *     only port; dispatchToAssignment never calls execute(); no PING events.
 *   - orca-cli/orca README claims: MCP server, runner/claiming, pod
 *     lifecycle, constraint engine, TUI, DAG execution — zero code at
 *     5beeefc. Not implemented here; see ORCA-ARCHAEOLOGY-2026-09-23.md.
 *   - orca-cli/orca's adapter port (internal/adapter): REJECTED harvest —
 *     zero implementations, unproven Handle{PID, SessionID} supervision.
 *
 * ADDITIVE ONLY: this module imports the vendored proven adapter and the
 * injected event runtime. It creates no event store, no identity registry,
 * no scheduler, no workflow engine, no competing authority.
 *
 * Identity containment (Nolan, 2026-09-25): Copilot identities 1-4 only.
 * identity_5..10 are DENIED here explicitly, on top of the vendored
 * adapter's fail-closed unknown-agent denial.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const vendor = require('./vendor/external_agent_adapter.js');
const { OUTCOME, unknownOutcome, terminalOutcome } = require('./outcomes.js');

const ADAPTER_VERSION = 'lane-c/1.1.0';
const PROMPT_HERMES_SH = '/home/hatch/workspace/bin/prompt-hermes.sh';

// Tenant identity pattern — the tenant portion of the contract namespace
// pattern `tenant::<tenant_id>` (lane B: POST /missions derives
// payload.namespace = 'tenant::<tenant_id>' from the validated tenant).
const TENANT_ID_RE = /^[a-z0-9_.-]+$/;

/**
 * Resolve the execution's tenant from the scheduler dispatch event's
 * authoritative tenant_id and the work-order namespace.
 *
 * Conventions (lane B, 2026-09-26):
 * - The scheduler dispatch event carries authoritative `event.tenant_id`
 *   (top-level + metadata), taken from the mission row's immutable tenant.
 * - `POST /missions` derives `payload.namespace = 'tenant::<tenant_id>'`
 *   from the validated tenant; a contradicting caller-supplied namespace
 *   -> 400 (fail closed).
 *
 * This adapter mirrors the fail-closed semantics WITHOUT touching the
 * broker or the scheduler:
 *   tenantId provided + namespace 'tenant::<other>' (other !== tenantId)
 *     -> throw 'tenant_namespace_mismatch' (never dispatched).
 *   tenantId provided + namespace 'core::*'
 *     -> throw (a tenant-scoped dispatch cannot ride a core namespace).
 *   tenantId absent + namespace 'tenant::<t>' -> derive tenant_id = t.
 *   both absent -> core execution, tenant_id = null.
 *
 * @returns {string|null} the resolved tenant_id, or null for core.
 */
function resolveTenantId({ tenantId, namespace }) {
  if (tenantId !== undefined && tenantId !== null) {
    if (typeof tenantId !== 'string' || !TENANT_ID_RE.test(tenantId)) {
      throw new Error(`tenantId rejected: must match ${TENANT_ID_RE}`);
    }
    const m = /^tenant::(.+)$/.exec(namespace || '');
    if (!m) {
      throw new Error('tenant_namespace_mismatch: tenantId provided but namespace is not tenant::<tenant_id>');
    }
    if (m[1] !== tenantId) {
      throw new Error(`tenant_namespace_mismatch: event tenant_id '${tenantId}' contradicts namespace '${namespace}'`);
    }
    return tenantId;
  }
  const m = /^tenant::(.+)$/.exec(namespace || '');
  if (m) {
    if (!TENANT_ID_RE.test(m[1])) {
      throw new Error(`tenant namespace rejected: tenant portion '${m[1]}' must match ${TENANT_ID_RE}`);
    }
    return m[1];
  }
  return null;
}

// Explicit belt-and-suspenders identity fence (the vendored adapter also
// denies unknown agents fail-closed; this names the DENIED set plainly).
const DENIED_IDENTITY_IDS = Object.freeze(
  new Set(['identity_5', 'identity_6', 'identity_7', 'identity_8', 'identity_9', 'identity_10'])
);

function isoNow() {
  return new Date().toISOString();
}

function validateExecution(execution) {
  if (!execution || typeof execution !== 'object') throw new Error('execution record required');
  for (const f of ['missionId', 'runId', 'executionId', 'attempt']) {
    const v = execution[f];
    if (typeof v !== 'string' || v.length === 0) {
      throw new Error(`execution.${f} required (non-empty string)`);
    }
  }
  return execution;
}

/**
 * Proven worker-protocol prompt (from orca-dispatch-test/orca_control_loop.js,
 * witnessed live). The worker replies with ONLY one JSON object: the 8-field
 * result envelope. All execution context goes inline — hermes cannot see
 * WSL/cloud paths (verified 2026-09-16/17).
 */
function buildWorkerPrompt(workOrder, taskBrief, tenantId) {
  const contextLines = [
    'Execution context (informational; do not narrate it back):',
    `  mission: ${workOrder.mission_id}`,
    `  execution: ${workOrder.task_id} (attempt ${workOrder.attempt})`,
  ];
  if (tenantId) contextLines.push(`  tenant: ${tenantId}`);
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
    ...contextLines,
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

/** Balanced-brace JSON extraction from worker stdout (proven shape). */
function extractEnvelope(stdout) {
  if (typeof stdout !== 'string') return { ok: false, reason: 'stdout is not a string' };
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
 * Hermes transport (sandbox side). One synchronous oneshot invocation of
 * prompt-hermes.sh with the prompt inline. No env secrets, no file-path
 * assumptions across the boundary.
 */
function dispatchHermes(promptText, timeoutMs) {
  const startedAt = isoNow();
  const tmp = path.join(os.tmpdir(), `orca-adapter-prompt-${Date.now()}-${process.pid}.txt`);
  fs.writeFileSync(tmp, promptText, 'utf8');
  try {
    const r = spawnSync('bash', [PROMPT_HERMES_SH], {
      input: fs.readFileSync(tmp, 'utf8'),
      timeout: timeoutMs,
      maxBuffer: 4 * 1024 * 1024,
      encoding: 'utf8',
    });
    const endedAt = isoNow();
    const timedOut = !!(r.error && (r.error.code === 'ETIMEDOUT' || /timed out/i.test(r.error.message || '')));
    return {
      transport: 'hermes',
      startedAt,
      endedAt,
      timedOut,
      exitCode: r.status,
      error: r.error ? String(r.error.message || r.error).slice(0, 500) : null,
      stdout: r.stdout || '',
      stderr: (r.stderr || '').slice(0, 2000),
    };
  } finally {
    try { fs.unlinkSync(tmp); } catch (_) {}
  }
}

function saveArtifact(evidenceDir, name, obj) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  const p = path.join(evidenceDir, name);
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  fs.renameSync(tmp, p); // atomic
  return p;
}

/**
 * Dispatch one execution through the headless agent adapter.
 *
 * @param {Object} opts
 * @param {{missionId,runId,executionId,attempt}} opts.execution  caller-owned identity
 * @param {string} opts.agentId      dispatcher family profile (e.g. 'hermes')
 * @param {string} opts.capability   must be in the profile's allowedCapabilities
 * @param {string} opts.namespace    'core::...' or 'tenant::...'
 * @param {Object} opts.constraints  must tighten the profile maximum;
 *                                    no_canonical_events=true and
 *                                    no_mission_state_writes=true are hard-required
 * @param {string} opts.taskBrief    capability task brief (prompt body)
 * @param {Object} [opts.input]      inline input data
 * @param {string} [opts.contextPackId]
 * @param {number} [opts.deadlineMs=600000]   10-minute absolute deadline
 * @param {number} [opts.timeoutMs=120000]    dispatcher transport timeout
 * @param {string} [opts.transport='hermes']
 * @param {Function|null} [opts.transportFn]  SYNTHETIC-TEST-ONLY override.
 *        Receives (promptText, timeoutMs); returns the dispatchHermes record
 *        shape {startedAt, endedAt, timedOut, exitCode, stdout, stderr, error}.
 *        Never provided in production.
 * @param {Object|null} [opts.eventRuntime]   injected canonical event runtime
 *                                            (UnifiedEventRuntime). Null =
 *                                            verify but do NOT record.
 * @param {string} [opts.evidenceDir]
 * @param {string} [opts.tenantId]  authoritative tenant from the scheduler
 *        dispatch event (`event.tenant_id`, lane B). Threaded into the
 *        evidence artifact as `tenant_id`. Fail-closed on namespace
 *        contradiction (mirrors lane B's 400 semantics).
 * @returns {Promise<Object>} execution outcome (see outcomes.js).
 */
async function dispatchExecution(opts) {
  const execution = validateExecution(opts.execution);
  const {
    agentId, capability, namespace, constraints, taskBrief,
    input = {}, contextPackId, deadlineMs = 600000, timeoutMs = 120000,
    transport = 'hermes', transportFn = null, eventRuntime = null,
    evidenceDir = path.join(__dirname, 'evidence'), tenantId = null,
  } = opts;

  if (typeof taskBrief !== 'string' || taskBrief.length === 0) {
    throw new Error('taskBrief required (non-empty string)');
  }

  // 1. Identity fence: 5..10 explicitly denied, fail closed.
  if (DENIED_IDENTITY_IDS.has(agentId)) {
    return {
      outcome: OUTCOME.DENIED,
      reason: 'identity_5..10 are DENIED (Nolan 2026-09-25). Use identities 1-4 only.',
      execution,
      agentId,
    };
  }

  // 2. AUTHORIZE (fail-closed; vendored proven adapter).
  const auth = vendor.authorizeWorkOrder({ agentId, capability, namespace, constraints });
  if (!auth.granted) {
    return { outcome: OUTCOME.DENIED, reason: auth.reason || 'authorization denied', execution, agentId };
  }

  // 2b. TENANT threading (lane B handoff, additive): resolve the authoritative
  // tenant from the dispatch event BEFORE anything reaches the worker. Throws
  // fail-closed on namespace contradiction; never dispatched on mismatch.
  const tenant_id = resolveTenantId({ tenantId, namespace });

  // 3. ISSUE (deterministic work_order_id = sha256('workorder:' + taskId)[0:16]
  //    — same (executionId, attempt) re-issues the same work order).
  //    result_path is PING-owned: the artifact the adapter writes below.
  //    The worker never writes here directly.
  const artifactName = `result-${execution.executionId}-a${execution.attempt}.json`;
  fs.mkdirSync(evidenceDir, { recursive: true });
  const taskId = `${execution.executionId}:attempt-${execution.attempt}`;
  const deadline = new Date(Date.now() + deadlineMs).toISOString();
  const workOrder = vendor.issueWorkOrder({
    agentId, capability, namespace, taskId,
    missionId: `mission-control:${execution.missionId}:${execution.runId}`,
    correlationId: execution.runId,
    contextPackId: contextPackId || `orca-context-${execution.executionId}`,
    input, constraints,
    resultPath: path.join(evidenceDir, artifactName),
    deadline,
    causationId: null,
    attempt: 1,
  });

  const prompt = buildWorkerPrompt(workOrder, taskBrief, tenant_id);

  // 4. DISPATCH to the real headless agent.
  let disp;
  if (transportFn) {
    disp = transportFn(prompt, timeoutMs); // synthetic tests only
  } else if (transport === 'hermes') {
    disp = dispatchHermes(prompt, timeoutMs);
  } else {
    throw new Error(`unknown transport: ${transport} (only 'hermes' is proven)`);
  }

  const artifactBase = {
    adapter: ADAPTER_VERSION,
    execution,
    tenant_id, // lane B threading: authoritative event.tenant_id, null for core
    work_order_id: workOrder.work_order_id,
    transport: disp.transport,
    startedAt: disp.startedAt,
    endedAt: disp.endedAt,
    timedOut: disp.timedOut,
    exitCode: disp.exitCode,
    transportError: disp.error,
    stderr: disp.stderr,
  };

  // 5. Timeout: honest UNKNOWN. The worker may still be running; the
  //    dispatcher does not know. Never collapse into failed.
  if (disp.timedOut) {
    const artifactPath = saveArtifact(evidenceDir, artifactName, {
      ...artifactBase,
      outcome: OUTCOME.UNKNOWN,
      reason: 'dispatcher_timeout',
      note: 'No worker output captured. The worker may still be running or its output may be lost. Reconcile-vs-retry is the caller\'s decision.',
      stdoutTail: (disp.stdout || '').slice(-2000),
    });
    return { ...unknownOutcome('dispatcher_timeout', { artifactPath, work_order_id: workOrder.work_order_id }), execution, tenant_id, artifactPath, work_order_id: workOrder.work_order_id };
  }

  // 6. EXTRACT the result envelope from worker stdout.
  const ext = extractEnvelope(disp.stdout);
  if (!ext.ok) {
    const artifactPath = saveArtifact(evidenceDir, artifactName, {
      ...artifactBase,
      outcome: OUTCOME.UNKNOWN,
      reason: 'worker_protocol_failure',
      extraction: ext,
      note: 'No parseable envelope. Per the proven contract this is non-retryable and can NEVER reach canonical event authority.',
      stdoutTail: (disp.stdout || '').slice(-2000),
    });
    return { outcome: OUTCOME.ESCALATED, reason: ext.reason, execution, tenant_id, artifactPath, work_order_id: workOrder.work_order_id, honestOutcome: OUTCOME.UNKNOWN };
  }

  // 7. VERIFY (proven contract: binding, echoes, status, deadline).
  const verifiedAt = isoNow();
  const verification = vendor.verifyResultEnvelope(ext.envelope, workOrder, { invokedAgentId: agentId, verifiedAt });
  if (!verification.valid) {
    const artifactPath = saveArtifact(evidenceDir, artifactName, {
      ...artifactBase,
      outcome: OUTCOME.UNKNOWN,
      reason: 'envelope_verification_failed',
      verification,
      envelope: ext.envelope,
      note: 'Invalid envelope is non-retryable and can NEVER reach canonical event authority.',
    });
    return { outcome: OUTCOME.ESCALATED, reason: verification.reason || 'envelope verification failed', execution, tenant_id, artifactPath, work_order_id: workOrder.work_order_id, honestOutcome: OUTCOME.UNKNOWN };
  }

  // 8. RECORD on the existing event plane (injected runtime only).
  let record = null;
  if (eventRuntime) {
    record = await vendor.recordVerifiedResult({ eventRuntime, result: ext.envelope, workOrder, invokedAgentId: agentId, verifiedAt });
    if (!record.valid) {
      // Emission rejected: the row stays unrecorded; the caller retries on
      // the normal path. This is the Lane-J-proven fail-closed behavior.
      const artifactPath = saveArtifact(evidenceDir, artifactName, {
        ...artifactBase,
        outcome: OUTCOME.UNKNOWN,
        reason: 'canonical_emission_rejected',
        verification,
        envelope: ext.envelope,
        note: 'Worker reported a verified outcome but the event plane rejected the record. No terminal event exists. Caller retries.',
      });
      return { ...unknownOutcome('canonical_emission_rejected', { artifactPath }), execution, tenant_id, artifactPath, work_order_id: workOrder.work_order_id, result_id: verification.result_id };
    }
  }

  const artifactPath = saveArtifact(evidenceDir, artifactName, {
    ...artifactBase,
    outcome: ext.envelope.status,
    result_id: verification.result_id,
    event_type: record ? record.event_type : null,
    event_id: record ? record.event_id : null,
    recorded: !!record,
    envelope: ext.envelope,
  });

  return {
    ...terminalOutcome(ext.envelope.status === 'completed' ? OUTCOME.COMPLETED : OUTCOME.FAILED, {}),
    execution,
    tenant_id,
    work_order_id: workOrder.work_order_id,
    result_id: verification.result_id,
    event_id: record ? record.event_id : null,
    event_type: record ? record.event_type : null,
    recorded: !!record,
    artifactPath,
  };
}

module.exports = {
  ADAPTER_VERSION,
  DENIED_IDENTITY_IDS,
  TENANT_ID_RE,
  resolveTenantId,
  dispatchExecution,
  buildWorkerPrompt,
  extractEnvelope,
  dispatchHermes,
  validateExecution,
};
