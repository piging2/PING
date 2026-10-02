/**
 * AI Workspace Authority — Per-Project Intelligence
 *
 * HPP authority for project-level AI capabilities.
 * Manages sentiment analysis, content tagging, document parsing,
 * translation, and summarization scoped to individual projects.
 *
 * Constitutional Constraint:
 *   - Authority operations, not CRUD
 *   - All DB access via this._storage (PostgresAdapter)
 *   - No direct pool.query()
 *   - Events emitted via ProducerEventPort (Phase 7 migration seam;
 *     repaired writer: the legacy-shaped call threw on every invocation)
 *   - Every table has tenant_id column
 *   - Deterministic behavior
 */

const crypto = require('crypto');

const AI_WORKSPACE_TABLE = 'ai_workspace_results';
const AI_WORKSPACE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS ${AI_WORKSPACE_TABLE} (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'hpp',
    project_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    input_hash TEXT NOT NULL,
    result JSONB NOT NULL,
    model TEXT,
    confidence REAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_ai_workspace_project ON ${AI_WORKSPACE_TABLE} (tenant_id, project_id);
  CREATE INDEX IF NOT EXISTS idx_ai_workspace_operation ON ${AI_WORKSPACE_TABLE} (tenant_id, operation);
`;

class AIWorkspaceAuthority {
  constructor(storage, huggingfaceAdapter, eventPort) {
    this._storage = storage;
    this._hf = huggingfaceAdapter;
    this._eventPort = eventPort;
    this._dependencies = ['storage', 'huggingfaceAdapter', 'producerEventPort'];
    this._authorityVersion = '1.0.0';
  }

  get dependencies() {
    return this._dependencies;
  }

  /**
   * Initialize database tables
   */
  async initialize() {
    await this._storage.query(AI_WORKSPACE_SCHEMA);
    console.log('[AIWorkspaceAuthority] Tables initialized');
  }

  /**
   * Deterministic ID from tenant + project + operation + input hash
   */
  _computeId(tenantId, projectId, operation, inputHash) {
    return crypto.createHash('sha256')
      .update(`${tenantId}:${projectId}:${operation}:${inputHash}`)
      .digest('hex')
      .slice(0, 32);
  }

  _hashInput(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Persist result and emit event
   */
  async _persist(tenantId, projectId, operation, inputText, result) {
    const inputHash = this._hashInput(inputText);
    const id = this._computeId(tenantId, projectId, operation, inputHash);
    const confidence = result.confidence || null;

    await this._storage.query(
      `INSERT INTO ${AI_WORKSPACE_TABLE}
       (id, tenant_id, project_id, operation, input_hash, result, model, confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET result = EXCLUDED.result, confidence = EXCLUDED.confidence`,
      [id, tenantId, projectId, operation, inputHash, JSON.stringify(result), result.model || null, confidence]
    );

    // Phase 7: repaired writer. The previous legacy-shaped call
    // (aggregateId / aggregateType / eventData / authority) threw on every
    // invocation at executeValidateEvent, so this authority never emitted.
    // The port takes the preserved producer call shape.
    // AI_WORKSPACE_RESULT_CREATED is a domain envelope type (unregistered;
    // no semantic equivalent in the governance registry): receipt with
    // explicit receipt semantics; acceptance via the allowlisted
    // LegacyIngressAdapter.
    if (this._eventPort) {
      await this._eventPort.emitProducerEvent({
        tenantId,
        eventType: 'AI_WORKSPACE_RESULT_CREATED',
        source: 'ai-workspace-authority',
        actor: 'system',
        payload: { projectId, operation, resultId: id, model: result.model, confidence },
        metadata: { authority: 'ai_workspace', version: this._authorityVersion },
      });
    }

    return id;
  }

  /**
   * ExecuteAnalyzeSentimentCommand — Analyze sentiment for a project review
   *
   * @param {Object} command
   * @param {string} command.projectId
   * @param {string} command.text
   * @param {string} [command.tenantId='hpp']
   * @returns {Promise<Object>} persisted result
   */
  async executeAnalyzeSentiment({ projectId, text, tenantId = 'hpp' } = {}) {
    if (!projectId) throw new Error('projectId is required');
    if (!text) throw new Error('text is required');

    const sentiment = await this._hf.executeSentiment({ text, tenantId });
    const resultId = await this._persist(tenantId, projectId, 'sentiment', text, sentiment);

    return { resultId, projectId, ...sentiment };
  }

  /**
   * ExecuteTagContentCommand — Zero-shot classify project content
   *
   * @param {Object} command
   * @param {string} command.projectId
   * @param {string} command.text
   * @param {string[]} command.labels
   * @param {string} [command.tenantId='hpp']
   * @returns {Promise<Object>} persisted result
   */
  async executeTagContent({ projectId, text, labels, tenantId = 'hpp' } = {}) {
    if (!projectId) throw new Error('projectId is required');
    if (!text) throw new Error('text is required');
    if (!labels || !labels.length) throw new Error('labels array is required');

    const classification = await this._hf.executeClassify({ text, labels, tenantId });
    const resultId = await this._persist(tenantId, projectId, 'tagging', text, classification);

    return { resultId, projectId, ...classification };
  }

  /**
   * ExecuteParseDocumentCommand — Parse invoice or estimate document
   *
   * @param {Object} command
   * @param {string} command.projectId
   * @param {string} command.input - Base64 image or text
   * @param {string} [command.tenantId='hpp']
   * @returns {Promise<Object>} persisted result
   */
  async executeParseDocument({ projectId, input, tenantId = 'hpp' } = {}) {
    if (!projectId) throw new Error('projectId is required');
    if (!input) throw new Error('input is required');

    const parsed = await this._hf.executeParseInvoice({ input, tenantId });
    const resultId = await this._persist(tenantId, projectId, 'document_parse', input, parsed);

    return { resultId, projectId, ...parsed };
  }

  /**
   * ExecuteTranslateCommand — Translate project communication
   *
   * @param {Object} command
   * @param {string} command.projectId
   * @param {string} command.text
   * @param {'en-to-es'|'es-to-en'} [command.direction='en-to-es']
   * @param {string} [command.tenantId='hpp']
   * @returns {Promise<Object>} persisted result
   */
  async executeTranslate({ projectId, text, direction = 'en-to-es', tenantId = 'hpp' } = {}) {
    if (!projectId) throw new Error('projectId is required');
    if (!text) throw new Error('text is required');

    const translated = await this._hf.executeTranslate({ text, direction, tenantId });
    const resultId = await this._persist(tenantId, projectId, 'translation', text, translated);

    return { resultId, projectId, ...translated };
  }

  /**
   * ExecuteSummarizeCommand — Summarize project updates or notes
   *
   * @param {Object} command
   * @param {string} command.projectId
   * @param {string} command.text
   * @param {number} [command.maxLength=150]
   * @param {string} [command.tenantId='hpp']
   * @returns {Promise<Object>} persisted result
   */
  async executeSummarize({ projectId, text, maxLength = 150, tenantId = 'hpp' } = {}) {
    if (!projectId) throw new Error('projectId is required');
    if (!text) throw new Error('text is required');

    const summary = await this._hf.executeSummarize({ text, maxLength, tenantId });
    const resultId = await this._persist(tenantId, projectId, 'summarization', text, summary);

    return { resultId, projectId, ...summary };
  }

  /**
   * ExecuteGetProjectResultsCommand — Retrieve all AI results for a project
   *
   * @param {Object} command
   * @param {string} command.projectId
   * @param {string} [command.operation] - Filter by operation type
   * @param {number} [command.limit=50]
   * @param {string} [command.tenantId='hpp']
   * @returns {Promise<Object>}
   */
  async executeGetProjectResults({ projectId, operation, limit = 50, tenantId = 'hpp' } = {}) {
    if (!projectId) throw new Error('projectId is required');

    let sql = `SELECT * FROM ${AI_WORKSPACE_TABLE} WHERE tenant_id = $1 AND project_id = $2`;
    const params = [tenantId, projectId];

    if (operation) {
      sql += ` AND operation = $3`;
      params.push(operation);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const { rows } = await this._storage.query(sql, params);

    return {
      projectId,
      tenantId,
      results: rows.map(r => ({
        id: r.id,
        operation: r.operation,
        result: r.result,
        model: r.model,
        confidence: r.confidence,
        createdAt: r.created_at,
      })),
      count: rows.length,
    };
  }

  /**
   * ExecuteGetWorkspaceStatsCommand — Aggregate stats for a project's AI usage
   *
   * @param {Object} command
   * @param {string} command.projectId
   * @param {string} [command.tenantId='hpp']
   * @returns {Promise<Object>}
   */
  async executeGetWorkspaceStats({ projectId, tenantId = 'hpp' } = {}) {
    if (!projectId) throw new Error('projectId is required');

    const { rows } = await this._storage.query(
      `SELECT operation, COUNT(*) as count, AVG(confidence) as avg_confidence
       FROM ${AI_WORKSPACE_TABLE}
       WHERE tenant_id = $1 AND project_id = $2
       GROUP BY operation
       ORDER BY count DESC`,
      [tenantId, projectId]
    );

    const totalResult = await this._storage.query(
      `SELECT COUNT(*) as total FROM ${AI_WORKSPACE_TABLE}
       WHERE tenant_id = $1 AND project_id = $2`,
      [tenantId, projectId]
    );

    return {
      projectId,
      tenantId,
      totalResults: parseInt(totalResult.rows[0]?.total || '0'),
      byOperation: rows.map(r => ({
        operation: r.operation,
        count: parseInt(r.count),
        avgConfidence: parseFloat(r.avg_confidence) || 0,
      })),
    };
  }
}

module.exports = { AIWorkspaceAuthority };
