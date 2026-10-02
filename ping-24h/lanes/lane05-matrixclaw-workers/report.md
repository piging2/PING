# LANE 5 REPORT: Donor Archaeology, External Worker/Subagent Architecture
## MatrixClaw + MyAgens + Goated

**Status: HYPOTHESIS until replayed from a clean checkout.** All claims below are
grounded in source reads of the pinned shallow clones listed in raw/pins.txt.
No code was executed; no tree was modified. READ ONLY throughout.

**Lane:** 5 (donor archaeology: MatrixClaw + MyAgens + Goated), PING 24-hour
intelligence-maximization program. T+0 = 2026-09-28 14:26 MDT. External systems
are specimens; PING remains the constitutional system.

**Claim labels used:** OBSERVED IN CODE / DOCUMENTED / DEMONSTRATED BY TEST /
INFERRED / CLAIMED BY AUTHOR / SPECULATIVE. Stars are irrelevant and are not
cited. Multiple agents are not coordination. Cron is not autonomy.

---

## Donor cards

### MatrixClaw
- **Repository:** https://github.com/Suren878/matrixclaw
- **License:** MIT. **SHA:** 83fa297162338d31c99e70cf4547e60a227f8b4e
  (matches wave-1 pin). **Version/date:** v0.1.19, commit 2026-08-30 23:27
  (+0300) "chore: release v0.1.19".
- **Activity:** last commit 2026-08-30, 29 days before read. Quiet at pin.
- **Language:** Go (go 1.26.5), ~708 Go files.
- **Deployment model:** daemon-first, single-user local AI operator. Daemon
  owns durable session, SQLite store, approvals, runs, modules; TUI/Telegram
  are thin clients. Loopback-only HTTP by default.
- **Worker model (spawn/bound):** two execution families behind one dispatch
  surface. Native `matrixclaw` (provider-backed LLM through the daemon
  tool/approval loop) and `external_agent` (Codex app-server over stdio
  JSON-RPC; Claude Code CLI via `claude -p --output-format json --resume`).
  External workers are detected binaries on PATH, not dependencies. Delegation
  via persisted `subagent_tasks` records with parent/child session links,
  blocking `delegate_task` and async `spawn_subagent`. Bounds OBSERVED IN
  CODE: spawn requires goal + parent session ID; **children cannot spawn
  children** (hard error); async cap 4 per session
  (`maxActiveAsyncSubagents`, subagents_async.go:10); native child tool
  surface filtered by daemon allowlist (`subagentToolAllowed` denies
  delegate_task, memory, plan_*, text_to_speech, core.memory, core.plan
  namespaces, Automation/Storage/Skills categories); external children run
  PermissionModeFullAuto (bypass) by adapter default.
- **Multi-agent semantics:** parent/child delegation tree, depth capped at 1
  (children cannot delegate). Child approvals bridge up to the parent session
  with full provenance and dedup. Async completions delivered to the parent
  as triggered runs exactly once, only when the parent is idle.

### MyAgens
- **Repository:** https://github.com/gyorgysh/myagens
- **License:** GPL-3.0-only (relevant: unusable as copied code for PING).
  **SHA:** 7068fbf2764a515b85235f71b38e1e8e5632f73d (matches wave-1 pin).
  **Version/date:** 0.7.3, HEAD 2026-08-26.
- **Activity:** active single-maintainer cadence (0.7.1 2026-07-30, 0.7.2
  2026-08-09, 0.7.3 2026-08-26). No test framework, no linter (typecheck is
  the only automated check per CLAUDE.md).
- **Language:** TypeScript (183 .ts under src/, ESM strict tsc).
- **Deployment model:** one Node process hosting Atlas (main agent) plus a
  crew of Leads/Assistants. 6-8 interchangeable backends are CLI wrappers
  (Claude Agent SDK, Codex, Grok, Antigravity, Cursor, OpenCode, Ollama
  chat, hidden persistent-tmux). The "shared plane" is NOT a task/event
  spine: it is a set of in-process MCP servers (memory, tasks, skills,
  crew, connectors, webhook, selfUpdate, tmux, sendFile) attached
  identically to every backend's runTurn.
- **Worker model (spawn/bound):** `AgentBackend { id, displayName, hidden?,
  runTurn(opts: RunOptions): Promise<RunResult> }` in a Map registry. Worker
  = Lead/Assistant record carrying backendId, model, providerId, portfolio,
  role, parentId, autonomy. Bounds OBSERVED IN CODE: delegated run's
  permissionMode capped at caller's autonomy (`delegatedPermissionMode`,
  crew.ts:72); TaskDelegation state machine (queued|running|ok|error|
  stopped) with `blockedBy` prerequisite eligibility, 30-minute timeout
  (`timeoutMs: 1_800_000`) and maxConcurrent 3 (tasks.ts:103); planning
  turns route delegation to a suggestion inbox instead of firing real work.
