# REACHABILITY — Test + Runtime Reachability Archaeology

**Sprint:** PING constitutional convergence, night shift (forensic, READ-ONLY)
**Date:** 2026-09-23 ~19:35–20:00 MDT
**Investigator scope:** test inventory + CI reality + live runtime reachability on the Pig
**Binding rules honored:** no writes to either repo base (COMMITS CREATED: NONE), no process restarts, no secret values printed, passive observation only (`ps`, `ss`, log tails, config reads, docker inspect). One exception explicitly allowed by the task: plain GETs to the gateway's documented `/health` endpoints (`gateway/api_controller.js:52`, `gateway/simple_server.js:71`).
**Pig transport:** `ssh -F /home/hatch/.ssh/pig-config pigwsl 'wsl -- bash -s'` with stdin-fed scripts (avoids nested-quoting breakage).

**Bases:**
- (a) ADAPTER `/home/nolan/projects/ping-constitutional` — HEAD `a69bb68f`, working tree CLEAN (verified 0 dirty).
- (b) CANONICAL CORE `/home/nolan/ping` — live runtime home, touched read-only.
- Served site (found during investigation): `/home/nolan/projects/ping` — HEAD `e48ef710`, **4 dirty files** (`M package.json`, `M src/app/build/[siteId]/page.tsx`, `M src/app/globals.css`, `M src/app/layout.tsx`, `M src/app/o/[objectId]/page.tsx`), committed 2026-09-23 07:32 MDT. It is an ancestor of the sprint HEAD, **2 commits behind** (`git merge-base --is-ancestor` confirmed; `git log e48ef710..a69bb68f | wc -l` = 2). `diff -rq` of `src/fyd/social` between the two checkouts: **no differences** — the social write-authority lane is identical in both.

