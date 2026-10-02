# Fedify ActivityPub Projection Adapter: Design

Lane C (Protocol Harvest), 2026-09-20. Read-only design. No repo code written by this lane.

Builds on: `transfer/harvest/fedify-decision.md` (ADOPT as wire layer), `transfer/harvest/activitypub-semantics.md` (follow/like lifecycles), `transfer/harvest/ping-archaeology.md` (repurpose ping_relationships, OAuth framework).

## 0. Standing law

Fedify is the federation WIRE LAYER. It owns: ActivityStreams serialization, WebFinger serving, HTTP signatures (legacy draft + RFC 9421), Object Integrity Proofs, inbound signature verification, outbound delivery with retry, NodeInfo, and the CLI/test tooling.

Fedify NEVER becomes canonical persistence. Canonical truth stays in PING: ping_events (journal), IdentityAuthority (identity), ping_relationships (projected social graph, rebuildable). The adapter reads PING projections and emits PING provider observations. It never writes canonical state. If Fedify's KvStore is lost, PING loses cached remote documents and delivery queue contents, nothing canonical.

Direction of truth, always:

```
PING canonical event graph
  -> ActivityPubProjectionAdapter (Lane B code; publicity gate; key separation)
    -> Fedify Federation instance (dispatchers read projections; listeners emit observations)
      -> Fediverse (Mastodon, etc.)
```

Inbound direction:

```
Fediverse
  -> Fedify inbox (signature verified by Fedify, mandatory)
    -> Adapter listeners (translate to PING provider observations, OBSERVATION_CREATED)
      -> PING event pipeline (claims, never direct canonical writes)
        -> (if accepted) canonical RELATIONSHIP_CREATED
          -> projection flips followers/following
            -> adapter sends Accept(Follow) back out
```

## 1. Architecture

```
+------------------+      reads (PUBLIC only)       +---------------------------+
| PING canonical   |  --------------------------->  | ActivityPubProjection     |
| journal          |                               | Adapter                   |
| (ping_events)    |  emits observations           |  - publicity gate         |
+------------------+  <---------------------------  |  - identity claim bind  |
         ^                                          |  - transport keys only  |
         |            +---------------------------+  +---------------------------+
         |            | Fedify Federation         |               |
         |            | instance                  |               v
         |            |  - actor dispatcher       |      +----------------+
         +------------+  - webfinger (built-in)   |      | Fediverse      |
         canonical     |  - inbox listeners       +----> | remote servers |
         pipeline      |  - key pairs dispatcher  |      +----------------+
                       |  - nodeinfo              |
                       +---------------------------+
                                ^
                                | middleware.ts (flag-aware)
                       +---------------------------+
                       | Next.js website           |
                       | (ping-site repo)          |
                       +---------------------------+
```

The adapter is a PROJECTION. It has no tables of its own except Fedify's operational KvStore (remote actor cache, key lookups) and MessageQueue (delivery), both explicitly non-canonical.

## 2. Actor projection

### 2.1 Which PING identities project

| PING identity | AP actor type | Handle | Status |
|---|---|---|---|
| alice (dev identity) | Person | acct:alice@FEDIFY_ORIGIN | Projectable in dev |
| bob (dev identity) | Person | acct:bob@FEDIFY_ORIGIN | Projectable in dev |
| nolan (PING canonical identity) | Person | acct:nolan@FEDIFY_ORIGIN | Projectable ONLY when a PING profile exists with visibility=PUBLIC and federate=true. Never hardcoded. Never from fixtures. |
| future business nodes (ping.business.profile@1) | Service | acct:{slug}@FEDIFY_ORIGIN | Future. Gate defaults OFF (federate=false). |

The AP actor is a projection of the PING identity, never the identity. The adapter binds the actor URI to the PING identity as a claim: provider=activitypub, external actor URI, key fingerprints. That binding is provenance, not identity. It mirrors the ATProto DID/handle split: PING identity is the DID-equivalent (permanent, key-bound); the AP actor URI is the handle-equivalent (protocol claim, verified bidirectionally where the protocol supports it).

