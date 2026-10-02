# Self-audit note: LABEL_MAP weakness gap (2026-09-24)

## The invariant promoted
An inline `Label:` fragment on a single-line business entry counts as
explicit labeled content whenever the label is in LABEL_MAP. `weakness`
and `weakness/opportunity` are now mapped: they are contract-mandated
fields (a-brief: "one concrete observable weakness"; d-brief: "one
concrete observable weakness or opportunity"), so answers legitimately
carry `Weakness:` / `Weakness/Opportunity:` as their explicit label.

## Production evidence (this pass, meta-ai-intel-pass 2026-09-24 ~03:08 MDT)
Run 20260924-090654-a-weak-website-hunt returned 13 real businesses as
single-line entries, all labeled inline with `Weakness:` (10 of them with
no other recognized label, e.g. "Clearly Mechanical - Palisade - Plumbing
/ HVAC / Geothermal - no website found - Weakness: No dedicated website,
only third-party directory listings; ..."). parse_entries() found only 3
(the ones that also carried an inline `Website:` label); the ledger
recorded validation.numbered_items=3 and the reconciler certified it.
The presence gate (>=3) still passed, so the run is ok, but the metric
understated the answer 3-to-13 and future distill verification counts
would inherit the wrong number. The 2026-09-19 invariant ("numbered_items
must equal the parsed business-entry count") was violated by its own
LABEL_MAP, not by the counting code.

## Reasoning the agent had to do, now removed from the agent
Hand-comparing the ledger's item count against the visible business list
and diagnosing which label shape the parser dropped. The deterministic
gate now measures the contract's own required field, so this run's shape
parses correctly on the first pass.

## Test (red-before / green-after)
tests/test-numbered-items-invariant.py, new cases 6-9:
- 20260924-090654-a-weak-website-hunt artifact parses to 13 (was 3)
- 20260924-090420-d-segment-deep-dive artifact stays 12 (no double count)
- synthetic Weakness-only inline entry parses to 1
- synthetic Weakness/Opportunity inline entry parses to 1
All 10 cases pass; sibling suites (objective-contract, capture-failed,
distill-audit-format, prospect-mirror-preflight) still pass.
test-negative-signals-pipeline.py fails identically with and without this
change (pre-existing: build-context-pack lacks parse_staged_row); out of
scope for this promotion.

## Automation
~/workspace/tandem/validate-research-contract.py LABEL_MAP: added
`'weakness': 'weakness'` and `'weakness/opportunity': 'weakness'`.
One promotion, one diff, two keys. Phantom-entry guard unchanged:
title-shaped lines with no `Label:` fragment are still dropped.

## Not promoted (observed, first instance)
The run-2 ledger line permanently records numbered_items=3 (ledger is
immutable; reconcile certified against it). The pass report grounds its
item count on the ledger (3) and notes the true entry count (13)
separately as a parser-observation, not as a restated metric.
