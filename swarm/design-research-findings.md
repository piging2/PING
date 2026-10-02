# LANE R-DESIGN: Best-in-Class Trades Website Design Research
## Findings Document for the TRADESMAN Template Lane

- **Date:** 2026-09-24 (~15:45 MDT)
- **Lane:** R-DESIGN (research only). No template code touched, no customer-specific recommendations, no cloning.
- **Mission:** Research best-in-class local/trades/service-business websites (carpentry, plumbing, HVAC, electrical, roofing, landscaping, remodeling) and convert every finding into GENERIC, reusable rules: token roles (not literal values), section grammar, section eligibility rules, composition rules.
- **Quality bar:** live Happy Place Carpentry site at https://happy-place-platform.vercel.app/ (HPP). Nothing ships to Nolan unless as good as or better than this.
- **Method:** web research across trades-specific design roundups (2025-2026), award coverage (Web Excellence Awards 2026), conversion-optimization playbooks for contractors, typography/color systems literature, and named business examples observed in those sources. No live-browser interaction was available, so all evidence is from page text and published analyses, not rendered screenshots. Where a finding depends on rendered behavior (e.g., sticky bars, sliders), it is marked VISUAL-NEEDS-VERIFY.

## How to read this document

Every rule is numbered by dimension: H (hierarchy), T (typography), M (media), C (CTA), TR (trust), MB (mobile), R (rhythm). Each rule states the generic rule, 2-3 observed examples, and why it works. Token roles are described by ROLE, never by literal hex or font name, except inside observed examples where the source published them. "Eligibility" notes say when a section/component should exist at all, so the template can branch on business evidence rather than rendering everything always.

## Top 10 highest-leverage rules (pressure map for TRADESMAN)

1. **C1 Hero dual-CTA split (call for urgent, quote for planned):** pressures the CTA component and hero grammar. Homeowners arrive in two emotional states and one CTA underserves both.
2. **H1 Above-the-fold power trio (what / why-us / how-to-start in under 5 seconds):** pressures hero composition and copy grammar. Panic visitors decide in about 4 seconds.
3. **MB1 Sticky tap-to-call on mobile (never more than one thumb-tap from a call):** pressures the mobile shell. Sources report 20-30% mobile conversion lifts from sticky call persistence.
4. **TR1 Trust strip on first paint (star rating + license number + insured/bonded):** pressures the hero trust-badge system. The license number is the single clearest trust signal for regulated trades.
5. **M1 Real crew photography over stock (authenticity converts):** pressures the media component and evidence pipeline. One published A/B test: real crew hero lifted quote clicks ~45%.
6. **M3 Before/after drag slider embedded on the homepage:** pressures the showcase component. Roofing analyses report ~30% better conversion for interactive sliders vs static galleries.
7. **TR5 Reviews placed at decision points, not buried on a reviews page:** pressures section grammar and review component placement. One A/B test: reviews near CTAs lifted conversion 37%.
8. **H2 Canonical homepage section order (hero, trust, services, process, work, reviews, why-us, area, FAQ, final CTA):** pressures the composition engine. Order is a conversion path, not decoration.
9. **C7 Response-time expectation attached to every contact path:** pressures CTA copy grammar. "Emergency calls answered 24/7" converts the call into a safe action.
10. **MB4 Mobile-first (not mobile-responsive): thumb targets, no hidden phone, forms without zoom:** pressures the mobile shell and form component. 60%+ of local search is mobile, often from a driveway or job site.

---

# 1. HIERARCHY

## H1: The above-the-fold power trio
**Rule:** The first viewport must answer three questions in under five seconds: what do you do (plain headline), why are you the safest choice (one quantified proof), and how do I start (one primary CTA). Do not open with the business name or a "welcome" line.

**Observed examples:**
- Silver Water Plumbing (Sydney): plain keyword headline ("Local Plumber Sydney") plus three checkmarked fear-answering promises ("Fast, Same Day Service / Honest Upfront Pricing / Experienced Team") plus a top banner with the review rating.
- Built to Last Roofing (Texas): hero pairs "Available 24/7 in Texas" with a 5-field free-inspection form and stats like "1,700+ Roofs Built". Published claim: 750% increase in qualified leads after the redesign.
- HPP: emotional headline ("Your favorite part of coming home should be the home itself.") followed immediately by a working subhead ("We repair, restore, and improve homes across the Mid-Willamette Valley") and a proof strip (125+ projects, license number, service towns).

**Why it works:** Emergency visitors spend about four seconds deciding to stay. The trio maps exactly to their decision sequence: am I in the right place, can I trust them, what do I do next.

**Eligibility:** Always required. The trio is non-optional on every trades homepage.

## H2: Canonical homepage section order
**Rule:** Arrange homepage sections in this generic order: (1) hero with dual CTA and trust badges, (2) trust strip (licenses, ratings, guarantees), (3) services (card grid), (4) process ("how it works", 3-5 steps), (5) recent work (before/after or project grid), (6) reviews, (7) why-choose-us (owner story or differentiators), (8) service area, (9) FAQ, (10) final CTA block, (11) footer with full contact and license. Decide the order the visitor should learn things, then build the page in that order.

**Observed examples:**
- The bold-slate electrician template flow published on YouTube: hero, about/experience, services, locations+trust, reviews (+leave-a-review), gallery, final CTA+FAQ.
- Infinity Roofing: numbered homepage that walks visitors through content in sequence rather than hoping they scroll.
- The heymegabyte local-service profile: HeroSplit, TrustBadges, ServiceCards, ProcessSteps, with service-area polygon on the contact page.

**Why it works:** The order mirrors the buyer journey: identify problem, verify legitimacy, match service, understand process, see proof, hear neighbors, meet the humans, confirm coverage, get objections answered, act. Breaking the order forces visitors to re-orient.

**Eligibility:** Sections 3-9 are eligible only when evidence exists (see individual rules). Never render an empty section shell to fill the order.

## H3: Hero copy grammar (eyebrow, headline, subhead)
**Rule:** Hero copy follows a fixed grammar: eyebrow = availability token + place token (e.g., "24/7 emergency, Anchorage" pattern); headline = 10 words max, opens with an action verb or customer benefit, never with "Welcome to" or the business name; subhead = 1-2 sentences, 30 words max, carrying license number, years, and a concrete service promise.

**Observed examples:**
- The projectsites.dev local-service prompt contract: headline "Plumbing done right. The first time.", subhead "Licensed AK plumber since 2003. Same-day service. Weekends included. Free estimates within 25 miles."
- HPP subhead does the working ("We repair, restore, and improve homes across the Mid-Willamette Valley") so the headline can be emotional.
- CinchLocal's roofing guidance: "write your hero line about the visitor's problem instead of your company's history."

