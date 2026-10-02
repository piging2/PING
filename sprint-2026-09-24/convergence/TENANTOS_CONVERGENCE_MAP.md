# TenantOS Convergence Map — Lane 3 (TenantOS Archaeology)

Date: 2026-09-25 ~20:10 MDT. Lane 3, reader/falsifier. READ-ONLY. No code changed, no tests executed.
Method: Pig-side `pigwsl-run.sh` light read-only commands (all succeeded; no genuine-failure retries needed), local workspace docs read in full, branch-tip inspection via `git show`/`git grep` (no checkouts, no worktree touches).

Note on current tree state: `/home/nolan/ping` checked out at `feature/orca-reaper-hold @ 73d06b03c`;
`/home/nolan/projects/ping` checked out at `fyd/sprint-integration-2026-09-24 @ c93a7ced`
(the FYD lanes). All branch-tip claims below were verified against the tips themselves.

## Executive summary

There is no authenticated principal anywhere in the tenant path. Every tenant
mechanism found is self-asserted-identity + filter/scoping enforcement. The
tenant-resolution primitive the gateway tenancy audit recommended
(`resolveTenantContext(req)`) does not exist. Three parallel tenant-kit
implementations exist in three languages/repos with no live wiring between them,
and the one registry that claims to be the "central authority" is a write
surface with zero authorization consumers.

---

## 1. Per-path table (classification)

