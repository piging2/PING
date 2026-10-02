# SiteSpec / Component Registry Contract — DRAFT v0.1 (coordinator)

Status: DRAFT pending harvest validation (Lane A code + ecosystem). Nothing here is final until the harvest inventories confirm or correct the shapes.

## 1. Non-negotiables (from Nolan's directive)

- Agents operate on SPECS and OBJECTS. Never rewrite arbitrary app source.
- Agents produce TYPED PATCHES, not codebases.
- No customer-specific JSX. Graph objects determine eligible components.
- LLM output never becomes arbitrary executable React.
- Human and agent manipulate the SAME structured SiteSpec.
- Render determinism is semantic: same SiteSpec + graph snapshot + viewer context + renderer/design-token versions -> same semantic render model. No wall-clock, no randomness, no LLM inside render.
- Epistemic classes: DIRECT FACT vs GENERATED COPY are separate classes. Design may invent presentation; never invent years in business, licenses, awards, service areas, prices, guarantees, customer counts, availability, certifications. Missing fact -> omit or ask owner.
- Conflict preservation: website says A, provider says B, owner says C -> preserve all three; owner resolves presentation.

## 2. SiteSpec document (v1)

```jsonc
{
  "specVersion": "fyd.sitespec/v1",
  "tenantId": "string",                 // business identity ref, not PII
  "archetype": "KNOWLEDGE | TRADES | TECHNICAL_ENTERPRISE",
  "status": "draft | published",        // Payload harvest: ACCEPT previews draft-vs-published diff
  "revision": 12,                       // bounded revision history with restore
  "designTokens": { "$ref": "fyd.tokens/v1#<archetype>" },  // tokens live in the design system, not per site
  "sections": [ "Section", "..." ],
  "objectPresence": "ObjectPresence",   // generic layout capability, not bespoke placement
  "capabilities": { "askFyd": true, "contact": ["tel","mailto"], "...": "..." },
  "provenance": { "graphDigest": "sha256:...", "planner": "name@version", "generatedAt": "iso8601" }
}
```

Theme is a token set (colors, fonts, radius, spacing) referenced by blocks; the renderer resolves tokens, never component code (OpenPage harvest). No surface may hold a second source of truth for the site.

### Section

```jsonc
{
  "id": "home:Hero:0",                  // stable, human-readable, unique
  "component": "Hero",                  // must exist in the component registry
  "variant": "default",                 // registry-declared variant only
  "props": { "...": "..." },            // registry-declared editable properties only
  "dataBindings": [
    { "slot": "business", "objectRef": "obj:<id>", "fields": ["name","tagline"] }
  ],
  "epistemic": "DIRECT | GENERATED",    // DIRECT: every factual string traces to a claim/field + evidence
  "evidence": ["claim:<id>", "..."],    // required when epistemic=DIRECT and facts are shown
  "copy": { "heading": "...", "body": "..." }  // GENERATED copy is proposal, versioned with generator id
}
```

### ObjectPresence (generic layout capability)

```jsonc
{
  "mode": "auto",                       // auto | rail | drawer | hidden
  "objects": ["obj:<id>", "..."],       // contextual objects eligible for margin/rail
  "rules": {
    "minContentWidth": 0,               // geometry decides placement; content never stolen
    "collapseBelow": "breakpoint key"   // narrow viewports collapse rail to drawer/sheet
  }
}
```

Placement law: center = canonical customer content, untouched. Margins = contextual intelligence when safe space exists. Geometry decides, never hardcoded pixel thresholds. Mobile: drawer/sheet, never displacement.

## 3. Component registry contract

Every component registers ONE entry:

```jsonc
{
  "name": "Hero",
  "acceptedSchemas": ["fyd.object/Business", "fyd.object/Organization"],
  "requiredData": ["name"],
  "optionalData": ["tagline", "heroMedia", "location"],
  "capabilities": [],                   // e.g. ["media.derivative"] if it needs derivatives
  "responsive": { "minWidth": 320, "collapsesAt": "...", "touchTargetMin": 44 },
  "editableProperties": ["heading", "variant", "mediaTreatment"],
  "variants": ["default", "compact"]
}
```

The registry is the ONLY place component capabilities are declared. SiteSpec may only select registered components with registered variants and registered editable properties. Anything else fails validation.

## 4. Semantic component catalog (v1, from Nolan's directive)

