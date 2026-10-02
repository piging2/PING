# Design Pattern Corpus: Composition Intelligence for FYD Generated Sites

Observer: DESIGN-HARVEST subagent, 24-hour FYD design sprint.
Date observed: 2026-09-26.
Purpose: principles and mechanisms only. Nothing here is copied wholesale; no proprietary text, imagery, or branding.

Each pattern below carries: problem solved, visual principle, responsive behavior, interaction, accessibility implications, implementation mechanism, applicable FYD object/relationship signals, source/provenance, and a KEEP / ADAPT / REJECT verdict with a reason.

---

## P1. Emergency hero: phone number as the headline

- **Problem solved:** A homeowner with a leak or no hot water is choosing between three local firms on a phone. They need urgency confirmation, geography confirmation, and a tap target within the first screen, not a brand story.
- **Visual principle:** Urgency strip above the header (one line, often red or high-contrast) states the promise ("60-minute response") before the logo. The hero headline is the phone number itself, oversized and tappable, with a one-sentence promise beneath and two actions (Call now / Book online). Stack order is argument-first, identity-second: urgency, then place, then how to call.
- **Responsive behavior:** On mobile the full number may be too wide; the pattern shifts to a short sticky bottom "Call Now" bar (fixed, full-width, 48-60px tall) that appears after the hero scrolls out of view, while the hero keeps a headline promise + one tap button. The top utility strip is NOT sticky; it scrolls away.
- **Interaction:** The sticky call bar fades in (no hard pop), hides when a form field is focused (keyboard up), and reappears on scroll-up. Only one sticky bar at a time.
- **Accessibility implications:** The phone number must be a real `tel:` link with full international format in the href even when display text is local. Sticky bars need `padding-bottom: env(safe-area-inset-bottom)` so the home indicator does not overlap. Announce nothing spurious; do not trap scroll.
- **Implementation mechanism:** `position: sticky; top: 0` on the nav alone (not `fixed`, so no body padding needed); a fixed bottom bar with `translate-y-full` -> `translate-y-0` toggled by an IntersectionObserver on the hero sentinel; scroll listener only for the >4px shadow toggle, passive. Hero title as `clamp()` display type so the number fits 320px without overflow.
- **Applicable FYD signals:** fires when `emergency_service = true` (services include emergency/24-7/overtime categories) OR `business_category IN (plumbing, HVAC, electrical)`. Strengthens when phone is the business's primary CTA signal (form usage absent from evidence).
- **Source/provenance:** 18-plumber study, Colorlib, updated ~2026-09-16, read 2026-09-26 (sites described: Nautilus-style urgency strip ordering; A-1-style review pinned in hero + red fixed bottom Call Now bar; Absolute-style hero quote form as the exception). https://colorlib.com/wp/plumbing-websites-design/
- **Verdict: KEEP.** This is the highest-leverage hero family for emergency trades. It is structural, not stylistic, so it generalizes to any urgency business.

---

## P2. Triage form field: "Is this an emergency?"

- **Problem solved:** One contact form receives two fundamentally different intents (emergency now vs. scheduled project). Without triage, the business treats a burst pipe like a bathroom remodel quote request, and the homeowner waits.
- **Visual principle:** The question is a first-class form field, not buried copy. In the hero it can be a checkbox; in a booking flow it is the first question. It reframes the form as a routing device rather than a mailbox.
- **Responsive behavior:** Single field per row below 600px; labels above inputs (floating-inside labels break autofill). The field order puts the triage question first so it is never scrolled past.
- **Interaction:** Answering "yes" can swap the submit path (e.g., reveal a call button alongside the submit, or route the payload with an emergency flag). The change is instant and honest, not gated behind more fields.
- **Accessibility implications:** Use a native checkbox or radio group with a real `<label>`; keyboard operable by default. If answering changes downstream behavior, announce it with `aria-live="polite"` text rather than silently altering the flow.
- **Implementation mechanism:** Plain HTML form with conditional fieldset reveal; the triage value is a data attribute on the submitted payload (`intent=emergency|schedduled`). No JavaScript framework needed; a few lines of progressive enhancement on top of a working default submit.
- **Applicable FYD signals:** fires when `service_tiers >= 2 AND emergency_service = true`. The compiler should generate the field only when the service taxonomy actually contains both urgent and non-urgent offerings; otherwise it is a false choice.
- **Source/provenance:** Colorlib 18-plumber study (site described as asking "Is this an emergency?" as a form field, cheapest version of the emergency-vs-scheduled split), read 2026-09-26. https://colorlib.com/wp/plumbing-websites-design/
- **Verdict: KEEP.** Tiny, cheap, and genuinely routing. One of the highest ROI-per-byte patterns in the corpus.

---

## P3. Hero proof: named review beside the CTA, review-pin service map

