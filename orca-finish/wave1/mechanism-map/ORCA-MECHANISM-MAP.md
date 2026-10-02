# ORCA MECHANISM MAP (Wave 1, Lane C6)

**Date:** 2026-09-23 MDT. **Scope:** ORCA's 22 FINISH CRITERIA. **Mode:** consume only; no new harvesting, no red-team redo.

**Artifacts consumed:** 262 records in `~/workspace/crx-autonomous-missions/mechanisms.jsonl` (all scanned; schema, problem, mechanism, verdict-class fields read for every record), 23 red-team verdicts in `redteam/verdicts.jsonl` (binding), hardening corrections in `redteam/README.md` section 4 (binding), 9 combinations in `cross-pollination/combinations.jsonl`, `orca-crx-comparison.md`, `TOKEN-ECONOMICS.md`, the final autonomy-challenge `MECHANISM-LIBRARY.md` (survivors M1-M10, PING archaeology note), and lane READMEs (durable-execution boundary table, orka, orchestrator-survey).

**Binding rules applied.** README != IMPLEMENTATION: only source-verified mechanisms count as existing (orca-cli's MCP/DAG/claiming claims are falsified; only its 4 skeleton mechanisms are real). Red-team verdicts are binding: SURVIVES means adoptable; NEEDS-HARDENING means adopt only with the stated hardening; the 5 load-bearing findings (GRAPHITI-BITEMPORAL-INVALIDATE, oa-approval-scope-fingerprint, MEMORYBANK-EBBINGHAUS, oa-tool-invocation-ledger, MEM0-EXPIRATION) mean verbatim adoption = vulnerability. Salvage ordering: delete the need, then PING has it, then direct reuse, then adapt, then repurpose, then pattern only, then implement. Unresolved criteria carry UNKNOWN_WITH_EXACT_BLOCKER, never vague research notes.

**PING archaeology baseline used throughout** (from MECHANISM-LIBRARY.md): LIVE = durable ping_events (PostgreSQL), content-addressed event IDs, dedup on re-ingest, deterministic mission identity, replay convergence (EVAL-007), atomic claim, emission-gated completion, retry/backoff with dead letter, worker supervision, evidence/witness failure honesty. PHANTOM = canonical run identity, attempt identity.

---

## The 22 records

### 1. Durable RUN identity

- **MECHANISM:** Durable run row keyed by UUIDv7: typed status, prompt reference, worktree path, adapter, branch, started/completed timestamps; single writer; status changes only through a transition table; every attempt row carries tenant_id and a lease (holder id, expiry, fencing token); claiming or resuming a running row requires a fencing-token CAS; persisted prompt excludes secret material. Implemented as a run-scoped namespace of the canonical PG event journal, never a second SQLite writer.
- **PROBLEM SOLVED:** Workers lose all in-flight execution state when the session compacts, dies, or is killed; the coordinator tracks attempts conversationally and reconstruction is manual.
- **BEST EXISTING SOURCE:** `O-1` (orca-cli/orca @5beeefc, MIT, source-verified: SQLite store, WAL, single-conn pool, tests). Reinforced by COMBO-DURABLE-RUN (O-1 + RESTATE-INVOCATION-ID + orka-write-once-execution-binding + orka-single-control-authority + HATCHET-IDEMPOTENCY-CLAIM). Red-team: NEEDS-HARDENING (kill-list rank 13).
- **PING ANALOG:** None. Run identity is PHANTOM in PING; CRX audit gap #3 (no durable per-attempt execution identity). Mission identity is LIVE but the unit is the mission, not the attempt.
- **OVERLAP:** Both want a durable identity below the coordinator's conversational state.
- **DIFFERENCE:** O-1's unit is the attempt (one worker, one worktree, one lifecycle); PING's unit is the mission. O-1 rows survive worker death; PING mission state does not.
- **ORCA/PING ADVANTAGE:** Orca's shape for the missing layer; PING's PG journal for the canonical durability. Neither has both.
- **HARVEST CLASS:** ADAPT, strictly with the red-team hardening. Verbatim adoption leaves zombie running rows, permits double execution via unsafe resume, and stores secrets plus multi-tenant state in one file.
- **INTEGRATION COST:** Low: schema plus store methods as a run-scoped namespace of ping_events.
- **SMALLEST PROOF:** O-1's falsification test: kill a worker mid-run; a fresh worker reconstructs run identity, status, and worktree from durable state alone with no coordinator explanation.

### 2. Bounded work packets

- **MECHANISM:** A work packet is a durable desired-state record: stable ID, kind, dependencies, status, REQUIRED acceptance criteria (rejected at parse time without it), tool/capability allowlist, decomposition lineage, pinned base state; plus a runtime-enforced budget envelope (cost limit, request limit, tool-call limit, token limits checked before each model request).
- **PROBLEM SOLVED:** Unbounded agent work burns money, time, and context; decomposition loses the unit of work and its completion criteria.
- **BEST EXISTING SOURCE:** `AIOS-TASK-PACKET-DAG` (AIOS, task = markdown + YAML frontmatter, ValidTaskID, acceptance REQUIRED) + `PAI-01` (google/adk-python, UsageLimits enforced per request) + `SWEA-TYPED-WORK-PACKET` (problem identity from short SHA-256 prefix, base_commit pinning). All ADAPT in the library.
- **PING ANALOG:** Partial. Deterministic mission identity is LIVE (covers the identity slice); the packet envelope (acceptance-required + budget envelope) has no PING analog.
- **OVERLAP:** Mission identity and packet identity both name work durably.
- **DIFFERENCE:** A packet is a mission fragment with its own acceptance criteria and budget; a PING mission is coordinator-level with no bounded envelope.
- **ORCA/PING ADVANTAGE:** AIOS/SWEA shape for the envelope; PING's deterministic identity for the ID half.
- **HARVEST CLASS:** ADAPT.
- **INTEGRATION COST:** Medium: packet schema plus budget checks on the attempt execution path.
- **SMALLEST PROOF:** A packet without acceptance criteria is rejected at parse time; a run exceeding its request limit halts with the limit event recorded, not with a model judgment.

### 3. Dependency-determined ready work

- **MECHANISM:** Dependency edges as data: (run_id, dep_id) edges with a composite PK; a pure ready-set query (a run is ready when all deps are in terminal-success states). No scheduler import; the query is the mechanism. README != IMPLEMENTATION honesty: orca-cli modeled the edges but never built the scheduler, so the harvest is the representation plus the query.
- **PROBLEM SOLVED:** Multi-step agent work has implicit ordering in coordinator prompts; nothing represents "B is blocked on A" as queryable data.
- **BEST EXISTING SOURCE:** `O-4` (orca-cli/orca, source-verified table; ADAPT). Secondary: `CREW-01` (crewAI, sequential tasks need earlier outputs as input).
- **PING ANALOG:** Causation/correlation lineage on events is LIVE, but mission lifecycle events carry no causation_id (CRX audit gap #6); no task DAG and no dependency gating.
- **OVERLAP:** Both want ordering to be data, not prose.
- **DIFFERENCE:** Orca models task-blocking edges explicitly; PING has event lineage but no first-class "blocked on" representation.
- **ORCA/PING ADVANTAGE:** Orca's representation is the only one; PING has nothing here.
- **HARVEST CLASS:** ADAPT.
- **INTEGRATION COST:** Low: edges table plus a pure ready-set query.
- **SMALLEST PROOF:** Runs A->B->C with B not claimable until A is terminal-success; the query, not the coordinator's prose, decides readiness.

### 4. Fan-out

- **MECHANISM:** Delegation guardrails enforced by the controller, not the parent: an allowed-agents list, a maximum delegation depth, and a maximum number of concurrent children. Hitting the concurrency cap requeues the delegation instead of failing it; the parent status lists its child tasks.
- **PROBLEM SOLVED:** Parent agents that delegate to child agents can fan out without bound: runaway recursion, sibling storms, delegation outside the allowed set, with the parent record showing none of it.
- **BEST EXISTING SOURCE:** `orka-delegation-guardrails` (orka-agents/orka, source-verified; ADAPT). Secondary: `LG-04` (static graph edges cannot express dynamic fan-out; PATTERN).
- **PING ANALOG:** Worker supervision is LIVE; no delegation-bounds record exists in PING.
- **OVERLAP:** Both supervise workers; neither bounds fan-out today.
- **DIFFERENCE:** Orka's guardrails are enforced at the controller layer; PING supervision is observational.
- **ORCA/PING ADVANTAGE:** Orka's enforcement shape; nothing in PING to beat.
- **HARVEST CLASS:** ADAPT.
- **INTEGRATION COST:** Low-medium: delegation fields on the spawn request plus controller-side enforcement.
- **SMALLEST PROOF:** A parent spawning more than the cap sees the excess requeued (not failed, not spawned); the parent record names every child.

### 5. One-writer

- **MECHANISM:** Exactly one control authority. Outbox and payload stores are explicitly committed behind the primary control fences; no auxiliary store is a second control authority. Every auxiliary write carries the epoch/session fence of the primary.
- **PROBLEM SOLVED:** A second store for control-adjacent data (outbox tables, session databases, payload stores) silently becomes a second control authority; the two stores disagree after partial failure and recovery cannot reconcile them.
- **BEST EXISTING SOURCE:** `orka-single-control-authority` (orka-agents/orka, source-verified) — the only SURVIVES verdict in the red-team pass.
- **PING ANALOG:** Durable ping_events (PostgreSQL) is LIVE and is already the single writer. This criterion is satisfied in PING's architecture.
- **OVERLAP:** Complete on the principle; PING already implements it.
- **DIFFERENCE:** The harvestable part is the guardrail discipline (auxiliary stores commit behind journal fences), not a new mechanism.
- **ORCA/PING ADVANTAGE:** PING. No adoption needed; the rule constrains how the other 21 records integrate.
- **HARVEST CLASS:** ALREADY_IN_PING.
- **INTEGRATION COST:** None as a guardrail.
- **SMALLEST PROOF:** An auxiliary store attempting an independent control commit is refused (or the architecture review shows every run/attempt write routes through the journal's single writer).

### 6. Attempt identity

- **MECHANISM:** Every attempt carries a globally unique, routable, stable identity: (mission_id, attempt sequence, UUIDv7). Singularity is enforced by a journal unique constraint on the attempt key; the ID names exactly one logical execution and never carries bearer authority; tenant is embedded in the routing key. Per-attempt outcome (PromptAttempt/TaskStatus) is recorded against this identity.
- **PROBLEM SOLVED:** Retried or duplicated starts create duplicate executions; recovery cannot tell whether two records name the same attempt or two attempts.
- **BEST EXISTING SOURCE:** `RESTATE-INVOCATION-ID` (restatedev/restate, source-verified; PATTERN) with red-team hardening rank 15 (IDs never Bearer <redacted>; tenant in routing key; journal unique constraint enforces singularity) + `orka-durable-task-record` (per-attempt identity and outcome in TaskStatus). COMBO-DURABLE-RUN absorbs the same shape: one invocation ID = mission ID + attempt sequence + UUIDv7.
- **PING ANALOG:** PHANTOM. Attempt identity is explicitly phantom per the PING archaeology note; replays anchor to mission_id.
- **OVERLAP:** Both need crash-proof naming of work.
- **DIFFERENCE:** Restate's ID is routable across partitions; ORCA's needs mission-scoped attempts with a journal-enforced uniqueness constraint, not a partition key.
- **ORCA/PING ADVANTAGE:** Restate/Orka shape for the missing layer; PING has nothing here.
- **HARVEST CLASS:** ADAPT with the stated hardening.
- **INTEGRATION COST:** Low: attempt-ID format definition plus a unique constraint on the attempt record.
- **SMALLEST PROOF:** Two attempts of one mission carry distinct IDs; a duplicate claim of the same attempt ID is rejected by the journal unique constraint.

### 7. Checkpoint/resume

- **MECHANISM:** Checkpoint as a versioned, monotonic record: format version, unique and monotonically increasing checkpoint id, timestamp, per-channel state snapshot, per-channel versions, versions-seen. A durable run snapshot serializes input, generated items, model responses, turn counters, usage, approvals (approved/rejected, sticky scope), the tool invocation ledger, and trace continuity. Resume is agent-driven rehydration: a new worker queries durable run state (its run row, open tasks, last checkpoint) through a bounded read-only interface before acting, and is never granted write authority beyond its run.
- **PROBLEM SOLVED:** Agent context compacts or the session dies; the replacement agent cannot re-establish in-flight work without the human re-explaining, and approvals/ledger/usage are lost.
- **BEST EXISTING SOURCE:** `LANGGRAPH-CHECKPOINT` (langchain-ai/langgraph, source-verified checkpoint TypedDict; ADAPT) + `oa-runstate-durable-snapshot` (openai-agents-python, RunState.to_json field list; ADAPT) + `CLAUDE-SQUAD-INSTANCE-RESUME-PACKET` (persisted-field template; PATTERN). Note `O-6` (agent-driven rehydration) is design-only at orca-cli HEAD: take the pattern, not an implementation.
- **PING ANALOG:** Partial. Replay convergence (EVAL-007) is LIVE, but replays anchor to mission_id because attempt identity is PHANTOM; there is no attempt-scoped checkpoint record.
- **OVERLAP:** Both reconstruct state from durable records rather than conversation.
- **DIFFERENCE:** PING replay is mission-anchored and backward-looking (verification); the checkpoint is attempt-anchored and forward-looking (resume with approvals and ledger intact).
- **ORCA/PING ADVANTAGE:** LangGraph/OpenAI-SDK shape for the checkpoint; PING's replay discipline for the verification half.
- **HARVEST CLASS:** ADAPT.
- **INTEGRATION COST:** Medium: checkpoint schema on the attempt record plus the bounded rehydration query surface.
- **SMALLEST PROOF:** Kill a worker mid-run; a new worker loads the checkpoint, re-establishes open tasks, approvals, and ledger state, and continues without re-asking the coordinator.

### 8. UNKNOWN outcomes

- **MECHANISM:** The execution state machine distinguishes pre-submission failures (safe to requeue) from post-side-effect-boundary failures, which settle to a terminal OutcomeUnknown that must never be treated as generic retryable failure and must be a unique durable value, never empty or omitted. The side-effect boundary is an externally observable ack, never a local state-machine position; the OutcomeUnknown record cites last-observed evidence. Steps carry effect-class labels (transactional vs external), idempotency keys, and writer identity; external effects are claims labeled by effect class, and completions are graded verified-vs-claimed.
- **PROBLEM SOLVED:** A worker fails at or after a side-effect boundary (a prompt was possibly accepted); retrying risks double execution, declaring failure risks hiding real work, and "recorded = done" overclaims for external effects.
- **BEST EXISTING SOURCE:** `orka-outcome-unknown-fail-closed` (orka-agents/orka, source-verified: acp_recovery.go "makes all potentially accepted prompts terminally OutcomeUnknown without allocating a replacement attempt"; NEEDS-HARDENING: boundary = externally observable ack) + `DBOS-STEP-RECORDING` (dbos, NEEDS-HARDENING rank 10: effect-class labels, idempotency keys, writer identity, receipt grading).
- **PING ANALOG:** Typed failure semantics are LIVE doctrine (SOUL.md 11); the durable-execution lane rules UNKNOWN_OUTCOME classification as CRX-constitutional ("CRX OWNS"). PING owns the meaning; the journal mechanics are the harvested part.
- **OVERLAP:** Both refuse to convert ambiguity into success.
- **DIFFERENCE:** PING's rule is doctrine; Orka/DBOS supply the state machine and the recovery classification procedure (recoverStaleAttempts resumes only states that provably crossed no prompt request-write boundary).
- **ORCA/PING ADVANTAGE:** PING's constitutional classification; Orka's recovery procedure. Split adoption per the durable-execution boundary table.
- **HARVEST CLASS:** ADAPT with the stated hardening. Never label a step done on a worker's word alone.
- **INTEGRATION COST:** Low-medium: terminal state in the attempt outcome enum plus the classification procedure on the recovery path.
- **SMALLEST PROOF:** Kill a worker after it submits a side effect but before it reports; recovery classifies the attempt OutcomeUnknown (not failed, not retried), cites last-observed evidence, and any replacement attempt requires an explicit decision or idempotent-keyed reconcile.

### 9. Effect reconciliation

- **MECHANISM:** The tool invocation ledger splits planned vs dispatched (dispatched requires the provider ack); completions are write-once and graded verified-vs-claimed, never trusted from the worker. Execution and delivery are separate state machines; delivery effects get independent verification of the remote/world state with typed delivery outcomes. An independent evaluator (not the author) executes tests and writes the evaluation receipt; evaluation failure is logged as failure, never converted into success.
- **PROBLEM SOLVED:** Workers report their own success and coordinators trust it: a task that claims it published results may have pushed nothing, pushed to the wrong ref, or been silently overwritten. Token-economics finding #7: RECEIPT vs EFFECT VERIFICATION staying separate is an ecosystem-wide gap.
- **BEST EXISTING SOURCE:** `oa-tool-invocation-ledger` (openai-agents-python; NEEDS-HARDENING, load-bearing rank 4: planned/dispatched split, provider ack, write-once completions, verified-vs-claimed grading) + `orka-cas-verified-publication` (PATTERN: independent verification of remote state, typed delivery outcomes) + `SWEA-INDEPENDENT-EVALUATOR-RECEIPT` (SWE-agent; ADAPT: independent evaluator writes results.json).
- **PING ANALOG:** Evidence/witness failure honesty and emission-gated completion are LIVE, but no general effect-reconciliation loop exists for arbitrary tool effects.
- **OVERLAP:** Both distrust self-reported success.
- **DIFFERENCE:** PING's honesty is about evidence records; the harvested mechanisms add the verification procedure (re-read the world, grade the claim).
- **ORCA/PING ADVANTAGE:** Harvested verification loop; PING's evidence discipline underneath.
- **HARVEST CLASS:** ADAPT, strictly with the rank-4 hardening. Verbatim adoption of the ledger permanently vouches for worker-fabricated completions.
- **INTEGRATION COST:** Medium: ledger lifecycle on tool-attempt events plus an independent-verification step for delivery effects.
- **SMALLEST PROOF:** A tool call reports success while independent verification finds no effect; the completion is recorded as claimed-not-verified and the run does not proceed on the worker's word.

### 10. Capability gates

- **MECHANISM:** Tool leases: SHA-256-hashed Bearer <redacted> scoped to (project, session, lane) with a role (orchestrator/executor/auditor) and an explicit allowed-tools subset; every call validates hash, revocation, expiry, role match, tool grant, and scope match. Per-tool authorization is enforced at both discovery (unauthorized tools filtered from listings, without leaking their existence) and execution (re-resolved and re-checked immediately before execution, default deny). Grants are epoch/lease-bound with re-verification for long handlers; auth context is authenticator-minted and session-bound; no local-process exemption.
- **PROBLEM SOLVED:** Agents calling tools need bounded, revokable authority scoped to role and work unit; a stolen or stale credential must fail closed without manual revocation; discovery must not leak forbidden tools.
- **BEST EXISTING SOURCE:** `ORCA-01` (alex2481kobe/orca lane, source-verified tool leases; ADAPT; integration note: the lease issuer must be a canonical authority and leases live in PG, not a second store) + `MCP-M26` (PrefectHQ/fastmcp; NEEDS-HARDENING rank 8: lease-bound grants, authenticator-minted session-bound context, no local exemption) + `ORCA-13` (filesystem fence: exact root list, no silent defaults; PATTERN).
- **PING ANALOG:** Verdict-authority admission checks are LIVE, but they are admission-time gates; per-attempt, per-call tool leases with roles do not exist in PING.
- **OVERLAP:** Both gate what an agent may do.
- **DIFFERENCE:** PING gates are code evaluated at admission; leases are per-call enforcement with revocation and expiry.
- **ORCA/PING ADVANTAGE:** Harvested lease shape; PING's authority model must mint the leases (constitutional dependency).
- **HARVEST CLASS:** ADAPT with the rank-8 hardening.
- **INTEGRATION COST:** Medium: lease issuance/validation on the tool execution path.
- **SMALLEST PROOF:** A worker with a lane-scoped lease calling a tool outside its allowed-tools set is denied and the denial is recorded; an expired or revoked lease fails closed.

### 11. Approval binding

- **MECHANISM:** Approvals bind to an authorization-scope fingerprint (invocation type plus the resolved tool/target key), not to the call ID, so argument changes or target changes invalidate the grant. Grants are tiered and argument-bound, policy-version-bound, and revocable; same scope fingerprint implies same tool target, never the same authorization target. Interrupts bind responder identity, the shown payload, and the approved semantic fingerprint; resume is single-writer CAS with responder provenance; answers are evidence events, not trusted data. Self-approval is structurally refused: an audit gate rejects acceptance without recorded findings or reviewed files.
- **PROBLEM SOLVED:** An approval granted for one tool call silently authorizes a different call (argument smuggling); stale grants survive revocation and policy changes; an agent approves its own work; checkpoint forks double-execute after approval.
- **BEST EXISTING SOURCE:** `oa-approval-scope-fingerprint` (openai-agents-python; NEEDS-HARDENING, load-bearing rank 2) + `LANGGRAPH-INTERRUPT` (langchain-ai/langgraph; NEEDS-HARDENING rank 7) + `ORCA-07` (audit gate refusing self-approval; ADAPT).
- **PING ANALOG:** None built. The durable-execution lane rules the approval record (who, what was shown, decision, rationale, evidence linkage) as CRX-constitutional, but no PING implementation is named in the archaeology.
- **OVERLAP:** None; this is a gap in PING.
- **DIFFERENCE:** The harvested mechanisms supply both the binding shape and the interrupt/resume procedure.
- **ORCA/PING ADVANTAGE:** Harvested, but this is the sharpest edge in the map: verbatim adoption of the scope fingerprint is a direct privilege-escalation path (rank 2) and verbatim LANGGRAPH-INTERRUPT permits self-approval and double execution (rank 7). Adopt only with the full stated hardening.
- **HARVEST CLASS:** ADAPT, strictly with the load-bearing hardening.
- **INTEGRATION COST:** Moderate: authorization-scope key on tool calls plus interrupt-as-journal-entry with single-writer resume CAS.
- **SMALLEST PROOF:** An approval granted for tool call X with args A does not authorize X with args B; a grant issued under policy v3 is invalid after the v4 bump; resume-after-approval through a second writer is rejected by CAS.

### 12. MCP adapters

- **MECHANISM:** The MCP execution layer: catalog freshness via server list-changed notifications with idempotent re-absorption; tool namespacing (server prefix + tool name) so merges never collide; unique (name, version) registration rejecting rug-pull republishes; version-spec deterministic resolution; bearer validation with expiry, audience binding, and log redaction; middleware chain for telemetry/secret-blocking/policy; cancellation signaling (best-effort; unconfirmed abandonment settles to OutcomeUnknown) with idempotency keys on side-effecting calls; explicit layered timeouts plus a host-enforced execution budget with kill; structured diagnostics; response-size, SSRF, and rate-limit guards.
- **PROBLEM SOLVED:** ORCA needs to call external tools through MCP, but has no adapter layer: no catalog, no auth, no cancellation, no bounds, no versioning.
- **BEST EXISTING SOURCE:** The MCP lane family, all source-verified: `MCP-M09`, `MCP-M16` (REUSE), `MCP-M11` (REUSE), `MCP-M27`, `MCP-M03`, `MCP-M17`, `MCP-M04` (NEEDS-HARDENING), `MCP-M06` (NEEDS-HARDENING), `MCP-M07`, `MCP-M26` (NEEDS-HARDENING rank 8), `MCP-M28/M29/M30` (REUSE). Explicit non-source: orca-cli's own MCP surface is a falsified README claim (`internal/mcp/doc.go` is a 4-line stub; zero MCP code), so ORCA contributes nothing here.
- **PING ANALOG:** None; PING tools are not MCP. (The wave-1 authority-mcp lane is the intended home.)
- **OVERLAP:** None.
- **DIFFERENCE:** Do not adopt orca-cli's adapter port (`O-5` is PATTERN-only for the Decision vocabulary: merge/abandon/needs_review); CRX workers are sovereign, not pluggable CLIs. Adopt the execution-layer mechanisms, not the port.
- **ORCA/PING ADVANTAGE:** Harvested execution layer; the Decision enum vocabulary is the only take from orca-cli itself.
- **HARVEST CLASS:** ADAPT (genuinely new code; no PING substrate to reuse).
- **INTEGRATION COST:** Medium-high: the full execution layer, built once, behind the capability gates of record 10.
- **SMALLEST PROOF:** A tool catalog merge across N servers with zero name collisions; a republished (name, version) with changed behavior rejected; a hung tool call killed by the execution budget; an abandoned call classified OutcomeUnknown rather than silently dropped.

### 13. Browser death recovery

- **MECHANISM:** UNKNOWN_WITH_EXACT_BLOCKER. No harvested mechanism and no PING mechanism names the agent browser session as a durable, claimable resource.
- **PROBLEM SOLVED:** The agent's browser session (CDP target, tabs, page state, cookies/profile) dies mid-mission; recovery must reattach or rebuild without losing mission progress or duplicating side effects.
- **BEST EXISTING SOURCE:** UNKNOWN. Library grep for browser-session lifecycle finds zero records (only `MCP-M25` OAuth browser flows and `ORCA-07`'s mention of visual sign-off). Partial salvage only: PING worker supervision is LIVE (covers the worker process, not the browser); `TRIGGER-HEARTBEAT` (PATTERN) covers liveness detection; `MCP-M05` (ADAPT) covers stream reconnect. None defines browser session semantics.
- **PING ANALOG:** Worker supervision (LIVE) is the process-level analog; the browser-session layer is absent.
- **OVERLAP:** Death detection and supervision overlap at the process level.
- **DIFFERENCE:** A browser session has state no process supervisor understands: profile/cookie durability, CDP target identity, in-flight navigation vs committed navigation.
- **ORCA/PING ADVANTAGE:** Neither; this is a genuine gap.
- **HARVEST CLASS:** UNKNOWN.
- **INTEGRATION COST:** Unestimable until the blocker is resolved.
- **SMALLEST PROOF:** Blocked. The acceptance would be: kill the browser process mid-mission; a fresh browser reattaches to the durable profile, the run row classifies in-flight navigations against the side-effect boundary (record 8), and the mission resumes with no duplicated side effects.
- **EXACT BLOCKER:** No harvested or PING mechanism specifies: (a) the browser session identity format, (b) the profile/cookie durability contract, (c) the CDP reattach protocol, (d) classification of in-flight navigations as pre/post side-effect boundary. Until these four are specified, recovery is ad hoc.

### 14. Coordinator death recovery

- **MECHANISM:** The controller keeps no durable private state; recovery is a classification problem over records. A monotonic leadership epoch is acquired via CAS on a lease; every authoritative control mutation carries the epoch fence, and a deposed coordinator's late writes are rejected. Instance lock records pid plus the pid's kernel start time plus a stable machine identity (never hostname). After a crash, pending work is recovered exactly once: recovery re-enqueues through an atomic ENQUEUED-to-PENDING dequeue that admits exactly one runner, even with multiple concurrent recoverers.
- **PROBLEM SOLVED:** The coordinator dies mid-run; a replacement must take over without double dispatch, double settlement, conflicting terminal states, or inheriting the dead coordinator's private memory.
- **BEST EXISTING SOURCE:** `orka-controller-epoch-fencing` (orka-agents/orka; PATTERN) + `ORCA-12` (instance lock with machine identity; PATTERN) + `DBOS-ATOMIC-RECOVERY` (dbos-inc; ADAPT: recovery re-enqueues rather than executing directly) + the orka lane's recovery discipline (acp_recovery.go:101: recovery classifies records by where they sat relative to the request-write boundary).
- **PING ANALOG:** Worker supervision is LIVE; the PG journal is the recovery substrate (LIVE). The single-writer journal means a new coordinator re-folds from events.
- **OVERLAP:** Both re-derive from durable records.
- **DIFFERENCE:** PING's supervision watches workers; the harvested mechanisms fence coordinators (epoch) and serialize recovery (atomic claim).
- **ORCA/PING ADVANTAGE:** Harvested fencing plus PING's journal as the re-fold substrate.
- **HARVEST CLASS:** ADAPT.
- **INTEGRATION COST:** Medium: epoch lease plus atomic-claim recovery queue; the controller holds no private durable state.
- **SMALLEST PROOF:** Kill the coordinator mid-run; a new instance acquires the epoch lease, classifies every in-flight attempt from the journal alone, and the zombie coordinator's late writes are rejected by the epoch fence.

### 15. Host restart recovery

- **MECHANISM:** Boot-time recovery routine: on start, scan every lane/attempt in a state that can hide a live child (not just running; also ready_for_audit, blocked, and similar post-submit states), verify process liveness, and reap orphans. Overdue suspend/lease/gate records are detected by an Overdue predicate and lazily re-driven with rate limiting. Stale workers that never deregistered are swept.
- **PROBLEM SOLVED:** After a hard daemon/host restart, detached child process groups survive with no supervisor (running, burning tokens, holding worktrees) while persisted state says "running"; timers and scheduled starts are lost.
- **BEST EXISTING SOURCE:** `ORCA-05` (alex2481kobe/orca lane, source-verified recoverInterruptedLanes; ADAPT) + `DAPR-PENDINGSTART-REDRIVE` (Overdue predicate + re-drive; PATTERN) + `HATCHET-STALE-WORKER-CLEANUP` (PATTERN).
- **PING ANALOG:** Worker supervision and retry/backoff with dead letter are LIVE; the boot-time scan routine is not named in PING.
- **OVERLAP:** Dead-letter and supervision cover the policy half.
- **DIFFERENCE:** ORCA-05 supplies the boot procedure: which states to scan, liveness verification, orphan reaping.
- **ORCA/PING ADVANTAGE:** Harvested boot routine on PING's supervision substrate.
- **HARVEST CLASS:** ADAPT.
- **INTEGRATION COST:** Low: a boot-time recovery routine plus an overdue predicate per suspend/lease record.
- **SMALLEST PROOF:** SIGKILL the daemon/host mid-run; on boot the routine reaps or resumes every orphaned lane, no token-burning zombie survives, and each lane is resumed, re-driven, or honestly classified.

### 16. Worktree isolation

- **MECHANISM:** Per-run git worktree create/archive: create a worktree on a per-run branch off the base (empty-base guard, symlink-resolved repo root); on ship/kill, move the tree to an archive location (data preserved before unregister), then prune the git registry. Conditional policy: read-only and sole-writer lanes run directly in the checkout; a dedicated worktree is created only when writers would collide.
- **PROBLEM SOLVED:** Parallel agents editing the same checkout collide; ad-hoc worktree management leaves orphaned worktrees and stale git registry entries; per-task worktrees for read-only work are wasteful.
- **BEST EXISTING SOURCE:** `O-3` (orca-cli/orca, ~120 lines, tested, MIT; REUSE) + `ORCA-09` (worktree-on-collision policy; ADAPT) + `AIOS-WORKTREE-MANAGER` (lifecycle-managed checkouts with stale reclamation; ADAPT).
- **PING ANALOG:** Ad-hoc worktrees (jev-surgical practice); no create/archive discipline.
- **OVERLAP:** Both isolate parallel writers.
- **DIFFERENCE:** O-3 is the boring, correct, tested version with archival; PING's is manual.
- **ORCA/PING ADVANTAGE:** Orca, outright. Highest-confidence reuse in the map.
- **HARVEST CLASS:** DIRECT_REUSE (O-3) with the ORCA-09 conditional policy adapted on top.
- **INTEGRATION COST:** Very low.
- **SMALLEST PROOF:** Two runs on the same repo get isolated trees (or one direct checkout when no collision is possible); killing a run archives its tree with data preserved and prunes the git registry entry.

### 17. Artifact lineage

- **MECHANISM:** Content-addressed durable references for every artifact (digest embedded in the reference; renames and moves still resolve); a provenance ledger recording which document/chunk/pipeline-run produced each fact; a complete typed trajectory receipt at run end, including abnormal ends. Lifecycle events carry causation_id (closing CRX audit gap #6). Audit events are immutable and append-only (the ORCA-11 anti-pattern: audit events embedded in mutable live objects mutated under observation).
- **PROBLEM SOLVED:** Given an artifact, nothing can answer which run, which attempt, and which inputs produced it; evidence mutates under observation; renamed artifacts lose their references.
- **BEST EXISTING SOURCE:** `OBS-WEAVE-DURABLE-REFS` (wandb/weave, content-addressed refs; ADAPT) + `COGNEE-PROVENANCE-LEDGER` (which run produced this fact; ADAPT) + `MINISWE-TRAJECTORY-RECEIPT` (typed end-of-run receipt; PATTERN) + `ORCA-11` (immutable-audit-events fix; ADAPT).
- **PING ANALOG:** Content-addressed event IDs with dedup are LIVE; causation/correlation lineage on events is LIVE; but mission lifecycle events carry no causation_id (audit gap #6). Lineage/canonicalization authority belongs to the 24-hour constitutional convergence sprint (constitutional dependency, not built here).
- **OVERLAP:** Content addressing and event lineage overlap fully.
- **DIFFERENCE:** The harvested part is artifact-level: durable refs that survive renames, per-fact production provenance, and the causation_id backfill.
- **ORCA/PING ADVANTAGE:** PING's event substrate is stronger; the artifact-ref and provenance-ledger shapes are harvested.
- **HARVEST CLASS:** ADAPT, conditional on the convergence sprint's lineage/canonicalization authority.
- **INTEGRATION COST:** Medium: ref format, digest computation, resolution path, causation_id backfill.
- **SMALLEST PROOF:** Given an artifact, resolve its full lineage (run, attempt, inputs) from durable refs alone after a rename; an audit event written mid-run is byte-identical when read after the run.

### 18. Real FYD mission

- **MECHANISM:** UNKNOWN_WITH_EXACT_BLOCKER. The enabling stack is harvested (records 1, 2, 6, 7, 8, 11, 22), and the Mission Library's M2 (independent empirical verification: nothing about the generator's self-description is trusted; measure the output) gives the shape: a real mission is the independent oracle for the whole mechanism stack. But no mechanism IS the mission, and no artifact defines its acceptance.
- **PROBLEM SOLVED:** Prove the mechanism stack does real work on a real business artifact, not on fixtures.
- **BEST EXISTING SOURCE:** UNKNOWN as a criterion. Enabling mechanisms: `SWEA-TYPED-WORK-PACKET`, `SWEA-DURABLE-PATCH-ARTIFACT`, and PING M2.
- **PING ANALOG:** None as a mission runner; M2's independent-oracle discipline is the analog for how it should be graded.
- **OVERLAP:** None.
- **DIFFERENCE:** A real mission is a demonstration, not a mechanism; it cannot be harvested, only run.
- **ORCA/PING ADVANTAGE:** Neither until the blocker is resolved.
- **HARVEST CLASS:** UNKNOWN.
- **INTEGRATION COST:** Unestimable until the blocker is resolved.
- **SMALLEST PROOF:** Blocked. The proof would be: ORCA executes a full FYD mission (acquire, compose, verify, publish-gate) on a real business, graded by an independent evaluator, with the Mission Control projection showing real state throughout.
- **EXACT BLOCKER:** No harvested or PING artifact defines the acceptance contract: production vs fixture business data, whether owner sign-off is required, which publish gate must pass, which Mission Control projection state counts as done, and who signs the verdict (human or independent evaluator). Without this, any demo can be graded against a moving target.

### 19. Real coding mission

- **MECHANISM:** UNKNOWN_WITH_EXACT_BLOCKER. The enabling stack is the richest in the map (the full software-factory lane): stable problem identity plus pinned base commit, durable patch artifacts, an independent evaluator receipt, and a serial merge queue with land-time SHA re-verification. But the acceptance contract is undefined.
- **PROBLEM SOLVED:** Prove the stack can do real coding work end to end: change code, verify independently, land safely.
- **BEST EXISTING SOURCE:** UNKNOWN as a criterion. Enabling mechanisms: `SWEA-TYPED-WORK-PACKET` (ADAPT) + `SWEA-DURABLE-PATCH-ARTIFACT` (ADAPT) + `SWEA-INDEPENDENT-EVALUATOR-RECEIPT` (ADAPT) + `AIOS-SERIAL-MERGE-QUEUE-CAS` (ADAPT) + `BORS-PREFLIGHT-MERGE-GATE` / `BORS-HEAD-RACE-DETECTION` (NEEDS-HARDENING ranks 11-12: land-time SHA re-verification CAS, single-writer queue lease, queue as sole write path).
- **PING ANALOG:** None as a coding-mission runner.
- **OVERLAP:** None.
- **DIFFERENCE:** Same as record 18: the criterion is a demonstration over harvested mechanisms.
- **ORCA/PING ADVANTAGE:** Neither until the blocker is resolved.
- **HARVEST CLASS:** UNKNOWN.
- **INTEGRATION COST:** Unestimable until the blocker is resolved.
- **SMALLEST PROOF:** Blocked. The proof would be: ORCA takes a real issue on a real repo, produces a durable patch, passes an independent evaluator, and lands through the merge queue with land-time re-verification.
- **EXACT BLOCKER:** No artifact defines the acceptance contract: which repo and which issue class counts as "real", whether the change must land to main, who reviews (independent evaluator receipt vs human), and what test bar constitutes pass. Same moving-target problem as record 18.

### 20. Both survive interruption

- **MECHANISM:** The interruption drill composes harvested mechanisms: durable run identity (1) plus attempt identity (6) let a fresh worker name the work; checkpoint/resume (7) restores progress and approvals; UNKNOWN outcomes (8) classify anything that crossed a side-effect boundary; agent-driven rehydration (O-6 pattern) is the resume procedure. The drill is: kill the worker mid-run (SIGKILL), start a fresh worker with no coordinator explanation, and verify it reconstructs identity, status, worktree, checkpoint, and open tasks from durable state alone.
- **PROBLEM SOLVED:** Prove that an interrupted FYD mission and an interrupted coding mission both resume correctly rather than restarting, duplicating, or silently dropping work.
- **BEST EXISTING SOURCE:** Composite of `O-1` (falsification test), `LANGGRAPH-CHECKPOINT`, `oa-runstate-durable-snapshot`, `orka-outcome-unknown-fail-closed`, `RESTATE-INVOCATION-ID`.
- **PING ANALOG:** Replay convergence (EVAL-007, LIVE) proves backward determinism; worker supervision (LIVE) proves restart; the forward-resume composition is not in PING.
- **OVERLAP:** Identity and replay discipline overlap.
- **DIFFERENCE:** PING proves the past replays; the drill proves the future resumes.
- **ORCA/PING ADVANTAGE:** Harvested composition on PING's durable substrate.
- **HARVEST CLASS:** ADAPT (the mechanisms exist; the work is wiring them into the drill).
- **INTEGRATION COST:** Medium: the drill harness plus the resume path through records 1, 6, 7, 8.
- **SMALLEST PROOF:** SIGKILL a worker mid-mission (one FYD, one coding); each fresh worker resumes from durable state with no coordinator explanation, no duplicated side effects, and no lost approvals; any attempt that crossed a side-effect boundary is classified OutcomeUnknown with cited evidence.

### 21. Recovery gauntlet

- **MECHANISM:** PATTERN_ONLY. The gauntlet is a bounded chaos suite, not a harvested mechanism: kill worker, kill coordinator, kill browser, kill host, partition the network, expire a lease mid-run, revoke a capability mid-run; verify each against its classification (records 8, 13, 14, 15). The durable-execution lane's 15-row boundary table (process death, machine death, worker death, UNKNOWN_OUTCOME, reconciliation, timers, leases, signals) is the closest thing to a gauntlet spec in the artifacts, and it is a table, not a harness.
- **PROBLEM SOLVED:** Individual recovery mechanisms are only trustworthy if they are exercised together under adversarial conditions; untested composition is where double-execution and split-brain hide.
- **BEST EXISTING SOURCE:** No single record. Spec-shaped material: the durable-execution lane boundary table; `ORCA-14` incident (durability without a wakeup path is a liveness bug); `DAPR-PENDINGSTART-REDRIVE`.
- **PING ANALOG:** None; PING has no chaos/recovery suite named in the archaeology.
- **OVERLAP:** None.
- **DIFFERENCE:** Every other record is a mechanism; the gauntlet is the adversarial proof that the mechanisms compose.
- **ORCA/PING ADVANTAGE:** Neither; it must be built.
- **HARVEST CLASS:** PATTERN_ONLY (chaos-engineering discipline; the 15-row table is the spec).
- **INTEGRATION COST:** Medium: build the harness; the mechanisms it exercises are records 1, 6, 7, 8, 10, 13, 14, 15.
- **SMALLEST PROOF:** The gauntlet suite runs all rows green against a live ORCA: each fault produces the specified classification and recovery, with no fault converting UNKNOWN into SUCCESS.

### 22. Mission Control projection of real state

- **MECHANISM:** Mission Control is a typed projection over the canonical journal, not a second state store. The projection discipline is PING's M1 (typed projection seam: all values constructed through typed constructors, validated at the sink, refusal by default) over the LIVE ping_events substrate. Liveness comes from the wakeup path: durable agent-event queue with per-consumer ack cursors and dedupe keys (an occurrence after ack is a fresh event), plus a lane-state watcher that prints exactly one line per real state change; durability is not delivery, so the wakeup path needs supervision, a durable cursor, and a latency SLA bound to lease/approval windows. The next-action envelope (loop phase plus next required tool, computed deterministically from state) is what the projection shows per run.
- **PROBLEM SOLVED:** Operators need to see real mission state, but coordinator memory is not durable and a durable queue with no delivery is a liveness bug (the ORCA-14 incident: lane finished, wakeup enqueued, nobody delivered it).
- **BEST EXISTING SOURCE:** PING M1/M2 (projection seam + independent verification) + `ORCA-04` (durable agent-event queue with dedupeKey/ack semantics; ADAPT) + `ORCA-14` (lane-state watcher; NEEDS-HARDENING: durability is not delivery) + `ORCA-03` (next-action envelope; ADAPT).
- **PING ANALOG:** M1 typed projection seam and M2 empirical verification; ping_events is LIVE. PING IS_STRONGER on the projection discipline.
- **OVERLAP:** Complete on projection; the wakeup path is the missing slice.
- **DIFFERENCE:** PING projects business evidence; Mission Control projects execution state. Same seam, different input.
- **ORCA/PING ADVANTAGE:** PING, outright, for the projection. The wakeup/delivery slice is harvested.
- **HARVEST CLASS:** PING_IS_STRONGER (projection discipline already in PING; wakeup path ADAPT with the ORCA-14 hardening).
- **INTEGRATION COST:** Low-medium: the wakeup queue plus watcher; the projection reuses M1.
- **SMALLEST PROOF:** Kill and restart everything; Mission Control shows only state reconstructed from the journal (nothing from coordinator memory), and every real state change produces exactly one wakeup within the latency SLA.

---

## Summary table

| # | Criterion | Class | Best source | One-line evidence |
|---|---|---|---|---|
| 1 | Durable RUN identity | ADAPT | O-1 (NEEDS-HARDENING) | UUIDv7 run row + lease/fencing CAS + tenant_id; PG namespace, never second SQLite writer |
| 2 | Bounded work packets | ADAPT | AIOS-TASK-PACKET-DAG + PAI-01 | Acceptance REQUIRED at parse; budget envelope enforced per request |
| 3 | Dependency-determined ready work | ADAPT | O-4 | Edges as data + pure ready-set query; no scheduler import |
| 4 | Fan-out | ADAPT | orka-delegation-guardrails | Controller-enforced depth/concurrency caps; over-cap requeues |
| 5 | One-writer | ALREADY_IN_PING | orka-single-control-authority (SURVIVES) | PG journal is already the single writer; rule constrains the other records |
| 6 | Attempt identity | ADAPT | RESTATE-INVOCATION-ID (hardened) | (mission_id, attempt seq, UUIDv7) + journal unique constraint |
| 7 | Checkpoint/resume | ADAPT | LANGGRAPH-CHECKPOINT + oa-runstate-durable-snapshot | Versioned checkpoint + durable snapshot; bounded rehydration query surface |
| 8 | UNKNOWN outcomes | ADAPT | orka-outcome-unknown-fail-closed (hardened) | Post-boundary failures terminal OutcomeUnknown; boundary = observable ack |
| 9 | Effect reconciliation | ADAPT | oa-tool-invocation-ledger (rank 4) + orka-cas-verified-publication | Planned/dispatched split; completions graded verified-vs-claimed; independent evaluator receipts |
| 10 | Capability gates | ADAPT | ORCA-01 + MCP-M26 (rank 8) | Per-call tool leases; auth at discovery AND execution, default deny |
| 11 | Approval binding | ADAPT | oa-approval-scope-fingerprint (rank 2) + LANGGRAPH-INTERRUPT (rank 7) | Scope-fingerprint grants, tiered/argument-bound/policy-versioned; single-writer resume CAS; never verbatim |
| 12 | MCP adapters | ADAPT | MCP lane family (M03/M04/M06/M09/M11/M16/M17/M26/M27/M28-30) | Namespaced versioned catalog, auth, cancel, budgets; orca-cli's own MCP was a falsified stub |
| 13 | Browser death recovery | UNKNOWN | none | Zero library records define browser-session lifecycle; exact blocker stated |
| 14 | Coordinator death recovery | ADAPT | orka-controller-epoch-fencing + DBOS-ATOMIC-RECOVERY | Epoch-fenced takeover; controller holds no private durable state; atomic-claim re-enqueue |
| 15 | Host restart recovery | ADAPT | ORCA-05 + DAPR-PENDINGSTART-REDRIVE | Boot-time orphan scan + overdue re-drive |
| 16 | Worktree isolation | DIRECT_REUSE | O-3 (REUSE) + ORCA-09 | Tested ~120-line create/archive; worktree-on-collision policy |
| 17 | Artifact lineage | ADAPT | OBS-WEAVE-DURABLE-REFS + COGNEE-PROVENANCE-LEDGER | Content-addressed refs; causation_id backfill; immutable audit events |
| 18 | Real FYD mission | UNKNOWN | none (M2 is the grading shape) | No acceptance contract defines what counts as "real"; exact blocker stated |
| 19 | Real coding mission | UNKNOWN | none (software-factory stack enables) | No acceptance contract; exact blocker stated |
| 20 | Both survive interruption | ADAPT | Composite of 1+6+7+8 | SIGKILL drill: fresh worker resumes from durable state, no coordinator explanation |
| 21 | Recovery gauntlet | PATTERN_ONLY | Durable-execution 15-row table (spec, not harness) | Chaos suite must be built; exercises records 1,6,7,8,10,13,14,15 |
| 22 | Mission Control projection | PING_IS_STRONGER | PING M1/M2 + ORCA-04 + ORCA-14 (hardened) | Typed projection over the journal; wakeup path with supervision, cursor, SLA |

## Harvest-class counts

- ADAPT: 15 (records 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 14, 15, 17, 20)
- DIRECT_REUSE: 1 (record 16)
- ALREADY_IN_PING: 1 (record 5)
- PING_IS_STRONGER: 1 (record 22)
- PATTERN_ONLY: 1 (record 21)
- UNKNOWN: 3 (records 13, 18, 19)
- REPURPOSE: 0, REJECT: 0, WATCH: 0

Adoptable now (ADAPT/DIRECT_REUSE with stated smallest proof): 16 of 22. Already satisfied by PING: 2 of 22 (records 5, 22). Blocked on exact questions: 3 of 22 (records 13, 18, 19). Harness to build from pattern: 1 of 22 (record 21).

## Prioritized implementation shortlist

Only records with verdict ADAPT or DIRECT_REUSE and a stated smallest proof. Ordered by dependency: identity layer first, then lifecycle, then safety, then integration, then recovery, then adapters, then the composite drills.

**Phase A, identity (nothing else is honest without this):**
1. Record 16, worktree isolation (DIRECT_REUSE, O-3). Cheapest, highest confidence, unblocks parallel runs. Proof: kill a run, tree archives with data preserved, registry pruned.
2. Record 1, durable RUN identity (ADAPT, O-1 + COMBO-DURABLE-RUN hardening). Proof: SIGKILL worker, fresh worker reconstructs from durable state alone.
3. Record 6, attempt identity (ADAPT, RESTATE-INVOCATION-ID hardened). Proof: journal unique constraint rejects duplicate attempt claims.

**Phase B, lifecycle:**
4. Record 3, dependency ready-set query (ADAPT, O-4). Proof: B not claimable until A terminal-success, decided by the query.
5. Record 4, fan-out guardrails (ADAPT, orka-delegation-guardrails). Proof: over-cap spawns requeue, parent record names all children.
6. Record 2, bounded work packets (ADAPT, AIOS-TASK-PACKET-DAG + PAI-01). Proof: missing acceptance rejected at parse; budget halt recorded.
7. Record 7, checkpoint/resume (ADAPT, LANGGRAPH-CHECKPOINT + oa-runstate-durable-snapshot). Proof: killed worker's replacement continues without re-asking.

**Phase C, safety (load-bearing hardening mandatory; verbatim adoption is a vulnerability):**
8. Record 8, UNKNOWN outcomes (ADAPT, orka-outcome-unknown-fail-closed + DBOS-STEP-RECORDING hardened). Proof: post-boundary kill classifies OutcomeUnknown with cited evidence.
9. Record 11, approval binding (ADAPT, oa-approval-scope-fingerprint + LANGGRAPH-INTERRUPT hardened). Proof: argument smuggling refused; stale grants invalid after policy bump; single-writer resume CAS.
10. Record 10, capability gates (ADAPT, ORCA-01 + MCP-M26 hardened). Proof: out-of-scope tool call denied and recorded; expired lease fails closed.

**Phase D, integration:**
11. Record 17, artifact lineage (ADAPT, OBS-WEAVE-DURABLE-REFS + COGNEE-PROVENANCE-LEDGER; conditional on convergence sprint's lineage authority). Proof: artifact resolves to run/attempt/inputs after rename.
12. Record 9, effect reconciliation (ADAPT, oa-tool-invocation-ledger + orka-cas-verified-publication + SWEA-INDEPENDENT-EVALUATOR-RECEIPT). Proof: worker-claimed success without verified effect recorded as claimed-not-verified.

**Phase E, recovery:**
13. Record 14, coordinator death recovery (ADAPT, epoch fencing + DBOS-ATOMIC-RECOVERY). Proof: zombie coordinator's late writes rejected by epoch fence.
14. Record 15, host restart recovery (ADAPT, ORCA-05 + DAPR redrive). Proof: boot scan leaves no token-burning zombie.
15. Record 20, interruption drill (ADAPT composite). Proof: one FYD and one coding mission both resume after SIGKILL with no duplicated side effects.

**Phase F, adapters and gauntlet:**
16. Record 12, MCP adapters (ADAPT, MCP lane family). Proof: namespaced versioned catalog, hung call killed by budget, abandoned call classified OutcomeUnknown.

Record 21 (recovery gauntlet, PATTERN_ONLY) is the harness that re-proves phases A-E under combined faults; build it after Phase E.

## Open questions and blockers

1. **Record 13, browser death recovery:** no mechanism specifies the browser session identity format, the profile/cookie durability contract, the CDP reattach protocol, or classification of in-flight navigations against the side-effect boundary. Partial salvage exists (PING worker supervision, TRIGGER-HEARTBEAT liveness, MCP-M05 reconnect) but the browser-session layer is unbuilt. This is the only pure mechanism gap in the map.
2. **Records 18/19, real FYD / real coding mission:** no acceptance contract exists in any artifact (production vs fixture data, owner sign-off, publish gate, Mission Control done-state, who signs the verdict). The enabling stacks are harvested; the grading target is undefined.
3. **Record 17 constitutional dependency:** lineage/canonicalization authority belongs to the 24-hour constitutional convergence sprint; this record consumes it and must not re-specify it.
4. **Records 10/11 lease issuance:** ORCA-01's integration note requires the lease issuer to be a canonical authority (identity + canonicalization); same dependency as 3.
5. **Record 11 is the sharpest edge:** two load-bearing findings (ranks 2 and 7) sit on the approval path. Any implementation plan must carry the hardening as acceptance criteria, not as follow-up work.
