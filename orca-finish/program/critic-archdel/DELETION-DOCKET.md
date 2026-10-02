# DELETION DOCKET - ORCA FINISH, CRITIC-ARCHDELETION

Repo: `/home/nolan/ping` @ `cc6856c3bc78e0535e66f168c66dc31abee2c073`, branch `refactor/runtime-authority-convergence`.
Method: read-only. Static require-closure from `gateway/server.js` + `gateway/bootstrap/gateway_runtime.js` (189 files reachable), repo-wide `git grep` for require/import references (single AND double quotes), test-file search, schema-vs-DDL comparison. Evidence grade STATIC throughout unless noted.
Rule: a candidate with ANY live caller is REJECTED with the caller named. Nothing here is deleted; this is the docket only.
Prior-lane corrections are marked [CORRECTION].

Conventions per entry: CLAIM / EVIDENCE / CALLERS / TESTS / LIVE-PATH / MIGRATION (who breaks) / ARCHIVAL (preserve before deletion) / SURVIVOR (Rule-of-One owner) / CLASSIFICATION / CONFIDENCE.

---

## SECTION 1: DOCKET - PROVEN DEAD (24 entries)

### D-1: `gateway/approval_authority.js` (378 lines)
- CLAIM: Dormant approval authority, zero callers.
- EVIDENCE (STATIC): zero `require()` matches repo-wide in code; not in the 189-file live closure; no package.json/shell/yaml invocation.
- CALLERS: none. TESTS: none reference it. LIVE-PATH: none.
- MIGRATION: owns DDL for `approvals`, `approval_policies` tables; zero table users outside this file (verified), so no reader/writer breaks. Deletion just stops the tables being created.
- ARCHIVAL: preserve C4's approval-binding analysis - approvals bind to `patch_id` only, no principal/digest/args/scope/expiry; `_determineApprovalPolicy` hardcodes `automatic`; three of four approval conditions can never fail (`|| true`, `witness_verified: true`). This is the anti-pattern catalog for the replacement.
- SURVIVOR: none on this branch. Approval as a concept has no live owner here. (Replacement direction: wave2/impl-safety/staging/orca_approval.js, built for the orca-autonomy branch, not this one.)
- CLASSIFICATION: DELETE. CONFIDENCE: high.

### D-2: `gateway/commit_authority.js` (307 lines)
- CLAIM: Dormant commit authority, zero runtime callers.
- EVIDENCE (STATIC): zero `require()` matches; not in live closure. Only string labels in `generate_*.js` (cosmetic, not code).
- CALLERS: none. TESTS: none. LIVE-PATH: none.
- MIGRATION: none. The string labels in generate_*.js are unaffected by file deletion.
- ARCHIVAL: preserve the flaw - `commitPatch` contains NO approval check; wiring it as-is would authorize-by-construction. Also note it carries its own `mission_executions` DDL/INSERT with the rich shape (competing writer, also dead).
- SURVIVOR: none. Real commits happen outside repo control entirely.
- CLASSIFICATION: DELETE. CONFIDENCE: high.

### D-3: `gateway/patch_authority.js` (626 lines) + `gateway/patch_authority_v2.js` (781 lines)
- CLAIM: Two parallel implementations of the same named authority, both dead.
- EVIDENCE (STATIC): zero `require()` matches for either; neither in live closure.
- CALLERS: none. TESTS: none. LIVE-PATH: none.
- MIGRATION: none.
- ARCHIVAL: preserve that v1/v2 overlap was never verified - record which is newer (v2) and the claimed delta before deletion, in case a future patch authority wants the v2 design.
- SURVIVOR: none.
- CLASSIFICATION: DELETE (both; duplicate pair collapses to zero). CONFIDENCE: high.

