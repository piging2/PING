# SELF-IMPROVEMENT LOOP AUDIT — ORCA / PING

Agent 10, ORCA FINISH. 2026-09-23 ~21:15 MDT. Read-only everywhere; no commits, no repo writes.

Scope: the full loop observation → claim → classification → recommendation →
proposal → execution → verification → witness → lineage → promotion → learning →
playbooks → institutional memory, across three substrates:
(a) Pig main `refactor/runtime-authority-convergence` @ `cc6856c3` (live gateway),
(b) ORCA branch `feature/orca-autonomy` @ `ae55b77ff` (dormant control loop),
(c) sandbox agent convention (`~/workspace/AGENTS.md`, `FAILURE_LEDGER.md`, `~/memory/`, `MEMORY.md`).

## Headline

**The loop does NOT close.** The PING-side canonical worker chain
observation → claim → classification → recommendation → projection/replay →
witness → lineage is REAL and was exercised (18 full chains in the live DB), but
it is a **commentary pipeline, not an improvement pipeline**: classification and
recommendation are static lookup tables, recommendations are projected to Qdrant
rather than executed, LINEAGE_CREATED is explicitly terminal, no learning stage
consumes live operational data, and nothing writes back to behavior. The ORCA-side
loop (observe → assess → work-order → verify → record) is REAL+DORMANT since
2026-09-18. Institutional memory (MEM-A, proven 2026-09-23) closes at the store
layer but has BROKEN invalidation (FORGET-at-index) and declaration-only
versioning. Net: self-improvement stops at **six** distinct breaks; the highest
leverage is that recommendations never execute.

## Per-stage verdicts

