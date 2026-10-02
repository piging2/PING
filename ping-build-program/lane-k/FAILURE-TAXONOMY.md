# FAILURE-TAXONOMY.md -- PING Connector Failure Taxonomy **v1.0.0**

**Status:** v1.0.0 canonical. Published 2026-09-23 (lane K). Single canonical
classification for every connector error. No connector invents its own errors.
Connector data is OBSERVATION; a failure record is EVIDENCE, not canonical truth.

**Version notes:** v1.0.0 adopts Nolan's 12-class seed list with ONE evidence-driven
refinement: `UNSUPPORTED` (section 2.9) was added after the ecosystem search showed
405/501 "operation not offered" is routinely misclassified as SOURCE_CHANGED,
PERMANENT, or a bug, and each misclassification drives the wrong machine action
(sections 2.9 and Appendix A scenarios show the split). Every other class is the
seed list verbatim. Any future change follows the governance rule in section 8.

**Consumers:** connector contract test kit (sibling BCQ-TESTKIT lane -- THIS SPEC IS ITS
CLASSIFICATION SOURCE OF TRUTH), source registry (lane M), observability (lane J),
replay fixtures (lane R), agents reasoning over failed fetches.

**Alignment with existing PING conventions:** PING already carries `PingReaderError`
(code + message + HTTP status) for the gateway reader with the rule "nothing is faked when
the gateway is unavailable" (`src/lib/ping/ping-object-reader.ts`, `src/lib/ping/api-errors.ts`).
This taxonomy EXTENDS that principle to connectors. Existing codes map onto classes
(section 5); nothing existing is renamed.

---

## 1. Core principles

1. **Closed set.** Exactly 13 classes. Any error a connector raises must be assigned one class
   at the throw site. `UNKNOWN` is not a class; unrecognized provider behavior classifies as
   TRANSIENT with `original_signal: "unrecognized"` until classified, never as a silent pass.
2. **Class is assigned by meaning, not by code.** The same HTTP 403 can be RATE_LIMITED
   (GitHub secondary limit with `Retry-After`) or PERMISSION_DENIED (missing scope). The
   connector must inspect provider-native signals (headers, error codes, response bodies)
   and pick the class whose MEANING matches. Section 2 gives disambiguation rules.
3. **Failure records are first-class output.** A failed fetch ALWAYS produces a failure record
   (section 4) and NEVER produces an empty success. Downstream (agents, canonical pipeline)
   distinguishes "no data existed" (legitimate empty result, normal path) from "fetch failed"
   (failure record, retried or dead-lettered).
4. **Retry policy is per-class, not per-connector.** The engine reads the class and applies
   the policy from this spec. A connector must not override retry semantics; it only assigns
   the class honestly.
5. **Auth failures are not retryable.** AUTH_REQUIRED, AUTH_EXPIRED, and PERMISSION_DENIED
   terminate the attempt stream and notify the operator. Retrying auth failures is a
   rate-limit accelerator and an abuse signal.

---

## 2. The 13 classes

Class names are SCREAMING_SNAKE strings. Each entry: meaning, retryable?, backoff/dead-letter,
required evidence, connector MUST NOTs, agent reasoning guidance, code mappings.

### 2.1 AUTH_REQUIRED
- **Exact meaning:** No usable credential is present for this source (missing token, empty
  client id, connection never configured). The fetch never reached the provider.
- **Retryable?** No. Retrying without a new credential is guaranteed-futile.
- **Policy:** Halt attempt stream for this source. Surface to operator ("credential missing").
  Dead-letter with the original attempted operation. Resume only after new credential signal.
- **Evidence required:** connector name, source id, credential handle reference (NOT the
  credential), which credential slot was missing, operation attempted.
- **MUST NOT:** Must not retry. Must not fall back to a different source silently. Must not
  fabricate an anonymous request. Must not log or include the credential.
- **Agent reasoning:** This is an operator action item, not a data problem. Explain what
  credential is missing and where to provide it; do not speculate about the provider's state.
- **Mappings:** gRPC UNAUTHENTICATED(16) when provider says "no auth provided"; Nango
  `connection_missing` style signals; Airbyte `config_error`.

### 2.2 AUTH_EXPIRED
- **Exact meaning:** A credential WAS present but is now rejected as expired, revoked, or
  rotated: token expired, refresh token invalid, API key deactivated, OAuth scope revoked
  by user.
- **Retryable?** No, unless the connector owns a refresh flow: at most ONE refresh attempt,
  then re-attempt once; a second AUTH_EXPIRED means the refresh itself failed. Refresh-attempt
  count is recorded.
- **Policy:** Attempt refresh once (if the connector has one) -> re-try once. On failure: halt,
  surface to operator ("re-authenticate"), dead-letter. Do not loop refresh.
- **Evidence required:** credential handle ref, whether refresh was attempted and its
  outcome, provider-native error code (e.g. `invalid_grant`, `expired_token`), timestamp
  the credential last worked (if known).
