/**
 * Regression tests — P0: approved-node → re-emission → candidate demotion.
 *
 * Guards ping-runtime/knowledge/knowledge_graph.js addNode().
 *
 * Invariant under test: addNode() is the re-observation path. On
 * ON CONFLICT (node_id) it may refresh data/namespace/correlation, but it
 * must NEVER write lifecycle state. Status transitions belong exclusively
 * to the promotion path (KnowledgePromoter via updateNodeBySourceEvent).
 *
 * Run:
 *   MODULE_PATH=/path/to/knowledge_graph.js node --test p0-regression-test.js
 *
 * Expected: all PASS on the fixed module; the demotion tests FAIL on the
 * pre-fix module (proving they capture the bug).
 *
 * The FakePool below simulates Postgres ON CONFLICT by parsing the module's
 * own DO UPDATE SET clause out of the emitted SQL — it tracks the module
 * under test, not a hard-coded expectation. Unmodeled SQL shapes throw
 * (fail closed).
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const MODULE_PATH = process.env.MODULE_PATH;
assert.ok(
  MODULE_PATH,
  'MODULE_PATH env must point at the knowledge_graph.js module under test'
);
// eslint-disable-next-line import/no-dynamic-require, global-require
const { KnowledgeGraph } = require(MODULE_PATH);

class FakePool {
  constructor() {
    this.nodes = new Map();
  }

  async query(sql, params = []) {
    const S = sql.replace(/\s+/g, ' ').trim();

    if (/CREATE TABLE|ALTER TABLE|CREATE INDEX/.test(S)) {
      return { rows: [], rowCount: 0 };
    }

    if (S.startsWith('INSERT INTO knowledge_nodes')) {
      const nodeId = params[0];
      const row = {
        node_id: params[0],
        node_type: params[1],
        entity_type: params[2],
        entity_id: params[3],
        label: params[4],
        data: JSON.parse(params[5]),
        source_event_id: params[6],
        namespace: params[7],
        confidence: params[8],
        status: params[9],
        correlation_id: params[10],
        confidence_provenance: params[11],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (!this.nodes.has(nodeId)) {
        this.nodes.set(nodeId, row);
        return { rows: [], rowCount: 1 };
      }
      const m = S.match(/ON CONFLICT \(node_id\) DO UPDATE SET (.+)$/);
      assert.ok(m, 'expected ON CONFLICT (node_id) DO UPDATE clause');
      const existing = this.nodes.get(nodeId);
      for (const part of m[1].split(',')) {
        const t = part.trim();
        if (/^updated_at = NOW\(\)$/.test(t)) {
          existing.updated_at = new Date().toISOString();
          continue;
        }
        const am = t.match(/^(\w+) = \$(\d+)$/);
        assert.ok(am, `unmodeled conflict assignment: ${t}`);
        let v = params[Number(am[2]) - 1];
        if (am[1] === 'data') v = JSON.parse(v);
        existing[am[1]] = v;
      }
      return { rows: [], rowCount: 1 };
    }

    if (S.startsWith('UPDATE knowledge_nodes SET')) {
      const setClause = S.match(/SET (.+) WHERE/)[1];
      const whereClause = S.match(/WHERE (.+)$/)[1];
      const assigns = [];
      for (const part of setClause.split(',')) {
        const t = part.trim();
        if (/^updated_at = NOW\(\)$/.test(t)) continue;
        const am = t.match(/^(\w+) = \$(\d+)$/);
        assert.ok(am, `unmodeled SET assignment: ${t}`);
        assigns.push([am[1], params[Number(am[2]) - 1]]);
      }
      const conds = [];
      for (const part of whereClause.split(' AND ')) {
        const cm = part.trim().match(/^(\w+) = \$(\d+)$/);
        assert.ok(cm, `unmodeled WHERE condition: ${part}`);
        conds.push([cm[1], params[Number(cm[2]) - 1]]);
      }
      let updated = 0;
      for (const node of this.nodes.values()) {
        if (conds.every(([col, val]) => node[col] === val)) {
          for (const [col, val] of assigns) node[col] = val;
          node.updated_at = new Date().toISOString();
          updated++;
        }
      }
      return { rows: [], rowCount: updated };
    }

    throw new Error(`unmodeled SQL: ${S.slice(0, 100)}`);
  }

  getNode(nodeId) {
    const n = this.nodes.get(nodeId);
    return n ? { ...n } : null;
  }
}

const OBS = {
  nodeType: 'event',
  label: 'OBSERVATION_CREATED evt-regr',
  data: { event_type: 'OBSERVATION_CREATED', source: 'field-agent' },
  // Exactly what the graph-projection subscriber passes (gateway_runtime.js).
  opts: {
    namespace: 'tenant::hpp',
    confidence: 0.5,
    status: 'candidate',
    sourceEventId: 'evt-regr',
    correlationId: 'corr-regr',
    confidenceProvenance: 'spine',
  },
};

async function freshGraph() {
  const pool = new FakePool();
  const kg = new KnowledgeGraph({ pool });
  await kg.initialize();
  return { pool, kg };
}

async function seedApproved(pool, kg) {
  const nodeId = await kg.addNode(OBS.nodeType, OBS.label, OBS.data, OBS.opts);
  const ok = await kg.updateNodeBySourceEvent('evt-regr', {
    status: 'approved',
    confidence: 1.0,
    namespace: 'tenant::hpp',
  });
  assert.equal(ok, true);
  return nodeId;
}

test('P0: re-emission does not demote an approved node to candidate', async () => {
  const { pool, kg } = await freshGraph();
  const nodeId = await seedApproved(pool, kg);

  // Re-emission: identical observation arrives again (replay / retry).
  const nodeId2 = await kg.addNode(OBS.nodeType, OBS.label, OBS.data, OBS.opts);
  assert.equal(nodeId2, nodeId, 're-emission resolves to the same node_id');

  const node = pool.getNode(nodeId);
  assert.equal(node.status, 'approved', 'approved status must survive re-emission');
  assert.equal(node.confidence, 1.0, 'approved confidence must survive re-emission');
});

test('P0: re-emission does not clear a rejected node', async () => {
  const { pool, kg } = await freshGraph();
  const nodeId = await kg.addNode(OBS.nodeType, OBS.label, OBS.data, OBS.opts);
  const ok = await kg.updateNodeBySourceEvent('evt-regr', {
    status: 'rejected',
    confidence: 0.2,
    namespace: 'tenant::hpp',
  });
  assert.equal(ok, true);

  await kg.addNode(OBS.nodeType, OBS.label, OBS.data, OBS.opts);

  const node = pool.getNode(nodeId);
  assert.equal(node.status, 'rejected', 'rejection must survive re-emission');
  assert.equal(node.confidence, 0.2, 'rejection confidence must survive re-emission');
});

test('P0: correction survives re-emission (approve -> reject -> re-emit)', async () => {
  const { pool, kg } = await freshGraph();
  const nodeId = await seedApproved(pool, kg);

  // Human corrects: the approval was wrong.
  const ok = await kg.updateNodeBySourceEvent('evt-regr', {
    status: 'rejected',
    confidence: 0.2,
    namespace: 'tenant::hpp',
  });
  assert.equal(ok, true);

  await kg.addNode(OBS.nodeType, OBS.label, OBS.data, OBS.opts);
  await kg.addNode(OBS.nodeType, OBS.label, OBS.data, OBS.opts);

  const node = pool.getNode(nodeId);
  assert.equal(node.status, 'rejected');
  assert.equal(node.confidence, 0.2);
});

test('re-emission of a candidate still refreshes whitelisted columns (upsert intent preserved)', async () => {
  const { pool, kg } = await freshGraph();
  const nodeId = await kg.addNode(OBS.nodeType, OBS.label, OBS.data, OBS.opts);

  // Same node (pinned nodeId), refreshed observation metadata: the conflict
  // path must still refresh data/namespace/correlation, just not status.
  const refreshedData = { ...OBS.data, payload: { text: 'richer payload' } };
  await kg.addNode(OBS.nodeType, OBS.label, refreshedData, {
    ...OBS.opts,
    nodeId,
    correlationId: 'corr-regr-2',
  });

  const node = pool.getNode(nodeId);
  assert.equal(node.status, 'candidate', 'candidate stays candidate');
  assert.deepEqual(node.data, refreshedData, 'data refresh still applies on conflict');
  assert.equal(node.correlation_id, 'corr-regr-2', 'correlation refresh still applies');
  assert.equal(node.namespace, 'tenant::hpp');
});

test('insert path still stores caller-provided status for new nodes', async () => {
  const { pool, kg } = await freshGraph();
  const nodeId = await kg.addNode('event', 'brand-new node', {}, {
    namespace: 'core::system',
    status: 'candidate',
  });
  const node = pool.getNode(nodeId);
  assert.equal(node.status, 'candidate');
  assert.equal(node.namespace, 'core::system');
});

test('re-emission never fabricates confidence (null stays null)', async () => {
  const { pool, kg } = await freshGraph();
  const nodeId = await kg.addNode('event', 'no-confidence node', {}, {
    namespace: 'tenant::hpp',
    status: 'candidate',
    sourceEventId: 'evt-nc',
  });
  await kg.addNode('event', 'no-confidence node', {}, {
    namespace: 'tenant::hpp',
    status: 'candidate',
    sourceEventId: 'evt-nc',
  });
  const node = pool.getNode(nodeId);
  assert.equal(node.confidence, null, 'null confidence is preserved, not fabricated');
  assert.equal(node.status, 'candidate');
});
