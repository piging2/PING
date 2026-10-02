# Step 7: Correction survives regeneration — PASS

Date: 2026-09-23. Proves the owner decisions from Step 6 survive a source
re-dump with source, override, and presentation kept distinct.

## Method (simulated re-dump, sandbox harness)

The production harness reads digest-verified projections from
`FYD_PROJECTION_DIR=/tmp/fyd-proj` per request (the `/sites` pages are
`ƒ` dynamic, not statically prerendered). A re-dump was simulated by
rewriting `happy-place.json` with the business's source phone changed to
`+15419998888` (as if re-observed), recomputing `meta.graphDigest` with
the real `canonicalize` from `src/lib/ping/ask-composer`. No code or
owner-store writes; the owner store was never touched.

## Observed after the simulated re-dump (live server, no rebuild)

- Owner phone `+1 541 555 0147` still effective on the business page and
  the site. The correction was NOT erased by the new source.
- Pergola still hidden on `/sites/happy-place` (service id count 0 in
  payload, no visible trace).
- The business page displayed all three layers distinctly:
  - Owner says: `+1 541 555 0147` (effective)
  - Source said at correction time: `+15412865190` (record snapshot)
  - Source now says: `+15419998888` (current), with the drift warning:
    "The source was re-observed after this correction and now says
    +15419998888 instead of +15412865190. The owner's value still stands."

## Defect found and fixed (generic)

The drift flag existed, but the overlay overwrote `fields[]` with the
owner value and kept only the stale `sourceValue` snapshot: the UI said
"source now says something different" without saying WHAT. The source's
current value was destroyed at composition.

- `OwnerFieldCorrection` gained `currentSourceValue` (read-model
  derivation, never stored, like `sourceDrifted`).
- `applyOwnerFieldCorrections` attaches it per read.
- Both UI surfaces (`/o/[objectId]` and `/o/[objectId]/manage`) now name
  both values in the drift warning.
- Regression tests extended: drifted correction asserts
  `currentSourceValue == "+19998887777"`; unchanged source asserts it
  equals `sourceValue`. Object suite 182/182, tsc clean, build 46/46.

## Restore

The sandbox projection was restored to the recorded demo state (source
phone `+15412865190`, digest recomputed); the live server shows no drift
warning, owner phone effective, Pergola hidden. The real Pig projection
and the digest-verified hashes from Step 1 were never touched.

## What this proves

- Owner store is the system of record for decisions; the projection is
  the system of record for observations. A re-dump changes the source
  layer only; it cannot erase the owner layer.
- Source / override / effective presentation are three distinct,
  simultaneously visible values, never collapsed into one.
- The hide decision survives regeneration the same way corrections do:
  it is re-read from the owner store on every serve.
