# FYD Social Backend Plan — PING Social Primitives Audit

**Lane:** FYD SOCIAL SPRINT, hour 2-3 discovery (read-only backend audit)
**Auditor:** subagent 1066c092, 2026-09-21 ~12:37-13:00 MDT
**Directive:** FYD consumes PING's EXISTING social operations. Do NOT rebuild them in FYD.
**This document is the implementation lane's build spec.** It describes only what exists in `/home/nolan/ping` (branch `refactor/runtime-authority-convergence`, HEAD `4c098334c`) and the website BFF in `/home/nolan/projects/ping` (branch `fyd/sitespec-generator`). Nothing was written, committed, restarted, or sent during this audit. All verdicts below are read-only code findings; where the live system could not be reached, it is marked explicitly.

**No em dashes are used in this document.**

---

## 0. Executive verdict (read this first)

1. The full social primitive surface EXISTS as governed code in `/home/nolan/ping`: identity minting, profile/post objects, follow/unfollow, like/unlike, reply, relationship reads, projections, and a pure feed projection. Every write goes through exactly one canonical journal (`ping_events` in Postgres) via three registered event types.
2. The intended runtime seam is **HTTP on the PING gateway**: `POST /identities` + `POST /events` (signed BFF envelope), served by `gateway/bootstrap/gateway_runtime.js` -> `gateway/server.js`.
3. **No clean live seam exists today.** The running gateway (`ping-gateway:devin-boundary2`, port 8080) is an OLDER build: `404` on `/identities`, `MISSING_AUTH` (a code string that does not exist anywhere in the repo) on `/events` reads. The RC gateway (`rc-4d522a6b`, port 18099) is degraded (`/health` = 503). Recorded as FL-20260921-001 in `~/workspace/FAILURE_LEDGER.md`.
4. **Implementation lane must boot the gateway from the repo** (see section 6) against a Postgres that has `ping_events` **plus a `sequence` column** (the projector requires it; no DDL in the repo creates it; this is a real gap, see section 7).
5. The website repo already contains the BFF integration layer (`src/lib/ping/ping-object-reader.ts`) that talks to the gateway via `PING_GATEWAY_BASE_URL` and signs envelopes with server-side dev keys (`src/lib/ping/dev-signer.ts`). It is missing a `createPost` method (add one; the gateway path already supports it).

Per-primitive verdicts: identity PROVEN, profile PROVEN, follow/unfollow PROVEN, relationships(read) PROVEN, post PROVEN (BFF method missing -> PARTIAL for end-to-end), like/unlike PROVEN, reply PROVEN (canonical) / PARTIAL (BFF-derived edge uses a different predicate name, see section 1.7), reference PARTIAL (refs field PROVEN, no canonical `references` predicate), feed PROVEN (two implementations, BFF one is public-only).

---

## 1. Primitive map

Every write path below ends in `ping_events` via `UnifiedEventRuntime.emit()` (`ping-runtime/events/unified_event_runtime.js`). Event identity: `event_id = SHA-256 hex of JSON.stringify({eventType, source, [namespace], logical_id|payload})`, `INSERT ... ON CONFLICT (event_id) DO NOTHING` (idempotent). Event sequence for ordering comes from the PostgreSQL `sequence` column (see open question 1).

### 1.1 Identity (create + read) — PROVEN

- **Schema:** `ping.identity@1` (defined in `runtime/constitutional/src/ping-vocabulary.ts:28-34` as a canonical social schema; note `runtime/constitutional/src/schemas/ping-objects.ts` does NOT list it, vocabulary.ts is the authority).
- **Code:** `gateway/routes/identities.js`
  - `POST /identities` (`identities.js:101-198`): body `{displayName|display_name, handle, bio, publicKey|public_key (PEM or SPKI DER hex), algorithm?='ed25519'}`. Validates handle `^[a-z0-9_]{2,24}$`, displayName 1-80 chars, bio <= 280. Mints `identityId = IdentityAuthority.generateId('identity', {display_name, public_key})` where public_key is the normalized SPKI DER hex. **Idempotent:** same (display_name, public_key) returns the existing identity with `created: false`. Emits `OBJECT_CREATED` with `schema: 'ping.identity@1'`, `controller: identityId`, `content: {display_name, public_key}` via `eventRuntime.emit('OBJECT_CREATED', 'api', payload, {metadata: {aggregate_id, aggregate_type: 'ping_identity'}})`.
  - `GET /identities` (`identities.js:72-99`): sanitized list from `ping_events` (`payload->>'object_id' AS identity_id, content->>'display_name', content->>'public_key', payload->>'created_at'`, ordered by acceptance sequence). No private material exists on this path.
- **Identity authority used:** `gateway/constitutional-dist/identity-authority.js` (compiled from `runtime/constitutional/src/identity-authority.ts` at Docker build time; never reimplemented). Format: `identity_<16 hex>`.
- **Mounted:** `gateway/bootstrap/gateway_runtime.js:683` (`this._app.use('/identities', createIdentityRoutes(services.unifiedEventRuntime, services.pool))`).
- **Canonical state after:** one `OBJECT_CREATED` row in `ping_events` with `payload.schema='ping.identity@1'`, `payload.object_id=<identity_id>`, `payload.controller=<identity_id>`, `payload.payload_hash` = SHA-256 of canonicalized payload-minus-proof.
- **Test-identity rule:** this path is the CORRECT place to mint the demo identities. Never use the live Nolan identity referenced in the file header comment (`identity_cc3383c868f96fc1`); that is Nolan's own identity, off-limits without his per-action approval.

