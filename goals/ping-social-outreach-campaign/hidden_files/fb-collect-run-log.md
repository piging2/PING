
## 2026-10-01 18:35 MDT — fb-collect run
- collect_pass.sh: exit 0. results_collected=0, results_failed=0, progress_lines_recorded=0, progress_failed=0, skipped_collected=87. 8 unfollow artifacts skipped (not engagement results, expected).
- Script stderr flagged STALE: fb-20260924-175129.json (dispatched 174h ago, no result/progress). Worker likely died before writing; intents stay open, refuse filter keeps them fail-closed.
- Sweep-stale-dispatches (8h): marked=0. All skipped: 107 "has observation records", 3 "dispatch_lifecycle already recorded" (fb-20260914-200458, fb-20260914-232916, fb-20260923-203425, fb-20260924-175129). No new RECONCILIATION_REQUIRED records.
- Net: nothing new to collect, no ledger or Pig failures, no new stale dispatch. No daily-note entry needed (no results_failed/progress_failed, no new STALE warning).
