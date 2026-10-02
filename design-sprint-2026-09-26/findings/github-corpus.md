# GitHub Design Corpus: Open Implementations Harvested for FYD

Harvest date: 2026-09-26. Method: web search, opened repo pages and source files, read actual implementations. Read-only, nothing vendored.

How to read this file: each item describes a concrete mechanism (not inspiration) that a procedural site generator can adapt. License is noted per item; MIT/Apache items are preferred. Verdicts: KEEP (mechanism directly usable, adapt cleanly), ADAPT (usable with rework or dependency swap), REJECT (not usable as-is, kept for a named reason).

---

## 1. Bento grid composition patterns (Tailwind CSS Grid)

- What it implements: 8 named bento compositions (2x2 equal, 1 large + 2 small, L-shape hero, dashboard 4-panel, 3-column magazine, asymmetric showcase, metrics bar, masonry) plus a responsive strategy and 6 named antipatterns.
- Key mechanism: pure CSS Grid with Tailwind span utilities. Container sets `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`; hero cells take `col-span-2 row-span-2` on desktop and reset to `col-span-1` on mobile. Pattern choice is driven by item count: 4 items = 2x2 equal, 5-6 = 1 large + smalls, 8-10 = magazine/asymmetric, 12+ = dashboard or split. Gap should be 1/2 to 1x card padding. Text in spanned cells gets `line-clamp-*`.
- License: MIT (declared in the skill frontmatter).
- Dependencies: none (vanilla Tailwind classes).
- FYD applicability signals: use when a section has 4+ sibling objects (services, features, project cards, stats) with one object flagged hero/featured. Card-count selects the pattern deterministically. Falling back to a uniform grid is listed as an explicit antipattern, which is useful as a generator guardrail.
- Source: https://github.com/andersoncollab/design-agent/blob/HEAD/skills/bento-layout/SKILL.md
- Verdict: KEEP, item-count driven pattern selection maps directly onto generator logic.

## 2. Accessible before/after image comparison slider (React, zero deps)

- What it implements: a drag-to-reveal before/after photo comparison for renovation work, with mouse, touch, and keyboard support, as a client component for Next.js static export.
- Key mechanism: after image sits full-width underneath; before image lives in an absolutely positioned overlay div whose `style.width` is driven by pointer position (clientX mapped through `getBoundingClientRect`, clamped 0-100). The handle is `role="slider"` with `aria-valuemin/max/now`, arrow keys step +/-2, Home/End jump, `touch-action` handling prevents scroll interference on mobile. A `ResizeObserver` keeps the inner before image at the container's measured width so registration stays pixel-exact.
- License: MIT (declared in the skill frontmatter).
- Dependencies: none (React only).
- FYD applicability signals: use when the business has >= 1 before/after image pair of the same scene (renovation, roofing, landscaping, detailing). Each pair becomes one slider instance; 2 pairs fit a 2-column grid; 1 pair can anchor a portfolio section. This is the highest-converting proof asset for trade businesses.
- Source: https://github.com/r-senchuk/agentskills/blob/HEAD/.github/skills/before-after-slider/SKILL.md
- Verdict: KEEP, trade-vertical killer feature, zero-dependency, MIT, static-export safe.

## 3. img-comparison-slider web component (framework-agnostic)

- What it implements: a 4KB-gzipped Custom Element before/after slider with React, Vue, and Angular wrappers, styled entirely through CSS custom properties.
- Key mechanism: `<img-comparison-slider>` with `slot="first"` / `slot="second"` images; theming via `--divider-width`, `--divider-color`, `--default-handle-*` variables so one component adapts to any brand palette without prop drilling. Attributes: `value`, `hover` (auto-slide on mouseover), `direction` (horizontal/vertical), `keyboard` toggle. Emits a `slide` event on position change.
- License: MIT (confirmed on repo page).
- Dependencies: none (web standards: Custom Elements v1, Shadow DOM).
- FYD applicability signals: reference implementation for the slider in item 2. Use the CSS-variable theming contract as the pattern for how generated components accept brand tokens, rather than using the web component directly inside a Next.js renderer.
- Source: https://github.com/sneas/img-comparison-slider
- Verdict: ADAPT, borrow the CSS-variable theming contract and the hover/vertical modes; the native React build in item 2 is the better direct fit.

