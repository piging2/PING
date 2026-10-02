/**
 * P0 REPRODUCTION — approved-node → re-emission → candidate demotion.
 *
 * READ-ONLY vs the repo: this script never touches /home/nolan/projects/ping
 * or /home/nolan/ping-gateway-src. It loads a COPY of the KnowledgeGraph
 * module (path via MODULE_PATH env) and drives it with a fake pg pool that
 * faithfully simulates Postgres ON CONFLICT semantics for the exact SQL the
 * module emits (the fake pool parses the DO UPDATE SET clause out of the SQL
 * string, so it tracks the module under test, not a hard-coded expectation).
 *
 * Production sequence mirrored:
 *   1. Graph projection (gateway_runtime.js): OBSERVATION_CREATED arrives,
 *      addNode(..., { status: 'candidate', confidence: 0.5, sourceEventId })
 *   2. Human approval: KnowledgePromoter -> updateNodeBySourceEvent(
 *      sourceEventId, { status: 'approved', confidence: 1.0 })  [Phase F]
 *   3. Re-emission: the SAME event is emitted again (replay / retry /
 *      re-ingest). Same nodeType+label+data -> same deterministic node_id ->
 *      Postgres ON CONFLICT (node_id) DO UPDATE fires.
 *
 * Expected (per the module's own contract: "The ONLY authorized recompute is
 * human approval ... a lifecycle transition, never a data mutation"):
 *   node stays { status: 'approved', confidence: 1.0 }.
 *
 * Actual on current code:
 *   node becomes { status: 'candidate', confidence: 1.0 } — demoted, and
 *   self-contradictory (a "candidate" carrying human-approved confidence).
 *
 * Usage:
 *   MODULE_PATH=./scratch/pristine/knowledge_graph.js node p0-repro.js   # bug
 *   MODULE_PATH=./scratch/patched/knowledge_graph.js  node p0-repro.js   # fixed
 */
'use strict';

const path = require('path');
const assert = require('node:assert/strict');

const MODULE_PATH =
  process.env.MODULE_PATH ||
  path.join(__dirname, 'scratch', 'pristine', 'knowledge_graph.js');

// eslint-disable-next-line import/no-dynamic-require, global-require
const { KnowledgeGraph } = require(MODULE_PATH);

/**
 * Fake pg pool with faithful Postgres semantics for the exact SQL shapes
 * KnowledgeGraph emits. DDL is a no-op. INSERT ... ON CONFLICT applies the
 * literal DO UPDATE SET assignments parsed from the SQL text. UPDATE applies
 * its SET/WHERE clauses. Anything unmodeled throws (fail closed — a silent
 * pass here would be worse than a loud error).
 */
class ConflictSimPool {
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
      // ON CONFLICT (node_id): apply the module's own DO UPDATE SET clause.
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

    if (S.startsWith('SELECT * FROM knowledge_nodes WHERE node_id = $1')) {
      const n = this.nodes.get(params[0]);
      return { rows: n ? [{ ...n }] : [], rowCount: n ? 1 : 0 };
    }

    throw new Error(`unmodeled SQL: ${S.slice(0, 100)}`);
  }

  async getNode(nodeId) {
    const n = this.nodes.get(nodeId);
    return n ? { ...n } : null;
  }
}

async function main() {
  const pool = new ConflictSimPool();
  const kg = new KnowledgeGraph({ pool });
  await kg.initialize();

  // Step 1 — graph projection of the original observation (gateway_runtime.js).
  const label = 'OBSERVATION_CREATED evt-001';
  const data = { event_type: 'OBSERVATION_CREATED', source: 'field-agent', payload: { text: 'Cedar fence needs restaining' } };
  const opts = {
    namespace: 'tenant::hpp',
    confidence: 0.5,
    status: 'candidate',
    sourceEventId: 'evt-001',
    correlationId: 'corr-1',
    confidenceProvenance: 'spine',
  };
  const nodeId = await kg.addNode('event', label, data, opts);
  console.log('node_id (deterministic):', nodeId);

  // Step 2 — human approval via the promoter path (Phase F).
  const promoted = await kg.updateNodeBySourceEvent('evt-001', {
    status: 'approved',
    confidence: 1.0,
    namespace: 'tenant::hpp',
  });
  assert.equal(promoted, true, 'promotion must match exactly one node');
  let node = await pool.getNode(nodeId);
  console.log('after human approval :', JSON.stringify({ status: node.status, confidence: node.confidence }));

  // Step 3 — re-emission: the SAME event arrives again (replay/retry/re-ingest).
  // Identical args -> identical deterministic node_id -> ON CONFLICT fires.
  const nodeId2 = await kg.addNode('event', label, data, opts);
  assert.equal(nodeId2, nodeId, 're-emission must resolve to the same node_id');

  node = await pool.getNode(nodeId);
  console.log('after re-emission    :', JSON.stringify({ status: node.status, confidence: node.confidence }));

  const survived = node.status === 'approved' && node.confidence === 1.0;
  console.log('');
  console.log(survived
    ? 'VERDICT: OK — approved node survived re-emission.'
    : 'VERDICT: BUG REPRODUCED — approved node demoted to candidate on re-emission.');
  process.exitCode = survived ? 0 : 1;
}

main().catch((err) => {
  console.error('REPRO HARNESS FAILURE:', err.message);
  process.exitCode = 2;
});
