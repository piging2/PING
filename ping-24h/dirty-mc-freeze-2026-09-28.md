# DIRTY MC SURFACE FREEZE — 2026-09-28 ~16:05 MDT

Owner order: FREEZE. Do NOT commit, revert, reset, clean, or overwrite.
Phase 1 lands in the isolated worktree; this tree is preserved as-is.

- HEAD: 0264d517ea53358d9246ddbbba66bb9dd0beb0d4
- Branch: hardening/2026-09-28-vocab-ssrf
- Tree: /home/nolan/projects/ping (CANONICAL, dirty)
- Porcelain lines: 146 (74 modified unstaged, 0 staged, remainder untracked)
- Unstaged diff: 74 files changed, 2708 insertions(+), 984 deletions(-)
- Ownership of dirty MC delta: UNKNOWN / OTHER-LANE (not classified yet)

## MC-relevant modified (unstaged)
- M src/app/api/mc/_lib/mc-dispatch.ts
- M src/app/api/mc/dispatch/route.ts
- M src/app/api/mc/missions/[id]/route.ts
- M src/app/api/mc/missions/route.ts

## MC-relevant untracked
- ?? mc-approval/  (vendored deploy copy of mission-control p0/approval; by design, do-not-edit-here)
- ?? src/app/api/mc/_lib/mc-dispatch-identity.ts
- ?? src/app/api/mc/_lib/mc-tenant-gate.ts
- ?? src/app/api/mc/agents/
- ?? src/app/api/mc/approvals/
- ?? src/app/api/mc/graph/
- ?? src/app/api/mc/object/
- ?? src/app/api/mc/search/
- ?? src/app/api/mc/today/
- ?? src/app/api/mc/trace-forward/

## Source/build/serve binding (last known, from program LEDGER 2026-09-28 morning)
- :3100 serves .next build from 2026-09-27 21:00:32 (stale vs HEAD).
- Journal gateway serves dirty server.mjs (tools/fyd-journal-gateway/server.mjs has unstaged changes, see diffstat).
- NOT re-probed at freeze time; :3100 left untouched per standing rule.

## Pre-Phase-2 classification (NOT NOW — owner decision required per Q2)
Each dirty MC file to be classified KEEP / CHERRY-PICK / SUPERSEDED /
DISCARD-WITH-OWNER-APPROVAL before Phase 2. NO RESET. NO CLEAN. NO OVERWRITE.

