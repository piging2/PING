# Incident Runbook: Unexplained Correlated Container Stop (P0)

Scope: the Oracle host's canonical stack (ping-gateway, ping-postgres, qdrant).
Reference incident: 2026-09-20T01:03:15Z, ping-gateway + ping-postgres stopped
and detached from oracle_ping_internal within the same second. Actor UNATTRIBUTED.

**Order of operations is fixed and non-negotiable:**

## PHASE 1 - PRESERVE EVIDENCE FIRST

Do this before touching anything else. Every minute of delay loses evidence
(docker events is an in-memory ring buffer; see RETROACTIVE-LIMITATIONS.md).

1. Do NOT restart, recreate, prune, or remove anything. Do not run any
   `docker compose` command, `docker stop/start/restart/rm`, `docker system
   prune`, or `docker network` mutation.
2. Fix the incident window: start = first observed anomaly minus 15 minutes,
   end = now. Use UTC ISO 8601.
3. Run the capture script ON the host:
   `./capture-evidence.sh --since "<window start>" --out /opt/ping/incident-evidence/<name>`
   It is read-only. It never prunes or mutates.
4. Copy the evidence directory off-host (scp to WSL). Verify sha256sums.txt.
5. Only then proceed to Phase 2.

If the script cannot run (host unreachable, docker daemon dead): record exactly
that, with timestamps, as the first line of the incident record. A dead daemon
is itself evidence (see decision tree, "daemon restart").

## PHASE 2 - RECOVER SERVICE

Service recovery uses the hardened rules from FL-20260919-ORACLE-007:

1. Restart postgres FIRST: `docker compose -p oracle -f <full compose path> up -d --force-recreate postgres`
   (ALWAYS explicit -f full path AND -p oracle; never rely on compose file
   discovery. Never bare `up -d` on all services: the scheduler build defect
   aborts it.)
2. Wait for postgres to be healthy (pg_isready or log shows ready for connections).
3. Restart gateway: `docker compose -p oracle -f <full compose path> up -d --force-recreate gateway`
4. Verify the gateway is NOT in degraded in-memory mode: grep its logs for
   "degraded". /health returning 200 is INSUFFICIENT, a degraded gateway still
   serves health. If degraded, restart the gateway again once postgres is up.
5. Verify all three containers are on oracle_ping_internal:
   `docker network inspect oracle_ping_internal` must list gateway, postgres, qdrant.
6. Re-proof the event path: authenticated POST /events, confirm the ping_events
   count increments and dedup still works. Confirm the pre-deploy sentinel event
   is intact.

## PHASE 3 - ATTRIBUTE (after service is healthy)

Work through the decision tree below using the Phase 1 evidence. Record the
verdict as one of: CONFIRMED cause, or UNATTRIBUTED with the top hypotheses
ranked by evidence. Do not speculate about actor identity beyond what the
evidence shows.

### Decision tree

Read `20-events/docker-events*.txt` first. All times UTC.

**A. docker compose stop / down**
- Pattern: stop events for the project's containers within seconds of each other,
  container names match the compose project, then network disconnect/remove
  events for the project network. `docker-events-daemon.txt` shows no daemon
  restart. `docker ps -a` shows containers Exited(0) and still present (stop) or
  gone (down).
- Distinguishing: containers carry `com.docker.compose.project` labels
  (see 30-containers inspect). `docker compose ls` state matches.
- Attribution limit: compose CLI actions do not log the invoking user/IP in
  docker. Correlate with sshd/sudo/auth evidence (J).

**B. docker stop (CLI/API, per container)**
- Pattern: `container stop` then `container die` events with a ~10s gap (the
  SIGTERM grace period). Clean exit code 0 for postgres; if the process ignored
  SIGTERM, SIGKILL follows and exit code is 137.
- Distinguishing from kill: the stop-then-die gap is seconds long and a `stop`
  event is present. No project-wide network teardown.

**C. docker kill**
- Pattern: `container kill` event immediately followed by `container die`
  (gap ~0s). Exit code 137. OOMKilled=false in inspect State.
- Distinguishing from OOM: no OOM killer lines in 55-kernel/dmesg-oom.txt or
  50-journal/kernel-oom.txt, and inspect shows OOMKilled false.

