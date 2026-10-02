# Agent D — Lineage / Evidence + Mission / Capability + WorkOrder / Result
## Read-only architectural reconnaissance, 2026-09-18 (Pig WSL)

Scope note: `/home/nolan/ping` was on branch `feature/approval-effect-identity` @ `88c9651be`
(not literally `main`; treated as the current engineering branch below and labeled "main-branch" for brevity).
Also audited: `constitutional-convergence` @ 84da2d40c, `ping-codex-convergence` @ 08c3036d9,
`ping-event-runtime` @ 1f40cf432, `orca-autonomy` @ ae55b77ff. Nested `worktrees/` dirs inside
`/home/nolan/ping` (agent-smoke, agent-exec, playbook, oracle-assembly, python-prod) were excluded
from all census greps as stale snapshots. No runtime was executed; all verdicts are from current
executable code (static read), per the evidence hierarchy.

---

## (a) LINEAGE authority trace + DAG legality verdict

### The two lineage implementations

| Implementation | File | Maturity | Verdict |
|---|---|---|---|
| `LineageAuthority` (edge creation + witness + persistence delegation) | `runtime/kernel/authorities/lineage_authority.js` (171 lines) | BUILT_NOT_LIVE | **Zero callers** in all 5 audited branches. Dead code. |
| `gateway/lineage_authority.js` | pure shim re-exporting kernel class | BUILT_NOT_LIVE | Same deadness, one extra hop. |
| `LineageWorker` (canonical worker chain) | `ping-runtime/workers/canonical_workers.js:510-543` | WIRED_UNPROVEN | Live worker: consumes `LINEAGE_CREATE` + `WITNESS_CREATED` events, emits `LINEAGE_CREATED` (consumed by `ProjectionWorker`). |

### Edge creation (what creates edges)

`LineageAuthority.createLineageEdge(parentArtifactId, childArtifactId, authority, executionId)`:
pure function, no mutable state (mutable maps deliberately removed in Phase 46).
`edge_id = identityAuthority.generateId('lineage_edge', {parent, child, authority, execution_id, timestamp})`.
`persistLineageEdge` does `INSERT INTO lineage_edges ... ON CONFLICT (edge_id) DO NOTHING`.
Persistence is **delegated to the caller** — and there is no caller.

Live lineage is produced by `LineageWorker.handle(event)`, which builds:
```js
{ documentId, eventType, timestamp, causationChain: event.metadata?.causation_id ? [event.metadata.causation_id] : [] }
```
and emits `LINEAGE_CREATED` via `BaseWorker._emit` (which threads `causation_id = triggering event_id`
and preserves `correlation_id` across worker hops).

**Prior forensics claim VERIFIED:** `LineageWorker` consumes canonical event causation metadata
(`metadata.causation_id`), not witness IDs. Witnesses are generated *from* the edge by
`LineageAuthority._createLineageWitness` (dead path) and appear in the worker pipeline only as
consumed event types (`WITNESS_CREATED` triggers lineage processing).

### DAG legality: NONE, anywhere

No cycle detection, no topological constraints, no parent/child schema validation exist in
`LineageAuthority`, `LineageWorker`, or any caller (there are none). The `causationChain` in the live
worker is a single-element array (immediate parent only); nothing walks or validates the chain.
A cyclic causation graph would be accepted silently by both implementations.

### Persistence / restart

- `LineageAuthority`: edges persisted to `lineage_edges` table **only if** a caller invokes
  `persistLineageEdge` — no caller exists, so nothing persists and nothing rebuilds.
- `LineageWorker`: stateless. After restart, lineage is reconstructible only from `ping_events`
  correlation/causation metadata (the same pattern `MissionRuntime.getTrace` uses: query
  `ping_events WHERE metadata->>'correlation_id' = ... ORDER BY timestamp`). There is no dedicated
  lineage rebuild path.
- Determinism defect (in the dead implementation, recorded for the record): `timestamp` is an input
  to `generateId('lineage_edge', ...)`, so re-creating the same edge on replay yields a **different**
  `edge_id`; `ON CONFLICT DO NOTHING` would not dedupe replay-created edges.

### Consumers

`LineageWorker` → `LINEAGE_CREATED` → `ProjectionWorker` (registered in `canonical_workers.js:709`).
That is the entire live lineage data flow.

