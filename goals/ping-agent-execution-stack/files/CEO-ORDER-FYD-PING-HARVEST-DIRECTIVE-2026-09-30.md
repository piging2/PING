# CEO ORDER — FYD / PING TECHNICAL PRODUCT DIRECTIVE: HARVEST WITH A PURPOSE (2026-09-30 ~17:52 MDT, Nolan, binding, filed verbatim)

## Framing correction (Nolan, binding)

FYD is not fundamentally a website builder. The website builder is the first compelling projection of a more valuable system:

evidence-backed digital twin → owner-controlled truth → generated experiences → concierge → capabilities → actions → outcomes.

That distinction is what creates future optionality.

## Answers to the four builder questions

### 1. Media

Ingest public business media, don't merely hotlink it. For the two authorized demo businesses, permit FYD to acquire public site images, hash the original bytes, preserve source URL/observation provenance, and generate FYD-owned derivatives for rendering. But make this an observation/media cache, not an ownership claim. Keep original-source attribution and deletion/revalidation semantics. Hotlinking alone makes FYD availability, performance and responsive rendering dependent on somebody else's CDN; blindly copying forever creates provenance/rights/staleness problems. The right abstraction is source media → observed asset → digest → derivative(s) → projection. The owner should later be able to replace, hide, confirm or explicitly adopt an asset.

### 2. Owner gate

Use the explicit demo owner mode only long enough to prove UX; wire real ownership before consequential actions. Don't derail this build implementing an auth platform, but don't let ?owner=true become accidental security architecture. Owner mode should be visibly marked as simulated, server-gated where possible, and incapable of provider writes or sensitive operations. The existing PING identity/tenant/capability path should ultimately answer viewer → tenant/identity → capability, not React state.

### 3. Ask FYD

Full evidence-backed Q&A, but bounded to what the graph supports. This is the differentiated product. Ask FYD should answer broadly about the entity while separating direct evidence, derivation, inference, and unknown. It should refuse to manufacture facts rather than refuse broad classes of questions. The response contract should return answer + object refs + evidence refs + confidence/status + possible capabilities/proposals. The customer experience is natural language; the internal operation remains structured.

### 4. Must-win metrics

Keep the four, but add trust/correctability as the fifth and most strategically important. Mobile UX, contact discoverability, service discoverability and performance matter because they determine whether the generated website is useful. But FYD's differentiator is: accuracy that can be inspected and corrected, with corrections surviving regeneration. Don't optimize visual novelty ahead of that.

## The questions from the grill

**Who owns "no invented claims"?** Not a new ClaimAuthority. The projection boundary should enforce it mechanically. The renderer should not accept arbitrary factual prose as an untyped string from a planner. A factual binding should point to an object field/evidence-backed derived value. Generated marketing copy must be explicitly classified as generated presentation. The binding verifier now wired is the correct direction: SiteSpec factual binding → resolvable object/fact → visibility check → render. Free-form generated presentation gets a different type and cannot masquerade as observed fact. That gives a rule much stronger than "AI checks AI": factual UI has referential integrity.

**Who decides whether the street address is public?** The owner. The acquisition pipeline can conservatively default a newly observed field's projection visibility, but that is a default, not authority. The durable model should distinguish observed visibility, owner visibility decision, and effective projection policy. The owner address override proving green is therefore not cosmetic—it is the correct constitutional direction.

**Is WHY THIS for owners or developers?** Mostly neither. It is an escape hatch for trust, not the main workflow. A plumber should not audit provenance all day. They should see a good site, say "that's wrong," correct it, and continue. Why this? should be progressively disclosed when somebody questions a fact, when sources conflict, or when FYD proposes something consequential. The provenance substrate is critical; provenance UI everywhere would be product vanity.

**Rendered determinism?** The important proof exists: canonical semantic render models are deterministic, and the browser boundary is green. Don't demand byte-identical DOM forever—framework/runtime attributes can legitimately vary. Demand deterministic semantic output for (SiteSpec, ObjectGraph, ViewerContext, renderer version). Persist/hash that canonical render model when reproducibility matters.

**Generic planner?** Evidence says it currently passes the right test: Happy Place and Coppersmith share structure where their graphs justify similarity, while Coppersmith's extra person/external-identity/relationships generate Explore. Don't "improve" this by adding creative randomness. Start with transparent schema/cardinality/relationship rules and allow intelligence to propose composition when deterministic rules become insufficient.

## Why recent ecosystem work matters

The ecosystem is increasingly supplying the commodity pieces FYD would otherwise have had to build.

