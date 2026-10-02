# Self-audit note: collision-guard name-variant blind spot + pre-merge cap gate (2026-09-29)

## The question
WHAT DID THE AGENT HAVE TO REASON ABOUT THAT IT HAS NOW SEEN ENOUGH TIMES
TO TURN INTO A RULE?

The collision-check-before-canonical-merge rule already exists and worked
as designed: it flagged 11/12 of this pass's businesses as pipeline
collisions. The new reasoning this pass had to do is about the 12th:
the guard reported CLEAR for "Charlie's Pest Control Incorporated", but
`grep -i charlie pipeline.md` showed the same entity already tracked as
"Charlie's Pest Control Montrose" and deliberately fail-closed in round
112 (directory-only, strict gate). The guard's fuzzy matching missed the
name variant. The agent merged the row into the canonical JSONL, then
had to revert it. That merge-then-revert is the avoidable cost.

## Reinforced rules (not a new framework; the guard already exists)
1. A guard CLEAR is necessary but not sufficient for a merge. Before any
   canonical JSONL append, also run a manual variant check: grep
   pipeline.md and leads.md for distinctive name tokens (e.g. "charlie",
   "pest control") case-insensitively. The guard matches on its own
   normalization; the pipeline log carries the human-side variants.
2. The 300-active cap gate must be checked pre-merge, not just the
   collision guard. Round-147's standing procedure (same day): cap full
   -> new qualifiers go in pipeline.md rows only, no canonical JSONL
   merge. This pass's append was also a cap violation; revert restored
   306 rows and the mirror/digest sync verified clean.
3. Canonical appends are reversible but the mirror sync is one-way; a
   bad append + revert costs a full mirror rebuild cycle. Run the
   cheaper checks (guard, variant grep, cap count) before touching the
   canonical file.

## Production evidence (this pass, meta-ai-intel-pass 2026-09-29 ~21:04 MDT)
- distill sweep selected 20260929-210508-a-weak-website-hunt.md (12 named
  businesses, independently web-verified: 4 CONFIRMED, 8 STRONG
  INDICATION).
- `check-prospect-collision.py` on all 12: 11 collisions, 1 CLEAR
  (Charlie's Pest Control Incorporated). Exit 1.
- Manual grep found "Charlie's Pest Control Montrose" at pipeline.md
  L2575 (round-112 fail-closed) and L2887 (already-tracked list) — same
  entity (16874 6300 Rd, (970) 249-3860). Merge reverted; canonical JSONL
  back to 306 rows; `prospect-mirror-preflight.py` exit 0 with post-copy
  verification passed.
- File marked distilled with zero merges; note records the guard's
  name-variant miss.

## Reasoning the agent had to do, now removed from the agent
Deciding whether a guard CLEAR name is "really" new vs a pipeline variant,
and whether the cap permits a canonical merge. Both are now explicit
pre-merge checks: guard -> variant grep -> cap count -> then append.

## Not promoted (observed, follow-up)
- distill-sweep `--select` re-selected this exact answer file even though
  pipeline.md records "Round 147 Meta AI tandem ingest (2026-09-29;
  answer file 20260929-210508 a-weak-website-hunt)" — the round-147 ingest
  did not close the file in the sweep's ledger (the 2026-09-18 engine-ingest
  exclusion only reads ingested.log). Round-style manual ingests need a
  ledger write or the sweep needs to consider pipeline.md round headers.
- meta-pass.sh claims "evidence preserved: <file>.md.CAPTURE_FAILED" on
  throttle detection, but the artifact file did not exist (only job.json +
  provenance.json). The claim is inaccurate; nothing entered extraction,
  which is the fail-closed part that matters.
- Phases B and D were run while Phase A's launch was still backgrounded;
  phase order was not cleanly preserved this pass.
