# Archaeology Extraction: Protocols & Harvest Register
**Date:** 2026-09-22 (MDT). Lane: read-only. No files created, edited, or deleted; no git commands; `/home/nolan/projects/ping` untouched; `BACKLOG_NOLAN.md` not read.

## SOURCES REVIEWED
1. `~/workspace/fyd-grill/FYD_ECOSYSTEM_HARVEST.md` (2026-09-21) — 37-target ecosystem verdict table + do-not-import list
2. `~/workspace/fyd-grill/FYD_EXECUTABLE_HARVEST.md` (2026-09-21) — PING/FYD codebase archaeology, Top-15 reuse + G0-G10 gaps, read-only test ledger
3. `~/workspace/fyd-harvest/harvest-report.md` (2026-09-22) — 7-sheet ecosystem lane: json-render, Puck, OpenPage, Webstudio, AI SDK, Crawl4AI, Lightpanda
4. `~/workspace/fyd-lane/builder/harvest/HARVEST-ECOSYSTEM.md` (2026-09-21) — builder-lane harvest matrix (OpenPage SHA 9818eb43, Payload CMS, schema.org v30.0, Crawl4AI 0.9.3, MCP SDK v2)
5. `~/workspace/transfer/harvest/activitypub-semantics.md` (2026-09-20) — AP follow/like lifecycle + PING mapping table
6. `~/workspace/transfer/harvest/atproto-lessons.md` (2026-09-20) — 9 ATProto lessons mapped to PING
7. `~/workspace/transfer/harvest/fedify-decision.md` (2026-09-20) — Fedify ADOPT-as-wire-layer decision, crypto boundary
8. `~/workspace/transfer/protocol-harvest/fedify-adapter-design.md` (2026-09-20) — full AP projection adapter design
9. `~/workspace/transfer/protocol-harvest/atproto-schema-lessons.md` + `ping-schema-sketch.json` (2026-09-20) — schema→everything codegen chain
10. `muse.memory_search` — 3 queries, 12 hits (Fedify decisions, harvest boundaries, frozen stances)