**Why it works:** Scanners read headlines and bullets only. A benefit-first headline passes the 5-second test; the subhead carries the verifiable facts that close the trust gap.

**Composition rule:** The headline slot and subhead slot have different jobs (emotion vs verification). A template that lets the headline be emotional must require the subhead to carry license + place + promise.

## H4: Service discovery = dedicated pages plus card grid
**Rule:** Present services twice: a homepage card grid (icon, one-line customer-POV description, link) for scanning, and a dedicated page per service for depth. Each service page uses fixed grammar: H1 + value line, scope checklist ("what's included"), numbered process, evidence (project cards filtered to that service), credentials relevant to that service, FAQ, scoped enquiry CTA ("Enquire about {Service}").

**Observed examples:**
- G&M Electric (Chicago): separate service categories for residential, commercial, industrial with clear descriptions.
- Selectrical Services: services clearly listed on the homepage with a prominent phone number; blue scheme reads trustworthy.
- The vedanjay-power page spec: fixed section order across all service pages (overview, scope, how-it-works, deliverables, evidence, credentials, FAQ, related services, scoped CTA).

**Why it works:** Most contractor leads come from searches for a specific need ("water heater repair"), not from the homepage. A generic services bullet list serves neither SEO nor conversion. Scoped CTAs keep momentum from the page the visitor cared about.

**Eligibility:** A service gets a dedicated page only if the business can supply at least one project photo, one scope checklist, and one FAQ for it. Otherwise it stays a homepage card.

## H5: Emergency vs planned split
**Rule:** Separate the urgent path from the planned path in both copy and CTAs. Emergency visitors need "Call now" language and a response guarantee; planners need "request a quote" language and a process. Never make a panicked caller read the project-planning funnel.

**Observed examples:**
- The bleyl.dev electrician checklist: dedicated "EMERGENCY + PLANNED SERVICE SPLIT" gate ("Do panicked callers and project planners each find the right path").
- AZ Mobile Diesel Repair component funnel: Hero with emergency text CTA, then a separate UnifiedEmergencyHub section, then quote-form paths.
- Tempesta Media's CTA guidance: separate messaging for emergency work ("Call Now for Emergency Service") from estimate CTAs.

**Why it works:** A broken AC in July and a planned remodel are different purchases. One CTA optimizes for speed, the other for deliberation. Collapsing them into one button serves neither.

**Eligibility:** The emergency path exists only if the business genuinely offers emergency/after-hours service. Never invent 24/7 availability.

## H6: Service area is content, not a footnote
**Rule:** State the service area in the hero header, expand it in a dedicated section (map or county list with expandable city panels), and tag gallery items with neighborhood/city. Prefer neighborhood names over broad metro labels.

**Observed examples:**
- GadgetConstruction: interactive "31 Cities" ServiceArea section where clickable counties expand city panels.
- Whipple Roofing: map displaying every location where jobs were completed.
- The projectsites.dev profile: service-area polygon on the contact page; hero eyebrow carries the place token.

**Why it works:** "Serving Denver, CO" is a claim; "completed in [Neighborhood]" is evidence. Location tags on project photos prove local presence and feed local SEO. Neighborhood-specific testimonials were a core lever in the Lightning Electric case study (conversion 1% to 4.3%).

**Eligibility:** The area section is required. City panels expand only where the business has completed work or can name a serviceable radius; never fabricate coverage.

---

# 2. TYPOGRAPHY

## T1: Two roles, two families max
**Rule:** Define typographic ROLES, then assign families: Role A = display/headings (voice, character), Role B = body/UI (reading, function). Maximum two families. A third family is allowed only for code/mono-style technical labels with a written reason. Never pair two families from the same classification.

**Observed examples:**
- ComfortCraft Mechanical (top-rated HVAC example in the Unitmask 2026 roundup): headings in a bold geometric sans, body in a neutral sans, buttons in a semibold sans.
- Hook Agency's contractor roundup: Mosaik Design uses infographic-style illustration type for trust content while keeping body reading type clean.
- The type-craft and better-typography skill guides converge: "two near-identical sans-serifs look like a mistake; a serif headline with a sans body looks like a deliberate split."

**Why it works:** Role assignment makes hierarchy readable at a glance. Two similar faces read as an error; two contrasting faces read as a system.

## T2: Weight contrast carries hierarchy before size does
**Rule:** The display role uses a heavy weight (600-800); the body role stays at 400-500. Do not compensate for a weak display face by making it larger; fix the weight contrast first. Body text never goes below 400 weight.

**Observed examples:**
- The HVAC high-performers lean on bold geometric sans headings (Poppins Bold class) against regular body (Inter class) to create the hierarchy.
- Slab-serif-plus-sans pairings (Roboto Slab + Roboto class) give craft warmth in headlines while body stays neutral.

**Why it works:** On a phone held in a driveway, weight contrast survives glare and small sizes better than size contrast alone. Thin display weights disappear on low-DPI screens.

## T3: Mathematical type scale, display shrinks its line height
**Rule:** Build the scale from a fixed ratio (1.25 major third for compact trades pages, 1.333 perfect fourth for balanced pages) starting at the body size. Pair larger sizes with tighter line heights; pair body with a generous line height (1.5-1.7). Balance headings to avoid orphan words; keep body measure between 45 and 75 characters.

**Observed examples:**
- The rovecode and type-craft guides give the canonical scale (base 16px, ratio-driven steps) and the rendering rules (balance on headings, pretty on paragraphs).
- Contractor pages that set hero display large with tight leading read as confident; the same copy set loose reads as a blog post.

**Why it works:** Ratio scales make every heading level feel related. Tight display leading plus generous body leading creates the visual "signal vs reading" split that lets scanners and readers coexist.

## T4: Hero display is big, short, and balanced
**Rule:** Hero headline is the largest type on the page, 2-4 lines max, balanced line breaks, tight leading. It never runs to paragraph length and never carries the fine print; credentials live in the subhead or trust strip.

**Observed examples:**
- HPP's hero headline is one emotional sentence; the license and town list sit below in smaller chips.
- Built to Last Roofing's hero headline is an availability claim, not a paragraph; details live in the adjacent form and stat line.

**Why it works:** The display headline is a billboard, not a brochure. Fine print in the billboard kills both.

## T5: Button type is a label role, not a body role
**Rule:** Buttons use the UI/label role: semibold weight, slightly tighter tracking, sentence or title case consistent across the site, 2-4 words, imperative verb. Button text never wraps to two lines on mobile.

**Observed examples:**
- Tempesta Media's CTA verb list: "Schedule HVAC Service", "Request a Roofing Estimate", "Call for Emergency Plumbing Help", "Book Your Free Design Consultation". All are imperative, service-specific, and short.
- The projectsites.dev copy contract: "CTA primary: 2-4 words, imperative verb."

