# MAP-PROJECTION: render-side projection/visibility boundary

Read-only mapper report. Pig repo `/home/nolan/projects/ping`, branch `fyd/sprint-integration-2026-09-24`. All paths below are relative to that repo root.

## 1. Model-side boundary (summary, for render builders to mirror)

1. Single choke point: `buildAskFydContext` (`src/fyd/ask/context-builder.ts:34`) calls `projectAskContextForViewer` (`src/fyd/ask/context-projection.ts`) for every caller, including the lineage tracer which feeds an anonymous viewer (`src/fyd/lineage/tracer.ts:935`).
2. `classifyAskViewer` answers WHO: "owner" requires `verified === true` AND a non-empty id (`src/fyd/ask/types.ts:30-41`). Anonymous, unknown, demo, practice, and unverified ids all fall through to "visitor". No third class, no elevation without verification. Mode strings, query params, and demo constructs can never produce "owner".
3. `projectAskContextForViewer` answers WHAT with one strict pipeline for every viewer class: owner decisions (hide drops, address-likes coarsen) -> hide-traversal cut -> unresolved-conflict suppression -> public objects only -> visitor-safe field allowlist (`src/fyd/ask/visitor-safe-fields.ts:42-86`) -> active relationships whose endpoints both survived.
4. The model is never an owner: private values are excluded from model context for EVERY viewer class, including a verified owner. An owner reads private data through owner surfaces, never through the model. The projection does NOT widen for the owner class (`CONTEXT_PROJECTION.md:11-14`).
5. Fail-closed allowlist: unknown field names are dropped, never passed through, for every viewer class. Pure, deterministic, no I/O, never mutates inputs.
6. Wiring into the Ask route: `handleAskRequest` first runs the render boundary `verifyPublicProjection(overlaid.graph, decisions, "anonymous")` (`src/app/api/fyd/ask/ask-pipeline.ts:120`), then `visitor-answer.ts:649` builds the model context with viewer `{ id: null, displayName: null, verified: false }`.
7. Route contract: `POST /api/fyd/ask` (`src/app/api/fyd/ask/route.ts`) and `POST /api/fyd/ask/[siteId]` (`src/app/api/fyd/ask/[siteId]/route.ts`). Body `mode: "owner"` is accepted for a future authenticated lane but today is treated as visitor-safe and grants nothing.
8. Trust seam: prompt instructions are not privacy controls. Fields the model must not see are absent from its context by construction, never merely withheld by instruction.
9. Semantics to mirror on render: classify WHO first (fail closed), then project WHAT through one deterministic pipeline; keep the classifier and the projector separate modules; brand the output type so a bypass is a compile error, not a code-review hope; never widen the projection for the owner class (owner-only data belongs on owner surfaces).

## 2. Render-side visibility today (inventory)

### Viewer taxonomies: four parallel, ununified

| # | Type | Values | File:line | Notes |
|---|------|--------|-----------|-------|
| V1 | `PublicViewerKind` | "anonymous" \| "owner" | `src/fyd/sitespec/public-projection.ts:63-66` | Render/route boundary. Output branded `VerifiedPublicProjection` (`:119-133`); brand check `:135-145`. |
| V2 | `AskViewerClass` | "owner" \| "visitor" | `src/fyd/ask/types.ts:41` | Model side via `classifyAskViewer`. |
| V3 | `ClaimViewerKind` | "anonymous" \| "owner" \| "internal" \| "unknown" | `src/fyd/claim/claim-projection.ts:43` | Only one with 4 values; projected by `projectClaimForViewer` (`:65`). |
| V4 | `EdgeViewer` | `{ mode: "visitor" }` | `src/fyd/edge/resolve.ts:53-58` | Single mode only. `buildObjectSheet` takes it but ignores it: `void viewer;` at `:410`. |
| V5 | `ViewerContext` | `{ viewerId, displayName }` | `src/fyd/sitespec/types.ts:24-27` | Carried in `RenderContext` (`src/fyd/components/renderer.tsx:225-246`), but NEVER consulted by any component (zero `ctx.viewer` reads anywhere in `src/fyd/components`, `src/fyd/ui`). Dead weight today. |
| V6 | `AskFydMode` | "visitor" \| "owner" | `src/fyd/ask/visitor-answer.ts:70` | HTTP body mode, grants nothing. |

