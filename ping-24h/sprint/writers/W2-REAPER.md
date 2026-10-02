# W2-1 REPORT: f01 narrowed reaper predicate ported into the reached mission runtime

## VERDICT: DONE. The narrowed reaper predicate is ported, proven, and replayed.

The reached ce002 reaper no longer resets a possibly-executed mission to
`created` on lease expiry. Fixture-02 hostile outcome is closed at the reaper
seam; the legitimate never-started reclaim case is preserved; the T-06 24-cell
scorecard is byte-identical (20 CORRECT / 1 INCORRECT / 3 INAPPLICABLE, the one
INCORRECT being the known f01 x fixture-06 zombie window, explicitly out of
scope for this task). Clean-checkout replay from the pristine base reproduces
the fix. Zero implementation value lost: the canonical ce002 tree was never
written.

## Semantic unit

U3 HOLD/reconciliation/recovery, REAPER SEAM ONLY. Register items 03#5 (f01
narrowed reaper is the listed winner for this seam), 03#6 (attempt fencing,
separate seam), 03#7 (recovery, separate seam). Nothing in this task touches
tenant authority, ContextPack, decision records, projection, identity, FYD,
HOLD wiring (parkHold), the stuck-running watchdog, or dispatch.

## Base pin (re-observed 2026-09-28 ~19:45 MDT, before any change)

- Repo root: /home/hatch/workspace. HEAD 310ce509d3ae1c3bf7b6bae250ae2f74bee65777.
  Branch: security/secret-redaction-2026-09-28. Pre-existing workspace dirt
  (unrelated lanes); ce002/ itself is UNTRACKED in git (scratch mirror dir),
  md5 1d505034d5a122cf4732b360b7fb27bb at pin time and unchanged after my work.
- Reached runtime: the Pig is reachable (pigwsl SSH OK). No standalone
  mission_scheduler process is running on the Pig right now; per the task's
  fallback rule the registered reached path applies. Live verification inside
  the ping-gateway container (docker exec): /app/ping-runtime/orchestration/
  mission_runtime.js lines 277-285 carries the WIDE predicate
  `WHERE status IN ('running', 'assigned') AND lease_until IS NOT NULL AND
  lease_until < NOW()`, shape-identical to ~/workspace/ce002/src/
  mission_runtime.js lines 482-490 (the lane B finding and register 02#11
  "MissionScheduler 5s poll"). The reached runtime IS the ce002 code shape,
  and it still carries the hostile wide reaper today.
- The reached runtime has NO HOLD record path (zero "hold" hits in ce002/src),
  no retry_eligibility column, and a dead unused require of
  ../authorities/constitutional_time_authority.js inside create() (pre-existing
  quirk in the ce002 mirror; the required module is never called).

## Search-first record (register procedure followed)

- 03#5 locations searched: f01-fix/mission_runtime.js:361-385 (WINNER for this
  seam per G-T06: 21/21 + 23/23 suites, corpus-proven); ce002/src/
  mission_runtime.js:482-490 (reached, wide, the defect); tenanos-wave/
  swarm-18/live-mission_runtime.js, convergence-zoom-2026-09-19 lane-d, and
  tenanos-wave/swarm-09 c3-mission_runtime.js (wide duplicates, not reached);
  pig-transfer-tmp/mission_runtime.js (narrowed pre-fix, superseded).
- Decision: ADAPT. Port f01's narrowed WHERE predicate into ce002's module
  shape. f01's SET clause carries `retry_eligibility = TRUE`; ce002's schema
  has no such column, so the SET clause stays ce002's own. No new code built;
  the smallest change that closes the reached edge.

## Diff summary (the complete change)

