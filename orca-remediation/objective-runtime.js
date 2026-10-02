/**
 * objective-runtime.js
 *
 * PING-side runtime module for ORCA objective identity and durable run state.
 *
 * Conventions (kept internal to this module):
 *
 *   objective_id = logical intent only (never PID, wall clock, run ID,
 *   attempt number, or worker identity).
 *
 *   work_order_id = stable per (objective_id, task_key)
 *
 *   attempt_id = per (work_order_id, attempt_number)
 *
 * The module owns a per-objective directory inside PING_DATA_ROOT so all
 * ORCA durable state lives under the PING data root rather than in a
 * separate canonical store. Each write is atomic: temp file plus rename.
 *
 * PING-side only: no new event store, no new mission authority, no
 * canonical events are emitted here.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Deterministic canonical JSON serialization: stable key order, explicit
 * types, no whitespace ambiguity. Used for all objective/task hashing.
 * @param {*} value - value to serialize
 * @returns {string} canonical JSON string
 */
function stableStringify(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('stableStringify: non-finite number');
    return String(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
  }
  throw new Error('stableStringify: unsupported type ' + typeof value);
}

/**
 * Derive the objective identity from logical intent alone.
 * @param {Object} opts
 * @param {string} opts.namespace - logical namespace, e.g. "orca"
 * @param {string} opts.objectiveText - free-text statement of intent
 * @param {Object} [opts.constraints] - budget limits, safety constraints
 * @returns {string} hex objective_id
 */
function deriveObjectiveId({ namespace, objectiveText, constraints = {} }) {
  if (!namespace || typeof namespace !== 'string') throw new Error('deriveObjectiveId: namespace required');
  if (!objectiveText || typeof objectiveText !== 'string') throw new Error('deriveObjectiveId: objectiveText required');
  const canonical = stableStringify({ namespace, objective_text: objectiveText, constraints });
  return crypto.createHash('sha256').update('objective:' + canonical, 'utf8').digest('hex');
}

/**
 * Stable work-order identity per (objective_id, task_key).
 * @param {string} objectiveId
 * @param {string} taskKey - stable task key, e.g. "objective-1"
 * @returns {string} hex work_order_id
 */
function deriveWorkOrderId(objectiveId, taskKey) {
  if (!objectiveId) throw new Error('deriveWorkOrderId: objectiveId required');
  if (!taskKey || typeof taskKey !== 'string') throw new Error('deriveWorkOrderId: taskKey required');
  return crypto.createHash('sha256')
    .update('work-order:' + objectiveId + ':' + taskKey, 'utf8')
    .digest('hex');
}

/**
 * Attempt identity per (work_order_id, attempt_number).
 * @param {string} workOrderId
 * @param {number} attemptNumber - 1-based
 * @returns {string} attempt_id
 */
function deriveAttemptId(workOrderId, attemptNumber) {
  if (!workOrderId) throw new Error('deriveAttemptId: workOrderId required');
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1) throw new Error('deriveAttemptId: attemptNumber must be a positive integer');
  return workOrderId + '-attempt-' + attemptNumber;
}

/**
 * Base directory for all objective durable state under the PING data root.
 * @param {string} dataRoot - PING_DATA_ROOT
 * @returns {string}
 */
function objectivesBaseDir(dataRoot) {
  return path.join(dataRoot, 'objectives');
}

/**
 * Per-objective directory. The objective_id is filesystem-safe hex.
 * @param {string} dataRoot
 * @param {string} objectiveId
 * @returns {string}
 */
function objectiveDir(dataRoot, objectiveId) {
  return path.join(objectivesBaseDir(dataRoot), objectiveId);
}

/**
 * Write a file atomically (temp file plus rename). Throws on failure;
 * callers treat this as non-durable and must not claim persistence.
 * @param {string} filePath
 * @param {string} content
 */
function atomicWrite(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp-' + process.pid + '-' + Date.now();
  try {
    fs.writeFileSync(tmp, content, 'utf8');
    fs.renameSync(tmp, filePath);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
    throw err;
  }
}

/**
 * Read and parse a JSON file. Returns null when missing.
 * @param {string} filePath
 * @returns {Object|null}
 */
function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    if (err && err.code === 'ENOENT') return null;
    throw err;
  }
}

/**
 * Derive the PostgreSQL advisory-lock key for an objective: two signed
 * 32-bit integers from SHA-256('orca-coordinator-v1:' + objectiveId).
 * Stable across processes and machines; 64 bits of key space.
 * @param {string} objectiveId
 * @returns {{ k1: number, k2: number }}
 */
