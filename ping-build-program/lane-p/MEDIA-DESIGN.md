# LANE P — CONTENT-ADDRESSABLE MEDIA: DESIGN

Status: spike-proven in-lane. No PING writes. Integration via coordinator request only.

## 1. What PING already has (reused, not rebuilt)

- `src/types/media.ts` — Media Authority: discriminated-union lifecycle
  (`source_reference` -> `materializing` -> `materialized` -> `rendition_ready` -> `published` -> `stale`),
  `contentHash` = SHA-256 of actual bytes, `isPublishedMediaAsset()` public-boundary guard
  (published = local source, hash present, dimensions non-zero, no Drive URLs).
- `src/lib/blob-storage.ts` — content-addressed blob keys (`<sha256[:12]>.<ext>`),
  `verifyBlobHash()` re-downloads physical bytes and compares against the recorded hash;
  poisoned metadata falls through to re-upload.
- `src/lib/media-kv-store.ts` — rejects synthetic content identity
  (`SHA256(canonicalId)` instead of bytes); requires physical Blob verification.
- `package.json` — sharp ^0.35.3 already in the graph.
- FYD mobile rebuild directive pins the controlled pipeline for authorized sources:
  discover -> observe -> evidence -> digest -> controlled derivative -> Media FYD Object / media binding -> projection.
  No hardcoded image URLs in components. No permanent hotlinking. Provenance preserved.

This design plugs the gaps: MIME verification, derivative safety policy, EXIF privacy,
the object <-> blob <-> evidence <-> authorization binding record, and an SVG policy.

## 2. The pipeline

```
SOURCE BYTES (untrusted)
  |
  v
[1] DIGEST          sha256(bytes) -> content identity. alg pinned "sha256-v1".
  |                 Dedup: identical bytes => one blob record.
  v
[2] MIME VERIFY     magic-byte sniff (file-type) against explicit allowlist:
  |                 image/jpeg, image/png, image/webp, image/avif, image/gif.
  |                 Claimed Content-Type and extension are recorded as claims,
  |                 never trusted. Mismatch => QUARANTINE.
  v
[3] FULL DECODE     sharp(bytes, { failOn:'warning', limitInputPixels: 40_000_000,
  |                 sequentialRead: true, animated: false })
  |                 Metadata-only inspection is NOT validation (proven: truncated
  |                 scans pass metadata()). Decode must succeed.
  v
[4] METADATA        exifr extract for the record; EXIF (incl. GPS) stripped by
  |                 default (sharp drops it unless withMetadata() is called).
  |                 Known refinement: keep ICC, drop EXIF/GPS (color fidelity).
  v
[5] DERIVATIVES     re-encode from decoded pixels only: web/1600px, thumb/400px,
  |                 blur placeholder (ThumbHash data URL -> fills PING's
  |                 MediaVariants.blur field). Each derivative gets its own digest.
  |                 Re-encoding destroys polyglot trailing payloads (proven).
  |                 Storage key: <sha256[:12]>.<canonical-ext from sniffed MIME>.
  v
[6] MEDIA BINDING   record object <-> blob digest <-> evidence <-> authorization.
  v
[7] PROJECTION      only PublishedMediaAsset (boundary guard) is served, with
                    correct Content-Type from sniffed MIME, Content-Disposition
                    inline for images, attachment for documents.
```

SVG policy: `image/svg+xml` (and unrecognized XML) never enters the raster pipeline
and is never raw-served. SVG-as-image is script-capable; a rasterize-from-SVG flow,
if ever authorized, is a separate gated path with sanitization. Default: reject.

Animated media: first frame only through this pipeline (`animated:false`);
animated derivatives are a separate authorized flow.

## 3. Hash choice: SHA-256, versioned as `sha256-v1`

