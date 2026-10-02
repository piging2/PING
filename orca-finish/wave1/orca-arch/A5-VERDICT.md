# A5 Verdict — was "ORCA autonomy" real?

Question: did the claimed A5 — real WorkOrder execution, autonomous follow-up,
timeout-to-retry recovery — exist anywhere in source or history?

**Short answer: YES. A5 was substantially proven in source, in evidence, and
independently audited against the live PING database. The prior context's claim
that the branch "does NOT exist in any ref" is inaccurate on this Pig: the
ref exists, the commit exists, and the history is intact.**

## Verdict per A5 claim

### Claim 1: real WorkOrder execution through the PING spine — PROVEN

- Source: `ping-runtime/external-agent/external_agent_adapter.js`
  (`feature/orca-autonomy` @ `ae55b77ff`): `authorizeWorkOrder` (fail-closed,
  12 profiles), `issueWorkOrder` (closed 14-field envelope, deterministic id),
  `verifyResultEnvelope` (agent/echo/status/deadline binding, non-retryable
  invalid), `recordVerifiedResult` (emits `WORKER_COMPLETED`/`WORKER_FAILED`
  **only through the injected PING `UnifiedEventRuntime`**; the adapter holds
  no event-identity implementation — single authority stays with the spine).
- Witnessed execution: run `orca-run-mu6wmbzn` (evidence
  `orca/control-loop/evidence/run-2026-09-18T11-57-46-931Z/`): Hermes returned
  real 8-field envelopes (queue summary: 191 completed / 0 pending; 21/21/21/21
  lifecycle events in 24h) → verified → 2 canonical `WORKER_COMPLETED` events
  (`event_id=bce4d7cb...`, `bf88809f...`). Event identity recomputed locally
  from the spine's own formula → exact match; ORCA minted nothing.
- Independent audit (2026-09-18, separate auditor, re-queried live
  `brain-postgres:5432` `ping_runtime`): matched 191 missions / 987 events
  exactly; "the worker genuinely read production state."
- Goose chain fully verified end to end: authorize → issue (`7d4d70c634273282`)
  → 26.3s dispatch exit 0 → envelope → `WORKER_COMPLETED e7fe2b77`. qwen/crush
  CLI proofs on file. OpenCode WorkOrder proof **timed out 3x and was reported
  as failed, not passed** (honest negative — counts for, not against, A5).
- Tests re-run by the auditor: `engine.metrics.test.js` 5/5, `validate_dispatcher_profiles.js` 64/64 assertions, `measure.test.js` 9/9. Secret sweep clean.

### Claim 2: autonomous follow-up — PROVEN

- Run `orca-run-mu6wmbzn` task t2: the loop's ASSESS found no non-terminal
  missions, identified evidence-chain verification as remaining work, and
  **scheduled t2 autonomously**: input built from live `getTrace` at follow-up
  time, `causation_id` = t1's `WORKER_COMPLETED` event_id, issued → verified →
  `WORKER_COMPLETED` → `99-close.json`, exit 0. Two chained canonical events
  with shared `correlation_id=orca-run-mu6wmbzn` and causal linkage.
- `assessAndFollowUp()` in `orca_control_loop.js` (:924) gates follow-ups on
  verified evidence only (`classifyFollowUp`), persisted as `policy-followup.json`.

### Claim 3: timeout-to-retry recovery — PROVEN

- Run `orca-run-mu6x9eeh` (evidence `run-2026-09-18T12-15-43-145Z/`, bound by
  `A5-CERTIFICATION-RECORD.md`): attempt 1 **timed out** → honest `failed`
  envelope (no success fabricated) → verified → canonical `WORKER_FAILED`
  (`aaa09271`) → policy `classifyRetry` = AUTO_EXECUTE → same taskId re-issued
  with `attempt+1` (same work_order_id, idempotent) → attempt 2
  `WORKER_COMPLETED` (`74cdadc5`). Independent audit: "real failure-to-recovery
  semantics confirmed."
- Source mechanism: `delegate()` attempt loop (:777-922): transport failure →
  bounded re-plan; timeout → `timeoutEnvelope`; protocol failure →
  VERIFICATION_FAILED + escalate; worker `failed` → FAILED → re-plan →
  AUTHORIZED → QUEUED (legal ledger edges only); retry budget exhaustion →
  FAILED terminal + escalate. Max 2 attempts, max 2 work orders per run.

## Correction to prior forensic context

The task brief stated: a coordinator claimed A5 on `feature/orca-autonomy` @
`992e12725`, "but that branch does NOT exist in any ref (verified 2026-09-24)."

What the Pig actually shows (read-only, verified this lane):

1. **The branch ref EXISTS**: `.git/refs/heads/feature/orca-autonomy` →
   `ae55b77ff82a893d50c48ab299117b2f705a0f03`. Worktree
   `/home/nolan/worktrees/orca-autonomy` checked out at that SHA, clean,
   last active 2026-09-18.
2. **The commit EXISTS**: `git cat-file -t 992e12725` → `commit`. It is a
   reachable ancestor of the branch tip (`git log --all -i --grep=orca`
   shows it in the branch's lineage); `git branch --contains 992e12725`
   lists it in **four** branches: `feature/orca-autonomy`,
   `constitutional-convergence-v2`, `constitutional-convergence-authority-law`,
   and `convergence-discovery-2026-09-20`. It exists in refs, period.
3. The likely origin of the confusion: 992e12725 was the branch tip when the
   A5 certification was bound; the branch has since advanced through five
   more commits (`8899087a3` certification binding, `00b1194fe` A6 FAIL proof,
   `b323f91cf`/`5c23e2f7c`/`0b8acadfc` hardening, `222cd1cde` forensics,
   `6a342dd27` A6 remediation, `479d310d6` + `ae55b77ff` convergence). Anyone
   checking "is the branch still AT 992e12725" would get "no" — but "the
   branch does not exist in any ref" is not what the evidence shows.

## What A5 did NOT prove (correctly scoped, per the auditors)

- **A6 restart resilience**: the witnessed SIGKILL test (commit `00b1194fe`)
  FAILED honestly — no durable reconstruction, duplicate delegation. The fix
  (`6a342dd27`: durable objective identity, atomic rendezvous, PG
  advisory-lock coordinator claim, `reconcileStartup()`) was implemented but
  its own author flagged the witnessed re-proof as untested (2026-09-23
  readiness note: still pending).
- **Continuous operation (A7)**: never built. No cron/systemd/service runs
  the loop. ORCA is proven-capable but **dormant**, not autonomous in
  production.
- The pre-A5 `ExecutionEngine` (`ping-runtime/orchestration/execution/`) was a
  facade (`executor: null`); A5 did not fix it — A5 **routed around it** via
  the WorkOrder boundary. It remains dormant/dead code (DELETE-or-ARCHIVE
  decision for Nolan, not taken in this lane).
- Minor: envelope time fields from Hermes were templated (unreliable
  timestamps); file-count discrepancy 88 vs 90 (content verified clean).
  Neither blocks A5.

## Bottom line for ORCA FINISH

Do not rebuild what A5 built. The durable assets are: the canonical
`external_agent_adapter.js` (the PING-owned WorkOrder boundary — wire ORCA
through it), `orca/control-loop/` (observe→plan→authorize→delegate→monitor→
verify→record→follow-up/retry/escalate→close, with crash-safe durable state),
the evidence dirs (the audit trail), and the independent verdicts. The
remaining honest work is: witnessed A6 re-proof, a runner/scheduler (A7),
and deleting or archiving the pre-A5 `execution/` facade — none of which
requires a new execution authority.
