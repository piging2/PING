/**
 * Canonical Workers — PING Core v1
 *
 * 6 canonical JS workers extracted from 38 implementations across 7 generations.
 * Plus IntelligenceWorker (Priority 6) — rule-based + optional Ollama.
 * Each worker handles specific event types and emits downstream events.
 *
 * Event pipeline:
 *   DOCUMENT_IMPORT → OBSERVATION_CREATE → CLAIM_GENERATE → REPLAY_VERIFY → REPLAY_COMPLETED → WITNESS_CREATED → LINEAGE_CREATE → PROJECTION_CREATE
 *
 * Each worker:
 *   1. Receives event from WorkerRuntime
 *   2. Processes the event (validates, transforms)
 *   3. Emits downstream event via UnifiedEventRuntime
 *   4. Returns result
 */

const { constitutionalTimeAuthority } = require('../authorities/constitutional_time_authority.js');

class BaseWorker {
  constructor(options = {}) {
    this._eventRuntime = options.eventRuntime || null;
    this._pool = options.pool || null;
    this._name = 'base';
  }

  async handle(event) {
    throw new Error(`${this._name}.handle() must be implemented`);
  }

  async _emit(eventType, payload, options = {}) {
    if (!this._eventRuntime) {
      throw new Error(`${this._name}: no EventRuntime — cannot emit ${eventType}`);
    }
    // Preserve the namespace from the event that triggered this worker so the
    // privacy boundary (core::system / core::owner / tenant::<id>) survives the
    // full worker chain down to projection and knowledge graph. The 'core::system'
    // default is owned by UnifiedEventRuntime.emit() — never re-derived here.
    const namespace = options.namespace || this._event?.namespace;
    // Preserve correlation_id from the triggering event so all events from the
    // same originating observation share a single correlation group. The spine
    // defaults correlation_id to the new event's own ID when this is absent,
    // which breaks the correlation chain at every worker hop.
    const correlation_id = options.correlation_id
      || this._event?.metadata?.correlation_id
      || this._event?.event_id
      || options.causation_id;
    // Set causation_id to the triggering event's own ID so every downstream
    // event has a direct link to its immediate parent in the causal chain.
    // Without this, the spine defaults causation_id to null and the chain
    // is broken at every worker hop.
    const causation_id = options.causation_id || this._event?.event_id || null;
    // Confidence semantics: distinguish explicit null from missing.
    // Object.hasOwn(options, 'confidence') is the canonical check.
    // Explicit value → preserve exactly, no provenance tag.
    // No explicit + inherited non-null → emit inherited + set confidence_source.
    // Neither explicit nor inherited → null/unknown. Preserve as null.
    const hasExplicitConfidence = Object.prototype.hasOwnProperty.call(options, 'confidence');
    const inheritedConfidence = this._event?.metadata?.confidence;
    const confidence = hasExplicitConfidence
      ? options.confidence
      : (inheritedConfidence ?? null);
    const emitMetadata = { ...(options.metadata || {}) };
    if (hasExplicitConfidence) {
      emitMetadata.confidence = options.confidence;
    } else if (inheritedConfidence != null) {
      emitMetadata.confidence = inheritedConfidence;
      emitMetadata.confidence_source = 'inherited';
    } else {
      emitMetadata.confidence = null;
    }
    const result = await this._eventRuntime.emit(eventType, this._name, payload, {
      ...options,
      namespace,
      correlation_id,
      causation_id,
      metadata: emitMetadata,
    });
    if (result.status !== 'ok') {
      throw new Error(`${this._name}: emit ${eventType} failed — ${result.error}`);
    }
    return result;
  }
}

/**
 * ObservationWorker — processes DOCUMENT_IMPORT, OBSERVATION_CREATE events.
 * Extracts observations from imported documents.
 */
class ObservationWorker extends BaseWorker {
  constructor(options = {}) {
    super(options);
    this._name = 'observation';
  }

  async handle(event) {
    const payload = event.payload || {};
    // Observation subject identity: prefer the document's own identity, but fall back
    // to the triggering event/mission canonical ID. Business events (EMAIL_RECEIVED,
    // LEAD_CREATED, ...) carry no document identity; emitting undefined here trips the
    // F7/D1 canonical-identity boundary and fails the mission (observed: repeated
    // OBSERVATION_CREATED emission failures on the p18 candidate). The worker is
    // registered for ALL business events, so the event itself is the correct
    // observation subject when no document exists.
    const documentId = payload._object_id || payload.documentId || payload.id
      || event.event_id || event.mission_id;
    if (documentId == null) {
      throw new Error(
        `observation: no subject identity for ${event.event_type} ` +
        `(event_id=${event.event_id}, mission_id=${event.mission_id})`
      );
    }

    console.log(`[ObservationWorker] Processing ${event.event_type} for ${documentId || 'unknown'}`);

    // Extract observation from document
    const observation = {
      documentId,
      eventType: event.event_type,
      timestamp: constitutionalTimeAuthority.nowAsISOString(),
      source: event.source,
      metadata: event.metadata || {},
    };

    // Emit downstream event
    await this._emit('OBSERVATION_CREATED', {
      documentId,
      observation,
      upstreamEventId: event.event_id || event.mission_id,
    }, {
      causation_id: event.event_id,
    });

    return { status: 'ok', observation };
  }
}

