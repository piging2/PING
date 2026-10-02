# CONTRADICTION resolution: pipeline ordering (flaw correction a + directive section 36)

Observed: 2026-09-22 ~20:05 MDT. Source revision: worktree jev-surgical @ cc6856c3bc78e0535e66f168c66dc31abee2c073. Runtime revision: NOT the Sep-16 deployment image; conclusions below are source-proven, runtime must be re-verified on the deployment separately (directive section 34).

## THE CONTRADICTION
Two sequences appeared in prior reporting:
- (A) Bridge-derived: OBSERVATION -> CLAIM -> CLASSIFICATION -> RECOMMENDATION -> PROJECTION -> REPLAY -> WITNESS -> LINEAGE
- (B) First-slice recommendation: DOCUMENT_IMPORT -> OBSERVATION -> CLAIM -> REPLAY -> WITNESS -> LINEAGE -> PROJECTION

## RESOLUTION

**ACTUAL RUNTIME ORDER** (proven from source, three independent anchors):
1. EVENT_MISSION_MAP (event_to_mission_bridge.js:61-66): CLASSIFICATION_CREATED -> RECOMMENDATION_CREATE; RECOMMENDATION_CREATED -> PROJECTION_CREATE; PROJECTION_CREATED -> REPLAY_VERIFY; REPLAY_COMPLETED -> WITNESS_CREATE; WITNESS_CREATED -> LINEAGE_CREATE; LINEAGE_CREATED terminal.
2. MISSION_WORKER_MAP (mission_scheduler.js:43-51): DOCUMENT_IMPORT -> observation; CLAIM_GENERATE -> claim; CLASSIFICATION_CREATE -> classification; RECOMMENDATION_CREATE -> recommendation; PROJECTION_CREATE -> projection; REPLAY_VERIFY -> replay; WITNESS_CREATE -> witness; LINEAGE_CREATE -> lineage.
3. WorkerRuntime.dispatch is the single dispatch path (worker_runtime.js:50: "Workers receive events via dispatch() only (MissionScheduler is the single dispatch path)"). The scheduler dispatches the ORIGINAL event type per mission; workers fire only when a mission exists.

Actual chain: DOCUMENT_IMPORT -> OBSERVATION_CREATED -> CLAIM_CREATED -> CLASSIFICATION_CREATED -> RECOMMENDATION_CREATED -> PROJECTION_CREATED -> REPLAY_COMPLETED -> WITNESS_CREATED -> LINEAGE_CREATED (terminal, no mission).

**INTENDED ORDER**: identical to actual. Commit 6db4a961c (2026-08-19) deliberately wired the full chain through REPLAY -> WITNESS -> LINEAGE. Projection before replay is intended: replay verifies the projection.

**FIRST-SLICE ORDER** (B): was the archaeology's proposed Jev evaluation scope, not a claim about runtime order. It is superseded: any work built on "projection after lineage" must be corrected to actual order. The record is corrected here, not deleted.

## SECTION 36: ProjectionWorker handles LINEAGE_CREATED anyway
Classification: **dead handler** (not a missing bridge edge, not an alternate dispatch path).
- ProjectionWorker subscribes to ['KNOWLEDGE_INDEX','PROJECTION_CREATE','RECOMMENDATION_CREATED','LINEAGE_CREATED'] (canonical_workers.js:730), and its handle() unconditionally emits PROJECTION_CREATED for any trigger.
- But LINEAGE_CREATED has no bridge mapping, so no mission is ever created for it, so MissionScheduler never dispatches it, so the handler never fires in production.
- No cycle exists: a LINEAGE_CREATED -> PROJECTION_CREATED -> REPLAY -> WITNESS -> LINEAGE loop would require dispatch outside the mission path, and none exists (only test files and the unrelated ConstitutionalDispatcher call dispatch()).
- The subscription dates to commit 6db4a961c's uniform "listen for trigger events" pattern; for LINEAGE_CREATED the trigger has no mission, making that one entry inert.
- Left in place, not patched: removing it is safe but out of scope for this batch; recorded as known-dead. Do not build on the assumption it fires.

## IMPACT ON JEV WORK
- The P3 shadow worker subscribes to CLAIM_CREATED and emits JEV_DECISION_EVALUATED (no bridge mapping, terminal). It cannot create a dispatch loop: its emission creates no mission.
- JEV_DECISION_EVALUATED joins the claim's correlation group via BaseWorker._emit correlation preservation, so P1 causal replay includes it. Ordering within the group follows existing created_at ASC semantics.

## FALSIFICATION CONDITION
If a production trace shows LINEAGE_CREATED dispatched to any worker, or any event dispatched without a mission, the single-dispatch-path claim is broken and this resolution is invalid.
