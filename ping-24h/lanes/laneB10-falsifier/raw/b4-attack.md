# Lane B10 falsifier attack notes: Lane B4 (recovery torture)

## Scope
Report: ~/workspace/ping-24h/lanes/laneB4-recovery-torture/report.md (302 lines).
Harness: ~/workspace/ping-24h/repro/scratch/harness.mjs (499 lines), harness-results.json (17 results).

## Verified

### CONFIRMED
1. **17 results**: harness-results.json has 17 results, journal path is in scratch dir (`~/workspace/ping-24h/repro/scratch/journals/run2/events.jsonl`), not production. ✓
2. **2-line parameterization**: diff of mc-dispatch.HEAD.ts vs scratch shows exactly 2 changed lines (JOURNAL_PATH and ARTIFACT_ROOT env overrides). ✓
3. **HEAD file sizes**: mc-dispatch.HEAD.ts 402 lines, route.HEAD.ts 424 lines. Match report. ✓
4. **409 HOLD absent at HEAD**: 0 occurrences of "409", "findPriorMission", "MISSION_TERMINAL_STATUSES" in both HEAD files. missionId at route.HEAD.ts:256 includes `ts` in the sha256 hash. The lane-12 design's 409 HOLD path is worktree-only. B4's section 2 correction is accurate and independently confirms B3's F3.
5. **T3 FAIL-CONFIRMED well-evidenced**: The result records effectDelivered=true, ECONNRESET (no 'abort'), classification 'transport-failed', projected FAILED, journal claiming "never delivered". The misclassification is proven by the harness execution.

### Methodological transparency
- The harness imports REAL `appendDispatchEvent`, `loadJournalEvents`, `projectMissions`, `mintEventId` from the scratch lib (not mocks).
- Route.ts control flow is REPLICATED ("Verbatim extraction", "Replicates route.ts terminal branch"), not executed. The lane is explicit about this (harness.mjs:44, 67, 304).
- The driver refuses to run unless the journal path is inside the scratch dir (fail-safe).

## WEAKENED

### W1. Replication vs execution gap
- The torture verdicts for route.ts behavior (T2, T3, T4, T10) depend on the harness's manual replication of route.ts logic being faithful to HEAD. If the "verbatim extraction" drifts (e.g., a future HEAD change, or a transcription error), the verdicts silently become wrong. The lane labels this clearly, but "EXECUTED" overstates: the event/journal layer is executed; the route control flow is simulated.
- Clean-checkout replay (section 0) would catch drift, but only if the replicator re-verifies the extraction against the new HEAD.

### W2. "PASS-STRUCTURAL" is code-reading, not execution
- T6 (approval-expiry) is "PASS-STRUCTURAL": "no approval/expiry event types in the dispatch slice; silence cannot become approval because no approval transition exists." This is a structural observation from reading the code, not a torture execution. Labeling it as an executed row inflates the "13 of 19" count.

### W3. Highest-risk areas are UNTESTABLE-SAFELY
- T5 (lease-expiry), T11 (reconciler crash), S9 (credential rotation), S11 (capability revoked) are all UNTESTABLE-SAFELY. These are precisely the scenarios where the system is most likely to fail in production (the `reapExpiredLeases` violation, the missing reconciler). The torture lab proves the event layer is sound but cannot touch the highest-risk mechanisms. The lane is honest about this, but it limits the report's force.

### W4. Count imprecision
- Report says "Executed 13 of 19 torture rows". The table lists 18 rows (T1-T12, T6b, NEG, S9, S11, S5-live, S6-live). T11 is PARTIAL, T5/S9/S11/S5-live/S6-live/T6b are not executed. The "13" count is unclear. Not material, but the arithmetic is loose.

## FALSIFIED
- None material. The HEAD-vs-worktree correction, the 2-line diff, the 17 results, and the T3 evidence all verify.

## STRONGEST SURVIVING
- The execution-confirmed FAILs: T3 (S2 misclassification proven), T7 (S13 duplicate-terminal, last-write-wins), T8 (S14 late-result overwrites UNKNOWN), T10 (weakest edge #2, total evidence loss), T12 (S18 unbounded stuck work). These move five findings from code-reading to execution-confirmed.
- The HEAD-vs-worktree correction (section 2): the 409 HOLD path does not exist at HEAD. This is independently verified and matches B3's F3. Two lanes converging on the same correction strengthens it.
- The UNTESTABLE-SAFELY register (section 7) with exact reasons. Honest about limits.

## WEAKEST LINK
- The replication gap (W1). The torture lab's verdicts on route.ts behavior are only as good as the manual "verbatim extraction." The lane is transparent, but a transcription error would silently invalidate the FAIL-CONFIRMED verdicts. The clean-checkout replay procedure does not include re-verifying the extraction fidelity.

## Verdict lines
- STRONGEST SURVIVING: Five FAILs execution-confirmed (T3 S2 misclassification, T7 S13 divergent terminals, T8 S14 UNKNOWN overwrite, T10 event-write loss, T12 unbounded stuck work); the 409-HOLD-absent-at-HEAD correction independently confirms B3's F3.
- WEAKEST LINK: Route.ts control flow is replicated by hand ("verbatim extraction"), not executed; a transcription drift would silently invalidate the torture verdicts.
- FALSIFIED: Nothing material. The 17 results, 2-line diff, HEAD file sizes, and 409 absence all verify.
- WEAKENED: "PASS-STRUCTURAL" (T6) is code-reading labeled as execution; the four highest-risk scenarios (lease-expiry, reconciler-crash, rotation, revocation) are UNTESTABLE-SAFELY, leaving the most dangerous mechanisms unproven.