## 4. Scroll-reveal implementation ladder + choreography numbers (STIFF)

- What it implements: a decision ladder from zero-cost to heavy machinery for scroll effects, plus concrete numbers for reveal choreography (thresholds, distances, durations, stagger caps), parallax budgets, and reduced-motion handling.
- Key mechanism: rung 1 is an IntersectionObserver adding `.is-visible` once (`unobserve` on first trigger so it never replays), CSS transition on opacity/translateY only. Stagger uses `transition-delay: calc(var(--i) * 80ms)` with the index capped at 6-7 so the last item never waits past ~600ms. Hidden state is gated behind a `.js` class on the root so no-JS pages never render blank. Choreography defaults: trigger at 0.15-0.3 visibility or `rootMargin: 0px 0px -12% 0px`, translate 16-32px, duration 400-600ms ease-out, stagger 60-100ms. Reduced motion: `matchMedia('(prefers-reduced-motion: reduce)')` collapses to opacity-only 300ms. Parallax budget: max 3 layers, each moving at most 20% of its scroll travel, disabled on `pointer: coarse`.
- License: unknown (no license file or badge found on the repo page).
- Dependencies: none for rung 1; CSS `view()` timeline as progressive enhancement; framer-motion/GSAP only at higher rungs.
- FYD applicability signals: apply rung 1 to every below-fold section whenever the generated page has 3+ sections. The `.js` gate is the correctness fix the sprint cares about (content must exist without JS). Stagger caps translate directly into a generator rule: delay = min(index, 6) * 80ms.
- Source: https://github.com/aponchikaj/stiff/blob/HEAD/.claude/skills/scroll-animation/SKILL.md
- Verdict: KEEP, the ladder is the right generator policy (cheapest rung first) and the numbers are directly encodable.

## 5. Sticky scroll-stack cards (web-taste-skill, MIT)

- What it implements: 3-5 cards that pin and stack over each other as the user scrolls, pure CSS, plus a supporting motion vocabulary (hero choreography, parallax, count-up).
- Key mechanism: each card is `position: sticky` with a slightly different `top` value (top-24, top-32, top-40), creating a visual step as later cards slide over earlier ones. Zero JavaScript, no layout shift, GPU-cheap. Companion rule: never re-trigger reveals on scroll-up (fire once).
- License: MIT (confirmed on repo page).
- Dependencies: none.
- FYD applicability signals: use for process/service narratives when the business exposes a 3-5 step process (consultation, estimate, build, aftercare) or 3-5 differentiators. Generator rule: steps array of length 3-5 with body text longer than one line selects stacked cards over a flat list.
- Source: https://github.com/sonhaicoder/web-taste-skill/blob/HEAD/skills/web-taste/references/motion-recipes.md
- Verdict: KEEP, zero-JS premium effect that fits process/how-it-works sections perfectly.

## 6. Scroll-linked parallax image + count-up stats + hero entrance choreography (web-taste-skill, MIT)

- What it implements: a framer-motion trio for hero polish: image parallax, animated stat counters, and staggered hero entrance.
- Key mechanism: parallax uses `useScroll({ target: ref, offset: ['start end', 'end start'] })` mapped with `useTransform` to `['-10%', '10%']` (20% total range, the subtle ceiling), the image oversized with `scale-110` inside an overflow-hidden frame. Count-up uses `useInView({ once: true })` to flip a `useMotionValue` to the target, piped through `useSpring` and formatted with `Intl.NumberFormat` plus `tabular-nums` to prevent jitter. Hero entrance uses motion variants with `staggerChildren: 0.12` and the ease `[0.16, 1, 0.3, 1]`, in eyebrow, headline, lede, CTA order.
- License: MIT (same repo as item 5).
- Dependencies: framer-motion (motion values avoid per-frame React re-renders; never map scroll progress into `useState`).
- FYD applicability signals: parallax only when the hero has a real project photo and the viewport is fine-pointer desktop; count-up when the business has 3-4 numeric proof points (years, projects, rating); hero choreography for every hero, capped at one 120ms stagger chain. All three gate on `prefers-reduced-motion` (motion values set to static).
- Source: https://github.com/sonhaicoder/web-taste-skill/blob/HEAD/skills/web-taste/references/motion-recipes.md
- Verdict: ADAPT, mechanisms are exact but swap framer-motion for the vanilla rung-1 reveal (item 4) where possible; keep the -10%/+10% parallax bound and the count-up `Intl.NumberFormat` recipe.

