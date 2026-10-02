# CONSTITUTIONAL AXIOM LEDGER — Zoom Pass 2026-09-19

Target: `/home/nolan/worktrees/constitutional-convergence-authority-law`, HEAD `0d3cddd4a67238e0511ae7b58718cd75dd29d8d3` (verified, no drift).
Method: read-only audit across five lanes (A-E). Evidence states: PROVEN (live code) / IMPLEMENTED (code present, behavior unverified here) / VIOLATED (live code contradicts) / UNVERIFIED.

---

## AXIOM E1 — EVENT DURABILITY
- **STATEMENT:** ACCEPTED(event) -> DURABLE(event). If UER returns ok for a canonical event, the event survives process restart.
- **SCOPE:** `UnifiedEventRuntime.emit()`, table `ping_events`.
- **AUTHORITY OWNER:** UnifiedEventRuntime (canonical event acceptance authority).
- **WHY REQUIRED:** Acceptance is the constitutional commitment; everything downstream (missions, projections, witnesses, replay) reasons from the journal.
- **CURRENT STATUS:** PROVEN in the normal path (Lane B T6a: single-statement implicit-tx commit makes the row durable; Postgres durability).
- **CURRENT VIOLATION:** Degraded mode. When `this._pool` is null, `emit()` skips persistence, still dispatches handlers, and returns ok with `sequence: null` (Lane B, step 6). Acceptance is claimed with no durability behind it.
- **COUNTEREXAMPLE:** Adapter sweep marks `processed=TRUE` on an emit that returned ok from an in-memory-only UER; restart loses the journal row while the receipt says accepted.
- **MINIMUM PROOF:** In degraded mode, emit must return a non-ok status or an explicit `durable:false` marker; acceptance receipts must never claim durability they did not obtain.
- **DEPENDENT AXIOMS:** M1, C1.

## AXIOM E2 — EVENT COLLISION SAFETY
- **STATEMENT:** Same event_id + same canonical bytes -> DEDUPLICATE. Same event_id + different canonical bytes -> COLLISION / FAIL CLOSED. Never: same event_id + different bytes -> silently DO NOTHING.
- **SCOPE:** `UnifiedEventRuntime.emit()` persist path.
- **AUTHORITY OWNER:** UnifiedEventRuntime.
- **WHY REQUIRED:** 64-bit truncated identity (`event_<16hex>`) makes silent absorption a data-loss defect with a success receipt; the journal and handlers can split-brain (journal holds content A, handlers fired for content B).
- **CURRENT STATUS:** VIOLATED (Lane B, COLLISION.md section 3). Current law: `ON CONFLICT (event_id) DO NOTHING`, no content comparison, full digest persisted nowhere, ok receipt, handlers re-fire.
- **CURRENT VIOLATION:** Live at HEAD. The reverted main-branch enforcement (ab0adbc20) contradicted retry semantics (metadata-inclusive hash vs metadata-excluded identity) and was reverted; the Devin sibling branch's enforcement has a syntactically invalid SELECT against real Postgres (Lane A D1).
- **COUNTEREXAMPLE:** Two distinct payloads with the same 64-bit prefix: second INSERT conflicts, is dropped from the journal, caller told ok, handlers process the dropped content.
- **MINIMUM PROOF:** Additive `canonical_hash` column (full preimage digest, identity-equivalent); same-tx conflict SELECT; equal -> dedup; different -> `EVENT_IDENTITY_CONFLICT` fail closed; legacy NULL-witness rows take an explicit legacy-dedup path that says so.
- **DEPENDENT AXIOMS:** M2 (mission dedup relies on event identity honesty).