## Full porcelain (frozen)
```

 M src/app/api/fyd/ask/__tests__/ask-classes-tenant.test.ts
 M src/app/api/fyd/ask/__tests__/ask-support-classes.test.ts
 M src/app/api/fyd/ask/__tests__/object-scope.test.ts
 M src/app/api/fyd/ask/__tests__/route-smoke.test.ts
 M src/app/api/fyd/ask/__tests__/route.test.ts
 M src/app/api/fyd/ask/ask-pipeline.ts
 M src/app/api/fyd/ask/route.ts
 M src/app/api/fyd/customize/route.ts
 M src/app/api/fyd/edge/object/route.ts
 M src/app/api/fyd/objects/[objectId]/overrides/route.ts
 M src/app/api/fyd/why-this/route.ts
 M src/app/api/mc/_lib/mc-dispatch.ts
 M src/app/api/mc/dispatch/route.ts
 M src/app/api/mc/missions/[id]/route.ts
 M src/app/api/mc/missions/route.ts
 M src/app/build/[siteId]/owner-panel.tsx
 M src/app/build/[siteId]/page.tsx
 M src/app/dev/objects/lab-adapter.ts
 M src/app/dev/objects/objects-lab-client.tsx
 M src/app/dev/objects/page.tsx
 M src/app/layout.tsx
 M src/app/o/[objectId]/page.tsx
 M src/app/sites/_shared/site-client.tsx
 M src/app/sites/_shared/site-metadata.ts
 M src/app/sites/coppersmith-plumbing/page.tsx
 M src/app/sites/happy-place/page.tsx
 M src/app/sites/page.tsx
 M src/components/ping/ask-ping.tsx
 M src/fyd/acquisition/arrow2-proof.ts
 M src/fyd/acquisition/live-loop.ts
 M src/fyd/acquisition/static-adapter.ts
 M src/fyd/ask/__tests__/context-projection-canary.test.ts
 M src/fyd/ask/__tests__/lane-e-battery.test.ts
 M src/fyd/ask/__tests__/lane-e-oneclick.test.ts
 M src/fyd/ask/__tests__/services-evidence.test.ts
 M src/fyd/ask/context-compiler.ts
 M src/fyd/ask/contract.ts
 M src/fyd/ask/visitor-answer.ts
 M src/fyd/components/__tests__/hero-contact.test.ts
 M src/fyd/components/__tests__/render.test.ts
 M src/fyd/components/ask-fyd-widget.tsx
 M src/fyd/components/contact-link.tsx
 M src/fyd/components/hero-section.tsx
 M src/fyd/components/object-overlay.tsx
 M src/fyd/components/renderer.tsx
 M src/fyd/customize/server.ts
 M src/fyd/customize/types.ts
 M src/fyd/data/fyd-tenant-graph.ts
 M src/fyd/edge/__tests__/q2-hostile.test.ts
 M src/fyd/edge/__tests__/resolve.test.ts
 M src/fyd/edge/client.ts
 M src/fyd/edge/resolve.ts
 M src/fyd/invariants/__tests__/inv-13-contract-versions.test.ts
 M src/fyd/media/authority-binding.ts
 M src/fyd/object/__tests__/owner-overlay.test.ts
 M src/fyd/object/__tests__/why-this-steps.test.ts
 M src/fyd/object/owner-overlay.ts
 M src/fyd/object/why-this-steps.ts
 M src/fyd/onboarding/compile-tenant.ts
 M src/fyd/owner-mode/demo-owner-mode.tsx
 M src/fyd/proceduralize/__tests__/service-extraction.test.ts
 M src/fyd/proceduralize/patch.ts
 M src/fyd/proceduralize/sha256.ts
 M src/fyd/sitespec/binding-verifier.ts
 M src/fyd/sitespec/public-projection.ts
 M src/fyd/sitespec/sites-render-audit.ts
 M src/fyd/tenant/__tests__/f-journal-privacy.test.ts
 M src/fyd/tenant/__tests__/g-route-isolation.test.ts
 M src/fyd/tenant/__tests__/h-crash-window.test.ts
 M src/fyd/ui/why-this.tsx
 M src/lib/ping/ask-composer.ts
 M src/lib/ping/ping-object-reader.ts
 M src/lib/ping/types.ts
 M tools/fyd-journal-gateway/server.mjs
?? .github/
?? .next.backup-missionj-20260927/
?? .next.bak-20260924-redirect/
?? .next.integration-build-20260924/
?? .next.pre-purehead-20260924/
?? .proof-tmp/
?? =586
?? geometry-regression.mjs
?? mc-approval/
?? nul
?? public/fyd-media/0814931246c2c278dd2a94e9924b14800d67d0e4b223200601354cc78c85b4f9/
?? public/fyd-media/16052e5f595077bf9828ec6ad98059568b2c9bacadcd262e7a03e905ee51bdb1/
?? public/fyd-media/2ae2a4014e626e2deadfd27ce6fe7bded0a2d4afcbae9e4e07d93407793e390e/
?? public/fyd-media/53a4ae9b18a8111b52578e38ee0c42c7cb5b3c200b35fd2d8c23ba8473b3b77d/
?? public/fyd-media/8071322c6849680a0ae7d0fd218d9dd3b5f81aa73b8c517a38aa2e492132889d/
?? public/fyd-media/8b10a331c651857abb4e2d64caa7c38c1f7fb3b875213d322d124ae03257eb34/
?? public/fyd-media/8ea630c93e213c2303862194d7706eda0c9f728dc2e26a76e852708e8d1799fa/
?? public/fyd-media/c588c3642476b63889da79171eb4298dabc807cfb1e4d50d0e5cfbe56c0849df/
?? public/fyd-media/eecbf99794e531e35a4f17a1c331d3e583124abbd0d3ae213d1d1588dd6df4fb/
?? public/images/ping-cosmos-hero.jpg
?? public/images/ping-mark.png
?? public/t1-media/
?? src/app/api/fyd/objects/[objectId]/overrides/__tests__/overrides-get.test.ts
?? src/app/api/mc/_lib/mc-dispatch-identity.ts
?? src/app/api/mc/_lib/mc-tenant-gate.ts
?? src/app/api/mc/agents/
?? src/app/api/mc/approvals/
?? src/app/api/mc/graph/
?? src/app/api/mc/object/
?? src/app/api/mc/search/
?? src/app/api/mc/today/
?? src/app/api/mc/trace-forward/
?? src/app/dev/objects/__tests__/
?? src/app/o/[objectId]/__tests__/
?? src/app/o/[objectId]/object-node-view.tsx
?? src/app/sites/__tests__/
?? src/components/effects-provider.tsx
?? src/components/effects-toggle.tsx
?? src/components/hero-intro.tsx
?? src/fyd/ask/__tests__/ask-response-class.test.ts
?? src/fyd/ask/__tests__/ask-scope-guard.test.ts
?? src/fyd/ask/__tests__/ask-scope-guard.test.ts.bak-r3
?? src/fyd/components/__tests__/emergency-services-cta.test.ts
?? src/fyd/components/__tests__/prod-6-provenance-jargon.test.ts
?? src/fyd/components/__tests__/site-content-cleanup.test.ts
?? src/fyd/components/__tests__/website-cta.test.ts
?? src/fyd/components/registry.ts.bak
?? src/fyd/customize/__tests__/stale-guard.test.ts
?? src/fyd/jest.config.cjs
?? src/fyd/lineage/tsconfig.tracer.tsbuildinfo
?? src/fyd/media/manifests/coppersmith-plumbing-live.json
?? src/fyd/media/manifests/happy-place-live.json
?? src/fyd/media/manifests/live-9d13c4196b4f.json
?? src/fyd/media/manifests/ping-fyd.json
?? src/fyd/proceduralize/__fixtures__/redacted-batch-c-consultant.ts
?? src/fyd/proceduralize/__fixtures__/redacted-batch-c-cpa.ts
?? src/fyd/proceduralize/__fixtures__/redacted-batch-c-dentist.ts
?? src/fyd/proceduralize/__fixtures__/redacted-batch-c-lawfirm.ts
?? src/fyd/proceduralize/__tests__/canonicalizer-agreement.test.ts
?? src/lib/ping/__tests__/digest.test.ts
?? src/lib/ping/ask-composer.ts.bak-r3
?? src/lib/ping/digest.ts
?? src/lib/secrets/
?? tools/fyd-journal-gateway/README.md
?? tools/fyd-journal-gateway/server.mjs.bak-2026-09-27-k
?? tools/fyd-journal-gateway/start.sh
?? tools/fyd-site-projection/__pycache__/
?? tsconfig.arrow6.tsbuildinfo
?? tsconfig.guardcheck.tsbuildinfo
?? var/

```

