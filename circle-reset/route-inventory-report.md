All evidence gathered. Compiling the final report.

---

# Inventory: PING homepage, navigation, and experimental-route callers

Repo: `/home/nolan/projects/ping`, branch `fyd/builder-composition` (uncommitted changes present; notably an untracked `src/app/objects/` route). Read-only work, nothing changed.

## 1. Homepage (`src/app/page.tsx`, 592 lines)

Composition pattern: declarative data arrays (`LOOP_BEATS`, `STATUS_STRIP`, `AUTHORITY_LAYERS`) mapped to cards inside `Section`/`Container` with `ScrollReveal` wrappers and max-width-constrained containers. Sections numbered 01-10 in comments.

| # | Section | Notes |
|---|---|---|
| 01 | HERO (`/live`, bg-deep) | 2-col lg grid: left = wordmark, tagline, H1, sub, 2 CTA buttons (`#architecture`, `#ping-social`); right = `HeroEvidenceCard` |
| — | **Portal margin band** | `<PortalHost portals={portalProjections}/>` sits in its own full-width band between hero and section 02. Comment: "PING circles inhabit unused peripheral space only. Geometry, not breakpoints, decides whether a slot is honest." Circles expand in place; they do NOT navigate to /o. |
| 02 | The continuity problem (`/truth`, minor) | max-w-4xl text |
| 03 | The closed compounding loop (id=architecture, bg-surface-2) | 5 beat cards + loop-close card, KnowledgeLoop, BusinessGraph panel |
| 04 | Intelligence is not authority (id=authority, /govern) | 3 layer cards, "honest OFF" box, AgentAuthority, TenantModel, links to /technology/tenantos, /technology/agents |
| 05 | Every answer comes with receipts (id=evidence, /prove, bg-surface-2) | 2 annotated receipt cards, ReplayEvidence, link /technology/replay |
| 06 | One authority, many runtimes (id=runtimes, /run) | MultiRuntime |
| 07 | Built on PING (id=ping-social, /applied, bg-deep) | stack diagram, 3 value cards, /contact CTA, build journal (changelog + 3 /blog cards) |
| 08 | What is real (id=status, /status, bg-surface-2, minor) | 13-row STATUS_STRIP, 2-col |
| 09 | Follow the build (/follow, bg-deep, minor) | NewsletterSignup, link /newsletter |
| 10 | Contact | CTASection |

**Unused peripheral space for Circle identities:** the PortalHost band is the already-sanctioned margin home. Beyond that, sections 02/03/05/07/08/09 all use max-w-2xl→5xl containers inside full-width sections, so at lg+ widths the left/right gutters are free peripheral space where small circles could live without taking over (same geometry-driven margin pattern PortalHost uses). Between-section seams (06→07, 08→09) have no interstitial band today; a slim margin rail could slot in like PortalHost without disturbing the declarative composition. The hero right column is occupied.

## 2. Navigation

- `site-header.tsx` renders links from `getNavigation()` → `src/config/navigation.v1.json`: **Home `/`, Technology `/technology`, Blog `/blog`, Products `/products`, About `/about`, Contact `/contact` (secondary), FAQ `/faq` (secondary).** No experimental routes.
- `site-footer.tsx` links: `/`, `/#architecture`, `/#roadmap`, `/newsletter`, `/privacy`. No experimental routes.
- `tape-measure-nav.tsx` exists but is a pure active-item indicator (motion tape), contains zero links.
- `layout.tsx` does NOT link to experimental routes, but it **chromeless-suppresses** header/footer/JSON-LD for `/o`, `/o/*`, `/sites/*`, `/build/*` via the `x-pathname` header set by middleware. That is the only layout-level coupling.

## 3. Per-route caller table

