# Gap-1 F6 ledger: lane-e/proof.py::canon sorts keys in UTF-16 code-unit order (2026-09-27)

## Authoritativeness check (NOT a Pig-side mirror)

- `lane-e/proof.py` is classified **[live]** in the Gap-1 ledger, with source
  `fyd-lane/lane-e/proof.py::canon`. It is the VM copy, not an ingested
  evidence copy. Per the F1 ledger: untracked in git everywhere, not
  gitignored; the Pig holds only the projection data the script reads, not
  the script. Conclusion: the VM copy is authoritative; patching is
  legitimate. F6 was NOT queued on transport.

## Branch + commit (local only, never push)

- Branch: `substrate/gap1-F6-lane-e-keyorder` (off
  `substrate/gap1-F1-lane-e-floats` @ `9d42351`)
- Commit: `c49e892` "substrate Gap 1 F6: lane-e/proof.py::canon sorts keys
  in UTF-16 code-unit order per pinned KEY_ORDER_UTF16"
- Committed file: `fyd-lane/lane-e/proof.py` only (explicit pathspec;
  18 insertions, 1 deletion). Untracked harness support files
  (`dump.py`, `journal_identity.py`, TS sources) were restored
  worktree-only and never committed.
- The F1 worker's dedicated worktree (`~/workspace/.worktrees/gap1-f1`)
  was never touched; F6 worked in its own worktree, removed after commit.
- No pushes, no merges. Shared checkout never switched branches.

## Patch (smallest delta)

Same technique as the F3 fix for `dump.py` (`_utf16_sort_key` via
`key.encode("utf-16-be")`):

```python
def _utf16_sort_key(s):
    """Pin KEY_ORDER_UTF16: JS Object.keys().sort() sorts UTF-16 code units.
    Python sorted() uses code-point order and diverges on astral-plane
    keys. utf-16-be encodes without a BOM, so byte order == code-unit
    order. Same technique as dump.py's canonicalize."""
    return s.encode("utf-16-be")


def _sort_keys_utf16(v):
    if isinstance(v, dict):
        return {k: _sort_keys_utf16(v[k]) for k in sorted(v, key=_utf16_sort_key)}
    if isinstance(v, (list, tuple)):
        return [_sort_keys_utf16(x) for x in v]
    return v


def canon(v):
    _refuse_floats(v)
    return json.dumps(_sort_keys_utf16(v), separators=(",", ":"),
                      ensure_ascii=False)
```

- `json.dumps`'s `sort_keys=True` offers no key function, so the recursive
  UTF-16 pre-sort replaces it (dict insertion order preserves the sorted
  order at emit time). Recursion preserves nested key sorting and array
  order; bool/int/None/str handling untouched; F1's `_refuse_floats`
  gate runs first, unchanged.
- Nothing else in `proof.py` changed.

## Harness proof

Runner: `fyd-lane/canonical-conformance/run-conformance.py`. Untracked
worktree-only support restored exactly as F1 did: `fyd-lane/dump.py` +
`fyd-lane/journal_identity.py` from the Gap-3 commit `e84764e`
(pre-F3 blob, so dump.py's astral case stays KEY_SORT_ASTRAL FAIL as in
F1's run), TS sources from the shared tree. Evidence JSON saved at
`hidden_files/backlog-burn-2026-09-27/f6-evidence/gap1-f6-after.json`
(+ harness stdout alongside).

Case-by-case diff of the F6 run against F1's after-run
(`/tmp/gap1-f1-after2.json`, 77 case-runs both):

- **Exactly 1 diff, the F6 target case:** lane-e/proof.py
  `astral-key-order` FAIL (`KEY_SORT_ASTRAL`) -> PASS (`BYTES_MATCH`).
- **Regressions: 0** across all 77 case-runs and all 7 implementations
  (no F1-PASS case became non-PASS).
- lane-e/proof.py is now **CONFORMANT**: 10/10 applicable PASS, 1 SKIP
  (`undefined-to-null` is ts-only).
- Totals: **41 PASS / 33 FAIL / 3 SKIP** (F1: 40/34/3).
- The 5 F1 float cases stay PASS (`REFUSED_AS_PINNED`).
- Overall runner verdict still **NON_CONFORMANT, exit 1** — expected:
  F2 (absorb finite floats), F3 (dump.py astral sort), F4 (reference
  floats) remain divergent live code, and the historical artifacts stay
  flagged. Out of F6 scope.

## Implementation tests

- No unit test suite exists for `lane-e/proof.py` (per the Gap-1 ledger;
  its tests are live proof runs requiring the Pig + :3100, unavailable).
  Not invented.
- Sanity check (F1's shapes reproduced + astral additions): byte-exact
  outputs preserved on all F1 normal values (sort order, unicode BMP
  raw, empty dict, ints, bools, None, `: ,` in strings); 8 float shapes
  all raise `ValueError` with "float refused"; astral keys now emit in
  pinned JS order (`{"z":1,"<U+1F600>":2,"<U+E000>":3}`), incl. nested.
  All assertions pass (19/19).

## Incidents during this item (process notes, not ledger items)

1. `git show e84764e:fyd-lane/dump.py > fyd-lane/dump.py` produced a
   0-byte file while the same blob read fine via `git cat-file`
   (27803 bytes). Re-extracted with `git cat-file blob`. Lesson:
   verify restored bytes (wc + grep) before running the harness, don't
   trust a silent redirect.
2. The branch `substrate/gap1-F1-lane-e-floats` was already checked out
   in the F1 worker's worktree, so F6 used its own branch
   `substrate/gap1-F6-lane-e-keyorder` off F1's HEAD (same lineage,
   cleaner than a detached re-add).
3. /tmp (512M tmpfs) hit 100% mid-item (another worker's 460M scratch),
   failing the first harness report write and TS support-file restores.
   Moved the worktree to `~/workspace/.worktrees/gap1-f6` (overlay fs;
   established convention from the F1 worker), reran cleanly. Did not
   touch other workers' files.

## Open items for parent

1. **Promotion**: the fix is committed on the local F6 branch only. The
   shared tree's authoritative live copy
   (`~/workspace/fyd-lane/lane-e/proof.py`, untracked) is **unpatched**
   (same promotion question F1 raised; still parent's call).
2. With F6 done, lane-e is fully conformant on applicable cases.
   Remaining live divergences: F2 (absorb finite floats), F3 (dump.py
   astral sort), F4 (reference floats, Pig-side).

## Verdict

**F6 VERIFIED** — evidence: commit `c49e892` on local branch
`substrate/gap1-F6-lane-e-keyorder`; harness diff against F1's after-run
shows exactly the lane-e `astral-key-order` case flipped FAIL ->
PASS (`BYTES_MATCH`) with 0 regressions across all 77 case-runs; the 5
F1 float cases stay PASS; sanity check confirms no other serialization
behavior changed.
