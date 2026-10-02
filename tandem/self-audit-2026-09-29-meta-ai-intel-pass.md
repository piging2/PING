# Self-audit note 2026-09-29 — meta-ai-intel-pass (~09:04 MDT run)

Pass ran two prompts, both ended ok:
- b-new-business-radar (run 20260929-150414, pack 08af8eae2e, 11142 bytes, 10 items, reconciled)
- d-segment-deep-dive (run 20260929-150700, pack a29a80a01f, 18734 bytes, 12 items, reconciled)
- spool drained: SPOOL_EMPTY. No infra failures. rotation.txt bootstrap cache updated to d-segment-deep-dive (both runs ok).

## Candidate invariant (NOT promoted — single observation, awaiting a second)
Observation: distill-sweep.py --select --cap 5 selected the pass's own fresh answer
(20260929-150414-b-new-business-radar.md, age 0.1h, band normal, engine_ingested=false)
as an eligible dead-letter candidate. The agent deferred it (0 processed) to the
discovery job's primary ingest path, since the file was 6 minutes old and the sweep
is the dead-letter safety net, not the primary path. No stale-breach files (queue 116,
70 engine-ingested excluded, eligible_total 1).

Proposed invariant (to test on repeat): a sweep-selected answer younger than one full
discovery-job ingest cycle with sidecar answer_captured and band normal should be
EXCLUDED from sweep processing (defer to primary ingest) rather than processed inline.
Promotion condition: a second observed instance where the fresh-file selection either
caused duplicate verification work or another explicit deferral decision; then codify
the age band in distill-sweep.py's eligibility as a deterministic rule instead of agent
judgment. Until then, no machinery change.

## No promotion this pass
Both reconciliations matched on first try; lifecycle machinery already owns the
quarantine skip logic; nothing new crossed the "seen enough times to automate" bar.
