# T-17 Pig Follow-up: Projection-Invalidation Coverage (TASK I)

Date: 2026-09-28 ~19:45 MDT. READ-ONLY lane. No product tree was written, committed, restarted, or otherwise touched. The only write is this report file. Pig reached via pigwsl stdin-fed batch (~/workspace/pig-fb/pigwsl-exec.sh); all Pig-side commands were read-only git/grep/sha256sum/sed/cat.

## VERDICT

PARTIAL DELTA, one new candidate beyond lane E.

1. NEW: `src/fyd/projection/regen-trigger.ts`, committed on the convergence branch `fyd/convergence-2026-09-28` (commit 8fce667d4867db07b481c7bb28e83e072248801d, worktree HEAD 5732485b). It wires the approve and clear paths to dump.py with a post-rebuild `overlayEventIds` verification and honest `{ok, verified}` reporting in the approval response. Verdict: ADAPT. Harvest the verify-then-report pattern and the fail-closed journal selection; do not take the shape (hardcoded 2-site allowlist, no affected-projection map, zero tests, and it is the approve-embedded shell-out the gap doc forbids as a special case).

2. FYD_REGEN_CMD post-append hook: NOT LANDED anywhere Pig-side. The string `FYD_REGEN_CMD` never appears in the canonical repo history (`git log --all -S "FYD_REGEN_CMD" -- tools/fyd-journal-gateway/` is empty on all refs), nor in the canonical working tree, HEAD blob, the `.bak` file, the converged worktree, or any of the 49 second-repo refs. It exists only in lane E's sandbox mirrors (lane-d-impl at 310ce509). The canonical gateway shells out to nothing at all.

3. Otherwise NO-DELTA. All 49 second-repo refs and all 73 canonical refs were swept. The only invalidation machinery anywhere is the DependencyIndex family lane E already found (byte-identical at canonical HEAD, still orphaned from any trigger). Selective INVALIDATE and the generic AFFECTED OBJECTS to AFFECTED PROJECTIONS wiring remain missing.

## 1. FYD_REGEN_CMD landed status: NOT LANDED (verified, closes lane E's open item)

Evidence, each independently observed on the Pig:

