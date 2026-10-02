# VEINS 5+6 — Contract Mechanics + Canonical Encodings Archaeology
Date: 2026-09-26. Researcher: c7d149d2 (subagent). RESEARCH-ONLY; no PING/FYD writes.

## 0. Audit provenance

- Pig reachable: yes. Canonical PING repo audited: `/home/nolan/ping` (origin github.com/piging2/PING), **branch `feature/orca-reaper-hold`**.
- `git log --since=2026-09-25 --oneline -- runtime/constitutional/src runtime/kernel/replay runtime/authorities` → **empty** (no contract/canonical changes since yesterday).
- Yesterday's matrix was on `fyd/sprint-integration-2026-09-24` (the FYD checkout; that branch does not exist in `/home/nolan/ping`).
- LOC verified live on the Pig; three constitutional files confirmed byte-identical between `/home/nolan/ping` and the freshest worktree copy (`/home/nolan/tenanos-int-tree`, 2026-09-24 19:07 MDT).

## 1. PING current contract/canonical shape (read-only audit)

| File | LOC | Mechanism |
|---|---|---|
| `runtime/constitutional/src/hash-authority.ts` | 155 | `HashAuthority` — TS constitutional hash authority. SHA-256 only; `canonicalizeObject()` = recursive key sort (UTF-16 default `.sort()`), arrays keep order, `undefined→null`, circular refs NOT guarded (stack overflow, no depth guard); `hashCanonical()` wraps in a versioned envelope `{canonical_version:'1.0.0', serialization_version:'1.0.0', algorithm, payload}` before hashing. Claims single-canonical-serializer status for the TS subsystem. |
| `runtime/constitutional/src/identity-authority.ts` | 143 | `IdentityAuthority` — deterministic IDs; `CONSTITUTIONAL_VERSION='1.0.0'` embedded in every hashed input (version identity lives in the hash domain); `generateId()` → `type_<hash16>`. Patch 7B note: zero persisted legacy IDs, canonicalize-before-serialize proven safe. No version comparison, no migration, no reader/writer resolution. |
| `runtime/constitutional/src/ping-canonical-envelope.ts` | 268 | `PingCanonicalEnvelope` — the canonical journal envelope (recovered from the live Oracle journal 2026-09-21). Construction: stripped payload → raw SHA-256 of `canonicalBytes` (deliberately NOT `HashAuthority.hashCanonical`, no version envelope) → Ed25519 sign over canonical bytes incl. payload_hash → proof attached. `verifyPayload()` fail-soft (returns false, never throws). `schema` is a bare string (e.g. `ping.social.post@1`), uninterpreted, no registry lookup. No unknown-field policy; extra fields are silently bound into the hash. |
| `runtime/constitutional/src/ping-vocabulary.ts` | 201 | `ping-vocabulary.ts` — "ONE canonical registry for the social surface vocabulary" that the TS projector, SQL schema, and website BFF must agree with. Schemas: `ping.identity@1`, `ping.social.profile@1`, `ping.social.post@1`, `ping.social.circle@1`, `ping.social.proposal@1`. Predicates with last-wins revocation law. Hand-written TS, compile-time only. |
| `runtime/constitutional/src/schemas/ping-objects.ts` | ~90+ | TS interfaces for PingObject/PingPost/PingProfile/PingRelationship; schema names carry `@N` version suffix. `visibility` has a recorded gap: PING_ONLY not supported. |
| `runtime/kernel/replay/canonical_json.ts` | 188 | `CanonicalJson` — pure TS RFC-8785 JCS implementation: UTF-16 lexicographic key order, -0→0, NaN/Inf rejected, circular refs rejected, sparse arrays rejected, `MAX_NESTING_DEPTH=64`, numbers via `JSON.stringify` (shortest round-trip for safe ints). Claims "sole canonicalization authority". |
| `runtime/kernel/replay/state_serializer.ts` | 67 | `StateSerializer` — deterministic replay-state serialization, delegates to `CanonicalJson.toUint8Array`. Consistent within the replay kernel. |
| `runtime/kernel/replay/merkle_tree.ts` | 291 | Merkle tree; hashes via `CertificateAuthority.sha256` (claims CertificateAuthority is the "sole hash authority" — see sovereignty note). |
| `runtime/authorities/canonical_hash_authority.py` | 31 | Python `CanonicalHashAuthority`: `json.dumps(obj, sort_keys=True, ensure_ascii=True, default=str)` — whitespace separators (not compact), `ensure_ascii=True` (not JCS), and `default=str` fallback. |
| `runtime/kernel/replay/event-envelope.ts` | 93 | `ReplayEventEnvelope` builder. No version/schema fields. |

