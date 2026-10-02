# LANE BCQ — Connector substrate (TypeScript), 2026-09-24

## STATUS: PROVEN

The substrate every future connector inherits. tsc --strict clean
(noUnusedLocals/noUnusedParameters), 32/32 contract checks green, run twice
for determinism. Zero runtime dependencies. Evidence: `evidence/contract-suite-output.txt`.

## DELIVERABLES

- `kit/`: types.ts, adapter.ts (ConnectorAdapter SPI + bounded AuthBroker SPI),
  harness.ts (scripted provider, virtual clock, cursor store, HMAC webhook
  signer, secret canary scanner, knowledge ledger, manifest validator),
  sanitize.ts (zero-dep reference sanitizer + payload/redirect/SSRF bounds),
  reference-adapter.ts (full-contract reference implementation),
  contract-kit.ts (32-check suite: admission A, idempotency B, retry/circuit C,
  taxonomy D, hostile input E, webhooks F, provenance G), run.ts, README.md,
  package.json (zero deps), tsconfig.json (strict).
- `spike/nango-auth-broker.ts`: minimal Nango AuthBroker wrapper (proxy facet
  only; capability/tenant/URL binding; caller auth headers stripped).
- `spike/redteam.ts`: 7/7 red-team checks pass (evidence/
  nango-broker-redteam-output.txt).
- `harvest/nango/` (commit 7bf896bb3ba174a00e746c9a56fe9da7d7064fa5, 2026-09-24)
  and `harvest/airbyte-protocol/` (commit 79375c2c6cbd8436c9d283be1ba964fc4e85e62d,
  2026-01-26): isolated clones, license + mechanism inspection only, nothing vendored.

## CONTRACT (published early for lane CONN)

- check/discover/read/webhook verbs; write.* denied by default.
- Connector data is OBSERVATION, never canonical truth; provider auth proves
  access only, never business identity.
- Idempotency key: sha256(connectorId | streamId | externalObjectId |
  externalRecordVersion). Six proofs: same object twice, same webhook twice,
  restart, cursor rollback, network retry after unknown outcome, partial batch.
- Cursors opaque, stored verbatim; checkpoint advances only past fully
  processed pages; partial page holds cursor, retry relies on idempotency.
- Retry max 3; 4xx (except 408/429) non-retryable; Retry-After honored;
  circuit breaker after sustained failures.
- Webhooks: HMAC-SHA256 over RAW bytes verified BEFORE parse (real HMAC via
  node:crypto timingSafeEqual, not the hash(secret+body) placeholder the
  first draft used); unknown shapes preserved opaque.
- Secrets as capability handles only; secret canary test proves no leakage
  into observations/logs/evidence/fetch records.
- Tenant + named principal on every run; cross-tenant isolation tested.

## NANGO VERDICT: ADOPT, bounded (proven 2026-09-24)

Use Nango self-hosted for AUTH + CONNECTION MANAGEMENT ONLY; it stays
transport infrastructure, never PING authority. Proven from the clone:

- LICENSE file: Elastic License 2.0. Self-host for internal use is within
  the license; offering Nango-as-a-service to third parties is not.
  Commercial licensing decision still goes to Nolan before production.
- `packages/server/lib/services/proxy.service.ts`: proxy fetches the
  connection server-side, runs `refreshOrTestCredentials` (transparent
  refresh), injects credentials into the outgoing provider request. The
  caller passes only `provider-config-key` + `connection-id` headers.
- `packages/shared/lib/services/connections/credentials/refresh.ts`:
  single-flight refresh via in-process `inFlightRefreshes` map + Redis TTL
  lock `lock:refresh:{env}:{providerConfigKey}:{connectionId}` + refresh
  backoff. This is the mechanism the wrapper relies on instead of
  reimplementing refresh.
- `packages/node-client/lib/index.ts` + `packages/types/lib/connection/api/get.ts`:
  public SDK `getConnection()` returns `ApiPublicConnectionFull` INCLUDING
  `credentials`. This is the exact leakage vector the wrapper closes: the
  wrapper takes `Pick<Nango,'proxy'>` only, so getConnection is
  type-unreachable; red-team R1/R7 prove it.
- Binding constraints: (1) self-hosted; (2) Auth + Proxy only, no syncs/
  functions/webhooks/MCP; (3) PING code touches Nango only through
  AuthBroker; (4) never expose getConnection past the wrapper; (5) PING
  retains objects, evidence, capabilities, policy, observations, events,
  audit, scheduling.
