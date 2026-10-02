# Lane B — Experimental branches: calm-garden et al. (2026-09-22)

## Status

- calm-garden / eager-moon / kind-comet / curious-squid are NOT worktrees. They are remote
  branches: `origin/opencode/calm-garden`, `origin/opencode/eager-moon`,
  `origin/opencode/kind-comet`, `origin/opencode/curious-squid` (+ windows-preserve copies).
- ALL FOUR point to the SAME commit: `aaec592bd` (2026-07-05, "feat(kernel): freeze
  constitutional replay kernel") — i.e. one frozen snapshot with four names.
- It is the "constitutional replay kernel" milestone series (Milestones 10–13:
  Pipeline Witness, Repository Reset, Multi-Repository, Temporal Authority).
- Related to `main` (merge-base adcb062de, 2026-05-10). The primary branch
  `refactor/runtime-authority-convergence` has rewritten history (no merge-base) — 265 commits
  from a fresh root, so the convergence work re-imported the tree.

## Concept-by-concept verification (against the task's historical list)

| Concept | In calm-garden? | Form | In primary today? | Classification |
|---|---|---|---|---|
| ExecutionEngine | yes | orchestration/execution/engine.js | yes, ping-runtime/orchestration/execution/engine.js (716 lines, LIVE via gateway_runtime.js:339) | SUPERSEDED (ancestor) |
| ProposalArtifact | yes | orchestration/execution/artifact_authorities.js | yes, same file evolved | SUPERSEDED (ancestor) |
| ConsensusArtifact | yes | (same) | yes | SUPERSEDED (ancestor) |
| MergeDecisionArtifact | yes | (same) | yes | SUPERSEDED (ancestor) |
| ReplayArtifact | yes | (same) | yes | SUPERSEDED (ancestor) |
| WitnessArtifact | yes | (same) | yes | SUPERSEDED (ancestor) |
| ArtifactAuthority | yes | gateway/artifact_authority.js + orchestration/execution/artifact_authorities.js | yes (both, still duplicated — see D3) | SUPERSEDED (ancestor) |
| ArtifactStore | yes | orchestration/execution/artifact_store.js | yes, live via engine | SUPERSEDED (ancestor) |
| EventQueue | yes | orchestration/execution/event_queue.js | yes, live via engine | SUPERSEDED (ancestor) |
| WorkerRegistry | yes | gateway/worker_registry.js + orchestration/worker_registry.js + runtime/kernel/workers/worker-registry.ts | yes — all three STILL present (see D2) | SUPERSEDED (ancestor); the triple is inherited, not new |
| ConsensusEngine | yes | orchestration/execution/consensus_engine.js | yes, live via engine | SUPERSEDED (ancestor) |
| MergeGate | yes | orchestration/merge_gate.js | yes, live via engine | SUPERSEDED (ancestor) |
| IntelligenceGraph | yes | orchestration/intelligence_graph.js | yes (505 lines), live via engine | SUPERSEDED (ancestor) |
| ContextAuthority | yes | orchestration/execution/context_authority.js | yes, live via engine | SUPERSEDED (ancestor) |
| capability_registry | yes | orchestration/execution/capability_registry.js | yes, live via engine | SUPERSEDED (ancestor) |
| MissionRuntime | NO | — | yes (added later) | n/a — newer than calm-garden |
| EventToMissionBridge | NO | — | yes (added later) | n/a — newer than calm-garden |
| IdentityAuthority | yes | gateway/identity_authority.js (+others) | yes — converged via PATCH_004 shim to kernel | SUPERSEDED (ancestor) |
| Temporal Authority | yes | gateway/temporal_authority.js, temporal_runtime.js, temporal_scheduler_provider.js, temporal_workflows.js | NO temporal_authority.js; capability re-expressed as ping-runtime/temporal/ (activities + workflows) | EVOLVED — check for lost behavior before reinventing |

## Verdict

calm-garden is a **dead experiment as a branch, superseded as content**: every concept in the
task's historical list survives in the current primary tree in evolved (and now live-wired)
form. It is the ANCESTOR of ping-runtime/orchestration/*, not a parallel implementation with
unique ideas — with two exceptions worth checking: the old `gateway/temporal_authority.js`
(which was re-expressed, not carried over) and two calm-garden files absent from primary with
no clear successor: `gateway/mcp_registry.js` and `gateway/capability_scheduler.js`.
Nothing in calm-garden qualifies as ORPHANED-BUT-VALUABLE beyond those two check-items;
do not mine it for architecture — the primary tree already absorbed it.
