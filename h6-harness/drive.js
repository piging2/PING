'use strict';
/**
 * Wave H6 live-drive harness (Pig WSL, in-process, no production touch).
 *
 * Drives the REAL classes (no mocks of the units under test):
 *  - Section A: gateway/routes/knowledge.js POST /nodes (the knowledge-node adapter)
 *  - Section B: UnifiedEventRuntime -> EventToMissionBridge -> MissionScheduler
 *                -> WorkerRuntime -> KnowledgePromoter (SNIPPET_APPROVED chain)
 *  - Section C: same spine for REPLAY_VERIFY -> mission bridge -> replay worker
 *
 * Fakes are storage-only: FakePool (pg), FakeMissionRuntime (ping_missions),
 * express stub (the route module requires it; not installed here).
 *
 * Run: node drive.js
 * Exit 0 = all assertions passed; exit 1 = at least one failed.
 */
const assert = require('assert');
const crypto = require('crypto');
const Module = require('module');
const path = require('path');

const ROOT = '/home/nolan/worktrees/ping-harvest-12h';

// ---- express stub: gateway/routes/knowledge.js does require('express') ----
const routeHandlers = {};
const expressStub = {
  Router: () => ({
    get: (p, h) => { routeHandlers['GET ' + p] = h; },
    post: (p, h) => { routeHandlers['POST ' + p] = h; },
    put: (p, h) => { routeHandlers['PUT ' + p] = h; },
    delete: (p, h) => { routeHandlers['DELETE ' + p] = h; },
  }),
};
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'express') return expressStub;
  return origLoad.call(this, request, parent, isMain);
};

const { EventToMissionBridge } = require(path.join(ROOT, 'ping-runtime/orchestration/event_to_mission_bridge.js'));
const { MissionScheduler } = require(path.join(ROOT, 'ping-runtime/orchestration/mission_scheduler.js'));
const { UnifiedEventRuntime } = require(path.join(ROOT, 'ping-runtime/events/unified_event_runtime.js'));
const { WorkerRuntime } = require(path.join(ROOT, 'ping-runtime/workers/worker_runtime.js'));
const { registerCanonicalWorkers } = require(path.join(ROOT, 'ping-runtime/workers/canonical_workers.js'));
const { KnowledgeGraph } = require(path.join(ROOT, 'ping-runtime/knowledge/knowledge_graph.js'));
const createKnowledgeRoutes = require(path.join(ROOT, 'gateway/routes/knowledge.js'));

// ---------------- storage fakes ----------------

class FakePool {
  constructor() { this.nodes = []; }
  async query(sql, params = []) {
    const S = sql.trim();
    if (/CREATE TABLE|ALTER TABLE|CREATE INDEX/.test(S)) return { rows: [], rowCount: 0 };
    if (S.startsWith('INSERT INTO knowledge_nodes')) {
      this.nodes.push({
        node_id: params[0], node_type: params[1], entity_type: params[2],
        entity_id: params[3], label: params[4], data: JSON.parse(params[5]),
        source_event_id: params[6], namespace: params[7], confidence: params[8],
        status: params[9], correlation_id: params[10], confidence_provenance: params[11],
      });
      return { rows: [], rowCount: 1 };
    }
    if (S.startsWith('UPDATE knowledge_nodes SET')) {
      const sourceEventId = params[0];
      const hasNs = /AND namespace = \$/.test(S);
      let i = hasNs ? 2 : 1;
      const ns = hasNs ? params[1] : null;
      const status = /status = \$/.test(S) ? params[i++] : undefined;
      const confidence = /confidence = \$/.test(S) ? params[i++] : undefined;
      let n = 0;
      for (const node of this.nodes) {
        if (node.source_event_id === sourceEventId && (ns == null || node.namespace === ns)) {
          if (status !== undefined) node.status = status;
          if (confidence !== undefined) node.confidence = confidence;
          n++;
        }
      }
      return { rows: [], rowCount: n };
    }
    throw new Error('FakePool: unhandled SQL: ' + S.slice(0, 100));
  }
}

