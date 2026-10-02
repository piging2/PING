# P2: ping-qdrant `constitutional_memory` — consumer proof (2026-09-24 ~11:40 MDT)

Question: WHO CONSUMES `constitutional_memory`?

## Short answer

Nobody. The collection exists, is empty (0 points), has no live writers and no
live readers. `ping-qdrant` itself is unreachable from every production
consumer. Classification: **decommission candidate**. DO NOT DELETE YET:
dependency graph is proven below; deletion needs Nolan's word per standing law.

## Live topology (verified 2026-09-24 via Pig WSL probes)

Two Qdrant containers exist:

| container | host ports | networks | collections (live) |
|---|---|---|---|
| `brain-qdrant` | 6333-6334 published | bridge, compose_brain_internal, ping-shared | `constitutional_documents` (26 pts), `constitutional_memory` (0 pts), `knowledge` (389 pts) |
| `ping-qdrant` | NONE published | ping_ping_internal only | unknown (unreachable from WSL; no route) |

Correction to earlier notes: the collections previously attributed to
`ping-qdrant` live on **`brain-qdrant`** (host :6333). `ping-qdrant` has no
published ports and shares no network with any consumer.

## Writers

* `constitutional_memory`: **zero points**. Never written to (or wiped; no
  audit trail exists either way; effect is identical: no data).
* `knowledge` (389 pts): payloads show `namespace: "tenant::hpp"`,
  `core::owner`, `core::system`; event types CLAIM_CREATED /
  OBSERVATION_CREATED; timestamps from 2026-09-11; `model: nomic-embed-text`,
  `embedding: "fallback"`. Last observed write era: 2026-09-11. No writes
  observed since.
* `constitutional_documents` (26 pts): DOCUMENT_IMPORTED test fixtures from
  2026-06-24 (`"Test Document 9"`, `source: test_ingestion`). Stale test data.
* Code search: **zero** references to `constitutional_memory` in workspace
  source (py/js/ts/sh, excluding agent tool-output noise). Qdrant client
  imports exist only in vendored third-party libs (crewai, agentscope, mem0),
  not in PING-authored code.
* Running `ping-gateway` image (`ping-gateway:devin-boundary2`): `grep -rl
  qdrant /app` returns **nothing**. The gateway does not speak Qdrant.
* Pig WSL crontab: no qdrant-related entries.

Conclusion: no live writer exists. Historical writers were 2026-06/09
experiments; their code is not in the current tree.

## Readers

* Gateway: none (no qdrant refs in image).
* `:3100` Mission Control `/api/mc/technology`: reads **collection metadata
  only** (names + `knowledge` point count) from `http://127.0.0.1:6333`
  (= brain-qdrant). It never reads vectors or payloads. This is observability,
  not a consumer.
* open-webui: no qdrant env refs.
* No other container has a reason to query it (verified env scans).

Conclusion: no live reader of vector data exists.

## Runtime reachability

* Gateway env carries `QDRANT_URL=http://host.docker.internal:6333`
  (resolves to **brain-qdrant**) and `QDRANT_HOST=ping-qdrant`
  (dead config: gateway is on `bridge`, ping-qdrant only on
  `ping_ping_internal`; direct fetch from the gateway fails).
* `ping-qdrant` is reachable only by containers on `ping_ping_internal`:
  `ping-vault` and `ping-redis`. Neither speaks Qdrant.
* `brain-qdrant` is reachable via host :6333 (WSL, Windows, containers via
  host.docker.internal).

## Tenant semantics

Observed in `knowledge` payloads only: `namespace` field with values
`tenant::hpp`, `core::owner`, `core::system`. Tenant isolation is a
payload convention, not a Qdrant-level enforcement (no API key observed on
the HTTP API; single shared collections). Any future use must treat this
as advisory, not a security boundary.

## Canonical source

There is none for Qdrant. Canonical truth lives in Postgres
(`brain-postgres/ping_runtime`: ping_missions, ping_events) and the file
journal. Qdrant collections are DERIVED projections (recall only, per the
2026-09-13 architecture freeze). `constitutional_memory` holds nothing to
lose.

## Rebuild procedure

If a future consumer needs it: collections are recreatable in one call
(`PUT /collections/constitutional_memory`, 768-dim cosine, matching the
observed config). Data would be re-projected from the Postgres journal,
not restored from backup. The `ping_ping_qdrant` volume holds only the
orphaned `ping-qdrant` storage.

## Dependency graph (complete)

```
constitutional_memory (brain-qdrant, 0 pts)
  writers:  (none live; historical: 2026-06/09 experiments, code gone)
  readers:  (none; MC reads collection NAMES only, not this data)
  network:  brain-qdrant reachable; ping-qdrant isolated
  canonical: none (derived-only by architecture)
  tenants:  n/a (empty)
```

```
ping-qdrant (container)
  reachable by: ping-vault, ping-redis (same net; neither is a client)
  published ports: none
  volume: ping_ping_qdrant (content unverified; container rebuilt 2026-09-24 ~10:23 MDT with fixed healthcheck)
  consumers: none
```

## Classification

**Decommission candidate** for: `ping-qdrant` container + `ping_ping_qdrant`
volume. `brain-qdrant` stays (it is the live, reachable Qdrant; the MC
projection and any future recall use read it at host :6333).

Deletion blockers (must clear before any delete):
1. Nolan's explicit word (standing law: no destructive infra action without it).
2. One read of `ping-qdrant`'s actual collections via a container on
   `ping_ping_internal`, to confirm it holds nothing of value before the
   volume is dropped.
3. Remove or correct the dead `QDRANT_HOST=ping-qdrant` gateway env at the
   same time (config drift cleanup).

## Drift notes for Mission Control

* `svc:qdrant` at `http://127.0.0.1:6333/` is brain-qdrant, not ping-qdrant.
* `hc:qdrant-docker` (ping-qdrant) now reports **healthy**: the broken curl
  probe was replaced 2026-09-24 with a bash /dev/tcp probe against /healthz.
  The conditional `incident:qdrant-health-probe` correctly stops firing.
* `risk:masked-health` basis text still says "qdrant and vault are
  docker-unhealthy"; qdrant half is now stale.
