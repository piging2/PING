# FYD External Ecosystem Harvest

Research date: 2026-09-21. Governing order recorded 2026-09-21 around 05:42 MDT, corrected-sequence step 2.
Rule of the harvest: take patterns and light libraries only. Never import a whole platform.
Nolan's standing FYD rule: two real open-protocol adapters must be implemented before freezing a generalized adapter interface. Facebook is a proving ground, never the model.
Nolan's standing writing rule: no em dashes.

Every target below carries a verdict: TAKE-PATTERN (adopt the idea), USE-LIBRARY (adopt the focused dependency), or REJECT (keep out).

---

## 1. Direct adapter comparison: ActivityPub vs ATProto vs Nostr

### ActivityPub

- What it is: W3C Recommendation (2018). Server-to-server federation for social networking, built on ActivityStreams 2.0 (JSON-LD vocabulary), WebFinger identity lookup, and HTTP Signatures for message authenticity.
- Semantic inspectability: strong. ActivityStreams 2.0 is a published vocabulary with a JSON-LD context; activities (Create, Follow, Like) and object types (Note, Person, Place) are machine readable. Server implementations vary but the vocabulary is fixed by the W3C spec.
- Identity: an actor is a URI, usually bound to a domain (e.g. `https://mastodon.social/users/alice`), resolvable via WebFinger (`acct:`). Identity is not portable: moving domains breaks followers and links, because identity equals a URL on a server.
- Follow relationships: standardized activities: `Follow`, `Accept`, `Reject`, `Undo`. Followers/following are collections on the actor object. Servers push delivery to follower inboxes. Semantics are uniform across implementations.
- Content portability: objects live at URLs owned by the origin server. Copying a Note off-server is easy (it is JSON), but canonical identity, replies, and like counts stay with the origin. Portability is reference by URL, not by signed self-contained object.
- Fragmentation: one real spec, many partial implementations (Mastodon, Misskey, Lemmy, Pixelfed implement overlapping subsets). The vocabulary is stable; the divergence is in which activities and extensions each server honors.

### ATProto

- What it is: the Bluesky/AT Protocol. Identity via DIDs (`did:plc` self-certifying, `did:web` for self-hosted), data in signed repositories hosted on Personal Data Servers, app views and relays as separate roles, content types defined by Lexicon (machine readable JSON schemas).
- Semantic inspectability: strongest of the three. Every record type is defined by a Lexicon schema, which is both human readable documentation and machine validatable. A FYD adapter can validate and introspect any record it receives against its lexicon.
- Identity: a DID, cryptographically self-certifying, decoupled from a mutable human handle (DNS or `*.bsky.social`). Portable: the same DID can move between PDS hosts; the PLC directory anchors identity changes. This is the closest to FYD's portable-identity requirement.
- Follow relationships: explicit records: `app.bsky.graph.follow` records inside the user's own signed repository. A follow is data the follower owns and signs, not a server-side state change. Fully inspectable by reading the repo.
- Content portability: content is signed records in a user-owned repository. A repo can migrate PDS hosts with signatures intact; relays and AppViews index what they choose. Portability is a first class design property.
- Fragmentation: the protocol is coherent and centrally specified, but the ecosystem is Bluesky centric. Lexicons are namespaced per application (`app.bsky.*`, `com.atproto.*`), and non-Bluesky lexicons are thin. Risk is ecosystem concentration, not spec fragmentation.

### Nostr

- What it is: a set of relay servers plus signed JSON events. No servers with accounts, no required DNS: identity is a secp256k1 keypair, relays are dumb broadcast/storage nodes.
- Semantic inspectability: weakest of the three. Semantics live in NIPs (Nostr Implementation Possibilities), numbered markdown documents with statuses (Final, Draft, Unrecommended). Implementations pick which NIPs they honor. Core NIPs relevant to FYD: NIP-01 (events, filters, subscriptions), NIP-02 (follow lists as kind 3 replaceable events), NIP-05 (DNS-based identity mapping, optional), NIP-19 (bech32 encodings like npub), NIP-65 (relay list metadata, kind 10002). Competing NIPs exist (NIP-04 deprecated in favor of NIP-44 encryption; NIP-46 remote signing; NIP-59 gift wraps). Two clients can both be "Nostr" and disagree on what a follow list or DM means.
- Identity: a public key, maximally portable, no DNS dependency. NIP-05 adds optional human-readable names via DNS. Key loss means identity loss; there is no recovery authority.
- Follow relationships: NIP-02 kind 3 contact lists: a replaceable event with `p` tags for each followed pubkey. The full list is republished on every change, which is awkward at scale, and NIP-51 lists fragment the convention further. No accept/reject handshake in the base spec.
- Content portability: events are self-contained signed JSON. Any relay can store them; clients assemble views from multiple relays. Portability is a design property, stronger than ActivityPub.
- Fragmentation: high and structural. The relay network is heterogeneous (strfry, nostream, custom relays with different retention and filtering). NIP statuses do not bind anyone. Building "a Nostr adapter" really means building "an adapter for NIPs 01/02/05/19/65 as implemented by relays X, Y, Z", which must be pinned and tested.

