# FYD Composition System: Code Harvest Inventory (Lane A, read-only)

Repo: `/home/nolan/projects/ping`, branch `fyd/sitespec-generator`. Inventory produced 2026-09-21 from direct reads of the files listed. Files not opened are marked NOT OPENED; nothing is asserted about them.

Verdict key: **HARVEST AS-IS** (reuse the file/module unchanged) / **ADAPT** (reuse with a stated modification) / **REJECT** (do not reuse, with reason).

---

## 1. Object machinery

| Location | Purpose | Inputs / data contract | Verdict |
|---|---|---|---|
| `src/fyd/object/types.ts` | Canonical read-model types: `ObjectView`, `ObjectCapability` (7 kinds: view, ask, follow, like, call, email, website), `ObjectMediaView`, `ObjectServiceView`, `ObjectContactView`, `ObjectProvenanceView`, `CircleProjection`, owner state `OwnerOverrides`, commands `OwnerCommand` | Consumed by view.ts (server), object-circle.tsx, /o pages, API routes. `FieldCorrectionView extends OwnerFieldCorrection` from `@/lib/ping/types` | **HARVEST AS-IS** — the shared contract everything else speaks |
| `src/fyd/object/view.ts` | Server-only PING-backed projection builder. `loadObjectView(slug)`, `loadCircleProjection(slug)`, `listObjectIds()`, `knownServices()`. Layers: SOURCE (PING-backed projection, digest-verified, from `@/fyd/data/ping-object-source`), DERIVED (area/category keyword mapping), OWNER (owner-store overrides, never overwritten by ingest). `SERVICE_PREDICATES = ["provides", "offers"]` mirrors generator + renderer | `ObjectGraph` from `getPingObjectGraphSync(siteId)` | **HARVEST AS-IS** — the canonical read seam |
| `src/fyd/object/object-projection.ts` | Generic schema-agnostic projection over ONE prop: `ObjectProjection` { id, schema, kindLabel, name, category/facts/contact (evidence-graded `Fact` { label, value, evidence: ClaimEvidence { state, receipt?, asOf?, steps? } }), people (`RelatedRef[]`), capabilities, provenance, sampleQuestions, ownerUpdatedAt, media }. `objectViewToProjection(view)` adapts `ObjectView` with honest basis mapping (observed/inferred/withheld/unverified, unknown-basis never upgraded). `EvidenceStep` from `ui/why-this` | `ObjectView` in, `ObjectProjection` out | **HARVEST AS-IS** — schema-agnostic card/node contract |
| `src/fyd/object/card.tsx` | `ObjectCard({ projection, nodeHref?, className?, maxFacts? })` — compact object card over `ObjectProjection`; logo/initials, name, facts, capability-gated actions via evidence-chrome | `ObjectProjection` | **HARVEST AS-IS** |
| `src/fyd/object/node.tsx` | `ObjectNode({ projection, nodeHref?, className? })` — center/content-plane object view: hero, logo, gallery, contact facts, facts list, related `people`, evidence marks | `ObjectProjection` | **HARVEST AS-IS** |
| `src/fyd/object/evidence-chrome.tsx` | Shared rendering chrome for Card/Node: evidence marks (`EvidenceStateLabel` + `WhyThis`) on every visible claim; unknown renders label + Unknown mark, never value; withheld renders "Hidden by owner"; actions only from `projection.capabilities` | `ObjectProjection` subtypes (`Fact`, `RelatedRef`, `ObjectCapability`) | **HARVEST AS-IS** — evidence-at-every-claim machinery |
| `src/fyd/ui/object-circle.tsx` | `ObjectCircle({ view: ObjectView, nodeHref?, className? })` — the portable FYD doorway into an object Node. Two states: compact inline reference, and expanded preview (hover card on desktop / bottom-sheet dialog on touch, both keyboard-operable). Renders logo/initials, name, category·location, top-5 services, capability-gated actions (View/Ask/Call/Email/Website), provenance label | `ObjectView` directly (not `ObjectProjection`) | **HARVEST AS-IS** |
| `src/fyd/ui/fyd-circle.tsx` | `FydCircle` — the true FYD circle primitive (literal circle, concentric expansion: collapsed 48px / peek 88px / expanded ~208px / ask). Transform+opacity motion only, artboard-scaled. Timers + focus mgmt live here; state transitions in `circle-machine.ts` | NOT OPENED for props | **ADAPT** — harvest the circle primitive + circle-machine, but wire to the new composition system's entry surface; do not hand-build another circle |
| `src/fyd/ui/evidence-state.tsx` | `EvidenceState` type (observed | inferred | unverified | unknown | unavailable | withheld) + `EvidenceStateLabel` customer-surface labels with receipts/as-of on hover | `ClaimEvidence.state` | **HARVEST AS-IS** |
| `src/fyd/ui/why-this.tsx` | `EvidenceStep { step, detail, state? }` + `WhyThis({ claim, steps })` drill-down disclosure ("Why this?") | Steps from projection adapters | **HARVEST AS-IS** |
| `src/fyd/object/owner-store.ts` | Owner decisions: `readOverrides(objectId)`, `applyOwnerCommand` (move-service, set-service-visibility, add-service, set-address-visibility, set-contact-field, revert-contact-field). `CORRECTABLE_FIELDS = ["phone","email","website"]`. Per-object files under `data/fyd-owner/` | `OwnerCommand`, `OwnerOverrides` | **HARVEST AS-IS** — owner-wins layer, source never rewritten |
| `src/fyd/object/owner-overlay.ts` | `applyOwnerFieldCorrections(graph)` — composes owner corrections over the projection AFTER digest verification; `fields[]` carries effective value, `ownerFieldCorrections[]` keeps sourceValue vs ownerValue | `ObjectGraph` in, `OwnerOverlayResult` out | **HARVEST AS-IS** |
| `src/fyd/object/services.ts` | `slugifyService`, `deriveServicesFromDescription` (legacy prose-parse helper; ObjectView now uses structured service objects) | Description string | **REJECT for composition** — superseded by structured service objects; prose-parsing is the old path |
| `src/fyd/object/follows.ts`, `likes.ts` | Client-side follow/like state (`isFollowing/setFollowing`, `isLiked/setLiked`); data/fyd-follows, data/fyd-likes | objectId | **ADAPT** — harvest pattern, but rebind to the new system's identity/grant model |
| `src/app/o/[objectId]/page.tsx` | Full-page object Node surface (hero, services, service area, about + WhyThis, contact, source-vs-owner, Ask panel). Header comment: **DEMOTED** — full-page customer projection is an optional projection, not the product surface; Circle is the product primitive; not linked from normal navigation | `loadObjectView(objectId)` | **REJECT as a surface, HARVEST pieces** — page itself demoted; its section patterns and evidence-chrome usage are reusable |
| `src/app/o/[objectId]/manage/page.tsx` | Owner control plane (NOT OPENED in detail) | — | **ADAPT** — keep the manage plane concept; rebind to new system |
| `src/app/api/fyd/objects/[objectId]/route.ts` | `GET /api/fyd/objects/[objectId]` — public `ObjectView` + owner action history; 404 on unknown | objectId path param | **HARVEST AS-IS** — read surface for the new composition UI |
| `src/app/api/fyd/objects/[objectId]/overrides/route.ts` | Owner overrides write path (NOT OPENED in detail) | — | **ADAPT** — keep as the ONLY write path pattern; rebind |
| `src/app/api/fyd/projection/route.ts` | `GET /api/fyd/projection?siteId=` — RAW PING-backed projection + dump meta, NO owner overlay ("SOURCE SAYS X"); 503 on missing/tampered (fail closed) | siteId | **HARVEST AS-IS** — the source-truth endpoint |
| `src/app/dev/objects/page.tsx`, `objects-lab-client.tsx`, `lab-adapter.ts` | Internal /dev/objects lab: bridges PING-backed projection to lab render slots; business objects -> canonical `ObjectView` via `loadObjectView`; non-business -> minimal generic ObjectView from observed fields only; empty groups render explicit "renders nothing" state. `LAB_TYPE_ORDER = [Business, Service, Person, Location, Post, Project]` | `getPingObjectGraph(siteId)` | **HARVEST AS-IS** — the generic-object lab discipline (no fake people/posts) |
| `src/fyd/ui/fail-closed.tsx`, `circle-machine.ts`, `ask-fyd-widget.tsx`, `ask-object-panel.tsx` | Fail-closed UI wrapper; pure circle state machine; AskFYD section widget (posts to /api/fyd/ask, citations with Why-this disclosure); object Node ask panel. Only headers of widget/panel read | `AskFydCitation` from `../ask/visitor-answer` | **HARVEST AS-IS** for fail-closed + circle-machine; **ADAPT** widget/panel copy to new system |