**Why it works:** Button type is read as an instruction. Verb-first, service-specific labels convert better than generic "Submit" or "Click Here" because they confirm what happens next.

## T6: Eyebrow labels are a distinct micro-role
**Rule:** Use a small, uppercase, letterspaced label (the "eyebrow") above section headings to carry the category token: availability, place, or section topic. This is part of the UI role family, not a third font.

**Observed examples:**
- The local-service hero profile: eyebrow "24/7 emergency, Anchorage" above the headline.
- HPP-style sections carry implied eyebrows ("Featured projects", "Reviews") as section wayfinding.

**Why it works:** Eyebrows let the headline stay emotional while the facts ride above it. They also give screen readers and scanners a consistent landmark.

## T7: Tabular figures for numbers that get compared
**Rule:** Any stat the visitor compares (review counts, project counts, years, prices, phone numbers) uses tabular figures so digits align. Phone numbers are always tel: links, never plain text.

**Observed examples:**
- Trust strips showing "4.9 / 5, 412 reviews" style ratings rely on aligned numerals to scan cleanly.
- Diesel-repair and roofer examples centralize the phone number in one constant so every tel: link matches the displayed number.

**Why it works:** Misaligned numbers look sloppy and slow comparison. A phone number that is not tappable is a dead end on the device 60%+ of visitors use.

## T8: Reading type is never decorative
**Rule:** Body copy uses a highly legible neutral face at 16px minimum with 1.5+ line height. No display face, script, or condensed face for paragraphs. Quotes and testimonials may use the display face at large size for emphasis, but the attribution line returns to the UI role.

**Observed examples:**
- The Pink Plumber uses bright illustration-heavy branding but keeps service copy readable; personality lives in art, not in body type.
- Luxury Simplified (Charleston remodeler) uses hand-drawn illustration for personality while content type stays clean.

**Why it works:** Personality belongs in imagery and voice. Making the reader work to decode body copy trades charm for bounce rate.

---

# 3. MEDIA

## M1: Real crew photography beats stock, always
**Rule:** Hero and trust-adjacent imagery must show the actual business: real crew, real trucks, real job sites. Stock models and generic tool photos are banned from the hero. A 60-second phone-shot team video on the homepage outperforms a polished stock montage.

**Observed examples:**
- Black Plumbing's Web Excellence Award-winning redesign (Lokal Media House, 2026): built around the company's actual crews and field work. Designer quote: "Authenticity converts. Stock photos and generic copy don't."
- NRG Heating & Air: real employees on video, front and center, talking to camera; the analysis notes it answers "are these people I would want in my home."
- Published A/B test cited in the contractor-homepage playbook: swapping a stock hero for a photo of the actual crew lifted quote clicks by about 45%.

**Why it works:** Trades are high-trust, in-home purchases. A real face converts the abstract business into a person the visitor can imagine at their door. Stock reads as "this could be anyone," which is exactly what a wary homeowner fears.

**Eligibility:** If no real photos exist, the template must render a media-light variant (strong type + color + illustration) rather than filling the hero with stock. This is a hard rule, not a preference.

## M2: Video grammar: one team video, optional project videos
**Rule:** Homepage carries at most one short team/intro video (about 60 seconds, real people, natural light). Project pages may carry short clip embeds. Autoplay is muted with captions; the video never replaces the hero CTA.

**Observed examples:**
- NRG Heating & Air: 60-second team video, shot simply, placed on the homepage.
- Hippo Roofing: owner-featured video gives homeowners a face before they call.
- Fixd Roofing: introductory video plus per-job photo galleries via CompanyCam.

**Why it works:** Video collapses psychological distance faster than any copy. But video that pushes the CTA below the fold or autoplays with sound destroys the conversion it was meant to build.

## M3: Before/after is an interactive slider, not a static grid
**Rule:** Project proof uses a draggable before/after comparison slider embedded on the homepage (not hidden on a gallery page). Each comparison carries: date completed, neighborhood/city tag, and material or scope spec. A short customer quote may pair with the visual to complete the proof package.

**Observed examples:**
- Able Roof: interactive before/after slider; drag-to-reveal increases time on site.
- Hippo Roofing: before/after slider embedded directly on the homepage; "visitors do not need to navigate to a separate gallery page, the proof is immediate."
- Melbourne Quality Roofing: creative before/after slider praised as "'show, don't tell' done to perfection."
- Roofing industry analysis: sites with interactive before/after sliders convert about 30% better than sites with static galleries.

**Why it works:** Dragging the slider makes the visitor participate in the transformation, which is more memorable than looking at two photos. Date and place tags prove recency and locality at the exact moment of maximum attention.

**Eligibility:** The slider exists only with genuine before/after pairs from real jobs. One strong slider beats ten weak ones. Scroll-activated loading keeps it fast (VISUAL-NEEDS-VERIFY for the lazy-load behavior).

## M4: Gallery is filterable by job type and place
**Rule:** The project gallery filters by project type and by location, so a visitor can find "a tile roof in my suburb" rather than scrolling fifty roofs. Grid first; slider or lightbox second. Carousels (auto-rotating slideshows) are banned: published data says about 1% of visitors click slides, and 84% of those clicks land on slide one.

**Observed examples:**
- Team Roofing: "the best project gallery in the industry" because visitors sort completed work by project type and location.
- Talley Landscape Architects: minimalist masonry project gallery with concise project titles and summaries.
- Garden Builders: hero grid where each tile is a project with a simple description; featured gardens as large hover tiles.

**Why it works:** An unfiltered wall of fifty projects is noise. Filtering turns the gallery into a self-serve consultation: the visitor finds their exact situation and sees the outcome.

## M5: Project cards carry specs, not just photos
**Rule:** Each project card or detail view lists: what was done, materials used, approximate scope (square footage, rooms, linear feet where relevant), completion date, and neighborhood. Photos show finished work in architectural context, not tight crops of materials.

**Observed examples:**
- Summit Hardscapes: each project page includes materials used, square footage, and completion timeline; the analysis calls this "trust-building for homeowners planning larger investments."
- Fixd Roofing via CompanyCam: quality photo galleries per completed job including dates, locations, and product specifications.
- Matthews Roofing: drone leak-detection photos showing problems invisible from the ground, positioning technical leadership.

**Why it works:** Specs turn a pretty picture into a credible case study. A homeowner comparing bids uses materials and scope to judge competence; photos alone cannot carry that.

## M6: Drone and context photography for scale trades
**Rule:** For roofing, exterior, and land trades, aerial/context photography is the expected standard: full roofline in architectural context, property-wide shots for landscaping. Ground-level detail shots supplement, never substitute.

