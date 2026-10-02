# Connector Lab Fixture Format — `ping.ingest.fixture@1`

Version 1. A fixture is a machine-generated, sanitized, replayable recording of
one ingestion interaction sequence (poll pages, webhook deliveries, error
sequences). It is the connector-lab equivalent of the Coppersmith `@graph`
fixture: pinned, digested, regenerable, never hand-edited after capture.

Design lineage (generalized from the Coppersmith `@graph` proof):

- Coppersmith fixture: MACHINE-GENERATED header, timestamp pin, pipeline git
  commit, sha256 source digest over pinned raw bytes, regenerate-dont-hand-edit,
  per-claim provenance labels.
- Connector fixture: same discipline applied to interaction sequences instead
  of object graphs. The capture script + pipeline commit replace the regen
  script; the sanitization manifest replaces per-claim labels; the digest is
  over the sanitized canonical bytes (the raw capture stays in the incident
  vault, never in the repo).

## File layout

`lab/fixtures/<fixture-id>.fixture.json` — one JSON document, UTF-8, no BOM.

## Top-level fields

| Field | Required | Meaning |
|---|---|---|
| `format` | yes | Literal `"ping.ingest.fixture@1"`. Readers must reject unknown major versions. |
| `fixtureId` | yes | Stable machine id, kebab-case, e.g. `github-issues-paginated`. |
| `fixtureVersion` | yes | Integer, starts at 1, increments on any semantic change to steps/expect. |
| `title` | yes | One-line human description. |
| `sourceType` | yes | `rest-json` \| `graphql` \| `webhook-push` \| `rss` \| `sitemap` \| `html-scrape`. |
| `connectorShape` | yes | `paginated-read` \| `webhook-push` \| `poll`. The harness behavior under test. |
| `recordedAt` | yes | ISO-8601 UTC timestamp pin (like the Coppersmith `observedAt` pin). |
| `capture` | yes | Provenance of the recording (see below). |
| `sanitization` | yes | What was removed/replaced and how (see below). |
| `replay` | yes | Determinism controls (see below). |
| `steps` | yes | Ordered interaction sequence (see below). |
| `expect` | yes | Assertions the runner checks against the harness run report. |

### `capture`

```json
"capture": {
  "recordedBy": "lane-r capture script <path> (or 'hand-built synthetic')",
  "pipelineCommit": "<git sha of the capturing pipeline, or null for synthetic>",
  "incidentRef": "<incident id, or null>",
  "sourceDigest": "sha256:<hex over canonical sanitized bytes>",
  "rawVaultRef": "<incident-vault pointer, never the raw bytes>"
}
```

`sourceDigest` is computed over the canonical serialization of
`{fixtureId, fixtureVersion, steps, expect, recordSchema}` (sorted keys, no
whitespace). Every load-bearing field is covered: changing the schema contract
changes the digest.
The runner recomputes it and fails closed on mismatch: a fixture whose bytes
drifted is not replayed. For production captures, `rawVaultRef` points at the
incident vault holding the pre-sanitization recording; the digest proves the
sanitized fixture derives from it without embedding it.

### `sanitization`

```json
"sanitization": {
  "status": "synthetic | sanitized-production",
  "redactions": [
    {"path": "steps[0].request.headers.authorization", "kind": "secret", "method": "replaced-with-ref", "ref": "pingsec_1_<handle-id>"}
  ],
  "secretRefs": ["pingsec_1_<handle-id>"],
  "pii": {"present": false, "fields": []},
  "canaryCheck": "passed"
}
```

Rules (bind to lane L secret-broker contract and lane K taxonomy):

- Secrets are NEVER values in a fixture. A captured `Authorization` header,
  API key, webhook signing secret, or token becomes a redaction entry with
  `method: "replaced-with-ref"` and a `pingsec_1_...` handle id. The handle is
  an audit pointer only; fixtures never resolve it. If the secret has no
  business being replayed (it never does), prefer `method: "dropped"` with
  `kind: "secret"`.
- PII beyond what the test needs is dropped. PII that the test needs
  (e.g. a reviewer login to assert idempotency) is kept only if marked in
  `pii.fields` with a written justification in the fixture title notes.