File: ce002-port/src/mission_runtime.js (isolated work copy; canonical tree untouched).
Patch saved at: [w2-reaper.patch](sandbox://workspace/ping-24h/sprint/writers/w2-reaper/w2-reaper.patch)

```
-       WHERE status IN ('running', 'assigned')
+       WHERE status = 'assigned'
+         AND started_at IS NULL
          AND lease_until IS NOT NULL
          AND lease_until < NOW()
```

Plus the doc comment updated to state the narrowed semantics ("A mission that
reached 'running' MAY have produced an external effect, so lease expiry NEVER
turns it back into `created`"). SET clause byte-identical to before. node
--check passes on the ported file.

## Targeted test evidence (harness/h-ce002.js, HARNESS ONLY)

Drives the REAL ce002 MissionRuntime (work copy) with a SQL-text-driven
FakePool and controllable clock. Predicate cells, AFTER the port:

- assigned+started+expired lease: NOT reaped, stays 'running' (the fix)
- assigned+never-started+expired lease: reaped to 'created' (legitimate case preserved)
- assigned+started+live lease: untouched
- assigned+never-started+live lease: untouched
- created+no lease: untouched

Result: ALL CORRECT (5/5 cells).

## Hostile corpus results (T-05 fixture-02, before vs after)

BEFORE (unchanged ce002 code, md5-verified identical to canonical):
fixture-02 INCORRECT. The reaper reset the started mission (worker invoked,
effect UNKNOWN, lease expired) to 'created': "HOSTILE reaper reset a
possibly-executed mission to 'created' (reaped=1, status=created), an
automatic retry of an unknown-outcome mission." Targeted cells INCORRECT on
the assigned+started+expired cell. The reached edge from lane B is reproduced
against the real implementation, not asserted.

AFTER (narrowed predicate): fixture-02 CORRECT. Started row stays 'running'
with started_at preserved (surfaced for HOLD/reconciliation, never silently
re-dispatched); never-started control reclaimed to 'created'; live-lease row
untouched.

## T-06 24-cell scorecard: NO REGRESSION

Re-ran node run-corpus.js (the untouched T-06 runner, driving f01/S5/
classifyUnknownExecution, none of which this task modifies):

```
impl\fixture | f01 | f02 | f03 | f04 | f05 | f06 | f07 | f08
f01         | C   | C   | C   | C   | C   | X   | C   | C
s5          | C   | C   | C   | C   | C   | C   | C   | C
classify    | C   | C   | C   | C   | -   | -   | -   | C
tally: {"CORRECT":20,"INCORRECT":1,"INAPPLICABLE":3} | cells: 24
```

results.json diffed against the pre-run baseline: the ONLY difference is the
generated_at timestamp. All 24 cells identical. The single INCORRECT (f01 x
fixture-06 zombie window) is the known open item explicitly NOT owned by this
task (needs attempt fencing, separate seam). results.json was restored to the
baseline copy afterward.

## Clean-checkout replay evidence

1. Fresh copy of the ORIGINAL canonical ce002 file (md5 1d505034d5a122cf4732b360b7fb27bb,
   verified identical to the pinned base) into replay/src/.
2. Applied w2-reaper.patch with patch(1): applied cleanly, result md5
   74cebb1d4bea47020a2e31103a16465e, byte-identical to the work-copy port.
3. Ran the harness with W2_IMPL pointed at the replay copy: fixture-02
   CORRECT, all 5 targeted cells CORRECT, OVERALL ALL CORRECT.

The fix is reproducible from the pristine base via the recorded patch alone.

## Boundaries and open items (for the parent)

- This task ported the narrowed reaper ONLY. HOLD wiring (parkHold), the
  stuck-running watchdog, dispatch changes, and attempt fencing were not
  touched. Wire order per G-T06 stands: narrowed reaper first (this task),
  then HOLD wiring, then attempt fencing.
- The f01 x fixture-06 zombie window (zombie complete() during the
  SAFE_TO_RETRY re-attempt 'running' window) remains OPEN and is not owned
  here. Note: ce002 already mints an attempts-based fencing token on assign()
  (CE-002) and complete() gates on it; whether that closes the f06 window for
  the ce002 runtime is a falsification question for the fencing seam owner,
  not this task.
- NO deployment was performed. The live ping-gateway container on the Pig
  still runs the wide reaper; promoting this port to the reached runtime is a
  production-state change for the parent (and Nolan's word), not a writer
  action.
- Pre-existing ce002 mirror quirk (not fixed, not mine): create() requires
  ../authorities/constitutional_time_authority.js which does not exist under
  ce002/; the required binding is never used. The harness symlinks the real
  authorities dir read-only in the isolated copy only.

## Work artifacts (all under the assigned writers area)

- Report: this file.
- Isolated port: [ce002-port/src/mission_runtime.js](sandbox://workspace/ping-24h/sprint/writers/w2-reaper/ce002-port/src/mission_runtime.js)
- Patch: [w2-reaper.patch](sandbox://workspace/ping-24h/sprint/writers/w2-reaper/w2-reaper.patch)
- Harness (labeled HARNESS ONLY): [harness/h-ce002.js](sandbox://workspace/ping-24h/sprint/writers/w2-reaper/harness/h-ce002.js), [run-w2.js](sandbox://workspace/ping-24h/sprint/writers/w2-reaper/run-w2.js)
- Replay dir: [replay/](sandbox://workspace/ping-24h/sprint/writers/w2-reaper/replay/src/mission_runtime.js)
