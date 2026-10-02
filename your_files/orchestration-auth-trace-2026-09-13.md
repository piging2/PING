# READ-ONLY security trace: `/orchestration/*` HTTP surface
Date: 2026-09-13. Traced against the LIVE container `ping-gateway`
(image `curious-squid-gateway:phase4-eventauth6`), read via `docker exec` cat/grep/sed only.
No writes, no restarts, no repo modifications. One live GET probe performed
(`GET /orchestration/engine`, read-only).

## 1. Route inventory — all 11 routes, zero auth

**Mount** — `/app/gateway/bootstrap/gateway_runtime.js:872`:
```js
this._app.use('/orchestration', createOrchestrationRoutes(services.executionEngine));
```
No middleware argument. Chain per request: global `express.json()` → router →
`asyncHandler` (`/app/gateway/route_middleware.js`: request logging + error catch
ONLY, no auth) → handler. **Live-verified**: `GET /orchestration/engine` with no
credentials → HTTP 200, `"initialized":true`.

**Routes** (`/app/gateway/routes/orchestration.js`, 309 lines):

| # | Method + path | Line | Effect class |
|---|---|---|---|
| 1 | `GET /missions` | 83 | read: list missions (status filter) |
| 2 | `GET /missions/:id` | 112 | read: full mission incl. worker outputs + consensus |
| 3 | `GET /workers` | 204 | read: worker registry, capabilities, quality scores |
| 4 | `GET /engine` | 232 | read: full engine dashboard (verified 200 unauth) |
| 5 | `GET /engine/report` | 240 | read: capabilities + high-priority missions |
| 6 | `POST /missions` | 39 | WRITE: inject arbitrary mission (type/target/priority/description/requiredCapabilities/metadata/files) → `engine._missions.push` → 201 + missionId |
| 7 | `POST /missions/:id/dispatch` | 140 | WRITE: `engine.dispatchToAssignment` (engine.js:177) → status→processing, scheduler assigns workers, builds prompts, **stores prompt artifacts to container disk** |
| 8 | `POST /missions/:id/output` | 175 | WRITE: `engine.collectWorkerOutput` (engine.js:243) with **caller-chosen `workerId` (never verified)** → proposal artifact on disk, `registry.recordQuality/recordConfidence` (reputation poisoning), findings recorded, consensus evaluated → mission completed/failed |
| 9 | `POST /engine/compile` | 248 | WRITE: `engine.compileMissions` (engine.js:146) → new missions from intelligence graph |
| 10 | `POST /engine/loop` | 272 | WRITE+DoS: `engine.startAutonomousLoop` (engine.js:579), caller-controlled `maxIterations` (default 5, **no upper bound**), fabricates canned worker output, resolves missions. **Synchronous** — huge `maxIterations` blocks the Node event loop (whole-gateway DoS, unauthenticated) |
| 11 | `POST /engine/git-diff` | 298 | WRITE: `engine.emitGitDiff(diff)` (engine.js:142) → internal `git_diff` event with caller-supplied diff → mission compilation |

## 2. Representative deep traces

### Route A: `POST /missions/:id/dispatch`
HTTP POST → `:872` mount (no auth) → `asyncHandler` (log/catch) →
`orchestration.js:140` handler → `engine.dispatchToAssignment(missionId)`
(`engine.js:177`): finds mission in in-memory `this._missions`; `priority >= 8`
→ `scheduleForConsensus(mission, 3)` else `schedule(mission)`; per worker:
state-machine transitions, `ArtifactRouter.buildWorkerContext` +
`buildPrompt`, **`ArtifactStore.store({type:'prompt',...})` → `_persist` →
`fs.writeFileSync` to `/app/ping-runtime/orchestration/artifact_store/<sha256-id>.json`**
(`artifact_store.js:5` STORE_DIR, `:178` write). Returns assignments + prompts
in the HTTP response.
Authority check: none. Audit: internal `EventQueue` emits only (not PING).
**What it cannot do**: execute workers — `OpenCodeWorkerPort` registered with
`executor: null` (engine.js:~100); no spawn/exec/LLM call anywhere in the path
(verified by grep of `worker_port.js`). Dispatch prepares; external agents act.

### Route B: `POST /missions/:id/output`
HTTP POST → `:140`-style chain → `orchestration.js:175` handler →
`engine.collectWorkerOutput(workerId, missionId, output)` (`engine.js:243`):
`workerId` taken verbatim from body; pushes `{workerId, ...output}` to
`mission.workerOutputs`; `ProposalArtifact.produce` (disk artifact);
`registry.recordQuality/recordConfidence(workerId, output.confidence)` —
**attacker-chosen confidence permanently mutates worker reputation**;
`stateMachine.recordFinding`; `_checkMissionComplete` → `_resolveMission`
(`engine.js:~285`): `ConsensusEngine.evaluate` → mission `completed`/`failed`,
`ConsensusArtifact` + `MergeDecisionArtifact` on disk, internal event chain
`consensus_reached → merge_decision_created → mission_accepted`.
Merge path does `path.resolve(__dirname,'../../../',file)` on
caller-influenced `mission.files` + `fs.existsSync` + `MergeGate.validateFile`
— read-only as traced (see §4, item 2).
Authority check: none. **Net effect: unauthenticated caller can fabricate the
entire worker-output → consensus → mission-resolution pipeline, including
worker reputation scores.**