**D. dockerd daemon restart**
- Pattern: `50-journal/docker-service.txt` shows docker.service stopping and
  starting; `20-events/docker-events-daemon.txt` has a gap (events are not
  persisted across daemon restarts); containers with `restart: unless-stopped`
  / `always` come back with new start events but no stop/kill events before the gap.
- Distinguishing: no per-container stop/kill events precede the outage, and the
  daemon journal shows the restart.

**E. host restart**
- Pattern: `00-host/uptime.txt` shows uptime shorter than the incident window;
  `50-journal/boot-list.txt` shows a new boot; `00-host/last.txt` shows a reboot
  entry near the incident time. All containers restarted per policy, no
  stop/kill events.
- Distinguishing from daemon restart: boot list and uptime prove a full host
  reboot.

**F. OOM kill**
- Pattern: `55-kernel/dmesg-oom.txt` or `50-journal/kernel-oom.txt` contains
  "Out of memory: Killed process" naming the container's process near the
  incident time; `30-containers/<name>-inspect.txt` State shows OOMKilled=true,
  ExitCode 137; `00-host/meminfo.txt` may show memory pressure.
- Distinguishing: OOMKilled=true is the decisive field. Exit 137 alone is not
  enough (kill also gives 137).

**G. health check / restart policy loop**
- Pattern: repeated die/start pairs in docker events with NO stop/kill events;
  inspect shows RestartCount > 0 and a RestartPolicy of unless-stopped/always;
  `container health_status: unhealthy` events precede the restarts;
  `30-containers/<name>-logs.txt` shows the process crashing on its own.
- Distinguishing: restarts are self-inflicted by the daemon per policy, not
  externally issued. Correlated multi-container stops do NOT fit this pattern
  unless the same bad image/config hit both at once (then check H).

**H. network disconnect (containers detached but alive, or detached + stopped)**
- Pattern: `20-events/docker-events-network.txt` shows `network disconnect`
  events for oracle_ping_internal naming the containers; containers may still be
  Running in `10-docker/ps-all.txt` but absent from `40-networks` inspect.
  In the reference incident, disconnect was COMBINED with stop: both containers
  Exited AND detached. `docker network disconnect` alone does not stop a
  container, so a combined pattern means either two actions (stop + disconnect)
  or an automation that does both (see I, and compose down in A).
- Distinguishing: pure network action leaves containers Running.

**I. deployment automation (CI/CD, watchtower-style updater, operator script)**
- Pattern: ephemeral randomly-named containers created just before the stop
  (builder/runner footprints); container recreate events (die, then a NEW
  container ID with the same name); image digests in `10-docker/images.txt`
  changed vs the pinned release; systemd timers or cron firing at the incident
  time (70-scheduler); compose project files with fresh mtimes
  (70-scheduler/compose-files.txt).
- Distinguishing: recreation and digest change are the tells. A plain
  stop/kill leaves the same container ID.

**J. SSH / operator action**
- Pattern: `60-auth` shows an accepted sshd session, or `50-journal/sudo.txt`
  shows a sudo invocation, within the incident window; `50-journal/sshd.txt`
  shows the session; `00-host/last.txt` shows the login.
- Attribution limit: timing correlation is evidence, not proof. dockerd does not
  record which user or source IP issued a stop/kill via the API (see
  RETROACTIVE-LIMITATIONS.md). A session present in the window strengthens the
  operator-action hypothesis; no session in the window weakens it but does not
  eliminate API access via other paths (e.g. an existing agent process).

**Unresolvable:** if docker events show the stop/kill sequence but daemon logs,
auth logs, journals, and scheduler evidence show nothing in the window, record
the verdict as UNATTRIBUTED with the API-sequence evidence preserved. That is
exactly the state of the reference incident, and preserving it cleanly is the
point of Phase 1.

## After action

1. File or update a FAILURE_LEDGER entry: incident time (UTC), evidence dir
   path + checksums, Phase 2 commands used, Phase 3 verdict.
2. If the verdict is UNATTRIBUTED or a new cause appears, open a backlog item
   for the hardening it implies (e.g. dockerd audit logging, alerting on
   correlated stops).
3. Never delete the evidence directory. It is the only record of the incident.
