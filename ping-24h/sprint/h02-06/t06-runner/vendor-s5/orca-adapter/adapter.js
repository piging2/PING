// ==== T-06 HARNESS COPY — NOT PRODUCT CODE ====
// Source: branch mc/lane-c-reconcile-gate, commit 25e33e9, path orca-adapter/adapter.js
// Extracted read-only for the T-06 corpus runner (~/workspace/ping-24h/sprint/h02-06/t06-runner).
// Never wired into any product suite. Do not edit, commit, or deploy.
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
 *      (scp prompt to Pig C:\Users\nolan\hermes-bridge\hermes-prompt.txt; runs
 *       `wsl -u nolan -- bash /mnt/c/Users/nolan/hermes-bridge/hermes-run.sh`,
 *       which execs the venv python hermes_cli/main.py --safe-mode -z <prompt> —
 *       persistent bridge path since 2026-09-26; C:\Windows\Temp was volatile
 *       and lost the files 2026-09-25)
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
const crypto = require('crypto');

const vendor = require('./vendor/external_agent_adapter.js');
const { OUTCOME, EFFECT_STATE, unknownOutcome, terminalOutcome } = require('./outcomes.js');

const ADAPTER_VERSION = 'lane-c/1.2.0';
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

/* =====================================================================
 * RECONCILE GATE — S5 RETRY-AFTER-UNKNOWN closure (2026-09-26).
 *
 * The P4 red team proved the adapter would blindly re-dispatch an intent
 * whose prior attempt ended UNKNOWN: 3x retry invoked the transport 3x and
 * the remote committed 3x, and the same-(executionId,attempt) retry
 * atomically overwrote the prior UNKNOWN artifact, destroying the evidence.
 *
 * The gate enforces, on the dispatch path and BEFORE any transport
 * invocation:
 *   (a) IDEMPOTENCY KEY: sha256 over canonical intent bytes —
 *       {missionId, runId, executionId, input_hash, tenant, capability}.
 *       Same intent -> same key. The attempt number is deliberately NOT
 *       part of the key: a retry is the same intent.
 *   (b) PRIOR-OUTCOME LOOKUP in an append-only per-evidenceDir index
 *       (idempotency-index.jsonl). If the latest prior attempt for the key
 *       is UNCERTAIN — outcome unknown/escalated, status 'unknown',
 *       effect_state effect_unknown (which every non-denied outcome
 *       records), or dispatched-but-never-concluded — a new attempt is
 *       REFUSED with a typed refusal (reconciliation_required) unless the
 *       caller supplies an explicit reconciliation record
 *       {checked, found, decidedBy} covering that attempt. The record is
 *       validated and persisted; only then may a NEW attempt number proceed.
 *   (c) DUPLICATE ATTEMPTS (same key + same attempt string) are always
 *       refused (duplicate_attempt): the attempt already has its evidence.
 *       A pre-write existsSync guard makes the never-overwrite-artifact
 *       property hold even if the index is lost.
 *   (d) Every UNKNOWN outcome the adapter emits carries the shared
 *       unknown-outcome signal: {status:'unknown', summary,
 *       effect_may_have_occurred}. The front door maps it to UNKNOWN/HOLD;
 *       the gate keys its prior-outcome lookup on the same signal.
 *
 * The adapter never reconciles by itself and never retries: reconcile vs
 * retry stays caller-owned (outcomes.js). The gate only refuses.
 *
 * Scope note: the gate's memory is the evidenceDir it writes to. Callers
 * that share an evidenceDir share the gate; callers with separate dirs
 * have separate gates. Cross-process races are best-effort (append-only
 * JSONL, one line per record); within one process the gate is exact.
 * ===================================================================== */

const IDEMPOTENCY_INDEX = 'idempotency-index.jsonl';