// Mirrors MissionRuntime.create id semantics: sha256(missionType:event_id)[:16],
// ON CONFLICT DO NOTHING. Storage-only; no production code touched.
class FakeMissionRuntime {
  constructor() { this.missions = new Map(); }
  _id(missionType, payload) {
    const key = payload.event_id
      ? `${missionType}:${payload.event_id}`
      : `${missionType}:${JSON.stringify(payload)}`;
    return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
  }
  async create(missionType, payload = {}, options = {}) {
    const id = this._id(missionType, payload);
    if (!this.missions.has(id)) {
      this.missions.set(id, {
        mission_id: id, mission_type: missionType, payload,
        priority: options.priority || 0, status: 'created',
        assigned_to: null, retries: 0, result: null, error: null,
      });
    }
    return id;
  }
  async getPending(limit) {
    return [...this.missions.values()]
      .filter((m) => m.status === 'created')
      .slice(0, limit || 10);
  }
  async assign(id, worker) {
    const m = this.missions.get(id);
    if (m && m.status === 'created') { m.status = 'assigned'; m.assigned_to = worker; return 1; }
    return 0;
  }
  async start(id) {
    const m = this.missions.get(id);
    if (m && m.status === 'assigned') { m.status = 'running'; return 1; }
    return 0;
  }
  async complete(id, result) {
    const m = this.missions.get(id);
    if (m && m.status === 'running') { m.status = 'completed'; m.result = result; return 1; }
    return 0;
  }
  async renewLease(id) { return this.missions.has(id) ? 1 : 0; }
  async reapExpiredLeases() { return 0; }
  async failWithRetry(id, error, policy) {
    const m = this.missions.get(id);
    m.retries += 1;
    m.error = String(error);
    m.status = m.retries >= (policy.max_attempts || 3) ? 'failed' : 'retry_pending';
    return m.retries;
  }
  pendingCount() {
    return [...this.missions.values()]
      .filter((m) => m.status === 'created' || m.status === 'retry_pending').length;
  }
}

const stubReplayProvider = {
  async executeReplay() {
    return {
      status: 'ok', violations: [], fingerprint: 'h6-fp-001',
      witness_root: 'h6-wr-001', replay_id: 'h6-rid-001',
      event_count: 1, artifact_count: 0, state_version: 'h6-sv-1',
      leaf_count: 1, tree_height: 1,
    };
  },
};

// ---------------- tiny test runner ----------------
let passed = 0, failed = 0;
const failures = [];
async function check(name, fn) {
  try { await fn(); passed++; console.log(`PASS  ${name}`); }
  catch (err) { failed++; failures.push({ name, err }); console.log(`FAIL  ${name}`); console.log(`      ${err.message}`); }
}
const detMissionId = (missionType, eventId) =>
  crypto.createHash('sha256').update(`${missionType}:${eventId}`).digest('hex').slice(0, 16);

async function drain(scheduler, missionRuntime, rounds = 30) {
  for (let i = 0; i < rounds; i++) {
    await scheduler._poll();
    if (missionRuntime.pendingCount() === 0) break;
    await new Promise((r) => setTimeout(r, 5));
  }
}

