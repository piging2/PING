# edit-classifier (MarketingOS idea #4)

Deterministic editorial edit classification + script-to-recording semantic diff.
Stdlib Python 3 only. Pure functions, no network/DB/new authorities.

## Files
- `classifier.py` — `classify_edits(v1, v2)` -> list of
  `{class, span, evidence}` over the 13 classes: CLAIM REMOVED, CLAIM QUALIFIED,
  TECHNICAL DETAIL ADDED, COUNTERARGUMENT ADDED, HOOK REWRITTEN, HUMOR ADDED,
  HUMOR REMOVED, JARGON REMOVED, EXPLANATION COMPRESSED, EXAMPLE REPLACED,
  STRUCTURE REORDERED, PERSONAL EXPERIENCE ADDED, EDITORIAL REJECTION.
  Every heuristic is documented in the module docstring with its fixed
  word lists and thresholds.
- `script_diff.py` — `diff_script_recording(script, transcript)` -> findings
  list with types NUMBER_CHANGED, PROPER_NOUN_CHANGED, CLAIM_CHANGED,
  QUALIFIER_REMOVED, NEW_CLAIM_INTRODUCED, SECTION_OMITTED, DISCLAIMER_REMOVED.
  Normalization (lowercase, contraction expansion, punctuation strip) means
  "cannot" vs "can't" and case/punctuation-only differences never flag.
- `test_edit_classifier.py` — plain-assert tests, one per class + diff cases.

## Test
`python3 -m pytest` (23 tests) or `python3 test_edit_classifier.py`.

## Known limits
Word-form numbers ("forty-four") not tracked; proper-noun detection is
orthographic; claim/hedge/jargon lists are fixed and reviewable in-code.
