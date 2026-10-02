# SEMANTIC AUDIT — ORCA FINISH Wave 1 / Wave 2 vocabulary

Author: CRITIC-SEMANTIC (independent semantic critic). Date: 2026-09-23 MDT.
Scope: all wave-1 lanes (C1-C7), W2-IMPL-STATE, W2-IMPL-SAFETY, W2-MISSIONS, ORCA-A, ORCA-B, Agent 19, program-level WAVE-LEDGER.
Method: read-only. Every claim cites the lane deliverable and evidence grade: STATIC (source/doc read), TEST (executable test or probe), LIVE (observed on running system).
Stance: falsify, certify nothing. This audit names equivocations; it does not resolve them by fiat. Recommended canonical definitions are in section 4.

No em dashes are used in this document.

## 1. Glossary: contested terms, per-lane usage

### 1.1 RUN

| Lane | Usage | Source |
|---|---|---|
| C1 orca-arch | One bounded coordinator-loop execution. `run-loop.sh` invocation; `RUN_ID = 'orca-run-' + Date.now().toString(36)` (wall-clock, fresh per process start, violates the branch's own identity convention per W2-IMPL-STATE GAP-ANALYSIS). Evidence dirs `run-*/` (orca-run-mu725l0c etc.). Budget scope: "max 2 work orders per run". | ORCA-INVENTORY.md (STATIC) |
| C2 spine-exec | Denies the concept: "Run entity / (agent_id, run_id) worktree ownership — CLAIMED-ONLY: No Run class exists; zero agent_id hits". The unit is the mission. | SPINE-TRACE.md section 7 (STATIC) |
| C3 state-recovery | Generic execution instance; proposes a contract: "`ping_missions` row is the de-facto run record (deterministic id, durable)". "From a RUN_ID alone, after arbitrary process death, reconstruct canonical run identity..." | RUN-RECONSTRUCTION.md sections 1, 4 (STATIC) |
| C6 mechanism-map | Durable run row keyed by UUIDv7 (O-1): "typed status, prompt reference, worktree path, adapter, branch, started/completed timestamps; single writer; every attempt row carries tenant_id and a lease (holder id, expiry, fencing token)". Unit of the run is the attempt. "PING's unit is the mission, not the attempt." | ORCA-MECHANISM-MAP.md record 1 (STATIC) |
| W2-IMPL-STATE | Durable run record `objectives/<objective_id>/runs/<run_id>.json`; `run_id = sha256('run:'+objective_id+':'+run_seq)`; 7-state lifecycle NOT_STARTED/STARTED/SUSPENDED/SUCCEEDED/FAILED/OUTCOME_UNKNOWN/CANCELLED. "My run record carries its own small 7-state run-lifecycle table (runs are not delegation units; the 10-state model describes the WorkOrder boundary, not run lifecycle)". | STATE-LAYER.md, GAP-ANALYSIS.md section 1 (STATIC/TEST: 24/24 tests pass) |
| W2-IMPL-SAFETY | Adopts the same 7-state lifecycle as HS-2: "run_id = sha256('run:'+scope+':'+seq)... OUTCOME_UNKNOWN terminal except CANCEL and never auto-retryable." | GAP-ANALYSIS.md HS-2 (STATIC) |
| ORCA-A | "PING has no Run entity (GAP 1 re-confirmed); ORCA has deterministic run id + 7-state lifecycle (H1g, H5)". Harvest target for PING. | VERDICTS.md record 2, comparison table (TEST) |
| ORCA-B | Run record per orca_run_record.js; checkpoint versions, OUTCOME_UNKNOWN terminal. | CHECKPOINT.md (STATIC) |
| W2-MISSIONS | Incidental: "single-run executions" (execution instance, DRY-RUN context). | FYD-MISSION-CONTRACT.md section 7 (STATIC) |
| Agent 19 | No run concept; the probe replicates MissionScheduler; unit is the mission. | mission_scheduler_under_test.js (STATIC) |

### 1.2 MISSION

| Lane | Usage | Source |
|---|---|---|
| C1 | PING MissionRuntime missions, observed: `MissionRuntime.getStats/getPending/getActive`. The branch observes live PING missions; it does not create them. | ORCA-INVENTORY.md (STATIC) |
| C2 | The durable unit of the live spine: `ping_missions` row; `mission_id = sha256(missionType:event_id or payload)[:16]`; lifecycle created/assigned/running/completed/failed/retry_pending. | SPINE-TRACE.md steps 3-4 (STATIC) |
| C3 | Same as C2; full per-failure analysis over mission rows, leases, retry ladder, DLQ. | STATE-RECOVERY-MAP.md (STATIC) |
| C4 | "The live chain is MISSION -> EVENT -> WORKER.handle -> RESULT -> COMPLETE." Work packets, attempts, capability grants, tool requests, effects, receipts "do not exist as runtime concepts". | AUTHORITY-BOUNDARY-MAP.md (STATIC) |
| C6 | "A PING mission is coordinator-level with no bounded envelope." Mission identity LIVE (deterministic), but the unit is the mission, not the attempt. | ORCA-MECHANISM-MAP.md records 1, 2, 6 (STATIC) |
| C7 | `ping_missions` row projected by `/mc` endpoints; "objective" only exists if the creator wrote `payload.objective`; `retries` counts failures, not claims (G-01). | MISSION-CONTROL-AUDIT.md (STATIC) |
| W2-MISSIONS | A business task with an acceptance contract and its own terminal verdicts: READY / READY_WITH_WARNINGS / NEEDS_OWNER_INPUT / ACQUISITION_BLOCKED / FAILED. Completely different lifecycle from PING missions. | FYD-MISSION-CONTRACT.md section 6 (STATIC) |
| ORCA-A | PING mission identity exists but is byte-deterministic only (H1j falsifies key-order stability). | VERDICTS.md record 1 (TEST) |
| Agent 19 | Faithful replica of the MissionRuntime/MissionScheduler unit. | mission_scheduler_under_test.js (STATIC) |
| WAVE-LEDGER (program) | "Fleet allocations: 4,000 ORCA mechanism-verdict missions" — subagent work assignments, not PING units. | WAVE-LEDGER.md (STATIC) |

### 1.3 WORK ORDER

| Lane | Usage | Source |
|---|---|---|
| C1 | The 14-field delegation envelope: `authorizeWorkOrder` / `issueWorkOrder`; `work_order_id` deterministic (`sha256('workorder:'+taskId)[0:16]` at A5; stable `(objective_id, task_key)`-derived after 6a342dd27). Governed by the 10-state OrcaStatusLedger. | ORCA-INVENTORY.md stages 3-4 (STATIC) |
| C3 | Not in vocabulary (mainline scope); mentions "durable work orders" only when describing the branch's 6a342dd27 (absent on mainline). | STATE-RECOVERY-MAP.md section 2c (STATIC) |
| W2-IMPL-STATE | The branch's delegation unit; `readyWorkOrders` consumes `{work_order_id, state, depends_on}`; treats COMPLETED/FAILED/VERIFICATION_FAILED/BLOCKED/CANCELLED as terminally-completed work-order states. | STATE-LAYER.md, GAP-ANALYSIS.md section 4 (STATIC/TEST) |
| W2-IMPL-SAFETY | 10-state OrcaStatusLedger; TERMINAL = FAILED / VERIFICATION_FAILED / CLOSED. Verified against the vendored copy. | GAP-ANALYSIS.md section 3; program/orca-a/src/orca_status_model.js:45 (STATIC) |
| ORCA-A | Stable work_order_id as idempotency key; `deriveWorkOrderId = sha256('work-order:' + objective_id + ':' + task_key)`, full 64-hex. | VERDICTS.md record 1 (TEST) |
| ORCA-B | Work-order ledger; reconcileRunningWorkOrder's three branches (RENDEZVOUS_RECOVERED / stays RUNNING / DISPATCH_LOST re-authorize). | CHECKPOINT.md (STATIC) |

### 1.4 WORK PACKET

| Lane | Usage | Source |
|---|---|---|
| C2 | The delegable unit of work, ABSENT on mainline: "ORCA cannot name, track, or attribute an execution run. There is nothing to hang attempts, checkpoints, or work packets off of." | GAPS.md GAP 1 (STATIC) |
| C3 | Casual "packet" = mission/job: F10 "Two workers claim the same packet"; RUN-RECONSTRUCTION "rebuild the work packet by hand" (from a dead-letter row); D8 "NOT work-packet state". | STATE-RECOVERY-MAP.md; RUN-RECONSTRUCTION.md section 3 (STATIC) |
| C6 | Precise: "a durable desired-state record: stable ID, kind, dependencies, status, REQUIRED acceptance criteria (rejected at parse time without it), tool/capability allowlist, decomposition lineage, pinned base state; plus a runtime-enforced budget envelope." "A packet is a mission fragment with its own acceptance criteria and budget; a PING mission is coordinator-level with no bounded envelope." | ORCA-MECHANISM-MAP.md record 2 (STATIC) |
| W2-IMPL-STATE | "Per-packet budget envelope" on the work-order record; acceptance-criteria enforcement specified (unbuilt). | GAP-ANALYSIS.md section 2 (STATIC) |
| WAVE-LEDGER | "Budget: up to 5,000 useful bounded packets" — budget units for agent work, unrelated to record 2. | WAVE-LEDGER.md (STATIC) |

### 1.5 ATTEMPT

| Lane | Usage | Source |
|---|---|---|
| C1 | Delegation attempt: max 2 attempts per work order; "attempt recorded BEFORE dispatch"; re-issue same taskId with attempt+1. | ORCA-INVENTORY.md stage 8 (STATIC) |
| C2 | Physical execution, unrepresented: "Retries are a bare counter... There is no attempt record: no attempt id, no per-attempt start/end timestamps." | GAPS.md GAP 3 (STATIC) |
| C6 | "(mission_id, attempt sequence, UUIDv7). Singularity is enforced by a journal unique constraint on the attempt key; the ID names exactly one logical execution." | ORCA-MECHANISM-MAP.md record 6 (STATIC) |
| W2-IMPL-STATE | `deriveAttemptId(workOrderId, attemptNumber)`; attempt-before-dispatch; attempt_history on the work order; "deterministic singularity under the single writer". | GAP-ANALYSIS.md section 3 (STATIC) |
| ORCA-A | "PING retries are a bare counter (GAP 3); ORCA derives stable attempt ids + records outcomes (H1f, H10)." Caveat: file-CAS claimRun "loses updates under true concurrency" (H3b); singularity holds only via the external advisory lock. | VERDICTS.md record 6, caveat (c) (TEST) |
| Agent 19 | `retryPolicy { max_attempts: 3, backoff_delay_ms: 5000 }` — "attempts" as the counter budget, not attempt entities. | mission_scheduler_under_test.js (STATIC) |

### 1.6 OBJECTIVE

| Lane | Usage | Source |
|---|---|---|
| C1 | Durable intent: `deriveObjectiveId` over intent only (namespace, objectiveText, constraints); PLAN decomposes "objective text" into tasks; `PING_DATA_ROOT/objectives/`. | ORCA-INVENTORY.md stage 2, items 5, 9 (STATIC) |
| C7 | An optional schemaless field: "objective ... inside payload ... REAL (creator-dependent) ... it only exists if the creator wrote payload.objective." No dedicated column, no contract. | MISSION-CONTROL-AUDIT.md field 1 (STATIC) |
| W2-IMPL-STATE | The durable intent record; runs hang off it (`objectives/<objective_id>/runs/<run_id>.json`); run_seq counter lives in `objective.json`. | STATE-LAYER.md (STATIC/TEST) |
| ORCA-A | "deriveObjectiveId uses stableStringify (sorted keys, explicit types, rejects non-finite numbers) over {namespace, objective_text, constraints}... deterministic across restarts (H1a-H1e, H1k)." | VERDICTS.md record 1 (TEST) |

### 1.7 TASK

| Lane | Usage | Source |
|---|---|---|
| C1 | PLAN decomposes objective text into tasks "with capability + constraints (data artifact)"; work_order_id derived from taskId/task_key. | ORCA-INVENTORY.md stage 2 (STATIC) |
| C6 | Generic: CrewAI sequential tasks (CREW-01); orka durable task record ("per-attempt identity and outcome in TaskStatus"). | ORCA-MECHANISM-MAP.md records 3, 6 (STATIC) |

### 1.8 RETRY / RECLAIM / REDISPATCH / RESUME / RECONCILE

| Lane | Usage | Source |
|---|---|---|
| C2 | RETRY = `failWithRetry` (fixed 5s backoff, max 3). RECLAIM = lease-expiry return to `created` ("Lease expiry reclaim (reaper)"). | SPINE-TRACE.md sections 4, 7 (STATIC) |
| C3 | Sharpest definitions. RETRIED = "automatically attempted again" via the explicit fail path (`failWithRetry` -> retry_pending -> pickup, consumes `retries` budget, max_attempts=3). RECLAIMED = "moved back to a claimable state" via lease expiry; "does NOT increment retries and does NOT consult max_attempts: the crash-reclaim path has no exhaustion cap." REDISPATCH used loosely for any fresh dispatch ("re-dispatched", "a second dispatch starts the work from scratch"). RESUME = Temporal workflow resume (dormant) or "resume is always from the mission row + lease". RECONCILE: the "repaired reconciler with state lifecycle OPEN / KNOWN_PERMANENT / RESOLVED / REOPENED" is a PHANTOM (zero hits); what exists are three uncoordinated mechanisms (status machine, lease reaper, retry ladder). | STATE-RECOVERY-MAP.md sections 2a, 2b, per-failure notation, F2, F9 (STATIC) |
| C6 | RESUME = agent-driven rehydration (O-6 pattern): "a new worker queries durable run state (its run row, open tasks, last checkpoint) through a bounded read-only interface before acting." Forward-looking (resume with approvals/ledger intact) vs PING replay (backward-looking verification). | ORCA-MECHANISM-MAP.md record 7 (STATIC) |
| W2-IMPL-STATE | RESUME = agent-driven rehydration: "a fresh coordinator reconstructs open work orders without coordinator explanation" (reconcileStartup + durable work orders + attempt history + atomic rendezvous). | GAP-ANALYSIS.md section 5 (STATIC) |
| W2-IMPL-SAFETY | Names the conflation explicitly: "Delegation path: MAX_ATTEMPTS = 2 ... Retry is bounded; exhaustion escalates. Mission layer: reclaim resets to created without consuming the retries budget." RECONCILE also used for UNKNOWN evidence review: "reconciliation only via evidence (reconcileUnknown), never re-submission." | GAP-ANALYSIS.md C3-(2), section 3 (STATIC) |
| ORCA-B | RECONCILE = reconcileStartup()/reconcileRunningWorkOrder() on the branch: three branches (rendezvous present -> RENDEZVOUS_RECOVERED; dispatcher alive -> stays RUNNING, refuse redispatch; dispatcher dead, no result -> DISPATCH_LOST -> re-authorize). | CHECKPOINT.md (STATIC) |

### 1.9 The UNKNOWN vocabulary

| Lane | Usage | Source |
|---|---|---|
| C3 | NO representation on mainline: "There is NO UNKNOWN / OUTCOME_UNKNOWN state. A mission whose worker died or hung sits in running (or assigned) until the lease reaper moves it; the UNKNOWN is implicit, never represented." F8: "OUTCOME_UNKNOWN: NOT represented." | STATE-RECOVERY-MAP.md section 2a, F8 (STATIC) |
| C6 | Terminal state for post-side-effect-boundary failures: "must never be treated as generic retryable failure and must be a unique durable value, never empty or omitted." Boundary = externally observable ack. | ORCA-MECHANISM-MAP.md record 8 (STATIC) |
| W2-IMPL-STATE | OUTCOME_UNKNOWN in the 7-state run lifecycle, "terminal-except-CANCEL, never auto-retryable"; the ready-set query excludes the "unresolved-unknown set". The branch itself has zero OUTCOME_UNKNOWN hits (specified, unbuilt). | GAP-ANALYSIS.md sections 1, 5; STATE-LAYER.md (STATIC/TEST) |
| W2-IMPL-SAFETY | "OUTCOME_UNKNOWN as a unique terminal value; boundary = externally observable ack (never local state position); UNKNOWN writes require last-observed-evidence citation; blind retry of UNKNOWN is a thrown error." | GAP-ANALYSIS.md section 3 (STATIC) |
| W2-MISSIONS | Epistemic label, different plane: Ask FYD answers graded SUPPORTED / DERIVED / INFERRED / UNKNOWN; "unknown is a valid answer"; blocked inputs recorded as UNKNOWN_WITH_EXACT_BLOCKER. | FYD-MISSION-CONTRACT.md sections 2, 4 (STATIC) |

## 2. Contradiction list (term -> lane A meaning -> lane B meaning)

### S-SEM-1. "mission": three live meanings (HIGH)
- C2/C3/C4/C7/Agent 19: mission = PING `ping_missions` row, lifecycle created/assigned/running/completed/failed/retry_pending (STATIC).
- W2-MISSIONS: mission = business task with acceptance contract; terminal verdicts READY / READY_WITH_WARNINGS / NEEDS_OWNER_INPUT / ACQUISITION_BLOCKED / FAILED (STATIC).
- WAVE-LEDGER: mission = subagent work assignment ("4,000 ORCA mechanism-verdict missions", "1,000 logical missions" for ORCA-A probes) (STATIC).
- Equivocation: any sentence like "the mission completed" is true under the PING lifecycle and the W2-MISSIONS verdict set with different meanings, and meaningless under the WAVE-LEDGER allocation sense. The program's most-used noun has three referents.

### S-SEM-2. "packet": casual job vs bounded record vs budget unit (HIGH)
- C3: "packet" = mission/job: "Two workers claim the same packet" (F10), "rebuild the work packet by hand" from a dead letter, "NOT work-packet state" (D8) (STATIC).
- C6: "work packet" = bounded durable desired-state record: REQUIRED acceptance criteria, budget envelope, capability allowlist, dependencies, pinned base state (STATIC).
- WAVE-LEDGER: "packets" = budget units: "up to 5,000 useful bounded packets" (STATIC).
- Equivocation: a reader merging C3 and C6 would believe C3 verified claim-safety for bounded work packets; C3 verified it for missions. "Packet" alone is overloaded three ways.

### S-SEM-3. "run": wall-clock process vs mission row vs durable record (HIGH)
- C1: run = wall-clock loop execution; `RUN_ID = 'orca-run-' + Date.now().toString(36)`; "max 2 work orders per run" (STATIC).
- C3: run = mission row by contract proposal: "`ping_missions` row is the de-facto run record" (STATIC).
- C6/W2-IMPL-STATE/ORCA-A/ORCA-B: run = durable run record with 7-state lifecycle, hangs off an objective, runs are not delegation units (STATIC/TEST).
- Equivocation: C1's "per run" budget scope is unstable across the old (wall-clock) and new (durable record) definitions. C3's "run record" (any durable execution record) vs C6's "run record" (run-scoped record with attempt identity, lease, fencing) are different claims; C6's "Run identity is PHANTOM in PING" and C3's "mission row is the de-facto run record" are both true under their own definitions and contradictory unqualified.

### S-SEM-4. "objective": durable intent vs optional payload field (MEDIUM)
- C1/W2-IMPL-STATE/ORCA-A: objective = durable intent record with its own identity (`deriveObjectiveId` over canonical intent) (STATIC/TEST).
- C7: objective = optional schemaless `payload.objective` on a PING mission, "REAL (creator-dependent)", no contract (STATIC).
- Equivocation: "the objective is stored on the mission" is true for C7's payload convention and false for C1's architecture, where the objective is the parent of work orders and runs.

### S-SEM-5. RETRY vs RECLAIM: same visible outcome, different mechanisms and budgets (HIGH)
- C3/W2-IMPL-SAFETY: RETRY = bounded, explicit-fail-path re-execution consuming the `retries`/`attempt` budget (mission layer max_attempts=3; delegation MAX_ATTEMPTS=2). RECLAIM = lease-expiry return to claimable state consuming nothing, with NO retry cap ("the crash-reclaim path has no exhaustion cap"; "reclaim resets to created without consuming the retries budget") (STATIC).
- Equivocation: "the mission was retried after the crash" is false under the retry definition; it was reclaimed. Any "retry cap" sentence that does not name the path (fail-path vs reclaim-path) is ambiguous: the cap exists on one and not the other. W2-IMPL-SAFETY's C3-(2) fold-in already names this; the glossary rule is: never use "retry" for the lease-reclaim path.

### S-SEM-6. RESUME: three meanings (MEDIUM)
- C3: resume = Temporal workflow resume (dormant) or row+lease continuation (STATIC).
- C6/W2-IMPL-STATE: resume = agent-driven rehydration from a versioned checkpoint, forward-looking (STATIC).
- W2-IMPL-SAFETY: resume = single-writer CAS after interrupt (approval binding) (STATIC).
- Equivocation: "the mission resumed" can mean row+lease reclaim (no snapshot), checkpoint rehydration (snapshot), or interrupt CAS. Row+lease continuation is reclaim, not resume.

### S-SEM-7. RECONCILE: startup classification vs UNKNOWN evidence review vs phantom component (MEDIUM)
- C3: the OPEN/KNOWN_PERMANENT/RESOLVED/REOPENED reconciler is a PHANTOM (zero hits repo-wide) (STATIC).
- ORCA-B: reconcile = reconcileStartup()/reconcileRunningWorkOrder() branch logic on the A5 branch (STATIC).
- W2-IMPL-SAFETY: reconcile = evidence-cited UNKNOWN review (`reconcileUnknown`), never re-submission (STATIC).
- Equivocation: "reconciliation" spans startup state classification, UNKNOWN evidence review, and a nonexistent component. Never cite the phantom lifecycle states.

### S-SEM-8. "deterministic identity": over bytes vs over logical content vs singularity (HIGH)
- C1/C2/WAVE-LEDGER prior facts: "deterministic" mission/work-order identity is LIVE (STATIC).
- ORCA-A H1j (TEST): PING's payload hash is NOT key-order stable: same logical payload with different key order mints different mission ids. "Deterministic" is true over byte representation, false over logical content. Fix shape proven: stableStringify (H1k).
- W2-IMPL-STATE: "deterministic singularity under the single writer" conflates derivation purity (same input -> same id) with concurrency uniqueness (one id = one live execution). ORCA-A caveat (c) (TEST, H3b): file-CAS claimRun loses updates under true concurrency; singularity holds only via the external advisory-lock fence, not via determinism.
- C4/C5: identity sovereignty is violated/bypassed on the live path (inline crypto at three sites; competing IdentityAuthority implementations) (STATIC).
- Equivocation: "deterministic identity" without a stated domain (bytes / canonical form / logical intent), and "deterministic" used to imply "unique under concurrency", which it does not. The branch's A5-era formula `sha256('workorder:'+taskId)[0:16]` vs the post-6a342dd27 `sha256('work-order:'+objective_id+':'+task_key)` full 64-hex is also a stale-formula hazard: docs quoting the old form are outdated (ORCA-A VERDICTS confirms the new form, TEST).

### S-SEM-9. OUTCOME_UNKNOWN: absent vs terminal vs epistemic label (HIGH)
- C3: no representation anywhere on mainline; ambiguity is implicit (STATIC).
- C6/W2-IMPL-STATE/W2-IMPL-SAFETY/ORCA-B: OUTCOME_UNKNOWN = terminal execution-outcome state: post-side-effect-boundary ambiguity, evidence-cited, never auto-retryable, reconciled only via evidence (STATIC/TEST).
- W2-MISSIONS: UNKNOWN = epistemic claim classification ("unknown is a valid answer" for Ask FYD; UNKNOWN_WITH_EXACT_BLOCKER for blocked inputs) (STATIC).
- Equivocation: "the outcome is unknown" in execution state vs "the answer is unknown" in claim grading are different concepts sharing a word. Any program-level sentence "the system represents unknown outcomes" is true only for the new lanes' run lifecycle, false for mainline mission rows. "UNKNOWN" without a substrate qualifier is ambiguous.

### S-SEM-10 (tenant probe, CRITIC-SECURITY follow-on). tenant_id: carried label vs isolation mechanism (MEDIUM)
- Evidence (STATIC): `orca_run_record.js:143-144` sets `tenant_id: opts.tenantId || null`; the code comment says "Tenant scoping (O-1 hardening): sourced from the adapter namespace (tenant::<id>); carried on every durable row." Nothing in the module sources it; there are zero production callers (W2-IMPL-SAFETY caveat (b): "zero production callers: shape proven, wiring unwitnessed"). No function filters, partitions, or CAS-keys on tenant_id; the `objectives/<id>/` tree is not tenant-scoped (W2-IMPL-STATE GAP-ANALYSIS section 1 admits this).
- The lane's own docs are honest: GAP-ANALYSIS open question 2 states "the loop currently runs single-tenant — the field is carried, not yet populated from a multi-tenant source." The code comment overstates ("sourced" — nothing sources it).
- Verdict: the field's presence does not claim multi-tenancy, and the lane does not claim "multi-tenant-ready". The dishonesty risk is inferential: a future reader may read the field as isolation. This is the same equivocation class as S-SEM-8: a schema label is not a mechanism. Standing rule: "tenant-scoped" requires (a) queries filtering on tenant_id, (b) the tenant namespace embedded in the derivation chain, and (c) tested isolation. The field alone satisfies none.
- Recommended: change the code comment to "carried, unenforced; single-tenant today; population and isolation enforcement are future work."

## 3. Factual errors and misquotes caught in passing

These are semantic confusions with a verifiable true/false, not just drift.

1. ORCA-B CHECKPOINT misquotes the work-order ledger terminal set as "TERMINAL = COMPLETED/FAILED/VERIFICATION_FAILED/BLOCKED". The vendored source (`program/orca-a/src/orca_status_model.js:45`) reads `TERMINAL = ['FAILED', 'VERIFICATION_FAILED', 'CLOSED']`; the 10 states are PLANNED/AUTHORIZED/QUEUED/RUNNING/BLOCKED/FAILED/EVIDENCE_PENDING/VERIFICATION_FAILED/VERIFIED/CLOSED. There is no COMPLETED state in that ledger; "completed" is PING-mission vocabulary leaking into the work-order ledger. W2-IMPL-SAFETY's quote (FAILED/VERIFICATION_FAILED/CLOSED) matches the source. (STATIC)
2. W2-IMPL-STATE's `readyWorkOrders` treats COMPLETED/FAILED/VERIFICATION_FAILED/BLOCKED/CANCELLED as terminal work-order `state` values. This is the work-order JSON `state` vocabulary, which collides with the OrcaStatusLedger vocabulary (VERIFIED/CLOSED, no COMPLETED). Unverified whether these are the same field; flag as a vocabulary collision to resolve before merge. (STATIC)
3. C1's A5-era formula `work_order_id = sha256('workorder:'+taskId)[0:16]` is superseded by the post-6a342dd27 form `sha256('work-order:'+objective_id+':'+task_key)` full 64-hex (ORCA-A VERDICTS, TEST). Any doc quoting the old formula is stale.

## 4. Recommended canonical definitions

Use these program-wide. Unqualified use of the banned forms is a semantic defect.

- RUN: one coordinator-loop execution instance with a durable run record keyed by `sha256('run:'+scope+':'+seq)`; 7-state lifecycle NOT_STARTED/STARTED/SUSPENDED/SUCCEEDED/FAILED/OUTCOME_UNKNOWN/CANCELLED; runs hang off objectives; runs are not delegation units. "Run" for a wall-clock process invocation is banned; say "process invocation".
- MISSION: a PING-spine durable unit (`ping_missions` row), id derived from the canonical mission key; lifecycle created/assigned/running/completed/failed/retry_pending. Subagent work assignments are "verdict missions" or "probe tasks", never bare "missions". Business tasks with acceptance contracts are "business missions" (W2-MISSIONS lifecycle), never bare "missions".
- WORK ORDER: the ORCA delegation envelope (14 fields; `work_order_id = sha256('work-order:'+objective_id+':'+task_key)`); governed by the 10-state OrcaStatusLedger (TERMINAL = FAILED/VERIFICATION_FAILED/CLOSED).
- WORK PACKET: the bounded-work record per C6 record 2: stable ID, dependencies, REQUIRED acceptance criteria, capability allowlist, decomposition lineage, pinned base state, runtime-enforced budget envelope. Bare "packet" is banned; C3's casual "packet" must be rewritten to "mission" or "job".
- ATTEMPT: one physical execution of a work order or mission; `attempt_id = parent_id + '-attempt-' + n`; per-attempt records. "Attempt" is not the retry counter.
- OBJECTIVE: the durable intent record (`deriveObjectiveId` over canonical intent). The C7 `payload.objective` field is "objective text" or "payload objective", never bare "objective".
- TASK: the PLAN-stage decomposition unit (objective text -> tasks with capability + constraints); work orders are issued per task key. Do not use "task" for missions or runs.
- RETRY: bounded re-execution on the explicit fail path, consuming the attempt/retries budget, subject to max_attempts. Never use for the lease path.
- RECLAIM: lease-expiry-driven return to claimable state; consumes no budget; unbounded unless separately gated. Always name the path: "lease-reclaim", never "retry".
- REDISPATCH: issuing a fresh dispatch for the same logical work; mechanism-neutral, so always qualify: "retry-redispatch" or "reclaim-redispatch".
- RESUME: agent-driven rehydration from a versioned checkpoint (forward). Row+lease continuation is reclaim, not resume.
- RECONCILE: (a) startup classification of durable state (reconcileStartup); (b) evidence-cited UNKNOWN review (reconcileUnknown), never re-submission. The OPEN/KNOWN_PERMANENT/RESOLVED/REOPENED lifecycle is phantom; never cite it.
- DETERMINISTIC identity: the word "deterministic" is banned in identity claims unless the domain is stated: deterministic-over-bytes, deterministic-over-canonical-form, or deterministic-over-logical-intent. Singularity (one id = one live execution) is a separate property requiring a single-writer fence or unique constraint; determinism never implies it.
- UNKNOWN: OUTCOME_UNKNOWN = terminal execution-outcome state for post-side-effect-boundary ambiguity: evidence-cited, never auto-retryable, reconciled only via evidence. The epistemic label is "epistemically UNKNOWN" (claim grading), never bare UNKNOWN in execution contexts. "The system represents unknown outcomes" must name the substrate (run lifecycle) because mainline mission rows do not.
- TENANT: `tenant_id` on a record is a carried, unenforced label. "Tenant-scoped" requires tenant-filtered queries, tenant embedded in the derivation chain, and tested isolation. Field presence alone claims nothing about isolation.

## 5. Open questions for the follow-on queue

1. Re-check ORCA-B's verdicts file when it lands: does the terminal-set misquote (section 3.1) propagate into verdict logic?
2. Resolve the work-order `state` vocabulary collision (section 3.2) before the state/safety merge.
3. When ORCA-C/D, CHAOS-B/C, MEM-B artifacts land, audit each for unqualified "run", "mission", "packet" on arrival.
4. The stale-formula hazard (section 3.3): sweep wave-1/wave-2 docs for the A5-era `sha256('workorder:'+taskId)[0:16]` form.
