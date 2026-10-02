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

    // 5. Persist
    let isDuplicate = false;
    if (this._pool) {
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
          this._stats.deduplicated++;
          isDuplicate = true;
        }
      } catch (err) {
        this._stats.failed++;
        return { status: 'error', error: `Persist failed: ${err.message}`, eventId };
      }
    }

    // 5b. Replay idempotency: a duplicate delivery converges on the already-stored
    // row and MUST NOT re-trigger handlers or integrations. Redelivery is safe
    // exactly because this early return suppresses all downstream side effects.
    if (isDuplicate) {
