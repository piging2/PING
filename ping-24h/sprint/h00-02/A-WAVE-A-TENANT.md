# WAVE A TENANT-ISOLATION FALSIFIERS: Lane A Report

Lane: A (read-only falsification/observation). T+0 = 2026-09-28 ~19:30 MDT.
Task: T-01 through T-04 RED repros from 05-FIRST-20-READY-TASKS.md.
Report file: ~/workspace/ping-24h/sprint/h00-02/A-WAVE-A-TENANT.md

## Method and scope

READ, OBSERVE, REPRODUCE. No product tree, worktree, or served directory was
written, patched, committed, reset, cleaned, or deleted. No service was
restarted. No test events were emitted to any store. No Jev calls were made.
No new paid AI/API/infra spend.

The canonical tree /home/nolan/projects/ping is NOT visible from this
sandbox (no such directory exists here), and :3100 refuses connections from
this sandbox. All code evidence therefore comes from workspace mirrors,
prior lane reports with their stated tree states, and byte-level file
inspection. No live HTTP repro was executed; where a live request would
apply, the exact request shape is given and the live execution is marked
NOT PERFORMED with the reason. Verdicts below are code-level unless a live
observation is explicitly cited.

Tree states referenced (both observed by prior lanes, both read-only here):
- S1: Pig WSL /home/nolan/projects/ping, branch hardening/2026-09-28-vocab-ssrf,
  HEAD 0264d517, dirty (lanes 9, 10, 13, 16; observed 2026-09-28 14:26+ MDT).
- S2: task BASE SHA f877c391, branch fyd/builder-harvest-trackc-2026-09-28
  (prelaunch registers; CLASSIFICATION.md 2026-09-28 ~18:40 MDT).
The committed-level defects below are identical in both states; the dirty
diffs in S1 show the in-flight fix attempts. A HEAD-state discrepancy between
S1 and S2 is noted in the caveats; it does not change any verdict.

## Authority chain under test

CALLER -> AUTHENTICATED IDENTITY -> TENANT ENTITLEMENT -> TENANT CONTEXT.
Per the task: unknown or malformed tenant must refuse, never map to
core::system.

---

## T-01: event-bridge tenant namespace laundering

VERDICT: VULNERABILITY REPRODUCED (code level; live bridge wiring not
observable from this sandbox).

RED repro steps (code-path repro; smallest read-only probe):
1. Read the bridge emit call sites:
   `grep -n "this._eventRuntime.emit" <event_bridge.js>` on the original
   bridge copy (md5 1fd7b94b38302d9af7c613f203b9d7a1, 349 lines; two
   byte-identical copies at
   ~/workspace/tenanos-wave/swarm-01/orig/event_bridge.js and
   ~/workspace/tenanos-wave/scratch/lane-h/ping-gw/ping-runtime/events/event_bridge.js).
2. Read the namespace resolution in the runtime:
   `grep -n "namespace = options.namespace" <unified_event_runtime.js>`.
3. Trace: bridge passes no `namespace` in emit options; runtime resolves
   `options.namespace || 'core::system'`; the stored row carries
   namespace = core::system regardless of the source row's tenant_id.

Observed behavior with evidence:
- `event_bridge.js:179` (`_bridgeRepositoryEvents`): calls
  `this._eventRuntime.emit(row.event_type, 'repository_events', payload, {
  _skipGovernance: true, causation_id, correlation_id, metadata })`. No
  `namespace` key in options.
- `event_bridge.js:278` (`_bridgeCanonicalEvents`): calls
  `this._eventRuntime.emit(row.event_type, 'canonical_events', payload, {
  _skipGovernance: true, causation_id, correlation_id, metadata })`. No
  `namespace` key in options, even though `row.tenant_id` is selected from
  canonical_events and is available. The tenant_id is stored only as inert
  data: `payload._tenant_id = row.tenant_id` (line 275) and
  `metadata.tenant_id` (line 289).
