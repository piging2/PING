# Harvest Report — Record/Replay Fixture Tooling (Lane R)

Date: 2026-09-23. Evaluated for the connector lab's replay engine.

## PROBLEM

Connector failures need to become replayable offline fixtures: recorded
request/response sequences, webhook deliveries, error sequences, and
failure-injection (latency, errors, truncation, reorder). The lab must run
with zero network, zero wall-clock, and zero dependencies so it can sit
inside the BCQ contract test kit and CI.

## PING ALREADY HAS

- The Coppersmith `@graph` fixture discipline: machine-generated header,
  timestamp pin, pipeline commit, sha256 source digest, regenerate-dont-edit,
  double-run byte-identical determinism proof (commit b8d899b1).
- `fyd-build/scripts/regen-fixtures` + proceduralize `__fixtures__`: the
  regeneration mechanism.
- Lane BCQ's contract test kit: zero-dependency TypeScript, runner-agnostic.
- Lane L's secret-broker handle contract: redacted references only.

What PING did NOT have: a fixture format for interaction sequences (as
opposed to object graphs), a replay transport, or failure injection. That is
what the lab builds.

## EXTERNAL CANDIDATES

| Tool | License | Status (verified 2026-09-23) | Mechanism of interest |
|---|---|---|---|
| VCR.py | MIT | Maintained | YAML cassettes: recorded request/response pairs, request matchers |
| nock (+ recorder) | MIT | Maintained | HTTP interception + recording at the Node http layer |
| msw | MIT | Maintained | Network-level request interception for tests |
| WireMock | Apache-2.0 | Maintained | Standalone mock server, record/stub via proxy |
| Mountebank | MIT | Maintained | Multi-protocol service virtualization |
| Polly.js (Netflix) | Apache-2.0 | Effectively archived (last release 6.0.6; ecosystem wrappers archived Jan 2026) | Record/replay with persister adapters (file system) |

## LICENSES

All candidates are MIT or Apache-2.0: compatible. No license kill.

## TESTED

No candidate was installed. Deliberate: the kill decision is architectural,
not empirical. The lab needs transport-agnostic replay at the
connector-interface level (fetch lifecycle + webhook delivery), because PING
connectors egress only through `safe-fetch` and fixtures must also cover
webhook push, cursor semantics, and failure classification that no HTTP
interceptor models. Installing an HTTP-interception library to test that
would couple every fixture to the HTTP transport and to Node's http module.

## WINNER

None as a dependency. The ADAPT is the cassette mechanism itself:
recorded request/response pairs + recorded timing + matchers + a persister
(file system), reimplemented as PING's own zero-dependency
`ping.ingest.fixture@1` format at the connector-interface level.

## ADOPT-ADAPT-REJECT

- **REJECT** nock, msw, WireMock, Mountebank as lab dependencies: weight
  dwarfs value; they intercept HTTP while the lab replays connector
  interfaces; WireMock/Mountebank add a JVM/Node service to CI for no gain.
- **REJECT** Polly.js: archived upstream; persister concept harvested, code not.
- **ADAPT** the cassette concept (VCR.py/Polly.js): request/response pairs,
  recorded latency as data, deterministic replay, file-system persister. This
  is exactly what `lab/runner/transport.mjs` implements, transport-agnostic.

## VENDOR VETO GATE (Nolan 2026-09-23, binding)

No candidate enters FYD's production hot path. Gate questions answered for
the ADAPT (own implementation, zero dependencies):

- DOES IT REMOVE COMMODITY CODE? Yes: every future connector gets replay,
  retry-proof, idempotency-proof, and failure-injection without reimplementation.
- DOES IT IMPROVE THE URL → TRUSTED FYD LOOP? Yes: production ingestion
  failures become permanent regression tests; the loop gets harder to break.
- CAN WE REMOVE/REPLACE IT? Yes: it is ~700 lines of our own code, no
  dependency, no proprietary format (plain JSON + sha256).
- DOES PING REMAIN THE AUTHORITY? Yes: fixtures are observation recordings;
  canonical objects, events, and taxonomy stay with their owners.
- WHAT DATA DOES IT OWN? None: fixtures hold sanitized recordings only.
- WHAT FAILS IF IT DISAPPEARS? Lab tests stop running; production is
  unaffected (the lab is not in the hot path).
- COST AT 10 / 1,000 / 100,000 FYDs? Zero marginal: no service, no per-call
  cost, no hosted anything.

Verdict: ADOPT the lab itself (own code, no vendor). No vendor adoption
recommended; nothing to gate.

## CODE WE DO NOT NEED TO WRITE

HTTP interception layers, mock servers, persister plugins, YAML cassette
parsers, request-matching DSLs, recording proxies. The ecosystem already
proved these mechanisms; we took the mechanism (cassettes) and skipped the
machinery.

## MINIMAL PING WRAPPER

None needed: there is no vendored dependency to wrap. The lab IS the minimal
implementation: `transport.mjs` (replay + injection), `harness.mjs` (generic
ingestion mechanisms), `assert.mjs`, `run.mjs`.

## FAILURE TEST

- All 5 fixtures PASS on the reference harness; each was verified to FAIL
  when the mechanism is broken (error/drop injection breaks `expect`,
  proving non-tautological assertions).
- Digest mismatch fails closed (runner refuses to replay drifted fixtures).
- Order violation fails closed (harness requesting an unrecorded path).
- Webhook reorder (3 seeds) still passes: order-independence proven.

## PRODUCT CAPABILITY UNLOCKED

PRODUCTION FAILURE → FIXTURE → REGRESSION TEST → GENERIC FIX becomes a
mechanical loop any lane can run. The GitHub connector (lane CONN) already
has its first regression fixture and a contract-shaped reader replayed
against it (`lab/evidence/github-replay-report.json`).

## BYTES-DEPENDENCY COST

~700 lines of new code across 4 runner modules + 1 replay script, 5 fixture
JSON files (~15 KB total). Zero dependencies. Zero services. Zero recurring
cost.
