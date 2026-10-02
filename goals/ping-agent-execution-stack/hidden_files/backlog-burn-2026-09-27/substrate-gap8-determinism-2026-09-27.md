# Substrate Gap 8 Implementation Ledger: determinism-probe shared contract

Date: 2026-09-27. Item: Substrate Gap 8 (recon lines 212-226).

## Pattern catalog (both probes read in full)

### fyd-lane/check-stable.py (projection byte-stability, before)

- Volatile fields: `meta.dumpedAt`, overwritten post-load with the literal
  `"NORMALIZED"` before encoding (output-side masking).
- Normalization: `json.load` of the on-disk projection, then field
  overwrite, then `json.dumps(d, sort_keys=True, separators=(",", ":"))`
  to UTF-8 bytes. Key order canonicalized, not treated as volatile.
- Two-run procedure: one process, two sequential subprocess invocations of
  the dump generator; each rewrites the same file; both outputs loaded,
  normalized, encoded, SHA-256 compared.
- Exit codes: 0 + `BYTE_STABLE` on digest match; 1 + `NOT_STABLE`
  otherwise. Prints `run1`/`run2` 16-hex-char digest prefixes.
- Portability defect: Pig paths hardcoded as defaults (generator
  `/home/nolan/ping/tools/fyd-site-projection/dump.py`, projection
  `/home/nolan/ping/var/fyd-projections/coppersmith-plumbing.json`,
  tenant `coppersmith-plumbing`, env `FYD_OVERLAY_JOURNAL=demo`).

### fyd-lane/repo/determinism-probe.ts (semantic render model)

- Volatile fields: none masked in the probe. Normalization is
  input-side pinning in `repo/render-model.test.ts`: the spec is generated
  once with `FIXED_GENERATED_AT="2026-09-21T13:50:00Z"` (as `generatedAt`
  and `asOf`), so no wall-clock value enters the render path.
- Canonical encoding: `canonicalizeModel(model)` (carries
  `RENDER_MODEL_VERSION`).
- Two-run procedure: two separate OS processes
  (`tsx determinism-probe.ts <input.json> <output.txt>`), fresh module
  state each; harness reads both outputs, byte-compares with jest
  `expect(...).toEqual`.
- Exit codes: probe itself exits 0 after writing canonical bytes (silent
  stdout), 1 with stderr diagnostic on usage/input/read/write errors. The
  STABLE/NOT_STABLE verdict lives in the jest test, not the probe.
- Documented instability classes: `Date.now()`, `Math.random()`, module
  counters, unstable ordering, process-dependent ids.

## Delta shipped

1. `fyd-lane/substrate/determinism-probe/CONTRACT.md` (new): the shared
   contract. Five clauses: (1) volatile normalization via strategy A
   (output-side masking) or B (input-side pinning), declared per field;
   (2) canonical byte encoding (byte identity, sorted keys, UTF-8);
   (3) two-run procedure with fresh processes; (4) exit-code semantics
   0=BYTE_STABLE / 1=NOT_STABLE with named divergence / 2=probe error
   (misuse never masquerades as a verdict); (5) portability: no hardcoded
   host paths in defaults, Pig paths as explicit overrides only.
2. `fyd-lane/check-stable.py` (modified in place; backup at
   `fyd-lane/check-stable.py.bak-2026-09-27`): parameterized by
   `--gen-cmd`/`--gen-arg` (generator command), `--projection` (path),
   `--volatile` (repeatable dotted paths, also `DET_PROBE_VOLATILE` env),
   `--env` (repeatable generator env), `--sentinel`, `--label`. The only
   remaining `/home/nolan` references are the docstring's explicit Pig
   override example (verified by grep). Divergence on exit 1 names the
   first differing byte offset and the divergent top-level keys. Declared
   volatile absent from output = exit 2 (schema change), not a pass.
   Backup note: the first `cp` ran after the rewrite (slow background
   grep ahead of it in the same command chain), so it captured the new
   file; the backup was re-pointed to the true original content,
   recovered verbatim from the pre-edit read. Backup is 927 bytes,
   byte-matching the original.
3. `fyd-lane/substrate/determinism-probe/fixtures/gen-projection.py`
   (new): scratch projection generator for falsification. Flags:
   `--fixed-dumped-at` (pin the volatile), `--leak` (inject undeclared
   volatile `data.leakedAt`).

## Falsification (all local, ephemeral /tmp projection, no ports at all)

Test 1, known-stable projection, live volatile `meta.dumpedAt` declared:
```
run1 gap8-t1 1aa7ca8e5eccf500
run2 gap8-t1 1aa7ca8e5eccf500
BYTE_STABLE
EXIT=0
```

Test 2, volatile flipped to non-volatile (`--fixed-dumped-at`), same
declaration:
```
run1 gap8-t2 1aa7ca8e5eccf500
run2 gap8-t2 1aa7ca8e5eccf500
BYTE_STABLE
EXIT=0
```
Identical digest to test 1: normalizing an already-constant field is
harmless.

Test 3, real instability (`--leak` injects undeclared `data.leakedAt`):
```
run1 gap8-t3 44ebcff3c855ae5c
run2 gap8-t3 eda7f97b543f009d
NOT_STABLE
divergence: first byte difference at offset 41 (run1 333 bytes, run2 333 bytes)
divergent top-level keys: data
EXIT=1
```

Bonus, error path: declared volatile absent (`meta.noSuchField`):
```
determinism-probe: declared volatile field 'meta.noSuchField' absent from projection (schema change?)
EXIT=2
```

## Boundaries and provenance

- Both touched files were untracked operator tools (`git status` shows
  `??` for both; `git ls-files fyd-lane/repo/` is empty), so no branch or
  worktree was needed: worked in place with a dated backup of the
  original `check-stable.py`. No pushes, no merges.
- Pig transport is down; no Pig contact was made or needed. The Pig
  invocation survives only as a documented explicit-override example in
  the docstring.
- No dependents on `check-stable.py` (scoped grep over `fyd-lane/` finds
  only the script itself and CONTRACT.md; a later full-workspace grep
  found only prose references in the recon and gap1/gap2 ledgers plus
  agent tool-output logs, no code dependents).
- No ports used at all; :3100/:3200 untouched. HPP original untouched. No
  credentials, no broad process kills, no outbound sends.

## Verdict

GAP8-IMPL VERIFIED
