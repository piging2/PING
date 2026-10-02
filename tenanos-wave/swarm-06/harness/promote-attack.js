/**
 * SWARM-06 promotion-path adversarial suite (READ-ONLY vs the repo).
 *
 * Exercises the REAL memory promotion/write-path modules from the gateway
 * track repo (/home/nolan/ping at the tenanos-wave-gateway-base-20260923
 * base tag) with synthetic fixtures only. No live DB, no network, no writes
 * to any repo. A FakePool stands in for Postgres and parses the modules'
 * own SQL, so the harness tracks the code under test, not hard-coded
 * expectations. Unmodeled SQL shapes throw (fail closed).
 *
 * Each test asserts the SECURITY INVARIANT. On the current (pre-fix) code
 * every attack SUCCEEDS, so every test FAILS: that failure IS the finding.
 * After the corresponding fix lands, the same test PASSES (mutation-style:
 * fail-before / pass-after).
 *
 *   P-01  I1  POST /knowledge/nodes self-promotion: caller-supplied
 *             status='approved' + confidence=1.0 lands as approved with no
 *             human approval anywhere. (route: gateway/routes/knowledge.js)
 *   P-02  I1  Promoter promotes on event-type alone: a bare
 *             SNIPPET_APPROVED with no actor attestation flips a node to
 *             approved. Fix needs identity semantics: DEFER to the
 *             constitutional sprint; recorded here as a gate.
 *   P-03  I4  No transition log: approve -> reject leaves no durable
 *             record of the sequence (only updated_at moves). Fix form is
 *             the coordinator's call (KNOWLEDGE_TRANSITIONED vs table).
 *   P-04  I5  GET /knowledge/nodes without ?namespace returns rows from
 *             every namespace: cross-tenant read on the memory plane.
 *             (POST /search already requires namespace; GET /nodes does not.)
 *   P-05  I3  HybridSearch never sets the approved/rejected booleans that
 *             EvidenceAuthority.rank() reads, so the promotion signal is
 *             invisible to retrieval: a candidate with producer-asserted
 *             confidence 1.0 ranks equal to a human-approved node.
 *   P-06  M3  projectToQdrant payload carries no lifecycle fields: approval
 *             / rejection is invisible to the semantic leg forever.
 *
 * Run on the Pig:
 *   cd /home/nolan/ping && node --test /home/nolan/tenanos-wave-harness/promote-attack.js
 *
 * Env overrides (all optional):
 *   KG_SRC, KP_SRC, HS_SRC, EA_SRC, ES_SRC, ROUTES_SRC
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const PING = '/home/nolan/ping';
const KG_SRC = process.env.KG_SRC || path.join(PING, 'ping-runtime/knowledge/knowledge_graph.js');
const KP_SRC = process.env.KP_SRC || path.join(PING, 'ping-runtime/knowledge/knowledge_promoter.js');
const HS_SRC = process.env.HS_SRC || path.join(PING, 'ping-runtime/search/hybrid_search.js');
const EA_SRC = process.env.EA_SRC || path.join(PING, 'ping-runtime/evidence/evidence_authority.js');
const ES_SRC = process.env.ES_SRC || path.join(PING, 'ping-runtime/embeddings/embedding_service.js');
const ROUTES_SRC = process.env.ROUTES_SRC || path.join(PING, 'gateway/routes/knowledge.js');

// eslint-disable-next-line import/no-dynamic-require, global-require
const { KnowledgeGraph } = require(KG_SRC);
// eslint-disable-next-line import/no-dynamic-require, global-require
const { KnowledgePromoter } = require(KP_SRC);
// eslint-disable-next-line import/no-dynamic-require, global-require
const { HybridSearch } = require(HS_SRC);
// eslint-disable-next-line import/no-dynamic-require, global-require
const { EvidenceAuthority } = require(EA_SRC);
// eslint-disable-next-line import/no-dynamic-require, global-require
const { EmbeddingService } = require(ES_SRC);
// eslint-disable-next-line import/no-dynamic-require, global-require
const createKnowledgeRoutes = require(ROUTES_SRC);

// ---------------------------------------------------------------------------
// FakePool: simulates Postgres for the exact SQL shapes the real modules
// emit. Parses the module's own DO UPDATE SET / SET ... WHERE clauses.
// ---------------------------------------------------------------------------
class FakePool {
  constructor() {
    this.nodes = new Map(); // node_id -> row
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

    if (S.startsWith('SELECT * FROM knowledge_nodes WHERE node_id = $1')) {
      const row = this.nodes.get(params[0]);
      return { rows: row ? [{ ...row }] : [], rowCount: row ? 1 : 0 };
    }

    if (S.startsWith('SELECT * FROM knowledge_nodes WHERE 1=1')) {
      // queryNodes shape.
      const wherePart = S.split(' ORDER BY ')[0];
      const condSql = wherePart
        .replace('SELECT * FROM knowledge_nodes WHERE 1=1', '')
        .replace(/^\s*AND\s+/, '')
        .trim();
      let limit = null;
      const limitM = S.match(/LIMIT \$(\d+)$/);
      if (limitM) limit = params[Number(limitM[1]) - 1];
      let rows = Array.from(this.nodes.values());
      if (condSql) {
        for (const rawPart of condSql.split(' AND ').map((p) => p.trim()).filter(Boolean)) {
          const likeM = rawPart.match(/^\(label ILIKE \$(\d+) OR data::text ILIKE \$\d+\)$/);
          if (likeM) {
            const q = String(params[Number(likeM[1]) - 1]).replace(/%/g, '').toLowerCase();
            rows = rows.filter(
              (r) => r.label.toLowerCase().includes(q) || JSON.stringify(r.data).toLowerCase().includes(q),
            );
            continue;
          }
          const cm = rawPart.match(/^(\w+) = \$(\d+)$/);
          assert.ok(cm, `unmodeled queryNodes condition: ${rawPart}`);
          const val = params[Number(cm[2]) - 1];
          rows = rows.filter((r) => r[cm[1]] === val);
        }
      }
      rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      if (limit != null) rows = rows.slice(0, limit);
      return { rows: rows.map((r) => ({ ...r })), rowCount: rows.length };
    }

    throw new Error(`unmodeled SQL: ${S.slice(0, 120)}`);
  }

  getNode(nodeId) {
    const n = this.nodes.get(nodeId);
    return n ? { ...n } : null;
  }
}

// Drive a real express router with mock req/res (no HTTP).
function driveRouter(router, method, url, { body, query } = {}) {
  return new Promise((resolve, reject) => {
    const req = { method, url, body: body || {}, query: query || {}, headers: {} };
    const res = {
      statusCode: 200,
      body: null,
      status(c) { this.statusCode = c; return this; },
      json(o) { this.body = o; return this; },
    };
    router.handle(req, res, (err) => (err ? reject(err) : resolve({ statusCode: 404, body: null })));
    // Handlers are sync/async without next(); resolve on next tick after json captured.
    setImmediate(() => resolve(res));
  });
}

async function freshGraph() {
  const pool = new FakePool();
  const kg = new KnowledgeGraph({ pool });
  await kg.initialize();
  return { pool, kg };
}

// ---------------------------------------------------------------------------
// P-01: self-promotion through POST /knowledge/nodes (I1 violation)
// ---------------------------------------------------------------------------
test('P-01 self-promotion: POST /nodes with status=approved must not mint approved knowledge', async () => {
  const { pool, kg } = await freshGraph();
  const router = createKnowledgeRoutes(kg, {});

  const res = await driveRouter(router, 'POST', '/nodes', {
    body: {
      nodeType: 'event',
      label: 'attacker self-promote',
      data: { claim: 'we are the cheapest plumber in town' },
      namespace: 'tenant::victim',
      status: 'approved', // attacker asserts lifecycle state
      confidence: 1.0, // attacker asserts human-grade confidence
    },
  });
  assert.equal(res.statusCode, 200, 'route accepted the insert');
  const row = pool.getNode(res.body.nodeId);
  assert.ok(row, 'node was inserted');
  console.log(`    ATTACK: route minted node status=${row.status} confidence=${row.confidence} with zero human approval`);
  assert.equal(row.status, 'candidate', 'HTTP insert path must not self-promote: status forced to candidate');
  assert.equal(row.confidence, null, 'HTTP insert path must not accept caller confidence');
});

// ---------------------------------------------------------------------------
// P-02: promoter trusts the event type, not a human actor (I1 violation)
// Fix needs identity semantics: DEFER to the constitutional sprint.
// ---------------------------------------------------------------------------
test('P-02 actorless promotion: bare SNIPPET_APPROVED with no actor must not promote', async () => {
  const { pool, kg } = await freshGraph();
  const nodeId = await kg.addNode('event', 'victim observation', {}, {
    namespace: 'tenant::t1',
    status: 'candidate',
    confidence: null,
    sourceEventId: 'evt-p2',
  });
  const promoter = new KnowledgePromoter({ knowledgeGraph: kg });

  // No actor, no attestation, no human anywhere: just the event type string.
  const result = await promoter.handle({
    event_type: 'SNIPPET_APPROVED',
    payload: { sourceEventId: 'evt-p2', namespace: 'tenant::t1' },
  });
  const row = pool.getNode(nodeId);
  console.log(`    ATTACK: promoter.handle returned ${JSON.stringify(result)}; node now status=${row.status} confidence=${row.confidence}`);
  assert.equal(result.promoted, false, 'promotion requires a recorded human actor; unattributed approval events must not promote');
});

// ---------------------------------------------------------------------------
// P-03: lifecycle transitions leave no durable record (I4 violation)
// Fix form is the coordinator's call (KNOWLEDGE_TRANSITIONED vs table).
// ---------------------------------------------------------------------------
test('P-03 transition log: approve -> reject must be durably recorded, not just overwritten', async () => {
  const { pool, kg } = await freshGraph();
  const emitted = [];
  const fakeRuntime = {
    async emit(eventType, source, payload) {
      emitted.push({ eventType, source, payload });
      return { event_id: `evt-emitted-${emitted.length}` };
    },
  };
  const promoter = new KnowledgePromoter({ knowledgeGraph: kg, eventRuntime: fakeRuntime });

  await kg.addNode('event', 'correction target', {}, {
    namespace: 'tenant::t1',
    status: 'candidate',
    sourceEventId: 'evt-p3',
  });
  await promoter.handle({ event_type: 'SNIPPET_APPROVED', payload: { sourceEventId: 'evt-p3', namespace: 'tenant::t1' } });
  await promoter.handle({ event_type: 'SNIPPET_REJECTED', payload: { sourceEventId: 'evt-p3', namespace: 'tenant::t1' } });

  const transitions = emitted.filter(
    (e) => /TRANSITION/i.test(e.eventType) || (e.payload && e.payload.fromStatus && e.payload.toStatus),
  );
  console.log(`    ATTACK: after approve->reject, ${transitions.length} transition records exist; final row is just status=rejected`);
  assert.ok(transitions.length >= 2, 'every lifecycle transition must be durably recorded as an event (I4)');
});

// ---------------------------------------------------------------------------
// P-04: GET /nodes without namespace leaks every tenant (I5 violation)
// ---------------------------------------------------------------------------
test('P-04 tenant boundary: GET /nodes requires namespace, like POST /search does', async () => {
  const { pool, kg } = await freshGraph();
  await kg.addNode('event', 'tenant A secret', {}, { namespace: 'tenant::a', status: 'candidate' });
  await kg.addNode('event', 'tenant B secret', {}, { namespace: 'tenant::b', status: 'candidate' });
  const router = createKnowledgeRoutes(kg, {});

  const res = await driveRouter(router, 'GET', '/nodes', { query: {} });
  const namespaces = res.body && res.body.nodes ? [...new Set(res.body.nodes.map((n) => n.namespace))] : [];
  console.log(`    ATTACK: GET /nodes with no namespace returned HTTP ${res.statusCode} spanning namespaces: ${JSON.stringify(namespaces)}`);
  assert.equal(res.statusCode, 400, 'namespace is required on the memory read plane (privacy boundary)');
});

// ---------------------------------------------------------------------------
// P-05: promotion signal invisible to retrieval (I3-adjacent wiring gap)
// ---------------------------------------------------------------------------
test('P-05 retrieval honors promotion: approved node outranks candidate at equal confidence', async () => {
  const { pool, kg } = await freshGraph();
  const approvedId = await kg.addNode('event', 'drain cleaning approved record', {}, {
    namespace: 'tenant::t1',
    status: 'approved',
    confidence: 1.0,
    sourceEventId: 'evt-p5a',
  });
  const candidateId = await kg.addNode('event', 'drain cleaning candidate record', {}, {
    namespace: 'tenant::t1',
    status: 'candidate',
    confidence: 1.0, // producer-asserted; indistinguishable from approved without the boost
    confidenceProvenance: 'spine',
    sourceEventId: 'evt-p5b',
  });
  // Candidate is newer: pre-fix, the tie breaks toward the candidate.
  pool.nodes.get(candidateId).created_at = '2026-09-24T00:00:01.000Z';
  pool.nodes.get(approvedId).created_at = '2026-09-24T00:00:00.000Z';

  const evidence = new EvidenceAuthority({ pool: { query: async () => ({ rows: [] }) } });
  const hybrid = new HybridSearch({
    embeddingService: { search: async () => [] }, // KG leg only
    evidenceAuthority: evidence,
    knowledgeGraph: kg,
  });

  const { results } = await hybrid.search({ query: 'drain', namespace: 'tenant::t1', limit: 10 });
  assert.equal(results.length, 2);
  console.log(`    ATTACK: ranked order = ${results.map((r) => `${r.id.slice(0, 8)}:${r.status}@${r.rank_score}`).join(' > ')}`);
  assert.equal(results[0].id, approvedId, 'human-approved node must outrank an equal-confidence candidate');
});

// ---------------------------------------------------------------------------
// P-06: semantic leg is blind to lifecycle (M3 staleness)
// ---------------------------------------------------------------------------
test('P-06 vector payload: projected points carry lifecycle state (status/confidence)', async () => {
  const upserted = [];
  const fakeQdrant = {
    async upsert(collection, points) { upserted.push({ collection, points }); return true; },
    async ensureCollection() { return true; },
  };
  const fakeAI = { embed: async () => new Array(768).fill(0.1) };
  const es = new EmbeddingService({ aiRuntime: fakeAI, qdrantAdapter: fakeQdrant });

  await es.projectToQdrant(
    {
      id: 'evt-p6', kind: 'OBSERVATION_CREATED', namespace: 'tenant::t1',
      canonical_hash: 'abc123', payload: { text: 'drain cleaning' },
    },
    { sourceEventId: 'evt-p6', eventType: 'OBSERVATION_CREATED', namespace: 'tenant::t1', status: 'approved', confidence: 1.0 },
  );
  assert.equal(upserted.length, 1);
  const payload = upserted[0].points[0].payload;
  console.log(`    ATTACK: Qdrant payload keys = ${Object.keys(payload).join(',')}; status=${payload.status} confidence=${payload.confidence}`);
  assert.equal(payload.status, 'approved', 'projected payload must carry lifecycle status');
  assert.equal(payload.confidence, 1.0, 'projected payload must carry confidence');
});
