# AGENT 18: Domain Audit — Happy Place / Coppersmith / Ask FYD

Agent 18 of the 20-agent FYD Factory forensic program. Read-only audit.
Nothing in this report was changed, committed, published, or sent outward.

## 0. Audit provenance

- Repo: `/home/nolan/projects/pig` (read-only for this audit; no file touched, no commit made)
- Branch: `fyd-factory`
- HEAD at time of audit: `e48ef710cb889bf4d59b833ef9766067a9e2bbf0`
- Working tree: dirty, 103 entries observed 2026-09-24 (parallel-worker drift; task brief cited 93 earlier). Untracked dirs include `src/fyd/lineage/`, `src/app/objects/`, `src/fyd/preview/`, `.github/`; modified-but-uncommitted include `src/middleware.ts`, `src/fyd/identity/*`, `src/app/api/fyd/ask/*`.
- Method: source read through `~/workspace/bin/wsl-run.sh` stdin-fed scripts; no Pig working-tree modification; scratch under `~/workspace/fyd-factory/forensics/scratch/`.
- Observation date: 2026-09-24.
- Known context carried in: CLAIM-VERDICT.md (2026-09-23, FAIL), HOSTILE-VERDICT.md (2026-09-24, FAIL). Findings here re-verify, never contradict.
- Confidence levels are honest: "high" means confirmed by direct source read; "medium" means confirmed structurally but with one untested hop; "task-context" means supplied by the task brief and not independently re-read.

### Shared architecture both site domains run on

```
HTTP page  src/app/sites/<site>/page.tsx
  -> getPingObjectGraph(siteId)          [disk dump projection; digest verified]
  -> generateSiteSpec(graph)             [proceduralize]
  -> applyPresentationIntent(spec)       [happy-place ONLY]
  -> heroMediaFor(siteId, graph, owner)  [media select]
  -> validateSiteSpec(spec)              [structure only, not truth]
  -> SiteClient(publicGraph)             [client serialization strips non-public]
  -> renderer renderSection/SitePageView [weak verifyPresentationBinding via boundField]
```

```
Ask FYD  POST /api/fyd/ask/[siteId]  (trusted)  or  POST /api/fyd/ask  (legacy)
  -> ask-pipeline.ts
  -> loadBundleWithOwnerOverlay          [fixture graph + journal overlays + owner overlay]
  -> answerAskFyd (visitor-answer.ts)    [visibility filter, public filter, bounded context]
  -> composeAskFyd -> composeAnswer      [generic composer; concierge NOT wired]
  -> JSON { answer, answerClass, refusal, citations, unknowns, actions, proposal, tenantId }
```

The two pipelines do not read the same source. That is the central finding of this audit.

---

## 1. HAPPY PLACE domain

### HP-1. Public page never invokes the strong verifier

DOMAIN / Happy Place
COMPONENT / `src/app/sites/happy-place/page.tsx` -> `src/fyd/components/renderer.tsx` (`boundField`/`resolveBoundField`) -> `src/fyd/sitespec/graph.ts` (`verifyPresentationBinding`)
CLAIM / The public page reads every factual value through the weak `verifyPresentationBinding` (owner_authored and derived pass unconditionally; direct requires only a non-empty provenance ref). The strong `verifyBinding` in `src/fyd/sitespec/binding-verifier.ts` is never invoked on this path.
EVIDENCE / page.tsx chain: `getPingObjectGraph("happy-place")`, `generateSiteSpec`, `applyPresentationIntent`, `heroMediaFor`, `validateSiteSpec`, `SiteClient`, `SitePageView`. `boundField` (renderer.tsx line ~709) calls `resolveBoundField` with default classification `"direct"`. Only non-test `buildVerifiedRenderModel` caller in the tree is `src/fyd/builder/planner.ts` (used by the disabled `/build` route). Contact values are read with `"owner_authored"` (renderer.tsx line ~775), which passes unconditionally.
CALLER / `src/app/sites/happy-place/page.tsx`
CALLEE / `resolveBoundField` (`src/fyd/sitespec/graph.ts`)
WRITER / FYD Factory lanes (proceduralize, customize, media)
READER / Anonymous site visitor
AUTHORITY / Code-read, high
CLASSIFICATION / boundary-bypass (weak verifier on the public render path)
CONFIDENCE / high
BROKEN BOUNDARY / The declared binding authority (`binding-verifier.ts`) is not the authority the public page actually answers to (`sitespec/graph.ts`). Two verifier implementations compete over the same capability.
DEPENDENCIES / `src/fyd/sitespec/graph.ts`, `src/fyd/components/renderer.tsx`, `src/fyd/builder/planner.ts`
AFFECTS AGENTS / Claim-verdict agents (H3/H4/H5/H9 seams), hostile-projection agents, Agent 17 (Ask trace), renderer lane

### HP-2. Presentation intent mutates rendered copy after generation without re-verification (happy-place only)

DOMAIN / Happy Place
COMPONENT / `src/fyd/customize/apply-layer.ts` (`applyPresentationIntent`), invoked only from the happy-place page
CLAIM / Happy Place is the only site that applies presentation intent. Directives (`edit_copy`, `reorder_section`, `toggle_section`, `set_featured`) apply over the compiled spec after `generateSiteSpec`; the resulting headings/copy render via `presentation.heading ?? boundTitle(ctx, o)` (renderer.tsx lines ~944-945) without passing the strong verifier again. The layer is pure, digest-pins each proposal, and keeps unresolved directives visible, but it is a post-generation mutation of presented claims.
EVIDENCE / page.tsx applies `applyPresentationIntent` between `generateSiteSpec` and render; coppersmith page does not call it. `apply-layer.ts` header documents purity, digest checks, and unresolved-directive surfacing. Renderer line ~944-945 falls back to boundTitle only when no presentation copy exists.
CALLER / `src/app/sites/happy-place/page.tsx`
CALLEE / `applyPresentationIntent`
WRITER / Owner via `/api/fyd/customize` (proposal journal)
READER / Anonymous site visitor
AUTHORITY / Code-read, high
CLASSIFICATION / residual-risk (mitigated by digest pinning + owner authorization, but unverified at render)
CONFIDENCE / high
BROKEN BOUNDARY / Presentation-vs-fact boundary: `edit_copy` can change rendered claims with no binding re-check.
DEPENDENCIES / `src/fyd/proceduralize/patch.ts` (proposalDigest), `data/fyd-customize/` journal
AFFECTS AGENTS / Customize lane, owner-mode agents, claim-verdict agents

