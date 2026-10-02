# SCHEMA EVOLUTION / MULTI-RUNTIME / DELETION-RETRACTION / PROTOCOL SURVIVAL

**Sprint:** PING constitutional convergence, night shift — schema domain
**Date:** 2026-09-23 ~20:00 MDT
**Mode:** READ-ONLY forensic. No repo writes, no commits. COMMITS CREATED: NONE.
**Bases:** (a) ADAPTER `/home/nolan/projects/ping-constitutional` @ `a69bb68f` branch `constitutional-convergence-v2` (verified clean); (b) CANONICAL CORE `/home/nolan/ping` @ `cc6856c3bc78e0535e66f168c66dc31abee2c073` (LIVE runtime; note: 4 modified + 1 untracked file observed, incl. `tools/fyd-site-projection/dump.py` — not touched by this investigation).
**Transport:** `ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -c ...'`; `git grep` on the Pig. Prioritized live code over top-level audit .md files.
**Patch rule outcome:** NO PATCHES APPLIED. No finding met the "constitutional evidence unambiguously establishes a correction" bar (see §7). No proposal diffs written.

## Method note on languages

The task brief says "Python (core), TypeScript (adapter), and workers." Live evidence: the gateway (`/home/nolan/ping/gateway`) and `ping-runtime` are **JavaScript (Node)**, the adapter is **TypeScript**, and the standalone workers (`/home/nolan/ping/workers/*.py`) are **Python**. The Python workers contain **zero** implementations of canonical JSON, hashing, or identity minting (grep for `sort_keys|canonical|sha256|uuid5` returned nothing) — they do not reimplement these concepts. The real multi-runtime surface is therefore **JS gateway ↔ TS adapter**, with Python workers as non-participants in schema/canonicalization concerns.

---

## 1. Envelope and schema versioning

### 1a. Every versioned envelope / protocol found

| Version string | Declared in | Declared by (who versions) | Consumed / enforced by | Notes |
|---|---|---|---|---|
| `bff-envelope@1` | `gateway/social_ingest_adapter.js:36` (`const BFF_ENVELOPE = 'bff-envelope@1'`) | Gateway (server-side constant) | Stamped into journaled events only: `_ingest: { adapter: BFF_ENVELOPE, received_at }` (:270-280) and `proof.signature_construction = 'bff-envelope@1'` + `signed_bytes: 'canonical-json(type,payload,metadata)'` (:283-288) | The adapter (website) documents the label in `src/fyd/social/envelope.ts:1-12` but never sends a version string; its metadata carries `generator: "fyd-social@1"` instead |
| `knowledge-envelope@1` | `gateway/knowledge_ingest_adapter.js:51` | Gateway (server-side constant) | Same stamp pattern (:243, :259) | Lane B (2026-09-21), additive; selected when `payload.schema` starts with `ping.knowledge.` (`routes/events.js:80-84`) |
| `fyd-social@1` (generator) | `src/fyd/social/transition-id.ts:18` (`FYD_SOCIAL_GENERATOR_VERSION`) | Adapter | Bound into `fydActionId` content-hash IDs (:22-27); sent in envelope `metadata.generator` (`src/fyd/social/envelope.ts:54-59`) | Gateway spreads it through into journal `payload.metadata` but never reads it (zero gateway hits for `fyd-social`/`generator_version` outside unrelated generator files) |
| `fyd-owner@1` (generator) | `src/fyd/object/owner-events.ts:44` (`FYD_OWNER_GENERATOR`) | Adapter | Bound into owner event IDs (:124-132) and every migration event (:472, :490, :504, :518, :532, :560) | Local log only; never crosses the gateway boundary |
| `fyd-site-generator` + `SITE_PLANNER_VERSION` | `src/fyd/builder/planner.ts:485` | Adapter (builder lane) | Stamped into SiteSpec `generator` block; tests pin it (`planner.test.ts:173-174`) | Proceduralize lane; not a journal protocol |
| `fyd-media@2` | `src/fyd/media/__tests__/attach.test.ts:66` (manifest stamp) | Adapter (media lane) | `MEDIA_MODULE_VERSION` checked by `bundle-media.test.ts:89` ("rejects a manifest missing the generator stamp") | Media lane only |
| `ping.social.profile@1` / `ping.social.post@1` | `gateway/social_ingest_adapter.js:52-53` | Gateway | Hard vocabulary gate: anything else → `UNSUPPORTED_SCHEMA` (:224) | Adapter also uses `ping.social.business@1`, `ping.social.service@1` (ask/tests) — NOT accepted by social ingest |
| `ping.identity@1` | `gateway/routes/identities.js:33`; `gateway/social_ingest_adapter.js:158` | Gateway | Identity mint emits it; signer resolution queries it | `POST /identities` mints via compiled `IdentityAuthority` (routes/identities.js:21-32), idempotent on (display_name, public_key) |
| `event_version: '1.0.0'` | `gateway/canonical_event_envelope.js:150` | Gateway | Stored per event in `canonical_events`; validated required (:203) | Hardcoded; no upgrade path observed |
| `metadata.schema_version: '1.0.0'` | `ping-runtime/events/unified_event_runtime.js:133` | Gateway event runtime | Stamped into every emitted event's metadata | Hardcoded; never compared |
| Constitutional versions | `gateway/constitution_version_authority.js:27-35` | Gateway singleton | `constitutional_schema 5.0.0`, `hashing_algorithm 1.0.0`, `canonical_serialization 1.0.0`, `replay_engine 5.0.0`, `witness_authority 4.0.0`, `transcript_authority 5.0.0`, `identity_authority 1.0.0` | `verifyVersionCompatibility` exists (:128-163) but is NOT called on the ingest path; callers are replay/witness/mission subsystems |
| `IdentityAuthority.CONSTITUTIONAL_VERSION = '1.0.0'` | `gateway/constitutional-dist/identity-authority.js:130` | Compiled constitutional dist | Bound into every `generateDeterministicId`/`generateFromCanonicalHash` (:56-79) | This is what makes `type_<hash16>` IDs version-pinned |

