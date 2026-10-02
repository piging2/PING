# TASK F REPORT: HOLD/recovery corpus (T-05) + 195-test floor status (T-19)

Lane: read-only falsification/observation. No product tree, worktree, or served
directory was written, committed, or restarted. Only files under
~/workspace/ping-24h/sprint/h00-02/ were created.

Date: 2026-09-28 ~19:30 MDT (T+0 of the 100-hour sprint).

---

## PART F-1 VERDICT: COMPLETE. Eight fixtures written, fixture-only, none wired.

The Wave B hostile corpus for HOLD/recovery comparison exists at
[corpus-t05/](sandbox://workspace/ping-24h/sprint/h00-02/corpus-t05/) with an
[INDEX.md](sandbox://workspace/ping-24h/sprint/h00-02/corpus-t05/INDEX.md).
Every fixture file is labeled FIXTURE ONLY / NOT wired into any suite. No
implementation was touched, no dispatch-path code was changed, no seam was
duplicated (registers 02 and 03 searched first; corpus-only per T-05 authority
boundary).

Shared invariant under test in all eight (exact, from the task spec):
UNKNOWN EFFECT → HOLD → RECONCILE → PROVE EFFECT / PROVE ABSENCE / HUMAN DECISION.

1. fixture-01-unknown-external-effect.md: ack lost after a consequential dispatch.
   Expected: HOLD with retry_eligibility FALSE (structural, not label-based);
   resolution only via PROVE EFFECT (SUCCEEDED, count 1), PROVE ABSENCE
   (SAFE_TO_RETRY, same row reused, final count exactly 1), or HUMAN DECISION.
2. fixture-02-lease-expiration-after-possible-effect.md: lease expires while an
   effect may be in flight. Expected: narrowed reaper refuses created-reset;
   parks HOLD. This fixture is the direct detector for the OPEN reaper gap
   (HOLD → created → redispatch ~60s) recorded in AGENTS.md.
3. fixture-03-death-after-effect-before-ack.md: worker killed after the effect
   landed, before ack. Expected: orphaned-started parks as HOLD (not FAILED);
   retry only on PROVE ABSENCE; recover.ts lineage (new run, never resume in place).
4. fixture-04-death-after-result-before-journaling.md: effect proven, result
   never journaled, worker dead. Expected: HOLD; result recovered or re-derived
   without re-executing the effect; journaled exactly once. FAILED is forbidden
   (UNKNOWN never collapses to FAILED).
5. fixture-05-duplicate-submission.md: same intent submitted twice. Expected:
   exactly one logical mission row; conditional claim / fencing-token CAS lets
   only one attempt go effectful; final effect_count exactly 1.
6. fixture-06-zombie-result.md: stale worker result arrives after reconciliation
   or re-attempt. Expected: zombie writes match zero rows (token/generation
   conditional); reconciled outcome untouched; zombie logged as evidence.
7. fixture-07-restart-with-hold-present.md: scheduler restart (plus concurrent
   second scheduler) with a HOLD row present. Expected: HOLD survives
   byte-identical and unclaimable by both schedulers; identity never reminted.
8. fixture-08-reconciliation-crash.md: reconciler killed mid-reconciliation.
   Expected: still HOLD, evidence notes preserved append-only, next reconciler
   idempotent, exactly one atomic terminal transition; no half-proof resolution.

T-06 input: corpus ready; runner still to be written by T-06 (per the task spec,
the runner is T-06's deliverable, not this lane's).

---

## PART F-2 VERDICT: floor definition found by name; exact test command NOT
## recorded in any accessible artifact; current floor status UNVERIFIED and
## unverifiable from this lane; the suppressHydrationWarning one-liner is NOT
## pinned by any test.

### F-2a. Floor definition (test command + scope)

FOUND BY NAME, command NOT located. The prelaunch artifacts define the floor as
"195/195 canonical tests" (the canonical test suite):

- BUILDER_DECISION_MATRIX.md line 5: "Verified floor (do not regress):
  195/195 canonical tests, two real websites, same proceduralizer, deterministic
  graph, deterministic SiteSpec, desktop green, mobile green, URL safety green,
  binding verifier wired, owner visibility override green, zero customer-specific
  renderer code."
- SPRINT_100H_PRIORITIES.md P18: "195-test floor reinstated as a gate: green on
  the served tree after every live change."
- 05-FIRST-20-READY-TASKS.md T-19: the task's own DONE EVIDENCE is "floor
  inventory + rerun runbook + gate definition", i.e. the runbook (with the exact
  command) is a T-19 deliverable that does not exist yet. T-19 also notes a
  related but distinct suite: "phase1 suite 2336/2363 (27 known pre-existing
  failures, TESTING.md)".