### HP-3. Shared footer makes provenance claims that are false on this page

DOMAIN / Happy Place
COMPONENT / `src/app/sites/_shared/site-client.tsx` (SiteClient footer)
CLAIM / The footer hardcodes two claims: "All claims on this page are website statements, never verified fact" and "Generated by FYD Social from a website-ingestion object graph (acceptance sequences 65-83)". On happy-place the page also renders owner corrections (`CorrectionNote` naming both values), canonical-journal overlay objects, and (in owner demo) `overlay-authored` demo objects, which are not website statements. The 65-83 sequences string is hardcoded in the shared client.
EVIDENCE / site-client.tsx footer text observed; `demo-mode-objects.ts` minting `overlay-authored` objects; renderer `ContactSection` rendering `CorrectionNote` with source-vs-owner values; tenant pin for happy-place `eventSequences: [65, 83]`.
CALLER / `SiteClient`
CALLEE / none (static JSX)
WRITER / FYD Factory frontend lane
READER / Anonymous site visitor
AUTHORITY / Code-read, high
CLASSIFICATION / misattribution (presented provenance contradicts composed content)
CONFIDENCE / high
BROKEN BOUNDARY / Presented-truth vs actual-truth: the footer asserts a single provenance story for a multi-authority composition.
DEPENDENCIES / `src/fyd/object/demo-mode-objects.ts`, `src/fyd/data/fyd-tenant-graph.ts`
AFFECTS AGENTS / Provenance/evidence agents, owner-mode agents

### HP-4. DemoOwnerMode mounts only on happy-place; preview approval is client-only state

DOMAIN / Happy Place
COMPONENT / `src/app/sites/happy-place/page.tsx` (DemoOwnerMode), `site-client.tsx` preview proposal approval
CLAIM / `DemoOwnerMode` mounts on happy-place only. The client-side preview customization lets a visitor approve a proposal, but approval changes React state only and persists nothing.
EVIDENCE / page.tsx mounts DemoOwnerMode; coppersmith page does not. site-client.tsx preview approval path observed.
CALLER / happy-place page.tsx
CALLEE / DemoOwnerMode / preview state
WRITER / FYD Factory frontend lane
READER / Visitor interacting with preview
AUTHORITY / Code-read, high
CLASSIFICATION / informational (no boundary broken; asymmetry noted)
CONFIDENCE / high
BROKEN BOUNDARY / none, but the happy-place/coppersmith asymmetry is a product-consistency gap.
DEPENDENCIES / `src/fyd/components/site-client.tsx`
AFFECTS AGENTS / Owner-mode agents, preview-route worker

### HP-5. Owner corrections exist for happy-place and render honestly in the contact section

DOMAIN / Happy Place
COMPONENT / `src/fyd/components/renderer.tsx` (`ContactSection`, `contactMethod`, `CorrectionNote`), `data/fyd-owner/happy-place.json`
CLAIM / Owner-corrected phone/email are read with classification `"owner_authored"` (passes the weak verifier unconditionally, see HP-1) and rendered with a `CorrectionNote` that names both the source value and the owner value. The contact affordance (`FydContactLink`) gates through safety checks; an unverifiable or unsafe number/email renders nothing. This is the one place where the source-vs-owner distinction is presented honestly.
EVIDENCE / renderer.tsx lines ~1393-1420: comment "the displayed value is owner state (durable, survives re-ingestion), not a website statement. The correction record stays on the object so the section can name both values honestly." `data/fyd-owner/` contains only `happy-place.json`.
CALLER / renderer `ContactSection`
CALLEE / `correctionFor`, `contactMethod`
WRITER / Business owner (owner events -> `owner-store.ts`, append-only)
READER / Anonymous site visitor
AUTHORITY / Code-read, high
CLASSIFICATION / strength (honest dual-value presentation) with a verifier caveat (owner_authored passes unconditionally)
CONFIDENCE / high
BROKEN BOUNDARY / none at presentation; the verifier seam (H4) sits underneath.
DEPENDENCIES / `src/fyd/object/owner-store.ts`, `src/fyd/object/owner-overlay.ts`
AFFECTS AGENTS / Owner-mode agents, claim-verdict agents (H3/H4)

### HP-6. Dual read authority: the page and Ask FYD do not read the same source

DOMAIN / Happy Place
COMPONENT / `src/fyd/data/ping-object-source.ts` (page path) vs `src/fyd/data/fyd-tenant-graph.ts` (Ask path)
CLAIM / The happy-place page reads the PING-side dump projection at `/home/nolan/ping/var/fyd-projections/happy-place.json` (written by an external dump script, digest-verified at read). Ask FYD reads a pinned in-repo fixture (`HAPPY_PLACE_GRAPH`) plus live journal overlays via `PingObjectReader` (digest-pinned, `eventSequences: [65, 83]`). `site-bundle.ts` comments claim the bundle is "exactly as the public /sites pages render it (same graph, same generator inputs)"; source inspection shows two different read authorities, two different composition behaviors, and different meta (dump meta vs pinned `generatedAt: "2026-09-21T12:00:00"`).
EVIDENCE / `ping-object-source.ts`: reads disk JSON, verifies `meta.siteId`, non-empty provenance refs, graph SHA-256, optional presentation-intent digest, then composes owner corrections after digest verification. `fyd-tenant-graph.ts`: pinned fixture + `queryFydSiteOverlays`, composed graph digest, rebuilt on each read. happy-place page calls `getPingObjectGraph`; ask route calls `getSiteBundle` -> `getFydTenantGraph`. site-bundle.ts docstring claims same-graph equivalence.
CALLER / page.tsx (dump path) / ask-pipeline.ts (fixture path)
CALLEE / `getPingObjectGraph` / `getFydTenantGraph`
WRITER / dump script (PIG side) / FYD Factory fixture + journal writers
READER / Visitor (page) / visitor (Ask)
AUTHORITY / Code-read, high
CLASSIFICATION / broken-boundary (single-source-of-truth violated)
CONFIDENCE / high
BROKEN BOUNDARY / The "one authoritative graph" boundary. Site and Ask can disagree after any journal write that postdates the last dump, and they disagree structurally on meta and composition.
DEPENDENCIES / `/home/nolan/ping/var/fyd-projections/happy-place.json`, `src/fyd/proceduralize/__fixtures__/happy-place-graph.ts`, `PingObjectReader`
AFFECTS AGENTS / Projection lane, journal/overlay agents, Agent 17, lineage lane (LANE-LIN)