| # | Path | Classification | Evidence |
|---|---|---|---|
| P1 | Credential -> principal | **LATENT** (auth_token_hash schema exists, zero consumers; no auth middleware anywhere) | `database/canonical_events.sql:54-80` defines `auth_token_hash`; `git grep -rn auth_token_hash` returns zero non-test hits. `git grep -l "req.user\|req.principal\|resolveTenantContext"` in /home/nolan/ping returns zero hits. gateway-tenancy-audit-2026-09-25.md "NO authenticated principal anywhere in the route path." |
| P2 | Principal -> TenantContext | **DEAD** (no such hop exists; routes read `req.query.tenant`/`req.body.tenant_id` directly) | `gateway/routes/missions.js:17-18`, `gateway/routes/events.js:39-48` (`?tenant=`), `gateway/routes/canonical_events.js:21-33` (body tenant_id). No `tenantContext` string in `gateway/routes/*.js` (verified via git grep). |
| P3 | /tenants registry writes (register/update/delete/heartbeat) | **LIVE DEFECT** (unauthenticated; anyone can register/delete tenants) | `gateway/routes/tenants.js:19-72` route handlers; no auth middleware required; instantiated in `gateway/bootstrap/gateway_runtime.js:404`, mounted at `:704`, with 503 fallback at `:715`. Audit §"tenants.js (registry): NO auth gating observed." |
| P4 | Registry -> authorization (principal-to-tenant-set mapping) | **DEAD** (never consumed for authz) | Only consumer is `gateway/routes/constitution.js:45-60,150-160` (contract-hash health reporting). Zero route passes tenantRegistry into an authorization decision. |
| P5 | /stats mission route | **LIVE DEFECT** (validates `?tenant=` presence, returns UNSCOPED stats) | `gateway/routes/missions.js:17-23`: checks `req.query.tenant`, then calls `missionRuntime.getStats()` with no tenant arg. Any caller asserting any tenant sees all tenants' mission counts. (Known per WAVE-LEDGER.md: "Orca scheduler GETs (/stats, /pending, /active in missions.js) intentionally left ungated".) |
| P6 | Namespace binding at ingress (POST /ingest) | **SAFE** in harness (hostile 15/15) but **LATENT** for binding source | `ping-runtime/canonicalization/namespace_binding.js:26` + delegation `canonicalization_service.js:109`. Bindings are STATIC, hardcoded in `gateway/bootstrap/gateway_runtime.js:448-458` (`tenant::hpp` for 7 sources). Zero non-test `bindSource` callers; tenant registry never feeds the binding table. tenantos-main-merge-proposal.md §3: "15/15 PASS ... zero regressions." |
| P7 | canonical_events read/write scoping | **SAFE** in harness (enforcement at storage authority, fail-closed) | `gateway/canonical_event_envelope.js:46-54` `_requireTenantId` + SQL `WHERE tenant_id = $1`. Harness suites: `gateway/test_tenant_spoof_ingress.js` 15/15 (merge proposal §3); `gateway/test_tenant_postgres_isolation.js` (WB suite in ~/workspace) asserts both directions. |
| P8 | events.js (Lane L) read path | **LATENT** (fetches ALL events, filters in memory; SQL fallback inconsistent) | `gateway/routes/events.js:57-58`: `eventReadAuthority.getAllEvents(limit, offset)` with NO tenant arg; in-memory filter `tenantIdOfRow(e) === tenant` (:59). SQL fallback (:62-70) uses `WHERE tenant_id = $3` only, so rows stamped namespace-only (no tenant_id column) are missed by the fallback but caught in memory — two different read semantics. |
| P9 | ping_missions tenant scoping | **LATENT** (no tenant_id column; tenant in payload only; interim in-memory filter) | `ping-runtime/orchestration/mission_runtime.js:50-70` CREATE TABLE has no tenant_id column. Wave unit 088's interim `filterMissionsByTenant` (`src/tenanos/tenant/tenant-scope.ts:50-...`) is in-memory and has no live callers (see P11). WAVE-LEDGER.md residual: "per-tenant DLQ views need column + backfill migration." |
| P10 | Event bridge namespace laundering (bridge -> UER.emit default core::system) | **LATENT** in TS kit form only; fix module exists, wiring unproven | `src/tenanos/tenant/bridge-tenant.ts:1-28` documents the proven 2026-09-23 laundering (EventBridge reads tenant_id, emits without options.namespace). Fix exists as library; no live caller. Gateway_runtime's EventBridge (`gateway_runtime.js:463-470`) still polls `repository_events + canonical_events`. |
| P11 | TS tenant kit (tenant-context, namespace-binding, tenant-scope, bridge-tenant) | **DEAD** w.r.t. live runtime (library only; tests green, zero live callers) | On `tenanos-wave/integration @ 51d4a187` in /home/nolan/projects/ping: `git grep -l "tenanos/tenant"` returns only a DOC COMMENT in `src/tenanos/claim/claim.ts:11`. Test `src/tenanos/__tests__/tenant-kit.test.ts` 14/14 (harness). Repo is checked out to an FYD branch, not the wave branch. |
| P12 | W5 capability grant (tenant_capability_grant.js) | **DEAD** (validator with one test; zero live imports) | `ping-runtime/runtime/tenant_capability_grant.js`; `git grep -rn "require.*tenant_capability_grant"` returns only `test_tenant_capability_grant.js:15`. feedback_contract.js mentions it only in a comment (:51). Break-glass (Nolan 2026-09-25, ≤15 min, onAudit) is spec text, never invoked. |
| P13 | Python retrieval_service tenant filter | **LATENT** (payload-filter isolation present; only internal self-caller; JS live path separate) | `runtime/retrieval/retrieval_service.py:24-32` `_require_tenant_id`, `:89-90` payload `tenant_id` filter. Only non-test caller of `semantic_search` is `retrieve()` (:270), which has no live callers found. JS live path uses QdrantAdapter (`ping-runtime/search/qdrant_adapter.js:67,94`, payload.namespace fail-closed). No per-tenant parameterization: single global Qdrant config (merge proposal §5 gaps 1-2, OPEN). |
| P14 | FYD journal gateway bindings | **SAFE** (fail-closed, anti-spoof, zero-disclosure request_id binding) | `/home/nolan/projects/ping/tools/fyd-journal-gateway/server.mjs:252-296` (aggregate_id == `fyd-site:<tenant_id>`; request_id_tenant_conflict zero disclosure). Uses a DIFFERENT tenant convention (`fyd-site:`) than the `tenant::<slug>` canonical mapping. |
| P15 | repository_events polling | **DEAD**-adjacent (spec says zero live writers/rows; gateway still polls) | MC IMPLEMENTATION-PROMPT.md §"repository_events is forbidden. It is legacy storage with zero live writers and zero rows." `gateway_runtime.js:464` comment: "polls repository_events + canonical_events". `git grep -ln repository_events` returns writers `gateway/append_orchestrator.js`, `gateway/event_repository.js` — live-writer status UNVERIFIED here (marked UNKNOWN below). |
| P16 | Marketing Mission Control | **DEAD** (spec only) | `~/workspace/tenant-os/marketing-mission-control/SPEC.md:3`: "Status: BANKED 2026-09-25. Spec only. No code, no lanes, no commits." |
| P17 | TS vs JS namespace binders | **SUPERSEDED**-adjacent duplicate (two languages, same policy; neither is the registry-fed authority) | TS: `src/tenanos/tenant/namespace-binding.ts` (wave branch); JS: `ping-runtime/canonicalization/namespace_binding.js` (live tree). Both default `core::owner`. Merge proposal §6: "complementary across repos/layers, not duplicates... the wave's wrong-repo architectural finding still awaits your adjudication." |

