# Convergence Backlog O1-O20

Project-management state only. This is NOT a runtime queue.

- Worktree: /home/nolan/worktrees/constitutional-convergence (Pig)
- Branch: constitutional-convergence-v2
- O1 implementation commit: de1112454 "fix(events): converge legacy ingress on constitutional event authority" (2026-09-18, 15 files, F7+MC-1)
- Ultimate invariant: no lost work, no competing authority, no unexplained duplicate canonical results, no cross-namespace leakage, no required recovery state existing only in memory.

States: BLOCKED / READY / RUNNING / FALSIFIED / PATCHING / VERIFYING / CERTIFIED / DEFERRED

## O1 — Event Authority convergence (F7 identity + MC-1 legacy ingress)
- Dependency: none. State: CERTIFIED.
- Authority: EVENT.
- Falsification target: competing identity serializers; legacy ingress bypassing canonical acceptance.
- Evidence: F7-B 48/48 runtime checks + test_patch_004 7/7; MC-1 CERT_PASS 85/85 attested 2026-09-18 (scratch DB, cleaned — agent-attested, not certified, per ruling); production invariants reconfirmed read-only (canonical_events 0, repository_events 0, ping_events 739 Era H rows, 739 distinct IDs, 0 event_-prefixed).
- MC-1 harness preserved reproducibly 2026-09-18 (ruling item 4): tests/mc1-legacy-ingress/ — README + setup/teardown scripts + 93-assertion suite + assertion catalog + implementation notes, no credentials, env-based PG config. Self-run on fresh scratch DB: 93/93 PASS. Count is honestly 93 (not padded to 85; the 8 extra are real coverage: cursor-table absence, fixture guards, fuller EventRepository/state-machine/reconciliation groups). Latent product defect found and documented (not fixed): runtimeIdentityAuthority.initialize() throws CANONICALIZATION_ERROR on Node v22 (http_parser undefined in fingerprint); nothing calls it today.
- Blocker: none. Note: depth-64 counting convention (caller value vs full envelope) deferred as F7-C evidence clarification; fail-closed boundary itself certified.

## O2 — Queue Authority Map
- Dependency: O1. State: CERTIFIED (2026-09-18).
- Authority: EVENT, MISSION, CLAIM, LEASE, RETRY, ROUTING, EXECUTION, RESULT, DEAD-LETTER.
- Falsification target: a hidden competing authority owns one of the nine decisions.
- Evidence: three read-only audit slices (mission/claim/lease/retry/scheduler; worker/routing/execution/result; queue transports/pending/dead-letter) tracing writers/readers/transitions/live-reachability from gateway bootstrap. Authority map:
  - EVENT: UnifiedEventRuntime.emit() -> ping_events (prior ruling; confirmed no live bypass).
  - MISSION: MissionRuntime + ping_missions (sole lifecycle writer, 144 live rows).
  - CLAIM: MissionRuntime.assign() — atomic conditional UPDATE is the arbiter; MissionScheduler is the sole claim executor.
  - LEASE: MissionRuntime (assign/renewLease/reapExpiredLeases; 60s leases; scheduler sole client).
  - RETRY: MissionRuntime (failWithRetry + retry_at gate; max_attempts=3, 5s backoff; no separate retry component).
  - ROUTING: MissionScheduler (which mission, when) + WorkerRuntime.dispatch() (which registered workers; eventTypes+capacity). Complementary, not competing. ORCA control loop ruled a separate bounded domain (exterior work-order routing, disjoint work set/store), flagged for O16 formalization.
  - EXECUTION: MissionRuntime (state) + 8 canonical workers (behavior) on the production spine. ExecutionEngine = DUPLICATE deliberately disabled by DOC-CONTRACT; Python worker transport = dormant-by-deployment (container not running).
  - RESULT: MissionRuntime.complete() (ping_missions.result + MISSION_COMPLETED) for spine; UnifiedEventRuntime.emit() sole canonical recorder of WORKER_COMPLETED/WORKER_FAILED (producers SystemEmitter + recordVerifiedResult both via emit; retired worker_registry producer unwired).
  - DEAD-LETTER: DeadLetterAuthority + repository_dead_letters (sole writer, wired exhaustion path; terminal archive, no redrive).