- **MUST NOT:** Must not be classified as TRANSIENT ("maybe it works next time"). Must not
  retry more than once after a refresh. Must not fall back to stored data without marking
  the result as STALE.
- **Agent reasoning:** Distinguish expired (refreshable) from revoked (needs human). If the
  provider's error says revoked/invalid_grant and refresh fails once, tell the operator to
  re-authorize; the agent cannot fix this.
- **Mappings:** HTTP 401 with expired/revoked semantics; gRPC UNAUTHENTICATED(16);
  OAuth2 `invalid_grant`; Airbyte `config_error` (Airbyte GitHub changelog notes
  OAuth scope fixes live here).

### 2.3 PERMISSION_DENIED
- **Exact meaning:** Authentication succeeded but the identity lacks permission for this
  operation: missing scope, role too low, resource-level ACL block, org policy restriction.
- **Retryable?** No. Retrying cannot grant permission; looping here is how Airbyte's GitHub
  connector got infinite retry loops on 403s (fixed 2026-04-15).
- **Policy:** Halt, surface to operator with the exact missing permission if the provider
  named it. Dead-letter. Resume only after permission change signal.
- **Evidence required:** authenticated identity (account/email, not secret), operation,
  provider-native permission signal (e.g. `403 insufficient_scope`, missing scope list).
- **MUST NOT:** Must not be classified as RATE_LIMITED just because it is a 403 (403 is the
  most misclassified status in connector history; disambiguate with provider signals first).
  Must not escalate credentials to gain access. Must not probe other endpoints to "find"
  what works (that is a security scan, not a fetch).
- **Agent reasoning:** Tell the operator exactly which permission/scope is missing and who
  grants it. Do not retry, do not work around.
- **Mappings:** HTTP 403 (non-rate-limit), 401 with valid-but-unauthorized semantics;
  gRPC PERMISSION_DENIED(7); GitHub `Resource not accessible by integration`;
  Airbyte `config_error`.

### 2.4 RATE_LIMITED
- **Exact meaning:** The provider throttled the request: quota exceeded, rate window hit,
  concurrency cap, or a 429/secondary-limit response.
- **Retryable?** Yes, with provider-directed wait.
- **Policy:** Honor `Retry-After` / `X-RateLimit-Reset` / `RateLimit-Reset` if present;
  otherwise exponential backoff (base 60s, jitter, cap 120 min) matching provider window
  norms. Record reset time. If retries exceed max-wait budget, dead-letter with
  `limit_window_unknown` or known reset time; the engine resumes after reset. NEVER loop
  tight (this is what turns a throttle into an account strike).
- **Evidence required:** which limit was hit (per-minute/per-hour/per-token if known),
  retry-after value, reset timestamp, tokens/attempts consumed before throttle.
- **MUST NOT:** Must not classify 403 rate limits as PERMISSION_DENIED (check rate-limit
  headers FIRST on every 403: GitHub 403s from secondary limits carry
  `X-RateLimit-Remaining: 0`). Must not retry immediately. Must not open parallel
  requests to dodge the limit.
- **Agent reasoning:** This is normal provider behavior, not a bug. Report "rate limited,
  resuming at <time>" -- do not escalate, do not alert, do not switch connectors.
- **Mappings:** HTTP 429, 403/503 with rate-limit headers; gRPC RESOURCE_EXHAUSTED(8);
  provider-native: GitHub `rate limit exceeded`, Shopify `429` with `Retry-After`,
  Google `quotaExceeded`.

### 2.5 SOURCE_UNAVAILABLE
- **Exact meaning:** The provider itself is down, unreachable, or degraded: DNS failure,
  connection refused, 500/502/503/504 from the provider, maintenance page, status-page
  incident. The credential and request were fine; the provider could not serve.
- **Retryable?** Yes, with backoff (base 30s, jitter, cap 10 min, up to N attempts per
  run budget). Cross-run: mark source degraded; lane M (source registry) health drops.
- **Policy:** Retry per budget; then dead-letter and mark source degraded so other
  connectors to the same provider back off too (shared provider health in the registry).
- **Evidence required:** endpoint attempted, transport signal (DNS/connect/TLS/HTTP status),
  any provider status/incident reference, latency to failure.
- **MUST NOT:** Must not treat as AUTH_* (down does not mean unauthorized). Must not
  mark the source permanently dead from one run. Must not cache a "no data" result from
  this failure.
- **Agent reasoning:** "Provider is down" is a fact about the world, not about the request.
  Report the outage, retry later; do not change credentials or permissions in response.
- **Mappings:** HTTP 500/502/503/504, DNS/TCP/TLS failures, timeouts on CONNECT;
  gRPC UNAVAILABLE(14), INTERNAL(13) (provider-side); Airbyte `transient_error`.

