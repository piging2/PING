# STEP0: Worktree / Branch / Dirty-Status Inventory

Read-only inventory lane. All commands read-only (`worktree list`, `branch`, `rev-parse`, `log`, `status --porcelain`, `find`, `ls`, `cat` of a `.git` pointer file). No repo state was modified. Inventory taken Mon 2026-09-28 ~18:25-18:45 MDT via `ssh -F ~/.ssh/pig-config pigwsl`.

Canonical repo: `/home/nolan/projects/ping`. All 62 worktrees below are registered to it (verified via `git -C /home/nolan/projects/ping worktree list`).

## WORKTREES FOUND

62 registered worktrees. 18 are on detached HEAD. Breakdown codes: M = modified, A = added/staged, D = deleted, ?? = untracked. Per-worktree rows are followed by their last 5 commits (`git log --oneline -5`).

| # | Path | Branch | HEAD | Porc count | M / A / D / ?? |
|---|------|--------|------|------------|---------------|
| 1 | `/home/nolan/projects/ping` | `fyd/builder-harvest-trackc-2026-09-28` | `f877c3919941978f07d5014909595df4751ec258` | 144 | M:74 A:0 D:0 ??:70 |
| | | | | | `f877c391 trackc: 16 tests for the staged SitePatch pipeline` |
| | | | | | `47ea5b26 trackc: staged SitePatch pipeline PATCH->VALIDATE->CAPABILITY->PREVIEW->APPROVAL->EVENT->NEW SPEC VERSION` |
| | | | | | `fdb5d3f3 trackc: typed 10-op SitePatch vocabulary + Phase-1 approval seam adapter` |
| | | | | | `0264d517 hardening: fail-closed vocabulary gate + SSRF effective-destination boundary` |
| | | | | | `9ea3e6a6 Merge branch harvest/2026-09-28: additive microdata extraction (2532e5a5)` |
| 2 | `/home/nolan/2026-09-22/you-re-really-good-at-web/work/ping-parallel` | `codex/ping-parallel-review` | `9c8c21939eff073a5b87817e4ef1674d9aabebc5` | 8 | M:3 A:0 D:0 ??:5 |
| | | | | | `9c8c2193 sprint: merge design/lane-polish-f1` |
| | | | | | `cd280d39 design/lane-polish-f1: visitor-projection purity and conversion fixes` |
| | | | | | `8dc68e4a sprint: merge design/fix-evidence-ref-current` |
| | | | | | `c3bbed9a sprint: merge design/lane-render-wire` |
| | | | | | `4c947384 design/fix-evidence-ref-current: stamp and check the current evidence ref for overlay-touched objects` |
| 3 | `/home/nolan/build-clean` | `fyd/sites-coppersmith-alias` | `b0cdc3b85b4ea27f1dc10d6fea0e830a5e34ac07` | 0 | M:0 A:0 D:0 ??:0 |
| | | | | | `b0cdc3b8 fyd: /sites/coppersmith alias redirect to canonical coppersmith-plumbing tenant` |
| | | | | | `e474c89b fyd-g4: capability propagation through the authority; no view-layer role table` |
| | | | | | `15821239 fyd-p1: ask consulted-evidence labels use full endpoint ids (truncation made relationships indistinguishable)` |
| | | | | | `599574c2 fyd-037: customize emitOverlayEvent pre-flights journal identity (WRONG_JOURNAL fail-closed)` |
| | | | | | `dc2acca6 fyd-037: dump pre-flights journal identity (WRONG_JOURNAL fail-closed)` |
| 4 | `/home/nolan/build-edge-port` | `(detached HEAD)` | `8faf96d0b1e964c0240450d2166c6389b71682e9` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `8faf96d0 Q-J-07: accept owner NL 'move X first' as promote_first (worker E)` |
| | | | | | `6409e283 fix(fyd): people branch skips ungrounded tangential topics (Q-F-06)` |
| | | | | | `a75c6784 feat(fyd): restore page-level margin/edge object layer (Worker F EDGE-RESTORE)` |
| | | | | | `f1dc8711 Q-F-07: fail-closed guards for malformed field values in visibility layer` |
| | | | | | `fb520d79 fix(fyd): cap ObjectDoorway pill at container width (320px overflow)` |
| 5 | `/home/nolan/build-edge-proof` | `(detached HEAD)` | `e474c89bcaedeee2596deb07c739f722af2ae4b3` | 0 | M:0 A:0 D:0 ??:0 |
| | | | | | `e474c89b fyd-g4: capability propagation through the authority; no view-layer role table` |
| | | | | | `15821239 fyd-p1: ask consulted-evidence labels use full endpoint ids (truncation made relationships indistinguishable)` |
| | | | | | `599574c2 fyd-037: customize emitOverlayEvent pre-flights journal identity (WRONG_JOURNAL fail-closed)` |
| | | | | | `dc2acca6 fyd-037: dump pre-flights journal identity (WRONG_JOURNAL fail-closed)` |
| | | | | | `f1dcc427 fyd-037: demo journal asserts live-derived identity marker on GET /` |
| 6 | `/home/nolan/build-idem` | `fyd/write-boundary-idempotency` | `d6c1b05d3b47cc1e64e977507b33fdd818a7931e` | 12 | M:9 A:0 D:0 ??:3 |
| | | | | | `d6c1b05d fyd: hostile gate script (13 gates incl. live scratch-stack approve path)` |
| | | | | | `e4367e22 fyd: /healthz liveness + /readyz journal-readiness probes` |
| | | | | | `45f771ef fyd: journal gateway request_id dedupe (idempotent replay, restart-safe index) + 7 node tests` |
| | | | | | `f29e97b2 fyd: route runs approve/clear through idempotent write flow (request_id, digest, per-site lock, UNKNOWN 504)` |
| | | | | | `681a0cc7 fyd: write-boundary core (request_id ledger, site lock, UNKNOWN seam) + 17 hostile unit tests` |
| 7 | `/home/nolan/build-purehead` | `(detached HEAD)` | `e474c89bcaedeee2596deb07c739f722af2ae4b3` | 0 | M:0 A:0 D:0 ??:0 |
| | | | | | `e474c89b fyd-g4: capability propagation through the authority; no view-layer role table` |
| | | | | | `15821239 fyd-p1: ask consulted-evidence labels use full endpoint ids (truncation made relationships indistinguishable)` |
| | | | | | `599574c2 fyd-037: customize emitOverlayEvent pre-flights journal identity (WRONG_JOURNAL fail-closed)` |
| | | | | | `dc2acca6 fyd-037: dump pre-flights journal identity (WRONG_JOURNAL fail-closed)` |
| | | | | | `f1dcc427 fyd-037: demo journal asserts live-derived identity marker on GET /` |
| 8 | `/home/nolan/build-template1` | `fyd/template-001-hpp-clone` | `e4819ce88d1ae82005704c9d3381fd234967e64e` | 0 | M:0 A:0 D:0 ??:0 |
| | | | | | `e4819ce8 fix: critics blockers - TmServices grouped guard, HPP story de-invented, token comment de-identified` |
| | | | | | `82142ffc fix: add viewport meta for proper mobile rendering (fixes horizontal overflow on 375px)` |
| | | | | | `4f310de2 fix: unoptimized images in TRADESMAN sections (localPatterns glob not matching /t1-media/**; assets are pre-optimized)` |
| | | | | | `3d56deb4 fix: use relative path for tm-tokens CSS import (@ alias not resolved in CSS @import)` |
| | | | | | `ba9acf4b fix: import tm-tokens into Tailwind pipeline via globals.css (separate import did not generate tm-* utilities)` |
| 9 | `/home/nolan/build-workerE-intent` | `workerE/intent-move-first` | `2aa7b1d2345ed1bee3712aaa91c07b79ccfb26ce` | 0 | M:0 A:0 D:0 ??:0 |
| | | | | | `2aa7b1d2 Q-J-07: accept owner NL 'move X first' as promote_first (worker E)` |
| | | | | | `8fa21a68 Merge branch workerB/tenantos-fyd-seam into fyd/sprint-integration-2026-09-24` |
| | | | | | `266132f8 Merge commit '2839dd50' into fyd/sprint-integration-2026-09-24` |
| | | | | | `0ab90d96 fix(fyd): people branch skips ungrounded tangential topics (Q-F-06)` |
| | | | | | `2839dd50 feat(fyd): restore page-level margin/edge object layer (Worker F EDGE-RESTORE)` |
| 10 | `/home/nolan/cohort2-pristine` | `(detached HEAD)` | `e48ef710cb889bf4d59b833ef9766067a9e2bbf0` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `e48ef710 FYD Wave 1 fixup: current product UI implementation + ask test alignment` |
| | | | | | `696dd13f FYD step-0: proven renderer/mobile/URL-safety/service-card work` |
| | | | | | `490f5f7c FYD Wave 1: ask authorized read-path, OwnerContext seam, BindingVerifier, retargeted ui tests` |
| | | | | | `0dec40f5 FYD-001: update hero badge assertions for honest claim labels` |
| | | | | | `e7ae22bc FYD-001: update object-scope tests for real service objects` |
| 11 | `/home/nolan/fyd-dehpp-merge-proof` | `(detached HEAD)` | `e48ef710cb889bf4d59b833ef9766067a9e2bbf0` | 19 | M:5 A:13 D:0 ??:1 |
| | | | | | `e48ef710 FYD Wave 1 fixup: current product UI implementation + ask test alignment` |
| | | | | | `696dd13f FYD step-0: proven renderer/mobile/URL-safety/service-card work` |
| | | | | | `490f5f7c FYD Wave 1: ask authorized read-path, OwnerContext seam, BindingVerifier, retargeted ui tests` |
| | | | | | `0dec40f5 FYD-001: update hero badge assertions for honest claim labels` |
| | | | | | `e7ae22bc FYD-001: update object-scope tests for real service objects` |
| 12 | `/home/nolan/fyd-dehpp-wt` | `fyd-dehpp` | `eb28d3aacda8d3f0bcd463f1069eb7b55beb999f` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `eb28d3aa DEHPP: data-plane parameterization of the HPP route` |
| | | | | | `e48ef710 FYD Wave 1 fixup: current product UI implementation + ask test alignment` |
| | | | | | `696dd13f FYD step-0: proven renderer/mobile/URL-safety/service-card work` |
| | | | | | `490f5f7c FYD Wave 1: ask authorized read-path, OwnerContext seam, BindingVerifier, retargeted ui tests` |
| | | | | | `0dec40f5 FYD-001: update hero badge assertions for honest claim labels` |
| 13 | `/home/nolan/fyd-preview-wt` | `(detached HEAD)` | `e48ef710cb889bf4d59b833ef9766067a9e2bbf0` | 29 | M:7 A:0 D:0 ??:22 |
| | | | | | `e48ef710 FYD Wave 1 fixup: current product UI implementation + ask test alignment` |
| | | | | | `696dd13f FYD step-0: proven renderer/mobile/URL-safety/service-card work` |
| | | | | | `490f5f7c FYD Wave 1: ask authorized read-path, OwnerContext seam, BindingVerifier, retargeted ui tests` |
| | | | | | `0dec40f5 FYD-001: update hero badge assertions for honest claim labels` |
| | | | | | `e7ae22bc FYD-001: update object-scope tests for real service objects` |
| 14 | `/home/nolan/fyd-wave2-clean` | `(detached HEAD)` | `e48ef710cb889bf4d59b833ef9766067a9e2bbf0` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `e48ef710 FYD Wave 1 fixup: current product UI implementation + ask test alignment` |
| | | | | | `696dd13f FYD step-0: proven renderer/mobile/URL-safety/service-card work` |
| | | | | | `490f5f7c FYD Wave 1: ask authorized read-path, OwnerContext seam, BindingVerifier, retargeted ui tests` |
| | | | | | `0dec40f5 FYD-001: update hero badge assertions for honest claim labels` |
| | | | | | `e7ae22bc FYD-001: update object-scope tests for real service objects` |
| 15 | `/home/nolan/h1clip-work` | `fyd-frontier-h1clip` | `f7a5efe4fa53274180aded7fc9f5797328151bcd` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `f7a5efe4 FYD hero H1: break-words safeguard against unbreakable tenant names on mobile` |
| | | | | | `7c1043db fyd: generic within-section object reorder (reorder_object) through the typed customize path` |
| | | | | | `8326c47a FYD sites: derive per-site metadata from the business projection (trust fix)` |
| | | | | | `869efe3e mc(technology): technology as real business objects from proven Pig state` |
| | | | | | `6678c0a6 fyd: generic WhyThis evidence drill-down on rendered object facts` |
| 16 | `/home/nolan/lane7-sites` | `(detached HEAD)` | `28e4ba00ff5301146190f93e48ac8d814f58155f` | 4 | M:3 A:0 D:0 ??:1 |
| | | | | | `28e4ba00 Merge workerE/intent-move-first: accept owner NL 'move X first' as promote_first (Q-J-07)` |
| | | | | | `2aa7b1d2 Q-J-07: accept owner NL 'move X first' as promote_first (worker E)` |
| | | | | | `8fa21a68 Merge branch workerB/tenantos-fyd-seam into fyd/sprint-integration-2026-09-24` |
| | | | | | `266132f8 Merge commit '2839dd50' into fyd/sprint-integration-2026-09-24` |
| | | | | | `0ab90d96 fix(fyd): people branch skips ungrounded tangential topics (Q-F-06)` |
| 17 | `/home/nolan/projects/ping-ask-loop` | `ask-loop/fyd-ask-behavior` | `42f81d539937501377bc5f63071718b278d0561c` | 12 | M:10 A:0 D:0 ??:2 |
| | | | | | `42f81d53 Lane D: Mission Control dispatch UI/API vertical slice (2026-09-26)` |
| | | | | | `c93a7ced Arrow 6: exact object title wins over shorter fuzzy match in findObject` |
| | | | | | `56629e4b Fix hydration #418: resolve demo-owner gate server-side, pass down as prop` |
| | | | | | `6f2dd65e qc01-lane: mechanical call-site completion for the committed ARROW-1 public-projection API` |
| | | | | | `87671a5f FYD object presence: page-anchored edge mode, no fixed resting objects` |
| 18 | `/home/nolan/projects/ping-bcq-substrate` | `lane/bcq-connector-substrate` | `e48ef710cb889bf4d59b833ef9766067a9e2bbf0` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `e48ef710 FYD Wave 1 fixup: current product UI implementation + ask test alignment` |
| | | | | | `696dd13f FYD step-0: proven renderer/mobile/URL-safety/service-card work` |
| | | | | | `490f5f7c FYD Wave 1: ask authorized read-path, OwnerContext seam, BindingVerifier, retargeted ui tests` |
| | | | | | `0dec40f5 FYD-001: update hero badge assertions for honest claim labels` |
| | | | | | `e7ae22bc FYD-001: update object-scope tests for real service objects` |
| 19 | `/home/nolan/projects/ping-constitutional` | `constitutional-convergence-v2` | `a69bb68fc84620a5635e071030cf49a633df7394` | 12 | M:7 A:0 D:0 ??:5 |
| | | | | | `a69bb68f Gate owner mutation behind demo-owner-mode` |
| | | | | | `f89e9a2c Add /sites middleware regression test` |
| | | | | | `e48ef710 FYD Wave 1 fixup: current product UI implementation + ask test alignment` |
| | | | | | `696dd13f FYD step-0: proven renderer/mobile/URL-safety/service-card work` |
| | | | | | `490f5f7c FYD Wave 1: ask authorized read-path, OwnerContext seam, BindingVerifier, retargeted ui tests` |
| 20 | `/home/nolan/projects/ping-deploy-head` | `(detached HEAD)` | `0dec40f5c5823a8040bcd1f710e25c3103d499c3` | 0 | M:0 A:0 D:0 ??:0 |
| | | | | | `0dec40f5 FYD-001: update hero badge assertions for honest claim labels` |
| | | | | | `e7ae22bc FYD-001: update object-scope tests for real service objects` |
| | | | | | `fa0f7efa FYD-001: honest provenance for overlay-authored (demo) content` |
| | | | | | `b8d899b1 FYD-001: regenerate fixtures with extracted services` |
| | | | | | `cbb43580 FYD-001: project service cards to Service objects with offers edges` |
| 21 | `/home/nolan/projects/ping-fyd-deploy` | `fyd-deploy` | `ade4ee50127085d9be1fb3749cfec8d6de2e9719` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `ade4ee50 FYD UI deploy: base 0dec40f5 + narrow /build/* restriction` |
| | | | | | `0dec40f5 FYD-001: update hero badge assertions for honest claim labels` |
| | | | | | `e7ae22bc FYD-001: update object-scope tests for real service objects` |
| | | | | | `fa0f7efa FYD-001: honest provenance for overlay-authored (demo) content` |
| | | | | | `b8d899b1 FYD-001: regenerate fixtures with extracted services` |
| 22 | `/home/nolan/projects/ping-lane-l-broker` | `lane/l-secret-broker` | `e48ef710cb889bf4d59b833ef9766067a9e2bbf0` | 2 | M:0 A:0 D:0 ??:2 |
| | | | | | `e48ef710 FYD Wave 1 fixup: current product UI implementation + ask test alignment` |
| | | | | | `696dd13f FYD step-0: proven renderer/mobile/URL-safety/service-card work` |
| | | | | | `490f5f7c FYD Wave 1: ask authorized read-path, OwnerContext seam, BindingVerifier, retargeted ui tests` |
| | | | | | `0dec40f5 FYD-001: update hero badge assertions for honest claim labels` |
| | | | | | `e7ae22bc FYD-001: update object-scope tests for real service objects` |
| 23 | `/home/nolan/projects/ping-wave-P-20260923-001` | `tenanos-wave/P-20260923-001-jest-config` | `10ed47b75a028c4e6daccc67769c8ada6916b2b7` | 0 | M:0 A:0 D:0 ??:0 |
| | | | | | `10ed47b7 test(tenanos): scoped ts-jest config for substrate tests (P-20260923-001)` |
| | | | | | `e48ef710 FYD Wave 1 fixup: current product UI implementation + ask test alignment` |
| | | | | | `696dd13f FYD step-0: proven renderer/mobile/URL-safety/service-card work` |
| | | | | | `490f5f7c FYD Wave 1: ask authorized read-path, OwnerContext seam, BindingVerifier, retargeted ui tests` |
| | | | | | `0dec40f5 FYD-001: update hero badge assertions for honest claim labels` |
| 24 | `/home/nolan/projects/ping-wave-P-20260923-012` | `tenanos-wave/P-20260923-012-sandbox` | `eec54a763644a45520de541a3857bc5f700ae819` | 0 | M:0 A:0 D:0 ??:0 |
| | | | | | `eec54a76 feat(tenanos): sandbox execution profile registry (P-20260923-012)` |
| | | | | | `e48ef710 FYD Wave 1 fixup: current product UI implementation + ask test alignment` |
| | | | | | `696dd13f FYD step-0: proven renderer/mobile/URL-safety/service-card work` |
| | | | | | `490f5f7c FYD Wave 1: ask authorized read-path, OwnerContext seam, BindingVerifier, retargeted ui tests` |
| | | | | | `0dec40f5 FYD-001: update hero badge assertions for honest claim labels` |
| 25 | `/home/nolan/projects/ping-wave-P-20260923-089` | `tenanos-wave/P-20260923-089-memory-candidate` | `04e420e24ae5ac09c82973c7c4afb79c311a67e9` | 0 | M:0 A:0 D:0 ??:0 |
| | | | | | `04e420e2 feat(tenanos): MemoryCandidate proposal-surface schema (P-20260923-089)` |
| | | | | | `e48ef710 FYD Wave 1 fixup: current product UI implementation + ask test alignment` |
| | | | | | `696dd13f FYD step-0: proven renderer/mobile/URL-safety/service-card work` |
| | | | | | `490f5f7c FYD Wave 1: ask authorized read-path, OwnerContext seam, BindingVerifier, retargeted ui tests` |
| | | | | | `0dec40f5 FYD-001: update hero badge assertions for honest claim labels` |
| 26 | `/home/nolan/projects/ping-wave-P-20260923-091` | `tenanos-wave/P-20260923-091-decision-budget` | `b49c9e19b0ba23f5138d2e8fc4765e2d0009af19` | 0 | M:0 A:0 D:0 ??:0 |
| | | | | | `b49c9e19 feat(tenanos): decision-budget taxonomy + auto-resolvers (P-20260923-091)` |
| | | | | | `e48ef710 FYD Wave 1 fixup: current product UI implementation + ask test alignment` |
| | | | | | `696dd13f FYD step-0: proven renderer/mobile/URL-safety/service-card work` |
| | | | | | `490f5f7c FYD Wave 1: ask authorized read-path, OwnerContext seam, BindingVerifier, retargeted ui tests` |
| | | | | | `0dec40f5 FYD-001: update hero badge assertions for honest claim labels` |
| 27 | `/home/nolan/projects/ping-wave-P-20260923-092` | `tenanos-wave/P-20260923-092-tenant-kit` | `6cbd64afd693dba616ce01ec4b12e692de282ffa` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `6cbd64af feat(tenanos): tenant boundary kit (P-20260923-092)` |
| | | | | | `e48ef710 FYD Wave 1 fixup: current product UI implementation + ask test alignment` |
| | | | | | `696dd13f FYD step-0: proven renderer/mobile/URL-safety/service-card work` |
| | | | | | `490f5f7c FYD Wave 1: ask authorized read-path, OwnerContext seam, BindingVerifier, retargeted ui tests` |
| | | | | | `0dec40f5 FYD-001: update hero badge assertions for honest claim labels` |
| 28 | `/home/nolan/projects/ping-wave-P-20260923-095` | `tenanos-wave/P-20260923-095-run-state` | `82ed23e67ad5373b8009c943385007b9b6a6f47a` | 0 | M:0 A:0 D:0 ??:0 |
| | | | | | `82ed23e6 feat(tenanos): run-state authority vocabulary + classifier (P-20260923-095)` |
| | | | | | `e48ef710 FYD Wave 1 fixup: current product UI implementation + ask test alignment` |
| | | | | | `696dd13f FYD step-0: proven renderer/mobile/URL-safety/service-card work` |
| | | | | | `490f5f7c FYD Wave 1: ask authorized read-path, OwnerContext seam, BindingVerifier, retargeted ui tests` |
| | | | | | `0dec40f5 FYD-001: update hero badge assertions for honest claim labels` |
| 29 | `/home/nolan/projects/ping-wave-P-20260923-098` | `tenanos-wave/P-20260923-098-context-pack` | `13f21b598567bfa1779aea337f564cd85e461a74` | 0 | M:0 A:0 D:0 ??:0 |
| | | | | | `13f21b59 feat(tenanos): memory context-pack assembler (P-20260923-098)` |
| | | | | | `e48ef710 FYD Wave 1 fixup: current product UI implementation + ask test alignment` |
| | | | | | `696dd13f FYD step-0: proven renderer/mobile/URL-safety/service-card work` |
| | | | | | `490f5f7c FYD Wave 1: ask authorized read-path, OwnerContext seam, BindingVerifier, retargeted ui tests` |
| | | | | | `0dec40f5 FYD-001: update hero badge assertions for honest claim labels` |
| 30 | `/home/nolan/projects/ping-wave-P-20260923-100` | `tenanos-wave/P-20260923-100-bootstrap` | `3a578131b68e51e897d76d0341fe81d0f565979c` | 0 | M:0 A:0 D:0 ??:0 |
| | | | | | `3a578131 feat(tenanos): gateway bootstrap substrate record (P-20260923-100)` |
| | | | | | `e48ef710 FYD Wave 1 fixup: current product UI implementation + ask test alignment` |
| | | | | | `696dd13f FYD step-0: proven renderer/mobile/URL-safety/service-card work` |
| | | | | | `490f5f7c FYD Wave 1: ask authorized read-path, OwnerContext seam, BindingVerifier, retargeted ui tests` |
| | | | | | `0dec40f5 FYD-001: update hero badge assertions for honest claim labels` |
| 31 | `/home/nolan/projects/ping-wave-P-20260923-103` | `tenanos-wave/P-20260923-103-attempt-fencing` | `a9d1c9d8522e9a0dc0e3804a1d4f81fe2b2c347f` | 0 | M:0 A:0 D:0 ??:0 |
| | | | | | `a9d1c9d8 feat(tenanos): attempt fencing mechanics (P-20260923-103)` |
| | | | | | `e48ef710 FYD Wave 1 fixup: current product UI implementation + ask test alignment` |
| | | | | | `696dd13f FYD step-0: proven renderer/mobile/URL-safety/service-card work` |
| | | | | | `490f5f7c FYD Wave 1: ask authorized read-path, OwnerContext seam, BindingVerifier, retargeted ui tests` |
| | | | | | `0dec40f5 FYD-001: update hero badge assertions for honest claim labels` |
| 32 | `/home/nolan/projects/ping-wave-security-104-105` | `tenanos-wave/P-20260923-104-105-security` | `1df0f98cad19eb6736c5f5a8bf674bac530a9087` | 0 | M:0 A:0 D:0 ??:0 |
| | | | | | `1df0f98c fix(security): Kit webhook requires HMAC signature (P-20260923-105)` |
| | | | | | `9ca7d043 fix(security): resource-download requires auth token + URL allowlist (P-20260923-104)` |
| | | | | | `e48ef710 FYD Wave 1 fixup: current product UI implementation + ask test alignment` |
| | | | | | `696dd13f FYD step-0: proven renderer/mobile/URL-safety/service-card work` |
| | | | | | `490f5f7c FYD Wave 1: ask authorized read-path, OwnerContext seam, BindingVerifier, retargeted ui tests` |
| 33 | `/home/nolan/projects/ping-wave1-build` | `(detached HEAD)` | `e48ef710cb889bf4d59b833ef9766067a9e2bbf0` | 0 | M:0 A:0 D:0 ??:0 |
| | | | | | `e48ef710 FYD Wave 1 fixup: current product UI implementation + ask test alignment` |
| | | | | | `696dd13f FYD step-0: proven renderer/mobile/URL-safety/service-card work` |
| | | | | | `490f5f7c FYD Wave 1: ask authorized read-path, OwnerContext seam, BindingVerifier, retargeted ui tests` |
| | | | | | `0dec40f5 FYD-001: update hero badge assertions for honest claim labels` |
| | | | | | `e7ae22bc FYD-001: update object-scope tests for real service objects` |
| 34 | `/home/nolan/projects/ping-wave1-check` | `(detached HEAD)` | `e48ef710cb889bf4d59b833ef9766067a9e2bbf0` | 0 | M:0 A:0 D:0 ??:0 |
| | | | | | `e48ef710 FYD Wave 1 fixup: current product UI implementation + ask test alignment` |
| | | | | | `696dd13f FYD step-0: proven renderer/mobile/URL-safety/service-card work` |
| | | | | | `490f5f7c FYD Wave 1: ask authorized read-path, OwnerContext seam, BindingVerifier, retargeted ui tests` |
| | | | | | `0dec40f5 FYD-001: update hero badge assertions for honest claim labels` |
| | | | | | `e7ae22bc FYD-001: update object-scope tests for real service objects` |
| 35 | `/home/nolan/projects/ping-worktrees/contextpack-2026-09-28` | `decision-fabric/contextpack-wire-2026-09-28` | `9a55502125fe9b38f44aef183f597f09971c1862` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `9a555021 decision-fabric: wire compileAskContext() into MC dispatch context.json` |
| | | | | | `0264d517 hardening: fail-closed vocabulary gate + SSRF effective-destination boundary` |
| | | | | | `9ea3e6a6 Merge branch harvest/2026-09-28: additive microdata extraction (2532e5a5)` |
| | | | | | `65e99756 test: track canonical root jest config and testing docs` |
| | | | | | `2532e5a5 feat(fyd): additive microdata extraction in structured-data discovery (harvest)` |
| 36 | `/home/nolan/projects/ping-worktrees/contextpack-replay-2026-09-28` | `(detached HEAD)` | `9a55502125fe9b38f44aef183f597f09971c1862` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `9a555021 decision-fabric: wire compileAskContext() into MC dispatch context.json` |
| | | | | | `0264d517 hardening: fail-closed vocabulary gate + SSRF effective-destination boundary` |
| | | | | | `9ea3e6a6 Merge branch harvest/2026-09-28: additive microdata extraction (2532e5a5)` |
| | | | | | `65e99756 test: track canonical root jest config and testing docs` |
| | | | | | `2532e5a5 feat(fyd): additive microdata extraction in structured-data discovery (harvest)` |
| 37 | `/home/nolan/tenanos-c1-tree` | `(detached HEAD)` | `51d4a187ff94a7b3da836e39ff408b131cfd338f` | 0 | M:0 A:0 D:0 ??:0 |
| | | | | | `51d4a187 tenanos-wave: integrate P-20260923-101 (run reconciler)` |
| | | | | | `805d0213 tenanos-wave: integrate P-20260923-094 (verification engine)` |
| | | | | | `ca8946d4 tenanos-wave: integrate P-20260923-093 (tool-safety guard)` |
| | | | | | `fcf3859f tenanos-wave: integrate P-20260923-090 (execution budgets)` |
| | | | | | `47764b5a tenanos-wave: integrate P-20260923-014 (OTel semconv projection)` |
| 38 | `/home/nolan/workspace/ping-24h/repro/laneB3-9a555021` | `(detached HEAD)` | `9a55502125fe9b38f44aef183f597f09971c1862` | 0 | M:0 A:0 D:0 ??:0 |
| | | | | | `9a555021 decision-fabric: wire compileAskContext() into MC dispatch context.json` |
| | | | | | `0264d517 hardening: fail-closed vocabulary gate + SSRF effective-destination boundary` |
| | | | | | `9ea3e6a6 Merge branch harvest/2026-09-28: additive microdata extraction (2532e5a5)` |
| | | | | | `65e99756 test: track canonical root jest config and testing docs` |
| | | | | | `2532e5a5 feat(fyd): additive microdata extraction in structured-data discovery (harvest)` |
| 39 | `/home/nolan/worktrees/arrow1-gate` | `copilot/arrow1-claims-gate` | `87671a5f459ec437f5d315a6e6b31b68f3a1cea9` | 2 | M:0 A:0 D:0 ??:2 |
| | | | | | `87671a5f FYD object presence: page-anchored edge mode, no fixed resting objects` |
| | | | | | `761bd086 fix(fyd): eliminate React hydration #418 on site pages` |
| | | | | | `b3c891c6 ARROW-1: Q-C-01/02/03/13 public projection boundary hardening` |
| | | | | | `95b4702d FYD-019 (ARROW 6): typed owner-intent approval + causal read-back` |
| | | | | | `32fab78f feat(fyd): authority-UX consequence classification + friction wiring for owner actions` |
| 40 | `/home/nolan/worktrees/arrow1-hostile` | `copilot/arrow1-hostile-proof` | `87671a5f459ec437f5d315a6e6b31b68f3a1cea9` | 2 | M:0 A:0 D:0 ??:2 |
| | | | | | `87671a5f FYD object presence: page-anchored edge mode, no fixed resting objects` |
| | | | | | `761bd086 fix(fyd): eliminate React hydration #418 on site pages` |
| | | | | | `b3c891c6 ARROW-1: Q-C-01/02/03/13 public projection boundary hardening` |
| | | | | | `95b4702d FYD-019 (ARROW 6): typed owner-intent approval + causal read-back` |
| | | | | | `32fab78f feat(fyd): authority-UX consequence classification + friction wiring for owner actions` |
| 41 | `/home/nolan/worktrees/arrow6-sitepatch` | `copilot/arrow6-sitepatch` | `f052e6b591f78520a5bdeb105cab542328132095` | 3 | M:0 A:0 D:0 ??:3 |
| | | | | | `f052e6b5 Arrow 6: exact object title wins over shorter fuzzy match in findObject` |
| | | | | | `87671a5f FYD object presence: page-anchored edge mode, no fixed resting objects` |
| | | | | | `761bd086 fix(fyd): eliminate React hydration #418 on site pages` |
| | | | | | `b3c891c6 ARROW-1: Q-C-01/02/03/13 public projection boundary hardening` |
| | | | | | `95b4702d FYD-019 (ARROW 6): typed owner-intent approval + causal read-back` |
| 42 | `/home/nolan/worktrees/authority-ux` | `copilot/authority-ux` | `87671a5f459ec437f5d315a6e6b31b68f3a1cea9` | 2 | M:0 A:0 D:0 ??:2 |
| | | | | | `87671a5f FYD object presence: page-anchored edge mode, no fixed resting objects` |
| | | | | | `761bd086 fix(fyd): eliminate React hydration #418 on site pages` |
| | | | | | `b3c891c6 ARROW-1: Q-C-01/02/03/13 public projection boundary hardening` |
| | | | | | `95b4702d FYD-019 (ARROW 6): typed owner-intent approval + causal read-back` |
| | | | | | `32fab78f feat(fyd): authority-UX consequence classification + friction wiring for owner actions` |
| 43 | `/home/nolan/worktrees/copper-v2` | (checkout git-broken; worktree list says `copper-v2-serve`) | `c03bc145` (per worktree list; checkout unreadable) | UNKNOWN (git commands fail) | UNKNOWN |
| 44 | `/home/nolan/worktrees/design-lane-04-composition` | `fatal: not a git repository: /home/nolan/workspace/.git/worktrees/copper-v2` | `fatal: not a git repository: /home/nolan` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `design/lane-04-composition` |
| | | | | | `a4cd616cde6264cc603333e85c8251c9acea85d8` |
| | | | | | `a4cd616c Lane 04: graph-measured composition compiler (signals + variants + strategy de-pinning)` |
| | | | | | `a8ed5103 Integrate P-01: presence compiler PASTE URL to rendered FYD URL (verified 24/24 tests from clean checkout)` |
| | | | | | `2bf1e5c9 Lane P-01: presence compiler — PASTE URL to rendered FYD URL (2026-09-26)` |
| 45 | `/home/nolan/worktrees/design-lane-05-media` | `design/lane-05-media` | `06774159e8d47fab02043ac7ac4a27bfa0840407` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `06774159 Lane 5: media intelligence v1 - richness scoring, focal backfill, gallery dimension gate, alt text` |
| | | | | | `a8ed5103 Integrate P-01: presence compiler PASTE URL to rendered FYD URL (verified 24/24 tests from clean checkout)` |
| | | | | | `2bf1e5c9 Lane P-01: presence compiler — PASTE URL to rendered FYD URL (2026-09-26)` |
| | | | | | `6dd44842 Integrate FYD-010: Ask FYD context-projection boundary (verified 16/16 suites, 245/245 tests from clean checkout)` |
| | | | | | `9f9b79f8 FYD-010: enforce Ask FYD context-projection boundary` |
| 46 | `/home/nolan/worktrees/design-lane-06-typography` | `design/lane-06-typography` | `e3af1d89138c564fcf7f523e18589b65e3c34d19` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `e3af1d89 Lane 6: fix globals.css banner wording (remove nonexistent script reference)` |
| | | | | | `df5f38d0 Lane 6: FYD fluid type system + section spacing scale (48 tests green)` |
| | | | | | `a8ed5103 Integrate P-01: presence compiler PASTE URL to rendered FYD URL (verified 24/24 tests from clean checkout)` |
| | | | | | `2bf1e5c9 Lane P-01: presence compiler — PASTE URL to rendered FYD URL (2026-09-26)` |
| | | | | | `6dd44842 Integrate FYD-010: Ask FYD context-projection boundary (verified 16/16 suites, 245/245 tests from clean checkout)` |
| 47 | `/home/nolan/worktrees/design-lane-07-motion` | `design/lane-07-motion` | `6cef9c4da99964fc51793ac60a4e1ed475797556` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `6cef9c4d lane-07: FYD motion primitives (reveal, before-after, count-up)` |
| | | | | | `a8ed5103 Integrate P-01: presence compiler PASTE URL to rendered FYD URL (verified 24/24 tests from clean checkout)` |
| | | | | | `2bf1e5c9 Lane P-01: presence compiler — PASTE URL to rendered FYD URL (2026-09-26)` |
| | | | | | `6dd44842 Integrate FYD-010: Ask FYD context-projection boundary (verified 16/16 suites, 245/245 tests from clean checkout)` |
| | | | | | `9f9b79f8 FYD-010: enforce Ask FYD context-projection boundary` |
| 48 | `/home/nolan/worktrees/design-lane-08` | `design/lane-08-public-projection` | `6ab560c36f4fcb516689e54c1727d4138215dff5` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `6ab560c3 lane-08: separate public and debug projections (projectForViewer)` |
| | | | | | `a8ed5103 Integrate P-01: presence compiler PASTE URL to rendered FYD URL (verified 24/24 tests from clean checkout)` |
| | | | | | `2bf1e5c9 Lane P-01: presence compiler — PASTE URL to rendered FYD URL (2026-09-26)` |
| | | | | | `6dd44842 Integrate FYD-010: Ask FYD context-projection boundary (verified 16/16 suites, 245/245 tests from clean checkout)` |
| | | | | | `9f9b79f8 FYD-010: enforce Ask FYD context-projection boundary` |
| 49 | `/home/nolan/worktrees/design-lane-polish-f1` | `design/lane-polish-f1` | `cd280d3914942b9e2ff3b2ae23d1d35ef2a7dd55` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `cd280d39 design/lane-polish-f1: visitor-projection purity and conversion fixes` |
| | | | | | `8dc68e4a sprint: merge design/fix-evidence-ref-current` |
| | | | | | `c3bbed9a sprint: merge design/lane-render-wire` |
| | | | | | `4c947384 design/fix-evidence-ref-current: stamp and check the current evidence ref for overlay-touched objects` |
| | | | | | `832b0148 design/lane-render-wire: wire lane-4/6/7 vocabularies into the renderer` |
| 50 | `/home/nolan/worktrees/design-lane-render` | `design/lane-render-wire` | `832b0148f6699fb03936a1a55d4fd6dfff6a878a` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `832b0148 design/lane-render-wire: wire lane-4/6/7 vocabularies into the renderer` |
| | | | | | `c067f5b8 Merge branch 'design/lane-07-motion' into design/sprint-visual-v1` |
| | | | | | `c79cd95c Merge branch 'design/lane-06-typography' into design/sprint-visual-v1` |
| | | | | | `afc6114d Merge branch 'design/lane-05-media' into design/sprint-visual-v1` |
| | | | | | `fc7e489d Merge branch 'design/lane-04-composition' into design/sprint-visual-v1` |
| 51 | `/home/nolan/worktrees/design-sprint-visual-v1` | `design/sprint-visual-v1` | `9c8c21939eff073a5b87817e4ef1674d9aabebc5` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `9c8c2193 sprint: merge design/lane-polish-f1` |
| | | | | | `cd280d39 design/lane-polish-f1: visitor-projection purity and conversion fixes` |
| | | | | | `8dc68e4a sprint: merge design/fix-evidence-ref-current` |
| | | | | | `c3bbed9a sprint: merge design/lane-render-wire` |
| | | | | | `4c947384 design/fix-evidence-ref-current: stamp and check the current evidence ref for overlay-touched objects` |
| 52 | `/home/nolan/worktrees/fix-evidence-ref` | `design/fix-evidence-ref-current` | `4c947384793d5af5ce1e111901cb8308c258d114` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `4c947384 design/fix-evidence-ref-current: stamp and check the current evidence ref for overlay-touched objects` |
| | | | | | `832b0148 design/lane-render-wire: wire lane-4/6/7 vocabularies into the renderer` |
| | | | | | `c067f5b8 Merge branch 'design/lane-07-motion' into design/sprint-visual-v1` |
| | | | | | `c79cd95c Merge branch 'design/lane-06-typography' into design/sprint-visual-v1` |
| | | | | | `afc6114d Merge branch 'design/lane-05-media' into design/sprint-visual-v1` |
| 53 | `/home/nolan/worktrees/fyd-family-converge` | `fyd/builder-rebuild-v1` | `4eb904013ee05646c57b403fe6a2f3f2d6ffa89a` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `4eb90401 Styling lane: compile real family CSS for the Coppersmith proof (Tailwind v4.3.3 + verified DTCG tokens)` |
| | | | | | `cca8f221 Fix the two mandatory visitor-regression failures in the Coppersmith proof` |
| | | | | | `cc196894 Family lane: whole-card estimate links, estimate anchor, dependency consolidation` |
| | | | | | `8019f21e fyd-builder-v1: Coppersmith family generation at /sites/coppersmith-plumbing/v2` |
| | | | | | `11b3f0d3 fyd-builder-v1: 11-component family + surface separation + deletion list` |
| 54 | `/home/nolan/worktrees/l2-benchmark` | `copilot/l2-benchmark` | `87671a5f459ec437f5d315a6e6b31b68f3a1cea9` | 2 | M:0 A:0 D:0 ??:2 |
| | | | | | `87671a5f FYD object presence: page-anchored edge mode, no fixed resting objects` |
| | | | | | `761bd086 fix(fyd): eliminate React hydration #418 on site pages` |
| | | | | | `b3c891c6 ARROW-1: Q-C-01/02/03/13 public projection boundary hardening` |
| | | | | | `95b4702d FYD-019 (ARROW 6): typed owner-intent approval + causal read-back` |
| | | | | | `32fab78f feat(fyd): authority-UX consequence classification + friction wiring for owner actions` |
| 55 | `/home/nolan/worktrees/lane-e-ask` | `(detached HEAD)` | `e474c89bcaedeee2596deb07c739f722af2ae4b3` | 12 | M:8 A:0 D:0 ??:4 |
| | | | | | `e474c89b fyd-g4: capability propagation through the authority; no view-layer role table` |
| | | | | | `15821239 fyd-p1: ask consulted-evidence labels use full endpoint ids (truncation made relationships indistinguishable)` |
| | | | | | `599574c2 fyd-037: customize emitOverlayEvent pre-flights journal identity (WRONG_JOURNAL fail-closed)` |
| | | | | | `dc2acca6 fyd-037: dump pre-flights journal identity (WRONG_JOURNAL fail-closed)` |
| | | | | | `f1dcc427 fyd-037: demo journal asserts live-derived identity marker on GET /` |
| 56 | `/home/nolan/worktrees/lane-fyd-010` | `lane/fyd-010-context-projection` | `9f9b79f810eed7fa0e1e56fccb660b2149c11260` | 0 | M:0 A:0 D:0 ??:0 |
| | | | | | `9f9b79f8 FYD-010: enforce Ask FYD context-projection boundary` |
| | | | | | `42f81d53 Lane D: Mission Control dispatch UI/API vertical slice (2026-09-26)` |
| | | | | | `c93a7ced Arrow 6: exact object title wins over shorter fuzzy match in findObject` |
| | | | | | `56629e4b Fix hydration #418: resolve demo-owner gate server-side, pass down as prop` |
| | | | | | `6f2dd65e qc01-lane: mechanical call-site completion for the committed ARROW-1 public-projection API` |
| 57 | `/home/nolan/worktrees/lane-p01` | `fyd/lane-p01-presence-compiler` | `2bf1e5c9f1fdcd90339b30f4f5839f3432134272` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `2bf1e5c9 Lane P-01: presence compiler — PASTE URL to rendered FYD URL (2026-09-26)` |
| | | | | | `42f81d53 Lane D: Mission Control dispatch UI/API vertical slice (2026-09-26)` |
| | | | | | `c93a7ced Arrow 6: exact object title wins over shorter fuzzy match in findObject` |
| | | | | | `56629e4b Fix hydration #418: resolve demo-owner gate server-side, pass down as prop` |
| | | | | | `6f2dd65e qc01-lane: mechanical call-site completion for the committed ARROW-1 public-projection API` |
| 58 | `/home/nolan/worktrees/phase1-approval-door` | `phase1/approval-door-2026-09-28` | `af7d26885a898415a4d35fa94c8263eb4aaca8ea` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `af7d2688 phase1: terminal-first ratification in brief, gate, and acceptance test` |
| | | | | | `9cc23920 phase1: fix 7b before/after assertion to the shared card semantics` |
| | | | | | `ff5e4959 phase1: MC terminal projection for decided proposals` |
| | | | | | `38109156 T4: commit test stubs required by jest configs` |
| | | | | | `6ff4bb85 T4-acceptance-suite` |
| 59 | `/home/nolan/worktrees/phase1-replay-check` | `(detached HEAD)` | `af7d26885a898415a4d35fa94c8263eb4aaca8ea` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `af7d2688 phase1: terminal-first ratification in brief, gate, and acceptance test` |
| | | | | | `9cc23920 phase1: fix 7b before/after assertion to the shared card semantics` |
| | | | | | `ff5e4959 phase1: MC terminal projection for decided proposals` |
| | | | | | `38109156 T4: commit test stubs required by jest configs` |
| | | | | | `6ff4bb85 T4-acceptance-suite` |
| 60 | `/home/nolan/worktrees/replay-render-wire` | `(detached HEAD)` | `832b0148f6699fb03936a1a55d4fd6dfff6a878a` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `832b0148 design/lane-render-wire: wire lane-4/6/7 vocabularies into the renderer` |
| | | | | | `c067f5b8 Merge branch 'design/lane-07-motion' into design/sprint-visual-v1` |
| | | | | | `c79cd95c Merge branch 'design/lane-06-typography' into design/sprint-visual-v1` |
| | | | | | `afc6114d Merge branch 'design/lane-05-media' into design/sprint-visual-v1` |
| | | | | | `fc7e489d Merge branch 'design/lane-04-composition' into design/sprint-visual-v1` |
| 61 | `/home/nolan/worktrees/side-visual-identity` | `(detached HEAD)` | `42f81d539937501377bc5f63071718b278d0561c` | 16 | M:6 A:0 D:0 ??:10 |
| | | | | | `42f81d53 Lane D: Mission Control dispatch UI/API vertical slice (2026-09-26)` |
| | | | | | `c93a7ced Arrow 6: exact object title wins over shorter fuzzy match in findObject` |
| | | | | | `56629e4b Fix hydration #418: resolve demo-owner gate server-side, pass down as prop` |
| | | | | | `6f2dd65e qc01-lane: mechanical call-site completion for the committed ARROW-1 public-projection API` |
| | | | | | `87671a5f FYD object presence: page-anchored edge mode, no fixed resting objects` |
| 62 | `/home/nolan/worktrees/workerF-edge-restore` | `workerF/edge-restore` | `2839dd508a7989b48362fe199488ca2e952aed42` | 1 | M:0 A:0 D:0 ??:1 |
| | | | | | `2839dd50 feat(fyd): restore page-level margin/edge object layer (Worker F EDGE-RESTORE)` |
| | | | | | `6245af11 fix(fyd): cap ObjectDoorway pill at container width (320px overflow)` |
| | | | | | `6b49b0c6 test(fyd): offline dump.py seam tests - set/clear presentation_intent, fail-closed unknown ops, digest determinism (7/7)` |
| | | | | | `c3b60e5f Q-P0-02: land claim-gate fix on integration branch (6 verifier holes closed)` |
| | | | | | `136bf9a6 UNIT-4 EDGE MERGE: edge-object experience port + 4-leak Q-P0-01 privacy lane (fyd/edge-port 568b3e5e) into fyd/sprint-integration-2026-09-24` |

