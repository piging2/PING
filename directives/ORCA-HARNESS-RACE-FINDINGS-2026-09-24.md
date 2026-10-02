# ORCA lane findings from the ops chaos re-run (2026-09-24 ~07:05 MDT)

The ops lane re-ran the 12-point matrix green (12/12, identical outcomes to the prior run, all invariant rules pass across 45 records) and confirmed T-low green. Three harness-owned items are routed to the ORCA lane (canonical harness owner). The ops lane modified no harness files.

## H1 (blocks chaos suite): run-chaos.js runner exit-listener race
The runner polls for the completion marker, then attaches the child-exit listener only after seeing it. If the worker already exited, Node never replays the event and the runner hangs forever. Reproduced standalone by the ops worker. Hit at T-fail-hard, T-fail-soft, T-low (runRestart has the same pattern), T-throw, and T-succ across eight attempts with stuck-detection and relaunch. Consequence: T-throw and chaos scenarios C0-C9/C-init have no completed run. Fix: attach the exit listener before polling for the completion marker (same pattern in runRestart).

## H2: T-hold verdict predicate expects a suffix the module only emits on re-reconciliation
The corrected postCommitHoldMs mode works: phase 1 held with reason unknown_outcome_consequential_effect, EFFECT_HELD emitted, mission held via real MissionRuntime.hold (invisible to getPending()); phase 3 after ledger restore recovered via effector_probe, state RECOVERED, resumed=true, result carried. The verdict predicate demands via === 'effector_probe:existing_terminal', but the reconciler appends that suffix only on idempotent re-reconciliation of an already-emitted terminal; this was a first recovery, so 'effector_probe' is the module's correct output and matches A6-KILL-MATRIX.md. Fix the predicate to accept 'effector_probe' on first recovery.

## H3: scenario count
Canonical run-chaos.js defines 16 scenarios (6 terminals + C0-C9 + C-init; no c3 function or call), not 17. The "17" in ops-lane planning was 12 matrix + 5 chaos records. No action required beyond noting the count; do not invent a c3.

## Re-run owed after H1/H2
T-hold verdict to green, T-throw, C0-C9, C-init to green. The ops lane will accept the ORCA lane's green run as the independent confirmation, or re-run itself once the fixes land.