### 2.6 SOURCE_CHANGED
- **Exact meaning:** The provider changed something about the SOURCE that breaks the
  connector's assumptions: endpoint moved/retired, API version sunset, resource renamed,
  pagination scheme changed, auth scheme changed by the provider (e.g. basic auth retired).
  The provider works; OUR understanding of it is stale.
- **Retryable?** No. Retrying a retired endpoint is futile; this needs a connector update.
- **Policy:** Dead-letter immediately. Flag for connector maintenance. If the provider
  advertised a migration path (new version, new endpoint), record it as
  `migration_hint` -- but the connector must not auto-migrate without a code change and test.
- **Evidence required:** what changed (endpoint/version/scheme), provider's deprecation
  notice or changelog reference if found, last-known-working version/date.
- **MUST NOT:** Must not retry. Must not silently re-point at a different endpoint or
  scrape the same data from another URL (that is a new connector, not a retry). Must not
  present partial data from the old shape as if complete.
- **Agent reasoning:** This is a connector-maintenance task for a human/developer, not an
  operator action. File it as tech debt with the migration hint.
- **Mappings:** HTTP 404/410 on a previously valid endpoint, `410 Gone`,
  `Sunset` header; gRPC NOT_FOUND(5)/UNIMPLEMENTED(12) on a previously valid method.

### 2.7 SCHEMA_CHANGED
- **Exact meaning:** The provider's RESPONSE SHAPE changed: field removed/renamed/retyped,
  nesting changed, enum values new, required field now missing, payload no longer parses
  against the connector's contract.
- **Retryable?** No. The data will not reshape itself on retry.
- **Policy:** Dead-letter the batch; quarantine the raw payload (as evidence, with PII
  minimization) for the schema-mapping update. Halt the stream until the contract is
  updated -- do not continue ingesting mis-shaped records.
- **Evidence required:** expected field vs. actual payload diff (field paths, types),
  raw payload sample (redacted of PII/secrets), schema contract version that failed,
  first record where the break was detected.