### 1b. Negotiation across the adapter↔core boundary

**There is none.** `POST /events` (`gateway/routes/events.js:71-128`) dispatches on body *shape* (`req.body.type && req.body.payload && !req.body.event_type`, :76), never on any version field. `normalizeBffEnvelope` destructures `{type, payload, proof, metadata}` and never inspects `metadata.generator`. The `BFF_ENVELOPE` label is stamped on the *output* side only.

**On version mismatch** the behavior is cryptographic fail-closed, not version-negotiated:
- Unknown event type → `UNKNOWN_EVENT_TYPE` → HTTP 400
- Bad signature (e.g. a hypothetical `bff-envelope@2` with different signed bytes) → `INVALID_SIGNATURE` → HTTP 400
- Unknown schema → `UNSUPPORTED_SCHEMA` → HTTP 400
- Non-client errors → HTTP 500 (`routes/events.js:89-94`; client-code regex `/^(INVALID_|UNKNOWN_|MISSING_|UNSUPPORTED_|PREDICATE_|SECRET_|SIGNER_)/`)
- A same-shaped envelope carrying a *different* version label that still verifies would be **silently accepted and stamped `signature_construction: 'bff-envelope@1'` anyway** — the label is asserted, not checked.

**Verdict:** versioning is LIVE as write-only provenance stamps; version *negotiation* is DORMANT (absent). The boundary's real gate is signature verification + hardcoded vocabulary, not version comparison.

---

## 2. Event / object schema evolution

| Mechanism | File:line | How schemas change | Owner | Status |
|---|---|---|---|---|
| Owner-event log v1→v2 transparent migration | `src/fyd/object/owner-events.ts:19-23, 411-444, 567-595` | Old mutable v1 files migrate **on read, in memory**; migration emits provenance-labeled events (evidence kind `"migration"`, deterministic IDs, actor `owner-store v1 migration (original actor unrecorded)`); reads never write; first append persists one v2 file | Adapter (owner lane) | **LIVE** — history-preserving, additive |
| SiteSpec additive policy | `src/fyd/sitespec/types.ts:88, 288, 353` | "extends the set additively; every new group is optional so specs written [before] validate and render unchanged" | Adapter (sitespec lane) | **LIVE** (policy as code comments + optional fields) |
| Gateway `MigrationEngine` | `gateway/migration_engine.js:12, 96-168` | Numbered SQL migrations `_migration001`–`_migration011` with a schema-version table; registered in `AuthorityRegistry.initialize` (`gateway/authority_registry.js:257-258`) | Gateway | **DORMANT** (unverified) — registered in the registry, but no live boot caller of `AuthorityRegistry.initialize` was traced from `bootstrap/gateway_runtime.js`; could not establish reachability |
| `constitutional_schema_authority` / `schema_repository` | `gateway/constitutional_schema_authority.js`, `gateway/constitutional_schema_repository.js` | Schema authority/registry modules | Gateway | **DORMANT w.r.t. the live boundary** — required only by `constitutional_bootstrap.js` and `constitutional_authority_registry.js` (bootstrap-time); zero requires from `routes/*`, `server.js`, or either ingest adapter. The live ingest path hardcodes vocabulary instead |
| `event_version` / `schema_version` bumps | `gateway/canonical_event_envelope.js:150`; `unified_event_runtime.js:133` | Hardcoded `'1.0.0'`; no migration or dual-read logic observed | Gateway | **LIVE** (stamped) / **DORMANT** (never evolved, never compared) |
| `ConstitutionVersionAuthority` compat check | `gateway/constitution_version_authority.js:128-163` | `verifyVersionCompatibility` + supported-combination map (`_initializeSupportedVersions`, :183-196) | Gateway | **LIVE** as a module, **DORMANT** on the adapter↔core path (not consulted by ingest) |
| PingObject `schema` field | `src/lib/ping/types.ts:108` | Shape authority for the TS surface; no version-negotiation logic | Adapter (types) | DERIVED |

