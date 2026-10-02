# LANE B — TenantOS Archaeology + Ownership/Context Wiring

**Lane:** B (TenantOS existing-code archaeology + smallest missing ownership/context wiring)
**Date:** 2026-09-26 ~07:30 MDT
**Branch:** `lane-b/tenant-dispatch-threading` @ `1822d5fae` (Pig: /home/nolan/ping; NEVER pushed)
**Status:** archaeology complete, minimum-delta patch committed, tests green

## 1. Archaeology map (seam → classification → evidence)

All reads below are against the Pig repo `/home/nolan/ping` (the gateway source of
truth) and the live container `ping-gateway` (image `ping-gateway:repair-cert-20260924`).
Critical finding: **the live container predates the repo** — it runs pre-W-series code
(no tenant binding at all). The Sep-25 W-series exists only in the repo.

| # | Seam | Classification | Evidence |
|---|------|----------------|----------|
| 1 | Tenant existence/status check | **USE NOW** | `ping-runtime/runtime/tenant_registry.js#executeResolveTenant` + `tenant_registry` table; `GET /tenants/:id` resolves. Live DB (2026-09-14 trace): exactly 1 row, `audit63` (audit/falsification artifact, not a business tenant). |
| 2 | Fail-closed agent identity | **USE NOW** | `gateway/exterior_auth_middleware.js`: Bearer → `exterior_agent_credentials` → `req.authenticatedAgent` (`muse` L1 Observe, `muse-level-2` L2 Workspace Write); unknown agents 401. **Was attached but never consumed by any route** — the wiring gap. |
| 3 | `ping_missions.tenant_id` (immutable, idempotency-keyed) | **USE NOW** (repo W3, commit 6666cb9a7) | `mission_runtime.js#requireMissionTenantId` fail-closed; idempotency key `hash(tenant:missionType:event_id)`; `POST /missions` requires body `tenant_id`; reads gated by `?tenant=`. NOT in the live container. |
| 4 | `ping_events.tenant_id` (validated at emit) | **USE NOW** (repo W6, commit 90f45877f) | `unified_event_runtime.js`: fail-closed validation, derived from namespace when not explicit, indexed. NOT in the live container. |
| 5 | Worker emission tenant pin | **USE NOW** (repo W4, commit d63dff767) | `BaseWorker._emit` inherits tenant_id from the pinned triggering event; contradicting explicit tenant throws. `test_worker_tenant.js` 7/7. NOT in the live container. |
| 6 | Capability grant decisions | **USE NOW** (unchanged) | `capability_requests` rows show real DENIED/GRANTED (workspace-boundary/secrets-pattern denials proven 2026-09-11/12); W5 adds tenant-scoped grant check (repo). No patch needed. |
| 7 | Workspace isolation | **USE NOW** (unchanged) | `agent_workspaces`: muse/muse-level-2 scoped to `/app/workspace/muse`. No patch needed. |
| 8 | Scheduler dispatch event tenant | **GAP → PATCHED** | Repo `mission_scheduler.js#_dispatch` built the worker event with `namespace` from caller-controlled `payload.namespace` and **no tenant_id** — the mission row's immutable tenant never reached the execution. W4's pin then degraded to namespace-derivation. **This was the slice blocker.** |
| 9 | `POST /missions` ownership trust | **GAP → PATCHED** | Route took `createdBy` and `payload.namespace` verbatim from the body: any authenticated caller could mint a mission into `tenant::<victim>`'s namespace and claim any identity. **Patched**: namespace derived from validated tenant_id (mismatch → 400), `created_by` stamped from `req.authenticatedAgent`. |
| 10 | Broker task/evidence tenant | **SAVE FOR LATER (lane C/D)** | `~/workspace/pig-fb/copilot-broker/src/broker.js#dispatch(task)`: `task.identity_id` choke point exists (identities 1–4 fail-closed), but no tenant field flows into task or evidence. Lane C's adapter should pass the scheduler event's `tenant_id` through. Not edited (lane C surface). |
| 11 | MC Python projector tenant filter | **SAVE FOR LATER (lane D)** | `~/workspace/mission-control/project.py`: MC_* events have no tenant field; projection cannot filter by tenant. Lane D surface. (Gateway `/mc` dashboard could filter `ping_events.tenant_id` today.) |
| 12 | Second event store / identity registry / capability system | **REJECT** | Would be a competing authority. `canonical_events` bridge stays unbuilt (forbidden infra expansion; production flow writes `ping_events` directly). |
| 13 | Agent→tenant binding table | **REJECT** | Inventing RBAC tables is a new authority. The W-series' format-validated immutable tenant + idempotency keying is the existing mechanism; sufficient for the slice. |