---

## (b) EVIDENCE inventory + Observation/Claim/Evidence/Verification/Knowledge mapping + phantom vocabulary

### Evidence-named inventory (top-level branches, nested worktree snapshots excluded)

| Class / interface | File | Maturity | Notes |
|---|---|---|---|
| `EvidenceAuthority` (accumulate/verify/rank) | `ping-runtime/evidence/evidence_authority.js` (180 lines) | PROVEN_INTEGRATION | Constructed in `gateway/bootstrap/gateway_runtime.js:527`; consumed by `HybridSearch` (`verify` per hit, `rank` results). Unit-tested (`ping-runtime/evidence/test_evidence_authority.js`). |
| `Evidence` / `EvidencePayload` / `EvidenceType` interfaces | `constitutional-compiler/evidence/evidence-store.ts`, `diagnostics/constitutional-diagnostics.ts`, `engines/counter-evidence-engine.ts`, `proof/constitutional-proof-objects.ts` | WIRED_UNPROVEN | Compile-time static-analysis evidence model ("legal brief" shape: observedMutation, ruleHash, counter evidence, proof chain). Different domain from runtime `EvidenceAuthority`. |
| `Evidence` interface (`CanonicalObject` extension) | `runtime/kernel/identity/evidence.ts` | DOCUMENTED_ONLY | Zero implementers found. Type-only. |
| `RepositoryEvidenceEngine`, `RepositoryEvidenceChainEngine` | `presentping/config/repository-evidence.js`, `repository-evidence-v14.js` | LEGACY | presentping config-era artifacts. |
| `EvidencePacket` | `presentping/engine/infrastructure.js` | LEGACY | Presentational plane. |
| `EvidenceCollector` | `gateway/test_*.js` (test doubles) | EXPERIMENTAL | Test-only. |
| `EvidenceScore` | nested-worktree UI pipeline only | excluded | Not top-level. |

### EVENT != EVIDENCE

Confirmed as implemented: `EvidenceAuthority.verify()` treats a canonical event (or canonical object,
or Qdrant hit) as *candidate* evidence. Verification requires: (1) hash recompute via
`verifyCanonicalObject`, (2) lineage presence, (3) namespace consistency, (4) for Qdrant hits, tracing
`payload.source_event_id` back to a real `ping_events` row with matching namespace and canonical hash.
Event persistence alone grants nothing. Weak spot: if `canonicalObjectVerifier` is absent and
`canonical_hash` is merely a string, `checks.hash = true` (trust-on-claim) — the constructor requires
pool or eventRuntime, but the verifier function is optional.

### Observation / Claim / Evidence / Verification / Knowledge — actual implementation

| Concept | Implementation | File + function | Maturity |
|---|---|---|---|
| Observation | `ObservationWorker.extract_observations` (python) + `ObservationWorker`/`ClassificationWorker` (JS) | `/home/nolan/ping/observation_worker.py`; `canonical_workers.js` ClassificationWorker handles `OBSERVATION_CREATED` | WIRED_UNPROVEN (both planes wired: python via `constitutional_runtime.py:141` register_handler; JS via WorkerRuntime registration). **Two live-ish planes doing the same job.** |
| Claim | `ClaimWorker.extract_claims_from_observations` (python) + JS ClaimWorker | `claim_worker.py`; `canonical_workers.js` handles `CLAIM_GENERATE` | WIRED_UNPROVEN (same dual-plane duplication) |
| Evidence | `EvidenceAuthority.accumulate/verify/rank` | `ping-runtime/evidence/evidence_authority.js` | PROVEN_INTEGRATION |
| Verification | `EvidenceAuthority.verify`; `replay_verification.ts` (ReplayAuthority); `witnessAuthority.verifyWitness` | `ping-runtime/evidence/evidence_authority.js`; `runtime/kernel/replay/replay_verification.ts` | PROVEN_INTEGRATION (evidence path) |
| Knowledge | `ProjectionWorker` → knowledge graph; `knowledge_promoter.js` (uses `EvidenceAuthority.rank`); `HybridSearch` | `canonical_workers.js:709`; `ping-runtime/knowledge/knowledge_promoter.js`; `ping-runtime/search/hybrid_search.js` | WIRED_UNPROVEN |

