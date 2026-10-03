# Self-audit 2026-10-02: distill-sweep re-selected an already-distilled file

## What happened
The 2026-10-02 15:10 pass fully distilled `20261002-210450-a-weak-website-hunt.md`
(18 independent verification searches, 3 VERIFIED-NEW staged to pipeline.md,
10 collisions already tracked, tally written to ingested.log, `mark-verified.sh`
then `mark-distill-closed.sh` run). The next pass's `distill-sweep.py --select`
re-selected the same file as a dead letter (eligible, age 6h, engine_ingested=false).

## Root cause
`engine_ingested_prefixes()` in `tandem/distill-sweep.py` recognized a completed
ingest only via (a) the legacy word 'ingest' or (b) the round-124 marker pair
'audited'+'verdicts'. The current writer format records completion as
"mark-verified.sh then mark-distill-closed.sh run; no canonical JSONL merge
(300-active cap full)." - which contains neither signal. The file was fully
processed and the sweep could not see it. Same defect covered the b-file
(`20261002-210655-b-new-business-radar.md`, same writer format).

## Invariant (specified, tested, automated)
An ingested.log line counts as a completed-ingest record when it carries a
YYYYMMDD-HHMMSS run prefix AND, case-insensitive, any of:
  1. the word 'ingest' (legacy "ingested after independent verification gate");
  2. BOTH 'audited' AND 'verdicts' (round-124 audit format);
  3. the distill-closed marker 'mark-distill-closed' (current writer format).
Fail-closed preserved: CAPTURE_FAILED 'recorded, NOT extracted' lines, bare
'run started' mentions, and 'verdicts'-without-'audited' notes still do NOT
count. Missing log still fails open (empty set).

## Evidence
- Unit cases: `tandem/tests/test-distill-ingest-marker.py` - 9 cases.
  Before the fix: 3 distill-closed cases FAILED (reproducing the production
  miss), all 6 fail-closed/fail-open cases passed. After the fix: 9/9 pass.
- Production check: `--select --cap 5` before fix selected the already-distilled
  a-file (engine_ingested_excluded=72); after fix it excludes it
  (engine_ingested_excluded=78, six more historical distill-closed records now
  recognized). New selection: the in-flight `20261003-030416-d-segment-deep-dive.md`
  (this pass's own run - correctly seen as unprocessed; deferred as in-flight,
  not distilled mid-write).

## What was removed from the agent
The agent no longer needs to reason about "was this file already processed by
the discovery job's ingest path?" on every sweep selection. The sweep's
eligibility now agrees with the writer's actual record format. One promotion
only: writer-format drift in marker detection. The general lesson (writer and
reader of the same log must agree on the completion signal) is recorded here,
not generalized into a framework.