### 2.2 Projection rules (enforced in adapter.isProjectable)

1. visibility must be PUBLIC. PRIVATE and PING_ONLY never project. No exceptions.
2. federate flag must be true. Default false for every identity, including Nolan.
3. status must be active. Revoked identities project as Tombstone (Fedify returns 410 Gone for actor and WebFinger), never as a live actor.
4. The actor document contains ONLY public profile fields: preferredUsername, name, summary, icon (avatar URL), url (profile page). No email, no phone, no internal IDs. The PING identity ID never appears in the AP document.

### 2.3 Followers/following/liked collections

Fedify derives inbox/outbox/followers/following/liked URIs from the actor dispatcher. The collection contents come from the existing ping_relationships projection table (repurposed per ping-archaeology.md, predicates follows/likes, status active/inactive). No new social edge tables. Unfollow/unlike = status inactive, never row deletion, matching the ActivityPub Undo lesson.

## 3. WebFinger

Fedify serves WebFinger automatically at /.well-known/webfinger through Federation.fetch(). Do not hand-implement WebFinger. The drop-in patch adds:

- An explicit Next.js route (app/.well-known/webfinger/route.ts) that delegates to federation.fetch(). Rationale: a stable, flag-aware integration point for verification (fedify webfinger CLI) that behaves identically to the middleware path because both call the same Federation instance.
- setWebFingerLinksDispatcher for extra links (Mastodon remote-follow subscribe template) only.

Actor dispatcher registration enables WebFinger for that actor. Tombstone actors yield 410 Gone on WebFinger, matching the actor endpoint.

## 4. Inbox/outbox boundary semantics

### 4.1 The core rule

Follow is a REQUEST with a lifecycle (pending -> accepted/rejected -> undone), not a boolean edge. Projection state changes ONLY after the canonical pipeline accepts.

Inbound Follow sequence:

```
Remote server                      Our site                      PING pipeline
    |                                  |                               |
    |--- POST /users/x/inbox ---------> |                               |
    |    (Follow, signed)              |                               |
    |                                  |-- Fedify verifies signature --|
    |                                  |   (mandatory; malformed keys  |
    |                                  |    fail cleanly, not 500)     |
    |                                  |                               |
    |                                  |-- adapter: emit observation ->|
    |                                  |   OBSERVATION_CREATED         |
    |                                  |   provider=activitypub        |
    |                                  |   kind=follow.received        |
    |                                  |                               |
    |                                  |                       pipeline decides
    |                                  |                       (claims, policy)
    |                                  |                               |
    |                                  |<-- canonical -----------------|
    |                                  |    RELATIONSHIP_CREATED       |
    |                                  |    follows/active             |
    |                                  |                               |
    |                                  |-- projection: followers       |
    |                                  |   collection now includes     |
    |                                  |   remote actor                |
    |                                  |                               |
    |<-- Accept(Follow) --------------- |                               |
```

Default inbound policy: NO auto-accept. The observation enters the pipeline; a human or policy decision produces the canonical relationship; only then does the Accept go out. Dev override PING_AUTO_ACCEPT_FOLLOWS=1 exists for testing and is refused a production role (documented in the patch).

Reject path: if the pipeline rejects, the adapter sends Reject(Follow). The remote follower never appears in the followers collection.

Undo(Follow) inbound: observation kind=follow.revoked; canonical relationship flips to inactive; no row deletion.

### 4.2 Outbound sequence

```
Canonical event                Projection worker (Lane B)        Adapter/Fedify
     |                                    |                              |
     |-- OBJECT_CREATED (post, PUBLIC) -->|                              |
     |                                    |-- publicity gate: PUBLIC? -->|
     |                                    |   no -> drop, log          |
     |                                    |   yes -> projectActivity() |
     |                                    |                              |
     |                                    |-- ctx.sendActivity -------> |
     |                                        (identifier, followers,  |
     |                                         Create(Note))           |
     |                                                                  |-- queue ->
     |                                                                      delivery
     |                                                                      w/ retry
```