/** Deterministic JSON: object keys sorted recursively, undefined dropped like JSON. */
function stableStringify(v) {
  if (v === null || v === undefined) return v === null ? 'null' : undefined;
  if (typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map((e) => { const s = stableStringify(e); return s === undefined ? 'null' : s; }).join(',') + ']';
  const keys = Object.keys(v).sort();
  const parts = [];
  for (const k of keys) {
    const s = stableStringify(v[k]);
    if (s !== undefined) parts.push(JSON.stringify(k) + ':' + s);
  }
  return '{' + parts.join(',') + '}';
}

function sha256hex(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

/**
 * (a) Stable idempotency key from the canonical intent bytes.
 * Same intent -> same key. The attempt number is NOT an input: a retry
 * (same intent, new attempt) must resolve to the same key so the gate sees
 * the prior attempt. agentId is NOT an input either: re-dispatching the
 * same intent under a different agent is still a second dispatch of the
 * same intent.
 */
function idempotencyKeyFor({ execution, input, tenant_id, capability }) {
  const e = execution || {};
  const canonical = {
    capability: String(capability === undefined || capability === null ? '' : capability),
    executionId: String(e.executionId || ''),
    input_hash: sha256hex(stableStringify(input === undefined ? null : input) || 'null'),
    missionId: String(e.missionId || ''),
    runId: String(e.runId || ''),
    tenant: tenant_id === undefined || tenant_id === null ? null : String(tenant_id),
  };
  return 'idem-' + sha256hex(JSON.stringify(canonical)).slice(0, 32);
}

function indexPathFor(evidenceDir) {
  return path.join(evidenceDir, IDEMPOTENCY_INDEX);
}

function appendIndexLine(evidenceDir, record) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.appendFileSync(indexPathFor(evidenceDir), JSON.stringify({ ...record, at: record.at || isoNow() }) + '\n', 'utf8');
}

/**
 * Read prior index records for one idempotency key, in append order.
 * Fail-closed: an unreadable-but-present index means we cannot prove there
 * was no prior uncertain attempt, so the caller gets a typed refusal
 * instead of a blind dispatch. (ENOENT = no index yet = no priors.)
 */
function readIndexRecords(evidenceDir, idempotencyKey) {
  const p = indexPathFor(evidenceDir);
  let raw;
  try {
    raw = fs.readFileSync(p, 'utf8');
  } catch (e) {
    if (e && e.code === 'ENOENT') return { ok: true, records: [] };
    throw e;
  }
  const records = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch (_) {
      return { ok: false, reason: 'idempotency_index_corrupt', detail: `unparseable line in ${IDEMPOTENCY_INDEX}; refusing fail-closed` };
    }
    if (rec && rec.idempotency_key === idempotencyKey) records.push(rec);
  }
  return { ok: true, records };
}

/**
 * (b) Is a recorded attempt UNCERTAIN? True when the dispatcher has no
 * trustworthy verdict: outcome unknown/escalated, the contract's
 * status:'unknown' signal, effect_state effect_unknown (which every
 * non-denied outcome records — a verified completion is not proof of
 * no-effect, Q10), or dispatched-but-never-concluded (process died
 * mid-flight; fail closed).
 */
function attemptIsUncertain(rec) {
  if (!rec || rec.phase !== 'outcome') return true;
  return rec.outcome === OUTCOME.UNKNOWN ||
    rec.outcome === OUTCOME.ESCALATED ||
    rec.status === 'unknown' ||
    rec.effect_state === EFFECT_STATE.UNKNOWN;
}

