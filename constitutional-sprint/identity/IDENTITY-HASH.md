# IDENTITY / HASH / CANONICALIZATION — Forensic Report

**Agent:** AGENT 05 (constitutional convergence sprint, Phases 3/7, priority P2)
**Date:** 2026-09-23
**Bases (read-only):**
- (a) Adapter surface: `/home/nolan/projects/ping-constitutional` (worktree, branch `constitutional-convergence-v2`, HEAD `a69bb68f`, clean)
- (b) Canonical core: `/home/nolan/ping` (live PING runtime, HEAD `cc6856c3`)
**Method:** evidence-driven; every claim carries file:line citations. Classification: LIVE / DORMANT / DUPLICATE / CONFLICTING. This report continues a predecessor's partial pulls in `~/workspace/constitutional-sprint/identity/` (raw .txt/.ts/.js evidence) and re-verifies each against live code.

---

## 1. Executive verdicts

| # | Question | Verdict |
|---|----------|---------|
| 1 | Gateway shim → kernel IdentityAuthority: genuine call or own mint? | **CONFIRMED genuine.** `gateway/routes/identities.js:27` requires `../constitutional-dist/identity-authority.js`; `:127` calls `IdentityAuthority.generateId('identity', {display_name, public_key})`. The dist is gitignored build output compiled at Docker build time from `runtime/constitutional/src/identity-authority.ts` (`gateway/Dockerfile:12-19`). Mounted at `gateway/bootstrap/gateway_runtime.js:683`. The gateway mints nothing itself. |
| 2 | Three parallel identity namespaces — bridge anywhere? | **CONFIRMED unbridged.** (a) `src/fyd/identity/principal.ts:57-58`: `deriveIdentityId` = uuidv5(FYD_IDENTITY_NAMESPACE, "provider-account:"+...) — adapter-local, no gateway call (only OIDC-protocol fetch). (b) `src/fyd/social/actions.ts:62-67`: `createFydIdentity` POSTs to gateway `/identities` → `identity_<16hex>`. (c) `src/fyd/claim/identity.ts:16-24`: `kind: "demo-owner"`, `actorId: DEMO_OWNER_ACTOR.id` = literal `"demo-owner"` (`src/fyd/owner-mode/capability.ts:60`). No mapping table, no lookup, no promotion call exists in either base. The missing bridge is explicitly documented as not-yet-built (`src/fyd/proceduralize/STRUCTURED-DATA.md:129-138`, `src/fyd/claim/identity.ts:1-11`). |
| 3 | Content-hash identity holds? | **Mostly, with one live violation.** Object/content ids are content-derived (`identity_<16hex>`, `object_<16hex>`, `payload_hash`). **Violation:** `UnifiedEventRuntime.emit` mints `event_id = sha256(JSON.stringify(identity))` with raw unsorted `JSON.stringify` (`ping-runtime/events/unified_event_runtime.js:74-82`) — nested key order changes the hash, so the same logical payload emitted with different key order yields different event_ids and `ON CONFLICT (event_id) DO NOTHING` cannot dedupe. |
| 4 | UUID/random/hash bypasses | **Adapter: clean.** **Core: bypasses exist** — all Python `uuid.uuid4()` sites dormant; one **live** `hashlib.sha256` bypass (`runtime/workers/retriever_worker.py:92`, embedding seed, non-identity use). |
| 5 | Canonical serialization: owner? deterministic? on write path? | **No single owner in practice.** Four live serializers with divergent `undefined` handling (see §5). Write paths: POST /ingest → CanonicalBytes (kernel); POST /identities + social BFF → HashAuthority.canonicalizeObject; POST /events → raw JSON.stringify (no canonicalization). The prior "two serializers" finding is confirmed and understated. |
| 6 | Hash-use classification | See §6 table. Five classes identified, each with owner and liveness. |

