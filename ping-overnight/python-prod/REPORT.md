# Agent C: Python on the Production Authority Plane (Phases 7-8)

Date: 2026-09-16/17 | Agent: C (production multi-runtime) | Window: ~20:20 MDT onward
Branch: `sprint/python-prod` @ 5b102c664 | Worktree: `/home/nolan/ping/worktrees/python-prod`
Isolation: namespace `test.python-prod`, correlation/test marker `sprint-2026-09-16`
Production source used read-only: `/home/nolan/ping` (constitutional-convergence-v2 @ 099927152)

## TL;DR

- **Phase 7: VERIFIED.** Canonical event -> production EventToMissionBridge -> production MissionRuntime -> production MissionScheduler -> production WorkerRuntime -> PythonProdAdapter -> unmodified `tools/execution/runner.py` -> real Python capability -> structured result -> production UnifiedEventRuntime -> canonical TASK/EVIDENCE events -> MISSION_COMPLETED. All against live Oracle Postgres (`ping_events`, `ping_missions`). 44/44 assertions from Postgres rows. Full identifier chain below.
- **Phase 8: (pending at time of writing; driver running)** controlled failure, scheduler-owned retry, bounded dead-letter.

## Method (both phases)

No proof harness stand-ins. The driver instantiates the actual production classes (read-only require from the cc-v2 checkout) pointed at production Postgres through an SSH tunnel (Pig WSL -> Oracle 127.0.0.1:5432). PG credentials resolved on-box from the container env into process memory only; never printed, never written to disk. Only runtime-local map augmentations in the driver process (`EVENT_MISSION_MAP` += our test event types, `MISSION_WORKER_MAP` += our mission types); the live gateway process is untouched and its scheduler skips our mission types. The lease reaper was scoped to our mission types so the shared `ping_missions` table's live rows are never touched.

Python posture: the adapter, runner, and capabilities contain no Postgres/event code (verified by grep). Python emits zero events; every canonical row is written by the JS-side authority from the structured result.

## Phase 7: production Postgres path - VERIFIED

