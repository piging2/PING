# P0 Provenance Trace — was the autonomous loop ever invoked, did synthetic confidence reach durable state?

Date: 2026-09-23. Investigator: subagent (Jev/Orca forensics lane).
Method: read-only. Pig-side file reads, git log/diff/show, docker logs (read), SELECT-only queries against the live PING postgres (`ping_runtime` on localhost:5432). No source modified, no commits, no pushes. The frozen candidate (`fffe99f7a`) and the jev-surgical worktree's dirty P0 files were not touched; `git status` before and after is identical.

## Question

Before the P0 gate (implemented 2026-09-22, still UNCOMMITTED in `/home/nolan/ping/worktrees/jev-surgical`, dirty files `gateway/routes/orchestration.js` + `ping-runtime/orchestration/execution/engine.js`), `POST /orchestration/engine/loop` was reachable with zero authentication and `ExecutionEngine.startAutonomousLoop` fabricated worker findings `{file: mission.target || 'x', line: 0, bypass_type: 'auto_scan', confidence: 0.85}` into `collectWorkerOutput` -> reputation persistence -> consensus acceptance. Was the route ever invoked, and did the 0.85 synthetic confidence reach durable state?

## Exposure window (source-proven)

- Route + fabrication introduced in commit `1effdc8ad` (2026-07-29, "PING Core v1 build-out").
- Route-invocation logging (`ROUTE: POST /orchestration/engine/loop` via asyncHandler) added in `c648b3ccb` (2026-09-06). Invocations after this date would appear in gateway stdout.
- Deployed images predate the gate: `ping-gateway:devin-boundary2` built 2026-09-16, `ping-gateway:rc-4d522a6b` built ~2026-09-20. The live route is STILL ungated in deployment (the gate exists only as dirty worktree files). Exposure window is open-ended on the live gateway.

## Durable sinks the loop would write (source-traced)

Per `collectWorkerOutput` + `_resolveMission` (engine.js) and LP-1 of the ceiling trace:
1. `ping-runtime/orchestration/execution/capability_registry.json` — `recordQuality`/`recordConfidence` (qualityHistory, avgConfidence), drives future dispatch.
2. `ping-runtime/orchestration/worker_memory/<workerId>.json` — findings + confidence_history (state machine shares this dir).
3. `ping-runtime/orchestration/artifact_store/*.json` — proposal/consensus artifacts.
4. Orchestration event queue `emitChain('consensus_reached', ...)` — **in-memory only** (event_queue.js has zero pg/postgres references); does NOT reach ping_events.
5. Postgres `ping_runtime` — the loop itself writes nothing to postgres directly, but mission/event rows were swept anyway as the canonical durable record.

## Findings

### 1. Live postgres `ping_runtime`: zero synthetic markers (SELECT-only, full sweep)

- 33 tables scanned across every text/character-varying/json/jsonb column for `auto_scan`: **0 hits**.
- Same sweep for `bypass_type`: **0 hits**.
- `ping_missions` (457 rows): 0 rows with `0.85` in result or payload. All recent missions are canonical pipeline types (CLAIM_GENERATE, CLASSIFICATION_CREATE, RECOMMENDATION_CREATE, PROJECTION_CREATE, REPLAY_VERIFY, WITNESS_CREATE, LINEAGE_CREATE), latest 2026-09-23T17:29Z.
- `ping_events` (2357 rows): 0 rows with `0.85` in payload. All 64 `REPLAY_COMPLETED` events carry `source='replay'` (worker-stamped); **zero** from `source='api'` — no POST /events forgery of replay verdicts in the live DB (LP-2 unfired as of this writing).
- `claims` table: empty. `mission_events`, `mission_executions`, `canonical_events`, `event_outbox`: 0 rows.
- Note: an earlier sweep hit the wrong database (`crx_runtime`, stale 2026-07-28 fixtures); all conclusions above are from `ping_runtime`, the DB the live `ping-gateway` container actually uses (verified via `docker inspect` env: POSTGRES_DB=ping_runtime).

### 2. File-based durable state: pristine

- `capability_registry.json` (main repo, modified 2026-09-21): one worker (`opencode:local`), `qualityHistory: []`, `avgConfidence: null`, `acceptanceRate: null`, `totalTasksCompleted: 0`. The reputation store the loop would poison is untouched.
- Worktree copy: identical except `registeredAt` (2026-07-29); also pristine, no markers.
- `worker_memory/`: no `.json` files in main repo or worktree (only a 0-byte non-json `opencode` placeholder, which `WorkerMemory._loadAll` ignores). A loop run would have written `<workerId>.json` with findings/confidence_history.
- `artifact_store/`: 3 artifacts from 2026-09-16 (test fixtures, missionId `m1`), none containing `auto_scan`.

### 3. Gateway logs: no invocations in the observable window

- `ping-gateway` docker logs (237k lines, current instance up 27h since ~2026-09-22 10:27 MDT): **0 hits** for `engine/loop`, **0** for `AutonomousLoop`. 32 `ROUTE:` hits, all `POST /events` — no orchestration route was hit at all in 27h.
- `ping-rc-gateway` (354 lines): no orchestration hits.
- `auto_scan` occurs exactly **once** in the entire codebase (engine.js:645) — the fabrication site itself. No other producer of the marker exists.

### 4. What the logs cannot cover

Both gateway containers restarted ~27h ago; prior instances' logs are unrecoverable from the Pig (no old containers, no persisted log files found, gateway writes no access log file — asyncHandler logs to stdout only). The 2026-09-06 → 2026-09-22 window has no surviving invocation record.

## Classification (ceiling vocabulary)

- The fabrication code path: SELF-ASSERTED (hardcoded 0.85, no observation) — unchanged from the ceiling trace.
- Durable-state claim "the loop never persisted synthetic confidence": **INDEPENDENTLY VERIFIED** for the live DB and both file-based sinks (full marker sweep + pristine reputation store). The one unverifiable residue is pre-2026-09-22 invocations that wrote nothing durable (e.g., a loop run that found no pending missions, or crashed before `collectWorkerOutput`).
- Route-invocation claim "never invoked": **not provable** from surviving evidence. Absence of log lines in the last 27h + absence of all durable markers is consistent with "never invoked" but does not prove it for the 7-week ungated window.

## Verdict

**Synthetic confidence (0.85 / bypass_type 'auto_scan') never reached durable state.** Verified across the live postgres (33-table full sweep), the capability-reputation file, worker memory files, and artifact store. The LP-1 laundering cycle never completed a persisting run against any reachable sink. Whether `POST /orchestration/engine/loop` was ever *invoked* before the gate cannot be determined from surviving logs (pre-Sep-22 container logs are gone); what is determined is that no invocation left any durable trace, which is the outcome that matters for evidence integrity.

## Recommended next step

Close the still-open exposure: the live deployed gateway images do NOT contain the P0 gate (it exists only as dirty worktree files). The route remains ungated in production today. The decision to commit/promote the gate belongs to the frozen-candidate promotion decision (Nolan's call) — but the finding to carry forward is that deployment, not the worktree, is the unprotected surface, and any promotion plan must cover the deployed image, not just the branch.

## Falsification condition

If any row containing `auto_scan`/`bypass_type`, or any `capability_registry.json` entry with non-empty qualityHistory / non-null avgConfidence attributable to the loop, or any `worker_memory/*.json` with loop-shaped findings is later found, this verdict is falsified. Re-run the marker sweep (`node /tmp/p0scan.js auto_scan` pattern) against `ping_runtime` after any suspected invocation.
