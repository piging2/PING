# FYD Spatial-Object Lane: Mirror Harvest (read-only recon)

**Date:** 2026-09-22 ~11:25 MDT
**Repo:** `/home/nolan/projects/ping`, branch `fyd/builder-composition` (read via `~/workspace/pig/pigwsl-run.sh`; no Pig files touched)
**Objective context:** spatial object CENTER must be Happy Place Carpentry's real web presence. No fake portrait, no stock/AI photography, no hand-rebuilt copy.

---

## 1. HPP MIRROR: verdict

**The canonical acquisition source for everything named "happy-place" is `https://happy-place-platform.vercel.app/`.** Every provenance ref in the fixtures, manifests, live projection, and raw corpus names this URL (see `src/fyd/proceduralize/raw/README.md`: "Nolan's own portfolio proof asset (Happy Place Carpentry LLC demo site)"). Note the nuance: the business graph's `website` FIELD claims `https://happyplacecarpentry.com`, but the captured/ingested source across the whole lane is the Vercel URL. Use the Vercel URL as the mirror source.

### Candidate mirrors, with verdicts

| Candidate | Verdict | Why |
|---|---|---|
| `src/fyd/preview/manifests/happy-place.json` (+ `public/fyd-media/7cb24b97.../`) | **STALE / BROKEN** | Manifest is committed (commit `7f92e026`) with provenance `website-snapshot`, `playwright-chromium-headless`, captured `2026-09-21T17:47:25Z`, URL `https://happy-place-platform.vercel.app/`, focal `(0.5, 0.3)`. But the digest directory `public/fyd-media/7cb24b976c6d6f045336381edb14581fab366950c4d0772cd9b8e79dc400ad4e/` **does not exist on disk** (verified `test -d` = missing; not gitignored; 37 tracked files cover 11 other digests only). Same for coppersmith. The capture ran, the manifest shipped, the derivatives were never committed / are gone. **Must be re-captured before use.** |
| `src/fyd/proceduralize/raw/happy-place-platform/index.html` | **USE (source-of-truth bytes)** | Real fetched HTML bytes, 139,618 bytes, sha256 `76766d18a3f054e1e545124d0cfc9f5d48e242d1b7c746e9ebc5dbf555936d78`, acquired 2026-09-21 (HTTP 200) from `https://happy-place-platform.vercel.app/`. Documented in `src/fyd/proceduralize/raw/README.md` ("Never hand-edit these bytes"). This is what the machine fixture regenerates from. It is bytes, not a rendered visual. |
| Live `https://happy-place-platform.vercel.app/` | **USE (authoritative presence)** | The actual web presence; re-capture target. |
| `/sites/happy-place` (`src/app/sites/happy-place/page.tsx`) | **WRONG SOURCE for a mirror** | This is FYD's *native generated site* (`generateSiteSpec` + `SiteClient`), not the original presence. Using it as the center would show FYD's rendering of FYD's graph: circular, and it is the thing being proven, not the evidence. |
| `src/fyd/media/manifests/happy-place.json` | **WRONG** | Media-ingest observation log only; `"media": []`. The only observation is a *rejected* Google logo (rights gate: unclear-reference-only). Zero acquired media. |
| `src/fyd/object/__tests__/fixtures/projections/happy-place.json` | **STALE / WRONG** | Test projection fixture (dumped 2026-09-21T19:26, dumper 1.0.0). Not served by anything. |
| `data/fyd-owner/happy-place.json` | **WRONG** | Owner overlay event log (service reordering etc.), not a mirror. |
| `public/images/hero-background-enhanced.jpg` | **WRONG** | Asset filename matches a field claim on `happyplacecarpentry.com`, but the local file is a generic public image, not a site mirror. |
| `public/fyd-circle-loader.js` mention of `happy-place-carpentry` | **WRONG** | Doc-comment example only. |

**Bottom line: there is currently NO safe local visual mirror on disk.** The preview manifest exists but its image files are missing. The correct path is: re-run the capture pipeline against `https://happy-place-platform.vercel.app/` (see machinery below), with mandatory visual verification before acceptance (a Google sign-in page was once shipped as the HPP snapshot; see FL-20260921-216 note in `capture.ts`). The pinned raw HTML (`raw/happy-place-platform/index.html`) is the only trustworthy local bytes of the presence in the meantime.

---

## 2. MIRROR MACHINERY: how a mirror is produced, stored, refreshed, embedded

**Pipeline files:** `src/fyd/preview/capture.ts`, `focal.ts`, `pipeline.ts`, `types.ts`, manifests in `src/fyd/preview/manifests/`.

