# ARCHITECTURE DECISIONS: FYD Website Builder
Lane: ARCHITECTURE DECISIONS, Website Builder Harvest program.
Owner order 2026-09-28 ~16:54 MDT, Nolan Geske.
Read-only inventory of the pig tree at /home/nolan/projects/ping, HEAD 0264d517ea53358d9246ddbbba66bb9dd0beb0d4 (verified 2026-09-28 ~16:55 MDT; matches expected 0264d517).
No writes, no commits, no serving, no restarts performed. All evidence from git show / cat / grep.

Verified floor (do not regress, do not argue against): 195/195 canonical tests, two real websites, same proceduralizer, deterministic graph, deterministic SiteSpec, desktop green, mobile green, URL safety green, binding verifier wired, owner visibility override green, zero customer-specific renderer code.

Method: for each of Nolan's 16 binding decisions, a testable falsifiable INVARIANT, the CURRENT FYD STATE with file paths and line evidence (or UNKNOWN), the GAP, and HARVEST RELEVANCE (which ecosystem project from the IR/sync harvest lanes bears on it; full findings in trackA/ir-sync-harvest.md and trackA/editors-harvest.md).

---

## 1. NO INVENTED CLAIMS

INVARIANT: Every factual render atom carries a classification in {DIRECT_EVIDENCE, DETERMINISTIC_DERIVATION, OWNER_ASSERTED, GENERATED_PRESENTATION} plus an evidence ref or an owner-assertion ref. Any factual atom that cannot be classified is UNKNOWN and the emission gate throws before any spec or render model is produced. No ClaimAuthority component exists anywhere; authority is EVIDENCE/OBJECT MODEL + BINDING VERIFIER only.

CURRENT FYD STATE: Strong. src/fyd/sitespec/binding-verifier.ts (814 lines) implements verifyBinding / verifySpecBindings / assertSpecBindingsVerified / dropUnboundBindings / buildVerifiedRenderModel. Header states the law verbatim: "THE RENDERER DOES NOT OWN FACTUAL TRUTH. THE SITE PLANNER DOES NOT OWN FACTUAL TRUTH. THE LLM DOES NOT OWN FACTUAL TRUTH." Render-atom vocabulary is exactly OWNER_ASSERTED / DIRECT_EVIDENCE / DETERMINISTIC_DERIVATION / GENERATED_PRESENTATION / UNKNOWN. Header explicitly records: "no ClaimAuthority is created: the existing evidence/object machinery plus this verifier owns the invariant." The render seam (src/fyd/components/renderer.tsx lines 904-953) resolves every factual value through boundField / boundTitle / boundDescription, which call resolveBoundFieldVerified; a value whose binding does not verify is omitted, never guessed. Evidence freshness horizon (365 days) downgrades stale bindings to UNBOUND. Builder copy slots are evidence-bound (src/fyd/builder/generated-presentation.ts: CopyBinding = objectId + field + claimRef, fail-closed).

GAP: The render-model.ts honestly scopes itself as a section-binding manifest, not a full semantic render model (see decision 4). No gap on the claim invariant itself.

HARVEST RELEVANCE: Independent SiteSpec project (trackA/ir-sync-harvest.md section 1): its binding verifier could assert against a named, ordered, versioned resolution pipeline; FYD should name its resolution stages so the verifier checks a fixed order, not just per-binding validity.

---

## 2. FACT vs VISIBILITY

INVARIANT: Extraction writes ObjectField(value, evidence) only and never decides publicity. A separate OwnerProjectionPolicy(field, visibility, provenance, updated_at) with visibility in {PUBLIC, HIDDEN} plus optional {CONTEXTUAL, PRIVATE} governs the public projection. DEFAULT IS NOT AUTHORITY: an owner override wins whenever policy and law permit. The seam is field-generic (phone, email, personal location, team members, pricing, social accounts, projects, testimonials); address is one field among many, never special-cased.

CURRENT FYD STATE: Partial, with a real contradiction. src/fyd/sitespec/field-visibility.ts implements resolveFieldVisibility / applyFieldVisibility / applyHideTraversal with owner decisions winning over conservative defaults, plus zero-disclosure traversal (a HIDE on an address-family field drops located_at edges and orphaned location objects, FYD-Q2 locked). src/fyd/owner-mode/visibility-policy.ts implements per-fact public/hidden with safety bounds (identity facts can never be hidden; visibility only on extracted facts). CONTRADICTION: field-visibility.ts header says "One bounded control: the address case. No privacy-settings UI, no policy engine." The conservative default (coarse) fires only for address-shaped fields/values; there is no CONTEXTUAL/PRIVATE state; and the header admits "INTEGRATION POINT (site routes are frozen; not wired)". The decision says never special-case address; the code special-cases address.