Hero, ObjectCollection, ServiceGrid, PersonGrid, Location, EvidenceFact, CTA, MediaGallery, ArticleFeed, ObjectRail, AskFYD, Contact, RelationshipList.

NOT BlueHero / PlumberHero / NolanHero. If a new component is proposed, it must pass the new-abstraction test: does it make generation better, customization easier, evidence stronger, reuse higher, or execution cheaper? If not, do not build it.

## 5. Archetype profiles (DATA/TOKENS/RULES, not codebases)

```jsonc
{
  "profileId": "fyd.archetype/TRADES",
  "compositionRules": { "sectionOrder": ["Hero","ServiceGrid","EvidenceFact","Location","Contact"], "maxSections": 0 },
  "density": "compact | comfortable | spacious",
  "hierarchy": { "...": "..." },
  "typographyScale": { "base": 16, "ratio": 1.25 },
  "mediaTreatment": "documentary | polished | schematic",
  "ctaEmphasis": "high | medium | low",
  "objectProminence": "rail | drawer | subtle",
  "tokenOverrides": { "...": "..." }
}
```

Same objects, components, layout primitives, tokens, SiteSpec, renderer. Different composition rules, density, hierarchy, type scale, media treatment, CTA emphasis, object prominence. Archetypes are parameterized starting points, not cages: a site may override any rule; overrides are owner intent and survive regeneration.

## 6. Typed patch (for conversational customization, step 11)

```jsonc
{
  "patchVersion": "fyd.sitepatch/v1",
  "baseSpecVersion": "sha256:<spec digest>",
  "ops": [
    { "op": "set", "path": "/sections/home:Hero:0/props/heading", "value": "...", "reason": "owner request", "epistemic": "GENERATED" }
  ]
}
```

Pipeline: OWNER/AGENT REQUEST -> PATCH PLANNER -> TYPED SITE PATCH -> VALIDATE -> PREVIEW DIFF -> APPLY -> VERSION/REPLAY. Validation is deterministic software: schema, registry membership, digest match on base. Preview diff shows semantic before/after. Apply versions the spec. Regeneration preserves owner overrides (owner layer wins over generated layer).

## 7. Planner contract (graph -> SiteSpec)

The site planner is DETERMINISTIC data/config: object shapes + relationships + cardinality + capabilities + owner policy -> sections, deterministic ordering. No AI planner expansion in v1. The planner takes: object graph snapshot digest, archetype profile, capability set, owner overrides. It emits a SiteSpec. Same inputs -> byte-identical SiteSpec.

## 8. Harvest-validated updates (Lane A ecosystem, 2026-09-21)

- Schema.org is a VERSIONED TRANSLATION MAP pinned to vocabulary **v30.0** (verified 2026-03-19). **30.1 is UNVERIFIED**: no 30.1 release found in any primary source as of 2026-09-21. No 30.1 types enter the map. The upgrader is a re-runnable map diff, not hand edits. Never model the internal graph on schema.org types directly.
- Internal agent tool calls mirror the MCP v2 stateless shape now (capabilities carried per request in `_meta`, typed results, discover-first); the real MCP transport is deferred. v1 SDK is end-of-line at 1.29.0.
- The acquisition edge runs Crawl4AI as an UNTRUSTED executor: target URLs and egress policy enforced outside it; every captured page becomes evidence tagged with source URL, observed_at, and crawler version. (Crawl4AI exact latest tag still to confirm from the upstream releases page before pinning.)
- Zero new runtime dependencies from the ecosystem harvest. Everything above is a contract or shape decision.
- Typed patches are the ONLY mutation surface for SiteSpec; the visual preview is one client of the same patch surface, never a parallel edit path (agent/API parity, Payload harvest).

## 9. Open questions for code-harvest validation

- Does the current in-repo SiteSpec shape already cover sections/dataBindings/epistemic, or is it heading+props only?
- Which of the 13 catalog components already exist in the sites renderer vs need building?
- Does the object API expose claims/evidence in a shape Ask FYD can cite?
- What does the current planner (if any) look like: deterministic rules or ad hoc?
- Schema.org 30.1: adopt as versioned translation mapping for the export/SEO layer only.

## 9. What this deliberately does NOT define yet

- Federation, campaign engine, visual editor, MCP server, ActivityPub/ATProto projections. Explicitly out of scope.
- @fyd/* package split mechanics (step: customer repo export, after proof).
