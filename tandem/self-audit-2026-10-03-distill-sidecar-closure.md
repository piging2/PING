# Self-audit 2026-10-03: distill sweep re-selected discovery-closed files

## Invariant (specified)
An answer file whose sidecar carries a distill-closure transition (state
`distill_skipped` or `distilled`, or a `by` mentioning
`mark-distill-closed`) is already closed by the discovery engine's primary
ingest path. The distill sweep must exclude it with an auditable reason
and never re-verify it.

## Production evidence
On the 2026-10-03 15:04 pass, `distill-sweep.py --select --cap 5` selected
3 files; 2 of them were already fully processed by the discovery engine:
- 20261003-150446-b-new-business-radar.md (verified + distill_skipped at
  2026-10-03T19:33Z by mark-distill-closed.sh)
- 20261003-150801-d-segment-deep-dive.md (verified + distill_skipped at
  2026-10-03T19:33Z by mark-distill-closed.sh)

Both sidecars carried the closure transitions; the sweep still selected
them as dead letters. This is the second occurrence: the 2026-10-03 03:04
pass re-verified all 12 businesses of an already-audited file and found
zero additional stagings (~12-24 wasted verification searches per file).

## Root cause
`engine_ingested_prefixes()` keys off ingested.log and requires the run
prefix AND the `mark-distill-closed` marker on the SAME line. The
discovery lane's prose puts them on DIFFERENT lines of the same record
(prefix on the "- <file> - ANSWER CAPTURED" line, marker on the
"Audit: ... then mark-distill-closed.sh" line). The 2026-10-02 fix
(test-distill-ingest-marker.py) added the marker signal but kept the
single-line assumption, so it never fired on production records.

## Fix (automated)
`distill-sweep.py` now checks the sidecar's `transitions` list directly
(`sidecar_distill_closed()`): closure state or marker-in-`by` -> excluded
with reason "discovery engine already distill-closed (sidecar
distill-closure transition)". The ingested.log heuristic is kept as a
second, additive signal. Also fixed a stale-variable latent: the sidecar
except-branch now sets `sidecar = None` (previously a failed load left the
prior iteration's sidecar in scope).

## Tests
New: tests/test-distill-sidecar-closure.py, 12/12 green (unit: production
b-file sidecar closes, fresh sidecar stays open, malformed/absent sidecars
never close and never crash; integration: build_queue excludes the closed
fixture with the distill-closed reason and keeps the open fixture
eligible). Existing suites green: test-distill-ingest-marker.py,
test-distill-pipeline-audit.py. Verified on production state post-patch:
b/d files excluded with the new reason; only the fresh a-file remains
eligible.

## Commit
[pending - filled after commit]