function coordinatorLockKey(objectiveId) {
  const digest = crypto.createHash('sha256').update('orca-coordinator-v1:' + objectiveId, 'utf8').digest();
  return { k1: digest.readInt32BE(0), k2: digest.readInt32BE(4) };
}

/**
 * Path of the diagnostic coordinator-claim record. This file is NOT the
 * authority; the PostgreSQL advisory lock is. It exists so an operator can
 * see which process holds the claim and on which backend session.
 * @param {string} dataRoot
 * @param {string} objectiveId
 * @returns {string}
 */
function coordinatorClaimPath(dataRoot, objectiveId) {
  return path.join(objectiveDir(dataRoot, objectiveId), 'coordinator-claim.json');
}

/**
 * Acquire the single-coordinator claim for an objective as a PostgreSQL
 * session-level advisory lock.
 *
 * The lock MUST be taken on a dedicated pg.Client that stays connected for
 * the whole coordinator run (never a pool: session locks live and die with
 * the one connection that took them, so pool.query could acquire on one
 * connection and attempt release on another; the gateway/advisory_lock.js
 * AdvisoryLock class has exactly that unsoundness and is not used here).
 *
 * Crash safety comes from the database, not PID probing: if this process
 * dies (including SIGKILL), its session drops and PostgreSQL releases the
 * lock automatically, so a restarted coordinator acquires cleanly with no
 * stale-holder guessing across WSL/Windows PID namespaces.
 *
 * @param {Object} pgClient - connected, dedicated pg.Client (duck-typed: .query)
 * @param {string} dataRoot
 * @param {string} objectiveId
 * @returns {Promise<{ acquired: boolean, pgBackendPid?: number }>}
 */