**Entry point (run on the Pig, writes are its normal operation):**
```
npx tsx src/fyd/preview/capture.ts <objectId> <url>
```
Constraints enforced by the script: `objectId` must match `^[a-z0-9-]+$`; `url` must be `https://`. For HPP: `npx tsx src/fyd/preview/capture.ts happy-place https://happy-place-platform.vercel.app/`.

**What it does:**
1. Headless Chromium, viewport 1440x900, `networkidle` + 25s timeout, 1.5s settle, full PNG screenshot.
2. `generateDerivatives` from `src/fyd/media/derivatives.ts` writes bounded sharp variants into `public/fyd-media/<content-sha256-digest>/` (webp: `blur-10w`, `w480`, `w768`, `w1080`).
3. Writes `src/fyd/preview/manifests/<objectId>.json`: `src` (engaged: smallest variant >= 800w, else largest), `srcSet`, `thumbSrc`, `width`, `height`, `focalX/Y` (default `0.5 / 0.3` = upper-center hero zone via `resolveFocal` in `focal.ts`), `basis`, and `provenance: { source: "website-snapshot", capturedAt, captureMethod: "playwright-chromium-headless", digest, url }`.

**Refresh:** re-run capture. A content change produces a new digest dir; the manifest is overwritten. **Acceptance rule (FL-20260921-216, in `capture.ts` header): always open and eyeball the screenshot before accepting; a capture that does not show the target business's public website is junk: delete the manifest and digest dir, never ship it.**

**Server-side consumption:** `buildPortalProjection(objectId)` in `src/fyd/preview/pipeline.ts` (server-only) returns `{ circle, logo, preview, websiteHref }`. `selectPreviewMode(origin)` returns `"snapshot"` always in v1 because `INTERACTIVE_ALLOWLIST` is empty: no origin has been verified for framing permission.

**Safe embedding for the spatial object center:** there is **zero iframe usage anywhere in `src/fyd` or `src/app/sites`** (grep confirmed). The sanctioned pattern is a **static same-origin snapshot `<img>`** from the manifest's `src`/`srcSet` (files under `public/fyd-media/`, served as inert images, not executable), rendered `object-fit: cover` with `object-position` from `focalToObjectPosition(focal)` (`src/fyd/preview/focal.ts`). The `interactive` preview mode (sandboxed live iframe) exists in the type contract but is explicitly unpermitted until an origin passes framing-permission verification, so do not iframe the live site. This satisfies "no unsafe external content becomes executable."

---

## 3. GRAPH SEAMS: exact calls for the happy-place ObjectView + graph + projection

All server-only. Data source: `/home/nolan/ping/var/fyd-projections/happy-place.json` (PING-side dump, `fyd-projection-dump@1.1.0`), **dumped 2026-09-22T14:50:58Z (today, 08:50 MDT)**, `eventSequences: [65, 83]`, `graphDigest` sha256-verified over canonicalized graph, `meta.siteId` match enforced, every object carries provenance with non-empty ref (fail closed otherwise). `FYD_PROJECTION_DIR` env overrides the dir for tests. Read seam: `getPingObjectGraphSync(siteId)` / `getPingObjectGraph(siteId)` from `@/fyd/data/ping-object-source` (`src/fyd/data/ping-object-source.ts`).

```ts
import { loadObjectView } from "@/fyd/object/view";            // src/fyd/object/view.ts:305
const view: ObjectView | null = loadObjectView("happy-place"); // canonical read-model loader

import { loadObjectViewBySlugOrId } from "@/fyd/object/by-id";  // src/fyd/object/by-id.ts
const r = loadObjectViewBySlugOrId("happy-place");             // { view: ObjectView; siteId: string } | null
// also: loadObjectViewById(siteId, objectId), loadCircleProjectionById(siteId, objectId)

import { objectViewToProjection } from "@/fyd/object/object-projection"; // :205
const proj: ObjectProjection = objectViewToProjection(view, graph?);
// -> facts with ClaimEvidence (observed|inferred|unverified|unknown|unavailable|withheld),
//    contact { phone, email, website }, related: RelatedRef[] (satellites), provenance
```

**`ObjectView` contract** (`src/fyd/object/types.ts:80`): `id, schema, name, category, locationLabel, summary, media[]` (rights-authorized only; external refs excluded), `services[]`, `serviceArea[]`, `contact`, `capabilities[]` (call/email/website appear only when the value exists; website cap `{ kind: "website", href, label: "Website" }` feeds `websiteHref` in the portal projection), `provenance { label, ref }`, `ownerUpdatedAt, sampleQuestions[], fieldCorrections[]`.
Deprecated aliases `buildObjectView` / `buildCircleProjection` still exist; use `loadObjectView` / `loadCircleProjection`.

