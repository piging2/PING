# LANE E — Projection Semantics, Witness Contract, Replay Completeness, WorkOrder Boundary, Failure Taxonomy

**Worktree:** `/home/nolan/worktrees/constitutional-convergence-authority-law`
**HEAD:** `0d3cddd4a67238e0511ae7b58718cd75dd29d8d3` (verified via `git rev-parse`)
**Dirty worktree (uncommitted, distinguished from HEAD):**
- `M ping-runtime/workers/canonical_workers.js` — (a) ObservationWorker documentId fallback, (b) W-2 fail-closed completeness line
- `M gateway/test_witness_w2_versioning.js` — adds W2-9 test only
- `M gateway/bootstrap/gateway_runtime.js` — Lane G: WORKER_COMPLETED/WORKER_FAILED added to graph projection events
- `M ping-runtime/orchestration/mission_runtime.js` — Lane J: completion-requires-emission invariant
- `?? tests/test_graph_projection_worker_results.js`, `?? tests/test_observation_worker_identity.js`, `?? evidence/`
- Commit `172577628` ("W-2 bind engine/algorithm versions and explicit INCOMPLETE replay state") is a **committed ancestor** of HEAD, not dirty work.

**Method:** read-only source inspection. No files written on the Pig. All claims cite file:line from the dirty worktree.

---

## PART 9 — PROJECTION SEMANTICS

### Resolution of the ordering contradiction

Current source, `ping-runtime/workers/canonical_workers.js`, `ProjectionWorker.handle` (lines 185-225):

1. Build in-memory `projection = { documentId, eventType, timestamp }` (lines 190-194).
2. **`await this._emit('PROJECTION_CREATED', { documentId, projection, upstreamEventId }, ...)` at line 196 — FIRST.**
3. Qdrant write attempted **after** the emit via `this._embeddingService.projectToQdrant(...)` (lines ~204-216).
4. Qdrant failure is caught and **swallowed**: `console.error(...)` only (line ~215), never rethrown.
5. `handle` returns `{ status: 'ok', projection }` regardless of Qdrant outcome.

**Verdict: "PROJECTION_CREATED → Qdrant" is TRUE; "Qdrant → PROJECTION_CREATED" is FALSE.** Neither prior audit had the full picture: the actual contract is *emit-then-best-effort-attempt with failure swallowed*.

### What PROJECTION_CREATED actually means

**(B) — canonical projection specification created**, closest to (B)/(D). The emitted payload is a canonical projection *object* `{documentId, eventType, timestamp}`, not a Qdrant state claim. The event's consumers confirm this: `event_to_mission_bridge.js:63` maps `PROJECTION_CREATED → missionType REPLAY_VERIFY` — the downstream (replay) never inspects Qdrant. The name does **not** imply Qdrant state exists, and must never be read that way, because the event is emitted before Qdrant is even attempted.

### P1 — is the projection deterministically rebuildable from canonical state?

**Yes. Loss of Qdrant state does not destroy canonical truth.**

`EmbeddingService.projectToQdrant` (`ping-runtime/embeddings/embedding_service.js:197-237`) constructs the Qdrant point as a pure function of the canonical event:
- `id = toQdrantId(event.event_id)` — stable, idempotent upsert
- payload = `{ kind, namespace, canonical_hash, source_event_id, event_type, text, embedding: fallback?'fallback':'ollama', model, projected_at: null }`

Rebuild procedure: scan `ping_events` for canonical rows, re-run `projectToQdrant`. Two caveats, neither touching canonical truth:
1. The *vector* depends on the embedding provider at rebuild time (`embedding: 'fallback' | 'ollama'`, `model` field) — semantic rebuild, not bit-identical across provider/model changes.
2. `projected_at` is hardcoded `null` — dead field, never set.

**Cleanest semantic contract:** `PROJECTION_CREATED` = "the canonical projection object (a deterministic function of the canonical event) has been created and recorded in `ping_events`; Qdrant materialization is an explicitly disposable, best-effort side effect that this event does **not** attest."

### Alternatives evaluation

