# STREAM A: Restart Survival - Root Cause + Recovery Design + Observability Spec

Date: 2026-09-26. Author: restart-survival subagent. Status: DESIGN ONLY, nothing implemented.
Hard constraints honored: no Pig reboot, no WSL restart, no main/master commits, no credential changes, no spend.

## 1. What happened (verified timeline, all times MDT)

- ~09:16:55: WSL restarted. (docker-desktop distro `uptime -s` = 2026-09-26 15:16:55 UTC. Windows itself has been up since 9/16, so this was a WSL-only restart, not a Windows reboot.)
- 09:17:02: ping-postgres's running instance ended; a restart attempt exited 127. (docker inspect FinishedAt = 2026-09-26T15:17:02Z.)
- 09:17-09:41: container sat `Exited (127)`. FinishedAt never advanced past 09:17:02, which means NO further restart attempts were recorded after the first one.
- 09:41: observed Exited (127), 30+ min after the restart.
- 09:49: manual `docker start ping-postgres` succeeded immediately. Postgres did WAL recovery and accepted connections.
- :3100 (Mission Control/FYD) and :18199 (FYD journal gateway) had no boot auto-start at all and were restarted manually.

## 2. Root cause: postgres exit 127

### Evidence chain

1. Restart policy is correctly `unless-stopped` (docker inspect). The policy is not the bug.
2. ping-postgres is the ONLY container in the fleet with a host bind mount:
   `bind /home/nolan/projects/constitutional-runtime/brainos/orchestration/constitutional/canonical_state/schema.sql -> /docker-entrypoint-initdb.d/01-schema.sql`
   Every other container (ping-gateway, ping-qdrant, ping-redis, ollama, brain-postgres, open-webui) uses named volumes only, and every one of them auto-recovered.
3. The daemon is Docker Desktop's, living in the `docker-desktop` WSL distro (docker info: OperatingSystem=Docker Desktop, Name=docker-desktop; zero dockerd processes in the Ubuntu distro). The bind source lives in the `Ubuntu` distro. The path does NOT exist natively in the docker-desktop distro (verified). Docker Desktop resolves it via cross-distro staging (`/mnt/host/wsl/docker-desktop-bind-mounts/Ubuntu/<hash>`), which requires the Ubuntu distro to be booted and its filesystem re-shared.
4. The failed restart attempt landed at 09:17:02, SEVEN SECONDS after the docker-desktop distro booted (09:16:55). The Ubuntu filesystem share could not have been ready. This is the race: dockerd restarted the container before its bind source was resolvable.
5. Exit 127 with ZERO postgres log output between 13:21 UTC and the manual restart at 15:49 UTC: the container process died before postgres ever executed. This is a container-start/entrypoint-level failure, not a postgres-level failure. (Postgres-level failures log; there are none.)
6. FinishedAt frozen at 09:17:02 for 30+ minutes: the daemon recorded exactly one failed attempt and never retried. `unless-stopped` retries forever via an in-memory backoff loop, so a lost retry loop means the daemon process that owned it went away. Consistent with Docker Desktop's multi-phase boot during a WSL restart (daemon starts, attempts restarts, daemon phases again, backoff state lost). The replacement daemon then saw an already-exited container and, per unless-stopped semantics (resurrect what was running at daemon shutdown; an already-exited container stays exited), left it alone.
7. Manual `docker start` at 09:49 succeeded because by then the Ubuntu filesystem was fully shared.

### Root cause statement

A startup-ordering race between Docker Desktop's container restart and WSL cross-distro filesystem availability. ping-postgres was the only container with a cross-distro bind mount, so it was the only container exposed to the race. The daemon's single restart attempt at distro-boot+7s failed (exit 127, pre-postgres), and the in-memory restart backoff was lost when the daemon phased during WSL boot, so `unless-stopped` never converged it back. Manual start after the filesystem settled worked immediately.

### Residual uncertainty (flagged, does not change the fix)