Outbound NEVER reads the raw journal. It reads canonical events through the projection worker and projects only PUBLIC objects. The sendActivity call goes through Fedify's MessageQueue (required in production; in-process queue is dev only).

### 4.3 Like semantics

Canonical truth is "X liked object Y" and "X revoked the like". Counters are projections rebuilt from relationship history. Inbound Like: observation only. Outbound Like: only when a canonical likes/active relationship exists AND the target object is PUBLIC. Undo(Like): flips to inactive.

## 5. Crypto boundary (restated as law)

Two key concepts, never mixed:

1. PING ACTOR SIGNING KEY: Ed25519, owned by IdentityAuthority. Signs canonical PING semantics. NEVER enters Fedify's key store. NEVER signs HTTP delivery. NEVER leaves PING custody.
2. FEDERATION TRANSPORT KEYS: owned by the adapter, served through Fedify's setKeyPairsDispatcher. RSA key signs HTTP delivery (legacy interop). Ed25519 key signs Object Integrity Proofs (FEP-8b32). Distinct from the PING actor signing key by default. Stored in PING_FEDERATION_KEY_DIR in production; ephemeral dev keys only when NODE_ENV is not production, with a loud warning.

The RSA transport key NEVER signs anything PING-canonical.

## 6. Schema map: PING -> ActivityStreams

Exact mapping. PING names are canonical; AS names exist only at the projection boundary.

| PING schema / event | ActivityStreams type | Direction | Notes |
|---|---|---|---|
| ping.social.profile@1 (person, PUBLIC+federate) | Person | out | preferredUsername, name, summary, icon, url only |
| ping.business.profile@1 (future) | Service | out | future; gate off by default |
| ping.social.post@1 (PUBLIC) | Note | out | wrapped in Create; content, published, attributedTo, to/cc |
| OBJECT_CREATED on post | Create(Note) | out | |
| OBJECT_UPDATED on post | Update(Note) | out | receiving servers update their copy |
| OBJECT_REVOKED on post | Delete(Note) | out | remote servers may keep a Tombstone |
| identity revoked | Tombstone | out | actor endpoint + WebFinger return 410 |
| RELATIONSHIP_CREATED follows/active | Accept(Follow) | out | only after canonical acceptance |
| RELATIONSHIP_CREATED follows/inactive | Undo(Follow) | out | |
| RELATIONSHIP_CREATED likes/active | Like | out/in | inbound becomes observation |
| RELATIONSHIP_CREATED likes/inactive | Undo(Like) | out/in | |
| inbound Follow | observation follow.received | in | then Accept or Reject per pipeline |
| inbound Like | observation like.received | in | |
| inbound Undo(Follow/Like) | observation *.revoked | in | |
| inbound Create (mention/reply) | observation mention.received | in | no auto side effects |
| replies_to predicate | inReplyTo | out | exact object reference, never text inference |
| mentions predicate | Mention tag | out | |
| Announce (boost) | (none) | - | no PING predicate yet; do not add in anticipation |
| Block | (none) | - | future candidate only |

## 7. Next.js integration points

Per @fedify/next 2.3.7 (verified 2026-09-20 against fedify-dev/fedify docs):

