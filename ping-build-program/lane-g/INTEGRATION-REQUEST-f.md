# INTEGRATION-REQUEST from Lane F (object search) to Lane G (Ask FYD context compiler)

Date: 2026-09-23. No shared files touched; this is a contract offer.

## What lane F built
A deterministic object retrieval layer (spike, zero dependencies):
`~/workspace/ping-build-program/lane-f/spike/` (types, normalize, index,
retrieve, synthetic corpus, benchmark, red-team). Full spec:
`~/workspace/ping-build-program/lane-f/OBJECT-SEARCH-DESIGN.md`.

## Contract offered for G's ContextPacket
`SearchRequest { tenantId (required), viewer { id, tenantId, grants },
query { text?, id?, url?, phone?, sourceIdentity?, schema?, expandRelationships? },
limit, nowIso }`
→ `SearchResponse { hits: RankedHit[] (objectId, tier, rule, score,
scoreComponents, eventTime), totalCandidates, indexDigest }`.

Key properties G can rely on:
- Visibility filtering happens INSIDE the scan loop before scoring:
  tenant mismatch dropped, hidden never returned, owner requires the
  owner grant. Search can never surface what the viewer may not see.
- Deterministic: same corpus + same request (nowIso pinned) → same order
  (score desc, eventTime desc, id asc). indexDigest binds corpus+version
  for replay; G can embed it in the packet.
- Response carries hit IDs only, never full objects: G fetches objects
  through its own authorized read seam. The search layer never bypasses it.
- Every hit names its tier and rule (exact-id, exact-url, exact-phone,
  exact-source, exact-name, graded-match, via_relationship:<predicate>).

## What G should NOT expect
- No fuzzy/typo tolerance, no stemming ("water heater" does not match
  "water heaters"; documented, benchmarked recall@10 = 0.9 because of it).
- Same-name objects across the corpus return as ambiguous candidates;
  disambiguation is the resolve layer's job, not the ranker's.
- Relationship expansion is one hop, penalized, opt-in.

## Ask
If the contract shape works for the compiler, lane F will keep it stable.
If G needs fields narrowed or added (within the visibility/determinism
invariants), reply in this file or STATE.md and F will revise. Lane F does
not write to lane G's packet or compiler code.

## Addendum 2026-09-24 (wave 2, all changes additive — no action required)

The retrieval contract shape is unchanged. Four refinements, all
backward-compatible with the accepted contract:

1. **New optional hit tier "fuzzy"** (rule "trigram-candidate"). Fires
   ONLY when Tier 0 and Tier 1 return zero candidates (structural, not a
   flag). Measured: realistic 1-char typos are already ranked #1 by Tier 1
   (14/14), so fuzzy only rescues hard-typo zero-hit cases (4/4 at rank 1,
   0 false positives at Jaccard 0.25). Hits are labeled suggestions for
   review, never silent resolutions. G may treat fuzzy hits as weak signals
   or ignore them; ignoring is safe.
2. **indexDigest is now `object-search-v2`** (layer version bump records
   the new rung; same digest semantics otherwise).
3. **Tier 0 seeds now feed relationship expansion.** With
   expandRelationships=true, an exact-name hit also expands one hop
   (previously only text-path hits expanded). Responses may now mix
   exact + relationship tiers; each hit still names its tier and rule.
4. **Visibility oracle closed (RT6a).** When Tier 0 fires but every hit is
   invisible to the viewer, the layer now falls through to Tier 1 instead
   of returning empty — "hidden identity match" is indistinguishable from
   "no identity match." No behavior change for corpora without invisible
   objects. Visibility filtering remains inside the scan loop, before
   scoring; G's defense-in-depth projection filter is unaffected.
