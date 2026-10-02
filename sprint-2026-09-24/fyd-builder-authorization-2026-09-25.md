# FYD Builder — Rebuild Authorization (Nolan, 2026-09-25 ~17:25 MDT)

## Status

PHASE 1 RESEARCH: APPROVED.
SMALLEST REBUILD: APPROVED WITH THE CORRECTIONS BELOW.
BEGIN IMPLEMENTATION. GO.

Nolan's standing note: stay in planning mode a little longer is over — but plan thoroughly because both HPP and Coppersmith demos have epically failed. HPP already exists as a real business; there is no excuse. Think of absolutely everything needed for success.

## The core finding (approved)

THE SUBSTRATE DID NOT FAIL. THE PRESENTATION COMPILER FAILED.

FYD understood businesses better than the rendered product demonstrated. The current generator is effectively a fixed template. That is the thing we replace.

## What we are NOT authorizing

- No new website framework.
- No freeform canvas.
- No CMS.
- No rewriting the proven substrate.
- No GrapesJS. No Craft.js yet (harvest the component-edit-contract concept only).
- No federation expansion, new social adapters, campaign engine, new graph DB, new canonical authority, CMS migration, new acquisition platform, renderer framework rewrite.

## Protected (do not touch)

EVIDENCE, OBJECTS, RELATIONSHIPS, DETERMINISM, AUTHORITY, REPLAY, OWNER CONTROL, PROCEDURALIZER, MEDIA ACQUISITION, SITE SPEC, BINDINGS, URL SAFETY, PROPOSAL/APPROVAL, ASK FYD SUBSTRATE, REGENERATION.

## Replace / improve

PRESENTATION OBSERVATION, PLANNING, COMPONENT FAMILY, PUBLIC RENDER.

## FYD is

REAL BUSINESS -> OBSERVATIONS -> EVIDENCE -> OBJECT GRAPH
plus PRESENTATION OBSERVATIONS -> DESIGN SIGNAL
plus OWNER INTENT
then PLANNER -> SITE SPEC -> COMPONENT FAMILY -> PUBLIC EXPERIENCE.

Business truth and presentation signal remain separate.

## Decision 1: Media — ingest, don't hotlink

For HPP/Coppersmith demos (authorized): acquire media, hash original bytes, retain source URL + observation provenance, render FYD-controlled derivatives. Hotlinking depends on someone else's cache headers, transforms, uptime, CORS/CDN policy, URL stability, future content replacement.

Model: MediaObservation (what FYD saw) -> MediaAsset (acquired immutable bytes/digest) -> MediaDerivative (resized/encoded output). Object graph references assets; renderer references derivatives. Media bytes never become canonical business truth.

Preserve: source URL, observed time, content digest, dimensions, media type, provenance.

Production media-rights lifecycle is a later explicit policy boundary. Public accessibility does not grant production republication rights.

## Decision 2: Owner gate — explicit demo-owner session, no auth derail

Real auth comes before real customer deployment. Do NOT derail this rebuild into authentication.

Temporary owner mode must be impossible to mistake for security: local/dev-only config, visibly labeled, fails closed outside allowed environment, incapable of production enablement by accident. No parallel demo mutation path — the fake part is authentication only; authorization semantics stay real: INTENT -> PROPOSAL -> CAPABILITY -> APPROVAL -> CANONICAL TRANSITION -> PROJECTION.

## Decision 3: Ask FYD — full evidence-bounded Q&A

Not canned FAQ. Visitors may ask arbitrary relevant questions. Pipeline: QUESTION -> OBJECT RETRIEVAL -> EVIDENCE RETRIEVAL -> VISIBILITY FILTER -> CONTEXT ASSEMBLY -> REASONING -> ANSWER + EVIDENCE.

The LLM may synthesize. It may not manufacture the factual substrate. When evidence is insufficient: refuse to invent; say FYD does not have enough supported information.

## Decision 4: Must-wins — scored dimensions plus hard gates

