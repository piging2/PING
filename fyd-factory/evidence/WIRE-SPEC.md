# WIRE-SPEC: Strong Binding Verification for the /sites Render Path

**Lane:** LANE-EVIDENCE-WIRE-SPEC
**Date:** 2026-09-23
**Status:** Design complete. Four safe patch proposals generated. All pass `git apply --check` on Pig branch `fyd-factory` at `e48ef710`. NOT applied to Pig.

## 1. Problem

QA-TRUTH (2026-09-23) found three truth failures on the /sites demo pages, with root causes:

- **R-A:** `/sites/happy-place` and `/sites/coppersmith-plumbing` call `generateSiteSpec` directly. Strong verification runs only through `planSite` (used by `/build/[siteId]`). The BindingVerifier saw 0% of /sites claims by construction.
- **R-B:** Renderer-injected factual strings (footer provenance, rights-basis steps, contact provenance wording) live outside the `PresentationBinding` model entirely.
- **R-C:** The evidence-state to UI-wording layer overclaims (`observed` renders as "Verified").

LANE-CLAIM added:

- **H4/R-H4:** Two-verifier seam. The renderer resolves factual fields through `resolveBoundField` → `verifyPresentationBinding`, which accepts `derived` and `owner_authored` unconditionally. The strong `verifyBinding` correctly rejects `owner_authored` without a recorded assertion. An owner-authored phone can render while the strong verifier reports UNBOUND.
- **R-MODEL:** Public /sites pages do not build or consume `VerifiedRenderModel`. A graph modified after model construction renders modified values.

## 2. Design Constraints

1. The frozen golden donor (`/sites/happy-place` at `e48ef710`) must keep its exact composed semantics: the pipeline `getPingObjectGraph → generateSiteSpec → applyPresentationIntent → heroMediaFor → validateSiteSpec → SiteClient → SitePageView`, zero validation findings, byte-identical rendered output.
2. Do NOT route the golden route through `planSite` (would introduce strategy/archetype composition).
3. Do NOT put verification inside `generateSiteSpec` (preserve its deterministic compiler contract).
4. Do NOT duplicate convergence-wave substrate work (the deeper verifier defects are owned elsewhere).
5. Patches must be safe: observation-first, no behavior change on golden, no test breakage.

## 3. Solution: Four Patches

### P-1: Footer provenance reads spec.provenance (fixes F-001)
`src/app/sites/_shared/site-client.tsx`: The footer no longer hardcodes "(acceptance sequences 65-83)". New `provenanceSentence(spec)` renders `spec.provenance`, appending the event-sequences parenthetical only when the spec carries an `eventSequences` pair. On golden, `spec.provenance` is `{source: "website-ingestion", eventSequences: [65, 83]}`, so the output is byte-identical. On coppersmith (no sequences), the false parenthetical is dropped.

### P-2: Rights-basis step labeled "inferred" (fixes F-002 misgrade)
`src/fyd/components/renderer.tsx`: Both "Rights basis" EvidenceSteps (HeroMediaWhyThis, GalleryMediaWhyThis) now use state `"inferred"` instead of `"observed"`. The sentence comes from `classifyRights`, a URL heuristic with no authorization evidence. Golden renders no rights step (no media), so zero DOM change on golden.

### P-4: Observation-only render audit (addresses R-A and R-MODEL)
New module `src/fyd/sitespec/sites-render-audit.ts`:
- `deriveSpecBindings(spec, graph)`: enumerates the factual atoms the page will present (owner title/description plus title/description of every object each section query resolves) as `PresentationBinding`s. The query resolver mirrors `renderer.resolveQuery`.
- `RENDERER_INJECTED_CLAIMS`: static registry of the five factual strings the renderer injects outside the binding model (footer provenance, rights step, contact wording, demo banner, AskFYD scope), each with its evidence basis and fix state. This enumerates the R-B surface.
- `auditSitesRenderClaims(spec, graph, siteId)`: runs every binding through the STRONG `verifyBinding` with `ownerAssertionsFromGraph`. Never throws (per-binding try/catch). Deterministic: pure function of `(spec, graph, siteId)`; timestamp is `spec.generator.generatedAt`, never the clock.
- `logSitesRenderAudit(audit)`: one structured log line per render.

Both `/sites` page server components call the tap after `validateSiteSpec`, inside try/catch. The tap observes the graph AS IT IS AT RENDER TIME, which is the R-MODEL gap (post-model tampering is now visible in verdicts).

Why not a gate: a fail-closed gate would change the route's composed semantics the first time any atom grades UNBOUND. Promotion to a gate is a post-thaw decision.

