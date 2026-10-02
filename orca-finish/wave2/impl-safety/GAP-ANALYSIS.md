# GAP ANALYSIS — W2-IMPL-SAFETY vs branch `feature/orca-autonomy` @ `ae55b77ff`

**Date:** 2026-09-23 ~19:50 MDT. **Method:** read-only source inspection of the
branch worktree (`/home/nolan/worktrees/orca-autonomy`), C1's
`ORCA-INVENTORY.md`, and the A5 verdict. Verdicts: ALREADY_IN_BRANCH /
ADAPT / TRUE_GAP.

Salvage rule applied: reuse/adapt before implementing. Nothing below rebuilds
what the branch proves.

---

## 1. Worktree isolation (map record 16, O-3 DIRECT_REUSE)

**Verdict: TRUE_GAP.**

Evidence: full-worktree grep for `worktree` across the branch's `orca/` and
`ping-runtime/external-agent/` returns only incidental mentions (the branch's
own checkout path in `run-loop.sh`, `THRESHOLD-CALIBRATION.md` routing notes,
evidence JSONs). There is no `git worktree add`, no per-run branch, no
create/archive discipline anywhere in the loop, adapter, policy, or
objective-runtime. C1's suspicion is confirmed: the branch does not do
per-run worktree isolation at all. Parallel runs share the checkout;
`PING_DATA_ROOT/objectives/<id>/` is the only per-run isolation, and it is
data dirs, not code isolation.

Missing piece, exactly: per-run `git worktree` create on branch
`orca/<runID>` off the base, archive to `_shipped`/`_killed` with data
preserved before registry unregister, `ErrEmptyBase` guard, plus the ORCA-09
conditional policy (read-only / sole-writer lanes run direct; worktree only
on writer collision).

**Build:** `orca_worktree.js` — faithful O-3 port (already staged pre-pivot;
kept, no branch seam needed because there is nothing to wire to).

---

## 2. Fan-out guardrails (map record 4, orka-delegation-guardrails ADAPT)

**Verdict: ADAPT.**

Already in branch (file:line):
- `orca/control-loop/policy/orca_policy.js:110` `classifyDelegation` —
  membership control via the adapter's `AGENT_PROFILES` allowlist (called
  live at :130 through `adapter.authorizeWorkOrder`; unknown agent denied).
- `orca_policy.js:120` run bounds: `workOrdersUsed >= runBounds.maxWorkOrders`
  → `REQUIRES_HUMAN_APPROVAL` (escalate, never auto-expand).
- `CONTROL-LOOP-DESIGN.md:28`: max 2 work orders per run, max 2 attempts per
  work order, 180s dispatcher timeout, 10-minute absolute deadline.

Missing piece, exactly: controller-enforced **delegation depth** (no max
depth anywhere; `delegate()` recursion is bounded only by work-order count),
**concurrency cap** (no max concurrent children; nothing stops a sibling
storm), and **requeue-on-cap** semantics (over-budget today escalates to a
human; the orka invariant is that over-cap work *requeues and waits*, never
escalates-or-drops). The branch's `maxWorkOrders` is a budget with
escalation semantics, not a requeueing controller.

**Build:** `orca_fanout_guardrails.js` — pure controller (max depth, max
concurrency, per-run child budget, allowed-agents list; over-cap →
requeue with a stable requeue key, membership violation → deny). Wires
*through* the branch: a `guardedDelegation()` composition runs the branch's
`classifyDelegation` first (policy stays the outer authority), then the
guardrail controller; the branch's decision record is preserved as evidence
on the requeue/spawn record.

---

## 3. UNKNOWN outcomes (map record 8, orka-outcome-unknown-fail-closed + DBOS ADAPT)

**Verdict: TRUE_GAP.**

Already in branch (file:line):
- `external_agent_adapter.js:374` `verifyResultEnvelope` — honest failure
  vocabulary: timeout → honest `failed` envelope, never fabricated success
  (`orca_policy.js:74` PROHIBITED `fabricate-worker-success`).
- `external_agent_adapter.js:235` `stableWorkOrderId` — idempotent re-issue
  (same work_order_id, attempt+1); `recovery_decisions.js:205-211` timeout →
  retry attempt+1.
- `orca_status_model.js:32-45` 10-state ledger, TERMINAL =
  FAILED / VERIFICATION_FAILED / CLOSED.