- `PROJECTION_REQUESTED` — wrong: the projection object was already created, not requested.
- `PROJECTION_MATERIALIZED` / `PROJECTION_FAILED` — correct as *additional downstream* events for the Qdrant attempt, not as replacements. Today materialization state is unobservable in the event log (swallowed into `console.error`).
- Keep `PROJECTION_CREATED` with the documented contract — best: no breaking change to the `PROJECTION_CREATED → REPLAY_VERIFY` bridge mapping.

### Smallest patch

1. Doc comment on `ProjectionWorker.handle` stating the emit-before-materialize contract (one comment, zero behavior change).
2. After the Qdrant attempt, emit `PROJECTION_MATERIALIZED` (with `point.id`) or `PROJECTION_FAILED` (with `error`, `retryable: true`) — makes the currently-swallowed UNKNOWN_OUTCOME observable. (Also see Part 16.)

---

## PART 11 — WITNESS CONTRACT

### Actual current-worktree payloads (field by field)

**REPLAY_COMPLETED** — `canonical_workers.js`, `ReplayWorker.handle` (~347-368), emitted at line 385:
```
payload = {
  documentId,                                   // from triggering payload
  replay: {
    documentId, eventType, timestamp,
    verified,                                   // bool; true ONLY if status ok AND completeness COMPLETE AND zero violations
    reason,                                     // 'kernel_verified' | 'incomplete_input_set' | 'no_replay_provider' | 'kernel_error' | ...
    fingerprint,                                // kernel fingerprint or null
    witness_root,                               // kernel witness root or null
    violations,                                 // array
    event_count, artifact_count, state_version,
    replay_engine_version,                      // W-2, from provider (null pre-W-2)
    witness_algorithm_version,                  // W-2, from provider (null pre-W-2)
    witness_version,                            // W-2, from provider (null pre-W-2)
    completeness,                               // 'COMPLETE' | 'INCOMPLETE' — fail-closed (dirty worktree line ~340)
    input_event_count,                          // number|null
    input_truncated,                            // bool
    inputs_skipped,                             // number
  },
  authority: {                                  // _buildAuthorityEvidence (~414-445)
    authority: 'ReplayWorker',
    provider: 'KernelReplayExecutionProvider',
    source_event_id?, correlation_id?, namespace?,
    verified?, reason?, violation_count, violations?,
    failure_code?, failure_reason?,
    deterministic_execution_identity?,          // = replay.fingerprint
    canonical_input_hash?,                      // = extra.replay_id (the transcript/input hash; naming drift noted)
  },
  upstreamEventId,
}
```
Causation: `causation_id = triggering event_id`.

**WITNESS_CREATED** — `canonical_workers.js`, `WitnessWorker.handle` canonical path (~612-648), emitted at line 640:
```
payload = {
  documentId,
  witness: {
    documentId, eventType: 'REPLAY_COMPLETED',
    witness_root,                               // from certified replay row — never from dispatch envelope (W-1A)
    replay_fingerprint,
    replay_event_id,                            // canonical ping_events row id
    replay_event_count, violation_count, replay_reason,
    algorithm_version: 'witness-attest/v1',     // W-1A constant
    input_schema_version: 'witness-input/v1',   // W-1A constant
    replay_engine_version,                      // W-2, from certified row (null pre-W-2, never backfilled)
    witness_algorithm_version,                  // W-2 (null pre-W-2)
    witness_version,                            // W-2 (null pre-W-2)
    replay_completeness,                        // 'COMPLETE'|'INCOMPLETE'|null
    replay_input_event_count, replay_inputs_skipped,
    timestamp,                                  // wall-clock; observation metadata only, never identity
    attestation: 'witness-'+replay_event_id[0:16],
  },
  upstreamEventId: canonicalRow.event_id,
}
```
Emit options: `causation_id = dispatch event_id`, `logical_id = { kind: 'witness-attestation', replay_event_id, witness_root }` — retry mints the same event_id; ON CONFLICT dedups. The envelope-contract unit-test seam (`_attestFromEnvelope`) is preserved only for direct invocation with no attestation source and no mission metadata; a mission-pipeline dispatch without a source fails closed (`attestation_source_unavailable` → WITNESS_REJECTED).

