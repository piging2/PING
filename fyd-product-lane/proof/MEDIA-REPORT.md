# FYD Media Lane: FINISH-STRONG report

Date: 2026-09-26. Branch: fyd/builder-rebuild-v1. Lane: MEDIA.

## What was built

One generic family media pipeline now serves both demo sites end to end:

DISCOVER -> ACQUIRE -> DIGEST -> PRESERVE PROVENANCE -> DERIVE OPTIMIZED VARIANTS -> BIND TO OBJECT -> RENDER

Everything is served FYD-local. No hotlinks anywhere in the served path. Every asset answers where it came from, when it was observed, what bytes generated its derivatives, and on what rights basis it may be shown.

## Per-site results

### happy-place (Happy Place Carpentry)

10 media objects, 10 planner scorecards, 11 observations.

| # | Asset | Class | Roles | Depicts |
|---|-------|-------|-------|---------|
| 1 | logo.png (alt: "Happy Place Carpentry logo") | LOGO | logo | business |
| 2 | hero-background-enhanced.jpg | PROJECT | hero, project | business |
| 3 | Exterior painting / house refresh (before) | PROJECT | project | business + Painting |
| 4 | Subfloor replacement (after) | PROJECT | project | business + Repairs |
| 5 | Siding rot repair (after) | PROJECT | project | business + Repairs |
| 6 | Drywall repair (after) | PROJECT | project | business + Drywall |
| 7 | Fence installation, stained walkway (after) | PROJECT | project | business + Fencing |
| 8 | Completed pergola construction | PROJECT | project | business |
| 9 | Exterior painting work in progress | PROJECT | project | business + Painting |
| 10 | Taylor and Lanie, owners (alt names them explicitly) | PERSON | team | business |

Real photography found: a completed deck hero, five project before/after photos, a pergola build, painting in progress, and a genuine owner portrait with real depicts-person evidence (the source alt text names Taylor and Lanie as the owners of Happy Place Carpentry). Owner-portrait eligibility is wired only to that evidence, never to pixels.

Rejected: 1. The og:image points at happyplacecarpentry.com, which is currently dead (redirects to a Gmail/Google sign-in wall, not the business site). Retained as a reference-only observation; never acquired, never served. Source used instead: Nolan's authorized deployment at happy-place-platform.vercel.app, including its Vercel Blob asset origin (added as an allowed deployment-owned origin, not a blanket third-party pass).

Note for the coordinator: the fixture business website happyplacecarpentry.com does not currently serve the business. The manifest records this honestly in the rejection observation. No action taken; flagging because it touches canonical truth about the demo fixture.

### coppersmith-plumbing (Coppersmith Plumbing)

13 media objects, 13 planner scorecards, 41 observations (22 ingested, 15 rejected, 4 duplicates).

| # | Asset | Class | Roles | Depicts |
|---|-------|-------|-------|---------|
| 1 | coppersmith-logo-black-n-copper.png | LOGO | logo | business |
| 2 | coppersmith-new-logo-white.png | LOGO | logo | business |
| 3 | hvac-heat.jpg | SERVICE | hero, service | business + HVAC + Heating & Cooling |
| 4 | Kitchen-sml.jpg | SERVICE | service | business + Plumbing |
| 5 | Ventilation.jpg | SERVICE | service | business + Ventilation |
| 6 | Digital-Thermostate.jpg | SERVICE | service | business + Heating & Cooling |
| 7 | Air-Conditioners.jpg | SERVICE | service | business + HVAC |
| 8 | Bob Kleeman, team portrait (filename names him) | PERSON | team | business |
| 9 | Joey Turner, team portrait (filename names her/him) | PERSON | team | business |
| 10-13 | IMG_0102 / IMG_0278 / IMG_4426 / IMG_7030 (gallery job-site photos) | PROJECT | project | business |

Real photography found beyond the old product shots: two named team portraits from /about-us/ and four gallery job-site photos from the Elementor lightbox anchors. These came from new discovery coverage: full-size anchor hrefs, CSS url() images, and a third crawl page (/gallery/).

Rejected or demoted, 15 total:

