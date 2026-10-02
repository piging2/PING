/**
 * Canonical Workers — PING Core v1
 *
 * 6 canonical JS workers extracted from 38 implementations across 7 generations.
 * Plus IntelligenceWorker (Priority 6) — rule-based + optional Ollama.
 * Each worker handles specific event types and emits downstream events.
 *
 * Event pipeline:
 *   DOCUMENT_IMPORT → OBSERVATION_CREATE → CLAIM_GENERATE → REPLAY_VERIFY → WITNESS_CREATE → LINEAGE_CREATE → PROJECTION_CREATE
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
    const documentId = payload._object_id || payload.documentId || payload.id;

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
    const violations = kernelResult.violations || [];
    const isVerified = kernelResult.status === 'ok' && violations.length === 0;

    const replay = {
      documentId,
      eventType: event.event_type,
      timestamp: constitutionalTimeAuthority.nowAsISOString(),
      verified: isVerified,
      reason: isVerified ? 'kernel_verified' : (kernelResult.status || 'kernel_failed'),
      fingerprint: kernelResult.fingerprint || null,
      witness_root: kernelResult.witness_root || null,
      violations,
      event_count: kernelResult.event_count || 0,
      artifact_count: kernelResult.artifact_count || 0,
      state_version: kernelResult.state_version || null,
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
 * WitnessWorker — processes WITNESS_CREATE events.
 * Creates witness attestations for events.
 */
class WitnessWorker extends BaseWorker {
  constructor(options = {}) {
    super(options);
    this._name = 'witness';
  }

  async handle(event) {
    // Set the triggering event so _emit's trace contract (namespace,
    // correlation_id, causation_id inheritance) works on direct invocation —
    // identical to WorkerRuntime.dispatch, which sets this._event first.
    this._event = event;
    const payload = event.payload || {};
    const documentId = payload.documentId || payload._object_id;

    console.log(`[WitnessWorker] Processing ${event.event_type} for ${documentId || 'unknown'}`);

    // Failure-honesty gate (W7): on REPLAY_COMPLETED the witness must ONLY
    // attest a replay that actually verified. If verification is absent or
    // false, the witness refuses to attest (never fabricates an attestation
    // for an unverified replay) and records an observable WITNESS_REJECTED.
    const isReplayAttestation = event.event_type === 'REPLAY_COMPLETED';
    const replayVerified = payload.replay && payload.replay.verified === true;

    if (isReplayAttestation && !replayVerified) {
      const reason = payload.replay?.reason || 'replay_not_verified';
      console.log(`[WitnessWorker] REFUSING to attest unverified replay for ${documentId || 'unknown'} (reason: ${reason})`);

      await this._emit('WITNESS_REJECTED', {
        documentId,
        upstreamEventId: event.event_id || event.mission_id,
        replay: payload.replay || null,
        reason: `unverified_replay:${reason}`,
      }, {
        causation_id: event.event_id,
      });

      return { status: 'rejected', reason: `unverified_replay:${reason}` };
    }

    const witness = {
      documentId,
      eventType: event.event_type,
      timestamp: constitutionalTimeAuthority.nowAsISOString(),
      attestation: event.event_id ? `witness-${event.event_id.slice(0, 16)}` : `witness-${documentId || 'unknown'}`,
    };

    await this._emit('WITNESS_CREATED', {
      documentId,
      witness,
      upstreamEventId: event.event_id || event.mission_id,
    }, {
      causation_id: event.event_id,
    });

    return { status: 'ok', witness };
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
    { name: 'witness', Worker: WitnessWorker, eventTypes: ['WITNESS_CREATE', 'REPLAY_COMPLETED'] },
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