---

## 2. Sites rendering + SiteSpec shape

| Location | Purpose | Inputs / data contract | Verdict |
|---|---|---|---|
| `src/fyd/proceduralize/generator.ts` | `generateSiteSpec(graph, { generatedAt, eventSequences? })` -> `FYDSiteSpec`. Pure + deterministic (same graph -> byte-identical spec). Reasoning: (1) owner = lowest-id public business; (2) group by schema ROLE; (3) pages in fixed order, page exists only when its data exists; (4) sections fixed order, ids `pageSlug:component:index`, sorts by id; (5) zero company-specific code. `ROLE_PREDICATES`: service/product `[provides, offers]`, location `[located_at, has_location]`, person `[employs, has_member]`, post/article `[publishes]`. `GENERATOR_VERSION = "1.0.0"` | `ObjectGraph { objects: PingObject[], relationships: PingRelationship[] }` | **HARVEST AS-IS** — the compiler is the core of the new composition system |
| `src/fyd/components/renderer.tsx` | `resolveQuery`, `buildRenderContext`, `renderSection(section, ctx)`, `SitePageView({ page, ctx })`. Uniform `SectionProps = { section, objects, presentation, theme, ctx }`. `RenderContext = { spec, graph (owner-visibility-projected, built only via buildRenderContext), viewer, siteId?, heroMedia? }`. Renderer never sees withheld fields; requiresData sections render nothing without objects; hidden sections return null; unknown component -> GenericObjectCard | `FYDSection` + `RenderContext` | **HARVEST AS-IS** — dumb-renderer law already implemented |
| `src/fyd/sitespec/types.ts` | The SiteSpec contract: `FYDSiteSpec { kind: "fyd.sitespec@1", ownerObjectId, version: 1, generator { name: "fyd-site-generator", version, generatedAt }, themeTokens: FYDThemeTokens { accent, accentForeground, surface, ink, radius, fontDisplay, fontBody }, navigation: FYDNavItem[], pages: FYDPage[], provenance: FYDSpecProvenance { source: "website-ingestion", claimKind: "website_statement" } }`; `FYDPage { slug, title, navLabel, sections: FYDSection[] }`; `FYDSection { id, component (registry name), query: FYDQuery, presentation: FYDPresentation { heading?, copy?, featuredIds?, hidden? } }`; `FYDQuery` kinds: `owner | related { from, predicate, predicates?, schema?, schemas?, limit? } | all { schema?, schemas?, limit? } | reference { objectIds } | static`; `ViewerContext { viewerId, displayName }`; `ObjectGraph`; `FYDFinding { severity, authority: "fyd.sitespec.validator", resourceId, path, message }` | — | **HARVEST AS-IS** — the declarative data-not-JSX contract |
| `src/fyd/sitespec/schemas.ts` | Schema defs + 5 derivations: validator (`validateAgainstSchema`), component eligibility (`eligibleComponents`), relationship rules (`relationshipRules`, `isAllowedPredicate`), capability options (`capabilityOptions`), agent tool descriptions (`agentToolDescription`). Three proof schemas: `ping.social.business@1` (fields: title*, description*, category, website, phone, email, hours, socials; relationships: provides->[service,product], publishes->[post,article], located_at->[location], employs->[person]; identityBacked: true, likeable: false), `ping.social.service@1` (title*, description*, price_hint, duration; provided_by->[business]; likeable: true), `ping.social.post@1` (title*, text, date, tags, url; published_by, replies_to; likeable: true). `SCHEMA_ROLES` maps roles {business, service, product, location, person, post, article} onto proof + `ping.knowledge.*` ingestion vocabulary. Evolution law: new fields optional, never change a type, never remove | `FieldRecord`, schema ids | **HARVEST AS-IS** — one schema definition driving validator/eligibility/relationships/capabilities/tool-descriptions |
| `src/fyd/sitespec/graph.ts` | `resolveWebsiteUrl`, presentation-binding machinery: `BindingClassification` (direct | derived | generated | owner_authored), `PresentationBinding`, `verifyPresentationBinding`, `resolveBoundField` | — | **HARVEST AS-IS** — binding verification before render |
| `src/fyd/sitespec/render-model.ts` | `buildSemanticRenderModel` (spec + graph -> `SemanticRenderModel`), canonicalization, digest; `RENDER_MODEL_VERSION = 1` | spec + graph + overrides | **HARVEST AS-IS** — the deterministic semantic render model |
| `src/fyd/sitespec/validator.ts` | `validateSiteSpec(spec, knownSchemas)` -> `FYDFinding[]`; `isRenderable(findings)`; invalid spec never renders | spec + schema set | **HARVEST AS-IS** |
| `src/fyd/sitespec/field-visibility.ts` | Owner field-visibility policy; renderer executes projected graph only | — | **HARVEST AS-IS** |
| `src/app/sites/_shared/site-client.tsx` | `SiteClient({ spec, graph, findings, renderable, siteId?, heroMedia? })` — client shell: tabs from `spec.navigation` (never hardcoded); structured editor (reorder/hide sections, featured objects, PROPOSED copy edits, design tokens) -> site_patch proposals with digest via `@/fyd/proceduralize/patch` | spec + graph + findings | **HARVEST AS-IS** — the composition/editor shell pattern |
| `src/app/sites/happy-place/page.tsx`, `src/app/sites/coppersmith-plumbing/page.tsx` | Per-site server pages: `getPingObjectGraph(SITE_ID)` -> `generateSiteSpec` -> `applyPresentationIntent` -> `heroMediaFor` -> `validateSiteSpec` -> `SiteClient`. No company-specific layout anywhere | PING-backed projection on disk | **ADAPT** — replace per-site pages with a dynamic `[siteId]` route; the pipeline inside is the template |
| `src/fyd/data/ping-object-source.ts` | The read seam: reads digest-verified PING-side dump (`/home/nolan/ping/var/fyd-projections`, `FYD_PROJECTION_DIR` for tests), `getPingObjectGraph(siteId)`. Fail-closed: missing/malformed/tampered -> refuse, never stale fallback. Checks: file exists, `meta.siteId` matches, every object has non-empty provenance ref, `graphDigest` sha256 over canonicalize(graph) matches. Applies owner field corrections AFTER verification. NEVER falls back to a static fixture | On-disk projection JSON | **HARVEST AS-IS** — server-only governed read path |
| `src/fyd/customize/*` | `applyPresentationIntent` — presentation-intent layer over the compiled spec (facts and theme untouched) | spec + intent block + graph | **ADAPT** — harvest the presentation-layer concept |
| `src/fyd/proceduralize/patch.ts` | `proposeSitePatch` / `applySitePatch` — intents -> digest-bound proposals; the [ Customize with FYD ] patch machinery | `SiteIntent` -> `SitePatchBody` | **HARVEST AS-IS** — the owner-correction/proposal engine |

