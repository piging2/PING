# TASK 5 — Ranked improvement candidates

Scored on: leverage (L), risk (R), new code (N), reversibility (Rev),
determinism (D), persistence (P), replay (Rp), human authority (H), cloud exec (C).

## P0 — safety, before anything else
**S1. Gate or remove ExecutionEngine.startAutonomousLoop's fabrication path.** COMPLETION.
- POST /orchestration/engine/loop (auth-gated) can trigger synthetic findings with
  hardcoded confidence 0.85 into ConsensusEngine.evaluate (engine.js:579-620).
- Options: (a) require explicit human approval per loop run + label findings
  'synthetic'; (b) delete the route. L: prevents evidence poisoning. R: trivial.
  N: ~20 lines. Rev: yes. H: UP (this is the one place the system can lie to itself).

## Ranked (leverage-to-risk)
**1. C1 → wire ReplayWorker to getCorrelationGroup.** CONNECTION.
- L: HIGH — makes "replay" actually verify causal chains; the current claim is
  single-event. R: LOW (read-only PG query, fallback to single-event).
  N: ~15 lines. Rev: yes. D: UP (replays real history). P/Rp: unchanged schema,
  stronger proofs. H: unaffected. C: safe.

**2. C3 → expose /approvals routes for BusinessActionAuthority + EffectAuthority.** CONNECTION.
- L: MEDIUM-HIGH — the APPROVE stage exists, tested, durable; it is simply unreachable.
  R: LOW-MEDIUM (auth-gated routes, no auto-approve). N: ~100 lines.
  Rev: yes. H: UP (creates the human gate). D/P/Rp: neutral-positive (decisions become
  durable events). C: safe.

**3. C4 → ContinuousAcquisition emits GITHUB_COMMIT_SYNCED to live event runtime.** CONNECTION.
- L: MEDIUM-HIGH — gives the pipeline a real repo OBSERVE source; the downstream
  mission type already exists in the bridge. R: MEDIUM — autonomous ingestion needs a
  repo allowlist + human consent to track a repo. N: ~50 lines wiring.
  Rev: yes (stop tracking). D: neutral. P: new events in PG (fine). H: needs per-repo
  consent. C: safe.

**4. Delete ping-runtime/agents/* duplicates (replay_worker, base_worker,
   distributed_desktop_agents, worker_port).** CONVERGENCE.
- L: MEDIUM — removes a confusing parallel worker architecture; zero references proven.
  R: LOW. N: 0 (deletion; archive per SOUL 7, don't just delete — they're referenced by
  nothing but keep a tarball). Rev: via git. All impacts: neutral.

**5. C2 → real producer for SNIPPET_APPROVED / AI_RESPONSE_ACCEPTED.** CONNECTION.
- L: MEDIUM — activates the LEARN stage (KnowledgePromoter live, 0 processed).
  R: LOW. N: small (emit from the AI chat accept/reject path or a snippet review API).
  Rev: yes. H: UP (human signal drives learning). D: neutral. P: durable KG updates.

**6. Salvage-and-retire the ExecutionEngine universe.** CONVERGENCE.
- Extract: MergeGate (code gates), DormantClassifier output, ConsensusEngine.evaluate
  design, IntelligenceGraph builder. Retire: EventQueue, Scheduler, WorkerStateMachine,
  ArtifactStore, MissionCompiler, execution/ollama_provider (all duplicate live systems).
- L: MEDIUM-HIGH — kills the parallel universe, keeps the valuable tools.
  R: MEDIUM — boot change (gateway_runtime.js:339) + /orchestration routes depend on it.
  Safer variant: keep engine file, stop instantiating at boot, keep routes 404-clean.
  Rev: medium (re-instantiate). C: fewer moving parts in cloud.

**7. Complete the self-improvement loop (the big one).** COMPLETION.
- OBSERVE (C4: acquisition→events) → REASON (canonical workers, live) → PROPOSE
  (RecommendationWorker, live) → EVALUATE (MergeGate for code changes; nothing yet for
  non-code proposals) → APPROVE (C3: BusinessActionAuthority routes) → EXECUTE
  (PatchAuthority.applyPatch in a worker) → VERIFY (ReplayWorker→kernel→WitnessWorker,
  live) → LEARN (C2/C5: KnowledgePromoter).
- Missing new pieces: a code-change mission type, the commit step (git, human-gated),
  non-code proposal evaluation. L: HIGHEST — this is the actual self-improvement
  pipeline. R: HIGHEST — autonomous code changes. N: moderate (mostly wiring existing
  pieces). Rev: high IF human-gated at APPROVE and COMMIT. D: verify-via-replay before
  commit. H: MUST keep human gates on approve+commit (Nolan's standing rule: autonomous
  only for reversible/low-risk). C: needs sandboxed execution.
- Do NOT build this on self_improvement_loop.js as-is (broken + over-claims); harvest
  its stage ordering, rewrite the body.

**8. Archive legacy gateway witness/replay files.** CONVERGENCE.
- witness_recorder/registry, replay_verifier, etc. Unreachable from boot (proven).
  L: LOW-MEDIUM (hygiene). R: LOW. Archive as a set (some reference each other).

**9. Converge TechnologyAuthority ↔ AIRuntime provider registry.** CONVERGENCE.
- L: LOW-MEDIUM — approved-versions + compatibility matrix is genuinely richer than the
  flat provider Map. R: LOW-MEDIUM. N: small adapter. Rev: yes.

**10. General decision artifact on the live path.** NEW CONSTRUCTION.
- Live pipeline has proposals (RECOMMENDATION_CREATED) but no proposal→decision record;
  MergeDecisionArtifact exists only in the quiescent engine — salvage its design.
  L: MEDIUM (needed for multi-party or machine decisions beyond single-human approval).
  R: MEDIUM. N: ~200 lines + event types. Rev: yes.

**11. Git commit/push automation with human gate.** NEW CONSTRUCTION.
- Nothing exists (MergeGate.can_commit is a boolean, not a committer).
  L: MEDIUM. R: HIGH (irreversible external mutation). Requires: sandboxed apply,
  human approval, signed commits, replay-before-commit. Keep last.

## Explicitly NOT recommended
- Enabling gateway/self_improvement_loop.js as-is: broken (_analyzeRepository undefined),
  header over-claims, reaches into another service's _postgres, no approval gates.
- Enabling ExecutionEngine.startAutonomousLoop: fabricates evidence (S1).
- Treating 63/63 verified replays as chain-proof: single-event replays only (fixed by #1).
- Deleting IntelligenceWorker: dormant by design with documented re-enablement conditions.
- New event/persistence systems: continuity guardrail (2026-09-13) — instrument and
  correlate the existing PG event store instead.
