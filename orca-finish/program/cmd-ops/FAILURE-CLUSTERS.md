# FAILURE CLUSTERS — ORCA FINISH CMD-OPS

**Lane:** CMD-OPS (failure clustering). **Date:** 2026-09-23 MDT (night shift).
**Scope:** every lane CHECKPOINT.md + deliverables under `~/workspace/orca-finish/` (wave1/, wave2/, agent10/, agent19/, program/), plus `~/workspace/FAILURE_LEDGER.md` mining.
**Method:** read-only. For each failure: LOCAL ACCIDENT (single lane) vs GENERIC CLASS (same class in 2+ lanes/sources). Generic classes name the single authorized patch path and the owning lane.
**Shared record format used for generic classes:** DOMAIN / COMPONENT / CLAIM / EVIDENCE / CALLER / CALLEE / WRITER / READER / AUTHORITY / CLASSIFICATION / CONFIDENCE / BROKEN BOUNDARY / DEPENDENCIES / AFFECTS AGENTS.

**Cross-validation note:** program/mem-a independently harvested sibling-checkpoint failures as memory-entry candidates H1-H14. Their list maps 1:1 onto GC-4 (H1,H4,H8,H13), GC-7 (H2), GC-5 (H3,H6,H14), GC-9 (H7), GC-8 (H9), GC-3 (H10), plus product defects PD-6 (H5), PD-8 (H11), PD-9 (H12). Independent harvest, same clusters. Confidence in the clustering: HIGH.

**Cross-validation note 2 (20:55 MDT):** program/orca-a VERDICTS.md (10 records, 57/57 probes pass) independently corroborates GC-5 (hung-worker hole + stale-worker ABA hazard re-confirmed in current source; fencing detect-not-prevent), GC-3-adjacent surface-scoping discipline, and adds a new product defect: PING MissionRuntime.create idempotency key is NOT key-order stable (H1j, duplicate-mission bug class; harvest HS-1). program/chaos-a probe record 3 (DUPLICATED, TEST) confirms GC-5 on a second harness substrate.

---

## GENERIC CLASSES (2+ lanes/sources each)

### GC-1 — SUBAGENT SPAWN DB LOCK CONTENTION

- DOMAIN: program ops / lane: coordinator spawn machinery
- COMPONENT: subagent spawn path (DB lock)
- CLAIM: spawning a lane can fail with a DB lock timeout; retry succeeds
- EVIDENCE: STATIC (spawn records in WAVE-LEDGER.md + critic-security CHECKPOINT.md)
- CALLER: parent orchestrator / CALLEE: lane subagents / WRITER: coordinator / READER: cmd-ops / AUTHORITY: wave ledger spawn record
- CLASSIFICATION: GENERIC CLASS — 5 instances: wave1 C3 (1 timeout), C4 (1), C5 (1), C7 (spawn FAILED, then succeeded after 1), program/critic-security (transient timeout, retry started 20:05 MDT)
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: spawn path has no bounded retry/backoff; first attempt can die on lock contention
- DEPENDENCIES: none (infra)
- AFFECTS AGENTS: all lanes at spawn time
- STATUS: recovered each time (all lanes eventually spawned). No lane lost work to it beyond a retry. Re-checked 20:55 MDT: no new spawn DB lock timeouts this cycle (count holds at 5).
- PATCH PATH (single, authorized): bounded spawn retry with backoff in the coordinator; record lock-wait metrics. OWNER: parent orchestrator (coordinator spawn machinery). Not a lane fix.

### GC-2 — DAEMON RESTART DESTROYS RUNTIME-ONLY STATE

- DOMAIN: program ops / lane: all wave-1 lanes
- COMPONENT: lane working state (no disk checkpoint)
- CLAIM: a daemon restart killed 4 lanes with no checkpoint; all in-progress work lost
- EVIDENCE: LIVE (witnessed 2026-09-24 ~01:28 UTC; recorded in WAVE-LEDGER.md "Daemon restart" section)
- CALLER: infra daemon / CALLEE: C1, C3, C5, C7 / WRITER: wave ledger / READER: cmd-ops / AUTHORITY: wave ledger
- CLASSIFICATION: GENERIC CLASS — 4 lanes killed: C1 ORCA-ARCHAEOLOGY, C3 STATE-RECOVERY, C5 PHANTOM-HUNT, C7 MISSION-CONTROL. Survived: C2, C4 (still running), C6 (completed before restart).
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: lanes relied on runtime-only state; no disk checkpoint discipline
- DEPENDENCIES: none
- AFFECTS AGENTS: every lane without incremental checkpoints
- STATUS: MITIGATED. All 4 re-dispatched with mandatory incremental CHECKPOINT.md (plan first, append every ~15 min). Lesson recorded in ledger: disk checkpoints from the start; never rely on runtime-only state.
- PATCH PATH (single, authorized): checkpoint-from-start rule now in every lane brief. OWNER: parent orchestrator (briefs carry the rule). No further action unless a lane violates it.

### GC-3 — VERIFICATION-SCOPE MISALIGNMENT

