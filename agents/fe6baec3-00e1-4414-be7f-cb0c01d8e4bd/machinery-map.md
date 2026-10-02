# FYD Projection / Policy / Visibility / Capability Machinery Map

Read-only probe of the FYD repo on the Pig at `/home/nolan/projects/ping` (git `28e4ba00`), 2026-09-25. No code changed. Purpose: map the EXISTING projection/policy/visibility/capability machinery so the single verified public projection boundary (FYD contracts Q-C-01/09/12) can extend existing machinery per Nolan's law.

## TL;DR

- There is **no single canonical public-projection boundary**. There are 3 near-duplicate object-level "public graph" gates and field-level visibility is enforced in exactly **1 of ~5 public surfaces** (the Ask lane). The /sites pages, the edge-object API, and the object-projection API all emit field values un-coarsened.
- The closest existing seam every public path already funnels through is the verified read seam `src/fyd/data/ping-object-source.ts` (`getPingObjectGraph` / `getPingObjectGraphSync`): digest-verified projection + owner overlay composition. **Recommendation: add the boundary there** (ranked below).
- **FieldVisibilityDecision[] has no durable read path at all.** No writer, no store, no JSON file exists. The type is declared, the ask pipeline plumbs it, but `getSiteBundle()` never populates it (always `undefined` in production), so the ask lane runs on conservative defaults only. Owner-authored hide/coarse decisions are currently unwritable and unreadable.
- The durable owner decisions that DO exist live in `data/fyd-owner/<objectId>.json` (append-only v2 event log). Exact request-time read path documented below.
- There is **no live per-viewer policy object** (anonymous vs owner). `ViewerContext` is `{viewerId, displayName}`; the tier model in `fyd/ask/context-compiler.ts` has zero production callers (dead code).

---

## Per-file summary

### 1. `src/fyd/sitespec/render-model.ts` — `buildSemanticRenderModel`
- **Inputs:** `(spec: FYDSiteSpec, graph: ObjectGraph, viewer: ViewerContext, opts: BuildRenderModelOptions)` where opts = `{ asOf, designTokenVersion?, ownerOverrides?: FieldVisibilityDecision[] }`.
- **Outputs:** `SemanticRenderModel` — deterministic summary: pages/sections with `objectIds` in `resolveQuery` order, `viewerId`, `ownerOverrides` as a canonicalized string (sorted JSON or `"none"`), version pins.
- **Enforces visibility?** No. It records the decision set for determinism proof but assumes the input graph was already projected upstream. Pure, no I/O.
- **Callers:** none in production (tests only). Its intended supplier is `buildRenderContext` in `renderer.tsx`, which is itself bypassed by live pages.

### 2. `src/fyd/sitespec/types.ts` — `ViewerContext` + policy types
- `ViewerContext = { viewerId: string | null; displayName: string | null }` — "kept minimal on purpose"; **no role, tier, grant, or policy fields.**
- Policy types live in `field-visibility.ts`: `FieldVisibilityPolicy = "show"|"hide"|"coarse"`, `FieldVisibilityDecision {objectId, field, policy, decidedBy:"owner", decidedAt, source:"owner_override", version}`, `VisibilitySource`.
- No per-viewer policy object anywhere live.

### 3. `src/fyd/edge/resolve.ts` — `buildObjectSheet`, `applyPublicVisibilityGate`, `EDGE_VISITOR`
- **Inputs:** `(graph: ObjectGraph, objectId: string, viewer: EdgeViewer, opts?: {allowedCapabilities?})`. `EDGE_VISITOR = { mode: "visitor" }`.
- **Outputs:** `ObjectSheet | null` (null = absent/invisible; HTTP maps to 404 indistinguishable from unknown). Claims + evidence refs, grouped active edges, sheet actions.
- **Enforces visibility?** Object/relationship level only: `applyPublicVisibilityGate` keeps `visibility==="public"` objects + relationships with both endpoints public (byte-for-byte the same rule as `spec-pipeline.publicGraph`). **Does NOT enforce field visibility**: `buildClaims` emits every non-internal field verbatim (only bookkeeping keys like `claimKind`, `source_digest` are excluded; phone/address-shaped fields pass through un-coarsened). The `viewer` param is accepted but ignored (`void viewer`).
- **Capabilities:** `resolveActions` intersects `capabilityOptions` (the authority in `../sitespec/schemas`) with `VISITOR_ALLOWED_CAPABILITIES = ["ask_question","view_evidence","view_why_this"]`.
- **Callers:** `src/app/api/fyd/edge/object/route.ts` GET (via `getPingObjectGraphSync(site)`).

