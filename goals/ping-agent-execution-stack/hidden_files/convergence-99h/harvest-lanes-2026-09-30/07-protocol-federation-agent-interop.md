# READER LANE 7: PROTOCOL / FEDERATION / AGENT INTEROP
Date: 2026-09-30. Lane: 7 of 10. Binding order: CEO-ORDER-ECOSYSTEM-HARVEST-2026-09-30.md (Nolan Geske).

## Where this lane searched (local evidence)

- PING repo at /home/nolan/projects/ping: UNREACHABLE from this machine. The path does not exist here (home is /home/hatch). GitHub-visible PING state (81b3248/main) is per Nolan's own 2026-09-30 evening recheck, cited, not cloned by this lane.
- PING repo at /home/nolan/projects/ping-fyd-converged: UNREACHABLE, same reason.
- FYD repo: NO local checkout found. ~/workspace/fyd/ is a working directory, not the FYD source. FYD is unavailable via the connected GitHub account (Nolan's recheck). FYD's protocol posture is taken from the 99H plan and the FYD/PING harvest directive, which are the only in-scope records.
- CRX runtime (6c4b531): NOT cloned locally. Best local evidence is ~/workspace/crx-audit/03-mcp-map.md (Deliverable 3, the MCP forensic map) and partials/agent-b-mcp.md, plus ~/workspace/crx-autonomous-missions/lanes/mcp-execution/ (README + mechanisms.jsonl) and ~/workspace/orca-finish/wave1/authority-mcp/ (APPROVAL-GAP.md, AUTHORITY-BOUNDARY-MAP.md, from repo /home/nolan/ping @ cc6856c3bc78e0535e66f168c66dc31abee2c073, an older PING commit than the current 81b3248).
- Workspace-wide grep for atproto/activitypub/nostr/fedify/lexicon/nsec/npub/NIP: no implementation touchpoints. Only cron-doc noise. Protocol presence in PING/FYD/CRX is aspirational docs only (99H plan harvest directions, semantic-experience-compiler future backends).

Net: every candidate below was evaluated against external primary sources first, and local state was checked for existing implementations before any external evaluation, per the order.

## Standing local facts that shape every classification

1. PING has NO MCP transport, client, or server. The CRX MCP map proves it: zero MCP servers configured, zero tool_calls repo-wide, no stdio/HTTP/SSE/JSON-RPC MCP transport, and mcp/ping_mcp_server.py is not an MCP server (plain requests.get() calls to an undefined mission-control:8000 service). Any MCP work starts from zero code, which is why WRAP-the-official-SDK is the only sane posture.
2. PING's internal tool path is dormant and fail-open. The audit documents: ToolAuthority._checkToolPermission returns allowed:true when no permission authority is wired; ToolGateway has no authorization concept; argument validation is a weak custom validator that ignores JSON-Schema required; retries overwrite history; execution IDs are hash(tool+timestamp) so retries are undedupeable. This is the DUPLICATION TO KILL / PATTERN TO KILL set: the weak custom validator is exactly what Lexicon-style generated validation replaces, and the fail-open permission check is exactly what capability-scoped tokens plus PING-side approval must replace.
3. PING has a documented approval gap (orca-finish APPROVAL-GAP.md): no canonical proposal schema binding principal/operation/arguments/target/scope/expiration/preconditions, no proposal digest, no stale-on-change. MCP's spec does NOT provide per-call authorization (confirm-at-connect; verified below). Therefore the approval authority MUST live in PING, in front of any MCP perimeter. MCP can never be the authorizer.
4. The 99H plan's harvest directions (binding context, not my invention): ATProto -> harvest SCHEMA/IDENTITY/PERMISSION/SYNC/PROJECTION; MCP -> PING keeps AUTHORITY/CAPABILITY/EVENT/EVIDENCE/OUTCOME and exposes capabilities through MCP as the external perimeter (stateless core, Tasks, structured denial/async approval proposals); ActivityPub/Fedify stays an ADAPTER outside the trust kernel (the plan cites recent Fedify actor-authentication fixes as the warning; this lane did not independently verify the Fedify fixes and marks them plan-referenced).
5. The semantic experience compiler (99H plan, DIRECTIVE 3) already names ActivityPub, ATProto, and agent interfaces as future projection backends of one ObjectGraph compiler. That is the correct architectural home for all of these: adapters and projections, never authorities.

---

## Candidate 1: MCP (Model Context Protocol)

PRODUCT NEED -> An external, standard perimeter so outside agents (Claude, IDEs, partner tools) can discover and call PING capabilities, and so PING can expose one FYD capability surface to the agent ecosystem without hand-rolling a wire protocol.

FYD CURRENT IMPLEMENTATION -> None. No agent/tool boundary exists in FYD. The 99H plan lists an "agent interface" as a future projection backend of the semantic experience compiler. Aspirational only.

PING EXISTING IMPLEMENTATION -> No MCP touchpoint in the repo. The CRX audit is the evidence: no MCP transport/client/server code ever ran; the one file named mcp is an archaeological proxy, not a server. Internal tool machinery exists but is dormant, fail-open, and unvalidated (see local facts above). So: zero MCP implementation, and the internal tool layer it would front is itself unconnected.

CRX HARVESTABLE IMPLEMENTATION -> The CRX MCP map is harvestable as NEGATIVE evidence: fail-open permission check, custom validator that ignores JSON-Schema required, execution IDs that make retries undedupeable, history-overwriting retry, wipeable in-memory audit, stub tools, no timeouts, no cancellation, no principal minting. Harvest the forensic questions, not the code: outcome-state machine with first-class UNKNOWN, dispatch journal location, idempotency-key format and minter, principal minting point. None of the code is reusable.

EXTERNAL IMPLEMENTATION -> Verified from primary sources (modelcontextprotocol/typescript-sdk README, modelcontextprotocol.io spec 2026-07-28 via multiple consistent deep dives):
- Protocol revision 2026-07-28 is current; TypeScript SDK v2 (@modelcontextprotocol/server, @modelcontextprotocol/client) is the stable line, MIT licensed, implementing that revision. Protocol revisions are date strings, not "v2"; the SDK generation is what is called v2.
- Stateless core: initialize handshake and Mcp-Session-Id are gone. Every request carries protocolVersion and clientCapabilities in _meta; capability discovery is the mandatory server/discover RPC; routable headers (MCP-Protocol-Version, Mcp-Method, Mcp-Name) let gateways route without parsing bodies.
- Schema evolution: per-request version negotiation with explicit mismatch errors (-32022 on mismatch), era negotiation in SDKs, Tools spec as the versioned contract surface.
- Capability discovery: server/discover (mandatory to implement), then tools/list, prompts/list, resources/list. Lists are cacheable (ttlMs + cacheScope) and MUST NOT vary per connection in the stateless era; the older Tools spec said tools/list MAY vary by authorization presented. Net: per-request scope filtering is server-implementation behavior, connection-stable caching is protocol behavior. A PING-side MCP server must reconcile these two verified facts in its design.
- Typed operations: JSON-RPC methods with required resultType; Multi Round-Trip Requests replace server-initiated sampling/elicitation/roots (server returns input_required + requestState, client retries with inputResponses).
- Tasks extension (io.modelcontextprotocol/tasks): poll-based tasks/get, tasks/update for mid-flight input, cooperative tasks/cancel, statuses working / input_required / completed / failed / cancelled. This is the protocol-native shape for long-running, approval-gated, or deniable work.
- Authorization: OAuth 2.1 based. The Tools spec's Security Considerations are normative for servers: validate token audience, map scopes to tools, per-tool authorization is explicitly allowed, input validation and output sanitization are server MUSTs. Granularity is server convention, not spec: verified implementations use additive scope levels (mcp:connect at initialize, separate tools_list vs tools_call scopes, per-tool scopes via annotations) and the one-token-one-decision pattern (each MCP tool is the face of one REST operation and inherits that operation's scope).
- Verified gap: the spec defines NO per-call authorization or consent after connection. Post-handshake tools/call is unrestricted within the granted scope. Client-side per-call consent is left to implementations (SEP-1024 covers install-time consent for local servers, not per-call consent, and is not core spec). Third-party security analysis calls this the confirm-at-connect model and recommends per-call confirmation for sensitive tools as client-side augmentation.