- **Problem solved:** Badges and carousels do not convert anymore because visitors distrust invented "trusted by" strips. Specific, attributable proof placed where the decision happens beats a testimonials carousel nobody scrolls to.
- **Visual principle:** One specific review pinned inside the hero, complete with the reviewer's name, star count, and the overall rating across thousands of reviews. Or: a hero map where each pin is a real customer review, so the service area is drawn from job history instead of asserted. Specific beats plentiful.
- **Responsive behavior:** The pinned review collapses to a single rating line ("4.9 from 287 Google reviews") next to the CTA on small screens; the pin map degrades to a named-town list with counts, since map pins are unusable on small touch targets.
- **Interaction:** Static. Reviews do not auto-rotate (auto-rotation is the tell). If multiple reviews exist, they sit in a grid or list the visitor can scroll, strongest first, with at least one that mentions an early doubt or small hiccup.
- **Accessibility implications:** Review text is real text, not images of stars. Star ratings use `role="img"` with `aria-label="4.9 out of 5 stars"`. No fake "Verified" badges invented by the site itself.
- **Implementation mechanism:** A `figure`/`blockquote` block with `cite` attribution placed in the hero grid adjacent to the CTA; map variant renders review locations as absolute-positioned markers over an SVG or static map image, with a `<noscript>`/fallback list. Both pull from a `reviews` object array in the data model.
- **Applicable FYD signals:** fires when `reviews.count >= 1`. Full map variant requires `reviews.count >= 8` AND `service_area.places >= 3` (pins need distribution). If zero reviews exist, the compiler must NOT fabricate; instead it substitutes the honest alternative (named owner + licence, see P4).
- **Source/provenance:** Colorlib 18-plumber study (review pinned in hero; hero map of review pins proving service area), read 2026-09-26; squarewebsites.org review-placement playbook (three real reviews strongest-first, grid not carousel, review includes doubt, sit next to main CTA), read 2026-09-26. https://colorlib.com/wp/plumbing-websites-design/ and https://www.squarewebsites.org/blog/where-to-put-customer-reviews-and-testimonials-on-your-website-so-people-actually-read-them
- **Verdict: KEEP.** The anti-badge trust pattern. The fallback rule (no invented proof) is as important as the pattern itself.

---

## P4. Named person + real licence number as the trust anchor

- **Problem solved:** "Licensed and insured" is a claim anyone can type. Five businesses publishing an actual registration number beat thirteen making the vague claim. A named owner (a licensed master, named on the homepage) outranks any number of unnamed "certified technicians".
- **Visual principle:** The licence number is set in type, small but real, under the wordmark or beside the headline, like a serial plate. The owner's portrait replaces the stock crew photo; pricing is a plain list rather than a card grid. Everything looks authored by a person rather than assembled by a template.
- **Responsive behavior:** The licence line stays visible at all widths; it is micro-copy, not chrome, so it survives the mobile single-row nav contract (logo + one CTA). Portrait-crop owner hero scales down cleanly because it is a portrait crop, not a wide landscape that turns into a postage stamp.
- **Interaction:** None. Stillness is the point; this pattern borrows credibility from verifiability, and motion would cheapen it.
- **Accessibility implications:** The licence number is text, copyable and readable by screen readers. Portrait has meaningful alt text naming the person, not "team photo".
- **Implementation mechanism:** Wordmark with a sub-line (`<small>` licence number) in the header or hero; a "named owner" object in the data model (`owner.name`, `owner.licence`, `owner.portrait`, `owner.role`) that renders a person block instead of a generic About. Priced service list is a `<dl>` or plain rows, not cards.
- **Applicable FYD signals:** fires when `owner.is_named = true OR business.is_owner_operator = true`; licence line renders when `credentials.licence_number` is a non-empty verified string. This is the canonical pattern for one-person/one-van businesses.
- **Source/provenance:** Colorlib 18-plumber study (Edwards: Arizona ROC number published in full; Superior: named master plumber on homepage; Ninja: leading with the Google Business Profile card and Google Guaranteed badge), read 2026-09-26; Colorlib "Journeyman" owner-operator template description (portrait-crop owner hero, priced plain list, free phone advice as a service), read 2026-09-26. https://colorlib.com/wp/plumbing-websites-design/ and https://colorlib.com/wp/template/journeyman/
- **Verdict: KEEP.** The honest-trades answer to social proof. Particularly right for Coppersmith if the owner is a named, credentialed person.

---

## P5. Clip-path image reveal on scroll

