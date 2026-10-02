# #418 fix verification run — 2026-09-25 ~17:15 MDT

## Fix (commit 56629e4b, branch fyd/sprint-integration-2026-09-24, local only, no push)

Nolan directive option B: the demo-owner gate is resolved server-side exactly
once and passed down as a prop. The client component never independently
reads environment state.

- `src/fyd/owner-mode/demo-owner-mode.tsx`: `DemoOwnerMode({ siteId, enabled })`;
  gates on the prop; `isDemoOwnerModeEnabled` import removed; no `process.env`.
- `src/fyd/owner-mode/gate.ts`: `isDemoOwnerModeEnabled()` documented as
  SERVER-ONLY resolution; resolved value must be passed as a prop.
- `src/app/sites/happy-place/page.tsx`, `src/app/sites/coppersmith-plumbing/page.tsx`:
  `<DemoOwnerMode siteId={SITE_ID} enabled={isDemoOwnerModeEnabled()} />`.
- `src/app/dev/objects/page.tsx` + `objects-lab-client.tsx`: third call site
  found by tsc; gate resolved in the server page, threaded through
  `demoOwnerModeEnabled` prop.
- Regression test `src/fyd/owner-mode/__tests__/demo-owner-gate-prop.test.ts`:
  6/6 pass. Pins prop-only rendering (banner renders with env ABSENT when
  enabled=true; renders nothing when enabled=false even with env=1) plus a
  structural guard (client source contains no `isDemoOwnerModeEnabled`,
  no `process.env`).

tsc clean. Full owner-mode suite: 58/58 pass.

## Live verification (production build, :3100 restarted via /home/nolan/start-3100.sh)

- `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` verified live in the server process env.
- Incognito (fresh, no extensions): both site pages `has418=false`, 0 errors
  (`incognito-418fix.json`).
- 5-width probe (`hydration-widths-report.json`): hydration418=0 at
  1280/1440/1920/375/390 on Happy Place, Coppersmith, and homepage.
  CLS 0.0 everywhere. Peek containment PASS (6 buttons @1440).
  Object layer present on site pages (dual @desktop, mobile @375/390).
- Homepage shows 1 console error at every width: a 404 on a resource load
  (favicon-class), not hydration-related. Pre-existing, out of this lane's scope.

## Result

**#418: GREEN.** Root cause eliminated structurally, not by remembering an
env var at build time. Reintroduction requires editing the client component
to read env state again, which the regression test's structural guard fails.
