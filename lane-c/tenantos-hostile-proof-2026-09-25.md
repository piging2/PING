# LANE C — TenantOS hostile isolation proofs — evidence log
Date: 2026-09-25 ~09:35-09:45 MDT. Prober: LANE C (reader/falsifier).
Repo: /home/nolan/projects/ping @ fyd/sprint-integration-2026-09-24 (82b42053).
NOTE: branch fyd/tenantos-integration-2026-09-24 does not exist in any Pig repo;
TenantOS work is merged into fyd/sprint-integration-2026-09-24 via
workerB/tenantos-fyd-seam + workerH/tenantos-journal-merge. Commit e0d2868e2 unknown.
Live services probed: Qdrant 127.0.0.1:6333 (ping-qdrant), Postgres :5433 (ping-postgres),
PING gateway :8080 (ping-gateway:repair-cert-20260924). Zero live tenants
(gateway /tenants -> {"tenants":[],"count":0}; tenant_registry 0 rows).

## 1. VECTOR ISOLATION — FAIL (A->B and B->A)
- Qdrant collections live: constitutional_documents, constitutional_memory (0 pts),
  knowledge (408 pts, 768-dim cosine). NO auth: GET /collections -> 200 with no key.
- Sampled payloads: constitutional_documents keys = aggregate_id, aggregate_type,
  content_hash, event_id, event_type, text_preview, timestamp (NO tenant_id).
  knowledge keys = canonical_hash, embedding, event_type, kind, model, namespace,
  projected_at, source_event_id, text (NO tenant_id).
- Code: retrieval_service.py semantic_search(query, limit, point_type) — filter is
  point_type only, no tenant param. Zero "tenant" hits in retrieval_service.py,
  authority_search.py, mission_control_knowledge_apis.py. Zero tenant_id refs in
  entire constitutional-runtime Python tree.
- LIVE HOSTILE PROBE: created collection lane_c_probe; upserted
  {tenant_id: tenant-a, text: "SECRET-A..."} and {tenant_id: tenant-b, text: "SECRET-B..."}.
  Unfiltered scroll (the only pattern the real path supports) returned BOTH points.
  => A->B LEAK: True. B->A LEAK: True. Collection deleted after probe.

## 2. POSTGRES ISOLATION — FAIL (A->B and B->A)
- ping_events: 739 rows, NO tenant_id column; 0/739 payloads and 0/739 metadata
  contain tenant_id. No tenant partitioning whatsoever.
- 11 tables carry tenant_id columns (customers, google_reviews, events,
  canonical_events, hpp_projects, ...), but ZERO code references tenant_id in the
  backend; customers table was 0 rows before probe.
- LIVE HOSTILE PROBE (customers table): INSERT tenant-a/cust-a-1 + tenant-b/cust-b-1.
  Unfiltered SELECT returned both rows => A->B read LEAK confirmed.
  UPDATE customers SET display_name='PWNED-BY-A' WHERE customer_id='cust-b-1'
  => UPDATE 1, tenant-b row overwritten => A->B WRITE confirmed.
  Missing-context query (no WHERE tenant_id) returns all rows => NO fail-closed.
  Test rows deleted after probe (0 rows).
- Gateway /events -> 401 without auth (auth-gated, but not tenant-partitioned behind it).

## 3. EVENT PRIVACY — PASS (FYD journal) / FAIL (backend store) => PARTIAL
- FYD journal gateway (tools/fyd-journal-gateway/server.mjs): hostile suite
  f-journal-privacy.test.ts rerun 2026-09-25: 11/11 PASS. Full tenant suite:
  39/39 PASS (6 suites).
- LIVE MANUAL PROBE (ephemeral gateway, temp store):
  write tenant-a => journaled, event_id fyd-ovl-muh4kk4a-cfd285cb721f.
  spoofed A->B write (tenant_id=b, siteId=a) => 400 tenant_mismatch. REFUSED.
  write missing tenant_id => 400 tenant_required. REFUSED.
  read ?tenant=tenant-b => 0 events (B->A blocked).
  read missing ?tenant= => 400 tenant_required (fail closed).
  read ?tenant=tenant-a => exactly its own 1 event. PASS all directions.
- Backend ping_events: no tenant discriminator; any reader sees all 739 events. FAIL.

## Q-T-01 STATUS
NOT IMPLEMENTED. No per-tenant vector tenancy exists in any form (no tenant_id on
points, no query filtering, no Qdrant auth). Locked 2026-09-25 05:15 decision
prescribes logical partitioning (immutable tenant_id + trusted execution context +
fail closed, no db-per-tenant / collection-per-tenant), but no code implements it.
FRAMING CONFLICT for coordinator: task brief says Q-T-01 is blocked-on-design
needing Nolan's call; memory/2026-09-25.md#L167 records a locked correction that
Q-T-01 is NOT automatically held for Nolan and must run through the escalation
classifier (coordinator decides at >=80%).

## PROPOSED SMALLEST FIXES (not implemented — LANE C is read-only)
1. Vector: add tenant_id to point payloads at write time (qdrant_projection_worker);
   add required tenant_id param to semantic_search/metadata_lookup injecting
   FieldCondition(key="tenant_id") into the existing Filter; raise on missing
   context (fail closed). No new authority.
2. Postgres: enforce tenant_id in the query layer for the 11 tenant_id tables
   (no such layer exists yet — that is the gap); add tenant_id to ping_events
   (+ backfill) and scope the gateway event endpoints. Gateway is a shared
   authority — needs coordinator approval.
3. Backend events: mirror the FYD journal gateway's tenant_required/tenant_mismatch
   semantics (already proven green) onto ping_events.
