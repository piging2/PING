# ORCA Terminal Verdict — 2026-09-24

**Terminal verdict: FAIL** (ORCA INCOMPLETE)
**Auditor:** FYD sprint execution worker (independent, read-only on repos)
**Scope:** coordinator-claimed A5 on branch `feature/orca-autonomy` (5 unpushed commits), plus bounded synthetic proofs of the five orchestration properties Nolan locked 2026-09-24 ~19:04 MDT.

## A5 audit table (claim -> evidence -> verdict)

| # | Claim | Evidence (reproduced, not trusted) | Verdict |
|---|-------|------------------------------------|---------|
| 1 | Commit `992e12725` "ORCA autonomy: real orchestration layer above PING constitutional spine" | `git show --no-patch`: SHA 992e127255582f75f5574502ab70662c793848d9, 2026-09-18, on `feature/orca-autonomy` | VERIFIED |
| 2 | Commit `8899087a3` A5 certification record | `git show`: SHA 8899087a33496d8625cd264ebaa24d4f7da5ca7a, 2026-09-18, adds `orca/control-loop/A5-CERTIFICATION-RECORD.md` (338 lines) | VERIFIED |
| 3 | Commit `00b1194fe` A6 witnessed restart proof (FAIL) | `git show`: SHA 00b1194fe6409f1f21618d780bf913f175759080, carries a6-restart-proof + both run evidence dirs | VERIFIED |
| 4 | Commit `b323f91cf` crash windows A-E + idempotency matrix | `git show`: SHA b323f91cf6ebd1be0958f6becfc0f07044bdde90 | VERIFIED |
| 5 | Commit `5c23e2f7c` hardening falsification sweep | `git show`: SHA 5c23e2f7cb0655bd3e6d10c689847e7cda8f20dc | VERIFIED |
| 6 | All 5 commits UNPUSHED | `git branch -r --contains 992e12725` -> empty; no remote-tracking ref contains any of the 5 | VERIFIED |
| 7 | Test counts: engine.metrics.test.js 5/5 | `node --test engine.metrics.test.js` on Pig -> 5 pass, 0 fail | VERIFIED |
| 8 | Test counts: measure.test.js 9/9 | `node --test measure.test.js` -> 9 pass, 0 fail | VERIFIED |
| 9 | Test counts: validate_dispatcher_profiles.js 64/64 | `node validate_dispatcher_profiles.js` -> "PASS: 64 assertions" | VERIFIED |
| 10 | Event IDs in evidence (run mu6x9eeh): `aaa09271...` WORKER_FAILED, `74cdadc5...` WORKER_COMPLETED, `76e92260...` t2 WORKER_COMPLETED | grep over `evidence/run-2026-09-18T12-15-43-145Z/` -> all 3 present, multiple references | VERIFIED |
| 11 | Event IDs in evidence (run mu6wmbzn): `bce4d7cb...` t1, `bf88809f...` t2 WORKER_COMPLETED | grep over `evidence/run-2026-09-18T11-57-46-931Z/` -> both present | VERIFIED |
| 12 | Result IDs: verify-t1-a1 `d331fff8...` (WORKER_FAILED), verify-t1-a2 `b8d80bc2...` (WORKER_COMPLETED), mu6wmbzn-t1 `ecc5013d...` | read from verify-*.json directly; bindings event_id<->result_id<->work_order_id internally consistent | VERIFIED |
| 13 | File count: 90 files, 7234 insertions, 32 deletions (87 added + 3 modified) | `git diff --shortstat 099927152 992e12725` -> "90 files changed, 7234 insertions(+), 32 deletions(-)" | VERIFIED |
| 14 | t2 causation: follow-up workorder caused by t1's WORKER_COMPLETED event | `workorder-t2.json` causation_id = `74cdadc5...` (run mu6x9eeh) and `bce4d7cb...` (run mu6wmbzn) | VERIFIED |
| 15 | Secret safety of the 5 commits | Prior audit verified; no new claim made here; this audit printed no secret values | NOT RE-RUN (out of scope for this pass) |

Discrepancies found during this audit (do not overturn A5):
- **New:** the certification record's truncated `result_id` for verify-t1-a1 (`d331fff84e3e17bb0a4b...`) does not match the file's full value (`d331fff84e3e17bb0a1affa59c11e2f49dc7eb0a4a0d2d891cda46b84c6a349b`) at characters 17-18 (`4b` vs `1a`). Transcription defect in the record; the file chain itself is internally consistent. Previously recorded discrepancies (90-vs-88 file count resolved; worker-templated envelope timestamps classified as worker-originated metadata defect) stand.

## Orchestration proof results (bounded synthetics, Pig WSL)

Proof script: `~/workspace/orca-audit-proof/proof.js` (kept as audit scratch). Scratch DATA_ROOT `/tmp/orca-audit-scratch` (cleaned). No production PG writes were made by any synthetic (canonical emit path `recordVerifiedResult` was deliberately not invoked).