### How demo fixtures flow into rendered pages (happy-place example)
1. PING-side dump (`/home/nolan/ping/tools/fyd-site-projection/dump.py`) writes digest-verified projection JSON to `/home/nolan/ping/var/fyd-projections/<siteId>.json`.
2. `getPingObjectGraph(SITE_ID)` (ping-object-source.ts) loads + digest-verifies it, applies owner field corrections (owner-overlay.ts).
3. `generateSiteSpec(graph, { generatedAt, eventSequences })` compiles the declarative `FYDSiteSpec`.
4. `applyPresentationIntent(base, presentationIntent, graph)` layers approved owner presentation.
5. `heroMediaFor(SITE_ID, graph, ownerObjectId)` resolves display media once at the server seam.
6. `validateSiteSpec(spec, knownSchemas)`; `isRenderable` gates render.
7. `SiteClient` renders pages/sections via `renderSection` + `SitePageView`.

---

## 3. Component families (sites renderer)

Registry: `src/fyd/components/registry.ts` — `FYDComponentDef { name, label, description, acceptsSchemas, ownerBound, requiresData }`. Sixteen section components + `GenericObjectCard` fallback. All sections receive the same `SectionProps = { section, objects, presentation, theme, ctx }` and resolve objects through `resolveQuery(section.query, graph, ownerObjectId)`. Required-vs-optional data: `requiresData: true` components render nothing when the query resolves zero objects; presentation.hidden sections never render.

