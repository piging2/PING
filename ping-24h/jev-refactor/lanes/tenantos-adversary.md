# TenantOS Adversary Lane: Tenant Isolation Under Hostility (B + J)

Lane B (tenant responsibility separation, identity handoff inventory) + Lane J (adversarial autonomy test designs).
Read-only investigation. No code was changed by this lane.

Revisions observed (2026-09-29, via Pig SSH, read-only):
- PING canonical checkout: `/home/nolan/projects/ping`, HEAD `f877c3919941978f07d5014909595df4751ec258`
- Gateway repo: `/home/nolan/ping`, HEAD `1822d5faecbf7db6985cca1e3303533abef81809`
- TenantOS wave integration branch: `tenanos-wave/integration` (observed via `/home/nolan/workspace/tenanos-wave`)
- ORCA adapter: `/home/nolan/workspace/orca-adapter` (adapter.js HEAD content; vendor/external_agent_adapter.js vendored)

Required invariant for this lane: PING reconstructs authoritative state and never invents success, authority, evidence, or absence of effect. UNKNOWN EFFECT -> HOLD -> RECONCILE.

## 0. Corrections to the prior JEV autonomy map (2026-09-28)

The 2026-09-28 map was built against PING HEAD 0264d517 and needs three corrections against current code:

1. "TenantOS has no separate decision-surface code" is no longer accurate for the integration branch. `tenanos-wave/integration` contains substantial mechanism code under `src/tenanos` (claims, leases, attempt fencing, recovery, run journal, budgets, worker/tool auth boundary, routing, sandbox profiles, context packs, invalidation, tenant context, namespace binding, bridge-tenant). The correct statement: mechanism code exists but is not proven wired into the reached Mission Control dispatcher.
2. `mc-dispatch-identity.ts:66` (resolveCaller) and `mc-tenant-gate.ts:45` (callerScope) do not exist in any observed repo. Searched the canonical tree, the gateway repo tree, and the integration branch trees. The 2026-09-28 map's tenant-resolution citations are wrong. What actually exists is `src/tenanos/tenant/tenant-context.ts` (integration branch: `bindTenantContext` documented "trusted inputs only", `requireTenantContext`, `assertSameTenant`) and, separately, FYD's `src/fyd/tenant/tenant-context.ts` in canonical HEAD.
3. P-20260923-088's own `PLAN.md` states its gateway tenant-filter patches were scratch, "NOT applied, NOT committed". Verified live: `gateway/routes/mission_control.js` in the gateway repo contains ZERO tenant references (grep count = 0), and the canonical-tree MC projector (`src/app/api/mc/_lib/mc-dispatch.ts`) has no caller tenant context or filter. "Integrated" for P-088 means integrated into the tenanos-wave branch, not applied to the live gateway.

## 1. B: TenantOS responsibilities, implemented vs assumed

Nine claimed responsibilities, judged against reached (live dispatch/reach paths) and repository code.

### 1. Tenant boundary (tenant identity: who owns what)
IMPLEMENTED (scoped, not universal). Canonical HEAD has real, landed enforcement:
- `tools/fyd-journal-gateway/server.mjs`: FYD_SITE_OVERLAY writes refuse missing/invalid tenant (400 `tenant_required`), refuse `tenant_id`/siteId/aggregate_id mismatch (400 `tenant_mismatch`), reads REQUIRE `?tenant=` (400 without it) and return only exact-tenant records, `request_id` is bound to the tenant that first used it (cross-tenant reuse -> 400 `request_id_tenant_conflict` with zero disclosure of the original event).
- `src/fyd/tenant/tenant-context.ts` + `src/fyd/tenant/scoped-stores.ts` in HEAD: explicit TenantContext, `requireTenantContext`, `assertTenantKey`, tenant-scoped store wrappers; tests in HEAD cover cross-tenant owner read/write refusal, projection mismatch refusal, Ask FYD isolation, contextless worker refusal, journal tenant spoof refusal, route mismatch refusal, crash-window tests.
- Gateway repo: `ping-runtime/canonicalization/namespace_binding.js` enforces "requested wins iff bound" at the canonical boundary (`CanonicalizationService.resolveNamespace` delegates to the binder); `ping-runtime/runtime/tenant_registry.js` is the tenant registry authority; hostile suites assert ingress spoof refusal (`gateway/test_tenant_spoof_ingress.js`), Postgres envelope isolation (`gateway/test_tenant_postgres_isolation.js`), vector isolation (`ping-runtime/search/test_tenant_vector_isolation.js`), worker tenant pin (`ping-runtime/workers/test_worker_tenant.js`).
- Integration branch: `src/tenanos/tenant/tenant-context.ts`, `namespace-binding.ts`, `bridge-tenant.ts`.