### HP-7. `/o` object capability lane still interpolates raw values into hrefs (BYPASS-1/2 open)

DOMAIN / Happy Place (shared component, affects both sites)
COMPONENT / `src/fyd/object/view.ts` (`buildCapabilities`, lines ~207-211)
CLAIM / `call`/`email`/`website` capabilities still build hrefs by raw string interpolation (`"tel:" + contact.phone`, `"mailto:" + contact.email`, `href: contact.website`) with no `resolveSafeLink` gate. The patch `~/workspace/fyd-factory/patches/o-capability-safe-link.patch` exists but is not applied in the tree. HOSTILE-VERDICT BYPASS-1/2 remain open.
EVIDENCE / grep of view.ts shows no `resolveSafeLink` and no scheme check; lines 207/209/211 interpolate raw values. Middleware re-enabled `/o/*` on 2026-09-23, so the lane is live.
CALLER / `/o/[objectId]` page
CALLEE / `buildCapabilities`
WRITER / FYD Factory object lane
READER / Visitor clicking capabilities on an object page
AUTHORITY / Code-read, high
CLASSIFICATION / vulnerability (hostile-projection, open)
CONFIDENCE / high
BROKEN BOUNDARY / Safe-link boundary: untrusted contact strings reach `href` without scheme validation.
DEPENDENCIES / `src/fyd/object/view.ts`, `src/fyd/object/link-safety.ts` (the unused safe resolver)
AFFECTS AGENTS / Hostile-projection agents, security agents

---

## 2. COPPERSMITH domain

### CP-1. Same weak-verifier render path as happy-place

DOMAIN / Coppersmith
COMPONENT / `src/app/sites/coppersmith-plumbing/page.tsx` -> renderer (`resolveBoundField`)
CLAIM / Identical to HP-1: `getPingObjectGraph("coppersmith-plumbing")`, `generateSiteSpec`, `heroMediaFor`, `validateSiteSpec`, `SiteClient`, `SitePageView`. No `buildVerifiedRenderModel`, no planner, no strong verification. The only chain differences from happy-place are: no `applyPresentationIntent`, no `DemoOwnerMode`.
EVIDENCE / coppersmith-plumbing/page.tsx chain observed; same imports from `src/fyd/data/ping-object-source.ts`.
CALLER / `src/app/sites/coppersmith-plumbing/page.tsx`
CALLEE / `resolveBoundField`
WRITER / FYD Factory lanes
READER / Anonymous site visitor
AUTHORITY / Code-read, high
CLASSIFICATION / boundary-bypass (same two-verifier split as HP-1)
CONFIDENCE / high
BROKEN BOUNDARY / Declared binding authority vs actual render path.
DEPENDENCIES / same as HP-1
AFFECTS AGENTS / same as HP-1

### CP-2. No presentation intent, no demo mode: narrower attack surface than happy-place

DOMAIN / Coppersmith
COMPONENT / `src/app/sites/coppersmith-plumbing/page.tsx`
CLAIM / Coppersmith applies no presentation-intent layer and mounts no DemoOwnerMode, so the HP-2 and HP-4 concerns do not apply. Rendered copy comes straight from `generateSiteSpec` plus renderer defaults.
EVIDENCE / page.tsx chain has no `applyPresentationIntent` and no `DemoOwnerMode`.
CALLER / n/a
CALLEE / n/a
WRITER / n/a
READER / Anonymous site visitor
AUTHORITY / Code-read, high
CLASSIFICATION / informational
CONFIDENCE / high
BROKEN BOUNDARY / none
DEPENDENCIES / none
AFFECTS AGENTS / none

### CP-3. Shared footer provenance string is wrong for coppersmith

DOMAIN / Coppersmith
COMPONENT / `src/app/sites/_shared/site-client.tsx` (shared footer)
CLAIM / The shared footer says "acceptance sequences 65-83", but the coppersmith tenant pin has `eventSequences: null`. The sequences string is hardcoded in the shared client and describes happy-place's pin, not coppersmith's. The "all claims are website statements" line is also inaccurate wherever canonical-journal overlay objects render.
EVIDENCE / site-client.tsx footer; tenant-graph.ts: happy-place `eventSequences: [65, 83]`, coppersmith `eventSequences: null`.
CALLER / `SiteClient`
CALLEE / none (static JSX)
WRITER / FYD Factory frontend lane
READER / Anonymous site visitor
AUTHORITY / Code-read, high
CLASSIFICATION / misattribution
CONFIDENCE / high
BROKEN BOUNDARY / Presented provenance vs actual per-tenant state.
DEPENDENCIES / `src/fyd/data/fyd-tenant-graph.ts`
AFFECTS AGENTS / Provenance/evidence agents

### CP-4. No owner state exists for coppersmith

DOMAIN / Coppersmith
COMPONENT / `data/fyd-owner/` (contains only `happy-place.json`), `src/fyd/object/owner-store.ts`
CLAIM / There is no `data/fyd-owner/coppersmith-plumbing.json`. Owner corrections, the owner overlay, and the honest dual-value contact presentation (HP-5) are unavailable for coppersmith. The owner store is keyed by object/site string with no observed `TenantContext` use in the owner store/events files, so multi-tenant owner isolation rests on filename convention, not enforced scoping.
EVIDENCE / directory listing of `data/fyd-owner/`; `owner-store.ts` append-only, keyed by object/site string.
CALLER / n/a
CALLEE / `loadBundleWithOwnerOverlay` (no-op for coppersmith)
WRITER / n/a
READER / n/a
AUTHORITY / Code-read, high
CLASSIFICATION / gap (missing capability + weak tenant isolation by convention)
CONFIDENCE / high
BROKEN BOUNDARY / Tenant isolation for owner state is conventional, not enforced.
DEPENDENCIES / `src/fyd/object/owner-store.ts`, `src/fyd/object/owner-events.ts`
AFFECTS AGENTS / Owner-mode agents, tenant-context agents