## BRANCHES

`git -C /home/nolan/projects/ping branch -a` output (verbatim; `+` = worktree-checked-out elsewhere or otherwise flagged by git, `*` = current in canonical tree):

```
+ ask-loop/fyd-ask-behavior
+ codex/ping-parallel-review
+ constitutional-convergence-v2
+ copilot/arrow1-claims-gate
+ copilot/arrow1-hostile-proof
+ copilot/arrow6-sitepatch
+ copilot/authority-ux
+ copilot/l2-benchmark
+ copper-v2-serve
+ decision-fabric/contextpack-wire-2026-09-28
+ design/fix-evidence-ref-current
+ design/lane-04-composition
+ design/lane-05-media
+ design/lane-06-typography
+ design/lane-07-motion
+ design/lane-08-public-projection
+ design/lane-polish-f1
+ design/lane-render-wire
+ design/sprint-visual-v1
+ fyd-dehpp
+ fyd-deploy
  fyd-factory
  fyd-frontier-contact
  fyd-frontier-deactivate
  fyd-frontier-directive-order
  fyd-frontier-dumper
+ fyd-frontier-h1clip
  fyd-frontier-herofallback
  fyd-frontier-hide-unfeature
  fyd-frontier-mobile-objects
  fyd-frontier-truth
  fyd/ask-capabilities
  fyd/builder-composition
* fyd/builder-harvest-trackc-2026-09-28
  fyd/builder-product-blockers
+ fyd/builder-rebuild-v1
  fyd/edge-port
+ fyd/lane-p01-presence-compiler
  fyd/refresh-conflict
+ fyd/sites-coppersmith-alias
  fyd/sitespec-generator
  fyd/sprint-integration-2026-09-24
+ fyd/template-001-hpp-clone
+ fyd/write-boundary-idempotency
  goose/dns-rebinding-toctou-20260925
  hardening/2026-09-28-vocab-ssrf
  harvest/2026-09-28
+ lane/bcq-connector-substrate
+ lane/fyd-010-context-projection
+ lane/l-secret-broker
  main
+ phase1/approval-door-2026-09-28
  push/pass-a-microdata-2026-09-28
+ tenanos-wave/P-20260923-001-jest-config
+ tenanos-wave/P-20260923-012-sandbox
+ tenanos-wave/P-20260923-089-memory-candidate
+ tenanos-wave/P-20260923-091-decision-budget
+ tenanos-wave/P-20260923-092-tenant-kit
+ tenanos-wave/P-20260923-095-run-state
+ tenanos-wave/P-20260923-098-context-pack
+ tenanos-wave/P-20260923-100-bootstrap
+ tenanos-wave/P-20260923-103-attempt-fencing
+ tenanos-wave/P-20260923-104-105-security
  tenanos-wave/integration
  workerB/tenantos-fyd-seam
+ workerE/intent-move-first
+ workerF/edge-restore
  workerH/tenantos-journal-merge
  remotes/origin/HEAD -> origin/fyd/builder-composition
  remotes/origin/fyd/builder-composition
  remotes/origin/main
  remotes/origin/push/pass-a-microdata-2026-09-28
```

