# FYD Next.js App: Routes / Dev-Server / Media Inventory

Repo: `/home/nolan/projects/ping` (Next.js 15.5.24, React 18, Tailwind 4). Read-only inventory, 2026-09-22.

## 1. `/o` routes (`src/app/o/`)

Three routes exist (earlier listing cut off at 100 files, so the directory was missed at first):

### `/o` (`o/page.tsx`)
- Object directory index. Renders one `ObjectCircle` per object from `listObjectIds()` + `loadObjectView(id)` in `@/fyd/object/view`.
- Header comment is explicit: **DEMOTED** ("the full-page customer projection is an optional projection, not the product surface. The product primitive is the Circle. This page remains for the optional-projection lane and is not linked from normal navigation."). `robots: { index: false }`, `force-dynamic`.
- Data: file reads, no API call, no gateway call (see section 9).

### `/o/[objectId]` (`o/[objectId]/page.tsx`)
- "Object Node: the complete intelligent presence of one FYD object." Belongs visually to the OBJECT, not PING (no PING nav/footer). Same DEMOTED note; `./manage` unaffected.
- Renders entirely from the generic `ObjectView` projection: hero/identity header, action buttons (call / email / website via `ObjectCapability`), services, `AskObjectPanel` (`@/fyd/ui/ask-object-panel`), `WhyThis` provenance disclosure.
- Data: `loadObjectView(objectId)` (file reads, sync). No business-specific code; HPP and Coppersmith flow through the same components. `force-dynamic`, noindex.

### `/o/[objectId]/manage` (`o/[objectId]/manage/page.tsx`)
- Client "Object Manage (demo)" owner control plane: Overview, Content, Services, Media, Contact, Appearance, Ask FYD, Connections, History tabs.
- Every change posts an `OwnerCommand` to `POST /api/fyd/objects/[objectId]/overrides` and re-reads the public ObjectView. Labeled "Simulated owner session. NOT production auth."

## 2. `/node` routes (`src/app/node/[id]/`)

- **No `/node` root exists**, only `/node/[id]`.
- Server page (`node/[id]/page.tsx`) fetches `NodePayload` server-side via `getPingObjectReader().getNode(id, viewerId)` and renders `NodeClient`, which renders `NodeSections` inside `<main className="mx-auto w-full max-w-3xl px-4 py-6">`.
- Data path: `PingObjectReader` (`@/lib/ping/ping-object-reader`) is a server-only BFF adapter to the **PING gateway** over `PING_GATEWAY_BASE_URL` (env). Reads use the gateway event query route; writes submit signed canonical envelopes. When the gateway is unconfigured/unreachable, every method throws a typed error (nothing is faked).
- `NodeClient` holds Ask prefill state (object action rows can open "Ask PING" with a drafted question) and refetches via `GET /api/ping/node?id=...` after mutations.
- Note: this is the PING-social object lane (`/api/ping/*`), distinct from the FYD lane (`/api/fyd/*`) below.

## 3. `/portal-rail` (`src/app/portal-rail/`)

- "Portal rail placement harness: **unlinked dev proof route**." Exists only to prove the spatial primitive (website canvas + intelligent side rail). Not customer product.
- Query params (all defaulted):
  - `business=happy-place|coppersmith-plumbing` (default `happy-place`)
  - `side=left|right|auto` (default `auto`)
  - `mode=static|sticky` (default `static`)
- Server (`page.tsx`): builds a `PortalProjection` via `buildPortalProjection(business)` from `@/fyd/preview/pipeline`. Returns a plain "No portal projection" fallback if null.
- Client (`rail-client.tsx`): renders ONE `PortalCircle` (`@/fyd/ui/portal-circle`) in a side rail next to a **fixture** business page (`fixture.tsx`: FixtureHero / FixtureContent / FixtureFooter, content `max-w` 1200). Side resolution: forced `left|right` renders as-is; `auto` measures live margins and applies the rail rule (`@/fyd/placement/rail-rule.ts`, `chooseRailSide`). Rail never renders at or below 719px viewport (`MOBILE_MAX_W`); "NO BOTTOM PORTAL" when the rule returns `none`.
- `metrics.ts`: live geometry measurement exposed on `window.__railMetrics` (content width, left/right free px, portal bbox, scrollY). Two hard invariants: `overlapPx = 0` (portal never covers customer content) and `hOverflowPx = 0` (no horizontal overflow).
- PortalCircle phases: rest (64px circle) / aware (112px on hover/focus) / engaged (200-480px spatial expansion, perimeter controls Follow/Like/Ask/Web) / ask (interior swaps to compact conversational state, "Talk TO the object, not a chatbot"). Refusal copy: "I do not have evidence for that yet." (`NO_EVIDENCE_COPY`).

