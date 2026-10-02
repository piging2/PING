# VEIN 6: Canonical Encodings, deepening pass

- Date: 2026-09-28
- Researcher: harvest pass subagent (research only, no writes to any repo)
- Binding law: `~/workspace/sprint-2026-09-24/FYD-PING-HARVEST-PROGRAM-2026-09-25.md`
  (WRITER GATE CORRECTION honored: harvest laws, not whole-mechanism ports;
  never replace a proven authority for fashion)
- Dedup contract: `~/workspace/harvest/DEDUPLICATION-CONTRACT.md`
  (one candidate = one `owner/repo`; mechanisms fold into rows; no label-rows)

Status: RESEARCH ONLY. Nothing was written to any repo. `candidates.json`
was read, not edited. Merge-ready JSON records are supplied in section 6
for the parent to apply.

## 1. PING-side: canonical authority map (re-verified live on the Pig today)

LINEAGE CAVEAT (from the vein-4 audit, `vein4-audit-gaps.md`, same pass):
this section was read in the `/home/nolan/ping` repo lineage (branch
`lane-b/tenant-dispatch-threading`, HEAD `1822d5fae`). The ground-truth
checkout is `/home/nolan/projects/ping`, branch
`fyd/sprint-integration-2026-09-24`, HEAD `4a8c5f2e`
(full `4a8c5f2e92eef2a3cb6a11582c37f01c38dfacd9`), which has a different
layout (`src/lib/ping/...`) and contains ZERO merkle code (proven by
find/grep at HEAD). Where a finding depends on lineage, it is marked.
Cross-lineage facts verified by the vein-4 audit are folded into
sections 3(b) and 3(c) below.

Repo: `/home/nolan/ping` on the Pig (branch `lane-b/tenant-dispatch-threading`,
HEAD `1822d5fae`). `git log --since=2026-09-25` on every canonical file below:
ZERO commits. Yesterday's source-state claims are NOT stale; everything below
was re-read live 2026-09-28 (in this lineage).

Canonical modules (worktree copies excluded):

| File | LOC | Role |
|---|---|---|
| `runtime/constitutional/src/hash-authority.ts` | 155 | TS constitutional subsystem: "SINGLE canonical serializer authority" (L20), SHA-256 only (L39) |
| `runtime/kernel/replay/canonical_json.ts` | 188 | Replay kernel: pure-TS RFC-8785 JCS implementation (L2-4), "sole canonicalization authority" (L13) |
| `runtime/kernel/replay/canonical_hash_authority.ts` | 80 | Replay kernel: canonical bytes -> fingerprint; delegates to CanonicalJson + CertificateAuthority (L21-22) |
| `runtime/kernel/replay/certificate_authority.ts` | 280 | "sole SHA-256 authority" claim (L114); pure-TS FIPS 180-4 implementation |
| `runtime/kernel/replay/merkle_tree.ts` | 291 | Merkle hashing WITH domain separation (L23-24, L255-281). LINEAGE-ONLY: absent from the ground-truth checkout `/home/nolan/projects/ping` @ `4a8c5f2e` (zero hits); see lineage caveat above |
| `runtime/kernel/replay/canonical_event_envelope.ts` | 123 | Event envelope: validated type/version fields, canonical bytes |
| `runtime/constitutional/src/ping-canonical-envelope.ts` | 268 | PingCanonicalEnvelope (constitutional subsystem) |
| `runtime/constitutional/src/identity-authority.ts` | 143 | Identity authority (live HashAuthority caller) |
| `runtime/authorities/canonical_hash_authority.py` | 31 | Python plane: SHA-256 authority (`hash_json` L22-26) |

### Hot path 1: constitutional subsystem (SEMANTIC STATE -> BYTES -> HASH)

`HashAuthority.hashCanonical(obj)` (`hash-authority.ts:59-72`):

1. `canonicalizeObject(obj)` (L89-117): null/undefined -> null; strings/numbers/
   booleans passthrough; arrays mapped in order; objects rebuilt with
   `Object.keys(obj).sort()` (L108) = UTF-16 code-unit order; NO depth guard,
   NO circular-ref guard, NO number/string edge handling.