**Observed examples:**
- Matthews Roofing: drone photography for commercial scale and leak detection.
- Roofing industry analysis: "drone footage has moved from novelty to expectation"; a professional drone shoot of 5-10 projects costs roughly $800-$1,500 and the assets last for years.
- Huntergreen (landscaping): crisp, vibrant full-property photos; restrained design lets the work carry the page.

**Why it works:** Nobody buys a roof or a landscape from a close-up of a shingle. Context photos let the homeowner picture their own property transformed, which shortens the decision.

**Eligibility:** Only for trades where the work is exterior/large-scale. Interior trades (electrical, plumbing) use job-site and finished-room photography instead.

## M7: Illustration as personality layer, not photo replacement
**Rule:** Custom illustration may carry brand personality (mascots, infographic-style trust explainers, hand-drawn accents), but it sits alongside real photography, never in place of project proof.

**Observed examples:**
- Hippo Roofing: cartoon mascot makes the brand instantly recognizable in a market where every competitor uses the same stock shingle photo.
- The Pink Plumber: bubbly illustration branding connects the grittiness of plumbing with a friendly manner, plus interactive educational content.
- Electric City (Hook Agency): illustrations give quality and friendliness to electrical work, which is hard to photograph appealingly.
- Mosaik Design & Remodeling: infographic-style illustrations act as trust factors; the analysis notes more of them would strengthen the effect.

**Why it works:** When the work itself is hard to photograph (electrical panels, pipes) or competitors all use the same stock, illustration creates differentiation. It fails the moment it replaces evidence of real work.

**Eligibility:** Illustration is eligible as a brand layer for every trade; it is never eligible as the sole proof layer.

## M8: Image performance is a trust signal
**Rule:** Images load progressively (blur-up placeholders or scroll-activated loading), are sized to their display slot, and never shift layout after load. Target the published web-vitals marks: 2.5s largest contentful paint, 200ms interaction-to-next-paint, 0.1 cumulative layout shift.

**Observed examples:**
- The onwardcraft roofing analysis praises scroll-activated image loading that "keeps the site fast while delivering rich visuals."
- The contractor-homepage playbook lists the Core Web Vitals thresholds as pass/fail marks and notes speed shapes perception of the business itself.
- NiceJob's review-widget guidance stresses asynchronous, non-render-blocking loads for the same reason.

**Why it works:** A slow site makes the company feel slow. Visitors map load time onto callback time and job completion time, fairly or not. Layout shift during load reads as broken.

---

# 4. CTA

## C1: Dual CTA in the hero: call for urgent, quote for planned
**Rule:** The hero carries two CTAs side by side: primary = tap-to-call with the phone number in the label; secondary = quote/estimate request. Primary uses the accent action role; secondary is a quieter outline or text treatment. This split is the single highest-leverage CTA decision.

**Observed examples:**
- The local-service hero contract: primary "Call (907) 555-0100" (tel: link), secondary "Request a quote."
- Built to Last Roofing: phone-forward hero plus an in-hero free-inspection form for planners.
- Mister Sparky: large buttons highlighting service areas alongside call paths, with a cheerful tone that keeps both options visible.

**Why it works:** It serves both buyer modes from H5 without forcing a choice of funnel. The call label carrying the number removes one cognitive step for the panicked visitor.

## C2: CTA labels are service-specific imperatives
**Rule:** CTA labels are 2-4 words, start with an imperative verb, and name the service: "Schedule HVAC Service", "Request a Roofing Estimate", "Call for Emergency Plumbing Help", "Book Your Free Design Consultation." Never "Submit", "Click Here", or "Learn More" as the primary label.

**Observed examples:**
- Tempesta Media's contractor CTA verb list (quoted above) is the observed standard across trades.
- The projectsites.dev copy contract enforces the 2-4 word imperative rule as a hard limit.

**Why it works:** The label is the last thing read before the tap. Service-specific verbs confirm what happens next and reduce the fear that the button leads to a sales trap.

## C3: Repeat CTAs at natural decision points
**Rule:** Repeat the CTA after: the hero, the services grid, the project gallery, the reviews section, and the FAQ. Each repetition is contextual ("Request a Roofing Estimate" after roofing proof) rather than a copied button.

**Observed examples:**
- The vedanjay-power service-page spec: enquiry CTA repeats after the Evidence section and again at page end.
- The AZ Mobile Diesel Repair funnel places contact capture after services, emergency hub, and service area.
- Tempesta Media: "Repeat the CTA at natural points on the page: near the hero section, after service details, near reviews, and at the end."

**Why it works:** Conversion intent peaks right after proof, not at arbitrary intervals. A CTA after the gallery catches the visitor at maximum desire; one only at the page bottom loses everyone who decided earlier.

## C4: High-contrast action role, used sparingly
**Rule:** The primary CTA uses the accent action color role at full saturation against its background, with accessible contrast. The accent role appears ONLY on interactive actions (CTAs, key links, active states). If the accent appears on decoration, it stops meaning "tap me."

**Observed examples:**
- Quality Exteriors (roofing): bright green CTA buttons kept visible while scrolling; the analysis credits them as a conversion driver.
- The contractor visual-branding guide: "Rapid Response" archetype uses high-visibility orange/red sparingly on numbers and buttons only.
- Estes Media's CTA guidance: buttons that contrast with the background and are large enough for mobile dramatically improve conversion.

**Why it works:** Contrast creates the visual "this is the thing to press" signal. Scarcity of the accent color preserves that signal across the page.

## C5: Emergency CTA is visually distinct from the quote CTA
**Rule:** When emergency service is offered, the emergency path gets its own visual treatment: a red/urgent banner or button with "Call Now for Emergency Service" language, separate from the standard estimate CTA. It may persist as a slim top banner.

**Observed examples:**
- The nanocraft roofing template analysis: red emergency banner that stays visible while scrolling, with a pulsing "Call for Emergency Service" button.
- Built to Last Roofing: "Available 24/7 in Texas" as the hero's first message, distinct from the inspection-form path.

**Why it works:** Emergencies are time-critical; the visual distinction lets a stressed visitor find the fast path without reading. Red carries urgency culturally; using it only for emergency preserves the signal.

**Eligibility:** Only when the business genuinely offers emergency/after-hours service. VISUAL-NEEDS-VERIFY for the persistent-banner behavior on small screens.

## C6: Quote forms are short: 5 fields max
**Rule:** The estimate/quote form collects at most: name, phone, email, ZIP/city, service needed, and one short project description. No budget, no full street address, no material preferences on first contact. Clear labels, specific error messages.

**Observed examples:**
- Built to Last Roofing's hero form: 5 fields, surrounded by 5-star reviews and stats, credited in a 750% lead lift.
- The contractor-homepage playbook: "the 4-field form rule" and a warning that one extra field cost a large company an estimated $12M/year.
- Tempesta Media: "Avoid asking for a detailed budget, full street address, preferred materials, project photos, and several open-ended questions on the first screen."

