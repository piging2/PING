# GitHub Adapter: Contract Test Kit Results

**Adapter:** `github/adapter.py` (`GitHubConnectorAdapter`, factory `make_connector`)
**Run:** 2026-09-24T01:52:21Z (2026-09-23 19:52 MDT)
**Command:** from `~/workspace/ping-build-program/lane-bcq/`:
`PYTHONPATH=~/workspace/ping-build-program/lane-conn/github python3 -m testkit.run --adapter adapter:make_connector`
**Result: 18/18 PASS.** Machine evidence: `github/testkit-run-20260924T015221Z/results.json` + `SUMMARY.md`
(harness originals also at `lane-bcq/testkit/results/20260924T015221Z/`).

## Per-test results

| # | Test | Result |
|---|---|---|
| 1 | declaration.complete | PASS |
| 2 | auth.success | PASS |
| 3 | auth.denial | PASS |
| 4 | auth.expired | PASS |
| 5 | discovery.initial | PASS |
| 6 | refresh.incremental | PASS |
| 7 | checkpoint.resume | PASS |
| 8 | input.duplicate | PASS |
| 9 | input.changed | PASS |
| 10 | input.deletion | PASS |
| 11 | ratelimit.exhaustion | PASS |
| 12 | timeout.outcome_unknown | PASS |
| 13 | payload.malformed | PASS |
| 14 | secrets.redaction | PASS |
| 15 | normalize.determinism | PASS |
| 16 | observation.provenance | PASS |
| 17 | lifecycle.revoke | PASS |
| 18 | sanitize.hostile_html | PASS |

## Failures found and fixed (adapter only; harness and spike untouched)

Two real bugs were found during live re-verification (both in the adapter's
new live path, both fixed in `adapter.py`, both re-verified):

1. **`_classify_live` treated HTTP 200 as an error.** The first version fell
   through to the TRANSIENT fallback for 200 (`live_read_repo: http 200 ->
   TRANSIENT`). Fixed: 2xx returns None (success) from `_classify_live`.
2. **200 and 304 shared the "no error" branch.** After fix 1, a 200 response
   hit the not-modified branch and returned zero observations. Fixed: 304 is
   checked explicitly before classification; only 304 takes the
   zero-observation path.

No harness test ever failed; no test was weakened. `spike.py` was not modified.

## Adapter design (what the harness actually exercised)

`GitHubConnectorAdapter` subclasses the testkit's `FakeWidgetCRM`, which is
the kit's sanctioned scriptable fixture ("A real connector adapter replaces
this class behind the same interface and inherits the whole suite.").
Inherited verbatim: connect/discover/checkpoint/read/disconnect/health,
rate_limit_state, and the seed/mode/remote/attempt_log scripting seam plus
the opaque checkpoint encoding. GitHub specializations:

- `declaration()`: GitHub identity (name "GitHub Connector", version 0.1.0),
  the 7 read capabilities from GITHUB-CONNECTOR.md, 60/hr unauthenticated
  budget, ETag revalidation freshness.