function validateReconciliation(reconciliation, attempt) {
  if (!reconciliation || typeof reconciliation !== 'object' || Array.isArray(reconciliation)) {
    return ['reconciliation record required: { checked, found, decidedBy } (+ optional decidedAt, authorizesAttempt)'];
  }
  const problems = [];
  const need = {
    checked: 'what was checked (remote state, logs, receipts, ...)',
    found: 'what was found (effect committed? partial? absent?)',
    decidedBy: 'who decided the retry is safe (human or system identity)',
  };
  for (const f of Object.keys(need)) {
    if (typeof reconciliation[f] !== 'string' || reconciliation[f].trim().length === 0) {
      problems.push(`reconciliation.${f} required (non-empty string): ${need[f]}`);
    }
  }
  if (reconciliation.authorizesAttempt !== undefined && reconciliation.authorizesAttempt !== null &&
      String(reconciliation.authorizesAttempt) !== String(attempt)) {
    problems.push(`reconciliation.authorizesAttempt '${reconciliation.authorizesAttempt}' does not match this dispatch attempt '${attempt}'`);
  }
  return problems;
}

/** Typed refusal: machine-readable, never a blind dispatch, never an overwrite. */
function gateRefusal({ reason, idempotency_key, execution, tenant_id, reconciliation }) {
  return {
    outcome: OUTCOME.DENIED,
    reason,
    // This call dispatched nothing: no external effect is possible from it.
    effect_state: EFFECT_STATE.NONE,
    execution,
    tenant_id,
    idempotency_key,
    reconciliation_required: reason === 'reconciliation_required' || reason === 'reconciliation_invalid',
    reconciliation: reconciliation || null,
  };
}

function appendRefusal(evidenceDir, { idempotency_key, execution, reason, reconciliation }) {
  appendIndexLine(evidenceDir, {
    type: 'refusal', idempotency_key,
    executionId: execution.executionId, attempt: execution.attempt,
    reason, reconciliation: reconciliation || null,
  });
}

/**
 * (b)+(c) The reconcile gate. Runs BEFORE any transport invocation.
 * Returns {allowed:true, idempotency_key, reconciliationAccepted, reconcilesAttempt}
 * or {allowed:false, idempotency_key, refusal}.
 */
function reconcileGate({ evidenceDir, execution, input, tenant_id, capability, reconciliation }) {
  const idempotency_key = idempotencyKeyFor({ execution, input, tenant_id, capability });
  const read = readIndexRecords(evidenceDir, idempotency_key);
  if (!read.ok) {
    const reconciliationInfo = { required: false, corrupt: true, detail: read.detail };
    const refusal = gateRefusal({ reason: 'idempotency_index_corrupt', idempotency_key, execution, tenant_id, reconciliation: reconciliationInfo });
    appendRefusal(evidenceDir, { idempotency_key, execution, reason: 'idempotency_index_corrupt', reconciliation: reconciliationInfo });
    return { allowed: false, idempotency_key, refusal };
  }
  const attempts = read.records.filter((r) => r.type === 'attempt');

  // (c) Same key + same attempt string: the attempt already has its
  // evidence. Never re-dispatch it, never overwrite its artifact — no
  // reconciliation record can unlock the SAME attempt number.
  const dup = attempts.find((a) => a.attempt === execution.attempt);
  if (dup) {
    const reconciliationInfo = {
      required: false,
      duplicate: true,
      prior_attempt: dup.attempt,
      prior_artifact: dup.artifact || null,
      note: `attempt '${execution.attempt}' was already dispatched for this intent; retries must use a NEW execution.attempt`,
    };
    const refusal = gateRefusal({ reason: 'duplicate_attempt', idempotency_key, execution, tenant_id, reconciliation: reconciliationInfo });
    appendRefusal(evidenceDir, { idempotency_key, execution, reason: 'duplicate_attempt', reconciliation: reconciliationInfo });
    return { allowed: false, idempotency_key, refusal };
  }

  // (b) Latest prior attempt is uncertain: the caller must supply an
  // explicit reconciliation record covering it. Each unknown needs its own
  // record; the record is validated and persisted, and only then may a NEW
  // attempt number proceed.
  const latest = attempts.length ? attempts[attempts.length - 1] : null; // append order = chronological
  if (latest && attemptIsUncertain(latest)) {
    const priorInfo = {
      prior_attempt: latest.attempt,
      prior_outcome: latest.phase === 'outcome' ? latest.outcome : 'dispatched_without_outcome',
      prior_reason: latest.reason || null,
      prior_effect_state: latest.effect_state || null,
      prior_artifact: latest.artifact || null,
      prior_at: latest.at || null,
    };
    const supplied = reconciliation !== null && reconciliation !== undefined;
    const problems = validateReconciliation(reconciliation, execution.attempt);
    if (!supplied || problems.length) {
      const reason = !supplied ? 'reconciliation_required' : 'reconciliation_invalid';
      const reconciliationInfo = {
        required: true,
        ...priorInfo,
        requires: 'opts.reconciliation = { checked: <what was checked>, found: <what was found>, decidedBy: <who decided> } with a NEW execution.attempt',
        ...(problems.length ? { problems } : {}),
      };
      const refusal = gateRefusal({ reason, idempotency_key, execution, tenant_id, reconciliation: reconciliationInfo });
      appendRefusal(evidenceDir, { idempotency_key, execution, reason, reconciliation: reconciliationInfo });
      return { allowed: false, idempotency_key, refusal };
    }
    return { allowed: true, idempotency_key, reconciliationAccepted: true, reconcilesAttempt: latest.attempt };
  }
  return { allowed: true, idempotency_key, reconciliationAccepted: false, reconcilesAttempt: null };
}

