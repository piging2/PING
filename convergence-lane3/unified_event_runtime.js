/**
 * Unified Event Runtime — PING Core v1
 * 
 * Single canonical event pipeline. Every event flows through here.
 * Replaces: Gateway CQRS, Gateway Canonical, Orchestration in-memory, BrainOS Python.
 * 
 * Flow: Emitter → EventRuntime → Persistence + Handlers + Integrations
 * 
 * Every event carries:
 * - event_id (IdentityAuthority canonical: event_<16hex>)
 * - event_type (validated against event_registry.json)
 * - timestamp (ConstitutionalTimeAuthority)
 * - source (which connector/worker emitted it)
 * - payload (the data)
 * - metadata (schema_version, causation_id, correlation_id)
 * - sequence (PostgreSQL-allocated canonical log position; storage metadata,
 *   never an input to event identity)
 */

const { identityAuthority } = require('../authorities/identity_authority.js');
const { constitutionalTimeAuthority } = require('../authorities/constitutional_time_authority.js');

class UnifiedEventRuntime {
  /**
   * @param {object} options
   * @param {object} options.pool — pg.Pool for persistence
   * @param {object} options.eventValidator — EventValidator instance
   * @param {object} options.eventGovernance — EventGovernance instance
   * @param {object} options.integrationManager — IntegrationManager instance
   */
  constructor(options = {}) {
    this._pool = options.pool || null;
    this._eventValidator = options.eventValidator || null;
    this._eventGovernance = options.eventGovernance || null;
    this._integrationManager = options.integrationManager || null;
    // MC-1: opaque capability object minted once in bootstrap and handed ONLY
    // to the allowlisted LegacyIngressAdapter. emit() grants the narrow
    // registry-compatibility exception only when the caller presents this
    // exact object (object-identity comparison). A boolean flag is forgeable
    // by any caller and therefore grants nothing.
    this._legacyIngressCapability = options.legacyIngressCapability || null;
    this._handlers = new Map();
    // PATCH-03 (E2): collisions_rejected counts fail-closed EVENT_IDENTITY_CONFLICT
    // rejections; witness_unavailable counts legacy-dedup paths where the stored
    // row carries no canonical_hash witness and equivalence is unprovable.
    this._stats = { emitted: 0, persisted: 0, deduplicated: 0, dispatched: 0, failed: 0, collisions_rejected: 0, witness_unavailable: 0 };
  }

