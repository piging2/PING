/**
 * Project Authority — Aggregate Root
 *
 * HPP business authority for Project management.
 * Project is the central aggregate: everything hangs off it.
 *
 * Owns: Estimate, Schedule, Photos, Materials, Crew, Reviews,
 *       Portfolio, Artifacts, Knowledge, Communications.
 *
 * Constitutional Constraint:
 *   - Authority operations, not CRUD
 *   - All DB access via this._storage (PostgresAdapter)
 *   - No direct pool.query()
 *   - Events emitted via ProducerEventPort (Phase 7 migration seam:
 *     producer call shape preserved; authority behind the call is the
 *     converged event path, not the envelope receipt surface)
 *   - Every table has tenant_id column
 *   - Deterministic behavior
 */

const crypto = require('crypto');

const PROJECT_TABLE = 'hpp_projects';
const PROJECT_SCHEMA = `
  CREATE TABLE IF NOT EXISTS ${PROJECT_TABLE} (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'hpp',
    customer_id TEXT,
    project_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'lead',
    priority INTEGER DEFAULT 0,
    estimate_amount REAL,
    estimate_currency TEXT DEFAULT 'USD',
    estimate_sent_at TIMESTAMPTZ,
    estimate_approved_at TIMESTAMPTZ,
    scheduled_start DATE,
    scheduled_end DATE,
    actual_start DATE,
    actual_end DATE,
    crew_size INTEGER,
    materials JSONB DEFAULT '[]',
    photos_before JSONB DEFAULT '[]',
    photos_after JSONB DEFAULT '[]',
    review_id TEXT,
    review_requested_at TIMESTAMPTZ,
    review_submitted_at TIMESTAMPTZ,
    portfolio_eligible BOOLEAN DEFAULT FALSE,
    portfolio_published_at TIMESTAMPTZ,
    tags JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_hpp_projects_tenant ON ${PROJECT_TABLE} (tenant_id);
  CREATE INDEX IF NOT EXISTS idx_hpp_projects_customer ON ${PROJECT_TABLE} (tenant_id, customer_id);
  CREATE INDEX IF NOT EXISTS idx_hpp_projects_status ON ${PROJECT_TABLE} (tenant_id, status);
  CREATE INDEX IF NOT EXISTS idx_hpp_projects_type ON ${PROJECT_TABLE} (tenant_id, project_type);
`;

