'use strict';
/**
 * SWARM-20 AUTONOMY GAUNTLET — synthetic substrate (TEST DOUBLES, not authorities).
 *
 * This module provides the synthetic doubles the gauntlet harness needs to run
 * the full tenant execution loop WITHOUT touching live infrastructure:
 *   - SyntheticEventRuntime  : mirrors UnifiedEventRuntime.emit(eventType, source, payload, options)
 *                              contract incl. logical_id dedup (ON CONFLICT DO NOTHING semantics).
 *   - SyntheticMemoryStore   : tenant-scoped memory with permit checks (fail-closed on cross-tenant).
 *   - SyntheticMcpRegistry   : in-harness MCP server with one safe tool (echo.transform).
 *   - ObjectiveStore          : durable objective/work-order store mirroring objective-runtime.js
 *                              (same sha256 identity derivations; lockfile coordinator lease
 *                              instead of the PG advisory lock).
 *   - MissionControlSnapshot : dashboard-shaped state surface (mirrors /dashboard shape).
 *
 * NON-COMPETE DECLARATION: these are test doubles. They mint no canonical
 * identities beyond the harness evidence dir, they emit nothing into PING's
 * ping_events, and they must never be promoted into the repo as authorities.
 * Any repo promotion of gauntlet machinery belongs under src/tenanos/gauntlet/
 * (per coordinator directive), never as a new root and never as a second
 * event/capability/mission authority.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// stable identity primitives (exact mirrors of objective-runtime.js algorithms)
// ---------------------------------------------------------------------------

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

function deriveObjectiveId({ namespace, objectiveText, constraints = {} }) {
  if (!namespace || typeof namespace !== 'string') throw new Error('deriveObjectiveId: namespace required');
  if (!objectiveText || typeof objectiveText !== 'string') throw new Error('deriveObjectiveId: objectiveText required');
  const canonical = stableStringify({ namespace, objective_text: objectiveText, constraints });
  return crypto.createHash('sha256').update('objective:' + canonical, 'utf8').digest('hex');
}

function deriveWorkOrderId(objectiveId, taskKey) {
  if (!objectiveId) throw new Error('deriveWorkOrderId: objectiveId required');
  if (!taskKey || typeof taskKey !== 'string') throw new Error('deriveWorkOrderId: taskKey required');
  return crypto.createHash('sha256').update('work-order:' + objectiveId + ':' + taskKey, 'utf8').digest('hex');
}

function deriveAttemptId(workOrderId, attemptNumber) {
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1) throw new Error('deriveAttemptId: attemptNumber must be a positive integer');
  return workOrderId + '-attempt-' + attemptNumber;
}

// Canonical event identity (mirrors unified_event_runtime.js documented material:
// identity = { eventType, source, [namespace], [logical_id|payload] }).
function computeEventId(eventType, source, payload, options = {}) {
  const identity = {
    eventType,
    source,
    namespace: options.namespace || 'core::system',
  };
  identity[options.logical_id ? 'logical_id' : 'payload'] = options.logical_id || payload;
  return crypto.createHash('sha256').update('event:' + stableStringify(identity), 'utf8').digest('hex');
}

function atomicWrite(filePath, content) {
  const tmp = filePath + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, filePath);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isoNow() {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// SyntheticEventRuntime — test double for UnifiedEventRuntime
// ---------------------------------------------------------------------------

class SyntheticEventRuntime {
  constructor(evidenceDir) {
    this.dir = evidenceDir;
    this.eventsPath = path.join(evidenceDir, 'synthetic-events.jsonl');
    this._events = [];
    this._stats = { emitted: 0, persisted: 0, deduplicated: 0, failed: 0 };
    // Rehydrate across restarts: the evidence dir IS the durable store.
    if (fs.existsSync(this.eventsPath)) {
      for (const line of fs.readFileSync(this.eventsPath, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        try { this._events.push(JSON.parse(line)); } catch (_) {}
      }
    }
    this._byId = new Map(this._events.map((e) => [e.event_id, e]));
  }

  /**
   * Mirror of UnifiedEventRuntime.emit(eventType, source, payload, options).
   * options: { namespace, logical_id, correlation_id, causation_id, metadata }
   * Returns { status:'ok', eventId, deduplicated } — exactly what the real
   * external_agent_adapter.recordVerifiedResult consumes.
   */
  async emit(eventType, source, payload, options = {}) {
    if (!eventType || typeof eventType !== 'string') {
      this._stats.failed++;
      return { status: 'error', error: 'event_type required' };
    }
    const namespace = options.namespace || 'core::system';
    const eventId = computeEventId(eventType, source, payload, { namespace, logical_id: options.logical_id });
    if (this._byId.has(eventId)) {
      // ON CONFLICT (event_id) DO NOTHING — idempotent replay.
      this._stats.deduplicated++;
      return { status: 'ok', eventId, deduplicated: true };
    }
    const event = {
      event_id: eventId,
      event_type: eventType,
      source,
      namespace,
      timestamp: isoNow(),
      payload,
      metadata: Object.assign({}, options.metadata || {}, {
        synthetic: true,
        harness: 'swarm-20-gauntlet',
        correlation_id: options.correlation_id || null,
        causation_id: options.causation_id || null,
      }),
    };
    this._byId.set(eventId, event);
    this._events.push(event);
    fs.appendFileSync(this.eventsPath, JSON.stringify(event) + '\n');
    this._stats.emitted++;
    this._stats.persisted++;
    return { status: 'ok', eventId, deduplicated: false };
  }

  query({ eventType, namespace, limit = 100 } = {}) {
    let rows = this._events;
    if (eventType) rows = rows.filter((e) => e.event_type === eventType);
    if (namespace) rows = rows.filter((e) => e.namespace === namespace);
    return { events: rows.slice(-limit), total: rows.length };
  }

  countByType() {
    const counts = {};
    for (const e of this._events) counts[e.event_type] = (counts[e.event_type] || 0) + 1;
    return counts;
  }

  stats() { return Object.assign({}, this._stats, { stored: this._events.length }); }
}