async function main() {
  console.log('=== H6 live drive ===');
  console.log(`root: ${ROOT}`);
  console.log(`head: ${require('child_process').execSync('git -C ' + ROOT + ' rev-parse --short HEAD').toString().trim()}`);
  console.log('');

  // ============ Section A: knowledge-node adapter (POST /knowledge/nodes) ============
  console.log('--- Section A: POST /knowledge/nodes adapter ---');
  const poolA = new FakePool();
  const kgA = new KnowledgeGraph({ pool: poolA });
  await kgA.initialize();
  const addNodeCalls = [];
  const origAddNode = kgA.addNode.bind(kgA);
  kgA.addNode = async (...args) => { addNodeCalls.push(args); return origAddNode(...args); };
  createKnowledgeRoutes(kgA, {});
  const postNodes = routeHandlers['POST /nodes'];
  assert.ok(postNodes, 'route handler registered');

  const reqBody = {
    nodeType: 'playbook', label: 'h6 adapter probe', data: { probe: 1 },
    nodeId: 'h6-node-001', sourceEventId: 'evt-h6-src-001', correlationId: 'corr-h6-001',
    namespace: 'core::owner', status: 'candidate', confidence: 0.5,
  };
  let jsonBody = null;
  const res = { json: (b) => { jsonBody = b; }, status: () => res };
  await postNodes({ body: reqBody, query: {}, params: {} }, res);

  await check('A1: route returns ok + nodeId', async () => {
    assert.strictEqual(jsonBody.status, 'ok');
    assert.strictEqual(jsonBody.nodeId, 'h6-node-001');
  });
  await check('A2: nodeId survives adapter byte-identical', async () => {
    assert.strictEqual(addNodeCalls.length, 1, 'addNode called once');
    assert.strictEqual(addNodeCalls[0][3].nodeId, 'h6-node-001');
  });
  await check('A3: sourceEventId survives adapter byte-identical', async () => {
    assert.strictEqual(addNodeCalls[0][3].sourceEventId, 'evt-h6-src-001');
  });
  await check('A4: correlationId survives adapter byte-identical', async () => {
    assert.strictEqual(addNodeCalls[0][3].correlationId, 'corr-h6-001');
  });
  await check('A5: persisted row carries all three IDs', async () => {
    const row = poolA.nodes.find((n) => n.node_id === 'h6-node-001');
    assert.ok(row, 'node persisted');
    assert.strictEqual(row.source_event_id, 'evt-h6-src-001');
    assert.strictEqual(row.correlation_id, 'corr-h6-001');
  });

  // ============ Shared spine for sections B and C ============
  console.log('');
  console.log('--- Sections B+C spine setup (real classes, storage fakes) ---');
  const eventRuntime = new UnifiedEventRuntime();
  const missionRuntime = new FakeMissionRuntime();
  const workerRuntime = new WorkerRuntime();
  const poolBC = new FakePool();
  const kg = new KnowledgeGraph({ pool: poolBC });
  await kg.initialize();
  registerCanonicalWorkers(workerRuntime, {
    eventRuntime, pool: poolBC, knowledgeGraph: kg, replayProvider: stubReplayProvider,
  });
  const workerNames = Object.keys(workerRuntime.getStats().workers);
  await check('B0: knowledge-promotion worker registered', async () => {
    assert.ok(workerNames.includes('knowledge-promotion'), `workers: ${workerNames.join(',')}`);
  });
  const scheduler = new MissionScheduler({
    missionRuntime, workerRuntime, eventRuntime, pollIntervalMs: 50, maxConcurrent: 3,
  });
  const bridge = new EventToMissionBridge({ eventRuntime, missionRuntime });
  bridge.start();

  // ============ Section B: SNIPPET_APPROVED -> KnowledgePromoter ============
  console.log('');
  console.log('--- Section B: SNIPPET_APPROVED dispatch ---');
  await kg.addNode('event', 'snippet candidate h6', { text: 'test snippet' }, {
    namespace: 'core::owner', confidence: 0.5, status: 'candidate',
    sourceEventId: 'evt-h6-approve-1', correlationId: 'corr-h6-approve-1',
  });
  const emitted = await eventRuntime.emit('SNIPPET_APPROVED', 'h6-drive',
    { sourceEventId: 'evt-h6-approve-1' },
    { namespace: 'core::owner', correlation_id: 'corr-h6-approve-1' });
  await check('B1: SNIPPET_APPROVED emitted ok', async () => {
    assert.strictEqual(emitted.status, 'ok');
  });
  const approvalEventId = emitted.eventId;
  await drain(scheduler, missionRuntime);

  const expectedPromoteMission = detMissionId('KNOWLEDGE_PROMOTE', approvalEventId);
  await check('B2: bridge created KNOWLEDGE_PROMOTE mission (deterministic id)', async () => {
    const m = missionRuntime.missions.get(expectedPromoteMission);
    assert.ok(m, `mission ${expectedPromoteMission} exists`);
    assert.strictEqual(m.mission_type, 'KNOWLEDGE_PROMOTE');
  });
  await check('B3: scheduler routed mission to knowledge-promotion worker', async () => {
    const m = missionRuntime.missions.get(expectedPromoteMission);
    assert.strictEqual(m.assigned_to, 'knowledge-promotion');
    assert.strictEqual(m.status, 'completed');
  });
  await check('B4: node promoted to approved, confidence 1.0 (human gate intact)', async () => {
    const node = poolBC.nodes.find((n) => n.source_event_id === 'evt-h6-approve-1');
    assert.ok(node, 'node found');
    assert.strictEqual(node.status, 'approved');
    assert.strictEqual(node.confidence, 1.0);
  });

  // ============ Section C: REPLAY_VERIFY -> mission bridge ============
  console.log('');
  console.log('--- Section C: REPLAY_VERIFY dispatch ---');
  const seen = { replayCompleted: [], witnessCreated: [], lineageCreated: [] };
  eventRuntime.on('REPLAY_COMPLETED', async (e) => seen.replayCompleted.push(e));
  eventRuntime.on('WITNESS_CREATED', async (e) => seen.witnessCreated.push(e));
  eventRuntime.on('LINEAGE_CREATED', async (e) => seen.lineageCreated.push(e));

  const emittedRv = await eventRuntime.emit('REPLAY_VERIFY', 'h6-drive',
    { probe: 'direct replay verify' },
    { namespace: 'core::system', correlation_id: 'corr-h6-replay-1' });
  await check('C1: REPLAY_VERIFY emitted ok', async () => {
    assert.strictEqual(emittedRv.status, 'ok');
  });
  const rvEventId = emittedRv.eventId;
  await drain(scheduler, missionRuntime);

  const expectedRvMission = detMissionId('REPLAY_VERIFY', rvEventId);
  await check('C2: bridge created REPLAY_VERIFY mission (deterministic id)', async () => {
    const m = missionRuntime.missions.get(expectedRvMission);
    assert.ok(m, `mission ${expectedRvMission} exists`);
    assert.strictEqual(m.mission_type, 'REPLAY_VERIFY');
  });
  await check('C3: scheduler routed mission to replay worker and completed', async () => {
    const m = missionRuntime.missions.get(expectedRvMission);
    assert.strictEqual(m.assigned_to, 'replay');
    assert.strictEqual(m.status, 'completed');
  });
  await check('C4: replay worker ran and emitted REPLAY_COMPLETED (verified)', async () => {
    assert.strictEqual(seen.replayCompleted.length, 1, `got ${seen.replayCompleted.length}`);
    const rc = seen.replayCompleted[0];
    assert.strictEqual(rc.payload.replay.verified, true);
    assert.strictEqual(rc.payload.upstreamEventId, rvEventId);
    assert.strictEqual(rc.metadata.correlation_id, 'corr-h6-replay-1');
  });
  await check('C5: downstream cascade WITNESS_CREATED + LINEAGE_CREATED followed', async () => {
    assert.strictEqual(seen.witnessCreated.length, 1);
    assert.strictEqual(seen.lineageCreated.length, 1);
  });
  await check('C6: no duplicate missions on identical re-emit (idempotent)', async () => {
    const before = missionRuntime.missions.size;
    await eventRuntime.emit('REPLAY_VERIFY', 'h6-drive',
      { probe: 'direct replay verify' },
      { namespace: 'core::system', correlation_id: 'corr-h6-replay-1' });
    await drain(scheduler, missionRuntime);
    assert.strictEqual(missionRuntime.missions.size, before, 'mission count unchanged');
  });

  console.log('');
  console.log('=== Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error('HARNESS ERROR:', err); process.exit(2); });
