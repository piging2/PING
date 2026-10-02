# SEAMS — Adapter ↔ Core forensic investigation

**Investigator:** seams subagent (night shift) · **Date:** 2026-09-23 ~19:33–20:45 MDT
**Bases:** (a) ADAPTER `/home/nolan/projects/ping-constitutional` @ `a69bb68f` (branch `constitutional-convergence-v2`); (b) CANONICAL CORE `/home/nolan/ping` (live runtime home).
**Method:** read-only code forensics on both sides via Pig transport (`ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -c ...'`). Live code preferred over audit .md files. No secret values printed. **COMMITS CREATED: NONE.**
**Context read first:** `~/workspace/constitutional-sprint/authority-map/AUTHORITY-MAP.md`, `~/workspace/constitutional-sprint/security/SECURITY-SWEEP.md`.
**Scope note:** sibling investigators own identity/event/capability/execution/projection internals; this report covers only the seams where adapter assumptions meet core enforcement.

**One authorized patch was applied** under the program's PATCH TARGET RULE (smallest safe patch + regression test, adapter worktree only, no commits). See "Patch report" at the end. No patches were made or proposed for `/home/nolan/ping`.

Conventions: `A:` = adapter file:line, `C:` = core file:line. Verdicts: **MATCH** / **MISMATCH** / **UNVERIFIED**.

---

## Seam 1 — Gateway identity: uuidv5 OIDC vs `identity_<16hex>` vs demo-owner

**What the adapter assumes/sends.** Three identity-ID schemes coexist in the adapter with no mapping between them:
- OIDC lane: `deriveIdentityId` → `uuidv5(FYD_IDENTITY_NAMESPACE, "provider-account:"+provider+"::"+issuer+"::"+subject)` — A:`src/fyd/identity/principal.ts:57`. Consumed only by `signInOrSignUp` (A:`principal.ts:171`) and the Google callback/link/unlink/session routes. The OIDC callback routes never call the gateway (verified: `git grep -e createIdentity -e identities -e gateway -- src/app/api/fyd/auth/google/callback/route.ts src/fyd/identity/callback-flow.ts` → zero hits).
- Gateway/dev lane: `identity_[0-9a-f]{16}`, asserted client-side at A:`src/fyd/social/actions.ts:36-46` (`IDENTITY_RE` + `assertIdentityId`), minted via `POST <gateway>/identities` at A:`actions.ts:62-87`. `createFydIdentity` sends `{displayName, handle, bio, publicKey, algorithm:"ed25519"}` (A:`actions.ts:74-81`).
- Claim lane: `resolveClaimIdentity()` returns demo-owner only and explicitly does not depend on the auth lane — A:`src/fyd/claim/identity.ts:16`.
- Practice lane: unsigned `ping_practice_identity` cookie holds a gateway identity id chosen from the gateway's dev-identity list — A:`src/lib/ping/session.ts:23-33`.

**What the core actually enforces/returns.**
- `POST /identities` mints through the ONE IdentityAuthority: `identityId = IdentityAuthority.generateId('identity', {display_name, public_key})` — C:`gateway/routes/identities.js:118-121`. `generateId` returns `` `${type}_${hash.substring(0,16)}` `` — C:`gateway/constitutional-dist/identity-authority.js:105-110`; the hash is `HashAuthority.hashCanonical` (sha256 hex) — C:`gateway/constitutional-dist/hash-authority.js:55-66`. The live example in the code comment is `identity_cc3383c868f96fc1` (C:`routes/identities.js:19`). The adapter's `^identity_[0-9a-f]{16}$` regex matches this format.
- Minting is idempotent on `(display_name, public_key)`: a repeat returns `{identityId, created:false, eventId:null}` — C:`routes/identities.js:123-138`.
- The emitted identity event carries a **gateway-genesis proof, not a self-signature**; the holder's key is bound in `content.public_key` (SPKI DER hex) — C:`routes/identities.js:140-160`.
- **Handle/bio are validated but NOT persisted in the journaled identity event**: `content: { display_name, public_key }` only — C:`routes/identities.js:144-149`. The request's `handle`/`bio` are echoed in the HTTP response but never journaled. `GET /identities` returns only `{identityId, displayName, publicKey, createdAt}` — C:`routes/identities.js:66-89`. The adapter compensates by falling back to the journaled `ping.social.profile@1` for handle/bio — A:`src/fyd/social/readers.ts:readIdentityView`.
- Request/response field names match: adapter sends `displayName|handle|bio|publicKey|algorithm`; core reads `displayName|display_name, handle, bio, publicKey|public_key, algorithm` — C:`routes/identities.js:99-116`.

