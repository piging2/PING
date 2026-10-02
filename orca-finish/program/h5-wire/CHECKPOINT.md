# H5 BRANCH WIRING — checkpoint
Lane: H5 BRANCH WIRING (parent orchestrator label b3bfb978-5866-4df1-add1-c1f0b6ac44f8)
Started: 2026-09-24 ~05:07 MDT
Owner: H5-wire subagent (depth 2/2)

## Standing orders (from task)
- TEST-first; the wiring is the one authorized implementation piece.
- Work ONLY in the branch worktree /home/nolan/worktrees/orca-autonomy.
- NO commits to main/master, NO pushes; leave changes uncommitted, report the diff.
- Do not touch live production paths. Deletions gated on Nolan's word (none made).
- Bounded concurrency.

## Targets
- A5 branch /home/nolan/worktrees/orca-autonomy @ ae55b77ff82a893d50c48ab299117b2f705a0f03 (tip re-verified before writing; unchanged after).
- Spec: ~/workspace/orca-finish/program/orca-b/VERDICTS.md Record 7 (H5),
  drill D2 gaps + open UNKNOWNs U1/U4, ~/workspace/orca-finish/program/orca-b/CHECKPOINT.md.

## What was wired (final state of the worktree)
1. NEW `orca/control-loop/orca_unknown_block.js` (untracked, ~12KB):
   - `classifyDispatchOutcome()` — pure T1-T4 classifier: timeout after
     dispatch -> POST_BOUNDARY_UNKNOWN; transport error with dispatcher never
     run -> PRE_BOUNDARY; clean transport -> KNOWN.
   - `blockedWorkOrderIds` durable set:
     `objectives/<objective_id>/blocked-work-orders.json`
     `{ blocked: { <woId>: entry }, decisions: [ ... ] }`, atomic writes,
     idempotent block (first entry wins), evidence-required entry fields.
   - `releaseBlockedWorkOrder()` — the ONLY writer that moves a work order
     out of OUTCOME_UNKNOWN. Explicit recorded decisions: 'cancel' ->
     BLOCKED terminal ('cancelled-after-outcome-unknown'); 'retry-after-reconcile'
     -> AUTHORIZED (new attempt within durable budget; unknown attempt stays
     in attempt_history). Fail-closed refusals: not-blocked, unknown
     decision, unexpected durable state, exhausted attempt budget.
   - `WORK_ORDER_TERMINAL_STATES` incl. OUTCOME_UNKNOWN (terminal for all
     automatic paths; W2 "terminal-except-administrative-cancel" mapped onto
     the branch's durable work-order record, the branch's analog of the W2
     run record).
2. `orca/control-loop/orca_control_loop.js` (+101/-3):
   - timeout branch: OUTCOME_UNKNOWN + block + honest attempt record
     (TIMED_OUT_POST_BOUNDARY) + ledger RUNNING->EVIDENCE_PENDING->BLOCKED +
     Escalation. No failed envelope, no classifyRetry, no canonical event,
     no auto-retry, no success. `timeoutEnvelope()` retained, marked
     RETIRED BY H5 (no deletion).
   - delegate() pre-dispatch: blocked ids refuse auto-claim (Escalation).
   - reconcileStartup(): blocked ids skipped ("leaving untouched").
   - TERMINAL_WORK_ORDER_STATES now sourced from the new module.
3. `orca/control-loop/policy/orca_status_model.js` (+5): new legal ledger
   edge EVIDENCE_PENDING -> BLOCKED (H5 unknown-block edge; evidence =
   dispatch-<tag>-a<n>.json). BLOCKED still has no automatic exit.

## Proof
- Staged harness `probes/h5-harness.js` on the Pig against the REAL branch
  modules (objective-runtime.js, orca_unknown_block.js, orca_status_model.js
  required by absolute path; loop wiring proven by static region checks on
  the real orca_control_loop.js): 30/30 PASS.
  - g1 (12): blocked-set gate semantics incl. idempotent block, both release
    decisions, all four fail-closed refusals, append-only decisions log.
  - g2 (4): dispatch classification incl. T2 (timeout+rendezvous -> UNKNOWN,
    never success) and the pre-boundary control.
  - g3 (4): ledger — new H5 edge legal, failed path preserved, BLOCKED has
    no automatic exit, illegal jumps throw.
  - g4 (1): terminal vocabulary.
  - g5 (6): static wiring — timeout branch calls blockWorkOrder/OUTCOME_UNKNOWN/
    Escalation and contains no timeoutEnvelope/classifyRetry/recordVerifiedResult/
    extractEnvelope; delegate + reconcileStartup consult the blocked set;
    pre-boundary replan preserved; timeoutEnvelope retired-not-deleted.
  - g6 (3): t_timeout_after_effect staged replays — T3 (timeout, no
    rendezvous) and T2 (timeout with collected rendezvous) both land
    OUTCOME_UNKNOWN + blocked, never success/failed/auto-retry; release
    'retry-after-reconcile' re-authorizes; pre-boundary control untouched.
- W2 baselines replayed on Pig node: orca_ready_set.test.js 16/16,
  orca_run_record.test.js 24/24 (the suites the H5 spec's EVIDENCE cites).
- node --check on all three worktree files: OK. Worktree checksums verified
  byte-identical to the reviewed copies.

## Open residuals
- T2/T3 timeout residual: CLOSED by this wiring (post-boundary timeout is
  now OUTCOME_UNKNOWN + blocked, never auto-retried, never marked success).
- U1 (orphaned Windows Hermes child completing after coordinator timeout):
  still static-only; unchanged by this lane. The unknown-block makes the
  coordinator's classification honest (it no longer claims FAILED), and the
  operator's explicit decision is the reconciliation point; a Pig Windows
  timing experiment is still the way to observe the race live.
- U4 (drill D2(b) vs DISPATCH_LOST bounded re-delegation): UNTOUCHED —
  needs the drill owner's decision (wire H5 there too, or amend the drill).
  This lane deliberately did not change the restart-reconcile DISPATCH_LOST
  path (LIVE-proven in TEST-A6).
- Pre-boundary semantics: transport-failure replan-within-budget path
  preserved as the branch's pre-boundary control (matches the gauntlet's
  "pre-boundary -> FAILED requeueable" shape at the branch's own layer).

## Failure pipeline log (this lane)
- pigwsl-run.sh "command line is too long" on a ~16KB base64 push:
  LOCAL ACCIDENT (my transport choice; Windows CMD length limit). Recovered
  via the AGENTS.md-sanctioned scp-to-transfer + cp path with sha256
  verification. No state lost.
- cp path bug (transfer/policy/ vs flat transfer dir): LOCAL ACCIDENT
  (my script), fixed; checksums confirmed all three files.
- /tmp/h5-push-sums.txt: scratch only, no requeue.

## Diff summary (uncommitted, worktree only)
- M orca/control-loop/orca_control_loop.js (+101/-3)
- M orca/control-loop/policy/orca_status_model.js (+5)
- ?? orca/control-loop/orca_unknown_block.js (new)
- (pre-existing untracked evidence dirs from earlier runs left untouched)
- No commits, no pushes, no main/master touched, no production paths touched.
