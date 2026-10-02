# Website/product lane — the integration proof (2026-10-01 ~19:01 MDT, Nolan, binding)

## Repository decision (Nolan): OPTION A

FYD owns the current FYD lineage. Keep its existing ancestry intact; eventually publish as new non-destructive branches on the FYD remote after re-verifying access. Do NOT graft unrelated FYD history onto PING main. PING remains the umbrella/platform; FYD is the product built on it. No push yet merely to resolve naming — pushes need Nolan's explicit per-push word.

## Safety task (done 2026-10-01 ~19:02 MDT)

`~/workspace` origin `piging2/PING` verified dependency-free (no cron, no workflow, no hook pushes from it) and renamed to `quarantined-ping-origin`. Bare `git push` now fails. Accidental ops→product push path closed; URL preserved in config.

## The lane

MAIN ORCHESTRATOR devotes serious attention here. Keep everything else productive, but the website/object experience is one of the highest-leverage integration tests for the entire system. DO NOT optimize the surface in isolation. We are testing whether the deep PING primitives create a better product.

PING = durable substrate. FYD = customer-facing product.
The website is NOT the moat. The generated copy is NOT the moat. The current model is NOT the moat.
The compounding asset: EVIDENCE HISTORY + IDENTITY/OBJECT GRAPH + RELATIONSHIP GRAPH + OWNER CORRECTIONS + CAPABILITIES + ACTION/OUTCOME HISTORY.
The website is where a normal human finally EXPERIENCES those advantages.

## FYD as compiler (the deepest improvement)

Durable semantic intermediate representation, not an AI website generator:

SOURCES → OBSERVATIONS → EVIDENCE → ENTITY RESOLUTION → OBJECT GRAPH → OWNER POLICY/CORRECTIONS → SITE PLAN → SITE SPEC → DETERMINISTIC RENDERER → WEB EXPERIENCE.

Same verified graph later compiles to: website, concierge, search, feed, Ask PING/FYD, MCP tools, social projections, campaigns, agent context, support, marketing, commerce. The expensive operation is UNDERSTAND THE ENTITY CORRECTLY; everything downstream becomes a projection.

Owner change is a typed patch, not DOM editing:
OWNER INTENT → TYPED SITE PATCH → PREVIEW → POLICY/AUTHORIZATION → PERSISTENT OWNER OVERRIDE → RECOMPILE.
Source refreshes must not casually erase owner intent. Corrections preserve: source observation, owner correction, time, authority, current effective presentation — future refreshes surface conflict instead of resurrecting stale info.

## Hard boundaries

- No new ClaimAuthority for rendering. Use existing evidence/object authority boundaries. Render pipeline accepts typed presentation bindings; every factual unit traceable to EVIDENCE-BACKED FACT, OWNER-ASSERTED CONTENT, or GENERATED PRESENTATION. The renderer does NOT decide truth; it renders validated presentation state safely. Generated copy connects facts stylistically, never manufactures factual state.
- Model FACT / SOURCE / VISIBILITY separately. Fact "123 Main Street", source "website observation", visibility "owner policy" — owner can SHOW/HIDE without rewriting evidence. Generalizes to phone, email, people, locations, pricing, hours, socials.
- Provenance is not the primary workflow. Normal UX shows the business; "Why this?" opens the evidence. Progressive disclosure.
- Semantic determinism: ObjectGraph + SiteSpec + ViewerContext + RendererVersion → SemanticRenderModel. Sections, bindings, ordering, objects, relationships, actions, visibility deterministic. No byte-identical-DOM requirement without product reason.
- No fake authentication. Bounded DEMO OWNER MODE is acceptable for development: visibly bounded, isolated to demo/test state, never masquerading as production auth. Define the seam where real identity binds.
- Media: prefer acquisition into the FYD/PING pipeline (source URL → fetch under policy → digest → provenance → validate → optimized derivatives → safe serving) over permanent hotlinking. Preserve source reference; possession ≠ ownership/licensing. No giant DAM.
- Accessibility = compiler correctness. Component registry encodes semantics, keyboard, focus, touch targets, labels, contrast. Every generated site inherits the guarantees.
- Performance: brutally fast, server-side/projected content, small client islands (Ask FYD, object interactions, owner customization). Measure LCP/INP/CLS/JS transferred/page weight with current standards, not a PING-invented framework.
- Schema-driven: a few important schemas drive validation, types, object editor, component/relationship eligibility, search indexing, agent tool descriptions, evidence presentation, protocol projections. Not 100 schemas.
- Dependencies OBJECT → SITE SECTIONS; recompute affected projections on change, not the universe.

## Harvest rule

SEARCH ALL OF PING. Search dormant code, git history, cascade projects, previous FYD work, the current ecosystem. But every harvest candidate must answer: WHAT CUSTOMER PROBLEM DOES THIS REMOVE? and WHICH COMMODITY BOUNDARY DOES THIS LET FYD AVOID REBUILDING? Harvest around: acquisition, structured-data understanding, media processing, schema-driven UI, responsive rendering, accessibility, search, evidence/provenance, object navigation, identity resolution, agent/tool interfaces, local-first state, incremental recomputation. RESEARCH HORIZON = BROAD. IMPLEMENTATION FRONTIER = NARROW. Harvest broadly (read-only). Build narrowly. Measure everything.

## The product test ("I WANT A URL")

Stable dev URL with two real generated businesses (Happy Place, Coppersmith). Each: generated site, object explorer, relationships, Ask FYD, Why This, owner/demo customization. The loop, end to end:
open URL → see two businesses → choose one → within seconds understand WHAT THEY DO → explore services/people/locations/relationships → ask "WHAT SERVICES DO THEY OFFER?" → FYD answers → ask "HOW DO YOU KNOW?" → FYD shows evidence → switch to owner/demo mode → "PUT THIS FIRST" → FYD shows proposed change → approve → site changes → refresh persists → source changes → FYD notices → customization survives.

Ask FYD: full evidence-bounded Q&A with refusal when evidence is insufficient ("I don't have evidence for that" is a feature). Visitor: READ/ASK/NAVIGATE. Owner: PROPOSE/CUSTOMIZE/APPROVE per policy.

## Metrics (6, not 40)

Mobile UX, contact discoverability, service discoverability, performance, UNDERSTANDING ACCURACY, TRUST/CORRECTABILITY. For the two businesses: can a visitor quickly understand what they do, find services, find contact/action path, use it on mobile, get fast response, correct/inspect wrong information.

## Sprint posture

100-hour sprint, autonomous operation. Generate falsification questions continuously (the 30-probe model: claim → cheapest falsification → observation → first broken edge → smallest correction → test → commit → re-run). Commit law holds. Privacy boundaries hold (nothing sensitive to free models). Every push needs Nolan's explicit word. Surface decisions, security/canonical incidents, and the first broken edge. Do not build MarketingOS content machinery — that directive is parked.