### Core corrects adapter conclusions (CONFIRMED/REFUTED)
- **REFUTED:** `src/fyd/proceduralize/STRUCTURED-DATA.md:129-131` says "The canonical PING IdentityAuthority (`/home/nolan/ping/runtime/authorities/identity_authority.py`) mints UUIDv7 for canonical identities." The Python file mints time-ordered uuidv7 **worker-internal** ids (`card_id`, `analysis_id` in planner/reasoner workers) — it does **not** mint constitutional content-derived identity. Canonical `identity_<16hex>` comes from the **TypeScript** constitutional IdentityAuthority (`runtime/constitutional/src/identity-authority.ts`). The adapter doc conflates the two.
- **CONFIRMED:** adapter route docstring (`src/app/api/fyd/social/identity/route.ts:5`) — "IdentityAuthority mints identity_<16hex>" via POST /identities. Verified end to end.
- **REFUTED:** research note claim "POST /events patched live to route through CanonicalizationService" — in the current tree `gateway/routes/events.js:71-127` calls `eventRuntime.emit(...)` directly; `canonicalizeAndEmit` is only on `gateway/routes/ingest.js:53`. (Either the patch was reverted or the note described /ingest; the code is authoritative.)
- **CONFIRMED:** `src/fyd/claim/identity.ts` header — no bridge between demo-owner/OIDC/gateway identities exists in the core either.

---

## 2. Adapter surface (`ping-constitutional`)

**Identity namespaces (all live, unbridged):**
1. **OIDC uuidv5** — `src/fyd/identity/principal.ts:57-58`. `deriveIdentityId(provider, issuer, subject)` = `uuidv5(FYD_IDENTITY_NAMESPACE, "provider-account:" + provider+"::"+issuer+"::"+subject)`. The namespace UUID itself is derived once: `uuidv5("6ba7b811-9dad-11d1-80b4-00c04fd430c8", "https://ping.social/fyd/identity/v1")` (`src/fyd/identity/uuid.ts:44`). Consumed at `principal.ts:171` in `signInOrSignUp`. Correct RFC 9562 construction (`sha1(namespaceBytes || name)`, version/variant bits set). No gateway interaction — `src/fyd/identity/*.ts` fetch usage is OIDC-protocol only (token endpoint, JWKS).
2. **`identity_<16hex>`** — minted **only** by the core gateway. `src/fyd/social/actions.ts:62-75` (`createFydIdentity`) and `src/lib/ping/ping-object-reader.ts:600` POST to `${gateway}/identities`; both fail closed if the gateway is not ready (no local fallback minting). Shape enforced by `IDENTITY_RE = /^identity_[0-9a-f]{16}$/` (`actions.ts:31`, `key-custody.ts:37`).
3. **`demo-owner`** — literal string actor id (`src/fyd/owner-mode/capability.ts:60`), surfaced as `ClaimedIdentity{kind:"demo-owner"}` (`src/fyd/claim/identity.ts:16-24`). `IdentityKind = "demo-owner" | "google"` (`src/fyd/claim/types.ts:28`) anticipates the OIDC kind, but no code maps one kind to another.

**Randomness audit (adapter): cleared.** `randomBytes` in `src/fyd/identity/provider.ts:116,122,125` (PKCE verifier, OIDC state, nonce) and `src/fyd/identity/session.ts:204` (CSRF nonce) are ephemeral protocol tokens, never identity ids. `crypto.randomUUID()` in `src/lib/events.ts:229` (HPP log ids), `src/fyd/adapters/activitypub/follow.ts:27` (activity fragment), `src/fyd/media/ingest.ts:211` (ingestRunId), `src/lib/dataset-snapshots.ts:81` (snapshot ids) — none mint PING identity.

**Serialization (adapter):** `canonicalizeJson` (`src/lib/ping/dev-signer.ts:46-56`) is explicitly labeled a dev stand-in, "not the constitutional path". Sorted keys, recursive, **undefined object keys dropped**, top-level/array `undefined` → `"null"`. It is the *signing* side of the BFF envelope; the gateway verifies with a matching drop-undefined implementation (`bffCanonicalize`, `gateway/social_ingest_adapter.js:60-72`) whose comment explicitly documents the divergence from the constitutional canonicalizer. The pair is internally consistent.

