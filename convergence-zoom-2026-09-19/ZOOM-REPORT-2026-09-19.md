# CONSTITUTIONAL ZOOM PASS — FINAL REPORT 2026-09-19

**Mode:** READ / TRACE / SPEC / PROTOTYPE-PLAN. No mutation of the main convergence worktree. All analysis artifacts live in `~/workspace/convergence-zoom-2026-09-19/`.
**Target:** `/home/nolan/worktrees/constitutional-convergence-authority-law`
**Baseline HEAD:** `0d3cddd4a67238e0511ae7b58718cd75dd29d8d3` — verified at pass start and by every lane; **no drift**.
**Dirty worktree (distinguished from HEAD throughout):** `M gateway/bootstrap/gateway_runtime.js` (Lane G: WORKER_COMPLETED/WORKER_FAILED graph-projection wiring), `M gateway/test_witness_w2_versioning.js` (+W2-9 test), `M ping-runtime/orchestration/mission_runtime.js` (Lane J: completion-requires-emission reversal), `M ping-runtime/workers/canonical_workers.js` (ObservationWorker fallback + W-2 fail-closed completeness line), untracked `evidence/` and two test files. Process note: at least three lanes' uncommitted work shares this worktree; one-writer-per-mutable-semantic-unit is currently a process risk, not yet a code conflict.
**Pig:** reached read-only via `~/workspace/pig/pigwsl-run.sh`; nothing written or mutated on the Pig (one SSH proxy drop mid-pass, recovered, no writes).

