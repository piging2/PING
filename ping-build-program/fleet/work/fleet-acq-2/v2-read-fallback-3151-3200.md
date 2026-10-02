# v2 read-fallback 3151-3200: 10 subjects x 5 cases (fleet-acq-2, 2026-09-24)

Pattern-level sandbox proof. Lab: `fleet/work/fleet-acq-2/read_fallback_lab.py`;
evidence: `readfallback-evidence.json`. A read service with freshness labels
(FRESH / DERIVED / STALE + as-of), honest /health, per-path deadlines.

## Honest modeling notes (2 subjects are health-layer, not data-layer)
- /health with 2 of 3 integrations: the read IS fresh gateway state; case 0
  asserts the payload honestly labels ollama down and status degraded (it does).
- qdrant TCP->HTTP check fallback: the data read stays canonical; case 0 asserts
  the check metadata honestly records tcp=failed, used=http-version-fallback
  (never silently claiming TCP). Both subjects' case 4 uses the per-integration
  check deadline: a hung check returns bounded, labeled "down (check timeout)".

## Results: 50/50
- case 0 (3151..3160): every degraded data read labeled DERIVED (or STALE),
  canonical=False. Never canonical.
- case 1 (3161..3170): every STALE read carries a parseable as-of timestamp
  (09-17 snapshot, 09-19 dump).
- case 2 (3171..3180): all 10 responses carry an explicit freshness label; none
  claim FRESH while the primary is down. Fallback is never silent.
- case 3 (3181..3190): /health status == healthy/degraded/down exactly matches
  integration states; degraded names the down integration.
- case 4 (3191..3200): hung fallback path -> typed FallbackTimeout within the
  2.0 s fallback deadline; hung integration check -> bounded within the 1.0 s
  check deadline. Fallback has its own deadline; it cannot wedge the read path.
