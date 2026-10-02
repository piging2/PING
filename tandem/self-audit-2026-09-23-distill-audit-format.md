# Self-audit note: distill-sweep engine-audit format detection (2026-09-23)

## The invariant promoted
A completed outreach-engine audit record in ingested.log closes the dead
letter in EITHER log format. A line counts iff it carries a YYYYMMDD-HHMMSS
run prefix AND, case-insensitive, either the word "ingest" (legacy: "ingested
after independent verification gate") or the completed-audit marker pair
("audited" AND "verdicts"; round-124 format: "N businesses audited;
verdicts: VERIFIED-NEW 2, ..."). Mere mentions ("recorded, NOT extracted")
still do not count; "verdicts" without "audited" does not count; missing log
still fails open.

## Production evidence (this pass, meta-ai-intel-pass 2026-09-23 ~18:39 MDT)
The outreach engine's round-124 changed its ingested.log line format and
dropped the verb "ingested": "2026-09-23 round-124 <prefix>-<slug>.md: N
businesses audited; verdicts: ...". The sweep's 'ingest'-only detector
missed two fully-audited files (20260923-150416-b-new-business-radar.md,
20260923-150700-d-segment-deep-dive.md) and selected them as dead letters.
Hand-reasoned closure: both had complete audit records (verdicts, pipeline
staging, sidecar verified by outreach-engine round-124); the 4 VERIFIED-NEW
rows were confirmed present in pipeline.md; both closed as
terminal-distilled per the 2026-09-18 precedent instead of re-verifying 22
already-audited items. Post-patch production check: both round-124 prefixes
now detected; engine_ingested_excluded 44 -> 46; selection empty; no other
file's status changed.

## Reasoning the agent had to do, now removed from the agent
Recognizing a completed engine audit written in a new log-line format and
deciding it closes the dead letter. The detector now owns both formats, so
a future format variant that keeps "audited; verdicts:" (or "ingested")
structure is handled deterministically.

## Test
6 unit cases in ~/workspace/tandem/tests/test-distill-audit-format.py:
legacy ingested format detected; round-124 verdicts format detected
(red-before/green-after); verdicts-without-audited NOT detected
(narrowness guard); mere mention NOT detected; missing log fails open;
audit markers without run prefix detect nothing. All pass.

## Automation
~/workspace/tandem/distill-sweep.py: engine_ingested_prefixes() now
accepts the audit-marker pair alongside "ingest"; docstring updated.
Post-change production verification: round-124 prefixes detected, sweep
excludes 46, selects 0, eligible_total 0.

## Not promoted (observed, follow-up)
The outreach engine's round-124 audited meta-ai answer files without writing
distill.jsonl entries. The distill ledger remains the sweep's source of
truth for sweep-side processing, and ingested.log remains the engine-side
signal; the two ledgers are joined only by the run prefix. If the engine
changes its audit-line format again (dropping both "ingest" and the
"audited/verdicts" pair), detection fails open and the agent hand-reasons
again. A standing contract on the engine's audit-line format would remove
this residual; out of scope for this promotion.
