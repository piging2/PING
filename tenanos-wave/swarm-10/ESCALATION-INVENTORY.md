# ESCALATION INVENTORY — TenantOS Autonomous Paths

Swarm 10 (Human Decision Budget), 2026-09-23. Read-only investigation; nothing in any repo was modified.

## Scope and method

Two checkouts were examined because the convergence harvests from one into the other:

- **Substrate source** `/home/nolan/ping` — branch `refactor/runtime-authority-convergence` @ `cc6856c3b`.
  Contains the live autonomous machinery: `gateway/` (authorities, mission execution graph,
  node registry, mission control routes), `ping-runtime/orchestration/` (execution engine,
  merge gate/queue, consensus engine, mission runtime/scheduler), `ping-runtime/knowledge/`.
- **Wave repo** `/home/nolan/projects/ping` — the Next.js app; wave substrate target root
  `src/tenanos/**` (does not exist yet — greenfield). FYD paths excluded per hard exclusion zone.

Method: systematic grep sweeps for `escalat*`, `approv*`, `human*loop`, `manual review`,
`decision inbox`, `MergeGate`, `ConsensusEngine`, `interrupt`, `checkpoint`, `awaiting`,
`pending`, `BLOCKED`, `cannot proceed`, `dead letter`, `promote`, plus full reads of every
file that matched. Line numbers below are from the substrate source checkout.

