# Shared Execution Contract (Track F)

**Status**: proposed for the Oracle deployment assembly (main branch).
**Scope**: the smallest contract JS, Python, Codex, Hermes, and future remote
workers need to interoperate under ONE canonical event authority.
**Constitution**: many execution implementations, one canonical authority.
Nothing here creates a new event store, scheduler, or database.

---

## 1. Reuse mapping (do not reinvent)

The contract reuses existing names and schemas wherever they exist. Only
genuinely missing fields are added (marked NEW below).

| Contract element | Reused from | Location |
|---|---|---|
| Event record shape (`event_id`, `event_type`, `source`, `timestamp`, `payload`, `metadata`, `namespace`) | UnifiedEventRuntime | `ping-runtime/events/unified_event_runtime.js` (constitutional-convergence-v2, read-only forensics) |
| Deterministic event identity: `event_id = sha256(JSON({eventType, source, [namespace], [logical_id\|payload]}))` | UnifiedEventRuntime | same as above |
| Event types `MISSION_CREATED`, `MISSION_ASSIGNED`, `TASK_STARTED`, `TASK_COMPLETED`, `TASK_FAILED`, `EVIDENCE_RECORDED` | EventType union | `constitutional-compiler/runtime/event-sourcing/event-sourcing.ts` (mapped to the SCREAMING_SNAKE registry convention of the canonical runtime) |
| `metadata.correlation_id`, `metadata.causation_id` threading (root correlation = originator event_id) | EventToMissionBridge | `ping-runtime/orchestration/event_to_mission_bridge.js` |
| Mission state machine `created -> assigned -> running -> completed/failed`, deterministic `mission_id = sha256(missionType:event_id)[0:16]`, retry counting, dead-letter on exhaustion | MissionRuntime | `ping-runtime/orchestration/mission_runtime.js` |
| `register(name, worker, {eventTypes, maxConcurrent, capabilities})`; worker MUST implement `handle(event)`; `dispatch(event)` is the SINGLE canonical execution decider (`eventTypes.includes(eventType)`); dispatch-only mode; failures propagate to scheduler | WorkerRuntime | `ping-runtime/workers/worker_runtime.js` |
| Scheduler: poll pending, label via mission_type map, assign, build dispatch event on the ORIGINAL business event type, complete/fail on worker result, phantom-complete prevention | MissionScheduler | `ping-runtime/orchestration/mission_scheduler.js` |
| Task shape (`taskId`, `missionId`, `capability`, `parameters`, `retryCount`) | Task interface | `workers/canonical/BaseWorker.ts` |
| Execution envelope (`ExecutionRequest` / `ExecutionResult`, canonical JSON, secret redaction, `authorization.performed=false` structural marker, `execution_context` carried verbatim) | tools/execution | `tools/execution/envelope.py`, `runner.py`, `client.py` (main branch) |
| Canonical JSON (`sort_keys` + compact separators + trailing LF) | envelope.py `canonical_bytes` | `tools/execution/envelope.py` |
| Capability as constitutional contract (PING depends on capabilities, never providers) | ConstitutionalCapabilityContract | `ping-runtime/connectors/constitutional_capability_contract.js` |
| Event envelope required fields (`event_id`, `event_type`, `tenant_id`, `payload`, `authority`, `timestamp`, `version`) | event_envelope_schema.json | repo root `event_envelope_schema.json` |
| Evidence envelope (`provider_id`, `content_hash`, `canonicalization_algorithm`, ...) | evidence_envelope_schema.json | repo root `evidence_envelope_schema.json` |

### Known divergences (documented, not patched here)

- `constitutional-compiler/runtime/event-sourcing/event-sourcing.ts`
  `emitWithDefaults` generates `event_id` as `evt_${Date.now()}_${random}`,
  which violates the deterministic identity rule. The runtime source authority
  branch is read-only forensics; this is recorded as a defect for the owning
  track, not fixed here. The proof uses the UnifiedEventRuntime identity rule.
- Event type casing: `event-sourcing.ts` uses PascalCase (`MissionCreated`);
  the canonical `ping-runtime` uses SCREAMING_SNAKE (`MISSION_CREATED`). The
  contract standardizes on SCREAMING_SNAKE (canonical runtime convention).

---

## 2. The contract

### 2.1 Mission identity

```jsonc
{
  "mission_id": "string, REQUIRED. Deterministic: sha256(missionType + ':' + (payload.event_id || canonical_json(payload)))[0:16]. Same event always yields the same mission (idempotent by construction).",
  "mission_type": "string, REQUIRED. Stable mission kind, e.g. PYTHON_CAPABILITY_RUN. Mapped to a worker label by the scheduler; NOT the dispatch key.",
  "correlation_id": "string, REQUIRED. Root correlation: the originator event_id, threaded unchanged through the entire chain.",
  "principal": "string, REQUIRED. NEW. The originator identity (API caller, agent id, harness name). Recorded on every event's metadata.",
  "namespace": "string, REQUIRED. Privacy boundary, e.g. core::system. Default owned by the event authority; never re-derived downstream.",
  "priority": "integer, optional, default 0"
}
```

