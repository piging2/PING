# VEIN 4 - Evidence + Provenance Archaeology (OBSERVATION -> EVIDENCE)
Date: 2026-09-27. Researcher: vein-4 subagent (c59e0c03). RESEARCH-ONLY; no PING/FYD writes, no branches, no commits.

## 0. Audit provenance (how the current-state claims were keyed)

- **Pig reachability: NO.** SSH via `ssh -F /home/hatch/.ssh/pig-config pigwsl` failed twice with `nc: proxy read: Broken pipe / Connection closed by UNKNOWN port 65535` (hatch-egress-proxy:3130). The canonical checkout `/home/nolan/projects/ping` could not be reached and live HEAD could not be verified this pass (last known: HEAD c93a7ced on branch fyd/sprint-integration-2026-09-24 as of 2026-09-26).
- **Current-state claims below are keyed to three verified sources, not to a live checkout:**
  - (S1) `~/workspace/harvest/research/2026-09-26/veins56-contracts.md` - Pig-reachable audit 2026-09-26, repo `/home/nolan/ping`, branch `feature/orca-reaper-hold`, constitutional/kernel files read live with LOC verified.
  - (S2) `~/workspace/harvest/reports/2026-09-26.md` - pass report: `buildAskContext` evidenceRefs/provenance/epistemic classes; sentence-level `[n]` evidence binding; claimClassifications; citations (source, basis, lastChecked, claimClass); `noEvidenceAnswer` refusal; 117k-char evidence bloat measurement; circular-ref defect in HashAuthority.
  - (S3) `~/workspace/sprint-2026-09-24/architectural-corrections-2026-09-25.md` - constitutional ruling: Binding Verifier model, no new EvidenceAuthority.
  - (S4) memory 2026-09-13 - Evidence is one of the 12 single-ownership constitutional areas; minimum trace chain WHO -> WHAT -> NAMESPACE -> CAPABILITY -> AUTHORIZED BY -> RUN -> CANONICAL RESULT -> EVIDENCE -> PROMOTED BY.
- **Honest gaps this pass (need Pig access to close):** (a) whether PING's `merkle_tree.ts` (291 LOC, replay kernel) uses CT-style domain separation; (b) whether evidence digests (evidenceRefs) record the canonicalizer/algorithm that produced them; (c) whether any explicit digest-equality check chains a derivation link's claimed input to the input artifact's recorded digest (in-toto MATCH-rule style); (d) the current live HEAD and whether any evidence files changed since 2026-09-26.
- **Dedup:** checked `~/workspace/harvest/candidates.json`. None of the repos below have rows. New rows added for all eight repos; W3C PROV is N/A(SPEC) and stays out of candidates.json per the 2026-09-26 convention.

## 1. Current PING/FYD evidence machinery (from S1, S2, S3)