### Commit 172577628 — characterization

Committed ancestor of HEAD (2026-09-19 07:05 MDT). Three changes: (1) `gateway/kernel_replay_execution_provider.js` computes explicit `completeness` (`INCOMPLETE` if `inputTruncated || inputsSkipped > 0`) and returns `replay_engine_version`, `witness_algorithm_version`, `witness_version`, `input_event_count`, `input_truncated`, `inputs_skipped`; (2) `canonical_workers.js` carries those bindings through REPLAY_COMPLETED and into every WITNESS_CREATED attestation, NULL for pre-W-2 rows, never silently backfilled; (3) 270-line test file added. Leaf construction untouched: pinned pre-W-2 root `d9a012f0...` reproduces byte-identically; TS-only `constitutional_law_commitment` 13th leaf stays out of the executed artifact per the P0 interim invariant. Additive only.

**Dirty worktree on top of it:** the test file gains W2-9 (lines 270-309) — a legacy provider returning `ok` + zero violations but *no* `completeness` field must yield `verified: false`, `completeness: INCOMPLETE`, `reason: incomplete_input_set`, zero WITNESS_CREATED, exactly one WITNESS_REJECTED. The matching source change is the dirty fail-closed line in `canonical_workers.js` (~340): `kernelResult.completeness === 'COMPLETE' ? 'COMPLETE' : 'INCOMPLETE'`.

### Witness axiom

`WITNESS_CREATED` attests: **"replay R, over exact bounded input set I, under algorithm/version V, produced root H, with completeness C, verification verdict X"**, where:
- R = `replay_event_id` (canonical row) — verdict and proof read ONLY from that row (W-1A)
- I = `replay_input_event_count` / `replay_inputs_skipped` (+ `canonical_input_hash` = transcript hash on the replay row)
- V = `algorithm_version` + `input_schema_version` + `replay_engine_version` + `witness_algorithm_version` + `witness_version`
- H = `witness_root`
- C = `replay_completeness`
- X = **implicit**: WITNESS_CREATED exists only for verified replays; any unverified/malformed input yields observable `WITNESS_REJECTED` instead.

### Minimum durable fields — gap analysis vs candidates

| Candidate | Status in current WITNESS_CREATED |
|---|---|
| replay_id | Recoverable via `replay_event_id` → REPLAY_COMPLETED.authority.canonical_input_hash (transcript/input hash); naming drift: stored as `canonical_input_hash`, computed as `replay_id`. Not duplicated in witness — acceptable. |
| witness_root | Bound ✓ |
| fingerprint | Bound as `replay_fingerprint` ✓ |
| replay_algorithm_version | Bound as `replay_engine_version` + `witness_algorithm_version` ✓ (naming drift vs candidate label) |
| input_schema_version | Bound ✓ |
| completeness | Bound as `replay_completeness` ✓ |
| verified | **MISSING as a bound field** — verdict X is implied by event type only. A reader of the row alone cannot see the verdict without knowing the type contract. |
| source_event_id | Bound as `replay_event_id` ✓ |

Per "do not duplicate causally recoverable data unless immutable binding requires it": `verified` is recoverable via the replay row, but the witness axiom's entire meaning *is* the verdict — an explicit bound `verified: true` makes the attestation self-contained and is cheap. This is the one field worth adding.

### W-2 patch alternatives

- (a) Bind explicit `verified: true` into the witness object (immutable verdict binding; self-contained attestation). Recommended, additive.
- (b) Harmonize version naming (`replay_engine_version` vs `replay_algorithm_version` vs `algorithm_version`) — documentation-level; do not rename stored fields (historical rows).
- (c) Carry `replay_id` (transcript/input hash) directly in the witness for join-free lineage — optional; currently recoverable.

### Rogue branch check

