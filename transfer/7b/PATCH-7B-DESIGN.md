# Patch 7B Design: PING Profile/Circle on the Canonical Journal

Status: DESIGN ONLY. No live repo mutation. Awaits Nolan's grill answers (2026-09-20).

## Objective

Reconcile the Profile/Circle sprint with the constitutional journal. Profiles, posts, and follows become canonical `ping_events` rows using REGISTERED event types. Projections rebuild deterministically from the journal. Alice and Bob become real persistent cryptographic identities.

## Authority decisions (locked)

1. Event types: `OBJECT_CREATED` and `RELATIONSHIP_CREATED` only. Devin's `ping.create` / `ping.relate` fixtures are unregistered and would be rejected by governance. No new event types, no parallel event authority.
2. Identity: object IDs and relationship IDs are produced by `IdentityAuthority` (deterministic, content addressed, namespaced). No SQL `md5()` fallbacks anywhere.
3. Hashing: payload hashes are produced by `HashAuthority.hashCanonical`, the single canonical serializer for the TypeScript subsystem. No ad hoc `JSON.stringify` comparison, no hand-rolled identity hashing.
4. Ordering: PostgreSQL acceptance sequence is the authoritative event order (standing law). Per-object sequence in the transitions projection is derived with `row_number()` over acceptance order.
5. Signing: `PingIdentity` Ed25519. Signed data is the canonical byte form of the payload body (before proof is attached). Public key lives in the profile object content. Private key custody is grill question 1.

## Corrections required before build

A. `PingProjector` reads legacy `events`, not `ping_events`. Rewrite to read `ping_events`.
B. `PingProjector` consumes unregistered `ping.create`/`ping.relate`. Rewrite to consume `OBJECT_CREATED` / `RELATIONSHIP_CREATED`.
C. `readSchemaSql()` returns empty string. Must read `database/ping_objects.sql` from disk and throw if missing.
D. Header comments claim `events` is canonical. Correct to `ping_events`.
E. `IdentityAuthority.generateId` pre-serializes nested context with `JSON.stringify` (key order not canonical). Fix to route through `HashAuthority.canonicalizeObject`. SAFE: the live Oracle journal contains ZERO `OBJECT_CREATED` events, so no persisted IDs depend on the old behavior. Projections are rebuildable.
F. Feed ordering has no deterministic tie-break and no visibility filter. Sort `(created_at DESC, object_id DESC)`. Filter: own objects (any visibility), followed actors' `public` and `followers` objects. `private` is controller-only.
G. `PING_ONLY` maps to the schema's `followers` visibility value (grill question 5).

## Event payload contracts

### OBJECT_CREATED (profile)

```json
{
  "ping_kind": "profile",
  "object_id": "<IdentityAuthority: namespace 'ping.object', context {schema, controller, canonical content}>",
  "schema": "ping.social.profile@1",
  "controller": "<actor id, e.g. the identity id>",
  "content": { "display_name": "Alice", "bio": "...", "public_key": "<ed25519 spki der hex>" },
  "refs": [],
  "visibility": "public",
  "status": "active",
  "payload_hash": "<HashAuthority.hashCanonical of the body above>",
  "proof": { "verification_method": "ed25519", "signature": "<hex over canonical body bytes>" },
  "metadata": { "patch": "7B" }
}
```

### OBJECT_CREATED (post)

Same shape with `ping_kind: "post"`, `schema: "ping.social.post@1"`, content `{ "text": "Hello PING." }`, refs for replies (`refs: ["<P1 object_id>"]` plus a `replies_to` relationship event).

### RELATIONSHIP_CREATED (follows)

```json
{
  "ping_kind": "relationship",
  "relationship_id": "<IdentityAuthority: namespace 'ping.relationship', context {subject, predicate, object}>",
  "subject": "<bob actor id>",
  "predicate": "follows",
  "object": "<alice actor id>",
  "payload_hash": "<hash of body>",
  "proof": { "verification_method": "ed25519", "signature": "<bob's signature>" },
  "metadata": { "patch": "7B" }
}
```

Field contract: build body, canonicalize, hash to `payload_hash`, sign canonical bytes, attach `proof`. The signature covers the body including `payload_hash`. `proof` is never part of the signed bytes.

## Projector rewrite spec

- `rebuildObjects`: `FROM ping_events WHERE event_type = 'OBJECT_CREATED'`, extract object fields from `payload`. `ON CONFLICT (object_id) DO NOTHING`.
- `rebuildRelationships`: `FROM ping_events WHERE event_type = 'RELATIONSHIP_CREATED'`, `ON CONFLICT (subject, predicate, object) DO NOTHING`.
- `rebuildTransitions`: derive from the same two event types. `create` for OBJECT_CREATED, `relate` for RELATIONSHIP_CREATED. `transition_id` via IdentityAuthority over the canonical event identity. `sequence` = `row_number() OVER (PARTITION BY object_id ORDER BY ping_events.id)`. `previous_transition` chained per object. `payload_hash` read from payload; FAIL CLOSED (raise) if missing. Never synthesize identity or hashes with SQL.
- `PingTransitionMapper`: add `toObjectCreatedEvent(object, actor)` and `toRelationshipCreatedEvent(rel, actor)` producing the payloads above. Legacy `ping.*` methods marked deprecated, not deleted (preserve mechanism law).
- `PingFeedProjection.deriveFeed`: add actorId-scoped visibility filter and deterministic tie-break per F above.

## Fail-before tests (write first, watch fail, then build)

1. Collision: two OBJECT_CREATED payloads with same derived object_id but different content semantics are rejected (zero fanout: no projection row, no mission trigger).
2. Duplicate: exact duplicate event submission does not create a second projection row and does not double-fanout.
3. Nested canonical equivalence: same logical object with different key order produces the same object_id.
4. Nested semantic difference: same object with one nested value changed produces a different object_id.
5. Rebuild: destroy projections, rebuild, feeds and relationships identical (count and order).

## What 7B does NOT do

- No new gateway route. Reads go through existing `GET /events/OBJECT_CREATED` (grill question 4).
- No public gateway exposure. Website reads via SSH tunnel only (grill question 2).
- No production key custody design. Dev keys on the Pig only (grill question 1).
- No website `/circle` page. That is a separate step after the native profile works.
- The two production `AI_RESPONSE_ACCEPTED` events are never touched.
