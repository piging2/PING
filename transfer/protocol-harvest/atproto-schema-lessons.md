# ATProto Harvest: Schema-Driven Lessons for PING

Lane C (Protocol Harvest), 2026-09-20. Read-only. Harvested from the AT Protocol
lexicon spec (https://atproto.com/specs/lexicon) and guides.

STANDING: ATProto is HARVEST ONLY. No PDS deployment. No ATProto canonical
identity. No Bluesky posting. Every item below is a lesson mapped to PING's
schema pipeline, not a build plan. The strategic goal this serves:
SCHEMA -> VALIDATOR -> OBJECT -> RELATIONSHIPS -> CAPABILITIES -> RENDERER -> AGENT TOOLS.

A standalone machine-readable sketch lives at
`transfer/protocol-harvest/ping-schema-sketch.json`. The JSON blocks below are
the human-readable companion.

## Lesson 1: Lexicon evolution rules become PING schema law

ATProto's hard schema evolution rules, adopted verbatim for PING schemas:

- New fields must be OPTIONAL.
- Field types can NEVER change.
- Fields can NEVER be removed.
- Unknown fields in data are tolerated; validation is forward-compatible.
- Breaking change needed: mint a new schema version (ping.social.post@2), never mutate @1.

This is the contract that makes codegen safe: generated validators, types, forms,
and agent tools never break when a schema grows.

## Lesson 2: Small typed vocabulary, proven in production

ATProto's core records (app.bsky.actor.profile, app.bsky.feed.post,
app.bsky.feed.like, app.bsky.graph.follow) independently validate the small-object
thesis: typed records with stable NSIDs beat class hierarchies. PING's canonical
vocabulary stays small (OBJECT_CREATED, OBJECT_UPDATED, RELATIONSHIP_CREATED plus
proposal/approval semantics); the schema layer gives each record type its shape.

## Lesson 3: Likes and follows live in the actor's own repo

Only the account owner writes their own repository. A like is the LIKER's signed
record; a follow is the FOLLOWER's signed record. PING mapping: RELATIONSHIP_CREATED
for follows/likes must be signed by the SUBJECT, and governance rejects
relationship claims signed by anyone else.

## Lesson 4: Strong references

ATProto replies carry the exact URI + CID of the parent. PING mapping: reply_to
is the exact PING object ID (plus payload hash), never text inference.

## Lesson 5: DID vs handle is identity vs claim

PING canonical identity is the DID-equivalent. AP actor URIs, Facebook handles,
any future ATProto DID are handle-equivalents: protocol claims on the identity,
verified bidirectionally.

## Lesson 6: Permission sets shape capability grants

ATProto OAuth permission sets (collection-scoped create/update/delete, RPC-scoped
endpoints, human-readable at consent time) are the pattern for PING capability
grants: a grant on one resource never implies another. object.like does NOT imply
a provider-side like.

## Lesson 7: Custom feeds are independent services returning references

ATProto custom feeds are independent services that return ranked lists of record
references; the client resolves them. PING mapping: a feed is a query service over
the canonical journal returning object IDs. There is no canonical feed table.
Feeds are projections with their own ranking logic, rebuildable, replaceable.

## Lesson 8: Privacy reality validates the projection boundary

All PDS data is public today. PING mapping: only PUBLIC canonical objects ever
project to a protocol. PING_ONLY and PRIVATE have no protocol representation.

---

## Machine-readable schema sketch

How one PING schema definition fans out into every artifact in the chain.
The full JSON is in `ping-schema-sketch.json`; the two record sketches follow.

### ping.social.post@1

