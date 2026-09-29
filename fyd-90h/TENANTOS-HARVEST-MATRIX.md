# TENANTOS Harvest Matrix — forensic first, code later

Binding order: `~/workspace/fyd-90h/TENANTOS-HARVEST-ORDER.md` (Nolan, 2026-09-29).
Method: searched the canonical PING tree on the Pig (`/home/nolan/ping`) for
implementations, callers, and tests. Code before docs. Worktree copies
excluded. No framework sources are present locally — every harvest below is
mechanism-only until a source is obtained and the license gate is recorded.
Nothing here is approved code. Actions: KEEP / STRENGTHEN / WRAP / MERGE /
DELETE / DEFER only.

## H1 — External runtime boundary (ref: MatrixClaw)

| | |
|---|---|
| EXISTING | `runtime/authorities/execution_authority.py` — "Single authority for all execution transport decisions. Temporal and other backends are adapters behind the same interface." `ExecutionAdapter` Protocol with `execute(request)`; `SubprocessExecutionAdapter`; `ExecutionRequest{command,args,cwd,env,timeout,input_data}`. |
| CALLERS | Not fully enumerated in this pass (follow-up). The class is the declared choke point for subprocess/child-process execution. |
| TESTS | None found for this file. |
| GAP | No `ExecutionRuntimeRegistry`; no `ExternalRuntimeAdapter`; no `availability()/descriptor()/resume()/send()/interrupt()/close()/events()`; no external process/thread/session-ID ownership concept. |
| ACTION | **STRENGTHEN** — extend the existing `ExecutionAdapter` contract toward the registry + external adapter. Do NOT create `ExternalAgentAuthority`. Derive the interface from this contract, not from MatrixClaw's. |

## H2 — Normalized execution events (ref: MatrixClaw)

| | |
|---|---|
| EXISTING | No `EXECUTION_STARTED` / `TOOL_REQUESTED` / `DIFF_PROPOSED` / `EXECUTION_COMPLETED` / `EXECUTION_FAILED` / `EXECUTION_INTERRUPTED` vocabulary found in the tree. `gateway/tool_gateway.js` matched one pattern in the family (unverified which). Mission-level events exist (`MISSION_RECONCILE_HOLD` via `UnifiedEventRuntime.emit`); event types are registered in `generated/event_registry.json` with `EventValidator` admission. |
| CALLERS | n/a (vocabulary absent). |
| TESTS | `ping-runtime/events/uer-spine-identity.test.js` (spine identity, not event vocabulary). |
| GAP | No canonical execution-event set. Raw provider payloads have no evidence-vs-diagnostic policy. |
| ACTION | **STRENGTHEN** — map the needed vocabulary into the existing event registry. Do NOT create another event schema. |

## H3 — Deterministic capability grants (ref: Talos)

| | |
|---|---|
| EXISTING | `ping-runtime/connectors/capability_registry.js` — capability→provider→entry with reverse index; "Capabilities are stable. Providers are interchangeable. PING depends only on capability contracts, never on providers." `ping-runtime/runtime/tenant_capability_grant.js` (W5) — typed grant validator `{capability, principal, tenant, scope, purpose, expiry, data_class, break_glass}`; "This is NOT an authority: it validates grant objects... Grant issuance belongs to the TenantOS Customer API (future)." Operational-vs-learning purpose separation; break-glass (Nolan 2026-09-25: explicit, ≤15 min, least-privilege, audited). Also `capability_resolver.js`, `constitutional_capability_contract.js`, `runtime/security/capabilities.py`. |
| CALLERS | `createConnectorRoutes` wires the registry (per Interval 08 forensic). W5 is validation-only by design. |
| TESTS | `ping-runtime/runtime/test_tenant_capability_grant.js`. |
| GAP | Grant ISSUANCE authority is explicitly future. No scoped grant yet binding tenant/actor/mission/execution/worker/capability/resource/argument-digest/expiry/attempt. |
| ACTION | **STRENGTHEN** — when issuance is needed, build it as the authority W5 defers to; map Talos's exact grant shape against this one first. Invariant holds already in prose: an LLM never decides whether its own effect is authorized. |

## H4 — Durable execution (ref: ClawDesk, ForkScout, POLYROB, Nerve)

