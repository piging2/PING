# LANE F: ORCA A6 unknown-outcome chaos — results (2026-09-24)

Subject: `ping-runtime/orchestration/effect_reconciler.js` at
`/home/nolan/ping`, branch `feat/orca-unknown-outcome-port`, commit `36d401538`
("feat(orcha): ORCA unknown-outcome port (reconcile-before-retry)").
Run scratch (Pig-side): `/tmp/a6-run`. Module read from a detached read-only
worktree `/tmp/a6-feat` at the pinned commit. Live tree, `:3100`, and
`/home/nolan/projects/ping` untouched.

## 12-point kill matrix (real SIGKILL, fresh-process restarts)

| # | Kill point | Resolution | Retry eligible | Effect count | Note |
|---|------------|-----------|----------------|--------------|------|
| 1 | before dispatch | retry_authorized (probe_confirms_never_executed) | yes | 0 | clean |
| 2 | during dispatch (stub accepted, commit never ran) | retry_authorized | yes | 1 | PROBE/STUB DIVERGENCE |
| 3 | immediately after dispatch | recovered via durable_succeeded_event | no | 1 | |
| 4 | after provider accepts (before receipt) | retry_authorized | yes | 1 | DIVERGENCE |
| 5 | receipt in flight | retry_authorized | yes | 1 | DIVERGENCE |
| 6 | after receipt, before durable persistence | retry_authorized | yes | 1 | DIVERGENCE |
| 7 | during persistence (commit INSERT) | recovered via effector_probe | no | 1 | row landed |
| 8 | after durable execution record | recovered via durable_succeeded_event | no | 1 | |
| 9 | before coordinator ack | recovered via durable_succeeded_event | no | 1 | ack completed idempotently |
| 10 | after ack | recovered (no-op) | no | 1 | stable |
| 11 | during reconciliation (restart SIGKILLed mid-probe) | retry_authorized | yes | 1 | second restart converged idempotently; DIVERGENCE |
| 12 | during restart reconciliation (sweep SIGKILLed mid-run) | retry_authorized | yes | 1 | next restart resumed cleanly; DIVERGENCE |

DIVERGENCE = probe (ledger-only) says never-executed while the stub provider's
ground truth shows the effect was accepted once. decide() then authorizes a
retry on a false never-executed attestation. The matrix records eligibility; it
does not execute the retry. C0/C8 execute it (below).

Full per-point records (mission_id, run_id, work_order_id, attempt_id,
logical_operation_id, idempotency_key, dispatch state, effect evidence, durable
evidence, reconciliation state, retry eligibility, final result, effect count):
Pig-side `/tmp/a6-run/kill-matrix-results.jsonl` (12 lines).

## Extended chaos + terminal demonstrations: 16/16 PASS

- T-succ PROVEN SUCCEEDED (durable SUCCEEDED event, count 1, idempotent ack)
- T-fail PROVEN FAILED (failDefinitive retryable:false -> failed_terminal;
  retryable -> retry_authorized)
- T-never PROVEN NEVER EXECUTED (stub proves absent, count 0)
- T-hold STILL UNKNOWN -> HELD (ledger hidden so probe fails): EFFECT_HELD
  durable, mission hold via real MissionRuntime.hold, invisible to getPending()
  and the reaper, resumed, later re-probe -> RECOVERED with result carried
- T-low low-consequence unknown -> bounded retry_authorized (explicit reason);
  high-consequence twin -> held
- T-throw sync worker throw -> EFFECT_FAILED, NOT EFFECT_UNKNOWN
- C1 duplicate reconciliation -> idempotent, one terminal, count 1
- C2 late settle after UNKNOWN -> absorbed, SUCCEEDED, count 1
- C4 two reconcilers racing -> safe (retry_authorized emits no terminal)
- C5 3x restarts -> stable terminal state, count 1
- C6 20 rapid reconciles -> exactly one SUCCEEDED event, count 1
- C7 mission replay, same mission_id -> idempotency gate returns duplicate, count 1
- C9 timeout -> UNKNOWN -> late settle lands -> sweep recovers, count 1
- C-init ledger init fire-and-forget race: dispatch won, DISPATCHED durable

## P0 EXECUTION FINDING (reported): C0 + C8 double effect

- C0: naive worker (2s commit delay widens the accept->commit window).
  SIGKILL in the window. Restart: reconcile -> probe false ->
  retry_authorized / probe_confirms_never_executed. The authorized retry was
  EXECUTED (same op_key): stub recorded a SECOND acceptance.
  true_effect_count = 2. One logical operation, two physical effects.
- C8: replacement coordinator resuming the same mission: reconcile ->
  retry_authorized, replacement attempt executed -> count = 2 (same window).

Mechanism: the probe consults ONLY the local ledger. Any kill between
provider-accept and the ledger commit INSERT yields a false
"never executed" attestation, and decide() treats probe=false as
"definitely never ran: re-dispatch is safe". The retry was NOT automatic;
nothing in the module auto-retries after UNKNOWN. But the authorization it
issues is unsound inside that window, and executing it double-executes.

This is the documented residual window (module header + matrix spec name it),
not a new unknown bug. The mitigation is the worker write-ahead contract
(commit on provider accept), which narrows the window to the commit-INSERT
latency but cannot close it. No patch attempted (out of lane scope).

## Invariant classification (current implementation)

