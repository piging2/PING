# FALSIFIER: planner composition, customer hacks and print-Business

Branch `fyd/sprint-integration-2026-09-24`, HEAD `a8ed5103`. Read-only probe via pigwsl-exec, 2026-09-26. No code touched. Every finding below was verified against the actual file contents on the Pig; line numbers are from that HEAD.

Scope note: this lane covers the composition path only (planner, dimensions, strategies, archetypes, generator composition points, renderer section components, presence). The data seam (projection builders, tenant registries) is noted only where it touches composition.

## Verdict summary

The pipeline map is confirmed and, in places, worse than mapped: the composition policy computes several values (`mediaTreatment`, `ctaEmphasis`, `presenceMode`, `layoutCharacter`) that the renderer then ignores, and the section-ordering machinery is the only composition signal that actually reaches the DOM. There are exactly two customer-keyed branches in the codebase; one is live in the composition path (a documented pin layer, not hidden JSX). The 8-dimension vector is hand-authored per preset, not computed from any graph signal. The single genuine counter-example to print-Business is `PeopleSection`, which proves data-driven structural branching is possible in this renderer.

---

## HUNT 1: customer-specific conditionals

### F1. `STRATEGY_PINS`: live tenant-keyed strategy override
- `src/fyd/builder/strategy-for-site.ts:33-35`
- Code sketch:
  ```ts
  export const STRATEGY_PINS: Record<string, SiteStrategyName> = {
    "ping-fyd": "TECHNOLOGY",
    "coppersmith-plumbing": "TRADES",
  };
  ```
  Consumed at `strategy-for-site.ts:52-55`, called from `vectorForSite` (`site-vectors.ts:35`), called from the golden route (`src/app/build/[siteId]/page.tsx:78`).
- Verdict: genuine customer-specific conditional. It is the only tenant-name branch in the composition path, and it fires on every golden-route render for those two tenants.
- Fairness note: it is architecturally honest. The precedence is documented and explicit (ownerIntent.strategy override > pin > `inferStrategy(graph)` > KNOWLEDGE_WORKER default), it names the strategy rather than emitting customer JSX, and unknown tenants fall through to inference rather than 404. The comment block calls it an "operating parameter," which is accurate for what it does.
- The real defect: the pin SHORT-CIRCUITS inference. The coppersmith graph would likely classify as TRADES on its own merits, but the pin means the inference path is never exercised for the tenants most likely to be demoed and eyeballed. A composition compiler validated against these two sites would validate the pin, not the signals. It also freezes the operating point: if the graph changes shape (say a trade adds 40 products), the pin still says TRADES with the preset vector.
- Severity: SMELL (not a hidden hack; a documented one, but it defeats signal-driven validation for exactly the two tenants under test).
- Smallest generic fix direction: demote pins to a tie-break or confidence-floor layer: run `inferStrategy` first, use the pin only when inference is low-confidence or when the owner explicitly set it, and log the override in the manifest so digest-verifiable runs can distinguish pinned from inferred composition.

### F2. Hand-pinned per-customer vectors, exported but unwired
- `src/fyd/builder/dimensions.ts:92` (`PING_DOGFOOD_VECTOR`) and `:107` (`COPPERSMITH_VECTOR`)
- Code sketch: two hand-authored 8-dimension vectors with customer-specific comments ("PING/FYD (dogfood/control): a knowledge-heavy technical consultancy"; "Coppersmith (private demo): an emergency-capable local trade").
- Verdict: not currently a live violation. Verified by grep: the only consumers are `__tests__` files (structural-diff, planner, structural-proof, dimensions, projection-seam-attack) and the re-export in `builder/index.ts:66-68`. Neither `strategyForSite` nor the demo route references them. The golden route's actual vectors come from `NAMED_PRESET_VECTORS` (`dimensions.ts:122`) via `SITE_STRATEGIES`.
- Severity: SMELL (trap, not bug). Customer-named public constants sitting in the exact module the planner reads are a loaded gun: the next engineer who wants "the coppersmith behavior" will import `COPPERSMITH_VECTOR` instead of computing a vector from signals. The tests pinning golden behavior to customer-named fixtures also quietly reify the two-customer worldview.
- Smallest generic fix direction: rename to behavior-describing names (e.g. `TECHNOLOGY_CONSULTANCY_VECTOR`) or delete and have tests derive vectors from `inferStrategy`-equivalent signal functions; mark the module's public contract as "no tenant-keyed constants."

