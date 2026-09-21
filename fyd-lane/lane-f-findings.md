# Lane F findings: replay/reducer inventory + executable replay proof

Date: 2026-09-21 ~14:10 MDT. Site: fyd-site:happy-place.
Standing rule honored: replay was UNVERIFIED (D1) until this lane produced
executable evidence. The evidence below is that proof.

## 1. Inventory: the canonical event reducer EXISTS

Reducer: `/home/nolan/ping/tools/fyd-site-projection/dump.py`
(`fyd-projection-dump@1.0.0`). It is a genuine event reducer, not a new
event store:

- **History source**: PING Postgres `ping_events`, rows with
  `event_type='FYD_SITE_OVERLAY'` and `payload->>'siteId'=<slug>`.
  Read via read-only SELECT (docker-cp'd probe JS into the gateway
  container, or node on the Pig host for the demo journal).
- **Base**: mechanically extracted from the committed machine-generated
  fixture TS (`src/fyd/proceduralize/__fixtures__/happy-place-graph.ts`).
  Byte-deterministic; `fixtureFileDigest` (sha256 of fixture bytes) and
  `baseDigest` (sha256 of canonical base graph) recorded in meta.
- **Canonical ordering**: SQL `ORDER BY timestamp ASC, event_id ASC`.
  Timestamp ties are broken by `event_id` (gateway-assigned, unique).
- **Canonical bytes**: `canonicalize()` — recursive key sort, array order
  preserved, JSON separators `(',', ':')`, `ensure_ascii=False`; floats
  REFUSED (TS/Python serialize them differently — a digest must never be
  ambiguous).
- **Hash domain**: sha256 over the canonical bytes (UTF-8) of the graph.
  `graphDigest = sha256(canonicalize(graph))`.
- **Op set** (validated, fail closed — unknown op kinds abort the dump):
  `set_field`, `add_object`, `add_relationship`, `deactivate_object`.
  Every applied overlay records its producing PING `event_id` in
  `meta.overlayEventIds` and in per-object `provenance.updatedRefs`.
- **Event intake**: `emit-overlay.py` POSTs the envelope to the PING
  gateway `/events`; the gateway assigns `event_id` and persists to
  `ping_events`. No overlay without a PING event.

The reducer had no standalone replay entrypoint and always wrote the
live path `/home/nolan/ping/var/fyd-projections/<slug>.json`. The lane-F
adapter (`lane-f-replay-adapter.py`) fills exactly that gap: it imports
dump.py's functions UNCHANGED and redirects OUT_DIR to an empty
disposable scratch dir. No new store, no new history format.

Read path (website repo, branch fyd/sitespec-generator):
`src/fyd/data/ping-object-source.ts` (`getPingObjectGraphSync`,
`FYD_PROJECTION_DIR`-configurable) fail-closed verifies
`meta.graphDigest` with the TS canonicalizer
(`src/lib/ping/ask-composer.ts`) — same rule as the dumper.
Render path: `generateSiteSpec(graph, {generatedAt, eventSequences})`
(site page surface) and `loadObjectView(slug)` in
`src/fyd/object/view.ts` (ObjectView surface). "ONE READ MODEL":
both surfaces read the same projection.

## 2. Executable proof (all on the Pig, live var/ never touched)

History source decision (evidence, not assumption): the live projection's
`meta.overlayEventIds = [39fc9971a47f807ef38cf8976cb9d4ff4360c27b52bf14f4cc1f4393094d78fd]`.
A probe of BOTH journals (`lane-f-probe.py`) found that event in the
**demo journal** (ping-fyd-demo / ping-test-pg, 1 event, ts
2026-09-21T19:26:26.042Z) and NOT reachable in the main-journal path
(connect failed in the probe; see lane-f-failures.md). The replay
therefore ran with `FYD_OVERLAY_JOURNAL=demo` — the same journal that
produced the live projection. The demo-journal default is documented in
dump.py as the standing arrangement until the 8080 deployment lane
registers FYD_SITE_OVERLAY (FL-20260921-231).

