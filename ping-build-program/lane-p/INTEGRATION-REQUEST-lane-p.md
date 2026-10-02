# INTEGRATION REQUEST — LANE P → COORDINATOR (+ lane N evidence coordination)

Filed: 2026-09-23 (lane-p session). Lane P makes NO PING writes; this is the
adoption/integration ask after an in-lane proven spike.

## What is proven in-lane
- Red-team battery (spike/pipeline-spike.mjs): 11/11 PASS, re-run fresh this session.
- Content-addressing proof (spike/proof.mjs): 7/7 PASS — dedup, hash→observation→evidence
  trace, source-URL death, unauthorized quarantine, tenant isolation on resolve,
  EXIF-changes-identity, oversized-upload cap.
- Design + record schema: lane-p/MEDIA-DESIGN.md; harvest report: lane-p/HARVEST-REPORT.md.

## Ask 1 (coordinator): module placement in PING
Proposal: new module `src/lib/media-verify.ts` implementing the 7-stage chain
(DIGEST → MIME VERIFY → FULL DECODE → METADATA → DERIVATIVES → MEDIA BINDING →
PROJECTION) reusing, not replacing:
- src/types/media.ts (lifecycle, contentHash, PublishedMediaAsset boundary guard)
- src/lib/blob-storage.ts (content-addressed keys, verifyBlobHash)
- src/lib/media-kv-store.ts (synthetic-identity rejection)
- sharp (already in graph), plus three small deps: file-type, exifr, thumbhash
  (all MIT, tiny, no native code, removable; veto-gate answers in MEDIA-DESIGN.md §10).

The MediaBinding record schema is in MEDIA-DESIGN.md §8. `digestAlg` is versioned
("sha256-v1") for future migration; phase0 HashAuthority forensics may rename/confirm
the digest authority — this design references it and does not invent a second one.

## Ask 2 (lane N): evidence identity join
Media evidence joins the SOURCE→OBSERVATION→EVIDENCE→OBJECT chain by content hash.
Proposed contract:
- Media ingest emits `observationId` (acquisition event) and the MediaBinding record
  carries `blob.digest` (sha256-v1 hex) + `evidence.observationId`.
- Lane N lineage references media by `(observationId, digest)`; media observations
  use the same observation record shape as other acquisitions.
- Lane P requests: confirm the canonical `observationId` minting shape from lane N
  (lane N's prototype uses `web:` + sha256(sourceType|name|value|entityId)[:12] for
  fact evidence refs; media observations should mint consistently) and the
  `causedByEventId` shape from phase0. Until confirmed, lane P uses
  `obs-<digest[:12]>` placeholders in-lane only.
- Re-acquisition changing bytes → new digest → new blob; old binding marked `stale`,
  never mutated (source-truth layering; lane N's source-rewrite chain model).

## Boundaries (non-negotiable)
- No fabricated photos: binding requires `authorization.basis`; no basis → quarantine.
- Fetched media is OBSERVATION until verified through this chain (connector rule).
- Projection serves only PublishedMediaAsset bindings; source URLs are acquisition
  metadata, never render dependencies (no hotlink architecture).
- SVG never enters the raster pipeline, never raw-served (default reject).
- EXIF/GPS stripped by default; no EXIF location data in any public artifact.

## Cost
Compute-only (local resize via sharp), zero per-unit vendor cost, storage bounded by
unique bytes (dedup). No hosted dependency, no new secret surface, no customer-data
custody outside PING.