`compute_witness_root`: **zero hits** in the worktree (`git grep`, whole tree). Not visible. `witness_root` is produced by the kernel replay engine (`DeterministicReplayEngine` via `KernelReplayExecutionProvider`), never computed in worker code, and no witness persistence outside `ping_events` exists. No rogue-branch concern to act on.

---

## PART 15 — WORKORDER BOUNDARY

### The actual chain (file:line)

**Internal path (the only path MissionScheduler drives):**
Mission → `MissionScheduler._dispatch` (`ping-runtime/orchestration/mission_scheduler.js:280-366`) → `WorkerRuntime.dispatch(event)` (`ping-runtime/workers/worker_runtime.js:69-106`) → `worker.handle(event)` → `dispatchResult` → `MissionRuntime.complete(mission_id, result)` (`ping-runtime/orchestration/mission_runtime.js:168-197`) → conditional `UPDATE ping_missions ... 'completed'` gated on MISSION_COMPLETED acceptance (dirty Lane J lines 179-189).

**Answer: MissionScheduler dispatches the mission DIRECTLY. It never authorizes or issues a WorkOrder.** The WorkOrder boundary lives in a separate, exterior-agent lane:

Mission → (orca loop) → `authorizeWorkOrder` → `issueWorkOrder` (`ping-runtime/external-agent/external_agent_adapter.js:253-336`, called only from `orca/control-loop/orca_control_loop.js:753`) → attempt loop with `deriveAttemptId`/`recordAttemptOutcome` → dispatch to exterior agent → result envelope → `verifyResultEnvelope` (non-retryable on invalid, line 374-424) → `recordVerifiedResult` → canonical `WORKER_COMPLETED`/`WORKER_FAILED` with `logical_id` dedup (lines 430-462).

### Boundary map

| Boundary | Internal mission path | Exterior-agent path |
|---|---|---|
| Mission | ✓ `ping_missions` row (bridge `event_to_mission_bridge.js:129`) | mission_id embedded in work order (`orca-loop:...`) |
| WorkOrder (authorization decision) | **MISSING** — scheduler dispatches directly | ✓ `authorizeWorkOrder` + `issueWorkOrder` |
| Attempt (identity + outcome) | **MISSING** — only integer `retries` counter | ✓ `deriveAttemptId`, `recordAttemptOutcome` |
| Worker | ✓ registered worker, W-1A dispatch-time guard (`mission_scheduler.js:311-323`) | ✓ Hermes/subagent via dispatch |
| ResultEnvelope | **MISSING** — scheduler **discards `dispatchResult`** and passes a fabricated `{ worker: workerName, completed_at }` to `complete()` (`mission_scheduler.js:352-355`) | ✓ validated envelope |
| Verification | **MISSING** (no result validation) | ✓ `verifyResultEnvelope` |
| Mission completion | ✓ completion-requires-emission (dirty) | loop-driven terminal states |

### Which missing boundary causes a REAL invariant failure

1. **Fabricated completion result — REAL.** `ping_missions.result` contains `{worker, completed_at, duration_ms}` regardless of what the worker returned. The worker's actual verdict object (e.g. the replay verdict) is dropped on the floor. Any consumer of mission results reads fiction. The canonical side effects survive (events are in `ping_events`), but the mission record itself is a lie-by-construction.
2. **No per-mission authorization boundary for internal workers — LATENT, not currently a failure.** Registration (`registerCanonicalWorkers`) is the de-facto authorization. Acceptable for in-process code workers; the W-1A guard handles type confusion. Becomes real the moment a worker with exterior side effects is registered.
3. **No attempt identity in the mission path — LATENT.** Lease expiry + reaper redispatch can double-execute while a zombie worker runs. Tolerable today because canonical side effects are idempotent (`logical_id` ON CONFLICT dedup on witness/rejection events; Qdrant upsert by stable `toQdrantId`). Becomes real with the first non-idempotent worker.

**Smallest patches:** (1) pass `dispatchResult` (or a projection of it) into `complete()` instead of the fabricated stub — one-line fix at `mission_scheduler.js:352-355`; (2) longer-term: route internal worker results through a `verifyResultEnvelope`-style gate before `complete()`.

---

