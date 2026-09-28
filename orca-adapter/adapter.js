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
 * Defect-4 closure (2026-09-27): cross-process mutual exclusion for the
 * idempotency index. The index is append-only JSONL; without a lock, the
 * gate's read-check-append sequence races across processes: two
 * dispatchers can both pass the read/check boundary before either
 * records its reservation, dispatching the same intent twice.
 *
 * The lock is a lockfile created atomically (O_EXCL). A holder that died
 * without releasing is reclaimed via PID liveness (process.kill(pid, 0)),
 * so a crashed dispatcher can never wedge the index forever. The lock is
 * reentrant within one process (held-count per resolved evidenceDir).
 * Acquisition waits up to `timeoutMs` with a fixed 25ms poll; on timeout
 * it throws `idempotency_lock_timeout` (fail closed, never proceed
 * unlocked).
 */
const INDEX_LOCKFILE = 'idempotency-index.lock';
const _indexLockHolders = new Map(); // resolved evidenceDir -> { count }

function lockPathFor(evidenceDir) {
  return path.join(evidenceDir, INDEX_LOCKFILE);
}

function _sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function acquireIndexLock(evidenceDir, timeoutMs = 10000) {
  const dir = path.resolve(evidenceDir);
  const held = _indexLockHolders.get(dir);
  if (held) {
    held.count += 1;
    return; // reentrant: this process already holds it
  }
  fs.mkdirSync(dir, { recursive: true });
  const lockPath = lockPathFor(dir);
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    let fd = null;
    try {
      fd = fs.openSync(lockPath, 'wx', 0o644);
    } catch (e) {
      if (!e || e.code !== 'EEXIST') throw e;
      // Someone holds it (or held it and died, or crashed between
      // create and PID write leaving an empty/corrupt file).
      let raw = null;
      try { raw = fs.readFileSync(lockPath, 'utf8'); } catch (_) { raw = null; }
      const pid = raw === null ? null : (() => {
        const p = parseInt(String(raw).trim(), 10);
        return Number.isInteger(p) && p > 0 ? p : null;
      })();
      let live = false;
      if (pid !== null) {
        try { process.kill(pid, 0); live = true; } catch (_) { live = false; }
      }
      if (!live) {
        // Reclaim only if the file content is UNCHANGED since we read
        // it: avoids deleting a fresh live holder's lock on a TOCTOU.
        try {
          const now = fs.readFileSync(lockPath, 'utf8');
          if (now === raw) fs.unlinkSync(lockPath);
        } catch (_) { /* lost the race; retry */ }
        continue; // stale holder reclaimed (or lost race); retry
      }
      if (Date.now() >= deadline) {
        throw new Error(
          `idempotency_lock_timeout: could not acquire ${INDEX_LOCKFILE} in ${timeoutMs}ms`);
      }
      _sleepMs(Math.min(25, Math.max(0, deadline - Date.now())));
      continue;
    }
    try {
      fs.writeSync(fd, String(process.pid) + '\n');
    } finally {
      try { fs.closeSync(fd); } catch (_) { /* best effort */ }
    }
    _indexLockHolders.set(dir, { count: 1 });
    return;
  }
}

function releaseIndexLock(evidenceDir) {
  const dir = path.resolve(evidenceDir);
  const held = _indexLockHolders.get(dir);
  if (!held) return;
  held.count -= 1;
  if (held.count > 0) return;
  _indexLockHolders.delete(dir);
  try { fs.unlinkSync(lockPathFor(dir)); } catch (_) { /* best effort */ }
}

