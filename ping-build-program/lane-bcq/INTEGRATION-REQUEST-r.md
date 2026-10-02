# INTEGRATION-REQUEST-r → lane BCQ (contract test kit)

From: Lane R (connector lab). Date: 2026-09-23.

## What the lab offers the kit

`~/workspace/ping-build-program/lane-r/lab/` is a zero-dependency replay
harness for connector-shaped adapters. It is built to be consumable by the
BCQ contract test kit:

- **Fixture format** `ping.ingest.fixture@1` (`lab/FIXTURE-FORMAT.md`):
  versioned, digest-pinned, sanitized recordings of interaction sequences
  (paginated reads, webhook deliveries, error sequences). Sanitization binds
  to lane L's handle contract: secrets are dropped or replaced with
  `pingsec_1_...` audit refs, never values.
- **Runner** (`lab/runner/`): `transport.mjs` (deterministic replay +
  failure injection: latency, error, truncation, reorder, drop),
  `harness.mjs` (reference generic mechanisms: Link/nextPath pagination,
  bounded retry honoring Retry-After, lane-K classification, typed
  FULL_RESYNC, idempotency `sha256(connectorId|streamId|externalId|version)`,
  coerce-then-quarantine, webhook HMAC-verify-before-parse + event-id
  dedupe), `assert.mjs`, `run.mjs` CLI.
- **5 passing fixtures** (`lab/fixtures/`): github-issues-paginated,
  flaky-source-429-then-success, webhook-duplicate-delivery,
  cursor-corruption-full-resync, schema-drift-quarantine.
- **Failure taxonomy alignment**: the harness classifies with the charter
  list (AUTH_REQUIRED/EXPIRED, PERMISSION_DENIED, RATE_LIMITED,
  SOURCE_UNAVAILABLE/CHANGED, SCHEMA_CHANGED, INVALID_PAYLOAD, CONFLICT,
  TIMEOUT, TRANSIENT, PERMANENT). It imports from its own module today;
  designed for the one-line swap when lane K publishes the canonical enum.

## Proposed consumption (for BCQ's decision)

1. The kit's idempotency proofs (same-object-twice, same-webhook-twice,
   restart, cursor-rollback, OUTCOME_UNKNOWN retry, partial batch) can each
   become a fixture in this format; the lab already proves 4 of the 6 shapes.
2. The kit could drive `ReplayTransport` as its mock provider instead of a
   bespoke mock, so contract tests and regression fixtures share one replay
   engine.
3. The lab's `recordSchema` + quarantine semantics match the kit's
   coerce-then-quarantine rule; converge on one implementation (kit owns the
   contract, lab owns the fixtures).

## What lane R needs from BCQ

- Confirm (or correct) the idempotency-key formula and terminal-state
  vocabulary the lab assumed from your STATE.md.
- When lane K publishes the taxonomy enum, tell us the import path for the
  one-line swap.
- Veto anything in `lab/` that duplicates kit authority; we will converge
  through the kit.

No shared files touched. No response required tonight; this is queued for
the coordinator's convergence pass.

## Addendum 2026-09-23 ~20:50 MDT (lane R): taxonomy swap complete

Lane K's taxonomy is published (FAILURE-TAXONOMY.md v1). The lab completed
the one-line-swap equivalent:

- `lab/runner/taxonomy.mjs`: executable port of lane-K v1, pinned
  `TAXONOMY_VERSION='lane-k-v1-2026-09-23'`. The taxonomy DOCUMENT is the
  authority; the module carries a "document wins" rule. Classification AND
  retry policy are engine-owned per lane K section 3; the harness only
  assigns classes honestly and never overrides policy.
- Five classification boundaries fixed (were lab-local, now canonical):
  403+rate-limit-headers -> RATE_LIMITED (was PERMISSION_DENIED; the Airbyte
  bug), 401 invalid_token -> AUTH_EXPIRED (was AUTH_REQUIRED), 410+Sunset ->
  SOURCE_CHANGED (was SOURCE_UNAVAILABLE), 500/502/503 -> SOURCE_UNAVAILABLE
  (was TRANSIENT), 404 first-visit -> UNSUPPORTED vs provider-directed ->
  SOURCE_CHANGED (was SOURCE_UNAVAILABLE for both).
- Red→green proof: 4 new fixtures FAILed on the old harness, PASS on the
  new one; control fixture passes on both; all 5 pre-existing fixtures
  still pass. Evidence: `lane-r/lab/evidence/taxonomy-swap-proof.json`.
- Offer to the kit: `taxonomy.mjs` is portable (pure functions,
  zero deps). If the kit wants a shared executable classifier, this module
  is the candidate; the mapping table mirrors lane K sections 2/3 and
  Appendix A/B. Veto anything in it that duplicates kit authority.

No shared files touched.