No prelaunch artifact, and no repo location reachable from this sandbox, names
the literal test command (e.g. which jest/vitest config, which directory, flags).
The canonical tree /home/nolan/projects/ping is NOT reachable from this lane's
sandbox (path does not exist here), so the package.json / TESTING.md / CI config
could not be read.

### F-2b. Current floor status

UNKNOWN / UNVERIFIED. Evidence:

- 08-BASELINE-SCOREBOARD.md (pre-GO, OBSERVED): "195-test floor: floor exists,
  NOT rerun after 2026-09-28 live changes (UNVERIFIED current state)."
- TRACK_C_STATUS.md: "The full canonical 195-test floor has not been rerun after
  today's changes." and "Full 195-test floor not rerun after today's live changes."
- SPRINT_100H_PRIORITIES.md line 26: "the 195-test floor was not rerun after live
  changes."

This lane ran zero tests (read-only lane; tree unreachable anyway). I cannot
confirm "does it pass right now": the last recorded state is "not rerun since
the 2026-09-28 live changes", so any claim of green would be invented. The
honest reading: the floor's last known state predates the live changes and is
therefore stale; current status is UNVERIFIED, not PASS, not FAIL.

### F-2c. Is the suppressHydrationWarning one-liner pinned by any test?

NO. Commands run and evidence:

- The line lives in src/app/layout.tsx of the served tree: `<html ... suppressHydrationWarning ...>`
  added to the `<html>` tag (observed in
  ~/workspace/ping-24h/lanes/laneB13-dirty-tree/dirty-tree.patch, lines ~1604-1613).
- 10-FYD-GAPS-AS-EVIDENCE.md Gap 3 (OBSERVED): "suppressHydrationWarning is live
  in the served tree but uncommitted, with no attributing test."
- laneB15 preservation report classifies layout.tsx (suppressHydrationWarning) in
  "Cluster 6: Sites UI / lab demo surfaces ... VALUABLE-PARTIAL", noting "most are
  untested UI tweaks".
- Full-workspace grep for "suppressHydration" across *.test.* files: zero hits.
  No test anywhere in ~/workspace references or asserts the line.

Per the prelaunch register's own rule (Gap 3): "It rides the floor: if the floor
is reinstated and the one-liner is untested, it gets a test or it goes." Status
as observed: untested. Whether it stays or goes is a writer/owner decision, not
this lane's; this lane only reports the test-pinning fact.

---

## Commands run (evidence log)

- ls of ~/workspace/ping-24h/, prelaunch/, forest-convergence/, sprint/h00-02/
- Read AGENTS.md (~/workspace/AGENTS.md) per runtime house rules
- grep "195" across prelaunch/*.md, SPRINT_100H_PRIORITIES.md, SPRINT_100H_QUESTIONS.md,
  builder-harvest/TRACK_C_STATUS.md, builder-harvest/BUILDER_DECISION_MATRIX.md
- grep HOLD/reconcile/f01/classifyUnknown in 02-SEMANTIC-ASSET-REGISTER.md; read
  sections 9-14; checked 03-DO-NOT-REIMPLEMENT-REGISTER.md entries
- Read ~/workspace/f01-fix/HOLD_REAPER_EVIDENCE.md (head) and grepped
  mission_runtime.js for status/retry_eligibility/effect_count/outcome vocabulary
- Grepped suppressHydrationWarning in laneB13 dirty-tree.patch and laneB15 report
- Workspace-wide grep for "suppressHydration" in *.test.* files: zero hits
- Confirmed /home/nolan/projects/ping unreachable from this sandbox

## Open items for the parent / GO

1. T-06 runner: the corpus is fixture-only by design; T-06 must write the runner
   that executes f01, S5, and classifyUnknownExecution against the eight fixtures.
2. T-19 deliverables still open: floor inventory, the rerun runbook with the exact
   test command + scope, and the gate definition. This lane could not produce them
   because the canonical tree is unreachable here and no artifact records the command.
3. The suppressHydrationWarning one-liner remains unattributed dirty work with no
   pinning test; per Gap 3 it needs a test or removal when the floor is reinstated.
   Do not commit or revert it from this lane (read-only).
