# MISSION F Q-J-01..03 EVIDENCE (2026-09-27 ~20:18-20:23 MDT)

Question: which of ten distinct claims hold on the served FYD object/doorway change
("Emergency Services" apply on Pig :3100/sites/happy-place), proven separately,
and does the change survive a controlled restart?

## Ten-claim table

| # | Claim | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | SOURCE EXISTS | PASS | Journal overlay event `fyd-ovl-muklxc7l-333f04fa678b` in `/home/nolan/projects/ping/data/fyd-journal/events.jsonl` (FYD_SITE_OVERLAY, directives `pi-82b6c64f99149682` edit_copy heading+copy on home:Services:2, `pi-b9d3ea837d2e222e` set_featured `[website-business-6fa5ebd99d72c4cb-service-cd28e52699a5]`). Projection `/home/nolan/ping/var/fyd-projections/happy-place.json` (sha256 `34fa5bff...`, "Emergency Services" x2, featured id x4, both directives in appliedIntentIds). Tool `/home/nolan/projects/ping/tools/fyd-site-projection/dump.py` (one-line tenant fix, uncommitted). Route `/home/nolan/projects/ping/src/app/sites/happy-place/page.tsx`, pipeline `/home/nolan/projects/ping/src/app/sites/_shared/spec-pipeline.ts`, reader `/home/nolan/projects/ping/src/fyd/data/ping-object-source.ts` (L96 FYD_PROJECTION_DIR default, L292 readFileSync). Approval records `/home/nolan/projects/ping/var/mc-approvals.json`, `/home/nolan/projects/ping/mc-approval/w4-proposal.json`. Note: no .ts/.tsx source hardcodes "Emergency Services"; the change is data-driven journal -> projection -> dynamic render. |
| 2 | TESTS PASS | PASS (qualified) | `tools/fyd-site-projection/test_dump.py`: 7 pass, 0 fail (the exact tool that materialized this change). `src/fyd/sitespec/__tests__/validator.test.ts`: 5 pass, 0 fail under ad-hoc ts-jest config (validator runs in the route before render). Caveat (pre-existing, not introduced here): repo stock `npm test` (plain jest) has no TS transform configured (no jest.config, no babel config, no package.json jest key) so it fails to parse every TS test file; `apply-layer`/`render-model` suites additionally fail at module load in the customize import chain under the ad-hoc config. No test-content failure for this change. |
| 3 | IMPORTED | PASS | Source chain: `page.tsx` imports `compilePublicSite` from `../_shared/spec-pipeline`; `spec-pipeline.ts` imports `getVerifiedPublicProjection` from `@/fyd/data/ping-object-source` and `applyPresentationIntent` from `@/fyd/customize/apply-layer`. Served bundle: `/home/nolan/projects/ping/.next/server/chunks/1923.js` contains the literal `fyd-projections` seam (the FYD_PROJECTION_DIR default path), proving the projection-read module ships in the served server bundle. |
| 4 | MOUNTED | PASS | Served HTML (GET :3100/sites/happy-place) contains `<h2 ...>Emergency Services</h2>`, the approved copy, featured object id x3, and doorway links `data-fyd-object-id="website-business-6fa5ebd99d72c4cb-service-cd28e52699a5"` x2. Render-audit log in 3100.log confirms per-request binding verification with the featured object BOUND. |
| 5 | ROUTE REACHES | PASS | `curl http://localhost:3100/sites/happy-place` -> HTTP 200, 130460 bytes, 0.02s. Excerpts: H2 "Emergency Services"; copy "Get in touch with us for urgent repairs at Happy Place Carpentry LLC. We're always ready to help, but we can't promise response speed or ranking." (HTML-escaped in bytes); featured id `website-business-6fa5ebd99d72c4cb-service-cd28e52699a5`. |
| 6 | BROWSER RENDERS | UNKNOWN / BROWSER-REQUIRED | No browser available to this subagent. Prepared URL, viewports (320/375/390/768/1280/1440), and assertions below. |
| 7 | DISCOVERABLE | UNKNOWN / BROWSER-REQUIRED | Same; needs rendered-page interaction. |
| 8 | USABLE | UNKNOWN / BROWSER-REQUIRED | Same; needs rendered-page interaction. |
| 9 | SURVIVES REFRESH | PASS | Two separate GETs of the identical URL returned byte-identical bodies (sha256 `47ac9d8e...` both). A third GET with `?cb=<ts>` differed in exactly 2 byte insertions, both the query string reflected in page URLs/flight data (proven by byte-level diff); no other byte differed. |
| 10 | SURVIVES RESTART | PASS | Controlled restart via lease (record below). Post-restart: new PID 63399 on :3100, GET 200, served body sha256 `47ac9d8e...` identical to pre-restart, BUILD_ID unchanged, env flag live, approve path 200, projection/journal shas unchanged. |

## Restart lease record