**Verdict:** there is **no single live schema registry** owning event/object schemas on the boundary. Ownership is fragmented: the gateway hardcodes social vocabulary (`EVENT_TYPES`, `SOCIAL_PREDICATES`, `PROFILE_SCHEMA`, `POST_SCHEMA`); the adapter hardcodes its schema URIs; evolution happens via (a) transparent local migrations (owner log, history-preserving), (b) additive-only spec growth, (c) hardcoded per-adapter vocabulary gates. The schema-registry and migration-engine modules exist but are not on the live ingest path.

## 3. Multi-runtime consistency (canonical JSON, identity, hash)

### 3a. Canonical-JSON serializer matrix — verified file:line pairs

| # | Implementation | File:line | Undefined-object-field rule | Used for | Agrees with |
|---|---|---|---|---|---|
| S1 | TS adapter `canonicalizeJson` | `src/lib/ping/dev-signer.ts:47-60` | **DROPPED** (`.filter(([, v]) => v !== undefined)`) | bff-envelope@1 signed bytes; `fydActionId`; owner event IDs | S2 (verbatim) |
| S2 | Gateway `bffCanonicalize` | `gateway/social_ingest_adapter.js:55-68` | **DROPPED** (same filter) | Verifying BFF signatures | S1 — ported verbatim, line-for-line equivalent (same comparator `(a < b ? -1 : a > b ? 1 : 0)`, same `'null'` fallbacks) |
| S3 | TS adapter `canonicalize` | `src/lib/ping/ask-composer.ts:55-66` (`sha256-canonical-json-v1`) | **→ null** (keys NOT filtered; recursion returns `"null"`) | Projection `graphDigest`; proposal `payloadHash` (digest law) | S4 on undefined handling |
| S4 | Gateway `HashAuthority.canonicalizeObject` + `JSON.stringify` | `gateway/constitutional-dist/hash-authority.js:82-104` (recursive; `undefined→null`) | **→ null** (documented at `identity-authority.js:103`: "undefined values canonicalize to null") | `payload_hash` (`social_ingest_adapter.js:71-78, 283`); identity mint hash (`routes/identities.js:61-66`); `IdentityAuthority.generateId` (`identity-authority.js:105-111`) | S3 on undefined handling |
| S5 | Gateway `computeCanonicalHash` | `ping-runtime/authorities/constitutional_validation.js:348-351` | n/a (no undefined policy) — **`JSON.stringify(obj, Object.keys(obj).sort())`: SHALLOW sort only**; nested objects serialize in insertion order | Authority `contract_hash` (`canonical_event_envelope.js:391`), constitution version manifest IDs, platform hash (`runtime_hash.js`), tenant/runtime/deployment registry hashes | **DIVERGES from S4** for any nested content |
| S6 | `UnifiedEventRuntime.emit` event_id | `ping-runtime/events/unified_event_runtime.js:80-83` | n/a — **no key sorting at all**: `sha256(JSON.stringify({eventType, source, payload}))` | Journal `event_id` for the live `ping_events` path | **DIVERGES from all of S1–S5** in principle (key-order-sensitive); deterministic in practice only because producers build payloads with fixed key order |
| S7 | emit collision check | `unified_event_runtime.js` (~178) | Shallow-sort compare `JSON.stringify(o, Object.keys(o).sort())` | Fail-closed `ON CONFLICT` semantic-collision check | Same shallow flaw as S5; order-sensitive for nested payloads (false positives/negatives possible) |
| — | Python workers | `/home/nolan/ping/workers/*.py` | (none) | n/a | No implementation found — consistent by absence |

**Prior finding verified and extended:** the adapter-internal S1-vs-S3 divergence (drop vs null) is real and still present. Extension: the gateway's S2 agrees with S1 (the signature pair is sound), and the gateway's S4 agrees with S3 (the digest pair is sound) — the conflict is *across the two pairs*, and it is latent rather than live because (a) the wire format is `JSON.stringify`, which drops `undefined` before it ever crosses the boundary, and (b) each pair is used in a separate domain (signed bytes vs digest/hash). The genuinely live divergences are S5 (shallow sort, used for contract/manifest hashes) and S6 (unsorted event_id input).

### 3b. Identity construction

