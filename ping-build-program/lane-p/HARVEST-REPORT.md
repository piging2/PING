# LANE P — HARVEST REPORT: external media pipelines evaluated

Method: isolated npm install in lane-p/harvest (research only, no PING contact),
license read from installed package.json, mechanism tested in the spike
(lane-p/spike/pipeline-spike.mjs), red-teamed with synthetic fixtures.

## PROBLEM
PING needs, for authorized media: content-hash identity, MIME verification independent
of claimed Content-Type/extension, EXIF privacy stripping, safe derivative generation
that cannot pass through executable payloads, and deduplication by digest.

## PING ALREADY HAS
- SHA-256 contentHash on every materialized asset (src/types/media.ts).
- Content-addressed blob keys + physical-byte hash verification (src/lib/blob-storage.ts).
- Synthetic-identity rejection in the KV store (src/lib/media-kv-store.ts).
- sharp ^0.35.3 in the dependency graph.
Gap: no MIME sniffing, no derivative safety policy, no EXIF rule, no SVG policy,
no binding record. This lane fills the gap; it does not rebuild the store.

## EXTERNAL CANDIDATES

### sharp 0.35.4 (libvips 8.18.3) — ADOPT (already in PING's graph; standardize on it)
- License: Apache-2.0 (confirmed from installed package.json). Prebuilt libvips
  binaries carry upstream LGPL-family obligations; normal dynamic-link use, no action.
- Mechanism: decode real codecs -> operate on pixels -> fresh encode. Strips metadata
  by default (withMetadata() is opt-in). limitInputPixels default 268402689; we pin
  40M. failOn:'warning' aborts on truncated/corrupt input at decode.
- Tested: EXIF GPS stripped (proven), polyglot trailing JS destroyed by re-encode
  (proven), 100M-pixel bomb rejected (proven), truncated JPEG throws at decode
  (proven). ICC stripping side effect noted (desaturation risk for wide-gamut).
- Kill criteria: none triggered. Replaces hand-rolled decode/resize/EXIF code.
- Cost: zero per-unit; local compute.

### file-type 22.1.1 — ADOPT (small mature library, no gate needed)
- License: MIT (confirmed). Pure-JS magic-byte sniffing, no native deps.
- Mechanism: reads file signatures, returns {ext, mime}. This is the
  "never trust Content-Type or extension" mechanism.
- Tested: image/jpeg and image/png correctly sniffed; PNG-bytes-as-.jpg mismatch
  caught -> QUARANTINE. SVG quirk: returns null for inline SVG (no image/svg+xml
  claim); boundary outcome unchanged (reject: not in allowlist).
- Kill criteria: none. ~zero weight.

### exifr 7.1.3 — ADOPT (small mature library)
- License: MIT (confirmed). Fast EXIF/XMP/ICC parser, used only at the ingest
  boundary for the metadata record (dimensions/orientation/GPS presence).
- Tested: GPS EXIF detected pre-derivative; zero EXIF post-derivative.
- Kill criteria: none. Read-only use; never influences the security verdict
  (the verdict comes from full decode, not metadata).

### thumbhash 0.1.1 — ADOPT (small mature library)
- License: MIT (confirmed). Evan Wallace's blur-placeholder hash; ~20-30 bytes,
  renders as a data URL. Fills PING's existing MediaVariants.blur field
  (base64 blur data URL) with a principled mechanism instead of a hand-rolled one.
- Tested: blur data URL generated from derivative in the spike.
- Kill criteria: none. Presentation-only; no truth claims.

### Candidates REJECTED without install
- jimp: pure-JS codecs, slow, historically weak on hostile input; sharp dominates
  on every axis PING cares about (speed, hardening, maintenance). REJECT.
- ImageMagick CLI: shell-out model, extension-dispatched format handling, the
  exact polyglot class this design avoids. REJECT.
- Cloudinary / imgix (hosted): recurring paid dependency + customer-data custody +
  canonical-data dependency + hard lock-in = VETO GATE triggers. The design
  explicitly forbids hotlink dependence. REJECT for the hot path; not evaluated
  further tonight.
- blurhash: superseded by ThumbHash for this use (smaller, better color); REJECT
  in favor of thumbhash.
- uppy: upload-widget framework; PING's acquisition is agent/server-side, not
  browser-widget uploads. Wrong layer. REJECT.

## WINNER
sharp (decode/derivative boundary) + file-type (MIME verdict) + exifr (metadata
record) + thumbhash (blur placeholder), composed in the chain from MEDIA-DESIGN.md,
with node:crypto SHA-256 as the digest. All four are small, mature, MIT/Apache-2.0,
removable, and own no PING truth.

## ADOPT-ADAPT-REJECT
- ADOPT: file-type, exifr, thumbhash as new small deps (recommendation for
  coordinator; none installed into PING by this lane).
- ADAPT: sharp already in PING; standardize pipeline options
  (failOn:'warning', limitInputPixels 40M, sequentialRead, animated:false,
  no withMetadata by default) as the single blessed configuration.
- REJECT: jimp, ImageMagick CLI, hosted image CDNs for the hot path, blurhash, uppy.

## CODE WE DO NOT NEED TO WRITE
Magic-byte tables, EXIF parsers, JPEG/PNG/WebP codecs, resize kernels, blur
placeholder encoders, content-hash implementations (node:crypto).

## MINIMAL PING WRAPPER
One module (proposed: src/lib/media-verify.ts) implementing the 7-stage chain
from MEDIA-DESIGN.md over the four libraries, emitting MediaBinding records
into PING's existing media store. Estimated: one focused module + tests, no new
authority, no new database. Placement decision belongs to the coordinator.

## FAILURE TEST
11/11 red-team tests pass in-lane (spike/redteam-results.json): EXIF GPS strip,
polyglot neutralization, SVG rejection, decompression bomb, MIME mismatch,
corrupt input (full-decode requirement discovered), source-swap detection,
hash benchmark, animated-first-frame policy.

## PRODUCT CAPABILITY UNLOCKED
Authorized business/owner imagery flows into FYD sites with: byte-exact identity,
provenance, privacy-safe derivatives, zero hotlink rot, and a binding record the
owner loop can audit. Directly serves the FYD mobile rebuild's controlled pipeline
(discover -> observe -> evidence -> digest -> derivative -> media binding -> projection).

## BYTES-DEPENDENCY COST
sharp (native, already in graph) + file-type + exifr + thumbhash: all small,
zero per-unit cost, local compute only. No hosted dependency, no new secret
surface, no canonical-data custody outside PING.
