# Superseded ledger file — 2026-09-24 (recovery worker)

`SUPERSEDED-ledger-2026-09-24.jsonl` (formerly `results/ledger.jsonl`) is retired.

Some fleet workers appended drain lines to `results/ledger.jsonl` instead of the
canonical `fleet/ledger.jsonl`, creating a split ledger. Recovery worker
2026-09-24 ~11:14 UTC verified every one of its 60 lines:

- 58 lines were already duplicated in `fleet/ledger.jsonl` (fleet-acq-1
  reconstructed acquisition/backend/connector drains).
- 2 lines were unique: fleet-con-1 connector 0051-0100 and 0101-0150
  (verdict counts verified against on-disk CON-0051..0150 JSONs: exact match).
  These were appended verbatim to `fleet/ledger.jsonl`.
- A third missing drain, connector 0151-0200 (50/50 result JSONs on disk, no
  ledger line anywhere, claim sat in inprogress/fleet-con-1/), was reconstructed
  from result-file provenance (PROVEN 43 / N-A 2 / NEEDS-FOLLOWUP 5) and appended
  to `fleet/ledger.jsonl`.

After this merge, connector coverage reconciles exactly: 1,200 ledgered =
1,200 result files on disk, no gaps.

Do not write new drain lines to this file. The canonical ledger is
`fleet/ledger.jsonl` (append-only).