Flagged families:
- fyd/* : fyd-dehpp, fyd-deploy, fyd-factory, fyd-frontier-* (contact, deactivate, directive-order, dumper, h1clip, herofallback, hide-unfeature, mobile-objects, truth), fyd/ask-capabilities, fyd/builder-composition, fyd/builder-harvest-trackc-2026-09-28 (current *), fyd/builder-product-blockers, fyd/builder-rebuild-v1, fyd/edge-port, fyd/lane-p01-presence-compiler, fyd/refresh-conflict, fyd/sites-coppersmith-alias, fyd/sitespec-generator, fyd/sprint-integration-2026-09-24, fyd/template-001-hpp-clone, fyd/write-boundary-idempotency
- tenanos-wave/* : 10 numbered P-20260923 branches (001, 012, 089, 091, 092, 095, 098, 100, 103, 104-105) + tenanos-wave/integration
- constitutional: constitutional-convergence-v2 (ping repo). Separate repo /home/nolan/projects/constitutional-runtime has branch constitutional-trunk @ 74fbb74d9ab73f7df7b23bad2355f2c808ed720d (see OTHER CLONES)
- orca: no orca/* branches in the ping repo. Orca-related clones exist under /home/nolan/workspace/crx-autonomous-missions/repos/ (orca, alex2481kobe-orca) - third-party source mirrors, not FYD work
- copilot/* : arrow1-claims-gate, arrow1-hostile-proof, arrow6-sitepatch, authority-ux, l2-benchmark
- design/* : 8 lanes (04-composition, 05-media, 06-typography, 07-motion, 08-public-projection, lane-polish-f1, lane-render-wire, sprint-visual-v1, fix-evidence-ref-current)
- lane/* : lane/bcq-connector-substrate, lane/fyd-010-context-projection, lane/l-secret-broker
- worker* : workerB/tenantos-fyd-seam, workerE/intent-move-first, workerF/edge-restore, workerH/tenantos-journal-merge
- misc: ask-loop/fyd-ask-behavior, codex/ping-parallel-review, copper-v2-serve, decision-fabric/contextpack-wire-2026-09-28, goose/dns-rebinding-toctou-20260925, hardening/2026-09-28-vocab-ssrf, harvest/2026-09-28, phase1/approval-door-2026-09-28, push/pass-a-microdata-2026-09-28, main

Stash: 1 entry - `stash@{0}: On fyd-factory: fyd-sprint-2026-09-24-pre-purehead-dirty-state`

## OTHER CLONES

Separate git repos outside the canonical tree that hold FYD-related work (path / branch / HEAD / porcelain count / M-A-D-??):

| Path | Branch | HEAD | Porcelain | Breakdown | Notes |
|------|--------|------|-----------|-----------|-------|
| /home/nolan/ping | lane-b/tenant-dispatch-threading | 1822d5faecbf7db6985cca1e3303533abef81809 | 32 | M:3 ??:29 | SEPARATE repo: origin https://github.com/ngesk2/crx-runtime.git (crx-runtime, NOT the ping FYD repo). Last 3: 1822d5fae Lane B tenant dispatch threading; c59960b81 WR fail-closed repair; 73d06b03c W7-qdrant-py harvest 74fbb74. Contains untracked worktrees/ subdirs (agent-exec, agent-smoke-abc123def456, gw-jevcandidate-20260928, gw-jevcandidate-pure, gw-repair-build, jev-shadow-routing-domain, jev-surgical, oracle-assembly, playbook, python-prod, replay-input-wiring) - plain dirs, not git worktrees |
| /home/nolan/projects/constitutional-runtime | constitutional-trunk | 74fbb74d9ab73f7df7b23bad2355f2c808ed720d | 3371 | M:3371 | The nine unpushed constitutional-runtime commits; trunk @ 74fbb74 Lane-L-tenant-isolation-vectors. MASSIVE dirty state: 3371 modified files |
| /home/nolan/projects/CRX_REMOTE | main | b833d914f46e54d797e7f3d3d15a74437693c196 | 1694 | M:1690 D:4 | 1694 dirty entries (mostly .cursor agent transcripts) |
| /home/nolan/crx-swarm/crx-runtime-main | main | 6c4b5317f60b3501a5730e42c9474724c8ab1539 | 0 | clean | |
| /home/nolan/workspace/fyd-build | fyd-025-semantic-determinism | 841825c49fb3c41a36e13b21056793e04105bd0c | 12 | M:2 ??:10 | FYD-026b OWNER_AUTHORED claim classification; hpp-lane/ + work/ dirs untracked |
| /home/nolan/workspace/demo-sites | master | fd3ff9e2bafb6c31d1b40027201bbbd04821999c | 0 | clean | 3 templates, generator, 12 redacted local-business demo sites |
| /home/nolan/fyd-projection-harness | master | 7ec906d9dbf565495594f1421822bda3142e1406 | 3 | ??:3 | harness v3; untracked fyd/, harness-fixed.ts, lib/ |
| /home/nolan/projects/ping-website | ping/website | 44587599a0bf6799e5e8aaeca9366e413d6870f5 | 0 | clean | TenantOS audit |
| /home/nolan/workspace/fyd-factory/hpp-clone | master | 4d3e3c5de350d856e0cfbfbec56cba221591e51c | 1 | ??:1 | HPP clone (golden render path copy); untracked work/hpp-donor.tar. READ-ONLY observed; original HPP repo untouched |
| /home/nolan/projects/happy-place-platform | devin/hpp-ping-boundary | 6dd11bedd5e2b945186793bc1e8d9df4fb8303d5 | 10 | ??:10 | origin trishnikitha-art/happy-place-platform (the PROTECTED original). Read-only inventory only; no writes made |
| /home/nolan/projects/happy-place-platform/website | devin/hpp-ping-boundary | 6dd11bedd5e2b945186793bc1e8d9df4fb8303d5 | 10 | ??:10 | nested repo inside the above |
| /home/nolan/projects/happy-place-platform-forensic | main | 7569bb44d0a4dc9e1123b75b5b0def43a1005159 | 1 | M:1 | forensic audit clone |

Third-party source mirrors (not FYD work, listed for completeness, not inventoried in depth): /home/nolan/research/* (temporal, n8n, ollama, autogen, zoekt, continue, langgraph, tree-sitter, windmill, mem0, vllm, graphrag, browser-use, kythe, crewAI, swh-model, LightRAG, zep, letta, scip, aider, graphiti, firecrawl, LocalAI, crawl4ai, ragflow), /home/nolan/workspace/crx-autonomous-missions/repos/* (pydantic-ai, smolagents, sk, autogen, goose, langgraph, adk, temporal-py, alex2481kobe-orca, openhands-sdk, crewai, agentscope, swe-agent, orca), /home/nolan/workspace/scratch/durable-exec-src/*, /home/nolan/workspace/convergence-expansion-2026-09-19/harvest/*, /home/nolan/workspace/ping-build-program/harvest/*, /home/nolan/workspace/ping-autonomy-challenge/work-lane*/.

