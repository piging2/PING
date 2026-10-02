# LANE CONN — GitHub connector worker — STATE

Worker: CONN-GITHUB (subagent, night shift 2026-09-23).
Sibling: business-connector worker (filenames reserved to avoid collision:
this worker owns GITHUB-CONNECTOR.md, github/, HARVEST-REPORT-GITHUB.md;
suggested sibling names: BUSINESS-CONNECTOR.md, business/,
HARVEST-REPORT-BUSINESS.md).

## STATUS: BUILDABLE (spike PROVEN; contract-kit wiring is NEXT)

## What this worker did (2026-09-23 ~19:38-19:50 MDT)
- Read OWNERSHIP.md (program rules) + lane-bcq STATE.md (contract v1.0,
  test kit) + lane-l STATE.md (secret broker handle contract).
- Searched PING repo (read-only, via Pig): NO existing GitHub
  client/connector; only CI-env detection + deploy-time GITHUB_TOKEN env
  mentions. No octokit dependency. Existing HTTP egress primitive is
  `src/fyd/net/safe-fetch.ts` (production must use it; spike's stdlib
  urllib is research-only, to be replaced not vendored).
- Designed the connector against the BCQ contract (connect/discover/
  checkpoint/read/normalize/refresh/disconnect/health; SOURCE IDENTITY/
  AUTH SCOPE/CAPABILITIES/CHECKPOINT/OBSERVATIONS/PROVENANCE/ERROR CLASS/
  RATE-LIMIT STATE). Doc: GITHUB-CONNECTOR.md.
- Mapped 7 GitHub objects to observation -> evidence -> canonical authority
  (repo, issue, PR, review, workflow run, release, branch); GitHub NEVER
  writes canonical PING state.
- Cursor semantics: ETag conditional refresh (304 = no change, proven
  LIVE), opaque Link/since pagination cursors, webhook delivery-ID cursors,
  typed FULL_RESYNC on invalidation, push-never-replaces-polling.
- Built zero-dependency read-only spike hitting the public GitHub API
  (no auth; 4 requests of 60/hr, cached by content hash).
- Failure tests: 9/9 PASS (404->PERMANENT, 403 rate-limit vs permission
  distinguished, malformed quarantined, schema drift coerced, duplicate
  webhook absorbed, out-of-order dropped, idempotency deterministic).
- One real bug found and fixed by a fixture: store_evidence crashed on
  mixed-type keys via sort_keys; evidence is now stored verbatim.
- Evaluated 6 SDK/sync tools; adopted 0 (see HARVEST-REPORT-GITHUB.md).

## Ledger
- RESEARCHED: OWNERSHIP.md, BCQ contract v1.0, lane-L broker contract,
  PING repo (no GitHub client; safe-fetch is the egress gate).
- HARVESTED: 6 external candidates evaluated; concepts-only value from
  Airbyte (already in BCQ contract); mechanism fits in ~150 lines.
- IMPLEMENTED: github/spike.py, github/failure_test.py.
- TESTED: live spike (4 reqs, 304 revalidation) + 9/9 failure fixtures.
- FALSIFIED: "need an SDK for v0" (spike disproves); "PyGithub is safe to
  adopt" (LGPL-3.0 fails conservative license read).
- PROVEN: read-only GitHub -> observation path with provenance, cursors,
  rate-limit discipline, typed failures (repo metadata + issues live).
- NEXT: github/adapter.ts implementing the BCQ ConnectorAdapter interface;
  run the contract test kit suite; webhook receiver against lane-R fixtures;
  production port to safe-fetch + AuthBroker SPI; PR->commit SHA seam with
  lane A.
- BLOCKED: nothing for this worker. Contract-kit harness run awaits the
  BCQ-TESTKIT owner.

## Files
- GITHUB-CONNECTOR.md — design + object mappings + cursor semantics +
  rate-limit + failure behavior + kill criteria/optionality.
- github/spike.py — read-only spike (stdlib only).
- github/failure_test.py — failure fixtures (9/9 PASS).
- github/failure-test-results.json — machine-readable results.
- github/evidence/ — content-hashed raw payloads + spike-run-log.json.
- HARVEST-REPORT-GITHUB.md — SDK/sync tool evaluation (0 adopted, 6 rejected).
- STATE.md — this file.