### CP-5. Dual read authority applies identically

DOMAIN / Coppersmith
COMPONENT / `src/fyd/data/ping-object-source.ts` vs `src/fyd/data/fyd-tenant-graph.ts`
CLAIM / Same as HP-6: the coppersmith page reads `/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json`; Ask FYD for coppersmith reads the pinned `COPPERSMITH_GRAPH` fixture plus journal overlays (pinned `eventSequences: null`). The site-bundle.ts "same graph" claim is contradicted by source inspection here too.
EVIDENCE / Same code paths; coppersmith page calls `getPingObjectGraph("coppersmith-plumbing")`; tenant-graph.ts pins the coppersmith fixture and null sequences.
CALLER / page.tsx / ask-pipeline.ts
CALLEE / `getPingObjectGraph` / `getFydTenantGraph`
WRITER / dump script / fixture + journal writers
READER / Visitor (page) / visitor (Ask)
AUTHORITY / Code-read, high
CLASSIFICATION / broken-boundary
CONFIDENCE / high
BROKEN BOUNDARY / Single source of truth.
DEPENDENCIES / `/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json`, `src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts`
AFFECTS AGENTS / same as HP-6

### CP-6. `/o` bypass applies to coppersmith objects equally

DOMAIN / Coppersmith
COMPONENT / `src/fyd/object/view.ts` (`buildCapabilities`)
CLAIM / Same as HP-7: the object page capability lane is shared and unpatched; any coppersmith object with a hostile website/phone value renders an ungated href.
EVIDENCE / Same as HP-7.
CALLER / `/o/[objectId]` page
CALLEE / `buildCapabilities`
WRITER / FYD Factory object lane
READER / Visitor
AUTHORITY / Code-read, high
CLASSIFICATION / vulnerability (open)
CONFIDENCE / high
BROKEN BOUNDARY / Safe-link boundary.
DEPENDENCIES / same as HP-7
AFFECTS AGENTS / Hostile-projection agents, security agents

---

## 3. ASK FYD domain

### AQ-1. Two routes: trusted path is sound, legacy path still live

DOMAIN / Ask FYD
COMPONENT / `src/app/api/fyd/ask/[siteId]/route.ts` (trusted) vs `src/app/api/fyd/ask/route.ts` (legacy), `src/app/api/fyd/ask/ask-pipeline.ts`
CLAIM / The trusted path derives the tenant from the URL and rejects a body `siteId` mismatch after `requireTenantContext` validation. The legacy flat route still trusts a validated body `siteId`. Both are live. UI is split: `ask-fyd-widget.tsx` (line 57) still fetches `/api/fyd/ask`; `identity-object.tsx`, `home-circles.tsx`, `spatial-ask-panel.tsx`, `global-ask-dock.tsx` use the trusted path.
EVIDENCE / Both route files present; widget fetch target observed; four trusted-path UI callers observed.
CALLER / Browser widget / UI surfaces
CALLEE / ask-pipeline.ts
WRITER / FYD Factory ask lane
READER / Visitor asking a question
AUTHORITY / Code-read, high
CLASSIFICATION / inconsistency (two tenant-derivation authorities, one weaker)
CONFIDENCE / high
BROKEN BOUNDARY / Single tenant-derivation authority.
DEPENDENCIES / `src/fyd/tenant/tenant-context.ts` (`requireTenantContext`)
AFFECTS AGENTS / Tenant-context agents, ask-lane agents

### AQ-2. Bundle source is fixture+overlays, not the dump the pages render

DOMAIN / Ask FYD
COMPONENT / `src/fyd/data/fyd-tenant-graph.ts`, `src/fyd/media/site-bundle.ts` (`getSiteBundle`), `src/app/api/fyd/ask/ask-pipeline.ts` (`loadBundleWithOwnerOverlay`)
CLAIM / Ask FYD never reads `/home/nolan/ping/var/fyd-projections/`. It composes a graph from pinned in-repo fixtures (`HAPPY_PLACE_GRAPH` digest `f2b0e8a34f4d68d1df9fd8aefb47bdc1`, `COPPERSMITH_GRAPH` digest `d2cf3a2d1d84d0a6bcdd2e9fde6e4ea8fc`), applies sanitized journal overlays via `PingObjectReader.queryFydSiteOverlays` (eventSequences `[65,83]` / `null`), rebuilds on every read (no cache), then generates a SiteSpec from that graph. `site-bundle.ts` comments claim this is "exactly as the public /sites pages render it (same graph, same generator inputs)"; the two read paths have different authorities, different meta, and different composition timing, so the claim is not established by the code.
EVIDENCE / `fyd-tenant-graph.ts` docstring (fixture + overlays, digest pins, rebuilt on each read); `site-bundle.ts` docstring ("same graph" claim); `ping-object-source.ts` (dump path); happy-place page uses `getPingObjectGraph`.
CALLER / ask-pipeline.ts `loadBundleWithOwnerOverlay`
CALLEE / `getSiteBundle` -> `getFydTenantGraph`
WRITER / FYD Factory fixture authors + journal writers
READER / Visitor asking a question
AUTHORITY / Code-read, high
CLASSIFICATION / broken-boundary (dual data authority; also see HP-6/CP-5)
CONFIDENCE / high
BROKEN BOUNDARY / One authoritative graph for sites and Ask.
DEPENDENCIES / `src/fyd/proceduralize/__fixtures__/`, `PingObjectReader`, `src/fyd/data/ping-object-source.ts`
AFFECTS AGENTS / Projection lane, journal agents, lineage lane, Agent 17

