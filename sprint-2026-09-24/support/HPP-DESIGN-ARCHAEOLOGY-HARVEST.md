# HPP Design Archaeology: Harvest Report

**Completed:** 2026-09-26T02:21:46Z (20:21 MDT, Sept 25)  
**Scope:** Read-only survey of the Happy Place Platform source checkout. Pig-side repo copied to `/tmp/hpp-survey` for inspection. Nothing modified, nothing committed.

## 1. Information Architecture (`src/app/`)

Visitor routes (all server-rendered, dynamic where data-driven):
- `/` — Homepage (long-form, 8 sections)
- `/services` + `/services/[slug]` — service index + per-service detail (statically generated from slugs, `generateStaticParams`)
- `/our-work` + `/projects/[slug]` — portfolio index + per-project detail
- `/estimate` — the wizard (primary conversion)
- `/about`, `/reviews`, `/review` (customer review submission form), `/faq`, `/contact`, `/blog`, `/newsletter`, `/privacy`
- Pattern: `page.tsx` (server: metadata + data fetch) + `Client.tsx` sibling for interactive parts. All admin/console/API routes are under `/admin` and `/api` — fully separate from visitor surface.

Homepage section order (the conversion spine): Hero → trust strip → services grid → before/after feature strip → project bento grid → "the family"/owner story → reviews → newsletter → CTA section. Each section is separated by craft motifs (pencil-line divider, gradient rule) rather than whitespace alone — reads as one workshop, not a template stack.

## 2. Component patterns

**Hero** (`app/page.tsx`): full-bleed photo background (darkened to 0.7 brightness + bottom gradient), overlaid: signature kicker line, one large benefit-led H1, one supporting paragraph, two buttons side by side (primary solid pill "Get a Free Estimate" → /estimate; secondary ghost pill "See Our Work" → /our-work), then a compact trust microline under the buttons (star rating + aggregate count + project count + license + service area). Mobile: same stack, shrinks via `sm:` type scales, `min-h-[75svh]` hero keeps full-screen feel. Hero H1 is 4xl→6xl with a display serif — typographic contrast is the brand.

**Service presentation** (`service-card.tsx`): photo-dominant card, `aspect-[4/3]` image top with service icon badge overlaid, name + 2-line description, "Start a quote →" link at card bottom. The **whole card is a link to `/estimate?service=<slug>`** — the card doesn't just inform, it pre-fills the funnel. Empty state is intentional, never blank: no photo → icon badge + "Project photos coming soon" pill. Uses container queries (`@[300px]:p-5`) so cards adapt to grid width, not viewport. Hover: slight lift + image scale.

**Gallery** (`OurWorkClient.tsx`, `before-after-slider.tsx`, `project-lightbox.tsx`): portfolio opens with a draggable before/after slider section ("Featured transformations" — auto-renders only when a project has both before+after media, otherwise the component returns null), then a bento grid of recent projects (first tile spans 2×2 on desktop, single column on mobile), then a full archive with lightbox. Project detail: hero, story sections (problem/solution/outcome narrative fields), gallery grid with lightbox, and closes with `CTASection title="Want results like this?"`. Before/after slider is keyboard-accessible (arrow keys, slider role) with labeled Before/After chips.

**Trust presentation**: three-layer weave, never a banner:
1. *Trust strip* right under hero: 2-col on mobile / 4-col desktop stats (license number, family-owned, service area, N+ projects).
2. *Owner story section* ("The Family"): philosophy first, then people, then portrait photo with craft corner motif — puts faces to the license.
3. *Reviews*: 3-card row on desktop (star rating, quote, name + city), with graceful fallback copy when no reviews exist ("ask us for references in your neighborhood"). JSON-LD `Review`/`AggregateRating` on LocalBusiness for rich snippets.

**Estimate funnel** (`estimate-wizard.tsx`): 7-step wizard — Service (multi-select up to 3 + "Something Else" exclusive + free-text fallback) → Project intent (new/build vs repair — skipped for services where intent is obvious) → Photos (dual upload/camera inputs, optional but visually encouraged) → Project details (branching per-service questions with categories: intent/condition/material/scope; answers can emit estimator flags like `site_visit_required`) → Property (city + county select) → Contact (name/email/phone last — ask for identity only after value is established) → Thank You showing a **preliminary planning price range** from a config-driven range table. State autosaves to localStorage with a draft-recovery modal; step is synced to `?step=` in the URL; progress stepper uses pills (current highlighted, done = checkmark). Confirmation replays "here's what we heard" as an editable summary — builds trust in the intake.

