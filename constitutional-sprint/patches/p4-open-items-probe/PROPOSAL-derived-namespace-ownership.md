# Proposal: one-authority decision for the derived-namespace question (F76)

**Provisional finding:** W4-F2 (target 2 of the AGENT-04 open-items probe)
**Agent:** AGENT-04 open-items probe (owns: projection/derived-data paths per WRITER-OWNERSHIP.md)
**Mode:** PROPOSE ONLY. No code written, no mechanism built. For coordinator decision.
**Status at filing:** the proposal is unbuilt; F76 stands as the live defect.

## WHY

`ProjectionWorker` journals `PROJECTION_CREATED` — a description of its own projection act — into sovereign `ping_events`, and `EmbeddingService` embeds that derived row into Qdrant (F76; live `PROJECTION_CREATED` point sampled 2026-09-23). Source and derived events are distinguishable only by the `event_type` string, and worker retry produces duplicate derived rows (wall-clock timestamp → distinct content-hash IDs). The constitutional law under test is NO PROJECTION MAY SILENTLY BECOME CANONICAL; today the only marker distinguishing derived from source is a string convention, enforced by nobody.

## EVIDENCE

- `ProjectionWorker._emit('PROJECTION_CREATED', ...)` at `ping-runtime/workers/canonical_workers.js:182-185` (live core).
- `PROJECTION_CREATED` ∈ `INDEXABLE_TYPES` (`ping-runtime/embeddings/embedding_service.js:35`).
- Retry duplicate mechanism: worker payload carries wall-clock time (`constitutionalTimeAuthority.nowAsISOString()`, canonical_workers.js:178); content-hash event IDs (`unified_event_runtime.js:73-80`); P0-2 retry propagation (`worker_runtime.js:88-94`).
- Standing authority law (MEMORY.md): UnifiedEventRuntime = event acceptance; ping_events = constitutional journal; **IdentityAuthority = event identity owner**; CanonicalAuthority = canonical hash owner.

## MINIMUM CHANGE (decision, not code)

1. **Decide:** IdentityAuthority owns the derived-namespace decision, because source-vs-derived is an event-identity/classification question — the exact jurisdiction IdentityAuthority already holds.
2. **Registry:** IdentityAuthority maintains a typed event-type registry with a `DERIVED` classification (today implicit as a bare `event_type` string).
3. **Emission:** `ProjectionWorker` emits `PROJECTION_CREATED` classified DERIVED with `derivation: { kind: "worker-projection", upstreamEventId }` in metadata.
4. **Consumption:** `EvidenceAuthority.verify`, replay scope, and INDEXABLE_TYPES policy filter on the DERIVED classification deterministically. Retry dedupe key for derived rows becomes `(derivation.upstreamEventId, event_type)`.

## WHAT STAYS

- `ping_events` remains the ONE sovereign journal; UnifiedEventRuntime keeps accepting derived rows. **No separate derived-events table** — a second journal would create a second canonical authority, explicitly rejected here.
- The worker still journals `PROJECTION_CREATED` (projection-act audit trail); Writer A (EmbeddingService) remains the sole Qdrant writer.
- Derived types other than PROJECTION_CREATED are unaffected until classified.

## TEST (acceptance, not yet run)

1. After classification is live, journal one `PROJECTION_CREATED` and assert `derivation.kind == "worker-projection"` and `derivation.upstreamEventId` equals the source event's ID.
2. Assert a source-only journal consumer (EvidenceAuthority strict mode) excludes DERIVED rows by classification, not by string match.
3. Assert two `WorkerRuntime.dispatch` retries of one mission produce exactly one journal row (dedupe on `(upstreamEventId, event_type)`).

## RESULT

NOT DECIDED — awaiting coordinator. Once decided, the implementing lane is the event/identity lane (registry + emit classification), not the projection lane; this probe's jurisdiction ends at the proposal.
