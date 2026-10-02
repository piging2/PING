# SPEC (UNBUILT) — HS-7: provenance column (verified vs claimed vs synthetic)

**Status: SPEC ONLY. Not built, not applied.**
Source: CRITIC-SECURITY hardening (finding 5d), 2026-09-24 02:56 UTC:
worker JSON is currently unvalidated and there is no verified-vs-claimed
grading; fabricated outputs carry no provenance marking (no
`synthetic:true`, no verified-vs-claimed grading).
Target surface: `/home/nolan/ping` (branch `refactor/runtime-authority-convergence`) — this lane must never touch it.
Lane build shape when authorized: DDL + write-path grading rules (spec
only here); enforcement belongs to the PING lane.

## Problem

`complete()` accepts arbitrary worker JSON and stores it as the mission
result with no grading. A fabricated result (CRITIC-SECURITY F1/F3:
unauthenticated `/orchestration` router accepts arbitrary "worker output"
with caller-chosen workerId; a stale worker's late `complete()` overwrites
the canonical result) is indistinguishable from a legitimate one in the
canonical record. Consumers (dashboard closure metrics, worker quality
scores, downstream missions) cannot tell verified from claimed.

## Contract

Proposed column: `ping_missions.result_provenance TEXT NOT NULL DEFAULT
'claimed'` (name negotiable at PING-lane review; the GRADES are binding).

Grades (frozen set):

- `verified` — the result passed the verification path
  (`recordVerifiedResult` or its PG equivalent: envelope checks, digest
  match, holder/epoch match at accept time). Only the verifier may write
  this grade; workers can never self-grade `verified`.
- `claimed` — worker-submitted, accepted by the HS-4 fence (right holder,
  right epoch, right state) but NOT independently verified. This is the
  DEFAULT. Unvalidated worker JSON is always at most `claimed`.
- `synthetic` — produced by test harnesses, dry runs, repros, or any
  non-production path. Synthetic results MUST be excluded from closure
  metrics, worker quality scores, and any canonical aggregation. (Mirrors
  the CRITIC-SECURITY remediation for F1: mark synthetic output with
  explicit provenance, excluded from metrics.)

Write-path rules (binding):

1. `complete()` sets `result_provenance` in the same atomic UPDATE as the
   result (see `hs-4-fencing-epoch.md`). The grade is decided by the
   write path, never by a later reader's guess.
2. A worker-supplied grade is IGNORED. If the payload contains a
   provenance claim, it is overwritten with `claimed` (or `synthetic` when
   the caller is a known test path). Self-grading is a fabrication
   vector.
3. Promotion `claimed` -> `verified` happens only through the verification
   path, as a separate privileged write carrying verifier identity. There
   is no UPDATE that sets `verified` from worker input.
4. The F1 contamination mapping stands as the cautionary tale: the
   canonical journal stayed clean only because the engine never wrote to
   it; the ORCA private stores and dashboard metrics were contaminated
   precisely because nothing marked provenance. Any new result store
   without this column repeats that failure.

## Composition

- HS-4: the `complete()` SQL carries `result_provenance = $provenance`;
  the HS-4 fence (holder + epoch + state) decides ACCEPTANCE, this grade
  decides TRUST. A stale holder's write is refused outright; a live
  holder's unverified write is accepted but graded `claimed`.
- `orca_outcomes.js`: `writeUnknown` records are never `verified`; a
  reconciled-unknown resolution may promote through the verification path
  only.
- `orca_approval.js`: the proposal digest binds what was authorized; the
  provenance grade records how much the result was checked. Different
  axes, both required.

## Acceptance criteria (when built)

1. DDL adds the column with default `claimed`; no existing row reads as
   `verified` without passing the verification path.
2. `complete()` with worker JSON and no verification writes `claimed`.
3. A payload carrying `provenance: 'verified'` is stored as `claimed`
   (worker self-grade ignored).
4. Synthetic-path writes are graded `synthetic` and excluded from a
   closure-metric query (test with a metrics query over mixed grades).
5. The verification path is the ONLY writer of `verified`, and it records
   verifier identity.

## Explicitly out of scope

- Applying the DDL or changing `complete()`. `/home/nolan/ping` is
  off-limits; the PING lane owns it.
- Backfilling historical rows. Default `claimed` is honest: history was
  not verified under this regime. (Backfill policy is a PING-lane call.)
