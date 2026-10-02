# Convergence Pass — 2026-09-24 ~19:00 MDT (read-only)

Recon of current reality. Nothing patched, committed, merged, or restarted.

## 1. Claim classification

| Claim | Observed evidence | Classification | Reason |
|---|---|---|---|
| 52 ASK FYD BLOCKED; lane-e-ask 179 tests green, uncommitted; Q-P0-01 fix folded in delta | /home/nolan/worktrees/lane-e-ask: detached HEAD e474c89b, **8 modified files** (ask-pipeline.ts, ask/answer.ts, context-builder.ts, types.ts, visitor-answer.ts, site-bundle.ts, field-visibility.ts, ask-composer.ts); no lane-e-ask branch; tree holds 168 test files | CURRENT | Uncommitted Ask delta confirmed; "179" is report-only, not re-verified this pass |
| 53 OWNER/PROJECTION BLOCKED; lane-d-impl 8 commits staged | No lane-d-impl branch in projects/ping; /home/nolan/workspace/lane-d holds only patch scripts + select.test.ts | UNKNOWN | The 8-commit stack is not locatable read-only; no branch/commit-stack found |
| 54 ACQUIREURL BLOCKED; 58/58 hostile SSRF tests, unintegrated | No acquireUrl code in projects/ping/src, build-edge-port/src, build-idem/src, or /home/nolan/ping | CURRENT | Consistent with "unintegrated"; 58/58 figure is report-only |
| 55 EDGE BLOCKED; fyd/edge-port 2 commits unmerged | Branch fyd/edge-port exists; tip 243fb120 (c767d595 + 243fb120 on top of e474c89b base); worktree has 5-9 uncommitted files (+354/-25) | CURRENT | 2 commits unmerged, plus trace-writer delta in flight |
| 56 WRITE BOUNDARY BLOCKED; tip d6c1b05d deployed file-wise | build-idem @ d6c1b05d (branch fyd/write-boundary-idempotency), 2 modified files (fyd-hostile-gate.mjs, customize/route.ts) | CURRENT for tip state; "deployed file-wise" SUPERSEDED | Tip confirmed; the file-wise deployment was superseded by the 18:07 :3100 restart from a different dirty tree |
| TenantOS 8 wave branches | 10 wave branches confirmed (P-20260923-001, -012, -089, -091, -092, -095, -098, -100, -103, -104-105) | CURRENT / DORMANT | Exist; Wave-3 freeze holds them dormant |
| template/HPP/builder branches | fyd/template-001-hpp-clone @ e4819ce8, clean (no dirty files); fyd-frontier-* branches (mobile-objects, h1clip, herofallback, dumper, contact, deactivate...) exist | CURRENT / DORMANT | Exist, unmerged; frozen except donor harvest |
| Q-P0-01 privacy fix lane-local | /home/nolan/ping @ c99e1ff36 (p1/tenant-spoof-ingress-fix), 5 modified files (qdrant/retrieval workers) | CURRENT | Lane-local, unintegrated into FYD |
| H4 20/20 edge green | Measured against pre-18:47 criteria; Nolan's 18:47 positioning order superseded it | SUPERSEDED | Old narrower criteria; real-path doorway proof in flight |
| "Production serves pure HEAD" (:3100) | Served tree /home/nolan/projects/ping @ e474c89b has **44 dirty files** (25 untracked, 19 modified); restart at 18:07 from this tree | REGRESSED | "Keep pure HEAD" boundary broken since the 18:07 restart |
| Gateway promotion live, digest pinned | ping-gateway:repair-cert-20260924@sha256:4472c543484e120f03095fd4276a8326e0db31ffe4701a35caf9ffb5c17379f2, created 17:21 MDT, Up ~1h | LIVE | Matches Q-P0-05 evidence |
| Falsifier verdicts invalidated (phantom tree) | Both falsifier reports cited /home/nolan/build-edge which does not exist on the Pig | CURRENT | Still invalidated; coordinator re-verified on real tree |
| :3100 serving /sites/happy-place + /sites/coppersmith-plumbing | Both return 200; /sites/coppersmith alias exists (b0cdc3b8) | LIVE | Verified this pass |
| :3101 edge proof surface | Serves from /home/nolan/build-edge-port @ 243fb120; root 200 | LIVE | cwd confirmed via /proc |
| BUILD_ID present | HFAN1gTqjafnSp9tnZg5x in projects/ping/.next | CURRENT | Exists, but provenance vs dirty source is now ambiguous |

## 2. Edge donor findings

**Found and recoverable.** The closer edge implementation Nolan remembers lives on branch `fyd-frontier-mobile-objects`:

- `1265aa15` (2026-09-24 10:16 MDT) "fyd-frontier-mobile-objects: prove and fix the mobile FYD object experience" — `src/fyd/components/object-overlay.tsx` (+249/-36), `src/fyd/components/renderer.tsx` (+113), `mobile-objects.test.ts` (224 lines), `site-client.tsx` (+1)
- `1d05f7fd` (2026-09-24 10:18 MDT) "fyd-frontier-mobile-objects: open full object bypasses overlay interception" — the all-objects overlay bypass mechanism
- Base `4d0ddf7b` (today 05:43) introduced `MarginObjectLayer` (position:absolute portal, document-height div) plus `object-affordance.tsx`, `object-rail.tsx`, `/objects` + `/objects/spatial` pages