## 7. APG accessible carousel state model (masup9/apg-patterns-examples, MIT)

- What it implements: the WAI-ARIA carousel pattern in React (plus Vue, Svelte, Astro), with auto-rotation, keyboard, touch, and a full test suite (unit + Playwright).
- Key mechanism: two independent booleans, `autoRotateMode` (user intent, toggled by play/pause) and `isPausedByInteraction` (temporary, from focus/hover); `isActuallyRotating = autoRotateMode && !isPausedByInteraction`. Play/pause button is the first tab stop; slide indicators use roving tabindex (selected tab is tabindex 0, the rest -1) with Arrow/Home/End navigation; `aria-live` is "off" while rotating and "polite" when paused so screen readers are not spammed; `aria-roledescription="carousel"`/`"slide"` and per-slide `aria-label="N of M"`. `prefers-reduced-motion` disables auto-rotation by default.
- License: MIT (confirmed on repo page).
- Dependencies: React only (patterns ported across frameworks).
- FYD applicability signals: use for testimonial walls or project galleries when there are 4+ items but the section budget allows only one row of visual weight. Generator rule: if testimonials >= 4 and media richness is low, emit an auto-rotating carousel with pause; if media richness is high, prefer the static grid from item 1.
- Source: https://github.com/masup9/apg-patterns-examples/blob/HEAD/src/patterns/carousel/carousel.md (repo: https://github.com/masup9/apg-patterns-examples)
- Verdict: KEEP, the two-boolean rotation state model is the correct generator logic and the ARIA checklist is directly testable.

## 8. Utopia fluid type scale via CSS clamp tokens

- What it implements: a fluid type system that interpolates between two modular scales (e.g. ratio 1.2 at 320px, 1.25 at 1240px) so every step is a single `clamp()` with no breakpoint jumps.
- Key mechanism: slope-intercept formula, `slope = (max - min) / (maxVw - minVw)`, `intercept = min - minVw * slope`, emitted as `clamp(min, intercept + slope*100vw, max)`, always in rem with a rem floor on the preferred term so browser zoom keeps working (pure `vw` middle terms break 200% zoom and fail WCAG 1.4.4). Token shape: `--step--1` through `--step-5`; companion fluid space tokens `--space-s/m/l` and space pairs like `--space-s-l`. In Tailwind v4 this lands in the `@theme` block (`--text-fluid-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem)`), and a tiny `fluid(minRem, maxRem, minVw, maxVw)` helper generates values at build time.
- License: technique writeups (licenses of the writeup repos unknown); the Utopia calculators' math is a published open technique, and no code is being vendored.
- Dependencies: none.
- FYD applicability signals: this is the typography spine of the generator. Emit `--step-*` tokens for every site; hero display maps to `--step-4`/`--step-5`, section heads to `--step-2`/`--step-3`, body to `--step-0`. The rem-floor rule is a hard generator invariant, not a suggestion.
- Sources: https://github.com/janwirth/ecosystem_review/blob/HEAD/design/typography.md, https://github.com/millionco/expect/blob/HEAD/packages/browser/src/mcp/resources/responsive/rules/modern-css-patterns.md, https://github.com/kashmir-tyre-house/kashmir-tyre-house/blob/HEAD/.claude/skills/responsive-design/SKILL.md
- Verdict: KEEP, the single most portable mechanism in the corpus; zero dependencies and it fixes the sprint's typography complaint.

## 9. Responsive image `sizes` patterns for grid cards (next/image)

