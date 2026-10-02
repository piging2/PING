# LANE 5: Restate Durable Execution - Mechanism Archaeology

Role: mechanism archaeologist. Research / falsification / harvest only.
No adoption proposals. No implementation code.

Date: 2026-09-23
Analyst: Pigi (subagent, lane 5)

## 1. Sources

| Source | Location | Pin | Vintage |
|---|---|---|---|
| Restate server source | https://github.com/restatedev/restate | commit `54e1e0a2d88af4cdefe297087c61531bd427c91d` (2026-09-23, version 1.8.0-dev, post-1.7.0) | read 2026-09-23 |
| Restate docs (llms.txt index) | https://docs.restate.dev/llms.txt | live docs, current as of 2026-09-23 | read 2026-09-23 |
| Restate docs: Key Concepts | https://docs.restate.dev/foundations/key-concepts | live | read 2026-09-23 |
| Restate docs: Actions | https://docs.restate.dev/foundations/actions | live | read 2026-09-23 |
| Restate docs: Invocations | https://docs.restate.dev/foundations/invocations | live | read 2026-09-23 |
| Restate docs: Durable Steps (TS) | https://docs.restate.dev/develop/ts/durable-steps | live | read 2026-09-23 |
| Restate docs: Managing Invocations | https://docs.restate.dev/services/invocation/managing-invocations | live | read 2026-09-23 |
| Restate docs: Service Configuration | https://docs.restate.dev/services/configuration | live | read 2026-09-23 |
| Restate 1.7.0 release notes (idempotent sharding) | https://github.com/restatedev/restate/blob/HEAD/release-notes/v1.7.0.md | live | read 2026-09-23 |
| Kafka ingress integration notes (external repo) | https://github.com/restatedev/ingress-integration-kafka/blob/HEAD/CLAUDE.md | live | read 2026-09-23 |

Local checkout used for source verification: `/tmp/restate-src` at the pinned SHA
(all file paths below are relative to the repo root at that SHA).
Ephemeral by design; re-clone and `git checkout 54e1e0a2d88af4cdefe297087c61531bd427c91d` to reproduce.

## 2. Mechanisms (canonical format)

### REST-JOURNAL - The journal: what is actually recorded

- MECHANISM_ID: REST-JOURNAL
- PROBLEM: Crash-safe resume of handler execution without re-running completed steps.
- SOURCE: Restate docs (Key Concepts: "Durable Execution"; TS Durable Steps) + source.
- PINNED_SHA: `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- SOURCE_LOCATION: `crates/types/src/journal/raw.rs` (EntryHeader enum); `crates/types/src/journal_v2/command.rs` (v2 commands); `crates/types/src/journal_v2/notification.rs` (completions)
- MATURITY: Production. Journal v2 is the current default (migration path from v1 introduced in 1.6; `use_journal_v2_as_default` feature flag in `crates/worker/src/partition/state_machine/mod.rs`).
- INVARIANT: Every externally-observable step of a handler is recorded as a journal entry, either as a *command* (what was requested) plus a *completion* (what resulted), or as a self-contained record. Replay replays recorded results; it never re-derives them.
- IMPLEMENTATION: The journal entry taxonomy is closed and explicit. Commands journaled: `Input`, `Output`, `GetState`, `SetState`, `ClearState`, `GetStateKeys`, `ClearAllState`, `GetPromise`, `PeekPromise`, `CompletePromise`, `Sleep`, `Call` (request-response RPC), `OneWayCall` (fire-and-forget), `Awakeable`, `CompleteAwakeable`, `Run` (arbitrary user closure), `CancelInvocation`, `GetCallInvocationId`, `AttachInvocation`, `GetInvocationOutput`, `Custom`. Each completion-carrying entry has an `is_completed` flag; `mark_completed()` flips it when the completion lands. Completions arrive as separate records (`RunCompletion`, `CallCompletion`, etc. in `journal_v2/notification.rs`). Journal entries live in the partition's journal table in RocksDB, keyed by (invocation_id, entry_index); entry indices are strictly sequential (the state machine asserts `entry_index == journal_metadata.length` in `handle_journal_entry`, `crates/worker/src/partition/state_machine/mod.rs`).
- FAILURE_MODE: The journal records *results*, not *effects*. An entry whose command executed in the outside world but whose completion never reached the journal is indistinguishable from "never ran". See REST-RUN.
- PING_EXISTING_ANALOG: Best effort, unverified. PING has an event/evidence plane (Oracle is the window, PING is the canonical knowledge authority), but no known closed taxonomy of journaled execution steps with sequential indices and replay semantics.
- GAP: PING has no equivalent of "replay this invocation from its journal"; agent runs are not resumable from a step journal today.
- HARVEST_CLASS: ADAPT
- FALSIFICATION: "Restate journals every handler step" is true only for steps expressed through the SDK journaled actions (`ctx.run`, `ctx.call`, `ctx.get/set`, `ctx.sleep`, awakeables). Plain uninstrumented code inside the handler (local computation, direct HTTP calls not wrapped in `ctx.run`) is NOT journaled and re-executes silently on retry. The docs are honest about this (Durable Steps: "Non-deterministic operations ... must be wrapped"), but the headline claim reads broader than the mechanism.
- DEPENDENCIES: Service protocol v4 (SDK sends entries); invoker-impl (forwards effects); partition processor (appends + applies).

### REST-REPLAY - Deterministic replay on retry

- MECHANISM_ID: REST-REPLAY
- PROBLEM: After a crash or retry, continue execution without redoing completed work.
- SOURCE: Docs (Key Concepts) + source.
- PINNED_SHA: `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- SOURCE_LOCATION: `crates/invoker-impl/src/invocation_task/service_protocol_runner_v4.rs` (replay loop); `crates/worker/src/partition/state_machine/mod.rs` (`handle_journal_entry`, `forward_completion`)
- MATURITY: Production.
- INVARIANT: On retry, the partition processor streams the stored journal to the SDK; the SDK re-executes handler code from the top, and every journaled action whose completion is already recorded is short-circuited with the recorded result. Only uncompleted tail entries execute for real.
- IMPLEMENTATION: The invoker replays entries in index order. Completed entries are delivered to user code as immediate results. The SDK must be deterministic between replays except at journaled actions (same code path, same journaled results). Non-determinism that changes the *sequence* of journaled actions (e.g., branching on wall-clock time or unjournaled randomness) causes a replay mismatch: "non-determinism errors" (docs, Managing Invocations: resume on a different deployment warns of exactly this).
- FAILURE_MODE: Replay assumes code determinism. A handler that calls `Math.random()` directly (not `ctx.rand`) or reads the clock directly diverges on replay and fails loudly rather than silently corrupting. Silent divergence is prevented by failing, but the failure mode is "invocation errors out", not "continues".
- PING_EXISTING_ANALOG: None known. Agent runs do not replay.
- GAP: Same as REST-JOURNAL.
- HARVEST_CLASS: PATTERN_ONLY (deterministic replay is a big architectural commitment; the harvestable pattern is the failure semantic: divergence fails loudly instead of corrupting silently).
- FALSIFICATION: "Resumes exactly where it left off" is true at *journal-entry granularity*, not instruction granularity. All unjournaled computation between the last completed entry and the crash is redone, including any external effects inside an uncompleted `ctx.run`. The resume point is the journal tail, not the crash point.
- DEPENDENCIES: REST-JOURNAL; SDK cooperation.