```json
{
  "nsid": "ping.social.post",
  "version": 1,
  "kind": "record",
  "description": "A short public post authored by a PING identity.",
  "record": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://ping.social/schemas/ping.social.post@1",
    "type": "object",
    "required": ["$type", "author", "text", "createdAt"],
    "properties": {
      "$type": { "const": "ping.social.post@1" },
      "author": { "type": "string", "format": "ping-identity-ref" },
      "text": { "type": "string", "maxLength": 2000 },
      "createdAt": { "type": "string", "format": "date-time" },
      "replyTo": { "type": "string", "format": "ping-object-ref" },
      "visibility": { "type": "string", "enum": ["PUBLIC", "PRIVATE", "PING_ONLY"], "default": "PING_ONLY" },
      "facets": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["kind", "target"],
          "properties": {
            "kind": { "type": "string", "enum": ["mention", "link"] },
            "target": { "type": "string" }
          }
        }
      }
    },
    "additionalProperties": false
  },
  "validation": {
    "unknownFields": "tolerate",
    "evolution": {
      "newFields": "must-be-optional",
      "typeChanges": "forbidden",
      "fieldRemoval": "forbidden",
      "breakingChange": "mint-new-version"
    }
  },
  "derivations": {
    "validator": {
      "from": "record",
      "tool": "ajv (JSON Schema draft 2020-12)",
      "emits": "validatePost(input) -> { ok: true, value } | { ok: false, errors }"
    },
    "typescript": {
      "from": "record",
      "tool": "json-schema-to-typescript",
      "emits": "interface PingSocialPostV1 { $type: 'ping.social.post@1'; author: string; text: string; createdAt: string; replyTo?: string; visibility?: 'PUBLIC' | 'PRIVATE' | 'PING_ONLY'; facets?: Array<{ kind: 'mention' | 'link'; target: string }>; }"
    },
    "objectMapping": {
      "canonicalEvent": "OBJECT_CREATED",
      "objectKind": "post",
      "identityBinding": "author must equal the signing subject (Lesson 3)"
    },
    "relationships": {
      "from": "record.replyTo -> RELATIONSHIP_CREATED predicate=replies_to (Lesson 4: exact object ref)",
      "fromFacets": "mention facets -> RELATIONSHIP_CREATED predicate=mentions"
    },
    "capabilities": {
      "grants": ["post.publish (requires author identity)", "post.delete (author only)"],
      "note": "post.like is a separate grant; publishing never implies liking (Lesson 6)"
    },
    "renderer": {
      "web": { "component": "PostCard", "props": ["text", "author", "createdAt", "replyTo"] },
      "activitypub": { "projectsTo": "Note (see fedify-adapter-design.md section 6)", "gate": "visibility PUBLIC only" }
    },
    "agentTool": {
      "name": "ping.post.create",
      "description": "Create a short post as the calling identity. Text max 2000 chars. replyTo must be an exact PING object ID. Visibility defaults to PING_ONLY; PUBLIC requires explicit user confirmation.",
      "inputSchema": { "$ref": "#/record" },
      "requiresCapability": "post.publish"
    },
    "form": {
      "fields": [
        { "name": "text", "widget": "textarea", "maxLength": 2000, "required": true },
        { "name": "replyTo", "widget": "object-picker", "required": false },
        { "name": "visibility", "widget": "select", "options": ["PING_ONLY", "PRIVATE", "PUBLIC"], "required": false }
      ]
    }
  }
}
```

### ping.business.service@1

