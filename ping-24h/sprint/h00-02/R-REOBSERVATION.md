# R-1 RE-OBSERVATION REPORT (hour 0-2)

Lane: R-1, falsification/observation ONLY. Read-only lane. No fixes, patches, commits, merges, resets, or cleans performed. No writes to any product tree. No Jev calls. No paid spend. Canonical tree /home/nolan/projects/ping untouched (read-only git status/rev-parse/cat-file probes only).

Observation window: 2026-09-28 ~19:30-19:55 MDT. T+0 reference: 2026-09-28 ~19:30 MDT.

Reachability note: this sandbox has no /home/nolan. All git/process probes ran read-only on the Pig's WSL via pigwsl SSH (nolan@100.79.154.43) with stdin-fed bash scripts. The canonical tree, worktrees, and served processes live there.

---

## VERDICT

1. Preservation map mostly SAME, with 8 trees CHANGED (only 2 non-trivial: lane7-sites gained 3 modified source files; ping-lane-l-broker gained an untracked src/lib/secrets/ dir), 15 worktrees NOT IN THE MAP TEXT, and 1 stale-map statement.
2. STALE MAP STATEMENT (largest finding): the map records ":3100 serves the canonical tree". As of now :3100 (PID 90141, started 2026-09-28 18:43:04 MDT) serves from /home/nolan/projects/ping-fyd-converged @ 5732485b (branch fyd/convergence-2026-09-28, clean tree), NOT the canonical tree. The canonical tree's 144 dirty entries are NOT being served.
3. T-18 binding: YES, mechanically traceable for the currently served tree. /api/readyz exposes buildId 2BFLbt5EHFUJeXfd0E6zT + commitSha 5732485b700f27767da2fc896bd662189ba18cc5 + builtAt, matching the served tree's HEAD and its .next/BUILD_ID (mtime 2026-09-28 18:41:57). NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 confirmed live in the process env. Served root HTML (sha256 883560ff...) contains the build id.
4. T-19 floor: the 195-test floor's exact test command is not pinned in any artifact searched (SPRINT_100H_PRIORITIES P18, scoreboard, repo package.json/jest config/TESTING.md/docs). Current green/red status: UNVERIFIED (no rerun observed since live changes; prelaunch policy forbids test runs). The unattributed suppressHydrationWarning one-liner (src/app/layout.tsx:75, dirty/modified in canonical tree) is NOT pinned by any test: zero test files reference suppressHydrationWarning.
5. E1 integrity: MATCH/MATCH. e1-corpus.json sha256 f59eaf79...2765ec matches frozen value. lexical_baseline.py sha256 dadf1d81...5e290e3 matches frozen value. Deterministic self-check reproduces top1 19/25 = 0.760 exactly (top3 23/25, top10 24/25). Zero Jev calls made.
6. Phase1 frozen SHA af7d2688: PRESENT (git cat-file -t = commit). MATCH.

---

## 1. PRESERVATION DELTA TABLE

Recorded = 2026-09-28 ~18:45 MDT per 04-DIRTY-WORK-PRESERVATION-MAP.md. Current = 2026-09-28 ~19:35 MDT.

Columns: TREE | RECORDED HEAD | CURRENT HEAD | DIRTY THEN | DIRTY NOW | STATUS | NOTE