REACHED -> REACHED. Primary sources verified.

DUPLICATION RISK -> HIGH if PING hand-rolls framing, versioning, discovery, or task polling: the SDK already does it. LOW if the SDK is wrapped behind PING's capability interface. Structural risk: adopting MCP's coarse OAuth scope model as PING's authorization authority, which the plan explicitly forbids (PING keeps AUTHORITY).

SECURITY/TRUST BOUNDARY -> MCP is the EXTERNAL PERIMETER, outside the trust kernel. Boundaries to enforce: OAuth token audience validation (tokens issued for this server only); scope-to-tool mapping decided by PING's capability authority, not by the client; tool descriptions and annotations are untrusted input (prompt-injection vector) for anything aggregating third-party servers; confused-deputy and token-passthrough risks are documented in MCP's own security guidance, so the server must never forward foreign tokens downstream and downstream calls must preserve caller attribution. The per-call approval gap means PING's approval/proposal authority must gate tools/call in front of the SDK. The 99H plan's "structured denial/async approval proposals" maps cleanly onto the Tasks extension's input_required status.

SMALLEST DELTA -> When (and only when) a reached product arrow needs an external agent to act on a PING capability: one official TS SDK v2 server, each MCP tool bound 1:1 to a PING capability, tools/list filtered by the caller's granted scopes, every tools/call admitted by PING's capability/approval authority, long-running or approval-gated work expressed through the Tasks extension. Until that arrow is reached: no code, keep as reference.