| Consideration | SHA-256 | BLAKE3 |
|---|---|---|
| PING precedent | contentHash, envelope serializer (`sha256-canonical-json-v1`), blob keys, git | none |
| Ecosystem | SubtleCrypto (browser), FIPS, Vercel/Upstash friendly | needs npm native dep |
| Speed (measured, 256MB, node:crypto) | 635-933 ms (hw-accelerated) | n/a; blake2s256 (native) measured 1073-1107 ms, SLOWER |
| Content addressing standard | git, IPFS-adjacent, OCI | niche |

Decision: SHA-256. The hardware-accelerated speed moots BLAKE3's advantage, and
BLAKE3 would add a non-native dependency for zero canonical benefit. The binding
record carries `digestAlg: "sha256-v1"` so a future migration re-hashes without
orphaning provenance.

## 4. Deduplication

- Identity = `sha256-v1` digest of exact bytes. Two sources yielding identical bytes
  share one blob record; both bindings point at it.
- Blob object key: `<hex digest [0:12]>.<canonical-ext>`. Canonical extension is
  derived from the SNIFFED MIME, never the source filename.
- Near-duplicates (recompressed same photo) are NOT deduped: different bytes,
  different digest. Dedup is byte-exact by design; perceptual hashing is explicitly
  out of scope (non-deterministic identity violates source-truth layering).

## 5. MIME verification (never trust Content-Type or extension)

- `file-type` magic-byte sniff is the verdict; allowlist is explicit.
- Record all three: `sniffed`, `claimedContentType`, `extension` + `extImpliedMime`.
  Any disagreement => QUARANTINE + provenance event, no silent coercion.
- Source swap under a stable URL: re-acquire -> re-digest -> digest mismatch with
  the binding record => QUARANTINE + re-acquire + provenance event (proven in spike).

## 6. Metadata boundaries

- Extract (exifr) for the record: dimensions, orientation, color profile, EXIF presence.
- Strip for the derivative: EXIF/GPS never leave the ingest boundary (privacy default).
- ICC is metadata-with-rendering-effect: current default strip-all is safe but can
  desaturate wide-gamut photos. Queued refinement: withMetadata({}) selective
  (keep ICC, drop the rest); spike-verified later, not blocking.
- No EXIF location data in any public artifact, ever.

## 7. Safe derivatives

- Decode is the security boundary: libvips via sharp decodes real codecs only;
  unknown/truncated/bomb inputs throw (proven).
- Output is freshly encoded from decoded pixels; trailing/polyglot payloads cannot
  survive re-encoding (proven: appended JS payload gone from output bytes).