No .git dirs found under /tmp (maxdepth 3).

## REFLOG / STASH NOTES

`git -C /home/nolan/projects/ping log -g --date=iso` (last 30, verbatim key entries):

- 2026-09-28 16:59:43 -0600: f877c391 commit: trackc: 16 tests for the staged SitePatch pipeline (HEAD, canonical tree)
- 2026-09-28 16:59:40 -0600: 47ea5b26 commit: trackc: staged SitePatch pipeline PATCH->VALIDATE->CAPABILITY->PREVIEW->APPROVAL->EVENT->NEW SPEC VERSION
- 2026-09-28 16:59:37 -0600: fdb5d3f3 commit: trackc: typed 10-op SitePatch vocabulary + Phase-1 approval seam adapter
- 2026-09-28 16:57:33 -0600: checkout: moving from hardening/2026-09-28-vocab-ssrf to fyd/builder-harvest-trackc-2026-09-28
- 2026-09-28 05:59:49 -0600: 0264d517 commit: hardening: fail-closed vocabulary gate + SSRF effective-destination boundary
- 2026-09-28 05:48:28 -0600: checkout: moving from fyd/sprint-integration-2026-09-24 to hardening/2026-09-28-vocab-ssrf
- 2026-09-28 05:46:24 -0600: 9ea3e6a6 merge harvest/2026-09-28
- 2026-09-27 22:55 / 21:34 / 20:32 / 20:32:15: repeated `reset: moving to HEAD` at 4a8c5f2e (four resets in ~2.5h, HEAD unchanged - reset to same commit each time)
- 2026-09-26 18:37:41 -0600: checkout: moving from nolan/ping-cosmos-hero to fyd/sprint-integration-2026-09-24 (detached checkout of branch nolan/ping-cosmos-hero existed 18:37:24 to 18:37:41 - 17 seconds)
- 2026-09-26 07:26:22 -0600: 42f81d53 Lane D: Mission Control dispatch UI/API vertical slice
- 2026-09-25: cherry-pick c93a7ced (Arrow 6), Arrow 1 commits, hydration #418 fixes, reset at 87671a5f