- What it implements: correct `sizes` strings for multi-column gallery/service grids so the browser downloads the right srcset entry instead of the full-viewport image.
- Key mechanism: match `sizes` to the actual grid geometry minus gaps, e.g. a 1-col mobile / 3-col desktop card grid uses `sizes="(min-width: 1024px) calc(33vw - 10px), (min-width: 768px) calc(50vw - 2px), calc(100vw - 32px)"`. Full-width hero images get `sizes="100vw"` with `priority`; below-fold images get `loading="lazy"`. Rule: always pair `fill` with an explicit `sizes`; without it the browser assumes `100vw`. Assets constrained to `.webp`, meaningful alt text, `unoptimized` on static export.
- License: unknown for the standard_kit writeup; the before/after skill in the same agentskills family as item 2 is MIT and carries the same rules (`.webp` preferred, eager above the fold, lazy below).
- Dependencies: next/image (built into the Next.js renderer).
- FYD applicability signals: the generator knows each image's grid span at every breakpoint, so it can emit the `sizes` string deterministically per layout slot. This is a pure function of layout geometry, no authoring judgment needed.
- Sources: https://github.com/prathambdevx/standard_kit/blob/HEAD/image-optimization/SKILL.md, https://github.com/r-senchuk/agentskills/blob/HEAD/.github/skills/imagery-art-direction/SKILL.md
- Verdict: KEEP, deterministic `sizes` emission from layout geometry is exactly the kind of generator-owned correctness the sprint wants.

## 10. Scroll-aware sticky navbar with mobile drawer

- What it implements: a sticky navbar that transitions from transparent to frosted background past a scroll threshold, a hide-on-scroll-down variant, and a mobile drawer with body scroll lock and focus handling.
- Key mechanism: `position: sticky; top: 0; z-50` with `backdrop-blur`; a passive scroll listener flips a `scrolled` boolean at ~10-20px to swap background/border classes. Mobile: `hidden md:flex` hides desktop links, a hamburger toggles a drawer that locks body scroll while open, closes on route change, and carries `aria-expanded` plus a labeled toggle button. A scroll-spy variant uses IntersectionObserver (not scroll listeners) to highlight the current anchor section, offset by the navbar height. Section anchors get `scroll-mt-*` so headings land below the bar.
- License: unknown (writeup repos; devsnips and spell-ui show no license badge in the pages viewed).
- Dependencies: none.
- FYD applicability signals: emit whenever the generated page has 3+ anchored sections; drawer variant is mandatory for the 320/375/390 breakpoints the sprint tests. `scroll-mt` on sections and the IntersectionObserver scroll-spy are cheap wins for single-page trade sites.
- Sources: https://github.com/sarthakbystander/devsnips/blob/HEAD/React/Components/Navbar/navbar-sticky/README.md, https://github.com/xxtomm/spell-ui/blob/HEAD/content/blog/react-navbar-tutorial.mdx, https://github.com/utkxrsh13/devfolio (scroll-aware hide-on-scroll navbar + drawer with body scroll lock), https://github.com/mohd-ishan/ishan-ui (IntersectionObserver scroll-spy pattern)
- Verdict: ADAPT, the mechanisms are standard and safe to re-derive; the navbar itself is trivially re-implementable, so this is a spec, not a dependency.

## 11. Editorial image reveal vocabulary (clip-path + scale-settle, masked line headings)