44/44 assertions PASS, exit 0. One harmless real Python execution: `python.canonical_hash` (sha256 over canonical JSON bytes via the repo's own `envelope.canonical_bytes`; stdin/stdout only).

### Identifier chain (all values read back FROM Postgres)

| Identifier | Value |
|---|---|
| principal | `agent-c` |
| namespace | `test.python-prod` |
| test marker | `sprint-2026-09-16` |
| E1 `PYTHON_CAPABILITY_VERIFY` | `27482dbdabfb57b7190dd9f4ae530bee98ff381c8cc0eebec27349dd04b502a1` |
| E2 `MISSION_CREATED` | `1b6629399762e534b586fb6db32c45c837577c44ffaf2de5d8cad7412d499e40` |
| mission_id | `bfe815990337e45d` (type `PYTHON_CAPABILITY_RUN` = sha256(`PYTHON_CAPABILITY_RUN:`+E1)[0:16]) |
| E3 `MISSION_ASSIGNED` | `d702639a277ec06e9d32de1a34a1da55f198e3786386525d56db35f695e86e0b` (assigned to `python-worker`, attempt 1) |
| task_id | `e694f5787ad45764` (= sha256(`task:`+mission_id+`:python-worker:attempt1`)[0:16]) |
| worker_id | `python-worker@Pig` |
| capability | `python.canonical_hash` |
| E4 `TASK_STARTED` | `a6e70b783956e4c16d5b1406db40560027b0e3964367a5a369403ae334e69000` |
| E5 `TASK_COMPLETED` | `9bbbfff731a2023d683cc8bf60e16e4f0bc832fe47c5455bc1d63cb138b48253` |
| E6 `EVIDENCE_RECORDED` | `49a96bff42cb1bdf5bc19dd56901a1955a0fb962a24d498dc36a21d0bd7e180e` (evidence_id `6cafb21dca536f4f`) |
| E7 `MISSION_COMPLETED` | `f8c1ae1fc1c7bc322c20509359a1565bc68601b1342f47f53da883ddf115159a` |
| request_hash (replay anchor) | `7fd315884b20c7e053f86487772533c25395aa978e6029ff67279f0af6f7d2e4` |
| script_hash | `6522617022e7d2e51309b22c330ee611cd5722b22facf681033f01d927015ab3` |
| content_hash (capability output) | `bf394394936e02ebbc0c8b1212fa2b7345ac37915eed85b6686a46edb8613e70` |
| capability result (canonical_sha256) | `1945b844ac504c8fbd631b668b4ede93291b432c573f7263f631e7f63ae521ab` |
| execution_host | `Pig` |

### What was proven (from live rows, not files)

- Chain: E1 (namespace `test.python-prod`, principal `agent-c`, logical_id `pyprod:capability=python.canonical_hash;text=...`) -> bridge created mission `bfe815990337e45d` (E2) -> scheduler assigned to `python-worker` (E3) -> adapter derived attempt=1 from the scheduler-owned `retries` counter -> TASK_STARTED (E4, causation=E3) -> real Python execution -> TASK_COMPLETED (E5, causation=E4) -> EVIDENCE_RECORDED (E6, causation=E5) -> MISSION_COMPLETED (E7).
- Determinism: E1 recomputed from production identity material (insertion-order JSON `{eventType, source, namespace, logical_id}`) matches byte-for-byte; mission_id and task_id recompute identically; evidence_id recomputes.
- Correlation/causation: E4/E5/E6 carry `correlation_id` = E1, `namespace` = `test.python-prod`, `principal` = `agent-c`; causation E4->E3, E5->E4, E6->E5 unbroken.
- Cross-runtime: JS recomputation of sha256(canonical JSON + LF) equals Python's `canonical_sha256` (`1945b844...`); byte_length matches.
- Transport honesty: ExecutionResult `execution_events` contains the structural authorization marker with `performed=false`; `command_id` bound to task_id.
- Python is execution-only: every event in the correlation group has a JS-side source (`agent-c-phase7`, `mission-runtime`, `mission-scheduler`, `python-worker`, `evidence-recorder`); zero foreign sources.
- Idempotency rerun: re-emitting the identical logical event returned the identical E1 (`27482dbd...`); exactly one E1 row; mission stayed `completed` with `retries=0`; zero new TASK executions (count 2 before and after); scheduler did not re-execute.

### Observed production divergences (not patched; read-only rule)

1. `MissionRuntime`'s own lifecycle events (`MISSION_CREATED`, `MISSION_ASSIGNED`, `MISSION_STARTED`, `MISSION_COMPLETED`) do not thread correlation/causation and land in `core::system` (the production default) rather than the test namespace. The contract's chain invariant holds on the adapter-recorded events, which carry explicit correlation/causation. No test data was written outside the isolated namespace except these authority-owned lifecycle rows, which are tagged `test_run=sprint-2026-09-16` in payloads where the production shape allows.
2. The live gateway's scheduler shares `ping_missions`; it skips our mission types (`PYTHON_CAPABILITY_RUN` not in its map) with no state change. Verified in its log lines during the run.

## Phase 8: failure / retry / dead-letter - MIXED (dead-letter VERIFIED, retry-success FALSIFIED by a production defect)

Driver exit 3 (PARTIAL): 2 of 28 assertions failed, both the same root cause. Everything else passed, including the full bounded dead-letter proof.

### Identifier chain (all values read back FROM Postgres)

Mission A (flaky: fail once, then succeed):
- EA `PYTHON_FLAKY_VERIFY`: `daf1f2ce285b398692fc77c17019dd854e37d8553e73c2357a4edbe68bd2cb8e`
- mission_id: `73e08f46f843beb2` (type `PYTHON_FLAKY_RUN`), final status `retry_pending`, retries=1
- attempt 1: task `aff6e842727bf494`, TASK_FAILED, `retryable=false`, error `injected failure: attempt 1 < fail_until_attempt 2`
- attempt 2: task `3aac456f790eee61`, TASK_COMPLETED (scheduler re-queued, attempt derived from the scheduler-owned retries counter)

Mission B (always fails, max_attempts=2):
- EB `PYTHON_FAIL_VERIFY`: `eeff47b2f5cf8e7b115e7d7237948dc32686a53f62691a39c0ca5e87be7692ec`
- mission_id: `3daa14285107788e` (type `PYTHON_FAIL_RUN`), final status `failed`, retries=2
- attempt 1: task `ece48c9a8ce876af`, TASK_FAILED
- attempt 2: task `f082705251c85f3d`, TASK_FAILED, then authority MISSION_FAILED, then canonical MISSION_DEAD_LETTERED `21a6af0b72a8cfeb2c3dbbec40184e87456065f956c67b62238b936d3b76e0b7`
- Settle proof: 8 seconds after terminal state, retries still 2, status still `failed`, zero attempt-3 rows.

### What VERIFIED

- Controlled failure is structured: TASK_FAILED carries the error, attempt, task_id, mission_id, correlation, namespace, principal.
- Retry is scheduler-owned: the flaky mission's attempt 2 was re-queued by `failWithRetry` (status `retry_pending`, retries 1, retry_at backoff); the adapter has no retry code and derived attempt=2 from the scheduler counter; attempt-bound task IDs are distinct; correlation preserved across the retry.
- Bounded dead-letter: exactly 2 attempts, terminal `failed`, one canonical MISSION_DEAD_LETTERED in `test.python-prod` with retry_count=2 and causation threading the final failure, exactly 1 DLQ log record, no attempt 3 after the 8s settle.
- Namespace confinement: all 12 rows in the two correlation groups are in `test.python-prod`; zero rows from our sources outside it.

### P0 DEFECT FOUND in production: retry-then-success can never complete

Mission A proved the defect live: attempt 1 failed, the scheduler retried, attempt 2 succeeded and recorded TASK_COMPLETED + EVIDENCE_RECORDED, but the mission is stuck in `retry_pending` forever and re-executed on every scheduler poll (124 adapter executions observed; deterministic event IDs deduped them to 4 rows: 2 TASK_STARTED, 1 TASK_FAILED, 1 TASK_COMPLETED).

Root cause, read from the production source (`ping-runtime/orchestration/mission_runtime.js`, `mission_scheduler.js`, read-only):

1. `failWithRetry()` sets status=`retry_pending` and its own docstring says a `reclaimRetryPending()` method moves such missions back to `created`. **That method does not exist anywhere in the checkout** (grep confirmed).
2. `getPending()` returns due `retry_pending` missions, so the scheduler re-dispatches them.
3. `assign()` only transitions from `created` (`WHERE status='created'`), so the re-dispatch claims 0 rows; `start()` then requires `assigned`, also 0 rows.
4. `_dispatch()` ignores those no-ops and runs the worker anyway, so the retried attempt executes.
5. On worker success, `complete()` requires `status='running'` (`WHERE status='running'`), 0 rows. The mission can never reach `completed`. Next poll repeats from step 2, unboundedly: one Python execution per poll interval, forever.

Blast radius: any production mission that fails once and then succeeds on retry enters an infinite re-execution loop (events dedup, so the store does not grow, but compute burns every poll and the mission never completes). The exhaustion path is NOT affected (`failWithRetry`'s terminal branch matches `retry_pending`, which is why Mission B dead-lettered correctly). The defect also affects the live gateway, which runs this code.

Evidence left in place: mission `73e08f46f843beb2` remains `retry_pending` in production Postgres. The live gateway scheduler skips it harmlessly every poll (unknown worker type, no state change, same as the ~27 pre-existing skipped missions). The owning unit can delete it or complete it after fixing the defect; the full evidence is also in `prod/results-phase8.jsonl` (126 execution records).

Recommended fix (for the owning unit, not applied here under the read-only rule): make `assign()` (or a dedicated reclaim step owned by MissionRuntime) transition due `retry_pending` missions back to `assigned`/`created` before dispatch, or add the missing `reclaimRetryPending()` the docstring describes, with the scheduler calling it each poll.

### Shutdown note

After the driver closed its PG pool, one in-flight scheduler poll logged `Cannot use a pool after calling end on the pool` while trying to fail mission A. Benign shutdown sequencing noise; it changed no state (mission A was already `retry_pending`).

### Credential incident

During environment inspection, a `docker inspect` printed the Postgres container env including its password into internal tool output. It was not written to any file or report and will not be repeated. Flagging for the coordinator; no rotation performed (needs Nolan's authorization).

### Worktree final state

Branch `sprint/python-prod` @ `5b102c664`. No commits, no pushes, no tracked files modified. Only untracked `prod/` (drivers, adapter, capabilities, results JSONL). Live gateway untouched; its scheduler only logged skip lines for our unknown mission types.