- `unified_event_runtime.js:145` (copy at
  ~/workspace/convergence-lane3/unified_event_runtime.js, 619 lines):
  `const namespace = options.namespace || 'core::system';`. Every bridged
  event is therefore persisted with namespace `core::system`; the same file
  inserts into `ping_events.namespace` (lines 294-297) and the column
  defaults to 'core::system' (lines 62, 66).
- The fix-tree copy (md5 f979e0176e02cdd6aa32ed02d71a023a, 382 lines, at
  ~/workspace/tenanos-wave/scratch/lane-h/fixed-tree/ping-runtime/events/event_bridge.js)
  documents the defect explicitly at lines 301-305: "Without an explicit
  namespace the spine stamps core::system and the tenant scope is lost to
  every downstream consumer (mission projection, scheduler, workers,
  embeddings)."

HOSTILE TEST (malformed tenant): NOT REFUSED. The original bridge never
consults tenant_id for namespace purposes, so a malformed tenant_id in
canonical_events is silently stored under core::system (as inert
payload/metadata). The unwired fix's `namespaceForTenantId`
(fixed-tree lines 34-42) maps null/empty/malformed tenant to
`{ namespace: 'core::system', tenantUnknown: true }`: fail-open with a tag,
still not a refusal. Against the reference chain (unknown/malformed must
refuse, never map to core::system), both the live path and the unwired fix
violate the refuse requirement. The reached fail-closed model is the FYD
journal gateway (400 tenant_required / tenant_mismatch; see T-02 boundary
map).

FALSIFIER check: the stored event does NOT preserve the tenant namespace;
it is laundered to core::system. The defect hypothesis is CONFIRMED, not
falsified. The live question this lane cannot answer from the sandbox:
whether the bridge process is currently wired and running inside the
gateway container (Pig-side runtime state). The register records the
laundering path as reached on the canonical bridge; lane 13 executed the
live-container UnifiedEventRuntime.emit + EventGovernance modules
hermetically and confirmed the namespace default and governance behavior,
but did not execute the bridge poll loop against Postgres.

What would resolve the residual: a Pig-side read-only check that the
bridge module is loaded in the running gateway (process/module listing, no
restart), plus one bridged-row read from ping_events showing the stored
namespace for a tenant-sourced event.

---

## T-02: MC caller-to-tenant authority gap

VERDICT: VULNERABILITY REPRODUCED (code level, committed). Partial
falsification: the FYD journal gateway boundary already demands tenant
proof and refuses; the MC dispatch POST and MC missions GET routes do not
(at committed level). A caller-entitlement fix exists only as uncommitted
dirty code.

RED repro steps (exact request; live execution NOT PERFORMED, :3100
unreachable from this sandbox):
```
POST http://<host>:3100/api/mc/dispatch
Content-Type: application/json

{"prompt":"<bounded prompt>","agent":"ollama","capability":"<allowed>",
 "tenant":"coppersmith-plumbing"}
```
Expected per the defect: dispatch proceeds under Tenant B's label
(coppersmith-plumbing) with no caller authentication, because the route
takes the tenant label from the body and checks only the static allowlist.
A second request labeling the same command as "happy-place" (Tenant A)
would likewise proceed. The hostile variant (Tenant A command labeled as
Tenant B) is exactly this request.

Observed behavior with evidence (committed code):
- `route.HEAD.ts:226` (~/workspace/ping-24h/repro/route.HEAD.ts; identical
  at lane-p01/tree/src/app/api/mc/dispatch/route.ts:226):
  `const tenant = typeof body.tenant === 'string' ? body.tenant : '';`
- `route.HEAD.ts:234-236`: the ONLY tenant check is
  `if (!(SLICE_TENANTS as readonly string[]).includes(tenant))
   return bad(400, 'bad_tenant', ...)`, where
  `SLICE_TENANTS = ['happy-place', 'coppersmith-plumbing']`
  (mc-dispatch.HEAD.ts:33).