**Verdict: MISMATCH** (three unlinkable principal namespaces; no bridge exists anywhere — confirmed by import tracing: no module imports both `deriveIdentityId` and `createFydIdentity`; the OIDC callback never touches the gateway). Sub-verdicts: **MATCH** on POST /identities request/response shape and ID format; **MISMATCH** on handle/bio persistence (adapter assumes handle is minted with the identity; the core validates it, echoes it, and drops it from the journal).

---

## Seam 2 — Event submission: envelope, sequence, latest-wins

### 2a. Envelope shape
**Adapter sends:** `bff-envelope@1` = signed `{type, payload, metadata}` + `proof{algorithm:"ed25519", signature(base64), publicKey(PEM SPKI)}`, Ed25519 over sorted-key canonical bytes of `{type, payload, metadata}` — A:`src/fyd/social/envelope.ts:1-17` (docstring), `:52-66` (build), `:68-88` (POST to `/events`). The practice BFF path (`submitSignedEvent`) sends the same shape plus extra proof fields (`keyFingerprint`, `signedBytes`) — A:`src/lib/ping/ping-object-reader.ts:343-390`.
**Core accepts:** `POST /events` routes `req.body.type && req.body.payload && !req.body.event_type` to the social ingest adapter (knowledge-schema payloads go to the knowledge adapter) — C:`gateway/routes/events.js` (POST / handler). `verifyBffProof` requires `proof.algorithm==="ed25519"`, base64 signature, PEM publicKey, and verifies over `bffCanonicalize({type, payload, metadata})` — C:`gateway/social_ingest_adapter.js:117-145`. Vocabulary enforced: types limited to `OBJECT_CREATED|OBJECT_UPDATED|RELATIONSHIP_CREATED`; `unfollows`/`unlikes` rejected (`PREDICATE_NOT_CANONICAL`); revocation is `status:'inactive'` — C:`social_ingest_adapter.js:44-48,252-300`. Typed client errors → HTTP 400 `{error: CODE, message}`; anything else → 500 — C:`routes/events.js` (POST /), `route_middleware.js:21-44`.
**Verdict: MATCH** on envelope shape, signature construction label (`signature_construction:'bff-envelope@1'` stamped by the core — C:`social_ingest_adapter.js:288-294`), vocabulary, and error-shape contract (adapter maps `body.error`/`body.message` — A:`envelope.ts:78-88`).

### 2b. The unsigned second path (canonical spine)
**Adapter sends:** `emitOverlayEvent` POSTs `{event_type:"FYD_SITE_OVERLAY", aggregate_id, aggregate_type, event_data:{siteId, ops}}` with **no proof, no signature** — A:`src/fyd/customize/server.ts:74-112`.
**Core enforces:** the canonical-spine branch (`event_type && aggregate_id && aggregate_type && event_data`) calls `eventRuntime.emit(...)` directly with **zero signature or authorization check** — C:`gateway/routes/events.js` (POST / spine branch).
**Verdict: MISMATCH.** "Signed envelopes are the authorization" holds only for the social lane. The spine path is unsigned-by-design, and the gateway has no auth middleware at all (grep of C:`gateway/server.js` for bearer/apikey/auth → zero hits), so anyone who can reach the gateway HTTP port can emit arbitrary events.