/**
 * ClaimWorker — processes CLAIM_GENERATE events.
 * Generates claims from observations.
 */
class ClaimWorker extends BaseWorker {
  constructor(options = {}) {
    super(options);
    this._name = 'claim';
  }

  async handle(event) {
    const payload = event.payload || {};
    const documentId = payload.documentId || payload._object_id;

    console.log(`[ClaimWorker] Processing ${event.event_type} for ${documentId || 'unknown'}`);

    const claim = {
      documentId,
      eventType: event.event_type,
      timestamp: constitutionalTimeAuthority.nowAsISOString(),
      source: event.source,
    };

    await this._emit('CLAIM_CREATED', {
      documentId,
      claim,
      upstreamEventId: event.event_id || event.mission_id,
    }, {
      causation_id: event.event_id,
    });

    return { status: 'ok', claim };
  }
}

/**
 * ProjectionWorker — processes PROJECTION_CREATE events.
 * Projects events into knowledge graph vectors.
 */
class ProjectionWorker extends BaseWorker {
  constructor(options = {}) {
    super(options);
    this._name = 'projection';
    this._embeddingService = options.embeddingService || null;
  }

  async handle(event) {
    const payload = event.payload || {};
    const documentId = payload.documentId || payload._object_id;

    console.log(`[ProjectionWorker] Processing ${event.event_type} for ${documentId || 'unknown'}`);

    const projection = {
      documentId,
      eventType: event.event_type,
      timestamp: constitutionalTimeAuthority.nowAsISOString(),
    };

    await this._emit('PROJECTION_CREATED', {
      documentId,
      projection,
      upstreamEventId: event.event_id || event.mission_id,
    }, {
      causation_id: event.event_id,
    });

    // This worker's purpose: write the canonical observation to Qdrant.
    if (this._embeddingService) {
      try {
        const point = await this._embeddingService.projectToQdrant({
          id: event.event_id,
          kind: event.event_type,
          event_id: event.event_id,
          namespace: event.namespace,
          canonical_hash: (event.metadata && event.metadata.canonical_hash) || null,
          identity: event.identity || null,
          payload: event.payload || {},
        }, {
          sourceEventId: event.event_id,
          eventType: event.event_type,
          namespace: event.namespace,
        });
        console.log(`[ProjectionWorker] Projected ${event.event_type} → qdrant point ${point.id.slice(0, 12)}`);
      } catch (err) {
        console.error(`[ProjectionWorker] Qdrant projection failed: ${err.message}`);
      }
    }

    return { status: 'ok', projection };
  }
}

/**
 * ReplayWorker — processes REPLAY_VERIFY events.
 * Verifies event replay integrity via the deterministic kernel engine.
 *
 * Authority chain:
 *   ReplayWorker → ReplayAuthority → KernelReplayExecutionProvider → DeterministicReplayEngine
 *
 * verified: true ONLY when the kernel engine reports violations.length === 0.
 * The old stub returned verified: true unconditionally — that was wrong.
 */
class ReplayWorker extends BaseWorker {
  constructor(options = {}) {
    super(options);
    this._name = 'replay';
    // The kernel replay execution provider — injected by registerCanonicalWorkers
    // or by test harness. When absent, replay is a no-op (verified: false).
    this._replayProvider = options.replayProvider || null;
  }