2. `JSON.stringify(canonical)` (L61): compact, no insignificant whitespace.
3. Envelope `{canonical_version: '1.0.0', serialization_version: '1.0.0',
   algorithm: 'sha256', payload: serialized}` (L64-69): versioned, self-
   describing INSIDE the hashed input.
4. `hash(JSON.stringify(envelope))` -> `createHash('sha256').update(input,
   'utf8').digest('hex')` (L49-51): 64-char lowercase hex.

Determinism guarantee: single traversal, single algorithm, UTF-8 digest
input, versioned envelope. What it does NOT guarantee: bounded recursion
(circular input stack-overflows; latent defect 7(b), still present).

### Hot path 2: replay kernel (SEMANTIC STATE -> BYTES -> HASH)

`CanonicalHashAuthority.canonicalize` (`canonical_hash_authority.ts:49-56`) ->
`CanonicalJson.toUint8Array` (`canonical_json.ts:184-187`) ->
`CanonicalJson.canonicalize` (L27-29) -> `canonicalizeValue` with
`MAX_NESTING_DEPTH=64` (L21, L34-44), visited-set circular rejection
(L63-72, L91-106), sparse-array rejection (L75-84), `-0 -> 0` (L116-120),
NaN/Infinity rejection (L122-131), UTF-16 code-unit key sort via
`lexicographicCompare` (L159-178), UTF-8 bytes via TextEncoder (L184-187).
`computeFingerprint` (L61-68) -> `hashBytes` (L74-79) emits
`` `${this.hashAlgorithm}:${hash}` `` (L78): inline `<alg>:<hex>` fingerprint
label. Constructor params (L35-39) default `hashAlgorithm='sha256'`,
`hashVersion='1.0'`, `canonicalizationVersion='v1'`: limited algorithm
agility exists as configuration, not as negotiation.

Hash identity: `CertificateAuthority['sha256']` (L77) is the digest step.
Sovereignty collision (documented 2026-09-26, still true): both
`certificate_authority.ts:114` and `hash-authority.ts` claim sole authority;
digests agree (both SHA-256), jurisdictions quarantined, no cross-boundary
data flow. Documented constraint, no live defect.

### Hot path 3: Merkle layer (domain separation, LIVE)

`merkle_tree.ts:23-24`: `HASH_DOMAIN_LEAF = 0x00`, `HASH_DOMAIN_PARENT = 0x01`.
Leaf hash (L255-263): `concatBytes(0x00-prefix, bytes)` -> `CertificateAuthority.sha256`.
Parent hash (L267-281): `concatBytes(0x01-prefix, left, right)` -> sha256.
Live callers: `witness_authority.ts` (MerkleTree), re-exported via
`runtime/kernel/replay/index.ts`. This is the Certificate Transparency
(RFC 6962 s2.1) domain-separation law, already live in PING. See section 5.

### Python plane (known defects, both still present in source)

`canonical_hash_authority.py:25`:
`json.dumps(obj, sort_keys=True, ensure_ascii=True, default=str)`.
(a) `default=str` on sets is PYTHONHASHSEED-dependent: proven live
2026-09-26, two processes, different bytes, different SHA-256. Source
unchanged. (b) `sort_keys=True` sorts by Unicode code POINT; TS sorts by
UTF-16 code UNIT: supplementary-plane keys order differently across the two
planes, so cross-language hash agreement fails there even where both sides
could agree. Jurisdictions quarantined (no shared state), so no live
incident; both remain documented constraints.

## 2. JCS law verification (RFC 8785, fetched live from rfc-editor.org)

