# LANE R — REPLAYABLE INGESTION FIXTURES + CONNECTOR LAB — STATE

## Status: PROVEN

Lane: cross-cutting — R. Owns the connector lab (isolated fixtures, recorded
responses, failure injection). Read-only on the PING repo; all outputs in
this state dir.

Mission: every difficult external source produces a sanitized fixture so that
PRODUCTION FAILURE → FIXTURE → REGRESSION TEST → GENERIC FIX.

## Standing decisions observed (Nolan, 2026-09-23, binding)

1. Connector credentials: QUEUED FOR MORNING, do not assume. The connect flow
   (CONNECT SOURCE → provider → smallest permission set → OAuth/PKCE →
   callback → encrypted custody → capability inventory) is built later; Nolan
   picks the account. No live credentials in this lane tonight:
   fixtures/recorded responses only. Recorded in FIXTURE-WORKFLOW.md §2.
2. Vendor veto: YES for adoption, NO for experimentation. The lab adopts no
   vendor: zero dependencies, own code. Gate questions answered in
   HARVEST-REPORT.md (all pass; nothing enters the hot path).

## Deliverables (all in this dir)

- `lab/FIXTURE-FORMAT.md` — `ping.ingest.fixture@1` spec: provenance
  (generalized from the Coppersmith @graph discipline: timestamp pin,
  pipeline commit, sha256 source digest, regenerate-dont-edit), sanitization
  manifest (lane-L handle refs, never secret values; canary check), replay
  determinism (virtual clock, seeded PRNG), steps, expect, versioning, kill
  criteria, lab gates (lint, secret-scan, invariants, ladder, taxonomy,
  drift, red-team).
- `lab/runner/` — fixture runner: `transport.mjs` (deterministic replay +
  failure injection: latency, error, truncation, reorder, drop),
  `harness.mjs` (reference generic mechanisms: pagination, typed
  FULL_RESYNC, idempotency dedupe, coerce-then-quarantine, webhook HMAC +
  dedupe; classification + retry policy DELEGATED to taxonomy.mjs),
  `taxonomy.mjs` (executable port of canonical lane-K FAILURE-TAXONOMY.md
  v1, pinned `lane-k-v1-2026-09-23`; the document is the authority),
  `assert.mjs` (expect assertions + unconditional lab invariants),
  `lint.mjs` (fixture kill-criteria gate), `secret-scan.mjs`
  (secret/canary gate), `ladder.mjs` (10-gate test ladder per fixture),
  `run.mjs` CLI. Zero deps.
- `lab/fixtures/` — 10 digest-pinned fixtures, all PASS with full gates:
  github-issues-paginated, flaky-source-429-then-success,
  webhook-duplicate-delivery, cursor-corruption-full-resync,
  schema-drift-quarantine, github-403-secondary-limit,
  oauth-401-expired, api-sunset-410-source-changed, provider-500-outage,
  github-403-permission-denied (control).
- `lab/redteam/` — `run-redteam.mjs` (5/5 attacks CAUGHT: secret leak,
  duplicate-write hiding, nondeterministic fixture, fixture drift,
  pagination loop), `drift-check.mjs` + `DRIFT-DETECTION.md`,
  `harness-tampered.mjs` (rigged double-write harness, red-team only).
- `lab/replay-github.mjs` + `lab/evidence/github-replay-report.json` —
  contract-shaped GitHub issues reader replayed against the paginated
  fixture (reference consumer for lane CONN): PASS.
- `lab/evidence/taxonomy-swap-proof.json` — red→green evidence for the
  taxonomy-swap incident (before/after verdicts per fixture).
- `lab/evidence/ladder/` — per-fixture 10-gate ladder reports (10/10 PASS).
- `FIXTURE-WORKFLOW.md` — incident → fixture → regression test → generic
  fix, with the sanitization procedure and acceptance criteria.
- `HARVEST-REPORT.md` — ecosystem eval (VCR.py, nock, msw, WireMock,
  Mountebank, Polly.js): REJECT all as dependencies, ADAPT the cassette
  mechanism; vendor veto gate answered.

## PROOF (2026-09-23 ~20:45 MDT): taxonomy-swap red→green

Incident (real, from program state): the lab's failure classifier disagreed
with the now-canonical lane-K taxonomy v1 on five boundaries — the same
misclassification family that caused Airbyte's GitHub infinite-retry loop on
403s, and that lane CONN's testkit wiring fixed tonight at the adapter
layer. Fixtures: github-403-secondary-limit (lane K scenario 1),
oauth-401-expired, api-sunset-410-source-changed (scenario 10),
provider-500-outage, github-403-permission-denied (control).
Before (pre-taxonomy harness): 4 FAIL / 1 PASS (control).
Generic fix (not fixture-specific): `runner/taxonomy.mjs` executable port of
lane-K v1 + harness delegates classification AND retry policy to it.
After: 5/5 PASS; all 5 pre-existing fixtures still PASS (no regressions);
10/10 fixtures LADDER-PASS; red-team 5/5 CAUGHT.
Evidence: `lab/evidence/taxonomy-swap-proof.json`.

## Ledger

- RESEARCHED: Coppersmith @graph fixture model (`fyd-factory/qa/correction/
  coppersmith-graph.ts`: machine-generated header, timestamp pin, pipeline
  commit, source digest); PING git history fixture-regeneration mechanism
  (b8d899b1: double-run byte-identical, per-observation records);
  record/replay ecosystem (VCR.py, nock, msw, WireMock, Mountebank, Polly.js:
  licenses verified, Polly.js archived).
- RESEARCHED: lane BCQ STATE.md (contract, idempotency formula, terminal
  states, taxonomy list); lane L STATE.md (secret-broker handle contract);
  lane K FAILURE-TAXONOMY.md v1 (canonical, 13 classes, retry policy,
  failure record format, 10 adversarial scenarios).
- IMPLEMENTED: fixture format spec, 10 fixtures, runner (transport,
  harness, taxonomy, assert+invariants, lint, secret-scan, ladder, CLI),
  failure-injection hooks, GitHub reader shape, red-team suite (5 cases),
  drift detection (check + strategy doc).
- TESTED: 10/10 fixtures PASS with lint+secret-scan gates; digests pinned
  and verified; injection hooks verified non-tautological; double-run
  byte-identical; 10/10 LADDER-PASS; red-team 5/5 CAUGHT.
- FIXED: lab misclassification incident (5 boundaries) via the generic
  taxonomy port; lint false positive on provider-hostname mention in notes
  (now checks request targets only).
- PROVEN: taxonomy-swap red→green (evidence JSON); GitHub connector shape
  replays the paginated fixture end to end; fixture lifecycle demonstrated
  on a real historical failure class.
- FALSIFIED: "the lab needs an external record/replay dependency"
  (zero-dep runner does it); "expect blocks alone prevent duplicate-write
  hiding" (red-team case 2 proves they don't; unconditional invariants do).
- NEXT: (a) fixtures for provider timeout sequences and partial-batch
  failure (7-of-10 checkpoint semantics); (b) replay the webhook fixture
  against a BCQ-kit-shaped adapter when the kit publishes its harness
  interface; (c) ingest the first real production incident capture when the
  connect flow is authorized (morning queue); (d) wire drift-check Layer 1
  into the per-source revalidation cadence once live samples are authorized.
- BLOCKED: nothing. (Pig SSH unreachable from this sandbox during the
  session — PING-repo re-verification deferred; lane is read-only on the
  repo and all outputs are in this dir, so no work is blocked.)
