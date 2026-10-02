# Lane C failure log (internal dev lab)

## FL-20260921-001 — lane-C edit to src/fyd/object/view.ts clobbered by concurrent lane rewrite
- **Detected:** 2026-09-21 ~13:50 MDT. tsc: `Module '"@/fyd/object/view"' has no exported member 'buildObjectViewFromGraph'`. Pig file mtime 13:45:24, after my 13:43 transfer; `git status` shows `?? src/fyd/object/` (whole directory untracked, never committed).
- **Diagnosis:** Another in-flight lane rewrote `src/fyd/object/view.ts` at 13:45, replacing the fixture-based `buildObjectView` with a PING-backed `loadObjectView(slug)` (deprecated alias `buildObjectView` kept). The rewrite docstring explicitly invites reuse: "This is the canonical read-model loader; Card/Node lanes should reuse it." My surgical edit (buildObjectViewFromGraph + exported buildCapabilities) was overwritten, not merged.
- **Root cause class:** uncoordinated concurrent writes to the same untracked file in a shared dirty tree. No lane file locks exist (_coord/ is empty).
- **Recovery:** Rebased instead of re-editing. The new canonical `loadObjectView` is exactly the PING-backed loader the lab task requires, so lane C dropped its view.ts edit entirely and the lab adapter now calls `loadObjectView(siteId)` directly. No view.ts modification remains, so no future clobber surface. Verified the other lane's file exports `loadObjectView` before wiring.
- **Status:** MITIGATED and verified: tsc clean for dev/objects, live 200 on
  /dev/objects (both sites), Card/Node pending slots + empty states + owner
  warning confirmed in the compiled bundle, lane files committed as 372d005.
  view.ts left untouched by lane C (other lane's file).
- **Lesson:** In a shared dirty tree, prefer consuming another lane's canonical loader over editing the same file; check for concurrent rewrites (mtime + git status) before assuming a transfer stuck.
