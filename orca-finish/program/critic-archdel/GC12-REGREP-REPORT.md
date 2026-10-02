# GC-12 Re-grep Report (2026-09-24 ~03:35 UTC)

Parent-ordered remediation for generic cluster GC-12 (single-quote-only deadness
grep): re-grep ALL 24 proven-dead claims for double-quoted requires before any
deletion decision.

## Method
Script: `gc12-regrep.sh` (this directory). Ran on the Pig against
`/home/nolan/ping` @ `cc6856c3b` (`refactor/runtime-authority-convergence`,
17 dirty files, same base the docket was built on).

For each dead module basename, matched ALL of these in one pass:
- `require('...')`, `require("...")`, `` require(`...`) `` (any path prefix, optional `.js`/`.ts`)
- `from '...'`, `from "..."`, `` from `...` `` (ES imports and re-exports)
- `import('...')`, `import("...")` (dynamic import)

Plus per-entry specials: D-11/D-12 path-fragment forms, D-13 TS imports,
D-14 type identifier, D-15 `.execute(` callers, D-16 subclass instantiations,
D-20 module + `AdvisoryLock` identifier, D-22 temporal mentions in the live
gateway_runtime, D-24 line-95 verification.

The module's own file and `RepositoryKnowledgeIndex/dependency_graph.json`
were excluded from hits (self-references / generated index).

## Result: 24/24 SURVIVE

21 entries CLEAN in all quote forms. 3 entries had hits, all triaged non-live:

- **D-2, D-3, D-7**: hits only in
  `worktrees/oracle-assembly/oracle-assembly-patches/gateway/bootstrap/gateway_runtime.js`
  (`require('../commit_authority')`, `require('../patch_authority')`,
  `require('../filesystem_authority')` at lines 433-435). That bundle is
  UNTRACKED, UNREFERENCED by anything in the tracked tree (`git grep` empty),
  and week-old (2026-09-16). It is a stale patch staging copy, not the live
  path. Verdicts STAND for the tracked repo.
  HYGIENE NOTE: applying `oracle-assembly-patches` would resurrect requires of
  D-2/D-3/D-7 and instantiate `new FilesystemAuthority(...)`. Do not apply
  without re-review.
- **D-22a**: hits are the already-known dead `ping-runtime/temporal/index.js:7`
  (recorded in the docket) plus an identical copy at
  `worktrees/jev-surgical/ping-runtime/temporal/index.js:7` (same dead file in
  a preserved worktree; left untouched). Verdict STANDS.

Additional verifications:
- D-24: `/home/nolan/crx/app/main.py:95` is `print(app.routes)` — present.
- D-22: live `gateway/bootstrap/gateway_runtime.js` contains ZERO
  case-insensitive "temporal" mentions — claim stands.

## Conclusion
The GC-12 quoting blind spot produced ZERO new live callers in the tracked
tree. The remediation is complete for the quoting dimension. Deletion decisions
remain gated on Nolan's explicit word (unchanged); the docket's confidence is
not reduced by this pass.

Scope note: this pass closed the quoting blind spot only. It did not re-do the
189-file live-closure analysis, which stands as independently verified by the
archdel lane.