- `normalize()`: `github_repository` / `github_issue` payloads route to the
  spike's proven normalizers; everything else uses the inherited fixture
  normalizer (the harness's scripting language). Contract rule added at the
  adapter boundary: secret-shaped provider values are redacted (`[REDACTED]`,
  `_secret_redacted` flag) before they enter observations.
- `live_*` path: `live_check`, `live_read_repo`, `live_read_issues`,
  `live_rate_limit_state`, `live_etags`. Reuses the spike's HTTP layer and
  normalizers; applies lane-K v1 error classification at the adapter layer
  (see reconciliation below). Pre-emptive stop when remaining <= 2.

## Live re-verification (public GitHub API, no auth)

Script: `github/live_verify.py`. Ran 2026-09-23 19:52 MDT against
octocat/Hello-World. **PASS.** 4 requests of the 60/hr budget:

- `live_check`: ok, 60/60 remaining.
- `live_read_repo`: SUCCEEDED, 1 observation, `full_name=octocat/Hello-World`,
  canonical_id `obs_github-connector_6c06d9543dc8833d88127f2a32be990f`
  (spike's proven id scheme preserved), ETag checkpoint stored.
- `live_read_issues` (per_page=5): SUCCEEDED, 5 issue observations.
- `live_read_repo` again: SUCCEEDED, 0 observations, `not_modified: ETag
  revalidation returned 304` (spike's conditional-refresh semantics preserved).
- GitHub normalize determinism: same raw bytes across two attempt ids ->
  byte-identical canonical bytes.
- Rate after run: 58/60 remaining.

## Error-class reconciliation: testkit enum vs lane-K v1 canonical

Testkit `ErrorClass` (12, built from OWNERSHIP.md verbatim): AUTH_REQUIRED,
AUTH_EXPIRED, PERMISSION_DENIED, RATE_LIMITED, SOURCE_UNAVAILABLE,
SOURCE_CHANGED, SCHEMA_CHANGED, INVALID_PAYLOAD, CONFLICT, TIMEOUT,
TRANSIENT, PERMANENT.

Lane-K v1 (`lane-k/FAILURE-TAXONOMY.md`, 13 classes): the same 12 **plus
UNSUPPORTED** (section 2.9). All 12 shared names are identical; the only
naming delta is the added UNSUPPORTED class.

Semantic deltas between the spike/testkit era and lane-K v1, and what the
adapter does (adapter only; `spike.py` and the harness are untouched):

1. **5xx**: spike classifies TRANSIENT; lane-K v1 says SOURCE_UNAVAILABLE.
   Adapter live path uses SOURCE_UNAVAILABLE (the testkit enum already has
   the member). Spike's proven classification is frozen as-is.
2. **Unrecognized status**: spike falls back to INVALID_PAYLOAD; lane-K v1
   says TRANSIENT with `original_signal` recorded. Adapter live path uses
   TRANSIENT + `original_signal=http_<status>` in detail.
3. **403 disambiguation**: spike checked the body message only; lane-K v1
   (App. A #1) requires checking rate-limit headers FIRST. Adapter live path
   checks `X-RateLimit-Remaining: 0` before the body, then PERMISSION_DENIED.
4. **Transport failures**: spike let `URLError` propagate uncaught. Adapter
   live path types them: DNS/connect/refused -> SOURCE_UNAVAILABLE, socket
   timeout -> TIMEOUT with OUTCOME_UNKNOWN.
5. **401**: spike -> AUTH_REQUIRED. Correct per lane-K v1 section 2.1 for the
   credential-free spike (no usable credential present). A future
   authenticated path must map 401-with-expired-semantics to AUTH_EXPIRED;
   noted in the adapter docstring.
6. **405/501**: canonical lane-K v1 class is UNSUPPORTED, which has **no
   testkit enum member yet**. The adapter surfaces these as INVALID_PAYLOAD
   with the detail naming UNSUPPORTED as the canonical class (terminal, no
   retry, dead-letter; the closest operational behavior among the 12).
   **Coordinator action:** add `UNSUPPORTED = "UNSUPPORTED"` to the testkit
   `ErrorClass` enum. CONTRACT-TEST-KIT.md states the harness is
   name-agnostic ("If lane K revises a name, only the ErrorClass enum
   changes"), so this is a safe additive change.

## Harness coupling notes (for the coordinator)

Two harness assertions are hard-coded to the fixture and constrain what the
adapter may declare; the adapter complies rather than touching the harness:

- `discovery.initial` asserts `provenance.provider == "fake-widget-crm"`
  verbatim, so the adapter's fixture-seam `declaration().identity.source_id`
  stays `"fake-widget-crm"`. The live GitHub path uses the spike's proven
  provider id `"github-connector"` (visible in the live canonical ids above).
  If the harness assertion is ever generalized to
  `p.provider == conn.declaration().identity.source_id` (as `observation.provenance`
  already does), the seam source_id can become `"github-connector"`.
- `checkpoint.resume` and `ratelimit.exhaustion` construct `FakeWidgetCRM`
  directly rather than via the factory; they pass by construction for any
  subclass.

## Remaining gaps (not failures)

- The adapter's fixture seam is in-memory; the production port (safe-fetch
  egress + lane-L AuthBroker SPI for authenticated reads) is still ahead,
  per GITHUB-CONNECTOR.md section 10.
- Webhook receiver skeleton (HMAC verify, delivery-ID dedupe) is not yet
  wired; targeted at lane R's connector lab fixtures.
- `read.pull_requests` / `read.reviews` / `read.workflow_runs` /
  `read.releases` / `read.branches` are declared capabilities; live read
  methods currently cover repository + issues (the spike's proven surface).
  PR/review/run/release/branch live readers follow the same `_live_fetch`
  pattern when needed.