Pipeline order (JS plane, `canonical_workers.js:9`):
`DOCUMENT_IMPORT → OBSERVATION_CREATE → CLAIM_GENERATE → REPLAY_VERIFY → WITNESS_CREATE → LINEAGE_CREATE → PROJECTION_CREATE`.

### Phantom vocabulary (names with no implementation behind them)

1. **`CapabilityAuthority`** — `capabilities/registry.yaml` declares `CapabilityResolution → CapabilityAuthority`
   as `missing_implementation`. Both `external_agent_adapter.js` copies reference a "live"
   `/app/gateway/capability_authority.js:230`, but **no file by that name exists in any of the 5 audited
   branches**. Runtime authorization is actually performed by `authorizeWorkOrder()` inside the adapter
   itself; `CapabilityAuthority` is never required. The live claim rests on the deployed container only.
2. **`IMissionAuthority`** — `runtime/kernel/mission/mission-authority-interface.ts`
   (Program/Epic/Mission/Task/Execution hierarchy). Zero implementers in the orca-autonomy branch.
   DOCUMENTED_ONLY.
3. **`Evidence` (kernel identity)** — type-only interface, zero implementers. DOCUMENTED_ONLY.
4. **`archived` mission status** — in `mission_runtime.js` doc comment lifecycle
   (`created → assigned → running → completed/failed → archived`); no `archive()` method, no query,
   no transition. DOCUMENTED_ONLY.
5. **`LineageAuthority` as an authority** — dead code with zero callers (see (a)). PRESERVED_INACTIVE.
6. **MCP capability-matrix backend** — frontend `MCPOrchestration.tsx` expects
   `/api/v1/mcp/capability-matrix`; no backend implementation in any audited branch. Frontend-only.
7. **Temporal mission execution** — `ping-runtime/temporal/workflows/mission_workflow.js` +
   `activities/mission_activities.js` are stubs ("will be wired during integration"). EXPERIMENTAL.

---

## (c) MISSION lifecycle + identity + persistence

### Mission identity

`MissionRuntime.create(missionType, payload)`:
`mission_id = sha256(missionType + ':' + (payload.event_id || JSON.stringify(payload))).slice(0,16)`.
Idempotent by construction (`ON CONFLICT (mission_id) DO NOTHING`); the same triggering event always
produces the same mission. ORCA uses a **second, incompatible scheme**: `missionId = 'orca-loop:' +
objective_id.slice(0,12) + ':' + taskKey` (synthetic, not content-derived) — see contradiction C3.

### Persistence: `ping_missions` table

Created by `MissionRuntime.initialize()` (`ping-runtime/orchestration/mission_runtime.js:33-62`).
Columns: `mission_id` PK, `mission_type`, `status`, `priority`, `payload` JSONB, `result` JSONB,
`assigned_to`, `created_by`, `created_at`, `started_at`, `completed_at`, `error`, `retries`,
`retry_at`, `lease_until`, `claimed_at`.
**No `namespace` column, no `principal` column, no `parent_mission_id` column.**
Namespace/correlation live inside `payload` (the bridge stores `correlation_id`, `namespace`,
`event_id`, `canonical_hash`, `confidence` there). `created_by = 'event-to-mission-bridge'`.

### Lifecycle states (all conditional SQL transitions)

`created → assigned → running → completed | failed`, plus `retry_pending` (backoff) and implicit
reclaim-to-`created`. `assign`: `UPDATE ... WHERE status='created'` (claim race-safe, P0-1).
`start`: only from `assigned`. `complete`: only from `running`. `fail`: from `running|assigned|retry_pending`.
`failWithRetry`: `retries+1`, `retry_pending` + `retry_at = now + backoff` (default max 3 attempts, 5s backoff);
exhaustion → `failed`. Dead-letter: `MissionScheduler._failMission` → dead-letter authority on exhaustion (P0-5).

### Leases / reclaims

60s `lease_until` on assign; `renewLease` extends while `running|assigned`; `reapExpiredLeases`
resets expired `running|assigned` missions to `created` (assigned_to/lease_until/claimed_at nulled,
`retry_at = NOW()`) and emits `MISSION_LEASE_EXPIRED`. Crashed-scheduler orphans are reclaimed, not lost.

### Canonical event mirror

