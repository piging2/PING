# FYD — Website Builder Authority Decisions

CEO decisions + builder harvest directive. 2026-09-21. All four product questions answered. Build continues under these decisions.

## What we are building

Not the world's most feature-rich page editor. The most streamlined system for turning an existing digital presence into a trustworthy, beautiful, editable, intelligent web presence.

## Media: FYD-managed derivatives, not hotlink-only, not owned IP

For these authorized demo businesses: ingest public site media into an FYD-managed derivative/cache pipeline. Do not rely exclusively on hotlinking. Do not treat publicly fetchable media as FYD-owned IP.

Preserve: source URL, source page, observed_at, content digest, media type, dimensions where known, derived variant lineage, object/evidence association.

```
SOURCE IMAGE
  -> SAFE FETCH
  -> DIGEST
  -> MEDIA OBSERVATION
  -> FYD DERIVATIVES
       |- thumbnail
       |- card
       |- hero
       +- responsive variants
  -> RENDER
```

Why: performance, responsive sizing, stable generated experience, source-change detection, deduplication, reproducibility, provenance.

Security: remote-media fetching is an SSRF boundary. Allow only HTTP/HTTPS public origins. Reject localhost, loopback, private RFC1918 ranges, link-local, metadata endpoints, file:, data:, javascript:, credential-bearing URLs, unexpected redirect into private address space. Enforce size limits, content-type verification, timeouts, redirect limits. Do not allow an arbitrary URL supplied by an agent to become an unrestricted server-side fetch.

Harvest: Cloudflare's image system explicitly uses allowed origins for remote transformations; that is the kind of boundary to harvest. Next's image tooling can handle responsive sizing/modern formats where it fits the current renderer.

Search PING media machinery first. Harvest before building storage.

For demo: PUBLIC SOURCE MEDIA -> FYD DERIVATIVE CACHE, provenance retained.
For production: media rights/retention policy must become explicit. Do not block this product build on full auth.

## Owner mode: explicit demo auth through the real capability seam

Use an explicit DEMO OWNER MODE. Visibly and technically marked: DEMO_AUTH, NOT_PRODUCTION_AUTH. Do not pretend it proves authentication.

Design the seam correctly:

```
ViewerContext {
  identity
  tenant
  role
  capabilities
  auth_basis
}
```

Demo owner mode produces the SAME ViewerContext/capability shape that future real authentication will produce. Components never ask `if (demoMode)`. They ask `can(viewer, "site.propose")`, `can(viewer, "field.visibility.change")`, `can(viewer, "site.approve")`. Demo auth disappears later without rewriting the product.

Owner mode may: correct facts, hide/show eligible fields, change presentation, propose site changes, approve site changes. Visitor mode may not. No provider credentials in browser state. No private keys. No raw journal. No fake claim that demo auth is secure.

The owner decides presentation. The pipeline does NOT permanently decide "street address is private." The pipeline may choose a conservative INITIAL VISIBILITY DEFAULT. That is different. For a LocalBusiness, a street address may be core customer-facing information; Schema.org itself models LocalBusiness as a physical business/branch and provides location-related properties.

OBSERVED VALUE != VISIBILITY DECISION. Keep them separate:

```
FACT:        123 Main St
EVIDENCE:    source X
VISIBILITY:  HIDDEN / PUBLIC / ...
DECISION BASIS: default_policy / owner_override / source_policy
```

DATA != VISIBILITY != PRESENTATION. This holds for the entire builder.

## Visitor Ask FYD: full evidence-bounded Q&A

Full, not a toy narrow FAQ. Full does NOT mean unconstrained. Visitor Ask FYD receives only: PUBLIC objects, PUBLIC relationships, PUBLIC evidence suitable for disclosure, PUBLIC capabilities, the visitor request. It can answer broadly inside that world.

- KNOWN: answer.
- PARTIALLY KNOWN: answer what is supported and state what remains unknown.
- NOT KNOWN: say FYD does not have evidence.
- CONFLICT: surface the conflict.
- NEVER: invent business facts merely to be helpful.

WHY THIS? is trust infrastructure, not the hero feature. The owner-facing hero is: "FYD understood my business." / "FYD built this." / "Change it by talking." / "FYD keeps it current." WHY THIS? appears when something looks wrong, the owner wants explanation, sources conflict, an agent proposes a consequential change, or trust matters. Do not clutter every card with provenance chrome. Make provenance available, not dominant. Prioritize CONFIRM / CORRECT / HIDE over fancy provenance UI.

Owner correction example: owner sees "Emergency Plumbing" and says "Actually we no longer offer that." FYD must understand: source observation still exists; owner correction says it is not current/appropriate; generated presence changes; evidence history remains.

## Gates above metrics

Hard gates (not weighted scores): TRUTH, SAFETY, OWNER CONTROL. A generated site that is faster but invents a service loses. A prettier site exposing private information loses. A better CTA pointing to a javascript: URL loses.

Then compete on: MOBILE UX, CONTACT DISCOVERABILITY, SERVICE DISCOVERABILITY, PERFORMANCE.

