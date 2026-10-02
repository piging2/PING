# CRX-runtime convergence sweep — DISCOVERY inventory (T+0)
Date: 2026-09-28 ~06:13-06:45 MDT. Read-only. Nothing modified, staged, committed, stashed, pushed, or restarted.

## A. Local VM (/home/hatch)

### A1. PING monorepo — /home/hatch/workspace — remote origin https://github.com/piging2/PING
- Main worktree branch: `security/secret-redaction-2026-09-28` @ 965289637c8eeb46c43f4adef33ac8e78ab00448, committed 2026-09-28 06:14:03 MDT (12:14:03 UTC) by Pigi. **Changed mid-sweep**: at sweep start the main worktree was `p0/approval` @ cf4442f755cfdda86691c817cdb2664bf79787ad; an external writer checked out the new branch and committed 9652896 during discovery (see ACTIVE WRITER section).
- `p0/approval`: 58 commits ahead of master, no upstream (unpushed).
- Working tree (security branch): 23 modified tracked + 5 deleted tracked + 1727 untracked, 0 staged. Stash: 1 (`WIP on fyd/builder-rebuild-v1: b78c0bb backlog: FYD-009 DONE_VERIFIED`).
- Remote refs known locally: only `origin/feat/orca-unknown-outcome-port`. Via anonymous ls-remote, remote has: main @ 81b3248, feat/orca-unknown-outcome-port @ be5c20c, fyd-deploy @ ade4ee5.
- Notable uncommitted tracked modifications (backend-relevant): `lane-p01/tree/src/app/api/mc/_lib/mc-dispatch.ts` (-43), `lane-p01/tree/src/app/api/mc/dispatch/route.ts` (91), `lane-p01/tree/src/fyd/ask/{context-builder,types,visitor-answer}.ts`, `lane-p01/tree/src/fyd/lineage/tracer.ts`, `lane-p01/tree/src/fyd/net/safe-fetch.ts` (137), `lane-p01/tree/src/fyd/proceduralize/{structured-data.ts (264),proceduralizer.ts,STRUCTURED-DATA.md}`, `tandem/emit-observation.py` (245); deleted: `fyd/identity/data/fyd-identity/audit.jsonl`, 3 media manifests, `registry.ts.bak`.
- **lane-p01/tree/ is a synced copy of the Pig FYD-repo vocab-ssrf tree**: sha256 of `lane-p01/tree/src/fyd/net/safe-fetch.ts` == Pig `/home/nolan/projects/ping/src/fyd/net/safe-fetch.ts` == Pig repo HEAD blob (`694d2059de6047e0a5b5cefb4ce306e38534b2bcbfe8de313ddc77cf39435005`).
- Untracked (topdirs): outreach 620, fyd-product-lane 228, tandem 106, sprint-2026-09-24 87, fyd-lane 86, goals 63, your_files 29, orca-mc-convergence 19, bin 13, lane-p01 12, mission-control 11, orca 10.

### A2. PING-repo worktrees (all remote = piging2/PING)
| Path | Branch | HEAD | State |
|---|---|---|---|
| /home/hatch/falsify-consequence-55b5d89 | detached | 55b5d89 | clean |
| /home/hatch/repair-consequence | detached | db78888 | clean |
| .worktrees/ar-cac | detached | cacf7b2 | clean |
| .worktrees/fd537 | detached | 537d264 | clean |
| .worktrees/gap1-f1 | substrate/gap1-F1-lane-e-floats | 9d42351 | 6 untracked (fyd-lane/, pycache) |
| .worktrees/gap2-provenance | substrate/gap2-provenance-ref | 62d3314 | 1 untracked |
| .worktrees/substrate-gap4 | substrate/gap4-binding-lint | e7c0ccf | clean |
| .worktrees/substrate-gap5 | substrate/gap5-probe-health | 49febc1 | 1 untracked (pycache) |
| .worktrees/tenant-hostile | mc/tenant-hostile-tests | a65846d | 5 untracked (pycache, orca-adapter/) |
| track-a/d1-monitors/{work,replay} | track-a/d1-monitors / detached | 98ba0db | clean |
| track-a/d2-schedule/{work,replay} | track-a/d2-schedule / detached | 36ae804 | clean |
| track-a/d3-igprefilter/{work,replay} | track-a/d3-igprefilter / detached | c4425fc | replay: 1 untracked |
| track-a/d4-spool/{work,replay} | track-a/d4-spool / detached | 77f9776 | replay: 1 untracked |
| /home/hatch/worktrees/audit-beyond-backlog-2026-09-19 | audit/beyond-backlog-2026-09-19 | 38535ea | clean |
| /home/hatch/worktrees/gap1-F2-absorb-floats | fix/gap1-f2-absorb-floats | 2fa9c9b | 16 untracked |
| /home/hatch/worktrees/mc-budget-repair | mc/mission-budgets | f336c80 | clean |
| /home/hatch/worktrees/mc-pass-migration-proof | mc/pass-migration-proof | 28c92f4 | 2 untracked |
| /home/hatch/worktrees/refalsify-budget | detached | f336c80 | clean |