GAP: (a) Generalize the seam: the coarse/show/hide machinery works per field, but conservative defaults and the value-shape detector are address-only. (b) Wire applyFieldVisibility into the site render path (currently frozen/unwired). (c) CONTEXTUAL/PRIVATE visibility states do not exist.

HARVEST RELEVANCE: Paperboy (trackA/ir-sync-harvest.md section 6): the no-leak read chokepoint. Owner visibility should be one read-path chokepoint with a perspective (public sees published, preview sees drafts, private fields never serialize), not a flag checked in components. Payload (same file, section 4): composable access primitives (anyone / authenticated / authenticatedOrPublished) defined once and combined per collection, instead of inline visibility logic.

---

## 3. WHY THIS? = progressive disclosure, NOT a provenance dashboard

INVARIANT: "Why this?" renders as a collapsed on-demand disclosure attached to a claim, never as a dashboard or a always-visible provenance panel. It is wired to the primary owner workflow FYD UNDERSTOOD ME -> CONFIRM / CORRECT / HIDE -> CONTINUE. It surfaces only under one of six conditions: FYD is wrong, sources conflict, the owner asks why, Ask FYD cites the claim, an agent proposes a consequential change, or a customer disputes the information.

CURRENT FYD STATE: The disclosure mechanics exist. src/fyd/ui/why-this.tsx renders a <details> element ("a quiet inline control that expands to the claim's lineage... Never plastered; one per claim that needs it") and returns null when no steps exist (fail closed). src/fyd/object/why-this-steps.ts builds the CLAIM -> SOURCE -> OBSERVED WHEN -> EVIDENCE -> SUPPORT chain with SUPPORT in {DIRECT, DERIVED, OWNER-CONFIRMED}, never inventing a link (missing links render as "unknown").

GAP: The six trigger conditions are not implemented. The control renders wherever callers pass steps; there is no gating on FYD-wrong / sources-conflict / owner-asked / ask-cited / consequential-change / customer-dispute. The CONFIRM/CORRECT/HIDE workflow lives adjacent in customize/ and owner-mode/corrections.ts but is not unified with the disclosure as one primary flow.

HARVEST RELEVANCE: None directly. This is FYD-native trust infrastructure.

---

## 4. DETERMINISM LOCK

INVARIANT: Same (SiteSpec, ObjectGraph snapshot, ViewerContext, DesignTokens, RendererVersion) produces the same SEMANTIC RENDER MODEL. Not byte-identical browser HTML. Every ordering has an explicit tie-break (never object-iteration accident, unspecified DB order, random IDs, or wall clock). Runtime timestamps, random DOM IDs, and hydration details are excluded from the model and its digest.

CURRENT FYD STATE: Strong at the binding level, honest-scoped at the model level. src/fyd/sitespec/binding-verifier.ts buildVerifiedRenderModel is deterministic: canonical atoms + rendererVersion + viewerId, SHA-256 digest, no timestamps, atoms sorted by stable id, input order never affects output. src/fyd/sitespec/render-model.ts buildSemanticRenderModel is a pure function of (spec, VerifiedPublicProjection): identity is the semantic checkpoint graphDigest:decisionsDigest, ordering mirrors the real render path (resolveQuery deterministic ordering: updatedAt desc with id tiebreak, then owner objectOrder, then hidden exclusion). src/fyd/sitespec/contract-digests.ts pins the component catalog and theme tokens by digest; RENDERER_VERSION derives from the catalog digest so any render-semantics change rotates the version and fails the contract-drift check.

GAP: render-model.ts explicitly states its honest scope: "this is a SECTION-BINDING MANIFEST, not a full semantic render model... naming it a 'semantic render model' overstates what it proves." It records which sections bind which objects in render order; it does not capture resolved content values, layout, styling, or interaction. The verified render model covers factual atoms. A full semantic render model (sections + bound values + tokens + ordering, all digested) does not yet exist as one artifact.

HARVEST RELEVANCE: Independent SiteSpec (section 1): resolution as a named, ordered, versioned pipeline (their specVersion). FYD should name and version its resolution stages so the determinism lock covers a fixed stage order, and adopt draft/published filtering as a built-in query semantic.

---

## 5. NO GIANT AI PLANNER

INVARIANT: A basic website is generated with zero LLM calls. Planning is deterministic rules over (verified object graph, owner intent, dimension vector, planner version, design tokens, viewer class): object presence, cardinality, relationship types, capabilities, owner preferences, site objective. AI may propose deviations later; it is never required to generate a basic site. (Cost, latency, determinism, regeneration, testing, trust.)

CURRENT FYD STATE: Compliant. src/fyd/builder/planner.ts header: "Semantic determinism: the same (ObjectGraph, OwnerIntent, vector, planner version, design tokens, viewer class) yields the same semantic render model... no timestamps enter planning decisions." The pipeline is verified graph -> generateSiteSpec (src/fyd/proceduralize/generator.ts) -> eligibility filter -> dimension-vector composition -> owner-intent filters -> generated presentation (verified) -> dependency manifest. grep across src/fyd/builder and src/fyd/proceduralize finds no LLM usage; src/fyd/builder/semantic-diff.ts explicitly notes "No LLM inside."

