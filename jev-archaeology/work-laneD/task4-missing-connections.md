# TASK 4 — Missing connections (both endpoints exist, wiring absent)

C1. ReplayWorker._buildReplayEvents → UnifiedEventRuntime.getCorrelationGroup
    - Consumer: canonical_workers.js:427-446 ("In production, this would query Postgres...
      For now, return the triggering event as a single-event replay").
    - Provider: unified_event_runtime.js:348 getCorrelationGroup(correlationId, limit) —
      EXISTS and is used by /mc/replay/trace/:correlationId.
    - Gap: ~15 lines. Effect: replay would verify the actual causal chain instead of one
      event. This is the single cheapest determinism upgrade in the system.

C2. KnowledgePromoter ← approval-event producers
    - Consumer: 'knowledge-promotion' worker, live-registered, 0 processed.
    - Producer: NONE live. Only gateway/generated/event_generator.js (build-time P024
      generator, used by tests) names SNIPPET_APPROVED/AI_RESPONSE_ACCEPTED.
    - Gap: a real emitter (AI chat UI accept/reject, snippet review API). Without it the
      LEARN stage is live but starved.

C3. BusinessActionAuthority + EffectAuthority → HTTP routes
    - Mechanisms exist (proposeAction PENDING_HUMAN; createEffect with canonical ids).
    - No route exposes propose/decide. mission_control.js has zero approval endpoints.
    - Gap: a /approvals route (auth-gated). Unblocks human-gated EXECUTE.

C4. ContinuousAcquisition → UnifiedEventRuntime
    - Acquisition takes (postgresPool, objectRegistry, eventBus); nothing instantiates it.
    - The live bridge ALREADY maps GITHUB_COMMIT_SYNCED → DOCUMENT_IMPORT mission
      (event_to_mission_bridge.js:48).
    - Gap: instantiate with the live eventRuntime; emit GITHUB_COMMIT_SYNCED per
      acquired commit. Gives the pipeline a real repo OBSERVE source.

C5. MergeGate.can_commit → PatchAuthority
    - MergeGate.summary() returns can_commit (merge_gate.js). PatchAuthority validates
      and applies patches. No connection between gate verdict and patch application.
    - Gap: patch application requires gate pass. (Both currently off the live path.)

C6. DormantClassifier output → consumer
    - dormant_classifications/*.json: 466 modules, 175 migrate / 56 resurrect / 257
      needs_review. Written at engine init. Nothing reads it back.
    - Gap: any loop (convergence tracker, migration planner) consuming the inventory.

C7. Decision artifact on the live path
    - Task example was "ApprovalAuthority + PatchAuthority + no general decision artifact".
      Actual state: legacy ApprovalAuthority orphaned; current BusinessActionAuthority
      unwired; MergeDecisionArtifact/ProposalArtifact exist ONLY in the quiescent engine
      (artifact_authorities.js). The live pipeline has RECOMMENDATION_CREATED (proposal)
      but no live proposal→decision record. This is the one case needing a small new
      artifact rather than pure wiring (see Task 5 D1).

C8. (Checked, NOT missing) OllamaAdapter → provider registry
    - Task example hypothesized a wrong/missing interface import. Actual: old
      gateway/ollama_adapter.js is simply orphaned; live path correctly uses
      ping-runtime/ai/ollama_provider.js registered in AIRuntime (gateway_runtime.js:229-236).
      No wiring bug — just a dead file. Reclassify as DUPLICATED/SUPERSEDED, not a
      missing connection.

C9. (Checked, NOT missing) AcquisitionManager → UnifiedEventRuntime
    - No AcquisitionManager exists (name was hypothetical). The real class is
      AcquisitionAuthority, covered by C4.