Every transition emits via `UnifiedEventRuntime` when wired:
`MISSION_CREATED / MISSION_ASSIGNED / MISSION_STARTED / MISSION_COMPLETED / MISSION_FAILED /
MISSION_LEASE_EXPIRED`. The table is operational state; the event log is the durable record.
`getTrace(missionId)` resolves `correlation_id` from the triggering event's metadata and returns the
full causal chain from `ping_events`.

### Parent/child, principal, namespace

**Parent/child relationships: not implemented** (no column, no API, no code path).
**Principal: not implemented** (only `created_by` free text; contrast WorkOrder's constant
`principal: 'ping:external-agent-adapter'`). **Namespace: payload-only, not a first-class column.**
Correlation: payload-only, preserved end-to-end by bridge + `BaseWorker._emit`.

### Mission taxonomy vs runtime reality

`MISSION_WORKER_MAP` (`mission_scheduler.js:41-88`) maps **~20 business mission types**
(`CUSTOMER_ONBOARD`, `LEAD_FOLLOWUP`, `ESTIMATE_PREPARE`, `INVOICE_TRACK`, `REVIEW_RESPONSE`, ...)
**all to the single `'observation'` worker**. The mission type taxonomy claims domain diversity;
the scheduler collapses nearly all of it into one worker.

### Competing mission models (4)

1. `MissionRuntime` + `ping_missions` (main branch) — strongest, live.
2. ORCA objective model (`objective-runtime.js`, durable `PING_DATA_ROOT/objectives/`) — live in ORCA loop.
3. `gateway/mission_authority.js` (Ω.70: compiles Mission constitutional objects from ReflectionObjects)
   — required only by `gateway/activities/mission.activity.js`, which feeds the stub Temporal path. LEGACY.
4. `gateway/mission_authority_v2.js` (Phase 36A: `ARCHITECTURE_REVIEW`, `BugFix`, `FeatureImplementation`...)
   — a software-dev mission model; status unaudited beyond header.

---

## (d) CAPABILITY registry census + strongest candidate + orchestration-language verdict

### Census

| Registry / representation | Location | Content | Maturity |
|---|---|---|---|
| `capabilities/registry.yaml` | main branch | capability → intent → authority map; `CapabilityResolution → CapabilityAuthority` = **missing_implementation**; `ConstitutionalRuleEnforcement`, `PolicyEvaluation` = missing_implementation; `WitnessGeneration` = fragmented | DOCUMENTED_ONLY (self-declares its own gaps) |
| Connector capability registry | `ping-runtime/connectors/capability_registry.js` + `constitutional_capability_contract.js` | 9 SaaS categories: communication, calendar, crm, accounting, payments, documents, reviews, analytics, scheduling; per-category operations + providers | PROVEN_UNIT (`test_capability_framework.js`) |
| Exterior-agent capability allowlists | `AGENT_PROFILES.<agent>.allowedCapabilities` in `external_agent_adapter.js` | verbs like `fixture.read`, `text.transform`, `orchestration.plan`, `documentation.generate`, `email.send`, `sms.send`, `dead_code.analyze`, `test.generate` | PROVEN_INTEGRATION (live in ORCA loop; `validate_dispatcher_profiles.js` harness) |
| MCP capability matrix | `CascadeProjects/infra/ui-next/.../MCPOrchestration.tsx` (frontend only) | expects `/api/v1/mcp/capability-matrix` | DOCUMENTED_ONLY (no backend in repos) |
| ORCA capability derivation | `orca/control-loop/policy/orca_policy.js` | decision classes AUTO_EXECUTE / REQUIRES_VERIFICATION / REQUIRES_HUMAN_APPROVAL / PROHIBITED derived from adapter allowlists + contract §6; `APPROVAL_GATED_CAPABILITIES = ['email.send','sms.send']` | PROVEN_INTEGRATION (live in loop) |
| Kernel capability list | `runtime/kernel/identity/` and compiler evidence `capabilityOwner` fields | capability as ownership attribute | DOCUMENTED_ONLY |

### Strongest candidate for ONE capability truth

**The `AGENT_PROFILES` allowlist family in the orca-autonomy `external_agent_adapter.js`** (7 LIVE profiles:
cloud-subagent, hermes, ollama, copilot identity_1–4, codex, opencode-CLI, goose, qwen, crush; plus
PENDING_AUTH status for not-yet-authorized families, denied fail-closed). It is the only capability
representation that (1) is executable code, (2) gates real dispatches in the live ORCA loop,
(3) is fail-closed by construction, and (4) has a validation harness.

