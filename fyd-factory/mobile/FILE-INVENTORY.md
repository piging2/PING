# FYD Factory File Inventory — 2026-09-24 ~05:30 MDT

Source: `/home/nolan/projects/ping`, branch `fyd-factory`.
Baseline: the Sep 23 19:30 build (the `:3100` `next start` was launched Sep 23 19:31:08 MDT, PID 87920).

State at inventory time: **42 modified tracked files**, **119 untracked files**.
Nothing is committed. The commit decision (ONLY the coherent FYD object-layer
changeset) comes after the Phase-2 build is proven. This inventory separates the
three buckets per BUILDER-BRUTAL-CEO-HARVEST-2026-09-24.md.

Classification rule used: a file is FYD OBJECT-LAYER WORK when it owns or
directly serves the object/evidence graph, its projection (SiteSpec, renderer,
cards, circles, overlays, margin layer, spatial), its binding/visibility
contract, its media, its owner-customization, or its tests. Everything else is
OTHER-LANE WORK. Files whose lane cannot be determined from path, content, and
naming are UNKNOWN OWNERSHIP.

Phase-2 note: `src/fyd/components/renderer.tsx` (modified, object-layer) now
carries the Phase-2 mobile in-flow object composition (uncommitted):
`MobileInFlowObjects` + `data-object-anchor` on every `SectionShell` +
mobile-only object cards for BusinessSummary / Locations / Posts. The
`?objectDebug=1` gate on `MarginObjectLayer.tsx` is untouched.

---

## 1. FYD OBJECT-LAYER WORK

### Modified (tracked)

- src/app/o/[objectId]/page.tsx — object detail route
- src/app/sites/_shared/site-client.tsx — site shell; /o/ tap interception into ObjectOverlay
- src/app/sites/coppersmith-plumbing/page.tsx — demo site page (Coppersmith)
- src/app/sites/happy-place/page.tsx — demo site page (Happy Place)
- src/fyd/boundary/data-boundary.ts — projection data boundary
- src/fyd/builder/owner-intent.ts — owner intent over objects
- src/fyd/builder/site-vectors.ts — site composition vectors
- src/fyd/components/fyd-motion-fallback.tsx — motion fallback on site pages
- src/fyd/components/object-affordance.tsx — FYD mark affordance on cards
- src/fyd/components/object-rail.tsx — object rail
- src/fyd/components/registry.ts — section component registry (schema -> component)
- src/fyd/components/renderer.tsx — SiteSpec renderer; **Phase-2 mobile in-flow composition lives here**
- src/fyd/media/select.ts — media selection for object rendering
- src/fyd/object/__tests__/view.test.ts
- src/fyd/object/card.tsx — canonical object card
- src/fyd/object/evidence-chrome.tsx — evidence chrome on objects
- src/fyd/object/node.tsx — object node
- src/fyd/object/owner-overlay.ts — owner overlay on objects
- src/fyd/object/types.ts — object types
- src/fyd/object/view.ts — object view
- src/fyd/preview/pipeline.ts — preview pipeline (projection path)
- src/fyd/sitespec/binding-verifier.ts — STRONG binding verifier (projection seam)
- src/fyd/sitespec/graph.ts — sitespec graph + binding classifications
- src/fyd/sitespec/safe-link.ts — safe-link gate (projection seam)
- src/fyd/sitespec/schemas.ts — schema roles table
- src/fyd/ui/portal-circle.tsx — Circle object UI
- src/fyd/ui/portal-host.tsx — portal host

### Untracked

Object layer core:
- src/fyd/ui/object-layer/MarginObjectLayer.tsx — margin object plane (desktop rails; mobile null unless ?objectDebug=1; gate NOT touched by Phase 2)
- src/fyd/ui/object-layer/MobileSheet.tsx — debug explorer sheet (?objectDebug=1 only)
- src/fyd/ui/object-layer/placement.ts — deterministic document-space placement
- src/fyd/spatial/object-space.ts + src/fyd/spatial/__tests__/object-space.test.ts
- src/fyd/ui/spatial/center-portal.tsx
- src/fyd/ui/spatial/spatial-ask-panel.tsx
- src/fyd/ui/spatial/spatial-canvas.tsx
- src/fyd/ui/spatial/spatial-node.tsx