ADOPT / WRAP / ADAPT / LEARN / REJECT / REFERENCE -> WRAP. Harvest map: EXTERNAL GOLD. Take the official SDK as a dependency, use it behind PING's own capability/approval interface, never as the authority. Timing: no writer time until a reached product arrow needs the external perimeter.

---

## Candidate 2: ATProto / Lexicons (schema, identity, permissions)

PRODUCT NEED -> Typed, machine-published schema contracts for records and operations; schema evolution without breaking readers; granular, capability-scoped authorization; stable identity references; replayable sync/projection feeds.

FYD CURRENT IMPLEMENTATION -> None. ATProto appears only as a named future projection backend in the semantic experience compiler. No lexicon-like schema publishing exists in FYD.

PING EXISTING IMPLEMENTATION -> No ATProto touchpoints found. The closest local evidence is negative: PING's current parameter validation is a weak custom validator that ignores JSON-Schema required (CRX MCP map), which is the exact weakness the Lexicon direction (schema -> validator -> generated types) eliminates. No machine-published schema layer exists in the repo.

CRX HARVESTABLE IMPLEMENTATION -> Nothing ATProto-specific in CRX.

EXTERNAL IMPLEMENTATION -> Verified from primary sources (bluesky-social/atproto READMEs for packages/api, packages/xrpc, packages/lex/lex; atproto-website oauth-patterns guide; community OAuth references consistent with the spec grammar):
- Lexicon: a JSON schema definition language (like JSON Schema/OpenAPI) with NSID namespacing (com.atproto.*, app.bsky.*). Current guidance: new apps start with @atproto/lex, the type-safe SDK, not the broad @atproto/api client. Workflow: lex install <nsids> -> lexicons.json manifest pinning each schema by CID -> lex build -> generated TypeScript with type-safe validation, type guards, and builder utilities. This is the schema->validator->types direction the prior intelligence described, and it is verified as the project's stated recommendation.
- Schema evolution: NSID-versioned, machine-published schemas; clients pin by content ID. New schema versions are new lexicon documents; old readers keep working against the pinned version they installed. (Jetstream v2 replay and Sync 1.1 are named in the 99H plan as harvest targets; this lane did not verify their current versions from primary sources and marks them plan-referenced.)
- Identity references: DIDs plus human-readable handles, resolved through DID documents. Portable across hosts. This is the part PING must NOT adopt as an authority: tenant identity and the identity freeze are binding local law.
- Typed operations: XRPC, HTTP + Lexicon-validated params/input/output; the xrpc client validates against the lexicon schemas it was built with.
- Permission pattern (the strongest harvest): granular OAuth scopes with a machine-readable grammar, resource:positional?param=value. Verified shapes: repo:<nsid>[?action=create&action=update&action=delete] (per-collection write rights), rpc:<lxm>?aud=<did> (one XRPC method on one service audience; both sides wildcarded is forbidden), blob:<mime-pattern>, account:<attr>[?action=read|manage], identity:<attr>, include:<nsid> (named permission sets, themselves Lexicon docs of type permission-set, expanded at authorize time). The official oauth-patterns guide documents progressive consent: start with minimal scopes, let the user select which permissions to grant before authorization, request more later as the user opts into features. Scope strings are space-separated and checked by the resource server per request.