- **Multi-agent semantics:** Atlas + named crew of Leads; relevance-weighted
  quorum voting (council: majority/supermajority/unanimous, tallies
  persisted to council.jsonl, audited); shared MCP plane across all
  backends; delegation-chain permission capping; per-worker FallbackSpec
  for error-class failover.

### Goated
- **Repository:** https://github.com/endgame-labs/goated (canonical; earlier
  home github.com/dorkitude/goated)
- **License:** MIT. **SHA:** 39d94b98de0d39967ecd08be2514d87d1f3b1d43
  (matches wave-1 pin). **Version/date:** VERSION file 0.2.0, HEAD commit
  2026-09-24 (merge PR #41).
- **Activity:** last commit 2026-09-24, 4 days before read. Most recently
  active of the three.
- **Language:** Go (~106 .go files, ~23k LOC excl. vendor); 107-line bash
  watchdog; external runtime deps: tmux, claude/codex/pi CLI on PATH.
- **Deployment model:** one Go binary (`goated` = control plane + daemon;
  `goat` = same binary, agent-facing CLI). Daemon supervises existing
  coding agents instead of reimplementing them. Unix socket 0600 IPC.
  Liveness owned by an EXTERNAL 2-minute cron watchdog, not by the daemon
  itself. Personal single-operator threat model (file creds 0600,
  `--dangerously-skip-permissions` on every subagent launch).
- **Worker model (spawn/bound):** headless subprocess or TUI tmux pane.
  Subagent launcher builds a generated shell wrapper that waits on a gate
  file, captures exit status, calls back `subagent-finish --status
  $finish_status --run-id $run_id`, then self-deletes. Bounds OBSERVED IN
  CODE: 500MB log cap (sizeWatchWriter), 45s daemon-side send timeout inside
  90s client deadline, cron jobs 1h timeout with skip-if-in-flight, stuck
  helper processes (>600s) reaped by watchdog. The supervisor owns NO
  context of the worker (no context-window ownership, ~200-char pydict
  envelope); result collection is by worker self-report, not observation.
- **Multi-agent semantics:** none in the orchestration sense. One
  supervisor, independent subagent runs, completion notified back to the
  main session. No lease, no inter-worker coordination, no event spine.

---

## Mechanism cards

### MC-1. Approval bridging with provenance envelope (MatrixClaw)

- **PROBLEM:** A child worker needs an authorization decision it cannot make
  itself. Letting the child decide its own tool approvals is self-approval;
  dropping the request silently is lost intent; forwarding without
  provenance makes the parent unable to audit or dedup.
- **INVARIANT:** A child authorization request propagates up the delegation
  chain carrying full provenance, is re-created as a parent-session
  approval, is deduped on the child approval ID, and is decided by the
  parent's approval policy, never the child's. Restart-safe.
- **MECHANISM:** OBSERVED IN CODE. `subagentApprovalBridgeParams`
  (internal/core/subagents.go:38) carries: source, task_id, child session /
  run / approval / tool-call IDs, child tool name, subagent title, runtime,
  original action, original description, original params. The bridged
  approval is created in the parent session
  (`createPendingApproval`, subagents.go ~L348); if the parent run is live
  it is set to waiting_approval. `subagentBridgeApprovalForChild` scans the
  parent session's approvals and dedups on matching `ChildApprovalID`.
  The child's own system prompt is hard-set: "Do not ask the user for
  input or approval." (subagents_presentation.go). Effect posture differs
  by family: native children inherit provider/model/permission mode with a
  tool deny-list; external children run PermissionModeFullAuto (bypass),
  so bridging is the native-child path.
- **WHY IT WORKS:** The authorization decision physically moves to the
  session that owns the approval policy. The bridge envelope is data, not
  a decision; dedup on the child approval ID makes double-delivery
  idempotent; persistence makes it restart-safe. The child has no code
  path that converts its own want into a grant.
- **FAILURE IT PREVENTS:** Child self-approval; lost or double-counted
  authorization requests across daemon restarts; orphan approvals that
  belong to no decision-maker.
- **ASSUMPTIONS:** The parent session's approval policy is trustworthy and
  reachable (parent idle/absent => approval sits pending). The child
  approval ID is unique per request. Bridging only covers approvals the
  child surfaces; external children in bypass never surface any.
- **PING EQUIVALENT:** Mission Control digest-bound ApprovalRequest
  (approve() requires id + expected digest; no approve-latest) and the
  parent/child WorkOrder linkage in ORCA.
- **PING STRONGER-WEAKER-DIFFERENT:** DIFFERENT. PING's digest binding is
  stronger at the approval primitive itself (PING ALREADY STRONGER per
  first-pass finding #9). What MatrixClaw adds is the delegation-chain
  shape: provenance-carrying re-creation in the parent session with
  child-ID dedup, which PING's WorkOrder hierarchy can adopt as the
  cross-delegation approval protocol.
- **TEST WE CAN STEAL:** approval-bridge idempotency: deliver the same
  child approval twice (simulating restart replay) and assert exactly one
  parent approval exists and the child ID maps to it.
- **CODE WE ACTUALLY NEED:** none. Harvest the envelope schema + dedup
  rule, not the implementation.

**Verdict: MECHANISM BENCHMARKED**

### MC-2. One interchangeable execution contract (MatrixClaw)

- **PROBLEM:** N worker runtimes (Codex app-server, Claude Code CLI, native
  daemon loop) must be dispatchable by one orchestrator without per-worker
  branches in the execution path.
- **INVARIANT:** Every worker implements one interface and emits one event
  shape; the orchestrator never branches on worker type at dispatch.
- **MECHANISM:** OBSERVED IN CODE. `RuntimeAgent` interface
  (internal/externalagents/agent.go): ID/DisplayName/Available +
  StartSession/ResumeSession/Send/Interrupt/Close. `EventKind` enum with
  10 kinds (turn.started ... turn.failed); each adapter maps its native
  notifications through a per-adapter normalizer into the `Event` struct
  (kind, agent/thread/session/turn/item IDs, tool name/input, text, error,
  at timestamp). Registry normalizes IDs lowercase, alias conflict = hard
  error. Selection is by name: `normalizeSubagentRuntime` maps the runtime
  string; **"auto" resolves to native matrixclaw, not to a
  capability match** (subagents_presentation.go). Capabilities struct is
  coarse booleans (Start/Resume/Streaming/ToolEvents/Interrupt/
  ConfigurablePath) + Available() = binary lookup + --version probe.
- **WHY IT WORKS:** The interface is small (5 lifecycle methods) and the
  event envelope is minimal (10 kinds + identity fields + timestamps), so
  adapters stay thin and the core stays polymorphic. Removability holds:
  adding a backend is a new factory + normalizer.
- **FAILURE IT PREVENTS:** Per-worker branches in dispatch logic;
  un-removable backend coupling in the orchestrator core.
- **ASSUMPTIONS:** All workers fit the turn protocol (send text, stream
  events, end turn). Capabilities are honest. Health beyond install
  presence is someone else's problem. Cancellation exists.
- **PING EQUIVALENT:** ORCA's executor contract for Codex/Claude/Hermes/
  local-model workers; PING's capability-eligibility executor selection
  with runtime health probes.
- **PING STRONGER-WEAKER-DIFFERENT:** PING ALREADY STRONGER on selection
  (capability-eligibility + live health probes vs name-picking by the
  model; first-pass finding #7). The interface + envelope SHAPE is the
  harvestable part and is the same shape PING wants; the donor shows the
  minimal viable surface (5 methods, 10 event kinds) is enough to make
  heterogeneous workers look identical to the orchestrator.
- **TEST WE CAN STEAL:** capability-advertisement honesty: a worker
  advertising Interrupt:false must never be asked to interrupt; a cancel
  mid-turn must assert either a real interrupt acknowledgment within a
  bound or the attempt marked UNKNOWN-effect. MatrixClaw FAILS this test
  today: both adapters return "interrupt is not implemented" and the
  dispatcher swallows the error (`_ = runtime.Interrupt(ctx, session)`,
  external_agent_execution.go:424).
- **CODE WE ACTUALLY NEED:** none. Harvest the shape; PING keeps its own
  event schema (first-pass finding #10).

**Verdict: MECHANISM BENCHMARKED**

### MC-3. Persisted executor-thread attachment + exactly-once async completion (MatrixClaw)

- **PROBLEM:** The orchestrator restarts; the worker's live thread still
  exists. Re-dispatching duplicates work; dropping the binding orphans the
  run. Async completions must reach the parent exactly once even across
  restarts.
- **INVARIANT:** The binding between orchestrator-side task and
  worker-side thread is persisted; resume re-binds to the live handle
  instead of re-dispatching. Completion is queued with a timestamp and
  delivered to the parent exactly once.
- **MECHANISM:** OBSERVED IN CODE. `SessionAttachment`
  (externalagents/agent.go): session/agent/thread/session IDs, cwd, model,
  approval policy, sandbox, metadata JSON, created/updated timestamps;
  `ExternalSession()` reconstructs the live handle for resume. Async
  completion fields `CompletionQueuedAt` / `CompletionDeliveredAt`
  (types_subagent.go:58-59, subagents_work.go:27-28): completions queue
  and are delivered as triggered runs only when the parent is idle;
  `RecoverSubagentTasks` re-syncs active tasks on daemon restart and
  restarts non-terminal child runs.
- **WHY IT WORKS:** Identity (the attachment) is separated from liveness
  (the process). On restart the orchestrator reads attachments and resumes
  handles rather than issuing new work. The delivered-at timestamp is the
  exactly-once marker, set at delivery, not at queue time.
- **FAILURE IT PREVENTS:** Duplicate worker dispatch after orchestrator
  restart; lost async results; double delivery of a completion to the
  parent.
- **ASSUMPTIONS:** The worker's thread handle stays valid across
  orchestrator restarts (true for external CLIs with --resume; false if
  the worker host also died). The store write for the attachment is
  atomic with session creation.
- **PING EQUIVALENT:** ORCA restart/replay; PING lease semantics
  (UNKNOWN external effect -> HOLD -> reconciliation; no automatic
  redispatch without proven idempotency).
- **PING STRONGER-WEAKER-DIFFERENT:** DIFFERENT. PING's lease semantics
  are stronger on the unknown-effect side (MyAgens's resume-handle
  invalidation, MA-3, shows the handle-portability assumption can be
  false; MatrixClaw assumes it). The attachment-as-persisted-identity +
  delivered-at exactly-once marker is the portable pattern.
- **TEST WE CAN STEAL:** crash-between-queue-and-deliver: queue a
  completion, crash before delivery, restart, assert the parent receives
  exactly one delivery and the delivered-at marker prevents a second.
- **CODE WE ACTUALLY NEED:** none.

**Verdict: MECHANISM BENCHMARKED**

---

### MA-1. Delegation-chain permission capping (MyAgens)

- **PROBLEM:** A worker that can delegate can launder privilege: a
  supervised caller spawns a child, the child requests full permissions,
  and the delegation chain becomes a privilege-escalation path.
- **INVARIANT:** A delegated run's authority posture is capped at the
  caller's autonomy, computed by the framework, never declared by the
  delegating agent. No turn may promote its own authority.
- **MECHANISM:** OBSERVED IN CODE. `delegatedPermissionMode`
  (src/mcp/crew.ts:72): only a `full` (or `auto_until_error`) caller may
  grant `bypassPermissions`; anything more supervised falls back to
  `default`, where the delegated run's canUseTool gate still allows only
  the read-only AUTO_ALLOWED_TOOLS set. The comment is explicit: "closes
  a privilege-escalation path through the delegation chain." Additionally,
  planning turns cannot fire real work at all: `crew_delegate` routes to
  a suggestion inbox for the president to review and explicitly delegate
  (crew.ts, callerPlanning branch).
- **WHY IT WORKS:** The cap is computed from the caller's recorded
  autonomy level, which the callee cannot rewrite; the delegation tool is
  framework code, so the worker's prompt/instructions never touch the
  decision. Authority (permissionMode) is a separate axis from capability
  (skills, tools), so capping authority never needs to enumerate
  capabilities.
- **FAILURE IT PREVENTS:** A worker granting itself capability through
  delegation; a supervised worker's delegate escaping supervision;
  planning-mode turns firing real work.
- **ASSUMPTIONS:** callerAutonomy is recorded truthfully by the framework
  (not worker-asserted). The default (`full` when unset for unattended
  worker runs) is a deliberate policy choice, not a hole, under their
  single-operator threat model. Under PING's threat model the default
  would need to be the supervised end.
- **PING EQUIVALENT:** PING's capability authority deciding effect
  posture per WorkOrder; the rule that no agent-authored artifact is
  authority (POLYROB quarantine/promote invariant from wave 1).
- **PING STRONGER-WEAKER-DIFFERENT:** The invariant is NEW to the
  donor set; PING's authority model is constitutionally stronger in
  general, but this specific delegation-chain monotonicity rule
  (authority can only stay equal or decrease down a delegation chain,
  computed by the framework at delegation time) is a crisp, small,
  enforceable statement of it. PING should assert it verbatim.
- **TEST WE CAN STEAL:** a supervised caller's delegate requests
  bypassPermissions; assert the child's effective permissionMode is
  "default" regardless of what the delegating agent asked for. And:
  a planning-mode turn calling crew_delegate produces a suggestion,
  never a run.
- **CODE WE ACTUALLY NEED:** none (and GPL-3.0-only bars copying in any
  case). Harvest the invariant and the two tests.

**Verdict: NEW INVARIANT FOUND**

### MA-2. Bounded delegation: typed task lifecycle with eligibility, timeout, and exactly-once resume (MyAgens)

- **PROBLEM:** Delegated work needs bounded context (budget, deadline),
  an expected result schema, and typed proposed transitions, or a worker
  can run forever, retry forever, or report anything.
- **INVARIANT:** Every delegation is a typed record with a lifecycle,
  dependency-gated eligibility, a wall-clock timeout, a concurrency
  bound, and an exactly-once resume token. Orphaned delegations become
  typed errors, never silent drops or silent re-runs.
- **MECHANISM:** OBSERVED IN CODE. `TaskDelegation` status:
  queued|running|ok|error|stopped (tasks.ts:18), with runId, timestamps,
  output tail, error, sessionId resume token. `blockedBy` ids with
  `blockingPrereqs()` / `isUnblocked()` hold a card until every
  prerequisite is done/archived. `DEFAULT_TASK_CONFIG = { timeoutMs:
  1_800_000, maxConcurrent: 3 }` (tasks.ts:103). `prepareRetry` carries
  the failed run's session token into resumeSessionId, consumed exactly
  once (tasks.ts:250). Boot-time `reconcileStuck()` converts orphaned
  queued/running cards into actionable "error" records with the resume
  token preserved (taskRunner.ts:338). Provenance on every card:
  createdBy, parentId, audit log on all mutations.
- **WHY IT WORKS:** The bounds live in the delegator (framework), not in
  the worker's instructions: timeout and concurrency are enforced where
  the run is launched, eligibility is checked before dispatch, and the
  resume token's exactly-once consumption is enforced by read-and-clear
  (`Read and clear a card's pending resumeSessionId`, tasks.ts:270).
  A restart cannot silently re-run or silently drop: orphans become
  typed errors with their resume token intact.
- **FAILURE IT PREVENTS:** Unbounded worker runtime; unbounded retry;
  dispatch of work whose prerequisites are unmet; resume-token replay;
  orphaned delegations vanishing across restarts.
- **ASSUMPTIONS:** The delegator process is the enforcement point (a
  worker that bypasses the delegator bypasses the bounds; note worker
  default autonomy = full is a standing weakness in their posture).
  Timeout is wall-clock, not token budget: no cost ceiling per task.
- **PING EQUIVALENT:** ORCA WorkOrders with budgets/deadlines; PING
  lease semantics; UNKNOWN -> HOLD -> reconciliation.
- **PING STRONGER-WEAKER-DIFFERENT:** DIFFERENT. PING's lease semantics
  and typed failure vocabulary are stronger; MyAgens's contribution is
  the compact bundle (eligibility + timeout + concurrency + typed
  terminal states + exactly-once resume token + boot reconciliation) in
  one small state machine. The read-and-clear resume token is the
  sharpest single trick.
- **TEST WE CAN STEAL:** blockedBy eligibility: a card with an unmet
  prerequisite is never dispatched. Resume-token exactly-once: a second
  retry attempt with the same consumed token fails rather than
  re-resuming.
- **CODE WE ACTUALLY NEED:** none (GPL-3.0-only).

**Verdict: MECHANISM BENCHMARKED**

### MA-3. Error-class failover with conversation-handle invalidation (MyAgens)

- **PROBLEM:** A worker fails mid-turn. Failing over to another worker
  must not retry what cannot be retried, must not loop, and must not
  pretend the new worker can resume the old worker's conversation.
- **INVARIANT:** Failover retries at most once, only for error classes
  classified retryable; auth failures and watchdog aborts never fail
  over; a conversation/resume handle is not portable across executor
  backends, so a backend change drops the handle and restarts fresh.
- **MECHANISM:** OBSERVED IN CODE. `runTurnWithFallback`
  (src/core/fallback.ts:78): `FallbackSpec { backendId?, providerId?,
  model? }` per worker plus global. Retries ONCE on usage-limit errors
  or silent CLI crashes; classifies errors so auth failures and
  stall-watchdog aborts never fail over; refuses crash failover to the
  same backend ("a provider swap keeps the same crashing CLI"); DROPS
  the resume token when the backend changes, with the comment "a resume
  handle is meaningless on a different backend's CLI"; pre-checks target
  exhaustion at 99% before retrying; calls `onFallback(label)` BEFORE the
  retry so the operator is notified. Second failure propagates.
- **WHY IT WORKS:** The error class, not the error string, decides
  retryability, which separates "try elsewhere" (usage limit, crash)
  from "do not try" (auth, watchdog abort). The handle-invalidation rule
  kills a whole class of resume-into-a-void bugs by making
  non-portability explicit in code rather than discovered in production.
  One retry bounds the blast radius; the pre-retry notification keeps a
  human in the loop.
- **FAILURE IT PREVENTS:** Retry storms on auth failures; failover loops
  onto the same crashing backend; resuming a conversation handle on a
  backend that cannot honor it; silent backend swaps.
- **ASSUMPTIONS:** The error classifier is complete enough that an
  unclassified error fails closed (propagates) rather than failing over.
  The 99% exhaustion pre-check's usage probe is trustworthy.
- **PING EQUIVALENT:** ORCA executor failover; PING's typed failure
  semantics (what failed, which boundary, retryable or not).
- **PING STRONGER-WEAKER-DIFFERENT:** The invariant is NEW to the donor
  set and directly answers the lane's core question: a donor showing why
  you cannot always swap workers behind one contract. The resume handle
  is executor-scoped state; any work contract that assumes handle
  portability across workers is falsified by this mechanism. PING's
  executor-attachment design must treat thread/session handles as
  non-portable across executor backends (re-bind by re-issue, never by
  transplant).
- **TEST WE CAN STEAL:** failover to a different backend asserts the new
  backend receives no resume token; an auth-classified failure asserts no
  failover is attempted; a crash failover targeting the same backend is
  refused.
- **CODE WE ACTUALLY NEED:** none (GPL-3.0-only).

**Verdict: NEW INVARIANT FOUND**

---

### G-1. Stale-evidence rule: transcript text is never current state (Goated)

- **PROBLEM:** A health monitor reads rendered error text from a session
  transcript ("API Error: 401 / OAuth token expired") and concludes the
  worker is dead. Transcript text persists after the incident resolves,
  so the monitor crash-loops a healthy worker.
- **INVARIANT:** Stale evidence may downgrade health to UNKNOWN, never to
  BLOCKED/non-recoverable, without a live authoritative probe. Rendered
  error text is never current state.
- **MECHANISM:** OBSERVED IN CODE, DEMONSTRATED BY TEST. `healthFromSnapshot`
  (internal/claudetui/tmux_bridge.go:453) classifies the pane tail against
  `authErrorPatterns` (L463) and `recoverableErrorPatterns` (L471), then
  runs the cached headless auth probe (`verifiedAuthState`) as the
  authority. Three-way verdict (L500-518): probe-OK => OK:true, summary
  "ok (pane shows stale auth error text (...); headless probe verified
  credentials)"; probe-failed => OK:false, Recoverable:false ("login
  expired"); probe-inconclusive => OK:false, Recoverable:true ("will
  retry"). The code comment documents the real incident: "treating it as
  current state has crash-looped daemons whose credentials were long
  since valid again." Pinned by health_test.go.
- **WHY IT WORKS:** It separates the evidence channel (transcript text,
  which is a lagging, sticky rendering) from the state channel (a live
  probe that exercises the actual credential). The three-way verdict
  keeps "cannot tell" distinct from "proven dead", which is what stops
  the crash loop: inconclusive never converts to a manual-intervention
  demand.
- **FAILURE IT PREVENTS:** Crash-looping healthy workers on stale error
  text; monitors manufacturing BLOCKED verdicts from logs; human
  intervention demanded for already-resolved incidents.
- **ASSUMPTIONS:** The headless auth probe is itself authoritative and
  cheap (a `-p "Reply with the single word: ok"` round trip). Probe
  caching does not go stale in the other direction. The pattern lists
  cover the error surface.
- **PING EQUIVALENT:** PING's UNKNOWN-as-legitimate-state doctrine; the
  falsification bar; tripwire health classification.
- **PING STRONGER-WEAKER-DIFFERENT:** The invariant is NEW as a stated,
  tested mechanism, and it is the operational form of PING's own UNKNOWN
  doctrine applied to health monitoring. PING's doctrine is stronger in
  principle; Goated shows the mechanical shape (two-channel verdict +
  pinned regression test from a real incident). Any PING monitor that
  derives worker health from logs, last-known status, or cached error
  text should be checked against this rule.
- **TEST WE CAN STEAL:** feed a monitor logs containing an old BLOCKED
  signal while the live probe passes; assert the verdict stays healthy
  or UNKNOWN, never BLOCKED. (Goated's health_test.go is the template.)
- **CODE WE ACTUALLY NEED:** none.

**Verdict: NEW INVARIANT FOUND**

### G-2. Bounded recovery via Recoverable classification (Goated)

- **PROBLEM:** A supervisor that restarts a failed worker must distinguish
  "restart might help" (transient/code failure) from "restart cannot help"
  (credential/environment failure) from "restart will make it worse".
  Retry counting alone cannot make that distinction.
- **INVARIANT:** Every health verdict carries a Recoverable bit. Non-
  recoverable => zero restarts, immediate escalation. Recoverable =>
  bounded restarts with spacing, then a human terminal state. No
  unbounded loop, no global circuit-breaker state.
- **MECHANISM:** OBSERVED IN CODE. `HealthStatus{OK, Recoverable, Summary}`
  consumed by `ensureHealthySession` (internal/gateway/service.go:547):
  `maxSessionRetries = 5`, one restart per minute; `if !recoverable`
  returns a manual-intervention error immediately (zero restarts, L563);
  after exhaustion DMs the admin chat ("Tried restarting 5 times over 5
  minutes but it won't recover") and stops. Restart-loop prevention comes
  from classification + retry ceiling + human terminal state, with no
  restart counter or backoff state machine in the supervisor.
- **WHY IT WORKS:** The retry policy is driven by a property of the
  failure (recoverable or not), not by a count of attempts. Credential/
  environment failures skip the restart loop entirely instead of burning
  5 futile restarts; transient failures get their bounded chance; the
  admin DM is the honest terminal state rather than silent giving-up or
  infinite looping.
- **FAILURE IT PREVENTS:** Infinite restart loops; futile restarts on
  credential/environment failure; silent worker death with no escalation.
- **ASSUMPTIONS:** The Recoverable classification is correct (a
  misclassified auth failure as recoverable burns 5 restarts; a
  misclassified transient as non-recoverable escalates unnecessarily).
  The admin DM channel is monitored by a human.
- **PING EQUIVALENT:** PING worker retry/lease policy; ORCA self-wake/
  tripwire economy; SI-03 escalation gate.
- **PING STRONGER-WEAKER-DIFFERENT:** DIFFERENT. PING's escalation
  machinery is richer, but the Recoverable bit as a first-class field
  of every health verdict (rather than parsed from error strings at
  the retry site) is the portable improvement: classify once at the
  health boundary, consume everywhere downstream.
- **TEST WE CAN STEAL:** retry-ceiling: after N consecutive failed
  worker restarts, no further restart is attempted and the escalation
  event is emitted exactly once. Non-recoverable: zero restarts
  attempted, escalation immediate.
- **CODE WE ACTUALLY NEED:** none.

**Verdict: MECHANISM BENCHMARKED**

### G-3. Detached-guardian gate-file completion protocol (Goated)

- **PROBLEM:** A supervisor needs to know when a headless worker run
  finishes and with what status, without polling child state (polling
  couples the supervisor to worker internals and rots into a stateful
  child-process manager).
- **INVARIANT (attempted):** Completion is reported by a detached
  callback the supervisor does not poll for; the worker's launcher
  wrapper waits on a gate file, captures the exit status, reports it,
  and self-deletes. The supervisor never inspects child processes.
- **MECHANISM:** OBSERVED IN CODE. The launcher writes a generated shell
  wrapper (internal/subagent/run.go:466-514): `while [ ! -f gate ]; do
  sleep 0.05; done`, run the command, capture `$?`, set
  finish_status=ok/error, invoke `subagent-finish --status
  $finish_status --run-id $run_id ...`, then `rm -f` the wrapper, gate
  file, and run-id file. `HandleCompletion` records the status and
  notifies the main session (run.go:138). 500MB log cap via
  sizeWatchWriter (run.go:322). No daemon polling of child state
  anywhere in the tree.
- **WHY IT WORKS:** The attachment is a protocol, not a supervisor data
  structure: gate file for start gating, exit code for status, callback
  for reporting, self-deletion for cleanup. The supervisor holds no
  child-process table to corrupt or leak, which is why Goated's whole
  liveness story fits in a PID file, a Unix socket, and a 107-line bash
  watchdog on 2-minute cron.
- **FAILURE IT PREVENTS:** Supervisor/child state skew; leaked child
  tracking state; polling-induced coupling between supervisor and
  worker runtime internals.
- **ASSUMPTIONS:** The callback channel (Unix socket + helper CLI) is
  available at completion time. The exit code is a faithful summary of
  the run. **The run_id is read from a temp file into a shell variable:
  there is no binding between the finishing process and the run ID.**
  A replaced helper binary or a stray process can misattribute
  completion. Completion is worker self-report, trusted by the
  supervisor.
- **PING EQUIVALENT:** ORCA run tracking / effect reconciler; PING's
  result verification and receipt machinery.
- **PING STRONGER-WEAKER-DIFFERENT:** The no-poll attachment PATTERN is
  smaller than a stateful child manager (SMALLER IMPLEMENTATION FOUND),
  but the completion attribution is an AUTHORITY BYPASS: the worker
  asserts its own completion status and run identity with no
  nonce/capability binding, which is exactly "worker promotes output to
  truth by self-report." PING must bind completion to the attempt
  (nonce/capability issued at dispatch, verified at receipt), never
  accept a bare `--run-id` assertion.
- **TEST WE CAN STEAL:** completion-attribution binding: a completion
  callback presenting a run ID without the dispatch-issued nonce is
  rejected; the supervisor never marks a run complete on self-report
  alone. (A test Goated would fail and PING should pass.)
- **CODE WE ACTUALLY NEED:** none.

**Verdict: SMALLER IMPLEMENTATION FOUND for the no-poll attachment pattern; AUTHORITY BYPASS FOUND in the completion attribution (self-reported run-id, no process binding)**

---

## The worker prohibitions, per donor

Can a worker grant itself capability, expand its budget, rewrite its
objective silently, promote output to truth, approve itself, manufacture
evidence, or turn uncertainty into success?

**MatrixClaw.** Grant itself capability: native children NO (daemon-owned
tool allowlist `subagentToolAllowed`; the child cannot re-add tools), but
external children are launched bypass by ADAPTER DEFAULT
(`defaultApprovalPolicy="never"`, `defaultSandbox="danger-full-access"`,
codexapp/runtime.go:33-34), so the adapter grants what the worker never
asked for. This is the donor's sharpest authority flaw: the same
`delegate_task` call runs under daemon approvals + parent bridging when
native and under full bypass when external, with no explicit
authorization delta; the MODEL picks the runtime by name. Expand budget:
bounded (async cap 4/session, no recursive spawn), but no per-task
token/time budget observed. Rewrite objective: goal passed as text by
the parent; child system prompt constrains scope, prose not code.
Approve itself: NO, approvals bridge to the parent session (native
children). Manufacture evidence: no evidence machinery to corrupt; child
summary folds into the parent journal as a message. Uncertainty into
success: typed `turn.failed` event exists; empty summary defaults to
"Subagent completed without a text summary.", not fabricated success.
Cancellation: CLAIMED BY AUTHOR via the Interrupt interface, FALSIFIED
in code (unimplemented on both adapters, error swallowed at
external_agent_execution.go:424).

**MyAgens.** Grant itself capability: NO through delegation
(`delegatedPermissionMode` caps child permissionMode at caller autonomy,
computed by framework code). Caveat: worker default autonomy = full
(bypass) is a standing posture weakness. Expand budget: NO (30-min
timeout, maxConcurrent 3, enforced by the delegator). Rewrite objective:
task text set by delegator; reflection/skill paths are separate surfaces
with their own (weaker) gates. Approve itself: the shared canUseTool
gate applies, but a full-autonomy worker bypasses it, so the prohibition
holds only for supervised workers. Manufacture evidence: memory writes
guarded (`guardHotTier`, injection patterns, DATA ONLY fencing); model-
driven consolidation is batch-scoped (keep/drop ids restricted to the
sent batch, drops hard-capped at batch size, re-fetch by id before
mutating, maintenance.ts:364-389), so an injected "drop everything"
instruction cannot nuke the store. Uncertainty into success: skill
"proven by use" is CLAIMED BY AUTHOR but FALSIFIED (no effectiveness
gate; reflection fires on cost/duration thresholds and the proposing
model judges itself).

**Goated.** Grant itself capability: the question is moot, the supervisor
grants everything up front (`--dangerously-skip-permissions` on every
subagent launch, run.go:260,283; session.go:65). There is no capability
to grant because there is no boundary. Expand budget: bounded by
timeouts and log caps, not by authority. Rewrite objective: prompt is
supervisor-composed. Approve itself: no approval path exists for
subagents. Promote output to truth: YES, structurally, completion
status is worker self-report via the shell callback with no binding
between finishing process and run ID (G-3 AUTHORITY BYPASS). Manufacture
evidence: the msglog is append-only daily JSONL, but nothing stops a
worker from writing misleading content into its own log. Uncertainty
into success: `HandleCompletion` maps nil runErr to "ok"; unknown worker
states are not typed.

---

## Direct answer: can PING swap one worker behind one work contract?

**Yes for the turn protocol; no for authority, failure, and cancellation
semantics, and the donors show exactly why.**

MatrixClaw proves the interchangeable shape is real and small:
`RuntimeAgent` (5 lifecycle methods) + a 10-kind normalized event
envelope lets Codex, Claude Code, and a native runtime sit behind one
dispatch path with no per-worker branches. That is the harvestable
contract shape for ORCA.

But the same donor falsifies full interchangeability:

1. **Selection is by name, not capability.** The model picks the runtime
   string; "auto" silently resolves to native. A constitutional work
   contract must have the capability authority select the executor by
   eligibility (task classes, tools, cost, context limits), never the
   model by name.
2. **Authority posture is fused into the transport.** The identical
   delegate call runs under daemon approvals + parent bridging (native)
   or full bypass (external), with no explicit authorization delta. A
   work contract that does not carry the authority posture per WorkOrder,
   decided by the capability authority and never by adapter default,
   changes constitutional semantics when the worker changes.
3. **Cancellation and health are not interchangeable.** Interrupt is
   declared, advertised (honestly) as unsupported, invoked anyway, and
   its error swallowed; health is binary presence. Swapping a worker
   behind the contract changes what "cancel" and "healthy" mean.

MyAgens adds the fourth falsification: **the conversation/resume handle
is executor-scoped, not contract-scoped.** `runTurnWithFallback` drops
the resume token on backend change because "a resume handle is
meaningful on a different backend's CLI" is false. Any contract that
assumes handle portability across workers will resume into a void.

Goated adds the fifth: **result verification is not interchangeable.**
Its workers self-report completion with no process binding. A contract
that accepts self-reported status changes truth semantics versus one
that verifies receipts.

So: one work contract CAN cover dispatch, event observation, and
completion delivery across heterogeneous workers (MatrixClaw's shape).
It CANNOT cover executor selection, authority posture, cancellation,
health, handle portability, or result verification without those being
explicit, typed, per-WorkOrder fields decided by PING's authorities,
never by the worker, the adapter, or the model. Under those conditions,
swapping workers preserves constitutional semantics; the donors show
that omitting any one of them silently changes the semantics while the
interface stays green.

---

## Grounding notes

- All file/line citations refer to the pinned shallow clones under
  ~/workspace/ping-24h/donors/{matrixclaw,myagens,goated}/ at the SHAs
  in raw/pins.txt. Builds on (not redoing) wave-1 lane reports D
  (MatrixClaw), D-sub (Goated), D-sub2 (MyAgens) in
  ~/workspace/runtime-harvest/wave1-donor-reports.md.
- Cross-checked against first-pass findings where PING-relative claims
  are made (findings #7, #9, #10); PING-side "already stronger" claims
  rest on that file's workspace-tree verification, not on fresh PING
  source reads in this lane.
- Not verified in this lane: runtime behavior of any donor (read-only);
  MatrixClaw issue/PR cadence and whether v0.1.19 is tip of default
  branch; MyAgens panel-side enforcement and real failover behavior
  under rate limits; Goated watchdog behavior in practice and the
  ~20MB RSS claim. None of these affect the mechanism verdicts, which
  rest on source reads.

**This report is a hypothesis until replayed from a clean checkout.**
