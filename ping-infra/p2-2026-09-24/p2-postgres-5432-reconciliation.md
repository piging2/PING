# P2: Postgres host-5432 collision reconciliation (2026-09-24 ~11:45 MDT)

## Ownership (live, verified via `docker ps` on the Pig)

Only ONE container publishes host 5432:

* **`brain-postgres`** (postgres:15-alpine, Up 2 days)
  `0.0.0.0:5432->5432/tcp` — sole owner of host port 5432.

No collision exists right now.

## Full Postgres inventory

| container | image | host publish | networks | role (observed) |
|---|---|---|---|---|
| brain-postgres | postgres:15-alpine | **0.0.0.0:5432** | bridge | LIVE spine: `ping_runtime` DB (ping_missions, ping_events); gateway's DB |
| ping-postgres | postgres:15-alpine | 0.0.0.0:5433 | bridge, ping_internal | legacy/intended constitutional DB (50 tables per 2026-09-12); no observed live consumer |
| ping-rc-postgres | postgres:16 | 127.0.0.1:15433 | (rc net) | RC staging (`rc_staging`); used by ping-rc-gateway via container name |
| ping-test-pg | postgres:17-alpine | 0.0.0.0:55433 | — | test |
| ping-gauntlet-pg | postgres:17-alpine | 127.0.0.1:54339 | — | gauntlet |
| swarm02-pg | postgres:16 | 0.0.0.0:55434 | — | swarm experiment |

## Who actually needs host-published PostgreSQL

1. **`ping-gateway`** (live): `POSTGRES_HOST=host.docker.internal`,
   `POSTGRES_PORT=5432`, `POSTGRES_DB=ping_runtime`, `POSTGRES_USER=postgres`.
   The gateway runs on `bridge` and reaches the DB through the Windows host
   loopback, so it genuinely needs 5432 published on the host. This is the
   ONLY production consumer of host 5432.
2. **Human/ops tooling**: host publishing also serves ad-hoc psql/DBeaver
   access from Windows/WSL. Convenience, not a service dependency.
3. `ping-rc-gateway` → `ping-rc-postgres` uses the **container name**
   (`POSTGRES_HOST=ping-rc-postgres`), the preferred pattern: no host port
   needed for service-to-service traffic.

`ping-postgres` (host 5433) has **no observed live consumer**. The gateway
was re-anchored to `brain-postgres/ping_runtime` on 2026-09-16 and has stayed
there. 5433 is currently vestigial surface.

## Declared config vs real ownership

* Reconstructed `ping` compose (`connectors/ping-compose.reconstructed.yml`):
  declares qdrant/vault/redis only; **no postgres service, no 5432 claim**.
  Applying it cannot collide.
* Live containers were created 2026-08-02 (labels predate current compose
  files); several carry no compose project label at all
  (`brain-postgres`, `ping-gateway`, `ping-postgres` show `project=` empty).
  They are pets, not cattle: recreated by hand, not by compose.
* No compose file found on the Pig (`/home/nolan/PING` does not exist;
  `/home/nolan/projects` has none) declares `5432:5432`.

## Reconciliation

* Declared: nothing claims host 5432 in any compose file on record.
* Actual: `brain-postgres` owns it, and the live gateway depends on it.
* Verdict: **no action required, no second claimant**. The standing rule
  holds: DO NOT APPLY any compose that publishes host 5432 while
  `brain-postgres` is live.

## Guard (for future compose work)

Any compose file or `docker run` that maps host port 5432 must be rejected
in review unless it (a) removes `brain-postgres` first, or (b) re-points the
live gateway's `POSTGRES_HOST/PORT` at the replacement in the same change.
The gateway cannot use container-name DNS for its DB today because it sits
on `bridge` while the DBs sit on other networks; moving the gateway onto a
shared internal network would remove the host-port dependency entirely
(future improvement, not scheduled).

## Open question (not mine to close)

`ping-postgres:5433` (the 2026-09-12 "intended" constitutional DB) has no
observed consumer. Either something still needs it (prove it) or it is a
second decommission candidate after the qdrant work. Flagged for the next
P2 sweep; no action taken.