---

## 3. Canonical core (`/home/nolan/ping`)

### 3.1 Identity authorities — the real map
| Authority | Location | Derivation | Liveness | Role |
|---|---|---|---|---|
| Constitutional IdentityAuthority (TS) | `runtime/constitutional/src/identity-authority.ts` → compiled `gateway/constitutional-dist/identity-authority.js` (Dockerfile tsc, gitignored) | `generateId(type, ctx)`: `JSON.stringify(HashAuthority.canonicalizeObject(ctx))` → envelope `{canonical_version, serialization_version, algorithm, payload}` → sha256 → `type_<16hex>` (`:125-130`) | **LIVE** — POST /identities (`identity_<16hex>`), `social_ingest_adapter.js:176,208,243` (`object_`, `relationship_` ids) | Authoritative for gateway-minted identity |
| Kernel IdentityAuthority (JS) | `runtime/kernel/authorities/identity_authority.js` ← shim `ping-runtime/authorities/identity_authority.js` (pure delegation, PATCH_004) | `generateId(type, data)`: `CanonicalBytes.serialize({type, version, ...data})` → `CanonicalAuthority.hashBytes` → `type_<16hex>` (`:51-77`) | **LIVE** — `ping-runtime/canonicalization/canonical_object.js:98` (POST /ingest objectId), `gateway/witness_recorder.js:48` (`witness_<16hex>`), `deterministic_id_authority.js` (deprecated wrapper) | Authoritative for canonical-object ids |
| Python IdentityAuthority | `runtime/authorities/identity_authority.py` | uuidv7: PostgreSQL `uuidv7()` or pure-Python (`os.urandom` + wall clock). **Time-based, NOT deterministic, NOT content-derived.** | **LIVE (scoped)** — `runtime/workers/planner_worker.py:69` (`card_id`), `runtime/workers/reasoner_worker.py:86` (`analysis_id`) | Worker-internal ephemeral ids only |
| CanonicalIdentityService (TS) | `runtime/kernel/identity/canonical-identity-service.ts` | Claims "SINGLE authority for all ID generation"; its `sha1()` is a **32-bit Java-style string hash padded to 40 hex** (`:150-160`) — not SHA-1, not RFC 4122 uuidv5, collision-prone | **DORMANT** — imported by 10 kernel TS files, but **no compiled .js exists** and the Dockerfile compiles only the 3 constitutional files; zero JS consumers | Hazard if ever revived; do not use |
| RuntimeIdentityAuthority | `runtime/kernel/authorities/runtime_identity_authority.js` ← shim `gateway/runtime_identity_authority.js` (pure delegation: class extends kernel class, re-exports kernel singleton) | `runtime_<sha256(fingerprint)[:16]>` (`:155-161`); docstring: provenance only, never influences replay hashes | **LIVE** | Runtime provenance fingerprint, by design separate |

**The `type_<16hex>` conflict (F-04).** Authorities A and B both mint `type_<16hex>` strings with **different byte derivations**: A wraps in a versioned envelope and maps `undefined→null`; B hashes raw `CanonicalBytes.serialize` output where `undefined→"undefined"` (distinct from `null`). Same format, different ids for the same logical input whenever `undefined` is present or envelope bytes differ. Both docstrings claim to be the single authority. This is the highest-priority convergence item in this domain.

