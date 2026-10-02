# OBSERVABILITY AND METRICS - autonomous missions - 2026-09-23 (Lane D, Phase 4)

Read-only phase. No infrastructure built, launched, patched, or written beyond this file.
No secrets in this file. All claims grounded in `probe-001/` real records and
`BASELINE-FREEZE-2026-09-23.md`. No invented telemetry. No dashboard built (per task scope:
prove the trace model first).

Trace substrate used: `~/workspace/autonomous-missions/probe-001/` -
`mission.json`, `task-1/task.json`, `task-1/attempt-1.json`, `task-1/attempt-2.json`,
append-only `audit.jsonl`, output artifacts `chunk-1.md` / `chunk-2.md` / `chunk-3.md`.

## 1. TRACE MODEL PROOF

Required trace chain:
MISSION → TASK → ATTEMPT → MEMORY READS → AUTHORIZATION → TOOL/MCP CALL →
ORACLE EXECUTION → RESULT → EFFECT RECEIPT → MEMORY WRITE → NEXT TASK

Verdict per hop, grounded in the exact record or field that proves it, or in the
named gap where it is absent.

| # | Hop | Verdict | Evidence / gap |
|---|---|---------|----------------|
| 1 | MISSION | PRESENT | `mission.json`: `mission_id: "probe-001"`, `goal`, `authority: "coordinator synthetic probe; no production effects authorized"`, `budget: {"max_attempts": 3, "deadline_utc": "2026-09-24T02:00:00Z"}`, `stop_conditions: ["all chunks verified", "attempts exhausted", "durable state ambiguous or corrupt"]`, `status: "running"`, `created_utc: "2026-09-23T17:51:30Z"`. Audit corroboration: `{"ts":"2026-09-23T17:51:30Z","event":"mission_created","mission":"probe-001"}`. |
| 2 | TASK | PRESENT | `task-1/task.json`: `task_id: "probe-001/task-1"`, `mission_id: "probe-001"`, `objective` (verbatim analysis spec), `claimed_by_attempt: "probe-001/task-1/attempt-1"`, `completed_by_attempt: "probe-001/task-1/attempt-2"`, `completed_utc: "2026-09-23T17:52:12Z"`, `write_scope: ["~/workspace/autonomous-missions/probe-001/"]`, `prohibited: ["any path outside probe-001", "network access", "production planes", "secrets"]`, `status: "completed"`. Audit corroboration: `task_claimed` and `task_completed` events with matching task/attempt ids. |
| 3 | ATTEMPT | PRESENT | `task-1/attempt-1.json`: `attempt_id`, `worker_role: "IMPLEMENTER"`, `status: "running"` (never closed - the killed attempt), `steps_completed: ["chunk-1","chunk-2"]`, `checkpoints: [{"chunk":"chunk-1","ts":"...T17:51:44Z"},{"chunk":"chunk-2","ts":"...T17:51:49Z"}]`, `started_utc`. `task-1/attempt-2.json`: same schema plus `found`, `conclusion_of_state_found`, `conclusion_of_remains`, `status: "completed"`, `completed_utc`, `steps_completed` (4 reconstruction/verification steps). Audit: `attempt_started` for attempt-2; attempt-1's kill recorded as `worker_killed_mid_attempt` (see gap note below: no `attempt_closed` event exists for attempt-1; its terminal state is only reconciled inside attempt-2.json's `found.attempt-1_status: "running (killed, never closed)"`). |
| 4 | MEMORY READS | **MISSING** | No record anywhere of what either worker read before acting. Attempt-2.json's `steps_completed[0]` says it reconstructed from "mission.json, task.json, attempt-1.json, audit.jsonl, chunk-1.md, chunk-2.md" and its `conclusion_of_state_found` cites verifying chunk-1 counts against the source file header - but these are free-text claims, not structured read records. There is no way to audit *what evidence a worker's decisions rested on* without them. Minimal record needed: `memory_read` event: `{ts, mission, task, attempt, source: <path|collection|table>, selector: <query|file|range>, result_hash, result_summary}`. Without it, STALE_ASSUMPTIONS_INVALIDATED and UNKNOWN_OUTCOME reconciliation have no provenance. |
| 5 | AUTHORIZATION | **MISSING** (static grant only) | `mission.json` carries one static grant (`authority: "coordinator synthetic probe; no production effects authorized"`) and task.json carries `write_scope` + `prohibited`. That is a grant, not an authorization *record*. There is no per-action or per-attempt authorization event: no record that attempt-1 was authorized to claim task-1, no record that attempt-2 was authorized to reconcile a killed attempt, no record that chunk writes fell inside `write_scope`. Minimal record needed: `authorization` event: `{ts, mission, task, attempt, action_type: <claim|write|reconcile|publish|spend>, target, authority_basis: <mission.json authority clause | standing-law rule | human grant>, granted_by: <coordinator|mission-authority|human>}`. The consequential-gate list in STANDING-LAW-2026-09-23.md is unenforceable without this: a kill-switch or audit cannot distinguish an authorized write from a rogue one. |
| 6 | TOOL/MCP CALL | **MISSING** (descriptive only) | `steps_completed` lists human-readable step descriptions ("wrote chunk-3.md", "verified chunk-1.md..."), and `checkpoints` mark progress, but no structured record names the tool used, its arguments, or its result. The probe's actual effects (3 file writes, mtime evidence) are only observable via filesystem side channels, not the trace. Minimal record needed: `tool_call` event: `{ts, mission, task, attempt, tool: <name>, args_hash, args_summary, result_ref: <receipt id|artifact path|error class>}`. This is the record that makes BLIND_RETRIES and WRITE_COLLISIONS_PREVENTED measurable rather than inferable. |
| 7 | ORACLE EXECUTION | **MISSING (N/A for this substrate)** | The trace model assumes a deterministic Oracle execution hop (the ORACLE plane in BASELINE-FREEZE: `ping-gateway` on `ping-core-01`, live DB, live bridge). Probe-001 ran file-local in the sandbox: no Oracle run, no run id, no engine. This hop is the declared integration point where the file convention meets the live PING substrate - explicitly unproven in probe scope ("not proven: the same through ping_events at scale"). Minimal record needed when wired: `oracle_execution`: `{ts, attempt, oracle_run_id, engine: <gateway route|bridge|worker>, input_hash, output_hash, determinism_class}`. |
| 8 | RESULT | PRESENT | Two layers agree. Audit: `{"ts":"2026-09-23T17:52:12Z","event":"task_completed","attempt":"attempt-2"}`. Record: task.json `status: "completed"`, `completed_by_attempt: "probe-001/task-1/attempt-2"`, `completed_utc` matches audit ts exactly. Attempt-2.json `status: "completed"` corroborates. |
| 9 | EFFECT RECEIPT | **MISSING** | The trace has no receipt answering WHICH MISSION / TASK / ATTEMPT / AGENT ROLE / CAPABILITY / TARGET / AUTHORITY / RESULT for any effect. The three chunk writes are *the* effects of this mission, and nothing in the trace binds `chunk-3.md` (bytes on disk, mtime 17:52:18) to attempt-2's authority, capability, and authorization. Attribution currently relies on directory colocation + mtimes, which is convention, not evidence. Minimal record: see section 2 (canonical effect-receipt format). Every counted metric in section 3 that involves an effect (TASKS_AUTONOMOUSLY_CLOSED, PATCHES_LANDED, POST_LAND_FAILURES, BLIND_RETRIES) is only hand-waving until receipts exist. |
| 10 | MEMORY WRITE | PARTIAL | The writes happened and are observable (chunk files exist, attempt-2.json written, task.json status flipped to completed at 17:52:12Z), and audit.jsonl records checkpoints that imply writes - but there is no structured `memory_write` event binding {attempt → artifact → hash → supersedes}. Attempt-2.json's `steps_completed` narrates the writes; the audit log does not record them. Minimal record needed: `memory_write`: `{ts, mission, task, attempt, artifact: <path|key>, content_hash, supersedes: <prior artifact version|null>, effect_receipt_id}`. |
| 11 | NEXT TASK | PRESENT (terminal form) | Probe-001 had one task; the NEXT TASK hop is satisfied by terminal evaluation: mission stop_conditions ("all chunks verified" / "attempts exhausted" / "durable state ambiguous or corrupt") are all checkable against the trace, and attempt-2.json's `conclusion_of_remains` records the explicit "no remains" determination. **Honest gap within this hop:** `mission.json` `status` is still `"running"` and no `mission_completed` audit event exists - attempt-2 closed the task but nobody closed the mission. The MISSION closure hop is unproven even in the minimal probe. Minimal addition: `mission_completed` audit event + mission.json status flip by the attempt that determines the terminal condition, with the determining stop_condition named. |

