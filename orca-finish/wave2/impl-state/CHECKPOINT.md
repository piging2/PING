# W2-IMPL-STATE Checkpoint — durable execution-state layer

**Lane:** W2-IMPL-STATE (ORCA FINISH Wave 2). **Status:** PLAN recorded 2026-09-23 19:35 MDT.
**Branch:** `orca-finish/state` @ worktree `/home/nolan/ping-orca-state` (base `cc6856c3`, `refactor/runtime-authority-convergence`).

## Objective
Build the durable execution-state layer, additive only, no changes to MissionRuntime/MissionScheduler/WorkerRuntime live behavior.

## Hardening contract (binding, from wave1 mechanism map records 1,2,3,6,7 + red-team verdicts)
- O-1 NEEDS-HARDENING: run row carries tenant_id (mandatory, every table), lease (holder id, expiry, fencing token); claim/resume of a running row requires fencing-token CAS; persisted prompt/input excludes secret material (redacted or by-reference); implement as run-scoped namespace of the canonical PG event journal, NEVER a second SQLite writer.
- RESTATE-INVOCATION-ID NEEDS-HARDENING: attempt identity = (mission_id, attempt_seq, uuid7); singularity enforced by journal unique constraint on the attempt key; IDs never carry bearer authority; tenant embedded in routing key.
- O-4: dependency edges as data; pure ready-set query; no scheduler import.
- Record 2: work packet requires acceptance criteria at parse time (reject without); budget envelope.
- Record 8: OUTCOME_UNKNOWN is a unique durable terminal value, never empty/omitted; effect outcomes SUCCEEDED/FAILED/OUTCOME_UNKNOWN.
- Record 7: checkpoint = versioned, monotonically increasing record.
- Record 6: per-attempt outcome recorded against attempt identity.

## Plan
1. Explore Pig repo: where migrations live, DB client (PG?), test runner, JS module layout. (5-10 min)
2. Create worktree `/home/nolan/ping-orca-state` via pigwsl-run.sh. Verify clean, on `orca-finish/state`.
3. Write migration `sql/migrations/<seq>_orca_execution_state.sql`: `orca_runs`, `orca_attempts`, `orca_work_packets`, `orca_dependencies`, `orca_checkpoints`, `orca_effects`. All tables: tenant_id NOT NULL. Runs: lease_holder_id, lease_expires_at, fencing_epoch (monotonic), UUIDv7 id. Attempts: unique (mission_id, attempt_seq) plus uuid7 id; statuses NOT_STARTED/STARTED/SUCCEEDED/FAILED/OUTCOME_UNKNOWN/SUSPENDED/CANCELLED. Work packets: acceptance_criteria NOT NULL, budget envelope JSONB, status. Dependencies: composite PK (packet_id, depends_on_packet_id). Checkpoints: version monotonic per run, snapshot ref (content-addressed ref, never secrets). Effects: idempotency_key UNIQUE per (tenant_id?), outcome enum.
4. Pure module `lib/orca/orca_run_transitions.js`: `apply(from, event) -> to`, throws ErrIllegalTransition. Full transition table, zero I/O. Export state/event enums.
5. Pure module `lib/orca/orca_ready_set.js`: `readyPackets(run_id)` — rows in, ready packets out; deps terminal-success AND packet not terminal AND no unresolved conflicting effect. No scheduler import; pure function over row arrays + one SQL variant for PG.
6. Pure module `lib/orca/orca_attempt_identity.js`: `makeAttemptId(missionId, attemptSeq)` -> {id: uuid7, key}; `parseAttemptKey`; `assertRoutable` (tenant embedded, no bearer semantics); DB unique constraint doc in migration.
7. Tests: `test/orca/` — transitions.test.js (legal paths + illegal throw), ready-set.test.js (diamond fixture A->B,A->C,B+C->D), idempotency.test.js (UNIQUE constraint violation on duplicate key). Runner: repo's existing (check package.json / vitest / node:test).
8. `STATE-LAYER.md` in `~/workspace/orca-finish/wave2/impl-state/`: schema rationale, criterion mapping, what NOT built + why, constitutional dependencies (identity/canonicalization minting authority belongs to convergence sprint).
9. Commit on `orca-finish/state`. Final report.