- Mobile: 320 / 375 / 768 / 1280. No horizontal overflow. Primary CTA usable. No hover-only functionality. Touch targets sane; do not regress below WCAG 2.2 AA 24x24 CSS px.
- Contact discoverability: can the visitor find the primary contact action immediately? Can they reach call / email / request quote / directions when the corresponding capability/evidence exists? Do not render actions that do not actually work.
- Service discoverability: can the visitor answer within seconds what they do, where, and which service is relevant? Service objects derive from evidence, not generic marketing copy.
- Performance: measure actual page behavior, not Lighthouse theater. Track LCP, INP, CLS, payload, image weight, server/render latency where relevant. Use responsive media derivatives.

## Three modes of intelligence

1. GENERATE FOR ME. Website/source in, FYD produces the experience.
2. TALK TO IT. "Make emergency services more prominent." Agent produces typed proposal.
3. DIRECT MANIPULATION (later). Reorder, show/hide, featured object, image choice, basic tokens.

The conversational layer operates over the SAME SiteSpec that direct manipulation eventually edits. Do not start with a giant canvas.

## Layer separation (the optionality payoff)

```
SOURCES -> OBSERVATIONS -> EVIDENCE -> OBJECT GRAPH -> OWNER STATE
  -> SITE INTENT -> SITE SPEC -> RENDERER
```

SiteSpec owns: pages, sections, ordering, object bindings, presentation variants, design tokens, visibility/presentation choices. SiteSpec does NOT own: business truth, source evidence, authentication, canonical events, provider tokens, arbitrary JavaScript.

This separation is why tomorrow we can add another SOURCE, OBJECT TYPE, RENDERER, AGENT, SOCIAL NETWORK, MOBILE APP, THEME, or CAMPAIGN ENGINE without rewriting the rest. Do not create a new web programming language.

Harvest modern schema-driven UI patterns. Every component declares ACCEPTS / REQUIRES / OPTIONAL / CAPABILITIES; the deterministic planner operates over eligibility. The agent selects from a bounded component vocabulary with valid bindings; it never invents `<SuperCoolEmergencyPlumberThing/>`.

Do not make everything AI. Deterministic planner establishes required sections, eligible components, object bindings, capability bindings, privacy, hard ordering constraints. AI may propose composition, emphasis, copy, visual hierarchy, optional page grouping, presentation variant. Schema validation checks output. AI proposes. Software validates. Renderer executes. Treat FYD like a compiler.

Frontend: web/social/documents -> evidence graph. Semantic layer: objects, relationships, visibility, capabilities. Intermediate representation: SiteSpec. Backends: web, mobile, Circle, embed, future native, future protocol projections. Do not generate bespoke React apps.

Media items should eventually know: what it depicts, what object it belongs to, source, rights/authorization basis where known, dimensions, digest, derivatives, alt-text evidence/generated status, featured status. Then "Use the truck photo for emergency plumbing" becomes Media M7 -> depicts/references -> Service S3, with SiteSpec binding ServiceHero { service: S3, media: M7 }.

Keep the token system small: typography, spacing, radius, surface treatment, content width, brand colors, perhaps density. No 400 CSS variables. Semantic presets (professional, warm, industrial, minimal, premium) map through validated tokens. Owner can override.

## Search and harvest order

Search all PING first for: media storage, image processing, asset authority, file hashing, evidence attachments, object media, component registries, site schemas, design tokens, theme systems, layout systems, CMS remnants, page builders, responsive components, image proxies, sanitization, URL validation, capability-bound UI. Then inspect ecosystem libraries. Harvest commodity code. FYD code should primarily be object -> experience semantics.

External conceptual anchors (already researched from primary docs): Schema.org LocalBusiness/Service/images/locations/hours/sameAs primitives; W3C PROV entity/agent/process model for provenance; ATProto attenuated, human-readable permissions as validation for capability-shaped auth; Cloudflare allowed-origins pattern for remote image transforms; WCAG 2.2 AA 24x24 target size.

## Do not restart

Currently green: 127/127 then 195/195 canonical gates, @graph fixed, two real websites through the same proceduralizer, different object graphs, different SiteSpecs, desktop green, mobile green after exact CSS diagnosis, URL safety green, binding verifier wired, unbound factual claim test green, owner address override green, semantic determinism green. Build forward. Commit the proven one-line mobile fix safely; do not touch the unrelated 23 dirty files.

## Build sequence

Media archaeology. Safe media ingestion + derivatives. Apply media to both real generated sites. Visitor Ask FYD ("What services does this business offer, and how do you know?"). Owner Ask FYD ("Make emergency service more prominent."). Site patch proposal. Approve. Render. Reload. Re-observe source. Prove owner customization survives.

Add WHAT FYD THINKS IT KNOWS: a simple owner review, not an admin database table. FYD found business name / phone / address hidden / services 7 / locations 2 / social accounts 3 / team members 4 / hours conflicting; owner can CONFIRM / CORRECT / HIDE. This is how the user trains their FYD without learning PING.

## The moat

Not AI website generation. The moat is the accumulating state underneath: source history + evidence + owner corrections + object graph + relationships + site customization + concierge interactions + capability history + outcomes. Generated HTML is disposable. SiteSpec is regenerable. The accumulated understanding is valuable.

FYD turns the digital presence you already have into a living, evidence-backed website and concierge that understands your business, changes when you tell it to, and stays current as your business changes.