## 2. The gap (precise failing assertion, pre-patch)

`POST /missions { tenant_id: 'a', payload: { namespace: 'tenant::b' } }`
→ mission row says tenant `'a'`, but `MissionScheduler._dispatch` built the worker
event from `payload.namespace`, so every downstream worker emission derived tenant
`'b'` (W6 namespace fallback). **The mission's immutable tenant and the execution's
effective tenant diverged silently** — the exact "ambiguous execution re-scoped as
fresh" hazard. The Orca/headless adapter (lane C) would have received an event with
no authoritative tenant at all.

## 3. Patch (minimum delta, +24/−1 across 2 files, branch `lane-b/tenant-dispatch-threading`)

Commit `1822d5fae` (3 files, no push):

1. **`ping-runtime/orchestration/mission_scheduler.js`** (+6): `_dispatch` threads
   `mission.tenant_id` into the worker dispatch event top-level and in `metadata`.
   No dispatch-semantics change (Lane A's outcome/receipt logic untouched).
2. **`gateway/routes/missions.js`** (+19/−1): `POST /` derives `payload.namespace =
   'tenant::<tenant_id>'` from the validated body tenant; a contradicting
   caller-supplied namespace → `400 tenant_namespace_mismatch` (fail closed);
   `created_by` stamped from `req.authenticatedAgent.agentId` (route is behind the
   exterior auth middleware), never a body claim.
3. **`ping-runtime/orchestration/test_lane_b_tenant_threading.js`** (new): 5 tests.

## 4. Test evidence

- New suite: `node --test ping-runtime/orchestration/test_lane_b_tenant_threading.js`
  → **5/5 PASS** (scheduler threads authoritative tenant_id despite spoofed
  namespace; legacy null-tenant passthrough; route rejects namespace mismatch
  with zero mission creation; route derives `tenant::acme-1` + stamps
  `muse-level-2` as created_by; tenant_required preserved).
- Regressions: `test_mission_tenant.js` (W3) PASS, `test_worker_tenant.js` (W4) PASS.
- End-to-end through existing seams (no new code): scheduler event `tenant_id`
  → `WorkerRuntime.dispatch` pins `worker._event` → W4 `_emit` inherits tenant
  → W6 `unifiedEventRuntime.emit` validates/stores `ping_events.tenant_id`
  → projection can filter by tenant. Each link is existing, tested code.

## 5. What remains unverified / needs coordinator decisions

1. **DEPLOYMENT GAP (blocks the live slice):** the running `ping-gateway`
   container (`repair-cert-20260924`) predates the entire W-series AND this patch.
   The vertical slice cannot execute against the live gateway until a new image is
   built from the repo and deployed. Per standing rule, rebuilding the gateway
   image needs **Nolan's authorization** — flagging for the coordinator, not doing it.
2. **Tenant selection:** `tenant_registry` still has exactly 1 row (`audit63`, an
   audit artifact). Mission Control needs a real tenant row to dispatch against;
   registering one is an operator/Nolan decision.
3. **Lane C handoff:** the Orca/headless adapter (as a WorkerRuntime worker) now
   receives `event.tenant_id` + `event.metadata.tenant_id` authoritatively; it should
   pass tenant through `broker.dispatch(task)` into evidence. Broker file untouched
   (lane C surface).
4. **Lane D handoff:** `POST /missions` now requires the caller to name `tenant_id`
   and fails closed on namespace contradiction; the MC dispatch UI should surface
   the tenant picker and pass through `req` auth (already behind the middleware).
5. **Coordination note:** Lane A committed `c59960b81` on
   `fix/workerruntime-failclosed-20260926` mid-task; my branch
   `lane-b/tenant-dispatch-threading` forks from that HEAD. Hunks are adjacent
   (theirs: outcome/receipt handling; mine: event construction), no overlap.
   Untracked files from other lanes (`deliverables/`, `evidence/`, etc.) were not touched.
