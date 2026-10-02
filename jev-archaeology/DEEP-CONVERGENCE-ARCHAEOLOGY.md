# DEEP CONVERGENCE ARCHAEOLOGY COMPLETE

Date: 2026-09-22/23. Repo `/home/nolan/ping` @ `cc6856c3b` (`refactor/runtime-authority-convergence`), DIRTY (16 files, none on the event write path).
Method: strictly read-only, four parallel lanes (A: event authority + worktrees; B: capability matrix; C: provider seam/crypto/human/namespaces; D: replay-witness-lineage/self-improvement/orphans/connections) + final contradiction sweep.
Working notes: `~/workspace/jev-archaeology/work-laneA/`, `work-laneB/`, `work-laneC/`, `work-laneD/`.

## WORKTREES INSPECTED

13 live worktrees + 1 prunable stale entry (`/tmp/bisect-eval006`, dangling gitdir).

| Path | Branch | HEAD | State | Purpose |
|---|---|---|---|---|
| /home/nolan/ping | refactor/runtime-authority-convergence | cc6856c3 | DIRTY (16) | PRIMARY — newest tree family, live wiring |
| ping/worktrees/agent-exec | sprint/agent-exec | 5b102c66 | clean | shares HEAD with oracle-assembly/playbook/python-prod |
| ping/worktrees/agent-smoke-abc123def456 | recovery/agent-smoke-2026-09-16 | 3e0c3ddd | DIRTY (11) | dead_letter/mission_control/ops experiments |
| ping/worktrees/oracle-assembly | main | 5b102c66 | DIRTY | oracle compose + multiruntime-proof |
| ping/worktrees/playbook | sprint/playbook | 5b102c66 | untracked playbook/ | playbook sprint |
| ping/worktrees/python-prod | sprint/python-prod | 5b102c66 | untracked prod/ | python prod sprint |
| /home/nolan/worktrees/constitutional-convergence | constitutional-convergence-v2 | 5aa33dcc | untracked releases/ | Sep-18 event-authority CERTIFICATION (e01ffc57c lineage); identity mutation lives here, NOT merged |
| /home/nolan/worktrees/constitutional-convergence-authority-law | constitutional-convergence-authority-law | 1995f0a5 | DIRTY (10) | 1000+ line divergent rewrite of event identity + gateway boot; unmerged |
| /home/nolan/worktrees/orca-autonomy | feature/orca-autonomy | ae55b77f | clean | EventRepository.project() derived-audit adapter experiment; unmerged |
| /home/nolan/worktrees/ping-codex-convergence | codex/context-workorder-convergence | 08c3036d | clean | temporal worker lifecycle fix; unmerged |
| /home/nolan/worktrees/ping-event-runtime | event-runtime-deduplication | 1f40cf43 | clean | duplicate event-ID collision detection; unmerged |
| /home/nolan/worktrees/ping-harvest-12h | sprint/harvest-12h | 8fe3b806 | clean | knowledge_refs test coverage; unmerged |
| /home/nolan/worktrees/ping-oracle-deploy | oracle/deploy-2026-09-18 | 6b422246 | clean | deploy fixture; unmerged |