## Follow-up: TESTKIT WIRING (2026-09-23 ~19:52 MDT, this worker)

STATUS: PROVEN (adapter 18/18 green + live re-verified).

- Implemented `github/adapter.py`: `GitHubConnectorAdapter(FakeWidgetCRM)`
  wrapping the proven spike logic behind the testkit Connector ABC.
  Fixture seam (connect/discover/checkpoint/read/disconnect/health,
  rate_limit_state, seed/mode/remote/attempt_log) inherited from the kit's
  sanctioned scriptable fixture; GitHub specializations in declaration()
  (7 read capabilities, 60/hr budget), normalize() (github_repository /
  github_issue route to spike normalizers + boundary secret redaction), and
  the `live_*` read-only path (live_check / live_read_repo /
  live_read_issues) reusing the spike's HTTP layer with lane-K v1 error
  classification applied at the adapter layer. Stdlib only. spike.py and the
  harness untouched.
- Harness run: 18/18 PASS (`python3 -m testkit.run --adapter
  adapter:make_connector`, from lane-bcq). Evidence copied to
  `github/testkit-run-20260924T015221Z/` (results.json + SUMMARY.md).
- Two adapter bugs found and fixed during live re-verification (200
  misclassified as TRANSIENT; 200/304 sharing the not-modified branch);
  re-ran to green. No tests weakened.
- Live re-verification (`github/live_verify.py`, octocat/Hello-World, 4
  reqs of 60/hr): PASS. Repo observation with spike-identical canonical id
  scheme, 5 issues, second repo read 304 not_modified, normalize
  determinism holds, 58/60 remaining.
- Error-class reconciliation: testkit enum (12) vs lane-K v1 (13); only
  naming delta is the added UNSUPPORTED class (no testkit enum member yet;
  adapter maps 405/501 to INVALID_PAYLOAD with UNSUPPORTED named in detail).
  Semantic deltas applied at adapter layer: 5xx -> SOURCE_UNAVAILABLE,
  unrecognized -> TRANSIENT + original_signal, 403 header-first
  disambiguation, typed transport failures. Full notes in
  `github/ADAPTER-TEST-RESULTS.md`.
- Coordinator actions surfaced: (1) add UNSUPPORTED to the testkit
  ErrorClass enum (harness is name-agnostic, safe additive change);
  (2) consider generalizing discovery.initial's hard-coded
  `provider == "fake-widget-crm"` assertion to the declaration's source_id
  so adapters can declare their real provider id.

## Ledger append (2026-09-24 ~02:15-02:40 MDT, CONN follow-up worker)

- VERIFIED: re-ran prior claims by real execution (not inheritance):
  GitHub adapter 18/18 PASS via BCQ testkit (fresh run
  2026-09-24T02:18:23Z); GBP spike 28/28 PASS (fresh evidence).
- RED-TEAM: added H-series failure injection to the GBP spike (lane-K classes
  honored: SOURCE_UNAVAILABLE, AUTH_EXPIRED, INVALID_PAYLOAD).
- FOUND+FIXED (real bug, fixture-caught): bare 401 on the locations leg fell
  through and emitted a silent SUCCEEDED with zero observations. Now typed
  AUTH_EXPIRED + lifecycle SUSPENDED; subsequent fetches stop at the
  authorization gate. Reviews leg got the same suspension semantics.
  New fixtures: rec-h-down, rec-h-auth-expired, rec-h-malformed.
- TESTED: GBP spike 36/36 PASS. Evidence: business/evidence/run-20260924-023705.jsonl.
- WROTE: INTEGRATION-REQUEST-bcq.md (harness suite generalization +
  volatile-field canonical_bytes invariant, lane-bcq owned),
  INTEGRATION-REQUEST-r-business.md (lab replay of GBP failure fixtures,
  lane-r owned).
- STATUS: GitHub connector PROVEN (adapter 18/18 green + live 4-req
  re-verification). GBP business connector PROVEN (36/36, fixtures);
  live path BLOCKED-exact: MORNING-QUEUE.md items 1-2 (GBP API approval +
  OAuth consent, Nolan's call).
- NEXT: harness-suite pass once lane-bcq generalizes; webhook receiver
  skeleton against lane-R fixtures; production adapter.ts (safe-fetch +
  lane-L credential ref); Square sandbox connector (next-3 #1).