Object UI atoms + overlays:
- src/fyd/components/object-overlay.tsx — rich object overlay (scroll-preserving)
- src/fyd/ui/follow-button.tsx
- src/fyd/ui/like-button.tsx
- src/fyd/ui/reference-button.tsx
- src/fyd/ui/identity-object.tsx
- src/fyd/ui/global-ask-dock.tsx
- src/fyd/ui/home-circles.tsx

Object explorer routes:
- src/app/objects/page.tsx
- src/app/objects/objects-client.tsx
- src/app/objects/spatial/page.tsx
- src/app/objects/spatial/spatial-page-client.tsx
- src/app/sites/page.tsx — sites index

Ask FYD (object intelligence):
- src/fyd/ask/concierge.ts
- src/fyd/ask/context-compiler.ts
- src/fyd/ask/__tests__/concierge.test.ts
- src/fyd/ask/__tests__/context-compiler.test.ts

Owner customization / owner mode (object ownership):
- src/fyd/customize/owner-command-compiler.ts
- src/fyd/customize/owner-proposal.ts
- src/fyd/customize/__tests__/owner-commands.test.ts
- src/fyd/owner-mode/corrections.ts
- src/fyd/owner-mode/demo-owner-console.tsx
- src/fyd/owner-mode/facts.ts
- src/fyd/owner-mode/owner-identity.ts
- src/fyd/owner-mode/provenance.ts
- src/fyd/owner-mode/visibility-policy.ts
- src/fyd/owner-mode/jest.config.cjs
- src/fyd/owner-mode/__tests__/corrections.test.ts
- src/fyd/owner-mode/__tests__/owner-identity.test.ts
- src/fyd/owner-mode/__tests__/regen-proof.test.ts
- src/fyd/owner-mode/__tests__/visibility-policy.test.ts
- src/fyd/owner-mode/__tests__/clearwater-plumbing-demo.json

Composition strategies (object graph -> site):
- src/fyd/builder/strategies.ts
- src/fyd/builder/infer-strategy.ts
- src/fyd/builder/strategy-for-site.ts
- src/fyd/builder/__tests__/strategies.test.ts
- src/fyd/builder/__tests__/ping-fyd-dogfood-render.test.ts
- src/fyd/builder/__tests__/ping-fyd-error-gate.test.ts

Claim / binding attack tests:
- src/fyd/claim/__tests__/attack-render-path.test.ts
- src/fyd/claim/__tests__/attack-verifier-holes.test.ts
- src/fyd/claim/__tests__/css-stub.js
- src/fyd/boundary/__tests__/projection-seam-attack.test.ts

Graph invariants:
- src/fyd/invariants/jest.config.cjs
- src/fyd/invariants/__tests__/support.ts
- src/fyd/invariants/__tests__/hostile-view.ts
- src/fyd/invariants/__tests__/inv-01-canonical-graph.test.ts
- src/fyd/invariants/__tests__/inv-02-spec-determinism.test.ts
- src/fyd/invariants/__tests__/inv-03-hidden-no-leak.test.ts
- src/fyd/invariants/__tests__/inv-04-claims-fail-closed.test.ts
- src/fyd/invariants/__tests__/inv-05-url-schemes.test.ts
- src/fyd/invariants/__tests__/inv-06-correction-survives-reobservation.test.ts
- src/fyd/invariants/__tests__/inv-07-hide-preserves-evidence.test.ts
- src/fyd/invariants/__tests__/inv-08-unknown-capability.test.ts
- src/fyd/invariants/__tests__/inv-09-conflicting-evidence.test.ts
- src/fyd/invariants/__tests__/inv-10-invalidation-scope.test.ts

Render lineage (rendered element -> object/field -> claim -> evidence -> source):
- src/fyd/lineage/tracer.ts
- src/fyd/lineage/run-tracer.ts
- src/fyd/lineage/verify-tracer.ts
- src/fyd/lineage/spike-trace.ts
- src/fyd/lineage/jsx-probe.tsx
- src/fyd/lineage/css-loader.mjs
- src/fyd/lineage/register-css.mjs
- src/fyd/lineage/tsconfig.tracer.json
- src/fyd/lineage/tsconfig.tracer.tsbuildinfo

