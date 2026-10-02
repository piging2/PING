/**
 * Event Bridge — PING Core v1
 *
 * Polls repository_events and canonical_events tables,
 * re-emits them through UnifiedEventRuntime into ping_events.
 *
 * Flow:
 *   repository_events (worker events)  ──┐
 *                                        ├──→ UnifiedEventRuntime.emit() → ping_events
 *   canonical_events  (business events) ──┘
 *
 * Design:
 *   - Polls on interval (default 5s)
 *   - Uses last-processed-ID cursor per source to avoid re-processing
 *   - Skips events already bridged (dedup via event_id)
 *   - Gracefully no-ops when pool is null (degraded mode)
 *   - Single source of truth: UnifiedEventRuntime
 */

class EventBridge {
  /**
   * @param {object} options
   * @param {object} options.pool — pg.Pool
   * @param {object} options.eventRuntime — UnifiedEventRuntime instance
   * @param {number} options.pollIntervalMs — poll interval (default 5000)
   * @param {number} options.batchSize — max events per poll (default 50)
   */
  constructor(options = {}) {
    this._pool = options.pool || null;
    this._eventRuntime = options.eventRuntime || null;
    this._pollIntervalMs = options.pollIntervalMs || 5000;
    this._batchSize = options.batchSize || 50;
    this._timer = null;
    this._running = false;

    // Cursor: last event_id seen per source
    this._lastRepoEventId = null;
    this._lastCanonicalEventId = null;

    // Stats
    this._stats = {
      repositoryBridged: 0,
      canonicalBridged: 0,
      errors: 0,
    };
  }

