# AGENT-17: Website / Product Surface Forensics

Repo: /home/nolan/projects/ping | branch fyd-factory | HEAD e48ef710cb889bf4d59b833ef9766067a9e2bbf0
Working tree: 103 dirty files at probe time (other lanes active). All probes read-only via wsl-run.sh. No writes, no commits, no publishes.
Live verification: light-touch GETs against the Pig's `next start -p 3100` (Next.js 15.5.24) on 2026-09-23 ~20:05 MDT.

Counts: 35 pages (31 live, 4 middleware-disabled) | 49 API route files | 784 files under src/.

## 1. Deployment surfaces

| Surface | Target | What it serves | Status |
|---|---|---|---|
| Pig :3100 | `next start -p 3100` on Pig WSL (nolan) | The surface Nolan sees: http://100.79.154.43:3100 | LIVE (verified: /api/health 200, /sites/happy-place 200, /objects 404) |
| Vercel | vercel.json (buildCommand npm run build, output .next) | Production Vercel deployment of this repo | Config present; project/account not verified from repo |
| happy-place-platform.vercel.app | Different Vercel account | Portfolio proof asset for website-revamp pitches | Exists per brief; not this repo's deployment |
| fyd-night-preview | Clean worktree build | Protected preview assembled tonight by another worker | In progress by another agent; not touched |

Two additional `next start` processes (no -p 3100) have run since Sep22 on the Pig; their ports and purposes were not identified (not investigated further; out of scope).

## 2. Middleware (src/middleware.ts)

