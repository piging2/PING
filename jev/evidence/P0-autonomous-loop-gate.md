# JEV PATCH EVIDENCE RECORD — P0: Autonomous loop safety gate

Date: 2026-09-22. Worktree: /home/nolan/ping/worktrees/jev-surgical @ cc6856c3b (clean, detached).
Status: VERIFIED.

## PROBLEM
`ExecutionEngine.startAutonomousLoop` synthesizes worker findings with hardcoded
confidence 0.85 (`{file: mission.target || 'x', line: 0, bypass_type: 'auto_scan',
confidence: 0.85}`) and feeds them into `collectWorkerOutput`, which produces
proposal artifacts, records worker findings/quality, and drives
`ConsensusEngine.evaluate` + mission resolution. The dashboard then reports
"missions resolved". Reachable via `POST /orchestration/engine/loop` on the live
gateway with ZERO authentication (no middleware on the /orchestration mount,
`asyncHandler` is logging-only, gateway listens on 0.0.0.0, engine initialized
unconditionally in boot). Worse than the archaeology's "one auth check" claim:
there is no auth check at all.

## SOURCE EVIDENCE
- ping-runtime/orchestration/execution/engine.js:579 `startAutonomousLoop` —
  hardcoded `findings` + `confidence: 0.85`, fed to `collectWorkerOutput` (line 621).
- engine.js:243 `collectWorkerOutput` → `_proposalAuthority.produce()`,
  `_stateMachine.recordFinding()`, `_registry.recordQuality/recordConfidence()`,
  `_resolveMission` → `this._consensus.evaluate(mission, outputs)`.
- gateway/routes/orchestration.js:272 `router.post('/engine/loop', ...)` — no auth.
- gateway/bootstrap/gateway_runtime.js:337-344 engine init; 792-794 `/orchestration`
  mount with no auth middleware; 820 `listen(port, '0.0.0.0')`.
- gateway/route_middleware.js:19 `asyncHandler` = logging wrapper only.

## LIVE REACHABILITY
Confirmed from current source (worktree @ cc6856c3b, same HEAD as archaeology).
Live boot initializes the engine and mounts the route unconditionally.

## WHY THIS PATCH
Nolan's directive P0: implement the SMALLEST safe gate — disabled by default,
explicitly opt-in, clearly marked experimental, cannot be mistaken for
evidence-backed autonomous improvement. Do NOT delete ExecutionEngine; preserve
ConsensusEngine/MergeGate/IntelligenceGraph/DormantClassifier for salvage.

## FILES TOUCHED (37 insertions, 0 deletions)
- ping-runtime/orchestration/execution/engine.js (+27):
  constructor `_autonomousLoopEnabled = false`; `initialize()` reads explicit
  opt-in `PING_EXPERIMENTAL_AUTONOMOUS_LOOP=1`; new `enableAutonomousLoop()` /
  `disableAutonomousLoop()` / `isAutonomousLoopEnabled()`; gate at top of
  `startAutonomousLoop` refuses with warning + `[]` when disabled.
- gateway/routes/orchestration.js (+10): `POST /engine/loop` returns
  403 `AUTONOMOUS_LOOP_DISABLED` (experimental:true, disabledByDefault:true)
  when the engine reports disabled.

## AUTHORITY BEFORE
Any network caller could trigger fabricated-confidence "autonomous improvement"
cycles indistinguishable from evidence-backed ones.

## AUTHORITY AFTER
Loop runs only after explicit opt-in (env var or programmatic call). Default
deployments refuse at both the route and engine layers.

## PERSISTENCE EFFECT
None. No schema, no event, no state changes. In-memory flag only.

## REPLAY EFFECT
None. The engine universe does not write to ping_events; the patch changes no
canonical path.

## SECURITY EFFECT
Closes unauthenticated remote trigger of fabricated-confidence consensus cycles.
When opted in, the route still carries whatever gateway-level auth exists (none
today — the 403 gate is the boundary, and opt-in is the operator's explicit
choice).

## ROLLBACK
Revert the two files (`git checkout -- <files>` in the worktree; no commits made).
No state to clean.

## TEST
- `node --check` on both files: OK.
- Gate unit test: default `isAutonomousLoopEnabled()` false; `startAutonomousLoop()`
  returns `[]` with refusal warning; enable→true, disable→false.
- Route test (express harness, real route module): disabled → 403
  AUTONOMOUS_LOOP_DISABLED; enabled → 200 with results passthrough.
- Env opt-in: `PING_EXPERIMENTAL_AUTONOMOUS_LOOP=1` + full `initialize()` →
  enabled true; full engine subsystem init completes ("[ExecutionEngine] Ready").

## FALSIFICATION CONDITION
If a caller can execute the loop's fabricated-confidence path without explicit
opt-in (env or API), the gate is broken. If any canonical event/mission path
behaves differently with the patch applied, the patch overreached.
