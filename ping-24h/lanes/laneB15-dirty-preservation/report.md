# LANE B15 DIRTY-TREE PRESERVATION COMPLETION REPORT — PING 24h Program

Status: **HYPOTHESIS** (semantic classification is read-only interpretation of the preserved diff; it becomes evidence only after replay from a clean checkout). Preservation operations were read-only against the original tree.

T+0 = 2026-09-28 14:26 MDT. This lane ran ~15:14-15:20 MDT (T+0.8).

## 1. PRESERVATION BUNDLE

Assembled at [preservation/](sandbox://workspace/ping-24h/lanes/laneB13-dirty-tree/preservation/) (kept with the lane B13 artifacts it binds to):

| File | Content |
|---|---|
| `MANIFEST.json` | Base SHA `0264d517ea53358d9246ddbbba66bb9dd0beb0d4`, branch `hardening/2026-09-28-vocab-ssrf` (upstream none), worktree `/home/nolan/projects/ping` (Pig WSL), patch reference with sha256, 144/74/0/70 tree counts, full 70-entry untracked inventory, the 72 preserved untracked source paths, excluded-items list, method, and untouched record |
| `git-status.txt` | Fresh `git status --porcelain` capture from the live tree (~15:16 MDT), plus HEAD and ref verification sections (sha256 `ce0af879c349f388f11b8ad479aad9595922a3f3b2f166ca7862a0ab379193dd`) |
| `untracked-inventory.txt` | The 70 `??` porcelain entries (sha256 `c0587b3b64f359c0e90fe3076c22579f02b3de96616d87c5cdd93d335c2ef37f`) |
| `FINGERPRINT.txt` | Reproducible fingerprint over the bundle |

**Fingerprint:** `4b4be1cbc38c702c3d2e8fccf1035cdcb2c351ba0abf32cb568ae56e4e194343` = sha256( `MANIFEST.json` bytes || `dirty-tree.patch` bytes ). Patch sha256: `7bda63e7ef246277758b4ba0ff9f2cf4eae5002dac29851d3ce7c44dd7f88f9e` (913,336 bytes). Reproduce: `cd preservation/ && cat MANIFEST.json ../dirty-tree.patch | sha256sum`.

**Untouched record (verified this lane, read-only over Pig SSH):** HEAD is still `0264d517`, branch still `hardening/2026-09-28-vocab-ssrf` with no upstream, `refs/lanes/laneB13/dirty-tree-base` still resolves to `0264d517` (it marks the base commit only; the dirty content lives in the patch, not in any commit), and the porcelain count is still exactly 144 lines (74 modified, 0 staged, 70 untracked), identical to lane B13's observation at ~15:35 MDT. No merge, no reset, no clean, no checkout, no stash, no commit, no push. The preserved content was not transformed, cleaned up, reformatted, or normalized. The gateway was not contacted, the three jev-shadow scheduler missions (`402152d14539171b`, `70e962a9d257c6dc`, `a5dc21a36107b0a5`) were not touched, and :3100 was not restarted.

## 2. SEMANTIC CLUSTERING OF THE 146 FILES

All 146 diff entries (74 tracked + 72 untracked) placed in 17 clusters. Each cluster carries exactly one classification from the fixed label set. Counts verified to sum to 74 / 72 / 146.

### Cluster 1: MC dispatch hardening (Mission J/L) — 13 files — VALUABLE-PARTIAL
Tracked (4): `src/app/api/mc/_lib/mc-dispatch.ts`, `src/app/api/mc/dispatch/route.ts`, `src/app/api/mc/missions/[id]/route.ts`, `src/app/api/mc/missions/route.ts`. Untracked (9): `mc-dispatch-identity.ts`, `mc-tenant-gate.ts`, and the seven new MC routes (agents, approvals, graph, object, search, today, trace-forward).
Why partial: the trusted-caller gate (Mission J, Q-P0-06 finding #1) and tenant gate (Mission L, finding #4) are real, coherent security work with idempotency/409-HOLD and tenant-scoped artifact publishing. Two integration gaps: the caller registry path (`/home/nolan/workspace/mission-control/dispatch-identities.json`) lives outside the repo so the dispatch slice fail-closes without it, and the context-mint region needs a 3-way merge with the ContextPack patch (lane B13 section 3). The new read routes (graph, search, today, trace-forward) have no consumers inside this diff.

### Cluster 2: Digest consolidation — 9 files — VALUABLE-PARTIAL
New (2): `src/lib/ping/digest.ts`, `src/lib/ping/__tests__/digest.test.ts`. Import swaps (7): `context-compiler.ts`, `binding-verifier.ts`, `arrow2-proof.ts`, `live-loop.ts`, `static-adapter.ts`, `ask-composer.ts`, `proceduralize/sha256.ts`.
Why partial: the header claims one digest authority ("lanes import, never re-implement"), but lane B13 verified `digest.ts` diverges from `dev-signer.canonicalizeJson` on undefined-valued keys (emitted as null vs dropped), and the dirty `context-compiler.ts` hard-depends on the untracked `digest.ts`. Aspirational, not yet achieved.

### Cluster 3: Ask FYD honesty hardening (Mission M, PROD-3/4) — 17 files — VALUABLE-COMPLETE
`ask-pipeline.ts`, `ask/route.ts`, `visitor-answer.ts`, `contract.ts`, `ask-ping.tsx`, 10 ask test files (including `inv-13-contract-versions.test.ts`, which bumps the ask-response contract to `fyd.ask-response@2`), plus new `ask-response-class.test.ts` and `ask-scope-guard.test.ts`.
Why complete: closes numbered findings as a unit. Mission M ends "body is identity" (flat POST now 308-redirects to the trusted-path route); PROD-3 enforces out-of-scope refusals; PROD-4 strips internal ids via `stripInternalIds`; every change ships with matching updated or new tests.

### Cluster 4: Owner correction / customize hardening (Mission K/H, Flaw D, PROD-1) — 12 files — VALUABLE-COMPLETE
`customize/server.ts` (421+/7-), `customize/types.ts`, `customize/route.ts`, `overrides/route.ts`, `why-this/route.ts`, `owner-overlay.ts`, `why-this-steps.ts`, `demo-owner-mode.tsx`, `owner-overlay.test.ts`, `why-this-steps.test.ts`, plus new `overrides-get.test.ts` and `stale-guard.test.ts`.
Why complete: Mission K Bearer gating on the journal event route, Mission H stale-guard precondition (Flaw D, 100H-SOVEREIGN-DIRECTIVE) with typed STALE_APPROVAL/PRECONDITION_CHANGED errors, PROD-1 MOUNT CONTRACT, all test-backed including a 482-line synthetic-only stale-guard suite.

### Cluster 5: Object feed / verified public projection (PROD-5/6) — 23 files — VALUABLE-COMPLETE
`o/[objectId]/page.tsx` de-harnessed (5+/359-) into new `object-node-view.tsx`, `object-overlay.tsx`, `why-this.tsx`, `renderer.tsx`, `hero-section.tsx`, `contact-link.tsx`, `ask-fyd-widget.tsx`, `public-projection.ts`, `edge/client.ts`, `edge/resolve.ts`, `edge/object/route.ts`, `sites-render-audit.ts`, 4 component/edge tests, plus new `prod-10-object-view-deharness.test.tsx`, `public-chrome-gate.test.ts`, and 4 component tests (`prod-6-provenance-jargon`, `site-content-cleanup`, `website-cta`, `emergency-services-cta`).
Why complete: the PROD-10 de-harness refactor moves page logic into a pure component with tests; edge resolve is gated on VerifiedPublicProjection; PROD-6 plain-language provenance wording repairs are audited in sites-render-audit.ts.

### Cluster 6: Sites UI / lab demo surfaces — 13 files — VALUABLE-PARTIAL
`layout.tsx` (suppressHydrationWarning), `site-client.tsx`, `site-metadata.ts`, three sites pages, `build/[siteId]/page.tsx` + `owner-panel.tsx`, `dev/objects` lab files (3), plus new `objects-lab-client.test.tsx` and `src/fyd/jest.config.cjs`.
Why partial: coherent adaptations to the batch (verified-projection swap in sites/page.tsx, orphaned-correction detection in lab-adapter.ts), but these are demo/lab surfaces only; no production consumer changed, and most are untested UI tweaks.

### Cluster 7: Tenant isolation / data — 6 files — VALUABLE-PARTIAL
`fyd-tenant-graph.ts`, `onboarding/compile-tenant.ts`, `media/authority-binding.ts`, and the f/g/h tenant tests (journal privacy, route isolation, crash window).
Why partial: tenant plumbing moves forward with dedicated tests, but it is part of the same incomplete tenant story as Cluster 1 (registry outside repo, projection gating still being wired).

### Cluster 8: Proceduralize / retrieval — 9 files — VALUABLE-COMPLETE
`proceduralize/patch.ts`, `service-extraction.test.ts`, `canonicalizer-agreement.test.ts`, 4 `redacted-batch-c-*` fixtures (consultant, cpa, dentist, lawfirm), `ping-object-reader.ts`, `lib/ping/types.ts`.
Why complete: small, self-contained, test-backed; the fixtures exist to serve the canonicalizer agreement test, which is exactly how they are used.

### Cluster 9: Secret broker (lanes BCQ/CONN) — 4 files — VALUABLE-COMPLETE
`src/lib/secrets/secret-broker.ts`, `secret-broker.redteam.test.ts`, `README.md`, `jest.config.cjs`.
Why complete: a finished consumer-port design (opaque capability handles, scope-exact execute, redteam test, documented contract referencing the Lane L STATE.md). Self-contained module.

### Cluster 10: mc-approval vendored Python tooling — 9 files — DUPLICATE
`mc-approval/` (VENDOR-README.txt, 7 .py files, `w4-proposal.json`).
Why duplicate: VENDOR-README.txt states the canonical source is the mission-control repo branch p0/approval and says "Do not edit here; change the source branch and re-vendor." This is an intentional deploy copy of code owned elsewhere.

### Cluster 11: .github agent definitions — 10 files — VALUABLE-COMPLETE
`copilot-instructions.md`, 3 agent definitions, 6 instruction files (evidence-provenance, fyd-proceduralizer, fyd-tests, security-sensitive, sitespec-renderer, social-adapters).
Why complete: a finished, coherent instruction set with constitutional invariants for coding agents; nothing about it is half-written.

### Cluster 12: Journal gateway tooling — 3 files — VALUABLE-COMPLETE
`tools/fyd-journal-gateway/server.mjs` changes (31+/1-), new `README.md`, new `start.sh`.
Why complete: documents and starts the 18199 demo journal server contract; small and finished.

### Cluster 13: Backup files — 4 files — SUPERSEDED
`ask-scope-guard.test.ts.bak-r3`, `ask-composer.ts.bak-r3`, `registry.ts.bak`, `server.mjs.bak-2026-09-27-k`.
Why superseded: each is a round-backup of a file that exists in the tree in newer or unchanged form (`ask-scope-guard.test.ts`, `ask-composer.ts`, `registry.ts` verified tracked and unchanged since Sep 24, `server.mjs`). Machine-apply-pattern leftovers, no independent value.

### Cluster 14: Proof scratch / experiments — 3 files — VALUABLE-PARTIAL
`.proof-tmp/step5-hostile.ts`, `.proof-tmp/shell-less.tsx`, `geometry-regression.mjs`.
Why partial: these are runnable one-off proofs (hostile content at the renderer boundary; the margin-geometry invariant per Nolan's 2026-09-22 "Margins Are the Object Layer" directive, run on the Pig against :3100). They are not integrated into the test suite and their verdicts are not recorded here. Not broken (no failure evidence), but not finished artifacts either.

### Cluster 15: Generated media manifests — 4 files — GENERATED-DISPOSABLE
`src/fyd/media/manifests/*.json` (coppersmith-plumbing-live, happy-place-live, live-9d13c4196b4f, ping-fyd).
Why disposable: outputs of the media pipeline; regenerable from the pipeline at any time.

### Cluster 16: var/ runtime outputs — 4 files — GENERATED-DISPOSABLE
`var/fyd-intake/live-*/result.json` (3, runs from 2026-09-25, predating the batch) and `var/mc-approvals.json`.
Why disposable: point-in-time run outputs from the runtime scratch directory; regenerable by re-running.

### Cluster 17: New UI components — 3 files — VALUABLE-PARTIAL
`src/components/effects-provider.tsx`, `effects-toggle.tsx`, `hero-intro.tsx`.
Why partial: complete, well-formed components (effects preference persisted to localStorage, CSS-class gating), but no wiring or usage site exists anywhere in this diff.

### Count table (tracked / untracked per cluster)

C1 4/9, C2 7/2, C3 15/2, C4 10/2, C5 16/7, C6 11/2, C7 6/0, C8 4/5, C9 0/4, C10 0/9, C11 0/10, C12 1/2, C13 0/4, C14 0/3, C15 0/4, C16 0/4, C17 0/3. Tracked total 74, untracked total 72, combined 146. Every file in the patch is placed; nothing is in two clusters.

Note: files explicitly excluded from the patch and still in the live tree (four `.next*` build dirs, generated media under `public/fyd-media` and `public/t1-media`, two public images, `__pycache__`, `*.tsbuildinfo`, `=586`, `nul`) are GENERATED-DISPOSABLE by nature and were intentionally not preserved as source work.

## 3. WHAT WOULD FALSIFY THIS REPORT

1. The untouched claim: any future `git status --porcelain` showing a count other than 144, or a HEAD/ref differing from the recorded SHAs, falsifies the untouched record (it would mean someone wrote to the tree after 15:16 MDT).
2. The fingerprint: recomputing `cat MANIFEST.json ../dirty-tree.patch | sha256sum` from the preservation directory and getting anything other than `4b4be1cbc38c702c3d2e8fccf1035cdcb2c351ba0abf32cb568ae56e4e194343` falsifies the bundle integrity claim.
3. The clustering: it is interpretive. Replay from a clean checkout plus running the test suites would falsify specific labels, most likely candidates: C6 or C17 proving to be fully wired (would move to VALUABLE-COMPLETE), C14 proofs proving broken at runtime (would move to BROKEN EXPERIMENT), C10 proving to be the only surviving copy of its source (would move to VALUABLE-COMPLETE). No cluster was labeled BROKEN EXPERIMENT, DUPLICATE beyond C10, or ACTIVE OWNED, because no evidence in the diff supported those labels for the source files.
4. Owner attribution: lane B13's medium-confidence attribution (Pigi-driven mission batch, 2026-09-27, exact lane UNKNOWN) is inherited, not re-verified here. Any lane-identifying signal found later would refine or overturn it.

## 4. FOLLOW-UPS FOR THE PARENT

1. The VALUABLE-PARTIAL clusters (C1, C2, C6, C7, C14, C17) are the integration debt: external caller registry provisioning, the three-way ContextPack merge on the context-mint region, digest-authority convergence with `dev-signer.canonicalizeJson`, and the unwired UI/proof artifacts.
2. C13 (backups) and the GENERATED-DISPOSABLE clusters are safe to drop whenever the dirty tree is eventually resolved; C10 must never be edited in place (re-vendor from the mission-control repo).
3. The mc-approval and secret-broker clusters reference work owned by other lanes (W4, BCQ/CONN, Lane L); merging the dirty tree touches their surfaces.
