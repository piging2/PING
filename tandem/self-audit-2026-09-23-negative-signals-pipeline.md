# Self-audit 2026-09-23: context-pack negative signals must include pipeline.md staged rows

## The reasoning that keeps recurring

Every distill sweep manually dedupes Meta AI's re-served businesses against
pipeline.md staged rows AFTER they pass contract validation, because the
context pack's negative-signal list only covers the canonical JSONL. The pack
builder's docstring said coverage comes from the JSONL; the agent knew
pipeline.md staging was where all recent prospects land (JSONL at the
300-active cap since round 114) but never connected the two.

## Production evidence (this run)

Run 20260923-090419-a-weak-website-hunt: Meta AI returned 12 businesses; 7
collide with existing pipeline records (check-prospect-collision.py, exit 1).
The pack's negative list for this run contained 68 JSONL names. All 7
re-served names were absent from it:

- Palisade Electric Service (pipeline staged NEW, a-brief markers)
- Absolute Heat & Air (pipeline staged NEW, a-brief markers; the run also
  re-served the REFUTED Wix URL gluke2758.wixsite.com, proven a Kansas City
  MO false match on 2026-09-22)
- O'Neill Heating and Plumbing LLC (pipeline staged NEW, a-brief markers)
- Four Seasons Plumbing Heating (pipeline staged NEW 2026-09-22,
  a-weak-website-hunt markers)
- Golden Eagle Pest Control (pipeline staged NEW, WCO pest segment research
  source, no brief markers) -> NOT covered by this fix
- Mesa Door Systems (pipeline staged NEW, pre-brief meta-ai round 82 source,
  no brief markers) -> NOT covered by this fix
- Reliable Pest Control (near-miss prose only, never staged) -> NOT covered

Cost of the gap: 12 independent verification searches to yield 4 genuinely
new prospects (Adams Electric, Wesley Electric, Automatic Energy Solutions,
Steve Huck Plumbing & Heating, all Palisade/Montrose/Carbondale), plus one
refuted weakness claim (Lush Green Landscapes: Meta AI said "thin
single-page presence", independent check found a full multi-page WordPress
site with quote form) and one refuted-URL re-serve.

## The invariant (precise)

covered_names(slug) for the context pack = JSONL brief-aware coverage
(unchanged) UNION pipeline.md staged NEW/QUEUED rows carrying the brief's
source/intel markers, deduped case-insensitively (JSONL wins ties), capped
for compactness (JSONL tail 80, pipeline tail 60, pipeline.md append-ordered).

Marker map (lowercase substring): a->(a-brief, a-weak-website-hunt,
weak-website); b->(b-brief, b-new-business-radar, new-filing);
c->(c-brief, c-review-complaint-signals, review-complaint);
d->(d-brief, d-segment-deep-dive, segment-deep-dive);
h->(h-brief, h-marketing-intelligence).

parse_staged_row() matches only real staging rows ("- NEW | Name | ..." /
"- QUEUED (...) | Name | ..."); prose mentions ("- **Name** | ...") and
near-miss notes do not match.

## Unit cases

~/workspace/tandem/tests/test-negative-signals-pipeline.py: 14 cases, all
pass. Covers: NEW/QUEUED/bold row parsing, prose/near-miss rejection, the 4
production re-serve names present in the merged a-brief list, dedupe
(no duplicate bare names), pipeline extras JSONL-disjoint, c-brief and
unknown-slug fail-closed to [].

## Automation

Implemented in ~/workspace/tandem/build-context-pack.py:
BRIEF_PIPELINE_MARKERS, STAGED_ROW_RE, parse_staged_row(),
covered_names_pipeline(), merged_covered_names(); main() uses the merged
list. Verified in real operation: rebuilt pack for a-weak-website-hunt
(version 3801389981) carries 113 negative-signal names (68 JSONL + 45
pipeline extras, zero duplicates) including all 4 marker-carrying re-served
names. Next scheduled a-brief run consumes it automatically.

## Residual (candidate next improvement, not promoted)

Golden Eagle Pest Control, Mesa Door Systems, Reliable Pest Control remain
uncovered: they are staged/near-missed without brief markers. Options:
trade-scope inclusion (~206 staged names, compactness risk) or
all-meta-ai-intel-source inclusion (~111 names). Both need their own
evidence before promotion.

## Reasoning removed from the agent

The sweep no longer needs to manually reason "is this re-served name already
pipeline-staged but missing from the pack?" for marker-carrying rows: the
machinery now emits those names into the negative list, and the
collision guard remains the pre-merge check. Re-serve rate on
marker-carrying rows is now a pack-coverage metric, not a per-run judgment.