Memory cross-check: 2026-09-12 ("ApprovalAuthority exists with approvals table but zero require
edges, no reachable endpoint, no role in the mutation path"), 2026-09-19 ("Decision inbox for
human-intent questions only; operator approval only for the 8 consequential categories"),
2026-09-22 (approval ordering: intent → identity → capability/policy → proposal → approval →
re-evaluate → effect → receipt). The 8 categories were never enumerated in code or memory;
treated as unwired policy (see E-04).

## Summary table

| ID | Site (file:line) | What happens today | Human involved? | Class |
|----|------------------|--------------------|-----------------|-------|
| E-01 | `gateway/approval_authority.js:86` `requestApproval()` | Patch→replay→test→witness evaluated; status computed | No — policy hardcoded `automatic` (line 136) | DERIVABLE_FROM_SOURCE |
| E-02 | `gateway/approval_authority.js:201` `pending_manual` | Status value exists; unreachable (policy never `manual`) | No producer | POLICY_CONFLICT |
| E-03 | `gateway/approval_authority.js:205` `pending_constitutional` | Status value exists; unreachable | No producer | POLICY_CONFLICT |
| E-04 | `gateway/approval_authority.js:217` `approveManually()` | Human resolution sink; **zero callers** (verified) | Intended human, unwired | AUTHORIZATION_REQUIRED |
| E-05 | `gateway/approval_authority.js:273` `getPendingApprovals()` | **Zero callers** — approvals table is write-only | None | DERIVABLE_FROM_RUNTIME |
| E-06 | `gateway/mission_execution_graph.js:456` `_executeApprove` | Runs `requestApproval` between `run_replay` and `commit` | No | DERIVABLE_FROM_SOURCE |
| E-07 | `gateway/mission_execution_graph.js:480` `_executeCommit` | `approval_status !== 'approved'` → `{committed:false, reason:'Not approved'}`; **no retry, no event, no escalation** | No | DERIVABLE_FROM_SOURCE |
| E-08 | `gateway/node_registry.js:312` `ApproveNodeExecutor` | Same gate via registry; missing dep → returns string `'approval_data'` → downstream gate fails closed | No | DERIVABLE_FROM_SOURCE |
| E-09 | `gateway/node_registry.js:342` commit gate | Identical fail-closed gate | No | DERIVABLE_FROM_SOURCE |
| E-10 | `ping-runtime/orchestration/merge_gate.js:77` `MergeGate` | 7 static gates, blocking/warning; deterministic | No | DERIVABLE_FROM_SOURCE |
| E-11 | `ping-runtime/orchestration/merge_queue.js:96` `runMergeGate` | Gate failure → stage `constitutional_review` (holding pen, no owner) | No | DERIVABLE_FROM_RUNTIME |
| E-12 | `ping-runtime/orchestration/merge_queue.js:135` `completeReview()` | `reviewer` is a free-form string; nothing binds it to a human | Ambiguous | AUTHORIZATION_REQUIRED |
| E-13 | `ping-runtime/orchestration/merge_queue.js:167` `merge()` | Merges from `constitutional_review` — a failed gate can be overridden by any caller | No check | DESTRUCTIVE |
| E-14 | `ping-runtime/orchestration/execution/engine.js:160` | "No workers available — deferring"; mission silently dropped (never rescheduled) | No | DERIVABLE_FROM_RUNTIME |
| E-15 | `ping-runtime/orchestration/execution/engine.js:289` `_resolveMission` | Consensus rejected → status `failed` | No | DERIVABLE_FROM_HISTORY |
| E-16 | `engine.js:327,365,385,403` | `consensus_failed`, `merge_decision_created`, `mission_accepted`, `mission_rejected` emitted with **zero subscribers** (verified) — dead-end emissions | No | DERIVABLE_FROM_RUNTIME |
| E-17 | `engine.js:startAutonomousLoop` (~line 640) | `minPriority` filter silently skips low-priority missions | No | PRODUCT_INTENT |
| E-18 | `ping-runtime/orchestration/mission_runtime.js:202` `failWithRetry` | `retry_pending` + backoff; exhaustion → `failed` | No | DERIVABLE_FROM_HISTORY |
| E-19 | `ping-runtime/orchestration/mission_runtime.js:272` lease reaping | Stuck `running`/`assigned` reclaimed to `created` — automatic recovery, no escalation needed | No | (healthy — no class) |
| E-20 | `ping-runtime/orchestration/mission_scheduler.js:289` `_failMission` | Exhaustion → `recordDeadLetter` (line 303) when DLQ wired | No | DERIVABLE_FROM_HISTORY |
| E-21 | `mission_scheduler.js:266` | `no worker matched event_type=...` → mission failed | No | DERIVABLE_FROM_SOURCE |
| E-22 | `gateway/dead_letter_authority.js:112` `recordDeadLetter` | DLQ write with `replayable` flag | No | DERIVABLE_FROM_HISTORY |
| E-23 | `gateway/dead_letter_authority.js:262` `replayDeadLetter` | Requires a `replayFn` — **no production caller supplies one** | None | SAFE_EXPERIMENT_AVAILABLE |
| E-24 | `gateway/routes/mission_control.js:625,653,663` | `GET /dead-letters`, `/stats`, `/:id` — read-only; **no replay/requeue endpoint** | Human can see, cannot act | AUTHORIZATION_REQUIRED |
| E-25 | `ping-runtime/knowledge/knowledge_promoter.js:36` `handle()` | `SNIPPET_APPROVED`/`AI_RESPONSE_ACCEPTED` → knowledge (1.0); rejects → 0.2 | Human by design | PRODUCT_INTENT |
| E-26 | (gap) no emitter | **Zero production emitters** of `SNIPPET_APPROVED`/`AI_RESPONSE_ACCEPTED` (only synthetic `event_generator.js:325`) | Capture unwired | AUTHORIZATION_REQUIRED |
| E-27 | `projects/ping/src/lib/environment.ts:63`, `assignment-store.ts:74` | "Environment must be explicitly configured. Cannot proceed with unsafe default." — hard stop | Human must configure | CREDENTIAL_REQUIRED |
| E-28 | `projects/ping/src/lib/materialization-state-machine.ts:103` | `TRANSITION_BLOCKED` logged via console.error only | No | DERIVABLE_FROM_SOURCE |
| E-29 | `projects/ping/src/fyd/acquisition/acquisition-adapter.ts:88` | Media-acquisition escalation pipeline (typed record) — **exclusion zone, non-human** | N/A | OTHER |
| E-30 | `gateway/verify/*.js` (3 hits) | "requires manual review" in dev-time verify scripts | Dev-time only | OTHER |

## Dead-end emissions (detail)

E-16 is the most consequential structural finding. `ExecutionEngine._resolveMission`
(`ping-runtime/orchestration/execution/engine.js:289-410`) emits four chained events —
`consensus_reached`/`consensus_failed` (line 327), `merge_decision_created` (365),
`mission_accepted` (385), `mission_rejected` (403) — and a repo-wide subscriber search
(`scan6`, K1) found **zero subscribers** for any of them in `gateway/` or `ping-runtime/`.
A rejected mission is recorded on the in-memory mission object and then nothing happens:
no retry, no DLQ, no human surface. (The *separate* mission runtime/scheduler path,
E-18–E-23, does have retry + DLQ; the execution engine path does not.)

## Write-only ledgers (detail)

- **Approvals table** (`gateway/approval_authority.js:49`): `requestApproval` inserts a row with
  `approval_status`, `approved_by`, `witness_hash` — but `getPendingApprovals` (273) and
  `approveManually` (217) have no callers anywhere in the checkout. If policy ever becomes
  `manual`, approvals would pile up in `pending_manual` forever.
- **DLQ observability without action** (`gateway/routes/mission_control.js:625-676`):
  dead letters are listable by a human, but `replayDeadLetter`
  (`gateway/dead_letter_authority.js:262`) has no route and no production caller, so the
  `replayable` flag is currently decorative.

## What is NOT an escalation point (explicitly checked)

- `ConsensusEngine.evaluate` (`consensus_engine.js:10`): fully deterministic; `accepted:false`
  with reason is a classification, not an escalation. The escalation question is only what
  *consumes* the rejection (today: nothing — E-16).
- `CheckpointAuthority` (`gateway/checkpoint_authority.js:26`): automatic checkpointing; no human gate.
- `SelfImprovementLoop` (`gateway/self_improvement_loop.js:78`): per-repo failures are caught,
  logged, and stored via `memoryAuthority.storeFailure`; the cycle continues. No escalation —
  by design, failures become training data.
- `CapabilityAuthority` (`runtime/kernel/capabilities/capability-authority.ts`): registry +
  resolver + filters only; no allow/deny escalation logic present in this branch. The old
  `POST /capabilities → CapabilityAuthority.execute()` mutation path from the 2026-09-12
  worktree no longer exists at `gateway/routes/capabilities.js` (file absent) — the live
  mutation gate is the approval→commit pair (E-06–E-09).
- `mission_control.js:80,146` `pendingReviews`/counts: business-mission-control read models
  (leads, estimates, reviews), not autonomy escalation points.
