# Ledger timestamp tiebreak rule (W5 resolution)
Date: 2026-09-24 (v4 wave).

70+ ledger lines carry future/rounded `at` timestamps (workers wrote
synthetic or rounded times; append order disagrees with `at` in places).
Binding rule for any "latest drain wins" logic:

1. File order is the authority: the LAST line in `fleet/ledger.jsonl` for a
   given (category, range) is the latest drain. `at` is informational only.
2. Rationale: the ledger is append-only; appends are the only ordering event
   the fleet controls. `at` values are worker-reported and were proven
   unreliable (future-dated, rounded to the minute/hour).
3. Any future reconciler MUST implement: group by (category, range) ->
   take the line with the greatest file offset. Never max(at).

This rule also governs the D3 double-drains (oracle-v2 2951-3000, 3051-3100;
default 1651-1700): the later-file-offset line is the drain of record; the
earlier line is superseded, not deleted.
