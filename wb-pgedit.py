import io

BASE = "/home/nolan/ping"

def edit(path, pairs):
    src = io.open(BASE + path, encoding="utf-8").read()
    for old, new in pairs:
        assert src.count(old) == 1, "anchor not unique/found in %s: %r" % (path, old[:90])
        src = src.replace(old, new, 1)
    io.open(BASE + path, "w", encoding="utf-8").write(src)
    print("edited", path)

# ----------------------- gateway/canonical_event_envelope.js
edit("/gateway/canonical_event_envelope.js", [
(
'''const crypto = require('crypto');
const path = require('path');
const { computeCanonicalHash } = require('../ping-runtime/authorities/constitutional_validation');
const { constitutionalTimeAuthority } = require('../ping-runtime/authorities/constitutional_time_authority.js');

class CanonicalEventEnvelope {''',
'''const crypto = require('crypto');
const path = require('path');
const { computeCanonicalHash } = require('../ping-runtime/authorities/constitutional_validation');
const { constitutionalTimeAuthority } = require('../ping-runtime/authorities/constitutional_time_authority.js');

/**
 * Canonical tenant identifier pattern, shared with the FYD journal gateway
 * and the FYD tenant context. Lowercase alnum + dash, 1-64 chars.
 * Tenant authority comes from the authenticated execution context; this
 * pattern rejects path-traversal / injection-shaped values at every seam.
 */
const TENANT_ID_PATTERN = /^[a-z0-9-]{1,64}$/;

class CanonicalEventEnvelope {'''),
(
'''    this._dependencies = ['storage'];
    this._authorityVersion = '1.0.0';
  }''',
'''    this._dependencies = ['storage'];
    this._authorityVersion = '1.0.0';
  }

  /**
   * Tenant gate: the contract invariant "tenant A cannot read tenant B
   * events" is enforced here, at the storage authority, not in callers.
   * Missing or malformed tenant context fails closed (throws) — it must
   * never degrade into an unscoped cross-tenant query.
   */
  _requireTenantId(tenantId) {
    if (typeof tenantId !== 'string' || !TENANT_ID_PATTERN.test(tenantId)) {
      throw new Error(
        'CanonicalEventEnvelope: valid tenantId is required (tenant isolation fail-closed)',
      );
    }
    return tenantId;
  }'''),
(
'''  async executeEmitEvent(command) {
    const {
      tenantId,
      eventType,
      source,
      actor,
      payload,
      causationId = null,
      correlationId = null,
      metadata = {}
    } = command;

    const sequence = await this.getNextSequence(tenantId);''',
'''  async executeEmitEvent(command) {
    const {
      tenantId,
      eventType,
      source,
      actor,
      payload,
      causationId = null,
      correlationId = null,
      metadata = {}
    } = command;

    // Fail closed before any I/O: a write without trusted tenant context
    // must never land in the store.
    this._requireTenantId(tenantId);

    const sequence = await this.getNextSequence(tenantId);'''),
(
'''  async executeQueryEvents({
    tenantId,
    eventType,
    correlationId,
    from,
    to,
    limit = 100,
    offset = 0,
  } = {}) {
    let query = 'SELECT * FROM canonical_events WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (tenantId) {
      query += ` AND tenant_id = $${paramIndex++}`;
      params.push(tenantId);
    }
''',
'''  async executeQueryEvents({
    tenantId,
    eventType,
    correlationId,
    from,
    to,
    limit = 100,
    offset = 0,
  } = {}) {
    // Fail closed: the contract invariant "tenant A cannot read tenant B
    // events" means an unscoped read is a defect, not a default.
    this._requireTenantId(tenantId);

    let query = 'SELECT * FROM canonical_events WHERE tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;
'''),
(
'''  async executeGetStats(tenantId) {
    let query = `
      SELECT 
        tenant_id,
        COUNT(*) as total_events,
        COUNT(DISTINCT event_type) as event_types,
        MIN(timestamp) as first_event,
        MAX(timestamp) as last_event,
        COUNT(CASE WHEN NOT processed THEN 1 END) as unprocessed
      FROM canonical_events`;
    
    const params = [];
    if (tenantId) {
      query += ' WHERE tenant_id = $1';
      params.push(tenantId);
    }
    
    query += ' GROUP BY tenant_id';
    
    const result = await this._storage.query(query, params);
    return result.rows;
  }''',
'''  async executeGetStats(tenantId) {
    // Fail closed: cross-tenant aggregates leak activity metadata.
    this._requireTenantId(tenantId);

    const query = `
      SELECT 
        tenant_id,
        COUNT(*) as total_events,
        COUNT(DISTINCT event_type) as event_types,
        MIN(timestamp) as first_event,
        MAX(timestamp) as last_event,
        COUNT(CASE WHEN NOT processed THEN 1 END) as unprocessed
      FROM canonical_events
      WHERE tenant_id = $1
      GROUP BY tenant_id`;
    
    const result = await this._storage.query(query, [tenantId]);
    return result.rows;
  }'''),
(
'''  async executeGetUnprocessed(tenantId, limit = 100) {
    const result = await this._storage.query(''',
'''  async executeGetUnprocessed(tenantId, limit = 100) {
    this._requireTenantId(tenantId);
    const result = await this._storage.query('''),
])

# ----------------------- gateway/routes/canonical_events.js
edit("/gateway/routes/canonical_events.js", [
(
'''    if (!tenant_id || !event_type || !source || !actor || !payload) {
      throw new Error('tenant_id, event_type, source, actor, and payload are required');
    }''',
'''    if (!tenant_id || !event_type || !source || !actor || !payload) {
      throw new Error('tenant_id, event_type, source, actor, and payload are required');
    }
    if (!/^[a-z0-9-]{1,64}$/.test(tenant_id)) {
      throw new Error('tenant_id is invalid (tenant isolation fail-closed)');
    }'''),
(
'''    const {
      tenant_id, event_type, correlation_id,
      from, to, limit, offset,
    } = req.query;

    const events = await canonicalEventEnvelope.executeQueryEvents({''',
'''    const {
      tenant_id, event_type, correlation_id,
      from, to, limit, offset,
    } = req.query;

    if (!tenant_id || !/^[a-z0-9-]{1,64}$/.test(tenant_id)) {
      throw new Error('tenant_id query param is required (tenant isolation fail-closed)');
    }

    const events = await canonicalEventEnvelope.executeQueryEvents({'''),
(
'''    const { tenant_id } = req.query;
    const stats = await canonicalEventEnvelope.executeGetStats(tenant_id);''',
'''    const { tenant_id } = req.query;
    if (!tenant_id || !/^[a-z0-9-]{1,64}$/.test(tenant_id)) {
      throw new Error('tenant_id query param is required (tenant isolation fail-closed)');
    }
    const stats = await canonicalEventEnvelope.executeGetStats(tenant_id);'''),
(
'''    const { tenant_id, limit } = req.query;
    if (!tenant_id) throw new Error('tenant_id is required');''',
'''    const { tenant_id, limit } = req.query;
    if (!tenant_id || !/^[a-z0-9-]{1,64}$/.test(tenant_id)) {
      throw new Error('tenant_id is required (tenant isolation fail-closed)');
    }'''),
])

print("ALL POSTGRES EDITS OK")
