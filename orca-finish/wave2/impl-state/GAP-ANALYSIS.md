# GAP ANALYSIS — W2-IMPL-STATE vs `feature/orca-autonomy` @ `ae55b77ff`

**Date:** 2026-09-23 MDT. **Method:** read-only inspection of the branch worktree
`/home/nolan/worktrees/orca-autonomy` (HEAD `ae55b77ff82a893d50c48ab299117b2f705a0f03`,
clean) + C1 inventory (`ORCA-INVENTORY.md`) + `A5-VERDICT.md`. Nothing modified
on the branch. Salvage rule applied: reuse/adapt before implementing.

**Scope:** my five criteria — durable RUN identity, bounded work packets,
attempt identity, dependency ready-set, checkpoint/resume.

## Verdicts

### 1. Durable RUN identity — TRUE_GAP (record missing; substrate proven)

**What exists (keep, wire through):**
- Durable *objective* identity: `deriveObjectiveId({namespace, objectiveText,
  constraints})` — SHA-256 over canonical intent only
  (`orca/control-loop/objective-runtime.js:59-64`). The module header states
  the convention explicitly: identity is "never PID, wall clock, run ID,
  attempt number, or worker identity" (`objective-runtime.js:27-33`).
- Durable work-order identity: `deriveWorkOrderId(objectiveId, taskKey)`
  (`objective-runtime.js:71-78`); re-entrant `authorizeWorkOrder`
  (`objective-runtime.js:399-422`).
- Crash-safe durable substrate: atomic temp+rename writes
  (`atomicWrite`, `objective-runtime.js:122-137`) under
  `PING_DATA_ROOT/objectives/<objective_id>/`; durable budget
  (`reserveWorkOrderBudget`, idempotent per work-order id,
  `objective-runtime.js:276-300`); durable cancellation
  (`objective-runtime.js:309-328`).
- Single-coordinator claim via PG session-level advisory lock on a dedicated
  client — SIGKILL-safe, server releases on session drop
  (`acquireCoordinatorLock`, `objective-runtime.js:196-230`); the file claim
  record is explicitly "DIAGNOSTIC ONLY … not this file"
  (`objective-runtime.js:184-191`).
- Startup reconciliation: `reconcileStartup()` rediscovers durable work
  orders before any new dispatch (`orca/control-loop/orca_control_loop.js:610-649`).

**The exact missing piece:** there is no durable *run* record. The loop's run
identity is wall-clock derived and fresh every process start:
`const RUN_ID = 'orca-run-' + Date.now().toString(36);`
(`orca/control-loop/orca_control_loop.js:115`) — which violates the branch's
own identity convention quoted above. Consequences, all verified in source:
- No run row: no typed run status, no run-scoped lease/fencing beyond the
  coordinator claim, no worktree/branch binding per run.
- No `tenant_id`/namespace on the durable objective/work-order records: the
  adapter enforces `core::<name>` / `tenant::<id>` namespaces at the WorkOrder
  boundary (`external_agent_adapter.js:authorizeWorkOrder`), but the
  `objectives/<id>/` tree is not tenant-scoped and the JSON records carry no
  tenant field.
- A restarted coordinator cannot reconstruct *the run* (only the objective
  and its work orders); run-level status must be re-derived from evidence
  files, which is the conversational-reconstruction problem record 1 exists
  to kill.

**PG-table form: NOT needed.** The branch's substrate (atomic files +
advisory-lock single writer) is the reviewed, crash-safe durable substrate;
the A6 remediation was designed around it. Adding six PG tables would create
a second durable store beside `objectives/` — exactly the second-writer /
second-authority failure the mechanism map's record 5 (one-writer, SURVIVES)
forbids. The O-1 smallest proof (kill worker; fresh worker reconstructs run
identity, status, worktree from durable state alone) is satisfiable from the
filesystem record: `loadRun()` reads one JSON file. The fencing-token CAS
*intent* (exactly one writer may advance a running row) is already provided
by the advisory-lock claim — a strictly stronger primitive than CAS for the
single-coordinator case; the run record carries `fencing_epoch` anyway so a
stale holder's late writes are detectable.

