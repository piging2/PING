# LANE B: Current Codex + Agent Orchestration Patterns

Read-only research, 2026-09-28. Public sources only (web search, GitHub repos, docs, changelogs, release notes, community mirrors). No sign-ins, no purchases, no credentials, no code writes beyond this report.

Codex policy (binding): Codex is DORMANT/HOLD. Harvest ideas ONLY. Nothing here proposes depending on Codex, reactivating credentials, building around it, or any auth plumbing. The only return path is owner credentials making it cheap AND a measured benchmark win; that decision is the owner's, not this lane's.

Judgment criteria for every verdict: deterministic state, durable runs, clear authority, isolated work, observable transitions, reproducible tests, safe landing, fast recovery, multi-agent optionality, model optionality, no provider lock-in, one source of truth, low operator cognitive load.

Verdict vocabulary:
- PING ALREADY BETTER: PING's existing doctrine/mechanics beat the external primitive on the criteria.
- HARVEST: steal the primitive (mechanics, not branding).
- ADAPT: useful shape but needs reshaping to fit PING's authority/event model.
- REJECT: conflicts with criteria or is weaker than what PING already has.

---

# PART 1: CODEX LESSONS

Mechanisms observed in OpenAI Codex CLI releases ~0.139 to 0.156 (June to September 2026), the app-server protocol, and the codex-sdk surface.

## 1.1 Thread/turn/item event model with typed JSONL stream

Mechanism: `codex exec --json` emits flat JSONL: `thread.started` (thread_id), `turn.started`, `item.started`, `item.completed`, `turn.completed` (carries `usage` with input_tokens, cached_input_tokens, output_tokens), `turn.failed`, `error`. Item types: `agent_message`, `reasoning`, `command_execution`, `file_change`, `mcp_tool_call`, `web_search`, `plan_update`. The app-server exposes the same vocabulary as JSON-RPC notifications plus `item/agentMessage/delta` (streaming deltas), `turn/diff/updated`, `turn/plan/updated`, `thread/status/changed`. It is a projection contract, not a log: consumers can jq-filter one event type.

What it does better: one small typed event vocabulary serves CLI, SDK, TUI, and external orchestration consumers identically. PING's event/evidence plane is the richer authority, but Codex demonstrates the value of a fixed, minimal, SSE-friendly surface vocabulary for run progress.

Verdict: ADAPT. PING should keep its event plane as authority and define a similarly small stable progress-event projection (started/completed/failed at run, step, and artifact granularity with token usage attached) as the one contract Mission Control consumes. Do not copy thread/turn/item names wholesale; keep PING's object vocabulary.

## 1.2 Rollout: append-only event-sourced run log, read post-exit

Mechanism: every run persists an append-only rollout JSONL file under `~/.codex/sessions/` plus a SQLite state DB. Sessions are resumable by UUID via `codex exec resume <id>` or `resume --last`. External orchestrators (warden) source the rollout FILE rather than the live stream, so the transcript is available identically for TUI and headless runs and after the process exits.

What it does better: the log file is the durable run truth; the live stream is disposable. Recovery reads the file, never replays a stream.

Verdict: HARVEST. Primitive name: "file-first run transcript". Gap in PING: lane run state currently lives across heterogeneous surfaces (logs, lane briefs, ad-hoc files). A standard per-run append-only event file with a defined schema, written by every worker, would make any run inspectable, replayable, and resumable by any consumer, independent of transport (live stream, SSE, or post-exit read). Pair with the existing clean-checkout replay doctrine.

## 1.3 turn/start is async; turn/interrupt and turn/steer are first-class

Mechanism: `turn/start` returns IMMEDIATELY with `inProgress` status; progress arrives as notifications. `turn/interrupt` cancels an in-flight turn (finishes with status `interrupted`). `turn/steer` appends input to an in-flight turn without restarting it. `thread/rollback` drops the last N turns from context and records a rollback marker in the rollout log.

What it does better: operator control mid-flight without killing the process; steering avoids a cold restart (and its MCP re-init / AGENTS.md reload costs, which Codex pays per re-invocation).