- DOMAIN: forensics / lane: claim verification
- COMPONENT: verdict evidence chain (repo/branch/SHA/surface scoping)
- CLAIM: a claim is verified against the wrong repo, branch, or surface, producing a false verdict
- EVIDENCE: STATIC+TEST (checkpoint correction entries)
- CALLER: verifying lane / CALLEE: repo under test / WRITER: lane / READER: cmd-ops / AUTHORITY: lane checkpoint
- CLASSIFICATION: GENERIC CLASS — 3 instances:
  1. Ledger "feature/orca-autonomy does NOT exist in any ref (verified 2026-09-24)": the check ran against the website repo (/home/nolan/projects/ping), not the backend (/home/nolan/ping). C1 proved the branch exists there. (R1 in REGRESSION-LOG.md)
  2. TD-001: original positive finding was on a different branch; on fyd-factory @ e48ef710 it is a confirmed FALSE POSITIVE (W2-MISSIONS). (R3)
  3. VQ-001: W2-MISSIONS 20:00 "opacity:0" grep matched design opacities (0.55/0.6/0.75), claimed re-confirmation; 20:02 self-correction retracted it. (R4)
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: verdicts do not carry mandatory scope fields (repo path, branch, SHA, surface)
- DEPENDENCIES: Agent 19 shared record format
- AFFECTS AGENTS: every lane that issues verdicts (C1, C7, W2-MISSIONS, redteam, Agent 19)
- STATUS: corrected per-instance. Structural risk remains.
- PATCH PATH (single, authorized): every verdict/claim carries mandatory scope fields (repo path, branch, SHA, surface: source|served-HTML|runtime). OWNER: Agent 19 (owns the shared record format DOMAIN/.../EVIDENCE...; add the scope fields and enforce). Related ledger prior art: FL-20260919-RCA-001 wrong-vantage probe (heartbeat measured WSL virtual disk, not host C:) — same class, monitoring flavor.

### GC-4 — SYNTHESIZED DASHBOARD / STATUS DATA

- DOMAIN: observability honesty / lane: product surface
- COMPONENT: dashboards, headers, metric endpoints
- CLAIM: surfaces render values that are defaulted, fabricated, or masked rather than honestly unknown
- EVIDENCE: STATIC (source reads in C5, C7)
- CALLER: UI/API consumer / CALLEE: dashboard code / WRITER: lane / READER: cmd-ops / AUTHORITY: lane deliverable
- CLASSIFICATION: GENERIC CLASS — 2 lanes, 6 instances:
  - C5 P-7: `startAutonomousLoop()` (engine.js:579-648) FABRICATES worker output inline (findings with confidence 0.85 hardcoded), runs consensus over synthetic outputs, produces dashboard closure rates; exposed via LIVE HTTP endpoint POST /orchestration/engine/loop. (2026-09-18 "synthetically fabricated dashboard closure" verified in current source.)
  - C7 (4): ExecutiveDashboard `|| 0` defaults (0% closure indistinguishable from no-data); MissionControlHeader.tsx Math.random() latency/contextUsage + hardcoded model/gateway/ollama (pure fabrication, chat UI header); hardcoded `scope: 'persistent'/'session'` literals; /mc/dashboard negative-clamp masks event inconsistencies instead of surfacing anomalies.
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: no "honest unknown" convention at the projection seam (contrast: mission_control.js "no data returns empty with the precise upstream reason" — the good pattern exists in-repo)
- DEPENDENCIES: constitutional sprint (owns golden-path forensics)
- AFFECTS AGENTS: operators reading Mission Control; downstream policy reading fabricated closure rates
- STATUS: OPEN. W2-MISSIONS handed the XSS-adjacent fix plan to the constitutional sprint (owns golden-path forensics). P-7 DELETE candidates need Nolan's word (no-delete-ORCA order stands). C7's synthesized-removal list is the spec.
- PATCH PATH (single, authorized): constitutional sprint owns the fix (per W2-MISSIONS handoff); deletions via critic-archdel docket + Nolan's word. OWNER: constitutional sprint (not an orca-finish lane; external dependency).

### GC-5 — STALE-CLAIM / DOUBLE-DISPATCH RISK

- DOMAIN: execution safety / lane: live spine + branch + new code
- COMPONENT: lease/claim/reclaim paths
- CLAIM: stale holders can re-dispatch or re-claim work; fencing is absent or unenforced
- EVIDENCE: STATIC (source) + TEST (impl-state suite caught its own instance)
- CALLER: scheduler/coordinator / CALLEE: worker/dispatch / WRITER: lane / READER: cmd-ops / AUTHORITY: lane deliverable
- CLASSIFICATION: GENERIC CLASS — 6 instances, 6 lanes:
  1. PING mission_scheduler.js (A5): no dead-worker lease expiry; claimed work without heartbeat is never reclaimed.
  2. ORCA WorkOrder (A5): no fencing epochs; stale preempted coordinator can still write.
  3. Coordinator claim (A6): claimStartup does not gate on preexisting RUNNING.
  4. MissionScheduler dispatch (C2): hung workers hold slots + leases forever (slot leak; reaper only catches complete-but-not-final).
  5. chaos-a probe record 3 (DUPLICATED, TEST-BEH, conf 0.93): worker crash mid-handle can duplicate delegation unless effect keys idempotent.
  6. chaos-a FC-1 (fixture fc1-nonidempotent-recovery.py, 21:15 MDT): crash-recovery without idempotent effect keys duplicates side effects (1 effect before crash, 4 effect rows after naive requeue). Fix proven on hardened path: deterministic effect keys per (work unit, step) with INSERT-or-ignore; 12/12 crash probes exactly-once.
