# Agent 19 — Independent Critic / Falsification Checkpoint

**Lane:** ORCA FINISH Agent 19 (testing + falsification). **Status:** PLAN recorded 2026-09-23 20:02 MDT.
**Posture:** READ-ONLY on all repos/lanes. Attack conclusions, not code (W2-REDTEAM owns code attacks; their checkpoint read 20:02 MDT — my surface = claims/verdicts/forensics/audits). No commits. Scratch harnesses only, never production.
**Evidence grades:** STATIC (read source) / TEST (ran code/suite) / LIVE (witnessed live).

## Redteam deconfliction (read their CHECKPOINT.md 20:02 MDT)
- Their surface: W2-IMPL-STATE / W2-IMPL-SAFETY code, plus branch `feature/orca-autonomy` integration findings BR-A1..A9.
- My surface: the CLAIMS made about those things by other lanes (wave-1 archaeology verdicts, W2-MISSIONS verdicts, constitutional sprint forensics). If a redteam finding contradicts a lane's CLAIM, that is fair game for me (I challenge the claim; they challenged the code).
- I will not reproduce their code-level exploits; I will use their findings as counter-evidence where a lane claim contradicts them.

## Attack plan (claims, not code)
1. **C1 A5 verdict** (`wave1/orca-arch/A5-VERDICT.md`): is "substantially proven" earned? Cross-check each witness statement against the same evidence files; look for witness contradictions (one witness says X, another says not-X on the same symbol).
2. **C2 spine gaps** (`wave1/spine-exec/GAPS.md`): hung-worker-P0 claim — STATIC test: can I demonstrate a hung worker stalling the scheduler from the code they cite, or is the causal link speculative?
3. **C4 approval gap**: read their gap claim, challenge the evidence chain.
4. **C6 mechanism map**: sample ADAPT verdicts against the A5 branch — is ADAPT justified when A5 is only "substantially proven" (partial proof -> ADAPT is borrowing unearned certainty)?
5. **C7 Mission Control audit**: challenge methodology and conclusions.
6. **W2-MISSIONS claims** (`wave2/missions/`): FYD 524-tests-pass (which branch? reproduce on my own checkout?); TD-001 false-positive verdict; XSS fix plan adequacy.
7. **Constitutional sprint forensics**: counter-read the same evidence; check golden-path evidence proves the claim (not just "tests passed" but "invariant held").
8. **Structural probes**: build executable checks vs scratch PG/local harness where feasible: determinism, replay drift, duplicate processing, cursor skips, unanchored projection, invalid evidence rejection. Each probe gets a STATIC/TEST grade; LIVE only where a live harness exists.

## Finding format (mandatory shared record)
DOMAIN / COMPONENT / CLAIM / EVIDENCE (STATIC|TEST|LIVE) / CALLER / CALLEE / WRITER / READER / AUTHORITY / CLASSIFICATION / CONFIDENCE / BROKEN BOUNDARY / DEPENDENCIES / AFFECTS AGENTS.
Verdict scale for claims: KILLED (counter-evidence) / SURVIVED (withstood attack) / WEAKENED (partially undermined).

## Log
- 20:02 MDT: plan written. Redteam checkpoint absorbed. Starting target reads: wave1 orca-arch, spine-exec, mechanism-map; wave2 missions; constitutional sprint docs.