- Preserved, not deleted: event_bridge.js (PRESERVED_INACTIVE), mission_authority*.js + mission_event_bus.js + persistent_queue_authority.js (PRESERVED_INACTIVE), EventQueue (LEGACY), QueueRepository/mission_queue (DORMANT, table never existed), BullMQ/QueuePort/Temporal/NATS/Redis (DORMANT), mission_executions 144 rows (LEGACY forensic residue, writer UNKNOWN).
- Open edge for O7: failWithRetry's retry UPDATE WHERE excludes 'retry_pending' — a due retry failing again may not advance correctly; to be falsified, not assumed.
- Blocker: none. No genuine constitutional ambiguity; claim policy/executor split resolved with evidence (atomic decision = authority).

## O3 — Durability Proof
- Dependency: O2. State: CERTIFIED (2026-09-18).
- Scope note (ruling 2026-09-18): certification evidence covered scheduler death (D1), process restart (D3), worker death via always-failing worker (D2), and quiet-table restart. The ruling requires a fuller in-flight matrix: mission while pending, while claimed/in-flight, then worker death; scheduler AND runtime process death and restart; lease/reclaim; no silent loss; retry/dead-letter semantics; exactly the duplication behavior the runtime promises. Recorded as open contradiction O3-SCOPE-001; existing evidence stands, certification incomplete until the matrix runs.
- Authority: MISSION, CLAIM, LEASE.
- Falsification target: required recovery state exists only in memory.
- Evidence: D1 scheduler-death PASS, D3 process-restart PASS (state durability proven; all authoritative fields in PostgreSQL; in-memory state provably reconstructible). D2 worker-death FALSIFIED a real defect: failWithRetry's retry branch (status IN ('running','assigned')) never matched re-dispatched retries (status 'retry_pending'), so `retries` never incremented, exhaustion was unreachable, and failing missions hot-looped forever with zero dead-letter rows. Frozen evidence: mission stuck retry_pending/retries=1, 15 dispatches in 6s, 0 repository_dead_letters rows.
- Repair (minimal, non-destructive, reversible): new MissionRuntime.reclaimRetryPending() — conditional UPDATE retry_pending→created when retry_at elapsed — called each scheduler poll (Arrow 1b) before dispatch, restoring the lifecycle the failWithRetry docstring already described. Two files: ping-runtime/orchestration/mission_runtime.js, ping-runtime/orchestration/mission_scheduler.js. Docstring corrected (reclaimRetryPending now exists; reapExpiredLeases never handled retry_pending).
- Re-verification required: R1 exhaustion→failed+DLQ with no post-failure dispatches; R2 flaky-worker retry→completed; R3 happy path.
- Re-verification result (2026-09-18): REPAIR_VERIFIED for the livelock. R1: failed, retries=3, exactly 3 dispatches, 0 dispatches after failed, 3 MISSION_FAILED. R2: completed, retries=1. R3: completed, retries=0. Committed ec95c1a8d (fix(missions): reclaim due retries through the atomic claim lifecycle).
- Second defect found during re-verification (independent of the patch): DeadLetterAuthority.recordDeadLetter threw CANONICALIZATION_ERROR and never wrote the DLQ row — the deadLetter object carried undefined fields (execution_id, error_code) into the F7/D1 fail-closed witness boundary; the scheduler swallowed the error in its dlqErr catch. Repair round 1 (undefined→null normalization before createWitness) was FALSIFIED as insufficient: metadata was a Node Buffer (CanonicalBytes.serialize output), also outside the canonical identity domain, and the witness INSERT param was CanonicalBytes.serialize(witness) into a JSONB column (no implicit bytea→jsonb cast). Repair round 2 (full): undefined→null kept; metadata is now the plain object (options.metadata || {}); witness INSERT param is the witness object itself; unused CanonicalBytes import removed. All in gateway/dead_letter_authority.js. DLQ round-2 re-verification running.
- Repair round 2 was FALSIFIED: the throw moved one hop downstream. WitnessAuthority._generateWitnessId builds {authority, execution_id, input_hash, output_hash} where input_hash/output_hash are undefined for record witnesses (dead letters have no input/output pair) → fail-closed reject. Repair round 3: _generateWitnessId normalizes undefined→null in its own derived object (authority owns its ID derivation; no-op for fully-defined witnesses so existing witness IDs are unchanged). File: runtime/kernel/authorities/witness_authority.js. DLQ round-3 re-verification running (includes witness-ID regression check).
- DLQ round-3 result (2026-09-18): DLQ_REPAIR_VERIFIED. TEST A: exhaustion → exactly 1 dead-letter row, witness JSON well-formed, witness_hash matches, no DLQ errors. TEST B: direct probe with metadata works. TEST C: witness-ID regression — fully-defined witnesses hash identically to pre-patch derivation. Committed 4e7eb117b (fix(dead-letters): make recordDeadLetter survive the fail-closed witness boundary).
- Certification: the full exhaustion lifecycle now holds empirically — retry → reclaim → re-claim → increment → exhaust → failed → exactly one witnessed dead-letter row.
- Blocker: none.