// ---------------------------------------------------------------------------
// SyntheticMemoryStore — tenant-scoped memory with permit checks
// ---------------------------------------------------------------------------

class MemoryDenied extends Error {
  constructor(reason) { super(reason); this.code = 'MEMORY_DENIED'; }
}

/**
 * Memories are tenant-scoped. Retrieval requires the requester's tenant to
 * equal the memory's tenant (fail-closed). Each memory carries provenance;
 * superseded_by chains mark stale facts.
 */
class SyntheticMemoryStore {
  constructor() {
    this._memories = new Map(); // id -> memory
  }

  seed(memories) {
    for (const m of memories) {
      if (!m.id || !m.tenant_id) throw new Error('memory seed requires id and tenant_id');
      this._memories.set(m.id, Object.assign({ superseded_by: null, confidence: 0.5 }, m));
    }
  }

  /**
   * Retrieve permitted memories for a tenant. Cross-tenant retrieval is
   * DENIED (fail-closed) — attack 08's expected outcome.
   */
  retrieve({ tenantId, requesterTenantId, purpose }) {
    if (!tenantId || !requesterTenantId) throw new MemoryDenied('tenant identity required for memory retrieval');
    if (tenantId !== requesterTenantId) {
      throw new MemoryDenied(`cross-tenant retrieval denied: requester '${requesterTenantId}' may not read tenant '${tenantId}' memories`);
    }
    if (!purpose || typeof purpose !== 'string') throw new MemoryDenied('retrieval purpose required');
    const rows = [...this._memories.values()].filter((m) => m.tenant_id === tenantId);
    return {
      tenant_id: tenantId,
      purpose,
      retrieved_at: isoNow(),
      permit: `permit:${tenantId}:${crypto.createHash('sha256').update(tenantId + ':' + purpose).digest('hex').slice(0, 12)}`,
      memories: rows.map((m) => ({
        id: m.id,
        fact: m.fact,
        confidence: m.confidence,
        provenance: m.provenance,
        superseded_by: m.superseded_by,
        stale: !!m.superseded_by,
      })),
    };
  }

  /**
   * Propose a memory candidate. Candidates are status='candidate' and require
   * human approval to promote — the lane-G recommended consumer pattern
   * (graph projection candidate), implemented in-harness only.
   */
  proposeCandidate({ tenantId, fact, justification, confidence }) {
    if (!tenantId || !fact || !Array.isArray(justification) || justification.length === 0) {
      throw new Error('candidate requires tenantId, fact, and non-empty justification (event IDs)');
    }
    const candidate = {
      candidate_id: 'cand-' + crypto.createHash('sha256').update(tenantId + ':' + fact).digest('hex').slice(0, 16),
      tenant_id: tenantId,
      fact,
      justification,
      confidence: confidence == null ? 0.5 : confidence,
      status: 'candidate',
      requires_human_approval: true,
      proposed_at: isoNow(),
    };
    return candidate;
  }
}

// ---------------------------------------------------------------------------
// SyntheticMcpRegistry — in-harness MCP server (test double)
// ---------------------------------------------------------------------------