| # | Stage | Verdict | Implements (file/symbol/SHA) | Caller | Evidence produced | Output goes to | Handoff to next stage |
|---|---|---|---|---|---|---|---|
| 1 | observation | REAL+REACHABLE | `ping-runtime/workers/canonical_workers.js` `ObservationWorker` (cc6856c3); registered live `gateway/bootstrap/gateway_runtime.js:514` | MissionScheduler → WorkerRuntime.dispatch (dispatch-only mode); EventToMissionBridge maps business events → missions | `OBSERVATION_CREATED` rows in `ping_events` (18, live DB) | `ping_events`; downstream mission `CLAIM_GENERATE` | YES — bridge maps `OBSERVATION_CREATED` → `CLAIM_GENERATE` mission → ClaimWorker |
| 2 | claim | REAL+REACHABLE | `ClaimWorker` (canonical_workers.js:128) | ClaimWorker via `CLAIM_GENERATE` mission | `CLAIM_CREATED` (18 rows). NOTE: identity transform — claim = {documentId, eventType, timestamp}; no actual claim generation | `ping_events` | YES — bridge maps `CLAIM_CREATED` → `CLASSIFICATION_CREATE` mission |
| 3 | classification | REAL+REACHABLE | `ClassificationWorker` (canonical_workers.js:549); `recovery_decisions.js` + `orca_policy.js` on the ORCA branch (dormant) | `CLASSIFICATION_CREATE` mission | `CLASSIFICATION_CREATED` (18 rows). NOTE: hardcoded `_categorize`/`_prioritize` tables (10 event types); nothing updates them | `ping_events` | YES — bridge maps `CLASSIFICATION_CREATED` → `RECOMMENDATION_CREATE` mission |
| 4 | recommendation | REAL+REACHABLE | `RecommendationWorker` (canonical_workers.js:614); ORCA side: `assessAndFollowUp` (`orca_control_loop.js:924`) + `recovery_decisions.js` (dormant) | `RECOMMENDATION_CREATE` mission | `RECOMMENDATION_CREATED` (18 rows). NOTE: static action strings ("Review and take action"); nothing executes the recommended action | `ping_events`; then bridge maps to `PROJECTION_CREATE` mission (Qdrant projection, not action) | **NO — BREAK B1.** Bridge maps `RECOMMENDATION_CREATED` → `PROJECTION_CREATE`: the recommendation becomes a vector, never an action. No consumer executes recommendation.action |
| 5 | proposal | PROPOSED | `scripts/policy_proposals.py:propose_policy` (writes `knowledge/policy_proposals/<mission>.json`, `status: proposed`, `mutates_policy: False`); CRX `combinations` (9 COMBO-* records, 2026-09-23) | `scripts/learning_loop.py` imports it; no live-path callers (`git grep` shows no production caller). CRX combos queued as "first-mission shortlist", not executed | Proposal JSON files (dir does not exist on branch; CI outputs evaporate) | Ephemeral CI filesystem / sandbox jsonl | **NO — BREAK.** No automated proposal → execution path. CRX combos are today's research output awaiting future missions |
| 6 | execution | PARTIAL | `MissionScheduler` → `WorkerRuntime.dispatch` (worker_runtime.js:69); `EventToMissionBridge` EVENT_MISSION_MAP; ORCA `external_agent_adapter.issueWorkOrder` + `hermes_dispatch.py` (dormant) | Bridge (event→mission); scheduler (mission→worker) | `MISSION_*` rows (144 each type, one 09-16 burst); `WORKER_COMPLETED` (1, seeded) | `ping_missions`, `ping_events` | PARTIAL — missions execute pipeline stages, but recommended actions do not execute; MEM-A H-4: `startAutonomousLoop` (engine.js:579-648 @ cc6856c3) fabricates worker findings inline (confidence 0.85 hardcoded), reachable via POST /orchestration/engine/loop; MEM-A H-5: bridge has no cursor/catch-up (orphaned events); H-6: no timeout on worker.handle() |
| 7 | verification | PARTIAL | `ReplayWorker` (canonical_workers.js:226) + `KernelReplayExecutionProvider` (injected live); ORCA `verifyResultEnvelope` (dormant) | `REPLAY_VERIFY` mission (from `PROJECTION_CREATED`) | `REPLAY_COMPLETED` (18 rows, verified:true iff kernel ok + 0 violations) | `ping_events` → `WITNESS_CREATE` mission | YES — bridge maps `REPLAY_COMPLETED` → `WITNESS_CREATE`. BUT MEM-A H-1: seeded `WORKER_COMPLETED` bypasses `recordVerifiedResult` (measurements can't distinguish seed from real); H-2: cross-attempt envelope replay verifies VALID (no attempt binding) |
| 8 | witness | REAL+REACHABLE | JS `WitnessWorker` (canonical_workers.js:451): deterministic sha256(aggregate_id:replay_fingerprint) → `WITNESS_CREATED` (18 rows) | `WITNESS_CREATE` mission (from `REPLAY_COMPLETED`) | `WITNESS_CREATED` rows; `authority_witness` table | `ping_events` | YES — bridge maps `WITNESS_CREATED` → `LINEAGE_CREATE` mission. (Python `witness_worker.py`/`lineage_worker.py` at repo root are legacy skeletons: query an `events` table that doesn't match the live schema; imported only by `constitutional_runtime.py`, not on the live gateway path) |
| 9 | lineage | REAL+REACHABLE | JS `LineageWorker` (canonical_workers.js:513) → `LINEAGE_CREATED` (18 rows) | `LINEAGE_CREATE` mission | `LINEAGE_CREATED` rows with causation chain | `ping_events` (terminal) | **NO — BREAK B2.** `event_to_mission_bridge.js`: "LINEAGE_CREATED is terminal — chain complete. No further missions created." Nothing consumes lineage for learning. ProjectionWorker also re-projects it to Qdrant (storage, not learning) |
| 10 | promotion | REAL+DORMANT | `ping-runtime/knowledge/knowledge_promoter.js` (`KnowledgePromoter`); registered live only when `options.knowledgeGraph` present — gateway passes it (gateway_runtime.js:520) | SNIPPET_APPROVED / SNIPPET_REJECTED / AI_RESPONSE_ACCEPTED / AI_RESPONSE_REJECTED events | None ever: live DB count = 0 for all four trigger event types | Knowledge graph node lifecycle fields (never written) | **NO.** Zero firings in production. Also human-approval-gated by design — not a machine self-improvement path |
| 11 | learning | PARTIAL | `scripts/learning_loop.py` (`ConstitutionalLearningLoop`); `.github/workflows/constitutional-learning-loop.yml`; `orca/measurements/` on dormant branch (read-only honesty-contract metrics) | GitHub Actions (schedule 03:00 UTC + push + dispatch); nothing on the live gateway | Learning-cycle JSON to stdout; `knowledge/policy_proposals/*.json` (ephemeral) | Nowhere durable: workflow has no commit-back step, no artifact upload; `knowledge/` dir absent from branch | **NO — BREAK B3.** `run_learning_cycle()` uses hardcoded inputs (queue, scores, `failure_rate: 0.02`, ROI 100/20, 3 hardcoded reflections). It never reads `ping_events` or any live state. Measurements exist but the ORCA loop that would feed them is dormant |
| 12 | playbooks | PARTIAL | `~/AGENTS.md` + `~/workspace/AGENTS.md` (operating lessons); `~/workspace/ping-autonomy-challenge/` (failure library); `worktrees/playbook/` on Pig (untracked doc collection) | Agents (manual reads/writes every turn) | Dated lesson entries (e.g. "Pig file transfer: scp beats pigwsl-put.sh (2026-09-23)") | Agent context (injected); sandbox files | **MACHINE PATH: NO — BREAK B4.** No code writes to AGENTS.md. Lane learnings reach it only by manual agent action. As agent convention the playbook layer is REAL+REACHABLE (read daily, written on evidence); as a machine stage of the loop it is PHANTOM |
| 13 | institutional memory | PARTIAL | `~/MEMORY.md` + `~/memory/*.md` + `muse.memory_search`/`muse.memory_get` (MEM-A proven 2026-09-23, session a5330d77, `~/workspace/orca-finish/program/mem-a/MEMORY-PROOFS.md`) | Agents (manual daily-note writes; memory tools) | Daily logs; memory_search index | Agent context via memory_get | PARTIAL — **BREAK B5.** MEM-A: WRITE/STORE/RETRIEVE/RANK/INJECT/USE proven at store layer; VERIFY VALUE proven with teeth (caught +20 vs +12 line-count defect). BUT: SUPERSEDE is declaration-only (no version enforcement); FORGET-at-index is BROKEN (deleted entries still returned by memory_search, no staleness marking); index ingestion stalled (≤3 min once, then ≥39 min with nothing indexed); store is gateless (7/10 attacks ABSORBED — stale, contradictory, wrong-tenant, wrong-mission, wrong-version, untrusted-source, missing-provenance). Production memory already holds 4 mutually contradictory "current" Facebook engagement settings (50+15 on 09-14, 20+0 on 09-23 13:52, 75+20 sprint, Stage 0 5+0) with nothing marking the active one. No automated path from PING knowledge graph → MEMORY.md |

## Loop-closure trace (the full chain, breaks marked)

```
observation ──YES──▶ claim ──YES──▶ classification ──YES──▶ recommendation
     (18 rows)         (18 rows)        (static tables)        (static strings)
                                                                  │
                                                        ✗ B1 BREAK: recommendation → PROJECTION_CREATE
                                                        (becomes a vector, never an action; no proposal/
                                                        execution consumer of recommendation.action)
                                                                  │
                                              (parallel: business events → missions directly,
                                               bypassing classification/recommendation entirely)
                                                                  ▼
proposal ──✗──▶ execution ──PARTIAL──▶ verification ──YES──▶ witness ──YES──▶ lineage
(PROPOSED;        (missions run;        (kernel replay;      (18 rows)      (18 rows)
 no live          recommendations       H-1/H-2 gaps)
 callers)         never execute;
                  H-4 fabrication;
                  H-5/H-6 gaps)
                                                                          │
                                                                ✗ B2 BREAK: LINEAGE_CREATED is terminal
                                                                by design; no consumer learns from
                                                                completed chains
                                                                          ▼
                                                               promotion ──✗──▶ learning ──✗──▶ playbooks ──manual──▶ institutional memory
                                                               (REAL+DORMANT;   (synthetic inputs;   (no machine path;     (PARTIAL: store layer
                                                                0 firings)       no live data)        agent-only)           closes; forget-at-index
                                                                                                                    BROKEN; supersede
                                                                                                                    declaration-only;
                                                                                                                    gateless; index stalled)
```

ORCA-side loop (branch `feature/orca-autonomy` @ `ae55b77ff`): observe → plan →
authorize → delegate (work orders) → verify → record → assessAndFollowUp → close.
Status REAL+DORMANT — last witnessed run 2026-09-18, no scheduler/cron/service
(A7 continuous operation never built). Its own learning/playbook/promotion stages
do not exist: runs close with `99-close.json`; findings never feed PING policy,
classifiers, or AGENTS.md automatically. MEM-A H-3: the A6 advisory-lock fix is
incomplete in the split-brain dimension (no re-validation, no fencing epoch).

## Ranked breaks to fix (highest leverage first)

1. **B1 — Recommendations never execute (the commentary-pipeline break).**
   The entire observe→recommend chain is live and healthy, yet its product is
   decorative: `RECOMMENDATION_CREATED` → `PROJECTION_CREATE` means every
   recommendation becomes a Qdrant vector and dies. Worse, `EventToMissionBridge`
   maps business events to missions *directly*, so classification/recommendation
   outputs are not even in the decision path — they are parallel commentary.
   Fix: make at least one mission conditional on recommendation output (e.g.
   gate `ESTIMATE_FOLLOWUP` / `REVIEW_RESPONSE` on recommendation.priority), so
   the pipeline's output causally changes behavior. Without this, every other
   fix improves a pipeline whose output nobody reads.

2. **B2+B3 — Lineage is terminal; learning consumes no live data (the
   evidence-to-knowledge break).** `LINEAGE_CREATED` explicitly ends the chain,
   and `learning_loop.py` "learns" from hardcoded constants. Together these two
   breaks delete the whole Evidence → Knowledge half of the loop.
   Fix: (a) a LearningWorker subscribed to `LINEAGE_CREATED` that aggregates
   chain outcomes (e.g. verified:false replays, failed missions) and emits
   `LEARNING_SUMMARY` events; (b) point `learning_loop.py` / `mine_patterns` /
   `record_metric_event` at those events and at `ping_events` instead of
   literals. This is the cheapest true loop-closure: the data already exists.

3. **B5 — Institutional memory cannot forget or version (the retraction
   break).** A self-improvement loop that cannot retract knowledge cannot
   improve: FORGET-at-index is BROKEN (deleted entries still retrievable, no
   staleness marking), SUPERSEDE is declaration-only, the store is gateless
   (7/10 MEM-A attacks absorbed), the index stalls unpredictably, and production
   memory already carries 4 contradictory "current" Facebook settings with no
   active-marker. Fix: tombstone/staleness marking honored by `memory_search`;
   retrieval-time version filtering (superseded versions excluded unless asked);
   a schema/validation gate at STORE. Until invalidation works, every "learning"
   written to memory is append-only noise.

Honorable mentions (real, lower leverage than the three above):
- B4: no machine path learning → AGENTS.md (agent-manual today; acceptable while
  B1–B3 are open, since there is nothing worth auto-promoting yet).
- ORCA dormancy: A7 (continuous operation) was never built; the ORCA loop is the
  only component with real follow-up semantics (`assessAndFollowUp`,
  retry/escalate), and it hasn't run since 09-18.
- H-1/H-2 (MEM-A): seeded `WORKER_COMPLETED` bypasses verification and
  cross-attempt envelope replay verifies VALID — verification-stage integrity
  fixes, cheap and worth doing alongside B2.
- H-4: `startAutonomousLoop` fabricates worker findings inline (confidence 0.85
  hardcoded, engine.js:579-648 @ cc6856c3, reachable via POST
  /orchestration/engine/loop) — either delete or hard-gate; it poisons any
  measurement downstream.

## Evidence appendix

- Live DB (`ping-postgres` / `crx_runtime`, queried 2026-09-23 ~20:30 MDT):
  18 each of OBSERVATION_CREATED, CLAIM_CREATED, CLASSIFICATION_CREATED,
  RECOMMENDATION_CREATED, PROJECTION_CREATED, REPLAY_COMPLETED, WITNESS_CREATED,
  LINEAGE_CREATED — all within 2026-09-16 17:49:59–17:54:19 UTC (one 5-minute
  burst; seeded LEAD_CREATED-class events, confidence 0.5; nothing since, gateway
  up 33h). MISSION_CREATED/ASSIGNED/STARTED/COMPLETED 144 each (18 chains × 8
  missions). SNIPPET_APPROVED/REJECTED, AI_RESPONSE_ACCEPTED/REJECTED,
  REPLAY_VERIFY, WITNESS_CREATE, LINEAGE_CREATE, CLAIM_GENERATE,
  CLASSIFICATION_CREATE, RECOMMENDATION_CREATE, DOCUMENT_IMPORT: 0 rows as
  stored event types (the *_CREATE mission types exist only as mission_type).
  WORKER_COMPLETED: 1 (seed).
- SHAs: Pig main `cc6856c3bc78e0535e66f168c66dc31abee2c073`
  (`refactor/runtime-authority-convergence`); ORCA branch `ae55b77ff82a893d50c48ab299117b2f705a0f03`
  (`feature/orca-autonomy`, worktree `/home/nolan/worktrees/orca-autonomy`, clean).
- Key files: `ping-runtime/workers/canonical_workers.js` (760 lines; 8 workers +
  dormant IntelligenceWorker), `gateway/bootstrap/gateway_runtime.js:509-524`
  (registration), `ping-runtime/orchestration/event_to_mission_bridge.js`
  (EVENT_MISSION_MAP; LINEAGE_CREATED terminal), `ping-runtime/workers/worker_runtime.js`
  (dispatch-only), `ping-runtime/knowledge/knowledge_promoter.js`,
  `scripts/learning_loop.py`, `scripts/policy_proposals.py`,
  `.github/workflows/constitutional-learning-loop.yml` (no commit-back),
  `orca/control-loop/orca_control_loop.js:924` (`assessAndFollowUp`, dormant branch).
- MEM-A: `~/workspace/orca-finish/program/mem-a/MEMORY-PROOFS.md` (session
  a5330d77, 2026-09-23 20:04–21:00 MDT): loop proof + 10-attack suite + H-1..H-12
  harvested entries (used above as H-1/H-2/H-3/H-4/H-5/H-6 evidence).
- C1 inventory: `~/workspace/orca-finish/wave1/orca-arch/ORCA-INVENTORY.md`
  (ORCA branch anatomy; pre-A5 ExecutionEngine facade verdict).
- Packet count: 13 stage-verdict packets + 1 loop-closure trace + 1 ranked-break
  list + this evidence appendix = 16 packets in this deliverable.

## Method note

Read-only throughout: `pigwsl-run.sh` git reads + `docker exec ping-postgres`
SELECTs on Pig; file reads in sandbox. No commits, no repo writes, no live
browser actions. Verdicts follow the task's scale strictly: a stage is
REAL+REACHABLE only if its output reaches the next stage's input with evidence
(live DB rows or observed wiring), not merely because code exists.