REACHED -> REACHED. Primary sources verified.

DUPLICATION RISK -> MEDIUM-HIGH. If PING defines its own capability/record schema language and its own ad-hoc scope strings, it duplicates Lexicon semantics and ATProto's scope grammar with weaker versions. Risk of the wrong adoption: importing DIDs/handles as PING's identity authority (forbidden by the identity freeze) or importing Sync as a second event spine (forbidden by the continuity guardrail: no second event system).

SECURITY/TRUST BOUNDARY -> Scopes are enforced by the resource server per request; permission sets expand at authorize time so the hot path never needs network access; client metadata is published and validated; DPoP-bound tokens. The pattern to port: machine-readable scope grammar + server-side enforcement + progressive, user-visible consent. The identity system stays OUT: PING's tenant identity is the authority, DIDs are at most an external identifier format for federated projections, never the owner of identity.

SMALLEST DELTA -> ADAPT, in three separable pieces, none requiring the ATProto stack: (1) a Lexicon-direction schema pipeline for PING capabilities/records: published schema docs, content-hash pinning, generated validators and types, replacing the weak custom validators; (2) a scope grammar for PING capability grants shaped like repo:/rpc: (resource, collection/operation, action parameters), so tokens are capability-scoped by construction and tools/list equivalents reflect only authorized tools; (3) progressive consent: start agents/sessions with minimal scopes and escalate through new proposal/approval cycles, mirroring the official oauth-patterns flow. Do not adopt: DIDs as identity authority, Sync/firehose as event spine, the @atproto SDKs as dependencies.

ADOPT / WRAP / ADAPT / LEARN / REJECT / REFERENCE -> ADAPT. Harvest map: PATTERN GOLD. Port the schema pipeline direction, the scope grammar, and progressive consent into PING's own code. Keep the SDKs and the identity/sync systems as REFERENCE only, with explicit non-adoption recorded.

---

## Candidate 3: ActivityPub (W3C federation)

PRODUCT NEED -> Federated distribution: FYD objects appearing natively in the fediverse (followers, replies, boosts) as one projection backend of the semantic experience compiler.

FYD CURRENT IMPLEMENTATION -> None. Named only as a future backend. No actor/inbox/outbox code exists.

PING EXISTING IMPLEMENTATION -> No ActivityPub touchpoints found. None in the audit, none in the repo evidence available to this lane.

CRX HARVESTABLE IMPLEMENTATION -> Nothing ActivityPub-specific in CRX.

