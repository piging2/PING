# Self-audit 2026-09-19: numbered_items must count business entries, not numbered syntax

## The reasoning that keeps recurring

Every meta-ai-intel pass, the agent hand-computes "how many businesses did
this answer actually list" and compares it against the ledger's
validation.numbered_items, because the ledger number came from a raw regex
(ITEM_RE in validate-meta-answer.py, deliberately not ^-anchored) that
counted numbered-list SYNTAX anywhere in the capture: the echoed prompt's
known list (1-5), the OUTPUT CONTRACT boilerplate (1-4), and even the
script's own run-ID timestamp header ("04)\n\nMarketing").

Production evidence (this run, 2026-09-19, distill sweep of two fresh captures):
- 20260919-210415-h-marketing-intelligence: regex counted 9, real businesses 5
  (0 of the 9 hits were businesses; businesses were unnumbered bare headers)
- 20260919-210604-a-weak-website-hunt: regex counted 5, real businesses 14
  (0 of the 5 hits were businesses; the 14 were one-line inline-label entries)
- The ledger recorded 9 and 5 as validation.numbered_items; reconcile
  certified the run report against those numbers, which never measured
  businesses. A prompt-only capture with >=3 boilerplate numbers would pass
  presence validation with nonzero items: the exact false-success boundary
  the presence gate exists to close.

## The invariant (precise)

validation.numbered_items in runs.jsonl MUST equal the parsed business-entry
count in the answer region, never the raw numbered-syntax count across the
capture. The entry definition is owned by validate-research-contract.py
(parse_entries), shared by both validators; the presence gate and the metric
can no longer disagree.

Accepted entry shapes (both legitimate, both observed in production):
1. Numbered or bare header line ("Name - Town - Trade") followed by labeled
   field lines ("Website:", "Signal:", "Verified:").
2. Single-line header-shaped entries carrying fields inline
   ("Name - Town - Trade - Website: ... - Weakness: ..."). An inline
   "Label:" fragment whose label is in LABEL_MAP counts as explicit labeled
   content, so it is not a phantom entry. Header-shaped lines with NO
   labels ("Signals - Phone/Response - Window") are still dropped.

## What was changed (automation)

- validate-meta-answer.py: added count_business_entries(text), which strips
  the prompt echo / UI chrome via the contract validator's answer_region()
  and counts len(parse_entries(...)). main() now prints that count as
  "numbered items:" and gates on it (MIN 3 business entries, unchanged).
  stdout contract for meta-pass.sh is unchanged ("answer chars: N,
  numbered items: N"), so the ledger now records true entry counts.
- validate-research-contract.py: parse_entries() accepts inline labeled
  fragments on single-line entries (minimal, additive; labeled-line answers
  parse identically before/after).
- tests/test-numbered-items-invariant.py: 5 unit cases (both real artifacts,
  prompt-only false-success case, numbered real entries, unlabeled
  non-entries). All pass.
- Regression on 12 historical answer files: identical counts for all
  labeled-line answers; the one-line answers (a/d briefs) now parse to the
  counts the engine actually audited (e.g. 20260919-150459-a: 12 == the
  12 items audited in ingested.log round 92).
- Fail-closed verified: prompt-only capture (7216 chars, 7 old-regex hits)
  -> 0 items, exit 3 CAPTURE.

## What the agent no longer reasons about

The per-run "does the ledger's item count match the actual business list"
check. The deterministic gate now measures what the contract promises;
the reconciler and future agents inherit entry counts, not syntax counts.