- **Problem solved:** Long pages of project photography need a reveal that feels designed rather than templated, without the cost and fragility of scroll-jacking libraries. The reveal should also reward the first scroll into a gallery section with a sense of uncovering work.
- **Visual principle:** Images are hidden behind a CSS `clip-path` that retracts as the image enters the viewport, like a curtain being pulled back (usually from bottom: `inset(0 0 100% 0)` to `inset(0 0 0 0)`). Inner image counter-scales (1.15 -> 1.0) during the reveal so the frame feels photographic, not mechanical. Hard, precise, editorial.
- **Responsive behavior:** Below ~768px, disable the clip reveal and use a simple opacity fade; touch scrolling makes scrubbed reveals feel broken, and clip-path scrubs on small viewports cause jank. Parallax layers flatten to a single depth.
- **Interaction:** Two valid trigger styles: (a) one-shot IntersectionObserver reveal with a ~700-800ms `cubic-bezier(0.77, 0, 0.175, 1)` ease; (b) scroll-scrubbed reveal where clip is tied to traversal progress. One-shot is the safe default for trades sites; scrubbed is for editorial hero plates only.
- **Accessibility implications:** `prefers-reduced-motion` must fully disable the reveal (instant final state, no motion). Never hide content with opacity alone behind JS without a no-JS fallback: the reveal should be added via a `.js` class so non-JS visitors see the image. Never use raw scroll listeners; IntersectionObserver is the only allowed trigger mechanism.
- **Implementation mechanism:** `clip-path: inset(0 0 100% 0)` initial, transition to `inset(0 0 0 0)` on `.is-visible` added by `new IntersectionObserver(cb, {threshold: 0.1, rootMargin: "-100px"})` with `once` semantics (disconnect after first reveal). Stagger via `transition-delay: calc(var(--i) * 60ms)` on sibling cards. GPU-friendly: clip-path is composited, no layout thrash.
- **Applicable FYD signals:** fires when `media_count >= 3` in any section; mandatory in the project/work gallery section. Strengthens the "uncovering work" read when the gallery is the page's proof spine (`section.role = proof`).
- **Source/provenance:** multiple open-source pattern libraries observed 2026-09-26: mariusyvard/nulltohero creative-patterns (one-shot IO reveal, never raw scroll listeners); hipstersmoothie/standard-reader clip-path techniques (full RevealImage component with threshold 0.1 / rootMargin -100px); mustbesimo/web-design-studio scroll-patterns (mobile disables parallax and switches to fade, parallax depth layers 0.25-0.85x); deepception cc_tool archetype (prefers-reduced-motion kills pins/scrubs, reveals become fades). URLs: https://github.com/mariusyvard/nulltohero/blob/HEAD/skills/siteasy/references/creative-patterns.md and https://github.com/hipstersmoothie/standard-reader/blob/HEAD/.agents/skills/ui-animation/references/clip-path-techniques.md
- **Verdict: KEEP.** The core motion primitive for image-led pages. Cheap, compositor-safe, and accessibility-fallbackable.

---

## P6. Before/after comparison slider

- **Problem solved:** For renovation, remodel, and restoration work, the transformation IS the pitch. A slider lets the visitor scrub the change themselves, which converts better than two labeled photos side by side.
- **Visual principle:** Two stacked images, top image clipped by `clip-path: inset(0 var(--split) 0 0)`. A draggable handle with a visible grip line; "Before"/"After" labels anchored to the two sides. The handle sits at ~50% by default.
- **Responsive behavior:** Touch dragging works natively through pointer events; on very small screens the labels shrink and the handle hit-area grows to >=44px. No separate mobile variant needed, the mechanism is input-agnostic.
- **Interaction:** Pointer events (pointerdown/move/up) update the `--split` CSS variable; no layout, fully hardware-accelerated. Add keyboard access: the handle is a slider `role="slider"` with arrow-key control of the split. Cursor changes to ew-resize over the handle.
- **Accessibility implications:** Keyboard operability is required (this is why it beats canvas-based implementations). Provide `aria-valuenow` describing the split percentage, and text labels for before/after rather than relying on color or position alone. Under `prefers-reduced-motion` the slider still functions; it is user-driven motion, not ambient motion, so no removal is needed.
- **Implementation mechanism:** Two absolutely positioned `<img>` layers in an `aspect-ratio` box; top layer clipped via CSS var; pointer events on the container update the var with clamping. Pure vanilla JS, ~30 lines. The same clip-path primitive as P5, repurposed for user control.
- **Applicable FYD signals:** fires when `before_after_pairs >= 1` on a project or service. The compiler pairs images that share a project relationship and are tagged before/after; if tagging is absent, this section must not render (never fake a pair from unrelated photos).
- **Source/provenance:** Onyx bathroom-renovation template description, Colorlib, Sept 2026: "Before-and-after slider, keyboard accessible", read 2026-09-26. https://colorlib.com/wp/template/onyx/ ; LuxeSpace Interiors repo README (draggable reveal slider for portfolio transformations), read 2026-09-26. https://github.com/harinathsasikumar/interior-designer-firm-website ; arsalan507/website-architect README master-blueprint (visual transformation: before/after slider or tagged gallery as a required conversion element), read 2026-09-26. https://github.com/arsalan507/website-architect
- **Verdict: KEEP.** The highest-converting visual element for transformation trades. The pairing rule (real before/after pairs only) prevents the failure mode.

---

## P7. Project gallery: staggered depth rhythm, captions on hover