Verdict: HARVEST. Primitive name: "interrupt and steer as typed run transitions". Gap in PING: lane/worker control is stop-and-restart. Interrupt (cancel with typed terminal state `interrupted`, partial results preserved in the rollout log) and steer (inject new instruction into a running worker's queue) would cut recovery time on long autonomous runs and give Mission Control a real pause/resume vocabulary instead of kill semantics.

## 1.4 thread/rollback with evidence marker

Mechanism: rollback drops the last N turns from in-memory context and writes a rollback marker into the persisted log, so the history shows what was rolled back rather than pretending it never happened.

What it does better: recovery is explicit, not silent. The log distinguishes "this happened and was reverted" from "this never happened".

Verdict: HARVEST. Primitive name: "evidence-marked rollback". Gap in PING: recovery narratives today are prose in lane reports. A rollback that emits a typed event with the reverted turn range and the reason gives the audit trail and replay machinery something deterministic to consume.

## 1.5 Structured output contract: --output-schema and -o/--output-last-message

Mechanism: `codex exec --output-schema <file>` constrains the final message to a JSON Schema; `-o`/`--output-last-message <path>` writes the final message to a file so the orchestrator reads the artifact instead of scraping the stream. Same contract exists per-turn on app-server `turn/start` (`outputSchema`).

What it does better: separates the deliverable (schema-validated artifact file) from the progress (stream). The orchestrator never parses prose for results.

Verdict: HARVEST. Primitive name: "artifact file + schema as the turn contract". Gap in PING: worker deliverables are often prose reports or mixed into logs. Requiring every worker turn to optionally declare an output schema and a deliverable file path makes acceptance checks mechanical and feeds the falsification loop directly.

## 1.6 Propose/approve/apply separation with hash binding

Mechanism (external pattern built on Codex, from 0x000x7f/codex-cli-mcp-bridge): three tools split mutation into phases. `codex_propose_patch` is read-only: returns validated unified diff text plus sha256 and base_head, validated with `git apply --check`, never applies. `codex_apply` is the ONLY mutating tool: deterministically applies the exact reviewed diff, requiring `approval === true` plus `expected_sha256` and `base_head`; applies to the working tree only, never stages or commits. Fail-closed checks are never weakened.

What it does better: review and application are different capabilities with different authorities; the approval binds to the exact bytes (hash) and the exact base (head), so a review cannot silently drift onto changed state.

Verdict: HARVEST. Primitive name: "hash-bound propose/apply split". Gap in PING: agent write authority is granted as a blanket (surgical writes). The hash-bound split is the precise shape that authority should take: propose returns a byte-exact diff with base hash; apply verifies base still matches and approval names that hash. This is the missing bridge between PING's "plan-then-act" and its "no infrastructure change on a hypothesis" rules.

## 1.7 Real patch grammar (apply_patch) vs string replacement

Mechanism: Codex file edits use `apply_patch`, a real patch grammar with hunks, rather than Edit/Write string replacement. Patches are reviewable, validatable (`git apply --check`), and diff-native.

What it does better: an edit is a first-class object (hunk set) with deterministic application semantics, not a pair of strings that might match differently than intended.

Verdict: HARVEST. Primitive name: "diff-native edit objects". Gap in PING: worker edits are applied through whatever tooling the worker uses. Standardizing the edit artifact as a unified diff (with base binding, see 1.6) makes every change reviewable, checkable, and replays cleanly.

## 1.8 Approval policy matrix: sandbox (physical) x approval (when to pause)

Mechanism: two orthogonal axes. Sandbox: `read-only` / `workspace-write` / `danger-full-access` (headless defaults to read-only). Approval: `untrusted` / `on-failure`(deprecated) / `on-request` / `never`, plus a granular object form (`sandbox_approval`, `rules`, `mcp_elicitations`, `request_permissions`, `skill_approval`). Headless defaults `never` auto-CANCELS elicitations (fail-safe default); `--full-auto` shifts to `on-request` which auto-approves commands. `codex review/start` runs a reviewer over `uncommittedChanges` / `baseBranch` / `commit` / `custom`, delivered `inline` or `detached` (forked thread, own id). Approvals can also be routed to a guardian AI subagent (`auto_review`).

What it does better: the two-axis separation (what the process CAN touch vs when to pause for a human) is clearer than a single "YOLO flag". The fail-safe default (never = auto-cancel, not auto-approve) is the correct failure direction.

Verdict: ADAPT. The axes are right; the failure direction is right; the values are Codex-specific. PING should express worker authority as (capability profile) x (pause policy) with fail-closed defaults. PING already has the stance (bounded authorized automation, fail closed on restriction); this gives it a concrete configuration shape. Note the hooks fail-open gap below as the anti-pattern to avoid: a timed-out hook lets the call through, which PING must never do.

## 1.9 Managed worktrees enabled by default; worktree sessions in the agents dashboard

Mechanism: 0.154-0.156 made managed worktrees a first-class product feature: worktree sessions creatable from the agent command center (`codex agents` dashboard), enabled by default, with ownership details and deletion confirmation on clean trees.

What it does better: isolation is the default, not an expert option. The dashboard binds the worktree to the run visually.

Verdict: HARVEST. Primitive name: "isolation by default, dashboard-visible". Gap in PING: worktree isolation is a lane convention, inconsistently applied (see the dirty-tree lane lineage). Making worktree-per-worker the default with the run id bound to the worktree path, visible in Mission Control, removes the class of bugs where workers touch the shared tree.

## 1.10 review/start as a first-class method with targets and delivery modes

Mechanism: `review/start` takes targets (`uncommittedChanges`, `baseBranch`, `commit`, `custom`) and delivery (`inline` on the existing thread vs `detached` fork with its own thread id and its own `thread/started` notification). Reviewer streams enteredReviewMode/exitedReviewMode items with the review text.

What it does better: review is an operation with a typed target and a typed output location, not a prompt you hope the model follows.

Verdict: HARVEST. Primitive name: "typed review operation". Gap in PING: verification is strong culturally (verifier decides truth) but the review operation itself is not a typed primitive with a deliverable schema. A `review` operation with explicit target (diff object, run id, site state) and delivery (inline vs detached report id) would plug directly into the escalation/falsification machinery.

## 1.11 Hooks and permissions architecture (Claude Code comparison dimension)

Mechanism: deterministic callbacks on ~24 events (SessionStart/End, PreToolUse, PostToolUse, PermissionRequest, PermissionDenied, SubagentStart/Stop, TaskCreated/Completed, PreCompact/PostCompact, ConfigChange, CwdChanged, FileChanged, MCP Elicitation...). Hooks return JSON decisions via stdout: block, rewrite input (`updatedInput`), inject context (`additionalContext`), modify output, terminate session (`continue: false`). Exit code 2 = hard block. Permission modes: `default` / `plan` / `acceptEdits` / `auto` (LLM classifier) / `dontAsk` / `bypassPermissions`. CLAUDE.md hierarchy (global, project, directory, recursive upward).

What it does better: hooks are the deterministic safety seam between the model and the OS; the PreToolUse hook can REWRITE tool arguments, not just block them. The permission decision is observable (PermissionDenied event exists).

Verdict: ADAPT with one hard warning. The hook-event vocabulary and the rewrite-instead-of-block capability are worth adapting as PING's deterministic safety seam. The WARNING: documented evidence shows hooks fail OPEN on timeout or crash (a timed-out guard lets the tool call through). PING must invert this: hook failure = block. Also the benchmarking caveat (hooks silently inject context; use --no-hooks for fair evals) applies to PING's eval gates: any eval run must declare hook state.

## 1.12 Sandbox composition: bwrap FS + seccomp network + no_new_privs; Landlock retired

Mechanism (source-verified in codex-rs): Linux sandbox composes bubblewrap for filesystem namespace isolation, in-process seccomp for network/syscall restriction (AF_UNIX carveout for local IPC), and PR_SET_NO_NEW_PRIVS. Landlock filesystem code EXISTS but is explicitly unused (comment: "currently unused because filesystem sandboxing is performed via bubblewrap... kept for reference and potential fallback use"); only the network seccomp filter is applied in-process. macOS: Seatbelt. Windows: low-privilege sandbox users + firewall egress rules. Codex ALSO keeps read-everything (full-disk read in all non-danger modes) as the documented posture; threat model is synthesized from the denied-syscall set (block ptrace, process_vm, io_uring).

What it does better: three mechanisms, each doing what it does best, instead of one leaky abstraction; and the discipline to retire the redundant mechanism (Landlock-FS) rather than maintain two FS paths. The AF_UNIX carveout shows honest security/compatibility tradeoff reasoning.

Verdict: ADAPT. Primitive name: "composed sandbox, retired redundancy". Gap in PING: lane workers run largely unsandboxed or under ad-hoc restrictions. For lanes touching risky surfaces (browser automation, external deploys), a composed sandbox profile (FS namespace + network filter + no_new_privs) is the right shape. Equally important is the meta-lesson: when two mechanisms cover the same boundary, keep one and document the retirement; do not stack. Also note the Codex weak point to avoid copying: full-disk READ in non-danger modes (auth.json readable under workspace-write) means its sandbox is an action boundary, not a secret boundary. PING must treat credential isolation as a separate, explicit boundary (PING already has this instinct via Secure Vault; keep it).

## 1.13 Agent SDK / structured seam: maxTurns, maxBudgetUsd, outputFormat, file checkpointing

Mechanism (Claude Agent SDK, the Codex-analogous library surface): sessions (resume/fork), file checkpointing, `maxTurns`, `maxBudgetUsd` (spend cap: refuses new spawns, stops background subagents, ends query with `error_max_budget_usd`), structured `outputFormat`, worktree isolation for subagents.

What it does better: the budget is a typed abort, not a suggestion. `maxBudgetUsd` converts cost into a state machine transition with a named error.

Verdict: HARVEST. Primitive name: "typed spend cap with named exhaustion state". Gap in PING: cost/volume tripwires exist for engagement, but worker lanes have no per-mission spend cap that aborts deterministically. A budget that ends the run with a named terminal state (not a timeout, not a human noticing) is the missing primitive for autonomous nights.

## 1.14 Multi-agent controls: /batch (one PR per worktree agent), agent teams, agent view

Mechanism: `/batch` analyzes a codebase, splits it into independent units, asks approval, spawns one agent per unit in an isolated git worktree; each runs tests and opens its own PR; each agent runs a parallel review skill before PR creation (pre-reviewed). Agent teams: lead + long-running peer teammates sharing a task list (status flags: pending / claimed-by:<id> / in-progress / done / failed / blocked, atomic claim writes or optimistic concurrency) plus direct mailbox messaging; partition by file ownership, not by ticket. Agent view: operator dispatches independent background sessions, each auto-worktree-isolated, monitored from a wall-of-CCTV UI; cross-session messaging (ListAgents/SendMessage).

What it does better: three coordination modes for three coupling levels (independent units -> /batch; interdependent -> teams with shared task list + mailbox; human-supervised background -> agent view). The shared-task-list claim flags with atomic-claim semantics are the precise concurrency primitive.

Verdict: HARVEST. Primitive name: "coupling-matched coordination modes + atomic task claims". Gap in PING: lane dispatch is mostly single-worker or ad-hoc parallel; there is no shared task list with claim semantics across lanes, and no background-session wall for nights. The claim-flag protocol (pending/claimed-by/in-progress/done/failed/blocked with atomic claim) is directly stealable for multi-lane or multi-worker units.

## 1.15 Dynamic workflows: orchestration as code with memoization and determinism

Mechanism: Claude writes a JavaScript orchestration script (`agent()`, `pipeline()`, `parallel()`, `phase()`); the workflow runtime executes it in the background OUTSIDE the conversation. Intermediate results stay in script variables, not context. Phases show progress, are resumable, and support adversarial cross-checking (verifiers vote on claims). Up to 16 concurrent agents, 1000 per run. Saved scripts in `.claude/workflows/`. Determinism rule: replay on resume reuses memoized agent results; `Date.now()` is forbidden in workflow scripts.

What it does better: the plan is code, not conversation. Memoization makes resume deterministic by construction. The determinism lint (forbid wall-clock in workflow code) is the kind of rule that makes replay claims true.

Verdict: HARVEST. Primitive name: "orchestration-as-code with memoized replay". Gap in PING: orchestration currently lives in prose briefs and parent-agent judgment. A deterministic workflow artifact (code, versioned, memoized results, wall-clock forbidden) that a runtime executes and replays is the strongest external precedent for PING's own determinism doctrine, and it is stronger than prose briefs on the reproducibility criterion.

## 1.16 Context engineering primitives: CLAUDE.md hierarchy, compaction, usage dashboards

Mechanism: instruction hierarchy (global -> project -> directory -> recursive upward, deeper wins); autoCompact with re-injection; draft recovery; `/usage` analytics dashboard (token totals, plugin/skill activity); cost estimates; queued messages; interrupt hooks.

What it does better: treats context as a budget with observability (usage analytics per surface) and recovery (draft recovery, transcript history, paginated forks).

Verdict: ADAPT. The usage-visibility and draft-recovery primitives are worth adapting (PING lanes burn tokens with little per-lane accounting). The CLAUDE.md hierarchy itself maps to PING's standing-context files; PING ALREADY BETTER on the authority side (PING's injected files are versioned and explicit, not silently injected prose).

