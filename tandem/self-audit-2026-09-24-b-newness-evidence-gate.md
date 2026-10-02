# Self-audit 2026-09-24: b-newness-evidence gate (automated)

## Production evidence (run 20260924-210718, b-new-business-radar)

10 items named. Collision guard left 3 real, verified businesses:
- Garage Doors And More LLC (GJ): verified via live own site
  garagedoorsandmore.shop + Mesa County licensed-contractors PDF.
  Meta's newness evidence: SOS filing 2025-01-18. That is 615 days before
  the run date. WINDOW_FAIL.
- Resolve Garage Motor (GJ): verified via GBP place data + ~30 dated
  reviews back to 2021. Meta's newness evidence: "new Facebook page with
  zero reviews". Directly contradicted by the dated reviews.
  INSUFFICIENT, claim false.
- Pure Air (Montrose): verified via live own site pureairskyworks.site +
  GBP place data. Meta's newness evidence: "opened its doors in 2026"
  (bare year, unresolvable). INSUFFICIENT.

Round verdict: ZERO new-filing qualifications. The 3 businesses staged in
pipeline.md as ordinary newly-discovered prospects with explicit
"staged as newly-discovered prospect, NOT a new-filing" notes.
Grand Valley Garage Doors (Delta) and Montrose Garage Doors verified
existing and established (2012 / 20-25 yrs), not staged.

This is the fourth b-cycle with the same shape: items survive contract
validation ("at least 3 real businesses"), consume verification searches,
then die at distill because the newness evidence was never dated. The
2026-09-19 self-audit specified the window invariant but left automation
as "proposed, not yet applied". It is now applied.

## The invariant (precise, hardened vs 2026-09-19)

A b-new-business-radar item qualifies as a new-business hit ONLY with
explicit dated evidence resolving to a calendar date within 90 days
before the run date. Dated evidence = (calendar date, source fragment)
from SOS formation/filing/organization/registration dates, dated
grand-opening announcements, dated launch posts, or dated chamber
new-member listings. The brief asks "last 60-90 days"; a date fresher
than 60 days is strictly fresher signal, never a failure. The fail
condition is ONLY age > 90 days.

- Thin website, zero reviews, "appears new", "brand-new", unverified
  agent assertions, undated "new member" claims: INSUFFICIENT, never
  qualifying.
- A bare year FULLY outside the window (Dec 31 of that year predates
  run_date - 90d) is WINDOW_FAIL (evidence of age, imprecise). A bare
  year straddling the window floor stays INSUFFICIENT (imprecise is not
  failure).
- INSUFFICIENT / WINDOW_FAIL items may still stage as ordinary
  newly-discovered prospects with NO new-filing tag. They never count
  as radar hits.

Scope note: this gate governs distill qualification, NOT the answer
contract minimum. An entry without a resolvable date is still a real
business for "at least 3 real businesses". Missing evidence stays
neutral at contract time; it only fails at radar-hit time.

## Automation (applied 2026-09-24)

- `~/workspace/tandem/newness_evidence.py`: classify_newness(entry_text,
  run_date) -> {OK, WINDOW_FAIL, INSUFFICIENT} + dates + reason.
  Deterministic by construction (pure function of text + date).
  Sentence-scoped keyword extraction so review/contract/background
  dates never leak into newness evidence. Local "Month D, YYYY" parser
  added because shared parse_timing() lacks that branch; shared
  parse_timing() semantics untouched (c-brief timing tests depend on them).
- `~/workspace/tandem/tests/test-newness-evidence.py`: 14 cases, all
  passing 2026-09-24, including the 3 production items from this run and
  the prior-round JK Lawncare (2025-08-27) case. Full tandem test suite
  (7 files) passes.
- Protocol for the worker at b-distill time: run classify_newness on
  every surviving b-item before staging. OK -> may stage with new-filing
  tag and cite the date fragment. Anything else -> stage only as
  ordinary newly-discovered prospect (if verified real and corridor-fit),
  with the verdict recorded in the row note.
