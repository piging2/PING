# Q28 — PLACEMENT TRACE: (tenant, capability) → execution target
Date: 2026-10-01 ~18:24-18:40 MDT. Worker: TENANT SWARM (read-only forensics).
Plane: Pig code inspection, READ-ONLY. No execution, no writes, no served systems touched.

- PROPOSITION: A real decision mechanism exists for (tenant, capability) → execution target. Nolan's first-pass claim: UNWIRED (none exists). This probe attacks that claim.
- EXACT SHA: /home/nolan/ping @ 23e15f622572bc8fdca46ff42b61d6817f6423df (branch testing/ladder-2026-09-30). Note: layer = REPO. The served ping-gateway container predates the W-series and lane B (per prior archaeology); this trace covers current repo code.
- EXACT PLANE: Pig WSL file reads via pigwsl-exec. Zero process launches, zero DB/journal contact.

## The actual execution-target decision chain (what runs instead of placement)

1. **MissionScheduler._dispatch** (`ping-runtime/orchestration/mission_scheduler.js:267-268`):
   `const workerName = MISSION_WORKER_MAP[mission.mission_type];`
   Static label map (mission_type → worker name), e.g. DOCUMENT_IMPORT → 'observation'.
   The file's own contract comment (lines 44-54) says this map is "LABELING / ASSIGNMENT metadata ONLY. It is NOT an execution-routing decider." tenant is only *threaded* (`tenant_id: mission.tenant_id || null`, lines 323/328), never consulted.
2. **WorkerRuntime.dispatch** (`ping-runtime/workers/worker_runtime.js:93`): the single canonical execution decider. A worker is selected iff `entry.eventTypes.length > 0 && entry.eventTypes.includes(eventType)`. Dispatches on the ORIGINAL business event_type, never mission_type. Tenant-blind; capability-blind.
3. **CapabilityRegistry** (`ping-runtime/connectors/capability_registry.js`): capability → provider → entry register/lookup only. Verified by grep: ZERO occurrences of select/choose/eligible/pick/prefer/tenant in the file. It is a registry, not a decider.
4. **capability_resolver.js** (`ping-runtime/runtime/capability_resolver.js:62-92`): `resolve(capabilityName)` verifies a provider exists; no selection, no tenant.
5. **ExecutionAuthority** (`runtime/authorities/execution_authority.py:59-68`): `self.adapter = adapter or SubprocessExecutionAdapter()` — one adapter injected at construction. No selection mechanism.

## Negative searches (hostile)

- `grep -rniw placement|placeMission|eligibleTarget|selectAdapter|chooseAdapter|resolveAdapter|pickAdapter|executionTarget` over the five scheduler/dispatch/capability files → NO MATCH.
- `grep -rniw placement|placeMission` over the whole /home/nolan/ping tree (js/py/ts, excluding caches/manifests/tests) → only hits are `presentping/config/illustration-library.js` (slide layout) and `placement_mapper.py` (student placements). Neither is execution placement.
- `grep -w tenant` across capability_registry.js, capability_resolver.js, execution/engine.js, execution/worker_port.js, execution_authority.py → NO MATCH.
- Served MC `/api/mc/missions` projects `tenant: "tenant::ping"` but `capability: null`, and there is no placement field in the record schema or projection. There is nothing to record because no decision occurs.
- The only placement-shaped text in the estate is a *proposal*: `~/workspace/tenantos/archaeology-and-plan-2026-10-01.md` §P2 ("placementFor(tenant, capability) -> eligible execution target + reason"), explicitly marked "Placement machinery: ABSENT" and NEEDS NOLAN.

## OBSERVED RESULT
No (tenant, capability) → execution target decision mechanism exists anywhere in the current code. The closest real mechanisms are (a) static mission_type → worker label, (b) eventType registration match, (c) capability → provider lookup, (d) single injected execution adapter — none consult tenant or capability-for-routing, and none records a placement decision.

## PASS-FAIL-UNKNOWN
**UNWIRED** — Nolan's first-pass claim survives this attack. The assumption was NOT killed.

## SMALLEST FIX IF FAIL
N/A (not failed). If/when placement is built: one pure deterministic `placementFor(tenant, capability) -> { target, reason }` function consulted by the existing scheduler before dispatch, with the decision stamped on the mission row as evidence — per the standing P2 plan (no new scheduler/queue/worker framework; do NOT become PlacementAuthority beyond the function).