| | |
|---|---|
| EXISTING | `ping-runtime/orchestration/mission_runtime.js` — states `created → assigned` (atomic claim, `lease_until` 60s) `→ running → completed/failed`, plus `retry_pending` and `hold_at` holds; expired leases return to `created`. `mission_scheduler.js` — dispatch timeout yields **UNKNOWN** (`effect_known=false`), `_reconcileUnknown` stuck-running watchdog, `MISSION_RECONCILE_HOLD` emission, "OUTCOME UNKNOWN - RECONCILIATION IN PROGRESS". `DeadLetterAuthority` wired at bootstrap (never exercised). `PostgresCheckpointStore` (`constitutional-compiler/dist/.../checkpoint_store.js`). `failure_record.js`. |
| CALLERS | `MissionScheduler.dispatch` → `WorkerRuntime.dispatch` (dispatch-only; `_poll` deliberately disabled). |
| TESTS | `mission_scheduler.retry_watchdog.test.js`, `failure_record.test.js`, `approval_restart_durability.test.js`, `mission_scheme_convergence.test.js`. |
| GAP | No CHECKPOINTED mission state; orphan recovery is lease-expiry only; DLQ wired but never exercised; no circuit breaker or blue-green worker promotion found. The order's state names (INTENDED/AUTHORIZED/LEASED/...) must be mapped onto `created/assigned/running/...`, not adopted blindly. |
| ACTION | **STRENGTHEN** — add checkpointed state + orphan recovery, exercise the DLQ. Attack UNKNOWN first (already first-class here — this is the strongest existing mechanism in the whole matrix). |

## H5 — Thin supervision (ref: Goated)

| | |
|---|---|
| EXISTING | `WorkerRuntime` is dispatch-only by deliberate design (Interval 08 forensic). `ExecutionAuthority` docstring already frames backends as interchangeable adapters. |
| CALLERS / TESTS | Covered under H4. |
| GAP | None architectural. The risk is future: wrapping coding runtimes so heavily that TenantOS reproduces them. |
| ACTION | **KEEP** — the architecture already embodies thin supervision. The harvest validates the direction; no code needed. |

## H6 — Extension trust classes (ref: ThinClaw)

| | |
|---|---|
| EXISTING | `constitutional_capability_contract.js` (capability contracts); `mcp/ping_mcp_server.py` (MCP server); `MCP_CERTIFICATION.md`. No explicit trust-class model found (native vs sandboxed vs MCP vs sidecar vs external vs remote). |
| CALLERS | n/a. |
| TESTS | None found for trust classes. |
| GAP | Trust classes are not mapped into `CapabilityAuthority`. The questions (READ/WRITE FILE? NETWORK? SPAWN PROCESS? USE SECRET? PUBLISH EXTERNALLY? SPEND MONEY?) have no single capability-answering home yet. |
| ACTION | **STRENGTHEN** — model trust classes as capability answers, never as runtime self-description. |

## H7 — Learning candidates (ref: AgentArk, Nerve, Pernix, POLYROB)

| | |
|---|---|
| EXISTING | `ping-runtime/feedback/feedback_contract.js` (+ test). `scripts/skill_registry.py` — skill metadata `{name, requires, steps, confidence, uses, mission}` (procedural knowledge with usage/confidence tracking). Interval 08 outcome ledger `propose-learning`: status always CANDIDATE, no promote path by design (isolated branch `fyd/i08-outcome-ledger`). |
| CALLERS | Feedback contract callers not enumerated in this pass. |
| TESTS | `test_feedback_contract.js`; outcome-ledger `test-outcome-ledger.sh` 22/22. |
| GAP | No proposal → review → promotion → versioned-policy pipeline. Skill registry tracks confidence/uses but the promotion boundary is undefined. |
| ACTION | **STRENGTHEN** — build the candidate pipeline onto existing proposal/approval structures. Never a `LearningAuthority`. Skills stay procedural knowledge, not truth. |

## H8 — Runtime failover (ref: MyAgens, POLYROB)

| | |
|---|---|
| EXISTING | `CapabilityRegistry`: "PING depends only on capability contracts, never on providers" — provider interchangeability is a stated design property. `ExecutionAdapter` protocol permits multiple backends. |
| CALLERS / TESTS | n/a (no second backend exists). |
| GAP | No failover policy; the safe-before-effect vs dangerous-after-mutation distinction is not encoded anywhere. |
| ACTION | **DEFER** — mechanism understood; implement only when a second runtime backend actually exists. Failover must consult execution/effect state when it lands. |

## H9 — Mission Control (ref: Wayland, AgentArk, MyAgens)

| | |
|---|---|
| EXISTING | `mission_control_knowledge_apis.py`; `MISSION_CONTROL_CONSTITUTIONAL_CAPABILITIES.md`; sandbox `tenant-os/marketing-mission-control` (reference only). |
| CALLERS / TESTS | Not enumerated in this pass. |
| GAP | The order's UX questions (WHAT IS RUNNING? WHAT FAILED? WHAT REQUIRES HUMAN DECISION? ...) are not yet answered by a projection. |
| ACTION | **STRENGTHEN** as projection only — this is already Interval 09's P0 (see MEMORY.md §3h). Never an authority. |

## H10 — Multi-agent communication (ref: Hivekeep et al.)