### 3.2 Identity taxonomy
- **Content identity** — `payload_hash = sha256(canonicalBytes(payload − proof − payload_hash))` (`gateway/routes/identities.js:48-53`, `gateway/social_ingest_adapter.js:83-89`); content-derived object ids via `generateFromCanonicalHash` (`ping-runtime/canonicalization/canonical_object.js:98`). Holds.
- **Occurrence identity** — `event_id` from `UnifiedEventRuntime.emit` (`ping-runtime/events/unified_event_runtime.js:74-82`): `sha256(JSON.stringify({eventType, source, [namespace], [logical_id|payload]}))`. **Violated by key order**: raw `JSON.stringify` does not sort nested keys, so the same logical payload with different insertion order → different `event_id` → `ON CONFLICT (event_id) DO NOTHING` (`:153`) cannot dedupe, and the collision guard (`:163-174`) only fires on same-id/different-payload. Logical-id path (`logical_id` option, timestamp-stripped) is the intended stabilizer and is used by `CanonicalizationService`, but the direct POST /events path passes raw `event_data` as the hashed payload.
- **Causal identity** — `metadata.causation_id` parent links; `getChildren`/`getDescendants`/`getAncestors` traverse `metadata->>'causation_id' = ct.event_id` (`unified_event_runtime.js:260-299`). Live mechanism, code-verified.
- **Object identity** — `identity_<16hex>` (idempotent: same `(display_name, public_key)` → same id; repeat POST returns existing row, `routes/identities.js:130-145`); `object_<16hex>` / `relationship_<16hex>` from the social ingest adapter. Holds, modulo the A/B derivation conflict above.

### 3.3 UUID/random bypasses (core)
- `uuid.uuid4()` direct sites: 8, **all dormant** (no live importers): `runtime/cognitive/supervisor.py:58`, `runtime/adapters/google_drive/google_drive_ingestion_adapter.py:265`, `runtime/constitutional/event_chain.py:188,222`, `runtime/ingestion/drive_ingestor.py:136`, `runtime/kernel/workers/qdrant_projection_worker.py:308,351,390`. The module docstring claim "No worker or tool calls uuid.uuid4() directly" is false as written → **proposal 01** (docstring scoping).
- `hashlib.sha256()` direct sites: **one live** — `runtime/workers/retriever_worker.py:92` (deterministic embedding seed; non-identity use) — plus 6 dormant sites. The `CanonicalHashAuthority` "no direct hashlib" claim is false as written → **proposal 02**.
- JS gateway: **zero** `crypto.randomUUID()` minting (only audit scripts *checking* for it: `replay_kernel_audit.js:168`, `constitutional_blockers.js:302`, `verify/negative_path_verification.js:129`).
- `DeterministicKeyAuthority` (`gateway/deterministic_key_authority.js`): HKDF key derivation — not an identity minter. Cleared.
- `gateway/merkle_replay_graph.js`: self-referencing only, no imports from runtime wiring. **Dormant.**

---

## 4. Canonical serialization — owners, determinism, write-path invocation

Four live serializers, divergent `undefined` handling (the prior "two serializers" finding is confirmed and understated):

| # | Serializer | `undefined` handling | Owner (claimed) | Invoked on write path |
|---|---|---|---|---|
| S1 | `HashAuthority.canonicalizeObject` (`runtime/constitutional/src/hash-authority.ts` → dist) | → `null` (collapses null/undefined); keys retained | "SINGLE canonical serializer authority for TypeScript subsystem" | POST /identities (`generateId`, `payload_hash`); social ingest adapter (`payload_hash`, object/relationship ids) |
| S2 | `CanonicalBytes.serialize` (`runtime/kernel/authorities/canonical_authority.js:53-84`) | → `"undefined"` bytes (distinct from `"null"`); keys retained; arrays preserve order; `serializeSet` sorts for unordered | "There shall be only one canonical serializer" (`canonical_authority.js:7`) | POST /ingest → `CanonicalizationService.canonicalizeAndEmit` → `createCanonicalObject` → `canonical_hash`, `canonical_bytes`, `objectId` |
| S3 | `bffCanonicalize` (`gateway/social_ingest_adapter.js:60-72`) | object keys with `undefined` **dropped**; top-level `undefined` → `"null"` | labeled local, "USED ONLY to verify BFF-originated signatures" | POST /events BFF path (signature verify; matches adapter `canonicalizeJson`) |
| S4 | raw `JSON.stringify` (`ping-runtime/events/unified_event_runtime.js:82`) | standard (drops undefined object values) | none (inline) | POST /events direct path — `event_id` derivation |

