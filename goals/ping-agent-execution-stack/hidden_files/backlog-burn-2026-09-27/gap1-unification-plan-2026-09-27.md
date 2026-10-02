# Gap-1 unification plan: merging F1, F6, F2, F3 onto the conformance harness branch (2026-09-27)

Read-only planning item. No branches created, no merges performed, no commits.
All conflict predictions are from in-memory `git merge-tree` trials (read-only);
no worktrees created, no checkout touched. No contact with the HPP original repo/site.

## 1. Branch inventory + exact file sets

| Branch | Tip commit | Base | Files touched (diff --stat vs base) |
|---|---|---|---|
| `substrate/gap1-canonical-conformance` (harness) | `38cba5a` | `af001e3` | 7 new: `fyd-lane/canonical-conformance/{README.md,conformance-report.json,driver-ts.mjs,fixture.json,make-fixture.mjs,run-conformance.py}` + gap1 ledger md |
| `substrate/gap1-F1-lane-e-floats` | `9d42351` | `38cba5a` (harness tip) | 1 NEW file: `fyd-lane/lane-e/proof.py` (+181, ADDED whole; was untracked everywhere) |
| `substrate/gap1-F6-lane-e-keyorder` | `c49e892` | `9d42351` (F1 tip) | 1 file modified: `fyd-lane/lane-e/proof.py` (+18/-1) |
| `fix/gap1-f2-absorb-floats` | `2fa9c9b` | `d571362` (mc/sprint-integration-2026-09-27 tip) | 2 NEW files: `fyd-lane/absorb/src/canonical.ts` (+74), `fyd-lane/absorb/test/canonical.test.ts` (+44) |
| `substrate/gap3-journal-identity` (F3 tip) | `9da0ea9` | `e84764e` (Gap-3 commit) | 1 file modified: `fyd-lane/dump.py` (+9/-1) — the F3 sort fix only |

## 2. Lineage: do they share a common base?

- **F1/F6**: already linear on the harness branch. `c49e892` descends
  `af001e3 -> 0e4c543 -> 38cba5a -> 9d42351 -> c49e892`. Fast-forwarding the
  harness branch to `c49e892` is a zero-conflict, zero-content-surprise move.
- **F2**: `merge-base(38cba5a, 2fa9c9b) = d571362` — the F2 base IS an
  ancestor of the harness chain. Same-lineage merge; base is pinned and shared.
- **F3**: `merge-base(38cba5a, 9da0ea9) = af001e3` — the harness chain's own
  base. Shared base, but the F3 tip's ancestry includes the Gap-3 commit
  `e84764e`, whose diff vs `af001e3` is NOT Gap-1 scope:
  `fyd-lane/dump.py` (+605, new), `fyd-lane/journal_identity.py` (+135, new),
  `fyd-lane/lane-f-probe.py` (+29/-2). Any merge of `9da0ea9` into the Gap-1
  chain carries the whole Gap-3 adoption with it — there is no merge-level way
  to take only the 9-line F3 sort change.

## 3. Merge-trial results (git merge-tree, in-memory, read-only)

- **Trial 1**: `git merge-tree d571362 c49e892 2fa9c9b` (F2 into F1/F6 tip).
  Exit 0, **0 conflict markers**. Only adds `fyd-lane/absorb/src/canonical.ts`
  and `fyd-lane/absorb/test/canonical.test.ts` as new files; `proof.py` and
  the harness untouched. Disjoint file sets confirmed.
- **Trial 2**: `git merge-tree af001e3 c49e892 9da0ea9` (F3 tip into F1/F6 tip).
  Exit 0, **0 conflict markers**. Adds `fyd-lane/dump.py` (the F3-fixed,
  journal_identity-importing version) and `fyd-lane/journal_identity.py` as new
  files; `lane-f-probe.py` hunks (Gap-3 pre-flight adoption) apply cleanly
  because the Gap-1 chain never touched that file. **But**: this merge imports
  the entire Gap-3 substrate stream into the Gap-1 branch — a scope decision,
  not a technical conflict.