## 4. `/sites` routes (`src/app/sites/`)

- **Not dynamic**: two fixed routes, `sites/happy-place/page.tsx` and `sites/coppersmith-plumbing/page.tsx`. No `[slug]`.
- Both are server components with identical shape (procedural clone proof):
  1. `getPingObjectGraph(SITE_ID)` from `@/fyd/data/ping-object-source` (digest-verified JSON projection dumped from the PING journal).
  2. `generateSiteSpec(graph)` (procedural site generator).
  3. `applyPresentationIntent(base, presentationIntent, graph)` (approved owner directives layered over the spec; facts and theme untouched).
  4. `heroMediaFor(SITE_ID, graph, ownerObjectId)` resolved at the server render seam (null when the owner has no acquired media).
  5. `validateSiteSpec` / `isRenderable`; an invalid spec never renders.
  6. Render `<SiteClient spec graph findings renderable siteId heroMedia />` + `<DemoOwnerMode siteId />`.
- `SiteClient` (client): demo header, page tabs rendered from `spec.navigation`, `SitePageView` renderer (`@/fyd/components/renderer`), structured editor below the site producing `site_patch` proposals (reorder/hide sections, featured object, copy edits, design tokens).
- Both pages render **chromeless** per root layout (see section 6): no PING header/footer on `/sites/*`. They carry their own FYD Social demo header instead.

## 5. `/fyd` (`src/app/fyd/page.tsx`)

- FYD onboarding entry point. Client page. Flow: paste a business URL -> `POST /api/fyd/onboarding/preview` -> shows extracted evidence (title, description, phone, email, address, hours, services) -> claim/save/verify/release via `/api/fyd/claims/*`.
- Positioning is deliberate: preview is anonymous and comes before any registration; claim flow only appears after the user has seen value. Claim states: `observed` / `claimed` / `verified-controlled` (evidence-bearing ownership).
- Note: this page does NOT currently show the object experience; it is the intake funnel.

## 6. Root layout (`src/app/layout.tsx`) and where a margin/rail identity object can live

Layout structure (precise):
- `<html>` with Geist/Geist_Mono/Playfair font variables, dark/light theme bootstrap script from localStorage (`ping-theme`).
- `<body className="min-h-full flex flex-col bg-background">` wraps: `ThemeProvider` (default light) > `MotionProvider` > `LenisProvider` > `SpeculationRules`, skip-to-main link, `ScrollToTop`, then conditionally `<SiteHeader />`, `<main id="main-content" className="flex-1">{children}</main>`, conditionally `<SiteFooter />`.
- **No fixed sidebars, no app shell with rails.** The layout is a simple header / flexible main / footer stack.
- Chromeless switching: `await headers()` reads the `x-pathname` header set in middleware. Routes `/o`, `/o/*`, `/sites/*`, `/build/*` skip `SiteHeader`, `SiteFooter`, and the org JSON-LD (they belong visually to the object/customer, "never to PING engineering"). Note: `/portal-rail`, `/node/*`, `/fyd` currently render WITH the PING header/footer.
- Content width conventions per page (not in layout): `node-client` uses `max-w-3xl`; `site-client` demo header uses `max-w-5xl`; `/o` index uses `max-w-2xl`; portal-rail fixture uses `CONTENT_MAX_W = 1200`. Content is always centered `mx-auto` inside a full-width `main`.

**Where a persistent margin/rail identity object can live without breaking the layout:**
- There is no existing fixed rail, so a new one would not collide with one. The natural home is the free gutters on wide viewports, exactly as proven by `/portal-rail`: centered max-width content columns leave empty margins on either side at desktop widths.
- The proven spatial pattern already exists: `chooseRailSide` (rail-rule) + `PortalCircle` + `window.__railMetrics` invariants (zero overlap with content, zero horizontal overflow), with `static` (normal flow) vs `sticky` positioning modes and a hard cutoff below 719px. Reusing `PortalCircle`/`ObjectCircle` plus the rail-rule keeps the new surface consistent with the harness.
- Placement decision: a layout-level rail would need a mount point inside `RootLayout` (or a provider component rendered there) plus per-page awareness of the content column width, since each route centers its own max-width. The chromeless routes (`/o`, `/sites/*`) have no header/footer, so a rail there must be fully self-contained.
- Caveat: `LenisProvider` wraps everything; the portal harness measured fine under it, but any sticky/fixed rail should be verified against Lenis smooth-scroll behavior.

