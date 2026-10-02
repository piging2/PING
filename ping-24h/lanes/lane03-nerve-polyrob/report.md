# LANE 3: Donor Archaeology - Nerve + POLYROB

**Status: HYPOTHESIS until replayed from a clean checkout.** This report was built from fresh `--depth 1` clones (not from wave-1 lane trees), with every mechanism spot-verified in the pinned trees. It is still a hypothesis until an independent replay confirms the mechanism cards against clean checkouts. READ ONLY was maintained throughout; no donor tree was modified, no commit made, no secret touched.

T+0 = 2026-09-28 14:26 MDT. Focus: recovery, attempt identity, UNKNOWN handling, restart semantics.

---

## Donor card: Nerve

- **Repository:** https://github.com/ClickHouse/nerve
- **License:** Apache-2.0 (Copyright 2026 ClickHouse, Inc.)
- **Current SHA:** f9566d0f (matches wave-1 pin)
- **Version/date:** 0.1.0 in pyproject.toml (placeholder; ships off trunk); latest commit 2026-09-28 11:21:11 -0400 (merge PR #464 "actor-username-fallback")
- **Activity:** very active; PRs in the 460s; large current test suite (resume-after-restart, workflow recovery, orphan sessions, cron catchup)
- **Language:** Python 3.13 (daemon: FastAPI + uvicorn + asyncio), TypeScript/React (web UI)
- **Deployment model:** single-process daemon; no Docker, no message queue, no separate DB server. Single-user runtime; no tenant concept
- **Persistence model:** one SQLite DB (~/.nerve) via aiosqlite as durable state; SDK-native conversation transcripts on disk (~/.claude/projects/...) as the actual resume materialization
- **Task/attempt model:** sessions (thin wrappers over Claude Code CLI / Codex SDK subprocesses); workflow runs (budget-capped multi-agent jobs with CAS-guarded statuses); review loops (implementer/verifier legs with leg-attempt rows); cron jobs (APScheduler)
- **Idempotency:** CAS terminal transitions (transition_workflow_run); pre-generated run IDs (outbox); delete-then-drive resume queue; CAS claim on review-loop leg dispatch
- **Recovery model:** orphan sessions demoted to IDLE/STOPPED (nothing auto re-driven); workflow runs fail-closed on restart; review loops dispatch on the run row's ACTUAL status; cron catchup fires each overdue job exactly once per restart with a success-only watermark (known flaw, see M4 below)
- **Restart model:** startup recovery passes in order (orphans, workflow runs, review loops, cron); opt-in re-drive via a queue file written by `nerve restart --resume` and drained at startup
- **Lease handling:** weak. No explicit lease primitive; resume keys are sdk_session_id + connected_at; kill grace / quiescence timeouts are wall-clock bounds; claim locks are not a concept outside review-loop legs
- **UNKNOWN-state semantics:** implicit, not typed. Paid work interrupted by restart is collapsed into `failed` (fail-closed but lossy: external effect unknown). Resume target validation treats a missing native transcript as unknown and starts fresh. No explicit UNKNOWN state exists in the status lattice
- **Failure semantics:** paid work fails closed and is never re-issued; unrecoverable loop states park in `awaiting_user`; spend is recomputed from the ledger, never trusted from cached columns; terminal transitions have exactly one winner
- **Tests:** tests/test_resume_after_restart.py, tests/test_workflow_runs.py, tests/test_sessions.py, tests/test_review_loops.py (sampled by wave-1 lane B; not re-run here, read only)

---

## Donor card: POLYROB

- **Repository:** https://github.com/theselfruleorg/polyrob
- **License:** MIT
- **Current SHA:** a869af97 (matches wave-1 pin; 1.1.0 release commit)
- **Version/date:** 1.1.0 released 2026-09-21
- **Activity:** steady cadence (0.11.0 08-19, 0.12.0 08-21, 0.13.0 09-08, 1.0.0-1.0.3 09-16 to 09-19, 1.1.0 09-21)
- **Language:** Python 3.11+ (JS only for webview console); ~36 base runtime deps (pydantic, aiohttp, aiosqlite, apsw, sqlite-vec, numpy, openai/anthropic/google-genai SDKs); zero cloud deps for core
- **Deployment model:** self-hosted single-user autonomous agent (resident orchestrator + CLI); tenant-scoped data dirs
- **Persistence model:** 37 sidecar SQLite stores + relational bot.db; goals.db is a single-host SQLite file, which is what makes pid-based claim liveness answerable exactly
- **Task/attempt model:** goal board rows with a deterministic status lattice (triage -> waiting -> ready -> running -> done|blocked; cancelled terminal) and CAS claims (claim_lock=`goal-dispatch-<pid>`, claim_expires); typed framework-executed acceptance checks; evidence-judge completion labeling
- **Idempotency:** CAS claim UPDATE guarded by status='ready' AND claim_lock IS NULL; DuplicateGoalError 7-day title-dedup (trigram similarity); exact-claim-identity CAS on the boot sweep
- **Recovery model:** cold-start sweep requeues `running` goals WITHOUT failure increment, gated by three-valued claim liveness and CAS on the exact claim identity; unconditional maintenance (reclaim_stale, age_out_blocked, reconcile_waiting) runs before any enabled-gate on every dispatch tick
- **Restart model:** requeue_running_on_boot() called ONCE at process start, before any ticker; every start_autonomy() re-runs the sweep (which is why the second-worker double-run guard exists)
- **Lease handling:** claim_expires TTL per claim; ReentryBudget persisted rows with wall-clock timestamps and 7-day staleness drop; monotonic clock used in-memory, wall-clock required when a store is attached (documented and enforced)
- **UNKNOWN-state semantics:** EXPLICIT and three-valued (claim_liveness.py): True (alive), False (provably gone), None (undeterminable; resolves to "wait one TTL", never to requeue-or-fail). Completion labels verified/unverified evidence-derived. Documented weak point: the completion judge fails OPEN (unclear = pass), so an unverified completion can still land `done`, though it is honestly labeled and excluded from learning
- **Failure semantics:** consecutive_failures at max_retries moves goals to blocked via circuit breaker; blocked escalates to owner on critical lanes; objective lifetime budgets (SPENT = no new round); salvaged (no-done()) runs accepted only when typed checks passed, labeled as such
- **Tests:** tests/unit/agents/task/goals/ (board, claim, intervention guards), tests/unit/cron/test_wake_gate.py, run-outcome tests (per wave-1 lane C; not re-run here, read only)

---

## Nerve mechanism cards

### N1: Single-winner CAS terminal transitions with fail-closed restart and spend-from-ledger

**PROBLEM:** Concurrent finishers (monitor kill vs natural completion vs manual kill vs restart pass) can double-apply terminal side effects (duplicate notifications, double journal finalize, double budget accounting). A restart interrupting paid work could re-issue it unmetered.

**INVARIANT:** Exactly one caller owns a run's terminal side effects, decided atomically by the database; spend is recomputed from the ledger, never trusted from incrementally-maintained columns.

**MECHANISM:** `transition_workflow_run()` (nerve/db/workflow_runs.py) issues `UPDATE ... WHERE id = ? AND status IN (expect)` and returns True only when `rowcount == 1`; the docstring states "Returns True only for the caller that actually flipped the row - the winner owns the terminal side effects." At startup, WorkflowRunService CAS-flips every pending/running row to `failed` with error "interrupted by nerve restart", writes a journal event, notifies the user, and NEVER re-issues ("a paid job can never burn unmetered" is the design doctrine from the module). ReviewLoopService._recover_one() recomputes settled spend via `sum_loop_spend()` and corrects the cached `spent_usd` column on any mismatch; interrupted legs settle `max(recorded, run spent_usd)` so a restarted loop cannot spend the same budget twice.

**WHY IT WORKS:** Ownership of the terminal transition is decided by a single atomic compare-and-set instead of read-then-write; failure is the only safe default for unmetered paid work; the ledger is the ground truth for money while cached counters are treated as hints.

**FAILURE IT PREVENTS:** Duplicate terminal side effects from racing finishers; unmetered paid execution after restart; double-spending the same budget across restarts via stale cached spend columns.

**ASSUMPTIONS:** Single-process SQLite (writes serialized by aiosqlite); failure-as-terminal is an acceptable policy for paid work; the human explicitly re-drives if the work is still needed. The outbox-attempt INSERT and start_run are in one transaction, so re-issue under the same ID is identity-safe.

**PING EQUIVALENT:** ORCA's per-operation idempotencyKey + reconciliationState + retryEligibility; the UNKNOWN -> HOLD -> reconciliation doctrine; PING's typed failure semantics.

**PING STRONGER-WEAKER-DIFFERENT:** PING is STRONGER on policy (typed UNKNOWN, HOLD and SUPERSEDED states, silence-is-never-consent). Nerve's contribution is DIFFERENT: it is a mechanical benchmark for the enforcement path PING's doctrine needs. One specific asymmetry: Nerve collapses restart-interrupted paid work into `failed` (lossy but safe); PING's HOLD distinguishes timeout/failure/unknown and keeps the unit observable. Adopt the CAS shape and the spend-from-ledger rule; do not adopt the collapse.

**TEST WE CAN STEAL:** (1) concurrent finishers single-winner: race natural completion, monitor kill, and manual kill at the same row; assert exactly one terminal side effect (one journal finalize, one notification). (2) restart spend conservation: interrupt a budget-capped run mid-flight, restart, assert total spend across restart equals the ledger sum, not ledger + cached column.

**CODE WE ACTUALLY NEED:** none. The CAS UPDATE shape is ~20 lines; adopt the pattern, not the file. The recovery-pass shape (fail-closed for paid, human re-drive) is a policy PING's reconciler can express in its own terms.

**VERDICT: MECHANISM BENCHMARKED**

### N2: Drain-before-drive resume queue, quiescence gate, and kill-TOCTOU re-read

**PROBLEM:** Three distinct restart races: (a) a resume-after-restart queue processed lazily lets a resumed turn that itself crashes re-enroll and re-run ids; (b) a replacement leg dispatched while the previous leg's CLI process is still alive double-executes with side effects; (c) a kill landing between the loop dispatch CAS and start_run orphans a paid run.

**INVARIANT:** Recovery drains in-flight and old work before driving any new work; a replacement executor is never started while the previous executor may still be alive; dispatch authority is re-verified after the effect is issued.

**MECHANISM:** `resume_enrolled_sessions()` (nerve/agent/engine.py:1589) reads the resume queue file once and DELETES it before driving any turn: "a resume that itself restarts re-enrolls cleanly and no id is ever re-run"; each still-resumable session gets one internal continue turn under the system actor, with archived/external/no-sdk-id sessions skipped. `_quiesce()` (review_loop.py:895) waits for the previous leg's session to report no running session and no live background tasks before starting the replacement, with a kill_grace_seconds+15 deadline; on timeout it logs and proceeds (documented fail-open with warning). After `start_run`, the kill TOCTOU check re-reads the loop row; if the loop is no longer in a running status, the just-dispatched leg is killed immediately.

**WHY IT WORKS:** Deleting the intent-to-drive before acting removes the re-enrollment path structurally; quiescence serializes executors in wall-clock terms so at most one leg's CLI is plausibly alive; the post-dispatch re-read closes the kill race window that no pre-dispatch check can cover.

**FAILURE IT PREVENTS:** Restart-loop re-enrollment (crash during resume re-runs the same session); double execution by live-plus-replacement legs; orphan paid legs after a kill lands mid-dispatch.

**ASSUMPTIONS:** Quiescence is wall-clock bounded and fails open on timeout (a truly stuck process can still be double-driven; the log line is the only guard). `is_session_running` accurately reports executor aliveness. The kill path itself is assumed to work.

**PING EQUIVALENT:** The first-pass findings already harvested Pioneer's atomic recovery claim (lease + terminal-authority fencing: no valid lease AND no terminal authority required before recovery owns a unit). Nerve's quiescence gate is the executor-liveness half of that rule; drain-before-drive matches ORCA's reconciler ordering (drain in-flight attempts before dispatching new work).

**PING STRONGER-WEAKER-DIFFERENT:** PING is STRONGER on the authority half (lease + terminal-authority fencing, authority never inferred from row shape). Nerve contributes a DIFFERENT, smaller mechanical piece PING's reconciler design does not yet name: an explicit quiescence gate (prove the old executor is dead, or bound the wait, before the replacement dispatches) per dispatched unit. Pair them: authority fencing decides WHO may own recovery; quiescence decides WHEN the replacement may start.

**TEST WE CAN STEAL:** (1) resume-queue crash test: crash between queue drain and turn completion; assert the crashed id is never re-run on the next boot and the queue file is gone. (2) quiescence test: kill a leg, dispatch a replacement immediately, assert replacement start is delayed until the old executor reports dead (or the bounded deadline fires and is logged).

**CODE WE ACTUALLY NEED:** none as a library. Adopt delete-then-drive as a startup ordering rule in ORCA's reconciler, and the quiescence-gate shape (bounded wait on executor aliveness with logged timeout) before replacement dispatch of external executors.

**VERDICT: NEW INVARIANT FOUND**

### N3: Crash-window convergence by dispatching on the run row's ACTUAL status (outbox with pre-generated IDs)

**PROBLEM:** A crash lands in windows no single status covers: the leg finished but the loop never advanced (loop says running, run says done); the attempt row was inserted but start_run never ran (attempt exists, run row missing); the attempt row was never inserted at all.

**INVARIANT:** Recovery reads the child's actual status, never the parent's remembered status; dispatch intent is persisted with a pre-generated identity before the effect exists, so re-issue is identity-safe.

**MECHANISM:** ReviewLoopService._recover() "dispatch[es] on the current run row's ACTUAL status - including the crash window where a leg finished but the loop never advanced." Terminal runs are routed into the completion queue. When a run row is missing but the attempt row exists, the leg is re-issued with the SAME pre-generated run_id (the outbox contract, documented at review_loop.py module top: "the attempt row + loop-state CAS commit in one transaction with a pre-generated run id BEFORE start_run - a crash can never orphan a paid leg or leave a state with no child"). When neither row exists, the state is parked for a human ("Loop state had no dispatched leg after restart"), never synthesized.

**WHY IT WORKS:** Parent state may lie about child state after a crash; the child's row is one step closer to the actual external effect. A pre-generated ID turns "was it dispatched?" from a state question into an identity question: re-issuing under the same ID cannot create a second leg.

**FAILURE IT PREVENTS:** Orphaned paid legs (loop state with no child, money reserved nowhere); double dispatch of the same leg under a new ID after a crash; crash-window stall where a finished leg never advances the loop; synthesized recovery state.

**ASSUMPTIONS:** Attempt INSERT and loop-state CAS commit atomically (single SQLite transaction); run IDs are unique; the SDK transcript resume path is executor-internal and unchecked by Nerve (documented: crash mid-turn loses the turn in Nerve's store; resume is the SDK's transcript, which Nerve neither checkpoints nor guards).

**PING EQUIVALENT:** ORCA's per-operation idempotencyKey and reconciliationState; the UNKNOWN external effect -> HOLD -> reconciliation doctrine.

**PING STRONGER-WEAKER-DIFFERENT:** PING is STRONGER on the unknown half: PING keeps "leg finished but loop never advanced" observable as an unknown-outcome reconciliation problem; Nerve's substrate treats the paid-run case as failed-and-done and leaves the loop-level case to a human decision card. The outbox-with-pre-generated-ID is a benchmark implementation of PING's idempotencyKey shape and should be compared line by line with ORCA's port-lane reconciler contract.

**TEST WE CAN STEAL:** (1) outbox crash injection: crash between attempt INSERT and start_run; on recovery assert exactly one leg exists under the pre-generated ID and no duplicate ID. (2) parent/child divergence: loop row says running, run row says done; assert recovery routes the run to completion rather than re-dispatching or parking.

**CODE WE ACTUALLY NEED:** none. The shape is the benchmark; ORCA's reconciler should be checked against it (do we dispatch on the operation's actual effect state, or on the mission's remembered state?).

**VERDICT: MECHANISM BENCHMARKED**

### N4 (negative): cron catchup watermarks only successful runs

**PROBLEM:** `_catchup_missed_jobs` fires each overdue job once per restart and records a watermark on last SUCCESSFUL run.

**INVARIANT VIOLATED:** A job that crashes mid-run has no finished_at, so the watermark does not advance; the next restart fires it again. The design docs claim "no double execution"; for cron catchup that claim is falsified by the watermark semantics.

**MECHANISM:** Observed in nerve/cron/service.py; lane B verified: catchup-fired job crashing mid-run re-fires on the next restart.

**WHY IT MATTERS:** This is the same failure class as duplicate execution after restart that the whole program exists to kill. The fix direction is the outbox pattern from N3 (record dispatch, not success) or a run-attempt row keyed by the missed window.

**TEST WE CAN STEAL:** the negative test: crash a catchup-fired job mid-run, restart, assert it does NOT re-fire (currently it does; the test documents the donor's gap and guards PING's own scheduler against it).

**CODE WE ACTUALLY NEED:** none; this is a do-not-import.

**VERDICT: ASSUMPTION FALSIFIED** (Nerve's "no double execution" claim does not hold for cron catchup; harvest the negative test only)

---

## POLYROB mechanism cards

### P1: Three-valued claim liveness (UNKNOWN is mechanical, not just doctrine)

**PROBLEM:** A cold-start sweep must requeue work left `running` by a dead process WITHOUT ripping live claims from a second, still-running worker sharing the same goals.db. Absence of evidence of the owner's death is not evidence of death, and a wrong guess double-runs the goal (in their case, a stream leg could carry its money grant twice).

**INVARIANT:** Claim liveness is three-valued: ALIVE / PROVABLY GONE / UNKNOWN. UNKNOWN resolves to "wait one reclaim TTL", never to requeue-or-fail.

**MECHANISM:** agents/task/goals/claim_liveness.py: `claim_owner_alive(claim_lock)` parses `goal-dispatch-<pid>` from the claim string; `os.kill(pid, 0)` raising ProcessLookupError -> False (provably gone); PermissionError -> True (alive, owned by another user); unrecognized claim shape or OSError on the probe -> None (undeterminable). The module docstring states the cost asymmetry explicitly: "the cost of waiting is one reclaim_stale TTL and the cost of guessing wrong is a concurrent double-run." The boot sweep requeues only when the claim is expired/absent OR when liveness is PROVABLY False, and the requeue UPDATE is a CAS on the exact (id, claim_lock, claim_expires) identity read moments earlier, so a heartbeat or fresh claim landing between read and write cannot be clobbered.

**WHY IT WORKS:** The probe is exact on a single host (goals.db is a local file, so pid identity is meaningful); the cost asymmetry is written down and the code implements the fail-safe direction; the CAS on exact claim identity closes the read-write race.

**FAILURE IT PREVENTS:** Double dispatch of a claim held by a live second worker; treating deploy restarts as goal failures (the pre-fix bug: two deploys mid-goal silently `blocked` it via reclaim_stale failure increments); stale-completion write-down where the original run's record_success CAS misses after its row was ripped.

**ASSUMPTIONS:** Same-host SQLite (pid meaningful; the code documents that a shared-filesystem multi-host board would need a host-qualified claim). PID reuse within the TTL window is an honest residual risk. Claim string shape is trusted.

**PING EQUIVALENT:** PING's UNKNOWN-as-legitimate-state doctrine (2026-09-27, Nolan): UNKNOWN is HEALTHY/UNHEALTHY/UNKNOWN with typed reasons; absence of evidence is not evidence of absence. PING's reconciler HOLD states.

**PING STRONGER-WEAKER-DIFFERENT:** PING is STRONGER at doctrine level (typed UNKNOWN states across health, outcomes, and claims). POLYROB's contribution is DIFFERENT and SMALLER: it makes UNKNOWN a mechanical return value of the liveness probe itself, with the fail-safe direction chosen by documented cost asymmetry. This is the exact shape of probe PING's lease/claim liveness checks should return: not a boolean, a three-valued verdict where undeterminable means wait.

**TEST WE CAN STEAL:** `test_claim_owner_undeterminable_does_not_requeue`: an unrecognized claim shape (or a probe that raises) resolves to wait-one-TTL, never to requeue-or-fail. This is the unit-test form of PING's UNKNOWN -> HOLD rule.

**CODE WE ACTUALLY NEED:** none as a library; the function is 30 lines and single-host specific. Adopt the three-valued probe signature and the cost-asymmetry documentation pattern for PING's own claim-liveness checks.

**VERDICT: UNKNOWN MADE EXPLICIT**

### P2: Evidence-derived verified/unverified completion labels; unverified completions never enter learning

**PROBLEM:** Autonomous completions feed learning loops (skill formation, lesson mining). An unverified success claim compounding into durable skills or policy is a self-reinforcing error loop: the system learns from wins it never actually earned.

**INVARIANT:** A completion's verification bit is derived from evidence, and unverified completions never enter learning or canonical pipelines.

**MECHANISM:** Typed framework-executed acceptance checks (artifact_glob, http_ok, file_contains) run deterministically first; unknown check types fail closed. A cheap aux model then judges the agent's completion claim against the framework-recorded action ledger (completion_judge.py): met -> `verified`, unmet -> failure (claim contradicted by evidence), unclear/error/timeout -> `done (unverified)` (the run completes because a framework for arbitrary goals must not hard-block fuzzy work, but the label is honest everywhere). The background skill reviewer refuses autonomous sessions outright: "an AUTONOMOUS run's completion is UNVERIFIED at this point ... and unverified activity must not compound into durable skills" (background_review.py:110-118). `run_outcome.verified` defaults to `"unverified"`.

**WHY IT WORKS:** Labeling and learning consumption are split at different boundaries: the judge may fail open on the label (unclear = pass, documented as deliberate) while the learning boundary stays fail-closed (autonomous = unverified = no reviewer fork, no skill distillation). The default is the safe value, so any path that forgets to set the bit still excludes the run.

**FAILURE IT PREVENTS:** Unverified wins compounding into durable skills and lessons; "model claimed success, everyone believed it" reinforcement; a single judge failure poisoning the policy.

**ASSUMPTIONS:** The aux-model judge is honest enough for met/unmet distinction (their own docs admit judge failures; the fail-open direction is a documented weak point, not a hidden one). The framework action ledger is complete. Typed checks are correctly typed by the goal author.

**PING EQUIVALENT:** ORCA outcome classification; result envelopes; Jev (classify, never authorize); PING's target learning loop (OUTCOME -> candidate lesson -> evidence -> hypothesis -> replay/counterfactual -> falsification -> promotion).

**PING STRONGER-WEAKER-DIFFERENT:** PING is STRONGER on the learning loop's principled stages (hypothesis, counterfactual evaluation, falsification) and on typed failure semantics. POLYROB's contribution is a NEW INVARIANT candidate at the consumption boundary: default-unverified, evidence-derived verification bit, learning surfaces that refuse unverified input as a structural property rather than a policy note. PING's loop should check whether its learning consumption boundary is this mechanical or merely documented.

**TEST WE CAN STEAL:** `test_unverified_completion_excluded_from_learning`: a `done (unverified)` episode is not consumable by the skill/canonical pipeline; assert at the consumption boundary, not at the judge.

**CODE WE ACTUALLY NEED:** none. Adopt the invariant and the default-unverified shape; do not adopt the aux-model judge as an authority (PING's falsification stages are stronger).

**VERDICT: NEW INVARIANT FOUND**

### P3: Crash-surviving ReentryBudget for forged self-wake turns

**PROBLEM:** Self-wake (forged continuation turns re-entering an idle session) can self-trigger: a wake's output triggers another wake, ping-ponging indefinitely and burning money. An in-memory depth cap grants a free reset to any loop that crashes the process mid-storm. A separate allow()/record() pair has a TOCTOU off-by-one letting two concurrent producers exceed the cap.

**INVARIANT:** Forged re-entry is bounded by a persisted depth cap plus idle backoff, reset ONLY by genuine user turns; a crash never grants a free reset.

**MECHANISM:** agents/task/agent/core/self_wake.py `ReentryBudget`: per-session max reentries + minimum idle spacing between forged wakes. `try_consume()` is atomic allow()+record() under a single lock (the docstring documents the exact TOCTOU off-by-one it avoids). Rows persist to the autonomy state store with wall-clock timestamps (the store REQUIRES a wall clock because monotonic resets across processes; without a store it keeps legacy monotonic). On hydrate after restart, stale rows older than 7 days are dropped; store errors fail open to in-memory-only. `reset()` is called only on genuine user turns. Forged bodies are wrapped in untrusted-data delimiters so job output is data, never instructions.

**WHY IT WORKS:** The budget survives the process boundary, so the guardrail is crash-proof by construction rather than by hope; atomic consume removes the concurrent-producer race; genuine-user-only reset prevents the loop from resetting its own leash; wall-clock-vs-monotonic is handled explicitly instead of hoped away.

**FAILURE IT PREVENTS:** Runaway self-wake storms (unbounded self-triggering loops); crash-granted free retries mid-storm; concurrent producers exceeding the cap by one; a forged turn's payload hijacking the agent via injected instructions (delimiter framing).

**ASSUMPTIONS:** Single-worker scope (process-local singleton plus one store). Producers must call `try_consume()` rather than the split pair (enforced by code review and the documented warning, not by the compiler). Wall clock is sane. Fail-open on store errors means a broken store silently weakens the guard; the failure is logged but not alarmed.

**PING EQUIVALENT:** ORCA's self-wake / tripwire economy; PING's wake cadence controls; the planned work frontier's wake budget.

**PING STRONGER-WEAKER-DIFFERENT:** DIFFERENT and SMALLER. PING has wake cadence policy; POLYROB has the smallest crash-safe mechanical implementation of a wake budget this lane found (~150 lines including persistence). The honest soft spot is the delimiter framing of forged content: UP-06 markup is the entire safety boundary for self-wake output, and one skipped path is an injection. PING's version should type forged content at the data layer (kind/source metadata enforced by code), not rely on markup.

**TEST WE CAN STEAL:** `test_reentry_budget_survives_restart`: persist rows, simulate a crash mid-storm, assert the depth cap and backoff still bind after rehydrate; stale rows older than 7 days drop. Also `test_try_consume_atomic`: two concurrent producers cannot exceed max_reentries.

**CODE WE ACTUALLY NEED:** none as a dependency; the module is small enough to re-derive. If PING wants the exact shape, the port is the try_consume atomicity plus the wall-clock-on-persist rule, with typed forged-turn metadata replacing the delimiter wrapper.

**VERDICT: SMALLER IMPLEMENTATION FOUND**

---

## Cross-cutting notes

1. **Both donors converge on the same recovery grammar:** drain old work before driving new work (Nerve delete-then-drive; POLYROB maintenance-before-dispatch on every tick), prove the old owner is gone before a replacement acts (Nerve quiescence; POLYROB three-valued liveness), and make terminal transitions single-winner (Nerve CAS; POLYROB exact-claim CAS). PING's reconciler should be checked against all three, not just one.

2. **The UNKNOWN gap between the donors is instructive:** POLYROB makes UNKNOWN mechanical in the liveness probe; Nerve has no typed UNKNOWN and collapses restart-interrupted paid work into `failed`. PING's doctrine (UNKNOWN is legitimate, HOLD is a state) is stronger than both, but the mechanical probe shapes live in the donors. The falsification to run: does PING's reconciler have a three-valued liveness probe anywhere, or is UNKNOWN only a doctrine?

3. **Do-not-import list (rejections):** POLYROB's LLM goal planner (model-authority over the work frontier), its "idle is failure" STALLED BOARD doctrine, and judge-fails-open as a completion authority; Nerve's cron catchup success-only watermark and its system-principal resume; both donors' env-var/derived secret handling (weaker than PING's broker). POLYROB's `.pending` skill quarantine + owner-only promote is a good invariant but outside this lane's mission scope; noted for the learning lane.

4. **Useful tests harvested (beyond the cards):** wake-gate baseline test (`test_wake_gate_fingerprint_requires_successful_baseline`: a persistently failing job must never be skipped; identical-state fingerprint skips the paid wake only after a successful baseline run); stranded-waiting reconciliation test (waiting goal behind a dead prerequisite chain detected dead on fresh read); planner empty-run backoff test. All are small, deterministic, and portable to PING's wake/tripwire economy.

## Verification ledger

- Clones: fresh `--depth 1` of https://github.com/ClickHouse/nerve (HEAD f9566d0f, 2026-09-28) and https://github.com/theselfruleorg/polyrob (HEAD a869af97, 2026-09-21); both SHAs match the wave-1 pins.
- Licenses confirmed from pyproject.toml + LICENSE files: Apache-2.0 (Nerve), MIT (POLYROB).
- Spot-verified in the pinned trees: workflow_runs.py CAS docstring + UPDATE shape; review_loop.py module docstring (outbox doctrine), _dispatch_leg (quiescence call, kill TOCTOU re-read), _quiesce, _recover/_recover_one (actual-status dispatch, same-ID re-issue, spend recompute, human park); engine.py resume_enrolled_sessions (delete-then-drive); service.py startup fail-closed pass; claim_liveness.py (three-valued probe, cost asymmetry); board.py requeue_running_on_boot (exact-claim CAS) + reclaim_stale; dispatcher.py judge verdict flow (met/unmet/unclear) and verified labeling; background_review.py autonomous-exclusion; self_wake.py ReentryBudget (try_consume atomicity, wall-clock rule, 7-day staleness); cron/wake_gate.py baseline-outcome rule.
- Not verified (read-only, out of scope): runtime behavior of any of these paths; test suite execution; issue/PR cadence beyond the pinned commits; wave-1 lane B/C claims I did not re-read (noted where relied upon).
- No PING canonical tree access in this lane; PING STRONGER-WEAKER-DIFFERENT comparisons are against the workspace lane trees and standing docs per the first-pass findings, and remain hypotheses pending the canonical-tree pass.
