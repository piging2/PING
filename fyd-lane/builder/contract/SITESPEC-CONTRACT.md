# SiteSpec / Component Registry Contract — v0.2 HARVEST-VALIDATED

Status: VALIDATED against Lane A code harvest (2026-09-21). Rule applied: where the repo already has a working contract, ADOPT IT and list extensions as additive. v0.1's invented shapes are replaced below.

## 1. Non-negotiables (unchanged from Nolan's directive)

- Agents operate on SPECS and OBJECTS. Never rewrite arbitrary app source.
- Agents produce TYPED PATCHES, not codebases.
- No customer-specific JSX. Graph objects determine eligible components.
- LLM output never becomes arbitrary executable React.
- Human and agent manipulate the SAME structured SiteSpec.
- Render determinism is semantic: same SiteSpec + graph snapshot + viewer context + renderer/design-token versions -> same semantic render model. No wall-clock, no randomness, no LLM inside render.
- Epistemic classes: DIRECT FACT vs GENERATED COPY are separate. Design may invent presentation; never invent years in business, licenses, awards, service areas, prices, guarantees, customer counts, availability, certifications. Missing fact -> omit or ask owner.
- Conflict preservation: website says A, provider says B, owner says C -> preserve all three; owner resolves presentation.

## 2. SiteSpec document: ADOPT `FYDSiteSpec` (`src/fyd/sitespec/types.ts`)

Existing shape (kind `fyd.sitespec@1`): `ownerObjectId`, `version`, `generator { name, version, generatedAt }`, `themeTokens: FYDThemeTokens`, `navigation: FYDNavItem[]`, `pages: FYDPage[]`, `provenance`. `FYDPage { slug, title, navLabel, sections }`. `FYDSection { id, component, query: FYDQuery, presentation: FYDPresentation { heading?, copy?, featuredIds?, hidden? } }`. `FYDQuery` kinds: `owner | related | all | reference | static`. Epistemic is carried by `BindingClassification` (`direct | derived | generated | owner_authored`) in `src/fyd/sitespec/graph.ts`, verified by `verifyPresentationBinding` before render.

ADDITIVE EXTENSIONS (new, optional, backward compatible):
- `status: "draft" | "published"` + `revision: number` — Payload harvest: ACCEPT previews draft-vs-published diff; bounded revision history with restore.
- `archetype: "KNOWLEDGE" | "TRADES" | "TECHNICAL_ENTERPRISE"` — which profile composed this spec.
- `objectPresence: ObjectPresence` — the generic layout capability (section 3).

## 3. ObjectPresence: NEW generic layout capability

```ts
type ObjectPresence = {
  mode: "auto" | "rail" | "drawer" | "hidden";
  objects: string[];              // contextual object ids eligible for margin/rail
  rules: { collapseBelow: string } // breakpoint key; geometry decides, never hardcoded px
}
```

Placement law: center = canonical customer content, untouched. Margins = contextual intelligence when safe space exists. Narrow viewports collapse rail to drawer/sheet, never displace content. Harvest: `object-circle.tsx` (compact inline ref + expanded preview: hover card desktop / bottom-sheet dialog touch, keyboard-operable), `circle-machine.ts` (pure state machine), `object-projection.ts` (schema-agnostic projection), `evidence-chrome.tsx` (evidence marks on every claim), `fail-closed.tsx`.

## 4. Component registry: ADOPT `FYDComponentDef` (`src/fyd/components/registry.ts`)

Existing: `{ name, label, description, acceptsSchemas, ownerBound, requiresData }`, uniform `SectionProps = { section, objects, presentation, theme, ctx }`, objects resolved through `resolveQuery`. 16 sections + `GenericObjectCard` fallback: Hero, IdentityCard, BusinessSummary, Services, Products, Locations, People, Posts, ObjectGrid, ObjectFeed, RecentObjects, Contact, Links, SocialProof, CTA, AskFYD. Only CTA and AskFYD have `requiresData: false`. Actions render only from declared `ObjectCapability[]`; no fake buttons.

