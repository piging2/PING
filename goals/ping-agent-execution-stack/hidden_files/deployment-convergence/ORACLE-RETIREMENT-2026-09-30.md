# ORACLE RETIREMENT RECORD (2026-09-30, binding owner decisions applied)

Owner decision (2026-09-30 ~12:52 MDT): RETIRE ORACLE AS AN ACTIVE CANONICAL WRITER.
Pig is the one live canonical journal. Oracle = read-only historical/rollback
evidence until an explicit archival/retention decision.

Nolan's condensed authority (2026-09-30 ~13:15 MDT, SUPERSEDES the initial stop):
Oracle stays RUNNING, OBSERVABLE, READ-ONLY, zero write authority, for the 7-day
evidence/rollback window. The initial stop+rename below was corrected at ~13:25 MDT
(see "Correction" section); the end state is a running read-only gateway, not a
stopped container.

## Correction (2026-09-30 ~13:25 MDT, per Nolan's ~13:15 direction)

1. Read-only enforced at the database boundary (reversible, one statement):
   `ALTER ROLE ping IN DATABASE crx_runtime SET default_transaction_read_only = on;`
   The gateway connects as role `ping`, which is a superuser, so REVOKE would be
   meaningless; the transaction mode binds even superusers for the app's connection
   pattern (the app never issues SET/START TRANSACTION). The append-only trigger
   remains as defense-in-depth.
2. Proven: `INSERT` -> `ERROR: cannot execute INSERT in a read-only transaction`;
   `SELECT count(*)` -> 2557 (reads work, journal sealed).
3. Container renamed back to `ping-gateway`, restart policy set to
   `unless-stopped` (stays observable across host reboots; a deliberate stop is
   still respected), started.
4. Gateway boots into its own honest degraded mode: `[GatewayRuntime] WARNING: PG
   service initialization failed: cannot execute CREATE TABLE in a read-only
   transaction` -> `Degraded mode: AI, Connectors, Orca, Artifacts available. PG
   services skipped.` /health reports overall `unhealthy` with the `gateway`
   component `healthy` and PG-backed services `not_initialized`.
   THIS DEGRADED SIGNAL IS EXPECTED. Do not "fix" it by restoring writes.
5. Forensic reads continue via direct psql to ping-postgres (unaffected).
6. Watch (`check-oracle-retirement.sh`, every 5m) rewritten to assert the intended
   read-only running state: container running, restart=unless-stopped,
   default_transaction_read_only=on, journal sealed, /health reachable.

## Initial action (2026-09-30 ~13:05 MDT, superseded by the correction above)

1. Oracle `ping-gateway` container STOPPED. (`docker stop ping-gateway`, exit 137.)
2. Restart policy set to `no`. (`docker update --restart=no ping-gateway`; verified
   `restart=no` via inspect.) It will not come back on reboot.
3. Container RENAMED to `ping-gateway-RETIRED-20260930`. The name is unmistakable in
   `docker ps -a` and in any orchestration listing.
4. NOT changed: journal rows, triggers, schema, postgres container, backup timers.

Why this cut: the gateway container is the only canonical write surface (ports bound
to 127.0.0.1; nothing external could write without SSH; nothing had written in 9
days). Stopping it removes the ingest surface without touching the journal, without a
code deploy, and without disabling the append-only triggers. Renaming labels the plane
RETIRED/READ-ONLY wherever its state is surfaced.

## Pre-change probe (read-only, 2026-09-30 ~12:55 MDT)

- Writers: none. Last journal write 2026-09-21 12:05:37 UTC. Gateway logs showed zero
  ingest lines; one localhost /events probe at 11:58 MDT today was rejected (no row).
- Crons: Oracle host has no crontab; timers are pg-backup, qdrant-snapshot, routine.
  No Pig or cloud-VM cron targets the Oracle gateway.
- Service discovery: no live writer URL lists, no ORACLE_* env keys, no discovery
  entries naming Oracle as an ingest target. Only historical docs and the access
  script itself reference the host.