- Bounds: `limitInputPixels: 40_000_000` (tighter than sharp's 268M default),
  `failOn: 'warning'`, `sequentialRead`, single frame.
- Toolchain verified: sharp 0.35.4 / libvips 8.18.3, Apache-2.0 (license confirmed
  from installed package.json; libvips prebuilt binaries carry their own LGPL-family
  obligations upstream, unchanged by this use).
- No ImageMagick-style polyglot surprises: the pipeline never shells out, never
  trusts extension-based format dispatch, never round-trips through a format that
  preserves executable payloads.

## 8. Media binding record

One record per (object, role) binding. Media bytes are identified by digest;
the record links identity, evidence, and authorization. Never a bare URL.

```ts
interface MediaBinding {
  bindingId: string;            // stable id for this object<->media relationship
  objectId: string;             // FYD/PING object this media presents
  role: "hero"|"before"|"after"|"detail"|"progress"|"gallery"|"brand"|"portrait"|"logo";
  blob: {
    digest: string;             // sha256 hex of exact bytes
    digestAlg: "sha256-v1";     // versioned for future migration
    byteLength: number;
    mime: string;               // SNIFFED mime, never claimed
    width: number; height: number;
  };
  derivatives: {
    kind: "web"|"thumb"|"blur"; digest: string; byteLength: number; mime: string;
  }[];
  evidence: {
    observationId: string;      // acquisition observation this media came from
    sourceUrl?: string;         // acquisition metadata ONLY, never a render dependency
    acquiredAt: string;         // ISO
    sniffedVsClaimed: "match"|"mismatch-quarantined";
  };
  authorization: {
    basis: "owner-provided"|"owner-authorized-source"|"licensed"|"public-domain"|"fair-use-review";
    authorizedBy: string;       // who/what granted it (owner id, license id)
    authorizedAt: string;
    scope: string;              // e.g. "website-hero", "social-post"
  };
  lifecycle: "materializing"|"materialized"|"rendition_ready"|"published"|"stale"|"quarantined";
}
```

Rules:
- No binding without `authorization.basis`. Unauthorized media cannot be published, period.
- No fabricated photos: `observationId` must resolve to a real acquisition event.
  Synthetic/placeholder media is allowed only when explicitly labeled synthetic and
  never presented as a business photo.
- Projection reads bindings, never source URLs. A dead source URL changes nothing
  rendered (hotlink = borrowed availability; the design holds the bytes).
- Re-acquisition that changes bytes changes the digest => new blob record; the old
  binding is marked `stale`, never silently mutated (source-truth layering).

## 9. Red-team results (spike/pipeline-spike.mjs, 11/11 PASS)

Fixtures are synthetic, crafted locally in lane-p/fixtures (gen_fixtures.py).

| # | Attack | Result |
|---|---|---|
| 1 | Happy path (clean JPEG) | digest + sniff + metadata + webp/thumb/blurhash derivatives, ~400ms |
| 2 | JPEG with EXIF GPS (39d 7m 30s) | GPS present pre-derivative, ZERO EXIF post-derivative |
| 3 | Polyglot: valid JPEG + appended JS | sniffed image/jpeg; payload absent from re-encoded output (630 < 2136 bytes) |
| 4 | SVG with embedded `<script>` | not in allowlist -> rejected at boundary; never decoded, never served |
| 5 | Decompression bomb: 316KB PNG declaring 100M pixels | `Input image exceeds pixel limit` at 40M cap |
| 6 | MIME mismatch: PNG bytes named .jpg, claimed image/jpeg | sniffed image/png -> QUARANTINE |
| 7 | Corrupt/truncated JPEG | **metadata() does NOT throw**; full decode throws `premature end of JPEG image` -> verify chain must full-decode |
| 8 | Source swaps bytes under stable URL | digest mismatch vs binding record -> QUARANTINE + re-acquire |
| 9 | Hash benchmark | sha256 beats blake2s256 (both node:crypto native); BLAKE3 rejected |
| 10 | Animated input | first-frame-only policy through this pipeline |
| 11 | Fixture generation | all fixtures reproducible from gen_fixtures.py |

Falsified during the spike: "metadata() suffices for input validation";
"file-type v22 reports image/svg+xml for inline SVG" (returns null; outcome unchanged).

## 10. Veto-gate answers (for any future adoption recommendation)

- Removes commodity code? Yes: replaces any hand-rolled magic-byte checks, EXIF handling, resize code.
- Improves URL -> TRUSTED FYD loop? Yes: real authorized imagery with provenance, no hotlink rot, no privacy leaks.
- Removable/replaceable? Yes: digest+sniff+decode are thin wrappers over node:crypto, file-type, sharp; the binding record is PING-owned schema.
- PING remains authority? Yes: blob records and bindings are PING canonical state; libraries own no truth.
- Data owned by the vendor? None. Cost at 10/1k/100k FYDs? Compute-only (local resize), no per-unit vendor cost; storage scales with unique bytes (dedup bounds it).

## 11. Open items (queued, not blocking)

- ICC-preservation refinement (strip EXIF/GPS, keep ICC).
- Integration request to coordinator for module placement in PING.
- Phase0 HashAuthority forensics may rename/confirm the digest authority; design
  references HashAuthority as the intended owner and does not invent a second one.
