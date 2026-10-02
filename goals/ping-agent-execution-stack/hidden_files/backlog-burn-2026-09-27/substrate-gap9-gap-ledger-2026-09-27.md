# Substrate Gap 9: machine-readable gap ledger — implementation ledger (2026-09-27)

Item: Substrate Gap 9 — "The burn's gap records are prose; the signal-pass
gap_ledger pattern is not applied to the burn."
Harvest source: substrate-recon-2026-09-27.md:226.
Pattern source: ~/workspace/skills/competitive-signal-pass/gap_ledger.json.

## What was built

- `gap_ledger.jsonl` — 27 JSON records, one per gap/item. 9 substrate recon
  gaps (GAP-001..GAP-009) plus 18 open FYD/backlog items worth tracking
  structurally. Record keys: id, title, harvest_source (file:line),
  classification (closed signal-pass vocabulary), status (closed
  burn-status set), status_note, smallest_delta, falsification_test,
  ledger_path, updated_ts. Statuses taken from BACKLOG.md, never invented:
  Gap 1 PARTIAL (F1/F2/F3/F6 verified, F4 queued on transport, F5 frozen);
  Gap 2 VERIFIED; Gap 3 VERIFIED_CORE; Gap 4 VERIFIED_CORE (Q3 proof-only,
  enforcement queued for Nolan); Gap 5 VERIFIED_LOCAL (live-Pig proof
  transport-queued); Gaps 6/7/8 VERIFIED; Gap 9 COMPLETED (this artifact).
  Sibling-stream ledgers referenced where the prose was theirs:
  gap1-combined-convergence-2026-09-27.md (+report json) on UNIFY-001 and
  TRANSPORT-001; mc-wiring-verify-2026-09-27.md on TRANSPORT-005 and
  POLLBUG-001. One uncertain-source record (FYD-004) carries status PARKED
  with an explicit "details not re-verified this session" note rather than
  an invented history.
- `gap_ledger_lint.py` — stdlib-only schema lint: required keys,
  classification in the closed 5-value vocabulary, status in the closed
  16-value set (OPEN..MOOT including VERIFIED_CORE/VERIFIED_LOCAL honoring
  the honest-verdict granularity, plus QUEUED_ON_TRANSPORT /
  QUEUED_POST_FREEZE / QUEUED_FOR_NOLAN / AWAITING_DECISION so queued items
  stop being re-triaged as unknown), ledger_path exists, updated_ts
  ISO-8601-ish, duplicate-id check.

## Falsification evidence

- Lint on the real file: FAIL [GAP-009] ledger_path: no such file (before
  this build ledger existed); after this file: PASS: 27 records.
- Synthetic bad records (in /tmp, not committed):
  1. unknown classification + valid status -> FAIL [SYN-1] classification:
     unknown classification 'MAYBE_AUTOMATED'.
  2. missing required key (falsification_test dropped) -> FAIL [SYN-2]
     falsification_test: missing or empty.
  3. ledger_path pointing nowhere -> FAIL [SYN-3] ledger_path: no such file.
  4. unknown status 'ALMOST_DONE' -> FAIL [SYN-4] status: unknown status.
  All four caught, naming record + field. Clean synthetic control PASS.
- Boundaries held: read-only on existing ledgers (never rewrote history);
  no pushes; no HPP original contact; no credentials.

## Classification semantics (mapped to the signal-pass pattern)

- KEEP_REASONING: the remaining work needs human/agent judgment (Nolan's
  unification decisions, gated/parked decisions, wiring-lane decision).
- AUTOMATABLE: mechanically dispatchable once the queue condition clears
  (transport, freeze, or start state).
- ALREADY_AUTOMATED: the deterministic machinery holds; nothing left.
- BLOCKED: externally blocked with no automatic requeue (transport-failed
  runtime proofs).
- NOT_WORTH_AUTOMATING: deliberately not fixed (F5 historical artifacts).

## Next harvester contract

Diff gap_ledger.jsonl between runs; re-read prose only when a record's
ledger_path changed. New items enter as QUEUED_*/OPEN records with the
harvester recording harvest_source file:line. Nothing may weaken a
record's status without its falsification test passing.

GAP9-IMPL VERIFIED
