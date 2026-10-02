/**
 * Knowledge Graph — PING Core v1
 * 
 * Postgres-backed knowledge store. Every project, customer, review, artifact
 * generates knowledge. Queries flow through here, not raw SQL.
 * 
 * This replaces 5+ dead knowledge implementations with one production store.
 *
 * [DOC-CONTRACT] Confidence semantics (mirrors spine contract — see
 * docs/P3_CONTRADICTION_CONVERGENCE_LEDGER.md audit C):
 *   - addNode's confidence column (`REAL DEFAULT 1.0`, line 34) is UNREACHABLE
 *     on the live path: every addNode INSERT provides confidence explicitly
 *     (`options.confidence != null ? options.confidence : null`), so the DB
 *     DEFAULT is never applied. The column default is therefore NOT a competing
 *     spine semantic.
 *   - NULL is preserved, not fabricated: an observation with no producer
 *     confidence stores NULL in the graph (null-preserving), matching the spine
 *     carry-verbatim contract. `confidence_provenance` records where the value
 *     came from.
 *   - The ONLY authorized recompute is human approval (KnowledgePromoter:
 *     SNIPPET_APPROVED/AI_RESPONSE_ACCEPTED → 1.0, rejected → 0.2) via
 *     updateNodeBySourceEvent — a lifecycle transition, never a data mutation.
 *   - Distinguish INFERENCE/MODEL provenance from canonical producer confidence:
 *     e.g. inference_adapter.js hardcodes `0.8` for AI/inference results — that
 *     is a model-provenance value (the model output's own confidence), NOT a
 *     canonical spine confidence. It must be tagged as such, never conflated
 *     with the producer-authored spine confidence.
 */

class KnowledgeGraph {
  /**
   * @param {object} options
   * @param {object} options.pool — pg.Pool
   */
  constructor(options = {}) {
    this._pool = options.pool || null;
  }

