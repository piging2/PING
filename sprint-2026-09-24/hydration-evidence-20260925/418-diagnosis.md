# React #418 Root-Cause Diagnosis — 2026-09-25 ~16:25 MDT

## Verdict
#418 is caused by a **server/client environment skew in the DemoOwnerMode gate**,
not by the presence work, the Q-C-01 migration, or viewport logic.

## Evidence chain
1. Fresh SSR HTML from :3100 (clean 6f2dd65e build) CONTAINS the full
   "DEMO OWNER MODE - not real authentication" banner section
   (src/app/sites/happy-place/page.tsx renders <DemoOwnerMode siteId/>).
2. Post-hydration client DOM (fresh incognito, same build) has NO banner at all.
3. `src/fyd/owner-mode/demo-owner-mode.tsx:41` — "use client" component,
   `if (!isDemoOwnerModeEnabled()) return null;`
4. `src/fyd/owner-mode/gate.ts:33-38` —
   `return process.env.NEXT_PUBLIC_FYD_DEMO_OWNER_MODE === "1";`
   The file's own comment warns: inlining skew "caus[es] server/client skew
   and hydration #418".
5. Server: env read at request runtime. Verified live:
   `tr '\0' '\n' < /proc/31757/environ` => NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1.
   Server renders the banner.
6. Client: NEXT_PUBLIC_* is inlined at BUILD time. The 16:0x rebuild ran via
   pigwsl WITHOUT the env var exported, so the client bundle inlined
   `undefined`; the client's first render returns null.
7. Server HTML (banner) vs client first render (null) => hydration mismatch
   => minified React error #418 on BOTH site pages at ALL five widths,
   regular + fresh-incognito. Homepage is clean (no DemoOwnerMode mount).

## Ruled out
- The `{s.step}:` "Photo source<!-- -->:" diffs are NOT mismatches. SSR emits
  131 `<!-- -->` text separators; the post-hydration client DOM has 0.
  React strips separator comments during successful hydration; the spans
  hydrated cleanly.
- The `data-projection` attribute delta on the object-layer div is a
  post-hydration effect update (layout measured in useEffect), not a
  hydration mismatch. First client render matches the SSR shell.
- Presence work (87671a5f): not the cause. Peek containment PASS, CLS 0.0.
- The two quarantined "superseded" fixes: correctly excluded (triage proved
  they don't mask it); the real cause is the env skew.

## Why the 15:05 "lane closed" claim was wrong
That verification must have run against a build whose client bundle had the
env var inlined as "1" (built with the var set). Any rebuild without the var
reintroduces the skew. The build pipeline does not set it.

## Fix (NOT applied — task scoped to diagnose)
Rebuild with the var set, then restart via the sanctioned script:
  cd /home/nolan/projects/ping
  NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 npm run build
  /home/nolan/start-3100.sh
Then re-run verify-hydration-incognito.cjs + verify-hydration-widths.cjs.
Durable fix: make the build path export the var (start-3100.sh sets it only
for `npm start`, not for `npm run build`), or evaluate the gate at runtime
on both sides.

## Corroborating live proof (clean 6f2dd65e build, :3100 pid 31757)
- hpp + copper: hydration418=1 at 1280/1440/1920/375/390 (fresh incognito too)
- home: hydration418=0 at all 5 widths
- CLS 0.0 everywhere; peek1440 ok (6 buttons); projection dual@desktop, mobile@375/390
- Screenshots + report: ~/workspace/sprint-2026-09-24/hydration-evidence-20260925/