/**
 * (d) Shared unknown-outcome signal (front-door H5b contract): every
 * UNKNOWN outcome the adapter emits carries an explicit status:'unknown'
 * plus a one-line summary plus effect_may_have_occurred. The front door
 * maps it to an UNKNOWN/HOLD terminal; the reconcile gate keys its
 * prior-outcome lookup on the same signal.
 */
function unknownSignal(summary, effectMayHaveOccurred) {
  return {
    status: 'unknown',
    summary: String(summary || 'outcome unknown'),
    effect_may_have_occurred: effectMayHaveOccurred !== false, // conservative default
  };
}

function unknownReturn(reason, { summary, effect_may_have_occurred = true, detail = {}, execution, tenant_id, artifactPath, work_order_id, extra = {} }) {
  return {
    ...unknownOutcome(reason, { artifactPath, work_order_id, ...detail }),
    ...unknownSignal(summary, effect_may_have_occurred),
    execution,
    tenant_id,
    artifactPath,
    work_order_id,
    ...extra,
  };
}

/**
 * Escalated return: worker protocol failure. Fix 1a — the artifact records
 * the SAME outcome label the API returns ('escalated'); the honest
 * distributed-systems truth rides along as honestOutcome:'unknown'.
 * Fix 1b — every unknown-path return carries reconcileOwnedBy explicitly.
 */
function escalatedReturn(reason, { summary, execution, tenant_id, artifactPath, work_order_id, extra = {} }) {
  return {
    outcome: OUTCOME.ESCALATED,
    ...unknownSignal(summary, true),
    reason,
    honestOutcome: OUTCOME.UNKNOWN,
    reconcileOwnedBy: 'caller',
    effect_state: EFFECT_STATE.UNKNOWN,
    execution,
    tenant_id,
    artifactPath,
    work_order_id,
    ...extra,
  };
}

/** Append the concluded-attempt line to the idempotency index. */
function recordAttemptOutcome(evidenceDir, gate, execution, result, artifactPath) {
  appendIndexLine(evidenceDir, {
    type: 'attempt', phase: 'outcome',
    idempotency_key: gate.idempotency_key,
    executionId: execution.executionId, attempt: execution.attempt,
    outcome: result.outcome || null,
    status: result.status || null,
    reason: result.reason || null,
    effect_state: result.effect_state || null,
    effect_may_have_occurred: result.effect_may_have_occurred === true,
    artifact: artifactPath || null,
  });
  return result;
}