The exact 127 exit path (entrypoint exec failure vs mount-setup failure surfacing as 127) and the precise daemon phase that dropped the backoff would need daemon-side boot logs. Those logs were not reachable from the Ubuntu side (no /var/log/docker.log in the docker-desktop distro; Windows-side Docker logs not present under nolan's AppData). Recommend capturing dockerd boot logs on the next Nolan-approved reboot test. This does NOT block the fix: every variant is eliminated by removing the cross-distro bind mount, and the residual "daemon lost the backoff" class is covered by the watchdog below.

### Why NOT a sleep loop

The evidence shows the failure is not a fixed ordering delay that a sleep would paper over: it is a missing-source race plus a lost retry loop. A sleep in a wrapper would not have helped the 09:17 attempt (the daemon, not any wrapper, drives the restart) and would add an unowned timing assumption. The correct fixes are structural: remove the bind mount, add a reconciliation watchdog.

### The bind mount is dead weight

`/docker-entrypoint-initdb.d/01-schema.sql` only executes on FIRST initialization of an empty data directory. The database has existed for months (data in a named volume). The mount does literally nothing on restart except create this boot race. It was probably added for a one-time schema load and never removed. Removing it is zero-functional-impact.

## 3. Startup authority inventory (complete)

| Authority | State |
|---|---|
| Windows startup items | Docker Desktop auto-starts (good). Tailscale, Drive, OneDrive, Chrome/Edge. NOTHING for :3100, :18199, or WSL services. |
| Windows Task Scheduler | `PigiGatewayWatch` runs `ping-gateway-watchdog.ps1` (probe :8080/events; 503+degraded marker -> `docker restart ping-gateway` with 10-min backoff stamp file; bounded log). This is the EXISTING active-recovery pattern. Browser login tasks (PigiIGLogin etc.). NOTHING for :3100/:18199/postgres. |
| /etc/wsl.conf | `[boot] systemd=true`, `[user] default=nolan`. No boot command. |
| WSL login scripts | No 3100/18199/docker hooks in .bashrc/.profile. No crontab for nolan. |
| Docker | Docker Desktop 29.5.3, WSL2 backend. No compose files in play for the core stack (ping-postgres has only the `desktop.docker.io/wsl-distro: Ubuntu` label; created via `docker run`, not compose). Restart policies: unless-stopped on the core set; several test containers (swarm02-pg etc.) exited 255 at shutdown and stayed down (no policy or `no`), which is correct. |
| :3100 | `/home/nolan/start-3100.sh` (setsid + /home/nolan/3100.log + health wait). Standing protocol (AGENTS.md 2026-09-24): ALL restarts via this script; it exports NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1; verify the flag in process env after every restart. Manual invocation only; no boot hook. Reachable on tailnet via netsh portproxy 100.79.154.43:3100 -> 172.21.65.209:3100 (WSL IP verified stable across the restart). |
| :18199 journal gateway | `/home/nolan/projects/ping/tools/fyd-journal-gateway/server.mjs` (node builtins only, store = /home/nolan/projects/ping/data/fyd-journal/events.jsonl). No start script, no boot hook, no scheduler entry. Historically launched by hand/agent (4 "listening" lines in gateway.log). AVOID the workspace copy `/home/nolan/workspace/fyd-journal-gateway/` (divergent dev copy, different server). |
| Local cron.d watches | ops-watch-gateway (5m), ops-watch-listener (30m), ops-watch-oom (15m), pig-ssh-watch (30m), heartbeat (30m), dormant-authority-tripwire (2h). ALL are read-only/alert-only by charter ("Do not restart anything"). Watchers exist; recoverers do not, except PigiGatewayWatch. |
| pig-health.sh | Read-only aggregate, three domains (HOST/NETWORK/FYD), state-transition alerting, writes health-state.json + health-log.jsonl. Does NOT check :18199. This is the natural projection store for section 5. |

Net: exactly ONE active recovery authority exists (PigiGatewayWatch for ping-gateway). Everything else either watches without acting or requires a human.

## 4. Recovery design (ONE bounded restart-survival problem)

### Design principles

- No duplicate supervisors. The ONE recovery authority is the existing Windows Task Scheduler + PowerShell watchdog pattern. Extend it; do not build a second one (no new cron recoverer, no new daemon, no systemd unit).
- Reuse existing mechanisms: start-3100.sh for :3100 (with its flag protocol), the proven setsid/nohup node invocation for :18199, `docker start` for exited-with-policy containers.
- Dependency order is the recovery order: postgres -> journal gateway -> Mission Control -> Ask probe. Never attempt a downstream restart while its upstream is unhealthy.
- Bounded: per-service restart backoff via stamp files (same 10-minute pattern as ping-gateway-watchdog.ps1), max attempts per window, then alert-only. A watchdog that restart-loops is worse than one that pages.
- The postgres bind mount is removed (container recreated WITHOUT the -v; data lives in the named volume and is untouched). This deletes the race class at its root. Until that recreation happens (needs Nolan's window, not this design's), the watchdog covers postgres too.

### Proposed: `PigiFydStackWatch` (Task Scheduler task, PowerShell)

One new scheduled task, modeled line-for-line on PigiGatewayWatch (hidden-launch.vbs + .ps1, bounded log, stamp-file backoff). Cadence: every 5 minutes. Each run executes these checks IN ORDER, stopping at the first unhealthy layer (repair it, then exit; next run continues down the chain):

1. PROBE postgres: `docker exec ping-postgres pg_isready` (via wsl.exe) or TCP 5432 from WSL. UNHEALTHY and container is Exited with a restart policy -> `docker start ping-postgres` (covers the lost-backoff class for ANY container, not just postgres), stamp backoff 10 min, log, exit.
2. PROBE journal gateway: WSL-side `curl -s http://127.0.0.1:18199/` (via wsl.exe) OR check `ss -tlnp | grep 18199`. UNHEALTHY -> relaunch exactly: `setsid nohup node /home/nolan/projects/ping/tools/fyd-journal-gateway/server.mjs < /dev/null >> gateway.log 2>&1 &` via wsl.exe; assert exactly one process and one listener afterward; stamp backoff; exit. (Recommend first creating `/home/nolan/start-18199.sh` mirroring start-3100.sh's shape: setsid, log file, health wait, idempotent single-instance guard.)
3. PROBE :3100: tailnet `http://100.79.154.43:3100/` 200 (Windows-side, no WSL dependency for the probe itself) AND WSL-side listener check. UNHEALTHY -> invoke `/home/nolan/start-3100.sh` via wsl.exe (preserves the DEMO_OWNER_MODE flag protocol), then verify the flag in process env per AGENTS.md; stamp backoff; exit.
4. PROBE Ask read path: WSL-side `POST /api/fyd/ask/happy-place {"question":"ping"}` expecting ok:true. This is the end-to-end proof, not a port check.

Each probe records its result (timestamp, layer, outcome, action) as JSONL to a local log. After MAX_RESTARTS_PER_WINDOW (suggest 3 per layer per hour), the watchdog goes alert-only for that layer until the window clears. Alert = append to the same health-log.jsonl pig-health.sh uses, so Mission Control projection (section 5) picks it up without a new channel.

### What this design explicitly does NOT do

- No systemd units in WSL (WSL systemd boot ordering vs Docker Desktop is exactly the swamp we are draining).
- No changes to the local cron.d watchers' charter (they stay read-only; the watchdog is the single actor).
- No sleep loops. Ordering is enforced by probe-then-act sequencing, not timers.
- No new health database (section 5).

### Preconditions / needs Nolan

- Live reboot test of the full chain (reboot WSL -> observe postgres/gateway/3100/Ask converge with zero manual steps). FLAGGED: requires Nolan's approval; do not run unasked.
- Container recreation for ping-postgres without the bind mount (2-minute window, data safe in named volume, but it is a production data container; schedule it, don't sneak it).
- Optional: add `127.0.0.1:3100 -> WSL:3100` portproxy so the watchdog can probe :3100 from Windows localhost like it does :8080 (reversible, same pattern as the existing tailnet proxy).

## 5. Observability spec: five separate states

Mission Control must project these as FIVE independent capabilities, because this incident proved each can fail while the others are green:

1. `machine.reachable` - Pig answers on the tailnet at all (existing HOST domain).
2. `wsl.ready` - WSL distro booted AND responsive (wsl.exe echo / Ubuntu shell). Distinct from machine: Windows can be up while WSL is down (this morning's class).
3. `docker.workload_ready` - dockerd answering in docker-desktop distro AND every expected container (ping-postgres, ping-gateway, ping-qdrant, ping-redis, brain-postgres, ollama) in running state. Distinct from WSL: WSL can be up while the daemon is still booting (the 09:17 race window).
4. `fyd.page_healthy` - :3100 listener present AND tailnet 200 (existing FYD domain, keep both WSL-local and tailnet truth).
5. `ask.read_path_healthy` - :18199 listener present AND an Ask FYD evidence-backed request returns ok:true with citations. Distinct from page: the page can be green while Ask 503s (this morning, 09:49-10:01).

### Projection rules (no new health database)

- Source of truth stays `~/workspace/pig/antifragility/health-state.json` + `health-log.jsonl` (extend pig-health.sh; do not create a parallel store).
- Each capability carries: state, as-of timestamp, source probe, and last evidence (the probe output, not a summary).
- No heartbeat for a capability within its interval -> `STALE` (not green, not red). Never render a capability green from an old reading.
- Failed probe -> `DEGRADED` (partial: e.g., listener up but 503) or `FAIL` (no listener / connection refused) FOR THAT CAPABILITY ONLY. Other capabilities keep their own states.
- Recovery -> transition to green ONLY on a fresh successful probe (evidence-backed), never on "watchdog ran" or "restart attempted".
- pig-health.sh gains the :18199 check and the Ask probe; the watchdog's JSONL actions feed the same log so "restart attempted at T, probe green at T+5m" is visible as a causal pair.

### This morning rendered in the new projection

09:17: machine.reachable=UP, wsl.ready=UP, docker.workload_ready=DEGRADED (ping-postgres Exited 127), fyd.page_healthy=FAIL (no :3100), ask.read_path_healthy=FAIL (no :18199). One glance shows exactly what died and what survived, instead of one misleading aggregate.

## 6. Falsification tests for Mission Control headless dispatch (design)

Existing evidence: 9/9 e2e pass. These eight tests are designed to falsify "Mission Control displays reality". Each test: setup, fault injection, expected projection, and what a failure of the test proves.

- T1 agent crash: kill -9 the worker mid-run. Expect: run shows TERMINATED (worker crash), external-effect status UNKNOWN, spend UNKNOWN, no inferred FAILED. Fails if MC shows FAILED or SUCCEEDED.
- T2 timeout: worker sleeps past the run timeout. Expect: TIMEOUT_REQUESTED, effect UNKNOWN, no automatic retry of any external effect. Fails if the coordinator retries the effect or marks it FAILED.
- T3 malformed result: worker writes non-JSON / schema-violating result artifact. Expect: run shows RESULT_MALFORMED, effect UNKNOWN, artifact quarantined with its bytes preserved for inspection. Fails if MC parses partial fields as truth.
- T4 duplicate result: worker delivers the same result twice (e.g., retry after ambiguous ack). Expect: exactly one result recorded, duplicate deduped with a DUPLICATE_SUPPRESSED event, no double spend/effect. Fails if two results or two effects exist.
- T5 coordinator restart: restart the coordinator mid-run with a live worker. Expect: worker re-attaches or run goes UNKNOWN (never silently SUCCEEDED), lease state survives or is explicitly re-acquired. Fails if the run shows green with no live worker.
- T6 stale lease: let a worker's lease expire while it still runs, then have it report. Expect: report from a stale lease is rejected/quarantined (STALE_LEASE), run does not flip to SUCCEEDED on stale authority. Fails if the late report is accepted as canonical.
- T7 UNKNOWN external-effect status: worker reports effect status UNKNOWN (the fail-closed path). Expect: MC displays UNKNOWN, blocks dependent retries, offers manual reconcile, and never auto-retries. Fails if anything downstream treats UNKNOWN as FAILED or as success.
- T8 artifact missing after claimed success: worker claims SUCCEEDED but the result artifact is absent/unreadable at verification. Expect: run shows CLAIMED_SUCCESS_ARTIFACT_MISSING (a distinct state, not green, not red), effect UNKNOWN. Fails if MC shows SUCCEEDED on a missing artifact.

Global invariant under test: Mission Control may display TERMINATED / TIMEOUT / UNKNOWN / MALFORMED / STALE as FIRST-CLASS states. "Not green" is not "red": red is reserved for proven failure (effect proven failed, spend proven lost). Anything else keeps its precise state.

## 7. Backlog items added

- BACKLOG_NOLAN.md (Pig automation): remove dead postgres bind mount (container recreate); create start-18199.sh; create PigiFydStackWatch task; optional 127.0.0.1:3100 portproxy; Nolan-approved live reboot test.
- BACKLOG_PING.md (runtime): extend pig-health.sh with :18199 + Ask probe and five-state projection; eight MC dispatch falsification tests; capture dockerd boot logs on next reboot.

## 8. Recommended recovery path (the one path)

1. Now (no approval needed, reversible): none. Design is complete; implementation is staged below.
2. Next, with Nolan's window: recreate ping-postgres WITHOUT the schema.sql bind mount (data safe in named volume; eliminates the race class at its root).
3. Then: add `/home/nolan/start-18199.sh` (mirrors start-3100.sh) and the `PigiFydStackWatch` Task Scheduler task implementing the section-4 probe chain with stamp-file backoff (reuses the proven PigiGatewayWatch pattern; single recovery authority).
4. Then: extend pig-health.sh with the :18199/Ask probes and five-state projection (section 5).
5. Finally, with Nolan's explicit approval: live WSL reboot test proving postgres -> gateway -> 3100 -> Ask converge with zero manual steps, plus dockerd boot-log capture to close the residual 127-path uncertainty.
