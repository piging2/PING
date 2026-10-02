# LANE CONN — Business connector worker — BUSINESS-STATE
Worker: CONN-BUSINESS (subagent, night shift 2026-09-23, respawn after two
infra-timeout deaths).

## STATUS: PROVEN (GBP connector spike 36/36; docs delivered; live path queued)

## What this worker did (2026-09-23 ~19:53-20:20 MDT)
- Read OWNERSHIP.md + connector-contract.md + connector-manifest-schema.md +
  ecosystem-harvest.md + archaeology.md + lane-k/FAILURE-TAXONOMY.md + BCQ
  testkit contract.py.
- Checkpointed BUSINESS-STATE.md early, before the long research passes.
- Adopted the prior worker's partial GBP spike (renamed spike/ -> business/
  per sibling BUSINESS-* prefix reservation) and repaired all 3 failures:
  1. Real bug: connector-local secret-pattern extensions defined but never
     applied; planted canary survived sanitization in plain text. Fixed in
     _sanitize_text (redaction logged as coercion).
  2. Test bug: replay determinism compared fetch-scoped metadata
     (fetched_at, fetch_attempt_id, linked_at). Fixed: explicit
     VOLATILE_FIELD_PATHS exclusion; filed as integration request for
     lane-bcq to own the exclusion in canonical_bytes.
  3. Test bug: normalize() twice without fetched_at (defaulted to
     wall-clock). Fixed: fetched_at is an explicit caller input.
- Reran: 28/28 PASS. Evidence: business/evidence/run-20260924-015504.jsonl.
- Verified via Pig (read-only): PING repo has NO GBP API client and NO
  business-OAuth token lifecycle; the `google-business-profile` OAuth enum
  entry + controller listing are authority plumbing, not a duplicate.
- Built business/kit_adapter.py (testkit --adapter factory); verified ABC
  conformance (isinstance Connector; discover/health/declaration). Full
  harness run awaits BCQ-TESTKIT generalizing its fake-specific suite.
- Wrote BUSINESS-CONNECTOR.md (8-provider evaluation, winner design,
  mappings, next-3: Square, Yelp Fusion, Jobber), MORNING-QUEUE.md
  (8 credential/account requests, smallest permission sets, PKCE), and
  HARVEST-REPORT-BUSINESS.md (program ledger format).
- Standing decisions honored: no live credentials, no connections, fixtures
  only; nothing written to the PING repo; no em dashes.

## Ledger
- RESEARCHED: OWNERSHIP.md, connector contract + manifest schema,
  ecosystem harvest (M1-M18), archaeology, lane-K taxonomy, BCQ testkit,
  PING repo (no GBP client; safe-fetch is the egress gate).
- HARVESTED: prior worker's 25/28 GBP spike (adopted, repaired to 28/28).
- IMPLEMENTED: 3 spike fixes + business/kit_adapter.py.
- TESTED: spike 28/28 + ABC conformance check.
- FALSIFIED: "need an SDK for v0" (spike disproves); "canary redaction works
  via canonical list alone" (connector-local extension list was dead code).
- PROVEN: read-only GBP -> observation path with provenance, opaque cursors,
  429/403/304/ETag behavior, typed lane-K failures, secret-safe
  sanitization.
## Ledger (continued, 2026-09-24 ~02:15-02:40 MDT, CONN follow-up worker)
- VERIFIED: re-ran the 28/28 spike green by real execution; extended to
  36/36 with H-series failure injection.
- RED-TEAMED: H1 provider-down (503x3 -> SOURCE_UNAVAILABLE, FAILED, 3
  attempts max, no storm); H2 auth-expired (401 -> AUTH_EXPIRED, FAILED,
  SUSPENDED, gate stops further calls); H3 malformed (bad enum + missing
  name -> quarantined observations, good records still emit).
- FIXED: bare-401-on-locations silent-success bug; typed AUTH_EXPIRED +
  SUSPENDED on both legs. Evidence: business/evidence/run-20260924-023705.jsonl.
- WROTE: INTEGRATION-REQUEST-bcq.md, INTEGRATION-REQUEST-r-business.md.
- PROVEN: GBP connector fixture-proven end to end (fetch -> normalize ->
  observation -> evidence). Canonical-object resolution is downstream of
  phase0's acquisition trace; lane-conn never writes canonical state.
- BLOCKED-exact: live path only (MORNING-QUEUE.md items 1-2).
- NEXT: (unchanged) production adapter.ts, harness-suite pass post-bcq
  generalization, reviews-leg live probe, Square sandbox connector.

## Files (this worker's set; sibling owns GITHUB-* names)
- BUSINESS-STATE.md — this file.
- BUSINESS-CONNECTOR.md — candidate evaluation, winner design, mappings,
  cursor semantics, failure modes, next-3, kill criteria/optionality.
- MORNING-QUEUE.md — 8 requests for Nolan (accounts, smallest scopes, PKCE).
- HARVEST-REPORT-BUSINESS.md — program ledger format.
- business/ — GBP spike: gbp_connector.py, run_spike.py (28/28),
  fixture_transport.py, kit_adapter.py, fixtures/ (6), evidence/.