### D-4: `gateway/mission_execution_authority.js` (457 lines)
- CLAIM: Dormant mission-execution authority, never instantiated.
- EVIDENCE (STATIC): zero `require()` matches; not in live closure. Its documented Phase-15 pipeline (Approval + Commit stages) has no instantiation site.
- CALLERS: none. TESTS: none. LIVE-PATH: none.
- MIGRATION: none. (Its internal `mission_executions` rich-shape DDL/INSERT and SELECTs are self-contained; readers in control_center_subscription.js / materialized_views.js are themselves dead, verified by closure.)
- ARCHIVAL: preserve the Phase-15 pipeline doc as design reference for a future execution authority.
- SURVIVOR: `MissionRuntime` (`ping-runtime/orchestration/mission_runtime.js`) - the live mission lifecycle owner.
- CLASSIFICATION: DELETE. CONFIDENCE: high.

### D-5: `gateway/authority_container.js`
- CLAIM: DI container with no registrations and no callers.
- EVIDENCE (STATIC): zero `require()` matches; not in live closure.
- CALLERS: none. TESTS: none. LIVE-PATH: none.
- MIGRATION: none.
- ARCHIVAL: none significant.
- SURVIVOR: n/a (DI pattern unused on the live path).
- CLASSIFICATION: DELETE. CONFIDENCE: high.

### D-6: `gateway/constitutional_authority_registry.js` (442 lines) + `gateway/constitutional_bootstrap.js`
- CLAIM: Dormant registry whose only requirer is itself dead.
- EVIDENCE (STATIC): registry required only by `constitutional_bootstrap.js:202,283`; bootstrap has ZERO requirers repo-wide and is not in the live closure. No CLI/script invocation (only hits are in the generated `RepositoryKnowledgeIndex/dependency_graph.json`).
- CALLERS: registry <- bootstrap (dead); bootstrap <- none. TESTS: none. LIVE-PATH: none.
- MIGRATION: `gateway/verify/08_authorities.js` and `gateway/verify/10_pipeline.js` reference these modules. They are dev-time verify scripts, not the live path; they need updating or retirement alongside.
- ARCHIVAL: preserve the registry descriptor schema if a future authority registry is ever built.
- SURVIVOR: none. Registry concept has no live owner.
- CLASSIFICATION: DELETE (both files as a dead pair). CONFIDENCE: high.

### D-7: `gateway/filesystem_authority.js`
- CLAIM: Dormant, misnamed; a repo file-scan cache, not an fs-access gate.
- EVIDENCE (STATIC): zero non-test `require()` matches; not in live closure.
- CALLERS: only test/corpus files. TESTS: corpus references exist - retire or update alongside. LIVE-PATH: none.
- MIGRATION: test/corpus files that require it.
- ARCHIVAL: preserve the unfulfilled intent - `worker_registry.js:26` comment admits "Direct fs.read/write -- should route through FilesystemAuthority" (aspirational). All fs access in the repo is UNGATED; there is no fs-access authority to bypass. Deleting the file does not change the security posture.
- SURVIVOR: none (no fs-access gate exists).
- CLASSIFICATION: DELETE. CONFIDENCE: high.

### D-8: `ping-runtime/approval/effect_authority.js` + `ping-runtime/approval/business_action_authority.js`
- CLAIM: Dormant approval/effect scheme, zero callers outside its own dir.
- EVIDENCE (STATIC): zero `require()` matches outside `ping-runtime/approval/`; neither in live closure.
- CALLERS: none outside dir. TESTS: `ping-runtime/approval/approval_effect.test.js`, `approval_restart_durability.test.js` - tests of dead code; retire with the modules. LIVE-PATH: none.
- MIGRATION: the two test files.
- ARCHIVAL: preserve C4's binding analysis as the anti-pattern catalog - `action_id` hashes only (mission_id, capability, target_identity) so a changed proposal yields the SAME id (changed proposal invisible, never stale); `approveAction` checks only status/expiry, no digest; `EffectAuthority.createEffect` marks `AUTHORIZED` unconditionally without verifying the approval exists; effect id has no arguments in the idempotency key (collision across different proposed actions).
- SURVIVOR: none on this branch.
- CLASSIFICATION: DELETE (both + their two test files). CONFIDENCE: high.