class McpServerRemoved extends Error {
  constructor() { super('MCP server unavailable (removed)'); this.code = 'MCP_SERVER_REMOVED'; }
}

/**
 * Minimal MCP-shaped registry: tools/list + tools/call over one safe tool.
 * echo.transform is pure (no network, no writes) — the only tool the
 * gauntlet ever invokes. Modes: 'normal' | 'removed' | 'malformed-result'.
 */
class SyntheticMcpRegistry {
  constructor() {
    this.mode = 'normal';
    this.calls = [];
  }

  setMode(mode) {
    if (!['normal', 'removed', 'malformed-result'].includes(mode)) throw new Error('unknown MCP mode ' + mode);
    this.mode = mode;
  }

  listTools() {
    if (this.mode === 'removed') throw new McpServerRemoved();
    return [{ name: 'echo.transform', description: 'Pure text transform (upper|reverse). No network, no writes.', inputSchema: { type: 'object', properties: { text: { type: 'string' }, op: { type: 'string', enum: ['upper', 'reverse'] } }, required: ['text', 'op'] } }];
  }

  async callTool(name, args) {
    this.calls.push({ name, args, at: isoNow(), mode: this.mode });
    if (this.mode === 'removed') throw new McpServerRemoved();
    if (name !== 'echo.transform') throw new Error(`unknown tool '${name}'`);
    if (!args || typeof args.text !== 'string' || !['upper', 'reverse'].includes(args.op)) {
      throw new Error('echo.transform: invalid args (need {text:string, op:upper|reverse})');
    }
    const result = args.op === 'upper' ? args.text.toUpperCase() : [...args.text].reverse().join('');
    if (this.mode === 'malformed-result') {
      // Attack 04: the tool returns a structurally invalid result.
      return { wrong_shape: true };
    }
    return { content: [{ type: 'text', text: result }], isError: false };
  }
}

// ---------------------------------------------------------------------------
// ObjectiveStore — durable objective/work-order store (mirrors objective-runtime.js)
// ---------------------------------------------------------------------------

class ObjectiveStore {
  constructor(dataRoot) {
    this.dataRoot = dataRoot;
    this.base = path.join(dataRoot, 'objectives');
    fs.mkdirSync(this.base, { recursive: true });
  }

  _dir(objectiveId) {
    const d = path.join(this.base, objectiveId);
    fs.mkdirSync(d, { recursive: true });
    return d;
  }

  registerObjective(namespace, objectiveText, { constraints = {}, maxWorkOrders = 2 } = {}) {
    const objectiveId = deriveObjectiveId({ namespace, objectiveText, constraints });
    const dir = this._dir(objectiveId);
    const recPath = path.join(dir, 'objective.json');
    if (!fs.existsSync(recPath)) {
      atomicWrite(recPath, JSON.stringify({
        objective_id: objectiveId, namespace, objective_text: objectiveText,
        constraints, max_work_orders: maxWorkOrders,
        state: 'ACTIVE', registered_at: isoNow(), cancellation: null,
        work_orders_used: 0,
      }, null, 2));
    }
    return this.loadObjective(objectiveId);
  }

  loadObjective(objectiveId) {
    const p = path.join(this._dir(objectiveId), 'objective.json');
    if (!fs.existsSync(p)) return null;
    return readJson(p);
  }

  setObjectiveState(objectiveId, state, extra = {}) {
    const rec = this.loadObjective(objectiveId);
    rec.state = state;
    Object.assign(rec, extra);
    atomicWrite(path.join(this._dir(objectiveId), 'objective.json'), JSON.stringify(rec, null, 2));
    return rec;
  }

  recordCancellation(objectiveId, reason) {
    const rec = this.loadObjective(objectiveId);
    rec.cancellation = { requested_at: isoNow(), reason };
    atomicWrite(path.join(this._dir(objectiveId), 'objective.json'), JSON.stringify(rec, null, 2));
    return rec;
  }

  cancelRequestPath(objectiveId) {
    return path.join(this._dir(objectiveId), 'cancel.requested');
  }

  budgetUsage(objectiveId) {
    const rec = this.loadObjective(objectiveId);
    return { used: rec.work_orders_used || 0, limit: rec.max_work_orders };
  }

  reserveWorkOrderBudget(objectiveId) {
    const rec = this.loadObjective(objectiveId);
    if ((rec.work_orders_used || 0) >= rec.max_work_orders) {
      throw new Error(`work-order budget exhausted (${rec.work_orders_used}/${rec.max_work_orders})`);
    }
    rec.work_orders_used = (rec.work_orders_used || 0) + 1;
    atomicWrite(path.join(this._dir(objectiveId), 'objective.json'), JSON.stringify(rec, null, 2));
    return rec.work_orders_used;
  }

