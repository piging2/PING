# Failure archaeology (reader 5/6, completed 2026-09-27T00:19:52Z)

## 1. @graph / JSON-LD silent zero-node extraction
WHAT HAPPENED: extractGraph() only handled {"@graph": [...]} and single-node objects, but jsonld.flatten() returns an ARRAY of nodes. Silent zero nodes, zero facts, no error. Source: ~/workspace/FAILURE_LEDGER.md (2026-09-21 extraction-lane), ~/memory/2026-09-21.md:373,567. Fixed: accept arrays first, then @graph, then single-node; verified Coppersmith 7 nodes -> 38 facts.
INVARIANT: Probe the library's actual return shape before writing the consumer; assert whenever zero results come from a successful operation. Silent-empty is the worst failure mode.
ENCODING: TEST (probe test on known JSON-LD doc) + SCHEMA (parse-tier labels / truthful extraction stats).

## 2. Module-global nondeterminism (projectCounter)
WHAT HAPPENED: commit 750c40e, branch fyd/sitespec-generator, /home/nolan/projects/ping. Business IDs from mutable module-level projectCounter. Fail-first repair: IDs derive from canonical input JSON, time caller-injected. 7/7 suites, 50/50 tests incl. 5 new pre-failing tests. Source: ~/memory/2026-09-21.md:372.
INVARIANT: Mutable module-level state is nondeterminism hiding in plain sight; derived identities from canonical input; volatile inputs injected, never ambient.
ENCODING: TEST (fail-first determinism: regenerate twice, byte-identical).

## 3. javascript: URL sink
WHAT HAPPENED: renderer escaped hostile HTML text but rendered javascript:alert(1)/alert(2) verbatim into href via href={website}. React warns, does not block. Fixed + verified: fyd-lane/safe-link.test.ts 16/16; static sink audit: every observed-data href interpolates only resolveSafeLink kind==="safe". Source: ~/workspace/FAILURE_LEDGER.md FL-20260921-032.
INVARIANT: Escaping text is not escaping URLs; neutralize hostile schemes at the projection seam (trust boundary data -> rendered output).
ENCODING: TEST (16/16 suite incl. smuggled schemes) + TYPE (SafeLink constructible only via resolveSafeLink).

## 4. 320px overflow
WHAT HAPPENED: docScrollW=331 > 320 on committed build only; owner = Ask FYD "Design tokens" proposal rows flex (label.flex + input.flex-1 min-width:auto + 44px button). Fix: one class min-w-0. Matrix: 320 PASS (305), 375 PASS, 1280 PASS. Earlier 375px failure was dirty-worktree WIP, reproduced in neither clean parent. Source: FAILURE_LEDGER.md FL-20260921-033; commit 8a99742.
INVARIANT: Trace overflow to exact measured owner, fix only that; flex min-width:auto refuses shrink; unreproduced measurement in dirty worktree is not a product bug.
ENCODING: TEST (320px regression: scrollWidth <= viewport) + REUSABLE RECIPE (trace-driver/owners-probe ancestor measurement).

## 5. Fixture-role confusion
WHAT HAPPENED: 6 FYD tests failed: expected rich HEAD fixtures (9 objects), worktree fixtures were degraded regen output (2 objects). Fixture role silently changed on regen. Resolution: roles separated; happy-place-rich-graph.ts canonical; generated fixture stays machine output; canonical gate 195/195. Source: FAILURE_LEDGER.md FL-20260921-034; ~/memory/2026-09-21.md:752.
INVARIANT: Every fixture carries explicit role (generated output vs canonical reference); generated artifacts never silently become source fixtures.
ENCODING: SCHEMA (fixture role declared) + POLICY (fixtures explicitly classified; regen never silently replaces canonical).

## 6. Reconciliation repeated gaps
WHAT HAPPENED: reconcile.py ignored closure dispositions (r2-closure-20260920.md, r3-closure-20260920.md); 10 R2 + 7 R3 gaps re-escalated across 3+ reports. Fix: closure-aware reconciliation, lifecycle OPEN/KNOWN_PERMANENT/RESOLVED/REOPENED; 17 actionable -> 2 + 15 KNOWN_PERMANENT; 13/13 lifecycle tests; idempotent rerun. Source: ~/memory/2026-09-20.md, 2026-09-21.md.
INVARIANT: Gap detector must consume closure dispositions; suppression stays auditable and reopenable, never silent deletion.
ENCODING: TEST (13/13 lifecycle + idempotent rerun) + SCHEMA (gap lifecycle state machine).

## 7. Gateway argv detector false-red (2026-09-26)
WHAT HAPPENED: tripwire grepped argv substring fyd-journal-gateway/server.mjs; canonical launcher uses bare node server.mjs with cwd=gateway dir. Stayed red (JOURNAL_GATEWAY_PROCS=0) while service healthy (sole 127.0.0.1:18199 listener, ok:true). Closed 18:01 MDT, classification A. Source: ~/memory/2026-09-26.md:1847-1851,2228,2615-2617.
INVARIANT: Never identify a service by coincidental argv substring; identity = what the process owns (cwd, listening socket, health contract).
ENCODING: TRIPWIRE (cwd-aware match + port ownership + health contract).

## 8. WSL restart killing supervised processes (2026-09-26)
WHAT HAPPENED: WSL restarted 12:43:47 MDT (Windows up since Sep 16; trigger unknown). Killed gateway + :18199 listener. PigiFydStackWatch detected unhealthy 12:45:29, relaunched via start-18199.sh, healthy 12:46:02 (~2 min recovery). First broken transition after was detector identity (#7), not supervisor. Source: ~/memory/2026-09-26.md:2618,2625.
INVARIANT: Host layer can restart outside the supervisor's world; supervision = external watchdog + idempotent restart script, never platform-persistence assumption.
ENCODING: TRIPWIRE (5-min probe detecting unhealthy + relaunch) + REUSABLE RECIPE (every supervised process ships idempotent start-*.sh; single recovery authority restarts dependency-ordered).

## 9. Browser target death after sleep
WHAT HAPPENED: Pig Modern Standby 06:52:54 -> 07:25:38 MDT destroyed CDP page targets; Chrome processes lived; single-page-per-worker reuse meant all subsequent actions failed "Target page... has been closed". FB pass 3/47 before death. Fixes: browser-lock.sh in launchers; ensurePage() recreates dead targets mid-pass. Policy: bounded wake lock per job (acquire -> run -> release in finally), UNKNOWN when outcome unestablishable. Source: FAILURE_LEDGER.md FL-20260921-016; ~/memory/2026-09-21.md:853. Note: 2026-09-26 Nolan ordered Pig never-sleep on AC (supersedes scoped-wake-only for AC); per-pass revalidation remains defense in depth.
INVARIANT: Sleeping machine costs at most the current bounded action: revalidate lock/session/target across sleep gaps; recreate what died; record UNKNOWN where outcomes unestablishable.
ENCODING: POLICY (wake ownership in automation lifecycle) + REUSABLE RECIPE (ensurePage() dead-target recovery, pre-pass browser-health probe).

## Most general lesson
Same shape every time: a proxy trusted in place of ground truth. Verify the actual thing (probe real shape, name real owner, read real health endpoint and closure evidence, derive from canonical input, measure exact node) and make every absence explicit (assert on silent-empty, fail closed, record UNKNOWN, KNOWN_PERMANENT with disposition refs) rather than letting a quiet surface pass as a real check.