### D-9: `ping-runtime/orchestration/proposal_pipeline.js`
- CLAIM: Dormant file-based proposal stage tracker, zero callers.
- EVIDENCE (STATIC): zero `require()` matches; not in live closure. Has NO approval stage; unrelated to the finish-criteria proposal concept.
- CALLERS: none. TESTS: none. LIVE-PATH: none.
- MIGRATION: none.
- ARCHIVAL: none significant.
- SURVIVOR: none.
- CLASSIFICATION: DELETE. CONFIDENCE: high.

### D-10: `gateway/continuous_reflection_loop.js` (321 lines) [C5 P-3]
- CLAIM: Fabricated autonomous loop ("the runtime literally learns from itself"), never instantiated.
- EVIDENCE (STATIC): zero instantiations, zero `require()` matches (only self-reference); not in live closure. Independently verified.
- CALLERS: none. TESTS: none. LIVE-PATH: none.
- MIGRATION: none.
- ARCHIVAL: preserve as a specimen of docstring-claims-behavior-without-call-path for future doc-claim audits.
- SURVIVOR: none.
- CLASSIFICATION: DELETE. CONFIDENCE: high.

### D-11: `ping-runtime/agents/worker_port.js` [C5 P-2]
- CLAIM: Second `WorkerPort` ("Constitutional Port", claims "Single worker authority for all worker operations"), zero requirers, references a nonexistent provider.
- EVIDENCE (STATIC): zero `require()`/import matches repo-wide; not in live closure. Header references `CustomWorkerProvider (current)` - no such class exists in the repo. Independently verified.
- CALLERS: none. TESTS: none. LIVE-PATH: none.
- MIGRATION: none.
- ARCHIVAL: note the competing single-authority header claim vs the real `orchestration/execution/worker_port.js`.
- SURVIVOR: `ping-runtime/orchestration/execution/worker_port.js` (`WorkerPortRegistry`, live via engine).
- CLASSIFICATION: DELETE. CONFIDENCE: high.

### D-12: `ping-runtime/orchestration/index.js`
- CLAIM: Dead demo entry; the engine is required directly by the gateway.
- EVIDENCE (STATIC): zero requirers; not in live closure. `gateway_runtime.js:67` requires `execution/engine.js` directly.
- CALLERS: none. TESTS: none. LIVE-PATH: none.
- MIGRATION: none.
- ARCHIVAL: none.
- SURVIVOR: n/a.
- CLASSIFICATION: DELETE. CONFIDENCE: high.

### D-13: `runtime/kernel/capabilities/capability-authority.ts` (+ interface)
- CLAIM: Declared-dormant kernel capability authority, zero consumers, and its interface could not gate execution anyway.
- EVIDENCE (STATIC): zero TS importers repo-wide; not reachable from the JS live path. Interface has register/resolve/list and NO authorize/can-execute method.
- CALLERS: none. TESTS: none. LIVE-PATH: none.
- MIGRATION: none (type-level).
- ARCHIVAL: preserve the interface-design lesson - declared sovereignty was false by construction (no authorize method); even wired, it could not gate execution.
- SURVIVOR: none. Capability has no live gate; `CapabilityResolver` is a live index only (see R-7).
- CLASSIFICATION: DELETE. CONFIDENCE: high.

### D-14: `MCPReference` branded string type (`runtime/kernel/capabilities/capability.ts:78`, `runtime/kernel/identity/typed-references.ts:49`)
- CLAIM: Branded type with no consumer.
- EVIDENCE (STATIC): zero references beyond the two definitions across all `.ts`; nothing in the JS live path consumes it. `requiredMCP` on capability declarations is write-only metadata.
- CALLERS: none. TESTS: none. LIVE-PATH: none.
- MIGRATION: none (type-only).
- ARCHIVAL: note that `requiredMCP` capability-declaration fields are unvalidated metadata.
- SURVIVOR: n/a. Minor cleanup, low value, near-zero risk.
- CLASSIFICATION: DELETE (type-level cleanup). CONFIDENCE: high.

