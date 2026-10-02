# Agent 07 — PROPOSED patch for live core (b) `/home/nolan/ping`
# STATUS: PROPOSAL ONLY. NOT applied. Base (b) is the live runtime home.
# Target: gateway/filesystem_authority.js :: _scanRepository (lines ~112-141)

## WHY
_scanRepository() classifies entries with `fs.stat`, which follows symlinks.
A symlink inside the scanned repository that points outside the repository
root is descended into: files outside the authorized root are read and
registered as File constitutional objects. The module's own contract
("Compiles File constitutional objects from repository path") implies the
scan is bounded by repositoryPath; symlink-following silently violates that
bound. Additionally, `path.relative(repositoryPath, filePath)` for an
outside file yields a payload path containing ".." segments, which any
downstream consumer that joins it would traverse.

Note on priority: the module is DORMANT in the live boot (zero
`new FilesystemAuthority` in the main tree; see WORKSPACE-FILESYSTEM.md).
This patch is defense-in-depth for whenever the module is wired in, not an
active incident fix.

## EVIDENCE
- gateway/filesystem_authority.js:117: `const stats = await fs.stat(currentPath);`
  (`fs` here is `require('fs').promises`, line 14.)
- Node primitive behavior, demonstrated on the Pig (node v22.23.2):
    statSync(link).isDirectory()  === true   // follows the symlink
    lstatSync(link).isSymbolicLink() === true // sees the link itself
  (run 2026-09-23; /tmp scratch, removed afterwards; no repo files touched)
- No symlink exclusion anywhere in _scanRepository; the ignore list covers
  only basenames (node_modules, .git, ...).

## MINIMUM CHANGE
```diff
--- a/gateway/filesystem_authority.js
+++ b/gateway/filesystem_authority.js
@@ -114,7 +114,12 @@ class FilesystemAuthority {
     while (queue.length > 0) {
       const currentPath = queue.shift();
-      const stats = await fs.stat(currentPath);
+      // lstat, not stat: never follow symlinks. A symlink that points
+      // outside repositoryPath must not pull outside files into the scan.
+      const stats = await fs.lstat(currentPath);
+
+      if (stats.isSymbolicLink()) {
+        continue;
+      }
 
       if (stats.isDirectory()) {
         // Skip common ignore directories
```

## TEST
1. Static: after the change, `grep -n "fs.stat(" gateway/filesystem_authority.js`
   must show no remaining bare `stat(` call in `_scanRepository`.
2. Behavioral (safe, /tmp-only): create /tmp/fsa-test/{real,link->real},
   invoke the patched `_scanRepository('/tmp/fsa-test')` via node -e with
   stubbed postgres/objectRegistry, assert the returned file list contains
   no path under /tmp/fsa-test/real and no payload path containing "..".
3. Regression: existing callers are audit/regression tooling only
   (constitutional_blockers.js, constitutional_regression_corpus.js,
   constitutional_validation_harness.js reference the class by name);
   no live boot path instantiates it, so no live behavior changes.

## RESULT
Not executed (proposal only per sprint patch rules for the live core).
Expected result after application: symlink entries are skipped, scan output
is bounded by repositoryPath, payload `path` values never contain "..".
