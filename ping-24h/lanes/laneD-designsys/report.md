# Lane D: Design System / Block Registries Archaeology
**Date:** 2026-09-28 · **Mode:** READ-ONLY research · **Mission:** find component/block registry and design-token patterns worth harvesting for ONE FYD design grammar, where tokens are the contract. Public sources only. No code written beyond this report.

## Per-source pattern table

### 1. shadcn registry model (ui.shadcn.com + the registry ecosystem)

**What it is.** Not a component library; a JSON distribution protocol. A `registry.json` manifest lists items with names, types (`registry:component`, `registry:block`, `registry:theme`, `registry:style`), explicit `dependencies` and `registryDependencies`, a `files` list mapping source paths to install targets, and `cssVars`/`css` payloads. The CLI resolves the dependency graph and copies source files into the consumer project. Components arrive as owned code, never as an opaque npm dependency.

**Problem it solves better than us.** Versioned distribution without a runtime dependency. The consumer owns the code and can edit it; the producer keeps a canonical registry that is test-installable in a fresh project. The `registry:theme` item type is the killer primitive: a theme ships ONLY CSS variables (no files) and the CLI injects them into the consumer's `:root` / `.dark`. That is tokens-as-a-shippable-unit, exactly our "templates choose token presets" concept.

**Harvestable primitive.** The registry-item manifest shape: `{ name, type, title, description, dependencies, registryDependencies, files[{path, type, target}], cssVars{theme, light, dark}, css }`. Note the two non-obvious rules we should copy: (a) blocks declare `registryDependencies` on primitives so composition is explicit and machine-resolvable; (b) theme items are opt-in and separate from components, so a rebrand never requires touching component code.

**Verdict: HARVEST (protocol), REJECT (code dependency).** We should adopt the manifest grammar as our block-registry record format: each FYD block declares what it needs (other blocks, token keys it consumes) and whether it ships token overrides. We should NOT adopt the React/Tailwind runtime stack or the shadcn CLI. The protocol shape is the harvest; the framework is not.

**Inside a token grammar.** A block manifest lists `tokens_consumed: [color.surface.raised, typography.h2, space.stack.lg, ...]` as a lintable contract. A template preset is a `registry:theme`-equivalent: a named override set `{ light: {...}, dark: {...} }` applied to the same component tree. Owner edits preset; agent proposes diffs to preset files only.

### 2. Tailark blocks (tailark.com, MIT, shadcn-compatible block registry)

**What it is.** 300+ marketing blocks in 18+ categories (hero-section, features, testimonials, pricing, faq, footer, cta, stats, logo-cloud, contact...), numbered variants per category (`hero-section-1` … `-36`). Blocks ship as full sections (3+ files), declared on `@shadcn/*` primitives. Three free kits (dusk, mist, veil) are the SAME blocks with different style payloads, plus a paid quartz kit.

**Problem it solves better than us.** Section-level granularity for composition: blocks are page sections, not atoms, which is the unit a site-builder actually assembles. Numbered variants per section-type (`pricing-section-N`) give an agent a finite, searchable menu instead of a blank canvas. And the kit model proves one block corpus can carry multiple style payloads, which is our "one registry, three families" goal in miniature.

**Harvestable primitive.** The section taxonomy: `<section-type>-<variant-number>` as a finite composition catalog, plus kit-as-style-payload: blocks reference semantic token roles and a kit is a token-preset overlay, not a fork of the blocks.

**Verdict: ADAPT.** Take the section-type catalog granularity (sections, not atoms, are the composition unit; number the variants) and the kit model (same blocks, different token preset). Do NOT copy the numbered-variant sprawl uncritically: 36 hero variants is a maintenance swamp. Our catalog should be smaller per section-type with the variant axis made explicit (intent, density, media) rather than enumerated. Also reject their per-block motion/plugin dependencies: our blocks must not pull npm deps at install time.