## 2. The eight answers

### WHAT EXISTS
- TenantRegistry authority class (`ping-runtime/runtime/tenant_registry.js`), Postgres-backed, mounted at `/tenants` (register/list/get/update/delete/heartbeat) via `gateway_runtime.js:404,704-715`. Schema (`database/canonical_events.sql:54`) anticipates auth (`auth_token_hash`), capabilities, domains.
- Two namespace-binder policy modules: JS live (`ping-runtime/canonicalization/namespace_binding.js`, delegated from `canonicalization_service.js:109`) and TS library (`src/tenanos/tenant/namespace-binding.ts`, wave branch only).
- TS tenant kit: tenant-context.ts (canonical `tenant::<slug>` mapping, TenantBoundaryError fail-closed), tenant-scope.ts (SQL predicates + interim mission filter), bridge-tenant.ts (namespace-laundering fix). Tests: `src/tenanos/__tests__/tenant-kit.test.ts` 14/14.
- Per-route self-asserted tenant gates: canonical_events.js (shape-validated), events.js Lane L (`?tenant=`), missions.js (`?tenant=`/body), journal gateway (body + aggregate + request_id bindings).
- Storage-authority enforcement: `CanonicalEventEnvelope._requireTenantId` (`gateway/canonical_event_envelope.js:46`).
- W5 tenant_capability_grant validator with break-glass policy text (Nolan 2026-09-25).
- Python retrieval tenant filter (payload-filter isolation).
- Hostile suites: `gateway/test_tenant_spoof_ingress.js` (15/15), `gateway/test_tenant_postgres_isolation.js`, `ping-runtime/search/test_tenant_vector_isolation.js`, plus WB copies in `~/workspace/wb-test_tenant_{postgres,vector}_isolation.js`.

### WHAT RUNS
- Nothing is currently running: no `gateway_runtime` process found on the Pig (pgrep clean). The tenant code paths are live-code-on-disk, not live processes. When the gateway ran, the live path was gateway_runtime -> routes -> authorities; the wave TS kit never made it onto a live branch.
- Enforcement that is proven is HARNESS-proven only (merge proposal §3, §10: "zero live tenants; enforcement is harness-proven only").

### WHAT IS TYPES-ONLY
- `auth_token_hash` column: schema only, zero consumers.
- TenantRegistry.capabilities: stored, never read for authorization.
- W5 grant schema + break-glass policy: validator never imported by live code.
- TS TenantContext interface + tenant-scope SQL predicates: never called from a live query builder.
- bridge-tenant.ts namespaceForTenantId/buildEmitOptions: never called by EventBridge.