### 2.2 Work identity (task)

```jsonc
{
  "task_id": "string, REQUIRED. Deterministic: sha256('task:' + mission_id + ':' + worker_name + ':attempt' + attempt)[0:16]. Bound to one mission, one worker, one attempt.",
  "mission_id": "string, REQUIRED.",
  "worker_name": "string, REQUIRED. Registration name in WorkerRuntime.",
  "capability": "string, REQUIRED. Stable capability contract name, e.g. python.canonical_hash. PING depends on capabilities, never providers.",
  "attempt": "integer, REQUIRED, >= 1. Explicit attempt number; drives retry/dead-letter semantics.",
  "max_attempts": "integer, REQUIRED. From scheduler retry policy."
}
```

### 2.3 Worker / capability registration

```jsonc
{
  "worker_name": "string, REQUIRED. e.g. python-worker",
  "worker_id": "string, REQUIRED. worker_name + '@' + execution host. Preserved on every task event.",
  "event_types": ["string, REQUIRED, non-empty. Dispatch routing keys. Empty = dormant (never matches)."],
  "capabilities": ["string. Advertised capability contracts (labeling/metadata; routing uses event_types)."],
  "max_concurrent": "integer, default 1"
}
```

Worker implementations MUST expose `handle(event)` (JS) or the adapter
equivalent; they receive the dispatch event and return a structured result
(section 2.6). Workers own EXECUTION ONLY.

### 2.4 Input

The dispatch event carries:

```jsonc
{
  "event_id": "string, REQUIRED. The original business event_id (NOT the mission_id).",
  "event_type": "string, REQUIRED. The ORIGINAL business event type (what the bridge saw). Dispatch routes on this.",
  "source": "string, REQUIRED. Which connector/worker emitted it.",
  "namespace": "string, REQUIRED.",
  "mission_id": "string, REQUIRED.",
  "payload": "object, REQUIRED. The business payload, unwrapped by the bridge.",
  "metadata": {
    "mission_type": "string, REQUIRED",
    "assigned_to": "string, REQUIRED (worker label)",
    "correlation_id": "string, REQUIRED",
    "causation_id": "string, REQUIRED (the event that caused this dispatch)",
    "attempt": "integer, REQUIRED",
    "principal": "string, REQUIRED  (NEW: threaded from the mission)"
  }
}
```

### 2.5 Correlation / causation

- `correlation_id`: set to the originator `event_id` once; every downstream
  event and the mission payload preserve it unchanged.
- `causation_id`: the `event_id` of the immediate predecessor in the chain.
  Chain invariant: `MISSION_CREATED -> MISSION_ASSIGNED -> TASK_STARTED ->
  TASK_COMPLETED -> EVIDENCE_RECORDED`, each event's `causation_id` equals the
  previous event's `event_id`.
- A successful execution WITHOUT this traceability is not certification.

### 2.6 Result (structured, worker -> authority)

```jsonc
{
  "status": "'ok' | 'failed', REQUIRED",
  "task_id": "string, REQUIRED",
  "mission_id": "string, REQUIRED",
  "worker_id": "string, REQUIRED",
  "capability": "string, REQUIRED",
  "attempt": "integer, REQUIRED",
  "capability_output": "object, REQUIRED on ok. The capability's own result document.",
  "execution": {
    "exit_code": "integer, REQUIRED",
    "timed_out": "boolean, REQUIRED",
    "started_at": "string (ISO-8601), REQUIRED",
    "finished_at": "string (ISO-8601), REQUIRED",
    "execution_host": "string, REQUIRED",
    "script_hash": "string (sha256 hex), REQUIRED",
    "environment_hash": "string (sha256 hex), REQUIRED",
    "request_hash": "string (sha256 hex), REQUIRED. Replay anchor of the ExecutionRequest."
  },
  "evidence": {
    "evidence_id": "string, REQUIRED. sha256('evidence:' + task_id + ':' + content_hash)[0:16].",
    "content_hash": "string (sha256 hex), REQUIRED. Hash of the canonical capability output.",
    "request_hash": "string, REQUIRED",
    "script_hash": "string, REQUIRED"
  },
  "summary": "string, REQUIRED. One-line human summary."
}
```

### 2.7 Error

```jsonc
{
  "status": "'failed', REQUIRED",
  "error": "string, REQUIRED. Message only; no stack or secret leakage.",
  "retryable": "boolean, REQUIRED. Transport/timeout failures are retryable; capability logic errors are not.",
  "attempt": "integer, REQUIRED"
}
```

Retry/dead-letter semantics belong to PING (MissionRuntime/Scheduler), never
to the worker: on `retryable=true` and `attempt < max_attempts` the mission
re-queues; on exhaustion it is recorded to the dead-letter list and
`MISSION_FAILED` is emitted with `deadLettered: true`.

### 2.8 Timing

```jsonc
{
  "timeout_sec": "integer, REQUIRED. Hard bound on execution; enforced by the transport.",
  "started_at": "ISO-8601, REQUIRED",
  "finished_at": "ISO-8601, REQUIRED"
}
```

