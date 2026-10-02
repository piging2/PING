# ops-watches — cheap continuous checks for the ping-core-01 operations baseline

One script per check. Exit 0=OK, 1=WARN, 2=CRIT. Each prints a single JSON line:
`{"check": ..., "status": ..., "detail": ..., "at": ...}`. The checks keep the
OK/WARN/CRIT alert-severity vocabulary for their freshness/policy claims, except
`check-oracle-retirement.sh`, which asserts the retired plane's sealed state
(OK = retired state holds, CRIT = resurrection or journal mutation,
UNKNOWN = transport failure). All remote access is read-only
via `~/workspace/pig-fb/oracle-ssh.sh -s` (the only working route). Nothing is restarted,
nothing is changed, except `state.json` (consecutive-failure counter, now historical)
which is the point.

Shared: `lib.sh` (emit/run_remote/run_remote2/sentinel helpers). `gateway-classify.sh`
(typed classification, still sourced by the retirement check for transport typing).
Python helpers: `compare-listeners.py`, `degrades-counter.py` (typed
consecutive-failure counter: UNKNOWN holds, HEALTHY resets; counter now idle).
Baselines: `baselines/listeners.json`, `baselines/gateway-inspect.json`
(captured 2026-09-24T12:06Z, pre-retirement record). Retirement seal:
`~/workspace/goals/ping-agent-execution-stack/hidden_files/deployment-convergence/ORACLE-RETIREMENT-2026-09-30.md`.
State: `state.json` (restore drill proven date; gateway consecutive-failure counter,
frozen at retirement).

## Oracle retirement (2026-09-30, Nolan's binding decision; corrected ~13:25 MDT)

Oracle is RETIRED as an active canonical writer: read-only historical/rollback
evidence, not a live plane. Nolan's condensed authority (~13:15 MDT) supersedes the
initial stop: Oracle stays RUNNING, OBSERVABLE, READ-ONLY, zero write authority, for
the 7-day evidence/rollback window.

Read-only is enforced at the database boundary:
`ALTER ROLE ping IN DATABASE crx_runtime SET default_transaction_read_only = on`
(the gateway's role is a superuser, so REVOKE is meaningless; the transaction mode
binds it for the app's connection pattern). The gateway boots into its honest
degraded mode (PG services skipped, /health overall "unhealthy" with the gateway
component "healthy"): EXPECTED, not an incident. Journal sealed at 2557 rows,
max(sequence)=91, max(created_at)=2026-09-21 12:05:37.688276+00.

Watch changes:
- `check-oracle-retirement.sh` (every 5 min, via the `ops-watch-gateway` cron)
  asserts the intended read-only running state: `ping-gateway` running,
  restart=unless-stopped, default_transaction_read_only=on, journal sealed,
  /health reachable. CRIT on stopped container, restored write authority, or any
  journal write; UNKNOWN on transport failure.
- `check-gateway-health.sh` and `check-gateway-health-degrades.sh` remain
  SUPERSEDED (kept as historical record, no longer scheduled): they asserted a
  fully-healthy gateway, which contradicts the intended read-only degraded state.
- `check-deployment-drift.sh`: asserts the retired-plane seal (image digest,
  restart=unless-stopped, running, read-only). (Updated from the earlier
  stopped-container seal.)
- `check-memory-containment.sh` and `check-container-oom-risk.sh` cover the
  running containers (gateway, postgres, qdrant). (Updated: gateway is running
  again.)
- `check-unexpected-listener.sh`: unchanged; :8080 bound by the running gateway
  is the expected listener, not a new one.

## Monitor semantics (Nolan 2026-09-27: UNKNOWN is a legitimate state)

Absence of evidence across a failed transport is NOT evidence of remote
absence. EVERY remote-parsing check prints `SENTINEL=ORACLE_OK` as the remote
script's first line; a missing sentinel means the script never executed on
the Oracle host, so the check emits status UNKNOWN (exit 1, warn-level) and
never parses transport silence into a false OK/WARN/CRIT. Transport failure
typing comes only from the single failed probe's stderr
(`type_transport_from_stderr`); the checks make NO additional probes (no
layer-echo round trips). Layer certainty that cannot be read from that one
stderr stays at the honest `PROBE_TRANSPORT_FAILED` rather than being
manufactured. No check may claim "container missing" unless it reached the
host authority and observed docker directly. UNKNOWN is never collapsed into
FAILED. Proven necessary by the 2026-09-27 Pig transport incident: every
downstream alarm (gateway "container missing", consecutive non-healthy
counts, identity mismatch) was the same Tailscale CONNECT failure wearing
different masks. Whether the Pig slept during the window is UNPROVEN (root
cause UNKNOWN); no monitor may claim it either way.

## Recommended cron schedule (all times UTC; host runs on UTC)

FREQUENT (failure detection):
- `check-oracle-retirement.sh`    every 5 min   — retired state holds (live name absent, retired container exited restart=no, journal sealed); supersedes the gateway-health checks below
- ~~`check-gateway-health.sh`~~        SUPERSEDED 2026-09-30 — Oracle retired; live-named gateway gone by design
- ~~`check-gateway-health-degrades.sh`~~ SUPERSEDED 2026-09-30 — counter frozen in state.json as historical record
- `check-container-oom-risk.sh`    every 15 min  — WARN at 80% of 1GiB, CRIT at 95%
- `check-unexpected-listener.sh`   every 30 min  — new TCP listener vs baseline

DAILY (policy conformance):
- `check-pg-backup-fresh.sh`       2x daily: 05:30 and 17:30 — newest dump < 26h, sidecar, timer enabled
- `check-qdrant-snapshot-fresh.sh` 2x daily: 05:45 and 17:45 — newest snapshot < 26h, sidecar, timer enabled
- `check-rpcbind-closed.sh`        daily 06:00 — disabled/inactive, no :111
- `check-memory-containment.sh`    daily 06:15 — 1GiB ceilings intact on all three
- `check-deployment-drift.sh`      daily 06:30 — retired-plane seal (image digest, restart=no, exited, live name absent)
- `check-restore-drill-stale.sh`   daily 06:45 — WARN if last proven restore > 30 days (local only)

After a host reboot: run `check-rpcbind-closed.sh` once manually (OPS-001 followup),
and refresh `baselines/listeners.json` if the ephemeral 127.0.0.1:46699 listener changes port.

## Knowns (2026-09-24)
- ping-gateway image tag is `ping-gateway:candidate-3c5d280dd` (promoted build), StartedAt
  2026-09-24T11:55:36Z from this morning's ops verification. Uptime ~10-15 min at check time is
  expected, not an incident.
- 127.0.0.1:46699 is an ephemeral loopback listener recorded in the baseline; a port change
  there is noise, refresh the baseline rather than alerting.
- qdrant-snapshot.timer next fires 2026-09-25 04:01:46 UTC (04:00 + jitter). pg-backup.timer
  fires 03:30 UTC. The 26h freshness window absorbs timer jitter.
