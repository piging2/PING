# Agent 19 — FALSIFICATION RECORD

**Lane:** ORCA FINISH Agent 19 (independent critic / falsification). **Session:** 2026-09-24 ~05:07-05:45 MDT.
**Posture:** read-only on all repos/lanes; no commits; scratch harnesses only (in /tmp), never production.
**Evidence grades:** STATIC (source read) / TEST (ran code or git ops) / LIVE (witnessed live).
**Verdict scale:** KILLED (counter-evidence) / SURVIVED (withstood attack) / WEAKENED (partially undermined).
**Counts this record:** 11 findings — 7 SURVIVED, 2 WEAKENED, 2 KILLED.

---

## F1 — C5 wiring claim ("ExecutionEngine is initialized + HTTP-mounted, parallel non-executing")

- **DOMAIN:** orca-arch / execution wiring
- **COMPONENT:** gateway_runtime.js (engine init, /orchestration mount)
- **CLAIM:** The ExecutionEngine is initialized and HTTP-mounted (health, registration, status, dispatch); deliberately non-executing, not an "unwired island".
- **EVIDENCE:** STATIC (gateway_runtime.js:326-336 DOC-CONTRACT; :793 /orchestration mount; engine initialized). Recorded from 2026-09-23 20:25 session.
- **CALLER:** C5 (ORCA-ARCHAEOLOGY correction)
- **CALLEE:** gateway_runtime.js, ExecutionEngine.dispatchToAssignment
- **WRITER / READER:** C5 lane / Agent 19
- **AUTHORITY:** source code (DOC-CONTRACT block)
- **CLASSIFICATION:** CLAIM-SURVIVED
- **CONFIDENCE:** 0.9
- **BROKEN BOUNDARY:** none
- **DEPENDENCIES:** none
- **AFFECTS AGENTS:** orca-arch consumers
- **VERDICT: SURVIVED**

## F2 — C3 claim 2 (commit ancestry: 3 commits not ancestors of HEAD cc6856c3b)

- **DOMAIN:** orca-arch / git forensics
- **COMPONENT:** feature branch commit ancestry
- **CLAIM:** All 3 named commits exist and none is an ancestor of HEAD cc6856c3b.
- **EVIDENCE:** TEST (git operations; recorded 2026-09-23 20:30 session)
- **CALLER:** C3 (STATE-RECOVERY)
- **CALLEE:** git object store
- **WRITER / READER:** C3 lane / Agent 19
- **AUTHORITY:** git
- **CLASSIFICATION:** CLAIM-SURVIVED
- **CONFIDENCE:** 0.9
- **BROKEN BOUNDARY:** none
- **DEPENDENCIES:** none
- **AFFECTS AGENTS:** state-recovery consumers
- **VERDICT: SURVIVED**

## F3 — C3 claim 1 (zero hits for KNOWN_PERMANENT / REOPENED reconciler states)

- **DOMAIN:** orca-arch / state recovery
- **COMPONENT:** reconciler state vocabulary
- **CLAIM:** No reconciler implementing OPEN/KNOWN_PERMANENT/RESOLVED/REOPENED exists on the inspected branch; no renamed equivalents (STALE_ATTEMPT, reconcileLostCompletions, reconcileStartup all zero hits on HEAD).
- **EVIDENCE:** TEST (independent reproduction of zero-hit grep; recorded 2026-09-23 20:30 session)
- **CALLER:** C3 (STATE-RECOVERY)
- **CALLEE:** repo-wide grep closure
- **WRITER / READER:** C3 lane / Agent 19
- **AUTHORITY:** grep closure over HEAD tree
- **CLASSIFICATION:** CLAIM-SURVIVED
- **CONFIDENCE:** 0.9
- **BROKEN BOUNDARY:** none
- **DEPENDENCIES:** none
- **AFFECTS AGENTS:** state-recovery, critic-archdel (GC-9 instance)
- **VERDICT: SURVIVED**

## F4 — C2 GAP12 scope (no JS caller of Python ExecutionAuthority)

