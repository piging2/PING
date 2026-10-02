# P2: Postgres / Ollama healthchecks — prepared change + restart impact (2026-09-24)

Status: **PREPARED ONLY. NOT APPLIED.** Applying requires container
recreation (Docker cannot add/change a healthcheck on a running container),
which means brief downtime for stateful services. No outage will be
manufactured for this; it goes through the normal bounded maintenance
mechanism when authorized.

## Current state (live)

| container | healthcheck | image notes |
|---|---|---|
| brain-postgres | NONE (null) | postgres:15-alpine ships no HEALTHCHECK |
| ping-postgres | NONE (null) | same |
| ping-rc-postgres | NONE (null) | same |
| ollama | NONE (null) | ollama/ollama; has bash, no curl/wget |

(For contrast: ping-qdrant's broken curl probe was already fixed 2026-09-24
with a bash /dev/tcp probe against /healthz and now reports healthy.
ping-vault's probe fix is defined but deliberately not applied pending the
Vault decision in p2-vault-migration-plan.md.)

## Proposed healthchecks

### brain-postgres / ping-postgres / ping-rc-postgres

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres -d ping_runtime"]
  interval: 10s
  timeout: 5s
  retries: 5
  start_period: 30s
```

* `pg_isready` ships in the official postgres image; no new binaries.
* `-U postgres`: brain-postgres has `POSTGRES_USER=postgres`.
  (ping-postgres uses `crx_user`; ping-rc-postgres uses `crx`; adjust `-U`
  per container. `-d` should name the DB the dependents actually use:
  `ping_runtime` for brain-postgres.)
* What it proves: the postmaster accepts connections. It does NOT prove
  schema/migration state; that stays a readiness concern for the gateway.

### ollama

```yaml
healthcheck:
  test: ["CMD-SHELL", "timeout 5 bash -c 'exec 3<>/dev/tcp/localhost/11434' || exit 1"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

* Verified: the ollama image has bash, no curl/wget, so the /dev/tcp probe
  (same pattern as the fixed qdrant probe) is the right tool.
* Interval 30s: ollama model loads can saturate the event loop; 10s probing
  risks false negatives under load.
* What it proves: the HTTP listener is up. It does NOT prove a model is
  loaded; `/api/ps` scraping stays an MC-projection concern.

## Restart impact

* **Mechanism**: `docker stop` + `docker rm` + `docker run` (or `docker
  compose up -d` where a compose file exists) with the identical image,
  env, volumes, ports, networks, plus the new `--health-cmd`.
  Data volumes are untouched (`compose_postgres_data` for brain-postgres;
  ollama models volume).
* **brain-postgres downtime**: seconds to ~1 min (postmaster restart +
  WAL replay). During the window the **live gateway cannot reach its DB**:
  `/health` will degrade and mission/event writes will fail. The gateway
  has `restart: no` semantics historically; confirm its restart policy
  before the window so it comes back on its own if the host reboots.
* **ollama downtime**: ~30-90s (model reload on first use after restart is
  lazy; the container itself starts fast). Consumers: open-webui and any
  local inference callers; both tolerate retries.
* **Rollback**: re-run the same recreation without the healthcheck flags.
  Stateless change; rollback is exact.
* **Ordering**: do ollama first (low blast radius, proves the pattern),
  then ping-postgres (no observed consumers), then brain-postgres only in
  a real maintenance window with the gateway watched.

## Preconditions before any apply

1. Confirm current gateway restart policy (`docker inspect ping-gateway`
   RestartPolicy) so a DB blip does not strand it.
2. Snapshot: `docker inspect` dumps of each container saved next to this doc
   (so recreation is byte-faithful apart from the healthcheck).
3. Maintenance window authorization (the decision surface in
   p2-decisions.md).

## Explicit non-goals

* No schema/migration health semantics (that is gateway-readiness work).
* No compose-ification of these pets in this change (out of scope; the
  reconstructed `ping` compose covers qdrant/vault/redis only).