**Mobile nav** (`site-header.tsx`): sticky blurred header, logo left, nav center (desktop only), CTA button right ("Get an Estimate" is a nav item styled as primary button). Below `md`: hamburger → full-width stacked link panel with active-link highlight; menu closes on route change. CTA stays in reach on mobile via the stacked menu's first item being the estimate link.

**Footer** (`site-footer.tsx`): dark 4-column grid → single column on mobile: brand + proof block (license, licensed/insured, years, project count) / Explore links + "Leave a Review" / Contact (address, tracked tel:, tracked mailto:, hours). Bottom band repeats the response-time proof ("estimate response"), then copyright. Phone/email go through `tracked-contact.tsx` wrappers that fire analytics on click.

**CTA placement** (`cta-section.tsx`): one reusable component — H2 title, subtitle, two buttons (primary "Start Your Free Estimate", secondary "See Our Work"), centered on a warm neutral section. Dropped at the bottom of homepage, every service page, every project page, about, contact. Same words, same routes, always after the evidence (projects/reviews), never before.

## 3. Config model (`src/config/` + `src/types/`)

Strongly config-driven. JSON registries with `version` + `generatedAt` manifests: `services.v1.json`, `projects.v1.json`, `reviews.v1.json`, `company.v1.json`, `cities.v1.json`, `faq.v1.json`, `media.v1.json`, `navigation.v1.json`, `seo.ts`, `brand.v1.json`. Typed interfaces in `src/types/registries.ts`, `projects.ts`, `reviews.ts`, `company.ts`.

Domain types (shape, not values):
- **Service**: id, name, slug, description, icon, featured, homepageEligible, order, archived, cardMediaId, capabilities, estimateQuestions (typed: text/textarea/select/number/boolean, options, placeholder, help, category, measurementType, measurementUnit, branching `next` map, flag emissions), skipsIntentStep, defaultProjectIntent.
- **Project**: id, slug, title, status (completed/in-progress/planned/on-hold/archived), service (service-slug ref, not hardcoded), location (city/county/state/zip/neighborhood; internal address explicitly never displayed), media (hero/before/after/gallery media refs), story (problem/solution/outcome narrative), featured/homepageEligible flags, estimate/warranty metadata, reviews.
- **Review**: canonical model fed by adapters (manual/Google/form); status lifecycle (submitted→published/featured); references **projects, not photos**; projects own media.
- **Company**: identity, proof block (projectsCompleted, estimateResponse, yearsInBusiness, insured/bonded, serviceCounties), owners (name/title/focus), social links, hours.

Config-driven: services, projects, reviews, cities/counties, FAQs, navigation labels, service-card media assignments, estimate questions per service, planning price ranges, SEO defaults. Hardcoded: layout/section composition, CTA component and its default copy, wizard step order and step names, responsive breakpoints, brand visual tokens, the `LocalBusiness` schema shape. Rule of thumb observed: **content and lists live in config; page rhythm and funnel flow live in code.** Notably, the media layer uses a "public media gate" — components never get raw media paths, only pre-validated media objects — which is why the generated page reads as a DB browser: it exposes plumbing instead of following this pattern.

## 4. Conversion hierarchy

Single primary conversion: **"Get a Free Estimate" → /estimate wizard.** It appears as: header CTA button, hero primary button, every ServiceCard (whole-card link with `?service=` prefill), bottom CTASection on every major page, CTA closing every project page ("Want results like this?"). It's never spammy because (a) the label shifts with context (hero: "Get a Free Estimate"; cards: "Start a quote →"; project page: "Want results like this?"), (b) secondary CTAs always offer the non-commit path ("See Our Work" rides alongside every primary), and (c) it only appears after evidence sections, never before. Secondary conversions: phone/email links (tracked), newsletter signup placed 2/3 down the homepage (after visitors know the business), "Leave a Review" in footer only. Phone number is rendered human-readable with `tel:` E.164 underneath — matches the locked three-surfaces rule.

## 5. SEO/metadata patterns