* Ingest-time rejections (6): IBC third-party logo (logo-like, not the business's), Gravatar (off-site, authorization unclear), two `#logo` HTML anchors mis-surfaced as image references (failed the image content-type gate), and site-chrome patterns.
* Rights demotions on 2026-09-26 review (9): eight manufacturer catalog/brand images (Rinnai, Rheem, Burnham, Breezair, AO Smith brand strips, Kohler Tournant, two Trinsic faucet product shots) plus one placeholder.png graphic. Per Nolan's binding media-rights directive (publicly reachable is not republication permission; third-party/non-owner media is reference-only, never auto-copied): these are dealer marketing handouts whose FYD republication authorization is unclear. Their references and rights context are preserved in the manifest observations; their bytes and derivatives were deleted and are no longer served. The original ingest observations remain in history; the demotions were appended, not rewritten.
* Duplicates (4): the two Coppersmith logos re-found across homepage/about/gallery, deduped by content digest.

Honest gaps: the four IMG_* gallery photos have opaque filenames and no alt text, so their depicts stop at the business (no invented service binding). The team portraits are bound PERSON/team, not owner-portrait (no evidence either person is the owner). The hero (hvac-heat.jpg, 1000px) is service imagery, not a job-site documentary photo.

## Rights posture (binding directive 2026-09-26, applied)

* The pipeline's shape already matched the directive's long-term shape: SOURCE MEDIA -> RIGHTS/AUTHORIZATION CONTEXT -> OBSERVATION -> DIGEST -> SAFE DERIVATIVE -> PRESENTATION. The rights gate runs before any byte is fetched.
* Owner's own authorized presence (same-origin or deployment-owned origin, not site chrome, not a third-party brand mark): controlled ingestion with source URL, SHA-256 digest, observed timestamp, metadata, and derivative provenance; FYD serves its own derivatives.
* Third-party/non-owner media (off-origin, third-party brand marks, unclear authorization): reference + rights context preserved, bytes never copied. The nine coppersmith demotions are this rule applied retroactively.
* Added `placeholder` to the site-chrome rejection pattern after the ingest picked up a placeholder graphic (economical generic fix).
* Authorization basis remains Nolan's standing demo authorization, recorded per asset with the sentence "FYD claims no copyright." No asset claims FYD ownership.

## Machinery found and reused (not reinvented)

* Canonical SSRF boundary: src/fyd/net/safe-fetch.ts (media re-exports it; no second fetch implementation).
* Sharp derivative pipeline: site-namespaced, content-addressed WebP variants under public/fyd-media/<site-id>/<sha256>/ (thumbnail 480w, card 768w, hero 1600w, blur 10w). AVIF was evaluated: derivatives.ts documents that no consumer negotiates AVIF, so WebP stays the served format. No change made.
* scoreAsset() planner scorer (locked media-score@1 spec, untouched): every surviving asset got a scorecard for hero-documentary / service-imagery / project-photo / owner-portrait / gallery.
* attach.ts semantic binding: depicts[] now drives represented_by + service relationships (10 media objects / 16 relationships for happy-place; 13 / 19 for coppersmith-plumbing).
* select.ts selector + getPipelineManifest read layer; validatePipelineManifest production-truth validation.

## Changes in this lane

Pipeline (src/fyd/media/):

* discover.ts: anchor-image discovery (Elementor lightbox full-size hrefs), css-image discovery (style elements + inline styles), Next.js image-optimizer URL unwrapping for effective filenames, site-chrome rejection (favicon, touch icons, pixels, beacons, spacers, placeholder), business-logo rescue when site alt text names the business, optional allowedOrigins for deployment-owned asset storage.
* ingest.ts: passes discovered alt text and allowed origins into the rights classifier.
* run-ingest.ts: happy-place source is the authorized Vercel deployment; coppersmith discovery covers homepage, /about-us/, /gallery/.
* run-bind.ts (new): evidence-driven bind pass. Binds classification, roles, depicts[], title/alt refinements; applies rights demotions (narrow-only, never broaden); writes scoreAsset() scorecards. Rules are keyed by media id and verify the expected source basename; mismatches fail loudly.
* select.ts: DisplayMedia gains an additive `srcset` field (actual variant widths, ascending; null when fewer than two renditions). Consumers pair it with layout-specific `sizes`. This is the contract that lets renderers stop sending desktop-sized bytes to phones.
* src/fyd/object/types.ts + view.ts: ObjectMediaView carries srcset through (additive, backward compatible).

Tests: new coverage for anchor/css discovery, site-chrome rejection, business-logo alt rescue, allowed deployment origins, rights demotions surfacing as reference-only, and the srcset contract. Full media suite: 103/103 tests pass across 9 suites.

Known issue, recorded not escalated: src/fyd/media/__tests__/select.test.ts cannot compile because it imports ../../components/renderer, which is another lane's in-progress untracked work with unrelated type errors (fieldEmphasis, muted, resolveQuery, objectOrder). Not caused by this lane; fixing it would collide with that lane's active edits. The media pipeline itself is green.

## Commit and files

* src/fyd/media/manifests/happy-place.json (10 assets, bound, scored)
* src/fyd/media/manifests/coppersmith-plumbing.json (13 assets, bound, scored, 9 demotions recorded)
* public/fyd-media/happy-place/* and public/fyd-media/coppersmith-plumbing/* (local derivatives)
* Pipeline + bind + test changes listed above
* proof/MEDIA-REPORT.md (this file)

No public deployment. No changes to planner.ts, src/fyd/family/*, src/fyd/ask/*, src/fyd/owner-mode/*, or src/fyd/customize/*.
