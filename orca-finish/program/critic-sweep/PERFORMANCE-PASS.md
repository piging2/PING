# PERFORMANCE PASS (FRESH): CRITICS-SWEEP

**Critic:** CRITIC-PERFORMANCE (fresh pass) | **2026-09-24 ~05:35 MDT**
**Scope:** new artifacts only, produced since PERFORMANCE-CRITIQUE.md
(2026-09-24 03:26 UTC). Read-only. No em dashes used. Prior ceilings
(T1-T5) stand; this pass adds fresh data points and new hazards.

## PERF1. TEST-A6: the real worker consumed the full 180s dispatcher timeout

- DOMAIN: performance / COMPONENT: wave2/gauntlet TEST-A6 (attempt-2)
- CLAIM: recovery is responsive
- EVIDENCE: TEST. Attempt-2 ran the real Hermes worker via WSL interop;
  the worker produced zero output for the full 180-second coordinator
  timeout, then the coordinator SIGKILLed the dispatcher and emitted an
  honest failed envelope. Total TEST-A6 wall time was roughly 20 minutes
  for one objective across two attempts.
- CALLER: CRITIC-PERFORMANCE / CALLEE: W2-GAUNTLET-INFRA lane
- WRITER: W2-GAUNTLET-INFRA / READER: parent orchestrator
- AUTHORITY: GAUNTLET-RESULTS.md TEST-A6 record + checkpoint entry 20:05
- CLASSIFICATION: RECOVERY CORRECTNESS != RESPONSIVE RECOVERY. The six
  gates prove the recovery path is correct. They say nothing about speed:
  a hung real worker still costs the full timeout (180s here) plus
  reconcile and re-dispatch. At a 180s service time, the prior pass's
  ceiling formula gives min(180/180, 36) = 1 mission/min theoretical on
  the mainline scheduler, and that is before the hung-worker permanent
  stall (ceiling 0) which remains unfixed.
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: worker responsiveness (environmental Hermes hang;
  outside A6 scope)
- DEPENDENCIES: the 180s coordinator timeout, reconcileStartup() cost
- AFFECTS AGENTS: parent orchestrator (quota planning must budget
  timeout-scale service times, not happy-path times)

New data point for the ceiling table: real-worker timeout-scale service
time observed at 180s; recovery added reconcile + grading overhead on top.

## PERF2. Mainline hung-worker throughput defect: unchanged, re-corroborated

- DOMAIN: performance / COMPONENT: MissionScheduler (mainline
  /home/nolan/ping @ cc6856c3b)
- CLAIM: the hung-worker permanent stall is fixed or bounded
- EVIDENCE: STATIC + TEST. It is not. ORCA-B's hung-worker harness
  (TEST-PROVEN): hung worker leads to 3 missions running, _processing=3,
  4th mission never dispatched, 24 renewals, 10 reaps, 0 reclaimed. Agent
  19's wedge-test.js independently re-attacks the same mechanism against
  a copied scheduler source; its run result is not yet in a falsification
  record, so the corroboration is pending, not final. No dispatch timeout,
  no heartbeat, no renewal cap has landed in the source.
- CALLER: CRITIC-PERFORMANCE / CALLEE: mainline scheduler
- WRITER: n/a (standing defect) / READER: parent orchestrator
- AUTHORITY: ORCA-B VERDICTS.md + CHECKPOINT.md (T+65) ; agent19/probes/
  wedge-test.js (header claims, result unlogged)
- CLASSIFICATION: STANDING DEFECT, UNCHANGED. Sustained throughput under
  hung workers is still 0, permanently, from as few as 3 hung workers or
  1 poison mission type.
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: dispatch (no timeout), lease renewal (no liveness
  proof), reaping (skips in-processing)
- DEPENDENCIES: HS-6 (takeover) + HS-4 (fencing) as specified; both unbuilt
- AFFECTS AGENTS: parent orchestrator, H5 lane, impl-safety lane

The prior pass's follow-on item 1 (re-benchmark when a timeout/heartbeat/
cap lands) remains the trigger. Nothing has landed.

## PERF3. HS-6 "leave + alarm" can wedge a mission indefinitely

- DOMAIN: performance / COMPONENT: hs-6-takeover-liveness.md decision
  rule 2
- CLAIM: the takeover decision keeps the system moving
- EVIDENCE: STATIC. For `workerLiveness` in {alive, unknown}, the action
  is `leave` + `alarm`: "NEVER steal a possibly-live claim. The alarm must
  name the mission, the holder, and the lease age so an operator (or the
  HS-5 scheduler, once U2 is resolved) can decide."
