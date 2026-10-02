# registry-ai-vocabulary: typed component catalog doc sketch

**Date:** 2026-09-30, night shift (read-only design work; no dependency, no code)
**Backlog item:** `registry-ai-vocabulary` (P3, HARVEST, FYD lane), `~/workspace/BACKLOG_PING.md:276`
**Harvest source:** Harvest Register row `reg-json-render-typed-catalog` (`~/workspace/BACKLOG_PING.md:704`)
**Sanctioned shape:** "the tiny proof is a machine-readable catalog doc sketch, harvest-dir only."
**Rule compliance:** patterns only. The npm dependency (`@json-render/core`) stays REJECTED (React 19 peer clash with FYD 18.3.1, pre-1.0 churn). This sketch harvests the typed-catalog PRIMITIVE, not the package.

---

## 1. Grounding

### 1a. The harvested primitive (verbatim substance from the Harvest Register row)

- **SOURCE:** json-render (`@json-render/core`); **LICENSE:** Apache-2.0; **VERSION:** 0.18.x observed 2026-09-22.
- **PRIMITIVE:** Typed component catalog (component -> zod prop schema + slots + description) as a machine-readable vocabulary shared by AI prompts and validators.
- **WHY USEFUL:** "Highest-value primitive in the 2026-09-22 lane; prop schemas are the gap in FYD's registry metadata."
- **BYTES/DEPENDENCY COST:** Light. **STATUS:** HARVEST (ADAPT patterns, REJECT the npm dep).
- **TEST for the pattern:** "Tiny proof (harvest dir only): vocabulary -> valid SitePatch, no free-form code."

### 1b. The gap it closes inside FYD

`~/workspace/fyd-lane/harvest-ecosystem.md` sheet 1 names the gap exactly: "adding formal prop schemas per component" for json-render's "typed catalog plus constrained vocabulary". The 2026-09-22 archaeology report (`~/workspace/backlog-recon/reports/fyd-acquisition-sitespec-renderer-registry.md:290`) restates it: the registry has 17 components plus GenericObjectCard fallback, "but formal per-component prop schemas are the identified harvest gap."

The current registry shape, from `~/workspace/fyd-build/src/fyd/components/registry.ts:18-51`, is:

```ts
interface FYDComponentDef {
  name: string;          // "Hero"
  label: string;         // "Hero"
  description: string;   // "Identity block: name, category, tagline, primary action."
  acceptsSchemas: string[]; // ["ping.social.business@1"]
  ownerBound: boolean;   // true
  requiresData: boolean; // true
}
```

It has name, label, description, eligibility. It has no prop schema and no slots. That is the gap.

### 1c. Real registry components this sketch is drawn from

`/home/nolan/ping` and `/home/nolan/projects/ping-askfyd-gold` do not exist in this sandbox (no Pig access from this side chat per hard rules), so example entries are drawn from the workspace-side copies: `~/workspace/fyd-build/src/fyd/components/registry.ts` (descriptions, eligibility) and `~/workspace/fyd4-stage/schemas.ts` (SCHEMA_COMPONENTS eligibility map). Catalog entries below copy `name`/`description`/`acceptsSchemas`/`ownerBound`/`requiresData` verbatim from the registry; only `propSchema` and `slots` are new fields this sketch proposes.

Source-of-truth reconciliation note (found while reading): the fyd-build `registry.ts` listing shows 16 named components plus GenericObjectCard; `registry-object-rail` (DONE_VERIFIED) says an object-rail component exists and the fyd4-stage SCHEMA_COMPONENTS map lists `ObjectRail` as eligible for service/post/product/person schemas, but no `ObjectRail` entry appears in the fyd-build registry listing. The catalog must be generated FROM the canonical registry at build time, not hand-maintained, so this kind of drift surfaces instead of silencing. Do not hand-add ObjectRail to the catalog; reconcile the two sources first (owned by the fyd lanes, not this sketch).

---

## 2. Catalog document shape (the sketch)

One document per registry snapshot. Machine-readable (JSON), human-readable (`description` fields), and AI-readable (`catalog.prompt()`).

```jsonc
{
  "catalog": "fyd.registry.v1",
  "generatedFrom": "src/fyd/components/registry.ts",
  "generatedAt": "2026-09-30T...",
  "components": {
    "<ComponentName>": {
      "label": "...",
      "description": "...",              // from the registry, unchanged
      "acceptsSchemas": ["ping.social.business@1"],
      "ownerBound": true,
      "requiresData": true,
      "propSchema": { ... },             // NEW: zod-compatible JSON Schema for props
      "slots": { ... }                   // NEW: named slots and what may fill them
    }
  }
}
```

Conventions for the new fields:

- `propSchema` is a zod-equivalent JSON Schema (what `z.object({...})` would compile to). `additionalProperties: false` is MANDATORY on every component, so an unknown prop fails validation instead of being silently tolerated.
- `slots` names composition points. A slot's `accepts` lists component names that may fill it (empty = content slot, no component nesting). Slots are where `ObjectGrid`/`ObjectFeed` declare that they render items via a named item component instead of accepting free-form HTML.
- The catalog is generated, never hand-edited. The generator reads the registry source of truth and embeds the handwritten zod schemas kept beside the registry.

## 3. Example catalog entries (drawn from the real registry)

### 3a. Hero (owner-bound identity block)

```jsonc
"Hero": {
  "label": "Hero",
  "description": "Identity block: name, category, tagline, primary action.",
  "acceptsSchemas": ["ping.social.business@1"],
  "ownerBound": true,
  "requiresData": true,
  "propSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "name":       { "type": "string", "minLength": 1 },
      "category":   { "type": "string" },
      "tagline":    { "type": "string", "maxLength": 140 },
      "primaryAction": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "label": { "type": "string", "minLength": 1 },
          "href":  { "type": "string", "format": "uri" }
        },
        "required": ["label", "href"]
      },
      "imageRef": { "type": "string" }
    },
    "required": ["name"]
  },
  "slots": {}
}
```

### 3b. CTA (primary action block, no data required)

```jsonc
"CTA": {
  "label": "Call to action",
  "description": "Primary action block: visit website or start a conversation.",
  "acceptsSchemas": ["ping.social.business@1", "ping.social.service@1"],
  "ownerBound": true,
  "requiresData": false,
  "propSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "heading": { "type": "string" },
      "body":    { "type": "string" },
      "actions": {
        "type": "array",
        "minItems": 1,
        "maxItems": 3,
        "items": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "label": { "type": "string", "minLength": 1 },
            "href":  { "type": "string", "format": "uri" },
            "kind":  { "enum": ["website", "phone", "conversation"] }
          },
          "required": ["label", "href", "kind"]
        }
      }
    },
    "required": ["heading", "actions"]
  },
  "slots": {}
}
```

### 3c. Posts (data-driven list, pagination props)

```jsonc
"Posts": {
  "label": "Posts",
  "description": "Recent posts and articles.",
  "acceptsSchemas": ["ping.social.post@1", "ping.social.article@1"],
  "ownerBound": false,
  "requiresData": true,
  "propSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "limit":    { "type": "integer", "minimum": 1, "maximum": 24, "default": 6 },
      "sort":     { "enum": ["newest", "oldest"], "default": "newest" },
      "showExcerpt": { "type": "boolean", "default": true }
    }
  },
  "slots": {}
}
```

### 3d. ObjectGrid (generic list; the slot is the point)

```jsonc
"ObjectGrid": {
  "label": "Object grid",
  "description": "Generic responsive grid for any object list.",
  "acceptsSchemas": ["ping.social.business@1", "ping.social.service@1", "ping.social.post@1", "ping.social.product@1", "ping.social.location@1", "ping.social.person@1", "ping.social.article@1", "ping.knowledge.website@1"],
  "ownerBound": false,
  "requiresData": true,
  "propSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "columns":  { "type": "integer", "minimum": 1, "maximum": 4, "default": 3 },
      "limit":    { "type": "integer", "minimum": 1, "maximum": 48, "default": 12 }
    }
  },
  "slots": {
    "item": {
      "description": "Renderer used for each item in the grid.",
      "accepts": ["GenericObjectCard"],
      "required": false
    }
  }
}
```

The slot matters: today `ObjectGrid` renders whatever its template decides; in the typed catalog the per-item renderer is an explicit named slot accepting only catalog components. This is the json-render "slots" half of the primitive.

### 3e. AskFYD (question box; minimal surface, capability-adjacent)

```jsonc
"AskFYD": {
  "label": "Ask FYD",
  "description": "Question box: ask anything about this business.",
  "acceptsSchemas": ["ping.social.business@1"],
  "ownerBound": true,
  "requiresData": false,
  "propSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "placeholder": { "type": "string", "default": "Ask anything about this business" },
      "suggestedQuestions": {
        "type": "array",
        "maxItems": 4,
        "items": { "type": "string", "maxLength": 120 }
      }
    }
  },
  "slots": {}
}
```

### 3f. SocialProof (dormant until evidence exists)

