# T-06 corpus runner - HARNESS ONLY, NOT PRODUCT CODE

Task G (T-06): three-way HOLD/recovery comparison across the Wave B corpus
(fixtures 01-08, `~/workspace/ping-24h/sprint/h00-02/corpus-t05/`).

Shared invariant under test in every cell:
UNKNOWN EFFECT -> HOLD -> RECONCILE -> PROVE EFFECT / PROVE ABSENCE / HUMAN DECISION.

## What this is

A read-only falsification harness. It executes three existing implementations
against THE SAME eight fixtures and verdicts each cell
CORRECT / INCORRECT / INAPPLICABLE with evidence. Nothing here is wired into
any product suite, test suite, or dispatch path. No product tree, worktree,
or served directory is written by this harness.

## The three implementations (read, never modified)

1. **f01** - `~/workspace/f01-fix/mission_runtime.js` (+ `fake_mission_pool.js`).
   Narrowed reaper + parkHold + reconcileHold. Driven for real via
   `harness/h-f01.js` with a controllable clock. f01's own 21/21 and 23/23
   suites are NOT re-run here; the corpus scenarios drive the same real
   methods against the same FakePool pattern.
2. **S5** - the reconcile gate from branch `mc/lane-c-reconcile-gate`
   (commit 25e33e9, `orca-adapter/adapter.js` v1.2.0). `vendor-s5/` holds
   byte-identical harness copies (only a comment header prepended) of the
   four files in the require closure, extracted read-only via
   `git show mc/lane-c-reconcile-gate:<path>`. Driven for real via
   `harness/h-s5.js` through the synthetic `transportFn` seam (no live
   dispatch, no external effects).
3. **classifyUnknownExecution** - `run-state-authority.ts`
   (`~/workspace/tenanos-wave/scratch/swarm02-103/src/tenanos/run/`).
   Imported for real (node type-stripping) by `harness/h-classify.js`;
   no transcription, no re-implementation.

## Verdict rule (uniform, deterministic)

- **CORRECT**: driving the implementation along the fixture's hostile path,
  no fixture-listed hostile outcome is reachable through the implementation's
  own API, and the invariant's required direction holds for everything in
  the implementation's seam (never blindly redispatch an unknown
  consequential effect; HOLD preserved; reconciliation evidence-gated).
- **INCORRECT**: a fixture-listed hostile outcome (blind redispatch /
  re-execution, FAILED-on-unknown, zombie overwrite, ...) IS reachable
  through the implementation's own API. Demonstrated, not asserted.
- **INAPPLICABLE**: the fixture's hostile path and expected behaviors live
  at a seam the implementation does not operate (no relevant API), so it can
  neither pass nor fail them. The evidence names the seam boundary.

INAPPLICABLE is a successful result, not a dodge: the three implementations
live at three different seams (DB runtime / adapter dispatch path / pure
decision function), and naming who owns what is the point of T-06.

## Running

    node run-corpus.js

Writes `results.json` (full per-cell observations + evidence) and prints the
verdict matrix. Exit 0 always (verdicts are data, not failures).
