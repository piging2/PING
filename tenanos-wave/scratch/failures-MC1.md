# Failure classes surfaced by worker MC1 — 2026-09-24

## FC-MC1-1: Working-tree reads lie about merged state on shared checkouts
**Detected:** during merged-state verification of 082-087.
**Evidence:** `/home/nolan/ping` working tree is DETACHED at `cc6856c3b` (first parent of the honesty merge, i.e. pre-fix), and is concurrently mutated by other swarm workers (uncommitted `M` files on package.json/package-lock/capability_registry.json/dump.py). Direct file reads (`sed`, `grep`) of `gateway/routes/orchestration.js` from the working tree showed BOTH the fixed 410 content and, minutes later, the OLD pre-fix blob (`git ls-tree HEAD` = `5dc3d83b`, `git hash-object` = same) — the tree is not a stable snapshot.
**Invariant:** on a shared, concurrently-mutated repo, NEVER verify merged state from the working tree. Always read the integration ref directly: `git show <branch>:<path>`, `git grep <branch>`. A working-tree file is evidence of nothing.
**Mitigation applied:** all MC1 verification used ref reads only.

## FC-MC1-2: Deprecation of reads orphaned the matching write (partial authority removal)
**Detected:** 083 deprecated the shadow-mission GETs (410) but left `POST /orchestration/missions` writing random-ID missions into `engine._missions`.
**Effect:** creation succeeded while no read route could ever return the mission — worse honesty posture than before the partial fix (previously at least a read-back existed).
**Invariant:** when deprecating one half of a CRUD pair over a non-canonical store, deprecate the pair atomically or the survivor becomes an orphaned write. Deprecation diffs should grep for ALL routes touching the deprecated store.
**Mitigation:** staged `diffs/P-20260923-110.diff` (410 + canonical pointer), following the 083 pattern.

## FC-MC1-3: Honesty fix applied to one route instance of a repeated claim, not all instances
**Detected:** 086 removed `generated_runtime_authoritative: true` from `/ops/dashboard` only; `/ops/status` (ops.js:28) and `/ops/system` (ops.js:122) kept the identical unsubstantiated claim.
**Invariant:** when an honesty fix removes a repeated literal claim, grep the whole file (and sibling routes) for every instance before closing. The fix is not complete until the literal is extinct in the touched surface.
**Mitigation:** staged `diffs/P-20260923-109.diff`; also verified extinction of `confidence: 0.85` / `completed: total` / `bypass_type: 'auto_scan'` literals across the fixed files on the ref.
