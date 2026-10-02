# F225 DECISION — FilesystemAuthority: ARCHIVE (do not wire). WorkspaceRegistry reference: PHANTOM (no action).

Date: 2026-09-24 ~05:30 UTC. Decider: constitutional-sprint continuation coordinator (YOLO, 80%+ rule).
Status: PROPOSE-ONLY for the live runtime (/home/nolan/ping). No live file modified. COMMITS CREATED: NONE.

## WHY
A dormant module with a known latent root-escape defect must not be wired into the live
path without a live consumer. Wiring it would create a fourth File-object creation
mechanism competing with createCanonicalObject (Agent 20 row 16: "the cleanest convergence
in the sweep"), violating ONE authority per decision.

## EVIDENCE
- DORMANT (zero live requires): `grep -rln "require.*filesystem_authority\|from.*filesystem_authority"`
  over /home/nolan/ping (excluding node_modules, worktrees, docs) returns EMPTY. The live
  gateway_runtime.js (97 requires) never references it (Agent 07, F225).
- Purpose mismatch: the module "Compiles File constitutional objects from repository path"
  (gateway/filesystem_authority.js:1-14). No live consumer compiles repo paths into File
  objects; the core is Postgres-backed and adapter writes are contained via the new
  site-id-guard helper (F223/F226).
- Pre-existing dormant classification (2026-09-21, ping-runtime/orchestration/dormant_classifications/
  gateway_filesystem_authority.json): dependent_modules: 0, deletion_confidence: 8 (low),
  recommendation: "migrate", resurrection_candidate: false.
- Latent defect CONFIRMED by reading the module: `_scanRepository` (line 116) uses
  `fs.stat(currentPath)` — follows symlinks. A symlink inside the scanned root pointing
  outside escapes the root. Latent root escape, exactly as Agent 07 reported.
- Phantom WorkspaceRegistry CONFIRMED: the only reference in the entire tree is
  worktrees/oracle-assembly/oracle-assembly-patches/gateway/bootstrap/gateway_runtime.js
  (lines 52, 424) — an untracked, unreferenced, week-old (2026-09-16) stale patch bundle.
  `git grep workspace_registry` in the tracked tree: EMPTY. The module exists nowhere.
  GC-12 re-grep (2026-09-24) already triaged this bundle as non-live and flagged
  do-not-apply-without-re-review.

## MINIMUM CHANGE
None to live code. The change is a status decision, recorded here and in FINDINGS-LOG.md:
1. FilesystemAuthority → ARCHIVED (dormant-historical). File stays in git history (SOUL:
   archive before destroying; deletion_confidence was 8/low — deletion is NOT authorized).
2. Re-wire condition (if a live consumer ever appears): the lstat-over-stat + skip-symlinks
   patch (patches/agent07-workspace/filesystem-authority-symlink-scan.md, propose-only)
   must land FIRST, plus a named live consumer with evidence of need.
3. WorkspaceRegistry → PHANTOM. No code change; do not plan against it. The stale
   oracle-assembly-patches bundle keeps its GC-12 do-not-apply flag.

## TEST
- Dormancy: the grep above (empty result) is the test; re-runnable.
- Defect: read of lines 110-122 confirms fs.stat on the scan queue; no lstat anywhere in
  the module (grep "lstat" → no hits).
- Phantom: repo-wide grep for workspace_registry/WorkspaceRegistry returns only the one
  stale bundle file.

## RESULT
DECIDED: ARCHIVE. No live mutation. Findings log F225 updated; Agent 20 map row for
filesystem decisions annotated (consumer of this record).