### Orchestration-language verdict: NO — capability cannot be the orchestration language today

Three mutually unintelligible capability vocabularies coexist with no shared schema and no enforcing
registry: (1) SaaS-connector operations, (2) exterior-agent allowlist verbs, (3) MCP matrix rows.
`capabilities/registry.yaml` — the document that should unify them — explicitly records its own
authority as `missing_implementation`. MISSION (desired outcome), CAPABILITY (required operation),
and EXECUTOR (performing implementation) collapse as follows:
- Mission → WorkOrder binds **capability + executor together** (`capability` and `agent_id` are both
  required envelope fields, and the profile allowlist couples them). There is no independent
  capability-resolution step; the executor's allowlist *is* the capability check.
- In the connector framework, capability is SaaS-shaped and never touches missions.
- In Temporal's stub workflow, capability is a free-text param with no registry behind it.
Recommendation: keep capability inside the WorkOrder authorization gate (where it is enforced), and do
not promote it to an orchestration language until one registry owns the vocabulary.

---

## (e) WORKORDER / RESULT trace + result-semantics verdict

Strongest branch: **orca-autonomy** (`ping-runtime/external-agent/external_agent_adapter.js`, 488 lines;
faithful port of the codex-convergence module with more profiles, `LIVE`/`PENDING_AUTH` status, and
`NAMESPACE_RE` preferred from `canonicalization_service`). Live callers: `orca/control-loop/orca_control_loop.js`
(`issueWorkOrder` @753, `recordVerifiedResult` @517,862). Validation harness:
`ping-runtime/external-agent/validate_dispatcher_profiles.js`.

### Trace: Mission → authorization → WorkOrder → executor → ResultEnvelope → verification → canonical outcome

1. **Mission/Objective**: ORCA derives `objective_id = sha256('objective:' + stableStringify({namespace,
   objective_text, constraints}))` (`objective-runtime.js`); durable state under
   `PING_DATA_ROOT/objectives/<objective_id>/` via atomic writes (temp + rename).
2. **Authorization**: `authorizeWorkOrder({agentId, capability, namespace, constraints})` — the ONE decision
   this module owns. Fail-closed checks: known profile; not `blockedExternal`; not `PENDING_AUTH`;
   `capability ∈ profile.allowedCapabilities`; `namespace` matches `^(core|tenant)::[a-z0-9_.-]+$`;
   constraints is an object and only *tightens* profile maxima; **`no_canonical_events === true` and
   `no_mission_state_writes === true` mandatory**.
3. **WorkOrder**: `issueWorkOrder` requires non-empty strings for `taskId, missionId, correlationId,
   contextPackId, resultPath`; ISO `deadline`; positive-integer `attempt`. Envelope fields:
   `work_order_id, agent_id, mission_id, task_id, correlation_id, context_pack_id, causation_id, attempt,
   principal: 'ping:external-agent-adapter' (constant, never self-asserted), namespace, capability,
   input, constraints, result_path, deadline`.
   - `work_order_id`: caller-supplied override validated as lowercase hex 32–128 chars
     (`stableWorkOrderId`), else legacy `sha256('workorder:'+taskId).slice(0,16)`. ORCA derives
     `woId = sha256('work-order:' + objective_id + ':' + task_key)` (full hex) and
     `attempt_id = workOrderId + '-attempt-' + attemptNumber`.
   - **context_pack binding is real as a binding but synthetic in ORCA**: the envelope requires
     `contextPackId` and the result must echo it exactly; the codex branch's `ContextIntegration`
     compiles real packs via `ContextCompiler`, but the ORCA loop passes
     `contextPackId: 'orca-context-<objective_id16>'` — no compilation, no evidence refs.
4. **Executor**: hermes via `hermes_dispatch.py` (crash-safe rendezvous: atomic result file carrying
   stdout/stderr/returncode + `attempt_id/work_order_id/objective_id` metadata); dispatcher budget
   (`reserveWorkOrderBudget`, idempotent per work order) prevents double-dispatch on restart.