- middleware.ts (or proxy.ts on Next.js 16): `fedifyWith(federation)()`. Requires Next.js 15.4.6+ for the Node.js runtime middleware. On proxy.ts, drop `runtime: "nodejs"` from config.
- The Federation instance lives in app code (lib/federation/federation.ts), constructed once per module load.
- Matcher config intercepts only federation content types (Accept: application/(jrd|activity|ld)+json, xrd+xml; Content-Type equivalents) plus /.well-known/nodeinfo and /.well-known/x-nodeinfo2. All other traffic passes to the site untouched.
- Feature flag: PING_FEDERATION_ENABLED=1. Default OFF. When off, the middleware returns NextResponse.next() for everything and the explicit routes return 404. The site behaves exactly as if federation did not exist.
- FEDIFY_ORIGIN is pinned from env. Never derived from the request host (Fedify's own common-mistakes docs call this out).

## 8. Endpoint map

| Path | Served by | Purpose |
|---|---|---|
| /.well-known/webfinger?resource=... | Fedify (explicit route + middleware) | actor discovery |
| /.well-known/nodeinfo, /.well-known/x-nodeinfo2 | Fedify middleware | server metadata |
| /users/{identifier} | actor dispatcher | Person/Service document |
| /users/{identifier}/inbox | inbox listeners | inbound activities (personal inbox) |
| /inbox | inbox listeners | shared inbox |
| /users/{identifier}/outbox | outbox dispatcher (Lane B) | outbound activity log |
| /users/{identifier}/followers | collection dispatcher | from ping_relationships |
| /users/{identifier}/following | collection dispatcher | from ping_relationships |
| /users/{identifier}/liked | collection dispatcher | from ping_relationships |
| /objects/{id} | object dispatcher (Lane B) | projected Note documents |
| /api/federation/preview/{identifier} | preview route (patch) | what WOULD project; token-gated; verification aid |

## 9. KvStore and MessageQueue

- Dev: MemoryKvStore + in-process queue (Fedify defaults).
- Production: @fedify/postgres for BOTH, pointed at the Oracle Postgres in a SEPARATE schema (federation_*). Canonical history stays in ping_events. Only public actor metadata and cached remote documents go into this KV. Never private PING data.
- MessageQueue is REQUIRED in production. Do not run delivery on the in-process queue outside dev.
- Worker separation: federation built with manuallyStartQueue on the web process; a separate queue worker process runs federation.startQueue(). (Documented Fedify production pattern.)

## 10. Security notes

- Pin @fedify/* to the tested 2.3.x at integration time. CVE-2026-34148 (redirect-following DoS, fixed 2.1.1) and CVE-2026-62857 (NodeInfo SSRF, fixed 2.3.2) are both behind the 2.3.7 pin; re-verify the pin at apply time because Fedify ships fast.
- allowPrivateAddress: disabled in production (Fedify default posture; verify at apply).
- Inbound signature verification is mandatory and happens before any listener runs.
- The preview route is token-gated (PING_FEDERATION_PREVIEW_TOKEN). It reveals only what the public actor endpoint would reveal, but gate it anyway.
- Dev transport keys are ephemeral and loudly logged. Production refuses to boot without PING_FEDERATION_KEY_DIR.
- The publicity gate (isProjectable + projectPostCreate returning null for non-PUBLIC) is the single enforcement point. Review it as security-critical code.

## 11. What this design explicitly does NOT do

- No canonical persistence in Fedify. No PING events in the KvStore.
- No auto-accept of follows in production. No auto-follow-back. No auto-reply.
- No Announce/Block predicates until a real use case exists.
- No ATProto PDS, no Bluesky posting (harvest only, see atproto-schema-lessons.md).
- No hand-written WebFinger, JSON-LD serialization, HTTP signature code, delivery retry, or NodeInfo. Fedify owns all of it.

## 12. Open checks for Lane A / Lane D

1. Next.js major version on the site repo vs @fedify/next 2.3.7 at apply time.
2. Re-verify the @fedify/* pin (latest 2.3.x) and re-check advisories.
3. Confirm the PING gateway observation endpoint contract (POST /api/observations) and the profile read endpoint (GET /api/federation/profiles/{identifier}) with Lane B, or point the adapter at the Postgres projections directly.
4. Decide the production KvStore/MessageQueue backend (Oracle Postgres separate schema vs Redis on the Pig stack).
5. Dev-only verification of the full Follow lifecycle with `fedify inbox` before any production flag flip.