Naming is inconsistent: visitor vs anonymous across V1/V2/V4; "internal"/"unknown" exist only in V3.

### Where render-side projection is enforced today

- **`verifyPublicProjection`** (`src/fyd/sitespec/public-projection.ts:243`): the render-side boundary (Q-C-01). Canonical graph + owner decisions (`decisionsForGraph`, `:198-237`) + viewer kind -> branded `VerifiedPublicProjection` with a versioned receipt (graphDigest, decisionsDigest, viewerPolicyDigest, checkpoint, capabilities). "anonymous" filters to public objects/endpoint-safe relationships after hide/coarse and hide-traversal; "owner" passes the graph through with hidden fields visible (still branded and receipted).
- **Entry funnel**: `getVerifiedPublicProjection(siteId, viewerKind)` / Sync variant (`src/fyd/data/ping-object-source.ts:336-352`). Docstring: "Every public consumer reads tenant object data through this function, never through `getPingObjectGraph` directly."
- **`compilePublicSite`** (`src/app/sites/_shared/spec-pipeline.ts:65-94`): the single compile seam for `/sites/*` demo pages. Calls `getVerifiedPublicProjection(siteId, "anonymous")` (`:69`), then FYD-Q1 conflict suppression (`:82`). No "owner" use on any public page.
- **`buildRenderContext`** (`src/fyd/components/renderer.tsx:275-285`): applies `applyFieldVisibility` only (no public filtering, no decisionsForGraph). Declared "the ONLY supported way to obtain a RenderContext" (`:268`) but called ONLY by the lineage tracer (`src/fyd/lineage/tracer.ts:826`) and `spike-trace.ts:67`. Real pages bypass it (see section 5).
- **`buildObjectSheet`**: applies only `applyPublicVisibilityGate` (`src/fyd/edge/resolve.ts:68-79`), which is visibility === "public" filtering. No owner field decisions, no hide-traversal cuts. Comment at `:8-10` claims "the same rule the site pages use", but the site pages apply the full decision chain while this gate does not.
- **Claims route** (`src/app/api/fyd/claims/[resourceId]/route.ts:33-40`): `resolveClaimViewerKind` returns "owner" only when `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` AND the host is private (`isPrivateHost`, `src/fyd/owner-mode/gate.ts:51-99`); otherwise "anonymous".
- **Dev-only gates**: `?objectDebug=1` on MarginObjectLayer is explicitly excluded from the production path (`src/app/sites/_shared/site-client.tsx:96`, `:170`). No `searchParams`-driven visibility on any public page (no searchParams in `src/app/sites`, `src/app/build`, `src/app/o`, `src/app/objects`).

### Who consumes the boundary with which viewer kind

- "anonymous": `/sites/*` pages (`spec-pipeline.ts:69`), `/o`, `/objects`, `/objects/spatial`, `/o/[objectId]` (`page.tsx:53,69` via memoized `resolvePublicProjection`), `buildObjectView` consumers (`src/fyd/object/view.ts:419` takes the branded type), `buildSemanticRenderModel` (`src/fyd/sitespec/render-model.ts:136-138`, branded input), preview pipeline (`src/fyd/preview/pipeline.ts:118`), ask-pipeline (`ask-pipeline.ts:120`).
- "owner": ONLY `src/app/api/fyd/objects/[objectId]/overrides/route.ts` (`:193`, `:274`, `:571`) for the owner-management read path (hidden fields visible for management, branded and receipted).

## 3. Recommended render seam (precise)