### WHAT IS MOCK
- `test_tenant_spoof_ingress.js` spoof principals are synthetic harness tenants (wb-a/wb-b etc.); there are no real principals to mock against. The "authenticated execution context" referenced in the canonical envelope comments (`gateway/canonical_event_envelope.js` docstring area) is aspirational — no such object exists in code.
- bridge-tenant.ts's `tenant_unknown=true` metadata tag for null tenant_id: an observability mock of fail-closed behavior (deliberate per its docstring: "A fail-closed refusal here would wedge the background worker").

### WHAT IS DUPLICATED
- Tenant-ID shape validators (FIVE spellings, three regexes):
  1. `gateway/canonical_event_envelope.js:29` `/^[a-z0-9-]{1,64}$/`
  2. `ping-runtime/orchestration/mission_runtime.js:23` `/^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/`
  3. `ping-runtime/runtime/tenant_capability_grant.js` `/^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/`
  4. `src/tenanos/tenant/tenant-context.ts` `/^[a-z0-9-]{1,64}$/` (TENANT_SLUG_PATTERN)
  5. Inline copies in `gateway/routes/canonical_events.js:28,52` and `gateway/routes/events.js` `isValidTenantId`
- Namespace regex duplicated: `ping-runtime/evidence/evidence_authority.js:19`, `ping-runtime/canonicalization/namespace_binding.js`, `src/tenanos/tenant/tenant-context.ts`, inline in `gateway/routes/events.js:59`.
- Tenant identity spellings: `tenant::<slug>` (canonical per tenant-context.ts), `tenant://{id}` (tenant_registry.js docstring), bare slug (canonical_events), `fyd-site:<id>` (journal gateway aggregate).
- Namespace-binder policy: JS + TS implementations of the same "requested wins iff bound" rule.
- Mission-runtime tenant handling: `mission_runtime.js requireMissionTenantId` vs 088's TS interim filter vs route-level checks in missions.js.

### WHAT IS DEAD
- TS tenant kit live wiring (P11); W5 grant (P12); bridge-tenant fix wiring (P10); registry-as-authority (P4); Marketing Mission Control (P16).
- `wiring.js` bootstrap (`gateway/bootstrap/wiring.js`) constructs TenantRegistry at :169 but is never called by `gateway_runtime` (per AGENT 09, WAVE-LEDGER.md) — a parallel dormant composition root containing its own tenant registry instantiation.
- Dormant direct `QdrantClient` constructions outside ProjectionAuthority: JS `QdrantAdapter` (thin REST, same single global key), `brainos/`, `tools/`, dev scripts, three gateway modules reachable only via dormant wiring.js (merge proposal §5).

### WHAT HAS TESTS
- Ingress spoof: `gateway/test_tenant_spoof_ingress.js` 15/15 PASS (merge proposal §3, on `fyd/tenantos-integration-2026-09-24 @ e0d2868e2`).
- Postgres isolation: `gateway/test_tenant_postgres_isolation.js` (live-Postgres WB suite; needs DB).
- Vector isolation: `ping-runtime/search/test_tenant_vector_isolation.js` (live-Qdrant WB suite).
- Ingest boundary: `gateway/test_ingest_boundary.js` 22/27 (5 pre-existing env failures, no DB).
- TS tenant kit: `src/tenanos/__tests__/tenant-kit.test.ts` 14/14.
- W5 grant: `ping-runtime/runtime/test_tenant_capability_grant.js`.
- Mission/orchestration/worker tenant tests: `ping-runtime/events/test_runtime_tenant.js`, `ping-runtime/orchestration/test_mission_tenant.js`, `ping-runtime/workers/test_worker_tenant.js`.
- Pre-existing failure OB-8 `test_replay_observability.js` (fails on pristine tip; unrelated to tenant gating — WAVE-LEDGER.md).

### WHAT HAS LIVE CALLERS
- `CanonicalEventEnvelope._requireTenantId`: live (canonical event read/write path).
- JS `namespace_binding.js` via `canonicalization_service.authorizeNamespace`: live (bindings hardcoded at `gateway_runtime.js:448-458`).
- Route tenant gates (canonical_events/events/missions/journal): live when the gateway runs.
- Python `_require_tenant_id`: NO live callers (`retrieve()` uncalled).
- Everything else in P11/P12/P4/P10/P16: NO live callers.

