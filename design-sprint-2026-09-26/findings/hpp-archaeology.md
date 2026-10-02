# HPP Archaeology: Original vs FYD, Dimension by Dimension

Researcher: HPP-ARCHAEOLOGY. Date: 2026-09-26.
Sources: original repo `trishnikitha-art/happy-place-platform` (website/ on main, read via GitHub raw + blob pages), live original at https://happy-place-platform.vercel.app/, FYD render at http://100.79.154.43:3100/sites/happy-place (fetched 2026-09-26, 149,917 bytes), FYD renderer source at /home/nolan/projects/ping branch fyd/sprint-integration-2026-09-24 (`src/fyd/components/renderer.tsx`, `hero-section.tsx`).

Rule followed throughout: no vibes. Every claim cites a measurement, a class name, or a structural difference from source.

## The one-line verdict

The original is a photo-led editorial page on warm paper: every section is anchored by a mounted photograph, typography is set inside or beside the photography, and the machinery (provenance, config, editing) is completely invisible. FYD renders the same business as a text document with a photo strip, and renders its own engineering harness (provenance drill-downs, owner console, demo chrome) as page content. That is the whole gap, and everything below is its itemization.

---

## 1. Typography scale (families, sizes, weights)

ORIGINAL:
- Display: "Playfair Display", Georgia, serif. Body: Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif. Yes, the body face is a serif. Signature/script: "Playball", cursive, used for the wordmark eyebrow and closers.
- Tokens: `--leading-display: 1.15`, `--leading-body: 1.6`, `--tracking-display: -0.02em`, `--tracking-body: 0.01em`.
- H1 (hero): `text-4xl sm:text-5xl lg:text-6xl` = 36/48/60px, font-bold, leading 1.15, tracking -0.02em.
- Section H2: `text-4xl sm:text-5xl` = 36/48px, font-bold, leading 1.15, tracking -0.02em.
- Section description: `text-lg sm:text-xl` = 18/20px, leading 1.6.
- Eyebrow: `text-sm` 14px, font-semibold, uppercase, tracking 0.12em.
- Card H3: 18px scaling to 20/24px via container queries.
- Card body: 14/16px, `clamp-2`.
- Mobile: h1 clamps to `clamp(2rem, 5vw, 2.5rem)` (32-40px), h2 to `clamp(1.5rem, 4vw, 1.75rem)` below 768px.

FYD:
- Display: Playfair Display (correctly picked up, `font-family:Playfair Display, Georgia, serif` inline on h2). Body: Geist (geometric sans) + Geist Mono. The body serif is lost; the page reads as a tech document, not an editorial one.
- Hero H1: `text-4xl sm:text-6xl` = 36/60px, font-bold, no explicit leading or tracking set on the h1 (inherits body 1.65-ish defaults; the EDITORIAL headingTracking -0.015em is applied to section h2s, not the hero h1).
- Section H2: `text-2xl sm:text-3xl` = 24/30px, font-semibold (not bold), tracking -0.015em, color #232033.
- Section copy: `text-base` 16px, `mt-2`.
- Card H3: `text-lg` 18px semibold, system sans (inherits Geist, not Playfair).
- Card body: `text-sm` 14px.

THE GAP: FYD's section headings are 24/30px semibold where the original's are 36/48px bold, a full two Tailwind steps smaller, which collapses the page's hierarchy. FYD's body is a cold geometric sans where the original's is a book serif. Fix: section h2 to 36/48px bold Playfair with -0.02em tracking and 1.15 leading; card titles to Playfair 18-24px; body stack to a serif (Georgia or a licensed equivalent) at 18px/1.6 for descriptions; hero h1 to carry explicit leading 1.15 and tracking -0.02em.

## 2. Line lengths

