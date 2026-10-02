# FYD Social Sprint: Harvest Manifest

Harvest date: 2026-09-21. Read-only harvest, no repo edits, nothing committed.
Harvested BEFORE build, per Nolan's 2026-09-21 CEO directive.

Rule used throughout: "does FYD need this in the hot path?" Yes = extract/wrap,
No = leave it under PING. PING stays the authority; FYD is a product surface.

Source SHAs:
- /home/nolan/ping (convergence worktree, branch refactor/runtime-authority-convergence): 9bcccaa23fe91aad8db425f65552f2fb2cdbb7a1
- /home/nolan/projects/ping (FYD web repo, main): 1233ed2a5ce53548ee37687b2bf642999977982c
  (17 dirty files observed, untouched, treated as owned state)

License: no LICENSE file found in either repo during harvest. Assume proprietary
Nolan Geske unless the sprint coordinator confirms otherwise. ATProto/MCP spec
content is specification text (harvest as patterns, do not vend).

---

## (a) In-repo PING primitives worth reusing in the hot path

### A1. Canonical envelope kit (sign + hash + verify)
- SOURCE: /home/nolan/ping/runtime/constitutional/src/ping-identity.ts (215 lines),
  ping-canonical-envelope.ts (199 lines), hash-authority.ts (HashAuthority)
- LICENSE: proprietary assumed (see header)
- VERSION/SHA: 9bcccaa23fe91aad8db425f65552f2fb2cdbb7a1
- PURPOSE: Ed25519 key generation, canonical byte construction, payload_hash =
  SHA-256 of canonical bytes, signature over canonical bytes that COMMIT to the
  hash, proof envelope {verification_method, signature, public_key}. Recovered
  2026-09-21 from live Oracle journal events and verified against them
  (identity 1396dd22, profile object_b033d599, P3 2c7a2123).
- BYTES/DEPENDENCY COST: pure TypeScript, node:crypto built-in, zero npm deps.
  Estimated ~15KB source extracted.
- FYD WRAPPER: thin module `fyd/envelope` exporting `canonicalBytes(obj)`,
  `signEnvelope(payload, signFn)`, `verifyEnvelope(envelope)`. Key custody stays
  with caller: module shapes bytes only, never sees private keys.
- TEST: byte-equality test: take a known live Oracle event, re-run
  `signEnvelope` on its stripped payload with the test key, assert signature and
  payload_hash match exactly. Plus a tamper test: flip one byte, verify fails.
- VERDICT: KEEP. Highest-leverage primitive in this harvest. This is how Ask FYD
  site-patch proposals get signed, and how the proposal digest binds the payload.

### A2. Canonical JSON serializer (RFC-8785 JCS)
- SOURCE: /home/nolan/ping/runtime/kernel/replay/canonical_json.ts
  (+ canonical_hash_authority.ts delegating to it)
- LICENSE: proprietary assumed
- VERSION/SHA: 9bcccaa23fe91aad8db425f65552f2fb2cdbb7a1
- PURPOSE: Pure TS RFC-8785 canonicalization: lexicographic property order,
  deterministic numbers, depth guard (64), rejects BigInt/Symbol/Function.
  CanonicalHashAuthority adds versioned SHA-256 fingerprinting.
- BYTES/DEPENDENCY COST: zero deps, runtime-neutral (no Buffer, no Node crypto).
  ~8KB source.
- FYD WRAPPER: use as the canonical serializer under A1, or keep as the
  reference implementation the wrapper delegates to.
- TEST: canonicalize a shuffled-key fixture, assert byte-stable output across
  runs; assert circular-reference and depth-guard failures are typed errors.
- VERDICT: KEEP, with one open question. There is a duality to resolve: the
  constitutional TS subsystem (hash-authority.ts) documents "UTF-16 default
  sort" while CanonicalJson claims RFC-8785. The live-verified envelope (A1)
  goes through HashAuthority. FYD must pin exactly ONE serializer before
  building the proposal signing path. Named as the next valuable improvement
  below.

### A3. Social vocabulary + relationship semantics
- SOURCE: /home/nolan/ping/runtime/constitutional/src/ping-vocabulary.ts (201 lines)
- LICENSE: proprietary assumed
- VERSION/SHA: 9bcccaa23fe91aad8db425f65552f2fb2cdbb7a1
- PURPOSE: SOCIAL_PREDICATES (follows, likes, replies_to, approves, denies),
  REVOCABLE_PREDICATES, FORBIDDEN_PREDICATES (no unfollow/unlike predicates;
  revocation is a second RELATIONSHIP_CREATED with status inactive, last-wins by
  acceptance sequence), SOCIAL_SCHEMAS list (includes ping.social.proposal@1),
  projector operations create/update/relate, visibility values.