- **MUST NOT:** Must not coerce, guess, or drop fields silently and continue ("best effort
  parse" is how schema drift becomes canonical corruption). Must not retry hoping for the
  old shape. Must not treat as INVALID_PAYLOAD (that class is for OUR malformed request,
  not THEIR changed response).
- **Agent reasoning:** Halt is protective. Report which field broke and what the new shape
  looks like; a human updates the contract, then the stream resumes from the checkpoint.
- **Mappings:** JSON schema validation failure against the connector's declared contract;
  gRPC DATA_LOSS(15) on corrupt stream framing; no HTTP status maps cleanly (this is
  payload-level, usually a 200).

### 2.8 INVALID_PAYLOAD
- **Exact meaning:** OUR request was malformed and the provider correctly rejected it:
  missing required parameter, bad cursor value, invalid filter syntax, type error in our
  query, oversized request.
- **Retryable?** No. The same request will fail identically.
- **Policy:** Dead-letter immediately with the exact request and the provider's rejection.
  This is a connector BUG (or a bad upstream input) -- file as such. Do not retry, do not
  mutate the request and try variants (that is fuzzing the provider).
- **Evidence required:** the exact request sent (redacted of credentials), provider's
  validation error verbatim, which parameter failed validation.
- **MUST NOT:** Must not retry. Must not "fix" the request by guessing (e.g. trimming
  parameters, changing types) -- that changes semantics. Must not blame the provider.
- **Agent reasoning:** This is a bug in the connector or in what the agent asked for.
  Surface the provider's validation message verbatim; fix the request, don't resend it.
- **Mappings:** HTTP 400, 422, 414; gRPC INVALID_ARGUMENT(3), FAILED_PRECONDITION(9).

### 2.9 UNSUPPORTED
- **Exact meaning:** The operation is valid but the provider does not support it: unimplemented
  endpoint, stream not available on this plan tier, feature flag off, method not allowed for
  this resource type. NOT a bug; the provider simply does not offer it.
- **Retryable?** No.
- **Policy:** Dead-letter. Mark the capability unsupported for this source so the planner
  (lane S) stops offering it. This is a discovery result, not an error to fix.
- **Evidence required:** operation, provider's "not supported" signal, plan tier / feature
  flag state if relevant.
- **MUST NOT:** Must not retry on a schedule "in case they add it" (re-check belongs in
  discovery cadence, not the attempt stream). Must not emulate the feature by scraping.
- **Agent reasoning:** Update the capability model: this source does not do that. Move on.
- **Mappings:** HTTP 404 on an operation (never previously valid -- else SOURCE_CHANGED),
  405, 501; gRPC UNIMPLEMENTED(12); Airbyte-style `system_error` is WRONG here -- this is
  not a bug.

### 2.10 CONFLICT
- **Exact meaning:** Concurrent modification: version/etag mismatch, optimistic-lock failure,
  duplicate delivery, another writer changed the record, cursor advanced by another consumer.
- **Retryable?** Once, after re-reading current state. If the second attempt also conflicts,
  dead-letter (a second conflict means real contention, not a race).
- **Policy:** Re-read the current state, re-apply the operation deterministically
  (idempotency key required), retry at most once. Then dead-letter with both versions
  recorded. Duplicate-delivery safety (idempotency keys) makes the retry safe.
- **Evidence required:** expected version/etag vs. actual, idempotency key used,
  both record versions (hashes, not full bodies if large).
- **MUST NOT:** Must not retry more than once (unbounded conflict retry is a live-lock).
  Must not "last write wins" silently -- the losing write is recorded as a conflict event.
  Must not treat as TRANSIENT (it is not environmental; it is coordination).
- **Agent reasoning:** Two writers touched the same thing. Re-read, merge consciously,
  never silently overwrite.
- **Mappings:** HTTP 409, 412; gRPC ABORTED(10), ALREADY_EXISTS(6); ETag `If-Match` failure.

### 2.11 TIMEOUT
- **Exact meaning:** The request exceeded the connector's deadline with no conclusive
  response: socket timeout, provider slow-loris, our deadline too tight for a large page.
- **Retryable?** Yes, with caution: the request may have partially executed server-side.
- **Policy:** Retry with idempotency key attached (so a duplicated side effect collapses).
  If the operation is non-idempotent and the timeout happened after the write window,
  do NOT retry blindly: record TIMEOUT with `side_effect_unknown: true` and dead-letter
  for human reconciliation. Backoff: base 15s, jitter, cap 5 min, max 3 attempts.
- **Evidence required:** deadline configured, elapsed time, which phase timed out
  (connect / headers / body), whether the operation was idempotent, side_effect_unknown
  flag.
- **MUST NOT:** Must not retry a non-idempotent write after a timeout without the
  side_effect_unknown flag and human review (this is how duplicates are born). Must not
  classify as SOURCE_UNAVAILABLE (a slow provider is different from a down one).
- **Agent reasoning:** "We don't know if it worked" is the honest state. For reads: safe
  to retry. For writes: reconcile before re-sending.
- **Mappings:** HTTP 408, 504 (gateway timeout), socket timeout, deadline exceeded;
  gRPC DEADLINE_EXCEEDED(4).

### 2.12 TRANSIENT
- **Exact meaning:** Temporary, environmental, not otherwise classified: flaky network,
  DNS hiccup, TLS blip, brief provider wobble, container scheduling pause, or a genuinely
  unrecognized signal that is safe to retry. This is the default retryable class and the
  ONLY class an unrecognized provider signal may land in (with `original_signal` recorded).
- **Retryable?** Yes. Exponential backoff base 5s, jitter, cap 2 min, max 5 attempts per run.
- **Policy:** Retry per policy; then dead-letter. If TRANSIENT repeats across runs for the
  same source, the registry (lane M) escalates to SOURCE_UNAVAILABLE investigation --
  chronic TRANSIENT is a signal, not weather.
- **Evidence required:** the original signal verbatim (provider code, errno, exception type),
  attempt number, backoff applied.
- **MUST NOT:** Must not be used for auth failures, permission failures, or permanent
  failures ("just retry it" is the #1 cause of connector abuse incidents). Must not
  swallow the original signal -- `original_signal` is mandatory when this class is a
  fallback for unrecognized behavior.
- **Agent reasoning:** Weather, not climate. Retry, but watch: if it keeps happening, it is
  not transient anymore.
- **Mappings:** ECONNRESET, EAI_AGAIN, ENOTFOUND (transient DNS), TLS errors;
  gRPC UNAVAILABLE(14) for sub-second blips; Airbyte `transient_error`.

### 2.13 PERMANENT
- **Exact meaning:** The failure will not resolve with time or retry: resource deleted at
  the provider, account closed/suspended, feature removed for this tenant, provider
  explicitly refuses this integration, data retention expired.
- **Retryable?** Never. Must not retry. Must not backoff. Must not schedule a "check later".
- **Policy:** Dead-letter once, record the terminal evidence, mark the source (or the
  specific stream/operation) retired in the registry. Surface to operator as informational.
- **Evidence required:** provider's terminal signal verbatim (e.g. `account_suspended`,
  `resource_deleted`, `410` on a resource that was valid), timestamp.
- **MUST NOT:** Must not retry -- ever. Must not treat as SOURCE_UNAVAILABLE (down recovers;
  deleted does not). Must not keep the stream scheduled and failing (that is log spam and
  wasted budget). Must not delete local canonical data in response (the provider's
  deletion is an observation, not a command to purge our graph).
- **Agent reasoning:** This door is closed. Record it, stop knocking, move the source to
  retired. Do not "just in case" retry next week.
- **Mappings:** HTTP 404 on a resource that was valid and is now confirmed deleted, 410,
  `account_closed`; gRPC NOT_FOUND(5) with deletion semantics, PERMISSION_DENIED(7) with
  `account_suspended`; Nango `connection suspended` signals.

---

## 3. Class decision table (quick reference)

| Class | Retries? | Notify operator? | Dead-letter? | Registry effect |
|---|---|---|---|---|
| AUTH_REQUIRED | No | Yes (action needed) | Yes | mark source unauthenticated |
| AUTH_EXPIRED | 1x after refresh only | Yes (re-auth needed) | Yes | mark source unauthenticated |
| PERMISSION_DENIED | No | Yes (grant needed) | Yes | mark capability blocked |
| RATE_LIMITED | Yes, provider-directed wait | No (routine) | If over budget | none; record reset time |
| SOURCE_UNAVAILABLE | Yes, budgeted | On sustained | Yes | degrade source health |
| SOURCE_CHANGED | No | No (dev task) | Yes | flag connector maintenance |
| SCHEMA_CHANGED | No | No (dev task) | Yes + quarantine | halt stream, flag contract update |
| INVALID_PAYLOAD | No | No (dev bug) | Yes | none |
| UNSUPPORTED | No | No (discovery) | Yes | mark capability unsupported |
| CONFLICT | 1x after re-read | On 2nd conflict | Yes | none |
| TIMEOUT | Yes (idempotent) / human (non-idem) | On side_effect_unknown | Yes | none |
| TRANSIENT | Yes, capped | No | If attempts exhausted | count; chronic -> investigate |
| PERMANENT | NEVER | Informational | Yes (terminal) | retire source/stream |

**Backoff defaults** (engine-owned, connectors only assign class):
- RATE_LIMITED: honor provider headers; else base 60s, jitter, cap 120 min.
- SOURCE_UNAVAILABLE: base 30s, jitter, cap 10 min, bounded attempts per run budget.
- TIMEOUT: base 15s, jitter, cap 5 min, max 3 attempts; idempotency key mandatory for writes.
- TRANSIENT: base 5s, jitter, cap 2 min, max 5 attempts per run.
- CONFLICT: exactly 1 re-read + 1 retry, no backoff needed.
- AUTH_EXPIRED: 1 refresh + 1 retry, then halt.
- All others: no retry.

**Dead-letter guidance:** a dead-lettered failure record is preserved with full evidence,
queryable by lane J observability, and re-driveable ONLY by explicit operator action or a
resolved-dependency signal (new credential, permission granted, connector updated) -- never
by the passage of time alone, except RATE_LIMITED after its reset timestamp.

---

## 4. Failure RECORD format

Every failed fetch emits exactly one record. The record is evidence attached to the
observability stream (lane J); it is never written into canonical objects as truth.

```json
{
  "record_type": "ping.connector.failure.v1",
  "class": "RATE_LIMITED",
  "connector": "github-connector",
  "connector_version": "0.3.1",
  "source_id": "src_github_nolan",
  "operation": "list_issues",
  "stream": "issues",
  "attempt": 3,
  "max_attempts": 5,
  "started_at": "2026-09-23T19:40:00.123Z",
  "failed_at": "2026-09-23T19:40:02.456Z",
  "duration_ms": 2333,
  "retry_policy_applied": { "backoff_ms": 5000, "next_attempt_at": "2026-09-23T19:40:07Z" },
  "provider_signal": {
    "http_status": 429,
    "headers_redacted": { "retry-after": "60", "x-ratelimit-reset": "1695506400" },
    "native_code": "rate limit exceeded",
    "original_signal": null
  },
  "evidence_refs": ["obs://run-20260923-1940/attempt-3-response-headers"],
  "detail_redacted": "Rate limit hit on search API (30 req/min tier); reset at 1695506400. No credentials in this record.",
  "credential_handle": "credref:github:nolan:oauth",
  "terminal": false,
  "dead_lettered": false
}
```

**Field rules:**
- `class`: one of the 13, exact SCREAMING_SNAKE string. Required. Never empty, never custom.
- `connector`, `connector_version`, `source_id`, `operation`: identify WHAT failed. Required.
- `attempt`, `max_attempts`: attempt numbering starts at 1. Required.
- `started_at`, `failed_at` (ISO-8601 UTC), `duration_ms`: required. These are the record's
  own timestamps; do not confuse with event/observation timestamps.
- `provider_signal`: the raw provider signal, redacted. Required: at least `http_status`
  OR `native_code` OR (for transport failures) `errno`. `original_signal` is REQUIRED when
  class is TRANSIENT-by-fallback.
- `evidence_refs`: pointers to quarantined raw payloads/headers in the evidence store.
  Raw payloads with PII live behind these refs, never inline.
- `detail_redacted`: human-readable summary. MUST NOT contain secrets: no tokens, API keys,
  passwords, full credentials, session cookies, or PII beyond what the operator already
  knows (account email is allowed; the credential itself is not). When in doubt, replace
  with `credref:<provider>:<account>:<type>`.
- `credential_handle`: opaque reference only (lane L secret broker owns the handle scheme).
  The handle proves which credential was used without exposing it.
- `terminal`: true when the engine will not retry (non-retryable classes, exhausted budget).
- `dead_lettered`: true when the record moved to the dead-letter set.
- **What must NEVER appear:** raw secrets of any kind; full request bodies containing
  customer PII; anything the secret broker (lane L) would classify as a capability handle.

---

## 5. Mapping from existing PING error codes

| Existing code (`PingReaderError`) | Maps to | Notes |
|---|---|---|
| `GATEWAY_NOT_CONFIGURED` | PERMANENT | Gateway missing is a deployment state, not a retry target |
| `GATEWAY_UNREACHABLE` | SOURCE_UNAVAILABLE | Retry with backoff; registry degrades gateway health |
| `GATEWAY_NOT_READY` | TRANSIENT | Expected to resolve; capped retries |
| `IDENTITY_NOT_FOUND` | PERMANENT | Identity does not exist; will not appear on retry |
| `OBJECT_NOT_FOUND` | PERMANENT (or CONFLICT if a concurrent delete is suspected) | A read for a nonexistent object is terminal |
| `BAD_REQUEST` | INVALID_PAYLOAD | Our request was malformed |
| `SIGNING_NOT_AVAILABLE` | PERMANENT | Signer absent; operator/dev action required |
| `GATEWAY_REJECTED_WRITE` | INVALID_PAYLOAD or CONFLICT | Disambiguate by provider signal |

The gateway-reader codes stay as-is (they are BFF-facing). Connectors use the 13 classes.
Where a connector wraps the gateway reader, it translates using this table.

---

## 6. The never-silent-empty-failure invariant

**A failed fetch must NEVER become a silent empty success.**

- The connector's return contract is: `Result<Records, FailureRecord>` -- either records
  (possibly legitimately zero, with the normal "empty result" path documented) or exactly
  one failure record. There is no third outcome.
- "Zero records returned" from a SUCCESSFUL fetch means "the provider had nothing" --
  a legitimate empty result, recorded as an observation with `record_count: 0`.
- "Zero records returned" from a FAILED fetch is a bug: the exception handler must emit
  the failure record before returning. Empty catch blocks, `except: pass`, and
  `.get(key, [])` defaults on failed responses are FORBIDDEN at the connector boundary.
- If a stream is skipped (e.g. Airbyte-style skip-the-slice on 410), the skip is itself a
  recorded decision with its class (UNSUPPORTED or PERMANENT), not a silent omission.
- Agents: when you see zero records, ALWAYS check whether a failure record exists for the
  same operation+window. Zero records + no failure record = provider genuinely empty.
  Zero records + failure record = fetch failed; do not reason as if the data were empty.

---

## 7. Agent reasoning guidance (how to read a failure)

1. Read `class` first; it determines the response. Do not re-diagnose from the raw message.
2. AUTH_*/PERMISSION_DENIED: operator action. State exactly what is missing and who provides it.
3. RATE_LIMITED/TRANSIENT/TIMEOUT(read)/SOURCE_UNAVAILABLE: wait or retry per policy.
   Report status, not alarm. Do not escalate routine throttles.
4. SOURCE_CHANGED/SCHEMA_CHANGED/INVALID_PAYLOAD: developer action. Describe the diff
   precisely (what changed, expected vs actual); do not guess a fix in the message.
5. UNSUPPORTED: update the capability model; stop offering the operation for this source.
6. CONFLICT: re-read before acting; never silently overwrite the losing write.
7. PERMANENT: close the door. Retire the stream/source in the registry; do not schedule
   "one more check."
8. Never infer a business conclusion from a failure record. "No issues found" requires a
   successful fetch with zero records, not a failed fetch.

---

## 8. Taxonomy governance (taxonomy drift rejection)

A lane that adds its own failure code is inventing a second taxonomy. The drift
rejection protocol:

1. **Closed set is closed.** Any error carrying a `class` outside the 13 fails the
   conformance check (see `conformance-check.py`) and the BCQ contract test kit
   rejects the connector. The rejection pointer is: "class `<X>` is not in the
   canonical taxonomy; see FAILURE-TAXONOMY.md section 2 and Appendix B. If none
   of the 13 fits, the scenario goes to lane K with evidence, not into your code."
2. **Proposing a change.** A lane may propose a 14th class, a class split, or a
   semantics change ONLY with: (a) three real observed failures that no existing
   class handles without misdriving retry/escalation; (b) the exact retry policy,
   evidence list, and anti-examples for the proposed class; (c) proof that the
   nearest existing class drives the WRONG machine action on those three.
   Lane K decides. No unilateral additions, ever.
3. **Versioning.** PATCH (x.y.Z): clarifications, new mappings, new Appendix A/B
   scenarios; connector code needs no change. MINOR (x.Y.0): a new class with
   lane-K approval; connectors get a migration window; test kit warns before it
   fails. MAJOR (X.0.0): any retry/escalation semantics change to an existing
   class. This spec is 1.0.0.
4. **Misclassification is a bug, not a style choice.** A connector that emits
   PERMANENT-as-TRANSIENT, AUTH_EXPIRED-as-TRANSIENT, or a code without evidence
   fails conformance the same way a wrong HTTP status fails an API contract.
   Lane R owns failure-injection fixtures so each misclassification pattern is
   regression-tested.

## Appendix A: Adversarial review -- 10 tricky scenarios

Each scenario was constructed to sit on a class boundary. Classification must be unambiguous.

1. **GitHub returns 403 with `X-RateLimit-Remaining: 0` and body "API rate limit exceeded
   for user".** -> RATE_LIMITED. Rule: check rate-limit headers BEFORE treating any 403 as
   permission. (This is the Airbyte infinite-loop bug: classifying it as PERMISSION_DENIED
   or retrying blindly are both wrong; honor the reset.)

2. **GitHub returns 403 with `X-RateLimit-Remaining: 58` and body "Resource not accessible
   by integration".** -> PERMISSION_DENIED. Rule: same status, opposite meaning; the
   remaining-quota header disambiguates. No retry, surface the missing scope.

3. **OAuth token works for 6 hours then a call returns 401 `invalid_token`; the connector's
   refresh succeeds and the retry works.** -> AUTH_EXPIRED (not TRANSIENT, not a retry of
   the same credential). Evidence records one refresh attempt with success. If the refresh
   had failed -> halt, operator re-auth.

4. **Provider returns 200 OK but the JSON has `items` renamed to `results` and `price`
   changed from string to number.** -> SCHEMA_CHANGED. Rule: 200 with a broken shape is
   not a success; quarantine the payload, halt the stream, do not coerce.

5. **Provider returns 200 OK with `{"items": []}` for a query that historically returned
   data.** -> Legitimate empty result, NOT a failure at all. No failure record. The agent
   may note the anomaly, but the fetch succeeded. (Contrast with scenario 4.)

6. **DNS resolves, TCP connects, then the socket hangs for 90s past the 30s deadline on a
   POST that creates a record; the POST is not idempotent.** -> TIMEOUT with
   `side_effect_unknown: true`. Do NOT retry blindly; dead-letter for human reconciliation.
   If the same timeout hit a GET -> safe retry with backoff.

7. **The connector sends a cursor from last run; the provider returns 400
   "invalid cursor: must be RFC3339".** -> INVALID_PAYLOAD. Our request was malformed
   (bad stored cursor). Fix the cursor, do not retry the same value. (Not SOURCE_CHANGED:
   the provider's contract is unchanged; our stored state is bad.)

8. **Shopify app was uninstalled by the merchant; calls return 401 `invalid_api_key`.**
   -> PERMANENT, not AUTH_EXPIRED. The credential is not expired, the authorization
   relationship is gone; refresh would loop forever. Evidence: uninstall webhook or
   repeated 401 post-refresh. Retire the source.

9. **Two connector runs overlap; run B writes a checkpoint cursor that run A then
   overwrites with a stale value; the next fetch returns 409 on checkpoint commit.**
   -> CONFLICT. Re-read current checkpoint, re-apply deterministically, retry once.
   A second 409 -> dead-letter (real contention, likely a second writer exists).

10. **Provider sunsets v1 API: `/v1/orders` now returns 410 with `Sunset: Sat, 01 Nov 2025`
    and a link to `/v2/orders` migration guide.** -> SOURCE_CHANGED, not PERMANENT (the
    provider and data still exist; our endpoint knowledge is stale) and not UNSUPPORTED
    (the operation IS supported, at a new address). Dead-letter, record `migration_hint`,
    flag connector maintenance. The connector must not auto-repoint to /v2 without a code
    change and test.

All 10 classify unambiguously under the disambiguation rules in section 2.

---

## Appendix B: Classification decision tree

```
Did we have a usable credential?
  No  -> AUTH_REQUIRED
  Yes, but rejected as expired/revoked (401 invalid_token/expired/invalid_grant)?
    -> AUTH_EXPIRED (one refresh + one retry max)
    BUT: rejected because the grant itself is gone (uninstall, revoked app)?
    -> PERMANENT
Did auth succeed but the operation is forbidden?
  Check rate-limit headers FIRST:
    throttled? -> RATE_LIMITED
    else -> PERMISSION_DENIED
Did the request reach the provider?
  No (DNS/connect/TLS/5xx/timeout-on-connect) -> SOURCE_UNAVAILABLE
  Yes:
    Did the provider throttle us (429, rate-limit headers, quota errors)? -> RATE_LIMITED
    Did our request time out with no conclusive response? -> TIMEOUT
    Was our request malformed (400/422, bad params)? -> INVALID_PAYLOAD
    Did the response shape break our contract (usually 200)? -> SCHEMA_CHANGED
    Did a previously-valid endpoint/version disappear (404/410/Sunset)? -> SOURCE_CHANGED
    Is the operation simply not offered (405/501, never worked)? -> UNSUPPORTED
    Concurrent write collision (409/412/etag mismatch)? -> CONFLICT
    Is it gone forever (deleted account/resource, terminal refusal)? -> PERMANENT
    None of the above / unrecognized signal? -> TRANSIENT (record original_signal, capped retries)
```

---

## Appendix C: Proof -- three real program-history failures, classified exactly

These are not hypotheticals. Each happened in this program's own history, was
recorded in a prior lane, and is re-classified here under v1.0.0 to prove the
taxonomy drives the correct machine action.

### C.1 Host sleep destroying browser targets mid-run

**What happened (evidence):** `~/memory/2026-09-22.md` line 1043 records that host
sleep destroyed browser targets during engagement passes; the durable response was
`powercfg` AC standby timeout 0. The concrete instance: Facebook Pass 79
(dispatched 14:26 MDT 2026-09-20): the ~16:00 MDT commute blackout killed the
dispatch/worker mid-pass. Recorded as FL-20260920-015: 60 intents left
UNKNOWN_EXECUTION (neither EXECUTED nor NOT_ATTEMPTED provable); the refuse filter
quarantines those candidates on later passes. TEMPORARY_FAILURE was the ledger's
best available label at the time.

**v1.0.0 classification:** **TIMEOUT** with `side_effect_unknown: true`,
terminal=true, dead_lettered=true (quarantine). The engagement actions are
non-idempotent: a like/DM may have partially executed before the target died, and
no conclusive response exists.

**Machine action driven:** No blind retry (retrying non-idempotent actions with
unknown side effects creates duplicates; section 2.11). The 60 intents quarantine
and are refused on later passes pending worker inspection. Escalation: the local
execution ENVIRONMENT is marked degraded in the registry and scheduling is
inhibited until the host is healthy; the durable fix was infrastructure
(powercfg), not retry policy.

**What it is NOT:** Not TRANSIENT-with-blind-retry (that re-fires 60 engagement
actions and births duplicates). Not SOURCE_UNAVAILABLE (the provider was fine;
OUR environment died; degrading the provider in the registry would be wrong).

### C.2 Stale narrative overriding canonical state

**What happened (evidence):** FL-20260919-011 recorded the heartbeat's 15:26 MDT
readings as DEPENDENCY_FAILURE on docker/postgres/gateway ("down", "bad missing").
Read-only forensics (FL-20260919-012) proved the containers were Up 42h/46h with
zero restarts: the readings were cascade artifacts of the dead WSL probe
transport. The monitor's narrative (services down) overrode canonical state
(services up). The entry was SUPERSEDED, not deleted.

**v1.0.0 classification of the incident:** **SOURCE_UNAVAILABLE** -- the execution
environment (the WSL transport that probes AND browser targets rode on) was down.
Retryable per budget; registry degrades the ENVIRONMENT, not the individual
services. The original per-service DOWN signals were a misclassification: their
true meaning was "probe transport dead."

**Machine action driven:** The correction protocol (sections 1 and 4): emit a
CORRECTION record referencing the original record IDs; never silently overwrite.
A wrong class drives wrong machine action -- service-DOWN would have triggered
service restarts (harmless but useless); environment-SOURCE_UNAVAILABLE triggers
environment recovery (free disk space, restart the distro) and inhibits
scheduling until the transport is healthy. Evidence refs must include the probe
vantage point so a vantage failure cannot masquerade as a service failure again.

**What it is NOT:** Not PERMANENT (nothing was dead). Not three independent
dependency failures (one transport failure, three cascade readings).

### C.3 Unknown effect after interruption

**What happened (evidence):** FL-20260919-003: Facebook Pass 72
(pass_id fb-20260919-202814), 39 intents left UNKNOWN_EXECUTION; "execution state
unknowable from available evidence." Quarantined, never a retry candidate; do not
retry; inspect the Pig worker/result before another Facebook job.

**v1.0.0 classification:** **TIMEOUT** with `side_effect_unknown: true`,
terminal=true, dead_lettered=true (quarantine). 39 non-idempotent engagement
intents interrupted mid-flight; some may have landed.

**Machine action driven:** Quarantine. The refuse filter blocks those candidates
on later passes. Operator inspects the worker evidence before resuming. No
auto-retry ever: blind retry of 39 unknown-execution engagement actions risks
duplicate sends and duplicate DMs (section 2.11: "this is how duplicates are born").
This is the same machine path as C.1 because it is the same failure shape.

**What it is NOT:** Not TRANSIENT (retryable weather would re-fire the 39
actions). Not a silent skip (section 6: the skip is itself a recorded decision
with its class, never a silent omission).

---

*End of FAILURE-TAXONOMY.md v1.0.0. Kill-criteria note: this spec introduces no
dependency, no authority, no database; it is a closed vocabulary + record format.
The contract test kit (BCQ-TESTKIT) must reject any connector that emits an error
outside these 13 classes or emits a silent empty success after a failed fetch.*