```jsonc
"SocialProof": {
  "label": "Social proof",
  "description": "Reviews and testimonials, labeled as published claims.",
  "acceptsSchemas": ["ping.social.business@1"],
  "ownerBound": true,
  "requiresData": true,
  "propSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "maxItems": { "type": "integer", "minimum": 1, "maximum": 8, "default": 3 },
      "claimLabel": { "type": "string", "default": "Published reviews" }
    }
  },
  "slots": {},
  "activation": "DORMANT until real review/testimonial evidence exists (see registry-socialproof-dormant, OPEN). The catalog generator omits DORMANT components from catalog.prompt() output."
}
```

The `activation` note is a sketch-level decision: a typed catalog is also the natural home for the dormant/active distinction, so the AI never emits a component the render boundary would refuse for lack of evidence.

---

## 4. The two consumers (how the catalog is used, harvest-row wording)

The Harvest Register row names the wrapper exactly: **`catalog.prompt()` + render-boundary zod validation**. Both are patterns to adapt; neither needs the json-render package.

### 4a. `catalog.prompt()` (AI-facing)

Renders the catalog into a system-prompt block the AI that authors SitePatches must obey:

```
You may emit ONLY these components, with ONLY these props:
- Hero: Identity block: name, category, tagline, primary action.
  props: name (string, required), category (string), tagline (string, max 140),
         primaryAction {label, href}, imageRef (string). No other props.
- CTA: Primary action block: visit website or start a conversation.
  props: heading (required), body, actions[1..3] {label, href, kind}.
...
Unknown components and unknown props will be rejected at the render
boundary. Do not invent props. Do not emit raw HTML.
```

Purpose: the AI's vocabulary is no longer folklore in a prompt file; it is generated from the same registry the renderer reads. When a component is added, renamed, or made DORMANT, both the prompt and the validator change together.

### 4b. Render-boundary zod validation (validator-facing)

At the point where a SitePatch's sections become rendered components:

1. For each section `{ component, props }`: look up `component` in the catalog. Unknown component -> fail closed (this half already exists and is DONE_VERIFIED: `registry-unknown-component`).
2. NEW: validate `props` against the component's zod `propSchema`. Unknown prop -> reject the section (fail closed or strip-and-log, a policy choice for the fyd lanes; this sketch recommends fail closed to match the existing unknown-component posture).
3. NEW: validate slot fillers against `slots[].accepts`. A slot filled with a non-catalog component name -> reject.

## 5. The validation boundary this closes

Today the boundary is half-built:

- **Closed (proven):** unknown component NAME fails closed (`registry-unknown-component`, P3 DONE_VERIFIED).
- **Open:** a KNOWN component with UNKNOWN or free-form props passes through. The fyd4-stage generator even encodes tolerance for this: `schemas.ts` reports "Unknown field ... tolerated and passed through" as a finding rather than a rejection, and the registry has no per-component prop contract to check against. The AI authoring SitePatches has no machine-readable vocabulary of which props exist, so invented props are the normal failure mode, and they are silently tolerated downstream.

The typed catalog closes exactly that seam: **vocabulary -> prompt** gives the AI the true vocabulary, and **zod prop schema -> render boundary** gives the renderer a contract to enforce. The Harvest Register's tiny-proof criterion states the acceptance bar: vocabulary -> valid SitePatch, no free-form code. In other words, after this catalog exists and the two consumers are wired, there should be no path by which an AI emits a component name, prop, or slot filler that the registry did not declare, and any attempt fails before render, deterministically, with the catalog as the single source of truth both sides read.

## 6. Explicit non-goals (from the Harvest Register row and related rows)

- **No npm dependency.** `@json-render/core` is REJECTED; the zod schemas, the catalog generator, `catalog.prompt()`, and the render-boundary validator are first-party patterns (~light, per the register's bytes/cost column).
- **No Puck, no builder.** The Puck component-config pattern belongs to the deferred human visual-editing surface (`xcut-jsonrender-puck-primitives`); it does not enter this catalog.
- **No SiteSpec replacement.** SiteSpec stays the one typed JSON (OpenPage row); the catalog describes the registry components that render SiteSpec sections, it does not become a second document model.
- **Catalog generation, not hand maintenance.** Entries are generated from the registry source of truth; the ObjectRail drift noted in 1c is evidence for why.

## 7. Open questions for the fyd lanes (not decided in this sketch)

1. Unknown-prop policy at the render boundary: fail closed (matches `registry-unknown-component` posture) vs strip-and-log (more forgiving for AI drift). Recommendation: fail closed.
2. Whether `catalog.prompt()` should include full zod detail or a compressed prop summary, for token cost vs precision.
3. Where the catalog snapshot is pinned and versioned (registry version? SiteSpec version? content hash?) so replays can recover the exact vocabulary a patch was validated against.
4. Whether slots should also carry per-slot prop overrides (e.g. ObjectGrid item slot restricting card props).
