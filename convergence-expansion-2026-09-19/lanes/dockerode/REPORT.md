# LANE REPORT: dockerode dependency resolution + genuine gateway boot

- Date: 2026-09-19 ~14:20-14:35 MDT
- Lane: dockerode (WRITE LANE, surgical convergence)
- Worktree: /home/nolan/worktrees/constitutional-convergence-authority-law
- Branch: constitutional-convergence-authority-law, HEAD 1995f0a59 (unchanged by this lane)
- Nolan's decision executed: "install genuine declared dep via package manager/lockfile after proving boot-path necessity; no lazy-loading to hide env defects."

## BOOT-PATH VERDICT: GENUINE, ON REAL BOOT PATH

dockerode is a genuine required declared dependency, proven by source trace:

1. `gateway/package.json:27` declares `"dockerode": "^4.0.0"`.
2. `gateway/dockerode_adapter.js:14` does `const Docker = require('dockerode')` at module top level and instantiates a singleton at load time (`new DockerodeAdapter()`).
3. `ping-runtime/runtime/system_authority.js:11` does `const { dockerodeAdapter } = require('../../gateway/dockerode_adapter')` at module top level.
4. `gateway/bootstrap/gateway_runtime.js:44` does `const { SystemAuthority } = require('../../ping-runtime/runtime/system_authority')` at module top level. Verified in BOTH the committed (HEAD) and the working-tree (another lane's dirty) versions of gateway_runtime.js.
5. `gateway/server.js` (the `npm start` entry) requires `./bootstrap/gateway_runtime`.

Chain: `node server.js` -> gateway_runtime -> system_authority -> dockerode_adapter -> `require('dockerode')`. Non-lazy, load-time, instantiated. Without the package installed, gateway module load throws MODULE_NOT_FOUND. This was the prior cycle's boot-proof blocker. The dormant_classifications WIP entry calling the adapter "dormant" is contradicted by the live require chain above; dormancy classifications are another lane's uncommitted work, not evidence.

## INSTALL DECISION: INSTALL (genuine, via lockfile mechanism)

- package-lock.json (lockfileVersion 3) was already CONSISTENT: root dep `^4.0.0` matches package.json spec exactly; `node_modules/dockerode` locked at 4.0.12 with integrity hash.
- Failure mode was purely environmental: `gateway/node_modules/` did not exist in the worktree (installation never run there).
- Installed with the repo's own mechanism: `npm ci --no-audit --no-fund` in `gateway/` (exit 0, 241 packages, ~6s). No lazy-loading, no shim, no fake module.
- Post-install verification: `package.json` sha256 `36deb307...` and `package-lock.json` sha256 `ccd4b12b...` IDENTICAL before and after. Lockfile needed no repair; it was already correct.
- Installed dockerode version: 4.0.12 (matches lock).

## PROOF RESULTS (in task order)

| # | Stage | Result | Evidence |
|---|-------|--------|----------|
| 1 | Module resolution | PASS | `require('dockerode')` from `gateway/` resolves to 4.0.12 |
| 2 | Gateway module load | PASS | `dockerode_adapter.js` loads (singleton constructed); `system_authority.js` loads; `bootstrap/gateway_runtime.js` loads and exports `GatewayRuntime` (function). Previously threw MODULE_NOT_FOUND. |
| 3 | Gateway boot | PASS | `node server.js` with `PORT=8090` against scratch PG DB `dockerode_lane` (localhost:5433): listening on 0.0.0.0:8090 within ~6s. Boot log shows full phase run: EventToMissionBridge started, startup reconcile (scanned=0/created=0 on empty DB), 18 business events seeded, each deriving a mission via the live bridge path. |
| 4 | Health/readiness | PARTIAL | `GET /health` serves. HTTP 503, body `status: unhealthy`. Component breakdown: gateway=healthy, event_runtime=healthy, canonicalization=healthy, event_governance=healthy, integrations=healthy, generated_artifacts=healthy; qdrant=error, embedding=not_initialized. The 503 is caused solely by qdrant/embedding being unavailable in this scratch environment, unrelated to dockerode. Readiness is degraded on external services, not on the dependency under test. |
| 5 | Canonical event path | PASS | `POST /events` `{event_type: LEAD_CREATED, aggregate_id: lane-test-1, ...}` -> `{"event_id":"event_32515158e291fcb0","status":"ok"}`; row confirmed in `ping_events` via direct PG query. |
| 6 | Mission path | PASS | Live EventToMissionBridge derived mission `ad8159b507b711a8` (LEAD_FOLLOWUP) for the posted event; row confirmed in `ping_missions`. |
| 7 | Reconciliation (P0B) | PASS | Synthetic `ping_events` row `event_aaaaaaaaaaaaaaaa` inserted via SQL, bypassing the live listener (simulates a pre-bridge-registration event). Direct invocation of the committed `reconcileMissingMissions()`: report `status=completed law=2026-09-19.1 scanned=1 existing=20 created=1 unroutable=0 failed=0`. Mission `0bc34b3803060bed` (CUSTOMER_ONBOARD per routing law for the cloned CUSTOMER_CREATED row) confirmed in `ping_missions`. This exercises the P0B-committed code path (commit f4bf5304a); it does not re-run P0B's full 48/48 matrix, which stands on its own commit. |

### Dependency proof vs docker-daemon proof (kept separate per task)

- Dependency proof: stages 1-3, 5-7 above. Complete.
- Daemon proof: Docker daemon on the Pig is UP (`docker info` OK). Separately, the genuine installed dockerode was exercised read-only against the live daemon: `dockerodeAdapter.listContainers()` returned 23 containers. So the package is not just resolvable, it is functional against the real daemon. Daemon availability was never the blocker; the missing module was.

## COMMIT SHA or NO-CHANGE rationale

NO-CHANGE. No repo file was modified by this lane:

- `gateway/package.json` and `gateway/package-lock.json` were already correct and mutually consistent; `npm ci` changed neither (sha256 identical pre/post).
- `gateway/node_modules/` is gitignored (verified via `git check-ignore`).
- Final `git status --short` shows exactly the 10 pre-existing entries from other lanes (5 modified, 5 untracked groups); nothing added by this lane.
- Per the task's commit condition ("IF it is a legitimate repo change"), there is no semantic diff to commit. The correction was environmental (install the declared tree), not a source change. Nothing staged, nothing committed. Push state unchanged: PUSH still BLOCKED (egress-proxy), nothing pending from this lane.

## RESIDUAL

1. `/health` returns 503 overall in a scratch environment because qdrant=error and embedding=not_initialized. The gateway boots and serves; readiness is degraded only on external services outside this lane. If a future lane wants a fully-healthy boot proof, it needs qdrant + embedding services, not dependency work.
2. Observed while probing (not acted on, outside this lane): the credentials in the `ping-postgres` container env authenticate `crx_user` but NOT the `postgres` user, while the running `ping-gateway` container declares `POSTGRES_USER=postgres`. The running gateway's PG path may be degraded; flagged for whoever owns the gateway-ops lane. No credential values are recorded in this report.
3. The boot proof ran against the working tree including other lanes' uncommitted changes (notably their dirty `gateway_runtime.js`). The dockerode require chain is identical in committed and working versions, but a purist re-proof at a clean HEAD is cheap if ever needed.
4. No test files were added by this lane; the proof was live-execution evidence (logs, PG row checks), preserved in `/tmp/dlane-*.log` on this machine and summarized here. The P0B 48/48 matrix remains the canonical reconciliation certification.

## NEXT

- dockerode lane is CLOSED. No follow-up installs, no lockfile work, no commits pending.
- Suggested (for coordinator, not this lane): qdrant/embedding availability if a green-overall-health boot proof is ever required; investigate the `postgres`-user credential mismatch on the running gateway (ops lane).
- Pig commute blackout (~16:00 MDT) is approaching; no further Pig work was left running (test gateway killed, scratch DB dropped, verified port 8090 closed).