### REST-DEDUP-INGRESS - Invocation deduplication by invocation ID

- MECHANISM_ID: REST-DEDUP-INGRESS
- PROBLEM: Duplicate delivery of the same logical request (retried HTTP, redelivered Kafka record, retried outbox message) must not create duplicate executions.
- SOURCE: Source (`handle_duplicated_requests`).
- PINNED_SHA: `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- SOURCE_LOCATION: `crates/worker/src/partition/state_machine/mod.rs` (~lines 727-740, 1036-1130)
- MATURITY: Production.
- INVARIANT: For a given invocation ID, at most one invocation record is ever created per partition. A second arrival with the same ID is collapsed: if in-flight, the new response sink is attached (or a submit notification is returned); if completed and within retention, the stored result is returned.
- IMPLEMENTATION: On `on_service_invocation`, step 1 is `handle_duplicated_requests`, which looks up the invocation ID in the invocation status table. `Free` means new; anything else means duplicate. For duplicates of in-flight invocations, the caller's response sink is appended to the existing record. For completed invocations, the stored `ResponseResult` is replayed to the new sink, subject to retention (see REST-RETENTION-PURGE).
- FAILURE_MODE: Dedup is by ID, not by semantic content. Two different requests that hash to the same ID (or a client reusing an idempotency key for a *different* payload) are treated as the same invocation; the second gets the first's result. This is by design (idempotency keys are caller-scoped), but it is a footgun: key reuse across different operations silently returns stale results.
- PING_EXISTING_ANALOG: Best effort, unverified. PING has idempotency-ish dedup in the outreach engine (duplicate-emission guard) but no general invocation-ID-keyed dedup table for agent actions.
- GAP: No content-addressed or caller-scoped dedup primitive for agent tool calls.
- HARVEST_CLASS: ADAPT (deterministic-ID + status-table dedup is a small, portable pattern).
- FALSIFICATION: Dedup does not make the *operation* idempotent; it makes the *invocation record* single. If the first attempt's side effects happened outside the journal (see REST-RUN), the "deduped" retry still returns the first result while the outside world may have seen the effect twice.
- DEPENDENCIES: Deterministic invocation ID generation (REST-IDEMPOTENCY-KEY, REST-WORKFLOW-RUNONCE); invocation status table.

### REST-EO-RPC - Journaled service-to-service calls ("no duplicates")

- MECHANISM_ID: REST-EO-RPC
- PROBLEM: A handler calling another Restate service must not cause the callee to execute twice when the caller retries.
- SOURCE: Docs (Key Concepts: "Resilient Communication: No duplicates: Same call won't execute twice") + source.
- PINNED_SHA: `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- SOURCE_LOCATION: `crates/invoker-impl/src/invocation_task/service_protocol_runner_v4.rs` (~line 1653, `InvocationId::generate` for the `CallRequest`); `crates/worker/src/partition/state_machine/entries/call_commands.rs` (`_ApplyCallCommand`: journal append + outbox enqueue in one apply); `crates/types/src/identifiers.rs` (~lines 293-360, deterministic ID rules)
- MATURITY: Production.
- INVARIANT: A journaled `Call` produces exactly one callee invocation per journal entry, across all retries of the caller.
- IMPLEMENTATION: On first execution of the call, the invoker generates the callee invocation ID (`InvocationId::generate(target, idempotency_key)`; random ULID when no key) and stores the full `CallRequest`, including that ID, as the journal command. The partition processor applies the command atomically: journal entry persisted AND `InvokeCommand` enqueued to the outbox in the same state-machine apply. On caller retry, the journaled command is replayed, not regenerated, so the callee ID is stable. The callee's partition dedups by that ID (REST-DEDUP-INGRESS). Outbox redelivery after a crash is therefore harmless.
- FAILURE_MODE: The guarantee covers *invocation creation*, i.e., the callee handler runs once per journaled call. It does NOT cover the callee's own external side effects: if the callee crashes inside a `ctx.run` before journaling its completion, the callee retries and re-executes its own run block (see REST-RUN). So "the call won't execute twice" is true of the call *record*; the callee's external effects are still at-least-once.
- PING_EXISTING_ANALOG: None. Agent-to-agent or agent-to-tool calls have no journaled callee-ID mechanism.
- GAP: Same as above.
- HARVEST_CLASS: ADAPT (the journaled-callee-ID pattern is the portable core: generate the downstream operation ID once, journal it with the intent, dedup downstream by ID).
- FALSIFICATION: The docs' "Same call won't execute twice" is exactly-once *invocation*, not exactly-once *effect*. The boundary is the journal: everything inside Restate's journal is exactly-once; everything the handler does outside it (HTTP calls, DB writes in `ctx.run`) is at-least-once with result-dedup.
- DEPENDENCIES: REST-JOURNAL; REST-DEDUP-INGRESS; outbox delivery.

### REST-RUN - ctx.run: the exactly-once boundary (falsification centerpiece)