**Why it works:** The form's job is to start a conversation, not to complete intake. Every field is a small decision; decisions compound into abandonment. Phone and service-needed are the two fields that actually matter.

## C7: Attach a response-time expectation to every contact path
**Rule:** Next to every CTA and form, state what happens next and how fast: "Emergency calls are answered 24/7" or "A member of our team will contact you within one business day." The phone label may carry the promise ("Call now, we answer live").

**Observed examples:**
- Tempesta Media's playbook lists the response-time expectation as its own conversion element with both example lines.
- The click-to-call guidance: "Say what happens next. A short line like 'Call us, we answer live and can usually book you this week' beats a bare number."

**Why it works:** The biggest friction in contacting a contractor is uncertainty about being ignored. Naming the response converts the tap from a gamble into a plan.

## C8: CTA adjacency to proof
**Rule:** Place at least one CTA immediately after each proof block (gallery, reviews, stats). Proof creates desire; the adjacent CTA captures it before it decays.

**Observed examples:**
- Built to Last Roofing: the 5-field form sits in the hero surrounded by reviews and stats, not on a separate contact page.
- The gadgetconstruction CTABlock: dark CTA section with an inline multi-step form placed after the gallery and testimonials.
- NiceJob's review guidance: reviews belong "after the CTA button (as trust reinforcement)" and near forms.

**Why it works:** Desire has a half-life measured in seconds. A proof block with no adjacent action is a leak; an action with no adjacent proof is a leap of faith.

## C9: Persistent header CTA, never behind the hamburger
**Rule:** The header always shows the phone number (tap-to-call) and the estimate CTA as visible buttons on every page, including mobile. They are never hidden inside the hamburger menu.

**Observed examples:**
- The mobile conversion playbooks converge: sticky phone header, phone visible in the header on every page, "not hidden behind a hamburger menu."
- AZ Mobile Diesel Repair: centralized phone constant rendered in the header component on every page.
- The "4-second trust and action header" pattern: click-to-call number, instant booking CTA, trust seals, and service area all above the fold.

**Why it works:** Navigation menus are for browsing; the phone is for buying. Burying the revenue path inside a menu adds a tap at the exact moment intent is highest. Sources report sticky call persistence lifts mobile conversion 20-30%.

## C10: The final CTA block is a dark, focused close
**Rule:** The page ends with a visually distinct closing block (often the dark role / inverted section): one headline restating the offer, the dual CTA, the phone number large, and the response-time promise. No navigation noise, no new information.

**Observed examples:**
- The gadgetconstruction CTABlock: dark CTA with an inline multi-step form as the page close.
- HPP's close: "Tell us what you're planning" with a warm invitation line and the phone number, after the reviews and newsletter sections.
- The diesel-repair funnel ends: contact form, FAQ, then footer; the form section is the last persuasive element.

**Why it works:** The close is the last impression and the last easy action. Visual distinction (dark/inverted) signals "this is the end; decide now." Restating the offer avoids making the visitor scroll back up to remember it.

---

# 5. TRUST

## TR1: Trust strip on first paint
**Rule:** Directly under or within the hero, render a strip of 3-5 trust badges: star rating with review count, license number, insured/bonded status, and one recognition token (BBB, manufacturer certification, award). Icons are simple (star, shield, award); labels are short.

**Observed examples:**
- Silver Water Plumbing: "Rated 4.9 on over 1800 reviews" banner across the top plus a trust-icon row (Payment Plans, 100% Satisfaction, 1,000+ 5-Star Reviews, Award Winning, 24 Hour Answering).
- Marlowe & Co Plumbing: proof-strip hero with reviews, licensing, and guarantee on first paint; navy-and-gold palette reads established.
- The local-service hero contract: trust badges for "4.9/5 Google, 412 reviews", "Licensed AK #12345", "A+ BBB rating."

**Why it works:** Trust is decided before reading. The strip lets a 4-second visitor absorb legitimacy without scrolling. The license number is the strongest single token for regulated trades (electricians especially).

**Eligibility:** Each badge needs a verifiable fact. Render only badges the business can prove; a template must degrade gracefully to fewer badges, never invent them.

## TR2: License, insurance, and bonding above the footer
**Rule:** License numbers, insurance, and bonding appear in the hero or trust strip, not only in the footer. For state-regulated trades (electrical, plumbing, HVAC, roofing), the license number is the highest-priority trust token.

**Observed examples:**
- HPP: "CCB# 254240, Licensed, Insured" in the hero proof strip and repeated in the footer.
- The bleyl.dev electrician checklist: "Displaying your state license number in the hero converts skeptical homeowners before they even read the copy. It's the one credential they've been told to verify."
- Whipple-adjacent roofing guidance: trust signals such as licensing, warranties, and verified reviews listed as a group near CTAs.

**Why it works:** Homeowners are told by consumer guides to check licenses. Showing the number before they ask removes the verification errand and signals the business expects scrutiny.

## TR3: Reviews as a distributed system, not a page
**Rule:** Reviews appear in four places: (1) rating badge above the fold, (2) a review carousel/section mid-page, (3) individual reviews adjacent to CTAs and forms, (4) a dedicated reviews/testimonials page for depth. Reviews are live (pulled from Google/Facebook), filtered to 4+ stars, and never static screenshots.

**Observed examples:**
- Joe's Roofing: NiceJob integration shows reviews from satisfied customers, "strategically placed throughout the site."
- The roofing A/B test: homepage with a Google reviews widget (4.9 stars, 150 reviews) converted 37% better than the same page without it.
- NiceJob's social-proof guidance: reviews on the homepage, on each service landing page, after CTA buttons, on the about page; never buried only on a testimonials page.
- The wisernotify pattern set: homepage carousel, dedicated "Wall of Love" page, floating review badge.

**Why it works:** "Aesthetic trust" (pretty site) and "decision trust" (neighbors vouching) are different things; 88% of people read reviews before choosing a local business. Live reviews also add fresh, keyword-rich content that helps local SEO. Review text near a form answers the exact hesitation the form creates.

**Eligibility:** The distributed pattern requires a real review feed. If the business has few reviews, the template renders an honest variant (see TR4), never fabricated quotes.

## TR4: Honest review scarcity beats fake abundance
**Rule:** If the review portfolio is thin, say so plainly and offer the alternative: references from past customers, neighborhood names served, or a direct "leave a review" path. Never invent testimonials, never show stock-photo "customers."

**Observed examples:**
- HPP: "We're building our public review portfolio. In the meantime, we're happy to provide references from homeowners throughout the Mid-Willamette Valley." The honesty itself reads as trustworthy.
- NiceJob's widget guidance: filter by star rating and date so only the best, most relevant reviews show; the system assumes real data or nothing.