- BLOCKED (infrastructure, recorded honestly): Nango's own vitest suite
  could not run in this sandbox. `npm install` succeeded (2601 packages);
  `@nangohq/utils` built; full `tsc -b` on the server package was OOM-killed
  twice (6 GB cap). Verdict rests on direct source inspection of the exact
  files above at the recorded commit, plus the wrapper spike's 7/7
  red-team pass. A live self-hosted Nango round-trip still needs Docker +
  real OAuth apps (Nolan's morning queue per the 2026-09-23 eval).

## AIRBYTE VERDICT: ADAPT concepts, REJECT platform (proven 2026-09-24)

- License: MIT (airbyte-protocol LICENSE, verified).
- Harvested from protocol v0.3.2 spec: four-verb lifecycle
  (spec/check/discover/read as the connector entry points), per-stream sync
  modes (full_refresh/incremental), opaque provider-owned cursors
  (per-stream state messages), typed full resync after cursor invalidation,
  deterministic message taxonomy (RECORD/STATE/LOG/SPEC/CONNECTION_STATUS/
  CATALOG/TRACE/CONTROL). These map 1:1 onto the kit's check/discover/read
  verbs, cursor semantics, and 410-then-FULL_RESYNC rule.
- Refused: the Airbyte platform runtime (scheduler/workers/UI), Airbyte as
  an authority, Airbyte trace machinery as a replacement for PING events,
  importing provider connector implementations blindly.

## LANE LEDGER (2026-09-24)

- IMPLEMENTED: kit/ TypeScript substrate (types, adapter SPI, harness,
  sanitizer, reference adapter, 32-check contract suite, runner, README).
- FALSIFIED then FIXED: (1) malformed SSRF line (comment swallowed the `if`,
  stray brace closed the read loop early); (2) retry attempt counts lost on
  throw; (3) webhook "HMAC" was hash(secret+body), replaced with real
  HMAC-SHA256 + timingSafeEqual; (4) dead code (unused imports/fields) under
  noUnusedLocals; (5) Math.random request ids replaced with deterministic
  sequence.
- TESTED: tsc --strict clean; 32/32 green twice (deterministic replay).
- PROVEN: kit is the substrate; Nango verdict proven via clone inspection +
  wrapper spike (7/7 red-team); Airbyte verdict proven via protocol spec.
- INTEGRATED 2026-09-24 ~03:30 MDT: isolated worktree
  /home/nolan/projects/ping-bcq-substrate on branch lane/bcq-connector-substrate
  at HEAD e48ef710 (fyd-factory). Kit integrated as uncommitted diff ONLY:
  10 files under src/fyd/connectors/kit/ (types, adapter SPI, harness,
  sanitizer, reference adapter, contract-kit, run, README, jest.config.cjs,
  __tests__/contract-kit.test.ts). Import style converted to the repo's
  extensionless convention. Verified in place: tsc --noEmit clean under repo
  tsconfig (strict + noUnusedLocals/Parameters); jest scoped suite 1/1 PASS
  (repo's own jest 30 + ts-jest); contract suite 32/32 via emitted JS.
  Main checkout untouched (still fyd-factory, original dirty WIP intact).
  NO commits made anywhere. Temp node_modules symlink used for the jest run
  was removed afterward; diff is exactly `?? src/fyd/connectors/`.
- NOT DONE: lane CONN consumption (no lane-conn design on disk yet);
  production Nango wiring (Nolan's veto gate + OAuth apps); the concrete
  NangoAuthBroker stays a spike until Nango is live.

## HARVEST REPORT (per program format)

- PROBLEM: every future connector needs the same substrate: lifecycle
  verbs, idempotency, cursors, retry, taxonomy, hostile-input boundaries,
  secret handling. Without it each connector invents its own (or none).
- PING ALREADY HAS: acquisition-adapter.ts types (no impl), safe-fetch/SSRF
  boundary, feed parser, structured-data extraction, media provenance,
  refresh/conflict machinery, signed event submission. No general connector
  substrate, no implemented AcquisitionAdapter, no live business connector.
- EXTERNAL CANDIDATES: Nango (auth + connection mgmt), Airbyte protocol
  (lifecycle/cursor/state semantics).
- LICENSES: kit: zero-dep, lane-owned. Nango: Elastic License 2.0
  (self-host internal use OK; commercial decision to Nolan pre-production).
  Airbyte protocol: MIT.
- TESTED: kit 32/32 (tsc strict, deterministic); Nango wrapper spike 7/7
  red-team; Nango's own suite blocked by sandbox OOM (recorded, not hidden).
- WINNER: the kit itself + bounded Nango AuthBroker + Airbyte concepts.
- ADOPT-ADAPT-REJECT: ADOPT Nango Auth+Proxy self-hosted behind the
  capability-handle wrapper; ADAPT Airbyte's verbs/cursors/state taxonomy;
  REJECT Nango syncs/functions/webhooks/MCP/cloud, Airbyte platform, any
  new event store/cursor registry/secret broker (other lanes own those).
- CODE WE DO NOT NEED TO WRITE: OAuth refresh machinery, single-flight
  refresh locks, per-connector test suites, a second sanitizer authority,
  a connector registry (lane M owns registry semantics).
- MINIMAL PING WRAPPER: spike/nango-auth-broker.ts (~150 lines) is the
  wrapper; kit/adapter.ts AuthBroker is its SPI.
- FAILURE TEST: contract-kit covers auth expiry, 403, rate limit,
  timeout/unknown-outcome, malformed, hostile HTML, secret canary,
  cross-tenant, cursor invalidation, partial batch; redteam.ts covers
  credential leakage, tenant substitution, capability bypass, SSRF.
- PRODUCT CAPABILITY UNLOCKED: connector development becomes merge-bar
  work (32/32) instead of invented verification; auth becomes a solved
  problem (Nango) instead of per-connector OAuth code.
- BYTES-DEPENDENCY COST: kit 79,017 bytes TS (104K dir), spike 11,985
  bytes, zero runtime dependencies. Nango/Airbyte add zero bytes to PING
  (external services / concepts only).

---

# LANE BCQ-TESTKIT — Connector CONTRACT TEST KIT (P0 infra)

## STATUS: PROVEN

Green run 2026-09-23 19:40 MDT: 18/18 tests PASS against the fake fixture.
The harness is runnable tonight by any future connector adapter.

## NEXT

Run the harness against the GitHub connector design (sibling lane CONN) as
its first real consumer. BLOCKED: lane-conn has no design file on disk yet
(checked 2026-09-23 ~19:38 MDT). When it lands: wrap behind the Connector ABC,
run `python3 -m testkit.run --adapter <path>:<factory>`.

Secondary dependency: lane K canonical failure taxonomy. BCQ used the
OWNERSHIP.md list verbatim; lane K had no draft on disk. If lane K revises
names, only the ErrorClass enum changes.

## DELIVERABLES

- CONTRACT-TEST-KIT.md (contract spec + plug-in instructions) at lane root.
- testkit/: contract.py (interface + taxonomy + secret redaction), harness.py
  (runner + 18 tests), fake_connector.py (scriptable FakeWidgetCRM fixture),
  run.py (CLI), results/<ts>/ (run evidence: results.json + SUMMARY.md).
- Python stdlib only, zero dependencies.

## LANE LEDGER

- 2026-09-23 19:35: Lane opened; read OWNERSHIP.md, connector-contract.md
  (v1.0 draft in business-connectors/hidden_files), lane-l secret broker
  contract, PING repo acquisition surface (read-only via Pig).
- 2026-09-23 19:36: RESEARCHED - PING repo has NO general connector contract or
  test kit. Closest existing: src/fyd/acquisition/acquisition-adapter.ts
  (types only, implementation deferred), src/lib/media-contracts.ts +
  pipeline-contract.test.ts (media-only contract pattern worth mirroring).
  No duplication risk; kit is new P0 infra, not a second authority.
- 2026-09-23 19:37: IMPLEMENTED - testkit/ written: contract.py, harness.py,
  fake_connector.py, run.py.
- 2026-09-23 19:39: TESTED - first run 17/18. secrets.redaction caught the
  fixture passing secret-shaped provider data through unredacted. Real
  finding, not a test bug.
- 2026-09-23 19:39: FIXED - redaction at the connector boundary:
  redact_secrets() in contract.py, applied in fake normalize(), flagged with
  _secret_redacted. Now a contract rule: secrets never enter observations.
- 2026-09-23 19:40: PROVEN - rerun 18/18 PASS. Evidence:
  testkit/results/20260924T014036Z/.

## HARVEST REPORT (per program format)

- PROBLEM: every future connector adapter needs the same contract verified;
  without a kit each adapter invents its own tests (or none).
- PING ALREADY HAS: acquisition-adapter.ts types (no impl), media contract
  test pattern, connector-contract.md v1.0 draft (lifecycle/failure/governor),
  lane-l secret broker handle contract. No runnable connector test kit.
- EXTERNAL CANDIDATES: none needed; stdlib suffices for the harness.
- LICENSES: n/a (no external code).
- TESTED: 18/18 green on scriptable fake fixture with failure injection.
- WINNER: the kit itself (lane-owned test infra, not a dependency).
- ADOPT-ADAPT-REJECT: ADOPT the lane-l opaque-credential-ref rule and the
  connector-contract.md failure states verbatim; ADAPT the lane-K taxonomy
  from OWNERSHIP.md pending lane-K confirmation.
- CODE WE DO NOT NEED TO WRITE: any per-connector bespoke test suite; the
  kit inherits to every adapter.
- MINIMAL PING WRAPPER: a future TS port of the ABC (~5 min) if runtime
  binding is wanted; the Python kit stays as lane test infra.
- FAILURE TEST: failure injection is built in (auth denial/expiry, rate
  limit, timeout, malformed, hostile HTML, secret-shaped payloads).
- PRODUCT CAPABILITY UNLOCKED: connector development becomes 20x: adapter
  authors get a merge bar (18/18) instead of inventing verification.
- BYTES-DEPENDENCY COST: ~1,400 lines Python, zero dependencies.

---

# LANE BCQ-NANGO — Nango as connector auth + connection management (P0 infra)

## STATUS: RESEARCHED + HARVESTED — verdict ADAPT

Self-hosted Nango free tier (Auth + Proxy only) as token custodian behind a
PING-owned `ConnectorAuthPort` wrapper. Nango Cloud rejected (customer-data
custody, recurring cost). Full eval: `NANGO-EVAL.md` in this dir.

## NEXT

1. **Nolan (morning queue):** vendor veto gate decision for production hot-path;
   picks real accounts; OAuth app registrations per provider.
2. **Lane CONN:** first real business connector builds against
   `ConnectorAuthPort` (in NANGO-EVAL.md), never against Nango directly.
3. **This kit (BCQ-TESTKIT):** F1-F7 failure scenarios from NANGO-EVAL.md are
   designed to plug into this harness (auth expiry, scope 403, Nango-down,
   cross-tenant forgery). Nango-side fixtures to follow once the wrapper exists.

## DELIVERABLES

- NANGO-EVAL.md: full harvest shape (PROBLEM / PING ALREADY HAS / EXTERNAL
  CANDIDATES / LICENSES / TESTED / WINNER / ADOPT-ADAPT-REJECT / CODE WE DO
  NOT NEED TO WRITE / MINIMAL PING WRAPPER / FAILURE TEST / PRODUCT
  CAPABILITY UNLOCKED / BYTES-DEPENDENCY COST) + red team + optionality seam
  + veto gate answers + evidence index.
- Harvest clone: `~/workspace/ping-build-program/harvest/nango` (research only,
  nothing vendored).

## LANE LEDGER

- 2026-09-23 ~19:35: Lane opened; read OWNERSHIP.md, connector-contract.md,
  ecosystem-harvest.md, PING repo OAuth surface (read-only via Pig).
- 2026-09-23 ~19:44: Nolan's standing decisions received (credential queue,
  vendor veto). No live credentials used; fixtures/code-reading only.
- 2026-09-23 ~19:50: RESEARCHED — Nango repo cloned (HEAD 2026-09-24, ELv2
  license verified, 1,015-provider catalog parsed, secret/proxy/audit/connect
  flows code-verified).
- 2026-09-23 ~20:00: HARVESTED — mechanisms: scoped API keys (capability-handle
  enforceable, 403 verified), proxy token injection, envelope encryption,
  Connect UI postMessage completion (webhook-free path for free tier),
  refresh-failure auth error records, ownership disclaimer in Nango docs.
- 2026-09-23 ~20:05: IMPLEMENTED — `ConnectorAuthPort` interface drafted.
- BLOCKED: production wiring waits on Nolan's veto gate + account picks
  (morning). Full `npm ci` test run not done (infeasible in window).

## KEY FINDINGS FOR SIBLING LANES

- **Lane L:** scoped keys give you the custody pattern: runtime key =
  `environment:proxy` + `environment:connections:read` + `environment:connect_sessions:write`,
  never `read_credentials`. Admin key in vault, offline only.
- **Lane K:** proxy collapses `credentials_refresh_failed` to `server_error`;
  typed health must read the connection row (`refresh_exhausted`,
  `last_refresh_failure`, `credentials_expires_at`). Mapping drafted in eval.
- **Lane M:** connection rows carry `end_user_id`, `tags`, `metadata`,
  timestamps; health polling supported.
- **Lane N:** wrapper stamps the full provenance envelope on every observation;
  Nango keeps connection-level source identity only.
- **Catalog gaps:** no `google-business-profile` (YAML-addable), no ATProto.
- **Constitutional guardrail:** Nango must never become PING authority. No Nango
  IDs as canonical foreign keys; binding lives PING-side. Any design violating
  this is REJECT.