NOT universal: the current MC dispatch projector is unscoped (see section 5), and the event bridge launders namespace (see section 2.4).

### 2. Workspace (a tenant's working home)
ASSUMED. No tenant workspace provisioning, lifecycle, or ownership primitive was found in any reached path. The MC route writes artifacts to a single shared path (`/home/nolan/workspace/mission-control/artifacts/<missionId>/...`); the missionId is content-derived and carries no tenant directory partition. Search found no `tenantScopedDir`-equivalent for MC artifacts (FYD's `tenantScopedDir` exists for FYD state only).

### 3. Resource quotas (budgets, slots)
ASSUMED (mechanism designed, not durable or reached). Integration branch `src/tenanos/budgets/budgets.ts` defines a tenant/mission/run/attempt budget hierarchy and `WorkerSlots`, but is pure/in-memory with no durable store and no observed wiring into the dispatcher. The current MC route does check broker quota (worker availability), but there is no tenant budget authority in the reached path.

### 4. Credential references (opaque, resolvable, least-privilege)
ASSUMED. Integration branch `src/tenanos/auth_boundary.ts` (worker/tool auth) carries only `credentialPresent: boolean`; there is no credential-reference authority: no issuance, no opaque reference resolution, no per-tenant secret binding. No such mechanism was found in the canonical tree or gateway repo either. A boolean presence marker is not a credential authority.

### 5. Worker availability (which workers may run, liveness)
IMPLEMENTED (in the reached path). Canonical `src/app/api/mc/dispatch/route.ts` loads adapter profiles, requires `profile.status === 'LIVE'`, requires the capability in `profile.allowedCapabilities`, and checks broker quota. The ORCA adapter `authorizeWorkOrder` (vendor/external_agent_adapter.js:192) refuses unknown agents, pending-auth agents, identity-policy-denied agents (1..4 only), disallowed capabilities, and malformed namespaces/constraints. Fail-closed refusals are typed (`denied`, `authorization_refusal`, `refusal_source`).

### 6. Execution environment (sandboxed, reproducible)
ASSUMED (designed, not the reached executor). Integration branch `src/tenanos/sandbox/profiles.ts` renders deterministic nsjail profiles with receipt hash (`verifyReceipt(profileName, receipt)`), but the file itself states nsjail is externally deployed and policies are representative until hardened against pinned binaries. The reached MC dispatcher executes directly: Ollama via HTTP `fetch`, broker via `spawnSync`. The sandbox is not the executor.

### 7. Network policy (egress allowlists, isolation)
ASSUMED. The sandbox profile data model carries network representation, but the reached MC path has no network-namespace enforcement; `no_network` exists only as a work-order constraint envelope value checked at authorization, not as an enforced data-plane policy. The worker transport (HTTP fetch to Ollama, spawnSync to broker) runs in the route's own process environment.

### 8. Process lifecycle (claims, leases, fencing, recovery)
IMPLEMENTED AS MECHANISM, UNWIRED AT DISPATCH (count as assumed for the reached path). Integration branch has the strongest code observed in this lane:
- `src/tenanos/claim/claim.ts`: atomic (tenant_id, key) claim, one winner, losers attach to winner.
- `src/tenanos/leases/lease.ts`: tenant-scoped holder, fencing-token CAS.
- `src/tenanos/run/attempt-fencing.ts`: zombie writes must match zero rows; timeout/stale projects to unknown; reconciliation distinguishes effect proven / effect absent / unknown.
- `src/tenanos/run/run-state-authority.ts` (`classifyUnknownExecution`): total over the evidence cube; effectProven+!effectAbsent -> MARK_SUCCEEDED_FROM_EVIDENCE (reexecute=false); indeterminate/contradictory -> HOLD_NEEDS_RECONCILIATION (reexecute=false). This is the required invariant in code form.
- `src/tenanos/reconcile/recover.ts`: new run with lineage, never resume old attempt in place.
- `src/tenanos/runs/schema.ts`: durable tenant-scoped attempt row, append-only run journal vocabulary.

The reached MC dispatcher is SYNCHRONOUS: the HTTP route awaits the worker inline. None of claim/lease/fencing is in the dispatch path; a host death mid-request leaves the mission at MC_EXECUTION_STARTED with no terminal event. The ORCA adapter does have an idempotency-keyed reconcile gate (`reconcileGate`, `dispatchExecution` 2c, adapter.js:429) with an atomic cross-process reservation, but the MC route calls adapter `issue` only for envelope building, not `dispatchExecution`; the MC route's own execution is not under the ORCA reconcile gate.

### 9. Storage boundary (tenant-scoped reads/writes)
IMPLEMENTED (scoped, not universal). FYD scoped stores + journal gateway enforcement (above); gateway Postgres envelope suite asserts fail-closed unscoped reads/writes and cross-tenant invisibility; Qdrant adapter suite asserts namespace-required search/upsert. Not universal: underlying FYD stores remain unscoped (wrappers are "the only sanctioned path", bypass resistance unproven), and the MC journal is a single global JSONL file with no tenant partition.

RESPONSIBILITY COUNT: 4 implemented-or-mechanism (tenant boundary scoped, worker availability, storage boundary scoped, process lifecycle mechanism) vs 5 assumed/unwired (workspace, credential references, execution environment, network policy, resource quotas end-to-end). Of the 4, only worker availability is fully reached in the live MC dispatch path; the other 3 are scoped-but-not-universal or mechanism-not-wired. Honest headline: 1 fully reached, 3 scoped/unwired, 5 assumed.

## 2. B: Trace TENANT -> SOURCE -> OBJECT -> MISSION -> DECISION -> WORKER -> EFFECT -> OUTCOME

Traced through the REACHED Mission Control dispatch path (canonical HEAD), which is the path that actually dispatches work today.

- TENANT: accepted from the HTTP request body (`src/app/api/mc/dispatch/route.ts:226` `const tenant = typeof body.tenant === 'string' ? body.tenant : '';`). Checked only against the static allowlist `SLICE_TENANTS` (line 234). No authenticated caller, no caller-to-tenant entitlement, no session binding. `principal` in the context artifact is the fixed string `mission-control-dispatch`.
- SOURCE: the dispatcher itself is the source; there is no per-source binding table in the MC path (contrast with the gateway's operator per-source namespace map). Any caller that can reach the route picks either allowlisted tenant.
- OBJECT: the mission row is minted in the route (`missionId` content-derived, line 256) and journaled via `appendDispatchEvent` with `tenant` in `event_data` (lines 268-272). Journal is a single global JSONL file.
- MISSION: MC_MISSION_CREATED -> MC_RUN_QUEUED -> MC_EXECUTION_STARTED -> MC_AGENT_AUTHORIZED journaled (lines ~318-321). Tenant rides in event_data; "immutable" only by convention, the file has no integrity enforcement observed.
- DECISION: two sub-decisions. (a) Authorization: `adapterCall('authorize', { agentId, capability, namespace, constraints })` where `namespace = 'tenant::' + tenant` (line 262). The adapter checks agent liveness, capability allowlist, namespace SHAPE, and constraint tightening (external_agent_adapter.js:192-231). It does NOT check that the requester is entitled to the tenant: entitlement was decided upstream by the allowlist membership check. (b) Work order: `adapterCall('issue', ...)` builds the envelope; `contextPackId` is minted locally (`mc-ctx-<missionId>`), never tenant-bound.
- WORKER: runs inline in the route: `runOllama(prompt, deadlineS)` via HTTP fetch or `runBroker(agent, prompt, deadlineS)` via spawnSync. The worker prompt carries `tenant: <id>` as an informational line only (ORCA `buildWorkerPrompt`, adapter.js:593; "Execution context (informational; do not narrate it back)"). No tenant-scoped tool binding exists at the ORCA worker layer. In the vendored adapter's `dispatchExecution` (not reached by this route), `resolveTenantId` (adapter.js:89) enforces tenant/namespace consistency fail-closed, and the worker prompt repeats the tenant informationally.
- EFFECT: for current MC workers the effect is informational output only (work-order constraints forbid canonical events and mission-state writes: `no_canonical_events !== true || no_mission_state_writes !== true` -> deny). There is no independent effect proof: `verifyResultEnvelope` (external_agent_adapter.js:313) verifies structural echo (ids, agent binding, capability, deadline, completed/failed shape), NOT the truthfulness of `output`. Success is reconstructed from the worker's self-reported status.
- OUTCOME: terminal journaling honors UNKNOWN as first-class: transport-failed -> MC_RUN_FAILED; timeout -> MC_RUN_UNKNOWN with `reconciliation_state: RECONCILIATION IN PROGRESS`; envelope verification failure -> MC_RUN_UNKNOWN; completed -> MC_RUN_SUCCEEDED (from worker-claimed status + structural verification). The invariant UNKNOWN EFFECT -> HOLD -> RECONCILE is honored in the terminal-event vocabulary, but there is no background reconciler in the reached path: RECONCILIATION IN PROGRESS is a label with no observed worker.

### 2.4 Confirmed live laundering: the canonical event bridge
`ping-runtime/events/event_bridge.js` `_bridgeCanonicalEvents` (gateway repo, live) reads `tenant_id` from `canonical_events`, sets `payload._tenant_id` and `metadata.tenant_id`, but calls `emit()` WITHOUT `options.namespace`. `UnifiedEventRuntime.emit` resolves `const namespace = options.namespace || 'core::system'` (unified_event_runtime.js:237), so every bridged canonical event is written to `ping_events` with `namespace='core::system'` regardless of its true tenant. Tenant identity survives in payload/metadata but the namespace authority field is laundered to core. The integration-branch fix (`src/tenanos/tenant/bridge-tenant.ts`, namespace-preserving emit options) is NOT applied to the live bridge. Separately, that same module falls back unknown/malformed tenant to `core::system` with `tenant_unknown=true` instead of refusing: a fail-open-by-default design that must not ship.

## 3. B: Identity handoff inventory

Every tenant identity handoff in the traced chain, classified per the required taxonomy.

H1. HTTP caller -> POST /api/mc/dispatch tenant field: ACCEPTED FROM UNTRUSTED INPUT. `route.ts:226`, allowlist-only gate at :234. No authenticated principal, no entitlement proof.
H2. Route -> `namespace = 'tenant::' + tenant` (:262): INFERRED. Shape-valid (`NAMESPACE_RE` check at :263) but the authority claim ("this requester may act as this tenant") is inferred from H1, never established.
H3. Route -> ORCA `authorizeWorkOrder({agentId, capability, namespace, ...})`: INHERITED. Passed down unchanged; adapter re-checks shape, not entitlement.
H4. ORCA authorizeWorkOrder namespace/capability checks: EXPLICIT. Real fail-closed decisions (external_agent_adapter.js:192-231), but explicit about capability/agent/shape, NOT about tenant entitlement.
H5. ORCA `dispatchExecution` `resolveTenantId({tenantId, namespace})` (adapter.js:89): EXPLICIT consistency check (throws `tenant_namespace_mismatch`, refuses core-namespace tenant dispatch). Caveat: its docstring calls tenantId "authoritative tenant from the scheduler dispatch event... taken from the mission row's immutable tenant", but in the reached MC path the mission row was minted seconds earlier from untrusted body tenant. The CHECK is explicit; the PROVENANCE it trusts is inherited-from-H1. Not reached by the current MC route at all (route calls only `authorize` + `issue`, not `dispatchExecution`).
H6. ORCA -> worker prompt `tenant: <id>` line (adapter.js:593): DUPLICATED. Informational prose copy of the tenant; enforcement copy lives at authorize. A prompt line constrains no tool.
H7. Worker -> result envelope echo (work_order_id, context_pack_id, agent_id, capability): INHERITED, then verified structurally by `verifyResultEnvelope`. Truthfulness of output is NOT verified (see J-16).
H8. Route -> MC journal (`tenant` in event_data): EXPLICIT (stored on every lifecycle event), but the journal file itself is a global unpartitioned JSONL; immutability is conventional, not enforced.
H9. Journal -> `projectMissions` projector: INHERITED into the record, then the caller boundary is ABSENT: `loadJournalEvents()` (:155) loads the whole journal, `projectMissions()` (:266) has no caller tenant parameter, GET /api/mc/missions takes no tenant/auth at all. Any reader of the route sees all tenants' missions.
H10. FYD journal gateway tenant enforcement + request_id tenant binding: EXPLICIT. 400 `tenant_required` / `tenant_mismatch` / `request_id_tenant_conflict` (zero disclosure). Landed in canonical HEAD.
H11. FYD `TenantContext`/`requireTenantContext`/`assertTenantKey` + scoped stores: EXPLICIT where used. Underlying stores remain unscoped, so bypass resistance is ASSUMED, not proven.
H12. Gateway POST /ingest -> `CanonicalizationService.resolveNamespace`: EXPLICIT. `namespace_binding.js`: "requested wins iff bound"; unbound override is DENIED. Landed in the gateway repo.
H13. Canonical events -> EventBridge -> ping_events namespace: INCORRECTLY RECONSTRUCTED. `tenant_id` preserved in payload/metadata; `namespace` reset to `core::system` by the missing option (live, proven).
H14. Search/upsert -> Qdrant adapter namespace: EXPLICIT (adapter requires namespace on search/upsert per the hostile suite; suite asserts fail-closed unfiltered search and batch-namespace consistency).
H15. Gateway WorkerRuntime `BaseWorker._emit`: EXPLICIT. Inherits `tenant_id` from the pinned triggering event; a contradicting explicit `options.tenant_id` throws (fail closed); `WorkerRuntime.dispatch` pins the triggering event (per `ping-runtime/workers/test_worker_tenant.js`).
H16. FYD TenantContext -> Ask FYD / projections (scoped wrappers): EXPLICIT where wrappers are used; production-wide usage not fully audited (PARTIAL).
H17. Integration-branch `bindTenantContext` / `requireTenantContext` / `assertSameTenant`: EXPLICIT at module level; wiring into the reached dispatcher ABSENT.
H18. `contextPackId` -> work order: ABSENT. Minted as `mc-ctx-<missionId>`, threaded through `issue()` and echoed in the result envelope, with zero tenant binding or validation at any point. In the current route it is self-minted so the exposure is limited, but the field is designed to reference external context packs and the work-order contract never checks whose they are.
H19. Credential material -> worker: ABSENT. Only `credentialPresent: boolean` exists at the TenantOS auth boundary; no reference authority, no per-tenant binding, no resolution.
H20. Budgets/leases/claims -> dispatcher: ABSENT. Mechanisms exist (integration branch); no wiring into the reached dispatch path.

Handoff totals: EXPLICIT 9 (H4, H5-check, H7-verify, H8, H10, H11, H12, H14, H15), INHERITED 4 (H3, H7, H8-into-H9, H9-record), INFERRED 1 (H2), DUPLICATED 1 (H6), ACCEPTED FROM UNTRUSTED INPUT 1 (H1), ABSENT 4 (H9-boundary, H17-wiring, H18, H19, H20 = 5), INCORRECTLY RECONSTRUCTED 1 (H13). (H5 appears twice because the check is explicit while its trusted provenance is inherited; H9 splits record vs boundary.)

## 4. B: Six hostile isolation verdicts

1. A evidence cannot inform B (PING-wide): PARTIAL. Enforced at the FYD journal seam (H10), the Postgres canonical envelope (hostile suite), and the Qdrant adapter (H14). Broken at the MC journal projection (H9: global read) and blurred at the event bridge (H13: namespace laundered to core::system while tenant_id rides in metadata).
2. A ContextPack cannot enter B work: PARTIAL. The integration-branch assembler filters by namespace and counts cross-namespace drops; but the reached work-order contract accepts and echoes `contextPackId` with no tenant binding (H18). Cross-namespace drops are also drops, not typed boundary violations.
3. A worker capability cannot operate on B: ASSUMED. Capability+namespace-shape authorization is explicit (H4); no worker/caller-to-tenant entitlement exists anywhere in the reached path; the tenant in the worker prompt is informational prose (H6). The TenantOS capability-grant checker (`tenant_capability_grant.js`) validates grant shape including tenant match, but grant ISSUANCE is explicitly "future" per its own header.
4. A search cannot retrieve B: PARTIAL. Hostile suites assert namespace-required search/upsert against live Qdrant and Postgres in the gateway repo. FYD Ask/projection paths have scoped tests in HEAD. No single audit proves every search surface (Ask FYD, Qdrant, MC artifacts, journal files) is tenant-scoped.
5. A GitHub repo cannot silently become B knowledge: ASSUMED. No live GitHub ingestion exists today, which is absence of the vector, not proof of isolation. No repo-to-tenant binding was found anywhere. The first ingestion built without a binding replays the namespace-spoof class.
6. A Mission Control cannot project B state: ASSUMED (failing). `projectMissions`/`loadJournalEvents` are global; GET /api/mc/missions and /api/mc/missions/[id] take no caller tenant; P-088's filters were designed but never applied. A reader of the MC API sees every tenant's missions.

Totals: 0 PROVEN, 3 PARTIAL, 3 ASSUMED.

## 5. J: Adversarial autonomy test designs (19, designed only, not run)

Each test names WHAT IT WOULD PROVE, WHAT EXISTS TODAY TO SURVIVE IT, and the GAP. None were executed.

J-1. Worker killed after producing output, before the receipt is journaled. PROVE: the system never invents success or absence of effect; the run lands UNKNOWN and reconciles. TODAY: the reached MC route is synchronous; a kill mid-request leaves the mission at MC_EXECUTION_STARTED with no terminal event and no background reconciler. The ORCA adapter has an atomic cross-process reconcile gate and `classifyUnknownExecution` (MARK_SUCCEEDED_FROM_EVIDENCE only with idempotency-keyed effect proof; else HOLD), but the MC route does not use `dispatchExecution`. GAP: no crash recovery loop on the MC path; RECONCILIATION IN PROGRESS is a label without a worker.

J-2. ORCA killed after capability issuance, before work starts. PROVE: issuance alone never becomes authority to claim effect. TODAY: work-order issuance is envelope construction, never sent by the adapter (`issue` builds, does not dispatch); the idempotency key binds execution+input+tenant+capability. GAP: the MC route treats its own synchronous execution as the effect; no independent issuance ledger is consulted before journaling success.

J-3. ORCA killed after the external effect, before the outcome is recorded. PROVE: UNKNOWN EFFECT -> HOLD -> RECONCILE, never invented success. TODAY: `classifyUnknownExecution` implements exactly this (effectProven+!effectAbsent -> record success from evidence with reexecute=false; indeterminate -> HOLD). The MC route honors UNKNOWN on timeout. GAP: the MC path has no effect journal to consult (no `effectProven` source for its workers), so reconciliation has no evidence to classify.

J-4. Host restart mid-mission. PROVE: restart reconstructs authoritative state, never invents terminal outcomes. TODAY: the MC journal is append-only JSONL and the projector is deterministic, so a restart replays to the last journaled event honestly; but the in-flight terminal event is lost (J-1) and nothing resumes or reconciles it. GAP: replay is honest but incomplete; no recovery pass marks the orphaned execution UNKNOWN or re-drives it.

J-5. Network dropped mid-dispatch. PROVE: transport failure is typed as transport failure, never as success or as proof of no effect. TODAY: the MC route types `transport-failed` (prompt never delivered -> FAILED, honest) vs `timeout` (delivered-or-maybe -> UNKNOWN). The adapter's outcomes.js has typed EFFECT_STATE. GAP: for the timeout case the route cannot distinguish "never delivered" from "delivered, effect unknown"; both are UNKNOWN, which is honest but coarse, and nothing later refines it.

J-6. GitHub unavailable during a mission that needs repo context. PROVE: the mission degrades to UNKNOWN/HOLD, never fabricates repo knowledge. TODAY: no live GitHub ingestion exists, so the vector is absent rather than defended. GAP: absence is not a boundary; the first ingestion built without repo-to-tenant binding and evidence-bounded refusal replays the spoof class (see verdict 5).

J-7. Qdrant unavailable during Ask/search. PROVE: the system reports the dependency failure, never an empty result disguised as "no evidence". TODAY: the Qdrant adapter suite asserts namespace-required search, but the PING invariant "never confuse nothing exists with failed to find it" has no observed enforcement at the Ask FYD boundary in the reached path. GAP: unproven fail-closed on vector-store outage at the product surface.

J-8. Jev unavailable (shadow sensor). PROVE: Jev's absence changes nothing authoritative; the deterministic path proceeds. TODAY: Jev is shadow/eval-only by standing architecture and has no authority in the dispatch path. GAP: none observed, but the exclusion is architectural convention, not an enforced boundary; a future Jev caller must be gated at the seam.

J-9. Malformed Jev response (shadow path). PROVE: malformed shadow output is discarded, never promoted into canonical claims. TODAY: Meta AI output is UNVERIFIED until the verification gate by standing rule; no promotion path observed. GAP: the gate is policy, not code, at the observed seams.

J-10. High-confidence wrong Jev decision (shadow). PROVE: confidence never substitutes for evidence; wrong shadow output loses at the seam. TODAY: "Jev selects, never authorizes; reject at the seam if it loses" is the standing rule; the first experiment is shadow-mode evidence reranking. GAP: the seam's reject criteria are not yet codified in code.

J-11. Jev model-version change mid-experiment. PROVE: version is pinned in the evidence record; replay detects drift. TODAY: the recorder exists on a branch (`jev/shadow-recorder`); versioning discipline in canonical records is asserted by policy ("hashes only in canonical records", tenant identity excluded). GAP: unproven in the reached path.

J-12. Two workers claim the same eligible work. PROVE: exactly one winner; the loser attaches, never double-executes. TODAY: integration-branch `claim.ts` implements atomic (tenant_id, key) claims; the ORCA adapter has an atomic cross-process idempotency reservation (`reconcileGateLocked`). The MC route mints missionId from content+timestamp, so a retried HTTP request mints a NEW mission rather than converging: duplicate submission is not deduplicated at the MC ingress. GAP: no claim/lease in the reached MC path; retry creates a sibling mission.

J-13. Lease expires while the worker still operates. PROVE: the zombie's writes match zero rows; its result is rejected, never merged. TODAY: `attempt-fencing.ts` specifies exactly this; `recover.ts` mandates a new run with lineage, never resume-in-place. GAP: unreached by the MC dispatcher; the synchronous route has no fencing token at all.

J-14. Evidence mutates after the decision request. PROVE: the decision is bound to the evidence digest it saw; mutation invalidates, never silently reuses. TODAY: missionId binds `promptDigest`; the context artifact binds `prompt_digest`; result verification binds `result_id` to the envelope. GAP: no evidence-version pinning observed between decision and worker execution; the worker receives the prompt inline, not a digest-pinned evidence reference.

J-15. Tenant context changes between planning and dispatch. PROVE: the dispatch re-resolves and re-checks tenant; a mid-flight change fails closed. TODAY: nothing re-resolves: tenant is read once from the body (H1) and threaded unchanged (H2-H5). `resolveTenantId` would throw on a contradiction IF the scheduler supplied an independent tenant, but the scheduler IS the route that read the body. GAP: single read, no independent re-resolution; the "authoritative scheduler tenant" is the untrusted input wearing a mission row.

J-16. Worker claims success while its tests fail (fabricated output). PROVE: success requires independent effect proof, never the worker's word. TODAY: `verifyResultEnvelope` checks structural echo only (ids, agent binding, capability, deadline, shape). A well-formed lie passes. The MC route emits MC_RUN_SUCCEEDED on worker-claimed `completed` + structural verification. GAP: no independent effect verification for worker output; RESULT != VERIFIED OUTCOME is stated in `verifyReceipt`'s docs but the receipt system is not the reached verifier.

J-17. Artifact exists without effect (result.json present, effect never happened). PROVE: artifact presence never implies effect; only the effect journal does. TODAY: the route publishes `result.json` only after adapter verification, but verification is structural (J-16). The ORCA adapter's reconcile gate consults the artifact index + idempotency keys; the integration branch distinguishes effect proven/absent/unknown. GAP: the MC path has no effect journal; artifact and effect are conflated by construction.

J-18. Effect succeeds but the receipt is lost. PROVE: the system recovers the outcome from evidence, never re-executes blindly. TODAY: `classifyUnknownExecution` with effectProven -> MARK_SUCCEEDED_FROM_EVIDENCE, reexecute=false. The ORCA adapter's `unknownReturn` carries `effect_may_have_occurred=true`. GAP: the MC route has no durable effect-evidence store to consult, so the classifier has no inputs on this path.

J-19. Tenant A data is presented in a Tenant B context. PROVE: the boundary refuses or redacts, never renders cross-tenant data. TODAY: FYD journal gateway (H10) and scoped stores (H11) refuse; the namespace binder (H12) denies unbound overrides; the Qdrant adapter requires namespace. But the MC projector serves all tenants to any reader (H9), the bridge launders namespace to core::system (H13), and the worker prompt carries tenant as prose (H6). GAP: the read surfaces with the weakest enforcement (MC projection, bridge output) are exactly the ones an exfiltration-shaped test would target.

## 6. Verdict lines for the parent

- Tenant boundary: 4 of 9 responsibilities implemented-or-mechanism (tenant boundary scoped, worker availability reached, storage boundary scoped, process lifecycle mechanism unwired); 5 assumed (workspace, credential references, execution environment, network policy, resource quotas end-to-end).
- Identity handoffs inventoried: 20. Explicit 9, inherited 4, inferred 1, duplicated 1, accepted from untrusted input 1, absent 5, incorrectly reconstructed 1.
- Prior map corrections: 3 (tenanos decision-surface code exists on the integration branch but is unwired; mc-dispatch-identity.ts / mc-tenant-gate.ts do not exist in any observed repo; P-088 gateway patches were designed but never applied, verified zero tenant references in the live gateway mission_control route).
- Hostile isolation verdicts: 0 PROVEN, 3 PARTIAL (evidence isolation, ContextPack binding, search isolation), 3 ASSUMED (worker capability vs tenant, GitHub ingestion, MC projection).
- Adversarial tests designed: 19 (J-1 through J-19), none run.
- Single scariest gap: the live Mission Control dispatch route derives tenant authority from an allowlisted request-body selector (`src/app/api/mc/dispatch/route.ts:226,234,262`) with no authenticated caller and no caller-to-tenant entitlement; ORCA then verifies only internal consistency (namespace shape, capability allowlist). A request can be consistently labeled as Tenant B without ever proving the caller was authorized for Tenant B, and the whole downstream chain (H2-H8) inherits that unproven label as "authoritative". The tenant string is carried consistently; tenant AUTHORITY is never established.
- Secondary live gap, proven: the canonical event bridge launders every tenant event's namespace to `core::system` (`ping-runtime/events/event_bridge.js` never passes `options.namespace`; `unified_event_runtime.js:237` defaults it), while the integration-branch fix sits unwired.
- Design hazard flagged: `src/tenanos/tenant/bridge-tenant.ts` falls back unknown/malformed tenant to `core::system` with `tenant_unknown=true` instead of refusing. If that module ships as-is, it converts a fail-closed boundary into fail-open visibility.