```json
{
  "nsid": "ping.business.service",
  "version": 1,
  "kind": "record",
  "description": "A service a home-service business offers (e.g. drain cleaning).",
  "record": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "https://ping.social/schemas/ping.business.service@1",
    "type": "object",
    "required": ["$type", "business", "name", "createdAt"],
    "properties": {
      "$type": { "const": "ping.business.service@1" },
      "business": { "type": "string", "format": "ping-identity-ref" },
      "name": { "type": "string", "maxLength": 120 },
      "description": { "type": "string", "maxLength": 2000 },
      "priceHint": { "type": "string", "maxLength": 120 },
      "serviceArea": { "type": "array", "items": { "type": "string" } },
      "createdAt": { "type": "string", "format": "date-time" }
    },
    "additionalProperties": false
  },
  "validation": {
    "unknownFields": "tolerate",
    "evolution": {
      "newFields": "must-be-optional",
      "typeChanges": "forbidden",
      "fieldRemoval": "forbidden",
      "breakingChange": "mint-new-version"
    }
  },
  "derivations": {
    "validator": { "from": "record", "tool": "ajv", "emits": "validateService(input)" },
    "typescript": {
      "from": "record",
      "tool": "json-schema-to-typescript",
      "emits": "interface PingBusinessServiceV1 { $type: 'ping.business.service@1'; business: string; name: string; description?: string; priceHint?: string; serviceArea?: string[]; createdAt: string; }"
    },
    "objectMapping": { "canonicalEvent": "OBJECT_CREATED", "objectKind": "service" },
    "relationships": { "business -> service": "RELATIONSHIP_CREATED predicate=offers" },
    "capabilities": { "grants": ["service.publish (business identity only)"] },
    "renderer": {
      "web": { "component": "ServiceCard", "props": ["name", "description", "priceHint", "serviceArea"] },
      "activitypub": { "projectsTo": "Service actor (future; federate gate defaults false)" }
    },
    "agentTool": {
      "name": "ping.service.create",
      "description": "Publish a service offering for the calling business identity. Never invent pricing; priceHint only from owner-supplied text.",
      "inputSchema": { "$ref": "#/record" },
      "requiresCapability": "service.publish"
    },
    "form": {
      "fields": [
        { "name": "name", "widget": "text", "maxLength": 120, "required": true },
        { "name": "description", "widget": "textarea", "required": false },
        { "name": "priceHint", "widget": "text", "required": false },
        { "name": "serviceArea", "widget": "tag-list", "required": false }
      ]
    }
  }
}
```

### The chain, stated once

One schema file is the single source. From it derive, in order:
SCHEMA (the JSON above) -> VALIDATOR (ajv, generated) -> OBJECT (canonical OBJECT_CREATED carrying the validated record) -> RELATIONSHIPS (replyTo/facets/business become typed edges) -> CAPABILITIES (publish/like/delete grants scoped per Lesson 6) -> RENDERER (web component, ActivityPub projection, both gated) -> AGENT TOOLS (tool name, description, input schema, required capability, generated from the same record).

No hand-written parallel models. If the schema changes compatibly, regenerate. If it must change incompatibly, mint @2.

---

## What PING should steal

1. Schema-first validation with generated artifacts (validators, TS types, forms, tool descriptions from one source).
2. Lexicon evolution law (optional-only additions, no type changes, no removals, tolerate unknown fields).
3. Small typed record vocabulary with stable namespaced IDs.
4. Subject-signed relationships (likes/follows signed by the liker/follower).
5. Strong references (exact object IDs, never fuzzy).
6. Permission-set shaped capability grants (scoped, human-readable at consent).
7. Custom feeds as independent reference-returning services, never canonical tables.
8. Deterministic encoding discipline before hashing/signing.

## What PING must NOT steal (what-not-to-build list)

1. No PDS infrastructure. No repository hosting, no relay, no PLC directory.
2. No canonical ATProto storage. PING's journal stays the canonical store.
3. No ATProto identity for PING actors (no DIDs minted, no handle resolution chain built).
4. No Bluesky posting or AppView consumption in this program.
5. No atproto OAuth integration until a real ATProto adapter is designed (official SDKs exist for later; do not hand-roll DPoP).
6. No Lexicon publishing for PING schemas (revisit only if a real ATProto adapter is built).
7. No private-record designs borrowed from ATProto's future working group; PING's PUBLIC/PRIVATE/PING_ONLY boundary is its own and is enforced at the projection gate.
8. No floats in canonical encodings; no locale-dependent serialization (shared determinism lesson, already PING law).