## Log (continued)
- 20:17 MDT: C3 new target absorbed; C5 correction absorbed. Pig wrapper flaking (session metadata timeouts); switched to direct ssh+base64 transport — works.
- 20:25 MDT: C5 wiring claim VERIFIED (gateway_runtime.js:326-336 DOC-CONTRACT + :793 /orchestration mount; engine initialized). Original 2026-09-18 finding located: memory/2026-09-18.md L257/L304 "synthetically fabricated dashboard closure outputs" + Nolan's no-delete-ORCA order (prohibited deleting outright, ordering conversion instead).
- 20:30 MDT: C3 claim 2 ancestry VERIFIED (all 3 commits exist, none ancestor of HEAD cc6856c3b). C3 claim 1 zero-hit INDEPENDENTLY REPRODUCED (0 hits KNOWN_PERMANENT/REOPENED). No renamed equivalents (STALE_ATTEMPT/reconcileLostCompletions/reconcileStartup all 0 hits on HEAD). C2 GAP12 scope VERIFIED (no JS caller of py ExecutionAuthority; py consumers = supervisor/constitutional_event_loop/tool_router etc.; no subprocess spawn from JS). P-7 substance VERIFIED (engine.js:618-619 0.85/auto_scan literals); "verbatim" DOWNGRADED (original wording differs: paraphrase, not verbatim).
- Next: TEST harnesses (scheduler hung-worker wedge vs real mission_scheduler.js; identity key-order nondeterminism), 524-test clean-worktree reproduction recon, C7 G-03 spot check, then FALSIFICATION-RECORD.md.

## Log (2026-09-24 ~05:07-05:45 MDT, recovery session — all pending work complete)
- Wedge-test.js run vs vendored copy: 8/8 PASS (A1,A2,C1,C2,C3,C4,D1,D2; node exit 0, ~0.6s). BUT the E1 control check and the summary line never execute: Phase E's `await s._poll()` hangs on the hung dispatch, the event loop drains, node exits 0. Forced-failure run (A1 rigged FAIL) still exits 0 with no summary — the landed probe is NOT fail-capable (exit 0 carries zero information). Docketed for parent; file not modified.
- Wedge vs REAL mission_scheduler.js (program/orca-a/src, sha256 7e98b7ec... byte-identical to vendor + probe copies): scratch /tmp/agent19-wedge-real.js, 9/9 PASS incl. race-timeout-fixed E1 control. Wedge mechanism TEST-proven on the real file (Arrow 0 renewals defeat Arrow 1 reaper; Arrow 2 starves at capacity).
- Key-order nondeterminism: scratch /tmp/agent19-keyorder-test.js calls the REAL MissionRuntime.create() with stubbed pool — 4/4: event_id path idempotent, same-order deterministic, key-reordered payload mints a DIFFERENT id (4788f94b0b9f9d5d vs eed9468fd0f8c49f), both ids reach INSERT. orca-a H1j independently reproduced through the real code path (their probe copied the formula). Bonus: create() docstring claims "hash(missionType:canonical_payload)" / "idempotent by construction" — FALSE for the no-event_id path (code uses JSON.stringify). Docstring claim KILLED.
- 524-test recon: Pig /home/nolan/projects/ping is on fyd-factory @ e48ef710 (commit exists, = branch tip; remote git@github.com:piging2/fyd.git). Lane's own DRY-RUN-REPORT:106 admits the run had 83 dirty files (never enumerated); current worktree has 118 dirty files. Clean-checkout reproduction BLOCKED: no local clone, SSH-only remote with no credential under read-only posture, original tree state unrecoverable. Claim stands as dirty-tree-scoped only.
- C7 G-03 spot check: SURVIVED at code level — complete() UPDATEs row to 'completed' first (mission_runtime.js:159-162), then conditionally awaits MISSION_COMPLETED emit (:164-166); no transaction, no try/catch, no outbox. Secondary STATIC observation: emit throw propagates into _dispatch catch → _failMission → failWithRetry matches no rows on 'completed' mission while _stats.failed++ increments (triple disagreement row/journal/stats).
- FALSIFICATION-RECORD.md written: 11 findings (7 SURVIVED, 2 WEAKENED, 2 KILLED). No new generic classes (F7, F9 = LOCAL ACCIDENTs). Scratch harnesses live in /tmp (agent19-wedge-real.js, agent19-keyorder-test.js, agent19-wedge-forcedfail.js); nothing committed.
