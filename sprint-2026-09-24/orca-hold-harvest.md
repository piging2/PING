# ORCA HOLD harvest note (2026-09-25, kernel-harvest lane)

## The two implementations

### Canonical HOLD — MissionRuntime / MissionScheduler
Location: `/home/nolan/ping/ping-runtime/orchestration/`
(mission_scheduler.js, mission_runtime.js) — committed at HEAD (73d06b03c).

Semantics:
- Stuck-running watchdog detects missions holding running/assigned past a
  bounded threshold (default 600s) or dispatch timeouts with unknown outcome.
- Emits a HOLD reconciliation record: in-memory `_reconciled` set (one
  outstanding HOLD per mission per session) + MISSION_RECONCILE_HOLD event
  with classification UNKNOWN_EXECUTION, mission_id, payload digest,
  correlation/causation ids.
- Timeout never resolves to FAILED; no automatic retry is derived for
  unknown effects.
- Advisory only at HEAD: the lease reaper does not honor holds (known open
  reaper-vs-HOLD design gap, needs Nolan's word).

Tests: mission_scheduler.retry_watchdog.test.js, mission_scheme_convergence.test.js.

### ORCA competing HOLD — unknown-block
Location: `/home/nolan/worktrees/orca-autonomy/orca/control-loop/orca_unknown_block.js`
(branch feature/orca-autonomy, commit db33605bf landed per SCOREBOARD;
worktree retains the source).

Semantics:
- classifyDispatchOutcome(): pure function distinguishing
  POST_BOUNDARY_UNKNOWN (dispatcher spawned the exterior worker; outcome
  indeterminate — worker may have completed, may still run, may never have
  run) from PRE_BOUNDARY (transport failure where the dispatcher never ran;
  the loop's bounded re-plan path stays valid).
- Durable blocked set: objectives/<id>/blocked-work-orders.json
  { blocked: { <id>: entry }, decisions: [...] }. Blocked ids are never
  auto-claimed, even when durable state reads AUTHORIZED.
- releaseBlockedWorkOrder(): the ONLY writer out of OUTCOME_UNKNOWN;
  requires an explicit recorded decision ('cancel' -> BLOCKED terminal;
  'retry-after-reconcile' -> AUTHORIZED, new attempt within durable budget,
  unknown attempt honestly kept in attempt_history).
- Crash-order safety: block file written BEFORE work-order state; a crash
  between them is recognized as a crash window (block entry +
  RUNNING/AUTHORIZED + dispatcher dead) and the recorded decision completes
  against the true prior state. No interleave auto-dispatches.
- reconcileRunningWorkOrder: lost-redispatchable removed; dead dispatcher +
  no rendezvous -> OUTCOME_UNKNOWN + blocked. No automatic path turns
  UNKNOWN dispatchable.

Tests: orca/control-loop/crash-proof/controller.sh — real SIGKILL of
coordinator + dispatcher mid-dispatch; 12/12 kill assertions
(OUTCOME_UNKNOWN, blocked, POST_BOUNDARY_UNKNOWN, DISPATCH_LOST_UNKNOWN,
0 emits, exactly 1 physical effect, 2nd restart no resurrection) + 14/14
hazard checks (H-a..H-g). Evidence dirs committed alongside.

## Diff summary

| Aspect | Canonical | ORCA |
|---|---|---|
| Unknown classification | single UNKNOWN_EXECUTION | PRE_BOUNDARY vs POST_BOUNDARY_UNKNOWN (pure fn) |
| Hold durability | in-memory + event (advisory) | file-based blocked set + decisions log |
| Release path | none at HEAD (open gap) | explicit recorded decision only |
| Crash ordering | n/a | block-before-state + crash-window recovery |
| Reaper interaction | reaps (open gap) | n/a (ORCA has no PG reaper; its loop consults blocked set) |
| Pre-boundary retry | not distinguished | bounded re-plan stays valid for PRE_BOUNDARY |

## Harvest: unique value in ORCA's implementation

1. **classifyDispatchOutcome's boundary distinction** — the single most
   valuable harvest. The canonical HOLD treats every timeout as one
   UNKNOWN; ORCA proves (pure, testable) that "dispatcher never ran"
   (safe to re-plan) differs from "dispatcher may have executed" (must
   park). This is a real edge case the canonical path lacks.
2. **Crash-window ordering discipline** — block-record-before-state plus
   explicit recognition of the crash interleave. Directly applicable to
   the canonical setHeld-before-emit ordering (already in the quarantined
   WIP).
3. **Append-only decisions log** — operator decisions as evidence, not
   just state mutation. The quarantined WIP's `decisions` JSONB column is
   this idea ported to PG.
4. **"No automatic path turns UNKNOWN dispatchable"** as an explicit
   invariant, proven by kill-test rather than asserted.
5. **H5 ordering-hazard fix** — releaseBlockedWorkOrder completing the
   recorded decision against the true prior_state when (block entry +
   RUNNING/AUTHORIZED + dispatcher dead).

## Canonical path recommendation

ONE HOLD semantic, converging on:

requested transition
  -> consequence classification (INCLUDING the pre/post side-effect
     boundary distinction harvested from ORCA)
  -> policy (UNKNOWN -> park; PRE_BOUNDARY -> bounded re-plan)
  -> optional human decision (recorded, append-only, the only release path)
  -> execute / deny.

Concretely:
- Keep the canonical MissionRuntime HOLD as the authority (PG row-visible,
  reaper-honoring — i.e., the quarantined WIP's shape, once Nolan gives
  the design word).
- Harvest into it: (a) the PRE/POST_BOUNDARY classification as a pure
  function on dispatch outcomes; (b) the decisions audit trail (already
  present in the WIP); (c) the crash-ordering discipline.
- Do NOT keep ORCA's file-based blocked set as a second authority. The
  ORCA control loop keeps its local blocked set only as a consumer-side
  guard until its work orders flow through MissionRuntime; it must not
  define competing HOLD truth.

Nothing deleted or retired in this pass, per directive. When Nolan calls
the convergence: retire the ORCA unknown-block as an authority candidate,
keep its tests as the crash-window proof suite for the canonical path.
