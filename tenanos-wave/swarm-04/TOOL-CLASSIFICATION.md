# TOOL CLASSIFICATION — Side-Effect Semantics for Autonomous Workers
## SWARM 04 (Tool Safety / Side-Effect Semantics) — TenantOS Autonomous Convergence Wave
## 2026-09-23

**Scope.** Every tool/callable reachable by autonomous workers in the PING execution
substrate, classified by side-effect semantics. Read-only investigation; no repo
files touched. Evidence is code-level (file:line) plus one live read-only probe.

**Authority under test (singular).** There is exactly ONE exterior-agent capability
authority: `CapabilityAuthority` (`/home/nolan/ping-gateway-src/gateway/capability_authority.js`),
reached via `POST /capabilities` (`routes/capabilities.js`). The file's own header
calls it the "Exterior-Agent Capability Interface" for "exterior agents (Muse,
future agents)". This swarm classifies against this authority; it does NOT create a
second one. The FYD user-facing grant authority (`src/lib/ping/grants.ts`) is a
different, user-facing system and is out of scope (FYD exclusion zone).

**Constitutional boundary.** Capability-authority *mapping/certification* belongs to
the 10-worker constitutional sprint. This document does not re-map authority; it
classifies *tool side-effect semantics* and *execution-envelope safety*, which is
this swarm's charter. Sprint raw outputs under `~/workspace/constitutional-sprint/capability/raw/`
cover the FYD read surface only — no overlap.

**Prior decisions consumed (memory):**
- Effect-model classification table exists as a prior deliverable (2026-09-19):
  live mission path has NO irreversible external effects; email/SMS connectors are
  stubs; GitHub/PostHog discovery-only. This inventory CONFIRMS that for the
  capability plane (command.run/test.run/build.run/git.push all fail-closed) and
  EXTENDS it with the unauthenticated HTTP surfaces below, which that analysis
  did not cover.
- Gate rule (2026-09-19): "no effectful worker registers without
  authorize -> ledger -> dispatch -> confirm." The current `execute()` path is
  authorize -> execute -> log. There is no ledger and no confirm step. Gap recorded.
- Probe-001 (2026-09-23): replacement-worker reconstruction proven at the
  workspace-JSON level, not through the live substrate.
- Standing law: no direct worker DB writes; releases need human authority;
  synthetic-first chaos; fail closed.

---

## 1. The 21 advertised capabilities (POST /capabilities)

Source of the catalog: `routes/capabilities.js` `GET /discover` (lines 94-421).
Execution: `capability_authority.js` `execute()` (line 438) -> `_routeCapability`
(line 489) -> per-domain routers. Agent profiles: `muse` (level 1) and
`muse-level-2` (level 2), `_loadAgentProfiles` (line 185). Live-verified:
`GET /capabilities/health` -> `{"status":"ok","authority":"CapabilityAuthority",
"initialized":true,"agentProfiles":["muse","muse-level-2"]}` (2026-09-23, Pig).

Classes: READ_ONLY / REVERSIBLE_EFFECT / IDEMPOTENT_EFFECT / NON_IDEMPOTENT_EFFECT
/ CONSEQUENTIAL_EFFECT / UNKNOWN. UNKNOWN fails closed for autonomous mutation,
no exceptions.

