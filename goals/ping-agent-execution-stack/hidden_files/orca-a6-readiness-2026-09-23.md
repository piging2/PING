# Orca A6 Readiness + Boundary Check — 2026-09-23

Investigator: subagent (Jev/Orca forensics lane). Method: read-only. Pig-side git log/diff/show, file reads. Worktree `/home/nolan/worktrees/orca-autonomy`, branch `feature/orca-autonomy` @ `ae55b77ff`, **clean tree confirmed** (git status --short empty before and after). No commits, no pushes, no modifications. The frozen Jev candidate (`fffe99f7a`) was not touched.

## (a) Is A6 still the coherent next?

**Yes, but its form changed from "implement" to "witnessed re-proof."** The three commits since the A5 audit (2026-09-18 ~08:25 MDT) are:

1. `6a342dd27` (Sep 18 10:52 MDT) — "durable objective identity, crash-safe dispatch rendezvous, startup reconciliation." This IS the A6 implementation: it directly answers all four minimal requirements in section 8 of the A6 FAIL proof (`a6-restart-proof-2026-09-18.md`): SHA-256 durable objective/workorder IDs (no PID/clock/run-id), attempt recorded before spawn, atomic rendezvous JSON, `reconcileStartup()` before any dispatch, PG advisory lock for one active coordinator per objective, durable budget/cancellation. Its own commit message is honest about the gap: "T5 real exclusion and full T1/T9 untested (no PG creds / no Windows worker available to auditor); reported as untested, not passing."
2. `479d310d6` (Sep 18 12:02 MDT) — canonical event identity in `UnifiedEventRuntime.emit()` (convergence; PING-side, not A6).
3. `ae55b77ff` (Sep 18 12:05 MDT) — `EventRepository.project()` as derived audit/projection adapter (convergence; PING-side, not A6).

Timeline sanity: A6 FAIL test ran 08:32–08:39 MDT → proof doc 08:55 MDT → hardening analysis commits → `6a342dd27` fix 10:52 MDT. The fix postdates the FAIL it claims to fix. Nothing in the two convergence commits obsoletes or redirects A6.

**Coherent next step:** re-run the witnessed kill-and-restart proof (SIGKILL the loop mid-dispatch, relaunch with no arguments) against `6a342dd27`, grading the same eight criteria (a)–(h). The expected deltas vs the FAIL run: (a) rediscovery via durable objective key, (b) state reconstruction, (d) no duplicate work_order_id, (g) resume-at-attempt-2. (c) and (f) should remain PASS. This is a test execution, not new implementation.

## (b) Boundary check — constitutional rule of one

**Verdict: no competing authority. The boundaries are explicit and non-overlapping.** File + function mapping:

| Decision | Owner | File + function | Orca's posture |
|---|---|---|---|
| Verdict-class admission (who may assert REPLAY_COMPLETED / WITNESS_CREATED / WITNESS_REJECTED / LINEAGE_CREATED / JEV_DECISION_EVALUATED) | Jev candidate | `ping-runtime/events/unified_event_runtime.js` `_assertVerdictAuthority()` + `VERDICT_PRODUCERS` | **Never emits any of these types.** Only mentions are reads in `orca/control-loop/evidence/run-*/01-observe.json` (the loop observes PING's chain; it does not mint it). Verified by grep: zero emit paths. |
| Replay precedence / witness authority binding | Jev candidate | `ping-runtime/workers/canonical_workers.js` (ReplayWorker/WitnessWorker) | Orca never calls `ReplayWorker`, `WitnessWorker`, `startAutonomousLoop`, and never sets `allowPayloadTranscript`. Zero references in `orca/control-loop/*.js`. |
| Autonomous-loop gating | Jev P0 (dirty, worktree) | `gateway/routes/orchestration.js` + `engine.js` | Orca's "loop" is its own observe→delegate→verify→close process; it does not invoke `ExecutionEngine.startAutonomousLoop`. |
| Canonical event identity (how IDs are derived) | PING spine (shared) | `UnifiedEventRuntime.emit()` | Orca convergence `479d310d6` routes identity through the existing `IdentityAuthority.generateId → CanonicalBytes.serialize → CanonicalAuthority.hashBytes`; identity material explicitly unchanged. Different concern from Jev's admission check in the same function; they compose. |
| Worker-result recording | Orca (as producer, not authority) | `ping-runtime/external-agent/external_agent_adapter.js` `recordVerifiedResult()` | Emits only `WORKER_COMPLETED`/`WORKER_FAILED` with source `'worker-runtime:external-agent-adapter'` — not verdict-class, passes Jev's admission gate untouched. The file documents: "Event identity: the adapter holds NO event-identity implementation. Single authority: UnifiedEventRuntime.computeEventId (the spine)." |
| Audit projection | Orca (as derived adapter) | `runtime/kernel/event_repository.js` `project()` | Explicitly "DERIVED audit/projection adapter, not a canonical event authority"; fails closed without an accepted canonical event; writes to its own `repository_events` table; `WitnessHash`/`ReplayHash` left NULL — "projections do not mint witnesses (witness authority is separate and deferred)" (OPERATING_SPEC.md). |
| Result acceptance / prohibitions | Orca (internal policy) | `orca/control-loop/orca_control_loop.js` `gateResultAcceptance()` (:466), `enforceProhibitions()` (:437) | Internal gates writing to the loop's own evidence dir; no PING events emitted. |

Written boundary already exists: OPERATING_SPEC.md records "[DECISION] (operator, 2026-09-18) UnifiedEventRuntime is the SOLE canonical event authority... No new authority created... No competing identity authority." The one gap: no explicit sentence stating the Orca loop will never emit verdict-class event types or implement verdict admission. That sentence belongs in OPERATING_SPEC.md (documentation, not code).

**Merge-sequencing note (not an authority conflict):** both the Jev candidate and Orca `479d310d6` modify `UnifiedEventRuntime.emit()` — Jev inserts the admission check (~line 183), Orca replaces the eventId derivation (~line 82). Adjacent but non-overlapping lines; a future merge of both branches should re-run the emit/admission/identity suites rather than assuming clean auto-merge.

## (c) Recommendation

**Keep separate with the written boundary. Do NOT sequence A6 after the Jev promotion decision.**

- The boundary is verified non-overlapping at file+function granularity; no convergence work is needed.
- A6's remaining work (witnessed re-proof of `6a342dd27`) touches only `orca/control-loop/` and its evidence dirs — it does not depend on the Jev candidate's verdict admission, does not modify the candidate's files, and its events (`WORKER_COMPLETED`/`WORKER_FAILED`) pass through the admission gate either way. Waiting for Nolan's promotion decision would stall independent work for no architectural reason.
- Add the one missing boundary sentence to OPERATING_SPEC.md (Orca never emits verdict-class types; verdict admission belongs to UnifiedEventRuntime). Documentation-only; safe to do in the Orca workstream without touching the frozen candidate.
- When either branch merges to main, the second merger re-runs `test_production_bootstrap_load.js`, `test_canonical_event_identity.js`, and the witness/verdict suites to confirm the two `emit()` changes compose.

## Confidence

High on the boundary mapping (every claim above is a read-off from diffs and code, with the clean-tree and frozen-candidate constraints honored). Medium on A6 re-proof outcome — `6a342dd27`'s own author flagged T1/T9 untested, so the witnessed run is a genuine falsification attempt, not a victory lap.