## Open questions (to resolve during build)
- Does the Pig repo use PostgreSQL with a migrations dir? If PG unavailable in this env, migration is written as PG SQL + tests run against a pure in-memory emulation of constraints (documented), or use repo's test DB setup if one exists.
- UUIDv7 generation: check if repo has a uuid7 helper; else implement RFC 9562 v7 in the pure module (dependency on convergence sprint for canonical minting recorded as DEPENDENCY, local gen only for tests/records).

## Progress log
- 19:35 MDT: checkpoint created; mechanism map + red-team hardening absorbed; plan set.

## Progress log (cont.)
- 19:45 MDT: worktree created clean on orca-finish/state; repo layout mapped (database/*.sql convention, ping-test-pg reachable with PG17 + uuidv7(), tests are plain `node *.test.js`).
- Design decision: mission_id is TEXT reference, not hard FK — PING owns mission identity (convergence sprint dependency); a hard FK to a table with no stable contract would break the migration. Documented in STATE-LAYER.md.
- Design decision: DB trigger `orca_enforce_status_transition()` mirrors the JS transition table on orca_runs/orca_attempts/orca_work_packets — the DB enforces the table even for writers that bypass the JS module.
- Design decision: fencing CAS provided as a documented canonical SQL shape (no store implementation in this lane; lane is schema + pure logic per task).
- Writing files to staging now, then scp to Pig worktree, then live-verify against ping-test-pg.

## STRATEGIC REDIRECT (2026-09-23 ~19:50 MDT, parent directive)
Old plan (six new PG tables from scratch) CANCELLED. Wave-1 lane C1 proved
branch `feature/orca-autonomy` @ `ae55b77ff` already covers much of the scope.
Salvage rule applied; read-only survey of the branch complete.

Gap verdicts (full evidence in GAP-ANALYSIS.md):
1. Durable RUN identity — TRUE_GAP: no run record exists; RUN_ID is
   wall-clock (`orca_control_loop.js:115`), violating the branch's own
   identity convention. PG tables NOT needed: branch substrate is atomic
   files + PG advisory-lock single writer (reviewed, crash-safe); tables
   would be a second store (record-5 violation).
2. Bounded work packets — ADAPT (change spec only): acceptance_criteria not
   required at issueWorkOrder; no per-packet budget envelope.
3. Attempt identity — ALREADY_IN_BRANCH (deriveAttemptId + single-writer +
   namespace transitively embedded).
4. Dependency ready-set — TRUE_GAP: no edges anywhere; follow-up chaining
   is not a DAG.
5. Checkpoint/resume — ADAPT: reconcileStartup exists; missing monotonic
   checkpoint versions + OUTCOME_UNKNOWN vocabulary (change spec only).

BUILD (new files only, at branch paths for additive merge, in my worktree):
- `orca/control-loop/orca_run_record.js` — durable run record on the
  branch substrate (DI over objective-runtime fns; pure transition table).
- `orca/control-loop/orca_ready_set.js` — pure ready-set query over
  work-order shapes.
- tests: `orca/control-loop/tests/orca_run_record.test.js`,
  `orca/control-loop/tests/orca_ready_set.test.js` (+ a wiring test against
  the real branch objective-runtime.js by absolute path).
- `STATE-LAYER.md` (revised): what was built, what was not, why no tables.

## Build complete (2026-09-23 ~20:05 MDT)
- Built `orca/control-loop/orca_run_record.js` (durable run record: identity,
  7-state pure transition table, fencing-epoch CAS claim, monotonic
  checkpoints; DI over objective-runtime, no fork) and
  `orca/control-loop/orca_ready_set.js` (pure ready-set query).
- Tests: 16/16 ready-set, 24/24 run-record (incl. wired suite against the
  real branch objective-runtime.js). One real finding during testing: the
  ready-set initially re-claimed RUNNING work orders — fixed to
  claimable-only (AUTHORIZED), matching the branch's no-redispatch rule.
- Docs: GAP-ANALYSIS.md, STATE-LAYER.md (this dir).
- Committing on orca-finish/state next.

## Done (2026-09-23 ~20:10 MDT)
- Committed 30a750fad on orca-finish/state (4 files, +785, additive only).
- Worktree clean, 0 dirty. Tests re-run from the committed tree: 16/16 +
  24/24, 0 skipped.
- Lane notes in this dir: CHECKPOINT.md, GAP-ANALYSIS.md, STATE-LAYER.md.
- Open for W2-REDTEAM review.