Net: 5 of 11 hops fully present, 1 partial, 5 missing. The probe proved the
*reconstruction* invariant (MISSION→TASK→ATTEMPT→checkpoint→RESULT is sufficient
for a cold worker to continue), but it did not prove the *attribution* invariant
(no record answers who was authorized to do what to which target with what result).
Phase 5 must add exactly the five missing records (memory_read, authorization,
tool_call, effect_receipt, memory_write) plus mission closure - six small event
types, no new infrastructure, all appendable to the same audit.jsonl convention.

Two positive findings worth preserving:
- No blind retry was provable: chunk-1.md mtime 17:51:44 and chunk-2.md mtime
  17:51:49 were untouched by attempt-2, and attempt-2.json records the
  verification ("counts match the source file header-verified count of 262 lines")
  before declaring chunk-3 the only remain. That is the behavior the BLIND_RETRIES
  metric must reward.
- Dangling attempt was reconciled, not assumed: attempt-1.json stays `status:
  "running"` forever; attempt-2.json names it `"running (killed, never closed)"`
  with corroborating audit evidence. The trace never rewrites history - the
  reconciliation is additive. That is the pattern UNKNOWN_OUTCOMES must follow.

## 2. ATTRIBUTION RECEIPT (canonical effect-receipt format)

Every effect a worker produces gets one receipt, appended to audit.jsonl (or an
`effects.jsonl` sibling - same append-only convention). One receipt per effect;
one effect per receipt.

