# LANE-MEDIA Report (replacement lane, completed 2026-09-23)

## Outcome

The factory media stage is built, lane-contained, and green: **14 test suites, 149 tests, all passing**
(`npx jest --config src/fyd/media/jest.config.cjs`, run from the repo root on the Pig).

## Harvest: the PING media authorities (read-only, reused, not duplicated)

Before writing anything, the three authorities were read in full:

- `src/lib/media.ts` (Media Authority Adapter): KV is the only runtime authority; `resolvePublicMedia(id)`
  is the public materialization gate. It rejects drive-prefixed ids, source_reference / materializing / stale
  states, synthetic content identity (sha256 of canonical id), missing blob metadata for blob-backed assets,
  missing public variant URLs, and any `/api/drive/` URL. Fail-closed throughout.
- `src/lib/media-kv-store.ts` (KV record store): `saveMedia` enforces the published-local contract
  (storage field required: `static` or `blob`; blob requires contentHash; static requires `/images/` original),
  `getMedia`/`getMediaBatch` apply the public-authority gate, `findMediaByContentHash` gives idempotent lookup.
- `src/lib/blob-storage.ts` (byte store): `uploadToBlob` is content-addressed (sha256 of bytes, idempotent,
  physical hash verification of existing metadata), `getBlobMetadataByContentHash` is the blob-proof lookup
  the gate depends on.

Design decision: the factory media stage is a **thin consumer** of these authorities, not a parallel media
system. The pipeline keeps its own evidence (manifests: rights, provenance, observations) but serves nothing
itself. Bytes are published into the blob authority, records into the KV authority, and every read goes
through the public gate.

## Pipeline coverage: discover -> observe -> evidence -> digest -> derivative -> media binding -> projection

| Stage | Implementation | Status |
|---|---|---|
| discover | `discover.ts` (existing) | reused |
| observe | `ingest.ts` observations (existing) | reused |
| evidence | `provenance.ts` (existing) | reused |
| digest | `hashContentBytes` in `derivatives.ts` (existing; same sha256-of-bytes the blob authority uses) | reused |
| derivative | `derivatives.ts` (existing; constants reused from `src/lib/media-constants.ts`) | reused |
| **media binding** | `src/fyd/media/authority-binding.ts` (**new**) | built this lane |
| **projection** | `src/fyd/media/authority-projection.ts` (**new**) | built this lane |

New modules (all under `src/fyd/media/`, zero changes to any shared file):

- `authority-binding.ts`: `bindMediaToAuthority(asset, deps?)`. Validates fail-closed BEFORE any byte moves
  (acquirable rights only; 64-hex digest; synthetic-identity rejection mirroring the authority's constitutional
  check; original bytes must sha256-match the digest; every variant's bytes must match its digest; remote URLs
  in declared variants are rejected as hotlinks). Idempotent on digest via `findMediaByContentHash`. Uploads
  the original + derivatives through the blob authority, saves a `PublishedMediaAsset`
  (`lifecycle: published`, `source: local`, `storage: blob`, contentHash = digest) through the KV authority.
  Every served URL in the saved record is exactly what the blob authority returned; nothing is hardcoded.
  Authority access is injected; production callers omit `deps` and get the real authorities via lazy import
  (importing the module never touches the network).
- `authority-projection.ts`: `projectObjectMedia`, `resolveAuthorityHero`, `projectHero`. Joins the manifest
  (evidence: rights, provenance, alt, semantic attachment via `attach.ts`) with the authority's serving truth
  (the public gate). A gate rejection or a throwing gate is fail-closed: the asset is excluded, never served.
  `src` is always authority-issued; the pipeline's `sourceUrl` is evidence only and is never emitted as `src`
  (no hotlinking as architecture). Hero resolution is deterministic with the owner's validated selection
  outranking auto (`owner` / `auto` / `owner-fallback` + diagnostic note). `projectHero` returns exactly one of
  approved media or a generated treatment: never a broken image, never an invented photograph.
- `generated-treatment.ts`: the no-media case. `generatedTreatmentFor({objectId, title})` derives a
  deterministic visual from the object's own tokens (palette + initial + brand foreground). The treatment
  carries NO url/src/img field of any kind, so it is structurally incapable of being a broken image; the
  caption always discloses "Not a photograph of this business."