DISABLED_PAGE_PREFIXES = ["/objects", "/build", "/portal-rail"] return 404 "Not found".
Re-enabled 2026-09-23: /sites/*, /o/*. Deliberately live: /node/*, /embed/*, /dev/*, /fyd, /api/*.
Verified live: /objects -> 404, /sites/happy-place -> 200.

## 3. Page inventory

### 3a. Marketing pages (PING site chrome, customer-facing)

| Route | Backing |
|---|---|
| / | marketing components |
| /about | static |
| /blog, /blog/[slug] | src/lib/blog.ts |
| /contact | static (no API caller found) |
| /faq | src/lib/faq.ts |
| /newsletter, /newsletter/thank-you | newsletter-signup.tsx -> POST /api/newsletter/subscribe |
| /privacy | static |
| /products | static |
| /technology + 8 subpages (agents, business-automation, continuity, events, evidence, integrations, replay, social-objects, tenantos) | static |

### 3b. Product pages

| Route | Classification | Backing / notes |
|---|---|---|
| /sites/happy-place, /sites/coppersmith-plumbing | customer-facing | generateSiteSpec(graph) + validateSiteSpec + SiteClient renderer; data from getPingObjectGraph (PING-side projection dump) |
| /o, /o/[objectId] | customer-facing | loadObjectViewBySlugOrId; AskObjectPanel -> POST /api/fyd/ask |
| /o/[objectId]/manage | operator-facing (owner control plane) | GET/POST /api/fyd/objects/[objectId](/overrides); DemoOwnerContext |
| /fyd | customer-facing (onboarding entry) | POST /api/fyd/onboarding/preview; claims APIs |
| /feed | customer-facing | getPingObjectReader() (PING gateway) |
| /node/[id] | customer-facing | getPingObjectReader().getNode() |
| /embed/object | customer-facing (chromeless embed) | fetch /api/ping/node |
| /practice | operator-facing (sandbox) | /api/practice/* family |
| /dev/objects | dev-facing | getPingObjectGraph |
| /objects, /objects/spatial | DISABLED (404) | lane product surface; code preserved |
| /build/[siteId] | DISABLED (404) | website builder; only non-test caller of builder/planner |
| /portal-rail | DISABLED (404) | geometry fixture |

### 3c. Frontend component families

- src/components/ping/*: ask-ping.tsx (-> POST /api/ping/ask), ping-circle, identity-selector, test-user-card, post-card, bio-editor, selection-bar, object-preview
- src/components/newsletter-signup.tsx (-> POST /api/newsletter/subscribe)
- src/fyd/ui/*: ask-object-panel.tsx (-> POST /api/fyd/ask legacy flat), identity-object.tsx (-> POST /api/fyd/ask/[siteId]), global-ask-dock.tsx (-> trusted path), spatial-ask-panel.tsx (-> hardcoded /api/fyd/ask/happy-place), follow-button.tsx, like-button.tsx (-> /api/fyd/follow, /api/fyd/like), home-circles.tsx, object-circle.tsx, fyd-circle.tsx, why-this.tsx, evidence-state.tsx
- src/fyd/components/renderer.tsx: the sites renderer; factual reads via resolveBoundField (weak verifier); external hrefs via resolveSafeLink
- src/app/sites/_shared/site-client.tsx: client shell for generated sites

## 4. API inventory (49 route files)

### 4a. PING BFF family: /api/ping/* (7)
Backing authority: getPingObjectReader() from @/lib/ping/ping-object-reader -> HTTP to PING_GATEWAY_BASE_URL. Viewer identity: practice identity cookie via @/lib/ping/session (getPracticeIdentityId).

| Route | Method | Frontend caller |
|---|---|---|
| /api/ping/ask | POST | ask-ping.tsx |
| /api/ping/proposal | POST | (signed-envelope approval; caller not found in repo) |
| /api/ping/node | GET | embed/object page |
| /api/ping/circle | GET | 1 caller (template literal) |
| /api/ping/object | GET | none found |
| /api/ping/feed | GET | none found |
| /api/ping/actions | GET | none found |

### 4b. FYD ask: /api/fyd/ask* (2)
Backing: ask-pipeline.ts -> getPingObjectGraph (local dump). TenantContext per request.

| Route | Method | Callers |
|---|---|---|
| /api/fyd/ask | POST (legacy flat; body siteId) | ask-object-panel.tsx (/o pages) |
| /api/fyd/ask/[siteId] | POST (trusted path; tenant from route) | identity-object.tsx, global-ask-dock.tsx; spatial-ask-panel.tsx hardcodes /api/fyd/ask/happy-place |

### 4c. FYD auth: /api/fyd/auth/* (7)
Google OAuth via @/fyd/identity/* (callback-flow, session cookie w/ FYD_SESSION_SECRET, FileIdentityBindingStore).
- GET start / GET callback (sign-in), GET link/google/start / GET link/google/callback (link to session identity), GET session, POST+GET signout, POST unlink.
- No in-repo .tsx linker to either start URL was found (entry point unclear; fyd/page.tsx calls claims APIs, not auth start).

### 4d. FYD claims: /api/fyd/claims/* (6)
Backing: @/fyd/claim/machine + @/fyd/claim/store (file store, FYD_CLAIM_DIR override). Called from /fyd page (onboarding identity claiming).
- POST [resourceId]/claim, POST [resourceId]/release, GET [resourceId], POST [resourceId]/verify, GET identity, GET verification-methods

### 4e. FYD social: /api/fyd/social/* (5) - NO IN-REPO FRONTEND CALLER
Backing: @/fyd/social/actions -> HTTP to fydGatewayBaseUrl() = FYD_PING_GATEWAY_BASE_URL || PING_GATEWAY_BASE_URL || http://127.0.0.1:18199 (repo-booted gateway on Pig).
- GET feed, POST+DELETE follow, POST identity, POST post, GET state

### 4f. FYD objects/projection/media/circle (5)
- GET /api/fyd/objects/[objectId] (loadObjectViewBySlugOrId + getPingObjectGraphSync). Callers: identity-object.tsx, ObjectCircle.tsx, spatial-canvas.tsx, /api/fyd/projection, build owner-panel, o/manage page.
- POST /api/fyd/objects/[objectId]/overrides (owner corrections; createOwnerContext -> DemoOwnerContext today). Caller: o/[objectId]/manage page.
- GET /api/fyd/projection (dump read, ownerOverlay false). No frontend caller (referenced in a comment in owner-overlay.ts).
- GET /api/fyd/media (provenance metadata only, never bytes). No frontend caller found.
- GET /api/fyd/circle (public CircleProjection, CORS *). No frontend caller found (third-party embed boundary).

### 4g. Misc FYD (5)
- GET+POST /api/fyd/customize: Lane D approval API; env-gated (NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 AND private host). Backing: customize/server.ts -> generateSiteSpec + applyPresentationIntent; journals to demo gateway.
- GET+POST /api/fyd/follow, GET+POST /api/fyd/like: file stores (@/fyd/object/follows, FYD_FOLLOWS_DIR; likes equiv). Callers: follow-button.tsx, like-button.tsx, identity-object.tsx.
- POST /api/fyd/onboarding/preview: caller fyd/page.tsx ({url}).

### 4h. Practice sandbox: /api/practice/* (7)
Backing: getPingObjectReader (gateway) + practice session cookie. Called from /practice page components.
- PATCH bio, GET feed, POST+DELETE follow, GET+POST identities, POST+DELETE like, GET profile, GET+POST+DELETE session

### 4i. Platform/infra (6)
- POST /api/kit/webhook (+GET status): Kit -> HPP event log via @/lib/events logEvent. NO signature verification (KIT_WEBHOOK_SECRET never read in route).
- POST /api/newsletter/subscribe: -> Kit (KIT_API_KEY). Caller: newsletter-signup.tsx.
- POST /api/resources/download: no caller found.
- GET /api/diagnostics/sharp: bearer DIAGNOSTIC_SECRET with code fallback 'dev-diagnostic-secret'.
- GET /api/health, GET /api/health/authority (reports KV env presence).

### 4j. Referenced but nonexistent
- /api/estimate: fetched by src/services/estimate.ts but flag-gated OFF (infrastructure-flags.ts estimateApi: false -> mailto instead). No route file.
- /api/drive/*: referenced in media pipeline code/comments (PUBLIC_MEDIA_GATE rejects them). No route file.

## 5. Backing authorities (real modules)

| Concern | Authority module | Notes |
|---|---|---|
| PING canonical reads | @/lib/ping/ping-object-reader (getPingObjectReader) | HTTP to PING_GATEWAY_BASE_URL; viewer = practice identity |
| FYD projection reads | @/fyd/data/ping-object-source (getPingObjectGraph / Sync) | PING-side dump + overlays; the /sites/* data source |
| Object view | @/fyd/object/view (loadObjectView), @/fyd/object/by-id (loadObjectViewBySlugOrId) | /o pages, circle API |
| Identity (FYD) | @/fyd/identity/session + FileIdentityBindingStore | cookie session, file bindings |
| Identity (practice) | @/lib/ping/session | cookie; gates all /api/ping/* |
| Owner context | createOwnerContext (@/fyd/object/*; DemoOwnerContext today) | overrides route |
| Capability eval | @/fyd/owner-mode/capability (evaluateCapability, DEMO_OWNER_ACTOR) | customize route |
| Claim state | @/fyd/claim/store + @/fyd/claim/machine | file store (FYD_CLAIM_DIR) |
| Follow/like state | @/fyd/object/follows (+ likes equiv) | file stores (FYD_FOLLOWS_DIR / FYD_LIKES_DIR) |
| Strong binding truth | @/fyd/sitespec/binding-verifier (verifyBinding, buildVerifiedRenderModel) | ONLY wired into builder/planner |
| Weak binding check | @/fyd/sitespec/graph (verifyPresentationBinding, resolveBoundField) | used by live renderer |
| Safe links | @/fyd/sitespec/safe-link (resolveSafeLink) | used by sites renderer only |
| Media provenance | @/fyd/media/provenance | /api/fyd/media |
| Social backend | PING gateway via @/fyd/social/config fydGatewayBaseUrl() | /api/fyd/social/* proxy |
| Newsletter | Kit via @/lib/kit* (KIT_API_KEY) | subscribe route |
| KV | Vercel KV (KV_REST_API_URL/TOKEN); DEV_MODE_SKIP_KV in media/brand/assignment stores | health/authority reports presence |

## 6. Broken boundaries

DOMAIN: FYD sites render path
COMPONENT: src/app/sites/happy-place/page.tsx, src/app/sites/coppersmith-plumbing/page.tsx
CLAIM: The live /sites/* render path bypasses the strong BindingVerifier; only the weak schema validator runs before render.
EVIDENCE: Both pages call generateSiteSpec from @/fyd/proceduralize/generator then validateSiteSpec/isRenderable. The strong verifier (verifyBinding/buildVerifiedRenderModel in src/fyd/sitespec/binding-verifier.ts, with recorded-owner-assertion enforcement) is called only from src/fyd/builder/planner.ts:398, whose only non-test importer is src/app/build/[siteId]/page.tsx, which middleware 404s. Verified by import/call graph grep at HEAD e48ef710.
CALLER: /sites/* page components
CALLEE: generateSiteSpec (proceduralize/generator.ts:289)
WRITER: PING-side projection dump (getPingObjectGraph)
READER: SiteClient / renderer.tsx
AUTHORITY: none on the live path (binding-verifier.ts is authoritative but unwired)
CLASSIFICATION: customer-facing
CONFIDENCE: HIGH
BROKEN BOUNDARY: EVIDENCE GRAPH -> BINDING VERIFIER -> RENDERER. The documented required boundary (binding-verifier.ts header, FYD-24H-BUILDER decisions) is not the path the product serves.
DEPENDENCIES: @/fyd/proceduralize/generator, @/fyd/sitespec/validator, @/fyd/data/ping-object-source
AFFECTS AGENTS: QA-TRUTH re-verification, LANE-CLAIM R-MODEL, Vercel preview builder, 500-site factory (every generated site inherits this)

---
DOMAIN: FYD sites renderer
COMPONENT: src/fyd/components/renderer.tsx (boundField -> resolveBoundField)
CLAIM: The renderer resolves factual presentation bindings through the weak verifier, which accepts derived/owner_authored classifications unconditionally (object + field existence only), never requiring a recorded owner assertion.
EVIDENCE: renderer.tsx:689-715 calls resolveBoundField from ../sitespec/graph; graph.ts:141-143 `case "derived": case "owner_authored": return { ok: true, value };`. The strong verifyBinding in binding-verifier.ts (which UNBOUNDs owner_authored without a matching recorded assertion) is never called on this path. The renderer's comment claims "the verifier wired into the actual projection path" but it wires the weak one.
CALLER: SiteClient render tree
CALLEE: resolveBoundField / verifyPresentationBinding (sitespec/graph.ts)
WRITER: generateSiteSpec output
READER: site visitors
AUTHORITY: sitespec/graph.ts (weak); binding-verifier.ts (strong, bypassed)
CLASSIFICATION: customer-facing
CONFIDENCE: HIGH
BROKEN BOUNDARY: Renderer truth seam. H4/R-H4 confirmed with nuance: the strong check exists but is not on the serving path.
DEPENDENCIES: sitespec/graph.ts, fyd/components/renderer.tsx
AFFECTS AGENTS: QA lane, security lane (owner_authored without assertion renders as fact)

---
DOMAIN: Object node page
COMPONENT: src/app/o/[objectId]/page.tsx + src/fyd/object/view.ts
CLAIM: Capability hrefs built from observed graph data are interpolated into anchors without the safe-link gate used by the sites renderer.
EVIDENCE: view.ts:207-211 builds { kind:"call", href:"tel:"+phone }, { kind:"email", href:"mailto:"+email }, { kind:"website", href:contact.website } (raw observed URL, no scheme check). page.tsx:77,85,95,121 renders href={cap.href} directly. renderer.tsx (sites) routes external hrefs through resolveSafeLink; the /o page does not. React attribute-escapes but does not block javascript: URLs.
CALLER: /o/[objectId] page (ActionButtons)
CALLEE: loadObjectViewBySlugOrId -> view.ts capability builder
WRITER: PING-side projection dump (contact fields are observed data)
READER: object page visitors
AUTHORITY: none (resolveSafeLink in sitespec/safe-link.ts is the unused authority here)
CLASSIFICATION: customer-facing
CONFIDENCE: HIGH on code state; MEDIUM on patch status (SEC-FIX-SPEC file not located in repo or ~/workspace at probe time, so the 5 checked patches could not be confirmed applied)
BROKEN BOUNDARY: QA-HOSTILE: untrusted-string-to-href seam. Two renderers, two href policies.
DEPENDENCIES: fyd/object/view.ts, app/o/[objectId]/page.tsx
AFFECTS AGENTS: security lane, SEC-FIX-SPEC owner

---
DOMAIN: API surface
COMPONENT: /api/fyd/social/* (feed, follow, post, identity, state), /api/fyd/projection, /api/fyd/media, /api/fyd/circle, /api/resources/download, /api/ping/feed, /api/ping/actions, /api/ping/object
CLAIM: Eight API routes across four families have no in-repo frontend caller; they are served but unreachable from the product UI.
EVIDENCE: grep for fetch("/api... and "/api... literals across src excluding route files returned zero callers for these paths (social only appears in a key-custody.ts doc comment; projection/media/circle only in comments). Live server still serves /api/* (middleware never disables APIs).
CALLER: none in repo (external: Kit for webhook; third-party embeds for /api/fyd/circle CORS *)
CALLEE: n/a
WRITER: various (gateway proxy, file stores, dump)
READER: none in product
AUTHORITY: mixed
CLASSIFICATION: admin/unknown (served, unlinked)
CONFIDENCE: HIGH
BROKEN BOUNDARY: API-without-frontend: unaudited attack surface that still runs on the live box (e.g. social identity minting, claim-adjacent writes).
DEPENDENCIES: PING gateway (social), dump (projection), provenance store (media)
AFFECTS AGENTS: security lane, acquisition cohort (which APIs are real product?)

---
DOMAIN: API surface (inverse)
COMPONENT: src/services/estimate.ts, src/lib/media*.ts, src/fyd/media/*
CLAIM: Frontend code references API routes that do not exist: /api/estimate (flag-gated off) and /api/drive/* (no route file).
EVIDENCE: estimate.ts:94 fetch("/api/estimate") but infrastructure-flags.ts estimateApi:false routes to mailto instead; /api/drive/* appears in media-contracts.ts, media.ts (PUBLIC_MEDIA_GATE rejects such URLs), authority-projection.ts; find src/app -path '*estimate*' -o -path '*drive*' returns nothing.
CALLER: estimate service (dormant), media pipeline comments
CALLEE: nonexistent
WRITER: n/a
READER: n/a
AUTHORITY: none
CLASSIFICATION: dead-or-disabled
CONFIDENCE: HIGH
BROKEN BOUNDARY: Frontend-without-API: dead references that will 404 if the flags ever flip.
DEPENDENCIES: config/infrastructure-flags.ts
AFFECTS AGENTS: factory program (do not rely on /api/estimate or /api/drive)

---
DOMAIN: Ask FYD
COMPONENT: /api/fyd/ask, /api/fyd/ask/[siteId], /api/ping/ask
CLAIM: Three ask APIs with divergent tenancy models coexist; the legacy flat route is still the one the /o page uses despite its own docstring directing new callers to the trusted-path route.
EVIDENCE: ask/route.ts header: "(legacy flat route)... New callers should prefer the trusted-path route POST /api/fyd/ask/[siteId]". ask-object-panel.tsx:111 still POSTs /api/fyd/ask (used by /o pages). identity-object.tsx:282 and global-ask-dock.tsx:102 use the trusted path. spatial-ask-panel.tsx:57 hardcodes /api/fyd/ask/happy-place. /api/ping/ask is a separate BFF (practice-identity viewer, gateway-backed) called by ask-ping.tsx:255.
CALLER: ask-object-panel, identity-object, global-ask-dock, spatial-ask-panel, ask-ping
CALLEE: ask-pipeline.ts handleAskRequest (fyd), ping-object-reader ask() (ping)
WRITER: n/a (read paths)
READER: visitors
AUTHORITY: TenantContext (fyd, per-request); practice identity (ping)
CLASSIFICATION: customer-facing
CONFIDENCE: HIGH
BROKEN BOUNDARY: Tenant isolation is route-shape-dependent: body-tenant (flat) vs path-tenant (trusted) vs cookie-identity (ping BFF). The least-trustworthy shape remains wired to the highest-traffic object page.
DEPENDENCIES: app/api/fyd/ask/ask-pipeline.ts, lib/ping/ping-object-reader.ts
AFFECTS AGENTS: security lane, TD-001 owner (no explore endpoint exists at this HEAD; per-graph narrowing lives in ask-pipeline via TenantContext, which is the closest match to TD-001 and IS present)

---
DOMAIN: Webhook ingress
COMPONENT: src/app/api/kit/webhook/route.ts
CLAIM: The Kit webhook POST performs no signature verification; anyone can POST fabricated subscriber events into the HPP event log.
EVIDENCE: Full route read: parses JSON, maps event names, calls logEvent. KIT_WEBHOOK_SECRET is a known env key (in the env grep list) but is never read in this file (grep for KIT_WEBHOOK_SECRET|verify|signature in the file returned nothing).
CALLER: Kit (intended); anyone (actual)
CALLEE: @/lib/events logEvent
WRITER: webhook caller
READER: PING intelligence (future analysis per header comment)
AUTHORITY: none (no HMAC check)
CLASSIFICATION: admin
CONFIDENCE: HIGH
BROKEN BOUNDARY: Unauthenticated event ingestion into the evidence-adjacent event log.
DEPENDENCIES: lib/events.ts, Kit webhook configuration
AFFECTS AGENTS: security lane, PING event consumers

---
DOMAIN: OAuth
COMPONENT: /api/fyd/auth/* (7 routes)
CLAIM: Two parallel OAuth entry pairs (sign-in vs link-to-identity) exist with no discoverable in-repo UI entry point.
EVIDENCE: auth/google/start+callback and auth/link/google/start+callback both call beginGoogleStart; link variant requires a session (401 otherwise). Grep of *.tsx (excluding api) for either start URL returned zero linkers. fyd/page.tsx (onboarding) calls claims APIs, not auth start.
CALLER: none found in repo UI
CALLEE: @/fyd/identity/callback-flow
WRITER: Google OAuth
READER: session cookie store
AUTHORITY: @/fyd/identity/* (config, session, file-store)
CLASSIFICATION: dead-or-disabled (served but unlinked) / operator-facing
CONFIDENCE: MEDIUM (entry could be constructed via provider.ts URL builders outside *.tsx)
BROKEN BOUNDARY: Auth surface without a product entry point; session/link flows cannot be reached from the UI that the claims onboarding (fyd/page) implies.
DEPENDENCIES: fyd/identity/*, GOOGLE_CLIENT_ID/SECRET env
AFFECTS AGENTS: identity lane, acquisition cohort

---
DOMAIN: Owner control plane
COMPONENT: POST /api/fyd/objects/[objectId]/overrides + /api/fyd/customize
CLAIM: The owner write path runs on DemoOwnerContext / demo-owner mode (explicitly "not real authentication"), gated only by env flag + private-host check; on the Pig (private Tailscale IP) the gate is satisfiable by design.
EVIDENCE: overrides route: "createOwnerContext (DemoOwnerContext today; a PING identity/capability implementation later)". customize route: demoDenied() requires NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 and isPrivateHost(host); approve path journals FYD_SITE_OVERLAY events to the demo journal. Header comment: "the repo-booted gateway; no auth on its event route".
CALLER: o/[objectId]/manage page; customize UI
CALLEE: @/fyd/customize/server (loadCustomizedSite, emitOverlayEvent)
WRITER: demo owner actor
READER: projection dump regen
AUTHORITY: @/fyd/owner-mode/capability (DEMO_OWNER_ACTOR), DemoOwnerContext
CLASSIFICATION: operator-facing
CONFIDENCE: HIGH on code structure; MEDIUM on live exposure (env flag value not read; only code paths inspected)
BROKEN BOUNDARY: Demo-auth write path shares the host with the live product; the demo-journal vs main-journal separation is a comment-level claim, not an enforced boundary found in the routes.
DEPENDENCIES: fyd/owner-mode/*, fyd/customize/*, FYD_*_DIR envs
AFFECTS AGENTS: security lane, factory program (overlay events feed regen)

---
DOMAIN: Disabled pages, live APIs
COMPONENT: middleware DISABLED_PAGE_PREFIXES vs /api/*
CLAIM: /objects, /objects/spatial, /build/*, /portal-rail return 404, but every API backing them stays live, including the only caller of the strong-verifier planner path.
EVIDENCE: middleware.ts isDisabledPage -> 404 (verified live: /objects -> 404). builder/planner.ts (strong BindingVerifier) is imported only by the disabled /build/[siteId]/page.tsx; /api/fyd/projection, /api/fyd/objects/*, /api/fyd/customize remain served.
CALLER: (pages removed)
CALLEE: builder/planner, projection/object/customize APIs
WRITER: n/a
READER: direct API callers
AUTHORITY: n/a
CLASSIFICATION: dead-or-disabled pages; live APIs
CONFIDENCE: HIGH
BROKEN BOUNDARY: Router-level disablement does not disable the runtime: the strong-verifier path is reachable only through a 404 page, while its APIs remain callable.
DEPENDENCIES: src/middleware.ts
AFFECTS AGENTS: QA lane, Vercel preview (disabled pages may 404 differently there)

---
DOMAIN: Diagnostics
COMPONENT: GET /api/diagnostics/sharp
CLAIM: The diagnostics bearer check falls back to a hardcoded dev secret when DIAGNOSTIC_SECRET is unset.
EVIDENCE: route.ts:141 `Bearer ${process.env.DIAGNOSTIC_SECRET || 'dev-diagnostic-secret'}`.
CALLER: operator (intended)
CALLEE: sharp diagnostics
WRITER: n/a
READER: operator
AUTHORITY: bearer token (weak default)
CLASSIFICATION: admin
CONFIDENCE: HIGH
BROKEN BOUNDARY: Secret-gated endpoint with a public default secret.
DEPENDENCIES: none
AFFECTS AGENTS: security lane

---
DOMAIN: Data freshness
COMPONENT: /sites/* pages vs /api/ping/* BFF
CLAIM: Two different read authorities serve "the same" object data: /sites/* render from the PING-side projection dump (getPingObjectGraph), while /api/ping/* read the live gateway (PING_GATEWAY_BASE_URL). Staleness between dump and gateway is unrepresented in the product.
EVIDENCE: sites pages: getPingObjectGraph (comment: "canonical projection written by the PING-side dump, overlays applied from PING events"). ping-object-reader.ts:8 "All PING data flows through PING_GATEWAY_BASE_URL". No freshness/last-dump indicator is passed to SiteClient.
CALLER: sites pages; ping BFF consumers
CALLEE: dump files (FYD_PROJECTION_DIR) vs gateway HTTP
WRITER: PING-side dump job (outside this repo's src)
READER: visitors
AUTHORITY: dump (fyd) vs gateway (ping) - split authority, no arbiter
CLASSIFICATION: customer-facing
CONFIDENCE: MEDIUM-HIGH (dump writer not inspected; read paths confirmed)
BROKEN BOUNDARY: Read-your-writes across the dump seam: an owner override journaled via /api/fyd/customize only appears after "the next regen"; the product shows no staleness state.
DEPENDENCIES: fyd/data/ping-object-source, lib/ping/ping-object-reader
AFFECTS AGENTS: factory program, acquisition cohort (500 sites x dump freshness)

## 7. Notes for critics

- All call-graph claims rest on grep over src/ at HEAD e48ef710 (103 dirty files; none modified by this agent). A caller reachable only via dynamic import or a string built at runtime would be missed; the explicit fetch("/api literal census is the method, documented above.
- SEC-FIX-SPEC was not found in the repo or ~/workspace; the /o href finding is stated from current code, not from the spec's patch list.
- TD-001 ("explore query narrowing per-graph") does not match any endpoint at this HEAD; the nearest real mechanism is TenantContext per-graph narrowing in app/api/fyd/ask/ask-pipeline.ts, which is present and enforced (tenant_mismatch refusals).
- Env values were never read (only key names via grep); exposure assessments for env-gated routes are structural, not runtime-confirmed.
- No em dashes were used in this document.