```
{
  "receipt_id": "eff-<mission>-<task>-<attempt>-<seq>",
  "ts": "<UTC ISO>",
  "mission": "<mission_id>",
  "task": "<mission_id>/<task_id>",
  "attempt": "<mission_id>/<task_id>/attempt-<n>",
  "agent_role": "<IMPLEMENTER|REVIEWER|COORDINATOR|OBSERVER>",
  "capability": "<file-write|code-patch|message-send|observation-emit|query|external-fetch>",
  "target": "<path|URL|record id - the thing acted upon>",
  "authority": "<mission.json authority clause | standing-law rule id | human grant id>",
  "authorization_ref": "<id of the authorization event that permitted this effect>",
  "result": "<completed|failed|blocked|superseded>",
  "result_detail": "<hash|error class|blocker>",
  "supersedes": "<prior receipt_id or null>"
}
```

Filled example from probe-001 (reconstructed - the receipt was NOT recorded at
the time; this is what should have been):

```json
{
  "receipt_id": "eff-probe-001-task-1-attempt-2-001",
  "ts": "2026-09-23T17:52:18Z",
  "mission": "probe-001",
  "task": "probe-001/task-1",
  "attempt": "probe-001/task-1/attempt-2",
  "agent_role": "IMPLEMENTER",
  "capability": "file-write",
  "target": "~/workspace/autonomous-missions/probe-001/chunk-3.md",
  "authority": "mission.json authority: coordinator synthetic probe",
  "authorization_ref": "auth-probe-001-task-1-attempt-2-write",
  "result": "completed",
  "result_detail": "chunk-3.md written, non-empty, verified present",
  "supersedes": null
}
```

Fields explained: WHICH MISSION (`mission`), WHICH TASK (`task`), WHICH ATTEMPT
(`attempt`), WHICH AGENT ROLE (`agent_role`), WHICH CAPABILITY (`capability`),
WHICH TARGET (`target`), UNDER WHAT AUTHORITY (`authority` + `authorization_ref`),
WITH WHAT RESULT (`result` + `result_detail`). `supersedes` chains replacements
so a rewritten artifact does not create a duplicate-effect ambiguity (this is the
record that makes DUPLICATES_SUPPRESSED and re-land counting exact).