- `media-tokens.ts`: lane design tokens. Deterministic palette from sha256 (warm artisan band, hues 18..42);
  `foregroundForLightness` chooses between the two brand foreground tokens by lightness. A literal RGB
  complement (hue + 180) is never computed; contrast comes from lightness, never opposing hues.

## Test results (green)

14 suites / 149 tests pass, including the 10 pre-existing suites (107 tests, untouched and still green).
New suites, 42 tests:

- `authority-binding.test.ts` (7): happy path pins the saved `PublishedMediaAsset` shape and that every
  served URL equals what the (fake) authority returned; idempotency (no re-upload/re-save); rejections for
  unclear-reference-only rights, hotlink variant URLs, synthetic content identity, bytes/digest mismatch, and
  missing variants, all before any byte moves.
- `authority-projection.test.ts` (18): the four required cases
  1. same graph -> same media selection (run twice identical; manifest-order reversal identical);
  2. owner pick outranks auto (gallery asset beats the automatic hero-role pick; basis `owner`);
     invalid/unknown/logo/gate-rejected owner picks fall back to auto with a diagnostic note;
  3. empty media (empty manifest, null manifest, all-rejected gate, throwing gate) yields a generated
     treatment with no src/url/img key and no remote URL anywhere in the result;
  4. unsafe URLs rejected: gate rejections never project; approved records with no usable variant URL are
     skipped; `src` is always authority-issued and never equals the pipeline `sourceUrl`.
- `generated-treatment.test.ts` (6): determinism, per-object difference, no-URL structural guarantee,
  not-a-photograph disclosure.
- `media-tokens.test.ts` (11): determinism, hue band, analogous-never-complement companion, foreground
  picker restricted to the two brand tokens, known-answer sha256 vector.

## Patch proposals

**None filed.** Nothing in this lane requires touching a shared file: the binding stage is invoked by future
pipeline-runner work (lane-contained), and the projection is consumed through its `DisplayMedia`-shaped
output. The identified future seam (renderer Hero consuming `projectHero`, threading an owner hero id from
the object view) is renderer-lane work; the original lane's P1/P2/P3 notes in `harvest-note.md` still describe
those seams accurately.

## Files

Implementation (new, lane-contained, untracked in git):
- [authority-binding.ts](sandbox:/home/hatch/workspace/fyd-factory/media/staging/new/authority-binding.ts)
- [authority-projection.ts](sandbox:/home/hatch/workspace/fyd-factory/media/staging/new/authority-projection.ts)
- [generated-treatment.ts](sandbox:/home/hatch/workspace/fyd-factory/media/staging/new/generated-treatment.ts)
- [media-tokens.ts](sandbox:/home/hatch/workspace/fyd-factory/media/staging/new/media-tokens.ts)

Live copies are at `/home/nolan/projects/ping/src/fyd/media/` on the Pig (branch `fyd-factory`).

Tests (new):
- [authority-binding.test.ts](sandbox:/home/hatch/workspace/fyd-factory/media/staging/new/__tests__/authority-binding.test.ts)
- [authority-projection.test.ts](sandbox:/home/hatch/workspace/fyd-factory/media/staging/new/__tests__/authority-projection.test.ts)
- [generated-treatment.test.ts](sandbox:/home/hatch/workspace/fyd-factory/media/staging/new/__tests__/generated-treatment.test.ts)
- [media-tokens.test.ts](sandbox:/home/hatch/workspace/fyd-factory/media/staging/new/__tests__/media-tokens.test.ts)

Verification: `git status --short -- src/fyd/media/` shows only `??` (new) entries for this lane's 8 files;
no `M` entries were produced by this lane anywhere in the repo (the listed `M` files are pre-existing work
from other lanes). No em dashes were used in any written file.

## Caveats and follow-ups

- The binding's default (non-injected) deps use lazy dynamic imports of the real authorities; that path is
  wired but intentionally untested (tests always inject fakes, so no test touches KV/Blob/network). A live
  end-to-end bind against dev KV/Blob is still unproven and should be a supervised run, not a test.
- `src/fyd/media/manifests/ping-fyd.json` (untracked, from the original lane run) was left alone.
- One transfer retry was needed (`authority-binding.ts` timed out once via the chunked bridge; re-sent and
  verified). One test syntax error (`});`) was caught by the first suite run and fixed; the rerun is green.
- Suggested next: a supervised `run-ingest` + `bindMediaToAuthority` pass for one demo site to prove the
  live binding path, then renderer-lane consumption of `projectHero`.