GAP: None on the baseline. The open design question is the deviation path: how an AI-proposed deviation enters (it must arrive as a typed patch through the decision-8 pipeline, never as direct plan mutation). That contract is implied but not yet pinned by a test.

HARVEST RELEVANCE: json-render (section 2): deterministic directives ($format, $math, $count, $pluralize) are the exact shape of allowable AI-adjacent behavior: the agent picks evidence and phrasing while the machine computes. Adopt as the deviation vocabulary when the AI-proposal path is built.

---

## 6. LAYER STACK

INVARIANT: Data flows one way: SOURCE (website/social/docs/owner input) -> EVIDENCE GRAPH (what FYD knows and why) -> OBJECT GRAPH (semantic world) -> OWNER STATE (corrections, visibility, preferences, intent) -> EXPERIENCE SPEC (pages, sections, queries, featured objects, design tokens, capability bindings) -> RENDER MODEL (deterministic resolved UI) -> RENDERERS (web, mobile, Circle, embed, future). Each layer has exactly one writer; no layer reaches around another; the renderer never reads the source layer.

CURRENT FYD STATE: The stack exists and the hard boundaries are documented. src/fyd/acquisition/ (static-adapter.ts, live-loop.ts) ingests sources; src/fyd/proceduralize/ (structured-data.ts, microdata.ts, vocabulary.ts, proceduralizer.ts) structures evidence; src/fyd/builder/object-builder.ts owns object-graph integrity ("the site planner NEVER manufactures business facts; it only consumes graphs this module has verified and attested") with a deterministic verifier (tenant, schema, evidence refs, IDs, relationship legality, visibility); OWNER STATE lives in src/fyd/owner-mode/ (corrections.ts, visibility-policy.ts, provenance.ts) and src/fyd/customize/; EXPERIENCE SPEC is FYDSiteSpec (src/fyd/sitespec/types.ts); RENDER MODEL is the verified render model + section-binding manifest; RENDERERS: src/fyd/components/renderer.tsx (web), src/fyd/components/viewport.tsx (mobile projection of the same spec; "ONE SEMANTIC SITESPEC... the renderer never branches on a DesktopSiteSpec/MobileSiteSpec"), Circle via src/fyd/ask/fyd-circle.tsx and src/fyd/ui/fyd-circle.tsx.

GAP: The EVIDENCE GRAPH vs OBJECT GRAPH distinction is thinner than the decision's wording: claim/ (claim-projection.ts, verification-seam.ts) and lineage/ exist, but there is no single named evidence-graph artifact the object graph is projected from. Embed and future renderers do not exist yet (fine; the decision lists them as future).

HARVEST RELEVANCE: Independent SiteSpec (section 1): their staged core resolution (content, relations, queries, routes, final props in fixed order, components receive resolved props only) is the concrete shape FYD's EVIDENCE -> OBJECT -> EXPERIENCE stages should be named and versioned as.

---

## 7. REFERENCE OVER COPY

INVARIANT: SiteSpec sections carry OBJECT REFERENCE / QUERY / ROLE / PRESENTATION OVERRIDE only. No section stores copied business facts. A source object update changes the render without touching the experience definition. Factual component props are bindings resolved at render time through the decision-1 verifier.

CURRENT FYD STATE: Strong. src/fyd/sitespec/types.ts header: "sections name a registered component and declare HOW to fetch their objects (query), never the objects themselves." FYDQuery kinds: owner / related / all / reference / static. FYDPresentation carries only heading/copy overrides, featuredIds, hidden, objectOrder, hiddenObjectIds (display decisions, never facts; copy edits arrive as PROPOSED only). The renderer resolves every factual value through boundField/boundTitle/boundDescription (renderer.tsx lines 904-1003). Generated copy uses CopyBinding (objectId + field + claimRef) and fails closed on ungrounded copy (src/fyd/builder/generated-presentation.ts).

GAP: The `static` query kind is a potential copy escape hatch; its semantics need a test pinning that it carries no business facts. FYDPresentation.copy is free text (owner-proposed, approval-gated; acceptable) but the boundary between presentation copy and factual claims inside it rests entirely on the generated-presentation verifier holding.

HARVEST RELEVANCE: Independent SiteSpec (section 1): `$ref: "entry:title"` style refs, never copied facts; their AGENTS.md pattern (agents keep content selection in Page Spec, resolve through entry:/query: refs, never maintain parallel path lists) is directly adoptable as FYD agent guidance.

---

## 8. TYPED SITEPATCH