| Concept | Construction | File:line | Notes |
|---|---|---|---|
| Journal object/relationship IDs | `type_<sha256hex[0:16]>` over `JSON.stringify(HashAuthority.canonicalizeObject(context))`, `CONSTITUTIONAL_VERSION='1.0.0'` bound | `gateway/constitutional-dist/identity-authority.js:56-79, 105-111, 130` | The ONE used on the social ingest path (`social_ingest_adapter.js:168-171, 241-244`) |
| Adapter OIDC identity IDs | `uuidv5(FYD_IDENTITY_NAMESPACE, "provider-account:"+provider+"::"+issuer+"::"+subject)` | `src/fyd/identity/principal.ts:57`; `src/fyd/identity/uuid.ts:17-52` | Separate namespace, separate lane (authority-map Overlap 1) |
| Legacy `canonical_events` event IDs | `uuidv5(DNS ns 6ba7b810…, tenantId:eventType:timestamp:sequence)` | `gateway/canonical_event_envelope.js:78-100` | Includes wall-clock timestamp → not idempotent; different scheme from the `ping_events` sha256 content hash |
| `DeterministicIdAuthority` | Deprecated shim over the above | `ping-runtime/authorities/deterministic_id_authority.js:1-53` | Self-declared "Constitutional Violation: Multiple identity authorities" — **DORMANT** (deprecated, warns on use) |

### 3c. Classification

| Pair | Verdict |
|---|---|
| S1 ↔ S2 (bff sign/verify) | DUPLICATE (intentional verbatim port) — AGREEING, benign |
| S3 ↔ S4 (digest/hash) | AGREEING on undefined handling — benign |
| S1/S2 vs S3/S4 | CONFLICTING semantics (drop vs null), DORMANT in practice (undefined never crosses the JSON wire; separate domains) |
| S5 `computeCanonicalHash` | CONFLICTING — same "canonical hash" name, shallow sort; LIVE in contract/manifest domain |
| S6 emit `event_id` | CONFLICTING — order-sensitive content hash presented as deterministic; LIVE on the journal write path |
| Python workers | No reimplementation — no conflict |
| Two gateway event-ID schemes (uuidv5+timestamp vs sha256 content hash) | CONFLICTING — different tables/paths (`canonical_events` vs `ping_events`), different idempotency properties |

## 4. Deletion / retraction semantics

**Headline: the journal cannot be deleted.** No `DELETE FROM` exists in the journal persistence layer, and no HTTP DELETE route touches events. Every observed "delete" is either (a) point-state/registry removal (not history) or (b) lawful append-style retraction/supersession.

| # | Delete path | File:line | What is removed | History destroyed? | Classification |
|---|---|---|---|---|---|
| D1 | Journal (`ping_events`) | `ping-runtime/events/unified_event_runtime.js:152-189` | Nothing — `INSERT … ON CONFLICT (event_id) DO NOTHING`; no DELETE in `eventstore_persistence.js`/`event_repository.js`; no `DELETE /events` route | No — append-only by construction | **LAWFUL** (deletion impossible at code level) |
| D2 | `DELETE /repository/objects/:id` | `gateway/routes/repository.js:37` → `repoStore.delete` | Repository/projection store record | No — journal untouched | **LAWFUL** (non-journal point state) |
| D3 | `DELETE /tenants/:id` | `gateway/routes/tenants.js:66` → `DELETE FROM tenant_registry` (`ping-runtime/runtime/tenant_registry.js:182-188`) | Tenant registry row | No — journal untouched | **LAWFUL** (registry, not evidence) |
| D4 | `DELETE /runtime/tenant/:tenantId/type/:type/name/:name` | `gateway/routes/runtime.js:86` | Runtime registry record | No | **LAWFUL** (registry) |
| D5 | Social unfollow/unlike | `gateway/social_ingest_adapter.js:30-32, 239-252` — `'unfollows'`/`'unlikes'` REJECTED (`PREDICATE_NOT_CANONICAL`); revocation = `RELATIONSHIP_CREATED` with `status: 'inactive'` on the same predicate | Nothing — new event appended | No — retraction-by-status | **LAWFUL** (canonical retraction pattern) |
| D6 | Adapter HTTP `DELETE /api/fyd/social/follow` | `src/app/api/fyd/social/follow/route.ts:4, 45-55` → `unfollowIdentity` | Nothing — submits D5 | No | **LAWFUL** (method name is misleading; it appends) |
| D7 | `unlinkProviderAccount` | `src/fyd/identity/principal.ts:244-260`; file removal `src/fyd/identity/file-store.ts:81` (`unlinkSync`); audit append `src/fyd/identity/audit.ts:4-17`, `src/app/api/fyd/auth/unlink/route.ts:44-45` | Provider-account binding file (point state); refuses to unlink the last method — "the identity itself is never deleted by unlinking" | No — audit event appended; identity preserved | **LAWFUL** (point-state deletion + audit trail) |
| D8 | Owner corrections | `src/fyd/object/owner-events.ts:189-200, 265, 297`; `src/fyd/object/types.ts:180-181`; `src/fyd/object/commands.ts:232` | Nothing — assertions supersede via `supersedes` links; route documents "no undo: assertions are superseded by newer assertions" (`src/app/api/fyd/objects/[objectId]/overrides/route.ts:434`) | No — supersession chain | **LAWFUL** |
| D9 | Claim release | `src/fyd/claim/machine.ts` (transitions + history append) | Nothing — state transition with audit event | No | **LAWFUL**; no delete path exists in `src/fyd/claim/store.ts` (grep: none) |
| D10 | HPP `InMemoryEventRepository` | `src/lib/events.ts:8, 120` | All events on process restart ("NOT SUITABLE FOR PRODUCTION") | Ephemeral by design; never canonical | **LEGACY/DORMANT** — data loss, not a deletion path; non-canonical store |
| D11 | Tombstone/retraction event type | — | None found (grep for `tombstone` across gateway + adapter src: zero hits) | n/a | Absent — retraction is expressed as status/supersession, never as a tombstone |