## 3. METRICS (exact computation from the trace)

Scope: one mission directory = one audit.jsonl + mission.json + task-*/task.json +
task-*/attempt-*.json + effects receipts. Aggregations sum across mission
directories for a time window. Every metric names its source records; none are
estimated.

- **MISSIONS_STARTED**: count of audit events `event="mission_created"` (one per
  mission dir). Probe-001 contributes 1.
- **MISSIONS_COMPLETED**: count of mission.json files with `status="completed"`
  (or equivalently, audit events `event="mission_completed"` once the section-1
  gap is closed). Probe-001 contributes 0 - its mission.json still says
  `"running"` despite the task completing. This is correct: the metric measures
  mission closure, and the probe never closed the mission.
- **TASKS_AUTONOMOUSLY_CLOSED**: count of task.json files with
  `status="completed"` AND `completed_by_attempt` set AND no audit event with
  `actor="human"` closing that task between its claim and completion.
  Probe-001 contributes 1 (task-1, completed by attempt-2).
- **TASKS_AUTONOMOUSLY_CREATED**: count of task.json files whose `created_by`
  names an attempt id (worker-created) rather than the coordinator or a human.
  Probe-001 contributes 0 - task-1 was coordinator-created.
- **WORKER_REPLACEMENTS**: count of audit events `event="attempt_started"` for a
  task where a prior attempt for the same task has no `attempt_closed` event
  (i.e., a new attempt starts while the previous one is unresolved). Probe-001
  contributes 1 (attempt-2 started while attempt-1 was still `"running"`).
- **SUCCESSFUL_RESUMES**: count of replacement attempts (per WORKER_REPLACEMENTS)
  that (a) reached `status="completed"`, (b) recorded at least one consumed prior
  checkpoint in attempt.json (`found.checkpointed` / `consumed_checkpoints`
  non-empty), and (c) did not rewrite an artifact covered by a consumed
  checkpoint (verifiable via chunk mtimes / content hashes). Probe-001
  contributes 1.
- **UNKNOWN_OUTCOMES**: count of attempt.json files with terminal-ambiguous
  state: `status` not in `{"completed","failed","killed"}` AND no reconciling
  record exists (no later attempt.json names it in `found`/`reconciliation_of`,
  and no `attempt_closed` audit event). Probe-001 contributes 0 - attempt-1's
  `"running"` is reconciled inside attempt-2.json. (Had attempt-2 never run,
  attempt-1 would count as 1.)
- **RECONCILIATIONS**: count of attempt.json files that name a prior attempt in
  `found` / `reconciliation_of` (each such attempt performed one reconciliation).
  Probe-001 contributes 1 (attempt-2 reconciled attempt-1).
- **BLIND_RETRIES** (target: zero): count of events where an attempt acted on an
  artifact/step covered by a prior checkpoint or effect receipt WITHOUT a
  verification record first. Exact test: for each write (filesystem mtime/hash
  change, or `memory_write` event once present) on a path that appears in a
  prior attempt's `checkpoints`/`steps_completed` for the same task, check for a
  verification record (a `memory_read` of that artifact, or an explicit
  verification note in the attempt.json `found` block) preceding the write.
  Write without preceding verification = 1 blind retry. Re-emitting an effect
  that already has an effect receipt with `result="completed"` (double-effect,
  e.g., re-sending a message) counts the same way once receipts exist.
  Probe-001 contributes 0 (chunk-1/chunk-2 mtimes untouched; attempt-2 verified
  counts before proceeding).
- **WRITE_COLLISIONS_PREVENTED**: count of claim/lock contention events where two
  attempts raced and the loser yielded: audit shows `task_claimed` (or
  `lock_acquire`) for the same task by two attempts where exactly one claim held
  and the other recorded a back-off (a `claim_denied` / `yielded_to` event or an
  attempt.json noting the observed prior claim). Probe-001 contributes 0 -
  no contention occurred. Requires the `authorization`/`task_claimed` events to
  carry the claim holder; currently only inferable.