- Order between F2 and F3 is irrelevant for conflicts (disjoint file sets).
  The only ordering constraint is F6-after-F1, already satisfied by lineage.

## 4. What must NOT be unified yet (stay separate)

1. **The Gap-3 journal-identity module.** `fyd-lane/journal_identity.py` is a
   separate substrate concern (Gap 3, own branch, own stream). Do not let it
   ride into the Gap-1 branch as merge collateral. If the unified Gap-1 branch
   tracks `dump.py`, that `dump.py` carries the Gap-3 `import journal_identity`
   — the two streams become entangled in one branch. See DECISION-NEEDED #2.
2. **F4 (PING `hash-authority.ts`, Pig-side live file).** Not a branch at all;
   the pinned FLOATS_REFUSED requires a Pig-side patch to the live file. It
   stays red in the harness until Pig transport + a Pig-side change happen.
   Never unified.
3. **F5 frozen historical artifacts** (`canonical_authority.js`,
   `unified_event_runtime.js` legacy, `check-stable.py`). Flagged
   non-conformant by design; no fix exists and none is wanted. Never unified.
4. **The product-lane ported copy** `<repo>/src/fyd/data/canonical.ts`
   (`fyd-product-lane/`, frozen for the 19:00 adjudication). F2's caller audit
   explicitly scoped it out. Never touched by unification.
5. **The tree-convention question for untracked operator files.** F1/F6
   committed `fyd-lane/lane-e/proof.py` (untracked in the shared tree
   everywhere, authoritative live copy at `~/workspace/fyd-lane/lane-e/proof.py`
   still UNPATCHED) as a new tracked file; F2 adds the absorb files as new
   tracked files. Merging these into the substrate branch makes them tracked
   on the unified branch — a deliberate tree-convention change, and it does
   NOT patch the shared tree's live copies (promotion is a separate parent
   decision). See DECISION-NEEDED #3.

## 5. Ordered PLAN (execution, not performed here — read-only item)

**Target: `substrate/gap1-canonical-conformance`** (harness lives there;
the runner's path references — `fyd-lane/absorb/src/canonical.ts`,
`fyd-lane/dump.py`, `fyd-lane/lane-e/proof.py` — resolve once the fixes land).

1. **Fast-forward `substrate/gap1-canonical-conformance` to `c49e892`** (F6 tip).
   Covers F1 + F6. Zero conflict by lineage. This alone makes the runner
   harness self-sufficient for `lane-e/proof.py` (no more worktree restoration
   of that file).
2. **Merge `fix/gap1-f2-absorb-floats` (2fa9c9b) onto the result.**
   Trial-verified conflict-free (Trial 1). Adds the two absorb files; the
   TS driver then resolves `fyd-lane/absorb/src/canonical.ts` without
   worktree-only copies.