### 4. `src/fyd/object/view.ts` — `composeObjectView`
- **Inputs:** `(graph: ObjectGraph, siteId: string, obj: PingObject, viewId: string, overridesKey: string)`.
- **Outputs:** `ObjectView` (id, schema, name, category, summary, media, services, serviceArea, contact, capabilities, provenance, ownerUpdatedAt, fieldCorrections, sampleQuestions).
- **Enforces visibility?** Partial: object must be public (enforced by callers `loadObjectView`/`loadObjectViewById` honesty gates); reads contact fields (phone/email/website/locality) **directly with no field-visibility filtering**; applies owner decisions only for service order/visibility (via `readOverrides`) and records `addressVisibility` without enforcing it here. `buildCapabilities` maps `capabilityOptionsForSchema` (the capability authority) to render models with executability gates (safe-link for contact actions; `ask` needs evidence; `reply` never emitted).
- **Callers:** `loadObjectView(slug)` (canonical loader: `getPingObjectGraphSync` + public-business honesty gate; used by `/objects`, `/o`, `/objects/spatial` pages, lab adapter, overrides routes), `loadObjectViewById` in `by-id.ts` (any object id; non-public -> null), `knownServices`.

### 5. `src/fyd/object/object-projection.ts` — `objectViewToProjection`
- **Inputs:** `(view: ObjectView, graph?: ObjectGraph)`.
- **Outputs:** `ObjectProjection` (generic Card/Node prop: Facts with evidence, RelatedRefs, contact, contactMethods, capabilities, provenance, media).
- **Enforces visibility?** Only the two owner decisions already encoded in `ObjectView`: `addressVisibility==="hidden"` -> withheld Location Fact + no locationRef; hidden services dropped. **No general field-visibility enforcement** — phone/email/website Facts flow through.
- **Callers:** `src/app/api/fyd/objects/[objectId]/route.ts` GET, `/objects/page.tsx`, `/objects/spatial/page.tsx`, objects-lab-client. All pass the overlay-composed graph from `getPingObjectGraphSync`.

### 6. Owner machinery
- **`src/fyd/object/owner-store.ts`** — `readOverrides(objectId): OwnerOverrides` (= `projectOwnerState`, i.e. replay over the event log; no caching). `applyOwnerCommand(objectId, cmd, knownIds, knownNames)` — command surface: move/add/hide/show service, set-address-visibility, set/revert/confirm contact field. `parseOwnerCommand` validates API bodies. Server-only.
- **`src/fyd/object/owner-events.ts`** — append-only event log; `appendOwnerEvent(objectId, draft)` (seq + content-hash id, atomic write); `projectOwnerState(objectId)` = pure `reduceOwnerEvents` fold; `digestOwnerState` for replay proof. Event types: `owner.confirmed/corrected/hid/restored/added-fact`; targets: `contact:phone|email|website`, `contact:address`, `services:order`, `service:<id>`. Unknown types fail closed.
- **`src/fyd/object/owner-overlay.ts`** — `applyOwnerFieldCorrections(graph, siteId): OwnerOverlayResult` — composes owner field corrections onto the verified graph, returning `{graph, applied, orphaned}`. Fail-closed target resolution: exactly one public business object or corrections go to `orphaned` with a reason. Called by `ping-object-source.ts` AFTER digest verification.
- **Exact durable read path at request time:** `data/fyd-owner/<objectId>.json` (v2 `{version:2, objectId, events[]}`; demo files: `happy-place.json`, `coppersmith-plumbing.json`) -> `readOwnerEvents` (file read; v1 mutable files migrated in memory; missing/invalid -> []) -> `reduceOwnerEvents` (pure fold) -> `OwnerOverrides {serviceOrder, hiddenServices, addedServices, fieldCorrections, fieldConfirmations, addressVisibility, addressVisibilityAssertion, history, updatedAt}`. `FYD_OWNER_DIR` env overrides the dir for tests. The overlay key is the **siteId** (`applyOwnerFieldCorrections(graph, siteId)`), while `view.ts`/`by-id.ts` key the store by object id — they coincide for the demo tenants.
- **Callers of `readOverrides`:** `view.ts` (x2), `owner-overlay.ts`, `overrides/route.ts` (history), `overrides/patch-loop.ts` (x3), `fyd/tenant/scoped-stores.ts`.