| Route | Route dir | Linked from (files) | Tests referencing it | Safe to disable from nav? |
|---|---|---|---|---|
| `/objects` | `app/objects/` (untracked, NEW; `robots: index:false`) | **Nowhere** outside its own dir. Renders 2 identity circles (Happy Place, Coppersmith) | none | Yes — never in nav |
| `/objects/spatial` | `app/objects/spatial/` | Only upward self-link: `fyd/ui/spatial/spatial-canvas.tsx:390,485` (`href="/objects"`); `center-portal.tsx:406` links OUT to `/o/<id>` | `fyd/spatial/__tests__/object-space.test.ts` tests spec math, not the route | Yes |
| `/sites/happy-place` | `app/sites/happy-place/` | **Nowhere** (comments only) | none | Yes |
| `/sites/coppersmith-plumbing` | `app/sites/coppersmith-plumbing/` | **Nowhere** (comments only) | none | Yes |
| `/o` | `app/o/` | `app/o/not-found.tsx:50` (self back-link). Page header itself says "DEMOTED... not linked from normal navigation" | none (comment only in object-rail.test.ts) | Yes |
| `/o/[objectId]` | `app/o/[objectId]/` | `fyd/ui/object-circle.tsx:83` (default nodeHref `/o/<id>`), `fyd/ui/identity-object.tsx:736` (default), **`app/objects/page.tsx:66`** (new /objects route passes `nodeHref: "/o/"+id`), `fyd/ui/spatial/center-portal.tsx:406`, `fyd/object/card.tsx:58`, `fyd/object/node.tsx:229` (defaults), self sub-link `app/o/[objectId]/page.tsx:165` → `/o/<id>/manage` | comment only (`object-rail.test.ts:163`) | Yes from nav — but it IS the click-through target of circles on `/objects` and `/objects/spatial` |
| `/node/[id]` | `app/node/[id]/` | `app/embed/object/page.tsx:68` (`href=/node/<id>`); `fyd/ui/fyd-circle.tsx` defines `FydCircleNodeLink` (no production renderer found) | `fyd/ui/__tests__/fyd-circle.test.tsx` asserts `href="/node/obj-1"` | Yes |
| `/build/[siteId]` | `app/build/[siteId]/` | **No hrefs**; only comments + API post to `/api/fyd/objects/<id>/overrides` in owner-panel | none | Yes |
| `/portal-rail` | `app/portal-rail/` | **Nowhere** (one passing comment in `app/objects/objects-client.tsx`) | none | Yes |
| `/embed/object` | `app/embed/object/` | **Nowhere** outside its own dir | none | Yes |
| `/dev/objects` | `app/dev/objects/` | **Nowhere** (internal lab; comment in lab-adapter references /o routes) | none | Yes |
| `/fyd` | `app/fyd/` | **No page links** (only `/api/fyd/*` fetch calls) | none | Yes |

## 4. Middleware

`src/middleware.ts`: **no rewrites, no redirects.** It only sets the `x-pathname` header (matcher excludes `_next/*`, favicon, brand, fyd-media) for the layout's chromeless logic.

## 5. API routes

No API handler redirects to any experimental page route. `grep` for `redirect("/o...`, `/objects`, `/sites`, `/build`, `/node`, `/portal`, `/embed`, `/dev`, `/fyd` across all of src returned **zero hits**. OAuth callbacks (`/api/fyd/auth/google/callback`, `/api/fyd/auth/link/google/callback`) and signout all redirect to `/` (with `?auth=` params on error); OAuth start routes redirect to external provider URLs only.

## Key caveats for the reset

1. **`/o/[objectId]` is load-bearing for circles even though nothing in nav links to it.** The new (untracked) `/objects` route and the spatial canvas both navigate expanded circles there. Disabling it from nav is safe; removing the route would orphan those click-throughs.
2. **Layout's chromeless logic is the one structural coupling:** `/o`, `/sites/*`, `/build/*` render without PING chrome. If any of those routes is removed, the `chromeless` check in `layout.tsx` becomes dead code but is harmless.
3. **Homepage circles ≠ route links:** the homepage `PortalHost` renders `PortalCircle`, which only emits validated `https://` external links plus in-place "Ask FYD" engagement. It never navigates to `/o`. So the homepage is already circle-safe w.r.t. these routes.
4. No test file asserts the existence or reachability of any experimental route as a page (only component-level href rendering in `fyd-circle.test.tsx`).

Full file paths above are under `/home/nolan/projects/ping/src/`.