/**
 * Fix 1c: the spawn signal (SIGKILL/SIGTERM/...) is evidence, never trivia.
 * Taken from the transport record when present; else extracted from a
 * signal named in the transport error text (synthetic transports may
 * report it there); else an explicit null with its provenance.
 */
function extractSignal(disp) {
  if (disp && disp.signal) return { signal: disp.signal, signal_source: 'transport' };
  const m = /SIG[A-Z]{2,}/.exec((disp && disp.error) || '');
  if (m) return { signal: m[0], signal_source: 'error-text' };
  return { signal: null, signal_source: 'none-reported' };
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
  // CAVEAT-1 closure (2026-09-26): authorization constraints were never
  // rendered into the worker prompt. They are now: the worker sees the exact
  // binding constraints and the fail-closed rule for constraint conflicts.
  const constraintEntries = Object.keys(workOrder.constraints || {}).sort();
  const constraintLines = constraintEntries.length
    ? constraintEntries.map((k) => `  - ${k}: ${JSON.stringify(workOrder.constraints[k])}`)
    : ['  (none recorded — the prohibitions below still bind)'];
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
    'Binding constraints (authorization conditions, not suggestions):',
    ...constraintLines,
    'Treat every constraint above as binding. If the task seems to require violating a constraint, report status "failed" with an explanation in "error" instead. Never perform the violating action.',
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
      // Fix 1c: the spawn signal is evidence. spawnSync reports it on
      // r.signal when the child dies from a signal (kill -9, OOM, ...);
      // dropping it made crash forensics impossible.
      signal: r.signal || null,
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
 *        shape {startedAt, endedAt, timedOut, exitCode, signal, stdout, stderr,
 *        error}. signal is the spawn signal string ('SIGKILL', ...) or null.
 *        Never provided in production.
 * @param {Object|null} [opts.reconciliation]  Caller-supplied reconciliation
 *        record, REQUIRED before a new attempt may proceed when the latest
 *        prior attempt for the intent's idempotency key is uncertain
 *        (unknown/escalated/effect_unknown, or dispatched-but-unconcluded).
 *        Shape: {checked:<what was checked>, found:<what was found>,
 *        decidedBy:<who decided>, decidedAt?:<ISO>, authorizesAttempt?:<attempt>}.
 *        The record is validated and persisted to the idempotency index; it
 *        unlocks exactly one NEW execution.attempt. It can never unlock the
 *        SAME attempt number (evidence is never overwritten).
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
    reconciliation = null,
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
      // Nothing was invoked: no external effect is possible.
      effect_state: EFFECT_STATE.NONE,
    };
  }

  // 2. AUTHORIZE (fail-closed; vendored proven adapter).
  const auth = vendor.authorizeWorkOrder({ agentId, capability, namespace, constraints });
  if (!auth.granted) {
    return { outcome: OUTCOME.DENIED, reason: auth.reason || 'authorization denied', execution, agentId, effect_state: EFFECT_STATE.NONE };
  }

  // 2b. TENANT threading (lane B handoff, additive): resolve the authoritative
  // tenant from the dispatch event BEFORE anything reaches the worker. Throws
  // fail-closed on namespace contradiction; never dispatched on mismatch.
  const tenant_id = resolveTenantId({ tenantId, namespace });

  // 2c. RECONCILE GATE (S5 closure): idempotency key + prior-outcome lookup,
  // BEFORE any transport invocation. Refuses duplicate attempts and
  // unreconciled-unknown retries with typed refusals. Never a blind second
  // dispatch, never an artifact overwrite.
  const artifactName = `result-${execution.executionId}-a${execution.attempt}.json`;
  const gate = reconcileGate({ evidenceDir, execution, input, tenant_id, capability, reconciliation });
  if (!gate.allowed) return gate.refusal;
  // Defense in depth: even if the index was lost or tampered with, an
  // existing artifact for this attempt is evidence that must never be
  // overwritten. Refuse instead of clobbering.
  if (fs.existsSync(path.join(evidenceDir, artifactName))) {
    const reconciliationInfo = {
      required: false,
      duplicate: true,
      prior_attempt: execution.attempt,
      prior_artifact: path.join(evidenceDir, artifactName),
      note: 'artifact already exists for this attempt (index disagreement: fail closed, never overwrite)',
    };
    const refusal = gateRefusal({ reason: 'artifact_exists', idempotency_key: gate.idempotency_key, execution, tenant_id, reconciliation: reconciliationInfo });
    appendRefusal(evidenceDir, { idempotency_key: gate.idempotency_key, execution, reason: 'artifact_exists', reconciliation: reconciliationInfo });
    return refusal;
  }

  // 3. ISSUE (deterministic work_order_id = sha256('workorder:' + taskId)[0:16]
  //    — same (executionId, attempt) re-issues the same work order).
  //    result_path is PING-owned: the artifact the adapter writes below.
  //    The worker never writes here directly.
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
  // Resolve the invoker BEFORE recording anything: an unknown transport is
  // a programming error and must throw before the index sees this attempt.
  const invokeTransport = transportFn
    ? (p, t) => transportFn(p, t)
    : transport === 'hermes'
      ? (p, t) => dispatchHermes(p, t)
      : null;
  if (!invokeTransport) {
    throw new Error(`unknown transport: ${transport} (only 'hermes' is proven)`);
  }
  // The reconciliation record (when one was required and accepted) and the
  // dispatched-phase index line land BEFORE the transport is invoked: a
  // process death between invocation and the outcome line still leaves an
  // honest dispatched-without-outcome record (read as uncertain, fail closed).
  if (gate.reconciliationAccepted) {
    appendIndexLine(evidenceDir, {
      type: 'reconciliation',
      idempotency_key: gate.idempotency_key,
      reconciles_attempt: gate.reconcilesAttempt,
      authorizes_attempt: execution.attempt,
      checked: reconciliation.checked,
      found: reconciliation.found,
      decidedBy: reconciliation.decidedBy,
      decided_at: reconciliation.decidedAt || isoNow(),
    });
  }
  appendIndexLine(evidenceDir, {
    type: 'attempt', phase: 'dispatched',
    idempotency_key: gate.idempotency_key,
    executionId: execution.executionId, attempt: execution.attempt,
    work_order_id: workOrder.work_order_id,
    capability, tenant_id,
  });
  const disp = invokeTransport(prompt, timeoutMs);

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
    // Fix 1c: the spawn signal is captured into the evidence; never silently
    // null — its provenance is recorded alongside.
    ...extractSignal(disp),
    transportError: disp.error,
    stderr: disp.stderr,
    // DEFECT-2: every persisted artifact carries the external-effect state.
    // Every artifact-saved path below is non-denied (something may have run),
    // so the base is effect_unknown; the step-8 terminal artifact keeps it
    // (verified completion records effect_unknown, never clean success).
    effect_state: EFFECT_STATE.UNKNOWN,
  };

  // 5. Timeout: honest UNKNOWN. The worker may still be running; the
  //    dispatcher does not know. Never collapse into failed.
  if (disp.timedOut) {
    const artifactPath = saveArtifact(evidenceDir, artifactName, {
      ...artifactBase,
      outcome: OUTCOME.UNKNOWN,
      reason: 'dispatcher_timeout',
      ...unknownSignal('dispatcher timed out waiting for the worker; the worker may still be running', true),
      note: 'No worker output captured. The worker may still be running or its output may be lost. Reconcile-vs-retry is the caller\'s decision.',
      stdoutTail: (disp.stdout || '').slice(-2000),
    });
    return recordAttemptOutcome(evidenceDir, gate, execution,
      unknownReturn('dispatcher_timeout', {
        summary: 'dispatcher timed out; the worker may still be running; outcome unknown',
        execution, tenant_id, artifactPath, work_order_id: workOrder.work_order_id,
      }), artifactPath);
  }

  // 6. EXTRACT the result envelope from worker stdout.
  const ext = extractEnvelope(disp.stdout);
  if (!ext.ok) {
    const artifactPath = saveArtifact(evidenceDir, artifactName, {
      ...artifactBase,
      // Fix 1a: the artifact records the SAME outcome label the API
      // returns ('escalated'); the honest distributed-systems truth rides
      // along as honestOutcome:'unknown'.
      outcome: OUTCOME.ESCALATED,
      honestOutcome: OUTCOME.UNKNOWN,
      reason: 'worker_protocol_failure',
      ...unknownSignal('worker output was not a parseable result envelope; no trustworthy worker report', true),
      extraction: ext,
      note: 'No parseable envelope. Per the proven contract this is non-retryable and can NEVER reach canonical event authority.',
      stdoutTail: (disp.stdout || '').slice(-2000),
    });
    return recordAttemptOutcome(evidenceDir, gate, execution,
      escalatedReturn('worker_protocol_failure', {
        summary: 'worker output was not a parseable result envelope; no trustworthy worker report',
        execution, tenant_id, artifactPath, work_order_id: workOrder.work_order_id,
        extra: { extractionReason: ext.reason },
      }), artifactPath);
  }

  // 6b. The worker honestly reports it cannot determine the outcome. This is
  // NOT a protocol failure — the worker used the explicit unknown channel —
  // so it maps to an honest UNKNOWN (never ESCALATED), carrying the
  // worker's own summary. (Whether the worker prompt advertises this status
  // is protocol evolution owned by the front-door H5b lane; the adapter
  // only classifies honestly what it receives.)
  if (ext.envelope && ext.envelope.status === 'unknown') {
    const wSummary = typeof ext.envelope.summary === 'string' && ext.envelope.summary.trim()
      ? ext.envelope.summary.trim().slice(0, 500)
      : 'worker reported unknown outcome without a summary';
    const wEffectMay = ext.envelope.effect_may_have_occurred !== false; // conservative default
    const artifactPath = saveArtifact(evidenceDir, artifactName, {
      ...artifactBase,
      outcome: OUTCOME.UNKNOWN,
      reason: 'worker_reported_unknown',
      ...unknownSignal(`worker reported unknown: ${wSummary}`, wEffectMay),
      envelope: ext.envelope,
      note: 'The worker used the explicit unknown channel (effect performed, outcome unconfirmed). Reconcile-vs-retry is the caller\'s decision.',
      stdoutTail: (disp.stdout || '').slice(-2000),
    });
    return recordAttemptOutcome(evidenceDir, gate, execution,
      unknownReturn('worker_reported_unknown', {
        summary: `worker reported unknown: ${wSummary}`,
        effect_may_have_occurred: wEffectMay,
        execution, tenant_id, artifactPath, work_order_id: workOrder.work_order_id,
      }), artifactPath);
  }

  // 7. VERIFY (proven contract: binding, echoes, status, deadline).
  const verifiedAt = isoNow();
  const verification = vendor.verifyResultEnvelope(ext.envelope, workOrder, { invokedAgentId: agentId, verifiedAt });
  if (!verification.valid) {
    const artifactPath = saveArtifact(evidenceDir, artifactName, {
      ...artifactBase,
      // Fix 1a: artifact and API return agree on the outcome label.
      outcome: OUTCOME.ESCALATED,
      honestOutcome: OUTCOME.UNKNOWN,
      reason: 'envelope_verification_failed',
      ...unknownSignal('worker envelope failed verification; no trustworthy worker report', true),
      verification,
      envelope: ext.envelope,
      note: 'Invalid envelope is non-retryable and can NEVER reach canonical event authority.',
    });
    return recordAttemptOutcome(evidenceDir, gate, execution,
      escalatedReturn('envelope_verification_failed', {
        summary: 'worker envelope failed verification; no trustworthy worker report',
        execution, tenant_id, artifactPath, work_order_id: workOrder.work_order_id,
        extra: { verificationReason: verification.reason || null },
      }), artifactPath);
  }

  // 8. RECORD on the existing event plane (injected runtime only).
  // DEFECT-2: the canonical event carries the effect state in its metadata.
  // A verified completion is recorded effect_unknown (worker self-report is
  // a claim, not verification, O5); never clean success.
  let record = null;
  if (eventRuntime) {
    record = await vendor.recordVerifiedResult({ eventRuntime, result: ext.envelope, workOrder, invokedAgentId: agentId, verifiedAt, effectState: EFFECT_STATE.UNKNOWN });
    if (!record.valid) {
      // Emission rejected: the row stays unrecorded; the caller retries on
      // the normal path. This is the Lane-J-proven fail-closed behavior.
      const artifactPath = saveArtifact(evidenceDir, artifactName, {
        ...artifactBase,
        outcome: OUTCOME.UNKNOWN,
        reason: 'canonical_emission_rejected',
        ...unknownSignal('worker reported a verified outcome but the event plane rejected the record; no terminal event exists', true),
        verification,
        envelope: ext.envelope,
        note: 'Worker reported a verified outcome but the event plane rejected the record. No terminal event exists. Caller retries.',
      });
      return recordAttemptOutcome(evidenceDir, gate, execution,
        unknownReturn('canonical_emission_rejected', {
          summary: 'event plane rejected the record; no terminal event exists; outcome unknown',
          execution, tenant_id, artifactPath, work_order_id: workOrder.work_order_id,
          extra: { result_id: verification.result_id },
        }), artifactPath);
    }
  }

  const artifactPath = saveArtifact(evidenceDir, artifactName, {
    ...artifactBase,
    outcome: ext.envelope.status,
    // DEFECT-2: verified completion records effect_unknown (never clean
    // success); verified failure likewise (exit-1 != no-effect, Q10).
    effect_state: EFFECT_STATE.UNKNOWN,
    result_id: verification.result_id,
    event_type: record ? record.event_type : null,
    event_id: record ? record.event_id : null,
    recorded: !!record,
    envelope: ext.envelope,
  });

  return recordAttemptOutcome(evidenceDir, gate, execution, {
    ...terminalOutcome(
      ext.envelope.status === 'completed' ? OUTCOME.COMPLETED : OUTCOME.FAILED,
      // DEFECT-2: the effect state is ALWAYS explicit on a terminal outcome.
      // COMPLETED throws without it (see outcomes.js); completed-but-
      // unverified records effect_unknown, never clean success.
      { effect_state: EFFECT_STATE.UNKNOWN }
    ),
    // Contract envelope (front-door H5b): the executor result carries an
    // explicit status + summary on every post-dispatch outcome, so the
    // front door's validator accepts it without synthesis. status echoes
    // the worker's VERIFIED verdict (the vendored verifier already proved
    // it is 'completed' | 'failed').
    status: ext.envelope.status,
    summary: ext.envelope.status === 'completed'
      ? `worker completed work order ${workOrder.work_order_id} (result ${verification.result_id})`
      : `worker reported failure for work order ${workOrder.work_order_id}: ${String(ext.envelope.error || 'no error detail').slice(0, 200)}`,
    execution,
    tenant_id,
    work_order_id: workOrder.work_order_id,
    result_id: verification.result_id,
    event_id: record ? record.event_id : null,
    event_type: record ? record.event_type : null,
    recorded: !!record,
    artifactPath,
  }, artifactPath);
}

module.exports = {
  ADAPTER_VERSION,
  DENIED_IDENTITY_IDS,
  TENANT_ID_RE,
  IDEMPOTENCY_INDEX,
  resolveTenantId,
  idempotencyKeyFor,
  reconcileGate,
  dispatchExecution,
  buildWorkerPrompt,
  extractEnvelope,
  dispatchHermes,
  validateExecution,
};