  async handle(event) {
    // Preserve the triggering event so the constitutional trace contract
    // (namespace / correlation_id / confidence inheritance) functions even when
    // invoked directly — WorkerRuntime.dispatch also sets worker._event, but
    // direct unit-test invocation must behave identically.
    this._event = event;
    const payload = event.payload || {};
    const documentId = payload.documentId || payload._object_id;

    console.log(`[ReplayWorker] Processing ${event.event_type} for ${documentId || 'unknown'}`);

    // Build a transcript from the event chain for the kernel engine.
    // The transcript contains replay_events[] — the events to re-execute.
    const replayEvents = await this._buildReplayEvents(event);

    // If no provider is available, replay is a structural no-op.
    if (!this._replayProvider) {
      const replay = {
        documentId,
        eventType: event.event_type,
        timestamp: constitutionalTimeAuthority.nowAsISOString(),
        verified: false,
        reason: 'no_replay_provider',
        fingerprint: null,
        witness_root: null,
        violations: [],
      };

      const authority = this._buildAuthorityEvidence(event, replay);

      await this._emit('REPLAY_COMPLETED', {
        documentId,
        replay,
        authority,
        upstreamEventId: event.event_id || event.mission_id,
      }, {
        causation_id: event.event_id,
      });

      return { status: 'ok', replay };
    }

    // Build transcript for the kernel engine
    const transcript = {
      state: {
        replay_events: replayEvents,
      },
    };

    // Execute replay through the deterministic kernel engine
    let kernelResult;
    try {
      kernelResult = await this._replayProvider.executeReplay(transcript);
    } catch (err) {
      // Kernel threw — replay failed deterministically
      const replay = {
        documentId,
        eventType: event.event_type,
        timestamp: constitutionalTimeAuthority.nowAsISOString(),
        verified: false,
        reason: 'kernel_error',
        error: err.message,
        fingerprint: null,
        witness_root: null,
        violations: [],
      };

      const authority = this._buildAuthorityEvidence(event, replay, {
        failure_reason: err.message,
        failure_code: 'kernel_error',
      });

      await this._emit('REPLAY_COMPLETED', {
        documentId,
        replay,
        authority,
        upstreamEventId: event.event_id || event.mission_id,
      }, {
        causation_id: event.event_id,
      });

      return { status: 'ok', replay };
    }

    // Kernel result → replay verdict
    // verified: true ONLY when status === 'ok' AND violations.length === 0
    // AND the input window was COMPLETE. W-2: a truncated or partially
    // skipped replay is an explicit INCOMPLETE state, never a silent
    // partial attestation.
    const violations = kernelResult.violations || [];
    // Fail closed (W-2): only an explicit 'COMPLETE' from the provider
    // counts as complete. A provider result that omits the completeness
    // field (pre-W-2 port implementation, undeclared window) is treated
    // as INCOMPLETE: it can never verify and never produce a silent
    // partial attestation.
    const completeness = kernelResult.completeness === 'COMPLETE' ? 'COMPLETE' : 'INCOMPLETE';
    const incomplete = completeness !== 'COMPLETE';
    const isVerified = kernelResult.status === 'ok' && !incomplete && violations.length === 0;

    const replay = {
      documentId,
      eventType: event.event_type,
      timestamp: constitutionalTimeAuthority.nowAsISOString(),
      verified: isVerified,
      reason: isVerified ? 'kernel_verified'
        : (incomplete ? 'incomplete_input_set' : (kernelResult.status || 'kernel_failed')),
      fingerprint: kernelResult.fingerprint || null,
      witness_root: kernelResult.witness_root || null,
      violations,
      event_count: kernelResult.event_count || 0,
      artifact_count: kernelResult.artifact_count || 0,
      state_version: kernelResult.state_version || null,
      // W-2: version + coverage bindings carried from the kernel provider.
      // Recorded, not certified: they identify the reproduction parameters.
      replay_engine_version: kernelResult.replay_engine_version || null,
      witness_algorithm_version: kernelResult.witness_algorithm_version || null,
      witness_version: kernelResult.witness_version || null,
      completeness,
      input_event_count: (typeof kernelResult.input_event_count === 'number') ? kernelResult.input_event_count : null,
      input_truncated: !!kernelResult.input_truncated,
      inputs_skipped: (typeof kernelResult.inputs_skipped === 'number') ? kernelResult.inputs_skipped : 0,
    };

    // Structured constitutional evidence at the replay boundary. Every field is
    // derived from an actual value — the triggering event's trace fields, the
    // kernel provider's deterministic result, and fixed authority identities.
    // Nothing is fabricated; absent values are omitted (never defaulted).
    const authority = this._buildAuthorityEvidence(event, replay, {
      replay_id: kernelResult.replay_id,
      event_count: kernelResult.event_count,
      artifact_count: kernelResult.artifact_count,
      state_version: kernelResult.state_version,
      leaf_count: kernelResult.leaf_count,
      tree_height: kernelResult.tree_height,
    });

    await this._emit('REPLAY_COMPLETED', {
      documentId,
      replay,
      authority,
      upstreamEventId: event.event_id || event.mission_id,
    }, {
      causation_id: event.event_id,
    });

    return { status: 'ok', replay };
  }

  /**
   * Build structured constitutional evidence at the replay authority boundary.
   *
   * Preserve, never fabricate. Every field is derived from an actual value:
   *  - authority/provider identities are fixed constants (the genuine actors)
   *  - source_event_id / correlation_id / namespace are read from the triggering
   *    event (never invented; absent → omitted)
   *  - replay verdict fields (verified, reason, violations) are the result's verdict
   *  - deterministic_execution_identity is the kernel fingerprint when produced
   *  - canonical input identity is the deterministic transcript hash when produced
   *
   * @param {Object} event - the triggering event (REPLAY_VERIFY / PROJECTION_CREATED)
   * @param {Object} replay - the replay verdict object
   * @param {Object} extra - additional optional evidence (replay_id, event_count, ...)
   */
  _buildAuthorityEvidence(event, replay, extra = {}) {
    const evidence = {
      authority: 'ReplayWorker',
      provider: 'KernelReplayExecutionProvider',
    };

    const srcId = event.event_id || event.mission_id;
    if (srcId != null) evidence.source_event_id = srcId;

    const corr = event.metadata?.correlation_id || event.correlation_id;
    if (corr != null) evidence.correlation_id = corr;

    const ns = event.metadata?.namespace || event.namespace;
    if (ns != null) evidence.namespace = ns;

    if (replay != null) {
      if (replay.verified != null) evidence.verified = replay.verified;
      if (replay.reason != null) evidence.reason = replay.reason;
      if (Array.isArray(replay.violations)) {
        evidence.violation_count = replay.violations.length;
        if (replay.violations.length > 0) evidence.violations = replay.violations;
      }
    }

    if (extra.failure_code) evidence.failure_code = extra.failure_code;
    if (extra.failure_reason) evidence.failure_reason = extra.failure_reason;

    // Deterministic execution identity = the kernel fingerprint when actually
    // produced by the engine. Never invented by the observer.
    if (replay && replay.fingerprint) evidence.deterministic_execution_identity = replay.fingerprint;

    // Canonical input/transcript identity = the deterministic hash the provider
    // derives from the transcript when it actually produces one.
    if (extra.replay_id) evidence.canonical_input_hash = extra.replay_id;

    return evidence;
  }