INVARIANT: One typed patch vocabulary covers MOVE_SECTION, ADD_SECTION, REMOVE_SECTION, SET_VISIBILITY, SET_FEATURED_OBJECT, SET_DESIGN_TOKEN, SET_PRESENTATION_COPY, ADD_PAGE, REMOVE_PAGE, CHANGE_QUERY. Every mutation source (drag/drop, form, Ask FYD, agent, API, MCP) emits the same patch type. Pipeline: PATCH -> VALIDATE -> CAPABILITY -> PREVIEW -> APPROVAL WHEN REQUIRED -> EVENT -> NEW SPEC VERSION. Undo is an explicit transition/restoration proposal on durable versions; no undo stacks hidden in React.

CURRENT FYD STATE: The typed-patch direction is real, but the vocabulary is fragmented across three type systems and the op set is incomplete. (a) src/fyd/proceduralize/patch.ts: SiteIntent (reorder_section, toggle_section, set_featured, reorder_object, deactivate_object, edit_copy, set_theme_token), proposal path intent -> canonicalize -> validate -> digest the owner approves verbatim. (b) src/lib/ping/types.ts SitePatchOperation (lines 307-322): only reorder_section_objects and set_presentation. (c) src/fyd/customize/types.ts: OwnerIntent (promote_first, feature_object, hide/show_section, hide_object) + PresentationIntentOverlayOp. Ask FYD drafts site_patch proposals bound to the exact spec digest with a signed envelope (src/fyd/ask/site-patch.ts, envelope.ts). FYDSiteSpec carries an optional revision field (types.ts).

GAP: (a) The decision's canonical op names (MOVE_SECTION etc.) do not exist; three vocabularies overlap without one canonical mapping. (b) ADD_SECTION, REMOVE_SECTION, ADD_PAGE, REMOVE_PAGE, CHANGE_QUERY have no patch op. (c) No durable spec-version history or version-restore (undo) found; revision is a field, not a store. (d) The CAPABILITY stage exists in owner-mode/capability.ts (deny by default) but its wiring into the patch pipeline needs verification.

HARVEST RELEVANCE: json-render (section 2): ADOPT the exact JSONL line contract {"op","path","value"} with JSON-pointer paths as the patch wire shape, validation between every patch, createSpecStreamCompiler-style incremental compilation for PREVIEW, and targeted repair (focused patches on validation failure, never full rewrites). Payload/Paperboy (sections 4, 6): ADOPT versions + drafts + _status as the undo/audit model: every patch batch produces a draft version, approve flips to published, version restore is undo, agent provenance recorded per version with a publish gate. Paperboy: ADOPT the single-mutation-contract principle with test-enforced agent/API parity; no privileged AI backdoor.

---

## 9. TOKENS

INVARIANT: Design is layered data: BRAND TOKENS (color, font, radius, spacing, imagery direction) / COMPONENT VARIANTS (hero, service grid, card, navigation) / SECTION CONFIG (density, alignment, emphasis). Never CSS-as-JSON. Agents mutate themes as data through the patch stream. Escape hatches come later, explicitly.

CURRENT FYD STATE: The brand-token layer is real. src/fyd/sitespec/types.ts FYDThemeTokens: accent, accentForeground, surface, ink, radius (none/sm/md/lg/full), fontDisplay, fontBody, plus typography, spacing, colors, surfaces, shadows, layout, breakpoints, media, motion tokens, layoutCharacter (EDITORIAL/CRAFT/TECHNICAL/RETAIL/PROFESSIONAL/CREATOR), and FYDDesignIntent (density compact/comfortable, contentWidthPx, mediaTreatment, objectEmphasis quiet/balanced/prominent). src/fyd/media/media-tokens.ts exists; contract-digests.ts pins THEME_TOKENS_DIGEST; the component registry (src/fyd/components/registry.ts) declares variants, responsive behavior, and editableProperties per component. The design-system compiler direction is documented in types.ts ("semantic design intent lives on the SiteSpec; a deterministic token map compiles it to presentation... No arbitrary CSS generation, ever").

GAP: Variant x state contracts (interaction/form states) are not first-class; per-section config (density/alignment/emphasis at the section level) is implied by designIntent but not pinned as a section-config contract; escape hatches are undesigned (correct per decision: later).

HARVEST RELEVANCE: Independent SiteSpec (section 1): ADAPT Design System as spec data with variant x state contracts and a Design Lab that renders tokens, state matrices, and stress fixtures directly from the installed system, with no preview behavior leaking into production routes. This is the shape FYD's PREVIEW stage should grow into for design changes; FYD's SET_DESIGN_TOKEN patch op is the mutation path.

---

## 10. MEDIA

INVARIANT: For authorized demo business media, ingest public media into a managed FYD media pipeline where rights/use are appropriate. Every asset stores source URL, observed timestamp, content digest, metadata, provenance, and the original/derivative relationship. Serve optimized derivatives. Never claim ownership by caching; preserve attribution and rights. If authorization or licensing is uncertain: HOTLINK OR OMIT. No bulk copy of third-party media.