## 7. API routes

### Ask FYD (evidence-bounded Q&A)
- Routes: `POST /api/fyd/ask` (legacy flat route) and `POST /api/fyd/ask/[siteId]` (trusted-path; tenant comes from the route path, body-supplied tenant identity refused on mismatch with 400 `tenant_mismatch`).
- Input (flat): `{ siteId: string, objectId?: string, question: string, mode?: "visitor" | "owner" }`. Trusted-path body: `{ question, objectId?, mode? }`.
- Output: `{ ok: true, answer, answerClass, refusal, citations, unknowns, suggestedActions, proposal, tenantId }` where `answerClass` is `"supported" | "derived" | "unknown"`, every citation carries `claimClass` (`"supported" | "derived"`), `unknowns: string[]`, `suggestedActions` (available actions, `[]` when none), `proposal` (draft AskProposal or null). Errors are structured JSON (404 unknown site/object, 400 bad question, 503 projection unavailable); the answer is `unknown` in every failure case, never an empty body.
- **How it answers today (deterministic, no LLM):** `visitor-answer.ts` (server-only, framework-free) loads the site bundle (`@/fyd/media/site-bundle`), projects the graph to PUBLIC objects/relationships only (owner field-visibility decisions apply first; address-bearing fields coarsened, never leaked verbatim), builds an `AskFydContext` with an anonymous viewer and visitor-safe grants, then runs `composeAskFyd` (`@/fyd/ask/answer.ts`) which delegates to the existing deterministic composer (`@/lib/ping/ask-composer`). Site-change intents are detected first and become digest-bound `site_patch` proposal drafts; the human approves the exact digest. `mode: "owner"` is accepted but treated as visitor-safe (grants nothing) until an authenticated lane exists.
- **Evidence-bounded: yes, explicitly.** `visitor-answer.ts` documents the evidence contract: "never invent business facts. When the composed answer cites no evidence, the outcome is a refusal (ok: true, refusal: true) with visitor-facing wording, not a guess." Refusal copy: "I do not have evidence for that yet."

### Object/graph data
- `GET /api/fyd/objects/[objectId]` (route.ts) + `POST /api/fyd/objects/[objectId]/overrides` (with `patch-loop.ts`): read object views, write owner overrides. Tests exist alongside (`__tests__/`).
- `POST /api/fyd/social/*` (identity, state, feed, post, follow), `/api/fyd/circle`, `/api/fyd/projection`, `/api/fyd/like`, `/api/fyd/follow`, `/api/fyd/media`, `/api/fyd/customize`.
- Separate PING-social lane: `/api/ping/ask`, `/api/ping/node`, `/api/ping/object`, `/api/ping/feed`, `/api/ping/circle`, `/api/ping/proposal`, `/api/ping/actions` (used by `/node/[id]`).
- Read-surface inventory doc: `src/app/api/fyd/READ-SURFACE-INVENTORY.md`.

## 8. Dev server on port 3100

- **Not currently running**: no listener on 3100 (`ss`/`netstat` empty), no `next`/`node` processes beyond unrelated tooling (Codex runtime).
- `package.json` scripts: `dev` is plain `next dev` (no port argument); no `dev:3100` or similar script. No PM2 installed; no systemd units for Next/3100 (only `ping-mirror-sync`, `ping-oci-queue` timers).
- The port-3100 convention comes from `portal-proof/`: `README.md`, `rail-capture/rail-capture.mjs`, `capture-matrix.mjs`, `measure-perf.mjs`, `verify-launch.mjs`, `debug-resize*.mjs`, `probe-slots.mjs` all default `PORTAL_BASE` to `http://localhost:3100/` (overridable). **No launch command is recorded anywhere**: greps of `portal-proof/` found no `next dev -p 3100` / `PORT=3100` / spawn invocation, and the README assumes the dev server is already up ("They run against a local Next.js dev server").
- Conclusion: exact historical command not recoverable from the repo. The compatible convention would be `PORT=3100 npm run dev` or `npx next dev -p 3100` from `/home/nolan/projects/ping`. Working directory: `/home/nolan/projects/ping`.