function withIndexLock(evidenceDir, fn) {
  acquireIndexLock(evidenceDir);
  try {
    return fn();
  } finally {
    releaseIndexLock(evidenceDir);
  }
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

/** Typed refusal: machine-readable, never a blind dispatch, never an overwrite.
 *
 * Defect-2 closure (2026-09-27): every gate refusal explicitly types
 * itself as NOT an authorization refusal (authorization_refusal: false,
 * refusal_source: 'dispatch-gate'). Only the identity-policy fence and
 * the CapabilityAuthority denial carry authorization_refusal: true, so a
 * consumer can never confuse a gate hold with a denied authorization.
 */
function gateRefusal({ reason, idempotency_key, execution, tenant_id, reconciliation }) {
  return {
    outcome: OUTCOME.DENIED,
    reason,
    // Dispatch-gate refusals are not authorization refusals.
    authorization_refusal: false,
    refusal_source: 'dispatch-gate',
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
  // Defect-4: the gate's read-decide-append is atomic under the
  // cross-process index lock. Reentrant: dispatchExecution holds the
  // same lock across gate+reservation, in which case this is a no-op.
  return withIndexLock(evidenceDir, () =>
    reconcileGateLocked({ evidenceDir, execution, input, tenant_id, capability, reconciliation }));
}

/**
 * (b)+(c) The reconcile gate. Runs BEFORE any transport invocation.
 * Returns {allowed:true, idempotency_key, reconciliationAccepted, reconcilesAttempt}
 * or {allowed:false, idempotency_key, refusal}.
 *
 * Must run under withIndexLock (see reconcileGate wrapper): the read,
 * the decision, and the refusal/reservation appends are one atomic unit.
 */
function reconcileGateLocked({ evidenceDir, execution, input, tenant_id, capability, reconciliation }) {
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

/** Append the concluded-attempt line to the idempotency index.
 * Defect-4: under the cross-process index lock so a concurrent reader
 * never observes a torn interleave between the dispatched line and the
 * outcome line. */
function recordAttemptOutcome(evidenceDir, gate, execution, result, artifactPath) {
  withIndexLock(evidenceDir, () => appendIndexLine(evidenceDir, {
    type: 'attempt', phase: 'outcome',
    idempotency_key: gate.idempotency_key,
    executionId: execution.executionId, attempt: execution.attempt,
    outcome: result.outcome || null,
    status: result.status || null,
    reason: result.reason || null,
    effect_state: result.effect_state || null,
    effect_may_have_occurred: result.effect_may_have_occurred === true,
    artifact: artifactPath || null,
  }));
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
    // P0-SECRET-01: the brief gets the string-level redaction so raw secrets
    // never enter the model context, the tmp prompt file, or
    // hermes-prompt.txt on the Pig (which PERSISTS). The whole assembled
    // prompt is deliberately NOT redacted: the echo fields above must
    // survive verbatim, and structural redaction already protects the input.
    redactWorkerText(taskBrief),
    '',
    'Input data (use ONLY this data; do not invent facts):',
    // P0-SECRET-01: the input is STRUCTURALLY redacted BEFORE it enters the
    // prompt. Prevention beats redaction: this prompt is written to a tmp
    // file and scp'd to the Pig's hermes-prompt.txt where it persists
    // unredacted, so output-only redaction is not enough. Capabilities that
    // genuinely need live credentials must take a broker reference (future
    // backlog), never raw input secrets.
    JSON.stringify(redactEnvelope(workOrder.input)),
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
 * Q-P0-05 F1 (Mission N), P0-SECRET-01 hardening (2026-09-28): secret-class
 * redaction for worker-derived strings, envelopes, and the worker PROMPT.
 *
 * SUPPORTED BOUNDARY (exact — not universal secret detection):
 *  REACTS (value replaced by [REDACTED:<CLASS>], structure preserved):
 *   - PEM private-key blocks (whole block -> one marker).
 *   - Credentialed connection strings (userinfo redacted, scheme+host
 *     kept): a DB-scheme rule for the known DB schemes (postgres, mysql,
 *     mariadb, mongodb, redis, amqp -> [REDACTED:DATABASE URL]), then a
 *     GENERAL rule for ANY scheme (https, ftp, ... -> [REDACTED:URL]).
 *     The claim is "credentialed connection-string userinfo redacts",
 *     whatever the scheme. Userinfo is the authority segment before the
 *     first `/` (never crosses `/`, so https://example.com/path?a=b@c is
 *     untouched). A (?!\[REDACTED:) guard after the scheme stops the
 *     general rule double-processing the DB rule's output. FAIL CLOSED:
 *     userinfo redacts with OR without a colon (https://user@host redacts
 *     `user` too) — an @ before the first / always means credentials.
 *   - `Bearer` / `Basic` scheme credentials of ANY length, quoted or bare:
 *     the whole scheme+value is dropped to [REDACTED:AUTHORIZATION] so a
 *     short credential (Bearer abc123) cannot fall through to a key rule.
 *   - Unambiguous secret keys (password, api_key, secret, private_key,
 *     *_token, authorization, cookie, session_token, credentials,
 *     database_url, aws_secret_access_key, ...) followed by a value,
 *     colon/equals/space delimited (a newline is crossed only when the next
 *     line is not a new `key:` pair — round 3, Defect 2, so
 *     `password:\napi_key: <v>` leaves password alone and the next line
 *     redacts under its own key), JSON-quoted, log-escaped-quoted
 *     (\"...\"), bare, or bracketed (`["..."]` consumed whole): the ENTIRE
 *     value subtree is secret-bearing —
 *     every non-null leaf (string, number, boolean, array/object elements)
 *     redacts; object/array shape and keys are preserved; `null` stays
 *     `null` (absence of a value is not a secret).
 *     (aws_access_key_id is NOT a key: it is covered by the AKIA
 *     strong-shape rule; adding it as a key would double-cover the same
 *     value.) The text-level value tokenizer is escape-aware
 *     (`\"password\": \"secret\"` closes on the escaped quotes) and eats a
 *     partial-quote hostile tail (`password: "abc"def"` is consumed whole —
 *     no raw fragment survives either hostile). Quote re-emission keeps
 *     the quote char but normalizes the escape (\"v\" -> "v"); deliberate.
 *   - Bare strong value shapes with no key: JWT, sk-/sk-proj-, ghp_, xox[bpa]-,
 *     AKIA.
 *   - `token` / `session_id`: ONLY secret-shaped values (>=16 chars, token
 *     charset, a letter plus a digit/symbol). Messy values gate on the
 *     UNION of the peeled inner candidate AND the whole raw value
 *     (round 4, Defect 1: the tail is part of the consumed hostile value —
 *     `"short"<secret>`, `'short'<secret>`, `[short]<secret>`, and
 *     `"a" "<secret>"` redact the WHOLE consumed value when a 16+ char
 *     secret-shaped run sits anywhere in the tail, even behind an
 *     innocuous head). Intentional fail-closed shaping: `"gpt-4"junk`
 *     still survives whole (no 16+ secret-shaped run). ACCEPTED
 *     FALSE POSITIVE (fail closed): order-id / version-string shapes
 *     under `token`/`session_id` (e.g. "order-2026-09-28-abcdef") redact
 *     whole — indistinguishable from secrets at this layer.
 *  SURVIVES BY DESIGN (left untouched):
 *   - UUIDs (correlation ids) under `token`/`session_id` (but NOT under
 *     unambiguous keys: `password: <uuid>` redacts by key alone).
 *   - 32/64-char hex digests (MD5/SHA-256 integrity references) under
 *     `token`/`session_id` (again: redacted by key under unambiguous keys).
 *   - Counts (pure numbers, e.g. {token: 1500}), model names (gpt-4), short
 *     reference ids (sess_abc123), bare `session` keys, `null`.
 *   - Values already carrying [REDACTED:...] are never re-processed:
 *     redact(redact(x)) === redact(x).
 *  PREVENTION SEAM (proven boundary): buildWorkerPrompt embeds
 *   redactEnvelope(input) and redactWorkerText(taskBrief). The proven
 *   guarantee is exact: no secret WITHIN THE SUPPORTED BOUNDARY
 *   (secret-key context at any depth, or strong shape anywhere) placed in
 *   workOrder.input or taskBrief appears in the prompt output. It is NOT
 *   "no secret of any kind" — see OUT-OF-SCOPE.
 *  KNOWN FALSE POSITIVES (documented, accepted): prose `reset your password
 *   soon` redacts the word after `password`; prose `bearer of <word>` /
 *   `basic <word>` collapses to [REDACTED:AUTHORIZATION].
 *  OUT-OF-SCOPE (by construction, not by bug): a shapeless secret under an
 *   innocent key ({"notes": ["<random-string>"]}) is indistinguishable from
 *   a legitimate business string — no redactor can detect it without a
 *   secret-key context or a strong shape, and any weaker gate would mass-
 *   false-positive on business data (Mission C reference discipline). The
 *   architectural mitigation is SECRET REFERENCE -> BROKER: capabilities
 *   that genuinely need live credentials take a broker reference, never raw
 *   input secrets (future backlog — NOT built here).
 *   - Double-escaped \\\"password\\\": \\\"<v>\\\" (literal
 *     backslash-backslash-quote in the text): the value tokenizer's quote
 *     alternatives anchor on single backslashes, so a doubled backslash
 *     before the quote is outside the claimed boundary (task-anticipated).
 *     Strong-shaped values in such text are still caught by the shape
 *     rules.
 *   - `the PASSWORD is <v>` prose: eats `is` per the documented prose FP;
 *     the shapeless secret then survives (no key context) — out of scope
 *     by construction.
 *   - `:\n=` (newline INSIDE a key delimiter run, e.g. `password:\n= <v>`):
 *     remains out of scope — nobody writes it and the delimiter-run guard
 *     stays simple (round 4, Defect 2).
 *
 * The redactor replaces secret-class VALUES with a typed marker
 * ([REDACTED:<CLASS>]) and preserves structure: keys, delimiters, JSON
 * shape, and every non-secret value pass through untouched.
 */
function looksSecretValue(v) {
  if (typeof v !== 'string' || v.length < 16) return false;
  if (!/^[A-Za-z0-9_\-+/=.~]+$/.test(v)) return false; // token charset, no spaces
  if (/^\d+$/.test(v)) return false;                    // pure numbers (counts)
  if (!/[A-Za-z]/.test(v)) return false;                // needs a letter
  if (!/[\d_\-+/=.~]/.test(v)) return false;            // needs a digit or symbol
  // UUID-shaped values are correlation ids, not secrets: a UUID under a
  // `token` or `session_id` key must survive (the doc's "digests survive"
  // promise), while unambiguous keys (password, api_key, ...) still redact
  // a UUID by key alone.
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v)) return false;
  // Hex digests (MD5 32-char / SHA-256 64-char) are integrity references,
  // not bearer material: the module doc promises digests survive, so they
  // pass through the `token`/`session_id` shape gate. Only applies here;
  // unambiguous keys (password, api_key, ...) still redact a digest by key
  // alone (see redactEnvelopeValue / rule 3).
  if (/^[0-9a-fA-F]{32}$/.test(v) || /^[0-9a-fA-F]{64}$/.test(v)) return false;
  return true;
}

/**
 * Round 3, Defect 1: peel the INNER candidate (quoted and de-escaped;
 * bracketed; else the whole value). Round 4, Defect 1: the actual gate is
 * secretValueHit(raw) — the UNION of secretShapedAnywhere on the peeled
 * candidate AND on the whole raw value, so a secret riding in the consumed
 * tail behind an innocuous head ("short"<secret>) still fails closed.
 * The helper below implements the peel; the gate sits in secretValueHit.
 */
function secretCandidate(val) {
  let m = /^\\?(["'])((?:[^"\\]|\\.)*)\\?\1/.exec(val);
  if (m) return m[2].replace(/\\(.)/g, '$1');
  m = /^\[([^\]]*)\]/.exec(val);
  if (m) return m[1];
  return val;
}
function secretShapedAnywhere(s) {
  if (looksSecretValue(s)) return true;
  const runs = s.match(/[A-Za-z0-9_\-+/=.~]{16,}/g) || [];
  return runs.some(looksSecretValue);
}

/**
 * Round 4, Defect 1: the round-3 gate only peeled the INNER candidate, so a
 * secret riding in the consumed TAIL after an innocuous head failed OPEN:
 * `token: "short"<20ch-secret>`, `token: 'short'<20ch-secret>`,
 * `token: [short]<20ch-secret>`, `token: "a" "<20ch-secret>"` all survived
 * byte-identical. The tail is part of the consumed hostile value, so a 16+
 * secret-shaped run ANYWHERE in it is fail-closed shaping: gate the UNION
 * of (peeled inner candidate) and (whole raw value). One helper, used by
 * BOTH the text-path rules 4/4b and the envelope gated branch (round 4,
 * Defect 3), so text and envelope agree on every input.
 */
function secretValueHit(raw) {
  return secretShapedAnywhere(secretCandidate(raw)) || secretShapedAnywhere(raw);
}

// [CLASS, key words] — keys that are unambiguous: any value they carry is
// treated as the secret, whatever its shape. `token` alone stays OUT of this
// table: it is shape-gated (see looksSecretValue) so token counts, model
// names, and digests survive.
const SECRET_KEY_CLASSES = [
  ['PASSWORD', ['password', 'passwd', 'pwd', 'db_password', 'dbpassword']],
  ['API KEY', ['api_key', 'apikey', 'x-api-key', 'api-secret', 'apisecret']],
  ['SECRET', ['secret', 'secret_key', 'client_secret', 'aws_secret_access_key']],
  ['PRIVATE KEY', ['private_key', 'privatekey']],
  ['TOKEN', ['access_token', 'auth_token', 'api_token', 'bearer_token', 'refresh_token']],
  ['AUTHORIZATION', ['authorization']],
  ['COOKIE', ['cookie', 'set-cookie', 'set_cookie']],
  ['SESSION', ['session_token', 'sessiontoken']],
  ['CREDENTIAL', ['credential', 'credentials']],
  ['DATABASE URL', ['database_url', 'db_url', 'connection_string', 'dsn']],
];

const SECRET_KEY_CLASS_MAP = new Map();
for (const [cls, keys] of SECRET_KEY_CLASSES) {
  for (const k of keys) SECRET_KEY_CLASS_MAP.set(k.toLowerCase(), cls);
}
function classForKey(key) {
  return (typeof key === 'string' && SECRET_KEY_CLASS_MAP.get(key.toLowerCase())) || null;
}

/**
 * Shared secret-value tokenizer (P0-SECRET-01 round 2, LEAK 2): ONE value
 * alternative used by rule 3 (unambiguous keys), rule 4 (`token`) and rule
 * 4b (`session_id`). Order matters:
 *  1. double-quoted, escape-aware, with messy-tail consumption:
 *     `\\?"(?:[^"\\]|\\.)*\\?"` then `[^\s,;}\]]*` eats a partial-quote
 *     hostile tail — `\"abc\"` (log-escaped JSON) closes on the escaped
 *     quotes, and `"abc"def"` is consumed whole. No raw fragment survives
 *     either hostile.
 *  2. single-quoted equivalent.
 *  3. bracketed `[...]` (consumed whole).
 *  4. bare `[^\s,;}{"\]]+`.
 * Quote re-emission: each replacement detects an optional-backslash +
 * quote prefix (/^\\?(["'])/) and re-emits that quote char around the
 * marker; the escape itself is normalized away (\"v\" -> "v") — deliberate
 * and documented.
 */
/**
 * Shared delimiter for the secret-key rules 3, 4, 4b (P0-SECRET-01 round 3,
 * Defect 2): `key [: = or whitespace] value`. A newline is consumable ONLY
 * when the next line does NOT begin a new `key:` pair, so
 * `password:\napi_key: <secret>` does not eat the next line's key as
 * password's value: the next line's secret redacts independently under its
 * own key. First alternative: colon/equals with optional spaces/tabs, or a
 * newline continuation when it is not a new kv pair. Second alternative:
 * bare whitespace (spaces, tabs, or a non-kv newline continuation).
 *
 * Round 4, Defect 2: the single `[:=]` is a delimiter RUN
 * `[:=](?:[ \t]*[:=])*` — additional `[:=]` chars may follow separated by
 * horizontal spaces only, so `password:=<v>`, `password:= <v>`,
 * `password: = <v>`, `password = = <v>` all consume the full run and redact
 * the value whole. A newline INSIDE the delimiter run (`:\n=`) remains out
 * of scope: nobody writes it and the guard stays simple.
 *
 * CRLF (round 4, boundary gap): the consumable newline class is
 * `(?:\r\n|\n)` everywhere, so `password:\r\n<secret>` continuation
 * redacts while `password:\r\napi_key: <v>` leaves `password:` untouched
 * (the kv-lookahead still blocks) and `api_key:` redacts independently.
 */
const SECRET_DELIM =
  '(?:[ \\t]|(?:\\r\\n|\\n)(?![A-Za-z][A-Za-z0-9_.-]*[ \\t]*:))*[:=](?:[ \\t]*[:=])*(?:[ \\t]|(?:\\r\\n|\\n)(?![A-Za-z][A-Za-z0-9_.-]*[ \\t]*:))*' +
  '|(?:[ \\t]+|(?:\\r\\n|\\n)(?![A-Za-z][A-Za-z0-9_.-]*[ \\t]*:)[ \\t]*)';

/**
 * Round 4, Defect 1 (tokenizer half): the tail consumer must also cover
 * bracketed values (`[short]<secret>` — the bracket alternative had no
 * tail eater, so the secret after `]` was never even consumed) and
 * space-separated chained quoted segments (`"a" "<secret>"` — the old
 * tail stopped at the space, leaving the secret outside the match). The
 * chained continuation only crosses spaces into ANOTHER quoted segment,
 * so prose after a quoted value (`token: "gpt-4" and more words`) still
 * terminates the value and the survive controls hold.
 */
const SECRET_VALUE_TAIL =
  '(?:[ \\t]*"(?:[^"\\\\]|\\\\.)*"|[ \\t]*\'(?:[^\'\\\\]|\\\\.)*\'|[^\\s,;}\\]])*';

const SECRET_VALUE_ALT =
  '\\\\?"(?:[^"\\\\]|\\\\.)*\\\\?"' + SECRET_VALUE_TAIL +
  "|\\\\?'(?:[^'\\\\]|\\\\.)*\\\\?'" + SECRET_VALUE_TAIL +
  '|\\[[^\\]]*\\]' + SECRET_VALUE_TAIL +
  '|[^\\s,;}{"\\]]+';

/**
 * Idempotence guard (round 4, Defect 2): values already carrying a marker
 * are never re-processed. It sits AFTER the delimiter, so it must also
 * block the backtrack splits where the delimiter shrinks (`:=` -> `:`,
 * ` =` -> ` `) and orphaned delimiter chars/spaces would become the
 * "value": the skip class `(?:[ \t]|[:=]|\r\n|\n)*` looks THROUGH any mix
 * of spaces, delimiter chars, and newlines for the already-redacted
 * marker, so a second pass over `password:=[REDACTED:PASSWORD]`,
 * `password = = [REDACTED:PASSWORD]`, or `password:=\r\n[REDACTED:PASSWORD]`
 * finds no match at any parse. A first-pass input with a marker already
 * present is already-redacted input: leaving it alone IS idempotence.
 */
const SECRET_NOT_REDACTED_YET = '(?!(?:[ \\t]|[:=]|\\r\\n|\\n)*\\[REDACTED:)';

function redactWorkerText(text) {
  if (typeof text !== 'string' || text.length === 0) return text;
  let out = text;
  // 1. PEM private-key blocks (whole block -> one marker).
  out = out.replace(
    /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g,
    '[REDACTED:PRIVATE KEY]');
  // 2. Credentialed connection strings: keep scheme + host, redact userinfo.
  out = out.replace(
    /\b((?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis(?:s)?|amqp):\/\/)[^@\s"'<>,;}\]]*@/gi,
    '$1[REDACTED:DATABASE URL]@');
  // 2a. General credentialed-URL rule (P0-SECRET-01 round 2, LEAK 1): the
  // DB rule above is scheme-allowlisted (postgres/mysql/...); ANY other
  // scheme with userinfo (https://user:pw@host/, ftp://user:pw@host/)
  // survived it, so the "credentialed connection-string userinfo redacts"
  // claim was broader than the code. This rule covers every scheme:
  // userinfo is the authority segment before the first `/` (the class can
  // never cross `/`, so https://example.com/path?a=b@c is safe). The
  // (?!\[REDACTED:) guard after the scheme stops double-processing the DB
  // rule's output. FAIL CLOSED: userinfo redacts with or without a colon
  // (https://user@host redacts `user` too).
  out = out.replace(
    /\b([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)(?!\[REDACTED:)([^\/\s"'<>?#]+)@/gi,
    '$1[REDACTED:URL]@');
  // 2b. Authorization schemes: `Bearer <token>` / `Basic <cred>` — 1+ chars
  // INCLUDING quoted values ("…", '…'), so short creds (Bearer abc123,
  // Basic dXNl) cannot fall through to rule 3, which would match only the
  // scheme word and leave the credential behind. The value class includes
  // `:` (round 3, Defect 3) so colon credentials (`Basic user:pass`) are
  // consumed whole instead of leaking the password fragment. The whole
  // scheme+value is dropped to [REDACTED:AUTHORIZATION]; nothing of the
  // credential survives. The idempotence guard keeps an already-redacted
  // marker intact.
  out = out.replace(
    /\b(Bearer|Basic)\s+(?!\[REDACTED:)("[^"]*"|'[^']*'|[A-Za-z0-9_\-~+/=.:]+)/gi,
    '[REDACTED:AUTHORIZATION]');
  // 3. Unambiguous secret keys: key [: = or bare whitespace] value ->
  //    key delim [REDACTED:CLASS]. Bare whitespace is accepted (same as rule
  //    4) so space-delimited `password <value>` / `session_token <value>` in
  //    error strings redact. The delimiter is the shared SECRET_DELIM
  //    (round 3, Defect 2): a newline is crossed only when the next line is
  //    not a new `key:` pair, so `password:\napi_key: <v>` leaves password
  //    alone and the next line's secret redacts under its own key.
  //    Keys may be JSON-quoted ("api_key": "...");
  //    quotes and the delimiter are preserved; pre-redacted values are
  //    skipped via the lookahead (idempotence). Bracketed values
  //    (`password: ["hunter2"]`, `api_key: ['k1','k2']`) are consumed whole
  //    (P0-SECRET-01 CLASS B, text level): the bare alternative would stop
  //    at the opening quote and leave the element behind. The value is the
  //    shared SECRET_VALUE_ALT tokenizer (round 2, LEAK 2): log-escaped
  //    (\"...\") and partial-quote (\"abc\"def\") hostiles are consumed
  //    whole; the quote char is re-emitted around the marker with the
  //    escape normalized away. The key's own quote groups are escape-aware
  //    too ((\\?['"]?)): in log-escaped JSON the key arrives as
  //    \"password\", so a bare (['"]?) would stop at the backslash and the
  //    whole rule would miss. The \b guards still reject word-internal
  //    hits (C:\passwords\... has no boundary after `password`).
  for (const [cls, keys] of SECRET_KEY_CLASSES) {
    const re = new RegExp(
      '(\\\\?[\'"]?)\\b(' + keys.join('|') + ')\\b(\\\\?[\'"]?)(' + SECRET_DELIM + ')' + SECRET_NOT_REDACTED_YET + '(' + SECRET_VALUE_ALT + ')',
      'gi');
    out = out.replace(re, (m, q1, key, q2, delim, val) => {
      const vqm = /^\\?(["'])/.exec(val);
      const vq = vqm ? vqm[1] : '';
      return q1 + key + q2 + delim + vq + '[REDACTED:' + cls + ']' + vq;
    });
  }
  // 4. Ambiguous `token`: redact only secret-shaped values (JSON-quoted keys
  //    included). Shares SECRET_VALUE_ALT (round 2, LEAK 2) and SECRET_DELIM
  //    (round 3, Defect 2). Round 3, Defect 1: messy values gate on the
  //    INNER candidate (secretCandidate: quoted/de-escaped, bracketed, or
  //    whole), fail-closed via secretShapedAnywhere — `token: "abc"junk`,
  //    `token: 'abc'junk`, `token: [abc]` and `"abc-with-,}-inside"` redact
  //    the whole consumed value when the inner payload is secret-shaped or
  //    contains a 16+ secret-shaped run; `token: "gpt-4"junk` still
  //    survives whole (no such run).
  out = out.replace(
    new RegExp("(\\\\?['\"]?)\\b(token)\\b(\\\\?['\"]?)(" + SECRET_DELIM + ")" + SECRET_NOT_REDACTED_YET + "(" + SECRET_VALUE_ALT + ')', 'gi'),
    (m, q1, key, q2, delim, val) => {
      if (!secretValueHit(val)) return m;
      const vqm = /^\\?(["'])/.exec(val);
      const vq = vqm ? vqm[1] : '';
      return q1 + key + q2 + delim + vq + '[REDACTED:TOKEN]' + vq;
    });
  // 4b. `session_id`: shape-gated (NOT blanket-exempt, NOT unambiguous):
  //    a session id is bearer-equivalent in cookie/session systems, so it
  //    redacts exactly when the value looks secret-class (high entropy,
  //    >=16 chars, token charset); short/low-entropy reference ids like
  //    sess_abc123 survive for correlation. UUID-shaped values survive
  //    (see looksSecretValue). Shares SECRET_VALUE_ALT (round 2, LEAK 2)
  //    and SECRET_DELIM (round 3, Defect 2); messy values gate on the
  //    INNER candidate, fail-closed (round 3, Defect 1) — same shaping as
  //    rule 4, marker [REDACTED:SESSION].
  out = out.replace(
    new RegExp("(\\\\?['\"]?)\\b(session_id)\\b(\\\\?['\"]?)(" + SECRET_DELIM + ")" + SECRET_NOT_REDACTED_YET + "(" + SECRET_VALUE_ALT + ')', 'gi'),
    (m, q1, key, q2, delim, val) => {
      if (!secretValueHit(val)) return m;
      const vqm = /^\\?(["'])/.exec(val);
      const vq = vqm ? vqm[1] : '';
      return q1 + key + q2 + delim + vq + '[REDACTED:SESSION]' + vq;
    });
  // 5. Bare strong value shapes (no key needed): JWT, known token prefixes.
  out = out.replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED:TOKEN]');
  // sk- charset includes `-`: real OpenAI project keys are sk-proj-...,
  // and hyphens pass through this charset in the wild. Case-insensitive
  // (Mission N3 FIX-1): falsifier evidence shows Sk-/SK- variants leaking;
  // the neighboring Bearer/Basic rule already uses /gi.
  out = out.replace(/\bsk-[A-Za-z0-9-]{20,}/gi, '[REDACTED:TOKEN]');
  // ghp_ (GitHub classic PAT), xox[bpa]- (Slack), AKIA (AWS) stay
  // case-SENSITIVE on purpose: those prefixes are fixed-case by spec
  // (GitHub/Slack prefixes always lowercase; AKIA always uppercase), so
  // case-folding would only add false positives. JWT `eyJ` above stays
  // case-sensitive for the same reason: the base64url "eyJ" prefix is a
  // constant in the JWT spec.
  out = out.replace(/\bghp_[A-Za-z0-9]{20,}/g, '[REDACTED:TOKEN]');
  out = out.replace(/\bxox[bpa]-[A-Za-z0-9-]{10,}/g, '[REDACTED:TOKEN]');
  out = out.replace(/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED:CREDENTIAL]');
  return out;
}

/** Deep redaction of a parsed envelope: keys and shape preserved, every
 * string value passed through redactWorkerText.
 *
 * Key context is INHERITED through recursion (P0-SECRET-01 fix), so a
 * secret never survives by hiding in a nested array/object/non-string leaf:
 *  - An unambiguous secret-class key (classForKey hit, e.g. `password`,
 *    `api_key`, `credentials`): the ENTIRE subtree is secret-bearing. Every
 *    non-null leaf (string, number, boolean) becomes [REDACTED:<CLASS>];
 *    `null` stays `null` (absence of a value is not a secret); object/array
 *    shape and every key are preserved.
 *  - `token` / `session_id` keys: SHAPE-GATED context. String leaves redact
 *    only when secretValueHit(leaf) (the round-4 unified gate, same as the
 *    text path — secret-shaped anywhere in the leaf, tail included);
 *    a UUID, a 32/64-char hex digest, or a short/low-entropy reference id
 *    under them survives, e.g. {token: 1500}, {token: "gpt-4"},
 *    {session_id: "sess_abc123"}); numbers, booleans and null pass through
 *    untouched.
 *  - Values already carrying a [REDACTED:...] marker are never re-processed
 *    (idempotent: redact(redact(x)) === redact(x)).
 */
function redactEnvelopeValue(key, val, ctx) {
  // ctx: null | { mode: 'full', cls } | { mode: 'gated', cls }. A key that
  // opens a secret context keeps it for its whole subtree (full wins over
  // gated for nested keys: {"password": {"token": 1500}} is all PASSWORD).
  if (!ctx && typeof key === 'string') {
    const cls = classForKey(key);
    if (cls) ctx = { mode: 'full', cls };
    else if (key.toLowerCase() === 'token' || key.toLowerCase() === 'session_id') {
      ctx = { mode: 'gated', cls: key.toLowerCase() === 'session_id' ? 'SESSION' : 'TOKEN' };
    }
  }
  if (typeof val === 'string' && val.length > 0 && val.startsWith('[REDACTED:')) return val;
  if (!ctx) return redactEnvelope(val);
  if (val === null) return null; // absence of a value is not a secret
  if (typeof val === 'string') {
    if (ctx.mode === 'full') return '[REDACTED:' + ctx.cls + ']';
    // Round 4, Defect 3: the unified gate — secretValueHit(String(leaf)),
    // the same helper the text-path rules 4/4b use, so text and envelope
    // agree on every input ({"token": "<20ch-secret>\"junk"} and
    // {"token": "<20ch-secret> extra junk"} redact here too). Plain
    // looksSecretValue(leaf) diverged from the text path on messy values.
    return secretValueHit(String(val)) ? '[REDACTED:' + ctx.cls + ']' : redactWorkerText(val);
  }
  if (typeof val === 'number' || typeof val === 'boolean') {
    return ctx.mode === 'full' ? '[REDACTED:' + ctx.cls + ']' : val;
  }
  if (Array.isArray(val)) return val.map((el) => redactEnvelopeValue(key, el, ctx));
  if (typeof val === 'object') {
    const out = {};
    for (const k of Object.keys(val)) out[k] = redactEnvelopeValue(k, val[k], ctx);
    return out;
  }
  return val;
}
function redactEnvelope(obj) {
  if (typeof obj === 'string') return redactWorkerText(obj);
  if (Array.isArray(obj)) return obj.map((el) => redactEnvelopeValue(undefined, el, null));
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const k of Object.keys(obj)) out[k] = redactEnvelopeValue(k, obj[k], null);
    return out;
  }
  return obj;
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
  // Defect-2 closure (2026-09-27): an identity-policy denial is an
  // AUTHORIZATION refusal, typed explicitly so it can never be confused
  // with a dispatch-gate refusal (duplicate_attempt,
  // reconciliation_required) or an execution failure. The mapping is
  // additive: outcome 'denied' and effect_state are unchanged.
  if (DENIED_IDENTITY_IDS.has(agentId)) {
    return {
      outcome: OUTCOME.DENIED,
      reason: 'identity_5..10 are DENIED (Nolan 2026-09-25). Use identities 1-4 only.',
      execution,
      agentId,
      authorization_refusal: true,
      refusal_source: 'identity-policy',
      // Nothing was invoked: no external effect is possible.
      effect_state: EFFECT_STATE.NONE,
    };
  }

  // 2. AUTHORIZE (fail-closed; vendored proven adapter).
  // Defect-2 closure (2026-09-27): a CapabilityAuthority denial is an
  // AUTHORIZATION refusal, typed explicitly (refusal_source +
  // authority_reason). Additive: outcome 'denied' is unchanged.
  const auth = vendor.authorizeWorkOrder({ agentId, capability, namespace, constraints });
  if (!auth.granted) {
    return {
      outcome: OUTCOME.DENIED,
      reason: auth.reason || 'authorization denied',
      execution,
      agentId,
      authorization_refusal: true,
      refusal_source: 'capability-authority',
      authority_reason: auth.reason || 'authorization denied',
      effect_state: EFFECT_STATE.NONE,
    };
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
  // Defect-4 closure (2026-09-27): the gate read, the artifact-exists
  // check, work-order issuance, and the reconciliation/dispatched
  // appends form ONE atomic reservation under the cross-process index
  // lock. Two dispatchers can no longer both pass the read/check
  // boundary before either records its reservation. The lock is
  // released BEFORE the transport is invoked: a running worker never
  // blocks unrelated keys, and a death mid-transport still leaves the
  // honest dispatched-without-outcome record (read as uncertain, fail
  // closed). reconcileGate's own withIndexLock call is reentrant here.
  const reserved = withIndexLock(evidenceDir, () => {
    const g = reconcileGate({ evidenceDir, execution, input, tenant_id, capability, reconciliation });
    if (!g.allowed) return { refusal: g.refusal };
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
      const refusal = gateRefusal({ reason: 'artifact_exists', idempotency_key: g.idempotency_key, execution, tenant_id, reconciliation: reconciliationInfo });
      appendRefusal(evidenceDir, { idempotency_key: g.idempotency_key, execution, reason: 'artifact_exists', reconciliation: reconciliationInfo });
      return { refusal };
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
    if (g.reconciliationAccepted) {
      appendIndexLine(evidenceDir, {
        type: 'reconciliation',
        idempotency_key: g.idempotency_key,
        reconciles_attempt: g.reconcilesAttempt,
        authorizes_attempt: execution.attempt,
        checked: reconciliation.checked,
        found: reconciliation.found,
        decidedBy: reconciliation.decidedBy,
        decided_at: reconciliation.decidedAt || isoNow(),
      });
    }
    appendIndexLine(evidenceDir, {
      type: 'attempt', phase: 'dispatched',
      idempotency_key: g.idempotency_key,
      executionId: execution.executionId, attempt: execution.attempt,
      work_order_id: workOrder.work_order_id,
      capability, tenant_id,
    });
    return { gate: g, workOrder, prompt, invokeTransport };
  });
  if (reserved.refusal) return reserved.refusal;
  const { gate, workOrder, prompt, invokeTransport } = reserved;

  // 4. DISPATCH to the real headless agent. The index lock is released:
  // the reservation is recorded, so a concurrent dispatcher for the same
  // key now sees dispatched-without-outcome (uncertain, fail closed).
  const disp = invokeTransport(prompt, timeoutMs);

  // Q-P0-05 F1 (Mission N): redact secret-class values at the worker-output
  // boundary. The ORIGINAL stdout still feeds extractEnvelope below (verbatim
  // balanced-brace scan + JSON parse); every artifact save and the canonical
  // emission use these redacted copies, so no persist/emit path can bypass
  // the redaction function. Verification (exact-echo contract) runs on the
  // original envelope; the recorded/emitted envelope is the redacted copy.
  const redactedStderr = redactWorkerText(disp.stderr);
  const redactedStdoutTail = redactWorkerText(disp.stdout || '').slice(-2000);

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
    stderr: redactedStderr,
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
      stdoutTail: redactedStdoutTail,
    });
    return recordAttemptOutcome(evidenceDir, gate, execution,
      unknownReturn('dispatcher_timeout', {
        summary: 'dispatcher timed out; the worker may still be running; outcome unknown',
        execution, tenant_id, artifactPath, work_order_id: workOrder.work_order_id,
      }), artifactPath);
  }

  // 6. EXTRACT the result envelope from worker stdout.
  const ext = extractEnvelope(disp.stdout);
  // Q-P0-05 F1: the redacted envelope copy. Verification (step 7) runs on
  // the ORIGINAL envelope (exact-echo contract); every artifact save and
  // the canonical emission below use this copy.
  const safeEnvelope = ext.ok ? redactEnvelope(ext.envelope) : null;
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
      stdoutTail: redactedStdoutTail,
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
    // Q-P0-05 F1: the worker's summary is worker-derived; the artifact and
    // the returned outcome carry the redacted copy.
    const wSummary = typeof safeEnvelope.summary === 'string' && safeEnvelope.summary.trim()
      ? safeEnvelope.summary.trim().slice(0, 500)
      : 'worker reported unknown outcome without a summary';
    const wEffectMay = ext.envelope.effect_may_have_occurred !== false; // conservative default
    const artifactPath = saveArtifact(evidenceDir, artifactName, {
      ...artifactBase,
      outcome: OUTCOME.UNKNOWN,
      reason: 'worker_reported_unknown',
      ...unknownSignal(`worker reported unknown: ${wSummary}`, wEffectMay),
      envelope: safeEnvelope,
      note: 'The worker used the explicit unknown channel (effect performed, outcome unconfirmed). Reconcile-vs-retry is the caller\'s decision.',
      stdoutTail: redactedStdoutTail,
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
      envelope: safeEnvelope,
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
    record = await vendor.recordVerifiedResult({ eventRuntime, result: safeEnvelope, workOrder, invokedAgentId: agentId, verifiedAt, effectState: EFFECT_STATE.UNKNOWN });
    if (!record.valid) {
      // Emission rejected: the row stays unrecorded; the caller retries on
      // the normal path. This is the Lane-J-proven fail-closed behavior.
      const artifactPath = saveArtifact(evidenceDir, artifactName, {
        ...artifactBase,
        outcome: OUTCOME.UNKNOWN,
        reason: 'canonical_emission_rejected',
        ...unknownSignal('worker reported a verified outcome but the event plane rejected the record; no terminal event exists', true),
        verification,
        envelope: safeEnvelope,
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
    envelope: safeEnvelope,
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
      : `worker reported failure for work order ${workOrder.work_order_id}: ${String(safeEnvelope.error || 'no error detail').slice(0, 200)}`,
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
  INDEX_LOCKFILE,
  resolveTenantId,
  idempotencyKeyFor,
  reconcileGate,
  withIndexLock,
  acquireIndexLock,
  releaseIndexLock,
  dispatchExecution,
  buildWorkerPrompt,
  extractEnvelope,
  redactWorkerText,
  redactEnvelope,
  dispatchHermes,
  validateExecution,
};