3. **F3: decide (see DECISION-NEEDED #2), then either:**
   - **3a. Merge `9da0ea9` onto the result** (trial-verified conflict-free,
     Trial 2) — accepts the Gap-3 adoption into the Gap-1 branch; or
   - **3b. Hold F3 on the Gap-3 branch** — the unified Gap-1 branch stays
     without `dump.py`, and verification runs keep restoring the F3-fixed
     `dump.py` (+ `journal_identity.py`) as untracked worktree-only support,
     exactly as F1/F2/F6 did.
4. **Re-run the full harness on the unified branch** from a clean worktree:
   ```
   cd fyd-lane/canonical-conformance
   python3 run-conformance.py --report conformance-report.json
   echo $?
   ```
   Under 3a all runner path references resolve from the tree alone. Under 3b
   restore `dump.py` + `journal_identity.py` from the Gap-3 commit `9da0ea9`
   (post-F3 blob) as untracked worktree-only support first — never committed.
5. **Expected verdict (which cases flip, which stay red):**
   - `[live] lane-e/proof.py`: CONFORMANT, 10/10 applicable, 1 SKIP (ts-only
     `undefined-to-null`). The 5 F1 float cases and the F6 astral case flip PASS.
   - `[live] absorb/canonical.ts`: CONFORMANT, 11/11. The 2 finite-float
     `FLOAT_ACCEPTED` cases flip PASS.
   - `[live] dump.py`: CONFORMANT, 10/10 applicable (under 3a; under 3b with
     the restored blob). The `astral-key-order` case flips PASS.
   - `[ref] hash-authority.ts`: still NON_CONFORMANT — 5 float cases stay red
     (F4, Pig-side live file, no branch exists to unify).
   - `[hist] check-stable.py`, `[hist] CanonicalBytes.serialize`,
     `[hist] legacy top-level stringify`: still flagged NON_CONFORMANT
     (F5 frozen, by design).
   - Derived totals: **44 PASS / 30 FAIL / 3 SKIP of 77** (baseline committed
     report was 35/39/3; flips: +5 F1, +1 F6, +2 F2, +1 F3). Runner exit stays
     **1 (NON_CONFORMANT)** — honestly so, until F4 lands Pig-side.
   - Regression bar: no case that was PASS on the committed baseline
     (`conformance-report.json` @ `38cba5a`) may become non-PASS.
6. Commit the new conformance report + unification ledger on the unified
   branch (evidence of the unified verdict).

## 6. DECISION-NEEDED (owner's word required)

1. **Unification target branch.** Recommended:
   `substrate/gap1-canonical-conformance` (fast-forward to `c49e892`, then
   merge F2, then resolve F3). Alternative: a fresh `substrate/gap1-unified`
   branch off `c49e892`. Either way local-only, never pushed.
2. **F3 route: 3a (merge whole Gap-3 stack) or 3b (hold F3 on the Gap-3
   branch)?** 3a is conflict-free but entangles the Gap-3 journal-identity
   module into the Gap-1 branch; the harness then tracks a `dump.py` that
   imports a Gap-3 module. 3b keeps streams separate (matches the F1/F2/F6
   pattern and the task's "Gap-3 journal-identity is a separate substrate
   concern"), at the cost of the harness remaining unrunnable from a clean
   checkout for the `dump.py` adapter without worktree-only restoration.
   Note: even under 3a, `dump.py`'s `import journal_identity` resolves because
   the merge brings the module along.
3. **Tree-convention for untracked operator files.** Unification makes
   `fyd-lane/lane-e/proof.py` and the two absorb files tracked on the
   substrate branch. Confirm this is the intended convention (the shared
   tree's live copies remain untracked and UNPATCHED either way; promoting
   the fixes to the shared tree is a separate decision and is NOT part of
   unification).
4. **Scope freeze on the unified branch.** After unification, the branch is the
   verification home for Gap-1 only; no new streams merge onto it without a
   plan item. (Standing rule: each substrate concern keeps its own branch.)

## Verification of this plan (what was actually checked)

- `git log`/diff --stat per branch vs its base (Section 1).
- Tracked-vs-absent matrix for the four fix files at `38cba5a`, `d571362`,
  `e84764e` (Section 2: absorb/proof.py absent everywhere except their fix
  tips; dump.py tracked only on the Gap-3 chain).
- Merge-bases: `38cba5a`+`2fa9c9b` -> `d571362`; `38cba5a`+`9da0ea9` ->
  `af001e3`; `38cba5a`+`c49e892` -> `38cba5a` (ancestor).
- In-memory `git merge-tree` trials for the F2 merge and the full-F3-tip
  merge: exit 0, zero conflict markers in both.
- Harness adapter path references on the gap1 tip confirm steps 1-3 make the
  runner self-sufficient under route 3a (absorb, dump.py, proof.py all
  resolve from the tree).

UNKNOWN: nothing material is unknown for the merge mechanics themselves. The
expected runner totals (44/30/3) are a derived expectation from the four fix
ledgers' recorded flips, not a fresh run — the unified branch does not exist
yet, so the runner has not been executed on it.
