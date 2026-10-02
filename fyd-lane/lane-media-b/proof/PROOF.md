# Lane B proof: both businesses through the same generator (2026-09-21)

## What ran
`getPingObjectGraphSync` -> `generateSiteSpec` -> `validateSiteSpec` ->
real section renderer (`SitePageView`) + real `PresenceBand`, with media
attached semantically (`attachMediaToGraph`: Business `represented_by` Media).
Identical code path for both sites; no per-business theming.

## Results
| site | sections | logo | hero image | gallery | accent | radius |
|---|---|---|---|---|---|---|
| happy-place | Hero, BusinessSummary, Services, Locations, Contact, Links, AskFYD | none | none | 0 | #B87333 copper | md |
| coppersmith-plumbing | Hero, BusinessSummary, Locations, Contact, Links, AskFYD | yes | yes | 8 | #A63D2F brick | full |

The two sites are visually distinct (see the 760px screenshots) because
their source material differs, not because anyone themed them: coppersmith
has 11 acquired site images, happy-place has 0 (honest empty state).

## Provenance chain (coppersmith logo example)
- source: https://www.coppersmithplumbing.com/wp-content/uploads/2024/04/coppersmith-logo-black-n-copper.png
- observed: 2026-09-21T20:52:17.985Z
- original digest: 36e4ff5c...942eba668
- derivative URL: /fyd-media/36e4ff5c...942eba668/thumbnail-400w.webp
- generated HTML: proof-coppersmith-plumbing.html (this dir)
- provenance API: GET /api/fyd/media?siteId=coppersmith-plumbing&digest=...
  -> 200 with full chain; 404 for unknown site/digest/reference-only

## Safety enforcement (verified)
- Rights gate: unclear provenance classified before fetch; never acquired.
- happy-place: 1 observation rejected (off-origin Google logo, reference-only).
- coppersmith: 3 rejected (third-party brand mark, non-image URL, off-origin avatar).
- Fetch bounds: 15MB / 20s / 5 redirects; SVG rejected; byte-parsed via sharp
  (8000px per axis, 64Mpx cap); WebP-only derivatives; no upscaling.
- Stale @1 derivative dirs quarantined to /home/nolan/projects/ping/quarantine-fyd-media/
  (6 dirs, reversible, untracked). public/fyd-media/ now holds exactly the 11
  manifest-referenced coppersmith dirs.

## Commits (branch fyd/sitespec-generator, no push)
- bd6d330 fyd: managed media pipeline core (fyd-media@2)
- fe74c48 fyd: converge Page/Circle/ObjectView/AskFYD on the semantic media read model
- e0d7d1b fyd: media provenance API (GET /api/fyd/media)
- 8796dd1 fyd: regenerate @2 manifests + WebP derivatives for both demo sites

## Validation
- Full-repo `tsc --noEmit`: exit 0.
- Media suites: 5/5, 43/43 tests pass. ObjectView: 8/8. Circle projection: 7/7.
- Ask route tests can't run under the scratch ts-jest config (next/server ESM
  parse); underlying modules compile clean under tsc.
- Wake lock: ACQUIRED 2026-09-21T20:51:07Z pid=20624, RELEASED 2026-09-21T21:01:07Z.

## Known gaps (not fixed this wave, per scope)
- Page Hero is text-only; no renderer hook selects media into the hero yet.
  Media surfaces through the semantic presence band (proven above), not the
  generated Page Hero. Wiring the hero through the same selector is next-wave work.
- Relationship IDs derive from digest+predicate; multiple targets sharing one
  media+predicate could collide. Include target identity if it bites.
- Prior @1 happy-place logo: never recovered from history (no authorized source
  basis found); the honest zero-media state stands.
- Full-res screenshots: C:\fyd-proof\happy.png, C:\fyd-proof\copper.png (Pig).