## O4 — Atomic Claims
- Dependency: O3. State: CERTIFIED (2026-09-18).
- Authority: CLAIM.
- Falsification target: two workers can claim the same mission.
- Evidence required: concurrent-claim test showing exactly one winner, durable claim record.
- Note: O3 source inspection supports the F4 concern — MissionScheduler._dispatch ignores assign()'s row count and start()'s verdict and dispatches the worker anyway. O4 must test both the DB claim race and the lost-claim dispatch path.
- Falsification result (2026-09-18): O4_FALSIFIED. TEST 1 (DB claim race): HOLDS — 40 concurrent assigns → exactly 10 wins, 30 losses; conditional UPDATE is atomic. TEST 2 (lost-claim dispatch): FALSIFIED — B dispatched the worker after losing the claim (2 dispatches, ["A","B"]); reproduced in live concurrent _poll (2b). TEST 3 (start verdict): FALSIFIED — start() was owner-blind, the loser advanced the mission (start → 1 row) and emitted spurious MISSION_STARTED/MISSION_COMPLETED while assigned_to still read the real winner.
- Repair (minimal, coherent, reversible): _dispatch stands down unless assign() returns 1 AND owner-checked start(missionId, workerName) returns 1; start() now requires assigned_to to match the winner and returns its rowCount (previously returned undefined). Ad-hoc test scripts updated to the new start() contract (gateway/test_commissioning.js, test_kernel_pipeline.js, test_lease_renewal.js). Files: ping-runtime/orchestration/mission_runtime.js, ping-runtime/orchestration/mission_scheduler.js + 3 test scripts. O4 re-verification running.
- Re-verification result (2026-09-18): O4_REPAIR_VERIFIED, 13/13 checks. TEST 1: DB race still atomic (10 wins/30 losses). TEST 2: lost-claim dispatch fixed (B: 0 dispatches, 0 events). TEST 2b: concurrent _poll → exactly 1 dispatch. TEST 3: loser start() → 0 rows, assigned_to unchanged, no spurious events. TEST 4: normal flow unregressed. Committed 99b55390b (fix(claims): honor atomic claim verdicts; owner-check mission start).
- Certification: exactly one executor dispatches per mission per attempt; lost claims never dispatch; losers cannot advance missions.
- Blocker: none.
- Blocker: O2, O3 (both CERTIFIED).

