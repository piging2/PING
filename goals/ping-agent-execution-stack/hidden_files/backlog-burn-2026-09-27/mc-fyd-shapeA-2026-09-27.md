# MC→FYD wiring Shape A — implementation ledger

Date: 2026-09-27 ~12:30 MDT. Worker: implementer subagent (autonomous build; serving needs Nolan's word).

Item: MC→FYD wiring Shape A — tenant-scoped dispatch console. Serves Nolan's top priority (Mission Control → FYD website wiring).

## Grounding decisions

- Canonical website tree: `/home/nolan/projects/ping` (Pig) is unreachable (Pig transport down). Local exemplar used: `~/workspace/lane-p01/tree` — verified UNTRACKED in the workspace repo (`git ls-files lane-p01` = 0 files; shows as `??`), so it exists only in the shared checkout's working tree.
- Dedicated worktree: `/tmp/mc-fyd-shapeA`, created via `git worktree add -b mc/fyd-shapeA-site-console /tmp/mc-fyd-shapeA d571362` (the tree's base commit). The tree copy was placed at the same path (`lane-p01/tree`) and committed as baseline `b133d5a`. The shared checkout never switched branches (still `mc/sprint-integration-2026-09-27`) and its `lane-p01/` is untouched.

## Branch + commit

- Branch: `mc/fyd-shapeA-site-console` (local only, never pushed; no main/master commits).
- Baseline: `b133d5a` (website tree exemplar copy).
- Shape A: `7a7a892` "shapeA: tenant-scoped MC dispatch console (sites/[slug]/mission-control + api/sites/[slug]/mc)".

## Files added (7, 1661 insertions, 0 deletions — purely additive)

1. `lane-p01/tree/src/app/api/sites/[slug]/mc/_lib/site-dispatch.ts` (857 lines) — the Shape A core:
   - `assertSiteTenant(slug)` — route slug → tenant, typed `route_tenant_invalid` (404) on unknown slugs.
   - `lockTenant(tenant, body)` — tenant from the route, never the body; any explicitly provided body tenant ≠ slug is refused with typed `tenant_mismatch` (403, fail-closed).
   - The Lane D witnessed pipeline (`dispatchSiteMission`): fail-closed validation (same bounds as Lane D) → adapter authorize → adapter issue → MC_MISSION_CREATED / MC_RUN_QUEUED / MC_EXECUTION_STARTED / MC_AGENT_AUTHORIZED → 4 artifacts (prompt, work-order, context, result) → adapter execute → adapter verify → terminal (SUCCEEDED / FAILED / UNKNOWN; UNKNOWN first-class, never collapsed). Every event carries `tenant`, `aggregate_id = mc:mission:<id>`, `aggregate_type = 'mc_mission'`.
   - Adapter seam: `DryRunDispatchAdapter` (default; dry-run observer seam modeled on SpineDryRunObserverAdapter — deterministic canned executor, clock-injectable, no agent contacted, no quota spent) and `LaneDShimDispatchAdapter` (live plug-in: authorize/issue/verify via the existing `adapterCall` shim, execute via the ollama/broker transports; selected only with `MC_SITE_DISPATCH_LIVE=1`; same contract, no wrapper change needed). Production/live use needs Nolan's word.
   - Journal: `MC_SITE_DISPATCH_JOURNAL` → `MC_JOURNAL_FILE` → tmpdir default. Dry-run FAILS CLOSED on the production journal/artifact paths (`dryrun_journal_refused`, `dryrun_artifacts_refused`).
   - Hard guard: `appendSiteEvent` throws `event_type_forbidden` on ANY event type outside the MC dispatch set — the site path can never mint `FYD_SITE_OVERLAY` or any `FYD_*` event. (Also fixed a real gap found during testing: artifact events previously bypassed the tenant-carrying emitter; all events now carry `tenant`.)
2. `lane-p01/tree/src/app/api/sites/[slug]/mc/dispatch/route.ts` — thin wrapper: validates slug, locks tenant, delegates to `dispatchSiteMission`. Zero edits to existing `api/mc/*`.
3. `lane-p01/tree/src/app/api/sites/[slug]/mc/missions/route.ts` — tenant-scoped projection GET (read-only companion for the console).
4. `lane-p01/tree/src/app/sites/[slug]/mission-control/page.tsx` — server component console page; unknown slugs → `notFound()`.
5. `lane-p01/tree/src/app/sites/[slug]/mission-control/dispatch-console.tsx` — client form (no tenant selector; tenant locked to the route) + mission list.
6. `lane-p01/tree/src/app/api/sites/[slug]/mc/_lib/site-dispatch.test.ts` — 15 falsification tests.
7. `lane-p01/tree/jest.shapeA.cjs` — dedicated jest config for the new tests.

Zero modifications to existing tenant content, routes, or components (`git diff b133d5a HEAD --numstat`: 7 files, 0 deletions).

## Falsification evidence (per bar item)

Bar 1 — body-tenant/slug mismatch is REFUSED (fail-closed, typed error):
- jest: `lockTenant('happy-place', {tenant:'coppersmith-plumbing'})` throws `SiteDispatchError` code `tenant_mismatch`; malformed tenants (null, '', 5) also refused; absent tenant filled from route.
- jest (route level): `POST /api/sites/happy-place/mc/dispatch` with body tenant `coppersmith-plumbing` → HTTP 403, error `tenant_mismatch`, and the journal stays empty (0 events on the refused path).
- HTTP serve: same request → `http=403`, `error: tenant_mismatch`.

Bar 2 — a coppersmith dispatch yields a correct tenant-scoped MC chain:
- jest: dry-run dispatch with tenant `coppersmith-plumbing` → HTTP 200, status `SUCCEEDED`, mission id `mc-m-<12hex>`; journal holds exactly the chain `MC_MISSION_CREATED → MC_RUN_QUEUED → MC_EXECUTION_STARTED → MC_AGENT_AUTHORIZED → MC_ARTIFACT_PUBLISHED ×4 → MC_RUN_SUCCEEDED`; every event has `event_data.tenant = 'coppersmith-plumbing'`, `aggregate_id = mc:mission:<id>`, `aggregate_type = 'mc_mission'`; projection renders 1 mission, status SUCCEEDED, tenant coppersmith-plumbing, 4 artifacts.
- HTTP serve (ephemeral port 39153): `POST /api/sites/coppersmith-plumbing/mc/dispatch` → `http=200 status: SUCCEEDED tenant: coppersmith-plumbing mission: mc-m-fcddf9a2e4bc`; `GET .../mc/missions` → `mission_count: 1, status: SUCCEEDED, artifacts: 4`; unknown slug → `http=404 error: route_tenant_invalid`; GET catalog → `tenants: ['happy-place']`, `tenant_locked: true`, mode dry-run.
- Denied path pinned: adapter denial → `MC_MISSION_CREATED + MC_AGENT_DENIED`, HTTP 403, status DENIED, no execution.

Bar 3 — zero overlay events minted (scan the journal):
- jest: raw journal bytes contain no `FYD_SITE_OVERLAY`; no event type starts with `FYD_`.
- Code-level guard test: `appendSiteEvent(..., 'FYD_SITE_OVERLAY', ...)` throws `event_type_forbidden` and writes nothing.
- HTTP serve journal scan: 9 lines, event types `{MC_MISSION_CREATED:1, MC_RUN_QUEUED:1, MC_EXECUTION_STARTED:1, MC_AGENT_AUTHORIZED:1, MC_ARTIFACT_PUBLISHED:4, MC_RUN_SUCCEEDED:1}`, tenants `{coppersmith-plumbing}`, FYD_* events: 0, `FYD_SITE_OVERLAY` occurrences: 0.

Bar 4 — dispatch replay is byte-identical across runs:
- jest: two dispatches with a fixed clock into separate journals (shared artifact root) → identical mission ids and byte-identical journal files; two consecutive `projectMissions` projections byte-identical.

Existing pages unchanged: `git diff b133d5a 7a7a892 --stat` = 7 files added, 0 modified, 0 deleted. The new dynamic route `sites/[slug]/...` does not collide with the static `sites/happy-place` / `sites/coppersmith-plumbing` routes (static segments win in Next.js).

## Caveats / parked items

- Full `next dev` serve was NOT possible: the `next` package is absent from the environment's node_modules (pre-existing; 12 existing files also fail `tsc` on `next/navigation` resolution). Proof instead: (a) `tsc --noEmit` on the new files is clean except the same pre-existing `next/navigation` env-noise error; (b) the compiled route handlers were served over real HTTP on an ephemeral port (39153) via a throwaway harness (killed afterward, PID-scoped). The console page's server rendering cannot be proven until a `next`-capable environment serves the tree.
- :3200 never touched (19:00 adjudication freeze respected); harness used port 39153 only.
- No Pig steps (transport down); no HPP original contact; no pushes; no credentials; no broad process kills.
- PARKED (needs Nolan's word): serving on the production/:3200 tree; plugging in `LaneDShimDispatchAdapter` (live, non-dry-run dispatch); which agents/capabilities the website surface may offer (broker `identity_1..4` = real Copilot quota spend); whether the console is owner-gated (`DemoOwnerMode`).

## Verdict

SHAPEA-IMPL VERIFIED — all four falsification bar items are pinned by 15/15 passing jest tests plus an ephemeral-port HTTP proof; the change is purely additive (7 new files, 0 modifications, 0 deletions) on local branch `mc/fyd-shapeA-site-console` at commit `7a7a892`.