### Adapter obligations, exact

An ActivityPub adapter must: serve WebFinger for `acct:` URIs; sign outbound activities with HTTP Signatures; verify inbound signatures; maintain inbox/outbox endpoints; map Follow/Accept/Undo to FYD follow intent; translate Create/Note and media attachments to FYD portable objects; handle delivery retries and dead servers. Light path: Fedify (`@fedify/fedify` 2.3.7, MIT) provides the vocabulary types, WebFinger, HTTP signatures, and middleware, so the adapter is mapping code, not protocol code.

An ATProto adapter must: resolve DIDs (PLC directory) and handles; validate records against lexicons (`@atproto/lex` 0.3.11, MIT); sign and publish records to a PDS via XRPC; consume the firehose or AppView for feed data; manage OAuth sessions for delegated posting; map `app.bsky.graph.follow` records to FYD follow intent. Light path: the official `@atproto/*` packages are dual MIT/Apache-2.0 and individually importable; take only `lex`, `identity`, and the XRPC client surface, not the monorepo.

A Nostr adapter must: manage keypairs (`@noble/ed25519` 3.2.0, MIT); build and verify events and NIP-19 encodings (`nostr-tools` 2.25.2, public domain Unlicense); maintain a relay pool with reconnect and filter subscription logic; parse kind 3 contact lists and kind 10002 relay lists; handle relay variance defensively (missing events, differing retention, auth-gated relays under NIP-42). The obligation is dominated by defensive parsing of a fragmented landscape.

### Recommendation: first two adapters

Build ActivityPub and ATProto first, in that order.

ActivityPub first because it has the largest existing reachable network, a fixed W3C vocabulary (semantics are inspectable and stable), standardized follow activities, and a light MIT library (Fedify) that absorbs the cryptographic and HTTP plumbing. It exercises FYD's follow intent, portable objects, and feed capabilities against a real heterogeneous network.

ATProto second because it has the best identity portability story (DID plus mutable handle) and the most machine-inspectable semantics (Lexicon schemas), which lets FYD prove its portable objects and identity layers against a protocol designed for migration. The official SDKs are individually importable under clean dual licensing.

Nostr third, later: its identity is maximally portable and its event model is the simplest, but NIP fragmentation means FYD would be pinning a NIP profile and testing relay variance rather than implementing "Nostr". That is valuable work, but it teaches less about a generalizable adapter interface until the first two have frozen the shape of follow intent, portable objects, and identity mapping.

Facebook stays a proving ground adapter only: closed, proprietary semantics, never the model for the generalized interface.

---

## 2. Full target table

Format: NAME | WHAT IT IS | MATURITY + LICENSE | WHAT TO TAKE | FYD CAPABILITY SERVED | INTEGRATION COST/RISK | VERDICT | REASON

ActivityPub protocol | W3C Recommendation for federated social networking, ActivityStreams 2.0 vocabulary over inbox/outbox | Final 2018, W3C patent policy RF | Follow/Accept/Undo activity semantics, actor model, signed delivery pattern | social/agent actions, feeds, portable objects | Medium: HTTP signatures, delivery retries, heterogeneous servers | TAKE-PATTERN | Adapter target 1: largest open network, fixed inspectable vocabulary, standardized follows

Fedify | TypeScript ActivityPub server framework: vocabulary types, WebFinger, HTTP signatures, integrity proofs, middleware | Active, `@fedify/fedify` 2.3.7, MIT | The library as the ActivityPub plumbing layer | social/agent actions | Low: MIT, maintained, importable package | USE-LIBRARY | Light, focused, absorbs protocol plumbing so the adapter is mapping code

