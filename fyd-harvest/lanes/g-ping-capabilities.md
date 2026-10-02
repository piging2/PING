# LANE G — PING Backend Capability Inventory for FYD

**Date:** 2026-09-22 (MDT) · **Scope:** read-only · `/home/nolan/ping` @ `cc6856c3b` (branch `refactor/runtime-authority-convergence`) · live DB `brain-postgres`/`ping_runtime` (2321 `ping_events`, verified this run). No writes, no installs, no commits; Pig access via `~/workspace/pig/pigwsl-run.sh`.

**Frame applied:** PING is the substrate; FYD harvests. Classifications below distinguish code-exists from data-live from caller-wired. "READY TO CALL" means: module + HTTP route (or direct module API) + live data or a live caller observed. Documentation alone never counted.

---

## 1. Classified inventory

Legend: ✅ READY TO CALL · 🔶 READY WITH WRAPPER · 🟡 NEEDS SMALL PATCH · ❌ MISSING

### tenant / business identity — ✅ READY TO CALL
- `gateway/routes/tenants.js:19-72` — `POST /tenants`, `GET /tenants`, `GET /tenants/:id`, `PUT /tenants/:id`, `DELETE /tenants/:id`, `POST /tenants/:id/heartbeat`. Mounted in the live gateway.
- `ping-runtime/runtime/tenant_registry.js` — `TenantRegistry` authority: `executeRegisterTenant({tenantId /* tenant://{id} */, name, domains, capabilities[], metadata})`, upsert on `tenant_id`.
- Live data: `tenants` table = **1 row**: `hpp | happy-place-platform | Happy Place Platform | active | 2026-09-16`. Namespace `tenant::hpp` carries **177 live events**.
- ⚠️ Duplicate: `tenant_registry` table exists but has **0 rows** — the live tenant lives in `tenants`, not in the authority's own table. Reconcile before building on one (see §6).

### objects — 🟡 NEEDS SMALL PATCH (shape exists, storage never went live)
- DDL: `database/ping_objects.sql:13` (`ping_objects`), `:57` (`ping_relationships` with CHECK-constrained predicate vocabulary: `follows, likes, replies_to, approves, denies, has_website, located_at, offers, employs, member_of, published, external_identity`), `:103` (`ping_transitions` — create/relate/propose/approve/publish/tombstone).
- Runtime shape: `gateway/relationship_objects.js` — `RelationshipEdgeObject` with canonical bytes → SHA-256 → deterministic identity → lineage → witness.
- **None of the three tables exist in the live DB.** `repository_objects` (BYTEA `canonical_bytes`, `gateway/migration_engine.js:175`) exists live but has **0 rows**; `OBJECT_CREATED/UPDATED/VERSIONED` are in the event catalog (`gateway/generated/event_generator.js`) but have **0 live rows**.
- Nearest live object data: `knowledge_nodes` = 197 rows, all `node_type='event'` (a projection of events, not business objects).

### relationships — 🔶 READY WITH WRAPPER
- Live `knowledge_edges` table exists but **0 rows**; `/knowledge` routes exist: `POST /search` (namespace **required**, fails closed), `GET /nodes`, `POST /nodes`, `GET /nodes/:nodeId/neighborhood`, `POST /edges` (`gateway/routes/knowledge.js:11-86`).
- Predicate vocabulary and `RelationshipEdgeObject` exist (see objects). No populated relationship data; the FYD website-side `rel-*` edges (lane F) have no PING-side counterpart yet.

### events — ✅ READY TO CALL
- Routes `gateway/routes/events.js:14-176`: `GET /events` (limit/offset), `/recent`, `/stats`, `/:stream`, `/:eventId/{children,descendants,ancestors}`, `/correlation/:correlationId`; `POST /events` ingest; `POST /processed|/failed`; `GET /unprocessed`.
- Live: 2321 rows. Top types: `MISSION_*` (1800), `REPLAY_COMPLETED/LINEAGE_CREATED/PROJECTION_CREATED/WITNESS_CREATED` (63 each), `CLAIM_CREATED` (60), `OBSERVATION_CREATED` (58), plus sparse business events (`LEAD_CREATED` 2, `ESTIMATE_CREATED` 1, `REVIEW_RECEIVED` 2…).
- ⚠️ **No namespace filtering on reads**: `SELECT * FROM ping_events …` with no `WHERE namespace`; `EventReadAuthority` (`ping-runtime/events/event_read_authority.js`) contains zero namespace mentions. Namespace is a write-time tag, not a read-time gate (except `/knowledge/search`). Any tenant-scoped consumer must filter client-side or use a new seam (§2).

