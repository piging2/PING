# INTEGRATION NOTE — Lane G (Ask FYD Context Compiler)

Date: 2026-09-23 (night shift). Status: ADOPT+EXTEND complete per DUP-lane directive.
extend/context-compiler.ts is the single going-forward implementation (base file
adopted + 12 gaps closed, 17/17 delta tests green). No PING repo writes by this lane.

## Seams (coordinate, never duplicate)

### Lane F — Object search (F owns search authority; G consumes it)
- Contract ACCEPTED as offered (INTEGRATION-REQUEST-f.md, this lane's dir).
  Implemented in the compiler as the optional `search: { hits, indexDigest }`
  input: exact-tier hits boost strongly (+25), graded hits weakly (+5..15);
  `indexDigest` binds into `digests.searchIndex` for replay. When absent,
  local deterministic scoring stands alone. No contract changes requested.
- Visibility stays enforced at assembly regardless of search: F filters inside
  its scan loop AND the compiler filters at projection. Defense in depth, not
  trust.
- The relevance gate (question signal required: token hit OR intent-boosted
  schema OR lane-F hit) consumes F's hit presence as a signal; F's Tier 1
  score is not re-derived by G, only consumed.

### Lane E — Schema descriptions (G consumes E's vocabulary)
- Consumed: `lane-e/spike/out/agent-tool-descriptions.json` (schema -> NL
  description with fields + relationships). Two uses: (a) the schema->intent
  boost table (which schemas answer which question intents); (b) the canonical
  relationship vocabulary for predicate weights (`provides` 0.9, `employs`
  0.85, `located_at` 0.8, `publishes` 0.6 — legacy aliases `offers`,
  `has_article` kept at the same weights). Coverage is 3 schemas so far
  (business, service, post); the compiler's table extends to location/person/
  article and picks up E's fuller output when it lands. No E changes requested.

### Lane I — MCP edge (the packet's tool-shaped sibling)
- Shape coordination: lane I's tool result envelope already mirrors the
  claim-binding discipline (grades SUPPORTED/DERIVED/INFERRED/UNKNOWN).
  The ContextPacket is the deeper consumer shape; the MCP envelope is its
  tool-shaped sibling. Agreement needed on two versioned strings so a claim
  binding produced under one is verifiable under the other:
  - `claim-binding@1` (binding record shape: packetId, claimId, classification,
    evidenceRefIds, basis, source, lastChecked)
  - `ctx-compiler@2` (compiler version pinning weights, predicate table,
    budget policy, relevance gate; bumped from @1 because the delta changed
    the byte budget and the predicate table, so the determinism pin had to move)
  - packet wire: `ask-context-packet@2` (counts-only ledger, CapabilityView[],
    contentBoundary, sourceExcerpts, full-body packetId)
- What I's tools must never do: hand an MCP consumer raw canonical state.
  Any tool that answers a question (vs. returning a single object by id)
  should compile through G's packet first, or document why it bypasses it.
- Capabilities: the packet carries `CapabilityView { kind, label, actionId }`
  (handles, never tokens — lane L's rule, enforced at compiler Stage 1 by
  dropping secret-shaped fields). Lane I's tool surface should accept these
  handles as the action inventory for ask-flows.
- `contentBoundary`: the packet ships an explicit untrusted-data marker for
  LLM consumers. Lane I should forward it verbatim into any model-facing
  prompt it builds; it is part of the packet contract, not decoration.
- Vocabulary note: the compiler pins epistemic classes at selection time
  (website_statement / DIRECT_FACT / DERIVED_FACT / INFERENCE / GENERATED_COPY
  / USER_OVERRIDE / relationship_fact / provenance / UNKNOWN) with a rank
  order enforced by verifyClaimBindings (B3). Lane I's envelope uses the
  concierge's SUPPORTED/DERIVED/INFERRED/UNKNOWN grades. These are compatible
  (both narrow-only downstream) but not identical; do not merge the
  vocabularies without a mapping table owned by one lane.

### Lane J — Observability (every compilation is a run record)
- G emits, J records. Each compileContext call should produce a run record
  with: question hash (never raw question text if it contains PII — hash it),
  viewer role, target id, graphDigest, compilerVersion, packetId, input counts,
  admitted counts, visibilityProof.excluded (counts only), budget ledger
  (per-section max/used), notes (e.g. no_candidates_above_floor), and
  failure kind on CompilerFailure. This is what lets J answer WHY a question
  got the context it got.
- verifyClaimBindings outcomes (accepted/dropped with problem codes:
  uncited_non_unknown_claim, citation_leak, epistemic_upgrade, unknown_grade,
  unknown_with_citations) are answer-stage audit events; J owns the sink,
  G owns the event shape.
- Cost accounting: the packet's budget.usedBytes is the honest token-cost
  proxy for the ask call. J can multiply by the model rate; G does not do
  pricing.

### Lane N — Data lineage (bindings extend lineage to ANSWER)
- The claim binding is the lineage edge from PACKET to ANSWER: each binding
  commits to packetId (sha256 of the packet body), and each evidenceRefId
  resolves to an object/relationship/evidence id inside that packet. Lane N's
  7-stage trace (SOURCE BYTES -> OBSERVATION -> EVIDENCE -> OBJECT FIELD ->
  SITESPEC BINDING -> RENDERED CLAIM -> ASK FYD ANSWER) gains its final hop:
  ANSWER -> PACKET -> EVIDENCE, all content-addressed.
- What G needs from N: the evidence id scheme. The compiler mints
  `obj:<id>`, `field:<id>:<field>`, `rel:<id>` (adopted from the base file's
  field-level registry). If N's LineageEdge record defines canonical evidence
  ids, G adopts them; until then this scheme stands and is documented as
  provisional.
- Lane N's gap #1 (ACTION link: no record ties an executed action back to the
  answer + claim bindings that prompted it) is downstream of G: once answers
  carry claim bindings with packetId, the action planner (lane T) can cite
  them. G does not build the action link.