### AQ-3. Owner overlay applies to the graph after the spec was built: spec/graph mismatch + silent downgrade

DOMAIN / Ask FYD
COMPONENT / `src/app/api/fyd/ask/ask-pipeline.ts` (`loadBundleWithOwnerOverlay`), `src/fyd/object/owner-overlay.ts`
CLAIM / `getSiteBundle` generates the spec from the pre-overlay graph; `applyOwnerFieldCorrections` then mutates `bundle.graph` while `bundle.spec` still describes the uncorrected graph. Additionally, `loadBundleWithOwnerOverlay` wraps the overlay in try/catch and returns the uncorrected bundle on any error: a silent authority downgrade instead of fail-closed.
EVIDENCE / ask-pipeline.ts: spec built inside `getSiteBundle`, overlay applied after; catch-all returns raw bundle. `owner-overlay.ts` attaches `ownerFieldCorrections` and corrects the public business object.
CALLER / ask route handler
CALLEE / `loadBundleWithOwnerOverlay`
WRITER / Owner (owner events)
READER / Visitor asking a question
AUTHORITY / Code-read, high
CLASSIFICATION / broken-boundary (spec no longer describes the graph it ships with; silent downgrade)
CONFIDENCE / high
BROKEN BOUNDARY / Spec/graph consistency; fail-closed error handling.
DEPENDENCIES / `src/fyd/object/owner-overlay.ts`, `src/fyd/data/fyd-tenant-graph.ts`
AFFECTS AGENTS / Owner-mode agents, ask-lane agents

### AQ-4. Field visibility is called with an empty decision list: owner visibility decisions are not loaded

DOMAIN / Ask FYD
COMPONENT / `src/app/api/fyd/ask/ask-pipeline.ts` -> `answerAskFyd` (field visibility stage)
CLAIM / The pipeline applies field visibility with a hardcoded empty decision list, so persisted owner visibility decisions (including HIDE) are never loaded into the ask path. The only visibility enforcement observed live is the generic address-coarsening policy.
EVIDENCE / ask-pipeline.ts calls the visibility stage with `[]` (observed pre-compaction; function signature confirmed in `src/fyd/ask/visibility-policy.ts`). `src/fyd/owner-mode/visibility.ts` exists as the newer policy module.
CALLER / ask-pipeline.ts
CALLEE / field visibility stage
WRITER / FYD Factory ask lane
READER / Visitor asking a question
AUTHORITY / Code-read, medium (empty-list call observed pre-compaction; signature confirmed now)
CLASSIFICATION / gap (owner HIDE intent unenforced in Ask)
CONFIDENCE / medium
BROKEN BOUNDARY / Owner visibility authority vs ask enforcement.
DEPENDENCIES / `src/fyd/ask/visibility-policy.ts`, `src/fyd/owner-mode/visibility.ts`
AFFECTS AGENTS / Owner-mode agents, TD-002/privacy agents

### AQ-5. Unrecognized claim classifications default to "supported"

DOMAIN / Ask FYD
COMPONENT / `src/fyd/ask/visitor-answer.ts` (`claimClassFor`, lines 75-89)
CLAIM / `claimClassFor` maps known classifications to `derived`/`supported`, but the `default` case returns `"supported"`. Any unrecognized classification is therefore presented as supported rather than unknown. This is an unsafe epistemic default sitting on the live citation path.
EVIDENCE / visitor-answer.ts lines 75-89: `default: return "supported";`.
CALLER / `buildCitations` (visitor-answer.ts line ~337)
CALLEE / `claimClassFor`
WRITER / FYD Factory ask lane
READER / Visitor reading citations
AUTHORITY / Code-read, high
CLASSIFICATION / vulnerability (epistemic: unknown presented as supported)
CONFIDENCE / high
BROKEN BOUNDARY / Conservative-by-default evidence handling.
DEPENDENCIES / `src/fyd/ask/visitor-answer.ts`
AFFECTS AGENTS / Claim-verdict agents, ask-lane agents

### AQ-6. Citation class collapses to the first claim sharing an evidence ref

DOMAIN / Ask FYD
COMPONENT / `src/fyd/ask/visitor-answer.ts` (`buildCitations`, line ~337)
CLAIM / `claimClassifications.find((c) => ...)` picks the FIRST classification referencing an evidence ref. When multiple claims share one ref, a later derived claim can inherit an earlier "supported" classification (or vice versa): per-claim classification is not preserved.
EVIDENCE / visitor-answer.ts line ~337: `const classification = claimClassifications.find((c) => ...)`.
CALLER / `buildCitations`
CALLEE / n/a
WRITER / FYD Factory ask lane
READER / Visitor reading citations
AUTHORITY / Code-read, high
CLASSIFICATION / misattribution
CONFIDENCE / high
BROKEN BOUNDARY / Per-claim classification identity.
DEPENDENCIES / `src/fyd/ask/visitor-answer.ts`
AFFECTS AGENTS / Claim-verdict agents, ask-lane agents

### AQ-7. Citations are object-level; relationship evidence refs are not surfaced as canonical provenance

DOMAIN / Ask FYD
COMPONENT / `src/fyd/ask/visitor-answer.ts` (`buildCitations`), `src/fyd/ask/context-compiler.ts` (`buildAskFydContext`)
CLAIM / A field claim commonly inherits object-level provenance rather than a field-specific locator. Relationship citations render the predicate/site-record source rather than the relationship's canonical `evidenceRef` event provenance. The bounded context truncates fields (500 chars), titles (200), descriptions (2000), so grading can occur on truncated values.
EVIDENCE / `buildCitations` resolves refs against objects and relationships; relationship display path observed pre-compaction; context-compiler.ts truncation limits observed in concierge.ts `boundedObject` and mirrored in the live path.
CALLER / ask-pipeline.ts
CALLEE / `buildCitations`, `buildAskFydContext`
WRITER / FYD Factory ask lane
READER / Visitor reading citations
AUTHORITY / Code-read, medium (truncation confirmed in concierge.ts; live-path mirroring per summary)
CLASSIFICATION / gap (field-level and event-level provenance not carried to the surface)
CONFIDENCE / medium
BROKEN BOUNDARY / Evidence granularity: object-level citations for field-level claims.
DEPENDENCIES / `src/fyd/ask/context-compiler.ts`, `src/fyd/ask/visitor-answer.ts`
AFFECTS AGENTS / Provenance/evidence agents, lineage lane

