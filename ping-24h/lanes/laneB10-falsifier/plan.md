# LANE B10 — Wave B Independent Falsifier: plan

T+0 2026-09-28 14:26 MDT. Now ~T+0.2. Deliverable due T+20 = 2026-09-29 10:26 MDT.

## Standing
- READ ONLY. No gateway contact, no :3100 contact, no Jev contact. No pushes, no destructive git or data actions. No em dashes.
- UNKNOWN is legitimate; never collapse it.
- Falsification method (from lane16-falsifier/report.md): recompute every number; re-derive each verdict from cited evidence; check threshold theater, hand-picked samples doing decisive work, stale baselines, overreach, vocabulary mismatches, arithmetic errors.

## Wave B lanes to watch (slugs expected under ~/workspace/ping-24h/lanes/laneB*/)
| Lane | Work |
|---|---|
| B1 | decision-surface deep map (Phase 3) |
| B2 | processor tournament execution (Phase 4) |
| B3 | ORCA-vs-patched-dispatch + reached-path re-trace (Phases 5+6) |
| B4 | recovery torture execution (Phase 7) |
| B5 | work-contract replaceability (Phase 8) |
| B6 | business intelligence (Phase 10) |
| B7 | Mission Control observability (Phase 11) |
| B8 | object/protocol portability (Phase 12) |
| B9 | continuous security adversary (Phase 13) |
| B10 | this lane (falsifier) |

## Process
1. Background poll (poll.sh, 10-min cadence, 19h) flags NEW_REPORT_LANDED events into this conversation.
2. For each landed report: read it in full; read its raw evidence artifacts if referenced; independently recompute every number; re-derive each verdict from cited evidence only.
3. Per-lane lines: STRONGEST SURVIVING / WEAKEST LINK / FALSIFIED / WEAKENED.
4. Final report at ~/workspace/ping-24h/lanes/laneB10-falsifier/report.md before T+20, with per-lane verdicts and a verdict log suitable for the program LEDGER.
5. Read-only filesystem note: evidence sources I may read: the lane reports themselves, their raw/ dirs, the ledger, and public trees read-only (Pig WSL reads if needed, light; never write). Do not chase lanes mid-run; wait for reports to land.

## Known cross-wave carryovers worth re-checking in B reports
- Decision Unit label "mc.authorize_work_order/v1" occurs nowhere in the orca-adapter tree (lane14 precision note).
- Calibration headline from Wave A: 6/6 agreement, Brier 0.0076, mean latency 429.8ms not 422ms, lane-imposed 0.5 threshold, hand-picked n=6.
- Gateway: bounded 3-attempt retry then terminal/DLQ; re-minted doomed missions (NOT unbounded). jev key missing confirmed.
- ContextPack patch: 9a555021, 32-item evidence budget starvation with dangling rel: refs, untracked count-cap drops.
- Reaper violation: reapExpiredLeases() sets lease-expired running/assigned -> created -> redispatch (confirmed code, liveness UNKNOWN).
- served :3100 ~17.5h stale vs worktree vs HEAD distinctions must hold.

## Attack checklists per lane
- B1: recompute surface counts; check the label vocabulary (DETERMINISTIC/BOUNDED CANDIDATE/DEEP/HUMAN/UNKNOWN) against actual code; is any "deterministic" claim time-dependent like authorizeWorkOrder was?
- B2: recompute tournament scores; check judge substitution (LLM judge vs deterministic pass/fail per lane4's lesson); check for hand-picked contract sets and threshold theater in the promotion bar.
- B3: re-trace reached-path claims against the patch commit 9a555021; verify pre/post packet evidence-ref counts (falsifier claimed 0 -> 32); check dangling rel: refs claim.
- B4: check which torture rows actually RAN vs DESIGNED; synthetic coordinator-death test execution claims.
- B5: replaceability claims vs lane5/lane14 conclusions; spec vs implementation (is any of it built, or all spec?).
- B6: every metric needs a source and a recomputation; watch for denominator games.
- B7: observability claims about :3100/journals; stale-served-build confusion is the classic trap.
- B8: portability claims vs actual code surfaces.
- B9: security verdicts vs read-only constraint; fix-needs-guard claims re-check.