**Inside a token grammar.** Section blocks declare their variant axis as token-level switches (e.g. `density: compact | default | spacious` remaps `space.*` semantic aliases). The block source never hard-codes values; the kit/preset supplies them. This is how "templates choose token presets" stays mechanical.

### 3. Fragments (fragments-sdk/ui, Base UI based, AI-native design system)

**What it is.** A component library explicitly designed so AI can use it correctly: compiled component metadata (props, variants, tokens) queryable by agents, plus a seed-driven token system. Seven seeds drive every derived token: brand color, neutral ramp, radius style, danger/success/warning/info. Radius styles are named presets (`sharp`, `subtle`, `default`, `rounded`, `pill`) that remap the whole radius family at once.

**Problem it solves better than us.** Two things. First, the seed model: an owner-level change ("make it friendlier") becomes one seed flip (`radius-style: pill`) instead of editing 40 component files. Second, AI-native metadata: the agent never guesses at component APIs because the registry carries typed prop/variant/token metadata the agent queries before generating code. That is the machinery behind "agent proposes token patches, never arbitrary CSS".

**Harvestable primitive.** (a) Seed-to-theme derivation: a small set of owner-legible seeds derive the full semantic layer; (b) radius-style-style enumerated presets as a first-class token category (not a value, a named family mapping); (c) compiled per-component metadata (props, variant axes, consumed tokens) as the agent's single query source.

**Verdict: HARVEST.** The seed model is the closest existing pattern to our target ("owner changes tokens, agent proposes token patches"). The radius-style preset table is directly reusable. Metadata-as-agent-interface is exactly how we keep generation inside the registry.

**Inside a token grammar.** Token presets are seed sets: `presets/{family}.json` with ~7-12 seeds plus full semantic overrides where needed. The build derives the semantic layer from seeds (with explicit overrides winning). Component metadata records `tokens_consumed` per block, giving the agent a typed vocabulary instead of free-form CSS.

### 4. W3C DTCG 2025.10 (stable spec, Oct 2025)

**What it is.** The vendor-neutral interchange format: tokens are objects with `$value` (required), `$type` (inherited from groups), optional `$description`, `$extensions`, `$deprecated`. Types include `color`, `dimension`, `fontFamily`, `fontWeight`, `duration`, `cubicBezier`, `number`, plus composites `typography`, `shadow`, `border`, `transition`, `gradient`, `strokeStyle`. Aliases via `{group.token}` curly-brace references, JSON Pointer `$ref` for sub-property access, `$extends` for group inheritance with deep-merge overrides.

**Problem it solves better than us.** Interop and longevity: the same token file feeds Style Dictionary, Figma, Tokens Studio, and a plain CSS build. Modern color spaces (OKLCH/P3 via `colorSpace` + `components`) are handled at the format level, so a brand palette is perceptually uniform from day one instead of hex soup.

**Harvestable primitive.** The `$value`/`$type` object shape, alias syntax `{group.token}`, composite types, and `$extends` for theme inheritance. The three-tier reading (primitives -> semantic -> component) that the ecosystem layers on top.

**Verdict: HARVEST (format), ADAPT (toolchain).** Author tokens in DTCG shape so any future tooling (Style Dictionary, Figma import) just works. Keep our own build trivial (stdlib script, CSS + flat-JSON output); do not adopt the full DTCG resolver/toolchain stack.

**Inside a token grammar.** Our token files are DTCG-shaped JSON. Composites are authored where values move together (typography styles, shadows) but ALWAYS exploded into decomposed primitives at build time (a CSS engine cannot read one property out of a `typography` object, and per-theme overrides of one field would otherwise require restating the whole object).

### 5. no-slop-design grammar (agshinrajabov/no-slop-design, references/design-tokens.md)

