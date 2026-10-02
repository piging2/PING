# LANE 14 REPORT: Unified Worker-Contract Comparison

**Status: HYPOTHESIS until replayed from a clean checkout.** All PING-side claims below are grounded in
read-only source reads done 2026-09-28 ~14:35 MDT (see raw/ping-adapter-notes.md). Donor-side claims rest on
Lane 5's report plus fresh spot reads of the pinned donor trees (see raw/donor-fields.md). Nothing was built,
modified, committed, or restarted.

**Scope note:** the orca-adapter external-agent path IS PING's current worker surface; it is compared separately
in the table because the mission asks for it, but its PING-relative verdicts are identical.

**Naming clarification (from Lane 11):** the label "mc.authorize_work_order/v1" is Lane 11's Decision Unit
naming for the live function `authorizeWorkOrder` (label source: live function, per the lane-11 report); the
"/v1" path form is not a code identifier (grep over the orca-adapter tree finds no such string). The decision
itself is real, deterministic, and GRANT|DENY-shaped (`{granted:true}` or `{granted:false, reason}`).

---

## 1. Contract comparison table

Rows: the seven comparison questions per system. Cells: observed answer + claim label.

| Question | PING (orca-adapter / mc-dispatch, observed) | orca-adapter external-agent path | MatrixClaw | MyAgens | Goated |
|---|---|---|---|---|---|
| **Unit-of-work fields** | WorkOrder: 14 required fields (work_order_id, agent_id, mission_id, task_id, correlation_id, context_pack_id, attempt, principal, namespace, capability, input, constraints, result_path, deadline) + optional causation_id. Result: 8-field envelope (work_order_id, context_pack_id, agent_id, capability, status, output, evidence, error). Envelope closed (`additionalProperties: false` per contract doc). OBSERVED IN CODE | Same as PING (it is PING's surface) | StartSessionRequest (cwd, model, approvalPolicy, sandbox, base/dev instructions, metadata) + ExternalSession (agent/thread/session ids + same) + Event envelope (10 kinds: turn.started...turn.failed; ids, tool name/input, text, error, timestamp) + Capabilities booleans. Persisted subagent_tasks records. OBSERVED IN CODE | Task card (id, title, notes, column, priority, parentId, blockedBy, retryCount, resumeSessionId, createdBy, timestamps) + TaskDelegation (status queued\|running\|ok\|error\|stopped, runId, startedAt, endedAt, error, output tail, sessionId resume token) + TaskRunConfig (timeoutMs 1_800_000, maxConcurrent 3) + FallbackSpec. OBSERVED IN CODE | Generated shell wrapper (gate-file wait, command, exit capture, `subagent-finish --status --run-id`, self-delete). No typed work record; log caps and cron timeouts as bounds. OBSERVED IN CODE |
| **Who decides executor selection** | CALLER decides (dispatchExecution opts.agentId; mc-dispatch POST body.agent). Adapter only validates: whitelist registry (unknown -> DENY) + LIVE status + capability allowlist. mc-dispatch mirrors a hardcoded SLICE_AGENTS list as defense in depth. No capability-eligibility selection, no selection rationale recorded. ADAPTER-DEFAULT (whitelist validation) | Same as PING | MODEL picks the runtime by name string; "auto" silently resolves to native. MODEL-DECIDED (Lane 5 falsification #1) | Caller picks a Lead by id (crew_delegate); registry of AgentBackends. Framework does not capability-match. CALLER/MODEL-DECIDED | Fixed: supervisor launches the configured CLI. OPERATOR-DECIDED |
| **Who decides authority posture** | ADAPTER DATA + caller tightening. authorizeWorkOrder enforces: registry allowedCapabilities, maxConstraints monotonic tightening (constraints may only tighten), hard-required no_canonical_events=true and no_mission_state_writes=true. The posture delta is NOT decided per order by a PING authority; it lives in AGENT_PROFILES data and the caller's constraints object. ADAPTER-DEFAULT | Same as PING | FUSED INTO TRANSPORT. Native child: daemon approvals + parent bridging. External child: PermissionModeFullAuto bypass by ADAPTER DEFAULT (defaultApprovalPolicy="never", defaultSandbox="danger-full-access"). No authorization delta declared. ADAPTER-DEFAULT (Lane 5 falsification #2) | FRAMEWORK-DECIDED, per delegation: delegatedPermissionMode computed from caller autonomy (full/auto_until_error -> bypass, else default + canUseTool gate). Monotonic down the chain. EXPLICIT (harvested invariant MA-1) | ABSENT. Supervisor grants everything up front (--dangerously-skip-permissions on every launch). No boundary to decide |
| **Is cancellation real** | ABSENT. No interrupt/cancel anywhere in adapter.js or the vendor file. Only the dispatcher transport timeout; a timed-out worker may still be running and is recorded as honest UNKNOWN (never collapsed to failed). Retry = re-issue with attempt+1 behind the reconcile gate | Same as PING | DECLARED but FALSIFIED: Interrupt in the interface, unimplemented on both adapters, dispatcher swallows the error. ABSENT in practice (Lane 5 falsification #3) | PRESENT at run level: per-delegation AbortController + loop detector abort. Not a typed contract cancel, but a real mechanism | Weak: watchdog reaps stuck helpers (>600s); no typed interrupt |
| **Is health checked** | REGISTRY-STATE ONLY, no live probe. AGENT_PROFILES status LIVE/PENDING_AUTH + blockedExternal (quota block, e.g. codex). Deadlines per agent in mc-dispatch are timeouts, not probes. Grep for health/probe in adapter.js, vendor file, route.ts, mc-dispatch.ts found nothing live. ABSENT (live probe) | Same as PING | Binary presence: Available() = install lookup + --version probe. Not liveness | Weak: usage-exhaustion pre-check (99%) before fallback retry; otherwise none observed | Two-channel and real: pane-tail text classification + headless auth probe as authority; three-way verdict (ok / non-recoverable / recoverable). NEW INVARIANT (G-1/G-2) |
| **Are handles portable** | N/A BY DESIGN (oneshot transport). No resume/session handle exists in the WorkOrder; retries are re-issues (taskId = executionId:attempt-N, work_order_id stable per attempt) behind the reconcile gate (idempotency key + prior-outcome lookup; reconciliation record required before a new attempt on uncertain prior). No handle portability assumption made | Same as PING | Assumed portable within a backend: SessionAttachment persisted, resume re-binds. FALSIFIED across backends (see MyAgens) | EXPLICITLY NON-PORTABLE: resume token dropped on backend change ("meaningless on a different backend's CLI"). NEW INVARIANT (MA-3, Lane 5 falsification #4) | N/A (no handles; tmux pane or subprocess) |
| **Is result verification bound to the work** | YES, strong and explicit. verifyResultEnvelope: exact echoes of work_order_id, context_pack_id, capability; THREE-WAY agent binding (authorized == invoked == result agent); status in {completed, failed} with output/error consistency rules; evidence must be object; verifiedAt required and <= deadline; invalid => non-retryable, can never reach canonical event authority. recordVerifiedResult emits WORKER_COMPLETED/FAILED through the canonical event runtime with effect_state defaulting to effect_unknown ("worker self-report is a claim, not verification"). OBSERVED IN CODE | Same as PING | Weak: child summary folds into parent journal as a message; turn.failed exists; empty summary defaults to a neutral line, not fabricated success. Not envelope-bound | Framework-judge: typed acceptance checks + judge; verified/unverified labels; unverified excluded from learning (P2). Not envelope-bound at dispatch | NO: completion is worker self-report (run_id from temp file, no process binding). AUTHORITY BYPASS (G-3, Lane 5 falsification #5) |

---

## 2. PING per-field decision map: who decides it TODAY

Marking per field: EXPLICIT (a PING authority or PING-side deterministic code decides), ADAPTER-DEFAULT
(registry data or caller-within-rails, not an authority decision), MODEL-DECIDED, ABSENT.

**WorkOrder issuance (issueWorkOrder / dispatchExecution):**

| Field | Decided by | Mark |
|---|---|---|
| work_order_id | Deterministic: sha256('workorder:'+taskId)[0:16]; re-issue of same task is idempotent | EXPLICIT |
| agent_id | Dispatcher/caller supplies it; adapter only validates registry whitelist + LIVE + capability allowlist; mc-dispatch also mirrors hardcoded SLICE_AGENTS. No authority selects or records why | ADAPTER-DEFAULT |
| mission_id | Dispatcher: dispatchExecution builds 'mission-control:\<missionId>:\<runId>'; mc-dispatch builds 'mc-m-'+sha256hex(...)[0:12] | EXPLICIT (dispatcher) |
| task_id | Dispatcher: executionId:attempt-\<N> | EXPLICIT (dispatcher) |
| correlation_id | Dispatcher: runId | EXPLICIT (dispatcher) |
| context_pack_id | Dispatcher; mc-dispatch mints 'mc-ctx-'+missionId (params-only today, zero evidence ids; Lane 10) | EXPLICIT (dispatcher) |
| attempt | dispatchExecution HARD-CODES attempt:1 at issue; the real attempt counter lives in execution.attempt and taskId. Dual bookkeeping: workOrder.attempt is not the attempt | EXPLICIT (but misleading; see gap 6) |
| principal | Constant 'ping:external-agent-adapter', never worker-asserted | EXPLICIT |
| namespace | Dispatcher supplies; validated against NAMESPACE_RE; tenant_id resolved from the authoritative scheduler dispatch event (resolveTenantId, fail-closed on contradiction) | EXPLICIT (dispatcher + tenant authority) |
| capability | Dispatcher supplies; adapter validates against profile.allowedCapabilities | ADAPTER-DEFAULT |
| input | Dispatcher supplies; must be inline object (no cross-environment paths) | EXPLICIT (dispatcher) |
| constraints | Dispatcher supplies; adapter enforces: object shape, monotonic tightening vs profile.maxConstraints, hard no_canonical_events=true + no_mission_state_writes=true. Posture lives in registry DATA, not in a per-order authority decision | ADAPTER-DEFAULT (explicit rails) |
| result_path | PING-owned: evidence-dir artifact path; worker never writes here (PING captures stdout) | EXPLICIT |
| deadline | Dispatcher (deadlineMs, default 600000); mc-dispatch DEADLINES per agent; enforced by verifyResultEnvelope (verifiedAt <= deadline) | EXPLICIT (dispatcher) |
| causation_id | Always null in current dispatchExecution | ABSENT |
| verifiedAt | Dispatcher clock (isoNow()) at verify time; binding checked, clock source is the caller | EXPLICIT (dispatcher clock) |
| invokedAgentId | Dispatcher re-passes agentId; three-way binding enforced at verify | EXPLICIT |

**Notably MODEL-DECIDED: nothing.** In the paths read, the model never names the executor and never sets posture.
That is PING's real structural advantage over MatrixClaw's name-picking, and it should be kept as an invariant
rather than assumed.

**ABSENT fields (no one decides them today):**
- Executor selection rationale/authority: no eligibility record, no "why this worker" event.
- Authority posture delta per order: lane-5 falsification #2 applies to PING too; posture is registry data.
- Cancellation: no handle, no interrupt.
- Live health at dispatch: static registry state only.
- Resume/session handle: absent by design (oneshot); retries are re-issues.
- Per-order cost/budget: quota gating is external to the envelope (dispatcher checks Copilot BROKER_STATE,
  fail-closed on unknown/stale).
- Retry policy: lives in orchestration; envelope carries attempt only.
- Effect verification binding: dispatcher-computed effect_state metadata, default effect_unknown; honest but
  dispatcher-asserted, not measured.

**Lane 5 conclusion applied:** swapping workers behind PING's contract preserves constitutional semantics ONLY
for the fields marked EXPLICIT. The ADAPTER-DEFAULT and ABSENT fields are exactly where a worker swap silently
changes semantics today: change hermes to cloud-subagent and the authority posture changes (different
allowedCapabilities, different maxConstraints data) with no explicit authorization delta; change the transport
and "cancel"/"healthy" change meaning with nothing in the record.

---

## 3. Minimal unified WorkOrder contract spec (specification only, NOT implemented)

Design rule: every field has exactly one deciding authority; the worker is opaque to identity and authority
fields (echoes them, never authors them); anything a worker swap could change must be an explicit typed field.

### 3.1 Envelope fields, types, deciding authority

| Field | Type | Decided by | Worker-opaque |
|---|---|---|---|
| work_order_id | string, sha256('workorder:'+task_id)[0:16] | Deterministic issuer (PING adapter) | yes |
| mission_id | non-empty string | Dispatcher (PING orchestration) | yes |
| task_id | non-empty string | Dispatcher; per-attempt identity (executionId:attempt-N) | yes |
| correlation_id | non-empty string | Dispatcher | yes |
| context_pack_id | non-empty string | Dispatcher (compiler-assembled packet when the contextpack patch lands; params-only until then) | yes |
| causation_id | string \| null | Dispatcher; null forbidden at promotion time | yes |
| attempt | integer >= 1 | Dispatcher; increments per retry; single source of truth (fixes dual bookkeeping) | yes |
| executor_binding | {nonce: string, issued_at: ISO} | PING adapter at dispatch; nonce verified at receipt. Defeats self-reported completion misattribution (G-3 class). Carried on the invocation channel, NOT in the WorkOrder the worker can echo-mint | worker sees nonce value, cannot mint |
| agent_id | registry key string | Dispatcher proposes; CapabilityAuthority grants via authorizeWorkOrder whitelist | yes |
| executor_selection | {decided_by: authority id, rationale: enum/record, at: ISO} | CapabilityAuthority (NEW: explicit per-order selection record). Addresses the absent selection authority | yes |
| capability | registry capability string | Dispatcher proposes; adapter validates against profile allowlist | yes |
| authority_posture | {effect_ceiling, approval_mode, sandbox, data_classes} | CapabilityAuthority per order (NEW: explicit, never adapter-default; monotonic tightening only, MyAgens MA-1 / Talos T3 shape) | yes |
| constraints | object; no_canonical_events=true, no_mission_state_writes=true hard | Dispatcher proposes; adapter enforces monotonic tightening vs posture | yes |
| namespace | core::x \| tenant::x | Dispatcher proposes; CanonicalizationService validates; tenant_id threaded from authoritative event | yes |
| principal | constant string | PING adapter | yes |
| input | object, inline-only | Dispatcher | NO (worker reads it) |
| budget | {timeout_ms: int, max_cost?: number, cost_gate: authority id} | Dispatcher proposes; quota/cost authority gates (external to envelope today; typed here) | yes |
| cancellation | {cancellable: bool, cancel_deadline_ms?: int} | PING orchestration declares; worker transport honors or declares unsupported honestly (MatrixClaw lesson: advertised-false must never be invoked) | yes |
| deadline | ISO datetime | Dispatcher | yes |
| result_path | string | PING-owned; worker never writes directly | yes |
| reconciliation | {checked, found, decidedBy, decidedAt, authorizesAttempt} \| null | Reconcile authority (human or typed policy); required before a new attempt when the prior attempt is uncertain (already exists in adapter.js dispatchExecution; promoted to contract) | yes |

### 3.2 Result envelope fields, types, deciding authority

| Field | Type | Decided by | Worker-opaque |
|---|---|---|---|
| work_order_id, context_pack_id, agent_id, capability | exact echoes | Worker echoes; PING verifies byte-exact | worker echoes only |
| executor_nonce | string | Worker echoes the dispatch-issued nonce; verified at receipt | echo only |
| status | completed \| failed \| unknown | Worker reports; PING classifies honestly (unknown channel stays unknown) | NO (worker asserts, PING verifies) |
| output | any \| null | Worker | NO |
| evidence | object (open) | Worker reports; PING treats as claim, never truth | NO (worker asserts) |
| error | string \| null | Worker | NO |
| effect_state | effect_unknown \| effect_hold \| effect_none | PING dispatcher computes; default effect_unknown | yes |

### 3.3 Invariants the contract carries (from the donor falsifications)

1. Executor selection is an explicit per-order authority decision with a recorded rationale, never a model
   name-pick (MatrixClaw falsification #1) and never a silent caller default (PING's current state).
2. Authority posture is an explicit per-order CapabilityAuthority decision; delegation can only tighten
   (MyAgens MA-1, Talos T3). Adapter data is the ceiling, never the decision.
3. Cancellation is either a real bound with an honest unsupported declaration, or absent from the contract;
   a declared-but-unimplemented interrupt invoked anyway is a falsification (MatrixClaw).
4. Handles are executor-scoped, never contract-scoped: failover or backend change drops the handle and
   re-issues; it never transplants (MyAgens MA-3). PING's oneshot design already satisfies this; the
   contract must say so explicitly so a future stateful worker does not smuggle handle portability in.
5. Completion is bound to the dispatch-issued nonce; bare run-id self-report is rejected (Goated G-3).
6. Health is a two-channel verdict (live probe + evidence), never log text alone; inconclusive never becomes
   BLOCKED (Goated G-1); recoverability is classified at the health boundary (G-2).
7. Timeouts are honest UNKNOWN; the timed-out worker may still be running; retry requires the reconciliation
   record (already PING's dispatchExecution behavior; promoted to contract).
8. MyAgens is GPL-3.0: invariants only, no code. All of the above are stated as invariants, none copied.

---

## 4. Headless Hermes as a replaceable worker: interface requirements

Hermes stays relevant ONLY as a replaceable worker under the unified contract. The installer/packaging thread
is dead; nothing below touches packaging. Interface only:

1. **Invocation:** oneshot subprocess; prompt passed as a single argument (current proven form:
   venv python hermes_cli/main.py --safe-mode -z \<prompt\> via the persistent Pig-side bridge).
   Work orders carry input INLINE ONLY; Hermes cannot see WSL/cloud paths (verified 2026-09-16/17).
2. **Return contract:** exactly the 8-field result envelope on stdout (work_order_id, context_pack_id, agent_id,
   capability, status, output, evidence, error), or the explicit unknown channel (status unknown + summary).
   Malformed output is a non-retryable protocol failure and can never reach canonical event authority.
3. **Prohibitions (already in the adapter, restated as the worker-side interface):** never emit canonical
   events; never write mission state; never self-assert principal, namespace, or capability; never create
   authorities, event stores, or intermediary services; no secrets/credentials anywhere in input, output, or evidence.
4. **Posture:** honor the per-order authority_posture and constraints. Current Hermes profile posture:
   read_only, no_writes, no_network, no_canonical_events, no_mission_state_writes. Research/analysis
   capabilities only (fixture.read, text.transform, text.summarize in the current registry).
5. **Evidence:** agent-reported only; recommended keys startedAt, endedAt, host, promptLength, responseLength,
   capabilityPerformed. PING records completions as effect_unknown; Hermes output is a claim, not verification.
6. **Deadline discipline:** return by the order deadline (~11s typical informs margins); transport timeout
   produces honest UNKNOWN, and Hermes must not treat a timeout as a failure to retry on its own.
7. **Replaceability test:** any worker satisfying 1-6 is substitutable for Hermes on research/analysis
   capabilities. The executor_binding nonce (contract 3.1) is the future check that the receipt came from
   the dispatched Hermes invocation, not a self-report.
8. **Out of scope:** installer, packaging, bridge deployment, login/auth flows. Dead thread; do not reopen.

---

## 5. Ranked gaps by constitutional risk

Ordered by what could let a worker promote output to truth, bypass authority, or duplicate effect.

**R1. Authority posture is adapter data, not a per-order authority decision.**
allowedCapabilities and maxConstraints live in AGENT_PROFILES; the posture delta between families is never
explicitly decided or recorded. Swapping hermes for cloud-subagent changes effect posture while
authorizeWorkOrder stays green. This is Lane 5's falsification #2, and it applies to PING's own surface.
A worker cannot grant itself capability through this path today (whitelist is fail-closed), but the posture a
worker RUNS UNDER is not an authority decision, so a future profile edit or family swap changes constitutional
semantics silently. Highest risk.

**R2. Executor selection has no authority and no record.**
agent_id is caller-supplied; the adapter validates the whitelist only; mc-dispatch mirrors a hardcoded
SLICE_AGENTS list. No eligibility decision, no rationale, no "why this worker" event. The model does not pick
today (good), but nothing in the contract would stop a model-driven or misconfigured selection from arriving
indistinguishable from a correct one. An authorized-but-wrong executor changes failure, cost, and evidence
semantics with no trace.

**R3. Completion attribution has no process binding.**
verifyResultEnvelope's three-way agent binding is strong, but the receipt is dispatcher-observed stdout, not
bound to the spawned process. A replaced helper or stray process emitting a well-formed envelope could
misattribute completion. Goated's G-3 bypass is the shape of this failure; PING is stronger (schema +
binding + non-retryable validation + effect_unknown default) but the nonce is missing.

**R4. Cancellation is absent.**
No interrupt; timeout-only; the timed-out worker may still be running. The reconcile gate prevents blind
re-dispatch, and timeouts are honest UNKNOWN, so duplicate effect is fenced but not prevented at the executor.
A replacement worker cannot be proven dead before a retry starts (Nerve's quiescence gate is the donor shape
for this).

**R5. Health is registry-state, not a live probe.**
LIVE/PENDING_AUTH/blockedExternal are static data; the codex blockedUntil timestamp already went stale once.
Dispatching to a dead worker burns the deadline and records UNKNOWN instead of failing fast. Lower
constitutional risk than R1-R4 because the failure mode is delay, not authority bypass; still a real gap
against Goated's two-channel health invariant.

**R6. attempt bookkeeping is dual.**
dispatchExecution hard-codes workOrder.attempt=1 while the evidence index and taskId track execution.attempt.
Today this is consistent (work_order_id is stable per executionId:attempt-N), but two counters for one concept
is where replay/reconciliation confusion breeds. Operational, not constitutional; fix by making attempt the
single source of truth per contract 3.1.

**R7. verifiedAt is caller-supplied clock.**
The binding (verifiedAt <= deadline) is checked, but the clock comes from the dispatcher. A lying clock could
widen the deadline window. Low risk: the dispatcher is PING-side; note the trust assumption.

**R8. causation_id is always null.**
Lineage gap only. No authority risk today; the field exists for the future.

### What PING already gets right (keep as invariants)

- Model never decides selection or posture in the paths read (structural advantage over MatrixClaw).
- Monotonic constraint tightening with hard no_canonical_events / no_mission_state_writes.
- Result verification bound to the work: three-way agent binding, exact echoes, status/output/error
  consistency, non-retryable validation failure.
- Worker self-report is a claim: effect_unknown default on verified completions; honest UNKNOWN on timeouts
  and on the explicit unknown channel; never collapsed into failed or success.
- Reconcile gate: idempotency key + prior-outcome lookup + artifact-exists refusal + reconciliation record
  before new attempts on uncertain priors; atomic reservation under the cross-process index lock.
- Unknown agent/capability/namespace/constraints fail closed with typed reasons; identity_5..10 denied by
  standing containment; no secrets in WorkOrders (credentials resolved at the process boundary).

---

## Grounding ledger

- PING reads (read-only, via pigwsl-exec.sh -s, 2026-09-28 ~14:35 MDT):
  /home/nolan/workspace/orca-adapter/vendor/external_agent_adapter.js (428 lines),
  /home/nolan/workspace/orca-adapter/adapter.js (dispatchExecution),
  /home/nolan/workspace/multi-runtime-workorder-contract.md,
  /home/nolan/projects/ping/src/app/api/mc/dispatch/route.ts,
  /home/nolan/projects/ping/src/app/api/mc/_lib/mc-dispatch.ts.
- Donor reads: Lane 5 report (hypothesis input) + fresh spot reads of pinned trees at
  ~/workspace/ping-24h/donors/{matrixclaw,myagens,goated} (field structs only, no behavior claims beyond Lane 5).
- Lanes 2 and 3 reports used as cited: Talos double-kernel mint (T1), Pioneer execution-authority integrity
  gate (P2), Nerve drain-before-drive/quiescence (N2), POLYROB three-valued liveness + verified/unverified
  completion labels (P1/P2).
- NOT verified: runtime behavior of any path; whether other PING trees (constitutional-runtime,
  ping-constitutional) contain a differently-named authorize decision; the full wave-1 "capability-eligibility
  executor selection with runtime health probes" claim (not observed in the paths read; flagged, not asserted).
- MyAgens (GPL-3.0) and nanoMuse (GPL-3.0, not used here): invariants only, no code copied.

**This report is a hypothesis until replayed from a clean checkout.**

## 6. Lane 11 / Lane 10 handoff integration (received 2026-09-28 ~14:35 MDT; both lanes' claims are hypotheses until clean-checkout replay)

### 6.1 T1: who decides authority posture AT INVOKE TIME in PING today

Nobody re-decides. Trace through adapter.js dispatchExecution (verified in the read):

- adapter.js:1239: `authorizeWorkOrder` runs (step 2, AUTHORIZE).
- adapter.js:1298: `issueWorkOrder` runs INSIDE the cross-process index lock; issueWorkOrder re-runs
  authorizeWorkOrder internally, so the grant is re-derived at issue time (T1-aligned at issue).
- adapter.js:1313-1320: the transport invoker is resolved from the caller's `transport` param
  (default 'hermes'); an unknown transport throws before the index sees the attempt.
- adapter.js:1334-1348: the reconciliation record (if any) and the dispatched-phase index line land
  BEFORE the transport is invoked, still under the lock.
- adapter.js:1353: `const disp = invokeTransport(prompt, timeoutMs)` AFTER the lock is released.
  The carried WorkOrder is trusted with NO redeem-time re-decide.

So at invoke time the authority posture is CARRIED, not decided: it is whatever the issue-time grant
produced (dispatcher-supplied constraints validated against AGENT_PROFILES data as of issue). Between
issue and invoke, no authority re-verifies the posture. The window is small (same synchronous flow,
lock released just before transport), but the structural shape is the Talos-T1 gap: a carried verdict
is trusted at the effect boundary. Concretely, if registry data changed between issue and invoke
(e.g. an identity landed in DENIED_IDENTITY_IDS, a profile flipped to blockedExternal), invoke proceeds
on the stale grant. Per-field decision-map marking for invoke time: posture at invoke = CARRIED
(decided at issue by ADAPTER-DEFAULT rails + dispatcher constraints); re-decision at invoke = ABSENT.

Contract consequence: the unified spec (section 3) needs a redeem step. The `executor_binding.nonce`
field plus a redeem-time re-decide (recompute the grant over the actual invocation inputs before
transport, refuse on mismatch) closes this. PING's reconcile gate already fences the crash window
(dispatched-without-outcome is honest); the redeem closes the stale-grant window.

### 6.2 T2: redeem-time fingerprint field

Agreed: the contract needs it. `work_order_id` is a deterministic ID
(sha256('workorder:'+taskId)[0:16]), not a fingerprint over the action; `result_id` fingerprints
identity fields, not action content. Proposed contract field:

- `action_fingerprint`: sha256 over canonical JSON of
  (capability, agent_id, input digest, kernel-derived targets, namespace, authority_posture digest).
- Minted by: the issuing authority at issue time (the authorize path re-running policy itself on the
  exact request, Talos T1 shape). "Kernel-derived targets" for PING's external workers means the
  dispatcher/authority-computed target set (e.g. result_path, allowed data classes), never
  worker-declared values.
- Verified by: (a) the dispatcher at the invoke boundary (recompute over the actual bytes about to be
  handed to transport; mismatch = refuse, never invoke); (b) the result verifier (bind the fingerprint
  into result_id so a result cannot drift from the fingerprinted action).
- A bent WorkOrder (one byte changed in input, capability, namespace, or posture between issue and
  invoke) fails the recompute. This is the mechanical form of "the mint asks the kernel itself."

### 6.3 P2 / U-07: startup execution-authority integrity gate

Lane 11 confirms the GAP: no scan-all-active + positive-validate + quarantine + abort-on-scan-failure
observed at the ORCA/MC resume boundary. For the unified spec's health/authority-precondition fields,
the contract should require, not just permit, the gate:

- Contract field `authority_envelope` per WorkOrder: {admission id, initiating principal, namespace/
  workspace, posture reference, issued_at}. The gate has something to validate only if the envelope
  exists on every in-flight unit.
- Contract precondition on dispatcher startup: before any dispatch, scan all active executions;
  any with missing/invalid envelope -> quarantine (Blocked with typed reason); scan failure ->
  abort startup (never proceed with unvalidated executions). This is Pioneer's P2 shape, applied to
  PING's resume boundary. Authority is never inferred from row shape; a later explicit restart
  creates a fresh admission.
- Health/authority-precondition fields in section 3.1 (`executor_selection`, `authority_posture`,
  `reconciliation`) are the per-order inputs the gate validates.

### 6.4 Test gap: zero dedicated unit tests for authorizeWorkOrder

Lane 11 notes zero dedicated unit tests for authorizeWorkOrder despite C4 criticality. Added to the
ranked gaps as R9 below. If result-verification testability is a contract field (it should be), the
contract names its test hooks: deterministic fixtures for authorize/issue/verify plus the donor-steal
tests that pin the invariants: tampered-verdict-still-denies (Talos), bent-token-fails-redeem
(one-byte change fails the fingerprint), completion-attribution-nonce (bare run-id rejected, Goated),
approval-bridge idempotency (MatrixClaw), resume-token exactly-once (MyAgens), claim-liveness
three-valued probe (POLYROB). A contract whose critical decision has no dedicated tests is a contract
whose invariants are asserted, not held.

### 6.5 Lane 10 question: is binding the work order sufficient, or does the contract need a field binding what the executor actually received?

Binding the work order is NOT sufficient. Lane 10's finding: even after the ContextPack patch lands,
the executor receives the raw prompt, not the compiled packet. The packet binds the work order but
not the executor's reasoning. A result verified against the work order could have been produced from
a different prompt (dispatcher bug, prompt assembly skew, injection between packet and prompt), and
verification would stay green.

Contract answer: add `input_digest` (PING-computed sha256 over the EXACT bytes handed to the executor
transport: the prompt text, or the packet bytes once the patch routes the packet into the prompt).
The worker echoes `input_digest` in the result envelope; `verifyResultEnvelope` checks the echo
against the dispatch-recorded digest. Fields:

- `input_digest` in the WorkOrder: decided by PING dispatcher at dispatch; worker-opaque (echo only).
- `input_digest` echo in the result envelope: worker echoes; PING verifies.
- On mismatch: invalid result, non-retryable, can never reach canonical event authority
  (same severity as a work_order_id mismatch).

Why the echo is trustworthy enough: the envelope already comes through the invoked transport and is
bound by the three-way agent binding; the digest's value is (a) auditability of what the executor
reasoned over, and (b) detection of dispatcher-side substitution, which is the failure mode Lane 10
identified. A malicious worker could echo any digest, but worker malice is not the threat this field
addresses; prompt/reasoning skew inside PING's own dispatch path is. The authority decision (which
input the executor got) stays PING's; the digest makes it checkable.

This also answers the ContextPack patch's open edge: when the patch lands, `input_digest` is computed
over the packet bytes actually placed in the prompt, so "the executor received the compiled artifact"
becomes a verifiable claim rather than a patch-lane intention.

### Updated ranked gaps (additions)

**R9. Zero dedicated unit tests for authorizeWorkOrder (C4 criticality).**
Lane 11's test-gap finding. The contract's most critical decision has no dedicated tests; the invariants
in section 3.3 are asserted, not held. Fix: name the test hooks in the contract (section 6.4).

**R10. No redeem-time re-decide at the issue->invoke boundary (T1 partial).**
Authority posture is carried from issue (adapter.js:1298) to invoke (adapter.js:1353) with no
re-verification. Small window, structural gap. Fix: redeem step recomputing the grant + action
fingerprint over the actual invocation inputs before transport (sections 6.1, 6.2).

(Previous R1-R8 unchanged. R1 remains the highest constitutional risk.)