All four are deterministic given identical input objects (sorted keys or fixed construction order), but they are **not mutually consistent**: the same logical object containing `undefined` hashes differently under S1/S2/S3, and S4 is additionally sensitive to nested key insertion order. On the wire this is mostly latent (JSON transport erases `undefined`), but in-process objects (BFF envelopes, canonical objects) can carry `undefined`, and S4's key-order sensitivity bites for any caller-constructed `event_data`.

---

## 5. Hash-use classification

| Class | Use | Owner | Liveness | Location |
|---|---|---|---|---|
| Canonical-state hash | `canonical_hash` = `CanonicalAuthority.hashBytes(CanonicalBytes.serialize(payload))`; `verifyCanonicalObject` recomputes and compares | CanonicalAuthority (kernel) | **LIVE** — POST /ingest envelope | `ping-runtime/canonicalization/canonical_object.js:94-95,148-163` |
| Identity hash | `type_<16hex>` from content (two derivations, §3.1) | Constitutional IA (A) / Kernel IA (B) | **LIVE**, conflicting | as §3.1 |
| Event (occurrence) hash | `event_id` = sha256 over identity material | UnifiedEventRuntime | **LIVE** | `ping-runtime/events/unified_event_runtime.js:82` |
| Evidence digest | `payload_hash` (content minus proof); Ed25519 signatures over canonical bytes; key fingerprints `sha256(der)[:16]` | HashAuthority / DevKeyDir (adapter) | **LIVE** | `routes/identities.js:48-53`, `social_ingest_adapter.js:83-89`, adapter `dev-signer.ts` |
| Integrity check | `verifyCanonicalObject`; event-id collision guard (same id, different payload → error) | CanonicalizationService / UER | **LIVE** | `canonical_object.js:148-163`, `unified_event_runtime.js:163-174` |
| Deduplication | `ON CONFLICT (event_id) DO NOTHING`; idempotent identity mint; `fydActionId` content-hash action dedup (adapter) | UER / gateway route / adapter | **LIVE** | `unified_event_runtime.js:153`, `routes/identities.js:130-145`, adapter `transition-id.ts` |
| Provenance fingerprint | `runtime_<16hex>` from machine fingerprint | RuntimeIdentityAuthority | **LIVE** | `runtime/kernel/authorities/runtime_identity_authority.js:155-161` |

Python `CanonicalHashAuthority.hash_json` (`json.dumps(sort_keys=True)`) is a fifth canonicalizer on paper; its "single authority" claim is refuted (§3.3). Jurisdictional note in the TS HashAuthority ("NO cross-language data flow", envelope vs no-envelope) is at least honest about the split.

---

## 6. Production-tree sweep: independent UUID/random/hash implementations minting constitutional identity

| Implementation | Mints constitutional identity? | Classification |
|---|---|---|
| TS constitutional `IdentityAuthority.generateId` | **Yes** — `identity_<16hex>`, `object_<16hex>`, `relationship_<16hex>` | LIVE, authoritative (A) |
| Kernel JS `IdentityAuthority.generateId` / `generateFromCanonicalHash` | **Yes** — `object_<16hex>` (ingest), `witness_<16hex>` | LIVE, conflicting derivation (B) |
| Python `IdentityAuthority.generate_id` (uuidv7) | No — worker-internal ephemeral ids only | LIVE, scoped; claim overbroad |
| TS `CanonicalIdentityService` | Would, if revived — broken 32-bit "sha1" | DORMANT, hazard |
| Python `uuid.uuid4()` ×8 | No (would mint random ids, not constitutional) | DORMANT bypasses |
| Python `hashlib.sha256()` ×7 | No (seeds, cache keys, point ids) | 1 LIVE + 6 DORMANT bypasses, non-identity |
| `RuntimeIdentityAuthority` | No — provenance fingerprint by design | LIVE, cleared |
| `DeterministicKeyAuthority` | No — key derivation | LIVE, cleared |
| `merkle_replay_graph.js` | — | DORMANT |
| Adapter `deriveIdentityId` (uuidv5 OIDC) | No — adapter-local principal ids, no PING write | LIVE, unbridged |
| Adapter `canonicalizeJson` / `bffCanonicalize` | No — signature bytes only | LIVE, consistent pair |

