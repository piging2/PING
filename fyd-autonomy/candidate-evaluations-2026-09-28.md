# FYD Ecosystem Candidate Evaluations (2026-09-28)

Scope: ADOPT / ADAPT / HARVEST PATTERN / REJECT for three candidates, verified
from primary sources (GitHub repos, npm registry, official docs). Public web
research only. No live browser interaction performed.

Standing FYD constraints applied to every candidate:
- SiteSpec is a compiler IR (section intent, object queries, tokens, visibility,
  owner overrides). NOT a props dump, NOT canonical truth.
- FYD owns object semantics, evidence, site planning, capabilities,
  customization, authority. PING owns capability, authorization, canonical
  transition, evidence. No candidate may take those over.
- Customization: plain English -> typed SitePatch -> SiteSpec is primary.
  Visual editing is OPTIONAL, only on demonstrated user need. If added: ONE
  STATE MODEL, TWO EDITING INTERFACES (both mutate SiteSpec via SitePatch).
- One design system, semantic variation via tokens, never industry templates.
- Stack: Next.js 15, React 18.3.1, TypeScript.

## Evaluation table

| SUBSYSTEM | CURRENT FYD LOC | CANDIDATE | LICENSE | MATURITY | SECURITY | FIT | ADAPTER LOC (est.) | DELETABLE LOC (est.) | DECISION | REASONING |
|---|---|---|---|---|---|---|---|---|---|---|
| Manual visual customization (future/optional only) | ~3,373 (customize layer) | Puck (@puckeditor/core 0.23.0) | MIT | Active: commits within days, 0.23 release current, packages moved to @puckeditor scope | No known CVEs; output is plain JSON produced by our own config; richtext field HTML must be sanitized before serving; editor route must sit behind FYD's own auth (PING owns authorization) | HIGH (conditional) | ~500-700: SiteSpec->Config generator (~300) + Puck Data<->SitePatch codec (~250) + editor route/publish endpoint (~150) | ~0 today (no manual editor exists to delete); adoption later AVOIDS writing ~3-5k LOC of bespoke editor UI | REJECT (now); designated FUTURE OPTION if manual editing becomes a demonstrated need | Puck is the only candidate whose model fits the one-state-model constraint: application-owned components via a Config object, data exported as plain JSON (`Data = {content: [{type, props}], root, zones}`, onPublish/onChange), plus `<Render>` for headless rendering. A Puck editing surface can be registered per semantic section with fields mapped to patchable intents (token overrides, visibility flags, override text) so every manual edit still lands as a typed SitePatch. React 18/19 peers, Next.js App Router recipes, active maintenance. Nothing is picked today per the "demonstrated need" gate. |
| Manual visual customization (future/optional only) | ~3,373 (customize layer) | Craft.js (@craftjs/core 0.2.12) | MIT | Dormant: last release 2025-02-14 (0.2.12); README/commit activity stale ~1.5yr+; maintainer focus moved to reka.js; not archived, issues open | No known CVEs; dormancy = latent patch risk if one emerges; own internal state store means more FYD-owned code to audit | LOW | ~500-700 adapter + ~3-5k LOC to BUILD the entire editor UI (toolbar, sidebar, outline) because Craft ships a framework, not a finished editor (only @craftjs/layers is ready-made) | ~0 today; saves nothing vs writing bespoke UI | REJECT | Craft loses to Puck on every axis that matters here. It owns its own state management (Editor/Frame internal store, `query.serialize()`/`actions.deserialize()` NodeTree) rather than exposing application-owned data, raising SiteSpec impedance: you adapt to its node tree, not the reverse. It is a framework requiring a fully custom-built editor UI (the dominant cost), and it is effectively unmaintained (last release Feb 2025). No reason to pick it over Puck, ever. |
| Rich-text editing (future/optional only) | ~3,373 (customize layer) | Tiptap (@tiptap/react 3.31.3, headless ProseMirror wrapper) | MIT (core + open extensions; Collaboration Cloud, Comments, Conversion, Pro extensions are commercial/paid - out of scope, no license conflict for core use) | Active: 3.31.3 current (npm-verified), commits within days, commercial company (Tiptap GmbH) maintaining | Two 2026 advisories patched: GHSA-cp6q-959q-f8rh (mergeAttributes prototype pollution, fixed 3.30.4) and a Markdown-attribute DoS (fixed 3.30.5). Floor: >=3.30.6; verified current 3.31.3. | HIGH (conditional) | ~200-400: editor component + toolbar (~150) + Tiptap JSON<->SiteSpec text-field codec (~100) + @tiptap/static-renderer HTML for SSR display (~100) | ~0 (no rich-text code exists today); saves ~1-2k LOC vs hand-rolling a ProseMirror integration | REJECT (no demonstrated need); ADOPT only when the need materializes | There is NO demonstrated rich-text need today: customization is conversational plus typed short fields, and FYD sites do not yet carry owner-authored long-form content. Say yes only when owner long-form text (About story, service descriptions, blog-ish sections) proves too constrained for plain-text fields, or when a Puck adoption drags in rich-text anyway (Puck's own richtext field is Tiptap-based, which partially covers the need without a separate integration). React 17/18/19 peers, headless JSON document model round-trips cleanly through a SiteSpec field codec, SSR-safe via static renderer (immediatelyRender:false rule for Next.js). |

## Deal-breakers flagged

- NONE on license for any candidate: all three are MIT at the core level.
- Craft.js maintenance is the only near-deal-breaker: dormant project (last
  release 2025-02-14), open React 18/19-era issues, community reports of
  drag-and-drop breaking under SWC minification (Next 15 default) requiring a
  webpack+Terser build. Not worth carrying.
- Tiptap security: enforce a >=3.30.6 version floor (3.31.3 verified current)
  due to the two August 2026 advisories. Routine dependency hygiene, not a
  blocker.
- Puck: no license/compat blockers. Note: core package now declares
  engines >=20.9.0. Its `<Puck>` editor is client-only ("use client"), which
  fits the Next 15 App Router pattern.

## Key impedance note (applies to both visual-editor candidates)

Puck/Craft edit *resolved values*; SiteSpec stores *intents* (object queries,
evidence refs, visibility rules, token constraints). The adapter must therefore
NOT map component props 1:1 into SiteSpec. Instead, Puck config fields are
registered per semantic section and bound to patchable intents, and the
Data->SitePatch codec diffs Puck's JSON output into typed SitePatch ops that
FYD validates like conversational patches. Evidence, capability, and
authorization boundaries stay untouched: Puck never sees the object graph, only
the fields FYD exposes for manual edit.

## Verdict summary

- Pick at most one visual-editor winner: **Puck** - but pick nothing today.
  Revisit only when manual editing becomes a demonstrated user need.
- Craft.js: rejected outright, not a fallback.
- Tiptap: rejected for now; adopt when long-form owner text editing is a
  demonstrated need.

## Sources (verbatim URLs, verified 2026-09-28)

- https://github.com/puckeditor/puck (releases: https://github.com/puckeditor/puck/releases - 0.23 current)
- https://github.com/puckeditor/puck/blob/HEAD/apps/docs/pages/docs/api-reference/data-model/data.mdx (Data model)
- https://github.com/puckeditor/puck/blob/HEAD/apps/docs/pages/docs/api-reference/components/puck.mdx (onPublish/onChange/overrides)
- https://github.com/puckeditor/skills/blob/HEAD/skills/puck/references/integration.md (integration notes: Data is plain JSON, auth must be app-owned)
- npm registry (registry.npmjs.org): @puckeditor/core@0.23.0 MIT peers react ^18.0.0 || ^19.0.0; @craftjs/core@0.2.12 MIT peers react ^16.8.0 || ^17 || ^18 || ^19; @tiptap/core@3.31.3, @tiptap/react@3.31.3, @tiptap/starter-kit@3.31.3 MIT, react ^17.0.0 || ^18.0.0 || ^19.0.0
- https://github.com/prevwong/craft.js (MIT; Editor/Frame, query.serialize docs)
- https://github.com/ueberdosis/tiptap (MIT core; paid Collaboration/Comments/Conversion/Pro add-ons)
- https://github.com/ueberdosis/tiptap/blob/HEAD/packages/static-renderer/README.md (SSR/static rendering)
- Security: GHSA-cp6q-959q-f8rh (mergeAttributes prototype pollution, patched tiptap 3.30.4) + Markdown-attribute DoS (patched 3.30.5); current 3.31.3 - per https://github.com/equationalapplications/curated-thoughts/blob/HEAD/docs/superpowers/specs/2026-09-02-tiptap-mergeattributes-dependabot-design.md
- https://github.com/soudis/soliloan/blob/HEAD/puck-vs-craftjs-analysis.md (third-party Puck-vs-Craft.js analysis corroborating dormancy and build issues - secondary source)