- **Problem solved:** A trades portfolio must let the work dominate while still carrying the metadata (project type, location, scope) a serious prospect scans for. A uniform 3x3 grid of equal cards reads as a template; uneven rhythm reads as curation.
- **Visual principle:** 3-4 column CSS grid on desktop with even columns offset ~80px lower than odd columns for visual rhythm; large featured images span 2 columns; captions reveal on hover only (Onyx-style), so the grid reads as pure photography until the cursor interrogates it. Column rules are broken deliberately and consistently (12-col grid violated with stable rules).
- **Responsive behavior:** Below 768px: 2-column grid, parallax and offsets disabled, captions render statically below images (hover does not exist on touch), image count capped at ~12 with a "load more" button below the fold.
- **Interaction:** Hover: image scales 1.02 with a dark overlay fading 0 -> 0.3 over ~400ms; cursor-following label on desktop showing project name. Scroll: per-image parallax at staggered speeds (0.25x-0.85x) on desktop only, via transform3d.
- **Accessibility implications:** Captions must exist in the DOM regardless of hover state (screen readers get them always; sighted mobile users get them statically). Lazy-load everything past the first ~6 images (`loading="lazy"`, explicit width/height to prevent CLS). Parallax disabled under `prefers-reduced-motion`.
- **Implementation mechanism:** CSS grid with `grid-column: span 2` for featured tiles; `data-speed` attributes driving `translateY` in a single rAF/IntersectionObserver loop (or one shared ScrollTrigger); `will-change: transform` applied only when within ~500px of viewport and removed after. Budget: max ~20 parallaxed images simultaneously.
- **Applicable FYD signals:** fires when `media_count >= 6 AND project relationships exist` (multiple projects with >=1 image each). Featured 2-col spans fire for projects flagged `featured` or with the highest media richness. The 12-image cap + load more fires when `media_count > 12`.
- **Source/provenance:** mustbesimo/web-design-studio scroll-patterns (depth layers, column offsets, mobile strategy, performance budget), read 2026-09-26. https://github.com/mustbesimo/web-design-studio/blob/HEAD/references/scroll-patterns.md ; Colorlib construction examples (Obsession Construction dark image-forward gallery; Birchwood gallery-driven full-bleed), read 2026-09-26. https://colorlib.com/wp/construction-company-website-examples/ ; Onyx template (portfolio tiles reveal captions on hover only), read 2026-09-26. https://colorlib.com/wp/template/onyx/
- **Verdict: KEEP.** The canonical Happy Place section. The rhythm rules (offsets, featured spans, hover captions) are what separate it from a stock grid.

---

## P8. Service index as hairline rows, not cards

- **Problem solved:** A plumber or carpenter with 8-15 services cannot fit them in a 3-across card grid without two stacked rows of identical icon cards, which is the single strongest "a machine built this" signal at the page level. Long service lists also need room for one-line descriptions and prices.
- **Visual principle:** Services as full-width rows separated by 1px hairline rules: service name in strong type, one line of description, and optionally a flat price at the right. A two-column split with icon + name + price also works. Rows read as an index or catalogue, which suits trades. Cards are reserved for the case where each offering is genuinely parallel AND visually equal (rare).
- **Responsive behavior:** Rows stack naturally; the price moves from right-aligned to a second line. No breakpoint redesign needed, which is the point: rows are intrinsically responsive.
- **Interaction:** Hover on a row can expand it (accordion) or show a floating preview image that follows the cursor (editorial variant). Row expansion is the practical choice for trades: tap to reveal the description and a "request this service" link.
- **Accessibility implications:** Rows as a real list (`<ul>`/`<li>`) or definition list; expandable rows use `<button aria-expanded>` with the region labeled. Keyboard users get the same expansion as hover users.
- **Implementation mechanism:** A single-column list with `border-top: 1px solid` rules; grid inside each row (`1fr auto`) for name/price alignment. Expansion via `max-height` transition or the `hidden` attribute with a grid-rows animation. Chosen by count: `services.count <= 4` may use grid; `> 4` uses rows; exactly one headline offering uses the `feature` variant (large split block).
- **Applicable FYD signals:** fires when `service_count >= 5` (rows); `service_count <= 4` allows grid only if descriptions are short and parallel; `service_count == 1 AND media_count >= 2` fires the feature variant. Prices render only when `pricing.published` is true.
- **Source/provenance:** mycel product-builder design-the-front-page (services layout: grid only when offerings are genuinely equal and parallel; rows for any number; feature for a headline offering; "three-across grid stacked under another three-across grid is the single most template-looking thing a page can do"), read 2026-09-26. https://github.com/mycelhq/mycel/blob/HEAD/wedges/product-builder/skills/design-the-front-page.md ; betterlmy finesse-ui page-skeletons (services as four identical icon-cards is the #1 tell; use numbered list with typographic weight instead), read 2026-09-26. https://github.com/betterlmy/agent-skills/blob/HEAD/skills/finesse-ui/references/page-skeletons.md ; Colorlib plumbing prompt library (two-column service list, icon + name + one line + flat price, hairlines between rows), read 2026-09-26. https://github.com/wppilot-labs/wordpress-mcp-elementor-wppilot/blob/HEAD/includes/prompt-library/prompts/plumbing.md
- **Verdict: KEEP.** The anti-template service layout. The count-based variant rule is directly compilable.

---