### D-15: `WorkerPort.execute()` method + null-executor constructor defaults [C5 P-1] (scoped deletion inside a KEEP file)
- CLAIM: `WorkerPort.execute()` is unreachable; the executor is always null.
- EVIDENCE (STATIC): zero `.execute(` callers in `orchestration/execution/*.js` outside `worker_port.js` itself; single production construction passes `executor: null` explicitly (`engine.js:93-96`, verified line 95); `ExecutionEngine.dispatchToAssignment()` never calls `.execute()` (builds prompt, stores prompt artifact, returns prompt to completion handler). Calling it would return `{ error: 'no_executor', confidence: 0, findings: [] }`. Independently verified.
- CALLERS: none. TESTS: none observed. LIVE-PATH: none.
- MIGRATION: none. Scoped to the method + executor constructor wiring; KEEP the registry/health/state-machine methods (`findAvailable`, `listAll`, `getStats`, `transition`, `canTransition`) that engine.js actually uses, and the file itself (engine is KEEP per Nolan's no-delete-ORCA order and the in-repo DOC-CONTRACT).
- ARCHIVAL: preserve the knowledge that the ORCA engine never executes through worker ports (prompt-only dispatch) for the Orca-vs-live-spine convergence decision.
- SURVIVOR: `ExecutionEngine` (KEEP) minus the execute facade.
- CLASSIFICATION: DELETE (method + executor wiring only, not the file). CONFIDENCE: high.

### D-16: `OllamaWorkerPort` / `DevinWorkerPort` subclasses [C5 P-6] (scoped deletion inside worker_port.js)
- CLAIM: Dead worker-port subclasses, zero instantiations.
- EVIDENCE (STATIC): zero `new OllamaWorkerPort` / `new DevinWorkerPort` repo-wide; only `new OpenCodeWorkerPort` exists (`engine.js:93`). Independently verified.
- CALLERS: none. TESTS: none. LIVE-PATH: none.
- MIGRATION: none.
- ARCHIVAL: note the intended alternative backends (Ollama, Devin) for the convergence decision.
- SURVIVOR: `OpenCodeWorkerPort` + `WorkerPortRegistry`.
- CLASSIFICATION: DELETE (the two subclasses only). CONFIDENCE: high.

### D-17: `gateway/repositories/execution_repository.js` [C3 D13]
- CLAIM: Unreferenced AND schema-incompatible; its INSERT would fail against the migrated table.
- EVIDENCE (STATIC): zero requirers repo-wide (the one `execution_repository` string hit is inside `gateway/execution_repository_port.js:83`, itself dead, and is a provider-name template string, not a require); not in live closure. Schema: INSERT lists `context_hash, prompt_hash, patch_hash, replay_hash, approval_status, commit_hash, witness_hash, checkpoint_id, started_at` - NONE of these columns exist in migration 009's `mission_executions` DDL (`execution_id, mission_id, execution_status, execution_data, created_at, updated_at`). INSERT would fail on missing columns. Independently verified both halves.
- CALLERS: none. TESTS: none. LIVE-PATH: none. (Live readers of `mission_executions`: none - `control_center_subscription.js:195` and `materialized_views.js:55,100` SELECT it but both are dead per closure. Zero live writers, zero live readers; the thin table is dormant schema.)
- MIGRATION: none.
- ARCHIVAL: preserve the rich execution-receipt shape (per-stage hashes: context/prompt/patch/replay/approval/commit/witness/checkpoint) as the intended receipt schema for a future execution-receipt design. Note the three-way shape conflict: thin migration DDL vs this rich INSERT vs D-2's rich DDL/INSERT in mission_execution_authority.js.
- SURVIVOR: `MissionRuntime` for mission lifecycle; no live execution-receipt writer exists.
- CLASSIFICATION: DELETE. CONFIDENCE: high.

### D-18: `gateway/repositories/checkpoint_repository.js` [C3 D12]
- CLAIM: Unreferenced AND schema-incompatible; its INSERT would fail against the checkpoints table.
- EVIDENCE (STATIC): zero references repo-wide (strongest signal in the sweep); not in live closure. Schema: INSERT lists `(checkpoint_id, mission_id, execution_id, checkpoint_data, checkpoint_hash, created_at)`; the `checkpoints` DDL (`checkpoint_authority.js:46-53`, the only DDL in the repo) defines `(checkpoint_id, session_id, checkpoint_type, checkpoint_data, checkpoint_hash, created_at)`. `mission_id` and `execution_id` do not exist - INSERT would fail. Independently verified.
- CALLERS: none. TESTS: none. LIVE-PATH: none.
- MIGRATION: none.
- ARCHIVAL: preserve the shape disagreement (mission-scoped vs session-scoped checkpoints) as an unresolved design decision for whoever revives checkpointing.
- SURVIVOR: none live (see D-19).
- CLASSIFICATION: DELETE. CONFIDENCE: high.

### D-19: `gateway/checkpoint_authority.js` [CORRECTION to C3 D7]
- CLAIM: The "live" session-checkpoint writer is itself dead. The `checkpoints` table has NO live writer at all.
- EVIDENCE (STATIC): zero references to `checkpoint_authority` repo-wide (R2 grep empty); not in the 189-file live closure. The only two `INSERT INTO checkpoints` statements in the repo are this file (`:92`, session shape) and D-18 (mission shape) - both dead. C3's "LIVE (session scope)" classification is falsified by the closure + zero-reference grep. No live route, worker, or scheduler touches this module.
- CALLERS: none. TESTS: none. LIVE-PATH: none.
- MIGRATION: none. (It owns the only `checkpoints` DDL; nothing live depends on the table existing.)
- ARCHIVAL: preserve the session-checkpoint design (hash-witnessed, `restoreCheckpoint`/`getLatestCheckpoint` by session) and its DDL ownership.
- SURVIVOR: none - checkpointing currently has no live owner. If revived, exactly ONE writer must be chosen (Rule of One); the session shape and mission shape must not coexist again.
- CLASSIFICATION: DELETE. CONFIDENCE: high (with the C3 discrepancy explicitly noted above).

### D-20: `gateway/advisory_lock.js` [C3 D14]
- CLAIM: Advisory-lock class, zero callers; "every mutable aggregate must have one writer" is unenforced.
- EVIDENCE (STATIC): zero references to `advisory_lock`/`AdvisoryLock` outside its own file; not in live closure. Independently verified.
- CALLERS: none. TESTS: none observed. LIVE-PATH: none.
- MIGRATION: none.
- ARCHIVAL: preserve the design intent; pointer `ADVISORY_LOCKING_IMPLEMENTATION.md` (doc-only). The live concurrency control is the lease mechanism in MissionRuntime.
- SURVIVOR: none (lease/claim in `MissionRuntime` is the live mechanism).
- CLASSIFICATION: DELETE. CONFIDENCE: high.

### D-21: `gateway/graceful_shutdown.js` [C3 D15]
- CLAIM: SIGTERM/SIGINT handlers never wired; shutdown path does not use it.
- EVIDENCE (STATIC): zero references outside its own file; not in live closure. `gateway/server.js` (19 lines, read in full) registers only `uncaughtException`/`unhandledRejection` - no SIGTERM/SIGINT, no require of this module. `GatewayRuntime.shutdown()` (`gateway_runtime.js:825-830`) only stops the kernel adapter. Independently verified.
- CALLERS: none. TESTS: none observed. LIVE-PATH: none.
- MIGRATION: none.
- ARCHIVAL: preserve the drain design (30s timeout) for when real shutdown handling is wired.
- SURVIVOR: none.
- CLASSIFICATION: DELETE. CONFIDENCE: high.

### D-22: `ping-runtime/temporal/workflows/mission_workflow.js` (+ dead requirer `ping-runtime/temporal/index.js`) [C3 D11]
- CLAIM: Temporal workflow with no wiring in the live boot.
- EVIDENCE (STATIC): `mission_workflow.js` required only by `ping-runtime/temporal/index.js:7`, which itself has zero requirers and is not in the live closure; plus `temporal_integration.test.js` (test-only). `gateway_runtime.js` contains zero mentions of "temporal" (case-insensitive grep). `gateway/temporal_runtime.js` is required only by `gateway/bootstrap/wiring.js:29` (container registration, lazy); the Temporal activity timeouts (5min startToClose, retry policy) never execute on the live path. Independently verified.
- CALLERS: dead index.js + one test. TESTS: `temporal_integration.test.js` references it - retire or keep as documentation. LIVE-PATH: none.
- MIGRATION: the test file.
- ARCHIVAL: preserve the Temporal timeout/retry design (startToCloseTimeout 5 minutes, max 3 attempts) - the live mission path has NO worker timeout at all (C3 F7), so this is the only articulated timeout design in the repo.
- SURVIVOR: none on the live path; the live retry mechanism is the scheduler retry ladder + lease reaper.
- CLASSIFICATION: DELETE (workflow file; index.js collapses with it if it has no other live purpose). CONFIDENCE: high.

### D-23: `gateway/execution_repository_port.js`
- CLAIM: Dead port/adapter with zero requirers (found during ExecutionRepository verification).
- EVIDENCE (STATIC): zero `require()` matches repo-wide; not in live closure. Its `execution_repository.${provider}` string (line 83) is a provider-name template, not a module load.
- CALLERS: none. TESTS: none. LIVE-PATH: none.
- MIGRATION: none.
- ARCHIVAL: none significant.
- SURVIVOR: n/a.
- CLASSIFICATION: DELETE. CONFIDENCE: high.

### D-24: `/home/nolan/crx/app/main.py:95` - `print(app.routes)` [C5 P-8]
- CLAIM: Debug leftover executed at import time in the CRX FastAPI event store.
- EVIDENCE (STATIC): line 95, module scope, dumps the full route table to stdout on every process start. Independently verified present.
- CALLERS: n/a (statement, not a symbol). TESTS: n/a. LIVE-PATH: runs on import.
- MIGRATION: none. Trivially removable single line.
- ARCHIVAL: none.
- SURVIVOR: n/a.
- CLASSIFICATION: DELETE (one line). CONFIDENCE: high.

---

## SECTION 2: MERGE (1 entry)

### M-1: Competing `IdentityAuthority` implementations [C5 P-4]
- CLAIM: Two independently exercisable ID generators are live; a third compiled copy is dead.
- EVIDENCE (STATIC): `gateway/constitutional-dist/identity-authority.js` (committed compiled output) is required by three LIVE modules - `gateway/routes/identities.js:29` (mounted by gateway_runtime), `gateway/knowledge_ingest_adapter.js:42` (in live closure), `gateway/social_ingest_adapter.js:39` (in live closure). Separately, `ping-runtime/authorities/identity_authority.js` (source, extends `KernelIdentityAuthority` from `runtime/kernel/authorities/identity_authority.js`) is required live by `gateway/dead_letter_authority.js:37`. `runtime/constitutional/dist/` (second compiled copy) has ZERO requirers. Independently verified all three prongs.
- CALLERS: as above. TESTS: `runtime/constitutional/dist/identity-authority.test.js` exists inside the dead dist tree. LIVE-PATH: the constitutional-dist copy and the ping-runtime source copy are both live via different callers.
- MIGRATION: converging callers onto one source-owned authority means editing the three constitutional-dist requirers to import the source (or its built output through a proper build step). Deleting `runtime/constitutional/dist/` breaks nothing (zero requirers).
- ARCHIVAL: record which dist build each live caller was using (the two dist builds have different hashes) before converging, in case of behavioral drift between them.
- SURVIVOR (Rule of One): `runtime/kernel/authorities/identity_authority.js` (`KernelIdentityAuthority`) as the source-owned authority, with `ping-runtime/authorities/identity_authority.js` as the legitimate specialization layer (it extends the kernel class - same pattern as the K-3 witness authority, which is KEEP). Committed `dist/` output must stop being required directly; dist becomes build output, not source.
- CLASSIFICATION: MERGE (converge callers; delete the unrequired `runtime/constitutional/dist/` tree). CONFIDENCE: high.
- NOTE: this is about which module owns ID generation. The deeper sovereignty violation (live identity paths minting inline via `crypto` at `unified_event_runtime.js:83`, `mission_runtime.js`, `execution/event_queue.js`, bypassing ALL authority modules) is a separate consolidation issue, not a deletion.

---

## SECTION 3: REJECTED - HAS A LIVE CALLER (10 entries)

### R-1: `gateway/witness_authority.js` - REJECTED [CORRECTION to C4 #17]
- Saving caller: `gateway/dead_letter_authority.js:35` requires it and USES it at `:144` (`witnessAuthority.createWitness(deadLetter, {...})`). `dead_letter_authority.js` is required by `gateway_runtime.js:91` and is on the live DLQ path (`MissionScheduler._failMission` -> `recordDeadLetter`). C4's "only the dormant cluster" was wrong; the module is live.
- Verdict: not dead. The sovereignty question (WitnessWorker builds attestations inline vs this singleton) remains open, but deletion is rejected.

### R-2: `gateway/replay/kernel/witness_authority.js` - REJECTED [CORRECTION to C5 P-5]
- Saving caller: `gateway/replay/kernel/deterministic_replay_engine.js:19` requires `./witness_authority` (DOUBLE quotes - this is why C5's grep found "zero require() callers") and INSTANTIATES it at `:28` (`new WitnessAuthority(witnessVersion)`). The engine is required by `gateway/kernel_replay_execution_provider.js:14`, which is wired into the live ReplayWorker path via gateway_runtime. Real, live use.
- Verdict: C5's DELETE classification is falsified. Not dead.

### R-3: `ping-runtime/authorities/identity_authority.js` - REJECTED [CLARIFICATION of C4 #13]
- Saving caller: `gateway/dead_letter_authority.js:37` (live, see R-1).
- Verdict: the module is not dead, so deletion is rejected. C4's BYPASSED label describes sovereignty (core paths mint inline), which is accurate and stands as a Rule-of-One violation to consolidate, but it is not deletable.

### R-4: `ping-runtime/authorities/deterministic_id_authority.js` - REJECTED [CORRECTION to C4 #14]
- Saving caller chain (all links verified real): `gateway_runtime.js` -> `gateway/routes/constitution.js` -> `gateway/bootstrap/wiring.js` -> `gateway/temporal_scheduler_provider.js` -> `ping-runtime/authorities/workflow_identity_authority.js` -> `deterministic_id_authority.js`. C4's "only workflow_identity_authority.js" missed that the chain is live.
- Verdict: not dead. (It also has many dead requirers in `gateway/constitutional_*`; those do not affect the verdict.)

### R-5: `ping-runtime/orchestration/merge_gate.js` - REJECTED
- Saving caller: `ping-runtime/orchestration/execution/engine.js:15` (live via `gateway_runtime.js:67`; ORCA-protected). C4's "ExecutionEngine stack only (not live)" is outdated after C5's wiring discovery.
- Verdict: not deletable while the engine is KEEP.

### R-6: `ping-runtime/orchestration/execution/engine.js` (ORCA ExecutionEngine) - REJECTED
- Saving caller: `gateway/bootstrap/gateway_runtime.js:67` requires it; `:339-341` initializes it and mounts `/orchestration` routes. Plus the in-repo DOC-CONTRACT (`gateway_runtime.js:326-336`) keeps it as a parallel execution authority pending the Orca-vs-live-spine convergence decision, and Nolan prohibited deleting ORCA.
- Verdict: KEEP. Only scoped deletions inside it (D-15, D-16) are docketed.

### R-7: `ping-runtime/runtime/capability_resolver.js` - REJECTED (as a deletion candidate)
- Saving caller: `gateway_runtime.js:38` (load), plus `runtime_fingerprint` and constitution/ops routes.
- Verdict: live as an INDEX (capability declarations hashed for fingerprinting). C4's "dormant as gate" stands - `resolve()` is never called on any execution path - but the module itself is not deletable.

### R-8: Python `runtime/authorities/execution_authority.py` - REJECTED [CLARIFICATION of task item 3]
- Saving callers (all real imports): `runtime/tool_router.py:14`, `runtime/supervisor.py:18`, `runtime/constitutional_runtime.py:21`, `runtime/constitutional_event_loop.py:40`, `runtime/cognitive/worker_protocol.py:16`, `projection_replay.py:20`, plus `tests/test_runtime_authority_boundaries.py:8`.
- Verdict: the "unwired plane" characterization is inaccurate. The Python runtime is internally wired; it is a parallel plane with no JS invoker (no gateway JS file spawns Python or references `constitutional_runtime.py`). A candidate with live callers is rejected. The Python/JS plane boundary is an architecture question, not a deletion.

### R-9: `ping-runtime/orchestration/execution/worker_port.js` (as a file) - REJECTED
- Saving caller: engine.js constructs `OpenCodeWorkerPort` (`:93`) and uses registry methods. Only the scoped deletions D-15/D-16 apply.

### R-10: `gateway/checkpoint_authority.js` is NOT rejected - see D-19. (Listed here only to prevent misreading: its DDL ownership does not make it live.)

---

## SECTION 4: HANDOFFS AND NON-DOCKET NOTES

- **P-7 (`ExecutionEngine.startAutonomousLoop`, engine.js:579-648) is NOT dead code.** It fabricates mission resolutions (`confidence: 0.85`, `bypass_type: 'auto_scan'`) behind a live HTTP endpoint (`POST /orchestration/engine/loop`, `gateway/routes/orchestration.js:272`). Per parent directive it belongs to CRITIC-SECURITY, not this docket. Handoff noted; not listed above.
- **`WorkspaceRegistry` (C4 #16, PHANTOM):** zero matches for the name in code, JSON, or docs on this branch. There is no file, so there is nothing to docket. Note only.
- **W2-IMPL-STATE new code:** `orca/control-loop/orca_run_record.js` + `orca_ready_set.js` (+ tests), committed `30a750fad` on branch `orca-finish/state` (worktree `/home/nolan/ping-orca-state`), targeting the `feature/orca-autonomy` branch substrate. Gap analysis shows they fill TRUE_GAPs (durable run record, dependency ready-set) that did not exist. No duplication of branch capability. Not docket material.
- **impl-safety staging (`orca_approval.js`, `orca_capability_gate.js`):** new, unmerged. Both carry explicit non-duplication contracts: `orca_approval.js` fills the TRUE_GAP of no approval record/binding on the orca-autonomy branch; `orca_capability_gate.js` is a lease layer that "does NOT reimplement" the branch's `authorizeWorkOrder` or the live `CapabilityAuthority`. No duplication. Not docket material.
- **ORCA-A (`program/orca-a/src/`):** new vertical-slice control loop against the orca-autonomy branch API, explicitly "No new stores, queues, or authorities." No overlap with docket candidates. ORCA-B verdicts not yet landed; re-scan when they do.
- **Prior-lane correction summary:** C4 #17 wrong (witness_authority live via dead_letter_authority); C4 #14 incomplete (deterministic_id_authority chain live); C5 P-5 wrong (double-quoted require missed; module instantiated on live replay path); C3 D7 wrong (checkpoint_authority dead, not live; checkpoints table has no live writer). C4/C5/C3 deadness claims otherwise independently confirmed.

---

## SECTION 5: METHOD APPENDIX

- Live-path trace: static transitive `require()` closure from `gateway/server.js` + `gateway/bootstrap/gateway_runtime.js`, resolving relative requires (`.js`/`.cjs`/`.mjs`/`index.js`), 189 files. A candidate absent from the closure AND with zero repo-wide require/import matches is treated as dead.
- Caller search: `git grep` for `require(...name...)` with single and double quotes, `from ...name`, bare name mentions, across `*.js`/`*.ts`/`*.py`; self-file excluded; test/spec/corpus hits reported separately.
- Schema check: INSERT column lists compared verbatim against the DDL that migrations actually run (`migration_engine.js`) or the only DDL present in-repo.
- Caveats: static analysis cannot see dynamic `require(variable)` (none found in the bootstrap/routes/generated dirs via targeted grep); commented-out requires can create false REACHABLEs (each surprising REACHABLE was hand-verified to a real, used require); the 17 dirty working-tree files were inspected as found (read-only); `/home/nolan/crx/app` is not a git repo (P-8 carries a path only, no SHA).
- No deletions, no edits, no commits were performed. Docket only.