ATProto protocol + Lexicon | Bluesky protocol: DIDs, signed repos on PDS, Lexicon schemas define every record type | In production at Bluesky scale, spec evolving, Lexicon stable | DID identity model, lexicon-defined record validation, repo portability pattern | identity, portable objects, feeds, social/agent actions | Medium: OAuth sessions, firehose consumption, Bluesky-centric ecosystem | TAKE-PATTERN | Adapter target 2: portable identity plus machine-inspectable semantics via Lexicon

@atproto/lex | Type-safe ATProto XRPC client and Lexicon validator | `@atproto/lex` 0.3.11, MIT (monorepo dual MIT/Apache-2.0) | Lexicon validation and XRPC client surface only | portable objects, identity | Low when importing this package alone | USE-LIBRARY | Import this package, not the atproto monorepo; prefer over legacy `@atproto/api` (0.20.44) for new code

Nostr NIPs 01/02/05/19/65 | Numbered markdown specs: events/subscriptions, follow lists, DNS identity mapping, bech32 encodings, relay lists | NIP statuses vary (Final/Draft/Unrecommended), implementations disagree | Signed event envelope pattern, keypair identity, relay pool subscription pattern | identity, portable objects, feeds, social/agent actions | High: relay variance, competing NIPs, defensive parsing burden | TAKE-PATTERN | Adapter target 3: simplest event model and portable keys, but pin a NIP profile and test relay variance before claiming support

nostr-tools | Reference JS library for Nostr: event building, verification, relay pool, NIP-19 | Mature, 2.25.2, public domain (Unlicense) | Event construction/verification and relay pool when the Nostr adapter is built | identity, portable objects, feeds | Low: public domain, single-purpose | USE-LIBRARY | The light library for the eventual Nostr adapter; no relay or client platform code

Farcaster protocol + hubs | Crypto-adjacent social protocol: onchain identity registry, offchain hubs gossip messages | Protocol live but ecosystem in flux: Neynar acquired the protocol Jan 2026, founders leaving, $180M returned to investors reported | Frames pattern only (signed interactive actions over Open Graph) | social/agent actions | High: onchain costs, hub operation burden, protocol stewardship uncertainty | REJECT | Do not build a Farcaster adapter now; stewardship is unsettled and the hub/onchain model conflicts with FYD's light-adapter rule

Frames | Signed interactive actions embedded in Open Graph meta tags (Farcaster-originated) | Open spec, framesjs ecosystem, MIT-ish tooling | Pattern: signed action callbacks over OG tags | social/agent actions, approval | Low as a pattern | TAKE-PATTERN | Useful pattern for agent-actionable embeds in generated pages; take the pattern, not the Farcaster platform

MCP (Model Context Protocol) | Open protocol for exposing tools/resources/prompts to AI agents; JSON-RPC over stdio or Streamable HTTP | Spec at v2 (2026-11-26), `@modelcontextprotocol/sdk` 1.30.0, MIT | Tool/resource definition pattern and the SDK for FYD capability exposure | social/agent actions, approval | Low: MIT, single dependency | USE-LIBRARY | FYD exposes its capabilities to agents as MCP tools; SDK is the standard surface

WebFinger | RFC 7033: `acct:` URI to profile discovery over HTTPS | RFC 2013, stable | acct: resolution pattern for adapter identity lookup | identity, acquisition | Low | TAKE-PATTERN | Required by ActivityPub adapter; Fedify implements it, take the pattern and the library coverage

WebSub | W3C Recommendation: hub-based push notifications for feed updates | Rec (republished 2026-06-02), open | Push pattern for feed freshness on generated sites | feeds | Low: simple hub protocol | TAKE-PATTERN | Cheap push semantics for FYD-generated feeds; implement subscriber side, optionally a minimal hub

JSON-LD 1.1 | W3C Recommendation: JSON-based Linked Data serialization | Rec, stable, CG maintained | Envelope pattern for exporting portable objects with `@context` | portable objects | Low as export shape | TAKE-PATTERN | Export shape for portable objects only; FYD canonical objects stay FYD-native, do not model the core on RDF

schema.org | Collaborative vocabulary for structured data (Google, Microsoft, Yahoo, Yandex sponsors) | Vocabulary CC-BY-SA 3.0 per official terms, site software Apache 2.0 | Types for generated pages: LocalBusiness, Person, Article, Event, Product | site generation, portable objects, acquisition | Low: vocabulary use, not code | TAKE-PATTERN | Take the vocabulary for generated-page markup and JSON-LD context; mind the CC-BY-SA 3.0 terms on the vocabulary itself