async function acquireCoordinatorLock(pgClient, dataRoot, objectiveId) {
  const { k1, k2 } = coordinatorLockKey(objectiveId);
  const res = await pgClient.query(
    'SELECT pg_try_advisory_lock($1::int, $2::int) AS acquired',
    [k1, k2]
  );
  if (!res.rows[0].acquired) return { acquired: false };
  let pgBackendPid = null;
  try {
    pgBackendPid = (await pgClient.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  } catch (_) { /* diagnostic only */ }
  try {
    atomicWrite(coordinatorClaimPath(dataRoot, objectiveId), JSON.stringify({
      note: 'DIAGNOSTIC ONLY: authority is the PostgreSQL advisory lock, not this file',
      pid: process.pid,
      pg_backend_pid: pgBackendPid,
      claimed_at: new Date().toISOString(),
    }, null, 2) + '\n');
  } catch (_) { /* diagnostic only */ }
  return { acquired: true, pgBackendPid };
}

/**
 * Release the coordinator advisory lock on the SAME dedicated client that
 * acquired it, then remove our diagnostic record. Best-effort: even if this
 * never runs, the server releases the lock when the session drops.
 * @param {Object} pgClient - the dedicated client used by acquireCoordinatorLock
 * @param {string} dataRoot
 * @param {string} objectiveId
 */
async function releaseCoordinatorLock(pgClient, dataRoot, objectiveId) {
  const { k1, k2 } = coordinatorLockKey(objectiveId);
  try {
    await pgClient.query('SELECT pg_advisory_unlock($1::int, $2::int) AS released', [k1, k2]);
  } catch (_) { /* best effort */ }
  try {
    const claimPath = coordinatorClaimPath(dataRoot, objectiveId);
    const existing = readJson(claimPath);
    if (existing && existing.pid === process.pid) fs.unlinkSync(claimPath);
  } catch (_) { /* ignore */ }
}

/**
 * Load the durable objective record. Returns null when the objective has
 * never been registered (a genuinely new objective, not a restart).
 * @param {string} dataRoot
 * @param {string} objectiveId
 * @returns {Object|null}
 */
function loadObjective(dataRoot, objectiveId) {
  return readJson(path.join(objectiveDir(dataRoot, objectiveId), 'objective.json'));
}

/**
 * Register an objective. Re-entrant: same logical intent on restart returns
 * the existing record. Durable state survives process restart.
 * @param {string} dataRoot
 * @param {string} namespace
 * @param {string} objectiveText
 * @param {Object} [opts] - { constraints, maxWorkOrders }
 * @returns {Object} objective record
 */
function registerObjective(dataRoot, namespace, objectiveText, opts = {}) {
  const objectiveId = deriveObjectiveId({ namespace, objectiveText, constraints: opts.constraints || {} });
  const dir = objectiveDir(dataRoot, objectiveId);
  const existing = loadObjective(dataRoot, objectiveId);
  if (existing) {
    existing.reconciled_at = new Date().toISOString();
    atomicWrite(path.join(dir, 'objective.json'), JSON.stringify(existing, null, 2) + '\n');
    return existing;
  }
  const record = {
    objective_id: objectiveId,
    namespace,
    objective_text: objectiveText,
    constraints: opts.constraints || {},
    max_work_orders: Number.isInteger(opts.maxWorkOrders) ? opts.maxWorkOrders : 2,
    state: 'ACTIVE',
    registered_at: new Date().toISOString(),
    reconciled_at: null,
    work_orders_used: 0,
    cancellation: null,
  };
  atomicWrite(path.join(dir, 'objective.json'), JSON.stringify(record, null, 2) + '\n');
  return record;
}

/**
 * Current work-order budget usage. Returns { used, limit }.
 * @param {string} dataRoot
 * @param {string} objectiveId
 */
function budgetUsage(dataRoot, objectiveId) {
  const record = loadObjective(dataRoot, objectiveId);
  if (!record) return { used: 0, limit: 0 };
  return { used: record.work_orders_used, limit: record.max_work_orders };
}

/**
 * Reserve one work-order budget unit against a work order id.
 * Idempotent: re-reserving the same work order id does not consume twice.
 * Returns true when a unit was (or was already) reserved.
 * @param {string} dataRoot
 * @param {string} objectiveId
 * @param {string} workOrderId
 * @returns {{ ok: boolean, used?: number, limit?: number, reason?: string }}
 */
function reserveWorkOrderBudget(dataRoot, objectiveId, workOrderId) {
  const dir = objectiveDir(dataRoot, objectiveId);
  const record = loadObjective(dataRoot, objectiveId);
  if (!record) return { ok: false, reason: 'unknown-objective' };
  const reservations = readJson(path.join(dir, 'budget_reservations.json')) || { reservations: {} };
  if (reservations.reservations[workOrderId]) {
    return { ok: true, used: record.work_orders_used, limit: record.max_work_orders };
  }
  if (record.work_orders_used >= record.max_work_orders) {
    return { ok: false, used: record.work_orders_used, limit: record.max_work_orders, reason: 'budget-exhausted' };
  }
  reservations.reservations[workOrderId] = { reserved_at: new Date().toISOString() };
  record.work_orders_used += 1;
  atomicWrite(path.join(dir, 'budget_reservations.json'), JSON.stringify(reservations, null, 2) + '\n');
  atomicWrite(path.join(dir, 'objective.json'), JSON.stringify(record, null, 2) + '\n');
  return { ok: true, used: record.work_orders_used, limit: record.max_work_orders };
}

/**
 * Record durable cancellation for an objective. Cancellation survives
 * restarts; it blocks all new work and does NOT claim in-flight workers
 * stopped.
 * @param {string} dataRoot
 * @param {string} objectiveId
 * @param {string} reason
 * @returns {Object} updated objective record
 */
function recordCancellation(dataRoot, objectiveId, reason) {
  const dir = objectiveDir(dataRoot, objectiveId);
  const record = loadObjective(dataRoot, objectiveId);
  if (!record) throw new Error('recordCancellation: unknown objective ' + objectiveId);
  record.cancellation = {
    requested_at: new Date().toISOString(),
    reason: reason || 'operator-requested',
    in_flight_workers_may_continue: true,
  };
  record.state = 'CANCELLED';
  atomicWrite(path.join(dir, 'objective.json'), JSON.stringify(record, null, 2) + '\n');
  return record;
}

/**
 * Durable work-order store path layout:
 *   objectives/<objective_id>/work_orders/<work_order_id>.json
 * @param {string} dataRoot
 * @param {string} objectiveId
 * @param {string} workOrderId
 * @returns {string}
 */
function workOrderPath(dataRoot, objectiveId, workOrderId) {
  return path.join(objectiveDir(dataRoot, objectiveId), 'work_orders', workOrderId + '.json');
}

/**
 * Load a durable work order. Null when absent.
 * @param {string} dataRoot
 * @param {string} objectiveId
 * @param {string} workOrderId
 * @returns {Object|null}
 */
function loadWorkOrder(dataRoot, objectiveId, workOrderId) {
  return readJson(workOrderPath(dataRoot, objectiveId, workOrderId));
}

/**
 * Authorize (or re-load) a durable work order with a stable identity.
 * Re-entrant: restart rediscovers the same work order instead of creating
 * a new one. Durable state survives process restart.
 * @param {string} dataRoot
 * @param {string} objectiveId
 * @param {string} taskKey - stable task key (never run-scoped)
 * @param {Object} taskSpec - task text/spec
 * @returns {Object} work order record
 */
function authorizeWorkOrder(dataRoot, objectiveId, taskKey, taskSpec = {}) {
  const workOrderId = deriveWorkOrderId(objectiveId, taskKey);
  const existing = loadWorkOrder(dataRoot, objectiveId, workOrderId);
  if (existing) return existing;
  const record = {
    work_order_id: workOrderId,
    objective_id: objectiveId,
    task_key: taskKey,
    task_spec: taskSpec,
    state: 'AUTHORIZED',
    attempt_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_attempt_id: null,
  };
  atomicWrite(workOrderPath(dataRoot, objectiveId, workOrderId), JSON.stringify(record, null, 2) + '\n');
  return record;
}

/**
 * Update a durable work order record. Fails loudly on persistence failure
 * so callers cannot treat a write as durable when it was not.
 * @param {string} dataRoot
 * @param {string} objectiveId
 * @param {string} workOrderId
 * @param {Object} update
 * @returns {Object} updated record
 */
function updateWorkOrder(dataRoot, objectiveId, workOrderId, update = {}) {
  const record = loadWorkOrder(dataRoot, objectiveId, workOrderId);
  if (!record) throw new Error('updateWorkOrder: unknown work order ' + workOrderId);
  Object.assign(record, update);
  record.updated_at = new Date().toISOString();
  atomicWrite(workOrderPath(dataRoot, objectiveId, workOrderId), JSON.stringify(record, null, 2) + '\n');
  return record;
}

/**
 * Rendezvous result path for a work order: the file the dispatcher must
 * write the worker envelope/result to atomically, independent of the
 * coordinator process.
 * @param {string} dataRoot
 * @param {string} objectiveId
 * @param {string} workOrderId
 * @returns {string}
 */
function rendezvousResultPath(dataRoot, objectiveId, workOrderId) {
  return path.join(objectiveDir(dataRoot, objectiveId), 'results', workOrderId + '.result.json');
}

/**
 * Read the rendezvous result for a work order. Null when absent (worker
 * result not yet durable; never treat absence as completion).
 * @param {string} dataRoot
 * @param {string} objectiveId
 * @param {string} workOrderId
 * @returns {Object|null}
 */
function readRendezvousResult(dataRoot, objectiveId, workOrderId) {
  return readJson(rendezvousResultPath(dataRoot, objectiveId, workOrderId));
}

/**
 * List all durable work orders for an objective. Returns [] when none exist.
 * @param {string} dataRoot
 * @param {string} objectiveId
 * @returns {Array<Object>}
 */
function listWorkOrders(dataRoot, objectiveId) {
  const dir = path.join(objectiveDir(dataRoot, objectiveId), 'work_orders');
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (err) {
    if (err && err.code === 'ENOENT') return [];
    throw err;
  }
  return files
    .filter((f) => f.endsWith('.json'))
    .map((f) => readJson(path.join(dir, f)))
    .filter(Boolean);
}

/**
 * Update the durable objective state (e.g. ACTIVE -> COMPLETED).
 * @param {string} dataRoot
 * @param {string} objectiveId
 * @param {string} state
 * @param {Object} [extra]
 * @returns {Object} updated record
 */
function setObjectiveState(dataRoot, objectiveId, state, extra = {}) {
  const dir = objectiveDir(dataRoot, objectiveId);
  const record = loadObjective(dataRoot, objectiveId);
  if (!record) throw new Error('setObjectiveState: unknown objective ' + objectiveId);
  record.state = state;
  Object.assign(record, extra);
  record.updated_at = new Date().toISOString();
  atomicWrite(path.join(dir, 'objective.json'), JSON.stringify(record, null, 2) + '\n');
  return record;
}

/**
 * Operator cancellation signal path: creating this file requests
 * cancellation of the objective. The loop records it durably and stops
 * issuing new work; it never claims in-flight workers stopped.
 * @param {string} dataRoot
 * @param {string} objectiveId
 * @returns {string}
 */
function cancelRequestPath(dataRoot, objectiveId) {
  return path.join(objectiveDir(dataRoot, objectiveId), 'cancel.requested');
}

module.exports = {
  listWorkOrders,
  setObjectiveState,
  cancelRequestPath,
  stableStringify,
  deriveObjectiveId,
  deriveWorkOrderId,
  deriveAttemptId,
  objectivesBaseDir,
  objectiveDir,
  atomicWrite,
  readJson,
  coordinatorLockKey,
  coordinatorClaimPath,
  acquireCoordinatorLock,
  releaseCoordinatorLock,
  loadObjective,
  registerObjective,
  budgetUsage,
  reserveWorkOrderBudget,
  recordCancellation,
  workOrderPath,
  loadWorkOrder,
  authorizeWorkOrder,
  updateWorkOrder,
  rendezvousResultPath,
  readRendezvousResult,
};
