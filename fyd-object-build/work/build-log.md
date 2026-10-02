# Build Log: PING Object Experience (/objects)

Date: 2026-09-22. Builder: Pigi (subagent build worker).
Task: two live identity objects (Happy Place, Coppersmith) as compact circles in a persistent rail on a PING surface, with animated expansion, graph-derived identity/relationships/actions, evidence-bounded Ask FYD, Open Node.

## Baseline (pre-change)
- Branch: fyd/builder-composition. Working tree clean except untracked .github/ and src/fyd/jest.config.cjs (not mine, untouched).
- Dev server on Pig port 3100: HTTP 200 (already running, left alone).
- Test baseline: to be recorded before/after via src/fyd/object/jest.config.cjs.

## Key live verifications (not assumed from inventory)
- Media seam probe (tsx, 2026-09-22): `listObjectMedia("coppersmith-plumbing", graph, biz)` returns 11 rights-authorized entries including 2 role=logo (`/fyd-media/36e4ff5cab.../thumbnail-400w`, rightsBasis "Public marketing imagery on the business site; authorized for acquisition..."). The data inventory's claim that Coppersmith's UI media array is empty was stale/wrong. Circle face for Coppersmith = the logo via the existing select.ts seam (rights gate passed). Happy Place: media [] -> deterministic gradient + initials (correct, no hotlink of fields.images).
- GET /api/fyd/objects/[objectId] currently uses ONLY the slug-keyed loadObjectView: it 404s on PING object ids (e.g. service ids). Enrichment required for in-expansion service-as-object navigation.
- /o/[objectId]/page.tsx uses ONLY slug-keyed loadObjectView (generateMetadata + page). Same enrichment required for Open Node on non-business objects.

