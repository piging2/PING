# DECISION Shard 0 Summary

Worker: DECISION-SHARD-0 (depth 2, no child agents). Date: 2026-09-24.
Scope: units 0-249, backlog ids D-001 through D-250. Synthetic mission output: `synthetic:true`, `testing_only:true`.

## Verdict distribution (250 units)

| Verdict | Count | Share |
|---|---|---|
| AUTO_EXECUTE | 118 | 47.2% |
| DEEP_REVIEW | 47 | 18.8% |
| EXECUTE_REVERSIBLY | 38 | 15.2% |
| DEFER | 18 | 7.2% |
| GATHER_MORE_EVIDENCE | 18 | 7.2% |
| REQUEST_CONFIRMATION | 7 | 2.8% |
| HUMAN_DECISION | 4 | 1.6% |

## Top three HUMAN_DECISION / REFUSE items (ranked by criticality, then backlog order)

1. **D-015** (HUMAN_DECISION, P0 (this is the production-launch gate)): Phase 17 gap list: what does the factory need before UNAUTHENTICATED VISITOR -> PUBLISH is safe? Rationale: UNAUTHENTICATED VISITOR -> PUBLISH is a production launch, which is a hard boundary: no launch without Nolan. The shard will produce the gap list as the evidence pack, but the go/no-go is his.
2. **D-012** (HUMAN_DECISION, P1 (quality bar governs release confidence)): Adopt 0.95 as the golden-set correctness bar? Rationale: A program-level correctness bar with release-blocking consequences is a genuine business decision for Nolan's morning queue; the shard recommends 0.95 with a defined red-run response, but the call is his.
3. **D-214** (HUMAN_DECISION, P1): Golden-set red-run response: who stops what when the bar goes red? Rationale: Fold into D-012: the bar, the metric, and the red-run response are one Nolan decision. The shard proposes 'red blocks releases, lane owner investigates in 24h'.

## Key evidence

Seven lane documents read 2026-09-24 (dated 2026-09-23): PRESSURE-REPORT.md (F-1..F-8),
CLAIM-VERDICT.md (H1..H9, R-MODEL), SEC-FIX-SPEC.md (5 patches), TD-001 INTEGRATION-PLAN.md
(contestant A), DEHPP classification.md + parameterization-spec.md, MISSION-PROTOCOL.md
(13,500 missions across WORLD/OBJECT/PROJECTION/SYNTH/DECISION).

Load-bearing findings carried into decisions: the weaker renderer verifier (H4) with zero
strong-verifier coverage on public /sites (R-MODEL); the 32-bit digest collision (H8,
digest faebba73); evidence laundering via owner corrections (H3); uncaught TypeErrors on
malformed graph fields (F-1..F-6); duplicate object id first-wins/last-wins contradiction (F-7);
`title:null` rendering visitor-facing "About null" (F-8).

## Open questions

- D-008: digest inventory before mandating >=256-bit (GATHER_MORE_EVIDENCE).
- D-274: extend the 10-hostile list or freeze it (DEEP_REVIEW).
- D-361: skew thresholds need a baseline; shard 0's distribution is now that baseline (D-440).
- D-429/D-469: parent confirms reporting cadence and retrospective ownership.

## Next steps

Claim shard 1 if unclaimed (D-251..D-500 already authored in the generator); otherwise run
falsification per D-449 or gap discovery per D-450. Re-check source docs for updates before
shard 1 (D-439).

## Throughput

250 units in 1.0s (14944 units/min). Peak traced memory: 389 KB.
Backlog: 485 appended (first run), 15 already present (D-001..D-015); final re-run appended 0, dedup verified (500 unique ids).