The render side already has a privacy boundary (`verifyPublicProjection` + branded type), but it has NO per-experience projection: nothing answers "same state, different authorized projections" for VISITOR vs OWNER vs ENGINEER. The four viewer taxonomies (V1-V6) are parallel and the page shells hand-build contexts around them.

**Proposed single seam** (no code, signature sketch):

```
projectForViewer(
  state: VerifiedPublicProjection,   // branded input, raw graphs are a compile error
  viewer: RenderViewerKind            // "visitor" | "owner" | "engineer", from a verified classifier
): { page: PageModel; ownerConsole: OwnerConsoleModel | null; engineer: EngineerModel | null }
```

Placement: `src/fyd/sitespec/` next to `public-projection.ts` (it composes the same machinery: owner decisions, visibility rules, capabilities).

Semantics to mirror from the model side:
- Classify WHO first with a fail-closed classifier modeled on `classifyAskViewer`: only a verified identity (`OwnerIdentity.verified === true`, `src/fyd/owner-mode/owner-identity.ts:37-47`) yields "owner"; "engineer" requires an explicit engineer grant, never a query param or mode string; everything else is "visitor". The `RenderViewerKind` type should unify V1-V6 naming (pick visitor/anonymous consistently; retire V4's ignored param and V5's dead field or activate them).
- Then project WHAT: visitor gets the anonymous pipeline exactly as today; owner gets the owner viewerKind graph PLUS the owner-console model; engineer gets the projection receipt, digests, validator findings, and event sequences, never business-fact extensions.
- The model is never an owner applies in reverse: owner-only actions never render on the visitor page model, even when the visitor is a verified owner who happens to be browsing (the owner console is a separate surface, opened deliberately).

**Narrowest insertion points** (files and lines):

1. `src/app/sites/_shared/spec-pipeline.ts:69` (`compilePublicSite`): replace the hardcoded `"anonymous"` with the resolved `RenderViewerKind` (resolved server-side once, passed down like the existing `isDemoOwnerModeEnabled()` hydration pattern in `src/fyd/owner-mode/gate.ts:17-34`), and return the three per-viewer models instead of one ctx-for-all.
2. `src/app/build/[siteId]/page.tsx:46,64`: replace `getPingObjectGraph` with `getVerifiedPublicProjection` + `projectForViewer`. This deletes the biggest bypass in one move.
3. `src/app/sites/_shared/site-client.tsx:40,89-91` and `src/app/build/[siteId]/build-client.tsx:44,73-75`: stop hand-assembling `RenderContext`; consume only the `page` model. Either activate `RenderContext.viewer` as the enforced discriminant (and route every component read through it) or delete it, since today it is never read.
4. `src/fyd/edge/resolve.ts:404-410` (`buildObjectSheet`): take `decisions` and run the full chain (`applyFieldVisibility` + `applyHideTraversal` via `decisionsForGraph`, as `verifyPublicProjection` does) instead of `applyPublicVisibilityGate`; honor the `EdgeViewer` parameter instead of `void viewer;`.

## 4. Owner-console inventory (to be moved behind Advanced/Trust/Developer)

### On the golden customer route `/build/[siteId]` (every visitor sees this today)

- `src/app/build/[siteId]/owner-panel.tsx:173-182`: fixed floating **"Customize with FYD"** button, `z-50`, rendered unconditionally for every visitor; no gate of any kind.
- `src/app/build/[siteId]/owner-panel.tsx:193-208`: modal dialog with "DEMO OWNER CONTEXT" banner; conversational command textarea (`:213-232`, "Preview the change"); wired to `POST /api/fyd/objects/[siteId]/overrides`.
- `src/app/build/[siteId]/owner-panel.tsx:250-270`: proposal card with Before / After / Evidence impact / Capability, plus shortened **baseStateDigest, baseViewDigest, patchDigest** (`:262-266`).
- `src/app/build/[siteId]/owner-panel.tsx:271-293`: "Approve and apply" / "Discard" buttons.
- `src/app/build/[siteId]/owner-panel.tsx:301-321`: "Applied" receipt showing **event id, resultDigest, approvedAt** (`:318-321`) and "Revert this change".
- `src/app/build/[siteId]/build-client.tsx:149`: `{siteId ? <OwnerPanel siteId={siteId} /> : null}` mounts it on every customer page.