| Component | Description (registry) | acceptsSchemas (roles) | ownerBound | requiresData | Props/data read |
|---|---|---|---|---|---|
| Hero | Identity block: name, category, tagline, primary action | business | yes | yes | owner business object; ctx.heroMedia |
| IdentityCard | Compact identity card (follow/share unwired: no UI renders them) | business | yes | yes | owner business object |
| BusinessSummary | About-style summary from the business description | business | yes | yes | owner description/summary |
| Services | Card grid of services the business provides | service | no | yes | related service objects via provides/offers |
| Products | Card grid of products the business offers | product | no | yes | related product objects via provides/offers |
| Locations | Where the business operates, as coarse public claims | location | no | yes | location objects via located_at/has_location |
| People | The people behind the business | person | no | yes | person objects via employs/has_member |
| Posts | Recent posts and articles | post + article | no | yes | posts/articles via publishes |
| ObjectGrid | Generic responsive grid for any object list | business, service, product, location, person, post, article, knowledge website | no | yes | any object list |
| ObjectFeed | Chronological feed, newest first | post, article, service, knowledge website | no | yes | any object list |
| RecentObjects | Latest objects across schemas, newest first | post, article, service, business | no | yes | any object list |
| Contact | Public contact channels: phone, email, website | business | yes | yes | owner contact fields |
| Links | Social and website links published by the business | business | yes | yes | owner socials |
| SocialProof | Reviews/testimonials, labeled as published claims | business | yes | yes | owner review/testimonial fields |
| CTA | Primary action block: visit website or start a conversation | business + service | yes | **no** | owner or service object (renders even empty) |
| AskFYD | Question box: ask anything about this business | business | yes | **no** | siteId from ctx; renders honest unavailable state without it |
| GenericObjectCard | Fallback renderer for schemas with no dedicated component (e.g. `ping.social.external_identity@1`) | none (fallback) | no | yes | any object |

