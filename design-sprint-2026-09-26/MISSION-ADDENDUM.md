# MISSION ADDENDUM — Nolan's 24-hour website-quality convergence spec (2026-09-26 ~19:00 MDT, verbatim where quoted)

Nolan: "The page you pasted exposes the root problem pretty clearly: FYD is projecting its internal proof harness as though it were a customer website. This is no longer mainly a CSS problem."

## The defect (his words)

"The generated page is leaking 'Generated site demo,' 'Procedural clone proof,' 'Site record,' repeated 'Why this?', observation metadata, raw object routes, duplicated E.164 phone numbers, acceptance-sequence language, the entire customization/debug interface, capability evaluations, proposal digests, unresolved directives, and demo-auth internals. Meanwhile the actual business story — craftsmanship, projects, services, owner, trust, estimate/contact — is buried."

## Objective

ONE CLICK + BUSINESS GRAPH + MEDIA + OWNER INTENT must be capable of producing a website a reasonable business owner would actually prefer to a decent hand-built small-business site. Happy Place = primary adversarial benchmark. Coppersmith = generalization proof. PING = high-design/product-site stress test. NO THIRD CUSTOMER SITE.

## Root-cause method

ORIGINAL HPP beside CURRENT FYD HPP at 320/375/390/768/1280/1440. Screenshots + DOM inspection. Determine exactly what was lost during proceduralization across: visual hierarchy, information density, hero impact, photography prominence, typography scale/contrast, whitespace rhythm, section pacing, card composition, color distribution, trust signals, owner humanity, CTA hierarchy, service presentation, project proof, mobile composition, navigation, footer, motion, perceived craftsmanship, amount of internal/debug material exposed. Do not say "feels worse." Explain which transformation destroyed which quality. Trace BAD PIXELS <- renderer/component <- SiteSpec/composition <- presentation binding <- graph/media availability <- acquisition/evidence. Find the FIRST broken abstraction.

## Public projection removal list (verbatim)

Remove from ordinary public projection: `Generated site demo`, `Procedural clone proof`, `Site record`, raw acceptance sequences, raw object IDs, raw proposal digests, unresolved directive debugging, capability evaluation, seeded/unverified actor internals, repeated observation metadata, numbered empty evidence lists, repeated `Why this?`, duplicate phone representations, object-rail debug UI, raw customization machinery. Preserve all underlying truth. Change the projection, not the evidence.

## Harvesting

Read-only design-research swarms, continuously, across a matrix: premium SaaS/product, home services, construction/carpentry, architecture/interiors, agencies, editorial, hospitality, local service businesses, portfolios, ecommerce, AI products.
- Inspiration: Awwwards, SiteInspire, Land-book, One Page Love, Webflow showcases, Framer showcases.
- Open-source archaeology: GitHub, shadcn/ui ecosystem, Magic UI-style, Motion Primitives, Aceternity-style, Spectrum UI, high-quality React/Tailwind starters.
- Product refs: Hex, Linear, Stripe, Vercel — diversify heavily.
Concrete pools: https://webflow.com/made-in-webflow/design%20systems, https://github.com/arihantcodes/spectrum-ui, https://www.shadcn.io/template, https://www.chromatic.com/playwright.
Extract grammars: hero, type scale, spacing rhythm, media ratio, nav behavior, section transition, service-card, project-gallery, testimonial, owner/story, CTA, footer, motion.
For GitHub donors: pin SHA, inspect license, identify exact mechanism, compare to existing FYD implementation, reuse/adapt only where appropriate. DO NOT IMPORT AN ENTIRE FRAMEWORK BECAUSE THREE COMPONENTS LOOK NICE.
Synthesize MANY donors into ONE coherent FYD design grammar. No Frankenstein.

## Visual grammar, not templates

Small vocabulary of excellent primitives (hero/service/media-project/story/proof-trust/location-contact/CTA compositions). Planner selects from graph semantics + media availability + owner intent + business character. DATA ALTERS COMPOSITION, not merely text in the same boxes.

## Media as first-class design input

Planner must know media_count, media_role, aspect_ratio, focal subject, logo vs photograph, relationship to object. Prefer real authorized imagery; PING uses supplied pig/network hero + piging85 where authorized. Absent media -> INTENTIONAL SPACE, never garbage rectangles.

## HPP must recover its humanity

Restore project photography, craftsmanship, local character, owner/business personality, clear service hierarchy, visual proof, obvious contact/estimate path. User thinks "great carpenter," not "interesting object graph."

## Why This becomes quiet

Progressive disclosure: clean claim -> subtle source/trust affordance -> source/observed date/evidence basis -> full lineage for developers. Trustworthy, not bureaucratic.

## Owner experience