**Why it works:** Homeowners can smell fake testimonials. An honest "we're new, ask our neighbors" converts the weakness into a proof of integrity, while one fake review destroys all trust permanently.

## TR5: Neighborhood-specific testimonials
**Rule:** Testimonials name the neighborhood or town, not just the customer. Prefer reviews that mention the specific job type and the experience (communication, cleanliness, timing) over generic praise.

**Observed examples:**
- The Lightning Electric case study: adding 15 neighborhood-specific testimonials was a core lever in lifting conversion from under 1% to 4.3% and monthly leads from 12 to 37 within 60 days.
- Before/after best practice: location tags ("Completed in [Neighborhood], [City]") plus a brief customer quote create "a complete proof package."
- The contentworks.ai electrician guide: "specific testimonials that mention neighborhoods you recognize" as the trust test.

**Why it works:** "Great service!" could be anyone, anywhere. "They rewired our 1960s ranch in [Neighborhood] and left the place cleaner than they found it" is a neighbor talking to a neighbor. Specificity is the anti-fake signal.

## TR6: Owner and crew faces with real bios
**Rule:** The why-choose-us section shows real photos of the owner and key crew with 1-2 sentence bios that state what each person cares about in their own words. Titles are plain ("owner", "lead tech"), not inflated.

**Observed examples:**
- HPP: named owner cards; "Taylor cares about the work you'll notice five years from now" and "Lanie keeps every project organized so you always know what's happening." Each bio states a customer benefit.
- Lawngevity Landscapes: "Meet Our Owner" section detailing the owner's background from wildland firefighting to founding the business; analysis calls it trust-building through personal story.
- The bleyl.dev checklist: "Meet Our Master Electricians" with real photos and bios as a trust lever.

**Why it works:** Trades sell in-home access. A face with a name and a stated care converts the business from a logo into people the visitor can picture at their door. First-person care statements ("I care about...") outperform credential lists.

## TR7: Manufacturer and industry certifications early
**Rule:** Certifications that require earning (manufacturer certified installer, BBB A+, Angi Top Pro, trade association membership) appear in the trust strip or near the first CTA, not buried on an about page.

**Observed examples:**
- Infinity Roofing: manufacturer certifications appear early enough to matter.
- Gutter Kirkland (cited in the roofing roundup): licensing, warranties, and 50+ verified reviews grouped as trust signals near CTAs.
- The local-service profile: BBB A+ and Angi Top Pro in the hero trust badges.

**Why it works:** Third-party certifications are trust the business did not grant itself. Early placement lets them do their work at the moment of maximum skepticism.

## TR8: Quantified proof bar
**Rule:** A full-width stats bar carries 3-4 quantified facts: years in business, projects completed, review rating/count, and one trade-specific metric (homes served, roofs built, response time). Numbers are specific, not round claims.

**Observed examples:**
- Quality Exteriors: "200+ Years of Combined Experience" and "100% Customers Recommend Us" called "a humble brag but very effective" for a high-ticket purchase.
- Built to Last Roofing: "1,700+ Roofs Built" beside the hero form.
- The gadgetconstruction StatsSection: full-width stats bar as its own rhythm element.

**Why it works:** Specific numbers are falsifiable, which makes them believable. Round claims ("we're the best") are not. For high-ticket work (roof replacement costs tens of thousands), quantified proof directly addresses the fear of hiring a fly-by-night operator.

## TR9: Process transparency as trust
**Rule:** A numbered "how it works" section (3-5 steps, plain language) sits before the final CTA. Steps name what the customer experiences: contact, estimate, the work, cleanup, warranty. The last step is always the warranty or guarantee.

**Observed examples:**
- The local-service ProcessSteps: Call, Free estimate, Work begins, Warranty ("2-year warranty on labor").
- Lawngevity Landscapes: "Our Process" section displaying transparency in how they operate.
- Joe's Roofing: "outlines their process to ensure customers know what to expect during the roofing project."

**Why it works:** Fear of the unknown is the second-biggest friction after fear of being ripped off. A visible process converts "what will happen to my house" from anxiety into a plan. Ending on warranty leaves the taste of safety.

## TR10: Community and locality proof
**Rule:** Show local roots: towns served, community involvement, local business association badges, years in the area. The business should read as a neighbor, not a franchise.

**Observed examples:**
- The "Local Authority" roofing template pattern: "Proudly Serving [City]" with a coverage map and local business association badges.
- HPP: family-owned framing, named valley towns, valley-specific copy throughout.
- The zero-click contact playbook: "Local Landmarks: mention specific neighborhoods you serve" as a trust element.

**Why it works:** Local service is a credence good; the buyer cannot evaluate quality before purchase, so they evaluate belonging. A business rooted in named places is accountable in a way a generic brand is not.

**Eligibility:** Render only genuine community ties. A template must not invent chamber memberships or sponsorships.

---

# 5. MOBILE

## MB1: Sticky tap-to-call, one thumb-tap from anywhere
**Rule:** On mobile, a tap-to-call control persists on screen during scroll: either a sticky header with the phone button or a slim bottom bar that appears once the hero CTAs leave the viewport. The visitor is never more than one thumb-tap from calling.

**Observed examples:**
- The gadgetconstruction MobileBottomBar: scroll-aware sticky CTA that appears when hero CTAs leave the viewport.
- Multiple conversion playbooks: sticky phone header reported to increase mobile conversion rates by 20-30%; "floating action button at the bottom of the screen... never more than one thumb-tap away from calling you."
- Greenscape Pro: sticky sidebar quote form on desktop becomes tap-to-call on mobile.

**Why it works:** Mobile visitors are often standing in front of the problem. The decision to call happens mid-scroll, mid-gallery, mid-review. If the phone is not under the thumb at that moment, the moment passes.

**Eligibility:** Always required on mobile. VISUAL-NEEDS-VERIFY for exact show/hide scroll behavior.

## MB2: Phone number never hidden, always a tel: link
**Rule:** The phone number is visible in the header on every page, rendered as a real tel: link, in the same spot every time. It also appears in body content on service pages, not only on the contact page. Test on an actual phone, not just a desktop preview.

**Observed examples:**
- The local-CRO playbooks: "Your phone number should be visible in the header on every page, not hidden behind a hamburger menu"; "If someone has to copy your number and paste it into their dialer, you have already lost them."
- Barefoot & Associates (landscaping): phone number and email right at the top of the screen.

**Why it works:** Every extra tap between visitor and call is a drop-off point. Consistency of placement builds muscle memory across pages.

## MB3: Thumb-first sizing and spacing
**Rule:** All tap targets are at least 48x48px. CTAs are full-width or thumb-reachable on small screens. Form fields are large enough to complete without zooming; labels sit above fields, never as disappearing placeholders.