| TREE | RECORDED HEAD | CURRENT HEAD | DIRTY THEN | DIRTY NOW | STATUS | NOTE |
|---|---|---|---|---|---|---|
| DW-01 /home/nolan/projects/ping | f877c391 (fyd/builder-harvest-trackc-2026-09-28) | f877c3919941978f07d5014909595df4751ec258 (same branch) | 144 (74 M, 70 ??) | 144 (74 M, 70 ??) | SAME | Branch, HEAD, counts identical. |
| DW-02 /home/nolan/fyd-preview-wt | e48ef710 detached | e48ef710cb889bf4d59b833ef9766067a9e2bbf0 detached | 29 | 29 (7 M, 22 ??) | SAME | |
| DW-03 /home/nolan/fyd-dehpp-merge-proof | e48ef710 detached | e48ef710cb889bf4d59b833ef9766067a9e2bbf0 detached | 19 | 19 (5 M, 13 A, 1 ??) | SAME | |
| DW-04 /home/nolan/worktrees/side-visual-identity | 42f81d53 detached | 42f81d539937501377bc5f63071718b278d0561c detached | 16 | 16 (6 M, 10 ??) | SAME | |
| DW-05 /home/nolan/build-idem | d6c1b05d (fyd/write-boundary-idempotency) | d6c1b05d3b47cc1e64e977507b33fdd818a7931e (same branch) | 12 | 12 (9 M, 3 ??) | SAME | |
| DW-06 /home/nolan/projects/ping-ask-loop | 42f81d53 (ask-loop/fyd-ask-behavior) | 42f81d539937501377bc5f63071718b278d0561c (same branch) | 12 | 12 (10 M, 2 ??) | SAME | |
| DW-07 /home/nolan/projects/ping-constitutional | a69bb68f (constitutional-convergence-v2) | a69bb68fc84620a5635e071030cf49a633df7394 (same branch) | 12 | 12 (7 M, 5 ??) | SAME | |
| DW-08 /home/nolan/worktrees/lane-e-ask | e474c89b detached | e474c89bcaedeee2596deb07c739f722af2ae4b3 detached | 12 | 12 (8 M, 4 ??) | SAME | |
| DW-09 /home/nolan/2026-09-22/.../ping-parallel | 9c8c2193 (codex/ping-parallel-review) | 9c8c21939eff073a5b87817e4ef1674d9aabebc5 (same branch) | 8 | 8 (3 M, 5 ??) | SAME | |
| /home/nolan/build-edge-port | 8faf96d0 detached | 8faf96d0b1e964c0240450d2166c6389b71682e9 detached | 1 | 1 (1 ??) | SAME | |
| /home/nolan/cohort2-pristine | e48ef710 detached | e48ef710cb889bf4d59b833ef9766067a9e2bbf0 detached | 1 | 1 (1 ??) | SAME | |
| /home/nolan/fyd-dehpp-wt | eb28d3aa (fyd-dehpp) | eb28d3aacda8d3f0bcd463f1069eb7b55beb999f (same branch) | 1 | 1 (1 ??) | SAME | |
| /home/nolan/h1clip-work | f7a5efe4 (fyd-frontier-h1clip) | f7a5efe4fa53274180aded7fc9f5797328151bcd (same branch) | 1 | 1 (1 ??) | SAME | |
| /home/nolan/lane7-sites | 28e4ba00 detached | 28e4ba00ff5301146190f93e48ac8d814f58155f detached | 1 | 4 (3 M, 1 ??) | CHANGED | 3 new MODIFIED source files: src/fyd/ui/__tests__/placement.test.ts, src/fyd/ui/object-layer/MarginObjectLayer.tsx, src/fyd/ui/object-layer/placement.ts; ?? is node_modules. |
| /home/nolan/projects/ping-bcq-substrate | e48ef710 (lane/bcq-connector-substrate) | e48ef710cb889bf4d59b833ef9766067a9e2bbf0 (same branch) | 1 | 1 (1 ??) | SAME | |
| /home/nolan/projects/ping-deploy-head | 0dec40f5 detached | 0dec40f5c5823a8040bcd1f710e25c3103d499c3 detached | 1 | 0 | CHANGED | Trivial: the 1 entry is gone; tree now clean. |
| /home/nolan/projects/ping-fyd-deploy | ade4ee50 (fyd-deploy) | ade4ee50127085d9be1fb3749cfec8d6de2e9719 (same branch) | 1 | 1 (1 ??) | SAME | |
| /home/nolan/projects/ping-lane-l-broker | e48ef710 (lane/l-secret-broker) | e48ef710cb889bf4d59b833ef9766067a9e2bbf0 (same branch) | 1 | 2 (2 ??) | CHANGED | New untracked src/lib/secrets/ dir (plus node_modules). Flagged for secret scan at GO. |
| DW-21 /home/nolan/worktrees/copper-v2 | git-broken (admin dir missing) | git-broken (fatal: not a git repository: /home/nolan/workspace/.git/worktrees/copper-v2) | UNKNOWN | UNKNOWN | SAME | Still uninspectable. |
| DW-22 /home/nolan/projects/constitutional-runtime | 74fbb74 (constitutional-trunk) | 74fbb74d9ab73f7df7b23bad2355f2c808ed720d (same branch) | 3371 M | 3371 M | SAME | |
| DW-23 /home/nolan/projects/CRX_REMOTE | b833d914 (main) | b833d914f46e54d797e7f3d3d15a74437693c196 (same branch) | 1694 (1690 M, 4 D) | 1694 (1690 M, 4 D) | SAME | |
| DW-24 /home/nolan/ping | (no branch recorded) | 1822d5fa (lane-b/tenant-dispatch-threading) | 32 (3 M, 29 ??) | 32 (3 M, 29 ??) | SAME | Counts match; branch now recorded. |
| DW-27 /home/nolan/worktrees/phase1-approval-door | af7d2688 clean | af7d26885a898415a4d35fa94c8263eb4aaca8ea (phase1/approval-door-2026-09-28) | 0 | 1 (1 ?? node_modules) | CHANGED | Trivial: node_modules appeared. HEAD unchanged (frozen SHA intact). |
| DW-27 /home/nolan/worktrees/phase1-replay-check | af7d2688 detached clean | af7d26885a898415a4d35fa94c8263eb4aaca8ea detached | 0 | 1 (1 ?? node_modules) | CHANGED | Trivial: node_modules appeared. HEAD unchanged (frozen SHA intact). |
| DW-28 /home/nolan/projects/ping-worktrees/contextpack-2026-09-28 | 9a555021 (no dirty count recorded) | 9a55502125fe9b38f44aef183f597f09971c1862 (decision-fabric/contextpack-wire-2026-09-28) | n/a | 1 (1 ?? node_modules) | NOW-RECORDED | Baseline unknown in map; ?? is node_modules only. |
| DW-28 /home/nolan/projects/ping-worktrees/contextpack-replay-2026-09-28 | 9a555021 detached (no dirty count recorded) | 9a55502125fe9b38f44aef183f597f09971c1862 detached | n/a | 1 (1 ?? node_modules) | NOW-RECORDED | Baseline unknown in map; ?? is node_modules only. |
| DW-29 /home/nolan/worktrees/arrow1-gate | 87671a5f (copilot/arrow1-claims-gate, no dirty count recorded) | 87671a5f459ec437f5d315a6e6b31b68f3a1cea9 | n/a | 2 (?? task.done, task.result.jsonl) | NOW-RECORDED | Copilot run artifacts. |
| DW-29 /home/nolan/worktrees/arrow1-hostile | 87671a5f (copilot/arrow1-hostile-proof) | 87671a5f459ec437f5d315a6e6b31b68f3a1cea9 | n/a | 2 (?? task.done, task.result.jsonl) | NOW-RECORDED | Copilot run artifacts. |
| DW-29 /home/nolan/worktrees/arrow6-sitepatch | f052e6b5 (copilot/arrow6-sitepatch) | f052e6b591f78520a5bdeb105cab542328132095 | n/a | 3 (?? node_modules, task.done, task.result.jsonl) | NOW-RECORDED | Copilot run artifacts. |
| DW-29 /home/nolan/worktrees/authority-ux | 87671a5f (copilot/authority-ux) | 87671a5f459ec437f5d315a6e6b31b68f3a1cea9 | n/a | 2 (?? task.done, task.result.jsonl) | NOW-RECORDED | Copilot run artifacts. |
| DW-29 /home/nolan/worktrees/l2-benchmark | 87671a5f (copilot/l2-benchmark) | 87671a5f459ec437f5d315a6e6b31b68f3a1cea9 | n/a | 2 (?? task.done, task.result.jsonl) | NOW-RECORDED | Copilot run artifacts. |
| DW-25 tenanos-wave (10 worktrees) | all clean | same branch/HEADs as map (001@10ed47b7, 012@eec54a76, 089@04e420e2, 091@b49c9e19, 092@6cbd64af, 095@82ed23e6, 098@13f21b59, 100@3a578131, 103@a9d1c9d8, 104-105@1df0f98c) | 0 | 0 for 9; P-092 now 1 | CHANGED (P-092 only) | P-092 gained 1 ?? (node_modules). Trivial. Others identical. |
| DW-26 design lanes (9 worktrees) | clean | same branch/HEADs as map | 0 | 1 each (?? node_modules) | CHANGED (trivial) | All 9 gained node_modules only. No source edits. |
| DW-28 /home/nolan/workspace/ping-24h/repro/laneB3-9a555021 | 9a555021 detached | 9a55502125fe9b38f44aef183f597f09971c1862 detached | n/a | 0 | SAME | Clean. |
| DW-30 /home/nolan/fyd-projection-harness | master @ 7ec906d9, 3 ?? | master @ 7ec906d9dbf565495594f1421822bda3142e1406 | 3 | 3 (?? fyd/, harness-fixed.ts, lib/) | SAME | |
| DW-30 /home/nolan/workspace/fyd-build | fyd-025-semantic-determinism, 12 entries | 841825c49fb3c41a36e13b21056793e04105bd0c | 12 | 12 (2 M: server/dev-server.ts, src/fyd/ask/__tests__/services.test.ts; 10 ??) | SAME | Found at /home/nolan/workspace/fyd-build (not /home/nolan/fyd-build). |
| DW-30 /home/nolan/projects/happy-place-platform | devin/hpp-ping-boundary, 10 ?? | 6dd11bedd5e2b945186793bc1e8d9df4fb8303d5 | 10 | 10 (10 ??) | SAME | Found at /home/nolan/projects/happy-place-platform. NEVER TOUCHED boundary respected. |
| DW-30 /home/nolan/projects/happy-place-platform-forensic | main, 1 M | 7569bb44d0a4dc9e1123b75b5b0def43a1005159 | 1 M | 1 (M website/src/app/api/drive/oauth/callback/route.ts) | SAME | |
| DW-30 /home/nolan/workspace/fyd-factory/hpp-clone | master, 1 ?? | 4d3e3c5de350d856e0cfbfbec56cba221591e51c | 1 | 1 (?? work/hpp-donor.tar) | SAME | |
| DW-30 /home/nolan/workspace/demo-sites | clean | master @ fd3ff9e2bafb6c31d1b40027201bbbd04821999c | 0 | 0 | SAME | |
| DW-30 /home/nolan/projects/ping-website | clean | ping/website @ 44587599a0bf6799e5e8aaeca9366e413d6870f5 | 0 | 0 | SAME | |
| DW-30 /home/nolan/crx-swarm/crx-runtime-main | clean | main @ 6c4b5317f60b3501a5730e42c9474724c8ab1539 | 0 | 0 | SAME | |
| /home/nolan/website | 10 ?? (map) | NOT FOUND | 10 | n/a | MISSING | No /home/nolan/website; likely referred to /home/nolan/projects/ping-website (clean) or its website/ subdir. |

