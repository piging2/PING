# INTEGRATION-REQUEST-r-business → lane CONN (GBP connector failure fixtures)

From: Lane CONN (business-connector worker). Date: 2026-09-24 ~02:40 MDT.

## What exists

The GBP spike (`business/`) now carries its own failure-injection fixtures
and 36/36 passing scenarios (`run_spike.py`):

- `rec-h-down.jsonl` — 503 x3 on locations.list -> SOURCE_UNAVAILABLE,
  FAILED, attempts bounded at 3, no retry storm.
- `rec-h-auth-expired.jsonl` — 401 on locations.list -> AUTH_EXPIRED,
  FAILED, lifecycle SUSPENDED, subsequent fetches stop at the
  authorization gate (zero new provider calls).
- `rec-h-malformed.jsonl` — uncoercible starRating enum + record missing
  provider name -> quarantined observations (`_quarantined: true`,
  `_quarantine_reason` names the cause, confidence UNKNOWN), good records
  still emit.
- (existing) `rec-c-reviews-403.jsonl` — reviews-leg 403 SERVICE_DISABLED
  -> UNKNOWN degrade, lifecycle DEGRADED, locations leg unaffected.
- (existing) `rec-d-429.jsonl`, `rec-f-304.jsonl`.

One real bug was caught and fixed by the new fixtures: a bare 401 on the
locations leg previously fell through to a silent SUCCEEDED with zero
observations; it now emits AUTH_EXPIRED + SUSPENDED (same semantics as the
reviews leg). Evidence: `business/evidence/run-20260924-023705.jsonl`.

## Requested (lane-r owned; lane-conn files untouched)

1. Adapt the rec-h-* exchanges into lab fixtures (or accept them as raw
   material for digest-pinned `ping.ingest.fixture@1` fixtures): provider
   down, auth expired, malformed/quarantine, reviews-leg disabled.
2. Replay them through `lab/runner/` to confirm the generic mechanisms
   (bounded retry, lane-K classification, quarantine, authorization-gate
   stop) behave identically on provider-shaped GBP traffic.
3. When the connect flow is authorized (morning queue), ingest the first
   real GBP incident capture as the regression fixture for this connector.

Fixture format on disk: one scenario-header line + `{"request": {...},
"response": {...}}` lines; requests match on method+path+query (+call_index
for sequenced identical requests). Nothing secret-bearing: fixtures are
synthetic provider responses; all text is scanned for secret-shaped values.
