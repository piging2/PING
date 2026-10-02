# LANE 5 — PRIVACY TRACE (Q-C-01 / Q-C-02 / Q-C-03) + Q-C-13 HOSTILE FIELD TEST

**Date:** 2026-09-25 ~06:35–07:10 MDT
**Lane:** LANE 5 PRIVACY TRACE (TRACE ONLY — no production behavior changed, no restarts, no credential work, Ask FYD scope unchanged and gated)
**Order:** Nolan's refined order (takes precedence): PRIVACY stays the P0 gate; Q-C-01/02/03 must PASS before any Q-C-09 Ask FYD expansion. Cover EVERY public read path from canonical object/evidence state to serialized browser response. The raw projection route and owner-history exposure are P0 until PROVEN CONTAINED — the fix boundary is the single public projection boundary, not the observed route. NEW P0 Q-C-13 HOSTILE FIELD TEST.

**Checkouts traced:**
- Integration (primary): `/home/nolan/projects/ping`, branch `fyd/sprint-integration-2026-09-24`, HEAD `28e4ba00`
- Runtime comparison: `/home/nolan/build-edge-port` (Pig-localhost-only `:3101` checkout), detached HEAD `8faf96d0`
- Privacy-relevant routes byte-identical between the two. Only relevant difference: a malformed-field fail-closed guard in `src/fyd/sitespec/field-visibility.ts` (runtime checkout); does not change the two known leak findings.
- All findings below are from integration HEAD `28e4ba00` unless noted.

**No-production-change proof:** `git status` after the trace shows only pre-existing untracked build artifacts (`.next.integration-build-20260924/`, `.next.pre-purehead-20260924/`, `tools/fyd-site-projection/__pycache__/`) plus the NEW spec-only test file below. Full invariants suite: 103/103 pass (11 suites).

---

## 1. Verdict summary

| Item | Status | One-line |
|---|---|---|
| Q-C-01 (single verified public projection boundary) | **partial** | Boundary does not exist. At least 5 independent partial-view constructions; 6 disclosure paths confirmed by hostile test. Ask pipeline projects correctly (the one green path). |
| Q-C-02 (render model honesty / semantic identity) | **partial** | `SemanticRenderModel` overclaims as charged; `viewerId`/`asOf` are suspect identity inputs; owner decisions/history treated as public response material in 2 routes. |
| Q-C-03 (versioned renderer/token contracts) | **partial** | `renderer.tsx@unversioned` / `tokens@unversioned` confirmed in code; all public JSON contracts (projection, object, ask, sheet, sitemap) unversioned. |
| Q-C-13 (hostile field test) | **partial** | Spec written, executed 13/13 green on the Pig; documents 6 CONFIRMED disclosure paths (red findings). Full containment NOT proven. |

**Privacy gate:** NOT passed. Ask FYD expansion (Q-C-09) stays gated.

---

## 2. P0 leak 1 — raw projection route (confirmed, open)

**File:** `src/app/api/fyd/projection/route.ts` (integration `28e4ba00`; identical in runtime `8faf96d0`)
**Route:** `GET /api/fyd/projection?siteId=<slug>`
**Handler:** `export async function GET(request: Request)`

```ts
const { graph, meta } = await getPingObjectGraph(siteId, { ownerOverlay: false });
return NextResponse.json({ ok: true, siteId, meta, graph });
```

The route comment calls it a "RAW PING-backed projection." It returns the **canonical object graph** (`ObjectGraph`: every object including non-public ones, every field including hidden ones, all relationships, source observations/provenance embedded in objects, evidence refs) plus dump metadata (`meta`: base digest, overlay PING event ids, graph digest) — with **no owner overlay, no viewer policy, no field projection**. This is a direct Q-C-01 bypass; the unversioned response contract implicates Q-C-03.

**Proven by hostile test** (`[EXPECTED-FAIL] P0: GET /api/fyd/projection serves the RAW graph` — the live route handler was invoked in jest against the real projection dump; response contained the `graph` key).

**Fix boundary (Nolan):** this is P0 until PROVEN CONTAINED, and containment = routing through the single Q-C-01 verified public projection boundary (or removing the route) — never patching just this handler.

## 3. P0 leak 2 — owner history in the public object response (confirmed, open)

**File:** `src/app/api/fyd/objects/[objectId]/route.ts` (integration `28e4ba00`; identical in runtime `8faf96d0`)
**Route:** `GET /api/fyd/objects/[objectId]`
**Handler:** `export async function GET(...)`