---

## 7. Findings table (shared record format)

DOMAIN / COMPONENT / CLAIM / EVIDENCE / CALLER / CALLEE / WRITER / READER / AUTHORITY / CLASSIFICATION / CONFIDENCE / BROKEN BOUNDARY / DEPENDENCIES / AFFECTS AGENTS

| DOMAIN | COMPONENT | CLAIM | EVIDENCE | CALLER | CALLEE | WRITER | READER | AUTHORITY | CLASSIFICATION | CONFIDENCE | BROKEN BOUNDARY | DEPENDENCIES | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| IDENTITY | gateway/routes/identities.js | Shim genuinely calls kernel IdentityAuthority; mints nothing itself | requires `../constitutional-dist/identity-authority.js:27`; `generateId('identity',{display_name,public_key}):127`; dist compiled by Dockerfile tsc from `runtime/constitutional/src/identity-authority.ts` (gitignored); mounted `bootstrap/gateway_runtime.js:683` | adapter `actions.ts:67` | `IdentityAuthority.generateId` | API caller | journal readers | constitutional IdentityAuthority | LIVE, CONFIRMED | HIGH | none — delegation genuine | none | Agent 20; convergence planner |
| IDENTITY | adapter fyd/identity/principal.ts | OIDC identities are adapter-local uuidv5; no PING write | `deriveIdentityId:57-58` = uuidv5(namespace, "provider-account:"+...); used `signInOrSignUp:171`; `src/fyd/identity` fetch is OIDC-protocol only | OIDC callback flow | `signInOrSignUp` | OIDC lane | binding store | none (adapter-local) | LIVE, CONFIRMED (unbridged) | HIGH | promotion boundary missing (documented, STRUCTURED-DATA.md:129-138) | convergence identity-unification decision | Agent 20 |
| IDENTITY | adapter actions.ts + claim/identity.ts | `identity_<16hex>` and `demo-owner` are separate namespaces, no bridge | `actions.ts:67` POST /identities; `claim/identity.ts:19` kind `demo-owner`, `DEMO_OWNER_ACTOR.id="demo-owner"` (`owner-mode/capability.ts:60`); no mapping table in either base | claim routes | gateway /identities | — | claim UI | gateway IA (16hex leg) | LIVE, CONFIRMED (no bridge anywhere) | HIGH | missing bridge by design | convergence decision | Agent 20 |
| IDENTITY | core A vs B `type_<16hex>` | Two live authorities mint same format with divergent derivation | A: `runtime/constitutional/src/identity-authority.ts:125-130` (envelope hash, undefined→null) via `social_ingest_adapter.js:176,208,243`; B: `runtime/kernel/authorities/identity_authority.js:51-77` (CanonicalBytes, undefined→"undefined") via `canonical_object.js:98`, `witness_recorder.js:48` | ingest adapters | `generateId` | API/BFF writers | projectors | both claim "single" | LIVE, CONFLICTING | HIGH | single-authority boundary | Agent 20 must pick winning derivation | Agent 20 |
| IDENTITY | kernel/identity/canonical-identity-service.ts | "SINGLE authority"; sha1 is 32-bit placeholder | `sha1()` = Java-style 32-bit hash padded to 40 hex (`:150-160`); imported by 10 kernel TS files; **no compiled .js**, Dockerfile compiles only 3 constitutional files | — | — | — | — | self-claimed | DORMANT, HAZARD | HIGH | none yet | none | Agent 20 |
| IDENTITY | runtime/authorities/identity_authority.py | "Single authority; no direct uuid4" | docstring `:1-6` false: 8 `uuid.uuid4` sites (all dormant, no live importers); live users `planner_worker.py:69`, `reasoner_worker.py:86` use `generate_id()` (uuidv7, time-based, non-deterministic) | planner/reasoner workers | `generate_id` | workers | — | self-claimed | LIVE (scoped), CLAIM REFUTED | HIGH | overclaim | none | Agent 20 |
| HASH | runtime/authorities/canonical_hash_authority.py | "Every SHA256 originates here; no direct hashlib" | docstring `:1-6` false: direct sites incl. **live** `runtime/workers/retriever_worker.py:92` (embedding seed) + 6 dormant sites; none mint identity | retriever_worker | `hashlib.sha256` | worker | cache | self-claimed | LIVE BYPASS (non-identity), CLAIM REFUTED | HIGH | hash-authority boundary | none | Agent 20 |
| HASH | canonical serializers S1–S4 | Four live serializers, divergent `undefined` handling | S1 undefined→null; S2 undefined→`"undefined"` bytes; S3 drops undefined keys (`social_ingest_adapter.js:60-72`); S4 raw `JSON.stringify` (`unified_event_runtime.js:82`) | write paths | hash/ID fns | API writers | verifiers | each claims single | LIVE, CONFLICTING (latent on wire) | HIGH | "one canonical serializer" | convergence canonicalization pick | Agent 20 |
| IDENTITY | UER.emit event_id | Occurrence identity is content-stable — REFUTED | `sha256(JSON.stringify({eventType,source,...}))` unsorted (`unified_event_runtime.js:74-82`); key-order change → new id; `ON CONFLICT DO NOTHING:153` can't dedupe | POST /events writers | `emit` | API/BFF writers | readers | UER | LIVE, VIOLATION | HIGH | content-identity law | event-agent / Agent 20 | Agent 20 |
| IDENTITY | research truth-matrix | "POST /events routes through CanonicalizationService" — REFUTED | `routes/events.js:71-127` calls `eventRuntime.emit` directly; `canonicalizeAndEmit` only at `routes/ingest.js:53` | — | — | — | — | — | REFUTED (stale note) | HIGH | — | none | Agent 20 |
| HASH | social_ingest_adapter.js | BFF sign/verify pair consistent; payload_hash constitutional | `bffCanonicalize` mirrors adapter `canonicalizeJson` (drop-undefined); comment `:55-59` documents divergence; `computePayloadHash` uses `HashAuthority.canonicalizeObject` | BFF adapter | `bffCanonicalize` | adapter signer | gateway verifier | HashAuthority (payload) | LIVE, CONFIRMED consistent | HIGH | none (documented) | none | Agent 20 |
| IDENTITY | gateway/runtime_identity_authority.js | Shim delegates genuinely; `runtime_<16hex>` provenance-scoped | extends kernel class, re-exports kernel singleton (`:25-35`); `_generateRuntimeId` = `runtime_<hash16>` (`kernel/.../runtime_identity_authority.js:155-161`); "provenance only" | gateway bootstrap | kernel RIA | boot | verifiers | RuntimeIdentityAuthority | LIVE, CONFIRMED | HIGH | none | none | Agent 20 |
| IDENTITY | adapter randomness | No identity bypass via randomBytes/randomUUID | `provider.ts:116,122,125` PKCE/state/nonce; `session.ts:204` CSRF nonce; `lib/events.ts:229`, `follow.ts:27`, `ingest.ts:211`, `dataset-snapshots.ts:81` — none mint PING identity | OIDC/media flows | `randomBytes`/`randomUUID` | — | — | node:crypto | LIVE, CLEARED | HIGH | none | none | Agent 20 |
| IDENTITY | routes/identities.js | Mint idempotent on (display_name, public_key) | deterministic `generateId`; repeat POST returns existing row (`:130-145`) | POST /identities | `generateId` | API caller | readers | constitutional IA | LIVE, CONFIRMED | HIGH | none | none | Agent 20 |
| IDENTITY | UER causation | Causal identity traversable via causation_id | `getChildren/getDescendants/getAncestors` on `metadata->>'causation_id'` (`unified_event_runtime.js:260-299`) | emitters | `emit` opts | producers | readers | UER | LIVE | MEDIUM | none | none | Agent 20 |
| HASH | gateway/merkle_replay_graph.js | Merkle hashing live — DORMANT | self-referencing only; no imports from gateway wiring | — | — | — | — | — | DORMANT | HIGH | none | none | Agent 20 |
| IDENTITY | gateway/deterministic_key_authority.js | Independent identity minter — CLEARED | HKDF key derivation from seed; derives keys, not identities | — | — | — | — | — | LIVE, NOT IDENTITY | HIGH | none | none | Agent 20 |
| IDENTITY | Patch 7B | Pre-7B raw-JSON ID derivation remediated | dist header: blast radius verified 2026-09-21 — zero persisted `type_hash16` IDs, zero OBJECT_CREATED rows in live Oracle journal | — | — | — | — | constitutional IA | CLOSED (historical) | MEDIUM | none | none | Agent 20 |
| IDENTITY | STRUCTURED-DATA.md:129-131 | "Python identity_authority.py mints UUIDv7 for canonical identities" — REFUTED | Python file mints worker-internal uuidv7 only; canonical `identity_<16hex>` is TS constitutional IA | — | — | — | — | — | REFUTED (adapter doc) | HIGH | — | none | Agent 20 |

