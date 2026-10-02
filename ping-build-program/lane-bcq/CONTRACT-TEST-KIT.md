# PING Connector CONTRACT TEST KIT

**Lane:** BCQ-TESTKIT | **Status:** PROVEN (18/18 green on fake fixture) | **Date:** 2026-09-23

One runnable harness every future connector adapter plugs into. This is the
P0 infra that 20xes connector development: write the adapter, run the kit,
ship when green.

## What it is

- `testkit/contract.py` - the testable contract surface: interface, types,
  error taxonomy, provenance envelope, secret redaction.
- `testkit/harness.py` - the runner plus the 18-test suite.
- `testkit/fake_connector.py` - FakeWidgetCRM, a scriptable in-memory fixture
  implementing the contract. Proves the harness is runnable tonight.
- `testkit/run.py` - CLI entry: `python3 -m testkit.run [--adapter path:Factory]`.
- `testkit/results/<ts>/` - machine-readable `results.json` + `SUMMARY.md`
  evidence from each run.

Standard library only. No dependencies.

## The contract surface under test

Operations: `connect`, `discover`, `checkpoint`, `read`, `normalize`,
`refresh` (incremental discover), `disconnect`, `health`, `rate_limit_state`.

Every connector must expose:

| Surface | Verified by |
|---|---|
| SOURCE IDENTITY | declaration.complete: source_id, name, semver present |
| AUTH SCOPE | auth tests: credential_type, granted_by, exact scopes in declaration |
| CAPABILITIES | declaration lists verb.object capabilities; never self-granted |
| CHECKPOINT | checkpoint.resume: opaque cursor survives restart, no loss, no dupes |
| OBSERVATIONS | every fetch yields NormalizedObservation |
| PROVENANCE | observation.provenance: provider, source_record_id, fetched_at, fetch_attempt_id, connector_version on every observation |
| ERROR CLASS | typed ConnectorError mapped to the lane-K taxonomy on every failure |
| RATE-LIMIT STATE | ratelimit.exhaustion: declared budget enforced, RATE_LIMITED emitted |

Secrets stay behind the connector boundary: `connect()` takes an opaque
`CredentialRef`, never a raw secret. Normalization redacts secret-shaped
values in provider data (`[REDACTED]`, flagged). The harness scans every
observation, checkpoint, and log line for secret-shaped values and fails the
suite on any hit.

## The 18 tests

1. `declaration.complete` - mandatory declaration fields present
2. `auth.success` - valid credential -> AUTHORIZED
3. `auth.denial` - bogus credential -> AUTH_REQUIRED, zero observations
4. `auth.expired` - expired credential -> AUTH_EXPIRED, fetches stop
5. `discovery.initial` - full first sync lists all objects, checkpoint advances
6. `refresh.incremental` - second discover returns only newer objects
7. `checkpoint.resume` - restart with saved cursor: no loss, no duplicates
8. `input.duplicate` - same external object twice -> one canonical observation, byte-identical
9. `input.changed` - modified object -> same canonical_id, version advances, old value retained
10. `input.deletion` - deleted object -> deletion observation; history is never erased
11. `ratelimit.exhaustion` - budget exhausted -> RATE_LIMITED, no storm
12. `timeout.outcome_unknown` - timeout -> OUTCOME_UNKNOWN + TIMEOUT class, max 3 attempts, no retry storm
13. `payload.malformed` - schema change -> SCHEMA_CHANGED/INVALID_PAYLOAD; good objects still process
14. `secrets.redaction` - secret-shaped provider data redacted; outputs/logs clean
15. `normalize.determinism` - same input -> byte-identical normalized output across attempt ids
16. `observation.provenance` - full provenance envelope + confidence grade on every observation
17. `lifecycle.revoke` - after disconnect: REVOKED, all fetches stop
18. `sanitize.hostile_html` - script tags and event handlers stripped before normalization

## Error taxonomy alignment

Lane K owns the canonical taxonomy. The kit uses its published list verbatim:

AUTH_REQUIRED, AUTH_EXPIRED, PERMISSION_DENIED, RATE_LIMITED,
SOURCE_UNAVAILABLE, SOURCE_CHANGED, SCHEMA_CHANGED, INVALID_PAYLOAD,
CONFLICT, TIMEOUT, TRANSIENT, PERMANENT.

Dependency note: lane K had no draft on disk when this kit was built
(2026-09-23 ~19:40 MDT). BCQ used the taxonomy list from OWNERSHIP.md as the
source of truth. If lane K revises a name, only the `ErrorClass` enum changes;
harness logic is name-agnostic. Lane K: please confirm or revise.

The kit also encodes the connector-contract.md failure contract:
SUCCEEDED / FAILED / OUTCOME_UNKNOWN / NOT_STARTED as the only terminal
fetch states, and OUTCOME_UNKNOWN reconciles (bounded, jittered) rather than
retry-storms.

## How to plug a connector in

1. Implement the `Connector` ABC from `testkit/contract.py` in your adapter
   module. `connect()` must accept only an opaque `CredentialRef`.
2. Expose a zero-arg factory: `def make_connector() -> Connector`.
3. Run: `python3 -m testkit.run --adapter myconn.adapter:make_connector`
4. Green (18/18) is the merge bar for the adapter layer. A failing test is a
   contract violation, not a harness bug; fix the adapter.
5. Commit the run evidence (`testkit/results/<ts>/`) next to your adapter for
   the coordinator's convergence pass.

## Design decisions (deliberate, frozen for now)

- Python stdlib, not TypeScript: the kit is lane-owned test infra, not PING
  runtime code. No dependency install, runs anywhere, ~5 minute port to TS
  when a runtime binding is needed.
- No giant interface freeze: the surface mirrors connector-contract.md but the
  canonical interface converges after 2-3 real implementations. The kit tests
  BEHAVIOR (resume, idempotency, redaction), not method signatures, so the
  surface can evolve without invalidating the suite.
- Connector data is OBSERVATION: the kit verifies observations carry
  provenance and confidence grades; it never asserts provider truth.
- Kill criteria for any future import into PING: license incompatibility,
  secret-model unsafety, lost provenance, unisolatable weight.

## Proof

- Green run 2026-09-23 19:40 MDT: 18/18 PASS, evidence at
  `testkit/results/20260924T014036Z/` (results.json + SUMMARY.md).
- One real red-to-green during development: the secrets.redaction test caught
  the fake fixture passing secret-shaped provider data through unmodified;
  fix was redaction at the connector boundary (`redact_secrets` in
  contract.py), now a contract rule, not a fixture quirk.

## NEXT

Run the kit against the GitHub connector design as its first real consumer.
BLOCKED on sibling lane CONN: lane-conn has no design file on disk yet
(checked 2026-09-23 ~19:38 MDT). When the design lands, the BCQ lane will wrap
it behind the `Connector` ABC and run `python3 -m testkit.run --adapter ...`.