5. **ResultEnvelope**: required fields `work_order_id, context_pack_id, agent_id, capability, status,
   output, evidence, error`. `verifyResultEnvelope` checks: all present; envelope binding equality
   (`work_order_id`, `context_pack_id`, `capability` match the issued order); **executor binding**
   (`workOrder.agent_id === invokedAgentId === result.agent_id`); `status ∈ {completed, failed}`;
   coherence (`completed` ⇒ output non-null ∧ error null; `failed` ⇒ output null ∧ error non-empty);
   `evidence` is an object; `verifiedAt ≤ deadline`. Returns `result_id = sha256('external-result:' +
   stableStringify({work_order_id, mission_id, task_id, attempt, agent_id, capability, context_pack_id,
   namespace}))`. Validation failure ⇒ `{valid:false, retryable:false}` — **never reaches canonical authority**.
6. **Canonical outcome**: `recordVerifiedResult` re-verifies, then calls the **injected**
   `eventRuntime.emit('WORKER_COMPLETED' | 'WORKER_FAILED', ...)` with `logical_id: result_id`,
   `correlation_id`, `causation_id`. The exterior process never receives the event runtime.
   ORCA's policy explicitly prohibits `fabricate-worker-success`, `envelope-secrets`,
   `envelope-extra-fields`, and `retry-validation-failure`.

### Result-semantics verdict: (a)+(b) YES, (c) PARTIAL, (d) NO

| Meaning | Carried? | Evidence |
|---|---|---|
| (a) worker returned bytes | **YES** | rendezvous record captures stdout/stderr/returncode; envelope carries `output` |
| (b) worker claims success | **YES** | self-reported `status: completed/failed`; coherence rules enforced on the claim |
| (c) execution completed | **PARTIAL** | dispatch metadata + returncode + atomic rendezvous evidence it ran; but "completed" is still the worker's assertion, independently corroborated only for process mechanics, not for semantic completion |
| (d) verified outcome | **NO** | verification is binding/identity/coherence only; `output` content truth is never examined (`evidence` must be an object, its contents unverified). The code is honest about this boundary — `verifyResultEnvelope` validates the *envelope*, and `recordVerifiedResult` records the *validated claim*, not a verified truth. |

The four meanings do **not** fully collapse: (d) is explicitly outside the envelope's authority.
ORCA's `REQUIRES_VERIFICATION` decision class exists precisely because the loop knows (d) is unproven.

### Status coherence

`verifyResultEnvelope` enforces a closed status algebra: only `completed`/`failed`; completed↔(output∧¬error),
failed↔(¬output∧error). Terminal result identity = `result_id` (bound to work_order_id + attempt +
capability + context). Mission-level terminal state (`ping_missions.status`) is updated separately by
`MissionRuntime.complete/fail` — the ORCA loop, not the adapter, is responsible for reconciling the two;
a verified `WORKER_COMPLETED` event does not auto-complete the mission row (reconciliation is loop logic).

---

## (f) Decision-ownership rows

| Decision | Owner (single) | File : function | Maturity |
|---|---|---|---|
| May work order W delegate capability C to agent A under constraints K? | ExternalAgentAdapter | `external_agent_adapter.js : authorizeWorkOrder` | PROVEN_INTEGRATION (orca loop) |
| May agent A invoke capability C against PING? (agent-initiated) | CapabilityAuthority | *claimed* `/app/gateway/capability_authority.js:230` — absent from all branches | COORDINATOR_CLAIMED / phantom in source |
| May source S emit into namespace N? | CanonicalizationService | `ping-runtime/canonicalization/canonicalization_service.js : authorizeNamespace` | per adapter comments; not directly audited |
| Which workers handle event E? (routing) | WorkerRuntime | `ping-runtime/workers/... : dispatch` (per adapter contract) | WIRED_UNPROVEN |
| What canonical event was accepted? | UnifiedEventRuntime | `ping-runtime/events/unified_event_runtime.js : emit/computeEventId` | PROVEN_RUNTIME (per program record) |
| Mission truth (create/claim/complete/fail/retry) | MissionRuntime | `ping-runtime/orchestration/mission_runtime.js` | PROVEN_INTEGRATION |
| Mission → worker routing | MissionScheduler | `mission_scheduler.js : _dispatch` via `MISSION_WORKER_MAP` | WIRED_UNPROVEN |
| Event → mission creation | EventToMissionBridge | `event_to_mission_bridge.js : _handleEvent` | WIRED_UNPROVEN |
| Objective identity + durable run state | objective-runtime | `orca/control-loop/objective-runtime.js : deriveObjectiveId/deriveWorkOrderId/atomicWrite` | PROVEN_INTEGRATION (orca loop) |
| Delegation decision class (auto/verify/approve/prohibit) | orca_policy | `orca/control-loop/policy/orca_policy.js` | PROVEN_INTEGRATION (orca loop) |
| Is this retrieval result trustworthy? | EvidenceAuthority | `ping-runtime/evidence/evidence_authority.js : verify` | PROVEN_INTEGRATION (gateway bootstrap) |
| Create lineage edge (pure) | LineageAuthority | `runtime/kernel/authorities/lineage_authority.js : createLineageEdge` | BUILT_NOT_LIVE (no callers) |
| Track causation chain (live) | LineageWorker | `canonical_workers.js : LineageWorker.handle` | WIRED_UNPROVEN |