- **Crawl4AI** shipped 0.9.4 on September 23. More important than its crawling features: that release fixed two SSRF paths plus an environment-variable trust-boundary leak. Directly relevant if FYD ever accepts customer-controlled crawl configurations: acquisition must run behind an egress/security boundary, not merely a URL validator. Its new pruning path is also substantially faster per the project changelog.
- **Lightpanda** reached 0.4.1 on September 15. Interesting for the escalation tier beyond deterministic HTTP extraction, but its current issue tracker includes OOM reports, incomplete Playwright/CDP compatibility, and an unauthenticated CDP endpoint concern. Benchmark/harvest, don't constitutionalize it.
- **Puck** is particularly relevant to the builder. Current releases include AI page generation from an existing component configuration, rich-text editing, slots and extensible editor UI. Strong evidence not to hand-build a drag/drop visual editor. SiteSpec should remain FYD's IR; if/when customers demand direct visual manipulation, evaluate Puck as an editing surface over that IR rather than making Puck the source of truth.
- **Payload** is moving rapidly too—3.90.x current, 4.0 canaries active. Mature CMS/admin infrastructure is abundant. FYD should not spend its differentiation budget rebuilding generic content management.
- **MCP TypeScript SDK** is now genuinely stable on v2: v2 implements the July 28, 2026 spec, and 2.2.0 shipped September 28. Latest work includes issuer-bound OAuth checks and authorization-server mismatch rejection. Future external-agent/tool interoperability belongs behind MCP rather than a bespoke FYD RPC. It does not justify implementing MCP before the concierge loop.
- **AT Protocol** reference implementation made an architectural shift worth stealing: its repository now tells new application developers to start with @atproto/lex, a type-safe Lexicon-driven SDK, rather than the older broad API client. Validation for FYD's schema → validator/types/operations direction.
- **Automerge** is at 3.4.1. Don't adopt CRDTs now, but preserve the option: if FYD eventually has offline/local editing of SiteSpecs or simultaneous human/agent edits, SiteSpec being declarative rather than generated JSX leaves that door open.

## What all this means for the moat

The moat is not the renderer. Puck and a dozen other systems can edit pages. It isn't crawling; Crawl4AI and browser automation are rapidly commoditizing acquisition. It isn't an agent protocol; MCP is standardizing that. It isn't social records; ATProto/Nostr/ActivityPub already provide them.

The defensible compound asset is: evidence + resolved objects + owner decisions + relationships + capabilities + interaction history + outcomes.

The website is a projection of that asset. The concierge reasons over it. Social networks extend it. Campaigns operate against it. MCP exposes controlled capabilities around it. Local-first/CRDT technology can eventually edit it. Other protocols can project it.

That is why PING is justified—but only if it remains the thin substrate that makes those things interoperable. If PING turns into the place where every feature gets its own authority, it destroys the optionality it was meant to create.

---

# THE STEERING PACKET (send to crew verbatim)

## FYD / PING — TECHNICAL PRODUCT DIRECTIVE

WE ARE IN HARVEST MODE, BUT HARVEST WITH A PURPOSE.
DO NOT OPTIMIZE THE WEBSITE SURFACE IN ISOLATION.
THE WEBSITE IS THE FIRST PROJECTION.
THE PRODUCT CORE IS:
SOURCE → OBSERVATION → EVIDENCE → CLAIM/FACT → OBJECT → RELATIONSHIP → OWNER DECISION → CAPABILITY → EXPERIENCE → ACTION → OUTCOME.
EVERY MAJOR TECHNICAL DECISION SHOULD PRESERVE THIS CHAIN.

FYD is an evidence-backed digital twin with an intelligent concierge. The generated website is its first major projection. The same underlying object can later power: WEBSITE, CIRCLE, FEED, SEARCH, ASK FYD, MOBILE, EMBED, ACTIVITYPUB, ATPROTO, NOSTR, MCP, CAMPAIGNS, LOCAL APPLICATIONS, AGENTS.

DO NOT optimize one projection in a way that contaminates the substrate.

DO NOT CREATE A NEW CLAIM AUTHORITY. Enforce factual integrity at the projection seam. A rendered factual claim must resolve to: OBJECT FIELD or DERIVED FACT with evidence lineage. Generated marketing/presentation copy must be explicitly typed as GENERATED PRESENTATION. Never allow generated prose to masquerade as observed fact. Invariant: FACTUAL BINDING → OBJECT/FACT EXISTS → VISIBILITY PERMITS → EVIDENCE LINEAGE EXISTS → RENDER. The binding verifier should own this mechanical check.

THE OWNER DECIDES PRESENTATION. Acquisition may choose a conservative DEFAULT. It does not become authority. Model the distinction: OBSERVED VISIBILITY / OWNER VISIBILITY DECISION / EFFECTIVE PROJECTION VISIBILITY. Owner must be able to: SHOW, HIDE, CORRECT public business information. The address override is therefore required product behavior.