```ts
const history = readOverrides(objectId).history;
...
return NextResponse.json({ ok: true, view, history, siteId, projection });
```

`readOverrides` (`src/fyd/object/owner-store.ts` → `projectOwnerState`) returns `OwnerOverrides.history: { at: string; text: string }[]` (`src/fyd/object/types.ts`) — the owner's **human-language action log** ("Spec Owner hid the address field", confirmations, corrections). It is serialized into an **unauthenticated public response**. Direct Q-C-01 bypass + Q-C-02 honesty defect (internal owner decisions treated as public response material) + Q-C-03 (unversioned contract).

**Proven by hostile test** (`[EXPECTED-FAIL] P0: GET /api/fyd/objects/[objectId] serves owner history` — live handler invoked in jest; response contained the `history` key).

**Compounding defect:** the same route's `view` is built by `composeObjectView` over the **raw graph** (`loadObjectViewBySlugOrId` → `getPingObjectGraphSync`, no field projection) — proven by hostile test to disclose a hidden field verbatim (see §6, attack 4).

---

## 4. Every public read path: surface → exposure → exact code → Q-C owner

Verification legend: **[V]** traced to exact code · **[T]** additionally proven by hostile test · **[O]** enumerated, needs deeper verification.

### A. FYD HTTP read routes