- Zero references to x-mc-caller-key, mc-dispatch-identity, or any caller
  registry in route.HEAD.ts (grep count 0). No authenticated caller exists
  on this path at committed level.
- The authority namespace is derived from the unproven label:
  `const namespace = 'tenant::' + tenant` (lane10 raw
  dispatch-route-290-480.txt, identity-set block), gated only by
  NAMESPACE_RE shape. missionId deterministically includes the body tenant,
  so the whole downstream identity (mission, namespace, artifacts, work
  order) inherits the caller-claimed label.

Boundary-by-boundary map (falsifier: record every boundary that demands
caller entitlement):
1. POST /api/mc/dispatch (committed): NO entitlement. Tenant from body +
   static allowlist. GAP CONFIRMED.
2. POST /api/mc/dispatch (dirty worktree, UNCOMMITTED): entitlement ADDED.
   laneB13 dirty-tree.patch lines 1048-1111: `const tenant =
   caller.tenant;` resolved from `x-mc-caller-key` via
   `loadCallerRegistry()`; missing key -> 401 identity_required; body
   tenant disagreeing with caller tenant -> 403 tenant_mismatch ("the body
   tenant is never trusted"); caller tenant outside entitled_tenants ->
   403 tenant_not_entitled. This is the in-flight surgical fix (Q-P0-06 /
   Mission M), not yet committed.
3. FYD journal gateway (reached): FAIL-CLOSED. Append with tenant_id/siteId
   mismatch -> 400 tenant_mismatch; missing tenant_id -> 400
   tenant_required (never defaulted); read without ?tenant= -> 400
   tenant_required; read with ?tenant= -> only that tenant's events
   (evidence: ~/workspace/wb-f-journal-privacy.test.ts lines 138-180).
   This is the strong pattern the MC path lacks.
4. FYD ask routes (dirty): "body is identity" closed; subject tenant from
   path, body tenant refused on mismatch with 400 tenant_mismatch
   (laneB13 dirty-tree.patch lines 484-638). Uncommitted.
5. authorizeWorkOrder (orca-adapter, Pig-side): checks namespace SHAPE
   (^(core|tenant)::[a-z0-9_.-]+$) but not caller entitlement (lane 16:
   8 ordered fail-closed checks confirmed at
   external_agent_adapter.js:185; none binds caller to tenant).

Against the authority chain: at committed level the MC dispatch path
implements CALLER -> TENANT LABEL with the AUTHENTICATED IDENTITY and
TENANT ENTITLEMENT links ABSENT. The dirty tree restores the chain on the
dispatch POST only.

---

## T-03: Tenant A to Tenant B ContextPack contamination

VERDICT: NOT REPRODUCED on the in-tree MC dispatch path (no caller input
surface for contextPackId; the refusing layer is structural). Contract-level
latent gap CONFIRMED: issueWorkOrder accepts contextPackId with zero tenant
binding; exploitability through any other caller is UNVERIFIABLE from this
sandbox (adapter is Pig-side/out-of-tree).

RED repro steps (as specified): craft a work order for Tenant B
referencing Tenant A's contextPackId; assert the pack is accepted/assembled.
Attempted construction: the MC dispatch POST body has no contextPackId
field. `grep -n "body.context" route.HEAD.ts` and the lane-p01 tree copy:
zero hits. The id is minted server-side:
`route.HEAD.ts:261`: `const contextPackId = 'mc-ctx-' + missionId`.
There is no request field to smuggle Tenant A's pack id through, so the
repro as specified cannot be constructed against this path.

Observed behavior with evidence:
- The minted id is tenant-bound by construction: missionId =
  'mc-m-' + sha256('mission|agent|tenant|capability|promptDigest|
  idempotencyKey') (lane10 raw dispatch-route block), so
  `mc-ctx-<missionId>` cannot name another tenant's mission without the
  caller also controlling that mission's exact tenant label and prompt
  digest, which collapses to the T-02 body-tenant gap, not a pack
  contamination.
- The id is threaded into lifecycle events (`context_pack_id`),
  adapterCall('issue', { ..., contextPackId, ... }) (route.HEAD.ts:295),
  the context.json artifact (route.HEAD.ts:323), and the result envelope
  (route.HEAD.ts:366). verifyResultEnvelope echo-binds
  context_pack_id against the issued in-memory work order
  (multi-runtime-workorder-contract.md section 1).
- Contract level: `issueWorkOrder({ agentId, capability, namespace, taskId,
  missionId, correlationId, contextPackId, ... })` accepts contextPackId
  with no tenant binding documented; authorizeWorkOrder validates namespace
  shape only, never pack-to-tenant binding (contract doc sections 1-2).
  The envelope carries context_pack_id and namespace as independent
  fields. So the "zero tenant binding" claim in the task is CONFIRMED at
  contract level; the missing link is a second caller that passes an
  attacker-chosen pack id. The only in-tree callers found
  (lane-p01/tree route.ts:293, ping-decision-fabric/staging/route.ts:297)
  both pass the server-minted id.
- Assembler level (patch branch decision-fabric/contextpack-wire-2026-09-28
  @ 9a555021, reviewed read-only by lane 13): buildDispatchContextPacket()
  keys the graph read to the server-validated tenant via getFydTenantGraph();
  lane 13 verdict TENANT SCOPING: PASS EXISTING, "A dispatcher cannot key
  the read to another tenant." That patch is not in the committed tree.

FALSIFIER check: the refusing layer on the dispatch path is the route's
params-only mint (structural refusal: no input surface). The contamination
as specified does not reproduce here. The residual risk is contract-shaped
(unbound parameter) rather than path-shaped, and would matter only if a
future caller passes caller-controlled pack ids.

---

## T-04: Tenant A to Tenant B Mission Control projection contamination

VERDICT: VULNERABILITY REPRODUCED (code level, committed). The projection
reads a single mixed-tenant journal with no caller tenant on the GET
routes. A scoping layer exists only as uncommitted dirty code, and it is
self-asserted identity, not entitlement.

RED repro steps (exact requests; live execution NOT PERFORMED, :3100
unreachable from this sandbox):
```
GET http://<host>:3100/api/mc/missions
GET http://<host>:3100/api/mc/missions/<tenant-a-mission-id>
```
Expected per the defect: both return Tenant A missions to a caller in a
Tenant B context (or with no tenant context at all), because neither route
takes or checks a caller tenant.

Observed behavior with evidence (committed code):
- GET /api/mc/missions (lane-p01/tree/src/app/api/mc/missions/route.ts):
  `export async function GET()` takes no request argument; runs
  `projectMissions(loadJournalEvents())` over the whole journal; returns
  ALL missions with per-mission `tenant` field included. No filter, no
  header, no caller concept.
- GET /api/mc/missions/[id]
  (lane-p01/tree/src/app/api/mc/missions/[id]/route.ts): `export async
  function GET(_req: Request, ...)` ignores the request; finds by
  mission_id only; returns the full mission record regardless of tenant.
  Unknown id -> 404 unknown_mission (honest miss, but no tenant check on
  hits).
- The journal is one global mixed-tenant JSONL: mc-dispatch.HEAD.ts header
  ("the existing append-only PING journal JSONL ... MC_DISPATCH_* event
  types ride the journal's stream model"); projectMissions sets
  `m.tenant = (d.tenant as string) ?? null` per event (mc-dispatch.HEAD.ts:310)
  with no read-time scoping in the projection itself.
- The dirty worktree's own comment confirms the storage fact:
  "The missions journal is a single mixed-tenant JSONL BY DESIGN (operator
  surface on loopback); the gate lives at the READ API, not the journal."
  (laneB13 raw/probe4.out lines 44-48, src/app/api/mc/_lib/mc-tenant-gate.ts
  header).

The scoping layer (falsifier: record which layer, if any):
- Dirty, UNCOMMITTED: `mc-tenant-gate.ts` + route edits (laneB13
  dirty-tree.patch lines 1221-1274). Identity model: caller asserts tenant
  via the `x-mc-tenant` header. No header -> operator view (ALL missions;
  the MC page sends no header). Valid header -> that tenant's missions
  only; tenant === null missions hidden (fail-closed). Invalid header ->
  400 invalid_caller_tenant. Cross-tenant [id] -> 403 cross_tenant_denied
  carrying only the mission_id (no tenant leak in the error).
- Critical limitation, stated in the file itself: "it is NOT authorization
  against a deliberate loopback caller" and "asserting another tenant's id
  gets that tenant's view." This is self-asserted identity, not the
  TENANT ENTITLEMENT link of the authority chain. It stops accidental
  cross-tenant reads, not deliberate exfiltration-shaped queries (the
  J-19 weakest surface named in the task).
- Partial falsification elsewhere: /api/mc/graph IS tenant-scoped and
  fail-closed on unknown tenant (lane B7: REACHED via getFydTenantGraph),
  but that is the FYD object-graph projection, not the MC mission
  projection. The mission projection (projectMissions) has no equivalent.

Against the authority chain: at committed level the read path implements
CALLER -> TENANT CONTEXT with AUTHENTICATED IDENTITY and TENANT
ENTITLEMENT both absent; the tenant label is either absent (operator sees
all) or self-asserted (dirty header).

---

## Consolidated verdicts

- T-01 event-bridge namespace laundering: VULNERABILITY REPRODUCED (code).
- T-02 MC caller-to-tenant authority gap: VULNERABILITY REPRODUCED (code,
  committed); fix in flight as dirty uncommitted code.
- T-03 ContextPack contamination: NOT REPRODUCED on the in-tree dispatch
  path (structural refusal: server-side mint, no caller input surface);
  contract-level unbound parameter CONFIRMED as latent.
- T-04 MC projection contamination: VULNERABILITY REPRODUCED (code,
  committed); dirty scoping layer is self-asserted, not entitlement.

## Caveats and open evidence

1. Sandbox isolation: /home/nolan/projects/ping not visible here; :3100
   connection refused here. No live request/response evidence was
   collected. Code citations are from workspace mirrors and prior lane
   captures, each with stated provenance. Nothing here should be read as
   a live exploit demonstration; no tenant data was touched.
2. Tree-state discrepancy: prelaunch registers place the canonical tree at
   f877c391 (branch fyd/builder-harvest-trackc-2026-09-28); lanes 9/10/13/16
   observed 0264d517 (branch hardening/2026-09-28-vocab-ssrf, dirty) on
   2026-09-28 14:26+ MDT. The committed-level defects cited are identical
   across both states; the dirty diffs are the fix attempts. If the tree
   moved branches between observations, the BASE SHA pinning for Wave A
   work should be re-confirmed at GO.
3. T-01 live wiring: whether the bridge poll loop runs in the production
   gateway container is Pig-side runtime state, not observable from here.
   Lane 13's hermetic run of the live-container emit/governance modules
   corroborates the mechanism but not the wiring.
4. T-03 adapter surface: issueWorkOrder lives in the out-of-tree orca-adapter
   (Pig-side). A direct adapter caller passing a forged contextPackId is
   outside the observed in-tree call graph and UNVERIFIABLE from here.
5. No em dashes were used in this report. No writes were made outside this
   report file and the pre-existing h00-02 directory.

## Done evidence

- This report: ~/workspace/ping-24h/sprint/h00-02/A-WAVE-A-TENANT.md
- Key code references (read-only; paths as observed from this sandbox):
  tenant bridge copies, unified_event_runtime copy, route.HEAD.ts,
  mc-dispatch.HEAD.ts, lane-p01 tree routes, laneB13 dirty-tree.patch and
  raw probes, lane 13/16 and lane B7/9/10 reports, wb-f-journal-privacy.test.ts,
  multi-runtime-workorder-contract.md.