- **DOMAIN:** spine-exec / plane boundary
- **COMPONENT:** Python ExecutionAuthority vs JS gateway
- **CLAIM:** No JS file invokes the Python ExecutionAuthority; Python consumers are supervisor/constitutional_event_loop/tool_router; no subprocess spawn from JS.
- **EVIDENCE:** STATIC (require/import closure; recorded 2026-09-23 20:30 session). Consistent with critic-archdel R-8 (internally-wired py plane, no JS invoker).
- **CALLER:** C2 (SPINE-EXEC)
- **CALLEE:** gateway JS tree, runtime/*.py
- **WRITER / READER:** C2 lane / Agent 19
- **AUTHORITY:** import/require closure
- **CLASSIFICATION:** CLAIM-SURVIVED
- **CONFIDENCE:** 0.85
- **BROKEN BOUNDARY:** none (characterization nuance recorded in R15, not a falsification)
- **DEPENDENCIES:** none
- **AFFECTS AGENTS:** spine-exec, architecture
- **VERDICT: SURVIVED**

## F5 — P-7 "verbatim" wording (engine.js:618-619 0.85/auto_scan literals)

- **DOMAIN:** orca-arch / evidence precision
- **COMPONENT:** engine.js auto_scan finding
- **CLAIM (as worded):** The finding quotes the source "verbatim".
- **EVIDENCE:** STATIC (engine.js:618-619 contain the 0.85/auto_scan literals, but the original wording differs: paraphrase, not verbatim; recorded 2026-09-23 20:30 session)
- **CALLER:** C5 P-7
- **CALLEE:** engine.js:618-619
- **WRITER / READER:** C5 lane / Agent 19
- **AUTHORITY:** source text
- **CLASSIFICATION:** PRECISION-DOWNGRADE
- **CONFIDENCE:** 0.9
- **BROKEN BOUNDARY:** none (substance holds; wording overstated)
- **DEPENDENCIES:** none
- **AFFECTS AGENTS:** orca-arch readers
- **VERDICT: WEAKENED** (precision only; substance VERIFIED)

## F6 — Hung-worker wedge mechanism (C2 spine gap: hung worker stalls the scheduler)

- **DOMAIN:** spine-exec / liveness
- **COMPONENT:** MissionScheduler (real file: program/orca-a/src/mission_scheduler.js, sha256 7e98b7eca388b431a05777da545454db36678939b2f75823a213cfd301e9cf82 — byte-identical to orca-b vendor copy and the agent19 probe copy)
- **CLAIM:** A never-resolving worker.handle()/dispatch() leaves the mission in _processing forever (finally never runs); _poll Arrow 0 renews those leases every poll; Arrow 2 refuses new dispatches once _processing.size >= maxConcurrent; the reaper never reclaims; freeing a slot resumes dispatch (control).
- **EVIDENCE:** TEST — landed wedge-test.js run vs vendored copy: 8/8 PASS (A1,A2,C1,C2,C3,C4,D1,D2; node exit 0, ~0.6s). Scratch harness /tmp/agent19-wedge-real.js vs the REAL file: 9/9 PASS including a fixed E1 control (Promise.race timeout so the hung poll cannot swallow the control; dispatches=["m1","m2","m3","m4"], m4 dispatched after slot freed).
- **CALLER:** C2 GAP (hung-worker-P0) / MissionScheduler._poll Arrows 0-2 / WorkerRuntime.dispatch
- **CALLEE:** MissionRuntime.renewLease / reapExpiredLeases / getPending
- **WRITER / READER:** Agent 19 scratch harness / parent orchestrator
- **AUTHORITY:** executed code (mock runtimes, real scheduler class)
- **CLASSIFICATION:** CLAIM-SURVIVED (mechanism TEST-proven on the real file)
- **CONFIDENCE:** 0.95
- **BROKEN BOUNDARY:** liveness: Arrow 0's unconditional lease renewal defeats Arrow 1's reaper for any worker that hangs rather than crashes — the slot-leak is structural, not a transient. (Corroborates ORCA-B VERDICTS.md "hung-worker slot-leak TEST-PROVEN".)
- **DEPENDENCIES:** none (mock mission/worker runtimes)
- **AFFECTS AGENTS:** scheduler, worker-runtime, gauntlet (recovery semantics), impl-safety (timeout policy)
- **VERDICT: SURVIVED**

## F7 — Landed wedge-test.js probe is not fail-capable (harness defect)

- **DOMAIN:** test-harness integrity
- **COMPONENT:** agent19/probes/wedge-test.js (landed probe)
- **CLAIM (as presented):** An executable 8-check proof whose pass/fail outcome is observable (summary line + exit code).
- **EVIDENCE:** TEST — (a) normal run: node exits 0 in ~0.6s with 8 PASS lines but NEITHER the E1 control line NOR the "WEDGE-TEST: ALL PASS (8/8)" summary ever prints: Phase E does `await s._poll()` and the poll awaits the hung `_dispatch` (m1 re-dispatched via mock splice artifact), so the promise chain hangs, the event loop drains, node exits 0. (b) forced-failure run (/tmp/agent19-wedge-forcedfail.js, A1 rigged to fail): prints "FAIL A1", still exits 0, still no summary. The probe cannot fail: any check failure is swallowed and the exit code is always 0.
- **CALLER:** Agent 19 (own probe)
- **CALLEE:** MissionScheduler._poll / _dispatch (hung)
- **WRITER / READER:** Agent 19 / cmd-ops cross-check
- **AUTHORITY:** executed harness (two runs)
- **CLASSIFICATION:** HARNESS-DEFECT — LOCAL ACCIDENT (single instance; Agent 19's own probe. Does not generalize: no second lane instance.)
- **CONFIDENCE:** 0.95
- **BROKEN BOUNDARY:** verdict integrity: an exit-0 from this probe carries zero information about whether the 8 checks passed.
- **DEPENDENCIES:** F6 (the wedge mechanism itself is proven by the fixed scratch harness; only the landed artifact's verdict channel is broken)
- **AFFECTS AGENTS:** cmd-ops (cross-check must not cite the landed probe's exit code as evidence), Agent 19
- **VERDICT: KILLED** (as a verdict artifact; the underlying wedge claim stands per F6)
- **DOCKET (no deletion per standing rule):** replace the landed probe's Phase E with the race-timeout control from /tmp/agent19-wedge-real.js, or retire the E1 block. Queued for parent decision; probe file NOT modified.

## F8 — orca-a H1j: PING mission_id not key-order stable (independent reproduction)

- **DOMAIN:** identity
- **COMPONENT:** PING MissionRuntime.create (program/orca-a/src/mission_runtime.js:68-95)
- **CLAIM (orca-a VERDICTS.md Record 1, H1j):** When payload has no event_id, the idempotency key is JSON.stringify(payload), which is NOT key-order stable: {a:1,b:2} and {b:2,a:1} mint different mission ids — a duplicate-mission bug class (harvest HS-1 proposed).
- **EVIDENCE:** TEST — scratch harness /tmp/agent19-keyorder-test.js calling the REAL MissionRuntime.create() with a stubbed pool (no PG): K1 event_id path idempotent (5c192580a429ede2, PASS); K2 same key order deterministic (4788f94b0b9f9d5d, PASS); K3 key-reordered payload mints a DIFFERENT id (4788f94b0b9f9d5d vs eed9468fd0f8c49f, PASS — bug reproduced through the real code path, not a formula copy); K4 both ids reach INSERT (PASS — two rows would be minted for one logical payload). Note: orca-a's probe.js H1j replicated the formula; this run exercises the actual method.
- **CALLER:** MissionRuntime.create
- **CALLEE:** crypto sha256; (mock) pool.query INSERT ... ON CONFLICT DO NOTHING
- **WRITER / READER:** Agent 19 scratch harness / parent orchestrator
- **AUTHORITY:** executed real method
- **CLASSIFICATION:** CLAIM-SURVIVED (independent TEST reproduction; strengthens H1j)
- **CONFIDENCE:** 0.95
- **BROKEN BOUNDARY:** idempotency: ON CONFLICT DO NOTHING cannot dedupe what hashes differently — the dedup key itself is order-sensitive.
- **DEPENDENCIES:** none (mock pool)
- **AFFECTS AGENTS:** bridge, scheduler, any mission producer; orca-a HS-1 harvest proposal
- **VERDICT: SURVIVED**
- **OPEN:** HS-1 promotion to generic class needs a second lane instance per the 2-lane rule (F9 is the same bug instance, not a second).

## F9 — MissionRuntime.create docstring claims canonical idempotency (doc/code mismatch)

- **DOMAIN:** identity / documentation truth
- **COMPONENT:** mission_runtime.js:60-66 docstring vs :68-95 implementation
- **CLAIM (docstring):** "mission_id is deterministic: hash(missionType:event_id) when event_id is present in payload, otherwise hash(missionType:canonical_payload). Same event always produces the same mission — idempotent by construction."
- **EVIDENCE:** TEST (F8 run) + STATIC (code reads `JSON.stringify(payload)`, not a canonical form). The word "canonical_payload" in the docstring is false: JSON.stringify preserves insertion order, so the same logical payload with different key order hashes differently (F8 K3: 4788f94b0b9f9d5d vs eed9468fd0f8c49f). "Idempotent by construction" does not hold for the no-event_id path.
- **CALLER:** MissionRuntime.create docstring
- **CALLEE:** JSON.stringify (order-sensitive)
- **WRITER / READER:** PING core author / any reader trusting the docstring
- **AUTHORITY:** executed code vs docstring text
- **CLASSIFICATION:** DOC-CODE-MISMATCH — LOCAL ACCIDENT (same bug instance as F8; not a second instance for generic-class promotion)
- **CONFIDENCE:** 0.95
- **BROKEN BOUNDARY:** documentation authority: the docstring asserts a stronger invariant than the code implements.
- **DEPENDENCIES:** F8
- **AFFECTS AGENTS:** bridge, scheduler, future harvest (ORCA stableStringify is the cited fix shape, H1k)
- **VERDICT: KILLED** (the docstring claim; the code behavior is accurately described by orca-a H1j)

## F10 — W2-MISSIONS "FYD 524-tests-pass" (clean-worktree reproduction recon)

- **DOMAIN:** missions / test-evidence provenance
- **COMPONENT:** golden run-tests.sh suite set (7 jest configs under src/fyd/)
- **CLAIM:** 53 suites / 524 tests, 0 failures, on branch fyd-factory @ e48ef710 (wave2/missions/CHECKPOINT.md 20:10 MDT; DRY-RUN-REPORT.md §3).
- **EVIDENCE:** STATIC (recon) + TEST (read-only git ops on the Pig 2026-09-24 ~05:30 MDT): (a) branch/commit check out — Pig /home/nolan/projects/ping is on fyd-factory @ e48ef710cb889bf4d59b833ef9766067a9e2bbf0, repo remote git@github.com:piging2/fyd.git; e48ef710 exists as a commit object. (b) The lane's own DRY-RUN-REPORT.md:106 states the run happened with **83 dirty files** — "snapshot, not a pinned build"; the dirty list is never enumerated in the lane's evidence. (c) Current worktree has 118 dirty files (even dirtier now). (d) No local checkout of piging2/fyd exists on this machine; the remote is SSH-only github with no credential available to this read-only agent. (e) run-tests.sh itself cds to /home/nolan/projects/ping (Pig-local path) — there is no portable checkout path.
- **CALLER:** W2-MISSIONS lane
- **CALLEE:** jest via npx, 7 configs (proceduralize/components/sitespec/builder/archetypes/customize/media)
- **WRITER / READER:** W2-MISSIONS / Agent 19
- **AUTHORITY:** lane report + Pig git state
- **CLASSIFICATION:** REPRO-BLOCKED / SCOPE-CAVEAT
- **CONFIDENCE:** 0.85 (the 524-pass itself was not re-run; the scoping facts are verified)
- **BROKEN BOUNDARY:** reproducibility: a clean checkout at e48ef710 would test a DIFFERENT tree than the one that produced "524-tests-pass" (83 unknown dirty files). The exact result is unreproducible by construction.
- **DEPENDENCIES:** none
- **AFFECTS AGENTS:** cmd-ops (verdict table W2-MISSIONS row), any lane citing "524 green" as a clean-tree fact
- **VERDICT: WEAKENED** — the claim SURVIVES as stated (internally consistent; commit/branch verified), but it must be read as "524 tests passed on a dirty worktree at e48ef710", not a clean-tree or pinned-build result. Reproduction on an own checkout is blocked on: (1) no local clone exists, (2) no credential for the SSH-only remote under read-only posture, (3) the original tree state is unrecoverable (dirty files unenumerated).

## F11 — C7 G-03 spot check (row-vs-journal divergence in complete())

- **DOMAIN:** mission-control / consistency
- **COMPONENT:** MissionRuntime.complete (program/orca-a/src/mission_runtime.js:145-167)
- **CLAIM (C7 audit G-03):** complete() sets the row to `completed` BEFORE emitting MISSION_COMPLETED; if the emit fails, row truth and journal truth silently diverge (`/mc/missions/*` read rows, `/mc/activity` reads the journal; neither endpoint says they can disagree).
- **EVIDENCE:** STATIC (code): UPDATE ... SET status='completed' runs first (:159-162); then, only if rowCount===1, `await this._eventRuntime.emit('MISSION_COMPLETED', ...)` (:164-166). No transaction spans the two writes; no try/catch around the emit; no compensating writer or outbox in the method. An emit throw leaves the row committed and the journal missing the event — exactly the claimed divergence.
- **CALLER:** C7 (MISSION-CONTROL-AUDIT.md:21,41,67)
- **CALLEE:** pool.query (UPDATE); eventRuntime.emit
- **WRITER / READER:** C7 lane / Agent 19
- **AUTHORITY:** source code
- **CLASSIFICATION:** CLAIM-SURVIVED
- **CONFIDENCE:** 0.9
- **BROKEN BOUNDARY:** consistency: row write and journal emit are not atomic; the failure mode is silent (no reconciliation signal).
- **DEPENDENCIES:** none
- **AFFECTS AGENTS:** mission-control UI consumers, scheduler stats, replay/journal readers
- **VERDICT: SURVIVED**
- **Secondary STATIC observation (not separately falsified):** the emit is awaited inside MissionScheduler._dispatch's try block; an emit throw propagates to _dispatch's catch → _failMission → failWithRetry, whose conditional UPDATE (status IN 'running'/'assigned'/...) matches no rows on an already-'completed' mission, while _stats.failed++ still increments — a completed mission would be counted as failed in scheduler stats (row/journal/stats triple disagreement). TEST-grade proof of this cascade is a possible follow-up harness if the parent wants it.

---

## Failure classification (standing rule: LOCAL ACCIDENT vs GENERIC CLASS)

- **F7 (probe not fail-capable):** LOCAL ACCIDENT — single instance (Agent 19's own probe). No second lane instance; no generic class proposed.
- **F9 (docstring/code mismatch):** LOCAL ACCIDENT — same bug instance as F8, not a second instance. Corroborates orca-a's HS-1 harvest proposal but does not satisfy the 2-lane rule for generic-class promotion on its own.
- **No new generic classes proposed this session.** Existing classes (GC-12, GC-9, GC-3, GC-10) untouched — not re-audited here.

## Open items

1. **524-test full reproduction:** blocked (F10 blockers 1-3). If the parent wants a best-effort re-run, the nearest feasible target is the Pig worktree itself (still @ e48ef710, now 118 dirty files) — but that would be a third tree state, not a reproduction of the original result. Recommend recording the claim as dirty-tree-scoped rather than re-running.
2. **Wedge probe docket:** landed wedge-test.js Phase E / summary should be fixed (race-timeout control) or the E1 block retired. Docketed for parent decision; file not modified (deletions/changes gated on Nolan's word).
3. **G-03 cascade:** the emit-failure → _stats.failed mis-count is STATIC-only; a follow-up harness could TEST-prove it if the parent wants the cascade on record.
4. **Attack-plan items not covered this session** (per task scope): C1 A5 verdict cross-check, C4 approval gap, C6 mechanism-map ADAPT justification, constitutional-sprint forensics. The 20:17-20:30 log items (C5, C3, C2-GAP12, P-7) are recorded above as F1-F5.
5. **HS-1 generic-class promotion:** needs a second independent instance (2-lane rule) before leaving candidate status.

## Evidence grade summary

- TEST: F2, F3 (prior session, git ops), F6 (wedge vs real file, 9/9), F7 (forced-failure run), F8 (real create() path, 4/4), F10 (Pig git recon)
- STATIC: F1, F4, F5 (prior session), F9 (docstring vs code), F10 (recon), F11 (complete() code)
- LIVE: none this session