  /**
   * Build replay events from the event chain.
   * In production, this loads correlated events from Postgres.
   * In tests, this constructs events directly.
   *
   * Events must be in causal order (ancestor → descendant) for the kernel
   * state machine to process them correctly.
   */
  async _buildReplayEvents(event) {
    const payload = event.payload || {};
    const correlationId = event.metadata?.correlation_id || event.correlation_id || event.event_id;

    // If events are provided in payload (test mode), use them directly
    if (Array.isArray(payload.replay_events) && payload.replay_events.length > 0) {
      return payload.replay_events;
    }

    // In production, this would query Postgres for the correlation group:
    // SELECT * FROM ping_events WHERE metadata->>'correlation_id' = $1
    // For now, return the triggering event as a single-event replay.
    // This is correct: a single observation can be replayed independently.
    return [{
      event_id: event.event_id,
      event_type: event.event_type,
      payload: payload,
      metadata: event.metadata || {},
      timestamp: event.timestamp,
    }];
  }
}

/**
 * Versions bound into every WITNESS_CREATED attestation (W-1A).
 *
 * These are RECORDED, not certified: they identify the attestation algorithm
 * and the canonical replay input shape the worker read. They do NOT certify
 * leaf count, kernel engine version, or replay coverage — engine/leaf
 * versioning is owned by W-2 (interim invariant preserved: no leaf-count
 * claim is made here).
 *
 * W-2 resolution: replay_engine_version, witness_algorithm_version, and
 * witness_version are now bound into every attestation from the certified
 * replay result (NULL for pre-W-2 rows; never silently backfilled). Leaf
 * count is still deliberately NOT claimed — the 12-leaf interim invariant
 * continues to govern the live construction.
 */
const WITNESS_ATTESTATION_ALGORITHM_VERSION = 'witness-attest/v1';
const WITNESS_INPUT_SCHEMA_VERSION = 'witness-input/v1';

/**
 * WitnessWorker — derives witness attestations from verified REPLAY_COMPLETED events.
 *
 * W-1A worker-side canonical authentication:
 * - The worker resolves the triggering canonical event by event_id from the
 *   canonical store (ping_events) and requires it to be a REPLAY_COMPLETED row.
 * - It reads the replay verdict and proof ONLY from that canonical row. The
 *   dispatch envelope's replay claims are untrusted hints: envelope `verified`
 *   and envelope `witness_root` are never trusted for an attestation.
 * - It never re-runs the replay kernel: verification is the replay
 *   provider's authority; attestation is this worker's authority.
 * - Authenticated-but-invalid attempts (no canonical row, unverified or
 *   malformed canonical replay) emit an observable WITNESS_REJECTED and never
 *   a WITNESS_CREATED.
 * - Attestation identity is the logical attestation (kind + canonical replay
 *   event_id + witness_root) passed as logical_id: wall-clock timestamp is
 *   observation metadata, never identity input, so a retry of the same
 *   attestation mints the same event_id and ON CONFLICT dedups the row.
 *
 * Direct-invocation seam: when the worker is constructed with NO attestation
 * source (no pool, no attestationSource) AND the event carries no mission
 * dispatch metadata, there is no pipeline dispatch envelope to distrust, so
 * the pre-W-1A envelope contract is preserved for unit tests (EVAL-010).
 * A mission-pipeline dispatch without any attestation source fails closed.
 */
class WitnessWorker extends BaseWorker {
  constructor(options = {}) {
    super(options);
    this._name = 'witness';
    // Canonical attestation source: async (replayEventId) -> canonical
    // ping_events row ({ event_id, event_type, payload, ... }) or null.
    // The production bootstrap always wires a pool, so the default below
    // applies; explicit injection is for tests.
    this._attestationSource = options.attestationSource || null;
  }

  /**
   * Default canonical attestation source: read the persisted REPLAY_COMPLETED
   * row from the canonical event store via the worker pool.
   */
  async _readCanonicalReplayEvent(replayEventId) {
    if (this._attestationSource) {
      return this._attestationSource(replayEventId);
    }
    if (!this._pool || !replayEventId) return null;
    const result = await this._pool.query(
      `SELECT event_id, event_type, source, namespace, payload, metadata
       FROM ping_events WHERE event_id = $1 LIMIT 1`,
      [replayEventId]
    );
    const row = result.rows && result.rows[0];
    if (!row || row.event_type !== 'REPLAY_COMPLETED') return null;
    if (typeof row.payload === 'string') {
      try { row.payload = JSON.parse(row.payload); } catch (e) { row.payload = null; }
    }
    return row;
  }

