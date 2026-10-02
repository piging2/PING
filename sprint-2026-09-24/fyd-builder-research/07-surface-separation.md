# 07 — Surface Separation: Public vs Owner vs Trust vs Dev

The current page smashes three products together. Four surfaces, hard boundaries:

## 1. PUBLIC SITE (customer website)

Beautiful business presentation: services, projects/media, people, location, contact, high-value CTAs, subtle FYD
intelligence. Contains: Navigation, Hero, TrustBar, ServiceGrid, FeaturedService, ProjectGallery, BusinessStory,
ServiceArea, ContactCTA, Footer, AskFYD entry (one quiet affordance).

MUST NOT normally contain: Site record, Website statement, raw object IDs, proposal digests, capability verdicts,
demo-owner warnings, binding diagnostics, reconciliation status, acceptance sequence numbers, repeated Why This
controls, developer terminology, object pills, floating object circles, margin rails, "Generated site demo" banners,
"Procedural clone proof" badges.

Ask FYD on the public site feels like the business's intelligent concierge (natural answers, subtle source
affordance, explicit "I can't verify that" when evidence is missing) — NOT "query our evidence database".

## 2. OWNER MODE (Customize with FYD)

Entry: "Customize with FYD — What would you like to change?" with examples ("Make emergency services more
prominent", "Use a darker look", "Feature deck projects", "Hide my street address", "Put the phone number in
the header"). FYD proposes, owner previews, owner approves; advanced controls behind Customize -> Advanced
(per-component edit contracts from the registry: variants + token choices).

Internally still: intent -> proposal -> capability -> approval -> transition -> projection. Externally: "Here's
what I'll change" [Preview] [Apply]. DO NOT REMOVE SAFETY BECAUSE THE UX IS SIMPLER.

Owner mode also owns: source corrections, visibility decisions, regeneration (section-granular), proposals,
approval history. Never on the public page.

## 3. INSPECT / TRUST MODE (on demand)

Why this?, sources, evidence, claim classification, history — ON DEMAND, not repeated under every sentence.
One subtle affordance per claim cluster (the ObjectView page is the working model: About with WhyThis lineage,
Source vs owner corrections, quiet provenance disclosure). A claim the evidence cannot support renders as
"I can't verify that" rather than silent confidence.

## 4. DEVELOPER / LAB MODE

Digests, binding verification, capability evaluation, raw evidence, object IDs, event IDs, debugging, test
surfaces. KEEP IT OUT OF CUSTOMER WEBSITES. Gated behind an explicit lab/dev entry, never default-on.

## Boundary rules

- Demo-owner mode (NEXT_PUBLIC_FYD_DEMO_OWNER_MODE) must never leak owner/dev chrome onto the public render.
- A component is PUBLIC only if it would survive on the business owner's own live site.
- Anything keyed to an event ID, sequence number, or digest lives in LAB, never PUBLIC.
- Trust affordances degrade gracefully: no evidence -> quiet absence, never a badge that says "no evidence".