Timestamps are observation metadata only; they NEVER participate in identity
(logical_id strips them so retries hash identically).

### 2.9 Canonical event emission (authority side)

Every state transition is recorded by the event authority (never by workers)
with deterministic identity:

| Event | Source | logical_id (identity material) | causation |
|---|---|---|---|
| originating business event | emitter | caller-supplied logical identity | null (root) |
| MISSION_CREATED | mission-runtime | `mission:{mission_id}` | originating event_id |
| MISSION_ASSIGNED | mission-scheduler | `mission:{mission_id}:assigned:attempt{n}` | MISSION_CREATED event_id |
| TASK_STARTED | worker (adapter) | `task:{task_id}:started:attempt{n}` | MISSION_ASSIGNED event_id |
| TASK_COMPLETED | worker (adapter) | `task:{task_id}:completed:attempt{n}` | TASK_STARTED event_id |
| TASK_FAILED | worker (adapter) | `task:{task_id}:failed:attempt{n}` | TASK_STARTED event_id |
| EVIDENCE_RECORDED | evidence-recorder | `evidence:{evidence_id}` | TASK_COMPLETED event_id |
| MISSION_COMPLETED / MISSION_FAILED | mission-scheduler | `mission:{mission_id}:completed\|failed:attempt{n}` | TASK_COMPLETED / TASK_FAILED event_id |

Idempotency: re-emission of an identical logical event yields the identical
`event_id`; the authority deduplicates on `event_id` (ON CONFLICT DO NOTHING
semantics).

### 2.10 Authority split (normative)

PING owns: authorization, mission state, retry/dead-letter semantics, canonical
event recording, evidence.
Workers own: execution only.

Consequences:
- A worker (JS, Python, or external agent) MUST NOT emit canonical events,
  write mission state, or decide retries. It returns a structured result; the
  authority records.
- The transport MUST NOT authorize: every execution result carries the
  structural `authorization: {performed: false}` marker (existing envelope.py
  behavior, preserved).
- Canonical JSON is the cross-runtime identity language: `sort_keys` + compact
  separators + trailing LF. JS and Python implementations MUST hash identically
  (verified in the proof, section 3.3 of CROSS_RUNTIME_PROOF.md).

---

## 3. ExternalAgentAdapter contract boundary (Codex / Hermes / OpenCode)

Investigation basis: `docs/PING_CODEX_ENVIRONMENT_BOUNDARY.md` (Codex runs as
a sandboxed Windows desktop process: ConstrainedLanguage PowerShell, no WSL
instance access, no Docker API, filesystem read/write limited to configured
roots, network egress unreliable); `docs/HERMES_CHARTER_COVERAGE.md`
(historical charter, agent work tracks); OpenCode worktree paths in the
migration report (OpenCode is the worktree-driving CLI). Memory: Hermes holds
Nolan's surgical-write grant.

External agents CANNOT be dispatched in-process via `WorkerRuntime.dispatch()`.
The boundary is a FILE PROTOCOL, not a function call:

1. PING (authority side) writes a **WorkOrder envelope file** into the agent's
   configured root: `{ work_order_id, mission_id, task_id, correlation_id,
   causation_id, attempt, principal, namespace, capability, input, constraints,
   result_path, deadline }`. `work_order_id` is deterministic:
   `sha256('workorder:' + task_id)[0:16]`.
2. The agent executes WITHIN ITS OWN SANDBOX using its own runtime (Codex
   sandbox, OpenCode CLI, Hermes session). It MUST NOT emit canonical events,
   MUST NOT write mission state, MUST NOT touch the event store. Its sandbox
   boundary is its authority boundary.
3. The agent writes a **Result envelope file** to `result_path` matching
   section 2.6/2.7 (status, capability_output or error+retryable, execution
   timing/host, evidence hashes). No result file by the deadline = transport
   failure (retryable).
4. PING ingests the result file, validates it against this contract, and
   records TASK_STARTED / TASK_COMPLETED|FAILED / EVIDENCE_RECORDED itself.
   Validation failure (schema, hash mismatch, unknown fields) = worker failure,
   `retryable: false`.

Write authority (Nolan's grant to Hermes/agents) is a POLICY input to the
work order's `constraints`, enforced by PING before the work order is issued,
never self-asserted by the agent. No agent execution was performed in this
track (boundary definition only, per the task).

---

## 4. Open items (for the owning tracks)

1. Port the deterministic `event_id` rule into `emitWithDefaults`
   (constitutional-compiler runtime) or retire that path; the
   `evt_${Date.now()}_${random}` form breaks idempotent retries.
2. Reconcile PascalCase vs SCREAMING_SNAKE event type registries.
3. Decide the production persistence for `ping_events` in the Oracle assembly
   (the migration report marks `ping_events` CANONICAL CURRENT on Postgres).
4. The proof's scheduler is synchronous and in-memory (see CROSS_RUNTIME_PROOF
   section 4, honest PARTIAL edges); the production MissionScheduler keeps
   poll/lease/reaper semantics from the canonical implementation.
