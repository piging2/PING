# STATE LAYER — W2-IMPL-STATE (revised post-redirect)

**Lane:** W2-IMPL-STATE, ORCA FINISH Wave 2. **Date:** 2026-09-23 MDT.
**Branch:** `orca-finish/state` (worktree `/home/nolan/ping-orca-state`).
**Supersedes:** the six-PG-table plan (cancelled by parent redirect; see
`GAP-ANALYSIS.md` for the salvage reasoning).

## What was built

Two new additive modules at the branch's own paths (so a later merge with
`feature/orca-autonomy` is additive, no conflicts):

- `orca/control-loop/orca_run_record.js` — durable RUN identity.
- `orca/control-loop/orca_ready_set.js` — dependency-determined ready work.
- Tests: `orca/control-loop/orca_run_record.test.js`,
  `orca/control-loop/orca_ready_set.test.js` (plain `node`, repo convention).

## Schema rationale (why files, not PG tables)

The branch's durable substrate is **atomic JSON files under
`PING_DATA_ROOT/objectives/<objective_id>/` + a PG advisory-lock
single-coordinator claim** (SIGKILL-safe: the server releases the lock on
session drop). That substrate is reviewed, crash-safe by design, and already
carries objective identity, work-order identity, budget, and cancellation.
Adding six PG tables would erect a *second* durable store beside it —
exactly the second-writer/second-authority failure the mechanism map's
record 5 (one-writer, red-team SURVIVES) forbids. Durability does not require
a table; it requires a single writer and atomic writes, both present.

The run record therefore lives at
`objectives/<objective_id>/runs/<run_id>.json` and contains:
`run_id` (deterministic `sha256('run:'+objective_id+':'+run_seq)`),
`run_seq` (durable monotonic counter in `objective.json`),
`tenant_id` (from the adapter namespace, e.g. `tenant::<id>`),
`principal`, `input_snapshot_ref` (content-addressed reference — **never raw
input; secret-free by construction**), typed `status`, `worktree_path`,
`branch`, `lease { holder_id, expires_at, fencing_epoch }`,
`checkpoint_version` (monotonic), `state_snapshot_ref`, timestamps.

The fencing-token CAS *intent* (O-1 hardening: claim/resume requires CAS) is
satisfied in two layers: the advisory-lock claim is the primary single-writer
fence (stronger than CAS for the single-coordinator case), and `claimRun()`
additionally compare-and-swaps on `fencing_epoch`, so a stale holder's late
writes are detectable and refused.

## Which finish criterion each piece serves

- **Durable RUN identity** (map record 1, O-1 ADAPT): `orca_run_record.js`.
  The exact gap was the run row itself — the branch had durable objective and
  work-order identity but `RUN_ID` was wall-clock derived
  (`orca_control_loop.js:115`), so a restarted coordinator could not
  reconstruct the run. Now: `registerRun` / `loadRun` / `listRuns` /
  `transitionRun` / `claimRun` / `checkpointRun`, all through the branch's
  `objective-runtime.js` by dependency injection (no forked code).
- **Dependency-determined ready work** (map record 3, O-4 ADAPT):
  `orca_ready_set.js`. Pure `readyWorkOrders(workOrders, {blockedWorkOrderIds})`:
  claimable (AUTHORIZED) + all `depends_on` in terminal-success (COMPLETED) +
  not in the unresolved-unknown set. No scheduler import. Cycles, missing
  deps, and self-deps degrade to never-ready (safe, no hang). The `depends_on`
  field on the work-order record is the one ADAPT tail left to the branch.
- **Attempt identity** (map record 6): ALREADY_IN_BRANCH — verified, not
  rebuilt (`deriveAttemptId`, attempt-before-dispatch, deterministic
  singularity under the single writer, namespace transitively embedded).
- **Bounded work packets / checkpoint-resume** (map records 2, 7): ADAPT
  change specs in `GAP-ANALYSIS.md` (acceptance-criteria enforcement,
  per-packet budgets, OUTCOME_UNKNOWN classification on lost dispatch) —
  specified, not built, per the implement-only-true-gaps directive.

## What was NOT built and why

- **Six PG tables** (`orca_runs`, `orca_attempts`, `orca_work_packets`,
  `orca_dependencies`, `orca_checkpoints`, `orca_effects`): cancelled. A
  second store would violate the one-writer rule; the filesystem substrate
  satisfies the O-1 smallest proof (fresh worker reconstructs run identity,
  status, worktree from durable state alone — proven by the `[fake]` and
  `[wired]` test suites).
- **A work-order transition table**: the branch already owns one
  (`OrcaStatusLedger`, 10 states, evidence-required edges,
  `policy/orca_status_model.js`). My 7-state run-lifecycle table covers a
  different unit (runs, not delegation units) — no duplication.
- **Modifications to the branch**: read-only for this lane; delta is new
  files only.
- **JS→Python ExecutionAuthority link**: out of scope (pending
  architectural decision, per lane brief).

## Wiring and merge notes

- Modules take `rt = { atomicWrite, readJson, objectiveDir }` (dependency
  injection). Production wiring post-merge:
  `const rt = require('./objective-runtime');`
  `const runs = require('./orca_run_record');`
- Tests prove the wire today: the `[wired]` suite requires the real
  `/home/nolan/worktrees/orca-autonomy/orca/control-loop/objective-runtime.js`
  (read-only) and runs the full durable suite against it, including
  coexistence of run records with branch work-order records. If the branch
  module is absent the wiring section reports SKIP, never a false pass.
- `readyWorkOrders` is duck-typed over `{work_order_id, state, depends_on}` —
  it consumes the branch's `listWorkOrders()` output unchanged.

## Constitutional dependencies (not built here, by design)

- Canonical ID minting / canonicalization authority: the convergence sprint
  owns it. `deriveRunId` is deterministic derivation for the state layer,
  not a new minting authority.
- OUTCOME_UNKNOWN classification procedure and acceptance-criteria
  enforcement: specified in `GAP-ANALYSIS.md`, awaiting a hardening pass.

## Test results (2026-09-23 ~20:05 MDT, Pig WSL, node 22)

- `orca_ready_set.test.js`: **16/16 pass** — diamond fixture (A→B,C→D),
  partial completion, failed-dep blocking, unresolved-unknown blocking,
  RUNNING not re-claimed, unknown states fail closed, cycle/missing/self-dep
  safe, order preserved.
- `orca_run_record.test.js`: **24/24 pass, 0 skipped** — full transition
  table (legal paths + every illegal edge throws `ErrIllegalTransition` +
  totality over 7×8 pairs), deterministic run identity, durable register/
  load/list/transition/claim-CAS/checkpoint against a faithful fake AND
  against the real branch module (wired suite), run/work-order coexistence.