**Concrete satellite data available for happy-place (from the live projection, all provenance `website-ingestion:https://happy-place-platform.vercel.app/`, claims labeled `website_statement`):**
- Business: `website-business-6fa5ebd99d72c4cb` ("Happy Place Carpentry LLC", public). Contact: phone `+15412865190`, email `taylor@happyplacecarpentry.com`, website `https://happyplacecarpentry.com`. area_served "Benton, Linn, Marion, and Polk Counties, Oregon"; locality "Adair Village, OR, US"; price_range "$$".
- Location: `website-business-6fa5ebd99d72c4cb-location` ("Adair Village, OR, US"), rel `located_at`.
- Services (public, via `offers`): `...-service-3263502c8175` **Repairs**, `...-service-340c39513223` **Fencing**, `...-service-7f1139c11dab` **Painting**, `...-service-c63c87ed8420` **Drywall**, `...-service-cd28e52699a5` **Restoration**. One private service (`website-service-51de038c1d` "Pergola Design Consultations") is excluded by the visibility gate.
- Hero media: `heroMediaFor(siteId, graph, objectId)` (`src/fyd/media/select.ts:141`) returns `null` for happy-place (media manifest has zero acquired assets).
- Related: `selectRelatedCircles` in `src/fyd/object/related.ts` backs the `RelatedRef[]` satellites; owner overlay events in `data/fyd-owner/happy-place.json` (e.g. "Moved Fences to the top") can reorder services.

---

## 4. THE TWO FIXTURES (Nolan's named pair), located and distinguished

- **Earlier, 9-object rich fixture:** `src/fyd/proceduralize/__fixtures__/happy-place-rich-graph.ts`. Header: "Happy Place RICH graph fixture: the canonical 9-object / 10-relationship graph derived from the governed PING event journal, acceptance sequences 65-83 (lane B website-ingestion run, 2026-09-21, observed 2026-09-21T02:44:00Z)". Objects: business `object_6cc955e4077ad14f`, website `object_cda465c087b62af9`, location `object_f4be50f223741f51` (Mid-Willamette Valley service area), services Decks / Fences / Remodels / "Home repair and restoration", persons "Taylor Happy" / "Lanie Happy" (marked as site personas, not verified real people). **Contract: generator/renderer testbed.** Its own header forbids refreshing it from the pipeline or weakening renderer tests to the 2-object graph.
- **Later, 2-object machine fixture:** `src/fyd/proceduralize/__fixtures__/happy-place-graph.ts`. Header: "MACHINE-GENERATED, not hand-written. Script: /home/nolan/fyd-proof-run/regen.ts, timestamp pin 2026-09-21T13:50:00Z, pipeline git commit 3e30503b, source https://happy-place-platform.vercel.app/, source digest 76766d18... (matches `raw/happy-place-platform/index.html`)". Objects: business `website-business-6fa5ebd99d72c4cb` + location. **Contract: byte-faithful regression output of `runExtractionPipeline` on the pinned raw bytes; do not hand-edit.**
- **Which is the real/current acquisition source:** neither fixture is served at runtime. The live source is `/home/nolan/ping/var/fyd-projections/happy-place.json` (dumped today 08:50 MDT from governed events 65-83, 8 objects incl. the 5 public services above). Both fixtures name the same capture URL; the rich fixture encodes the earlier governed-journal view, the machine fixture encodes the extraction pipeline's view of the pinned bytes.

---

## 5. VISUAL vs MACHINE: the distinction the implementation must hold

The **visual website mirror** is a *picture of the presence*: screenshot bytes captured by headless Chromium, bounded sharp derivatives under `public/fyd-media/<digest>/`, and a provenance manifest in `src/fyd/preview/manifests/happy-place.json` naming the URL, capture time, method, and content digest. It answers "what does the business's real web presence look like" and is the only legitimate visual center for the spatial object. Right now it does not exist on disk (manifest without files) and must be re-captured from `https://happy-place-platform.vercel.app/` with eyeball verification before acceptance.

The **machine object graph** is *structured claims extracted from the presence*: the PING-backed projection at `/home/nolan/ping/var/fyd-projections/happy-place.json` (business, location, five services, contact facts, relationships, each with `website-ingestion:` provenance and `website_statement` claim kind). It answers "what are the evidence-graded facts" and feeds `loadObjectView("happy-place")` -> `objectViewToProjection` -> facts, contact, satellites, evidence. The two repo fixtures are test inputs for different layers (9-object = renderer contract, 2-object = extraction regression), not runtime data.

The mirror and the graph are bound by one shared invariant: the capture URL in the manifest provenance must equal the `ref` URL in the graph's provenance (`https://happy-place-platform.vercel.app/`). Never substitute one for the other: a screenshot carries no evidence-graded claims, and the graph carries no pixels. The `/sites/happy-place` route is neither: it is FYD's native projection of the graph, and using it as the visual center would be FYD rendering FYD.