CURRENT FYD STATE: Strong. src/fyd/media/ingest.ts pipeline: SOURCE REFERENCE -> RIGHTS GATE -> SAFE FETCH -> DIGEST -> MEDIA OBSERVATION -> FYD DERIVATIVES -> MEDIA OBJECT (+ manifest) -> RENDER. Rights are classified FIRST (discover.ts); assets classified unclear-reference-only are REJECTED before any bytes move (no fetch, no derivatives, no media object). SSRF gate (safe-fetch.ts). sha256 digest dedupes across pages and runs; derivatives are bounded into the FYD-managed cache; the manifest records every observation including failures and rejections. src/fyd/media/provenance.ts: every record carries original source URL, observed_at, sha256 of original bytes, dimensions, rights/source classification "never implying FYD copyright ownership", and the derived-asset relationship (each variant names the original digest). Deterministic for identical inputs.

GAP: The DEMO-AUTHORIZED SOURCES path (Nolan 2026-09-25) lets a runner assert authorization per source with an `authorizedBasis` sentence, skipping the generic rights heuristic. It is recorded in provenance and demo-scoped, but it is an asserted-trust seam: the invariant "never claim ownership by caching" rests on the runner's honesty there. Worth a periodic audit, not a redesign.

HARVEST RELEVANCE: Independent SiteSpec (section 1): their media pipeline discipline (responsive srcset, AVIF/WebP, intrinsic dimensions, crop/focal-point controls) is adoptable as FYD's derivative standard. Paperboy (section 6): signed, short-lived preview tokens for unapproved media preview.

---

## 11. AUTH

INVARIANT: Never fake real authorization in production semantics. Demo uses an explicit DEMO OWNER MODE that is unmistakably marked as a test harness and unconfusable with real authentication. All owner mutations still travel the real proposal/approval contract where possible. Existing PING identity/auth machinery is searched before any new auth is created. A real external user test requires real owner auth.

CURRENT FYD STATE: The demo boundary is rigorously marked. src/fyd/owner-mode/gate.ts (H3 lane): "DEMO OWNER MODE is not authentication... There is no identity verification here... Nothing in this directory may ever be consulted for a real authorization decision. If production owner auth is built later, it must be built as a separate, reviewed mechanism; these demo verdicts must not be reused, wrapped, or 'upgraded'." Env-gated (NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1, server-only resolution), private-host network gate (localhost/RFC-1918/Tailscale only), unmistakable UI banner requirement. src/fyd/owner-mode/demo-chain.ts documents the SESSION -> PING IDENTITY -> CONTROL RELATIONSHIP -> CAPABILITY chain as DEMO SCAFFOLDING with deny-by-default capability evaluation. Owner mutations travel propose/approve (customize/server.ts, owner-proposal.ts). The chain reuses PING session machinery (getPracticeIdentityId from @/lib/ping/session), which partially satisfies "search existing PING identity/auth machinery first."

GAP: Production owner auth does not exist (correct per the decision; it must be a separate reviewed mechanism). The decision's "where possible" clause for the real proposal/approval contract in demo mode is satisfied for fact corrections and site patches; verify it holds for every owner mutation path as new ones are added.

HARVEST RELEVANCE: Paperboy (section 6) and AI SDK (section 3): ADOPT the consent/authorization separation. Approval is consent (the owner saying yes); authorization is entitlement evaluated inside the mutation contract (the capability check). The agent's patch stream must pass the identical validate/authorize/apply path as a human's click. Payload (section 4): the overrideAccess:false discipline: every mutation path carries the actor and passes access control; a privileged internal path exists only for labeled trusted system work.

---

## 12. ASK FYD

INVARIANT: Full evidence-bounded Q&A for public information. Answers anything supportable from public objects, public evidence, public relationships, and authorized public tools. When unsupported: say what is unknown. No hallucination, no private-context exposure. Operates on OBJECTS / RELATIONSHIPS / EVIDENCE / CAPABILITIES, never on scraped rendered text. Canonical test: "What services does this business offer, and how do you know?" If no Service objects exist: do NOT fabricate; answer from available evidence with correct classification or identify the extraction/model gap.

CURRENT FYD STATE: Strong. src/fyd/ask/contract.ts (Nolan 2026-09-25, binding): INPUT = QUESTION + CURRENT OBJECT + RELATED OBJECT SUBGRAPH + EVIDENCE + VIEWER CONTEXT + ALLOWED CAPABILITIES; OUTPUT = ANSWER + CLAIMS + EVIDENCE REFERENCES + UNCERTAINTIES + OPTIONAL PROPOSED ACTION. The contract "owns no truth... it checks the answer the pipeline produced against the support-class contract"; violations fail closed as honest-unknown. src/fyd/ask/visitor-answer.ts carries the support vocabulary (DIRECT / DERIVED / INFERRED / OWNER_ASSERTED / CONFLICTING / UNKNOWN). Test coverage includes ask-privacy-probe, ask-scope-guard, ask-response-class, services-evidence, demo-classification (src/fyd/ask/__tests__/). The composer is deterministic and evidence-backed (answer.ts header).