### Route C: `POST /engine/loop`
HTTP POST → `orchestration.js:272` handler →
`engine.startAutonomousLoop({maxIterations, minPriority, missionsPerIteration})`
(`engine.js:579`): guards only on `this._initialized` (true — engine is
initialized at boot, `gateway_runtime.js:360-366`). Per iteration:
`compileMissions()` → `dispatchToAssignment` → **synthesizes its own worker
output** (`engine.js:613-617`: canned
`{findings:[{file, line:0, bypass_type:'auto_scan', confidence:0.85}]}`) →
`collectWorkerOutput`. Fully synchronous `for` loop; `maxIterations` has no
cap (`options.maxIterations || 5`). **Unauthenticated event-loop block = full
gateway DoS.**

## 3. Blast-radius scoping (traced, not assumed)

The Orca `ExecutionEngine` is a self-contained substrate: internal `EventQueue`,
in-memory `_missions`, local JSON artifact files. Verified boundaries:
- **No Postgres**: zero `pool.query`/`pg` references in `engine.js`.
- **No PING pipeline**: `_eventQueue.emit/emitChain` is engine-internal; no path
  to `ping_events` / canonical events / `unifiedEventRuntime`.
- **No process execution**: no spawn/exec; worker ports don't call out.
- **No repo mutation**: merge gate path is read/validate only as traced.
- **Persistent effects**: artifact JSON files on container disk
  (`/app/ping-runtime/orchestration/artifact_store/`); in-memory mission,
  reputation, and state-machine corruption (lost on restart); CPU via `/loop`.
- **Cannot**: execute code, reach secrets, touch PG, enter the PING event
  pipeline, modify the repo.

## 4. Existing auth model (already-secured routes)

**Middleware**: `/app/gateway/exterior_auth_middleware.js` (251 lines),
`ExteriorAuthMiddleware(pgPool)`:
- `initialize()` (`gateway_runtime.js:420-421`): creates
  `exterior_agent_credentials` table; seeds `muse` (L1 "Muse Level 1 (Observe)")
  and `muse-level-2` (L2 "Muse Level 2 (Workspace Write)") from
  `MUSE_LEVEL_1_KEY`/`MUSE_LEVEL_2_KEY` env or random; PG-down → in-memory
  degraded mode seeded identically.
- `middleware()`: `Authorization: Bearer <key>` → PG lookup (fallback
  in-memory) → 401 `MISSING_AUTH` / `INVALID_CREDENTIAL`, else
  `req.authenticatedAgent = {agentId, agentName}` → `next()`.
- **Authentication only** — no per-route capability check. L1/L2 are name-only
  at this layer (class docstring mentions capability authorization as a later
  step; `middleware()` does not implement it).

**Applied** (`gateway_runtime.js`): `:762` `/events`, `:766`
`/canonical-events`, `:770` `/ingest`, `:887` `/missions` (with an inline
comment documenting the exact pattern and the TenantOS rationale — the
precedent to mirror), `:890` `/ai`, `:892` `/connectors`. `:899`
`/capabilities` passes the middleware into its route factory.
Construction at `:420` is unconditional (not in try/catch) and
`initialize()` degrades gracefully → `services.exteriorAuthMiddleware` is
non-null whenever `_mountRoutes` runs (the `:762` mount already depends on it).

## 5. Minimal fix (NOT implemented — for explicit approval)

One-line change at `gateway_runtime.js:872`, same pattern as `:762`:
```js
// before:
this._app.use('/orchestration', createOrchestrationRoutes(services.executionEngine));
// after:
this._app.use('/orchestration', services.exteriorAuthMiddleware.middleware(), createOrchestrationRoutes(services.executionEngine));
```
Fit assessment:
- Uses the existing authority model; no new auth layer, no new vocabulary.
- `services.exteriorAuthMiddleware` provably non-null at mount time.
- No internal HTTP callers of `/orchestration/*` exist in `/app` (grep over all
  JS excluding node_modules and the route file itself found none) → nothing
  in-process breaks. External desktop agents would need a Bearer token.
- Works in PG-degraded mode (in-memory credentials from env).
- Requires container rebuild + restart (code is baked into
  `curious-squid-gateway:phase4-eventauth6`).
- **Caveat**: this buys authentication + caller identity, NOT least privilege.
  L1 "Observe" could still POST missions/dispatch/loop. Restricting L1 to
  reads would be a second step (capability check), not this one-liner.
- Adjacent unauthenticated write surfaces observed at mount (not deep-traced
  per task scope): `/knowledge`, `/ai-workspace`, `/reviews`, `/customers`,
  `/projects`, `/tenants`, `/deployments`, `/runtime`, `/api/v1/ollama`,
  `/api/v1/repository`, `/mc`, `/ops`, `/governance`.

## 6. Could NOT determine read-only
1. Whether any legitimate external caller (desktop agent, cron, tooling)
   currently POSTs to `/orchestration/*` without a Bearer token — it would
   break under the fix. No in-repo callers found; network-level callers are not
   enumerable read-only.
2. `MergeGate.validateFile` behavior on traversed paths (caller-influenced
   `mission.files` via `path.resolve(__dirname,'../../../',file)`) — a
   constrained container-local file-read primitive is plausible but not
   fully traced.
3. Per-iteration CPU cost of `compileMissions` (quantifying the `/loop` DoS) —
   not benchmarked (would be a state-affecting load test; deliberately avoided).
4. Distribution of the L1/L2 Bearer tokens beyond the Muse agent — env/secret
   inspection out of scope.
5. On-disk path of the `curious-squid` worktree — `git worktree list` refused
   (dubious ownership: repo owned by `Pig\nolan`, SSH user is `Pig\muse-ssh`;
   adding a safe.directory exception would be a Pig-side write, so skipped).
   Immaterial: the running container image is the live truth and was traced
   directly.
