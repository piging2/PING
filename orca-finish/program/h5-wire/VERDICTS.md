# H5 BRANCH WIRING — verdicts
Lane: H5 BRANCH WIRING (parent orchestrator label b3bfb978-5866-4df1-add1-c1f0b6ac44f8)
Date: 2026-09-24
Branch: /home/nolan/worktrees/orca-autonomy @ ae55b77ff82a893d50c48ab299117b2f705a0f03
Status: WIRED + STAGED-PROVEN. Changes uncommitted in the worktree (per task).

## Record H5-W1 — unknown-block wired into the loop

DOMAIN: orca-b / COMPONENT: NEW `orca/control-loop/orca_unknown_block.js` +
timeout branch + pre-dispatch gate in `delegate()` + blocked skip in
`reconcileStartup()` (`orca/control-loop/orca_control_loop.js`) + new
EVIDENCE_PENDING -> BLOCKED edge (`orca/control-loop/policy/orca_status_model.js`)
(A5 branch, uncommitted) / CLAIM: work that crossed a side-effect boundary
with an indeterminate outcome is now blocked from auto-claim and auto-retry
in the branch loop; only an explicit recorded decision (or idempotent-keyed
reconcile by the operator) releases it — the T2/T3 timeout residual is closed /
EVIDENCE: TEST (staged harness `probes/h5-harness.js` on the Pig against the
REAL branch modules: 30/30 — 12 blocked-set gate incl. both release decisions
and 4 fail-closed refusals; 4 dispatch classification incl. T2/T3 replays and
the pre-boundary control; 4 ledger incl. the new H5 edge and no automatic
BLOCKED exit; 1 terminal vocabulary; 6 static wiring proofs on the real loop
file; 3 t_timeout_after_effect staged end-to-end replays) + TEST (W2 baseline
replay on Pig node: orca_ready_set.test.js 16/16, orca_run_record.test.js
24/24) + STATIC (worktree diff reviewed: timeout branch contains no
timeoutEnvelope/classifyRetry/recordVerifiedResult/extractEnvelope;
`timeoutEnvelope()` retained and marked RETIRED BY H5, not deleted) /
CALLER: `delegate()` dispatch loop (timeout path), `delegate()` pre-dispatch,
`reconcileStartup()` / CALLEE: `unknownBlock.classifyDispatchOutcome`,
`unknownBlock.blockWorkOrder`, `unknownBlock.isWorkOrderBlocked`,
`unknownBlock.releaseBlockedWorkOrder` (operator-only) / WRITER: loop
(block entries, attempt outcomes, decisions log); operator (release decisions
only) / READER: `delegate` pre-dispatch gate, `reconcileStartup`, auditors
(blocked-work-orders.json + decisions[]) / AUTHORITY: coordinator for the
automatic block (timeout declaration is evidence, not a claim about the
worker); human/operator for release / CLASSIFICATION: ORCA STRONGER→HARVEST
(H5 now wired, was spec-only) / CONFIDENCE: high for the specified semantics
(staged-proven on real modules); medium that no other auto path resurrects a
blocked order (static enumeration of updateWorkOrder call sites; no live
timeout fired during this lane) / BROKEN BOUNDARY: the branch's timeout path
previously resolved ambiguity as failed + fail-path retry (at-least-once) —
now OUTCOME_UNKNOWN + blocked; the restart-reconcile DISPATCH_LOST path still
re-authorizes (deliberately untouched: LIVE-proven in TEST-A6, drill owner's
U4 decision pending) / DEPENDENCIES: H1, H2, H4 / AFFECTS AGENTS: orca-b,
w2-impl-state (their OUTCOME_UNKNOWN/blockedWorkOrderIds semantics now have a
branch counterpart), w2-missions (drill D2 gap (i): the loop now implements
the unknown classification the drill's (b) expects on the timeout path).

## Record H5-W2 — OUTCOME_UNKNOWN as terminal-except-administrative-decision

DOMAIN: orca-b / COMPONENT: `WORK_ORDER_TERMINAL_STATES` in
`orca_unknown_block.js`, sourced by the loop's `TERMINAL_WORK_ORDER_STATES`;
`releaseBlockedWorkOrder` decision table (A5 branch) / CLAIM: OUTCOME_UNKNOWN
is terminal for every automatic loop path; the only exits are the two
recorded operator decisions ('cancel' -> BLOCKED/'cancelled-after-outcome-unknown';
'retry-after-reconcile' -> AUTHORIZED within the durable attempt budget) /
EVIDENCE: TEST (harness g1/g4/g6: OUTCOME_UNKNOWN in the terminal set;
AUTHORIZED/RUNNING not terminal; release 'cancel' lands terminal BLOCKED;
release 'retry' preserves attempt_count against the budget; exhausted budget
refuses and stays blocked; 4 fail-closed refusals) + STATIC (ledger
TRANSITIONS: BLOCKED has no edge to AUTHORIZED/QUEUED/RUNNING — exits are
human-driven BLOCKED->PLANNED / BLOCKED->CLOSED only) / CALLER: (future)
operator via `releaseBlockedWorkOrder`; loop never calls it / CALLEE:
`rt.updateWorkOrder`, blocked-file atomic write / WRITER: operator (decision);
loop (block entries) / READER: auditors (decisions[] log is append-only) /
AUTHORITY: operator for the decision; the block itself is automatic /
CLASSIFICATION: ORCA STRONGER→HARVEST / CONFIDENCE: high (staged) /
BROKEN BOUNDARY: none introduced; note the branch has no run record, so the
W2 "terminal-except-administrative-cancel on the run record" is mapped onto
the durable work-order record (the branch's analog) — documented in the module
header, not hidden / DEPENDENCIES: H5-W1 / AFFECTS AGENTS: orca-b,
w2-impl-state.

## Record H5-W3 — blockedWorkOrderIds plumbed into reconcile and pre-dispatch

DOMAIN: orca-b / COMPONENT: `isWorkOrderBlocked` gate in `reconcileStartup()`
(skip: "leaving untouched") and in `delegate()` pre-dispatch (Escalation:
"refusing to auto-claim") (A5 branch) / CLAIM: a blocked work order id is
never auto-claimed or auto-retried by either the reconcile path or the
pre-dispatch path, even when its durable state reads AUTHORIZED / EVIDENCE:
TEST (harness g1: blocked ids refused, unblocked ids unaffected; g5 static:
both call sites present in the real loop file; g6: post-release the gate
opens) + STATIC (reconcile's terminal-state check also catches
OUTCOME_UNKNOWN via the extended TERMINAL_WORK_ORDER_STATES — two layers
agree) / CALLER: `reconcileStartup`, `delegate` / CALLEE:
`unknownBlock.isWorkOrderBlocked` / WRITER: n/a (read path) / READER:
`reconcileStartup`, `delegate` / AUTHORITY: the durable blocked file
(objectives/<objective_id>/blocked-work-orders.json) / CLASSIFICATION:
ORCA STRONGER→HARVEST / CONFIDENCE: high (staged) / BROKEN BOUNDARY: none /
DEPENDENCIES: H5-W1 / AFFECTS AGENTS: orca-b.

## Record H5-W4 — timeout-after-effect T2/T3 closed (branch behavior now)

DOMAIN: orca-b / COMPONENT: `dispatchHermes` coordinator-timeout branch in
`delegate()` (A5 branch) / CLAIM: matrix cases T2 (worker completed before
180s, drop written, coordinator timed out) and T3 (worker still running at
180s, completes later, late drop) now resolve as OUTCOME_UNKNOWN — not
requeued, not marked success, not marked failed — where the branch previously
emitted an honest failed envelope and fail-path-retried (at-least-once) /
EVIDENCE: TEST (harness g2: timeout ± rendezvous -> POST_BOUNDARY_UNKNOWN;
g6: staged T2/T3 replays land OUTCOME_UNKNOWN + blocked, attempt history
carries TIMED_OUT_POST_BOUNDARY, no canonical event, no retry; pre-boundary
control unchanged) + STATIC (timeout branch has no recordVerifiedResult,
extractEnvelope, classifyRetry, or timeoutEnvelope call) / CALLER: `delegate`
dispatch loop / CALLEE: classifier + block + Escalation (no adapter call on
this path) / WRITER: loop (attempt_history, dispatch artifact, blocked file,
durable OUTCOME_UNKNOWN) / READER: operator (dispatch artifact +
rendezvous_collected flag as reconcile evidence), auditors / AUTHORITY:
coordinator (timeout declaration) / CLASSIFICATION: ORCA STRONGER→HARVEST /
CONFIDENCE: high for the classification change (staged); the live race U1
(orphaned Windows Hermes child) remains static-only and is now the
operator's reconcile problem rather than a silent at-least-once retry /
BROKEN BOUNDARY: closed — the T2/T3 residual from record 15 no longer exists
on the timeout path / DEPENDENCIES: H5-W1, H7 (H7's honest-envelope mechanism
is superseded on this path by honest-unknown; the envelope function is
retained, marked retired) / AFFECTS AGENTS: orca-b, w2-missions.

## Open UNKNOWNs (this lane's status)
- U1 (T2/T3 live race, orphaned Windows Hermes child): still OPEN /
  static-only. This lane makes the coordinator's classification honest
  (no more FAILED claim) and gives the operator the reconcile point; the
  Pig Windows timing experiment is still the way to observe it live.
- U4 (drill D2(b) vs DISPATCH_LOST bounded re-delegation): still OPEN /
  needs the drill owner's decision. This lane deliberately did not touch
  `reconcileRunningWorkOrder`'s DISPATCH_LOST -> AUTHORIZED path
  (LIVE-proven in TEST-A6).
- New: no live timeout has fired through the wired path yet (no live run
  during this lane). First live post-boundary timeout will be the
  LIVE-grade proof; the staged proof stands until then.

## Verdict table (this lane)

| # | Mechanism | Verdict | Evidence | Confidence |
|---|---|---|---|---|
| H5-W1 | unknown-block wired into loop | ORCA STRONGER→HARVEST | TEST (30/30 staged, real modules) + STATIC | high |
| H5-W2 | OUTCOME_UNKNOWN terminal-except-decision | ORCA STRONGER→HARVEST | TEST + STATIC | high |
| H5-W3 | blocked set in reconcile + pre-dispatch | ORCA STRONGER→HARVEST | TEST + STATIC | high |
| H5-W4 | T2/T3 timeout residual closed | ORCA STRONGER→HARVEST | TEST (T2/T3 replays) + STATIC | high (staged) / med (live race U1) |

## Artifacts
- [CHECKPOINT.md](sandbox://workspace/orca-finish/program/h5-wire/CHECKPOINT.md)
- [VERDICTS.md](sandbox://workspace/orca-finish/program/h5-wire/VERDICTS.md) (this file)
- [probes/h5-harness.js](sandbox://workspace/orca-finish/program/h5-wire/probes/h5-harness.js)
- Branch worktree (uncommitted): `orca/control-loop/orca_unknown_block.js` (new),
  `orca/control-loop/orca_control_loop.js` (+101/-3),
  `orca/control-loop/policy/orca_status_model.js` (+5)