| JCS law | RFC 8785 grounding | PING status |
|---|---|---|
| Key order = UTF-16 code units, locale-independent | "formatted as arrays of UTF-16 code units... pure value comparisons... independent of locale" | CONFORMANT: `hash-authority.ts:108` (default sort), `canonical_json.ts:174-178` (explicit comparator) |
| No insignificant whitespace | "Whitespace between JSON tokens MUST NOT be emitted." | CONFORMANT: both paths use compact `JSON.stringify` |
| Numbers = ECMA-262 s7.1.12.1 (`Number.prototype.toString`) | "MUST be serialized according to Section 7.1.12.1 of [ECMA-262], including the Note 2 enhancement" | CONFORMANT: both paths delegate to `JSON.stringify`; `-0 -> 0` handled explicitly in `canonical_json.ts:116-120` |
| NaN/Infinity MUST terminate with error | "occurrences of NaN or Infinity MUST cause a compliant JCS implementation to terminate with an appropriate error" | SPLIT: `CanonicalJson` rejects (L122-131) CONFORMANT; `HashAuthority.canonicalizeObject` passes them through and `JSON.stringify` silently emits `null` (DIVERGENT) |
| Lone surrogates MUST terminate with error | "occurrences of such data MUST cause a compliant JCS implementation to terminate with an appropriate error" (interoperability incl. broken signatures) | DIVERGENT but SAFE: neither TS canonicalizer rejects. Empirically tested on the Pig today: `JSON.stringify` escapes a lone surrogate as `\ud800` (bytes `22 61 5c 75 64 38 30 30 22`), distinct from U+FFFD raw UTF-8 (`22 61 ef bf bd 22`). Output is deterministic AND injective; PING fails to reject where JCS demands rejection, but no collision exists |
| No Unicode normalization; strings "as is" | "JCS-compliant string processing does not take this into consideration... MUST preserve Unicode string data as is" | CONFORMANT: `canonicalizeString` returns value unchanged (L151-153) |
| No duplicate property names (input constraint) | "JSON objects MUST NOT exhibit duplicate property names" | N/A post-parse, same as any JCS implementation |
| Numbers expressible as IEEE-754 doubles | "JSON number data MUST be expressible as IEEE 754 double-precision values" | CONFORMANT by construction (JS numbers) |

## 3. Product questions

### (a) Canonicalization edge cases: unicode, numbers, key order

PING WINS on output conformance for every VALID JCS input: both TS
canonicalizers produce JCS-identical bytes for key order, numbers,
whitespace, literals, arrays, and string handling (including the no-
normalization rule). The divergences are all on the INPUT-VALIDATION side
where JCS demands rejection:

1. Lone surrogates: no rejection in either TS path. Proven safe anyway
   (injective escaping, test above). Narrow mechanism available from the JCS
   reference implementation: explicit lone-surrogate rejection. No defect
   proof (no input path demonstrated), so research-only.
2. NaN/Infinity: `CanonicalJson` rejects (conformant); `HashAuthority`
   silently nulls (divergent). The two "sole" canonicalizers disagree on
   invalid input. Latent, no live defect evidence.
3. Depth/circular: `CanonicalJson` guards (64 + visited set);
   `HashAuthority.canonicalizeObject` has neither (latent crash vector,
   known defect 7(b), unchanged).
4. Python plane: set nondeterminism (known defect 7(a), unchanged) and
   code-point vs UTF-16 key ordering (cross-language divergence, known).

No external mechanism beats PING's existing implementation on any valid-
input edge case. Verdict: REJECT (PING WINS) for JCS-as-implementation;
the JCS reference implementation is valuable only as a conformance oracle
and law reference (PATTERN/REFERENCE ONLY).

### (b) Algorithm agility for digests that leave PING's systems

PING's internal story is stronger than the multiformat story for a closed
system: single algorithm (SHA-256), versioned envelope inside the hash
input (`hash-authority.ts:64-69`), constructor-param agility plus inline
`<alg>:<hex>` fingerprint labels in the replay path
(`canonical_hash_authority.ts:35-39, 78`). There is no negotiation
complexity because there is no external consumer to negotiate with.