Stash: `stash@{0}: On fyd-factory: fyd-sprint-2026-09-24-pre-purehead-dirty-state` (single entry; fyd-factory branch is not currently checked out in any worktree).

## CANDIDATE SERVED TREE (:3100)

A sibling lane traces the live :3100 process; this lane records path candidates only (no process inspection performed):

1. /home/nolan/worktrees/copper-v2 - STRONGEST name signal: registered branch is `copper-v2-serve`. BUT the checkout is git-broken: its `.git` file contains `gitdir: /home/nolan/workspace/.git/worktrees/copper-v2` (the workspace repo's admin dir, which does not exist), so every git command there fails with `fatal: not a git repository`. The ping repo still lists it at c03bc145. Double-registration anomaly: present in both /home/nolan/projects/ping/.git/worktrees/ and referenced from /home/nolan/workspace/.git.
2. /home/nolan/build-clean - clean tree on fyd/sites-coppersmith-alias @ b0cdc3b8; "build-" naming suggests a build/serve experiment tree.
3. /home/nolan/build-edge-proof, /home/nolan/build-purehead - detached @ e474c89b; same build-* family.
4. /home/nolan/fyd-preview-wt - detached @ e48ef710 with preview routes (src/app/preview/, src/app/fyd-night/ untracked) and 29 dirty entries.
5. /home/nolan/projects/ping-fyd-deploy - branch fyd-deploy @ ade4ee50 ("FYD UI deploy: base 0dec40f5 + narrow /build/* restriction").
6. /home/nolan/build-template1 - fyd/template-001-hpp-clone @ e4819ce8 (TRADESMAN HPP-clone proof tree).

Note: the :3100 restart protocol (/home/nolan/start-3100.sh, sets NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1) is documented in ~/workspace/AGENTS.md; the sibling lane owns process-to-tree binding.

## DIRTY-FILE TOTALS

Worktrees (canonical ping repo), `git status --porcelain` entry counts:

- TOTAL across all 62 worktrees: 306 porcelain entries
- Canonical tree /home/nolan/projects/ping alone: 144 (74 M, 70 ??) - the dirtiest worktree by far
- Next dirtiest: fyd-preview-wt 29 (7 M, 22 ??); fyd-dehpp-merge-proof 19 (5 M, 13 A, 1 ??); side-visual-identity 16 (6 M, 10 ??); build-idem 12 (9 M, 3 ??); ping-ask-loop 12 (10 M, 2 ??); ping-constitutional 12 (7 M, 5 ??); lane-e-ask 12 (8 M, 4 ??)
- Clean (0 entries): 24 worktrees, including build-clean, build-edge-proof, build-purehead, build-template1, build-workerE-intent, ping-deploy-head, ping-wave-P-20260923-001/089/091/095/098/103, ping-wave-security-104-105, ping-wave1-build, ping-wave1-check, tenanos-c1-tree, lane-fyd-010, laneB3-9a555021
- copper-v2: UNKNOWN (git-broken checkout, commands fail)
- No worktree has D (deleted) entries; A (staged new) entries appear only in fyd-dehpp-merge-proof (13 staged new files - compose/copy/proceduralize modules)

Other clones dirty totals: constitutional-runtime 3371 M; CRX_REMOTE 1694 (1690 M, 4 D); /home/nolan/ping 32 (3 M, 29 ??); fyd-build 12 (2 M, 10 ??); happy-place-platform 10 ??; happy-place-platform/website 10 ??; fyd-projection-harness 3 ??; hpp-clone 1 ??; happy-place-platform-forensic 1 M; demo-sites, ping-website, crx-swarm/crx-runtime-main clean.

Anomalies for the convergence pass:
1. copper-v2 double-registration + dangling gitdir (workspace repo admin dir missing).
2. constitutional-runtime has 3371 modified files on constitutional-trunk @ 74fbb74 - the nine unpushed commits sit under a fully dirty tree.
3. Canonical tree is 144 entries dirty on the active trackc branch while commits landed 16:59 MDT today.
4. Four `reset: moving to HEAD` reflog entries on 2026-09-27 at 4a8c5f2e (no-op resets).
5. One stash entry on fyd-factory (branch not checked out anywhere).