---

## (g) Contradictions

- **C1 — CapabilityAuthority existence**: `capabilities/registry.yaml` says `missing_implementation`;
  adapter comments cite it as live at `/app/gateway/capability_authority.js:230`; the file exists in
  **zero** of five audited branches. The actual runtime gate is `authorizeWorkOrder` in the adapter.
- **C2 — work_order_id schemes**: three incompatible derivations — codex legacy
  `sha256('workorder:'+taskId)[0:16]`; orca caller-supplied 32–128 hex override;
  `objective-runtime.js` `sha256('work-order:'+objective_id+':'+task_key)` full hex. Legacy minter is
  task-scoped, not attempt-scoped (attempt only enters `result_id`).
- **C3 — mission identity schemes**: `MissionRuntime` `sha256(missionType:event_id)[0:16]`
  (content-derived, idempotent) vs ORCA `orca-loop:<objective_id12>:<taskKey>` (synthetic). Two
  identity regimes for "mission".
- **C4 — context_pack binding**: codex `ContextIntegration` compiles real packs via `ContextCompiler`;
  ORCA synthesizes `orca-context-<id>` with no compilation. The binding check passes either way —
  it verifies *equality*, not *provenance*.
- **C5 — orchestration models**: Temporal `mission_workflow.js` (capability-driven, stub, EXPERIMENTAL)
  vs ORCA control loop (objective-driven, live). Both claim the mission→execution path.
- **C6 — observation/claim dual planes**: python workers (`constitutional_runtime.py`) and JS canonical
  workers both handle DOCUMENT→OBSERVATION→CLAIM. Two implementations, one pipeline position.
- **C7 — mission taxonomy vs dispatch**: ~20 mission types in `MISSION_WORKER_MAP`, all but a few routed
  to the single `'observation'` worker.
- **C8 — lineage edge identity**: `timestamp` inside `generateId('lineage_edge', ...)` makes edge identity
  non-replayable (dead code, but the design error is real if revived).
- **C9 — "26/26 validated"**: `orca_policy.js` cites "7 LIVE profiles, validated 26/26" for the adapter;
  `validate_dispatcher_profiles.js` contains 3 `assert` calls (harness runs a profile round-trip, not 26 checks).
  The "26" count is unverified from source.
- **C10 — `capabilities/registry.yaml` authority claims**: lists owners under `runtime/kernel/...` for
  capabilities whose authorities are simultaneously marked `missing_implementation`/`fragmented`.

---

## (h) Unknowns

- U1: Does `/app/gateway/capability_authority.js` exist in the deployed gateway container? (Unverifiable
  from audited branches; the live claim cannot be confirmed or falsified here.)
- U2: Does the `lineage_edges` table exist in the live Postgres? (No writer in code; DDL unknown.)
- U3: Is `gateway/mission_authority_v2.js` (Phase 36A) wired into any live path? (Header read only.)
- U4: Which plane (python `constitutional_runtime.py` or JS `WorkerRuntime`) actually processes the
  production DOCUMENT→CLAIM pipeline? Both are wired; runtime trace needed.
- U5: Temporal `mission_activities.js` stub — is any Temporal worker process actually running?
- U6: `validate_dispatcher_profiles.js` — has it been executed green against the live profiles, and what
  does "26/26" count?
