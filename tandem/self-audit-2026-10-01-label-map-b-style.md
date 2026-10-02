# Self-audit 2026-10-01: LABEL_MAP false-negative on b-style answer labels

## Invariant (specified)
The contract validator's phantom-entry guard must recognize every label family
the production briefs actually elicit. Presence validation measures parsed
business entries; a label that names entry content in a real capture belongs
in LABEL_MAP, or the guard silently converts a valid answer into a
capture_failed run. Label families are brief-shaped, not universal: the
b-new-business-radar brief elicits "Evidence new / Contact / Weak signal"
while the a/d-briefs elicit "Website / Weakness / Verified" style labels.

## Production evidence (this pass)
- meta-ai-intel-pass 2026-10-01 03:04 MDT, run 20261001-090412-b-new-business-radar:
  exit 3, outcome capture_failed, ledger validation.numbered_items = 0.
  The preserved capture holds a genuine 10-item answer (numbered "N. Name -
  Town - Trade" headers, each with Evidence new / Contact / Weak signal /
  verification text, plus "What I could NOT verify" sentences). Fail-closed
  handling was correct (evidence preserved as .md.CAPTURE_FAILED, never
  enters extraction); the classification was wrong.
- Previous pass run 20261001-030650, same slug, same pack version
  902ffcaeb6: same failure, 10 real entries in bare (unnumbered) header
  style, each with one "Evidence new:" line, ledger numbered_items = 0.
- Earlier run 20260929-211145, same slug: capture_failed (same suspected
  cause; not forensically re-verified).
- Control: run 20260930-210412, same slug AND same pack version, answered
  with "How verified / Verified / Signal / Town" labels -> parsed fine,
  exit 0. The difference is answer label style, not the pack or the brief.

## Root cause
parse_entries() in validate-research-contract.py drops any entry whose
blocks carry no LABEL_MAP-mapped label (phantom-entry rule, 2026-09-19).
LABEL_MAP lacked the b-brief's recurring families: 'evidence new',
'weak signal', 'contact'. All three failed captures used only those labels,
so every entry was dropped and count_business_entries() returned 0.

## Test (unit cases first)
Added Cases 10-13 to tests/test-numbered-items-invariant.py:
- Case 10: 20261001-090412 artifact -> 10 (failed before patch with 0).
- Case 11: 20261001-030650 artifact -> 10 (failed before patch with 0).
- Case 12: synthetic b-style entry (Evidence new / Contact / Weak signal) -> 1.
- Case 13: phantom regression: title-shaped line + freeform note -> 0
  (passes before and after; the guard still holds).

## Automate (deterministic machinery owns it)
validate-research-contract.py LABEL_MAP +=
  'weak signal' -> 'weakness' (same semantic as 'weakness'/'weakness/opportunity'),
  'evidence new' -> 'newness_evidence' (new canonical field; downstream
  newness gate reads raw entry text, unaffected),
  'contact'     -> 'contact' (new canonical field).
All 14 numbered-items-invariant cases pass; capture-failed-terminal (12/12),
newness-evidence, and objective-contract suites pass. The 3
test-negative-signals-pipeline failures are pre-existing on the pristine
tree (verified via stash) and unrelated.

## Reasoning removed from the agent
No more hand-adjudicating "the capture looks valid but the validator says
0": the parser now speaks the b-brief's label dialect. If a future brief
elicits a new label family and a run capture_fails with numbered_items 0
while the artifact visibly lists businesses, the fix is the same motion:
add the family to LABEL_MAP plus a regression case, never a judgment call
about the answer's validity at dispatch time.

## Deliberately not done
The two failed runs stay capture_failed in the ledger (historical truth;
ledger is append-only canonical record). Their .md.CAPTURE_FAILED files
stay out of extraction (fail-closed). The next b-rotation (failed runs do
not advance rotation) will re-research with the fixed validator in place.