- Canonical working tree `tools/fyd-journal-gateway/server.mjs`: grep for `FYD_REGEN_CMD`, `triggerRegen`, `runRegen` returns zero hits. sha256 `d8b1c0885b9f3c893f8035bf69fc128b789a3428aad50e34bc3652f09bd3efb3` (differs from lane E's mirror `4f9717d6...`; the canonical file is the tenant-enforcement version: `tenantIdOf`, `requestIndex`, bearer write auth, FYD-037 identity marker).
- Canonical HEAD blob: `git show HEAD:tools/fyd-journal-gateway/server.mjs | grep -c` for the hook identifiers = 0.
- Backup file `tools/fyd-journal-gateway/server.mjs.bak-2026-09-27-k` (untracked): 0 hits.
- Full history: `git log --all -S "FYD_REGEN_CMD" -- tools/fyd-journal-gateway/` in the canonical repo returns empty. The hook was never in this tree on any ref, not even historically.
- Converged worktree: `git grep -l FYD_REGEN_CMD` over HEAD returns nothing.
- Second repo, all 49 refs: `FYD_REGEN_CMD` appears only in lane-f probe/failure docs (`FAILURE_LEDGER.md`, `fyd-lane/lane-f-*`), which are planning artifacts, never an implementation.
- The canonical server.mjs contains no `execFile`/`spawn(`/`exec(` at all. There is no trigger of any kind in the canonical gateway. Its recent history (`f2d9b2e8` tenant privacy + request_id binding, `45f771ef` request_id dedupe, `f1dcc427` fyd-037 identity marker) is all tenant-enforcement evolution.
- Canonical tree state at observation: HEAD `f877c3919941978f07d5014909595df4751ec258`, branch `fyd/builder-harvest-trackc-2026-09-28`, 144 porcelain entries (matches the registers).

Consequence for lane E's candidate 2: the ADAPT verdict stands, but the "landed status" half is now resolved against landing. The hook is unlanded everywhere reachable. The artifact that actually closed lane E's two gaps on the hook (freshness verification, named rebuild command) is the converged `regen-trigger.ts` below, in a different shape and location than the hook.

## 2. New candidate: converged `src/fyd/projection/regen-trigger.ts`

- SOURCE: `/home/nolan/projects/ping-fyd-converged/src/fyd/projection/regen-trigger.ts`; sha256 `b57b900287225189af03cacb89a2758cc5e9f38d8fa8411515a232a7dedf95ff`; added in commit `8fce667d4867db07b481c7bb28e83e072248801d` ("fyd-converge: proposal/approval + approve-to-projection regeneration"); branch `fyd/convergence-2026-09-28`, worktree HEAD `5732485b`. Present on exactly one ref: checked all 73 canonical refs via `cat-file -e`, no other ref has the path.
- WHAT IT SOLVES: 115-line server-only module. `regenerateSiteProjection(siteId, eventId)`: fail-closed site allowlist (`KNOWN_SITES` = `happy-place`, `coppersmith-plumbing`), runs `tools/fyd-site-projection/dump.py` via `execFile` with `FYD_OVERLAY_JOURNAL=demo` set explicitly (never the default; the default fails closed with WRONG_JOURNAL), 30s timeout, 4MB output cap; then reads the dumped `<siteId>.json` and verifies `meta.overlayEventIds` includes the journaled eventId; returns `{ok, verified, latencyMs, error?}` and never throws. Called from `src/app/api/fyd/customize/route.ts` in both the approve path (line 540) and the clear path (line 628); the approval response surfaces `regen: {ok, verified, latencyMs, error?}`. Header comment documents the failure semantics: approval stays committed regardless; the response never claims the page changed before verification; atomic dump plus uncached reads keep the previous verified projection serving until the new file lands whole.
- Contract-stage mapping: AUTHORIZED TRANSITION yes (approve/clear call it); AFFECTED OBJECTS to AFFECTED PROJECTIONS no (siteId passed straight through, hardcoded allowlist); INVALIDATE no (whole-site rebuild only); DETERMINISTIC REBUILD yes (dump.py); VERIFY yes (overlayEventIds check); ATOMIC PUBLISH yes (inherited from dump.py); FRESHNESS PROOF partial (the `verified` flag in the approval response; no independent consumer check beyond the response).
- TESTS: none found. Only two files reference `regenerateSiteProjection` (the module itself and the route). No `__tests__` entry under `src/fyd/projection/`. (`src/fyd/owner-mode/__tests__/regen-proof.test.ts` matches the `*regen*` filename pattern only and is unrelated.)
- REACHABILITY: wired in code on the convergence branch (approve + clear paths). Whether the live :3100 serves this build was not verified by this lane (the build-identity seam landed in 5732485b per the branch log; served-build binding belongs to the served-tree lane).
- VERDICT: ADAPT. One-line reason: newest wired trigger with post-rebuild freshness verification, but hardcoded site list, no affected-projection mapping, zero tests, and it is the approve-embedded shell-out the gap doc forbids as a special case; harvest the verify-then-report pattern into the generic seam, do not bless the shape.

Observation on the tension (not a proposal): the convergence branch's U5 answer IS the forbidden pattern, approve shells out to re-dump, built as commit 8fce667d. The T-17 gap doc and this task forbid proposing it; the branch built it anyway. The U5 convergence owner must resolve whether the generic seam subsumes this module or the branch's approach stands as consumer #1 with the seam built around it. This lane takes no position beyond recording the fact.

## 3. NO-DELTA evidence: branch lists actually searched

Second repo `/home/nolan/workspace` (49 refs; HEAD `965289637c8eeb46c43f4adef33ac8e78ab00448` on `security/secret-redaction-2026-09-28`). Every ref swept via per-ref `git grep` with no checkouts:

`audit/beyond-backlog-2026-09-19`, `burn/orca-f04-2026-09-27`, `burn/orca-f06-2026-09-27`, `burn/outreach-caps-2026-09-27`, `feat/orca-unknown-outcome-port`, `fix/broker-failclosed-containment`, `fix/gap1-f2-absorb-floats`, `fyd/builder-rebuild-v1`, `fyd/builder-rebuild-v1-cherrypick`, `jev/shadow-recorder`, `lane-c/orca-adapter-2026-09-26`, `lane-f-probe-staleness-fix`, `lane-f/harness-2026-09-26`, `master`, `mc/approval-request`, `mc/audit-payload-lifecycle`, `mc/consequence-policy-input`, `mc/frontdoor-hardening`, `mc/fyd-shapeA-site-console`, `mc/lane-c-reconcile-gate`, `mc/mission-budgets`, `mc/mission-intent-frontdoor`, `mc/pass-migration-proof`, `mc/pass-migration-supersession`, `mc/sprint-integration-2026-09-27`, `mc/tenant-hardening`, `mc/tenant-hostile-tests`, `orca-engagement-pipeline-endgame`, `origin/feat/orca-unknown-outcome-port`, `origin/fyd-deploy`, `origin/main`, `p0/approval`, `p0/front-door-idempotency`, `security/secret-redaction-2026-09-28`, `spine/x-pass-reached-path`, `stream-b/composeview-visibility`, `stream-b/publicgraphof-visibility`, `substrate/gap1-F1-lane-e-floats`, `substrate/gap1-F6-lane-e-keyorder`, `substrate/gap1-canonical-conformance`, `substrate/gap2-provenance-ref`, `substrate/gap3-journal-identity`, `substrate/gap4-binding-lint`, `substrate/gap5-probe-health`, `track-a/d1-monitors`, `track-a/d2-schedule`, `track-a/d3-igprefilter`, `track-a/d4-spool`, `trackc/tenant-prep-2026-09-27`.

Canonical repo `/home/nolan/projects/ping` (73 refs; all swept for `invalidat` across src+tools per ref, and `regen-trigger.ts` existence checked per ref via `cat-file -e`):

`ask-loop/fyd-ask-behavior`, `codex/ping-parallel-review`, `constitutional-convergence-v2`, `copilot/arrow1-claims-gate`, `copilot/arrow1-hostile-proof`, `copilot/arrow6-sitepatch`, `copilot/authority-ux`, `copilot/l2-benchmark`, `copper-v2-serve`, `decision-fabric/contextpack-wire-2026-09-28`, `design/fix-evidence-ref-current`, `design/lane-04-composition`, `design/lane-05-media`, `design/lane-06-typography`, `design/lane-07-motion`, `design/lane-08-public-projection`, `design/lane-polish-f1`, `design/lane-render-wire`, `design/sprint-visual-v1`, `fyd-dehpp`, `fyd-deploy`, `fyd-factory`, `fyd-frontier-contact`, `fyd-frontier-deactivate`, `fyd-frontier-directive-order`, `fyd-frontier-dumper`, `fyd-frontier-h1clip`, `fyd-frontier-herofallback`, `fyd-frontier-hide-unfeature`, `fyd-frontier-mobile-objects`, `fyd-frontier-truth`, `fyd/ask-capabilities`, `fyd/builder-composition`, `fyd/builder-harvest-trackc-2026-09-28`, `fyd/builder-product-blockers`, `fyd/builder-rebuild-v1`, `fyd/convergence-2026-09-28`, `fyd/edge-port`, `fyd/lane-p01-presence-compiler`, `fyd/refresh-conflict`, `fyd/sites-coppersmith-alias`, `fyd/sitespec-generator`, `fyd/sprint-integration-2026-09-24`, `fyd/template-001-hpp-clone`, `fyd/write-boundary-idempotency`, `goose/dns-rebinding-toctou-20260925`, `hardening/2026-09-28-vocab-ssrf`, `harvest/2026-09-28`, `lane/bcq-connector-substrate`, `lane/fyd-010-context-projection`, `lane/l-secret-broker`, `main`, `origin`, `origin/fyd/builder-composition`, `origin/main`, `origin/push/pass-a-microdata-2026-09-28`, `phase1/approval-door-2026-09-28`, `push/pass-a-microdata-2026-09-28`, `tenanos-wave/P-20260923-001-jest-config`, `tenanos-wave/P-20260923-012-sandbox`, `tenanos-wave/P-20260923-089-memory-candidate`, `tenanos-wave/P-20260923-091-decision-budget`, `tenanos-wave/P-20260923-092-tenant-kit`, `tenanos-wave/P-20260923-095-run-state`, `tenanos-wave/P-20260923-098-context-pack`, `tenanos-wave/P-20260923-100-bootstrap`, `tenanos-wave/P-20260923-103-attempt-fencing`, `tenanos-wave/P-20260923-104-105-security`, `tenanos-wave/integration`, `workerB/tenantos-fyd-seam`, `workerE/intent-move-first`, `workerF/edge-restore`, `workerH/tenantos-journal-merge`.

Sweep results:

- `invalidat` (both repos, all refs): hits are uniformly the DependencyIndex family: `src/fyd/refresh/{dependency-index.ts, run-t2.ts, README.md, __tests__/dependency-index.test.ts}`, `src/fyd/invariants/__tests__/inv-10-invalidation-scope.test.ts`, `src/fyd/onboarding/compile-tenant.ts` (+ test), `src/app/api/fyd/objects/[objectId]/overrides/patch-loop.ts`, `src/fyd/spatial/slot-manager.ts`. No new mechanism on any ref.
- `FYD_REGEN_CMD` / `regen-trigger` / `overlayEventIds` (second repo): only lane-f probe docs and `FAILURE_LEDGER.md` (planning artifacts); on `origin/fyd-deploy`, `overlayEventIds` consumers (`build-ping-fyd-projection.mjs`, `ping-object-source.ts`, projection fixtures, tenant test helpers), not a trigger.
- Filenames `*regen*` / `*invalidat*` / `*projection*` ever added (second repo history): empty.
- `freshness` / `affected.*projection` (second repo): `BACKLOG_PING.md` planning text, `fyd-tenant-graph.ts` comments, ops-watches backup-freshness scripts (unrelated).
- Canonical: `regen-trigger.ts` on exactly one ref (`fyd/convergence-2026-09-28`); `FYD_REGEN_CMD` on zero refs and zero history.

Location delta, not a mechanism delta: `src/fyd/refresh/dependency-index.ts` is tracked at canonical HEAD (`f877c391`) and byte-identical to lane E's fyd-build copy (sha256 `14bb0e7bc23a8984300b0279bf3185b385dfff1f2aa52cf275d16e8ac01bdb23`). Lane E listed it under the fyd-build mirror; it also lives in the canonical tree. Verdict unchanged: ADAPT (orphaned register/merge/invalidate contract). Also tracked at canonical HEAD: `src/fyd/invariants/__tests__/inv-10-invalidation-scope.test.ts` (test asset for invalidation scope, not machinery).

## 4. Updated contract-stage coverage (delta vs lane E)

| Stage | Lane E | This lane |
|---|---|---|
| AUTHORIZED TRANSITION | FYD_REGEN_CMD hook, unlanded (ADAPT) | Converged `regen-trigger.ts` approve/clear calls (ADAPT); hook confirmed unlanded |
| AFFECTED OBJECTS to AFFECTED PROJECTIONS | DependencyIndex, orphaned (ADAPT) | Unchanged; byte-identical copy confirmed at canonical HEAD |
| INVALIDATE | Missing as a mechanism | Still missing (whole-site rebuild only) |
| DETERMINISTIC REBUILD | dump.py (ADOPT) | Unchanged |
| VERIFY | dump.py pre-flight + serve-time digest (ADOPT) | Plus post-dump `overlayEventIds` check in `regen-trigger.ts` (ADAPT) |
| ATOMIC PUBLISH | dump.py tmp+rename (ADOPT) | Unchanged |
| FRESHNESS PROOF | meta fields, no consumer (ADOPT) | Plus `regen.verified` surfaced in the approval response (partial; ADAPT) |

The two stages lane E flagged as missing remain the gap: no AFFECTED OBJECTS to AFFECTED PROJECTIONS wiring reaches any trigger, and there is no selective invalidation. The converged module rebuilds whole-site projections per approve/clear.

## 5. Freeze-reference note (for the task's FROZEN line)

`af7d2688` resolves as a commit object in the canonical repo and is the tip of branch `phase1/approval-door-2026-09-28` there (`af7d26885a898415a4d35fa94c8263eb4aaca8ea`), matching the phase1 worktree at `/home/nolan/worktrees/phase1-approval-door` (same HEAD, same branch). It is the phase1 approval-door freeze, not the canonical tree freeze; canonical HEAD is `f877c391`. The converged worktree sits at `5732485b` (7 `fyd-converge` commits above `f877c391`: build-identity seam, demo routes, Ask FYD + BFF, proposal/approval + regeneration, evidence binding, renderer safety, proceduralizer), clean tree. Read-only observation; no position taken on the convergence state.

## 6. Machine-visible EXISTING IMPLEMENTATIONS SEARCHED

{"register":"I-T17-PIG-FOLLOWUP","task":"T-17/I-PIG-FOLLOWUP","locations":[
{"path":"/home/nolan/projects/ping-fyd-converged/src/fyd/projection/regen-trigger.ts","sha256":"b57b900287225189af03cacb89a2758cc5e9f38d8fa8411515a232a7dedf95ff","added_in":"8fce667d4867db07b481c7bb28e83e072248801d","branch":"fyd/convergence-2026-09-28","worktree_head":"5732485b700f27767da2fc896bd662189ba18cc5","only_ref_with_path":true,"verdict":"ADAPT (verify-then-report pattern; not the shape)"},
{"path":"/home/nolan/projects/ping/tools/fyd-journal-gateway/server.mjs","sha256":"d8b1c0885b9f3c893f8035bf69fc128b789a3428aad50e34bc3652f09bd3efb3","head":"f877c3919941978f07d5014909595df4751ec258","hook_present_worktree":false,"hook_present_head_blob":false,"hook_present_any_history":false,"verdict":"FYD_REGEN_CMD NOT LANDED; hook exists only in lane E sandbox mirrors"},
{"path":"/home/nolan/projects/ping/src/fyd/refresh/dependency-index.ts","sha256":"14bb0e7bc23a8984300b0279bf3185b385dfff1f2aa52cf275d16e8ac01bdb23","head":"f877c391","verdict":"ADAPT (same mechanism as lane E candidate 3; canonical-HEAD location is new, mechanism is not)"},
{"path":"/home/nolan/workspace (second repo)","refs_swept":49,"head":"965289637c8eeb46c43f4adef33ac8e78ab00448","verdict":"NO-DELTA; DependencyIndex family vendored in lane-p01 trees only"},
{"path":"/home/nolan/projects/ping (canonical repo)","refs_swept":73,"head":"f877c3919941978f07d5014909595df4751ec258","verdict":"NO-DELTA beyond the convergence-branch module above"},
{"path":"/home/nolan/worktrees/phase1-approval-door","head":"af7d26885a898415a4d35fa94c8263eb4aaca8ea","branch":"phase1/approval-door-2026-09-28","verdict":"freeze reference confirmed; not searched for invalidation machinery (approval scope)"}],
"winner":"none complete; converged regen-trigger.ts is the newest wired trigger (ADAPT); generic AFFECTED-PROJECTION mapping and selective invalidation still missing"}

## 7. Commands run (evidence)

All Pig-side, read-only, via `~/workspace/pig-fb/pigwsl-exec.sh -s` (stdin-fed batch, no checkouts):

- `git -C /home/nolan/projects/ping rev-parse HEAD` / `branch --show-current` / `status --porcelain | wc -l` (f877c391, fyd/builder-harvest-trackc-2026-09-28, 144).
- `grep -n` for FYD_REGEN_CMD/triggerRegen/runRegen in canonical server.mjs, HEAD blob, and `.bak-2026-09-27-k` (all zero); `sha256sum` both gateway files; `sed` of hook-region line ranges (tenant-enforcement code, no hook).
- `git log --all -S "FYD_REGEN_CMD" -- tools/fyd-journal-gateway/` (empty); `git log --oneline -5 -- tools/fyd-journal-gateway/server.mjs` (tenant-enforcement history).
- `grep -n -e execFile -e "spawn(" -e "exec("` in canonical server.mjs (no hits: no shell-out).
- `git ls-files src/fyd/refresh/` + `sha256sum src/fyd/refresh/dependency-index.ts` (14bb0e7b, matches lane E).
- Second repo: `rev-parse HEAD`, `for-each-ref` branch list (49 refs), per-ref `git grep -l` sweeps for `invalidat`, `FYD_REGEN_CMD|regen-trigger|overlayEventIds`, `freshness|affected.*projection`; `git log --all --diff-filter=A --name-only` for `*regen*|*invalidat*|*projection*` filenames (empty).
- Converged worktree: `rev-parse HEAD`, `branch --show-current`, `status --porcelain | wc -l`, `log --oneline -12`, full `cat` of `src/fyd/projection/regen-trigger.ts`, per-file `git grep -l regenerateSiteProjection`, `show HEAD:src/app/api/fyd/customize/route.ts` call-site context.
- Canonical repo: `for-each-ref` branch list (73 refs), per-ref `git grep -l -i invalidat` over src+tools, per-ref `cat-file -e` for `src/fyd/projection/regen-trigger.ts` (exactly one hit), `cat-file -t af7d2688`, `rev-parse phase1/approval-door-2026-09-28`.
- Phase1 worktree: `rev-parse HEAD`, `rev-parse af7d2688`, `branch --show-current`.

Local reads: lane E report `~/workspace/ping-24h/sprint/h00-02/E-PROJECTION-SEARCH.md`; `~/workspace/ping-24h/forest-convergence/CLASSIFICATION.md`; `~/workspace/ping-24h/prelaunch/02-SEMANTIC-ASSET-REGISTER.md` (section 23); `~/workspace/ping-24h/prelaunch/03-DO-NOT-REIMPLEMENT-REGISTER.md`; `~/workspace/pig-fb/pigwsl-exec.sh`; `~/workspace/AGENTS.md` (transport rules).

Caveats: the live :3100 served build was not probed for the converged module (served-build binding is another lane's scope); the phase1 worktree was not searched for invalidation machinery (approval scope, and the task named the second repo's branches plus the canonical tree); sweep patterns were `invalidat`, `FYD_REGEN_CMD`, `regen-trigger`, `overlayEventIds`, `freshness`, `affected.*projection` plus regen/invalidat/projection filename history, which covers the contract vocabulary in the registers.
