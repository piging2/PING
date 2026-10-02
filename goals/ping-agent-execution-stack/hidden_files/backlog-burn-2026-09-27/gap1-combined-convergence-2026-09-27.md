# Gap-1 combined convergence run (2026-09-27 ~12:10 MDT)

Subagent: backlog-burn (parent: main agent). Pig transport down; local only.

## Why

F1 (lane-e float refusal, 9d42351), F2 (absorb finite-float rule, 2fa9c9b),
F3 (dump.py UTF-16 key order, 9da0ea9), and F6 (lane-e UTF-16 key order,
c49e892) were each VERIFIED in isolation, but no single harness run ever had
all fixes together. This run assembles them into one tree and re-runs the
pinned conformance harness — the convergence evidence Nolan needs for the
queued Gap-1 unification decision.

## Assembly (read-only extraction, nothing committed)

- Worktree: `~/workspace/.worktrees/gap1-combined` (detached HEAD at
  38cba5a, the `substrate/gap1-canonical-conformance` harness home).
  **Removed after the run** (`git worktree remove --force`); the shared
  checkout was never touched.
- Untracked worktree-only files, extracted via `git cat-file -p`
  (byte sizes verified non-zero after extraction, per the F6 lesson):
  - `fyd-lane/dump.py` <- 9da0ea9 (F3 fix; 28161 bytes; `_utf16_sort_key` x2)
  - `fyd-lane/journal_identity.py` <- e84764e (Gap-3 blob; 5741 bytes)
  - `fyd-lane/lane-e/proof.py` <- c49e892 (F1+F6; 7954 bytes; `_refuse_floats` x4)
  - `fyd-lane/absorb/src/canonical.ts` <- 2fa9c9b (F2 fix; 3632 bytes;
    `Number.isInteger` x2)
  - `fyd-lane/harvest-wave1/code-evidence/{hash-authority.ts,canonical_authority.js,unified_event_runtime.js}`
    copied read-only from the shared tree.

## Result

Runner: `fyd-lane/canonical-conformance/run-conformance.py`
Report: `gap1-combined-report-2026-09-27.json` (this directory)

- **Totals: 44 PASS / 30 FAIL / 3 SKIP** (committed baseline 35/39/3;
  F6 alone 41/33/3).
- Per-implementation verdicts:
  - `[live] absorb/canonical.ts` — **CONFORMANT** (F2 fix holds in combination)
  - `[live] dump.py` — **CONFORMANT** (F3 fix holds in combination)
  - `[live] lane-e/proof.py` — **CONFORMANT** (F1+F6 fixes hold in combination)
  - `[ref] hash-authority.ts` — NON_CONFORMANT, exactly 5 fails, all
    float-refusal (FLOAT_ACCEPTED x2, NONFINITE_SERIALIZED x3) = **F4**,
    the Pig-side evidence copy; needs transport recovery.
  - `[hist] check-stable.py` — NON_CONFORMANT, 7 fails (by design, F5)
  - `[hist] CanonicalBytes.serialize` — NON_CONFORMANT, 8 fails (by design, F5)
  - `[hist] legacy top-level stringify` — NON_CONFORMANT, 10 fails
    (by design, F5; includes the NESTED_KEYS_DROPPED finding)
- **All 30 remaining failing case-runs are exactly F4 + the three
  by-design historical implementations. Zero live-implementation
  divergences remain.**

## What this closes and what it does not

- Closes: the question "do the four fixes compose?" — yes, with zero
  cross-implementation interference. Every live canonicalizer now agrees
  byte-for-byte on the fixture and refuses floats per the pinned
  FLOATS_REFUSED semantic.
- Does not close: F4 (needs the Pig), F5 (by design, historical artifacts
  stay flagged), or the unification/promotion decisions themselves (branch
  merge strategy, untracked-file tracking conventions, FYD-012 canonical
  invocation pinning) — those remain queued for Nolan.

## New backlog item (from this run)

None — the run confirmed the existing item list is complete and correctly
scoped. The F1 open item #3 (lane-e astral-key-order with no assigned
follow-up) is now MOOT: F6 fixed it and the combined run proves it.

## Reproduction (2026-09-27 ~13:05 MDT)

Rebuilt the detached worktree from the same four commits and re-ran the
pinned harness. The second report is **byte-identical to the first**
(excluding run timestamps): same verdict NON_CONFORMANT, same 30 failing
case-runs, same per-implementation verdicts. The convergence result is
deterministic and reproducible, not a one-off. Temporary worktree removed
after the run; shared checkout untouched.
