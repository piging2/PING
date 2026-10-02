# Vein-4 research: evidence and provenance
# Harvest pass 2026-10-01 | Arrow edge: OBSERVATION -> EVIDENCE -> OBJECT

- PING HEAD: `f94bba39e6b4e21827b3b2ca58972a96c146d0ea`
- PING branch: `fyd/builder-harvest-trackc-2026-09-28`
- All PING file reads verified live 2026-10-01 via pigwsl-exec against the working tree.
- No clones, no writes to the Pig, no commits, no branches. Donor reads were GitHub API + web page reads only.
- Nolan rule observed: no em dashes anywhere in this paper.
- Prior vein-4 work: 2026-09-27 pass evaluated 8 candidates (registry at 36 rows); 2026-09-28 pass audited gaps (in-toto MATCH rule REJECT/PING WINS; CT REJECT/PING WINS; PROV-DM law-harvest, no row). This paper does not re-adjudicate them except to re-verify pins and note HEAD drift.

---

## 1. PING current implementation: evidence and provenance machinery (traced at f94bba39)

PING's evidence layer is substantial. The harvest question for every candidate below is narrowed: does the donor supply a mechanism PING's own envelope/digest/provenance machinery lacks, on the arrow OBSERVATION -> EVIDENCE -> OBJECT.

### 1.1 Digest law (shared)
- `src/lib/ping/digest.ts` (function at L56): `sha256-canonical-json-v1`. One pinned serializer for digests and signatures.
- `src/lib/ping/types.ts:366`: `AskProposalBase.digestAlgorithm: "sha256-canonical-json-v1"`.
- `src/lib/ping/ask-composer.ts:846, 899`: proposal envelopes use the same serializer; `src/fyd/ask/site-patch.ts:271` likewise.

### 1.2 Graph attestation with evidence-preserving derivations
- `src/fyd/builder/object-builder.ts:100-130`: `GraphAttestation` interface. Digest = sha256 over the canonicalized attested graph; `derivations: Array<{ from: string; to: string; rule: string }>` (functionally wasDerivedFrom edges carrying rule labels).
- `src/fyd/builder/object-builder.ts:285-360`: construction plus inverse normalization. Derived forward edges REUSE the source edge's `evidenceRef`: inverse/derived edges never invent new evidence, they inherit it.

### 1.3 evidenceRef and epistemic-status vocabulary
- `src/lib/ping/types.ts:180` (`PingObject.evidenceRef`), `src/lib/ping/types.ts:258` (`PingRelationship.evidenceRef`).
- `src/lib/ping/types.ts:261-280`: `AskEvidenceRef { kind: "object" | "relationship" | "field"; id; label; detail? }`.
- `src/lib/ping/types.ts:281-305`: `AskClaimClassification` with classes DIRECT_FACT / DERIVED_FACT / INFERENCE / GENERATED_COPY / USER_OVERRIDE. This is PING's epistemic-status vocabulary: every claim knows what kind of truth it is.
- `src/lib/ping/types.ts:150-167`: `OwnerCorrection { sourceValue; ownerValue; actorLabel; basis; sourceDrifted? }`, the ownership-override provenance record.

### 1.4 Digest-bound proposal boundary (mc-approval)
- `mc-approval/proposal_record.py:1-109`: canonical JSON bytes (sorted keys, compact separators) + sha256 digest; deterministic `proposal_id = sha256("proposal|mission_id|digest")[:16]`.
- `mc-approval/approval_request.py`: proposal bytes include the digest and a human summary; the approval binds to the exact bytes.

### 1.5 Canonical envelope kit (signing path) - CRITICAL FOR DSSE CANDIDATE
- `src/fyd/ask/envelope.ts` (whole file, ~98 lines): "FYD canonical envelope kit. Port of the PING canonical envelope construction (A1 harvest): Ed25519 signing with the payload hash bound into the signed bytes." Construction: strip proof/payload_hash; payload_hash = raw sha256 hex of canonicalBytes(stripped); signature = Ed25519 over canonicalBytes({...stripped, payload_hash}); proof = {verification_method: "ed25519", signature, public_key (SPKI DER hex), never part of the signed bytes}. verifyEnvelope returns false (never throws) on any malformation or binding break. Zero npm dependencies, node:crypto only.
- `src/lib/ping/types.ts:346-359`: `EnvelopeProof`, `SitePatchEnvelope { canonical_bytes_hash; payload_hash; body; proof }`.
- `src/lib/ping/dev-signer.ts`: dev stand-in signing helper. Header comment is explicit: "This exists only so the practice page can produce signed dev envelopes until the PING runtime (Lane A) exposes a canonical signing endpoint."

