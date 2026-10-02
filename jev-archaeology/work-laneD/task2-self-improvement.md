# TASK 2 — Self-improvement mechanisms that already exist

## Per-stage table: OBSERVE → REASON → PROPOSE → EVALUATE → APPROVE → EXECUTE → VERIFY → LEARN

Attributes: MECH (mechanism exists) / INTEL (intelligence exists) / LIVE (on running gateway path)
 / HG (human-gated) / AUTO (autonomous) / DUR (durable) / REP (replayable).

| Stage | Mechanism | MECH | INTEL | LIVE | HG | AUTO | DUR | REP | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| OBSERVE | ObservationWorker (canonical_workers.js) | Y | partial | Y | N | Y | Y | Y | Registered for 22 business event types; /mc/workers shows it live. Rule-based extraction (documentId/source/metadata). Emits OBSERVATION_CREATED → PG. |
| REASON | ClaimWorker + ClassificationWorker | Y | Y | Y | N | Y | Y | Y | claim:6, classification:6 processed live. Classification has confidence semantics, fabrication fixes (cba960a40). IntelligenceWorker (Ollama-enhanced) exists but DORMANT (eventTypes:[]). |
| PROPOSE | RecommendationWorker → RECOMMENDATION_CREATED | Y | partial | Y | N | Y | Y | Y | recommendation:6 processed live. Rule-based. |
| EVALUATE | kernel InvariantRunner (per replay) | Y | Y | Y | N | Y | Y | Y | DeterministicReplayEngine registers standard invariants (replay_invariants.ts:117); runs on every live replay; violations → verified=false. |
| EVALUATE | MergeGate (code gates, can_commit) | Y | Y | N | N | N | N | N | ping-runtime/orchestration/merge_gate.js; CLI-runnable (exit 1 on blocking); also constructed in ExecutionEngine but engine is quiescent. Never on an automatic path. |
| EVALUATE | ConsensusEngine.evaluate | Y | Y | N | N | N | N | N | Only caller is engine.js:293 (quiescent ExecutionEngine). |
| APPROVE | BusinessActionAuthority.proposeAction (PENDING_HUMAN) | Y | N/A | N | Y | N | Y* | N/A | ping-runtime/approval/business_action_authority.js. *durable only if storage injected. Required ONLY by tests (approval_effect.test.js, approval_restart_durability.test.js). No routes expose it. |
| APPROVE | EffectAuthority (effect identity for approved actions) | Y | N/A | N | N | N | Y* | N/A | Links proposed_action→approval→effect with canonical effect ids. Tests only. |
| APPROVE | gateway/approval_authority.js (Phase 21) | Y | ? | N | ? | N | ? | ? | ORPHANED — required by nothing. Legacy parallel approval. |
| DECIDE | MergeDecisionArtifact / ProposalArtifact / ConsensusArtifact | Y | partial | N | N | N | N | N | ping-runtime/orchestration/execution/artifact_authorities.js; instantiated only in quiescent ExecutionEngine. |
| EXECUTE | MissionScheduler + WorkerRuntime + MissionRuntime | Y | N | Y | N | Y | Y | Y | Live: scheduler 5s poll, missions in PG, DLQ wired (DeadLetterAuthority). |
| EXECUTE | ExecutionEngine (parallel universe) | Y | Y | Q | N | N | N | N | Instantiated at gateway boot :339, mounted at /orchestration (auth-gated). Q=quiescent: initializes, builds intelligence graph, classifies; dispatch/compile only via manual POST. startAutonomousLoop SYNTHESIZES findings (confidence 0.85 hardcoded) — DANGEROUS if ever triggered. |
| VERIFY | ReplayWorker → kernel engine | Y | Y | Y | N | Y | Y | Y | 63/63 verified live. See Task 1. |
| VERIFY | WitnessWorker (W7 honesty gate) | Y | Y | Y | N | Y | Y | Y | 63 attestations, 0 refusals live. Refuses unverified replays. |
| LEARN | KnowledgePromoter (human approval → knowledge) | Y | N | Y | Y | N | Y | Y | Registered live ('knowledge-promotion', 0 processed — no human approvals yet). SNIPPET_APPROVED→confidence 1.0; REJECT→0.2 + down-rank. KG is durable. |
| LEARN | SelfImprovementLoop (gateway/self_improvement_loop.js) | partial | partial | N | N | N | Y | N | ORPHANED (required by nothing). Header claims Patch→Validation→Replay→Approval→Commit→Witness→Checkpoint; CODE ONLY does discover→analyze→generate→prioritize→schedule→execute→store pattern/failure→bump frequencies. Reaches into another service's _postgres. No patch/approval/commit in code — header is aspirational. |
| LEARN | DormantClassifier (466-module inventory) | Y | Y | boot-only | N | N | Y(files) | N | Runs at ExecutionEngine init; output ping-runtime/orchestration/dormant_classifications/*.json (175 migrate / 56 resurrect / 257 needs_review). Not fed back into any loop. |
| PATCH | PatchAuthority (v1 gateway/patch_authority.js, v2) | Y | Y | N | N | N | ? | ? | ORPHANED (nothing requires). v1: AST parse, diff validation, lint, typecheck, tests, security scan, patch witness, git diff, apply, rollback, conflict resolution — full lifecycle designed, never wired. |
| ROLLBACK | TransactionBoundary (gateway/transaction_boundary.js) | Y | N | N | N | N | N/A | N/A | ORPHANED (nothing requires). Auto-rollback on failure. ping-runtime/agents/* (also orphaned) references a transaction boundary concept. |
| ROLLBACK | DeploymentRegistry rollback route | Y | N | Y | N | N | Y | Y | /deployments/:id/rollback live-mounted — but this is tenant-deployment lifecycle, NOT self-improvement patch rollback. |
| COMMIT | git commit automation for self-improvement | N | N | N | N | N | N/A | N/A | None found. MergeGate.summary().can_commit is a boolean, not a committer. No simple-git/isomorphic-git wired to a loop. |

## Key judgments

1. **The "self-improvement loop" as a closed autonomous loop does NOT exist.** What exists is a
   linear business pipeline (observe→reason→propose→execute→verify) that is live and durable,
   plus human-gated learning (KnowledgePromoter), plus a shelf of unwired mechanisms for the
   missing stages (evaluate/patch/approve/commit/rollback).
2. **Do NOT claim "self-improvement exists" from mechanics alone**: the only component literally
   named SelfImprovementLoop is orphaned AND its header over-claims (no patch/validation/replay/
   approval/commit in the code). It would be wrong to cite it as evidence the loop exists.
3. **Do NOT claim it absent either**: 6 of 8 stages have live, durable, replayable mechanisms;
   the missing wiring is APPROVE→PATCH→COMMIT→(auto)ROLLBACK for code changes, and EVALUATE for
   proposals (only code-gates and replay-invariants exist, nothing evaluates a recommendation).
4. **External loop (workspace-level, not repo)**: Meta AI tandem (~/workspace/tandem) is a real
   observe→research→propose loop for outreach, human-gated (Nolan), durable (files), but it
   improves the OUTREACH pipeline, not PING itself. Out of repo scope; noted for completeness.
5. **Most dangerous existing mechanism**: ExecutionEngine.startAutonomousLoop synthesizes worker
   findings with hardcoded confidence 0.85 (engine.js ~579-620). Reachable via authenticated
   POST /orchestration/engine/loop. If credentials leak or auth is misconfigured, it fabricates
   evidence into the consensus path. Recommend: gate behind explicit human approval or remove route.