**What I build:** `orca/control-loop/orca_run_record.js` (new, additive):
durable run record under the objective dir — `runs/<run_id>.json` —
`deriveRunId(objectiveId, runSeq)` deterministic from intent + durable
monotonic run sequence, typed run status via a pure transition table
(NOT_STARTED/STARTED/SUSPENDED/SUCCEEDED/FAILED/OUTCOME_UNKNOWN/CANCELLED),
lease holder + expiry + `fencing_epoch`, `tenant_id`/namespace, worktree
path, checkpoint version counter. Wires through `objective-runtime.js`
(`atomicWrite`, `readJson`, `objectiveDir`) by dependency injection — no
forked copy of the branch's code.

### 2. Bounded work packets — ADAPT (mechanism exists; envelope incomplete)

**What exists:**
- The work order is a bounded unit: stable identity, durable attempt budget
  (max 2 attempts, `orca_control_loop.js` delegate loop), durable work-order
  budget (`max_work_orders`, `reserveWorkOrderBudget`), 180s dispatcher
  timeout < 10-minute work-order deadline, timeout → honest `failed` envelope
  (never fabricated success), fail-closed authorization
  (`external_agent_adapter.js:253-292`).
- Capability allowlist per agent profile (`AGENT_PROFILES[].allowedCapabilities`).

**What is missing (exact change spec — NOT built in this lane):**
- (a) Acceptance criteria are not REQUIRED: `issueWorkOrder`
  (`external_agent_adapter.js:294-343`) validates 6 string fields + input
  object + deadline + attempt, but has no `acceptance_criteria` field and
  rejects nothing for its absence. Change: add `acceptance_criteria` to the
  required-fields loop (non-empty string), thread through the 14-field
  envelope, add to `WORKORDER_SCHEMA.json`.
- (b) No per-packet budget envelope: the budget is objective-level
  (work-order count) only; there is no per-packet token/request/tool-call
  limit (the PAI-01 half of record 2). Change: `budget: { max_tool_calls,
  max_tokens, … }` on the work-order record, checked in `delegate()` before
  dispatch.
- (c) No per-packet capability scoping beyond the profile allowlist, and no
  dependency list (see criterion 4).

### 3. Attempt identity — ALREADY_IN_BRANCH

- `deriveAttemptId(workOrderId, attemptNumber)` =
  `workOrderId + '-attempt-' + attemptNumber`
  (`orca/control-loop/objective-runtime.js:84-89`); attempt recorded BEFORE
  dispatch (`orca_control_loop.js:792-798`, `last_attempt_id` persisted);
  `attempt_history` appended on the durable work order
  (`recordAttemptOutcome`, `orca_control_loop.js:489-502`); retry re-issues
  the same `taskKey` with `attempt+1` against the same `work_order_id`
  (idempotent re-issue, A5-verified).
- Singularity without a DB unique constraint: derivation is deterministic
  (same inputs → byte-identical id) and mutation is single-writer
  (advisory-lock holder), so a duplicate claim cannot name a *different*
  execution — the hardening's intent (one id = one logical execution) holds.
- Tenant-in-routing-key: `namespace` is hashed into `objective_id`
  (`deriveObjectiveId`), which feeds `work_order_id`, which feeds
  `attempt_id` — a `tenant::<id>` namespace is transitively embedded in every
  attempt id. Verified by reading the derivation chain, not assumed.
- No bearer authority: the attempt id names rendezvous files and history
  entries; there is no attach-by-id rendezvous, so the id grants nothing.

### 4. Dependency ready-set — TRUE_GAP (nothing exists)