**What it is.** An AI-agent design workflow whose core thesis is: slop UIs use primitives directly (`text-gray-500`), which is why they cannot be re-themed. It codifies a naming grammar `[namespace.]category.(concept.)property.(variant.)(state.)(scale)`, required token minimums per category, mode strategy (dark is a separate palette, never an inversion; density modes change semantic aliases, never primitives), a CI lint (`slop_lint.py`) that flags raw hex/px in component files and starter-dialect overuse, contrast-pair checks, and versioning/governance rules.

**Problem it solves better than us.** It is the only source that treats "AI must not emit arbitrary CSS" as an enforceable build property rather than a wish. The lint rule (raw values in component code = build failure) plus the tier discipline (primitives never in UI code, semantic is the default vocabulary, max alias chain depth 3) is a working answer to our hardest requirement.

**Harvestable primitive.** (a) The naming grammar itself, near-verbatim; (b) the tier rules (primitives never referenced by components, semantic tokens named by role not value, alias depth cap 3); (c) the CI lint pattern: grep for raw hex/px in block files, fail the build; (d) the mode rule: dark/density are semantic override files containing only tokens that differ, and the build fails if a semantic color token lacks a value in a mode.

**Verdict: HARVEST.** This is the enforcement layer for the entire target. Take the grammar, the tier rules, and the lint-as-build-gate. The "75% starter-dialect" heuristic is FYD-specific genius we should keep in mind (templates must not all look identical), but it can come later.

**Inside a token grammar.** Token files follow the grammar; the site builder's compile step runs the lint gate; the agent's allowed write surface is token files + block manifests, never component styling inline.

### 6. Magic UI / Aceternity pattern (animated-registry model)

**What it is.** Registries of marketing micro-interactions (marquee, animated beam, aurora, blur-fade, text effects, spotlight, particles) distributed through the same shadcn CLI channel. Animation becomes a catalog item with a typed API, not hand-written keyframes per site.

**Problem it solves better than us.** Motion is a design decision that agents routinely improvise badly. Cataloging effects with named APIs makes motion a token-like choice (`effect: aurora` vs `effect: none`) instead of free-form animation code.

**Harvestable primitive.** Motion as registry items: named effects with typed props, backed by token categories `duration` (`instant/fast/base/slow/slower`, 80-480ms range), `ease` (`standard/decelerate/accelerate/emphasized` as cubicBezier), and transition presets. Reduced-motion strategy as a mode (like dark mode: a mode-level override, not per-component logic).

**Verdict: ADAPT.** Take the motion token categories and the "effects are catalog items" model. Reject the heavy dependencies (Framer Motion, Three.js pulls); our effects must be CSS/OKLCH-light. Catalog a SMALL set of effects per family; motion volume differs per family (SERVICE BUSINESS: restrained; ORGANIZATION/PRODUCT: richer).

**Inside a token grammar.** `duration.*`, `ease.*`, and a `motion` mode (full/reduced/none) as first-class token categories. Blocks reference effects by name from the catalog; the effect's keyframes live in the registry, parameterized by tokens.

### 7. class-variance-authority (CVA) component API pattern

**What it is.** The de-facto component API shape across the whole shadcn ecosystem: `cva(base, { variants: { <axis>: { <value>: <classes> } }, compoundVariants, defaultVariants })`. A component is base styles plus named variant axes (intent/size) with defaults; callers pass typed props; `cn()` merges overrides.

**Problem it solves better than us.** Typed, finite component API surface. The agent picks from enumerated axes instead of inventing class strings. `defaultVariants` means unspecified props still resolve to token-bound values.

**Harvestable primitive.** The variant-axis declaration as metadata: each block declares its axes (e.g. `intent: [primary, secondary, ghost]`, `density: [compact, default]`, `media: [with-image, no-image]`) and default values. This is the "typed props" requirement made concrete.

**Verdict: HARVEST (pattern), ADAPT (mechanism).** The axis/defaults metadata model is exactly how a block becomes agent-composable. Our mechanism need not be the CVA npm package; the block manifest carries the same shape (axes, values, defaults) and the generator resolves them. Note the standing lesson from the ecosystem: axes must reference semantic token utilities only, never raw values, or variants become another arbitrary-CSS vector.