## P9. Pinned masthead and sticky statement column (editorial scroll narrative)

- **Problem solved:** Long pages flatten into a monotone stack of full-width bands. Pinning a heading or statement column while supporting material scrolls past creates a two-track rhythm: an anchor and a stream. It makes process, craft, and story sections feel like chapters instead of fill.
- **Visual principle:** A chapter heading pins (`position: sticky`) while lede + body scroll past it; a ghost numeral sits behind at ~8% opacity with counter-parallax. Or the Split Diptych: a persistent statement column beside a scrolling content column. Chapter wipes (background entering as a scroll-driven horizontal wipe) mark transitions between chapters.
- **Responsive behavior:** On touch/small viewports, pins become a simple vertical stack: pinned sections release cleanly, no pinning, scrubbed wipes become hard cuts. The statement column stacks above its content column.
- **Interaction:** Scroll-driven, linear scrub (no easing on scrubs; `scrub: 1-1.5`). Masked line-rise for headings (110% -> 0). Capability ticker as a slow marginal marquee along a section edge, pausing on hover/focus, static list under reduced motion.
- **Accessibility implications:** Pinned content must remain reachable by keyboard and screen readers in DOM order (pinning is visual, not structural). Under `prefers-reduced-motion`: no pins, no scrubs, static colors instead of scroll-driven color transitions, marquee becomes a static list. Pin/unpin transitions must not snap.
- **Implementation mechanism:** `position: sticky; top: X` for the heading block inside a taller section; scroll-scrubbed wipes via a single ScrollTrigger or IntersectionObserver progress mapped to `clip-path`/`background-position`. One source of truth for scroll position; no competing scroll handlers. Sticky service nav variant: left nav with IntersectionObserver-driven active state highlighting the currently visible service card.
- **Applicable FYD signals:** fires when `process_steps >= 3` (process/craft narrative) OR `longform_story = true` (owner story, craft story). The sticky service-nav variant fires when `service_count >= 4 AND service_detail_pages exist`. Never fire on short pages; pinning needs scroll room (section height >= 200vh of content to justify a pin).
- **Source/provenance:** bthaas.github.io AWWWARDS-PLAN (masthead release: hero copy sticky for ~40vh then releases; pinned heading with ghost numeral; chapter wipe; capability ticker), read 2026-09-26. https://github.com/bthaas/bthaas.github.io/blob/HEAD/docs/AWWWARDS-PLAN.md ; saadmughal14/spreadhire-redesign (sticky left service navigation with IntersectionObserver active state + scrolling service cards), read 2026-09-26. https://github.com/saadmughal14/spreadhire-redesign ; alanvaa06/award-craft awwwards-rubric (pinned sections with scrub, sticky media swapping as text columns pass, broken grids with consistent violation rules), read 2026-09-26. https://github.com/alanvaa06/award-craft/blob/HEAD/skills/direction/references/awwwards-rubric.md
- **Verdict: ADAPT.** Keep the sticky-statement and chapter structure; reserve the ghost numerals and marquee tickers for premium editorial builds (Happy Place with a real craft story). Do not pin on pages without enough scroll room.

---

## P10. Sticky nav that migrates and stays within budget

- **Problem solved:** Navigation must stay reachable without eating the viewport. The failure mode is a sticky stack (utility bar + header + CTA row) that crushes a 390px phone screen, or a nav that goes muddy over imagery.
- **Visual principle:** One sticky row, max ~64-72px tall on mobile (hard ceiling ~96px). Transparent over the hero, solid on scroll, handled through CSS custom property swaps. Scroll shadow appears after ~4px of scroll. The utility/announcement bar is NOT sticky; it scrolls away. On long editorial pages the nav can migrate: bottom pill in hero -> sticky top bar in content.
- **Responsive behavior:** Mobile contract: one row only. Logo + single primary CTA persist; all links collapse behind a hamburger -> drawer; phone number becomes an icon-only handset glyph (`aria-label`); wordmark never splits mid-name (`white-space: nowrap`, drop to logomark alone if needed).
- **Interaction:** The drawer is a real overlay: focus-trapped, Esc and backdrop close it, body scroll locked, links >=44px tall. Active page indicator works on every route. Hamburger button itself is a micro-interaction showcase (morphing icon).
- **Accessibility implications:** Menu state announced (`aria-expanded`), focus trap in the drawer, Escape closes. Visible focus states on all nav links. CTA `aria-label` descriptive, never "click here". Sticky elements must not overlap focus order or cover focused form fields.
- **Implementation mechanism:** `header { position: sticky; top: 0; z-index: 50 }` (never fixed, avoids body padding math); scroll listener adds `.is-scrolled` toggling a shadow and a `--hm-color` custom property swap for transparent->solid; mobile bottom CTA is `fixed` with `translate-y` IO toggle and `pb-safe` (`max(12px, env(safe-area-inset-bottom))`). Keep the sticky element wrapping the nav ALONE; a utility bar left inside the sticky header inflates the budget and lets the nav unstick once the box scrolls past.
- **Applicable FYD signals:** always fires (every generated site gets the one-row contract + budget). The migratory variant fires only on `page_type = editorial_longform`. The mobile sticky bottom CTA fires when `phone` is a verified contact AND `page != checkout/form-focus` (never on long forms where it competes with fields).
- **Source/provenance:** laith0003/ux-skill component-behaviors (mobile contract: one row, <=64-72px, sticky-header budget, utility bar not sticky, sticky element wraps nav alone), read 2026-09-26. https://github.com/laith0003/ux-skill/blob/HEAD/references/foundations/component-behaviors.md ; kryhr/45-anti-slop-skills mobile-navigation-ux (tap-to-call placement, tel: with full international href, icon-only below breakpoint), read 2026-09-26. https://github.com/kryhr/45-anti-slop-skills/blob/HEAD/skills/mobile-navigation-ux/SKILL.md ; aqibaslam/moves mobile-conversion-patterns (sticky CTA rules: one bar, hide on keyboard, show after hero via IO, fade in, safe-area insets), read 2026-09-26. https://github.com/aqibaslam/moves/blob/HEAD/.claude/skills/mobile-conversion-patterns/SKILL.md ; r-senchuk/agentskills floating-sticky-ui (sticky not fixed; MobileStickyBar slides in after 300px, hides on md:), read 2026-09-26. https://github.com/r-senchuk/agentskills/blob/HEAD/.github/skills/floating-sticky-ui/SKILL.md
- **Verdict: KEEP.** The load-bearing chrome contract. The budget rule (sticky = nav alone, <=72px) is the enforceable part.

