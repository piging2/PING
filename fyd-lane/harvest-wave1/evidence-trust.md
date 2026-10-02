# FYD Harvest Wave 1: EVIDENCE/TRUST lane

**Date:** 2026-09-21
**Lane:** EVIDENCE/TRUST (read-only harvest)
**Bounded question:** "Our renderer must refuse to render a factual statement that has no traceable basis. Which exact mechanism binds a rendered claim to its evidence (citation binding, claim/evidence data model, verification + canonical hashing) such that an unsupported binding fails closed or is omitted?"
**GitHub API calls used:** 0 (rate budget correction in force; PINNED SHA and LICENSE are TBD pending budget release)
**Local reference pattern (preserved, not diluted):** ACCUMULATE → VERIFY → RECOMPUTE CANONICAL HASH → RANK/DROP, enforced by `verifyPresentationBinding(binding, graph)` at the projection seam in `~/workspace/fyd-lane/repo/graph.ts` (pure, deterministic, fails closed; unsupported binding resolves to undefined and the caller omits the value).

## Local gap analysis (what the harvest is actually for)

Reading `graph.ts` and `render-model.ts` shows the local pattern is real but has two soft spots that external mechanisms can harden:

1. **VERIFY is presence-based, not recompute-based.** `verifyPresentationBinding` checks that `provenance.ref` is non-empty (for `direct`) and that `generatorRef` matches `name@version` (for `generated`). It never recomputes a hash over the evidence set. A ref that points at deleted or tampered evidence still passes. The PING EvidenceAuthority pattern (prior harvest C3) defines verify as recompute canonical hash + lineage + namespace consistency; FYD has the seam but not the recompute step.
2. **Canonical bytes are homebrew.** `canonicalizeModel` in `render-model.ts` is `sortKeys + JSON.stringify`. It does not normalize numbers (`1e30` vs `1E30`), does not define `-0` handling, uses default JS string escaping, and sorts by UTF-16 code unit order only by accident of `Array.sort()`. Any "recompute canonical hash" built on it is fragile and not reproducible across languages. This is the single highest-value harvest target.

Nothing surveyed replaces the local verifier. Several mechanisms beat individual components of it. Cards below.

---

## Candidate 1: JCS (JSON Canonicalization Scheme), RFC 8785