- **HUMAN_INTERRUPTS**: count of audit events with `actor="human"` (Nolan
  interventions: stops, redirects, authority grants beyond the standing grant,
  kill-switch pulls). Coordinator kills of blocked workers are NOT interrupts
  (the kill of worker A was coordinator action under the probe design).
  Probe-001 contributes 0.
- **UNNECESSARY_ESCALATIONS**: count of escalation/interrupt events where the
  post-hoc trace shows the worker could have proceeded from durable state:
  an `escalation` or `actor="human"` event E on task T, followed by T's
  completion by an attempt with no new human authority recorded between E and
  completion, AND the completing attempt's `found` block cites only records
  that existed before E. Probe-001 contributes 0 (no escalations).
- **HARVEST_CANDIDATES**: count of `harvest_candidate` records emitted by
  attempts (candidate id, source, verdict class). Probe-001 contributes 0 as a
  formal count - chunk-2 lists five ADAPT mechanisms, but they were never
  recorded as harvest candidates in the trace. Honest note: harvest accounting
  currently lives in lane artifacts (e.g., mechanisms.jsonl), not in the mission
  trace; wiring candidate emission into the attempt schema closes this.
- **HARVESTS_ACCEPTED** / **HARVESTS_REJECTED**: counts of harvest decision
  events with `verdict="accepted"` / `verdict="rejected"`, each referencing the
  candidate id. Probe-001 contributes 0/0.
- **DUPLICATES_SUPPRESSED**: count of dedupe events where a candidate or effect
  was suppressed because an identical-or-superseding record already existed
  (each references the surviving record id). Probe-001 contributes 0.
- **STALE_ASSUMPTIONS_INVALIDATED**: count of `assumption_check` records with
  `verdict="invalidated"` - an attempt re-verified a claim from an earlier
  record (memory read, prior checkpoint, external source) and found it false.
  Record: `{attempt, assumption, source_record, expected, observed,
  verdict}`. Probe-001 contributes 0 invalidations - attempt-2 performed one
  assumption check (chunk-1 counts vs source header: 262 lines) and it
  CONFIRMED. Checks that confirm are not counted; only invalidations.
- **PATCHES_LANDED**: count of effect receipts with `capability="code-patch"`
  and `result="completed"` (each receipt = one landed patch). Probe-001
  contributes 0.
- **POST_LAND_FAILURES**: count of failure events that reference a landed
  patch's `receipt_id` (a later attempt or monitor records the patch as the
  cause). Probe-001 contributes 0.

### The killer metric: USEFUL_TASKS_COMPLETED PER HUMAN INTERRUPTION

"useful" is operational, not subjective. A task counts as USEFUL iff ALL hold:

1. It was autonomously closed: counted in TASKS_AUTONOMOUSLY_CLOSED.
2. It produced at least one effect receipt with `result="completed"` on an
   authorized target (it did real, attributable work - not just status churn).
3. None of its effect receipts has a POST_LAND_FAILURE attached within the
   observation window (default 7 days) - the work did not break something.
4. Its objective was not later invalidated: no `assumption_check` with
   `verdict="invalidated"` names the task's objective or its key artifacts
   within the window.

Metric: `U / H` where U = useful tasks closed in the window, H = human
interrupts in the same window. Reporting rule: if H = 0, do NOT divide -
report "U useful tasks closed, 0 human interrupts (autonomy ceiling unknown;
ratio unbounded)". A ratio that trends up while U grows is the whole program
working: more useful autonomous work per unit of Nolan's attention. A ratio
that trends up because H collapsed to zero while U also collapsed is failure -
always report U and H alongside the ratio, never the ratio alone. Silent-when-
healthy reporting (standing law) means this number appears in the brief only
when it moves materially or when H > 0.

## 4. DAILY BRIEF AS PROJECTION

The brief is a query over the trace, not a job that runs. It answers, from the
records in section 1, exactly these questions:

- What became experiment-ready since the last brief? (HARVESTS_ACCEPTED with no
  open blocker; harvest candidates promoted to READY TO EXPERIMENT)