  /**
   * Initialize knowledge tables.
   */
  async initialize() {
    if (!this._pool) return;
    await this._pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_nodes (
        node_id VARCHAR(255) PRIMARY KEY,
        node_type VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id VARCHAR(255),
        label TEXT NOT NULL,
        data JSONB NOT NULL DEFAULT '{}',
        source_event_id VARCHAR(64),
        namespace VARCHAR(255) NOT NULL DEFAULT 'core::system',
        confidence REAL DEFAULT 1.0,
        status VARCHAR(50) NOT NULL DEFAULT 'candidate',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE knowledge_nodes ADD COLUMN IF NOT EXISTS namespace VARCHAR(255) NOT NULL DEFAULT 'core::system';
      ALTER TABLE knowledge_nodes ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'candidate';
      CREATE INDEX IF NOT EXISTS idx_kn_type ON knowledge_nodes(node_type);
      CREATE INDEX IF NOT EXISTS idx_kn_entity ON knowledge_nodes(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_kn_namespace ON knowledge_nodes(namespace);
      CREATE INDEX IF NOT EXISTS idx_kn_status ON knowledge_nodes(status);
      ALTER TABLE knowledge_nodes ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(64);
      ALTER TABLE knowledge_nodes ADD COLUMN IF NOT EXISTS confidence_provenance VARCHAR(50);
      CREATE INDEX IF NOT EXISTS idx_kn_correlation ON knowledge_nodes(correlation_id);

      CREATE TABLE IF NOT EXISTS knowledge_edges (
        edge_id VARCHAR(255) PRIMARY KEY,
        source_id VARCHAR(255) NOT NULL REFERENCES knowledge_nodes(node_id) ON DELETE CASCADE,
        target_id VARCHAR(255) NOT NULL REFERENCES knowledge_nodes(node_id) ON DELETE CASCADE,
        edge_type VARCHAR(100) NOT NULL,
        weight REAL DEFAULT 1.0,
        data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ke_source ON knowledge_edges(source_id);
      CREATE INDEX IF NOT EXISTS idx_ke_target ON knowledge_edges(target_id);
      CREATE INDEX IF NOT EXISTS idx_ke_type ON knowledge_edges(edge_type);
    `);
  }

  /**
   * Add a node to the knowledge graph.
   */
  async addNode(nodeType, label, data = {}, options = {}) {
    const crypto = require('crypto');
    const nodeId = options.nodeId || crypto.createHash('sha256')
      .update(`${nodeType}:${label}:${JSON.stringify(data)}`)
      .digest('hex').slice(0, 16);

    await this._pool.query(
      `INSERT INTO knowledge_nodes (node_id, node_type, entity_type, entity_id, label, data, source_event_id, namespace, confidence, status, correlation_id, confidence_provenance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       -- P0 FIX (swarm-05): re-emission must never demote lifecycle state.
       -- Status is owned exclusively by the promotion path (KnowledgePromoter
       -- via updateNodeBySourceEvent). addNode may refresh data on conflict,
       -- but must not regress an approved/rejected node back to candidate.
       ON CONFLICT (node_id) DO UPDATE SET data = $6, namespace = $8, correlation_id = $11, confidence_provenance = $12, updated_at = NOW()`,
      [nodeId, nodeType, options.entityType || null, options.entityId || null,
       label, JSON.stringify(data), options.sourceEventId || null,
       options.namespace || 'core::system', options.confidence != null ? options.confidence : null,
       options.status || 'candidate', options.correlationId || null,
       options.confidenceProvenance || null]
    );
    return nodeId;
  }

  /**
   * Update status/confidence on a node identified by its source event.
   * Promotion path (Phase F): SNIPPET_APPROVED / AI_RESPONSE_ACCEPTED move a
   * candidate to approved (confidence 1.0); rejection moves it to rejected.
   * Never rewrites data — ADD-only provenance; only lifecycle fields change.
   * @param {string} sourceEventId
   * @param {object} options — { status?, confidence?, namespace? (guard) }
   * @returns {Promise<boolean>} true when exactly one node was updated
   */
  async updateNodeBySourceEvent(sourceEventId, options = {}) {
    if (!sourceEventId) return false;
    const clause = ['source_event_id = $1'];
    const params = [sourceEventId];
    let idx = 2;
    if (options.namespace) {
      clause.push(`namespace = $${idx++}`);
      params.push(options.namespace);
    }
    const sets = [];
    if (typeof options.status === 'string') {
      sets.push(`status = $${idx++}`);
      params.push(options.status);
    }
    if (typeof options.confidence === 'number') {
      sets.push(`confidence = $${idx++}`);
      params.push(options.confidence);
    }
    if (sets.length === 0) return false;
    sets.push('updated_at = NOW()');
    const result = await this._pool.query(
      `UPDATE knowledge_nodes SET ${sets.join(', ')} WHERE ${clause.join(' AND ')}`,
      params
    );
    return result.rowCount === 1;
  }

  /**
   * Add an edge between two nodes.
   */
  async addEdge(sourceId, targetId, edgeType, data = {}, weight = 1.0) {
    const crypto = require('crypto');
    const edgeId = crypto.createHash('sha256')
      .update(`${sourceId}:${targetId}:${edgeType}`)
      .digest('hex').slice(0, 16);

    await this._pool.query(
      `INSERT INTO knowledge_edges (edge_id, source_id, target_id, edge_type, weight, data)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (edge_id) DO NOTHING`,
      [edgeId, sourceId, targetId, edgeType, weight, JSON.stringify(data)]
    );
    return edgeId;
  }

  /**
   * Query nodes by type or entity.
   */
  async queryNodes(options = {}) {
    let sql = 'SELECT * FROM knowledge_nodes WHERE 1=1';
    const params = [];
    let idx = 1;

    if (options.nodeType) {
      sql += ` AND node_type = $${idx++}`;
      params.push(options.nodeType);
    }
    if (options.entityType) {
      sql += ` AND entity_type = $${idx++}`;
      params.push(options.entityType);
    }
    if (options.entityId) {
      sql += ` AND entity_id = $${idx++}`;
      params.push(options.entityId);
    }
    if (options.namespace) {
      sql += ` AND namespace = $${idx++}`;
      params.push(options.namespace);
    }
    if (options.status) {
      sql += ` AND status = $${idx++}`;
      params.push(options.status);
    }
    if (options.search) {
      sql += ` AND (label ILIKE $${idx} OR data::text ILIKE $${idx})`;
      params.push(`%${options.search}%`);
      idx++;
    }

    sql += ' ORDER BY created_at DESC';
    if (options.limit) {
      sql += ` LIMIT $${idx++}`;
      params.push(options.limit);
    }

    const result = await this._pool.query(sql, params);
    return result.rows;
  }

  /**
   * Get neighborhood — nodes connected to a given node.
   */
  async getNeighborhood(nodeId, depth = 1) {
    const visited = new Set();
    const nodes = new Map();
    const edges = [];

    const queue = [{ id: nodeId, depth: 0 }];
    while (queue.length > 0) {
      const { id, depth: d } = queue.shift();
      if (visited.has(id) || d > depth) continue;
      visited.add(id);

      // Get node
      const nodeResult = await this._pool.query('SELECT * FROM knowledge_nodes WHERE node_id = $1', [id]);
      if (nodeResult.rows.length > 0) {
        nodes.set(id, nodeResult.rows[0]);
      }

      // Get edges (outgoing + incoming)
      const edgeResult = await this._pool.query(
        `SELECT * FROM knowledge_edges WHERE source_id = $1 OR target_id = $1`,
        [id]
      );
      for (const edge of edgeResult.rows) {
        edges.push(edge);
        const nextId = edge.source_id === id ? edge.target_id : edge.source_id;
        if (!visited.has(nextId)) {
          queue.push({ id: nextId, depth: d + 1 });
        }
      }
    }

    return { nodes: Array.from(nodes.values()), edges };
  }

  /**
   * Get stats.
   */
  async getStats() {
    const nodes = await this._pool.query('SELECT COUNT(*) as count FROM knowledge_nodes');
    const edges = await this._pool.query('SELECT COUNT(*) as count FROM knowledge_edges');
    const types = await this._pool.query('SELECT node_type, COUNT(*) as count FROM knowledge_nodes GROUP BY node_type');
    return {
      nodes: parseInt(nodes.rows[0].count),
      edges: parseInt(edges.rows[0].count),
      nodeTypes: types.rows,
    };
  }
}

module.exports = { KnowledgeGraph };