### On the `/sites/*` demo shell (demo pages, but public)

- `src/app/sites/_shared/site-client.tsx:233-250`: provenance footer: "Generated by FYD Social from a website-ingestion object graph. All claims on this page are website statements, never verified fact." plus a **"Validator notes"** `<details>` listing non-error findings with severity/path/message.
- `src/app/sites/_shared/site-client.tsx:256-310`: "Customize this site" structured editor section (`:259`), proposal JSON `<pre>` dump (`:281-283`), **proposalDigest** (`:286`), "Approve and apply to preview" (`:295`), `applySitePatch`/`proposeSitePatch` wiring (`:14`, `:146-157`).

### Dev-gated (env var + private host; correct gating, wrong layer placement)

- `src/fyd/owner-mode/demo-owner-mode.tsx:64-269` (`DemoOwnerMode`): actor/relationship card, live capability evaluation list (ALLOW/DENY per capability), "attest regen-complete" walkthrough with evidence preconditions; mounted on demo pages only when `isDemoOwnerModeEnabled()` (`src/app/sites/happy-place/page.tsx:70`, same in coppersmith).
- `src/fyd/owner-mode/customize-panel.tsx:75` (`CustomizePanel`): conversational customize over `POST /api/fyd/customize` with parse/preview/approve/inspect; mounted only inside `DemoOwnerMode` (`demo-owner-mode.tsx:267`).
- `src/app/o/[objectId]/manage/page.tsx` (full file): Object Manage demo backend: Overview, Content, Services, Media, Contact, Appearance, Ask FYD, Connections, History; posts `OwnerCommand` to the overrides API (`:96-97`, `:135`, `:174`); no authentication of any kind.

### Dead code (not mounted anywhere)

- `src/fyd/owner-mode/demo-owner-console.tsx` (687 lines): six-tab console (OBJECTS / CONTENT / VISIBILITY / SITE / ASK FYD / EVIDENCE) with fact correction, visibility policy editing, site-command journaling with replay, and evidence log. Only self-referenced; no page imports it.

### Engineer-surface items with no home today

- Projection receipts (graphDigest, decisionsDigest, checkpoint): computed in `public-projection.ts:95-116` but never rendered except as shortened digests in the OwnerPanel.
- `OwnerPanel` receipt digests and the site-client "Validator notes" are the only digest surfaces; both sit on visitor-facing pages.

## 5. Bypass list (page components importing raw state, bypassing a visibility check)

