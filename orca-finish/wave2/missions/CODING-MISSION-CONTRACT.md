# Coding Mission Acceptance Contract

ORCA FINISH — Wave 2, Lane W2-MISSIONS. Version 1.0, 2026-09-23.
Purpose: the acceptance bar for the mission "find the first broken step in the FYD golden path and fix it."
This contract closes the mechanism map's UNKNOWN item "coding mission acceptance."

Golden path order (authoritative, from ARCHAEOLOGY-HANDOFF.md):
ACQUISITION -> EVIDENCE -> OBJECT GRAPH -> SITE SPEC -> RENDER -> BROWSER VERIFICATION -> ASK FYD.

## 1. What counts as "the first broken step"

- BROKEN means: a stage fails its stated pass bar with reproducible evidence on the current branch, in the current machinery, now. Not "would fail under load", not "might fail on another branch", not "fails a hypothetical."
- FIRST means: walk the golden path in order; the first stage that is broken wins. A later, louder failure does not displace an earlier broken step. If stage N is broken, stages N+1 findings are supporting evidence only.
- BROKENNESS is established by: (1) a failing reproducible test or probe against real pipeline machinery (fixture graphs, real projections, real rendered routes), (2) the failing mechanism located to a file/function (not a symptom description), (3) the failure shown to be CURRENT (reproduced on the branch tip, not quoted from an old report). Quoted-but-not-reproduced = NOT-STARTED for verdict purposes.
- Non-broken by definition: a design-complete-but-unimplemented stage (arrows 1-3, 7, 15, 17, 18 are mostly design) is NOT "the first broken step" — it is a MISSING stage. The mission fixes broken implemented steps; missing stages go to the orchestration lane (Phase 17), not to this mission. Do not "fix" a missing stage by building it.
- A false positive that dies under reproduction (e.g. TD-001 on fyd-factory @ e48ef710) is NOT the broken step. Record it as FALSIFIED with the reproduction evidence; do not implement a fix for it.

## 2. Smallest-fix rule

- The fix is the minimal change that makes the failing stage pass its bar without breaking any other bar. Prefer: one file, additive, no refactors, no renames, no behavior changes beyond the failure.
- New-authority ban: the fix must not introduce a new authority, event system, or canonical store. Harvest existing machinery (e.g. the existing resolveSafeLink choke point, not a new URL sanitizer).
- Test-before-production: the regression test lands in the same patch as the fix; the fix is not "done" until the test fails before and passes after.
- If the smallest fix requires touching a file another lane owns (shared file), the fix is a PATCH PROPOSAL in patches/ for the coordinator, not an applied change. Record the handoff.

## 3. Gates in order (each is PASS/FAIL with evidence)

1. INSPECT: locate the failing mechanism to a file/function/line; cite evidence.
2. TEST: reproduce the failure deterministically (script or test, checked into a missions/work area, runnable by someone else). No reproduction = no fix.
3. IDENTIFY: name the broken step and its stage; rule out earlier stages with their passing evidence; rule out false positives with reproduction.
4. PLAN: smallest-fix proposal + regression-test sketch + blast-radius note (what else reads this code path). Plan only; implementation belongs to the lane that owns the code (constitutional sprint owns golden-path forensics — see handoff).
5. ISOLATED WORKTREE: implementation happens on an isolated branch/worktree, never on a lane another worker is using. (Worktree isolation is the one DIRECT_REUSE mechanism from the map.)
6. IMPLEMENT: apply the smallest fix; run the regression test (fails-before/passes-after demonstrated).
7. TEST: run the full lane suites touched + the stage's existing probes; zero regressions.
8. RED-TEAM: an independent pass (different agent, adversarial brief) attempts to defeat the fix with hostile inputs adjacent to the original failure class. Fix survives = recorded; fix defeated = back to PLAN.
9. INTEGRATE: merge via the owning lane's integration path (coordinator applies the patch; shared-file rules honored). Never push to main/master; never bypass the coordinator.
10. REPORT: evidence bundle (reproduction, fix diff, test results, red-team verdict, integration record). A fix without the bundle is not a fix.

## 4. Evidence required (minimum bundle)

- broken-step-reproduction.md: command(s) run, output, branch + commit, what failed and where
- fix-plan.md: smallest change, why it is sufficient, blast radius, what it deliberately does NOT change
- regression test file + fails-before/passes-after log
- lane-suite results after the fix (green)
- red-team report (adversarial, signed by a different lane)
- integration record (patch applied by whom, when, branch state after)
- If any gate is skipped, the verdict is INCOMPLETE, not DONE.

## 5. Verdicts

DONE (all 10 gates PASS, evidence bundle complete) | INCOMPLETE (some gate skipped or failed; list the exact gate and the blocker) | MISDIRECTED (the "broken step" was falsified under reproduction; bundle = falsification evidence + the actual next candidate) | HANDOFF (fix planned but implementation/integration belongs to another lane; bundle = plan + reproduction + exact handoff point).

## 6. Who signs the verdict

Same signing rule as the FYD contract: machine-produced gate logs, an independent red-team lane (mandatory), and the owning lane's coordinator for integration. Until the A7 runner exists, the supervising agent countersigns single-run executions.