GAP: The canonical "how do you know?" citation UX for the visitor surface is implemented in the answer contract (evidence references); confirm the visitor widget surfaces uncertainties as visibly as answers. No gap found on the no-hallucination / no-private-exposure rules.

HARVEST RELEVANCE: json-render (section 2): deterministic directives as the pattern for numeric answers (machine computes from evidence, agent phrases). Paperboy (section 6): honest refusal when unconfigured (their AI assistant refuses with a clear error instead of faking output); adopt as the standing rule for any FYD agent surface with missing capability.

---

## 13. CONVERSATIONAL EDIT

INVARIANT: "Move emergency plumbing to the top." -> NATURAL LANGUAGE -> INTENT -> TYPED SITE PATCH -> VALIDATION -> PREVIEW -> APPROVAL -> APPLY -> RENDER. No arbitrary React/filesystem access for normal site customization. The owner teaches YES-CORRECT / NO-CHANGE-IT-TO-THIS / DON'T-SHOW-THIS into durable owner state that outranks source-derived state. Future regeneration: NEW SOURCE STATE + OWNER STATE + EXISTING EXPERIENCE INTENT -> UPDATED EXPERIENCE.

CURRENT FYD STATE: The NL->intent->proposal path exists and is deterministic. src/fyd/customize/owner-command-compiler.ts: "Plain English -> OwnerIntent (typed, deterministic) -> OwnerProposal... The compiler never touches the DOM, the spec, or the facts: it produces typed intents. Preview, approval, apply, and replay all happen downstream on the proposal." Supported commands include promote_first, hide/show_section, feature_object, promote_action, show_locations, hide/show_fact, remove_social_link; anything else is an honest Unsupported, never a guess. src/fyd/object/commands.ts: "deterministic plain language -> typed OwnerCommand. No AI, no network." Owner state is durable in owner-mode/corrections.ts (assertions with provenance) and the visibility decision log (append-only, latest wins). field-visibility.ts documents the regeneration law: "a clean re-ingest (fresh SOURCE STATE) plus re-applying the same decisions reproduces the owner's intent."

GAP: The full regeneration loop (new source state + owner state + existing experience intent -> updated experience) is asserted as a design law but the re-ingest path exercising it end to end needs verification. The YES-CORRECT / NO-CHANGE-IT-TO-THIS / DON'T-SHOW-THIS teaching vocabulary maps to corrections/visibility/hide-fact mechanics, but is not yet named as one teaching contract.

HARVEST RELEVANCE: json-render (section 2): catalog.prompt(): generate the agent's system prompt from the component/section catalog so the NL intent vocabulary and the patch validator can never drift. AI SDK (section 3): typed stream parts (text-delta / tool-call / tool-result) as the wire shape for NL -> PATCH STREAM -> VALIDATE -> PREVIEW stages.

---

## 14. SEMANTIC SEAMS (preserve; do NOT build commerce now)

INVARIANT: SiteSpec projects semantic types to components that carry their capability seam: Product -> ProductCard -> buy; Service -> ServiceCard -> request_quote; Appointment -> BookingComponent -> schedule; Donation -> DonationComponent -> donate; Person -> Circle -> follow; Post -> PostCard -> like/reply/reference; Business -> Node -> follow/contact. SiteSpec projects these semantics; it does not own them. Commerce is not built now.

CURRENT FYD STATE: The projection seam exists; commerce correctly absent. src/fyd/components/registry.ts: eighteen section components plus GenericObjectCard, one schema->component mapping owned by the SCHEMA_ROLES table (src/fyd/sitespec/schema-roles.ts), no schema id hardcoded in the registry. Capability seams present: src/fyd/object/likes.ts, src/fyd/object/follows.ts, src/fyd/adapters/activitypub/follow.ts, src/fyd/ui/circle-machine.ts, src/fyd/ask/circle-actions.ts ("The Circle is the portable doorway into an FYD Node"). No buy/request_quote/schedule/donate implementation found, which is compliance, not a gap.

GAP: Confirm the schema-role table reserves the commerce semantic slots (product/appointment/donation) as named roles even though no component implements transactions yet; otherwise a future commerce seam has nowhere to land. UNKNOWN from this read (schema-roles.ts not fully inspected).

HARVEST RELEVANCE: Independent SiteSpec (section 1): their Page -> Section -> UI boundary with components receiving resolved props only is the same seam discipline; keep FYD's registry as the single mapping. Paperboy (section 6): forms-as-schema (interactive structures delivered as validated schemas, never markup) is the pattern to adopt when the booking/quote seams are eventually built: the renderer styles them, the contract owns them.

