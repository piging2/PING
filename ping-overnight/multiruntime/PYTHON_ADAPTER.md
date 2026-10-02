# Python Adapter Design (Track E)

**Goal**: preserve the Python implementation; do NOT let it remain (or become)
a second event authority.
**Chain**: MissionScheduler -> WorkerRuntime -> PythonWorkerAdapter ->
existing Python runner -> structured result -> WorkerRuntime -> event authority.

---

## 1. What exists on the Python side (main branch, preserved as-is)

`tools/execution/` is a TRANSPORT, not an authority:

| File | Role | Authority posture |
|---|---|---|
| `envelope.py` | `ExecutionRequest` / `ExecutionResult` dataclasses, canonical JSON bytes, secret redaction, `authorization_event()` structural marker | Defines the wire shape; enforces nothing |
| `runner.py` | Reads one ExecutionRequest from stdin, runs the script via temp file with fixed `argv = [shell, script_path]`, writes one ExecutionResult to stdout; stdout carries ONLY the envelope | Performs NO authorization (`authorization.performed=false` on every result); records NO mission/event state |
| `client.py` | Thin client shipping requests over existing transports (remote/pig) | Transport helper only |
| `test_envelope.py` | Golden-vector tests incl. canonicalization drift detection | Regression net |

`execution_context` (a dict field on ExecutionRequest, carried verbatim and
never enforced by the runner) is the designated carrier for mission/task
context across the boundary. The existing golden test already ships
`execution_context: {agent_id, mission_id}`; the adapter extends this to the
full contract (section 3).

Nothing in `tools/execution/` is rewritten. The adapter ADAPTS around it.

## 2. The adapter (JS side, lives with the workers)

`PythonWorkerAdapter` (proof implementation:
`/home/nolan/ping/worktrees/oracle-assembly/multiruntime-proof/python_worker_adapter.mjs`;
production home: alongside the canonical workers in the Oracle assembly):

- Registers with WorkerRuntime as `name='python-worker'`,
  `eventTypes=['PYTHON_CAPABILITY_VERIFY', ...]`,
  `capabilities=['python.canonical_hash', ...]`, implements `handle(event)`.
- `worker_id = 'python-worker@' + hostname` (preserved on every task event).
- `handle(event)`:
  1. Derives `task_id = sha256('task:' + mission_id + ':' + worker_name +
     ':attempt' + attempt)[0:16]` from the dispatch event metadata.
  2. Emits `TASK_STARTED` through the event authority (JS side records;
     Python never emits).
  3. Builds the `ExecutionRequest` (only envelope.py-known fields; unknown
     fields are rejected by `from_dict`, so the adapter cannot smuggle
     extras): `script = 'python3 <capability_abs_path>'`,
     `command_id = task_id`, `stdin = capability input JSON`,
     `timeout`, `network_policy='denied'`, and `execution_context` carrying
     `{mission_id, task_id, worker_id, capability, correlation_id,
     causation_id, attempt, principal, namespace, task_started_event_id}`.
  4. Spawns `python3 <runner.py>` via `execFile` (no shell) with the canonical
     request bytes on stdin; reads the `ExecutionResult` envelope from stdout.
  5. Verifies `result.command_id == task_id` (binds envelope to task);
     parses the capability's stdout JSON; maps outcome to the contract result
     (section 2.6) or error (section 2.7) shape.
  6. Emits `TASK_COMPLETED` (causation = TASK_STARTED) and
     `EVIDENCE_RECORDED` (causation = TASK_COMPLETED) through the event
     authority.
  7. Returns the structured result to WorkerRuntime; the scheduler completes
     or fails the mission. Adapter failures raise/return `failed`; the
     scheduler owns retry/dead-letter.

Retryability mapping (adapter -> scheduler):
- Runner transport failure (spawn error, unparsable envelope, command_id
  mismatch): `retryable: true` (nothing about the capability was proven).
- Capability timeout: `retryable: true`.
- Capability logic error (nonzero exit, malformed output): `retryable: false`.

## 3. Exact boundaries

### 3.1 TRANSPORT (existing Python, untouched)

`tools/execution/runner.py` + `envelope.py` + the chosen ship mechanism
(`client.py` remote/pig transports, or direct subprocess in the proof).

