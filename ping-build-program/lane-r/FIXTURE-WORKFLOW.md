# Fixture Workflow: Production Incident → Fixture → Regression Test → Generic Fix

Lane R owns this loop. Every difficult external source must be reducible to a
sanitized fixture, so that a production failure becomes a permanent,
replayable, offline regression test and the fix lands in the generic
mechanism, not in a one-off patch.

## The loop

```
PRODUCTION FAILURE  →  CAPTURE  →  SANITIZE  →  FIXTURE
    →  REGRESSION TEST (fails)  →  GENERIC FIX  →  REGRESSION TEST (passes)
    →  ADOPT FIX  →  FIXTURE VERSIONED + PINNED
```

### 1. Production failure

A connector run terminates in a lane-K failure code (RATE_LIMITED,
SOURCE_CHANGED, SCHEMA_CHANGED, etc.) or misbehaves (duplicates, lost
records, checkpoint stall). The incident record must contain: connector id,
stream, fetchAttemptId, terminal state, the raw request/response sequence,
and timestamps. No diagnosis yet; capture first.

### 2. Capture

Run the lane-R capture script against the incident vault (the raw recording
lives in the incident vault, never in the repo). Capture emits a fixture
skeleton: ordered steps with request/response pairs, headers, latencyMs, and
a first-draft `expect` block describing what correct behavior looks like.

Credential rule (binding, Nolan 2026-09-23): the connect flow (CONNECT SOURCE
→ provider → smallest permission set → OAuth/PKCE → callback → encrypted
custody → capability inventory) is QUEUED FOR MORNING. Tonight and in the lab
generally: no live credentials, fixtures and recorded responses only. Any
capture that needs provider access runs through lane L's secret broker with
capability handles, never token values, and only after Nolan picks the
account. The lab never initiates provider connections.

### 3. Sanitize (the sanitization procedure)

This is the step that makes a production capture safe to commit. Performed by
the capture script, verified by a second pass:

1. **Secret sweep.** Scan every step (paths, headers, bodies, query strings)
   for: `authorization` headers, `api_key`/`apikey`/`token`/`secret`/
   `client_secret`/`access_token`/`refresh_token` params, webhook signing
   secrets, session cookies. Each hit becomes a redaction entry:
   `{"path": ..., "kind": "secret", "method": "dropped"}`. Secrets are dropped,
   never replaced with fake values that could be mistaken for real ones. If a
   step cannot be understood without the auth context (rare), use
   `method: "replaced-with-ref"` with a `pingsec_1_...` handle id from lane L
   (audit pointer only; the fixture never resolves it).
2. **PII minimization.** Drop PII the test does not need. PII the test needs
   (e.g. an external id for idempotency assertions) is kept only with a
   written justification in `sanitization.pii.fields` + `justification`.
   Coarse business data (business names, public review text) is acceptable;
   personal emails, phone numbers, exact addresses are not.
3. **Host neutralization.** Replace real provider hostnames with
   `api.fixture.local`. Real customer/tenant hostnames never appear.
4. **Canary check.** The capture environment plants a canary token in the
   recording. The sanitizer asserts the canary appears nowhere in the fixture
   bytes. `canaryCheck: failed` rejects the fixture outright.
5. **Manifest.** Write the `sanitization` block: status, every redaction with
   path/kind/method, secretRefs (handles only), pii declaration, canary
   result. A fixture with an empty manifest and `status: sanitized-production`
   is rejected (no capture is clean by accident).
6. **Digest pin.** Compute `sourceDigest` over the canonical bytes and pin it.
   From here the fixture is immutable; changes bump `fixtureVersion`.

Acceptance: `node runner/run.mjs <fixture> --pin-digest` succeeds, a
`grep -riE 'bearer|api[_-]?key|client_secret'` over the fixture returns only
the documented redaction notes, and the canary is absent.

### 4. Regression test (fails first)

Write the `expect` block to describe CORRECT behavior, then run the fixture
against the current harness/connector. It must FAIL in the way the production
incident failed (wrong terminal state, duplicates, lost checkpoint, crash).
A fixture that passes on the broken code is a tautology: strengthen `expect`
until it fails for the right reason. Record the failing report as
`lab/evidence/<fixture>-prefixed.json` if useful for the post-mortem.

### 5. Generic fix

Fix the MECHANISM, not the instance:

- A 429-handling bug is fixed in the shared retry/backoff path, not in the
  provider adapter.
- A cursor-format bug becomes a typed FULL_RESYNC path every connector
  inherits, not a per-provider special case.
- A schema-drift crash becomes coerce-then-quarantine in the shared
  normalization seam.

The kill question for every fix: does this change make one provider work, or
does it make the whole connector class harder to break? If the former, it is
not done.

### 6. Regression test (passes) and adoption

Re-run the fixture: PASS. Run the FULL lab suite: all PASS (no regressions).
Then:

- Bump `fixtureVersion`, re-pin the digest.
- File the fix note in STATE.md under FIXED with the fixture id as evidence.
- If the fix touches shared semantics (retry policy, taxonomy, idempotency),
  file an integration note to the owning lane (BCQ for the contract kit,
  K for taxonomy, L for secret handling). One owner per semantic unit.

## Acceptance criteria (the loop is done when)

1. The fixture replays offline with zero network and zero wall-clock
   (deterministic clock, seeded PRNG). Two runs, byte-identical reports.
2. The fixture FAILS on the pre-fix code for the reason the incident failed
   (evidence: the failing report).
3. The fixture PASSES on the fixed code, and the full lab suite still passes.
4. The fix is in the generic mechanism; a second provider benefits without
   code changes (stated in the fix note, or demonstrated with a second
   fixture).
5. The fixture is sanitized per the procedure above: no secrets, minimized
   PII, neutralized hosts, canary passed, digest pinned.
6. The fixture tests exactly one failure mode (kill criterion: split it
   otherwise).

## Red-team checklist for a new fixture

- [ ] Replay with `--inject '{"errorAt":["<step>"],"errorStatus":500}'`: does
      `expect` fail (non-tautological)?
- [ ] Replay with `--inject '{"latencyMs":5000}'`: still PASS (timing is data,
      never an assertion)?
- [ ] Webhook fixtures: replay with `--inject '{"reorderSeed":<n>}'` for three
      seeds: still PASS (order-independence)?
- [ ] `node runner/run.mjs` twice: byte-identical stdout reports?
- [ ] Fixture digest verifies after a fresh clone (no local state)?

## Worked example (2026-09-23): the taxonomy-swap incident

Incident: the lab's own failure classifier disagreed with canonical lane-K
taxonomy v1 on five boundaries (the Airbyte 403 infinite-loop family).
Fixtures: `github-403-secondary-limit`, `oauth-401-expired`,
`api-sunset-410-source-changed`, `provider-500-outage`,
`github-403-permission-denied` (control). Regression: 4 FAIL on pre-fix
harness, 1 PASS (control). Generic fix: `lab/runner/taxonomy.mjs`
(executable port of lane-K v1; harness delegates classification AND retry
policy). Post-fix: 5/5 PASS, all pre-existing fixtures PASS, 10/10
LADDER-PASS, red-team 5/5 CAUGHT. Evidence:
`lab/evidence/taxonomy-swap-proof.json`. This loop's acceptance criteria
1-6 all hold; criterion 4 is satisfied because every connector shape replays
through the same taxonomy module with no per-fixture code.