**Correction to my own method (recorded so the morning crew doesn't repeat it):** counting `expect(` per file is a broken heuristic. Five adapter test files show zero `expect()` calls but assert heavily via `node:assert/strict` (refresh `diff`/`conflict`/`dependency-index`/`website-observe`: 15–19 asserts each; `resolve/spike`: full assert suite). Classification below is based on reading the files, not the heuristic.

---

## 1. Test inventory

### Adapter (`ping-constitutional`) — jest, TypeScript
- **~128 test files** (`src/**/__tests__/*.test.ts[x]`; enumerated 130 by name scan, 126 by strict find — call it ~128).
- `package.json` `"test": "jest"` — but **no jest config at repo root** (no `jest.config.*`, no `package.json` "jest" key — verified via python json parse).
- The ONLY jest config in the repo: `src/jest.config.cjs`, whose header says it is "Scoped to this test only" with `testMatch: ["<rootDir>/src/__tests__/middleware-sites.test.ts"]`. So **127 of ~128 test files have no runnable harness**.
- No `vitest` anywhere (no dep, no config). No `node_modules` on the Pig for the adapter.
- **Zero CI workflows**: `.github/workflows/` does not exist in the adapter repo.

### Core (`/home/nolan/ping`) — pytest/unittest (Python) + node scripts (JS)
- `tests/*.py` (6 files): `test_constitutional_audit.py`, `test_constitutional_operating_mode.py`, `test_constitutional_planner.py`, `test_intent_graph.py`, `test_mission_graph.py`, `test_runtime_authority_boundaries.py`.
- `tests/certification/` (14 files): 9× `.test.js` (`adapter_contract`, `artifact_immutability`, `authority_purity`, `certification_validation`, `event_validation`, `infrastructure_swap`, `lineage_validation`, `publication_validation`, `replay_determinism`) + 5× `.test.ts` (`replay-determinism-1000x`, `replay-mutation`, `replay-ordering-fuzz`, `replay-unicode`, `replay-witness-regeneration`) + `generate-corpus-vectors.ts`. Corpus fixtures in `tests/corpus/` (`minimal_replay.json`, `multi_event_replay.json`, `lineage_replay.json`, `unicode_replay.json`, `violation_replay.json`).
- `test/*.test.js` (6 files): `constitutional_failure`, `constitutional_replay`, `cross_machine_replay`, `multi_vendor_validation`, `ollama_replay`, `replay_stress` + runner `test/run_constitutional_pipeline.js`.
- Root `_test_*.py` (10 files: `_test_auth`×4, `_test_lineage`×4, `_test_pipeline`×3) + `test_event_ingestion.py`: **NOT TESTS** — print-based probe/seed scripts, zero assertions. They hardcode container paths (`/app/runtime/...`, `docker exec brain-postgres`, db `crx_runtime`) and are operational tooling, not a suite.
- No pytest config (`pytest.ini`/`setup.cfg`/`pyproject.toml`/`tox.ini` all absent). No `node_modules` at core root.
- `package.json` scripts: `"test": "pnpm -r test"`, `"test:constitutional-pipeline": "node test/run_constitutional_pipeline.js"`. **There is no `replay:test` script** (referenced by CI — see §2).
- `evals/constitutional-runtime/` exists; not inventoried (caveat).

---

## 2. Test classification (representative sample, file:line-cited)

**Verdict key:** REAL PROOF = asserts behavior against the real mechanism · SMOKE = runs the real code but asserts only shape/wiring · DECORATIVE = name-matches a constitutional claim it does not exercise (or cannot even load its subject).

| # | Test file | Domain | Target: real or stand-in? | Verdict | Evidence |
|---|---|---|---|---|---|
| A1 | `src/fyd/object/__tests__/owner-events.test.ts` | event / replay | REAL `owner-events` + `owner-store` (tmpdir) | **REAL PROOF** | Asserts: fold-twice byte-identical (`bytes1).toBe(bytes2)`), replay digest == live `readOverrides` digest, append-only revert keeps both events, unknown event types throw. 11 its / 52 expects. Caveat: proves the *local owner log's* replay, not the gateway journal's. |
| A2 | `src/fyd/identity/__tests__/principal.test.ts` | identity | REAL `principal` + REAL `InMemoryIdentityBindingStore` | **REAL PROOF** | 15 its / 36 expects: derivation determinism, no-merge-on-email, link idempotency, last-method-unlink refused. Durable store covered separately by `file-store.test.ts` (real file writes, tmpdir). |
| A3 | `src/fyd/identity/__tests__/session.test.ts` | identity | REAL `session.ts` (HMAC cookies + CSRF) | **REAL PROOF** | 18 its / 27 expects against real session module incl. `verifyCsrfToken`, cookie round-trip. |
| A4 | `src/fyd/claim/__tests__/machine.test.ts` | execution (claim) | REAL `machine` + REAL `store` | **REAL PROOF** | Transitions OBSERVED→CLAIMED→VERIFIED-CONTROLLED, immutability of inputs, fail-closed guards, write/read round-trip, corrupt-file → null (fail honest). 15 its / 39 expects. |
| A5 | `src/fyd/claim/__tests__/seam.test.ts` | execution | REAL `verification-seam` | **REAL PROOF** | Asserts the honest-labeling contract itself ("not a cryptographic proof"); modest, genuine. |
| A6 | `src/fyd/ask/__tests__/ask-fyd.test.ts` | capability / authz | REAL `grantsForViewer` + REAL `planActions` | **REAL PROOF** | Lines 304–330: non-owner denied `site.propose`; owner bundle yields `propose_site_patch`; `FORBIDDEN_AGENT_EFFECTS` never agent-authorized. The grant authority (authority-map #10) IS covered — through this file, not a dedicated grants test. |
| A7 | `src/lib/ping/__tests__/lane-a.test.ts` | capability | REAL `action-planner`, `feed-rank`, `ask-composer` | **REAL PROOF** | 14 its / 28 expects on pure planner functions. |
| A8 | `src/fyd/ui/__tests__/capability-runtime.test.ts` | capability | REAL client runtime; **mocked fetch** | **REAL PROOF (client) / SMOKE (wire)** | Header is honest: "fetch is mocked here. The dev-server round-trip (Lane A step 4) proves the real wire." Proves request shaping + fail-closed fallback, not server execution. |
| A9 | `src/app/api/fyd/ask/__tests__/route.test.ts` | replay / read | pipeline logic vs **stub journal** (`./stub-journal`) | **REAL PROOF (logic) / SMOKE (journal seam)** | 15 its / 70 expects on `answerAskFyd` — but the journal is a stub, so this never touches the gateway journal path that is broken tonight (§4, G1). |
| A10 | `src/fyd/tenant/__tests__/d-worker.test.ts` | execution | REAL tenant-context guard; **worker is simulated in-test** | **REAL PROOF (guard) / DECORATIVE (worker claim)** | The "worker job" (`runOwnerWorkerJob`) is defined inside the test file itself; no real worker module is exercised (consistent with authority-map: worker machinery #36–38 is DORMANT). Proves `requireTenantContext`/`tenantScopedDir` fail-closed, not that any worker runs. |
| A11 | `src/fyd/refresh/__tests__/website-observe.test.ts` (+ `diff`, `conflict`, `dependency-index`) | event / observe | REAL extractor (`node:assert`, fixture HTML) | **REAL PROOF (extractor) / DECORATIVE (system claim)** | 4 tests / 19 asserts: provenance, determinism, no-fabrication — genuine. But the refresh lane has **no live callers** (authority-map #44 DORMANT), so at system level the "refresh" name overclaims. |
| A12 | `src/fyd/resolve/spike/__tests__/resolve.test.ts` | entity resolution | REAL `normalize`/`matchers`/`resolve` + real pipeline rows | **REAL PROOF** | Verbatim outreach-pipeline rows, tier decisions, provenance, determinism. (Zero `expect()` — all `node:assert`.) |
| C1 | `tests/test_runtime_authority_boundaries.py` | capability / execution | REAL `runtime.authorities.*` + `scripts.*`; **adapters are recording stubs** | **REAL PROOF (routing seam)** | 18 tests assert real behaviors (config immutability, KnowledgeEventBus file emission, planner DAG, ROI math). Execution/capability claims proven at the *routing* seam only — `ExecutionAuthority` is tested through a `RecordingAdapter`, not a real executor. |
| C2 | `tests/test_constitutional_planner.py` | execution | REAL `build_plan` | **SMOKE** | One test, shape-only (`plan["ok"]`, dag non-empty, an Authority node exists). |
| C3 | `tests/certification/replay_determinism.test.js` | replay | REAL `ping-runtime/authorities/deterministic_id_authority` | **REAL PROOF** | **Executed tonight on the Pig: PASSED, exit 0** (2026-09-23 ~19:55 MDT). Notes: exercises a *deprecated* API (`generateIdFromObject` → deprecation warning points at `IdentityAuthority.generateFromCanonicalHash()`); still honored. |
| C4 | `test/constitutional_replay.test.js` + `constitutional_failure`, `cross_machine_replay`, `multi_vendor_validation`, `replay_stress` | replay | **subject module does not exist** | **DECORATIVE (dead)** | All five `require('../gateway/adapter_compiler')`; only `gateway/adapter_compiler_v2.js` exists on disk. They crash at require time. `run_constitutional_pipeline.js` spawns 4 of them → the whole `test:constitutional-pipeline` command is dead. |
| C5 | `tests/certification/replay-determinism-1000x.test.ts`, `replay-mutation.test.ts`, `replay-witness-regeneration.test.ts` (+ ordering-fuzz, unicode) | replay | **import targets are an empty directory** | **DECORATIVE (dead)** | Import from `../../runtime/replay/*` (`replay_event_stream`, `canonical_event_envelope`, `deterministic_replay_engine`, `invariant_runner`, `witness_authority`) — `/home/nolan/ping/runtime/replay/` **exists but is empty**. The 1000x determinism test cannot load. |
| C6 | `test_event_ingestion.py`, `_test_auth*.py`, `_test_lineage*.py`, `_test_pipeline*.py` | — | n/a | **NOT TESTS** | Seed/probe scripts; zero assertions; print-based. |
| GAP | `src/fyd/social/*` (actions.ts, envelope.ts, attestation-gate.ts, readers.ts) | social write authority | — | **NO TESTS AT ALL** | `ls src/fyd/social/__tests__` → "NONE". The CANONICAL_LIVE social write path (authority-map #12/#13/#19) has zero test coverage. |

**Do-not-equate-passing-with-proof notes:**
- A9's 70 expects and A10's guard tests will pass while the systems they name (live journal replay; a real worker fleet) do not exist or are dark.
- C3 passes against a deprecated API — proof the old path still works, not proof the new `IdentityAuthority` path is exercised (it isn't, by this file).
- The adapter's ~128 files: only A-config (`middleware-sites.test.ts`) is runnable today; the rest are unrunnable-but-likely-genuine (spot-checked) — "passing" is currently unobservable for 127 files.

---

## 3. CI reality

### Adapter: NOTHING runs in CI.
- No `.github/workflows/` directory exists in `ping-constitutional`.
- `npm test` = bare `jest` with no root config; the only config (`src/jest.config.cjs`) covers 1 of ~128 files; no `node_modules` installed. **Verdict: the adapter has no CI and no currently-runnable full suite.**

### Core: 8 workflows, all push/PR-triggered, NO schedules.
| Workflow | Trigger | What it runs | Status vs reality |
|---|---|---|---|
| `constitutional_ci.yml` | push, PR | `npm ci` → `npm run build` → `npm test` → then jobs running `node test/replay_corpus_test.js`, `node test/verify_corpus.js`, `node test/generate_certificates.js`, `node test/compare_certificates.js`, `node test/fuzz_test.js`, `node test/verify_determinism.js` | **BROKEN**: all six `test/*.js` scripts are **MISSING** from the repo (verified). These jobs fail at step 1 after checkout. |
| `replay-integrity.yml` | push, PR | `npx ts-node tools/dependency-guard/dependency-validator.ts runtime/replay` → `npm run replay:test` → forbidden-import check | **BROKEN**: `replay:test` script does not exist in root `package.json`; `runtime/replay` is an empty dir (validator has nothing to validate). |
| `constitutional-pipeline.yml` | push, PR | (pipeline steps) | UNVERIFIED in depth |
| `constitutional-ops.yml` | push, PR | `python scripts/constitutional_query.py show VerifyReplay` | Script exists; UNVERIFIED execution |
| `freeze.yml` | push, PR | `pnpm install` → `pnpm build` → `pnpm test` | `test` = `pnpm -r test` exists |
| `constitutional-learning-loop.yml`, `constitutional-operating-mode.yml`, `intent-graph.yml` | push, PR | — | Not examined in depth |

**Last-green-run: UNVERIFIABLE.** No `gh` CLI on the Pig, no run records accessible from the sandbox, no local CI logs found. The workflows' *content* shows at least two would fail on a fresh push (missing scripts, missing npm script). Python tests have no CI job and no pytest config at all.

---

## 4. Live runtime reachability (Pig, 2026-09-23 ~19:35–20:00 MDT, passive)

### Serving topology tonight

```
Browser (Nolan's phone) ──► :3100  next-server  (/home/nolan/projects/ping, HEAD e48ef710, 4 dirty files)
                              :3101  next-server  (/home/nolan/projects/ping-deploy-head, HEAD 0dec40f5)
                              :3210  next-server  (/home/nolan/projects/ping-fyd-deploy, HEAD ade4ee50)
                                    │
                                    │  PING_GATEWAY_BASE_URL / FYD_*_GATEWAY_URL: UNSET on all three
                                    │  (46 env vars readable in /proc/87920/environ, 0 gateway matches;
                                    │   no .env / .env.local in served checkout)
                                    ▼
  ┌─ main gateway path:  GatewayNotConfiguredError (PING_GATEWAY_BASE_URL required,
  │                       ping-object-reader.ts:240-243 throws when unset)
  │                       → all 7 api/ping/* + 7 api/practice/* routes DOWN
  ├─ social write path:   fydGatewayBaseUrl() → default http://127.0.0.1:18199
  │                       (src/fyd/social/config.ts:15-20)
  │                       → NOTHING listening on 18199 → connection refused
  │                       → api/fyd/social/* writes DOWN
  └─ ask journal path:    fydJournalBase() → default http://127.0.0.1:18199
                          (ping-object-reader.ts:264) → GatewayUnreachableError
                          → fyd-tenant-graph.ts:186-192 throws FydTenantGraphError("reader_failed"),
                            NO fixture fallback → api/fyd/ask journal-overlay path DOWN
                          (public pages unaffected: they read dump JSON from
                           /home/nolan/ping/var/fyd-projections/*.json)
```

### What's actually running

| Component | Address | State (observed) |
|---|---|---|
| next-server (served site) | *:3100, cwd `/home/nolan/projects/ping`, pid 87920 (`sh -c next start -p 3100`) | RUNNING — renders from dump JSON; gateway surface dark (above) |
| next-server | *:3101, cwd `/home/nolan/projects/ping-deploy-head`, pid 3288 | RUNNING — also 0 gateway env vars |
| next-server | *:3210, cwd `/home/nolan/projects/ping-fyd-deploy`, pid 16302 | RUNNING — also 0 gateway env vars |
| **ping-gateway** (canonical) | *:8080, image `ping-gateway:devin-boundary2`, up 33h (since 2026-09-22 16:54 UTC) | **HEALTHY** — `GET /health` → `{"status":"healthy",...}` (uptime ~116489s). EventBridge polling alive (`canonical query returned 0 rows`, 0 unprocessed). **Nothing points at it.** |
| ping-rc-gateway | 127.0.0.1:18099, image `ping-gateway:rc-4d522a6b`, up 33h | RUNNING but `GET /health` → **`{"status":"unhealthy",...}`** (gateway sub-component healthy; overall unhealthy — truncated detail) |
| brain-postgres | *:5432 | RUNNING (33h) |
| ping-postgres | *:5433 | RUNNING (33h) |
| ping-rc-postgres | 127.0.0.1:15433 | RUNNING (33h) |
| ping-test-pg | *:55433 | RUNNING (33h) |
| ping-gauntlet-pg | 127.0.0.1:54339 | RUNNING |
| swarm02-pg | *:55434 | Up 3 seconds at observation (flapping or just restarted) |
| brain-qdrant | *:6333–6334 | RUNNING (33h) |
| ping-qdrant | :6333 | Docker tag "unhealthy" = **broken healthcheck** (`curl` not installed in container; FailingStreak 11559). Actually SERVING: `GET :6333/` → `{"title":"qdrant - vector search engine","version":"1.18.2",...}` |
| ping-redis | *:6379 | healthy (33h) |
| ping-vault | *:8200 | Docker tag "unhealthy" = **healthcheck misconfig** (checks `https://127.0.0.1:8200` but vault serves plain HTTP). Underlying state unknown from passive read. |
| ollama | *:11434 | RUNNING (33h) |
| open-webui | *:3001 | healthy (33h) |
| cosyvoice-tts | *:5001 | RUNNING (33h) |
| **FYD journal gateway** (:18199 — the adapter's sprint-demo default) | — | **NOT RUNNING. Nothing listens on 18199.** |
| WitnessWorker / CapabilityAuthority / IdentityAuthority (canonical, in `/home/nolan/ping`) | — | Not separately visible as OS processes; they live inside the gateway container / `ping-runtime`. Not individually enumerated (read-only scope). |

**No Python gateway/worker processes** visible in `ps` outside containers; no `postgres`/`qdrant` binaries running on the WSL host itself (all containerized via docker-desktop proxy).

---

## 5. Reachability gaps

### A. Architecture claims LIVE but NOT running / not reachable tonight
- **G1 — The adapter's gateway seam is dark on all three live servers.** `PING_GATEWAY_BASE_URL` unset → `GatewayNotConfiguredError` on 14 BFF routes; social + journal paths default to phantom `127.0.0.1:18199` with nothing listening. The site *looks* alive (dump-JSON pages render) while its interactive/constitutional surface (writes, Ask FYD journal path, practice lane) is down. The healthy canonical gateway on :8080 has zero clients.
- **G2 — FYD journal gateway (port 18199) does not exist as a running service.** `src/fyd/social/config.ts:20` calls it a "sprint demo default… repo-booted PING gateway on the Pig (see h2-proof)" — the demo default outlived whatever booted it.
- **G3 — RC gateway on :18099 reports overall `unhealthy`** via its own `/health` (started same minute as the healthy main gateway; purpose unknown from passive observation).
- **G4 — Served site lags the sprint worktree** by 2 commits and carries 4 dirty files (`package.json`, build/[siteId], globals.css, layout, o/[objectId]) — tonight's live surface is not the audited HEAD `a69bb68f`.

### B. Running components with NO test coverage at all
- **B1 — `src/fyd/social/*`** (the CANONICAL_LIVE social write authority: actions, envelope, attestation-gate, readers): zero test files. The attestation gate that the authority-map calls the "C4 failure-honesty gate" is asserted nowhere.
- **B2 — The gateway itself** (`/home/nolan/ping/gateway/`): only `gateway/tests/adapter.mock.test.js` found; the live `api_controller.js` `/health`, `/events`, `/identities` routes have no observed test coverage. (Not exhaustively inventoried — gateway/tests listing was partial.)
- **B3 — The `dump.py` projection writer** (PING side, feeds `/home/nolan/ping/var/fyd-projections/`): no test observed from either base; the adapter verifies digests on read (ping-object-source.ts) but nothing tests the writer.
- **B4 — ping-rc-gateway / RC postgres / gauntlet / test postgres instances**: running infra with unknown purpose and no observed tests.
- **B5 — `runtime/replay/` is an empty directory** while 5 certification test files and the `replay-integrity` CI job are written against it: the replay kernel the CI claims to guard does not exist on disk.

### C. Health-signal lies (don't trust the tags)
- ping-qdrant "unhealthy" = missing `curl` in the healthcheck, not an outage (serves 1.18.2).
- ping-vault "unhealthy" = https-vs-http healthcheck mismatch.
- A green `npm test` (if it could run) would prove nothing about the 127 unrunnable files.

---

## 6. Morning proof ladder — REAL vs DECORATIVE execution paths

### REAL (counts as execution-path proof; run in this order)
1. **Canonical gateway liveness:** `curl -s http://localhost:8080/health` → expect `"status":"healthy"`. (Ran tonight: healthy, uptime ~116489s.) This is the only live canonical authority endpoint verified tonight.
2. **Replay determinism (core):** `cd /home/nolan/ping && node tests/certification/replay_determinism.test.js` → expect `✅ Replay Determinism Test: PASSED`, exit 0. (Ran tonight: PASSED. Note: exercises deprecated `deterministicIdAuthority`; pair with a run against `IdentityAuthority.generateFromCanonicalHash()` for the current path.)
3. **Adapter runnable suite:** `cd /home/nolan/projects/ping-constitutional && npx jest --config src/jest.config.cjs` → the one configured suite (`middleware-sites.test.ts`). Requires `node_modules` (absent on Pig — `npm ci` first, or run where deps exist).
4. **Authority routing (core):** `cd /home/nolan/ping && python3 -m pytest tests/test_runtime_authority_boundaries.py -q` → REAL PROOF of the authority-routing seam (adapters stubbed by design). No pytest config exists; may need `PYTHONPATH=/home/nolan/ping`.
5. **BFF seam, positive proof:** with `PING_GATEWAY_BASE_URL=http://localhost:8080` exported, `GET http://localhost:3100/api/ping/object?id=<known-public-id>` → expect 200 with a sanitized projection. **Negative proof (runnable tonight with zero config):** the same GET without the env var → expect `GatewayNotConfiguredError` surfacing as 500 — proves the seam is dark, honestly.
6. **Journal-overlay path, negative proof:** `POST http://localhost:3100/api/fyd/ask` with a siteId → expect `FydTenantGraphError: reader_failed` (overlay fetch to phantom :18199). After a journal gateway is actually stood up on :18199 (or `FYD_JOURNAL_GATEWAY_URL` pointed at a live journal), the same POST becoming 200 with overlay-derived answers is the positive proof.
7. **Qdrant reality check:** `curl -s http://localhost:6333/` → version JSON. Proves serving despite the docker "unhealthy" tag.

### DECORATIVE (do NOT accept as proof — each verified broken/misleading tonight)
- `npm test` in `ping-constitutional` (no root jest config; 127/128 files unrunnable).
- `npm run test:constitutional-pipeline` / `node test/run_constitutional_pipeline.js` (5 subjects crash at `require('../gateway/adapter_compiler')` — module absent).
- `npm run replay:test` (script does not exist).
- Any CI badge from `constitutional_ci.yml` / `replay-integrity.yml` (reference 6 missing `test/*.js` scripts + missing npm script; last-green UNVERIFIABLE — no `gh`, no run records).
- `python3 test_event_ingestion.py` or any `_test_*.py` (zero assertions; seed/probe scripts).
- `src/fyd/tenant/__tests__/d-worker.test.ts` passing (proves the tenant guard; the "worker" is defined in-test).
- `src/app/api/fyd/ask/__tests__/route.test.ts` passing (stub journal, not the gateway).
- Docker health tags on `ping-qdrant` / `ping-vault` (healthcheck misconfigurations, not state).
- The served site rendering correctly (dump-JSON pages render with the entire gateway surface dark).

---

## 7. Caveats / open threads for the coordinator
- `evals/constitutional-runtime/` was not inventoried; `tests/test_constitutional_audit.py`, `test_intent_graph.py`, `test_mission_graph.py`, `test_constitutional_operating_mode.py` were counted but not read (sample covered planner + boundaries).
- Gateway internals (`/home/nolan/ping/gateway/*.js`, `ping-runtime/`) were enumerated only to the depth needed for require-resolution and `/health`; the authority-map's open question (gateway `identity_<16hex>` vs uuidv5 bridge) is untouched by this pass.
- The canonical journal's sequencing/idempotency rules remain unverified from here (same blind spot the authority-map flagged).
- `ping-rc-gateway`'s overall-unhealthy `/health` detail was truncated; needs a follow-up read of the full payload.
- No Python test was executed (only the node replay test); pytest runs are listed in the ladder as morning work.
- All Pig commands were batched stdin scripts; raw outputs + the evidence corpus live in `~/workspace/constitutional-sprint/reachability/` (`adapter-scan.out`, `core-scan*.out`, `live-scan*.out`, `evidence/`, `test-evidence.txt`, `scan-*.sh`).

**One-line summary for the morning:** the canonical gateway is healthy on :8080 with zero clients; all three live Next servers have no gateway configured so 14 BFF routes, all social writes, and the Ask FYD journal path are dark behind a rendering site; 5 of 6 core replay tests and 5 certification replay tests cannot load their subjects (missing `gateway/adapter_compiler`, empty `runtime/replay/`); the adapter's ~128 jest files have no runnable harness and no CI; CI workflows reference scripts that don't exist; last-green is UNVERIFIABLE.