### F3. Tenant registries at the data seam: clean
- `src/fyd/data/fyd-tenant-graph.ts:102-122` (`FYD_TENANT_PINS`: happy-place, coppersmith-plumbing fixture graphs + base digests), `src/fyd/lineage/tracer.ts:132-143` (SITES map with raw slugs and fixture files), `src/fyd/media/run-ingest.ts:48-62` (demo-site media config keyed by tenant), `src/fyd/builder/dogfood/build-ping-fyd-projection.mjs` (ping-fyd projection builder).
- Verdict: legitimate. These are fixture/provenance registries for the ingestion and lineage tooling, explicitly demo-scoped, with digests that fail closed on change. Verified: `getPingObjectGraph` (`src/fyd/data/ping-object-source.ts`) contains zero tenant-name branches (grep returned no hits), so no registry key leaks into composition decisions.
- Severity: OK.

### F4. `factConfidenceForObject` provenance labels: clean
- `src/fyd/builder/confidence.ts:38-40`
- Code sketch: `ref.startsWith("memory:")` -> `{ value: 0.9, basis: "operator-authored dogfood record" }`; parallel branches for `website-ingestion:`, `overlay-authored`, `canonical-journal:`.
- Verdict: not customer logic. It branches on provenance-kind prefixes, which are generic vocabulary any tenant's objects can carry. The "dogfood" label is just a string; the memory: prefix is how operator-authored records are identified across all tenants.
- Severity: OK.

### F5. Customer names in composition code: clean
- `src/fyd/components/renderer.tsx:235` and `:630`, `src/fyd/components/ask-fyd-widget.tsx:32`: "happy-place" / "Happy Place Carpentry" appear only in doc comments as examples.
- Full-path grep for business-name or slug string comparisons in planner, renderer, generator, presence, and data found nothing compositional (the only `===` hits on names are media-variant lookups like `v.name === "blur"` in `derive-presence.ts:126`, which is asset metadata, not customer branching).
- Severity: OK.

---

## HUNT 2: print-Business, where composition ignores graph signals

### P1. Section ordering ignores every graph signal except existence
- `src/fyd/builder/planner.ts:339-350`
- Code sketch:
  ```ts
  indexed.sort((a, b) => {
    const ra = baseRank(a.s.component) - (policy.sectionBoosts[a.s.component] ?? 0);
    const rb = baseRank(b.s.component) - (policy.sectionBoosts[b.s.component] ?? 0);
    if (ra !== rb) return ra - rb;
    return a.i - b.i;
  });
  ```