## PART 16 — FAILURE TAXONOMY

### Existing error vocabulary (inventory)

- `ping_missions.status`: `created | assigned | running | retry_pending | failed | completed`; failure stored as **free-text `error` string** (`mission_runtime.js:203-275`). No classification.
- `WORK_ORDER_DENIED` — the only typed error code in the live codebase (`external_agent_adapter.js:239,298-321`).
- `verifyResultEnvelope` → `{ valid: false, reason, retryable: false }` — validation failure is explicitly non-retryable, "can never reach canonical event authority" (`orca_policy.js:75`, `orca_status_model.js:40`).
- `gateway/retry_policy.js:80-168` — `_isNonRetryable` (message patterns: validation, authentication, authorization, not found, already exists, constraint, duplicate, invalid, malformed; PG codes 23505/23503/23502/42501/28000/28P01/3D000) and `_classifyError` → `non_retryable | timeout | network | rate_limit | retryable`. **Not wired into the mission path.**
- `gateway/retry_authority.js:130-131` — `shouldRetry` consumes `failureClassification` "from FailureAuthority". **No `FailureAuthority` class exists anywhere in the tree** — dead contract reference. RetryAuthority itself is referenced only by `dead_letter_authority.js`, not by the scheduler.
- Witness boundary — the best-typed in the system: `WITNESS_REJECTED` reasons `unsupported_witness_trigger | attestation_source_unavailable | no_canonical_replay_event | canonical_replay_malformed | unverified_replay:<reason> | missing_witness_root` (`canonical_workers.js:745-760`).
- ORCA loop states: `BLOCKED | PLANNED | AUTHORIZED | QUEUED | RUNNING | FAILED`, `VERIFICATION_FAILED`, transport-failure replan (`orca_status_model.js`, `orca_control_loop.js`).
- Replay outcomes: `no_replay_provider | kernel_error | incomplete_input_set` (free-text `reason`).

### Minimal failure algebra vs current reality

| Class | Recovery semantic | Current state |
|---|---|---|
| RETRYABLE | bounded retry, backoff | Only `failWithRetry` counter; no classification — everything retries |
| DETERMINISTIC_REJECTION | fail immediately, no retry | `event_type_mismatch` burns 3 retries before failing (mission_scheduler → _failMission → failWithRetry). **Collapse: DETERMINISTIC_REJECTION → RETRYABLE.** WORK_ORDER_DENIED and verifyResultEnvelope-invalid are correctly non-retryable in the exterior lane. |
| COLLISION | dedup by logical identity | ✓ witness `logical_id` ON CONFLICT; deterministic `work_order_id` re-issue; Phase 12 UER commit law |
| UNKNOWN_OUTCOME | record outcome as unknown, never claim success | **Collapsed twice:** (1) ProjectionWorker Qdrant failure → `console.error` → returns `ok`; (2) worker dispatch timeout (O5) leaves the promise settling — mitigated by conditional transitions, acceptable. |
| INCOMPLETE | explicit incomplete state, never verifies | ✓ W-2, fail-closed (see R1) |
| STALE | marked stale, requires re-verification | ✓ W-2 NULL versions for pre-W-2 rows; lease reaping |
| UNAUTHORIZED | deny, escalate | ✓ `authorizeWorkOrder` denials; `attestation_source_unavailable` → WITNESS_REJECTED |
| INVALID | reject, non-retryable | ✓ `verifyResultEnvelope` invalid; `canonical_replay_malformed` → WITNESS_REJECTED. Missing in internal mission path. |
| INFRASTRUCTURE_UNAVAILABLE | degrade honestly, do not claim completion | **Collapsed:** `no_replay_provider` emits honest `REPLAY_COMPLETED{verified:false}` but the worker returns `status: 'ok'` → mission completes. Honest event, dishonest mission status. |