| # | Capability | Class | Granted to | Evidence |
|---|---|---|---|---|
| 1 | `fs.list` | READ_ONLY | muse, muse-level-2 | `_scanRepository`; no writes (capability_authority.js:534) |
| 2 | `fs.read` | READ_ONLY | muse, muse-level-2 | `readFileSync`; `deniedPaths` enforced in `authorize()` (line 382); `maxFileSize` gate (line ~393: `parameters.size > profile.maxFileSize` denies). NOTE: the size gate keys on a client-supplied `parameters.size`, not the actual file size — a caller can understate it. |
| 3 | `fs.write` | NON_IDEMPOTENT_EFFECT | muse, muse-level-2 | `fs.writeFileSync` non-atomic (line ~593); blind overwrite, no expected-hash/version precondition; torn-write on crash; retry with different content destroys data. RETRY != IDEMPOTENCY. |
| 4 | `fs.patch` | UNKNOWN (fail-closed in practice) | muse, muse-level-2 | Discover claims `IMPLEMENTED`; implementation calls `patchAuthority.createPatch(parameters)` (line 605) but the real signature is `createPatch(missionId, agentId, patchData)` (patch_authority_v2.js:273) — every call throws TypeError -> nested error envelope. Advertised-but-broken. Fails closed (no effect), but the catalog LIES. |
| 5 | `repo.inspect` | READ_ONLY | muse, muse-level-2 | `repositoryAuthority.getRepositoryRoot` (line 723) |
| 6 | `git.status` | READ_ONLY | both | `commitAuthority.getGitStatus` (line 633) |
| 7 | `git.diff` | READ_ONLY | both | `simpleGit.diff()` (line 638) |
| 8 | `git.log` | READ_ONLY | both | `simpleGit.log({maxCount})` (line 645) |
| 9 | `git.branch` | UNKNOWN -> treat as READ_ONLY-observed | muse-level-2 only | Discover advertises "Create Git branch". Implementation calls `gitBranchInstance.branch()` with NO arguments, which LISTS branches (lines 655-661). Schema drift: the tool does not do what the catalog says. Currently effect-free, but any worker reasoning "I created branch X" is reasoning from a lie. |
| 10 | `git.checkout` | NON_IDEMPOTENT_EFFECT | muse-level-2 only | `gitCheckoutInstance.checkout(parameters.branch)` (line 665); changes working-tree state; discover itself marks `destructiveBehavior: true`; uncommitted work context can be stranded. |
| 11 | `git.commit` | NON_IDEMPOTENT_EFFECT | muse-level-2 only | `addConfig` identity hardcode + `git add .` (ENTIRE worktree, line 672) + `commit(message)` (line 673). Duplicate request -> duplicate commits (distinct hashes). `add .` sweeps in files the worker never named. No pre-commit verification of what is staged. |
| 12 | `git.push` | CONSEQUENTIAL_EFFECT (fail-closed) | NOBODY | Discover: `DISABLED`, `executionPermitted: false`; `_routeGit` throws "not yet implemented with promotion authorization" (line 678). Correctly fail-closed. KEEP. |
| 13 | `process.list` | READ_ONLY | both | `runtimeRegistry.executeListComponents` (line 741) |
| 14 | `service.inspect` | READ_ONLY | both | `runtimeRegistry.executeResolveComponent` (line 743) |
| 15 | `logs.read` | UNKNOWN (fail-closed) | NOBODY | Discover: `NOT_IMPLEMENTED`, `executionPermitted: false`. No route case -> would throw "Unknown capability". KEEP disabled. |
| 16 | `knowledge.search` | READ_ONLY | both | `knowledgeGraph.queryNodes` (line 759) |
| 17 | `event.search` | READ_ONLY | both | `unifiedEventRuntime.query` (line 762) |
| 18 | `command.run` | CONSEQUENTIAL_EFFECT (fail-closed) | NOBODY | `_routeExecution` throws "not yet implemented with policy scoping" (line 778). KEEP disabled. |
| 19 | `test.run` | REVERSIBLE_EFFECT (fail-closed) | NOBODY | Same throw. When implemented, hermetic test runs are reversible (ephemeral scratch). KEEP disabled until policy scoping exists. |
| 20 | `build.run` | REVERSIBLE_EFFECT (fail-closed) | NOBODY | Same throw. KEEP disabled. |
| 21 | `GET /discover`, `GET /stats`, `GET /health` | READ_ONLY | n/a (no auth!) | `/stats` and `/health` mount WITHOUT auth middleware (routes/capabilities.js: ~430, ~445). Info disclosure: agent profile list, usage stats. Low severity, but auth-inconsistent. |

### 1.1 Execution-envelope defects (apply to ALL 21)

These are the falsification targets. Each is code-verified:

- **E1 — No idempotency key.** Request contract is `{capability, parameters, scope}`.
  No client-supplied idempotency key; server performs no dedup. Duplicate delivery
  (client retry, MCP re-delivery, bridge replay) -> duplicate effect. For
  `git.commit`/`fs.write`/`git.checkout` that is data corruption, not a no-op.
- **E2 — Request ID is not unique and not a dedup key.** `_generateRequestId`
  (line 822): `req_<hash(capability, agentId, timestamp).substring(0,16)>`. Two
  identical requests inside one `constitutionalTimeAuthority.now()` tick produce
  the SAME id. And `capability_requests.request_id` is a PRIMARY KEY
  (`_createTables`, line 140): the second INSERT fails -> `_logRequest` catch ->
  in-memory fallback -> **executed twice, durably audited once** (console.log is
  the only trace of the second).
- **E3 — Nested status envelope: RESULT != VERIFIED OUTCOME.** On execution throw,
  `execute()` catches and returns `{status:'ok', result:{status:'error',
  error, code:'CAPABILITY_EXECUTION_ERROR'}}` (lines 458-474); the route returns it
  as HTTP 200 (routes/capabilities.js: ~60). Any client checking HTTP status or
  top-level `status` reads FAILURE as SUCCESS. ACK != EFFECT, and here even
  NACK looks like ACK.
- **E4 — No timeout in the execute path.** `execute()` awaits `_routeCapability`
  with no deadline. Profile `maxCommandTimeout` (30s/120s) is advertised in
  `/discover` limits but is not wired into `execute()` (no `Promise.race`, no
  AbortController anywhere in the file). A hung fs/git operation hangs the HTTP
  request indefinitely; the CALLER times out first and retries -> E1.
- **E5 — No retry (server-side).** Single attempt. This is the one correct
  instinct (no blind retry by the server), but combined with E4 it pushes retry
  responsibility to callers that have no reconcile-before-retry discipline.
- **E6 — Audit is best-effort, not a ledger.** `_logRequest` (line 784) INSERTs;
  on ANY Postgres failure it `console.log`s and appends to an in-memory array
  (lines 800-818) that dies with the process. `audit_status` is hardcoded
  `'SUCCESS'` even in fallback. There is no authorize->ledger->dispatch->confirm
  pipeline (memory gate rule, 2026-09-19); the actual pipeline is
  authorize->execute->maybe-log.
- **E7 — Authorization echo.** `execute()` returns the `authorization` block in
  the response (lines ~470, redacted in transit here). Echoing authz material
  back through the exterior API is unnecessary exposure surface.
- **E8 — Deny paths enforced, but size gate is client-asserted.** `deniedPaths`
  IS enforced in `authorize()` (line 382) — good. The `maxFileSize` gate keys on
  `parameters.size` (client-supplied) rather than the actual file size — a caller
  can understate it. Minor.

## 2. Unauthenticated HTTP mutation surfaces (fail-open) — P0

`bootstrap/gateway_runtime.js` mounts routes per-route auth. These mounts have NO
`exteriorAuthMiddleware` (verified lines 788-891; no global auth middleware
exists — line 122 is request logging only). The Pig gateway binds `0.0.0.0:8080`.

