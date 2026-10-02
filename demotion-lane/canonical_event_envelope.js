/**
 * Canonical Event Envelope Producer (ingress surface)
 *
 * P001: The standardized event envelope for all TenantOS ingress events.
 *
 * Every tenant (HPP, future) emits events through this envelope.
 * PING observes events through this envelope.
 * No business logic lives in this producer.
 *
 * DEMOTION (2026-09-19, event-authority convergence): this module is an
 * ingress envelope producer, NOT an event authority. It lost three
 * independent decisions it previously made:
 *   - independent UUIDv5 identity minting (identity belongs to
 *     IdentityAuthority; canonical identity is minted only by the
 *     UnifiedEventRuntime at acceptance);
 *   - MAX(sequence)+1 as a canonical ordering claim (ordering belongs to
 *     the Postgres sequence assigned at UER acceptance);
 *   - unconditional 'ok' acceptance (acceptance belongs to the UER).
 * It keeps: envelope construction, ingress shaping, input validation,
 * the canonical_events ingress-surface writes, and the read/disposition
 * surface (query, stats, unprocessed, mark processed/failed).
 *
 * How acceptance works now: executeEmitEvent writes an ingress RECEIPT to
 * canonical_events with accepted=false. The receipt id is a random UUIDv4:
 * an ingress-surface receipt identifier, explicitly NOT a canonical event
 * identity. The LegacyIngressAdapter converges unprocessed ingress rows
 * into the UnifiedEventRuntime, which alone accepts (validates, governs,
 * mints identity, persists to ping_events, assigns canonical sequence).
 *
 * Standing distinctions honored: envelope_id != canonical event_id;
 * receipt_order != canonical event sequence; receipt timestamp !=
 * constitutional acceptance timestamp.
 *
 * Historical canonical_events rows (deterministic UUIDv5 ids) are preserved
 * untouched. No ID rewrites, no deletions.
 */

const crypto = require('crypto');
const path = require('path');
const { computeCanonicalHash } = require('../ping-runtime/authorities/constitutional_validation');
const { constitutionalTimeAuthority } = require('../ping-runtime/authorities/constitutional_time_authority.js');

// Bounded attempts for the ingress receipt serial race. Two concurrent
// receipts for one tenant can read the same MAX(serial)+1; the loser
// retries with a fresh serial instead of being silently dropped.
const MAX_RECEIPT_ATTEMPTS = 3;

function receiptConflictError(tenantId) {
  const err = new Error(
    `[CanonicalEventEnvelope] ingress receipt order conflict for tenant '${tenantId}': ` +
    `concurrent receipt serial race exhausted after ${MAX_RECEIPT_ATTEMPTS} attempts; ` +
    `refusing to silently drop the ingress envelope (fail-closed)`
  );
  err.code = 'INGRESS_RECEIPT_CONFLICT';
  return err;
}

class CanonicalEventEnvelope {
  constructor(storage, options = {}) {
    this._storage = storage;
    this._repoRoot = options.repoRoot || path.resolve(__dirname, '..');
    this._sequences = new Map();
    this._dependencies = ['storage'];
    this._authorityVersion = '2.0.0';
  }

  /**
   * Declare dependencies for computed startup ordering
   *
   * @returns {string[]} Required service names
   */
  get dependencies() {
    return this._dependencies;
  }