The multicodec/multihash self-description law (varint prefix identifying
the data that follows; first 127 codes single-byte) earns itself ONLY at
an export boundary. No export-boundary consumer exists in PING today, and
none was found in this pass. Adopting the registry internally would be
fashion, not need (agrees with yesterday's ipld row: "never adopt the
multicodec registry").

CROSS-LINEAGE STRENGTHENING (vein-4 audit, ground-truth checkout
`/home/nolan/projects/ping` @ `4a8c5f2e`, verified live 2026-09-28):
algorithm identity IS recorded alongside digests at HEAD:
`AskProposalBase` carries `digest: string;` plus
`digestAlgorithm: "sha256-canonical-json-v1";` (`src/lib/ping/types.ts`).
And digests are re-verified at use time in the governed derivation flows:
the approval endpoint re-reads the current material and rejects on digest
mismatch (in-toto MATCH-rule semantics, `src/app/api/ping/proposal/
route.ts:69`); the product digest is recomputed and compared at approval
(`ask-composer.ts:80` via `site-patch.ts:312`, `route.ts:58`); the
projection read seam fail-closes on graphDigest/presentationIntentDigest
mismatch (`ping-object-source.ts:237-238, 178-188`). Working-tree only
(untracked, 2026-09-27 consolidation, not at HEAD): `src/lib/ping/
digest.ts` exports `DIGEST_ALGORITHM = "sha256-canonical-json-v1"` and a
constant-time `verify(value, expectedHex)` digest-equality primitive; at
HEAD the canonicalizer lived in `ask-composer.ts` using `node:crypto`.

So PING's product path already practices algorithm-labeled digests plus
verify-at-use, which is the self-description discipline multihash was
designed to give, in PING's own vocabulary. The remaining gap a
multicodec-style scheme would fill is only cross-system interop of raw
digests, which has no consumer.

Verdict: PING WINS internally; multicodec stays BACKLOG, gated on a real
export-boundary consumer.

### (c) Type-domain separation in hashed bytes

Git precedent (`<type> SP <size> NUL <content>` hashed with the header
included): type disambiguation baked into hash inputs, immune to
cross-type content confusion. PING's Merkle layer implements the same law
in the CT/RFC-6962 form: `0x00 || leaf-bytes`, `0x01 || left || right`
(`merkle_tree.ts:23-24, 255-281`), live via `witness_authority.ts` in the
`/home/nolan/ping` lineage.

LINEAGE QUALIFIER (vein-4 audit): the ground-truth checkout
(`/home/nolan/projects/ping` @ `4a8c5f2e`) contains NO merkle code at all
(zero hits by find and `git grep -e merkle` at HEAD, and over the `src/`
working tree). The vein-4 resolution stands: the mechanism is correctly
domain-separated in PING's own code lineage (leaf = sha256(0x00 ||
leaf_bytes), node = sha256(0x01 || left || right), USED in the hashing
path: constructor `leaf.leaf_hash = this.hashBytes(leaf.leaf_bytes)`,
tree build `this.hashParent(...)`, proof verify `MerkleTree.hashParent(...)`
at L143/L148), and there is no merkle tree in the audited checkout to
patch. If a merkle tree is ever reintroduced, the law is on record:
0x00 leaf prefix, 0x01 parent prefix. Either way, no missing hardening
to write.

At the object/event layer PING uses in-band typing instead: `event_type`,
`schema_version`, `replay_version`, `policy_version` are required,
validated fields INSIDE the canonical JSON bytes
(`canonical_event_envelope.ts:24-70`), and `HashAuthority.hashCanonical`
embeds algorithm + versions in the envelope it hashes. Adequate for a
closed system with validated schemas; weaker than git's header form
against adversarial cross-type collision, but no defect and no writer.
Git's header-prefix law is recorded as pattern/reference.

At the object/event layer PING uses in-band typing instead: `event_type`,
`schema_version`, `replay_version`, `policy_version` are required,
validated fields INSIDE the canonical JSON bytes
(`canonical_event_envelope.ts:24-70`), and `HashAuthority.hashCanonical`
embeds algorithm + versions in the envelope it hashes. Adequate for a
closed system with validated schemas; weaker than git's header form
against adversarial cross-type collision, but no defect and no writer.
Git's header-prefix law is recorded as pattern/reference.

## 4. External verification results

### JCS reference implementation: cyberphone/json-canonicalization (NEW ROW)

- Default branch: `master`. Pinned SHA (commits API, 2026-09-28):
  `19d51d7fe467d4706a3ff08adf8a748f29fc21e0`
  (commit 2024-12-13T10:21:44Z, Anders Rundgren, "Update .project").
