# Shard 1 Claim

Claimed by: DECISION-SHARD-0 (depth 2) at 2026-09-24 03:13 UTC.
Scope: units 250-499 (within-shard indices 0-249), backlog ids D-251 through D-500.
Definitions: already authored in `../shard-0/gen.py` (items[250:500]); this shard reuses them, no re-authorship.
Backlog: D-251..D-500 already appended to `missions/decision-backlog.jsonl` by shard 0 (500 unique ids verified).

## D-439 source re-check (before shard 1)

All seven source docs carry 2026-09-24 00:51-02:04 UTC mtimes, predating shard 0's reads (~02:05+).
Load-bearing anchors confirmed present: faebba73 (CLAIM-VERDICT), contestant-a (TD-001 plan),
resolveSafeLink x4 (SEC-FIX-SPEC), "About null" x4 (PRESSURE-REPORT), mission counts (MISSION-PROTOCOL).
No deltas since shard 0's read. Proceeding on identical evidence.

## Baseline (D-440)

Shard 0 verdict distribution is this shard's skew baseline:
AUTO_EXECUTE 118 (47.2%), DEEP_REVIEW 47 (18.8%), EXECUTE_REVERSIBLY 38 (15.2%),
DEFER 18 (7.2%), GATHER_MORE_EVIDENCE 18 (7.2%), REQUEST_CONFIRMATION 7 (2.8%),
HUMAN_DECISION 4 (1.6%), REFUSE 0, ESCALATE_IMMEDIATELY 0.
