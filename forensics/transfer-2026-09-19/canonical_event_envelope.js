/**
 * Canonical Event Envelope Authority — CONVERGENCE ROLE (2026-09-19)
 *
 * P001: The standardized event schema for all TenantOS events.
 *
 * Every tenant (HPP, future) emits events through this envelope.
 * PING observes events through this envelope.
 * No business logic lives in this authority.
 *
 * CONVERGENCE (Phases 3/4/5, 2026-09-19 — "Refactor authority, preserve mechanism"):
 * This authority is NO LONGER an event identity authority. UnifiedEventRuntime
 * (via IdentityAuthority) is the MAIN constitutional runtime Event Authority:
 * one logical event -> one canonical identity (event_id), one authoritative
 * runtime commit (ping_events).
 *
 * This module's preserved narrower role (preferred order per standing law):
 *   SECONDARY CERTIFIED EVENT REPRESENTATION / immutable envelope /
 *   compatibility journal / domain projection / audit / migration-legacy.
 * Concretely it is a CERTIFIER + VALIDATOR + SERIALIZER + QUERY surface:
 *   - CERTIFIER: acceptCanonicalEvent() constructs the certified envelope
 *     representation of an ALREADY-AUTHORITATIVE event and persists it as a
 *     durable derived representation in canonical_events. The incoming event
 *     already carries event_id, identity_version, namespace, principal,
 *     timestamp, sequence, causation_id, correlation_id, and canonical hash
 *     (minted by UER/IdentityAuthority). The envelope validates
 *     envelope-specific constraints, builds the certification representation,
 *     persists it idempotently, and serves compatibility/domain reads.
 *   - VALIDATOR: executeValidateEvent() (envelope shape validation; kept).
 *   - SERIALIZER: canonicalizeId(), deriveEnvelopeId() (representation
 *     identity only — never the event's identity).
 *   - QUERY: executeQueryEvents(), executeGetStats(), executeGetUnprocessed(),
 *     getRepresentationBySourceEventId(), getRepresentationByEnvelopeId().
 *
 * HARD PROHIBITIONS (authority refactored away, mechanisms preserved):
 *   - MUST NOT mint logical event identity: no UUID v5 as event_id on the new
 *     path. generateEventId() is LEGACY: only the deprecated executeEmitEvent
 *     path may call it, and its output is an ingress-era row identity, never
 *     a canonical identity.
 *   - MUST NOT compute canonical order: no per-tenant MAX(sequence)+1 on the
 *     new path. getNextSequence() is LEGACY. Derived rows carry the canonical
 *     log position allocated by PostgreSQL at the authoritative commit.
 *   - MUST NOT present envelope_id as the event's identity. envelope_id is
 *     the certified REPRESENTATION's identity (deterministic UUID v5 from the
 *     canonical identity); the logical event's identity is source_event_id /
 *     event_id (converged era).
 *
 * Constitutional Constraint:
 * - Authority operations, not CRUD
 * - Immutability enforced (certified representations are never overwritten:
 *   conflicting content under the same identity fails closed)
 * - Tenant isolation enforced
 * - Canonical identity: carried from the authoritative commit, never reminted
 */