- License: Apache-2.0. GitHub license endpoint returns `NOASSERTION`
  ("Other"); the root LICENSE file is verbatim the Apache License 2.0
  text ("Copyright 2018 Anders Rundgren ... Licensed under the Apache
  License, Version 2.0"). Per the dedup contract's license policy (API
  cannot classify -> root license file), recorded as Apache-2.0 with the
  endpoint disagreement noted in `license_evidence`.
- Role: Anders Rundgren is the RFC 8785 author; this repo is the JCS
  reference implementation and test-vector home. Value to PING is the law
  and the conformance oracle, not the code (PING already implements JCS).
- Decision: PATTERN/REFERENCE ONLY. Narrow mechanism noted: lone-surrogate
  rejection law (no defect proof; research only).

### multiformats/multicodec (NEW ROW)

- Default branch: `master`. Pinned SHA (commits API, 2026-09-28):
  `8d9e9b3b3d376ee86179fc6c866f6e56f74fa167`
  (commit 2026-09-15T21:08:58Z, "Add TON Storage BagID codec (#411)").
- License: MIT (GitHub license endpoint `spdx_id` MIT, path LICENSE).
- Verified laws from the pinned README: "The code of a multicodec is
  usually encoded as unsigned varint... It is then used as a prefix to
  identify the data that follows." / "Just prefix your own data with the
  corresponding varint encoded multicodec." / "The first 127 values are
  encoded as a single-byte varint, hence they are reserved for the most
  widely used multicodecs."
- Distinct repo identity from `multiformats/multihash` and `ipld/ipld`;
  no dedup collision (verified: neither repo string exists as a row).
  Consistent with yesterday's ipld decision ("never adopt the multicodec
  registry" internally).
- Decision: BACKLOG - prefix-varint self-description law documented for
  the export boundary; gated on a real consumer; never adopt the registry.

### git object format: git/git (EXISTING ROW, unchanged)

Law re-confirmed for the record: object hashed as
`<type> SP <decimal-size> NUL <content>`; type disambiguation is part of
the hashed bytes. Yesterday's row (pinned
`0f8e75abebff0877cae681a3d5ff31ac47f54220`, GPLv2 ONLY,
PATTERN/REFERENCE ONLY) stands. Cross-check added by this pass: git's
header-prefix law and PING's `0x00`/`0x01` Merkle prefixes are the same
idea in two forms; PING already has its form live.

## 5. Audit of yesterday's vein-6 rows (2026-09-27)

| Row | Yesterday's decision | Today's audit |
|---|---|---|
| git/git | PATTERN/REFERENCE ONLY (GPLv2 never enters PING) | UNCHANGED. Accurate. Type-disambiguated-hashing law stands as recorded. |
| ipld/ipld | BACKLOG - parity inside PING; multihash only at export boundary; never adopt multicodec registry | UNCHANGED. Accurate; today's multicodec row is consistent with it. |
| multiformats/cid | PATTERN/REFERENCE ONLY (spec text, CC-BY-3.0) | UNCHANGED. Accurate. |
| multiformats/multihash | BACKLOG - MIT code at export boundary, gated on consumer | UNCHANGED. Accurate. |
| google/certificate-transparency | BACKLOG - "domain-separation law is the top follow-up: verify merkle_tree.ts on the Pig; if absent, gate a minimal patch; if present, decision becomes REJECT (PING WINS)" | **UPDATED -> REJECT (PING WINS)** (vein-4 audit resolution, adopted). Lineage-qualified: the 0x00/0x01 domain-separated leaf/node law is correctly implemented in PING's own merkle code (`/home/nolan/ping` lineage, `runtime/kernel/replay/merkle_tree.ts:23-24`, applied L255-263/L267-281, used in the hashing path per the vein-4 audit: constructor leaf_hash, tree-build hashParent, proof-verify L143/L148) and live via `witness_authority.ts` there; the ground-truth checkout (`/home/nolan/projects/ping` @ `4a8c5f2e`) has zero merkle code, so there is no missing hardening to write and no patch to gate. If a merkle tree is ever reintroduced, the law is on record. Never adopt log/auditor machinery (unchanged). |