**Inside a token grammar.** Block manifests declare variant axes whose values map to token references. The generator's job is axis-value -> token-bound class resolution, never free-form style authoring.

### 8. 21st.dev (community marketplace, 10k+ components, shadcn conventions)

**What it is.** A community catalog with search, component install, logo search, and AI generation (Magic MCP). Components install as owned source and follow shadcn conventions (Tailwind utilities, CSS-variable theme tokens).

**Problem it solves better than us.** Discovery at scale: search-by-description over a huge corpus, plus AI generation for the long tail. Nothing else in the space does catalog search as well.

**Harvestable primitive.** The discovery routing pattern (search catalog first, generate only for the long tail) and the copy-paste-owned-source convention at scale.

**Verdict: REJECT as a source, ADAPT the routing lesson.** We will not depend on an external marketplace (external content is untrusted, licensing varies, quality is uneven, and it is a React/Tailwind dependency we are not adopting). But our own registry should internalize the routing rule: agent searches the FYD block catalog first by description; block generation is a last resort and generated blocks enter the registry through the same manifest + lint gate as hand-authored ones.

### 9. HyperUI (zero-JS copy-paste Tailwind blocks)

**What it is.** Plain-HTML block collections (marketing, application, neobrutalism) with no CLI, no registry, no JS. Copy markup, done.

**Problem it solves better than us.** Radical simplicity: pure markup composition with zero runtime. It is the lower bound of what a block system can be.

**Harvestable primitive.** The composition discipline: a block is self-contained markup referencing only token-bound classes. No block may require JS unless its manifest declares it. This suggests our registry's default: static blocks are the norm; interactive blocks are the flagged exception.

**Verdict: ADAPT.** Copy the "static by default, interactivity is declared" discipline. Reject the lack of structure (no manifest, no dependency graph, no theming contract) which is why HyperUI cannot be re-themed or linted.

## Proposed minimal token-grammar skeleton

DTCG-shaped JSON, dot grammar `[namespace.]category.(concept.)property.(variant.)(state.)(scale)`. Three tiers: primitives (appearance-named, never in block code), semantic (role-named, the default vocabulary), component (per-block overrides, scoped `block.part.property.state`). Max alias chain depth 3. Modes are override files containing only tokens that differ (light default, `*.dark.json`, `*.compact.json` for density, `*.reduced.json` for motion).