---

## P11. Fluid type system: clamp() modular scale, body floor fixed

- **Problem solved:** Per-breakpoint font-size media queries produce jumps and maintenance debt; unscaled viewport units collapse type on small screens. Generated sites need a type scale that stays coherent at 320px and dramatic at 1440px without manual tuning.
- **Visual principle:** A 5-size system with one modular ratio (1.25 major third or 1.333 perfect fourth, pick one and commit): hero `clamp(2.5rem, 6vw, 4.5rem)/1.05`, display, title, subtitle, body `1rem/1.55`, small, caption. Fewer sizes with more contrast beats many close sizes. Eyebrow restraint: max one tiny-uppercase-tracked eyebrow per three sections; the headline alone is usually enough.
- **Responsive behavior:** The scale compresses by tightening the ratio on small viewports, never by shrinking the floor: body stays 16px (hard readability floor); the ceiling (H1/display) gives way (e.g. desktop ratio 1.333, mobile 1.125). Headings use `text-wrap: balance`, paragraphs `text-wrap: pretty`. Line-height unitless so it scales with font-size.
- **Interaction:** None. Type is ambient; the only motion-adjacent concern is avoiding CLS: explicit line-heights, `font-display: swap` with size-adjust to prevent reflow.
- **Accessibility implications:** Never clamp text the user must read to act (prices, errors, primary instructions) where truncation is unsafe; body floor at 16px minimum; test 200% zoom and large dynamic type; line length 45-75ch via `ch` units.
- **Implementation mechanism:** Design tokens as CSS custom properties, e.g. `--text-hero: 600 clamp(2.5rem, 6vw, 4.5rem)/1.05`; derive each level from the Utopia formula `clamp(MIN, yIntercept + slope*100vw, MAX)` between a 320px and a 1440px viewport. Two font families max (display + body). Pair with a layout that grows vertically; fluid type alone is not responsive art direction.
- **Applicable FYD signals:** always fires (every generated site gets the scale). The ratio choice can be a style-family input: editorial/trades-premium (Happy Place) leans 1.333 with serif display; utility/emergency (Coppersmith) leans 1.25 with grotesque display. `text-wrap: balance` fires on all headings by default.
- **Source/provenance:** etr/groundwork typography-guide (modular scale, fluid clamp, wider ratio desktop / tighter mobile, body floor fixed), read 2026-09-26. https://github.com/etr/groundwork/blob/HEAD/references/design-system/typography-guide.md ; kaytm93/website-design-ultra typography hierarchy-and-loading (semantic scale tokens, text-wrap rules, 200% zoom testing), read 2026-09-26. https://github.com/kaytm93/website-design-ultra/blob/HEAD/website-design-ultra/skills/typography/references/hierarchy-and-loading.md ; rajux75/expensec modular-scale-typography (never shrink from the bottom; compress from the top), read 2026-09-26. https://github.com/rajux75/expensec/blob/HEAD/agent/skills/modular-scale-typography/SKILL.md ; betterlmy finesse-ui page-skeletons (eyebrow restraint rule), read 2026-09-26. https://github.com/betterlmy/agent-skills/blob/HEAD/skills/finesse-ui/references/page-skeletons.md
- **Verdict: KEEP.** The deterministic type engine. The ratio-selection input is the composition hook.

---

## P12. Multi-step lead capture as a modal, consultation framing, published ranges