- What changed that matters? (mission/task status transitions, landed patches,
  reconciliations of killed workers - IMPORTANT CHANGES)
- What was tried and rejected, and why? (HARVESTS_REJECTED with reason;
  MECHANISMS REJECTED)
- What new gaps in the CRX/FYD substrate did autonomous work surface?
  (CRX/FYD GAPS DISCOVERED - assumption invalidations, unknown outcomes that
  revealed missing invariants)
- What did the workers do on their own? (TASKS_AUTONOMOUSLY_CREATED/CLOSED,
  SUCCESSFUL_RESUMES, MISSIONS_COMPLETED)
- What is stuck waiting on authority? (BLOCKERS REQUIRING AUTHORITY -
  unresolved blockers, consequential-gate items per standing law,
  attempts blocked on human grants)
- Is the machine healthy? (PIPELINE HEALTH - the counters: UNKNOWN_OUTCOMES,
  BLIND_RETRIES, WRITE_COLLISIONS_PREVENTED, POST_LAND_FAILURES, RECONCILIATIONS
  vs WORKER_REPLACEMENTS)

Maximum-signal content list (in brief order):

1. HARVESTED / READY TO EXPERIMENT
2. IMPORTANT CHANGES
3. MECHANISMS REJECTED
4. CRX/FYD GAPS DISCOVERED
5. AUTONOMOUS TASKS CREATED / CLOSED
6. BLOCKERS REQUIRING AUTHORITY
7. PIPELINE HEALTH

Silent-when-healthy: the brief is EMPTY iff ALL hold for the window since the
last brief:

- zero new HARVEST_CANDIDATES and zero harvest verdicts (accepted/rejected);
- zero mission/task status transitions (no started/completed/failed);
- zero new CRX/FYD gaps and zero STALE_ASSUMPTIONS_INVALIDATED;
- zero tasks created or closed;
- zero unresolved blockers and zero new authority requests;
- pipeline health clean: UNKNOWN_OUTCOMES = 0, BLIND_RETRIES = 0,
  POST_LAND_FAILURES = 0, UNNECESSARY_ESCALATIONS = 0.

Operationally: the brief is the delta of the audit log since the last brief's
watermark; an empty delta is an empty brief - no prose, no "all quiet" filler.
One critical filter, from the baseline: the PIG plane's `event-to-mission-bridge`
emits a micro-mission every ~5 seconds (457+ rows, all `completed`). Those are
system noise, not autonomous work. "IMPORTANT CHANGES" counts only
non-bridge events: missions whose `created_by` is not `event-to-mission-bridge`
(or, in file-trace terms, missions with a human/coordinator-authored goal and
non-synthetic task content). Without this filter the brief can never be silent
and the metric is meaningless.

## 5. PERSISTENCE DISCIPLINE

Lifecycle, in order, no exceptions: durable mission → bounded attempt →
checkpoint → release resources → next attempt. An attempt holds the task only
while its lease is live; when it ends (complete, fail, kill, lease expiry) it
releases, and the next attempt claims from durable state. Nothing about an
in-flight attempt may exist only in conversation.

Every attempt carries, in its attempt.json (or claim record), all six:

- **budget**: `{max_steps, max_tool_calls, max_wall_clock, deadline_utc}` -
  hard stop; exceeding it ends the attempt as `failed: budget-exhausted`, never
  as a silent stall. (Probe-001's mission.json had `max_attempts: 3` and a
  deadline; attempt-level budgets were absent - add them.)
- **deadline**: the UTC timestamp after which the attempt is dead even if its
  process is alive; the coordinator (or a sweeper) may reconcile it as killed.
- **authority**: the scoped grant for this attempt - which mission authority
  clause, which standing-law rules, which targets are in/out (write_scope +
  prohibited, as task.json already models).
- **checkpoint**: the checkpoint contract - what must be checkpointed, how
  often (per step, per N tool calls, per timebox), and where (append to
  audit.jsonl AND update attempt.json atomically: write `.tmp` + rename, as
  the probe did).
- **proof bar**: what evidence a step must leave to count as done - for probe
...[truncated 1414 chars]
