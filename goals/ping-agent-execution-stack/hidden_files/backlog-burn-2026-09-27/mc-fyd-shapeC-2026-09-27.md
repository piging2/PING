# Shape C implementation ledger — read-only mission observer (2026-09-27)

Worker: implementer subagent. Serves Nolan's top priority (MC -> FYD website
wiring) as the safe first link: zero external effects, zero emissions.

## Method note (deviation from the letter of the brief, faithful to its intent)

The brief's Shape C section says to work in a `git worktree` off "the tree's
current branch". Reality check on arrival: `~/workspace/lane-p01/tree` is NOT
a git repo — it is an untracked exemplar directory inside the `~/workspace`
repo (extracted from `lane-p01/tree.tar.gz`; canonical tree is Pig-side at
`/home/nolan/projects/ping`, unreachable — Pig transport down). A `git
worktree add` against the `~/workspace` repo produced a checkout without the
exemplar (untracked files are not carried into worktrees), so it was removed
and the branch deleted. Replacement, same guarantees:

- Copied the exemplar to a DEDICATED directory `~/shapec-work` (outside the
  `~/workspace` repo, so the shared checkout was never touched and no branch
  was ever switched there).
- `git init` in the copy; baseline commit `c2464de`; local-only branch
  `mc-fyd-shapec-2026-09-27` (no remotes configured — push impossible).
- The original `~/workspace/lane-p01/tree` was never modified (verified by
  diffing the copy's baseline against the original after the work).

## Branch + commit

- Repo: `~/shapec-work` (local-only git, no remotes)
- Branch: `mc-fyd-shapec-2026-09-27`
- Commit: `92571aa` "Shape C: read-only MC mission observer at
  sites/[slug]/activity" (parent `c2464de` baseline)

## Files added (all under the new namespaced route dir)

- `src/app/sites/[slug]/activity/page.tsx` — new server component, the
  observer page (see design below).
- `src/app/sites/[slug]/activity/__tests__/activity-observer.test.ts` — 5
  falsification tests.
- `src/app/sites/[slug]/activity/__tests__/shapec-fixture-events.jsonl` —
  11-event scratch journal: the full Lane D acceptance chain for
  `mc-m-63d04f4517f9` (tenant happy-place) + one DENIED mission for
  coppersmith-plumbing.
- `src/app/sites/[slug]/activity/jest.config.cjs` — scoped jest config
  (testRegex, not testMatch, so the `[slug]` brackets do not glob).

## Files modified (one, additive)

- `src/app/api/mc/_lib/mc-dispatch.ts` — 5-line additive change: `JOURNAL_PATH`
  now honors `MC_JOURNAL_PATH` env override for local proof/test; default is
  the production Pig path, unchanged when unset. No tenant content, route, or
  component modified (`git status` shows zero modifications to
  `sites/happy-place/`, `sites/coppersmith-plumbing/`, `sites/_shared/`).

Durable copies of the delta (for application to the canonical tree on
Nolan's word): `hidden_files/backlog-burn-2026-09-27/shapec/`
(`sites-slug-activity-page.tsx`, `activity-observer.test.ts`,
`shapec-fixture-events.jsonl`, `jest.config.cjs`, `mc-dispatch.ts.patch`).

## Design (observe-only)

- Route `/sites/[slug]/activity`. Tenant is derived from the route slug and
  checked against `SLICE_TENANTS`; unknown slugs `notFound()` (404).
- Imports ONLY the read path: `loadJournalEvents`, `projectMissions` — the
  same projector behind `GET /api/mc/missions`. Never imports
  `appendDispatchEvent`/`writeArtifact`/`publishArtifact` (pinned by test 5).
- Renders a status-badge table of the tenant's missions plus an explicit
  "Observer only ... emits zero events" notice.
- Mirrors the `SpineDryRunObserverAdapter` philosophy: observe, fold, emit
  nothing.

## Falsification evidence

### Bar 1 — acceptance mission renders correctly

- Unit: `projectMissions(loadJournalEvents())` over the scratch journal yields
  `mc-m-63d04f4517f9` with status `SUCCEEDED`, tenant `happy-place`, agent
  `ollama`, capability `text.transform`, `run_id …-r1`, `execution_id …-x1`,
  `work_order_id 4c2f9a1b7d3e5f06`, 4 artifacts, 9 events, outcome
  `completed`, `reconciliation_state null`. (jest: PASS)
- Served (`next dev`, port 3417, `MC_JOURNAL_PATH=/tmp/shapec-serve/events.jsonl`):
  `GET /sites/happy-place/activity` -> 200, HTML contains
  `data-mission-id="mc-m-63d04f4517f9"`, `data-status="SUCCEEDED"`,
  `data-observer-notice`, and zero occurrences of the coppersmith mission id
  (tenant filter holds over HTTP).
- `GET /sites/coppersmith-plumbing/activity` -> 200, renders
  `mc-m-a1b2c3d4e5f6` with `data-status="DENIED"` only.
- `GET /sites/evil-corp/activity` -> 404 (slug outside the tenant set).
- Tenant filter unit test asserts exact mission-id sets per slug, no leakage.

### Bar 2 — determinism (byte-identical projection across runs)

- `JSON.stringify(projectMissions(loadJournalEvents()))` twice over the
  scratch journal: identical strings, identical sha256 (64 hex chars).
  (jest: PASS)

### Bar 3 — zero writes (journal mtime/size/bytes unchanged)

- Unit: `statSync` + sha256 of the scratch journal before vs after two
  projection passes: `mtimeMs` equal, `size` equal, bytes hash equal.
  (jest: PASS)
- Served: `/tmp/shapec-serve/events.jsonl` before serving —
  mtime `1790529642`, size `5769`, sha256
  `cdf954c748aa4961bfe6f3f81074b3a69dd96602b170f200e77d78a9df16ecff`;
  after three page renders (2x activity pages + 1x tenant page) — mtime,
  size, and sha256 ALL IDENTICAL. Zero writes proven over HTTP.

### Regression check on existing tenant pages

- Existing tenant files byte-identical (no modifications in git status).
- Served `GET /sites/happy-place` -> 500 in this sandbox, but the failure is
  environmental, NOT Shape C: it throws from
  `src/fyd/data/ping-object-source.ts::fail()` because the PING projection
  backend (`/home/nolan/ping/var/fyd-projections`, Pig-side) is absent here.
  The tenant-page code path (`sites/happy-place/page.tsx` <- `_shared/` <-
  `ping-object-source`) contains ZERO references to `mc-dispatch.ts` or the
  new route (verified by grep). A baseline serve would fail identically.

### Test results

`npx jest --config "src/app/sites/[slug]/activity/jest.config.cjs"`:
5/5 PASS (acceptance render, tenant filter, determinism, mtime proof,
no-emit-import guard).

### Serve details

- `next dev -p 3417` (ephemeral port; :3100/:3200 never touched; 19:00
  adjudication freeze respected — the :3200 served tree was not disturbed).
- Real `next@15.5.24` installed locally (the tree's pinned version); dev
  server stopped after proof (PID-scoped kill; no broad process kills).
- Pig transport down: no Pig steps taken; local proof only, per the brief.

## Constraints held

- Additive + namespaced only; no existing tenant content/route/component
  modified. No pushes/merges (no remotes). HPP original never touched.
- No credentials used. Production serving of the new route NOT done —
  needs Nolan's word.

## Verdict

SHAPEC-IMPL VERIFIED — all three falsification bars hold with evidence
above: acceptance mission renders correctly over unit + HTTP, projection is
byte-identical across runs, and journal mtime/size/bytes are unchanged
across renders (zero writes proven).
