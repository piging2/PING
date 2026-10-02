# VISUAL/MOTION Harvest Lane - Wave 1

- Lane: visual-motion (read-only)
- Date: 2026-09-21
- Product: FYD Social (deterministic SiteSpec renderer; demo sites: happy-place, coppersmith-plumbing)
- GitHub API calls used: 0 (budget frozen by parent directive 2026-09-21; all evidence from web reading)
- PINNED SHA and LICENSE are TBD for repo candidates pending budget release.

## What FYD already has

Nothing. Verified by grep over `~/workspace/fyd-lane/repo/renderer.tsx` (859 lines), `render-model.ts`, `graph.ts`: zero matches for motion, animation, transition, keyframes, reveal, stagger, flip. The renderer is server-side React, spec-driven, deterministic: `(SiteSpec + ObjectGraph + ViewerContext) -> UI`. The demo client shell (`fyd-build/src/app/sites/happy-place/site-client.tsx`) does client-side DOM mutation today: page tabs (`setActiveSlug`) swap page content, and the structured editor reorders/hides sections (`reorder_section`, `toggle_section` intents). All of these snap instantly with no transition. So the motion lane is greenfield, and the first mechanism must be motion-as-data: descriptors in the SiteSpec interpreted by a bounded renderer-owned runtime, never generated code the renderer executes.

## Bounded harvest question: answer

"Which exact mechanism (not framework) delivers semantic motion, entrance, layout transition on object-cardinality change, relationship-aware reveal, navigation/media transition, as data, not as code the renderer must execute?"

No single external project covers all four. The answer is a declarative MotionSpec data contract with four bounded platform mechanisms, each with a fixed vocabulary the renderer interprets:

1. Entrance: CSS keyframes/transitions triggered by a tiny IntersectionObserver runtime (universal support), with `animation-timeline: view()` as progressive enhancement and `@starting-style` for DOM-insertion enters. Motion declared as named kinds plus duration/easing/distance. Zero generated code executes.
2. Layout transition on object-cardinality change: the AutoAnimate mechanism (ADAPT, see card 1): MutationObserver plus FLIP plus Web Animations API, configured per container as data `{duration, easing, enabled}`.
3. Relationship-aware reveal: stagger derived from data the renderer emits (element index among siblings), via `transition-delay` or CSS `sibling-index()` where supported. The relationship (document order, section hierarchy) is already in the spec; the renderer serializes it as data attributes.
4. Navigation/media transition: the View Transitions API (REPURPOSE, see card 3): `view-transition-name` assigned from data (object/section ids), `document.startViewTransition` wrapped around renderer-driven DOM updates, with a reduced-motion guard.
5. Springs: not needed. CSS easings cover the required feel. If a spring is ever genuinely required, the integrator is ~15 lines of semi-implicit Euler (BUILD NEW), never a library.

Proposed data shape (FYD-internal, to be specified by the sitespec lane):

```json
"motion": {
  "reveal": { "kind": "rise", "distance": "2rem", "duration": 450, "easing": "ease-out", "stagger": 70 },
  "layout": { "enabled": true, "duration": 300, "easing": "ease-out" },
  "viewTransition": { "name": "section-<id>" }
}
```

The renderer emits `data-motion-*` attributes from this; one bounded client runtime interprets them. Same graph plus same spec yields the same attributes yields the same motion: deterministic semantics preserved.

## Survivor cards

### Card 1: formkit/auto-animate (ADAPT)

