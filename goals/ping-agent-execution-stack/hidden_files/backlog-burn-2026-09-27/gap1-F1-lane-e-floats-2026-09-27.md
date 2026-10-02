# Gap-1 F1 ledger: lane-e/proof.py::canon refuses floats (2026-09-27)

## Authoritativeness check (NOT a Pig-side mirror)

- `lane-e/proof.py` is classified **[live]** in the Gap-1 ledger, with source
  `fyd-lane/lane-e/proof.py::canon`. It is the VM copy, not an ingested
  evidence copy (contrast F4 `hash-authority.ts`, explicitly flagged as such).
- The file is **untracked in git everywhere**: `git ls-files` empty on every
  branch; `git log --all -- fyd-lane/lane-e/proof.py` empty; not gitignored.
  The Pig holds only the projection data the script reads
  (`/home/nolan/ping/var/fyd-projections/happy-place.json`), not the script.
- Conclusion: the VM copy is authoritative; patching is legitimate.
  F1 was NOT queued on transport.

## Branch + commit (local only, never push)

- Worktree: `~/workspace/.worktrees/gap1-f1` (dedicated; shared checkout untouched)
- Branch: `substrate/gap1-F1-lane-e-floats` (off `substrate/gap1-canonical-conformance` @ `38cba5a`)
- Commit: `9d42351` "substrate Gap 1 F1: lane-e/proof.py::canon refuses floats per pinned FLOATS_REFUSED"
- Committed file: `fyd-lane/lane-e/proof.py` only (explicit pathspec).

## Patch (smallest delta)

```python
def _refuse_floats(v):
    """Pin FLOATS_REFUSED: any float (finite, NaN, +/-Infinity), nested or
    not, makes canon refuse instead of serializing. Mirrors dump.py's
    canonicalize refusal (TS/Python float serialization differs)."""
    if isinstance(v, float):
        raise ValueError("canon: float refused (TS/Python serialization differs)")
    if isinstance(v, dict):
        for x in v.values():
            _refuse_floats(x)
    elif isinstance(v, (list, tuple)):
        for x in v:
            _refuse_floats(x)


def canon(v):
    _refuse_floats(v)
    return json.dumps(v, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
```

- Mirrors `dump.py::canonicalize`'s refusal (`isinstance(v, float)` check,
  `ValueError("... float refused (TS/Python serialization differs)")`).
- Recursive walk covers nested floats (`float-nested` fixture case); bool
  unaffected (`isinstance(True, float)` is False); tuple handled for safety.
- No other serialization behavior changed (sort order, separators,
  `ensure_ascii=False` all untouched).

## Harness proof

Runner: `fyd-lane/canonical-conformance/run-conformance.py`. The worktree's
branch tree lacked runner dependencies, so these were restored as
**untracked worktree-only support** (not committed):

- `fyd-lane/dump.py` + `fyd-lane/journal_identity.py` from the Gap-3 branch
  commit `e84764e` (the Gap-1 ledger's recorded authoritative blob;
  `journal_identity.py` is required by dump.py's Gap-3 import)
- `fyd-lane/harvest-wave1/code-evidence/{hash-authority.ts,canonical_authority.js,unified_event_runtime.js}`
  and `fyd-lane/absorb/src/canonical.ts` copied from the shared tree
  (TS drivers reported ADAPTER_ERROR without them; final run has 0 adapter errors)

Results (case-by-case diff of `/tmp/gap1-f1-after2.json` against the
committed Gap-1 report `conformance-report.json` @ `38cba5a`):

- **Exactly 5 diffs, all the F1 target cases**, lane-e/proof.py:
  `float-finite` FLOAT_ACCEPTED -> PASS (REFUSED_AS_PINNED),
  `float-nested` FLOAT_ACCEPTED -> PASS (REFUSED_AS_PINNED),
  `float-nan` NONFINITE_SERIALIZED -> PASS (REFUSED_AS_PINNED),
  `float-inf` NONFINITE_SERIALIZED -> PASS (REFUSED_AS_PINNED),
  `float-neginf` NONFINITE_SERIALIZED -> PASS (REFUSED_AS_PINNED).
- **Regressions: 0** across all 77 case-runs and all 7 implementations
  (no committed-PASS case became non-PASS).
- lane-e/proof.py now: **9 PASS / 1 FAIL / 1 SKIP** of 11 cases
  (was 4/6/1). Remaining FAIL: `astral-key-order` (KEY_SORT_ASTRAL,
  pinned KEY_ORDER_UTF16) — **out of F1 scope**; F1 is floats-only and the
  task forbade other behavior changes. Note: the Gap-1 follow-up list
  assigns lane-e's astral divergence to no item (F3 is dump.py's sort);
  flagging for parent triage.
- Totals: 40 PASS / 34 FAIL / 3 SKIP (committed: 35/39/3). Overall runner
  verdict still **NON_CONFORMANT, exit 1** — expected: F2
  (absorb finite floats), F3 (dump.py astral sort), F4 (reference floats)
  remain divergent live code.

## Implementation tests

- No unit test suite exists for `lane-e/proof.py` (confirmed per the Gap-1
  ledger: "no unit suites exist; their tests are live proof runs requiring
  the Pig + :3100", unavailable). Not invented.
- Sanity check run (`/tmp/gap1-f1-sanity.py`): byte-exact outputs preserved
  on normal values (`{"b":2,"a":[1,{"z":null,"y":true}]}` sort order,
  unicode BMP raw, empty dict, ints, bools, None, strings with `: ,`);
  8 float shapes all raise ValueError with "float refused" (finite,
  nested, NaN, +Inf, -Inf, top-level list, tuple, deep nesting).
  All assertions pass.

## Open items for parent

1. **Promotion**: the fix is committed on the local F1 branch only. The
   shared tree's authoritative live copy
   (`~/workspace/fyd-lane/lane-e/proof.py`, untracked) is **unpatched**.
   Merge/apply decision is parent's (the file is deliberately untracked in
   every branch; committing it on the substrate branch is a tree-convention
   change worth a conscious call).
2. **Runner usability**: the substrate branch cannot run the harness from a
   clean checkout alone — it needs `dump.py`/`journal_identity.py` (Gap-3
   stream, untracked there) and the TS source trees. Until the Gap-3 stream
   lands, each F-verifier must restore them as I did.
3. **lane-e astral-key-order** (KEY_SORT_ASTRAL) remains failing with no
   assigned follow-up (F1–F5 cover floats + dump.py sort + reference).
   Needs triage as a new item if the UTF-16 sort pin is meant to cover
   lane-e's live canon.

## Verdict

**F1 VERIFIED** — evidence: commit `9d42351` on local branch
`substrate/gap1-F1-lane-e-floats`; harness diff shows exactly the 5
lane-e float throw-cases flipped FAIL -> PASS (REFUSED_AS_PINNED) with
0 regressions against the committed Gap-1 report; sanity check confirms
no other serialization behavior changed.