- CALLER: CRITIC-PERFORMANCE / CALLEE: impl-safety-finish lane
- WRITER: impl-safety-finish / READER: parent orchestrator
- AUTHORITY: hs-6-takeover-liveness.md:30-33
- CLASSIFICATION: FAIL-CLOSED BUT UNBOUNDED. The decision is safe (no
  duplicate execution), but without HS-5 or a bound operator response
  time, a mission with an `unknown`-liveness holder sits forever: the
  lease keeps getting renewed (Arrow 0), the slot stays occupied, and
  throughput for that slot is 0. Unknown-liveness missions can accumulate
  without bound; there is no aging, no escalation timer, no forced
  resolution in the spec.
- CONFIDENCE: MEDIUM-HIGH
- BROKEN BOUNDARY: alarm-to-action (no bound, no owner until HS-5/U2)
- DEPENDENCIES: HS-5 scheduler (unresolved U2), operator availability
- AFFECTS AGENTS: impl-safety lane (spec needs an alarm aging/escalation
  rule before build)

Safety and liveness are in tension here and the spec chose safety. That
is the right default, but the performance cost must be named: every
`unknown` worker is a permanently occupied slot until something else
resolves it.

## PERF4. HS specs provide zero runtime throughput improvement

- DOMAIN: performance / COMPONENT: wave2/impl-safety-finish/stage-out/
- CLAIM: the safety layer improves recovery time or throughput
- EVIDENCE: STATIC. All specs are headered "SPEC ONLY. Not built, not
  wired, no production callers."
- CALLER: CRITIC-PERFORMANCE / CALLEE: impl-safety-finish lane
- WRITER: impl-safety-finish / READER: parent orchestrator
- AUTHORITY: spec file headers
- CLASSIFICATION: STATUS CLARIFICATION. The specs describe mechanisms
  that WOULD bound recovery (epoch fencing, takeover decisions,
  attempt-scoped identity). None runs. The T1/T2 ceilings and the
  hung-worker 0 are the live numbers until build + wire + test.
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: specification vs implementation
- DEPENDENCIES: build authorization, Pig transfer, PING-side work
- AFFECTS AGENTS: parent orchestrator (quota and schedule planning must
  use the live ceilings)

## PERF5. Kill-matrix throughput estimate validated by CHAOS-A's actual run

- DOMAIN: performance / COMPONENT: program/chaos-a/CHAOS-RESULTS.md
- CLAIM: the 4,500-packet quota needs ~3.6h serial (prior pass, computed
  from 2.9s/packet)
- EVIDENCE: TEST-BEH. CHAOS-A actually ran 1,531 logical missions through
  the serial runner in the night shift and completed the campaign. The
  runner is still serial (for loop, fcntl-locked SQLite). The measured
  campaign is consistent with the estimate's order of magnitude.
- CALLER: CRITIC-PERFORMANCE / CALLEE: CHAOS-A lane
- WRITER: CHAOS-A / READER: parent orchestrator
- AUTHORITY: CHAOS-RESULTS.md (180 records, 1,531 missions, mean conf 0.943)
- CLASSIFICATION: ESTIMATE CONSISTENT WITH OBSERVATION. The prior pass's
  follow-on item 5 (parallelize the runner before claiming nightly 4,500)
  stands: the campaign fit a night shift at 1,531, but 4,500 serial is
  still a multi-hour batch and the runner has not been parallelized.
- CONFIDENCE: MEDIUM-HIGH
- BROKEN BOUNDARY: serial runner (per-packet rate is fine; concurrency is
  the constraint)
- DEPENDENCIES: CHAOS-B queue (Q4: 10k storms will force the issue)
- AFFECTS AGENTS: parent orchestrator, CHAOS-B lane

## Throughput-ceiling table: fresh rows

| Mechanism | Ceiling | Evidence |
|---|---|---|
| TEST-A6 real attempt service time | 180s (full dispatcher timeout, zero worker output) | TEST |
| TEST-A6 wall for 1 objective, 2 attempts | ~20 min (incl. reconcile + grading) | TEST |
| HS-6 `leave`+alarm missions | 0 throughput per wedged slot, unbounded duration | STATIC |
| CHAOS-A campaign rate | 1,531 logical missions completed in one night shift, serial runner | TEST-BEH |

All prior-pass rows (T1 scheduler ceiling, T2 lease timings, T4 memory
index, T5 harness timings) stand unchanged. No lane asserted a new
numeric SLA in this window.
