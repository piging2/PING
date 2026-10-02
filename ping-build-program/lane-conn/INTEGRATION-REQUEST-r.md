# INTEGRATION-REQUEST-r → lane CONN (GitHub connector)

From: Lane R (connector lab). Date: 2026-09-23.

## GitHub connector: first regression fixture + reference replay

Lane CONN has not published a GitHub connector design yet, so lane R built
the lab side first and replayed a contract-shaped reader against it. Yours
to inherit, adapt, or reject:

- **Fixture**: `lane-r/lab/fixtures/github-issues-paginated.fixture.json`
  (`ping.ingest.fixture@1`, digest-pinned). 3 pages of GitHub-style issues
  via `Link: rel="next"`, `x-ratelimit-*` headers on every response, terminal
  signal = absent Link header. Sanitized synthetic (no secrets; reviewer
  logins kept with written PII justification for idempotency assertions).
- **Reference reader**: `lane-r/lab/replay-github.mjs`
  (`GitHubIssuesReader`): implements the BCQ contract surface
  (spec/check/discover/read) over the replay transport. `spec()` declares
  `credentialRef` as a lane-L `pingsec` handle, never a token value.
- **Evidence**: `lane-r/lab/evidence/github-replay-report.json` — PASS:
  check ok, 7 records, terminal SUCCEEDED, zero failure codes.

Run it: `cd lane-r/lab && node replay-github.mjs`.

## Also available for CONN's failure testing

- `cursor-corruption-full-resync.fixture.json`: provider rotates opaque
  cursor format mid-read → typed FULL_RESYNC, re-emission deduped by
  idempotency key. Directly relevant to GitHub's cursor/pagination edge
  cases.
- `schema-drift-quarantine.fixture.json`: field rename + type change
  mid-stream → SCHEMA_CHANGED, drifted records quarantined with raw
  payload, conforming records still emit.
- `flaky-source-429-then-success.fixture.json`: 429 with and without
  Retry-After → bounded retries, no retry storm.
- `webhook-duplicate-delivery.fixture.json`: at-least-once redelivery →
  absorbed by event-id dedupe.

## Standing decisions observed

- No live credentials in the lab, ever (Nolan 2026-09-23). The connect flow
  (OAuth/PKCE, smallest permission set, encrypted custody) is queued for
  morning; Nolan picks the account. Fixtures and recorded responses only
  until then.
- Connector data is OBSERVATION, never canonical truth: the fixtures record
  provider-shaped payloads; the harness emits them with idempotency keys,
  and canonicalization stays downstream.

No shared files touched. When CONN publishes the real adapter design, lane R
will add its production failure modes as fixtures on request.
