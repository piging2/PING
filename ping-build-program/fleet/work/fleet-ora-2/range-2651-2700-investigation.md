# Range 2651-2700 investigation (fleet-ora-2, 2026-09-24 UTC)

## Mission family
ORA-2651..2700: family resource-exhaustion (first 50 of 200; family spans ORA-2651..ORA-2850).
Items: 15 ORA_SVCS + conn-pool, fd-table, mem-arena, cpu-quota, disk-io.
"{it} must degrade with backpressure and typed errors, never OOM-kill silently."
Pass criterion: "Exhaust {it}: backpressure engages, typed errors surface; FAIL on silent death or unbounded queue."

## Hard boundary
Exhausting memory/CPU/fds/disk on the live production Oracle host is failure injection. Not attempted.
The criterion was ADAPTED to the strongest read-only proxy: do resource BOUNDS exist at all?

## Evidence (read-only SSH probes)
Container-level bounds (docker inspect HostConfig) for ping-postgres, ping-qdrant, ping-gateway:
- Memory limit: 0 (unlimited) on all three
- NanoCpus: 0 (unlimited) on all three
- PidsLimit: unset on all three
- Ulimits: [] / null
Host: 5903 MB total RAM, ~5148 MB available at probe time.
-> There are NO container-level resource bounds. Under memory pressure, the host OOM-killer decides
which process dies; a service cannot guarantee "bounded degradation" by configuration alone.

App-level bounds found:
- postgres: max_connections = 100 (verified via SHOW). Connection 101 gets a typed "too many clients"
  error: real backpressure at the connection layer. Memory/CPU unbounded by config.
- qdrant: no connection bound visible; no container limits. Qdrant's /readyz would flip on overload,
  but the exhaustion behavior itself is untested here.
- gateway: server.js shows no maxConnections/pool-max/backpressure/queue strings; no container limits.

## Verdicts
- postgres, qdrant, gateway: ADAPT (bounds audit above; the live exhaustion test itself needs staging).
  Explicit gap: with no memory/CPU limits, "never OOM-kill silently" is NOT guaranteed by configuration;
  this is a real hardening gap for the owner, independent of the mission verdict.
- conn-pool, fd-table, mem-arena, cpu-quota, disk-io: N-A (resource dimensions, not deployable entities;
  no artifact exists to exhaust).
- js-worker-a/b, python-adapter, event-ingest, witness, scheduler, backup-agent, health-monitor,
  log-shipper, reverse-proxy, cert-renewer, ollama: N-A (not deployed).

## Followup (ADAPT verdicts)
On staging: memory-pressure test (limit container to 512M, drive load, observe: typed errors vs OOM-kill);
fd-exhaustion test (ulimit -n 64, observe typed EMFILE handling); disk-full test on a scratch volume.
File PROVEN (backpressure + typed errors) or REJECTED (silent death / unbounded queue) per resource.
Owner decision: set Memory/CpuQuota/PidsLimit on all three production containers (recommendation from this pass).