EXTENSION RULE (from the registry's own comment): one registry entry + one renderer branch. New semantic components for the golden template, all declared through this rule:
- `ObjectRail` — the contextual object rail/margin (renders ObjectCard/ObjectCircle list from ObjectPresence).
- `EvidenceFact` — a single evidence-graded fact with WhyThis drill-down.
- `MediaGallery` — media objects with FYD-managed derivative provenance.
- `RelationshipList` — typed relationship rendering (employs, provides, located_at...).
- `ObjectCollection` — named alias normalization over ObjectGrid for Nolan's vocabulary.

Each new entry declares: accepted schemas, required data, optional data, capabilities, responsive constraints (min 320px, 44px touch targets), editable properties, variants. Nolan's full vocabulary (Hero, ObjectCollection, ServiceGrid, PersonGrid, Location, EvidenceFact, CTA, MediaGallery, ArticleFeed, ObjectRail, AskFYD, Contact, RelationshipList) is the target; existing Services/People/Locations/Posts remain as the v1 implementations behind those names where they match.

## 5. Archetype profiles: NEW, as DATA/TOKENS/RULES

```ts
type ArchetypeProfile = {
  profileId: "fyd.archetype/KNOWLEDGE" | "fyd.archetype/TRADES" | "fyd.archetype/TECHNICAL_ENTERPRISE";
  compositionRules: { sectionOrder: string[]; sectionFilter: string[]; maxSections?: number };
  density: "compact" | "comfortable" | "spacious";
  typographyScale: { base: number; ratio: number };
  mediaTreatment: "documentary" | "polished" | "schematic";
  ctaEmphasis: "high" | "medium" | "low";
  objectProminence: "rail" | "drawer" | "subtle";
  tokenOverrides: Partial<FYDThemeTokens>;
}
```

Same objects, components, layout primitives, tokens, SiteSpec, renderer. Different composition rules, density, hierarchy, type scale, media treatment, CTA emphasis, object prominence. Parameterized starting points, not cages: site-level overrides are owner intent and survive regeneration. Profiles feed `generateSiteSpec` as an optional composition input; the generator stays pure and deterministic.

`FYDThemeTokens` today: `{ accent, accentForeground, surface, ink, radius, fontDisplay, fontBody }`. EXTEND additively toward the full design system (typography, spacing, color, surfaces, radius, shadow, layout, breakpoints, media, motion). Never break existing fields.

## 6. Planner: ADOPT `generateSiteSpec` (`src/fyd/proceduralize/generator.ts`)

Pure + deterministic: same graph -> byte-identical spec. Owner = lowest-id public business; group by schema ROLE; pages in fixed order, page exists only when its data exists; sections fixed order, ids `pageSlug:component:index`; zero company-specific code. `GENERATOR_VERSION = "1.0.0"`. v1 planner is deterministic data/config; no AI planner expansion.

## 7. Typed patch: ADOPT `proposeSitePatch` / `applySitePatch` (`src/fyd/proceduralize/patch.ts`)

Intents -> digest-bound proposals. Pipeline: OWNER/AGENT REQUEST -> PATCH PLANNER -> TYPED SITE PATCH -> VALIDATE (`validateSiteSpec`, `isRenderable`) -> PREVIEW DIFF (draft vs published) -> APPLY -> VERSION/REPLAY. Owner overrides live in `owner-store`/`owner-overlay` (source never rewritten; corrections applied after digest verification). The existing `[ Customize with FYD ]` machinery and `SiteClient` editor are the pattern to wire into the golden template.

## 8. Ask FYD: ADOPT `src/fyd/ask/*` + `POST /api/fyd/ask`

`buildAskFydContext` -> `composeAskFyd`: site-patch intents detected first (keyword-anchored, deterministic, digest-bound proposals, refusal when unauthorized); all other questions use evidence-backed `composeAnswer`. Citations on every supported claim; `refusal: true` + `answerUnknown` when no supporting evidence; never hallucinates. Permanent tests cover honest refusal + cited answer (FYD-007). Rule for the golden template: SUPPORTED -> answer + evidence; PARTIALLY SUPPORTED -> answer what is known + flag uncertainty; UNSUPPORTED -> say evidence does not establish it.

## 9. Read model: ADOPT the governed seam

`src/fyd/data/ping-object-source.ts`: digest-verified PING-side projection JSON, fail-closed (missing/malformed/tampered -> refuse, never stale fallback, NEVER fixture fallback). Owner corrections applied AFTER verification. `/api/fyd/projection?siteId=` is the source-truth endpoint ("SOURCE SAYS X", no owner overlay).

## 10. Ecosystem-validated additions

- Schema.org is a VERSIONED TRANSLATION MAP pinned to vocabulary **v30.0**. **30.1 is UNVERIFIED** (not found in any primary source as of 2026-09-21); no 30.1 types enter the map. Upgrader = re-runnable map diff.
- Internal agent tool calls mirror MCP v2 stateless shape (capabilities per request in `_meta`, typed results, discover-first); real MCP transport deferred.
- Crawl4AI = untrusted acquisition executor; URL/egress policy outside it; evidence tagged with source URL + observed_at + crawler version.
- Zero new runtime dependencies from the ecosystem harvest.

## 11. Explicitly NOT in the contract

Per-site page components (replace with dynamic `[siteId]` route; existing `/sites/happy-place` and `/sites/coppersmith-plumbing` are untouched regression fixtures). `src/fyd/object/services.ts` prose-parse helpers (superseded). `/o/[objectId]` page as a surface (demoted; harvest its patterns). Fixture JSONs as runtime data (never). Federation, campaign engine, visual editor, MCP transport, ActivityPub/ATProto projections.

## 12. Directive refinements (v0.3, from Nolan's 24-hour mega-directive)

Status per pattern: EXISTING (already in repo, harvest as-is) / DELTA (required new work) / LAW (binding rule).

- **Ask FYD pipeline** (EXISTING, map to stages): intent -> graph query -> binding verifier -> evidence set -> composer -> claim classifier. Claim classes: DIRECT / DERIVED / INFERRED / GENERATED_PRESENTATION. Existing `src/fyd/ask/*` implements this; the golden template must preserve the stage order and never let the composer outrun the evidence set.
- **Why This walk** (EXISTING, enforce the walk): accumulate -> recompute -> verify -> rank/drop, no self-certification. `why-this.tsx` + `verifyPresentationBinding` are the machinery; a claim's Why This must never be certified by the same layer that generated the claim.
- **Typed SitePatch operations** (DELTA): the patch vocabulary is closed and typed: `move_section, insert_section, remove_section, feature_object, hide_object, change_variant, change_token, change_navigation, change_cta, change_copy, change_media, change_visibility`. Map existing `patch.ts` intents onto this vocabulary; any op outside it is REJECTED by validation.
- **Owner correction types** (DELTA): `CONFIRM | CORRECT | HIDE` on any object field or claim, with `SOURCE_CHANGED_UNDER_OVERRIDE` semantics: if the source changes under an active owner override, the override is preserved AND the divergence is surfaced to the owner, never silently resolved. Existing `owner-store` commands map onto this; the divergence surfacing is new.
- **Preview contract** (DELTA): every patch preview shows desktop + mobile, before/after, and the evidence impact (which claims changed class) and capability impact (which actions appear/disappear). No preview without the impact panel.
- **Browser postcondition verification** (LAW for the proof lane): assert postconditions, not toasts. Semantic snapshot + target fingerprints + expected-vs-actual postcondition. SUCCESS TOAST != SUCCESS.
- **Media pipeline security** (DELTA/LAW): SSRF-safe fetch, no private-network fetch, decompression-bomb defense, content-type checks, hostile content sanitization. Existing `anonymous-preview` SSRF boundary is the pattern; every new fetch path inherits it. FYD-managed derivatives only where rights/authorization permit; store source URL, digest, retrieved_at, metadata, derivative digest, provenance. Rights unclear -> reference/hotlink or omit.
- **Agent tool risk classes** (LAW): READ / DRAFT / REVERSIBLE_MUTATION / EXTERNAL_EFFECT / PRIVILEGED. See AGENT-CONTRACT.md; builder agents never hold EXTERNAL_EFFECT or PRIVILEGED.
- **Secret boundary** (LAW): agents see capability handles, never raw secrets.
- **Component registry visual-quality rules** (DELTA): design responds to graph shape. The registry entry gains `visualRules`: density response to object count, media treatment by archetype, empty-state honesty (requiresData sections render nothing; no placeholder content), no invented facts in any variant.
- **Tenant boundary** (DELTA, own lane): database-level enforcement, not config/route trust. See `tenant-boundary/` lane. Sized in the coordinator report.
- **Durable execution** (LAW): before inventing any workflow engine, harvest the PING runtime's primitives (queues, workers, lease logic, mission/event runtime, intent ledger, checkpointing). Builder lanes reuse; they do not invent. See `durable-execution-harvest/`.

## 13. Business Twin refinements (Nolan's 12 points, 2026-09-21)

- **Business Twin is the canonical primitive**: Identity, Objects, Relationships, Observations, Evidence, Claims, Owner Assertions, Policies, Capabilities, History. The website is the first projection. The SiteSpec compiler projects from the Twin; it never owns Twin truth.
- **Semantic diff engine is the highest-leverage missing primitive** (queued after the current start order): source change -> twin diff -> affected projections -> override conflict check -> proposed actions. Incremental regeneration, not AI reconsideration. This is what step 13 (version survival) grows into.
- **Every projection carries a dependency manifest** (WHY THIS bidirectional): projection -> graph objects/claims it renders, and object -> projections it feeds. DELTA: extend the existing provenance/evidence machinery with the manifest; no projection renders without one.
- **Fact confidence and presentation confidence are separate axes.** BindingClassification (direct/derived/generated/owner_authored) is the fact axis; presentation confidence (how assertively the design states it) is separate. A low-confidence fact never gets high-confidence presentation.
- **OwnerIntent is first-class and stronger than OwnerOverride**: goals, priorities, prohibited positioning, preferred/undesired customers, brand direction, conversion priorities, operating constraints. Recorded as a Twin layer above overrides; the planner and patch pipeline read it. Shape defined here; full wiring is post-sprint.
- **Archetypes are dimensions, not buckets.** The three named profiles are preset points in a dimension space (formality, density, media richness, CTA assertiveness, object prominence, ...), not an enum cage. A site is a point in that space; presets are starting coordinates. (Refinement sent to Builder-1.)
- **Owner UX is Explain / Change / Prove**: WhyThis (Explain), conversational typed patching (Change), version/replay survival (Prove). These are steps 10-13 of the start order.
- **Future architecture with standing constraints** (explicitly NOT this sprint): Opportunity Engine, cross-tenant pattern learning, promotion ladder, self-evaluating component registry. Constraints if ever built: no silent defaults, no cross-tenant disclosure.
- **OpenUI/CopilotKit pattern**: model-selected structured UI from an allowed component universe, never arbitrary HTML as the renderer. This is the registry law (section 4), confirmed.
- **QA**: action -> expected postcondition -> actual postcondition -> evidence, never screenshot vibes. This is the postcondition law (section 12), confirmed.
## 14. The 12 refinements — sprint routing (Nolan, 2026-09-21)

SPRINT-NOW (build in this sprint):

**R1. Business Twin is the canonical primitive.** Vocabulary adopted everywhere: Identity, Objects, Relationships, Observations, Evidence, Claims, Owner Assertions, Policies, Capabilities, History. The website is only the first projection. The tenant data model (Lane T) is organized under it. Agents and docs say "twin", not "graph", for the canonical asset.

**R2. Semantic diff engine (raises the step-13 proof bar).** A source change must produce: (a) a semantic twin diff (e.g. `hours.saturday: 09:00-17:00 -> CLOSED`), (b) a computed list of affected projections/bindings (via dependency manifests, R3), (c) an owner-override conflict check, (d) proposed regeneration actions as typed ops. Regeneration is incremental via the dependency graph, never "have AI reconsider the website." Dedicated lane (Builder-3) after Builder-2.

**R3. Dependency manifest per projection.** Every rendered binding records its dependencies — this is WHY THIS made bidirectional:
```ts
type BindingDependencyManifest = {
  bindingId: string;            // stable id of the rendered binding
  objectRef: string;            // obj:<id> in the twin
  field: string;                // twin object field rendered
  ownerPolicy: string;          // policy ref that governed it, or "none"
  siteSpecVersion: string;      // digest of the SiteSpec
  componentVersion: string;     // registry component name@version
  claimRef?: string;            // claim id when epistemic is DIRECT
  factConfidence: Confidence;   // R4 axis 1
  presentationConfidence: Confidence; // R4 axis 2
}
```
Forward walk (Explain): binding -> manifest -> object field -> claim -> evidence. Reverse walk (Change impact): object field -> all bindings affected. Builder-2 extends the semantic render model with manifests from the start. No projection renders without one.

**R4. Two confidence axes, formalized in the claim model.**
```ts
type Confidence = "high" | "medium" | "low" | "unknown";
```
`factConfidence`: do we know this is true (evidence strength). `presentationConfidence`: is this the best way to present it (design assertiveness). LAW: `presentationConfidence <= factConfidence` — a low-confidence fact never gets high-confidence presentation. Design may experiment while truth stays conservative. Builder-2 formalizes both on the claim/evidence types.

**R5. OwnerIntent is first-class, stronger than OwnerOverride.**
```ts
type OwnerIntent = {
  goals: string[];
  priorities: string[];             // ranked
  prohibitedPositioning: string[];  // never say this about the business
  preferredCustomers: string[];
  undesiredCustomers: string[];
  brandDirection: string;
  conversionPriorities: string[];
  operatingConstraints: string[];   // e.g. "no Saturday hours"
}
```
Layer order: Evidence (what reality says) -> OwnerIntent (what the business wants) -> Policy (what FYD may do) -> SiteSpec (how FYD expresses them together). Added to the model in this sprint, sparsely populated: the planner accepts it, empty intent = today's behavior, and at least `prohibitedPositioning` + `operatingConstraints` are honored by the planner/copy path. Builder-2.

**R10. Archetypes as dimensions.** The three presets are points in an 8-dimension space: `urgency, trust_requirement, technical_depth, human_prominence, media_density, service_complexity, locality, evidence_density`. A roofer and an emergency plumber are both "trades" but produce different information architecture. Builder-1 (correction sent).

**R11. Owner UX framing: Explain / Change / Prove.** The owner control surface is organized around three verbs: Explain ("why does my site say this" — provenance walk via dependency manifests), Change ("make drain cleaning more prominent" — typed patch + preview with evidence/capability impact), Prove ("is everything about my business current" — claims evaluated against evidence, freshness view). Builder-2 frames the golden template's owner panel around these.

FUTURE (do not build; keep contracts portable):

**R6. Opportunity Engine.** Define the shape now; no engine. QA findings (step 12) are emitted in the Opportunity shape:
```ts
type Opportunity = {
  id: string;
  evidenceRefs: string[];
  expectedEffect: string;
  proposedAction: SitePatchOp[];  // typed ops only; propose, never silently mutate
  status: "proposed" | "accepted" | "rejected" | "deferred";
}
```

**R7. Cross-tenant pattern learning.** Standing constraint: learning across tenants must never disclose one tenant's data to another. Nothing in the sprint builds cross-tenant learning; the tenant boundary (Lane T) is the guardrail it will inherit.

**R8. Promotion ladder.** observation -> hypothesis -> experiment -> result -> repeated result -> candidate pattern -> certified pattern -> default. Standing constraint: nothing becomes a default silently. No ladder machinery in the sprint.

**R9. Self-evaluating component registry.** The registry schema gains an optional, unpopulated `operationalEvidence` field (usage, failure counts, LCP impact, best/poor graph shapes) so the schema is portable to later evaluation. No evaluation machinery now. Builder-2 adds the optional field.

**R12. The flywheel** (acquire reality -> understand -> twin -> project -> observe -> detect opportunity -> propose -> human accepts -> measure -> learn pattern -> improve FYD) is the wall poster, not sprint scope. The sprint builds the twin -> project -> propose -> human accepts loop.

## 16. Nolan's ten answers — controlling for the sprint (2026-09-21 night)

**A1 Tenant isolation.** No Postgres RLS in the sprint. Prove the tenant contract at the current layer: every tenant-owned object/evidence/SiteSpec/override/proposal/read/write carries and enforces tenant ownership. Adversarial tests: A cannot read, search, Ask-FYD-over, patch, approve, render-private, or reference-private B through guessed IDs (and B against A). Persistence contract defined so RLS can enforce the SAME invariant later. Status wording: application tenant boundary IMPLEMENTED + ADVERSARIALLY TESTED; database RLS DESIGNED/PORTABLE CONTRACT, NOT IMPLEMENTED. Never claim RLS exists. Preserved for later (do not build): RLS USING (visible/modifiable rows) vs WITH CHECK (insertable/updatable row state); table owners bypass unless FORCE ROW LEVEL SECURITY; superusers/BYPASSRLS bypass regardless; the eventual RLS certification must test the actual application DB role, not merely pg_policies.

**A2 Cut order.** Cut: extra motion, protocol/federation, harvest breadth, visual polish, failure-injection breadth, extra archetypes, implementation breadth. Never cut: two tenants end-to-end, evidence binding, tenant isolation contract, generated structural difference, real browser, mobile, Ask FYD, owner correction, owner patch, persistence, regeneration survival, exact-head certification. Section routing lives in builder/SECTION-ROUTING.md.

**A3 Overnight.** RUN UNATTENDED with scoped wake locks; never globally disable sleep. Worker lifecycle: acquire wake requirement -> checkpoint -> bounded operation -> release in finally. A dead process must not leave the OS held awake. Browser workers reopen dead pages; one browser owner at a time; resumable checkpoints; fail closed; no external consequential actions overnight unless separately authorized.

**A4 Second tenant: COPPERSMITH.** "Authorized" = legitimately public website material used for an internal/private product demonstration and evaluation. Never imply owner endorsement; never publish a public impersonating site; never mutate their external presence. Real owner authorization is required before any public launch or representation.

**A5 Ask FYD evidence boundary.** Three answer classes: SUPPORTED (answer + cite evidence), DERIVED (answer, clearly labeled, with the evidence it derives from), UNKNOWN ("I don't know from the evidence I have"). Never silently turn inference into fact. Follow with "Want me to investigate further?" as the intelligence expansion path.

**A6 Owner approval.** Strong binding under, one tap above. Binding = tenant_id + owner/actor + base SiteSpec digest + patch digest + approval + result digest. UI may be a single [Approve]. Base digest changed before approval -> STALE PROPOSAL: rebase/regenerate, never apply blindly.

**A7 Archetypes.** Two tenants must land on at least two meaningfully different profiles. KNOWLEDGE / TRADES / TECHNICAL_ENTERPRISE stay as hypothesis/configuration vocabulary; do not build the third merely for coverage.

**A8 Fixture regression.** Gate on semantic invariants: no evidence loss without explanation, no invented claims, required owner overrides survive, valid URLs remain valid, tenant boundary holds, determinism holds, render succeeds, mobile succeeds, capabilities remain correct. Produce a STRUCTURAL DIFF against the previous SiteSpec and review it; "unchanged" is not the goal.

**A9 Failure injection.** Small high-value matrix only: A cross-tenant attack, B Ask FYD evidence absence, C stale/replayed owner patch, D source refresh after owner override, E hostile source URL/content, F browser/process interruption if cheap. No chaos engineering.

**A10 Morning definition of done.** One thing: A REAL URL BECOMES A TRUSTED, EDITABLE, PERSISTENT FYD BUSINESS. Demo script: URL -> understanding -> objects -> website -> Ask FYD -> evidence -> conversational change -> approval -> persistence. Top technical proof beneath: OWNER PATCH LOOP OVER AN EVIDENCE-BACKED GENERATED SITE. Morning proof must name: SHA, dirty state, Node version, npm version, canonical test command, test result, tenant A source digest, tenant B source digest, SiteSpec digests, browser proof, mobile proof, owner patch digest, approval digest, result digest.

**Target.** ONE-CLICK BUSINESS BOOTSTRAP: URL -> FYD understands -> evidence-backed object graph -> website -> Ask FYD -> owner customizes by talking -> approves -> persists -> source changes -> FYD safely updates. Website builder and object builder are THE SAME SYSTEM: a BUSINESS COMPILER, not a page builder. Social/agent/protocol later.

**The key boundary.** OBJECT BUILDER decides what is known; WEBSITE BUILDER decides how known things are presented. Object builder input: OBSERVATIONS + EVIDENCE + CURRENT GRAPH + SCHEMA CATALOG -> output PROPOSED OBJECT DELTA (never arbitrary DB writes); a deterministic verifier checks schema, evidence references, tenant, IDs, relationship legality, visibility, then commits through the canonical transition path. Website builder consumes OBJECT GRAPH + OWNER OVERRIDES + CAPABILITIES + DESIGN TOKENS; site planner -> SiteSpec -> renderer -> UI. The site planner NEVER manufactures business facts.

**"No invented claims" owner.** THE EVIDENCE-BINDING VERIFIER: a deterministic verification seam. Every factual presentation binding resolves: object field -> claim/evidence -> visibility -> render binding. Generated marketing copy is typed GENERATED_PRESENTATION and cannot introduce unsupported factual predicates.

**Visibility is distinct from fact.** FACT: address = X. VISIBILITY: public/hidden. Never mutate the fact to implement privacy. Pipeline chooses a conservative default; the owner owns the override. "Show my street address" -> visibility control, persisted owner decision, renderer includes it.

**Determinism is semantic.** Same ObjectGraph + OwnerOverrides + SitePlannerVersion + DesignTokens + ViewerClass -> same semantic SiteSpec/render model. Canonicalize section ordering, object ordering, generated component IDs, SiteSpec, binding model. No timestamps in semantic planning unless explicitly input. Do not require byte-identical HTML where framework noise is irrelevant.

**KEEP IT SMALL.** Deterministic eligibility first: service count > 0 -> services eligible; location count > 0 -> locations eligible; person + works_for -> team eligible; ExternalIdentity -> connected eligible; posts > 0 -> recent eligible. Then ordering rules, then owner overrides. Intelligence only where composition genuinely benefits. Do NOT turn deterministic operations into agents: JSON-LD parsing, URL sanitizing, schema validation, tenant enforcement, hashing, rendering, patch application stay software. Agents propose; deterministic runtime verifies and executes. Bounded specialist work only where intelligence is needed (acquisition, extraction, entity resolution, object planning, site planning, concierge, customization, verification).

**Tenant ownership model.** Every mutable/customer-owned primitive carries tenant ownership. Distinguish: source observation ownership, canonical public identity, tenant-private state, tenant presentation, tenant capabilities. Two tenants may reference the SAME public external observation while having different corrections, visibility, SiteSpec, private context, capabilities. Do NOT put tenant_id onto universal public protocol objects merely because it is convenient.

**Ask FYD modes.** Visitor Ask FYD receives ONLY public objects/relationships/evidence/capabilities. Owner Ask FYD may receive authorized owner context. NEVER let visitor mode inherit owner/private context.

**Media (internal demo).** Prefer fetch -> digest -> derivative/cache where legitimately retrievable. Preserve source URL, source page, observed_at, content digest, media type, dimensions, license/rights status = UNKNOWN unless actually known. Do NOT infer copyright permission from public accessibility. Do not publish redistributed third-party media as FYD-owned. Pipeline: MediaObservation -> MediaAsset/Reference -> derivative -> component. Never copy-into-/public-and-forget-origin.

**Demo owner context.** Labeled DEMO OWNER CONTEXT, NOT PRODUCTION AUTH. Do not build a complete auth system tonight. But every owner mutation API/function already requires an OwnerContext/ActorContext, so real authentication replaces the demo provider without rewriting the builder. UI says Owner Mode; backend semantics are actor + tenant + capabilities + approval.

**Provenance UX.** Subtle ("Why this?" / evidence indicator where useful). Provenance is strategically critical but NOT the homepage.

**Priority order.** Evidence accuracy, time to useful site, service discoverability, contact discoverability, mobile usability, performance, visual polish. Do not optimize Lighthouse while FYD misunderstands the business.

**Harvest rule.** HARVEST AGGRESSIVELY, but every harvest must answer DOES THIS SHORTEN THE ONE-CLICK BUSINESS BOOTSTRAP? Yes -> use it. No -> record and move on. Commodity boundaries to harvest: JSON-LD, browser automation, structured extraction, media processing, auth, schema validation, MCP, protocol adapters. FYD's own differentiation: evidence/object semantics, business proceduralization, owner correction, SiteSpec composition, concierge context, typed customization proposals.

**IN SCOPE TONIGHT.** Two tenants, object builder, evidence binding, site generator, real browser, Ask FYD, owner correction/visibility, conversational site patch, persistence, source refresh without override loss, tenant attack tests, exact-head certification. EVERYTHING ELSE WAITS.

## 17. Standing law (unchanged)

**New-abstraction test:** every new abstraction must reduce source-to-site time, increase quality/trust/reuse, reduce per-tenant code, make correction safer, make regeneration deterministic, make execution cheaper, or improve tenant security. If not, do not build it.