EXTERNAL IMPLEMENTATION -> Verified from primary sources (W3C ActivityPub and ActivityStreams 2.0 recommendations; multiple current implementation docs consistent with the spec):
- Two layers: server-to-server federation and client-to-server. Actors with mandatory inbox and outbox, recommended followers/following collections, optional liked collections. ActivityStreams 2.0 vocabulary in JSON-LD.
- Identity: actor URIs, dereferenceable over HTTPS. Discovery: WebFinger (acct: -> actor) in practice, NodeInfo 2.1 for instance metadata. The actor document's endpoints map can advertise additional endpoints (proxyUrl, oauthAuthorizationEndpoint), which is the protocol's native capability-advertisement surface.
- Typed operations: the ActivityStreams vocabulary (Create, Update, Delete, Follow, Accept, Like, Announce, Undo, plus extensions). Schema evolution is vocabulary extension in JSON-LD: flexible, but no machine-readable contract, so breaking changes are a social coordination problem, not a versioned-schema problem.
- Authorization: server-to-server trust is HTTP Signatures (draft-cavage) on delivery plus optional linked-data object signatures. There is NO capability-scoped or per-operation authorization model in the protocol. Client-to-server auth in practice is OAuth bearer tokens, but that is deployment convention, not protocol. The 99H plan's warning (recent Fedify actor-authentication fixes) is plan-referenced; this lane treats it as corroboration that the actor-authentication seam is the fragile one.
- Delivery model: signed fan-out POSTs to follower inboxes, shared inbox for efficiency, retry/backoff queues, activity-id dedup. This is a durable-delivery pattern worth learning from, not a trust pattern.

REACHED -> REACHED. Primary sources verified.

DUPLICATION RISK -> LOW for PING core, MEDIUM for FYD if FYD ever hand-rolls federation plumbing. The negative-roadmap entry writes itself: FYD WILL NOT BUILD its own ActivityPub server; when a reached arrow needs federation, the Fedify library is the WRAP candidate, exactly as the plan already positions it (adapter outside the trust kernel).

SECURITY/TRUST BOUNDARY -> ActivityPub is an UNTRUSTED adapter, strictly outside the trust kernel. Inbound activities are observations, never claims: they enter as UNVERIFIED and pass through the same verification gate as any other external input (the Meta AI rule applies by analogy: raw with provenance, never promoted directly into canonical claims). Signature verification authenticates the delivering server, not the truth of the content. Outbound, FYD objects project to activities; the canonical object stays in PING.

SMALLEST DELTA -> No code now. When a reached product arrow needs fediverse presence: Fedify as the adapter behind the projection interface; inbound activities land in the observation plane with provenance sidecars; outbound activities are compiled from canonical objects. Harvest the small patterns meanwhile: the actor-document endpoints map as a capability-advertisement convention, and WebFinger/NodeInfo as a discovery convention for PING's own service metadata.

ADOPT / WRAP / ADAPT / LEARN / REJECT / REFERENCE -> LEARN. Harvest map: OPTIONALITY TO PRESERVE (Fedify as the future WRAP candidate) with the explicit negative entry: never build a bespoke ActivityPub implementation, and never let federation touch the trust kernel. Inbound-as-UNVERIFIED-observation is the pattern to internalize now.

---

## Candidate 4: Nostr (NIPs)

PRODUCT NEED -> A minimal, replaceable event transport; a key-custody and remote-signing model for agents acting near a key they do not hold; a cautionary example of what not to build (universal job markets).

FYD CURRENT IMPLEMENTATION -> None. No Nostr touchpoints.

PING EXISTING IMPLEMENTATION -> No Nostr touchpoints found.

CRX HARVESTABLE IMPLEMENTATION -> Nothing Nostr-specific in CRX.