| Component | Mechanism (verified source) |
|---|---|
| `HashAuthority` (TS constitutional, 155 LOC) | SHA-256 only; `canonicalizeObject()` = recursive key sort (UTF-16 `.sort()`), arrays keep order, `undefined` -> `null`, circular refs NOT guarded (stack overflow, real latent defect, S2); `hashCanonical()` wraps a versioned envelope `{canonical_version:'1.0.0', serialization_version:'1.0.0', algorithm, payload}` before hashing (S1) |
| `CanonicalJson` (replay kernel, 188 LOC) | RFC-8785 JCS: UTF-16 key order, -0 -> 0, NaN/Inf rejected, circular/sparse rejected, MAX_NESTING_DEPTH=64 (S1) |
| `IdentityAuthority` (143 LOC) | `CONSTITUTIONAL_VERSION='1.0.0'` embedded in every hashed input; `generateId()` -> `type_<hash16>`; historical IDs immutable (identity-era law, S1) |
| `PingCanonicalEnvelope` (268 LOC) | Stripped payload -> raw SHA-256 of canonicalBytes (deliberately NOT `HashAuthority.hashCanonical`, no version envelope) -> Ed25519 sign over canonical bytes incl. payload_hash; `verifyPayload()` fail-soft; `schema` string uninterpreted (S1) |
| `merkle_tree.ts` (replay kernel, 291 LOC) | Merkle tree hashing via `CertificateAuthority.sha256`; domain separation unverified this pass (gap a) (S1) |
| Ask-FYD evidence binding | `buildAskContext`: bounded object projection (500-char field truncation), evidenceRefs, provenance -> epistemic classification (DIRECT_FACT / website_statement / owner_override / relationship_fact / DEMO_SYNTHETIC), digest-bound SiteSpec summary; every factual sentence carries `[n]` markers bound to evidenceRefs; claimClassifications bind claims to evidence ref ids; citations carry source, basis, lastChecked, claimClass; `noEvidenceAnswer` refusal (S2) |
| Binding Verifier (constitutional) | PUBLIC STATEMENT -> FACTUAL DEPENDENCIES (DIRECT / DERIVED / GENERATED / OWNER-AUTHORED) -> SUPPORTING EVIDENCE / OWNER ASSERTION -> VISIBILITY DECISION -> PUBLIC PROJECTION. Enforced by a verifier, NOT a new authority; "No new EvidenceAuthority" (S3) |
| Known weakness | 117k chars stored + hashed per article page (evidence bloat, S2); no writer authorized |

Program law applying to all candidates below: EVIDENCE IS IMMUTABLE. INTERPRETATION EVOLVES. No new authorities.

## 2. Donor pins (all verified live via GitHub commits API, full 40-char; licenses via root license files because the license endpoint returned NOASSERTION for all but one)

| Repo | Pinned SHA | Commit date | License (root file) |
|---|---|---|---|
| in-toto/in-toto (branch develop) | e352b43ad7cb8915d84c36d791aa61346152a0a3 | 2026-08-27 | Apache-2.0 |
| in-toto/attestation (branch main) | fd2609c16bcb0ac53443e2b4612977f997e8f9a5 | 2026-09-14 | Apache-2.0 |
| slsa-framework/slsa (branch main) | 618f5b2192aad8417a8ee8ccb9e3f27d05c0e9b6 | 2026-09-16 | Community Specification License 1.0 |
| git/git (branch master) | 0f8e75abebff0877cae681a3d5ff31ac47f54220 | 2026-09-23 | GPLv2 only (COPYING: "the only valid version ... is this particular version (ie v2)") |
| ipld/ipld (branch master, specs site) | 56876b48082e3eb68fada7264702cf7a66c93e93 | 2026-09-16 | Dual Apache-2.0/MIT |
| multiformats/cid (branch master, spec) | 9eca1c5ba064823a5ddbe13e9925f9b6c9d19c84 | 2026-06-30 | CC-BY-3.0 (spec text license) |
| multiformats/multihash (branch master) | b43ec1026a610fa87878e53b3daecf3a14b3ef6f | 2025-04-28 | MIT |
| google/certificate-transparency (branch master) | 0fe5116f42890853e9fcf5120f1f5129d64f64ea | 2023-08-02 | Apache-2.0 |
| W3C PROV | N/A(SPEC) - http://www.w3.org/TR/prov-dm/ | 2013 REC | W3C Document License; no code |

## 3. Per-candidate records (16 fields)

### CANDIDATE 1: in-toto supply-chain layout/attestation model

