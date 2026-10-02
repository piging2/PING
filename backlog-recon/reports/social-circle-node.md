# Worker 2/8 — FYD Social / Relationships / Public-Social Archaeology Report (2026-09-22)

Received 2026-09-22 08:17 MDT. 42 items. Saved verbatim for reconciliation; statuses as reported by the worker (evidence decides at write time).

## SOURCES REVIEWED
1. ~/workspace/fyd-lane/portal-circle-spec.md (249 lines) — Portal-grade margin Circle architecture spec, 2026-09-21, Nolan directive
2. ~/workspace/fyd-lane/social-backend-plan.md (365 lines) — read-only PING social-primitives audit, 2026-09-21
3. ~/workspace/fyd-grill/FYD_ECOSYSTEM_HARVEST.md (177 lines) — external protocol harvest (ActivityPub/ATProto/Nostr/Farcaster/MCP), 2026-09-21
4. ~/workspace/fyd-grill/FYD_EXECUTABLE_HARVEST.md (176 lines) — PING/FYD code archaeology, test runs 2026-09-21
5. ~/workspace/fyd-lane/harvest-social-ads.md (142 lines) — decentralized social/discovery/commerce/advertising substrate harvest, 2026-09-22
6. muse.memory_search + muse.memory_get on memory/2026-09-21.md (L460-510, L1040-1090) and memory/2026-09-22.md (L340-500)

## SOURCES UNAVAILABLE (rule-bound)
- /home/nolan/ping and /home/nolan/projects/ping: not touched per hard rules; claims second-hand via harvest docs.
- ~/workspace/BACKLOG_NOLAN.md: off-limits.
- ~/workspace/goals/fyd-social-product-build/: listing only.

## CONTRADICTIONS FOUND
1. Reply predicate naming divergence: canonical `replies_to` (immutable once active) vs BFF-derived synthetic edge `replies` never journal-written. -> REL-03 (DECISION).
2. MCP version drift between harvests: FYD_ECOSYSTEM_HARVEST.md pins spec v2 (2026-11-26), SDK 1.30.0; harvest-social-ads.md pins spec revision 2026-07-28. Nov-2026 date is future relative to harvest date (2026-09-22). Re-pin before MCP work -> SOC-22.
3. Circle primitive mismatch (known, in correction): wired margin path imports rectangular ObjectCircle while true circular FydCircle exists unwired; diagnosed-and-dispatched. -> SOC-01/02.

---

## DOMAIN 1: FYD SOCIAL

**SOC-01 — circle-product-grammar-core-loop** | PROVE | P1
WHY: Product grammar is settled law (improved website center, real graph-derived Circles in margins, Circle -> rich Node); core-loop proof not yet browser-verified. Architecture/test progress does not count as product success.
EVIDENCE: memory/2026-09-22.md 2026-09-22 05:25 MDT — Nolan rejected margin-object proof as mechanism-only; 06:37 MDT — proof bar corrected to browser-visible change at exact head.
DEPENDENCIES: SOC-02, SOC-04, SOC-05, SOC-06.
ACCEPTANCE: PASS/FAIL tenant-by-tenant matrix (Happy Place, Coppersmith) with browser-visible Circle -> Node on exact head.
NEXT FALSIFICATION: Load /sites/<tenant> at 1920 and 390 widths; no true Circle in margins -> stays open.