| Property | Method | Result |
|----------|--------|--------|
| Real WorkOrder execution | adapter `authorizeWorkOrder` (hermes/text.summarize, fail-closed constraints) -> granted; `issueWorkOrder` -> deterministic envelope id; idempotent re-issue same id. A5 evidence independently re-read: dispatch-t1-a2.json envelope extracted from worker stdout with real PG data; verify-t1-a2 binds WORKER_COMPLETED `74cdadc5...` <-> result `b8d80bc2...` | PASS |
| Autonomous follow-up | t2 workorder `causation_id` = t1's WORKER_COMPLETED event in both A5 runs (claim 14); recovery policy `decideRecovery('worker-reported failed (retryable)')` -> AUTO_EXECUTE attempt+1 | PASS |
| Genuine timeout-to-retry (A5-era) | A5 evidence run mu6x9eeh: attempt 1 `timedOut:true` -> WORKER_FAILED `aaa09271` -> policy retry-attempt-plus-1 -> attempt 2 WORKER_COMPLETED `74cdadc5` | PASS (as A5-era claim; superseded by H5 in worktree, see below) |
| Durable blocked orders survive restart | Phase 1: register objective, authorize work order, `blockWorkOrder`, set OUTCOME_UNKNOWN. Phase 2 (fresh node process): block entry intact, state OUTCOME_UNKNOWN, `isWorkOrderBlocked`=true, terminal for automatic paths | PASS (12/12 checks) |
| No auto-retry after UNKNOWN (H5) | `classifyDispatchOutcome`: {timedOut} -> POST_BOUNDARY_UNKNOWN (with or without rendezvous); transport failure -> PRE_BOUNDARY; normal -> KNOWN. Release: unknown-decision refused, missing-reason refused, cancel -> BLOCKED + logged decision, retry-after-reconcile refused when budget exhausted, granted (AUTHORIZED) with budget left and unknown attempt still counted | PASS for the timeout window — **with the caveat below** |
| Lease expiry never turns UNKNOWN back into CREATED | `objective-runtime.js` contains no lease/reaper on durable work orders (only the PG advisory-lock coordinator claim, which is session-scoped and SIGKILL-safe by DB semantics); `WORK_ORDER_TTL_MS` is only an envelope deadline field, never a state flip | PASS for the durable work-order layer |

## Why the terminal verdict is FAIL

Two findings, either of which blocks "ORCA complete":