Open Graph protocol | ogp.me: meta tag vocabulary for link previews and embeds | Open spec, no formal license, stable | og: tag emission in generated pages | site generation | Trivial | TAKE-PATTERN | Every generated page emits OG tags; foundation of the Frames pattern

RSS 2.0 / Atom (RFC 4287) | XML feed formats for syndication | RSS 2.0 frozen by RSS Advisory Board; Atom RFC 4287 (2005), stable | Emit Atom feeds per generated site; consume RSS/Atom in acquisition | feeds, acquisition | Low | TAKE-PATTERN | Feed emission is a core FYD output; consumption feeds acquisition

JSON Feed 1.1 | JSON-native feed format | Community spec, stable | Emit alongside Atom for generated sites; simpler for agents to consume | feeds | Trivial | TAKE-PATTERN | Agent-friendly feed output; cheap to emit next to Atom

Sitemaps (sitemaps.org) | XML sitemap protocol for crawler discovery | Open protocol, stable | Emit sitemap.xml per generated site | site generation | Trivial | TAKE-PATTERN | Standard generated-site hygiene; near-zero cost

WebAuthn Level 3 | W3C Recommendation 2026-08-25: public-key authentication with passkeys | Rec, RF patent policy | Passkey-bound human approval identity | approval, identity | Low-Medium: ceremony handling | TAKE-PATTERN | Human approval authority anchored in platform authenticators; pair with a light library such as SimpleWebAuthn (MIT) at implementation time

@simplewebauthn/server | WebAuthn ceremony library | Active, MIT | Registration/authentication ceremony handling | approval, identity | Low | USE-LIBRARY | Take when implementing passkey approvals; do not hand-roll ceremonies

@noble/ed25519 | Minimal audited Ed25519 implementation | 3.2.0, MIT | Key generation, signing, verification for Nostr adapter and FYD signatures | identity, evidence | Low | USE-LIBRARY | Portable across runtimes where WebCrypto Ed25519 is inconsistent; the signing primitive for Nostr and FYD object signatures

OAuth 2.x | Authorization framework: RFC 6749/6750, RFC 9700 security BCP; OAuth 2.1 still Internet-Draft (draft-ietf-oauth-v2-1-15) | Standards track, stable core | Delegated authorization pattern for adapters posting on user accounts | identity, social/agent actions | Medium: never hand-roll; use provider SDKs | TAKE-PATTERN | Authorization pattern only; use ATProto OAuth and provider libraries, never a custom implementation

DPoP (RFC 9449) | Sender-constrained OAuth access tokens via proof-of-possession | RFC 2023, stable | Token binding pattern for agent-held tokens | identity, approval | Low-Medium | TAKE-PATTERN | Binds tokens to keys so stolen tokens are useless; fits FYD agent delegation

UCAN | Delegated authorization via signed capability chains (Fission lineage, now ucanto) | Spec via ucan-wg, churn across versions, storacha/ucanto MIT | Delegation-chain pattern: capabilities attenuate down an agent chain | identity, approval, social/agent actions | Medium: spec churn risk | TAKE-PATTERN | Take the delegation-chain pattern for agent capability scoping; adopt the library only when a concrete delegation flow needs it

Automerge | CRDT library for deterministic merging of concurrent structured-data changes | `@automerge/automerge` 3.5.0, MIT, mature | Offline multi-actor draft convergence: site drafts, evidence assembly | site generation, evidence, approval | Medium: WASM bundle, change-graph semantics differ from an event log | USE-LIBRARY | Use at the draft layer for converging concurrent edits; never as the canonical event log, which stays PING's

ElectricSQL sync engine | Postgres WAL to client shape sync over HTTP (Elixir service) | GA 1.0 March 2025, Apache-2.0, electric-sql/electric | Shape-based partial sync pattern | feeds | High if self-hosting the service: new runtime, replication slots | TAKE-PATTERN | Take the shape-sync pattern; do not self-host the sync service for FYD's needs

PGlite | Embeddable Postgres in WASM | `@electric-sql/pglite` 0.5.8, Apache-2.0, used in Firebase Tools and Supabase builders | Embedded Postgres for tests, edge, and local-first demos | site generation, acquisition | Low: npm install, runs in-process | USE-LIBRARY | Light embedded Postgres where a real SQL engine is needed without a server

