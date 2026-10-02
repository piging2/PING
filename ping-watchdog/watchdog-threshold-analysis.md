# Watchdog Threshold Tuning Analysis — PING Dispatch Watchdog (STREAM 5, second-successor wave)

**Date:** 2026-09-24
**Scope:** read-only analysis. No code, config, or live changes made.
**Branch analyzed:** `lane/ping-core-perfection-jev` (HEAD `aa267e380` — F-01 bounded retry repair + stuck-running watchdog)
**Mechanism under review:** `MissionScheduler._dispatchWithTimeout()` (default `dispatchTimeoutMs=120000`, typed `DISPATCH_TIMEOUT`), `_reconcileUnknown()` (emits `MISSION_RECONCILE_HOLD` via `deriveFailureRecord`, mission row never touched), `reconcileStuckRunning()` (default `stuckThresholdMs=600000`, detection only).

## 1. Evidence basis

- **Live observation:** `ping-gateway` (`ping-gateway:devin-boundary2`, up 2 days) predates the watchdog; its logs show the EventBridge polling idle (0 rows). **No production mission traffic was observed, so no measured durations exist.** All "healthy duration" values below are code-derived expectations, labeled EXPECTED.
- **Repo evidence:** `ping-runtime/orchestration/mission_scheduler.js` (558 lines), `mission_runtime.js` (`findStuckRunning`, 60s lease + `reapExpiredLeases`), `event_to_mission_bridge.js` (`EVENT_MISSION_MAP`, 33 event types → 25 mission types), `workers/canonical_workers.js` (8 canonical workers, 916 lines), `workers/worker_runtime.js` (dispatch fans out sequentially to ALL workers matching the event type), `events/unified_event_runtime.js` (emit persists `ON CONFLICT (event_id) DO NOTHING` but still dispatches to in-memory handlers on conflict), `embeddings/embedding_service.js` + `ai/ollama_provider.js` (unbounded `fetch`, no inner timeout), `temporal/workflows/mission_workflow.js` (5-min `startToCloseTimeout`, 1-hour approval wait — integration to MissionRuntime currently commented out), `gateway/bootstrap/gateway_runtime.js` (production wiring: scheduler at defaults, `embeddingService` + `replayProvider` injected, `maxConcurrent=3`), `gateway/routes/missions.js` (POST /missions accepts any missionType, unvalidated).
- **Test evidence:** `mission_scheduler.retry_watchdog.test.js` uses fake timers / 50ms harness timeouts — no real duration data.

## 2. Mission type inventory (34 entries in MISSION_WORKER_MAP)

The scheduler dispatches on the ORIGINAL business `payload.event_type`, never `mission_type`, and `WorkerRuntime.dispatch()` awaits EVERY worker whose `eventTypes` include that event type, SEQUENTIALLY. So the 120s dispatch timeout covers the whole chain, not one worker.

### Group A — Fast, in-process, observation worker only (20 types)
`DOCUMENT_IMPORT`, `OBSERVATION_CREATE`, `SYSTEM_HEALTH_CHECK`, `SYSTEM_AUDIT`, `CUSTOMER_ONBOARD`, `CUSTOMER_UPDATE`, `LEAD_FOLLOWUP`, `LEAD_CONVERT`, `PROJECT_SETUP`, `PROJECT_UPDATE`, `PROJECT_CLOSEOUT`, `ESTIMATE_PREPARE`, `ESTIMATE_FOLLOWUP`, `ESTIMATE_CONVERT`, `INVOICE_TRACK`, `INVOICE_FOLLOWUP`, `INVOICE_CLOSE`, `REVIEW_RESPONSE`, `REVIEW_ACK`, `EMAIL_PROCESS`

### Group B — Fast, in-process pipeline workers
`CLAIM_GENERATE` (claim), `CLASSIFICATION_CREATE` (classification), `RECOMMENDATION_CREATE` (recommendation, from CLASSIFICATION_CREATED), `WITNESS_CREATE` (witness, from REPLAY_COMPLETED), `LINEAGE_CREATE` (lineage, from WITNESS_CREATED)

