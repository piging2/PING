# Pig Antifragility — Hardening Plan

Date: 2026-09-18. Constraint envelope: no Pig reboot; no Docker/Chrome/WSL restarts while convergence probes run; no duplicate supervisors; no orphaned processes; no credential copying; no malware-like persistence; every component justified; recovery proven by test.

## Why the existing pieces are insufficient (no-duplicate-supervisor justification)
Existing: per-profile Chrome relaunchers (5 Windows scheduled tasks, silent, CDP-down only), on-demand `cdp-health.sh` (no schedule, no history, no alerting). Nothing covers: Docker daemon / postgres / gateway health, SSH/WSL reachability, disk pressure, Windows-reboot detection, state-transition alerting, or the CDP wedge (F4). The new piece is READ-ONLY monitoring + alerting — it relaunches nothing, kills nothing, manages no processes. One script + one cron.

## P0 — Implemented 2026-09-18 (Phase 3)
- H1: `docker update --restart unless-stopped ping-postgres`. Justification: F7 — the canonical store was the only container that would not survive a Docker daemon restart, by accident of imperative startup. Metadata-only, reversible (`docker update --restart no`), no container restart. Test: `docker inspect` shows `unless-stopped`; container still Up, not restarted (StartedAt unchanged).
- H2: Reaped hung orphan (bash 92744 + `docker exec` 92761, 6h idle, 0 CPU, predates current program). Justification: F3 — held docker exec session, no owner, no liveness. Reversible by nature (nothing to restore). Test: PIDs gone; `docker ps` unchanged otherwise.
- H3: `~/workspace/pig/pig-health.sh` + 15-min cron. Read-only aggregate: SSH→Pig, WSL uptime, Docker daemon, ping-postgres + ping-gateway running, CDP 9223/9225/9226/9227 via `cdp-health.sh`, disk use, Windows last-boot. Writes `health-state.json` (last known) and appends `health-log.jsonl` on state transitions only. Blackout-aware: SSH failure inside 06:45–08:15 or 15:45–17:15 America/Denver is labeled LIKELY_BLACKOUT, not OUTAGE. Exits non-zero on DOWN/DEGRADED transitions so the cron surfaces it. No credentials, no Pig-side persistence, no process management. Test: forced-state dry run + live run, see below.

## P1 — Proposed (small, reversible; needs no operator secret)
- H4: CDP wedge detector, ALERT-ONLY. Deepen the probe: `/json/list` + a bounded `Target.getTargets` round-trip; flag WEDGE_SUSPECT when version answers but target ops hang. Never force-kill (only Nolan does the manual window cycle). Needs: agreement that a read-only deep probe with a 10s timeout cannot disturb live workers.
- H5: Watchdog flap alerting. Parse `C:/Users/nolan/.local/share/pigi/chrome-cdp-watchdog*.log` for >3 relaunches/hour per profile → alert. Read-only log parsing; catches crash-loops the silent relaunchers hide.

## P2 — Escalated (needs operator decision / policy)
- H6: Postgres backup/restore (L4+). Blocked on cost/risk policy: RPO/RTO, retention, off-host destination, key custody. Already deferred by operator.
- H7: "Interactive only" scheduled tasks (F13). After a reboot with no logon, nothing recovers. Fix options: run tasks whether logged on or not (needs Nolan's credential/service account — credential boundary, do NOT touch), or document the Nolan-logon dependency as accepted. Needs operator call.
- H8: ping-qdrant / ping-vault UNHEALTHY (F14). App-level; do not touch during convergence probes. Flagged to parent.
- H9: Egress proxy SPOF (F17). Hatch infrastructure; cannot fix from here. Noted.
- H10: Docker Desktop "start on login" setting (F6) could not be verified read-only through the shell layers without risking a settings write. Verify manually or accept UNKNOWN.

## Explicitly NOT doing
- No changes to watchdog relaunch behavior (proven working, F5).
- No force-kill of any Chrome (session-loss risk; Nolan-only).
- No backup infrastructure until H6 policy exists.
- No Pig-side daemons, no new scheduled tasks on the Pig, no registry edits.