Stash (canonical): RECORDED "stash@{0}: On fyd-factory: fyd-sprint-2026-09-28-pre-purehead-dirty-state". CURRENT "stash@{0}: On fyd-factory: fyd-sprint-2026-09-24-pre-purehead-dirty-state". STATUS: CHANGED (name date 09-28 vs 09-24; single entry still present). Possible map transcription error; the stash itself was not dropped.

---

## 2. WORKTREES NOT IN THE PRESERVATION MAP

git worktree list on the canonical repo shows 63 registered (main + 62; map reported 62 total). The following 15 are not described in the map text (owner UNRECORDED in all cases; purposes inferred from branch names only):

| WORKTREE | BRANCH | HEAD | DIRTY | APPARENT PURPOSE |
|---|---|---|---|---|
| /home/nolan/build-clean | fyd/sites-coppersmith-alias | b0cdc3b85b4ea27f1dc10d6fea0e830a5e34ac07 | 0 | sites coppersmith-alias build work |
| /home/nolan/build-edge-proof | detached | e474c89bcaedeee2596deb07c739f722af2ae4b3 | 0 | edge proof work |
| /home/nolan/build-purehead | detached | e474c89bcaedeee2596deb07c739f722af2ae4b3 | 0 | pure-head build reference |
| /home/nolan/build-template1 | fyd/template-001-hpp-clone | e4819ce88d1ae82005704c9d3381fd234967e64e | 0 | template-001 HPP clone |
| /home/nolan/build-workerE-intent | workerE/intent-move-first | 2aa7b1d2345ed1bee3712aaa91c07b79ccfb26ce | 0 | worker E intent-move-first |
| /home/nolan/fyd-wave2-clean | detached | e48ef710cb889bf4d59b833ef9766067a9e2bbf0 | 1 (?? node_modules) | wave2 clean reference |
| /home/nolan/projects/ping-fyd-converged | fyd/convergence-2026-09-28 | 5732485b700f27767da2fc896bd662189ba18cc5 | 0 | FYD convergence build; NOW THE SERVED TREE (:3100). Canonical f877c391 is its ancestor; 7 fyd-converge commits on top (renderer safety + mobile hydration fix, proceduralizer + digest law, evidence binding + owner visibility + tenant isolation, proposal/approval + approve-to-projection regen, Ask FYD + BFF read boundary, demo routes + read surface + journal gateway, build-identity seam + repo config). |
| /home/nolan/projects/ping-wave1-build | detached | e48ef710cb889bf4d59b833ef9766067a9e2bbf0 | 0 | wave1 build reference |
| /home/nolan/projects/ping-wave1-check | detached | e48ef710cb889bf4d59b833ef9766067a9e2bbf0 | 0 | wave1 check reference |
| /home/nolan/tenanos-c1-tree | detached | 51d4a187ff94a7b3da836e39ff408b131cfd338f | 0 | tenanos C1 tree |
| /home/nolan/worktrees/fyd-family-converge | fyd/builder-rebuild-v1 | 4eb904013ee05646c57b403fe6a2f3f2d6ffa89a | 1 (?? tsconfig.proof.json) | FYD family converge / builder rebuild |
| /home/nolan/worktrees/lane-fyd-010 | lane/fyd-010-context-projection | 9f9b79f810eed7fa0e1e56fccb660b2149c11260 | 0 | fyd-010 context projection lane |
| /home/nolan/worktrees/lane-p01 | fyd/lane-p01-presence-compiler | 2bf1e5c9f1fdcd90339b30f4f5839f3432134272 | 1 (?? node_modules) | lane-p01 presence compiler |
| /home/nolan/worktrees/replay-render-wire | detached | 832b0148f6699fb03936a1a55d4fd6dfff6a878a | 1 (?? node_modules) | render-wire replay (same SHA as design-lane-render) |
| /home/nolan/worktrees/workerF-edge-restore | workerF/edge-restore | 2839dd508a7989b48362fe199488ca2e952aed42 | 1 (?? node_modules) | worker F edge restore |