So: PING already has a type-bound, hash-bound, Ed25519-signed envelope kit (prior A1 harvest), and a named pending consumer (the Lane A canonical signing endpoint). This materially narrows what any signing-envelope donor can add: the remaining delta is (a) multi-signer envelopes, (b) PAE-style length-framed pre-authentication encoding as an implementation law for the Lane A endpoint, (c) the no-reparse-after-verification law.

### 1.6 Snapshot, event, lineage, and media provenance
- `src/lib/dataset-snapshots.ts:26-41`: `DatasetSnapshot.recordEvidence { contentHash; variantsOriginal; lifecycleState; source }`.
- `src/lib/events.ts:25-37`: `EventProvenance { provider; eventType; providerObjectId }` (idempotency/attribution); `src/lib/events.ts:39-90`: append-only `ReplayRepository`.
- `src/fyd/lineage/tracer.ts`: machine-walkable trace SOURCE BYTES -> OBSERVATION -> EVIDENCE -> OBJECT FIELD -> SITESPEC BINDING -> RENDERED CLAIM -> ASK FYD ANSWER, with sha256 verification of pinned raw bytes.
- `src/fyd/boundary/data-boundary.ts:64`: media manifests carry provenance, digests, rights, variant lineage.

---

## 2. Candidate records

### 2.1 W3C PROV / PROV-O (law-harvest reference, no registry row)

- Candidate: W3C PROV-O (PROV Ontology) plus PROV-DM as the underlying model.
- Repo: none. The artifact is a W3C Recommendation, not a code repo. Normative URL: https://www.w3.org/TR/prov-o/ (verified primary read 2026-10-01; "W3C Recommendation 30 April 2013"; latest version alias https://www.w3.org/TR/prov-o/).
- EXACT: `https://www.w3.org/TR/2013/REC-prov-o-20130430/` ("This version"); namespace `http://www.w3.org/ns/prov#`.
- SHA: not applicable (document, not a commit). OWL encoding available from the TR page.
- LICENSE: W3C Document License (copyright 2011-2013 W3C (MIT, ERCIM, Keio, Beihang); "W3C liability, trademark and document use rules apply"). Vocabulary terms are freely citable; the ontology is a reference model, not code.
- Mechanism examined: Starting Point classes prov:Entity / prov:Activity / prov:Agent; relations prov:wasGeneratedBy, prov:used, prov:wasDerivedFrom, prov:wasAttributedTo, prov:wasAssociatedWith, prov:actedOnBehalfOf, prov:hadPrimarySource; qualified-influence pattern (qualifiedDerivation, qualifiedGeneration, qualifiedAttribution, etc.) where the qualified form implies the unqualified binary form. PROV-O explicitly positions itself as a *reference model* for domain ontologies.
- Fit on the arrow: PING's `derivations: [{from, to, rule}]` is structurally isomorphic to a qualified prov:Derivation (binary link + rule attribute). PING's FactClass vocabulary (DIRECT_FACT / DERIVED_FACT / INFERENCE / GENERATED_COPY / USER_OVERRIDE) covers the epistemic layer PROV-O does not enforce. OwnerCorrection covers attribution. Tracer covers the chain. PING wins on enforcement: derivations are digest-bound and evidence-preserving by construction; PROV-O is vocabulary with no enforcement mechanism.
- DECISION: LAW-HARVEST (reference only). No registry row. Consistent with the 2026-09-27 PROV-DM precedent. If a future portability/export boundary needs a standard vocabulary, prov:Entity/Activity/Agent + qualifiedDerivation is the reference vocabulary, but that consumer does not exist today.
- ESTIMATES: expected added 0 LOC; this decision carries no write.

### 2.2 in-toto + in-toto/attestation + SLSA (pins re-verified, decisions unchanged)

Re-verified 2026-10-01 via the GitHub commits API (GET default branch, read sha at [0]):