### A3. PING-repo local branches: unique commits vs p0/approval (all unpushed; no upstreams)
- security/secret-redaction-2026-09-28: 1 (9652896 P0-SECRET-01 secret redaction; orca-adapter/adapter.js +481/-14, test/secret-redaction-selftest.js new 684)
- fix/broker-failclosed-containment: 1 (da64baa broker fail-closed execution-identity allowlist identity_1..4; pig-fb/copilot-broker)
- lane-c/orca-adapter-2026-09-26: 3 (d5d56bc tenant_id threading; 6d80db4 headless-agent adapter + UNKNOWN semantics; d5a7fa1 media lane)
- lane-f/harness-2026-09-26: 5 (b7bfbcd harness 9/9 PASS; 11198c7 tenant_id through broker.dispatch)
- mc/tenant-hardening: 6 (38c7ad0 front-door+approval tenant unit; ddd60eb H2a/H5b/revocation; 537d264 idempotency D1/D2; cacf7b2 ApprovalRequest; f7262f7 dispatch contract)
- mc/tenant-hostile-tests: 5 (a65846d hostile tenant-isolation suite 692 lines + same mc merges)
- mc/consequence-policy-input: 5 (db78888, 55b5d89 consequence-as-policy-input + lane-c commits)
- mc/frontdoor-hardening: 3 (ddd60eb, 537d264, f7262f7)
- mc/mission-intent-frontdoor: 2 (537d264, f7262f7)
- mc/approval-request: 1 (cacf7b2 canonical ApprovalRequest 1039 lines)
- mc/pass-migration-supersession: 16 (d7b10a8 STUBS wiring; merges of approval/consequence/budgets/frontdoor; 28c92f4 pass-migration proof)
- mc/mission-budgets: 2 (f336c80 falsifier repair; ea750d5 budget-as-capability)
- mc/pass-migration-proof: 1 (28c92f4, 1678 lines)
- mc/fyd-shapeA-site-console: 2 (7a7a892 tenant-scoped MC dispatch console sites/[slug], 1661 lines; b133d5a baseline)
- substrate/gap1-F1-lane-e-floats: 4 (9d42351 canon refuses floats; 38cba5a ledger; 0e4c543 conformance fixture; af001e3)
- substrate/gap1-F6-lane-e-keyorder: 5 (c49e892 UTF-16 key order + F1 set)
- substrate/gap1-canonical-conformance: 3 (38cba5a, 0e4c543, af001e3)
- substrate/gap2-provenance-ref: 1 (62d3314 shared typed provenance authority, 2715 lines)
- substrate/gap3-journal-identity: 3 (e84764e journal_identity.py extraction; 9da0ea9 UTF-16 key sort)
- substrate/gap4-binding-lint: 1 (e7c0ccf reusable presentation-binding lint)
- substrate/gap5-probe-health: 2 (49febc1 typed probe health envelopes)
- fix/gap1-f2-absorb-floats: 1 (2fa9c9b canonical.ts refuses floats)
- stream-b/composeview-visibility: 2, stream-b/publicgraphof-visibility: 1 (journaled field-visibility)
- jev/shadow-recorder: 2 (acd3eba Jev shadow decision recorder + MC event spec; 849cf7c)
- audit/beyond-backlog-2026-09-19: 1 (38535ea)
- 0 unique vs p0/approval (already in base): mc/lane-c-reconcile-gate, mc/audit-payload-lifecycle, mc/sprint-integration-2026-09-27, trackc/tenant-prep-2026-09-27, spine/x-pass-reached-path, orca-engagement-pipeline-endgame, burn/orca-f04, burn/orca-f06, burn/outreach-caps, p0/front-door-idempotency, feat/orca-unknown-outcome-port, fyd/builder-rebuild-v1, fyd/builder-rebuild-v1-cherrypick.

