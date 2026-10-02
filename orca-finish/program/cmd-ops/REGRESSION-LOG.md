# REGRESSION LOG — ORCA FINISH CMD-OPS

**Lane:** CMD-OPS. **Date:** 2026-09-23 MDT (night shift).
**Purpose:** verdict stability. Track claims whose verdict flipped (FLIP), claims re-verified and holding (HOLD), and claims at risk (WATCH).
**Scope:** wave-1 claims vs wave-2/program evidence. Agent 19 cross-check (see bottom): no Agent 19 findings logged yet.
**Cycle 20:55 MDT:** 0 verdict flips. 2 new findings added to the verdict table (V16, V17). R7 (A6 re-proof) partially advanced by gauntlet TEST-A6 dispatch-phase pass.
**Cycle 21:30 MDT:** 5 verdict flips (R11-R15, all from critic-archdel's docket). Agent 19 first findings: 4 VERIFIED, 1 downgraded ("verbatim" wording). New generic class GC-12. **Cycle 21:45 MDT:** R7 resolved (R16: TEST-A6 PASS 6/6 gates, synthetic suite 9/9 PASS). ORCA-B VERDICTS.md landed (16 records; hung-worker slot-leak TEST-PROVEN). New critics' final deliverables indexed (SECURITY, SEMANTIC, PRODUCT, VISUAL critiques). New candidate classes FC-2/FC-3 (single lane, pending second instance).
**Evidence grades:** STATIC (source read) / TEST (ran code) / LIVE (witnessed live).

---

## VERDICT TABLE (key program claims)

| # | Claim | Wave-1 verdict | Wave-2/program verdict | Status |
|---|---|---|---|---|
| V1 | `feature/orca-autonomy` branch exists in /home/nolan/ping | "does NOT exist in any ref" (ledger, checked wrong repo) | C1: exists @ ae55b77ff82a893d50c48ab299117b2f705a0f03 | FLIP (R1) |
| V2 | ORCA is a facade / unwired | broad facade characterization | C1: pre-A5 engine is a facade (HOLD); A5 branch is a complete but dormant autonomous loop (FLIP, R2) | SPLIT (R2) |
| V3 | Attempt identity is missing/phantom | missing on live path (C2, mechanism-map) | impl-state: deterministic attempt IDs + durable history EXIST on feature/orca-autonomy | FLIP (R6) |
| V4 | Six PG tables must be built | C2/C3 mechanism-map recommendation | impl-state: CANCELLED (second-store risk); file-backed additive run record + ready-set built instead | FLIP (R5) |
| V5 | ExecutionEngine is unwired | C5 initial "unwired island" | C5 corrected: engine initialized + HTTP-mounted, intentionally parallel non-executing | FLIP (R8) |
| V6 | TD-001 is a defect | original finding (different branch) | W2-MISSIONS: FALSE POSITIVE on fyd-factory @ e48ef710 (both contestants + served HTML) | FLIP (R3) |
| V7 | VQ-001 static `opacity:0` reconfirmed | W2-MISSIONS 20:00 | retracted 20:02 (grep matched design opacities); runtime evidence only | FLIP (R4) |
| V8 | A5 autonomy claims | A5 substantial (C1, TEST 2026-09-18 witnessed evidence) | PROVEN by C1 (2026-09-24 01:40 UTC); A6 remediation built but witnessed re-proof still pending | HOLD (R7) |
| V9 | "Verified results emit only through recordVerifiedResult" | C1 inventory claim | redteam BR-A1: boot seed emits fabricated WORKER_COMPLETED unconditionally | FLIP (R9) |
| V10 | Result envelope is strongly attempt-bound | A5 verdict | redteam BR-A2/BR-A9: attempt NOT bound; cross-attempt replay accepted (PoC) | FLIP (R10) |
| V11 | Repaired reconciler (OPEN/KNOWN_PERMANENT/RESOLVED/REOPENED) exists on branch | prior fact (source: memory?) | C3: NOT FOUND anywhere on inspected branch; CLAIMED-ONLY | FLIP (GC-9 #4) |
| V12 | WorkspaceRegistry exists as named authority | prior fact | C4: zero matches in code/JSON/docs; PHANTOM | FLIP (GC-9 #3) |
| V13 | Live path is MissionScheduler->Run->ExecutionAuthority->container | claimed execution chain | C2: FALSIFIED (no Run entity, no container adapter, no timeout; Python ExecutionAuthority unwired) | HOLD (falsified; stable). R15 nuance: py plane is internally wired, a parallel plane with no JS invoker |
| V14 | Worker lease model (reclaim on expiry) is correct | design assumption | redteam BR-A4: correct only if lock re-validated; as built, deposed coordinator's writes not rejected | WEAKENED (fix specified) |
| V15 | Missions can execute as supervised single runs (A5 loop) | untested | W2-MISSIONS: true for both suites; A7 runner absent, A6 re-proof pending, browser capability absent | HOLD (bounded) |
| V16 | Claim primitives compared (PING vs ORCA) | untested | orca-a: PING assign() is DB-atomic (row lock); ORCA claimRun CAS provably loses updates under true concurrency (TEST H3b), safe only via advisory-lock single-writer discipline; ORCA fencing epoch is detect-not-prevent | NEW (not a flip; two-way verdict) |
| V17 | PING mission_id is idempotency-stable | assumed | orca-a H1j: NOT key-order stable (TEST); same payload mints two mission_ids. Duplicate-mission bug class | NEW (not a flip; harvest HS-1 proposed) |

---

## FLIP ROWS

### R1 - Branch existence: `feature/orca-autonomy` / commit 992e12725
- CLAIM: The branch (and commit) did not exist.
- WAS: WAVE-LEDGER "feature/orca-autonomy does NOT exist in any ref (verified 2026-09-24)" — the check ran against the website repo /home/nolan/projects/ping (vantage error).
- NOW: Branch exists in /home/nolan/ping @ ae55b77ff82a893d50c48ab299117b2f705a0f03; commit 992e12725 exists and is reachable from four branches (C1 2026-09-24 01:40 UTC).
- EVIDENCE: STATIC+LIVE (git operations on the correct repo). GRADE: TEST.
- LANE: C1 (ORCA-ARCHAEOLOGY, A5-VERDICT.md). Lesson recorded: "verification must name the repo it checked."
- CLASS: GC-3 (verification-scope misalignment).

### R2 — ORCA facade characterization splits
- CLAIM: ORCA is a facade / unwired.
- WAS: Broad characterization (facade) from pre-A5 inspection.
- NOW: Pre-A5 ExecutionEngine remains a facade (HOLD). The A5 branch contains a PROVEN (TEST, 2026-09-18 witnessed evidence), complete but DORMANT autonomous WorkOrder loop (work order -> lifecycle -> claiming -> execution -> verification -> retry -> persistence -> audit). Complete means: on /home/nolan/ping @ ae55b77ff82a893d50c48ab299117b2f705a0f03, NOT on /home/nolan/ping @ cc6856c3 (checked: no object model).
- EVIDENCE: STATIC (code) + TEST (2026-09-18 witnessed run). GRADE: TEST (not LIVE — do not claim live autonomy).
- LANE: C1.
- CLASS: claim-scope narrowing.

### R3 — TD-001 false positive
- CLAIM: TD-001 (generator defect).
- WAS: Original positive finding (different branch).
- NOW: FALSE POSITIVE on fyd-factory @ e48ef710. Confirmed by BOTH contestants and served HTML (two independent verdicts agree).
- EVIDENCE: TEST (served-HTML evidence on the named SHA). GRADE: TEST.
- LANE: W2-MISSIONS.
- CLASS: GC-3 (verification-scope misalignment).

### R4 — VQ-001 `opacity:0` static confirmation retracted
- CLAIM: "Served HTML independently re-confirms the opacity:0 motion-gating violation."
- WAS: W2-MISSIONS checkpoint 20:00 entry.
- NOW: Retracted 20:02 (2 minutes later). The grep matched decimal design opacities (0.55/0.6/0.75), not the `opacity:0`-on-content pattern. Exact static count is ZERO. The runtime VQ-001 itself stands on the external witness screenshot only (LIVE evidence held by Nolan's 2026-09-21 check).
- EVIDENCE: STATIC (corrected grep). GRADE: STATIC.
- LANE: W2-MISSIONS (self-corrected).
- CLASS: GC-3 (verification-scope misalignment: pattern vs pattern-instance confusion).

### R5 — Six-PG-table implementation plan cancelled
- CLAIM: Wave-2 should build six PG tables.
- WAS: Mechanism-map / wave-1 recommendation.
- NOW: CANCELLED by W2-IMPL-STATE after C1 proved the branch. Reason: a second store invites split-brain (mechanism-map record 12, score 1/5, "explicitly rejected"). Built instead: additive file-backed run record + ready-set on the branch substrate (commit 30a750fad; tests 16/16 + 24/24).
- EVIDENCE: STATIC+TEST. GRADE: TEST.
- LANE: W2-IMPL-STATE (GAP-ANALYSIS.md, STATE-LAYER.md, checkpoint).
- CLASS: plan correction on better evidence (not a verdict flip; no claim was asserted false).

### R6 — Attempt identity: missing -> present on branch
- CLAIM: Attempt identity is missing (mechanism-map record 1? no — the C2 live-spine finding; redteam attack premise).
- WAS: Live path has no attempt identity (C2, CORRECT for /home/nolan/ping @ cc6856c3).
- NOW: On feature/orca-autonomy @ ae55b77ff, deterministic attempt IDs (uuidv5 on work-order key) + durable attempt history + attempt counter with epoch fencing EXIST (verifyResultEnvelope records per-attempt data).
- EVIDENCE: STATIC+TEST (impl-state, read against the branch). GRADE: STATIC (redteam: "verify on branch before writing" applied).
- LANE: W2-IMPL-STATE; redteam cross-verified on the branch.
- CLASS: surface scoping (both true on different surfaces; the "missing" claim never applied to the branch).

### R7 — A5 restart safety narrowed (A6 re-proof still open)
- CLAIM: A5 proves autonomy is restart-safe.
- WAS: A5 claims could be read as complete autonomy.
- NOW: A5 proven (TEST, substantial). But A6 witnessed restart proof FAILED (2026-09-18: PG advisory locks lost on restart, coordinator never recovered). A6 remediation code EXISTS on the branch (recovery_decisions.js, orca_control_loop.js recovery section) but has NOT been witnessed re-proven — that is precisely W2-GAUNTLET TEST-01. A7 continuous runner never existed.
- EVIDENCE: TEST (witnessed failure + unwitnessed fix). GRADE: TEST.
- LANE: C1 + W2-GAUNTLET.
- CLASS: claim boundary (proven part vs unproven part separated).

### R8 — Engine "unwired" -> parallel non-executing
- CLAIM: ExecutionEngine is an unwired island.
- WAS: C5 initial checkpoint entry.
- NOW: Engine is initialized and HTTP-mounted (health, registration, status, dispatch). It is deliberately non-executing: dispatchToAssignment() builds a prompt artifact and returns it. "Parallel to execution," not "unwired."
- EVIDENCE: STATIC. GRADE: STATIC.
- LANE: C5 (self-corrected in-checkpoint).
- CLASS: characterization correction.

### R9 — `recordVerifiedResult` exclusivity falsified (redteam BR-A1)
- CLAIM: Verified results emit only through `recordVerifiedResult`.
- WAS: C1 inventory claim.
- NOW: `_seedBusinessEvents` (orchestration loop) emits fabricated WORKER_COMPLETED on EVERY gateway boot, UNCONDITIONALLY — bypassing the verified path. Verified results can emit through this second path too (the seed is not quarantined from it).
- EVIDENCE: STATIC. GRADE: STATIC. (Fix proposed: emit seeded results through a `recordSeededResult` path clearly marked synthetic.)
- LANE: W2-REDTEAM.
- CLASS: single-channel assumption broken.

### R10 - Result envelope attempt-binding falsified (redteam BR-A2/BR-A9)
- CLAIM: Result envelopes are strongly bound to their attempt.
- WAS: A5 verdict characterization ("strongly bound").
- NOW: `verifyResultEnvelope` has NO attempt binding; attempt-1 completed envelope re-presented as attempt 2 -> VALID, and emits a SECOND WORKER_COMPLETED (resultIdentity hashes attempt into the dedup key, so replay does not dedupe). Separately, rendezvous result is attributed to the current attempt counter rather than the producing attempt (BR-A9).
- EVIDENCE: STATIC + PoC (redteam/poc/attempt-replay.js). GRADE: TEST.
- LANE: W2-REDTEAM.
- CLASS: GC-7 (approval/verification binding vacuity).

### R11 - C5 P-5 falsified: `gateway/replay/kernel/witness_authority.js` is LIVE (critic-archdel R-2)
- CLAIM: Dead WitnessAuthority copy (zero require() callers, near-duplicate) -> DELETE candidate.
- WAS: C5 PHANTOM-REGISTRY.md P-5: zero require() callers (C5's grep matched single-quoted requires only).
- NOW: FALSIFIED. `gateway/replay/kernel/deterministic_replay_engine.js:19` requires `./witness_authority` with DOUBLE quotes (which C5's grep missed) and instantiates it at `:28` (`new WitnessAuthority(witnessVersion)`). The engine is required by `gateway/kernel_replay_execution_provider.js:14`, wired into the live ReplayWorker path via gateway_runtime. Real, live use.
- EVIDENCE: STATIC (require-closure + live-path trace). GRADE: STATIC.
- LANE: program/critic-archdel (DELETION-DOCKET.md R-2).
- CLASS: GC-12 (single-quote-only deadness grep). This is the incident that named the class.
- EFFECT: GC-10 instance for P-5 removed; deletion rejected.

### R12 - C4 #17 wrong: `gateway/witness_authority.js` is LIVE (critic-archdel R-1)
- CLAIM: witness_authority.js belongs only to the dormant cluster.
- WAS: C4 AUTHORITY-BOUNDARY-MAP #17: dormant.
- NOW: LIVE. Saving caller: `gateway/dead_letter_authority.js:35` requires it and USES it at `:144` (`witnessAuthority.createWitness(deadLetter, {...})`); dead_letter_authority is required by `gateway_runtime.js:91` and sits on the live DLQ path (`MissionScheduler._failMission` -> `recordDeadLetter`).
- EVIDENCE: STATIC. GRADE: STATIC.
- LANE: program/critic-archdel (DELETION-DOCKET.md R-1).
- CLASS: verification-scope (live-path trace beats closure assumption).
- NOTE: the sovereignty question (WitnessWorker builds attestations inline vs this singleton) remains open; deletion rejected.

### R13 - C4 #14 incomplete: `deterministic_id_authority.js` has a live chain (critic-archdel R-4)
- CLAIM: deterministic_id_authority is dormant / only workflow_identity_authority.js touches it.
- WAS: C4: "only workflow_identity_authority.js" (dormant reading).
- NOW: LIVE chain, all links verified real: `gateway_runtime.js` -> `gateway/routes/constitution.js` -> `gateway/bootstrap/wiring.js` -> `gateway/temporal_scheduler_provider.js` -> `ping-runtime/authorities/workflow_identity_authority.js` -> `deterministic_id_authority.js`. C4's characterization was incomplete, not merely wrong.
- EVIDENCE: STATIC. GRADE: STATIC.
- LANE: program/critic-archdel (DELETION-DOCKET.md R-4).
- CLASS: claim-scope (dead requirers elsewhere in gateway/constitutional_* do not affect the verdict).

### R14 - C3 D7 wrong: `gateway/checkpoint_authority.js` is DEAD, not live (critic-archdel D-19)
- CLAIM: checkpoint_authority is the LIVE session-checkpoint writer.
- WAS: C3 STATE-RECOVERY-MAP D7: "LIVE (session scope)".
- NOW: DEAD. Zero references to `checkpoint_authority` repo-wide; not in the 189-file live closure. The only two `INSERT INTO checkpoints` statements in the repo are this file (`:92`, session shape) and D-18 (mission shape) -> both dead. **The checkpoints table has NO live writer at all.** C3's LIVE classification is falsified by closure + zero-reference grep.
- EVIDENCE: STATIC. GRADE: STATIC.
- LANE: program/critic-archdel (DELETION-DOCKET.md D-19).
- CLASS: GC-10 (new dead instance; the inverse of R11-R13 : here the live claim was wrong).

### R15 - Python ExecutionAuthority "unwired plane" -> internally-wired parallel plane (critic-archdel R-8)
- CLAIM: Python ExecutionAuthority is a separate unwired plane (C2 GC-9 instance 1).
- WAS: "ContainerExecutionAdapter does not exist; Python ExecutionAuthority is a separate unwired plane; no Run entity."
- NOW: "unwired plane" is inaccurate. Real imports: `runtime/tool_router.py:14`, `runtime/supervisor.py:18`, `runtime/constitutional_runtime.py:21`, `runtime/constitutional_event_loop.py:40`, `runtime/cognitive/worker_protocol.py:16`, `projection_replay.py:20`, plus `tests/test_runtime_authority_boundaries.py:8`. The Python runtime is internally wired; it is a parallel plane with no JS invoker (no gateway JS file spawns Python or references constitutional_runtime.py).
- EVIDENCE: STATIC. GRADE: STATIC.
- LANE: program/critic-archdel (DELETION-DOCKET.md R-8).
- CLASS: characterization correction (nuance, not a dead/live inversion). Updates V13 note.
- EFFECT: the Python/JS plane boundary is an architecture question, not a deletion.

---

## AGENT 19 CROSS-CHECK

Agent 19's brief: falsify wave-1 conclusions; surface = claims/verdicts/forensics; record format shared with cmd-ops.
- Agent 19 checkpoint (20:02 MDT): plan phase only. Step 1 (read checkpoints) done; no findings logged yet.
- Probe artifact landed: agent19/probes/mission_scheduler_under_test.js (vendored mission_scheduler copy for the hung-worker STATIC test, attack plan item 2). **No result logged yet as of 20:55 MDT.** Re-check on the next 30-minute sweep.
- No FALSIFICATION-RECORD.md yet. Nothing to cross-check this sweep.
- Related: orca-a independently corroborated wave-1 gaps (GAP 1/3/5 re-confirmed) but that is verification, not Agent 19's falsification mandate. Chaos-a kill probes (3 SURVIVED) are corroborating TEST-BEH evidence.

### R16 - R7 resolved: TEST-A6 witnessed re-proof PASSES (wave2/gauntlet GAUNTLET-RESULTS.md)

- CLAIM: A6 "remediation unwitnessed; witnessed re-proof pending" (W2-IMPL-STATE + W2-REDTEAM).
- WAS: ORCA-A VERDICTS.md 20:55 MDT cycle: A6 dispatch-phase pass only; attempt 2 hung on Hermes env issue; R7 partially advanced.
- NOW: TEST-A6 PASS 6/6 gates (executed 2026-09-24 ~02:00-03:00 UTC on the Pig against scratch `ping_gauntlet` only): real loop SIGKILLed mid-dispatch (pid 16911); work order RUNNING with dispatch_pid=16931 durably recorded; run 2 re-acquired the advisory lock, reconcileStartup() ran BEFORE any dispatch, attempt-1 classified DISPATCH_LOST and re-authorized as NEW attempt-2 (never re-run as attempt-1); durable budget 1/2 not reset; attempt-2 Hermes worker produced zero output in 180s timeout -> honest failed envelope, canonical WORKER_FAILED event, budget exhausted 2/2, escalated to human (exit 3); no duplicate delegation; objective left ACTIVE. Synthetic suite 9/9 PASS (worker death, coord death, timeout-after-effect, double claim, lease expiry, stale checkpoint, result lost, ack lost, db disappear).
- CAVEAT (lane's own, verdict stands): worker failure was environmental (Hermes CLI hangs >60s); the honest-failure path was witnessed instead of the success path. A re-run when Hermes is healthy would witness success; every crash-recovery gate is proven.
- EVIDENCE: TEST (durable scratch state). GRADE: TEST.
- LANE: wave2/gauntlet.
- CLASS: recovery (mechanism-map record 21 PATTERN_ONLY -> now TEST-proven).

### Agent 19 findings (20:17-20:30 MDT, first results landed)
- C5 wiring claim VERIFIED (gateway_runtime.js:326-336 DOC-CONTRACT + :793 /orchestration mount; engine initialized). Not falsified.
- C3 claim 2 ancestry VERIFIED: all 3 commits exist, none ancestor of HEAD cc6856c3b.
- C3 claim 1 zero-hit INDEPENDENTLY REPRODUCED (0 hits for KNOWN_PERMANENT/REOPENED; no renamed equivalents on HEAD).
- C2 GAP12 scope VERIFIED: no JS caller of py ExecutionAuthority (py consumers = supervisor/constitutional_event_loop/tool_router; no subprocess spawn from JS). Consistent with critic-archdel R-8 (internally wired py plane, no JS invoker).
- P-7 substance VERIFIED (engine.js:618-619 0.85/auto_scan literals); "verbatim" wording DOWNGRADED (paraphrase, not verbatim). Precision correction; substance holds.
- FALSIFICATION-RECORD.md still pending. Next: TEST harnesses (hung-worker wedge vs real mission_scheduler.js; identity key-order nondeterminism), 524-test clean-worktree recon, C7 G-03 spot check.
- **21:30+ MDT note:** Agent 19's wedge-test.js probe has landed (hung-worker wedge vs vendored mission_scheduler: 8 checks; hung dispatch sticks in _processing, Arrow 0 renews every poll, Arrow 2 starves, reaper never reclaims), but the checkpoint has NOT logged the run result yet. Cross-check on next sweep. No FALSIFICATION-RECORD.md yet.
- Infra note: Pig wrapper flaking (session metadata timeouts); switched to direct ssh+base64 transport. Same flavor as LA-10.
- Related: orca-a independently corroborated wave-1 gaps (GAP 1/3/5 re-confirmed) but that is verification, not Agent 19's falsification mandate. Chaos-a kill probes (3 SURVIVED) are corroborating TEST-BEH evidence.

## WATCH LIST (claims at risk, not yet flipped)

- W1: impl-safety modules are STAGED, not committed. Any claim about orca_approval.js/orca_capability.js properties must be treated as design intent until tests + GO/NO-GO land. **orca_approval.js token flaw confirmed still unfixed 20:55 MDT (lines 288, 325).**
- W2: redteam findings rest on read-only pigwsl-run.sh greps; PoCs currently two files (attempt-replay.js, approval-token-predict.js). Eight vector attacks (P1-P7) still to execute; GO/NO-GO pending.
- W3: gauntlet results pending (TEST-01..TEST-08). A6 re-proof partially advanced: TEST-A6 dispatch phase COMPLETE (TEST, 20:05 MDT): coordinator SIGKILLed mid-dispatch; reconcileStartup classified DISPATCH_LOST, attempt-2 re-authorized, no duplicate delegation. Attempt-2 hung on Hermes env issue (outside A6 scope). Grader run; full artifact review in progress. Still the single highest-value pending flip (R7).
- W4: orca-a verdicts LANDED (VERDICTS.md, 20:55 MDT). Strengthen GC-5, corroborate C1/C2 gaps; no flips. New defect: PING mission_id key-order instability (see V17).
- W5: program/critic-security verdicts pending; could flip the XSS seam local accident (LA-8 context) into a generic class if sibling render paths fail.
- W6: WAVE-LEDGER.md updated 02:40 UTC (C5 completion + CMD-OPS incident); orca-a, critic-security, mem-a still unregistered. Staleness reduced but not closed.
- W7 (NEW 20:55 MDT): PING MissionRuntime.create idempotency key is not key-order stable (orca-a H1j, TEST-demonstrated): same logical payload mints two mission_ids. Duplicate-mission bug class; harvest HS-1 proposed. Not a verdict flip (no prior claim asserted stability); watching for whether it flips any "idempotent creation" claim.
- W8 (NEW 20:55 MDT): chaos-a behavioral re-proof vs gauntlet PG re-proof convergence (GC-11). Chaos-a record 3 classified DUPLICATED (worker-crash -> duplicate delegation unless idempotent effect keys) feeds GC-5 as instance 5. Parent must designate which harness's verdicts count as witnessed re-proof (TEST-01).
- W9 (NEW 20:55 MDT): LM-7 (stale Pig transfer). Pig-based lanes (redteam, orca-a, orca-b, gauntlet) must confirm transferred hash matches local hash before citing Pig-run verdicts (GC-3 flavor).
- W10 (NEW 21:30 MDT): parent-ordered re-grep of ALL prior deadness claims for double-quoted requires before any deletion decision (GC-12). Owner: critic-archdel. No deletions authorized regardless (Nolan's word required; queued for morning brief).
- W11 (NEW 21:45 MDT): vocabulary collision: W2-IMPL-STATE's `readyWorkOrders` treats COMPLETED/FAILED/VERIFICATION_FAILED/BLOCKED/CANCELLED as terminal work-order `state` values, colliding with the OrcaStatusLedger vocabulary (VERIFIED/CLOSED, no COMPLETED) (critic-semantic foul error #2, STATIC). Unverified whether these are the same field; must be resolved before merge.
- W12 (NEW 21:45 MDT): chaos-a candidate classes FC-2 (no-retry-on-pool-drop wedges the loop) and FC-3 (non-durable dispatch intent lost on pre-write coordinator death) have runnable repro fixtures but are single-lane so far; not yet generic per the 2-lane rule. FC-1 already joined GC-5 as instance 6. FC-3's fix direction is proven by probes/run_durable_intent.py (3/3 SURVIVED).
