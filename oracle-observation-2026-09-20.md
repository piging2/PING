# Oracle Observation Window: 2026-09-20 baseline reading

Read-only observation, no mutations, no fake traffic. First reading after Nolan's ORACLE PROMOTION COMPLETE directive.

## Reading time

2026-09-20 ~18:47 MDT (2026-09-21T00:47Z approx)

## Container state

- ping-gateway: image `ping-gateway:candidate-84486f056`, Up 25 minutes, RestartCount 0, State running. StartedAt 2026-09-21T00:21:31Z aligns with promotion window. No unexpected restarts.
- ping-postgres: postgres:17-alpine, Up 24 hours (healthy)
- ping-qdrant: qdrant/qdrant:v1.7.0, Up 25 hours (healthy)

## Health

`GET /health` returns status healthy. Components: gateway healthy, generated_artifacts healthy (5), integrations healthy (3/3, posthog/email/sms configured but not provisioned), event_governance healthy (0 total), event_runtime healthy (28 handlers, 0 emitted, 0 persisted, 0 deduplicated, 0 dispatched, 0 failed), canonicalization healthy, qdrant healthy (1.7.0), embedding healthy (0 embedded, 19 subscribed).

Note: zero event counters are expected after the promotion restart; they are runtime counters, not durable history. Durable history lives in PostgreSQL.

## Resources

- Disk: /dev/sda1 45G, 37G used, 7.9G free (83%). Watch, not urgent.
- CPU: gateway 1.10%, postgres 1.94%, qdrant 0.01%
- Memory: gateway 109MiB, postgres 32MiB, qdrant 18MiB against 5.7GiB limit. Healthy headroom.

## Watch list (Nolan's list, ongoing)

- gateway readiness: healthy, no restart loops
- postgres: healthy, up 24h
- canonical event persistence: not re-probed this reading (prior promotion proved write plus readback); next readings will check for growth under normal bounded workloads only
- event rejection/collision behavior: no traffic observed, no synthetic probes sent
- mission creation, worker execution, result completion: no activity observed
- restart behavior: RestartCount 0, clean
- memory/CPU/disk: nominal except disk at 83%, watch
- container restarts: none unexpected
- error rates: 0 in health stats
- Qdrant projection health: healthy
- log anomalies: not pulled this reading (read-only ps plus health only)

## Policy

This window is observe-only. No architectural refactors deploy here. Future readings append to this file. Real bounded workloads only, never synthetic load to make dashboards interesting.