- **Problem solved:** A seven-field quote form above the fold converts worse than a guided two-or-three-step flow, and "Get a Quote" framing attracts price shoppers while "Book a Consultation" framing attracts serious projects. Premium studios that hide pricing look evasive; publishing a range looks confident.
- **Visual principle:** The primary conversion CTA opens a multi-step modal, never a separate page. Steps: what do you need -> where/when -> how to reach you. Each step is one question with large tap targets. The closing section is framed as booking a consultation (calendar-like, even if it is just a form), and a published price range sits nearby as an honesty signal.
- **Responsive behavior:** Modal becomes a bottom sheet on mobile (slides up, drag handle, full-width). One field per row; native input types (`tel` -> numeric keypad, `email` -> @ key); labels above fields; submit button full-width, >=48px, in the thumb zone.
- **Interaction:** Step progress indicator; back button preserves entered values; validation inline below the field, in red, with an icon; success state names what happens next ("We call within one business day") instead of a bare "Thank you".
- **Accessibility implications:** Modal focus-trapped with Esc to close and focus returned to the trigger; each step announced (`aria-live` on the step heading or a proper multi-step `aria` pattern); all inputs labeled; error messages associated via `aria-describedby`. Do not auto-open the modal on load.
- **Implementation mechanism:** `<dialog>` element (native focus handling, top layer) or a div with `role="dialog" aria-modal="true"`; step state in a tiny JS state machine; payload built from a `lead_fields` schema in the data model. Calendar framing can be a real booking embed or a styled form; never fake availability.
- **Applicable FYD signals:** fires when `lead_capture = true`. Modal variant when the form has >= 4 fields; inline short form stays when `lead_fields <= 3`. Consultation framing fires when `avg_ticket = premium` or `project_based = true` (carpentry/remodel); quote framing when `transactional = true` (drain cleaning, water heater swap). Published ranges render when `pricing.published_range` exists.
- **Source/provenance:** arsalan507/website-architect README master-blueprint (multi-step modal lead form never a separate page; count-up scale proof; visual transformation required; mobile-first + prefers-reduced-motion fallbacks; LocalBusiness schema), read 2026-09-26. https://github.com/arsalan507/website-architect ; Onyx template description (consultation booking in place of a quote form; published price range which premium studios usually hide), read 2026-09-26. https://colorlib.com/wp/template/onyx/ ; aqibaslam/moves mobile-conversion-patterns (native input hygiene table; one field per row; submit 48px+ thumb zone), read 2026-09-26. https://github.com/aqibaslam/moves/blob/HEAD/.claude/skills/mobile-conversion-patterns/SKILL.md
- **Verdict: KEEP.** The conversion closer. The framing rule (consultation vs quote by ticket type) is the compilable insight.

---

## P13. Service-area proof: named places with something true about each

- **Problem solved:** "Serving the Greater Metro Area" is an assertion; naming towns with one true thing per town (permit authority, housing stock, typical job) is evidence. It also answers the visitor's first question ("do you come to my town?") and gives each town page a reason to exist.
- **Visual principle:** Service area as a named list or index, each place with one specific line (not a paragraph). The nav can carry town names as first-class items (Roscoebrown-style: towns before Services) when the area is small. A map variant draws the area from review pins (see P3).
- **Responsive behavior:** Town list becomes a two-column wrap on mobile; nav towns collapse into a "Service area" drawer section. Keep tap targets >=44px.
- **Interaction:** Hover or tap on a town reveals its one true line; towns with dedicated pages link through. Nothing fancier is needed.
- **Accessibility implications:** Real list markup; town pages linked by name. If a town cannot be written about distinctly, the page should not exist (doorway-page rule); the compiler should enforce a minimum distinct-content threshold per town page.
- **Implementation mechanism:** `service_area.places[]` each with `name` + `note` (one true thing); rendered as a definition list or nav group. Conditional: if `note` is empty for a place, render the name only, and do not generate a dedicated page for it.
- **Applicable FYD signals:** fires when `service_area.places >= 2`. Dedicated town pages only when `places >= 3 AND each place has distinct_note = true`. Nav-level towns when `places <= 6` (more than that belongs in a section, not the nav).
- **Source/provenance:** Colorlib 18-plumber study (Roscoebrown: first four nav items are town names; Edwards: "Cities We Serve" nav item where every town is a rankable page), read 2026-09-26. https://colorlib.com/wp/plumbing-websites-design/ ; nurkamol/website-build-kit archetypes (service area: named places with something true about each; doorway-page failure mode if entries cannot be written distinctly), read 2026-09-26. https://github.com/nurkamol/website-build-kit/blob/HEAD/skills/website-build/references/archetypes.md
- **Verdict: KEEP.** Directly matches the Mesa County corridor strategy: named towns with real notes. The distinct-note gate prevents SEO spam.

---

## P14. Count-up proof strip (honest numbers only)