### 7. `src/fyd/ask/visitor-answer.ts` — `answerAskFyd`
- **Inputs:** `AnswerAskFydInput {siteId, objectId?, question, mode: "visitor"|"owner", fieldConflicts?, fieldVisibilityDecisions?}` plus injectable `AnswerAskFydDeps {loadBundle}` (no default; fails closed without it).
- **Takes already-projected graph or raw?** RAW: it receives the bundle graph and projects it itself via the private `publicGraphOf`: `applyFieldVisibility` -> `applyHideTraversal` -> `suppressConflictedFields` -> public objects + active, public-both-endpoint relationships. This is the **only live path that enforces field visibility** (FYD-Q1/Q2).
- **Citations/evidence filtering:** `buildCitations` maps the composer answer's `[n]` markers to `AskFydCitation`s resolved against the *projected public graph only*; hidden fields were coarsened/suppressed at projection time so the composer never sees them. Conflict observations cite both evidence chains without embedding the disputed value. Claim classes reduced to "supported"|"derived".
- **Caller:** `src/app/api/fyd/ask/ask-pipeline.ts` passes `fieldVisibilityDecisions: bundle?.fieldVisibilityDecisions` — but `getSiteBundle()` (site-bundle.ts) **never populates it**, so it is always `undefined` in production and only conservative defaults apply. Mode "owner" is accepted but treated as visitor-safe (grants nothing).

### 8. `src/fyd/capabilities/runtime.ts`
- **Not a policy gate.** Client-side portal Circle capability *execution* runtime: `hasCapability(portal, kind)` (detection over PortalProjection) + executors `executeFollow`/`executeLike`/`submitAsk` (HTTP round-trips, fail-closed to previous state) + `openWebsite` (https-only). A "capability" here = a UI affordance/HTTP action, not an authorization. The actual authority is `capabilityOptions`/`capabilityOptionsForSchema` in `src/fyd/sitespec/schemas.ts` (schema-driven allowed action sets), consumed by `buildCapabilities` (view.ts) and `resolveActions` (edge/resolve.ts).

### 9. `src/fyd/data/ping-object-source.ts` — the verified read seam
- **Inputs/outputs:** `getPingObjectGraph(siteId, opts?)` (async) / `getPingObjectGraphSync(siteId, opts?)` -> `PingProjection {graph, meta, ownerOverlay, presentationIntent}`.
- **Verification (fail closed, in order):** projection file parses; `meta.siteId` matches; every object has a non-empty provenance ref ("no customer fact without a traceable basis"); `graphDigest` (sha256 over canonical JSON) recomputed and compared; presentation-intent block digest-verified. Tamper/mismatch -> throw.
- **Owner overlay:** composed AFTER verification via `applyOwnerFieldCorrections`; `ownerOverlay: false` returns the raw source graph (for SOURCE SAYS X evidence endpoints).
- **Does NOT apply:** field visibility or public-visibility filtering — it serves the full verified graph + overlay; each consumer applies its own gate. This is by design but is exactly why a single boundary is needed downstream.

### 10. `src/app/sites/_shared/spec-pipeline.ts` — `publicGraph`
- `compileSiteSpecWithIntent(siteId)` -> `{graph, spec, findings, renderable}` (base spec from verified graph + approved presentation-intent layer over it; validated). `publicGraph(graph)` — object-level gate (public objects + public-both-endpoint relationships); "the client payload must never contain private objects."
- Live pages (`/sites/happy-place`, `/sites/coppersmith-plumbing`) call `compileSiteSpecWithIntent` then pass `publicGraph(graph)` to `SiteClient`, which builds the render context **by hand** (`{spec, graph, viewer: VIEWER, siteId, heroMedia, galleryMedia}`) — it does **not** call `buildRenderContext`, so `applyFieldVisibility` **never runs on the live site-page path**. `buildRenderContext`'s only callers are the diagnostic `lineage/tracer.ts` and `spike-trace.ts`. Its docstring ("the ONLY supported way to obtain a RenderContext") is aspirational, not true in production.
- `binding-verifier.ts:58` claims "visibility seam (field-visibility.ts) and buildRenderContext own that" — also stale: binding verification is observation-only.