### Group C — Network/variable chains
- `PROJECTION_CREATE` (created from RECOMMENDATION_CREATED → dispatched as RECOMMENDATION_CREATED → matches **both** `recommendation` AND `projection`, sequential): includes Ollama `nomic-embed-text` embedding via unbounded `fetch` (no inner timeout — the dispatch timeout is the only bound) + Qdrant upsert.
- `REPLAY_VERIFY` (created from PROJECTION_CREATED → dispatched as PROJECTION_CREATED → matches `replay` only): `getCorrelationGroup(correlationId, 200)` (one PG query, fast) + kernel deterministic replay of up to 200 events (CPU-bound, scales linearly with group size; provider cap is 10000 but the worker fetches ≤200).

### Group D — Unreachable today
`KNOWLEDGE_EXTRACT`, `KNOWLEDGE_INDEX` — no `EVENT_MISSION_MAP` entry creates them, and no registered worker's `eventTypes` include them. If created via unvalidated `POST /missions`, they hit the no-worker path → `_failMission` → retry loop; the watchdog never sees them.

## 3. Threshold recommendation table

| Mission type(s) | Dispatch chain (workers run sequentially) | Expected healthy duration | Proposed dispatch timeout | Proposed stuck threshold | Risk of current uniform (120s / 600s) |
|---|---|---|---|---|---|
| Group A (20 types: all business + SYSTEM_* + DOCUMENT_IMPORT + OBSERVATION_CREATE) | observation only | ms–5s (PG emit + event emit, no network) | **60s** | **300s** | 120s is safe but delays true-hang detection — a hung observation worker occupies 1 of 3 slots for 2 min. 600s stuck = slow orphan detection (10 min). |
| CLAIM_GENERATE | claim | ms–3s | **60s** | **300s** | Same as above. |
| CLASSIFICATION_CREATE | classification | ms–3s | **60s** | **300s** | Same as above. |
| RECOMMENDATION_CREATE | recommendation | ms–3s | **60s** | **300s** | Same as above. |
| WITNESS_CREATE | witness | ms–5s (hash/evidence checks) | **60s** | **300s** | Same as above, PLUS double-attestation flag (Section 4.1). |
| LINEAGE_CREATE | lineage | ms–3s | **60s** | **300s** | Same as above. |
| PROJECTION_CREATE | recommendation + projection (Ollama embed, unbounded fetch; Qdrant upsert) | 5–60s warm; **>120s possible on cold Ollama model load** | **180s** | 600s (keep) | 120s: **false-positive HOLD on cold model load** → misleading "OUTCOME UNKNOWN" record + reaper re-dispatch duplicates the chain (Section 5.1). |
| REPLAY_VERIFY | replay (corr-group ≤200 + kernel replay ≤200 events) | 2–60s, scales with group size | **180s** | 600s (keep) | 120s: **false-positive HOLD on large correlation groups**; a re-replay is the most expensive op to waste on a false positive. |
| KNOWLEDGE_EXTRACT / KNOWLEDGE_INDEX | unreachable | N/A | N/A | N/A | No-worker → fail/retry loop, never watchdog. Validate missionType at POST /missions. |

**How to read the table:** the 120s uniform dispatch timeout is too TIGHT for the two Group C types (false-positive HOLD risk) and looser than needed for the 25 fast types (slower true-hang detection). The 600s uniform stuck threshold is loose for everything: any mission actively dispatched by THIS scheduler resolves (complete/fail/HOLD) within ~120s, so the stuck scan can only ever fire on rows this scheduler is NOT processing (orphans from a crashed scheduler, another instance, or future paths). A 300s stuck threshold suffices for fast types; Group C keeps 600s headroom.

## 4. Unsafe-for-timeout flags (need a human word before policy changes)

No canonical worker performs an irreversible external action today (verified by reading all 8 worker bodies): workers emit events and ProjectionWorker upserts to Qdrant (idempotent by point id). `gateway/mission_execution_authority.js` is dormant/deprecated (zero requirers); the Temporal workflow is not wired to `ping_missions`. So the timeout/retry hazard is **duplicate fan-out and evidence pollution**, not external damage. Still, these need Nolan's word:

1. **WITNESS_CREATE — double attestation.** A witness attestation is a canonical evidence claim. Re-executing a witness after an unknown outcome can emit a second `WITNESS_CREATED` for the same replay (fresh event_ids per invocation → no dedup). Re-execution policy for attestations needs an explicit human ruling.
2. **Reaper vs HOLD (all types) — the "no automatic retry for unknown effects" guarantee is not enforced.** After a HOLD, the mission leaves `_processing`, its 60s lease expires, and the pre-existing `reapExpiredLeases` (Arrow 1) resets it to `created` → it is re-dispatched ~60s after the HOLD. That IS an automatic retry of an unknown-outcome mission. Re-execution re-emits downstream events with FRESH event_ids, and the bridge handlers fire even on deduped canonical inserts (`UnifiedEventRuntime.emit` step 6 dispatches to in-memory handlers regardless of `ON CONFLICT DO NOTHING`), so duplicate downstream missions fan out. Fixing this (e.g. reconcile-aware lease or suppressing re-dispatch of HOLD-reconciled missions) changes mission lifecycle semantics → human word required.
3. **PROJECTION_CREATE cold-Ollama.** Choosing 180s vs adding an Ollama warmup/health gate is an infra policy call → human word if we go beyond tuning.
4. **Temporal `mission_workflow.js` 1-hour approval wait.** Currently the MissionRuntime integration is commented out, so the scheduler watchdog cannot see temporal missions. If/when that integration lands, a legitimately pending approval would false-positive at 600s stuck → needs an exemption or a separate mission-type policy, with a human word before it lands.

## 5. Watchdog-effectiveness interactions (not threshold values, but they change what thresholds mean)

1. **Reaper re-dispatch after HOLD** (Section 4.2): ~60s after any HOLD, the mission is re-queued. The retry_watchdog tests assert "no retry re-entry on timeout" but only cover the `retry_pending` path, not the reaper path — the reaper path is untested.
2. **Silent re-detection:** `_reconciled` dedup is only cleared on successful `complete`. After a reaper re-dispatch, a second hang emits NO new HOLD — detection goes silent while the worker keeps hanging.
3. **Whole-chain timeout:** the 120s bound covers the full sequential fan-out (e.g. recommendation + projection), so per-type thresholds must be sized for the longest chain, not the longest single worker.
4. **maxConcurrent=3 with 5s polls:** three hung fast-type missions exhaust dispatch capacity for the full timeout window. Tightening fast types to 60s halves that exposure.
5. **Unvalidated mission creation:** `POST /missions` accepts any `missionType`. Unmapped types are skipped; Group D types enter the no-worker fail/retry loop (bounded by `max_attempts=3` → DLQ, not the watchdog). Recommend validating `missionType` against `MISSION_WORKER_MAP` at the route.

## 6. Recommended next steps

**Need a human word (do not implement without Nolan):**
- N1. Reaper-vs-HOLD fix (suppress or reconcile-aware handling of re-dispatch for HOLD-reconciled missions) — changes F-01 lifecycle semantics.
- N2. WITNESS_CREATE re-execution-after-unknown policy (double attestation).
- N3. Temporal integration exemption before the approval-wait workflow is wired to `ping_missions`.
- N4. Cold-Ollama strategy for PROJECTION_CREATE (longer timeout vs warmup gate).

**Safe to implement later (purely mechanical, no policy change):**
- S1. Per-type threshold map in `MissionScheduler` (`dispatchTimeoutMs` / `stuckThresholdMs` looked up by `mission_type`, falling back to current defaults) — the constructor already takes both as params.
- S2. Validate `missionType` against `MISSION_WORKER_MAP` in `POST /missions` (reject Group D and unmapped types early).
- S3. Duration instrumentation: record per-dispatch elapsed ms into the reconciliation log / mission result so the next tuning pass is measurement-driven, not code-derived.
- S4. Test coverage for the reaper-after-HOLD path (currently untested; the existing test only covers `retry_pending`).

**Cheap observation (this wave's remit):** once the watchdog branch deploys, watch `MISSION_RECONCILE_HOLD` emission counts and reaper reset counts per mission type; Group C types are the expected first false-positive candidates.

## 7. Boundary compliance notes

- Analysis only: no code, config, commit, or live change made.
- Live gateway (`ping-gateway`) observed read-only via `docker ps` / `docker logs` only; no exec, no restart. `cosyvoice-tts` untouched, vault untouched.
- No new park/hold/cancel/abandon vocabulary introduced; HOLD reconciliation semantics preserved as designed.
- No live defect was observed in production (gateway predates the watchdog and is idle). The reaper-vs-HOLD interaction (Section 4.2/5.1) is a pre-deployment design gap found by code reading on the lane branch — surfaced here for a human word, not ledgered as a live failure.
- ORCA untouched. No FYD factory changes. No credentials handled. No external contact.