1. UNKNOWN = PARK/HOLD: holds for high consequence (held + EFFECT_HELD event +
   mission status 'held', invisible to getPending() and reapExpiredLeases()).
   Bounded, explicit exception: low consequence + attempts left ->
   retry_authorized with reason unknown_outcome_low_consequence_risk_accepted
   (never blind).
2. Lease expiry must never turn UNKNOWN into CREATED: PARTIAL. The
   mission-level reaper (reapExpiredLeases) still resets
   ('running','assigned') + expired lease -> 'created' WITHOUT distinguishing
   abandoned-not-started from may-have-produced-effect. Safety rests entirely
   on the effect-level idempotency gate (same op_key) on re-dispatch, which
   has the C0 window above. The 'held' status is the true PARK that survives
   the reaper. Scheduler blind-retry site (1) is FIXED at this commit:
   UnknownOutcomeError -> reconcile -> _applyReconciliation (fail path only if
   reconciliation itself throws).
3. Timeout is not failure: holds. Sync throw -> EFFECT_FAILED + original error
   rethrown; timeout/lost-ack -> EFFECT_UNKNOWN + UnknownOutcomeError; late
   throw -> UNKNOWN evidence only, never FAILED.
4. UNKNOWN -> SUCCESS without durable evidence: never observed. recovered
   requires a durable SUCCEEDED event or a ledger probe row.
5. No automatic re-execution after UNKNOWN: holds. Retries only via
   decide() retry_authorized with a recorded reason.
6. WITNESS_CREATE: on this branch it is a mission-type category mapping
   ('witness' in mission_scheduler.js), not an execution semantic. The
   unknown-outcome guard equivalent is EFFECT_HELD / EFFECT_RECONCILED. The
   convergence-call rule (never auto re-execute after UNKNOWN unless
   idempotency independently proven) holds in this module.
7. sweepUnknown: 90s grace, idempotent reconcile, racing-reconciler guard
   (defers to a genuinely new terminal), per-op errors counted not thrown.

## Identity findings

- op_key = sha256("op:v1:" + mission_id + ":" + effect + ":" +
  canonicalJson(input)). Verified stable across key orderings; contains no
  attempt number, timestamp, PID, or runtime ephemera. Retries of the same
  logical operation resolve to the same key (C7: replay -> duplicate).
- Physical attempt identity lives in event logical_ids
  (dispatched:{opKey}:{attempt}, unknown:{opKey}:{attempt}); logical identity
  (op_key) is attempt-independent. Timestamps/randomness appear only in
  event_id, never in op_key. Retries preserve logical-operation identity.
- FYD write-boundary lane (mapped earlier, separate surface): request_id is
  the stable caller identity + server-computed canonical payload digest; same
  ID + same digest replays, same ID + different digest conflicts, UNKNOWN is
  deliberately never entered into the FYD ledger. UNTESTED HYPOTHESIS: when a
  mutating request omits request_id the server mints a random UUID; a client
  that loses the first response and retries without retaining the minted ID
  would create a second logical identity (two events). Needs a chaos test.

## GATE-SECRET-001 audit: SECRET MATERIAL FOUND: NO

- Used the existing sanctioned env-based mechanism (db.js: password resolved
  at runtime from the ping-test-pg container env, in memory only, never
  logged/argv/files). No new credential minted.
- Finding: the mechanism was BROKEN on arrival (container env password did
  not match the data-volume password). Repaired test-only by aligning the DB
  password to the container env via in-container expansion (value never in
  argv/stdout/stderr/logs). Sanctioned mechanism verified working after.
- Post-proof audit: token-hash scan of all /tmp/a6-run artifacts against the
  credential hash (compared without printing the value): no matches. Sandbox
  /tmp/lane-f-chaos: clean. No em dashes in produced artifacts. Ephemeral
  hash file removed. Command history contains only the literal
  $POSTGRES_PASSWORD reference (expanded inside the container), never the value.

## Test-infra repairs (all test-only; production untouched)

- /tmp/a6-feat: detached read-only worktree at 36d401538 (live /home/nolan/ping
  left on its branch, dirty tree untouched).
- /tmp/a6-run: scratch copy of the Pig harness; patched two module require
  paths to the worktree, one mission_runtime require to the worktree, and an
  exit-race in buildUnknownTimeout (worker could exit before the matrix
  attached its 'exit' listener -> point 12 deadlocked; fixed with an
  exitCode/signalCode check).
- No commits, no pushes, no :3100 interaction, no production writes.

## Successor frontier

1. Close the probe overstatement: probe=false should mean "not recorded",
   not "definitely never executed". Options: provider-queryable probe for
   effect classes that support it; or require consequence-gated confirmation
   before retry_authorized on probe=false.
2. Mission-level reaper: carry effect outcome (DISPATCHED-but-unresolved) into
   the lease record so reapExpiredLeases can distinguish abandoned-not-started
   from may-have-produced-effect instead of relying solely on the gate.
3. Wire sweepUnknown act() -> MissionScheduler._applyReconciliation in the live
   scheduler poll (verify Arrow 1b end to end on the pinned branch).
4. FYD write boundary: chaos-test the omitted-request_id retry path (server
   mints UUID; lost response + naive retry => two events?).
5. Finish the write-boundary chaos driver (/tmp/lane-f-chaos, parts 1-2 built)
   if the FYD surface needs its own 10-point matrix.