### evidence — 🔶 READY WITH WRAPPER
- `ping-runtime/evidence/evidence_authority.js:47-175`: `accumulate(sourceEventIds)`, `verify(evidence)`, `rank(results)`, `getStats()` — real module, used by `constitutional_verification_authority` (called from `relationship_objects.js`).
- **No HTTP route exposes it.** FYD can call the module (same repo) but needs a thin route wrapper for HTTP access. Note lane F's finding: FYD website-side `ping-event:<eid>` refs are string pointers — this authority is the resolver that was never consulted.

### observations — ✅ READY TO CALL
- `OBSERVATION_CREATED` in event catalog; 58 live rows; emitted via `UnifiedEventRuntime`; `POST /ingest` (`gateway/routes/ingest.js`) and `POST /events` are the ingest paths. Observation→claim→classification→recommendation worker pipeline is the live processing spine (63 completed cycles).

### provenance — 🔶 READY WITH WRAPPER
- `gateway/provenance_authority.js` exists; `LINEAGE_CREATED` events: 63 live. But **no `lineage` table in the live DB** (events only).
- Fixture/projection-level provenance survives via `tools/fyd-site-projection/dump.py` (source URL, per-file sha256, observedAt, pipeline commit in projection headers). Per-field provenance loss is a FYD-side gap (lane F), not a PING gap.

### signatures / digests — ✅ READY TO CALL
- `CanonicalAuthority.hash` / `CanonicalBytes.serialize`; deterministic IDs via `identityAuthority.generateFromCanonicalHash`; `POST /identities` mints Ed25519 identities idempotently with gateway-genesis attestation (`gateway/routes/identities.js:1-50`, mounted at `/identities` per `gateway/bootstrap/gateway_runtime.js:683`).

### capabilities — ✅ READY TO CALL
- `CapabilityRegistry` (`gateway/bootstrap/gateway_runtime.js:295`) + routes `gateway/routes/connectors.js:13-64`: `GET /capabilities`, `/capabilities/:category`, `/capabilities/reasoning/summary`, `/capabilities/operation/:operation`; connector `/:name/{discover,health,sync,events/:service,search}`.
- `ping-runtime/orchestration/execution/capability_registry.json` — worker capability inventory (note: modified in working tree, uncommitted).
- `capability_requests` table exists live, 0 rows.

### authorization / policy — 🔶 READY WITH WRAPPER
- `ping-runtime/events/event_governance.js` + `GET /governance/{policy, policy/:eventType, namespaces, namespaces/:namespace, violations, stats, validate/:eventType}` (`gateway/routes/governance.js:9-55`, mounted at `/governance` per `gateway_runtime.js:777`). Machine-readable ownership + namespace policy, violation tracking.
- **No HTTP auth exists anywhere**: `gateway/route_middleware.js` `asyncHandler` only logs/formats; no bearer/JWT/API-key/session middleware on any route. OAuth (`OAuthFlowManager`/`TokenStore`, `ping-runtime/connectors/oauth_provider`) + `exterior_agent_credentials` table serve **exterior connectors only** (google/github), not gateway callers.

### proposals — 🟡 NEEDS SMALL PATCH (three partial shapes, none wired end-to-end)
1. `ping-runtime/orchestration/proposal_pipeline.js` — file-based (`proposals/*.json`), code-refactor proposals with stages `submitted→…→merged`; artifact types are `refactor_patch`, `audit_report`, … **No callers, no `PROPOSAL_*` event types, wrong shape for site content.**
2. **`ping-runtime/approval/business_action_authority.js` — the closest typed-patch IR** (see §3): `proposeAction({missionId, capability, targetIdentity, preview, reason, evidence[], risk, expirationSeconds})` → `PENDING_HUMAN` → `approveAction`/`rejectAction` with expiry; deterministic `action_id`. **Zero callers; `proposed_actions` table does not exist in the live DB.**
3. `gateway/approval_authority.js` — `approvals` table (`approval_id, patch_id, approval_policy, approval_status, approval_conditions JSONB, witness_hash, approved_by/at`) for **git-commit approval**; table not in live DB.

### approval / human gate — 🟡 NEEDS SMALL PATCH
- Same as proposals: `BusinessActionAuthority` is the gate (PENDING_HUMAN → APPROVED/REJECTED/EXPIRED, `decided_by/at` recorded). Needs: table creation, HTTP routes, one caller. Do not build a fourth approval shape.