### 2c. Sequence semantics
**Adapter assumes:** `ping_events` rows carry a `sequence` number. `readJournalEvents` maps `sequence: asSequence(ev.sequence)` ("node-postgres returns BIGINT as a string") — A:`src/fyd/social/readers.ts:33-41,43-68`. Tie-breaks key on it in both live readers.
**Core enforces:** `ping_events` has **no `sequence` column**. `CREATE TABLE ping_events (event_id, event_type, source, timestamp, payload, metadata, namespace, processed, created_at)` — C:`ping-runtime/events/unified_event_runtime.js:44-66`; the only `ALTER TABLE ... ADD COLUMN` is for `namespace`. The `INSERT` in `emit()` lists no sequence — C:`unified_event_runtime.js:~150-165`. (`sequence_number` exists only on the separate `constitutional_events` table — C:`gateway/constitutional_event_sourcing.js` — a different store the adapter never reads.)
**Verdict: MISMATCH** (assumed-but-absent). Every adapter tie-break silently degrades to `(created_at, event_id)`.

### 2d. Latest-wins tie-breaking
**Adapter assumes:** "Latest-wins by (sequence, created_at, event_id), mirroring the projector" — A:`src/fyd/social/attestation-gate.ts` (pre-patch comment); readers.ts header claimed "the same last-wins ordering the projector uses".
**Core enforces:** no projector implementing relationship latest-wins exists in the gateway. The only consumer of `RELATIONSHIP_CREATED` net-state semantics is the adapter itself (`grep -rln RELATIONSHIP_CREATED` in `/home/nolan/ping` → only ingest adapters, vocabulary, and event generator — no projector).
**Verdict: UNVERIFIED** (adapter-local convention; no core counterpart). Additionally the two adapter readers disagreed with each other: `winsOver` (readers.ts) implemented `(sequence, event_id)` while the attestation gate implemented `(sequence, created_at, event_id)` and the file header documented `(sequence, created_at, event_id)`. **This was patched** (see Patch report): `winsOver` now implements the documented three-tier order.

### 2e. Event-ID semantics (supporting)
**Core mints:** `event_id = sha256(JSON.stringify({eventType, source, [namespace], [logical_id|payload]}))` — content-deterministic, `ON CONFLICT (event_id) DO NOTHING` with fail-closed collision check — C:`ping-runtime/events/unified_event_runtime.js:73-130`. Note the core's `JSON.stringify` is **not** canonicalized (insertion-order sensitive). The adapter's C1 dedupe (`fydActionId`) is redundant-but-consistent with this; the attestation gate's `expectEventId` check works because `submitEnvelope` returns the core's `event_id` (core returns both `event_id` and `id` — C:`routes/events.js`; adapter reads `body.event_id` — A:`envelope.ts:82-87`).
**Verdict: MATCH** (with the insertion-order caveat noted).

## Seam 3 — Signing custodians vs core verification

**Adapter assumes:** two live key custodians.
- FYD custodian: keys live under `FYD_DEV_KEY_DIR` (default `<repo>/data/fyd-dev-keys`); directory must match strict `^identity_[0-9a-f]{16}$` — A:`src/fyd/social/key-custody.ts:36-40,67-77`. `signAsFydIdentity` signs over the canonical JSON of `{type,payload,metadata}` and emits `proof{publicKey: PEM SPKI}` — A:`key-custody.ts:79-100`.
- Practice custodian: `PING_DEV_KEY_DIR` (default `data/ping-dev-keys`) with a permissive safe-path regex — A:`src/lib/ping/dev-signer.ts:87-90`, `signAsIdentity` at `:132-142` uses `canonicalizeJson` (A:`dev-signer.ts:40-54`, drops `undefined`).