Missing piece, exactly: **OUTCOME_UNKNOWN is not a first-class outcome.**
It appears in no status list, no terminal set, no transition table. The
branch's recovery table classifies *every* timeout as retryable-failed; there
is no side-effect-boundary classification at all — no externally observable
ack boundary, no "cannot be proven uncrossed" rule, no evidence-cited UNKNOWN
record, no no-replay enforcement. A worker that completed its side effect
just before the dispatcher timeout is re-issued (attempt+1, same taskId);
the only double-execution mitigation is the `work_order_id` dedup key, which
is a duplicate-suppression key, not a classification. The red-team
"evidence-free unknown" and "boundary misclassification" attacks have no
counterpart defense in the branch because the state does not exist.

**Build:** `orca_outcomes.js` — outcome vocabulary with OUTCOME_UNKNOWN as a
unique terminal value; boundary = externally observable ack (never local
state position); UNKNOWN writes require last-observed-evidence citation;
blind retry of UNKNOWN is a thrown error; reconciliation only via evidence
(`reconcileUnknown`), never re-submission. Wires through the branch: the
stable `work_order_id` becomes the idempotency key carried on external
effects; timeout-after-dispatch with no verifiable completion classifies
UNKNOWN (not FAILED); provably-pre-dispatch failures stay FAILED/retryable,
which is exactly the branch's current honest-failed path.

---

## 4. Approval binding (map record 11, oa-approval-scope-fingerprint + LANGGRAPH-INTERRUPT + ORCA-07)

**Verdict: TRUE_GAP** (the load-bearing one; red-team rank 2 + rank 7
hardening mandatory).

Already in branch (file:line):
- `orca_policy.js:111` `APPROVAL_GATED_CAPABILITIES = ['email.send','sms.send']`
  → `REQUIRES_HUMAN_APPROVAL` decision class (:111-119). This is a
  *classification*, not a mechanism: no approval record, no grant, no digest.
- `external_agent_adapter.js:374-423` `verifyResultEnvelope` binds
  authorized==invoked==result agent, `work_order_id`/`context_pack_id`/
  `capability` echo, deadline. Binding fields, but **no sha256 digest of the
  authorized proposal**.

Missing piece, exactly: approval binds to **nothing** today. Concretely:
`authorizeWorkOrder({agentId, capability, namespace, constraints})` authorizes
*without seeing the task input*; `issueWorkOrder({... , input, ...})`
attaches arbitrary `input` *after* authorization. Argument smuggling across
the authorize→issue seam is structurally possible: a grant for
`(hermes, text.summarize, core::x, read_only)` can issue any input text,
including exfiltration-shaped content, with the scope fingerprint unchanged —
the exact attack the red-team rank-2 trace describes. There is no
policy-version binding on any grant (nothing to bind: no grants exist), no
execution-time revocation check, no self-approval refusal (the "human" is
assumed external and unmodeled), no single-writer resume CAS.

**Build:** `orca_approval.js` — two-tier grants (scope tier for low-risk
tools; argument tier binding sha256 of canonicalized args for sensitive
tools, which includes the branch's `APPROVAL_GATED_CAPABILITIES`);
grant = { tenant, policyVersion, invocationType, toolLookupKey, role,
proposalDigest, expiresAt, approver, findings }; execution re-validates
digest + policy version + revocation + expiry + tenant; digest mismatch =
stale (throw); revocation checked at execution, not just grant; self-approval
structurally refused at grant AND execution; interrupt resume is
single-writer CAS. Wires through the branch: the proposal digest covers the
branch's binding fields (`work_order_id`, `context_pack_id`, `agent_id`,
`capability`, `deadline`) *plus* the authorized `input` and `constraints`,
closing the authorize→issue seam; the human-approval decision class stays
the branch's policy, the grant becomes its enforcement.

---

## 5. Capability gates (map record 10, ORCA-01 + MCP-M26 ADAPT)

**Verdict: ADAPT.**

Already in branch (file:line):
- `external_agent_adapter.js:253` `authorizeWorkOrder` — per-call,
  fail-closed authorization: unknown agent denied (:254-257), PENDING_AUTH
  denied (:266), `blockedExternal` denied (:258), capability∉profile denied
  (:269), namespace validated (:272), constraints must tighten (:279-284),
  `no_canonical_events`+`no_mission_state_writes` mandatory (:285).
- `BOUNDARY.md:15-20` — deliberate non-duplication: the adapter does NOT
  reimplement the live `CapabilityAuthority.authorize` (agent-initiated
  direction) or `ExteriorAuthMiddleware` (credential validity).

