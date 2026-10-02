# SECURITY CRITIQUE — ORCA FINISH PROGRAM
**Lane:** CRITIC-SECURITY. **Date:** 2026-09-23 ~20:05-21:30 MDT. **Posture:** read-only, no commits, no production writes. NIGHT SHIFT + YOLO MODE in force.
**Evidence grades:** STATIC (read source) / TEST (ran code) / LIVE (witnessed). All findings below are STATIC unless marked otherwise.
**Deconfliction:** W2-REDTEAM owns code attacks on W2-IMPL-STATE/W2-IMPL-SAFETY (their planned A6/E2 attacks on the run record are NOT yet run; my F2 is a static assessment of ORCA-A's verdict, not an exploit, no duplication). Agent 19 owns conclusion falsification; I touch security-relevant claims only.

## Verdict scale
KILLED (counter-evidence) / SURVIVED (withstood attack) / WEAKENED (partially undermined) / LATENT (real shape, not wired live) / LIVE (exploitable in current wiring).

---

## F1 — P-7: startAutonomousLoop fabrication via LIVE unauthenticated endpoint — LIVE

DOMAIN / security / fabrication surface.
COMPONENT / `ping-runtime/orchestration/execution/engine.js` startAutonomousLoop (579-648) + `gateway/routes/orchestration.js` POST /orchestration/engine/loop (272).
CLAIM (C5 PHANTOM-HUNT P-7) / startAutonomousLoop fabricates mission resolutions inline (hardcoded confidence 0.85, fabricated finding {file: mission.target || 'x', line: 0, bypass_type: 'auto_scan'}) then runs REAL consensus over them; exposed live via POST /orchestration/engine/loop; engine is wired into production (gateway_runtime.js:339) and deliberately parallel non-executing per DOC-CONTRACT.
EVIDENCE / STATIC (verbatim source read on working tree /home/nolan/ping @ cc6856c3b via read-only Pig exec): the fabricated `output` object literal is present exactly as quoted; `collectWorkerOutput` is called with it; route handler passes body-controlled maxIterations/minPriority/missionsPerIteration straight through.
CALLER / any HTTP client. CALLEE / ExecutionEngine.startAutonomousLoop -> collectWorkerOutput -> ConsensusEngine.evaluate -> artifact authorities -> MergeGate.
WRITER / engine.js author (inline mock never removed). READER / dashboard/report consumers, GET /orchestration/* readers.
AUTHORITY / none — fabricated outputs carry no provenance marking (no `synthetic:true`, no verified-vs-claimed grading).
CLASSIFICATION / LIVE (C5's classification stands; my independent read confirms every load-bearing element).
CONFIDENCE / 0.95.

### Who can hit the endpoint
- Gateway binds `0.0.0.0` on `process.env.PORT || 8080` (gateway/server.js). Reachable by any network client that can reach the port.
- **No authentication at any layer I checked:** app-level middleware is CORS-only (`Access-Control-Allow-Origin: *`, gateway_runtime.js:117-125); the `/orchestration` router is mounted with no auth wrapper (gateway_runtime.js:793); route handlers use `asyncHandler` which does request logging only (gateway/route_middleware.js). No bearer check, no role check anywhere on this path.
- Sibling endpoints share the exposure: POST /orchestration/missions (submit arbitrary missions), POST /orchestration/missions/:id/output (submit arbitrary "worker output" for any mission with a caller-chosen workerId, no worker identity verification), POST /orchestration/engine/git-diff (emit arbitrary diff -> mission compilation). The fabrication surface is the whole router, not one endpoint.
- The endpoint also accepts `maxIterations` from the request body, so an unauthenticated caller can dial the fabrication volume arbitrarily (cheap dashboard metric inflation).

### What downstream consumes the "resolutions"
1. `collectWorkerOutput` -> proposal artifact persisted to disk (`ping-runtime/orchestration/artifact_store/`, ArtifactStore._persist -> writeFileSync).
2. `_resolveMission` -> real `ConsensusEngine.evaluate` over fabricated outputs -> `mission.status='completed'`, `mission.consensus` -> consensus artifact persisted -> events `consensus_reached`, `merge_decision_created`, `mission_accepted` emitted on the engine's EventQueue, which **persists every event to disk** (`ping-runtime/orchestration/event_queue/`, `_persist` on emit, `_load` on construction — fabrication survives restarts).
3. Dashboard: `closureRate` / `missionClosureRate` computed over fabricated completions; served by GET /orchestration/engine and /engine/report. The 2026-09-18 forensic ("dashboard closure outputs synthetically fabricated") is re-confirmed live in current source.
4. MergeGate: `can_commit` is advisory only (merge_gate.js:185-186 logs BLOCKED/PASS; no auto-commit path found; grep shows execSync only for `git diff --name-only`). Fabricated findings cannot trigger code changes. Contained here.
5. `WorkerStateMachine.recordFix/recordFinding/recordPattern` and registry `recordQuality/recordConfidence/recordAcceptance` are fed fabricated 0.85 confidences, poisoning worker quality scores.

### Can fabricated findings enter any canonical record?
- **ping_events / unifiedEventRuntime: NO.** engine.js has zero references to the canonical event runtime; the engine's EventQueue is a private, separate plane. The canonical journal is not contaminated by this path.
- **Repo-local durable evidence: YES.** `event_queue/` and `artifact_store/` under `ping-runtime/orchestration/` are presented as evidence (proposals, consensus artifacts, "replay proofs") and reload on restart. A consumer reading those files cannot distinguish fabricated from real; nothing marks the outputs synthetic.
- **Dashboard: YES.** Closure metrics served as if real.
- Verdict on the sub-claim "fabricated findings can enter canonical records": WEAKENED in the strict sense (canonical journal clean), UPHELD in the operational sense (durable evidence store + dashboard contaminated; both are trust surfaces). Precision: the contamination boundary is the ORCA engine's private plane, not the PING spine journal.

### Required fix
Delete the synthetic self-resolution block and the `/engine/loop` endpoint (C5's CLASSIFY: DELETE stands); or gate the whole `/orchestration` router behind the gateway's bearer auth AND mark any synthetic output with explicit provenance (`synthetic:true`, `verified:'none'`) excluded from closure metrics. Minimum: auth on the router.

---

## F2 — ORCA fencing epochs are detect-not-prevent; transitionRun/checkpointRun skip epoch checks — LATENT

DOMAIN / security / fencing & authorization.
COMPONENT / W2-IMPL-STATE `orca_run_record.js` (branch orca-finish/state; source copy read at ~/workspace/orca-finish/program/orca-a/src/orca_run_record.js).
CLAIM (ORCA-A Record 6, probe H4) / claimRun refuses stale epochs, but transitionRun and checkpointRun perform no epoch/holder check, so a stale holder can act without refusal; fencing is detect-not-prevent.
EVIDENCE / STATIC: `claimRun` checks `run.lease.fencing_epoch !== expectedEpoch` -> `{ok:false, reason:'stale-epoch'}`; `transitionRun(rt, dataRoot, objectiveId, runId, event)` and `checkpointRun(rt, dataRoot, objectiveId, runId, stateSnapshotRef)` take no holderId/epoch and perform no check; docstrings defer to caller discipline ("the caller MUST hold the coordinator advisory lock ... this module does not acquire it and will not guess").
CALLER / (future) coordinator. CALLEE / run record file. WRITER / stale coordinator process. READER / reconciler / assessor.
AUTHORITY / PG advisory lock (external, not enforced by module).
CLASSIFICATION / LATENT (CONFIRMED as mechanism; NOT exploitable in production today: zero production callers, ORCA-A Record 2 caveat stands).
CONFIDENCE / 0.9.

### Exploitability assessment
- **Today: none.** The module is unwired. Grading this a live P0 would be false.
- **If wired as-is:** the stale-holder scenario is the realistic one, not a race: coordinator loses the advisory lock (session drop, or a new coordinator claims after lease expiry) but keeps running its JS loop and keeps calling transitionRun/checkpointRun. Those calls are never refused; the stale-epoch check exists only on the claim path the stale holder never re-invokes. A superseded coordinator can: mark the run SUCCEEDED/FAILED/CANCELLED out from under the live coordinator, SUSPEND a running run, RETRY a FAILED run into re-queue, and via checkpointRun point `state_snapshot_ref` at an arbitrary string (the "content-addressed" property is conventional, never validated on write), poisoning the resume point a recovery path would trust.
- **"Detectable" is overstated (WEAKENED):** writes carry no writer identity and no epoch, so a later reader sees an unexpected status/version with the lease block naming the current holder — an anomaly, but no alarm fires, no attribution exists, and no reconciliation/alerting path exists in the module. Detection requires the live coordinator to actively notice and correctly attribute. The docstring claim ("a stale holder's late writes are detectable") survives only in the narrow forensic sense, not operationally.
- **Compounding:** claimRun's CAS is read-check-write on the file substrate and provably loses updates under true concurrency (ORCA-A Record 9, H3b). The one existing check collapses exactly when two writers are live. The design's single point of failure is the advisory lock; Record 8's honest limit (no TTL; wedged-but-connected holder blocks forever) is precisely the scenario where the fence fails AND stale writes matter. The two limits multiply.
- **Exact fix (before wiring, not after):** thread holderId+expectedEpoch into transitionRun/checkpointRun and refuse on mismatch (fail closed); record writer identity + epoch on every write; validate state_snapshot_ref as a digest of content at the recovery read path (or require epoch on the write path). Do not copy the non-atomic CAS shape for any multi-writer future (HS-4 already specifies atomic WHERE-clause enforcement for the PING side).

---

## F3 — PING complete() stale-worker ABA: zombie's late complete() accepted, result overwritten, canonical event emitted — LIVE

DOMAIN / security / authorization & integrity of canonical writes.
COMPONENT / mainline /home/nolan/ping @ cc6856c3b `ping-runtime/orchestration/mission_runtime.js` complete(), renewLease(), fail(), reapExpiredLeases().
CLAIM (ORCA-A Record 5/6, probe H12a; C3 independently confirmed) / complete() checks status only (no holder, no epoch); a stale worker's late complete() against a reaped-and-reclaimed mission is accepted and overwrites the result.
EVIDENCE / STATIC (source copy read): `complete()`: `UPDATE ping_missions SET status='completed', result=$1, completed_at=NOW() WHERE mission_id=$2 AND status='running'` — no assigned_to, no epoch; on rowCount==1 emits MISSION_COMPLETED into the event runtime. `renewLease()`: no holder check — any caller can extend any mission's lease. `fail()`: no holder check. `reapExpiredLeases()`: resets to created with no epoch bump (no epoch column exists, H11e).
CALLER / worker (in-process today). CALLEE / ping_missions row. WRITER / stale/adversarial worker. READER / mission control, dashboards, downstream consumers of MISSION_COMPLETED.
AUTHORITY / the ping_missions row (status predicate only — insufficient).
CLASSIFICATION / LIVE (wired production code on mainline).
CONFIDENCE / 0.9 (two independent lanes converged: ORCA-A H12a, C3).

### What an adversarial worker can do
1. **Result overwrite (integrity):** A claimed by worker A -> lease expires -> reaper resets to created -> worker B claims (running) -> stale A calls complete(M, fabricated). The UPDATE matches; the canonical result becomes A's fabrication. If B completes first, A's late complete overwrites B's. Either ordering: last-writer-wins among overlapping workers, with zero provenance distinguishing them. complete() then emits MISSION_COMPLETED with the fabricated result into the canonical event runtime — the fabrication enters the canonical record attributed to mission-runtime, indistinguishable from legitimate.
2. **Lease pinning (availability):** renewLease has no holder check, so any process with pool access can renew any mission's lease indefinitely, defeating the reaper. Combined with the hung-worker hole (dispatch awaits with no timeout; Arrow 0 renews _processing missions every poll), a mission can be pinned in running forever. Trivially exploitable DoS on mission progress.
3. **Failure injection:** fail() accepts status in (running, assigned, retry_pending) with no holder check — a stale worker can fail a mission owned by someone else, driving it into retry/exhaustion paths.
4. **Unvalidated result payload:** `result` is arbitrary worker-supplied JSON stored verbatim; no verified-vs-claimed grading (same class as redteam BR-A3 on the ORCA branch). Downstream reads it as truth.
### Threat-model bound
Workers are in-process today (ORCA-A Record 10), so the "adversarial worker" requires code execution in the gateway process or DB pool access — this is a defense-in-depth failure / insider-threat surface, P1 integrity on a live canonical write path, not a remote-exploitable RCE. It becomes P0 the moment workers move out-of-process (the stated direction). The mission ledger currently offers no provenance, no holder binding, and no anomaly signal — the exact properties HS-4 (lease_epoch in WHERE clauses, reaper bumps epoch) is designed to add. HS-4 should also add holder check on renewLease (WHERE assigned_to = $holder) and a completed_by/provenance column.

---

## N1 — ORCA coordinator advisory lock has no TTL (availability note, not integrity)

Per ORCA-A Record 8 (H9d): the PG advisory lock on the dedicated client has no TTL and no heartbeat. A wedged-but-connected coordinator holds the lock forever; there is no takeover path — crash-only recovery. The ORCA control loop halts indefinitely. This compounds F2 (the wedged holder is the stale-writer scenario). U2 (wedged-holder policy) needs Nolan's call; do not build a break-glass without it.

---

## Attack log

| # | Target claim | Attack | Verdict |
|---|---|---|---|
| 1 | P-7 "live fabrication surface, worse because wired" | Verified wiring (gateway_runtime.js:339 init, :793 mount, no auth at any layer, 0.0.0.0:8080), traced downstream to disk-persisted artifacts/events + dashboard | SURVIVED (confirmed; endpoint also takes attacker-controlled iteration counts; sibling routes equally exposed) |
| 2 | P-7 sub-claim "fabricated findings enter canonical records" | Traced event plane: engine EventQueue is private, zero refs to unifiedEventRuntime/ping_events in engine.js | WEAKENED (canonical journal clean; repo-local evidence files + dashboard contaminated instead) |
| 3 | ORCA-A-1 "fencing is detect-not-prevent" | Source read: claimRun checks epoch; transitionRun/checkpointRun do not; writes carry no writer identity | SURVIVED as mechanism; exploitability LATENT (zero callers). Docstring "detectable" claim WEAKENED (no alerting/attribution path) |
| 4 | ORCA-A-2 "stale-worker ABA in complete()" | Source read: status-only WHERE, holder-less renew/fail, no epoch column, MISSION_COMPLETED emitted on accept | SURVIVED (confirmed; C3 convergence raises confidence). LIVE on mainline |
| 5 | "MergeGate could execute from fabricated findings" | Grep merge_gate.js: can_commit advisory, execSync only for git diff listing | KILLED (no code-execution path) |
| 6 | "Engine events bridge to canonical journal" | Grep engine.js for event runtime / ping_events refs | KILLED (no bridge; separate plane) |

## Open security findings (repros in F1-F3 above)
- F1: unauthenticated POST /orchestration/engine/loop (and sibling routes) fabricates consensus-backed mission resolutions persisted to disk + dashboard. Repro: `curl -X POST http://<gateway>:8080/orchestration/engine/loop -d '{"maxIterations":10}'` with no credentials; then GET /orchestration/engine shows inflated closureRate.
- F2: latent; becomes P1-integrity if orca_run_record.js is wired without epoch-gated writes. Repro shape: claim with holder B (epoch n+1), then call transitionRun as holder A (epoch n) — succeeds silently.
- F3: live ABA on ping_missions. Repro shape (scratch DB): A claims M; expire lease; reaper resets; B claims; A's complete(M, forged) accepted, row shows A's result, MISSION_COMPLETED emitted.

## Follow-on queue
- Re-verify F1 fix if the /orchestration router gains auth or the loop endpoint is deleted.
- Audit each new impl landing (W2-IMPL-STATE / W2-IMPL-SAFETY) for the F2 fix (epoch on write paths) before wiring.
- Probe tenant isolation on the run record when claimed (`tenant_id` carried, single-tenant loop — claim honesty).
- Hunt the next projection seam (XSS-class seams in FYD /o page remain open per task brief).