### A4. FYD builder repo (LOCAL) — common dir /home/hatch/workspace/fyd-build/.git, NO remotes
- Main worktree /home/hatch/workspace/fyd-build: branch fyd-025-semantic-determinism @ 841825c, 10 untracked (design docs: hpp-lane/, work/* proposals).
- Worktrees: .worktrees/gap2-fydbuild (substrate/gap2-provenance-ref @ 872261c, clean); fyd-replay-2026-09-27-r2 (detached @841825c, clean); fyd-replay/integrated (fyd-integration-replay-2026-09-27 @ 0e8705b, 1 untracked node_modules); /home/hatch/worktrees/track-b (fyd/track-b-ask-loop @ ca16774, 1 untracked node_modules).
- STALE registrations (do not exist): /home/nolan/build-edge (fyd/edge-object-experience @ ce1da5c), /tmp/edge-verify. Pig-path leakage proves this git dir was copied from a Pig-side repo.
- Branches ahead of master (all local-only, 2026-09-25..27): fyd-002-acquisition-contract 2, fyd-010-field-gate 1, fyd-011-conflict-surfacing 7, fyd-012-binding-verifier 4, fyd-013-superseded-evidence 12, fyd-016-correct-survival 11, fyd-017-field-triple 13, fyd-018-correction-record 14, fyd-025-semantic-determinism 17, fyd-026-claim-classifications 15, fyd-038-demo-synthetic-labeling 6, fyd-integration-replay-2026-09-27 9, fyd/track-b-ask-loop 3, fyd/edge-object-experience 2, fyd012-lint-hardening 6, site-client-title-binding 4, substrate/gap2-provenance-ref 18 (TS provenance_ref twin + served adoption).

### A5. Small PING-owned repos (local)
- /home/hatch/shapec-work: branch mc-fyd-shapec-2026-09-27 @ 92571aa (Shape C: read-only MC mission observer sites/[slug]/activity; mc-dispatch.ts + test), clean, no remote.
- /home/hatch/worktrees/fyd-write-boundary: master @ 592db56, 1 modified (jest.config.cjs), no remote.
- /home/hatch/workspace/demo-sites, /home/hatch/workspace/trackc-tenant-backup/tenant-prep/demo-sites (8 untracked), /home/hatch/workspace/fyd-factory/hpp-clone (1 untracked), fyd-factory/missions/work-0/patchcheck (clean), ping-ui-contract (1 untracked), tenanos-wave/swarm-17/.applycheck2 (broken clone, HEAD zeros).
- Vendor clones (obs-scratch/*, crx-autonomous-missions/repos/*, ping-build-program/harvest/*, scratch/durable-exec-src/*, ping-autonomy-challenge/*-src, crawl4ai, firecrawl): all clean except letta-code (2378 staged in vendor tree — anomaly, out of scope) and inngest (6 deleted). Not PING backend work.

## B. Pig WSL (/home/nolan)

### B1. /home/nolan/projects/ping — FYD repo, remote git@github.com:piging2/fyd.git
- Checked out: `hardening/2026-09-28-vocab-ssrf` @ 0264d517 "hardening: fail-closed vocabulary gate + SSRF effective-destination boundary" (2026-09-28). 100 commits ahead of origin/main (long-lived branch; top commits today: 0264d517, merge 9ea3e6a6 of harvest/2026-09-28 @ 2532e5a5 microdata extraction).
- 0264d517 files: src/fyd/net/__tests__/ssrf-adversarial.test.ts (240), src/fyd/net/safe-fetch.ts (137), src/fyd/proceduralize/{vocabulary.ts (new 107), microdata.ts, proceduralizer.ts, structured-data.ts (243), STRUCTURED-DATA.md}, src/fyd/proceduralize/__tests__/vocabulary-gate.test.ts (284). **This is the vocabulary-quarantine + SSRF-effective-destination backend unit.**
- Dirty: 131-144 modified tracked files (src/app/api/fyd/ask/*, src/app/api/fyd/customize/route.ts, src/app/api/mc/{_lib/mc-dispatch.ts, dispatch/route.ts, missions/*}, src/fyd/tenant/__tests__/*, mc-tenant-gate.ts). Newest src mtimes: today 06:18 MDT.
- Stash: 1 (`fyd-sprint-2026-09-24-pre-purehead-dirty-state`, 662 files).
- ~40 local branches; ~30 registered worktrees under /home/nolan (build-clean, build-edge-port, fyd-preview-wt, projects/ping-* etc.). Notable branches: harvest/2026-09-28 (97 ahead, microdata), lane/l-secret-broker (0 ahead of origin/main), goose/dns-rebinding-toctou-20260925 (88 ahead), workerB/tenantos-fyd-seam (52 ahead), workerH/tenantos-journal-merge (56 ahead), tenanos-wave/P-20260923-092-tenant-kit (1 ahead), fyd/builder-rebuild-v1 (50 ahead), push/pass-a-microdata-2026-09-28 (also a remote branch). Remote refs known: origin/HEAD -> origin/fyd/builder-composition, origin/main, origin/fyd/builder-composition, origin/push/pass-a-microdata-2026-09-28.
### B2. /home/nolan/projects/ping-constitutional — remote piging2/fyd — branch constitutional-convergence-v2 @ a69bb68, dirty 12 (claim/identity.ts comment-only diff, attestation-gate.ts, readers.ts, untracked site-id-guard.ts), stash 1. QUIET (mtimes 2026-09-23/24).
### B3. /home/nolan/projects/ping-bcq-substrate — remote piging2/fyd — branch lane/bcq-connector-substrate @ e48ef71, 1 untracked (src/fyd/connectors/kit/), stash 1. QUIET.
### B4. /home/nolan/projects/CRX_REMOTE — crx-runtime checkout, remote https://github.com/ngesk2/crx-runtime.git — main @ b833d91 == origin/main (STALE: true remote main = 6c4b5317 per ls-remote; remote branches: audit-hardening, codex/context-workorder-convergence, constitutional-convergence-v2, constitutional-trunk, event-runtime-deduplication, feature/{approval-effect-identity, context-compilation, external-agent-hardening, knowledge-replay-routing, mission-decomposition, namespace-entitlements, temporal-durable-execution}, main). Dirty: 1694 tracked files, 0 untracked — mostly node_modules mode churn + .cursor transcripts + audit-report regen; kernel/ diff is bulk churn (+628252/-628264 over 1232 files). Newest kernel mtimes ~June 2026. Last commit 2026-06-07.
### B5. /home/nolan/projects/constitutional-runtime — also crx-runtime remote — branch constitutional-trunk @ 74fbb74, 9 commits ahead of origin/constitutional-trunk, top commit 2026-09-25 "Lane-L-tenant-isolation-vectors" (runtime/kernel/workers/qdrant_projection_worker.py + runtime/retrieval/retrieval_service.py). Dirty: 3371 tracked (1883 node_modules, 248 constitutional-compiler, 238 brainos, 190 runtime + ~1300 audit/spec md files).
### B6. /home/nolan/workspace/track-a/*/work — BROKEN worktrees: .git files point at `/home/hatch/workspace/.git/worktrees/work` (local-VM path); git fails there. Copied without gitdir rewrite.
### B7. Other Pig repos (listed, not swept): ping-wave-P-20260923-{001,012,089,091,092,095,098,100,103}, ping-wave-security-104-105, ping-wave1-build/check, ping-lane-l-broker, ping-deploy-head, ping-fyd-deploy, ping-website, ping-ask-loop, happy-place-platform (+ website), crx-autonomous-missions/repos/*.

## C. GitHub (gh NOT authenticated — skipped API; used anonymous ls-remote)
- ngesk2/crx-runtime: main @ 6c4b5317 (matches standing note); branches listed in B4. **No local checkout of remote main exists** — Pig CRX_REMOTE is on stale b833d91.
- piging2/PING: main @ 81b3248, feat/orca-unknown-outcome-port @ be5c20c, fyd-deploy @ ade4ee5.
- piging2/fyd: NOT observable from here (HTTPS 401; SSH blocked by proxy). Only via Pig clone remote refs.

## D. ACTIVE WRITER assessment
- /home/hatch/workspace: **ACTIVE** — external writer checked out `security/secret-redaction-2026-09-28` and committed 9652896 at 06:14:03 MDT during this sweep (sibling convergence arm presumably). ps now shows no git writers; wake-lock SSH processes only.
- Pig /home/nolan/projects/ping: **ACTIVE** — src mtimes today 06:18 MDT (vocab-ssrf dirty work).
- Pig CRX_REMOTE, constitutional-runtime, ping-constitutional, ping-bcq-substrate: **QUIET** (mtimes June 2026 / Sept 23-24).
- All other local repos/worktrees: **QUIET**.

## E. Candidate list by semantic area (repo, path, branch, state, what, last-touch)
1. SECRET: PING /home/hatch/workspace — orca-adapter/adapter.js +481/-14, test/secret-redaction-selftest.js (new) — unpushed commit 9652896 on security/secret-redaction-2026-09-28, 2026-09-28 — secret-class redaction for worker prompt construction. ACTIVE WRITER.
2. VOCABULARY + SSRF: Pig /home/nolan/projects/ping — src/fyd/proceduralize/vocabulary.ts (new), vocabulary-gate.test.ts, src/fyd/net/safe-fetch.ts, ssrf-adversarial.test.ts, microdata.ts, structured-data.ts — committed TODAY as 0264d517 on hardening/2026-09-28-vocab-ssrf (unpushed) + 131 dirty modified files in ask/mc/tenant APIs. ACTIVE WRITER. Local synced copy: /home/hatch/workspace lane-p01/tree/ (identical safe-fetch sha256; local uncommitted mods on top).
3. SSRF/DNS: Pig /home/nolan/projects/ping — goose/dns-rebinding-toctou-20260925 (88 ahead, 2026-09-25).
4. TENANT/IDENTITY: PING mc/tenant-hardening (6), mc/tenant-hostile-tests (5), lane-c/orca-adapter-2026-09-26 (3), fix/broker-failclosed-containment (1), mc/fyd-shapeA-site-console (2); Pig workerB/tenantos-fyd-seam (52), workerH/tenantos-journal-merge (56), tenanos-wave/P-20260923-092-tenant-kit (1); crx-runtime constitutional-trunk 74fbb74 (9 unpushed, tenant-isolation vectors); Pig pig-constitutional dirty claim/identity.ts (comment-only).
5. HOLD/UNKNOWN/RECONCILIATION: in PING p0/approval base (mc/lane-c-reconcile-gate, feat/orca-unknown-outcome-port @ remote be5c20c, outcomes.js UNKNOWN semantics).
6. WRONG_JOURNAL / EVENT/EVIDENCE/REPLAY: PING substrate/gap3-journal-identity (3), substrate/gap2-provenance-ref (1), stream-b/* (2+1), jev/shadow-recorder (2); local FYD repo substrate/gap2-provenance-ref (18); crx-runtime remote feature/event-runtime-deduplication, feature/knowledge-replay-routing (names/SHAs only, content not pulled).
7. RUNTIME LIFECYCLE: PING mc/frontdoor-hardening (3), mc/mission-intent-frontdoor (2), mc/approval-request (1), mc/consequence-policy-input (5), mc/mission-budgets (2), mc/pass-migration-proof (1), mc/pass-migration-supersession (16); crx-runtime remote feature/{temporal-durable-execution, mission-decomposition, context-compilation, approval-effect-identity, external-agent-hardening, namespace-entitlements} (SHAs only); shapec-work local branch (clean, 1 commit).

## F. Not observed / caveats
- gh CLI unauthenticated: no GitHub API branch metadata (dates). Used anonymous ls-remote where possible.
- piging2/fyd remote: unreachable (auth/proxy). Branch universe only via Pig clone.
- Remote crx-runtime feature branches: SHAs/names only; content not pulled (read-only by design).
- 1727 untracked workspace files characterized by topdir only.
- Whether Pig track-a mirrors or local track-a worktrees are the live copy of d1-d4 work: both exist; Pig copies are broken worktrees.
