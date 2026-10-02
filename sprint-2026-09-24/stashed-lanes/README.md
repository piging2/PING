# Stashed lanes - 2026-09-25 worktree triage

## What happened
The worktree on `fyd/sprint-integration-2026-09-24` had 24 dirty tracked files,
all from the Q-C-01 / ARROW-1 public-projection lane (uncommitted call-site
migration on top of the committed boundary in b3c891c6). Triage on 2026-09-25
~15:30 MDT found committed HEAD (87671a5f) did NOT type-check: the ARROW-1
commit changed several public APIs and removed compileSiteSpecWithIntent /
publicGraph from spec-pipeline without migrating call sites.

## Committed (6f2dd65e, no push)
16 files: mechanical call-site completions required for `tsc --noEmit` to pass.
Pure adaptations to the already-committed API. Verified clean.

## Stashed - behavior changes, NOT committed, NOT deleted
`qc01-behavior-changes-and-superseded-418-fixes-20260925.diff` (8 files):

1. `src/app/api/fyd/edge/object/route.ts` - adds a `contract` provenance block
   to the JSON response. Response-shape change. Needs lane review before merge.
2. `src/app/build/[siteId]/page.tsx` - migrates the build page to the verified
   projection pipeline. Behavior change. Needs lane review.
3. `src/app/layout.tsx` - one line: suppressHydrationWarning on <html>.
   SUPERSEDED partial #418 fix; the committed fix 761bd086 deliberately fixed
   root causes instead. Do not merge without Nolan's call.
4. `src/app/sites/page.tsx` - migrates the sites index to the verified
   projection. Behavior change. Needs lane review.
5. `src/fyd/edge/client.ts` - defers markBindings to window.load. SUPERSEDED
   partial #418 fix (the committed 761bd086 made the mutation a no-op by
   rendering the attributes in React). Do not merge without Nolan's call.
6. `src/fyd/edge/resolve.ts` - changes buildObjectSheet(graph,...) to
   buildObjectSheet(verifiedProjection,...). Public API change.
7. `src/fyd/edge/__tests__/q2-hostile.test.ts` - coupled to (6).
8. `src/fyd/edge/__tests__/resolve.test.ts` - coupled to (6). Note: the
   COMMITTED version of this test has a runtime-broken dynamic import of
   `publicGraph` (removed from spec-pipeline); the stashed version fixes it.

Restore: `git checkout stash@{0} -- <paths>` (in-repo stash, message "qc01-lane",
created 2026-09-25) or apply the diff file above.

## Full pre-triage record
`qc01-call-site-migration-20260925-full.diff` - all 24 dirty files as found.

## Findings reported to coordinator
- No responsive-threshold change exists in any dirty file (verified by full
  diff inspection). The "single at 1280 vs dual" observation from the :3101
  scratch server could not be attributed to tracked changes.
- None of the 24 files were type-only; the "type-fix" framing was inaccurate.
  The 16 committed files are compile-required mechanical completions; the 8
  stashed files are genuine behavior changes / superseded fixes.
- Untracked files left untouched: .next.integration-build-20260924/,
  .next.pre-purehead-20260924/, public/fyd-media/* (generated), 
  src/fyd/media/manifests/*.json (generated), tools/.../__pycache__/,
  tsconfig.arrow6.tsbuildinfo, var/fyd-intake/.