## AXIOM M1 — EVENT-DERIVED MISSION EXISTENCE
- **STATEMENT:** DURABLE(event E) AND ROUTES_TO(E, T) -> EVENTUALLY DURABLE(mission M), where mission_id = deterministic(E, T, semantic discriminator). EVENTUALLY, not same-transaction.
- **SCOPE:** `EventToMissionBridge`, gateway startup ordering, `ping_missions`.
- **AUTHORITY OWNER:** EventToMissionBridge (accepted-event -> mission trigger authority).
- **WHY REQUIRED:** The standing law assigns the trigger to the bridge; a durable event whose required mission never materializes is the proven mission-loss defect.
- **CURRENT STATUS:** VIOLATED. Two independent proofs: (1) Lane B B3: crash after `ping_events` commit before/during handler dispatch leaves the row with `processed=FALSE`, zero handlers ran, no restart redelivery; (2) Lane A section 3b: `gateway_runtime.js:493` starts LegacyIngressAdapter (immediate first poll) ~110 lines before `EventToMissionBridge.start()` at `:605`; rows swept in that window get `processed=TRUE` after UER persistence while the bridge was never subscribed: permanent mission loss, no retry path.
- **CURRENT VIOLATION:** The startup-ordering window (2) is LIVE at HEAD: not a crash-shaped corner, a normal-boot defect on every restart with pending legacy rows.
- **COUNTEREXAMPLE:** Restart gateway with 3 unprocessed `canonical_events` rows; adapter sweeps all 3 before bridge subscribes; all 3 become `processed=TRUE`; zero missions exist; sweep filter `processed IS DISTINCT FROM TRUE` skips them forever.
- **MINIMUM PROOF:** Obligation journal (bridge writes obligation + mission in one tx) + `reconcile()` at startup before first subscription + periodic sweep + startup order fixed so no consumer marks accepted before the trigger authority is live.
- **DEPENDENT AXIOMS:** E1, C1.

## AXIOM M2 — MISSION UNIQUENESS
- **STATEMENT:** One logical mission must not become two logical missions (or zero) because of retry, restart, duplicate delivery, polling, consumer replay, or network ambiguity. Event-derived: same source event + same mission semantics -> same mission_id.
- **SCOPE:** `MissionRuntime.create()`, `EventToMissionBridge`.
- **AUTHORITY OWNER:** MissionRuntime (mission authority).
- **WHY REQUIRED:** Without it, reconciliation and retries fork work; with silent absorption, distinct intents collapse.
- **CURRENT STATUS:** PROVEN for the event-derived path (Lane A 3a: `SHA256(missionType:event_id).slice(0,16)`, no Date.now, `ON CONFLICT DO NOTHING`). VIOLATED on the direct path: `missionType:JSON.stringify(payload)` is key-order-sensitive (same intent -> two missions), and identical cross-tenant payloads collapse into one (two intents -> one mission, second silently absorbed; Lane C defect 2, Lane D 5.2).
- **CURRENT VIOLATION:** Direct `POST /missions` path only.
- **COUNTEREXAMPLE:** Two tenants POST identical payloads; second is absorbed by ON CONFLICT; the second tenant's intent is lost with a 200.
- **MINIMUM PROOF:** Collision-loud conflicts (compare stored `idempotency_key` on conflict, throw on mismatch); new-era `mission_<16hex>` via IdentityAuthority 'mission' domain over a versioned preimage (namespace + semantic_key); explicit Idempotency-Key contract for the HTTP route.
- **DEPENDENT AXIOMS:** E2, M3.

## AXIOM M3 — USER MISSION IDEMPOTENCY
- **STATEMENT:** HTTP retry must not mean "new mission"; two intentional identical requests must not necessarily collapse into one. Identity must encode semantic sameness, not accidental byte sameness.
- **SCOPE:** `POST /missions`, `MissionRuntime.create()` fallback branch.
- **AUTHORITY OWNER:** MissionRuntime (mission authority); the gateway route (protocol).
- **WHY REQUIRED:** At the user boundary, intent and content are different things; a client retry and a coincidental duplicate have identical content and opposite correct handling.
- **CURRENT STATUS:** VIOLATED. The fallback `missionType:JSON.stringify(payload)` cannot distinguish retry from coincidence, and its two failure modes point opposite directions (silent no-op vs duplicate work; Lane D 5.2).
- **CURRENT VIOLATION:** Live on the route today; no Idempotency-Key support anywhere.
- **COUNTEREXAMPLE:** Client retries a POST after a lost response; payload has a client timestamp; retry mints a second mission; work executes twice.
- **MINIMUM PROOF:** U1 contract: `mission_idempotency_keys(key PK, mission_id, request_hash, created_at, expires_at)`; same key + equivalent body -> 200 + `Idempotent-Replayed: true`; same key + different body -> 409; no key -> always new (explicitly non-idempotent). The `event_id` bridge branch stays as-is (the event is the identity authority there).
- **DEPENDENT AXIOMS:** M2.