- **Replay 1** (`/tmp/lane-f/scratch1`, empty dir):
  `graphDigest = 8f4737d846b4e75491b2f8092fabd8d792bb4c896e1e331dd2aac58b38be3607`
  — exact match of the live projection's `meta.graphDigest`.
  `baseDigest`, `fixtureFileDigest` (`dbe591a6…`, fixture mtime
  13:35 MDT predates the 13:55 live dump — inputs identical), and
  `overlayEventIds` all match the live meta.
- **Replay 2** (`/tmp/lane-f/scratch2`): graph byte-identical to replay 1,
  all digests equal. **Determinism proven by two independent runs.**
- **Cross-language check**: the replayed projection was loaded through
  the production read path (`getPingObjectGraphSync`), which recomputes
  the digest with the TS canonicalizer and fails closed on mismatch —
  it passed, proving the Python reducer's canonical bytes byte-match
  the TS canonicalizer's.

## 3. Replayed UI comparison (same surface, both projections)

`lane-f-ui-compare.mts` (tsx, run in the repo) rendered both surfaces
from the LIVE projection and from the REPLAYED projection through the
identical production code path:

- SiteSpec surface (what the SiteClient renders):
  live `0de56aa9040a683b1c911c465f89579b7c7bfcbd56b52f8a3065a0742be86022`
  == replay `0de56aa9040a683b1c911c465f89579b7c7bfcbd56b52f8a3065a0742be86022`
- ObjectView surface (name, summary, services, contact, media, relationships):
  live `aed8f46ec8e0f289002f82f794b66f1ec7b2a173feb0aaea9fbff0bc499c934d`
  == replay `aed8f46ec8e0f289002f82f794b66f1ec7b2a173feb0aaea9fbff0bc499c934d`

Wall-clock fields (`dumpedAt`) are excluded by construction — they never
enter the spec or the ObjectView.

## 4. Scorecard

- REPLAY: **PASS** — persisted canonical history (fixture bytes +
  FYD_SITE_OVERLAY events) replayed through the existing reducer into an
  empty disposable projection.
- REPLAY DIGEST: **MATCH** — `8f4737d846b4e754…` == live
  `meta.graphDigest`, on both replay runs.
- REPLAYED UI: **MATCH** — SiteSpec and ObjectView digests identical
  across live and replayed projections.
- FIRST BROKEN BOUNDARY: **none found** — every prerequisite existed.
  Scoping notes (not breakages): (a) the base graph comes from the
  machine-generated fixture, not from `ping_events` — the fixture is
  byte-recorded and digest-pinned, but it is a derivation input, not
  event history; (b) the canonical journal for these overlays is the
  FYD demo journal, not the main 8080 deployment journal (documented
  interim state per FL-20260921-231); (c) the main-journal query path
  failed to connect during probing (recorded in lane-f-failures.md).

## 5. How to re-run the proof

On the Pig (canonical repo `/home/nolan/projects/ping`,
branch `fyd/sitespec-generator`):
1. `FYD_OVERLAY_JOURNAL=demo python3 /tmp/lane-f/replay-adapter.py happy-place /tmp/lane-f/scratchN`
2. Compare `meta.graphDigest` against the live file's.
3. `cd /home/nolan/projects/ping && LIVE_DIR=/home/nolan/ping/var/fyd-projections REPLAY_DIR=/tmp/lane-f/scratchN ./node_modules/.bin/tsx /tmp/lane-f/ui-compare.mts`

Lane files (this repo's working copy): `lane-f-probe.py`,
`lane-f-replay-adapter.py`, `lane-f-ui-compare.mts`.
Pig-side copies live in `/tmp/lane-f/` (ephemeral); re-transfer from the
lane dir with `transfer-to-pig.py` if needed.
