# PATCH-01 (PROPOSED, NOT APPLIED) — `projected_at` hardcoded null in Qdrant projection

**Target (live core, read-only):** `/home/nolan/ping`, branch `refactor/runtime-authority-convergence`
**File:** `ping-runtime/embeddings/embedding_service.js`, `projectToQdrant()` payload construction (~line 240)
**Status:** PROPOSED ONLY — live core is read-only for this sprint. No file modified, nothing staged, COMMITS CREATED: NONE.

## WHY
Every point in the live `knowledge` collection (389/389) carries `projected_at: null`, so the semantic layer has no temporal signal: staleness queries ("what was projected before the Ollama outage?", "which points predate the last re-embed?") are unanswerable, and any future drift-detection or re-embed sweep has no cursor to work from. The field exists in the payload schema — it is simply never populated. This is an unambiguous minimal correction: populate the field the schema already declares, at the single site that constructs it.

## EVIDENCE
- `curl -s -X POST localhost:6333/collections/knowledge/points/scroll -d '{"limit":500,"with_payload":["projected_at"],"with_vector":false}'` → `projected_at` non-null count = **0/389** (brain-qdrant, 2026-09-23).
- `ping-runtime/embeddings/embedding_service.js`, `projectToQdrant()`: payload literal contains `projected_at: null` (hardcoded, not derived).
- No other writer constructs `knowledge`-collection payloads (sole writer: `EmbeddingService`, via `QdrantAdapter.upsert`; verified by caller grep — only `gateway/bootstrap/gateway_runtime.js` and `ping-runtime/workers/canonical_workers.js` reference it).

## MINIMUM CHANGE
```diff
--- a/ping-runtime/embeddings/embedding_service.js
+++ b/ping-runtime/embeddings/embedding_service.js
@@ projectToQdrant(canonicalObject, options = {})
         text,
         embedding: fallback ? 'fallback' : 'ollama',
         model,
-        projected_at: null,
+        projected_at: new Date().toISOString(),
       },
```
One line. No signature changes, no new dependencies, no behavior change to retrieval (the field is currently unread by all readers — verified: no `projected_at` readers in `ping-runtime/` or `gateway/`). Existing null-valued points are untouched (upsert only overwrites on re-projection of the same event ID, which is the correct conservative behavior for immutable journal events).

## TEST (proposed — NOT EXECUTED; live core is read-only)
1. Unit: construct `EmbeddingService` with a stub `qdrantAdapter` capturing the upserted point and a stub `aiRuntime` returning a fixed 768-d vector; call `projectToQdrant({id:'abc123', kind:'OBSERVATION_CREATED', payload:{text:'hello'}}, {sourceEventId:'abc123'})`; assert `point.payload.projected_at` matches `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/` and `Date.parse(...)` is within 60s of now.
2. Regression: run existing `gateway/test_knowledge_search.js` (or its successor) — expect no change in search results shape (new field is additive).
3. Live verification (morning, with approval): after deploy, scroll one newly projected point and confirm `projected_at` is a current ISO timestamp.

## RESULT
Not applied. Awaiting owner/convergence-wave approval to land on the live core. If approved, the natural follow-up (out of minimal-patch scope, flagged to Agent 04): a one-time backfill is NOT recommended for immutable event projections (rewriting 389 points gains nothing — old points keep null, new points get timestamps; consumers must treat null as "unknown age"), but a re-embed sweep for the 187 `embedding:'fallback'` noise points SHOULD use `projected_at` as its cursor once this lands.

## Out of scope for this patch (recorded as findings, not patched)
- `canonical_hash` null on 94% of points → root cause is the emitter (`UnifiedEventRuntime.emit`) never setting `event.metadata.canonical_hash`; fixing requires Agent 01/04's emitter-side verdict, not a projection-side guess.
- Missing delete path / stale-point accumulation → needs a lifecycle design decision (tombstone events vs. TTL), not a one-liner.
- Unauthenticated brain-qdrant REST and unauthenticated `POST /knowledge/nodes|/edges` → Agent 06 (capability) remediation.