Missing piece, exactly: the **lease layer** around the per-call check.
ORCA-01 tool leases (sha256-hashed Bearer <redacted> scoped to
project/session/lane with role + allowed-tools subset; per-call validation of
hash, revocation, expiry, role, tool grant, scope) do not exist; MCP-M26's
re-resolution immediately before execution, epoch/lease-bound grants, and
ambiguous denial are absent. `authorizeWorkOrder` is a correct per-call
gate for the *delegation* direction, but grants have no expiry, no
revocation registry, and no re-verification between authorization and
execution.

**Build:** `orca_capability_gate.js` — lease wrapper implementing ORCA-01 +
MCP-M26 semantics: `authorizeCall` resolves the capability through the
*existing* authority (calls it, never reimplements it), validates the lease
(hash / revocation / expiry / principal / capability / scope), re-resolves
immediately before returning ALLOW, default-deny, ambiguous-denial. Wires
through the branch: for the delegation direction the "existing authority"
is the branch's `authorizeWorkOrder` (injected, not copied); for the
agent-initiated direction it is the live `CapabilityAuthority` interface.
Long-handler re-verification is recorded as a follow-up check the caller
must run (documented, not silently assumed).

---

## C3 state-recovery fold-in (2026-09-23 ~20:45 MDT)

C3's STATE-RECOVERY-MAP.md (mainline `/home/nolan/ping` @ `cc6856c3b`) raised
four findings. Each checked read-only against `feature/orca-autonomy` @
`ae55b77ff` (via pigwsl-run.sh). Verdicts: CLOSED_ON_BRANCH / TRUE_GAP (+
lane relevance).

### C3-(1) Zombie late complete() after lease reclaim — no fencing token

**Branch: TRUE_GAP (with partial mitigations on the delegation path).**
- Grep for `stale_attempt|fencing|reconcileLostCompletions` across the
  branch's `orca/` + `ping-runtime/external-agent/`: **zero hits**. No fencing
  token exists anywhere on the branch.
- `verifyResultEnvelope` (external_agent_adapter.js:374-423) binds
  work_order_id, context_pack_id, agent (authorized/invoked/result),
  capability, status, deadline. The result envelope carries **no attempt
  field** (required: work_order_id, context_pack_id, agent_id, capability,
  status, output, evidence, error); `resultIdentity` hashes `attempt` from
  the *work order*, never comparing it against the envelope. A late envelope
  for the same work_order_id is not attempt-fenced at verification.
