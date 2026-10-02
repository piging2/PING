# Fedify Evaluation and Decision

Lane C, read-only. No install performed. Evidence gathered 2026-09-20 from fedify.dev docs, the fedify-dev/fedify GitHub repo (docs, CHANGES.md), and the npm registry.

## FEDIFY_DECISION = ADOPT (federation wire layer only)

Adopt Fedify for: ActivityPub wire protocol, WebFinger, federation serialization, HTTP federation signatures, outbound delivery with retry, inbox/outbox HTTP handling, NodeInfo, and testing tooling.

Do NOT let Fedify own: canonical identity, canonical objects, relationships, capabilities, events, evidence, approval, persistence of canonical history, or the signing of canonical PING semantics. Fedify's key store holds TRANSPORT keys, not the PING identity key.

## Evidence

### Version, license, runtimes

- Current npm version: @fedify/fedify 2.3.7 (verified via npm registry). CHANGES.md documents 2.3.1 (June 2026) with active unreleased changes since; the project ships continuously.
- License: MIT (npm registry license field). Commercially safe.
- Engines: node >= 22.0.0, bun >= 1.1.0, deno >= 2.0.0.
- The PING website is Next.js. @fedify/next 2.3.7 exists in the same release train.

### Next.js integration (@fedify/next)

- Provides fedifyWith(federation) middleware wrapping the app's middleware.
- Works with middleware.ts (classic) and proxy.ts (Next.js 16 convention). Proxy always runs on the Node.js runtime; remove runtime: "nodejs" from config when renaming.
- The Federation instance (dispatchers, listeners, key pairs) lives in app code (e.g. ./federation) and the middleware routes federation requests to it.
- Requirement check for Lane B: verify the website's Next.js major version against @fedify/next 2.3.7 at integration time. No blocker found in docs for recent Next versions.

### What Fedify owns out of the box (from docs/intro.md)

- Type-safe Activity Vocabulary objects (via @fedify/vocab, split packages in 2.x)
- WebFinger client AND server (explicit "do not reimplement" note in their docs)
- HTTP Signatures (legacy draft) and HTTP Message Signatures (RFC 9421)
- Object Integrity Proofs (FEP-8b32) and Linked Data Signatures
- NodeInfo protocol
- "Enhanced interoperability with Mastodon and other popular fediverse software"
- Framework integrations (14+): Next.js, Hono, Express, Fastify, Koa, H3, Elysia, SvelteKit, NestJS, Astro, Nitro, Cloudflare Workers, bare-bones
- CLI toolchain: fedify init, lookup, inbox, webfinger, nodeinfo, tunnel, relay

### Storage adapters (KvStore + MessageQueue)

KvStore adapters: @fedify/sqlite, @fedify/postgres, @fedify/mysql, @fedify/redis, @fedify/denokv, plus in-memory (dev only).
MessageQueue adapters: @fedify/redis, @fedify/amqp (RabbitMQ), @fedify/postgres, @fedify/denokv, plus in-process (dev only).

Key architectural fit: KvStore is key-value for Fedify's own caching (remote actor documents, key lookups). It is NOT canonical persistence. Point @fedify/postgres at the existing Oracle Postgres or use a separate schema; canonical history stays in ping_events. MessageQueue is REQUIRED in production: ctx.sendActivity() overloads and the two-stage delivery fan-out (consolidated message -> fan-out worker -> per-recipient delivery with independent retry) run through it. Do not run delivery on the in-process queue in production.

### Key model (setKeyPairsDispatcher)

- The app returns CryptoKey pairs per actor from setKeyPairsDispatcher.
- Fedify's own migration guide recommends returning BOTH an RSA key pair (for HTTP Signatures, legacy interop with Mastodon-era servers) and an Ed25519 key pair (required for Object Integrity Proofs, FEP-8b32).
- This matches the required crypto boundary exactly (see below). Fedify expects two keys per actor already.

### Signature behavior

- Public functions: signRequest, verifyRequest, verifyObject.
- Outbound: HTTP Message Signatures (RFC 9421) plus legacy HTTP Signatures for interop; Object Integrity Proofs via Ed25519; Linked Data Signatures.
- Inbound: signature verification is mandatory for inbox processing; malformed remote publicKey entries fail verification cleanly (recent fix), not as server errors.
- Mastodon interop specifics: RSA compatibility constraints documented in docs/manual/send.md; double-knocking mechanism for servers that reject unsigned fetches.

