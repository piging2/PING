# Substrate Gap 4 core implementation (2026-09-27 ~12:30-13:00 MDT)

Worker: implementation subagent (depth 2). Branch `substrate/gap4-binding-lint`,
local commit `e7c0ccf`, NO PUSH. Work done in a dedicated worktree
`~/workspace/.worktrees/substrate-gap4` off `mc/sprint-integration-2026-09-27`;
the shared checkout's branch was never switched and carries no new changes.

Design: `substrate-gap4-binding-lint-design-2026-09-27.md` (verdict
NEEDS-DECISION). Resolved before implementation (SI-03-logged
`~/workspace/fyd-autonomy/escalation-log.jsonl`, 2026-09-27 17:51:49Z):
- Q1 DECIDED: home `fyd-lane/substrate/binding-lint/binding-lint.py`.
- Q2 DECIDED: mutation-path reads inventoried-but-exempt (`kind: mutation-path`).
- Q3 ESCALATED (queued for Nolan): website-tree work was PROOF-AGAINST-SCRATCH-COPY
  ONLY. Done: F3 inventory on a /tmp copy of `lane-p01/tree/src/components/ping`;
  no enforcement config committed against the live tree; scratch deleted after.

## What was built

`fyd-lane/substrate/binding-lint/` (11 files, 1038 insertions, commit e7c0ccf):
- `binding-lint.py` - the single substrate authority. Three parameterized inputs
  per design (accessor regexes, scan root, allowlist path); four surface kinds
  (`presentation`, `journal-projection`, `mutation-path`, `authority`);
  scheme-versioned allowlists (`repo-root-relative/1`; `absolute-path/0` for
  `--rekey` migration reads only; unknown scheme = exit 2 naming it);
  `--inventory` / `--check` / `--probe` / `--rekey`; typed verdicts
  (UNCOVERED_READ, OUT_OF_ROOT, STALE_ALLOWLIST_ENTRY, DECLARATION_VIOLATION,
  PROFILE_ERROR); exit codes 0/1/2. Strict profile schema (unknown keys,
  bad regexes, unknown kinds all fail closed at exit 2).
- `profiles/` - fyd-012.json (legacy compat), synth-data.json (F2),
  journal-shape.json (F5), rekey.json (F4). Onboarding = config only.
- `fixtures/` - synth-data/a.ts, journal-shape/{violating,clean}.ts,
  rekey/old-tree.ts.
- `verify-gap4.py` - the falsification runner (34 checks), self-cleaning /tmp.
- `README.md` - contract summary.

## Falsification results (verify-gap4.py: ALL 34 CHECKS PASS)

- **F1 byte-equivalence**: new `--profile --check` vs legacy
  `fyd012-binding-coverage.py --check` on `fyd-build/.../renderer.tsx`:
  stdout byte-identical, same rc (PASS, 5 allowlisted reads). Probe-file check:
  byte-identical, both rc=1 naming `__fyd012BypassProbe`/`bypass_probe`.
  `--inventory` byte-identical. Caveat (honest): `fyd-build/` is UNTRACKED in
  the shared repo so the worktree lacks it; F1 ran a /tmp profile identical to
  the committed `profiles/fyd-012.json` except `scan_root` pinned absolutely to
  `/home/hatch/workspace/fyd-build`. scan_root is the parameterized input under
  test, so the equivalence proof covers the linter core exactly.
- **F2 synthetic family**: `.data` accessor profile, config-only. `--inventory`
  found the 2 reads (`getBoundData`, `renderLabel`); justified via inventory ->
  `--check` PASS. `--probe` bit the planted `o.data["__binding_lint_probe__"]`
  (rc=1, named `__bindingLintProbe` line, PROBE PASS); output contains no
  `.fields`, proving the plant is config-driven.
- **F4 scheme migration**: crafted `absolute-path/0` allowlist (same checkout)
  -> `--check` exits 2 naming the scheme (fail-closed, never checked);
  unknown `bogus/9` -> exit 2 naming it. `--rekey` produced
  `repo-root-relative/1` entries keyed by new IDs, category/justification
  preserved verbatim; `.rekey-report.json` archived (0 dropped, 0 unkeyed);
  rekeyed allowlist `--check` PASS; old IDs cannot pass under the new scheme.
- **F5 declaration**: `kind: journal-projection` + planted `.fields` read ->
  DECLARATION_VIOLATION, rc=1, names `sneakGraph`. Clean file -> PASS
  ("declaration holds").
- **Q2 kind**: `mutation-path` profile over the rekey fixture -> rc=0,
  "inventory-only: 2 inventoried read(s)" (inventoried, exempt).
- **F3 scratch proof**: /tmp copy of `lane-p01/tree/src/components/ping`,
  config-only profile, `--inventory` -> 6 occurrences across 2 files
  (`ping/node-sections.tsx`: 3, `ping/object-preview.tsx`: 3), matching the
  design survey's read sites. Scratch deleted after (verified absent).
- Edge checks (manual): bad accessor regex / unknown kind / unknown profile
  key all -> exit 2 with named PROFILE_ERROR. Stale allowlist entry ->
  PASS rc=0 with `STALE_ALLOWLIST_ENTRY` hygiene note (not a failure).
  `--probe` on the real FYD profile: planted read at renderer line 1041,
  PROBE PASS.

## Boundaries held

No pushes/merges (local commit only); HPP original untouched; no credentials;
no broad process kills; no Pig reads/writes; :3100/:3200 and frozen trees
untouched; website-tree onboarding proof-only in scratch, deleted after, no
enforcement config committed. No em dashes in written artifacts.

## Revisit items (for the parent/backlog, not this worker)

- Q2 revisit exists per the decision: flip `mutation-path` profiles to
  enforcement later with evidence.
- Q3 still queued for Nolan: enforce on website-tree product surfaces.
- `profiles/fyd-012.json` pins `scan_root: "fyd-build"` (repo-relative); it
  executes verbatim only in checkouts where `fyd-build/` exists at top level.

## Verdict

GAP4-IMPL VERIFIED
