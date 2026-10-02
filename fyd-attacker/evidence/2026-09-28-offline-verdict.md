# FYD customer-journey attacker lane: offline verdict 2026-09-28

Source under attack: `~/workspace/lane-p01/tree` + `~/workspace/laneq/work`
(vendored, sha256-pinned in `vendor/SOURCES.sha256`).
STALE-SOURCE CAVEAT: this is not Pig HEAD. Every FAIL below is a confirmed
defect in the vendored source and a regression candidate; each must be
re-run against the restored Pig repository before it becomes a product verdict.

Harness: `suites/run-all.sh` (setup + 5 hostile suites, 37 checks).
Reproduce: `bash ~/workspace/fyd-attacker/suites/run-all.sh`.

## Verdict: 31/37 PASS, 6 FAIL

### FAILs (all fail-open on unrecognized input; directive demands fail-closed)

1. B1: `claimClassFor("DIRECCT_FACT")` returns SUPPORTED DIRECTLY.
   An unknown classification string is presented as direct evidence.
2. B2: `claimClassFor(undefined)` and `claimClassFor("")` return
   SUPPORTED DIRECTLY. A missing classification defaults to direct evidence.
3. B3: a graph `claimKind` of "TYPO_CLASS" flows through `claimClassification`
   and is then presented as SUPPORTED DIRECTLY. Garbage in, direct evidence out.
4. B6: an unknown future classification gets basis text "Site record" and
   SUPPORTED DIRECTLY. Confident basis for an unrecognized class.
5. H9: a field-visibility decision with policy "members" is resolved verbatim
   and the field is shown to anonymous viewers. The customer-layer doc comment
   still promises members-fields are "dropped for public viewers"; the code has
   no members policy (3-state: show/hide/coarse). Unknown policy must fail
   closed, not project verbatim.
6. R1: website statement + demo content behind the same factual claim reduce to
   answerClass "SUPPORTED BY MULTIPLE EVIDENCE". Citation 3's own basis says
   "Demo content added by the site operator (not the website's own words)" while
   the headline answer class claims multiple evidence. The per-citation layer is
   honest; the route reduction overclaims.

### PASSes (boundaries that held)

- Ask FYD refuses ungrounded services questions (partial, no citations,
  unknowns recorded); never invents services from business names or topics;
  never parses description prose into service facts; every citation marker
  resolves to a classified evidence ref; provenance basis is honest per branch
  (website statement / canonical journal / demo / owner).
- GENERATED_COPY maps to DERIVED with "not verified fact" basis, never
  SUPPORTED DIRECTLY, end to end through composer, citations, and route
  reduction. FACTUAL CLAIM != GENERATED COPY holds in the vendored source.
- HIDE: zero disclosure in projection, source observation unmutated, no
  traversal leak through located_at, address-shaped values fail closed under
  non-address field names, single-segment street values suppressed, owner SHOW
  outranks the conservative default, version ties deterministic, address-family
  alias hide covers the whole semantic fact, benign values pass through.
- Route reduction: refusal -> UNSUPPORTED; any DERIVED cite poisons the answer
  to DERIVED; any CONFLICTED cite wins; homogeneous multiple website-statement
  cites legitimately reach SUPPORTED BY MULTIPLE EVIDENCE.

### Documented tensions (not ruled defects)

- T1: DERIVED coarse answer state is KNOWN (answerStateFor("DERIVED") = KNOWN)
  while the fine-grained basis preserves GENERATED_COPY as "not verified fact".
  The coarse label says KNOWN about site-generated copy. Product-contract
  question for Nolan: is DERIVED+KNOWN the intended presentation, or should
  generated copy stay visibly qualified at the coarse layer?
- T2: the 3-state field-visibility code vs the 4-state "members" copy found in
  `fyd-product-lane` and in the visitor-answer doc comment. Either the doc is
  stale (members was removed) or two divergent implementations exist. Re-run
  against Pig HEAD will disambiguate.

### Tooling note

The naive brace-counting function extractor silently truncated functions whose
regexes contain `{n}` quantifiers (nearly produced false evidence). Replaced
with a TypeScript-parser-based extractor (`suites/extract.mts`, needs the
vendored `node_modules/typescript`) that slices exact AST positions and
loud-verifies every extract on import.

### Live attack (blocked until reliability restores the minimum path)

`suites/live-attack.mjs` — fail-closed HTTP attacks against the served Ask FYD:
proof question contract, citation classification, R1 regression at the HTTP
layer, ungrounded refusal, HIDE zero disclosure (needs fixture env
FYD_HIDE_FIELD/FYD_HIDE_VALUE), tenant-mismatch refusal. Verified it prints
BLOCKED (exit 0) when the path is down. Run with FYD_BASE_URL + FYD_SITE_ID
once the reliability lane certifies HOST -> TAILSCALE -> WSL -> DOCKER ->
POSTGRES -> GATEWAY -> FYD.

### Next

1. Reliability restores the minimum path; do not touch Pig infrastructure
   from this lane.
2. Re-vendor from pinned Pig HEAD, record HEAD + hashes.
3. Re-run all suites; confirm or clear each FAIL.
4. Run live-attack.mjs against the served path; bind source HEAD + build
   digest + served-asset digest + browser result.
5. Promote confirmed FAILs to product regression tests.
