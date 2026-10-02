# PATCH-07 — Projection Observability (materialization events + documented contract)

- **AXIOMS CLOSED:** F2 (for the projection path), P1 (documentation).
- **FILES:** `ping-runtime/workers/canonical_workers.js` (`ProjectionWorker.handle`).
- **SYMBOLS:** `ProjectionWorker.handle`, `PROJECTION_CREATED`, `PROJECTION_MATERIALIZED`, `PROJECTION_FAILED`.
- **SCHEMA CHANGE:** None.
- **BEFORE:** `PROJECTION_CREATED` emitted BEFORE the Qdrant attempt; Qdrant failure swallowed (`console.error` only); `handle` returns ok regardless. The event means (B) canonical projection specification created, but nothing in the journal records whether Qdrant materialization succeeded. Every projection triggers a replay mission via the bridge, so replays attest projections whose Qdrant write may have failed silently.
- **AFTER:** (1) Doc comment on `handle` stating the emit-before-materialize contract: PROJECTION_CREATED = "the canonical projection object (a deterministic function of the canonical event) has been created and recorded in ping_events; Qdrant materialization is an explicitly disposable, best-effort side effect this event does NOT attest." (2) After the Qdrant attempt, emit `PROJECTION_MATERIALIZED` (with `point.id`) or `PROJECTION_FAILED` (with `error`, `retryable:true`). The `PROJECTION_CREATED -> REPLAY_VERIFY` bridge mapping is unchanged.
- **ALGORITHM:** try { upsert } catch -> emit PROJECTION_FAILED (retryable) instead of swallowing; success -> emit PROJECTION_MATERIALIZED. The materialization events carry `causation_id` = the PROJECTION_CREATED event_id.
- **PSEUDODIFF:**
  ```js
  await this._emit('PROJECTION_CREATED', {documentId, projection, upstreamEventId}, ...); // contract comment
  try { const point = await this._embeddingService.projectToQdrant(...); await this._emit('PROJECTION_MATERIALIZED', {pointId: point.id, ...}); }
  catch (err) { await this._emit('PROJECTION_FAILED', {error: err.message, retryable: true, ...}); }
  ```
- **FAIL-BEFORE TEST:** Qdrant down; assert `handle` returns ok with zero journal trace of the failure (documents the swallow).
- **PASS-AFTER TEST:** Qdrant down; assert exactly one PROJECTION_FAILED with `retryable:true`; Qdrant up; assert PROJECTION_MATERIALIZED with the point id.
- **CRASH TEST:** KILL between materialize emit and return -> re-execution dedups via PATCH-06 logical_id on PROJECTION_CREATED; materialization events are idempotent observations.
- **CONCURRENCY TEST:** n/a.
- **HISTORY TEST:** Historical PROJECTION_CREATED rows keep meaning (B); no backfill of materialization events.
- **NAMESPACE TEST:** Materialization events inherit namespace from the projection event.
- **SECURITY TEST:** Error strings in PROJECTION_FAILED must not leak credentials (Qdrant client errors sanitized).
- **DEPENDENCIES:** PATCH-06 (logical_id on the projection emit); independent of PATCH-01/02.
- **MIGRATION:** None. Optional: register the two new event types in the event registry (they are observations, not mission triggers).
- **ROLLBACK:** Revert to swallow; the doc comment stays (harmless).
- **OBSERVABILITY:** This IS the observability patch: `PROJECTION_FAILED` rate becomes the Qdrant-health signal; alert on sustained failures.
- **RESIDUAL FAILURE:** Materialization remains best-effort (by design: Qdrant is disposable); rebuildability (P1) is the recovery story, proven by rescan.
- **COMPLEXITY:** Trivial (~15 lines + comment).
- **CONFIDENCE:** High.