---

## 15. EXPORT DESIGN

INVARIANT: SiteSpec is designed so FYD can eventually produce hosted site, static HTML, React/Next, Astro, embed, portable JSON, and possibly CMS projection. No export is fully implemented now, and no design assumption makes the FYD renderer the only possible backend. Zero customer-specific code in the renderer.

CURRENT FYD STATE: The design posture is correct. src/fyd/sitespec/types.ts header: "the spec is DATA, never generated JSX... A spec is portable, diffable, validatable, and deterministic: the same graph always yields the same spec." src/fyd/boundary/data-boundary.ts defines the portable customer data package ("take your data" export as portable JSON; data stays separable, exportable, deletable). The verified floor includes zero customer-specific renderer code. No exporters for static HTML / React / Astro / embed found, which is compliance with "do not implement all exports."

GAP: Renderer plurality is untested: renderer.tsx is the only backend exercised, so the "no assumption makes the FYD renderer the only backend" invariant has no second-backend proof. A cheap falsification would be one alternate projection (e.g. a static-HTML snapshot renderer) proving the spec carries everything a non-React backend needs.

HARVEST RELEVANCE: Independent SiteSpec (section 1): CAUTION. Their Astro-coupled production path is exactly the coupling to avoid; take the IR concepts, never the renderer coupling. json-render (section 2): their multi-renderer catalog (react/vue/svelte/native/pdf/email from one spec) is the shape of renderer plurality done right; their codegen package is the portable-artifact pattern.

---

## 16. NO GLOBAL AI ROUTER

INVARIANT: Deterministic routing is the baseline for every pipeline branch (ask intent detection, site-patch intent detection, command compilation). AI routing is added only where evaluation proves incremental value against the deterministic baseline. The standing bar: the deterministic baseline wins 18/20 grounded examples; the failure-triage shadow experiment may run but is not product P0.

CURRENT FYD STATE: Compliant by absence. src/fyd/ask/site-patch.ts detectSitePatchIntent is keyword-anchored and deterministic ("authority checks happen separately"). src/fyd/customize/owner-command-compiler.ts uses keyword-anchored matchers over normalized text ("Pure, deterministic, browser-safe"). src/fyd/object/commands.ts: "No AI, no network." No router component, no model dispatch, no routing prompt found in src/fyd.

GAP: The 18/20 grounded-examples evaluation harness was not located in this read (UNKNOWN whether it exists as an artifact). The failure-triage shadow experiment is permitted but its existence/status is UNKNOWN. If AI routing is ever proposed, the evaluation gate needs a pinned harness first.

HARVEST RELEVANCE: AI SDK (section 3): ToolLoopAgent with per-tool approval hooks is the bounded shape IF AI routing is ever added: the unapproved path cannot reach execute, and entitlement stays inside the tool. Evaluation-first remains the gate; nothing in the harvest argues for a router now.

---

## IR COMPARISON

Independent findings: ~/workspace/ping-24h/builder-harvest/trackA/ir-sync-harvest.md (Site IR, patch streams, sync, CMS) and ~/workspace/ping-24h/builder-harvest/trackA/editors-harvest.md. Nothing found argues against FYD's core thesis or the 16 decisions above. What follows is ADOPT / ADAPT / REJECT per source, mapped to decision numbers. The independent SiteSpec project (sitespec/sitespec, 31 commits, 0 stars, MIT) is treated as design transfer, not a dependency. Do not rename FYD's SiteSpec.

### A. Independent SiteSpec project: the 3 sharpest IR ideas

A1. Archetype-constrained page specs. Their Page Spec declares archetype (detail, article) naming the legal section set and order; the agent fills slots instead of guessing page structure. FYD already has FYDSiteArchetype (KNOWLEDGE / TRADES / TECHNICAL_ENTERPRISE, sitespec/types.ts) but only as an optional composition-profile label. ADAPT (decisions 4, 5, 8): promote archetype to a validation-time contract: a named, testable promise about page shape (hero + services + proof + contact for a trade detail page) that constrains the planner (5), the binding verifier (4), and the agent's patch generator (8). Do not take their archetype names; keep FYD's.

A2. Resolution as a named, ordered, versioned pipeline. Their core resolves entry:/query:/param: refs, relations, sort, pagination, draft filtering in a fixed order before component validation, asserted by their binding verifier, versioned as specVersion. FYD's direction matches (queries resolve before render; verifier gates emission) but the stages are unnamed. ADOPT (decisions 1, 4, 6): name FYD's reference kinds (FYDQuery kinds owner/related/all/reference/static are close), fix the resolution order as a versioned contract the binding verifier asserts, and make draft/published filtering a built-in query semantic rather than a per-query concern.

