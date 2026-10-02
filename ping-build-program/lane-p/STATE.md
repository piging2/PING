# LANE P — CONTENT-ADDRESSABLE MEDIA (P1)
Status: PROVEN in-lane (red-team 11/11 + addressing proof 7/7, independently re-run 2026-09-23); integration proposal filed to coordinator + lane N. No PING writes made or planned by this lane.

## Mission
For authorized media: ACQUIRE -> DIGEST -> MIME VERIFY -> METADATA -> SAFE DERIVATIVES -> OBJECT/EVIDENCE LINK.

## Ledger
- RESEARCHED: OWNERSHIP.md program charter; PING src/types/media.ts (Media Authority: lifecycle states, SHA-256 contentHash, PublishedMediaAsset boundary); PING src/lib/media-kv-store.ts (KV media store, rejects synthetic content identity); PING src/lib/blob-storage.ts (verifyBlobHash physical-byte verification, content-addressed blob keys `<hash12>.<ext>`); FYD mobile rebuild directive (controlled pipeline: discover -> observe -> evidence -> digest -> controlled derivative -> Media FYD Object / media binding -> projection).
- HARVESTED (isolated, lane-p/harvest, npm): sharp@0.35.4 (Apache-2.0), file-type@22.1.1 (MIT), exifr@7.1.3 (MIT), thumbhash@0.1.1 (MIT). PING already ships sharp ^0.35.3.
- IMPLEMENTED (spike, lane-p/spike/pipeline-spike.mjs): digest -> MIME verify -> metadata -> derivative chain; red-team battery of 11.
- TESTED: 11/11 red-team tests PASS (spike/redteam-results.json). Fixtures in lane-p/fixtures (all synthetic, crafted locally).
- FALSIFIED: "metadata() is sufficient input validation" (sharp metadata() passes truncated scans; full decode required). "file-type identifies SVG as image/svg+xml" (v22 returns null for hand-rolled SVG; boundary outcome unchanged: reject).
- FIXED: fixture OOM (40k x 40k PNG = 4.8GB raw killed python; reduced to 10k x 10k = 100M px, still 2.5x over the 40M pixel limit).
- VERIFIED (2026-09-23, independent): fresh re-run of pipeline-spike.mjs -> 11/11 PASS (sharp 0.35.4 toolchain intact).
- PROVEN (2026-09-23): proof spike spike/proof.mjs -> 7/7 PASS (spike/proof-results.json): dedup 2-sources->1-blob-2-bindings; render trace blob->observation->evidence; source-URL death render intact; unauthorized blob quarantined and unservable; tenant isolation on resolve; same-pixels-different-EXIF->different-hash; 25MB pre-ingest byte cap.
- FALSIFIED (2026-09-23): "sha256 benchmarked faster than blake2s256" — the 256MB bake-off flipped on re-run (blake2s256 1370ms vs sha256 2719ms this session). Speed is machine-dependent and NOT the decision basis; precedent/ecosystem is. Do not cite a speed win.

## Key design decisions (recorded, pending coordinator convergence)
- Hash: SHA-256, pinned as `sha256-v1` in the binding record. Benchmark CORRECTION (2026-09-23 independent re-run): the 256MB sha256-vs-blake2s256 bake-off is machine/thermal-dependent — prior session measured sha256 winning, this session measured blake2s256 winning (1370ms vs 2719ms). Speed is NOT the deciding factor; the decision rests on PING precedent (contentHash, envelope serializer, blob keys, git, SubtleCrypto) and ecosystem, not on a fragile benchmark. Do not cite a speed win.
- MIME: never trust Content-Type or extension; magic-byte sniff via file-type against an explicit allowlist {jpeg, png, webp, avif, gif}. SVG rejected at the boundary (never enters raster pipeline; never raw-served).
- EXIF: strip by default (sharp strips unless withMetadata(); proven: GPS EXIF in -> zero EXIF out). Keep ICC handling as a known refinement (blind strip can shift wide-gamut color).
- Derivatives: full decode with failOn:'warning', limitInputPixels 40M (below sharp's 268M default), sequentialRead, animated:false (first frame only). Re-encode kills polyglot trailing payloads.
- Dedup: by content digest; identical bytes = one blob. Blob keys `<sha256[:12]>.<canonical-ext>`, canonical ext derived from sniffed MIME, never source extension.
- Byte cap: 25MB pre-ingest cap added (proof P7) — oversized bytes rejected before digest/decode, never enter blobStore.
- Binding record: object id <-> blob digest <-> evidence <-> license/authorization basis (see MEDIA-DESIGN.md). Digest alg versioned in the record (`sha256-v1`) so a future migration does not orphan history.
- No hotlink dependence: projection always serves PING-held derivatives; source URLs are acquisition metadata, never render-time dependencies.
- Connector data rule applies: fetched media is OBSERVATION until verified through this chain.

## PING already has (do not duplicate)
- src/types/media.ts: lifecycle discriminated union, contentHash, PublishedMediaAsset public-boundary guard.
- src/lib/blob-storage.ts: content-addressed blob keys + physical-byte hash verification.
- sharp in the dependency graph.

## Gap this lane fills
- No MIME verification (trusts Drive mimeType / extension), no derivative safety policy, no EXIF privacy rule, no binding record linking object <-> blob digest <-> evidence <-> authorization, no SVG policy.

## NEXT
- 2026-09-23 verification session: re-ran pipeline-spike.mjs fresh -> 11/11 PASS
  (sharp/libvips toolchain intact; spike/redteam-results.json regenerated with new timestamp).
  NOTE: /home/nolan/projects/ping (recorded PING path) does not exist on this sandbox
  (Pig-side path); PING in-repo files cited in "PING already has" could not be
  re-read locally this session — verified only via lane's recorded findings. No PING
  writes made; integration request filed instead.
- PROVEN: new proof spike (spike/proof.mjs): 7/7 PASS, results in spike/proof-results.json:
  dedup (2 sources, identical bytes -> 1 blob, 2 bindings), hash->observation->evidence
  trace, source-URL death (render from retained bytes), unauthorized blob quarantined
  (never servable by projection), tenant isolation enforced on resolve, same-pixels +
  different EXIF -> different hash (correct byte-exact identity), 25MB pre-ingest byte cap.
  Fixtures all synthetic/local (gen_fixtures.py + sharp-generated); no CDN hotlinking anywhere.
- INTEGRATION-REQUEST-lane-p.md filed: Ask 1 -> coordinator (src/lib/media-verify.ts
  placement, reuse media.ts/blob-storage.ts/media-kv-store.ts, add file-type/exifr/thumbhash
  as small deps). Ask 2 -> lane N (evidence join by (observationId, digest); confirm
  observationId minting shape + phase0 causedByEventId shape; stale-on-reacquire semantics).
- Open refinement: ICC profile preservation (strip EXIF/GPS, keep ICC) — research only, not blocking.
- Queued per standing decisions: no live credentials, no vendor adoption without gate; harvest stayed in-lane.