- **Problem solved:** A thin band of numbers (years, projects, rating) gives the page a spine of quantitative credibility between the hero and the services, but only if the numbers are real and checkable.
- **Visual principle:** One dominant real number, or a tight row of three, large tabular figures with small labels. Numerals count up with a steps easing (~900ms) when the strip enters the viewport; labels stagger in after the number lands. One accent color on the digits at most.
- **Responsive behavior:** Three-across becomes a vertical stack or a horizontal scroll-snap row on mobile; keep figures `font-variant-numeric: tabular-nums` so columns align during the count.
- **Interaction:** Count-up fires once per session when the strip enters (IntersectionObserver, `once`). No hover interaction; the numbers are facts, not toys.
- **Accessibility implications:** Final values must be in the DOM as text (screen readers read the real number, not the animation); wrap the animated value in `aria-label` with the final figure or use `prefers-reduced-motion` to render the final value instantly. Never animate a number a screen reader cannot also read statically.
- **Implementation mechanism:** IntersectionObserver adds `.count` class; JS rAF loop eases from 0 to the `data-target` over ~900ms with steps easing; tabular-nums on the figure element. Values come from a `stats[]` array with `value`, `label`, `provenance` fields.
- **Applicable FYD signals:** fires when `stats[]` has >= 1 entry with `verified = true`. If no verified stat exists, the section is omitted entirely (the corpus rule: a faked trust badge reads as the opposite the moment it is noticed). Maximum three stats; the strongest real signal leads.
- **Source/provenuance:** bthaas.github.io AWWWARDS-PLAN (signal strip numerals count up, steps easing ~900ms, labels stagger in), read 2026-09-26. https://github.com/bthaas/bthaas.github.io/blob/HEAD/docs/AWWWARDS-PLAN.md ; peterbamuhigire/design-system-skills trust-credibility-and-social-proof (proof only works when believed; lead with the strongest real signal; honest-number rules), read 2026-09-26. https://github.com/peterbamuhigire/design-system-skills/blob/HEAD/skills/14-conversion-and-web-page-patterns/trust-credibility-and-social-proof/SKILL.md ; blyatiful1/ultraweb social-proof (honest-number rules for stats), read 2026-09-26. https://github.com/blyatiful1/ultraweb/blob/HEAD/skills/social-proof/SKILL.md
- **Verdict: ADAPT.** Keep the mechanism and the honesty gate; drop the ink-bleed/citron theatrics for trades. The verified-only rule is the part that matters.

---

## REJECTED (recorded so the compiler does not reach for them)

- **R1. Preloader / branded 0-100 counter.** Award sites use it as a first branded moment, but on a trades site it delays the phone number and the CTA. Conversion pages must show content in under 2.5s LCP; a preloader is anti-conversion here. REJECT for FYD trades output.
- **R2. Horizontal scroll hijack / pinned horizontal galleries.** Vertical scroll translated to horizontal pan breaks touch expectations on phones and traps keyboard users. The mobile fallback (native swipe) is the only acceptable horizontal gallery. REJECT except native swipe on mobile.
- **R3. Auto-rotating testimonial carousels.** The playbook is explicit: grid or list, strongest first, no auto-rotation. Carousels hide proof and signal template. REJECT; use P3 instead.
- **R4. Four identical icon-cards for services.** The #1 "machine built this" tell. REJECT in favor of P8 rows.
- **R5. Eyebrow label above every headline.** Tiny-uppercase-tracked labels everywhere are the #1 AI tell. REJECT as a default; max one per three sections.

---

## Ranked: 6 patterns most applicable to carpentry (Happy Place) and plumbing/HVAC (Coppersmith)

1. **P7 Project gallery: staggered depth rhythm, captions on hover.** Happy Place's photography is the product; this is the canonical section. Fires on `media_count >= 6 AND project relationships exist`, the exact shape of a carpentry portfolio.
2. **P5 Clip-path image reveal on scroll.** The motion primitive that makes P7 and the editorial sections feel designed. One mechanism, reused everywhere, with the reduced-motion path built in.
3. **P6 Before/after comparison slider.** Carpentry renovations and HVAC/plumbing replacements both produce real before/after pairs. Keyboard-accessible, user-driven, highest-converting visual for transformation work.
4. **P1 Emergency hero: phone number as the headline.** The Coppersmith default when `emergency_service = true`. Argument-first ordering (urgency, place, call) is the structural fix for every "pretty but uncallable" trades site in the study.
5. **P3 Hero proof: named review beside the CTA.** The anti-badge trust pattern both businesses need. For Happy Place it sits next to the consultation CTA; for Coppersmith next to Call now. The no-fabrication fallback keeps it honest when reviews are thin.
6. **P8 Service index as hairline rows.** Both businesses have long, uneven service lists (carpentry: kitchens, cabinetry, restoration; plumbing/HVAC: water heaters, drains, repiping, installs). Rows with prices beat card grids, and the count-based variant rule (grid <= 4, rows >= 5, feature for one headline offering) is directly compilable.

Honorable mentions that ride along everywhere: P10 (nav budget contract), P11 (fluid type engine), P2 (triage field for Coppersmith's emergency/scheduled split), P12 (consultation framing for Happy Place's premium tickets), P13 (named-town service area for the Mesa County corridor), P4 (named owner for the one-van/one-shop case).
