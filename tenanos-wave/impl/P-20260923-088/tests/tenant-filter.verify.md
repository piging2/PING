# P-20260923-088 — Live-DB verification checklist

Run these against a Postgres that has the patches applied (after
`missionRuntime.initialize()` has run at least once, so `idx_pm_namespace`
exists). Copy-paste ready; replace `<tenant>` with a real slug.

## 1. GIN index exists and is used

```sql
SELECT indexname FROM pg_indexes
WHERE tablename = 'ping_missions' AND indexname = 'idx_pm_namespace';

EXPLAIN (COSTS OFF)
SELECT * FROM ping_missions WHERE payload->>'namespace' = 'tenant::<tenant>';
-- expect: Bitmap Heap Scan / Index Scan using idx_pm_namespace
```

## 2. Event-query parity (patch-01)

```sql
-- tenant-scoped count from SQL must equal what
-- GET /mc/missions/stats?tenant=<tenant> returns for each status bucket
SELECT status, COUNT(*) FROM ping_missions
WHERE payload->>'namespace' = 'tenant::<tenant>' GROUP BY status;

-- events in the other namespace must NEVER appear in a tenant-scoped read
SELECT DISTINCT namespace FROM ping_events;
-- then: GET /mc/inbox?tenant=<tenant> → every row.namespace == 'tenant::<tenant>'
-- and:  GET /mc/inbox (no tenant) → HTTP 400, code TENANT_CONTEXT_MISSING
```

## 3. UNKNOWN-namespace rows are never served as a tenant's

```sql
-- rows with no resolvable namespace (legacy / non-bridge writes)
SELECT COUNT(*) FROM ping_missions
WHERE payload->>'namespace' IS NULL OR payload->>'namespace' = '';

-- none of these may appear in any ?tenant= response
-- (the exact-match filter excludes them by construction)
```

## 4. Trace tenant check (patch-02)

```
GET /mc/missions/<id>/trace?tenant=<tenant>
  - mission belongs to tenant      → 200 with trace
  - mission belongs to another     → 403, code CROSS_TENANT_REFERENCE
  - mission has no namespace       → 403, reason tenant-unresolvable
  - no ?tenant                     → 400
  - mission does not exist         → 404
```

## 5. POST /missions requires tenant (patch-04)

```
POST /missions {}                                   → 400 TENANT_CONTEXT_MISSING
POST /missions {missionType, payload, tenant_id:"ACME"} → 400 INVALID_TENANT_ID
POST /missions {missionType, payload, tenant_id:"acme"} → 200, tenant_namespace "tenant::acme"
-- verify the row:
SELECT payload->>'namespace' FROM ping_missions WHERE mission_id = '<id>';
```

## 6. Correlation-chain check (patch-03, /replay/trace)

```
-- pick a correlationId whose chain contains events in two namespaces
GET /mc/replay/trace/<correlationId>?tenant=<tenant> → 403, code CROSS_TENANT_REFERENCE
```

## 7. DLQ honesty label (deferred per-tenant views)

```
GET /mc/dead-letters/stats → response carries scope:'operator-global',
  tenant_isolation:'unverified' (no per-tenant DLQ until the
  repository_dead_letters tenant column migration lands)
```

## 8. Regression guard: callers without tenantId still work

`getPending(limit)`, `getActive()`, `getStats()`, `getTrace(id)` with no
second argument must behave exactly as before (no WHERE clause added) —
the Orca scheduler path (routes/missions.js GETs) is unaffected.