---

## 3. ACTIVE PROCESSES

Observed on Pig WSL 2026-09-28 ~19:40 MDT. No restarts performed.

- :3100 (PID 90141, next-server v15.5.24): CWD /home/nolan/projects/ping-fyd-converged. Env contains NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1 (read from /proc/90141/environ). Started Mon Sep 28 18:43:04 2026 MDT. Listens on *:3100.
- :3213 (PID 49851, next-server v15.5.24): CWD /home/nolan/2026-09-22/you-re-really-good-at-web/work/ping-parallel/apps/editorial-preview. Started 16:17:37. Not part of the FYD serve path.
- :3211 (PID 50657, next-server v15.5.24): CWD /home/nolan/projects/fyd-editorial-template. Started 16:18:40. Not part of the FYD serve path.
- Journal gateway :18199 (PID 64173, node server.mjs): CWD /home/nolan/projects/ping/tools/fyd-journal-gateway (canonical tree tooling). Started 17:03:57.
- Journal gateway :18200 (PID 90265, node server.mjs): CWD /home/nolan/projects/ping-fyd-converged/tools/fyd-journal-gateway (converged tree tooling). Started 18:43:27 (paired with the :3100 restart).
- :6333 LISTEN with no visible local process (likely container/external; not inspected further). No orca adapter processes found on the Pig WSL.