### Sovereignty finding (current-state, no donor needed)
PING has **three canonical byte-constructions** that disagree for the same semantic object:
1. `HashAuthority.canonicalizeObject` + `JSON.stringify` (TS constitutional; + version envelope in `hashCanonical`),
2. `CanonicalJson` RFC-8785 (kernel replay; no envelope),
3. Python `json.dumps(sort_keys=True, ensure_ascii=True, default=str)` (Python authorities; whitespace separators, ASCII-escaped).

Each file header claims sole authority "for its jurisdiction"; the TS one admits "NO cross-language data flow" as the jurisdictional justification. Two further hash sources (`CertificateAuthority.sha256`, raw `createHash` in the envelope module) make **five** sha256 call sites. This is jurisdiction-quarantined, not unified: hashes are not portable across the TS/Python boundary or across the constitutional/kernel subsystems. No cross-boundary defect is proven (no cross-language data flow exists today); this is a recorded constraint, not an open bug. Any canonicalizer change = identity-era break (historical IDs immutable, per the identity-era law).

### Schema/contract machinery (current-state)
- **Version identity:** schema names carry `@N` (`ping.social.post@1`) — an explicit, human-readable breaking-change convention (parity with Lexicon's V2-suffix law, closed-world form).
- **Compatibility law:** NONE enforced at runtime. Optional fields are a TS-interface convention. No "old data validates under new schema" rule, no required-field-removal guard, no deprecation marker, no reader/writer resolution.
- **Unknown fields:** no policy. Postgres JSON stores them passively; `verifyPayload()` neither strips nor rejects them; they are hash-bound into the signed bytes (passive preservation, not designed forwarding).
- **Migration:** none. Deterministic migrations do not exist. Ad-hoc defaults exist in envelope builders (`refs ?? []`, `visibility ?? 'public'`, `status ?? 'active'`) — the Avro-defaults law practiced informally.
- **Generated types:** none. Vocabulary/schemas are hand-written TS.
- **Schema registry/resolution:** none. The `schema` string is never resolved.

## 2. Law-by-law comparison

Verdict key: PING WINS (keep) / DONOR WINS (name mechanism only) / PARITY / GAP (nobody has it) / UNKNOWN.

### 2a. ATProto Lexicon laws vs PING (mechanisms inside EXISTING ATProto row, bluesky-social/atproto @ 7a857989751ae31518509d69ab7194a922064f3d — pin re-verified live today via GitHub commits API, commit date 2026-09-25T17:45:47Z)

Law sources: atproto-website lexicon style guide (Lexicon evolution section) + atproto.com/specs/lexicon#lexicon-evolution, cross-checked via secondary mirrors.

| Law | Lexicon (donor) | PING | Verdict |
|---|---|---|---|
| Version identity | NSID is identity; optional monotonic `revision`; lexicon language version fixed at 1; breaking change = new NSID (V2/V3 suffix convention) | Schema string `ping.social.post@1`; breaking change = bump `@N` (convention); version also embedded in ID hash inputs | **PARITY** — same shape, PING's is closed-world/hand-enforced |
| Compatible evolution | Add optional fields only; no removing non-optional; no type changes; no renames; no required-field additions; no constraint tightening; `knownValues` extensible, `enum` frozen | Optional fields are a TS convention; nothing enforces the other rules at runtime | **DONOR WINS (law explicitness)** — harvest the written rule; no code to copy |
| Unknown fields | Indexers must ignore unknown fields and skip unknown record types; never crash; `$`-prefixed reserved | Journal passively stores unknown fields in Postgres JSON; `verifyPayload` is fail-soft; no designed policy | **PING WINS — keep** (append-only journal + hash-binding is stronger than ignore-and-drop for PING's use; no third-party writers exist to crash) |
| Extension namespaces | Open unions (default open) as third-party extension point; `.temp.` / `.unspecced.` NSID paths for experiments | None — vocabulary is closed by constitution; PING_ONLY gap documented | **PING WINS — keep** (closedness is deliberate; an extension namespace is a GAP only if a third-party writer appears) |
| Generated types | `@atproto/lexicon` codegen → typed clients from schema records | Hand-written TS interfaces; no codegen | **DONOR WINS (mechanism)** — BACKLOG: codegen earns itself only when the schema set grows beyond ~10 or a second language consumer appears |
| Schema resolution | Lexicon published as `com.atproto.lexicon.schema` records, resolved by NSID; PDS validation modes: explicit-required / explicit-none / optimistic (fail-open default) | `schema` string never resolved; no validation modes | **DONOR WINS (law)** — law-harvest only; no defect exists today because all producers/consumers are in-repo |
| Migration | Distributed model: no reliable migration mechanism; design around it | No migration machinery; historical IDs immutable by law | **PARITY** — both sides converge on "you cannot migrate the network, design around it" |

### 2b. Protobuf / Avro / JSON Schema laws vs PING (N/A(SPEC) — law-harvest only, never candidate rows)

| Law | Donor | PING | Verdict |
|---|---|---|---|
| Field-number identity (Protobuf) | Field numbers are the wire identity; names are cosmetic; never reuse a removed field's number (reserved fields) | PING has no wire format separate from names; IDs are content hashes, not ordinal fields | **PING WINS — keep** (content-hash identity is strictly stronger than ordinal identity for PING's append-only journal; the reserved-number law only matters for numeric wire formats) |
| Unknown-field preservation (Protobuf) | Parse → retain unknown fields → reserialize byte-identical; forwards new fields through old binaries | Journal stores full JSON including unknown fields; hash binds them; no forwarding pipeline needed | **PARITY** — PING's journal achieves the same end (nothing is dropped) without the mechanism |
| Reader/writer schema resolution (Avro) | Reader schema + writer schema negotiate: defaults REQUIRED for added fields; type promotion rules (int→long, etc.); field order irrelevant | No reader/writer concept; but envelope builders already practice the defaults law ad hoc (`refs ?? []`, `visibility ?? 'public'`, `status ?? 'active'`) | **PING WINS — keep**, with a note: the informal defaults practice matches Avro's hard rule; formalizing "every optional field declares its default" is a one-line style rule, not a harvest |
| Type promotion matrix (Avro) | int→long→float→double, string→bytes, etc., exhaustively specified | N/A — PING values are JSON-typed at the boundary; no numeric promotion lattice | **UNKNOWN/reject** — no defect, no harvest |
| Open-world validation (JSON Schema 2020-12) | Spec defines NO compatibility laws (there is no JSON Schema evolution vocabulary); extensibility via `unevaluatedProperties: false` for strictness, `$dynamicRef` for recursive extension, `$defs` namespacing | PING's closed vocabulary is enforced socially (vocabulary module), not by a validator | **DONOR WINS (law only)** — the harvestable law is: JSON Schema's silence proves compatibility must be designed per-system; Lexicon's written rules are the better template. No code. |
| `$dynamicRef` recursive extension | Lets a schema author leave named extension points | No extension points by design | **PING WINS — keep** (closed by constitution) |

### 2c. Canonical encodings vs PING (N/A(SPEC) — law-harvest only)

| Law | Donor | PING | Verdict |
|---|---|---|---|
| RFC 8785 JCS: UTF-16 lexicographic order, shortest round-trip numbers, -0→0, no NaN/Inf, UTF-8 output, no duplicate keys | JCS | `CanonicalJson` (kernel) implements the full rule set: UTF-16 compare ✓, -0→0 ✓, NaN/Inf reject ✓, depth 64 ✓, circular/sparse reject ✓ | **PING WINS — keep** (the kernel already IS the JCS law; do not port anything) |
| CBOR RFC 8949 core deterministic encoding: shortest-form ints, deterministic map ordering (length-first, then bytewise) | CBOR | PING has no binary canonical encoding | **GAP — deliberate**: no binary wire consumer exists; harvest only if a compact wire format is ever needed. Not a defect. |
| IPLD/CID: multihash self-description (algorithm travels with the digest), multicodec, multibase | CID | PING hashes are bare hex; algorithm lives in code. BUT `HashAuthority.hashCanonical` wraps `{canonical_version, serialization_version, algorithm, payload}` — richer self-description than multihash, at envelope level | **PARITY with different shape** — the envelope is arguably the better design for PING; a multihash-style prefix would only matter for hashes that leave PING's systems. BACKLOG. |
| Git object identity: content-addressed object graph (blob/tree/commit/tag), sha1→sha256 transition precedent | Git | PING IDs are content-derived (`type_<hash16>`, `hashCanonical`); Merkle tree in replay kernel; identity-era law mirrors Git's immutable-history + no-rewrite rule | **PARITY** — PING independently re-derived the Git shape (content addressing + no history rewrite). The sha1→sha256 transition is the useful precedent: Git did it by versioning the hash function per-object-format, which is exactly what PING's `CONSTITUTIONAL_VERSION`/`canonical_version` envelope fields pre-position. |
| Deterministic failure on ambiguity (JCS: duplicate keys forbidden; CBOR: non-shortest forms forbidden in deterministic mode) | specs | `CanonicalJson` rejects circular/sparse/deep; `verifyPayload` fail-soft | **PING WINS — keep** |

### 2d. The one genuine internal defect candidate (falsifier target, NOT a donor harvest)
Python `CanonicalHashAuthority.hash_json` uses `json.dumps(..., default=str)` with default separators and `ensure_ascii=True`:
- `default=str` on a `set`/`frozenset` (or any non-JSON type) yields `str()` output whose element order is **hash-randomization dependent** → potential nondeterminism across processes.
- Whitespace separators (`', '`, `': '`) and ASCII-escaping make Python canonical bytes differ from both TS canonicalizers even where they could agree.
No proven live defect (no evidence the Python authority hashes non-JSON types today), so this is a falsifier task: feed it sets/unicode and check determinism across processes. If proven, the fix is a ~5-line ADAPT inside the existing file (`separators=(',',':')`, deterministic fallback for non-JSON types), not a donor port.

## 3. Per-candidate records (binding shape)

### Record A — ATProto Lexicon compatibility laws
- AREA: 5 (Contract mechanics)
- CURRENT PING IMPLEMENTATION: `@N` schema suffix convention + hand-written TS interfaces; no enforced compatibility rules
- EXTERNAL IMPLEMENTATION: Lexicon evolution rules (add-optional-only; never remove non-optional; never change types; never rename; new NSID for breaking)
- EXACT REPO + SHA: bluesky-social/atproto @ 7a857989751ae31518509d69ab7194a922064f3d — EXISTING candidates.json row; no new row
- LICENSE: Dual MIT/Apache-2.0 (recorded in candidates.json)
- MECHANISM WORTH HARVESTING: The written compatibility-law text (5 bullets), adapted to PING's vocabulary module as a comment-level contract
- WHY IT IS BETTER: It is written down and machine-checkable in principle; PING's is tribal knowledge
- WHAT NOT TO COPY: Lexicons themselves, NSID resolution, PDS validation modes, `@atproto/lexicon` codegen — none port into PING without a proven consumer (per the Writer Gate: no casual porting into Canonical/Identity/Capability Authority)
- PING AUTHORITY IT MUST REMAIN UNDER: None yet — the vocabulary registry (`ping-vocabulary.ts`) is a convention module, not an authority. If a schema contract is ever enforced, it becomes a function of the existing event-acceptance authority, not a new SchemaAuthority
- MINIMAL PATCH: ~15-line comment block + optional-fields-must-have-defaults rule in `ping-vocabulary.ts`; zero runtime change
- EXPECTED DELETION-SIMPLIFICATION: none; CURRENT PING LOC TOUCHED 201, EXPECTED PING LOC ADDED ~15, REMOVED 0, NET +15, NEW DEPENDENCIES 0, NEW AUTHORITIES 0
- TEST THAT PROVES IMPROVEMENT: a test asserting every interface field in `schemas/ping-objects.ts` is optional or has a builder default — compile-time lint, not runtime
- BENCHMARK: N/A
- SECURITY CONSEQUENCES: none (documentation-level)
- MIGRATION-RISK: none
- DECISION: **HARVEST (law text only, into existing vocabulary module as contract comment) — BACKLOG priority; no writer until the schema set grows or a compatibility incident occurs**

### Record B — Lexicon schema resolution (NSID → schema records; PDS validation modes)
- AREA: 5
- CURRENT PING IMPLEMENTATION: none; `schema` string uninterpreted
- EXTERNAL IMPLEMENTATION: schema records resolved by NSID; explicit-required / explicit-none / optimistic(fail-open) validation modes
- REPO + SHA: same ATProto row, no new row
- MECHANISM WORTH HARVESTING: the *idea* of validation modes (fail-open optimistic default) for any future third-party event writer
- WHY IT IS BETTER: N/A today — no third-party writers exist
- WHAT NOT TO COPY: the resolution infrastructure
- PING AUTHORITY: would belong to the event-acceptance authority (UnifiedEventRuntime), never a new authority
- DECISION: **REJECT (for now)** — no consumer, no defect. Revisit if PING ever accepts events from outside its own producers.

### Record C — Protobuf unknown-field preservation + reserved field numbers
- AREA: 5
- CURRENT PING IMPLEMENTATION: passive preservation in Postgres JSON; hash-bound unknowns
- EXTERNAL IMPLEMENTATION: wire-level unknown-field retention; reserved numbers
- REPO + SHA: N/A(SPEC) — protocolbuffers/protobuf; law-harvest only, never a candidates.json row
- LICENSE: BSD-3-Clause (spec knowledge; no code copied)
- MECHANISM WORTH HARVESTING: the explicit law "unknown fields are data, not errors; retain and forward them"
- WHY IT IS BETTER: PING already achieves the end state; the law is the harvestable part
- DECISION: **PING WINS — keep** (document the law next to Record A's comment block as one line)

### Record D — Avro reader/writer schema resolution + mandatory defaults
- AREA: 5
- CURRENT PING IMPLEMENTATION: ad-hoc builder defaults (`?? []`, `?? 'public'`, `?? 'active'`)
- EXTERNAL IMPLEMENTATION: reader+writer schema negotiation; new fields MUST declare defaults
- REPO + SHA: N/A(SPEC) — apache/avro; law-harvest only
- MECHANISM WORTH HARVESTING: "every optional field declares its default" as a written rule
- DECISION: **PING WINS — keep** (practice already exists); fold the one-line rule into Record A's comment block

### Record E — JSON Schema draft 2020-12 (`unevaluatedProperties`, `$dynamicRef`, `$defs`)
- AREA: 5
- CURRENT PING IMPLEMENTATION: closed vocabulary by convention
- EXTERNAL IMPLEMENTATION: JSON Schema defines NO compatibility vocabulary — the absence is the lesson; extensibility primitives exist for those who opt in
- REPO + SHA: N/A(SPEC)
- DECISION: **REJECT** — PING's closed vocabulary is a constitutional choice; JSON Schema's own silence on evolution confirms the Lexicon-style written rules (Record A) are the right template, not a schema language

### Record F — RFC 8785 JCS
- AREA: 6
- CURRENT PING IMPLEMENTATION: `CanonicalJson` (kernel) — full JCS rule set already implemented
- EXTERNAL IMPLEMENTATION: RFC 8785
- REPO + SHA: N/A(SPEC)
- DECISION: **PING WINS — keep** (nothing to harvest; PING independently implemented the law)

### Record G — CBOR RFC 8949 deterministic encoding
- AREA: 6
- CURRENT PING IMPLEMENTATION: JSON-only canonical bytes; no binary canonical form
- EXTERNAL IMPLEMENTATION: shortest-form + deterministic map ordering
- REPO + SHA: N/A(SPEC)
- DECISION: **BACKLOG** — genuine GAP, but no binary wire consumer exists; harvest only on proven need

### Record H — IPLD/CID multihash self-description
- AREA: 6
- CURRENT PING IMPLEMENTATION: bare hex hashes; algorithm in code; richer self-description inside `hashCanonical` envelope
- EXTERNAL IMPLEMENTATION: multihash/multicodec/multibase prefixes
- REPO + SHA: N/A(SPEC)
- DECISION: **PING WINS — keep** for internal use; BACKLOG only if PING hashes must be interpretable outside PING's systems

### Record I — Git object identity
- AREA: 6 (evidence adjacency)
- CURRENT PING IMPLEMENTATION: content-derived IDs, Merkle tree, immutable-history law
- EXTERNAL IMPLEMENTATION: content-addressed object graph; sha1→sha256 transition precedent
- REPO + SHA: N/A(SPEC) — git/git; law-harvest only
- MECHANISM WORTH HARVESTING: the hash-function-transition precedent — Git versioned the object format, which is exactly what PING's `CONSTITUTIONAL_VERSION`/`canonical_version` envelope fields pre-position
- DECISION: **PING WINS — keep** (precedent validates the existing envelope design; no code)

## 4. PING-WINS list (successful results)
1. Closed vocabulary + `@N` schema suffix: parity with Lexicon version-identity law, simpler, no registry needed at this scale.
2. RFC-8785 canonicalization: independently and completely implemented in the replay kernel.
3. Append-only journal + hash-bound unknown fields: achieves Protobuf's unknown-field-preservation end state without the mechanism.
4. Ad-hoc Avro-style defaults in envelope builders: the right law, already practiced.
5. Immutable-history / identity-era law: independently re-derived Git's core invariant; envelope pre-positions a hash-function transition.
6. Five-way sovereignty quarantine of canonicalizers is ugly but honest: each jurisdiction's claims are explicit and no cross-boundary data flow exists today. Do not "unify" without a proven cross-boundary consumer — unification is the wrong harvest.

## 5. Proposed new candidates.json rows
**None.** Veins 5+6 yield zero new rows: the only repo donor (ATProto) already has a row with these mechanisms recorded; all other donors are specs (N/A(SPEC), law-harvest only). Conservative by design.

## 6. Falsifier handoffs (not writer work)
1. Python `CanonicalHashAuthority` nondeterminism: hash a dict containing a `set` and non-ASCII strings twice in separate processes; compare bytes. If nondeterministic → ~5-line ADAPT (compact separators + deterministic non-JSON fallback), plus a regression test.
2. `HashAuthority.canonicalizeObject` circular-reference behavior: confirm it stack-overflows (no `visited` set, no depth guard unlike `CanonicalJson`); if reachable from any caller, that's a crash vector, not just a style issue.
3. `CertificateAuthority` vs `HashAuthority` "sole authority" claim collision: determine whether both are live sha256 sources in one runtime; if yes, pick the survivor per Rule of One (evidence-first, no code change proposed here).

## 7. Blockers / caveats
- None blocking. Pig reachable; audit complete on branch `feature/orca-reaper-hold`; zero contract/canonical commits since 2026-09-25.
- ATProto pin re-verified live today (commit 7a857989751ae31518509d69ab7194a922064f3d, 2026-09-25T17:45:47Z); license record unchanged from candidates.json (dual MIT/Apache-2.0).
- All donor laws for Protobuf/Avro/JSON-Schema/JCS/CBOR/IPLD/Git are stated from stable published specs (N/A(SPEC)); no code was copied, no licenses touched.