---

## 8. Patches (per PATCH TARGET RULE)

**Adapter (`/home/nolan/projects/ping-constitutional`): no patches applied.** Sweep found no unambiguous-evidence defect in adapter identity/hash paths: the three namespaces are unbridged by documented design (not a bug), the BFF sign/verify serializer pair is internally consistent, randomness uses are protocol-correct, and `canonicalizeJson` is correctly labeled a dev stand-in. Per the rule (corrections only, never a second authority), nothing qualified.

**Core (`/home/nolan/ping`): PROPOSE ONLY.** Two docstring-scoping diffs under `~/workspace/constitutional-sprint/patches/agent05-identity/`:
- [proposal-01-python-ia-docstring.md](sandbox://workspace/constitutional-sprint/patches/agent05-identity/proposal-01-python-ia-docstring.md) — WHY → EVIDENCE → MINIMUM CHANGE → TEST → RESULT; syntax-validated read-only (`ast.parse` on local reconstruction). Corrects the false "no direct uuid.uuid4()" claim.
- [proposal-02-python-hash-docstring.md](sandbox://workspace/constitutional-sprint/patches/agent05-identity/proposal-02-python-hash-docstring.md) — same format; corrects the false "every SHA256 originates here" claim.

**Deliberately NOT proposed** (would violate "smallest safe patch" — each changes identity derivation with persisted-row blast radius):
- Unifying the A/B `type_<16hex>` derivations (F-04) — needs a convergence decision on the winning derivation + migration plan, owned by Agent 20 / Nolan.
- Canonicalizing `UER.emit`'s `event_id` input (F-09) — changes occurrence-identity derivation; existing `ping_events` rows keep old ids, so a naive change forks the id space and breaks idempotency mapping.
- Removing/reviving `CanonicalIdentityService` (F-05) — dormant; any action is a judgment call for the convergence wave, not an unambiguous correction.

**Incidental:** during verification I ran `python3 -m py_compile` against the live tree, which wrote `__pycache__/*.pyc`. Both files were removed and `git status` verified clean — the base is untouched. Future syntax checks use `ast.parse` on local copies.

---

## 9. Dependencies and open questions for siblings / Nolan

1. **Agent 20 (consumer of this table):** F-04 (A/B `type_<16hex>` conflict) and F-08 (four serializers) need a convergence decision: which derivation and which canonicalizer win. Evidence is assembled here; the decision is not mine to make.
2. **Event-domain sibling:** F-09/F-10 — POST /events bypasses canonicalization; confirm whether the truth-matrix "patched" note described /ingest or a reverted change.
3. **No bridge** between OIDC uuidv5, `identity_<16hex>`, and `demo-owner` exists in either base (F-02/F-03). If FYD login must ever resolve to a PING identity, that promotion boundary is greenfield work.
4. Predecessor raw pulls retained in `~/workspace/constitutional-sprint/identity/` (`gw-identities.js`, `const-dist*.txt`, `canonical-*.ts`, etc.) — all re-verified live above; divergences noted inline.

*End of AGENT 05 report.*