  /**
   * Initialize the events table if it doesn't exist.
   */
  async initialize() {
    if (!this._pool) return;
    await this._pool.query(`
      CREATE TABLE IF NOT EXISTS ping_events (
        event_id VARCHAR(64) PRIMARY KEY,
        event_type VARCHAR(255) NOT NULL,
        source VARCHAR(255) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        payload JSONB NOT NULL DEFAULT '{}',
        metadata JSONB NOT NULL DEFAULT '{}',
        namespace VARCHAR(255) NOT NULL DEFAULT 'core::system',
        processed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE ping_events ADD COLUMN IF NOT EXISTS namespace VARCHAR(255) NOT NULL DEFAULT 'core::system';
      CREATE INDEX IF NOT EXISTS idx_ping_events_type ON ping_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_ping_events_source ON ping_events(source);
      CREATE INDEX IF NOT EXISTS idx_ping_events_namespace ON ping_events(namespace);
      CREATE INDEX IF NOT EXISTS idx_ping_events_processed ON ping_events(processed);
      CREATE INDEX IF NOT EXISTS idx_ping_events_timestamp ON ping_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_ping_events_causation ON ping_events ((metadata->>'causation_id'));
      CREATE INDEX IF NOT EXISTS idx_ping_events_correlation ON ping_events ((metadata->>'correlation_id'));
    `);
    // Canonical sequence (P0 Event Authority certification): a database-allocated
    // global monotonic allocation position over the canonical log.
    // Contract: unique, monotonically allocated by PostgreSQL at insert attempt.
    // Explicitly NOT certified: gaplessness (gaps are normal around conflicts /
    // rollbacks), transaction commit order, wall-clock chronology, causal order.
    // Sequence is storage metadata: it is assigned after identity and is never
    // an input to event identity or the canonical hash.
    await this._pool.query(`
      ALTER TABLE ping_events ADD COLUMN IF NOT EXISTS sequence BIGINT;
      CREATE SEQUENCE IF NOT EXISTS ping_events_sequence_seq;
      ALTER SEQUENCE ping_events_sequence_seq OWNED BY ping_events.sequence;
      ALTER TABLE ping_events ALTER COLUMN sequence SET DEFAULT nextval('ping_events_sequence_seq');
    `);
    // Deterministic backfill for pre-sequence rows. ORDER BY timestamp, event_id
    // is the strongest stable storage evidence available for legacy rows; it is
    // classified as LEGACY BACKFILL ORDER, not proven historical execution
    // order. Offset by the current max so an interrupted/resumed migration
    // cannot collide with already-assigned positions. Idempotent: only NULL
    // rows are touched.
    await this._pool.query(`
      UPDATE ping_events AS p
      SET sequence = sub.rn
      FROM (
        SELECT event_id,
               row_number() OVER (ORDER BY timestamp, event_id)
                 + (SELECT COALESCE(max(sequence), 0) FROM ping_events) AS rn
        FROM ping_events
        WHERE sequence IS NULL
      ) AS sub
      WHERE p.event_id = sub.event_id;
    `);
    // Advance the sequence past the backfill high-water mark. The three-argument
    // setval keeps the empty-table case correct: setval(s, 1, false) makes the
    // next allocation 1, while setval(s, max, true) makes it max + 1.
    await this._pool.query(`
      SELECT setval('ping_events_sequence_seq',
                    COALESCE((SELECT max(sequence) FROM ping_events), 1),
                    (SELECT count(*) FROM ping_events) > 0);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ping_events_sequence ON ping_events(sequence);
      ALTER TABLE ping_events ALTER COLUMN sequence SET NOT NULL;
    `);
    // PATCH-03 (E2): additive collision-witness column. Every new row carries
    // the FULL preimage digest (the untruncated sha256 whose first 16 hex
    // chars form the event_id); on an event_id conflict the stored witness is
    // compared against the candidate's digest to decide duplicate vs
    // collision. Historical rows stay NULL and are NEVER backfilled:
    // recomputation cannot prove it used the original logical_id-vs-payload
    // preimage choice, so a fabricated witness would be worse than none.
    await this._pool.query(`
      ALTER TABLE ping_events ADD COLUMN IF NOT EXISTS canonical_hash VARCHAR(64);
      CREATE INDEX IF NOT EXISTS idx_ping_events_canonical_hash ON ping_events(canonical_hash);
    `);
  }