Owns: byte movement across the process boundary, process lifecycle, timeout
enforcement, output capture/capping, secret redaction, replay anchor
(`request_hash`), the structural no-authorization marker.

Must NEVER: authorize, emit canonical events, write mission state, decide
retries, interpret `execution_context` (carried verbatim).

### 3.2 EXECUTION (Python capability modules, preserved logic)

One module per capability, e.g.
`multiruntime-proof/capabilities/ping_canonical_hash.py` (proof) or future
`python_workers/` modules. Contract for a capability module:

- Reads ONE JSON document from stdin; writes ONE JSON document to stdout.
- Exit 0 = output document written (capability success/failure lives INSIDE
  the document); exit nonzero = malformed input / unexpected crash.
- Pure with respect to PING authority: no imports of event/mission/state
  code, no network, no filesystem writes outside its scratch, no secrets.
- May freely reuse existing Python libraries (the proof capability reuses
  `envelope.canonical_bytes`, which is why JS/Python hash identically).

Existing Python workers are NOT rewritten. If a legacy Python worker
currently emits events or keeps its own state (the migration report flags
`workers/worker_runtime.py` from the promotion as an "alternative event
authority" pattern), the adapter migration for it is:

1. Keep its execution function; delete/replace its emit/state calls with a
   return of the structured result document.
2. Register it behind a `PythonWorkerAdapter` with its own `eventTypes` +
   `capability` name.
3. Its former event emissions become adapter-emitted TASK_*/EVIDENCE_* events.

Transport/execution code is preserved; only the authority assumptions are
adapted out.

### 3.3 AUTHORITY-STATE (JS/PING side only)

MissionRuntime (state machine, retry counting, dead-letter list),
MissionScheduler (assign, dispatch, complete/fail), and the event authority
(canonical recording with deterministic identity + dedup) live on the JS/PING
side. Python processes are stateless across invocations: everything they need
arrives in the ExecutionRequest; everything they produce leaves in the
ExecutionResult.

## 4. Why this is not a second event authority

1. Python emits zero canonical events. All TASK_*/EVIDENCE_*/MISSION_* events
   are recorded by the JS-side authority from the structured result.
2. Mission state transitions happen only in MissionRuntime, driven by the
   scheduler's reading of the adapter's result.
3. Retry/dead-letter decisions happen only in the scheduler.
4. The runner's `authorization.performed=false` marker is preserved end to
   end: the proof asserts the transport never authorized.
5. Identity is single-sourced: event/mission/task/evidence IDs are computed
   by the canonical rules; Python-computed hashes (script_hash,
   environment_hash, request_hash, content_hash) are EVIDENCE, not identity.

## 5. Failure modes

| Failure | Detected by | Becomes |
|---|---|---|
| Runner missing / not executable | adapter spawn | `failed, retryable: true` -> scheduler re-queues |
| Request rejected by runner (exit 2) | adapter | `failed, retryable: true` (transport-level) |
| Capability timeout | runner envelope `timed_out` | `failed, retryable: true` |
| Capability logic error | envelope exit_code / output doc | `failed, retryable: false` -> dead-letter after policy |
| command_id mismatch | adapter check | `failed, retryable: false` (integrity violation) |
| Scheduler crash mid-flight | lease/reaper (production) | mission re-queued; idempotent `event_id` dedups re-emission |
| Duplicate delivery | authority dedup on `event_id` / mission `ON CONFLICT DO NOTHING` | `deduplicated`, no double execution |

## 6. Production wiring (for the Oracle assembly track, not done here)

- Move the adapter next to the canonical workers; register one adapter
  instance per Python capability (or one adapter parameterized by a
  capability->module map, with `eventTypes` per capability).
- Replace the proof's in-memory/JSONL authority with `UnifiedEventRuntime`
  against `ping_events` (Postgres) and the proof's in-memory missions with
  `MissionRuntime` against `ping_missions`; the adapter code does not change,
  only its injected dependencies.
- Keep `tools/execution/` as the transport for remote (Pig/WSL) Python; the
  proof used direct subprocess, which is the same envelope over a different
  ship mechanism.