Object media:
- src/fyd/media/authority-binding.ts
- src/fyd/media/authority-projection.ts
- src/fyd/media/generated-treatment.ts
- src/fyd/media/media-tokens.ts
- src/fyd/media/owner-hero.ts
- src/fyd/media/synthetic.ts
- src/fyd/media/manifests/ping-fyd.json
- src/fyd/media/__tests__/authority-binding.test.ts
- src/fyd/media/__tests__/authority-projection.test.ts
- src/fyd/media/__tests__/generated-treatment.test.ts
- src/fyd/media/__tests__/media-tokens.test.ts
- src/fyd/media/__tests__/owner-hero.test.ts
- src/fyd/media/__tests__/pipeline-contract.test.ts
- src/fyd/media/__tests__/synthetic.test.ts

Object-layer UI tests:
- src/fyd/ui/__tests__/card-placement.test.tsx
- src/fyd/ui/__tests__/circle-progressive.test.tsx
- src/fyd/ui/__tests__/expansion.test.ts
- src/fyd/ui/__tests__/placement.test.ts
- src/fyd/ui/__tests__/star-layout.test.ts
- src/fyd/components/__tests__/mobile-visibility.test.ts — mobile object visibility regression (directly relevant to Phase 2)
- src/fyd/components/__tests__/ping-fyd-dogfood.test.ts

Sitespec support:
- src/fyd/sitespec/schema-roles.ts
- src/fyd/sitespec/sites-render-audit.ts

Circle test script:
- scripts/test-circle-reset.ts

---

## 2. OTHER-LANE WORK

### Modified (tracked)

- package.json — dependency manifest
- src/app/build/[siteId]/page.tsx — builder UI lane (site builder surface)
- src/app/globals.css — global styles
- src/app/layout.tsx — app shell
- src/app/page.tsx — PING marketing homepage (hosts the MarginObjectLayer mount + anchors, but the page itself is the marketing lane; the layer file is untouched)
- src/app/portal-rail/rail-client.tsx — portal rail lane
- src/components/architecture/hero-evidence-card.tsx — homepage architecture section
- src/components/blueprint-grid.tsx — homepage visuals
- src/components/lenis-provider.tsx — scroll behavior
- src/components/scroll-reveal.tsx — motion
- src/components/site-header.tsx — site chrome
- src/fyd/boundary/jest.config.cjs — test infra
- src/fyd/sitespec/__tests__/schemas.test.ts — test
- src/middleware.ts — routing/middleware
- src/motion/motionTokens.ts — motion tokens

### Untracked

- .github/agents/falsifier.agent.md
- .github/agents/harvester.agent.md
- .github/agents/security.agent.md
- .github/copilot-instructions.md
- .github/instructions/evidence-provenance.instructions.md
- .github/instructions/fyd-proceduralizer.instructions.md
- .github/instructions/fyd-tests.instructions.md
- .github/instructions/security-sensitive.instructions.md
- .github/instructions/sitespec-renderer.instructions.md
- .github/instructions/social-adapters.instructions.md
- geometry-regression.mjs — regression script
- src/components/effects-provider.tsx — effects lane
- src/components/effects-toggle.tsx — effects lane
- src/components/hero-intro.tsx — homepage hero
- src/fyd/jest.config.cjs — test infra
- src/lib/secrets/README.md — gateway secrets lane
- src/lib/secrets/secret-broker.ts — gateway secrets lane
- src/lib/secrets/jest.config.cjs — gateway secrets lane
- src/lib/secrets/__tests__/secret-broker.redteam.test.ts — gateway secrets lane (pre-existing tsc errors here; unrelated to Phase 2; do NOT absorb into the object-layer commit)

---

## 3. UNKNOWN OWNERSHIP

Proceduralizer ingestion fixtures (redacted business fixtures for batch C).
Likely the proceduralize/ingestion lane rather than the object layer, but no
lane marker found in the files themselves. Do NOT include in the coherent
object-layer commit without lane-owner confirmation.

- src/fyd/proceduralize/__fixtures__/redacted-batch-c-consultant.ts
- src/fyd/proceduralize/__fixtures__/redacted-batch-c-cpa.ts
- src/fyd/proceduralize/__fixtures__/redacted-batch-c-dentist.ts
- src/fyd/proceduralize/__fixtures__/redacted-batch-c-lawfirm.ts

---

## Commit guidance (for the parent after Phase-2 proof)

The coherent FYD object-layer changeset = bucket 1 (FYD OBJECT-LAYER WORK)
including the Phase-2 renderer.tsx edits. Buckets 2 and 3 stay out. In
particular: do NOT absorb `src/lib/secrets/*` (gateway lane, and its redteam
test currently fails `tsc`), `.github/*`, the effects lane, or the
proceduralize fixtures of unknown ownership.