DO NOT TURN FYD INTO AN AUDIT UI. WHY THIS is progressive disclosure. Normal owner flow: SEE → ACCEPT, or: SEE → CORRECT. WHY THIS appears when: owner questions a fact; sources conflict; FYD makes an inference; agent proposes consequential change; trust needs explanation. The provenance SUBSTRATE is mandatory. The provenance UI is contextual.

For authorized demo businesses: INGEST PUBLIC BUSINESS MEDIA. Pipeline: SOURCE URL → OBSERVATION → FETCH → CONTENT DIGEST → MEDIA OBJECT/REFERENCE → DERIVATIVES → FYD DELIVERY. Preserve: source URL, observed_at, digest, media type, dimensions, derivative lineage, visibility, owner override. Do not imply copyright/ownership merely because FYD cached an observation. Do not rely exclusively on hotlinks. Do not create an asset-management platform yet. SEARCH PING FOR EXISTING MEDIA MACHINERY FIRST.

Demo owner mode is acceptable ONLY as an explicitly simulated product proof. Mark it. Do not let it authorize consequential external effects. Do not invent OwnerAuthority. Production direction remains: VIEWER IDENTITY → TENANT/OWNER CONTEXT → CAPABILITY → ACTION. Current P0 tenant/capability work should supply this seam. MOVE THIS UP.

ASK FYD is more strategically important than visual polish. It must reason over: target object, related objects, evidence, owner corrections, viewer context, capabilities. Response contract should support: answer, evidence_refs, object_refs, classification (DIRECT / DERIVED / INFERRED / GENERATED), unknowns, suggested_actions, proposal. DO NOT make the user understand this structure. They see a useful concierge.

DO NOT BUILD A GENERAL PAGE EDITOR. SITE SPEC IS THE INTERMEDIATE REPRESENTATION. OBJECT GRAPH + OWNER INTENT + DESIGN SYSTEM → SITE SPEC → DETERMINISTIC RENDERER. Harvest Puck and other mature visual editors if/when direct manipulation becomes necessary. They may EDIT SiteSpec. They do not OWN truth.

KEEP IT SIMPLE UNTIL SIMPLE FAILS. Initial composition should remain explainable: schema presence, object cardinality, relationship types, capabilities, owner objective, owner overrides. Do not use AI merely to create visual randomness. AI becomes valuable for: ambiguous composition, copy, design proposals, complex owner intent, cross-source reconciliation. Canonical guarantee: same (SiteSpec, ObjectGraph, ViewerContext, renderer version) → same SEMANTIC RENDER MODEL. Do not require irrelevant DOM/runtime bytes to remain identical. Persist/hash canonical semantic representation where replay matters.

External source content is UNTRUSTED. Maintain the URL-safety invariant already proven. Acquisition systems must also defend: SSRF, internal addresses, redirect rebinding, metadata endpoints, environment leakage, arbitrary file writes, unbounded downloads. Recent Crawl4AI security fixes prove these are real commodity-layer risks. If adopting Crawl4AI: 0.9.4 OR NEWER. Do not expose its raw configuration surface to untrusted tenants. Wrap it behind FYD policy. Do not choose one crawler religion. Use an escalation ladder: LEVEL 0 HTTP + structured metadata; LEVEL 1 HTML extraction; LEVEL 2 mature crawler/extractor; LEVEL 3 browser execution; LEVEL 4 agent-assisted acquisition; LEVEL 5 compile learned procedure into deterministic reusable recipe. Benchmark Crawl4AI / Lightpanda only when current acquisition actually requires escalation. SEARCH PING FIRST. THEN SEARCH MATURE ECOSYSTEM.

For each primitive classify: ADOPT / WRAP / ADAPT / LEARN / REJECT.

Harvest especially at commodity boundaries: CRAWLING, BROWSER AUTOMATION, VISUAL EDITING, MCP, FEDERATION, CRDT, CMS, OAUTH, SCHEMA TOOLING.

Write FYD code where differentiation lives: EVIDENCE SEMANTICS, OBJECT RESOLUTION, OWNER CORRECTIONS, SITE PLANNING, CONCIERGE CONTEXT, CAPABILITY BINDING, OUTCOME LEARNING.

- CRAWL4AI: research/adopt selectively. Security baseline >=0.9.4. Never expose unrestricted crawl config.
- LIGHTPANDA: benchmark. Promising, not foundational yet.
- PUCK: high-value future visual-editor harvest. Do not build drag/drop first.
- PAYLOAD: harvest CMS/admin patterns only if needed. Do not turn FYD into CMS plumbing.
- MCP V2: future external agent/tool boundary. Do not implement before concierge product proof.
- ATPROTO: harvest Lexicon/schema/permission/reference patterns. Adapters later.
- AUTOMERGE: preserve compatibility with declarative SiteSpec. No CRDT integration now.