- BYTES/DEPENDENCY COST: zero deps, ~5KB of constants and types.
- FYD WRAPPER: `fyd/vocabulary` constants module; the proceduralizer's relate
  stage and the site-patch approval flow consume `approves`/`denies` predicates
  directly instead of inventing new ones.
- TEST: unit test that a `likes` event with status inactive revokes the active
  one by acceptance sequence; test that an `unfollows` payload is rejected.
- VERDICT: KEEP. The approves/denies + proposal@1 vocabulary is the cheapest
  way to wire Ask FYD site-patch approvals without designing a new contract.

### A4. Executor-facing capability registry (as NEGATIVE pattern)
- SOURCE: /home/nolan/ping/runtime/kernel/capabilities/capability-authority.ts,
  capability-contract.ts, capability-registry.ts, capability-resolver.ts
- LICENSE: proprietary assumed
- VERSION/SHA: 9bcccaa23fe91aad8db425f65552f2fb2cdbb7a1
- PURPOSE: Registers executor capabilities with resource contracts
  (maxCPU/maxMemory), replay contracts (replayable/deterministic/idempotent),
  policy contracts, and resolves by input/output types.
- BYTES/DEPENDENCY COST: small, zero deps.
- VERDICT: REMOVE from the FYD grant design. This is worker-capability
  resolution (which executor can run X), not user-facing grants (who may do Y to
  whose site). Confusing the two would be an architectural error. FYD needs a
  NEW grant authority shaped by ATProto permission sets (see section d).
  Reuse only the contract-shape idea (input/output/policy/replay contracts) as
  the shape of FYD action descriptors.

