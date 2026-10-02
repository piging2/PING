# SPEC (UNBUILT) — HS-2: durable run record + 7-state lifecycle

**Status: SPEC ONLY. Not built, not wired, no production callers.**
Source: ORCA-A harvest backlog, `~/workspace/orca-finish/wave2/impl-safety/GAP-ANALYSIS.md`.
Target surface: `/home/nolan/ping` (branch `refactor/runtime-authority-convergence`) — this lane must never touch it.
Lane build shape when authorized: `lib/orca/orca_run_lifecycle.js` (pure transition table) + tests.
The `ping_runs` table + wiring is a PING-side spec artifact, not built here.

## Problem

Runs have no durable record and no explicit lifecycle. Retry, suspend,
cancel, and unknown-outcome handling are caller discipline, which means
every caller re-derives the rules and they drift. The 7-state lifecycle must
be a pure, total transition table that any substrate (file or PG) executes.

## Contract

`run_id = sha256hex('run:' + scope + ':' + seq)` — 64 lowercase hex chars.
`scope` is the tenant/namespace string, `seq` a per-scope monotonic
sequence (sequence allocation is the PING lane's problem; this spec only
defines the derivation).

States (frozen set): `NOT_STARTED`, `STARTED`, `SUSPENDED`, `SUCCEEDED`,
`FAILED`, `OUTCOME_UNKNOWN`, `CANCELLED`.

`transition(state, event) -> newState`; illegal transitions THROW
(`ErrIllegalTransition`), never silently no-op.

Legal transitions (binding):

- `NOT_STARTED` -> `STARTED` (start)
- `STARTED` -> `SUSPENDED` (suspend), `SUCCEEDED` (complete),
  `FAILED` (fail), `OUTCOME_UNKNOWN` (unknown), `CANCELLED` (cancel)
- `SUSPENDED` -> `STARTED` (resume), `CANCELLED` (cancel)
- `OUTCOME_UNKNOWN` -> `CANCELLED` (cancel). **Nothing else.** UNKNOWN is
  terminal-except-CANCEL and NEVER auto-retryable. Reconciliation produces a
  NEW run or an explicit operator transition; it does not resurrect the
  UNKNOWN run.
- `SUCCEEDED`, `FAILED`, `CANCELLED`: terminal. No outgoing transitions.

Notes:

- There is no `STARTED -> NOT_STARTED`, no `FAILED -> STARTED` (retry is a
  new attempt under HS-3, not a state rewind), no `SUCCEEDED -> *`.
- `transitionRun` and `checkpointRun` on ANY substrate must carry
  `holderId` + `expectedEpoch` and refuse on mismatch BEFORE this table is
  consulted (CRITIC-SECURITY F2; full write-path rules in
  `hs-4-fencing-epoch.md`). Wiring the run record WITHOUT the epoch-gated
  write path is forbidden: a stale holder's late `transitionRun` would
  otherwise succeed silently.
- Writer identity + epoch are recorded on every write (attribution for the
  F2 forensic path).

## Composition

- Shares UNKNOWN terminal semantics with `orca_outcomes.js` (convergent
  invariant, two substrates): `writeUnknown` is the ORCA-side constructor,
  this table is the PING-side lifecycle. `OUTCOME_UNKNOWN` means the same
  thing in both: evidence-cited, never auto-retryable.
- HS-3 attempt records hang off `run_id`; attempts never rewind run state.

## Acceptance criteria (the tests that must pass when built)

1. Every legal transition above succeeds; a sample of illegal ones
   (`SUCCEEDED -> STARTED`, `FAILED -> STARTED`, `NOT_STARTED -> SUCCEEDED`,
   `OUTCOME_UNKNOWN -> STARTED`, `CANCELLED -> STARTED`) throws
   `ErrIllegalTransition`.
2. `run_id` derivation is deterministic and 64-hex for fixed inputs;
   different `seq` gives different ids.
3. Transition table is total over the 7 states: any (state, event) pair not
   listed throws; no silent no-op exists.
4. F2 gate: a `transitionRun` equivalent carrying a stale epoch is refused
   (fail closed) before the transition table runs. (Tested at the HS-4
   seam; this spec requires the ordering.)

## Binding caveats

- (b) The ORCA-A `orca_run_record.js` shape has ZERO production callers:
  shape proven, wiring unwitnessed. This spec is pure-module-proven only;
  production wiring is the risk and belongs to the PING lane.
- Do not wire this lifecycle to any substrate until the HS-4 write-path
  epoch enforcement (F2 fix) is in place. Paper lifecycle without fenced
  writes is worse than no lifecycle: it looks safe and is not.