- MECHANISM_ID: REST-RUN
- PROBLEM: Wrap arbitrary non-deterministic work (HTTP calls, DB writes) so its *result* is durable across retries.
- SOURCE: Docs (TS Durable Steps) + source.
- PINNED_SHA: `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- SOURCE_LOCATION: `crates/types/src/journal_v2/command.rs` (~lines 330-334, `RunCommand { completion_id, name }` carries no payload, only identity); `crates/types/src/journal_v2/notification.rs` (~lines 287-295, `RunCompletion { completion_id, result }`); docs https://docs.restate.dev/develop/ts/durable-steps
- MATURITY: Production.
- INVARIANT: The *result* of a `ctx.run` closure is recorded exactly once in the journal and reused on every replay. The *execution* of the closure is at-least-once.
- IMPLEMENTATION: `RunCommand` journals only the step's identity (name + completion id). The closure executes in user code (SDK side); the SDK sends a `RunCompletion` with the serialized result (or failure). The partition processor marks the entry completed. On retry, the completed entry short-circuits: the closure does not re-execute.
- FAILURE_MODE (the documented hole): if the closure's external effect happens (e.g., a charge is captured, an email is sent, a row is written) and then the process crashes, times out, or the completion is lost before it is journaled, the retry re-executes the closure and the external effect happens again. There is no distributed transaction between the outside world and the journal. Restate's own docs push the mitigation to the user: make run blocks idempotent (deterministic idempotency keys via `ctx.rand.uuidv4()`, which is journaled and stable across retries, per the Durable Steps page) and use the per-`ctx.run` retry policy + `TerminalError` + saga compensation guides. Also: the inactivity timeout (60s default) can abort a long-running `ctx.run` and retry it, re-executing the effect, if timeouts are misconfigured.
- PING_EXISTING_ANALOG: Best effort, unverified. Agent tool calls today have no result journal; a crashed agent run redoes tool calls blindly. PING's evidence plane records *that* things happened, not results keyed for replay.
- GAP: No "record the tool result, reuse on retry" primitive.
- HARVEST_CLASS: ADAPT (result-journaling for tool calls is directly portable; the falsification is the lesson: journal the result, never claim the effect).
- FALSIFICATION: This is where "exactly-once" dies. Restate's durable execution is exactly-once *result recording* with at-least-once *effect execution*. Any reading of the marketing as "your side effects happen once" is false, and the failure window (effect done, completion not journaled) is inherent, not a bug. The system is honest in the SDK docs but the headline claim invites the misreading.
- DEPENDENCIES: REST-JOURNAL; SDK result serialization.

### REST-VO-LOCK - Virtual object single-writer lock + inbox

- MECHANISM_ID: REST-VO-LOCK
- PROBLEM: Serialize state mutations per entity key without the user writing locking code.
- SOURCE: Docs (Key Concepts: "Consistent State: Single-writer guarantee") + source.
- PINNED_SHA: `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- SOURCE_LOCATION: `crates/worker/src/partition/state_machine/mod.rs` (`handle_service_invocation_exclusive_handler`, ~lines 1176-1240; inbox drain + unlock ~lines 3270-3320); `crates/types/src/invocation/mod.rs` (~lines 93-97, `VirtualObjectHandlerType::{Exclusive, Shared}`)
- MATURITY: Production.
- INVARIANT: At most one *exclusive* handler invocation holds the lock for a given virtual object key at a time; concurrent exclusive invocations are queued in a per-key inbox and run sequentially in arrival order.
- IMPLEMENTATION: Exclusive invocation for key K: if `VirtualObjectStatus::Locked`, the invocation is parked in the inbox (`InvocationStatus::Inboxed`) with a sequence number; else the key is locked to this invocation ID. On invocation end, the inbox is drained: the next inboxed invocation takes the lock, or the key is set `Unlocked`. Lock state lives in the partition's RocksDB, mutated in the same state-machine applies as everything else, so it survives failover.
- FAILURE_MODE: (1) The guarantee applies ONLY to exclusive handlers. `Shared` handlers run concurrently with each other and with the lock held; the docs' "Only one handler can modify state at a time" is enforced by convention (shared handlers are supposed to be read-only) plus `can_write_state` precondition checks in the invoker, but a shared handler calling external mutating services is unserialized by design. (2) `kill` explicitly "does not guarantee consistency for virtual object instance state" (docs, Managing Invocations): killing the lock holder can leave the key locked or state half-mutated; recovery is manual. (3) Exclusive is the default handler type, so the common case is safe, but the existence of the shared escape hatch means "single-writer" is a per-handler-type property, not a per-object property.
- PING_EXISTING_ANALOG: Best effort, unverified. No per-key serialized execution primitive known in PING; agent concurrency control is not a solved area.
- GAP: No keyed single-writer primitive for agent-owned state.
- HARVEST_CLASS: PATTERN_ONLY (the lock+inbox-in-the-same-state-machine pattern; PING is not a partitioned stream processor).
- FALSIFICATION: "Single-writer guarantee: only one handler can modify state at a time, preventing race conditions" is true only for exclusive handlers and only while nobody uses kill. The shared-handler type and the kill caveat are the documented exceptions that bound the claim.
- DEPENDENCIES: Partitioned key space (key K always routes to the same partition); inbox table; invocation lifecycle.

### REST-STATE-JOURNAL - State writes applied by the engine

- MECHANISM_ID: REST-STATE-JOURNAL
- PROBLEM: Keep key-value state consistent with execution progress across crashes ("State is never out of sync with the execution").
- SOURCE: Docs (Key Concepts) + source.
- PINNED_SHA: `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- SOURCE_LOCATION: `crates/worker/src/partition/state_machine/entries/set_state_command.rs` (apply writes `put_user_state` in the partition); `crates/types/src/journal/raw.rs` (`SetState`/`ClearState` headers carry `is_completed: None`, i.e., they are applied, not completed)
- MATURITY: Production.
- INVARIANT: State mutations expressed via `ctx.set`/`ctx.clear` are applied exactly once by the partition processor in the same atomic apply as the journal append. There is no window where the journal says "done" and the state disagrees, or vice versa.
- IMPLEMENTATION: Unlike `Run` (executed by user code), `SetState` is executed by the engine: the SDK sends the command, the partition processor's apply writes both the journal entry and the user-state key in one RocksDB batch. `GetState` is similar: the engine reads state and writes the completion itself. This is the strongest exactly-once in the system because the effect and the record are the same write.
- FAILURE_MODE: Only covers state inside Restate's embedded K/V store. State in external databases (written via `ctx.run`) gets the weaker REST-RUN guarantee. Also, state writes are visible to subsequent `ctx.get` within the same invocation only through the journaled read path.
- PING_EXISTING_ANALOG: None. No engine-applied state primitive.
- GAP: Same.
- HARVEST_CLASS: PATTERN_ONLY (the insight: make the record and the effect the same atomic write wherever possible; push side effects to the edges).
- FALSIFICATION: "State is never out of sync with the execution" is true for Restate-managed K/V state and does not extend to any external store. The docs' state-vs-database guide exists precisely because users keep misreading this.
- DEPENDENCIES: REST-JOURNAL; partition RocksDB.

### REST-AWAKEABLE - Durable promises / external signals

- MECHANISM_ID: REST-AWAKEABLE
- PROBLEM: Suspend execution until an external event (human approval, webhook, payment callback) without polling and without losing place.
- SOURCE: Docs (Actions; Key Concepts "Suspensions on FaaS") + source.
- PINNED_SHA: `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- SOURCE_LOCATION: `crates/worker/src/partition/state_machine/entries/complete_awakeable_command.rs`; `crates/worker/src/partition/state_machine/mod.rs` (~lines 4960-4985, double-completion handling); `crates/worker/src/partition/state_machine/lifecycle/suspend.rs` (`OnSuspendCommand`)
- MATURITY: Production.
- INVARIANT: An awakeable is identified deterministically (invocation ID + entry index), so the external resolver can retry resolution safely; the first completion wins and later ones are ignored with a warning.
- IMPLEMENTATION: `ctx.awakeable()` journals an `Awakeable` entry and returns an ID the outside world can resolve via HTTP. The invoker suspends the invocation (releasing its slot; on FaaS the function can actually suspend and stop billing) until the completion arrives as an `InvocationResponseCommand`/signal. On resolve, the completion is journaled and the invocation resumes. Double resolution: "Trying to complete an awakeable already completed. Ignoring this completion ... We'll use only the first completion, because changing the awakeable result after it has been completed for the first time can cause non-deterministic execution."
- FAILURE_MODE: First-wins is silent for the loser: if two different systems resolve the same awakeable with different values (or a retried webhook delivers a superseded value), the second value is dropped with only a warn log. There is no compare-and-set or version check on resolution. Also, an awakeable that is never resolved leaves the invocation suspended indefinitely (no default timeout; the user must add `.orTimeout`).
- PING_EXISTING_ANALOG: Best effort, unverified. PING has hooks (event-driven automations) and approval cards, but no durable "suspend this run until an external signal arrives, then resume from the journal" primitive.
- GAP: Durable suspension/resumption of agent runs on external events.
- HARVEST_CLASS: ADAPT (awakeable-as-addressable-pending-result is portable even without the stream processor).
- FALSIFICATION: Awakeables give exactly-once *result recording* for external signals, not exactly-once *signaling*: the external system may deliver the signal multiple times (handled: first wins) or never (unhandled: hangs forever). "Pause for human input without losing state" is true; "the human's input is processed exactly once" is true only because duplicates are dropped, and conflicting duplicates resolve by arrival order, which is arbitrary under races.
- DEPENDENCIES: REST-JOURNAL; REST-SUSPEND; ingress resolve endpoint.