  /**
   * Initialize tables
   */
  async initialize() {
    const fs = require('fs');
    const schemaPath = path.join(this._repoRoot, 'database', 'canonical_events.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await this._storage.query(schema);
    console.log('[CanonicalEventEnvelope] Tables initialized');
  }

  /**
   * Canonicalize event ID to URI format
   *
   * LEGACY helper: preserved for archaeology. It formats an identifier as a
   * URI; it does not confer canonical event identity.
   *
   * @param {string} eventId - Raw event ID
   * @returns {string} Canonical URI
   */
  canonicalizeId(eventId) {
    if (eventId.startsWith('event://')) return eventId;
    return `event://${eventId}`;
  }

  /**
   * Generate deterministic event ID
   *
   * @deprecated Historical deterministic ingress ID derivation (UUIDv5).
   * Preserved for archaeology and existing tests. MUST NOT be used to claim
   * canonical event identity: IdentityAuthority (via the UnifiedEventRuntime)
   * is the sole minter of canonical event identities. New ingress receipts
   * use random UUIDv4 receipt identifiers (see executeEmitEvent).
   *
   * @param {string} tenantId
   * @param {string} eventType
   * @param {string} timestamp
   * @param {number} sequence
   * @returns {string} UUID v5
   */
  generateEventId(tenantId, eventType, timestamp, sequence) {
    const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // UUID v5 DNS namespace
    const name = `${tenantId}:${eventType}:${timestamp}:${sequence}`;

    // Deterministic UUID v5
    const hash = crypto.createHash('sha1')
      .update(namespace.replace(/-/g, ''), 'hex')
      .update(name)
      .digest();

    hash[6] = (hash[6] & 0x0f) | 0x50; // Version 5
    hash[8] = (hash[8] & 0x3f) | 0x80; // Variant 10

    return [
      hash.slice(0, 4).toString('hex'),
      hash.slice(4, 6).toString('hex'),
      hash.slice(6, 8).toString('hex'),
      hash.slice(8, 10).toString('hex'),
      hash.slice(10, 16).toString('hex'),
    ].join('-');
  }

  /**
   * Get next receipt serial for tenant
   *
   * Ingress-local receipt serial for bookkeeping only. This is NOT canonical
   * event ordering: canonical ordering is the Postgres sequence assigned by
   * the UnifiedEventRuntime at acceptance. The serial exists to satisfy the
   * UNIQUE(tenant_id, sequence) ingress-surface constraint and to give the
   * ingress listing a stable local order.
   *
   * @param {string} tenantId
   * @returns {number}
   */
  async getNextReceiptOrder(tenantId) {
    const result = await this._storage.query(
      `SELECT COALESCE(MAX(sequence), 0) + 1 as next_seq
       FROM canonical_events
       WHERE tenant_id = $1`,
      [tenantId]
    );
    return parseInt(result.rows[0].next_seq);
  }

  /**
   * @deprecated Use getNextReceiptOrder. Kept as an alias so existing
   * callers do not break; it carries no canonical ordering claim.
   */
  async getNextSequence(tenantId) {
    return this.getNextReceiptOrder(tenantId);
  }

  /**
   * Execute EmitEventCommand
   *
   * Produces an ingress envelope receipt and persists it to the
   * canonical_events ingress surface. This method NEVER claims acceptance:
   * the returned receipt carries accepted=false. Acceptance belongs to the
   * UnifiedEventRuntime, reached via LegacyIngressAdapter convergence of
   * unprocessed ingress rows.
   *
   * A receipt-order race (two concurrent receipts reading the same
   * MAX(serial)+1) is retried with a fresh serial up to
   * MAX_RECEIPT_ATTEMPTS; exhaustion throws INGRESS_RECEIPT_CONFLICT
   * instead of silently dropping the envelope.
   *
   * @param {Object} command
   * @param {string} command.tenantId - Tenant identifier
   * @param {string} command.eventType - Event type (e.g., "estimate.submitted")
   * @param {string} command.source - Source service (e.g., "hpp-api")
   * @param {string} command.actor - Actor (user ID or "system")
   * @param {Object} command.payload - Event payload
   * @param {string} [command.causationId] - Event that caused this
   * @param {string} [command.correlationId] - Business transaction ID
   * @param {Object} [command.metadata] - Additional metadata
   * @returns {Object} Ingress receipt (accepted=false)
   */
  async executeEmitEvent(command) {
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

    // The receipt id is a random UUIDv4: an ingress-surface receipt
    // identifier. It is NOT a canonical event identity and MUST NOT be
    // treated as one. The canonical event_id is minted by IdentityAuthority
    // when the UER accepts this ingress row at convergence.
    const receiptId = crypto.randomUUID();
    const receiptTimestamp = constitutionalTimeAuthority.nowAsISOString();

    const receipt = {
      event_id: receiptId,
      event_type: eventType,
      event_version: '1.0.0',
      tenant_id: tenantId,
      timestamp: receiptTimestamp,
      sequence: null,
      source,
      actor,
      causation_id: causationId,
      correlation_id: correlationId,
      payload,
      metadata: {
        ...metadata,
        ingress_receipt: {
          producer: 'canonical-event-envelope',
          producer_version: this._authorityVersion,
          acceptance: 'pending',
          accepted_by: 'unified_event_runtime',
          convergence: 'legacy_ingress_adapter',
        },
        created_at: receiptTimestamp,
      },
      processed: false,
      processed_at: null,
      worker: null,
      retries: 0,
      last_error: null,
      created_at: receiptTimestamp,
      // Explicit non-acceptance: acceptance belongs to the UER.
      accepted: false,
    };

    // Persist the receipt. Row-shape access is defensive: mock storages in
    // tests may return rows without rowCount.
    let persisted = false;
    for (let attempt = 1; attempt <= MAX_RECEIPT_ATTEMPTS && !persisted; attempt++) {
      receipt.sequence = await this.getNextReceiptOrder(tenantId);

      // Validate
      const validation = this.executeValidateEvent(receipt);
      if (!validation.valid) {
        throw new Error(`Invalid event: ${validation.errors.join(', ')}`);
      }

      const result = await this._storage.query(
        `INSERT INTO canonical_events
         (event_id, event_type, event_version, tenant_id, timestamp, sequence,
          source, actor, causation_id, correlation_id, payload, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (tenant_id, sequence) DO NOTHING`,
        [
          receipt.event_id, receipt.event_type, receipt.event_version, receipt.tenant_id,
          receipt.timestamp, receipt.sequence, receipt.source, receipt.actor,
          receipt.causation_id, receipt.correlation_id,
          JSON.stringify(receipt.payload), JSON.stringify(receipt.metadata),
        ]
      );
      persisted = (result.rowCount || 0) > 0 || (result.rows && result.rows.length > 0);
    }

    if (!persisted) {
      throw receiptConflictError(tenantId);
    }

    return receipt;
  }

  /**
   * Execute ValidateEventQuery
   *
   * @param {Object} event
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  executeValidateEvent(event) {
    const errors = [];

    if (!event.event_id) errors.push('event_id required');
    if (!event.event_type) errors.push('event_type required');
    if (!event.event_version) errors.push('event_version required');
    if (!event.tenant_id) errors.push('tenant_id required');
    if (!event.timestamp) errors.push('timestamp required');
    if (event.sequence === undefined || event.sequence === null) errors.push('sequence required');
    if (!event.source) errors.push('source required');
    if (!event.actor) errors.push('actor required');
    if (!event.payload) errors.push('payload required');

    return { valid: errors.length === 0, errors };
  }

  /**
   * Execute QueryEventsQuery
   *
   * @param {Object} params
   * @param {string} [params.tenantId] - Filter by tenant
   * @param {string} [params.eventType] - Filter by event type
   * @param {string} [params.correlationId] - Filter by correlation ID
   * @param {string} [params.from] - Start timestamp
   * @param {string} [params.to] - End timestamp
   * @param {number} [params.limit] - Max results
   * @param {number} [params.offset] - Skip results
   * @returns {Object[]} Events
   */
  async executeQueryEvents({
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

    if (eventType) {
      query += ` AND event_type = $${paramIndex++}`;
      params.push(eventType);
    }

    if (correlationId) {
      query += ` AND correlation_id = $${paramIndex++}`;
      params.push(correlationId);
    }

    if (from) {
      query += ` AND timestamp >= $${paramIndex++}`;
      params.push(from);
    }

    if (to) {
      query += ` AND timestamp <= $${paramIndex++}`;
      params.push(to);
    }

    query += ` ORDER BY tenant_id, sequence ASC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await this._storage.query(query, params);
    return result.rows;
  }

  /**
   * Execute GetEventStatsQuery
   *
   * @param {string} [tenantId] - Filter by tenant
   * @returns {Object} Stats
   */
  async executeGetStats(tenantId) {
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
  }

  /**
   * Execute MarkEventProcessedCommand
   *
   * @param {string} eventId
   * @param {string} worker
   */
  async executeMarkProcessed(eventId, worker) {
    await this._storage.query(
      `UPDATE canonical_events
       SET processed = TRUE, processed_at = NOW(), worker = $1
       WHERE event_id = $2`,
      [worker, eventId]
    );
  }

  /**
   * Execute MarkEventFailedCommand
   *
   * @param {string} eventId
   * @param {string} worker
   * @param {string} error
   */
  async executeMarkFailed(eventId, worker, error) {
    await this._storage.query(
      `UPDATE canonical_events
       SET retries = retries + 1, last_error = $1
       WHERE event_id = $2`,
      [error, eventId]
    );
  }

  /**
   * Execute GetUnprocessedEventsQuery
   *
   * @param {string} tenantId
   * @param {number} limit
   * @returns {Object[]} Events
   */
  async executeGetUnprocessed(tenantId, limit = 100) {
    const result = await this._storage.query(
      `SELECT * FROM canonical_events
       WHERE NOT processed AND tenant_id = $1
       ORDER BY tenant_id, sequence ASC
       LIMIT $2`,
      [tenantId, limit]
    );
    return result.rows;
  }

  /**
   * Health check
   */
  async health() {
    try {
      await this._storage.query('SELECT 1');
      return { healthy: true, storage: { healthy: true } };
    } catch (error) {
      return { healthy: false, storage: { healthy: false, error: error.message } };
    }
  }

  /**
   * Publish contract with hash
   */
  publishContract() {
    const contract = {
      authority_id: 'canonical-event-envelope',
      authority_name: 'CanonicalEventEnvelope',
      role: 'ingress_envelope_producer',
      version: this._authorityVersion,
      owner: 'ping',
      consumes: ['tenantId', 'eventType', 'source', 'actor', 'payload'],
      produces: ['ingress_receipt'],
      guarantees: ['ingress_shaping', 'receipt_identifiers', 'tenant_isolated', 'input_validation'],
      invariants: [
        'event_id is a random ingress receipt UUID (UUIDv4): it is NOT a canonical event identity',
        'canonical event identity is minted only by IdentityAuthority via the UnifiedEventRuntime',
        'canonical event ordering is the Postgres sequence assigned at UER acceptance, never this surface',
        'sequence on this surface is an ingress-local receipt serial for bookkeeping only',
        'the producer never claims acceptance: receipts carry accepted=false until the UER accepts via convergence',
        'tenant A cannot read tenant B receipts',
      ],
      consumers: ['tenantRegistry', 'deploymentRegistry', 'runtimeRegistry', 'workerRuntime', 'legacy_ingress_adapter'],
      requires: ['storage'],
      failure_modes: ['invalid_input', 'postgres_unavailable', 'receipt_order_conflict'],
      rollback: 'none',
      determinism: 'non-deterministic',
      dependencies: this._dependencies,
      schema_version: '1.0.0',
      event_version: '1.0.0',
      authority_version: this._authorityVersion,
    };

    contract.contract_hash = computeCanonicalHash(contract);

    return contract;
  }
}

module.exports = { CanonicalEventEnvelope };