### 1.2 Profile (create/update/read) — PROVEN

- **Schema:** `ping.social.profile@1` (`runtime/constitutional/src/schemas/ping-objects.ts:34-42`, content `{display_name, handle?, bio?, public_key?}`).
- **Code:** `gateway/social_ingest_adapter.js:164-236` (`normalizeObjectCreated`), invoked by `normalizeBffEnvelope` (`social_ingest_adapter.js:288-323`) on envelopes `{type:'OBJECT_CREATED', payload:{schema:'ping.social.profile@1', identityId, displayName, handle, bio, visibility?}, proof, metadata}`.
  - Requires: `identityId` (or controller), `displayName` non-empty, `handle` matching `^[a-z0-9_]{2,24}$`, `bio` <= 280 chars (else `INVALID_HANDLE` / `INVALID_BIO` / `MISSING_FIELD`).
  - `object_id` minted by the ONE IdentityAuthority: `generateId('object', {schema, controller: identityId, handle})` (deterministic: same identity + schema + handle = same object id). Format `object_<16 hex>`.
  - Normalized journal payload (`social_ingest_adapter.js:212-235`): `{schema, object_id, controller, created_at, content: {display_name, handle, bio}, refs: [], visibility, status: 'active', metadata, payload_hash, proof: {...proof, signature_construction: 'bff-envelope@1'}}`. `payload_hash` = SHA-256 of canonical bytes of payload minus proof minus hash (`computePayloadHash`, `:84-89`), using `HashAuthority.canonicalizeObject` (Patch 7B construction, NOT the dev signer's canonicalization; the dev construction is labeled `bff-envelope@1` and kept separate).
  - Secret guard: `rejectSecrets` (`:93-114`) throws `SECRET_REJECTED` if any key/value looks like private-key material.
- **Update:** `OBJECT_UPDATED` via `normalizeObjectUpdated` (`social_ingest_adapter.js:258-286`): payload `{objectId (canonical object id OR journal event_id; event_id refs are resolved via `resolveObjectId` `:156-162`), changes: {displayName|authorDisplayName -> display_name, ...}}`. `updated_by` is resolved from the SIGNER's public key (`resolveIdentityByPublicKey` `:140-154`): the signing identity must already exist (`SIGNER_UNKNOWN: ... create it via POST /identities first`). The projector applies updates only when `updated_by == controller`, shallow merge right-wins (`ping-projector.ts:159-241`).
- **HTTP entry:** `POST /events` with the BFF envelope; the envelope branch is in `gateway/routes/events.js:74-110` (payload with `type` + `payload` and no `event_type` routes to `social_ingest_adapter.normalizeBffEnvelope`; `ping.knowledge.*` schemas route to the knowledge adapter instead; the social path is untouched). Client errors return HTTP 400 with machine codes (`INVALID_SIGNATURE`, `INVALID_PROOF`, `MISSING_FIELD`, `INVALID_HANDLE`, `INVALID_BIO`, `PREDICATE_NOT_CANONICAL`, `SECRET_REJECTED`, `SIGNER_UNKNOWN`, `UNSUPPORTED_SCHEMA`, `UNKNOWN_EVENT_TYPE`).
- **Signature:** Ed25519 over dev canonical bytes `bffCanonicalize({type, payload, metadata})` (sorted-key recursive JSON; undefined dropped, NOT nullified — differs from the constitutional `canonicalizeObject`; verified verbatim port from the website's `src/lib/ping/dev-signer.ts` at `social_ingest_adapter.js:53-72`). `proof: {algorithm: 'ed25519', signature (base64), publicKey (PEM)}`.
- **Canonical state after:** one `OBJECT_CREATED` row (or `OBJECT_UPDATED`) in `ping_events`; projection row in `ping_objects` after `PingProjector.rebuildAll()` (see 1.9).
- **Unit proof:** `gateway/test_social_ingest_adapter.js` (runnable with plain `node`, no Postgres for create/relate paths; covers valid profile envelope, deterministic id, tampered-payload rejection, wrong-key rejection, `unfollows`/`unlikes` rejection, revocation via `status: 'inactive'`).
- **BFF end:** `PingObjectReader.createIdentity` (`src/lib/ping/ping-object-reader.ts:491-552`) does the full two-step: generates an Ed25519 dev keypair (`generateDevKeypair`), `POST /identities`, stores the keypair server-side (`storeDevKeypair`, key dir from `PING_DEV_KEY_DIR`, 0600/0700), then submits the signed profile `OBJECT_CREATED` envelope. `getProfile` (`:413-448`) and `listIdentities` (`:394-411`) read back from `GET /identities` + `OBJECT_CREATED` events.

### 1.3 Follow / unfollow — PROVEN

- **Predicate:** `follows` (canonical; `runtime/constitutional/src/ping-vocabulary.ts:22-27`). **There is NO `unfollows` predicate.** `FORBIDDEN_PREDICATES = ['unfollows', 'unlikes']` (`ping-vocabulary.ts:41`); the adapter rejects them with `PREDICATE_NOT_CANONICAL` (`social_ingest_adapter.js:230-235`, unit-tested).
- **Follow:** `RELATIONSHIP_CREATED` envelope `{subject: <A identity id>, predicate: 'follows', object: <B identity id>}` -> `normalizeRelationshipCreated` (`social_ingest_adapter.js:227-254`): `relationship_id = IdentityAuthority.generateId('relationship', {subject, predicate, object})` (deterministic, format `relationship_<16 hex>`), `status: 'active'` default, journal payload `{relationship_id, subject, predicate, object, status, created_at, metadata, payload_hash, proof}`.
- **Unfollow:** second `RELATIONSHIP_CREATED` with the SAME predicate and `status: 'inactive'` (revocation is a status, never a negative predicate). The projector applies last-wins per `(subject, predicate, object)` in acceptance-sequence order (`runtime/constitutional/src/ping-projector.ts:243-272`), so the later `inactive` supersedes the earlier `active`.
- **Vocabulary note (verified live per file comment):** the Patch 7B unlike is exactly this pattern on `likes`.
- **Canonical state after:** `ping_relationships` row `(relationship_id, subject=A, predicate='follows', object=B, status='active'|'inactive')`; the full history stays in `ping_events` (both rows).
- **BFF end:** `PingObjectReader.follow/unfollow` (`src/lib/ping/ping-object-reader.ts:554-573`) and routes `POST /api/practice/follow {targetId}` / `DELETE /api/practice/follow?targetId=` (`src/app/api/practice/follow/route.ts`). Read side: `followEdges()` + `netFollows()` (`ping-object-reader.ts:302-330`) compute net follows from the journal (inactive revokes). A-follows-B is visible from A via `subject=A` edges and from B via `object=B` edges.

### 1.4 Relationships (read) — PROVEN

- **Projection table:** `ping_relationships` (DDL `database/ping_objects.sql:44-80`): `relationship_id PK, subject, predicate, object, created_at, status ('active'|'inactive'), metadata`, plus predicate CHECK constraint reconciled with `runtime/constitutional/src/ping-vocabulary.ts` (comment `ping_objects.sql:78-80`; social predicates: follows, likes, replies_to, approves, denies; knowledge predicates listed in `ping-vocabulary.ts:100-141`).
- **Built by:** `PingProjector.rebuildRelationships` (`runtime/constitutional/src/ping-projector.ts:243-272`): last-wins per `(subject, predicate, object)` by `(sequence DESC NULLS LAST, created_at DESC, event_id DESC)`; `ON CONFLICT (subject, predicate, object) DO NOTHING`.
- **Read queries (journal-first):** `GET /events/RELATIONSHIP_CREATED?limit=N` (gateway route `gateway/routes/events.js:56-65`; returns `{events, stream, count, limit, offset}`; BFF parses `events|items|data` at `ping-object-reader.ts:230-250`). BFF `getRelationships(filter)` (`ping-object-reader.ts:771-831`) also derives `replies` edges from post `replyTo` fields (see 1.7).
- **Canonical state:** `ping_relationships` is disposable projection; truth is `ping_events` rows with `event_type='RELATIONSHIP_CREATED'`.

### 1.5 Post (create/read) — PROVEN at gateway; PARTIAL end-to-end (no BFF method yet)

- **Schema:** `ping.social.post@1` (`runtime/constitutional/src/schemas/ping-objects.ts:27-32`, content `{text}`).
- **Code:** `social_ingest_adapter.js:164, 237-271` (`normalizeObjectCreated`, POST_SCHEMA branch): envelope payload `{schema: 'ping.social.post@1', authorId|identityId|controller, text|body, refs?: string[], visibility?}`.
  - Requires `authorId`, non-empty `text`.
  - `object_id = IdentityAuthority.generateId('object', {schema, controller: authorId, text: text.trim().slice(0, 80)})` (deterministic; first 80 chars of text feed identity).
  - Journal payload: `{schema, object_id, controller: authorId, created_at, content: {text}, refs, visibility, status: 'active', metadata, payload_hash, proof}`; flat BFF-compat fields `authorId`, `text` preserved at payload root for the website reader.
- **Canonical state after:** `OBJECT_CREATED` row; projection row in `ping_objects` (`object_id PK, schema, controller, created_at, content JSONB, refs JSONB, visibility, status`).
- **Missing:** the BFF `PingObjectReader` has NO `createPost` method (only `submitSignedEvent` internally; greps for `createPost|publishPost` come back empty). The practice page only consumes posts (`getFeed`). The implementation lane must add a `createPost(identityId, text, replyTo?)` method that calls `submitSignedEvent(identityId, 'OBJECT_CREATED', {schema: POST_SCHEMA, authorId: identityId, text, replyTo?, visibility: 'public'})`. This is a small additive BFF task; the gateway write path is PROVEN and unit-testable offline via `test_social_ingest_adapter.js` (the profile path; the post path follows identical code).
- **Read:** BFF `getFeed` (`ping-object-reader.ts:449-489`) filters `OBJECT_CREATED` events by `schema == 'ping.social.post@1'`, visibility public, author in {self + followed}, deterministic order newest-first with object-id tiebreak.

### 1.6 Like / unlike — PROVEN

- **Predicate:** `likes` (canonical, revocable; `ping-vocabulary.ts:36-39`).
- **Like:** `RELATIONSHIP_CREATED {subject, predicate: 'likes', object: <object_id>}` (same `normalizeRelationshipCreated`; `relationship_id` deterministic on (subject, 'likes', object)).
- **Unlike:** second `RELATIONSHIP_CREATED` with same predicate, `status: 'inactive'` (verified live as the Patch 7B pattern, `ping-vocabulary.ts` header comment).
- **Counts are projections:** "Follower and like counts stay projections computed from events, never canonical truth" (`src/app/api/practice/like/route.ts` header; BFF `getFeed` computes `likeCount` from net like edges, `ping-object-reader.ts:456-466`).
- **BFF end:** `PingObjectReader.like/unlike` (`ping-object-reader.ts:575-593`); routes `POST /api/practice/like {objectId}` / `DELETE /api/practice/like?objectId=` (`src/app/api/practice/like/route.ts`).

### 1.7 Reply — PROVEN (canonical path); PARTIAL (BFF-derived edge naming)

Two representations exist; the implementation lane must know both:

(a) **Canonical:** `RELATIONSHIP_CREATED {subject: <reply object_id>, predicate: 'replies_to', object: <parent object_id>}`. `replies_to` is in `SOCIAL_PREDICATES` (`ping-vocabulary.ts:22-27`); the adapter accepts it (`social_ingest_adapter.js:227-254`; unit test `test_social_ingest_adapter.js` asserts all five predicates accepted). Vocabulary documents it as **immutable once active** (`ping-vocabulary.ts` header) — there is no revocation semantic modeled for it (it is NOT in `REVOCABLE_PREDICATES`).

(b) **BFF-derived:** a post may carry `replyTo`/`reply_to` in its payload; `PingObjectReader.getRelationships` derives a synthetic edge `{id: 'reply:<id>', subject: <post id>, predicate: 'replies', object: replyTo}` (`ping-object-reader.ts:796-815`). Note the predicate is `'replies'` (not the canonical `'replies_to'`) and this edge is NOT written to the journal — it is recomputed on every read. For FYD, prefer the canonical (a) form; if reading BFF-derived edges, expect `'replies'`.

### 1.8 Reference — PARTIAL

- **PROVEN part:** every object carries `refs: string[]` (`ping-objects.ts:19`; projection column `refs JSONB` in `database/ping_objects.sql:33`). The social ingest adapter preserves `payload.refs` into the journal payload (`social_ingest_adapter.js:251`) and the projector inserts it (`ping-projector.ts:159-200`). A post can therefore reference other objects by id at creation time: `{schema: 'ping.social.post@1', authorId, text, refs: [<object_id>, ...]}`.
- **Missing:** there is NO canonical social `references` predicate (the vocabulary registry `ping-vocabulary.ts:22-27` is the authority; `ping-object-kernel.ts` mentions "references" only in a comment example). Knowledge ingest has `published` and `external_identity` predicates (`ping-vocabulary.ts:104-141`) for cross-entity reference at the knowledge layer. If FYD needs a first-class reference edge in the social surface, the implementation lane must either use `refs` or propose a vocabulary addition (vocabulary changes are constitutional: `ping-vocabulary.ts` header says it is the single source of truth that the TS projector, SQL schema CHECKs, and the BFF must all agree on, enforced by `ping-vocabulary.test.ts`).

### 1.9 Projection tables + projector — PROVEN (with one DDL gap)

- **Tables** (`database/ping_objects.sql`): `ping_objects`, `ping_relationships`, `ping_transitions`. All are disposable projections; canonical truth is `ping_events`.
- **Projector:** `PingProjector` (`runtime/constitutional/src/ping-projector.ts`):
  - `initialize(schemaSql)` (`:104-116`): caller reads `database/ping_objects.sql` from disk; empty schema refused loudly.
  - `rebuildAll()` (`:119-158`): BEGIN; `assertNoNullSequences` (FAIL CLOSED if any consumed event lacks `sequence`); `detectConflicts` (FAIL CLOSED on same `object_id` + different `payload_hash`); TRUNCATE all three tables; rebuild; COMMIT/ROLLBACK.
  - Consumed journal types: `OBJECT_CREATED`, `OBJECT_UPDATED`, `RELATIONSHIP_CREATED` (`:94-95`).
  - Transitions: every consumed event also produces a `ping_transitions` row (`:274-357`): operation `create|update|relate` (asserted against vocabulary), `actor_id` from payload, per-target sequence derived from acceptance order, `previous_transition` chaining, transition id via `IdentityAuthority.generateId('transition', {event_id})`, FAIL CLOSED on missing `payload_hash`.
- **Ordering contract:** `(sequence ASC NULLS LAST, created_at ASC, event_id ASC)`; reverse for last-wins. Relationship last-wins is per `(subject, predicate, object)`.
- **DDL gap (OPEN):** nothing in the repo creates the `sequence` column on `ping_events`. Verified: `unified_event_runtime.js:44-63` CREATE TABLE has no `sequence`; `grep -rn "ADD COLUMN.*sequence|acceptance_sequence"` over the whole repo (minus node_modules/worktrees) returns only the projector's SELECT aliases. The Patch-7B-era live Oracle journal has it (per `CODE-INGESTION-INDEX.md`: 18 proof events recovered from the live Oracle journal with acceptance sequence). The implementation lane must add it (`BIGSERIAL` or equivalent) before running `rebuildAll()`, or every rebuild FAILS CLOSED.

### 1.10 Feed — PROVEN (two implementations; know which one you need)

(a) **Constitutional (pure, visibility-aware):** `PingFeedProjection.deriveFeed(actorId, objects, relationships)` (`runtime/constitutional/src/ping-feed-projection.ts:46-100`).
- Inputs: `PingObject[]` (from `ping_objects` or journal-derived), `PingRelationship[]` (from `ping_relationships`). Output: `FeedEntry[] {object, relationship?, score}`.
- Semantics: includes own objects + objects by followed controllers; visibility enforced: `public` -> everyone, `followers` -> controller + active `follows` toward the controller, `private` -> controller only, anything else (e.g. `PING_ONLY`, a recorded schema gap) FAILS CLOSED to controller-only (`isVisibleTo`, `:105-128`).
- Ordering: `created_at` DESC, then `object_id` DESC as deterministic tiebreak. `rebuildFeed` + `verifyFeedReproducibility` prove determinism.
- Location: TS package `runtime/constitutional/src`; exported via `index.ts`. The gateway's `constitutional-dist/` only ships `identity-authority.js`, `hash-authority.js`, `ping-vocabulary.js` — feed projection is NOT compiled into the gateway dist. FYD can import it from the website repo's TS build or replicate the 130-line pure function; either way, do not fork the semantics.

(b) **BFF (journal-based, public-only):** `PingObjectReader.getFeed(identityId, viewerId)` (`src/lib/ping/ping-object-reader.ts:449-489`): queries `OBJECT_CREATED` + `RELATIONSHIP_CREATED` events, keeps `public` posts by self or followed identities, computes like counts from net edges. Simpler and already wired to `/api/practice/feed` (`src/app/api/practice/feed/route.ts`).

---

## 2. Invocation catalog (exact calls)

### 2.1 HTTP against the repo-booted gateway (intended production path)

Base: `$PING_GATEWAY_BASE_URL` (the BFF never hardcodes a host; `ping-object-reader.ts` header contract). Repo gateway listens on `PORT` env (default 8080; `gateway/server.js:13-16` -> `gateway/bootstrap/gateway_runtime.js:820`).

| Action | Method | Path | Body | Auth |
|---|---|---|---|---|
| Create identity | POST | `/identities` | `{displayName, handle, bio, publicKey (PEM), algorithm: "ed25519"}` | none in repo build |
| List identities | GET | `/identities` | - | none |
| Submit social envelope | POST | `/events` | `{type, payload, proof, metadata}` (see 2.3) | none |
| Read events by type | GET | `/events/RELATIONSHIP_CREATED?limit=100` (also `/events/OBJECT_CREATED`, `/events/recent`, `/events/stats`) | - | none |

Response shapes: `POST /identities` -> `{identityId, displayName, handle, bio, created: true|false, eventId}`. `POST /events` (envelope) -> `{event_id, id, event_type, aggregate_id, aggregate_type, status: 'ok'}` (400 with `{error: CODE, message}` on client errors).

### 2.2 Direct Node against the adapter (offline / proof path, no Postgres needed for create+relate)

On the Pig (Node available; never on this machine for Pig-side paths):

```bash
cd /home/nolan/ping
node -e "
const a = require('./gateway/social_ingest_adapter.js');
// build env via the website's canonicalization + a throwaway Ed25519 keypair,
// then: a.normalizeBffEnvelope(env, null) -> {eventType, aggregateId, aggregateType, eventData}
"
```

`normalizeBffEnvelope(body, pool)` needs `pool` only for `OBJECT_UPDATED` (identity resolution) and event-id-as-handle resolution; pass `null` for pure create/relate normalization (same as the unit tests: `gateway/test_social_ingest_adapter.js`, run with `node gateway/test_social_ingest_adapter.js`). To persist, hand `eventData` to `eventRuntime.emit(eventType, 'api', eventData, {metadata: {aggregate_id, aggregate_type}})` exactly as `gateway/routes/events.js:101-105` does.

### 2.3 The signed envelope (exact construction)

```jsonc
{
  "type": "OBJECT_CREATED" | "OBJECT_UPDATED" | "RELATIONSHIP_CREATED",
  "payload": { /* see per-primitive payloads in section 1 */ },
  "proof": {
    "algorithm": "ed25519",
    "signature": "<base64 Ed25519 over bffCanonicalize({type, payload, metadata})>",
    "publicKey": "<PEM SPKI public key of the signing identity>"
  },
  "metadata": { "source": "ping-website-practice", "patch": "7B", "producedAt": "<ISO>" }
}
```

Canonical bytes for the signature: sorted-key recursive JSON of `{type, payload, metadata}` (undefined dropped, NOT nullified). The website's verbatim implementation is `canonicalizeJson` in `src/lib/ping/dev-signer.ts:49-63`; the gateway's verification port is `bffCanonicalize` (`social_ingest_adapter.js:60-72`). The private key never leaves the server (`src/lib/ping/dev-signer.ts` header; keys in `$PING_DEV_KEY_DIR/<identityId>/private.pem`, 0600).

### 2.4 BFF (Next.js route handlers the implementation lane can reuse/extend)

- `POST /api/practice/identities {displayName, handle, bio}` -> `{identity}` (also sets the practice session cookie) — `src/app/api/practice/identities/route.ts`.
- `POST /api/practice/follow {targetId}` -> `{relationshipId}`; `DELETE /api/practice/follow?targetId=` — `src/app/api/practice/follow/route.ts` -> `PingObjectReader.follow/unfollow`.
- `POST /api/practice/like {objectId}` -> `{ok: true}`; `DELETE /api/practice/like?objectId=` — `src/app/api/practice/like/route.ts` -> `PingObjectReader.like/unlike`.
- `GET /api/practice/feed?identityId=` -> `{posts: PingPost[]}` — `src/app/api/practice/feed/route.ts`.
- Session identity selection is an httpOnly cookie (`ping_practice_identity`, `src/lib/ping/session.ts`).

---

## 3. A-follows-B recipe (dev identities only)

**Identities:** two fresh dev identities minted through `POST /identities` (the Alice/Bob pattern; the practice flow calls them test identities). Suggested display names/handles: `Alice Dev` / `alice_dev`, `Bob Dev` / `bob_dev`. NEVER use Nolan's identity (`identity_cc3383c868f96fc1`) or any real person's key.

Prerequisites: repo-booted gateway reachable (section 6); `$PING_DEV_KEY_DIR` set (outside the git tree); `$PING_GATEWAY_BASE_URL` set.

### Step 1 — Mint A and B (exact)

```bash
GW="${PING_GATEWAY_BASE_URL:?set me}"

# A (keypair generated client-side here only for the recipe; in the BFF the
# website generates it server-side via dev-signer.ts)
node -e "
const {generateKeyPairSync} = require('crypto');
const {privateKey, publicKey} = generateKeyPairSync('ed25519');
require('fs').writeFileSync('/tmp/alice_priv.pem', privateKey.export({format:'pem',type:'pkcs8'}));
require('fs').writeFileSync('/tmp/alice_pub.pem', publicKey.export({format:'pem',type:'spki'}));
"
ALICE_PUB=$(cat /tmp/alice_pub.pem)
curl -s -X POST "$GW/identities" -H 'Content-Type: application/json' \
  -d "$(node -e "console.log(JSON.stringify({displayName:'Alice Dev', handle:'alice_dev', bio:'dev identity A', publicKey: require('fs').readFileSync('/tmp/alice_pub.pem','utf8'), algorithm:'ed25519'}))") \
  | tee /tmp/alice_identity.json
# Expected: {"identityId":"identity_<16hex>","displayName":"Alice Dev","handle":"alice_dev","bio":"dev identity A","created":true,"eventId":"<64hex>"}

# B, same shape with handle bob_dev -> /tmp/bob_identity.json
```

Extract: `ALICE_ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/alice_identity.json','utf8')).identityId)")`, same for Bob.

### Step 2 — Create profiles (signed envelopes via the BFF, recommended)

Use the BFF rather than hand-rolled curl (it owns signing + key custody):

```bash
SITE="http://localhost:3000"  # the Next.js dev server
curl -s -X POST "$SITE/api/practice/identities" -H 'Content-Type: application/json' \
  -d '{"displayName":"Alice Dev","handle":"alice_dev","bio":"dev identity A"}' | tee /tmp/alice_bff.json
# Expected 201: {"identity":{"id":"identity_<16hex>",...}} and sets the session cookie.
```

This performs `POST /identities` then the signed `OBJECT_CREATED` profile envelope (`ping-object-reader.ts:491-552`). Repeat for Bob. Keep both session cookies (one per identity) or drive the reader directly.

### Step 3 — A follows B (exact)

```bash
# As Alice's session:
curl -s -X POST "$SITE/api/practice/follow" -H 'Content-Type: application/json' \
  --cookie "$(cat /tmp/alice_cookie)" \
  -d "{\"targetId\":\"$BOB_ID\"}" | tee /tmp/follow.json
# Expected 201: {"relationshipId":"relationship_<16hex>"}
```

Deterministic check: `relationshipId` must equal `IdentityAuthority.generateId('relationship', {subject: ALICE_ID, predicate: 'follows', object: BOB_ID})` (format `relationship_[0-9a-f]{16}`); re-posting the same follow yields the same id (idempotent at the identity layer; the journal dedups identical event_ids).

### Step 4 — Verify it persisted (exact queries)

Journal (canonical truth). Against the gateway:

```bash
curl -s "$GW/events/RELATIONSHIP_CREATED?limit=100" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const evs=(JSON.parse(d).events||[]);
  const hits=evs.filter(e=>{const p=e.payload||{};return p.subject==='$ALICE_ID'&&p.predicate==='follows'&&p.object==='$BOB_ID';});
  console.log('matches:',hits.length,'status:',hits.map(h=>h.payload.status).join(','));
});"
# Expected: matches: 1 status: active
```

Or directly against Postgres (implementation lane, authorized read path):

```sql
SELECT event_id, payload->>'relationship_id' AS rel_id,
       payload->>'status' AS status, sequence, created_at
FROM ping_events
WHERE event_type='RELATIONSHIP_CREATED'
  AND payload->>'subject'='<ALICE_ID>'
  AND payload->>'predicate'='follows'
  AND payload->>'object'='<BOB_ID>'
ORDER BY sequence ASC NULLS LAST;
-- Expected: 1 row, status 'active'
```

Projection (materialized state). After running `PingProjector.rebuildAll()`:

```sql
SELECT relationship_id, subject, predicate, object, status
FROM ping_relationships
WHERE subject='<ALICE_ID>' AND predicate='follows' AND object='<BOB_ID>';
-- Expected: 1 row, status 'active'
```

### Step 5 — Visibility from each side

- From A's side (following): `subject=A` -> B present (`netFollows` in `ping-object-reader.ts:317-330`; or journal query `subject='<ALICE_ID>' AND predicate='follows' AND status='active'`).
- From B's side (followers): `object=B` -> A present (query `object='<BOB_ID>' AND predicate='follows' AND payload->>'status'='active'`).
- Feed effect: after B posts, `GET /api/practice/feed?identityId=<ALICE_ID>` includes B's public posts (BFF `getFeed` visibility set = self + followed, `ping-object-reader.ts:455`).

### Step 6 — Unfollow (revocation proof)

```bash
curl -s -X DELETE "$SITE/api/practice/follow?targetId=$BOB_ID" --cookie "$(cat /tmp/alice_cookie)"
# Expected: {"ok":true}
```

Re-run the Step-4 journal query: expect 2 rows (`active`, then `inactive`, ordered by sequence). Re-run the projection query after `rebuildAll()`: expect 1 row with `status='inactive'` (last-wins). This is the canonical revocation pattern; there is no `unfollows` event type anywhere.

---

## 4. Primitive -> code path table (citations)

| Primitive | Verdict | Write path (file:line) | Store | Read path (file:line) |
|---|---|---|---|---|
| identity create | PROVEN | `gateway/routes/identities.js:101-198` via `eventRuntime.emit` | `ping_events` (`OBJECT_CREATED`, schema `ping.identity@1`) | `GET /identities`, `gateway/routes/identities.js:72-99` |
| identity id | PROVEN | `gateway/constitutional-dist/identity-authority.js` (compiled from `runtime/constitutional/src/identity-authority.ts`) | n/a | format `identity_<16hex>` |
| profile create/update | PROVEN | `POST /events` envelope -> `gateway/social_ingest_adapter.js:288` -> `normalizeObjectCreated` `:164-236` / `normalizeObjectUpdated` `:258-286` | `ping_events` (`OBJECT_CREATED`/`OBJECT_UPDATED`, `ping.social.profile@1`) | BFF `getProfile` `src/lib/ping/ping-object-reader.ts:413-448` |
| post create | PROVEN (gateway); BFF method missing | envelope -> `social_ingest_adapter.js:237-271` (POST_SCHEMA branch) | `ping_events` (`OBJECT_CREATED`, `ping.social.post@1`), `ping_objects` projection | BFF `getFeed` `ping-object-reader.ts:449-489` |
| follow | PROVEN | envelope -> `social_ingest_adapter.js:227-254`, predicate `follows` (`runtime/constitutional/src/ping-vocabulary.ts:22-27`) | `ping_events` (`RELATIONSHIP_CREATED`), `ping_relationships` last-wins | `ping-object-reader.ts:302-330` (`followEdges`/`netFollows`) |
| unfollow | PROVEN | same, `status: 'inactive'` on same predicate (no `unfollows`; forbidden at `ping-vocabulary.ts:41`, rejected at `social_ingest_adapter.js:230-235`) | same | same; projector `ping-projector.ts:243-272` |
| like / unlike | PROVEN | same adapter, predicate `likes` (`ping-vocabulary.ts:36-39`) | same | BFF `likeEdges`/`netLikes` `ping-object-reader.ts:332-359`; counts are projections (`src/app/api/practice/like/route.ts` header) |
| reply | PROVEN (canonical) | envelope -> adapter, predicate `replies_to` (`ping-vocabulary.ts:22-27`; immutable once active) | `ping_events` / `ping_relationships` | canonical: `getRelationships` filter `predicate=replies_to`; BFF-derived `replies` edge `ping-object-reader.ts:796-815` (not canonical, different name) |
| reference | PARTIAL | `refs: string[]` on objects (`runtime/constitutional/src/schemas/ping-objects.ts:19`; preserved at `social_ingest_adapter.js:251`; projected at `ping-projector.ts:159-200`) | `ping_objects.refs` | no canonical `references` predicate in `ping-vocabulary.ts` |
| relationships (read) | PROVEN | projector `runtime/constitutional/src/ping-projector.ts:243-272` | `ping_relationships` (`database/ping_objects.sql:44-80`) | `GET /events/RELATIONSHIP_CREATED`; `ping-object-reader.ts:771-831` |
| feed | PROVEN | pure derivation, no write | `PingFeedProjection.deriveFeed` (`runtime/constitutional/src/ping-feed-projection.ts:46-100`) | same; BFF variant `ping-object-reader.ts:449-489` (public-only) |
| transitions (audit) | PROVEN | projector `ping-projector.ts:274-357` | `ping_transitions` | n/a (lineage/audit) |

---

## 5. What FYD must NOT rebuild

- Identity minting (IdentityAuthority owns it; gateway `POST /identities`).
- Event identity/hash/sequence (UnifiedEventRuntime + Patch 7B payload_hash; the projector's ordering contract).
- The vocabulary (`runtime/constitutional/src/ping-vocabulary.ts` is the single source of truth; the SQL CHECKs and the BFF must agree with it, enforced by `ping-vocabulary.test.ts`).
- Projection rebuild semantics (PingProjector: fail-closed on null sequence, conflict detection, last-wins).
- Revocation semantics (status `inactive` on the same predicate; `unfollows`/`unlikes` do not exist and are rejected).
- Feed visibility rules (`PingFeedProjection.isVisibleTo`; unknown visibility fails closed).

FYD's side owns: UI, BFF route handlers, feed RANKING on top of the constitutional feed (see `src/lib/ping/feed-rank.ts` for the existing discovery ranking), and any new `createPost`-style BFF methods that submit through the governed envelope path.

---

## 6. Next.js integration seam recommendation

**Recommended seam: HTTP to the repo-booted gateway. PROVEN in code, NOT yet live. The implementation lane's first job is to make it live.**

Concrete steps for the implementation lane:

1. Boot the gateway from `/home/nolan/ping`:
   - Entry: `gateway/server.js` (PORT env, default 8080) -> `gateway/bootstrap/gateway_runtime.js` (mounts `/events` at `:682`, `/identities` at `:683`).
   - Postgres: point at a database with `ping_events` (schema per `ping-runtime/events/unified_event_runtime.js:44-63`) **plus the `sequence` column** (open question 1). Also create projection tables via `database/ping_objects.sql` if FYD reads projections.
   - Note: the gateway needs its `constitutional-dist` build (`identity-authority.js`, `hash-authority.js`, `ping-vocabulary.js` compiled from `runtime/constitutional/src` at Docker build time; check the Dockerfile for the compile step). There is also a top-level `compose.yaml` with postgres/qdrant services; the social slice needs only postgres.
2. Set `PING_GATEWAY_BASE_URL` for the website (`src/lib/ping/ping-object-reader.ts` reads it; no host is hardcoded) and `PING_DEV_KEY_DIR` (outside the git tree) for dev key custody.
3. Use the existing BFF surface: `/api/practice/identities`, `/api/practice/follow`, `/api/practice/like`, `/api/practice/feed`, `/api/practice/session`. Add `createPost` to `PingObjectReader` (small; mirrors `follow`): `submitSignedEvent(identityId, 'OBJECT_CREATED', {schema: 'ping.social.post@1', authorId: identityId, text, refs?, replyTo?, visibility: 'public'})`.
4. For reads that need full fidelity (visibility-aware feed), either compile and use `PingFeedProjection.deriveFeed` from `runtime/constitutional/src` in the website build, or reuse the BFF `getFeed` (public-only, simpler). Do not reimplement visibility semantics in FYD.

**Fallback seam (if booting the gateway stalls):** go straight to the journal. Reads are plain SQL against `ping_events` (queries in section 3, step 4). Writes MUST still go through `eventRuntime.emit` semantics (content-hash `event_id`, `payload_hash` per Patch 7B) — the safest offline path is `social_ingest_adapter.normalizeBffEnvelope` + a small Node driver that calls the same `emit` used by `gateway/routes/events.js:101-105`. This fallback is PROPOSED (not proven against a live DB in this audit), but every component of it is proven code.

**Not recommended:** a PING-side projection dump (cron-built JSON). It would freeze the vocabulary and ordering contract into a second source of truth and drift from `ping_events`. The HTTP seam is strictly smaller and keeps one canonical path.

---

## 7. Open questions

1. **`sequence` column provenance.** `PingProjector` requires `ping_events.sequence NOT NULL` for all consumed events, but no DDL in the repo creates it (verified by full-repo grep). The Patch-7B-era live Oracle journal has it. Who owns creating it, and what populates it on new emits (`BIGSERIAL` default vs assigned in `emit()`)? The implementation lane must answer before any `rebuildAll()`. Mark: UNVERIFIED.
2. **Which Postgres is the demo target?** `ping-postgres` (crx_user, 44h up) backs the old 8080 gateway; `ping-rc-postgres` (39h) and `ping-test-pg` (17h) also run. The rc/test DBs may already carry `sequence` and social test data. Mark: UNVERIFIED (this lane had no read credential and did not touch the DBs).
3. **Envelope `proof.publicKey` vs identity binding.** The adapter verifies the signature against the PEM in the envelope and resolves `updated_by` from the SPKI DER hex, but for create/relate it does not check that the signing key equals the subject identity's bound key. Fine for the dev practice flow; the implementation lane should confirm whether a stricter binding is wanted before any non-dev use.
4. **`createPost` BFF method missing.** Gateway path proven; no caller exists. Small additive task (section 6, step 3).
5. **Reply representation.** Two forms exist (canonical `replies_to` relationship vs BFF-derived `replyTo` field edge named `replies`). Pick the canonical form for writes; document the derived form as read-only. The implementation lane should decide whether to also emit the canonical `replies_to` when `replyTo` is present at post creation.
6. **`references` predicate.** Not in the canonical vocabulary. If FYD needs first-class reference edges, it is a constitutional vocabulary change (all three consumers must agree; `ping-vocabulary.test.ts` enforces). Otherwise use `refs`.
7. **Feed HTTP route.** No `/feed` on the gateway; feed is computed (TS pure function or BFF). FYD should compute it client-side-of-PING, not ask PING for a new route.

---

## 8. Evidence pointers (do not re-derive)

- `~/workspace/goals/ping-agent-execution-stack/files/OPERATING_SPEC.md` — nine authority records, PROVEN/FALSIFIED verdicts, exact paths (event/mission/worker/evidence/witness/replay/lineage/capability authorities; constitutional TS authorities excluded from the distribution slice as IIdentityAuthority DORMANT).
- `~/workspace/fyd-lane/harvest-wave1/code-evidence/` + `CODE-INGESTION-INDEX.md` — 16 ingested PING source files with md5s; C1/C3/C4/C6/C2/C5/C10 code-level verifications (Patch 7B payload_hash construction, witness failure-honesty gate, BaseWorker confidence propagation, identity-era answers).
- `~/workspace/FAILURE_LEDGER.md` FL-20260921-001 — live-seam access failures from this audit.
- `gateway/test_social_ingest_adapter.js` — runnable offline unit proof of the envelope path (`node gateway/test_social_ingest_adapter.js` on the Pig).
- `gateway/test_knowledge_ingest_adapter.js` + `gateway/knowledge_ingest_adapter.js` — the parallel knowledge-object ingest (Lane B, additive; social path untouched). Relevant if FYD needs business/location/service objects later.

---

*End of plan. Read-only maintained throughout: no file in `/home/nolan/ping` or `/home/nolan/projects/ping` was modified, no process restarted, no network write sent, no identity minted, no credential touched.*
