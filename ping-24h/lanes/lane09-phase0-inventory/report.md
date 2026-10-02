# LANE 9 PHASE 0 INVENTORY REPORT — PING 24h Program (T+0 to T+1)

Status: **HYPOTHESIS** — read-only observations from the live Pig WSL, not replayed from a clean checkout. T+0 = 2026-09-28 14:26 MDT. All Pig access via `~/workspace/pig-fb/pigwsl-exec.sh -s`. Nothing written to any tree; no restarts; no secrets read or printed. Raw probe outputs: `raw/r1-*.txt` through `raw/r11-*.txt` in this directory.

## 1. PING CANONICAL TREE

- Path: `/home/nolan/projects/ping` (Pig WSL)
- Branch: `hardening/2026-09-28-vocab-ssrf`
- HEAD: `0264d517ea53358d9246ddbbba66bb9dd0beb0d4` — 2026-09-28 05:59:49 -0600, Pigi, "hardening: fail-closed vocabulary gate + SSRF effective-destination boundary" (touches src/fyd/net, src/fyd/proceduralize)
- Upstream: NONE. Ahead/behind: N/A (no comparison possible).
- Dirty: 74 unstaged modified tracked files, 0 staged, 2708 untracked individual files (144 porcelain lines including collapsed untracked dirs).
- Dirty by area: src/fyd 42, src/app 27, src/lib 3, tools/fyd-journal-gateway 1, src/components 1.
- Last 15 commits (all author Pigi unless noted): 0264d517 (vocab+SSRF hardening, 09-28), 9ea3e6a6 (Merge harvest/2026-09-28 microdata), 65e99756 (track root jest config), 2532e5a5 (microdata extraction), 4a8c5f2e (FYD-GO ?tenant=, 09-27), a8ed5103 (Integrate P-01 presence compiler), 2bf1e5c9 (Lane P-01), 6dd44842 (Integrate FYD-010), 9f9b79f8 (FYD-010), 42f81d53 (Lane D MC dispatch slice), c93a7ced (Arrow 6), 56629e4b (hydration #418), 6f2dd65e (qc01-lane), 87671a5f (FYD edge mode), 761bd086 (hydration #418 fix).
- Recent merges: 9ea3e6a6 (09-28), a8ed5103 (09-26), 6dd44842 (09-26), 28e4ba00, 8fa21a68, 266132f8 (all 09-25).

## 2. CANONICAL-BRANCH / SERVED-TREE QUESTION

**Production right now is the :3100 build, and it is STALE relative to the worktree.**

- :3100: `next-server (v15.5.24)` PID 23046, CWD `/home/nolan/projects/ping`, started 06:18 MDT Sep 28. `/api/health` → 200 `{"status":"ok","timestamp":...}` (live, no version/commit field).
- Served build evidence: `.next/trace` and `.next/next-server.js.nft.json` timestamped **2026-09-27 21:00:32**. Nothing under `.next/server` is newer. The only newer `.next` file is an image-cache artifact (2026-09-28 11:28), not code.
- That build predates: HEAD commit (2026-09-28 05:59:49), the entire dirty batch (2026-09-27 22:55–23:00), and the harvest merge.
- Therefore the served code CANNOT contain the HEAD vocabulary/SSRF hardening or any current dirty work. Served tree ≠ worktree ≠ HEAD. Any behavior verified through the live :3100 reflects a ~17.5h-old build, not the current tree.
- The journal gateway (`node server.mjs` PID 19311, 8.25h uptime) runs from `/home/nolan/projects/ping/tools/fyd-journal-gateway` whose `server.mjs` is itself DIRTY (31+/1- unstaged). The gateway serves uncommitted code.

## 3. PATCH-BRANCH WATCH

- Branch `decision-fabric/contextpack-wire-2026-09-28`: **does not exist** (no local or remote ref). Verdict: ABSENT.
- The authorized compileAskContext patch is NOT applied: `src/app/api/mc/dispatch/route.ts:314` still mints `contextPackId = 'mc-ctx-' + missionId` from params only; zero `compileAskContext` references in route.ts. The reached-loop report's FIRST BROKEN EDGE (EVIDENCE → ORCA CONTEXT) stands.
- COLLISION RISK (high): the locked call site carries **121 insertions / 19 deletions of uncommitted work** (idempotency lookup-before-mint, caller registry via untracked `mc-dispatch-identity.ts`, tenant gate via untracked `mc-tenant-gate.ts`), all stamped 2026-09-27 22:55:30. The authorized patch lane must land its one-call-site change into a file with a large dirty diff. Coordinate before touching.

## 4. RUNTIME REACHABILITY (read-only)

- :3100: REACHED (200 on /api/health). Other probed paths (`/health`, `/api/mc/health`, `/api/version`, `/api/ping/version`) → 404.
- Docker: `ping-gateway` Up 34 min (restarted ~13:52 MDT, before T+0); `ping-postgres`, `ping-qdrant`, `ping-redis`, `ollama`, `brain-postgres`, `brain-qdrant`, `open-webui` Up 8h; `ping-vault` Up 8h **(unhealthy)** — consistent with post-rotation state, not new.
- Journal event flow: `/home/nolan/workspace/fyd-journal-gateway/events.jsonl` last write **2026-09-27 20:44 MDT** (~17.7h before T+0). Tail shows MC_* events (MC_ARTIFACT_PUBLISHED, MC_RUN_SUCCEEDED for mission mc-m-3a0f2fdc3330 at 2026-09-28T02:44Z). Verdict: PARTIAL — journal file healthy and readable, but no events for ~18h; flow currently QUIET, not confirmed alive.
- Qdrant: `127.0.0.1:6333/` → 200; `:6334` → no route. App-level embedding init state: UNKNOWN (the reached-loop report's `not_initialized`/Qdrant-401 reading was from its Sep-28 probe; not re-derived at app level here).
- Secret broker: files present — `src/lib/secrets/secret-broker.ts` + `secret-broker.redteam.test.ts`. Presence only; no secret material read. Verdict: REACHED (files) / DECLARED ONLY (behavior not re-probed).

## 5. COMPONENT INVENTORY

| Repo / path | Branch | HEAD | Upstream | Dirty | Role (one line) |
|---|---|---|---|---|---|
| /home/nolan/projects/ping (canonical) | hardening/2026-09-28-vocab-ssrf | 0264d517 (09-28 05:59) | NONE | 74 unstaged, 0 staged, 2708 untracked | PING canonical tree: FYD + MC dispatch + projections |
| /home/nolan/workspace/orca-adapter | security/secret-redaction-2026-09-28 | 9652896 (09-28) | unknown | 1719 entries (mostly untracked) | Out-of-tree executor adapter; decision-authority owner (vendor/external_agent_adapter.js) |
| /home/nolan/workspace/fyd-journal-gateway | reports same as orca-adapter (see anomaly) | 9652896 | unknown | 1719 entries (same anomaly) | Canonical MC event sink (events.jsonl); running instance is the in-tree copy under tools/ |
| crx-runtime live checkout | — | — | — | — | ABSENT. Only /home/nolan/archives/crx-runtime-removed-20260921 + audit docs in wr-integrate/, wr-failclosed-audit/ |
| src/app/api/mc (+ _lib) | (ping tree) | 0264d517 | — | route.ts 121+/19-, mc-dispatch.ts 58+/2-, 2 untracked new lib files, 7 untracked new route dirs | MC witnessed dispatch loop (POST /api/mc/dispatch, missions, agents, approvals, graph, object, search, today, trace-forward) |
| src/app/mission-control | (ping tree) | 0264d517 | — | clean | Thin MC UI (page.tsx only) |
| src/fyd/ask/context-compiler.ts | (ping tree) | 0264d517 | — | 1+/4- dirty | compileAskContext: deterministic evidence-bound ContextPacket (the un-wired compiler) |
| src/fyd/data/fyd-tenant-graph.ts | (ping tree) | 0264d517 | — | dirty | PingObjectReader seam: digest-verified live tenant object graph |
| src/lib/ping/grants.ts | (ping tree) | 0264d517 | — | dirty | CapabilityAuthority reference point (grant evaluation) |
| src/fyd/identity/ | (ping tree) | 0264d517 | — | clean (dir) | MissionRuntime naming surface (uuid.ts, principal.ts), identity primitives |
| src/fyd/claim/ | (ping tree) | 0264d517 | — | clean (dir) | Evidence/claim projection (claim-projection.ts, identity.ts) |
| src/fyd/object/ | (ping tree) | 0264d517 | — | 4 files dirty | Object compilation (object-projection.ts, owner-overlay.ts, why-this-steps.ts) |
| src/fyd/sitespec/public-projection.ts | (ping tree) | 0264d517 | — | dirty | Public projection boundary |
| src/lib/health-rules.ts | (ping tree) | 0264d517 | — | clean | Health Rules Configuration (detector policy map) |
| src/lib/secrets/secret-broker.ts | (ping tree) | 0264d517 | — | clean | Secret broker (single-use, scope/audience/tenant gates) |
| Scheduler (dedicated class) | — | — | — | — | ABSENT. Closest: mc-dispatch lease/reap, src/lib/materialization-state-machine.ts, src/fyd/placement/engagement-reconcile.ts |
| Mission reconciler (dedicated) | — | — | — | — | ABSENT. 409 HOLD machinery exists in dirty mc-dispatch.ts only; zero tests; nothing reconciles UNKNOWN missions |

Anomaly: `fyd-journal-gateway` (a 2-entry dir dated Sep 24) reports the identical branch/HEAD/dirty-count as `orca-adapter`. Likely a shared `.git` pointer; flagged, not asserted.

## 6. TESTS

- How run: root `jest.config.cjs` is canonical (`npx jest` / `npm test` from repo root; testMatch `src/**/__tests__/*.test.{ts,tsx}`, node env, ts-jest, `@/` alias). Per-area configs kept for lane-local runs. See TESTING.md.
- Inventory: 221 test files under src.
- Last full run (from TESTING.md, 2026-09-27 via `npx jest`): 207 suites, 196 passed, 11 failed; 2230 tests passed, 22 failed. Known failures: binding-verifier refusals on ping-fyd dogfood suites (structural-proof, ping-fyd-error-gate, ping-fyd-dogfood-render, components/ping-fyd-dogfood), proceduralize generator gallery emission, object by-id/circle-projection/view media drift, claim attack-verifier-holes H5 (expects DIRECT_EVIDENCE, gets UNKNOWN), assignment-store KV CAS (expectedRevision), media-authority-route suite fails to run (mocks nonexistent `src/lib/workbench-session`).
- The full suite was NOT run by this lane. Current failures after the 22:55 dirty batch: UNKNOWN. Note the TESTING.md run date (09-27) overlaps the dirty batch window; whether it covered the dirty state is UNKNOWN.

## CORRECTION LIST (vs one-reached-loop-report-2026-09-28.md)

1. Dirty scope overstated as concentrated: report said "~144 dirty files concentrated in src/app/api/fyd/ask/". Reality: 74 tracked modified files spread across src/fyd (42), src/app (27), src/lib (3), tools (1), src/components (1); the ask area is ~12 of 74. (The 144 was the porcelain line count including collapsed untracked dirs.)
2. Served build staleness: the report certified loop behavior against live :3100, but the served `.next` build (2026-09-27 21:00:32) predates HEAD (2026-09-28 05:59) and all dirty work. Served ≠ worktree ≠ HEAD.
3. Idempotency/409 HOLD verdicts describe UNCOMMITTED state: the PASS rows for ATTEMPT IDENTITY and DUPLICATE EFFECT rest on dirty route.ts (121+/19-) and mc-dispatch.ts (58+/2-), not on committed HEAD. The committed tree lacks that machinery.
4. Patch branch confirmed still ABSENT; first broken edge (EVIDENCE → ORCA CONTEXT) stands: route.ts:314 still params-only.
5. crx-runtime: no live checkout exists; archived 2026-09-21. Any program step assuming a live crx-runtime tree is misaddressed.
6. Journal event flow is QUIET (~18h, last event 2026-09-27 20:44 MDT), not actively flowing at T+0.
7. ping-gateway restarted ~34 min before the probe (~13:52 MDT); ping-vault remains unhealthy (not new).
8. orca-adapter and fyd-journal-gateway report identical branch/HEAD/dirty counts — anomaly flagged, needs re-verification.

## ACTIVE WRITERS AND COLLISION RISKS

- Active writer RIGHT NOW: NO. Latest write 2026-09-27 23:00:17 MDT (test file); the whole dirty batch is a single 22:55–23:00 MDT stamp session ~15.5h before T+0. Tree is quiet.
- Risk 1 (HIGH): the locked call site `src/app/api/mc/dispatch/route.ts` (owned by the contextpack patch lane) carries 121+/19- uncommitted changes plus 2 untracked new dependency files. The authorized patch must be coordinated against this diff; landing blind risks clobbering or being clobbered.
- Risk 2: 74 dirty files on a branch with NO upstream — any lane committing without explicit pathspecs risks sweeping another lane's files (known multi-stream lesson).
- Risk 3: served build is stale; any lane validating via :3100 tests old code. Rebuild + restart is out of my scope (restart ONLY via /home/nolan/start-3100.sh with the demo-owner flag) and needs coordinator scheduling.
- Risk 4: the running journal gateway serves a dirty server.mjs; uncommitted gateway changes are live in production behavior.
- Risk 5: the "nine unpushed constitutional-runtime commits (trunk @ 74fbb74)" cited in the 2026-09-28 directives do not appear in this tree's log; their location is UNKNOWN — whoever works constitutional runtime must first locate the checkout.

## UNKNOWN LIST (honest)

1. App-level embedding/Qdrant init state (was `not_initialized`/401 per the reached-loop probe; not re-derived here).
2. Exact commit provenance of the served `.next` build (no version field in /api/health; build predates HEAD but its true source commit is not pinned).
3. The fyd-journal-gateway vs orca-adapter identical-git-state anomaly.
4. Whether the 22:55–23:00 dirty batch is one lane's work or several (uniform mtime stamp is consistent with a scripted bulk write).
5. Whether the 2026-09-27 full jest run covered the dirty state (TESTING.md run and dirty batch overlap the same evening).
6. Location of the nine unpushed constitutional-runtime commits (trunk @ 74fbb74).
7. Which Qdrant container (ping-qdrant vs brain-qdrant) answers on 127.0.0.1:6333, and what :6334 was expected to be.
8. Why ping-gateway restarted ~13:52 MDT (34 min before probe); no incident evidence gathered (out of read-only scope to diagnose).
9. Whether any lane intends to commit the 74-file dirty set, and under what branch discipline.

## VERDICT VOCABULARY (key items)

- PING tree observed at stated branch/HEAD: REACHED
- Patch branch exists: ABSENT
- compileAskContext wired to dispatch: ABSENT (declared-only compiler; first broken edge stands)
- Idempotency/409 HOLD as committed behavior: DECLARED ONLY (exists in dirty worktree, zero committed, zero tests)
- Dedicated mission reconciler: ABSENT
- Served build matches worktree: ABSENT (stale by ~17.5h; timestamp evidence)
- Journal event flow alive at T+0: PARTIAL (healthy file, 18h quiet)
- crx-runtime live checkout: ABSENT (archived)
- ORCA adapter present and git-healthy: REACHED (files + repo)
- Secret broker present: REACHED (files); behavior: DECLARED ONLY
- Test suite runnable via canonical config: REACHED (config); current pass/fail: UNKNOWN beyond 09-27 TESTING.md record
- Active writer right now: ABSENT (quiet tree)

---
Lane 9 Phase 0 complete. All observations read-only; no tree modified, no processes restarted, no credentials touched. This report is a hypothesis until replayed from a clean checkout.