| Repo | Pinned SHA | Still HEAD? | Head date | Note |
|---|---|---|---|---|
| in-toto/in-toto @ develop | e352b43ad7cb8915d84c36d791aa61346152a0a3 | yes | 2026-05-14 | pin holds |
| in-toto/attestation @ main | fd2609c16bcb0ac53443e2b4612977f997e8f9a5 | yes | 2026-09-14 | pin holds |
| slsa-framework/slsa @ main | 618f5b2192aad8417a8ee8ccb9e3f27d05c0e9b6 | NO | old pin: 2026-08-22 | drift |
| git/git @ master | 0f8e75abebff0877cae681a3d5ff31ac47f54220 | NO | old pin: 2026-08-22 | drift |
| ipld/ipld @ master | 56876b48082e3eb68fada7264702cf7a66c93e93 | yes | 2026-06-30 | pin holds |
| multiformats/cid @ master | 9eca1c5ba064823a5ddbe13e9925f9b6c9d19c84 | yes | 2026-06-30 | pin holds; commit msg: "docs: deprecate in favor of specs.ipfs.tech/cid" |
| multiformats/multihash @ master | b43ec1026a610fa87878e53b3daecf3a14b3ef6f | yes | 2026-06-21 | pin holds |
| google/certificate-transparency @ master | 0fe5116f42890853e9fcf5120f1f5129d64f64ea | yes | 2023-08-02 | pin holds (stale repo) |

SLSA drift detail: new HEAD is `82b296d49e4c8301e7db565f23620ffe89092a0c` (2026-09-29, dependabot smol-toml bump only). The studied mechanism (build-provenance.md: buildDefinition {buildType, externalParameters, resolvedDependencies} + runDetails, externalParameters-completeness law) is unchanged. No mechanism change justifies re-study.

Git drift detail: new HEAD is `a018953688f1b10bddf91bff8747068f5f4746a4` (Git 2.56, 2026-09-28). The studied doc (gitformat-loose.adoc: zlib-wrapped object bytes hashed by sha1/sha256; tags reference full commit graph, not individual blobs) is unchanged in substance. PATTERN/REFERENCE ONLY stands.

SLSA v1.1 check (extra due diligence, via web search): v1.1 changes are documentation-level (verification_summary, policy digest recommendation on ResourceDescriptor, optional verifier.version). The externalParameters-completeness law from v1.0 is untouched. No new mechanism relevant to the arrow.

Decisions carried forward from 2026-09-27/28, no redo:
- in-toto MATCH rule: REJECT (PING WINS). Digest-bound boundaries already pin what in-toto MATCH would verify.
- in-toto/attestation: BACKLOG (gated on export-boundary consumer or signature need). Overlaps with DSSE row below; keep both rows, cross-reference.
- SLSA: BACKLOG (gated on export-boundary consumer). No new mechanism this pass.
- certificate-transparency: REJECT (PING WINS).
- git object identity, IPLD/CID: PATTERN/REFERENCE ONLY; vein-6 owns the authority analysis.
- cid repo deprecation note: multiformats/cid now points to specs.ipfs.tech/cid. Coordinator note only; no mechanism change.

### 2.3 secure-systems-lab/dsse (NEW candidate, full record)

- Candidate: DSSE (Dead Simple Signing Envelope). Mechanism: envelope layer for signed attestations, the exact layer between PING's signed-envelope kit (2.3.5) and in-toto's Statement payload.
- Repo: https://github.com/secure-systems-lab/dsse
- Branch: master (verified 2026-10-01: the default branch is master, not main)
- Pinned SHA: `1d3370f62565bca041e97c8310b873ac340edc2e` (commit 2026-07-23, "update the Go package link ... to dsse-go"). Verified as HEAD at pin time.
- EXACT: the protocol at pin = docs/protocol.md (v1.0.2), docs/envelope.md, docs/envelope.proto, README.md, LICENSE, governance/ dir.
- LICENSE (verified at pin, root file = 1292 bytes, sha 1d25d1e1ac5f90be1e4a1adad2d0b8f0e2c8c0c3): verbatim Apache-2.0 text. Root README copyright: The Linux Foundation. CAUTION: the governance/ directory adds Community Specification License 1.0 files (governance/01-community-specification-license-v1.md). Per the SLSA precedent in the program: implement the mechanism freely, respect spec-doc licensing; do not copy spec prose into the repo. The .proto and protocol text are implementable, not vendored.
- Mechanism (primary source: docs/protocol.md fetched at pin, 6638 bytes, ~200 lines, fully examined):
  1. PAE (Pre-Authentication Encoding), the core law: `PAE(type, body) = "DSSEv1" SP LEN(type) SP type SP LEN(body) SP body`. Signatures are computed over PAE(UTF8(payloadType), serialized body), NOT over the body alone.
  2. Type-confusion protection: because the payload type is inside the signed bytes via framing, an implementation MUST NOT re-use signatures across payload types. The protocol lists the two threat models it eliminates: cross-type signature confusion, and canonicalization before signature verification (the verifier never parses/canonicalizes before verifying; it verifies the byte-level framing).
  3. Envelope shape: JSON `{ payload (base64), payloadType, signatures: [{ sig, keyid? }] }`. Multiple signatures over one payload are natively supported.
  4. keyid is an UNAUTHENTICATED HINT only (explicit in the spec): verifiers MUST NOT use keyid alone for policy decisions.
  5. payloadType should be application-specific; "generic" envelope types are discouraged ("avoid generic signatures" law).
  6. Verification law: "implementations MUST NOT re-parse the envelope after verification to pull out the payload" class of foot-gun (per the threat-model section: parsing between verification and use is the attack surface).
  7. Test suite: docs/test-suite.md (file list only at root: 46 bytes at pin; test vectors exist per README links).