### AQ-8. The stronger concierge exists, is tested, and is not wired in

DOMAIN / Ask FYD
COMPONENT / `src/fyd/ask/concierge.ts` (974 lines, untracked), `src/fyd/ask/__tests__/concierge.test.ts` (28 tests), `~/workspace/fyd-factory/patches/ask-concierge-wire.patch`
CLAIM / The concierge answers seven canonical questions with explicit SUPPORTED/DERIVED/INFERRED/UNKNOWN grades, throws if any non-UNKNOWN claim lacks evidence, and carries no citations on UNKNOWN claims. It has no non-test caller in the tree. The wire patch exists but is unapplied. The live path uses the generic `composeAnswer` via `composeAskFyd`.
EVIDENCE / concierge.ts header; grep shows callers only in `__tests__/` and itself; patch file present in `~/workspace/fyd-factory/patches/`; `ask-pipeline.ts` calls `composeAskFyd` (generic composer).
CALLER / none (production)
CALLEE / n/a
WRITER / FYD Factory ask lane
READER / n/a
AUTHORITY / Code-read, high
CLASSIFICATION / gap (stronger machinery built but not serving)
CONFIDENCE / high
BROKEN BOUNDARY / none broken; capability undeployed.
DEPENDENCIES / `src/fyd/ask/answer.ts` (`composeAskFyd`), `src/fyd/ask/context-compiler.ts`
AFFECTS AGENTS / Ask-lane agents, preview-route worker (do not block)

### AQ-9. TD-002 (private/hidden leakage) has no artifact in the tree

DOMAIN / Ask FYD
COMPONENT / n/a (absent)
CLAIM / No file, test, or doc referencing TD-002 exists anywhere in `src/` or `~/workspace/fyd-factory/` as of 2026-09-24. A pre-compaction grep transiently listed a `td-002-hostile.test.ts`; it is not present now (parallel-lane drift or removal). Leakage-proof status cannot be established from the tree. Do not certify.
EVIDENCE / `find` for `*td-002*` returns nothing; `grep -rln "td-002|TD-002"` over `src/` and `~/workspace/fyd-factory/` returns nothing.
CALLER / n/a
CALLEE / n/a
WRITER / n/a
READER / n/a
AUTHORITY / Filesystem/code search, high
CLASSIFICATION / gap (missing hostile-privacy coverage)
CONFIDENCE / high
BROKEN BOUNDARY / Privacy assurance boundary: no durable proof.
DEPENDENCIES / none
AFFECTS AGENTS / Privacy/security agents, hostile-projection agents

### AQ-10. Visitor-safety properties that do hold

DOMAIN / Ask FYD
COMPONENT / ask-pipeline.ts, `src/fyd/tenant/tenant-context.ts`, `src/fyd/identity/`
CLAIM / The trusted path derives tenant from the URL and rejects body mismatch; tenant IDs are DNS-safe slugs; unknown or private object IDs fail as unknown-object after public filtering; bundle load/verification failure returns structured unknown rather than empty success; owner mode currently grants nothing (visitor-safe); sessions are HMAC-signed and fail closed without `FYD_SESSION_SECRET`.
EVIDENCE / ask-pipeline.ts; `requireTenantContext`; `src/fyd/identity/session.ts` (HMAC, HttpOnly, SameSite=Lax, fail-closed on missing/placeholder secret).
CALLER / ask route handler
CALLEE / `requireTenantContext`, session loader
WRITER / FYD Factory lanes
READER / Visitor
AUTHORITY / Code-read, high
CLASSIFICATION / strength
CONFIDENCE / high
BROKEN BOUNDARY / none
DEPENDENCIES / `src/fyd/tenant/tenant-context.ts`, `src/fyd/identity/session.ts`
AFFECTS AGENTS / Identity agents, tenant-context agents

---

## 4. End-to-end Ask FYD provenance trace

Question: "What services does this business offer, and how do you know?"
Tenant: happy-place. Asked 2026-09-24 against HEAD `e48ef710`.

### Step 1: Intake and tenant binding
POST `/api/fyd/ask/happy-place` (trusted path). `ask-pipeline.ts` parses the body, `requireTenantContext` validates tenant `happy-place` (DNS-safe slug), and a body `siteId` mismatch is rejected. Legacy `/api/fyd/ask` would instead trust a validated body `siteId`.

### Step 2: Graph load (the fork from the site path)
`loadBundleWithOwnerOverlay("happy-place")` -> `getSiteBundle` -> `getFydTenantGraph("happy-place")`:
- Base: pinned fixture `HAPPY_PLACE_GRAPH`, digest `f2b0e8a34f4d68d1df9fd8aefb47bdc1` verified.
- Overlays: `PingObjectReader.queryFydSiteOverlays` for pinned `eventSequences: [65, 83]`, sanitized, digest-pinned.
- **Provenance rewrite:** base objects' provenance is forced to `kind: "procedural-fixture", ref: "fixture:happy-place-v1"`. The fixture file itself carries `kind: "website-derived", ref: "website-ingestion:https://happy-place-platform.vercel.app/"`. The ask path therefore **erases the original source URL** from its own view of base objects; the dump path the site reads preserves it. Overlay-added objects keep `kind: "canonical-journal"`, `ref: "ping-event:<event_id>"`.
- The site page, by contrast, reads `/home/nolan/ping/var/fyd-projections/happy-place.json` via `getPingObjectGraph` (graph SHA-256 verified, presentation-intent digest verified, owner corrections composed after digest verification).

### Step 3: Spec generation and owner overlay (ordering defect)
`generateSiteSpec(composedGraph)` + `validateSiteSpec` produce the spec from the **uncorrected** graph; `applyOwnerFieldCorrections` then mutates `bundle.graph` (corrected fields get `provenance.kind: "owner"`) while `bundle.spec` still describes the uncorrected graph. Overlay errors are caught and the uncorrected bundle is returned silently.