## AXIOM M4 — MISSION STATE / EVENT COHERENCE
- **STATEMENT:** mission.status = COMPLETED IFF canonical completion fact exists. A mission must not durably claim COMPLETED while canonical truth lacks the corresponding completion fact; canonical truth must not permanently claim MISSION_COMPLETED while mission state permanently remains RUNNING.
- **SCOPE:** `MissionRuntime.complete()`, `MissionScheduler`.
- **AUTHORITY OWNER:** MissionRuntime (mission authority); UER (event authority).
- **WHY REQUIRED:** Completion is the boundary where operational state and canonical history must agree; divergence in either direction corrupts both.
- **CURRENT STATUS:** VIOLATED in both orderings (Lane D 1.2-1.3). HEAD: phantom completion (row completed, no event; W1 crash window, W2 rejection-without-crash). Worktree reversal: W3 (emit accepted, crash before UPDATE -> lease reaper re-dispatches -> worker re-executes -> journal pollution + second MISSION_COMPLETED with a new identity), W4 (emit accepted, UPDATE matches 0 rows -> accepted event, row never transitions; scheduler counts it completed anyway), W5 (visibility inversion).
- **CURRENT VIOLATION:** Live at HEAD (W1/W2); the dirty reversal trades one divergence for another.
- **COUNTEREXAMPLE (W3):** complete() emits MISSION_COMPLETED (accepted), crash before UPDATE; reaper resets row to `created`; worker re-executes; every canonical worker except witness re-emits downstream events with NEW event_ids (no logical_id); second complete() mints a second MISSION_COMPLETED; journal doubled.
- **MINIMUM PROOF:** C-A: shared Postgres transaction (UER accepts `options.pgClient`; handler/integration dispatch deferred to a post-commit hook; `complete()` does tx-scoped emit with deterministic `logical_id:{kind:'mission-completion',mission_id}` + conditional UPDATE + COMMIT, then post-commit dispatch; ROLLBACK+throw on failure) + scheduler honors `complete()` rowCount.
- **DEPENDENT AXIOMS:** A1 (attempt identity disambiguates re-execution), RSLT axioms.

