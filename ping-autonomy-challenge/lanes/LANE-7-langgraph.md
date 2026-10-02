# LANE 7: LangGraph Durable Execution - Mechanism Archaeology

**Wave:** 1 | **Lane:** 7 | **Date:** 2026-09-23 | **Mode:** RESEARCH / FALSIFICATION / HARVEST ONLY (no adoption, no implementation code)
**Author:** mechanism-archaeology subagent

**Objective:** Inspect LangGraph's actual durable-execution machinery (checkpointing, interrupts, state, memory, subgraphs, approval integration, resume) at source level, and determine which ideas survive WITHOUT adopting LangGraph: portable patterns vs framework-coupled machinery.

## 1. Sources + pinned SHAs

Primary repository: `github.com/langchain-ai/langgraph` (monorepo).

| # | Source | Pinned SHA | Notes |
|---|--------|-----------|-------|
| 1 | `github.com/langchain-ai/langgraph` (all libs below) | `7daa3ab49d678a5da75edb08baa87db4a2be52c3` | master HEAD at clone time (2026-09-23). Commit subject: `feat(cli): place self-hosted deployments on a listener (#9056)` |
| 2 | `libs/langgraph` (core: `langgraph/pregel/*`, `langgraph/channels/*`, `langgraph/types.py`, `langgraph/errors.py`) | same SHA | package version `1.2.12` per `libs/langgraph/pyproject.toml` |
| 3 | `libs/checkpoint` (`langgraph/checkpoint/base/__init__.py`, `.../base/id.py`, `langgraph/store/base/__init__.py`, `langgraph/cache/base/__init__.py`, `langgraph/checkpoint/memory/__init__.py`) | same SHA | checkpoint abstractions, BaseStore, BaseCache, InMemorySaver |
| 4 | `libs/checkpoint-sqlite` (`langgraph/checkpoint/sqlite/__init__.py`) | same SHA | SQL schema, put/put_writes semantics, delta-channel history walk |
| 5 | `libs/checkpoint-postgres` (`langgraph/checkpoint/postgres/__init__.py`) | same SHA | sampled for concurrency primitives (no LISTEN/NOTIFY; uses `psycopg_pool` ConnectionPool; `checkpoint_migrations` table exists) |

Key source files read in full: `libs/langgraph/langgraph/pregel/_loop.py` (SyncPregelLoop/AsyncPregelLoop, tick, after_tick, _put_checkpoint, _suppress_interrupt, _first, put_writes), `libs/langgraph/langgraph/pregel/_checkpoint.py` (create_checkpoint, channels_from_checkpoint, delta snapshotting), `libs/langgraph/langgraph/pregel/_algo.py` (should_interrupt, apply_writes, prepare_next_tasks, prepare_single_task, _scratchpad), `libs/langgraph/langgraph/pregel/_runner.py` (GraphInterrupt persistence, _panic_or_proceed), `libs/langgraph/langgraph/pregel/_io.py` (map_command), `libs/langgraph/langgraph/pregel/main.py` (durability default, get_state, update_state, subgraph ns assembly), `libs/langgraph/langgraph/types.py` (interrupt(), Command, Interrupt, Overwrite, Durability), `libs/langgraph/langgraph/errors.py` (GraphInterrupt/GraphBubbleUp), `libs/langgraph/langgraph/channels/*` (all 8 channel types), `libs/checkpoint/langgraph/checkpoint/base/__init__.py` (Checkpoint TypedDict, BaseCheckpointSaver contract incl. WRITES_IDX_MAP), `libs/checkpoint/langgraph/checkpoint/base/id.py` (uuid6), `libs/checkpoint-sqlite/.../__init__.py` (schema + put/put_writes).

**Falsification posture:** every "MECHANISM" claim below cites the function/file/line-range where it was observed. Claims I could not verify in code are marked UNKNOWN or placed in Open Questions.

---

## 2. Mechanisms (canonical format)

### M1 | SUPERSTEP_PREGEL_LOOP
- **PROBLEM:** Long multi-step agent runs need a deterministic scheduler: run independent nodes in parallel, batch their outputs, merge in a canonical order, and leave the system in a recoverable state after every batch.
- **SOURCE:** langgraph core, `pregel/_loop.py`, `pregel/_algo.py`, `pregel/_runner.py`
- **PINNED_SHA:** `7daa3ab49d678a5da75edb08baa87db4a2be52c3`
- **SOURCE_LOCATION:** `libs/langgraph/langgraph/pregel/_loop.py`: `tick()` (prepare -> interrupt_before gate -> return True), `after_tick()` (apply writes -> checkpoint -> interrupt_after gate); `pregel/_algo.py:apply_writes` (line 232); `pregel/_runner.py:622-690` (`_panic_or_proceed`)
- **MATURITY:** Production. This is the stable core since LangGraph 0.x; the surrounding code (delta channels, error handlers) is newer but the tick/apply/checkpoint skeleton is mature.
- **INVARIANT:** (a) One superstep = prepare tasks, execute in parallel, then `after_tick` applies ALL task writes to channels in deterministic task-path order and writes ONE checkpoint. (b) Exactly one of {completion, single GraphInterrupt, single error} escapes a superstep: a real error cancels sibling tasks (`_panic_or_proceed`), while GraphInterrupts are collected and re-raised as one combined interrupt (not treated as failures). (c) Status machine: `input -> pending -> (done | interrupt_before | interrupt_after | out_of_steps | draining)`.
- **IMPLEMENTATION:** `tick()` calls `prepare_next_tasks` (watermark-based trigger selection, see M5), then the runner executes tasks. `after_tick()` gathers `t.writes`, calls `apply_writes` (tasks sorted by `task_path_str(t.path[:3])`), emits values output, clears `checkpoint_pending_writes`, calls `_put_checkpoint({"source": "loop"})`, then evaluates the `interrupt_after` gate. Recursion guard: `stop = step + recursion_limit + 1`; `step > stop` yields `out_of_steps`.
- **FAILURE_MODE:** Crash mid-superstep loses in-flight node work; on resume, tasks that had persisted writes are NOT re-executed (writes re-attached, M4), tasks without writes re-execute. So node side effects are at-least-once unless the node itself is idempotent. A crash between the last background checkpoint put and process death loses up to one superstep of progress in `async` durability (M3).
- **PING_EXISTING_ANALOG:** Best effort: PING has an event/evidence plane (the recorder) and projections, but I found no documented superstep scheduler with deterministic write-application order. PING's execution model for multi-day missions is the gap this lane is probing.
- **GAP:** No equivalent in PING of "batch completed work into atomic steps with canonical merge order." If PING agents write evidence concurrently, merge order is undefined.
- **HARVEST_CLASS:** PATTERN_ONLY. The loop is coupled to channels/nodes/runnables, but the portable idea is: schedule in discrete steps; merge step outputs in a canonical order; checkpoint once per step.
- **FALSIFICATION:** Verified by reading `tick`/`after_tick`/`apply_writes`. Would be falsified if `apply_writes` iterated tasks in completion order (it explicitly sorts by path first).
- **DEPENDENCIES:** channels (M10), checkpointer (M2/M12), runner.
- **PORTABLE_WITHOUT_LANGGRAPH?:** YES. A step scheduler that collects per-step results and applies them in a canonical order before committing is implementable over any event log; it needs only (task id, step id, deterministic order key).