---

# PART 2: EXTERNAL MISSION CONTROL LESSONS

Systems: OpenClaw Mission Control, AgentOS, codewhale/deepseek-tui, orca family (orca-cli/orca, stablyai/orca, alex2481kobe/orca, epoco742/orca), Grove, Bernstein, Microsoft Conductor, Herd, Vibe Kanban, and the MCP Tasks extension.

## 2.1 orca-cli/orca: one binary, SQLite+FTS5 run state, MCP control plane, DAG agents can read and drive

Mechanism: single Go binary; run state in `~/.orca/orca.db` (SQLite + FTS5 full-text search); every agent isolated in its own git worktree under `.orca/runs/<id>/`; exposes an MCP server so any agent can drive Orca or be driven by it; adapters for Claude Code, Codex, Aider, OpenCode, Cursor via MCP stdio. The premise: "each agent loses its entire run context the moment the session compacts; Orca holds the state."

What it does better: the control plane is model-optional (any MCP-capable agent) and the state is a real database with full-text search, not a pile of JSON files. Agents read the DAG and the run logs as data.

Verdict: PING ALREADY BETTER on the authority/event side (PING's event plane + one semantic authority beats a local SQLite silo), but HARVEST the shape: control plane as a queryable store with full-text search over run state, reachable over a stable protocol (MCP), with any agent able to drive it. PING's Mission Control should be a database-backed projection, not file scraping. FTS5 over run transcripts specifically is the primitive: search every run's full text fast.

## 2.2 orca (stablyai): fan-out compare mode, SSH remote worktrees, annotate-and-ship review loop

Mechanism: fan one prompt across five agents, each in its own isolated worktree, compare results, merge the winner. SSH worktrees run agents on remote boxes with auto-reconnect. Annotate AI diffs: drop comments on any diff line and ship them back to the agent; review, edit, commit without leaving the app. Per-worktree browser + Design Mode: click any DOM element, its HTML/CSS/cropped screenshot lands in the agent's prompt.

What it does better: the review loop closes the gap between human judgment and agent action (annotate -> ship back to agent -> re-run). The fan-out compare mode makes model optionality concrete: same task, N agents, pick the winner.

Verdict: HARVEST. Primitive name: "fan-out compare with annotate-and-ship". Gap in PING: lane adjudication compares lane self-reports in prose; there is no run-the-same-task-across-workers-and-compare-the-artifacts primitive, and no annotate-a-diff-and-send-it-back-to-the-worker loop. The design-sprint adjudication and the FYD website loop both need exactly this.

## 2.3 orca (alex2481kobe fork): agent spawns agent over MCP, server-enforced contract, process exit as done

Mechanism: local daemon, no agent/model/API keys/chat UI of its own. Orchestrator registers for its working directory, spawns executor subagents; the contract is enforced by the server, not by prompt text; the subagent's process exit is the authoritative "done". Review gate: executor submits, orchestrator audits and accepts/sends back/blocks (never self-approval). Isolation lanes default `auto`: read-only or sole-writer lanes run directly in the checkout; a dedicated git worktree is created only when writers would collide. Phone dashboard over Tailscale with break-glass stops.

What it does better: enforcement lives in the server, not in prose. The `auto` isolation lane is the honest cost model: full isolation only where writers collide. Process exit as the done signal is unambiguous.

Verdict: HARVEST. Primitive name: "server-enforced spawn contract + collision-triggered worktrees". Gap in PING: lane contracts are prose briefs enforced by reading; a server-side spawn contract (register, spawn, typed lifecycle, exit-as-done) would make multi-worker dispatch mechanical. The collision-triggered worktree rule is the precise refinement of 1.9: do not pay worktree overhead for read-only lanes.

## 2.4 orca (epoco742): review gate node with structured schema, reject-by-default timeout, Git node ops

Mechanism: visual DAG runtime. The `review` agent is a judge with structured schema `{approve, summary, findings}` and read-only tools. The `approve_diff` gate shows items with renderers (markdown/text/json/diff), has a timeout and an on-timeout DEFAULT (reject). Git nodes are typed operations on an agent node's worktree: `diff` / `commit` / `push` / `pr.create` / `worktree.remove` / `worktree.keep`. Failed/cancelled runs leave worktrees locked until the retention sweep (default 7 days); keep/discard are explicit. Map bodies template the worktree-of-node field.

What it does better: review is a node in the DAG with a typed verdict schema and a safe default on timeout (reject, not approve). Git operations are typed nodes with explicit outputs (diff, files, stats, commit, branch, pr_url), not shell commands. Retention is explicit with a sweep and explicit keep.

Verdict: HARVEST. Primitive name: "typed review-gate node with reject-by-default timeout + typed git ops + retention sweep". Gap in PING: gates are cultural (verifier decides truth) but not typed nodes; timeouts default to nothing explicit. A gate that REJECTS on timeout is the correct failure direction for autonomous nights. Typed git ops (diff/commit/push/pr as operations with structured outputs, never raw shell) is the safe-landing shape for lanes that touch repos.

## 2.5 Grove: agent DAG editor, structured message envelopes, DB-enforced edge invariants

Mechanism: Rust worktree+tmux workspace manager. Visual DAG editor for agent graphs. Cross-agent messages use structured `<grove-meta>` envelopes, not string concatenation. Six MCP tools: `spawn` / `send` / `reply` / `contacts` / `capability` / `get_spawn_candidates`. Cycle detection and single-in-flight-per-edge enforced at the DB layer.

What it does better: invariants (no cycles, single in-flight per edge) are enforced by the store, not by agent discipline. Structured envelopes make messages queryable.

Verdict: HARVEST. Primitive name: "store-enforced DAG invariants + structured message envelopes". Gap in PING: PING already has structured job envelopes (PING ALREADY BETTER on envelopes), but has no store-enforced invariants on agent topology (no cycles, no duplicate dispatch, single ownership). A run store that refuses invalid topologies is stronger than prose lane rules.

## 2.6 OpenClaw Mission Control: local-first control plane shape

Mechanism: Next.js + SQLite WAL + migrations; WebSocket and SSE event bus; tracks tasks, agents, sessions, logs, channels, skills, memory, cron, tokens, costs, alerts, webhooks, GitHub sync, gateway health, local CLI sessions; 253 OpenAPI operations; RBAC; CI quality gates (Vitest, Playwright, API contract parity). Alpha but serious: 5,557 stars, 97 test files, 69 Playwright specs.

What it does better: demonstrates the full control-plane checklist in one local-first package: state (SQLite WAL), realtime (WS/SSE), cost tracking, scheduling, audit. Shows that a local-first Mission Control does not need cloud.

Verdict: ADAPT. The checklist and the local-first posture confirm PING's direction; the implementation is a product, not a primitive. Steal the checklist (tasks, agents, sessions, logs, tokens, costs, alerts, schedules, health in one surface) and the local-first default, not the codebase. PING ALREADY BETTER on authority: PING's one semantic authority vs their task/session stores with no stated single source of truth.

## 2.7 AgentOS: per-run budgets, pre-run cost estimate, ModelProvider seam, learning gate

Mechanism: every `/api/*` route authenticated; runs confined to catalog roots with a clamped toolset; per-run budgets abort runaways; pre-run cost estimate before dispatch; every trigger/stop/config audited. Multi-provider behind a single `ModelProvider` seam (Anthropic CLI, Anthropic API, Gemini, Ollama) with provider/model/effort/auth chosen per run. Learning: finished runs extract durable facts, redact PII, store as candidates; a HUMAN approves; next run retrieves top-k approved memories as inert delimited context.

What it does better: cost is estimated BEFORE the run and enforced DURING the run (abort, not alert). Model optionality is a seam, not a flag. Learning has a human approval gate and memories are injected as inert delimited context (not trusted prose).

Verdict: HARVEST. Primitive name: "pre-run cost estimate + aborting budget + human-gated learning memory". Gap in PING: no pre-run cost estimate; no aborting per-run budget (see 1.13, same primitive from a second source); learning currently lands in files/memory without a candidate/approve/inert-inject pipeline. The inert-delimited-inject shape is precisely how memory should enter worker context without becoming authority.

## 2.8 codewhale/deepseek-tui: side-git workspace rollback, durable task queue, prefix-cache telemetry

Mechanism: workspace rollback via side-git pre/post-turn snapshots (`/restore`, `revert_turn`) WITHOUT touching the repo's `.git`. Durable task queue: background tasks survive restarts. HTTP/SSE runtime API for headless workflows. Prefix-cache stability tracking: a statusline chip shows how stable the cached prefix has been, so cost-busting edits are visible before they land. LSP diagnostics after every edit. Session save/resume/fork with parent lineage.

What it does better: rollback that never pollutes the repo's git history (side-git); cache-stability observability as a cost-control UI; a task queue that survives restarts.

Verdict: HARVEST. Primitive name: "side-channel rollback + restart-surviving task queue + cache-stability signal". Gap in PING: worker rollback today would dirty the repo or be prose-only; a side-git snapshot mechanism gives lanes free undo without touching history. The restart-surviving task queue is the durability shape for nights and commutes. The cache-stability signal is a nice-to-have cost UI; rank lower.

## 2.9 MCP Tasks extension (io.modelcontextprotocol/tasks, SEP-2663, spec 2026-07-28)

Mechanism: official extension, capability-negotiated (not assumed). Server returns a task handle (TTL) for long-running tool calls; client polls `tasks/get`, supplies mid-task input via `tasks/update`, cancels via `tasks/cancel`. Lifecycle: `working` -> `input_required` -> `completed` | `cancelled` | `failed`. Elicitation rides inline as inputRequests in `tasks/get` responses (non-blocking). Pluggable task store: in-memory for dev, durable shared storage for tasks that must survive restarts. Client-side stuck-task detector (cancel after N stuck polls). Backward compatible: `resultType: "task"` discriminator; legacy clients get blocking calls.

What it does better: the industry-standard async job contract for tool calls, with non-blocking elicitation (approval-as-input-request, polled) and a durable store requirement spelled out.

Verdict: ADAPT. This is the right shape for PING's long-running worker tools, but adopt as a capability-negotiated extension behind PING's own authority model, not as the authority itself (the ownership matrix is explicit: MCP owns tool transport; the harness owns state, permissions, recovery, orchestration). Watch the spec churn (v1 experimental core vs v2 extension wire formats are NOT compatible).

## 2.10 Worktree lineage and lifecycle discipline (orca-fleet, Vibe Kanban, Bernstein, Microsoft Conductor)

Mechanism (orca-fleet): a supervised worker's worktree is a CHILD of the coordinator (explicit `--parent-worktree`, never inferred); dependent workers (reviewer, fix rounds, integrator) are fresh terminals INSIDE the unit's worktree (same branch, no conversation leakage); chains kept 3-4 deep; one `WT_CLEAN` on the unit worktree tears the whole subtree down at merge. Bernstein: planner -> task graph -> parallel agents -> verifier with deterministic scheduling. Conductor: YAML workflows with parallel groups and conditional routing over worktrees.

What it does better: lineage is explicit and teardown is subtree-scoped; the reviewer is build-blind (fresh session, no builder conversation) which is the actual anti-sycophancy mechanism.

Verdict: HARVEST. Primitive name: "explicit worktree lineage + build-blind review + subtree teardown". Gap in PING: the clean-checkout replay doctrine exists, but worktree lineage between coordinator and workers is ad-hoc and reviewers often see the builder's narrative (sycophancy risk). Making the verifier build-blind by construction (fresh session, same branch, no conversation) strengthens the falsification loop.

## 2.11 Competitive-landscape consensus: git-worktree-per-agent + supervisor gating the merge

Mechanism (from the omp-deck landscape survey): the dominant pattern across ~10 tools is git-worktree-per-agent plus a supervisor process/UI that tracks status and gates the merge back to a shared branch. The two axes: isolation mechanism (worktree vs container vs microVM vs tmux pane) and supervisor autonomy (human clicks merge vs reviewer-agent auto-merges on green CI). Notable: NONE of the surveyed tools offer a node/graph canvas for visually chaining agents; they coordinate via task queues, worktree isolation, or session management.

What it does better: convergence is evidence. The field independently arrived at worktree-per-agent + merge gate.

Verdict: ADAPT. The convergence validates PING's direction; the missing canvas is PING's opening (Mission Control's visual surface is the differentiator none of them have). Do not copy their products; copy the consensus pattern and build the canvas they all lack.

---

# PART 3: RANKED HARVEST LIST (top 10 primitives worth stealing)

Each entry: the primitive, its source(s), the PING gap it fills, why it wins on the criteria.

## 1. File-first run transcript (append-only, typed, replayable)
Sources: Codex rollout (1.2). Gap: lane run state is scattered across logs, briefs, prose. A standard per-run append-only event file with a fixed schema, written by every worker and readable post-exit by any consumer (Mission Control, verifier, replay harness), makes runs durable, inspectable, and resumable independent of transport. Wins on: durable runs, one source of truth, fast recovery, observable transitions.

## 2. Hash-bound propose/apply split
Sources: codex-cli-mcp-bridge pattern (1.6). Gap: agent write authority is a blanket grant; review and application share one capability. Splitting into propose (returns validated unified diff + sha256 + base_head, never applies) and apply (the only mutating tool, requires approval bound to that hash and that base, fail-closed) makes "plan-then-act" mechanical and closes the drift between review and application. Wins on: clear authority, safe landing, deterministic state.

## 3. Interrupt and steer as typed run transitions
Sources: Codex turn/interrupt, turn/steer (1.3). Gap: worker control is stop-and-restart; steering costs a cold restart. Interrupt (typed terminal state `interrupted`, partial results preserved in the transcript) and steer (inject instruction into a running worker without restart) cut recovery time and give Mission Control a real control vocabulary for long autonomous runs. Wins on: fast recovery, low operator cognitive load, observable transitions.

## 4. Typed spend cap with named exhaustion state
Sources: Claude Agent SDK maxBudgetUsd (1.13); AgentOS per-run aborting budgets + pre-run estimate (2.7). Gap: lanes have no per-mission budget that aborts deterministically. A budget that refuses new spawns, stops workers, and ends the run with a named terminal state (not a timeout, not a human noticing) plus a pre-run cost estimate is the missing primitive for safe autonomous nights. Wins on: clear authority, safe landing, low operator cognitive load.

## 5. Typed review-gate node with reject-by-default timeout + structured verdict schema
Sources: epoco742/orca review gate (2.4); Codex review/start (1.10). Gap: verification is cultural, not a typed operation. A review operation with explicit target, reviewer schema {approve, summary, findings}, read-only reviewer tools, and a timeout that DEFAULTS TO REJECT gives the falsification loop a mechanical shape safe for unattended runs. Wins on: clear authority, safe landing, deterministic state.

## 6. Server-enforced spawn contract + collision-triggered worktrees
Sources: alex2481kobe/orca (2.3). Gap: lane contracts are prose; worktree use is inconsistent. A server-side spawn contract (register, spawn, typed lifecycle, process exit as authoritative done, enforced by the server not the brief) plus the `auto` isolation rule (checkout for read-only/sole-writer, worktree only on writer collision) makes multi-worker dispatch mechanical and cheap where isolation is unnecessary. Wins on: multi-agent optionality, isolated work, clear authority.

## 7. Orchestration-as-code with memoized replay (wall-clock forbidden)
Sources: Claude dynamic workflows (1.15). Gap: orchestration lives in prose briefs and parent judgment; replay is manual. A versioned workflow artifact (code, not conversation) executed by a runtime, with memoized step results and replay-on-resume, and a determinism lint (no wall-clock, no randomness in workflow code), is the strongest external precedent for PING's determinism doctrine and directly serves the 24h autonomy goal. Wins on: deterministic state, durable runs, reproducible tests.

## 8. Diff-native edit objects with base binding
Sources: Codex apply_patch grammar (1.7); propose/apply (1.6). Gap: worker edits are tool-specific and unreviewable as objects. Standardizing the edit artifact as a unified diff bound to a base hash makes every change reviewable, `apply --check`-validatable, and replay-clean. Wins on: safe landing, reproducible tests, deterministic state.

## 9. Explicit worktree lineage + build-blind review + subtree teardown
Sources: orca-fleet dispatch lifecycle (2.10); Codex managed worktrees (1.9). Gap: coordinator/worker worktree lineage is ad-hoc; reviewers see the builder's narrative. Fresh-terminal reviewers inside the unit's worktree (same branch, no conversation leakage) plus explicit parent lineage and one-command subtree teardown strengthen the falsification loop and remove dirty-tree incident classes. Wins on: isolated work, safe landing, clear authority.

## 10. Evidence-marked rollback + side-channel snapshots
Sources: Codex thread/rollback marker (1.4); codewhale side-git snapshots (2.8). Gap: recovery is prose or repo-dirtying. Rollback that emits a typed event (reverted range + reason) plus side-git pre/post-step snapshots (undo without touching repo history) gives lanes free, auditable undo. Wins on: fast recovery, deterministic state, safe landing.

### Honorable mentions (did not make top 10, kept for the matrix)
- MCP Tasks extension async job contract (2.9): right shape for long-running tools; adopt behind PING authority when the spec settles (v1/v2 wire formats are incompatible; capability-negotiate).
- Composed sandbox with retired redundancy (1.12): bwrap FS + seccomp network + no_new_privs; keep one mechanism per boundary; treat credential isolation as a separate explicit boundary (Codex's full-disk read posture is the anti-pattern).
- Hooks fail CLOSED (1.11): adapt the hook-event vocabulary and input-rewriting, but invert the industry's fail-open-on-timeout behavior; declare hook state on eval runs.
- Fan-out compare with annotate-and-ship (2.2): run the same task across workers, compare artifacts, annotate diffs back to the worker; needed for adjudication and the FYD loop.
- Store-enforced DAG invariants (2.5): no cycles, single-in-flight per edge, single ownership, enforced by the run store, not by prose.
- Claim-flag task list protocol (1.14): pending / claimed-by / in-progress / done / failed / blocked with atomic claims; the precise concurrency primitive for multi-worker units.
- Approval axes: capability profile x pause policy with fail-closed defaults (1.8); never = auto-cancel, not auto-approve.
- Structured output contract: artifact file + schema per turn (1.5); orchestrator reads files, never scrapes prose.
- Artifact file + usage attached to every turn completion (1.1, 1.5): token usage as a first-class event field feeds cost telemetry.
- The consensus canvas gap (2.11): none of the surveyed tools have a visual agent-chaining canvas; that is Mission Control's opening, not something to copy.

---

# PART 4: WHERE PING IS ALREADY BETTER (with technical reasons)

1. One semantic authority vs scattered state. Codex keeps rollout JSONL + SQLite + cloud history with no stated single source of truth; orca keeps a local SQLite silo per machine; Claude sessions are transcripts with no authority model. PING's event/evidence plane with one semantic authority and tenant-scoped identity beats all of them on one-source-of-truth and no-ambiguity criteria. Do not trade this for any external store.

2. Determinism doctrine vs memoization folklore. Claude's dynamic workflows forbid Date.now() in workflow scripts; Codex has no stated determinism contract. PING's Constitutional Rule of One, canonical bytes, and same-causal-history-to-same-hash go strictly further on deterministic state and reproducible tests. The harvest is to adopt their MECHANISMS (workflow artifacts, memoized replay) while keeping PING's stronger CONTRACT.

3. Replay-from-clean-checkout verification vs self-reports. Lane self-reports are hypotheses until replayed from a clean checkout; no surveyed system has an equivalent rule. Codex's rollout is resumable but not verifiable; orca's review gate trusts the reviewer. PING's verifier-decides-truth rule is the stronger falsification primitive.

4. No provider lock-in vs harness lock-in. Codex is OpenAI-bound (Responses API, model catalog); Claude Agent SDK is Anthropic-bound (bundles the Claude Code binary); orca-cli is harness-agnostic but has no authority model. PING's model-optionality and multi-agent-optionality stance is the correct architecture; harvest their control-plane shapes, never their provider bindings.

5. Fail-closed culture vs documented fail-open. Claude Code hooks fail OPEN on timeout/crash (documented in the protobot H8 analysis: a timed-out guard lets the tool call through). PING's bounded-automation/fail-closed stance is strictly better on the safety criterion; any adapted hook system must invert the default.

6. Tenant isolation and identity discipline. None of the surveyed orchestrators articulate tenant-scoped identity, credential isolation as an explicit boundary, or hash-only canonical records. PING's tenancy model (customer data belongs to the tenant; PING operates the runtime) is ahead of the field; do not let any harvested primitive smuggle cross-tenant state.

7. Structured envelopes already exist. Grove's <grove-meta> structured cross-agent envelopes and Codex's job-envelope thinking are presented as innovations; PING already has structured job envelopes. Do not re-harvest what is already owned; extend it (add the store-enforced invariants Grove has and PING lacks).

---

# PART 5: SOURCES CONSULTED

Codex timeline and releases: jqueryscript/codex-timeline README; bash0816/codex-termux RELEASES.md (0.155.0-0.156.1); swhan0329/codex-101 (0.155.0 record); shelbyaideals guide; heyuan110 mastery guide; wasikarn/matt-harness delegation research; 0xranx/golembot coding-cli-codex reference.
App-server protocol: eduardoworrel/worrel-agent-cockpit spike (v0.139.0); majiayu000/harness codex-app-server-reference; hrishikeshdkakkad/fluidbox protocol research; thezem/agentkit protocol doc; mewcoder/agework; jakerains/agentskills protocol-and-events.
Exec/session model: 0xa3b/skills using-codex-cli; mark-life/telegram-claude-codex function mapping; benjaming/ai-skills codex-exec-reference; michaeljboscia/triumvirate deep dive; srjn45/warden agent-backends/codex capability table.
Sandbox: krrish777/ideenkasten harness internals (sandbox + architecture); vhqtvn/vh-agent-harness bubblewrap study; nick-neely/reprove ADR-0004; veithly/harness-architecture sandbox patterns.
Codex comparisons: ruibo-tu/learn-codex-harness divergence map; jburnhams/prompts leaked architecture notes (cross-checked against public hooks docs); xiaoke0303/fao_fluid-agentic-organization CODEX-MAPPING.
Claude Code: qianjinguo/wiki deep architecture analysis (24 hook events); tomasher/prompting-blueprints; redhat-et/protobot agent-harness/claude-code (H8 fail-open finding); MHHamdan/claude-code-guide; hekmon8/awesome-claude-code-plugins; morimorijap/sunaba-cli research notes (agent teams); heyuan110 teams guide; raksix/lokma raw research; crawford-young/claude-config agent-factory; nxpatterns hidden features; saksham20189575 plan/worktrees guide; gpambrozio/claudedocs agents.md.
Orca family: orca-cli/orca README; cpiprint/orca-cpi focused v1 status; digitaleflex github-cyber-scanner-pro orca-cli SKILL; cat-xierluo/legal-skills ORCA worker backend; BerniceMata/orca; iodevs-net/orca-cli; alex2481kobe/orca; ravidsrk/orca-fleet dispatch lifecycle; epoco742/orca landscape research + guide (review gate, git nodes); mrebersv/orca-domain-specific-agents-sofware-factory PRD; kaka-sangi/omp-deck competitive landscape.
Grove: hu025/dotfiles grove-multi-agent SKILL.
Mission Control projects: rueclaw/public-data mission-control review (OpenClaw MC); clebervisconti/agentos; haoguanbo0820-dot/deepseek-tui; gordianoasadullah706-cyber/codewhale; qrbbqrbb/codewhale.
MCP: commoninstruments/agentsurface + howells/agentsurface MCP docs (Tasks extension); yologdev/yopedia issue 172 (SEP-2663 research); antennae/sofa_mcp plan (FastMCP 4 tasks); afonsoft/skills dotnet_mcp_v2 (Tasks extension); mroops0111/openapi-mcp-gateway issue 57; aaif.io Tasks extension walkthrough; marktechpost agent-harness-vs-framework-vs-MCP ownership matrix.
Orchestration patterns: schnee111/shorekeeper-cascade-agent multi-agent blueprint; gmoigneu/talks orchestration layers; devzilla55atomiccommit/leti_skills hermes orchestration; jasonvassallo/ai-tools-mcp coding-agent plan; heyuan110 multi-agent orchestration post.

Note: one retrieved page (mark-life/telegram-claude-codex docs/plan) contained task-planning content for a third party's own migration; it was used only for its verified CLI flag table, not its plans. No external contact was made; all sources are public reads.