Recoverability: **yes, intact**. `git merge-base --is-ancestor 1d05f7fd fyd/edge-port` = YES — the donor is already ported into the current edge work via `c767d595` ("EDGE-1 edge-object experience ported to the served tree", 17:30). A second recoverable copy of donor fragments sits at `/home/nolan/workspace/mobile-objects-lane` (renderer.tsx, site-client copies).

Caveats: (a) donor commits are from **today** (09-24), not 09-22/23 — no earlier granular edge history exists; `git log --all --since=2026-09-20` for margin/edge keywords shows nothing before the 4d0ddf7b squash. If Nolan remembers a 09-22/23 version, its history was squashed. (b) The current edge-port tip has already diverged under Nolan's 18:47 correction (sparse, extreme margins, page-anchored feel); the donor's fixed-positioning semantics are the pre-correction variant. The running Q-J-01 writer should harvest donor mechanics (overlay bypass, mobile object flow) without reverting the 18:47 positioning.

## 3. Deployment / provenance map

| Surface | Runs from | Built from | State |
|---|---|---|---|
| :3100 | /home/nolan/projects/ping | e474c89b (fyd-factory) + 44 dirty files; BUILD_ID HFAN1gTqjafnSp9tnZg5x | Live; /sites/happy-place + /sites/coppersmith-plumbing = 200; restarted 18:07 |
| :3101 | /home/nolan/build-edge-port | 243fb120 (fyd/edge-port) + 9 dirty files (+354/-25) | Live; root 200 |
| ping-gateway | ping-gateway:repair-cert-20260924@sha256:4472c543... | created 2026-09-24 17:21 MDT | Live, ~1h uptime |
| build-idem | fyd/write-boundary-idempotency @ d6c1b05d | + 2 modified files | Lane, not deployed as current |
| build-clean | fyd/sites-coppersmith-alias @ b0cdc3b8 | clean | Reference alias commit |
| build-template1 | fyd/template-001-hpp-clone @ e4819ce8 | clean | Unmerged |
| /home/nolan/ping | p1/tenant-spoof-ingress-fix @ c99e1ff36 | + 5 modified files (qdrant/retrieval workers) | Q-P0-01 lane |

Note: :3100's served tree carries 25 untracked files (`.proof-tmp/`, `.next.bak-20260924-redirect/`, `src/app/api/mc/*`, bespoke root-page components) and 19 modified — the running `.next` build's relationship to current source is unverified read-only.

## 4. "Your call" re-resolution

Per DELTA 6 / section 71: historical "your call" items are not automatically still blocked; re-resolve against current evidence and locked decisions first.

- **UNKNOWN/HOLD reaper contradiction (Q-P0-03, Q-F-03): RESOLVED, no escalation.** Locked CEO decision ~11:08 MDT: "UNKNOWN is PARK/HOLD, constitutional: lease expiry must never turn UNKNOWN back into CREATED; default no automatic re-execution after UNKNOWN unless a proven idempotency contract exists; timeout != failed." The reaper's question is answered; adopt the locked rule.
- **H21 (does PING expose a generic failure?): HELD.** No new evidence this pass; stays held behind convergence per order; writer dispatches after 52-56 integration throughput.

## 5. Recommended first integration inputs (smallest-first)

1. build-idem's 2 uncommitted files (fyd-hostile-gate.mjs + customize/route.ts) — smallest delta, Q-P0-03
2. /home/nolan/ping p1/tenant-spoof-ingress-fix (5 modified qdrant/retrieval workers) — Q-P0-01 ingress layer
3. lane-e-ask 8 modified files (ask pipeline + field-visibility + ask-composer) — Q-P0-01 with privacy fix folded in
4. fyd/edge-port 2 commits + 9-file trace delta — last; depends on 18:47 positioning semantics stabilizing

Blocked/missing inputs: 53's 8-commit lane-d-impl stack is **not locatable** (no branch, only patch scripts at /home/nolan/workspace/lane-d) — coordinator must source it before integrating 53. 54's acquireUrl has no code in any tree — integration must re-acquire from the lane.

---

**VERIFIED FRONTIER:** Integration bar per item — MERGED + CANONICAL TEST GREEN + REAL PRODUCT PATH GREEN + REPLAY/PROOF. Items 52-56 are all capability-present, integration-BLOCKED. Donor edge work is recoverable without rebuild.

**FIRST BROKEN BOUNDARY:** :3100 regressed from "serves pure HEAD" to 44 dirty files served since the 18:07 restart — the "KEEP PURE HEAD" boundary is currently broken, and the running build's provenance against dirty source is unverified.

**NEXT HIGHEST-LEVERAGE TEST:** Q-P0-01 Ask FYD field-level privacy gate, hostile, both directions (public viewer + hidden field -> zero disclosure; owner viewer -> disclosed). Coordinator to run — do not execute from this pass.