---

## 4. T-18 BASELINE CAPTURE

- SOURCE SHA: 5732485b700f27767da2fc896bd662189ba18cc5 (branch fyd/convergence-2026-09-28, tree CLEAN, 0 dirty). Note: this is NOT the canonical tree; canonical f877c391 is its ancestor.
- BUILD ID: 2BFLbt5EHFUJeXfd0E6zT (from /home/nolan/projects/ping-fyd-converged/.next/BUILD_ID, mtime 2026-09-28 18:41:57 MDT).
- SERVED-ASSET PROOF: GET http://127.0.0.1:3100/ -> 200, 196951 bytes, sha256 883560ff5122aa73946fc894c131099e424217f631f012014971a17b99718d19 (served bytes contain the build id 2BFLbt5EHFUJeXfd0E6zT). GET /api/readyz -> {"ok":true,"ready":true,"service":"fyd","at":"2026-09-29T01:32:30.803Z","build":{"buildId":"2BFLbt5EHFUJeXfd0E6zT","commitSha":"5732485b700f27767da2fc896bd662189ba18cc5","builtAt":"2026-09-29T00:41:57.775Z"}}. GET /demo -> 404 (no demo route on this build). GET /api/healthz -> 200.
- BINDING VERDICT: YES, mechanically traceable. The served artifact exposes SOURCE SHA + BUILD ID via /api/readyz (build-identity seam present in this tree at src/app/api/readyz/route.ts); the process CWD and /proc env independently confirm the served source path and the demo-owner flag; the served root HTML embeds the build id. Canonical-tree skew from the prelaunch spec (DqZQX-gQgkpciv6rpLgG3 vs branch HEAD, Sep 28 06:38 process) is SUPERSEDED: the 18:43:04 restart moved :3100 to a clean convergence tree with a live identity seam.