## Canonical authority for tenant identity, and the competitors

**Nominal canonical authority:** `TenantRegistry` (`ping-runtime/runtime/tenant_registry.js`) — its docstring claims "Central authority for all TenantOS tenants. Every tenant registers here. PING consumes this registry." It is instantiated by the live composition root (`gateway_runtime.js:404`) and mounted at `/tenants`.

**Reality:** it is a registration surface, not an authority. It issues no credentials, holds an unused `auth_token_hash` column, and no route or authority consults it for authorization. Tenant identity is decided per-route by caller-asserted strings.

**Competing implementations (all de-facto, none canonical):**
1. Self-asserted `tenant_id` at route handlers (canonical_events/events/missions) — the live mechanism.
2. Source-bound namespace table in `gateway_runtime.js:448-458` feeding the JS binder — the live ingress identity.
3. TS `tenantIdToNamespace` canonical mapping — library, unwired.
4. Journal-gateway `fyd-site:<tenant_id>` + request_id binding — a separate live mechanism with its own convention.
5. `MISSION_TENANT_ID_PATTERN` vs `TENANT_ID_PATTERN` — competing validators (case rules differ: missions allow uppercase, canonical events do not).

## 3. Hostile-test plan (PLAN ONLY — not executed)

Explicit targets, ordered by exploitability:

1. **Spoof read**: `GET /canonical_events?tenant_id=<victim>` and `GET /events?tenant=<victim>` with no credentials — expect rows. Target: the absent-principal latent (P1/P2). Pass = rows returned (proves self-asserted identity).
2. **Cross-tenant mission read**: `GET /missions/pending?tenant=A` then `?tenant=B`; compare. Target: payload-only tenancy (P9). Also `GET /missions/stats?tenant=<anything>` — expect global counts (P5, already defect-confirmed by code read).
3. **Registry write without auth**: `POST /tenants {tenantId, name}` then `DELETE /tenants/:id` — expect 2xx. Target: P3. Then attempt namespace-collision registration (`tenant::<x>` vs bare slug vs `tenant://x`) to test the spelling-collapse gap.
4. **Search cross-tenant**: call Python `retrieval_service.retrieve(query, tenant_id='a')` after seeding points for tenant 'b' — expect filter to hold or leak. Target: P13 payload filter.
5. **Mission propagation**: emit canonical event as tenant A through the bridge; inspect downstream `ping_missions.payload._tenant_id` and the mission worker's namespace. Target: P10 laundering (does bridge-tenant's fix exist on the live path or only in TS?).
6. **Retry/fencing across tenants**: two schedulers, tenant A mission claimed by tenant B's scheduler context — expect assign rowCount guard behavior. Target: AGENT 09 R-13 (no tenant predicate on claim SQL).
7. **Credential isolation**: set `auth_token_hash` manually for a registry tenant; attempt any route with that token in Authorization header — expect it to be ignored (proves P1 types-only).
8. **Events**: emit as tenant A with `namespace: tenant::b` override in payload — expect ingress binder decision. Target: P6 "requested wins iff bound" with static bindings.
9. **Projection**: write vector point with `payload.namespace=tenant::a` via QdrantAdapter, search as `tenant::b` with malicious widen-filter — expect namespace constraint to hold. Target: `qdrant_adapter.js:94` fail-closed search.
10. **Cache**: if any query cache exists between eventReadAuthority and routes, poison tenant A's read then read as B — target UNKNOWN, needs discovery first.
11. **Artifact guessing**: request `/constitution/doc/<id>` (mission_control app.py:1246) for a doc_id belonging to another tenant — expect no tenant check on that path (observed: none in the handler).
12. **Admin capability**: `PUT /tenants/:id {capabilities: [...]}` then attempt a capability-gated operation — expect no enforcement (P4 dead; W5 grant unwired).

