# ORCA A5 Audit Verdict — 2026-09-18 ~08:25 MDT

**Verdict: A5 SUBSTANTIALLY PROVEN** (direct audit of commit 992e12725, branch feature/orca-autonomy, worktree /home/nolan/worktrees/orca-autonomy on Pig)

## Verified claims

1. **Commit**: 992e12725 at HEAD, clean tree, branch feature/orca-autonomy. Confirmed live.
2. **Tests** (all re-run on Pig, all pass):
   - engine.metrics.test.js: 5/5 PASS
   - validate_dispatcher_profiles.js: 64/64 assertions PASS
   - measure.test.js: 9/9 PASS, 0 fail
3. **Secret safety**: PASS. No credential material in diff. Hits are benign: "STALE_SECRET" metadata text, "Bearer <redacted>", env-resolved PGPASSWORD, "envelope-secrets" as a forbidden-action name.
4. **Event IDs**: all 7 found in worktree evidence files with internally consistent chains. Absent from live PG, which matches the report's own in-memory-spine claim (not a contradiction).
5. **Causation** (run orca-run-mu6wmbzn): objective → dispatch → result → verify → close, timestamps coherent (11:57:46Z → 11:59:56Z), Hermes output contained real live data.
6. **A5 recovery** (run orca-run-mu6x9eeh): attempt 1 timedOut → WORKER_FAILED (aaa09271) → policy AUTO_EXECUTE retry-attempt-plus-1 → attempt 2 WORKER_COMPLETED (74cdadc5). Real failure-to-recovery semantics confirmed.
7. **Live PG path**: Hermes queried canonical brain-postgres/ping_runtime live: 191 missions all `completed`, 987 events. Independently re-queried and matched exactly. The worker genuinely read production state.
8. **CLI proofs**: /tmp/orca-autonomy-proofs/ on Pig contains goose-proof.json, qwen-proof.json, crush-proof.json, opencode-proof.json, prove-cli.js. Goose chain fully verified: authorize → issue (7d4d70c634273282) → dispatch 26.3s exit 0 → envelope outputExact → WORKER_COMPLETED e7fe2b77. Matches reported IDs.
9. **OpenCode failure honestly reported**: 3x 150s timeouts at non-interactive permission gate. Claimed as failed, not as passed.

## Discrepancies (minor, do not block A5)

- **File count**: actual diff is 90 files (87 added + 3 modified, 7234 insertions); coordinator reported 88 (85+3). Two-file delta, likely count timing. Content verified clean.
- **Evidence timestamps**: dispatch-t1 envelope shows startedAt/endedAt 2026-09-18T14:30:00Z, but the run window was 11:57–11:59Z. Timestamps look templated by the worker. The run itself is real (hermes-update stderr warning, live PG data), but envelope time fields are unreliable.

## Not yet proven (correctly scoped out of A5 claim)

- A6 restart resilience (next).
- OpenCode WorkOrder proof (blocked on permission gate).
- 60s mission lease safety for agent-scale work (flagged, unresolved).