**Core enforces:** neither directory is known to the core. `verifyBffProof` checks only (a) `proof.algorithm==="ed25519"`, (b) base64 signature parses, (c) publicKey parses as a PEM SPKI key (`crypto.createPublicKey` succeeds), (d) the Ed25519 signature over `bffCanonicalize({type,payload,metadata})` is valid — C:`gateway/social_ingest_adapter.js:117-145`. Cryptographic validity is necessary and sufficient; **identity authorization is only partially bound**: for `OBJECT_UPDATED` the signer is resolved by matching the envelope's public key (SPKI DER hex) against a prior journaled `ping.identity@1` event's stored `public_key` (`resolveIdentityByPublicKey`, throws `SIGNER_UNKNOWN` if no match — C:`social_ingest_adapter.js:147-161,252-270`). For `OBJECT_CREATED` and `RELATIONSHIP_CREATED` the inspected normalization does **not** resolve or bind the signer to the claimed controller/subject — C:`social_ingest_adapter.js:252-300`. The adapter's own `dev-signer` comment ("This is DEMO KEY MATERIAL, not a real identity authority") is accurate — A:`dev-signer.ts:60-75`.
**Verdict: MISMATCH.** Cryptographic proof verification MATCHES; identity-to-key authorization is not uniformly enforced at this seam (binds only on update; creates accept any valid signature, so a key never minted via POST /identities can still author `OBJECT_CREATED`/`RELATIONSHIP_CREATED` events attributed to an arbitrary controller id).

---

## Seam 4 — Canonical JSON

**Adapter assumes/sends:** two serializers, kept separate by construction.
- Signing bytes: `canonicalizeJson` — sorted keys, `undefined` dropped — A:`src/lib/ping/dev-signer.ts:40-54`.
- Projection graph digests: `canonicalize` — sorted keys, `undefined` mapped to `null` — A:`src/lib/ping/ask-composer.ts:55-69`.

**Core enforces/returns:**
- Signing verification: `bffCanonicalize` — verbatim same construction as the adapter's `dev-signer.ts:40` (sorted keys, undefined dropped) — C:`gateway/social_ingest_adapter.js:66`. Adapter `key-custody.ts:79-100` signs `JSON.stringify(canonical)`; core verifies against `bffCanonicalize`. **Byte-identical by construction.**
- Digest verification: `tools/fyd-site-projection/dump.py:29-31` implements the serializer "designed to byte-match the TypeScript `canonicalize` in `ask-composer.ts` for pure-JSON structures (rejecting floats instead of emitting non-canonical forms)" — C:`dump.py:29-31,127-150`. **Byte-identical by design.**
- Payload journal hashing: the core computes its own `payload_hash` via `HashAuthority.canonicalizeObject` (the SINGLE canonical serializer authority per its own comment) — C:`hash-authority.js:68-80`; it never trusts a client-supplied digest. The two adapter serializers therefore never cross-verify against each other — each seam targets a distinct core construction.

**Verdict: MATCH** (segmented: signing-bytes MATCH and digest-bytes MATCH; no shared single authority, but no contradiction either — the segments do not overlap).

---

## Seam 5 — Two "current site graph" readers

**Adapter assumes:** one current FYD site graph, but two readers consume two different cores states.
- Public render path: `ping-object-source.ts` reads core-owned filesystem snapshots `FYD_PROJECTION_DIR = /home/nolan/ping/var/fyd-projections/<siteId>.json` (default; `PING_FYD_PROJECTIONS_DIR` overrides) — A:`src/fyd/data/ping-object-source.ts:90`.
- Ask FYD path: `fyd-tenant-graph.ts` starts from a repo fixture and replays `FYD_SITE_OVERLAY` journal events fetched over gateway HTTP **on every call**, explicitly not reading the dump JSON — A:`src/fyd/data/fyd-tenant-graph.ts:1-30,161+`.

