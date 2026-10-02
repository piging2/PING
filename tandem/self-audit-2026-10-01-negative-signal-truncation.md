# Self-audit 2026-10-01: negative-signal tail truncation re-served 3 tracked prospects

## What the agent had to reason about
The 20261002-030423 a-weak-website-hunt answer named 12 businesses; 3 of them
(Rocky Mountain Plumbing and Heating, Palisade Electric Service, Mesa Door
Systems) were already pipeline.md WATCH rows staged in round 82 under the
same brief. The context pack's "Negative signals" section (167 names) did not
contain them, so Meta AI re-returned them despite the DO-NOT-return list.

## Root cause (proven, not inferred)
`covered_names_pipeline()` in tandem/covered_names.py returned `out[-60:]`:
only the last 60 marker-matching staged rows. pipeline.md has grown to 84
marker-matching a-brief rows; the 24 oldest (including the round-82 rows at
~line 1680) fell outside the window and were silently dropped from the pack.
Verified: `covered_names_pipeline('a-weak-website-hunt')` returned 60 rows
with all 3 names ABSENT before the fix; cut boundary was line 2457.

Second defect found while testing the fix: the Mesa Door Systems row carried
no per-line brief marker at all (its provenance lived only in the section
header, which the per-line marker filter does not read), so it was never in
the negative list even before truncation. Fixed as data hygiene by tagging
the row's source note with `weak-website`.

## Invariant (now machinery-owned)
Every marker-matching pipeline.md staged row, regardless of age or position
in the file, is already-covered for its brief. No tail truncation in the
negative-signal path; `merged_covered_names()` dedups and the pack absorbs
the full list.

## Fix
- tandem/covered_names.py: `covered_names_pipeline` returns the full `out`
  list (truncation removed, rationale in code comment).
- pipeline.md: Mesa Door Systems WATCH row source tag now includes
  `weak-website` so the per-line marker filter covers it.
- Regression checks in `covered_names.py --self-test`: `round82-rocky-mtn-in-a`,
  `round82-palisade-elec-in-a`, `round82-mesa-door-in-a` (data-dependent, same
  style as existing production-evidence checks).

## Test
`python3 covered_names.py --self-test` -> all checks passed (a=190, b=59).
The a-brief negative list grew 167 -> 190 (the 24 restored pipeline names);
b-brief unaffected (59).

## Boundary / not claimed
- The fix prevents re-serving of *pipeline-tracked* names; it does not stop
  Meta AI from returning near-duplicate *new* names (collision guard still
  owns that at distill time).
- Marker tagging remains a per-line contract: any future staged row whose
  brief provenance lives only in a section header will still be missed. A
  section-aware parser was considered and rejected as higher-risk; the
  contract is documented in the module header.