PING-side staleness: `git log --since=2026-09-25` on all eight canonical
files shows zero commits; yesterday's falsifier flagged these claims
STALE-KEYED (memory, not live); they are now re-verified live. The three
known items (7(a) Python set nondeterminism, 7(b) HashAuthority circular-
ref crash vector, the sole-authority claim collision) are all still
present in source, unchanged in status.

## 6. Candidate records (merge-ready JSON)

Two new rows, one decision update. No alias collisions; dedup keys
(`cyberphone/json-canonicalization`, `multiformats/multicodec`) verified
absent from all 27 existing rows (only prose mentions in ipld/cid rows).

```json
[
  {
    "name": "JCS reference implementation",
    "repo": "cyberphone/json-canonicalization",
    "pinned_sha": "19d51d7fe467d4706a3ff08adf8a748f29fc21e0",
    "branch_observed": "master",
    "license": "Apache-2.0",
    "license_evidence": "GitHub license endpoint spdx_id NOASSERTION (Other); root LICENSE file is verbatim Apache License 2.0 text, Copyright 2018 Anders Rundgren; classified from the license file per dedup policy, verified 2026-09-28",
    "sha_verified": true,
    "sha_verified_date": "2026-09-28",
    "mechanisms": [
      "RFC 8785 reference implementation and test-vector suite: conformance oracle for PING CanonicalJson (pattern/reference only; PING already implements JCS)",
      "JCS law reference: UTF-16 code-unit key order, ECMA-262 number serialization, no insignificant whitespace, no Unicode normalization, lone-surrogate and NaN/Infinity rejection laws",
      "narrow mechanism (research only, no defect proof): explicit lone-surrogate rejection; PING currently escapes deterministically instead of rejecting"
    ],
    "decision": "PATTERN/REFERENCE ONLY - PING's CanonicalJson is already a good-faith JCS implementation (verified byte-conformant on all valid inputs 2026-09-28); laws referenced, nothing copied; lone-surrogate rejection stays research until an input path demonstrates it",
    "aliases": []
  },
  {
    "name": "multicodec",
    "repo": "multiformats/multicodec",
    "pinned_sha": "8d9e9b3b3d376ee86179fc6c866f6e56f74fa167",
    "branch_observed": "master",
    "license": "MIT",
    "license_evidence": "GitHub license endpoint spdx_id MIT, path LICENSE, verified 2026-09-28",
    "sha_verified": true,
    "sha_verified_date": "2026-09-28",
    "mechanisms": [
      "prefix-varint self-description law: data prefixed with the varint-encoded multicodec identifies itself (README: prefix your data with the corresponding varint encoded multicodec)",
      "single-byte reservation: first 127 codes encode as one varint byte, reserved for the most widely used codecs"
    ],
    "decision": "BACKLOG - earns itself only at an export boundary with a real consumer; never adopt the multicodec registry internally (consistent with the ipld row); PING's versioned envelope and <alg>:<hex> fingerprints already cover internal agility",
    "aliases": []
  }
]
```

Decision update (existing row `google/certificate-transparency`):

```json
{
  "repo": "google/certificate-transparency",
  "decision_update": "REJECT (PING WINS) - lineage-qualified per the 2026-09-28 vein-4 audit (vein4-audit-gaps.md): the 0x00/0x01 domain-separated leaf/node law (RFC 6962 s2.1) is correctly implemented in PING's own merkle code (/home/nolan/ping lineage, runtime/kernel/replay/merkle_tree.ts:23-24, applied L255-263/L267-281, used in the hashing path: constructor leaf_hash, tree-build hashParent, proof-verify L143/L148) and live via witness_authority.ts there; the ground-truth checkout (/home/nolan/projects/ping @ 4a8c5f2e) has zero merkle code, so there is no missing hardening to write and no patch to gate. If a merkle tree is ever reintroduced, the law is on record. Never adopt log/auditor machinery (unchanged).",
  "mechanisms_append": [
    "parity-verified 2026-09-28: RFC 6962 s2.1 leaf/node domain separation already live in PING merkle_tree.ts (/home/nolan/ping lineage); law on record for any future reintroduction"
  ]
}
```