1. **`src/app/build/[siteId]/page.tsx:46,64` (HIGH)**: the golden customer route loads `getPingObjectGraph(siteId)` and feeds the unprojected graph into `planSite` and `BuildClient`. It never calls `verifyPublicProjection` or `getVerifiedPublicProjection`. Owner field-visibility decisions (hide/coarse), hide-traversal cuts, and FYD-Q1 conflict suppression do not apply. Downstream only filters by `visibility === "public"` (`presenceForBuild` at `src/app/build/[siteId]/build-client.tsx:52-62`, `richestObject` at `src/fyd/components/object-rail.tsx:356-361`); nothing applies owner field decisions before render.
2. **`src/app/api/fyd/edge/object/route.ts:43` (MEDIUM)**: feeds `getPingObjectGraphSync(site).graph` (unprojected) into `buildObjectSheet`, which applies only the public-visibility gate (`src/fyd/edge/resolve.ts:68-79`) and ignores its `viewer` parameter (`:410`). Owner HIDE/coarse field decisions are served in the object-sheet JSON. This is the route the client-side edge sheet calls (`edgeClientScript`, `site-client.tsx:152-158`).
3. **`src/app/sites/_shared/site-client.tsx:89-91` and `src/app/build/[siteId]/build-client.tsx:73-75` (LOW on /sites, HIGH on /build)**: both hand-assemble `RenderContext` instead of using `buildRenderContext` (`src/fyd/components/renderer.tsx:275`), the declared "ONLY supported way" (`:268`). On `/sites/*` the graph is already boundary-projected, so privacy holds by luck of call order; on `/build/*` it is not.
4. **`src/fyd/components/object-overlay.tsx:60-120` (`overlayFacts`)**: walks raw object fields with only a fact denylist and the conservative address default (`coarsenAddress`, imported `:8`); no owner HIDE-decision awareness. Only mounted in the demo shell (`site-client.tsx:176`) with an already-projected graph today, but the component takes unbranded `ObjectGraph` and is one prop away from leaking on a bypassed page.
5. **NOT bypasses (verified clean)**: `/o/[objectId]` (`page.tsx:53,69` memoized `resolvePublicProjection`, branded), `/o`, `/objects`, `/objects/spatial` (all `getVerifiedPublicProjectionSync(id, "anonymous")` + `loadObjectView` with branded input), the Ask pipeline (`ask-pipeline.ts:120` + `visitor-answer.ts:649`), `why-this` route (`src/app/api/fyd/why-this/route.ts:107`), projection route (`src/app/api/fyd/projection/route.ts:31`), objects route (`src/app/api/fyd/objects/[objectId]/route.ts:42`).

## 6. Open questions

1. **Unify the viewer taxonomies?** V1 ("anonymous")/V2 ("visitor")/V4 (ignored)/V6 ("visitor") name the same public viewer four ways, and V3 adds "internal"/"unknown" that exist nowhere else. Should one `RenderViewerKind` ("visitor" | "owner" | "engineer") replace V1, V4, V5, V6, with V3 mapped onto it?
2. **Overrides POST has no private-host gate.** The Lane D comment in `src/fyd/owner-mode/gate.ts:51-56` says "the customize approval API refuses anything else", and `/api/fyd/customize` (`route.ts:71`) and `/api/fyd/claims` (`route.ts:40`) enforce `isPrivateHost`, but the overrides route (`src/app/api/fyd/objects/[objectId]/overrides/route.ts`) does not. The visitor-facing `OwnerPanel` on `/build/*` POSTs to it. Intentional demo posture or a gap?
3. **DemoOwnerConsole: revive or delete?** The 6-tab owner console (`demo-owner-console.tsx`) is mounted nowhere. Should it become the owner surface behind the new seam, or be deleted as dead code?
4. **`RenderContext.viewer` is dead.** No component reads it. Activate it as the enforced render discriminant (with `projectForViewer` as the only constructor) or remove it?
5. **Where does the Engineering/Trust Lab live?** Digests, receipts, validator notes, projection checkpoints, and event sequences have no authorized surface today except the visitor-visible OwnerPanel and site-client footer. New route, new tab on the owner surface, or a separate `/trust` surface?
6. **Which model feeds the /build planner?** `planSite` in `page.tsx:70-76` currently receives the verified (but unprojected) graph. After the seam lands, the planner should take the projected graph so section composition cannot see withheld fields either.
7. **Ask widget mode field.** `ask-fyd-widget.tsx:60` posts `mode: "visitor"` hard-coded. The model classifies from identity, not mode. Keep the field for the future authenticated lane, or remove it to avoid implying mode-based authorization?
8. **Three projection entry points.** `verifyPublicProjection`, `buildRenderContext`, and `compilePublicSite` apply different decision coverage (full chain vs field-visibility-only vs full chain + conflicts). Should `buildRenderContext` be retired and `compilePublicSite` the single page entry, with `projectForViewer` wrapping `verifyPublicProjection`?