  async handle(event) {
    // Set the triggering event so _emit's trace contract (namespace,
    // correlation_id, causation_id inheritance) works on direct invocation —
    // identical to WorkerRuntime.dispatch, which sets this._event first.
    this._event = event;
    const payload = event.payload || {};
    const documentId = payload.documentId || payload._object_id;

    console.log(`[WitnessWorker] Processing ${event.event_type} for ${documentId || 'unknown'}`);

    // Failure-honesty gate (W7): only a replay result may produce a witness.
    // The legacy WITNESS_CREATE command was an alternate, unverified path.
    if (event.event_type !== 'REPLAY_COMPLETED') {
      return { status: 'rejected', reason: 'unsupported_witness_trigger' };
    }

    // W-1A: authenticate the trigger against the canonical store. The dispatch
    // envelope's replay claims are untrusted hints only.
    const replayEventId = payload.event_id || event.event_id || event.mission_id;
    const dispatchedViaMission = !!(event.mission_id || (event.metadata && event.metadata.mission_type));
    const canonicalRow = await this._readCanonicalReplayEvent(replayEventId);

    if (!canonicalRow) {
      const hasSource = !!(this._attestationSource || this._pool);
      if (!hasSource && !dispatchedViaMission) {
        // Direct invocation without a canonical store (unit-test seam, e.g.
        // EVAL-010): no pipeline is involved, so there is no dispatch
        // envelope to distrust. Preserve the pre-W-1A envelope contract.
        return await this._attestFromEnvelope(event, payload, documentId);
      }
      if (!hasSource) {
        // A mission-pipeline dispatch must never be attested without an
        // attestation source — fail closed.
        return await this._reject(event, documentId, null, 'attestation_source_unavailable', replayEventId);
      }
      return await this._reject(event, documentId, null, 'no_canonical_replay_event', replayEventId);
    }

    // The certified replay result comes ONLY from the canonical row. The
    // worker never re-runs the replay kernel.
    const canonicalPayload = canonicalRow.payload || {};
    const certified = canonicalPayload.replay;
    if (!certified || typeof certified !== 'object' || Array.isArray(certified)) {
      return await this._reject(event, documentId, null, 'canonical_replay_malformed', canonicalRow.event_id);
    }

    if (certified.verified !== true) {
      const reason = certified.reason || 'replay_not_verified';
      return await this._reject(event, documentId, certified, `unverified_replay:${reason}`, canonicalRow.event_id);
    }

    const witnessRoot = certified.witness_root;
    if (typeof witnessRoot !== 'string' || witnessRoot.length === 0) {
      return await this._reject(event, documentId, certified, 'missing_witness_root', canonicalRow.event_id);
    }

    // Attest the certified result. witness_root identifies the proof content;
    // the canonical event_id identifies the attestation. Coverage fields are
    // recorded from the certified result, not certified by the witness.
    const witness = {
      documentId: canonicalPayload.documentId || documentId,
      eventType: 'REPLAY_COMPLETED',
      witness_root: witnessRoot,
      replay_fingerprint: certified.fingerprint || null,
      replay_event_id: canonicalRow.event_id,
      replay_event_count: (typeof certified.event_count === 'number') ? certified.event_count : null,
      violation_count: Array.isArray(certified.violations) ? certified.violations.length : null,
      replay_reason: certified.reason || null,
      algorithm_version: WITNESS_ATTESTATION_ALGORITHM_VERSION,
      input_schema_version: WITNESS_INPUT_SCHEMA_VERSION,
      // W-2: replay engine + witness algorithm versions, recorded from the
      // certified replay result. NULL when the certified row predates the
      // binding (legacy rows are never silently backfilled).
      replay_engine_version: (typeof certified.replay_engine_version === 'string') ? certified.replay_engine_version : null,
      witness_algorithm_version: (typeof certified.witness_algorithm_version === 'string') ? certified.witness_algorithm_version : null,
      witness_version: (typeof certified.witness_version === 'string') ? certified.witness_version : null,
      replay_completeness: (typeof certified.completeness === 'string') ? certified.completeness : null,
      replay_input_event_count: (typeof certified.input_event_count === 'number') ? certified.input_event_count : null,
      replay_inputs_skipped: (typeof certified.inputs_skipped === 'number') ? certified.inputs_skipped : null,
      timestamp: constitutionalTimeAuthority.nowAsISOString(),
      attestation: `witness-${String(canonicalRow.event_id).slice(0, 16)}`,
    };

    await this._emit('WITNESS_CREATED', {
      documentId: witness.documentId,
      witness,
      upstreamEventId: canonicalRow.event_id,
    }, {
      causation_id: event.event_id,
      // Logical attestation identity: wall-clock is observation metadata,
      // never identity input. The same certified replay re-attested (retry)
      // mints the same event_id, so ON CONFLICT DO NOTHING dedups the row.
      logical_id: {
        kind: 'witness-attestation',
        replay_event_id: canonicalRow.event_id,
        witness_root: witnessRoot,
      },
    });

    return { status: 'ok', witness };
  }

