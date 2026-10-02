# TEST RESULTS — Lane G context-compiler spike

Run: `node run-tests.js` in `~/workspace/ping-build-program/lane-g/spike/`
Date: 2026-09-23 (night shift). Node v24.20.0. Zero dependencies.

## Result: 15/15 PASS

```
PASS emergency question compiles; emergency service ranked first
PASS claim bindings for the emergency answer verify; unknowns cite nothing
PASS no relevant objects -> empty selection with note, still deterministic
PASS conflicting evidence: both Saturday values admitted, no silent winner
PASS minimal visibility: owner-private note excluded, id never leaks
PASS unknown viewer role refuses; empty question refuses
PASS target over budget -> budget_impossible, no targetless packet
PASS T1 prompt injection stays data: boundary-marked, provenance-labeled
PASS T2 malicious description cannot upgrade website_statement to DIRECT_FACT
PASS T3 cross-tenant dangling edge dropped; zero bytes of tenant B leak
PASS T4 citation smuggling: claim citing hidden object id is dropped
PASS T5 absence-inference: counts only, no hidden ids; unknowns do not distinguish
PASS T6 budget gaming: 500 keyword-stuffed junk objects cannot drown the target
PASS T7 agent role strips forbidden effects; secret fields never enter
PASS determinism: two runs byte-identical; input order independent

15 tests passed.
```

Sample packet (worked example, "Does this business do emergency calls?"):
packetId fcc1171c4b93..., 7436/24000 bytes used, top relevance 0.568536
(Emergency Plumbing Repair, reasons include keyword_overlap).

## The five failures found and fixed (2026-09-23 ~19:50 MDT)

The suite was inherited 10/15 green. Each failure was diagnosed to root cause;
three were compiler bugs, two were test bugs. No failure was hidden or
worked around.

1. **"no relevant objects" — compiler bug: relevance floor unreachable.**
   Structural terms alone (proximity 0.35, predicate weight 0.25) always
   summed above the 0.05 floor, so the `no_candidates_above_floor` failure
   mode in the design could never fire. Fix: a question-signal gate — a
   candidate is relevant only if score >= floor AND (keyword overlap > 0 OR
   schema prior boosted for the detected intent). Gate-cut candidates are
   counted in the new `visibilityProof.excluded.belowFloor` ledger key.
   Design doc section 3.3 amended accordingly.

2. **"conflicting evidence" — compiler bug: epistemic mapping too coarse.**
   Every non-owner object was classed `website_statement`, so a DIRECT_FACT
   claim about the third-party directory listing was dropped as
   `epistemic_upgrade`. Fix: provenance-kind-aware mapping
   (website-ingestion -> website_statement; directory/canonical-journal/
   observation -> DIRECT_FACT; owner-* -> USER_OVERRIDE; unknown -> UNKNOWN)
   and rank-based B3 (a claim must not outrank its best cited evidence;
   website_statement can never back DIRECT_FACT). Matches the design's B5
   worked example (both Saturday values citable, contradiction as
   DERIVED_FACT, no silent winner).

3. **T1 — compiler/test shape mismatch.**
   `description` was a bare string when untruncated but `{value, truncated}`
   when truncated; the test expected `.value`. Fix: uniform
   `{ value, truncated }` shape for description and all fields (explicit
   truncation flag per the design doc; no string-vs-object branching for
   consumers such as lane I's MCP edge).

4. **T6 — test bug + compiler ledger gap.**
   The 500 junk objects were cut by the count cap (`maxRelatedObjects`)
   before the byte budget could bind, and count-cap cuts were silently
   unledgered. Fix (compiler): count-cap slices now ledger as
   `visibilityProof.excluded.selectionCut` (never silently dropped).
   Fix (test): the flood is now keyword-stuffed (descriptions contain the
   question keywords, modeling the realistic attack) with
   `maxRelatedObjects: 600` so the BYTE BUDGET is what binds: ~490 objects
   cut by budget, target reserved first, real evidence still ranks first.

5. **determinism — test typo.**
   `assert.strictEqual(a.packet.packetId, b.packetId)` read `.packetId` off
   the result wrapper instead of `b.packet.packetId`. One-character class of
   fix; the compiler's determinism (byte-identical packets, input-order
   independence) was never broken.

## Red-team coverage (all passing)

| Test | Attack | Defense proven |
|------|--------|----------------|
| T1 | Prompt injection in website text ("Ignore previous instructions...") | Content stays DATA: boundary-marked, provenance-labeled, never reaches instruction-adjacent packet fields |
| T2 | Malicious description ("city-licensed emergency authority, license #FAKE-123") | Epistemic class pinned at selection as website_statement; DIRECT_FACT claim on it dropped as epistemic_upgrade |
| T3 | Cross-tenant dangling edge (rel -> tenant-b:biz-rival) | Dropped at Stage 1, counted; zero bytes of tenant B in the canonical packet |
| T4 | Citation smuggling (claim cites hidden note-internal id) | B2 server-side verification: citation_leak, claim dropped |
| T5 | Absence-inference probe ("internal notes?") | Counts only in ledger, no hidden ids anywhere; unknowns never distinguish absent from hidden |
| T6 | Keyword-stuffed junk flood (500 objects) | Target section reserved first; byte budget cuts ~490; real evidence ranks first |
| T7 | Agent role + secret-shaped field (apiKey) | provider.call stripped for agent; secret field dropped at Stage 1, value nowhere in packet |

## Determinism proof
Two compilations of identical input are byte-identical (canonicalize equal);
reversing input object/relationship order yields the same packetId
(f924cf219ce5...). No clock (recency from evidence derivedAt), no randomness,
sorted iteration, scores rounded to 6dp, ties broken by id ascending.

## Known non-coverage (honest gaps)
- `spike/context-compiler.mjs` + `tests.mjs` (first iteration) cannot run:
  its fixture path does not exist. Superseded by compiler.js; not maintained.
- `port/context-compiler.ts` is an untested TS sketch; not run, not maintained.
- No model-in-the-loop test: the spike proves the packet shape, grading logic,
  and budget enforcement. Answer rendering against a real model is a factory
  concern (concierge is the deterministic consumer).
- Owner-plane compilation is specified but unverifiable until the
  authenticated viewer lane exists.