- Dashboards: served Mission Control (:3100, ping-fyd-converged) reads the Pig
  journal gateway only; it does not read Oracle. No health endpoint exposes Oracle;
  DEPLOYMENT remains UNKNOWN per contract.
- Readers (legitimate, unchanged): daily pg-backup dumps with sha256 sidecars,
  qdrant snapshots, the gateway's own EventBridge poll loop (no-op), local probes.

## Final Oracle state (sealed)

- Host: ping-core-01 (129.146.60.17).
- `ping-gateway-RETIRED-20260930`: image ping-gateway:candidate-3c5d280dd, digest
  sha256:4aa9d7f669bcd46ddfdf81e3baaf519bb3b3338d585e535b975d7f865cd0f8f2, stopped,
  restart=no. (Digest from the read-only probe; treat as recorded, not re-verified.)
- `ping-postgres`: postgres:17-alpine, RUNNING (forensic read path preserved).
- `ping-qdrant`: qdrant:v1.7.0, running.
- `crx_runtime.ping_events`: 2557 rows, max(sequence)=91 (91 rows carry a sequence),
  oldest 2026-09-15 15:33:12 UTC, newest 2026-09-21 12:05:37 UTC.
  Append-only triggers intact: trg_ping_events_append_only,
  trg_ping_events_append_only_truncate.
- Digest (md5, sequence-ordered canonical rows): 98e24e0bcebc4a9194d42148695f0e5f
  (pgcrypto unavailable on this postgres, so md5 built-in was used; deterministic,
  re-computable).

## Bounded forensic read path (preserved)

`ssh ubuntu@129.146.60.17` via the Pig WSL hop (`~/workspace/pig-fb/oracle-ssh.sh`),
container `ping-postgres`, db `crx_runtime`, user `ping`, table `ping_events`.
Daily sealed dumps continue at /opt/ping/backups/ with .sha256 sidecars
(pg-backup.timer active).

## Watch updates (2026-09-30 ~13:10 MDT, folded into retirement work)

The `ops-watch-gateway` 5m watch went CRIT on the rename ("no such object:
ping-gateway"). That is the expected retirement signature, not an incident.
The watch now asserts the retired state truthfully instead of probing a
healthy gateway:

- New `~/workspace/ops-watches/check-oracle-retirement.sh` (every 5m via the
  `ops-watch-gateway` cron): live name `ping-gateway` absent AND retired
  container `ping-gateway-RETIRED-20260930` present/exited/restart=no AND
  journal sealed (2557 rows, max(sequence)=91,
  max(created_at)=2026-09-21 12:05:37.688276+00). CRIT on resurrection or any
  journal write; UNKNOWN on transport failure. Verified live: OK, and CRIT +
  UNKNOWN paths verified against stubbed transports.
- `check-gateway-health.sh` / `check-gateway-health-degrades.sh`: superseded,
  kept as historical record, no longer scheduled. The degrades counter in
  `state.json` is frozen as history.
- `check-deployment-drift.sh`: rewritten to assert the retired-plane seal
  (image digest, restart=no, exited, live name absent). Verified live: OK.
- `check-memory-containment.sh` / `check-container-oom-risk.sh`: now cover the
  two running containers (postgres, qdrant). Verified live: OK.
- `check-unexpected-listener.sh`: unchanged; a removed :8080 is not a new listener.
- README updated with the retirement semantics.

## Follow-ups for an owner (not done here; safer to defer)

- MC marketing copy still reads as if Oracle is live (`src/app/page.tsx` "Missions
  run live on Oracle"; `multi-runtime.tsx` LOCATIONS lists ORACLE as Experimental).
  Changing it needs an MC rebuild + :3100 restart; deferred to the MC owner rather
  than risk the served projection that just passed falsification. Flagged, not fixed.
- Retention/archival decision for the Oracle journal and dumps: still open per the
  owner decision (read-only evidence until decided).