### P-5: Verifier reconciliation (fixes H4/R-H4)
- `src/fyd/sitespec/binding-verifier.ts`: new export `resolveBoundFieldVerified(graph, binding, ownerAssertions = [])`, the publish-path field resolver. Delegates to the STRONG `verifyBinding`; returns the value only on BOUND, else undefined. Pure addition.
- `src/fyd/components/renderer.tsx`: `boundField` (which feeds `boundTitle`, `boundDescription`, and every factual field read) now resolves through `resolveBoundFieldVerified` with `ownerAssertionsFromGraph(ctx.graph)`. The renderer no longer consults the weak verdict for any publish decision. The misleading comment block is corrected.
- `src/fyd/sitespec/graph.ts`: `resolveBoundField` docblock corrected to disclaim publish authority (resolution primitive only). No behavior change.

Deliberately NOT done: `verifyPresentationBinding`'s `derived`/`owner_authored` arms were NOT strengthened. Blockers: (a) `bindings.test.ts:125` pins the current behavior; (b) the strong `verifyBinding` builds on the primitive, so fail-closing it would break legitimate `owner_authored` bindings on the planner path; (c) the primitive's signature has no assertion input. The primitive stays dumb; authority moves to the caller holding the assertions.

Golden safety for P-5: LANE-CLAIM's baseline proves every factual value on both fixture sites BINDS under the strong verifier (zero misses), so the rewire returns identical values on golden. The only behavior delta is for `derived`/`owner_authored` WITHOUT supporting evidence, which previously rendered and now correctly omit; this fires on no current fixture data.

## 4. Deferred (NOT in these patches)

- **F-003 (contact "Verified from" wording):** Changes golden DOM. Deferred until golden thaw. The exact diff is recorded in section 11 of the workspace patch notes.
- **classifyRights sentence rewrite:** The "authorized for acquisition" wording lives in acquisition-time manifests; changing `discover.ts` alone fixes no live page. Deferred to the media lane with manifest re-acquisition.
- **Fail-closed promotion:** The P-4 audit tap becomes a gate only post-thaw, after verifier substrate defects close.
- **Query-resolver parity test:** `deriveSpecBindings`'s resolver mirrors `renderer.resolveQuery`; a parity test is a follow-up.

## 5. DO-NOT-CHANGE List

1. **Route composition:** Do not route `/sites/happy-place` through `planSite`, strategy, or archetype composition. The frozen pipeline is `getPingObjectGraph → generateSiteSpec → applyPresentationIntent → heroMediaFor → validateSiteSpec → SiteClient → SitePageView`.
2. **Generator output:** Do not change `generateSiteSpec`'s output, field order, or deterministic contract. Verification stays out of the generator.
3. **Validation semantics:** Do not change `validateSiteSpec` findings. Golden has zero findings; that property is frozen.
4. **Golden rendered bytes:** No patch may alter the Happy Place DOM. P-1 renders byte-identical output on golden; P-2 does not execute on golden (no media); P-4 is observation-only; P-5 returns identical values on golden (proven by LANE-CLAIM baseline).
5. **Shared registry/JSX:** Do not modify the component registry or shared JSX in ways that alter golden rendering.
6. **Presentation-intent behavior:** `applyPresentationIntent` semantics are frozen for the golden route.
7. **Privacy boundary:** The visibility model (`public`/`owner`/`hidden`) is untouched. The audit only reads public objects.
8. **Motion/responsiveness:** No changes to animation, layout, or responsive behavior.
9. **Convergence-owned internals:** Do not touch the verifier substrate defects owned by the convergence wave (derived-claim evidence, owner-correction laundering, per-field evidence loss, digest identity, transformed-text blindness). This lane only reconciles the call site.
10. **Other lanes' edits:** The Pig worktree has 108 modified files from other lanes. Patches were generated against the live dirty worktree and must not overwrite unrelated edits.
11. **Test pins:** Do not break `bindings.test.ts:125` (pins the weak primitive) or any golden-path tests (500 green at freeze).

## 6. Verification

All four patches pass `git apply --check` on Pig branch `fyd-factory` at commit `e48ef710` (checked 2026-09-23):

- `sites-wire-p1-footer-provenance.patch`: PASS
- `sites-wire-p2-rights-inferred.patch`: PASS
- `sites-wire-p4-render-audit.patch`: PASS
- `sites-wire-p5-verifier-reconciliation.patch`: PASS

Patches were generated against the live dirty worktree via `git diff --no-index` to guarantee correct context. Nothing was applied to the Pig; `git apply --check` is read-only.

## 7. Deliverables

- This spec: `~/workspace/fyd-factory/evidence/WIRE-SPEC.md`
- Patches: `~/workspace/fyd-factory/patches/sites-wire-p{1,2,4,5}-*.patch`
- No em dashes used in any deliverable.
