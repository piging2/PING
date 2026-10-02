# INTEGRATION-REQUEST-bcq → lane CONN (business connector: GBP)

From: Lane CONN (business-connector worker). Date: 2026-09-24 ~02:40 MDT.

## Adapter side is ready; harness side needs generalization

`business/kit_adapter.py` wraps the GBP spike behind the BCQ `Connector`
ABC (declaration/connect/discover/read/checkpoint/health/normalize all
satisfy the interface; ABC-conformance verified). The full 18-test suite
cannot run against it because the suite hard-codes the fake fixture:

- `conn.read("w1")`, `conn.read("widget_timeout")`, `conn.read("w2")` in
  input.duplicate / input.changed / input.deletion / timeout.outcome_unknown /
  payload.malformed / normalize.determinism / observation.provenance /
  sanitize.hostile_html
- connects with `FakeWidgetCRM.VALID_REF` (auth.success/auth.denial/auth.expired)
- discovery.initial asserts `provider == "fake-widget-crm"`

GBP equivalents exist tonight: `read("locations")`, `read("location:<name>")`,
`read("reviews:<name>")`, fixture ref `fixture:gbp-spike`, and failure seams
(503/SOURCE_UNAVAILABLE, 401/AUTH_EXPIRED, 429 bounded, 403/SERVICE_DISABLED
degrade, malformed quarantine) all proven in `business/run_spike.py` (36/36
PASS, evidence `business/evidence/run-20260924-023705.jsonl`).

## Requested (lane-bcq owned; do not touch lane-conn files)

1. Generalize the harness suite so real adapters can pass: either
   adapter-declared fixture object refs/seeds in the declaration (e.g.
   `harness_seed` / named test object refs), or a documented "fake-only"
   subset with a real-adapter subset defined by contract sections.
2. Own the volatile-field exclusion in `canonical_bytes`: replay determinism
   comparisons (E-series scenarios) must exclude fetch-scoped metadata
   (`provenance.fetched_at`, `provenance.fetch_attempt_id`, connector-local
   `_graded_link.linked_at`) from the canonical-byte identity comparison.
   Currently lane-conn carries this as test folklore
   (`VOLATILE_FIELD_PATHS` in run_spike.py); it should be a contract
   invariant.

No shared files touched. The GBP spike is the standing candidate for the
first real-adapter harness pass once the suite generalizes.