## Feed-spec cross-check (production projection stays the served source)
Source: ~/workspace/fyd-build/work/hpp-happy-place-graph-data.md (repo-canonical). The UI displays projection facts as-is; discrepancies are FLAGGED here, never patched in UI code.
- FLAG F1: projection lists "Pergola Design Consultations" as a service (predicate provides). Feed spec: private journal-derived service, no repo counterpart, keep private, owner decision pending. Displayed because the served projection carries it; not filtered in UI code.
- FLAG F1 UPDATE (2026-09-22, live re-probe): the live Happy Place graph now marks website-service-51de038c1defe8bd as visibility=private, and the live graph carries five public services (Repairs, Fencing, Painting, Drywall, Restoration) on "offers" edges. The by-id loader and the /api/fyd/objects/[objectId] route fail closed on the private pergola service ("Unknown object."). The conflict resolved itself in the served data; the test fixture (byte-copy from 2026-09-21) still pins the old public state, which is correct for the fixture contract.
- FLAG F2: projection is missing "decks" (repo-canonical live service #1; plan-lane conflict C1). 6 services shown from projection; decks absent.
- FLAG F3: projection business description/summary is website-ingestion-derived; feed spec's repo-canonical description differs (plan-lane conflict C4). UI shows the projection's summary with website-derived evidence labeling.
- Naming: brand rendered only as "Happy Place Carpentry" / "Happy Place Carpentry LLC" (projection titles). "Happy Place Productions" appears nowhere in UI copy (per plan hard rule).
- No customer surnames anywhere: no archived records are displayed; live projection carries none.
- Remote-only Vercel Blob media: not present in the served projection; nothing presented as owned media.
- DELTA (P1, not this proof): feed spec documents 4 live PROJECT objects, 8 FAQs, 2 people, cities, materials, media bindings as the plan lane's first-object work. The served production projection contains zero project/faq objects, so the proof shows no Projects section. Recorded, not re-architected.
- "Request estimate" capability: SKIPPED for this proof. service_href is not in the ObjectView contract; plumbing it through view.ts would be new infrastructure beyond the proof. Service rows link to the service object (Open Node) instead.

## Changes

### 1. src/fyd/object/object-projection.ts (THE DATA GAP FIX)
- `objectViewToProjection(view, graph?)`: new optional second param (backwards compatible; the one existing caller, objects-lab-client, passes view only and sees identical output plus empty new fields).
- New projection fields, all populated ONLY from real active graph relationships (fail-closed: no graph -> empty):
  - `people: RelatedRef[]` from works_for/has_team_member/employs edges resolving to public person-schema objects. Coppersmith: "coppersmithplm" (Works for). Happy Place: [] (correct).
  - `externalIdentities: RelatedRef[]` from links_to edges to external_identity-schema objects (from the business or its people). Coppersmith: "coppersmithplumbing.com" (Linked profile). Happy Place: [] (correct).
  - `serviceRefs: RelatedRef[]` from provides/offers edges to service-schema objects (predicate-verified, owner visibility/order preserved via view.services).
  - `locationRef: RelatedRef | null` from located_at (withheld when the owner hid the address).
- Relationship selection reuses the related.ts predicate vocabulary and fail-closed rules (active only, public objects only, never the business itself, deterministic canonical edge order). Evidence per ref carries the relationship evidenceRef.
- Person honesty: people refs carry evidence state observed with receipt "Business website (structured data)"; the UI adds the qualifier that the name is website-claimed, not a verified person.

### 2. src/fyd/object/by-id.ts
- New `loadObjectViewBySlugOrId(objectId)`: slug path first (legacy), then by-id scan across all site tenants. Fail-closed (null when unknown).

### 3. src/app/api/fyd/objects/[objectId]/route.ts
- Uses loadObjectViewBySlugOrId; response gains `siteId` and `projection` (graph-enriched ObjectProjection). Existing `view` + `history` fields unchanged (Manage surface unaffected).

### 4. src/app/o/[objectId]/page.tsx
- generateMetadata + page resolve via loadObjectViewBySlugOrId, so /o/<any-public-object-id> loads (Open Node from a service object). 404 behavior unchanged for unknown ids.

### 5. src/app/objects/page.tsx (new, server)
- Builds both projections server-side via the proven read seam (loadObjectView + getPingObjectGraphSync + objectViewToProjection(view, graph)).
- Circle face resolved server-side: rights-authorized logo (view.media role=logo) or deterministic gradient via resolveCircleBackground.
- Renders with SiteHeader/SiteFooter (PING surface, correct).

### 6. src/app/objects/objects-client.tsx (new, client)
- Quiet stage: heading + one-line explanation.
- Desktop (>=720px): sticky right rail, two IdentityObjects stacked (in-flow sticky column: zero overlap, zero horizontal overflow by construction; rail-rule invariants satisfied structurally).
- Mobile (<720px): in-flow horizontal tray at top (not an overlay).

### 7. src/fyd/ui/identity-object.tsx (new, client)
- One data-driven component, no customer-specific JSX.
- Compact: 64px circle (logo or gradient+initials), name, kindLabel "Business", one-line context.
- circleReducer state machine (collapsed/peek/expanded/ask) with the documented 250ms hover-leave and 150ms blur grace timers.
- Desktop (hover-capable): hover/focus -> peek popover anchored to circle (framer-motion springs from motionTokens, spatially continuous); tap pins the expanded popover; close on leaving circle+popover (grace), tapOutside, Escape, or close button. Keyboard: Enter/Space opens, Escape closes, focus returns to trigger.
- Mobile (no hover): tap -> bottom sheet (proven ObjectCircle dialog pattern: fixed inset-0, scrim, Escape, focus return, scroll lock, 44px targets).
- Expansion: FYD royal purple/gold border treatment; identity header; summary + key facts with EvidenceStateLabel; relationships grouped Services / People / External identities / Location as clickable rows; capability actions (Follow via executeFollow, Ask FYD, Open Node -> /o/<id>, Website, Call from capabilities only); provenance (WhyThis + ref).
- Related-object navigation: click a row -> GET /api/fyd/objects/[id] -> expansion swaps to that live object (Back returns). Services open as objects.
- Ask FYD: inline ask -> POST /api/fyd/ask/<siteId> {question, objectId, mode:"visitor"} -> answer with citations or honest refusal.

## Verification
(To be filled: Playwright on Pig vs http://127.0.0.1:3100, screenshots in ../evidence/)

### Follow-up type fixes applied after first tsc run (2026-09-22)
- src/fyd/components/object-rail.tsx: existing `pingObjectToProjection` adapter gained the three new projection fields (externalIdentities: [], serviceRefs: [], locationRef: null). Its documented minimalism is unchanged.
- src/app/objects/page.tsx: fixed CircleBackground discriminated-union narrowing (bg.kind === "image" branch returns the logo; gradient branch reads bg.css).
- src/fyd/ui/identity-object.tsx: trigger circle now reads face from the ObjectHandle (handle.face), not the projection.
- tsc --noEmit: clean after fixes.

### Curl verification vs the live dev server (2026-09-22, via Pig localhost:3100)
- GET /objects -> 200. HTML contains both business names, both "Show details for" triggers, Coppersmith rights-authorized logo img (/fyd-media/...thumbnail-400w.webp), Happy Place deterministic gradient + "HL" initials (mobile tray + desktop rail copies).
- GET /api/fyd/objects/<public-service-id> (Fencing) -> ok:true, siteId happy-place, kind Service.
- GET /api/fyd/objects/<coppersmith-person-id> -> ok:true, siteId coppersmith-plumbing, name coppersmithplm.
- GET /api/fyd/objects/<private-service-id> (pergola) -> ok:false, "Unknown object." (fail-closed, correct).
- GET /o/<public-service-id> -> 200 (was 404 before the by-id enrichment).
- GET /o/<coppersmith-person-id> -> 200.
- POST /api/fyd/ask/happy-place supported ("What services do they offer?") -> refusal:false, evidence-bounded answer with citations ("Related offerings: Repairs; Fencing; Painting; Drywall; Restoration. [9]").
- POST /api/fyd/ask/happy-place unsupported ("What is the square root of 18347?") -> refusal:true, deterministic "I do not have evidence for that in the current context, so I will not guess."
- GET /sites/happy-place -> 200 (no regression on the existing customer surface).
- No em dashes in any user-facing copy (grep verified).

### Still pending (needs parent/root browser delegation; this subagent cannot operate a browser)
- Desktop 1440x900 and mobile 390x844 screenshots under ~/workspace/fyd-object-build/evidence/.
- Interaction checks: hover expansion, keyboard (Enter/Space/Escape, focus return), service row navigation + Back, Ask FYD supported/unsupported in the expansion, Open Node, sheet close on mobile, overflow, layout shift, /sites/happy-place mobile regression.

## Test runs
- npx jest --config src/fyd/object/jest.config.cjs: 13 suites, 131 tests, all pass (2026-09-22).
- New suite src/fyd/object/__tests__/projection-relations.test.ts (8 tests): loadObjectViewBySlugOrId (slug, service id, cross-tenant person id, unknown -> null) and the projection relationship fields against the real fixture graphs (Happy Place location+service refs, Coppersmith person + two-hop external identity + location, no-graph backward compat, owner-visibility gating on serviceRefs). One initial assertion fixed during the run (slug views carry the site slug as view.id, per the legacy loader contract).
- npx tsc --noEmit -p tsconfig.json: clean.

## First broken interaction
none (all curl/API checks pass; browser interaction checks still pending delegation)