- What it implements: the premium editorial entrance set used by agency/portfolio sites: clip-path image unmasking, image scale-settle, masked line-by-line heading reveals, and rule (divider) reveals.
- Key mechanism: image reveal animates `clip-path: inset(100% 0 0 0)` to `inset(0)` on scroll entry (duration ~1.2-1.4s, `power4.inOut`) while the inner `img` settles from `scale(1.15)` to `1` inside an overflow-hidden container. Headings split into lines, each line wrapped in `overflow: hidden`, inner spans animate `yPercent: 110` to `0` with 50-80ms stagger. Dividers animate `scaleX: 0` to `1` with `transform-origin: left`.
- License: unknown (writeup repos); techniques are generic CSS/GSAP recipes, no code vendored.
- Dependencies: none required; GSAP ScrollTrigger is the documented heavy-duty vehicle, but the clip-path and scale-settle effects can be driven by the rung-1 IntersectionObserver in item 4 for a zero-dep generator.
- FYD applicability signals: select the image reveal for hero and project-gallery images when media richness is high and the business is positioned premium (custom homes, remodelers); use masked line reveals for display headlines on editorial-direction sites; keep to one hero reveal per page (motion discipline: above-the-fold entrance must not delay LCP).
- Sources: https://github.com/giogio2004/kencho-group/blob/HEAD/CLAUDE.md (motion vocabulary), https://github.com/alvinindra/modern-frontend-skills/blob/HEAD/components/gsap-patterns.md (image-mask recipe), https://github.com/rbaumier/skills/blob/HEAD/ui-animations/quick-patterns.md (ImageReveal component)
- Verdict: ADAPT, re-implement via IntersectionObserver plus CSS rather than taking the GSAP dependency; keep the exact numbers (1.15 scale, inset wipe, 50-80ms line stagger).

## 12. Trades landing page section system (buildcraft-landing-page)

- What it implements: a complete Next.js 16 + Tailwind v4 section inventory for a construction firm: full-bleed hero with stats strip, two-column about with floating badge, 3-column service cards, filterable project grid (All/Residential/Commercial/Renovation), scroll-drawn process timeline, animated counters, testimonial cards, FAQ accordion, validated contact form with project-type and budget-range selects.
- Key mechanism: project showcase keeps a `projects` array of {id, title, category, location, image, description}; filter tabs do a pure `projects.filter(p => p.category === filter)` over a responsive 1-2-3 column grid with hover zoom and floating category tags. Contact form does field-level validation (email regex, phone digit rules, min-length textarea) and swaps to an animated success state on submit. Scroll animations use framer-motion with `viewport: { once: true }`. Navbar transitions transparent to frosted navy past 20px scroll.
- License: none declared. The README says "for portfolio / demonstration purposes" only. Not freely reusable; do not copy code or copy the brand.
- Dependencies: Next.js 16, React 19, framer-motion, Tailwind v4.
- FYD applicability signals: useful as a section-order reference (hero, about, services, why-choose-us, projects, process, stats, testimonials, FAQ, contact) and as the category-filter pattern for project galleries. Do not adapt the code; treat it as a composition spec only.
- Source: https://github.com/galvinmariaalversa/buildcraft-landing-page (raw file reads of Navbar.tsx and ProjectsShowcase.tsx returned truncated content, so only the documented structure above is cited)
- Verdict: REJECT for reuse (no license), but the section inventory and the pure-filter project grid are worth encoding as generator knowledge, re-derived independently.

---

## The 6 mechanisms most directly reusable by the Next.js + Tailwind renderer

Ranked by leverage for procedurally generated trade-business sites:

1. Accessible before/after slider (item 2, MIT, zero deps). Transformation proof is the highest-converting asset for trades; one deterministic component driven by before/after image pairs, keyboard-accessible out of the box.
2. Rung-1 scroll reveal with choreography numbers (item 4, license unknown but technique-level, zero deps). Universal, cheap, and the `.js` gate plus 80ms stagger caps are directly encodable generator invariants.
3. Utopia fluid type scale as Tailwind v4 `@theme` clamp tokens (item 8, open technique). The typography spine; fixes the sprint's "no drama" complaint with rem floors intact.
4. Bento grid with item-count pattern selection (item 1, MIT). Deterministic composition: card count in, named layout out, mobile collapse for free.
5. Deterministic `sizes` emission from grid geometry (item 9, next/image built-in). Pure function of layout spans; performance correctness the generator can own completely.
6. Scroll-aware sticky navbar with mobile drawer (item 10, spec-level, zero deps). Mandatory for the 320-390px breakpoints; scroll-spy via IntersectionObserver, `scroll-mt` on sections, body scroll lock in the drawer.

Honorable mention: the APG carousel two-boolean rotation model (item 7, MIT) for testimonial and gallery carousels; the sticky scroll-stack (item 5, MIT) for 3-5 step process sections; the clip-path editorial reveal (item 11) for premium hero imagery.