### A5. Replay/witness/certificate machinery
- SOURCE: /home/nolan/ping/runtime/kernel/replay/* (certificate_authority,
  witness_authority, deterministic_replay_engine, replay_verification)
- LICENSE: proprietary assumed
- VERSION/SHA: 9bcccaa23fe91aad8db425f65552f2fb2cdbb7a1
- PURPOSE: Constitutional replay, certificates, witnesses.
- VERDICT: REMOVE from the hot path. Leave under PING. FYD cites evidence
  references and digests; it never replays. If a dispute needs replay, call
  through the gateway to PING.

---

## (b) Web/product builders already present in the FYD repo

The FYD repo (projects/ping) already contains a large working base. The sprint
builds on it, it does not rebuild it.

### B1. PingObjectReader (server-side BFF)
- SOURCE: src/lib/ping/ping-object-reader.ts (1237 lines)
- PURPOSE: The single server-side adapter between the website and the PING
  gateway. Reads via PING_GATEWAY_BASE_URL, sanitizes to browser-safe shapes,
  submits signed canonical envelopes for writes, throws typed machine-readable
  errors when the gateway is unavailable. Nothing faked. Browser never sees raw
  journal shapes.
- BYTES/DEPENDENCY COST: zero new deps.
- FYD WRAPPER: keep as-is; this IS the FYD read/projection path for the site
  builder. The proceduralizer's resolve/relate/project stages plug into it.
- TEST: existing contract: every method throws a typed error with a
  machine-readable code when the gateway is unconfigured. Add a fixture test:
  mock gateway responses, assert browser shapes contain no raw event fields.
- VERDICT: KEEP. This is the FYD hot path read boundary.

### B2. Proposal digest + human approval route (the Ask FYD pattern)
- SOURCE: src/lib/ping/ask-composer.ts (469 lines; proposalDigest,
  verifyProposalDigest, sha256-canonical-json-v1), src/app/api/ping/proposal/route.ts
- PURPOSE: Agents DRAFT proposals only; they cannot publish. A human approves
  the exact digest through the proposal endpoint, which re-verifies the digest
  server-side before submitting the governed signed envelope. Kinds:
  object_update, object_create.
- BYTES/DEPENDENCY COST: node:crypto only.
- FYD WRAPPER: generalize `ProposalBody` kinds to include `site_patch`
  (target page, target slot, component, props diff). Keep the digest law:
  approval covers the exact bytes, any modification after drafting fails.
- TEST: draft a site-patch proposal, tamper one prop byte, assert
  verifyProposalDigest fails and the route rejects with a machine-readable code.
- VERDICT: KEEP. This is the Ask FYD site-patch proposal contract, already built.
  Note the canonicalizer here (local canonicalize in ask-composer, line 49)
  should converge with A1/A2, same duality as A2.

### B3. Action planner (capability-bound actions, pure and deterministic)
- SOURCE: src/lib/ping/action-planner.ts (151 lines)
- PURPOSE: Pure function: same output drives the human UI action row and the
  agent context builder, so humans and agents see the same available actions.
  Rules: open/ask/reference always for known objects; follow/unfollow only
  identity-backed schemas; like/unlike only content objects; reply on posts for
  signed-in viewer; propose_update only when viewer controls the object;
  open_website only when a public URL exists.
- BYTES/DEPENDENCY COST: zero deps.
- FYD WRAPPER: extend the rule table with site capabilities (site.propose,
  site.read, object.reference) driven by the grant set (section d pattern).
  Keep the purity law: planner is a pure function of (viewer, target, grants).
- TEST: table-driven test over (schema x viewer relation) asserting the exact
  planned action set; add a grant-denied case asserting propose_update vanishes.
- VERDICT: KEEP. This is the capability-bound action pattern the sprint needs.

### B4. Component registry family (slots, icons, website structure)
- SOURCE: src/lib/editor/slot-registry.ts (124 lines; components register
  themselves, duplicate registration with different props throws),
  src/components/icon-registry.ts (VALID_ICONS allowlist),
  src/lib/website-structure.ts (Route -> Page -> Component -> Section -> Slot),
  src/components/visual-slot.tsx
- PURPOSE: Self-registration of editable regions with constraint validation;
  icon name allowlist for config-driven rendering; a static site structure map
  for the workbench.
- BYTES/DEPENDENCY COST: zero deps.
- FYD WRAPPER: the declarative SiteSpec generator emits a component tree whose
  nodes resolve through a registry with this exact contract: components
  declare themselves, unknown schemas fall back to GenericObjectCard, and
  duplicate/conflicting registrations are rejected loudly.
- TEST: register two components with the same slotId and different constraints,
  assert throw; resolve an unknown schema, assert GenericObjectCard.
- VERDICT: KEEP the registry CONTRACT and slot-registry code.
  website-structure.ts's static WEBSITE_STRUCTURE is hand-built analysis
  output, not a generator; do not treat it as the SiteSpec source. It becomes a
  projection target, regenerated from SiteSpec.

### B5. Canonical editor service + command pattern
- SOURCE: src/lib/editor/canonical-editor-service.ts (252 lines),
  src/lib/editor/command-pattern.ts, src/lib/editor/sequence-authority.ts,
  src/lib/editor/durable-event-store.ts
- PURPOSE: UI emits simple intents (set-media, move, swap, remove, duplicate,
  crop, focus); the canonicalizer resolves targets, constraints, media policy;
  the service builds validated commands and produces events. Law: "UI does not
  mutate graph."
- BYTES/DEPENDENCY COST: zero deps beyond existing.
- FYD WRAPPER: the SiteSpec patch pipeline mirrors this: Ask FYD emits a site
  intent, the service resolves it against the registry and constraints,
  produces a signed proposal (B2), human approves, command executes.
- TEST: feed an intent with an unknown target, assert a typed failure; feed a
  valid intent, assert the produced command validates against the schema.
- VERDICT: KEEP the intent -> canonicalize -> command -> validate -> event
  boundary. Do not import durable-event-store into FYD; event persistence stays
  behind the gateway.

### B6. Validation engine (findings-based, two layers)
- SOURCE: src/lib/validation-engine.ts (789 lines), src/lib/findings.ts,
  src/lib/health-rules.ts
- PURPOSE: Schema validation (structure, required fields, types) plus
  constitutional validation (business truth, cross-authority consistency),
  emitting typed Findings aggregated into metrics and a health score.
- BYTES/DEPENDENCY COST: existing deps only.
- FYD WRAPPER: SiteSpec validation reuses the findings shape: a SiteSpec
  validate step returns Findings (severity, authority, resourceId, path) before
  render. Never render an invalid spec; renderers consume only validated specs.
- TEST: feed a spec with a missing required field and a dangling component
  reference, assert exactly two findings with correct paths.
- VERDICT: KEEP the findings shape and the two-layer idea. Do not drag the
  media/project/review authority rules into FYD; those belong to the old site's
  lanes.

### B7. Schema-driven type contracts
- SOURCE: src/lib/ping/types.ts (251 lines; KNOWN_OBJECT_SCHEMAS including
  ping.social.business@1, ping.social.service@1, ping.social.location@1),
  src/config/*.ping.v1.json (tenant, products, services, media, navigation),
  src/types/registries.ts (122 lines)
- PURPOSE: Browser-safe contract shapes; versioned JSON config authorities;
  typed registries for services, cities, galleries.
- BYTES/DEPENDENCY COST: none.
- FYD WRAPPER: the three proof schemas (Business, Service, Post) start here.
  Keep the @1 evolution law from the protocol harvest: new fields optional,
  never change types, never remove, mint @2 for breaks.
- TEST: schema fixture test asserting the three proof schemas validate their
  example records and reject a type-changed field.
- VERDICT: KEEP the contract shapes and config-authority pattern. The
  painting-estimator-specific registry fields stay in their lane.

### B8. Proceduralizer seed pieces (normalize/extract pipeline)
- SOURCE: src/lib/sentiment/ (normalizer.ts, metadata-extractor.ts,
  classifier.ts, duplicate-detector.ts, tag-suggester.ts, quality-scorer.ts,
  audit-trail.ts), src/lib/blog (getAllPosts), src/lib/products (getProducts),
  src/lib/tenant-config (getTenant), src/lib/media-contracts.ts,
  src/lib/visual-asset-registry.ts, src/lib/galleries.ts
- PURPOSE: Stage-structured text pipeline (normalize -> extract -> classify ->
  score -> dedupe, with audit trail); deterministic content readers for blog,
  products, tenant; media contracts and asset registry.
- BYTES/DEPENDENCY COST: existing deps.
- FYD WRAPPER: the proceduralizer's normalize and extract stages reuse the
  normalizer and metadata-extractor SHAPE (not the review-moderation rules).
  The acquire/parse stages wrap getAllPosts/getProducts/getTenant as the
  website-source adapter. B8's website-objects.ts (src/lib/ping/website-objects.ts,
  139 lines) is the model for provenance-labeled projections: kind
  "website-derived", deterministic ids, sorted output, never written to the
  journal.
- TEST: normalize fixture asserting meaning-preserving cleanup; extractor test
  asserting every emitted field traces to a source span (provenance ref).
- VERDICT: KEEP the stage shapes and website-derived projection pattern.
  The review-moderation classifiers stay in their lane (do not import into the
  site builder).

### B9. Dev signer (dev-mode signing stand-in)
- SOURCE: src/lib/ping/dev-signer.ts (141 lines)
- PURPOSE: Ed25519 keygen + sorted-key JSON canonicalization + signing via
  node:crypto, explicitly labeled a dev stand-in, not the constitutional path.
  Keys live in PING_DEV_KEY_DIR outside the repo, 0600.
- BYTES/DEPENDENCY COST: node:crypto only.
- VERDICT: KEEP for dev mode only. Production proposal signing uses A1.
  The sprint must not promote this to production; its own header says so.

---

## (c) MCP patterns (2026-07-28 spec)

Sources: MCP 2026-07-28 spec announcement
(https://blog.modelcontextprotocol.io/posts/2026-07-28/), community analyses
(https://github.com/m3taz-ahmed/ai-globals/blob/HEAD/tech-stack/mcp-2.md,
https://github.com/rinti/ai-roundup/blob/HEAD/roundups/2026-08-01-mcp-goes-stateless-codeberg-schism-and-the-system-prompt-diet.md,
https://github.com/howells/agentsurface/blob/HEAD/src/content/docs/protocols/mcp.mdx).
SDK note: one 2026-07-29 source reports TS SDK 1.30.0 tops out at protocol
2025-11-25; one 2026-08-27 source reports Tier 1 SDKs (TS, Python, Go, C#) now
support 2026-07-28. Treat SDK support as moving; verify at build time.

Harvest as PATTERNS for a future external agent/tool interface around FYD.
PING stays the authority; MCP is interface/protocol, not truth. Do NOT import
an MCP platform or server library.

- P1 Stateless core: no initialize/initialized handshake, no Mcp-Session-Id.
  Every request self-contained (client info in _meta). FYD external agent
  interface: design stateless from day one; any request can land on any
  instance behind round-robin. This matches PING's deterministic, replayable
  semantics. Zero deps (it is a design constraint, not a library).
- P2 server/discover: clients fetch supported versions, capabilities, server
  identity up front. FYD wrapper: a `/discover`-style endpoint on the future
  agent interface returning {protocolVersion, capabilities, serverInfo}.
  KEEP as design.
- P3 Header-based routing: Mcp-Method / Mcp-Name headers so gateways route and
  rate-limit without parsing bodies. FYD wrapper: route agent tool calls by
  headers; WAF/rate-limit friendly. KEEP as design.
- P4 Cacheable listings with TTL: tools/list, resources/list carry cache hints
  (ttlMs) and deterministic order; change notifications via an opt-in
  subscriptions/listen stream. FYD wrapper: the schema -> tool derivation
  (ask-composer agentTool entries) publishes a cacheable tool list; Ask FYD's
  available-action set becomes listable and cacheable. KEEP as design.
- P5 MRTR (multi round-trip requests) via InputRequiredResult: server asks for
  follow-up input (confirmations, parameter gathering) instead of holding
  bidirectional streams. FYD wrapper: this is the wire shape of the proposal
  approval flow (B2): agent returns InputRequired with the proposal digest;
  human approval is the follow-up round trip. KEEP as the UX pattern for
  human-in-the-loop approvals.
- P6 Extensions framework: versioned opt-in extensions (tasks for long-running
  poll-based jobs, apps for server-rendered UI, skills for agent instructions),
  reverse-DNS identifiers. FYD wrapper: long-running proceduralizer jobs
  (crawl -> normalize -> extract) expose a tasks-style poll interface; keep
  extensions namespaced (fyd.*), never touch core protocol. KEEP as design.
- P7 Authorization hardening: OAuth 2.1 resource server alignment, DCR
  deprecated in favor of CIMD, Enterprise Managed Authorization extension.
  FYD wrapper: when the external agent interface needs auth, align with this;
  do not hand-roll token flows. KEEP as a constraint for later.
- In-repo note: /home/nolan/ping/mcp/ping_mcp_server.py is a thin proxy to
  Mission Control ("NO business logic, NO duplicate authority"). Harvest the
  thin-proxy law, not the code: FYD's future agent interface must also be a
  thin proxy over PING authorities.

TEST (for the pattern harvest): a conformance checklist in the FYD interface
design doc: stateless request/response, discover endpoint, cacheable tool
list with TTL, MRTR approval round trip, thin-proxy (no business logic in
the interface layer). Verify by review plus one integration test per item when
built.

---

## (d) ATProto patterns (permissions + Lexicon)

Sources: https://atproto.com/specs/permission (read 2026-09-21),
~/workspace/transfer/protocol-harvest/atproto-schema-lessons.md (2026-09-20,
read-only lane C harvest), ping-schema-sketch.json in the same dir.

Harvest as UX/attenuation patterns for FYD capability grants. Do NOT replace
CapabilityAuthority semantics, do NOT import ATProto.

- T1 Permission resources and attenuation: repo (scoped by collection NSID +
  create/update/delete action), rpc (scoped by lxm endpoint + aud audience),
  blob (scoped by MIME accept), account, identity. String scope syntax:
  resource:positional?params (e.g. `account:repo?action=manage`). FYD wrapper:
  grant strings like `site:example.com?action=propose`,
  `object:ping.social.post@1?action=create`. A grant on one resource never
  implies another. KEEP as the grant-shape pattern.
- T2 Permission sets: Lexicon-published bundles of permissions with
  user-meaningful titles and summaries shown at consent time, i18n support,
  expandable to granular permissions. Scoped to the set's own NSID hierarchy
  (no cross-namespace grants). FYD wrapper: "help maintain my site" is a
  permission SET presented in human words, expanding to
  site.read + site.propose + object.reference (never site.publish; agents
  propose, humans publish, per B2). Progressive permission requests: ask for
  the small set first, expand only when needed. KEEP as the UX pattern.
- T3 Write-side only: ATProto permissions govern writes; reads and firehose
  are out of scope. FYD wrapper: grants gate mutations (propose, publish,
  reference-as-action); reads flow through the BFF sanitization boundary
  (B1). Do not build a read-permission system on top of ATProto's shape.
- T4 Lexicon schema-derivation chain: one schema fans out to validator,
  TypeScript types, object mapping, relationships, capabilities, renderer,
  agent tool, form. The protocol-harvest dir already sketched this for
  ping.social.post@1 and ping.business.service@1 (ping-schema-sketch.json).
  FYD wrapper: this IS the "schema -> everything" proof for the 3 schemas
  (Business, Service, Post). Codegen order: SCHEMA -> VALIDATOR -> OBJECT ->
  RELATIONSHIPS -> CAPABILITIES -> RENDERER -> AGENT TOOLS. Tools: ajv (JSON
  Schema draft 2020-12, ~1.2MB, new dep for the FYD repo) for validators,
  json-schema-to-typescript (dev only) for types. KEEP as the sprint's core
  codegen pattern.
- T5 Lexicon evolution law: new fields optional, never change types, never
  remove fields, tolerate unknown fields, mint a new version for breaks.
  KEEP verbatim as FYD schema law.
- T6 Small typed vocabulary: app.bsky.actor.profile/post/like/follow validate
  the small-object thesis. FYD wrapper: 3 proof schemas, not 100; typed
  records with stable NSIDs beat class hierarchies. KEEP as scope discipline.
- T7 Strong references and subject-signed relationships: replies carry exact
  URI+CID; likes are the liker's signed record. Maps to A3 (exact object IDs,
  controller-signed events). KEEP.

TEST: grant-shape test asserting `site.propose` does not imply `site.publish`;
permission-set expansion test asserting the human-readable set expands to the
exact granular grant list and nothing more; schema codegen test asserting the
validator, TS type, renderer props, and agent tool description all regenerate
from the single schema file.

---

## (e) Explicit DO-NOT-IMPORT list

1. PING canonical journal write path into the FYD hot path. FYD reads through
   the gateway/BFF (B1) and submits signed envelopes for writes; it never owns
   persistence. Reason: PING is the authority; one writer per semantic store.
2. Both canonicalization rules at once. HashAuthority.canonicalizeObject
   ("UTF-16 default sort") and CanonicalJson (RFC-8785) disagree on paper.
   Reason: signing bytes must be byte-identical everywhere; two rules is a
   consensus failure. Pin one before building proposal signing.
3. dev-signer.ts canonicalization in production. Reason: it is labeled a dev
   stand-in by its own header; production uses A1.
4. PING's executor CapabilityAuthority as the user grant authority.
   Reason: wrong semantic (worker scheduling vs user grants); would produce
   grants that mean nothing to users. Build the new grant authority from T1/T2.
5. PING replay/witness/certificate machinery. Reason: constitutional substrate,
   not product hot path; FYD cites digests and evidence refs.
6. ATProto anything deployable: no PDS, no DIDs for FYD actors, no repo
   storage, no Bluesky posting, no OAuth integration, no Lexicon publishing.
   Reason: harvest-only per standing lane C law; FYD identity is PING identity.
7. An MCP platform/server library as FYD's agent interface. Reason: MCP is
   interface/protocol, not truth; the patterns (P1-P7) are the harvest. The
   existing ping_mcp_server.py thin proxy is Mission Control specific.
8. The full sentiment review-moderation rule set into the site builder.
   Reason: lane-specific; the site builder reuses stage shapes, not rules.
9. Static WEBSITE_STRUCTURE as the SiteSpec source. Reason: it is analysis
   output; SiteSpec generates it, not the reverse.
10. durable-event-store / editor event persistence into FYD. Reason: event
   persistence stays behind the gateway; the BFF is the only bridge.
11. Fedify or any ActivityPub library into the site builder hot path.
   Reason: the protocol-harvest Fedify adapter is inert by default and is a
   projection wire layer only; federation is a later, gated projection, not a
   site-building dependency.
12. New npm dependencies without the cost note. ajv is the one justified
   addition (~1.2MB, validator codegen); everything else in this manifest is
   zero-dep.

---

## Next valuable improvement

Resolve the canonicalization duality (A2) and pin one serializer, then extract
A1 + A3 as a zero-dependency `fyd/envelope` package with a single
byte-equality test against a live Oracle event. Everything downstream (proposal
digests, site-patch signatures, agent tool input binding) depends on this
choice, and it is the cheapest falsifiable step: one test, no new deps, and it
kills an entire class of "works in dev, fails against the journal" bugs before
the sprint builds on it.