| | |
|---|---|
| EXISTING | `constitutional-compiler/dist/runtime/agent-bus/agent-bus.js` — durable append-log bus: writes immediately to `PostgresAppendStore`, replays on startup, checkpoints for recovery. Mission→Execution delegation via `MissionRuntime`/`WorkerRuntime` is the live abstraction. |
| CALLERS | AgentBus callers not verified; the file is compiled `dist` output (src not confirmed in this pass). |
| TESTS | None found for AgentBus. |
| GAP | None needed: the order explicitly rejects the agent-social-network model. |
| ACTION | **KEEP** the Mission→bounded-delegated-Execution abstraction; **DEFER** AgentBus as a communication model (do not promote it to inter-agent messaging; verify src before any use). |

## H11 — Owner inbox (ref: POLYROB et al.)

| | |
|---|---|
| EXISTING | `ping-runtime/approval/` — approval flow with `approval_effect.test.js` and `approval_restart_durability.test.js` (FYD mc-approval is mature per Interval 08). |
| CALLERS / TESTS | Approval tests listed above. |
| GAP | No NEEDS YOU inbox (what happened / why you are needed / consequence / available decisions / default if you do nothing). |
| ACTION | **DEFER** — UX work for the Mission Control projection, after H9 lands. |

## H12 — Doctor / preflight (ref: several)

| | |
|---|---|
| EXISTING | None found in `ping-runtime`, `runtime`, or `gateway`. |
| CALLERS / TESTS | n/a. |
| GAP | No deterministic preflight path (runtime available? credentials resolvable? workspace valid? capabilities resolvable? dependencies healthy? target reachable? adapter compatible?). |
| ACTION | **DEFER** — the order says "eventually"; build as deterministic software (NO AI) when execution work begins. |

## Event authority — do not touch until proven

WHO OWNS CREATE → CANONICALIZE → ID → HASH → APPEND → SEQUENCE → DURABLE
COMMIT → STREAM → REPLAY? Answer from the Interval 08 forensic:
`UnifiedEventRuntime.emit` (`ping-runtime/events/unified_event_runtime.js`)
is the sole admission choke point — event_id is the SHA-256 content hash,
`EventValidator` + verdict authority + `EventGovernance` admit, `INSERT ...
ON CONFLICT DO NOTHING` into `ping_events` is the durable commit, `.on`
subscribers are the stream, ReplayWorker→Witness→Projection is the replay
path. `EventRepository` is repo-only and UNREACHED; `EventBridge` does
direct-SQL legacy polling. **ACTION: KEEP** `UnifiedEventRuntime` as the
single owner. Do not create a fourth owner. The three-partial-owners
question is answered: there is one real owner and two unreached names.

## Identity — known debt

Competing implementations found: `runtime/authorities/identity_authority.py`,
`ping-runtime/authorities/identity_authority.js`,
`runtime/kernel/authorities/identity_authority.js`,
`runtime/constitutional/src/identity-authority.ts`
(plus `runtime_identity_authority.js`, `replay_identity_authority.js` present
but not on the traced path, per Interval 08). **ACTION: MERGE/CONVERGE** —
recorded debt, out of this interval's scope unless it blocks H1/H3.

## License gate

Framework sources (MatrixClaw, Talos, Nerve, ClawDesk, Goated, ThinClaw,
ForkScout, Wayland, Pioneer, AgentArk, POLYROB, Hivekeep, Pernix, MyAgens,
ShibaClaw, AgentOS) are **not present locally**. Every harvest above is
mechanism-only, derived from Nolan's analysis. **No code copied.**
Before any implementation touches a harvested mechanism, record:
REPOSITORY / LICENSE / COMMIT-SHA / FILES STUDIED / MECHANISM /
COPY-ADAPT-CLEANROOM / DEPENDENCY COST. Do not copy GPL code into
proprietary components without an explicit licensing decision.

## Verdict

The forensic supports Nolan's constraint: TenantOS/PING already owns the
authorities that matter. The strongest existing mechanisms are the
mission lease + UNKNOWN-outcome reconciliation (H4), the typed capability
grant validator with operational/learning separation (H3), and the
single-owner event choke point. Nothing in the corpus justifies a new
orchestrator, event bus, memory authority, or planner authority.

- KEEP: H5, event authority, Mission→Execution delegation.
- STRENGTHEN: H1, H2, H3, H4, H6, H7, H9 (in that dependency order; H9 is
  already Interval 09 P0).
- MERGE: identity implementations (debt, not this interval).
- DEFER: H8, H10 (as communication model), H11, H12.
- DELETE: nothing yet — no duplicate reached implementation was proven in
  this pass.
- REJECT (contributes no superior mechanism): none named yet — every
  framework in the corpus contributed at least a falsification reference.

The "likely core after harvest" diagram in the order is NOT approved code.
It is a convergence hypothesis to be tested mechanism by mechanism.
