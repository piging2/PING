# LANE 14 raw notes: PING orca-adapter external_agent_adapter.js (read 2026-09-28 ~14:35 MDT)

Source: /home/nolan/workspace/orca-adapter/vendor/external_agent_adapter.js (428 lines, git 9652896 in that tree).
Related: /home/nolan/workspace/orca-adapter/adapter.js (dispatchExecution), /home/nolan/workspace/multi-runtime-workorder-contract.md (v1.0.0-draft, 2026-09-18),
/home/nolan/projects/ping/src/app/api/mc/dispatch/route.ts + src/app/api/mc/_lib/mc-dispatch.ts (Mission Control dispatch, lane D).

## authorizeWorkOrder({agentId, capability, namespace, constraints})
Returns {granted:true} or {granted:false, reason}. Fail-closed. Checks in order:
1. profile = AGENT_PROFILES[agentId]; unknown agentId -> DENY ("Unknown exterior agent")
2. profile.blockedExternal -> DENY unless blockedUntil is in the past
3. profile.status === 'PENDING_AUTH' -> DENY
4. capability not in profile.allowedCapabilities -> DENY
5. namespace must match /^(core|tenant)::[a-z0-9_.-]+$/ -> else DENY
6. constraints must be a non-array object -> else DENY
7. Constraints may only TIGHTEN profile.maxConstraints: for every key where max is true, constraints[key] must be true
8. Hard-required: constraints.no_canonical_events === true AND constraints.no_mission_state_writes === true

AGENT_PROFILES entries observed: hermes (LIVE, fixture.read/text.transform/text.summarize),
codex (blockedExternal, ChatGPT plan quota), opencode (allowedCapabilities: []), cloud-subagent (LIVE),
ollama (LIVE), identity_1..identity_4 (LIVE, copilot broker). Transport strings are data.

## issueWorkOrder({agentId, capability, namespace, taskId, missionId, correlationId, contextPackId, input, constraints, resultPath, deadline, causationId, attempt=1})
Throws WORK_ORDER_DENIED on auth denial or on: taskId/missionId/correlationId/contextPackId/resultPath/deadline not non-empty strings;
input not a non-array object; deadline not parseable ISO; attempt not positive integer.
Envelope fields: work_order_id (sha256('workorder:'+taskId)[0:16]), agent_id, mission_id, task_id,
correlation_id, context_pack_id, causation_id (or null), attempt, principal ('ping:external-agent-adapter' constant),
namespace, capability, input, constraints, result_path, deadline.

## verifyResultEnvelope(result, workOrder, {invokedAgentId, verifiedAt})
Required result fields: work_order_id, context_pack_id, agent_id, capability, status, output, evidence, error.
Bindings: result.work_order_id == workOrder.work_order_id; result.context_pack_id == workOrder.context_pack_id;
workOrder.agent_id == invokedAgentId == result.agent_id (three-way executor binding);
result.capability == workOrder.capability. status in {completed, failed}.
completed: output non-null AND error null. failed: output null AND error non-empty string.
evidence must be an object. verifiedAt required ISO and <= deadline. Any failure -> {valid:false, reason, retryable:false}.
result_id = sha256('external-result:' + stableStringify({work_order_id, mission_id, task_id, attempt, agent_id, capability, context_pack_id, namespace})).

## recordVerifiedResult({eventRuntime, result, workOrder, invokedAgentId, verifiedAt, effectState})
Emits WORKER_COMPLETED/WORKER_FAILED through injected canonical event runtime with namespace, logical_id=result_id,
correlation_id, causation_id, metadata.effect_state = effectState || 'effect_unknown'. Comment: "A verified completion
is recorded effect_unknown, never clean success (worker self-report is a claim, not verification, O5)."
Event identity owned by UnifiedEventRuntime.computeEventId (adapter holds none).

## dispatchExecution (adapter.js) observed dispatch path
1. Identity fence: identity_5..10 DENIED (Nolan 2026-09-25 containment).
2. authorizeWorkOrder (vendored). Denial typed: authorization_refusal, refusal_source capability-authority.
2b. Tenant threaded from scheduler dispatch event (resolveTenantId); fail-closed on namespace contradiction.
2c. Reconcile gate under cross-process index lock: idempotency key + prior-outcome lookup BEFORE transport;
   refuses duplicate attempts and unreconciled-unknown retries; artifact-exists check (never overwrite).
3. issueWorkOrder with taskId = executionId:attempt-<execution.attempt>, attempt HARDCODED to 1,
   missionId = 'mission-control:<missionId>:<runId>', resultPath = evidence-dir artifact (PING-owned).
   Transport resolution: transportFn (synthetic-test-only) or 'hermes' -> dispatchHermes; unknown transport throws.
4. invokeTransport(prompt, timeoutMs) synchronously; lock released before invocation.
5. Timeout -> honest UNKNOWN ('dispatcher_timeout'; worker may still be running; reconcile-vs-retry is caller's).
6. Envelope extraction from stdout (balanced-brace scan + JSON parse); redaction of secret-class values at boundary.
6b. Worker status 'unknown' -> honest UNKNOWN (explicit unknown channel), not escalated.
7. verifyResultEnvelope with invokedAgentId=agentId, verifiedAt=dispatcher clock.
No interrupt/cancel function exists anywhere in adapter.js or the vendor file.
Exports of vendor file: AGENT_PROFILES, workOrderId, authorizeWorkOrder, issueWorkOrder,
verifyResultEnvelope, resultIdentity, recordVerifiedResult.

## Mission Control dispatch route (ping repo, lane D)
POST body.agent caller-provided; must be in hardcoded SLICE_AGENTS mirror (ollama, identity_1..4);
adapter authorize is final. FIXED_CONSTRAINTS per slice. DEADLINES per agent (ollama 180s, identities 600s).
Executor receives raw prompt via runOllama/runBroker. No live health probe observed in route.ts, mc-dispatch.ts,
adapter.js, or vendor file. Quota gating for copilot is dispatcher-side (BROKER_STATE file), fail-closed on unknown/stale.

## Decision Unit name check
The string "mc.authorize_work_order" / "authorize_work_order/v1" / "Decision Unit" naming was NOT FOUND
in /home/nolan/workspace, /home/nolan/projects/ping, or /home/nolan/projects/constitutional-runtime
(grep excluding node_modules/.git/.next/worktrees). The function authorizeWorkOrder is real, deterministic,
GRANT|DENY-shaped ({granted:true}|{granted:false, reason}), but the named Decision Unit path from the task
brief is not observed in code. Treat as hypothesis input, not grounded.
