# Ops/supervision inventory (reader 2/6) - AMENDMENT received 2026-09-27T00:20:36Z; full report still pending

## MISSION_RECONCILE_HOLD precision
- The exact identifier MISSION_RECONCILE_HOLD is defined NOWHERE in ~/workspace/mission-control/.
- It lives only on the ping-runtime side: MissionScheduler._reconcileUnknown() in the F-01 repair code, emitting HOLD via deriveFailureRecord through the canonical UnifiedEventRuntime; mission row never touched.
- Sources: BACKLOG_PING.md:814, ping-watchdog/watchdog-threshold-analysis.md, sprint-2026-09-24/post-effect-hold-analysis-2026-09-25.md.
- The mission-control hits for "reconciliation" are only: ORCA port-lane reconciler contract fields (reconciliationState, retryEligibility, exposed as null never invented, per Autonomous Port Law) and withheld "request reconciliation" control text.
- Implication for plan: HOLD emission authority lives in the scheduler repair code, not in mission-control; the open reaper-vs-HOLD design gap (AGENTS.md: reapExpiredLeases resets _processing to created ~60s after HOLD, an automatic retry of an unknown-outcome mission) sits at this seam.
