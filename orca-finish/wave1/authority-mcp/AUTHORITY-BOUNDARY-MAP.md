# AUTHORITY-BOUNDARY-MAP — ORCA FINISH Wave 1, Lane C4

Repo: `/home/nolan/ping` @ `cc6856c3bc78e0535e66f168c66dc31abee2c073` (branch `refactor/runtime-authority-convergence`, read-only inspection 2026-09-23).
Scope: where authorization decisions are ACTUALLY made vs dormant, and the MCP/tool boundary.

## The live execution path (ground truth)

`gateway/server.js` -> `gateway/bootstrap/gateway_runtime.js` wires exactly this:

```
UnifiedEventRuntime (eventGovernance injected, gateway_runtime.js:225-226,433-436)
  -> MissionRuntime (ping_missions / ping_events tables)
  -> WorkerRuntime.dispatch() (eventTypes matching, NO timeout, NO authz)
  -> 8 canonical workers (IntelligenceWorker dormant)
  -> MissionScheduler._dispatch() (poll 5s, MISSION_WORKER_MAP label + lease/DLQ)
```

Nothing else in the repo is reachable from this bootstrap. Everything below is classified against THIS path.

## Sovereignty table

| # | Authority / boundary | File (repo-relative) | Live callers | LIVE / DORMANT / BYPASSED | Classification | What breaks if bypassed / removed |
|---|---|---|---|---|---|---|
| 1 | EventGovernance.validateEvent | `ping-runtime/events/event_governance.js:152` | UnifiedEventRuntime.emit() (gateway_runtime.js:433-436 injects it) | **LIVE** | **SOVEREIGN** (sole pre-execution validation gate) | Unregistered event types, owner mismatches, invalid namespaces would emit unchecked. LIMITS: owner check only fires when `authority_owner` is set; `options._skipGovernance` bypass exists; validates event metadata, never execution authorization. |
| 2 | WitnessWorker failure-honesty gate | `ping-runtime/workers/canonical_workers.js:451` | WorkerRuntime.dispatch (WITNESS_CREATE missions) | **LIVE** | **SOVEREIGN** (worker-inline decision) | Unverified replays could be attested. NOTE: attestation id is inline (`witness-`+event_id slice), not owned by any Witness authority module. |
| 3 | MissionScheduler routing (MISSION_WORKER_MAP + eventTypes match) | `ping-runtime/orchestration/mission_scheduler.js`, `ping-runtime/workers/worker_runtime.js` | live dispatch path | **LIVE** | **ROUTING, not authorization** (explicit doc-contract in file: "LABELING / ASSIGNMENT metadata ONLY ... NOT an execution-routing decider") | Misroute/skip/duplicate dispatch; NOT a security boundary and must never be treated as one. |
| 4 | CapabilityAuthority (kernel) | `runtime/kernel/capabilities/capability-authority.ts` (+ interface) | **zero callers** (grep: only its own two files) | **DORMANT** | **DECLARED-DORMANT** | Nothing today; but declared sovereignty is false: the interface has register/resolve/list and NO authorize/can-execute method at all. Even wired, it could not gate execution. |
| 5 | CapabilityResolver (live one) | `ping-runtime/runtime/capability_resolver.js` | gateway_runtime (load only); runtime_fingerprint, constitution/ops routes | **LIVE as index, DORMANT as gate** | **DECLARED-DORMANT** (as gate) | `resolve()` is never called on any execution path; capability declarations are hashed for fingerprinting only. No "may execute" decision exists. |
| 6 | ApprovalAuthority | `gateway/approval_authority.js` (378 lines) | **zero callers** | **DORMANT** | **DECLARED-DORMANT** | Nothing today. Even if wired, the gate is vacuous (see Approval analysis below). Owns DDL for `approvals`, `approval_policies`. |
| 7 | EffectAuthority / BusinessActionAuthority | `ping-runtime/approval/effect_authority.js`, `business_action_authority.js` | **zero callers** outside the dir (tests only) | **DORMANT** | **DECLARED-DORMANT** | Nothing today. No proposal-digest binding exists in the code (see below). |
| 8 | CommitAuthority | `gateway/commit_authority.js` (307 lines) | **zero runtime callers** (only string labels in generate_*.js) | **DORMANT** | **DECLARED-DORMANT** | Nothing today. `commitPatch` contains NO approval check; wiring it as-is would authorize-by-construction. |
| 9 | PatchAuthority / PatchAuthorityV2 | `gateway/patch_authority.js` (626), `gateway/patch_authority_v2.js` (781) | **zero runtime callers** | **DORMANT** | **DECLARED-DORMANT**; v1/v2 overlap unverified, candidate **DUPLICATE** | Nothing today. Two parallel implementations of the same named authority. |
| 10 | MissionExecutionAuthority | `gateway/mission_execution_authority.js` (457) | **zero callers** | **DORMANT** | **DECLARED-DORMANT** | Nothing today. Its documented Phase-15 pipeline includes Approval and Commit stages but it is never instantiated. |
| 11 | AuthorityContainer | `gateway/authority_container.js` | **zero callers** | **DORMANT** | **DECLARED-DORMANT** | DI container with no registrations; dead. |
| 12 | constitutional_authority_registry | `gateway/constitutional_authority_registry.js` (442) | only `constitutional_bootstrap.js` + verify scripts | **DORMANT** on live path | **DECLARED-DORMANT** | Registry descriptors with no live consumer. |
| 13 | IdentityAuthority | `ping-runtime/authorities/identity_authority.js` (extends kernel `runtime/kernel/authorities/identity_authority.js`) | none on live identity paths | **BYPASSED** | **BYPASSED** (confirms 2026-09-17 forensic) | Live identities minted inline: `unified_event_runtime.js:83` (crypto sha256 inline), `mission_runtime.js` create() (inline `require('crypto')` in function body), `execution/event_queue.js` (inline hash). Declared identity owner does not own live identity. |
| 14 | DeterministicIdAuthority | `ping-runtime/authorities/deterministic_id_authority.js` | only workflow_identity_authority.js | **DORMANT** | **DECLARED-DORMANT** | Nothing today; second identity authority with no live ownership (competes with #13 by name). |
| 15 | FilesystemAuthority | `gateway/filesystem_authority.js` | only test/corpus files | **DORMANT** | **DECLARED-DORMANT / MISNOMER** | It is a repo file-scan cache (`compile(repoId, repositoryPath)`), NOT an fs-access gate. `worker_registry.js:26` comment admits: "Direct fs.read/write -- should route through FilesystemAuthority" (aspirational). All fs access in the repo is UNGATED; there is no fs-access authority to bypass. |
| 16 | WorkspaceRegistry | (not found) | n/a | **ABSENT** | **PHANTOM** | Zero matches for WorkspaceRegistry/workspace_registry in code, JSON, or docs. Prior fact "exists as named authority" is not verifiable on this branch. Needs reconciliation. |
| 17 | witnessAuthority singleton | `gateway/witness_authority.js` | only the dormant cluster (#6, #8, #10) | **DORMANT** | **DECLARED-DORMANT** | Live WitnessWorker (#2) builds attestations inline and never touches it. |
| 18 | Replay (KernelReplayExecutionProvider) | `gateway/kernel_replay_execution_provider.js` | wired into ReplayWorker via gateway_runtime | **LIVE** | **SOVEREIGN-as-verifier, not as gate** | Replay verification results feed the WitnessWorker honesty gate (#2). It is an execution provider, not an authorization decider. |
| 19 | Lineage | `LINEAGE_CREATE` -> lineage worker (live dispatch); `runtime/kernel/authorities/lineage_authority.js` | worker live; module wiring unverified | **PARTIAL** | **WORKER-LIVE / MODULE-UNVERIFIED** | Lineage events flow; whether the named LineageAuthority module owns anything on the live path was not verified in this pass. |
| 20 | ProposalPipeline | `ping-runtime/orchestration/proposal_pipeline.js` | **zero callers** | **DORMANT** | **DECLARED-DORMANT** | File-based proposal stage tracker; has NO approval stage. Unrelated to the finish-criteria proposal. |
| 21 | MergeGate | `ping-runtime/orchestration/merge_gate.js` (197) | ExecutionEngine stack only (not live) | **DORMANT** | **DECLARED-DORMANT** | Contains ZERO references to approval. The merge path it guards is itself unwired. |
| 22 | ExecutionEngine stack (engine.js, worker_port.js, event_queue.js) | `ping-runtime/orchestration/execution/` | `orchestration/index.js` demo entry only | **DORMANT** | **DECLARED-DORMANT** | Notably this dormant stack HAS the governed EventQueue; the live path uses UnifiedEventRuntime instead. `WorkerPort.execute` has no timeout and no authz, same as live WorkerRuntime.dispatch. |

## Approval-binding analysis: what binds approval to the exact proposal today?

**On the live path: nothing.** The MissionScheduler/WorkerRuntime path has no approval concept at all. AGENT DECIDED == ACTION AUTHORIZED by construction: any dispatched mission whose worker returns non-failed completes.

**In the dormant cluster, two competing schemes, both broken:**

A. `gateway/approval_authority.js` — approvals bind to `patch_id` only. Binding fields: `(approval_id, patch_id, approval_policy, approval_status, approval_conditions, witness_hash, approved_by, approved_at)`. There is NO principal, NO proposal digest, NO operation, NO arguments, NO target beyond the patch, NO scope, NO preconditions, NO expiration field. Worse, the gate is vacuous even as written:
- `_determineApprovalPolicy` hardcodes the `automatic` policy ("Default to automatic policy for now")
- `_evaluateApprovalConditions`: `tests_passed: testResults.passed || true`, `replay_matched: replayResult.matches_original || true`, `witness_verified: true` — three of four conditions can never fail
- automatic policy -> status `approved`, `approved_by: 'system'`

B. `ping-runtime/approval/business_action_authority.js` + `effect_authority.js` — the closer match to the finish criteria, but:
- `proposeAction({missionId, capability, targetIdentity, preview, reason, evidence, risk, expirationSeconds})` — **no operation arguments, no scope, no preconditions, no principal**. The proposal is (mission, capability-name, target-identity-string) only.
- `action_id = 'action_' + hash(mission_id, capability, target_identity)` — deterministic on exactly those three fields. A changed proposal (different arguments, different preview) yields the SAME id: **changed proposal is NOT stale**, it is invisible.
- `approveAction` checks only status==PENDING_HUMAN and expiry. It does not re-verify any digest (there is none) and records `decided_by` as free text.
- `EffectAuthority.createEffect({proposedActionId, approvalId, ...})` stores the ids as opaque strings; it **never verifies the approval exists, is approved, unexpired, or matches the proposal**. It marks status `'AUTHORIZED'` unconditionally. Effect id = `hash(capability.toUpperCase(), targetIdentity, capability.split('.')[1] || 'execute')` — **no arguments in the idempotency key**, so two different proposed actions on the same capability+target collide to one effect id.
- Zero callers: the entire scheme is dead code plus two test files.

**`approvals`, `approval_policies`, `mission_executions` tables:** DDL exists (`approval_authority._createTables`, `migration_engine` migration 009). The live `MissionRuntime` writes `ping_missions`/`ping_events` and never touches these tables. The only writer to `mission_executions` is `gateway/repositories/execution_repository.js`, which is itself only referenced inside the dormant gateway cluster.

## MCP / tool transport analysis

**There is no MCP transport.** Findings:

1. `MCPReference` is a branded string type only (`runtime/kernel/capabilities/capability.ts:78`, `runtime/kernel/identity/typed-references.ts:49`). Capability declarations carry a `requiredMCP` field; nothing consumes it. No MCP client, no tool discovery, no `tools/list` or `tools/call` equivalent exists anywhere in the repo.
2. **Tool invocation does not exist as a layer.** The closest execution surfaces:
   - `WorkerRuntime.dispatch(event)` (`ping-runtime/workers/worker_runtime.js:77`): matches workers on `eventTypes`, calls `worker.handle(event)` directly. No timeout wrapper (a hung worker hangs dispatch; the lease reaper is the only recovery), no authorization check, no capability check. Worker `capabilities: []` metadata is recorded at register time and never consulted.
   - `WorkerPort.execute(mission, context)` (`execution/worker_port.js:113`, dormant stack): calls `this._executor(mission, context)` directly. No timeout, no authz.
   - `MissionScheduler._dispatch`: the only "decisions" are lease/assignment/DLQ mechanics; authorization is absent by design gap, not by delegation.
3. **No shell/tool execution in live workers.** `child_process`/`execSync`/`spawn` do not appear in `ping-runtime/workers/` or the scheduler. Consequential external effects available to the live path today: Postgres writes via the pool, event emissions, HTTP fetch (Ollama provider, gateway polling), file writes via ungated `fs`.
4. **Result capture:** dispatch returns `worker.handle(event)` result; MissionScheduler completes the mission on any non-failed result, fails on throw or `status:'failed'`, DLQ on retry exhaustion. No result schema validation, no secret redaction pass observed on results.
5. **Secrets:** `CapabilityResolver.resolve()` (dormant-as-gate) checks `required_secrets` is a declared array, but nothing on the live path enforces secret scoping per tool/call. The connector CapabilityRegistry (`ping-runtime/connectors/capability_registry.js`) registers providers with OAuth, but it is a provider registry, not a per-call authorization boundary.
6. Net: the finish-criteria chain `RUN -> WORK PACKET -> ATTEMPT -> CAPABILITY -> MCP TOOL -> REQUEST -> EFFECT -> RESULT/RECEIPT -> CHECKPOINT` has **no implementation**. Work packets, attempts, capability grants, tool requests, effects, and receipts do not exist as runtime concepts. The live chain is `MISSION -> EVENT -> WORKER.handle -> RESULT -> COMPLETE`.

## One-sovereign-mechanism check

- **Identity:** VIOLATED. Declared: IdentityAuthority (+DeterministicIdAuthority). Actual: inline crypto at three live sites. No single owner.
- **Event:** HELD (with caveats). EventGovernance via UnifiedEventRuntime.emit is the single choke point, and gateway_runtime injects it. Caveats: `_skipGovernance` opt-out, owner check conditional on `authority_owner` presence.
- **Mission:** HELD weakly. MissionRuntime owns `ping_missions` lifecycle; but MissionExecutionAuthority (dormant) claims the same "mission execution" name without owning anything.
- **Capability:** VIOLATED. Three claimants, zero gates: kernel CapabilityAuthority (dormant, no authorize method), ping-runtime CapabilityResolver (live index, no gate), connectors CapabilityRegistry (provider registry). Nothing answers "may X execute capability Y now".
- **Workspace:** ABSENT. No WorkspaceRegistry exists; no workspace ownership concept in code.
- **Filesystem:** ABSENT. No access gate exists; the named FilesystemAuthority is a file cache.
- **Commit/Patch:** VIOLATED by dormancy. CommitAuthority/PatchAuthority(+v2)/ApprovalAuthority/MissionExecutionAuthority form a dormant cluster that claims the commit pipeline while zero live code routes through it; the only real commits happen outside the repo's control entirely.
- **Replay:** HELD as mechanism (kernel provider -> ReplayWorker -> WitnessWorker honesty gate), but Replay is not an authority with a single declared owner on the live path.
- **Witness:** VIOLATED. Declared: witnessAuthority singleton. Actual: inline attestation construction in WitnessWorker.
- **Lineage:** UNVERIFIED (worker live, module wiring not traced in this pass).

## Dirty working tree note (read-only observation)

17 dirty entries are all untracked dirs/files except 4 modified: `gateway/package*.json` (dependency churn), `ping-runtime/orchestration/execution/capability_registry.json` (only a `registeredAt` timestamp re-stamp, 2026-07-29 -> 2026-09-21; no semantic change), `tools/fyd-site-projection/dump.py`. Untracked `dormant_classifications/` contains per-module JSON (appears to be another lane's/pass's classification output; not evaluated here). Nothing in the dirty set changes the live/dormant map above.