### 11. Canonical boundary candidate?
**No.** No `verifyProjectedGraph` / `publicProjectionFor` / `enforceVisibility` exists anywhere. Current state is 3 near-duplicate public gates (`spec-pipeline.publicGraph`, `edge/resolve.applyPublicVisibilityGate`, ask `publicGraphOf`) with field visibility enforced only inside the ask one.

## Viewer policy inventory
- `ViewerContext` (sitespec): `{viewerId, displayName}` — no tier/policy.
- `EdgeViewer`: `{mode:"visitor"}` — accepted by `buildObjectSheet` but ignored.
- Ask lane: anonymous `{id:null}`, `grants: []`.
- `ViewerTier` = anonymous|visitor|owner|staff|agent + `resolveViewerScope` in `fyd/ask/context-compiler.ts` — **zero production callers (dead code)**; a parallel `fieldVisibility` map in the same file's packet input is also unused. The ask-pipeline's `buildAskFydContext` -> `buildAskContext` (lib/ping/ask-composer.ts) is tier-free.

## Recommendation: where to add the single verified public projection boundary

**Rank 1: `src/fyd/data/ping-object-source.ts` — add `getVerifiedPublicProjection(siteId, viewer?, opts?)` (name TBD) alongside the existing getters.**
Why: it is the only seam every public path already funnels through (site pages, edge API, objects API, ask bundle via tenant-graph, by-id loaders all read via `getPingObjectGraph`/`Sync`). It already owns the two hardest ordering constraints (digest verification BEFORE overlay; overlay AFTER verification). Composition there is: verify -> owner overlay -> **resolve FieldVisibilityDecision[] from the owner store** (new tiny reader) -> `applyFieldVisibility` + `applyHideTraversal` + conflict suppression -> public object/relationship filter -> emit `{graph, receipt}` where the receipt carries `{graphDigest, overlayApplied, decisionsSource, decisionsApplied:[...], viewerTier:"visitor", decidedAt}`. All three duplicate gates then become thin consumers of this function. The existing raw-source path (`ownerOverlay:false`) stays untouched for evidence endpoints.

**Rank 2: `src/fyd/sitespec/field-visibility.ts` — the pure core.** Keep the graph-transform composition (`projectPublicGraph(graph, decisions, conflicts?)` merging `publicGraphOf` + `publicGraph` + `applyPublicVisibilityGate`) as pure, browser-safe, deterministic functions here, called by the Rank-1 boundary. This file already owns the visibility rules; it just must not own digest verification or I/O.

**Why not the others:**
- `spec-pipeline.ts`: app-layer (`src/app/...`), only serves the /sites pages; edge/ask/objects paths do not import it. Extending it widens fragmentation.
- `edge/resolve.ts`: lane-local; its gate is a duplicate that should be deleted in favor of the shared boundary, not extended.
- `visitor-answer.ts`: ask-private `publicGraphOf` should become a consumer of the shared boundary, not the boundary itself.
- `object-projection.ts`: presentational adapter for Card/Node; enforcing there would leave pages/ask unguarded and duplicates the read seam.
- `renderer.tsx buildRenderContext`: client-imported (SiteClient runs in browser), so it can never do server-side digest verification; also currently bypassed by live pages.
- `capabilities/runtime.ts`: client execution runtime, not a policy gate at all.
- `render-model.ts`: deterministic summary/proof artifact, not a projection producer.

## Open items / follow-ups
1. **No writer or durable store for `FieldVisibilityDecision[]` exists.** Before/while adding the boundary, owner-authored hide/coarse decisions need a write path — the natural home is the existing event log (`data/fyd-owner/<objectId>.json`) as a new target family (e.g. `field-visibility:<field>`), which `readOverrides` would then project; the Rank-1 boundary's decision reader consumes the projected `OwnerOverrides`. Today only `addressVisibility` (whole-address hide) and service visibility exist there; per-field `coarse` does not.
2. Confirm whether the two demo tenants (`happy-place`, `coppersmith-plumbing`) are the only production tenants before assuming the owner-store key == siteId == objectId coincidence holds generally.
3. The `context-compiler.ts` tier model (`resolveViewerScope`, `ViewerTier`) is dead code with zero production callers — decide whether to revive it for the owner lane or delete it to avoid a second "policy" vocabulary.