**PROJECT:** JSON Canonicalization Scheme (JCS), IETF RFC 8785 (2020). Reference implementations: `cyberphone/json-canonicalization` (Java/Python/JS, Anders Rundgren), `canonicalize` npm package.
**PINNED SHA:** TBD (budget)
**LICENSE:** TBD (budget; RFC text is IETF Trust; implementations vary, check per implementation at pin time)
**RECENT ACTIVITY:** RFC is stable since 2020. Ecosystem active: used by W3C Data Integrity proof suites, x402 deterministic binding specs, AetherNet evidence hashing (all confirmed via web reading 2026-09-21). The JS `canonicalize` package is described as downloaded millions of times per month.
**FYD PROBLEM:** FYD's "recompute canonical hash" step has no defined canonical bytes. `canonicalizeModel` (render-model.ts) is homebrew `sortKeys + JSON.stringify`: no number normalization, no escaping rules, no duplicate-key or `-0` semantics. Two processes can produce different bytes for the same logical evidence set, which makes hash recompute unreliable and cross-language verification impossible.
**MECHANISM:** Deterministic serialization rules for any JSON value: object keys sorted lexicographically (UTF-16 code units, recursive); no insignificant whitespace; numbers serialized per ECMAScript `Number.prototype.toString`; strings with minimal escaping (only `"`, `\`, and C0 controls); arrays keep order; literals lowercase. Same logical value always yields byte-identical output, so `sha256(jcs(value))` is a stable content digest.
**EXACT IMPLEMENTATION:** RFC 8785, sections 3-4 (the algorithm is fully specified in prose, roughly 2 pages, and is directly reimplementable in ~60 lines of TypeScript). Test vectors are published with the RFC and with the `cyberphone/json-canonicalization` repo. FYD graphs are pure JSON, so JCS applies with no format change.
**CLAIM EVIDENCE:** RFC 8785 is an IETF Proposed Standard (datatracker.ietf.org/doc/html/rfc8785). Multiple independent implementations pass the same test vectors.
**SOURCE EVIDENCE:** Web reading 2026-09-21: Jcs.NET README documents RFC-verified behavior and zero-dependency implementation; terraform-provider-burnham docs describe JCS as "the exact byte sequence you feed to a signing or MAC primitive"; merkleworks x402 SKILL.md specifies challenge binding as `SHA-256(JCS(challenge JSON))` with step-by-step rules; aethernet canonicalization.md mandates JCS before every hash/sign operation including evidence hashes.
**RUNTIME EVIDENCE:** None executed by this lane (read-only, no installs). Evidence is specification + published test vectors + independent implementations, not a live run.
**DEPENDENCY COST:** Near zero if harvested as algorithm (PATTERN_ONLY/ADAPT): reimplement the ~60-line canonicalizer in FYD's TS, verified against RFC test vectors. Alternatively depend on the `canonicalize` npm package (small, single-purpose). Either way this is the cheapest serious harvest in the lane.
**WHAT FYD ALREADY HAS:** `canonicalizeModel` / `canonicalizeOverrides` in `render-model.ts` (sortKeys + JSON.stringify). Same intent, weaker definition.
**WHAT THEY DO BETTER:** A complete, edge-case-closed definition of canonical bytes (numbers, escaping, ordering, `-0`), published test vectors, cross-language reproducibility, and status as the canonicalization step inside W3C proof suites. FYD's homebrew version has none of these.
**WHAT FYD DOES BETTER:** FYD applies canonicalization at the right layer (render model determinism for regen comparison). JCS is only a serializer; it decides nothing about which fields enter the digest. The prior harvest already flagged this: "JCS is syntactic; field inclusion is a semantic choice that must be part of the spec." FYD's evidence-set definition (which fields of which objects constitute the verified set) is the semantic layer JCS lacks.
**SMALLEST HARVESTABLE PRIMITIVE:** The JCS serialization algorithm itself: `jcs(value: unknown): string`. Drop-in replacement for `sortKeys + JSON.stringify` inside `canonicalizeModel`, then `sha256` over the result becomes the "recompute canonical hash" step with RFC-defined bytes.
**REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT:** ADAPT. Reimplement the algorithm in FYD TS (no new dependency), verify against RFC 8785 test vectors, keep FYD's field-inclusion semantics on top.
**CAN IT:**
- remove code? No (replaces ~15 lines with ~60, net add, but removes a class of bugs).
- remove ambiguity? Yes. "Canonical bytes" becomes RFC-defined instead of implementation-accidental.
- improve beauty? No.
- improve expressiveness? No.
- improve trust? Yes. Hash recompute becomes well-defined and independently reproducible; a second implementation (or the owner) can recompute the digest and get the same bytes.
- improve mobile? No.
- improve accessibility? No.
- improve performance? Neutral (key sorting dominates either way).
- improve regeneration? Yes. Regen can prove byte-identical canonical forms across runs, which is the evidence that "the regen applied exactly the approved evidence set."
- reduce AI improvisation? Indirectly: deterministic verification displaces any temptation to let an LLM judge evidence integrity.
**FALSIFICATION EXPERIMENT:** Implement `jcs()` in TS, run it against the RFC 8785 test vector suite plus 1,000 randomized JSON values compared against the reference Python `jcs` implementation. If any divergence appears that cannot be fixed within the algorithm (not the test harness), or if FYD's evidence objects contain non-JSON values (BigInt, undefined semantics) that JCS cannot represent without lossy coercion, the harvest fails and FYD keeps its homebrew canonicalizer with documented limits.

---

## Candidate 2: Subresource Integrity (SRI), W3C

**PROJECT:** Subresource Integrity, W3C Recommendation (webappsec-subresource-integrity). Implemented in every major browser engine.
**PINNED SHA:** TBD (budget; spec is a living document, pin the spec commit at use time)
**LICENSE:** TBD (budget; W3C document license)
**RECENT ACTIVITY:** Living standard; `Integrity-Policy` header (block resources without integrity metadata) shipping across Chromium/Firefox/Safari per web reading 2026-09-21.
**FYD PROBLEM:** FYD evidence refs are bare strings (`provenance.ref`). There is no standard encoding for "this ref carries the expected digest of the evidence," and no policy that says "a claim whose evidence ref lacks a digest must be dropped." SRI is the deployed, web-scale instance of exactly this policy.
**MECHANISM:** ACCUMULATE: author collects `integrity` metadata (`<hash-alg>-<base64-digest>`, e.g. `sha384-oqVuAf...`) at build time. VERIFY: consumer fetches the resource bytes. RECOMPUTE CANONICAL HASH: consumer hashes the received bytes with the named algorithm. RANK/DROP: match executes/applies; mismatch, or present-but-unverifiable metadata (e.g. CORS failure), blocks the resource and surfaces a network error. Fail closed is the specified behavior, not an implementation choice. `Integrity-Policy: blocked-destinations=(script)` extends this to "missing integrity metadata fails closed too," which is the direct analog of FYD's "no evidence ref means omit."
**EXACT IMPLEMENTATION:** The `integrity` attribute grammar (`<hash-source>` = `<alg>-<base64-value>`, whitespace-separated list, strongest supported algorithm wins) and the verification algorithm in the SRI spec; the `Integrity-Policy` response header for the missing-metadata-equals-block policy.
**CLAIM EVIDENCE:** W3C Recommendation; implemented natively in Chromium, Gecko, WebKit. Secondary writeups (vite-plugin-sri-gen docs, security-alliance frameworks, googlechrome modern-web-guidance) all describe identical fail-closed semantics.
**SOURCE EVIDENCE:** Web reading 2026-09-21 (spec summaries and implementation docs listed above).
**RUNTIME EVIDENCE:** None executed by this lane. The mechanism's runtime evidence is the entire web: every browser enforces it.
**DEPENDENCY COST:** Zero as a pattern. FYD already runs in a browser context at the end of its pipeline; the harvest is the digest-string grammar plus the fail-closed policy, not a library.
**WHAT FYD ALREADY HAS:** `verifyPresentationBinding` fails closed on missing `provenance.ref`, which is SRI's `Integrity-Policy` analog at the claim level. What FYD lacks is the digest half: refs carry no expected hash.
**WHAT THEY DO BETTER:** A standard, compact digest encoding (`sha384-<base64>`) with algorithm agility, and a crisp policy statement: unverifiable equals blocked, including the missing-metadata case. Also a real-world lesson FYD should copy: "pin to an immutable versioned resource; anything you cannot pin must be dropped before you enforce" (from the Integrity-Policy writeup). For FYD: any evidence that cannot be digest-pinned cannot be a `direct` claim; it must be reclassified or omitted.
**WHAT FYD DOES BETTER:** SRI binds a resource to bytes. FYD binds a rendered statement to a claim/evidence chain (visible value to object field to claim to evidence to observation to source). SRI has no notion of claim classification (direct/derived/generated/owner_authored) and no lineage beyond the digest. The local verifier's typed verdicts (`unknown object`, `unbound field`, `no evidence ref`, `no generator ref`) are richer failure semantics than SRI's single network error.
**SMALLEST HARVESTABLE PRIMITIVE:** The digest-string grammar `"<alg>-<base64>"` for evidence refs, plus the policy sentence: "a `direct` binding whose evidence ref carries no digest, or whose recomputed digest mismatches, resolves to undefined." That is two lines of policy plus a string format.
**REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT:** REPURPOSE PATTERN. Do not import anything; encode evidence refs as SRI-style digest strings and extend the verifier's `direct` case to recompute-and-compare (which needs Candidate 1's canonical bytes to be meaningful).
**CAN IT:**
- remove code? No.
- remove ambiguity? Yes. "What does an evidence ref contain" gets a standard answer.
- improve beauty? No.
- improve expressiveness? Slightly: algorithm agility in the ref format.
- improve trust? Yes. Refs become self-verifying; tampering with evidence after binding breaks the digest and the claim drops.
- improve mobile? No.
- improve accessibility? No.
- improve performance? Neutral.
- improve regeneration? Yes. Regen can re-verify every digest without trusting stored verdicts.
- reduce AI improvisation? Yes, marginally: digest comparison is mechanical, leaving no judgment call for an LLM to fill.
**FALSIFICATION EXPERIMENT:** Take 50 real evidence refs from a FYD fixture graph, encode as `sha384-<base64>` over JCS-canonicalized evidence bytes, then tamper with one byte of three evidence blobs and delete two. The extended verifier must drop exactly the five affected `direct` bindings and keep the rest. If the digest check produces false drops (encoding bugs) or misses tampered evidence (canonicalization instability), the primitive is not ready.

---

## Candidate 3: Trusty URIs (nanopublications)

**PROJECT:** Trusty URIs (Kuhn et al., ESWC 2014; arXiv:1401.5775). Implementations: `trustyuri/trustyuri-java`, `trustyuri/trustyuri-perl`, `trustyuri/trustyuri-python`; `Nanopublication/nanopub-java`.
**PINNED SHA:** TBD (budget)
**LICENSE:** TBD (budget)
**RECENT ACTIVITY:** Spec stable since 2014. Still in active use: nanopublication infrastructure mints `RA...` trusty URIs; a 2026-08 DAPPER research note recommends trusty URIs for artifact identity and explicitly warns not to reimplement the `RA` module approximately.
**FYD PROBLEM:** Claim and evidence identifiers in FYD are incidental (assigned IDs). Nothing binds an identifier to the content it names, so an ID can silently point at changed content. Trusty URIs invert this: the identifier IS the hash of the canonical form.
**MECHANISM:** Module RA: take an RDF dataset, canonicalize it (sort triples into a defined order), hash with SHA-256, base64-encode, embed in the URI (`.../RA<43-char-hash>`). Verification (`CheckFile`, `CheckRdf`, `CheckSortedRdf`): recompute the canonical form from the presented content, recompute the hash, compare with the URI. Mismatch means the content is not what the URI names; fail closed. Module FA does the same for raw byte files. The design composes: a nanopublication's assertion, provenance, and publication-info graphs each get trusty URIs, and references between them are verifiable.
**EXACT IMPLEMENTATION:** The RA module algorithm (RDF canonicalization via sorted N-Quads, SHA-256, base64url-ish encoding) and the `Check*` functions in `trustyuri-java` (per the paper, section 4; implementations in Java/Perl/Python).
**CLAIM EVIDENCE:** Peer-reviewed paper (ESWC 2014, IEEE TKDE journal version) with evaluation showing verification practical at scale (Java batch mode ~1ms per file). Independent implementations in three languages.
**SOURCE EVIDENCE:** Web reading 2026-09-21: arXiv abstract and paper section 4 (CheckFile/ProcessFile/TransformRdf/CheckRdf function list); DAPPER trusty-identifiers.md (2026-08) describing `RA` URIs as "versioned content addresses calculated from a canonical representation" with a worked example.
**RUNTIME EVIDENCE:** None executed by this lane.
**DEPENDENCY COST:** As a library: high (RDF stack: Sesame/RDFLib/Trine). As a pattern: near zero. FYD must NOT import the RDF machinery.
**WHAT FYD ALREADY HAS:** Object IDs and provenance refs, but neither is content-derived. The local pattern's "recompute canonical hash" step is the unverified half of what trusty URIs do on every check.
**WHAT THEY DO BETTER:** The single deepest idea in the lane: make the identifier commit to the content. Once a claim ID is `sha256(canonical claim)`, "recompute and compare" is not a separate verification pass; it is dereferencing. Reference trees become verifiable transitively (claim to evidence to observation to source), which is exactly FYD's lineage requirement made mechanical.
**WHAT FYD DOES BETTER:** Trusty URIs verify fixity (content has not changed), not evidentiary support (content actually backs the claim). A trusty URI on a fabricated evidence blob verifies perfectly. FYD's verifier asks the harder question (does this evidence ref exist and does the classification permit rendering), which trusty URIs never ask. Also, FYD's domain is JSON, not RDF; the RA module's RDF canonicalization is the wrong canonical form for FYD (Candidate 1 is the right one).
**SMALLEST HARVESTABLE PRIMITIVE:** The design rule: `claimId = "fyd" + base64url(sha256(jcs(canonicalClaimEnvelope)))`, and the check rule: any component that resolves a claim ID recomputes the digest over the presented envelope and refuses on mismatch. Content-addressed claim IDs, RDF-free.
**REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT:** PATTERN_ONLY. Harvest the identifier-design principle and the transitive-reference-tree argument; do not touch the RDF implementations.
**CAN IT:**
- remove code? No.
- remove ambiguity? Yes. "What does this ID name" gets a cryptographic answer.
- improve beauty? No.
- improve expressiveness? No.
- improve trust? Yes, for fixity and for making stale references detectable (a corrected claim gets a new ID; old render models referencing the old ID visibly diverge).
- improve mobile? No.
- improve accessibility? No.
- improve performance? Slightly negative (hash on every dereference; cacheable).
- improve regeneration? Yes. Regen can diff claim IDs to prove exactly which claims changed between generations, which is the evidence behind "the correction survived regen."
- reduce AI improvisation? No direct effect.
**FALSIFICATION EXPERIMENT:** Content-address 1,000 claim envelopes from a fixture graph; mutate one field in 10 envelopes and confirm all 10 produce different IDs and the other 990 are unchanged; then confirm that a second implementation (Python, using the `jcs` PyPI package) reproduces all 1,000 IDs byte-identically. If cross-language reproduction fails, the ID scheme is not a commitment anyone else can check, and the pattern's value collapses to local-only fixity.

---

## Candidate 4: Hashlink (IETF draft-sporny-hashlink-07, expired)

**PROJECT:** "Cryptographic Hyperlinks" (Hashlink), IETF Internet-Draft by Sporny and Rosenthol, latest draft-sporny-hashlink-07 (May 2021, expired November 2021, never became an RFC).
**PINNED SHA:** TBD (budget; note: pinning a draft means pinning draft -07 text)
**LICENSE:** TBD (budget; IETF Trust legal provisions)
**RECENT ACTIVITY:** Dead as a standards track item (expired 2021, no successor draft observed). The ideas live on inside W3C VC/DID work that references multihash encodings.
**FYD PROBLEM:** Same as Candidate 2's problem (evidence refs carry no digest), plus: some FYD evidence is fetched from URLs (business websites, review pages). A bare URL ref cannot detect that the fetched bytes changed since the claim was bound.
**MECHANISM:** Data model: resource hash (REQUIRED, multihash-encoded, multibase-serialized) + optional metadata (one or more URLs that should dereference to bytes matching the hash, exactly one content type, experimental fields), serialized as `hl:<multihash>:<cbormetadata>` or as `<url>?hl=<multihash>`. Verification semantics: fetch each URL, hash the bytes, compare to the resource hash; the hash MUST be present, so a hashlink without one is malformed. Section 4 specifies encoders/decoders with test values ("Hello World!" vectors).
**EXACT IMPLEMENTATION:** draft-sporny-hashlink-07, sections 2 (data model), 3 (serialization: multihash then multibase for the resource hash; CBOR map with keys 15/14/13 for URLs/content-type/experimental metadata), 4 (encoder/decoder conformance), appendix B (test values). Read in full via datatracker 2026-09-21.
**CLAIM EVIDENCE:** Expired Internet-Draft; explicitly "work in progress" and "inappropriate to use as reference material" per its own status section. Test values exist but there is no conformance suite and no RFC.
**SOURCE EVIDENCE:** Full draft text read 2026-09-21 (datatracker.ietf.org/doc/html/draft-sporny-hashlink). Multihash/multibase are stable external formats referenced normatively.
**RUNTIME EVIDENCE:** None; no maintained implementation surveyed.
**DEPENDENCY COST:** Tiny as a pattern (one string format, ~30 lines to parse/verify). No library needed.
**WHAT FYD ALREADY HAS:** Bare URL/string refs. The draft's "resource hash MUST be provided" rule is stricter than anything FYD currently enforces.
**WHAT THEY DO BETTER:** The multi-source insight: one hash, several URLs (HTTP mirror, IPFS, onion in the draft's example). For FYD evidence this maps to "the same evidence captured from two independent fetches"; if either fetch matches the hash, the evidence is intact. Also the `?hl=` parameterized encoding is a pragmatic fallback for systems that cannot change their URL resolver.
**WHAT FYD DOES BETTER:** Everything about claim semantics. Hashlink verifies byte fixity of a fetched resource; it says nothing about whether the resource supports the claim, which classification applies, or what to do with conflicting evidence. FYD's verifier plus classification system is the actual claim/evidence model; hashlink is only a better ref format.
**SMALLEST HARVESTABLE PRIMITIVE:** The `hl:<multihash>` resource-hash-first ref format for URL-backed evidence, with the rule "no hash means malformed ref means the binding cannot be `direct`." Multihash gives algorithm agility for free.
**REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT:** ADAPT (narrowly). Adopt the data model shape (required hash + optional URLs + content type) for FYD's URL-backed evidence refs; do not claim standards compliance with an expired draft.
**CAN IT:**
- remove code? No.
- remove ambiguity? Yes, for URL-backed evidence: one format for hash plus locations.
- improve beauty? No.
- improve expressiveness? Slightly (multi-source evidence locations).
- improve trust? Yes, for fetched evidence: refetch-and-compare becomes possible.
- improve mobile? No.
- improve accessibility? No.
- improve performance? Neutral.
- improve regeneration? Yes. Refresh passes can re-fetch evidence URLs and detect changed bytes mechanically.
- reduce AI improvisation? No.
**FALSIFICATION EXPERIMENT:** Encode 20 URL-backed evidence refs as hashlinks, then change the content at 5 URLs without changing the URL. A refresh pass must flag exactly those 5 as hash-mismatched. If URL fetch failures (timeouts, bot-blocking, JS-rendered pages) make refetch-and-compare unreliable for typical small-business sites, the primitive degrades to "hash of first capture only," and the multi-source half of the value is lost. That outcome would demote this to PATTERN_ONLY.

---

## Candidate 5: Wikidata/Wikibase statement model (references + ranks)

**PROJECT:** Wikibase data model (Wikidata). Deployed at 100M+ statements.
**PINNED SHA:** TBD (budget; model is documented on wikidata.org, pin the docs revision at use time)
**LICENSE:** TBD (budget; CC0 for data, docs under CC BY-SA)
**RECENT ACTIVITY:** Continuously deployed; Help:Ranking docs current as of 2026 crawls.
**FYD PROBLEM:** FYD's RANK/DROP step is binary (verified renders, unverified omits). Real business data has competing values for one field (old phone number vs new, two sources disagreeing on hours). FYD needs a principled way to rank competing verified claims and to mark a claim deprecated without deleting its lineage.
**MECHANISM:** A statement is a claim node carrying: the value, qualifiers (scope: point in time, applies to part), references (evidence blocks; each reference lists source properties like P248 "stated in," reference URL, retrieved date), and a rank: preferred, normal (default), or deprecated. Query semantics: "truthy" queries return best rank (preferred if any, else normal) and exclude deprecated. Deprecated statements are retained with full lineage; they are excluded from rendering, not deleted. References are evidence presence with source typing, not bare URLs.
**EXACT IMPLEMENTATION:** Wikibase `wikibase:rank` / `wikibase:BestRank` RDF mapping; `Help:Ranking` and `Help:Sources` documentation; the `wdt:` (truthy/best-rank) vs `p:`/`ps:` (all statements) predicate split in the query service.
**CLAIM EVIDENCE:** Production system at massive scale; documented query semantics; third-party epistemic operators built on top (e.g. a 2026 sensiblaw spec formalizes rank-gated-by-evidence projection over Wikidata statements).
**SOURCE EVIDENCE:** Web reading 2026-09-21: wikidata.org Help:Ranking (rank definitions, best-rank query examples for Q16/P1082 and Q692/P569); sensiblaw `wikidata_epistemic_projection_operator_spec_v0_1.md` (rank gated by evidence counter, conflict aggregation rules).
**RUNTIME EVIDENCE:** None executed by this lane; the system itself is the runtime evidence.
**DEPENDENCY COST:** Zero as a pattern. No Wikibase software is involved; only the data-model shape.
**WHAT FYD ALREADY HAS:** Claim classifications (direct/derived/generated/owner_authored) and owner visibility policy (SHOW/HIDE/COARSE). No rank among competing values for one field, no deprecated-but-retained state.
**WHAT THEY DO BETTER:** Three things. (1) References as structured evidence blocks (source identity + retrieval date), not bare strings, which makes "verify each piece" actually implementable. (2) Deprecated rank: a claim can lose without being erased, preserving the Ask FYD to WHY THIS to owner-correction audit trail. (3) Best-rank query semantics: a deterministic rule for "which value renders when several are verified," which is the RANK half of the local pattern made explicit.
**WHAT FYD DOES BETTER:** Wikidata ranks are editorial and social; a preferred rank means editors prefer it, not that evidence verifies it. FYD's design law ("missing evidence NEVER becomes HEALTHY"; verification by recompute) is stricter. Wikidata also has no fail-closed renderer; deprecated statements are merely excluded from truthy queries by convention. FYD's projection-seam verifier is the enforcement Wikidata lacks.
**SMALLEST HARVESTABLE PRIMITIVE:** Two enums on the claim node: `rank: preferred | normal | deprecated` and `references: [{ source, sourceType, retrievedAt }]`; plus the render rule: render best-rank verified claims only; deprecated claims are retained for lineage and never render. Owner corrections map naturally: a correction deprecates the old claim (lineage kept) and adds the new one as preferred.
**REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT:** PATTERN_ONLY. Adopt the rank/reference shape into FYD's claim model; keep FYD's cryptographic verification underneath it (Wikidata's social verification must not leak in).
**CAN IT:**
- remove code? No.
- remove ambiguity? Yes. "Two verified values for one field" gets a deterministic answer.
- improve beauty? No.
- improve expressiveness? Yes. Deprecated-but-retained is new expressive power for the correction loop.
- improve trust? Yes. Corrections become auditable state transitions instead of silent overwrites.
- improve mobile? No.
- improve accessibility? No.
- improve performance? Neutral.
- improve regeneration? Yes. Regen diffing by rank transitions ("this claim went normal to deprecated because the owner corrected it") is exactly the evidence the correction-survived-regen proof needs.
- reduce AI improvisation? Yes. Rank selection is a deterministic rule, not a judgment call.
**FALSIFICATION EXPERIMENT:** Model 30 fields with competing values (old vs new phone, conflicting hours from two sources) using ranks + structured references. An owner correction must deprecate exactly one claim, promote one to preferred, and leave lineage queryable. If any realistic FYD correction scenario requires more than three ranks or cannot be expressed without deleting lineage, the model is insufficient and FYD needs a richer transition log instead.

---

## Candidate 6: SHACL (Shapes Constraint Language), W3C

**PROJECT:** SHACL, W3C Recommendation (2017). Implementations: pySHACL, TopBraid, rdf-validate-shacl (JS).
**PINNED SHA:** TBD (budget)
**LICENSE:** TBD (budget; W3C document license; implementations vary)
**RECENT ACTIVITY:** Stable Recommendation; implementations maintained.
**FYD PROBLEM:** FYD's binding rules ("a direct claim must carry a non-empty evidence ref," "a generated claim must carry a name@version generatorRef") are encoded as imperative checks inside `verifyPresentationBinding`. As the rule set grows (ranks, reference structure, owner policy), imperative checks become an unreviewable tangle. SHACL is the declarative alternative: shapes as data, evaluated by a validator, producing a validation report.
**MECHANISM:** Shapes constrain a graph: e.g. "every node of type RenderableClaim must have at least one `evidenceRef` property" (`sh:minCount 1`), "every `generatorRef` must match pattern `name@version`" (`sh:pattern`). The validator evaluates shapes against the data graph and emits a validation report (conforms true/false plus per-violation results). The projection seam then drops non-conforming bindings. Fail closed falls out of "non-conforming means omit."
**EXACT IMPLEMENTATION:** W3C SHACL spec, core constraint components (`sh:minCount`, `sh:pattern`, `sh:class`, `sh:or`, `sh:not`); `sh:ValidationReport` as the machine-readable verdict.
**CLAIM EVIDENCE:** W3C Recommendation with a published test suite; multiple independent implementations.
**SOURCE EVIDENCE:** Spec knowledge; no new web reads needed beyond confirming Recommendation status (well established).
**RUNTIME EVIDENCE:** None executed by this lane.
**DEPENDENCY COST:** As a library: prohibitive. Every implementation assumes an RDF graph stack; FYD's graph is JSON/TypeScript. Adopting SHACL-the-library means adopting RDF, which is a huge dependency for a tiny capability. As a pattern: near zero.
**WHAT FYD ALREADY HAS:** The imperative equivalent in `verifyPresentationBinding` plus its test suite (`bindings.test.ts`), which already encodes shape-like rules as named failure reasons.
**WHAT THEY DO BETTER:** Declarative, data-driven rules with machine-readable violation reports. Rules can be versioned, diffed, and reviewed as data rather than read out of code. The validation report gives structured failure reasons for free.
**WHAT FYD DOES BETTER:** FYD's verifier is ~40 lines of pure TS with zero dependencies and runs at the exact seam where the decision matters. SHACL-the-pattern adds indirection (shape authoring, shape validation, report interpretation) for rules simple enough to read directly. FYD's typed verdicts are already as expressive as a validation report for its current rule set.
**SMALLEST HARVESTABLE PRIMITIVE:** The discipline, not the code: express each binding rule as a named, data-shaped predicate with a machine-readable violation, and keep the rule list reviewable as data (even if it stays TS). If the rule set ever outgrows ~10 rules, revisit SHACL-shaped declarative validation then.
**REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT:** PATTERN_ONLY, with an explicit do-not-import decision recorded: the RDF dependency cost disqualifies the library permanently for FYD's JSON/TS stack.
**CAN IT:**
- remove code? No.
- remove ambiguity? Mildly, if rules become data.
- improve beauty? No.
- improve expressiveness? Mildly.
- improve trust? Neutral at current rule count; positive only if rules grow substantially.
- improve mobile? No.
- improve accessibility? No.
- improve performance? Neutral.
- improve regeneration? No.
- reduce AI improvisation? No.
**FALSIFICATION EXPERIMENT:** Rewrite FYD's current binding rules as declarative shape data in TS and re-run `bindings.test.ts` unchanged. If the declarative version is longer, harder to read, or slower to reason about than the imperative verifier for the current rule set, the pattern is premature and should stay parked until the rule count justifies it.

---

## KILL LIST (one-line rejections)

- **W3C PROV-O / PROV-DM:** records provenance relations with no verification semantics; provenance theater by the lane's reject rule.
- **schema.org ClaimReview / Google Fact Check Tools API:** attaches third-party reviews to claims; never verifies the claim itself; EVIDENCE != CORRECTNESS.
- **ClaimBuster:** scores check-worthiness (relevance), not evidential support; RELEVANCE != EVIDENCE.
- **W3C Verifiable Credentials / Data Integrity proofs:** verifies issuer signatures, not claim truth; FYD's claims are first-party, so the PKI buys nothing; heavy dependency for zero binding improvement.
- **C2PA:** real hash-bound assertion manifests with fail-closed validation, but media-only and the SDK/trust-list dependency is enormous for FYD's claim scope; pattern noted, library rejected.
- **in-toto / SLSA provenance:** attests software build provenance; wrong domain (artifacts, not rendered business claims).
- **TUF (The Update Framework):** threshold-signed update metadata; wrong domain.
- **Sigstore / rekor:** transparency log proves a signature happened; proves nothing about claim-to-evidence binding; heavy infrastructure.
- **SCITT (IETF):** signed-statement transparency is the right shape but immature with no stable implementations; watch only, revisit in a later wave.
- **EAS / Hypercerts:** on-chain attestations; blockchain dependency and wrong trust model for first-party business facts.
- **Certificate Transparency:** Merkle inclusion proofs give public auditability of issuance, not per-render claim binding; the primitive belongs to the continuity/ledger lane, not this one.
- **OpenTimestamps:** proves a hash existed at a time; time is not evidence.
- **Great Expectations / dbt tests:** batch suite validation of datasets; wrong granularity, cannot gate a single rendered binding; heavy dependency.
- **OPA / Rego (as dependency):** deny-by-default policy is the right instinct but a full policy engine is a huge dependency for checks the verifier already does in ~40 lines; pattern acknowledged, import rejected.
- **Hypothesis annotations:** anchors commentary to URLs; no verification step at all.
- **PROV-JSON / RO-Crate / FHIR Provenance / Dublin Core / PAV:** serialization formats and data models with no verification semantics; provenance theater.
- **Macaroons / Biscuit:** authorization caveats on bearer tokens; wrong layer (authz, not evidence).
- **TLSNotary / DECO:** proves web data authenticity via MPC-TLS; heavyweight cryptography for a problem FYD does not have (its evidence is first-party extracted, not adversarially served).
- **IPLD / multiformats stack (as dependency):** content addressing is directionally right, but adopting the multiformats/CID stack for FYD's pure-JSON graph is heavier than JCS; DAG-CBOR noted as the fallback if FYD ever needs canonical bytes for non-JSON binary blobs.

---

## Verdict

**Nothing surveyed beats the local ACCUMULATE → VERIFY → RECOMPUTE CANONICAL HASH → RANK/DROP pattern as a whole.** The local verifier's design, fail-closed at the projection seam with typed verdicts, is not surpassed by any external mechanism found. Most external systems fail the lane's core test: they record provenance without verifying it (PROV-O, ClaimReview, RO-Crate), verify the wrong thing (VCs verify issuers, CT verifies issuance, SRI verifies byte fixity), or cannot fail closed on missing evidence.

**Four components are beaten, and those are the harvests:**

1. **Canonical bytes:** JCS (RFC 8785) strictly dominates FYD's homebrew `sortKeys + JSON.stringify`. This is the highest-value harvest in the lane; it turns "recompute canonical hash" from an aspiration into an RFC-defined operation with test vectors. ADAPT.
2. **Digest encoding on evidence refs:** SRI's `<alg>-<base64>` grammar plus its "missing metadata fails closed" policy (Integrity-Policy) is the standard form of what FYD's `direct` case wants to enforce. REPURPOSE PATTERN.
3. **Claim identifier design:** Trusty URIs' "identifier IS the hash of the canonical form" beats incidental IDs and makes reference trees transitively verifiable. PATTERN_ONLY.
4. **Rank/drop data model:** Wikidata's statement plus structured references plus preferred/normal/deprecated ranks with best-rank query semantics is the deployed, large-scale form of the RANK/DROP half, including the crucial deprecated-but-retained state for the owner-correction loop. PATTERN_ONLY.

**Recommended build order:** (1) JCS canonicalizer replacing `sortKeys` in `canonicalizeModel`, verified against RFC test vectors; (2) SRI-style digest strings on evidence refs with recompute-and-compare in the verifier's `direct` case; (3) rank + structured references on the claim model; (4) content-addressed claim IDs. Each step is independently falsifiable per the experiments above.

**Budget note:** 0 GitHub API calls used. On budget release, pin SHA + license (single repo-endpoint call covers both) for, in priority order: the JCS reference implementation used for test vectors (`cyberphone/json-canonicalization`), and the trusty URI spec/implementation only if the content-addressed-ID step is approved. SRI, Wikidata model, SHACL, and hashlink need no repo pins (specs and expired drafts, not dependencies).