### agents — ✅ READY TO CALL (partial)
- `agent_workspaces` = 2 live rows; `/ai-workspace` routes: `POST /{sentiment,tag,parse,translate,summarize}`, `GET /project/:projectId{,/stats}` (`gateway/routes/ai_workspace.js`). `ai_workspace_results` table exists, 0 rows.
- Mission layer is the live agent-execution record: `ping_missions` = 450 rows; `/mission-control/missions/{active,pending,stats}`, `/missions/:id/trace`.

### missions / runs — ✅ READY TO CALL
- Tables `ping_missions` (450), `mission_events`, `mission_executions` (0 rows — executions tracked as events, not rows). `MISSION_CREATED/ASSIGNED/STARTED/COMPLETED` = 450 each. Deterministic mission IDs with lease/claim columns.

### media / assets / blobs — ❌ MISSING (binary store); 🔶 registry shape exists
- **No binary media/blob store exists in PING.** No image/media/blob/asset tables; `bytea` appears only for `repository_objects.canonical_bytes` (0 rows). No image-serving routes.
- Nearest: `hpp_project_artifacts` (`ping-runtime/business/project_authority.js:62-74`): `id, tenant_id, project_id, artifact_type, title, file_url, file_size, mime_type, metadata JSONB, created_at` — a **URL-reference + metadata registry**, tenant-scoped. **0 rows live.**
- `ArtifactAuthority` (`gateway/artifact_authority.js`) handles JSON document artifacts with canonical hashes — not binary media.
- Website acquisition is also ❌ in PING: no crawler (no playwright/lightpanda/crawl in `gateway/` or `ping-runtime/`); ingestion lives in the FYD website repo. FYD must adopt the registry shape (§4), not build a PING blob store.

### search — ✅ READY TO CALL (degraded backend)
- `POST /knowledge/search` — **namespace required, 400s without it** (the one read path where the privacy boundary is enforced). Returns 503 if `hybridSearch` unavailable; `ping-qdrant` is unhealthy per the harvest plan, so vector recall is degraded — keyword/SQL fallback is the honest path.
- `GET /connectors/:name/search` for connector-scoped search.

### knowledge / context retrieval — ✅ READY TO CALL
- `/knowledge/*` (above) + `/context/*` (`gateway/routes/context.js:14-48`): `recent-events`, `worker-status`, `runtime-digest`, `latest-summaries`, `recent-failures`, `model-metrics`, `daily-activity` — the context-pack sources. Live `knowledge_nodes` = 197.

### feed / projections — 🟡 NEEDS SMALL PATCH
- `PROJECTION_CREATED` events: 63 live, but **no `projections` table in the live DB** (projections are emitted, not persisted as rows).
- `/mission-control/dashboard` + `/business/{who-needs-followup, stalled-estimates, pending-reviews, ai-recommendations, today-work, unpaid-invoices, at-risk-projects, marketing}` (`gateway/routes/mission_control.js:62-336`) derive metrics **from events on the fly** (e.g. `needsFollowup = LEAD_CREATED + ESTIMATE_SENT`) — event-derived analytics, ✅ callable today.
- No SSE/websocket feed found; `GET /events/recent` polling is the feed. `GET /system/state` serves config manifests, not data.

### provider / model adapters — ✅ READY TO CALL
- `/ai/*` (`gateway/routes/ai.js:12-50`): `GET /providers`, `GET /health`, `POST /chat`, `POST /embed`, `POST /select` — universal routing through `aiRuntime`. `/ollama/*`: `POST /chat`, `GET /models`, `POST /autocomplete`. `gateway/adapters/ollama_adapter.js`; `gateway/ollama_session_authority.js`. Note `gateway_runtime.js:331` comment: the live spine has a single inference owner — route model calls through `/ai`, not around it.

### website acquisition — ❌ MISSING in PING
- No crawler, no website-ingest module in PING core. `FYD_SITE_OVERLAY` is registered in the event catalog (`gateway/generated/event_generator.js:335`, `authority_owner: 'FydSiteAuthority'`) but has **0 rows in the live DB** — overlays live only in the demo journal (`ping-fyd-demo` on `ping-test-pg`), which is what `tools/fyd-site-projection/dump.py` reads by default-behavior switch (`OVERLAY_JOURNAL=demo`). The FYD website repo owns acquisition; PING owns the journal contract.

### analytics / outcomes — ✅ READY TO CALL (event-derived)
- `/mission-control/dashboard` + `/business/*` (above); `telemetry_metrics` table exists live (0 rows), `gateway/telemetry_subsystem.js` exists. Outcomes today = derived counts over the event journal, which is the honest substrate.