### Step 4: Answering
`answerAskFyd`: field visibility with `[]` (owner visibility decisions not loaded); public-object and active-relationship filtering; target = business object; related = service objects via bounded context (`buildAskFydContext`, truncated values); `composeAskFyd` -> generic `composeAnswer`; `[n]` markers mapped to citations via `buildCitations`.

### Step 5: What the user receives for the services question
A list of services (e.g. Repairs, Fencing, and the other `ping.social.service@1` objects) with `[n]` citations. Each citation resolves to a **service object** with:
- source label derived from the ask-path provenance: `kind: "procedural-fixture"` -> "The site record" (NOT the website URL the fixture was derived from; that URL was erased in Step 2).
- claim class from `fields.claimKind` where present (`"website_statement"` on service objects; the business object lacks `claimKind` and falls into the `"supported"` default).
- object-level ref only: no field locator, no byte range, no canonical event ref for base objects (the only anchor is the pinned fixture digest).
- classification via first-match on shared refs (AQ-6) and the unsafe `"supported"` default (AQ-5).

### Provenance verdict for this trace
The user gets a **cited, deterministic, visitor-safe** answer whose citations name real objects in a digest-pinned graph. It is **not canonical end-to-end provenance**: the original source URL is erased on the ask read path; citations are object-level, not field-level; the spec was built from the uncorrected graph; unrecognized classes default to supported; the stronger concierge (explicit grades, no-evidence throws) is built but not serving; and the site the user can open in another tab is rendered from a different source (the dump projection) that can disagree with the ask graph after any journal write postdating the last dump.

---

## 5. Cross-cutting

### X-1. Deployment: Vercel build with no test gate, no CI workflows

DOMAIN / All
COMPONENT / `vercel.json`, `.github/`, `src/middleware.ts`
CLAIM / `vercel.json` sets `buildCommand: "npm run build"` with no test step. `.github/` contains agent definitions and copilot instructions but no `workflows/` directory: nothing runs the suites before deploy. Middleware disables `/objects`, `/build`, `/portal-rail` at the router (404), while all `/api/*` routes stay live, including experimental ones.
EVIDENCE / vercel.json contents; `.github` file listing (agents + instructions only); middleware.ts `DISABLED_PAGE_PREFIXES`.
CALLER / Vercel / Next.js
CALLEE / n/a
WRITER / FYD Factory infra
READER / Deployer
AUTHORITY / Code-read, high
CLASSIFICATION / gap (no deploy-time verification)
CONFIDENCE / high
BROKEN BOUNDARY / Test-gate vs deploy: TEST-GATE.md documents a gate convention (2026-09-21, SHA 5c84fe2, now stale) that nothing enforces.
DEPENDENCIES / `src/fyd/TEST-GATE.md`
AFFECTS AGENTS / Infra/QA agents

### X-2. Observability: minimal

DOMAIN / All
COMPONENT / `src/app/api/health/route.ts`, `src/app/api/health/authority/route.ts`, `src/app/api/diagnostics/sharp/route.ts`
CLAIM / `/api/health` returns `{status: "ok", timestamp}` only. `/api/health/authority` reports env-presence booleans (KV, encryption, Google OAuth, workbench, blob) without values. No request IDs, metrics, traces, or structured failure evidence were observed on the audited paths.
EVIDENCE / Route sources read.
CALLER / Operator / monitor
CALLEE / n/a
WRITER / FYD Factory infra
READER / Operator
AUTHORITY / Code-read, high
CLASSIFICATION / gap
CONFIDENCE / high
BROKEN BOUNDARY / none declared; observability is simply thin.
DEPENDENCIES / none
AFFECTS AGENTS / Infra agents

### X-3. Workers: no background worker subsystem for these domains

DOMAIN / All
COMPONENT / n/a (absent)
CLAIM / No worker/queue/cron subsystem exists for Happy Place, Coppersmith, or Ask FYD in the tree ("worker" appears only in comments). The dump projection is produced by an external script outside the repo; journal overlays are read at request time; the ask bundle rebuilds on every read. There is no precompute, no cache invalidation machinery, and no scheduled reconciliation between the dump and the fixture paths, which is exactly why HP-6/AQ-2 can drift silently.
EVIDENCE / grep for worker/Worker across `src/fyd/` returns only comment mentions; `getFydTenantGraph` docstring "rebuilt on each read".
CALLER / n/a
CALLEE / n/a
WRITER / n/a
READER / n/a
AUTHORITY / Code search, high
CLASSIFICATION / gap (no reconciliation worker between the two read authorities)
CONFIDENCE / high
BROKEN BOUNDARY / n/a
DEPENDENCIES / none
AFFECTS AGENTS / Projection lane, infra agents

### X-4. Events, missions, knowledge, retrieval

DOMAIN / All
COMPONENT / PING journal (`PingObjectReader`), `data/fyd-owner/`, `src/fyd/claim/`, `src/fyd/lineage/`, renderer `resolveQuery`
CLAIM / Events: the PING Postgres journal is the event authority; overlays flow through `queryFydSiteOverlays`; projection meta carries `overlayEventIds`; owner events are an append-only file store. Missions: no FYD "missions" subsystem exists for these domains (only comment-level mentions; the Pig-side Meta AI job envelopes are a separate system). Knowledge: raw website bytes are pinned under `src/fyd/proceduralize/raw/<slug>/` with sha256 checks; `IDENTITY-PROOF-EVIDENCE.json` and the harvest dir exist. Retrieval: `resolveQuery` supports static/owner/reference/related queries with public-only filtering; rendered values flow through `resolveBoundField`.
EVIDENCE / `fyd-tenant-graph.ts`, `owner-store.ts`, `claim/store.ts` (file-backed, atomic writes, fail-honest reads), `lineage/tracer.ts` (7-link chain SOURCE BYTES -> ASK FYD ANSWER; its ask link uses the fixture graphs, matching the live ask source), renderer lines 72-102.
CALLER / various
CALLEE / various
WRITER / FYD Factory lanes
READER / various
AUTHORITY / Code-read, high
CLASSIFICATION / informational
CONFIDENCE / high
BROKEN BOUNDARY / none
DEPENDENCIES / PING journal, `src/fyd/lineage/`
AFFECTS AGENTS / Knowledge/provenance agents, lineage lane