ORIGINAL:
- `.measure`: 65ch. `.measure-narrow`: 60ch. Hero sub: `max-w-xl` (36rem). Section description block: `max-w-2xl` (42rem). Hero H1 column: `max-w-3xl` (48rem). Review quote: unconstrained inside card but `clamp-2`.

FYD:
- Hero copy: `max-w-2xl`. Section copy: `max-w-2xl`. Hero H1: no line-length constraint at all (sits in the full `max-w-5xl` container), so at desktop it can run ~90+ characters on one line.

THE GAP: the original constrains every text block to a reading measure (65ch utility exists and hero copy is capped at 36rem); FYD's hero H1 has no measure and its container is narrower overall, producing long, unshaped headline lines. Fix: cap hero H1 at `max-w-3xl`, hero copy at `max-w-xl`, adopt a 60-65ch measure utility for prose.

## 3. Spacing rhythm

ORIGINAL:
- `Section` component: major = `py-24 sm:py-32` (96/128px), minor = `py-16 sm:py-20` (64/80px). Homepage sections all use major. Between some sections: `PencilLine` with `py-8`, and a `craft-rule` separator block with `py-4 sm:py-6`.
- Hero content: `py-12 sm:py-16 lg:py-20` inside a `min-h-[75svh]` container, content vertically centered.
- SectionHeading internal: eyebrow, then `mt-4` to title, `mt-5` to description. Cards grid: `mt-8 sm:mt-10`, `gap-5 sm:gap-6`.
- Card padding: `p-4` scaling to `p-5`/`p-6` via container queries.

FYD:
- EDITORIAL character: `sectionRhythmPx: 56` (56px top and bottom, inline style). Children wrapper: `mt-6`. Copy: `mt-2`. Card: `p-5` (20px). Card grid: `gap-4`.
- No separator system between sections at all.