- **AREA:** 4 (Evidence + Provenance). Arrow edge: OBSERVATION -> EVIDENCE.
- **CURRENT PING IMPLEMENTATION:** Evidence refs with epistemic classes + claimClassifications + citations (source, basis, lastChecked, claimClass), enforced by the Binding Verifier; no documented artifact-digest chaining rule between pipeline steps (S2, S3).
- **EXTERNAL IMPLEMENTATION:** in-toto 2.x Python: `Layout` (ordered steps, authorized functionary keys, inspections, expires, readme) in `in_toto/models/layout.py`; `Link` ("Evidence for a performed step or inspection": materials/products as `{path: {hash-algo: digest}}` dicts, command, byproducts, environment) in `in_toto/models/link.py`; rule language MATCH <pattern> WITH (MATERIALS|PRODUCTS) FROM <step> plus CREATE/DELETE/MODIFY/ALLOW/DISALLOW/REQUIRE in `in_toto/rulelib.py`; Metablock/DSSE envelope with `application/vnd.in-toto+json` payload type in `in_toto/models/metadata.py`. Sub-layouts via `{name}.{keyid:.8}` delegation.
- **EXACT REPO + SHA:** in-toto/in-toto @ e352b43ad7cb8915d84c36d791aa61346152a0a3 (branch develop).
- **LICENSE:** Apache-2.0, root LICENSE verified (Copyright 2018 NYU); per-file SPDX headers present (e.g. layout.py header). Patent grant: Apache-2.0 standard. No copyleft. Attribution: standard Apache notice preservation only.
- **MECHANISM WORTH HARVESTING:** the MATCH rule semantics (artifact-digest chaining between steps) as the formal law for PING derivation links; and the materials-vs-products distinction (inputs recorded with digests alongside outputs) as the law for recording every acquisition/projection step.
- **WHY IT IS BETTER:** It is a written-down, machine-checkable rule for exactly what PING's derivation links are supposed to mean but which PING currently leaves implicit: "the digest that entered step N+1 equals the digest that left step N". PING's epistemic classes classify evidence quality; in-toto's rules chain evidence identity across steps. They are complementary, not competing.
- **WHAT NOT TO COPY:** Layout authorization model (functionary keys, thresholds), sublayout delegation, inspection hooks, the rulelib parser itself; none of it ports into PING without a proven multi-party consumer.
- **PING AUTHORITY IT MUST REMAIN UNDER:** Binding Verifier (S3). The MATCH semantics would live as a rule the verifier enforces, never a new authority.
- **MINIMAL PATCH:** comment-level law text in the derivation-link module (if one exists); enforcement of digest-equality on derivation links is gated on the audit gap (c) above.
- **EXPECTED DELETION-SIMPLIFICATION / LOC:** CURRENT PING LOC TOUCHED: UNKNOWN (derivation-link module not audited live this pass). DONOR LOC EXAMINED: layout.py 23,156 bytes, link.py 5,920 bytes, rulelib.py rule grammar (unpacked ~350 lines reviewed), metadata.py 14,590 bytes. EXPECTED ADDED / REMOVED / NET: UNKNOWN (no writer; fiction is not evidence). NEW DEPS: 0. NEW AUTHORITIES: 0.
- **TEST THAT PROVES IMPROVEMENT:** A derivation link whose claimed input digest does not equal the recorded input artifact digest must be rejected by the binding verifier (would FAIL today if no such check exists; cannot be proven until gap (c) is closed).
- **BENCHMARK IF RELEVANT:** n/a.
- **SECURITY CONSEQUENCES:** Digest-chaining turns silent input substitution into a checkable failure; no new attack surface (check is local).
- **MIGRATION-RISK:** none if adopted as law text; enforcement against historical evidence would need grandfathering (historical evidence immutable; checks apply to new links only).
- **DECISION:** BACKLOG. The MATCH-rule law is the strongest finding of this pass, but the writer gate fails on Q3/Q5 until gap (c) is closed: is there a derivation-link module, and is the missing check a real defect or a non-issue because links never cross a trust boundary?

### CANDIDATE 2: in-toto attestation Statement envelope