---

## 2. (a) The smallest existing read contract — and the proven absence

**No sanitized tenant-graph projection exists.** Absence proof: searched `gateway/` + `ping-runtime/` for `tenant_graph`, `tenant.graph`, `site_projection`, `site.projection`, `graph_projection` — the only hits are `gateway/generated/event_generator.js` (catalog entry), test files (`test_phase0_fixes.js`, `test_confidence_spine.js`), `ping-runtime/embeddings/embedding_service.js`, and `event_governance.js`. **No route, no module, no table.**

Nearest misses (each covers only a slice):
- `GET /mission-control/dashboard` — event counts by type + mission stats; no objects, relationships, media, or per-tenant scoping.
- `GET /context/runtime-digest`, `GET /system/state` — runtime internals and config manifests, not tenant data.
- `GET /knowledge/nodes/:nodeId/neighborhood` — graph slice only; no tenant/media/evidence join.
- `tools/fyd-site-projection/dump.py` — the **de facto combined contract today**, but FYD-side and demo-grade: reads `FYD_SITE_OVERLAY` rows **directly from the gateway container's Postgres** (bypasses HTTP), merges with website-repo fixtures, writes `var/fyd-projections/<slug>.json`. Against the live DB it currently yields **zero overlay rows**.

**Candidate "one backend seam" (the single smallest addition):**
`GET /tenant/:id/graph` — one route joining, server-side, with **namespace filtering enforced** (the missing piece on `/events`):
`tenants` row → `ping_events WHERE namespace = 'tenant::<id>'` (+ causal children/descendants) → `knowledge_nodes`/`knowledge_edges` for the tenant → `hpp_project_artifacts WHERE tenant_id` (media registry) → `CapabilityRegistry` entries → `EventGovernance` namespace policy → recent-changes cursor (max `event_id`/`timestamp`). Read-only; sanitized by construction (namespace filter + the existing sanitized `/identities` GET pattern as the model). This is the only net-new backend surface the product sprint needs; everything else is already callable.

---

## 3. (b) Patch/proposal contracts — closest existing typed-patch IR

**Reuse `BusinessActionAuthority.proposeAction`** (`ping-runtime/approval/business_action_authority.js:24-60`). The shape:

```
{ action_id: 'action_'+hash16, mission_id, capability, target_identity,
  preview, reason, evidence: [], risk: 'medium',
  expiration_at, status: 'PENDING_HUMAN' → APPROVED|REJECTED|EXPIRED,
  proposed_at, decided_at, decided_by }
```

Deterministic IDs via `CanonicalAuthority.hash({mission_id, capability, target_identity})` — idempotent re-proposal. Mapping for FYD SiteSpec patches: `capability='sitespec.patch'`, `target_identity='tenant::<id>/site:<slug>'`, `preview`=rendered diff, `evidence[]`=field provenance refs (the `ExtractedField` refs lane F needs to survive), `risk` from change class. Runner-up: `approvals` table shape (`gateway/approval_authority.js:46-58`) — git-commit-oriented, keep for code patches only. **Do not use** `ProposalPipeline` (file-based, code-refactor stages) or invent a fourth shape. Needed patch: create `proposed_actions` table, mount HTTP routes (`POST /actions/propose`, `POST /actions/:id/{approve,reject}`, `GET /actions/:id`), wire one caller.

---

## 4. (c) Media authority

**PING has no binary media store and should not gain one.** The authority to adopt is the **URL-reference + metadata registry** shape at `ping-runtime/business/project_authority.js:62-74` (`hpp_project_artifacts`): `id, tenant_id, project_id, artifact_type, title, file_url, file_size, mime_type, metadata JSONB, created_at`. This maps 1:1 onto Nolan's 2026-09-22 media decision (ingest authorized media with source URL, `observed_at`, sha256 digest, MIME, dimensions, license/authorization basis, derivative lineage — all fit in `metadata` JSONB + columns; binary bytes stay out of Postgres). `ArtifactAuthority`'s canonical-hash pattern (`gateway/artifact_authority.js:44-70`) gives the digest/identity primitive for the registry rows. FYD must populate this registry — not build a parallel asset store, not add `bytea` columns.

---

## 5. (d) Owner gate seam — exact modules

The future real owner-auth plugs into these, in order:

