# Multi-Runtime WorkOrder / Evidence Contract

**Version:** 1.0.0-draft, 2026-09-18
**Authority:** PING is the single canonical authority. This spec mirrors the proven reference implementation `ping-runtime/external-agent/external_agent_adapter.js` (proven live 2026-09-16/17, worktrees/ping-harvest-12h), its `WORKORDER_SCHEMA.json` and `RESULT_SCHEMA.json`. Where this spec adds dispatcher-level guidance, it is labeled SPEC-LEVEL and is not adapter code.

## 1. Adapter functions (grounded in code, do not rename or reorder)

- `authorizeWorkOrder({ agentId, capability, namespace, constraints })` — THE decision this module owns: "may PING issue this work order?" Fail-closed. Denies unknown agents, `blockedExternal` agents, capabilities outside the profile's `allowedCapabilities`, namespaces not matching `^(core|tenant)::[a-z0-9_.-]+$`, constraints that do not tighten the profile maximum, and any order where `no_canonical_events !== true` or `no_mission_state_writes !== true`. Returns `{granted:true}` or `{granted:false, reason}`.
- `issueWorkOrder({ agentId, capability, namespace, taskId, missionId, correlationId, contextPackId, input, constraints, resultPath, deadline, causationId, attempt = 1 })` — builds (never sends) the envelope; throws on authorization denial. `work_order_id = sha256('workorder:' + taskId)[0:16]`, so re-issue of the same task is idempotent. Issuing principal is the constant `ping:external-agent-adapter`, never self-asserted by the worker.
- `verifyResultEnvelope(result, workOrder, { invokedAgentId, verifiedAt })` — validates the result envelope before it can reach canonical event authority. Binds authorized agent == invoked agent == result agent; requires exact echoes of `work_order_id`, `context_pack_id`, `capability`; status in `{completed, failed}`; completed requires non-null `output` and null `error`; failed requires null `output` and non-empty `error`; `evidence` must be an object; `verifiedAt` must be ISO and <= `deadline`; invalid deadline fails. Returns `{valid, retryable:false, result_id}`. Validation failure is non-retryable and can never reach canonical event authority.
- `recordVerifiedResult({ eventRuntime, result, workOrder, invokedAgentId, verifiedAt })` — asks PING's injected canonical event runtime to emit `WORKER_COMPLETED` or `WORKER_FAILED` with `namespace`, `logical_id = result_id`, `correlation_id`, `causation_id`. The worker never receives runtime access or event credentials. Event identity is owned solely by `UnifiedEventRuntime.computeEventId`.

## 2. Core WorkOrder envelope (closed: `additionalProperties: false` in WORKORDER_SCHEMA.json)

Required (14 fields, exact names): `work_order_id`, `agent_id`, `mission_id`, `task_id`, `correlation_id`, `context_pack_id`, `attempt`, `principal`, `namespace`, `capability`, `input`, `constraints`, `result_path`, `deadline`. Optional: `causation_id` (string or null).

- `mission_id` is required and non-empty; there is no ad-hoc null exception.
- `input` is an object per the schema.
- `constraints` must include `read_only`, `allowed_workspace`, `no_network`, `no_writes`, `no_canonical_events`, `no_mission_state_writes` as required keys; `authorizeWorkOrder` hard-requires `no_canonical_events = true` and `no_mission_state_writes = true`.
- `result_path` is WHERE PING PERSISTS the captured result envelope. The worker never writes here directly; PING captures stdout and writes it. No family may treat it as a writable output path.
- `namespace` must match `^(core|tenant)::[a-z0-9_.-]+$`.
- `attempt` starts at 1 and increments per retry; the same `task_id` re-issues the same `work_order_id`.

## 3. Per-family required fields (compact)

Every family receives the full core envelope above. Family-specific usage:

| Family | agent_id rule | input rule | result_path / return path | Family-specific requirements |
|---|---|---|---|---|
| Cloud subagents (PRIMARY fleet) | dispatcher-assigned worker identity, registered in a profile before `authorizeWorkOrder` will grant | inline in the dispatch prompt; no cross-environment file-path assumptions | envelope returned in the worker's final report; `result_path` stays PING-owned | SPEC-LEVEL: dispatcher maintains a capability allowlist per deployment; workers are ephemeral and replaceable |
| Hermes | registered Hermes profile identity | the prompt string passed as the single argument to `~/workspace/bin/prompt-hermes.sh`; INLINE ONLY (Windows-native transport, CWD `C:\Users\nolan`; cannot see WSL/cloud paths, verified 2026-09-17) | worker emits ONLY the 8-field result envelope on stdout; PING captures it and writes `result_path` | SPEC-LEVEL: research/analysis capabilities only; ~11s typical response informs deadline margins |
| Ollama | registered Ollama profile identity | the prompt string for `~/workspace/bin/prompt-ollama.sh`; inline | stdout envelope only; `result_path` PING-owned | SPEC-LEVEL: `qwen2.5-coder:1.5b` default, ~3s responses, fast code/analysis; keep tasks small-model appropriate |
| Copilot broker | one of the four pre-authorized identities (identity_1..identity_4); anything else fails closed | coding task description inline | broker response returned to dispatcher; `result_path` PING-owned | SPEC-LEVEL: quota gating is EXTERNAL to the envelope (dispatcher checks remaining >= cost + reserve before issuing; fail-closed on unknown/stale quota); no quota or credential fields ever enter the WorkOrder |

