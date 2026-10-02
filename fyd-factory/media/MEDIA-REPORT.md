# NIGHT-MEDIA report (2026-09-23, ~20:30 MDT)

Media stage proven: authorized FYD/PING-owned demo media went through
digest -> derive -> provenance, with FYD-controlled serving paths minted.
Cohort (real-site) media is provenance-records-only. No third-party asset
was copied, derived, or republished anywhere.

## What was done

1. Authorized demo media: 11 PING-owned brand assets ingested, sha256
   digested, provenance-recorded, and derived into 57 web-optimized
   variants (6.5 MB total). Every variant file was re-hashed and verified:
   all digests match, all derivedFrom links point at the correct original.
2. Media abstraction built at media/impl/authorized-media-pipeline.ts
   (node:crypto only), smoke-tested 27/27 passing.
3. Cohort: 10 real sites harvested URL-only (one homepage GET each,
   robots.txt checked, 2s spacing). 18 media references recorded with
   license signals, zero image bytes downloaded.
4. Preview serving contract documented below; derivatives are ready for
   NIGHT-VERCEL to copy into the protected preview's public/fyd-media/.

## Provenance ledger (authorized demo set)

All 11 assets: rightsState = authorized-owned. Authorization basis:
"PING Social brand asset, created 2026-09-14 through the PING
media-generation pipeline for PING Social's own marketing. Commissioned by
the business owner. Owned by PING Social; FYD may derive, optimize, and
serve controlled derivatives for authorized demo previews. Public
viewability of any derivative does NOT imply republication rights for
anyone else." Authorizer: Nolan Geske (owner/operator, PING Social),
authorizedAt 2026-09-14. Synthetic marking: kind ai-generated, caption
"AI-generated PING brand artwork. Not a photograph of a business."

| slug | digest (sha256, first 16) | dims | role | variants |
|---|---|---|---|---|
| ping-pig-suit | 6350bfa2dca0895e | 1280x1920 | hero | 5 |
| ping-pig-president | d7f109108812cba4 | 1312x1199 | gallery | 5 |
| ping-pig-beggar | 647b9c4756c1a7e7 | 1024x1536 | gallery | 5 |
| ping-pig-plumber | a5272231d88a17dc | 1145x1374 | gallery | 5 |
| ping-pig-mason | 1054d39063e6b9bc | 1214x1295 | gallery | 5 |
| ping-pig-electrician | a54a5fe0e475922e | 1280x1920 | gallery | 5 |
| ping-pig-hvac | 0d785dc593738371 | 1280x1920 | gallery | 5 |
| ping-pig-crew | 4a6a0f7c8d2b90fb | 1920x1280 | gallery | 6 |
| ping-pig-electricians | 55138bac703de57f | 1920x1280 | gallery | 6 |
| ping-pig-pole | b3a1e43844e446af | 1280x1920 | gallery | 5 |
| ping-social-logo | 2e53d82a3da5255f | 1536x1024 | logo | 5 |

Sources: media/sources/<slug>.png + media/sources/<slug>.provenance.json
(one JSON provenance record per asset, full chain: source path, digest,
dimensions, rights state, authorization, synthetic mark, observedAt).
Note: ping-pig-frontdesk-final.png was not separately ingested; it is
byte-identical to ping-pig-suit.png and the dedupe guard kept one copy.

## Derivatives manifest

media/derivatives/manifest.json. 11 assets, 57 variants, 6.5 MB.

Derivation spec (executed with PIL 10.2.0, WebP; no sharp/imagemagick on
the sandbox, see blockers): ladder widths 1600/768/480, never upscales
(native width added when it is not a ladder rung), WebP q82 primary,
JPEG q75 fallback at the card width, WebP q20 10px blur-up placeholder.
Files live at media/derivatives/<full-sha256>/<slug>-<width>w.webp
(and .jpg fallback, -blur.webp). Serving paths are /fyd-media/<sha256>/<file>,
which matches the repo pipeline's serving convention in
src/fyd/media/derivatives.ts.

## Rights states (explicit, on every record)

- authorized-owned: the 11 demo assets above. Digest, derive, serve allowed.
- authorized-demo: defined in the module; no assets in this state tonight.
- public-viewable-NOT-authorized: all 18 cohort references. Bytes never
  acquired, derivatives never made, never served. Reference-only by
  construction; the module's refuseCohortAcquisition() hard-throws on any
  attempt to promote one.
- unknown: treated as NOT authorized. Hard refusal.

500-program media law honored: public viewability does NOT imply
republication rights. Policy and rights state are explicit everywhere.

## What the preview can serve

NIGHT-VERCEL can copy media/derivatives/<sha256>/* into the protected
preview's public/fyd-media/<sha256>/* and serve the /fyd-media/ paths from
manifest.json verbatim. Suggested srcset per asset: the WebP ladder with
the JPEG card-width file as fallback, blur.webp as the blur-up
placeholder. The ping-social-logo is marked role=logo: brand asset only,
never a hero image (matches the repo's heroMediaFor rule: logos never
heroes). All demo imagery carries the synthetic caption, so any surface
that renders it must label it as AI-generated brand artwork, never as a
photograph of a business.

## Cohort media (for NIGHT-COHORT)

media/cohort/cohort-media-provenance.md: 10 sites, 18 references
(og:image / twitter:image / image_src / JSON-LD image), each with page
URL, rights state public-viewable-NOT-authorized, and a license signal.
Sites with no homepage media references: dalbycpa.com, enstrom.com.
NIGHT-COHORT can embed these records directly in its acquisition JSONs.
Policy allows bounded temporary derivatives for private evaluation only
(a handful per site, small files, never published); NIGHT-MEDIA created
none, so there is nothing to clean up.

## A44 URL-gating note

QA-HOSTILE found unsafe DisplayMedia.src reaching an <img> (A44). This
module does NOT create a new authority. The gating authority is
resolveSafeLink in src/fyd/sitespec/safe-link.ts (parser-based,
http/https-only "navigate" capability, control-char smuggling fails
closed). The module documents the contract the render seam must satisfy
and ships a preview-time adapter (gateMediaUrlForPreview) that mirrors
the contract for standalone manifest verification; the adapter is
explicitly not the authority. The standing fix remains
patches/display-media-src-allowlist.patch (routes DisplayMedia.src and
blurUrl through resolveSafeLink; unsafe values make the media null and
the renderer falls back to its typographic hero). This module's
servingPath() output is always a same-origin relative path, which the
patch's allowlist passes by construction.

## Blockers

- None blocking tonight's deliverables. Derivation was NOT blocked: no
  sharp/imagemagick on the sandbox, so the derivation executor was PIL
  10.2.0 (WebP). The module itself is dependency-light (node:crypto
  only) and the ladder matches the repo pipeline constants
  (480/768/1600/blur-10). If a later pass wants byte-identical
  pipeline parity, re-derive with the repo's sharp-based
  generateDerivatives() and compare variant digests; the manifests
  carry per-variant digests for exactly that comparison.
- TypeScript compile check was not run (no tsc on the sandbox); the
  module was verified by executing it under node type-stripping with a
  27-assertion smoke test (digest stability, ladder, no-upscale,
  derivedFrom invariant, all four refusal paths, A44 javascript:/data:/
  refusal, servingPath validation). All 27 pass.
- Pig repo was read-only the entire run (93 dirty files from other
  lanes untouched); nothing was written to /home/nolan/projects/ping.
