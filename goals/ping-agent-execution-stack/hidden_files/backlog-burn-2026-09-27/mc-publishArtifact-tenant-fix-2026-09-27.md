# Lane D publishArtifact tenant gap — FIXED (2026-09-27 ~14:20 MDT)

Subagent: backlog-burn (parent: main agent).

## Finding (confirmed, was mis-triaged as Pig-side-only)

The 12:30 MDT triage recorded this as "Pig-side only, not locally
actionable" because no local copy was found in the 8 checked worktrees.
That triage was wrong: `~/workspace/lane-p01/tree/` (a plain directory in
the shared workspace repo, not a worktree) contains the full MC server
implementation, and it was quiescent (no files modified since 12:00 MDT).

Confirmed by code reading:
- `route.ts` defines a local `emit` wrapper that injects `tenant`
  (plus run_id, execution_id, agent, capability, context_pack_id) into
  every `appendDispatchEvent` call (route.ts:267-271).
- `publishArtifact` (mc-dispatch.ts:389) called `appendDispatchEvent`
  DIRECTLY with only `{kind, path, sha256}` — the only call site in the
  codebase that omitted `tenant`.
- `publishArtifact` is called 4 times on the LIVE dispatch path
  (route.ts:320-322, 398): prompt.txt, workorder.json, context.json,
  result.json. Every dispatch minted 4 `MC_ARTIFACT_PUBLISHED` journal
  events invisible to tenant-scoped journal reads.

## Fix (minimal, applied)

- `mc-dispatch.ts`: `publishArtifact` gains a required `tenant: string`
  parameter, included in the `MC_ARTIFACT_PUBLISHED` event data.
- `route.ts`: all 4 call sites pass `tenant` (in scope, already validated
  against `SLICE_TENANTS`).

## Verification

- `tsc --noEmit`: zero errors in both touched files (remaining errors are
  pre-existing missing-`next`-module environment issues, unrelated).
- No other callers of `publishArtifact` exist in the tree (workspace-wide
  grep: only route.ts + the definition).
- Behavioral test not run: `appendDispatchEvent` writes to Pig-side
  `JOURNAL_PATH`/`ARTIFACT_ROOT` (`/home/nolan/...`, absent here); a live
  invocation would fail on mkdir, not on the changed logic. The change is
  verified by construction + typecheck: the event-data object literally
  contains `tenant` now.
- The tree was quiescent before the edit; the change is 5 lines across
  2 files. Uncommitted (commit decision is the coordinator's).
- CAVEAT: `lane-p01/` is UNTRACKED in the workspace git repo (`??`), and
  sits next to `tree.tar.gz` (a snapshot, presumably pre-fix). If anyone
  re-extracts from the tarball or works from a different copy, this fix is
  lost. The fix should be committed or ported to the owner's canonical
  copy promptly.

## Diff

```diff
--- a/src/app/api/mc/_lib/mc-dispatch.ts
+++ b/src/app/api/mc/_lib/mc-dispatch.ts
@@ export function publishArtifact(
   missionId: string,
   kind: string,
   name: string,
   content: string,
+  tenant: string,
 ): { path: string; sha256: string } {
   const { path, sha256 } = writeArtifact(missionId, name, content);
   appendDispatchEvent('MC_ARTIFACT_PUBLISHED', missionId, `${kind} published: ${name}`, {
     kind,
     path,
     sha256,
+    tenant,
   });
   return { path, sha256 };
 }

--- a/src/app/api/mc/dispatch/route.ts
+++ b/src/app/api/mc/dispatch/route.ts
-  publishArtifact(missionId, 'prompt', 'prompt.txt', prompt);
-  publishArtifact(missionId, 'work-order', 'workorder.json', JSON.stringify(workOrder, null, 2));
+  publishArtifact(missionId, 'prompt', 'prompt.txt', prompt, tenant);
+  publishArtifact(missionId, 'work-order', 'workorder.json', JSON.stringify(workOrder, null, 2), tenant);
   publishArtifact(missionId, 'context', 'context.json', JSON.stringify({
     ...
-  }, null, 2));
+  }, null, 2), tenant);
   publishArtifact(missionId, 'result', 'result.json', JSON.stringify({
     ...
-  }, null, 2));
+  }, null, 2), tenant);
```