A3. Design System as spec data with variant x state contracts and a Design Lab. Their theme layer is validated data (semantic tokens, variant x state contracts, controlled token extensions) plus a Design Lab rendering tokens, state matrices, and stress fixtures directly from the installed system, with no preview behavior leaking into production routes. ADAPT (decision 9): FYDThemeTokens is already data and SET_DESIGN_TOKEN is already a patch op; add variant x state contracts and grow FYD's PREVIEW stage into a Design-Lab shape for design changes (render the token/state matrix from the system itself). Do not take their Astro coupling or their Git-as-database mutation model (decision 8: FYD's typed patch stream with versions/drafts is strictly stronger).

Also portable from the same project: dynamic route expansion discipline (every production path declared up front in page.paths; no runtime route discovery) for the day FYD generates location/service detail pages (decisions 4, 8); evidence-first migration as a staged, non-destructive pipeline with review gates per stage, as the shape of customer-site onboarding (decision 6); and an agent inspection CLI surface (site spec --json family) as a small high-leverage addition for any agent working the spec (decision 13).

REJECT from this project: the Astro renderer coupling (decision 15), Git-as-database mutation (decision 8), and the single-writer assumption.

### B. json-render patch-stream contract

ADOPT (decisions 8, 13): the exact JSONL line contract {"op":"set|add|replace|remove","path":"/elements/{key}","value":{...}} as the canonical patch wire shape for FYD's typed patch stream, with validation between every patch and render; createSpecStreamCompiler-style incremental compilation as the pattern for the PREVIEW stage (progressive render during the patch stream); targeted repair on validation failure (focused patches, never full rewrites), which cuts token cost and keeps every change reviewable line by line; catalog.prompt() (generate the agent's system prompt from the component/section catalog) so the NL intent vocabulary (13) and the patch validator (8) can never drift; deterministic directives ($format, $math, $count, $pluralize) as the deviation vocabulary for decision 5 and numeric answers in decision 12 (the machine computes, the agent phrases). ADAPT: FYD's ops are semantic (reorder_section, set_presentation) rather than path-addressed; adopt the line contract and validation discipline while keeping the semantic op vocabulary, or define the mapping from semantic ops to JSON-pointer paths as part of the canonical op spec. REJECT: nothing structural; json-render's theme model is intentionally empty (theming lives in implementations), which agrees with decision 9's tokens-as-data.

### C. Paperboy principle

ADOPT (decisions 8, 11, 2): the single-mutation-contract principle, stated precisely: every write path (visual editor, REST, MCP, agent, chat customization) calls the same data-layer functions and inherits the same validation, permissions, and audit trail, with agent/API parity test-enforced; no privileged AI backdoor. This is the enforcement detail behind decision 8's pipeline and decision 11's demo boundary. ADOPT the consent/authorization separation (decision 11): approval is consent, authorization is entitlement evaluated inside the mutation contract (their per-tool needsApproval where the unapproved path cannot reach execute). ADOPT the no-leak read chokepoint (decision 2): one read path with a perspective; public sees published, preview sees drafts, private fields never serialize; owner visibility becomes this chokepoint, not a component flag. ADOPT agent provenance per version plus an agent-publish gate (decisions 8, 11): every applied patch records human vs agent authorship, and agent-authored drafts require approval before publish. ADOPT forms-as-schema (decision 14): when booking/quote seams are eventually built, deliver them as validated schemas, never markup. ADOPT honest refusal (decision 12): any FYD agent surface refuses with a clear error when unconfigured instead of faking output. Also portable: composable access primitives defined once (Payload, decision 2) and afterChange-style invalidation sets emitted per patch batch (Payload, decision 8).

### D. Cautions

Automerge: REJECT for the customer render path entirely (decision 8). ~320kB WASM bundle plus no built-in signing argue it stays out of customer-facing code; editor surface only, and only if multi-editor real-time collaboration becomes a real product requirement. If ever used, the seam sits strictly in the SiteSpec editing layer above PING canonical events as a scratch convergence surface; merge resolves editing conflicts, approval decides truth; CRDT semantics never become canonical. Harvestable now without the dependency: the change DAG as the model for patch-stream auditability (actor, sequence, dependencies per applied patch), actor-labeled changes as the provenance pattern, and ImmutableString as the primitive for atomic non-collaborative values (decision 8).

AI SDK: transport patterns only (decisions 8, 13). Schema-bind patch payloads at generation time with Zod; typed stream parts as the wire shape for AGENT -> PATCH STREAM -> VALIDATE -> PREVIEW; caller-owned memory means FYD conversation and patch history belong in PING events, not in any SDK.

Payload: patterns only, never the product (decisions 2, 8, 11). Do not turn FYD into Payload.

Net: the harvest strengthens decisions 8 (patch wire format, versions-as-undo, single mutation contract), 9 (design system as data + Design Lab preview), 2 (no-leak read chokepoint), 11 (consent vs authorization), and 4/6 (named versioned resolution pipeline). It contradicts none of the 16.