  // Coordinator lease: lockfile instead of the PG advisory lock. The lockfile
  // holds {pid, started_at}; a stale lock (dead pid) is reclaimable, which
  // mirrors the PG session-drop release semantics (SIGKILL-safe).
  acquireCoordinatorLease(objectiveId) {
    const lockPath = path.join(this._dir(objectiveId), 'coordinator.lock');
    if (fs.existsSync(lockPath)) {
      try {
        const lock = readJson(lockPath);
        let alive = false;
        try { process.kill(lock.pid, 0); alive = true; } catch (_) { alive = false; }
        if (alive) return { acquired: false, holder_pid: lock.pid };
        // Stale lock: previous holder died (incl. SIGKILL). Reclaim.
      } catch (_) { /* corrupt lock: reclaim */ }
    }
    atomicWrite(lockPath, JSON.stringify({ pid: process.pid, started_at: isoNow() }));
    return { acquired: true, holder_pid: process.pid };
  }

  releaseCoordinatorLease(objectiveId) {
    const lockPath = path.join(this._dir(objectiveId), 'coordinator.lock');
    try {
      const lock = readJson(lockPath);
      if (lock.pid === process.pid) fs.unlinkSync(lockPath);
    } catch (_) {}
  }

  workOrderPath(objectiveId, workOrderId) {
    return path.join(this._dir(objectiveId), `workorder-${workOrderId}.json`);
  }

  listWorkOrders(objectiveId) {
    const dir = this._dir(objectiveId);
    return fs.readdirSync(dir)
      .filter((f) => f.startsWith('workorder-') && f.endsWith('.json'))
      .map((f) => readJson(path.join(dir, f)));
  }

  saveWorkOrder(objectiveId, record) {
    atomicWrite(this.workOrderPath(objectiveId, record.work_order_id), JSON.stringify(record, null, 2));
  }

  updateWorkOrder(objectiveId, workOrderId, update) {
    const p = this.workOrderPath(objectiveId, workOrderId);
    const rec = readJson(p);
    Object.assign(rec, update);
    atomicWrite(p, JSON.stringify(rec, null, 2));
    return rec;
  }

  rendezvousPath(objectiveId, workOrderId) {
    return path.join(this._dir(objectiveId), `rendezvous-${workOrderId}.json`);
  }

  writeRendezvous(objectiveId, workOrderId, result) {
    atomicWrite(this.rendezvousPath(objectiveId, workOrderId), JSON.stringify(result, null, 2));
  }

  readRendezvous(objectiveId, workOrderId) {
    const p = this.rendezvousPath(objectiveId, workOrderId);
    if (!fs.existsSync(p)) return null;
    return readJson(p);
  }
}

// ---------------------------------------------------------------------------
// MissionControlSnapshot — dashboard-shaped state surface (read model only)
// ---------------------------------------------------------------------------

function buildMissionControlSnapshot({ eventRuntime, objectiveStore, objectiveId, memoryCandidates }) {
  const counts = eventRuntime.countByType();
  const workOrders = objectiveStore.listWorkOrders(objectiveId).map((w) => ({
    work_order_id: w.work_order_id,
    task_key: w.task_key,
    state: w.state,
    attempt_count: w.attempt_count || 0,
  }));
  const objective = objectiveStore.loadObjective(objectiveId);
  return {
    status: 'ok',
    generated_at: isoNow(),
    synthetic: true,
    dashboard: {
      objective: objective ? { objective_id: objective.objective_id, state: objective.state, work_orders_used: objective.work_orders_used } : null,
      workerActivity: (counts.WORKER_COMPLETED || 0) + (counts.WORKER_FAILED || 0),
      eventSummary: { total: eventRuntime.stats().stored, byType: counts },
      workOrders,
      memoryCandidates: (memoryCandidates || []).map((c) => ({
        candidate_id: c.candidate_id, status: c.status,
        requires_human_approval: c.requires_human_approval, confidence: c.confidence,
      })),
    },
  };
}

module.exports = {
  stableStringify,
  deriveObjectiveId,
  deriveWorkOrderId,
  deriveAttemptId,
  computeEventId,
  atomicWrite,
  readJson,
  isoNow,
  SyntheticEventRuntime,
  SyntheticMemoryStore,
  MemoryDenied,
  SyntheticMcpRegistry,
  McpServerRemoved,
  ObjectiveStore,
  buildMissionControlSnapshot,
};
