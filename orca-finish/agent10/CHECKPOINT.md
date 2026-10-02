# Agent 10 — Self-Improvement Loop Audit — CHECKPOINT.md

Task: Audit ORCA / SELF-IMPROVEMENT loop. Stage by stage verdict (REAL+REACHABLE / REAL+DORMANT / PARTIAL / PROPOSED / PHANTOM). Trace Observation → Evidence → Event → Knowledge → Playbook → Automation → Institutional Memory. Find every point where self-improvement stops.

Stages: observation → claim → classification → recommendation → proposal → execution → verification → witness → lineage → promotion → learning → playbooks → institutional memory.

## Plan
1. [x] Set up ~/workspace/orca-finish/agent10/ + this checkpoint
2. [ ] Read C1 inventory: ~/workspace/orca-finish/wave1/orca-arch/ORCA-INVENTORY.md
3. [ ] Read local evidence: ~/workspace/FAILURE_LEDGER.md, ~/workspace/ping-autonomy-challenge/, ~/workspace/crx-autonomous-missions/
4. [ ] Pig repo (refactor/runtime-authority-convergence, READ-ONLY via pigwsl-run.sh): MissionRuntime stats, ping_events, measurements, policy classifiers, WitnessWorker, LineageWorker, replay, promotion/merge machinery
5. [ ] A5 worktree /home/nolan/worktrees/orca-autonomy @ ae55b77ff: orca/control-loop/ (assessAndFollowUp, policy/, measurements/), evidence dirs
6. [ ] Playbook layer: ~/workspace/AGENTS.md; institutional memory: ~/memory/ + MEMORY.md
7. [ ] Verdict table per stage + handoff trace + ranked break list
8. [ ] Write SELF-IMPROVEMENT-AUDIT.md
9. [ ] Final report to parent

Started: 2026-09-23 ~20:00 MDT. All exploration is read-only. No commits, no repo writes.

## 2026-09-23 ~21:05 MDT — progress
- C1 inventory read. Pig main @ cc6856c3 (refactor/runtime-authority-convergence) inspected read-only.
- Live DB (ping-postgres/crx_runtime): full canonical chain fired 18x in one 5-min burst on 2026-09-16 (OBSERVATION_CREATED->CLAIM_CREATED->CLASSIFICATION_CREATED->RECOMMENDATION_CREATED->PROJECTION_CREATED->REPLAY_COMPLETED->WITNESS_CREATED->LINEAGE_CREATED, 18 each; MISSION_* 144 each). Nothing since; gateway up 33h.
- Workers: gateway_runtime.js:509-514 registers canonical workers live; IntelligenceWorker dormant (empty eventTypes); KnowledgePromoter registered but 0 approval events ever (SNIPPET_APPROVED etc. = 0 rows) = REAL+DORMANT.
- Classification/Recommendation workers are STATIC lookup tables (no learning). ClaimWorker is an identity transform. PROJECTION writes Qdrant + emits PROJECTION_CREATED. LINEAGE_CREATED is terminal per EVENT_MISSION_MAP.
- scripts/learning_loop.py: real code, synthetic hardcoded inputs (queue, scores, metrics, reflections), GitHub workflow runs it daily but has no commit-back step; knowledge/ dir doesn't exist on branch. Learning from live experience = none.
- MEM-A MEMORY-PROOFS.md read (session a5330d77, 2026-09-23 20:04-21:00 MDT): institutional-memory loop proof. WRITE/STORE/RETRIEVE/RANK/INJECT/USE proven at store layer; VERIFY VALUE proven with teeth (+20 vs +12 defect caught); SUPERSEDE declaration-only; FORGET-at-index BROKEN (deleted entries still returned, no staleness); index ingestion stalled (<=3min once, >=39min stall); store gateless (7/10 attacks ABSORBED: stale/contradictory/wrong-tenant/wrong-mission/wrong-version/untrusted-source/missing-provenance); production memory shows 4 contradictory "current" Facebook engagement settings unmarked. H-1..H-12 harvested as evidence for verification/execution/witness gaps.
- Remaining: MissionRuntime stats check, one OBSERVATION payload sample, then write SELF-IMPROVEMENT-AUDIT.md.

## 2026-09-23 ~21:20 MDT — COMPLETE
- Wrote SELF-IMPROVEMENT-AUDIT.md (13 stage verdicts + loop-closure trace + 3 ranked breaks + evidence appendix).
- Headline: loop does NOT close. 6 breaks (B1..B5 + ORCA dormancy).
- Verdicts: observation REAL+REACHABLE; claim REAL+REACHABLE (identity transform); classification REAL+REACHABLE (static tables); recommendation REAL+REACHABLE (static strings, terminal-as-action); proposal PROPOSED; execution PARTIAL; verification PARTIAL; witness REAL+REACHABLE; lineage REAL+REACHABLE (explicitly terminal); promotion REAL+DORMANT (0 firings); learning PARTIAL (synthetic inputs); playbooks PARTIAL (agent-convention real, machine path phantom); institutional memory PARTIAL (MEM-A: store layer closes; forget-at-index BROKEN; supersede declaration-only; gateless; index stalled).
- Top 3: B1 recommendations never execute; B2+B3 lineage terminal + learning consumes no live data; B5 memory can't forget/version.
- 16 packets. Read-only throughout; no commits, no repo writes.
