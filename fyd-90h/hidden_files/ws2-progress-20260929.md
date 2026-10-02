# WS2 integration progress — 2026-09-29

## Step 0 (topology, SSH-proven, ~07:40 MDT)
- `git -C /home/nolan/projects/ping cat-file -t f877c391` => `commit`. EXISTS on Pig.
- Log: f877c391 "trackc: 16 tests for the staged SitePatch pipeline" (branch fyd/builder-harvest-trackc-2026-09-28). Below: 47ea5b26 staged SitePatch pipeline, fdb5d3f3 10-op vocabulary.
- Main checkout /home/nolan/projects/ping has DIRTY modified files (ask-pipeline.ts, route.ts, customize route, edge routes, overrides route) — do not touch main checkout; fresh worktrees only.
- W2's worktree /home/nolan/projects/ping-wave2-ownerloop @ 3235804d (detached) present; not reused.

## Stream W1 — PASS (no-op): no code diffs to integrate
## Stream W3 — PASS: integrated @ b2a9f7b6 in /home/nolan/projects/ping-int-w3 [ws2/int-w3]
## Stream W4 — PASS: integrated @ 5c604dc1 in /home/nolan/projects/ping-int-w4 [ws2/int-w4]
## Stream W5 — PASS: integrated @ 68e49b64 in /home/nolan/projects/ping-int-w5 [ws2/int-w5]

## Source recovery (~07:55 MDT)
- /home/nolan/projects/ping-wave2-* worktree DIRS are missing (both sandbox and Pig); prunable registrations in /home/hatch/workspace repo. Commits/branches survive in /home/hatch/workspace:
  - w3/toctou-pinned-lookup @ d312f49 (parent a0f3724): 4 files (package.json new + 3 src/fyd/net files)
  - wave2/w4-dependency-index-seeding @ 5e2c12c (parent 85faad1): 4 files (3 new + generator.ts modified)
  - W5: worktree index has 4 new files staged as EMPTY blobs (e69de29) — staged content lost. RECOVERED full-content copies in /home/hatch/workspace/fyd-90h/proof-projreader/src/fyd/data/ (5 files, timestamps 12:01 UTC = 06:01 MDT, incl. modified ping-object-source.ts).
  - W1 (ping-wave2-l4 index): NO staged changes vs a0f3724; harness was untracked (lost with dir).

## W1 verdict: no code diffs to integrate (harness only; nothing staged; worktree dir gone)

## W5 recovery commit (~08:05 MDT)
- Recovered commit ws2/w5-projection-reader-recovered @ 9de3c2f (parent a0f3724) in sandbox repo: 5 files (4 new + ping-object-source.ts seam conversion), 1011+/297-. Main checkout untouched.

## W3 integration (~08:30 MDT) — PASS
- Worktree /home/nolan/projects/ping-int-w3 [ws2/int-w3], commit b2a9f7b6 "ws2: integrate W3 TOCTOU Option A (per-hop pinned lookup) onto f877c391" (4 files, 562+/19-).
- Reconciled onto target's pre-pinning safe-fetch.ts; added undici 6.28.0 to package.json; new toctou tests.
- Tests on Pig: 131/131 across 6 suites (toctou pinning 20, undici-missing 1, safe-fetch 20, SSRF adversarial 72, budgets+rate-limit 18).

## W4 integration (~08:45 MDT) — PASS
- Worktree /home/nolan/projects/ping-int-w4 [ws2/int-w4], commit 5c604dc1 "ws2: integrate W4 generator-owned dependency-index seeding onto f877c391 (path-remapped fyd-product-lane -> src/fyd)" (4 files, 714+/29-).
- Path-remapped fyd-product-lane/src/fyd/proceduralize -> src/fyd/proceduralize/; target generator.ts ported (NOT wholesale replaced): keeps siteId, Gallery emission, archetype composition, version 1.1.0; adds EdgeRecorder wiring + generateSiteSpecWithDependencies.
- One line adapted: dependency-index-seeding.test.ts generatorVersion "1.0.0" -> "1.1.0" (trackc line's real version).
- Tests on Pig: W4 proofs 10/10; proceduralize suite 133/134 (1 pre-existing failure: "emits no Gallery section when the site manifest has no gallery assets" — fails on pristine f877c391 too; root cause: committed happy-place.json manifest has gallery assets; listed in TESTING.md known-failing).

## W5 integration (~09:00 MDT) — PASS
- Worktree /home/nolan/projects/ping-int-w5 [ws2/int-w5], commit 68e49b64 "ws2: integrate W5 ProjectionReader seam onto f877c391 (file-dump default; Q-C-01 funnel preserved)" (7 files, 1214+/235-).
- 4 new modules verbatim: projection-reader.ts, projection-verify.ts, file-dump-projection-reader.ts, default-reader.ts.
- ping-object-source.ts ported as the seam conversion with two documented deviations from W5's recovered file:
  1. Dropped applyOwnerPresentationOverrides import/call: the function does not exist on the trackc line (W5 proved it only against a harness stub); composition stays field-corrections-only as on f877c391.
  2. Restored getVerifiedPublicProjection/getVerifiedPublicProjectionSync (Q-C-01 funnel) on top of the seam — W5's rewrite dropped them; trackc public consumers depend on them.
- New integration test src/fyd/data/__tests__/projection-reader-seam.test.ts: 5/5 (determinism identity, fail-closed tamper/missing, stub-reader interface binding + sync fail-closed, naming law, seam listing).
- One adjacent test updated: tenant b-projection "missing projection fails closed" regex /no PING projection/ -> /no snapshot/ (seam's namespaced fail-closed message; behavior unchanged).
- Regression: src/fyd suite failure set byte-identical to pristine f877c391 (all pre-existing, TESTING.md-listed); src/app/api/fyd 115/115.

## Durable patches (all git apply --check clean against pristine f877c391)
- ~/workspace/fyd-90h/patches/ws2-w3-f877c391.patch (676 lines, md5 f01cbca8dc29d5868d0b1c297f25bd78)
- ~/workspace/fyd-90h/patches/ws2-w4-f877c391.patch (870 lines, md5 cab8fd65e8a33fddf2830c2d8f2081ba)
- ~/workspace/fyd-90h/patches/ws2-w5-f877c391.patch (1568 lines, md5 7f2fdc0855a40633e9190e3117822bef)

## Boundaries honored
- No pushes; no main/master merges or touches; fresh per-stream worktrees off f877c391; serialized commits with status-first + explicit pathspecs; W2 owner-loop worktree not reused; no :3100 interaction; no HPP-original contact, customer contact, paid spend, or new authority/event bus/truth store. The one Ask->F1 sub-boundary note stands: strict Ask-drafted-to-F1 approval path remains an Ask-lane design gap (not a WS2 integration break).