1. **`gateway/route_middleware.js` — `asyncHandler`** is the single chokepoint every route passes through. Today it only logs and formats (`route_middleware.js:18-42`). **This is the exact seam**: a session/capability check goes here, once, and covers all 160+ routes. Nothing exists there today — the gateway is unauthenticated.
2. **`gateway/constitutional-dist/identity-authority.js`** (compiled from `runtime/constitutional/src/`, pinned by `POST /identities` as "the ONE IdentityAuthority … never reimplemented here") + `POST /identities` (Ed25519 mint, idempotent) + sanitized `GET /identities` — the identity primitive. Owner identity = a minted PING identity with an owner capability grant.
3. **`CapabilityRegistry` + `OAuthFlowManager`/`TokenStore`** (`ping-runtime/connectors/oauth_provider`, wired at `gateway/bootstrap/gateway_runtime.js:287-315`) + `exterior_agent_credentials` table — the capability/credential seam; currently exterior-connector-scoped, the pattern to extend for owner capability grants.
4. **`EventGovernance` + `GET /governance/namespaces`** — the visibility policy the gate consults.

**Exists:** identity minting/verification, capability registry, governance policy. **Missing:** any HTTP session/auth, any owner role, any per-tenant credential. The `DEMO_OWNER_MODE` seam must stay local/bounded and visibly incapable of becoming this.

---

## 6. (e) Visibility / privacy model

**Use PING's — it exists at policy level, with one enforcement gap:**

- Policy: `EventGovernance` (`ping-runtime/events/event_governance.js:11` `NAMESPACE_OWNERS`) + `GET /governance/*` — per-event-type ownership, namespace policy, violation tracking. ✅ callable.
- Live namespaces: `core::system` (2134 events), `tenant::hpp` (177), `core::owner` (10). Tenant isolation is a live convention in the data.
- Enforcement: `POST /knowledge/search` **requires** `namespace` (400 without it) — the boundary is enforced there. **But `/events` reads do not filter by namespace** (`EventReadAuthority` has no namespace logic; routes fall back to raw `SELECT *`). No field-level policies exist anywhere (searched — only namespace ownership).
- Rule for FYD: always pass an explicit namespace; treat unfiltered `/events` as cross-tenant; the new `/tenant/:id/graph` seam (§2) must enforce `WHERE namespace` server-side. **No FYD-only privacy truth** — but the `/events` read-path gap must be closed in the seam, not worked around per-consumer.

---

## 7. Duplicate-risk warnings

1. **Two tenant stores:** `tenant_registry` (0 rows, authority-owned) vs `tenants` (1 live row). Pick `tenants` for reads; reconcile or deprecate the other before the seam ships.
2. **Three proposal/approval shapes:** file-based `ProposalPipeline`, `BusinessActionAuthority`, `ApprovalAuthority`. Anoint `BusinessActionAuthority` for content actions; leave the other two in their lanes.
3. **Three object/relationship stores:** `ping_objects`/`ping_relationships`/`ping_transitions` (DDL only, never migrated), `repository_*` (live tables, 0 rows), `knowledge_nodes`/`knowledge_edges` (live, 197 nodes / 0 edges). The seam should read `knowledge_*` + `ping_events`; resurrecting `ping_objects` needs an explicit migration decision, not a quiet fork.
4. **IdentityAuthority copies** in `runtime/constitutional/src`, `runtime/kernel/identity`, `ping-runtime/authorities`, `gateway/constitutional-dist` — `/identities` pins the compiled dist as canonical; do not fork.
5. **`FYD_SITE_OVERLAY` is catalog-registered but has 0 live rows**; `dump.py` defaults to the main journal. Any FYD read path built on it must handle the empty-live case or switch the journal default explicitly.

---

## 8. Operator decisions (genuine, need Nolan or architect call)

1. **Canonical object/relationship store for FYD reads:** `knowledge_nodes`/`knowledge_edges` (populated, live) vs migrating `ping_objects`/`ping_relationships` DDL into the live DB. Recommendation: read `knowledge_*` + events; do not create a fourth store.
2. **The one seam:** new `GET /tenant/:id/graph` HTTP route vs extending `dump.py`'s direct-container-DB pattern. Recommendation: the HTTP seam — the direct-DB pattern bypasses every governance boundary in §6.
3. **Media:** confirm URL-reference + metadata registry (`hpp_project_artifacts` shape) vs adding binary storage. Recommendation: registry only; bytes stay out of Postgres.
4. **Namespace read gap:** close it inside the new seam (minimal blast radius) vs fixing `EventReadAuthority` globally (correct, larger). Recommendation: seam-local filter now; global fix as a separate change.