**Observed examples:**
- Google's own 48x48px guidance cited across the mobile playbooks; the "thumb test" (navigate the whole site with one thumb) as the acceptance check.
- The contractor-homepage playbook: mobile-first design prioritizes clear buttons, easy navigation, and forms completable without zooming.

**Why it works:** Mis-taps are the mobile equivalent of a busy signal. A visitor who taps the wrong thing twice leaves.

## MB4: Mobile-first composition, not responsive shrink
**Rule:** Design the mobile layout first: single column, one idea per screen, in-page navigation as a horizontally scrollable chip row, process steps as a vertical timeline, gallery as a swipeable strip. Desktop is the expansion, not the source.

**Observed examples:**
- The vedanjay-power page spec: "Mobile: in-page nav becomes a horizontally scrollable chip row pinned under the header; process steps become a vertical timeline; enquiry CTA repeats after Evidence and at page end."
- The medium contractor analyses: "A 'mobile-responsive' site isn't enough anymore. You need a mobile-optimized experience" for customers "in their cars, in their kitchens, or standing in their driveways."

**Why it works:** Over 60% of local search is mobile, and the context is physical (a leak, a broken unit, a yard). Shrinking a desktop layout preserves desktop priorities; mobile-first preserves the buyer's priorities.

## MB5: Hamburger discipline: 5-6 items max
**Rule:** The mobile menu holds at most 5-6 items: Services, Our Work, Reviews, About, Contact, plus the persistent call/quote buttons outside the menu. Deep navigation lives on the pages, not in the menu.

**Observed examples:**
- The conversion playbooks converge on "no more than 5-6 items" for mobile menus; 15-option hamburgers "overwhelm the user."
- Lawngevity Landscapes' praised navigation: Services, Our Process, Our Team, Portfolio, Careers, Contact; simple and direct.

**Why it works:** The menu is a wayfinding tool, not a sitemap. Every item competes with the call button for attention; fewer items means the call button wins.

## MB6: No intrusive interstitials on mobile
**Rule:** No full-screen popups, no newsletter modals, no app-install banners on mobile. Lead capture happens inline (forms in sections, sticky bars). Google penalizes intrusive mobile interstitials, and they destroy the trust the page built.

**Observed examples:**
- The mobile playbooks: "Google actually penalizes sites that show intrusive pop-ups on mobile"; "A clutter-free mobile site not only looks better but performs better."
- Whipple Roofing's "free one-minute quote" popup is cited as effective on desktop-pattern sites, but the mobile guidance is explicit: keep capture inline on small screens.

**Why it works:** A popup on a phone covers the entire decision context the visitor was reading. It reads as desperation and triggers the back button.

## MB7: Emergency mode on mobile is a distinct surface
**Rule:** If emergency service is offered, mobile shows an unmissable emergency path: the sticky call bar labels itself for emergency ("Call now: 24/7 emergency"), and the emergency banner survives scrolling. The quote form is one tap further, not in the way.

**Observed examples:**
- The nanocraft emergency template: red banner staying visible while scrolling with a pulsing call button; designed for the 2 AM caller.
- The bleyl.dev emergency split applied to mobile: panicked callers get the call path first.

**Why it works:** A 2 AM caller with a burst pipe is not browsing. The mobile surface must offer exactly one thing: the call.

## MB8: Click-to-call tracking as instrumentation
**Rule:** Every tel: link fires a tracked event (one delegated listener for all phone taps). The template treats call taps as the primary conversion metric on mobile, form submits as secondary.

**Observed examples:**
- The gadgetconstruction PhoneClickTracker: one delegated listener producing a phone_click event for every tel: link.
- NiceJob Sites: phone call tracking ("know which pages drive calls") as a built-in feature.

**Why it works:** What gets measured gets optimized. For most trades, the phone is the conversion; a template that cannot attribute calls cannot prove its own value.

---

# 6. RHYTHM

## R1: One idea per section, one section per idea
**Rule:** Each section owns exactly one job (identify, prove, explain, reassure, convert). Sections never mix jobs: the gallery does not carry pricing, the reviews do not carry the process. If a section needs two headlines, it is two sections.

**Observed examples:**
- Infinity Roofing's numbered homepage: each number is one step in the visitor's learning sequence.
- The local-service profile composition: each component (HeroSplit, TrustBadges, ServiceCards, ProcessSteps) has a single responsibility.

**Why it works:** Scanners assign each screen one meaning. Mixed sections force re-reading, and re-reading is the step before leaving.

## R2: Alternating section backgrounds as wayfinding
**Rule:** Alternate section treatments (light, tinted, dark, image) so each section boundary is visible without a headline. The dark/inverted treatment is reserved for the final CTA close and at most one mid-page emphasis block. Never use the dark treatment for body-heavy reading sections.

**Observed examples:**
- The gadgetconstruction CTABlock: dark CTA variant used once as the page close; ProcessSteps has an optional dark variant for the homepage only.
- Summit Hardscapes: dark background with high-contrast project photography, used deliberately for the portfolio's drama.

**Why it works:** Background rhythm gives the page a physical cadence the thumb can feel while scrolling. Overusing dark sections flattens the effect and hurts readability of long copy.

## R3: Breathing room scales with section weight
**Rule:** Vertical spacing between sections is generous and consistent; heavier sections (gallery, stats bar, final CTA) get more room than light ones (trust strip, eyebrows). Related elements sit close; unrelated elements sit far. Whitespace is the primary hierarchy tool before size or color.

**Observed examples:**
- Huntergreen (landscaping): "clean lines and a restrained color palette" where "the simplicity of the design allows the quality of their work to stand out."
- The typography guides: "Let whitespace and weight carry hierarchy before you reach for size."

**Why it works:** Crowded sections read as desperate; spaced sections read as confident. On mobile, generous spacing is also a mis-tap prevention system.

## R4: Stats bar as a full-width palate cleanser
**Rule:** Place a full-width quantified proof bar (TR8) between two heavy content sections, typically after the process or before the reviews. It is scannable in two seconds and resets attention.

**Observed examples:**
- The gadgetconstruction StatsSection: full-width stats bar as its own component in the page flow.
- Built to Last Roofing: stats ("1,700+ Roofs Built") placed adjacent to the hero form as a mid-page proof beat.

**Why it works:** Numbers are the fastest proof format. A stats bar gives the scanner a win without reading, which recharges attention for the next heavy section.

## R5: Proof sandwich: claim, proof, action
**Rule:** Every marketing claim is immediately followed by its proof and then its action: headline claim, then the gallery/review/stat that proves it, then the CTA. Never stack two claims without proof between them.