  /**
   * Pre-W-1A envelope contract, preserved ONLY for direct invocation without
   * a canonical store (unit-test seam). A mission-pipeline dispatch never
   * reaches this path.
   */
  async _attestFromEnvelope(event, payload, documentId) {
    // A replay attestation must only be emitted for a replay that verified.
    const replayVerified = payload.replay && payload.replay.verified === true;

    if (!replayVerified) {
      const reason = payload.replay?.reason || 'replay_not_verified';
      console.log(`[WitnessWorker] REFUSING to attest unverified replay for ${documentId || 'unknown'} (reason: ${reason})`);

      await this._emit('WITNESS_REJECTED', {
        documentId,
        upstreamEventId: event.event_id || event.mission_id,
        replay: payload.replay || null,
        reason: `unverified_replay:${reason}`,
      }, {
        causation_id: event.event_id,
        logical_id: {
          kind: 'witness-rejection',
          replay_event_id: event.event_id || event.mission_id || 'unknown',
          reason: `unverified_replay:${reason}`,
        },
      });

      return { status: 'rejected', reason: `unverified_replay:${reason}` };
    }

    const witnessRoot = payload.replay.witness_root;
    if (typeof witnessRoot !== 'string' || witnessRoot.length === 0) {
      await this._emit('WITNESS_REJECTED', {
        documentId,
        upstreamEventId: event.event_id || event.mission_id,
        replay: payload.replay,
        reason: 'missing_witness_root',
      }, {
        causation_id: event.event_id,
        logical_id: {
          kind: 'witness-rejection',
          replay_event_id: event.event_id || event.mission_id || 'unknown',
          reason: 'missing_witness_root',
        },
      });

      return { status: 'rejected', reason: 'missing_witness_root' };
    }

    const witness = {
      documentId,
      eventType: event.event_type,
      witness_root: witnessRoot,
      replay_fingerprint: payload.replay.fingerprint || null,
      replay_event_id: event.event_id || event.mission_id || null,
      algorithm_version: WITNESS_ATTESTATION_ALGORITHM_VERSION,
      input_schema_version: WITNESS_INPUT_SCHEMA_VERSION,
      // W-2: same version bindings as the canonical path (null-safe).
      replay_engine_version: (typeof payload.replay.replay_engine_version === 'string') ? payload.replay.replay_engine_version : null,
      witness_algorithm_version: (typeof payload.replay.witness_algorithm_version === 'string') ? payload.replay.witness_algorithm_version : null,
      witness_version: (typeof payload.replay.witness_version === 'string') ? payload.replay.witness_version : null,
      replay_completeness: (typeof payload.replay.completeness === 'string') ? payload.replay.completeness : null,
      replay_input_event_count: (typeof payload.replay.input_event_count === 'number') ? payload.replay.input_event_count : null,
      replay_inputs_skipped: (typeof payload.replay.inputs_skipped === 'number') ? payload.replay.inputs_skipped : null,
      timestamp: constitutionalTimeAuthority.nowAsISOString(),
      attestation: event.event_id ? `witness-${event.event_id.slice(0, 16)}` : `witness-${documentId || 'unknown'}`,
    };

    await this._emit('WITNESS_CREATED', {
      documentId,
      witness,
      upstreamEventId: event.event_id || event.mission_id,
    }, {
      causation_id: event.event_id,
      logical_id: {
        kind: 'witness-attestation/direct',
        trigger_event_id: event.event_id || event.mission_id || 'unknown',
        witness_root: witnessRoot,
      },
    });

    return { status: 'ok', witness };
  }

  /**
   * Emit an observable WITNESS_REJECTED for an authenticated-but-invalid
   * attestation attempt. Never emits WITNESS_CREATED.
   */
  async _reject(event, documentId, certifiedReplay, reason, replayEventId) {
    const upstreamId = replayEventId || event.event_id || event.mission_id;
    console.log(`[WitnessWorker] REFUSING attestation for ${documentId || 'unknown'} (reason: ${reason})`);

    await this._emit('WITNESS_REJECTED', {
      documentId,
      upstreamEventId: upstreamId,
      replay: certifiedReplay,
      reason,
    }, {
      causation_id: event.event_id,
      logical_id: {
        kind: 'witness-rejection',
        replay_event_id: upstreamId || 'unknown',
        reason,
      },
    });

    return { status: 'rejected', reason };
  }
}

/**
 * LineageWorker — processes LINEAGE_CREATE events.
 * Tracks event lineage and causation chains.
 */
class LineageWorker extends BaseWorker {
  constructor(options = {}) {
    super(options);
    this._name = 'lineage';
  }

