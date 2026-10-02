# ActivityPub Semantics Harvest

Lane C, read-only. Harvested from the W3C ActivityPub Recommendation (https://www.w3.org/TR/activitypub/) and the Activity Vocabulary (https://www.w3.org/TR/activitystreams-vocabulary/). Checked 2026-09-20.

## Purpose

Extract proven social semantics PING should mirror THROUGH ADAPTERS. These are not proposed PING canonical event names. The canonical vocabulary stays: OBJECT_CREATED, OBJECT_UPDATED, RELATIONSHIP_CREATED (plus proposal/approval/transition semantics). ActivityPub types map at the projection boundary.

## Actor model

An Actor is identified by a URI and exposes, in its ActivityStreams description:

- inbox: how the actor receives messages from the world
- outbox: how the actor sends messages to others
- followers: collection of actors following this actor
- following: collection of actors this actor follows
- liked: collection of objects this actor liked

Standard example: Person with preferredUsername, name, summary, inbox, outbox, followers, following, liked.

Lesson for PING: the Actor is a federation PROJECTION of PING identity, not the identity itself. PING Nolan -> projected as AP Person actor.

## Follow lifecycle (exact spec rules)

1. Client posts Follow to its outbox (spec 6.5). Server-side side effect: the server SHOULD add the Follow's object to the actor's following collection ONLY WHEN an Accept activity is subsequently received with that Follow activity as its object.

2. The target server receives the Follow in its inbox, decides, and sends back Accept or Reject.

3. Accept (spec 7.6): on receipt in the inbox, if the object of the Accept is a Follow activity previously sent by the receiver, the server SHOULD add the actor to the receiver's Following collection.

4. Reject (spec 7.7): if the object is a Follow previously sent by the receiver, the recipient did NOT approve. The server MUST NOT add the actor to the receiver's Following collection.

5. Undo (spec 6.10 C2S, 7.12 S2S): undoes a previous activity. The undo activity and the activity being undone MUST have the same actor. Side effects should be undone to the extent possible. For Follow: Undo(Follow) removes from following/followers. Exceptions with explicit inverse activities: use Delete instead of Undo(Create), Remove instead of Undo(Add).

Key detail: follow is a REQUEST with a lifecycle (pending -> accepted/rejected -> possibly undone), not a single boolean edge. PING's RELATIONSHIP_CREATED with predicate=follows plus a status transition (pending/active/revoked) maps cleanly onto this.

## Like lifecycle

- Client posts Like to outbox (spec 6.8): indicates the actor likes the object. Side effect: server SHOULD add the object to the actor's liked collection.
- Server-to-server (spec 7.10): on receipt in inbox, the server SHOULD add the received activity to the object's likes collection if present. Like counts are derived from this collection, not a counter.
- Undo Like (spec 6.10/7.12): removes the like; "if undoing a Like, any counter that had been incremented previously should be decremented appropriately."

Lesson for PING: canonical truth is "Nolan liked object X" and "Nolan revoked the like". Counters are projections rebuilt from the relationship history. This matches database/ping_objects.sql ping_relationships (predicate=likes, status active/inactive) exactly.

## Create / Update / Delete

- Create (spec 7.2): delivered to inbox; server stores a representation of the activity and object. PING maps: OBJECT_CREATED -> Create projection.
- Update (spec 7.3): receiving server SHOULD update its copy of the object with the same id. PING maps: OBJECT_UPDATED -> Update projection.
- Delete (spec 7.4): receiving server SHOULD remove its representation (may leave a Tombstone). PING maps to revocation/tombstone semantics.

## Announce (boost/share)

Spec 7.11: on receipt in inbox, server SHOULD add the received activity to the object's shares collection. Vocabulary note: Announce is "sharing", "reposting", or "boosting". PING mapping: RELATIONSHIP_CREATED with a share/announce predicate is a candidate, but only if a real use case appears. Do not add a predicate in anticipation.

## Block

Spec 6.9/7.9: indicates the actor does not want the object actor to interact with objects posted by the actor. Servers SHOULD NOT deliver Block activities to their object. Servers SHOULD prevent the blocked user from interacting. PING mapping: predicate=blocks is a future candidate. Not needed for the sprint.

## Delivery rules (spec 7.1)

- Delivered by POSTing the activity to recipient actors' inbox endpoints, found by dereferencing the actor's inbox property.
- Collections in to/cc MUST be dereferenced to discover inboxes; sharedInbox SHOULD be used where present.
- Servers MUST de-duplicate recipients and MUST exclude the activity's own actor.
- bto and bcc MUST be removed before storage but used for delivery addressing.
- Delivery SHOULD be asynchronous and SHOULD retry on network failure.
- C2S and S2S may share internals: "Activities being distributed between actors on the same origin may use any internal mechanism, and are not required to use HTTP."

Lesson for PING: Fedify owns this entire delivery layer. Do not hand-write it.

## Addressing and public visibility

- Public addressing uses the special collection https://www.w3.org/ns/activitystreams#Public.
- Activities with no recipients: "it is recommended that if no recipients are specified the object remains completely private and access controls restrict the access to object."

Lesson: PUBLIC vs PRIVATE mapping is explicit in AP addressing. PING_ONLY remains a PING-side concept with no AP equivalent; public PING posts project as Public-addressed.

## Authentication reality

Spec B.1/B.2: no strongly agreed authentication mechanism at standardization time. Servers "should not trust content received from a server other than the content's origin without some form of verification." HTTP Signatures are the de facto mechanism, and Fedify implements them (see fedify-decision.md). Do not build signature verification by hand.

## Adapter mapping table

| PING canonical (stays) | ActivityPub projection (adapter) |
|---|---|
| RELATIONSHIP_CREATED predicate=follows, status active | Follow + Accept; Reject maps to rejected status |
| relationship revocation (status inactive) | Undo(Follow) |
| RELATIONSHIP_CREATED predicate=likes | Like |
| likes revocation | Undo(Like) |
| OBJECT_CREATED | Create |
| OBJECT_UPDATED | Update |
| revocation/tombstone | Delete |
| identity/profile object | Person actor, followers/following/liked collections |
| RELATIONSHIP_CREATED predicate=replies_to | Create with inReplyTo |

Direction rule: PING canonical events are the source of truth. The adapter reads canonical history and emits AP activities. Fedify owns the wire format, signatures, and delivery. Inbound AP activities (follows from Mastodon etc.) enter as provider observations, never as canonical truth.