- `canaryCheck`: the capture pipeline plants a canary token in the recording
  environment; sanitization must prove the canary does not appear anywhere in
  the fixture bytes. `passed` | `failed` (failed = fixture rejected).
- Replay never needs real credentials: the transport matches requests by
  method+path and serves canned responses; auth headers are informational.

### `replay`

```json
"replay": {
  "deterministicClock": true,
  "baseTime": "2026-09-23T19:00:00Z",
  "latencyMode": "recorded",
  "seed": 42,
  "strictOrder": true
}
```

- `deterministicClock`: the harness sees a virtual clock starting at
  `baseTime`; recorded `latencyMs` values advance it. No wall-clock sleeps.
- `latencyMode`: `recorded` (use step latencyMs) | `none` (zero) |
  `scaled:<factor>`.
- `seed`: PRNG seed for failure-injection reorder/drops. Same seed, same run.
- `strictOrder`: request N must match step N; out-of-order is a harness bug
  and fails the run. Webhook fixtures may set `strictOrder: false` and match
  by delivery id (delivery order is the thing under test there).

### `steps`

A step is one interaction. Two kinds:

**`request`** (poll/paginated read):

```json
{
  "id": "page-1",
  "kind": "request",
  "request": {
    "method": "GET",
    "path": "/repos/acme/widgets/issues?state=open&per_page=3&page=1",
    "headers": {"accept": "application/vnd.github+json"},
    "body": null
  },
  "response": {
    "status": 200,
    "headers": {
      "link": "<https://api.fixture.local/repos/acme/widgets/issues?state=open&per_page=3&page=2>; rel=\"next\"",
      "x-ratelimit-remaining": "59",
      "retry-after": null
    },
    "body": [ {"id": 101, "title": "...", "updated_at": "..."} ],
    "latencyMs": 120
  },
  "note": "optional: why this step exists"
}
```

- `path` is matched against the harness's outgoing request path. Hosts are
  always the fixture host (`api.fixture.local`); real provider hostnames never
  appear in fixtures.
- `body` may be an object/array/string/null. Binary bodies are base64 with
  `"bodyEncoding": "base64"`.
- A request step carries `response` (single) or `responses` (array). When
  `responses` is present, the transport serves them in order across retry
  attempts of the same logical request: attempt 1 gets `responses[0]`,
  attempt 2 gets `responses[1]`, and so on. This models flaky sequences
  (429 then 429 then 200) without inventing extra step ids.
- `response.nextPath` (optional): the path the harness must request next.
  Absence means terminal. Cursor-style APIs declare it explicitly; Link-header
  APIs may omit it and the harness parses `Link: rel="next"` instead.
- Truncated real-world payloads carry `"truncated": true` on the step and keep
  the cut marker; the harness must surface `truncated:true`, never silently
  complete.

**`webhook-delivery`** (push):

```json
{
  "id": "evt-1",
  "kind": "webhook-delivery",
  "delivery": {
    "deliveryId": "wh_001",
    "eventId": "evt_abc123",
    "eventType": "issues.opened",
    "headers": {"x-hub-signature-256": "sha256=<redacted-signature>"},
    "signature": "valid",
    "body": {"action": "opened", "issue": {"id": 101}},
    "latencyMs": 15
  },
  "note": "first delivery of evt_abc123"
}
```

- `signature`: `valid` | `invalid` | `missing`. The transport computes a
  deterministic HMAC over the body with the fixture key when `valid`; the
  harness must verify before parse and fail closed otherwise.
- Duplicate deliveries reuse the same `eventId` with a new `deliveryId`.

**`control`** steps (failure-injection markers baked into the fixture, as
opposed to CLI injection at run time):

```json
{"id": "inject-429", "kind": "control", "inject": {"atStep": "page-2", "replaceStatus": 429, "headers": {"retry-after": "2"}}}
```

CLI injection overrides control steps; both are reported.

### `expect`

The runner collects a run report from the harness and compares it to `expect`.
Supported keys (all optional; the fixture declares only what it proves):
```json
"expect": {
  "recordsEmitted": 7,
  "uniqueRecords": 7,
  "duplicatesAbsorbed": 2,
  "terminalState": "SUCCEEDED",
  "failureCodes": ["RATE_LIMITED"],
  "maxAttemptsPerStep": 3,
  "retryAfterHonored": true,
  "checkpoints": ["page-1", "page-2", "page-3"],
  "fullResync": false,
  "schemaViolationsQuarantined": 0,
  "signatureFailures": 0,
  "noDuplicateKnowledge": true
}
```