- **AREA:** 4. Arrow edge: OBSERVATION -> EVIDENCE.
- **CURRENT PING IMPLEMENTATION:** Citations carry (source, basis, lastChecked, claimClass); evidenceRefs bind `[n]` sentence markers to evidence ids; no digest-addressed reference shape documented (S2).
- **EXTERNAL IMPLEMENTATION:** Statement envelope v1 (`spec/v1/statement.md`): `_type: https://in-toto.io/Statement/v1`, `subject: [{name, uri, digest: {algo: hex}}]`, `predicateType: <TypeURI>`, `predicate: {...}`. ResourceDescriptor rule: "Subject artifacts are matched purely by digest, regardless of name." TypeURI discipline: predicate identity is a URI.
- **EXACT REPO + SHA:** in-toto/attestation @ fd2609c16bcb0ac53443e2b4612977f997e8f9a5 (branch main).
- **LICENSE:** Apache-2.0, root LICENSE verified (Copyright 2021 in-toto Developers). Spec text under the same license; copyright license to reproduce derivatives granted; patent grant standard Apache-2.0.
- **MECHANISM WORTH HARVESTING:** digest-addressed subject references (`digest: {algo: hex}` map) as the shape of an evidence reference; predicateType-as-URI as the typing discipline for claim classes.
- **WHY IT IS BETTER:** Matching-by-digest makes an evidence reference self-validating: a renamed or moved artifact still resolves. PING's current references are id-based; digest-addressing is a strictly stronger reference law.
- **WHAT NOT TO COPY:** The `_type` URI versioning scheme and DSSE coupling; importing the URI type system is a sovereignty decision, not a harvest.
- **PING AUTHORITY IT MUST REMAIN UNDER:** Binding Verifier (reference shape), HashAuthority (digest computation). Never a new authority.
- **MINIMAL PATCH:** extend citation/evidenceRef records with an optional `{algo: digest}` map alongside the existing id; no behavior change until a consumer needs digest resolution.
- **EXPECTED DELETION-SIMPLIFICATION / LOC:** CURRENT PING LOC TOUCHED: UNKNOWN (citation record not audited live). DONOR LOC EXAMINED: statement.md (~80 lines) + field_types.md reviewed. EXPECTED ADDED / REMOVED / NET: UNKNOWN (no writer). NEW DEPS: 0. NEW AUTHORITIES: 0.
- **TEST THAT PROVES IMPROVEMENT:** an evidence reference whose underlying artifact bytes changed must be detected as a digest mismatch (fails today if references are id-only and content is mutable).
- **BENCHMARK IF RELEVANT:** n/a.
- **SECURITY CONSEQUENCES:** digest-addressed refs make content tampering detectable at the reference layer; none negative.
- **MIGRATION-RISK:** additive field; old refs keep working; negligible.
- **DECISION:** BACKLOG. Gated on a proven defect: no evidence today that id-based references have failed (append-only journal makes the id stable). Digest-addressing earns itself if/when evidence artifacts leave the journal or a mutation incident occurs.

### CANDIDATE 3: SLSA provenance (build provenance v1)