### M2 | CHECKPOINT_PAYLOAD (what is actually checkpointed)
- **PROBLEM:** "It checkpoints" is worthless without knowing the payload, granularity, and atomicity.
- **SOURCE:** `libs/checkpoint/langgraph/checkpoint/base/__init__.py` (Checkpoint TypedDict, copy_checkpoint), `libs/langgraph/langgraph/pregel/_checkpoint.py` (create_checkpoint), `libs/langgraph/langgraph/pregel/_loop.py` (_put_checkpoint)
- **PINNED_SHA:** `7daa3ab49d678a5da75edb08baa87db4a2be52c3`
- **SOURCE_LOCATION:** `base/__init__.py` lines ~40-110 (Checkpoint fields); `pregel/_checkpoint.py:create_checkpoint`; `_loop.py:1110-1210` (`_put_checkpoint`)
- **MATURITY:** Production. Checkpoint format `v: 4` (pregel `_checkpoint.py: LATEST_VERSION = 4`); older `v: 2` still readable via migration shim in `main.py:1138` (pending_sends -> TASKS).
- **INVARIANT:** A checkpoint is a snapshot of (a) `channel_values`: per-channel serialized values, but ONLY for channels present in `channel_versions` and non-empty (`EmptyChannelError` -> omitted as MISSING); (b) `channel_versions`: monotonic version per channel; (c) `versions_seen`: per-node (and per INTERRUPT pseudo-node) map of channel->version last seen; (d) `updated_channels`: sorted list of channels written this step; (e) metadata: `source` in {input, loop, update, fork}, `step` (int, -1 for first input checkpoint), `parents` (ns -> checkpoint_id map), `run_id`, plus `counters_since_delta_snapshot` when delta channels exist. The checkpoint ID is `uuid6(clock_seq=step)` (time-ordered UUIDv6, monotonic, so `ORDER BY checkpoint_id DESC` = latest).
- **IMPLEMENTATION:** `create_checkpoint` iterates live channels, calls `ch.checkpoint()` (each channel type defines its serializable form), skips MISSING. `_put_checkpoint` builds the new checkpoint from the previous one + live channel state, diffs versions (`get_new_channel_versions`) to produce `new_versions` for the saver, then submits `put` to a background executor CHAINED after the previous put (M3). One checkpoint per superstep per graph namespace (M11); NOT per task.
- **FAILURE_MODE (partial write):** Atomicity is per-row, not per-run. `put` is one `INSERT OR REPLACE` into `checkpoints`; `put_writes` are separate transactions (sqlite `cursor()` commits on close; postgres analogous). Crash scenarios: (1) writes persisted, checkpoint not yet: writes are orphaned (keyed to a checkpoint_id that never materializes); resume loads the previous checkpoint and re-executes those tasks (at-least-once). (2) checkpoint persisted, some writes lost: resume replays only the persisted pending_writes; tasks whose writes were lost re-execute. (3) The `_delta_write_futs` drain in `_checkpointer_put_after_previous` is the ONE cross-row invariant enforced: delta-channel writes are awaited before the checkpoint that derives from them is put, so an ancestor walk (M10/DeltaChannel) never sees a checkpoint without its backing writes. Everything else is best-effort ordering.
- **PING_EXISTING_ANALOG:** Best effort: PING's continuity fabric / event plane records events; unknown whether PING separates "committed snapshot" from "uncommitted step writes" as two addressable stores.
- **GAP:** If PING persists only an event stream, it lacks the coarse-snapshot + fine-write-log split that makes resume O(1) instead of O(history).
- **HARVEST_CLASS:** ADAPT. The two-level persistence (snapshot row + write-log rows keyed to the snapshot they follow) is the portable schema idea; the exact TypedDict is not.
- **FALSIFICATION:** Verified: Checkpoint TypedDict fields, create_checkpoint loop, _put_checkpoint submission chain, sqlite schema (two tables). Would be falsified if `put` and `put_writes` shared one transaction (they do not; separate `cursor()` contexts).
- **DEPENDENCIES:** checkpointer backend (M12), channels (M10), serde.
- **PORTABLE_WITHOUT_LANGGRAPH?:** YES. Needs: (1) a snapshot store keyed (thread, ns, snapshot_id) with parent pointers; (2) a write-log store keyed (thread, ns, snapshot_id, task_id, idx); (3) monotonic snapshot ids; (4) a drain-before-commit rule for any write the snapshot derivation depends on.

### M3 | ORDERED_BACKGROUND_PERSISTENCE + DURABILITY MODES
- **PROBLEM:** Checkpointing every step must not serialize execution, but checkpoints must still reach the store in order.
- **SOURCE:** `pregel/_loop.py` (`_checkpointer_put_after_previous`, `_put_checkpoint_fut`), `pregel/_executor.py` (BackgroundExecutor), `pregel/main.py` (`_defaults`, stream loop), `types.py` (Durability)
- **PINNED_SHA:** `7daa3ab49d678a5da75edb08baa87db4a2be52c3`
- **SOURCE_LOCATION:** `_loop.py` SyncPregelLoop._checkpointer_put_after_previous / AsyncPregelLoop variant; `_executor.py:40-100`; `main.py:2602-2603` (default), `main.py:2987` (sync wait), `types.py:98`
- **MATURITY:** Production for sync/async; `exit` mode is newer and carries the DeltaChannel stub machinery (lazy stub checkpoint in `_put_exit_delta_writes`), i.e. less battle-tested.
- **INVARIANT:** (a) Persistence never blocks the next superstep EXCEPT in `sync` mode: each `put` is submitted to a background executor chained on the previous put's future (`prev.result()` inside `try/finally` before `put`), so the saver ALWAYS receives checkpoints in order even though execution proceeds. (b) On clean exit, BackgroundExecutor.__exit__ waits for all submitted tasks and re-raises the first error, so `async` mode still drains before the process returns. (c) Durability ladder: `async` (DEFAULT, per main.py:2603) = background, ordered, drained at exit; `sync` = `loop._put_checkpoint_fut.result()` awaited after every `after_tick` (main.py:2987); `exit` = no per-step `put`/`put_writes` at all (guarded in `put_writes` and `_put_checkpoint` by `durability != "exit"`); writes accumulate in memory (`_exit_delta_writes`) and are flushed once in `_suppress_interrupt` at exit.
- **IMPLEMENTATION:** `_put_checkpoint`: `do_checkpoint = put_after_previous is not None and (exiting or durability != "exit")`. In exit mode, `_suppress_interrupt` (registered on the ExitStack in `__enter__`) calls `_put_exit_delta_writes()` then `_put_checkpoint(self.checkpoint_metadata)` then `_put_pending_writes()`.
- **FAILURE_MODE:** `async` crash = lose everything after the last COMPLETED background put (the chain guarantees prefix-durability, not recency). `exit` crash = lose the entire run. `sync` crash = lose at most the in-flight superstep. There is no fsync/JOURNAL guarantee beyond what sqlite WAL gives; "sync" means "before next step", not "durable on disk".
- **PING_EXISTING_ANALOG:** Best effort: unknown whether PING's mission execution has configurable durability tiers; the approval-card / mission-state writes are presumably synchronous.
- **GAP:** PING likely lacks an explicit durability ladder (per-step vs at-exit) with documented crash windows. For multi-day missions, `async`-with-ordered-drain is the interesting middle.
- **HARVEST_CLASS:** PATTERN_ONLY for the ladder; DIRECT_REUSE of the "ordered non-blocking write chain" idiom (chain futures; drain on exit) as a code pattern.
- **FALSIFICATION:** Verified: default is `"async"` (NOT `"sync"` as older docs suggest; falsifies the common claim "LangGraph checkpoints synchronously by default"). Verified the `prev.result()` chain and the exit-flush path.
- **DEPENDENCIES:** checkpointer backend, executor.
- **PORTABLE_WITHOUT_LANGGRAPH?:** YES. Needs a background writer, a future chain enforcing order, and an exit hook that drains the chain. ~30 lines.