- PROJECT: formkit/auto-animate, "a zero-config, drop-in animation utility that adds smooth transitions to your web app"
- PINNED SHA: TBD (budget frozen; pin on release)
- LICENSE: TBD (pending pin; the FormKit org page lists MIT on the repo row)
- RECENT ACTIVITY: Updated Jul 10, 2026 per the FormKit org page; 13,926 stars; npm `@formkit/auto-animate@0.9.0`; framework adapters for React, Vue, Svelte, Solid, Angular.
- FYD PROBLEM: Layout transition on object-cardinality change. When the demo shell switches tabs, reorders sections, hides/shows sections, or a list gains/loses/reorders items, the DOM snaps. There is no mechanism that turns a before/after DOM delta into a smooth transition without per-element animation code.
- MECHANISM: Automatic FLIP on DOM mutation. Attach to a parent element (one ref, or `autoAnimate(el, options)`); a MutationObserver watches `childList`; every added/removed/moved child animates. Config is data: `{ duration, easing, disrespectUserMotionPreference }`. Respects `prefers-reduced-motion` by default.
- EXACT IMPLEMENTATION: Core is the framework-agnostic engine (framework files are thin adapters). Documented architecture (from the repo's own ecosystem analysis): (a) Observers: MutationObserver on the parent watching childList; for each mutation `getElements` collects changed parent/child elements including removed ones, tagged with a non-enumerable `__aa_tgt` marker. ResizeObserver on `document.documentElement` and on each observed element refreshes cached positions on size change. IntersectionObserver per element with a dynamic `rootMargin` derived from last known coordinates compensates for scroll-induced position changes; occasional low-priority polling backs it up. (b) State: all in WeakMap/WeakSet to avoid leaks: `coords` (last known absolute coordinates adjusted for nearest scrolling ancestor), `siblings` (prev/next references for removed elements so they can be temporarily reinserted for exit animations), `animations` (current Web Animations API Animation per element), `intersections`, `intervals`, `debounces`, `options`, `enabled`. (c) Decision: `animate(el)` classifies each element as add, remain, or remove from cached coordinates plus `isConnected`. Flags `__aa_new` (newly reinserted node, next cycle treated as entry) and `__aa_del` (node currently animating out). (d) Playback: FLIP via `getBoundingClientRect` delta, inverted transform, `element.animate()` (WAAPI), so animation is compositor-friendly transform/opacity only. Exact file/symbol verification (line numbers, test files) is deferred to the SHA-pin step; the above is the mechanism contract the harvest depends on.
- CLAIM EVIDENCE: README claims one line of code, ~2KB, works with any framework. Skill docs claim 3.28KB gzipped at 0.9.0, zero dependencies, SSR-safe, reduced-motion automatic.
- SOURCE EVIDENCE: The observer/WeakMap/add-remain-remove architecture above is documented in a third-party code analysis of the repo (verbatim page: https://github.com/tomevault-io/codex-plugins/blob/HEAD/formkit--auto-animate/AGENTS.md). The option surface `{ duration, easing, disrespectUserMotionPreference }` is corroborated by two independent skill docs. License MIT and Jul 2026 update observed directly on https://github.com/formkit.
- RUNTIME EVIDENCE: Not executed. This lane is read-only and did not npm install. No runtime verification performed; the mechanism is consistent with documented FLIP behavior. Runtime proof is assigned to the first visual experiment.
- DEPENDENCY COST: ~2 to 3.3KB, zero dependencies, framework-agnostic, no build step required for the core. Verdict on install: do not npm install; vendored core only (ADAPT), so the renderer stays dependency-free and the mechanism stays auditable.
- WHAT FYD ALREADY HAS: Nothing. No motion code anywhere in the renderer.
- WHAT THEY DO BETTER: The hard parts of FLIP are the edge cases: exit animations for removed elements (sibling tracking plus temporary reinsertion), position invalidation on scroll and resize (dedicated observers), and per-element animation bookkeeping without leaks (WeakMaps). A hand-rolled FLIP gets the happy path and misses these.
- WHAT FYD DOES BETTER: Determinism contract. AutoAnimate triggers on any DOM mutation implicitly; FYD scopes it explicitly: only containers the SiteSpec marks with `layout.enabled` get the runtime, and the config is spec data, so the same graph yields the same motion config. Motion is also kept out of the semantic render model (decorative layer), which AutoAnimate as a library does not model.
- SMALLEST HARVESTABLE PRIMITIVE: The FLIP core only: per-parent config read from `data-motion-layout` attributes; MutationObserver on childList; add/remain/remove classification from cached rects plus `isConnected`; FLIP playback for remain (rect delta, inverted transform, `element.animate`); enter animation for add; temporary reinsert plus animate-out for remove. Drop: all framework adapters, the scroll-compensation IntersectionObservers, the polling backup, the plugin surface. Preserve: the `prefers-reduced-motion` default-off behavior.
- REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: ADAPT (vendored core, not an npm dependency).
- CAN IT:
  - remove code? Yes. Replaces any future hand-rolled transition code with one small bounded runtime; net negative code.
  - remove ambiguity? Yes. Motion config becomes explicit per-container data instead of implicit nothing.
  - improve beauty? Yes. Tab switches, section reorder/hide, and list changes become continuous instead of snapping.
  - improve expressiveness? Partially. Covers layout, enter, exit. Not gestures or springs, which FYD does not need.
  - improve trust? Yes. Reduced-motion respected by default; motion never alters content or evidence.
  - improve mobile? Yes, contingent on verification: transform/opacity only, compositor-driven; must pass the falsification run on a 375px viewport.
  - improve accessibility? Yes. `prefers-reduced-motion` default; no content hidden pre-reveal (unlike opacity-zero-until-JS anti-patterns).
  - improve performance? Neutral to yes. WAAPI plus transforms, no layout thrash; tiny runtime.
  - improve regeneration? Yes. Motion is spec data; regeneration deterministically reproduces the same motion config.
  - reduce AI improvisation? Yes. Fixed vocabulary (`duration`, `easing`, `enabled`); no free-form animation code generation.
- FALSIFICATION EXPERIMENT: See the First Visual Experiment nomination below (this card's candidate is the nominated experiment). It fails if any mutation misfires, if reduced-motion is not honored, or if the same graph plus interaction yields different motion across runs.

### Card 2: CSS scroll-driven animations plus IO fallback plus @starting-style (REPURPOSE PATTERN)

- PROJECT: Web platform standards (no repo). Mechanism ladder documented at https://github.com/yogvidwankhede/vishwakarma/blob/HEAD/.claude/skills/scroll-experiences/SKILL.md and the double-gate reveal recipe at https://github.com/fastuber/award-winning-web-design/blob/HEAD/skills/award-winning-web-design/references/recipes/native-scroll-driven-animations.md.
- PINNED SHA: N/A (platform standard, not a repo).
- LICENSE: N/A (royalty-free web standards).
- RECENT ACTIVITY: Interop 2026 focus area. Chromium 115 plus, Safari 18/26, Firefox behind `layout.css.scroll-driven-animations.enabled` (Nightly on by default) as of July 2026 sources. `@starting-style` is Baseline since August 2024.
- FYD PROBLEM: Entrance and relationship-aware reveal. Sections, cards, and team/review items should reveal as they enter the viewport, staggered by their relationship (document order, sibling position), with no JavaScript animation code per element.
- MECHANISM: Three rungs, stop at the first that does the job. (1) `animation-timeline: view()` binds a keyframe animation to an element's passage through the scrollport; `scroll()` binds to scroller progress. Sampled on the compositor from scroll offset, so it stays locked to pixels even under main-thread congestion. (2) IntersectionObserver for discrete reveals where scroll-driven CSS is unsupported; it reports threshold crossings off the critical path. (3) `@starting-style` plus CSS `transition` for enter animations on DOM insertion (tab switches, dialog/popover, dynamically added nodes), no JS timing hacks. Stagger from data: the renderer emits `data-motion-index`; CSS uses `transition-delay: calc(index * step)` or `sibling-index()` where supported. Mandatory double gate: `@media (prefers-reduced-motion: no-preference)` plus `@supports (animation-timeline: view())`, and default-finished authoring (elements are fully visible without the animation; never `opacity: 0` in the base style).
- EXACT IMPLEMENTATION: Pure CSS plus a ~30-line IO runtime. Key recipe (from the cited recipe page): default state has no hidden styles; keyframes `reveal-rise` from `opacity 0, translate 0 2rem` to visible; the animation applies only inside the double gate with `animation-range: entry 0% cover 40%`. Use the standalone `translate` property, not `transform`, so reveals compose with existing transforms. Above-the-fold elements render finished immediately by design (entry range already complete), which is correct; hero entrances use a plain timed transition instead.
- CLAIM EVIDENCE: Multiple 2026 practitioner sources claim scroll-driven CSS obsoletes scroll-reveal JS libraries for the entrance use case, with zero bytes and compositor sampling no JS approach can match.
- SOURCE EVIDENCE: The mechanism (animation-timeline, animation-range, the double gate, default-finished authoring, translate-vs-transform) is specified across the two cited pages and matches the CSS Animations Level 2 / Scroll-driven Animations specs they reference.
- RUNTIME EVIDENCE: Not executed in this lane. Browser support claims are per July 2026 sources and must be re-verified at implementation time with `@supports` gating regardless.
- DEPENDENCY COST: Zero bytes, zero dependencies, zero maintenance surface. The IO fallback is renderer-owned code (~30 lines).
- WHAT FYD ALREADY HAS: Nothing.
- WHAT THEY DO BETTER: The platform does what no library can: compositor-sampled scroll linkage, zero bytes, no version to pin, no supply chain.
- WHAT FYD DOES BETTER: FYD turns the relationship-awareness into data: stagger indices and reveal kinds come from the SiteSpec, so the same graph always reveals the same way. A hand-authored site cannot guarantee that.
- SMALLEST HARVESTABLE PRIMITIVE: The double-gated `.reveal` CSS block plus the IO fallback runtime; nothing to vendor, it is all platform plus renderer-owned glue.
- REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: REPURPOSE PATTERN.
- CAN IT:
  - remove code? Yes. Replaces any scroll-listener or reveal-library code with CSS plus a tiny IO fallback.
  - remove ambiguity? Yes. Reveal behavior is declared per section in the spec.
  - improve beauty? Yes. This is the highest visible-beauty-per-byte mechanism available.
  - improve expressiveness? Partially. Covers entrance and scroll-linked reveal; not layout transitions or shared-element morphs.
  - improve trust? Yes. Default-finished authoring means content is never hidden from any user or crawler.
  - improve mobile? Yes. Compositor-driven, no scroll listeners, no layout reads in handlers.
  - improve accessibility? Yes, by construction: the double gate plus default-finished means reduced-motion users and unsupported browsers get complete content.
  - improve performance? Yes. Zero main-thread work in the supported path.
  - improve regeneration? Yes. Reveal descriptors are spec data.
  - reduce AI improvisation? Yes. Named kinds (`rise`, `fade`, `scale`) from a closed vocabulary.
- FALSIFICATION EXPERIMENT: Render both demo sites with reveal descriptors; in an unsupported browser (or with the feature flag off) every section must be fully visible with no animation; with `prefers-reduced-motion: reduce` no motion may occur; no horizontal overflow on 375px; above-the-fold hero must render finished on load with no flash. Fails if any content is hidden without the animation, if a flash of unstyled animation occurs at load, or if overflow appears.

### Card 3: View Transitions API (REPURPOSE PATTERN)

- PROJECT: Web platform API (no repo). Mechanism: `document.startViewTransition(updateCallback)`; `view-transition-name` CSS property; `::view-transition-old(name)` / `::view-transition-new(name)` pseudo-elements; `@view-transition { navigation: auto }` for cross-document (MPA) transitions.
- PINNED SHA: N/A (platform standard).
- LICENSE: N/A (royalty-free web standard).
- RECENT ACTIVITY: Same-document transitions Baseline since 2023; cross-document `@view-transition` rule newer (verify at implementation). Practitioner guidance (https://github.com/jangtrinh/design-os/blob/HEAD/knowledge/motion-craft.md): the reduced-motion guard is a JS check before calling `startViewTransition`.
- FYD PROBLEM: Navigation and media transition. The demo shell's page tabs swap full page content instantly; a shared-element or cross-fade transition would make navigation feel continuous. Media (project photos) could morph between list and detail.
- MECHANISM: The renderer assigns `view-transition-name` from data (section or object ids, e.g. `section-<id>`, `media-<objectId>`). Client code wraps renderer-driven DOM updates (tab switches) in `document.startViewTransition(() => update())`, guarded by `matchMedia('(prefers-reduced-motion: reduce)')`. The browser captures before/after snapshots and animates between them with a default cross-fade; custom morphs via the pseudo-elements. Because names come from stable object ids, the same graph yields the same transition identities: deterministic.
- EXACT IMPLEMENTATION: No library. Three pieces of renderer-owned glue: (1) `view-transition-name` emitted from spec/object ids in markup; (2) a wrapper around tab-switch and editor-apply DOM updates that calls `startViewTransition` when available and motion is allowed; (3) optional `@view-transition { navigation: auto }` for MPA page navigations. Default cross-fade is acceptable for v1; custom pseudo-element styling is a later refinement.
- CLAIM EVIDENCE: Platform docs and practitioner sources describe it as the standard mechanism for SPA view transitions with automatic fallback (no transition) where unsupported.
- SOURCE EVIDENCE: API shape corroborated by the cited motion-craft doc and MDN-described behavior (startViewTransition, view-transition-name, pseudo-elements). Exact browser-version matrix to be verified at implementation.
- RUNTIME EVIDENCE: Not executed in this lane.
- DEPENDENCY COST: Zero.
- WHAT FYD ALREADY HAS: Nothing; tab switches snap.
- WHAT THEY DO BETTER: The browser owns snapshotting and interpolation; no manual FLIP bookkeeping for full-view swaps.
- WHAT FYD DOES BETTER: Transition identities derive from stable object ids in the graph, so transitions are explainable from the spec (same ids, same morph targets).
- SMALLEST HARVESTABLE PRIMITIVE: The `view-transition-name` emission plus the guarded `startViewTransition` wrapper; roughly 20 lines of renderer-owned code.
- REUSE/ADAPT/REPURPOSE/PATTERN_ONLY/REJECT: REPURPOSE PATTERN.
- CAN IT:
  - remove code? Yes. Replaces any custom page-transition code.
  - remove ambiguity? Yes. Transition targets are named from data.
  - improve beauty? Yes for navigation; the highest-leverage polish for tab/page switches.
  - improve expressiveness? Partially. Cross-fade and shared-element morphs; not choreographed sequences.
  - improve trust? Yes. Unsupported browsers simply get no transition; content identical.
  - improve mobile? Yes. Browser-optimized snapshot animation.
  - improve accessibility? Yes, provided the JS reduced-motion guard is implemented (the API does not do this automatically).
  - improve performance? Neutral. Snapshot capture has a cost; acceptable for discrete navigations.
  - improve regeneration? Yes. Names derive from stable ids.
  - reduce AI improvisation? Yes. Fixed wrapper, no per-transition code.
- FALSIFICATION EXPERIMENT: Wrap tab switches on both demo sites; with reduced-motion on, no transition may run and content must swap instantly and correctly; in an unsupported browser the swap must work identically; rapidly switching tabs mid-transition must not leave the DOM in a torn state. Fails on torn DOM, on motion under reduced-motion, or on console errors.

## Kill list (one line each)

1. Motion (motion.dev, ex-framer-motion): 30k stars but 2.3 to 34KB (48KB gzip full per 2026 benchmarks) plus React 18/19 required; every animation is per-component code props (`initial`/`animate`/`transition`), which is code the renderer must execute, not data; reduced-motion is manual config.
2. React Spring: spring-physics hooks for React; code-driven, React-only, full rAF engine for a job CSS easings already do; huge dependency for tiny capability.
3. GSAP plus ScrollTrigger: imperative timeline engine (~27KB gzip core); animations authored as code sequences, which is arbitrary generated-code execution risk.
4. Motion One (motionone): tiny WAAPI wrapper but still imperative per-element `animate()` calls with no declarative data schema; superseded by Motion; nothing to harvest that WAAPI does not already give.
5. anime.js v4: full animation engine; its `createLayout` FLIP module is nice, but depending on a general engine (tens of KB) for a job AutoAnimate's 2KB zero-dep core does is the wrong trade; imperative API shape.
6. react-flip-toolkit (plus flip-toolkit): last release v7.2.4 roughly 2.2 years ago (stale); requires per-child `<Flipped flipId>` component wiring and explicit `flipKey` triggers, which is code in the render tree, not data; AutoAnimate covers the same FLIP job with zero per-child markup and active maintenance.
7. AOS (michalsnik/aos): effectively unmaintained (stable 2.3.4 from 2018, Snyk marks it Inactive, 353 open issues); steal its `data-aos` attribute shape as the "motion as data" pattern, not its code.
8. Motion Primitives (motionprimitives.com): copy-paste React UI components built on the Motion runtime, not a motion mechanism; depends on the Motion engine; beautiful demos hide ordinary architecture.
9. @wix/motion: honestly documented as a low-level WAAPI engine with "no trigger system, no declarative config schema"; FYD needs the schema, not another engine.
10. rootnative/inertia: React Native-oriented motion primitives; not relevant to a web renderer; adoption and quality unverifiable from here.
11. ScrollMagic: jQuery-era scroll library; superseded by IntersectionObserver plus scroll-driven CSS.
12. Hand-rolled rAF scroll listeners for reveals: rejected by the mechanism ladder; compositor-sampled timelines cannot be matched from script, and layout reads in scroll handlers are a jank risk.

## First visual experiment nomination

FYD currently has mechanism A: no motion at all; tab switches, section reorder/hide, and list cardinality changes in the shared demo shell snap instantly with no transition. Pinned project formkit/auto-animate@TBD demonstrates mechanism B: MutationObserver-triggered FLIP where config is data (`{duration, easing}` per container, `prefers-reduced-motion` respected by default), a documented add/remain/remove decision over WeakMap-tracked element state, and WAAPI playback of inverted transforms. B removes this exact deficiency: state changes that the renderer already performs (tab navigation, editor reorder/hide) read as broken and hide the before/after relationship. The smallest delta is C: the vendored FLIP core only (observer plus add/remain/remove classification plus WAAPI playback; no framework adapters, no scroll-compensation observers), reading `data-motion-layout` attributes the renderer emits from the SiteSpec, wired once in the shared client shell so every generated site inherits it with zero customer-specific code. This test proves whether C is better.

Falsification experiment: wire C into the shared shell and, on both demo sites, switch tabs 20 times and reorder plus hide/show sections 20 times. C is falsified (rejected) if any mutation misfires into a jump or a stuck element, if `prefers-reduced-motion: reduce` does not suppress all motion, if the same graph plus the same interaction yields different motion across runs, if mobile shows jank or layout thrash, if horizontal overflow appears, or if any console error is raised. C is better than A only if all interactions stay continuous and every check below passes.

Proof list:
- Same graph yields same semantic composition: motion config is spec data emitted as attributes; identical spec plus graph yields identical attributes yields identical motion; the semantic render model is unchanged by motion.
- Different graph yields explainable difference: any motion difference traces to a spec motion descriptor or an object cardinality change, both visible in the spec.
- Motion does not author facts or evidence: FLIP interpolates only transforms and opacity between two real DOM states; no text, values, or evidence are created, altered, or hidden; no-JS and reduced-motion render the identical final DOM.
- Mobile safe: transform/opacity only (compositor), durations capped; verified on the 375px viewport against the existing fyd-proof mobile shots.
- prefers-reduced-motion works: the vendored core preserves AutoAnimate's default-off behavior via a `matchMedia` guard; verified by toggling the OS setting.
- No horizontal overflow: transforms do not affect layout; add an `overflow-x: clip` guard on animated containers; verified with the existing mobile-overflow-trace.js.
- No console errors: verified with the existing console-capture.js in fyd-lane.

Note: cards 2 and 3 (scroll-driven reveals, View Transitions) are the recommended second and third experiments in that order; they are platform patterns with zero dependency cost and were not nominated first only because card 1 is the single strongest pinned external mechanism and directly exercises the renderer-owned bounded-runtime pattern the product needs.
