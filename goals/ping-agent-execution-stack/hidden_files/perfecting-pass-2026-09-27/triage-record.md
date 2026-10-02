# Perfecting pass triage record — 2026-09-27 ~01:51 MDT

Two OPEN backlog items triaged on the local plane. No code changed; findings recorded in BACKLOG_PING.md. Both stay OPEN with owning lanes.

## 1. visibility-customize-dangling-import (P1)

Verdict: CONFIRMED at the committed eff0ab4 state (~/workspace repo, 2026-09-26); the LIVE fyd-build lane is NOT affected.

Evidence:
- `git ls-tree eff0ab4 fyd-product-lane/src/fyd/proceduralize/` -> __fixtures__, __tests__, generator.ts, planner.ts, presentation-observe.ts, proceduralizer.ts, sha256.ts. NO patch.ts.
- Importers at eff0ab4 (grep on `git show eff0ab4:<file>`):
  - fyd-product-lane/src/fyd/customize/types.ts:23 -> `import type { SiteIntent, SitePatchBody } from "../proceduralize/patch";`
  - fyd-product-lane/src/fyd/customize/apply-layer.ts:31 -> applySitePatch, proposalDigest, SitePatchBody
  - fyd-product-lane/src/app/api/fyd/customize/route.ts:51 -> applySitePatch, SitePatchBody, SiteIntent (via @/fyd/proceduralize/patch)
- fyd-build (master f90589e): `src/fyd/proceduralize/patch.ts` tracked since 2026-09-22 (commit 2292f48), 218 lines; exports SiteIntent, SitePatchBody, PatchResult, proposalDigest, proposeSitePatch, applySitePatch; __tests__/patch.test.ts exists. No `src/fyd/customize/` in fyd-build. Live importers (owner/store.ts, owner/apply.ts, regen/regenerate.ts, app/sites/happy-place/site-client.tsx) all resolve.
- Working tree (branch mc/lane-c-reconcile-gate, 1563 dirty entries): untracked `fyd-product-lane/src/fyd/proceduralize/patch.ts`, sha256 3ac95ddb... vs fyd-build's 6845659c... (not byte-identical; provenance unverified).

Triage answer: (a) the module was never committed to the customize lineage; a recovery copy sits uncommitted in the working-tree dirt. Owning lane: verify it against the proven fyd-build copy (or adopt it wholesale) and commit; do not let it drift.

## 2. objectgraph-relate-output-dropped (P3)

Verdict: REPRODUCED on the live fyd-build lane (master f90589e). The item's "8 candidates / 3 used / 5 dropped" phrasing does not match the evidence; the real defect is FYD_EXECUTABLE_HARVEST.md G6.

Evidence (all in ~/workspace/fyd-build/src/fyd/proceduralize/proceduralizer.ts):
- `relate()` at :348 (Stage 8) emits `links_to` RelatedPairs for social URLs.
- `project()` at :372 (Stage 9) takes (fields, sourceUrl, nowIso, controllerId) - no pairs parameter; emits only `located_at` relationships (:405-419).
- `grep -rn "relate(" src` (excl. tests): only the definition. No production caller; no pipeline calls both.
- proceduralizer.test.ts:125 asserts relate() emits the pair in isolation; nothing asserts project() consumes it.

The RELATE stage is dead weight on the live lane. Acceptance unchanged: wire links_to pairs into the object graph with evidence refs, or remove the stage and update its test. Owning lane: fyd-build.

## Ledger sweep

Scanned FAILURE_LEDGER.md OPEN entries: none are inside this pass's safe scope (all remaining OPEN entries are Pig/platform/credential/commit-scoped or blocked on Nolan/coordinator decisions: FL-20260919-RCA-010 Drive restore, FL-20260919-P08/P04 lane worktrees, FL-20260921-FYD2-resolved-with-stale-inner-status-line, FL-20260921-213 Threads composer DOM, FL-20260921-221 root jest transform pre-existing, FL-20260921-224 GitHub route). Left recorded but untouched per pass rules. No new failures encountered this pass; no new ledger entries.