**Observed examples:**
- The proof-stack pattern: Google review badge, local landmarks, before/after gallery assembled as one unit on the landing page.
- The hero power trio (H1) is the proof sandwich in miniature: claim (headline), proof (trust strip), action (CTA).

**Why it works:** Unproven claims accumulate skepticism; each proof discharges it. The sandwich keeps the skepticism balance near zero all the way down the page.

## R6: FAQ as the objection-clearing penultimate
**Rule:** The FAQ accordion sits just before the final CTA block. Questions are the real objections (pricing, timing, legitimacy, mess, warranty), answered in 2-3 sentences each. The FAQ also feeds structured data for search.

**Observed examples:**
- The vedanjay-power service spec: FAQ of 4-6 questions per service page, also feeding FAQPage schema.
- The gadgetconstruction FAQSection: accordion FAQ with JSON-LD schema placed before the close.
- Whipple Roofing: "a list of questions that customers should ask before hiring a roofing contractor," which reframes objections as the business's own checklist.

**Why it works:** Objections peak right before action. Answering them at the penultimate position clears the runway for the final CTA. Accordion format keeps the section compact for scanners.

## R7: Footer as the trust archive
**Rule:** The footer carries the complete trust record: full contact (phone as tel: link, email, address), license numbers, service-area list, hours, and a compact nav. It is the page's reference desk, not a link farm.

**Observed examples:**
- The gadgetconstruction Footer: 4-column footer with white logo plus a license bar.
- The roofing checklist: "Footer with full contact info, service areas, license number."
- Barefoot & Associates: phone and email at the top AND the expected full record at the bottom.

**Why it works:** A meaningful share of visitors scroll straight to the footer to check legitimacy before reading anything. A thin footer reads as a thin business.

## R8: Speed is part of the rhythm
**Rule:** The page must feel instant: progressive image loading, no layout shift, no render-blocking widgets. Perceived speed is set by the hero paint; everything below the fold can stream in.

**Observed examples:**
- The onwardcraft analysis: scroll-activated image loading keeps rich visuals fast.
- The contractor playbook: 2.5s LCP / 200ms INP / 0.1 CLS as the pass marks; "speed shapes perception" of the business itself.

**Why it works:** Rhythm is temporal as well as spatial. A page that paints fast and never jumps feels competent; a page that stutters feels like a business that will stutter.

---

# 7. TOKEN ROLES (summary for the token system)

These are ROLES, not values. The template's token system should define the roles; each business's brand fills the values.

| Role | Job | Notes from research |
|---|---|---|
| `brand-primary` | Identity, headers, trust surfaces | Cool blues/slates signal reliable service; deep greens/inks/charcoals signal premium remodel; dark neutrals signal rapid response. One primary only. |
| `brand-accent` (action) | CTAs, key links, active states, phone number | Warm high-visibility hues (orange, green, red-class) at full saturation. Appears ONLY on interactive elements. 10-15% of color usage. |
| `urgent` | Emergency banner/button | Red-class, reserved exclusively for genuine emergency paths. |
| `surface` / `surface-tint` / `surface-dark` | Section backgrounds | Light default; tinted for alternation; dark reserved for the final CTA close and one emphasis block max. |
| `ink` / `ink-muted` | Body text / secondary text | Warm gray for type; must hold contrast over photography or the photo gets a scrim. |
| `success` / `proof` | Ratings stars, checkmarks, guarantees | Star/check roles should read instantly; keep them consistent everywhere. |
| `type-display` | Headlines, hero, pull quotes | Heavy weight, tight leading. |
| `type-body` | Paragraphs, lists | 400-500 weight, generous leading, 16px minimum. |
| `type-label` | Buttons, eyebrows, captions, nav | Semibold, tight tracking, uppercase micro-labels for eyebrows. |
| `space` scale | Section rhythm | Generous, consistent; heavier sections get more. |
| `radius` / `shadow` | Cards, buttons, badges | Consistent across cards and CTAs; cards carry the gallery and review content. |

**Color traps to avoid (observed):** two primaries fighting for attention; trendy palettes that date within a year; text over textured photos where contrast collapses; accent color used decoratively (it must always mean "tap me").

---

# 8. SECTION ELIGIBILITY MATRIX (for the composition engine)

| Section | Renders when... | Degrades to... |
|---|---|---|
| Hero power trio | Always | n/a (required) |
| Trust strip | Always; badges = verified facts only | Fewer badges; never invented badges |
| Services grid | 2+ distinct services exist | Single-service businesses get a scope section instead |
| Service detail pages | Per-service: 1+ photo, scope checklist, 1+ FAQ | Homepage card only |
| Process ("how it works") | Business can name 3-5 steps ending in warranty | Omitted; never a generic 3-step filler |
| Before/after slider | 1+ genuine before/after pairs | Static project grid; never stock pairs |
| Project gallery + filters | 6+ project photos | Simple 3-up recent-work row |
| Reviews distributed (TR3) | Live review feed exists | Honest scarcity variant (TR4) |
| Owner/crew bios | Real photos + 1-2 sentence care statements | Omitted; never stock "team" photos |
| Stats bar | 3+ verifiable numbers | Omitted |
| Service area section | Named towns/counties served | Hero place token only |
| FAQ | 4+ real objections answerable in 2-3 sentences | Omitted; never generic filler Q&A |
| Emergency banner/path | Genuine 24/7 or after-hours service | Omitted entirely |
| Final CTA block | Always | n/a (required) |
| Newsletter signup | Business can promise genuinely useful content (tips, seasonal reminders) | Omitted; a dead newsletter signup hurts more than it helps |

---

# 9. OPEN QUESTIONS / VISUAL-NEEDS-VERIFY

These findings rest on published analyses and page text, not rendered screenshots (no live browser available to this lane). Before the template hard-codes them, verify on real renders:

1. Sticky bottom call bar show/hide scroll behavior on iOS Safari and Android Chrome (thresholds, safe-area insets).
2. Before/after slider drag interaction on touch (does the drag fight with page scroll?).
3. Persistent emergency banner height on small screens (does it crowd the hero?).
4. Review widget async load behavior (layout shift when reviews paint late).
5. Masonry vs uniform grid for project galleries on mid-size phones.
6. Dark final-CTA block contrast with the accent action color (does the CTA survive inversion?).
7. Whether the 5-field form fits above the fold on a 360px-wide phone next to its trust elements.
8. Carousel-free hero: does a single static hero image hold attention as well as published claims suggest, or does it need the video variant (M2)?

**Successor:** hand these eight items to the TRADESMAN lane's visual verification pass (real screenshots on the Pig-hosted render path, judged against the HPP bar), not to further research.

---

*End of LANE R-DESIGN findings. Research only; no code, no customer content, no cloning. All business names above are observed examples from published sources, cited as evidence, not as content to reuse.*