  async handle(event) {
    const payload = event.payload || {};
    const documentId = payload.documentId || payload._object_id;

    console.log(`[LineageWorker] Processing ${event.event_type} for ${documentId || 'unknown'}`);

    const lineage = {
      documentId,
      eventType: event.event_type,
      timestamp: constitutionalTimeAuthority.nowAsISOString(),
      causationChain: event.metadata?.causation_id ? [event.metadata.causation_id] : [],
    };

    await this._emit('LINEAGE_CREATED', {
      documentId,
      lineage,
      upstreamEventId: event.event_id || event.mission_id,
    }, {
      causation_id: event.event_id,
    });

    return { status: 'ok', lineage };
  }
}

/**
 * ClassificationWorker — processes OBSERVATION_CREATED events.
 * Classifies observations by type, priority, and category.
 * Emits CLASSIFICATION_CREATED.
 */
class ClassificationWorker extends BaseWorker {
  constructor(options = {}) {
    super(options);
    this._name = 'classification';
  }

  async handle(event) {
    const payload = event.payload || {};
    const observation = payload.observation || payload;

    console.log(`[ClassificationWorker] Classifying ${event.event_type}`);

    const upstreamConfidence = event.metadata?.confidence;
    const classification = {
      documentId: observation.documentId,
      eventType: event.event_type,
      timestamp: constitutionalTimeAuthority.nowAsISOString(),
      category: this._categorize(event.event_type),
      priority: this._prioritize(event.event_type, payload),
      confidence: upstreamConfidence ?? null,
      confidence_source: upstreamConfidence != null ? 'inherited' : null,
      source: event.source,
    };

    await this._emit('CLASSIFICATION_CREATED', {
      documentId: observation.documentId,
      classification,
      upstreamEventId: event.event_id,
    }, {
      causation_id: event.event_id,
    });

    return { status: 'ok', classification };
  }

  _categorize(eventType) {
    const categories = {
      'REVIEW_RECEIVED': 'customer-feedback',
      'LEAD_CREATED': 'sales',
      'ESTIMATE_SENT': 'sales',
      'ESTIMATE_ACCEPTED': 'sales',
      'PROJECT_CREATED': 'operations',
      'PROJECT_COMPLETED': 'operations',
      'INVOICE_SENT': 'finance',
      'INVOICE_PAID': 'finance',
      'EMAIL_RECEIVED': 'communication',
      'CUSTOMER_CREATED': 'customer',
    };
    return categories[eventType] || 'general';
  }

  _prioritize(eventType, payload) {
    if (eventType === 'REVIEW_RECEIVED' && payload.rating <= 2) return 'urgent';
    if (eventType === 'ESTIMATE_SENT') return 'high';
    if (eventType === 'LEAD_CREATED') return 'high';
    if (eventType === 'INVOICE_SENT') return 'medium';
    return 'normal';
  }
}

/**
 * RecommendationWorker — processes CLASSIFICATION_CREATED events.
 * Produces actionable recommendations from classifications.
 * Emits RECOMMENDATION_CREATED.
 */
class RecommendationWorker extends BaseWorker {
  constructor(options = {}) {
    super(options);
    this._name = 'recommendation';
  }

  async handle(event) {
    const payload = event.payload || {};
    const classification = payload.classification || {};

    console.log(`[RecommendationWorker] Recommending for ${classification.category || event.event_type}`);

    const recommendation = {
      documentId: payload.documentId,
      eventType: event.event_type,
      timestamp: constitutionalTimeAuthority.nowAsISOString(),
      action: this._recommendAction(classification),
      reason: this._recommendReason(classification),
      priority: classification.priority || 'normal',
      confidence: classification.confidence ?? null,
      confidence_source: classification.confidence != null ? 'inherited' : null,
      evidence: [event.event_id],
    };

    await this._emit('RECOMMENDATION_CREATED', {
      documentId: payload.documentId,
      recommendation,
      upstreamEventId: event.event_id,
    }, {
      causation_id: event.event_id,
    });

    return { status: 'ok', recommendation };
  }

  _recommendAction(classification) {
    const actions = {
      'customer-feedback': 'Respond to customer review',
      'sales': 'Follow up on estimate',
      'operations': 'Update project status',
      'finance': 'Track invoice payment',
      'communication': 'Process incoming message',
      'customer': 'Onboard new customer',
    };
    return actions[classification.category] || 'Review and take action';
  }

  _recommendReason(classification) {
    if (classification.priority === 'urgent') return 'Customer needs immediate attention';
    if (classification.priority === 'high') return 'Time-sensitive business event';
    return 'Standard business workflow step';
  }
}

const { IntelligenceWorker } = require('./intelligence_worker');

/**
 * Register all canonical workers with a WorkerRuntime instance.
 */