### X-5. Tests: lane-scoped suites exist; the canonical gate doc is stale

DOMAIN / All
COMPONENT / `src/fyd/TEST-GATE.md`, `src/fyd/ask/jest.config.cjs`, `src/fyd/ask/__tests__/`
CLAIM / The ask lane has a committed jest config covering `src/fyd/ask/__tests__/` and the ask route tests. `concierge.test.ts` contains 28 tests. TEST-GATE.md records a 2026-09-21 all-green run (116 tests) at SHA 5c84fe2, which predates HEAD `e48ef710`; it is the documented convention (clean worktree, per-lane configs) but is stale and unenforced at deploy (see X-1).
EVIDENCE / jest.config.cjs; test file listing (`ask-fyd.test.ts`, `concierge.test.ts`, `context-compiler.test.ts`, `demo-classification.test.ts`, `graph-read-route.test.ts`, `services-evidence.test.ts`); TEST-GATE.md header and table.
CALLER / n/a
CALLEE / n/a
WRITER / FYD Factory QA
READER / n/a
AUTHORITY / Code-read, high
CLASSIFICATION / informational (stale gate doc)
CONFIDENCE / high
BROKEN BOUNDARY / none
DEPENDENCIES / none
AFFECTS AGENTS / QA agents

### X-6. F-8 ("About null") not located

DOMAIN / Ask FYD
COMPONENT / n/a
CLAIM / No code, test, or doc reference to F-8 or "about null" was found in `src/fyd/` (excluding nothing; the grep covered all of `src/fyd/`). The invented-claim concern from task context has no concrete audit record in the tree as of 2026-09-24.
EVIDENCE / `grep -rin "about-null|about_null|F-8"` over `src/fyd/` returned nothing.
CALLER / n/a
CALLEE / n/a
WRITER / n/a
READER / n/a
AUTHORITY / Code search, high
CLASSIFICATION / unlocated (cannot confirm or close)
CONFIDENCE / high (about the absence)
BROKEN BOUNDARY / n/a
DEPENDENCIES / none
AFFECTS AGENTS / Claim-verdict agents

---

## 6. Boundary verdicts

### Happy Place: FAIL (with honest strengths)
Fails on: weak verifier on the public render path (HP-1), post-generation intent mutation without re-verification (HP-2), footer provenance misattribution (HP-3), dual read authority (HP-6), open `/o` capability href seam (HP-7). Strengths: honest dual-value owner-correction presentation (HP-5), digest-pinned intent layer, visitor-safe ask path.

### Coppersmith: FAIL (narrower, same core)
Fails on: the same weak-verifier path (CP-1), the same dual read authority (CP-5), the same open `/o` seam (CP-6), plus hardcoded footer sequences that describe the other tenant (CP-3) and absent owner state with convention-only tenant isolation (CP-4). Narrower than happy-place: no intent layer, no demo mode (CP-2).

### Ask FYD: FAIL for canonical provenance (useful but not canonical)
The pipeline is deterministic, bounded, tenant-scoped, and visitor-safe (AQ-10), and it returns real citations against a digest-pinned graph. It fails canonical provenance on: dual read authority with the site path (AQ-2), spec/graph mismatch plus silent overlay downgrade (AQ-3), owner visibility decisions not loaded (AQ-4), unsafe "supported" default (AQ-5), first-ref classification collapse (AQ-6), object-level citations without field/event granularity (AQ-7), the stronger concierge built but unwired (AQ-8), no TD-002 artifact (AQ-9), and a split tenant-derivation surface (AQ-1).

### Ask FYD provenance conclusion
A user asking "What services does this business offer, and how do you know?" receives a cited answer backed by real service objects in a digest-pinned fixture+overlay graph, with per-tenant scoping and visitor-safe defaults. That is genuine evidence-backed behavior, and it is stronger than an uncited answer. It is not canonical end-to-end provenance, because the ask path erases the original source URL when it rewrites fixture provenance, cites at object granularity rather than field or event granularity, builds its spec from the uncorrected graph, defaults unknown classes to supported, collapses shared-ref classifications to the first match, and can disagree with the public site it claims to describe, since the two read from different sources with no reconciliation worker. The concierge (explicit SUPPORTED/DERIVED/INFERRED/UNKNOWN grades, no-evidence throws) would raise the bar but is not serving. Canonical provenance would require: one authoritative graph read path (or a proven equivalence), field-level evidence refs carrying source locators, relationship citations preserving canonical event refs, claim identity bound to presented text, strong verification after overlay and intent, no silent overlay downgrade, no unknown-to-supported default, per-claim classification, the strong render model on public `/sites`, and TD-002 resolved with a durable artifact.

## 7. Open items and recommended follow-ups

1. Apply or formally reject the three pending patches: `o-capability-safe-link.patch` (BYPASS-1/2 open), `ask-concierge-wire.patch` (concierge unwired), and the presentation-intent digest patch set. Each has been sitting while its seam stays open.
2. Decide the single graph authority for sites vs Ask, or build the reconciliation worker (X-3) plus an equivalence proof; until then the site-bundle.ts "same graph" comment should be corrected.
3. Re-verify the AQ-4 empty-visibility-list observation against the current ask-pipeline.ts (observed pre-compaction) and wire persisted owner visibility decisions, including HIDE, into the ask path.
4. Re-resolve TD-002 with a durable artifact: the hostile privacy test has no file in the tree.
5. Fix the shared footer: per-tenant sequences and an honest multi-authority provenance line.
6. Locate or close F-8 ("About null"): no record found in the tree.
7. Refresh TEST-GATE.md at current HEAD and enforce it in the deploy path (vercel.json currently builds without running any suite).
8. The `/o` lane and media `javascript:` scheme handling (BYPASS-3) still need a verified status; BYPASS-3 was not re-verified in this audit.
9. Pig repo left untouched: 103 dirty entries observed, none made by this agent. No publishing or outreach performed.