| Surface | Methods | Class | Notes |
|---|---|---|---|
| `/tenants` | POST register, PUT /:id update, DELETE /:id remove, POST /:id/heartbeat | CONSEQUENTIAL_EFFECT | LIVE-VERIFIED: `GET /tenants` -> HTTP 200, no auth (2026-09-23). Tenant registry is the TenantOS identity root; unauthenticated DELETE can remove a tenant. |
| `/deployments` | POST create, POST /:id/complete, /:id/fail, /:id/rollback | CONSEQUENTIAL_EFFECT | Class F (release) operations with zero auth. The capability matrix holds that NO role may release; the HTTP plane lets ANYONE rollback. Direct contradiction of standing law. |
| `/runtime` | POST register, POST heartbeat | NON_IDEMPOTENT_EFFECT | Runtime registry poisoning: a forged heartbeat/component registration corrupts the component inventory workers read. |
| `/reviews` | POST /sync, POST /:id/reply | CONSEQUENTIAL_EFFECT | Reply posts are EXTERNAL effects (customer-facing text). Unauthenticated. |
| `/customers` | POST /import, POST /, POST /:id/sync-email, POST /:id/sync-calendar | CONSEQUENTIAL_EFFECT | Customer PII ingestion + external sync triggers, unauthenticated. |
| `/projects` | POST /, POST /:id/artifacts | NON_IDEMPOTENT_EFFECT | Unauthenticated project/artifact creation. |
| `/ai-workspace` | POST /sentiment, /tag, /parse, /translate, /summarize | REVERSIBLE_EFFECT | Unauthenticated compute (resource abuse, prompt-injection surface into AI pipelines). |
| `/context`, `/system`, `/api/v1/repository` | GET (+mutations TBD) | UNKNOWN | No auth; full method audit deferred to swarm-15 (red team). Marked UNKNOWN -> fail closed. |
| `/ops`, `/governance`, `/constitution` | mixed | UNKNOWN | No auth observed at mount; needs per-route audit. UNKNOWN -> fail closed. |

Authenticated (correct): `/events`, `/canonical-events`, `/ingest`, `/missions`
(with explicit "TenantOS boundary" comment, line 910), `/ai`, `/connectors`,
`/api/v1/ollama`, `POST /capabilities`, `GET /capabilities/discover`.

**This is the wave's single biggest tool-safety finding.** The capability plane
itself is fail-closed and sound; the AROUND-it HTTP plane is fail-open for
exactly the consequential operations (tenant, deployment, release, customer
external effects) that standing law reserves to human authority.

## 3. Worker CLI tools (capability-matrix classes, not gateway)

Per `~/workspace/autonomous-missions/CAPABILITY-MATRIX-2026-09-23.md` §1:

| Tool | Class | Bound |
|---|---|---|
| `git` (fetch/clone/pull, unauthenticated) | IDEMPOTENT_EFFECT | content-addressed mirror cache; re-fetch is a no-op |
| `git push` | CONSEQUENTIAL_EFFECT | PROHIBITED for all roles |
| `npm run build`, `tsc` | REVERSIBLE_EFFECT | bounded, worktree-scoped, wall-clock + resource caps |
| test runners (jest/vitest) | REVERSIBLE_EFFECT | hermetic, scratch DB only (`ping-test-pg`), kill-switch |
| `docker logs/inspect/events` | READ_ONLY | observability only; `docker restart/exec-write` PROHIBITED |
| `curl` to plane endpoints | READ_ONLY | health/metrics; Class A receipted |
| `psql SELECT` (whitelisted) | READ_ONLY | counts/timestamps; no direct writes ever |
| `ssh` (Pig/Oracle hops) | CONSEQUENTIAL_EFFECT | human-operated only; workers never hold it |

## 4. Internal-only (not exterior-reachable)

Temporal activities (`activities/`: mission, replay, repository, compiler,
knowledge, reflection) are thin wrappers around authorities, invoked in-process
by the worker runtime. Not reachable by exterior autonomous workers. KEEP as-is;
no second activity system may be created.

## 5. Out of scope (hard exclusion)

`src/fyd/**`, the Next.js BFF routes (`/api/fyd/*`, `/api/ping/*`), and the
FYD user-facing grant authority (`src/lib/ping/grants.ts`) are the FYD product
surface — excluded by coordinator directive. The 66 uncommitted FYD files in the
main worktree were not touched.

---

## 6. Mechanism verdicts (KEEP / PROPAGATE / REFACTOR / REPLACE / DROP)