const PROJECT_ARTIFACTS_TABLE = 'hpp_project_artifacts';
const PROJECT_ARTIFACTS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS ${PROJECT_ARTIFACTS_TABLE} (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'hpp',
    project_id TEXT NOT NULL,
    artifact_type TEXT NOT NULL,
    title TEXT NOT NULL,
    file_url TEXT,
    file_size INTEGER,
    mime_type TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_hpp_project_artifacts_project ON ${PROJECT_ARTIFACTS_TABLE} (tenant_id, project_id);
`;

class ProjectAuthority {
  /**
   * @param {Object} storage - PostgresAdapter
   * @param {Object} eventPort - ProducerEventPort (Phase 7 migration seam)
   */
  constructor(storage, eventPort) {
    this._storage = storage;
    this._eventPort = eventPort;
    this._dependencies = ['storage', 'producerEventPort'];
    this._authorityVersion = '1.0.0';
  }

  get dependencies() {
    return this._dependencies;
  }

  async initialize() {
    await this._storage.query(PROJECT_SCHEMA);
    await this._storage.query(PROJECT_ARTIFACTS_SCHEMA);
    console.log('[ProjectAuthority] Tables initialized');
  }

  _computeId(tenantId, title, projectType) {
    return crypto.createHash('sha256')
      .update(`${tenantId}:${title}:${projectType}`)
      .digest('hex')
      .slice(0, 16);
  }

  async executeCreateProject(command) {
    const {
      tenantId = 'hpp',
      customerId,
      projectType,
      title,
      description,
      status = 'lead',
      priority = 0,
      estimateAmount,
      scheduledStart,
      scheduledEnd,
      crewSize,
      tags = [],
      metadata = {},
    } = command;

    if (!projectType) throw new Error('projectType is required');
    if (!title) throw new Error('title is required');

    const id = `proj_${this._computeId(tenantId, title, projectType)}`;

    await this._storage.query(
      `INSERT INTO ${PROJECT_TABLE}
        (id, tenant_id, customer_id, project_type, title, description,
         status, priority, estimate_amount, scheduled_start, scheduled_end,
         crew_size, tags, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO UPDATE SET
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        priority = EXCLUDED.priority,
        estimate_amount = EXCLUDED.estimate_amount,
        scheduled_start = EXCLUDED.scheduled_start,
        scheduled_end = EXCLUDED.scheduled_end,
        crew_size = EXCLUDED.crew_size,
        tags = EXCLUDED.tags,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()`,
      [id, tenantId, customerId || null, projectType, title, description || null,
       status, priority, estimateAmount || null, scheduledStart || null,
       scheduledEnd || null, crewSize || null, JSON.stringify(tags), JSON.stringify(metadata)],
    );

    // Phase 7: project.created maps to the registered canonical type
    // PROJECT_CREATED (registry authority_owner: ProjectAuthority). The port
    // accepts it directly through UnifiedEventRuntime; the original dotted
    // spelling is preserved in metadata.producer_event_type.
    await this._eventPort.emitProducerEvent({
      tenantId,
      eventType: 'project.created',
      source: 'project-authority',
      actor: 'system',
      payload: { projectId: id, projectType, title, status },
      metadata: { authority: 'project-authority', version: this._authorityVersion },
    });

    return { id, projectType, title, status };
  }

  async executeUpdateProject(command) {
    const { tenantId = 'hpp', projectId, ...updates } = command;
    if (!projectId) throw new Error('projectId is required');

    const setClauses = [];
    const values = [tenantId, projectId];
    let paramIdx = 3;

    const allowedFields = [
      'customer_id', 'project_type', 'title', 'description', 'status',
      'priority', 'estimate_amount', 'estimate_sent_at', 'estimate_approved_at',
      'scheduled_start', 'scheduled_end', 'actual_start', 'actual_end',
      'crew_size', 'materials', 'photos_before', 'photos_after',
      'review_id', 'review_requested_at', 'review_submitted_at',
      'portfolio_eligible', 'portfolio_published_at', 'tags', 'metadata',
    ];

    for (const [key, value] of Object.entries(updates)) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(col)) {
        setClauses.push(`${col} = $${paramIdx}`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        paramIdx++;
      }
    }

    if (setClauses.length === 0) return { projectId, updated: false };

    setClauses.push('updated_at = NOW()');
    await this._storage.query(
      `UPDATE ${PROJECT_TABLE} SET ${setClauses.join(', ')}
       WHERE tenant_id = $1 AND id = $2`,
      values,
    );

    // Phase 7: project.updated maps to the registered canonical type
    // PROJECT_UPDATED (registry authority_owner: ProjectAuthority).
    await this._eventPort.emitProducerEvent({
      tenantId,
      eventType: 'project.updated',
      source: 'project-authority',
      actor: 'system',
      payload: { projectId, updatedFields: Object.keys(updates) },
      metadata: { authority: 'project-authority', version: this._authorityVersion },
    });

    return { projectId, updated: true };
  }

  async executeResolveProject(command) {
    const { tenantId = 'hpp', projectId } = command;
    if (!projectId) throw new Error('projectId is required');

    const result = await this._storage.query(
      `SELECT * FROM ${PROJECT_TABLE} WHERE tenant_id = $1 AND id = $2`,
      [tenantId, projectId],
    );

    return result.rows[0] || null;
  }

  async executeListProjects(command) {
    const { tenantId = 'hpp', status, projectType, customerId, limit = 50, offset = 0 } = command;

    const conditions = ['tenant_id = $1'];
    const values = [tenantId];
    let paramIdx = 2;

    if (status) {
      conditions.push(`status = $${paramIdx}`);
      values.push(status);
      paramIdx++;
    }
    if (projectType) {
      conditions.push(`project_type = $${paramIdx}`);
      values.push(projectType);
      paramIdx++;
    }
    if (customerId) {
      conditions.push(`customer_id = $${paramIdx}`);
      values.push(customerId);
      paramIdx++;
    }

    const result = await this._storage.query(
      `SELECT * FROM ${PROJECT_TABLE}
       WHERE ${conditions.join(' AND ')}
       ORDER BY updated_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...values, limit, offset],
    );

    return result.rows;
  }

  async executeGetProjectStats(command) {
    const { tenantId = 'hpp' } = command;

    const result = await this._storage.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'lead') as leads,
         COUNT(*) FILTER (WHERE status = 'estimate') as estimates,
         COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
         COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status = 'review_requested') as review_requested,
         COUNT(*) FILTER (WHERE status = 'portfolio') as portfolio,
         SUM(estimate_amount) FILTER (WHERE estimate_amount IS NOT NULL) as total_revenue,
         AVG(estimate_amount) FILTER (WHERE estimate_amount IS NOT NULL) as avg_estimate
       FROM ${PROJECT_TABLE}
       WHERE tenant_id = $1`,
      [tenantId],
    );

    return result.rows[0];
  }

  async executeAddArtifact(command) {
    const { tenantId = 'hpp', projectId, artifactType, title, fileUrl, fileSize, mimeType, metadata = {} } = command;
    if (!projectId) throw new Error('projectId is required');
    if (!artifactType) throw new Error('artifactType is required');
    if (!title) throw new Error('title is required');

    const id = `art_${crypto.createHash('sha256')
      .update(`${tenantId}:${projectId}:${artifactType}:${title}`)
      .digest('hex')
      .slice(0, 16)}`;

    await this._storage.query(
      `INSERT INTO ${PROJECT_ARTIFACTS_TABLE}
        (id, tenant_id, project_id, artifact_type, title, file_url, file_size, mime_type, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
        file_url = EXCLUDED.file_url,
        file_size = EXCLUDED.file_size,
        metadata = EXCLUDED.metadata`,
      [id, tenantId, projectId, artifactType, title, fileUrl || null,
       fileSize || null, mimeType || null, JSON.stringify(metadata)],
    );

    // Phase 7: project.artifact_added is a domain envelope type (unregistered;
    // no semantic equivalent in the governance registry). The port receipts it
    // with explicit receipt semantics; acceptance is UnifiedEventRuntime's
    // via the allowlisted LegacyIngressAdapter.
    await this._eventPort.emitProducerEvent({
      tenantId,
      eventType: 'project.artifact_added',
      source: 'project-authority',
      actor: 'system',
      payload: { projectId, artifactId: id, artifactType, title },
      metadata: { authority: 'project-authority', version: this._authorityVersion },
    });

    return { id, artifactType, title };
  }

  async executeListArtifacts(command) {
    const { tenantId = 'hpp', projectId } = command;
    if (!projectId) throw new Error('projectId is required');

    const result = await this._storage.query(
      `SELECT * FROM ${PROJECT_ARTIFACTS_TABLE}
       WHERE tenant_id = $1 AND project_id = $2
       ORDER BY created_at DESC`,
      [tenantId, projectId],
    );

    return result.rows;
  }
}

module.exports = { ProjectAuthority };