**Smallest patches:**
1. Wire `RetryPolicy._classifyError`/`_isNonRetryable` into `MissionScheduler._failMission` / `MissionRuntime.failWithRetry`: non-retryable classes skip the retry loop (fixes the DETERMINISTIC_REJECTION→RETRYABLE collapse). Store the class alongside the free-text error.
2. Either delete the `FailureAuthority` reference in `retry_authority.js:130` or implement it — a contract referencing a nonexistent authority is worse than no contract.
3. ProjectionWorker: convert the swallowed Qdrant error into `PROJECTION_FAILED` (retryable) instead of `console.error` + `ok`.
4. `no_replay_provider` path: return a non-`ok` status (or a distinct `status: 'degraded'`) so the mission does not complete as if healthy.

---

## REPLAY COMPLETENESS — AXIOM R1

**Exact semantics (file:line):** `ping-runtime/workers/canonical_workers.js` dirty line ~340:

```js
const completeness = kernelResult.completeness === 'COMPLETE' ? 'COMPLETE' : 'INCOMPLETE';
```

Only an **explicit** `'COMPLETE'` string from the provider counts. Missing field, `null`, any other value → `'INCOMPLETE'`. Then (line ~343): `isVerified = status === 'ok' && !incomplete && violations.length === 0` — INCOMPLETE can never verify; `reason` becomes `'incomplete_input_set'`.

**Provider side** (`gateway/kernel_replay_execution_provider.js`, W-2, committed): `completeness = (inputTruncated || inputsSkipped > 0) ? 'INCOMPLETE' : 'COMPLETE'` — a `maxEvents` cut or any skipped malformed envelope forces INCOMPLETE.

**Witness gate** (`canonical_workers.js:584-587`): attestation requires `certified.verified === true` read from the canonical row; anything else → `_reject(...)` → observable `WITNESS_REJECTED` (never `WITNESS_CREATED`).

**Proof:** dirty test W2-9 (`gateway/test_witness_w2_versioning.js:270-309`) — a provider returning `ok` + zero violations but *no* `completeness` field yields `verified: false`, `completeness: 'INCOMPLETE'`, zero `WITNESS_CREATED`, exactly one `WITNESS_REJECTED` with reason containing `incomplete_input_set`.

**Verdict: R1 holds. ABSENCE OF INPUT never silently becomes COMPLETE INPUT — missing completeness metadata fails closed, and the failure is observable.** Pre-W-2, the line read `kernelResult.completeness || 'COMPLETE'` (defaulted to COMPLETE — the exact hole W-2 closed).

---

## FALSIFICATION NOTES

1. **Prior audit contradictions resolved against source**, not by preference: projection ordering (emit-then-attempt) and W-2 version bindings were read from the dirty worktree, not inferred.
2. `ping-runtime/agents/replay_worker.js` (outbox-based legacy ReplayWorker) emits `REPLAY_COMPLETED` without completeness fields. It has **zero require references** in the tree (last touched in the M3 relocation refactor) — unwired legacy, preserved per the no-deletion law. If it were ever rewired, its emissions would fail closed to INCOMPLETE under current witness semantics. Flagged, not actioned.
3. `evidence.canonical_input_hash = extra.replay_id` (`canonical_workers.js` ~443): the field named `replay_id` is actually the transcript/input hash (`replay-${hash(events)}` or `transcript.transcript_id`), not a replay-run identity. Naming drift; do not rename stored fields.
4. Did not execute the test suite (read-only lane); W2-9's assertions were read, not run. Did not re-verify the pinned `d9a012f0...` 12-leaf root claim from the W-2 commit message — taken as reported.
5. The witness `timestamp` uses wall-clock (`constitutionalTimeAuthority.nowAsISOString()`); it is explicitly excluded from attestation identity (`logical_id`), so determinism of identity is preserved. Noted, not a defect.
6. `PROJECTION_CREATED → REPLAY_VERIFY` bridge mapping (`event_to_mission_bridge.js:63`) means every projection triggers a replay mission; the chain is intentionally circular (projection → replay → witness → lineage → projection). Not flagged as a defect — it is the designed pipeline — but it means the emit-before-materialize ordering has a consequence: replays attest projections whose Qdrant materialization may have failed silently. This is the concrete cost of the Part 9 gap and the reason `PROJECTION_FAILED` observability matters.