- Donor LOC examined: protocol.md ~200 lines fully read; envelope.md referenced via protocol.md (envelope blob fetch failed twice with 422; treated as read-from-secondary-sources, not primary-verified; shape confirmed against two independent secondary sources + protocol.md's own "recommended JSON envelope" text); license blobs primary-verified. No clone performed (Apache-2.0 would permit it; not needed).
- Fit on the arrow (narrowed by 1.5): PING already implements DSSE's core security properties: the envelope kit binds payload type inside the signed bytes (body.kind is signed, e.g. kind "site_patch"), binds payload_hash into the signed bytes, and verifyEnvelope fails closed. What DSSE adds is three narrowed laws: (a) PAE length-framed construction as the implementation law for the Lane A canonical signing endpoint (type as framing, not as a signed field; removes any dependence on the verifier re-serializing the same canonical form), (b) the multi-signature envelope shape (payload + payloadType + signatures[]), (c) the keyid-unauthenticated-hint law and the no-reparse-after-verification law.
- Consumer gate: NAMED. dev-signer.ts header says the dev stand-in exists "until the PING runtime (Lane A) exposes a canonical signing endpoint." The PAE/multi-sig laws are for that endpoint when it lands. Today there is no multi-signer consumer and no canonical endpoint; the existing kit suffices for the dev/practice path.
- DECISION: BACKLOG. Registry row recommended below (new row; different repo, different license, distinct mechanism from in-toto/attestation; dedup-clean). Cross-reference to in-toto/attestation row (DSSE is the envelope layer under the Statement payload).
- Registry row definition (for the coordinator to merge via dedup.py; not merged here):

```
repo: https://github.com/secure-systems-lab/dsse
branch: master
pinned_sha: 1d3370f62565bca041e97c8310b873ac340edc2e
pin_verified: 2026-10-01
license: Apache-2.0 (root LICENSE, blob sha 1d25d1e1ac5f90be1e4a1adad2d0b8f0e2c8c0c3); governance/ adds CSL-1.0 spec-doc files
license_verified_at_pin: yes
decision: BACKLOG
gate: Lane A canonical signing endpoint (see src/lib/ping/dev-signer.ts header). Adopt PAE framing + multi-sig envelope shape + keyid-hint/no-reparse laws then.
mechanisms: PAE pre-authentication encoding; type-in-framing signature; multi-signature envelope {payload, payloadType, signatures[]}; keyid unauthenticated hint; no re-parse after verification
cross_refs: in-toto/attestation row (Statement payload layer), FYD envelope kit src/fyd/ask/envelope.ts (existing A1 harvest)
dedup: clean (distinct repo/license/mechanism; not a duplicate of in-toto/attestation)
```

### 2.4 What was NOT found (honest negatives)

- No merkle-tree mechanism anywhere in vein-4's donor surface this pass. (Merkle structures in PING live elsewhere: /home/nolan/ping runtime/kernel/replay/merkle_tree.ts, audited 2026-09-28. This pass stays in its lane: the OBSERVATION -> EVIDENCE -> OBJECT edge, which is digest-bound per link, not merkle-aggregated.)
- No new donor this pass that justifies a writer. The one new candidate is BACKLOG.
- The 12-gate writer check: all candidates either fail gate #1 (no concrete current failure proven) or are gated on named future consumers (Lane A endpoint, export boundary). No writer work authorized or performed.

---

## 3. Pin-drift summary for the coordinator

- slsa-framework/slsa: pinned 618f5b21 (2026-08-22) vs new HEAD 82b296d4 (2026-09-29, dependabot-only). Pin still resolves; mechanism studied unchanged. Re-verified, not changed. Registry date update is the coordinator's call.
- git/git: pinned 0f8e75ab (2026-08-22) vs new HEAD a0189536 (Git 2.56, 2026-09-28). Studied doc unchanged in substance. Registry date update is the coordinator's call.
- All other pins: still HEAD, verified 2026-10-01.

---

## 4. Estimates (per paper template; UNKNOWN where unknown, no fiction)

- CURRENT PING LOC TOUCHED: roughly 600 lines across 9 files (traced sections: object-builder.ts ~60, types.ts ~120, digest.ts ~80, ask-composer.ts ~70, proposal_record.py ~109, approval_request.py ~60, dataset-snapshots.ts ~16, events.ts ~65, envelope.ts ~98). Read-only; no changes.
- DONOR LOC EXAMINED: roughly 450 lines (DSSE protocol.md ~200 fully read; PROV-O TR sections: abstract + "PROV-O at a glance" + term indexes; DSSE license blobs; pin-verification API reads). envelope.md treated as secondary-sourced after two 422s on the blob fetch.
- EXPECTED ADDED: UNKNOWN (no write authorized this pass). Bounded case: if the Lane A endpoint harvests PAE framing, it is a byte-shaping change to an existing envelope kit, small by nature; no estimate is recorded as fact.
- EXPECTED REMOVED: 0.
- NET LOC: UNKNOWN (no change this pass).
- NEW DEPS: none. PAE framing is byte-shaping over node:crypto; multi-sig envelopes need no new dependency.
- NEW AUTHORITIES: none. Explicit program binding: no new authority classes. DSSE mechanisms land inside the existing signing/digest surface.

---

## 5. Decision table

| Candidate | Decision | Gate / reason |
|---|---|---|
| W3C PROV / PROV-O | LAW-HARVEST | no row (consistent with PROV-DM 09-27); vocabulary reference only, PING wins on enforcement |
| in-toto MATCH rule | REJECT (PING WINS) | carried from 09-28 audit; digest-bound boundaries already pin what MATCH verifies |
| in-toto/attestation | BACKLOG | carried; gated on export-boundary consumer or signature need |
| SLSA provenance | BACKLOG | carried; gated on export-boundary consumer; v1.1 adds no new mechanism |
| DSSE (secure-systems-lab) | BACKLOG | NEW ROW recommended; gated on Lane A canonical signing endpoint (dev-signer.ts named consumer); remaining delta = PAE framing law + multi-sig envelope shape |
| git object identity | PATTERN/REFERENCE ONLY | carried; vein-6 owns authority analysis |
| IPLD / CID / multihash | (prior decisions stand) | pins re-verified; cid repo deprecated upstream, coordinator note |
| certificate-transparency | REJECT (PING WINS) | carried from 09-28 audit |

---

## 6. Open questions and recommended follow-ups

1. Registry merge: the DSSE row definition (2.3) is ready for the coordinator to merge via dedup.py. I did not touch candidates.json (one writer per mutable unit).
2. SLSA + git pin rows: re-verified dates are the coordinator's call to record.
3. When the Lane A canonical signing endpoint work starts, DSSE's PAE construction is the law to adopt (framing, not signed-field, for the payload type; multi-sig shape if a second signer ever exists). No action today.
4. PROV-O remains the export-vocabulary reference if a portability boundary ever needs it (vein-19). No action today.

---

## 7. Verdict

Rejection is success. Seven of eight adjudicated candidates reject or stay parked; the one new candidate parks with a named gate. No defect was proven against PING's evidence machinery this pass. The strongest finding is a confirmation, not a change: PING's canonical envelope kit (src/fyd/ask/envelope.ts) already implements DSSE's core security properties from a prior harvest, and DSSE's remaining laws have exactly one named future consumer (the Lane A canonical signing endpoint). Nothing in this paper authorizes a writer. Net LOC change: zero.