### Follow/Accept/Undo and inbox/outbox support

- setActorDispatcher("/u/{identifier}", ...) defines actor URIs.
- setInboxListeners(...).on(Follow, handler) pattern: one handler per activity type; unregistered types are silently ignored.
- Outbox dispatchers and listeners cover Create/Update/Delete/Announce/Like/Follow/Undo.
- All the lifecycle semantics harvested in activitypub-semantics.md are implemented by Fedify; PING code only registers handlers that translate to/from PING canonical relationships.

### Testing CLI

- fedify lookup: resolve actors/objects by URI or WebFinger handle.
- fedify inbox: send test activities to an inbox.
- fedify webfinger, nodeinfo: verify discovery endpoints.
- fedify tunnel: expose local dev server for federation testing (ngrok-style, dev only).
- @fedify/testing package for unit-level tests.
- Lane D can use these for federation verification without a live Mastodon instance.

## Crypto boundary (standing decision)

Keep two distinct key concepts. Record this as PING law:

1. PING ACTOR SIGNING KEY: Ed25519, owned by PING IdentityAuthority. Signs canonical PING semantics (canonical bytes of events, objects, approvals). This key NEVER enters Fedify's key store, NEVER signs HTTP delivery, NEVER leaves PING custody. Private material stays in the approved dev custody path and never touches canonical state, logs, or projections.

2. FEDERATION TRANSPORT KEYS: owned by the ActivityPub projection adapter, managed through Fedify's setKeyPairsDispatcher.
   - RSA key: signs HTTP delivery (legacy HTTP Signatures) for Mastodon-era interop. Pure transport.
   - Ed25519 key: signs Object Integrity Proofs (FEP-8b32) on AP documents. This MAY be a distinct key from the PING actor signing key; safest default is distinct.

Do NOT contaminate PING canonical identity design to satisfy legacy ActivityPub interop. Do NOT let the RSA transport key sign anything PING-canonical. The adapter binds the AP actor URI to the PING identity as a claim (provider=activitypub, external actor URI, key fingerprints), which is provenance, not identity.

Rationale: Fedify docs confirm the fediverse still has legacy HTTP-signature/RSA realities (RFC 9421 is standard, older behavior is deployed). Mixing those keys into PING's canonical signing would couple PING identity semantics to a protocol transport forever.

## Integration shape (for Lane A/B when ready)

PING
  -> ActivityPubProjectionAdapter (Lane B code, small)
    -> Fedify Federation instance (dispatchers read PING projections; listeners emit PING provider observations)
      -> fediverse

- Actor dispatcher reads the PING profile projection (display name, bio, avatar reference) and publishes the Person actor.
- Inbox listeners translate inbound Follow/Like/Create into PING provider observations (OBSERVATION_CREATED), which the existing event pipeline turns into claims, never direct canonical writes.
- Outbound: Lane A writes canonical RELATIONSHIP_CREATED / OBJECT_CREATED; a projection worker feeds the adapter; the adapter calls ctx.sendActivity().
- Fedify KvStore: @fedify/postgres on the Oracle DB (separate schema), or redis if the Pig stack prefers. Not canonical.
- Fedify MessageQueue: @fedify/postgres or redis. Required for production delivery.

## Risks and open checks

1. Queue and KV are new operational surface. Both can ride the existing Oracle Postgres via @fedify/postgres, minimizing new infrastructure.
2. Version pin: pin @fedify/* to the tested 2.3.x at integration time; the project ships fast.
3. No private PING data into Fedify's KV. Only public actor metadata and cached remote documents.
4. Actor URI origin: Fedify mints actor URIs against the configured origin; pin FederationOptions.origin in production, never rely on request host. (Called out in their own common-mistakes docs.)
5. License MIT confirmed. No copyleft risk.

## What NOT to do

- Do not hand-write WebFinger, JSON-LD ActivityStreams serialization, HTTP signature creation/verification, delivery retry, inbox signature verification, or NodeInfo. Fedify owns all of it.
- Do not store canonical PING events in Fedify's KvStore.
- Do not let Fedify's actor key become the PING identity key.