Searched the branch: no dependency edges between work orders/tasks, no DAG
representation, no ready query. The loop sequences t1 → t2 via
`assessAndFollowUp()` chaining (`causation_id` = prior event id), which is
follow-up, not a dependency graph — "B is blocked on A" is not queryable
data anywhere (mechanism-map record 3's exact problem statement). The
`_retired-vendor-2026-09-18/` dir and policy modules contain no edge table.

**What I build:** `orca/control-loop/orca_ready_set.js` (new, additive, pure):
`readyWorkOrders(workOrders, { blockedWorkOrderIds })` — a work order is
ready when (1) its durable `state` is not terminally completed
(COMPLETED/FAILED/VERIFICATION_FAILED/BLOCKED/CANCELLED), (2) every id in its
`depends_on` list names a work order whose `state` is COMPLETED
(terminal-success), (3) it is not in the unresolved-unknown set. No
scheduler import; pure function over work-order row shapes
(`{work_order_id, state, depends_on}`); a cycle degrades to "never ready"
(safe deadlock, no wrong execution), never a hang. The `depends_on` field on
the work-order record is the ADAPT tail (one optional field + param on the
branch's `authorizeWorkOrder`); the query itself needs no branch change.

### 5. Checkpoint/resume — ADAPT (rehydration exists; versioning + UNKNOWN missing)

**What exists:** `reconcileStartup()` + durable work orders + attempt history
+ atomic rendezvous results = agent-driven rehydration (the O-6 pattern):
a fresh coordinator reconstructs open work orders without coordinator
explanation. `reconcileRunningWorkOrder` (`orca_control_loop.js:557-608`)
handles the three cases honestly (result present → verify/accept; dispatcher
possibly alive → leave RUNNING, refuse redispatch; dispatcher dead, no
result → DISPATCH_LOST, re-authorize).

**What is missing (exact change spec — NOT built in this lane, except the
checkpoint counter which rides on the new run record):**
- (a) No versioned, monotonic checkpoint: state is spread across
  `objective.json` / `work_orders/*.json` / `results/*` with `updated_at`
  timestamps but no checkpoint version. Change: `checkpoint_version`
  counter on the run record (built in this lane as part of the run record),
  incremented on every durable run-state mutation.
- (b) No OUTCOME_UNKNOWN vocabulary anywhere in the branch (grep: zero
  hits). The `DISPATCH_LOST → re-authorize` path assumes the lost attempt did
  nothing; if the worker crossed a side-effect boundary before dying,
  re-dispatch double-executes. Change (record 8 hardening): in
  `reconcileRunningWorkOrder`, when the dispatched capability is
  side-effecting (profile/effect-class), classify the attempt
  OUTCOME_UNKNOWN (terminal, cited evidence: no rendezvous + dead
  dispatcher) instead of re-authorizing; replacement requires explicit
  operator decision or idempotent-keyed reconcile.

## What I am NOT building and why

- **Six new PG tables** (cancelled plan): the branch's durable substrate is
  filesystem + PG advisory lock by reviewed design; PG tables would be a
  second store and a second-writer risk (record 5). The run record and
  ready-set live on the branch's substrate.
- **A new transition-table module for work orders**: the branch already has
  `OrcaStatusLedger` + the 10-state `TRANSITIONS` table with
  evidence-required edges (`policy/orca_status_model.js`). My run record
  carries its own small 7-state run-lifecycle table (runs are not delegation
  units; the 10-state model describes the WorkOrder boundary, not run
  lifecycle) — no duplication, different unit.
- **The JS→Python ExecutionAuthority link**: out of scope per the lane
  brief (pending architectural decision).
- **Modifications to the branch**: read-only for this lane; my delta is new
  files only, placed at the branch's paths (`orca/control-loop/`) so a
  later merge is additive.

## Open questions

1. Merge sequencing: my new files live in my worktree at
   `orca/control-loop/orca_run_record.js` + `orca_ready_set.js` (+ tests);
   they `require('./objective-runtime')` relatively (correct post-merge) —
   tests on the Pig inject the real branch module by absolute path until
   the merge lands. Parent to confirm this merge plan.
2. `tenant_id` on the run record: sourced from the adapter namespace
   (`tenant::<id>`); the loop currently runs single-tenant — the field is
   carried, not yet populated from a multi-tenant source.
3. OUTCOME_UNKNOWN classification (5b) and acceptance-criteria enforcement
   (2a/2b) are specified above but unbuilt; they belong to a follow-up
   hardening pass or the convergence lanes.