## AXIOM A1 — ATTEMPT SEPARATION
- **STATEMENT:** MISSION != ATTEMPT. A logical mission may execute zero, one, or multiple attempts. Retries must not mutate the meaning of mission identity.
- **SCOPE:** `MissionScheduler` claim/lease/dispatch/retry/reap, `ping_missions`.
- **AUTHORITY OWNER:** MissionRuntime (execution-routing authority owns claim; scheduler owns routing).
- **WHY REQUIRED:** Without attempt identity, re-execution is invisible and unattributable; timeout vs orphan vs failure are indistinguishable; the effect layer has nothing to join on.
- **CURRENT STATUS:** VIOLATED (Lane D 2.2). No attempt record; `claimed_at`/`started_at` overwritten per claim; `retries` counts failures not claims; the scheduler discards `dispatchResult`.
- **CURRENT VIOLATION:** Live at HEAD.
- **COUNTEREXAMPLE:** Watchdog timeout fires at 300s; `failWithRetry` -> retry_pending -> reclaim -> new claim -> worker re-executes while the first promise still runs. Both executions' downstream events persist; no durable surface distinguishes them except event-timestamp forensics.
- **MINIMUM PROOF:** `ping_mission_attempts(attempt_id=sha256(mission_id,attempt_number), mission_id, attempt_number atomically incremented in the claim UPDATE, worker, claimed_at, started_at, finished_at, status in claimed|running|completed|failed|timed_out|orphaned, result_event_id)`; sweeper marks superseded running attempts orphaned. (Adjudicated against Lane C's deletion proposal per its own falsifier F-S2: the journal cannot represent claimed-but-never-started, timed_out-vs-orphaned, or finished_at.)
- **DEPENDENT AXIOMS:** M4, F1.

## AXIOM F1 — EFFECT SEPARATION
- **STATEMENT:** ATTEMPT != EFFECT. One attempt may cause zero or multiple external effects. A retry must not blindly duplicate an irreversible effect.
- **SCOPE:** Workers and connectors reachable from mission dispatch.
- **AUTHORITY OWNER:** The worker's owning authority; the (future) effect ledger.
- **WHY REQUIRED:** The day an effectful worker registers, today's re-execution paths double-send. The wiring that makes an effect irreversible is one `register()` call away (Lane D 3.4).
- **CURRENT STATUS:** CONCEPTUALLY VIOLATED, CONSEQUENCE-FREE TODAY. Live path: canonical workers are CANONICAL DB ONLY (but duplicate on re-execution: no logical_id except witness), ProjectionWorker is IDEMPOTENT PROJECTION, email/SMS are stubs, no CRM/publishing/deployment/shell reachable from dispatch (Lane D 3.2-3.3).
- **CURRENT VIOLATION:** No ledger exists; no registration gate exists. The defect is structural, not yet behavioral.
- **COUNTEREXAMPLE (future):** A sending worker registers; lease-expiry reclaim re-executes; email sends twice; no ledger row exists to return the recorded outcome instead of re-calling the provider.
- **MINIMUM PROOF:** Not a build today (no user). The standing GATE RULE: no worker performing a REVERSIBLE/IRREVERSIBLE external effect may register until it goes authorize -> ledger -> dispatch -> confirm, with effect_id = sha256('effect:'+attempt_id+':'+effect_seq) as the provider idempotency key. Ledger states: AUTHORIZED -> DISPATCHED -> CONFIRMED | FAILED | UNKNOWN_OUTCOME (+ optional COMPENSATED).
- **DEPENDENT AXIOMS:** A1, F2.

## AXIOM F2 — UNKNOWN OUTCOME
- **STATEMENT:** timeout != failure. If PING sends a consequential request and loses the response, state must represent UNKNOWN_OUTCOME, never FAILED or SUCCESS, unless evidence proves one.
- **SCOPE:** All effect and execution boundaries.
- **AUTHORITY OWNER:** The executing authority (worker/scheduler).
- **WHY REQUIRED:** Collapsing unknown into failed triggers wrong compensation; collapsing into success corrupts the journal.
- **CURRENT STATUS:** VIOLATED in three places (Lanes D, E): (1) ProjectionWorker Qdrant failure is swallowed into `console.error` and `handle` returns ok (UNKNOWN_OUTCOME -> success); (2) scheduler watchdog abandons the worker promise, its late events persist, and the retry is recorded as an ordinary failure (timeout -> failed); (3) `no_replay_provider` emits an honest `REPLAY_COMPLETED{verified:false}` but the worker returns `status:'ok'` so the mission completes (INFRASTRUCTURE_UNAVAILABLE -> mission-ok).
- **CURRENT VIOLATION:** All three live at HEAD.
- **COUNTEREXAMPLE:** Qdrant is down; ProjectionWorker emits PROJECTION_CREATED, Qdrant write throws, error swallowed, handle returns ok; the journal claims a projection that does not exist in Qdrant.
- **MINIMUM PROOF:** `PROJECTION_MATERIALIZED`/`PROJECTION_FAILED` downstream events (observability); attempt statuses `timed_out`/`orphaned` distinct from `failed`; non-ok worker status on `no_replay_provider`.
- **DEPENDENT AXIOMS:** A1, F1.

## AXIOM P1 — PROJECTION REBUILDABILITY
- **STATEMENT:** If Qdrant is a projection, loss of Qdrant state must not destroy canonical truth. CANONICAL STATE -> deterministic/replayable projection.
- **SCOPE:** ProjectionWorker, EmbeddingService, Qdrant.
- **AUTHORITY OWNER:** The projection owner (EmbeddingService); Qdrant is never an authority.
- **WHY REQUIRED:** Otherwise the projection store becomes a second truth authority.
- **CURRENT STATUS:** PROVEN (Lane E Part 9). Qdrant point is a pure function of the canonical event (`toQdrantId(event.event_id)`, idempotent upsert); rebuild = rescan `ping_events`, re-run `projectToQdrant`. Caveats: vector bytes depend on the embedding provider at rebuild time; `projected_at` is a dead null field.
- **CURRENT VIOLATION:** None on rebuildability. Related naming defect: PROJECTION_CREATED is emitted before the Qdrant attempt and means (B) canonical projection specification created, not materialized; the currently-swallowed materialization outcome needs `PROJECTION_MATERIALIZED`/`PROJECTION_FAILED` observability.
- **COUNTEREXAMPLE:** n/a (holds).
- **MINIMUM PROOF:** Delete the Qdrant collection, rebuild from `ping_events`, assert point IDs and provenance payloads match.
- **DEPENDENT AXIOMS:** E1.

## AXIOM W1 — WITNESS BINDING
- **STATEMENT:** A witness attestation must identify the exact proof it attests: replay R, input set I, algorithm/version V, root H, completeness C, verdict X. WITNESS_CREATED without proof binding must never imply verified replay.
- **SCOPE:** WitnessWorker, ReplayWorker, kernel replay provider.
- **AUTHORITY OWNER:** ReplayWorker (replay authority); WitnessWorker (attestation, derived).
- **WHY REQUIRED:** A witness is a derived replay attestation, not a standalone authority; its meaning is entirely its binding.
- **CURRENT STATUS:** PROVEN at HEAD for the binding (Lane E Part 11): W-1A reads verdict and proof from the canonical row only; W-2 binds `replay_engine_version`/`witness_algorithm_version`/`witness_version`, NULL for pre-W-2 rows, never backfilled; `logical_id` makes attestations retry-idempotent.
- **CURRENT VIOLATION:** Minor gap: `verified` (the verdict X) is implied by event type only, not bound as an explicit field; a row reader cannot see the verdict without knowing the type contract.
- **COUNTEREXAMPLE:** n/a for the binding; the gap is ergonomic, not semantic.
- **MINIMUM PROOF:** Add bound `verified: true` into the witness object (additive; recommended).
- **DEPENDENT AXIOMS:** R1.

## AXIOM R1 — REPLAY COMPLETENESS
- **STATEMENT:** ABSENCE OF INPUT must never silently become COMPLETE INPUT. Missing completeness metadata fails closed.
- **SCOPE:** Kernel replay execution provider, ReplayWorker.
- **AUTHORITY OWNER:** ReplayWorker.
- **WHY REQUIRED:** A replay over a truncated input set that verifies as complete is a false proof.
- **CURRENT STATUS:** PROVEN (Lane E, R1 section). Dirty line: `kernelResult.completeness === 'COMPLETE' ? 'COMPLETE' : 'INCOMPLETE'`; INCOMPLETE never verifies; WitnessWorker requires `verified===true` from the canonical row and emits observable `WITNESS_REJECTED` otherwise; W2-9 proves end to end. Pre-W-2 defaulted to COMPLETE (the hole W-2 closed).
- **CURRENT VIOLATION:** None. Remaining work is certification of the dirty state (commit the fail-closed line + W2-9), not new semantics.
- **COUNTEREXAMPLE:** Legacy provider returns ok + zero violations but no completeness field -> `verified:false`, `completeness:'INCOMPLETE'`, zero WITNESS_CREATED, one WITNESS_REJECTED (W2-9).
- **MINIMUM PROOF:** W2-9 test in CI, green.
- **DEPENDENT AXIOMS:** W1.

## AXIOM H1 — HISTORICAL NON-REINTERPRETATION
- **STATEMENT:** A historical proof/event/identity must never silently acquire new semantics because current code changed. Historical data may be legacy/unsupported/unverifiable/versioned, never silently reinterpreted.
- **SCOPE:** All identity and event schemas.
- **AUTHORITY OWNER:** The owning authority per decision (IdentityAuthority for identity, UER for events).
- **WHY REQUIRED:** Otherwise "fixing" identity retroactively rewrites what past rows meant.
- **CURRENT STATUS:** PROVEN by mechanism (Lane E): W-2 versions NULL for pre-W-2 rows, never backfilled; `canonical_hash` spec mandates NULL for legacy rows, never recomputed; new-era `mission_` prefix makes era confusion impossible by construction; `compute_witness_root` has zero hits in the tree (rogue-branch concern not visible).
- **CURRENT VIOLATION:** Presentational only: `canonical_input_hash` field actually holds the transcript hash (naming drift); do not rename stored fields.
- **COUNTEREXAMPLE:** n/a (holds).
- **MINIMUM PROOF:** Any identity change ships with a version/era marker and a migration that marks (never rewrites) historical rows.
- **DEPENDENT AXIOMS:** E2, M2.

## AXIOM C1 — CAUSAL RECOVERABILITY
- **STATEMENT:** Given canonical event E, PING must be able to determine whether all required deterministic downstream artifacts exist (mission, claim, projection, replay, witness, lineage, knowledge update).
- **SCOPE:** The full event -> consequence chain.
- **AUTHORITY OWNER:** Per-artifact owner; the reconciler is a consumer, not an authority.
- **WHY REQUIRED:** This is the systemic issue Nolan named: PING can durably know a fact without a durable record that every required downstream deterministic consequence was produced.
- **CURRENT STATUS:** VIOLATED. No generic reconciler; the bridge keeps session-only stats; `ping_events.processed` is write-never/read-never in the UER path; `UER.replay()` has no consumer registry and is only called by the Phase-20 context-pack builder.
- **CURRENT VIOLATION:** Live at HEAD; same evidence as M1.
- **COUNTEREXAMPLE:** Any event in Lane B's B3/B4 state: the journal row exists; no query can answer "was its mission produced" because the join key (`payload->>'event_id'`) is convention, not contract, and `source_event_id` does not exist as a column.
- **MINIMUM PROOF:** `ping_mission_obligations` journal + `source_event_id` column + `reconcile()` (startup + periodic) + routing-version pinning; the reconciler's "all clear" is a queryable state, not a session counter.
- **DEPENDENT AXIOMS:** M1, E1.