### REST-TIMER - Durable timers / sleep

- MECHANISM_ID: REST-TIMER
- PROBLEM: `sleep` for minutes to months, surviving crashes and restarts, without holding a worker.
- SOURCE: Docs (Actions: "Durable timers and timeouts") + source.
- PINNED_SHA: `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- SOURCE_LOCATION: `crates/worker/src/partition/state_machine/entries/sleep_command.rs` (`ctx.register_timer(TimerKeyValue::complete_journal_entry(...))`)
- MATURITY: Production.
- INVARIANT: A journaled `Sleep` registers a timer in the partition's durable timer table; when it fires, the journal entry is completed and the invocation resumes. The timer survives Restate restarts because the timer table is in RocksDB and re-driven on recovery.
- IMPLEMENTATION: Applying the `Sleep` command writes the journal entry and registers `(wake_up_time, invocation_id, completion_id)` in the timer table in the same apply. The timer service fires it, producing a completion that resumes the invocation (or is already recorded if the sleep completed before a crash).
- FAILURE_MODE: Timer *firing* is at-least-once at the infrastructure level (a fired timer that crashes before its completion is journaled will fire again on recovery), but completion journaling dedups it, so the observable semantic is exactly-once wakeup. Clock skew across nodes can shift wakeup time slightly; sleeps are wall-clock, not logical.
- PING_EXISTING_ANALOG: Cron jobs and hooks exist (time-based and event-based triggers), but they are scheduler-level, not journaled per-run timers that survive mid-run crashes.
- GAP: Per-run durable sleep tied to a resumable execution journal.
- HARVEST_CLASS: PATTERN_ONLY.
- FALSIFICATION: "Sleeps that can span months" is true for the timer mechanism, but the sleep's *journal entry* is subject to journal retention after completion, and the invocation itself to the retry/pause lifecycle; a paused-forever invocation never wakes. Durability of the timer does not imply durability of the will to resume.
- DEPENDENCIES: REST-JOURNAL; timer service; partition recovery.

### REST-RETRY - Retry policy with pause/kill

- MECHANISM_ID: REST-RETRY
- PROBLEM: Failed invocations must be retried with backoff, bounded, and eventually surfaced to an operator instead of looping forever.
- SOURCE: Docs (Service Configuration: "Retries") + source.
- PINNED_SHA: `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- SOURCE_LOCATION: `crates/types/src/config/invocation.rs` (`InvocationRetryPolicyOptions`; defaults: initial 500ms, factor 2.0, max interval 60s, max attempts 70, on-max-attempts = pause); docs https://docs.restate.dev/services/configuration
- MATURITY: Production.
- INVARIANT: Every retry replays the journal (never blind-restarts), backs off exponentially, and after the attempt budget is exhausted the invocation is parked (pause, default) or failed (kill), never retried silently forever.
- IMPLEMENTATION: Retry state lives in the invocation status; backoff timers are durable (timer table). Policy is configurable globally, per service, per handler, and per `ctx.run`. `TerminalError`/`TerminalException` aborts retries immediately (no retry on programmer-declared terminal failure). Pause leaves the invocation resumable by operator action (CLI/UI/API), including resume-on-another-deployment.
- FAILURE_MODE: Retries replay the journal, so any uncompleted `ctx.run` re-executes its effect on every attempt (see REST-RUN): 70 default attempts can mean 70 external effect executions if each attempt crashes after the effect but before the completion is journaled. `on-max-attempts: kill` skips compensation logic (docs warn this "may leave your service in an inconsistent state"). Pause is safe but requires a human; an unmonitored paused invocation is a silent stall.
- PING_EXISTING_ANALOG: Best effort, unverified. PING has bounded retries in workers (e.g., outreach engine retries) but no unified per-invocation retry policy with pause/resume semantics.
- GAP: A single retry-policy abstraction with terminal-error escape and operator parking.
- HARVEST_CLASS: ADAPT (the policy shape: exponential backoff + attempt budget + terminal escape + park-don't-loop default is directly reusable).
- FALSIFICATION: "Failed calls are retried until they succeed" (docs, Resilient Communication) is false as a blanket statement: the default policy gives up after 70 attempts and parks the invocation. "Until they succeed" holds only if `maxAttempts` is set to unlimited, which is opt-in. The marketing line omits the default bound.
- DEPENDENCIES: REST-REPLAY; timer service; invocation lifecycle.

### REST-SUSPEND - Suspension and awakening

- MECHANISM_ID: REST-SUSPEND
- PROBLEM: An invocation waiting on an unresolved journal entry (sleep, awakeable, pending call) must not burn a worker slot or, on FaaS, burn money.
- SOURCE: Docs (Key Concepts: "Suspensions on FaaS"; Durable Steps: inactivity/abort timeouts) + source.
- PINNED_SHA: `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- SOURCE_LOCATION: `crates/worker/src/partition/state_machine/lifecycle/suspend.rs` (`OnSuspendCommand`); `crates/types/src/config/worker.rs` (~lines 329-331, 605-606: `DEFAULT_INACTIVITY_TIMEOUT = 60s`, `DEFAULT_ABORT_TIMEOUT = 600s`)
- MATURITY: Production.
- INVARIANT: When an invocation can make no progress (all pending entries unresolved), it is suspended: worker slot released, state persisted. Any arriving completion re-arms it. Separately, if the service stops producing journal entries for `inactivity_timeout` (60s), Restate asks it to suspend; after `abort_timeout` (600s) it forcibly aborts the attempt and retries from the journal.
- IMPLEMENTATION: The invoker reports `Suspended { waiting_for_completed_entries }`; the partition verifies no completion is already available (avoids suspending when a notification is pending) and marks the invocation `Suspended`. Completions arriving later transition it back. The inactivity/abort path is a liveness watchdog: a wedged or over-long attempt is killed and retried, with the journal as the resume point.
- FAILURE_MODE: The abort-and-retry path re-executes the in-flight unjournaled tail, including any `ctx.run` whose effect already happened but whose completion was not yet journaled (REST-RUN again). Misconfigured timeouts (shorter than a legitimate long `ctx.run`, e.g., a 3-minute LLM call with the 60s default) cause abort storms: repeated effect re-execution. The docs call this out (tune timeouts for long operations), but the default punishes long effects.
- PING_EXISTING_ANALOG: Best effort, unverified. No suspend/resume of in-flight agent work; FaaS cost control for waiting is not a current concern (PING runs on always-on hosts).
- GAP: Same as REST-AWAKEABLE.
- HARVEST_CLASS: WATCH (the watchdog pattern is the portable part: inactivity timeout plus abort timeout with journal-based resume).
- FALSIFICATION: "Suspend functions while they wait ... without paying for wait time" is true on FaaS, but suspension is opportunistic: it happens when the invoker reports no progress. A handler that keeps producing journal entries (busy loop with sleeps) never suspends. And the abort path means "suspend" can turn into "kill and retry", which is not free of side effects.
- DEPENDENCIES: REST-JOURNAL; invoker slot management; timer service.

### REST-RECOVERY - Crash recovery via durable log replay

- MECHANISM_ID: REST-RECOVERY
- PROBLEM: Restate Server nodes can crash, and partitions must fail over without losing execution state.
- SOURCE: Docs (Key Concepts: "Restate Server crashes or restarts") + source.
- PINNED_SHA: `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- SOURCE_LOCATION: `crates/worker/src/partition/processor/status.rs` (~lines 98-109, `CatchingUp` replay on startup); `crates/worker/src/partition/processor/context.rs` (~lines 159-189, `last_applied_lsn` tracking); `crates/bifrost` (durable log)
- MATURITY: Production (single-node and HA cluster).
- INVARIANT: All partition state transitions are appended to Bifrost, the durable log, before being applied to RocksDB. On startup or failover, the new leader replays the log from `last_applied_lsn`, re-applying every record deterministically, then goes active. No committed state transition is lost; no uncommitted one is applied.
- IMPLEMENTATION: The partition processor is a deterministic state machine over the log: each record produces a RocksDB batch (journal writes, state writes, outbox messages, timer registrations, dedup marks) applied atomically. Leadership/fencing (`crates/worker/src/partition/leadership/`) ensures a single active applier per partition. Snapshots + log trimming bound replay time (see docs: Snapshots & Backups).
- FAILURE_MODE: Recovery replays *records*, and record application is idempotent-by-construction (dedup tables, entry-index sequencing), but the replay itself re-sends outbox messages and re-fires timers; downstream dedup (REST-DEDUP-INGRESS, REST-DEDUP-TRANSPORT) is what makes this safe, not the replay alone. A partition whose log is unavailable (quorum loss in HA, disk loss single-node without backups) cannot recover: the docs are explicit that HA needs a majority and single-node needs its disk. There is no cross-region story in the open-source core.
- PING_EXISTING_ANALOG: Best effort, unverified. PING persists events/evidence; recovery of in-flight multi-day agent missions after a host crash is not a demonstrated capability.
- GAP: Log-structured recovery of execution state (PING persists knowledge, not execution).
- HARVEST_CLASS: PATTERN_ONLY (the architecture is heavyweight for PING's scale; the pattern is: single deterministic applier + atomic batch + replayable log).
- FALSIFICATION: "If a node fails, others can take over without losing any execution state" holds only within the durability assumptions: a majority for consensus, an intact log, and retention windows not yet expired. It does not cover the SDK-side process (user service) losing in-memory state mid-`ctx.run`, which is precisely the REST-RUN hole. Server-side durability and handler-side durability are different claims sharing one slogan.
- DEPENDENCIES: Bifrost; RocksDB; leadership/fencing; snapshots.

### REST-DEDUP-TRANSPORT - At-least-once delivery with idempotent application

- MECHANISM_ID: REST-DEDUP-TRANSPORT
- PROBLEM: Commands sent to partitions (ingress requests, outbox forwards, Kafka records) can be delivered more than once after crashes.
- SOURCE: Source.
- PINNED_SHA: `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- SOURCE_LOCATION: `crates/worker/src/partition/processor/dedup.rs` (per-producer dedup, persisted in the same RocksDB batch); `crates/ingress-kafka/src/builder.rs` (~line 108: `Dedup::Arbitrary { producer_id, seq: offset }`); `crates/ingress-kafka/src/consumer_task.rs` (offset commit after ack, ~lines 582-622)
- MATURITY: Production.
- INVARIANT: Every command envelope carries (producer_id, sequence); the partition records the highest applied sequence per producer atomically with applying the command, and drops any envelope at or below it.
- IMPLEMENTATION: Kafka ingress maps each record to an envelope keyed by (subscription producer id, Kafka offset); offsets are committed back to Kafka only after Restate acknowledges the invocation, so a crash redelivers and the envelope dedup collapses it. Self-proposals use epoch sequence numbers with fencing. This is the classic "at-least-once delivery + idempotent receiver" construction, executed rigorously.
- FAILURE_MODE: Dedup state is per partition in RocksDB: if the dedup table is lost (disk loss without backup) redelivered commands re-apply. Dedup is also bounded by the same retention/purge lifecycle as invocations; a redelivery arriving after the original was purged is treated as new. Producer IDs must be stable: a Kafka consumer group that changes its producer identity can defeat offset dedup (mitigated by the legacy dedup offset path in `consumer_task.rs`).
- PING_EXISTING_ANALOG: Best effort, unverified. The outreach engine has a duplicate-emission guard; no general transport dedup.
- GAP: No envelope-level dedup for internal agent messaging.
- HARVEST_CLASS: ADAPT (the (producer, seq) envelope pattern is small and general).
- FALSIFICATION: "Kafka: each message becomes an invocation with exactly-once processing guarantees" is exactly-once *invocation creation*, not exactly-once *handling*: the handler still runs under REST-RUN semantics for its external effects. The transport dedup is real but its scope stops at the partition boundary.
- DEPENDENCIES: Bifrost delivery; RocksDB dedup table; stable producer identities.

### REST-IDEMPOTENCY-KEY - Caller-supplied idempotency keys

- MECHANISM_ID: REST-IDEMPOTENCY-KEY
- PROBLEM: Let external callers safely retry HTTP invocations.
- SOURCE: Docs (Invocations: "Idempotency"; Service Configuration: retention) + source.
- PINNED_SHA: `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- SOURCE_LOCATION: `crates/ingress-http/src/handler/service_handler.rs` (~lines 168-194, 228); `crates/types/src/identifiers.rs` (~lines 293-360, `InvocationId::generate` deterministic rules); `crates/types/src/config/invocation.rs` (default idempotency retention 24h)
- MATURITY: Production.
- INVARIANT: `Idempotency-Key` + (service, handler, key, scope) deterministically derives the invocation ID (SHA-256 hash). Retrying with the same key returns the first invocation's result (or attaches to it while running) for the retention window (default 24h).
- IMPLEMENTATION: The ingress parses the header, hashes it into the invocation ID, and the partition dedups by ID (REST-DEDUP-INGRESS). Completed results are retained for the idempotency retention window. Since 1.7, with `controlled-idempotent-sharding` (default for new clusters), the ingress *auto-assigns a random ULID key* when the caller supplies none.
- FAILURE_MODE: (1) The auto-assigned key is random per request: the docs explicitly state it "does not introduce cross-request deduplication: only retries of the same in-flight request are collapsed." A client that times out and opens a new HTTP request gets a new invocation; without a caller-supplied key there is no protection. (2) After the retention window (default 24h), the same key creates a new invocation; long-delayed retries re-execute. (3) Keys are scoped per (service, handler, key): reusing one key across different operations returns the wrong result (see REST-DEDUP-INGRESS).
- PING_EXISTING_ANALOG: Best effort, unverified. PING Social outreach has per-prospect dedup conventions, but no general caller-keyed idempotency primitive.
- GAP: A caller-supplied idempotency key contract for agent-triggered operations.
- HARVEST_CLASS: ADAPT (the hash-to-deterministic-ID construction is directly reusable; the documented auto-key non-guarantee is the lesson to copy: be explicit about what a generated key does and does not dedup).
- FALSIFICATION: Marketing-adjacent docs say "`Idempotency-Key` header makes any Ingress invocation safe to retry, with responses cached for 24 hours." The "safe to retry" is true only within the retention window and only when the *caller* supplies a stable key. The auto-injected key (the default path for keyless requests) explicitly does not make retries safe across connections. The guarantee is opt-in, not ambient.
- DEPENDENCIES: REST-DEDUP-INGRESS; retention cleaner.

### REST-CANCEL-KILL - Cancellation vs kill

- MECHANISM_ID: REST-CANCEL-KILL
- PROBLEM: Operators need to stop invocations: gracefully (with compensation) or forcibly (when the deployment is gone).
- SOURCE: Docs (Managing Invocations: Cancel/Kill) + source.
- PINNED_SHA: `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- SOURCE_LOCATION: `crates/worker/src/partition/state_machine/lifecycle/cancel.rs`, `suspend.rs`; docs https://docs.restate.dev/services/invocation/managing-invocations
- MATURITY: Production.
- INVARIANT: Cancel is cooperative and journaled: the cancellation propagates down the call graph to await points, where handler code runs saga compensation and rethrows; one-way/delayed sends are detached and still execute. Kill is immediate, skips compensation, and explicitly does not guarantee virtual-object state consistency.
- IMPLEMENTATION: Cancel forwards a `CancelInvocation` signal; the SDK surfaces `TerminalError`/`TerminalException` at the next await point. Kill terminates the invocation tree without running user cleanup. Kill exists because cancel requires a reachable deployment; when the service endpoint is permanently gone, kill is the only lever.
- FAILURE_MODE: Cancel is best-effort and non-blocking: "In rare cases, cancellation may not take effect - retry the operation if needed." Code between await points keeps running until the next journaled action. Kill can strand a virtual-object lock or leave partial state with no compensation; the docs mark it last-resort. Neither cancel nor kill recalls already-sent one-way messages.
- PING_EXISTING_ANALOG: Best effort, unverified. PING has no cancel/kill lifecycle for agent runs; stopping is ad hoc.
- GAP: A cooperative cancellation primitive with compensation hooks, plus a documented last-resort kill with explicit consistency caveats.
- HARVEST_CLASS: ADAPT (the cancel/kill split and the "kill does not guarantee consistency" honesty are worth copying as policy).
- FALSIFICATION: "Cooperates with your handler code to roll back any changes" is true only if the handler author wrote compensation logic (sagas are a user pattern, not engine magic). The engine provides the signal and the ordering; the rollback is user code. The docs are clear about this, but it bounds the "reliable" claim: reliability of rollback is only as good as the user's saga.
- DEPENDENCIES: REST-JOURNAL; service protocol cancellation support in SDKs.

### REST-RETENTION-PURGE - Retention windows bound every guarantee

- MECHANISM_ID: REST-RETENTION-PURGE
- PROBLEM: Journals and completed-invocation records cannot grow forever; dedup state must expire.
- SOURCE: Docs (Service Configuration: retention; Managing Invocations: purge) + source.
- PINNED_SHA: `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- SOURCE_LOCATION: `crates/types/src/config/invocation.rs` (defaults: journal, idempotency, workflow completion retention all 24h); `crates/worker/src/partition/cleaner.rs`
- MATURITY: Production.
- INVARIANT: Completed invocations are retained for the configured window (default 24h for journal, idempotency, and workflow completion). After expiry or manual purge, the invocation ID is forgotten: the same idempotency key or workflow key starts a *new* execution.
- IMPLEMENTATION: A partition cleaner drops expired completed invocations (journal + metadata). Purge APIs allow manual deletion. Journal retention is capped by idempotency/workflow retention for keyed invocations.
- FAILURE_MODE: Every dedup and exactly-once claim in this file is implicitly "within the retention window." A retried webhook with the same idempotency key after 24h (default) executes fully a second time. This is the most commonly missed boundary: operators who treat idempotency keys as forever-keys get duplicate executions after the window. The docs state the default plainly, but nothing in the API warns at the boundary.
- PING_EXISTING_ANALOG: Best effort, unverified. PING has retention-ish sweeps; no explicit contract tying dedup lifetime to retention.
- GAP: An explicit, documented coupling between "how long we remember" and "how long dedup holds."
- HARVEST_CLASS: ADAPT (the design rule is portable: every dedup claim must name its memory horizon).
- FALSIFICATION: Any "exactly-once" statement about Restate without a time bound is false. The true statement is always "exactly-once within the retention window." After the window, at-least-once.
- DEPENDENCIES: Partition cleaner; retention config.

### REST-FLOW-CONTROL - Scope-based concurrency limits

- MECHANISM_ID: REST-FLOW-CONTROL
- PROBLEM: Bursts of invocations can overwhelm downstream resources (DBs, third-party APIs, LLM spend).
- SOURCE: Docs (Key Concepts: "Flow Control"; llms.txt outlink 88).
- PINNED_SHA: `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- SOURCE_LOCATION: `crates/types/src/limit_key.rs`; `crates/worker/src/partition/state_machine/mod.rs` (vqueue/limit-key plumbing in `on_service_invocation`); docs https://docs.restate.dev/foundations/key-concepts (flow control section)
- MATURITY: Newer feature (concurrency limits are "the first flow-control primitive, with rate limits and priorities planned next" per docs). Treat as maturing, not long-baked.
- INVARIANT: Invocations carrying a scope + limit key are admitted only up to the configured concurrency cap for that scope; excess waits.
- IMPLEMENTATION: Opt-in: callers send invocations through a named scope; the partition enforces the cap via virtual queues before invoking. Documented uses: cost ceilings on AI calls, downstream protection, fair scheduling.
- FAILURE_MODE: Caps are concurrency (in-flight count), not rate: a fast-completing flood of invocations can still hammer a downstream within the cap. Misconfigured caps deadlock workflows that call back into the same scope (self-throttling). It is admission control, not backpressure: the queue is unbounded.
- PING_EXISTING_ANALOG: Best effort, unverified. The outreach engine has cold-email caps (10/day) and per-pass ceilings; nothing like a general scope-based concurrency limiter.
- GAP: A general concurrency-limit primitive keyed by scope.
- HARVEST_CLASS: WATCH (immature upstream; pattern is standard semaphore-by-key).
- FALSIFICATION: Not marketed as exactly-once related; no falsification needed beyond: flow control does not change any delivery or execution guarantee, it only shapes admission.
- DEPENDENCIES: Invocation metadata (scope/limit key); vqueues.

### REST-WORKFLOW-RUNONCE - Workflow run-once semantics

- MECHANISM_ID: REST-WORKFLOW-RUNONCE
- PROBLEM: A workflow (e.g., an order pipeline) must not run twice for the same business key even if submitted twice.
- SOURCE: Source + docs.
- PINNED_SHA: `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- SOURCE_LOCATION: `crates/types/src/identifiers.rs` (`InvocationId::generate`: workflow run IDs are `SHA256("wf" || scope || service || key)`); `crates/worker/src/partition/state_machine/mod.rs` (`handle_duplicated_requests`: duplicate workflow run gets `WORKFLOW_ALREADY_INVOKED` failure)
- MATURITY: Production.
- INVARIANT: The workflow *run* handler's invocation ID is a pure function of (service name, workflow key). Submitting the same workflow key twice never creates a second run; the second submit fails fast with a dedicated error instead of attaching.
- IMPLEMENTATION: Deterministic ID generation plus the standard dedup path, with special-case behavior: unlike idempotent service calls (which attach/return the prior result), duplicate workflow runs are rejected, because a workflow key denotes a singleton execution. Shared handlers on the workflow remain callable during/after the run within the workflow retention window.
- FAILURE_MODE: The singleton property holds only within the workflow completion retention window (default 24h): after the workflow's state is cleared, the same key starts a brand-new run. A business process that assumes "one workflow per order ID forever" will double-run after the window unless the key embeds uniqueness differently or retention is extended. Also, the idempotency key header is explicitly ignored for workflow runs (warn log in `handle_duplicated_requests`).
- PING_EXISTING_ANALOG: Best effort, unverified. PING goals have durable IDs and tracked items dedup by commitment, but no singleton-execution primitive with fail-fast duplicate rejection.
- GAP: A run-once-per-key primitive with explicit rejection (not silent attach) for mission-style executions.
- HARVEST_CLASS: ADAPT (deterministic singleton IDs + fail-fast duplicates is a clean, small pattern; the retention-window caveat must travel with it).
- FALSIFICATION: "Workflows have run-once semantics" is true modulo retention: it is run-once-per-retention-window. The docs do say workflow state is cleared after the retention period, but the "run once" slogan does not carry the expiry. Also note the asymmetry: duplicate *service* calls with idempotency keys attach to the prior run, while duplicate *workflow* runs are rejected; two different duplicate semantics under one "deduplication" banner.
- DEPENDENCIES: REST-DEDUP-INGRESS; REST-RETENTION-PURGE.

### REST-OBSERVE - SQL introspection over live engine state

- MECHANISM_ID: REST-OBSERVE
- PROBLEM: Operators need to see invocations, journals, retries, and state without separate instrumentation.
- SOURCE: External analysis + source (accepted as secondary; verified structurally).
- PINNED_SHA: `54e1e0a2d88af4cdefe297087c61531bd427c91d`
- SOURCE_LOCATION: `crates/storage-query-datafusion/`; `crates/worker/src/partition/invoker_storage_reader.rs`
- MATURITY: Production.
- INVARIANT: `sys_invocation`, `sys_journal`, and related tables are read-only views over the same RocksDB the partition processor uses. What you query is what the engine acts on.
- IMPLEMENTATION: Embedded Apache DataFusion SQL engine; queryable via CLI, HTTP `/query`, and UI. No separate visibility store, no replication lag.
- FAILURE_MODE: Queries share the RocksDB instance with execution: heavy scans can contend with the engine (no documented isolation or resource limits). No step-level start/end timestamps (only `appended_at`), no bulk operations via query, no custom search attributes.
- PING_EXISTING_ANALOG: Best effort, unverified. PING has event introspection ambitions (Oracle as the window); no live SQL over engine state.
- GAP: Unified introspection where the observed state IS the execution state.
- HARVEST_CLASS: PATTERN_ONLY (the principle: observability reads the same store the engine writes; PING's event plane already gestures at this).
- FALSIFICATION: "Full observability: see all calls and call chains" is true for journaled structure, but timing resolution is coarse (no per-step durations) and querying is not isolated from execution. Observability without instrumentation is real; observability without cost is not claimed and should not be assumed.
- DEPENDENCIES: Partition RocksDB; DataFusion.

## 3. Marketing claims: debunked / confirmed

Against the pinned source and current docs. "Confirmed" always carries its boundary.

1. "Restate tracks each invocation through completion, ensuring it runs exactly once regardless of failures." (Key Concepts)
   VERDICT: Confirmed with boundary. The *invocation record* is created once per ID and its *journaled steps* are applied once, via ID dedup (REST-DEDUP-INGRESS), journaled callee IDs (REST-EO-RPC), and transport dedup (REST-DEDUP-TRANSPORT). The boundary: external effects inside `ctx.run` are at-least-once (REST-RUN), and every guarantee expires with retention (REST-RETENTION-PURGE). The sentence as written invites the exactly-once-effect reading, which is false.

2. "If your function crashes or fails, Restate replays the journal, skipping completed steps and resuming from exactly where it left off." (Key Concepts)
   VERDICT: Confirmed with boundary. Resume point is the journal tail, not the crash point (REST-REPLAY). Unjournaled work and uncompleted effects redo.

3. "No duplicates: Same call won't execute twice." (Key Concepts, Resilient Communication)
   VERDICT: Confirmed with boundary. True for Restate-to-Restate journaled calls (REST-EO-RPC). Does not cover the callee's external side effects, and does not cover non-journaled callers.

4. "Failed calls are retried until they succeed." (Key Concepts, Resilient Communication)
   VERDICT: Debunked as stated. Default policy: 70 attempts with exponential backoff, then pause (REST-RETRY). "Until they succeed" requires opting into unlimited attempts. The true statement: "retried with backoff until success or the attempt budget is exhausted, then parked for an operator."

5. "Kafka: each message becomes an invocation with exactly-once processing guarantees." (docs-adjacent claim)
   VERDICT: Confirmed with boundary. Exactly-once *invocation creation* per record via offset-keyed envelope dedup (REST-DEDUP-TRANSPORT). Handler-side external effects remain at-least-once (REST-RUN). "Processing" is doing heavy lifting in that sentence.

6. "`Idempotency-Key` header makes any Ingress invocation safe to retry." (docs/feature lists)
   VERDICT: Confirmed with boundary. Safe within the idempotency retention window (default 24h), when the caller supplies a stable key (REST-IDEMPOTENCY-KEY). The auto-injected key for keyless requests explicitly does not dedupe across requests; the docs say so, the feature lists do not.

7. "Single-writer guarantee: only one handler can modify state at a time, preventing race conditions." (Key Concepts)
   VERDICT: Confirmed with boundary. True for exclusive handlers (the default). Shared handlers are concurrent by design, and kill can break the invariant (REST-VO-LOCK).

8. "State is never out of sync with the execution." (Key Concepts)
   VERDICT: Confirmed with boundary. True for Restate-managed K/V state, where the write and the journal record are one atomic apply (REST-STATE-JOURNAL). False for any external database.

9. "Suspend functions while they wait ... without paying for wait time." (Key Concepts, FaaS)
   VERDICT: Confirmed with boundary. True when the invoker can suspend (no progress possible). The inactivity/abort watchdog can turn a long wait into abort-and-retry, re-executing effects (REST-SUSPEND).

10. "If a node fails, others can take over without losing any execution state." (Key Concepts)
    VERDICT: Confirmed with boundary. True given quorum, an intact log, and unexpired retention (REST-RECOVERY). Server-side durability does not cover the user-service process mid-`ctx.run`.

11. "Workflows: run-once semantics." (docs/feature lists)
    VERDICT: Confirmed with boundary. Run-once per workflow key within the workflow retention window; duplicates rejected with `WORKFLOW_ALREADY_INVOKED` (REST-WORKFLOW-RUNONCE). After retention expiry, the same key runs again.

12. "Awakeables: pause for human input without losing state." 
    VERDICT: Confirmed with boundary. Suspension and resume are durable (REST-AWAKEABLE). Duplicate resolutions collapse to first-wins (silent for the loser); never-resolved awakeables hang indefinitely.

The one-sentence summary of the whole lane: Restate's "exactly-once" is exactly-once *journaling* (records, invocations, state writes, timer completions) with at-least-once *effects*, bounded in time by retention windows and in space by the journal boundary. Everything outside the journal is the user's problem, and the system is admirably honest about this in the SDK docs while the headlines elide it.

## 4. Open questions

1. Docs/source discrepancy: the Service Configuration docs show the default retry policy as `initial-interval = "50ms"`, but `crates/types/src/config/invocation.rs` (`default_initial_interval()`) returns 500ms at the pinned SHA. One of them is stale; the source is presumably authoritative, but the docs are what users tune against.
2. Journal v1 to v2 migration: the state machine carries both `WriteJournalTable` (v1) and `journal_table_v2::WriteJournalTable` paths with a migration (`migrate_journal_table.rs`). The exact behavior for invocations that started on v1 and resume after the 1.6 upgrade was not fully traced; there may be edge cases in mixed-version journals.
3. The `debug_assert_eq!(entry_index, journal_metadata.length)` in `handle_journal_entry` is a debug-only check. The release-mode guard against out-of-order or duplicate journal entry submission from a misbehaving invoker was not located; presumed to be enforced by the invoker's own sequencing, but not verified.
4. Restart-from-prefix (`restart-as-new` with partial journal retention) replays a journal prefix under possibly-new code; the docs warn of non-determinism errors, but the precise semantics of which prefix is replayable when the code changed were not pinned down.
5. Kafka ingress `producer_id` stability across consumer rebalances: the main-repo ingress uses offset-keyed envelopes per subscription; the older external `ingress-integration-kafka` repo documents a stricter producer-id/offset invariant. Whether the in-repo consumer preserves the producer identity across all rebalance scenarios was not exhaustively verified.
6. PING_EXISTING_ANALOG entries are best-effort and unverified against PING internals; they should be checked by a lane with PING source access before any harvest decision uses them.
7. License note for any DIRECT_REUSE consideration: Restate is Business Source License (BSL), converting to Apache 2.0 on the Change Date per LICENSE. No reuse beyond reading was performed here, but any future code reuse must clear the BSL terms. This is why most classes above are ADAPT/PATTERN_ONLY rather than DIRECT_REUSE.

## Appendix: experiment designs (allowed; no implementation)

- E1 (falsify REST-RUN boundary): handler with a `ctx.run` that appends to an external append-only log then crashes the service process before returning. Count log lines after recovery. Prediction: more lines than journaled completions; the delta is the re-execution window. Vary the crash point (before/after effect, before/after completion send).
- E2 (falsify retention boundary): idempotent-keyed invocation, wait past a shortened idempotency retention, resubmit the same key. Prediction: second full execution, per REST-RETENTION-PURGE.
- E3 (verify VO lock): N concurrent exclusive invocations on one key, each sleeping in a `ctx.run` then incrementing state. Prediction: serialized increments, final count == N, inbox order preserved. Then repeat with shared handlers mutating external state: prediction, no serialization.
- E4 (verify abort storm): `ctx.run` with a 3-minute external call under default 60s inactivity timeout. Prediction: repeated aborts and effect re-executions until timeouts are tuned.
- E5 (verify awakeable first-wins): resolve the same awakeable twice with different values from two racing clients. Prediction: invocation sees the first value; second dropped with a warn log.