IPFS / Kubo | Content-addressed storage network; js-ipfs deprecated in favor of Helia; Kubo is the reference full implementation | Protocol stable, ecosystem mature but operationally heavy | CID content-addressing pattern for evidence objects | evidence, portable objects | High: gateway centralization, pinning ops, daemon burden | REJECT | Take the CID pattern only; do not run Kubo or depend on public gateways; Helia stays an optional later USE-LIBRARY, not now

Iroh | QUIC-based p2p connectivity with NAT traversal and relay fallback (Rust) | Active, n0-computer/iroh, dual MIT/Apache-2.0 | P2P connectivity pattern | acquisition, social/agent actions | High for a TS stack: Rust core, FFI cost | TAKE-PATTERN | Pattern only for now; Rust-primary implementation makes direct adoption expensive for FYD's TypeScript stack

Willow | Family of p2p data protocols: Willow Drop Format, Confidential Sync (formerly General Purpose Sync) | Spec published 2024-01, renames since, thin implementation ecosystem (iroh-willow Rust, early TS work) | Range-based set reconciliation pattern | feeds, evidence | High: research-grade, ecosystem thin | TAKE-PATTERN | Take the reconciliation pattern for future sync work; the protocol itself is not mature enough to adopt

Defuddle | Article/content extraction: emits HTML or Markdown plus schema.org metadata | 0.19.4, MIT, but README states it is very much a work in progress | Main-content extraction for acquisition pipeline | acquisition | Low: single dependency | USE-LIBRARY | Light extractor with schema.org metadata output; pin version and test against FYD's source mix

Mozilla Readability | Battle-tested readability extraction (Firefox Reader Mode) | Mature, Apache-2.0 | Stable extraction baseline | acquisition | Low | USE-LIBRARY | The stable baseline extractor; pair with Defuddle for metadata

Trafilatura | Python extraction library with strong readability scoring | Mature, GPL-3.0 | Readability scoring heuristics only | acquisition | License blocks library use | TAKE-PATTERN | GPL-3.0 is incompatible with FYD's stack; study its scoring heuristics, never import the code

JSON Forms | Schema-driven forms: JSON Schema plus UI schema plus renderer sets | `@jsonforms/react` 3.8.0, MIT, framework-agnostic core | Approval and editing UI driven by FYD action/SiteSpec schemas | approval, site generation | Low-Medium: renderer customization | USE-LIBRARY | Approval flows and tenant editing UI generated from schemas; RJSF (Apache-2.0) is the fallback alternative

Solid / Linked Web Storage | Decentralized personal data stores; Solid transitioning to W3C Linked Web Storage (FPWD March 2026) | Spec in flux, server adoption marginal | LDP container and WebAccessControl patterns, if ever needed | identity, portable objects | High: spec flux, thin adoption | REJECT | Do not adopt the platform; patterns stay in the notebook until a concrete interop case appears

nostr relay implementations (strfry, nostream) | Relay server software | Various licenses, operationally heterogeneous | Nothing; treat relays as black-box infrastructure via protocol | feeds | High: running relays is operating someone else's network | REJECT | Never run FYD relays as a dependency; the adapter speaks the protocol to existing relays

Mastodon / Misskey / Lemmy | ActivityPub server applications | AGPL/MIT various, full applications | Nothing; treat as network participants via ActivityPub | social/agent actions | High: whole applications, wrong layer | REJECT | FYD speaks ActivityPub to these servers; it never embeds or forks them

Bluesky AppView / PDS stack | ATProto roles: relay, AppView, PDS | Open source but full infrastructure | Nothing; use XRPC and firehose as a client | feeds, portable objects | High: running AppView-scale infra is not FYD's job | REJECT | FYD is an ATProto client via lexicons and XRPC, never an AppView or PDS operator

---

## 3. Do not import list (whole platforms, with reasons)

