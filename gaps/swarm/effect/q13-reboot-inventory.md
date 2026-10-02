# Q13 — Reboot inventory (EFFECT SWARM, 2026-10-01, INVENTORY ONLY — no reboot performed)

Pig WSL uptime at probe: 1 day 11h (up since ~2026-09-30 07:13 MDT).
Auto-recovery: Windows Task Scheduler PigiFydStackWatch (every 5 min →
pigi-fyd-stack-watchdog.ps1: probes postgres → :18199 → :3100 → Ask path,
relaunches via blessed start-*.sh scripts with a restart budget) and
PigiGatewayWatch (→ ping-gateway-watchdog.ps1). Task Scheduler starts at
Windows boot, so the WSL stack self-heals ~5 min after a Pig reboot.
:18200 is NOT covered by any watchdog (no matches in the watchdog script).

## MEMORY/PROCESS plane — DIES on reboot
- :3100 next-server (pid 46070, since 2026-09-30 17:59 MDT): dies; watchdog restarts via start-3100.sh.
- :18199 journal gateway (pid 850, node server.mjs, up 1d 11h): dies; watchdog restarts via start-18199.sh.
- :18200 fork gateway (pid 40434, up 1d 7h): dies; NO watchdog — stays down until manual start. Served :3100 env still points FYD_CUSTOMIZE_GATEWAY_URL/FYD_JOURNAL_GATEWAY_URL at :18200.
- 3100-lifecycle-watch.sh (pid 1057, read-only watcher): dies; start-3100.sh re-ensures exactly one instance on next launch.
- Always-on Chrome :9223 (FB/IG login sessions): process dies; profile/cookies persist on Windows disk. Whether the FB session is still valid after relaunch is UNKNOWN (safe test: after next natural Chrome restart, run loginState probe via check_login.js — no reboot needed to answer).
- In-flight engagement worker (WMI-detached node): dies mid-pass. Intents stay EXECUTION → refuse filter closes them as UNKNOWN_EXECUTION (fail-closed, proven in code). Progress.jsonl/result.json already fsync'd to the Pig inbox (Windows FS) survive → collect_pass.sh still records observations after reboot.
- Postgres (docker: ping-postgres Up 35h, restart-policy unless-stopped; lane-e-pg policy no; brain-postgres): containers die on reboot; ping-postgres restarts when the Docker daemon returns. com.docker.service is Manual/Stopped NOW yet docker ps works — the daemon's boot behavior is UNKNOWN (safe test: inspect Docker Desktop "Start Docker Desktop when you log in" setting + whether dockerd runs as a service; no reboot needed).
- HPP events (logEvent → InMemoryEventRepository, src/lib/events.ts:200): ALL accepted Kit-webhook events EVAPORATE on :3100 restart. Accepted-but-undelivered state, by design of the MVP store.

## LOCAL FILE plane — SURVIVES
- Canonical journal /home/nolan/projects/ping/data/fyd-journal/events.jsonl (54KB, live, written 18:27 MDT): survives; gateways append to the same file after restart (path is config-derived, not time-derived).
- Fork journal /home/nolan/projects/ping-fyd-converged/data/fyd-journal/events.jsonl (56KB, stale since 9/30 16:04): survives.
- Intent ledger ~/workspace/outreach/action-intent-ledger.jsonl, engagement history, pass logs, ~/workspace/pig-fb/jobs/*.json dispatch receipts, Pig inbox job/result/progress files: survive (local disk / Windows FS).
- .next build, 3100-restarts.log, lifecycle logs: survive.
- Cron-equivalent scheduling: NO OS cron on this VM (`crontab -l` empty) and none in Pig WSL; passes are driven by the agent runtime scheduler. Its persistence across ITS host reboot is UNKNOWN (safe test: parent runs `cron.list` and checks job durability semantics — no reboot needed).

## CANONICAL JOURNAL plane — SURVIVES, destination stable
Same file before/after restart; writers resolve it from config (post-convergence: FYD_JOURNAL_STORE, fail-closed). No time-based rotation observed.

## POSTGRES plane — SURVIVES (data), availability UNKNOWN across reboot
Data on docker volumes persists; whether the daemon returns without a login is unverified (see daemon note above).

## PROJECTION plane — REBUILDABLE, not separately durable
MC/:3100 projections are derived at serve time from journal + repo state; nothing indicates a separate durable projection store that could diverge. A reboot loses no projection that can't be re-derived. (If a projection cache exists, it wasn't found in this lane — journal swarm owns the store inventory.)

## WORKER QUEUE plane — NO central queue; ledger-as-queue
There is no broker queue. The intent ledger IS the queue: ACTION_INTENT_DURABLE intents with no EXECUTION are safe to re-attempt after reboot; EXECUTION-without-observation become UNKNOWN_EXECUTION (refused until deliberate reconcile). Nothing accepted disappears silently; the unknown stays unknown.

## Verdict: PASS with two UNKNOWNs and one noted loss
- Durable: journal, ledger, history, receipts, builds, inbox files.
- Dies cleanly: all processes (watchdog-restarted except :18200), in-flight workers (fail-closed via ledger).
- Dies LOSSY: HPP in-memory events (accepted Kit-webhook events vanish on :3100 restart).
- UNKNOWN: (1) Docker daemon autostart on Pig boot (exact safe test: read Docker Desktop settings + service config, no reboot); (2) FB/IG Chrome session validity after browser relaunch (exact safe test: loginState probe after next natural Chrome restart); (3) agent-runtime scheduler durability (exact safe test: `cron.list` from parent).

## Smallest fix
Add :18200 to the watchdog or retire it (served env still points at it); move logEvent off InMemoryEventRepository before anything depends on HPP events; verify Docker Desktop login-start setting.
