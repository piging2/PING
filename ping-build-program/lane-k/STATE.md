# LANE K -- Standardized Failure Taxonomy

## Status: PROVEN (v1.0.0 published 2026-09-23; conformance test green 225/225, red-team verified)

## Mission
No connector invents its own errors. Agents must reason over failures from every connector
through ONE classification so retry/dead-letter/alert decisions are deterministic.

## Ledger
- [RESEARCHED] PING error conventions read-only (2026-09-23):
  - `src/lib/ping/ping-object-reader.ts`: `PingReaderError` (code: string, message, HTTP status default 502)
    with subclasses `GatewayNotConfiguredError`, `GatewayUnreachableError`,
    `GatewayNotReadyError`, `IdentityNotFoundError`, `ObjectNotFoundError`,
    `BadRequestError`, `SigningNotAvailableError`, plus inline codes
    (e.g. `GATEWAY_REJECTED_WRITE`).
  - `src/lib/ping/api-errors.ts`: `readerErrorResponse()` maps to `{ error: { code, message } }` with the
    explicit rule "nothing is faked when the gateway is unavailable" -- this is the existing
    precedent for the never-silent-empty-failure invariant.
  - `git log --all -i --grep='error'` / `--grep='retry|failure|taxonomy'`: no prior taxonomy;
    only scattered fix commits (e.g. lane-a "map corrupt-projection throw to structured 503").
  - Conclusion: PING has a code-carrying error class for the gateway reader only. Connectors have
    no shared convention. The new taxonomy fills that gap; existing codes MAP to it (see
    FAILURE-TAXONOMY.md section 5) rather than being replaced.
- [RESEARCHED] Ecosystem conventions (2026-09-23, web search, verified citations):
  - Airbyte CDK (declarative + destinations): three FailureType values -- `config_error` (no retry,
    user-fixable: bad creds, permissions, invalid config), `transient_error` (retry with backoff:
    network timeout, DB unavailable), `system_error` (limited retry, likely bug).
  - Airbyte GitHub connector changelog (real-world failure taxonomy bugs): rate-limit exhaustion
    classified as transient with capped max-wait; 403 permission errors previously misclassified
    as retryable caused infinite retry loops; silent error swallowing in stream exception handlers
    fixed. These are EXACTLY the mistakes this taxonomy prevents.
  - gRPC canonical codes used for mapping: UNAUTHENTICATED/16, PERMISSION_DENIED/7,
    RESOURCE_EXHAUSTED/8, DEADLINE_EXCEEDED/4, UNAVAILABLE/14, ABORTED/10, INVALID_ARGUMENT/3,
    NOT_FOUND/5, ALREADY_EXISTS/6, UNIMPLEMENTED/12, INTERNAL/13, FAILED_PRECONDITION/9.
- [IMPLEMENTED] `~/workspace/ping-build-program/lane-k/FAILURE-TAXONOMY.md` v1.0.0: 13 failure classes with
  exact semantics, retry/dead-letter policy, required evidence, connector prohibitions,
  agent-reasoning guidance, HTTP/gRPC/provider mappings; failure RECORD format; the
  infrastructure-failure-vs-empty-result invariant; section 8 taxonomy governance (drift
  rejection protocol + semver policy); Appendix A: 10-scenario adversarial review;
  Appendix B: decision tree; Appendix C: 3 program-history failures re-classified with
  machine actions (FL-20260920-015 host-sleep kill -> TIMEOUT side_effect_unknown quarantine;
  FL-20260919-011/012 stale narrative -> SOURCE_UNAVAILABLE environment + correction protocol;
  FL-20260919-003 unknown execution -> TIMEOUT side_effect_unknown quarantine).
  One evidence-driven deviation from Nolan's seed: UNSUPPORTED added (405/501) after the
  ecosystem search proved "operation not offered" is misclassified without its own class.
- [TESTED] `conformance-check.py` (self-contained, zero deps): 225/225 checks pass on the spec
  self-check + `conformance-fixtures.jsonl` (5 valid records incl. the FL-20260919-003 TIMEOUT
  quarantine fixture). Red-team adversarial file: all 5 attack patterns caught and reported
  (auth-as-TRANSIENT, drifted class name RATE_LIMIT, secret in detail_redacted, PERMANENT not
  terminal, non-idempotent TIMEOUT without side_effect_unknown); exit 1 on any violation,
  exit 0 clean. Any connector can run `python3 conformance-check.py records.jsonl`.
- [PROVEN] BCQ's contract test kit (`lane-bcq/testkit/contract.py`) already carries all 13
  ErrorClass values incl. UNSUPPORTED 2.9, aligned to this spec; lane K named as canonical owner.
- [NEXT] Lanes J (observability) consume failure records; lane M (source registry) stores
  per-source failure counts keyed by class + environment-degraded state; lane R owns
  failure-injection fixtures per misclassification pattern. No further lane-K work until a
  drift proposal arrives per section 8 governance.

## Conventions noted for the coordinator
- Existing `PingReaderError` codes are NOT renamed. New connectors use this taxonomy; gateway-reader
  code maps onto it via the mapping table in the spec.
- Lane M (source registry) should store per-source failure counts keyed by class; lane J
  (observability) consumes failure records; lane R owns failure-injection fixtures for the test kit.
- Announcement for BCQ/CONN/R: taxonomy v1.0.0 is PUBLISHED at
  `~/workspace/ping-build-program/lane-k/FAILURE-TAXONOMY.md` (this is the announcement).
  Conformance checker at `~/workspace/ping-build-program/lane-k/conformance-check.py`
  (usage: `python3 conformance-check.py` for spec self-check + built-in fixtures, or
  `python3 conformance-check.py <records.jsonl>` to validate your connector's records;
  exit 1 = conformance failure). Test kit may shell out to it or mirror its assertions.