| Mechanism | Verdict | Rationale |
|---|---|---|
| `CapabilityAuthority` authorize-then-route (fail-closed unknown agent/capability) | KEEP | Sound default-deny; the ONE capability authority, no competitor. |
| `command.run` / `test.run` / `build.run` / `git.push` / `logs.read` disabled | KEEP | Correctly fail-closed; matches 2026-09-19 memory. |
| `deniedPaths` enforcement in `authorize()` | KEEP | Actually enforced (line 382). |
| Discover catalog (`GET /discover`) | REFACTOR | Lies about `git.branch` (lists, not creates) and `fs.patch` (throws on every call). Catalog must be generated from implementation truth, not hand-written. |
| Nested status envelope | REFACTOR | Normalize at the guard layer: inner `result.status` decides; never surface `ok` wrapping `error`. |
| Request ID | REFACTOR | Keep for tracing; ADD client-supplied idempotency key with server-side dedup for non-idempotent classes. |
| Audit logging (`_logRequest`) | REFACTOR | Fail CLOSED on audit failure (halt, don't silently go in-memory); never hardcode `audit_status='SUCCESS'` in fallback. |
| Execute path (no timeout/retry/idempotency) | REFACTOR | Add at the NEW guard layer (`src/tenanos/tool-safety/`), not by forking the authority. |
| `fs.write` non-atomic blind overwrite | REFACTOR | Atomic write (tmp+rename) + expected-content-hash precondition. |
| `git.commit` (`git add .` whole worktree) | REFACTOR | Scope to explicit paths; return staged file list for verification. |
| Unauthenticated mutation mounts (`/tenants`, `/deployments`, `/runtime`, `/reviews`, `/customers`, `/projects`, `/ai-workspace`) | REPLACE | Add `exteriorAuthMiddleware` — one-line per mount, but behavior-changing on a live server: coordinator/human decision, NOT a silent wave diff. Reported as P0. |
| `fs.patch` wiring (`createPatch(parameters)` vs 3-arg signature) | REFACTOR | Fix call signature or mark NOT_IMPLEMENTED honestly. |
| Authorization echo in responses | REFACTOR | Stop echoing authz material. |
| `parameters.size` client-asserted gate | REFACTOR | Stat the file server-side. |
| Any second orchestrator / event authority / capability system | DROP | None found; none may be created. This swarm creates none. |

## 7. Invariants (binding on the wave's execution loop)

1. **ACK != EFFECT.** A returned `ok`/HTTP 200 is a transport acknowledgment, not
   proof of effect. (E3 proves the current envelope violates this.)
2. **RESULT != VERIFIED OUTCOME.** A result object is a claim; the outcome is
   verified only by independent re-observation (re-read the file hash, re-list
   the commits). Verification is a separate step, never skipped for
   NON_IDEMPOTENT/CONSEQUENTIAL classes.
3. **RETRY != IDEMPOTENCY.** Retrying is not safe unless the operation is proven
   idempotent AND carries the same idempotency key AND the pre-state is confirmed
   unchanged. **No blind retry after an ambiguous external effect — ever.**
4. **UNKNOWN fails closed.** Unclassified tools, unaudited routes, and ambiguous
   outcomes deny autonomous action. The wave's loop must carry an explicit
   `OUTCOME_UNKNOWN` state (cf. product truth model, 2026-09-21) — it is a real
   state, not a gap to paper over.
5. **RECONCILE BEFORE RETRY.** After any ambiguous outcome: read current state,
   compare against intent, then decide (proceed / skip-as-done / escalate).
   Never re-dispatch on a timeout.

## 8. Falsification tests

`SIDE-EFFECT-TESTS/` contains 10 executable harnesses (Node, no dependencies)
plus a faithful `fake-capability-server.js` reproducing the observed `execute()`
semantics (nested envelope, no dedup, no timeout, derived request IDs, audit
fallback). Each harness runs the scenario in LEGACY mode (current handling:
trust top-level status, blind retry) and GUARDED mode (the proposed
`src/tenanos/tool-safety/fail-closed-guard`), and asserts the invariant:
LEGACY must VIOLATE it (falsifying "current handling is safe"), GUARDED must
HOLD it. `run-all.sh` runs the suite. See `SIDE-EFFECT-TESTS/README.md`.

| # | Harness | Falsifies |
|---|---|---|
| 01 | duplicate-request | duplicate delivery -> duplicate effect (E1, E2) |
| 02 | timeout-after-side-effect | timeout -> blind retry -> double/corrupt effect (E4, E5) |
| 03 | server-disappears | connection drop mid-flight -> assumed-failure retry (E5) |
| 04 | malformed-response | garbage bytes -> misclassified outcome |
| 05 | schema-drift | catalog says create-branch/patch; reality differs |
| 06 | oversized-response | size gate (control: existing gate HOLDS) |
| 07 | tool-lies | `{ok, result:{error}}` read as success (E3); `success:true` without verification |
| 08 | result-after-cancellation | late result applied to superseded attempt |
09 | credential-missing | unknown agent denied (control: fail-closed HOLDS) |
| 10 | capability-revoked | mid-run revocation takes effect immediately |

SUPERSEDED (2026-09-24): the standalone `SIDE-EFFECT-TESTS/` Node harnesses
were never written before the 2026-09-24 daemon restart (directory found
empty on resume). They are NOT recreated; the 10 harnesses live directly as
the jest ports in `src/tenanos/__tests__/tool-safety-side-effects.test.ts`
(proposal P-20260923-090), which is the executable artifact. The table above
remains the harness-to-invariant mapping.

## 9. Proposed diffs

`~/workspace/tenanos-wave/diffs/P-20260923-090.diff` creates
`src/tenanos/tool-safety/` (canonical root, no competing roots):
- `tool-classification.ts` — this registry as typed data (every tool, class, evidence, retry policy, confirmation requirement).
- `fail-closed-guard.ts` — enforcement: classification lookup (UNKNOWN->deny),
  idempotency-key requirement for NON_IDEMPOTENT/CONSEQUENTIAL, nested-envelope
  normalization, timeout->OUTCOME_UNKNOWN, retry only for READ_ONLY/IDEMPOTENT/
  REVERSIBLE, reconcile-before-retry, late-result discard, fail-closed audit.
- `src/tenanos/__tests__/tool-safety-side-effects.test.ts` — jest ports of the
  10 harnesses (runnable under the scoped `src/tenanos/jest.config.cjs`).
  Placed at `src/tenanos/__tests__/` (NOT `src/tenanos/tool-safety/__tests__/`)
  because the scoped config's testMatch is `src/tenanos/__tests__/*.test.ts`
  only; a nested `__tests__` dir would never run.

Resume notes (2026-09-24, SWARM-04 re-spawn after daemon restart):
- The checkpoint's earlier §8 described `SIDE-EFFECT-TESTS/` (10 Node harnesses
  + README) as existing and §9 named proposal P-20260923-004 as filed. On
  resume, `SIDE-EFFECT-TESTS/` was EMPTY and no 004 diff or STATE.json entry
  existed: the previous worker completed this document but not the artifacts.
  Nothing was re-done; the classification stands. The harnesses were built
  directly as the jest ports inside this proposal (superseding the standalone
  Node harnesses, which are not recreated). Per fresh wave directive, the new
  proposal id is P-20260923-090 (09X series), not P-20260923-004.
- STATE.json entry staged at `~/workspace/tenanos-wave/swarm-04/STATE-ENTRY-P-20260923-090.json`
  for the coordinator to apply (coordinator owns STATE.json; swarm does not mutate it).
- Overlap check (swarm-19/check-overlap.py, run against a temp STATE copy with
  the entry appended): NO overlap for P-20260923-090. The two reported hits are
  pre-existing swarm-08<->swarm-08 collisions (082/084, 087/088), unrelated.
- Local verification (sandbox scratch, ts-jest strict, tsconfig mirroring the
  scoped config): 12/12 tests pass. Falsification held in every harness:
  legacy mode violated, guarded mode held. One real harness bug was caught and
  fixed during verification: the fake server's transport-drop was thrown
  inside the envelope try/catch, so it never actually dropped; the drop now
  bypasses the envelope (transport layer vs application layer), which is
  exactly why OUTCOME_UNKNOWN exists as a state.
- The unauthenticated-mount P0 (section 2) is reported, not diffed: adding auth
  middleware to live mounts is a behavior change for the coordinator/human.