- Partial mitigations (delegation path only): rendezvous drops are
  attempt-scoped (`orca-rendezvous-${attemptId}.json`; `collectRendezvousDrop`
  collects only the current attempt's file, so a zombie attempt-1 result
  cannot be mistaken for attempt-2's); startup reconciliation **refuses to
  redispatch** while the prior attempt is still RUNNING
  (`orca_control_loop.js`: "prior dispatch attempt ... may still be in flight
  ... refusing to redispatch"); attempt recorded BEFORE dispatch (crash window
  closed by construction).
- The PING mission layer, which the branch explicitly reuses without
  modification ("ORCA observes and re-plans; it does not touch the rows
  itself" — recovery_decisions.js:77-81), inherits mainline `complete()`
  with a status-only WHERE: a zombie's late complete() after reclaim is still
  accepted there.
- **Lane verdict: TRUE_GAP.** None of my 5 modules adds a completion fencing
  token. Now covered by harvest spec HS-4 (below).

### C3-(2) reapExpiredLeases has no retry cap — unbounded redispatch

**Branch: CLOSED for the delegation path; TRUE_GAP for the mission layer.**
- Delegation path: `MAX_ATTEMPTS = 2` (orca_control_loop.js:87);
  `attempt > MAX_ATTEMPTS` → FAILED + Escalation (:784-790). Transport
  failures consume an attempt (attempt_count set before dispatch, loop
  recomputes `attempt_count + 1` on re-plan). Retry is bounded; exhaustion
  escalates, never silently loops.
- Mission layer: the branch delegates lease/reclaim to MissionRuntime and
  documents the uncapped behavior as observed-but-untouched
  (recovery_decisions.js:77-81). Crash-looping PING missions still redispatch
  unboundedly at the mission layer: reclaim resets to `created` without
  consuming the `retries` budget.
- **Lane verdict: TRUE_GAP, out of lane** (MissionRuntime explicitly
  off-limits). My fanout guardrails do not cover the reclaim path (reclaim
  bypasses `requestDelegation`). Harvest spec HS-6 (below) addresses the
  takeover-carefulness half; the retry-cap-on-reclaim half remains a mainline
  gap to flag to the parent.

### C3-(3) No OUTCOME_UNKNOWN representation

**Branch: TRUE_GAP (confirmed).** `orca_status_model.js:32-45`: 10 states,
TERMINAL = FAILED / VERIFICATION_FAILED / CLOSED. No OUTCOME_UNKNOWN in any
status list, transition table, or terminal set. Timeouts classify as
retryable-failed; the "cannot prove uncrossed" case has no representation.
- **Lane verdict: TRUE_GAP on branch; CLOSED-BY-DESIGN in my lane** via
  `orca_outcomes.js` (evidence-cited UNKNOWN writes, blind-retry throws,
  reconcile-only-via-evidence). Convergent: the branch's own
  refuse-to-redispatch-while-RUNNING is an implicit no-blind-retry guard;
  HS-2's 7-state run lifecycle independently carries OUTCOME_UNKNOWN as
  terminal-except-CANCEL, never auto-retryable — same invariant, two
  substrates.

### C3-(4) Fencing/reconciliation hardening only on sibling branches

- `6a342dd27` (durable objective identity, crash-safe dispatch rendezvous,
  startup reconciliation): **PRESENT on the branch** — verified live
  (rendezvous drops, RENDEZVOUS_RECOVERED/DISPATCH_LOST outcomes,
  refuse-redispatch, attempt-before-dispatch). My modules wire through it
  (stable work_order_id as idempotency key).
- `e02960f0f` (attempt/lease fencing, STALE_ATTEMPT): **ABSENT** — TRUE_GAP,
  now covered by HS-4.
- `f4bf5304a` (durable event→mission bridge reconciliation): **ABSENT** —
  TRUE_GAP, **out of lane scope** (bridge path; my lane touches neither the
  bridge nor the event store). Flagged for the parent, not built here.

---

## ORCA-A harvest backlog HS-1..HS-6 (2026-09-23 ~20:50 MDT)

Source: `~/workspace/orca-finish/program/orca-a/VERDICTS.md` (57/57 probes
PASS). All six target `/home/nolan/ping` (branch
`refactor/runtime-authority-convergence`), which this lane **must never
touch**. Lane build shape: staged additive modules/specs under
`/home/nolan/ping-orca-safety` (branch `orca-finish/safety`), transfer-ready,
no writes to `/home/nolan/ping`, no merges without the parent's call.

**Caveats (binding, noted before any build):**
- (a) ORCA fencing is **detect-not-prevent**: `transitionRun`/`checkpointRun`
  skip epoch checks (probes H4a-H4b). Any harvest must add epoch checks to
  the *write* path, not just the claim path.
- (b) `orca_run_record.js` has **zero production callers**: shape proven,
  wiring unwitnessed. Harvested tables are pure-module-proven; production
  wiring is the risk and belongs to the PING lane.
- (c) **Never copy the file-CAS shape**: probe H3b proves claimRun's
  read-check-write loses updates under true concurrency. HS-4 enforcement
  must be atomic SQL WHERE, copying only the token *shape*.
- (d) U2 open: wedged-coordinator-holder policy **needs Nolan's call**
  (HS-5's advisory lock has no TTL/heartbeat; a wedged holder blocks
  forever). Do not finalize HS-5's production shape before that call.

| Spec | What | Lane build shape | Composes with | Blocker |
|---|---|---|---|---|
| HS-1 key-order-stable mission identity | canonical stableStringify (sorted keys, explicit types, reject non-finite) replacing JSON.stringify in create()'s idempotency key; full 64-hex | `lib/orca/orca_stable_identity.js` (pure) + tests. Pure function, no schema change | orca_outcomes.idempotencyKeyFor (stable identity is the idempotency-key source) | none |
| HS-2 durable run record + 7-state lifecycle | run_id = sha256('run:'+scope+':'+seq); NOT_STARTED/STARTED/SUSPENDED/SUCCEEDED/FAILED/OUTCOME_UNKNOWN/CANCELLED; illegal transitions throw; OUTCOME_UNKNOWN terminal-except-CANCEL, never auto-retryable | `lib/orca/orca_run_lifecycle.js` (pure transition table) + tests. ping_runs table + wiring = PING-side spec artifact | orca_outcomes (shared UNKNOWN terminal semantics) | wiring needs PING-lane coordination (caveat b) |
| HS-3 attempt identity + per-attempt records | attempt_id = id+'-attempt-'+n (stable); per-attempt record written before dispatch, updated after; crash re-claim preserves attempt_count | `lib/orca/orca_attempt_identity.js` (pure derivation + record constructor) + tests. ping_attempts DDL = PING-side spec artifact | orca_outcomes.recordStep (attempt identity on step records) | none for derivation; DDL needs PING lane |
| HS-4 fencing_epoch on leases, SQL-WHERE enforced | lease_epoch integer on the lease; claim bumps; renew/complete/fail carry held epoch; UPDATE WHERE requires lease_epoch = presented epoch; stale writes → rowCount 0; reaper bumps epoch on reset | `specs/hs-4-fencing-epoch.md` (exact SQL per method: assign/renewLease/complete/fail/failWithRetry/reapExpiredLeases) + `lib/orca/orca_fencing_epoch.js` (pure epoch-bump/stale-decision rules). **Not** the file-CAS shape (caveat c); epoch checks on the write path (caveat a) | orca_approval (epoch = execution-time freshness token, complementary to proposal digest); orca_capability_gate (epoch on leases) | applying needs PING lane + parent |
| HS-5 single-writer scheduler advisory-lock claim | PG session-level advisory lock on a DEDICATED pg.Client (never pool) for the scheduler run; second scheduler logs + exits; crash auto-release via session drop | spec + module skeleton staged; **do not finalize** | orca_fanout_guardrails (single-writer is the precondition the controller assumes) | **U2: Nolan's call on wedged-holder policy** (caveat d) |
| HS-6 liveness-checked stale-claim takeover | before reaper resets an expired-lease mission, check worker liveness (pidAlive generalized); possibly-alive → leave + alarm, never steal | `lib/orca/orca_takeover.js` (pure three-way decision: rendezvous-present→accept; possibly-alive→leave+alarm; dead+no-result→re-authorize) + tests. Reaper hook = PING-side | orca_fanout_guardrails (requeue-vs-steal); orca_outcomes (no-blind-retry) | reaper hook needs PING lane |

**Backlog status:** recorded, not yet built. HS-1/HS-2/HS-3/HS-6-decision are
pure and buildable in-lane on the parent's go-ahead. HS-4 needs the SQL spec
reviewed before staging. HS-5 is held on U2 (Nolan's call).

---

## What was NOT built (and why)

- **A second execution authority.** The branch's WorkOrder boundary is the
  execution seam; every module here is a guardrail *around* it, injected
  with the branch's functions, never a parallel dispatcher.
- **A second event store / status ledger.** `OrcaStatusLedger` and the
  canonical event runtime stay the single writers; outcome records are pure
  constructors whose durable write belongs to the journal (one-writer rule).
- **MissionScheduler / WorkerRuntime changes.** Untouched, as ordered.
- **A7 runner.** Out of scope for this lane.
- **C3-(2) reclaim retry cap, C3-(4) bridge reconciliation (f4bf5304a).**
  True gaps on mainline; out of lane (MissionRuntime/bridge off-limits).
  Flagged, not built.
- **HS-1..HS-6.** Recorded in the harvest backlog above (2026-09-23 ~20:50
  MDT); not yet built. HS-5 held on U2 (Nolan's wedged-holder policy call).

## Build list (all in this lane's worktree, branch `orca-finish/safety`)

1. `lib/orca/orca_worktree.js` — TRUE_GAP, O-3 port + ORCA-09 policy.
2. `lib/orca/orca_fanout_guardrails.js` — ADAPT, pure controller +
   `guardedDelegation()` composition over the branch's `classifyDelegation`.
3. `lib/orca/orca_outcomes.js` — TRUE_GAP, UNKNOWN state machine +
   reconciliation; consumes the branch's `stableWorkOrderId` as the
   idempotency key.
4. `lib/orca/orca_approval.js` — TRUE_GAP, two-tier digest-bound grants +
   execution-time revalidation + single-writer resume CAS; digest covers the
   branch's envelope binding fields + authorized input/constraints.
5. `lib/orca/orca_capability_gate.js` — ADAPT, ORCA-01/MCP-M26 lease wrapper
   calling the branch's `authorizeWorkOrder` (delegation direction) or the
   live CapabilityAuthority interface (agent direction); default deny,
   ambiguous denial.
6. `lib/orca/test/*.test.js` — node:test suites, runnable via
   `node --test lib/orca/test/`. Branch-integration tests require the real
   branch modules by absolute path and skip cleanly if the branch worktree
   is absent.