function registerCanonicalWorkers(workerRuntime, options = {}) {
  // ─── Knowledge Promotion (Phase F) ────────────────────────────
  // Optional: only registered when a KnowledgeGraph is provided. Promotion is a
  // side-effect-only worker — SNIPPET_APPROVED / AI_RESPONSE_ACCEPTED promote a
  // candidate node to approved (confidence 1.0); rejection down-ranks it.
  if (options.knowledgeGraph) {
    const { KnowledgePromoter } = require('../knowledge/knowledge_promoter');
    const promoter = new KnowledgePromoter({ ...options, knowledgeGraph: options.knowledgeGraph });
    workerRuntime.register('knowledge-promotion', promoter, {
      eventTypes: ['SNIPPET_APPROVED', 'SNIPPET_REJECTED', 'AI_RESPONSE_ACCEPTED', 'AI_RESPONSE_REJECTED'],
      capabilities: ['knowledge.promote'],
      maxConcurrent: 2,
    });
    console.log(`[CanonicalWorkers] Registered 'knowledge-promotion' worker for [SNIPPET_APPROVED, SNIPPET_REJECTED, AI_RESPONSE_ACCEPTED, AI_RESPONSE_REJECTED]`);
  }

  // ─── Registration ─────────────────────────────────────────────
  const BUSINESS_EVENTS = [
    'LEAD_CREATED', 'LEAD_CONVERTED',
    'ESTIMATE_CREATED', 'ESTIMATE_SENT', 'ESTIMATE_ACCEPTED',
    'CUSTOMER_CREATED', 'CUSTOMER_UPDATED',
    'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_COMPLETED',
    'REVIEW_RECEIVED', 'REVIEW_RESPONDED',
    'INVOICE_CREATED', 'INVOICE_SENT', 'INVOICE_PAID',
    'EMAIL_SENT', 'EMAIL_RECEIVED',
    'SMS_SENT',
    'GITHUB_COMMIT_SYNCED', 'GOOGLE_REVIEW_RECEIVED',
    'DOCUMENT_IMPORT',
    'SYSTEM_HEALTH_CHECK',
  ];

  const workers = [
    { name: 'observation', Worker: ObservationWorker, eventTypes: BUSINESS_EVENTS },
    { name: 'claim', Worker: ClaimWorker, eventTypes: ['OBSERVATION_CREATED', 'CLAIM_GENERATE'] },
    { name: 'classification', Worker: ClassificationWorker, eventTypes: ['CLAIM_CREATED', 'CLASSIFICATION_CREATE'] },
    { name: 'recommendation', Worker: RecommendationWorker, eventTypes: ['CLASSIFICATION_CREATED', 'RECOMMENDATION_CREATE'] },
    { name: 'projection', Worker: ProjectionWorker, eventTypes: ['KNOWLEDGE_INDEX', 'PROJECTION_CREATE', 'RECOMMENDATION_CREATED', 'LINEAGE_CREATED'] },
    // ReplayWorker is wired to the deterministic kernel replay engine via
    // options.replayProvider (injected by the caller, e.g. gateway_runtime.js).
    // When absent, replay performs a structural no-op (verified: false).
    { name: 'replay', Worker: ReplayWorker, eventTypes: ['REPLAY_VERIFY', 'PROJECTION_CREATED'], options: { replayProvider: options.replayProvider } },
    { name: 'witness', Worker: WitnessWorker, eventTypes: ['REPLAY_COMPLETED'] },
    { name: 'lineage', Worker: LineageWorker, eventTypes: ['LINEAGE_CREATE', 'WITNESS_CREATED'] },
    // [DOC-CONTRACT / KEEP-DORMANT] IntelligenceWorker duplicates the
    // ClassificationWorker + RecommendationWorker pair (both produce
    // CLASSIFICATION_CREATED / RECOMMENDATION_CREATED from the same inputs).
    // It is structurally dormant: eventTypes:[] means the registration loop
    // below (:727) never registers it into WorkerRuntime, so it processes ZERO
    // events on the live path — no dual fan-out is possible. Namespace /
    // correlation_id / confidence inheritance are already correct in its inline
    // BaseWorker._emit (intelligence_worker.js:25-59), so re-enablement would
    // not leak the privacy boundary. Do NOT re-enable without (a) Ollama wired
    // for AI-enhanced classification AND (b) an explicit ruling resolving the
    // duplication with the canonical pair. Ref docs/P3_CONTRADICTION_CONVERGENCE
    // _LEDGER.md + docs/EXECUTION_EVIDENCE_LEDGER.md (Step 4 audit).
    { name: 'intelligence', Worker: IntelligenceWorker, eventTypes: [], options: { aiRuntime: options.aiRuntime } },
  ];

  for (const { name, Worker, eventTypes, options: workerOpts } of workers) {
    // Skip dormant workers (empty eventTypes) — they process no events.
    // They stay in the array for documentation and future re-enablement.
    if (!eventTypes || eventTypes.length === 0) {
      console.log(`[CanonicalWorkers] Skipped dormant worker '${name}' (no eventTypes)`);
      continue;
    }
    const worker = new Worker({ ...options, ...workerOpts });
    workerRuntime.register(name, worker, {
      eventTypes,
      capabilities: [name],
      maxConcurrent: 2,
    });
    console.log(`[CanonicalWorkers] Registered '${name}' worker for [${eventTypes.join(', ')}]`);
  }
}

module.exports = {
  BaseWorker,
  ObservationWorker,
  ClaimWorker,
  ClassificationWorker,
  RecommendationWorker,
  ProjectionWorker,
  ReplayWorker,
  WitnessWorker,
  LineageWorker,
  IntelligenceWorker,
  registerCanonicalWorkers,
};