Historical names calm-garden/eager-moon/kind-comet are NOT worktrees — remote branches `origin/opencode/*`, all pointing to the same frozen commit `aaec592bd` (2026-07-05, "freeze constitutional replay kernel"). calm-garden is dead as a branch and superseded as content: every listed concept survives in primary in evolved, now-live-wired form. Only check-items: old `gateway/temporal_authority.js` (re-expressed as `ping-runtime/temporal/`) and `gateway/mcp_registry.js` + `gateway/capability_scheduler.js` (no primary successor — verify need before rebuilding).
Two tree families: NEWER (primary + 7 others; ping-runtime/orchestration/*, 113 gateway/*_authority.js files, runtime/kernel/*, runtime/constitutional/src/*) vs OLDER (main @ 5b102c66 family; constitutional-compiler/, vendored mem0). Primary's history is rewritten (fresh root 29291bd9, 265 commits, no merge-base with old history). Main HEAD is NEWER than every worktree HEAD. The five convergence side branches are all unmerged into main (verified via merge-base).

## LIVE CANONICAL SPINE

`gateway/server.js` → `gateway/bootstrap/gateway_runtime.js` (boot) → `UnifiedEventRuntime.emit()` → PostgreSQL `ping_events` → `EventToMissionBridge` → `MissionScheduler` → `WorkerRuntime`/canonical workers → `KernelReplayExecutionProvider` (compiled kernel under `gateway/replay/kernel/`, from TS `runtime/kernel/replay/`) → `REPLAY_COMPLETED` → `WitnessWorker` (`WITNESS_CREATED`/`WITNESS_REJECTED`) → `LineageWorker` (`LINEAGE_CREATED`).
Live evidence: 2026-09-23 ~01:45 UTC, ping-gateway container (2026-09-16 snapshot; MD5 differs from HEAD on 5 core files — evidence proves the Sep-16 snapshot, logic identical where compared): 63 REPLAY_COMPLETED / 63 WITNESS_CREATED / 63 LINEAGE_CREATED, all kernel_verified, 0 refusals, 2026-09-16 → 2026-09-22.
Exact bridge mapping: OBSERVATION_CREATED→CLAIM_GENERATE, CLAIM_CREATED→CLASSIFICATION_CREATE, CLASSIFICATION_CREATED→RECOMMENDATION_CREATE, RECOMMENDATION_CREATED→PROJECTION_CREATE, PROJECTION_CREATED→REPLAY_VERIFY, REPLAY_COMPLETED→WITNESS_CREATE, WITNESS_CREATED→LINEAGE_CREATE, LINEAGE_CREATED terminal.

## EVENT AUTHORITY

**RESOLVED: UnifiedEventRuntime.emit() → PostgreSQL `ping_events` is the live canonical event authority.**
- Exactly ONE runtime INSERT into ping_events repo-wide (`ping-runtime/events/unified_event_runtime.js:152`, `INSERT ... ON CONFLICT DO NOTHING` + semantic-collision fail-closed; contradiction sweep 2026-09-23: only other matches are test/eval string-matching mocks and a test-setup insert — not runtime writers).
- All producers (8 canonical workers, intelligence_worker, business emitters, canonicalization_service, EventBridge, mission_runtime, mission_scheduler, POST /events, bootstrap seed) route through emit(). Live boot wiring at gateway_runtime.js:433-439.
- Verified ledgers: `docs/EXECUTION_EVIDENCE_LEDGER.md` (2026-08-27): POST /ingest → 3×201 real events; 9-hop causal chain in Postgres; ping_events 1050→1091→1132 and 1214→1255 (+41, "exact ledger match"). `CERTIFICATION.md` + `CONTRADICTIONS.md` @ e01ffc57c (2026-09-18, constitutional-convergence-v2): single-authority certification, exactly-one-INSERT sweep, 8 legacy writer stacks classified. `docs/LIVE_ARROW_AUDIT.md`, `docs/P3_CONTRADICTION_CONVERGENCE_LEDGER.md`: live spine arrows.
- Artifact names "Ledger 77" and "GOVERNANCE_AUDIT_PHASE_D_PROBE_MATRIX" do NOT exist anywhere (code, docs, history) — anyone citing them is citing nonexistent artifacts; cite the real ones above.
- `canonical_events` = live COMPATIBILITY ADAPTER (upstream ingress: `CanonicalEventEnvelope.executeEmitEvent` called by HPP business authorities in live boot; EventBridge converges rows into ping_events). Not the canonical store.
- `repository_events` = DORMANT writer (EventRepository.appendEvent has zero live callers; kernel EventReadAuthority reads an empty table). An unused writer is not an alternate live authority.
- `events` table = LEGACY/DEAD (7 writers in dead modules/tests only).
- `ConstitutionalEventStore`, `AcquisitionManager`, `EventAuthority.computeEventIdFromEvent` = PHANTOMS (zero matches in all 13 worktrees and full history; doc-only or nonexistent names). Not components.
- `IEventAuthority` = DORMANT unrealized TS interface; zero importers/implementers.
- Known live-path gaps: EventBridge `_skipGovernance:true` ingress (hardening gap); `/events/stats` reads dormant repository_events first, falls back to ping_events (stale read-order artifact).
- **Unmerged divergence**: the Sep-18 convergence branch mutated emit() to `IdentityAuthority.generateId` (`event_<16hex>` IDs); never merged. Main's emit() still mints inline `sha256(JSON.stringify(...))` 64-hex IDs with its own P0 collision law (ccfef91f3). Same canonical authority, two unmerged identity laws. The authority-law branch (1995f0a5) is a further 1000+ line divergent rewrite, also unmerged — citing it as live would be false.

## IDENTITY AUTHORITY

**UNRESOLVED — three live lanes, no convergence.**
- Main event path: inline crypto in emit() (64-hex content IDs). REACHABLE, LIVE-PROVEN.
- `ping-runtime/authorities/identity_authority.js` (PATCH_004 shim → kernel singleton): REFERENCED/REACHABLE; 67 requires hit the shim by design; emit() does NOT route through it.
- `runtime/constitutional/src/` (PATCH 7A/7B, 2026-09-21, newest, tested): IdentityAuthority + HashAuthority live via `gateway/constitutional-dist` → `routes/identities.js` (boot line 683), social/knowledge ingest adapters — for identities/objects, NOT wired into event emit.
- `runtime/kernel/identity/canonical-identity-service.ts`: declared canonical in yaml, DORMANT w.r.t. live event path. `deterministic_id_authority.js`: LEGACY/DEPRECATED, delegates.
- `constitutional-authorities.yaml` is partially stale (references deleted witness/ files).

## HASH AUTHORITY

**RESOLVED with residual sprawl.**
- Canonical: `runtime/kernel/replay/certificate_authority.ts` `static sha256()` — genuine pure-TS NIST FIPS 180-4 (verified constants), delegated to by `canonical_hash_authority.ts`. Live consumers: postgres_event_store, witness_authority, merkle_tree, repository-authority, commit-service identity_engine, gateway/replay_authority, verification_pipeline.
- The "fake SHA-256" (`cryptographic-authorities.ts`, Java-style 32-bit bit-shift loop padded to 64 hex, self-admitted placeholder; computeBLAKE3 identically fake): REAL hazard, DORMANT, **DELETED** in c54bd91bc (2026-06-27) with zero consumers across its lifetime and zero reach of canonical identity. Residual severity: LOW (deleted); the yaml's CRITICAL row is stale.
- Live residual: yaml notes ~67 hash computation sites, only 3 route through canonical — a real, separate, unaddressed sprawl finding (worth its own lane).

## MISSION AUTHORITY

`ping-runtime/orchestration/mission_runtime.js` + `mission_scheduler.js` — CANONICAL/LIVE (boot-wired, EMPR-proven). `gateway/mission_authority_v2.js` adds MissionPriority (CRITICAL/HIGH/MEDIUM/LOW) and ExecutionPolicy (SEQUENTIAL/PARALLEL/BEST_EFFORT/STRICT) — scheduling semantics only. Name-collision warning: do NOT name the Jev policy module `ExecutionPolicy`.

## WORKER AUTHORITY

`ping-runtime/workers/worker_runtime.js` + `canonical_workers.js` (6 canonical JS workers + IntelligenceWorker) — CANONICAL/LIVE. IntelligenceWorker deliberately dormant (eventTypes:[] with documented re-enablement conditions). Python pipeline `workers/*.py` → `kernel/event_dispatcher.py` live parallel lane. Duplicates: `ping-runtime/agents/replay_worker.js`, `base_worker.js` (live winner: canonical_workers.js); `workers/*.py` root copies (244/247 diff lines, zero importers — legacy).

## REPLAY AUTHORITY

`runtime/kernel/replay/` (deterministic_replay_engine.ts, replay-transcript.ts, replay_verification.ts) via `KernelReplayExecutionProvider` — REACHABLE/EXECUTED, live via ReplayWorker; emits durable REPLAY_COMPLETED only when kernel status ok and violations empty. `gateway/replay_verifier.js` = DORMANT (importers all dead). Caveat: current replay is single-event structural (`_buildReplayEvents` returns only the triggering event); `getCorrelationGroup` (line 348) exists but is uncalled — causal-chain replay is a CONNECTION-class fix.

## WITNESS AUTHORITY

No WitnessAuthority class exists. Live witness = `WitnessWorker` → `WITNESS_CREATED` via emit(); refuses unverified replays (`WITNESS_REJECTED`). `gateway/witness_recorder.js`, `witness_registry.js` = DORMANT (off live boot path).

## LINEAGE AUTHORITY

No standalone Lineage class; `LineageWorker` emits `LINEAGE_CREATED` with only `causationChain:[metadata.causation_id]` — much shallower than the kernel's internal lineage graph, which is not persisted as a first-class record. Lineage→projection is NOT connected through the bridge (bridge declares LINEAGE_CREATED terminal; ProjectionWorker handles it anyway).

## CAPABILITY AUTHORITY

`runtime/kernel/capabilities/capability-authority.ts` (+ interface) — IMPLEMENTED, but IMPORTABLE status unclear vs the live JS `ping-runtime/orchestration/execution/capability_registry.json` + engine wiring (gateway_runtime.js:339 instantiates the whole ExecutionEngine universe: engine, consensus_engine, merge_gate, intelligence_graph, context_authority, artifact_authorities, dormant_classifier, mission_compiler, scheduler, artifact_router, artifact_store, worker_state_machine, capability_registry, event_queue, ollama_provider). That universe is REACHABLE but QUIESCENT — it duplicates the canonical pipeline. Salvage candidates: MergeGate, DormantClassifier (466 modules: 175 migrate / 56 resurrect), ConsensusEngine design, IntelligenceGraph builder. FilesystemAuthority = real, harness-only. CommitAuthority (307 lines) = zero importers. SignatureAuthority = claimed in docs, no implementation anywhere (DANGEROUS gap).

## HUMAN DECISION AUTHORITY

**No unified model ever existed** (`git log -S"HumanDecision" --all` empty; no human_required/approval_required strings). Distributed dead fragments — convergence needed, plus a real entry point:
- `gateway/approval_authority.js` (legacy): `approvals` table, but `_determineApprovalPolicy()` hardcoded to `automatic`; `approveManually()` free-form approver, zero callers, no API route. Contradiction sweep 2026-09-23: zero references outside its own file (dynamic-resolution caveat eliminated).
- `ping-runtime/approval/business_action_authority.js` + `effect_authority.js`: current human-approval design, test-only, no HTTP routes (ORPHANED BUT VALUABLE).
- `ping-runtime/knowledge/knowledge_promoter.js`: human-signal promotion to knowledge, but no production code emits SNIPPET_APPROVED/AI_RESPONSE_ACCEPTED — the human entry point doesn't exist (LEARN stage starved at 0 processed).
- `MergeDecisionArtifact` is a machine merge-gate artifact (misleading name); Proposal/Consensus classes have no human semantics.
- Bottom line: nobody can require human approval through any path today. The Jev sprint must not assume a human gate it can call.

## MODEL PROVIDER AUTHORITY

**The "missing interface" was never implemented** — `gateway/adapters/ollama_adapter.js` was born broken (Jul 5 2026, aaec592bd/d596aa596); `infrastructure_adapter_interface` and `serializer_authority` never existed in any worktree or commit. The live seams are:
- `ping-runtime/ai/inference_adapter.js` — "Single Constitutional Authority... All inference must flow through this adapter"; provider selection via `INFERENCE_PROVIDER` env (ollama/openai); consumed by `gateway/constitutional_runtime.js:26,41`, `conversation_memory.js`, `knowledge_retrieval.js`.
- `ping-runtime/ai/ollama_provider.js` (`OllamaProvider`) — required at `gateway/bootstrap/gateway_runtime.js:77`, wired into the engine universe (AIRuntime, default localhost:11434).
- **D8 (new, from contradiction sweep)**: two live inference seams = convergence item. `gateway/adapters/ollama_adapter.js` (495) and `gateway/ollama_adapter.js` (338, test-only) are dead/dormant; with `execution/ollama_provider.js` that is 3–4 divergent Ollama implementations (D1 duplicate).
- Vercel: zero code in repo (one test-file mention). No ModelProvider seam decision exists; the two JS seams above are the de-facto authority.

## ARTIFACT AUTHORITY

Live: `execution/artifact_authorities.js` (Proposal/Consensus/MergeDecision/Replay/Witness, ctor(store, queue)) + `artifact_store` in the engine universe — REACHABLE but QUIESCENT. Orphaned: `gateway/artifact_authority.js` (pure-contract, different ctor, zero importers). No live proposal-to-decision artifact: RecommendationWorker emits proposals into a void (MergeDecisionArtifact exists only in the quiescent engine).

## DUPLICATE AUTHORITIES FOUND

- D1. Ollama provider ×3–4 (adapters/ollama_adapter.js [dead/broken] vs gateway/ollama_adapter.js [test-only] vs gateway/adapters/ollama_adapter.js [dead/broken] vs execution/ollama_provider.js [engine] + ping-runtime/ai/ollama_provider.js [boot]).
- D2. WorkerRegistry ×3 (worst): gateway/worker_registry.js (event-sourced lifecycle) vs ping-runtime/orchestration/worker_registry.js (LLM persona catalog — different responsibility, same name) vs runtime/kernel/workers/worker-registry.ts (cleanest, zero importers).
- D3. ArtifactAuthority ×2 (live engine ctor(store,queue) vs orphaned gateway/artifact_authority.js).
- D4. replay_worker.py / witness_worker.py ×2 each (wired workers/*.py vs legacy root copies).
- D5. PatchAuthority v1 vs v2 (626 vs 781 lines, totally different; neither imported).
- D6. Qdrant clients ×2–3.
- D7. mission_authority.js vs mission_authority_v2.js (same v1/v2 smell, importer check not completed — flagged).
- D8. Inference seams ×2 live (inference_adapter.js vs ollama_provider.js/OllamaProvider).
- Cross-language parallels (JS kernel / Python / TS-newest identity) are per-runtime by design but need a convergence decision.

## DORMANT / LEGACY SYSTEMS

Mem0 (vendored, older family only); constitutional-compiler runtime; calm-garden branch; root py worker copies; gateway/artifact_authority.js; PatchAuthority v1; persona-catalog worker_registry.js; TS worker-registry.ts; gateway/approval_authority.js; gateway/witness_recorder.js, witness_registry.js, replay_verifier.js and most legacy gateway/replay_*.js/witness_*.js; gateway/ollama_adapter.js; ping-runtime/agents/distributed_desktop_agents.js, worker_port.js; ping-runtime/orchestration/index.js; gateway/technology_authority.js (orphaned); gateway/authority_container.js (never adopted — DEAD).

## ORPHANED VALUABLE COMPONENTS

- `gateway/patch_authority.js` + v2 — full patch lifecycle incl. rollback (CONVERGENCE CANDIDATE).
- `ping-runtime/approval/business_action_authority.js` + `effect_authority.js` — current human-approval design (CONVERGENCE CANDIDATE).
- `runtime/kernel/workers/worker-registry.ts` — cleanest registry (CONVERGENCE CANDIDATE).
- `runtime/constitutional/src/*` (Patch 7B) — newest canonical identity/hash/time, tested, unwired (CONVERGENCE CANDIDATE; do not reinvent).
- `gateway/patch_authority_v2.js` — FYD typed-patch future should evaluate it first.
- MergeGate, DormantClassifier output, ConsensusEngine design, IntelligenceGraph builder (from the quiescent engine).
- `gateway/continuous_acquisition.js` + `acquisition_authority.js` — repo ingestion (never instantiated).
- `gateway/technology_authority.js`, `gateway/adapter_compiler_v2.js` — design sketches.
- DANGEROUS: `ExecutionEngine.startAutonomousLoop` (`ping-runtime/orchestration/execution/engine.js:579`) — synthesizes worker findings with hardcoded confidence 0.85 into ConsensusEngine.evaluate; reachable via authenticated POST `/orchestration/engine/loop` (routes/orchestration.js:272). Live evidence-fabrication primitive behind one auth check. `gateway/self_improvement_loop.js` — orphaned, header over-claims, `_analyzeRepository` called but never defined, reaches into another service's `_postgres`; must never be cited as a loop.

## MISSING CONNECTIONS

- C1. ReplayWorker._buildReplayEvents does not call existing `getCorrelationGroup` (line 348); /mc/replay/trace already uses it. ~15 lines.
- C2. KnowledgePromoter live but starved: no live producer of approval events (only build-time event_generator.js, tests).
- C3. BusinessActionAuthority/EffectAuthority have no HTTP routes; mission_control.js has zero approval endpoints.
- C4. ContinuousAcquisition never instantiated; the bridge already maps GITHUB_COMMIT_SYNCED→DOCUMENT_IMPORT, so downstream exists.
- C5. MergeGate.can_commit has no path to PatchAuthority.applyPatch.
- C6. DormantClassifier's 466-module inventory is written at boot and never consumed.
- C7. No live proposal-to-decision artifact (MergeDecisionArtifact exists only in the quiescent engine).
- Checked and NOT missing: the OllamaAdapter/AcquisitionManager examples from the brief do not match reality (old adapter simply dead; no AcquisitionManager exists).

## ACTUAL MISSING COMPONENTS

- A wired human-approval entry point (routes + identity + grant path). Nothing exists.
- A live proposal-to-decision artifact on the canonical path.
- A converged inference-provider registry (two live seams).
- A converged identity law (two live laws: emit() inline crypto vs PATCH 7A/7B).
- A persisted first-class lineage record (kernel lineage graph not persisted).
- A real approval-event producer (for KnowledgePromoter/LEARN).
- SignatureAuthority (claimed, unimplemented — DANGEROUS gap).

## SELF-IMPROVEMENT PIPELINE

Stage | Mechanism | Intelligence | Live | Human-gated | Autonomous | Durable | Replayable
---|---|---|---|---|---|---|---
OBSERVE | ObservationWorker | partial | YES | NO | YES | YES | YES
REASON | ClaimWorker + ClassificationWorker | YES | YES | NO | YES | YES | YES
PROPOSE | RecommendationWorker | partial | YES | NO | YES | YES | YES (emits into a void — no decision artifact)
EVALUATE | kernel InvariantRunner (per replay) | YES | YES | NO | YES | YES | YES; MergeGate/ConsensusEngine only in quiescent engine
APPROVE | BusinessActionAuthority (PENDING_HUMAN) | NO | test-only | N/A (no entry point) | NO | NO | NO
EXECUTE | MissionScheduler + WorkerRuntime | N/A (mechanism) | YES | NO | YES | YES | YES
VERIFY | replay → kernel → witness | YES | YES | NO | YES | YES | YES (single-event structural; causal-chain replay = C1)
LEARN | KnowledgePromoter | NO | registered, 0 processed (starved) | YES (by design) | NO | YES | YES

Bottom line: a closed autonomous self-improvement loop does NOT exist. Six of eight stages have live, durable, replayable mechanisms. The missing wiring is: repo-OBSERVE→events (C4), human APPROVE→routes (C3), patch EVALUATE/APPLY (C5), approval-event producer (C2), and the commit step.

## TOP 10 HIGH-LEVERAGE IMPROVEMENTS

1. **Gate or remove `ExecutionEngine.startAutonomousLoop`** — TYPE: COMPLETION (P0 safety). EVIDENCE: engine.js:579 synthesizes findings at hardcoded 0.85 confidence into ConsensusEngine.evaluate; reachable via authenticated POST /orchestration/engine/loop (routes/orchestration.js:272). BENEFIT: removes a live evidence-fabrication primitive. RISK: low — nothing depends on it. AUTHORITY IMPACT: none. PERSISTENCE IMPACT: none. REPLAY IMPACT: prevents fabricated confidence from entering future replay.
2. **Wire ReplayWorker to `getCorrelationGroup`** (C1) — TYPE: CONNECTION. EVIDENCE: unified_event_runtime.js:348 exists, uncalled by _buildReplayEvents; /mc/replay/trace already uses it. BENEFIT: replay verifies real causal chains, not single events. RISK: low (~15 lines). AUTHORITY IMPACT: none. PERSISTENCE IMPACT: none (reads more). REPLAY IMPACT: directly strengthens replay semantics.
3. **`/approvals` routes for BusinessActionAuthority** (C3) — TYPE: CONNECTION. EVIDENCE: design exists test-only; mission_control.js has zero approval endpoints. BENEFIT: unblocks the human gate the Jev sprint's C3–C5 policy requires. RISK: medium (~100 lines + auth). AUTHORITY IMPACT: activates HumanDecision authority (converged, not invented). PERSISTENCE IMPACT: approvals table already exists. REPLAY IMPACT: human decisions become replayable evidence.
4. **Converge the two live inference seams** (D8) — TYPE: CONVERGENCE. EVIDENCE: inference_adapter.js (INFERENCE_PROVIDER env, used by constitutional_runtime) vs ollama_provider.js/OllamaProvider (boot line 77, engine universe). BENEFIT: one model seam for the Jev TypedDecisionProvider to sit behind. RISK: medium. AUTHORITY IMPACT: establishes the real ModelProvider authority. PERSISTENCE IMPACT: none. REPLAY IMPACT: provider metadata becomes consistent.
5. **Converge the identity laws** — TYPE: CONVERGENCE. EVIDENCE: main emit() inline crypto vs PATCH 7A/7B IdentityAuthority (routes/identities.js, boot line 683). BENEFIT: one identity law for events and objects. RISK: high (identity is constitutional). AUTHORITY IMPACT: resolves IdentityAuthority. PERSISTENCE IMPACT: affects ID format going forward (never rewrite history). REPLAY IMPACT: positive if done forward-only.
6. **Acquisition emits GITHUB_COMMIT_SYNCED** (C4) — TYPE: CONNECTION. EVIDENCE: continuous_acquisition.js + acquisition_authority.js exist, never instantiated; bridge already maps GITHUB_COMMIT_SYNCED→DOCUMENT_IMPORT. BENEFIT: real repo OBSERVE source for the self-improvement loop. RISK: medium — needs repo allowlist + human consent (never auto-ingest arbitrary repos). AUTHORITY IMPACT: activates acquisition authority. PERSISTENCE IMPACT: new event volume. REPLAY IMPACT: repo observations become replayable.
7. **Delete/archive `ping-runtime/agents/*` duplicates** — TYPE: CONVERGENCE. EVIDENCE: zero references proven (replay_worker.js, base_worker.js; live winner canonical_workers.js). BENEFIT: removes confusion surface. RISK: low. Archive per SOUL §7, do not hard-delete blindly. All impacts: none.
8. **Real approval-event producer → KnowledgePromoter** (C2) — TYPE: CONNECTION. EVIDENCE: KnowledgePromoter live-registered, 0 processed; only tests emit SNIPPET_APPROVED/AI_RESPONSE_ACCEPTED. BENEFIT: activates LEARN. RISK: low-medium. AUTHORITY IMPACT: feeds knowledge authority. PERSISTENCE IMPACT: knowledge graph writes. REPLAY IMPACT: learning becomes evidence-backed.
9. **Salvage-and-retire the ExecutionEngine universe** — TYPE: CONVERGENCE. EVIDENCE: reachable but quiescent; duplicates canonical pipeline; contains MergeGate, DormantClassifier (466 modules triaged), ConsensusEngine design. BENEFIT: one execution universe; harvest the valuable parts. RISK: medium — confirm against the active convergence plan before retiring (it may be an intentional reference implementation). AUTHORITY IMPACT: resolves ExecutionEngine duplication. PERSISTENCE IMPACT: artifact_store disposition. REPLAY IMPACT: single execution history.
10. **Harden the live event path** — TYPE: COMPLETION. EVIDENCE: EventBridge `_skipGovernance:true` ingress (contradiction C-008); `/events/stats` reads dormant repository_events before falling back to ping_events. BENEFIT: closes known hardening gaps on the proven path. RISK: low. AUTHORITY IMPACT: strengthens EventAuthority. PERSISTENCE IMPACT: none. REPLAY IMPACT: none.

Explicitly NOT recommended: enabling self_improvement_loop.js or startAutonomousLoop as-is; reading 63/63 verified as chain-proof (may reflect weak invariants); deleting IntelligenceWorker; building any new event/persistence system (2026-09-13 continuity guardrail).

## NINE ORIGINAL QUESTIONS

1. **Worktree** (fresh worktree off cc6856c3, leave 16 dirty files untouched?) — RESOLVED: SAFE DEFAULT EXISTS. Standard practice; primary worktree is the newest family and correct implementation target (REPOSITORY CAN ANSWER). Create fresh worktree; do not touch dirty files. No operator input needed.
2. **DecisionUnit persistence** (event-derived vs canonical up front?) — RESOLVED: REPOSITORY/LIVE EVIDENCE CAN ANSWER. Event Authority is proven (exactly-one-writer to ping_events); DecisionRecord must be event-derived behind an interface, emitting through emit(). No new event store (2026-09-13 guardrail). New non-event tables are not needed for the first slice.
3. **First slice** (claim-classification vs mission-approval vs other?) — RESOLVED: LIVE EVIDENCE CAN ANSWER. The OBSERVATION→CLAIM→…→LINEAGE pipeline is live/durable/replayable (63/63 verified). The mission-approval path is dead (approval fragments unwired, policy hardcoded automatic) — choosing it first would mean building the gate before proving the decision. Claim-classification in the live pipeline, shadow mode.
4. **Auto-execution ceiling** (C0 / C0–C1 / shadow-only?) — CONSTITUTION CAN ANSWER + SAFE DEFAULT EXISTS: shadow-only, because no human gate is currently wired (Lane C: nobody can require human approval through any path today). Widening to C0/C1 auto-execution is a genuine operator decision, but the default is safe without asking.
5. **Human gate** (mandatory for C3–C5? name the human?) — CONSTITUTION CAN ANSWER the mandate (yes, mandatory; "delegate authority conservatively"). The human is Nolan (SAFE DEFAULT — he is the operator). The entry point (recommended: /approvals routes per C3) is an implementation choice, not an operator question.
6. **Temporary reasoning backend** (Ollama vs Vercel Gateway?) — RESOLVED: SAFE DEFAULT EXISTS. Ollama-local via the live seam (no data leaves the Pig, matches constitutional data-minimization, zero new tokens). Vercel is a genuine operator option only if he wants frontier reasoning quality.
7. **Schema** (new tables/migrations authorized?) — SAFE DEFAULT EXISTS: strictly event-derived for the first slice; no new tables. Operator keeps the veto if the sprint proves a need.
8. **Provider seam** (re-establish missing infrastructure_adapter_interface?) — RESOLVED: REPOSITORY CAN ANSWER. The interface never existed (born broken); do NOT create it. The live seams are ping-runtime/ai/inference_adapter.js and ping-runtime/ai/ollama_provider.js (D8: converge them). JevDecisionProvider sits behind the converged seam.
9. **Event Authority** (drive to formal resolution in 24h vs timebox?) — RESOLVED: LIVE EVIDENCE CAN ANSWER. Already resolved by this archaeology: UnifiedEventRuntime → ping_events, exactly-one-writer, certified. Spend zero sprint hours on it. Residual work is identity-law convergence (#5), a CONVERGENCE item, not an Event Authority question.

## TRUE OPERATOR DECISIONS REMAINING

1. **Auto-execution ceiling**: keep shadow-only (recommended, constitution-backed, no human gate exists yet) or widen to C0/C1 auto-execution during the sprint?
2. **Reasoning backend**: Ollama-local (recommended default, data stays on the Pig) or authorize Vercel/frontier models for better reasoning quality?
3. **Schema veto**: confirm the default (event-derived only, no new tables for the first slice) or pre-authorize migrations if the sprint proves a need?

Everything else the nine questions raised is answered by the repository, live evidence, the constitution, or safe defaults.

## BLOCKERS

- None for the archaeology. For the sprint: the human gate (C3–C5 policy) cannot be exercised until improvement #3 (or equivalent) wires a real entry point — this is why shadow-only is the default.
- The two unmerged identity laws (#5) do not block the first slice (DecisionRecord rides emit() as-is) but must not be "resolved" by the sprint inventing a third.
- The 1000+ line divergent authority-law branch (1995f0a5) must not be mistaken for live architecture by any agent.

## RECOMMENDED FIRST SLICE

Typed claim-classification inside the live pipeline (`DOCUMENT_IMPORT → OBSERVATION_CREATE → CLAIM_GENERATE → REPLAY_VERIFY → WITNESS_CREATE → LINEAGE_CREATE → PROJECTION_CREATE`): `DecisionRequest {observation, evidence_refs}` → `TypedDecisionProvider` → `{ACCEPT_CLAIM | REJECT_CLAIM | NEEDS_MORE_EVIDENCE, probability}` → deterministic policy module (name it `MayExecutePolicy`, NOT `ExecutionPolicy`) → existing worker emits downstream events. Shadow mode: record the provider decision alongside the rule-based worker's actual decision in an `EvaluationRecord`; ZERO execution authority. DecisionRecord is event-derived behind an interface via emit(). Provider backend: Ollama through the live seam. JevDecisionProvider implements the interface with the provider call disabled until official credentials exist.

WHY: the pipeline is live, durable, and replayable end-to-end (63/63 kernel-verified in the running snapshot); exactly-one-writer holds on ping_events; no new event store, no new authority, no new tables; the provider seam is live and local; shadow mode builds PING's own calibration dataset; the mission-approval alternative is dead code and would invert the dependency (gate before proof); and every one of the nine original operator questions except the three above is already answered by the archaeology.