  async initialize() {
    if (!this._pool) return;
    // Create cursor persistence table
    await this._pool.query(`
      CREATE TABLE IF NOT EXISTS ping_bridge_cursors (
        source VARCHAR(255) PRIMARY KEY,
        last_event_id TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    // Restore cursors from DB
    try {
      const repoCursor = await this._pool.query(
        `SELECT last_event_id FROM ping_bridge_cursors WHERE source = 'repository_events'`
      );
      if (repoCursor.rows.length > 0) {
        this._lastRepoEventId = repoCursor.rows[0].last_event_id;
        console.log(`[EventBridge] Restored repository_events cursor: ${this._lastRepoEventId}`);
      }
      const canonicalCursor = await this._pool.query(
        `SELECT last_event_id FROM ping_bridge_cursors WHERE source = 'canonical_events'`
      );
      if (canonicalCursor.rows.length > 0) {
        this._lastCanonicalEventId = canonicalCursor.rows[0].last_event_id;
        console.log(`[EventBridge] Restored canonical_events cursor: ${this._lastCanonicalEventId}`);
      }
    } catch (err) {
      console.error(`[EventBridge] Failed to restore cursors: ${err.message}`);
    }
  }
  start() {
    if (!this._pool || !this._eventRuntime) {
      console.log('[EventBridge] Degraded mode — bridge disabled (pool or eventRuntime missing)');
      return;
    }
    if (this._running) return;
    this._running = true;
    console.log(`[EventBridge] Started — polling every ${this._pollIntervalMs}ms, batch=${this._batchSize}`);
    this._timer = setInterval(() => this._poll(), this._pollIntervalMs);
    // Run immediately
    this._poll();
  }

  /**
   * Stop the bridge polling loop.
   */
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._running = false;
    console.log('[EventBridge] Stopped');
  }

  /**
   * Single poll cycle: bridge repository_events, then canonical_events.
   */
  async _poll() {
    if (!this._pool || !this._eventRuntime) { console.log('[EventBridge] SKIP: pool or eventRuntime null'); return; }
    console.log('[EventBridge] _poll() START');
    try {
      await this._bridgeRepositoryEvents();
    } catch (err) {
      console.error(`[EventBridge] repository_events bridge error: ${err.message}`);
      this._stats.errors++;
    }

    try {
      await this._bridgeCanonicalEvents();
    } catch (err) {
      console.error(`[EventBridge] canonical_events bridge error: ${err.message}`);
      this._stats.errors++;
    }

    console.log(`[EventBridge] Poll cycle complete. Stats: repo=${this._stats.repositoryBridged}, canonical=${this._stats.canonicalBridged}, errors=${this._stats.errors}`);
  }

  /**
   * Bridge unprocessed events from repository_events → ping_events.
   *
   * repository_events schema:
   *   event_id TEXT PK, object_id, event_type, aggregate_type, sequence,
   *   payload JSONB, witness JSONB, timestamp BIGINT, authority, authority_version,
   *   causation_id, correlation_id, created_at TIMESTAMPTZ,
   *   RuntimeID, PreviousEventHash, CanonicalEventHash, ...
   *
   * Maps to UnifiedEventRuntime.emit(eventType, source, payload, options)
   */
  async _bridgeRepositoryEvents() {
    // Use cursor-based pagination: only fetch events after our last seen ID
    let sql = `
      SELECT event_id, object_id, event_type, aggregate_type, sequence,
             payload, timestamp, authority, causation_id, correlation_id,
             created_at, RuntimeID
      FROM repository_events
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (this._lastRepoEventId) {
      sql += ` AND event_id > $${idx++}`;
      params.push(this._lastRepoEventId);
    }

    // Skip events we already bridged (check ping_events for source='repository_events' + event_id)
    sql += ` AND event_id NOT IN (
      SELECT event_id FROM ping_events WHERE source = 'repository_events'
    )`;

    sql += ` ORDER BY event_id ASC LIMIT $${idx++}`;
    params.push(this._batchSize);

    const result = await this._pool.query(sql, params);
    const rows = result.rows;

    if (rows.length === 0) return;

    let bridged = 0;
    for (const row of rows) {
      try {
        // Map payload: extract meaningful data from the JSONB
        const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {});
        payload._repository_event_id = row.event_id;
        payload._object_id = row.object_id;
        payload._aggregate_type = row.aggregate_type;
        payload._sequence = row.sequence;
        payload._authority = row.authority;
        payload._runtime_id = row.RuntimeID;

        const emitResult = await this._eventRuntime.emit(
          row.event_type,
          'repository_events',  // source identifies the bridge origin
          payload,
          {
            _skipGovernance: true,  // already governed in source table
            causation_id: row.causation_id,
            correlation_id: row.correlation_id,
            metadata: {
              bridged_from: 'repository_events',
              original_event_id: row.event_id,
              authority: row.authority,
              runtime_id: row.RuntimeID,
            },
          }
        );

        if (emitResult.status === 'ok') {
          bridged++;
        }
      } catch (err) {
        console.error(`[EventBridge] Failed to bridge repo event ${row.event_id}: ${err.message}`);
        this._stats.errors++;
      }
    }

    // Advance cursor
    this._lastRepoEventId = rows[rows.length - 1].event_id;
    this._stats.repositoryBridged += bridged;

    // Persist cursor
    if (this._pool) {
      try {
        await this._pool.query(
          `INSERT INTO ping_bridge_cursors (source, last_event_id, updated_at)
           VALUES ('repository_events', $1, NOW())
           ON CONFLICT (source) DO UPDATE SET last_event_id = $1, updated_at = NOW()`,
          [this._lastRepoEventId]
        );
      } catch (_) {}
    }

    if (bridged > 0) {
      console.log(`[EventBridge] Bridged ${bridged} events from repository_events`);
    }
  }