## O5 — Lease Recovery
- Dependency: O4. State: CERTIFIED (2026-09-18).
- Authority: LEASE.
- Falsification target: a dead worker's lease never expires and its work never recovers.
- Evidence required: lease expiry + recovery path proven with a killed worker.
- Falsification result (2026-09-18): O5_FALSIFIED. TEST 1: hung worker + live scheduler → lease_until renewed 54 times over 20s (monotonic), mission stuck 'running' forever; no dispatch timeout anywhere in the chain (bare await in _dispatch and WorkerRuntime.dispatch). TEST 2 (control): true orphans recover via Arrow 1. TEST 3 (control): slow workers complete normally. Secondary code-observed (not live-tested): hung worker holds its WorkerRuntime concurrency slot → later same-type dispatches return null → spurious _failMission cascade toward DLQ. Flagged for O17 (Worker Capacity), not O5.
- Repair (minimal, reversible): hung-worker watchdog — _dispatch races the worker dispatch against a timer (_dispatchWithTimeout; dispatchTimeoutMs option, default 300000ms = 5x the 60s lease horizon; timer unref'd so it never delays shutdown). On timeout the mission fails with retry through the normal _failMission path; the finally releases _processing so the lease stops renewing; late settlements are harmless (conditional transitions match 0 rows). Commit ff9751221530eebb155d42e4972f8baa2d9a5644, one file: ping-runtime/orchestration/mission_scheduler.js.
- Re-verification (adversarial, 2026-09-18): O5_REPAIR_VERIFIED. TEST 1 (timeout 2000ms, max_attempts=2): mission went running → retry_pending (retries=1) at ~2s → created → failed (retries=2) with lease FROZEN at 21:44:51.897 across 19 tail samples; exactly 1 dead-letter row. TEST 2: slow worker (1s < 2s timeout) completed, retries=0, no spurious timeout. TEST 3: late settlement (3s > 2s timeout) → MISSION_COMPLETED count 0, no double-completion, both late settlements harmless. Scratch DB/role/tmp removed, verified.
- Follow-up defect (O17 territory, live-traced during re-verification): WorkerRuntime.dispatch increments entry.running before awaiting handle() and decrements only on settle — a never-settling handle leaks the slot permanently, so the retry hit the slot-full guard (dispatch → null → "No worker matched" → fast fail to exhaustion). The mission terminated correctly and the lease froze, so O5 holds; but the retry never re-executed the work and the worker entry is wedged for all future missions until process restart. Only a WorkerRuntime-side timeout/cancellation can release that slot; the scheduler-side watchdog cannot.
- Verdict: O5 CERTIFIED.
- Blocker: O4.

## O6 — At-Least-Once / Idempotency
- Dependency: O5. State: RUNNING (falsification complete 2026-09-18; certification pending machine-checkable gates per ruling 7).
- Authority: EVENT, EXECUTION.
- Falsification target: redelivery produces duplicate canonical results.
- Evidence required: duplicate-delivery test with exactly-once canonical effect proof (idempotency keys, dedup).
- Falsification result (2026-09-18): O6_HELD. All four vectors absorbed on scratch: double-complete no-ops (conditional UPDATE, MISSION_COMPLETED gated on rowCount); emit dedups via ON CONFLICT DO NOTHING (deterministic IDs); reaper redelivery collapses to one winner; double exhaustion yields exactly one DLQ row (deterministic dl_ ID + PK violation, error swallowed). Follow-ups (not fixed): failWithRetry returns unconditionally so DLQ dedup is accidental not designed; handlers re-fire on deduplicated emits.
- Blocker: O5.

## O7 — Retry Authority
- Dependency: O6. State: READY.
- Authority: RETRY.
- Falsification target: retries happen without ownership (retry storms, competing retriers).
- Evidence required: single retry owner, bounded retry policy, retry state durable.
- Blocker: O6.

## O8 — Backpressure
- Dependency: O7. State: READY.
- Authority: ROUTING.
- Falsification target: unbounded queue growth degrades or kills the runtime.
- Evidence required: backpressure signal and shedding/limiting behavior under load.
- Blocker: O7.

## O10 — Namespace Isolation
- Dependency: O8. State: READY.
- Authority: MISSION, EVENT (tenant boundary).
- Falsification target: work or events leak across namespaces/tenants.
- Evidence required: cross-namespace attempt blocked and logged; relates to open F2/F3.
- Blocker: O8.

## O11 — Observability
- Dependency: O10. State: READY.
- Authority: (presentation of) CLAIM, LEASE, ROUTING, EXECUTION.
- Falsification target: operator cannot see true queue/claim/lease/worker state.
- Evidence required: operator-visible state matches ground truth under failure injection.
- Blocker: O10.

## O13 — Traceability
- Dependency: O11. State: READY.
- Authority: EVENT.
- Falsification target: a mission's events and results cannot be traced end to end.
- Evidence required: mission -> canonical events -> execution results chain queryable.
- Blocker: O11.

## O14 — 10K Backlog
- Dependency: O13. State: READY.
- Authority: ROUTING, EXECUTION.
- Falsification target: the system cannot drain a 10,000-mission backlog correctly.
- Evidence required: 10k backlog enqueued, drained with zero loss and zero duplicate canonical results.
- Blocker: O13.

## O15 — Failure Injection
- Dependency: O14. State: READY.
- Authority: all nine.
- Falsification target: chaos (killed workers, scheduler restarts, DB blips) causes loss/duplication/authority conflict.
- Evidence required: injected-failure matrix with recovery proof per case.
- Blocker: O14.

## O9 — Fairness
- Dependency: O15. State: READY.
- Authority: ROUTING.
- Falsification target: one tenant/worker class starves others.
- Evidence required: fairness policy proven under contention.
- Blocker: O15.

## O12 — Stuck Detection
- Dependency: O9. State: READY.
- Authority: LEASE, CLAIM.
- Falsification target: stuck claims are never detected or recovered.
- Evidence required: stuck-claim detector fires and recovers within bound.
- Blocker: O9.

## O16 — Executor Contract
- Dependency: O12. State: READY.
- Authority: EXECUTION.
- Falsification target: executors diverge from the WorkOrder/evidence contract.
- Evidence required: contract conformance proof per executor runtime.
- Blocker: O12.

## O17 — Worker Capacity
- Dependency: O16. State: READY.
- Authority: ROUTING.
- Falsification target: routing ignores worker capacity signals.
- Evidence required: capacity-aware routing proven under heterogeneous workers.
- Blocker: O16.

## O18 — Oracle
- Dependency: O17. State: READY.
- Authority: all nine (constitutional runtime evidence for Oracle consumption).
- Falsification target: Oracle cannot consume the runtime evidence as authoritative.
- Evidence required: Oracle-side read of constitutional runtime evidence; no cross-writes between worktrees.
- Blocker: O17. Boundary: never modify C:\Users\nolan\PING from this program.
- Ruling 2026-09-18 (contract first): before producing O18, define the consumer contract — a versioned machine-readable Oracle Runtime Evidence Manifest with: runtime/commit, authorities, required services/schema/env names, persistence classifications, health/proof commands, certification evidence IDs, unresolved contradictions, deployment blockers. The human-readable report is generated from the manifest; the Oracle agent consumes the schema, not the prose.

## O19 — Operator View
- Dependency: O18. State: READY.
- Authority: presentation (Mission Control / Control Panel).
- Falsification target: the operator view shows claims beyond backend proof (open Claim/Presentation Authority findings).
- Evidence required: every displayed status traces to proven backend state.
- Blocker: O18.

## O20 — Soak
- Dependency: O19. State: READY.
- Authority: all nine.
- Falsification target: long-run operation drifts (loss, duplication, leakage, memory-only state).
- Evidence required: sustained soak with invariant checks green throughout.
- Blocker: O19.

## Side items (record only, not in ordering)
- PostgreSQL port: read-only verification pending — determine whether production sets POSTGRES_PORT=5433 or equivalent; distinguish Docker host-published port (5433->5432 observed on ping-postgres) from in-container port before declaring any defect. Do not patch.
- F7-C depth boundary RESOLVED 2026-09-18 (ruling item 2): caller_depth = nesting depth of caller value (scalar 0, outermost container 1, +1 per level); envelope_depth = caller_depth + 1 (measured overhead: emit() mints ID before envelope build, payload wrapped in exactly one level). Guard: depth > 64 throws. Empirical: direct canonicalize 64 accepted / 65 rejected; via emit() caller 63 accepted (envelope_depth 64, IDs minted) / caller 64 rejected (envelope_depth 65). CORRECTION to ruling text: "envelope depth 64 rejected" is wrong; envelope_depth 64 is accepted, 65 rejected (recorded as DEPTH-001a). Test vector: evidence/f7c-depth-boundary-2026-09-18/f7c-depth-boundary-vector.js, 20/20 green. Validator untouched. Commit of corrected semantics pending the five-file allowlist.

## Discovery 2026-09-20 — Lane A (structural forensics; parallel to certification)
Source: convergence/discovery/2026-09-20-laneA.md. Method: Oracle PG column inventory (29 tables, ~430 cols) + per-column write/read-site scan + transitive require-closure from gateway_runtime.js (169 files) + gate-name audit. Zero patches committed (no safe patch presented itself). No STOP findings: nothing on the boot path of a9cad2663.
CAVEAT: the schema-drift observations below were inventoried via docker exec into a postgres container; the lane's Oracle-vs-Pig plane attribution is uncertain, so each item's schema claim needs Oracle-plane re-verification by the owning lane before any destructive action.

### LANE-A-20260920-01 / NEXT / ping_events.processed is write-never/read-live; GET /mc/inbox can never drain
- EVIDENCE: unified_event_runtime.js:271 INSERT omits `processed` (DEFAULT FALSE); zero `UPDATE ping_events` in live code; unified_event_runtime.js:443-444 adds `AND processed = FALSE` for `unprocessed:true`; live caller gateway/routes/mission_control.js:344 (/mc/inbox "Unprocessed events").
- CURRENT IMPACT: inbox grows monotonically, never drainable; any future consumer trusting the flag re-processes forever.
- AFFECTED LIVE PATH: /mc/inbox + query({unprocessed:true}) callers.
- COUNTEREVIDENCE: the event_processing LEFT-JOIN mechanism (routes/events.js) is live but reads repository_events, a different identity space; canonical_events.processed HAS a writer; ping_events was never given one.
- SMALLEST NEXT ACTION: decide drain semantic, add markProcessed to UnifiedEventRuntime + exactly one caller (no writer-without-caller).
- FALSIFICATION: grep `UPDATE ping_events` (expect zero live hits); two-poll inbox drain test on scratch PG.
- DONE WHEN: live writer + proven drain. OWNER-LANE: runtime lane. BLOCKED BY: drain-semantic decision. PROOF PLANE: Pig scratch PG.

### LANE-A-20260920-02 / SOON / snapshot_repository.js schema drift (snapshot_data vs data) + zero callers
- EVIDENCE: migration 007 (migration_engine.js:335) defines `data`; the file's CREATE TABLE/INSERT/_rowToSnapshot use `snapshot_data`; zero `new SnapshotRepository`/require hits anywhere.
- CURRENT IMPACT: none live; latent undefined_column throw on first wiring.
- AFFECTED LIVE PATH: none.
- COUNTEREVIDENCE: sprint dormant classification corroborates dormancy but missed the drift.
- SMALLEST NEXT ACTION: classify PRESERVED_INACTIVE; align to `data` only if a consumer is specified, with a round-trip test first.
- FALSIFICATION: saveSnapshot vs migration-007 schema on scratch PG (expect throw).
- DONE WHEN: classification header or aligned+tested. OWNER-LANE: classification lane. BLOCKED BY: nothing. PROOF PLANE: Pig.

### LANE-A-20260920-03 / NEXT / mission_event_bus.js unwired; mission_events table write-dead
- EVIDENCE: zero importers anywhere; sole writer AND sole reader of `mission_events`; routes/missions.js + mission_control.js have zero references (UI reads ping_missions); migration 008 still creates the table at boot.
- CURRENT IMPACT: implemented bus never runs; table accumulates zero rows; two mission surfaces confuse operators.
- AFFECTED LIVE PATH: none directly.
- COUNTEREVIDENCE: existing dormant classification (needs_review, 0 dependents) corroborates; the table-level write-dead is new evidence.
- SMALLEST NEXT ACTION: wire into the spine with a proven consumer, or classify PRESERVED_INACTIVE and stop creating the table.
- FALSIFICATION: require-closure absence; pg_stat n_tup_ins=0.
- DONE WHEN: wired+verified or classified. OWNER-LANE: mission lane. BLOCKED BY: wire-or-classify decision. PROOF PLANE: Pig.

### LANE-A-20260920-04 / SOON / EventBridge has zero live instantiators; ping_bridge_cursors write-dead
- EVIDENCE: no require/`new EventBridge` anywhere (only a 2026-07-30 plan doc); the live spine wires LegacyIngressAdapter (separate file) instead; EventBridge is the sole writer of `ping_bridge_cursors`.
- CURRENT IMPACT: none live; backfill bridge never runs.
- AFFECTED LIVE PATH: none.
- COUNTEREVIDENCE: plan doc's "WIRED" claim resolved as stale (July architecture, predates current spine); no dormant-classification entry exists (classifier coverage gap).
- SMALLEST NEXT ACTION: classify PRESERVED_INACTIVE; annotate the stale claim.
- FALSIFICATION: closure absence; pg_stat zero inserts.
- DONE WHEN: classified. OWNER-LANE: classification lane. BLOCKED BY: nothing. PROOF PLANE: Pig.

### LANE-A-20260920-05 / NEXT / gateway-smoke.js SMOKE PASS certifies no database behavior
- EVIDENCE: no `initialize({mode})` exists on GatewayRuntime (verified), so the smoke always takes the fallback: construct + _initializeServices + _mountRoutes, no listen(), no request, no migration; without PG it degrades gracefully and still passes. release-certify.js runs it as pre-promotion gate 5; RELEASE-SEQUENCE.md:26 documents "entrypoint never executed" yet it counts as "executable smoke".
- CURRENT IMPACT: wrong PG credentials, failing boot migrations, throwing route handlers, or a new append-only-trigger-class failure all pass the gate.
- AFFECTED LIVE PATH: release certification / Oracle deploy decision.
- COUNTEREVIDENCE: header documents the boundary; adjacent gates cover other aspects; the hole is specifically "no gate boots against a real DB and serves a request".
- SMALLEST NEXT ACTION: add opt-in --with-db mode (scratch-PG fixture: run migrations, emit+query one event, GET /health on ephemeral port, teardown); record which mode ran in the artifact.
- FALSIFICATION: current smoke with bogus POSTGRES_PASSWORD -> expect PASS (proves hole).
- DONE WHEN: DB-mode exists, fails on bad creds, passes on fixture. OWNER-LANE: certification lane. BLOCKED BY: nothing. PROOF PLANE: Pig.

### LANE-A-20260920-06 / SOON / Oracle tables agent_workspaces + capability_requests: zero references anywhere in tree
- EVIDENCE: repo-wide grep (all file types incl. archive/evals/tests/docs) for both names: zero hits; not created by migration_engine.
- CURRENT IMPACT: dead schema on live DB; false affordance of live surfaces.
- AFFECTED LIVE PATH: none.
- COUNTEREVIDENCE: may predate convergence; external consumers (Python worker-runtime) must be checked before any DROP.
- SMALLEST NEXT ACTION: verify no external consumer, then route DROP to the Grill (destructive on live DB).
- FALSIFICATION: the zero-hit grep; pg_stat zero activity.
- DONE WHEN: dropped by operator decision or documented dead. OWNER-LANE: classification lane -> operator. BLOCKED BY: external-consumer check. PROOF PLANE: Pig + pg_stat.

### LANE-A-20260920-07 / LATER / ping-runtime/agents/replay_worker.js: dead 27-line stub, process() throws
- EVIDENCE: process() calls this._transactionBoundary.execute with _transactionBoundary never assigned -> TypeError; only importers are evals; the LIVE ReplayWorker is the class in canonical_workers.js:217, registered with the kernel provider in the spine.
- CURRENT IMPACT: none live; confusion risk from duplicate implementations.
- AFFECTED LIVE PATH: none.
- COUNTEREVIDENCE: EVAL-009 imports it (eval-only).
- SMALLEST NEXT ACTION: PRESERVED_INACTIVE header pointing at the canonical implementation.
- FALSIFICATION: instantiate+process() -> TypeError.
- DONE WHEN: classified. OWNER-LANE: classification lane. BLOCKED BY: nothing. PROOF PLANE: Pig.

### Dismissed with evidence (no backlog entry)
event_processing "write-never" (false alarm, live LEFT JOIN reader); ping_bridge_cursors source/updated_at (WHERE-clause reads); deployment_registry + runtime_registry columns (dynamic UPDATE allowlists); exterior_agent_credentials (all live); created_at/updated_at (DB defaults); test_adapter_boot_smoke, certify-sequence-migration, validate-artifact (honestly scoped names).

## Discovery 2026-09-20 — Lane B (dead product loops; parallel to certification)
Source: convergence/discovery/2026-09-20-laneB.md. Core finding: the worker's actual product (`dispatchResult`) is discarded at `mission_scheduler.js:371`; `ping_missions.result` holds only bookkeeping metadata. 144 completed missions' products are unrecoverable from the durable record. Zero non-test consumers of MISSION_COMPLETED. KnowledgePromoter was registered but reachable by nothing (triple break: zero emitters, no bridge entries, no worker-map routing).

### LANEB-001 / DONE (discovery branch ed0de7edd; needs gate review) / Wire KNOWLEDGE_PROMOTE mission type to the knowledge-promotion worker
- EVIDENCE: MISSION_WORKER_MAP["KNOWLEDGE_PROMOTE"] was undefined (fail-before). IMPACT: zero approvals could ever flow. PATH: mission_scheduler.js, canonical_workers.js, knowledge_promoter.js.
- COUNTEREVIDENCE: consume side already 10/10; registration live. NEXT: gate review of ed0de7edd, then one real operator approval on live.
- FALSIFICATION: tests/discovery/test_knowledge_promote_wiring.js RED->GREEN. DONE WHEN: a live KNOWLEDGE_PROMOTE mission flips a candidate node to approved/confidence 1.0.
- OWNER: certification gate (review) -> convergence lane (merge). BLOCKED BY: Oracle deploy lane (live proof). PROOF: worktree harness done; live pending.

### LANEB-002 / NEXT / Persist the worker's actual output in ping_missions.result
- EVIDENCE: mission_scheduler.js:371-379 drops dispatchResult; result column holds metadata only. IMPACT: 144 completed missions' products unrecoverable from the durable record.
- COUNTEREVIDENCE: additive-safe vs CE-001/CE-002 and the reconciler. NEXT: spread a size-capped worker-output projection into complete() payload + content test.
- FALSIFICATION: test asserting result JSONB contains worker product fields. DONE WHEN: completed row contains product summary; scheduler tests green. OWNER: convergence lane (certified-path file). PROOF: worktree harness.

### LANEB-003 / NEXT / No operator read surface for completed mission results
- EVIDENCE: routes/missions.js, mission_control.js have active/pending/stats/trace only. NEXT: authenticated GET /missions/completed. BLOCKED BY: LANEB-002 for results worth reading.

### LANEB-004 / SOON / Dedicated POST /knowledge/approve endpoint
- Anti-aspiration: bridge entries for approval events only when a live emitter appears (not added speculatively).

### LANEB-005 / NOW / Pig->Oracle SSH hop hung (transient suspected)
- Two bounded attempts + one probe by Lane B, never hammered. Pig hop healthy. Oracle-side state unknown. Retry on cadence; blocks live evidence until resolved.

### LANEB-006 / LATER / Nothing consumes approved knowledge
- HybridSearch returns approved+candidate mixed; only live caller is POST /knowledge/search. DEFER until real approvals exist.

### LANEB-007 / LATER / Promoter _stats in-memory only, no endpoint
- Approval monitoring invisible. Restart loses stats.