- What it ignores: service COUNT (a 2-service trade and a 30-service trade order identically; `maxSectionsPerPage = 6 + round(6 * service_complexity)` at `dimensions.ts:255` caps section count from the vector's hand-pinned value, never from the graph's service count); relationship cardinality/fan-out (nothing reads relationship counts); media richness (policy.mediaTreatment is computed but has zero DOM effect, see D3 below); item-level ordering (id sort everywhere, never evidence or relevance sort).
- Severity: BLOCKER (for a composition compiler: the only ordering input the planner accepts is the vector, and the vector carries no measured signals, so the compiler's signals have no inlet here).
- Smallest generic fix direction: keep the `(baseRank - boost, index)` sort contract, but compute the boosts (or additive deltas) from quantized graph signals: service count, relationship fan-out, gallery asset count from the media manifest, person count. `policyForVector` stays the deterministic arithmetic core; a signal layer supplies the operands.

### P2. `policyForVector` boosts are a fixed function of a hand-pinned vector
- `src/fyd/builder/dimensions.ts:194-256`
- Code sketch: `add("CTA", 8 * v.urgency)`, `add("Services", 3 * v.service_complexity)`, etc. Every operand is `v.<dimension>`, and every dimension value arrives pre-authored (see Hunt 3). No `graph` parameter, no counts, no media manifest.
- Severity: BLOCKER (same as P1: the arithmetic is clean and deterministic, but the inputs are authored, not measured).
- Smallest generic fix direction: a pure `signalsForGraph(graph, mediaManifest)` function returning the same 8 dimensions (quantized to 3 decimals), consumed by the existing `policyForVector` unchanged; the compiler's version joins the digest inputs (map open-question 1).

### P3. `ServicesSection`: fixed card grid regardless of count, type, or media
- `src/fyd/components/renderer.tsx:1375-1387` and `CardGrid` at `:1296-1312`
- Code sketch: `featured` objects mapped into `<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">`, each to `FydObjectCard` (title, description, optional photo, relationship line).
- Ignores: count (2 vs 30 identical; no collapse, no "view all", no density change); catalog shape (no grouping by relationship predicate even though the graph carries `provides`/`offers` edges); business type (emergency plumber and SaaS consultancy identical); media (photo shown if present, layout unchanged); order (id sort).
- Severity: BLOCKER (the flagship section for the sprint's "service cardinality" thesis).
- Smallest generic fix direction: pass the section's object count and a media-presence flag into `SectionProps` (both derivable at the render seam) and select from declared layout variants in the registry (`variants` field already exists, `registry.ts:46-60`): e.g. count <= 4 -> compact list, count >= 12 -> categorized or collapsed grid. No customer branching; the rule is a function of count.

### P4. `GallerySection`: fixed grid, forced aspect, count-blind, treatment is a no-op attribute
- `src/fyd/components/renderer.tsx:2057-2111`
- Code sketch: `className="fyd-gallery-grid grid grid-cols-2 gap-3 sm:grid-cols-3"` with `data-media-treatment={intent.mediaTreatment}` (`:2066`); every image forced to `aspectRatio: "4 / 3"`, `objectFit: "cover"`.
- Ignores: media count (3 photos vs 60, same 3-col grid; `MAX_GALLERY` caps upstream in derive-presence but the grid never adapts); aspect variety (all crops forced); the vector's `mediaTreatment` ("documentary"/"polished"/"schematic") changes zero DOM, confirmed: the only reader of the attribute is the attribute itself.
- Severity: BLOCKER (this is the sprint's "media richness" thesis, and the one policy value named for it is decorative).
- Smallest generic fix direction: make the grid class a pure function of (asset count, treatment): e.g. count >= 12 -> masonry/first-featured; wire `data-media-treatment` to actual CSS (documentary: uncropped aspect + captions; polished: uniform crop; schematic: contained + borders). The attribute is already stamped; only the stylesheet is missing.

### P5. `PeopleSection`: the one genuine data-driven structural branch. Clean.
- `src/fyd/components/renderer.tsx:1444-1455`
- Code sketch:
  ```ts
  const anyMedia = objects.some((o) => photographicMedia(ctx.objectMedia?.[o.id]));
  // when person objects have photographic media -> people strip (portrait-led);
  // otherwise the honest card grid. No hand-built sections either way.
  ```
- Verdict: this is the precedent the compiler should copy. The branch key is a measured graph+media signal (photographic media presence), it is deterministic, it has no customer conditionals, and both branches are honest about missing data.
- Severity: OK (confirm as clean; use as the pattern).

### P6. `PostsSection`: consumes exactly one signal, ignores count
- `src/fyd/components/renderer.tsx:1568-1575`: sorts by date, then renders every bound object into the same 2-col prose grid plus the mobile in-flow variant. Post count never changes the layout.
- Severity: SMELL (a 2-post blog and a 200-post publication render the same grid; `RecentObjects` is capped at 6 by the generator, Posts is not).
- Smallest generic fix direction: same as P3, a count-keyed variant (list -> grid -> archive) driven by bound object count.

### P7. `ObjectRailSection` ignores the planner's `presenceMode`; the margin honors it
- Section: `src/fyd/components/renderer.tsx:1968-1983` hard-codes `const presence: ObjectPresence = { mode: "auto", objects: [featured.id], rules: { collapseBelow: "lg" } }`.
- Planner: `src/fyd/builder/planner.ts:421-424` derives `objectPresence` from `policy.presenceMode` ("rail"/"drawer"/"auto" from `dimensions.ts:244`), stamps it on the spec (`planner.ts:505`).
- Margin: `src/app/build/[siteId]/build-client.tsx:48-56` (`presenceForBuild`) prefers `spec.objectPresence`, so the vector's presenceMode reaches the page margin, but the in-page ObjectRail section ignores it and always renders "auto".
- Verdict: inconsistent consumption of a computed policy value; two presence systems on one page disagreeing is exactly the kind of thing a compiler would trip over.
- Severity: SMELL (borderline BLOCKER for anyone building on presenceMode: half the surface honors it).
- Smallest generic fix direction: read `ctx.spec.objectPresence` in `ObjectRailSection` the way `BuildClient` does, falling back to the hard-coded "auto" when absent.

### P8. The entire `layoutCharacter` design axis is inert on the golden route
- Tables: `src/fyd/components/renderer.tsx:415-441` (`CHARACTER_PRESENTATION`: EDITORIAL/CRAFT/TECHNICAL/RETAIL/PROFESSIONAL/CREATOR with sectionRhythmPx, headingTracking, cardElevation, heroScale, density, contentWidthPx, mediaTreatment contained/edge-to-edge, objectEmphasis quiet/balanced/prominent). Real DOM effect: consumed via `designIntentForTheme` at `:714` and `:1120`.
- Selection: `characterOf(theme)` at `:470-472` returns `theme.layoutCharacter ?? "EDITORIAL"`.
- The planner's theme tokens (`planner.ts:427-434`) set only `typography`, `media.treatment`, and `radius`. Nothing ever sets `layoutCharacter` on the golden path. The only producer is the unwired archetype profiles' `tokenOverrides` (`archetypes/profiles.ts:79,111,142`).
- Verdict: every tenant on the golden route renders EDITORIAL regardless of business type. This is print-Business at the design-system layer: a real variability axis exists, has real DOM effect, and is simply never fed.
- Severity: BLOCKER (for the compiler: the cheapest high-leverage win in the whole codebase, and also a trap if a builder assumes the tables are live).
- Smallest generic fix direction: stamp `layoutCharacter` from the vector in the planner (e.g. high technical_depth -> TECHNICAL, high human_prominence -> CREATOR, trade signals -> CRAFT) exactly as `applyArchetype`'s tokenOverrides already do; no renderer change needed since `designIntentForTheme` already reads it.

### P9. Must-win components can evict visible sections to protect invisible ones
- `src/fyd/builder/planner.ts:112-119` (`MUST_WIN_COMPONENTS` includes `ObjectRail`), `:352-365` (must-wins fill first, then optionals fill remaining capacity up to `maxSectionsPerPage`).
- `ObjectRailSection` (`renderer.tsx:1968-1971`) returns null when no featured object exists, but the planner counts it against the section budget anyway.
- Verdict: a page with a thin graph can lose a visible optional (e.g. SocialProof) to keep an ObjectRail that renders nothing. The must-win list was designed for data presence ("what the business is, what it offers"), but it protects component names, not rendered output.
- Severity: SMELL.
- Smallest generic fix direction: derive must-win survival from the same eligibility/renderability check the section performs (e.g. ObjectRail must-wins only when `richestObject` is non-null); or exempt null-rendering sections from the cap.

### P10. Hero is type-blind (with one honest fallback)
- `src/fyd/components/renderer.tsx:1173-1230`: heading/copy from presentation, phone CTA when binding-verified, hero media from the seam with an honest typographic fallback when null. Same shape for every business type. The heading template (`planner.ts:380-391`, "owner.title -- locality") is generic and evidence-bound. Clean as far as it goes; the missing piece is exactly P8's layoutCharacter.
- Severity: OK (structure) / covered by P8 (variability).

---

## HUNT 3: vector provenance (where the 8 dimensions actually come from)

The golden route calls `vectorForSite(siteId)` (`page.tsx:78` -> `site-vectors.ts:35` -> `strategyForSite`), with precedence:

1. `ownerIntent.strategy` (owner's word; legitimate override),
2. `STRATEGY_PINS[siteId]` (F1 above: ping-fyd -> TECHNOLOGY, coppersmith-plumbing -> TRADES),
3. `inferStrategy(graph)` (`infer-strategy.ts:90-135`),
4. KNOWLEDGE_WORKER default.

`inferStrategy` is deterministic schema-role counting only: TRADES = service + location counts + phone/service-area/locality field-presence signals; KNOWLEDGE_WORKER = article + post + person; TECHNOLOGY = products; ties broken by the fixed contender order [TECHNOLOGY, KNOWLEDGE_WORKER, TRADES]. It is clean (no tenant branching, reasons cite counts), but it reads exactly three buckets of counts and nothing else.

The 8-dimension values themselves come from `NAMED_PRESET_VECTORS` (`dimensions.ts:122-151`), three hand-authored points. No dimension is computed from a graph signal today:

- `media_density`: preset-authored (0.35-0.55). The gallery asset count, hero presence, and photographic-media coverage (which `PeopleSection` already measures at render time) never enter the vector.
- `service_complexity`: preset-authored (0.4-0.6). The actual service count, relationship fan-out, and catalog depth never enter.
- `human_prominence`: preset-authored (0.25-0.55). Person count and roles never enter.
- `evidence_density`: preset-authored (0.5-0.85). Description word counts and field coverage (which `evidenceScore` at `object-rail.tsx:338-352` already measures) never enter.
- `locality`, `urgency`: preset-authored; only `inferStrategy`'s phone/service-area signals gesture at them, and those feed the 3-bucket classification, not the dimensions.
- `DEFAULT_VECTOR` (all 0.5, `site-vectors.ts:20`) is used only by the acquisition live-loop (`live-loop.ts:550`) for previews; not in the golden path.

Is any dimension hand-pinned per customer? Yes, but not live: `PING_DOGFOOD_VECTOR` (`dimensions.ts:92`) and `COPPERSMITH_VECTOR` (`dimensions.ts:107`) are hand-authored per-customer vectors with no production consumer (F2). The live hand-pinning is coarser: the two `STRATEGY_PINS` entries select which hand-authored preset point a customer composes under.

Severity: BLOCKER (for the compiler's signal-driven thesis: the "8-dimension archetype space" is currently a 3-position switch with authored coordinates; every downstream composition decision inherits authored, not measured, values).
Smallest generic fix direction: introduce `signalsForGraph(graph, mediaManifest?)` returning the 8 dimensions from quantized measurements (service count -> service_complexity, gallery/hero asset presence -> media_density, person count -> human_prominence, phone/hours/emergency fields -> urgency, description/field coverage -> evidence_density), keep `policyForVector` as the pure arithmetic consumer, and pin the signal snapshot + compiler version in the digest inputs (map open-question 1).

---

## HUNT 4: dead / declared-but-unconsumed composition machinery

### D1. Strategy-layer `CompositionPolicy.navigationStrategy` and `objectEmphasis`: declared, validated, never read
- Declared: `src/fyd/builder/strategies.ts:59-71` (`navigationStrategy: "tabs" | "single-page"`, `objectEmphasis: Record<string, number>`, plus `sectionPriority` and `density`).
- Validated at module load (`strategies.ts:218-240`), so the declarations are real and maintained.
- Consumed: nowhere. Grep for `navigationStrategy` and `objectEmphasis` (the weight-table form) outside `strategies.ts` returns zero readers. The planner consumes only `strategy.vector`.
- Verdict: OPPORTUNITY, the highest-value dead surface. `TECHNOLOGY_POLICY.navigationStrategy` is "tabs" (`strategies.ts:165`) while the golden route hard-serves `spec.pages[0]` (`build-client.tsx:84`) and the demo client tabs by slug (`site-client.tsx:92`): wiring this one field answers the map's open-question 5 and gives the compiler a page-level composition output. `objectEmphasis` (per-schema-role weights) is the section-emphasis surface the renderer lacks.
- Trap warning: THREE things share the name `objectEmphasis` with three different types: the strategy-layer weight table (`strategies.ts:65`), the renderer's character-map enum "quiet"|"balanced"|"prominent" (`renderer.tsx:433,456`), and the token field (`sitespec/types.ts:266`). Plus two different interfaces both named `CompositionPolicy` (`strategies.ts:59` vs `dimensions.ts:181`). Consolidate or explicitly own the split before building on it (map open-question 4 stands).
- Smallest generic fix direction: have `BuildClient` read `strategyForSite(siteId).policy.navigationStrategy` for tabs-vs-single-page; rename one of the two `CompositionPolicy` interfaces and disambiguate the three `objectEmphasis` meanings.

### D2. `applyArchetype` and the three archetype profiles: a full composition compiler, unwired
- `src/fyd/archetypes/profiles.ts` (KNOWLEDGE `:61-81`, TRADES `:83-112`, TECHNICAL_ENTERPRISE `:114-142`): each carries `compositionRules` (sectionOrder, sectionFilter, maxSections), density, typographyScale, mediaTreatment, ctaEmphasis, objectProminence, and `tokenOverrides` including `layoutCharacter`.
- `src/fyd/archetypes/apply.ts:102` (`applyArchetype`): pure, deterministic profile application over (spec, profile, graph); also owns `spec.objectPresence` when provided (`apply.ts:119-121`).
- `src/fyd/proceduralize/generator.ts:347`: `return opts.profile ? applyArchetype(spec, opts.profile, graph) : spec;`
- Verified: NO caller passes `profile`. `planSite` has no profile parameter; the demo `spec-pipeline.ts:90-98` passes only `generatedAt`, `eventSequences`, `siteId`.
- Verdict: OPPORTUNITY, and the most important one in this report. This is the nearest thing to a composition compiler already written: `sectionOrder`/`sectionFilter`/`maxSections` is exactly the reorder/prune surface, `tokenOverrides.layoutCharacter` is exactly the P8 fix, and it is pure and deterministic. It was built, tested (there is a `__tests__` dir under archetypes), and then left with no caller on either render path.
- Trap warning: the profile vocabulary (`FYDSiteArchetype`: KNOWLEDGE/TRADES/TECHNICAL_ENTERPRISE) does not match the strategy vocabulary (`SiteStrategyName`: KNOWLEDGE_WORKER/TRADES/TECHNOLOGY). A compiler wiring profiles to strategies must map KNOWLEDGE<->KNOWLEDGE_WORKER and TECHNICAL_ENTERPRISE<->TECHNOLOGY explicitly.
- Smallest generic fix direction: give `planSite` an optional profile input resolved from (ownerIntent > strategy-derived profile > none), so the golden route composes through `applyArchetype` while `generateSiteSpec` stays the pure data-driven base. The demo route then converges onto `planSite` instead of calling the generator directly (also fixes H5 below).

### D3. `mediaTreatment`: computed, stamped, zero DOM effect
- Derived: `dimensions.ts:241`; stamped into tokens: `planner.ts:433`; stamped onto the gallery grid as `data-media-treatment` (`renderer.tsx:2066`).
- Verified: no stylesheet, no component, no conditional reads the attribute or the token. It is a no-op.
- Severity: SMELL with BLOCKER-adjacent impact (a compiler targeting "media richness" would reasonably assume this works).
- Smallest generic fix direction: P4's fix; the attribute is already in the DOM, so this is a CSS-only change plus a token->class mapping in `GallerySection` and `HeroSection`.

### D4. `ctaEmphasis`: computed, logged, never rendered
- Derived: `dimensions.ts:243` (`v.urgency >= 0.65 ? "high" : ...`).
- Verified: the only consumer is the planner's manifest note string (`planner.ts:487-488`: `".../cta-" + policy.ctaEmphasis + "/..."`). `CTASection` (`renderer.tsx:1865`) never reads it. The archetype profiles also declare it (`profiles.ts:46,73,105,136`) with no consumer.
- Verdict: OPPORTUNITY (the CTA is the highest-leverage section for the urgency dimension; the signal path is built except the last inch).
- Smallest generic fix direction: read `policy.ctaEmphasis` (or the section's presentation) in `CTASection` to select button prominence/size/order; keep it a function of the quantized vector, not the tenant.

### D5. Customer-named vector constants: trap, not machinery
- Covered in F2. Repeating here because it belongs in the inventory: `PING_DOGFOOD_VECTOR` / `COPPERSMITH_VECTOR` (`dimensions.ts:92,107`) are dead public surface with customer names. Opportunity cost is nil; the risk is a future shortcut. Smallest fix: rename to behavior names or delete.

### D6. `layoutCharacter` tables: live DOM effect, dead input
- Covered in P8. In the inventory because it is the inverse of D3/D4: the DOM effect is real (density, contentWidthPx, heroScale, section rhythm), the input is never set on the golden route. OPPORTUNITY: stamp it from the vector in the planner; no renderer change needed.

### D7. Registry `operationalEvidence` and `variants`: future contracts, correctly empty
- `src/fyd/components/registry.ts` (per the map: `variants` on ObjectRail/Gallery, `operationalEvidence` unpopulated everywhere).
- Verdict: not dead machinery, declared future surface. The `variants` field is the natural home for the count-keyed layouts in P3/P4/P6. OK as designed; the compiler should fill these rather than invent new schema.

### D8. Object-layer `design-compiler.ts`: different surface, do not reuse blindly
- `src/fyd/ui/object-layer/design-compiler.ts` (own `mediaTreatment` triad at `:42-80`), consumed only by `fyd-shell.ts` (the object overlay chrome), not the public site renderer.
- Verdict: scoped correctly to the overlay product surface; the public renderer's `CHARACTER_PRESENTATION` is the separate, relevant system. OK; flagging only so a compiler builder does not mistake one for the other.

---

## HUNT 5: determinism hazards for a future composition compiler

The plan path is admirably clean: no `Math.random`, no `Date.now()` in any planning decision; every sort is id-keyed or a stable `(baseRank - boost, originalIndex)` sort; vectors are quantized to 3 decimals; `fnv1a` accent selection (`derive-presence.ts:37,198-199`) is a pure function of owner id + title over a fixed palette; `evidenceScore` (`object-rail.tsx:338-352`) is a pure function of description words, populated field count, and provenance-ref presence; `richestObject` id-sorts before scoring so ties keep the lowest id. The hazards are narrow:

### H1. `generatedAt` wall-clock fallback in `planSite`
- `src/fyd/builder/planner.ts:295`: `const generatedAt = input.generatedAt ?? new Date().toISOString();`
- The golden route passes `generatedAt`, so this is latent, not live. But any direct caller (tests, future compiler harness) gets a volatile stamp baked into `spec.generator.generatedAt`. Mitigation exists: `canonicalizeSpec` strips `*At` keys from the semantic digest, so the digest is stable; raw spec bytes are not.
- Severity: SMELL. Smallest fix: make `generatedAt` required in `SitePlannerInput` (fail closed on absence) so no caller can silently introduce clock dependence; keep the digest stripping as defense in depth.

### H2. Locale-sensitive date sort in `PostsSection`
- `src/fyd/components/renderer.tsx:1571-1573`: `fieldOf(b, "date").localeCompare(fieldOf(a, "date"))`.
- `localeCompare` is ICU/locale dependent. Date fields here are ISO-ish strings where code-unit order equals chronological order, so the practical risk is limited to exotic date formats, but a composition compiler sorting by "recency" would inherit the hazard.
- Severity: SMELL. Smallest fix: compare with `<`/`>` on the raw strings (or normalized epoch millis), never `localeCompare`, in any ordering the compiler depends on.

### H3. `baseRank` silently ranks unknown components last; Gallery is unknown
- `src/fyd/builder/planner.ts:162-165`: `return i === -1 ? BASE_COMPONENT_ORDER.length : i;`
- `BASE_COMPONENT_ORDER` (`planner.ts:85-96`) lists 18 components; Gallery is not among them. Any Gallery section the generator emits ranks 18, sorts after every optional, and is first to be cut by `maxSectionsPerPage`.
- Deterministic, but a latent composition bug: on the demo route (the only route that emits Gallery, via `siteId`), the media-richest section is structurally deprioritized. The golden route never emits Gallery at all (`planSite` never passes `siteId`).
- Severity: SMELL. Smallest fix: add Gallery to `BASE_COMPONENT_ORDER` at an intentional rank, or give unknown components an explicit rank policy instead of "last."

### H4. Two render paths, two composition behaviors
- Golden (`src/app/build/[siteId]/page.tsx`): projection -> verify -> `planSite` (vector policy, binding verifier, manifest, digest) -> intent -> validate -> `BuildClient`. Never passes `siteId` to the generator, so Gallery never emits.
- Demo (`src/app/sites/_shared/spec-pipeline.ts:90-98`): projection -> `generateSiteSpec` directly with `siteId` (Gallery CAN emit) -> intent -> validate -> `site-client`. Skips the vector policy, the binding verifier, the manifest, and the digest entirely.
- Verdict: a composition compiler hooking `planSite` covers only the golden path; the demo path that the sprint's own archaeology uses bypasses it. This is the map's open-questions 6-7, confirmed live.
- Severity: SMELL (BLOCKER-adjacent for the sprint: the builders' test surface and the production surface compose differently).
- Smallest fix: converge the demo route onto `planSite` (D2's fix does this as a side effect), or explicitly declare the demo route out of scope for composition work.

### H5. `Array.prototype.sort` stability reliance
- The planner's order sort depends on stability for the `(ra === rb)` tie case. ES2019+ guarantees stable `Array.prototype.sort`; the runtime is Node 22. This is fine, not a hazard in practice, but a compiler porting this logic off V8 should use an explicit index tiebreak (which the code already does: `return a.i - b.i`). OK.

---

## Clean code, confirmed (adversarial fairness)

- `eligibility.ts` (`deriveEligibility`): fully data-driven defensive filter; relationship vocabulary is direction-agnostic (`ROLE_PREDICATES`); deterministic; no customer logic. OK.
- `infer-strategy.ts`: no tenant branching; counts are the evidence; ties broken by a fixed contender order; reasons cite counts. OK as far as it goes (its narrowness is Hunt 3's finding, not a correctness defect).
- `derive-presence.ts` accent/radius: one shared palette, hash of graph identity, identical for every site. Not business-type-driven, which is a defensible design choice, not a hack. OK.
- `strategy-for-site.ts` precedence chain and never-throw contract: OK.
- `policyForVector` arithmetic, `quantizeVector`, `validateVector`: pure, total on valid inputs, fail-closed on invalid. OK.
- `ownerOf`/`ownerObject` first-business-by-id-id: deterministic owner selection. OK.
- Hero tagline generation (`planner.ts:380-391`): interpolates only bound fields, verifier-checked. OK.
- `evidenceScore`/`richestObject`: deterministic, monotone in observable evidence. OK.

## What I did not verify

- The bodies of `ProductsSection` (`renderer.tsx:1388`), `LocationsSection` (`:1398`), `BusinessSummary` (`:1265`), `ContactSection` (`:1745`), `LinksSection` (`:1793`), `SocialProofSection` (`:1837`), `CTASection` (`:1865`), `IdentityCardSection` (`:1898`), `AskFYDSection` (`:1923`), `ObjectGridSection` (`:1617`), `ObjectFeedSection` (`:1718`), `RecentObjectsSection` (`:1727`), and `GenericObjectCardSection` (`:2005`) were not line-read; the map and the audited sections establish the SectionShell + fixed-inner-layout pattern, with `PeopleSection` as the sole verified exception. A compiler builder should spot-check `CTASection` and `SocialProofSection` before assuming uniformity.
- `apply.ts` internals beyond its interface and the two call sites; the `__tests__` dir under archetypes suggests it is tested, but I did not run tests (read-only lane, and running the suite was out of scope).
- Whether `page.tsx` passes `generatedAt` into `planSite` (the map says it does; H1 is written accordingly).