1. **The coordinator-crash window still auto-retries after an unknown outcome.** `reconcileRunningWorkOrder` (committed code): on startup, a RUNNING work order whose dispatcher is dead and which left no rendezvous after the 30s wait is reset to `AUTHORIZED` with "re-dispatch allowed as a new attempt within budget" (`lost-redispatchable`). A dead dispatcher with no rendezvous is an indeterminate dispatch outcome — the worker may have executed. Re-dispatching it is an automatic retry after an unknown outcome: the same defect class as the A6 FAIL proof (`00b1194fe`: "no durable reconstruction; duplicate delegation"), which has never been overturned by a post-remediation witnessed restart proof. Commit `6a342dd27` remediated identity/lock/reconciliation, not this re-dispatch.
2. **H5 HOLD semantics exist only as uncommitted worktree state.** The timeout-window HOLD behavior (OUTCOME_UNKNOWN + `blocked-work-orders.json` + `releaseBlockedWorkOrder`) lives in uncommitted modifications to `orca_control_loop.js` / `orca_status_model.js` and the untracked `orca_unknown_block.js` (dated 2026-09-24, another worker's H5 harvest work). The committed branch HEAD still does timeout -> honest-failed-envelope -> retry (A5-era semantics). Any worktree reset loses the HOLD behavior the proof table above relies on.

Also open and adjacent (recorded, needs Nolan per house rules): the PING mission-layer `reapExpiredLeases` can reset a mission to `created` and re-dispatch ~60s after a HOLD record — an automatic retry of an unknown-outcome mission at the mission layer. ORCA work orders do not flow through MissionRuntime, but `recovery_decisions.js` documents mission-lease-expiry -> AUTO_EXECUTE retry "through the existing mechanism", so the mission layer does not honor H5.

## First remaining broken arrow

`reconcileRunningWorkOrder` lost-redispatchable path: after a coordinator crash, a RUNNING work order with a dead dispatcher and no rendezvous is automatically re-authorized for re-dispatch. The dispatch outcome is unknown (worker may have executed). Fix direction (proposed, NOT applied — no commit, no worktree edit): extend H5 to the crash window — mark such work orders OUTCOME_UNKNOWN + blocked, requiring a recorded operator decision, instead of re-authorizing. A witnessed restart proof (SIGKILL during dispatch -> restart -> assert OUTCOME_UNKNOWN-blocked, zero re-dispatch) is the acceptance test. This needs Nolan's word: it changes retry behavior another worker may be mid-testing (evidence runs from 2026-09-24T01-59Z exist in the worktree), and the mission-layer reaper gap is already flagged as needing his design call.

## 22-dimension checklist — unknown-effect class

Checked against: dispatcher, worker, timeout, lease, retry, restart, reaper, HOLD, reconciliation, receipt, effect identity, UI status.

- input: `classifyDispatchOutcome(null)` -> KNOWN. A missing dispatch outcome classifying as KNOWN is wrong-by-default; callers always pass the object today. Minor; noted, not patched.
- contract: adapter `issueWorkOrder` fail-closed field validation verified live (denied without constraints/missionId/correlationId/contextPackId/resultPath/deadline/input). PASS.
- authority: ORCA never emits canonical events; only `adapter.recordVerifiedResult` via PING's UnifiedEventRuntime writes. No second execution authority created. PASS.
- identity: work_order_id from (objective_id, task_key), attempt_id from (work_order_id, attempt_number); RUN_ID is correlation-only. PASS.
- persistence: durable objective/work-order/blocked-set via atomic file writes; proven to survive process restart synthetically. PASS.
- transaction: **DEFECT (proposed, not applied).** The loop calls `blockWorkOrder` (file) THEN `updateWorkOrder` (state). Crash between leaves: block entry exists + state still RUNNING/AUTHORIZED. `releaseBlockedWorkOrder` then refuses with `unexpected-state:<state>` — the work order is blocked and un-releasable through the sanctioned path. The module docstring describes the opposite write order ("work-order update written before the blocked file"), so doc and code disagree. Safe fix direction: make `releaseBlockedWorkOrder` recognize the crash-window (block entry present, state not OUTCOME_UNKNOWN, no live dispatch) and complete the decision while recording the true prior_state — requires a proof run, not applied.
- retry: pre-boundary transport failure re-plans within budget; post-boundary timeout never auto-retries (H5, worktree). Retry-after-reconcile refuses on exhausted budget. PASS (worktree).
- restart: startup reconciliation runs before dispatch; blocked and terminal work orders untouched; coordinator advisory lock prevents dual coordinators. PASS, except the lost-redispatchable arrow above.
- replay: status ledger transitions are evidence-backed (each edge names an artifact). PASS.
- projection: N/A (no projections on this path).
- tenant: namespace `core::system`; NAMESPACE_RE enforced at authorize. PASS.
- privacy: no PII in work-order records; evidence files are operational. PASS.
- authorization: every dispatch passes `authorizeWorkOrder`; denial is terminal-escalate, never self-granted. PASS.
- cache: N/A (no caching on this path).
- search/vector: N/A.
- serialization: envelope extraction is strict JSON; protocol failure is non-retryable escalate. PASS.
- UI: status model gained the EVIDENCE_PENDING -> BLOCKED (H5) edge in the worktree; ledger transitions name evidence files. PASS (worktree).
- observability: `[orca-loop:<stage>]` logs + reconcile-startup.json + per-attempt dispatch JSONs. PASS.
- test: 5/5 + 9/9 + 64/64 reproduced. The H5 worktree changes have no committed tests. GAP: no regression test pins the HOLD behavior.
- deployment: H5 is uncommitted — not deployable as-is. GAP.
- rollback: uncommitted H5 can be lost by reset; committed branch retains A5-era timeout-retry. Documented above.
- memory: durable attempt_history preserves the unknown attempt and counts it against budget. PASS (synthetic proof p2).

## Proposed diff (NOT applied — no commit, no worktree edit, per task bounds)

For the transaction crash-window defect: in `orca_unknown_block.js`, extend `releaseBlockedWorkOrder` so a present block entry with a non-OUTCOME_UNKNOWN state is treated as a crash-window (not a stale entry): verify no live dispatch (dispatch_pid absent/dead), then apply the recorded decision and log `prior_state` as the actual state. And/or swap the loop's write order to match the docstring (state first, then block entry) — but the swap alone does not restore releasability, it only changes which half is missing. Either change needs a witnessed crash proof before it is safe to land; left for Nolan/another worker.

## Files

- Verdict: `~/workspace/sprint-2026-09-24/orca-terminal-verdict.md` (this file)
- Audit proof script: `~/workspace/orca-audit-proof/proof.js`
- Worktree examined: `/home/nolan/worktrees/orca-autonomy` (branch `feature/orca-autonomy`), read-only; no commits, merges, pushes, or restarts performed. Pig scratch cleaned.

## Standing facts for the parent

- Do NOT touch `fyd/sprint-integration-2026-09-24` (untouched).
- ORCA was not deleted; no second execution authority was created.
- Another worker is active in `/home/nolan/worktrees/orca-autonomy` (uncommitted H5 edits + evidence runs `run-2026-09-24T01-59-21-553Z`, `run-2026-09-24T01-59-29-669Z`); my audit did not disturb them.
- No secret values were printed at any point.