Capability needs: none of the components need external capabilities; actions render from `ObjectCapability[]` / `capabilityOptions()` (open/ask/reference always; follow only identityBacked; like only likeable; reply on posts for signed-in viewers; propose_update/site_propose only when viewer controls the object; open_website only with a public URL). No fake buttons: a capability exists only when the underlying value exists.

**Verdict: HARVEST AS-IS** — registry + renderer + all 16 sections + fallback. The composition system gets the full family free; the registry comment documents the extension rule (one entry + one renderer branch).

---

## 4. Evidence/claim model + Ask FYD

| Location | Purpose | Verdict |
|---|---|---|
| `src/fyd/claim/types.ts` | Resource-claim model: `ClaimState = observed \| claimed \| verified-controlled`; `VerificationMethod` (dns-txt, well-known-file, html-meta-tag, cms-integration, provider-evidence, operator-attestation); `ClaimedIdentity { kind: demo-owner \| google, actorId, actorLabel, authenticatedAt, authNote }`; `VerificationProof { method, verifiedAt, verifiedBy, basis, artifacts (never secrets), proofNote }`; `ClaimEvent` audit history on every transition. Typing a URL is NOT proof of ownership | **HARVEST AS-IS** — ownership evidence law |
| `src/fyd/claim/store.ts`, `machine.ts`, `resource-id.ts`, `identity.ts`, `verification-seam.ts` | Claim store, claim state machine, resource ids, identity, verification seam (NOT OPENED in detail; headers confirm the state machine) | **HARVEST AS-IS** (machine + seam), verify store adapter fits new system |
| `src/app/api/fyd/claims/*` routes | claim/verify/release/identity/verification-methods endpoints | **ADAPT** — rebind auth to new system |
| `src/fyd/ui/evidence-state.tsx` + `why-this.tsx` | EvidenceState six-label customer vocabulary; `EvidenceStep`; `WhyThis` drill-down | **HARVEST AS-IS** (see section 1) |
| `src/fyd/object/object-projection.ts` (`ClaimEvidence`, `Fact`, `RelatedRef`) | Per-claim evidence basis carried through every projection; unknown -> render label with Unknown mark, never value | **HARVEST AS-IS** |
| `src/fyd/ask/*` | Ask FYD: `buildAskFydContext` (context-builder.ts) -> `composeAskFyd` (answer.ts): site-patch intents detected first (keyword-anchored, deterministic; digest-bound draft proposals via site-patch.ts; refusal when unauthorized), all other questions use the evidence-backed `composeAnswer` from `lib/ping/ask-composer`. Answer types: `AskFydAnswer extends AskAnswer { sitePatchCard }`; `SitePatchCard { title, before, after, evidenceReason, affectedObjects, operationCount, siteSpecDigest }`; `SiteSpecSummary` + `siteSpecDigest` bind proposals to the spec reasoned over. Capabilities line + forbidden effects constrain the agent. Evidence behavior: citations (`AskFydCitation`), `refusal: true` + `answerUnknown` when no supporting evidence; never hallucinates business info. Honest-refusal and cited-answer covered by permanent tests (`services-evidence.test.ts`, FYD-007) | **HARVEST AS-IS** — the evidence-bounded Q&A engine |
| `src/app/api/fyd/ask/route.ts` | `POST /api/fyd/ask { siteId, question, mode: visitor \| owner }` -> `{ ok, answer, refusal, citations }`; 404 unknown site, 400 bad question/mode, 503 projection unavailable, 500 bundle invalid. Every failure is structured JSON naming the failure kind; answer unknown, never empty | **HARVEST AS-IS** |
| `src/fyd/ask/site-spec.ts` | `SiteSpecSummary` — what the Ask agent reasons over | **HARVEST AS-IS** |