- `terminalState`: `SUCCEEDED` | `FAILED` | `OUTCOME_UNKNOWN` (BCQ contract
  vocabulary).
- `failureCodes`: lane-K taxonomy codes observed across attempts, in order of
  first occurrence.
- `noDuplicateKnowledge`: every emitted idempotency key unique.

### `recordSchema` (optional)

For `paginated-read` fixtures, declares the expected record shape so the
harness can detect schema drift:

```json
"recordSchema": {
  "idField": "id",
  "versionField": "updated_at",
  "fields": {"id": "string", "rating": "number", "reviewer": "string", "text": "string"}
}
```

Records failing validation are quarantined (envelope + raw payload preserved)
and counted in `schemaViolationsQuarantined`; the fetch itself still succeeds.
`idField`/`versionField` feed the idempotency key
`sha256(connectorId | streamId | externalObjectId | externalRecordVersion)`
(the BCQ contract formula).

## Versioning and lifecycle

- Fixture format version is the `@1` in `format`. Breaking changes to the
  schema bump the major and require a migration note in the lab README.
- `fixtureVersion` bumps on any change to `steps` or `expect`. The digest
  changes with it; the runner verifies both.
- Fixtures are append-only history: a production incident that reoccurs gets a
  new fixture version, never an edited past. Old versions stay to prove the
  regression stays fixed.

## Lab gates (enforced, not advisory)

1. **lint** (`runner/lint.mjs`): rejects nondeterministic fixtures (wall-clock,
   unseeded randomness, missing seed), live-host references in request
   targets, unpinned digests, empty `expect` blocks. Run with
   `run.mjs --lint` or standalone.
2. **secret-scan** (`runner/secret-scan.mjs`): rejects fixtures containing
   secret-shaped values (live keys, bearer tokens, private keys) or the
   planted capture canary (`--canary <value>`). Lane-L handle refs
   (`pingsec_1_...`) are allowed; they are audit pointers, never values.
   Run with `run.mjs --scan-secrets [--canary <v>]`.
3. **Lab invariants** (`runner/assert.mjs` `checkInvariants`, enforced by
   `run.mjs` on every run): no duplicate idempotency keys, harness reached a
   terminal state, a FAILED terminal always carries a failure code (never
   silent). These hold regardless of what `expect` declares: an expect block
   that omits an invariant does not waive it.
4. **Test ladder** (`runner/ladder.mjs`): ten gates per fixture —
   EXISTS, IMPORTS, INITIALIZES, REACHABLE, EXECUTES, PERSISTS, RECOVERS,
   REPLAYS (double-run byte-identical), PRESERVES PROVENANCE,
   FAILS SAFELY (tampered bytes fail closed; total provider failure yields a
   recorded failure, never a silent success or a hang).
5. **Failure taxonomy** (`runner/taxonomy.mjs`): the executable port of the
   canonical lane-K FAILURE-TAXONOMY.md v1. The document is the authority;
   the module is pinned to it (`TAXONOMY_VERSION`). The harness assigns
   classes honestly and never overrides the taxonomy's retry policy.
6. **Drift detection** (`redteam/drift-check.mjs`, strategy in
   `redteam/DRIFT-DETECTION.md`): `recordSchema` vs fresh sample;
   added/removed/retyped fields -> SCHEMA_CHANGED. Drift mints a new fixture
   version; it never edits the old one and never auto-accepts.
7. **Red-team** (`redteam/run-redteam.mjs`): five adversarial cases the lab
   must catch (secret leak, duplicate-write hiding, nondeterminism, drift,
   pagination loop). All five currently CAUGHT.

## Kill criteria for a fixture

A fixture is REJECTED (not added to `fixtures/`) if: it contains an
unredacted secret; it cannot be replayed offline (references live hosts or
wall-clock); it is nondeterministic (unseeded randomness, sleeps); it tests
more than one failure mode (split it); its `expect` block cannot fail
(tautology); or it duplicates an existing fixture's failure mode.