| Category | Example tokens | Notes |
|---|---|---|
| `color` | `color.surface.canvas`, `color.text.primary`, `color.action.primary.hover` | Primitives: per-hue 50..950 scales in OKLCH. Semantics: surface(5), text(8), border(3), action(3x3 states), status(4x4). Every semantic color has light+dark or the build fails. |
| `space` | `space.4` (primitive), `space.inset.md`, `space.stack.lg`, `space.margin.page` | 4px base ladder primitives; semantic aliases per direction (inset/stack/inline/gutter). Density modes remap semantics only. |
| `typography` | `typography.h2`, `typography.body`, `typography.caption` | Composite (family+size+weight+leading+tracking); exploded at build into `--typography-body-size` etc. Base scale on ~1.2 ratio from 14-16px body; weights regular/medium/semibold/bold. |
| `font` | `font.family.display`, `font.family.text`, `font.weight.semibold` | Family stacks and weight steps, primitives for the composites above. |
| `radius` | `radius.none`, `radius.control`, `radius.card`, `radius.pill` | Named families; nested inner = outer minus padding. Radius-style presets (sharp/subtle/default/rounded/pill, Fragments-style) remap the whole family. |
| `border` | `border.width.hairline`, `border.color.default` | Width scale + semantic border colors. |
| `shadow` | `shadow.raised`, `shadow.overlay`, `shadow.modal` | Elevation ladder; dark mode uses surface steps instead of heavier shadows. |
| `duration` / `ease` | `duration.fast`, `ease.decelerate` | 80-480ms range; cubicBezier eases. Transition presets composed from these. |
| `opacity` | `opacity.disabled`, `opacity.overlay`, `opacity.scrim` | Alpha scale for states and scrims. |
| `z` | `z.sticky`, `z.overlay`, `z.modal`, `z.toast` | Stacking layers, spaced 100 apart. |
| `breakpoint` | `breakpoint.narrow`, `breakpoint.regular`, `breakpoint.wide`, `breakpoint.max` | Named by layout change (600/905/1240/1440 working defaults), content-driven. |
| `size` | `size.control.md`, `size.icon.md`, `size.content.max`, `size.measure.max` | Control heights (44px min target), content measure for readability, max content widths. |
| `surface` | `surface.layer.base`, `surface.layer.raised`, `surface.layer.overlay` | Surface hierarchy: canvas, raised cards, overlays; the elevation vocabulary blocks actually use. |
| `media` | `media.ratio.16x9`, `media.ratio.4x3`, `media.ratio.1x1` | Aspect ratios for block media slots. |
| `motion` (mode) | `motion.mode.full`, `motion.mode.reduced` | Full/reduced/none as a mode-level token, not per-block logic. |
| `seed` (preset) | `seed.brand`, `seed.radius-style`, `seed.density` | Owner-legible seeds that derive/override the semantic layer per template family (Fragments pattern). |

Build outputs: `tokens.css` (`:root` vars + `[data-theme="dark"]` + density/media-query blocks, composites exploded), `theme.css`-equivalent utility mapping (tokens -> class utilities for the generator), `tokens.flat.json` (fully resolved per mode; snapshot in CI), contrast-pair check in CI, `slop_lint` (no raw hex/px/rgb in block files = build failure).

## How the three template families share one registry

**Composition policy (shared).** Every family composes from the same block registry. A block is a manifest: typed variant axes with defaults, `tokens_consumed` list, optional declared JS, section-type classification (`hero`, `features`, `testimonials`, `pricing`, `faq`, `contact`, `footer`, `cta`, `stats`, `gallery`, `services`, `team`, ...). A family is a composition policy + a token preset + an eligible-section list. The generator may only emit: a section sequence from the eligible list, axis values from the declared axes, and token patches to the preset. It may never emit raw CSS values, new class names, or off-catalog sections. The lint gate enforces this at build time.

**SERVICE BUSINESS (plumber, HVAC, electrician, tree service).** Policy: conversion-first, low cognitive load. Eligible sections: hero (with phone CTA + service area), services grid, trust signals (reviews, licenses, guarantees), pricing/estimates, service-area map, FAQ, contact/quote form, footer. Composition rule: exactly one primary CTA per viewport, phone number always above the fold, trust block within first two screens. Token preset: high-contrast action color, generous control sizes (phone-tappable, 52px+), `radius-style: subtle` or `default`, `density: comfortable`, motion `reduced`-leaning (fast, minimal effects). Variant defaults: CTAs default to `intent: primary`, heroes default to `media: with-image` (truck/crew photo). No decorative sections (no logo clouds, no bento experiments).

**PROFESSIONAL/PERSON (lawyer, consultant, therapist, realtor, trades-personal-brand).** Policy: credibility-first, editorial rhythm. Eligible sections: hero (portrait + positioning statement), about/bio, credentials, services or practice areas, testimonials, process/how-it-works, content/articles, contact, footer. Composition rule: generous whitespace, one idea per section, photography-forward, typography carries the design (display serif or strong grotesk). Token preset: refined type scale (larger display steps), `radius-style: subtle` or `sharp` depending on vertical (legal = sharp, wellness = rounded), `density: spacious`, motion slow and quiet (300-480ms, decelerate). Variant defaults: cards default to `intent: quiet` (hairline borders, no heavy shadows), CTAs to `intent: secondary` with one primary per page. No aggressive conversion chrome (no sticky call bars, no countdowns).