---

## 5. Fixture inventory + arbitrary-business proof recommendation

In-repo business fixtures: exactly two businesses. Source graph fixtures: `src/fyd/proceduralize/__fixtures__/happy-place-graph.ts`, `coppersmith-graph.ts` (MACHINE-GENERATED from real sites, not hand-written). Live PING-backed projections: `/home/nolan/ping/var/fyd-projections/{happy-place,coppersmith-plumbing}.json` (+ `happy-place.json.lane-c-backup`). Test-shape copies: `src/fyd/object/__tests__/fixtures/projections/{happy-place,coppersmith-plumbing}.json`. Media manifests: `src/fyd/media/manifests/{happy-place,coppersmith-plumbing}.json`. Extraction fixtures (`proceduralize/__fixtures__/fixtures-structured.ts`): synthetic Acme JSON-LD shapes + the verbatim Coppersmith JSON-LD block. The onboarding extractor (`src/fyd/onboarding/extractor.ts`) + anonymous preview (`anonymous-preview.ts`, SSRF-gated, observed-only) is the URL -> preview path for an arbitrary business, but it produces observed text, not a full graph.

| Dimension | Happy Place Carpentry LLC | Coppersmith Plumbing & HVAC |
|---|---|---|
| Source | https://happy-place-platform.vercel.app/ (happ-place-platform / happyplacecarpentry.com) | https://www.coppersmithplumbing.com/ |
| Business | Licensed Oregon carpentry contractor (CCB# 254240) | Serviced Western Colorado 25+ years; hours Mo-Fr 07:30-16:00 |
| Object count | 3 | 4 |
| Schemas | business, location, service | business, location, person, external_identity |
| Relationships | provides (1), located_at (1) | works_for (1), links_to (1), located_at (1) |
| Services | 1 (Pergola Design Consultations) | 0 |
| People | 0 | 1 (coppersmithplm, works_for) |
| Fields of note | area_served (4 counties), keywords, price_range $$, images, phone, email | hours, updated_time, locale, site_name, phone |
| Machinery exercised | Services section, area parsing -> Service area, services evidence path | People section, Links (external_identity -> GenericObjectCard fallback), hours/location rendering |
| Overlay events | 1 (overlayEventIds non-empty) | 0 |
| Media manifest | observations exist, `media: []` | (header check only) |

**Recommendation: CONFIRM Coppersmith as the arbitrary-business proof candidate**, on graph-difference merit:

1. It exercises machinery Happy Place never touches: a `person` object (employs/has_member -> People section), an `external_identity` object resolving through `componentForSchema`'s `GenericObjectCard` fallback, and `hours`/`updated_time` fields.
2. It has NO service objects, so it proves the generator's missing-data law in the other direction (no Services page invented; sections omit, never invent).
3. It is a Western Colorado trades business (Grand Junction), i.e. the actual PING Social market, and it is graph-different from happy-place (services vs people) and from PING/FYD itself (technical infrastructure entity: identities, events, missions, workers), satisfying the "arbitrary business" proof: the same components render, differing only because the graphs differ.
4. Happy Place already served as the one-read-model proof (same object ID + digests across page, Circle, ObjectView, Ask FYD). Reusing it would prove nothing new. Coppersmith also carries an owner-overlay-free projection (overlayEventIds: []) vs Happy Place's owner overlay, adding owner-layer contrast if corrections are later applied.

Caveat: both projections are small (3-4 objects). A richer third business (e.g. via the onboarding extractor path from a real URL) would strengthen the proof later, but within the in-repo inventory Coppersmith is the correct candidate.

---

## 6. Object model types (core graph types)

| Type | Defined in |
|---|---|
| `PingObject { id, schema, controllerId, visibility, title, description, fields: Record<string, string \| string[]>, createdAt, updatedAt, provenance, ownerFieldCorrections? }` | `src/lib/ping/types.ts` |
| `PingRelationship` | `src/lib/ping/types.ts` |
| `ObjectProvenance { kind, ref, derivedAt }` | `src/lib/ping/types.ts` |
| `OwnerFieldCorrection { field: phone\|email\|website, sourceValue?, ownerValue, basis, actorLabel, correctedAt, ... }` | `src/lib/ping/types.ts` |
| `PingObjectSchema`, `KnownObjectSchema`, `ObjectVisibility` | `src/lib/ping/types.ts` |
| `ObjectView`, `CircleProjection`, `ObjectCapability`, `ObjectMediaView`, `ObjectServiceView`, `ObjectContactView`, `OwnerOverrides`, `OwnerCommand` | `src/fyd/object/types.ts` |
| `ObjectProjection`, `Fact`, `ClaimEvidence`, `RelatedRef`, `ContactProjection`, `ProvenanceProjection` | `src/fyd/object/object-projection.ts` |
| `ObjectGraph { objects, relationships }`, `ViewerContext`, `FYDQuery`, `FYDSection`, `FYDPage`, `FYDNavItem`, `FYDThemeTokens`, `FYDSiteSpec`, `FYDSpecProvenance`, `FYDFinding` | `src/fyd/sitespec/types.ts` |
| `FYDSchemaDef`, `FYDSchemaField`, `FYDRelationshipRule`, `SCHEMA_ROLES`, `FYDSchemaRole`, `FYDActionKind` | `src/fyd/sitespec/schemas.ts` |
| `FYDComponentDef` | `src/fyd/components/registry.ts` |
| `RenderContext`, `SectionProps` | `src/fyd/components/renderer.tsx` |
| `SemanticRenderModel`, `SemanticSectionModel`, `SemanticPageModel` | `src/fyd/sitespec/render-model.ts` |
| `AskFydContext`, `AskFydAnswer`, `SitePatchIntent`, `SitePatchCard` | `src/fyd/ask/types.ts` |
| `AskAnswer`, `AskContext`, `AskEvidenceRef`, `AskClaimClassification`, `CapabilityPlan`, `PlannedAction`, `ActionKind`, `FydGrant`, `SitePatchOperation`, `SitePatchProposalBody`, `NodePayload`, `CircleKind`, `IntelligentCircleData` | `src/lib/ping/types.ts` |
| `ClaimState`, `VerificationMethod`, `ClaimedIdentity`, `VerificationProof`, `ClaimEvent`, `ResourceClaim` | `src/fyd/claim/types.ts` |
| `EvidenceState`, `EvidenceStep` | `src/fyd/ui/evidence-state.tsx`, `src/fyd/ui/why-this.tsx` |
| `PageEvidence` | `src/fyd/onboarding/extractor.ts` |

### Notable REJECTs for the composition system
- `src/fyd/object/services.ts` prose-parse helpers: superseded by structured service objects.
- `src/app/o/[objectId]/page.tsx` as a surface: demoted; harvest its patterns only.
- Fixture JSONs as runtime data: NEVER runtime sources (the read seam refuses fixture fallback by law; fail-closed).
- `src/fyd/ui/portal-circle.tsx`, `portal-host.tsx`: NOT OPENED; no verdict.

### Harvest headline for Lane B/C
The composition system does not need to invent: a pure deterministic compiler (`generator.ts`), a dumb validated renderer (`renderer.tsx` + `validator.ts` + `render-model.ts`), a schema-role registry (`schemas.ts` + `registry.ts`) with 16 sections + fallback, an owner-wins correction layer (`owner-store` + `owner-overlay`), an evidence-graded generic projection (`object-projection.ts` + `evidence-state` + `why-this`), evidence-bounded Q&A (`ask/*` + `/api/fyd/ask`), an ownership claim model (`claim/*`), and a presentation-intent + site-patch proposal engine (`customize/*` + `proceduralize/patch.ts`) all exist and are tested. The composition system's job is to compose them over an arbitrary business graph, not rebuild them.