**Lane deliverables (read for full evidence):**
- [AXIOM-LEDGER.md](sandbox://workspace/convergence-zoom-2026-09-19/AXIOM-LEDGER.md) — 15 axioms with statement, owner, status, violation, counterexample, minimum proof
- [lane-a-verification/VERIFICATION.md](sandbox://workspace/convergence-zoom-2026-09-19/lane-a-verification/VERIFICATION.md) — Devin/Hermes findings, claim by claim
- [lane-b-uer-timeline/EMIT-TIMELINE.md](sandbox://workspace/convergence-zoom-2026-09-19/lane-b-uer-timeline/EMIT-TIMELINE.md) + [COLLISION.md](sandbox://workspace/convergence-zoom-2026-09-19/lane-b-uer-timeline/COLLISION.md)
- [lane-c-durable-consumer/DURABLE-CONSUMER.md](sandbox://workspace/convergence-zoom-2026-09-19/lane-c-durable-consumer/DURABLE-CONSUMER.md)
- [lane-d-execution/EXECUTION.md](sandbox://workspace/convergence-zoom-2026-09-19/lane-d-execution/EXECUTION.md) (+ `mission_runtime.diff.txt`, byte-verified `pig-src/`)
- [lane-e-projection-witness/PROJECTION-WITNESS.md](sandbox://workspace/convergence-zoom-2026-09-19/lane-e-projection-witness/PROJECTION-WITNESS.md)
- [patches/](sandbox://workspace/convergence-zoom-2026-09-19/patches/) — 13 patch cards

**Operator corrections carried (all honored):** (1) event-derived mission identity already deterministic — the "mission identity is the root problem" hypothesis is falsified for the event path and is not repeated; (2) the systemic issue is DURABLE CAUSAL HANDOFF; (3) three deeper questions forced: ping_events->consumers is the boundary (not canonical_events->UER); attempt/effect absence adjudicated against the effect classification; collision law is a first-class lane; (4) neither completion ordering satisfactory; (5) standing authority law and preservation doctrine held throughout.

---

## A. AXIOM LEDGER

Full ledger: [AXIOM-LEDGER.md](sandbox://workspace/convergence-zoom-2026-09-19/AXIOM-LEDGER.md). Status summary:

| Axiom | Status | One-line |
|---|---|---|
| E1 event durability | PROVEN (normal path); VIOLATED in degraded mode | ok receipt without pool = acceptance without durability |
| E2 collision safety | VIOLATED | silent dedup, no witness, split-brain possible |
| M1 mission existence | VIOLATED | B3 crash window + startup-ordering window (adapter :493, bridge :605) |
| M2 mission uniqueness | PROVEN (event path); VIOLATED (direct HTTP path) | key-order + cross-tenant collapse |
| M3 user mission idempotency | VIOLATED | JSON.stringify fallback conflates retry/coincidence |
| M4 completion coherence | VIOLATED (both orderings) | HEAD phantom; worktree re-execution/0-row race |
| A1 attempt separation | VIOLATED | no attempt record; executions indistinguishable |
| F1 effect separation | STRUCTURALLY VIOLATED, consequence-free today | no ledger, no gate; no irreversible effect reachable |
| F2 unknown outcome | VIOLATED x3 | Qdrant swallow; watchdog abandon; no_replay_provider -> ok |
| P1 projection rebuildability | PROVEN | Qdrant = pure function of canonical event |
| W1 witness binding | PROVEN (minor gap: `verified` not an explicit bound field) | W-1A + W-2 hold |
| R1 replay completeness | PROVEN (fail-closed) | dirty line + W2-9; pre-W-2 hole closed |
| H1 historical non-reinterpretation | PROVEN by mechanism | NULL versions, no rewrites, era prefixes |
| C1 causal recoverability | VIOLATED | no generic reconciler; join key is convention |

The ledger's shape: the event authority itself (E1-normal, P1, W1, R1, H1) is the proven core; every violation sits on the handoffs (E2, M1, M3, M4, A1, F1, F2, C1). The system knows facts durably; it does not durably produce their consequences.

## B. UER EXACT CRASH TIMELINE

T0 caller invokes `emit` -> T1 identity material (in memory) -> T2 registry validation -> T3 governance -> T4 `event_<16hex>` minted -> T5 canonical object built (timestamp assigned, excluded from identity) -> T6 `INSERT ... ON CONFLICT DO NOTHING RETURNING sequence` in one implicit-tx statement (no explicit BEGIN/COMMIT anywhere in the path) -> T7 handler loop: awaited sequentially in registration order, per-handler catch swallows into `console.error`, no retry, no ack, `emit` still returns ok -> T8 integration routing (errors swallowed) -> T9 return `{status:'ok', eventId, event, sequence}` (identical shape for fresh and deduped).

Crash enumeration: B0 pre-invoke (nothing); B1 pre-persist (safe retry, deterministic ID); B2 INSERT in flight (implicit tx aborts, safe retry); **B3 after T6 commit before/during T7: row durable with `processed=FALSE` forever, zero handlers ran, no restart redelivery — the persisted event permanently misses all handlers**; B4 mid-T7: partial unrecorded fanout, permanent (only the aggregate in-memory `dispatched` counter, lost on crash; a throwing handler is recorded nowhere except stderr); B5 during T8 (integration may not have run); **B6 lost ack -> caller retries -> dedup path falls through to handler dispatch -> handlers re-fire (at-least-once)**; BR restart: subscriptions re-registered from scratch, `ping_events` never enumerated for redelivery, `replay()` never invoked for recovery, `processed` stays FALSE.

The precise defect: callback delivery is trusted in exactly one place (the in-memory `for` loop). No transaction spans commit+dispatch; no outbox; no per-handler ack; no cursor; no redelivery; no dead-letter. The `processed` column is write-never/read-never in the UER path. The only true claim the code supports: **accepted ⇒ row in ping_events**, never accepted ⇒ handlers ran.

## C. DURABLE CONSUMER PATCH FAMILIES

**Verdict: adopt A1 + B2/D + F-periodic; reject B1, C, E-for-this-boundary.**

- **A (reconciliation from ping_events):** viable; A0 now (payload-join, no migration) -> A1 with `source_event_id` + `routing_version` columns (join becomes contract, not convention).
- **B1 (durable consumer cursor):** REJECTED. Fails crash-before-advance, cursor corruption, out-of-order (sequence gaps + concurrent dispatch), multi-instance, namespace mismatch, poison head-of-line; contradicts the repo's own C-035/C-037 cursor rejection in LegacyIngressAdapter.
- **B2 (per-event receipt):** survives all six attacks, but written in the same tx as the mission insert it IS the obligation journal: specifying it separately from D would duplicate a mechanism.
- **C (event+mission same tx):** REJECTED in strong form. Merges two authorities: UER would own the routing law (violates the standing assignment of trigger authority to the bridge); a poison derivation failure would veto canonical acceptance; N consumers would force one failure semantic on all. The weak reading collapses into D.
- **D (transactional outbox / obligation journal):** ADOPTED. Repo sweep first: `gateway/event_outbox.js` and `mission_event_bus.js` are PRESERVED_INACTIVE (never instantiated, pre-convergence model) — proposing the journal duplicates no live mechanism. Design: `ping_mission_obligations` (PK on `(source_event_id, mission_type)`), bridge writes obligation + mission in one tx; the journal is derived-truth ("what is still required"), never presented as canonical truth.
- **E (Temporal):** REJECTED for this invariant. Moves the dual-write to COMMIT -> startWorkflow-ack; `@temporalio` is not installed; presupposes D anyway. Revisit for execution durability after D lands.
- **F (startup reconciliation only):** necessary but insufficient (falsified by the non-crash loss path: swallowed handler exceptions in a never-restarted process). Ship F + periodic sweep (same `reconcile()`, two triggers) + loud handler failures.

The durable boundary is **ping_events -> consumers** (generic UER callback durability), not canonical_events -> UER (which already has per-row disposition). A LegacyIngressAdapter-scoped fix leaves the generic problem intact.

## D. MISSION SCHEMA GAP ANALYSIS

CURRENT (`mission_runtime.js:30-52`): mission_id PK, mission_type, status, priority, payload, result, assigned_to, created_by, created_at/started_at/completed_at, error, retries, retry_at, lease_until, claimed_at; no namespace, no source_event_id, no routing_version.

KEEP (invariant-required): mission_id, mission_type, status, priority, payload, result, created_at/started_at/completed_at, created_by, assigned_to, claimed_at, lease_until (exactly-once claim), error, retries, retry_at (bounded attempts).
ADD: `source_event_id` (causal traceability; makes the A1 join a contract), `namespace` (NAMESPACE(MISSION) durable), `routing_version` (which law derived it), `idempotency_key` (collision-loud conflicts), `semantic_key` (future two-semantic-missions discriminator; default '').
DELETE FROM SPEC: `logical_id` column (no invariant needs it separately), `attempt_count` rename churn, `lease_owner`/`lease_expires_at` (duplicates of assigned_to/lease_until), `ping_mission_attempts` REJECTED-then-ADJUDICATED (see below), `ping_effects` (no invariant requires it: effects already idempotent per Phase 13; attempts already in ping_events for the audit trail).

**Adjudication (Lane C vs Lane D):** Lane C proposed deleting `ping_mission_attempts` with falsifier F-S2 ("show the attempt in ping_events first; only spec the table if an attempt exists that the journal cannot represent"). Lane D supplied exactly that showing: claimed-but-never-started, timed_out-vs-orphaned (timeout != failure), absent finished_at, MISSION_ASSIGNED without logical_id (forensic correlation only). **Per C's own falsifier, the minimal `ping_mission_attempts` table stands** (PATCH-05). `ping_effects` stays out of spec (both lanes agree; gate rule instead, PATCH-06).

## E. MISSION IDENTITY OPTIONS

Current: `sha256(missionType:event_id).slice(0,16)` (event path, verified, no Date.now); `sha256(missionType:JSON.stringify(payload)).slice(0,16)` (direct path). Three live defects on the direct path: non-canonical JSON.stringify (key order forks identity), no namespace in preimage (cross-tenant collapse via ON CONFLICT), bare-hex parser ambiguity vs `event_<16hex>`.

- **M-ID-A (keep ID + collision-loud detection):** ADOPT regardless. `idempotency_key` column; on conflict compare, throw on mismatch. 1 column + ~10 lines; history-compatible.
- **M-ID-B (IdentityAuthority 'mission' domain -> `mission_<16hex>`):** ADOPT for the new era. Old bare IDs untouched; prefix makes era confusion impossible by construction.
- **M-ID-C (full SHA-256):** REJECTED. Doubles index bytes; no collision/security need at mission volumes; collisions become detected availability events under A.
- **M-ID-D (readable prefix):** MERGED into B.
- **M-ID-E (versioned preimage {identity_version, namespace, source_event_id | payload_hash, mission_type, semantic_key}):** ADOPT combined with B. Fixes all three defects; reserves the two-semantic-missions discriminator without complicating today's derivation (default semantic_key='').
- Rule honored throughout: **never rewrite historical mission IDs; new era only.**

## F. DIRECT API IDEMPOTENCY OPTIONS

Nothing in the protocol makes two HTTP requests the same logical request today; the fallback's failure modes point opposite directions (silent no-op vs duplicate work).

- **U1 (explicit Idempotency-Key):** ADOPTED. `mission_idempotency_keys` table; same key + equivalent body -> 200 + `Idempotent-Replayed: true`; same key + different body -> 409; no key -> always new (explicitly non-idempotent); without key and without event_id, require `?fresh=true` or 400. IETF-standard, client's explicit word separates retry from coincidence.
- **U2 (server command receipt):** REJECTED. Two-phase for a synchronous create; moves the dedup burden without shrinking it.
- **U3 (canonicalized content hash):** REJECTED as the user-boundary answer (it is the philosophy applied naively: makes the wrong answer deterministic). The `event_id` bridge branch stays as-is (the event IS the identity authority there).

## G. COMPLETION ATOMICITY OPTIONS

HEAD: UPDATE commits, emit unchecked (phantom completion W1/W2). Worktree reversal: checked emit, conditional UPDATE (W3 re-execution -> journal pollution + second MISSION_COMPLETED; W4 0-row race -> accepted event, row never transitions, scheduler counts it completed anyway; W5 visibility inversion). Both share the structural fact: two auto-commit statements with observable handler dispatch between them.

- **C-A (same Postgres tx + post-commit handler dispatch):** ADOPTED as primary. `emit()` accepts `options.pgClient`; dispatch deferred to a post-commit hook (not optional: naive client-passing lets handlers observe a rolled-back event); `complete()` does tx-scoped emit with deterministic `logical_id:{kind:'mission-completion',mission_id}` + conditional UPDATE + COMMIT, then post-commit dispatch; ROLLBACK+throw on failure. Provisional acceptance documented honestly.
- **C-B (state transition + outbox):** viable but strictly more machinery (converts atomicity into idempotency + a relay with lag/poison/ordering problems); held in reserve for a future multi-process topology.
- **C-C (event as completion authority):** DECLINED as disproportionate (couples every 5s scheduler poll to projection lag; reimplements claim atomicity in event-sourced terms).
- **C-D (row as authority + derived event):** FALSIFIED (recreates the phantom at the projector; derived timestamp; inverts the standing law).
- **C-E (reconciliation):** second layer, not the primary close; unimplementable without the deterministic completion identity (current payload has wall-clock fields).
- Required companions: deterministic completion identity (also load-bearing for PATCH-05's `result_event_id`); scheduler honors `complete()` rowCount.

## H. ATTEMPT MODEL OPTIONS

Two physical executions are NOT distinguishable today (no attempt record; claimed_at/started_at overwritten; retries counts failures; dispatchResult discarded). Minimal record adopted: `ping_mission_attempts(attempt_id=sha256(mission_id,attempt_number), mission_id, attempt_number (atomic increment in claim UPDATE), worker, claimed_at, started_at, finished_at, status in claimed|running|completed|failed|timed_out|orphaned, result_event_id)`. Six states is the minimum honest set (timed_out vs orphaned preserves timeout != failure; claimed vs running distinguishes crash-before-start). Attack analysis: double-claim (conditional UPDATE admits one winner), crash-after-increment (same-tx row = honest `claimed` evidence), lease recovery (sweeper marks orphaned; re-claim gets n+1), retry-after-unknown-outcome (the 300s watchdog leaves the worker promise running: attempt N `timed_out`, N+1 `completed`, both attributable — the exact evidence the effect layer needs). Six test specs in the lane file.

## I. EFFECT MODEL OPTIONS

Full classification (Lane D 3.2): live path = CANONICAL DB ONLY (pure workers; duplicate on re-execution — no logical_id except WitnessWorker) + IDEMPOTENT PROJECTION (Qdrant upsert by deterministic point id) + PURE compute (embeddings). Present but unreachable: email/SMS stubs, discovery-only GitHub/PostHog, read-only Google connector, consequential shell/git/docker in gateway (unreachable from dispatch).

**What re-execution MEANS today (operator's question):** lease-reclaim, watchdog-timeout retry, or W3 -> pure workers re-emit downstream events with NEW event_ids (journal accepts both; fan-out multiplies duplication); Qdrant converges (idempotent upsert) but PROJECTION_CREATED duplicates; **no irreversible external effect is reachable**: blast radius = journal pollution + wasted compute, not customer damage. But the code paths that would double-send an email the day a sending worker registers are the SAME paths that double-emit observations today: build re-execution safety as if effects were irreversible, because the wiring is one `register()` call away.

Effect ledger: **not justified as a build today** (no user; infrastructure needs a proven need). Adopted instead: (1) the standing GATE RULE (no REVERSIBLE/IRREVERSIBLE-effect worker registers without authorize -> ledger -> dispatch -> confirm + classification row + timeout spec); (2) the attempt record (PATCH-05) as the ledger's future join key carrying UNKNOWN_OUTCOME; (3) the ledger spec recorded (states AUTHORIZED -> DISPATCHED -> CONFIRMED | FAILED | UNKNOWN_OUTCOME, + optional COMPENSATED; effect_id = sha256('effect:'+attempt_id+':'+effect_seq) as the provider idempotency key; timeout never resolves to FAILED); (4) one-line upgrade: logical_id on PROJECTION_CREATED (duplicates -> retry-safe).

## J. PROJECTION SEMANTICS

Ordering contradiction resolved from source: **PROJECTION_CREATED -> Qdrant is TRUE; Qdrant -> PROJECTION_CREATED is FALSE.** `ProjectionWorker.handle` emits at `canonical_workers.js:196` BEFORE the Qdrant attempt; Qdrant failure is swallowed (`console.error` only); `handle` returns ok regardless. The event means **(B): canonical projection specification created** — never Qdrant materialized. P1 proven: the point is a pure function of the canonical event; rebuild = rescan `ping_events` (caveats: vector bytes depend on the embedding provider at rebuild time; `projected_at` is a dead null field). Cleanest contract: keep the name with the documented contract (bridge maps it to REPLAY_VERIFY; no breaking change), add `PROJECTION_MATERIALIZED`/`PROJECTION_FAILED` as downstream observability events. Concrete cost of the gap: replays currently attest projections whose Qdrant write may have failed silently.

## K. COLLISION SAFETY DESIGN

`event_<16hex>` confirmed (64 of 256 bits retained; 192 discarded). Full digest persisted nowhere. ON CONFLICT = silent dedup + ok receipt + handlers re-fire on the dropped content (journal/handler split-brain). Birthday: 1e6 -> 2.7e-08; 1e9 -> 2.7%; 4e9 -> 35%. Adversarial chosen-pair ~2^32 (feasible offline); second-preimage 2^64 infeasible. D-2 branch harvested exactly: 1f40cf432 compares `JSON.stringify(payload)` only, separate-tx SELECT (TOCTOU), key-order false positives vs jsonb normalization; 75827fbd7 documents the fail-open defect. Revert analyzed: ab0adbc20 enforced `canonicalEventHash` (metadata-inclusive, contradicting UER's own metadata-excluded retry semantics) -> 114afad01 clean revert; HEAD has zero enforcement. Spec: additive `canonical_hash` (full preimage digest, identity-equivalent, NULL for legacy rows never backfilled), single explicit tx around INSERT + same-tx conflict SELECT, preimage-equivalence comparison, `EVENT_IDENTITY_CONFLICT` fail-closed; legacy NULL-witness path takes an explicit legacy-dedup return (`witness_unavailable:true`) instead of silently claiming duplication. Compact historical IDs preserved byte-identically; the full hash is the collision witness.

## L. WITNESS CONTRACT

`REPLAY_COMPLETED` and `WITNESS_CREATED` payloads captured field by field (lane file). W-2 (committed ancestor of HEAD) binds `replay_engine_version`/`witness_algorithm_version`/`witness_version`, NULL for pre-W-2 rows, never backfilled; the dirty worktree adds the fail-closed completeness line (`=== 'COMPLETE' ? 'COMPLETE' : 'INCOMPLETE'`) and W2-9. Witness axiom: R (replay_event_id, read from canonical row only, W-1A) / I (input counts + transcript hash) / V (five version fields) / H (witness_root) / C (replay_completeness) / X (verdict, implicit by event type). Gap: `verified` not bound as an explicit field (PATCH-08). `compute_witness_root`: zero hits in the tree — rogue-branch concern not visible. `ping-runtime/agents/replay_worker.js` (legacy outbox ReplayWorker) is unwired (zero require references) — PRESERVED_INACTIVE per the no-deletion law, not actioned.

## M. ROUTING VERSION ANALYSIS

`EVENT_MISSION_MAP` has no version; git history proves mutability (`LINEAGE_CREATED` made terminal; W-1A added). Decision: **(B)+(E)**: `ROUTING_LAW_VERSION` constant bumped in the same commit as any map change (unit test fails when the map's canonical serialization changes without a bump); `routing_version` pinned on every obligation/mission row; reconciliation of never-derived obligations uses CURRENT law under explicitly declared contract. (A) rejected (UER must not know the bridge's law version); (C) falsified by history; (D) rejected (resurrects deliberately killed routings). Guard: law changes removing routings must drain outstanding obligations first.

## N. NAMESPACE ANALYSIS

Proven: `event_id` preimage includes namespace (`unified_event_runtime.js:132` -> `generateId`), so event-derived missions are transitively domain-separated. Gaps: the separation is inherited not declared; direct HTTP `POST /missions` has no tenant concept and identical cross-tenant payloads collapse via ON CONFLICT. Required: `namespace` column on `ping_missions`/`ping_mission_obligations`, populated by the creator from an authoritative source (bridge: `event.namespace`; HTTP: explicit validated field, default `core::system`, boundary `core::<name> | tenant::<id>`); new-era preimage folds namespace in directly (M-ID-E).

## O. RESULT IDENTITY ANALYSIS

Two realities: Reality A (`external_agent_adapter.js`) has a complete result-identity scheme with zero production callers, and its `resultIdentity` does not hash `output`/`evidence` (two different outputs mint the same result_id: silent RSLT2 collision). Reality B (live path) discards `dispatchResult`; MISSION_COMPLETED carries scheduler fiction. Axioms stated: RSLT1 (accepted result binds exactly one authorized (mission, attempt); the binding MUST include a hash of the canonical output or it identifies the permission, not the result); RSLT2 (same identity + different bytes = collision, rejected loudly); RSLT3 (MISSION_COMPLETED cannot be stronger than result verification; today it is strictly weaker while looking informative — the event must carry the verified envelope or `result_attested:false`).

## P. WORKORDER BOUNDARY

MissionScheduler dispatches missions DIRECTLY to WorkerRuntime (`mission_scheduler.js:280-366`); `issueWorkOrder` is called only from the exterior-agent lane (`orca_control_loop.js:753`). Missing on the internal path: WorkOrder authorization, Attempt identity, ResultEnvelope, result verification. **Real invariant failure:** the scheduler discards `dispatchResult` and passes fabricated `{worker, completed_at}` to `complete()` (:352-355) — `ping_missions.result` is fiction by construction (PATCH-13). Latent: no per-mission authorization boundary for internal workers (tolerable while workers are in-process code; becomes real with the first exterior-effect worker) and no attempt identity (tolerable while canonical side effects are idempotent; PATCH-05). Also: `WorkerRuntime.dispatch` can execute MULTIPLE workers per event and surfaces only the last result — documented multiplicity, unresolved.

## Q. FAILURE ALGEBRA

Minimal 9-class algebra vs current reality: RETRYABLE (only failWithRetry counter; everything retries); DETERMINISTIC_REJECTION (collapsed: `event_type_mismatch` burns 3 retries); COLLISION (ok: witness logical_id, deterministic work_order_id); UNKNOWN_OUTCOME (collapsed twice: Qdrant swallow; watchdog abandon); INCOMPLETE (ok: W-2 fail-closed); STALE (ok: W-2 NULL versions, lease reaping); UNAUTHORIZED (ok: authorizeWorkOrder, attestation_source_unavailable); INVALID (ok in exterior lane; missing in internal mission path); INFRASTRUCTURE_UNAVAILABLE (collapsed: `no_replay_provider` -> mission-ok). Dead contract: `RetryAuthority` references nonexistent `FailureAuthority`; `RetryPolicy._classifyError` exists but is unwired. Smallest fixes (PATCH-12): wire the classifier into `_failMission`/`failWithRetry` + store `error_class`; delete-or-implement the dead reference; `PROJECTION_FAILED` (PATCH-07); non-ok status on `no_replay_provider`.

## R. PATCH CARDS (13)

| ID | Title | Axioms | Size |
|---|---|---|---|
| [PATCH-01](sandbox://workspace/convergence-zoom-2026-09-19/patches/PATCH-01-durable-event-mission-recovery.md) | Durable Event→Mission Recovery (obligation journal + reconcile) | M1, C1 | ~60 lines + migration |
| [PATCH-02](sandbox://workspace/convergence-zoom-2026-09-19/patches/PATCH-02-mission-completion-atomicity.md) | Mission Completion Atomicity (shared tx + deterministic completion identity) | M4 | ~40 lines |
| [PATCH-03](sandbox://workspace/convergence-zoom-2026-09-19/patches/PATCH-03-event-collision-detection.md) | Event Collision Detection (canonical-hash witness) | E2 | ~30 lines + migration |
| [PATCH-04](sandbox://workspace/convergence-zoom-2026-09-19/patches/PATCH-04-direct-mission-idempotency.md) | Direct Mission Idempotency Contract (U1) | M3, M2 | ~50 lines + migration |
| [PATCH-05](sandbox://workspace/convergence-zoom-2026-09-19/patches/PATCH-05-attempt-identity.md) | Attempt Identity (minimal attempt record) | A1 | ~60 lines + migration |
| [PATCH-06](sandbox://workspace/convergence-zoom-2026-09-19/patches/PATCH-06-effect-gate.md) | Effect Gate (registration gate + projection retry-safety) | F1, F2 | 1 line + contract + spec |
| [PATCH-07](sandbox://workspace/convergence-zoom-2026-09-19/patches/PATCH-07-projection-observability.md) | Projection Observability (materialization events) | F2, P1 | ~15 lines |
| [PATCH-08](sandbox://workspace/convergence-zoom-2026-09-19/patches/PATCH-08-witness-verdict-binding.md) | Witness Verdict Binding (explicit verified) | W1 | 1 line |
| [PATCH-09](sandbox://workspace/convergence-zoom-2026-09-19/patches/PATCH-09-replay-completeness-certification.md) | Replay Completeness Certification (commit + prove dirty W-2) | R1 | process only |
| [PATCH-10](sandbox://workspace/convergence-zoom-2026-09-19/patches/PATCH-10-routing-version.md) | Routing Version (durable routing obligation) | M1, C1 | ~10 lines + test |
| [PATCH-11](sandbox://workspace/convergence-zoom-2026-09-19/patches/PATCH-11-mission-namespace.md) | Mission Namespace (durable, creator-populated) | M2 | ~30 lines + migration |
| [PATCH-12](sandbox://workspace/convergence-zoom-2026-09-19/patches/PATCH-12-failure-classification.md) | Failure Classification (wire classifier, fix dead contracts) | F2, A1 | ~40 lines |
| [PATCH-13](sandbox://workspace/convergence-zoom-2026-09-19/patches/PATCH-13-result-honesty.md) | Result Honesty (pass through dispatchResult, bind output hash) | RSLT1-3 | ~10 lines |

Load-bearing order: PATCH-03 (identity honesty underlies dedup) -> PATCH-02 (completion identity is load-bearing for 01/05 retries) -> PATCH-01 + PATCH-10 (obligation journal + version) -> PATCH-05 (attempts) -> PATCH-11/04 (namespace, idempotency) -> PATCH-12/13/07/08/06 (classification, honesty, observability, gate) -> PATCH-09 (certification anytime).

## S. PSEUDODIFFS

The surgical diffs are in the patch cards. The three highest-leverage ones:

**1. UER tx participation (PATCH-02/03), `unified_event_runtime.js`:**
```
- await this._pool.query(INSERT ... ON CONFLICT DO NOTHING RETURNING sequence)
+ const db = options.pgClient || this._pool;
+ // when pgClient supplied: run on client; return dispatch as post-commit hook
+ await db.query('BEGIN') (caller-owned in complete(); UER never begins a tx it does not own)
+ await db.query(INSERT ... (incl. canonical_hash) ... ON CONFLICT DO NOTHING RETURNING sequence)
+ on conflict: await db.query(SELECT ... WHERE event_id=$1)  // same tx, no TOCTOU
+ compare witness -> dedup | EVENT_IDENTITY_CONFLICT
+ if (options.pgClient) return {..., _postCommit: runHandlerAndIntegrationDispatch}
```

**2. Bridge obligation tx (PATCH-01), `event_to_mission_bridge.js`:**
```
- try { await missionRuntime.create(...); } catch { stats.failed++ }  // silent loss
+ client = pool.connect(); BEGIN;
+ INSERT INTO ping_mission_obligations (...) ON CONFLICT DO NOTHING;   // idempotent
+ INSERT INTO ping_missions (...) ON CONFLICT DO NOTHING;              // idempotent
+ COMMIT; catch { ROLLBACK; log; throw }                               // loud: supervisor restarts into reconcile()
```

**3. Attempt-carrying claim (PATCH-05), `mission_runtime.js assign()`:**
```
- UPDATE ping_missions SET status='assigned', claimed_at=NOW(), lease_until=NOW()+60s WHERE mission_id=$1 AND status='created'
+ UPDATE ping_missions SET status='assigned', attempt=COALESCE(attempt,0)+1, claimed_at=NOW(), lease_until=NOW()+60s WHERE mission_id=$1 AND status='created' RETURNING attempt
+ INSERT INTO ping_mission_attempts (attempt_id=sha256('mission-attempt:'+mission_id+':'+attempt), ...)  -- same tx
```

## T. KILL-POINT TEST MATRIX

Restart after every kill; assert durable DB/event/effect state, never just return values.

| Kill point | PATCH-01 | PATCH-02 | PATCH-03 | PATCH-05 |
|---|---|---|---|---|
| KILL_01 before durable write | no obligation, no mission; reconcile derives exactly one | n/a | no row; retry safe | no attempt row; re-claim gets attempt n (not n+1) |
| KILL_02 after durable write before acknowledgement | obligation+mission atomic (one tx): both or neither | tx rolls back: row `running`, no completion event | implicit-tx atomicity: no row | claim tx atomic: `claimed` row exists iff claim won |
| KILL_03 after ack before downstream work | reconcile finds the obligation; no duplicate mission | post-commit dispatch not run: event durable, handlers pending -> reconcile/bridge redelivery covers | n/a | attempt `claimed` without `started_at`: honest orphan evidence |
| KILL_04 after external effect before result persistence | n/a (no external effects live) | n/a | n/a | attempt stays `running`; sweeper marks `orphaned` on re-claim |
| KILL_05 after result persistence before mission completion | n/a | row `running` (tx rolled back) OR row `completed` + exactly one completion event | n/a | attempt `running` -> terminal on recovery |
| KILL_06 after completion event before mission state transition | n/a | impossible by construction (same tx); if forced: logical_id dedups the event, conditional UPDATE decides the row | n/a | result_event_id binds the single completion event |

## U. CONCURRENCY TEST MATRIX

| Race | Expected outcome |
|---|---|
| 10 identical events | one `ping_events` row; 9 dedups (`deduplicated:true`); one obligation; one mission |
| 10 bridge instances deriving | PK + ON CONFLICT collapse to one obligation/mission; no duplicates |
| 10 mission creators (same direct payload, same Idempotency-Key) | one mission; 9 `Idempotent-Replayed: true` |
| 10 mission creators (same key, different bodies) | one mission; 9 `409 Conflict` |
| 10 schedulers claiming one mission | exactly one `assign()` wins; sequential unique `attempt_number`s; losers stand down silently |
| lease expiry during execution | reaper resets row; in-flight attempt marked `orphaned` by sweeper; re-claim gets n+1; both attempts attributable |
| same completion concurrently | one UPDATE wins (rowCount 1/0); one completion event (logical_id dedup); loser does not count completion |
| same effect concurrently | no live case; gate requires the ledger before the first effectful worker |
| same event_id, different canonical content | `EVENT_IDENTITY_CONFLICT`, fail closed, zero dispatch, stored row untouched |
| same idempotency key, different HTTP command | 409 (key bound to first request's hash) |

## V. DEPENDENCY GRAPH

```
E2 collision safety -> PATCH-03 -> collision adversarial tests -> safe durable consumer dedup (PATCH-01)
E1 durability (degraded-mode fix) -> PATCH-01's loud-failure requirement
M1 mission existence -> PATCH-01 (+ PATCH-10 version pinning) -> crash/restart bridge tests -> M4 completion semantics
M4 completion -> PATCH-02 (+ deterministic completion identity) -> PATCH-05 result_event_id binding
A1 attempt separation -> PATCH-05 -> retry identity tests -> F1 effect idempotency (PATCH-06 gate)
F1/F2 -> PATCH-06/07/12 (gate, projection observability, classifier wiring)
M2/M3 identity -> PATCH-04 (U1) + PATCH-11 (namespace) + M-ID-A/B/E
W1/R1 -> PATCH-08/09 (binding explicitness, certification)
C1 recoverability -> PATCH-01 reconcile (the queryable "all clear")
```

## W. PARALLEL IMPLEMENTATION LANES

- **LANE EVENT:** PATCH-03 (collision witness + UER tx participation). Files: `unified_event_runtime.js`, `identity_authority.js`. Overlaps PATCH-02 at the emit signature — sequence 03 before 02, or one writer for both.
- **LANE ORCHESTRATION:** PATCH-01 + PATCH-10 (obligation journal + routing version + reconcile). Files: `event_to_mission_bridge.js`, `gateway_runtime.js`, migration. One writer.
- **LANE EXECUTION:** PATCH-02 + PATCH-05 + PATCH-13 (completion tx, attempt record, result honesty). Files: `mission_runtime.js`, `mission_scheduler.js`. One writer; overlaps LANE EVENT at `emit()` options — coordinate.
- **LANE REPLAY:** PATCH-08 + PATCH-09 (witness binding, completeness certification). Files: `canonical_workers.js`, test file. One writer.
- **LANE PROJECTION:** PATCH-06 (projection line) + PATCH-07 (materialization events). Files: `canonical_workers.js` ProjectionWorker. One writer; overlaps LANE REPLAY in the same file — sequence or split by worker.
- **LANE API:** PATCH-04 + PATCH-11 (idempotency contract, namespace). Files: `routes/missions.js`, `mission_runtime.js` create path, migration. One writer.
- **LANE CLASSIFY:** PATCH-12 (failure classification). Files: scheduler, retry_policy, retry_authority. One writer.
- **ONE WRITER PER MUTABLE SEMANTIC UNIT.** `unified_event_runtime.js` and `mission_runtime.js` are shared between lanes: assign a single owner per file per change window.

## X. IMPLEMENTATION READINESS

| Patch | Readiness |
|---|---|
| PATCH-03 collision witness | READY_TO_IMPLEMENT |
| PATCH-02 completion atomicity | READY_TO_IMPLEMENT (provisional-acceptance doc is the only subtlety) |
| PATCH-01 obligation journal + reconcile | READY_TO_IMPLEMENT |
| PATCH-10 routing version | READY_TO_IMPLEMENT |
| PATCH-05 attempt record | READY_TO_IMPLEMENT |
| PATCH-11 namespace | READY_TO_IMPLEMENT |
| PATCH-04 U1 idempotency | READY_TO_IMPLEMENT |
| PATCH-13 result honesty | READY_TO_IMPLEMENT |
| PATCH-07 projection observability | READY_TO_IMPLEMENT |
| PATCH-08 witness verified binding | READY_TO_IMPLEMENT |
| PATCH-12 failure classification | NEEDS_ONE_MORE_TRACE (confirm no other callers depend on `status:'ok'` from the no-provider path) |
| PATCH-06 effect gate | READY_TO_IMPLEMENT (gate + projection line); ledger itself OBSOLETE-as-build until the first effectful worker |
| PATCH-09 completeness certification | READY_TO_IMPLEMENT (run, record, commit) |

No patch is BLOCKED_BY_AXIOM_DECISION: the axiom ledger resolves every open question the patches depend on. No giant architectural decision is needed before progress.

## Y. THREE BEST CONVERGENCE SHAPES

### Y1 — MINIMAL RECONCILIATION (smallest mechanism count)
**What it is:** PATCH-03 + PATCH-01 (+PATCH-10) + PATCH-02 (with deterministic completion identity) + PATCH-05. No new long-lived services, no new tables beyond obligations/attempts/keys, no Temporal, no outbox relay.
**What it fixes:** every proven loss window (B3/B4, startup ordering, phantom completion, re-execution invisibility) and the collision fail-open.
**What it leaves open:** completion visibility is still tx-local (no cross-process story — fine, there is no cross-process topology); failure classes still coarse (PATCH-12 deferred); result verification still unwired (Reality A stays dormant).
**Files touched:** `unified_event_runtime.js`, `identity_authority.js`, `event_to_mission_bridge.js`, `mission_runtime.js`, `mission_scheduler.js`, `gateway_runtime.js`, 2-3 migrations.
**New mechanisms:** `ping_mission_obligations`, `ping_mission_attempts`, `canonical_hash` column, `reconcile()` (startup + interval), `ROUTING_LAW_VERSION`.
**Old mechanisms reused:** ON CONFLICT dedup, LegacyIngressAdapter's per-row disposition pattern, conditional-claim UPDATE, IdentityAuthority.
**Crash semantics:** every boundary in matrix T is covered: commit+consequence are either atomic (one tx) or reconciled (obligation journal + version pinning).
**Migration:** all additive; no historical rewrite; legacy rows honestly marked (NULL witness, default namespace, NULL routing_version).
**Operational burden:** one periodic job (5 min) + two alert counters (dead_letter, EVENT_IDENTITY_CONFLICT). Minimal.
**Best when:** the operator wants the invariant closed this week with the smallest possible new surface.

### Y2 — TRANSACTIONALLY STRONG (strongest PostgreSQL atomicity without violating authority)
**What it is:** Y1 + UER `options.pgClient` generalized as the standard participation mechanism: every authority that must atomically couple a decision to an event does so through a caller-owned transaction with UER as the decider and post-commit dispatch as the observation mechanism. Provisional acceptance documented as the semantic. Plus PATCH-12 (classified failures make tx-abort decisions precise) and PATCH-13 (results ride the same tx).
**What it fixes:** everything Y1 fixes, plus: the completion path can never show a half-state to any observer; failure classification is durable and queryable; no outbox/relay component is ever needed while the topology stays single-database.
**What it leaves open:** cross-database or cross-process atomicity (genuinely out of scope: there is one Postgres); the provisional-acceptance semantic needs every future caller to understand it (documentation burden).
**Files touched:** Y1's set + `retry_policy.js`, `retry_authority.js`, scheduler fail paths.
**New mechanisms:** same as Y1 + `error_class` column; no new tables beyond Y1.
**Old mechanisms reused:** same as Y1.
**Crash semantics:** the tx is the unit of atomicity everywhere; anything not in a tx is reconciled. The one honest statement: "accepted into the pending transaction" vs "committed".
**Migration:** same additive profile as Y1.
**Operational burden:** Y1's + failure-class dashboards. No new runtime components.
**Best when:** the operator wants the strongest guarantee the current single-Postgres topology can give, and is willing to standardize the tx-participation pattern as the house way of coupling decisions to events.

### Y3 — DURABLE CONSUMER MODEL (explicit durable consumer semantics for a growing consumer set)
**What it is:** Y1's obligation journal generalized: a consumer registry (`event_consumers(consumer_name, namespace, registered_at)`), per-consumer delivery receipts as the general form of B2 (the obligation table is the bridge's specialization), routing-versioned obligations per consumer, `reconcile()` per consumer on startup + interval, and UER `replay({afterSequence})` as the policy-free read primitive every consumer builds on. New consumers (graph projection listener, integrations) get durable delivery by registering, not by bespoke wiring.
**What it fixes:** everything Y1 fixes, plus the NEXT three occurrences of the same defect class: any future consumer of `ping_events` inherits at-least-once delivery with idempotent handling instead of re-discovering the B3 window.
**What it leaves open:** the registry is new mechanism surface (consumer lifecycle, deregistration semantics, per-consumer poison handling); it is the most machinery of the three.
**Files touched:** Y1's set + a new `event_consumers`/`event_deliveries` schema + consumer SDK wrapper around `replay()`.
**New mechanisms:** consumer registry, per-consumer receipts, per-consumer reconcilers.
**Old mechanisms reused:** the obligation journal becomes the reference implementation; the adapter's per-row pattern again.
**Crash semantics:** per-consumer at-least-once with idempotent derivation; exactly-once effects via the existing Phase-13 machinery.
**Migration:** additive; consumers migrate one at a time (bridge first).
**Operational burden:** per-consumer lag metrics, per-consumer dead-letter queues, registry administration. The highest of the three.
**Best when:** the operator expects the consumer set to grow (it will: graph projection, integrations, future intelligence workers) and wants the durability contract to be a platform property rather than a per-consumer reimplementation.

**No selection is made here.** Y1 is the recommended default (smallest mechanism count, closes every proven window); Y2 if the operator wants the house pattern standardized; Y3 if the consumer set is about to grow. All three preserve the standing law: UER stays the acceptance authority, the bridge stays the trigger authority, CanonicalEventEnvelope is never revived as a second runtime event authority, mechanisms are preserved and classified (EventBridge PRESERVED_INACTIVE, legacy outbox PRESERVED_INACTIVE, unwired replay_worker preserved), and no historical identity is rewritten.

---

## DEVIN / HERMES VERIFICATION VERDICT

**Hermes (WAVE_3K audit + Smart App Control forensics):** the code-grounded claims are largely **FALSIFIED** — no `hermes/` modules exist in the convergence worktree, the named telemetry classes exist nowhere, and `_load_connector` is a real importlib implementation, not a stub. The forensics binary hashes are STALE (Hermes.exe rebuilt 2026-09-01). **Bearing on the convergence invariants: NONE.** Neither "Hermes" (the Nous desktop agent CLI invoked as an exterior worker, nor the standalone Python mission runtime in a separate repo) touches `ping_events`, event identity, or the mission path.

**Devin cascade (ping-event-runtime):** intent real, implementation **broken against real Postgres** — the collision-detection SELECT is missing its `$1` placeholder (`unified_event_runtime.js:159` in that worktree); the designed `deduplicated:true` path only works in mocks. It compares full payload (not truncated ID, not full digest; metadata deliberately excluded). **Must be fixed and re-proven against a real pool before any merge toward the convergence line.** Its early-return dedup (no handler re-dispatch) is a behavior change vs the convergence worktree's fall-through at-least-once law — an operator decision, recorded in PATCH-03.

**Devin cascade (ping-codex-convergence):** ContextPack identity binding **VERIFIED and healthy** (issuance gate + result-identity hash + envelope mismatch rejection + content-derived ID). No conflict with convergence invariants; the ContextPack is a derived consumer, never an event writer.

**Two strongest facts:** (a) deterministic event-derived mission identity **VERIFIED** (`mission_runtime.js:71-76`, no Date.now); (b) the durable-handoff break **VERIFIED** — and sharpened: beyond the crash window, there is a **live startup-ordering defect** (`gateway_runtime.js:493` adapter before `:605` bridge) causing permanent mission loss on normal boots, which is the NEW CONSTITUTIONAL CONTRADICTION escalated below.

## ADJUDICATIONS

1. **Lane C vs Lane D on `ping_mission_attempts`:** decided for Lane D per Lane C's own falsifier F-S2. The table stands in minimal form (PATCH-05).
2. **D-2 branch vs reverted main on collision comparison:** decided for the identity law — compare the preimage-equivalent full digest, not payload-only (key-order false positives) and not metadata-inclusive (contradicts retry semantics). PATCH-03.
3. **Devin early-return dedup vs main fall-through:** not decided — recorded as an explicit operator choice in PATCH-03 (at-least-once vs no-redispatch on duplicates). The pass does not smuggle the decision in.

## ESCALATIONS (per the reporting contract)

1. **NEW CONSTITUTIONAL CONTRADICTION:** the startup-ordering mission-loss defect (Lane A E1). `gateway_runtime.js` starts LegacyIngressAdapter (:493, immediate first poll) ~110 lines before `EventToMissionBridge.start()` (:605). Rows swept in that window are persisted to `ping_events`, marked `processed=TRUE`, and never get missions — permanent, silent, on normal boots, no retry path. This violates the durable-handoff invariant (M1/C1) in the live system, not just under crash injection. Recommended for the operator's decision queue. (PATCH-01's reconcile + startup reorder closes it; no patch applied in this pass per the read-only rule.)
2. **No unresolved two-writer condition found** (Lane A E2): `ping_events` has exactly one production writer (UER); `canonical_events.processed` has exactly one live writer (LegacyIngressAdapter; EventBridge confirmed PRESERVED_INACTIVE); CanonicalEventEnvelope documents itself as receipt-only and honors the standing law.
3. **Flag (not an escalation):** the Devin `ping-event-runtime` branch's broken SQL must be fixed before any merge toward the convergence line (Lane A E3).
4. **Process note (not an escalation):** three lanes' uncommitted work currently shares the convergence worktree; assign one writer per mutable semantic unit before implementation begins (lanes proposed in section W).

## WHAT REMAINS UNSOLVED (honest list)

- Dispatch-on-dedup law (at-least-once vs no-redispatch): operator decision, not derived.
- The `dispatchTimeoutMs` orphaned-promise shape: made visible/attributable (PATCH-05), not prevented.
- Multi-worker dispatch multiplicity (one event -> N workers, last result wins): documented, unresolved.
- Full 9-class failure algebra enforcement: four collapses fixed (PATCH-12); the rest is a later pass.
- Reality-A result verification wiring: gated on PATCH-05, deferred by design.
- The effect ledger: specified, unbuilt by design (no user yet).
- Degraded-mode E1 violation (ok without durability when pool is null): named in the ledger; no patch card (needs an operator decision on degraded-mode semantics first).
- Periodic reconciler interval and alerting target: policy choices for the operator (noted by Lane C).
