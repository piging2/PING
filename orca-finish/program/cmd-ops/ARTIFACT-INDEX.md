# ARTIFACT INDEX — ORCA FINISH CMD-OPS

**Lane:** CMD-OPS. **Date:** 2026-09-23 MDT (night shift).
**Scope:** every file under `~/workspace/orca-finish/` as of 2026-09-23 ~21:45 MDT. 175 files (was 101 @20:55 MDT; +74 net: critics' final deliverables, gauntlet results, chaos-a fixtures + CHAOS-RESULTS.md, orca-b probes + VERDICTS.md, impl-safety stage-out HS specs, critic-performance scratch copies). Tree is growing rapidly; counts below are frozen at this timestamp.
**Evidence grades:** STATIC (source/document read) / TEST (executed test or PoC) / LIVE (witnessed live DB/runtime/browser behavior). TEST-BEH (behavioral re-proof on a scratch harness, not the source modules).
**Status legend:** FINAL (deliverable complete) / PLAN (plan only, no findings) / IN-PROGRESS (findings landing) / SUPPORT (source/test/polling aid) / SNAPSHOT (render capture) / STATUS (status-only update).

## Counts (2026-09-23 21:45 MDT)
- Deliverables (FINAL): 35 (added: orca-b VERDICTS.md, critic-security/security-critique, critic-semantic/semantic-audit, critic-product/product-critique, critic-visual/visual-critique, mem-b/memory-harvest, gauntlet/gauntlet-results, chaos-a/chaos-results, impl-safety-finish/safety-layer)
- Checkpoints/status (PLAN/IN-PROGRESS/STATUS): 27 (PLAN 1, IN-PROGRESS 22, STATUS 4). Added: critic-product, critic-visual, critic-semantic, critic-performance, mem-b; orca-b now IN-PROGRESS
- Support/source/test/PoC (SUPPORT): 80 (added: chaos-a fixtures + FOLLOWON-QUEUE + durable-intent probe + IMPL-LANE-NOTE, orca-b probes + vendored copies, gauntlet results JSONs, impl-safety-finish HS specs, agent19 wedge-test, critic-performance scratch group row)
- Render snapshots: 2 | Polling/metadata: 2 | Test evidence rows: 1
- Runtime artifacts (not indexed as deliverables): 18 (chaos.db, coord.lock, WAL/SHM, __pycache__ .pyc files)
- Indexed rows: 146 of 175 files; remainder is runtime-only plus files landing between the freeze and this write
- **Total files on disk: 175**

---

## Program records

| Path | Lane | Status | Key claims | Evidence |
|---|---|---|---|---|
| `WAVE-LEDGER.md` | program | STATUS | Master budget (189/5000 packets @01:58); results C1/C2/C4/C6/C7, IMPL-STATE + MISSIONS results, CORRECTION+PIVOT, redteam plan, Agent 10/19 briefs. 02:40 UTC update: C5 PHANTOM-HUNT complete (wave 1 ALL COMPLETE), CMD-OPS incident+resume entry. orca-a, critic-security, mem-a still unregistered | STATIC |
| `program/cmd-ops/CHECKPOINT.md` | cmd-ops | IN-PROGRESS | This lane's plan + sweep log | STATIC |
| `program/cmd-ops/FAILURE-CLUSTERS.md` | cmd-ops | FINAL | 12 generic classes, 14 local accidents, 8 ledger-mined classes | STATIC |
| `program/cmd-ops/REGRESSION-LOG.md` | cmd-ops | FINAL | 16 flips, verdict table, Agent 19 cross-check, watch list W1-W12 | STATIC |
| `program/cmd-ops/ARTIFACT-INDEX.md` | cmd-ops | FINAL | This file | STATIC |
| `program/chaos-a/CHECKPOINT.md` | chaos-a | IN-PROGRESS | New program lane (started 20:04 MDT): kill matrix + idempotency on THIS host (hatch); A5 worktree sources absent, so BEHAVIORAL RE-PROOF on own SQLite harness. Isolation PROVEN 20:14 (banned-token scan, socket-blocked smoke, strace audit) | STATIC+TEST-BEH |
| `program/chaos-a/evidence/probe-records.jsonl` | chaos-a | SUPPORT | 4 probe records (shared format): records 0-2 SURVIVED (kill-at-dispatch A6 re-proof, conf 0.95); record 3 DUPLICATED (worker-crash mid-handle -> duplicate delegation unless effect keys idempotent, TEST, conf 0.93) | TEST-BEH |
| `program/chaos-a/harness/schema.sql` | chaos-a | SUPPORT | Scratch harness schema | STATIC |
| `program/chaos-a/harness/chaos_lib.py` | chaos-a | SUPPORT | Harness lib (claim, effects, checkpoint, epoch fence) | STATIC |
| `program/chaos-a/harness/coord_proc.py` | chaos-a | SUPPORT | Coordinator process (dispatch/recover + epoch fencing) | STATIC |
| `program/chaos-a/harness/worker_proc.py` | chaos-a | SUPPORT | Worker process (kill-stage injection S1..S7 + SIGTERM + crash) | STATIC |
| `program/chaos-a/isolation/isolation_check.py` | chaos-a | SUPPORT | Isolation proof harness (gates all probes) | TEST |
| `program/chaos-a/probes/record.py` | chaos-a | SUPPORT | Shared-format probe recorder | STATIC |
| `program/chaos-a/probes/run_coord_death.py` | chaos-a | SUPPORT | Coordinator-death probe runner | STATIC |
| `program/chaos-a/probes/run_db_drop.py` | chaos-a | SUPPORT | DB-disappearance probe runner | STATIC |
| `program/chaos-a/probes/run_idempotency.py` | chaos-a | SUPPORT | Idempotency probe runner (duplicate delivery, redelivery storms, dedup collisions) | STATIC |
| `program/chaos-a/probes/run_kill_matrix.py` | chaos-a | SUPPORT | Kill-matrix probe runner | STATIC |
| `program/chaos-a/probes/run_worker_crash.py` | chaos-a | SUPPORT | Worker-crash probe runner (fed probe record 3: DUPLICATED) | STATIC |
| `program/chaos-a/probes/aggregate.py` | chaos-a | SUPPORT | Probe-result aggregation | STATIC |
| `program/chaos-a/probes/run_durable_intent.py` | chaos-a | SUPPORT | Follow-up probe: durable dispatch intent vs mid-claim coordinator death (proves fix direction for FC-3, found as 6x LOST-STATE in run_coord_death) | STATIC |
| `program/chaos-a/CHAOS-RESULTS.md` | chaos-a | FINAL | Certified results (~21:20 MDT): 180 valid probe records (1,531 logical missions), 164 SURVIVED / 7 WEDGED (FC-2) / 6 LOST-STATE (FC-3) / 3 DUPLICATED (FC-1 counterfactual). Mean conf 0.943. Broken boundaries: reconnect policy, coordinator recovery intent layer, idempotent effect application | TEST-BEH |
| `program/chaos-a/fixtures/fc1-nonidempotent-recovery.py` | chaos-a | SUPPORT | Failure-case fixture: non-idempotent recovery | STATIC |
| `program/chaos-a/fixtures/fc2-pool-drop-wedge.py` | chaos-a | SUPPORT | Failure-case fixture: pool-drop wedge | STATIC |
| `program/chaos-a/fixtures/fc3-nondurable-intent.py` | chaos-a | SUPPORT | Failure-case fixture: non-durable dispatch intent (FC-3) | STATIC |
| `program/chaos-a/lanes/IMPL-LANE-NOTE.md` | chaos-a | STATUS | Lane note to impl lanes: 3 generic classes with runnable repros (FC-1 idempotent-effect-keys -> joins GC-5 as instance 6; FC-2 pool-drop-wedge and FC-3 nondurable-intent are candidate classes pending a second instance) | STATIC |
| `program/chaos-a/evidence/full-run.log` | chaos-a | SUPPORT | Full probe-run log | STATIC |
| `program/chaos-a/FOLLOWON-QUEUE.md` | chaos-a | STATUS | Follow-on queue: Q1 clock-skew races + staged probe batches; lane pulls next item when current scope completes | STATIC |
| `wave2/impl-safety-finish/CHECKPOINT.md` | impl-safety-finish | IN-PROGRESS | New lane (started 20:53 MDT): transfer 5 staged modules + 5 test suites to Pig worktree /home/nolan/ping-orca-safety @ orca-finish/safety, run node --test, write SAFETY-LAYER.md, stage HS-1/HS-2/HS-3/HS-6 pure-module specs (from orca-a harvest), commit additive-only. NOTE: orca_approval.js ships WITH the GC-7 token flaw still unfixed; redteam GO/NO-GO must gate before any live use | STATIC |
| `wave2/impl-safety-finish/stage-out/SAFETY-LAYER.md` | impl-safety-finish | FINAL | Safety layer document (written to Pig worktree; staged copy here) | STATIC |
| `wave2/impl-safety-finish/stage-out/hs-1-stable-identity.md` | impl-safety-finish | SUPPORT | Harvest spec: key-order-stable mission identity (from orca-a HS-1) | STATIC |
| `wave2/impl-safety-finish/stage-out/hs-2-run-lifecycle.md` | impl-safety-finish | SUPPORT | Harvest spec: durable run record + 7-state lifecycle (from orca-a HS-2) | STATIC |
| `wave2/impl-safety-finish/stage-out/hs-3-attempt-identity.md` | impl-safety-finish | SUPPORT | Harvest spec: attempt identity + per-attempt records (from orca-a HS-3) | STATIC |
| `wave2/impl-safety-finish/stage-out/hs-4-fencing-epoch.md` | impl-safety-finish | SUPPORT | Harvest spec: fencing epoch on leases, enforced at write time (from orca-a HS-4) | STATIC |
| `wave2/impl-safety-finish/stage-out/hs-6-takeover-liveness.md` | impl-safety-finish | SUPPORT | Harvest spec: liveness-checked stale-claim takeover (from orca-a HS-6) | STATIC |
| `wave2/impl-safety-finish/stage-out/hs-7-provenance-column.md` | impl-safety-finish | SUPPORT | Harvest spec: provenance column (new; not from orca-a's HS-1..HS-6 set) | STATIC |
| `program/critic-archdel/CHECKPOINT.md` | critic-archdel | IN-PROGRESS | Spawned 01:59 UTC; plan only: DELETION-DOCKET.md, evidence pack, sovereignty analysis; hard boundary: docket only, no deletions | STATIC |
| `program/critic-archdel/DELETION-DOCKET.md` | critic-archdel | FINAL | 24 proven-dead entries via static require-closure (189 files reachable, git grep require/import, schema-vs-DDL). Rule: any live caller REJECTS the candidate. Docket only; nothing deleted (Nolan's no-delete order respected) | STATIC |
| `program/critic-security/CHECKPOINT.md` | critic-security | IN-PROGRESS | Independent security critic; attack plan T1-XSS seam, T2-secrets, T3-tenant isolation, T4-auth bypasses, T5-new code | STATIC |
| `program/critic-security/SECURITY-CRITIQUE.md` | critic-security | FINAL | Security findings: F1 P-7 fabrication via LIVE unauthenticated endpoint (LIVE); F2 ORCA fencing epochs detect-not-prevent (LATENT); F3 PING complete() stale-worker ABA (zombie's late complete accepted, result overwritten, canonical event emitted; LIVE, strengthens GC-5); N1 coordinator lock no TTL (availability note) | STATIC+LIVE |
| `program/critic-semantic/CHECKPOINT.md` | critic-semantic | IN-PROGRESS | Independent semantic critic (vocabulary consistency) | STATIC |
| `program/critic-semantic/SEMANTIC-AUDIT.md` | critic-semantic | FINAL | Contested-term glossary (RUN/MISSION/WORK ORDER/WORK PACKET/ATTEMPT/OBJECTIVE/TASK/RETRY/RECLAIM/REDISPATCH/RESUME/RECONCILE/DETERMINISTIC/UNKNOWN/TENANT), contradiction list, 3 factual errors caught (ORCA-B misquotes terminal set; W2-IMPL-STATE vocabulary collision; C1 old work_order_id formula superseded), 14 recommended canonical definitions | STATIC |
| `program/critic-semantic/SEMANTIC-AUDIT.md` | critic-semantic | FINAL | Contested-term glossary (RUN/MISSION/WORK ORDER/WORK PACKET/ATTEMPT/OBJECTIVE/TASK/RETRY/RECLAIM/REDISPATCH/RESUME/RECONCILE/DETERMINISTIC/UNKNOWN/TENANT), contradiction list, 3 factual errors caught (ORCA-B misquotes terminal set; W2-IMPL-STATE vocabulary collision; C1 old work_order_id formula superseded), 14 recommended canonical definitions | STATIC |
| `program/critic-product/CHECKPOINT.md` | critic-product | IN-PROGRESS | Independent product/user-value critic; targets: missions contracts, MC audit, mechanism verdicts + HS-1..HS-6, FYD claims, Agent 10 audit | STATIC |
| `program/critic-product/PRODUCT-CRITIQUE.md` | critic-product | FINAL | Independent product-value critique of program deliverables | STATIC |
| `program/critic-visual/CHECKPOINT.md` | critic-visual | IN-PROGRESS | Independent visual-truth critic; first target: verify C7's four synthesis claims (|| 0, Math.random, scope literals, negative-clamp) | STATIC |
| `program/critic-visual/VISUAL-CRITIQUE.md` | critic-visual | FINAL | Visual-truth critique (source read + artifact inspection; no live browser, honestly disclosed) | STATIC |
| `program/critic-performance/CHECKPOINT.md` | critic-performance | IN-PROGRESS | Independent performance critic; targets: scheduler throughput, lease timings, /mc SQL, memory ingestion stall, probe timing | STATIC |
| `program/critic-performance/scratch/chaos-timing/` (14 files) | critic-performance | SUPPORT | Scratch copies of the chaos-a harness for timing measurement (not new deliverables; upstream = program/chaos-a) | STATIC |
| `program/mem-a/CHECKPOINT.md` | mem-a | IN-PROGRESS | Memory loop proof + attack suite; harvest list H1-H14 independently matches GC clusters | STATIC |
| `program/mem-b/CHECKPOINT.md` | mem-b | IN-PROGRESS | Memory harvest + index verification: re-verify MEM-A v1.0 forget-at-index (STALE vs STILL-BROKEN), establish index-ingestion cadence, harvest ORCA-A/B + CHAOS-A failures, cross-tenant isolation proofs | STATIC |
| `program/mem-b/MEMORY-HARVEST.md` | mem-b | FINAL | Index re-verification + ingestion-cadence measurement + new harvest H-13..H-25. Run 20:55-21:15 MDT (~35 missions) | STATIC+TEST |
| `program/mem-a/MEMORY-PROOFS.md` | mem-a | FINAL | Memory loop-closure trace on the real memory system: WRITE/STORE PROVEN, RETRIEVE PROVEN with hazard (exact-token query missed fresh entry; semantic ranking outranks exact match), SUPERSEDE with index-lag finding, 9-entry attack suite (STALE/CONTRADICT/POISON/TENANT/MISSION/VERSION/SOURCE/PROVENANCE/OVERLONG). VERIFY VALUE caught own probe defect (+20 claimed vs +12 actual). [PROBE] entries all removed at end (FORGET) | STATIC+TEST |
| `program/orca-a/CHECKPOINT.md` | orca-a | IN-PROGRESS | Identity/claiming/leases/fencing verdicts; read-only source copies pulled (Pig-side) | STATIC |
| `program/orca-a/VERDICTS.md` | orca-a | FINAL | 10 mechanism records: ORCA STRONGER->HARVEST 4 (mission/run/attempt identity, fencing epoch, split-brain), PING STRONGER 2 (wired lease lifecycle, atomic claim), EQUIVALENT 2 (claiming, stale-claim takeover), NOT APPLICABLE 1, UNKNOWN 1 (U1 run-record wiring, U2 wedged-holder policy). Harvest specs HS-1..HS-6. GAPs 1/3/5 re-confirmed; PING hung-worker hole + stale-worker ABA hazard live in current source. Honest limits: ORCA fencing is detect-not-prevent; claimRun CAS non-atomic; zero production callers | TEST+STATIC |
| `program/orca-a/probe.js` | orca-a | SUPPORT | 43 checks, all pass (scratch temp dirs only) | TEST |
| `program/orca-a/probe2.js` | orca-a | SUPPORT | 14 checks, all pass after F1 regex fix (case-insensitive match on diagnostic note) | TEST |
| `program/orca-b/CHECKPOINT.md` | orca-b | IN-PROGRESS | New lane (started 20:04 MDT): checkpoint/resume/reconciliation/dependency-graph/death/duplicate-completion verdicts; read-only Pig probes; follow-on queue fencing-under-clock-skew. SEMANTIC-AUDIT caught one misquote in its terminal set (see LA-13) | STATIC |
| `program/orca-b/probes/hung-worker-harness.js` | orca-b | SUPPORT | Hung-worker executable probe (targets C2 GAP-5 live claim) | STATIC |
| `program/orca-b/probes/vendor/orchestration/mission_runtime.js` | orca-b | SUPPORT | Vendored mission_runtime copy for probes | STATIC |
| `program/orca-b/probes/vendor/orchestration/mission_scheduler.js` | orca-b | SUPPORT | Vendored mission_scheduler copy for probes | STATIC |
| `program/orca-b/VERDICTS.md` | orca-b | FINAL | 16 mechanism records: ORCA STRONGER->HARVEST 10, PING STRONGER 1, EQUIVALENT 1, PATTERN ONLY 2. Adopted critic-semantic rules. hung-worker-harness.js TEST-PROVEN the C2 slot-leak (24 renewals, 0 reaps, permanent stall). Failure pipeline: one local harness-build accident (fixed); no new generic classes | TEST+STATIC |
| `program/orca-b/probes/vendor/authorities/constitutional_time_authority.js` | orca-b | SUPPORT | Vendored time authority copy for probes | STATIC |

## Agent 19 / Agent 10

| Path | Lane | Status | Key claims | Evidence |
|---|---|---|---|---|
| `agent10/CHECKPOINT.md` | agent10 | IN-PROGRESS | Spawned 01:57 UTC; TEST-00 budget + TEST-01 A6 re-proof first on the A5 branch; falsify don't verify. Delivered SELF-IMPROVEMENT-AUDIT.md | STATIC |
| `agent10/SELF-IMPROVEMENT-AUDIT.md` | agent10 | FINAL | Self-improvement loop audit across 3 substrates. Headline: the loop does NOT close; the PING-side worker chain is a commentary pipeline, not an improvement pipeline (classification = static lookup tables, recommendations projected to Qdrant rather than executed, LINEAGE_CREATED explicitly terminal, no learning stage consumes live data, nothing writes back) | STATIC |
| `agent19/CHECKPOINT.md` | agent19 | PLAN | Spawned 01:57 UTC; plan only: falsify C2 live-chain, phantom claims, mechanism-map 22; attack items incl. hung-worker probe | STATIC |
| `agent19/probes/mission_scheduler_under_test.js` | agent19 | SUPPORT | Vendored mission_scheduler copy for STATIC hung-worker test (plan item 2) | STATIC |
| `agent19/probes/wedge-test.js` | agent19 | SUPPORT | Hung-worker wedge TEST vs vendored mission_scheduler (8 checks: hung dispatch sticks in _processing; Arrow 0 renews every poll; Arrow 2 starves new dispatches; reaper never reclaims). Result not yet logged in checkpoint | TEST |

## program/orca-a source copies (read-only, Pig-side pull)

| Path | Lane | Status | Key claims | Evidence |
|---|---|---|---|---|
| `program/orca-a/src/objective-runtime.js` (508 ln) | orca-a | SUPPORT | Vendored branch copy (read-only harness) | STATIC |
| `program/orca-a/src/orca_control_loop.js` (1192 ln) | orca-a | SUPPORT | Vendored branch copy | STATIC |
| `program/orca-a/src/orca_run_record.js` (266 ln) | orca-a | SUPPORT | Vendored impl-state module copy | STATIC |
| `program/orca-a/src/orca_ready_set.js` (104 ln) | orca-a | SUPPORT | Vendored impl-state module copy | STATIC |
| `program/orca-a/src/orca_ready_set.test.js` | orca-a | SUPPORT | Vendored impl-state test copy | TEST |
| `program/orca-a/src/orca_run_record.js` (266 ln) | orca-a | SUPPORT | Vendored impl-state module copy | STATIC |
| `program/orca-a/src/orca_run_record.test.js` | orca-a | SUPPORT | Vendored impl-state test copy | TEST |
| `program/orca-a/src/orca_status_model.js` (178 ln) | orca-a | SUPPORT | Vendored branch copy | STATIC |
| `program/orca-a/src/recovery_decisions.js` (120 ln) | orca-a | SUPPORT | Vendored branch copy | STATIC |
| `program/orca-a/src/mission_runtime.js` | orca-a | SUPPORT | Vendored ping main copy (fencing-token ce002 e02960f0f lineage) | STATIC |
| `program/orca-a/src/mission_scheduler.js` | orca-a | SUPPORT | Vendored ping main copy | STATIC |

## wave1

| Path | Lane | Status | Key claims | Evidence |
|---|---|---|---|---|
| `wave1/orca-arch/CHECKPOINT.md` | C1 | IN-PROGRESS | Killed by daemon restart ~01:28 UTC; re-dispatched with checkpoint-first | STATIC |
| `wave1/orca-arch/A5-VERDICT.md` | C1 | FINAL | feature/orca-autonomy exists in /home/nolan/ping @ ae55b77ff; 992e12725 exists on 4 branches; A5 substantially proven (2026-09-18 witnessed evidence); A6 remediation unwitnessed; no A7 runner; scope warning: A5 claims true only on this branch | TEST |
| `wave1/orca-arch/ORCA-INVENTORY.md` | C1 | FINAL | Full KEEP/WIRE/MERGE/DELETE/ARCHIVE classification; README!=IMPLEMENTATION rule; falsified claims listed | STATIC |
| `wave1/spine-exec/GAPS.md` | C2 | FINAL | Live path is JS in-process (gateway->UnifiedEventRuntime->EventToMissionBridge->MissionRuntime->MissionScheduler->WorkerRuntime); GAP-5 CRITICAL: hung worker stalls scheduler forever (3x maxConcurrent); claimed containerized ExecutionAuthority chain unsupported by source | STATIC |
| `wave1/spine-exec/SPINE-TRACE.md` | C2 | FINAL | Live-spine baseline with evidence | STATIC |
| `wave1/state-recovery/CHECKPOINT.md` | C3 | IN-PROGRESS | Killed by daemon restart; re-dispatched | STATIC |
| `wave1/state-recovery/STATE-RECOVERY-MAP.md` | C3 | FINAL | Bridge has no cursor/catch-up; GracefulShutdown dormant; reclaim lacks attempt fencing; unreferenced CheckpointRepository (schema-incompatible) vs competing CheckpointAuthority; reconciler claim absent on branch | STATIC |
| `wave1/state-recovery/RUN-RECONSTRUCTION.md` | C3 | FINAL | NEW: what a bare mission_id/event_id/dead-letter recovers today; precise delta to full RUN_ID (attempt rows or ce002 attempts column + fencing token) | STATIC |
| `wave1/authority-mcp/AUTHORITY-BOUNDARY-MAP.md` | C4 | FINAL | Only EventGovernance + WitnessWorker live sovereign gates; approval/capability/effect/commit/mission-execution authorities dormant or bypassed; MCP transport absent | STATIC |
| `wave1/authority-mcp/APPROVAL-GAP.md` | C4 | FINAL | Approval is absent in live path; schemes that exist are structurally vacuous (patch_id-only binding, x\|\|true conditions, colliding effect IDs) | STATIC |
| `wave1/phantom-hunt/CHECKPOINT.md` | C5 | IN-PROGRESS | Killed by daemon restart; re-dispatched | STATIC |
| `wave1/phantom-hunt/PHANTOM-REGISTRY.md` | C5 | FINAL | NEW: P-1..P-8 (worker_port execute unreachable; duplicate WorkerPort; fabricated reflection loop; 4 identity authorities; dead WitnessAuthority copy; fabricated startAutonomousLoop; duplicate engines; dead worker subclasses). CLASSIFY only, no deletions | STATIC |
| `wave1/mechanism-map/ORCA-MECHANISM-MAP.md` | C6 | FINAL | 22 finish criteria: ADAPT 15, DIRECT_REUSE 1, ALREADY_IN_PING 1, PING_IS_STRONGER 1, PATTERN_ONLY 1, UNKNOWN 3 (1,8,18/19) | STATIC |
| `wave1/mission-control/CHECKPOINT.md` | C7 | IN-PROGRESS | Killed by daemon restart; re-dispatched | STATIC |
| `wave1/mission-control/MISSION-CONTROL-AUDIT.md` | C7 | FINAL | /mc API-only; attempts/graph/blocked/tools/checkpoints/effects/receipts/unknowns/mission-linked artifacts missing; synthetic dashboard values (\|\| 0, Math.random, negative-clamp); row-vs-journal divergence possible | STATIC |

## wave2/gauntlet

| Path | Lane | Status | Key claims | Evidence |
|---|---|---|---|---|
| `wave2/gauntlet/CHECKPOINT.md` | gauntlet | IN-PROGRESS | Scratch PG harness on :54339; A6 witnessed re-proof = TEST-01. 20:05 MDT: TEST-A6 DISPATCH PHASE COMPLETE (TEST): coordinator SIGKILLed mid-dispatch; reconcileStartup classified attempt-1 DISPATCH_LOST, re-authorized attempt-2, no duplicate delegation, budget not reset. Attempt-2 hung on Hermes CLI env issue; escalated to human, exit 3. Grader run; full artifact review in progress | STATIC+TEST |
| `wave2/gauntlet/src/run_suite.py` | gauntlet | SUPPORT | Suite runner for the 8 chaos tests (now 9: t_ack_lost added) | STATIC |
| `wave2/gauntlet/HARNESS.md` | gauntlet | SUPPORT | Harness design doc: durable-execution mechanics under injected faults; never converts unknown into success | STATIC |
| `wave2/gauntlet/results/suite-results.json` | gauntlet | TEST | Suite results (ran 02:58 UTC; first entries PASS) | TEST |
| `wave2/gauntlet/results/a6-grade.json` | gauntlet | STATUS | A6 re-proof grading evidence (kill mid-dispatch: workorder RUNNING, dispatch_pid 16931, SIGKILL logged) | TEST |
| `wave2/gauntlet/results/a6-workorder.json` | gauntlet | SUPPORT | A6 re-proof workorder record | STATIC |
| `wave2/gauntlet/results/a6-run2-tail.log` | gauntlet | SUPPORT | A6 run-2 tail log | STATIC |
| `wave2/gauntlet/GAUNTLET-RESULTS.md` | gauntlet | FINAL | Full results: TEST-A6 PASS (6/6 gates; witnessed real-loop re-proof ~02:00-03:00 UTC; caveat: worker failure was environmental Hermes hang, honest-failure path witnessed instead of success path) + synthetic suite 9/9 PASS (worker death, coord death, timeout-after-effect, double claim, lease expiry, stale checkpoint, result lost, ack lost, db disappear). Not run with exact reasons (host restart, browser death, network disconnect, MCP death, git conflict, model-output behaviors, standalone scratch gateway). Test inventory: 10. RESOLVES R7 | TEST |
| `wave2/gauntlet/src/gauntlet_lib.py` | gauntlet | SUPPORT | Harness library | STATIC |
| `wave2/gauntlet/src/coord_proc.py` | gauntlet | SUPPORT | Coordinator process harness | STATIC |
| `wave2/gauntlet/src/worker.py` | gauntlet | SUPPORT | Worker process harness | STATIC |
| `wave2/gauntlet/src/tests/t_coord_death.py` | gauntlet | SUPPORT | T-COORD-DEATH: SIGKILL scheduler mid-dispatch | STATIC |
| `wave2/gauntlet/src/tests/t_db_disappear.py` | gauntlet | SUPPORT | T-DB-DISAPPEAR: DB vanishes mid-transaction, returns | STATIC |
| `wave2/gauntlet/src/tests/t_double_claim.py` | gauntlet | SUPPORT | T-DOUBLE-CLAIM: two workers race one ENQUEUED packet | STATIC |
| `wave2/gauntlet/src/tests/t_lease_expiry.py` | gauntlet | SUPPORT | T-LEASE-EXPIRY: tool lease expires mid-work | STATIC |
| `wave2/gauntlet/src/tests/t_result_lost.py` | gauntlet | SUPPORT | T-RESULT-LOST: effect happened, result record lost | STATIC |
| `wave2/gauntlet/src/tests/t_stale_checkpoint.py` | gauntlet | SUPPORT | T-STALE-CHECKPOINT: restore older when newer exists | STATIC |
| `wave2/gauntlet/src/tests/t_timeout_after_effect.py` | gauntlet | SUPPORT | T-TIMEOUT-AFTER-EFFECT: timeout after side-effect boundary | STATIC |
| `wave2/gauntlet/src/tests/t_worker_death.py` | gauntlet | SUPPORT | T-WORKER-DEATH: SIGKILL worker mid-mission | STATIC |
| `wave2/gauntlet/src/tests/t_ack_lost.py` | gauntlet | SUPPORT | T-ACK-LOST: completion durable (packet SUCCEEDED) but coordinator died before seeing the ack; dispatch scan must create nothing new. Record-14 controller invariant | STATIC |

## wave2/impl-state

| Path | Lane | Status | Key claims | Evidence |
|---|---|---|---|---|
| `wave2/impl-state/CHECKPOINT.md` | impl-state | IN-PROGRESS | Six-table plan cancelled; additive run record + ready-set built; commit 30a750fad; 16/16 + 24/24 tests | STATIC+TEST |
| `wave2/impl-state/GAP-ANALYSIS.md` | impl-state | FINAL | Attempt identity reclassified (present on branch); ready-set RUNNING reclaim fixed | STATIC |
| `wave2/impl-state/STATE-LAYER.md` | impl-state | FINAL | Design of the run record layer | STATIC |
| `wave2/impl-state/staging/orca-payload/orca/control-loop/orca_run_record.js` | impl-state | SUPPORT | Staged module (file-backed, single-writer CAS) | STATIC |
| `wave2/impl-state/staging/orca-payload/orca/control-loop/orca_run_record.test.js` | impl-state | SUPPORT | Test: 24/24 pass | TEST |
| `wave2/impl-state/staging/orca-payload/orca/control-loop/orca_ready_set.js` | impl-state | SUPPORT | Staged module (claimable-only; fixed after own tests) | STATIC |
| `wave2/impl-state/staging/orca-payload/orca/control-loop/orca_ready_set.test.js` | impl-state | SUPPORT | Test: 16/16 pass | TEST |

Note: orca_status_model.js exists only as a read-only vendored copy in program/orca-a/src/, not in impl-state staging.

## wave2/impl-safety

| Path | Lane | Status | Key claims | Evidence |
|---|---|---|---|---|
| `wave2/impl-safety/CHECKPOINT.md` | impl-safety | IN-PROGRESS | 5 modules staged + tests; GO/NO-GO is redteam's; no live commits | STATIC |
| `wave2/impl-safety/GAP-ANALYSIS.md` | impl-safety | FINAL | TRUE_GAPs (worktree, UNKNOWN, approval) + ADAPT (fan-out, capability); branch REQUIRE_HUMAN_APPROVAL is decision-class not mechanism; authorize->issue argument smuggling structurally possible | STATIC |
| `wave2/impl-safety/staging/orca_approval.js` | impl-safety | SUPPORT | Two-tier digest-bound grants, execution-time revalidation, single-writer resume CAS | STATIC |
| `wave2/impl-safety/staging/orca_capability_gate.js` | impl-safety | SUPPORT | Capability gating (ADAPT from kernel gate) | STATIC |
| `wave2/impl-safety/staging/orca_fanout_guardrails.js` | impl-safety | SUPPORT | Fan-out ADAPT guardrails | STATIC |
| `wave2/impl-safety/staging/orca_outcomes.js` | impl-safety | SUPPORT | Outcome vocabulary incl. UNKNOWN state machine | STATIC |
| `wave2/impl-safety/staging/orca_worktree.js` | impl-safety | SUPPORT | Worktree-safe staging / recovery context | STATIC |
| `wave2/impl-safety/staging/test_orca_approval.test.js` | impl-safety | SUPPORT | Test file for orca_approval (BEWARE: tests the module that ships the GC-7 token flaw) | TEST |
| `wave2/impl-safety/staging/test_orca_capability_gate.test.js` | impl-safety | SUPPORT | Test file for orca_capability_gate | TEST |
| `wave2/impl-safety/staging/test_orca_fanout_guardrails.test.js` | impl-safety | SUPPORT | Test file for orca_fanout_guardrails | TEST |
| `wave2/impl-safety/staging/test_orca_outcomes.test.js` | impl-safety | SUPPORT | Test file for orca_outcomes | TEST |
| `wave2/impl-safety/staging/test_orca_worktree.test.js` | impl-safety | SUPPORT | Test file for orca_worktree | TEST |

## wave2/missions

| Path | Lane | Status | Key claims | Evidence |
|---|---|---|---|---|
| `wave2/missions/CHECKPOINT.md` | missions | IN-PROGRESS | Spawned 19:34 MDT; checkpoint discipline (5-min) | STATIC |
| `wave2/missions/DRY-RUN-REPORT.md` | missions | FINAL | 53 suites, 524 tests, 0 failures; TD-001 FALSE POSITIVE; RENDER was first broken stage (javascript: URLs) | TEST |
| `wave2/missions/INTERRUPTION-DRILL.md` | missions | FINAL | /ping/tmp wiped as chaos injection; 7/8 stages verified (CURL_PROBE-ONLY = STATIC-adjacent); A5 loop can run both missions supervised; A7/A6-browser gaps remain | TEST |
| `wave2/missions/CODING-MISSION-CONTRACT.md` | missions | FINAL | Coding mission contract (head read) | STATIC |
| `wave2/missions/FYD-MISSION-CONTRACT.md` | missions | FINAL | FYD mission contract (head read) | STATIC |
| `wave2/missions/artifacts/coppersmith-plumbing.html` | missions | SNAPSHOT | Render snapshot, coding mission (renamed from golden-coding-final-2026-09-23.html, same timestamp 01:41 UTC) | STATIC |
| `wave2/missions/artifacts/happy-place.html` | missions | SNAPSHOT | Render snapshot, FYD mission (renamed from golden-fyd-final-2026-09-23.html, same timestamp 01:41 UTC) | STATIC |

## wave2/redteam

| Path | Lane | Status | Key claims | Evidence |
|---|---|---|---|---|
| `wave2/redteam/CHECKPOINT.md` | redteam | IN-PROGRESS | BR-A1..A9 (boot seed unverified path; cross-attempt replay PoC; no verified-vs-claimed grading; split-brain on lock loss; mutable evidence; lost-dispatch read-only safe; two-file budget race; re-registration ignores option changes; rendezvous misattribution). 8 vectors queued | STATIC |
| `wave2/redteam/poll.sh` | redteam | SUPPORT | Poll script | STATIC |
| `wave2/redteam/.poll_state_sums` | redteam | SUPPORT | Poll state | STATIC |
| `wave2/redteam/poc/attempt-replay.js` | redteam | SUPPORT | Cross-attempt replay PoC (BR-A2) | TEST |
| `wave2/redteam/poc/approval-token-predict.js` | redteam | SUPPORT | Token-predictability PoC (GC-7 instance 4): brute-forces writerToken from Date.now(), defeats single-writer CAS. Fix (crypto-random token) still not landed | TEST |
| `wave2/redteam/poc/ping-runtime/canonicalization/canonicalization_service.js` | redteam | SUPPORT | Vendored evidence copy | STATIC |
| `wave2/redteam/poc/ping-runtime/external-agent/external_agent_adapter.js` | redteam | SUPPORT | Vendored evidence copy | STATIC |

---

## Caveats for consumers

1. **Agent 19 / Agent 10 / critic-archdel / orca-b are plan-phase.** Do not cite their conclusions yet; they have none.
2. **New code is STAGED, not committed** (impl-state committed on orca-finish/state; impl-safety staging). Treat module properties as design intent until redteam GO/NO-GO lands. **orca_approval.js token flaw (GC-7 instance 4) confirmed still unfixed** (lines 288, 325) as of this sweep.
3. **A5 claims are branch-scoped.** Everything "proven" applies to /home/nolan/ping @ ae55b77ff (feature/orca-autonomy), not main.
4. **HTML snapshots are LIVE fetch artifacts, not pinned builds** (served repo had 83 dirty files). Renamed, not re-rendered, in this sweep.
5. **Chaos-a is a behavioral re-proof (TEST-BEH), not a source re-run** (A5 worktree absent on this host). Treat its verdicts as corroboration with that grade; gauntlet owns TEST-01..TEST-08 verdicts (per GC-11 convergence point).
6. **Ledger staleness:** WAVE-LEDGER.md updated 02:40 UTC (C5 completion + CMD-OPS incident); orca-a, critic-security, mem-a still unregistered.
