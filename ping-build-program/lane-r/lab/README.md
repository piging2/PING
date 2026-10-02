# Connector Lab (Lane R)

Replayable ingestion fixtures + failure injection for connector development.
Zero dependencies, zero network, zero wall-clock. Every difficult external
source becomes a sanitized fixture: PRODUCTION FAILURE → FIXTURE →
REGRESSION TEST → GENERIC FIX.

## Layout

- `FIXTURE-FORMAT.md` — the `ping.ingest.fixture@1` spec (provenance,
  sanitization manifest, replay determinism, steps, expect, versioning,
  kill criteria, lab gates).
- `fixtures/` — 10 digest-pinned fixtures:
  - `github-issues-paginated` — GitHub-style Link pagination, 3 pages.
  - `flaky-source-429-then-success` — 429s then recovery, bounded retries.
  - `webhook-duplicate-delivery` — at-least-once redelivery absorbed.
  - `cursor-corruption-full-resync` — cursor rotation → typed FULL_RESYNC.
  - `schema-drift-quarantine` — mid-stream drift → quarantine, not crash.
  - `github-403-secondary-limit` — 403 + rate-limit headers → RATE_LIMITED
    (lane K scenario 1; the Airbyte infinite-loop bug, red→green proven).
  - `oauth-401-expired` — 401 invalid_token → AUTH_EXPIRED, halt, no retry.
  - `api-sunset-410-source-changed` — 410 + Sunset → SOURCE_CHANGED, no retry.
  - `provider-500-outage` — 500/503 → SOURCE_UNAVAILABLE, bounded recovery.
  - `github-403-permission-denied` — CONTROL: 403 with quota remaining stays
    PERMISSION_DENIED (proves the swap did not blanket-remap 403).
- `runner/` — `run.mjs` (CLI), `transport.mjs` (deterministic replay +
  failure injection), `harness.mjs` (reference generic ingestion
  mechanisms), `taxonomy.mjs` (executable port of lane-K taxonomy v1,
  canonical), `assert.mjs` (expect-block assertions + unconditional lab
  invariants), `lint.mjs` (fixture kill-criteria gate),
  `secret-scan.mjs` (secret/canary gate), `ladder.mjs` (10-gate test
  ladder per fixture).
- `redteam/` — `run-redteam.mjs` (5 adversarial cases, all CAUGHT),
  `drift-check.mjs` + `DRIFT-DETECTION.md`, `harness-tampered.mjs`
  (rigged double-write harness, red-team only).
- `replay-github.mjs` — contract-shaped GitHub issues reader replayed
  against the paginated fixture (reference consumer for lane CONN).
- `evidence/` — replay reports, `taxonomy-swap-proof.json` (red→green
  evidence), `ladder/` (per-fixture ladder reports).

## Run

```bash
cd ~/workspace/ping-build-program/lane-r/lab
node runner/run.mjs fixtures/github-issues-paginated.fixture.json
# all fixtures
for f in fixtures/*.fixture.json; do node runner/run.mjs "$f"; done
# full gates: lint + secret scan + digest + replay + invariants
node runner/run.mjs fixtures/github-issues-paginated.fixture.json --lint --scan-secrets
# failure injection: latency, error, truncation, reorder, drop
node runner/run.mjs fixtures/github-issues-paginated.fixture.json \
  --inject '{"latencyMs":500,"errorAt":["page-2"],"errorStatus":500}'
node runner/run.mjs fixtures/webhook-duplicate-delivery.fixture.json \
  --inject '{"reorderSeed":99}'
node runner/run.mjs fixtures/github-issues-paginated.fixture.json \
  --inject '{"dropAt":["page-1"]}'
# 10-gate test ladder, per fixture
node runner/ladder.mjs fixtures/github-403-secondary-limit.fixture.json
for f in fixtures/*.fixture.json; do node runner/ladder.mjs "$f" --report evidence/ladder; done
# red-team the lab itself (5 attacks, all must be CAUGHT)
node redteam/run-redteam.mjs
# drift check: recordSchema vs a fresh sample -> SCHEMA_CHANGED on drift
node redteam/drift-check.mjs fixtures/schema-drift-quarantine.fixture.json redteam/live-sample-drifted.json
# github connector shape
node replay-github.mjs
```

## Rules

- Fixtures are immutable once pinned: bump `fixtureVersion`, never edit.
- No secrets in fixtures, ever. Sanitization manifest required.
- One failure mode per fixture.
- A fixture that cannot fail is a tautology: reject it.
- Failure classification is canonical: lane-K taxonomy v1 owns the classes
  and the retry policy; the harness only assigns classes honestly.
- Lab never touches live providers or credentials (standing decision).
