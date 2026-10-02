# Sprint execution baseline — 2026-09-25 ~13:05 MDT

## Live surface (:3100, build from 8d3e3ebb, restarted 12:42:30 MDT)
- / → 200, /fyd → 200, /sites/happy-place → 200, /sites/coppersmith-plumbing → 200 (via Tailscale 100.79.154.43:3100, checked from Pig)
- /api/fyd/projection?siteId=happy-place → 200, contract.boundaryVersion=fyd.public-projection@1, BUT raw `graph` key (objects+relationships) STILL PRESENT → A1 leak OPEN in deployed build (Arrow 1 child closing it)
- POST /api/fyd/ask (happy-place, "What services does this business offer?") → 200, answerState KNOWN, answerClass "SUPPORTED BY MULTIPLE EVIDENCE", answer lists Repairs/Fencing/Painting/Drywall/Restoration with citations [9]-[13]; citations carry real object IDs (website-business-6fa5ebd99d72c4cb-service-*) and real source URLs (https://happy-place-platform.vercel.app/)
- /sites/happy-place and /sites/coppersmith-plumbing HTML: real titles, zero fixture/lorem/DEMO_SYNTHETIC markers

## Commits (branch fyd/sprint-integration-2026-09-24)
- 8d3e3ebb (12:41:37) margin directive round 3 — edge peeks, mobile overlay, sheet tap fix; :3100 rebuilt + restarted on it
- safe-link (javascript: href sink) committed earlier, test 16/16 pass → FL-20260921-032 CLOSED
- Mobile fixes committed (8d3e3ebb) → backlog "commit proven mobile/URL-safety fixes" DONE

## Lanes dispatched (~13:00 MDT)
1. bb4b10c1 — Arrow 1: Q-C-01/02/03/13 (boundary exists as getVerifiedPublicProjectionSync; complete routing, close A1-A6, hostile re-proof)
2. 41af5e07 — Arrow 2: real acquisition path (bytes→observations→evidence→graph, hostile fail-closed)
3. 889be30a — Arrow 6: "Move emergency plumbing first" NL→typed SitePatch→projection
4. cb6163f1 — PING: 8 wrong-domain observations quarantine + producer gate + 307/300 cap verify
5. a99b505f — TenantOS isolation proof + ORCA crash-window test (read-only)
6. cb7e3b89 — Authority UX consequence classification LOW/MEDIUM/HIGH/CRITICAL

## Q-P0-04 (FYD margin/edge-overlay verification): GREEN and CLOSED — 2026-09-25 ~13:10 MDT

Commit 61b7499f on fyd/sprint-integration-2026-09-24: exactly 4 files
(src/fyd/spatial/slot-manager.ts, src/fyd/ui/portal-host.tsx,
src/fyd/ui/portal-circle.tsx, src/fyd/spatial/__tests__/engaged-geometry.test.ts).

Tailscale-surface verification (100.79.154.43:3100, fresh production build + restart):
- Desktop 1280/1366: 56px edge peeks at extreme left/right (PEEK_D=56, circle
  centered on screen edge; host content never overlapped; inline strip removed;
  fail closed to null when no side fits).
- Desktop 1440/1920: 64px circles at extreme edges.
- No inline strip anywhere.
- Mobile 375/390: floating edge overlay, position absolute in the document
  (portaled to body), scrolls away with the page; NOT fixed chrome; no inline strip.
- Mobile tap: opens the sheet in-viewport with real content (name, location,
  description, category chips, Ask FYD / Following / Website actions, evidence
  with source URL).
- :3100 root + /sites/happy-place both 200 on the fresh build.

Note: this Q-P0-04 is the FYD margin/edge gate from the backlog order. The older
WORK-QUEUE.jsonl Q-P0-04 (wrong-journal guard) was already GREEN/CLOSED at ~09:35
MDT and is a different item.

## Pending
- Margin agent fc6353c5 final report (geometry evidence) — received via parent
  verification summary above; Q-P0-04 closed on that evidence.
- Lane status (~13:40 MDT): ALL 6 LANES DONE.
  - Arrow 1 privacy (b3c891c6): Q-C-01/02/03/13 GREEN. Invariants 13/13,
    110/110. PUBLIC PRIVACY LEAK CLOSED for the FYD boundary. Contract
    versions: fyd.public-projection@1, fyd.ask-response@1,
    fyd.circle-projection@1, fyd.sitemap@1. Residuals: Ask still uses
    publicGraphOf not the verified projection directly; conflict suppression
    still in compilePublicSite; PING lane uses separate PingObjectReader
    authority.
  - Arrow 6 (95b4702d, 106 tests), Arrow 2 (1bfff543, hostile 17/17),
    TenantOS/ORCA (0cd9ccfe; ORCA verdict FAIL/absent; journal torn-write
    RED FINDING pinned as test), consequence classification (32fab78f,
    23/23), quarantine (8/8 quarantined, Qdrant vectors purged 8->0,
    300 active/305 total, cap matrix 20/20).
- Coordinated rebuild + sanctioned restart DONE ~13:40 MDT:
  `npm run build` green on the Pig; restart via /home/nolan/start-3100.sh;
  root/happy-place/coppersmith all 200; NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1
  live. LIVE PROOF: /api/fyd/projection?siteId=happy-place serves exactly the
  verified public graph (7 objects, all visibility=public, 6 rels, no meta,
  no history) - leak CLOSED on the deployed build. POST /api/fyd/ask
  (happy-place, services question) -> KNOWN, SUPPORTED BY MULTIPLE EVIDENCE,
  5 citations with real object IDs.
- Arrow 3 browser journey (spec staged at
  arrow3-journey-spec-2026-09-25.md; needs parent browser-task delegation),
  then 18:15 MDT checkpoint in Nolan's exact format.
- Single coordinated rebuild + restart :3100 after the 2 running lanes commit
  (~16:30 target); then Arrow 3 browser journey (spec staged at
  arrow3-journey-spec-2026-09-25.md; needs parent browser-task delegation),
  then 18:15 MDT checkpoint in Nolan's exact format.

## New defects noted
- A1 leak still open in deployed build (raw graph key in /api/fyd/projection) — tracked under Q-C-01, in progress
- Root jest has no config; FYD tests need per-lane configs (e.g. src/fyd/sitespec/jest.config.cjs) — dev-experience note, not product
