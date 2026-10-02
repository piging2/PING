# Qdrant Inventory (read-only) — 2026-09-24

## Authoritative data plane: brain-qdrant

- Host ports 6333/6334 published. Up 2 days.
- Live gateway (`ping-gateway`) env: `QDRANT_URL=http://host.docker.internal:6333`
  → the live plane is brain-qdrant, NOT ping-qdrant.
- Collections (queried 2026-09-24):
  - `constitutional_documents`: 26 points, status green
  - `constitutional_memory`: 0 points, status green (empty on the live plane)
  - `knowledge`: 389 points, status green

## ping-qdrant: isolated, no live consumers

- Container `ping-qdrant`: Up ~58 min, healthy.
- Network: internal-only (`ping_ping_internal`, 172.24.0.4). Shares the
  network ONLY with ping-vault and ping-redis — neither is a Qdrant consumer.
- No host ports published (running config differs from compose.yaml, which
  declares 6333:6333).
- API-key protected (401 without key). Key not pursued (secret; vault HOLD).
- Collections/point counts on ping-qdrant: NOT VERIFIED (auth required).
- Compose defines consumers (`ping-projection-worker` etc. with
  QDRANT_URL=http://qdrant:6333), but NONE of those services are running.
- Status: decommission CANDIDATE only. No deletion, no data touched.

## Integrated Python worker routing

Verified: all integrated workers construct QdrantClient ONLY via
`ProjectionAuthority.get_client()` (single construction site):

- `runtime/workers/projection_worker.py` (WRITE path: projection upserts)
- `runtime/workers/retriever_worker.py` (READ path)
- `runtime/retrieval/retrieval_service.py` (READ path)
- `runtime/kernel/workers/qdrant_projection_worker.py` (WRITE path)
- Guard: `runtime/authorities/test_qdrant_access_sovereignty.py` pins the
  single-construction-site rule.

Direct `QdrantClient(` constructions also exist, but ONLY in scripts/tools/
dead code (mission_control_knowledge_apis.py, check_qdrant*.py,
destructive_recovery_certification.py, tools/projection_sovereignty_audit.py,
projection_replay.py, app_container.py, brainos/*) — not the integrated path.
Classify-only per freeze; no seam refactor.

## Access inventory

| endpoint | collection | purpose | r/w | tenant scope | failure semantics |
|---|---|---|---|---|---|
| brain-qdrant (host 6333) | constitutional_documents | vector search for retrieval | READ | single-tenant (no tenant filter in authority) | fail-soft: returns None/[] on exception |
| brain-qdrant | constitutional_memory | default search target (ProjectionAuthority fallback chain) | READ | single-tenant | fail-soft (currently 0 points on live plane) |
| brain-qdrant | knowledge | vector search for retrieval/context packs | READ | single-tenant | fail-soft |
| (configured, not live) | constitutional_memory | projection worker upserts | WRITE | single-tenant | exceptions propagate in worker path |

## Verdict

Qdrant authority resolved: the live plane is brain-qdrant. ping-qdrant is an
isolated standby with no consumers. No seam changes made.

## Delta 2026-09-24 ~11:33 MDT (P1/P2 lane, verified against /home/nolan/ping)

- JS live write path: `gateway/bootstrap/gateway_runtime.js:486` constructs
  QdrantAdapter with QDRANT_URL=http://host.docker.internal:6333 (brain-qdrant);
  EmbeddingService upserts the `knowledge` collection. Fail-soft on init failure.
- JS live read path: HybridSearch reads `knowledge`
  (`ping-runtime/search/hybrid_search.js:99`); health check registered.
- Tenant namespace/metadata filters: NONE on any path (Python upserts, Python
  search, JS adapter). Tenant isolation at the Qdrant layer is unproven. Sibling
  TenantOS lane trace covers Postgres/MC; no Qdrant hostile test published yet.
  ping-qdrant untouched pending that trace.
- Canonical sources: Vault documents + PostgreSQL events. Qdrant is a derived
  projection (TRUTH != EMBEDDINGS). Rebuild: `runtime/projection_worker/
  rebuild_certification.py` (destroy + rebuild constitutional_memory from truth
  sources, verify identical counts/hashes/lineage); qdrant_projection_worker
  replays Postgres events.
- `constitutional_memory`: 0 points, no live writer, no live reader.
  Decommission candidate; deletion is a future wave (freeze).
- Freeze test: no A/B/C/D met. Backlogged: ping-qdrant decommission (after sibling
  trace), constitutional_memory disposition, Qdrant tenant-filter design,
  ping-qdrant collection inventory via an authorized path.