## Unstaged diffstat (frozen)
```

 .../fyd/ask/__tests__/ask-classes-tenant.test.ts   |  42 +-
 .../fyd/ask/__tests__/ask-support-classes.test.ts  |  25 +-
 src/app/api/fyd/ask/__tests__/object-scope.test.ts |  52 ++-
 src/app/api/fyd/ask/__tests__/route-smoke.test.ts  | 117 ++++--
 src/app/api/fyd/ask/__tests__/route.test.ts        |  16 +-
 src/app/api/fyd/ask/ask-pipeline.ts                |  69 +++-
 src/app/api/fyd/ask/route.ts                       |  20 +-
 src/app/api/fyd/customize/route.ts                 |  60 ++-
 src/app/api/fyd/edge/object/route.ts               |  35 +-
 .../api/fyd/objects/[objectId]/overrides/route.ts  |  14 +-
 src/app/api/fyd/why-this/route.ts                  |   2 +-
 src/app/api/mc/_lib/mc-dispatch.ts                 |  60 ++-
 src/app/api/mc/dispatch/route.ts                   | 140 ++++++-
 src/app/api/mc/missions/[id]/route.ts              |  20 +-
 src/app/api/mc/missions/route.ts                   |  17 +-
 src/app/build/[siteId]/owner-panel.tsx             |  67 +++-
 src/app/build/[siteId]/page.tsx                    |  30 +-
 src/app/dev/objects/lab-adapter.ts                 |  19 +-
 src/app/dev/objects/objects-lab-client.tsx         |  28 ++
 src/app/dev/objects/page.tsx                       |   7 +-
 src/app/layout.tsx                                 |   2 +-
 src/app/o/[objectId]/page.tsx                      | 364 +-----------------
 src/app/sites/_shared/site-client.tsx              |  74 ++--
 src/app/sites/_shared/site-metadata.ts             |  50 ++-
 src/app/sites/coppersmith-plumbing/page.tsx        |  14 +-
 src/app/sites/happy-place/page.tsx                 |  14 +-
 src/app/sites/page.tsx                             |   4 +-
 src/components/ping/ask-ping.tsx                   |   6 +-
 src/fyd/acquisition/arrow2-proof.ts                |   5 +-
 src/fyd/acquisition/live-loop.ts                   |   5 +-
 src/fyd/acquisition/static-adapter.ts              |   5 +-
 .../__tests__/context-projection-canary.test.ts    |   2 +-
 src/fyd/ask/__tests__/lane-e-battery.test.ts       |   2 +-
 src/fyd/ask/__tests__/lane-e-oneclick.test.ts      |   2 +-
 src/fyd/ask/__tests__/services-evidence.test.ts    |   2 +-
 src/fyd/ask/context-compiler.ts                    |   5 +-
 src/fyd/ask/contract.ts                            |   2 +-
 src/fyd/ask/visitor-answer.ts                      | 175 ++++++++-
 src/fyd/components/__tests__/hero-contact.test.ts  |   6 +-
 src/fyd/components/__tests__/render.test.ts        |  10 +-
 src/fyd/components/ask-fyd-widget.tsx              |  34 +-
 src/fyd/components/contact-link.tsx                |  39 +-
 src/fyd/components/hero-section.tsx                |  58 ++-
 src/fyd/components/object-overlay.tsx              |  30 +-
 src/fyd/components/renderer.tsx                    |  97 +++--
 src/fyd/customize/server.ts                        | 428 ++++++++++++++++++++-
 src/fyd/customize/types.ts                         |  17 +-
 src/fyd/data/fyd-tenant-graph.ts                   |   5 +-
 src/fyd/edge/__tests__/q2-hostile.test.ts          |  10 +-
 src/fyd/edge/__tests__/resolve.test.ts             |  42 +-
 src/fyd/edge/client.ts                             |  13 +-
 src/fyd/edge/resolve.ts                            |  15 +-
 .../__tests__/inv-13-contract-versions.test.ts     |   2 +-
 src/fyd/media/authority-binding.ts                 |   5 +-
 src/fyd/object/__tests__/owner-overlay.test.ts     | 262 ++++++++++++-
 src/fyd/object/__tests__/why-this-steps.test.ts    |  11 +-
 src/fyd/object/owner-overlay.ts                    | 184 ++++++++-
 src/fyd/object/why-this-steps.ts                   |  55 +--
 src/fyd/onboarding/compile-tenant.ts               |   5 +-
 src/fyd/owner-mode/demo-owner-mode.tsx             |   8 +-
 .../__tests__/service-extraction.test.ts           |   3 +-
 src/fyd/proceduralize/patch.ts                     |  22 ++
 src/fyd/proceduralize/sha256.ts                    |  67 +---
 src/fyd/sitespec/binding-verifier.ts               |  91 +----
 src/fyd/sitespec/public-projection.ts              |   5 +-
 src/fyd/sitespec/sites-render-audit.ts             |   9 +-
 src/fyd/tenant/__tests__/f-journal-privacy.test.ts |  10 +-
 src/fyd/tenant/__tests__/g-route-isolation.test.ts |  37 +-
 src/fyd/tenant/__tests__/h-crash-window.test.ts    |  10 +-
 src/fyd/ui/why-this.tsx                            |  49 ++-
 src/lib/ping/ask-composer.ts                       | 403 +++++++++++++++++--
 src/lib/ping/ping-object-reader.ts                 |  37 +-
 src/lib/ping/types.ts                              |   8 +
 tools/fyd-journal-gateway/server.mjs               |  32 +-
 74 files changed, 2708 insertions(+), 984 deletions(-)

```