const crypto = require('crypto');
const path = require('path');
const { computeCanonicalHash } = require('../ping-runtime/authorities/constitutional_validation');
const { constitutionalTimeAuthority } = require('../ping-runtime/authorities/constitutional_time_authority.js');
const {
  ENVELOPE_VERSION,
  CONVERGED_ERA,
  LEGACY_CONVERGED_ERA,
  INGRESS_ERA,
  deriveEnvelopeId,
  canonicalEventHash,
} = require('../ping-runtime/events/convergence_identity.js');

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
   * Classification: MECHANISM (wiring). Unchanged by convergence.
   *
   * @returns {string[]} Required service names
   */
  get dependencies() {
    return this._dependencies;
  }

  /**
   * Initialize tables.
   *
   * Classification: MECHANISM (DDL application). Convergence extension: after
   * the base schema, applies the additive convergence migration
   * (database/migrations/2026-09-19_event_authority_convergence.sql), which is
   * idempotent and safe to re-run. Historical rows are never modified.
   */
  async initialize() {
    const fs = require('fs');
    const schemaPath = path.join(this._repoRoot, 'database', 'canonical_events.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await this._storage.query(schema);
    const migrationPath = path.join(
      this._repoRoot, 'database', 'migrations', '2026-09-19_event_authority_convergence.sql'
    );
    if (fs.existsSync(migrationPath)) {
      const migration = fs.readFileSync(migrationPath, 'utf8');
      await this._storage.query(migration);
      console.log('[CanonicalEventEnvelope] Convergence migration applied (additive, idempotent)');
    }
    console.log('[CanonicalEventEnvelope] Tables initialized');
  }

  /**
   * Canonicalize event ID to URI format
   *
   * Classification: SERIALIZER / LEGACY COMPATIBILITY. Preserved for
   * compatibility readers of ingress-era event:// URIs.
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
   * Classification: AUTHORITY DECISION — RETIRED. Kept as LEGACY COMPATIBILITY
   * for the deprecated executeEmitEvent() ingress path only. Its output was
   * once treated as the event's identity; under convergence it is only an
   * ingress-era ROW identity (historical), never a canonical identity.
   * The new path (acceptCanonicalEvent) MUST NEVER call this.
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
   * Get next sequence number for tenant
   *
   * Classification: AUTHORITY DECISION — RETIRED. Kept as LEGACY COMPATIBILITY
   * for the deprecated executeEmitEvent() ingress path only. Per-tenant
   * MAX(sequence)+1 is NOT the canonical order; the canonical log position is
   * allocated by PostgreSQL at the authoritative commit (ping_events.sequence,
   * P0-certified). The new path (acceptCanonicalEvent) MUST NEVER call this.
   *
   * @param {string} tenantId
   * @returns {number}
   */
  async getNextSequence(tenantId) {
    const result = await this._storage.query(
      `SELECT COALESCE(MAX(sequence), 0) + 1 as next_seq
       FROM canonical_events
       WHERE tenant_id = $1`,
      [tenantId]
    );
    return parseInt(result.rows[0].next_seq);
  }

  /**
   * Execute EmitEventCommand
   *
   * Classification: LEGACY COMPATIBILITY — DEPRECATED, preserved, never deleted.
   * This was the old ingress path (mint UUID v5 + per-tenant MAX+1 + INSERT).
   * It still works exactly as before for producers not yet migrated (Phase 7
   * owns producer migration; the dotted HPP types would fail closed in UER
   * today because they are absent from the governance registry). New code MUST
   * use UnifiedEventRuntime.emit() followed by acceptCanonicalEvent().
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
   * @returns {Object} Persisted event (ingress-era shape)
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

    const sequence = await this.getNextSequence(tenantId);
    const timestamp = constitutionalTimeAuthority.nowAsISOString();
    const eventId = this.generateEventId(tenantId, eventType, timestamp, sequence);

    // RECEIPT SEMANTICS (explicit, standing law 2026-09-19): this path is a
    // RECEIPT surface, not an acceptance authority. Every field minted here is
    // receipt-side and must never be silently promoted into constitutional
    // semantics:
    //   event_id  = receipt identity (ingress-era row identity; historical)
    //   sequence  = receipt ordering (per-tenant MAX+1; NOT canonical order)
    //   timestamp = receipt timestamp (NOT the constitutional acceptance timestamp)
    //   tenant_id = tenant CLAIM as supplied by the producer (unverified here;
    //               the LegacyIngressAdapter's AUTHORIZATION layer resolves the
    //               canonical namespace separately at convergence)
    // Constitutional identity, ordering, and acceptance timestamp are minted
    // only if/when this row converges through UnifiedEventRuntime.emit().
    const event = {
      event_id: eventId,
      event_type: eventType,
      event_version: '1.0.0',
      tenant_id: tenantId,
      timestamp,
      sequence,
      source,
      actor,
      causation_id: causationId,
      correlation_id: correlationId,
      payload,
      metadata: {
        ...metadata,
        created_at: timestamp,
        envelope: {
          envelope_version: '1.0.0',
          era: INGRESS_ERA,
          note: 'legacy ingress path: event_id is an ingress-era row identity, NOT a canonical identity',
        },
      },
      processed: false,
      processed_at: null,
      worker: null,
      retries: 0,
      last_error: null,
      created_at: timestamp,
    };

    // Validate
    const validation = this.executeValidateEvent(event);
    if (!validation.valid) {
      throw new Error(`Invalid event: ${validation.errors.join(', ')}`);
    }

    // Persist
    await this._storage.query(
      `INSERT INTO canonical_events
       (event_id, event_type, event_version, tenant_id, timestamp, sequence,
        source, actor, causation_id, correlation_id, payload, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (tenant_id, sequence) DO NOTHING`,
      [
        event.event_id, event.event_type, event.event_version, event.tenant_id,
        event.timestamp, event.sequence, event.source, event.actor,
        event.causation_id, event.correlation_id,
        JSON.stringify(event.payload), JSON.stringify(event.metadata),
      ]
    );

    return event;
  }

  /**
   * Accept an already-authoritative canonical event and persist its certified
   * envelope representation (the convergence path, Phases 3/4/5/8/9).
   *
   * Classification: ADAPTER + CERTIFIER. This is the envelope's primary
   * converged role: it adapts the authoritative commit into the secondary
   * certified representation and certifies it (representation identity,
   * content hash, cross-reference, era markers).
   *
   * The incoming event ALREADY carries its authoritative identity and
   * ordering, minted by UnifiedEventRuntime via IdentityAuthority:
   *   event_id, event_type, source, namespace, timestamp, payload,
   *   metadata (schema_version, causation_id, correlation_id, ...),
   *   sequence (PostgreSQL-allocated canonical log position, may be null
   *   when the commit had no pool).
   *
   * What this method does:
   *   1. Validates envelope-specific constraints (identity carried, not minted).
   *   2. Computes the representation identity (envelope_id, deterministic
   *      UUID v5 from the canonical identity) and the canonical content hash.
   *   3. Resolves the explicit cross-reference (source_event_id). If a
   *      representation already exists:
   *        - same era + same content hash -> idempotent success (no duplicate
   *          row, no duplicate downstream dispatch);
   *        - same era + different content -> FAILS CLOSED
   *          (CONVERGENCE_IDENTITY_CONFLICT): the certified representation is
   *          immutable; nothing is overwritten, nothing dispatched;
   *        - legacy-converged era (adapter-marked row) -> returns the preserved
   *          representation without duplicating it.
   *   4. Inserts the derived row (ON CONFLICT (event_id) DO NOTHING guards
   *      races) and fires options.onDerived ONLY on actual insert.
   *
   * What this method NEVER does: mint event identity, compute canonical order,
   * re-emit to UnifiedEventRuntime (no dual write), dispatch missions, or
   * present envelope_id as the event's identity.
   *
   * Consistency model B (durable derived representation): the authoritative
   * commit happened once in ping_events before this call. If derivation fails
   * after the commit, retry with the SAME event object (same identity); the
   * retry is idempotent.
   *
   * @param {Object} event — canonical event from UnifiedEventRuntime.emit()
   * @param {Object} [options]
   * @param {function} [options.onDerived] — async hook fired once per inserted
   *   representation (downstream projections). Never refired on retries.
   *   Mission triggering is NOT this hook's job: EventToMissionBridge is the
   *   accepted-event -> mission trigger authority (standing authority law).
   * @returns {Promise<Object>} { status:'ok', inserted, representation, ... }
   *   or { status:'error', code, error } (deterministic, fail-closed)
   */
  async acceptCanonicalEvent(event, options = {}) {
    // ---- 1. Envelope-specific validation: identity must be CARRIED ----
    const errors = [];
    if (!event || typeof event !== 'object') {
      errors.push('event object required');
    } else {
      if (!event.event_id) errors.push('event_id required: the envelope never mints logical identity; it must be carried from the authoritative commit');
      if (!event.event_type) errors.push('event_type required');
      if (!event.source) errors.push('source required');
      if (!event.namespace) errors.push('namespace required');
      if (!event.timestamp) errors.push('timestamp required');
      if (!event.payload || typeof event.payload !== 'object') errors.push('payload object required');
    }
    if (errors.length > 0) {
      return { status: 'error', code: 'ENVELOPE_VALIDATION_FAILED', error: errors.join('; ') };
    }

    const canonicalId = String(event.event_id);
    let canonicalHash;
    try {
      canonicalHash = canonicalEventHash(event);
    } catch (err) {
      return { status: 'error', code: 'UNHASHABLE_CONTENT', error: `canonical content hash failed (fail-closed): ${err.message}` };
    }
    const envelopeId = deriveEnvelopeId(canonicalId);

    // ---- 2. Explicit cross-reference: does a representation already exist? ----
    const existing = await this._storage.query(
      `SELECT event_id, envelope_id, event_type, metadata
       FROM canonical_events WHERE source_event_id = $1`,
      [canonicalId]
    );
    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      const env = (row.metadata && row.metadata.envelope) || {};
      if (env.era === CONVERGED_ERA) {
        if (env.canonical_hash === canonicalHash) {
          // Idempotent retry: same identity, same content. No new row, no redispatch.
          return {
            status: 'ok', inserted: false, deduped: true,
            representation: this._buildRepresentation(row.envelope_id || envelopeId, canonicalId, canonicalHash, event),
          };
        }
        // Same identity, DIFFERENT content: fail closed. The certified
        // representation is immutable; never overwrite, never re-derive,
        // never dispatch downstream on a conflict.
        return {
          status: 'error',
          code: 'CONVERGENCE_IDENTITY_CONFLICT',
          error: `conflicting content under canonical identity ${canonicalId}: ` +
            `stored representation hash ${env.canonical_hash} != presented ${canonicalHash}. ` +
            `Refusing to overwrite the certified representation or dispatch downstream.`,
        };
      }
      // Cross-era: the representation already exists via legacy-ingress
      // convergence (adapter-marked row). It is the preserved representation;
      // do not duplicate it.
      return {
        status: 'ok', inserted: false, alreadyRepresented: true, era: env.era || LEGACY_CONVERGED_ERA,
        representation: {
          envelope_id: row.envelope_id,
          envelope_version: env.envelope_version || '1.0.0',
          canonical_event_id: canonicalId,
          source_event_id: canonicalId,
          era: env.era || LEGACY_CONVERGED_ERA,
          note: 'preserved representation via legacy-ingress convergence; not re-derived',
        },
      };
    }

    // ---- 3. Derive the representation row ----
    // CONSTITUTIONAL FIELDS (carried, never re-derived, never promoted from
    // receipt): event_id is the constitutional identity, timestamp is the
    // constitutional acceptance timestamp assigned at UER acceptance, sequence
    // is the authoritative canonical log position allocated by PostgreSQL,
    // namespace is the canonical namespace resolved at the acceptance choke
    // point. actor is an UNVERIFIED CLAIM (no constitutional principal exists
    // on UER events; F3 frozen finding). tenant_id carries the canonical
    // namespace verbatim in the converged era (tenant::<id> | core::system),
    // documented here and in the migration — it is NOT the producer tenant claim.
    // The legacy UUID-typed causation_id/correlation_id columns stay NULL on
    // derived rows: converged causation/correlation are constitutional and
    // travel in metadata, never truncated into receipt-typed columns.
    // Receipt semantics stay separate from constitutional-event semantics:
    // receipt_order != canonical event sequence, receipt timestamp !=
    // constitutional acceptance timestamp, envelope_id != canonical event_id.
    const derivedAt = new Date().toISOString();
    const metadata = Object.assign({}, event.metadata || {}, {
      envelope: {
        envelope_version: ENVELOPE_VERSION,
        era: CONVERGED_ERA,
        envelope_id: envelopeId,
        canonical_event_id: canonicalId,
        canonical_hash: canonicalHash,
        derived_from: 'ping_events',
        derived_at: derivedAt,
        tenant_namespace: String(event.namespace),
      },
    });
    const inserted = await this._storage.query(
      `INSERT INTO canonical_events
         (event_id, envelope_id, source_event_id, event_type, event_version, tenant_id,
          timestamp, sequence, source, actor, payload, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [
        canonicalId,
        envelopeId,
        canonicalId,
        event.event_type,
        (event.metadata && event.metadata.schema_version) || '1.0.0',
        String(event.namespace),
        event.timestamp,
        event.sequence != null ? event.sequence : null,
        event.source,
        (event.metadata && event.metadata.actor) || 'unspecified',
        JSON.stringify(event.payload),
        JSON.stringify(metadata),
      ]
    );
    if (inserted.rowCount === 0) {
      // Lost a race with a concurrent derivation of the same identity: the
      // row now exists; resolve deterministically through the same path.
      // Terminates: the second pass finds the row via the cross-reference.
      return this.acceptCanonicalEvent(event, options);
    }

    const representation = this._buildRepresentation(envelopeId, canonicalId, canonicalHash, event);
    representation.certified_at = derivedAt;

    // ---- 4. Downstream notification: fires ONLY on actual insert ----
    // Retries, conflicts, and cross-era hits never re-trigger downstream
    // dispatch. A hook failure is reported, not retried here: the row is
    // already durably derived, and rebuild/audit covers missed notifications.
    let hookError = null;
    if (typeof options.onDerived === 'function') {
      try {
        await options.onDerived(representation);
      } catch (err) {
        hookError = (err && err.message) || String(err);
      }
    }
    const result = { status: 'ok', inserted: true, representation: representation };
    if (hookError) result.hook_error = hookError;
    return result;
  }

  /**
   * Build the certified representation object (in-memory view).
   * Classification: SERIALIZER (certification representation construction).
   */
  _buildRepresentation(envelopeId, canonicalId, canonicalHash, event) {
    return {
      envelope_id: envelopeId,
      envelope_version: ENVELOPE_VERSION,
      canonical_event_id: canonicalId,
      source_event_id: canonicalId,
      canonical_hash: canonicalHash,
      era: CONVERGED_ERA,
      event: event,
    };
  }

  /**
   * Resolve a representation by the canonical identity (Phase 5 cross-reference).
   * Classification: QUERY. Deterministic both directions by explicit identity:
   * ping_events.event_id <-> canonical_events.source_event_id.
   *
   * @param {string} sourceEventId — canonical event_id
   * @returns {Promise<Object|null>} canonical_events row or null
   */
  async getRepresentationBySourceEventId(sourceEventId) {
    const result = await this._storage.query(
      'SELECT * FROM canonical_events WHERE source_event_id = $1',
      [String(sourceEventId)]
    );
    return result.rows[0] || null;
  }

  /**
   * Resolve a representation by its representation identity (Phase 5).
   * Classification: QUERY. envelope_id identifies the certified
   * representation, never the logical event.
   *
   * @param {string} envelopeId — representation UUID
   * @returns {Promise<Object|null>} canonical_events row or null
   */
  async getRepresentationByEnvelopeId(envelopeId) {
    const result = await this._storage.query(
      'SELECT * FROM canonical_events WHERE envelope_id = $1::uuid',
      [String(envelopeId)]
    );
    return result.rows[0] || null;
  }

  /**
   * Execute ValidateEventQuery
   *
   * Classification: VALIDATOR (harvested mechanism). Envelope-specific shape
   * validation for the LEGACY ingress path. Preserved unchanged; the converged
   * path (acceptCanonicalEvent) carries its own validator because the canonical
   * event shape differs (namespace instead of tenant_id, no actor requirement).
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
   * Classification: QUERY (compatibility/domain reads). Preserved unchanged.
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
   * Classification: QUERY. Preserved unchanged.
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
   * Classification: PROJECTION (legacy operational state). Preserved unchanged
   * for the legacy ingress/worker surface.
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
   * Classification: PROJECTION (legacy operational state). Preserved unchanged.
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
   * Classification: QUERY. Preserved unchanged.
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
   *
   * Classification: MECHANISM. Preserved unchanged.
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
   *
   * Classification: CERTIFIER. Updated for the converged role (2026-09-19):
   * this authority no longer guarantees identity minting or canonical
   * ordering; it guarantees identity preservation, certified representation,
   * explicit cross-reference, and immutability of the certified artifact.
   * Stale guarantees (deterministic_id as UUID v5, per-tenant MAX+1 order)
   * were removed — leaving them would be false certification.
   */
  publishContract() {
    const contract = {
      authority_id: 'canonical-event-envelope',
      authority_name: 'CanonicalEventEnvelope',
      version: this._authorityVersion,
      owner: 'ping',
      consumes: ['canonical_event (authoritative, identity carried from UnifiedEventRuntime)'],
      produces: ['certified_envelope_representation'],
      guarantees: ['identity_preserved', 'certified_representation', 'cross_referenced', 'immutable', 'tenant_isolated'],
      invariants: [
        'the envelope never mints logical event identity: event_id is carried from the authoritative commit (UnifiedEventRuntime via IdentityAuthority)',
        'one logical event -> one canonical identity; envelope_id is the certified representation identity and is never presented as the event identity',
        'source_event_id explicitly cross-references ping_events.event_id; round-trip is deterministic both directions by explicit identity',
        'a certified representation is immutable: conflicting content under the same identity fails closed (CONVERGENCE_IDENTITY_CONFLICT), never overwritten',
        'derivation is idempotent: retry with the same identity resolves to the same envelope row with no duplicate downstream dispatch',
        'tenant A cannot read tenant B events',
        'sequence shown on a derived row is the canonical log position allocated by PostgreSQL at the authoritative commit, never per-tenant MAX(sequence)+1',
        'legacy ingress path (executeEmitEvent) is preserved deprecated; its UUIDs are ingress-era row identities, never canonical identities',
      ],
      consumers: ['tenantRegistry', 'deploymentRegistry', 'runtimeRegistry', 'workerRuntime', 'convergence_derivation'],
      requires: ['storage'],
      failure_modes: ['invalid_input', 'postgres_unavailable', 'identity_conflict', 'no_authoritative_commit'],
      rollback: 'none',
      determinism: 'deterministic',
      dependencies: this._dependencies,
      schema_version: '2.0.0',
      event_version: '2.0.0',
      authority_version: this._authorityVersion,
    };

    contract.contract_hash = computeCanonicalHash(contract);

    return contract;
  }
}

module.exports = { CanonicalEventEnvelope };