BEFORE: service :3100 (next-server v15.5.24), listener PID 42194, BUILD_ID `Lz_Au9rAe6B6BA5PROUvJ`, source HEAD `a8ed5103c08a20c9d57d29c0a796b2568ff9f4fa` (dirty worktree, no commits), projection sha256 `34fa5bffbffe248253833dcbe018817539405a7c6f650e9b3366986d00adcd57`, journal sha256 `6f6c75f12969471688d1b5e26c86a30893bce38985b172016d47f303b0bd6e8f`, NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 live in 42194 env. Reason: Q-J restart proof (Mission F claim 10). Expected outage: brief (script kills listener, setsid start, health-polls up to ~120s). Rollback: re-run /home/nolan/start-3100.sh (stateless next-server). Other active workers: none found (own process list all completed; no _processing mission states in orca-mc-sprint or fyd-factory; no other Q-J evidence files; 3100.log shows render diagnostics only, no restart markers). Semantic owner for this restart: this mission (single operator).

RESTART (~20:21 MDT): exactly one, ONLY via /home/nolan/start-3100.sh, non-PTY ssh, stdio on files (server stdio to /home/nolan/3100.log; invocation log at /tmp/qj-restart.log). Script rc=0, ~7.5s wall. Killed 42194, started 63399, script health check: "[start-3100] healthy: happy-place 200".

AFTER (verified 20:22:30 MDT): PID 63399 owns *:3100. GET /sites/happy-place -> 200, body sha256 `47ac9d8e38fa32e90b30316bed2b508e6acfd2c6b1f0832583b87b48622622b7` (identical to pre-restart). BUILD_ID `Lz_Au9rAe6B6BA5PROUvJ` unchanged. NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 live in 63399 env. Approve path probe `GET /api/fyd/customize?siteId=happy-place&view=inspect` -> 200 `{"ok":true,"siteId":"happy-place",...}` (no 403; demo owner mode gate open). Projection and journal shas unchanged. No accidental outage beyond the brief restart window; final GET 200 at 20:22:30 MDT.

## Served-byte binding

- Source HEAD: `a8ed5103c08a20c9d57d29c0a796b2568ff9f4fa` (dirty, uncommitted; includes dump.py tenant-param fix).
- Build digest: `.next/BUILD_ID` = `Lz_Au9rAe6B6BA5PROUvJ`, identical before and after restart (restart runs `npm start` on the existing build; no rebuild).
- Served asset digest: sha256 `47ac9d8e38fa32e90b30316bed2b508e6acfd2c6b1f0832583b87b48622622b7` of the GET :3100/sites/happy-place body, identical across pre-restart refetches and post-restart.
- Projection binding: projection directive `pi-82b6c64f99149682` carries heading "Emergency Services" and the exact approved copy; served H2 and copy match byte for byte (modulo HTML escaping).

## Hostile test: how could 1-5 and 9-10 pass while the customer sees nothing?

Ruled out by evidence: CDN/cache staleness (direct localhost curl, no CDN in path, byte-identical refetches); wrong tree served (server cwd is /home/nolan/projects/ping per start-3100.sh; route is dynamic, absent from prerender-manifest, reads /home/nolan/ping/var/fyd-projections at request time via readFileSync; BUILD_ID unchanged across restart; served bytes identical pre/post restart); projection/HTML mismatch (projection directive content matches served H2/copy/featured id exactly).
NOT ruled out: anything requiring a real browser. The served flight data carries `"DemoOwnerMode":{"siteId":"happy-place","enabled":true}`, so the served page is the demo-owner variant; client-side JS errors, CSS hiding, or viewport-specific breakage could still leave a real viewer seeing nothing. That is exactly claims 6-8, reported UNKNOWN.

## Browser-required (for parent delegation)

URL: `http://<WSL-IP>:3100/sites/happy-place` (WSL IP from `hostname -I` on the Pig; was 172.21.65.209; re-observe at delegation time). Target: Pig headed Chrome via CDP :9223 (per workspace AGENTS.md Windows-side browser pattern). Viewports: 320, 375, 390, 768, 1280, 1440.

- Claim 6 (renders): page loads with no error; H2 "Emergency Services" visible in the Services section; approved copy text visible; no console errors; layout intact at each viewport; screenshot per viewport.
- Claim 7 (discoverable): Services section reachable by scrolling; featured Restoration object doorway (`data-fyd-object-id="website-business-6fa5ebd99d72c4cb-service-cd28e52699a5"`) visible; its link `/o/website-business-6fa5ebd99d72c4cb-service-cd28e52699a5` resolves.
- Claim 8 (usable): clicking the featured object doorway opens the object view; Ask FYD and contact CTAs in/near the Services section are present and clickable; no dead controls.

## Observations (not claims)

- A third next-server PID 52512 exists on the Pig without NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 in its env. It does not own :3100 (42194 pre-restart, 63399 post-restart do). Out of this mission's lease scope; flagged for awareness.
- Repo-wide jest TS runner is unconfigured (pre-existing): no jest.config, no babel config, no package.json jest key. `npm test` cannot parse any TS test file. Not fixed here (read-only scope outside the restart).

## Next

- NEXT-IF-PASS: Q-J green except browser claims 6-8, pending parent delegation of the browser proof above.
- NEXT-IF-FAIL: none; no claim failed.
- NEXT-IF-UNKNOWN: claims 6, 7, 8; missing evidence is a real browser render plus interaction on the Pig headed Chrome at the URL and viewports above.