- U7: ORCA `PING_DATA_ROOT/objectives/` — has startup reconciliation ever fired after a real crash?
  (Evidence dirs exist for crash-window classification, but reconciliation is code-read only.)
- U8: `EvidenceAuthority` verify latency/availability impact on `HybridSearch` under load (wired, unmeasured).

---

## (i) Candidate deletions / merges

(Recommendations only — no action taken; read-only law.)

1. **Merge or retire `runtime/kernel/authorities/lineage_authority.js` + `gateway/lineage_authority.js` shim**:
   zero callers in all branches; the live lineage path is `LineageWorker`. If revived, fix C8 first.
   Candidate: PRESERVED_INACTIVE or delete after deadness proven per Rule of One.
2. **Delete or implement `runtime/kernel/identity/evidence.ts` `Evidence` interface**: zero implementers;
   phantom vocabulary.
3. **Resolve `IMissionAuthority`**: zero implementers; either implement or delete the interface.
4. **Consolidate the two observation/claim planes**: python (`observation_worker.py`, `claim_worker.py`)
   vs JS (`canonical_workers.js`) — pick one canonical plane per the Rule of One.
5. **Consolidate work_order_id derivation**: three schemes (C2) → one, owned by the adapter
   (`stableWorkOrderId` with explicit override is the strongest shape).
6. **Consolidate mission identity**: content-derived `MissionRuntime` scheme vs synthetic ORCA scheme (C3);
   decide which is canonical for `mission_id`.
7. **Retire or wire Temporal mission path**: stub `mission_activities.js` vs live ORCA loop (C5) —
   the stub claims "will be wired during integration"; until then it is misleading surface.
8. **Reconcile `gateway/mission_authority.js` (Ω.70) and `mission_authority_v2.js` (Phase 36A)** with
   `MissionRuntime`: three mission models; convergence has one authority per decision — mission truth is
   `MissionRuntime`; the other two need classification (LEGACY_INGRESS / PRESERVED_INACTIVE / delete).
9. **Fix `capabilities/registry.yaml` or the code**: it simultaneously declares `CapabilityAuthority`
   missing and lists it as an authority owner (C1/C10). Either implement it or remove the claim and
   record `ExternalAgentAdapter.authorizeWorkOrder` as the de facto authority.

---

## (j) Top-5 highest-confidence improvements

1. **Add DAG-legality to the live lineage path.** `LineageWorker` accepts any `causation_id` with no
   cycle/topology check, and the dead `LineageAuthority` has none either. A `causation_id` validator
   (reject self-parent, detect cycles via bounded chain walk in `ping_events`) is cheap, reversible,
   and closes a silent-corruption class. Confidence: HIGH (defect proven by code read).
2. **Make `ResultEnvelope` verification the single choke point and prove it.** It already is the
   de facto choke point (`retryable:false`, never reaches canonical authority on failure). Add a
   machine-checkable assertion suite for the status algebra (completed↔output∧¬error, executor binding,
   deadline) and run it in CI — the "26/26" claim needs a real harness (C9). Confidence: HIGH.
3. **Collapse the observation/claim dual plane.** Two wired implementations of DOCUMENT→OBSERVATION→CLAIM
   is a Rule-of-One violation with real divergence risk (different tables, different event names
   `OBSERVATION_CREATED` vs `OBSERVATION_CREATE`). Choose one, archive the other. Confidence: HIGH.
4. **Promote `authorizeWorkOrder` to the documented capability authority and kill the phantom.**
   The code already treats the adapter as the sole decision owner; `capabilities/registry.yaml` and the
   `/app/gateway/capability_authority.js` comments should be updated to say so, or the real
   `CapabilityAuthority` should be produced. Phantom authorities are how bypasses hide. Confidence: HIGH.
5. **Reconcile mission identity and work_order identity to one scheme each.** C2/C3 are live
   incompatibilities, not cosmetic: replay, dedup (`ON CONFLICT`), and cross-branch result correlation
   all key on these IDs. Freeze one derivation per identity, record it in a contract doc next to the
   existing `CANONICAL-TRACE-CONTRACT-001.md`, and add a failing-first test that pins it. Confidence: HIGH.

---

*Read-only recon complete. No files modified in any repo. Single writable artifact: this file.*