`Customize with FYD` -> "Move emergency plumbing higher." / "Make this less formal." / "Use this project photo first." / "Hide drywall." / "Use this as my logo." / "Make the hero darker." FYD understands, previews, explains consequential changes, owner approves, regenerates, verifies. Owner never operates the nouns (intent/proposal/digest/capability/transition/evidence).

## Visual feedback loop

Unit tests prove bindings/truth/determinism; they cannot prove THIS WEBSITE LOOKS GOOD. Automated screenshots at fixed viewports for canonical sites every meaningful iteration: render HPP + Coppersmith (+ PING where relevant), screenshot, compare, inspect regression, retain/revert. Use existing browser/E2E machinery first; Playwright for driving; visual-regression diffing over rendered DOM/styles/assets. Chromatic only if existing machinery is insufficient. Capability first, vendor second.

## Vision agents as falsifiers

Ask: "What are the three strongest visual reasons the generated HPP is worse than original HPP?" "Which screenshot regions demonstrate each?" "Which upstream abstraction owns each defect?" "What smallest generic change fixes it?" One writer per semantic unit.

## Loop

OBSERVE -> COMPARE -> HYPOTHESIZE -> HARVEST -> SELECT -> IMPLEMENT -> RENDER -> FALSIFY -> KEEP OR REVERT. No attachment to a patch because it took two hours.

## Hard gates stand

No invented claims/reviews/awards/statistics/years/customer counts/credentials. Evidence binding, owner visibility, URL sanitization, tenant boundaries, deterministic SiteSpec, accessibility, mobile correctness, no customer-specific renderer branches. DATA NOT PRESENT > FICTION. Performance: measure LCP/CLS/responsiveness/image sizing/font loading/contrast/keyboard/reduced motion.

## One-click acceptance

Fresh generation of HPP and Coppersmith from current graph/media/owner intent. No hand-editing JSX. No `if happy-place`. If manual polish is needed, THE BUILDER FAILED.

## HARD CONSTRAINT (Nolan)

No more adding features to the public HPP page until the public/debug projection separation is fixed. It is already information-complete; another component makes it worse.

## Visual authority (Nolan)

No automated "design score" as authority. Screenshot agents find defects aggressively; deterministic checks cover measurable properties; but original-HPP-vs-generated-HPP side-by-side judgment is the final visual falsifier. The missing capability is the relentless render -> actually look -> upstream cause -> generic fix -> render again loop.

## Checkpoints (from mission start ~19:00 MDT)

- T+2 (21:00): root-cause comparison complete; exact reasons original beats generated; research matrix established; first hypotheses ranked.
- T+6 (01:00): public/debug separation substantially complete; visual grammar v1 operating; HPP regenerated; first screenshot comparison.
- T+12 (07:00): media-aware composition working; HPP and Coppersmith visibly diverge by graph; owner UX simplified; mobile/desktop regression loop running.
- T+18 (13:00): multiple harvest->implement->falsify iterations; kill weak mechanisms; keep only generalizing improvements.
- T+24 (19:00 Sun): fresh one-click generation of both, browser-tested, screenshots, no per-customer code, no debug leakage, evidence gates green, owner customization demonstrated. Report remaining reasons either site is worse than its strongest reference. DO NOT DECLARE VICTORY IF IT STILL LOOKS MEDIOCRE.

## 16-lane swarm

1 Original HPP archaeology. 2 External visual harvesting. 3 GitHub/open-source harvesting. 4 Composition/planner falsifier. 5 Media intelligence. 6 Typography/spacing. 7 Motion. 8 Public/debug separation. 9 Owner UX. 10 HPP visual falsifier. 11 Coppersmith generalization falsifier. 12 Mobile/accessibility. 13 Performance. 14 Screenshot/visual regression. 15 Security/evidence. 16 One-click clean-checkout proof. MANY FALSIFIERS. ONE WRITER PER SEMANTIC UNIT.

## Harvesting law

LOOK AT EVERYTHING. COPY NOTHING WHOLESALE. LEARN FROM MANY. SYNTHESIZE ONE FYD LANGUAGE. OPEN SOURCE STILL REQUIRES LICENSE REVIEW. PIN DONOR SHAS. DON'T IMPORT FRAMEWORKS WHEN A 30-LINE PATTERN IS THE ACTUAL VALUE. DON'T LET RESEARCH BECOME PROCRASTINATION. Every research lane returns: PATTERN / SOURCE / LICENSE / PROBLEM IT SOLVES / FYD CURRENT GAP / ADOPT-ADAPT-REJECT / GENERIC RULE. Rejection is useful work.

## North star

Not an AI that writes website code. A system that understands enough about a business to compose an excellent digital representation automatically. Don't solve ugliness by abandoning the graph. MAKE THE GRAPH CAPABLE OF PRODUCING BEAUTY. The website is one projection; tomorrow: Ask FYD, business profile, search representation, social presence, proposal/estimate experience, customer portal, agent context.
