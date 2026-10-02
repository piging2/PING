# Proposal: single writer for Qdrant `knowledge` points — remove ProjectionWorker's direct projectToQdrant path

**Agent:** agent04-projection-retrieval (owns: projection/derived-data paths — Qdrant writers)
**Target file:** `/home/nolan/ping/ping-runtime/workers/canonical_workers.js` (ProjectionWorker.handle, lines ~182-210)
**Mode:** PROPOSE-ONLY (live core; no agent applies). WRITER-OWNERSHIP registry consulted; no competing proposal known.

## WHY

Two live writers project to the same Qdrant point id (`toQdrantId(event_id)`), violating one-writer-per-mutable-semantic-unit. Last-write-wins between them is nondeterministic when the embedding backend differs (Ollama vs deterministic fallback).

## EVIDENCE

- Writer A: `EmbeddingService.subscribe(unifiedEventRuntime)` — `ping-runtime/embeddings/embedding_service.js:123-160`, wired live at `gateway/bootstrap/gateway_runtime.js:494-502`. Subscribes to `INDEXABLE_TYPES`, which includes `RECOMMENDATION_CREATED` (embedding_service.js:34) and `PROJECTION_CREATED` (embedding_service.js:35).
- Writer B: `ProjectionWorker.handle` — `ping-runtime/workers/canonical_workers.js:186-208` calls `this._embeddingService.projectToQdrant({id: event.event_id, ...})` directly. Registered live for `['KNOWLEDGE_INDEX', 'PROJECTION_CREATE', 'RECOMMENDATION_CREATED', 'LINEAGE_CREATED']` (canonical_workers.js:709), wired in bootstrap (gateway_runtime.js:509-518, options.embeddingService at :518).
- Convergence: `RECOMMENDATION_CREATED` journal events become `PROJECTION_CREATE` missions via `EVENT_MISSION_MAP` (`ping-runtime/orchestration/event_to_mission_bridge.js:62`), carrying the journal `event_id` into the mission payload (`event_to_mission_bridge.js:125`). MissionScheduler dispatches with `event_id: payload.event_id || mission.mission_id` (`ping-runtime/orchestration/mission_scheduler.js:230-236`) into `WorkerRuntime.dispatch` (`mission_scheduler.js:250`). ProjectionWorker then upserts the SAME point id Writer A wrote at emit time.
- Live proof of the loop's output: Qdrant `knowledge` collection (389 points, 768-d Cosine) contains a `PROJECTION_CREATED` point (`source_event_id` present) — a projection of a projection event, reachable only because ProjectionWorker journals `PROJECTION_CREATED` and Writer A embeds it.
- Mixed vector provenance in one index: points tagged `embedding: 'fallback'` (deterministic seeded) coexist with `embedding: 'ollama'` under one model name; `EmbeddingService.search()` does not filter them apart.

## MINIMUM CHANGE

In `ProjectionWorker.handle`, delete the direct-Qdrant block (keep the `PROJECTION_CREATED` journal emit):

```diff
     await this._emit('PROJECTION_CREATED', {
       documentId,
       projection,
       upstreamEventId: event.event_id || event.mission_id,
     }, {
       causation_id: event.event_id,
     });
 
-    // This worker's purpose: write the canonical observation to Qdrant.
-    if (this._embeddingService) {
-      try {
-        const point = await this._embeddingService.projectToQdrant({
-          id: event.event_id,
-          kind: event.event_type,
-          event_id: event.event_id,
-          namespace: event.namespace,
-          canonical_hash: (event.metadata && event.metadata.canonical_hash) || null,
-          identity: event.identity || null,
-          payload: event.payload || {},
-        }, {
-          sourceEventId: event.event_id,
-          eventType: event.event_type,
-          namespace: event.namespace,
-        });
-        console.log(`[ProjectionWorker] Projected ${event.event_type} → qdrant point ${point.id.slice(0, 12)}`);
-      } catch (err) {
-        console.error(`[ProjectionWorker] Qdrant projection failed: ${err.message}`);
-      }
-    }
-
     return { status: 'ok', projection };
```

Coverage is preserved: the worker still journals `PROJECTION_CREATED`, which Writer A (the surviving single writer) projects because `PROJECTION_CREATED` is in `INDEXABLE_TYPES`. `constructor` may then drop the now-unused `this._embeddingService` assignment (optional; harmless to keep).

Alternative considered and rejected: removing `PROJECTION_CREATED` from `INDEXABLE_TYPES` instead — this would strand worker-derived projections un-embedded and leave the double-writer for `RECOMMENDATION_CREATED` intact. The chosen direction keeps one writer and full coverage.

## TEST

1. Static: after the change, `grep -rn 'projectToQdrant' --include='*.js' ping-runtime/ gateway/` must show callers only inside `embedding_service.js` itself (subscribe handler) plus tests.
2. Behavioral: emit one `RECOMMENDATION_CREATED` event through a test `UnifiedEventRuntime` with a recording qdrant adapter; assert exactly one `upsert` to the `knowledge` collection for the event's point id. (Note: core JS test harness state is degraded — `tests/*.test.js` crash on missing `gateway/adapter_compiler`; run via node directly, not the dead pipeline.)
3. Regression: emit one `PROJECTION_CREATE` mission through `WorkerRuntime.dispatch` with a stubbed runtime; assert a `PROJECTION_CREATED` journal row is emitted and no direct Qdrant call occurs from the worker.

## RESULT

NOT EXECUTED — propose-only per live-core rule. Awaiting coordinator/agent-20 conflict check, then a core-side owner to apply and run the tests above.