Every core abstraction must answer: CAN THIS SAME OBJECT APPEAR ON ANOTHER SURFACE? CAN THIS FACT EXPLAIN ITS SOURCE? CAN THE OWNER OVERRIDE ITS PRESENTATION? CAN AN AGENT READ IT WITHOUT RECEIVING SECRETS? CAN A CAPABILITY GOVERN ITS ACTIONS? CAN ITS HISTORY BE REPLAYED? CAN WE REPLACE THE RENDERER? CAN WE REPLACE THE CRAWLER? CAN WE ADD A NEW PROTOCOL WITHOUT CHANGING CANONICAL TRUTH? If NO: inspect coupling before proceeding.

STANDING LAW: MISSION CONTROL IS AN OPERATING ENVIRONMENT. NOT THE SUBSTRATE. SUBSTRATE: OBJECTS, RELATIONSHIPS, EVIDENCE, CAPABILITIES, EVENTS, PRIVATE CONTEXT, OUTCOMES. Mission Control operates on these. FYD operates on these. Future products operate on these. Do not make FYD depend on Mission Control internals.

Current P0 work remains: GATEWAY PROMOTION, TENANT CONTEXT, CAPABILITY PROVISIONING. Judge each by integration truth, not implementation existence. Gateway promotion does NOT close the deployment/witness gap unless the witness path proves it. Tenant context is not green because a tenant field exists. Prove: identity → tenant → proposal → approval/action. Capability provisioning is not green because a grant row exists. Prove: WITHOUT GRANT → 403; WITH CORRECT GRANT → allowed intended operation; WRONG TENANT / WRONG ACTOR → denied. Do not weaken the existing 403 to make the demo work.

The renderer/browser boundary is GREEN. DO NOT REOPEN IT casually.

Next: ASK FYD → EVIDENCE; then: OWNER CORRECTION → PERSISTENCE; then: PLAIN-ENGLISH CUSTOMIZATION → SITE PATCH PROPOSAL → APPROVAL → APPLY; then: SOURCE REOBSERVATION → DIFF → SAFE REGENERATION → OWNER OVERRIDE SURVIVES. That is the product.

After this loop is green: STOP ARCHITECTURE EXPANSION. PUT IT IN FRONT OF ONE REAL BUSINESS OWNER. Their first failure becomes the next product backlog. Not another protocol. Not another authority. Not another architecture wave.

DO NOT CALL THE WEBSITE GENERATOR THE MOAT. COMMODITY: crawler, browser, CMS, visual editor, LLM, agent transport, social protocol. COMPOUNDING FYD ASSET: EVIDENCE HISTORY + RESOLVED OBJECT GRAPH + OWNER CONFIRMATIONS/CORRECTIONS + RELATIONSHIPS + CAPABILITY HISTORY + CONCIERGE INTERACTIONS + OUTCOMES. That is what gets better as the customer uses FYD.

THE CUSTOMER SHOULD EXPERIENCE: "FYD UNDERSTOOD MY BUSINESS." then: "FYD CAN PROVE WHY." then: "FYD LISTENS WHEN I CORRECT IT." then: "I CAN CHANGE IT BY TALKING." then: "FYD KEEPS IT CURRENT." then: "FYD CAN ACT FOR ME WHEN I ALLOW IT." then: "THE SAME BUSINESS CAN EXIST EVERYWHERE." THAT SEQUENCE IS THE COMPANY.

HARVEST EVERYTHING USEFUL. OWN ONLY THE DIFFERENTIATED LAYER. KEEP THE SUBSTRATE SMALL. KEEP THE PROJECTIONS REPLACEABLE. KEEP THE OWNER IN CONTROL. KEEP BUILDING.

---

## Final pushback (Nolan, binding correction, ~17:52 MDT)

"Harvest everything" should mean understand everything, not integrate everything. Current Crawl4AI alone demonstrates why: its September security release fixed SSRF and environment-leak boundaries that could be disastrous if FYD exposed the commodity tool directly. The winning architecture is not the one with the most harvested dependencies; it's the one where commodity implementations remain replaceable behind thin PING/FYD contracts. That is how you get the optionality you're after: today FYD is a website/concierge product; tomorrow the exact same evidence-backed object can become a social node, campaign target, MCP resource, local application object, federated record, agent-operated business process, or something we haven't thought of yet—without rebuilding the customer's truth.

## Filing note (Pigi)

Filed from the "Fix FYD oval rotation and shapes" side chat. This directive steers the FYD product lane; the three P0s of CEO-ORDER-CONTINUITY-NOT-FEATURE-WAVE-2026-09-30.md remain the active commit order (gateway PROMOTED, capability provisioning COMPLETE, tenant context IN FLIGHT). No new execution lanes started by this filing.
