/**
 * Unified Event Runtime — PING Core v1
 * 
 * Single canonical event pipeline. Every event flows through here.
 * Replaces: Gateway CQRS, Gateway Canonical, Orchestration in-memory, BrainOS Python.
 * 
 * Flow: Emitter → EventRuntime → Persistence + Handlers + Integrations
 * 
 * Every event carries:
 * - event_id (SHA-256 deterministic)
 * - event_type (validated against event_registry.json)
 * - timestamp (ConstitutionalTimeAuthority)
 * - source (which connector/worker emitted it)
 * - payload (the data)
 * - metadata (schema_version, causation_id, correlation_id)
 */

const crypto = require('crypto');
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
    this._handlers = new Map();
    this._stats = { emitted: 0, persisted: 0, deduplicated: 0, dispatched: 0, failed: 0 };
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
  }

  /**
   * Emit an event. Validates, persists, dispatches to handlers, and routes to integrations.
   * @param {string} eventType — e.g., 'REVIEW_RECEIVED', 'CUSTOMER_CREATED'
   * @param {string} source — which connector/worker emitted it
   * @param {object} payload — the event data
   * @param {object} options — { causation_id, correlation_id, metadata, namespace, logical_id }
   */
  async emit(eventType, source, payload, options = {}) {
    // 1. Generate deterministic event_id (content-based, no Date.now()).
    //    Identity material = { eventType, source, [namespace], [logical_id|payload] }.
    //    Namespace + logical_id are only included when provided, so legacy callers
    //    keep their existing event IDs (idempotent retries preserved).
    //    logical_id is the timestamp-stripped logical identity — two emissions of the
    //    same logical event (even with different timestamps in payload) hash identically.
    const identity = { eventType, source };
    if (options.namespace) identity.namespace = options.namespace;
    identity[options.logical_id ? 'logical_id' : 'payload'] = options.logical_id || payload;
    const eventId = crypto.createHash('sha256').update(JSON.stringify(identity)).digest('hex');

    // 2. Validate event type
    if (this._eventValidator) {
      if (typeof this._eventValidator.validateEventType === 'function') {
        const validation = this._eventValidator.validateEventType(eventType);
        if (!validation.valid) {
          this._stats.failed++;
          return { status: 'error', error: validation.error, eventId };
        }
      } else if (typeof this._eventValidator.isRegistered === 'function') {
        if (!this._eventValidator.isRegistered(eventType)) {
          this._stats.failed++;
          return { status: 'error', error: `Unknown event_type: ${eventType}`, eventId };
        }
      }
    }

    // 3. Check governance (skip for bridge-sourced events that are already governed).
    //    Namespace is resolved exactly once here — the spine is the single owner of
    //    the 'core::system' default — and passed into governance so the canonical
    //    privacy boundary (core::<name> | tenant::<id>) is validated at this one
    //    choke point rather than re-derived by every downstream caller.
    const namespace = options.namespace || 'core::system';
    if (this._eventGovernance && !options._skipGovernance) {
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
        return { status: 'error', error: reason, code: governance.code, eventId };
      }
    }

    // 4. Build canonical event (namespace resolved in step 3)
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

    // 5. Persist - fail closed if no pool (never return ok without durability)
    if (!this._pool) {
      this._stats.failed++;
      return { status: "error", error: "No persistence available: event not durably stored", eventId };
    }
    {
      try {
        const result = await this._pool.query(
          `INSERT INTO ping_events (event_id, event_type, source, timestamp, payload, metadata, namespace)
           VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (event_id) DO NOTHING`,
          [event.event_id, event.event_type, event.source, event.timestamp,
           JSON.stringify(event.payload), JSON.stringify(event.metadata), event.namespace]
        );
        // Only count actual inserts, not ON CONFLICT DO NOTHING no-ops
        if ((result.rowCount || 0) > 0) {
          this._stats.persisted++;
        } else {
          // CONFLICT: check if this is a true duplicate or a semantic collision
          const existing = await this._pool.query(
            "SELECT payload FROM ping_events WHERE event_id = $1",
            [event.event_id]
          );
          if (existing.rows.length > 0) {
            const rawPayload = existing.rows[0].payload;
            const existingPayload = typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload;
            // Compare canonical JSON (sorted keys) for semantic equivalence
            const canon = (o) => JSON.stringify(o, Object.keys(o).sort());
            if (canon(existingPayload) !== canon(event.payload)) {
              // COLLISION: same ID, different semantics — fail closed
              this._stats.failed++;
              return { status: "error", error: "Event ID collision: same event_id with different payload semantics", eventId };
            }
          }
          this._stats.deduplicated++;
        }
      } catch (err) {
        this._stats.failed++;
        return { status: 'error', error: `Persist failed: ${err.message}`, eventId };
      }
    }

    // 6. Dispatch to handlers
    const handlers = this._handlers.get(eventType) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
        this._stats.dispatched++;
      } catch (err) {
        console.error(`[EventRuntime] Handler failed for ${eventType}:`, err.message);
      }
    }

    // 7. Route to integrations
    if (this._integrationManager) {
      try {
        await this._integrationManager.emit(event.event_type, event.payload);
      } catch (err) {
        console.error(`[EventRuntime] Integration routing failed:`, err.message);
      }
    }

    this._stats.emitted++;
    return { status: 'ok', eventId, event };
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