EXTERNAL IMPLEMENTATION -> Verified from primary sources (nostr-protocol/nips 46.md; nostr-book third-parties chapter; implementation docs for NIP-07/NIP-33/NIP-42/NIP-44/NIP-47):
- Transport: dumb relays, pub/sub with filters. Relays are trivially replaceable; all semantics live in clients and signed events. This is the cleanest real-world proof of the replaceable-transport principle the plan demands: the protocol survives relay removal because nothing canonical lives in the relay.
- Identity: NIP-19 encodings (npub/nsec/naddr), NIP-05 DNS verification, NIP-39 external identity claims. Key = identity, no registrar.
- Schema evolution: NIP-01 event envelope (kind/tags/pubkey/sig) is fixed and tiny; NIP-33 parameterized replaceable events (kinds 30000-39999 with a d tag) give mutable, addressable records on an immutable transport. That is a directly portable convention for anything PING needs to version in place.
- Typed operations: kinds are the type system (1 = note, 0 = profile, etc.), tags carry structured parameters. Crude but honest: no hidden semantics.
- Permission pattern (the strongest harvest): NIP-46, Nostr Connect. The key lives in a bunker (remote signer); apps request signing over a relay. The connect method accepts requested permissions as a comma-separated method[:params] grammar, e.g. sign_event:4 (sign only kind-4 events). Implementations add per-domain and per-method/per-kind isolation, and the bunker runs its own approval for ask/allow. The spec warns that client-supplied metadata is a display hint only and MUST NOT drive authorization decisions. This is progressive consent plus key-custody separation in one mechanism: the agent acts near the key without holding it, and the signer pre-authorizes narrow method+param grants.
- Relay auth: NIP-42 (sign the challenge). HTTP auth: NIP-98 (signed events as bearer tokens), an elegant pattern for binding HTTP calls to key identity without passwords.
- The cautionary tale: NIP-90, data vending machines (job request kind 5000+, result 6000+, status 7000), is explicitly unrecommended by the nostr-book maintainers: the spec grew until it tried to be every API at once; prefer small use-case-specific conventions. PING's missions are already the typed work queue; a NIP-90-style universal job market is the negative entry: never build it.

REACHED -> REACHED. Primary sources verified.

DUPLICATION RISK -> LOW. Nobody should build PING's substrate on Nostr. The value is patterns and the negative lesson. Minor risk: re-deriving NIP-46's permission grammar badly when PING needs agent signing delegation.

SECURITY/TRUST BOUNDARY -> Relays are untrusted by design; signatures verify end-to-end. NIP-46's trust sits in the bunker, not the transport: client metadata untrusted, approval interactive or pre-granted per method+params. The lesson for PING: separate key custody from execution (the signer is its own authority with its own approval surface), and never let the transport layer make authorization decisions.

SMALLEST DELTA -> None in code. Port two conventions when PING needs them: (1) NIP-33-style parameterized replaceable records (d-tag addressing) for mutable records on immutable logs; (2) NIP-46-style requested-permission grammar (method[:params]) and bunker separation for any future agent key-delegation, wired to PING's own approval authority. Record NIP-90 as the explicit REJECT precedent for universal-job-market proposals.

ADOPT / WRAP / ADAPT / LEARN / REJECT / REFERENCE -> LEARN. Harvest map: PATTERN GOLD for NIP-46 and NIP-33; REJECTED (as a substrate direction) with NIP-90 as the named negative precedent.

---

## Cross-cutting harvest: permission and progressive-consent patterns (authorization-lane handshake)

All four protocols converge on the same shape, and it is the shape PING's capability layer is missing:

1. Capability-scoped tokens with a machine-readable grammar. ATProto: resource:positional?param=value (repo:<nsid>?action=create, rpc:<lxm>?aud=<did>). NIP-46: method[:params] (sign_event:4). MCP in practice: additive scope levels with per-tool mapping and tools/list reflecting only authorized tools. PING's approval gap (no canonical proposal schema, fail-open permission check) is exactly what this grammar class fixes: a token names the resource, the operation, and the parameters it may touch.
2. Progressive consent. ATProto's official guidance: start with minimal scopes, let the user select grants before authorization, request more later as features are opted into. NIP-46: pre-authorize narrow grants in connect, interactive approval for the rest. MCP: confirm-at-connect is the spec's ceiling, so per-call approval must be built by the implementer. For PING: agents and sessions start with minimal capability grants; escalation is a new proposal through the approval authority, never silent broadening.
3. Visibility follows authorization. tools/list (MCP), the scope-filtered tool catalog (Monday/TotalCMS/Remit patterns), and permission-set expansion all implement the same rule: discovery surfaces show only what the presented authorization permits. PING's capability discovery must do the same, or enumeration becomes the bypass.
4. Key custody is its own authority. NIP-46's bunker, ATProto's DPoP-bound tokens, MCP's audience-validated tokens: the thing that signs or authorizes is separate from the thing that executes, and its approval surface is explicit. PING's ORCA-never-authorizes-itself rule and the exact-proposal-digest requirement are the local expression of the same principle.