- **AREA:** 4. Arrow edge: OBSERVATION -> EVIDENCE (reproducibility law).
- **CURRENT PING IMPLEMENTATION:** PING records provenance -> epistemic classes and citations with source/basis/lastChecked; no recorded reproducibility/completeness law for derived objects (S2).
- **EXTERNAL IMPLEMENTATION:** `spec/build-provenance.md` at pinned SHA: predicate `https://slsa.dev/provenance/v1` inside the in-toto Statement envelope; `buildDefinition` (buildType TypeURI, externalParameters, internalParameters, resolvedDependencies with digests) + `runDetails` (builder.id, buildMetadata, byproducts). Key laws: externalParameters MUST be complete at Build L3 (no other external influence channel); builder is distinct from signer; extension fields must be namespaced.
- **EXACT REPO + SHA:** slsa-framework/slsa @ 618f5b2192aad8417a8ee8ccb9e3f27d05c0e9b6 (branch main).
- **LICENSE:** Community Specification License 1.0 (root LICENSE.md verified; GitHub endpoint NOASSERTION). Copyright license granted to reproduce and prepare derivative works of the spec materials. **Attribution: NOT required for implementations** (section 1.2). **Patents: contributor grants + licensee grants + defensive termination; the patent grants extend only to licensees that indicate agreement** (via shipping the license text in source/distributions, or a Notices.md PR). Section 4: working-group source code falls under its own license (MIT if none stated). **Copying spec text requires attribution; implementing the mechanism does not.** No copyleft. Decision consequence: harvest LAW only; never paste spec text into the repo without attribution.
- **MECHANISM WORTH HARVESTING:** the externalParameters-completeness law ("the recorded inputs must be the ONLY external influence channel") as the reproducibility standard for PING projections; the builder-vs-signer distinction for any future delegated execution; namespaced extension fields.
- **WHY IT IS BETTER:** It is the only written-down standard for "this output is reproducible from these recorded inputs", which PING needs when regeneration (REGENERATION edge of the arrow) must be provably equivalent to generation.
- **WHAT NOT TO COPY:** Build levels (L1/L2/L3), buildType URIs, GitHub-actions-specific builders, the SLSA verifier machinery; the spec's domain is software builds, not knowledge projections.
- **PING AUTHORITY IT MUST REMAIN UNDER:** Projection Authority (if any owns regeneration reproducibility) and the Binding Verifier; never a new authority.
- **MINIMAL PATCH:** law text only; enforcement needs a "projection input manifest" that does not exist today.
- **EXPECTED DELETION-SIMPLIFICATION / LOC:** CURRENT PING LOC TOUCHED: UNKNOWN. DONOR LOC EXAMINED: build-provenance.md (~470 lines) + provenance.proto/provenance.cue summaries reviewed. EXPECTED ADDED / REMOVED / NET: UNKNOWN (no writer). NEW DEPS: 0. NEW AUTHORITIES: 0.
- **TEST THAT PROVES IMPROVEMENT:** a regeneration from a recorded input manifest must produce a byte-identical projection; fails today because no manifest exists to regenerate from.
- **BENCHMARK IF RELEVANT:** n/a.
- **SECURITY CONSEQUENCES:** input manifests expose dependency surface; keep them internal (no public projection, per vein-19 rules).
- **MIGRATION-RISK:** law-only; none.
- **DECISION:** BACKLOG. The completeness law is the right future standard for REGENERATION; no writer until a regeneration-consumer exists that must prove equivalence. SLSA is donor-only for PING's domain (knowledge, not binaries).

### CANDIDATE 4: Git object identity (content-addressed object graph)