  /**
   * Emit an event. Validates, persists, dispatches to handlers, and routes to integrations.
   * @param {string} eventType — e.g., 'REVIEW_RECEIVED', 'CUSTOMER_CREATED'
   * @param {string} source — which connector/worker emitted it
   * @param {object} payload — the event data
   * @param {object} options — { causation_id, correlation_id, metadata, namespace, logical_id, legacyIngressCapability }
   */
  async emit(eventType, source, payload, options = {}) {
    // 1. Build identity material (no ID is minted yet).
    //    Identity material = { event_type, source, namespace, [logical_id|payload] }.
    //    The namespace default is resolved BEFORE identity (C-007 fix): explicit vs
    //    default 'core::system' now produce the same identity for the same event.
    //    Timestamp is deliberately excluded: wall-clock is observation metadata assigned
    //    after identity; logical_id is the timestamp-stripped logical identity - two
    //    emissions of the same logical event (even with different timestamps in payload)
    //    hash identically, preserving idempotent retries.
    const namespace = options.namespace || 'core::system';
    const identityData = { event_type: eventType, source, namespace };
    identityData[options.logical_id ? 'logical_id' : 'payload'] = options.logical_id || payload;

    // 2. Validate event type BEFORE identity minting (F7/D1): a rejected event
    //    receives NO canonical event ID, NO persistence, NO acceptance claim.
    //    MC-1 compatibility exception: the allowlisted LegacyIngressAdapter
    //    converges legacy/external event types that cannot be pre-registered
    //    in the canonical registry (no producer registration mechanism exists;
    //    canonical_events.event_type is producer-controlled and unbounded).
    //    The exception is capability-bound: ONLY the exact object minted in
    //    bootstrap and handed to the allowlisted LegacyIngressAdapter
    //    (compared by object identity) excepts the REGISTRY-MEMBERSHIP check.
    //    A boolean options._legacyIngress is forgeable by any caller and is
    //    ignored. Every other acceptance rule applies unchanged — notably
    //    the F7/D1 value-domain boundary before minting (step 4),
    //    persistence, and namespace handling. Documented exception, not trust.
    const legacyIngressException = !!this._legacyIngressCapability
      && options.legacyIngressCapability === this._legacyIngressCapability;
    if (this._eventValidator && !legacyIngressException) {
      if (typeof this._eventValidator.validateEventType === 'function') {
        const validation = this._eventValidator.validateEventType(eventType);
        if (!validation.valid) {
          this._stats.failed++;
          return { status: 'error', code: 'UNKNOWN_EVENT_TYPE', error: validation.error };
        }
      } else if (typeof this._eventValidator.isRegistered === 'function') {
        if (!this._eventValidator.isRegistered(eventType)) {
          this._stats.failed++;
          return { status: 'error', code: 'UNKNOWN_EVENT_TYPE', error: `Unknown event_type: ${eventType}` };
        }
      }
    }

    // 3. Check governance (skip for bridge-sourced events that are already governed).
    //    Namespace was resolved once in step 1 - the spine is the single owner of
    //    the 'core::system' default - and passed into governance so the canonical
    //    privacy boundary (core::<name> | tenant::<id>) is validated at this one
    //    choke point rather than re-derived by every downstream caller.
    // Governance is skipped ONLY under the same capability-bound exception:
    // its UNREGISTERED_EVENT check is registry-derived, hence covered by the
    // documented compatibility exception. options._skipGovernance WITHOUT the
    // capability object is ignored (forgeable bypass closed).
    if (this._eventGovernance && !(options._skipGovernance && legacyIngressException)) {
      const governance = this._eventGovernance.validateEvent({
        event_type: eventType,
        source,
        payload,
        namespace,
      });
      if (!governance.valid) {
        this._stats.failed++;
        // _reject() returns { errors:[reason], code } — surface the reason string.
        const reason = governance.error || (governance.errors && governance.errors[0]) || 'Governance violation';
        return { status: 'error', error: reason, code: governance.code || 'GOVERNANCE_VIOLATION' };
      }
    }

    // 4. Mint canonical event_id via the constitutional identity authority (V2).
    //    IdentityAuthority.generateId('event', material) ->
    //    CanonicalJson.canonicalize (RFC-8785, F7/D1 domain) ->
    //    CanonicalAuthority.hashBytes -> `event_<16hex>`.
    //    `identity_version: 2.0.0` is inside the preimage (domain separation from
    //    V1; Era H 64-hex IDs remain immutable and are never recomputed).
    //    The F7/D1 value-domain boundary throws a typed deterministic error for
    //    rejected values BEFORE any ID exists: rejected events receive NO
    //    canonical event ID, NO persistence, NO acceptance claim.
    //    New IDs are `event_`-prefixed (self-identifying identity era).
    //    PATCH-03 (E2): mint via generateIdWithDigest so the FULL preimage
    //    digest is captured alongside the truncated ID. The digest is the
    //    canonical-hash collision witness persisted with the row; it is
    //    preimage-equivalent to event_id by construction (the ID is exactly
    //    `event_<digest[0:16]>`), never recomputed from stored content.
    let eventId;
    let canonicalHash;
    try {
      const minted = identityAuthority.generateIdWithDigest('event', identityData);
      eventId = minted.id;
      canonicalHash = minted.digest;
    } catch (err) {
      this._stats.failed++;
      const df = err && err.deterministicFailure;
      return {
        status: 'error',
        code: 'IDENTITY_VALUE_REJECTED',
        error: (df && df.context && df.context.reason) || err.message,
        deterministicCode: df && df.code,
      };
    }

    // 5. Build canonical event (namespace resolved in step 1)
    //    Confidence is optional — producers that compute it pass it via options.metadata.confidence.
    //    The spine carries but does NOT compute confidence; each worker re-evaluates at its hop.
    const event = {
      event_id: eventId,
      event_type: eventType,
      source,
      namespace,
      timestamp: constitutionalTimeAuthority.nowAsISOString(),
      payload,
      metadata: {
        schema_version: '1.0.0',
        namespace,
        causation_id: options.causation_id || null,
        correlation_id: options.correlation_id || eventId,
        ...(options.metadata && options.metadata.confidence != null
          ? { confidence: options.metadata.confidence }
          : {}),
        ...options.metadata,
      },
    };

    // 6. Persist. PostgreSQL allocates the canonical sequence position via the
    //    column DEFAULT (nextval); the INSERT never supplies it. ON CONFLICT
    //    DO NOTHING preserves idempotent retries: a conflicting insert may
    //    still consume a sequence value internally, which is acceptable under
    //    the allocation-position contract (monotonic uniqueness, not
    //    contiguity). Gaps are normal and must never be treated as defects.
    //    PATCH-03 (E2 collision safety): the INSERT carries canonical_hash —
    //    the full identity-preimage digest — as the collision witness. On a
    //    conflict the stored row is re-read IN THE SAME explicit transaction
    //    (no TOCTOU) and the candidate digest is compared against the witness:
    //      equal   -> genuine idempotent duplicate (deduplicated:true)
    //      NULL    -> legacy row, equivalence UNPROVABLE (deduplicated:true,
    //                 witness_unavailable:true; explicit, not silent)
    //      missing -> mock pool without the row (same explicit legacy-dedup)
    //      differ  -> EVENT_IDENTITY_CONFLICT, fail closed, zero dispatch,
    //                 stored row NEVER mutated. The stored row is never
    //                 overwritten to detect a collision: the comparison reads
    //                 the committed witness, nothing is rewritten.
    //    The explicit transaction is owned by emit() itself (PATCH-02's
    //    tx-participation signature is a different lane; this patch is
    //    self-contained). Pools that cannot supply a dedicated client (eval
    //    mocks) keep the legacy per-statement path, which is atomic in the
    //    mock by construction.
    let sequence = null;
    let dedupKind = null; // null | 'duplicate' | 'legacy-dedup'
    if (this._pool) {
      let client = null; // dedicated connection when the pool supports it
      const canTransact = typeof this._pool.connect === 'function';
      const dbOf = () => (client || this._pool);
      let inTx = false;
      try {
        if (canTransact) {
          client = await this._pool.connect();
          await client.query('BEGIN');
          inTx = true;
        }
        const result = await dbOf().query(
          `INSERT INTO ping_events (event_id, event_type, source, timestamp, payload, metadata, namespace, canonical_hash)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (event_id) DO NOTHING RETURNING sequence`,
          [event.event_id, event.event_type, event.source, event.timestamp,
           JSON.stringify(event.payload), JSON.stringify(event.metadata), event.namespace, canonicalHash]
        );
        // Only count actual inserts, not ON CONFLICT DO NOTHING no-ops.
        // Row-shape access is defensive: mock pools in evals return no rows.
        if ((result.rowCount || 0) > 0) {
          this._stats.persisted++;
          const row = result.rows && result.rows[0];
          sequence = row && row.sequence != null ? Number(row.sequence) : null;
        } else {
          // Conflict: the canonical row already exists. Re-read it (same tx)
          // and decide duplicate vs collision against the witness.
          const existing = await dbOf().query(
            'SELECT sequence, canonical_hash FROM ping_events WHERE event_id = $1',
            [event.event_id]
          );
          const erow = existing && existing.rows && existing.rows[0];
          const storedSequence = erow && erow.sequence != null ? Number(erow.sequence) : null;
          if (erow && erow.canonical_hash != null && erow.canonical_hash === canonicalHash) {
            // Genuine idempotent duplicate: same identity preimage. Legitimate
            // retries with different timestamps/metadata hash identically
            // because those are excluded from the preimage by design.
            this._stats.deduplicated++;
            sequence = storedSequence;
            dedupKind = 'duplicate';
          } else if (erow && erow.canonical_hash != null) {
            // TRUE COLLISION: same 64-bit event_id, different canonical
            // preimage. FAIL CLOSED: nothing was written (DO NOTHING already
            // held the stored row), the stored row is untouched, zero dispatch.
            this._stats.failed++;
            this._stats.collisions_rejected++;
            if (inTx) await dbOf().query('COMMIT');
            if (client) client.release();
            return {
              status: 'error',
              code: 'EVENT_IDENTITY_CONFLICT',
              eventId,
              collision: true,
              error: `identity collision: event_id ${eventId} is committed with a different canonical preimage; refusing to overwrite or dispatch`,
            };
          } else {
            // Legacy NULL-witness row (or mock pool without the row):
            // equivalence is UNPROVABLE. Keep the legacy fail-open dedup but
            // say so explicitly instead of silently claiming a duplicate.
            this._stats.deduplicated++;
            this._stats.witness_unavailable++;
            sequence = storedSequence;
            dedupKind = 'legacy-dedup';
          }
        }
        if (inTx) await dbOf().query('COMMIT');
      } catch (err) {
        if (inTx) { try { await dbOf().query('ROLLBACK'); } catch (_) { /* best effort */ } }
        this._stats.failed++;
        if (client) client.release();
        return { status: 'error', error: `Persist failed: ${err.message}`, eventId };
      }
      if (client) client.release();
    }
    // Expose the certified storage position on the in-memory event. Sequence
    // is storage metadata, not identity: assigned after identity, never fed
    // back into event_id or the canonical hash.
    event.sequence = sequence;

    // 7. Dispatch to handlers. Dispatch-on-dedup is an OPERATOR-DECLARED law:
    //    genuine duplicates and explicit legacy-dedups follow the current
    //    at-least-once path (dispatch proceeds below); a collision (step 6)
    //    returns before this point, so conflicting content never dispatches.
    const handlers = this._handlers.get(eventType) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
        this._stats.dispatched++;
      } catch (err) {
        console.error(`[EventRuntime] Handler failed for ${eventType}:`, err.message);
      }
    }

    // 8. Route to integrations
    if (this._integrationManager) {
      try {
        await this._integrationManager.emit(event.event_type, event.payload);
      } catch (err) {
        console.error(`[EventRuntime] Integration routing failed:`, err.message);
      }
    }

    this._stats.emitted++;
    // PATCH-03 (E2): duplicates are marked explicitly instead of being
    // indistinguishable from fresh persists. Legacy NULL-witness rows say so
    // (witness_unavailable) rather than silently claiming a duplicate.
    const result = { status: 'ok', eventId, event, sequence };
    if (dedupKind === 'duplicate') result.deduplicated = true;
    if (dedupKind === 'legacy-dedup') { result.deduplicated = true; result.witness_unavailable = true; }
    return result;
  }

  /**
   * Subscribe to an event type.
   * @param {string} eventType — event type to listen for
   * @param {function} handler — async function(event)
   */
  on(eventType, handler) {
    if (!this._handlers.has(eventType)) {
      this._handlers.set(eventType, []);
    }
    this._handlers.get(eventType).push(handler);
  }

  /**
   * Query events.
   */
  async query(options = {}) {
    if (!this._pool) return { status: 'error', error: 'No pool' };

    let sql = 'SELECT * FROM ping_events WHERE 1=1';
    const params = [];
    let idx = 1;

    if (options.eventType) {
      sql += ` AND event_type = $${idx++}`;
      params.push(options.eventType);
    }
    if (options.source) {
      sql += ` AND source = $${idx++}`;
      params.push(options.source);
    }
    if (options.since) {
      sql += ` AND timestamp >= $${idx++}`;
      params.push(options.since);
    }
    if (options.unprocessed) {
      sql += ` AND processed = FALSE`;
    }

    sql += ` ORDER BY timestamp DESC`;
    if (options.limit) {
      sql += ` LIMIT $${idx++}`;
      params.push(options.limit);
    }

    const result = await this._pool.query(sql, params);
    return { status: 'ok', events: result.rows, count: result.rowCount };
  }

  /**
   * Boring replay reader: deterministic retrieval of committed canonical
   * events in certified sequence order, from an optional sequence cursor.
   *
   * Contract:
   * - afterSequence is the last successfully observed sequence position;
   *   the next replay reads sequence > afterSequence. Default 0 replays
   *   from the beginning of the log.
   * - Rows are read in ORDER BY sequence ASC and bounded by limit.
   * - Read-only: replay never creates, rewrites, re-emits, or marks canonical
   *   events, and never touches another store. It does not re-execute the
   *   live pipeline, send messages, invoke agents, or call external APIs.
   * - If options.consumer is supplied, each event is delivered to it in order;
   *   delivery stops at the first consumer error, which is reported (not
   *   thrown) with the cursor position reached so far. Consumer side effects
   *   are the caller's responsibility: replay guarantees deterministic ordered
   *   source delivery, not consumer idempotence.
   *
   * @param {object} options — { afterSequence, limit, consumer }
   * @returns {{ status, events, count, delivered, lastSequence }}
   */
  async replay(options = {}) {
    if (!this._pool) return { status: 'error', error: 'No pool' };
    const afterSequence = options.afterSequence == null ? 0 : Number(options.afterSequence);
    const limit = Math.min(Math.max(Number(options.limit) || 100, 1), 10000);
    if (!Number.isFinite(afterSequence) || afterSequence < 0) {
      return { status: 'error', error: 'Invalid afterSequence' };
    }
    let result;
    try {
      result = await this._pool.query(
        `SELECT event_id, event_type, source, timestamp, payload, metadata, namespace, sequence, created_at
         FROM ping_events
         WHERE sequence > $1
         ORDER BY sequence ASC
         LIMIT $2`,
        [afterSequence, limit]
      );
    } catch (err) {
      return { status: 'error', error: `Replay query failed: ${err.message}` };
    }
    const events = result.rows || [];
    let lastSequence = afterSequence;
    let delivered = 0;
    const consumer = options.consumer;
    if (typeof consumer === 'function') {
      for (const ev of events) {
        try {
          await consumer(ev);
        } catch (err) {
          return {
            status: 'error',
            error: `Replay consumer failed at sequence ${ev.sequence}: ${err.message}`,
            events, count: events.length, delivered, lastSequence,
          };
        }
        delivered++;
        lastSequence = Number(ev.sequence);
      }
    } else {
      delivered = events.length;
      if (events.length > 0) lastSequence = Number(events[events.length - 1].sequence);
    }
    return { status: 'ok', events, count: events.length, delivered, lastSequence };
  }

  /**
   * Get direct children of an event (events caused by it).
   * Uses the causation_id expression index for O(log n) lookup.
   * @param {string} eventId — parent event_id
   * @param {number} [limit=50]
   * @returns {{ status: string, events: Array }}
   */
  async getChildren(eventId, limit = 50) {
    if (!this._pool) return { status: 'error', error: 'No pool' };
    const result = await this._pool.query(
      `SELECT event_id, event_type, source, timestamp, payload, metadata, namespace
       FROM ping_events
       WHERE metadata->>'causation_id' = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [eventId, limit]
    );
    return { status: 'ok', events: result.rows };
  }

  /**
   * Get all descendants of an event (recursive tree walk via causation_id).
   * Returns the full subtree breadth-first, with depth for each node.
   * @param {string} eventId — root event_id
   * @param {number} [maxDepth=10] — safety limit
   * @param {number} [limit=200] — total event limit
   * @returns {{ status: string, events: Array }}
   */
  async getDescendants(eventId, maxDepth = 10, limit = 200) {
    if (!this._pool) return { status: 'error', error: 'No pool' };
    const result = await this._pool.query(
      `WITH RECURSIVE causal_tree AS (
        SELECT event_id, event_type, source, timestamp, payload, metadata, namespace,
               0 AS depth, ARRAY[event_id] AS path
        FROM ping_events
        WHERE event_id = $1
        UNION ALL
        SELECT e.event_id, e.event_type, e.source, e.timestamp, e.payload, e.metadata, e.namespace,
               ct.depth + 1, ct.path || e.event_id
        FROM ping_events e
        JOIN causal_tree ct ON e.metadata->>'causation_id' = ct.event_id
        WHERE ct.depth < $3
          AND NOT e.event_id = ANY(ct.path)
      )
      SELECT event_id, event_type, source, timestamp, payload, metadata, namespace, depth, path
      FROM causal_tree
      ORDER BY depth ASC, created_at ASC
      LIMIT $2`,
      [eventId, limit, maxDepth]
    );
    return { status: 'ok', events: result.rows };
  }

  /**
   * Get all ancestors of an event (walk up the causation chain).
   * Returns the chain from immediate parent to root, with depth.
   * @param {string} eventId — leaf event_id
   * @param {number} [maxDepth=20] — safety limit
   * @returns {{ status: string, events: Array }}
   */
  async getAncestors(eventId, maxDepth = 20) {
    if (!this._pool) return { status: 'error', error: 'No pool' };
    const result = await this._pool.query(
      `WITH RECURSIVE causal_chain AS (
        SELECT event_id, event_type, source, timestamp, payload, metadata, namespace,
               0 AS depth, ARRAY[event_id] AS path
        FROM ping_events
        WHERE event_id = $1
        UNION ALL
        SELECT e.event_id, e.event_type, e.source, e.timestamp, e.payload, e.metadata, e.namespace,
               cc.depth + 1, cc.path || e.event_id
        FROM ping_events e
        JOIN causal_chain cc ON e.event_id = cc.metadata->>'causation_id'
        WHERE cc.depth < $2
          AND NOT e.event_id = ANY(cc.path)
      )
      SELECT event_id, event_type, source, timestamp, payload, metadata, namespace, depth, path
      FROM causal_chain
      ORDER BY depth ASC`,
      [eventId, maxDepth]
    );
    return { status: 'ok', events: result.rows };
  }

  /**
   * Get full correlation group (all events sharing the same correlation_id).
   * This is the "view everything from one originating observation" query.
   * @param {string} correlationId
   * @param {number} [limit=200]
   * @returns {{ status: string, events: Array }}
   */
  async getCorrelationGroup(correlationId, limit = 200) {
    if (!this._pool) return { status: 'error', error: 'No pool' };
    const result = await this._pool.query(
      `SELECT event_id, event_type, source, timestamp, payload, metadata, namespace
       FROM ping_events
       WHERE metadata->>'correlation_id' = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [correlationId, limit]
    );
    return { status: 'ok', events: result.rows };
  }

  /**
   * Get stats.
   */
  getStats() {
    return { ...this._stats, handlers: this._handlers.size };
  }
}

module.exports = { UnifiedEventRuntime };