| # | Surface | Exposes / could expose | Exact code path | Q-C owner | Ver |
|---|---|---|---|---|---|
| A1 | `GET /api/fyd/projection?siteId=` | Entire canonical graph + dump meta (see §2) | `src/app/api/fyd/projection/route.ts::GET` → `getPingObjectGraph(siteId, {ownerOverlay:false})` | Q-C-01, Q-C-03 | V,T |
| A2 | `GET /api/fyd/objects/[objectId]` | ObjectView (hidden fields — raw graph), **owner history log**, object projection | `src/app/api/fyd/objects/[objectId]/route.ts::GET` → `loadObjectViewBySlugOrId` → `composeObjectView` (`src/fyd/object/view.ts`); `readOverrides(objectId).history` | Q-C-01, Q-C-02, Q-C-03 | V,T |
| A3 | `GET /api/fyd/circle?id=` | CircleProjection: location, services, provenance label/detail, capabilities, sample questions; private fields via transformed location/contact/provenance display | `src/app/api/fyd/circle/route.ts` → `loadCircleProjection` (`src/fyd/object/view.ts`) → `loadObjectView` (raw graph; object-level visibility only) | Q-C-01, Q-C-02 | V |
| A4 | `GET /api/fyd/edge/object?site=&objectId=` | ObjectSheet: **claims carry hidden field values verbatim** (proven), edge groups, evidence refs; gate is object-level only | `src/app/api/fyd/edge/object/route.ts` → `buildObjectSheet(graph,…)` (`src/fyd/edge/resolve.ts`) where graph = raw `getPingObjectGraphSync`; gate `applyPublicVisibilityGate` filters objects/endpoints, not fields | Q-C-01, Q-C-02 | V,T |
| A5 | `POST /api/fyd/ask`, `POST /api/fyd/ask/[siteId]` | Answer, citations (object/field/source), unknowns, suggested actions, proposal, tenant id | `src/app/api/fyd/ask/ask-pipeline.ts::handleAskRequest` → `loadBundleWithOwnerOverlay` → `getSiteBundle` (full graph) → `answerAskFyd` (`src/fyd/ask/visitor-answer.ts`) → private `publicGraphOf` (applyFieldVisibility + applyHideTraversal + conflict suppression). Broad retrieval THEN Ask-local projection — correct filters, wrong construction order (Q-C-01 bypass by construction) | Q-C-01, Q-C-02, Q-C-03 | V,T |
| A6 | `GET /api/fyd/why-this` | Why-this steps: source statement, observed value, observation time, extraction method (can expose a hidden field's value when the object is public) | `src/app/api/fyd/why-this/route.ts` → raw graph + `applyPublicVisibilityGate` (object-level only) | Q-C-01, Q-C-02 | V |
| A7 | `GET /api/fyd/media` (+ `/fyd-media/<hash>/file` static) | Media manifest entries, display URLs, rights/provenance | `src/app/api/fyd/media/route.ts` | Q-C-01 | O |
| A8 | `GET /api/fyd/social/feed`, `GET /api/fyd/social/state` | Posts sourced from PING events; social state | `src/app/api/fyd/social/feed/route.ts` (`{posts, source:"ping_events"}`), `state/route.ts` | Q-C-01 | O |
| A9 | `GET /api/fyd/claims/[resourceId]`, `/claim`, `/verify`, `/identity`, `/verification-methods` | Claim records, verification method metadata | `src/app/api/fyd/claims/...` → `readClaim(resourceId)` | Q-C-01, Q-C-02 | O |
| A10 | `GET /api/fyd/onboarding/preview` | Onboarding preview payload | `src/app/api/fyd/onboarding/preview/route.ts` | Q-C-01 | O |

Auth/session routes (`/api/fyd/auth/*`, `/api/fyd/customize`, `/follow`, `/like`, `/social/post`, `/social/follow`, `/objects/[objectId]/overrides`) are writes or session management, not public read paths — out of scope for this trace.

### B. PING HTTP read routes (parallel public-read construction — same Q-C-01 contract governs)

| # | Surface | Exposes / could expose | Exact code path | Q-C owner | Ver |
|---|---|---|---|---|---|
| B1 | `GET /api/ping/object` | Object JSON via viewerId-scoped reader | `src/app/api/ping/object/route.ts` → `getPingObjectReader().getObject(id, viewerId)` | Q-C-01 | V |
| B2 | `GET /api/ping/node` | Node JSON (feeds `/embed/object`) | `src/app/api/ping/node/route.ts` → `getPingObjectReader().getNode(id, viewerId)` | Q-C-01 | V |
| B3 | `GET /api/ping/circle` | Circle card JSON | `src/app/api/ping/circle/route.ts` → `getPingObjectReader().getCircleCard(identityId, viewerId)` | Q-C-01 | V |
| B4 | `GET /api/ping/feed` | Discovery feed items | `src/app/api/ping/feed/route.ts` → `getPingObjectReader().getDiscoveryFeed(...)` | Q-C-01 | V |
| B5 | `POST /api/ping/ask` | Ask answer (PING lane) | `src/app/api/ping/ask/route.ts` | Q-C-01 | O |

Note: the PING reader keys visibility off `viewerId`, not the FYD owner field-visibility decisions — two parallel visibility authorities. Under Q-C-01 both must resolve to the same verified projection.

### C. Page renders (serialized browser responses)

| # | Surface | Exposes / could expose | Exact code path | Q-C owner | Ver |
|---|---|---|---|---|---|
| C1 | `/sites/[siteId]` (happy-place, coppersmith-plumbing) | Serialized `{ spec, graph }` page state to the browser. **Hidden field B on an otherwise public object survives** — proven | `src/app/sites/[siteId]/page.tsx` → `publicGraph(graph)` (`src/app/sites/_shared/spec-pipeline.ts`: filters `visibility==="public"` objects only; NO field-level enforcement) → `SiteClient` props | Q-C-01, Q-C-03 | V,T |
| C2 | `/sites/[siteId]` metadata | Title/description/OpenGraph derived from a raw-graph public object | `src/app/sites/_shared/site-metadata.ts` → `getPingObjectGraph(siteId)` (no field policy) | Q-C-01, Q-C-02 | V |
| C3 | `/o/[objectId]` + its metadata | ObjectView page; keywords/description from view | `src/app/o/[objectId]/page.tsx` → `ObjectView` (raw-graph construction, §3) | Q-C-01, Q-C-02 | V |
| C4 | `/embed/object` | Embeds `/api/ping/node` (B2) | `src/app/embed/object/page.tsx` | Q-C-01 | V |
| C5 | `/build/[siteId]` | Build/proposal pages | `src/app/build/[siteId]/` | Q-C-01 | O |
| C6 | Renderer (`renderer.tsx`) | `buildRenderContext` DOES apply `applyFieldVisibility` — the one renderer-side seam that honors field policy. But it consumes raw graph + locally interpreted policy, not VerifiedProjection | `src/fyd/components/renderer.tsx` | Q-C-01 | V |

### D. Search / index / SEO

| # | Surface | Exposes / could expose | Exact code path | Q-C owner | Ver |
|---|---|---|---|---|---|
| D1 | `SearchSeam` (ask context compiler) | By contract: object IDs + ranking metadata only ("visibility remains enforced at assembly"). Separate construction path — must consume VerifiedProjection under Q-C-01 | `src/fyd/ask/context-compiler.ts` | Q-C-01 | V,T |
| D2 | `/sitemap.xml` | Static routes + blog posts only; no object URLs today. Unversioned | `src/app/sitemap.ts` | Q-C-03 | V |
| D3 | `generateSiteMetadata` | Only `{title, description, openGraph, twitter, alternates, generator}` — structural; no raw field values beyond name/description | `src/app/sites/_shared/site-metadata.ts` | Q-C-02 | V,T |

### E. Serialization / logging

| # | Surface | Exposes / could expose | Exact code path | Q-C owner | Ver |
|---|---|---|---|---|---|
| E1 | `NextResponse.json(...)` in A1–A6, B1–B4 | Each route's public serialization seam | (routes above) | Q-C-01 | V |
| E2 | `logSitesRenderAudit(...)` | Site render audit: claims, bindings, source references — needs final inspection for hidden values | call sites in `/sites` pages | Q-C-01 | O |
| E3 | Server logs (`:3100.log`) | No route-level `console.log` of graph/bundle found by grep; ask logs projection-load errors only | grep over `src/app/api/fyd` | — | V |

---

## 5. The architectural discrepancy (the Q-C-01 finding)

There is **no single public projection implementation**. At least five independent gates construct public views with **different semantics**:

1. `publicGraph` — `src/app/sites/_shared/spec-pipeline.ts` — whole-object `visibility==="public"` filter; NO field-level enforcement.
2. `applyPublicVisibilityGate` — `src/fyd/edge/resolve.ts` — whole objects + endpoint relationships; NO field-level enforcement.
3. Private `publicGraphOf` — `src/fyd/ask/visitor-answer.ts` — field visibility + hide traversal + conflict suppression (the strongest; Ask-local).
4. `applyFieldVisibility` inside `buildRenderContext` — `src/fyd/components/renderer.tsx` — field-level, but consumes raw graph + locally interpreted policy.
5. `getPingObjectReader()` viewer methods — `viewerId`-scoped, parallel authority, no FYD field decisions.

Whole-object vs field-level is the fault line: every gate except (3) and (4) lets a hidden FIELD on a public object through. The hostile test proves this for (1) and (2).

---

## 6. Q-C-13 hostile field test — spec, execution, per-attack results

**Spec file (NEW, spec-only, not wired into CI):**
`/home/nolan/projects/ping/src/fyd/invariants/__tests__/inv-11-field-level-privacy-8-surfaces.test.ts` (537 lines, untracked)

**Fixture:** one PUBLIC business object `spec-biz-01` ("Harbor View Bakery") with public field A (`tagline` = `SPEC_A_PUBLIC…`) and hidden field B (`phone` = `SPEC_B_HIDDEN…`, owner HIDE decision); B also reachable through the relationship `spec-biz-01 --located_at--> spec-loc-01.address` (`address` = `SPEC_B_ADDR…`, owner HIDE decision). The eight surfaces plus direct object ID, relationship traversal, Ask, search, citations/evidence, serialized page state, cache, replay, regen are attacked; then regen, restart, replay — ATTACK AGAIN.

**Run:** `npx jest --config src/fyd/invariants/jest.config.cjs inv-11-field-level-privacy-8-surfaces` on the Pig — **13/13 pass**. (Convention: `[EXPECTED-FAIL]` tests assert the CURRENT leaky behavior positively, so they pass by documenting a confirmed disclosure; they turn red the day the Q-C-01 boundary lands and must then be rewritten to assert absence. A red finding = confirmed leak, not a broken test.)

| # | Attack | Result |
|---|---|---|
| 1 | Sanity: owner-authorized (canonical) context may still inspect B per policy (HIDE ≠ delete) | **GREEN** |
| 2 | `applyFieldVisibility` + owner HIDE drops B, keeps A; source graph untouched | **GREEN** |
| 3 | Eight-surface battery, pre-regen: SiteBundle→ask consumption, render model, public object endpoint construction (`composeObjectView`+`objectViewToProjection` over projected graph), search seam (id+rank only), Circle/Node sheet, Ask context (direct object ID + relationship traversal + hostile field probe), Ask answer/citations, serialized page state (`publicGraph` over projected graph) — B zero disclosure, A useful | **GREEN** |
| 4 | `[EXPECTED-FAIL]` `composeObjectView` fed the RAW graph discloses B | **RED — leak confirmed** |
| 5 | `[EXPECTED-FAIL]` `buildObjectSheet` fed the RAW graph discloses B (hidden phone in sheet `claims`) | **RED — leak confirmed** |
| 6 | `[EXPECTED-FAIL]` `buildObjectSheet` for the LOCATION discloses `SPEC_B_ADDR` via `located_at` traversal (FYD-Q2 traversal cut exists only in the ask pipeline) | **RED — leak confirmed** |
| 7 | `[EXPECTED-FAIL]` serialized page state from the RAW graph discloses B (`publicGraph` is object-level only) | **RED — leak confirmed** |
| 8 | `[EXPECTED-FAIL]` P0: live `GET /api/fyd/projection` serves the RAW `graph` | **RED — leak confirmed** |
| 9 | `[EXPECTED-FAIL]` P0: live `GET /api/fyd/objects/[objectId]` serves owner `history` | **RED — leak confirmed** |
| 10 | Replay: `appendOwnerEvent(hid-fact)` → `readOverrides` keeps the HIDE; `jest.resetModules` restart keeps it | **GREEN** |
| 11 | Regen: fresh re-ingested source graph + replayed decisions → full battery re-attacked | **GREEN** |
| 12 | Restart: fresh module registry → ask re-attacked, B absent, A present | **GREEN** |
| 13 | Cache: two independent projections byte-identical, B-free, A-present | **GREEN** |

**New findings from the hostile run (beyond the two known leaks):**
- (a) `buildObjectSheet` over a raw graph puts a hidden field value verbatim into the public sheet `claims` array — the edge lane has no field boundary at all.
- (b) The FYD-Q2 traversal cut (`applyHideTraversal`) exists ONLY inside the ask pipeline; the edge/object lane traverses `located_at` into a hidden address with no cut.
- (c) `owner.hid-fact` events only apply to `contact:address` and `service:*` targets (`OwnerEventError` otherwise) — the general field-HIDE lives only in the separate `FieldVisibilityDecision` bounded control, with no owner-event counterpart. Owner-decision replay covers address/service hides; general field hides replay only via the decision list.
- (d) The ask pipeline is the one green path: with the owner HIDE decisions supplied, B has zero disclosure across answer, citations, unknowns, actions, and proposal — including direct-object-ID, traversal, and hostile-probe attacks. Its defect is construction order (broad retrieval, then local projection), not filter strength.

---

## 7. Q-C-02 / Q-C-03 trace notes

**Q-C-02:** `buildSemanticRenderModel` (`src/fyd/sitespec/render-model.ts`) confirmed to record page/section/component/object IDs + heading/copy + `viewerId` + arbitrary `asOf` + canonicalized raw owner visibility decisions. It does not represent visible semantic values or effective visibility; `viewerId`/`asOf` are suspect semantic-identity inputs (prefer effective viewer-policy digest + revision + checkpoint). Owner history served as public response material (A2) is a Q-C-02 honesty defect.
**Q-C-03:** `RENDERER_VERSION = "renderer.tsx@unversioned"`, `DESIGN_TOKEN_VERSION = "tokens@unversioned"` confirmed in `render-model.ts`. All public JSON contracts (A1, A2, A4, A5, sitemap) are unversioned.

---

## 8. Fix boundary (standing)

Per Nolan's refined order: the raw projection route and owner-history exposure are P0 **until PROVEN CONTAINED**, and containment is the **single public projection boundary** — `Canonical ObjectGraph + Evidence + Owner Decisions + Viewer Policy + Capabilities -> VerifiedProjection`, consumed by every public surface (A1–A10, B1–B5, C1–C6, D1–D3). Patching only the observed route is not containment: attacks 4–7 prove the same disclosure class exists in four other constructions. Ask FYD stays gated until Q-C-01/02/03 close; no expansion.

## 9. Caveats / open items

- **[O]** items in §4 (media route, social feed/state, claims reads, `/build/[siteId]`, `logSitesRenderAudit` contents) are enumerated but need deeper verification in a follow-up trace.
- The hostile spec's `[EXPECTED-FAIL]` tests pin CURRENT leaky behavior; when the Q-C-01 boundary lands they must be rewritten to assert absence (they will fail at that point by design, forcing the update).
- Server restart (real `:3100` process) could not be exercised by the spec per the no-restart constraint; module-registry restart is covered (attack 12). A browser-capable wave should re-attack the live routes post-fix.
- Q-C-13's refined definition (B reachable through relationships; regen/restart/replay attack-again) has been appended to WORK-QUEUE.jsonl as the standing definition.