SCORED (HPP/Coppersmith comparison): MOBILE UX, SERVICE DISCOVERABILITY, CONTACT/ACTION DISCOVERABILITY, PERFORMANCE.

HARD DISQUALIFICATION GATES (fail = FYD loses that build, no weighted rescue):
- invented material fact
- wrong business media
- unsafe link/media sink
- broken primary CTA
- owner customization loss
- serious accessibility regression

Current websites may win secondary things. FYD need not beat them on every dimension in rebuild one.

Diagnostics (record, don't average away failures): visual hierarchy, brand fidelity, media quality, content density, trust, accessibility.

## Correction 1: Tokens — DTCG, not sampled-palette

Use the stable DTCG 2025.10 token model: PRIMITIVE -> SEMANTIC -> COMPONENT tiers. Style Dictionary v4 may compile the DTCG representation. Tailwind v4 @theme is a RENDER TARGET. Tailwind is NOT design authority.

Presentation observation must recover design constraints, not one sampled color: brand colors, contrast relationships, typographic character, image treatment, density, radius/shape tendency, spacing rhythm, CTA emphasis. DTCG separates platform-independent design decisions from renderer implementation.

Non-canonical observation examples: logo candidates, brand-color evidence, font-family observations, heading/body scale ratio, image aspect distributions, image density, navigation structure, section sequence, CTA frequency, CTA hierarchy, layout density, border/radius tendencies. Preserve source. Do NOT infer business facts from presentation observations. Do not make them canonical truth.

## Correction 2: 11 components = V1 catalog, not constitution

Each registry entry declares: component type, accepted object schemas, required fields, optional fields, accepted media roles, variants, capabilities, responsive contract, editable properties. Planner selects from registry. Renderer implements registry. SiteSpec references registry. The 12th component must not require planner architecture changes.

Every variant must have a job, e.g. Hero variants differ by evidence: MEDIA-RICH (strong hero media), IDENTITY-LED (brand/identity evidence dominates), SERVICE-LED (service discovery primary), LOCAL-ACTION (location/contact/action primary). No variants for visual randomness.

Brutal gate: every component/variant must improve HPP or Coppersmith, or enable a clearly missing business archetype. No hypothetical flexibility.

## Correction 3: No editor architecture

Start with: section reorder, show/hide, variant choice, featured object selection, media choice, CTA choice, token-level theme controls, component-specific bounded properties. Primary UX: TALK TO FYD. Secondary: simple direct controls. Advanced visual editing evaluated later.

## Planner — boring and deterministic first

Replace the fixed homePage() sequence. V1 planner is primarily deterministic: same inputs -> same plan. Inputs: object types, object counts, relationships, capabilities, media availability, presentation signal, owner intent. Outputs: page jobs, section selection, section order, variants, object bindings, media bindings, CTA hierarchy, responsive intent.

Visible rules, e.g.: IF multiple service objects -> ServiceGrid eligible. IF high-quality trade media -> media-rich Hero eligible. IF location + phone/contact capability -> local-action CTA eligible. IF person relationships materially exist -> team/person section eligible. IF insufficient gallery-quality media -> Gallery INELIGIBLE.

No "smarter AI planner" yet. AI may eventually propose among valid compositions; it must not invent validity.

## SiteSpec — intent only (non-negotiable)

Include only what earns its place: section job, component type, variant, object bindings, media bindings, CTA hierarchy, responsive intent, design-token/theme reference, rationale/provenance where useful.

Do NOT put into SiteSpec: Tailwind class strings, raw JSX, arbitrary CSS, generated executable code.

## Surface separation

PUBLIC WEBSITE = excellent customer experience.
OWNER = Customize with FYD, preview, approve, advanced controls.
TRUST = WHY THIS, evidence, source, freshness.
DEV = digests, object IDs, bindings, diagnostics.

Execute the approved deletion list from research doc 08: remove from public render developer badges, object pills, raw IDs, repeated provenance chrome, internal terminology, raw E.164 presentation, debug state, and "visit website" as abdication CTA. FYD should BE the useful website.

## Regeneration

Build the section-granular path: OBJECT -> dependent SECTIONS dependency graph; SOURCE CHANGE -> OBJECT DIFF -> AFFECTED SECTIONS -> REPLAN/RENDER ONLY THOSE SECTIONS. Owner modifications outside affected scope survive. More important than full-page AI regeneration.

Customize-with-FYD loop: user request -> SiteSpec patch -> preview/diff -> owner approves -> canonical transition -> regenerate affected section. User never needs to understand components, breakpoints, tokens, objects, SiteSpec.

## Generation targets

HPP and COPPERSMITH from the SAME planner, catalog, renderer. Different evidence, graph, media, presentation signal, capabilities. Result: coherently related but materially appropriate to each business. A family, not clones, not random AI designs.

Required viewports: 375, 390, 1440. Compare ORIGINAL vs FYD. Owner test: "If I owned this business, would I replace my current website with this?" If NO: do not declare victory because tests pass. Identify the losing section, fix the GENERIC FAMILY/PLANNER problem, regenerate BOTH, repeat.

## Why this architecture

Same object graph + same intent + different projection. Today: web site. Later: mobile FYD node, Circle, embed, landing page, campaign page, directory, social profile, ActivityPub/ATProto projections, MCP/agent interface, voice concierge, kiosk, local app. The renderer changes; the entity does not.

Feedback loop: CUSTOMER INTERACTION -> OUTCOME -> EVIDENCE -> BETTER UNDERSTANDING -> BETTER PROJECTION.

## Product thesis (sharper after this failure)

FYD should understand your existing business better than a generic builder, preserve what was good about your existing presence, generate a better customer experience from that understanding, and let you continuously change it by talking to it — without losing truth, provenance, or owner control.

## Implementation sequence

1. Lock V1 family spec.
2. Lock token model.
3. Implement presentation observations.
4. Implement/extend media role scoring.
5. Replace fixed planner.
6. Extend SiteSpec only as necessary.
7. Implement family components.
8. Separate public/owner/trust/dev surfaces.
9. Generate HPP.
10. Generate Coppersmith.
11. Screenshot both at 375/390/1440.
12. Score against originals.
13. Fix generic losses.
14. Repeat until must-wins pass.
15. Add section-granular regeneration.
16. Add Customize with FYD.
17. Add bounded advanced component controls.

First gate: HPP + Coppersmith generated from the same family, and FYD must be a website an owner would actually choose.

## Research deliverables (Phase 1, approved)

1. ~/workspace/sprint-2026-09-24/fyd-builder-research/01-why-regressed.md
2. ~/workspace/sprint-2026-09-24/fyd-builder-research/02-hpp-lessons.md
3. ~/workspace/sprint-2026-09-24/fyd-builder-research/03-coppersmith-lessons.md
4. ~/workspace/sprint-2026-09-24/fyd-builder-research/04-harvest-list.md
5. ~/workspace/sprint-2026-09-24/fyd-builder-research/05-design-family.md
6. ~/workspace/sprint-2026-09-24/fyd-builder-research/06-binding-model.md
7. ~/workspace/sprint-2026-09-24/fyd-builder-research/07-surface-separation.md
8. ~/workspace/sprint-2026-09-24/fyd-builder-research/08-deletion-list.md
9. ~/workspace/sprint-2026-09-24/fyd-builder-research/09-acceptance-rubric.md
10. ~/workspace/sprint-2026-09-24/fyd-builder-research/10-smallest-rebuild.md

## Lane constraints (standing)

- Product lane and kernel harvest lane stay separate.
- No autonomous push. No main/master writes. No destructive branch reset or WIP deletion.
- One clean commit per proven semantic unit. Preserve unrelated dirty work. Harvest before deletion.
- No production renderer code until this authorization — now granted; implementation may begin.
- Nolan's rendered observation outranks tests and summaries. Verify the exact Pig-hosted Tailscale surface before claiming success.
- Ugly-but-green does not invalidate proof; material usability defects block the owner test.
- Think of absolutely everything needed for success: the lane should run its own completeness pass against the 22-dimension checklist where it applies.