`app/layout.tsx`: `metadataBase`, title template `%s · {siteName}`, site-wide description/keywords, OpenGraph + Twitter cards (hero image resolved server-side as og:image), canonical URL, `LocalBusiness` JSON-LD (name, logo, image, telephone, email, PostalAddress, areaServed, priceRange). Per-page: `generateMetadata` overrides title/description/canonical; service pages use service name+description; review pages inject Review/AggregateRating JSON-LD. OG images are resolved media, not static placeholders.

## REUSABLE PATTERNS vs HPP-SPECIFIC FACTS

**Reusable patterns:**
- Config registries (services/projects/reviews/cities/company) with typed domain models and `featured/homepageEligible/archived/order` flags
- Whole service-card links into estimate wizard with `?service=<slug>` prefill
- Branching estimate wizard: service select → intent → optional photos → per-service questions with flag emission → property → contact last → confirmation with planning range
- Draft autosave + recovery modal; step synced to URL `?step=`
- Before/after slider auto-rendering only when both media exist; keyboard accessible
- Project bento grid: lead tile 2×2 on desktop, single column mobile
- Three-layer trust weave: stat strip under hero → owner story w/ portrait → reviews with graceful no-review fallback
- Reusable CTASection closing every major page, primary/secondary button pairing
- Sticky header: nav center, CTA right, hamburger below md, menu closes on navigation
- Dark footer: proof block / links / contact with tracked tel:/mailto: / response-time band
- `LocalBusiness` + Review/AggregateRating JSON-LD; og:image from hero media; title template pattern
- Project story fields (problem/solution/outcome) feeding narrative sections; review model referencing projects not photos
- Intentional empty states ("Project photos coming soon") instead of hiding
- Preliminary price range on wizard confirmation from config table

**HPP-specific facts (categories only, values excluded):** business name and tagline; owner names and roles; license number; city/county/state service area list and ZIP codes; phone number and email address; project titles, locations, and completion dates; service names and descriptions; review bodies, reviewer names, and ratings; photo assets and gallery contents; before/after image pairs; price range figures; estimate response-time claim; project count and years-in-business claims; brand color tokens, signature font usage, craft motifs (pencil line, cedar corners, blueprint grid); social profile URLs.

## Top 5 highest-leverage patterns for the FYD family compiler

1. **Whole-card service entry into the funnel** — every service card is a single link to `/estimate?service=<slug>`, pre-filling the wizard. Highest-conversion-per-pixel pattern on the site: collapses browse→convert into one tap, generic across trades.
2. **Branching estimate wizard with config-driven per-service questions** — wizard steps are code (stable flow), each service owns its questions (typed, branching `next` map, flags like `site_visit_required`, skippable intent step). Contact-details-last ordering, autosave/recovery, confirmation replays "here's what we heard" plus a planning range. This is the core conversion object FYD should generate per trade.
3. **Three-layer trust weave** — stat strip under the hero, owner-story-with-portrait mid-page, reviews with graceful no-review fallback. Distributes credibility along the scroll; the no-review fallback means the pattern compiles even for businesses with zero reviews.
4. **Config registries with display flags + typed domain models** — `featured`/`homepageEligible`/`archived`/`order` flags; review model referencing projects; media by reference through a gate. This is what makes the site feel like a business, not a harness: the compiler should emit business content into registries and render only validated presentation, never raw plumbing.
5. **One CTA component, closed at the evidence end of every page** — `CTASection` with primary/secondary pairing ("Start Your Free Estimate" / "See Our Work"), placed only after projects/reviews have done the persuading, context-shifting labels ("Want results like this?" on project pages). A family compiler can generate this mechanically and it guarantees consistent conversion hierarchy.

## Caveats

- No live visual verification was performed (source archaeology, read-only).
- The `Review` adapter assumes review sources exist.
- HPP's motion/atmosphere layers (Lenis, particles) are brand dressing, not harvest targets.
- Still to diff read-only: newer HPP checkout (`/mnt/c/Users/nolan/CascadeProjects/happy-place-platform`, SHA 768ffb648a44207e7d16b373e192b0fa615714a1) vs primary checkout before final family decisions.
- TRADESMAN components/bindings/tokens/media/tests (`/home/nolan/build-template1/src/fyd/tradesman/`) still to inspect read-only before convergence.