## 9. Data sources (canonical layers)

The `loadObjectView` docblock (`src/fyd/object/view.ts`) defines the three strictly separated layers used by `/o/*`, `/sites/*`, and Ask FYD alike:

1. **SOURCE STATE (read-only):** PING-backed projections at `/home/nolan/ping/var/fyd-projections/<siteId>.json` (env `FYD_PROJECTION_DIR` override). On disk now: `happy-place.json`, `coppersmith-plumbing.json`, `ping-fyd.json`, plus `happy-place.json.lane-c-backup`. Digest-verified; the only customer-data source at runtime.
2. **DERIVED:** deterministic transforms of source state (area parsing, category mapping), always labeled with basis.
3. **OWNER STATE (durable):** `data/fyd-owner/<objectId>.json` in the repo (env `FYD_OWNER_DIR` override for tests); append-only event log (`owner-events.ts`); source re-ingest can never erase owner intent.
- The `/node/[id]` PING lane is separate: live gateway reads via `PING_GATEWAY_BASE_URL` (fails typed, never faked).

## 10. Media

- `public/`: `brand/`, `fyd-media/` (digest-named files, e.g. `36e4ff5cab1bafa809ab3d555bdf4b85617157da2ed0e88311e184d942eba668` matching the ingested Coppersmith logo digest), `images/` (about.svg, favicon.svg, hero-background.jpeg / hero-background-enhanced.jpg, hero.svg, og-default.svg, ping-social-logo.png, projects/, services/), `file.svg`, `fyd-circle-loader.js`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`.
- Business media manifests: `src/fyd/media/manifests/happy-place.json` and `coppersmith-plumbing.json` (generator `fyd-media@2`, ingestRunId + observations with rights-gate outcomes per image). **Happy Place: `"media": []` (no acquired media; only a rejected Google logo reference). Coppersmith: logo ingested** (`https://www.coppersmithplumbing.com/wp-content/uploads/2024/04/coppersmith-logo-black-n-copper.png`, digest 36e4ff5...). Preview manifests exist at `src/fyd/preview/manifests/<siteId>.json` for both.
- No per-business images live under `public/` by human-readable name; media is digest-addressed. Media consumers: `heroMediaFor` / `listObjectMedia` (`@/fyd/media/select`), `resolveCircleBackground` (`@/fyd/media/circle-background`).
- Note: `package.json` has `"images": "node scripts/image-pipeline.mjs"`, but **`scripts/image-pipeline.mjs` does not exist** (scripts/ contains only `dbg-slots.ts`, `verify-interactions.ts`, `verify-portal.ts`). There is `test:media-invariant` (`tsx scripts/test-media-invariant.ts`, also not present as a file) and `reconcile:hashes` (`tsx scripts/reconcile-media-hashes.ts`, also absent). Media-pipeline scripts appear to have been removed or never committed; the manifests on disk were written 2026-09-21 by `fyd-media@2`.

## 11. Reusable circle components (for the object experience build)

- `@/fyd/ui/portal-circle` (`PortalCircle`): portal-grade margin object with rest/aware/engaged/ask phases, Follow/Like/Ask/Web perimeter controls, capabilities runtime (`@/fyd/capabilities/runtime`: executeFollow, executeLike, submitAsk). Used by `/portal-rail`.
- `@/fyd/ui/object-circle` (`ObjectCircle`): used by the `/o` index.
- `@/fyd/ui/ask-object-panel`, `@/fyd/ui/why-this`: Ask + provenance UI used on `/o/[objectId]`.
- `@/dev` lab: `/dev/objects` (objects-lab-client) with deep-link presets (`?site=...&type=...&projection=Card|Node&viewport=...`), same PING-backed source, noindex/unlinked.

## 12. Caveats and gaps

- Exact `next dev` launch command for port 3100 is not recorded anywhere; do not claim a specific historical command beyond the evidence above.
- `scripts/image-pipeline.mjs` (referenced by `npm run images`) is missing, as are the two `tsx` media scripts; do not assume the media pipeline is currently runnable.
- Nothing on port 3100 is running now; starting it is out of scope for this read-only pass (per task).
- No browser testing was performed; route behavior is from source reading only.