### M4 | PENDING_WRITES_TABLE (write-ahead of the checkpoint)
- **PROBLEM:** Resume must not redo completed task work, and interrupt state must survive process death, even though checkpoints are only written per superstep.
- **SOURCE:** `libs/checkpoint/.../base/__init__.py` (WRITES_IDX_MAP, put_writes contract), sqlite `__init__.py` (put_writes), `_loop.py` (put_writes, _reapply_writes_to_succeeded_nodes, _put_pending_writes)
- **PINNED_SHA:** `7daa3ab49d678a5da75edb08baa87db4a2be52c3`
- **SOURCE_LOCATION:** `base/__init__.py` WRITES_IDX_MAP = {ERROR: -1, SCHEDULED: -2, INTERRUPT: -3, RESUME: -4}; sqlite `__init__.py:put_writes`; `_loop.py:424-500` (loop put_writes), `_loop.py` `_reapply_writes_to_succeeded_nodes`
- **MATURITY:** Production.
- **INVARIANT:** (a) Every task's writes are persisted under (thread_id, checkpoint_ns, checkpoint_id, task_id, idx) where checkpoint_id is the checkpoint that was current when the step STARTED, i.e. writes are keyed to the snapshot they FOLLOW. (b) Normal writes use INSERT OR IGNORE (same (task,idx) re-put is a no-op: idempotent under retry). (c) Control channels (ERROR, SCHEDULED, INTERRUPT, RESUME) use negative idx and INSERT OR REPLACE: last-write-wins for control signals. (d) On resume, `get_tuple` returns the checkpoint PLUS its pending_writes; `_first`/`tick` re-applies completed tasks' writes to the in-memory task objects so the runner skips them (`not t.writes` is the execute filter), while ERROR/ERROR_SOURCE_NODE/INTERRUPT/RESUME writes are deliberately NOT re-applied as task outputs (they are control state, routed separately).
- **IMPLEMENTATION:** Runner completion handler calls `loop.put_writes(task.id, task.writes)`; loop submits `checkpointer.put_writes` to background (unless durability=exit). On `__enter__`, `checkpoint_pending_writes` is rebuilt from the saver's rows. `_put_pending_writes` flushes any in-memory remainder at exit.
- **FAILURE_MODE:** Orphan writes (M2) are harmless but accumulate; `delete_thread`/`prune` must remove them (documented DeltaChannel caveat: pruning that drops intermediate writes silently corrupts delta-channel reconstruction, see M10). A task that wrote nothing gets a `(NO_WRITES, None)` marker so resume can distinguish "ran, no output" from "never ran".
- **PING_EXISTING_ANALOG:** Best effort: PING's event plane stores events; whether PING distinguishes committed snapshots from uncommitted per-step writes with separate addressability is unknown.
- **GAP:** Same as M2: without a write-log keyed to the following snapshot, PING resume would have to replay from the last snapshot and redo completed work.
- **HARVEST_CLASS:** ADAPT. The portable idea: separate the "uncommitted step writes" log from snapshots; key writes to the snapshot they follow; make normal writes insert-ignore idempotent and control signals last-write-wins.
- **FALSIFICATION:** Verified INSERT OR IGNORE vs OR REPLACE branch in sqlite put_writes, WRITES_IDX_MAP, and the skip-list in _reapply_writes_to_succeeded_nodes. Would be falsified if resume re-executed tasks that have persisted writes (it does not; the runner's execute filter is `not t.writes`).
- **DEPENDENCIES:** deterministic task ids (M6), checkpointer backend (M12).
- **PORTABLE_WITHOUT_LANGGRAPH?:** YES. Needs a key-value/table store with conditional-write semantics (put-if-absent + overwrite) and a resume path that re-attaches writes to task records.

### M5 | VERSION_WATERMARKS (channel_versions + versions_seen)
- **PROBLEM:** In a graph with parallel nodes and conditional edges, "which nodes should run next" must be computed from durable state alone, crash-safely.
- **SOURCE:** `pregel/_algo.py` (apply_writes, prepare_next_tasks, _triggers), `pregel/_loop.py` (tick interrupt gates), checkpoint base (get_next_version)
- **PINNED_SHA:** `7daa3ab49d678a5da75edb08baa87db4a2be52c3`
- **SOURCE_LOCATION:** `_algo.py:232-347` (apply_writes), `_algo.py:524+` (prepare_single_task, _triggers); `_loop.py:should_interrupt` import; `base/__init__.py:get_next_version` (default int increment)
- **MATURITY:** Production. This watermark scheme is the original Pregel-in-LangGraph design.
- **INVARIANT:** (a) Every channel carries a monotonic version, bumped to `max(all versions)+1` whenever the channel is written, consumed, or notified of a new step (`apply_writes`). (b) Every node records `versions_seen[node][channel]` = versions current when the node last ran. (c) A node triggers iff any trigger channel has `version > seen` (see `_triggers`). (d) `versions_seen` is part of the CHECKPOINT, so trigger computation is a pure function of durable state: resume recomputes the identical task set. (e) The INTERRUPT pseudo-node participates in the same watermark map, which is what makes interrupt_before/after gates one-shot (on resume, `_first` marks INTERRUPT as having seen all current versions).
- **IMPLEMENTATION:** `apply_writes`: for each task, update `versions_seen[task.name]` for its triggers; compute `next_version = get_next_version(max(versions))`; bump written/consumed/step-notified channels. `prepare_next_tasks` (not fully read, but `_triggers` in prepare_single_task) filters nodes by the watermark comparison. Channel version type is saver-configurable (int default; str/float allowed if monotonic; default `get_next_version` raises NotImplementedError for str, so custom savers must override).
- **FAILURE_MODE:** Version monotonicity is process-local (max+1); two writers to the same thread concurrently could fork versions (no fencing; sqlite lock serializes puts but version assignment happens in memory before put). Clock/ordering assumptions break under concurrent writers to one thread. Not designed for multi-writer.
- **PING_EXISTING_ANALOG:** Best effort: unknown. If PING schedules agent steps from an event log, the watermark pattern would replace ad-hoc "did this run" bookkeeping.
- **GAP:** PING has no documented per-consumer high-water-mark over versioned state channels (verify against PING internals).
- **HARVEST_CLASS:** PATTERN_ONLY. This is arguably the cleanest portable idea in the codebase: trigger = version > watermark; watermarks persisted with the snapshot.
- **FALSIFICATION:** Verified apply_writes version bumping, _triggers comparison, and _first's INTERRUPT watermark seeding. Would be falsified if trigger state lived outside the checkpoint (it does not; it IS the checkpoint).
- **DEPENDENCIES:** checkpoint payload (M2).
- **PORTABLE_WITHOUT_LANGGRAPH?:** YES. Needs monotonic version per state key + per-consumer watermark map persisted atomically with the state snapshot.

### M6 | DETERMINISTIC_TASK_IDS
- **PROBLEM:** After a crash, the resumed run must regenerate the SAME task identities so persisted writes match up and retries do not double-apply.
- **SOURCE:** `pregel/_algo.py` (prepare_single_task)
- **PINNED_SHA:** `7daa3ab49d678a5da75edb08baa87db4a2be52c3`
- **SOURCE_LOCATION:** `_algo.py:524-640`, specifically the PULL branch: `task_id = task_id_func(checkpoint_id_bytes, checkpoint_ns, str(step), name, PULL, *triggers)` where `task_id_func = _xxhash_str` for checkpoint v>1 (legacy `_uuid5_str` for v<=1)
- **MATURITY:** Production.
- **INVARIANT:** task_id = xxh3_128(checkpoint_id_bytes || checkpoint_ns || step || node_name || PULL || sorted_triggers). Same input checkpoint + step + node + triggers => same id, across processes and crashes. This is the idempotency key that makes M4's INSERT OR IGNORE correct and lets `_reapply_writes_to_succeeded_nodes` match persisted writes to regenerated tasks.
- **IMPLEMENTATION:** `checkpoint_id_bytes` = unhexlified CURRENT checkpoint id (the snapshot the step starts from); `checkpoint_ns` includes subgraph path; triggers sorted. PUSH tasks (Send) use analogous deterministic ids from (PUSH, path, write_idx, ...).
- **FAILURE_MODE:** Determinism assumes the checkpoint id is stable for a given logical step; a forked/time-traveled run gets a new checkpoint id, hence new task ids, so old writes do not collide (correct). Hash collisions are astronomically unlikely (128-bit) but not handled.
- **PING_EXISTING_ANALOG:** Best effort: PING has identity authority concepts; whether mission steps get deterministic ids from (mission_snapshot, step, node, triggers) is unknown.
- **GAP:** If PING uses random UUIDs per step attempt, resume cannot match prior attempts' artifacts; deterministic ids fix that.
- **HARVEST_CLASS:** PATTERN_ONLY. task_id = HASH(canonical task coordinates) is a 5-line portable idea.
- **FALSIFICATION:** Verified in prepare_single_task PULL branch. Would be falsified if ids used random UUIDs (they do not; legacy v<=1 used uuid5 which is also deterministic).
- **DEPENDENCIES:** checkpoint ids (M2), xxh3.
- **PORTABLE_WITHOUT_LANGGRAPH?:** YES. Needs a canonical serialization of task coordinates and a 128-bit hash.

### M7 | INTERRUPT_PRIMITIVE (human-in-the-loop pause inside a node)
- **PROBLEM:** A long-running agent must be able to stop mid-node, ask a human something, survive process death while waiting, and continue exactly where it stopped without redoing side effects that already happened.
- **SOURCE:** `langgraph/types.py` (interrupt(), Interrupt), `langgraph/errors.py` (GraphInterrupt), `pregel/_runner.py` (persistence on interrupt), `pregel/_loop.py` (_suppress_interrupt, _first), `pregel/_algo.py` (_scratchpad)
- **PINNED_SHA:** `7daa3ab49d678a5da75edb08baa87db4a2be52c3`
- **SOURCE_LOCATION:** `types.py:887-1000` (interrupt()); `errors.py:102` (GraphInterrupt); `_runner.py:585-596` (runner persists `(INTERRUPT, exception.args[0])` under task id on GraphInterrupt); `_loop.py:1320+` (_suppress_interrupt); `_algo.py:1280-1345` (_scratchpad resume matching)
- **MATURITY:** Production. `response_schema` on interrupt() is newer (commit `448a763`, "add response_schema to interrupt()"), the core raise/persist/resume protocol is mature.
- **INVARIANT:** (a) First call to `interrupt(value)` inside a task ALWAYS raises `GraphInterrupt((Interrupt(value, id, response_schema),))`; the id is deterministic: `xxh3_128_hexdigest(checkpoint_ns)` via `Interrupt.from_ns`. (b) The runner catches GraphInterrupt, persists `(INTERRUPT, (Interrupt,...))` as a pending write keyed to the task id (negative idx -3, INSERT OR REPLACE), does NOT treat it as failure (siblings are cancelled but no error is recorded), and re-raises a combined GraphInterrupt that unwinds the superstep. (c) `_suppress_interrupt` (ExitStack handler) persists the final checkpoint + pending writes, emits the interrupt on the stream, and SWALLOWS the exception at the root graph (returns True); subgraphs let it bubble as GraphBubbleUp. (d) On resume, the node RE-EXECUTES FROM THE START; `interrupt()` matches resume values POSITIONALLY via a per-task `interrupt_counter()` in the scratchpad: the n-th `interrupt()` call in the re-executed node returns the n-th resume value. Resume values arrive via (i) persisted task-specific RESUME writes from prior resumes, (ii) a one-shot null-task RESUME write produced from `Command(resume=...)`, consumed exactly once by `get_null_resume(consume=True)` which REMOVES it from pending_writes, or (iii) an id-keyed RESUME_MAP (`{xxh3_hexdigest: value}`) for multi-interrupt disambiguation (required when >1 pending interrupt, else RuntimeError). Each consumed value is re-persisted as `(RESUME, resume_list_so_far)` under the task id so multi-interrupt nodes keep earlier answers across re-fires.
- **IMPLEMENTATION:** `interrupt()` reads config scratchpad; `idx = scratchpad.interrupt_counter()`; if `scratchpad.resume` (from persisted/task writes) has idx-th value, validate against response_schema (TypeAdapter; raises pydantic.ValidationError on mismatch) and return it; elif null resume available, consume and return; else raise. Resume detection in `_first` treats `input=None`, any `Command`, or matching run_id as continuation.
- **FAILURE_MODE:** (1) The node re-executes fully: any side effect BEFORE the `interrupt()` call repeats on resume (no compensation/once-semantics; the docs example prints after resume, side-effect-free code is the user's responsibility). (2) Positional matching is brittle under code changes: adding an `interrupt()` earlier in the node shifts all indices. (3) Without a checkpointer, `put_writes` is a no-op and resume re-fires the interrupt (docs: checkpointer required). (4) `None` cannot be a resume value (indistinguishable from missing over HTTP).
- **PING_EXISTING_ANALOG:** Best effort: Nolan's approval-card mechanism is the functional analog (human approval gates in autonomous flows). Unknown whether approval state persists per-step interrupt payloads with deterministic ids and positional/id-keyed resume matching.
- **GAP:** If PING approval cards do not (a) persist the interrupt payload keyed to a deterministic step id, (b) re-attach the human's answer to the exact re-execution point, and (c) support multiple pending interrupts with id-keyed disambiguation, then M7 is the spec for that.
- **HARVEST_CLASS:** ADAPT. The protocol (raise resumable exception -> persist interrupt payload as a first-class write under deterministic task id -> re-execute node -> match answers positionally or by id -> re-persist consumed answers) is portable without any LangGraph code.
- **FALSIFICATION:** Verified: runner persistence branch, _suppress_interrupt swallow, scratchpad positional matching, RESUME_MAP requirement for multiple interrupts, response_schema validation. Would be falsified if resume continued the node mid-function (it does not; it restarts the node).
- **DEPENDENCIES:** M4 (pending writes), M6 (deterministic task ids), checkpointer.
- **PORTABLE_WITHOUT_LANGGRAPH?:** YES. Needs: (1) a resumable-exception type carrying a payload + deterministic id; (2) a write log keyed by deterministic step id; (3) a re-execution rule (restart step, match answers by index or id); (4) a gate that refuses multi-interrupt resume without ids.

### M8 | DECLARATIVE_INTERRUPT_GATES (interrupt_before / interrupt_after)
- **PROBLEM:** Operators want approval pauses at graph-structure points (before/after named nodes) without editing node code.
- **SOURCE:** `pregel/_loop.py` (tick, after_tick), `pregel/_algo.py` (should_interrupt)
- **PINNED_SHA:** `7daa3ab49d678a5da75edb08baa87db4a2be52c3`
- **SOURCE_LOCATION:** `_algo.py:155-190` (should_interrupt); `_loop.py` tick() ("before execution, check if we should interrupt") and after_tick() ("after execution, check if we should interrupt")
- **MATURITY:** Production.
- **INVARIANT:** Gate fires iff (a) ANY channel version advanced since `versions_seen[INTERRUPT]` (i.e., something changed since the last interrupt) AND (b) at least one prepared task's node is in the interrupt list (or `"*"`). `interrupt_before` raises a BARE `GraphInterrupt()` (empty args) before any task executes; `interrupt_after` raises after `after_tick` has applied writes and checkpointed. On resume, `_first` seeds `versions_seen[INTERRUPT]` with all current channel versions, so the gate is one-shot and does not immediately re-fire.
- **IMPLEMENTATION:** `should_interrupt(checkpoint, interrupt_nodes, tasks)` returns the matching task list (truthy => raise). In tick(), the raise happens after task preparation but before execution; tasks are simply prepared again on resume (same deterministic ids). Streamed as an updates event with the interrupt payload (empty for bare gates).
- **FAILURE_MODE:** `interrupt_before="*"` on a graph with an always-advancing channel (e.g. a tick counter) pauses every superstep, which is correct but operationally a livelock for autonomy. Bare gates carry no payload, so the resumer gets no context about WHY it paused beyond node names in the stream.
- **PING_EXISTING_ANALOG:** Best effort: approval cards may already cover named-gate pauses; unknown whether gates are one-shot via watermark seeding.
- **GAP:** If PING's gates re-fire on resume (no watermark seeding), M8's `_first` seeding is the fix pattern.
- **HARVEST_CLASS:** PATTERN_ONLY. Declarative before/after gates over named steps + one-shot via watermark is trivially portable.
- **FALSIFICATION:** Verified should_interrupt logic and the _first INTERRUPT-seeding block. Would be falsified if gates were evaluated on wall-clock or external state (they are pure functions of the checkpoint).
- **DEPENDENCIES:** M5 (watermarks).
- **PORTABLE_WITHOUT_LANGGRAPH?:** YES. Needs named steps + per-gate watermark.

### M9 | RESUME_AND_FORK (time travel without history rewrite)
- **PROBLEM:** "Resume from an older checkpoint" must not destroy the newer history it branches from; operators also need to edit state and fork (update_state).
- **SOURCE:** `pregel/_loop.py` (_first), `pregel/_checkpoint.py` (create_checkpoint_plan_for_update_state_api), `pregel/main.py` (get_state_history, update_state/bulk_update_state)
- **PINNED_SHA:** `7daa3ab49d678a5da75edb08baa87db4a2be52c3`
- **SOURCE_LOCATION:** `_loop.py` `_first` (is_resuming / is_time_traveling computation); `_checkpoint.py` `create_checkpoint_plan_for_update_state_api`; `main.py` get_state_history/update_state
- **MATURITY:** Production for resume; fork-on-time-travel and update_state are mature but have sharp edges (stale INTERRUPT write cleanup, RESUME write dropping on time travel).
- **INVARIANT:** (a) Resume addressing: `config["configurable"]["checkpoint_id"]` selects an EXACT checkpoint (is_replaying=True); absent, the latest for (thread_id, checkpoint_ns) is loaded. (b) Continuation is inferred: prior channel_versions non-empty AND (input is None OR input is Command OR CONFIG_KEY_RESUMING OR same run_id). (c) Time travel (replay from a non-head checkpoint that is NOT a resume) DROPS cached RESUME writes so `interrupt()` calls re-fire instead of returning stale answers, clears stale INTERRUPT writes (their task ids change under the new checkpoint id), and writes a `source="fork"` checkpoint so the replayed execution BRANCHES: parent pointers (`parent_config`, metadata.parents) preserve the old branch, `list()`/`get_state_history` still show it. (d) `update_state` writes a `source="update"` checkpoint applying values "as if from node as_node" (with as_node/task_id attribution), which also forks.
- **IMPLEMENTATION:** `_first` computes is_resuming and is_time_traveling with the nested-subgraph carve-outs (checkpoint_map lookup for subgraph replay). The fork checkpoint is written via `_put_checkpoint({"source": "fork"})` before re-applying input.
- **FAILURE_MODE:** Resuming with an explicit checkpoint_id that happens to equal the current head is treated as NOT time-traveling (is_time_traveling=False) to avoid breaking subgraph checkpoint resolution: a subtle but deliberate carve-out. Forgetting `as_node` on update_state when the last writer is ambiguous raises.
- **PING_EXISTING_ANALOG:** Best effort: PING's continuity fabric is meant to be agent-readable history; whether it supports branch-on-replay (fork) vs overwrite is unknown.
- **GAP:** If PING replays by mutating history in place, M9's fork-instead-of-overwrite is the correction.
- **HARVEST_CLASS:** PATTERN_ONLY. "Never rewrite history; replay creates a fork checkpoint with a parent pointer" is portable.
- **FALSIFICATION:** Verified the is_time_traveling predicate, the RESUME-write drop, and the fork write in _first. Would be falsified if replay overwrote the checkpoint row (it inserts a new row; sqlite uses INSERT OR REPLACE keyed by the NEW uuid6 id).
- **DEPENDENCIES:** M2 (checkpoint payload + parent pointers), M4.
- **PORTABLE_WITHOUT_LANGGRAPH?:** YES. Needs parent pointers on snapshots and a rule: replay-from-old-snapshot => new snapshot with parent = old snapshot.

### M10 | CHANNEL_REDUCERS (typed merge strategies for concurrent writes)
- **PROBLEM:** Parallel nodes write to shared state; "last writer wins" is wrong for accumulators and "append everything" is wrong for scalars.
- **SOURCE:** `langgraph/channels/*.py`, `pregel/_algo.py` (apply_writes grouping), `types.py` (Overwrite)
- **PINNED_SHA:** `7daa3ab49d678a5da75edb08baa87db4a2be52c3`
- **SOURCE_LOCATION:** `channels/base.py` (BaseChannel ABC: update/checkpoint/from_checkpoint/get/is_available/consume/finish); `channels/last_value.py`, `binop.py`, `topic.py`, `ephemeral_value.py`, `untracked_value.py`, `named_barrier_value.py`, `delta.py`; `_loop.py:put_writes` (UntrackedValue stripping)
- **MATURITY:** Production for LastValue/BinaryOperatorAggregate/Topic/EphemeralValue; DeltaChannel is explicitly BETA (docstrings warn the design "may change"); NamedBarrierValue is niche.
- **INVARIANT:** (a) Each state key declares a channel TYPE = merge strategy: LastValue (exactly one write per step wins; multiple => InvalidUpdateError unless guard=False... verified: LastValue.update raises on >1 values? I saw `update` at line 56; the EphemeralValue guard raises InvalidUpdateError on multiple with guard=True. For LastValue, multiple writes in one step raise InvalidUpdateError. I did not read LastValue.update body. HEDGE: LastValue rejects multiple writes per step.) (b) BinaryOperatorAggregate applies a reducer (e.g. operator.add) over all writes; `Overwrite(value=...)` bypasses the reducer and replaces (with a JSON-serializable discriminator so it survives the API server). (c) Topic accumulates lists across writers. (d) EphemeralValue holds the previous step's value and CLEARS on a step with no writes (`update([])` sets MISSING; verified in source). (e) UntrackedValue: writes are STRIPPED before persistence in `put_writes` (verified: `writes_to_save` filters `isinstance(self.specs.get(c), UntrackedValue)`), so it never reaches the checkpoint. (f) DeltaChannel (beta): checkpoints store only a `_DeltaSnapshot` blob every `snapshot_frequency` updates (or every 5000 supersteps max); intermediate checkpoints store NOTHING for the channel, and resume reconstructs via `get_delta_channel_history`: walk the parent chain accumulating `checkpoint_writes` until a seed snapshot is found, then `replay_writes`. Pruning, copying, or deleting in a way that breaks the ancestor chain SILENTLY reconstructs the channel as EMPTY (no error raised; documented in three separate docstring warnings in base/__init__.py).
- **IMPLEMENTATION:** `apply_writes` groups task writes by channel (sorted task order), calls `ch.update(vals)`; channels also get `consume()` (destructive read, e.g. Topic), `finish()` (end-of-run notification), and per-step `update(EMPTY_SEQ)` notification for untouched channels.
- **FAILURE_MODE:** (1) DeltaChannel + naive `prune(keep_latest)` = silent data loss (the loudest documented footgun in the codebase). (2) Reducer exceptions (e.g. non-associative ops under parallel writes) surface as InvalidUpdateError at apply time, AFTER tasks ran. (3) `finish()`/`consume()` semantics differ per channel; custom channels that get them wrong corrupt trigger computation.
- **PING_EXISTING_ANALOG:** Best effort: unknown whether PING has typed merge strategies for concurrent agent writes to shared mission state.
- **GAP:** If PING merges concurrent writes with a single implicit strategy, M10's channel taxonomy is the design input.
- **HARVEST_CLASS:** REPURPOSE for the taxonomy idea (merge-strategy-per-key is portable and valuable); WATCH for DeltaChannel (beta, sharp edges); REJECT the exact class hierarchy (coupled to Pregel internals).
- **FALSIFICATION:** Verified UntrackedValue stripping, EphemeralValue clear-on-empty-step, DeltaChannel snapshot/seed/walk design and its prune warnings. LastValue multi-write rejection NOT verified in code (hedged).
- **DEPENDENCIES:** M2 (checkpoint calls ch.checkpoint()/from_checkpoint()).
- **PORTABLE_WITHOUT_LANGGRAPH?:** YES for the taxonomy (a per-key merge function + a persist/not-persist flag + a clear-after-step flag covers 90%). NO for DeltaChannel as-is (needs the write-log + ancestor walk machinery).

### M11 | SUBGRAPH_NAMESPACES (hierarchical checkpoint streams)
- **PROBLEM:** Nested agent graphs need independent persistence that stays correlated with the parent's execution.
- **SOURCE:** `pregel/main.py` (get_state/_prepare_state_snapshot), `pregel/_loop.py` (__init__ ns handling), `pregel/_algo.py` (ReplayState)
- **PINNED_SHA:** `7daa3ab49d678a5da75edb08baa87db4a2be52c3`
- **SOURCE_LOCATION:** `main.py:1198-1240` (task_ns assembly: `f"{task.name}{NS_END}{task.id}"` prefixed by parent ns with NS_SEP); `_loop.py` __init__ (checkpoint_ns tuple parsing, checkpoint_map resolution); `_algo.py` ReplayState (parent passes replay checkpoint id so subgraphs resolve their own checkpoint from the parent's checkpoint_map)
- **MATURITY:** Production.
- **INVARIANT:** (a) Each subgraph invocation gets its OWN checkpoint stream: rows keyed (thread_id, checkpoint_ns, checkpoint_id) where checkpoint_ns = `parent_ns + NS_SEP + node_name + NS_END + task_id`. Same thread_id, separate streams. (b) The parent records `checkpoint_map` (ns -> checkpoint_id) in checkpoint metadata so time-travel can resolve which subgraph checkpoint corresponds to a parent checkpoint (ReplayState). (c) Interrupts in subgraphs bubble as GraphBubbleUp and are suppressed ONLY at the root graph. (d) A subgraph's checkpointer can be True (own persistent stream), False (disabled even if parent has one), None (inherit).
- **IMPLEMENTATION:** On `get_state(subgraphs=True)`, the parent assembles each subgraph task's ns and recurses. On resume/time-travel, the parent passes CONFIG_KEY_REPLAY_STATE so the subgraph looks up its checkpoint from the parent's map instead of "latest". `recast_checkpoint_ns` strips task ids when addressing a subgraph by name.
- **FAILURE_MODE:** Namespace explosion: one stream per subgraph TASK invocation (not per subgraph definition); long runs with many dynamic subgraphs create many streams. `copy_thread`/`prune` must handle all namespaces. Checkpoint_map staleness across forks is handled by the fork logic (M9) but is intricate.
- **PING_EXISTING_ANALOG:** Best effort: PING missions likely decompose into sub-missions; whether sub-mission state is namespaced under the parent mission id with correlated replay is unknown.
- **GAP:** If PING flattens sub-mission state into one stream, M11's (thread_id shared, ns separated, map for correlated replay) is the pattern.
- **HARVEST_CLASS:** PATTERN_ONLY. Hierarchical scopes as separate streams under one thread id + a parent-side map for correlated replay is portable.
- **FALSIFICATION:** Verified task_ns assembly and the True/False/None checkpointer inheritance. Would be falsified if subgraphs shared the parent's checkpoint rows (they do not; separate checkpoint_ns).
- **DEPENDENCIES:** M2, M9.
- **PORTABLE_WITHOUT_LANGGRAPH?:** YES. Needs hierarchical scope ids and a parent-held map from scope -> snapshot id.

### M12 | STORAGE_BACKENDS (two-table schema + serde)
- **PROBLEM:** The checkpoint/write-log abstractions need a concrete store with defined atomicity.
- **SOURCE:** `libs/checkpoint-sqlite/langgraph/checkpoint/sqlite/__init__.py`; `libs/checkpoint/langgraph/checkpoint/serde/*`
- **PINNED_SHA:** `7daa3ab49d678a5da75edb08baa87db4a2be52c3`
- **SOURCE_LOCATION:** sqlite `__init__.py:142-165` (DDL), `:387-440` (put), `:put_writes` (INSERT OR IGNORE vs OR REPLACE); serde: `checkpoint/serde/jsonplus.py`, `serde/base.py`, `serde/encrypted.py`
- **MATURITY:** Production (sqlite + postgres). The postgres backend was sampled only for concurrency primitives.
- **INVARIANT:** (a) Two tables: `checkpoints(thread_id, checkpoint_ns, checkpoint_id PK, parent_checkpoint_id, type, checkpoint BLOB, metadata BLOB)` and `writes(thread_id, checkpoint_ns, checkpoint_id, task_id, idx PK-part, channel, type, value BLOB)`. (b) WAL journal mode; a process-level `self.lock` serializes cursor use; each public method commits its own transaction (no multi-statement atomicity across put/put_writes). (c) "Latest" = `ORDER BY checkpoint_id DESC LIMIT 1`, valid ONLY because ids are monotonic uuid6. (d) Serde: `JsonPlusSerializer` = msgpack + `(type, blob)` typed envelope + pickle fallback for non-JSON-native objects; `EncryptedSerializer` wraps any serde; `with_allowlist` hardens msgpack deserialization against arbitrary types. (e) Metadata stored as JSON BLOB (with null-byte stripping for legacy compat).
- **IMPLEMENTATION:** `put`: single INSERT OR REPLACE. `put_writes`: executemany with OR IGNORE (normal) or OR REPLACE (special channels). `get_tuple`: fetch checkpoint row + all writes rows for that checkpoint_id ORDER BY task_id, idx; deserialize; return CheckpointTuple(config, checkpoint, metadata, parent_config, pending_writes).
- **FAILURE_MODE:** (1) "Latest" breaks if anyone writes non-monotonic ids. (2) Pickle fallback in serde is a deserialization risk (allowlist mitigates for msgpack path; pickle path is opt-in). (3) WAL + process lock: multi-process writers to one sqlite file serialize at the lock only within a process; cross-process relies on sqlite locking (fine) but the ORDER of puts across processes is not coordinated (version-fork risk from M5). (4) No TTL/eviction in the saver itself; threads accumulate until delete_thread/prune.
- **PING_EXISTING_ANALOG:** Best effort: PING's persistence layer is unknown to this lane; the two-table split is the portable part regardless.
- **GAP:** Verify what PING uses for mission state; if it is a single event table, the snapshot+log split (M2/M4) is the harvest.
- **HARVEST_CLASS:** ADAPT for the schema shape (snapshot table + write-log table, monotonic ids, typed serde envelope); REJECT sqlite specifics and the pickle fallback (do not reintroduce pickle deserialization into PING).
- **FALSIFICATION:** Verified DDL, put/put_writes SQL, WAL pragma, lock, and the ORDER BY latest query. Postgres sampled enough to confirm no LISTEN/NOTIFY-based coordination in the sampled regions.
- **DEPENDENCIES:** uuid6 monotonicity (M2), serde.
- **PORTABLE_WITHOUT_LANGGRAPH?:** YES for the schema/serde-envelope ideas. The exact DDL is coupled to LangGraph's Checkpoint TypedDict.

### M13 | STATE_HISTORY_AND_OBSERVABILITY (get_state, StateSnapshot, debug streams)
- **PROBLEM:** Operators and parent agents need to inspect, audit, and debug a run's trajectory without replaying it.
- **SOURCE:** `pregel/main.py` (get_state, get_state_history), `types.py` (StateSnapshot), `pregel/debug.py`, `pregel/_loop.py` (_emit)
- **PINNED_SHA:** `7daa3ab49d678a5da75edb08baa87db4a2be52c3`
- **SOURCE_LOCATION:** `main.py:1395-1470` (get_state), `types.py` StateSnapshot NamedTuple; `_loop.py:_emit` (stream modes: values, updates, checkpoints, tasks, debug, messages)
- **MATURITY:** Production.
- **INVARIANT:** (a) `get_state(config)` returns a StateSnapshot: values (channel values), next (nodes to run), config, metadata, created_at, parent_config, tasks (PregelTask tuples incl. error/interrupts), interrupts. With `subgraphs=True` it recurses per M11. (b) `get_state_history` lists CheckpointTuples via saver's `list()` (filter/before/limit), i.e. the parent chain is walkable. (c) The stream protocol emits `values` (full state), `updates` (per-node diffs), `checkpoints`/`tasks` (debug mode), and `messages` (LLM tokens) namespaced by checkpoint_ns; subgraph chunks are wrapped with their namespace when `subgraphs=True`.
- **IMPLEMENTATION:** `_prepare_state_snapshot` re-applies pending writes (null writes + optionally task writes) onto a hydrated channel set to present "current" state including uncommitted work. Stream emission is via a `StreamProtocol` callable keyed by mode; `DuplexStream` merges loop-level and config-level streams.
- **FAILURE_MODE:** `get_state` on a checkpoint with huge channel_values deserializes everything (no projection); debug streams can leak sensitive channel contents into logs.
- **PING_EXISTING_ANALOG:** Best effort: PING's "Oracle is the window" + agent-readable query layer is the analog surface; whether PING exposes per-step state snapshots with pending-write overlay is unknown.
- **GAP:** If PING's window shows only committed events, M13's "snapshot + pending writes overlay + task list + interrupts in one StateSnapshot" is the shape to copy.
- **HARVEST_CLASS:** PATTERN_ONLY. The StateSnapshot shape (values, next, tasks, interrupts, parent_config in one struct) is portable UI/API design.
- **FALSIFICATION:** Verified StateSnapshot fields and _prepare_state_snapshot's pending-write application. Would be falsified if get_state showed only the raw checkpoint (it overlays pending writes).
- **DEPENDENCIES:** M2, M4, M11.
- **PORTABLE_WITHOUT_LANGGRAPH?:** YES. Needs a read path that overlays the uncommitted write log on the latest snapshot.

### M14 | BASESTORE_LONGTERM_MEMORY (cross-thread namespaced memory)
- **PROBLEM:** Per-thread checkpoints are the wrong place for knowledge that must persist across missions/threads (user facts, business profiles, learned heuristics).
- **SOURCE:** `libs/checkpoint/langgraph/store/base/__init__.py`
- **PINNED_SHA:** `7daa3ab49d678a5da75edb08baa87db4a2be52c3`
- **SOURCE_LOCATION:** `store/base/__init__.py`: BaseStore ABC (lines 708+), Item/SearchItem (51+), ops: GetOp/SearchOp/PutOp/DeleteOp/ListNamespacesOp (157+), TTLConfig (545+), IndexConfig (578+)
- **MATURITY:** Production (InMemoryStore, sqlite, postgres backends exist; semantic search via IndexConfig is newer).
- **INVARIANT:** (a) Addressing is (namespace: tuple[str, ...], key: str); namespaces are hierarchical and listable (ListNamespacesOp with prefix/suffix match). (b) `batch(ops)` executes Get/Search/Put/Delete/ListNamespaces in ONE call returning order-matched results; atomicity is BACKEND-DEPENDENT (the ABC does not guarantee it). (c) Items carry value/created_at/updated_at; TTL per item with `refresh_on_read` defaulting True and `omit_expired`; TTLs refreshable on read. (d) `search()` supports filter dicts AND natural-language query (semantic search when the store is configured with an embedder via IndexConfig). (e) Checkpoints and store are SEPARATE systems: the checkpointer never stores to BaseStore; nodes access the store via Runtime, and store writes are NOT part of checkpoint resume (no rollback of memory writes on time travel).
- **IMPLEMENTATION:** Nodes receive `store` via Runtime context; typical use is `store.put(("memories",), key, value)` / `store.search(("memories",), query=...)`. Backends: InMemoryStore, sqlite (libs/checkpoint-sqlite), postgres.
- **FAILURE_MODE:** (1) Store writes are NOT transactional with checkpoints: a crashed-then-replayed run can double-apply memory writes (no idempotency key on put). (2) Batch atomicity varies by backend; code that assumes atomic batch is wrong on some backends. (3) TTL refresh-on-read default True can resurrect data the operator expected to expire if anything reads it.
- **PING_EXISTING_ANALOG:** Best effort: PING is itself described as "the canonical knowledge authority" with a continuity fabric; the BaseStore shape (namespaced keys, TTL, semantic search, batch ops) may already exist in PING's knowledge layer. VERIFY before harvesting.
- **GAP:** If PING's knowledge layer lacks TTL/refresh semantics or order-matched batch ops, those are the harvestable details; the big architectural warning (memory writes are NOT rolled back on time travel) applies to PING too if its memory and mission-state are separate systems.
- **HARVEST_CLASS:** REPURPOSE (if PING lacks it) / DELETE_OUR_NEED (if PING's knowledge authority already covers it; do not build a second memory system). The "memory writes are outside the checkpoint transaction" warning is DIRECT_REUSE as a design constraint.
- **FALSIFICATION:** Verified the ABC surface (ops, TTLConfig defaults, IndexConfig) and the checkpoint/store separation (no store reference in _put_checkpoint). Batch atomicity NOT verified per backend (marked UNKNOWN).
- **DEPENDENCIES:** backend store impl; embedder for semantic search.
- **PORTABLE_WITHOUT_LANGGRAPH?:** YES for the interface shape (namespaced KV + TTL + search + batch). The implementations are backend-specific.

### M15 | BASECACHE_TASK_MEMOIZATION (skip re-execution of deterministic steps)
- **PROBLEM:** After resume, re-executing expensive deterministic nodes (LLM calls, API fetches) wastes time/money even when their inputs are unchanged.
- **SOURCE:** `libs/checkpoint/langgraph/cache/base/__init__.py`, `pregel/_loop.py` (put_writes cache hook, match_cached_writes), `func/__init__.py` (cache_policy on tasks)
- **PINNED_SHA:** `7daa3ab49d678a5da75edb08baa87db4a2be52c3`
- **SOURCE_LOCATION:** `cache/base/__init__.py:15-45` (get/aget/set/aset/clear with (ns, key) FullKey + TTL); `_loop.py` SyncPregelLoop.put_writes (cache.set after success), match_cached_writes; `_loop.py` put_writes skips caching when `writes[0][0] in (INTERRUPT, ERROR)`
- **MATURITY:** Production (cache_policy on @task is established; the loop-level match_cached_writes integration is mature).
- **INVARIANT:** (a) Each task may carry a `CacheKey(ns: tuple, key: str, ttl: int|None)`; after a task completes SUCCESSFULLY, its writes are `cache.set({(ns,key): (writes, ttl)})` in the background. (b) Before execution, `match_cached_writes` looks up cache keys for tasks with no writes yet and, on hit, attaches the cached writes so the task is skipped (same `not t.writes` execute filter as M4). (c) INTERRUPT and ERROR writes are NEVER cached (only successful tasks). (d) Cache is keyed independently of checkpoints: a cached result can be reused across threads/runs sharing the key namespace.
- **IMPLEMENTATION:** In `SyncPregelLoop.put_writes`, after super().put_writes, if the task has a cache_key, submit `cache.set`. In `tick`/`accept_push`, `match_cached_writes` replays hits and emits them as cached outputs.
- **FAILURE_MODE:** Stale cache: if the cached function's dependencies changed without changing the key, resume silently reuses the old result (key design is the user's burden). TTL bounds staleness. Cache is not invalidated by checkpoint forks.
- **PING_EXISTING_ANALOG:** Best effort: unknown whether PING memoizes deterministic mission-step results across resumes.
- **GAP:** For multi-day missions, re-running expensive steps after every resume is a real cost; a result cache keyed by deterministic step id + input hash is the fix.
- **HARVEST_CLASS:** ADAPT. Portable: cache successful step outputs by (deterministic step id, input hash) with TTL; never cache failures/interrupts; replay cached outputs through the same "attach writes, skip execution" path as the write log.
- **FALSIFICATION:** Verified cache.set gating (task.cache_key, success only) and match_cached_writes replay. Would be falsified if cache hits bypassed the write-application path (they do not; they extend task.writes).
- **DEPENDENCIES:** M6 (deterministic identity; cache keys should derive from it), a cache backend.
- **PORTABLE_WITHOUT_LANGGRAPH?:** YES. Needs deterministic step ids + a TTL cache + the "cached writes attach like persisted writes" rule.

### M16 | ERROR_HANDLER_ROUTING (failure persistence without re-execution)
- **PROBLEM:** When a node fails and an error-handler node exists, resume must run the HANDLER, not re-run the failed node (which would likely fail the same way, or worse, double-apply partial side effects).
- **SOURCE:** `pregel/_runner.py` (error persistence), `pregel/_loop.py` (_resume_error_handlers_if_applicable, schedule_error_handler), `pregel/_algo.py` (prepare_node_error_handler_task)
- **PINNED_SHA:** `7daa3ab49d678a5da75edb08baa87db4a2be52c3`
- **SOURCE_LOCATION:** `_runner.py:585-620` (on exception: append (ERROR, exc); if routed to handler, also (ERROR_SOURCE_NODE, name)); `_loop.py` `_resume_error_handlers_if_applicable`; `_checkpointer_put_after_previous` drains `_error_handler_write_futs` before the checkpoint put (visibility: handler never starts before its trigger writes are durable)
- **MATURITY:** Newer than the core loop (error_handler_node on PregelNode); production but less battle-tested than interrupts.
- **INVARIANT:** (a) A failed task persists `(ERROR, exc)` AND `(ERROR_SOURCE_NODE, node_name)` under its task id (negative idx -1, replace semantics). (b) On resume, `_resume_error_handlers_if_applicable` scans pending writes for ERROR_SOURCE_NODE markers, marks the original task's writes non-empty (so the runner SKIPS it), and prepares a FRESH error-handler task (empty writes => it executes). (c) The handler is scheduled only after the error writes are confirmed durable (`_error_handler_write_futs` drained in schedule_error_handler). (d) Without an error handler node, the failed task simply re-executes on resume (ERROR write is control state, not re-applied as output).
- **IMPLEMENTATION:** `schedule_error_handler` / `aschedule_error_handler` build the handler task via `prepare_node_error_handler_task` with the failed error injected; `_handled_exception_ids` prevents double-handling in _panic_or_proceed.
- **FAILURE_MODE:** The exception object itself is serialized into the write log (serde must handle it; pickled tracebacks are a known serde edge). If the handler ALSO fails, the failure cascades per normal error rules.
- **PING_EXISTING_ANALOG:** Best effort: unknown whether PING mission steps have typed error-handler routing vs blind retry.
- **GAP:** "Persist the failure marker; on resume route to the handler instead of re-executing" is a concrete improvement over retry-loops for multi-day missions.
- **HARVEST_CLASS:** ADAPT. Portable as: failure record (step id, error, source node) in the write log + resume rule (failed step with handler => schedule handler, mark original skipped).
- **FALSIFICATION:** Verified the ERROR/ERROR_SOURCE_NODE write pair, the skip-marking, and the durability drain before handler scheduling. Would be falsified if resume re-ran failed tasks even with handlers configured (it does not).
- **DEPENDENCIES:** M4 (write log), M6 (task ids).
- **PORTABLE_WITHOUT_LANGGRAPH?:** YES. Needs the failure-marker convention and the resume routing rule.

---

## 3. Portable-without-LangGraph verdicts

| Mechanism | Portable? | What it would take (without LangGraph) |
|-----------|-----------|----------------------------------------|
| M1 Superstep loop | YES | Step scheduler: collect per-step results, merge in canonical order, commit once per step. No framework needed. |
| M2 Checkpoint payload | YES | Snapshot store (thread, scope, snapshot_id, parent ptr) + per-key serialized state + per-consumer watermarks in the same row. |
| M3 Ordered background persistence + durability ladder | YES | Background writer + future chain for order + exit drain; config flag choosing per-step-sync / background / at-exit. ~30-50 lines. |
| M4 Pending-writes log | YES | Write-log table keyed (thread, scope, snapshot_id, task_id, idx); put-if-absent for data, overwrite for control signals; resume re-attaches. |
| M5 Version watermarks | YES | Monotonic version per state key + per-consumer watermark map persisted with the snapshot; trigger = version > watermark. |
| M6 Deterministic task ids | YES | HASH(snapshot_id, scope, step, node, triggers). 5 lines + a canonical encoding. |
| M7 interrupt() protocol | YES | Resumable-exception type + persist payload under deterministic step id + restart-step + positional/id answer matching. |
| M8 Declarative before/after gates | YES | Named steps + gate list + one-shot watermark seeding on resume. |
| M9 Resume + fork (no history rewrite) | YES | Parent pointers on snapshots; rule: replay-from-old => new snapshot with parent = old. |
| M10 Channel reducers | YES (taxonomy) | Per-key merge function + persist flag + clear-after-step flag. DeltaChannel's ancestor-walk variant: NO without the write log. |
| M11 Subgraph namespaces | YES | Hierarchical scope ids under one thread id + parent-side scope->snapshot map for correlated replay. |
| M12 Two-table schema + typed serde | YES (schema) | Snapshot table + write-log table + monotonic ids + (type, blob) envelope. REJECT the pickle fallback. |
| M13 StateSnapshot shape | YES | Read path overlaying uncommitted writes on latest snapshot; one struct with values/next/tasks/interrupts/parent. |
| M14 BaseStore memory | YES (interface) | Namespaced KV + TTL + search + batch; backends vary. Check PING's existing knowledge layer first (DELETE_OUR_NEED if covered). |
| M15 Task memoization | YES | Cache successful step outputs by (deterministic step id, input hash) + TTL; never cache failures/interrupts. |
| M16 Error-handler routing | YES | Failure-marker convention in the write log + resume rule routing to handler instead of re-execution. |

**Net assessment:** Nothing in LangGraph's durable-execution machinery requires LangGraph. The portable core is a small set of ideas: (1) superstep batching with canonical merge order (M1/M10), (2) snapshot + write-log split with monotonic ids (M2/M4/M12), (3) version watermarks for trigger computation (M5), (4) deterministic task ids as idempotency keys (M6), (5) interrupts as persisted first-class writes with restart-and-match resume (M7), (6) fork-on-replay (M9), (7) ordered background persistence with a durability ladder (M3), (8) failure-marker + handler routing (M16), (9) memoization of successful steps (M15). The framework-coupled parts are the PregelNode/Runnable/Channel class hierarchy, the LangChain config plumbing, and the DeltaChannel beta machinery (which carries a documented silent-corruption footgun and should be WATCH-listed, not copied).

---

## 4. Open questions (falsification backlog)

1. **Multi-writer threads:** Version assignment (`max+1`) happens in memory before `put`; two processes writing to one thread_id can fork versions. Is there any fencing (advisory locks, compare-and-swap) in the postgres backend I did not read? Sampled regions showed none. UNKNOWN: full postgres `put` implementation not read.
2. **`pending_sends` discrepancy:** `BaseCheckpointSaver.copy_checkpoint` (base/__init__.py) preserves `pending_sends`, but the pregel `copy_checkpoint` (pregel/_checkpoint.py, the one actually used in `_put_checkpoint`) DROPS it. `main.py:1138` migrates `pending_sends` -> TASKS channel only for checkpoint v<4. Net effect: pending_sends is effectively dead in v4. Confirm no live writer of pending_sends remains.
3. **LastValue multi-write:** I did not read `LastValue.update`; the claim "multiple writes per step raise" is hedged. Verify before citing.
4. **Batch atomicity (BaseStore):** the ABC does not guarantee atomic batch; per-backend behavior (sqlite/postgres/memory) not verified. Do not assume.
5. **Postgres LISTEN/NOTIFY / advisory locks:** not found in sampled regions; full-file read needed to close this.
6. **Durability "sync" vs OS durability:** "sync" awaits the put future before the next step; it does NOT imply fsync. Crash windows documented in M3 assume the DB's own durability.
7. **Interrupt id stability:** `Interrupt.id = xxh3(checkpoint_ns)` where ns EXCLUDES the task id (from_ns uses CONFIG_KEY_CHECKPOINT_NS, not task_checkpoint_ns), while RESUME_MAP lookup uses `xxh3(task_checkpoint_ns)`. The exact join between surfaced interrupt ids and resume-map keys needs a live trace to confirm; the multi-interrupt resume path is the least-verified mechanism here.
8. **PING analogs:** every PING_EXISTING_ANALOG above is best-effort from standing context, NOT from reading PING internals. A follow-up lane should diff each harvested pattern against the actual PING continuity/event/memory implementation before any design work.
9. **JS port parity:** `sdk-js` exists in the monorepo; this lane inspected only the Python implementation. If PING ever touches the JS SDK surface, re-verify.

---

*End of LANE-7 report. All mechanism claims cite code at pinned SHA `7daa3ab49d678a5da75edb08baa87db4a2be52c3`.*