## 7. Writer gate (all 12; no writer authorized)

1. Concrete current PING/FYD failure on canonicalization edge cases: NONE
   found (valid-input bytes are JCS-conformant; the lone-surrogate path is
   injective; known latent items 7(a)/7(b) predate this pass and are
   unchanged, with no new defect proof).
2. Live product path to a failure: UNKNOWN (none demonstrated).
3. Existing PING mechanism owning it: CanonicalAuthority surface
   (HashAuthority, CanonicalJson, CanonicalHashAuthority, MerkleTree).
4. Exact external mechanism better: NONE on valid inputs; narrow
   lone-surrogate rejection law exists but is not proven better (PING's
   escaping is safe).
5. Proof it is better: NONE.
6. Can existing PING be adapted: N/A (no gap with a defect).
7. Extract without importing architecture: N/A.
8. Code deleted/simplified: NONE.
9. Test failing before / passing after: NONE (the empirical lone-surrogate
   test PASSES on current PING behavior; COLLIDE=false).
10. Authority remaining sovereign: CanonicalAuthority (unchallenged).
11. Pinned donor SHA: JCS `19d51d7f...`, multicodec `8d9e9b3b...` (recorded,
    not consumed).
12. Exact file license: Apache-2.0 (JCS), MIT (multicodec) (recorded,
    not consumed).

Verdict: research continues on the two narrow laws; no writer.

## 8. Evidence accounting (no lines-saved fiction)

- CURRENT PING LOC TOUCHED: 0 (read-only pass; no repo writes).
- DONOR LOC EXAMINED: not measured as implementation LOC; examined:
  RFC 8785 full text (live), multicodec README + table.csv head,
  cyberphone LICENSE, GitHub API metadata for both pins. Treat as
  UNKNOWN-LOC, law-level examination.
- EXPECTED PING LOC ADDED: 0. EXPECTED PING LOC REMOVED: 0. NET: 0.
- NEW DEPENDENCIES: 0. NEW AUTHORITIES: 0. NEW RUNTIME SERVICES: 0.
- Best-scorecard outcome achieved: "We proved PING already has the
  stronger mechanism and changed nothing" (CT domain separation;
  JCS output conformance), plus two narrow laws documented for the day
  a real boundary needs them.

## 9. Appendix: exact laws quoted

- RFC 8785: "Whitespace between JSON tokens MUST NOT be emitted."
- RFC 8785: "Since invalid Unicode data like 'lone surrogates' (e.g.,
  U+DEAD) may lead to interoperability issues including broken
  signatures, occurrences of such data MUST cause a compliant JCS
  implementation to terminate with an appropriate error."
- RFC 8785: "Since Not a Number (NaN) and Infinity are not permitted in
  JSON, occurrences of NaN or Infinity MUST cause a compliant JCS
  implementation to terminate with an appropriate error."
- RFC 8785: numbers "MUST be serialized according to Section 7.1.12.1 of
  [ECMA-262], including the 'Note 2' enhancement."
- RFC 8785: property names "formatted as arrays of UTF-16 [UNICODE] code
  units. The sorting is based on pure value comparisons, where code units
  are treated as unsigned integers, independent of locale settings."
- RFC 8785: "JCS-compliant string processing does not take [Unicode
  normalization] into consideration... MUST preserve Unicode string data
  'as is'."
- multicodec README (pinned master): "The code of a multicodec is usually
  encoded as unsigned varint... It is then used as a prefix to identify
  the data that follows." / "Just prefix your own data with the
  corresponding varint encoded multicodec."
- cyberphone LICENSE: "Copyright 2018 Anders Rundgren / Licensed under
  the Apache License, Version 2.0 (the 'License')..."
- Git object format (recorded from yesterday's git/git row): objects are
  hashed as `<type> SP <decimal-size> NUL <content>`; the header is part
  of the hashed bytes (GPLv2 ONLY: pattern/reference only, never copied).