---

## 5. T-19 FLOOR STATUS

- Floor definition: the exact "195-test floor" test command is NOT pinned in any artifact searched: SPRINT_100H_PRIORITIES.md P18, prelaunch/08-BASELINE-SCOREBOARD.md, prelaunch/10-FYD-GAPS-AS-EVIDENCE.md, canonical repo package.json (test = plain `jest`; test:compiler, test:media-invariant, test:oauth variants only), jest.config.cjs (testMatch src/**/__tests__/*.test.{ts,tsx}; 223 test files found under src/app), TESTING.md, README.md, DESIGN-write-boundary.md, .github/workflows. The floor exists only as a planning reference ("floor runs in CI-on-the-Pig after each change; red floor blocks certification").
- Current status: UNVERIFIED. No rerun observed since the 2026-09-28 live changes. No test runs were executed in this lane (read-only scope per task).
- suppressHydrationWarning one-liner: present at src/app/layout.tsx:75 on the <html> element, inside the canonical tree's dirty working tree (file is Modified, uncommitted; last commit touching it b0161b1a). Pinned by any test: NO. Zero test files reference suppressHydrationWarning (searched canonical tree excluding node_modules and .next). The one-liner is uncommitted, untested, and unattributed.

---

## 6. E1 INTEGRITY

- e1-corpus.json sha256: f59eaf79078041b869a1825a18631a3a0900ce64c6e4e1dde64dc7039d2765ec. Expected f59eaf79...2765ec. MATCH.
- lexical_baseline.py sha256: dadf1d818f7f81806fcd4fa1c8765e5bf09fe5164825b9b7f9cb0190d5e290e3. Expected dadf1d81...5e290e3. MATCH.
- Deterministic self-check (zero Jev calls, read-only rerun): n=25 top1=19 top3=23 top10=24; top1_rate=0.760 top3_rate=0.920 top10_rate=0.960. Reproduces the frozen 19/25 = 0.760 exactly. Corpus not touched.
- Verdict: MATCH/MATCH.

---

## 7. PHASE1 FROZEN SHA

- git -C /home/nolan/projects/ping cat-file -t af7d2688 -> commit. git rev-parse af7d2688 -> af7d26885a898415a4d35fa94c8263eb4aaca8ea. PRESENT. MATCH. Both phase1 worktrees still sit at this SHA.

---

## ANYTHING THAT MOVED SINCE THE INVENTORY (summary)

1. :3100 no longer serves the canonical tree. It now serves /home/nolan/projects/ping-fyd-converged @ 5732485b (clean, 7 fyd-converge commits atop canonical f877c391), BUILD_ID 2BFLbt5EHFUJeXfd0E6zT, process started 18:43:04 MDT, demo-owner flag live in env. Journal gateway :18200 moved with it (serves converged tooling since 18:43:27); :18199 still serves canonical tooling (since 17:03:57). A live /api/readyz build-identity seam now exposes buildId + commitSha + builtAt.
2. lane7-sites: +3 modified source files (placement.test.ts, MarginObjectLayer.tsx, placement.ts) and node_modules appeared. Only tree with new tracked modifications since the map.
3. ping-lane-l-broker: new untracked src/lib/secrets/ directory. Flag for secret scan before any commit (per its FREEZE classification).
4. Stash name on canonical: fyd-sprint-2026-09-28-pre-purehead-dirty-state (map) vs fyd-sprint-2026-09-24-pre-purehead-dirty-state (now). Single entry retained; not dropped.
5. Trivial churn (node_modules / task.done / task.result.jsonl / one entry removed): phase1-approval-door, phase1-replay-check, P-092, all 9 design lanes, ping-deploy-head (1 entry removed, now clean), arrow trees (copilot artifacts, baseline unrecorded in map), contextpack pair (baseline unrecorded in map).
6. 15 worktrees registered that the map text does not describe (table in section 2). copper-v2 still git-broken.
7. E1 corpus and baseline script hashes MATCH frozen values; baseline self-check reproduces 0.760 exactly.
8. Phase1 frozen SHA af7d2688 intact and present.
9. suppressHydrationWarning one-liner confirmed unpinned by any test (src/app/layout.tsx:75, dirty in canonical tree).

---

## EVIDENCE / COMMANDS RUN

- Probes executed read-only on Pig WSL via `ssh -F /home/hatch/.ssh/pig-config -o BatchMode=yes pigwsl "wsl -- bash -s"` with stdin-fed bash scripts: git worktree list; per-tree git rev-parse --abbrev-ref HEAD / rev-parse HEAD / status --porcelain; git stash list; git cat-file -t af7d2688; pgrep/ss -tlnp; /proc/<pid>/cmdline, cwd, environ, lstart; cat .next/BUILD_ID + stat; curl -s/-I http://127.0.0.1:3100/ /api/readyz /api/healthz; sha256sum of served bytes; grep for suppressHydrationWarning and 195 references across prelaunch artifacts and repo.
- E1: sha256sum + read-only python3 lexical_baseline.py rerun in ~/workspace/ping-24h/jev-refactor/shadow-spike (local sandbox copy; zero Jev calls, no corpus modification).
- No writes to any product tree, worktree, or served directory. No service restarts. No commits, resets, or cleans.
