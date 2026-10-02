# Self-audit 2026-09-25: b-recency-gate production validation + citation-fabrication signal

## Production evidence (run 20260925-150737, b-new-business-radar)

9 items named. Deterministic classifier (`newness_evidence.classify_newness`,
run_date 2026-09-25) applied to every entry in the capture:

- 8/9 -> WINDOW_FAIL on the items' OWN quoted dates (2025-07-15 through
  2025-10-01; 359-437 days before the run date; window floor 2026-06-27):
  Clean Slate Contractors LLC, J&S Home Services LLC, Star Drywall LLC,
  SW Cleaning LLC, Ash & Prose LLC, High Desert SkyWorks LLC,
  Black Diamond Adventures LLC, Blazer Electric Supply.
- 1/9 -> INSUFFICIENT (Top Notch Garage Door LLC: "started this year"
  on a page dated 2025; no resolvable in-window date. Independently
  verified real via own site + (970) 210-1105, but HomeAdvisor shows
  6 years of experience: genuinely old, not new).
- 0/9 -> OK.

Distill outcome: `distill_failed`, 0 merged, recorded in distill.jsonl
2026-09-25T15:20:39Z with the per-item evidence in the note.

## What this validates

The 2026-09-24 newness-evidence gate (spec + `newness_evidence.py` +
14-case test suite, all still passing) is now production-proven on a
second consecutive b-cycle with a NEW shape: the 09-24 case had real
businesses with weak newness evidence; this case has window-fail dates
on nearly every item. The automation caught both without human judgment
in the loop. No new promotion is needed; the invariant stands as built.

## New failure mode observed: citation-fabricated SOS claims

Beyond date-window failure, this cycle's 6 SOS-cited items (Clean Slate,
J&S Home Services, Star Drywall, High Desert SkyWorks, SW Cleaning,
Black Diamond Adventures) carry plausible citations Meta said it checked
("Colorado SOS formation <date> per opengovco listing", agent names,
street addresses) that are independently UNVERIFIABLE:

- Zero operating trace for any of the 6 names in Grand Junction /
  Mesa County via web search (only unrelated out-of-state businesses
  with similar names: Decatur TX, Conway SC, WA/AU/TH/GR).
- Zero trace on the Spot On Colorado SOS-derived index
  (spotoncolorado.com), which is indexed by search engines and
  successfully verified this morning's genuinely-filed LLCs.
- Zero trace via targeted opengovco queries.

Hypothesis: Meta is stitching plausible LLC names to real-format
citations (real streets, real agent-name formats, real SOS ID-era
dates) without an actual SOS record behind them. This is
citation-laundering: the citation exists to satisfy the "say how you
verified" contract line, not to describe a real check.

Current gate handling is correct by accident: window-fail dates kill
these items regardless of whether the filings are real. But a future
cycle could quote IN-WINDOW dates on fabricated filings, which the
recency gate alone would pass. Standing rule reminder: SOS-derived
aggregator corroboration (Spot On Colorado index or equivalent) is
required before any new-filing tag, and "Good Standing per opengovco"
without a corroborated entity page is INSUFFICIENT, not verification.

## Related a-file observation (same pass, run 20260925-150442)

Clearly Mechanical: Meta claimed "no website found"; the Bradford
White contractor listing names clearlymechanicalplumbing.com. Meta's
negative claims ("no website", "no presence") are unreliable; only
positive, corroborated evidence grounds a claim. The a-file was marked
`distill_failed` (0 merged) after collision guard + independent
verification: 6 pipeline collisions, 1 canonical collision
(Durgin Electric, ladder complete), 5 fail-closed (identity conflicts,
directory-only, or weakness claim false).

## Action taken

- None required beyond this note. Automation unchanged; tests green.
- If a future b-cycle quotes in-window dates, add the corroboration
  rule above as a deterministic check (entity page must resolve on a
  second SOS-derived index) before promoting.
