# Primitives Inventory (merged kernel + product), 2026-09-25

Two read-only sweeps, nothing written in either repo. This document merges them.

- Kernel sweep: `/home/nolan/ping` (layers: `runtime/kernel/` canonical TS/JS, `ping-runtime/` authorities + orchestration, `gateway/` routes/providers/Phase authorities).
- Product sweep: `/home/nolan/projects/ping`, branch `fyd/sprint-integration-2026-09-24`.
- Product layer does NOT import kernel code at runtime. Coupling is by file path (`/home/nolan/ping/var/fyd-projections/` dumps read by `src/fyd/data/ping-object-source.ts` and `src/fyd/lineage/tracer.ts`) plus documented harvests re-implemented as dependency-free pure functions.

Nolan's candidate list has 30 primitives. Status per primitive:

EARNED (canonical implementation exists in current flows): Object, Relationship, Evidence, Capability, Proposal, Approval, Effect, Receipt, Projection. HOLD exists twice (canonical advisory + ORCA competing; see orca-hold-harvest.md).

| Primitive | Kernel canonical | Product canonical | Duplicates / competes | Verdict |
|---|---|---|---|---|
| IDENTITY | `runtime/kernel/authorities/identity_authority.js` (`{type}_{hash16}`; `ping-runtime/` shim re-exports) | `src/fyd/identity/` OIDC principal (`uuidv5` provider+issuer+sub; email never canonical); demo-owner identity (explicitly unverified); social dev identity | kernel: deprecated `deterministic_id_authority`, `runtime_identity_authority`, `replay_identity_authority`, Ed25519 `ping-identity.ts`. Product: three shapes explicitly scoped | Kernel needs one canonical; product's three are deliberately separate mechanisms |
| OBJECT | `ping-runtime/canonicalization/canonical_object.js` (immutable envelope; docstring lists ~15 consolidated impls) | `src/lib/ping/types.ts` `PingObject`; `src/fyd/object/object-projection.ts` | kernel: ~9 gateway object files named in consolidation list (files still exist) | One canonical each; kernel still carries dead files |
| RELATIONSHIP | `gateway/relationship_runtime.js` (Milestone 5; CALLS/IMPLEMENTS/DEPENDS_ON/DERIVED_FROM/USES/OWNS) | `PingRelationship` (`src/lib/ping/types.ts`); follows store `src/fyd/object/follows.ts` + journaled social actions `src/fyd/social/actions.ts` | kernel: `relationship_objects.js`, `knowledge_graph.js`, `witness_relationship_prover.js`, neo4j vs PG edges. Product: two follow stores (demo-local JSON vs RELATIONSHIP_CREATED events) = genuine duplicate surface | Reconcile product follow stores; kernel edges need one store decision |
| OBSERVATION | TWO competing: root `observation_worker.py` vs `ObservationWorker` in `ping-runtime/workers/canonical_workers.js` | folded into graph nodes (provenance/evidenceRef); no standalone Observation type | kernel py+js workers are an open double | One kernel worker must win; product folds it into evidence (justified) |
| EVIDENCE | `ping-runtime/evidence/evidence_authority.js` (accumulate/verify/rank; ADD-only over ping_events; `(core\|tenant)::` namespace) | `src/fyd/ui/evidence-state.tsx` + `src/fyd/object/why-this-steps.ts` + builder verifier | kernel twin `runtime/kernel/identity/evidence.ts` | Earned; one interface exists in TS kernel |
| CLAIM | ClaimWorker in `canonical_workers.js` (CLAIM_GENERATE -> CLAIM_CREATED; unverified-model output "is a claim, not evidence, and is refused") + `ping-runtime/jev/typed_decision.js` (ACCEPT_CLAIM/REJECT_CLAIM/NEEDS_MORE_EVIDENCE; Jev shadow-only, zero execution authority) | `src/fyd/claim/` (pure state machine observed->claimed->verified-controlled; store; verification seam; claim-projection; DEMO_CONTEXT_IDS can never be claimed) | none | Earned; no competing authority file in either layer |
| TRANSITION | `ping-runtime/runtime/state_machine_executor.js` (deterministic; illegal transitions rejected) | `src/fyd/proceduralize/patch.ts` (SiteIntent -> digest-bound SitePatch; propose/apply) | kernel: 4 state machine variants (worker_state_machine, 2 replay_state_machine, mission lifecycle in mission_runtime) | Earned via SitePatch; kernel has 4 machines worth consolidating |
| CAPABILITY | `ping-runtime/runtime/capability_resolver.js` (loads `gateway/generated/capability_registry.json`; throws if missing) | three layers: `src/lib/ping/grants.ts` (user grants), `src/fyd/ask/capabilities.ts` (agent boundary, FORBIDDEN_AGENT_EFFECTS), `src/fyd/capabilities/runtime.ts` (portal Circle) | kernel: 3 registry JSON copies + `tenant_capability_grant.js` (grant validation, break-glass max 15 min). Product: deliberately split by surface | One live kernel registry needed; product split is by design |
| POLICY | FRAGMENTS only: `gateway/policy_ir.js`, `gateway/compilation_policy.js`, `ping-runtime/runtime/analytics_policy.js` | domain-specific (visibility-policy, field-visibility, consequence tiers); no generic Policy type | retry policies scattered (`gateway/retry_authority.js` unwired; mission backoff columns) | NOT earned as a generic primitive; current flows justify consequence classification only |
| ACTION | `ping-runtime/approval/business_action_authority.js` (proposeAction -> PENDING_HUMAN; `action_` IDs) — no callers outside tests | `src/fyd/object/commands.ts` (OwnerCommand; interpretTextCommand deterministic); `src/lib/ping/action-planner.ts` (PlannedAction) | none | Earned in product; kernel action authority is unwired |
| APPROVAL | TWO competing: `gateway/approval_authority.js` (Phase 20 git-commit gate) vs `ping-runtime/approval/business_action_authority.js` (generic human gate). `orca_approval.js` confirmed nonexistent | `src/fyd/customize/write-boundary.ts` (idempotent approve; request_id; same id+digest=replay, different digest=409; UNKNOWN surfaced never fabricated) + consequence-classification friction tiers + attestation gates | kernel pair are unwired in live path; product converges on write-boundary | Earned; harvest candidate: kernel approval is unwired, product's write-boundary is the live semantic |
| EFFECT | `ping-runtime/approval/effect_authority.js` (canonical `effect_` + hash16 identity; AUTHORIZED status; attempt tracking) — no callers outside tests | journal gateway POST /events + `emitOverlayEvent` (only mutation channel); social actions via signed envelope | none | Earned; product flow is the live one |
| RECEIPT | ABSENT as execution primitive. Only a privacy receipt in `ping-runtime/feedback/feedback_contract.js` | per-domain receipt shapes (projection receipt, ClaimEvidence receipt, journal event_id receipt, write-boundary ledger, consequence audit receipt). NO unified Receipt type | — | Justified-by-flows only; unified RECEIPT not yet earned |
| PROJECTION | TS interface only: `runtime/kernel/projection/projection-authority-interface.ts` (no JS implementation found) | `src/fyd/sitespec/public-projection.ts` (THE single public boundary: verify -> owner corrections -> visibility -> hide traversal cuts -> versioned projection receipt) + `tools/fyd-site-projection/dump.py` (byte-deterministic; digest verified by consumer) | kernel: `gateway/projection_executor.js`, two projection registries, qdrant_projection_worker.py | Earned; kernel has interface with no live implementation |
| RUN | mission executions in `mission_runtime.js` (doc: replaces 12 dead mission implementations); `WorkerRuntime.dispatch()` single execution decider | n/a (product has no run primitive; site builds are artifacts) | — | Earned in kernel |
| TASK | ABSENT. No TaskAuthority, task registry, or task files. Work units are missions; closest analogues are Temporal activities | n/a | — | NOT earned; do not invent |
| CHECKPOINT | `gateway/checkpoint_authority.js` (Phase 12) — appears unwired | n/a | `checkpoint_repository.js`, `lifecycle_checkpoint.sql` | NOT earned in live path |
| ARTIFACT | `gateway/artifact_authority.js` (Phase 45.5 pure artifact contract) | `src/fyd/media/` (ingest SSRF-gated, digests, derivatives; preview runs structurally incapable of becoming production truth) + projection dumps (derivable cache) | kernel: artifact_store, artifact_authorities, artifact_router, builder, repository_port, type_registry | Earned via media pipeline; kernel artifact has 6 competing files |
| TENANT | `ping-runtime/runtime/tenant_registry.js` (`tenant://{id}` URIs); enforcement in mission_runtime (requireMissionTenantId throws), unified_event_runtime (immutable partition key), evidence namespace regex | `src/fyd/tenant/tenant-context.ts` (tenant id == site id; TENANT_ID_PATTERN; rejections THROWN); `scoped-stores.ts` only sanctioned I/O path; full lane test battery a-h | kernel tenant worktree stripping was quarantined (Decision 1) | Earned; kernel enforcement surfaces are real, but gateway identity is caller-asserted (Decision 4: fix before second tenant via Request -> Authenticated Principal -> Tenant Context -> Capability Context -> Handler) |
| VISIBILITY | ABSENT as authority. Convention: `replay_visibility` field + `(core\|tenant)::` namespace scoping | `src/fyd/owner-mode/visibility-policy.ts` + `src/fyd/sitespec/field-visibility.ts` (fact -> field -> projection layering; hidden facts ABSENT not redacted) | — | Earned in product; kernel has only conventions |
| SECRET | ABSENT. Only `required_secrets` declarations validated by CapabilityResolver | n/a | — | NOT earned; unknown where secrets actually live |
| BUDGET | ABSENT as enforcement. Only detection: BUDGET_OVERRUN_DETECTED watcher -> mission | n/a | — | NOT earned |
| LIMIT | ABSENT as authority. Scattered conventions (embedding_batcher batchSize 10 / 100ms; retry_policy error classes) | n/a | — | NOT earned |
| LOCK | `gateway/advisory_lock.js` (pg advisory locks; "Redis/thread mutexes prohibited") — ZERO callers. Fail-open risk if a caller ignored the return; there is no caller | n/a | — | A lock nobody takes. Do not harvest until a real flow needs it |
| LEASE | Live: `MissionRuntime.reapExpiredLeases()` + `reclaimRetryPending()`; `ping_missions.lease_until`. TS interface exists, no JS impl | n/a | — | Earned. Known open gap: reaper-vs-HOLD (HOLD mission re-dispatched ~60s later; Decision 3 WIP proposes row-visible HOLD; needs Nolan's word) |
| RETRY | Live: `reclaimRetryPending()` backoff-gated; every attempt counted; retry_pending never dispatched directly (F-01) | idempotent approve + journal request_id dedupe (convergent retries) | `gateway/retry_authority.js` unwired legacy | Earned in kernel runtime |
| SCHEDULE | `ping-runtime/orchestration/mission_scheduler.js` (5s poll; MISSION_WORKER_MAP labeling only; stuck-running watchdog emits HOLD never FAILED) | n/a | 4 competing schedulers (execution/scheduler.js, temporal_scheduler_provider, dependency_scheduler, replay_scheduler, capability_scheduler) | Earned via mission_scheduler; 4 others look dormant |
| HOLD | canonical: advisory HOLD reconciliation records (`mission_scheduler.js`, `mission_runtime.js`); stuck-running watchdog emits HOLD; unknown dispatch outcome -> HOLD record never FAILED | n/a | ORCA competing implementation quarantined as analysis (Decision 2); post-effect WIP stashed (Decision 3) | TWO canonicals-adjacent; Decision 2 recommends MissionRuntime/MissionScheduler as owner with ORCA classifier/tests harvested |
| CANCEL | ABSENT for missions. Only `temporal_scheduler_provider.cancel(jobId)` for scheduler jobs | n/a | — | NOT earned |
| RESUME | ABSENT as authority. Mechanisms: checkpoint restoreCheckpoint(); mission retry_pending -> created re-entry | n/a | — | NOT earned |

## Harvest candidates (two real flows demand it)

1. **Kernel observation worker double**: `observation_worker.py` vs `ObservationWorker` in `canonical_workers.js`. Two implementations independently exercise the same capability (DOCUMENT_IMPORT -> OBSERVATION_CREATED). Consolidate to one; preserve nothing else pending behavior diff.
2. **Kernel approval pair**: `gateway/approval_authority.js` (git-commit gate) vs `ping-runtime/approval/business_action_authority.js` (generic human gate). Both unwired. The live semantic is the product `write-boundary.ts` approve flow. Decide one owner before wiring anything.
3. **Product follow stores**: demo-local `data/fyd-follows/local.json` (`src/fyd/object/follows.ts`) vs journaled `RELATIONSHIP_CREATED` social actions (`src/fyd/social/actions.ts`). Code acknowledges the demo store "proves the relationship shape". One must become the relationship writer.
4. **Kernel identity set**: canonical `identity_authority` vs deprecated `deterministic_id_authority` (warns on use) vs `workflow_identity_authority` built on the deprecated one. Remove the deprecated path and re-home workflow identity.
5. **Capability registry copies**: `gateway/generated/capability_registry.json` (live) vs `gateway/CapabilityRegistry.json` vs `ping-runtime/orchestration/CapabilityRegistry.json`. One live file.
6. **State machine variants**: 4 kernel state machines; mission lifecycle inside `mission_runtime.js` is the live one.
7. **Kernel artifact files**: 6 competing files; `gateway/artifact_authority.js` Phase 45.5 pure contract is the cleanest claim but appears unwired.

## Unwired authorities (exist in code, absent from live PING Core v1 path)

`advisory_lock.js`, `retry_authority.js`, `checkpoint_authority.js`, `effect_authority.js`, `business_action_authority.js`, `approval_authority.js`. Not in `gateway/bootstrap/wiring.js` or `gateway_runtime.js`. Do not wire on speculation; each needs a real flow demanding it before it earns a place. AdvisoryLock with zero callers is the sharpest case.

## Absent primitives (no implementation found; do not build from imagination)

TASK, RECEIPT (execution), SECRET/VAULT, BUDGET (enforcement), LIMIT (centralized), CANCEL (mission-level), RESUME, VISIBILITY authority (kernel), POLICY authority. Current flows do not demand them.

## New code avoided

This lane wrote zero production code. All outputs are notes and quarantines: tenant tag + warning note, ORCA harvest analysis, WIP stash + diff + analysis + semantic proposal, gateway tenancy audit, two inventory reports, this document. No commits to either repo, no branch deletions, no destructive resets.

## Companion notes

- `~/workspace/sprint-2026-09-24/orca-hold-harvest.md` (Decision 2)
- `~/workspace/sprint-2026-09-24/post-effect-hold-wip-2026-09-25.diff` + `post-effect-hold-analysis-2026-09-25.md` (Decision 3)
- `~/workspace/sprint-2026-09-24/gateway-tenancy-audit-2026-09-25.md` (Decision 4)
- `~/workspace/sprint-2026-09-24/post-effect-hold-quarantine-stash.txt` (stash ref)