## Findings requiring coordinator attention

1. **Untracked proposal file in the PING repo — superseded by the delta.**
   `src/fyd/ask/context-compiler.ts` exists on the Pig at
   /home/nolan/projects/ping, untracked (`??`), byte-identical (sha256
   aab39942...) to this lane's superseded `port/context-compiler.ts` sketch.
   Per the DUP-lane ADOPT/EXTEND directive this lane built the delta on that
   base: `extend/context-compiler.ts` (17/17 delta tests green), which closes
   the 12 gaps the untracked file had (byte budget, counts-only ledger,
   relevance gate, full-body packetId, epistemic B3, provenance mapping,
   secret stripping, capability filtering, contentBoundary, lane-E weights,
   lane-F seam, recency). Recommendation: when the compiler is ported into
   PING, port from `extend/context-compiler.ts` (swap the local canonicalize/
   types for the repo imports), replacing the untracked file. This lane did
   not write or modify the Pig file (read-only rule honored; verified
   2026-9-23 ~19:55 MDT, repo still at e48ef710).

2. **One implementation now; archaeology marked.** `extend/context-compiler.ts`
   is the single going-forward implementation. `spike/compiler.js`
   (+ `run-tests.js`, 15/15 green) is kept as proven-semantics evidence, not a
   competing module. `spike/context-compiler.mjs` (+ `tests.mjs`) is the
   superseded first iteration (its fixture path does not exist; suite cannot
   run). `port/context-compiler.ts` is the superseded v1 sketch (do not wire).
   Nothing else in this lane is maintained.

3. **Owner-plane input is still untestable end to end.** The compiler specifies the
   `owner` role (public + owner-private plane) but the authenticated viewer lane
   does not exist; until it does, `owner` behaves as specified-but-unverifiable.
   Ship visitor-only first.

## Correction (2026-09-23 ~20:05 MDT, verification pass)

Finding 2 above is half wrong. Re-verified: the fixture
`~/workspace/fyd-factory/corpus/fixtures/clearwater-plumbing-demo.json` EXISTS
and `node --test tests.mjs` in `spike/` passes 11/11 against the REAL factory
fixture (proof: services packet, Saturday conflict, hidden-field scoping,
unanswerable roof question, 4 red-team, determinism, target-forcing,
owner-downgrade). The mjs suite runs fine; what is true is that
`context-compiler.mjs` is still the SUPERSEDED design: its exclusion ledger
is per-record WITH refs (`{ref: "cw-biz-01.email", reason: "field_hidden"}`),
which is the same id-leaking shape as the `port/` regression in finding 1.
`spike/compiler.js` (counts-only ledger, 15/15) remains the canonical port
source of truth. `show-packet.mjs` (mjs compiler vs real fixture) remains a
useful proof demo of a real packet.

## Integration requests filed
- to lane F: none needed. Contract accepted as offered; compiler consumes
  SearchResponse hits + indexDigest (see Lane F section above).
- to lane E: none needed. Consuming agent-tool-descriptions.json as it grows
  (currently 3 schemas); compiler tables extend beyond it.
- to lane I: version-string agreement updated — `claim-binding@1`,
  `ctx-compiler@2`, `ask-context-packet@2` — plus the contentBoundary
  forwarding rule (forward verbatim into any model-facing prompt).
- to lane N: canonical evidence id scheme to replace the provisional
  `obj:`/`field:`/`rel:` minting.
- to lane J: run-record event shape for compilations and binding verifications
  (question hash, role, target, graph digest, packet ID, exclusion counts,
  budget ledger, notes, failure kind).