- Mastodon, Misskey, Lemmy, Pixelfed: full ActivityPub server applications. FYD speaks the protocol to them; embedding one makes FYD a fork of someone else's product and drags in their storage, moderation, and federation policy.
- Bluesky PDS, relay, and AppView: full ATProto infrastructure roles. FYD is a client of lexicons, XRPC, and the firehose. Operating AppView-scale indexing is a different business.
- Nostr relay implementations (strfry, nostream, custom relays): relay operation is infrastructure, not product. The Nostr adapter treats relays as black boxes reached over the protocol.
- Farcaster hubs plus onchain contracts: hub operation plus onchain identity costs, during active stewardship uncertainty (Neynar acquisition, founders departing). Wrong layer and wrong timing.
- Kubo IPFS daemon and public gateway dependence: operational burden plus de facto centralization on gateways. Take the CID pattern; keep Helia as an optional later library, not infrastructure.
- Solid servers (Community Solid Server and kin): spec in flux toward Linked Web Storage, marginal adoption. Nothing to interoperate with at FYD's scale.
- ElectricSQL sync service as a self-hosted dependency: a new Elixir runtime, replication slots, and ops surface for a need FYD does not yet have. Pattern only.
- js-ipfs: deprecated upstream in favor of Helia. Never adopt deprecated code paths.
- Trafilatura as a library: GPL-3.0. Incompatible with FYD's stack regardless of technical merit. Study the heuristics; never import the code.
- Automerge-repo and similar sync servers: whole sync infrastructure around a CRDT core. FYD takes the `@automerge/automerge` core library at the draft layer, never the server.
- Whole OAuth provider stacks or identity servers: FYD uses OAuth as a client pattern via provider SDKs. Running an identity provider is out of scope.
- Any CMS, site builder, or social client application: FYD generates sites and speaks protocols. Importing a CMS or a client makes FYD a skin over someone else's product.

---

## 4. Fragmented and incompatible implementation landscapes

- Nostr NIPs: the sharpest fragmentation in this harvest. NIPs are advisory markdown with statuses that bind nobody. NIP-04 is deprecated in favor of NIP-44, NIP-46 remote signing and NIP-59 gift wraps compete with older DM conventions, follow semantics split between NIP-02 kind 3 and NIP-51 lists, and relays vary in retention, filtering, and auth. Any Nostr work must name a pinned NIP profile and test against real relays.
- ATProto: coherent spec, concentrated ecosystem. Lexicons are namespaced per app and non-Bluesky lexicons are thin. The risk is Bluesky-centrism, not spec fragmentation: an ATProto adapter is largely a Bluesky adapter until other lexicons mature.
- ActivityPub: one W3C vocabulary, partial implementations. Servers implement overlapping subsets and vendor extensions. The vocabulary is inspectable and fixed, so the adapter's job is capability negotiation per server, not guessing semantics.
- MCP: the spec reached v2 in November 2026 and the ecosystem is still absorbing breaking changes between revisions. Pin the SDK version and the protocol revision; do not assume server compatibility.
- OAuth 2.1: still an Internet-Draft as of 2026. Build on RFC 6749/6750 plus the RFC 9700 security BCP, not on draft 2.1.
- WebAuthn Level 3: W3C Recommendation 2026-08-25, but authenticator and browser support for new Level 3 features lags the spec. Use the stable Level 2 ceremony surface first.
- UCAN: spec lineage churn (Fission to ucan-wg to ucanto). Take the delegation pattern; treat any library as provisional.
- Solid to Linked Web Storage: a transition in progress, not a stable target. Observe, do not adopt.
- Willow: renames and research-grade status. Patterns only.
- JSON-LD: stable, but the harvest rule stands: export shape only, never the modeling core.

## 5. Notes on sources and verification

- Primary sources used: W3C Recommendations (ActivityPub, WebSub, WebAuthn, JSON-LD), IETF RFCs (7033 WebFinger, 4287 Atom, 6749/6750 OAuth, 9700 BCP, 9449 DPoP), official spec repos (Nostr NIPs, ATProto lexicon package, MCP spec), official project READMEs (Fedify, defuddle, JSON Forms, Automerge, Iroh), the npm registry for versions and licenses, schema.org official terms for the CC-BY-SA 3.0 vocabulary license, and the FIDO Alliance certification announcement for WebAuthn Level 3.
- Versions pinned at research time via the npm registry: `@fedify/fedify` 2.3.7 (MIT), `@atproto/lex` 0.3.11 (MIT), `@atproto/api` 0.20.44 (MIT), `nostr-tools` 2.25.2 (Unlicense/public domain), `@modelcontextprotocol/sdk` 1.30.0 (MIT), `defuddle` 0.19.4 (MIT), `@jsonforms/react` 3.8.0 (MIT), `@automerge/automerge` 3.5.0 (MIT), `@electric-sql/pglite` 0.5.8 (Apache-2.0), `@noble/ed25519` 3.2.0 (MIT).
- Items marked unverifiable-at-harvest: exact NIP statuses shift over time, so the Nostr adapter must re-pin at implementation time; ElectricSQL GA 1.0 (March 2026) and Farcaster acquisition reporting (January 2026) come from ecosystem reporting and should be re-checked before any decision that depends on them.