- **AREA:** 4 (also 6 canonical encodings; recorded here, not duplicated). Arrow edge: OBSERVATION -> EVIDENCE.
- **CURRENT PING IMPLEMENTATION:** Content-derived IDs (`type_<hash16>`), `hashCanonical` versioned envelope, identity-era law (historical IDs immutable), Merkle tree in replay kernel (S1).
- **EXTERNAL IMPLEMENTATION:** `Documentation/gitformat-loose.adoc` at pinned SHA: loose object = `<type> SP <size> NUL` + zlib(payload); object ID = hash of the UNCOMPRESSED bytes INCLUDING the type/size header; files sharded by first two hex chars; trees are sorted entry lists (`mode SP name NUL + raw sha`), commits chain via parent lines; object-format transition precedent: sha1 -> sha256 via a versioned object format (compatObjectFormat), not a flag day.
- **EXACT REPO + SHA:** git/git @ 0f8e75abebff0877cae681a3d5ff31ac47f54220 (branch master).
- **LICENSE:** GPLv2 ONLY (root COPYING verified: "the only valid version of the GPL as far as this project is concerned is this particular version (ie v2)"). PATTERNS ONLY. Never a copy candidate. No patent grant. Copyleft is total for code; the harvested item is the mechanism description, which is not a code copy.
- **MECHANISM WORTH HARVESTING:** type-disambiguated hashing (the type header is INSIDE the hashed bytes, so a blob can never collide with a tree/commit of the same content); the object-format-version transition precedent (algorithm identity versioned per-format, matching PING's CONSTITUTIONAL_VERSION envelope positioning).
- **WHY IT IS BETTER:** Type-inside-hash is a strict hardening over hashing bare content bytes: it rules out cross-type second-preimage confusion by construction. PING's `hashCanonical` envelope partially achieves this (versioned envelope), but the raw-envelope path (`PingCanonicalEnvelope`: raw sha256 of canonicalBytes, no version envelope, S1) does not.
- **WHAT NOT TO COPY:** anything (GPLv2); also the packfile format, delta compression, ref machinery - all out of scope.
- **PING AUTHORITY IT MUST REMAIN UNDER:** HashAuthority / CanonicalAuthority-adjacent; the identity-era law freezes historical IDs, so any change applies to new evidence only.
- **MINIMAL PATCH:** none authorized; pattern note for the envelope spec (if the raw-envelope path ever hashes ambiguous byte classes).
- **EXPECTED DELETION-SIMPLIFICATION / LOC:** CURRENT PING LOC TOUCHED: 0. DONOR LOC EXAMINED: gitformat-loose.adoc (~60 lines) + format-transition knowledge. EXPECTED ADDED / REMOVED / NET: 0. NEW DEPS: 0. NEW AUTHORITIES: 0.
- **TEST THAT PROVES IMPROVEMENT:** no defect exists to prove against; cross-type collision is a non-issue in an append-only typed journal today.
- **BENCHMARK IF RELEVANT:** n/a.
- **SECURITY CONSEQUENCES:** none (pattern only).
- **MIGRATION-RISK:** n/a (no change).
- **DECISION:** PATTERN/REFERENCE ONLY (GPLv2). PING independently re-derived the Git shape (content addressing + no history rewrite + versioned format for algorithm transitions). The type-disambiguated-hashing law is recorded for the envelope spec; no writer, no defect, changing hash inputs would violate the identity-era law.

### CANDIDATE 5: IPLD CID specs (content addressing)

- **AREA:** 4 (also 6; recorded here, not duplicated). Arrow edge: OBSERVATION -> EVIDENCE.
- **CURRENT PING IMPLEMENTATION:** Bare hex digests; algorithm lives in code; `HashAuthority.hashCanonical` wraps `{canonical_version, serialization_version, algorithm, payload}` at envelope level (S1).
- **EXTERNAL IMPLEMENTATION:** CIDv1 = `<multicodec-cidv1><multicodec-content-type><multihash>` (multiformats/cid README at pinned SHA); multihash = `<hash-code><length><digest>` self-describing; multibase prefix makes string form self-describing; explicit rule that CIDv18 (0x12) must never exist to avoid ambiguity with decoded CIDv0 (ambiguity is designed OUT).
- **EXACT REPO + SHAs:** ipld/ipld @ 56876b48082e3eb68fada7264702cf7a66c93e93 (specs site, dual Apache-2.0/MIT root LICENSE verified); multiformats/cid @ 9eca1c5ba064823a5ddbe13e9925f9b6c9d19c84 (spec, CC-BY-3.0 root LICENSE verified); multiformats/multihash @ b43ec1026a610fa87878e53b3daecf3a14b3ef6f (MIT, license endpoint + root LICENSE verified).
- **LICENSE:** ipld/ipld: Dual Apache-2.0/MIT. multiformats/cid spec: CC-BY-3.0 (attribution required for spec text; mechanism is a public standard). multihash code: MIT (patent grant via Apache not present, but MIT code, no copyleft).
- **MECHANISM WORTH HARVESTING:** multihash self-description (the algorithm travels with the digest) for any digest that leaves PING's systems; the no-ambiguity-by-construction rule (CIDv18 ban) as a design law.
- **WHY IT IS BETTER:** PING's envelope is arguably richer than multihash INSIDE PING's systems (version + serialization + algorithm at envelope level), but a bare hex digest outside those systems is algorithm-ambiguous. multihash solves exactly the export case.
- **WHAT NOT TO COPY:** the multicodec registry, the base-encoding table, any codec dependency; a registry is an authority PING must not adopt.
- **PING AUTHORITY IT MUST REMAIN UNDER:** HashAuthority (digest identity); any export-shape decision belongs to the vein-19 portability work, not a new authority.
- **MINIMAL PATCH:** none; law text for export design.
- **EXPECTED DELETION-SIMPLIFICATION / LOC:** CURRENT PING LOC TOUCHED: 0. DONOR LOC EXAMINED: CID spec README sections (~150 lines), multihash table (registry, browsed). EXPECTED ADDED / REMOVED / NET: 0. NEW DEPS: 0. NEW AUTHORITIES: 0.
- **TEST THAT PROVES IMPROVEMENT:** no defect; no digests are known to leave PING's systems today (gap b).
- **BENCHMARK IF RELEVANT:** n/a.
- **SECURITY CONSEQUENCES:** self-describing digests prevent algorithm-confusion attacks at system boundaries (downgrade by reinterpreting a digest under a weaker algorithm).
- **MIGRATION-RISK:** n/a.
- **DECISION:** BACKLOG. Verdict from S1 holds (PARITY with different shape inside PING; multihash earns itself only at the export boundary). Do not adopt the multicodec registry.

### CANDIDATE 6: Certificate Transparency Merkle log

- **AREA:** 4. Arrow edge: OBSERVATION -> EVIDENCE (append-only verifiability).
- **CURRENT PING IMPLEMENTATION:** `merkle_tree.ts` (291 LOC, replay kernel, hashes via CertificateAuthority.sha256); append-only evidence journal as constitutional law (S1, S3).
- **EXTERNAL IMPLEMENTATION:** `cpp/merkletree/tree_hasher.cc` at pinned SHA: domain-separated hashing, `HashLeaf = sha256(0x00 || data)`, `HashChildren = sha256(0x01 || left || right)` (same in `python/ct/crypto/merkle.py`); Signed Tree Head (STH) commits to the root at a log size; consistency proofs prove append-only extension; audit proofs prove inclusion. RFC 6962 design.
- **EXACT REPO + SHA:** google/certificate-transparency @ 0fe5116f42890853e9fcf5120f1f5129d64f64ea (branch master). License endpoint returned Apache-2.0 (root LICENSE); per-file headers not re-verified this pass.
- **LICENSE:** Apache-2.0. Patent grant standard. No copyleft.
- **MECHANISM WORTH HARVESTING:** domain-separated leaf/node hashing (0x00/0x01) as the hardening law for PING's merkle tree; consistency-proof semantics as the audit law for the append-only journal ("no rewrite" is currently law but not checkable by a third party).
- **WHY IT IS BETTER:** Without domain separation, a leaf preimage can be reinterpreted as an internal node (second-preimage class across tree levels). CT's two-byte prefix kills the class. Whether PING's tree has this weakness is audit gap (a) - the single most important open question of this pass.
- **WHAT NOT TO COPY:** the public log model, STH gossip, monitors/auditors, the whole PKI application; PING's journal is not a public transparency log and must not become one.
- **PING AUTHORITY IT MUST REMAIN UNDER:** the replay kernel's existing Merkle mechanism owner; never a new authority.
- **MINIMAL PATCH:** if gap (a) shows no domain separation: add the 0x00/0x01 prefix to the two hash sites in `merkle_tree.ts`. Note: this changes root hashes, so it must apply to new trees only (identity-era law) or the kernel accepts the break explicitly.
- **EXPECTED DELETION-SIMPLIFICATION / LOC:** CURRENT PING LOC TOUCHED: UNKNOWN (merkle_tree.ts not read live this pass). DONOR LOC EXAMINED: tree_hasher.cc + merkle.py reviewed (~80 + ~120 lines). EXPECTED ADDED / REMOVED / NET: UNKNOWN (no writer; depends on gap a). NEW DEPS: 0. NEW AUTHORITIES: 0.
- **TEST THAT PROVES IMPROVEMENT:** a leaf preimage fed as an internal node must hash differently than as a leaf; fails today if no domain separation exists.
- **BENCHMARK IF RELEVANT:** none (2 extra bytes per hash).
- **SECURITY CONSEQUENCES:** closes the leaf/node second-preimage class if present; no new surface.
- **MIGRATION-RISK:** root-hash change for existing trees; must be new-trees-only or explicitly versioned.
- **DECISION:** BACKLOG, with the highest follow-up priority of this pass: close audit gap (a) on the Pig. If the tree already domain-separates, the decision becomes REJECT (PING WINS - keep). Do not adopt any log/auditor machinery.

### CANDIDATE 7: W3C PROV data model (N/A(SPEC), law-harvest only)

- **AREA:** 4. Arrow edge: OBSERVATION -> EVIDENCE.
- **CURRENT PING IMPLEMENTATION:** Binding Verifier model (DIRECT / DERIVED / GENERATED / OWNER-AUTHORED) + epistemic classes; no published provenance vocabulary for export (S2, S3).
- **EXTERNAL IMPLEMENTATION:** PROV-DM (W3C Recommendation, http://www.w3.org/TR/prov-dm/): Entity, Activity, Agent; relations used(activity, entity), wasGeneratedBy(entity, activity), wasDerivedFrom, wasAttributedTo(entity, agent), wasAssociatedWith(activity, agent), actedOnBehalfOf(agent, agent).
- **LICENSE:** W3C Document License; no code involved; vocabulary adoption is standards-conformant use, not a copy.
- **MECHANISM WORTH HARVESTING:** the vocabulary (wasDerivedFrom, wasAttributedTo, actedOnBehalfOf) as the shape of any future PING evidence export (vein 19); actedOnBehalfOf is the delegation-chain concept PING has no named analog for (owner correction on behalf of a tenant, agent acting for owner).
- **WHY IT IS BETTER:** Standard vocabulary makes PING's provenance legible to the outside world; operationally PING's binding verifier is already stronger (enforcement, not just description).
- **WHAT NOT TO COPY:** the full PROV-O ontology, PROV-JSON serialization; nothing ports into canonical truth.
- **DECISION:** BACKLOG (vocabulary reference for evidence export shapes). PING WINS on enforcement; PROV wins on standardness. No candidate row (N/A(SPEC) convention).

## 4. Writer-gate summary

No candidate passes the 12-question gate this pass: no proven live defect (Q1), no pinned defect tied to a live consumer (Q2/Q9), and two audit gaps ((a) merkle domain separation, (c) derivation-link digest checks) that must be closed on the Pig before any Q3/Q5 can be answered. **No writer, no patches, no commits.** This is the correct outcome: the ruthless metric counts the two genuine audit gaps as the product of this pass, not code.

## 5. Scorecard (this pass)

- Unique candidates: 8 (in-toto, in-toto-attestation, SLSA, Git, ipld/ipld, multiformats/cid, multiformats/multihash, certificate-transparency) + 1 spec (W3C PROV, N/A(SPEC)).
- Decisions: 5 BACKLOG (in-toto, attestation, SLSA, IPLD/CID, CT), 2 PATTERN/REFERENCE ONLY (Git GPLv2, CID-spec CC-BY-3.0 text), 1 law-harvest spec (PROV). 0 HARVEST/ADAPT/REUSE this pass.
- New rows added to candidates.json: 8.
- Net LOC: 0. New deps: 0. New authorities: 0.
- Audit gaps for falsifier follow-up: (a) merkle_tree.ts domain separation; (b) algorithm recorded with evidence digests; (c) derivation-link digest-equality checks; (d) live HEAD re-verification.
- License corrections banked: SLSA = Community Specification License 1.0 (implementations need no attribution; patent grants need licensee agreement); multiformats/cid spec = CC-BY-3.0 (not code); git = GPLv2 only (not v2+); ipld/ipld = dual Apache-2.0/MIT.