**SOC-02 — true-circle-wiring-not-objectcircle** | IN_PROGRESS | P1
WHY: True circular primitive FydCircle exists (literal circle, collapsed/peek/expanded/Ask states, border-radius:50%, no rectangles) but wired margin path used rectangular ObjectCircle. Six-phase correction build dispatched 2026-09-22 05:30 MDT.
EVIDENCE: memory/2026-09-22.md 05:30 MDT inventory + six-phase dispatch note. Phase 3 (margin composition, mobile sheet, Node routes) unlanded as of 06:37 MDT.
DEPENDENCIES: SOC-04 (projection loaders).
ACCEPTANCE: /sites/* and /build/* render FydCircle with zero rectangular card/modal markup at any state.
NEXT FALSIFICATION: Grep rendered DOM for object-circle/card classes on /sites/happy-place.

**SOC-03 — circle-progressive-disclosure-states** | OPEN | P1
WHY: Three settled disclosure states must hold everywhere: STATE 1 tiny inline reference (logo/name/category/one line) -> STATE 2 Circle expanded preview (image, name, category, location, top services, View/Ask/Contact) via hover/focus/tap -> STATE 3 full Node via click, visually the business's, no PING marketing chrome. Animation physical and fast, reduced-motion honored, keyboard accessible, never hover-only.
EVIDENCE: memory/2026-09-21.md#L1050; portal-circle-spec.md §2.5 state machine REST->NEAR->AWARE->ENGAGED(->IMMERSIVE), ASK overlay; §4 reduced-motion rule.
DEPENDENCIES: SOC-04, SOC-06.
ACCEPTANCE: Keyboard-only user reaches STATE 3 from STATE 1; prefers-reduced-motion build still functional.
NEXT FALSIFICATION: Tab-navigate to a Circle with reduced-motion emulation; focus trapped or STATE 2 never opens -> fails.

**SOC-04 — per-object-projection-loaders** | IN_PROGRESS | P1
WHY: Object loaders are slug-keyed and owner-business-only; related object IDs 404 at /o/<objectId>. Every Circle must resolve to an actual object.
EVIDENCE: memory/2026-09-22.md 05:30 MDT inventory: "object loaders are slug-keyed and owner-business-only, so related object IDs 404."
DEPENDENCIES: ObjectGraph projection layer.
ACCEPTANCE: Each related Circle's objectId resolves via a generic loader (no slug, no owner assumption) with honest 404 for unknown objects.
NEXT FALSIFICATION: Navigate to /o/<related-object-id> from live graph; any 404 on a graph-present object fails.

**SOC-05 — related-circle-selection-deterministic** | IN_PROGRESS | P1
WHY: Related Circles must come from actual graph relationships, ranked deterministically, omitted when evidence is insufficient — no fabricated visual density.
EVIDENCE: memory/2026-09-22.md 05:30 MDT: Happy Place live graph has exactly 2 honest related-Circle candidates (business located_at location, business provides service); Coppersmith has 3 (located_at, works_for person, person links_to external identity).
DEPENDENCIES: SOC-04; object-ranker.
ACCEPTANCE: Related-Circle count equals live graph relationship count per tenant (2 / 3), zero fabricated slots.
NEXT FALSIFICATION: Count rendered related Circles against graph edge count; mismatch fails.

**SOC-06 — circle-node-ask-fixes** | OPEN | P1
WHY: FydCircle drops the view capability and has no Node-link prop; its Ask request incorrectly uses the projection object ID as siteId, invalid for related objects.
EVIDENCE: memory/2026-09-22.md 05:30 MDT inventory, "Current blockers confirmed".
DEPENDENCIES: SOC-04.
ACCEPTANCE: Clicking a related Circle's View opens its Node; Ask request carries the correct scope id.
NEXT FALSIFICATION: Click View on a related Circle; wrong object or Ask siteId error -> fails.

**SOC-07 — mobile-circle-tray-sheet** | IN_PROGRESS | P1
WHY: Mobile must retain the graph through a floating primary Circle plus related-object tray/sheet. Previously browser-proven: floating-button object sheet opens on tap, closes cleanly with Escape, >=44px trigger, focus returns to trigger.
EVIDENCE: memory/2026-09-22.md#L77 (object-in-margin milestone browser-proven both tenants); memory/2026-09-22.md#L356 (Nolan's required behavior); portal-circle-spec.md §7.
DEPENDENCIES: SOC-04, SOC-05.
ACCEPTANCE: Five-width browser certification includes a mobile width with tray/sheet fully operable.
NEXT FALSIFICATION: 390px viewport: no floating Circle + tray, or Escape does not close sheet -> fails.

**SOC-08 — mobile-hold-drag-follow-like** | DEFERRED | P3
WHY: Nolan floated hold-and-drag for mobile follow/like but explicitly deprioritized in favor of desktop MVP now.
EVIDENCE: memory/2026-09-21.md#L1050 (preference|low: "FOCUS ON DESKTOP SO I CAN SEE A WORKING FRONTEND MVP NOW").
DEPENDENCIES: Capability runtime, SOC-07.
ACCEPTANCE: Deferred until desktop loop proven; no build work.
NEXT FALSIFICATION: If anyone builds this before SOC-01 proves, the freeze order is violated.

**SOC-09 — capability-runtime-gating** | DONE_VERIFIED | P1
WHY: Follow/Like/Ask/Web capability-gated only; executors return last server-confirmed state on failure. Pure planner (viewer, target, grants) -> PlannedAction[] prevents dead buttons.
EVIDENCE: harvest-social-ads.md (src/fyd/capabilities/runtime.ts, CapabilityKind follow|like|ask|website); FYD_EXECUTABLE_HARVEST.md (action-planner src/lib/ping/action-planner.ts, 14/14 lane-a tests, 2026-09-21).
DEPENDENCIES: SOC-11 (grants authority).
ACCEPTANCE: Unplannable actions never render (lane-a tests).
NEXT FALSIFICATION: Render Circle as unsigned-out viewer; Follow/Reply enabled -> planner gate broken.

**SOC-10 — circle-action-mapping** | DONE_VERIFIED | P2
WHY: CapabilityPlan -> CircleUiAction[] pure; unplanned/unknown action kinds skipped fail-closed, never rendered dead.
EVIDENCE: FYD_EXECUTABLE_HARVEST.md (src/fyd/ask/circle-actions.ts, 36/36 ask-fyd tests, 2026-09-21).
DEPENDENCIES: SOC-09.
ACCEPTANCE: Test suite continues green (36/36).
NEXT FALSIFICATION: Add unknown action kind to plan fixture; dead button rendered -> mapping broken.

**SOC-11 — grant-authority-attenuation** | DONE_VERIFIED | P1
WHY: grantsForViewer: everyone gets object.reference; controllers of site-capable schemas get maintain_site; agents NEVER receive publish/message/purchase/advertise/provider/mutate. ATProto-shaped attenuation (a grant never implies another).
EVIDENCE: FYD_EXECUTABLE_HARVEST.md (src/lib/ping/grants.ts, 14/14 lane-a tests); harvest-social-ads.md (agents denied ad.buy).
DEPENDENCIES: identity resolution.
ACCEPTANCE: Agent context builder strips forbidden grants (36/36 ask-fyd).
NEXT FALSIFICATION: Inspect AskFydContext given to an agent; any forbidden grant -> boundary leaks.

**SOC-12 — social-actions-journal-events** | DONE_VERIFIED | P1
WHY: Follow/unfollow are journal RELATIONSHIP_CREATED events {subject, predicate, object, status}; revocation is status:'inactive' on same predicate; no unfollows/unlikes predicate. Deterministic content-hash action IDs.
EVIDENCE: harvest-social-ads.md (src/fyd/social/actions.ts, transition-id.ts SHA-256 over canonical bytes + generator version); social-backend-plan.md §1.3.
DEPENDENCIES: gateway seam for persistence.
ACCEPTANCE: A-follows-B round-trips journal -> projection -> net-follows read.
NEXT FALSIFICATION: Re-post identical follow; duplicate event id -> identity hashing broken.

**SOC-13 — signed-envelope-trust-root** | DONE_VERIFIED | P1
WHY: bff-envelope@1 (Ed25519 over sorted-key canonical bytes of {type, payload, metadata}, proof {algorithm, signature, publicKey PEM SPKI}); module pins single serializer sha256-canonical-json-v1; signSitePatchDraft throws unless payload_hash === proposal.digest. Private keys never leave server (0600, outside tree).
EVIDENCE: harvest-social-ads.md (src/fyd/social/envelope.ts); FYD_EXECUTABLE_HARVEST.md (src/fyd/ask/envelope.ts, 36/36 tests; canonicalization duality A2 resolved on FYD side).
DEPENDENCIES: none.
ACCEPTANCE: Tampered payload fails verification; hash mismatch throws before signing.
NEXT FALSIFICATION: Sign draft, flip one payload byte, verify; passes -> trust root void.

**SOC-14 — attestation-gate-no-success-without-proof** | PROVE | P1
WHY: Attestation gates must reject with named missing evidence; success never reported without journal proof. Makes follow/like/campaign writes honest.
EVIDENCE: harvest-social-ads.md (src/fyd/social/attestation-gate.ts — ATTESTATION_REJECTED with missing evidence named).
DEPENDENCIES: gateway seam.
ACCEPTANCE: Write failing journal acceptance surfaces ATTESTATION_REJECTED, not fake success.
NEXT FALSIFICATION: Point action layer at dead gateway, complete a like; UI reports success -> gate broken.

**SOC-15 — deterministic-feed-ranking** | DONE_VERIFIED | P2
WHY: Two deterministic rankers, non-surveillance: feed-rank.ts (kindWeight + recencyScore + actorProximity, nowIso injected, total order) and object-ranker.ts (proximity .35 + followed .25 + capability .1 + recency .15 + stability .15, lexicographic tiebreak, no behavioral dossier).
EVIDENCE: FYD_EXECUTABLE_HARVEST.md (feed-rank 14/14 lane-a tests); harvest-social-ads.md (object-ranker).
DEPENDENCIES: none.
ACCEPTANCE: Same inputs -> same order across runs (total order, pinned nowIso in tests).
NEXT FALSIFICATION: Run ranking twice over identical inputs with different insertion order; drift -> fails.

**SOC-16 — attention-controller-frequency-caps** | PROVE | P2
WHY: At most 1 PRIMARY ACTIVE + 1 SECONDARY AWARE object; hysteresis (entry/exit thresholds, minimum residency, interaction lock, cooldown). Anti-Times-Square for margins.
EVIDENCE: harvest-social-ads.md (src/fyd/attention/controller.ts: minResidencyMs 1200, cooldownMs 800, interaction lock); portal-circle-spec.md §2.4.
DEPENDENCIES: SOC-05.
ACCEPTANCE: Scrolling never produces musical-chairs; completed actions (FOLLOWING/LIKED) recede in prominence.
NEXT FALSIFICATION: Rapid scroll past three Circles; >1 primary + 1 secondary active or residency <1200ms -> broken.

**SOC-17 — discovery-feed-surface** | OPEN | P2
WHY: DiscoveryFeedItem kinds (object_activity, relationship_change, new_public_object, website_content) with actorProximity and evidenceRef exist as types; discovery surface on generated sites not yet wired.
EVIDENCE: harvest-social-ads.md (src/lib/ping/types.ts:238-250).
DEPENDENCIES: SOC-15; semantic search (SOC-19, BLOCKED).
ACCEPTANCE: Discovery surface renders all four kinds with evidence refs.
NEXT FALSIFICATION: Any item without evidenceRef -> evidence contract violated.

**SOC-18 — profile-fallback** | OPEN | P2
WHY: ping.social.profile@1 exists in gateway (create/update/read, handle validation, 280-char bio, controller-scoped updates) but no FYD-facing Profile surface/fallback described. Circle -> Node must degrade to sane Profile fallback when full Node cannot render.
EVIDENCE: social-backend-plan.md §1.2 (profile schema + ingest path PROVEN); no FYD profile surface in any harvest.
DEPENDENCIES: SOC-04.
ACCEPTANCE: Defined fallback: every identity-backed object resolves to at least a Profile projection.
NEXT FALSIFICATION: Minimal object (no media, no services); Circle opens to nothing -> fallback missing.

**SOC-19 — semantic-search-bff-endpoint** | BLOCKED | P2
WHY: Embeddings (Ollama nomic-embed-text -> Qdrant 768-d cosine) and retrieval service (sole Qdrant owner) work PING-side only; BFF exposes no search endpoint, so FYD discovery cannot do semantic search. Blocked on gateway/BFF seam, not FYD.
EVIDENCE: FYD_EXECUTABLE_HARVEST.md G3 (genuine gap; ping-object-reader.ts has no search endpoint).
DEPENDENCIES: PING gateway seam; NOT a FYD-side rebuild (FYD must never own Qdrant).
ACCEPTANCE: BFF search endpoint over the retrieval service; FYD calls it, never Qdrant directly.
NEXT FALSIFICATION: FYD code constructs own Qdrant client -> authority boundary violated.

**SOC-20 — portable-previews-og-frames** | HARVEST | P2
WHY: Every generated page emits OG tags (embed foundation); Frames pattern (signed action callbacks over OG tags) is take-pattern for agent-actionable embeds. Preview modes A (snapshot default) / B (sandboxed interactive) / C (FYD native projection, the moat) specced with deterministic focal-region resolution and provenance on every preview record.
EVIDENCE: FYD_ECOSYSTEM_HARVEST.md (OG TAKE-PATTERN; Frames TAKE-PATTERN); portal-circle-spec.md §3.
DEPENDENCIES: media architecture (MEDIA-01).
ACCEPTANCE: External link preview of a Node/Circle resolves to real OG snapshot with provenance.
NEXT FALSIFICATION: Share Node URL externally; scaled whole-desktop screenshot (forbidden) or fabricated content -> preview contract broken.

**SOC-21 — embed-loader-snippet** | DONE_VERIFIED | P2
WHY: One-snippet embed boundary: public/fyd-circle-loader.js (FydCircle.mount with objectId + apiBase); Follow + circle API routes exist.
EVIDENCE: memory/2026-09-21.md#L1083 (verified extraction, 11:23 MDT correction).
DEPENDENCIES: SOC-04.
ACCEPTANCE: Mounting snippet on third-party page renders working Circle (follow + ask entry).
NEXT FALSIFICATION: Embed on plain HTML page; requires host-page cooperation beyond objectId+apiBase -> boundary claim false.

**SOC-22 — mcp-capability-exposure** | HARVEST | P3
WHY: FYD exposes capabilities to agents as MCP tools (projection only, pin SDK + protocol revision). MCP URIs must never become canonical object IDs.
EVIDENCE: FYD_ECOSYSTEM_HARVEST.md (MCP USE-LIBRARY; SDK 1.30.0 MIT); harvest-social-ads.md (projection-only; pin 2026-07-28; churn warning: five breaking revisions in 20 months).
DEPENDENCIES: SOC-09, SOC-11.
ACCEPTANCE: MCP tool surface mirrors grant-gated capability set 1:1.
NEXT FALSIFICATION: Re-pin spec/SDK pair and check drift (Contradiction 2); tool exposing ungated effect -> boundary leaks.

**SOC-23 — createpost-bff-gap** | PROVE | P2
WHY: Gateway post path PROVEN but PingObjectReader has no createPost method — end-to-end posting one small additive BFF method away.
EVIDENCE: social-backend-plan.md §1.5, open question 4.
DEPENDENCIES: gateway seam.
ACCEPTANCE: createPost(identityId, text, replyTo?) submits signed ping.social.post@1 envelope.
NEXT FALSIFICATION: Implementation writes posts straight to projection table -> canonicality violated.

## DOMAIN 2: RELATIONSHIPS

**REL-01 — follows-unfollows-canonical-law** | DONE_VERIFIED | P1
WHY: follows is canonical predicate; unfollows/unlikes do not exist and are rejected (PREDICATE_NOT_CANONICAL). Unfollow is status:'inactive' on same predicate; projector applies last-wins per (subject, predicate, object) by acceptance sequence. Follow is a journal event, not an authority.
EVIDENCE: social-backend-plan.md §1.3 (verified against ping-vocabulary.ts:22-27,41, adapter, projector, unit tests).
DEPENDENCIES: sequence column on ping_events (DDL gap, §7 Q1).
ACCEPTANCE: Alice-follows-Bob round-trip: journal active, projection active, unfollow flips to inactive with history preserved.
NEXT FALSIFICATION: Emit unfollows; accepted instead of rejected -> vocabulary gate broken.

**REL-02 — likes-unlike-revocation** | DONE_VERIFIED | P1
WHY: likes revocable; unlike is status:'inactive' on same predicate (Patch 7B pattern). Counts are projections computed from net edges, never canonical truth.
EVIDENCE: social-backend-plan.md §1.6 (like/route.ts header: "counts stay projections computed from events").
DEPENDENCIES: REL-01.
ACCEPTANCE: Like count derives from net like edges; toggle moves count deterministically.
NEXT FALSIFICATION: Any count stored as canonical object field -> projection law violated.

**REL-03 — reply-predicate-naming-decision** | DECISION | P2
WHY: Canonical write form is replies_to (immutable once active); BFF derives read-only edge named replies never journal-written. FYD must standardize on canonical form for writes.
EVIDENCE: social-backend-plan.md §1.7, open question 5.
ACCEPTANCE: Recorded decision (canonical replies_to on write; replies read-only alias) applied consistently in FYD.
NEXT FALSIFICATION: New code writes replies to journal; vocabulary test should fail.

**REL-04 — references-predicate-or-refs** | DECISION | P2
WHY: Every object carries refs: string[] (preserved in journal and projection); NO canonical social references predicate. Adding one is constitutional vocabulary change (all consumers agree, enforced by ping-vocabulary.test.ts); otherwise use refs.
EVIDENCE: social-backend-plan.md §1.8, open question 6.
ACCEPTANCE: Vocabulary addition with all three consumers agreeing, or refs-only references documented.
NEXT FALSIFICATION: Propose vocabulary change and run ping-vocabulary.test.ts; disagreement blocks by design.

**REL-05 — vocabulary-change-law** | DONE_VERIFIED | P1
WHY: ping-vocabulary.ts is single source of truth the TS projector, SQL CHECK constraints, and BFF must all agree on. Mechanism behind "Follow is not its own authority."
EVIDENCE: social-backend-plan.md §1.8 ("what FYD must NOT rebuild": vocabulary, projector semantics, revocation semantics, feed visibility).
ACCEPTANCE: No social capability forks vocabulary semantics into FYD.
NEXT FALSIFICATION: Grep FYD for local predicate allowlists; any fork -> violates single-source law.

**REL-06 — extended-predicate-catalog** | HARVEST | P3
WHY: General predicate space (subscribes, references, created, owns, member_of, endorses, sponsors, purchased, contributed_to, collaborates_with, derived_from, responds_to, located_at, works_for, links_to). Social vocabulary covers follows, likes, replies_to, approves, denies; knowledge layer adds published, external_identity. Each addition is constitutional change, not casual field.
EVIDENCE: social-backend-plan.md §1.4; harvest-social-ads.md (campaign->references->offer needs references; sponsor relationships MISSING).
DEPENDENCIES: REL-05, REL-04.
ACCEPTANCE: Catalog exists as decided roadmap with per-predicate justification, none added ad hoc.
NEXT FALSIFICATION: Pick endorses; no concrete product need statable without it -> stays out.

## DOMAIN 3: PUBLIC SOCIAL OBSERVATION

**OBS-01 — observation-freeze-boundary** | DEFERRED | P1
WHY: Nolan's freeze (2026-09-21): until core customer loop closes, no new ATProto/Nostr/Farcaster adapters, no graph database, no campaign/mass-follow machinery, no MCP integration, no general crawler. ActivityPub frozen at local-mapping-verified / remote-partial / rejection-handling-verified. Public-social work read-only research only.
EVIDENCE: memory/2026-09-21.md#L473 (06:44 MDT reconciler/product-freeze note).
DEPENDENCIES: SOC-01 (core loop proof).
ACCEPTANCE: No new adapter code merges before SOC-01 proves.
NEXT FALSIFICATION: Any PR touching src/fyd/adapters/ before loop green -> freeze violated.

**OBS-02 — typed-observation-vocabulary** | DONE_VERIFIED | P2
WHY: Every fact carries value, source URL/type, observation time, evidence ref, confidence, grade (website_statement / provider_statement / synthetic_fixture); claim ids deterministic (sha256 of entity/field/source/normalized). Grades prevent synthetic data passing as real.
EVIDENCE: FYD_EXECUTABLE_HARVEST.md (refresh types.ts, website-observe.ts: 21/21 tests green 2026-09-21).
DEPENDENCIES: none.
ACCEPTANCE: Observation -> evidence -> projection chain preserves grade end to end.
NEXT FALSIFICATION: Synthetic fixture through pipeline; surfaces as real claim -> grading leaks.

**OBS-03 — provider-data-not-canonical-identity** | DECISION | P1
WHY: Provider data is not canonical identity merely because observed. Observation flows provider-source -> observation -> evidence -> conservative identity resolution -> PING projection. Protocol representations are projections/adapters; canonical objects stay in PING.
EVIDENCE: harvest-social-ads.md (binding constraint); FYD_EXECUTABLE_HARVEST.md.
DEPENDENCIES: IDN-01.
ACCEPTANCE: No provider-sourced object enters graph without evidence-backed, conservatively resolved identity.
NEXT FALSIFICATION: Ingest provider post; provider native ID became canonical id without resolution record -> boundary broken.

**OBS-04 — activitypub-adapter-readiness** | HARVEST | P3
WHY: Adapter target #1 (largest open network, fixed W3C vocabulary, standardized follows). Light path: Fedify @fedify/fedify 2.3.7 MIT. Obligations mapped (WebFinger, HTTP Signatures, inbox/outbox, Follow/Accept/Undo -> follow intent, Create/Note -> portable objects). Local mapping verified at commit f61200c7; remote round-trip honestly recorded as rejected, not faked.
EVIDENCE: FYD_ECOSYSTEM_HARVEST.md §1; harvest-social-ads.md (git history).
DEPENDENCIES: OBS-01 (frozen).
ACCEPTANCE: Harvest sheet stays current; nothing to build until freeze lifts.
NEXT FALSIFICATION: Re-verify rejection record when freeze lifts; silently flipped "works" without real remote round-trip -> fails.

**OBS-05 — atproto-adapter-readiness** | HARVEST | P3
WHY: Adapter target #2 (portable DID identity, Lexicon machine-inspectable semantics). Light path: @atproto/lex 0.3.11 MIT, lex + identity + XRPC surface only. Harvested patterns already landed in-repo (DID-vs-handle separation, OAuth granular permissions -> grants.ts); per Nolan 2026-09-21 no adapter code.
EVIDENCE: FYD_ECOSYSTEM_HARVEST.md §1; harvest-social-ads.md (ATPROTO-HARVEST.md commit 08cc39d6).
DEPENDENCIES: OBS-01.
ACCEPTANCE: Harvest doc current; no code until freeze lifts.
NEXT FALSIFICATION: Commit adds @atproto/api as dependency before SOC-01 -> freeze violated.

**OBS-06 — nostr-adapter-readiness** | HARVEST | P3
WHY: Adapter target #3 (maximally portable keypair identity, simplest event model) but structurally fragmented (NIP statuses bind nobody; relays vary). Future work must pin NIP profile (01/02/05/19/65) and test relay variance; never run FYD relays.
EVIDENCE: FYD_ECOSYSTEM_HARVEST.md §1 (nostr-tools 2.25.2 Unlicense); §4 fragmentation note.
DEPENDENCIES: OBS-01.
ACCEPTANCE: Harvest sheet current; pinned NIP profile documented before any code.
NEXT FALSIFICATION: Code claiming "Nostr support" without named pinned NIP profile and tested relays -> theater.

**OBS-07 — farcaster-rejected-with-pattern-harvests** | REJECTED | P3
WHY: Stewardship unsettled (Neynar acquisition Jan 2026, founders leaving, $180M returned); hub/onchain model conflicts with light-adapter rule. Patterns still harvested: Frames (signed actions over OG), scoped signer delegation, channel-scoped placement, signed usage receipts.
EVIDENCE: FYD_ECOSYSTEM_HARVEST.md §1 (Farcaster verdict REJECT; Frames TAKE-PATTERN); harvest-social-ads.md (ADAPT patterns, REJECT onchain stack/Snapchain hosting).
DEPENDENCIES: none.
ACCEPTANCE: No Farcaster adapter; pattern reuse only.
NEXT FALSIFICATION: Onchain identity dependency enters FYD package tree -> rejection violated.

**OBS-08 — facebook-source-real-path** | PROVE | P2
WHY: fromFacebookCliJson keeps real ingest path wired behind checkFacebookAvailability for the day an authorized page ID exists; currently real path correctly stubbed, conflict machinery proven against labeled synthetic fixture. Facebook is a proving ground, never the model.
EVIDENCE: FYD_EXECUTABLE_HARVEST.md (facebook-source.ts, 21/21 refresh tests); FYD_ECOSYSTEM_HARVEST.md.
DEPENDENCIES: authorized page ID (external).
ACCEPTANCE: Wiring fromFacebookCliJson with authorized ID yields graded provider_statement observations.
NEXT FALSIFICATION: Availability check claims availability without authorized credential -> stub dishonest.

**OBS-09 — feed-emission-vs-acquisition-gap** | PROVE | P2
WHY: Feed emission is core FYD output (Atom per site, JSON Feed alongside — cheap, agent-friendly) but acquisition gap G2: discover() enumerates RSS/Atom/sitemap sources and parse() silently yields nothing on feed/sitemap XML.
EVIDENCE: FYD_ECOSYSTEM_HARVEST.md (RSS/Atom/JSON Feed TAKE-PATTERN); FYD_EXECUTABLE_HARVEST.md G2.
ACCEPTANCE: RSS/Atom/sitemap URL fed to pipeline produces parsed observations, not silence.
NEXT FALSIFICATION: Real Atom feed to parse(); empty output with no error -> fails.

**OBS-10 — webfinger-relme-discovery** | HARVEST | P3
WHY: WebFinger acct: resolution and rel="me"/sameAs/website-backlink are open-web identity proof inputs for provider->PING identity resolution. Fedify covers ActivityPub side; pattern belongs in identity-resolution layer.
EVIDENCE: FYD_ECOSYSTEM_HARVEST.md (WebFinger TAKE-PATTERN, RFC 7033).
DEPENDENCIES: IDN-01.
ACCEPTANCE: Documented as identity proof inputs, not implemented until freeze lifts.
NEXT FALSIFICATION: Implementation treating WebFinger lookup alone as verified identity -> fails conservative-resolution rule.

## DOMAIN 4: IDENTITY RESOLUTION

**IDN-01 — conservative-resolution-inputs** | HARVEST | P2
WHY: Resolution evidence ladder: explicit owner connection, DID, public key, domain proof, rel=me, sameAs, website backlink, provider account claim, signed proof, exact deterministic match -> ambiguous match -> human confirmation. No step skipped silently.
EVIDENCE: harvest-social-ads.md (identity/principal.ts, claim machine); FYD_ECOSYSTEM_HARVEST.md (entity resolution ABSENT anywhere in estate).
DEPENDENCIES: OBS-02.
ACCEPTANCE: Documented ladder where each rung names its evidence; ambiguous cases queue for human confirmation.
NEXT FALSIFICATION: Two similar-but-distinct provider profiles merged without explicit confirmation record -> rule broken.

**IDN-02 — entity-resolution-estate-gap** | OPEN | P2
WHY: Nothing links same real-world entity across sources (website business vs Facebook page vs Drive doc). proceduralize.resolve() resolves field conflicts by source priority; conflict.ts keeps both claims with provenance — but no dedupe, merge, or identity stitching exists anywhere (G1).
EVIDENCE: FYD_EXECUTABLE_HARVEST.md G1 (only a test name mentions resolution; refresh fixture notes entity matching is assumed).
DEPENDENCIES: IDN-01.
ACCEPTANCE: Stitching design preserving both claims' provenance (never deletes loser, per conflict.ts law).
NEXT FALSIFICATION: Stitching implementation deletes/silently overwrites losing claim -> keep-both law violated.

**IDN-03 — claim-state-machine** | DONE_VERIFIED | P1
WHY: Claim machine OBSERVED -> CLAIMED -> VERIFIED-CONTROLLED, every transition appends audit events; demo contexts can never be claimed. Ownership is evidence-bearing state, never manufactured for demo convenience.
EVIDENCE: harvest-social-ads.md (src/fyd/claim/types.ts + machine.ts, identity.ts).
DEPENDENCIES: none.
ACCEPTANCE: Demo-owner context attempting claim transition fails.
NEXT FALSIFICATION: Claim through machine in demo context reaches VERIFIED-CONTROLLED -> boundary leaks.

**IDN-04 — no-fuzzy-merge-rule** | DECISION | P1
WHY: Never silently fuzzy-merge people. Ambiguous match -> explicit human confirmation with recorded decision; loser never deleted (keep-both resolution).
EVIDENCE: task directive hard rule; FYD_EXECUTABLE_HARVEST.md (conflict.ts: "FYD must KNOW the conflict, not silently pick a winner" — tested 21/21).
DEPENDENCIES: IDN-01.
ACCEPTANCE: Rule encoded as machine-checkable constraint on resolution path.
NEXT FALSIFICATION: Near-duplicate person silently merged -> fails.

## DOMAIN 5: CROSS-NETWORK ACTIONS

**XNA-01 — observe-act-separation** | DECISION | P1
WHY: OBSERVE and ACT are separate capabilities. PING follow never implies Facebook/external effects; cross-network action requires provider support + connected account + authorization + capability + policy + possibly human approval.
EVIDENCE: FYD_EXECUTABLE_HARVEST.md (agents propose, humans publish; FORBIDDEN_AGENT_EFFECTS 36/36).
DEPENDENCIES: SOC-11.
ACCEPTANCE: No code path executes provider write as side effect of PING social action.
NEXT FALSIFICATION: Trace PING follow end-to-end; any outbound provider call -> fails.

**XNA-02 — provider-capability-matrix** | HARVEST | P3
WHY: Future matrix per provider: READ / FOLLOW / UNFOLLOW / POST / REPLY / LIKE / SUBSCRIBE / MESSAGE, each gated on support, connection, authorization, capability, policy. Capability negotiation per server (ActivityPub servers implement overlapping subsets).
EVIDENCE: FYD_ECOSYSTEM_HARVEST.md §4 (ActivityPub capability negotiation).
DEPENDENCIES: XNA-01; OBS-01.
ACCEPTANCE: Documented matrix before any adapter code.
NEXT FALSIFICATION: Adapter claims FOLLOW support on server that doesn't honor it -> negotiation missing.

**XNA-03 — agents-never-external-effects** | DONE_VERIFIED | P1
WHY: FORBIDDEN_AGENT_EFFECTS (site.publish, message.send, purchase.make, ad.buy, provider.call, business.mutate) — agents propose, humans publish; agentGrants strips fail-closed.
EVIDENCE: FYD_EXECUTABLE_HARVEST.md (capabilities.ts, 36/36 ask-fyd tests).
DEPENDENCIES: SOC-11.
ACCEPTANCE: Test suite green; agent-issued context contains zero forbidden effects.
NEXT FALSIFICATION: Agent given cross-network task; provider write executes without human approval -> boundary broken.

## DOMAIN 6: CAMPAIGNS

**CMP-01 — campaign-record-model** | HARVEST | P3
WHY: Future pipeline maps onto existing primitives: plain-English intent -> deterministic candidate selection -> policy -> capability -> bounded action plan -> approval where required -> execution -> evidence -> outcomes. Genuinely missing record types: campaign objects, audience-intent objects, sponsor relationships, sponsored-label vocabulary, signed outcome receipts, budget escrow — expressible as new schemas + relationships, none requiring new authority.
EVIDENCE: harvest-social-ads.md (per-piece EXISTS/MISSING mapping; ping.social.offer@1 + proceduralizer emission EXISTS).
DEPENDENCIES: REL-04 (references), OBS-01.
ACCEPTANCE: Two FYD lexicon-style record drafts + one Sponsored Surface Contract (product lane, only after loop green).
NEXT FALSIFICATION: Campaign-adjacent work starts before SOC-01 -> freeze violated.

**CMP-02 — no-covert-scraping-spam** | DECISION | P1
WHY: Campaigns never covert scraping, spam, or uncontrolled mass action. Matching constrained to object context + viewer-allowed context + explicit relationships + capabilities + stated intent; neither record may carry inferred traits, only asserted signed facts. Machine-checkable projection constraint, not policy text.
EVIDENCE: harvest-social-ads.md (Sponsored Surface Contract; "never infer sensitive traits").
DEPENDENCIES: SOC-11, SOC-15.
ACCEPTANCE: Validator rejecting any campaign plan carrying inferred traits or unlabeled paid placement.
NEXT FALSIFICATION: Draft plan with inferred-trait targeting input passes validator -> constraint is theater.

**CMP-03 — no-ad-authority** | DECISION | P1
WHY: No AdAuthority will be created. Assumption falsified twice: FydGrant already names ad.buy as grant agents never given; labeler disclosure + projection validators + signed receipts cover sponsorship without central authority.
EVIDENCE: harvest-social-ads.md (Assumptions Falsified #9).
DEPENDENCIES: SOC-11.
ACCEPTANCE: No new authority introduced in any campaign design doc.
NEXT FALSIFICATION: Any design introducing authority owning ad truth -> fails on arrival.

**CMP-04 — honest-sponsored-labeling** | HARVEST | P3
WHY: Sponsored content appears only as projection of explicit sponsor relationship + sponsor-signed offer; projection MUST render SPONSORED. Label vocabulary (sponsored, sponsor-disclosure, verified-business) modeled on ATProto labeler defs: namespaced per emitting labeler, advisory at render, enforced by machine-checkable projection validator. Nostr has no sponsored-content NIP — honest-labeling layer unbuilt; FYD's opening.
EVIDENCE: harvest-social-ads.md (label vocabulary design; ATProto labeler pattern; NIP gap).
DEPENDENCIES: CMP-02.
ACCEPTANCE: Sponsored Surface Contract as machine-checkable validator: sponsored projection without label fails.
NEXT FALSIFICATION: Rendered sponsored projection omits SPONSORED while content shows -> decorative labeling.

**CMP-05 — signed-outcome-receipts** | HARVEST | P3
WHY: Sponsors get verifiable attribution with no behavioral tracking: signed outcome receipt modeled on Farcaster FIP AppUsageReceipt (object ref, actor, action type, timestamp, actor-signed) + NIP-57 third-party-signed receipt pattern (validate against advertised pubkey; receipts are evidence, not settlement proof). FYD specifying first — design as FYD lexicon record.
EVIDENCE: harvest-social-ads.md (FIP Discussion #19; NIP-57).
DEPENDENCIES: SOC-13.
ACCEPTANCE: Receipt type where apps cannot fabricate usage (user-signed); third-party receipts validate against advertised keys.
NEXT FALSIFICATION: Fabricated app-side receipt verifies -> design broken.

## DOMAIN 7: MEDIA/EMBEDS/CIRCLE DISTRIBUTION

**MEDIA-01 — media-download-digest-derivative-law** | DECISION | P1
WHY: Download + digest + derivative is the architecture; hotlink fallback only. Authorized demo businesses/sources only. Preserve source URL + observation/evidence; downloaded bytes NOT canonical business truth — media record answers where-from / when-observed / what-bytes-made-derivative.
EVIDENCE: MEMORY.md FYD harvest directive 2026-09-22 binding decision 1; memory/2026-09-22.md 05:25 MDT (Happy Place zero acquired assets -> deterministic gradient/typographic fallbacks; Coppersmith 11 published public-demo-source assets).
DEPENDENCIES: none.
ACCEPTANCE: Every rendered Circle/Node image carries source URL, digest, rights/attribution; unrelated imagery never appears.
NEXT FALSIFICATION: Rendered image's provenance lacks source URL + digest -> law broken.

**MEDIA-02 — portable-circle-distribution-wedge** | HARVEST | P2
WHY: Portable Circle is future network wedge: website embed, hover/tap, Node deep-link, object preview, Ask FYD entry, follow/discovery. One-snippet loader and mode A/B/C preview strategy exist. Not confused with today's core-loop proof — distribution follows product.
EVIDENCE: memory/2026-09-21.md#L1083 (embed boundary); portal-circle-spec.md §3.
DEPENDENCIES: SOC-01, SOC-21.
ACCEPTANCE: Third-party embed renders real graph-backed Circle with follow + Ask entry.
NEXT FALSIFICATION: Distribution work scheduled ahead of SOC-01 proof -> sequencing wrong.

**MEDIA-03 — deterministic-focal-preview-pipeline** | PROVE | P2
WHY: Circle previews are hostile external content; snapshot mode safest default. Focal-region resolution order (owner-selected -> SiteSpec hero -> hero image -> OG image -> logo -> title -> dominant image) deterministic; every preview record carries source, focal x/y, scale, crop strategy, capturedAt, captureMethod, digest. Reuses sharp derivatives pipeline; net-new: focal cropping, screenshot capture (Playwright — genuine install gap), sandboxed embed.
EVIDENCE: portal-circle-spec.md §3 + §10/11 (framer-motion 12.43.0 present, Floating UI/Playwright missing, sharp 0.35.3 present).
DEPENDENCIES: MEDIA-01.
ACCEPTANCE: HOST CONTENT OCCLUDED = ZERO on Playwright matrix (1920/1440/1280/tablet/mobile, zoom, reduced motion).
NEXT FALSIFICATION: Circle over host page; any occluded primary content -> fails matrix.

**MEDIA-04 — spatial-composition-engine** | OPEN | P2
WHY: Margin composition machinery (SpatialSlotManager, ContextObjectRanker, AttentionController, SemanticTargetResolver) specified as novel PING code with hard separation law: geometry never decides relevance; relevance never decides authority; authority never decides animation. Nothing exists yet (no spatial/collision geometry code anywhere).
EVIDENCE: portal-circle-spec.md §2.1-2.4, §11 ("NOTHING EXISTS: screenshot capture, CDP sessions, spatial or collision geometry").
DEPENDENCIES: SOC-05, SOC-16.
ACCEPTANCE: Safe peripheral rectangles computed deterministically from page geometry; ranker pure; attention hysteresis holds under scroll.
NEXT FALSIFICATION: Layout code consumes relevance signals (or vice versa) -> separation law violated.

## WORKER SUMMARY COUNTS
42 items: FYD SOCIAL 16 (8 DONE_VERIFIED, 5 IN_PROGRESS, 4 OPEN, 1 PROVE, 2 HARVEST, 1 DEFERRED) · RELATIONSHIPS 6 (3 DONE_VERIFIED, 3 DECISION, 1 HARVEST) · PUBLIC SOCIAL OBSERVATION 10 (1 DEFERRED, 1 DONE_VERIFIED, 1 DECISION, 1 PROVE, 6 HARVEST, 1 REJECTED) · IDENTITY RESOLUTION 4 (1 DONE_VERIFIED, 1 DECISION, 1 OPEN, 1 HARVEST) · CROSS-NETWORK ACTIONS 3 (1 DONE_VERIFIED, 2 DECISION/HARVEST) · CAMPAIGNS 5 (2 DECISION, 3 HARVEST) · MEDIA/DISTRIBUTION 4 (1 DECISION, 1 HARVEST, 1 PROVE, 1 OPEN).
Priority 1: 19 items. Critical path: SOC-01 -> SOC-02/04/05/06 -> SOC-03/07, guarded by freeze OBS-01, grant boundary SOC-11, vocabulary single-source law REL-05.
Biggest falsification levers: (1) SOC-01 browser-visible true Circle -> Node on exact head both tenants; (2) OBS-01 any adapter code merged since 2026-09-21; (3) REL-04 vocabulary change vs refs undecided; (4) MEDIA-01 any rendered image without source URL + digest.