Gap note (grounded): the reference adapter today profiles only `hermes`, `codex`, and `opencode`. The four families above need registered `AGENT_PROFILES` entries (with `allowedCapabilities` and `maxConstraints`) before `authorizeWorkOrder` can grant them. Capability allowlists are per-family dispatcher policy.

## 4. Execution evidence (what each worker must return)

Every worker returns exactly one thing: the 8-field result envelope per RESULT_SCHEMA.json: `work_order_id`, `context_pack_id`, `agent_id`, `capability`, `status`, `output`, `evidence`, `error`. Echo fields must match the issued WorkOrder exactly; `output`/`error` follow the completed/failed rules in section 1.

`evidence` is an OPEN object (no `additionalProperties` restriction in the schema); PING may add timing/host. It is agent-reported evidence, not canonical truth. SPEC-LEVEL recommended (not adapter-required) contents per family, all ISO timestamps:

| Family | Recommended evidence keys |
|---|---|
| Cloud subagents | `startedAt`, `endedAt`, `host`, `capabilityPerformed`, `notes` |
| Hermes | `startedAt`, `endedAt`, `host`, `promptLength`, `responseLength`, `capabilityPerformed` |
| Ollama | `startedAt`, `endedAt`, `host`, `model`, `promptTokens`, `completionTokens`, `capabilityPerformed` |
| Copilot broker | `startedAt`, `endedAt`, `host`, `identityUsed` (one of the four), `capabilityPerformed` |

No credentials, tokens, keys, or private material may appear in `evidence` (or anywhere in the envelope).

## 5. Timeout, deadline, and failure reporting

- `deadline` is an absolute ISO cutoff. `verifyResultEnvelope` rejects any result with `verifiedAt > deadline`; the rejection is invalid and non-retryable.
- The invoker (dispatcher/script) enforces the timeout. If no result arrives by the deadline, the invoker must not fabricate a success: it reports the attempt as failed (`status: failed`, `output: null`, `error`: non-empty string, e.g. "timeout after <deadline>"). Only PING emits the `WORKER_FAILED` event via `recordVerifiedResult`.
- On any internal worker exception: `status: failed`, `output: null`, `error`: non-empty description of the cause. The `evidence` object must still be present (timestamps captured up to the failure).
- Retry decisions live ONLY in PING's orchestration layer. Workers never self-retry, never decide promotion (retry/fail), never select workers or next missions. Retries increment `attempt`; `recordVerifiedResult` uses `result_id` as `logical_id` for idempotent event emission.
- Validation failure (`verifyResultEnvelope` invalid) is non-retryable and cannot reach canonical event authority.
- Per family (SPEC-LEVEL): dispatcher sets deadlines with margin above typical latency (Hermes ~11s, Ollama ~3s, Copilot broker task-dependent, cloud subagents task-dependent).

## 6. Forbidden (explicit, fail-closed)

- No worker may emit canonical events. Only PING's `recordVerifiedResult` causes `WORKER_COMPLETED`/`WORKER_FAILED` emission.
- No worker may write mission state, touch event storage, or modify PING-managed data structures. (mission_activities.js: activities invoke PING authorities; they do not emit canonical events or change mission truth.)
- No worker may self-assert `principal`, `namespace`, or `capability`; these are issued by PING and echoed exactly.
- No new authorities, event stores, or intermediary services may be created by a worker. Event identity stays with `UnifiedEventRuntime.computeEventId`.
- No secrets, credentials, bearer tokens, or private keys may appear in `input`, `output`, or `evidence`. Dispatcher scripts (including Python) resolve credentials at the process boundary and never place them in a WorkOrder. Python emits zero canonical events directly.
- The WorkOrder envelope is closed (`additionalProperties: false`): invented fields invalidate the envelope.
- The temporal activity stub notes `requiresApproval` for send-capabilities (`email.send`, `sms.send`): any family executing outward-facing capabilities must route through the approval gate; this is dispatcher policy, not worker choice.

## 7. Provenance

Reference code: `ping-runtime/external-agent/external_agent_adapter.js`, `WORKORDER_SCHEMA.json`, `RESULT_SCHEMA.json`, `BOUNDARY.md` (worktrees/ping-harvest-12h, proven live 2026-09-16/17); commented `executeWorkOrder` wiring in `ping-runtime/temporal/activities/mission_activities.js`; standing rules from the 2026-09-18 dispatcher directive (one PING authority, many execution runtimes; workers are replaceable executors returning execution evidence; Python emits zero canonical events). Hermes drafted this spec; every field, function name, and enforcement rule above was checked against the code and corrected where the draft deviated.