## 4. Open questions and candidate gaps (evidence attached)

1. **Branch divergence**: `tenanos-wave-gateway/integration @ 63ad28388` is NOT an ancestor of current HEAD `feature/orca-reaper-hold @ 73d06b03c` (verified `git merge-base --is-ancestor` = NOT-ANCESTOR). Tenant fixes landed on both lines independently (W7-qdrant-py harvest on HEAD; 088 on gw-integration). Convergence ownership of these two lines is undecided. (Evidence: pigwsl `git merge-base --is-ancestor 63ad28388 HEAD`.)
2. **Is `eventReadAuthority.getAllEvents` used elsewhere unfiltered?** `gateway/routes/events.js:58` fetches all events then filters in memory. If any other caller of getAllEvents exists without the in-memory filter, it is a cross-tenant read primitive. (Candidate gap; needs one `git grep getAllEvents` on the Pig.)
3. **repository_events live writers**: MC spec claims zero writers/rows; `git grep -ln repository_events` lists `gateway/append_orchestrator.js`, `gateway/event_repository.js`, `repository_event_layer.py` as writers. Live-writer status UNVERIFIED in this pass (did not trace call sites). If any is live, the spec's "forbidden" claim is false.
4. **`getStats` on canonical events**: `canonical_events.js:74` calls `executeGetStats(tenant_id)` — tenant-scoped, fine — but the missions `/stats` route is not (P5). Inconsistent convention between the two stats routes.
5. **Uppercase tenant slugs**: `mission_runtime.js` accepts `A-Za-z` while `canonical_event_envelope.js` accepts only lowercase. A tenant registered as `Acme` in missions is a different identity than `acme` in events; the TS canonical mapping lowercases-only. Cross-system identity collision candidate.
6. **`fyd-site:<id>` vs `tenant::<slug>`**: the journal gateway's aggregate convention and the canonical namespace convention are two live spellings with no mapping module. The TS kit claims ONE canonical mapping; the journal gateway is not part of it.
7. **Bridge wiring**: does the live EventBridge call anything like bridge-tenant's `buildEmitOptions`? Observed `gateway_runtime.js:463-470` constructs EventBridge with pool+runtime only. The laundering fix is TS-only. Whether the JS EventBridge was separately fixed is UNKNOWN (did not read event_bridge.js fully in this pass).
8. **Zero live tenants**: per merge proposal §9.4 and §10, all enforcement is harness-proven; no Postgres-backed live tenant run exists. The first live tenant is the proof that flips INCOMPLETE to COMPLETE.
9. **Cache layer**: no cache on the tenant path was observed, but no negative proof was run. The hostile cache test (plan item 10) needs a discovery step first.
10. **104/105 parked**: Kit webhook HMAC + resource-download auth (written, `tenanos-wave/P-20260923-104-105-security @ 9ca7d043/1df0f98c`) await Nolan's merge decision; they touch tenant-adjacent ingress (webhook = unauthenticated ingress per swarm-15 D1). (Evidence: WAVE-LEDGER.md "Untouched (reserved for Nolan)".)

---

## Lane-3 verdict

**TENANTOS: filter-enforced, identity-unproven.** Every tenant boundary found is a
self-asserted string + scoping filter. There is no credential, no principal, no
single resolution primitive, and three parallel implementations (JS live binder,
TS library kit, journal-gateway bindings) with no shared authority. The registry
that claims centrality is a write API with no auth and no consumers. This is
exactly the gateway tenancy audit's conclusion, now cross-verified against the
wave branch tips, the live tree, and the vector/Python planes: the latent defect
(no authenticated principal) is real, and it becomes a live cross-tenant read
primitive the moment a second real tenant exists. Nothing in this pass
contradicts the merge proposal's TENANTOS INCOMPLETE verdict; the per-path table
above is the evidence ledger for it.

Constraints honored: no worktree/cop*/fyd* touched; no builds, no test runs, no
commits/pushes; Pig CPU untouched beyond light greps; FYD lanes undisturbed.
