# ATProto Harvest: Lessons Only

Lane C, read-only. Harvested from official AT Protocol docs (https://atproto.com/specs/lexicon, https://atproto.com/guides/lexicon) and current ecosystem documentation. Checked 2026-09-20.

STANDING: ATProto is HARVEST ONLY. No PDS deployment. No ATProto canonical identity. No Bluesky posting in this sprint. Every item below is a lesson mapped to PING, not a build plan.

## Lesson 1: Lexicon -> PING schema registry discipline

ATProto Lexicon is a schema definition language for records, XRPC endpoints, and event messages. Records are JSON objects with a $type field carrying the NSID (e.g. app.bsky.feed.post, app.bsky.graph.follow). Related lexicons group under NSID hierarchy; shared definitions live in *.defs lexicons.

Schema evolution rules (hard, from the spec and ecosystem):
- New fields must be OPTIONAL.
- Field types can NEVER change.
- Fields can NEVER be removed.
- unknown fields in data are tolerated; validation is forward-compatible.

PING mapping: the existing event registry (gateway/generated/event_generator.js owns event_registry.json; never hand-edit) should adopt the same evolution discipline. ping.social.profile@1 must follow: @2 may only add optional fields, never change types or remove fields. If a breaking change is needed, mint a new schema version, do not mutate @1. The relationship predicate CHECK list in ping_objects.sql (follows, replies_to, references, likes, mentions) behaves like a closed enum; adding a predicate is a migration, never a silent widening. Consider a knownValues-style (suggestive, open) vs enum (closed) distinction for future extensible fields.

## Lesson 2: Small typed social vocabulary, proven in production

ATProto's core social records, each a typed Lexicon record:
- app.bsky.actor.profile (profile)
- app.bsky.feed.post (post)
- app.bsky.feed.like (like)
- app.bsky.graph.follow (follow)

This independently validates the sprint's "small object" thesis: profile, post, relationship (follow), reaction (like). ATProto proves you do not need a class hierarchy per feature; you need typed records with stable NSIDs.

PING mapping: keep PING's vocabulary at PROFILE / POST / RELATIONSHIP / REACTION / REPLY-REFERENCE / PROPOSAL / APPROVAL. Do not invent FollowAuthority, LikeAuthority, or parallel domain models. The generic RELATIONSHIP_CREATED with predicate carries follow and like exactly as ATProto carries them as typed records.

## Lesson 3: Likes and follows live in the actor's own repo

In ATProto, only the account owner can create or modify records in their own repository. A like is a record in the LIKER's repo (app.bsky.feed.like), a follow is a record in the FOLLOWER's repo (app.bsky.graph.follow). Nobody else can write your likes or follows.

PING mapping: RELATIONSHIP_CREATED for follows/likes must be signed by the SUBJECT (the follower/liker), and governance must reject relationship claims signed by anyone else. Nolan's follow of Alice is Nolan's signed statement, not Alice's. This is already the design direction; ATProto confirms it is the right authority rule.

## Lesson 4: Strong references -> PING object reference discipline

ATProto records reference each other with strong references: AT URI (at://did:plc:xyz/app.bsky.feed.post/rkey) plus CID (SHA-256 content identifier, self-certifying). A reply carries the exact URI and CID of its parent; verification is cryptographic, not textual.

PING mapping: P2's reply_to must be the exact PING object ID (and ideally the payload hash) of P1. No text inference, no fuzzy matching. The reply relationship is a cryptographic reference, matching the existing "exact object reference" requirement in the sprint plan.

## Lesson 5: DID vs handle -> identity vs claim separation

ATProto identity has two layers:
- DID (did:plc:..., did:web:...): permanent, verifiable account identifier. In the DID document: signing keys, PDS endpoint, alsoKnownAs handles.
- Handle (user.example.com): human-readable, DNS-based, linked BIDIRECTIONALLY to the DID. Resolution chain: handle -> DNS TXT -> DID -> DID document -> PDS. "Always verify bidirectionally."

PING mapping: this is the same architecture as the sprint's identity model. PING canonical identity is the DID-equivalent (permanent, key-bound, self-sovereign). Facebook handle, ActivityPub actor URI, and any future ATProto DID are the handle-equivalents: protocol claims attached to the PING identity, verified bidirectionally (the provider account must point back at the PING identity where the protocol supports it). Never model "Facebook Nolan" as the person; model it as a claim on PING Nolan.

## Lesson 6: OAuth permission sets -> CapabilityAuthority comparison

ATProto OAuth: OAuth 2.1 with PKCE mandatory, DPoP mandatory, PAR (pushed authorization requests) mandatory. Official clients: @atproto/oauth-client-browser and @atproto/oauth-client-node (do not hand-roll DPoP). Lexicon defines a permission-set primary type: bundles of permissions with resource types (repo with collection+action scoping: create/update/delete on specific record collections; rpc with endpoint scoping), displayed to the user at consent time.

PING mapping: compare against CapabilityAuthority. ATProto's permission-set is a consent-time capability grant with collection-level and action-level scoping, which is the right mental model for PING capabilities (object.like vs object.publish vs provider.facebook.like). The sprint's rule that object.like does NOT imply a provider-side action maps to ATProto's resource-scoped permissions: a grant on one resource/collection never implies another. When PING later builds agent capability grants, the permission-set shape (human-readable title + detail + scoped permissions) is the pattern to adapt.

## Lesson 7: Repository model -> canonical journal parallel

Every ATProto account has a repository: an append-only, cryptographically signed Merkle search tree of records. Every commit signs the tree root; history is verifiable. Records have collection (schema), record key (usually TID, a sortable timestamp), and value.

PING mapping: ping_events is the same architectural shape (append-only canonical journal, acceptance ordering, hash linkage). The TID lesson: sortable timestamp-based record keys are how ATProto gets deterministic ordering within an account; PING's acceptance-order authority (PostgreSQL sequence / UnifiedEventRuntime acceptance) is the equivalent and must remain the single ordering authority.

## Lesson 8: Privacy reality -> projection boundary validation

Current ATProto reality: ALL data on a PDS is public. Posts, follows, blocks, blobs are accessible to anyone. Private/permissioned records are future work (a working group is active, but not shipped).

PING mapping: this validates the sprint's projection rule hard. Never project a non-PUBLIC PING object to ATProto. PING_ONLY and PRIVATE have no ATProto representation today. If a future ATProto integration happens, the adapter must enforce: only PUBLIC canonical objects get projected; everything else stays inside PING. The "RAW JOURNAL -> BROWSER = NOT APPROVED" rule applies tenfold to protocol projection.

## Lesson 9: Data model determinism

ATProto data model: DAG-CBOR (deterministic CBOR subset) for binary encoding, JSON for HTTP APIs. CIDs are SHA-256 multihashes. No floats (integers only; encode floats as strings).

PING mapping: reinforces the canonicalization requirement. PING canonical bytes must be deterministic (sorted keys, fixed encodings, no floats, no locale dependence) before hashing or signing. The same class of bug (JSON.stringify key order) breaks content addressing in both systems.

## Explicit non-goals for this sprint

- No PDS deployment or hosting.
- No Bluesky account creation or posting.
- No atproto OAuth integration (official SDKs exist for later: @atproto/oauth-client-node server-side).
- No Lexicon publishing for PING schemas (revisit only if a real ATProto adapter is built).
- ATProto is a lessons source and a possible future protocol adapter, in the same class as ActivityPub but behind it in priority.