**ORGANIZATION/PRODUCT (church, nonprofit, SaaS-ish local product, venue).** Policy: narrative-first, community proof. Eligible sections: hero (mission statement), impact stats, programs/features, stories/testimonials, events/calendar, team, partners/logo-cloud, pricing/membership, FAQ, newsletter signup, contact, footer. Composition rule: story arc ordering (mission -> proof -> participation), richer media (galleries, video), social proof dense. Token preset: expressive brand color allowed more surface area, `radius-style: rounded`, `density: comfortable`, motion full (aurora/marquee-class effects from the curated effect catalog permitted). Variant defaults: stats default to animated counters, heroes default to `media: full-bleed`. This is the only family where decorative sections (logo clouds, bento grids) are eligible by default.

**Cross-family invariants.** Same registry, same token grammar, same lint gate. A block authored for one family works in all three; only the preset, the eligible-section list, and the composition rules differ. Owner changes seeds/preset; agent proposes preset diffs and section sequences; the build fails closed on anything outside the contract.

## Top 6 harvestable patterns (matrix input)

1. **shadcn registry-item manifest shape** (name/type/deps/files/cssVars) — HARVEST. The distribution grammar for blocks: explicit `registryDependencies` between blocks and a `registry:theme`-style preset as a shippable token override. We adopt the manifest shape, not the React stack.
2. **Three-tier token hierarchy with tier rules** (primitive -> semantic -> component; primitives never in block code; semantic named by role; alias depth cap 3) — HARVEST. This is the structural law that makes "tokens are the contract" enforceable.
3. **Seed-based theme derivation + named radius-style presets** (Fragments: ~7 seeds drive the full theme) — HARVEST. Owner-legible seeds (`brand`, `radius-style`, `density`) are the "owner changes tokens" interface; families are preset seed sets.
4. **slop_lint as a build gate** (no-slop-design: raw hex/px in block files = build failure; contrast pairs in CI; mode-coverage checks) — HARVEST. This is the mechanism that makes "no arbitrary CSS" real instead of aspirational. It is the single most load-bearing harvest.
5. **CVA-style variant axes as block metadata** (base + named axes + defaults, values mapping only to token-bound utilities) — HARVEST the pattern, ADAPT the mechanism. Gives agents typed, finite block APIs and kills free-form class invention.
6. **DTCG 2025.10 interchange format** (`$value`/`$type`, `{alias}` references, composite types, `$extends`) — HARVEST the format. Future-proofs interop (Figma, Style Dictionary) and handles OKLCH/P3 color natively.

Also noted: Tailark section taxonomy (ADAPT: sections as the composition unit, variant axes over enumerated sprawl), Magic UI motion-as-catalog (ADAPT: `duration`/`ease` token categories + curated effect list, CSS-light), HyperUI static-by-default discipline (ADAPT), 21st.dev catalog-search-first routing (ADAPT the routing rule; REJECT the external dependency).

## The single most important design-token decision

**Make semantic tokens the only vocabulary blocks may use, and enforce it with a build gate that fails closed on raw values.** Every other decision (which hue scale, which type ratio, which radius values) is reversible in an afternoon by editing the preset. The tier law plus the lint gate is not reversible later: if blocks are allowed to reference primitives or raw literals even once, the contract is fiction and every future agent will route around the grammar. Concretely: (a) components reference only `color.*`/`space.*` semantic tokens, never primitives; (b) alias chains capped at 3; (c) every semantic color token must have a value in every mode or the build fails; (d) `slop_lint` greps block files for raw hex/px and fails the build; (e) composites (typography, shadow) are authored together but exploded into decomposed tokens at build so per-mode overrides stay surgical. Get the enforcement right and the values can evolve freely. Get it wrong and there is no grammar, only documentation.
