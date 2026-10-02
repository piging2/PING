# Self-audit note 2026-09-28 (meta-ai-intel-pass, evening)

## Promotion: pipeline negative signals now cover ALL row statuses, not just NEW/QUEUED

SPECIFY: `covered_names.py::parse_staged_row` / `STAGED_ROW_RE` only matched
pipeline.md rows with `- NEW` / `- QUEUED` status. Real pipeline rows also use
WARM, WATCH, DRAFTED, DM SENT, SENT, SKIPPED, REPEAT SIGHTING, RE-VERIFIED
(2026-09-28 census). A WARM/WATCH row is MORE covered than a NEW row, yet it
was invisible to the pack's "do not return" list.

Production evidence: the 2026-09-28 19:35 d-segment-deep-dive pack
(266e1a10f5, 171 negatives) omitted Owens & Sons Plumbing (WARM, d-marker),
Sergeant and Sons Septic and Excavating (WATCH, d-marker), and Hi River
Construction (d-marker). Meta AI re-served all three that same evening; the
collision guard then blocked 20/32 candidates as already-tracked. Research
spend wasted on both ends (Meta AI call + 4 verification subagents
re-verifying known businesses).

TEST: added failing-first cases to `covered_names.py --self-test`
(parse-warm-name/town, parse-watch-name/town, parse-dm-sent, parse-drafted,
parse-prose-excluded, warm-row-in-d-negatives, watch-row-in-d-negatives).
Confirmed they failed before the fix (TypeError: parse_staged_row returned
None for WARM rows) and pass after.

AUTOMATE: `STAGED_ROW_RE` now matches any all-caps status token
`([A-Z][A-Z /-]*)`. The all-caps requirement is the discriminator: bold
"- **Name** | ..." mentions are Title Case and can never match, verified by
the parse-bold-excluded case. Docstrings updated in covered_names.py and
build-context-pack.py. Verified end-to-end: rebuilt d-segment-deep-dive pack
(e7b80261ea) now shows 177 negatives including the three WARM/WATCH rows.
The contract validator shares this module, so validator/pack parity
(2026-09-24 invariant) holds by construction.

## Observed, NOT promoted (open design question)

Six more evening re-serves (AAA Septic & Drain, Eagle Plumbing & Septic,
Goodwin Septic, Septic Alternatives, Grover Excavating, Kissick Construction,
ASAP Sewer) were blocked by the brief-aware marker filter, not the status
filter: their pipeline.md rows carry no d-brief marker (older rows staged
before the marker convention, or staged by other briefs). Widening negatives
to pipeline-global scope would kill that duplicate waste too, but it changes
the deliberate 2026-09-24 brief-aware design (different briefs want different
signals). One promotion at a time; this stays a recorded observation with
evidence, not an implementation.

## Reasoning removed from the agent

Agents no longer need to reason about "was this business already covered?"
beyond running the collision guard: the pack builder and the contract
validator now derive "already covered" from the same status-complete source
set. The remaining judgment call (brief-marker scope) is documented above.