- Corroboration 21:30 MDT: critic-security F3 gives LIVE evidence for the stale-worker ABA hazard (zombie's late complete() accepted, result overwritten, canonical event emitted). Agent 19's wedge-test.js (8 checks, result pending) and orca-b's hung-worker-harness.js (TEST-PROVEN: 24 renewals, 0 reaps, permanent stall) independently prove the hung-worker slot-leak.
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: claim/lease/fencing is not a single enforced choke point; each path invents its own
- DEPENDENCIES: parent decision on live-dispatch changes (currently FORBIDDEN by wave-2 rules: "no live dispatch changes (hung-worker P0 stays flagged)"); JS->Python execution link decision
- AFFECTS AGENTS: MissionScheduler, WorkerRuntime, orca_control_loop, any future A7 runner
- STATUS: PARTIALLY MITIGATED. New code fixed (impl-state). Live-path fixes forbidden pending parent call; hung-worker P0 stays flagged. Redteam BR-A4 fix is specified, not applied.
- PATCH PATH (single, authorized): parent orchestrator decides the live-dispatch exception; then one fencing fix across paths (re-assert pg_try_advisory_lock before each dispatch, fail closed; fencing epoch on control mutations or lock watchdog). OWNER: parent orchestrator (decision) -> implementing lane. program/orca-a (identity/claiming/leases/fencing verdicts) is now independently re-verifying this class; await its verdicts.

### GC-6 — DUPLICATE / SECOND AUTHORITY

- DOMAIN: constitutional sovereignty / lane: repo authorities
- COMPONENT: authority modules claiming the same capability
- CLAIM: two implementations independently exercise the same capability or define competing truth
- EVIDENCE: STATIC (caller/callee grep audits)
- CALLER: live routes / CALLEE: authority modules / WRITER: C5/C4/C3 / READER: cmd-ops / AUTHORITY: AUTHORITY-BOUNDARY-MAP, PHANTOM-REGISTRY
- CLASSIFICATION: GENERIC CLASS — 6 instances, 3 lanes:
  1. C5 P-2: two WorkerPort classes ("Constitutional Port" single-authority claim); one has ZERO require() callers.
  2. C5 P-4: 4 IdentityAuthority declarations; live paths use compiled gateway/constitutional-dist/identity-authority.js (bypassing kernel) AND ping-runtime/authorities/identity_authority.js; runtime/constitutional/dist/ is a second compiled copy (72K) with ZERO requirers; the two dist builds have distinct hashes. CLASSIFY: MERGE.
  3. C5 P-5: dead WitnessAuthority copy (gateway/replay/kernel/witness_authority.js, 0 requirers, near-duplicate of runtime/kernel/authorities/witness_authority.js, 197 vs 191 lines). CLASSIFY: DELETE candidate.
  4. C3 D12/D13: two competing checkpoint writers (CheckpointAuthority vs CheckpointRepository, incompatible columns; repository unreferenced + schema-incompatible = DEAD); competing execution writer (ExecutionRepository rich shape vs migration thin shape = DEAD).
  5. C4 #9: PatchAuthority vs PatchAuthorityV2 (626 vs 781 lines, both zero runtime callers, overlap unverified, candidate DUPLICATE).
  6. C4 #4/#13/#14: kernel CapabilityAuthority declared-dormant (no authorize method at all); IdentityAuthority BYPASSED (inline crypto minting at 3 sites); DeterministicIdAuthority competes by name.
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: no single minting/ownership enforcement; dist/ build output committed and required directly
- DEPENDENCIES: critic-archdel deletion docket; Nolan's word for deletions
- AFFECTS AGENTS: any lane wiring through authorities (impl-safety capability gate, impl-state identity)
- STATUS: OPEN. Docket path exists.
- PATCH PATH (single, authorized): program/critic-archdel DELETION-DOCKET.md (docket only, no deletions); deletions need Nolan's word (hard boundary: no destructive ops; Nolan: do not delete ORCA). OWNER: critic-archdel.

### GC-7 — APPROVAL BINDING VACUITY

- DOMAIN: authorization / lane: live path + branch + new code
- COMPONENT: approval/verification binding
- CLAIM: approvals (where they exist) do not bind to the exact proposal; changed proposals are invisible, not stale
- EVIDENCE: STATIC (source) + TEST (redteam PoCs demonstrated)
- CALLER: approver/policy / CALLEE: execution path / WRITER: C4/impl-safety/redteam / READER: cmd-ops / AUTHORITY: APPROVAL-GAP.md, GAP-ANALYSIS.md, redteam checkpoint + PoCs
- CLASSIFICATION: GENERIC CLASS — 4 instances, 3 lanes:
  1. C4 (dormant schemes, both structurally broken): gateway approvals bind patch_id only; `_evaluateApprovalConditions` has tests_passed `x||true`, replay `||true`, witness_verified hardcoded true (vacuous gate); BusinessActionAuthority binds (mission_id,capability,target) with NO args — action_id = hash of 3 fields, changed proposal yields SAME id (invisible, not stale); effect IDs collide across proposals.
  2. W2-IMPL-SAFETY gap (TRUE_GAP, load-bearing): branch REQUIRES_HUMAN_APPROVAL is a decision class, not a mechanism; `authorizeWorkOrder` authorizes WITHOUT seeing input; `issueWorkOrder` attaches arbitrary input AFTER authorization — argument smuggling across the authorize->issue seam is structurally possible.
  3. W2-REDTEAM BR-A2 (P1, EXPLOIT DEMONSTRATED): `verifyResultEnvelope` has no attempt binding; attempt-1 completed envelope re-presented as attempt 2 -> VALID; resultIdentity hashes attempt into the dedup key so replay does NOT dedupe — emits a SECOND WORKER_COMPLETED. PoC: redteam/poc/attempt-replay.js.
  4. W2-REDTEAM vs NEW CODE (ATTACK LANDED): impl-safety's own `orca_approval.js` `openInterrupt` derives writerToken = sha256(interruptId + ':' + Date.now()); Date.now() is enumerable at ms precision, so an attacker who knows the interruptId brute-forces the token and wins the single-writer CAS, defeating the checkpoint-fork protection the module was built for. PoC: redteam/poc/approval-token-predict.js. The GC-7 fix itself carries a token-predictability flaw. This must be fixed (crypto-random token) before any GO.
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: no canonical proposal envelope (principal, operation, args, target, scope, expiration, preconditions) + digest anywhere; no execution-time revalidation choke point
- DEPENDENCIES: mechanism-map record 11 (ADAPT with rank-2/rank-7 hardening, never verbatim)
- AFFECTS AGENTS: any consequential execution (impl-safety approval module, future A7 runner)
- STATUS: IN PROGRESS. W2-IMPL-SAFETY building orca_approval.js; W2-REDTEAM attacking it (GO/NO-GO pending; instance 4 blocks GO until the token is unguessable).
- PATCH PATH (single, authorized): W2-IMPL-SAFETY builds (owner of orca_approval.js); W2-REDTEAM verifies (owner of GO/NO-GO). No parallel approval implementation.

### GC-8 — /tmp WIPE DESTROYS STAGED WORK

- DOMAIN: sandbox hygiene / lane: any lane staging in /tmp
- COMPONENT: /tmp filesystem
- CLAIM: /tmp is wiped without warning mid-run; staged work is lost
- EVIDENCE: LIVE (witnessed twice)
- CALLER: lane / CALLEE: /tmp / WRITER: lane checkpoint / READER: cmd-ops / AUTHORITY: lane checkpoint
- CLASSIFICATION: GENERIC CLASS — 2 instances, 2 lanes:
  1. C1: /tmp wipe mid-run destroyed staged adapter_tip.js (data already captured in outputs — near-miss, no re-work).
  2. W2-GAUNTLET: /tmp/orca-pgcheck wiped (reinstalling pg module to scratch).
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: none in code; sandbox behavior
- DEPENDENCIES: AGENTS.md "/tmp is wiped without warning" lesson (2026-09-22)
- AFFECTS AGENTS: any lane staging files in /tmp
- STATUS: DOCUMENTED. Convention: irreplaceable work lives under ~/workspace/<lane>/work-*/, never /tmp. /tmp is for disposable bridge chunks only.
- PATCH PATH (single, authorized): workspace convention (no code). OWNER: AGENTS.md convention; coordinator briefs.

### GC-9 — CLAIM-vs-SOURCE DIVERGENCE

- DOMAIN: forensics / lane: docs and prior claims
- COMPONENT: documentation / evidence records asserting mechanisms
- CLAIM: docs/claims assert mechanisms with no source support on the inspected branch/SHA
- EVIDENCE: STATIC (grep-verified absence)
- CALLER: doc author / CALLEE: source tree / WRITER: C2/C3/C4/C5 / READER: cmd-ops / AUTHORITY: lane deliverable
- CLASSIFICATION: GENERIC CLASS — 4 instances, 4 lanes:
  1. C2 (FALSIFIED chain): claimed "MissionScheduler -> Run -> ExecutionAuthority -> ContainerExecutionAdapter -> isolated container" has NO source support; Python ExecutionAuthority is a separate unwired plane; ContainerExecutionAdapter does not exist (zero hits); no Run entity; no agent_id anywhere; 5-minute scheduler dispatch timeout does not exist; recordVerifiedResult / WORKER_COMPLETED on the live path are doc-only (evidence/2026-09-18 claims vs source).
  2. C5: orca-cli MCP/DAG/claiming README claims falsified (internal/mcp/doc.go is a 4-line stub; only 4 skeleton mechanisms real). Binding rule applied: README != IMPLEMENTATION.
  3. C4 #16: WorkspaceRegistry "exists as named authority" (prior fact) — zero matches in code/JSON/docs; PHANTOM; needs reconciliation. (R9)
  4. C3: "repaired reconciler (OPEN/KNOWN_PERMANENT/RESOLVED/REOPENED)" (prior fact) — NOT FOUND anywhere on the branch; CLAIMED-ONLY. (R7)
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: claims recorded without (repo, branch, SHA, surface) scope; no claim re-verification pass
- DEPENDENCIES: Agent 19 falsification; C1 inventory classification
- AFFECTS AGENTS: any lane consuming prior claims (impl lanes redirected correctly off C1's re-verification)
- STATUS: OPEN, correcting per-claim. The C1 re-verification that flipped R1 is the model.
- PATCH PATH (single, authorized): Agent 19 owns claim falsification (surface = claims/verdicts/forensics); C1's ORCA-INVENTORY.md owns KEEP/WIRE/MERGE/DELETE/ARCHIVE classification. OWNER: Agent 19 + C1 (no parallel claim authorities).

### GC-10 — DEAD REFERENCES / ZERO-CALLER CODE

- DOMAIN: code hygiene / lane: repo surface
- COMPONENT: unreferenced modules, dangling references
- CLAIM: code exists that no call path can reach, or references point at nothing
- EVIDENCE: STATIC (zero-caller grep audits)
- CALLER: n/a / CALLEE: dead module / WRITER: C5/C3/C2/C4 / READER: cmd-ops / AUTHORITY: PHANTOM-REGISTRY, STATE-RECOVERY-MAP, GAPS.md
- CLASSIFICATION: GENERIC CLASS — 9 instances, 5 sources (was 7; see corrections below):
  1. C5 P-1: `WorkerPort.execute()` zero production callers; executor always null.
  2. C5 P-2/P-6: zero-caller WorkerPort duplicate, dead worker subclasses. [P-5 REMOVED 02:51 UTC: FALSIFIED by critic-archdel R-2; gateway/replay/kernel/witness_authority.js has a live double-quoted require at deterministic_replay_engine.js:19 + instantiation at :28. See R11 in REGRESSION-LOG.md.]
  3. C5 P-3: `gateway/continuous_reflection_loop.js` (321 lines), zero instantiations, zero require() callers.
  4. C3: mission_executions rich shape (no live writer; migration does not create its columns), CheckpointRepository (unreferenced + schema-incompatible), AdvisoryLock (zero callers; independently verified D-20), GracefulShutdown (exists, never wired into server.js; independently verified D-21). [C3 D7 CORRECTED: checkpoint_authority.js is DEAD, not "LIVE (session scope)"; the checkpoints table has NO live writer at all (D-19). See R14.]
  5. C2: ContainerExecutionAdapter (zero hits repo-wide).
  6. C4: 10+ declared-dormant authorities with zero live callers (ApprovalAuthority, EffectAuthority, CommitAuthority, MissionExecutionAuthority, AuthorityContainer, ProposalPipeline, MergeGate...). [C4 #17 CORRECTED: witness_authority.js is LIVE via dead_letter_authority.js:35 (R-1). C4 #14 CORRECTED: deterministic_id_authority.js has a live caller chain (R-4). Both removed from the dead set.]
  7. Ledger FL-20260919-CONV-001: compose.yaml service ping-replay-worker references Dockerfile.replay which does not exist (unbuildable).
  8. critic-archdel NEW FINDS (independently verified, docket D-19..): gateway/temporal/workflows/mission_workflow.js (only requirer is dead temporal/index.js), execution_repository_port.js, capability-authority.ts (zero TS importers), MCPReference (zero consumers).
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: no dead-code reaping pass; dormant code accumulates beside live code
- DEPENDENCIES: critic-archdel docket; Nolan's word
- AFFECTS AGENTS: archaeology lanes (must distinguish dead from dormant); impl lanes (must not wire through dead code)
- STATUS: OPEN. Docket path exists. Note GC-6 (duplicate authorities) is the sovereignty-flavored subset; GC-10 is the general hygiene class.
- PATCH PATH (single, authorized): critic-archdel DELETION-DOCKET.md (docket only, no deletions). OWNER: critic-archdel; deletions need Nolan's word.

### GC-11 — PARALLEL CHAOS HARNESS DIVERGENCE

- DOMAIN: program ops / lane: chaos/gauntlet lanes
- COMPONENT: chaos-test harnesses (kill matrix + idempotency probes)
- CLAIM: two lanes independently build chaos harnesses against the same mechanism set with different substrates and no named convergence authority
- EVIDENCE: STATIC (lane checkpoints; CHAOS-A's own "noting the duplication")
- CALLER: program lanes / CALLEE: chaos harnesses / WRITER: cmd-ops / READER: parent orchestrator / AUTHORITY: wave2/gauntlet/CHECKPOINT.md, program/chaos-a/CHECKPOINT.md
- CLASSIFICATION: GENERIC CLASS — 2 lanes:
  1. W2-GAUNTLET-INFRA: Pig-bound harness (paths /home/nolan/..., PG 127.0.0.1:54339, psycopg); 8 chaos tests (coord death, DB disappear, double claim, lease expiry, result lost, stale checkpoint, timeout-after-effect, worker death); A6 witnessed re-proof = TEST-01.
  2. program/CHAOS-A: runs on THIS host (hatch), because /home/nolan does not exist here (verified via ls); cannot run the A5 modules; builds its OWN file-backed SQLite harness (schema.sql, chaos_lib.py, coord_proc.py, worker_proc.py) and re-implements the gauntlet semantics "faithfully as the behavioral spec" — behavioral re-proof of the documented A5/A6 mechanisms (mechanism-map records 1,6,7,8,10,13,14,15,17). Isolation plan: isolation_check.py gates all probes (DB path inside chaos-a, banned-token scan, socket-blocked smoke run, file-touch audit). Kill matrix: 7 stages x 2 signals x 3 reps; idempotency: duplicate delivery, redelivery storms, dedup collisions, exactly-once completion.
- CONFIDENCE: HIGH (structural; acknowledged by the lane itself)
- BROKEN BOUNDARY: no convergence authority named for which harness's verdicts count as the witnessed re-proof (TEST-01); no deconfliction of the mechanism register (both cover kill-matrix + idempotency on the same mechanisms)
- DEPENDENCIES: A6 re-proof mandate (gauntlet TEST-01); "witnessed re-proof run dozens of ways" tasking (cited by chaos-a as its mandate)
- AFFECTS AGENTS: anyone consuming chaos verdicts (impl lanes, Agent 19, parent GO/NO-GO)
- STATUS: OPEN. Keeping both as independent corroboration is defensible (different substrate = different failure modes caught), but it must be EXPLICIT: which verdicts feed TEST-01, how evidence grades differ (TEST-on-PG vs TEST-behavioral-reproof-on-SQLite), and who arbitrates a disagreement.
- PATCH PATH (single, authorized): parent orchestrator designates the convergence point: gauntlet owns TEST-01..TEST-08 verdicts; chaos-a feeds as corroborating behavioral re-proof with its own evidence grade; the parent arbitrates disagreement. OWNER: parent orchestrator. Do not build a third harness.

### GC-12 — SINGLE-QUOTE-ONLY DEADNESS GREP (methodology defect)

- DOMAIN: forensics / lane: archaeology/deletion lanes
- COMPONENT: deadness grep pattern (require/import caller search)
- CLAIM: a deadness grep that matches only single-quoted require() patterns misses double-quoted requires, producing false "zero caller" deadness claims that reach deletion dockets
- EVIDENCE: STATIC (critic-archdel DELETION-DOCKET.md R-2, falsification mechanism documented; WAVE-LEDGER.md records the methodology finding)
- CALLER: C5 phantom-hunt (deadness grep) / CALLEE: docket deletion candidates / WRITER: C5 / READER: critic-archdel / AUTHORITY: DELETION-DOCKET.md R-2 entry
- CLASSIFICATION: GENERIC CLASS — 1 confirmed falsification, pattern applies to every lane that ran deadness greps with single-quote-only patterns: C5 P-5 falsified by deterministic_replay_engine.js:19 (double-quoted require `./witness_authority` + instantiated at :28). Any lane that searched only single-quote patterns has the same blind spot. critic-archdel's own docket used single AND double quotes, so their 24 D-entries are clean on this axis; C4/C5/C3 deadness claims were otherwise independently confirmed.
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: deadness claims did not carry their grep-pattern spec (which quote forms were matched); a "zero callers" claim is meaningless without it
- DEPENDENCIES: GC-10 (every dead-reference instance from a single-quote-only grep must be re-verified)
- AFFECTS AGENTS: critic-archdel docket, C3/C4/C5 prior deadness claims, any future deletion decision
- STATUS: OPEN. Remediation (parent-ordered): re-grep ALL prior deadness claims for double-quoted requires before any of them reach a deletion decision. No deletions authorized regardless (Nolan's word required).
- PATCH PATH (single, authorized): critic-archdel owns the re-grep pass + the docket (they already use both quote forms). OWNER: critic-archdel.

---

## LOCAL ACCIDENTS (single lane)

| ID | Lane | What happened | Status | Notes |
|---|---|---|---|---|
| LA-1 | W2-IMPL-STATE | First ready-set version re-claimed RUNNING work orders (double-dispatch risk) | RECOVERED (fixed to AUTHORIZED-only; tests 16/16+24/24) | Feeds GC-5; caught by lane's own tests |
| LA-2 | W2-MISSIONS | VQ-001 "opacity:0" grep matched design opacities (0.55/0.6/0.75), claimed re-confirmation | RECOVERED (self-corrected in 2 min, 20:02 entry) | Feeds GC-3; see R4 |
| LA-3 | W2-REDTEAM | Worktree paths (/home/nolan/ping-orca-state, /home/nolan/ping-orca-safety) do not exist locally (Pig-side) | RECOVERED (read-only pigwsl-run.sh git show/grep) | Adaptation, no work lost |
| LA-4 | W2-GAUNTLET | Near-miss: run-loop.sh resolves creds from LIVE gateway env + defaults PGPORT 5432 (production DB) | PREVENTED (caught in recon; scratch env + container ping-gauntlet-pg :54339 + DATA_ROOT=/home/nolan/gauntlet-data) | Also: observe() GETs prod gateway :8080/health in try/catch (documented, incidental) |
| LA-5 | C4 | Incomplete coverage: PatchAuthority vs v2 overlap unverified; migration 009 table existence unverified; not all gateway routes audited | OPEN (lane budget) | Follow-up if authority work continues |
| LA-6 | W2-REDTEAM | policy/ dir reviewed by reference only; 10-state ledger enforcement claim rests on C1 inventory, not on redteam's read | OPEN (re-verify before GO) | Flagged in redteam checkpoint caveat |
| LA-7 | C5 | Challenge-library PHANTOM note referred to orca-remediation (outside mandated repo scope) | NOT A FAILURE (noted as context only; scope discipline held) | Recorded for completeness |
| LA-8 | W2-MISSIONS | "Two authorized business URLs" supplied nowhere -> UNKNOWN_WITH_EXACT_BLOCKER; used authorized tenants + fixtures | BLOCKED STATE (exact blocker recorded, not a failure) | Feeds mechanism-map records 18/19 UNKNOWNs |
| LA-9 | program/orca-a | F1: probe2.js H9c regex did not match the diagnostic note's lowercase ("not this file") -> 13 pass 1 fail | RECOVERED (case-insensitive regex; rerun 14/14) | Harness typo; no memory entry |
| LA-10 | program/orca-a | F2: two exec calls hit "failed to store metadata for session ... timed out after 15s registering session metadata" | RECOVERED (transient runtime hiccup; retried unchanged, succeeded) | Infra flavor distinct from GC-1 (session metadata store, not spawn DB lock) |
| LA-11 | program/chaos-a | Isolation smoke: epoch-fence test had packet stamped at old epoch (test error, not harness error) | RECOVERED (fixed to re-stamp at new epoch before zombie write; zombie write correctly rejected) | Caught during isolation proof 20:14 |
| LA-12 | infra (sandbox) | Sandbox reboot ~02:51 UTC (2026-09-24); memory pressure relieved (2789MB from 575MB) | RECOVERED (all 8 running lanes survived; runtime-managed; post-reboot activity confirmed). 1-min load 7.67 post-reboot; heavy lanes held until load < 4 | Not GC-2 (no runtime-only state was lost this time); partial tranche 2 (mem-b + 4 critics) launched 02:55 UTC |
| LA-13 | program/orca-b | Misquoted work-order ledger terminal set ("TERMINAL = COMPLETED/FAILED/VERIFICATION_FAILED/BLOCKED"); actual vendored source reads TERMINAL = ['FAILED', 'VERIFICATION_FAILED', 'CLOSED'] (no COMPLETED state; PING-mission vocabulary leaking in) | CAUGHT by critic-semantic STATIC audit (foul error #1). Orca-b lane adopts the canonical definitions; W2-IMPL-STATE's quote matches source | Single-lane misquote; not a deletion-affecting verdict |
| LA-14 | program/orca-b | Harness build accident: wrong module.exports shape + missing getActive in fake pool | RECOVERED (self-reported in own failure pipeline; harness green; no requeue) | No generic class; memory candidate declined |

---

## LEDGER-MINED CLASSES (program has not clustered these yet)

Mined from `~/workspace/FAILURE_LEDGER.md` 2026-09-23. Only classes with program relevance listed.

- LM-1 — WRONG-VANTAGE MONITORING PROBE (FL-20260919-RCA-001, FL-20260919-012): heartbeat measured the WSL virtual disk ("disk ok 6%") while host C: approached 100%; transport failure misreported as service failure (docker/postgres/gateway false-downs). Classification: MONITORING_FAILURE + MONITORING_DIAGNOSIS_DEFECT. Status: OPEN (design proposed in PING_PIG_DISK_WSL_INCIDENT_RCA.md, not implemented). Program relevance: same class as GC-3 (wrong vantage), monitoring flavor. The program's own verdicts should carry vantage fields.
- LM-2: SURFACE_DRIFT (FL-20260919-008, HEALED 2026-09-19; REGRESSED 2026-09-22 via FL-20260922-001; re-HEALED 2026-09-22 ~08:00): queue prose instructed a deprecated suppression_state value after the 2026-09-13 vocabulary migration; producer self-corrected. Regression root cause (VERIFIED): outreach/email-queue-2026-09-20.md (written 2026-09-17, round 80) carried the pre-migration instruction verbatim and the 2026-09-20 send run executed it on 4 rows; self-heal restored canonical vocabulary, verified 302 rows 0 stale. Residuals OPEN for the outreach engine: (a) append 2026-09-20 F1 send record to last_signal on the 4 rows, (b) log 09-20 F1 results in follow-ups.md, (c) 16-row count discrepancy (318 on 09-21 vs 302 on 09-22) unexplained. Lesson: healed invariants regress via stale prose written BEFORE the fix; writers of instructions need version-pinning or a pre-execution vocabulary check. Program relevance: GC-9 adjacent (prose drifts from source/schema). Watch for the same in program docs.
- LM-3 — UNKNOWN_EXECUTION QUARANTINE DISCIPLINE (FL-20260919-003, QUARANTINED): 39 intents UNKNOWN_EXECUTION; never retried; action-intent-ledger refuses them on later passes until reconciled. Program relevance: prior art for mechanism-map record 8 (OUTCOME_UNKNOWN) — the outreach engine already practices "do not convert unknown into retry."
- LM-4 — DEPENDENCY_FAILURE TRANSPORT (FL-20260919-004, OPEN): git push blocked, egress-proxy 401 (platform fault, not bad token); commits remain unpushed; PUSH_PENDING_EGRESS. Single instance. Watch: program lanes push nothing per rules, but worktree commits (30a750fad) may need push later — parent call.
- LM-5 — MISSING BUILD INPUT (FL-20260919-CONV-001, OPEN): compose.yaml references Dockerfile.replay which does not exist. Folded into GC-10 as instance 7.
- LM-6 — NO INHIBITION BETWEEN PRESSURE STATE AND OPTIONAL WORKLOAD (FL-20260919-RCA-005/006, contained): qwen3-tts-service auto-restart downloaded 4+ GB onto 96% C:; nothing gates optional heavy work on pressure state. Program relevance: wave-2 rules already encode the fix shape (bounded packets, budget envelopes, no live dispatch changes). Prior art for records 2/4 implementation.

- LM-7: STALE TRANSFER / VERIFY-RUN SKEW (FL-20260921-219, MITIGATED): local edit to a verify script was copied on-Pig WITHOUT retransferring; the Pig ran the old copy, producing a phantom verification failure. Recovery: always pigwsl-put then pigwsl-run in the same command chain; sha256 confirmation added to put output. Program relevance: Pig-based lanes (redteam, orca-a, orca-b, gauntlet) all shuttle files via pigwsl-put/run; this is the transfer-side sibling of GC-3 (verification ran against the wrong artifact version). Any Pig-verdict that cites a script must confirm the transferred hash matches the local hash.
- LM-8: BIGINTEGERS_AS_STRING TYPE DROP (FL-20260921-227, noted): pg returned a BIGINT sequence as string; a reader dropped it to null. Single instance, FYD lane. Program relevance: low for orca-finish, but a data-type trap class for any lane reading PG sequences/IDs (gauntlet, future impl lanes). Watch.

---

## OPEN GENERIC CLASSES NEEDING AN OWNER (summary)

| Class | Instances | Owner | Status |
|---|---|---|---|
| GC-1 spawn DB lock contention | 5 | parent orchestrator (spawn machinery) | recovered; needs bounded retry/backoff |
| GC-2 daemon restart wipes state | 4 lanes | parent orchestrator (briefs) | mitigated via mandatory checkpoints |
| GC-3 verification-scope misalignment | 3 | Agent 19 (shared record format: add scope fields) | OPEN |
| GC-4 synthesized dashboard data | 2 lanes / 6 inst | constitutional sprint (external); deletions via critic-archdel + Nolan | OPEN |
| GC-5 stale-claim / double-dispatch | 6 lanes / 6 inst | parent orchestrator (decision) -> impl lane; orca-a re-verifying | P0 flagged, live-path changes forbidden pending call; FC-1 fixture joins as instance 6 |
| GC-6 duplicate authorities | 3 lanes / 6 inst | critic-archdel (docket); deletions need Nolan | OPEN |
| GC-7 approval binding vacuity | 3 lanes | W2-IMPL-SAFETY (build) + W2-REDTEAM (GO/NO-GO) | IN PROGRESS |
| GC-8 /tmp wipe | 2 lanes | AGENTS.md convention | documented |
| GC-9 claim-vs-source divergence | 4 lanes | Agent 19 (falsify) + C1 (classify) | OPEN, correcting per-claim |
| GC-10 dead references | 5 sources / 9 inst | critic-archdel (docket); deletions need Nolan | OPEN (P-5 falsified out; C3 D7 + C4 #17/#14 corrected; 4 new finds docketed) |
| GC-11 parallel chaos harnesses | 2 lanes | parent orchestrator (convergence point) | OPEN |
| GC-12 single-quote-only deadness grep | 1 falsification (P-5) + all deadness claims at risk | critic-archdel (re-grep pass) | OPEN; parent-ordered re-grep before any deletion decision |
| LM-1 wrong-vantage probe | ledger | (outside program scope; noted) | OPEN in ledger |
| LM-4 push transport | ledger | parent (if worktree commits need push) | OPEN in ledger |

**Cluster counts (2026-09-23 21:30 MDT): 12 generic classes (GC-1..GC-12), 14 local accidents (12 recovered/prevented/not-failures, 2 open: LA-5, LA-6), 8 ledger-mined classes (LM-1..LM-8).**