**Core enforces/returns:** `tools/fyd-site-projection/dump.py` generates and hashes the snapshots (the core *generator* side of Seam 4's digest match). Snapshot files observed: `happy-place.json`, `coppersmith-plumbing.json`, `ping-fyd.json`, last written **Sep 22 08:50** (>24h stale at investigation time, 2026-09-23 ~20:10 MDT), mode 600. The digest embedded in the dump guards tamper, not staleness. The journal path (`GET /events/FYD_SITE_OVERLAY`) returns the live stream with its own hashes.
**Verdict: MISMATCH** (freshness skew). Public rendering and Ask FYD do not consume one current core state; journal freshness and dump freshness can diverge structurally.

---

## Seam 6 — Journal access

**Adapter assumes:** the gateway is the only journal surface.
- Social readers: `GET /events/<TYPE>` — A:`src/fyd/social/readers.ts:43-68` (10s `AbortSignal.timeout` — A:`readers.ts:52`).
- FYD overlays: `GET /events/FYD_SITE_OVERLAY` — A:`src/lib/ping/ping-object-reader.ts:259-300` (also 10s).
- Writes: `POST /events`. No PostgreSQL client or direct journal read exists in the adapter seam code (verified: `grep -rln -e "require(.pg.)" -e pg-promise -e "new Client" -- src/fyd src/lib/ping` → zero hits).

**Core enforces/returns:** `GET /events/:stream` → `SELECT * FROM ping_events WHERE event_type = $1 ORDER BY timestamp DESC`; `GET /events` → `ORDER BY created_at DESC` — C:`gateway/routes/events.js`. Journal rows land in Postgres (via `UNIFIED EVENT RUNTIME`; adapter's comment says journal-first via `GET /events/<TYPE>`).

**Verdict: MATCH** — with one documented exception: `getPingObjectGraph` reads the core's `var/` directory **directly from the filesystem**, bypassing the gateway (A:`src/fyd/data/ping-object-source.ts:90`), and the dogfood builder **writes** into the core's var dir (`fs.writeFileSync(PROJECTION_OUT, ...)` at A:`src/fyd/builder/dogfood/build-ping-fyd-projection.mjs:30`). Those two crossings bypass the journal entirely.

---

## Seam 7 — Client contract assumptions: timeouts, retries, errors, auth

**Adapter assumes/sends:**
- Timeouts: reader `gw()`/`gwFyd()` use `AbortSignal.timeout(10000)` — A:`src/lib/ping/ping-object-reader.ts:240-276`. **`PING_GATEWAY_BASE_URL` is required (no default) for the main reader**; FYD journal defaults to `http://127.0.0.1:18199`; social config `FYD_PING_GATEWAY_BASE_URL || PING_GATEWAY_BASE_URL || 127.0.0.1:18199` — A:`src/fyd/social/config.ts:15-24`.
- **No timeout** on any FYD social write/read (`submitEnvelope`, `createFydIdentity`, `readJournalEvents`, `emitOverlayEvent` — verified: `git grep -n -e AbortSignal -e signal: -- src/fyd/social src/fyd/customize` → zero hits).
- **No retries/backoff anywhere** in the seam code.
- **No Authorization header anywhere** in the seam code.
- `gw()` maps 404/405 on POST /events to `GatewayNotReadyError` ("run gateway with the social ingest adapter") — A:`ping-object-reader.ts:240-256`.
- Error shapes: social submit expects JSON `{error, message}` on typed rejection (A:`envelope.ts:78-88`); practice submit accepts `id`/`eventId` (A:`ping-object-reader.ts:343-390`); identity client reads `identityId` (A:`actions.ts:83`).

**Core enforces/returns:** typed BFF rejections → HTTP 400 `{error, message}`; `POST /events` success → `{success, event_id, id, ...}` (both fields); `POST /identities` success → `{identityId, publicKey, created, eventId}`; generic middleware throws → HTTP 500 `{error: <message>}` — C:`routes/events.js`, `routes/identities.js`, `route_middleware.js:21-44`. No auth middleware (verified above).

**Verdict: MATCH** on error/response-shape contract (adapter's fallbacks tolerate the untyped 500 shape). **MISMATCH** on resilience assumptions: the adapter assumes a reachable, responsive, trusted-local gateway — no timeouts on social writes, no retries, no auth either side.

---

## Findings table (shared record format — for Agent 20, convergence auditor)

| # | DOMAIN | COMPONENT | CLAIM | EVIDENCE | CALLER | CALLEE | WRITER | READER | AUTHORITY | CLASSIFICATION | CONFIDENCE | BROKEN BOUNDARY | DEPENDENCIES | AFFECTS AGENTS |
|---|--------|-----------|-------|----------|--------|--------|--------|--------|-------------|----------------|------------|-----------------|--------------|----------------|
| F1 | seams | gateway identity | Three unlinkable principal namespaces coexist (uuidv5 OIDC, `identity_<16hex>`, demo-owner) with no bridge | A:`src/fyd/identity/principal.ts:57` (uuidv5 derive) vs A:`src/fyd/social/actions.ts:36-46` (`IDENTITY_RE`) vs A:`src/fyd/claim/identity.ts:16` (demo-owner only); no module imports both derive and create; OIDC callback never calls gateway (git grep → 0 hits) | OIDC callback, social actions, claim lane | `POST /identities` (gateway) | `routes/identities.js` (mints) | adapter readers | Core IdentityAuthority (C:`identity-authority.js:105-110`) | mismatch | high | identity | identity agent (internals) | identity, capability |
| F2 | seams | POST /identities | Request/response shape and `identity_<16hex>` format match; mint is idempotent on (display_name, public_key) with gateway-genesis (not self-signed) proof | A:`src/fyd/social/actions.ts:74-87` sends displayName/handle/bio/publicKey/algorithm; C:`gateway/routes/identities.js:99-121` reads same fields, `generateId('identity',{display_name,public_key})` → `identity_cc3383c868f96fc1` example; idempotent `{identityId, created:false, eventId:null}` at C:`:123-138` | `createFydIdentity` | `POST /identities` | `routes/identities.js` | `readIdentityView` | Core IdentityAuthority | match | high | none | identity agent | capability |
| F3 | seams | identity handle/bio | Adapter assumes handle/bio are minted with the identity; core validates them but never journals them — response-only | A:`src/fyd/social/actions.ts:74-81` sends handle/bio; C:`gateway/routes/identities.js:144-149` journals `content:{display_name, public_key}` only; C:`:66-89` GET returns no handle; adapter falls back to journaled profile (A:`readers.ts:readIdentityView`) | `createFydIdentity` | `POST /identities` | `routes/identities.js` | `readIdentityView` | Core (identity event schema) | mismatch | high | identity | identity agent | projection, capability |
| F4 | seams | BFF envelope | `bff-envelope@1` shape, vocabulary, and typed error contract match on both sides | A:`src/fyd/social/envelope.ts:52-88`; A:`src/lib/ping/ping-object-reader.ts:343-390`; C:`gateway/social_ingest_adapter.js:44-48,117-145,252-300`; C:`gateway/routes/events.js` (POST /); C:`route_middleware.js:21-44` | `submitEnvelope`, `submitSignedEvent` | `POST /events` | adapter | core ingest | Core (BFF vocabulary + proof verifier) | match | high | none | event agent | capability, execution |
| F5 | seams | unsigned spine path | FYD_SITE_OVERLAY writes use the unsigned canonical-spine branch; gateway has no auth middleware, so anyone reaching the port can emit arbitrary events | A:`src/fyd/customize/server.ts:74-112` (no proof); C:`gateway/routes/events.js` POST / spine branch calls `eventRuntime.emit` directly; C:`gateway/server.js` grep bearer/apikey/auth → 0 hits | `emitOverlayEvent` | `POST /events` | adapter | journal | None (unprotected) | mismatch | high | capability/authz | event agent, capability agent | security posture, projection |
| F6 | seams | signing custodians | Core verifies signatures against NEITHER adapter custodian; signer↔identity binding enforced only on OBJECT_UPDATED, not on creates | A:`src/fyd/social/key-custody.ts:36-40,67-77` (strict custodian) vs A:`src/lib/ping/dev-signer.ts:87-90` (loose custodian); C:`gateway/social_ingest_adapter.js:117-161` (verify = signature validity + PEM parseability; binding only for OBJECT_UPDATED) | `signAsFydIdentity`, `signAsIdentity` | `POST /events` | adapter custodians | core verifier | Core (verifyBffProof) | mismatch | high | capability/authz | capability agent | security posture |
| F7 | seams | ping_events.sequence | Adapter assumes a `sequence` column exists; core schema has none — every adapter tie-break silently degrades to (created_at, event_id) | A:`src/fyd/social/readers.ts:33-41` (`asSequence`); C:`ping-runtime/events/unified_event_runtime.js:44-66` (CREATE TABLE, no sequence), `:73-130` (INSERT, no sequence) | `readJournalEvents` | `ping_events` | core runtime | adapter readers | Core (schema) | mismatch (assumed-but-absent) | high | event | event agent, projection agent | projection |
| F8 | seams | latest-wins tie-break | "Mirroring the projector" is unverifiable — no core projector exists; the two adapter readers disagreed with each other (winsOver omitted created_at) — PATCHED | A:`src/fyd/social/readers.ts:119-126` (winsOver, patched) vs A:`src/fyd/social/attestation-gate.ts:86-98`; core `grep -rln RELATIONSHIP_CREATED /home/nolan/ping` → no projector | `readNetRelationships`, `getAttestedState` | — (adapter-local) | adapter | adapter | Adapter convention (unverified core counterpart) | unverified (pre-patch: internal mismatch) | high | projection | projection agent | capability |
| F9 | seams | canonical JSON | Signing bytes and digest bytes are byte-identical by construction on their respective paths; segments do not overlap, so no contradiction | A:`src/lib/ping/dev-signer.ts:40-54` ≡ C:`gateway/social_ingest_adapter.js:66` (bffCanonicalize); A:`src/lib/ping/ask-composer.ts:55-69` ≡ C:`tools/fyd-site-projection/dump.py:29-31,127-150`; core journal hashing uses its own HashAuthority (C:`hash-authority.js:68-80`) | `buildSignedEnvelope`, `canonicalize` | core verifiers | adapter + core | core | Segmented (BFF serializer; digest serializer; HashAuthority) | match | high | none | — | execution |
| F10 | seams | projection readers | Public render reads core-owned FS snapshots (stale: >24h at investigation); Ask FYD replays the live journal — they are not one current core state | A:`src/fyd/data/ping-object-source.ts:90` (FYD_PROJECTION_DIR default `/home/nolan/ping/var/fyd-projections`) vs A:`src/fyd/data/fyd-tenant-graph.ts:1-30,161+`; core `var/fyd-projections/` mtimes Sep 22 08:50 (mode 600) | `ping-object-source`, `getFydTenantGraph` | core var dir / `GET /events/FYD_SITE_OVERLAY` | core dump.py | adapter | Core (dump.py) | mismatch (freshness skew) | high | projection | projection agent | — |
| F11 | seams | journal access | Journal reads/writes are gateway-mediated HTTP; adapter has no direct DB access — with two FS bypasses (dump reads, dogfood builder writes) | A:`src/fyd/social/readers.ts:43-68`, A:`src/lib/ping/ping-object-reader.ts:259-300`; zero pg-client hits; exception A:`src/fyd/data/ping-object-source.ts:90`, A:`src/fyd/builder/dogfood/build-ping-fyd-projection.mjs:30` | adapter readers | `GET /events/*`, `POST /events` | core | adapter | Core (journal) | match (with exceptions) | high | none (exceptions noted) | event agent | projection |
| F12 | seams | client resilience | Reader has 10s timeouts and `PING_GATEWAY_BASE_URL` is required; social writes have NO timeout, NO retries, NO auth either side | A:`src/lib/ping/ping-object-reader.ts:240-276` (timeout) vs zero AbortSignal hits in `src/fyd/social` + `src/fyd/customize`; C:`gateway/server.js` no auth middleware | all seam fetchers | gateway HTTP | adapter | — | None (assumed trusted-local) | mismatch (resilience assumption) | high | capability | — | execution |
| F13 | seams | event_id semantics | Core event_id is content-deterministic (sha256, ON CONFLICT DO NOTHING); adapter C1 dedupe is redundant-but-consistent | C:`ping-runtime/events/unified_event_runtime.js:73-130`; A:`src/fyd/social/actions.ts` (fydActionId dedupe), A:`src/fyd/social/attestation-gate.ts` (expectEventId) | adapter writers | core runtime | core runtime | adapter | Core (event runtime) | match (caveat: core JSON.stringify not canonicalized) | high | none | event agent | execution |
| F14 | seams | patch applied | Minimal adapter patch aligned winsOver with the documented tie-break + honest comments; regression test fails pre-fix, passes post-fix; no core patch warranted | A:`src/fyd/social/readers.ts` (4 replacements), A:`src/fyd/social/attestation-gate.ts` (1 comment), new `src/fyd/social/__tests__/readers-tiebreak.test.ts` + `src/fyd/social/jest.config.cjs`; stash/pop verification 2026-09-23 | — | — | seams investigator | — | — | verified | high | — | projection agent (same ordering convention) | convergence auditor |

---

## Patch report (PATCH TARGET RULE — Nolan-authorized)

**What unambiguously established a correction.** Three in-adapter artifacts contradicted each other: (1) `readers.ts` file header documented `(sequence DESC, created_at DESC, event_id DESC)`; (2) `attestation-gate.ts` implemented exactly that; (3) `winsOver` (readers.ts) implemented `(sequence, event_id)` — omitting `created_at`. In practice `sequence` is always null (F7), so the two live readers ordered ties differently: `readNetRelationships` by arbitrary event_id, the attestation gate by created_at. Both readers guard the same writes (C1 dedupe vs C4 attestation), so disagreement is a real correctness seam. The fix is the documented order — no design judgment required.

**Applied (adapter worktree only, NO commits, NO staging):**
1. `src/fyd/social/readers.ts` — `NetRelationship` gained `created_at: string`; `readNetRelationships` populates it from the journal row; `winsOver` gained the `created_at` tier (ISO-8601 strings order chronologically); header comment corrected ("adapter-local ordering; ping_events has no sequence column; no core-side projector").
2. `src/fyd/social/attestation-gate.ts` — the "mirroring the projector" comment corrected the same way.
3. New `src/fyd/social/__tests__/readers-tiebreak.test.ts` + `src/fyd/social/jest.config.cjs` (lane pattern, matches repo convention).

**Regression test evidence.**
- Driver: `npx -y tsx /tmp/tiebreak-driver.ts` against the real `readers.ts` (stubbed fetch), three cases: (a) later created_at wins on sequence tie even with smaller event_id, (b) higher sequence wins regardless of created_at, (c) larger event_id wins on full tie.
- Post-fix: 3/3 PASS (2026-09-23 ~20:40 MDT).
- Pre-fix proof: `git stash` (source patch only; test files untracked, stayed) → case (a) FAILED (`got [{"s":"active","e":"ffffffff"}]` — the old code kept the earlier event), cases (b)(c) passed → `git stash pop` restored the patch. Regression coverage confirmed.
- The committed jest test mirrors the driver; it can run in CI once the worktree has node_modules (`npx jest --config src/fyd/social/jest.config.cjs`).

**Core (`/home/nolan/ping`): NO patches proposed or applied.** No unambiguous core-side correction was found: the unsigned spine path, missing sequence column, and absent latest-wins projector are design facts to be decided in convergence, not bugs with a single safe fix. Proposed diffs: none — recorded here instead.

**Worktree state note.** During verification, `git status` showed `src/fyd/claim/identity.ts` as modified — that is a concurrent lane's change, not mine; untouched. My footprint: `M src/fyd/social/readers.ts`, `M src/fyd/social/attestation-gate.ts`, `?? src/fyd/social/__tests__/`, `?? src/fyd/social/jest.config.cjs`. **COMMITS CREATED: NONE.** Both repos remain readable-only apart from the authorized adapter patch above.

---

## Cross-domain dependencies (for Agent 20)

- **identity agent:** F1/F2/F3 (principal namespaces, handle persistence) — identity internals lane.
- **event agent:** F5/F7/F11/F13 (unsigned spine, sequence absence, journal access, event_id semantics) — event internals lane.
- **capability agent:** F1/F5/F6/F12 (who may mint/author/submit; authz binding) — capability internals lane.
- **projection agent:** F7/F8/F10/F11 (ordering, projector absence, dump-vs-journal skew) — projection internals lane.
- **execution agent:** F4/F9/F12/F13 (envelope acceptance, serializer segments, resilience) — execution internals lane.