**No constitutional violation found** in deletion semantics. The one misleading surface is D6 (an HTTP DELETE that appends), which is documented in its own header comment.

---

## 5. Protocol survival across the gateway boundary (adapter → gateway `POST /events`)

### Survives (verbatim or additively)

| Property | Evidence |
|---|---|
| `type` | Validated against `EVENT_TYPES`, echoed in response (`routes/events.js:101-109`) |
| `payload` | Preserved; gateway *adds* normalized fields (`schema`, `object_id`, `controller`, `created_at`, `content`, `refs`, `visibility`, `status`, `metadata`) and BFF-reader flat-field copies (`identityId`, `displayName`, `handle`, `bio`, `authorId`, `text`) — `social_ingest_adapter.js:162-221, 233-250` |
| `proof` (client Ed25519) | Preserved verbatim, stamped `signature_construction: 'bff-envelope@1'`, `signed_bytes`, `payload_hash` (`social_ingest_adapter.js:283-288`) — but **never re-read by the adapter** (zero `signature_construction` hits in adapter src) and not re-verified on read |
| `metadata` (adapter's: `source`, `generator: fyd-social@1`, `producedAt`) | Spread into `payload.metadata`, plus `_ingest: { adapter: 'bff-envelope@1', received_at }` (`social_ingest_adapter.js:270-280`); gateway adds `event.metadata`: `schema_version: '1.0.0'`, `namespace`, `causation_id`/`correlation_id`, `aggregate_id`/`aggregate_type` (`unified_event_runtime.js:132-142`, `routes/events.js:98`) |

### Re-minted or dropped

| Property | Fate | Evidence |
|---|---|---|
| `event_id` | **RE-MINTED** gateway-side as `sha256(JSON.stringify({eventType, source, payload}))` — the adapter's `fydActionId` does NOT become the journal event ID | `unified_event_runtime.js:80-83` vs `src/fyd/social/transition-id.ts:22-27` |
| `created_at` | **RE-MINTED** (gateway time); adapter `producedAt` survives only inside metadata | `unified_event_runtime.js:130`; `social_ingest_adapter.js:268` |
| `object_id` / `relationship_id` | **MINTED** gateway-side via `IdentityAuthority.generateId` (`type_<hash16>`); adapter never computes them | `social_ingest_adapter.js:168-171, 241-244`; `identity-authority.js:105-111` |
| `payload_hash` | **COMPUTED** gateway-side (S4 construction); adapter never sends one | `social_ingest_adapter.js:71-78, 283` |
| `sequence` | **ABSENT** — `ping_events` has no sequence column (`unified_event_runtime.js:44-55` DDL); the adapter's readers assume it (`readers.ts:59` → `asSequence(ev.sequence)` → null) and latest-wins silently falls through to `(created_at, event_id)` | **Ordering property DEGRADED across the boundary: assumed-but-not-provided** |
| Client signature as a verification input | **DROPPED downstream** — verified once at ingest, then carried as opaque provenance; read paths (attestation re-read, projections) rely on `payload_hash`/`event_id`, not the signature | `attestation-gate.ts:72-130` re-reads journal state, never re-verifies proofs |

### Read-path survival (gateway → adapter `GET /events/:stream`)

- Ordered by `timestamp DESC` (`routes/events.js:59-66`); no sequence synthesized. The adapter's "latest-wins by (sequence, created_at, event_id) mirroring the projector" (`readers.ts:7`, `attestation-gate.ts:86-91`) therefore operates with `sequence = null` on live data — the mirror assumption does not hold against the actual table.

---

## 6. Per-area verdicts and status roll-up

| Area | Verdict | Status roll-up |
|---|---|---|
| Envelope versioning | Stamps are LIVE; negotiation is absent (DORMANT gap); mismatch is handled cryptographically (fail-closed), not by version | LIVE (stamps) / DORMANT (negotiation) |
| Schema evolution | Fragmented ownership; live mechanisms are transparent local migration + additive growth + hardcoded vocabulary gates; registry/migration-engine modules dormant off-path | LIVE (mechanisms) / DORMANT (registry, MigrationEngine*) / no single owner |
| Multi-runtime consistency | Sign/verify pair agrees; digest pair agrees; shallow-sort hash (S5), unsorted event_id (S6), and dual event-ID schemes conflict; Python workers are non-participants | DUPLICATE (benign, S1/S2) / CONFLICTING (S5, S6, dual event-ID schemes; S1-vs-S3 latent) |
| Deletion/retraction | No journal delete exists; all removals are point-state or append-style retraction/supersession | LAWFUL throughout; no violation |
| Protocol survival | Identity, payload, proof, metadata survive; event_id/created_at/object IDs/payload_hash re-minted; `sequence` assumed-but-absent (ordering degraded); client signature becomes write-only provenance | LIVE with one CONFLICTING assumption (sequence) |

\* MigrationEngine: registered in `AuthorityRegistry.initialize` (`gateway/authority_registry.js:257-258`) but no live boot caller traced — marked DORMANT pending a boot-wiring trace (follow-up for the coordinator).

## 7. Patch-target-rule evaluation (why NO patches were applied)

Evaluated every CONFLICTING finding against "constitutional evidence unambiguously establishes a correction":

1. **S1-vs-S3 undefined divergence** — the "correct" direction is ambiguous: the constitutional serializer (S4) uses null, matching S3; but S1 is pinned by the gateway's verbatim port and live signatures. Unifying requires a coordinated cross-boundary change (adapter + live gateway) → not a smallest safe patch. **No patch.**
2. **S5 shallow-sort `computeCanonicalHash`** — gateway-internal; changing it would invalidate existing contract/manifest hashes → not unambiguously safe. **Propose-only candidate, not applied** (no diff written: the safe change is non-obvious without knowing which stored hashes must be preserved).
3. **S6 unsorted `event_id` input** — same reasoning; changing the construction changes all future event IDs and breaks idempotent-dedupe continuity. **No patch.**
4. **Sequence assumed-but-absent** — fix could land on either side (add column vs drop assumption); not unambiguous. **No patch.**
5. **MigrationEngine / schema-registry dormancy** — not a defect per se; wiring question for the coordinator. **No patch.**

**Result: zero patches applied, zero proposal diffs written, zero commits. COMMITS CREATED: NONE.** The above five are recorded as findings for the convergence auditor instead.

## 8. Findings table (shared record format — for Agent 20 convergence auditor)

| DOMAIN | COMPONENT | CLAIM | EVIDENCE | CALLER | CALLEE | WRITER | READER | AUTHORITY | CLASSIFICATION | CONFIDENCE | BROKEN BOUNDARY | DEPENDENCIES | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| schema-evolution | bff-envelope@1 version stamp | Version label is write-only provenance; never negotiated or compared on the adapter↔core boundary | `gateway/social_ingest_adapter.js:36` declares; `:270-288` stamps into `_ingest.adapter` + `proof.signature_construction`; `routes/events.js:71-128` dispatches on body shape, never reads a version field; zero gateway reads of `metadata.generator` | website `buildSignedEnvelope` (`src/fyd/social/envelope.ts:52`) | `POST /events` → `normalizeBffEnvelope` (`gateway/social_ingest_adapter.js:269`) | gateway `social_ingest_adapter` | no reader (zero adapter hits for `signature_construction`) | gateway (unilateral) | LIVE (stamp) / DORMANT (negotiation) | high | version-negotiation boundary absent | identity/hash agents (signature verification is the de-facto version gate) | social ingest path; future verifiers |
| schema-evolution | bff-envelope version mismatch handling | Mismatch fails closed cryptographically (INVALID_SIGNATURE → 400), not by version comparison; a same-shaped differently-versioned envelope that verifies would be mis-stamped @1 | `gateway/social_ingest_adapter.js:118-140` (`verifyBffProof`); `routes/events.js:89-94` (400-code regex) | any `POST /events` client | `verifyBffProof` | — | — | gateway | LIVE | high | envelope-version boundary | canonical-JSON agents (S1/S2 must stay verbatim ports) | social ingest path |
| schema-evolution | knowledge-envelope@1 | Second versioned envelope, Lane B additive, same stamp pattern as bff-envelope@1 | `gateway/knowledge_ingest_adapter.js:51, 243, 259`; selected at `routes/events.js:80-84` | `POST /events` with `payload.schema` = `ping.knowledge.*` | `normalizeKnowledgeEnvelope` | gateway `knowledge_ingest_adapter` | journal readers | gateway (unilateral) | LIVE | high | — | schema-evolution (vocabulary growth) | knowledge ingest lane |
| schema-evolution | generator-version binding (fyd-social@1, fyd-owner@1) | Generator versions are bound into content-hash IDs, so a version bump re-mints IDs and breaks cross-version dedupe | `src/fyd/social/transition-id.ts:18, 22-27`; `src/fyd/object/owner-events.ts:44, 124-132` | `fydActionId`, `finalizeDrafts` | `canonicalizeJson` (S1) | adapter | C1 dedupe (`actions.ts`), owner log | adapter (unilateral) | LIVE | high | id-generation versioning (no cross-version map) | multi-runtime identity | social actions; owner lane |
| schema-evolution | social schema vocabulary gate | Only `ping.social.profile@1` and `ping.social.post@1` are ingestible; vocabulary is hardcoded, not registry-driven | `gateway/social_ingest_adapter.js:52-53, 224` (`UNSUPPORTED_SCHEMA`) | `normalizeBffEnvelope` | — | gateway | — | gateway (hardcoded constants) | LIVE | high | schema-registry boundary (registry exists but off-path) | schema-registry liveness | website social lane |
| schema-evolution | constitutional_schema_authority / schema_repository | Schema registry modules exist but are not consulted on any live request path | required only by `gateway/constitutional_bootstrap.js` and `gateway/constitutional_authority_registry.js`; zero requires from `routes/*`, `server.js`, or ingest adapters | (bootstrap-time only) | — | — | — | gateway | DORMANT (w.r.t. live boundary) | medium-high | authority-ownership (no live owner for schema evolution) | boot-wiring agent (confirm whether bootstrap runs at boot) | convergence auditor |
| schema-evolution | gateway MigrationEngine | Numbered SQL migrations 001–011 registered in AuthorityRegistry but no live boot caller traced | `gateway/migration_engine.js:12, 96-168`; `gateway/authority_registry.js:257-258`; no `AuthorityRegistry.initialize` caller found in `bootstrap/gateway_runtime.js` | `AuthorityRegistry.initialize` | `MigrationEngine` | — | — | gateway | DORMANT (unverified) | medium | boot-wiring | boot-wiring agent | convergence auditor |
| schema-evolution | owner-event log v1→v2 migration | Transparent, history-preserving migration on read; reads never write; migration events are provenance-labeled and deterministic | `src/fyd/object/owner-events.ts:19-23, 411-444, 567-595`; tests `owner-events.test.ts:246-297` | `readOwnerLog` | `migrateV1ToEvents` | adapter (first append persists v2) | `projectOwnerState` | adapter (owner lane) | LIVE | high | — | deletion-retraction (supersession model) | owner lane |
| multi-runtime | S1↔S2 canonical JSON (sign/verify) | TS `canonicalizeJson` and gateway `bffCanonicalize` are verbatim ports and agree (undefined dropped) | `src/lib/ping/dev-signer.ts:47-60` vs `gateway/social_ingest_adapter.js:55-68` (compared line-by-line) | `buildSignedEnvelope`; `verifyBffProof` | — | adapter / gateway | gateway verifier | duplicated (intentional) | DUPLICATE (benign) | high | — | schema-evolution (any S1 change must be ported to S2) | social ingest path |
| multi-runtime | S1 vs S3 undefined divergence | Two live TS serializers disagree on undefined (drop vs null); latent cross-domain digest risk; undefined never crosses the JSON wire today | `src/lib/ping/dev-signer.ts:47-60` vs `src/lib/ping/ask-composer.ts:55-66` | envelope signing vs `graphDigest`/`payloadHash` verification | — | adapter | adapter | fragmented | CONFLICTING (latent) | high | canonicalization authority (two claimants in one runtime) | protocol-survival (which bytes are signed vs hashed) | ask pipeline; proposal flow |
| multi-runtime | S5 `computeCanonicalHash` shallow sort | "Canonical hash" that only sorts top-level keys; nested objects serialize in insertion order; used for contract/manifest/registry hashes | `ping-runtime/authorities/constitutional_validation.js:348-351`; callers: `gateway/canonical_event_envelope.js:391`, `constitution_version_authority.js`, `gateway/runtime_hash.js`, registries | contract publishing; manifest ID generation | — | gateway | replay/witness subsystems | `constitutional_validation` | CONFLICTING | high | canonicalization authority (contradicts S4 recursive semantics) | hash agents; replay | constitution version authority; platform hash |
| multi-runtime | S6 `UnifiedEventRuntime.emit` event_id | Journal event_id = sha256 of *unsorted* `JSON.stringify({eventType, source, payload})` — key-order-sensitive, presented as deterministic content hash | `ping-runtime/events/unified_event_runtime.js:80-83`; collision check at ~178 reuses the shallow-sort flaw | `POST /events` route | — | gateway event runtime | journal readers | event runtime | CONFLICTING | high | canonicalization authority | multi-runtime (payload key order must stay fixed) | journal; attestation gate |
| multi-runtime | dual gateway event-ID schemes | `canonical_events` uses uuidv5(DNS ns, tenant:eventType:timestamp:sequence) — timestamped, not idempotent; `ping_events` uses sha256 content hash — idempotent via ON CONFLICT DO NOTHING | `gateway/canonical_event_envelope.js:78-100` vs `ping-runtime/events/unified_event_runtime.js:80-83, 152-165` | legacy emit path vs live social path | — | gateway | — | gateway (two schemes) | CONFLICTING | high | identity authority (two event-ID constructions) | identity agents | journal; replay |
| multi-runtime | Python workers | Python workers implement no canonical JSON, hashing, or identity minting — no cross-runtime divergence by absence | grep `sort_keys\|canonical\|sha256\|uuid5` over `/home/nolan/ping/workers/*.py`: zero hits | — | — | — | — | — | n/a (consistent by absence) | medium (only that dir grepped) | — | — | worker lanes |
| deletion-retraction | journal append-only | `ping_events` has no delete path at code or HTTP level; retraction is status-based append | `unified_event_runtime.js:152-189` (no DELETE); no `DELETE /events` route; `social_ingest_adapter.js:30-32, 239-252` (unfollow→status inactive) | — | — | gateway event runtime | journal readers | journal | LIVE (lawful) | high | — | protocol-survival (retraction reads) | social ingest; attestation |
| deletion-retraction | registry/point-state deletes | HTTP DELETE routes remove repository/tenant/runtime registry rows, never journal events | `gateway/routes/repository.js:37`; `gateway/routes/tenants.js:66` → `DELETE FROM tenant_registry` (`tenant_registry.js:182-188`); `gateway/routes/runtime.js:86` | API clients | `repoStore.delete`; `executeRemoveTenant` | gateway | — | gateway | LIVE (lawful, non-journal) | high | — | — | registry consumers |
| deletion-retraction | unlinkProviderAccount | Binding file deleted (`unlinkSync`) but audit event appended and identity never deleted; last-method unlink refused | `src/fyd/identity/principal.ts:244-260`; `src/fyd/identity/file-store.ts:81`; `src/fyd/identity/audit.ts:4-17` | `POST /api/fyd/auth/unlink` | `FileIdentityBindingStore` | adapter | audit log | adapter (identity lane) | LIVE (lawful) | high | — | identity agents (three-namespace overlap) | auth lane |
| deletion-retraction | owner supersession chain | Corrections never delete; assertions link `supersedes` to prior event IDs | `src/fyd/object/owner-events.ts:189-200, 265, 297`; `src/fyd/object/types.ts:180-181`; `overrides/route.ts:434` | `applyOwnerCommand` | `appendOwnerEvent` | adapter | `projectOwnerState` | adapter (owner lane) | LIVE (lawful) | high | — | schema-evolution (v1 migration preserves superseded assertions) | owner lane |
| protocol-survival | event_id re-minted at ingest | Adapter's `fydActionId` does not survive; gateway mints its own sha256 event_id | `unified_event_runtime.js:80-83` vs `src/fyd/social/transition-id.ts:22-27` | `POST /events` | `UnifiedEventRuntime.emit` | gateway | adapter (reads back re-minted id) | gateway | LIVE | high | identity boundary (client identity ≠ journal identity) | multi-runtime identity | social actions; attestation |
| protocol-survival | object/relationship IDs minted gateway-side | Adapter never computes object IDs; gateway mints `type_<hash16>` via version-pinned IdentityAuthority | `gateway/social_ingest_adapter.js:168-171, 241-244`; `gateway/constitutional-dist/identity-authority.js:105-111, 130` | `normalizeBffEnvelope` | `IdentityAuthority.generateId` | gateway | adapter readers | compiled constitutional dist | LIVE | high | identity authority (single minter — good) | multi-runtime identity | social ingest; readers |
| protocol-survival | sequence assumed-but-absent | `ping_events` DDL has no sequence column; adapter orders by assumed `sequence` (always null live), silently degrading to (created_at, event_id) | `ping-runtime/events/unified_event_runtime.js:44-55` (DDL); `src/fyd/social/readers.ts:23, 59`; `routes/events.js:59-66` (ORDER BY timestamp DESC) | adapter readers / attestation gate | `GET /events/:stream` | gateway | adapter | — (no owner; assumption unowned) | CONFLICTING | high | ordering boundary (adapter assumes property journal does not provide) | ordering/sequence agents | attestation gate; Ask FYD |
| protocol-survival | client signature becomes write-only | Ed25519 proof verified once at ingest, preserved in journal, never re-verified or read back by the adapter | `gateway/social_ingest_adapter.js:118-140, 283-288`; zero `signature_construction` hits in adapter src; `attestation-gate.ts:72-130` re-reads state, not proofs | ingest verifier | (no read-side consumer) | gateway | — | gateway | LIVE | high | signature-verification boundary (verify-once) | security agents | attestation; future verifiers |

**Cross-domain dependency notes for siblings:** (a) the `sequence` finding belongs jointly to the ordering/sequence domain — the journal's actual ordering key is `timestamp`/`created_at`, not sequence; (b) the three-identity-namespace overlap (authority-map Overlap 1) interacts with D7 and the identity rows above; (c) the S5/S6 hash findings interact with replay/witness agents that consume contract hashes and manifest IDs; (d) boot-wiring of `AuthorityRegistry`/`MigrationEngine`/`constitutional_schema_authority` needs a dedicated trace before those are declared dead.