THE GAP: original sections breathe at 96/128px vertical padding, FYD at 56px, so FYD reads cramped and the sections blur together. There is no inter-section separator in FYD. Fix: raise section rhythm to 96/128px for major sections, add a quiet separator element (hairline rule with a single accent pin, per the original's `.craft-rule`) between major sections.

## 4. Content density

ORIGINAL:
- Hero packs six elements in one viewport: script eyebrow, 60px headline, 2-line sub, two CTAs, a trust row (stars, projects, CCB, counties), and a script closer. Nothing is sparse; nothing is cramped.
- Services: 6 photo cards in a 3-col grid, each card = image + icon chip + title + 2-line description + "Start a quote" row. No empty chrome.
- Stats band: 4 stats, no section heading, one row.

FYD:
- Hero: badge + h1 + copy + 3 buttons + object doorway. Comparable count, but the buttons are internal tools ("Ask FYD") and the doorway is a second H1-equivalent element.
- Services: 5 text-only cards (no images), each = title + 2-line description + "Website statement" pill + "Why this?" drill-down. The provenance UI roughly doubles each card's visual weight with non-content.
- About section renders the business description twice ("Site record" label + the same copy again as body text).

THE GAP: FYD spends its density budget on machinery labels instead of content; the original spends it on proof (photos, stats, trust markers). Fix: delete the per-card "Website statement" pill and "Why this?" details from the visitor render (move to a non-rendered evidence layer), dedupe the About copy, and fill the freed space with photos.

## 5. Hero proportions and composition

ORIGINAL:
- Full-bleed photograph as the section background (`absolute inset-0`, `object-cover`, `brightness(0.7)`), with a scrim gradient `from-black/40 via-black/20 to-black/60`. Container `min-h-[75svh] sm:min-h-[82svh] lg:min-h-[88svh]`, text vertically centered in a `max-w-3xl` column. All text sits ON the photograph. Followed by a 8px gradient strip (`h-2 bg-gradient-to-r from-deep via-primary to-deep/60`) that stitches the hero into the page.
- Composition order: script eyebrow ("Happy Place Carpentry" with shimmer) -> H1 -> sub -> CTA pair -> trust row -> script closer ("Tell us what you're planning.").

FYD:
- The photo is a separate banner block: `relative h-64 w-full overflow-hidden sm:h-80` (256px mobile / 320px desktop), rendered ABOVE the text block. Text sits on a flat dark-ink slab (`theme.ink` or an ink/accent gradient wash when no photo). Content: `px-4 py-16 sm:py-24`, `max-w-5xl`.
- Composition order: ClaimBadge -> H1 -> copy -> phone/website/Ask-FYD buttons -> ObjectDoorway. No eyebrow, no trust row, no closer.

THE GAP: the original's hero is a photograph you read text inside of; FYD's is a 320px thumbnail strip floating above a text slab, which reads as "article with a header image" rather than a hero. This single structural choice accounts for a large share of the visual downgrade. Fix: make the hero photo `absolute inset-0 object-cover` behind the text, min-h 75svh, add a black 40/20/60 scrim, vertically center the text column, and add the 8px gradient stitch strip below the hero.

## 6. Image proportions and treatment

ORIGINAL:
- `.photo-mounted`: 1px warm-ivory stroke (`0 0 0 1px rgba(250,251,252,0.75)`), inset top highlight, tiny inner bevel, 12px radius (`--radius-card: 0.75rem`), layered warm shadows (`0 22px 46px -28px rgba(53,36,35,0.5)`), plus a 3%-opacity tonal overlay. Hover: lift -4px with deepened shadow, 300ms `cubic-bezier(0.22,1,0.36,1)`.
- Aspect ratios: service cards `aspect-[4/3]`, owner portrait `aspect-[4/3]`, bento grid `auto-rows-[200px]` with the featured tile spanning 2x2.
- Every image carries 8px of breathing room logic (`.photo-breathe`) and subtle scale-on-hover (1.02-1.05).

FYD:
- Images: `border-radius:8px`, no stroke, no shadow, no bevel, no overlay. Gallery images `aspect-ratio:4/3`, `object-fit:cover`. Hero photo block: no treatment at all, hard edges against the ink slab.
- Service cards contain no images whatsoever (text-only), despite the character declaring `mediaTreatment: "contained"` and the theme carrying media.

THE GAP: the original's photos look mounted and physical (stroke + bevel + warm shadow reads as "framed print"); FYD's look pasted (flat 8px boxes). Fix: adopt a mounted-photo treatment (1px light stroke, 12px radius, inset highlight, soft warm shadow, -4px hover lift) and require a 4:3 photo in every service card.

## 7. Navigation behavior and structure

ORIGINAL:
- Non-sticky header (no `sticky` class in site-header.tsx), `h-20` (80px), `max-w-7xl`. Left: logo image + two-line wordmark (Playfair 20px "Happy Place" with shimmer, 10px uppercase 0.22em "Carpentry"). Center: 13px medium nav links (Home, Services, Our Work, About, Reviews) with active = `text-primary`. Right: ThemeToggle + honey "Get an Estimate" button. Mobile: hamburger under `md`, dropdown panel with 44px+ rows.
- The nav sells the business's pages and one conversion action.

FYD:
- A demo-chrome header: eyebrow "FYD Social", H1 "Generated site demo", pill "Procedural clone proof". Below it a nav of `<button>`s labeled Home/About/Services/Explore that switch FYD views, not business pages. There is no business wordmark, no logo, no estimate CTA, no phone in the header.

THE GAP: FYD's header navigates the demo harness, not the business; and it burns the page's only H1 on "Generated site demo", leaving the business name as a second H1 further down (two H1s, both wrong). Fix: the visitor header must be the business header (wordmark, business page links, one primary CTA, phone optional); the demo chrome (view switcher, "Generated site demo") must not render in the visitor projection at all.

## 8. Service presentation

ORIGINAL:
- Section eyebrow "What we do" with a ToolMark icon, title "A few ways we can help", description "Pick a service to start a free estimate, we'll guide you through the rest."
- 6 services, 3-col grid. Each card: 4:3 photo with icon chip (40px rounded-xl, `bg-deep/80`, honey icon) top-left, Playfair title 18-24px, 2-line description, "Start a quote ->" row. Whole card is one link to `/estimate?service=<slug>`. Light register always (`bg-surface`).
- Services taxonomy: Decks, Fences, Pergolas, Remodeling, Repairs, Built-ins (from the services registry).

FYD:
- H2 "Services", no eyebrow, no description. 5 text-only cards in 1/2/3-col grid: title (sans 18px), 2-line description, "Website statement" pill, "Why this?" provenance drill-down. No photos, no icons, no per-service action.
- Taxonomy is wrong: Repairs, Fencing, Painting, Drywall, Restoration (ingestion artifacts; "Painting" and "Drywall" are not the business's positioned services).

THE GAP: photo-led cards with a per-card conversion action vs text-only cards with provenance labels. Fix: photo + icon + Playfair title + 2-line description + one action row per card; fix the service taxonomy at the ingestion layer (this is a data bug with visual consequences: the page advertises the wrong services).

## 9. Card geometry

ORIGINAL:
- `CraftCard`: 12px radius, `bg-surface` (#E6DFD3 warm), `overflow-hidden`, hover `-translate-y-1` + `shadow-xl`, 200ms transitions. Photo block and text block are one continuous card (image fills the top, no gap). Review cards: `p-5 sm:p-6`.

FYD:
- `.fyd-card`: 8px radius, `#FFFFFF` background, 1px `border-border-soft`, `box-shadow: none` (EDITORIAL `cardElevation: "flat"`), `p-5`. On desktop, cards with media become 240px-media + text grid; without media they are plain stacked boxes.

THE GAP: 8px flat white boxes with hairline borders read as admin UI; 12px warm cards with real shadows read as designed objects. Fix: 12px radius, warm surface background, layered soft shadow, -4px hover lift.

## 10. Border/radius system

ORIGINAL:
- Radius scale: 6px (sm), 8px (md), 12px (lg/card). CTAs and chips are `rounded-full`. Borders are rare; separation comes from shadow and tonal steps, not outlines. Where borders appear they are warm (`border-border-soft` #CDC4B5).
- Dividers are bespoke, not borders: `.craft-rule` (hairline double rule + rotated honey diamond pin), `.organic-divider` (asymmetric gradient), `PencilLine`.

FYD:
- Radius: 8px cards, `rounded-full` pills, small `rounded` (4px) buttons. Borders everywhere: every card, every provenance box, every owner-console panel is a bordered box, mostly cool gray (`border-zinc-200`, `border-border-soft`).

THE GAP: FYD outlines everything and separates with boxes; the original separates with tonal steps and one-off craft dividers. Fix: remove card borders in favor of shadow + warm surface; introduce a single quiet divider element between sections.

## 11. Gallery composition

ORIGINAL (homepage "Recent Work"):
- Bento grid: `grid-cols-1 sm:2 lg:4`, `auto-rows-[200px]`, first tile `sm:col-span-2 sm:row-span-2` (2x2 feature). Each tile: photo fill, `group-hover:scale-105` 500ms, bottom gradient `from-black/70`, county chip (`bg-honey/90`, white 12px semibold), white Playfair-ish title 18/20px, 2-line outcome text. "See all projects" link below.

FYD ("Gallery"):
- Uniform grid `grid-cols-2 sm:grid-cols-3`, `gap-3`, every tile identical 4:3. Each tile carries a "Why this?" drill-down with source URL, rights-basis paragraph, and timestamps. No titles, no locations, no featured tile, no hierarchy.

THE GAP: bento with a 2x2 feature and captioned tiles vs a uniform evidence locker. Fix: bento layout (first tile 2x2), per-tile caption (title + location chip), delete the per-tile provenance drill-down from the visitor render.

## 12. CTA hierarchy

ORIGINAL:
- One primary action everywhere: "Get a Free Estimate" (honey pill, `cta-signature` with warm shadow, hover -1px lift). Hero pairs it with one ghost secondary ("See Our Work"). Final CTA section repeats the pair at large size ("Start Your Free Estimate" / "See Our Work"). Header carries the same action. The phone number appears in the trust row and footer, never as the primary hero action.

FYD:
- Hero: phone contact button + "Visit website" (accent fill) + "Ask FYD" (ghost). "Start the conversation" section: "Visit website" + "Ask FYD" again. Contact section: raw phone/email with provenance labels. There are three contact-adjacent sections (Contact, Find us, Start the conversation) and no estimate action at all. The single most-clicked element class on the original (the honey estimate pill) has no counterpart.

THE GAP: one repeated primary conversion vs three redundant contact sections and zero conversion path. Fix: define one primary CTA per business (estimate/quote/contact), render it as the filled pill in hero + header + final CTA; collapse Contact/Find us/Start-the-conversation into a single contact block; remove "Ask FYD" from the visitor surface.

## 13. Mobile transformations

ORIGINAL:
- Type steps down explicitly: h1 `clamp(2rem, 5vw, 2.5rem)`, h2 `clamp(1.5rem, 4vw, 1.75rem)`, h3 `clamp(1.25rem, 3vw, 1.4rem)`.
- Touch: all links/buttons `min-height: 44px; min-width: 44px`; CTA signature buttons 48px with `12px 24px` padding.
- Layout: stats 4-col -> 2-col, services 3 -> 1, bento 4 -> 1 (feature span only on `sm+`), family 2-col -> 1-col, trust row collapses (counties reduce to first county, CCB line shortens), hamburger nav under `md`.

FYD:
- Standard Tailwind responsive: hero h1 36->60px at `sm`, photo strip 256->320px, grids 1->2->3, section padding fixed 56px both. No explicit touch-target minimums found in the rendered CSS. The owner-console panels and provenance drill-downs render full-width on mobile, dominating the small viewport.

THE GAP: the original designs the mobile page (type clamps, 44px targets, collapsing trust row); FYD just reflows it, and its heaviest elements (provenance panels, owner console) are worst exactly on mobile. Fix: add type clamps and 44px minimum targets; hide or relocate all provenance/owner UI below the visitor content on mobile (or rather, out of the visitor projection entirely).

## 14. Section pacing and order

ORIGINAL order:
1. Hero (full-bleed photo, 75-88svh)
2. Stats band (4 stats, no heading, one row, `happy-light` bg)
3. Services ("A few ways we can help", 3-col photo cards)
4. Featured projects ("Recent Work", bento)
5. Family ("A family business built on doing things the right way", prose + portrait)
6. Reviews ("What people say once the work's done", 3 cards)
7. Newsletter ("Stay Ahead of Home Maintenance", max-w-2xl centered)
8. Final CTA ("Tell us what you're planning.")
9. Footer (dark, 4-col)

FYD order:
1. Demo chrome header + view-switcher nav
2. Hero (photo strip + text slab)
3. About (duplicated copy)
4. Services (text cards)
5. Where we work (single location chip + provenance)
6. Gallery (uniform grid + provenance)
7. Contact (raw phone/email + provenance)
8. Find us (website link)
9. Start the conversation (website + Ask FYD buttons)
10. Ask FYD (internal tool as a section)
11. Customize this site (owner console)
12. DEMO OWNER MODE panel
13. Footer disclaimer ("Generated by FYD Social... never verified fact.")

THE GAP: the original follows a persuasion arc (promise -> proof -> people -> social proof -> capture -> convert); FYD follows a database-dump arc (entity -> attributes -> provenance -> tools -> owner console), with three redundant contact sections and the internal tools rendered as content. Fix: adopt the persuasion order (hero, proof band, services, work, people, reviews, newsletter, final CTA, footer) as the default section composer; evict Ask FYD, Customize, and Demo Owner Mode from the visitor projection.

## 15. Background transitions between sections

ORIGINAL:
- A descending warm staircase: hero (photo) -> 8px gradient stitch strip -> stats (`#F5F0E6` happy-light) -> services (`#F6F4F0` with blueprint grid at 4% + vertical gradient) -> featured (`#F5F2ED`, adds radial white glow top + honey glow bottom) -> family (`#F3EFE8`) -> reviews (`#F2EFE8`) -> newsletter (`#F1EDE6`) -> CTA (`#EFECE5`) -> footer (dark `#352423`-family). Each step is 1-3% darker than the last. Transitions: `section-diagonal-top` (clip-path), `section-curved-bottom`, `craft-rule`, `PencilLine`, plus 2-8% opacity atmosphere layers (PNW fog, radial gradients).
- No two adjacent sections share the same background.

FYD:
- Hero dark ink slab, then every section on the same flat background (surface alternation exists in the theme but the served page shows effectively uniform sections with 56px padding and no dividers, no atmosphere, no gradients).

THE GAP: the original's page has a visible tonal rhythm that paces the scroll; FYD's is one continuous flat field, which is why it reads as a document. Fix: implement a tonal staircase (each section 2-4% darker/lighter than the last, warm-biased), plus one quiet divider element and one low-opacity atmospheric layer per major section.

## 16. Animation/motion

ORIGINAL:
- `ScrollReveal` on every major block (IntersectionObserver, staggered `delay={i * 100}` on cards).
- Hero: 37s slow parallax drift on the photo (`heroDrift`: scale 1.06->1.12, translateY -2.5%).
- Ambient: `shimmer-slow` 53s and `happy-gold-sweep` 71s on the brand signature (idle most of the cycle, visible 5-10% of it).
- Micro: photo `scale(1.03)` on hover, card `-translate-y-1` + shadow deepen 200-300ms with `cubic-bezier(0.22,1,0.36,1)`, CTA hover -1px.
- `prefers-reduced-motion` fully respected; Lenis owns scroll (native smooth scroll disabled to avoid double ownership).

FYD:
- `fyd-hero-settle`: 560ms `translateY(14px)` on hero mount. `data-motion="enter"` stagger on cards/figures. No scroll-triggered reveals on sections (sections deliberately carry no entrance animation), no parallax, no ambient motion, no hover physics beyond defaults.

THE GAP: the original moves like a calm physical object (slow drift, breathing photos, staggered entrances); FYD does one 560ms settle and stops. Fix: add IntersectionObserver scroll reveals with 100ms stagger, a 30-40s ultra-slow hero drift, and the shared `cubic-bezier(0.22,1,0.36,1)` hover physics on cards and photos.

## 17. Visual emphasis techniques

ORIGINAL:
- The Playball script is the emphasis instrument: brand eyebrow in hero, "Tell us what you're planning." closer, footer wordmark. Honey (#d99a4e) is rationed to 5-8% of pixels: CTA pills, icon chips, county chips, divider pin, footer accents.
- Display numerals: stats band sets numbers in Playfair 20-30px bold.
- Craft details at 3-6% opacity: carpenter-square corners, engraved brackets, blueprint marks, cedar-grain texture. The CSS comments say it explicitly: "If you notice them immediately, they are too strong."
- Emphasis is never a bigger box; it is a warmer pixel.

FYD:
- Emphasis = pills and bordered boxes: "Website statement" pill, "Observed"/"Inferred" state chips, "Procedural clone proof" pill. The accent color is spent on borders and labels for internal states, not on conversion or brand moments. No script face, no display numerals, no craft details.

THE GAP: the original rations its warm accent to conversion and brand; FYD spends its accent on labeling its own machinery. Fix: reserve the accent color for CTAs, active states, and one brand mark per viewport; delete the machinery pills from the visitor render.

## 18. Information hierarchy

ORIGINAL:
- Exactly one H1 (the hero promise). Section H2s are the only 36/48px elements on the page. Eyebrows (14px uppercase) label sections; descriptions (18/20px) elaborate once. Cards: title -> 2-line description -> action. The eye path is: face (photo) -> promise (H1) -> proof (stats) -> options (services) -> evidence (work) -> people -> others' words (reviews) -> ask (CTA).

FYD:
- Two H1s ("Generated site demo", then the business name). Section H2s (24/30px) compete with card H3s (18px) and with pill labels ("Website statement", "Why this?") that are visually as strong as the content they annotate. The About section states the business description twice. Contact information appears in four places (hero phone button, Contact, Find us, Start the conversation) with provenance footnotes attached. The eye path is: demo chrome -> photo strip -> business name -> repeated description -> cards fighting their own labels -> owner console.

THE GAP: the original has one idea per level and the levels are visually distinct; FYD has machinery labels at the same visual weight as content and repeats facts instead of progressing. Fix: one H1; H2s two steps larger than card titles; no visible element that describes the page's own construction; each fact appears once, in its best section.

---

## The original's single strongest compositional idea

Photography carries the page; typography lives inside the photography. The hero is not "a headline with a background image", it is a photograph with a headline set inside it (scrimmed, script eyebrow, trust row overlaid). The services are not "cards with thumbnails", they are photographs with titles set under them. The featured work is a photo bento with captions set on the photos. The family section is prose beside a mounted portrait. Remove every photo and the page has no composition left, which is exactly the test FYD fails: FYD's page with photos removed looks nearly identical, because its photos are decorative strips rather than structural.

Buildable form: make the hero image, the service card image, and the featured-work image load-bearing layout elements (backgrounds, aspect-locked blocks, spanning tiles), not optional adornments above text.

## FYD's single biggest structural deficit

The visitor projection renders the engineering harness. Concretely, on the served page: a header that says "Generated site demo" / "Procedural clone proof", per-card "Website statement" pills, per-section/per-photo "Why this?" provenance drill-downs with source URLs and rights-basis paragraphs, an "Ask FYD about..." section, a "Customize this site" owner console with Up/Down/Hide buttons and proposal inputs, a "DEMO OWNER MODE - not real authentication" panel, and a footer that says "Generated by FYD Social... All claims on this page are website statements, never verified fact." The original's equivalent machinery (media gates, assignment authorities, visual slots) exists but is fully invisible. No typography or spacing fix matters while the harness is on the page; it is the first thing any visitor sees and it says "demo".

Buildable form: split the render into a visitor projection (business content only, zero FYD-internal labels, panels, or chrome) and keep every provenance/owner/debug surface behind an explicit owner mode that never ships in the visitor HTML.

## What FYD should explicitly NOT copy (brand-specific identity)

- The name, wordmark, and Playball script treatment ("Happy Place Carpentry", the shimmer signature). The script-face-as-brand-voice is their identity, not a pattern.
- The woodworking craft motifs: cedar corners, carpenter squares, pencil lines, blueprint marks, tool-mark eyebrow icons, tape-measure nav. These are trade-specific semiotics for a carpenter.
- The exact palette (#d99a4e cedar gold, #44483D ripe olive, #F8F5F0 warm paper). Copy the token architecture (primary/ink/accent/background/surface roles, the 5-8% accent rationing rule), not the hues.
- The PNW atmosphere copy and imagery direction ("Pacific Northwest", "Mid-Willamette Valley", forest-canopy lighting).
- The CCB license shimmer and any business-specific facts (125+ projects, CCB# 254240, owner names).
- The gold shimmer idle animation on the brand name. Ambient shimmer as a technique is fine; putting it on the wordmark is their signature.

---

## Top 5 buildable gaps, ranked by visual impact

1. Evict the harness from the visitor projection. Delete from visitor HTML: the "FYD Social / Generated site demo / Procedural clone proof" header, all "Website statement" pills, all "Why this?" provenance drill-downs, the "Ask FYD" section, the "Customize this site" console, the "DEMO OWNER MODE" panel, and the "Generated by FYD Social" footer disclaimer. This alone removes roughly a third of the visible elements and all of the "demo" signaling. Owner tooling lives behind an explicit mode flag, never in the served visitor HTML.
2. Rebuild the hero as a full-bleed photograph with overlaid text. Photo `absolute inset-0 object-cover`, section `min-h-[75svh]`, black scrim gradient (40/20/60), vertically centered `max-w-3xl` text column, script or eyebrow line, H1 at 36/48/60px Playfair with 1.15 leading and -0.02em tracking, one filled primary CTA + one ghost secondary, trust row (rating, project count, license, service area). Replace the current 256/320px photo strip above a text slab.
3. Restore the type scale and the serif body. Section H2s to 36/48px bold Playfair (-0.02em, 1.15); card titles to Playfair 18-24px; descriptions to 18px with 1.6 leading on a serif body stack; section padding to 96/128px; container to 1280px; one H1 per page. This is what makes the page read "designed" instead of "document".
4. Make photography load-bearing. Every service card gets a 4:3 mounted photo (12px radius, 1px light stroke, inset highlight, soft warm shadow, -4px hover lift); featured work becomes a bento with a 2x2 lead tile and on-photo captions; the gallery drops the uniform grid for captioned, hierarchied tiles. No text-only cards on a business page.
5. Establish one CTA hierarchy and a persuasion section order. One primary conversion action (estimate/quote), rendered as the filled pill in hero, header, and final CTA; collapse Contact/Find us/Start-the-conversation into one contact block; order sections hero -> proof band -> services -> work -> people -> reviews -> newsletter -> final CTA -> footer; add the warm tonal staircase (each section 2-4% darker) and one quiet divider between major sections.

## Do-not-copy list (for builders)

- Do not copy the business name, script wordmark, shimmer brand treatment, or any business facts (project counts, license numbers, owner names, service area).
- Do not copy the carpentry craft motifs (cedar corners, pencil lines, blueprint grids as decoration, tool icons, tape-measure patterns).
- Do not copy the exact color values; do copy the token roles and the accent-rationing discipline (one warm action color, 5-8% of pixels, spent on conversion and brand only).
- Do not copy the copy. The hero promise, section titles, and card microcopy are the business's voice.
- Do copy: the photo-led compositional grammar, the type scale ratios, the mounted-photo treatment, the tonal staircase, the persuasion section order, the single-CTA discipline, the invisible-machinery principle.

## Evidence notes and caveats

- FYD side read from served HTML fetched 2026-09-26 ~19:0x MDT plus renderer.tsx/hero-section.tsx on the fyd/sprint-integration-2026-09-24 branch. The served page may lag the branch; class names matched between the two (fyd-section, fyd-card, data-layout-character="EDITORIAL"), so the comparison is sound.
- Original side read from the public repo main branch and the live Vercel deployment. The repo is unusually well documented (globals.css carries the CEO's design directives inline), so token values are quoted from source, not inferred.
- Content bugs found on the FYD side that are data-layer, not design-layer, but have visual consequences: business name rendered as "Happy Place Carpentry LLC" (original has no LLC), service taxonomy wrong (Painting/Drywall/Restoration vs Decks/Fences/Pergolas/Remodeling/Built-ins), phone rendered raw as "+15412865190" (original formats 541-286-5190), About copy duplicated. Flagged for the ingestion/composer lanes.
- Mobile behavior compared from source (original's explicit <768px rules vs FYD's responsive classes), not from rendered screenshots; the sprint's screenshot pass should verify.