  /**
   * Bridge unprocessed events from canonical_events → ping_events.
   *
   * canonical_events schema:
   *   event_id UUID PK, event_type, event_version, tenant_id,
   *   timestamp TIMESTAMPTZ, sequence BIGINT, source, actor,
   *   causation_id UUID, correlation_id UUID, payload JSONB,
   *   metadata JSONB, processed BOOLEAN, created_at TIMESTAMPTZ
   *
   * Maps to UnifiedEventRuntime.emit(eventType, source, payload, options)
   */
  async _bridgeCanonicalEvents() {
    // DEBUG: check row count directly
    const debugCount = await this._pool.query(`SELECT COUNT(*) as cnt FROM canonical_events WHERE processed = FALSE`);
    console.log(`[EventBridge] DEBUG canonical_events unprocessed count: ${debugCount.rows[0].cnt}`);

    let sql = `
      SELECT event_id, event_type, tenant_id, source, actor,
             payload, metadata, causation_id, correlation_id,
             created_at, timestamp
      FROM canonical_events
      WHERE processed = FALSE
    `;
    const params = [];
    let idx = 1;

    if (this._lastCanonicalEventId) {
      sql += ` AND event_id > $${idx++}`;
      params.push(this._lastCanonicalEventId);
    }

    sql += ` AND event_id::text NOT IN (
      SELECT event_id FROM ping_events WHERE source = 'canonical_events'
    )`;

    sql += ` ORDER BY event_id ASC LIMIT $${idx++}`;
    params.push(this._batchSize);

    const result = await this._pool.query(sql, params);
    const rows = result.rows;
    console.log(`[EventBridge] DEBUG canonical query returned ${rows.length} rows`);

    if (rows.length === 0) return;

    let bridged = 0;
    for (const row of rows) {
      try {
        const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : (row.payload || {});
        payload._canonical_event_id = row.event_id;
        payload._tenant_id = row.tenant_id;
        payload._actor = row.actor;

        const emitResult = await this._eventRuntime.emit(
          row.event_type,
          'canonical_events',  // source identifies the bridge origin
          payload,
          {
            _skipGovernance: true,  // already governed in canonical_events
            causation_id: row.causation_id ? String(row.causation_id) : undefined,
            correlation_id: row.correlation_id ? String(row.correlation_id) : undefined,
            metadata: {
              bridged_from: 'canonical_events',
              original_event_id: String(row.event_id),
              tenant_id: row.tenant_id,
              actor: row.actor,
              event_version: row.event_version || '1.0.0',
            },
          }
        );

        if (emitResult.status === 'ok') {
          bridged++;
          // Mark as processed in canonical_events
          await this._pool.query(
            `UPDATE canonical_events SET processed = TRUE, processed_at = NOW(), worker = 'event_bridge'
             WHERE event_id = $1`,
            [row.event_id]
          );
        } else {
          console.log(`[EventBridge] DEBUG emit rejected ${row.event_type}: ${emitResult.error || JSON.stringify(emitResult)}`);
        }
      } catch (err) {
        console.error(`[EventBridge] Failed to bridge canonical event ${row.event_id}: ${err.message}`);
        this._stats.errors++;
      }
    }

    // Advance cursor
    this._lastCanonicalEventId = rows[rows.length - 1].event_id;
    this._stats.canonicalBridged += bridged;

    // Persist cursor
    if (this._pool) {
      try {
        await this._pool.query(
          `INSERT INTO ping_bridge_cursors (source, last_event_id, updated_at)
           VALUES ('canonical_events', $1, NOW())
           ON CONFLICT (source) DO UPDATE SET last_event_id = $1, updated_at = NOW()`,
          [this._lastCanonicalEventId]
        );
      } catch (_) {}
    }

    if (bridged > 0) {
      console.log(`[EventBridge] Bridged ${bridged} events from canonical_events`);
    }
  }

  /**
   * Get bridge stats.
   */
  getStats() {
    return {
      ...this._stats,
      scope: 'session',
      running: this._running,
      pollIntervalMs: this._pollIntervalMs,
      lastRepoEventId: this._lastRepoEventId,
      lastCanonicalEventId: this._lastCanonicalEventId,
    };
  }
}

module.exports = { EventBridge };
