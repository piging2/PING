# PING acquisition (fyd/i07-acquisition)

Writer C, convergence interval 07. The PING knowledge acquisition rebuild:
declare the source list, re-derive with existing machinery, regenerate the
fixture mechanically, update the digest pin, prove refresh survival.

## Source manifest

`ping-sources.json` is the declared PING source list: already-known
legitimate sources only (repo tenant/product authorities, PING's public
Facebook Page, the prior derivation baseline). One line of provenance
basis per source, in the file. No curated list was requested; no sources
were invented.

## Provenance vocabulary: concept -> existing primitive

No new ontology was created. Every concept maps onto an existing,
already-reached PING/FYD primitive:

| Concept | Existing primitive |
|---|---|
| OWNER_ASSERTION | `ObjectProvenanceKind` legacy kind `"owner-asserted"` (ref `owner:tenant-config` / `owner:product-authority`); render content-contract `OWNER_ASSERTED` via the binding-verifier's `LEGACY_OWNER_ASSERTED_KIND` lane (b9a0201a); ask `classificationFromProvenance` -> `USER_OVERRIDE` |
| DIRECT_OBSERVATION | `ObjectProvenanceKind` `"website-derived"` with ref `website-ingestion:<url>` (the presence compiler's `compileGraph` convention); ask class `website_statement`; render content-contract `DIRECT_EVIDENCE` |
| VERIFIED_EXTERNAL_CLAIM | `ObjectProvenanceKind` `"canonical-journal"` with ref `ping-event:<event_id>`; ask `classificationFromProvenance` -> `DIRECT_FACT` |
| DERIVED | Ask-answer vocabulary `DERIVED` (`ConciergeGrade`, owned by the ask lane); render content-contract `DETERMINISTIC_DERIVATION` |
| INFERRED | Ask-answer vocabulary `INFERRED` (`ConciergeGrade`, owned by the ask lane); render-side there is no inference binding: unsupported factual atoms classify `UNKNOWN` and fail the emission gate |
| GENERATED_PRESENTATION | Render content-contract `GENERATED_PRESENTATION` (requires a generator mark AND an evidence ref); ask rank `GENERATED_COPY` |

The two vocabularies (render-atom vs ask-answer) are never conflated; that
separation is existing law (binding-verifier.ts).

## The provenance split (the one genuine decision)

PING facts come from two legs, and the legs never silently overwrite each
other:

- **Owner leg** (S1, S2): facts the owner asserted. Provenance
  `owner-asserted`, ask rank `USER_OVERRIDE`. This is where all 7 current
  objects live.
- **Website leg** (S3): facts observed from public sources through the
  anonymous-preview machinery. Provenance `website-derived` /
  `website-ingestion:<url>`, ask class `website_statement`. Observed facts
  are recorded in the run record and are NEVER auto-merged into
  owner-asserted objects; a merge is an owner-reviewed decision.

S4 (the 2026-09-21 dump) is the diffTwin comparison baseline only. Facts
carried from it are flagged per object in the run record as
`carried-from-prior` with the explicit note that no machine-readable
upstream source exists for them; the next rebuild must not cite S4.

## The driver

`rebuild-ping.ts` is deterministic: `(manifest, observedAt) -> candidate
graph + run record + diffTwin diff`. It uses existing machinery only:

- `generateAnonymousPreview` (onboarding/anonymous-preview) for the
  website leg: SSRF-safe fetch + `extractPageEvidence`. Claim-store writes
  are sandboxed via `FYD_CLAIM_DIR` to a temp dir for the run.
- `diffTwin` (builder/semantic-diff) for the twin diff; `normalizeOwnerIntent`
  + `emptyManifest` for the proof context.
- `canonicalize` / `sha256Hex` (lib/ping/digest): the same digest the
  `fyd-tenant-graph` seam verifies against the pin.

Usage (from the repo root):

```
FYD_CLAIM_DIR=$(mktemp -d) node_modules/.bin/tsx src/fyd/acquisition/rebuild-ping.ts \
  --manifest src/fyd/acquisition/ping-sources.json \
  --observed-at 2026-09-29T18:05:00.000Z \
  --review-dir src/fyd/acquisition/review
```

Outputs (review artifacts, written before any pin swap):

- `review/ping-base-20260921.json` — the pre-rebuild base (byte-identical to the pinned fixture).
- `review/ping-candidate-20260929.json` — the candidate refreshed graph + its digest.
- `review/ping-run-record-20260929.json` — per-source outcomes, per-object attribution, website-leg outcome.
- `review/ping-difftwin-20260929.json` — the diffTwin diff (old base vs candidate).

`--write-fixture <path>` regenerates the fixture TS module mechanically
from the candidate (same header structure, updated dates/digests). The pin
value it prints is machine-computed with the seam's exact digest rule.

## The survival proof

`prove-refresh-survival.ts` runs the production refresh path
(`refreshSource` from builder/source-refresh) with the old base as
`currentSource` and the candidate as `refreshedSource`, carrying the
tenant's owner layer through untouched:

```
node_modules/.bin/tsx src/fyd/acquisition/prove-refresh-survival.ts \
  --review-dir src/fyd/acquisition/review
```

It asserts `ownerLayerIntact === true` (digest equality, machine-checked)
and writes `review/ping-refresh-proof-20260929.json`. The ping-fyd owner
layer at proof time is the default normalized intent with zero field
corrections; the proof records exactly that, so a future correction has a
baseline to survive against.

## What the rebuild does NOT do

- No new crawler, no cron, no scheduler.
- No model inference as a source.
- No hiding the stale substrate: the rebuilt fixture keeps the same 7
  objects, the same owner-asserted facts, and the same empty service
  fields. Reproducible acquisition; unchanged (still thin) knowledge.
- No silent website-over-owner merges, ever.