## SOURCES UNAVAILABLE (not read per task constraints or access)
- `/home/nolan/projects/ping` and `/home/nolan/ping` (task rule: do not touch in any way)
- `~/workspace/BACKLOG_NOLAN.md` (task rule: strictly off-limits)
- Live npm registry (relied on recorded pins; versions re-verified at decision time per the docs' own notes)
- `~/workspace/transfer/fyd-harvest/HARVEST-MANIFEST.md` (referenced-by-ID by the executable harvest; not re-read)
- Pig bridge / Oracle Postgres probe (out of scope for read-only text archaeology; the harvest report already records its pg probe as UNCHECKABLE)

---

## DOMAIN: ACTIVITYPUB

**1. ap-crypto-boundary-law** | ACTIVITYPUB | DECISION | PRIORITY 1
- WHY: Mixing federation transport crypto into canonical identity would couple PING identity to a protocol transport forever.
- EVIDENCE: `transfer/harvest/fedify-decision.md` ("Crypto boundary" section, 2026-09-20); reinforced memory 2026-09-21 (PING Ed25519 actor key signs canonical semantics, never enters Fedify store).
- DEPENDENCIES: IdentityAuthority custody path for the PING actor key.
- ACCEPTANCE: Fedify's `setKeyPairsDispatcher` holds ONLY transport keys (RSA legacy + separate Ed25519 for FEP-8b32); any audit greps the adapter and finds no canonical-key usage.
- NEXT FALSIFICATION: a transport key is observed signing a canonical PING envelope, or a canonical key enters `PING_FEDERATION_KEY_DIR`.

**2. ap-skeleton-exists-check** | ACTIVITYPUB | PROVE | PRIORITY 1
- WHY: Memory claims a verified AP skeleton; the same-day executable harvest found none. Both cannot be describing the same tree.
- EVIDENCE: `memory/2026-09-21.md#L374` (commit `f61200c`, exact `@fedify/fedify` 2.3.7 dep, 9/9 mapping tests, live WebFinger + signed Follow + typed 401 rejection at activitypub.academy, 2026-09-21) vs `FYD_EXECUTABLE_HARVEST.md` §"Investigated and rejected" (2026-09-21): "no Fedify in the FYD repo; no executable implementation exists."
- DEPENDENCIES: Locate `f61200c` in the estate's git refs.
- ACCEPTANCE: The skeleton's location, branch, and test results are confirmed against one concrete repo path.
- NEXT FALSIFICATION: `f61200c` is not reachable from any repo in the estate, or the skeleton exists but its tests are not actually the ones run.

**3. ap-remote-interop-partial** | ACTIVITYPUB | DONE_VERIFIED | PRIORITY 1
- WHY: Honest status of federation: signing/delivery/rejection proven, acceptance NOT proven. Freezing any adapter interface on this basis is the standing constraint.
- EVIDENCE: `memory/2026-09-21.md#L374` + `L473` (frozen at "local mapping verified, remote interoperability partial, typed rejection verified"; activitypub.academy attempt: WebFinger resolved, actor resolved, Follow signed+delivered, expected typed 401 for intentionally invalid key ID, 2026-09-21).
- DEPENDENCIES: none beyond the verified skeleton (#2).
- ACCEPTANCE: Any claim of AP readiness cites "proved signing, delivery, rejection handling, not successful federation acceptance."
- NEXT FALSIFICATION: a real federated Accept is received and processed end-to-end from a remote server, which would upgrade status past partial.

**4. ap-publicity-gate** | ACTIVITYPUB | HARVEST | PRIORITY 1
- WHY: The projection boundary is the only thing standing between PING_ONLY/PRIVATE data and the public fediverse; it must be a single reviewable enforcement point.
- EVIDENCE: `transfer/protocol-harvest/fedify-adapter-design.md` §2.2 + §10 (adapter.isProjectable: visibility=PUBLIC, federate=true default-false, active status; revoked identities project as Tombstone/410), 2026-09-20.
- DEPENDENCIES: projection worker that reads canonical events (not raw journal).
- ACCEPTANCE: Outbound adapter contains exactly one gate function; non-PUBLIC objects dropped and logged; security review treats it as critical code.
- NEXT FALSIFICATION: a non-PUBLIC object is observed leaving through the adapter, or a second projection path bypasses the gate.

**5. ap-inbound-observation-rule** | ACTIVITYPUB | HARVEST | PRIORITY 1
- WHY: Inbound foreign activities must never write canonical state; they are untrusted provider input to a pipeline that decides.
- EVIDENCE: `transfer/harvest/activitypub-semantics.md` "Direction rule" (2026-09-20); `fedify-adapter-design.md` §4.1 (no auto-accept in production; Follow → OBSERVATION_CREATED kind=follow.received → pipeline → canonical RELATIONSHIP_CREATED → Accept goes out).
- DEPENDENCIES: observation/event pipeline that turns observations into claims.
- ACCEPTANCE: Every inbox listener handler terminates in an observation emit; zero direct canonical writes in the adapter.
- NEXT FALSIFICATION: an inbound activity is shown to have created a canonical relationship without passing the pipeline.

**6. ap-follow-like-lifecycle** | ACTIVITYPUB | HARVEST | PRIORITY 2
- WHY: AP follow is a request lifecycle (pending→accepted/rejected→undone), not a boolean edge; PING's status-carrying relationships map cleanly onto it.
- EVIDENCE: `transfer/harvest/activitypub-semantics.md` (spec 6.5/7.6/7.7/6.10, 2026-09-20): Follow+Accept → follows/active; Reject → rejected status; Undo(Follow) → inactive; Like/Undo(Like) → likes active/inactive; counters rebuilt from relationship history, matching `ping_relationships` predicate/status design.
- DEPENDENCIES: ping_relationships repurpose (see ping-archaeology context) for followers/following/liked collections.
- ACCEPTANCE: Mapping table implemented exactly as the adapter's §6 schema map; no Announce/Block predicates added without a real use case.
- NEXT FALSIFICATION: a protocol use case arrives that cannot be expressed in follows/likes/replies_to/mentions without inventing new predicates in anticipation.

**7. ap-not-canonical-semantics** | ACTIVITYPUB | DECISION | PRIORITY 1
- WHY: If AP vocabulary becomes the modeling core, PING semantics get dragged by a W3C-era vocabulary and RDF-adjacent thinking.
- EVIDENCE: `transfer/harvest/activitypub-semantics.md` "Purpose" (2026-09-20): canonical vocabulary stays OBJECT_CREATED/OBJECT_UPDATED/RELATIONSHIP_CREATED (+proposal/approval/transition); AP types map only at the projection boundary; PING_ONLY has no AP equivalent; JSON-LD 1.1 is export-shape only per `FYD_ECOSYSTEM_HARVEST.md` (2026-09-21).
- DEPENDENCIES: schema registry owning canonical names.
- ACCEPTANCE: No canonical event, schema, or object type is named after an ActivityStreams term; JSON-LD appears only at export.
- NEXT FALSIFICATION: a canonical schema or event is found whose semantics are defined by reference to the AS2 vocabulary rather than PING law.

**8. ap-fedify-wire-adopt** | ACTIVITYPUB | DECISION | PRIORITY 1
- WHY: Fedify absorbs WebFinger, JSON-LD serialization, HTTP signatures (legacy draft + RFC 9421), Object Integrity Proofs, delivery retry, NodeInfo. Hand-writing any of it is banned.
- EVIDENCE: `transfer/harvest/fedify-decision.md` (FEDIFY_DECISION=ADOPT wire layer only, `@fedify/fedify` 2.3.7 MIT, node≥22, 2026-09-20); `FYD_ECOSYSTEM_HARVEST.md` USE-LIBRARY row (2026-09-21); CVE-2026-34148 (fixed 2.1.1) and CVE-2026-62857 (fixed 2.3.2) both behind the pin.
- DEPENDENCIES: @fedify/postgres on Oracle Postgres separate schema (or Redis) for KvStore + MessageQueue; MessageQueue REQUIRED in production; `FEDIFY_ORIGIN` pinned from env, never request host.
- ACCEPTANCE: No hand-rolled WebFinger/signature/delivery code in the adapter; pin re-verified at apply time; production refuses in-process queue.
- NEXT FALSIFICATION: Fedify ships a 3.x breaking change that invalidates the dispatcher shapes, or a new advisory lands above 2.3.7 before apply.

**9. ap-two-adapter-interface-rule** | ACTIVITYPUB | DECISION | PRIORITY 1
- WHY: Nolan's standing FYD rule: two real open-protocol adapters must be implemented before freezing a generalized adapter interface; Facebook is a proving ground, never the model.
- EVIDENCE: `FYD_ECOSYSTEM_HARVEST.md` header (2026-09-21); recommendation §1 orders AP then ATProto then Nostr.
- DEPENDENCIES: AP adapter (#8 shape) and ATProto adapter existing as real implementations.
- ACCEPTANCE: No `SocialAdapter` generalized interface is frozen/committed until two protocol adapters run against real networks.
- NEXT FALSIFICATION: an interface is found that was designed before two adapters existed and now constrains the second adapter's shape.

---

## DOMAIN: ATPROTO

**10. at-harvest-only-stance** | ATPROTO | DECISION | PRIORITY 1
- WHY: ATProto is harvest-only until the product frontier warrants implementation; premature infrastructure (PDS, DIDs, Bluesky posting) would consume the product lane.
- EVIDENCE: `transfer/harvest/atproto-lessons.md` standing + `transfer/protocol-harvest/atproto-schema-lessons.md` standing (both 2026-09-20: "No PDS deployment. No ATProto canonical identity. No Bluesky posting."); memory 2026-09-21: "do not start new ATProto, Nostr, or Farcaster adapters" until the loop closes.
- DEPENDENCIES: Product-lane signal that the frontier needs it.
- ACCEPTANCE: Zero ATProto adapter code, PDS config, or Bluesky credentials in the repos; lessons only.
- NEXT FALSIFICATION: A PDS config, atproto OAuth client, or Bluesky posting path appears anywhere in the estate.

**11. at-lexicon-evolution-law** | ATPROTO | HARVEST | PRIORITY 1
- WHY: The Lexicon evolution rules are what make schema codegen safe: generated validators, types, forms, and agent tools never break when a schema grows.
- EVIDENCE: `transfer/protocol-harvest/atproto-schema-lessons.md` Lesson 1 (2026-09-20): new fields optional; types never change; fields never removed; unknown fields tolerated; breaking change = mint new version (`ping.social.post@2`), never mutate @1. FYD's proof-schemas lane already enforces "types never change" in messages per `FYD_EXECUTABLE_HARVEST.md` (schemas.ts, 2026-09-21).
- DEPENDENCIES: schema registry + codegen chain (#16).
- ACCEPTANCE: Every schema carries a machine-readable evolution block; a mutation of a published version fails validation/CI.
- NEXT FALSIFICATION: a published schema version is mutated in place, or a type change passes validation.

**12. at-subject-signed-relationships** | ATPROTO | HARVEST | PRIORITY 1
- WHY: In ATProto only the account owner writes their own repo (like = liker's record, follow = follower's record). This confirms PING's authority rule independently.
- EVIDENCE: `transfer/harvest/atproto-lessons.md` Lesson 3 (2026-09-20).
- DEPENDENCIES: governance rule on RELATIONSHIP_CREATED signer.
- ACCEPTANCE: Governance rejects any follows/likes relationship claim not signed by the subject.
- NEXT FALSIFICATION: a valid canonical relationship exists whose signer is not its subject.

**13. at-strong-refs** | ATPROTO | HARVEST | PRIORITY 2
- WHY: ATProto replies carry the exact URI + CID of the parent; verification is cryptographic, not textual. PING must hold the same discipline.
- EVIDENCE: `transfer/harvest/atproto-lessons.md` Lesson 4 (2026-09-20); `ping-schema-sketch.json` record sketch (`replyTo` as `ping-object-ref`).
- DEPENDENCIES: deterministic canonical encoding (#14-adjacent; sha256-canonical-json-v1 pinned per executable harvest).
- ACCEPTANCE: reply_to is always an exact PING object ID (+payload hash); no text-inference matching anywhere in reply construction.
- NEXT FALSIFICATION: a reply relationship is found whose target was resolved by text/fuzzy matching.

**14. at-did-handle-separation** | ATPROTO | DECISION | PRIORITY 1
- WHY: Collapsing protocol handles into canonical identity breaks portability and invites impersonation-by-handle.
- EVIDENCE: `transfer/harvest/atproto-lessons.md` Lesson 5 (2026-09-20): PING canonical identity = DID-equivalent; AP actor URIs, Facebook handles, future ATProto DIDs = handle-equivalents, protocol claims verified bidirectionally; never model "Facebook Nolan" as the person. Mirrored in `fedify-adapter-design.md` §2.2 (actor URI bound to PING identity as a claim = provenance, not identity).
- DEPENDENCIES: identity claim store.
- ACCEPTANCE: No code path treats a protocol handle as an identity; all protocol bindings carry provider + external URI + key fingerprints.
- NEXT FALSIFICATION: an authorization decision is keyed on a protocol handle rather than the canonical identity.

**15. at-permission-set-grants** | ATPROTO | HARVEST | PRIORITY 2
- WHY: ATProto OAuth permission sets (collection-scoped create/update/delete, human-readable at consent time, DPoP/PAR mandatory) are the proven shape for scoped capability grants.
- EVIDENCE: `transfer/harvest/atproto-lessons.md` Lesson 6 (2026-09-20); `ping-schema-sketch.json` derivations show `post.publish` vs `post.like` as separate grants, "a grant on one resource never implies another."
- DEPENDENCIES: FYD grant model (`grants.ts`, capabilities.ts per executable harvest).
- ACCEPTANCE: Agent capability grants are scoped (object.like does NOT imply provider-side like); consent surfaces human-readable permission sets.
- NEXT FALSIFICATION: a grant is found that silently implies an unlisted capability, or a hand-rolled DPoP implementation appears (official SDKs must be used).

**16. at-schema-codegen-chain** | ATPROTO | HARVEST | PRIORITY 1
- WHY: One schema file fanning out to validator, TS types, object mapping, relationships, capabilities, renderer, agent tools, and forms kills the class of bugs where parallel models drift.
- EVIDENCE: `transfer/protocol-harvest/atproto-schema-lessons.md` + `ping-schema-sketch.json` (2026-09-20): SCHEMA → VALIDATOR (ajv) → OBJECT → RELATIONSHIPS → CAPABILITIES → RENDERER → AGENT TOOLS → FORM. In-repo precedent: `src/fyd/sitespec/schemas.ts` 3-schema chain verified in `FYD_EXECUTABLE_HARVEST.md` (2026-09-21).
- DEPENDENCIES: schema registry; codegen runner.
- ACCEPTANCE: Adding a schema produces all derivations by regeneration; no hand-written parallel model duplicates them.
- NEXT FALSIFICATION: a derived artifact (validator, tool description) disagrees with its source schema.

**17. at-feeds-as-projections** | ATPROTO | HARVEST | PRIORITY 2
- WHY: ATProto custom feeds are independent services returning ranked references; the client resolves them. There is no canonical feed table. PING must keep the same invariant.
- EVIDENCE: `transfer/protocol-harvest/atproto-schema-lessons.md` Lesson 7 (2026-09-20).
- DEPENDENCIES: query service over canonical journal; in-repo precedent `feed-rank.ts` (deterministic ranking, executable harvest).
- ACCEPTANCE: No canonical feed table exists; feeds are rebuildable projections with their own ranking logic.
- NEXT FALSIFICATION: a table or store is found that is treated as canonical feed state.

**18. at-light-imports-only** | ATPROTO | DEFERRED | PRIORITY 3
- WHY: If an ATProto adapter is ever built, importing the monorepo drags in PDS/relay/AppView-class machinery FYD will never operate.
- EVIDENCE: `FYD_ECOSYSTEM_HARVEST.md` (2026-09-21): take `@atproto/lex` 0.3.11 + identity + XRPC client surface only, not the monorepo; prefer over legacy `@atproto/api` 0.20.44 for new code; PDS/relay/AppView are REJECT (FYD is a client).
- DEPENDENCIES: at-harvest-only-stance (#10) lifting first.
- ACCEPTANCE: At build time, the adapter's dependency list contains no PDS/relay/AppView packages.
- NEXT FALSIFICATION: #10 lifts but the adapter spec still proposes operating PDS-class infrastructure.

---

## DOMAIN: NOSTR

**19. nostr-nip-profile-pinning** | NOSTR | HARVEST | PRIORITY 2
- WHY: Nostr is the most fragmented landscape in the harvest: advisory NIPs, competing DM conventions (NIP-04 deprecated → NIP-44), split follow semantics (NIP-02 kind 3 vs NIP-51 lists), heterogeneous relay retention/filtering/auth (NIP-42). "A Nostr adapter" is undefined without a pinned profile.
- EVIDENCE: `FYD_ECOSYSTEM_HARVEST.md` §1 (Nostr comparison) + §4 (fragmented landscapes), 2026-09-21: recommended profile NIPs 01/02/05/19/65; obligation includes relay variance defense.
- DEPENDENCIES: AP + ATProto adapters first (order rule, #9).
- ACCEPTANCE: Any Nostr work names its pinned NIP profile and lists the real relays it was tested against.
- NEXT FALSIFICATION: Nostr support is claimed without a pinned profile, or a single relay's behavior is treated as "Nostr."

**20. nostr-signed-event-pattern** | NOSTR | HARVEST | PRIORITY 2
- WHY: Research the signed-event/public-key patterns without turning PING into Nostr: self-contained signed JSON events and keypair identity are the simplest portability reference in the harvest.
- EVIDENCE: `FYD_ECOSYSTEM_HARVEST.md` §1 + adapter obligations (2026-09-21): NIP-01 events, NIP-19 bech32, NIP-65 relay lists.
- DEPENDENCIES: PING's own signed envelope (Ed25519, sha256-canonical-json-v1).
- ACCEPTANCE: Harvest notes record the envelope shape (event fields, signature binding, replaceable-event semantics) as a pattern reference only; no Nostr keys become PING identities.
- NEXT FALSIFICATION: a PING identity is derived from a Nostr pubkey, or canonical events are shaped by NIP semantics.

**21. nostr-tools-light** | NOSTR | DEFERRED | PRIORITY 3
- WHY: When a Nostr adapter is built, `nostr-tools` 2.25.2 (Unlicense/public domain) is the single-purpose light library for event construction/verification + relay pool; `@noble/ed25519` 3.2.0 (MIT) is the signing primitive (also the FYD object-signature primitive where WebCrypto Ed25519 is inconsistent).
- EVIDENCE: `FYD_ECOSYSTEM_HARVEST.md` USE-LIBRARY rows (2026-09-21).
- DEPENDENCIES: nostr-adapter-order (#22).
- ACCEPTANCE: Adapter uses exactly these for crypto/events; no relay/client platform code imported.
- NEXT FALSIFICATION: a Nostr dependency with broader scope (client, relay) enters the tree.

**22. nostr-adapter-order** | NOSTR | DEFERRED | PRIORITY 3
- WHY: Nostr teaches less about the generalized adapter interface until AP and ATProto freeze the shape of follow intent, portable objects, and identity mapping.
- EVIDENCE: `FYD_ECOSYSTEM_HARVEST.md` §1 recommendation (2026-09-21): "Nostr third, later"; memory 2026-09-21 freeze on new adapters.
- DEPENDENCIES: AP adapter + ATProto adapter real implementations; loop-close signal.
- ACCEPTANCE: No Nostr adapter work starts before the first two adapters are real.
- NEXT FALSIFICATION: the first two adapters reveal that a generalized interface doesn't need the Nostr exercise, or Nostr's fragmentation profile changes materially.

**23. nostr-no-relay-operation** | NOSTR | DECISION | PRIORITY 2
- WHY: Running relays is operating someone else's network; it is infrastructure, not product, and wrong-layer for FYD.
- EVIDENCE: `FYD_ECOSYSTEM_HARVEST.md` §2 (strfry/nostream REJECT) + §3 do-not-import list (2026-09-21).
- DEPENDENCIES: none.
- ACCEPTANCE: Adapter treats relays as black-box infrastructure reached over the protocol; zero relay software in FYD's dependency or ops surface.
- NEXT FALSIFICATION: a relay implementation appears in the dependency tree or ops runbooks.

---

## DOMAIN: FARCASTER

**24. farcaster-adapter-reject** | FARCASTER | REJECTED | PRIORITY 2
- WHY: Onchain identity costs + hub operation burden conflict with the light-adapter rule, during active stewardship uncertainty.
- EVIDENCE: `FYD_ECOSYSTEM_HARVEST.md` §2 (2026-09-21): Neynar acquired the protocol Jan 2026, founders leaving, $180M returned to investors reported — flagged in the doc as ecosystem reporting to re-check.
- DEPENDENCIES: none.
- ACCEPTANCE: No Farcaster adapter, hub, or onchain-registry work in any lane; the verdict stands until re-checked.
- NEXT FALSIFICATION: stewardship stabilizes AND a concrete product use case appears that no lighter protocol serves.

**25. farcaster-frames-pattern** | FARCASTER | HARVEST | PRIORITY 2
- WHY: Frames (signed interactive actions over Open Graph tags) is a useful pattern for agent-actionable embeds in generated pages; take the pattern, not the platform.
- EVIDENCE: `FYD_ECOSYSTEM_HARVEST.md` §2 Frames TAKE-PATTERN row + Open Graph protocol TAKE-PATTERN row (2026-09-21); every generated page already emits OG tags.
- DEPENDENCIES: generated-page OG emission; action/approval semantics.
- ACCEPTANCE: Generated pages can carry signed-action-capable OG embeds whose callbacks resolve through FYD's own action/approval path, with no Farcaster dependency.
- NEXT FALSIFICATION: a Frames implementation requires Farcaster hub or onchain identity to function, at which point it stops being pattern-only.

**26. farcaster-identity-research** | FARCASTER | HARVEST | PRIORITY 3
- WHY: Research-only read of useful public identity/social-state primitives; no infrastructure trophy.
- EVIDENCE: Task scoping + `FYD_ECOSYSTEM_HARVEST.md` Farcaster row (2026-09-21).
- DEPENDENCIES: none.
- ACCEPTANCE: Notes stay in the harvest lane; nothing becomes a build plan without a #24-style reversal.
- NEXT FALSIFICATION: a primitive is found that justifies the platform cost — then it graduates through the ADOPT/ADAPT/REJECT gate, not around it.

---

## DOMAIN: MCP

**27. mcp-thin-proxy-law** | MCP | HARVEST | PRIORITY 2
- WHY: The existing `mcp/ping_mcp_server.py` is explicitly "NO business logic, NO duplicate authority" — a thin proxy to Mission Control. FYD's future external agent interface must copy this design, not invent a parallel authority.
- EVIDENCE: `FYD_EXECUTABLE_HARVEST.md` (2026-09-21): "The thin-proxy law is the design FYD's future external agent interface must copy."
- DEPENDENCIES: canonical capability/grant authorities.
- ACCEPTANCE: Any FYD MCP surface is a projection of existing capabilities with zero business logic of its own; authority grep finds no second source.
- NEXT FALSIFICATION: an agent-facing surface is found that owns logic or authority duplicated from the canonical layer.

**28. mcp-sdk-deferred** | MCP | DEFERRED | PRIORITY 2
- WHY: PING objects/capabilities may project into MCP; MCP does not become canonical truth. The SDK decision exists; implementation waits.
- EVIDENCE: `FYD_ECOSYSTEM_HARVEST.md` (2026-09-21): `@modelcontextprotocol/sdk` 1.30.0 MIT USE-LIBRARY ("FYD exposes its capabilities to agents as MCP tools"); memory 2026-09-21: no MCP integration until the loop closes.
- DEPENDENCIES: loop-close signal; schema-derived agent tools (#16).
- ACCEPTANCE: MCP tools are generated projections of canonical capabilities; no canonical state lives behind an MCP endpoint.
- NEXT FALSIFICATION: an MCP tool performs a canonical write that bypasses the proposal/approval/digest path.

**29. mcp-v2-stateless-mirror** | MCP | HARVEST | PRIORITY 2
- WHY: Adopting the MCP v2 stateless, discover-first contract shape internally now makes the later transport adoption a swap, not a redesign.
- EVIDENCE: `fyd-lane/builder/harvest/HARVEST-ECOSYSTEM.md` (2026-09-21): MCP TS SDK v2, spec revision 2026-07-28 verified; stateless core (no initialize handshake, no Mcp-Session-Id), `_meta` carries protocol version + client capabilities, `server/discover` RPC advertises capabilities, every result carries `resultType`; server package has 2 runtime deps (core, zod) vs 13 in v1.
- DEPENDENCIES: internal typed agent-tool artifacts.
- ACCEPTANCE: Internal agent tool calls mirror the `_meta` capabilities pattern and typed results; v1 SDK line (ends 1.29.0) never adopted.
- NEXT FALSIFICATION: internal tool calls carry ambient authority or version-ambiguous results that the v2 shape would have prevented.

**30. mcp-range-pin-lesson** | MCP | DECISION | PRIORITY 2
- WHY: The v1→v2 ADR evidence showed a vulnerable transitive dep (`@hono/node-server`) entering via an SDK range. Range-pinning nothing is standing policy.
- EVIDENCE: `fyd-lane/builder/harvest/HARVEST-ECOSYSTEM.md` security notes (2026-09-21); the ecosystem harvest separately says "Pin the SDK version and the protocol revision."
- DEPENDENCIES: dependency audit practice.
- ACCEPTANCE: All protocol deps exact-pinned with the transitive tree audited; no `^`/`~` ranges on protocol machinery.
- NEXT FALSIFICATION: a range-pinned protocol dep admits a vulnerable transitive version.

**31. mcp-tools-from-schema** | MCP | HARVEST | PRIORITY 2
- WHY: The schema sketch already derives agent tool definitions (name, description, input schema, required capability) from the record schema. When MCP arrives, tools are generated, not hand-written.
- EVIDENCE: `transfer/protocol-harvest/atproto-schema-lessons.md` agentTool derivations (e.g. `ping.post.create`, `ping.service.create` with `requiresCapability`), 2026-09-20.
- DEPENDENCIES: at-schema-codegen-chain (#16).
- ACCEPTANCE: Every MCP tool definition traces to a schema record; tool descriptions are deterministic and cacheable.
- NEXT FALSIFICATION: a hand-written MCP tool exists whose input schema disagrees with its source record schema.

---

## DOMAIN: HARVEST REGISTER

**32. reg-json-render-typed-catalog** | HARVEST REGISTER | HARVEST | PRIORITY 1
- WHY: The single highest-value primitive in the 2026-09-22 lane: a typed component catalog (component → zod prop schema + slots + description) as the machine-readable vocabulary shared by AI prompts and validators. FYD's registry already carries adjacent metadata; prop schemas are the gap.
- EVIDENCE: `fyd-harvest/harvest-report.md` Sheet 1 (2026-09-22): json-render 0.18.x, Apache-2.0, React 19 peer-dep clash with FYD's React 18.3.1, pre-1.0 churn → ADAPT patterns, REJECT the npm dep. Duplication: high structural, zero semantic (FYD has object-graph bindings, evidence, capabilities; json-render's `$state` is app-state).
- DEPENDENCIES: component registry.
- ACCEPTANCE: Registry can emit a machine-readable catalog doc; tiny proof = throwaway script (harvest dir only) that sketches zod prop schemas from registry definitions.
- NEXT FALSIFICATION: the catalog cannot express a registry component's query shapes, or a component's props need data the catalog forbids.

**33. reg-puck-projection** | HARVEST REGISTER | DEFERRED | PRIORITY 2
- WHY: Puck MIT 0.22.2 is the reference design for a future human visual-editing surface that cannot become canonical truth: SiteSpec → Puck projection (lossy by design, never persisted) → owner edits → translator emits TYPED SitePatch → existing digest/approval path; query-bound fields re-attached read-only; anything touching query/binding REJECTED.
- EVIDENCE: `fyd-harvest/harvest-report.md` Sheet 2 (2026-09-22). Fundamental model mismatch noted: Puck blocks are prop-driven (content baked in), FYD sections are query-driven (resolved at render).
- DEPENDENCIES: typed SitePatch seam able to serve two producers.
- ACCEPTANCE: Tiny proof shows the round trip expressible with explicit rejection classes; DO NOT integrate this wave.
- NEXT FALSIFICATION: the projection cannot preserve query bindings losslessly out-of-band, or a Puck JSON blob is persisted as truth.

**34. reg-openpage-contract** | HARVEST REGISTER | HARVEST | PRIORITY 2
- WHY: OpenPage (MIT, repo HEAD 9818eb43, React 19) validates FYD's shape: one typed JSON doc shared by human editor and AI via the same patch vocabulary; plus harvestable block-variant vocabulary, theme-token preset packaging, and AgentPanel UX reference.
- EVIDENCE: `fyd-harvest/harvest-report.md` Sheet 3 (2026-09-22); `fyd-lane/builder/harvest/HARVEST-ECOSYSTEM.md` (2026-09-21): REJECT as builder/dependency (competing builder, Gemini-coupled AI endpoint); do not fork (9.3k LoC indie project).
- DEPENDENCIES: SiteSpec contract.
- ACCEPTANCE: Mapping table OpenPage 13 blocks ↔ FYD 17 registry components exists; gap list in both directions is the harvest.
- NEXT FALSIFICATION: FYD's SiteSpec diverges from the "one typed JSON, shared human+AI patch vocabulary" shape.

**35. reg-webstudio-grammar** | HARVEST REGISTER | HARVEST | PRIORITY 2
- WHY: Webstudio is AGPL-3.0 → patterns only, clean-room, never code. Harvestable: typed style-value grammar (`{type, unit, value}`) constrained to semantic tokens (hardens the no-generated-CSS-blobs invariant), breakpoints-as-data, builder/published isolation (already validated in FYD), MCP tool vocabulary for AI manipulation constrained to SitePatch ops.
- EVIDENCE: `fyd-harvest/harvest-report.md` Sheet 4 (2026-09-22): AGPL-3.0-or-later verified on README; `sdk-components-animation` additionally proprietary (EULA).
- DEPENDENCIES: token group design.
- ACCEPTANCE: Tiny proof = typed grammar sketch for one token group + validator rejecting a raw-CSS blob, written from pattern description only.
- NEXT FALSIFICATION: any Webstudio code (even a snippet) appears in FYD without deliberate license resolution by Nolan.

**36. reg-ai-sdk-adopt-when-needed** | HARVEST REGISTER | DEFERRED | PRIORITY 2
- WHY: Vercel AI SDK (MIT, ai@7.x stable 2026-06-25) is the provider-abstraction + structured-output transport for the day Ask FYD goes model-backed: `generateText` + `Output.object({schema})` → schema-validated SitePatch/AnswerWithEvidence → existing digest/proposal path. Zero model calls today → adding the dep now buys nothing.
- EVIDENCE: `fyd-harvest/harvest-report.md` Sheet 5 (2026-09-22): ADOPT when the intelligence lane needs a model, not before; RSC generative-UI path explicitly REJECTED (violates "intelligence produces data, never arbitrary JSX"); zod range `^3.25.76 || ^4.1.8` satisfiable but relying on transitive zod is fragile.
- DEPENDENCIES: intelligence lane actually needing a model.
- ACCEPTANCE: At adoption, model output validates against FYD-owned zod schemas before touching the proposal path; no RSC generative UI anywhere.
- NEXT FALSIFICATION: the SDK is added before any model call exists, or a model emits UI directly bypassing the binding verifier.

**37. reg-crawl4ai-design** | HARVEST REGISTER | HARVEST | PRIORITY 2
- WHY: Crawl4AI 0.9.3 (Apache-2.0, Aug 2026 security release) design harvest is standing since 2026-09-21 and re-confirmed 2026-09-22: SSRF destination validation, declarative request trust boundary, DomainMapper/AsyncUrlSeeder discovery, Shadow DOM flattening, CMP list, 3-tier anti-bot detection (telemetry only). REJECT: pip import into TS runtime, LLM extraction, Docker server (RCE/SSRF/file-write advisory history), anti-bot circumvention, `check_robots_txt=false`.
- EVIDENCE: `fyd-harvest/harvest-report.md` Sheet 6 (2026-09-22) confirming `src/fyd/proceduralize/ACQUISITION-STACK.md` (2026-09-21); escalation ladder: HTTP/JSON-LD → bounded fetcher → Playwright 1.63.0 (L2, already devDep) → Crawl4AI patterns re-implemented in FYD's own adapter → browser → save/replay procedure.
- DEPENDENCIES: acquisition adapter.
- ACCEPTANCE: 0.9.3's changes are security/bugfix only (no architectural change); benchmarks HELD until Nolan's trigger ("current stack cannot acquire required evidence" — not fired).
- NEXT FALSIFICATION: a future release changes architecture in a way that overturns the in-process-adapter decision, or the trigger fires and the held benchmark is not run.

**38. reg-lightpanda-hold** | HARVEST REGISTER | DEFERRED | PRIORITY 3
- WHY: Lightpanda (Zig headless browser, nightly/beta, AGPL-3.0, telemetry ON by default) sits at the browser tier as an alternate L2 engine candidate for high-volume low-fidelity fetch, strictly behind Playwright 1.63.0 and strictly opt-in.
- EVIDENCE: `fyd-harvest/harvest-report.md` Sheet 7 (2026-09-22); `fyd/harvest/PUBLIC-SOCIAL-DATA-FABRIC.md` ("read from docs").
- DEPENDENCIES: Nolan's benchmark trigger; tenant fixture corpus in `src/fyd/proceduralize/raw/`.
- ACCEPTANCE: No adoption until the trigger-gated benchmark (Playwright vs Lightpanda on observation determinism + field coverage); telemetry disabled if ever used; never the default acquisition browser while beta/AGPL/telemetry-default.
- NEXT FALSIFICATION: Lightpanda ships a stable, non-AGPL release with telemetry default-off and beats Playwright on the held benchmark — then it graduates, it doesn't auto-promote.

**39. reg-json-ld-export** | HARVEST REGISTER | HARVEST | PRIORITY 2
- WHY: JSON-LD 1.1 is the envelope pattern for exporting portable objects with `@context`; FYD canonical objects stay FYD-native.
- EVIDENCE: `FYD_ECOSYSTEM_HARVEST.md` JSON-LD row (2026-09-21): TAKE-PATTERN, export shape only, never the modeling core.
- DEPENDENCIES: translation map to portable object shape.
- ACCEPTANCE: Exported objects carry `@context`; no canonical schema is defined in RDF terms.
- NEXT FALSIFICATION: canonical modeling starts referencing JSON-LD contexts as definitional.

**40. reg-schema-org-pinned** | HARVEST REGISTER | HARVEST | PRIORITY 2
- WHY: schema.org types (LocalBusiness, Person, Article, Event, Product) for generated-page markup and JSON-LD context; treat as a VERSIONED TRANSLATION MAP from the internal graph, never a frozen internal ontology. Versioning is load-bearing: v30.0 reclassified `Quantity` class→DataType and broke consumers.
- EVIDENCE: `fyd-lane/builder/harvest/HARVEST-ECOSYSTEM.md` (2026-09-21): v30.0 VERIFIED (2026-03-19); v30.1 (claimed release 2026-09-16) UNVERIFIED in repo, announcements, and changelogs. Vocabulary CC-BY-SA 3.0 per official terms.
- DEPENDENCIES: translation map + upgrader diff.
- ACCEPTANCE: Map pinned to v30.0 now; no 30.1 types enter; upgrader written as re-runnable map diff; no live-fetch of context at render time.
- NEXT FALSIFICATION: v30.1 is verified in a primary source (then the upgrader runs), or internal modeling starts on schema.org types directly.

**41. reg-feed-emission** | HARVEST REGISTER | HARVEST | PRIORITY 2
- WHY: Feed emission is a core FYD output: Atom (RFC 4287) per generated site, JSON Feed 1.1 alongside for agent consumption, sitemap.xml for crawler discovery, WebSub subscriber-side for push freshness.
- EVIDENCE: `FYD_ECOSYSTEM_HARVEST.md` rows (2026-09-21): RSS/Atom, JSON Feed, Sitemaps, WebSub all TAKE-PATTERN. Related gap: `FYD_EXECUTABLE_HARVEST.md` G2 — `discover()` enumerates sitemap/rss/atom records but `parse()` only understands JSON-LD/OG/meta/title; feed XML is acquired then silently yields nothing.
- DEPENDENCIES: G2 gap closure (feed/sitemap parsing) for the consumption side.
- ACCEPTANCE: Every generated site emits Atom + JSON Feed + sitemap.xml; WebSub subscriber implemented; consumption parses feed XML into claims.
- NEXT FALSIFICATION: a generated site ships without feeds, or acquired feed XML continues to yield nothing.

**42. reg-webauthn-approval** | HARVEST REGISTER | HARVEST | PRIORITY 2
- WHY: WebAuthn Level 3 (W3C Rec 2026-08-25) is the pattern for passkey-bound human approval identity; use the stable Level 2 ceremony surface first (authenticator support lags the spec); `@simplewebauthn/server` MIT at implementation time, never hand-rolled ceremonies.
- EVIDENCE: `FYD_ECOSYSTEM_HARVEST.md` WebAuthn + SimpleWebAuthn rows (2026-09-21).
- DEPENDENCIES: approval seam (proposal/approval/digest path).
- ACCEPTANCE: Human approval authority anchored in platform authenticators via the library; no custom ceremony code.
- NEXT FALSIFICATION: authenticator support for the needed Level 3 features is verified broadly, or a hand-rolled ceremony appears.

**43. reg-dpop-ucan-delegation** | HARVEST REGISTER | HARVEST | PRIORITY 3
- WHY: DPoP (RFC 9449) binds tokens to keys so stolen tokens are useless — fits FYD agent delegation; UCAN gives the delegation-chain pattern (capabilities attenuate down an agent chain), but spec lineage churn (Fission→ucan-wg→ucanto) makes any library provisional.
- EVIDENCE: `FYD_ECOSYSTEM_HARVEST.md` DPoP + UCAN rows (2026-09-21).
- DEPENDENCIES: agent delegation flow.
- ACCEPTANCE: Token binding adopted when agent-held tokens exist; UCAN library adopted only when a concrete delegation flow needs it.
- NEXT FALSIFICATION: a UCAN library is adopted speculatively, or agent tokens circulate unbound.

**44. reg-automerge-draft-reconcile** | HARVEST REGISTER | DECISION | PRIORITY 2
- WHY: Two harvest docs disagree on CRDTs and must be reconciled before anything is decided. Ecosystem harvest: `@automerge/automerge` 3.5.0 MIT USE-LIBRARY "at the draft layer for converging concurrent edits; never as the canonical event log." The 2026-09-22 lane: "FYD has a no-CRDT rule" (Puck collaboration context) — SitePatch seam is the only channel, structured patches only.
- EVIDENCE: `FYD_ECOSYSTEM_HARVEST.md` Automerge row (2026-09-21) vs `fyd-harvest/harvest-report.md` "Conflicts" §2 (2026-09-22).
- DEPENDENCIES: Nolan's call on whether the no-CRDT rule is absolute (then Automerge verdict flips to REJECT) or draft-layer-scoped (then the rule needs that scoping in writing).
- ACCEPTANCE: One written verdict: either Automerge REJECTED estate-wide, or the no-CRDT rule is explicitly scoped to SiteSpec/canonical channels with the draft-layer exception named.
- NEXT FALSIFICATION: Automerge (or Yjs) enters a dependency tree while the contradiction is still open.

**45. reg-pglite-embed** | HARVEST REGISTER | HARVEST | PRIORITY 3
- WHY: `@electric-sql/pglite` 0.5.8 (Apache-2.0) is light embedded Postgres for tests, edge, and local-first demos — npm install, runs in-process. (ElectricSQL sync *service* stays pattern-only: new Elixir runtime + replication slots for a need FYD doesn't have.)
- EVIDENCE: `FYD_ECOSYSTEM_HARVEST.md` PGlite + ElectricSQL rows (2026-09-21).
- DEPENDENCIES: test/edge use case.
- ACCEPTANCE: Used where a real SQL engine is needed without a server; the sync service is never self-hosted for FYD.
- NEXT FALSIFICATION: the ElectricSQL service is proposed as a dependency — re-check the need first.

**46. reg-extractors-pair** | HARVEST REGISTER | HARVEST | PRIORITY 2
- WHY: Acquisition extraction pair: Defuddle 0.19.4 (MIT, main-content + schema.org metadata, pin version — "very much a work in progress" per its README) + Mozilla Readability (Apache-2.0, stable baseline). Trafilatura: study the readability-scoring heuristics only — GPL-3.0 is incompatible with FYD's stack, never import.
- EVIDENCE: `FYD_ECOSYSTEM_HARVEST.md` Defuddle/Readability/Trafilatura rows (2026-09-21).
- DEPENDENCIES: acquisition pipeline (G2 gap area).
- ACCEPTANCE: Extraction output carries per-fact confidence; Trafilatura code never enters the tree.
- NEXT FALSIFICATION: GPL-3.0 code is found in the dependency tree, or an extractor's output is treated as truth rather than confidence-graded observation.

**47. reg-json-forms-approval** | HARVEST REGISTER | HARVEST | PRIORITY 3
- WHY: JSON Forms `@jsonforms/react` 3.8.0 (MIT, framework-agnostic core; RJSF Apache-2.0 fallback) generates approval and editing UI from FYD action/SiteSpec schemas — schema-driven forms for the human-approval surface.
- EVIDENCE: `FYD_ECOSYSTEM_HARVEST.md` JSON Forms row (2026-09-21).
- DEPENDENCIES: approval UI surface; schema registry.
- ACCEPTANCE: Approval flows render from schemas, not hand-built forms; renderer customization cost accepted.
- NEXT FALSIFICATION: hand-built forms duplicate what the schema-driven renderer already covers.

**48. reg-register-itself** | HARVEST REGISTER | OPEN | PRIORITY 2
- WHY: The harvest register needs to exist as a durable artifact with the 10-column schema (SOURCE, LICENSE, VERSION/SHA, PRIMITIVE, WHY USEFUL, BYTES/DEPENDENCY COST, FYD/PING WRAPPER, TEST, STATUS) and the SMALL CORE BIG CAPABILITY rule: never import whole platforms when ~200 lines of proven primitive earn the value. Search order: PING itself first, then git history, dormant code, proven dependencies, official ecosystem implementations.
- EVIDENCE: Task statement; `FYD_EXECUTABLE_HARVEST.md` demonstrates the method (semantic hunt, REJECT stubs/aspirational docs, 2026-09-21); memory 2026-09-22 notes a dedicated read-only harvester agent role exists (`.github/agents/`).
- DEPENDENCIES: parent decision on register location/format.
- ACCEPTANCE: A maintained register file exists; every harvested primitive carries all 10 columns; statuses are one of OPEN/IN_PROGRESS/BLOCKED/PROVE/HARVEST/DECISION/DEFERRED/REJECTED/DONE_VERIFIED/SUPERSEDED.
- NEXT FALSIFICATION: a dependency is adopted that duplicates something PING already owns (the register failed its first job).

---

## CONTRADICTIONS FOUND

1. **AP skeleton existence.** Memory (2026-09-21, L374) says commit `f61200c` added an AP adapter skeleton with exact `@fedify/fedify` 2.3.7 and 9/9 passing mapping tests plus a live activitypub.academy proof. The same-day executable harvest says "no Fedify in the FYD repo" and "no executable implementation exists." Item #2 (PROVE) is the reconciliation task. Possibly different repos/branches (the executable harvest covered `/home/nolan/projects/ping` worktree `fyd/sitespec-generator` and `/home/nolan/ping`).
2. **MCP spec version.** `FYD_ECOSYSTEM_HARVEST.md` says MCP spec at v2 (2026-11-26), SDK 1.30.0. The builder-lane harvest (same week, 2026-09-21) says TS SDK v2 implements spec revision 2026-07-28, verified on the official repo. One of these dates is stale or misread; pin must be re-verified at decision time.
3. **CRDT stance.** Ecosystem harvest: Automerge USE-LIBRARY at draft layer. 2026-09-22 lane: FYD has a no-CRDT rule. Item #44 holds this open for Nolan's call.
4. **schema.org 30.1.** Nolan stated 30.1 released 2026-09-16; the builder-lane research could not verify it in any primary source (2026-09-21). v30.0 verified; map pinned there pending verification.
5. **MCP posture.** Ecosystem harvest's USE-LIBRARY for the MCP SDK could be misread as a green light; memory and the builder harvest both say implementation is deferred until the loop closes. Item #28 records it as DEFERRED, not open.

## NOTES FOR PARENT
- 48 items extracted (target was 30-50). Statuses used: DECISION, DONE_VERIFIED, HARVEST, PROVE, DEFERRED, REJECTED, OPEN. No items are IN_PROGRESS/BLOCKED/SUPERSEDED in the source material, except the superseded FYD side branches noted in the executable harvest (not protocol/harvest domain, omitted).
- Nostr and Farcaster have no dedicated harvest docs in the transfer dirs (grep found none); their items derive from the ecosystem harvest's comparison table and verdict rows — flagged honestly above.
- Per-item ACCEPTANCE and NEXT FALSIFICATION are written as checkable conditions a future lane can execute read-only.
- Read-only discipline held: no files created/edited/deleted, no git, no repo access beyond the listed workspace docs, BACKLOG_NOLAN.md not read.