The authorization lane should treat (1) and (2) as ADAPT targets for the capability-token design; this lane's contribution is the verified external grammar shapes to copy from.

---

## The lane's answer: what code can we DELETE or NEVER WRITE

1. Never write a custom agent wire protocol. When an external agent perimeter is reached, WRAP the official MCP TypeScript SDK v2. The framing, versioning, discovery, and task polling are solved commodity. (Deletes ambition, not code, since none exists.)
2. Kill the weak custom parameter validator. The CRX audit proves PING's ToolGateway validation ignores JSON-Schema required and nested/enum checks. Replace with generated validators from published, content-pinned schemas, in the Lexicon direction (schema -> validator -> types). DUPLICATION TO KILL.
3. Never write a custom schema-definition language. ADAPT the Lexicon pipeline pattern (published schema docs, CID/hash pinning, codegen) instead of inventing PING-Schema.
4. Never write ad-hoc scope strings. ADAPT the ATProto/NIP-46 scope grammar shape (resource:operation:params) for capability grants.
5. Never build an ActivityPub implementation. Negative roadmap entry: FYD WILL NOT BUILD its own AP server; Fedify is the future WRAP candidate as an adapter outside the trust kernel.
6. Never build a universal job market. NIP-90 is the named negative precedent; PING missions are already the typed work queue.
7. Never build a second event spine out of federation sync. Sync/firehose/Jetstream patterns stay projection adapters feeding PING's existing event system, per the continuity guardrail.
8. Never let MCP be the authorizer. The spec has no per-call authorization; PING's approval authority gates every tools/call. This is a constraint, not code, but it kills an entire class of future integration bugs.

---

## Ranked candidates

1. MCP (official TypeScript SDK v2) -> WRAP. The only dependency-grade candidate: when a reached product arrow needs an external agent perimeter, wrap the official SDK behind PING's capability/approval interface. Justification: the transport, versioning, discovery, and Tasks machinery are mature commodity, and PING has zero MCP code to protect, but the spec's missing per-call authorization means PING must keep AUTHORITY and treat MCP as the external perimeter only.

2. ATProto Lexicons plus granular scopes -> ADAPT. Port the schema->validator->types pipeline with content-hash pinning, the scope grammar (resource:positional?params), and progressive consent into PING's own capability layer. Justification: this is the strongest verified pattern for typed operations plus capability-scoped authorization in the survey, and it directly repairs PING's two documented local defects (weak custom validators, fail-open permission checks). Explicitly excluded: DIDs as identity authority and Sync as an event spine.

3. Nostr NIP-46 and NIP-33 -> LEARN. Remote-signer permission grammar (method[:params]) with key-custody separation, and parameterized replaceable records (d-tag) for mutable records on immutable logs. Justification: the cleanest small-scale model of progressive consent plus replaceable transport in the survey; NIP-90 stands as the explicit REJECT precedent against universal job markets.

4. ActivityPub -> LEARN. Keep as a future projection adapter strictly outside the trust kernel; inbound activities enter as UNVERIFIED observations. Justification: federation is a distribution concern, not a truth concern; the protocol has no capability-scoped authorization model, so its only safe posture is adapter-plus-observation-gate, with Fedify as the future WRAP candidate and an explicit negative-roadmap entry against building our own implementation.

5. Capability-scoped tokens with visibility-follows-authorization (cross-cutting) -> ADAPT. A token grammar naming resource, operation, and parameters; discovery surfaces filtered by granted scopes; escalation only through new proposal/approval cycles. Justification: all four protocols converge on this shape, it is the missing piece in PING's documented approval gap, and it is the concrete handshake this lane offers the authorization lane.
