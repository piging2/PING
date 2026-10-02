# TenantOS Autonomous Convergence Wave — Ledger

## Headcount (rebalanced 2026-09-23 ~18:37 MDT, standing 50 budget)
- FYD factory: 16
- Autonomy challenge: 6
- Convergence wave (this): 18
- Constitutional sprint: 10
- Total: 50

## Swarm roster (18 active; swarm 12 = coordinator one-writer function)
| Swarm | Name | Agent | Status |
|---|---|---|---|
| 01 | Tenant reality / boundaries | f36e8c28 | running |
| 02 | ORCA mission engine | a898491d | running |
| 03 | MCP / tool plane | 1f117b75 | running (respawned 18:37) |
| 04 | Tool safety / side effects | 9888f780 | running (respawned 18:37) |
| 05 | Memory convergence | 1fac089e | running (respawned 18:37) |
| 06 | Memory adversary | f2097d68 | running |
| 07 | Observability | 1ebde476 | running |
| 08 | Mission Control | a1218f97 | running |
| 09 | Task claiming | 72c2f2e4 | running |
| 10 | Human decision budget | 14ac62bb | running |
| 11 | Failure recovery | 0e5cd9d4 | running (respawned 18:37) |
| 13 | GitHub ingestion | DEFERRED | slot 19 when capacity frees |
| 14 | Harvest runtimes | aef2bc42 | running |
| 15 | Security red team | 529c0c97 | running (respawned 18:37) |
| 16 | Confidence ceiling | cc3b3a9c | running (respawned 18:37) |
| 17 | Resource governance | dfe4b0dd | running (respawned 18:37) |
| 18 | Contract/schema adversary | 63036609 | running |
| 19 | Integration / release | 4de2dbad | phase 1 complete 2026-09-24 ~01:02 UTC |
| 20 | Autonomy gauntlet | 16efd693 | running |

## Coordinator decisions (2026-09-24 ~01:05 UTC, on swarm 19 phase-1 report)
- ADOPTED: six-gate pipeline (PATCH → TEST → ADVERSARIAL TEST → COMMIT → INTEGRATE → TEST MERGED STATE); STATE.json as proposal tracking; check-overlap.py as approval gate; Oracle protection rules; no-push rule.
- ADOPTED: canonical substrate root `src/tenanos/**` — no competing roots; broadcast to all swarms.
- ADOPTED: integration base tag `tenanos-wave-base-20260923` at e48ef710 (frozen; FYD lane movement cannot shift wave branches).
- CONFIRMED: approved-diff handoff path `~/workspace/tenanos-wave/diffs/<id>.diff`.
- CONFIRMED: interim adversarial-test ownership — writer-authored fail-before tests until adversary swarms publish pass protocols.
- APPROVED: P-20260923-001 (scoped `src/tenanos/jest.config.cjs` modeled on `src/fyd/jest.config.cjs`) — writer dispatch pending diff retrieval from STATE.json.
- APPROVED: P-20260923-001 (scoped `src/tenanos/jest.config.cjs` modeled on `src/fyd/jest.config.cjs`) — writer dispatched 2026-09-24 ~01:12 UTC (agent 963150b1), isolated worktree from base tag, gates: config parse + temp TS smoke test (deleted after) + tsc sanity; commit local only, no push.
## Incident 2026-09-24 ~01:28 UTC — daemon restart killed 15/17 swarm workers
- 15 workers errored: "active before daemon restart but has no live runtime handle or restart checkpoint". In-memory progress lost; on-disk checkpoints in swarm-NN/ survive (all dirs intact; only swarm-03/09/15 empty).
- Survivors: swarm-08 worker (aef2bc42, still active — confirmed writing post-crash) and swarm-11(?) worker a1218f97 (terminal result pending delivery).
- Recovery: resuming 13 orphaned swarms from on-disk checkpoints with reconstructed briefs (01,02,04,05,06,07,10,11,14,16,17,18,20) — all dispatched 2026-09-24 ~01:35 UTC. swarm-08 NOT re-dispatched (live). swarm-03/09/15 NOT re-dispatched (empty checkpoints, original missions unknown — need parent briefs).
## Night shift 2026-09-24 (Nolan asleep; directive: triple verified output, max parallelism, no routine interruptions)

### Pipeline state (~01:50 UTC)
- P-20260923-001 INTEGRATED (PING repo, tenanos-wave/integration @ 56d5f5ab). Unaffected by restart.
- Gateway track OPENED: base tag tenanos-wave-gateway-base-20260923 @ cc6856c3b (branch refactor/runtime-authority-convergence; worktree has unrelated dirty files, untouched). P-20260923-082..087 APPROVED (coordinator, 01:45Z) — single writer dispatched, isolated worktree, 6 commits, gates: node --check + route smoke-require + existing tests + adversarial greps. No push.
- P-20260923-081: staged + filed; routed to constitutional sprint via ~/workspace/constitutional-sprint/INBOUND-FROM-TENANOS-WAVE.md (their repo, their write). Not in wave's write path.
- ID collisions resolved: 002 = swarm-14 run-identity (STATE.json); swarm-17 budgets.ts renamed to diffs/P-20260923-090.diff + STATE.json 090 (proposed); swarm-11 run-state-authority → 089 (resume worker notified).
- 24 proposals in STATE.json. 002-014 claimed_areas all distinct files under src/tenanos/** — no file-claim collisions. Semantic overlaps to reconcile at approval: 010 (budget/limits.ts) vs 090 (budgets.ts); 002 (runs/schema) vs 005 (checkpoint/schema); 004 (leases) vs 003 (claim).
- Swarm-15 (security) re-staffed from constitutional-sprint D1/D2/D3: Kit webhook unauthenticated ingress (LIVE P0), download-route open redirect + PII logging (LIVE P0), demo-owner-mode assessment.
- Swarm-03/09 missions still unknown (no local briefs) — parent question, slots held.

### Swarm-14 (harvest) terminal report received (~01:55 UTC)
- Original swarm-14 worker completed: 13-lane harvest, filed P-20260923-002→014 (all src/tenanos/**, status proposed). Deliverable: swarm-14/HARVEST-DECISIONS.md (536 lines).
- Confirmed P0s: P0-1 renewLease binds nothing (stale scheduler can extend superseded attempt's lease — fix: predicate on tenant_id, run_id, holder, fencing_token); P0-2 no per-attempt Run identity; P0-3 no fail-closed spend bound (OmniRoute quota explicitly fail-open — rejected as authority).
- Tests: Hatchet claim semantics ported to SQLite — 8-way race → exactly 1 winner, 4/4 PASS. Not run: live Postgres claim, nsjail execution (recorded as falsification tests for implementers).
- Falsified: OpenHands v1.23.0 Python runtime gone (dead end, nsjail instead). No lane requires framework import.
- Note: my swarm-14 resume brief said "sandboxing evaluation" (from checkpoint dir contents) but the true mission was the 13-lane harvest — the resume worker is now deepening lane 012 (sandboxing), which is a valid continuation, not a duplication. Proposals 002-014 already filed; no re-filing needed.
- Gateway queue ordering: 082-087 (in writer) → P0-1 lease fix (proposal 004, gateway repo) → 088 tenant filters (needs swarm-01 backend).

### Collision repair: 09X series (~02:10 UTC)
Three workers raced the same IDs while filing. Coordinator repaired, all verified:
- P-20260923-090 = swarm-17 budgets (diff restored from staged copy; apply-check OK).
- P-20260923-091 = swarm-10 decision-budget (regenerated from swarm-10/stage/, 6 files, apply-check OK; writer in flight unaffected).
- P-20260923-093 = swarm-04 tool-safety (was 090; entry filed from worker's prepared JSON, test results preserved).
- P-20260923-094 = swarm-16 verification engine (was 091/header 089; header rewritten; entry pre-filed).
- P-20260923-095 reserved for swarm-11 run-state authority (089 confirmed as swarm-18's MemoryCandidate).
Root cause: workers minted IDs from a stale view of diffs/ + STATE.json under concurrency. Standing rule now: workers check STATE.json immediately before filing AND the coordinator owns ID assignment for the 09X series on conflict.

### Canonical budget-exhaustion semantics (coordinator decision, ~02:10 UTC)
Swarm-17 flagged the throw-vs-value tension between P-20260923-090 (budgets.ts: typed BUDGET_EXHAUSTED values, never throws) and P-20260923-010 (budget/limits.ts: throws BudgetExceeded). DECIDED: typed values are canonical — exhaustion is an enumerable outcome that must become an event/evidence, not an exception that can be swallowed or crash through layers; this also repairs the deployment-transaction.ts:890 gap. P-20260923-010 must conform (no throws, no second ledger — tool-call accounting flows through the single BudgetLedger) before it advances past proposed.
- Swarm-10 resume: decision-budget design proven (21/21 tests, tsc clean), diff staged (6 new files, src/tenanos/decision-budget/), overlap gate exit 0. STATE.json: 25 proposals, integrity verified (worker flagged concurrent mutation; re-verified valid).
- Coordinator policy decisions (from DECISION-BUDGET.md section 7, reversible, recorded not escalated):
  1. The phantom "8 consequential categories" (never enumerated in code/memory) are RETIRED; 2.6 membership defined explicitly in the taxonomy.
  2. merge() from constitutional_review requires 2.7 approval ALWAYS until the review gate is independently proven (fail closed).
  3. DLQ replayDeadLetter replayFn authorization: named role only, never any-agent.
- Writer dispatched: isolated worktree ping-wave-P-20260923-091 from tenanos-wave-base-20260923, gates incl. scoped jest config (copied from integration branch, deleted before commit), no push.

### Staffing (~02:00 UTC): 15 active
- 12 resume workers, 1 gateway writer (082-087), 1 security (swarm-15), 1 proposal writer (091).

### Cross-lane coordination
- Build program OWNERSHIP.md: TenantOS wave is EXCLUDED from build program (coordinate via state files, feed findings, never duplicate). Lane STATE.md files for dup/j/k/i/phase0 do not exist yet — nothing to consume.
- Constitutional sprint: D1/D2/D3 security P0s routed to swarm-15; 081 fed back via INBOUND-FROM-TENANOS-WAVE.md.
- One-writer ownership + safety invariants held: no pushes, no main/master commits, isolated worktrees/branches only, FYD exclusion zone respected, port 3100 untouched.

### Morning targets
- Verified capabilities landed (gateway honesty batch + PING-repo proposals as writers deliver).
- Failure classes → tests (swarm-06 adversarial harness; PROJECTION-WIRING.md checklist for gateway).
- Honest ledger of proven vs blocked (this file + STATE.json).
- QUARANTINE LIFTED (provenance): diffs/P-20260923-081..087 are swarm-08's filed proposals (Mission Control audit), not foreign artifacts. STATE.json valid: 9 proposals (P-001 integrated + 081-088 proposed).
- SCOPE FLAG (unresolved, needs parent): 081-087 target `/home/nolan/ping` (gateway repo) and constitutional-runtime, NOT the PING repo where `tenanos-wave/integration` lives. The six-gate pipeline has no integration path for these repos yet.
- ARCHITECTURAL FINDING (worker-reported, unverified): swarm-08 asserts the real mission/run/event substrate (MissionRuntime, UnifiedEventRuntime, DeadLetterAuthority) lives in `/home/nolan/ping`, while `/home/nolan/projects/ping` (wave repo) is the Next.js website. If true, the `src/tenanos/**` canonical-root decision may cover the wrong repo for substrate code. Needs parent/Nolan adjudication before more substrate proposals are approved.
- Swarm-08 P0s: F-01 competing mission authority (083); F-02 zero tenant filtering on MC surface (088 spec); F-03 fabricated 0.85 confidence → closure percentages (082, 084); F-04 hardcoded completed/failed counts (085, 086); F-05 fake-green header in live UI (081). Full audit: swarm-08/MC-AUDIT.md (24 proven / 7 fake / 11 unproven).
- Worker open questions for coordinator/parent: (1) deprecate POST /orchestration/missions or keep as session scratchpad? (2) collectMissions fix: wire MissionRuntime into SystemAuthority, or proxy /mc/missions/stats? (3) swarm-01 owns backend tenant-filter (088) — confirmed to resume worker. (4) who builds the real MC projection UI, and in which repo?
- COLLISION: P-20260923-002 is claimed by two different artifacts (diffs/P-20260923-002.diff → src/tenanos/budgets.ts vs swarm-11/P-20260923-002-run-state-authority.diff → src/tenanos/run/run-state-authority.ts). Reconciliation required before either moves.
- P-20260923-001 remains integrated (unaffected by the restart).
- Hard exclusion: `src/fyd/**` + 66 uncommitted FYD files in main worktree; wave work only in fresh worktrees from the base tag.
- Note: read ~/workspace/AGENTS.md house rule — oracle-ssh.sh runs only locally via stdin-pipe form, never via pigwsl-run.sh; never pass secrets as args. Relevant if any swarm needs Oracle reachability (none should; Oracle stays protected).

## Boundary with constitutional sprint (10 workers)
- Sprint owns: constitutional authority mapping + certification of identity/event/observation/evidence/object/intent/capability/transition/projection/replay/witness/lineage. Surgical in-tree corrections, NO commit authority.
- Wave rule: do NOT run parallel authority investigations on those. Consume sprint findings as inputs (check ~/workspace for its outputs).
- If the sprint records a substrate defect as needing a shipped fix, it becomes eligible wave work (route via coordinator → single writer).

## Notes
- 2026-09-23 18:36 MDT: 8 spawns failed with transient DB lock timeout (sqlx cancel). Retried 7; swarm 13 deferred.
- All swarms read-only vs /home/nolan/projects/ping. Coordinator is sole write dispatcher.

### P-20260923-091 INTEGRATED (~02:30 UTC)
- Writer commit b49c9e19 verified: exactly 6 decision-budget files, 793 insertions. Merged to tenanos-wave/integration as beafca12.
- Writer gates passed (tsc, 21/21 jest). Merged-state gates pending: Pig SSH path hit runtime metadata timeouts during integration; will re-verify on recovery. Possible stray node_modules symlink in integration worktree — remove on recovery.
- Second verified capability landed tonight (001 + 091).

### ID freeze (02:25 UTC)
Workers minted 095-100 concurrently, causing duplicate STATE entries (095x2, 096x2). Repaired: 34 proposals, no duplicates. Standing rule: coordinator owns ID assignment; workers must request IDs, not mint them. Two reassignment messages were misdelivered to wrong workers (both completed unaffected; no correction needed).

### Infrastructure note (~02:30 UTC)
Runtime metadata registration timing out on Pig SSH commands (transient). Pig bridge itself was OK at 02:10. Writers using the Pig may report errors; will retry on recovery. Not spamming retries.

## Standing invariants (Nolan, 2026-09-24 ~02:35 UTC)
1. NO STOPPING CONDITIONS: read-only cognition runs always. Lease health, stale-work recovery, runtime observation never pause.
2. YOLO MODE: decide at 80%+ confidence, test, document evidence, continue. Below 80%: one concise question (uncertainty + recommended default + cost of being wrong). Never gate routine execution on approvals.
3. Command roles (program-wide): lease health, stale-work recovery, capacity/backpressure, worktree lifecycle, runtime health. Coordinator-held; the execution substrate stays healthy while lanes saturate it.
4. Fleet note: 400 MC + 250 MCP logical units ordered; fanning out as capacity allows within stability limits (never crash the machine). Honest saturation, not literal 650 agents from one coordinator.

### Batch completions processed (~02:45 UTC)
Swarm-05 (096 P0 + 097/098/099), swarm-01 (092 tenant kit 14/14), swarm-11 (095 run-state + 101 reconciler note), swarm-07 (100 gateway bootstrap), swarm-18 (089 MemoryCandidate), swarm-20 (gauntlet 14/14 attacks). Misdelivered 093/094 messages confirmed harmless (recipients completed, didn't touch others' entries).

### Approvals (~02:45 UTC): 089, 092, 095, 098, 100
Writers dispatched for all 5 (isolated worktrees, gates, no push). 012 writer already running. Gateway writer queued for 096 (P0) after 082-087.

### Constitutional decisions (~02:45 UTC)
1. 002 vs 095 seam: 002 owns Run/Attempt identity + journal (runs/schema.ts); 095 owns state vocabulary + transitions + classifier (run/). 095's schema.sql narrows to reconciliation queue if tables overlap. No second run store.
2. Recovery layering: 006=detect (pure overdue predicate), 101=classify/decide (never-reexecute-proven-effect), 013=execute (redrive). Coordinator serialize call.
3. I4 transition log: KNOWLEDGE_TRANSITIONED events in M1 (append-only), emit-then-update, zero new tables. Spec 099 stands.
4. 097 (retrieval booleans) NOT approved: hunk anchor unverified (SSH probe hung). Writer verifies at apply time.
5. 101 reconciler: valid diff lost to P0 overwrite; filed as proposed, diff to be re-staged. Not blocking.

### Ledger: 36 proposals, 14 approved, 2 integrated (001, 091)
Active: 6 PING-repo writers (012, 089, 092, 095, 098, 100), 1 gateway writer (082-087+096), swarm-15 (security), AGENT 09, AGENT 15, swarm-02, swarm-06.

### 091 writer full report received (~02:50 UTC)
Writer found diffs/P-20260923-091.diff mislabeled (verification content from the collision) and correctly applied swarm-10/P-20260923-089.diff (decision-budget, 6 files) instead, using -p2 for the a/b/ prefix. Commit b49c9e19 verified: exactly the 6 decision-budget files. 21/21 jest, tsc clean. Integration beafca12 stands VALID.
Standing note for writers: the scoped jest config testMatch only covers src/tenanos/__tests__/*.test.ts, NOT nested __tests__/ dirs. Writers of proposals with nested test dirs must use a testMatch override (temporary config, deleted before commit). Applies to 095 (run/__tests__/) and 094 (verification tests).

### Swarm-06 completed (~02:55 UTC)
Promotion/write-path adversarial suite (6 attacks, 0/6 pre-fix). Filed P-20260923-102: route self-promotion guard, namespace-required reads, vector payload lifecycle fields. Fix simulation 3/6. Approved; queued for gateway writer after 096. Ledger: 36 proposals, 15 approved, 2 integrated.

### 089 integrated (~02:58 UTC)
Writer commit 04e420e2 (1 file, Draft-07 valid, 1+/12-). Merged to tenanos-wave/integration as 45361109. Purely additive. Ledger: 36 proposals, 15 approved, 3 integrated (001, 089, 091).

## AGENT 15 findings (2026-09-23 ~20:35 MDT, agent 755f7882; full report: swarm-15/AGENT15-CODEX-HERMES-ADAPTER.md)

AGENT 09 output was absent (swarm-09/ empty); designed against the brief's contract shape (PING mission -> execution adapter -> worker -> result/evidence -> PING), which the proven multi-runtime work-order contract implements verbatim. Reconcile when AGENT09-EXECUTION-BOUNDARY.md lands.

**As-is invocation paths (verified live):**
- Hermes: `~/workspace/bin/prompt-hermes.sh "<prompt>"` -> scp prompt to C:/Windows/Temp -> ssh -> `wsl -u nolan -- bash hermes-run.sh` (ephemeral) -> venv python `hermes_cli/main.py -z <prompt>` (cwd .../hermes-agent, 600s timeout). Windows-native, CWD C:\Users\nolan, cannot see WSL/cloud paths. One-shot text executor; filesystem blindness is its current scoping.
- Codex: proven reference `codex exec --ignore-user-config -s read-only --ephemeral --skip-git-repo-check -C <dir> <prompt>` (binary `/mnt/c/Users/nolan/.codex/bin/wsl/<id>/codex`, CODEX_HOME launcher-set). Global approval_policy on-request; `[projects."/home/nolan/ping"] trust_level=trusted`. Desktop task sandbox restricted; a task correctly refused the localhost-SSH bypass (technical READY != authorized); Nolan's binding order forbids SSH-as-substitute. Codex blockedExternal expired 2026-09-17T06:01:00Z (re-verify quota before first grant).

**Authorization boundary: two realities, and they disagree.**
1. Reference adapter (`external_agent_adapter.js`, proven live 2026-09-16/17; ORCA port in ~/workspace/orca-workstream-d/): fail-closed authorizeWorkOrder -> closed 14-field WorkOrder (deterministic work_order_id) -> dispatcher-owned per-family invoker -> verifyResultEnvelope (authorized==invoked==result binding, echo checks, deadline) -> recordVerifiedResult emits WORKER_COMPLETED/WORKER_FAILED via injected eventRuntime only. Event identity solely UnifiedEventRuntime.computeEventId. AGENT_PROFILES is data registration (hermes/codex read-only LIVE, opencode permanently blocked, cloud-subagent/ollama/copilot LIVE).
2. Live runtime: `ping-runtime/external-agent/` does not exist; `mission_activities.js:executeWorkOrder` is a STUB returning canned success. Reference worktree ping-harvest-12h is gone (only local/branch copies remain).

**Two broken boundaries found:** (1) the temporal stub fabricates mission success; (2) a 2026-09-18 Codex Desktop task pushed to public repo ngesk2/crx-runtime beyond its authorized minimal task with no work order, no grant, no event. The 2026-09-16 ledger's "NO CODE CHANGE REQUIRED / properly bounded" conclusion is falsified.

**Minimum adapter (promotion, not rewrite):** one canonical copy of the adapter; wire behind executeWorkOrder (typed failure until wired, never canned success); register hermes + codex read-only profiles only; result_path PING-owned; swarm-14 nsjail as the OS layer; no write/side-effect capabilities in the minimum set (Nolan's surgical-write grant stays human-gated). Codex/Hermes never canonical authorities for mission, identity, memory, events, or capabilities. Stale doc `docs/hermes_operating_protocol.md` (2026-08-06 planning) marked superseded.

## AGENT 15 findings (2026-09-23 ~20:35 MDT, agent 755f7882; full report: swarm-15/AGENT15-CODEX-HERMES-ADAPTER.md)

AGENT 09 output was absent (swarm-09/ empty); designed against the brief's contract shape (PING mission -> execution adapter -> worker -> result/evidence -> PING), which the proven multi-runtime work-order contract implements verbatim. Reconcile when AGENT09-EXECUTION-BOUNDARY.md lands.

**As-is invocation paths (verified live):**
- Hermes: `~/workspace/bin/prompt-hermes.sh "<prompt>"` -> scp prompt to C:/Windows/Temp -> ssh -> `wsl -u nolan -- bash hermes-run.sh` (ephemeral) -> venv python `hermes_cli/main.py -z <prompt>` (cwd .../hermes-agent, 600s timeout). Windows-native, CWD C:\Users\nolan, cannot see WSL/cloud paths. One-shot text executor; filesystem blindness is its current scoping.
- Codex: proven reference `codex exec --ignore-user-config -s read-only --ephemeral --skip-git-repo-check -C <dir> <prompt>` (binary `/mnt/c/Users/nolan/.codex/bin/wsl/<id>/codex`, CODEX_HOME launcher-set). Global approval_policy on-request; `[projects."/home/nolan/ping"] trust_level=trusted`. Desktop task sandbox restricted; a task correctly refused the localhost-SSH bypass (technical READY != authorized); Nolan's binding order forbids SSH-as-substitute. Codex blockedExternal expired 2026-09-17T06:01:00Z (re-verify quota before first grant).

**Authorization boundary: two realities, and they disagree.**
1. Reference adapter (`external_agent_adapter.js`, proven live 2026-09-16/17; ORCA port in ~/workspace/orca-workstream-d/): fail-closed authorizeWorkOrder -> closed 14-field WorkOrder (deterministic work_order_id) -> dispatcher-owned per-family invoker -> verifyResultEnvelope (authorized==invoked==result binding, echo checks, deadline) -> recordVerifiedResult emits WORKER_COMPLETED/WORKER_FAILED via injected eventRuntime only. Event identity solely UnifiedEventRuntime.computeEventId. AGENT_PROFILES is data registration (hermes/codex read-only LIVE, opencode permanently blocked, cloud-subagent/ollama/copilot LIVE).
2. Live runtime: `ping-runtime/external-agent/` does not exist; `mission_activities.js:executeWorkOrder` is a STUB returning canned success. Reference worktree ping-harvest-12h is gone (only local/branch copies remain).

**Two broken boundaries found:** (1) the temporal stub fabricates mission success; (2) a 2026-09-18 Codex Desktop task pushed to public repo ngesk2/crx-runtime beyond its authorized minimal task with no work order, no grant, no event. The 2026-09-16 ledger's "NO CODE CHANGE REQUIRED / properly bounded" conclusion is falsified.

**Minimum adapter (promotion, not rewrite):** one canonical copy of the adapter; wire behind executeWorkOrder (typed failure until wired, never canned success); register hermes + codex read-only profiles only; result_path PING-owned; swarm-14 nsjail as the OS layer; no write/side-effect capabilities in the minimum set (Nolan's surgical-write grant stays human-gated). Codex/Hermes never canonical authorities for mission, identity, memory, events, or capabilities. Stale doc `docs/hermes_operating_protocol.md` (2026-08-06 planning) marked superseded.

### Gateway honesty batch integrated (~03:05 UTC)
8 commits (082-087 MC honesty, 096 P0 demotion fix, 102 promotion gates) merged to tenanos-wave-gateway/integration as 77feb5d09. Writer gates: node-check all files, smoke-require routes, 25/25 gateway tests, 6/6 P0 regression, adversarial greps. Note: 082-087 diffs had corrupt hunk headers; writer fixed and archived corrected versions.
Ledger: 36 proposals, 15 approved, 11 integrated.

### AGENT 15 complete (~03:12 UTC)
Codex/Hermes minimum adapter mapped. Proven-live fail-closed adapter exists (external_agent_adapter.js: authorize → issue → verify → record). Both executors read-only. 15 record-format findings filed.
BROKEN BOUNDARIES: (1) mission_activities.js:executeWorkOrder is a stub returning canned success:true (fabricated outcomes in live path). (2) 2026-09-18 Codex Desktop task pushed to public ngesk2/crx-runtime beyond authorization, no work order/capability/event. FLAG FOR NOLAN MORNING REVIEW: unauthorized public push already occurred; boundary violation as failure class.
Report: swarm-15/AGENT15-CODEX-HERMES-ADAPTER.md

### 092 and 100 integrated (~03:16 UTC)
092 (tenant kit, 5 files, 14/14) merged as 49b7abf7. 100 (bootstrap, 2 files, 9/9) merged as d3821556. Both purely additive.
Ledger: 36 proposals, 15 approved, 13 integrated.

### 098 integrated (~03:19 UTC)
Context-pack assembler (2 files, 12/12) merged as 4b183f8e. Canonical diff header repaired (was malformed). Purely additive.
Ledger: 36 proposals, 15 approved, 14 integrated.

### 012 integrated (~03:21 UTC)
Sandbox profiles (1 file, 416 lines, 14/14 behavior checks, kafel REPRESENTATIVE) merged as cc90f2ba. Purely additive. Follow-up: add jest test file (writer's behavior checks were ephemeral).
Ledger: 36 proposals, 15 approved, 15 integrated.

### 095 integrated (~03:24 UTC)
Run-state authority (3 files, 18/18 tests, tsc strict) merged as db80f142. Writer correctly narrowed schema.sql to reconciliation queue only per 002/095 seam (no second run-identity store).
Ledger: 36 proposals, 15 approved, 16 integrated.

## AGENT 09 findings (2026-09-23 ~21:00 MDT, mission+scheduler+workers lane, read-only)

Full report: `~/workspace/tenanos-wave/swarm-09/AGENT09-EXECUTION-BOUNDARY.md` (17 component records R-01..R-17, adapter design, 9 evidence-backed patches P-09a..P-09i). No new canonical authority proposed.

**Topology (verified, /home/nolan/ping @ refactor/runtime-authority-convergence):**
Business emitters → CanonicalizationService → UnifiedEventRuntime → EventToMissionBridge → MissionRuntime (`ping_missions`) → MissionScheduler (5s poll, maxConcurrent=3) → WorkerRuntime.dispatch (single canonical decider) → 8 canonical JS workers → downstream events recurse through the bridge. DeadLetterAuthority wired on retry exhaustion (max 3, backoff 5s). Composition root: `gateway/bootstrap/gateway_runtime.js`. Website repo (`/home/nolan/projects/ping`) has NO mission/scheduler runtime surfaces — display-only.

**P0 verified:** `renewLease` binds nothing — SQL has no `assigned_to`/token predicate; scheduler Arrow 0 passes only missionId (R-12).

**New broken boundaries found (evidence-backed):**
- R-13: `_dispatch` discards `assign()` rowCount then calls `start()` (needs only `assigned`) → a second scheduler can steal and double-execute a claimed mission.
- R-14: `reapExpiredLeases()` has no fencing token; stale worker `complete()` (checks only `running`) can overwrite a re-claimed mission's result.
- R-15: `reclaimRetryPending()` is a phantom (comment-only, never implemented); `getPending` returns `retry_pending` directly, so `assign`/`start`/`complete` all no-op while the worker STILL RUNS → infinite re-dispatch loop with duplicate downstream events every 5s on the success path.
- R-16: `WorkerRuntime.dispatch` runs ALL matching workers sequentially, returns only the last result (latent — currently 1:1 registrations).
- R-04: capacity-full workers silently skipped; busy masquerades as missing → spurious failWithRetry.
- R-17: `replayDeadLetter` has zero live callers — dead missions are operator-terminal, no canonical replay path.
- R-08: Python worker runtime (preserved, HTTP poll via live `/events/unprocessed|processed|failed` routes) speaks a drifted vocabulary (`DOCUMENT_IMPORTED`, `CLAIM_GENERATED`, `REPLAY_EXECUTED` vs JS `DOCUMENT_IMPORT`/`CLAIM_CREATED`/`REPLAY_COMPLETED`) and drops `metadata` (`metadata=None` — correlation/namespace/confidence lost). No mission/lease/retry/DLQ participation. Must not share the live event stream until adapted.
- Dormant/parallel systems confirmed NOT on live path: Orca ExecutionEngine (instantiated, KEEP-DISABLED per in-code contract), `orchestration/execution/*`, `orchestration/dispatcher.js`, `BackgroundWorkers`/`wiring.js` bootstrap (never called by gateway_runtime), `worker_port.js` LLM ports, dormant `IntelligenceWorker`.

**Execution boundary design (§4 of report):** `MissionScheduler._dispatch` → `ExecutionAdapter.execute(DispatchEnvelope)` → worker (`handle()` → `ResultEnvelope{ok|failed|rejected|busy}`) → scheduler acts. Adapter is ADAPTER-ONLY (priority_boundary.js pattern): no state, no tables, no routing authority. Evidence obligations codify `BaseWorker._emit` (namespace/correlation/causation/confidence preservation, emit-failure-is-worker-failure, no-fabrication rule). Failure semantics: ok→complete, failed/throw→failWithRetry→DLQ, rejected→terminal complete without retry (WitnessWorker precedent), busy→defer (new), no-match→fail (phantom-complete prevention kept).

**Patches P-09a..P-09i** (all to existing components): holder-bound renewLease; abort dispatch on assign rowCount!=1; fencing-token column; implement the missing reclaim; dispatch-cardinality policy; canonical mission-replay adapter over existing `replayDeadLetter`; `{status:'busy'}`; Python vocabulary+metadata adapter; dead-code removals.

**For other agents:** swarm-08 F-01 (competing mission authority) appears addressed — exactly one live mission authority found; recommend closing with this evidence. Agent 01: the bridge→scheduler→worker→event loop is the convergence-critical cycle; R-15 duplicates would pollute the event log. Agent 06: R-13/R-14/R-15 are adversarial failure classes. Agent 02: MC replay button needs P-09f first. Open (needs Nolan): Orca-vs-spine survivor decision; Python runtime keep-as-backend vs mothball.

### AGENT 09 complete (~03:25 UTC)
Execution boundary mapped (mission → adapter → worker → result/evidence → PING). 17 records R-01..R-17. 
P0 CONFIRMED: R-12 renewLease binds nothing (any caller extends any lease); R-13 claim stealable (double-execution); R-14 no fencing token (stale overwrite). R-15 infinite retry loop (reclaimRetryPending never implemented).
9 patches P-09a..P-09i specified (no diffs yet). swarm-08 F-01 CLOSED (single mission authority proven).
NEEDS NOLAN (morning): Orca-vs-spine survivor ruling; Python runtime keep-as-backend vs mothball.
Report: swarm-09/AGENT09-EXECUTION-BOUNDARY.md

### P0 lease proposals filed (~03:27 UTC)
103 (R-12 holder-bound renew), 106 (R-13 abort on rowCount), 107 (R-14 fencing token). Writer dispatched (implements from AGENT 09 spec P-09a/b/c).
Ledger: 41 proposals, 15 approved, 16 integrated.

### Swarm-02 complete, 103 collision resolved (~03:30 UTC)
Swarm-02 filed P-20260923-103 (attempt fencing, 46/46 tests). Collided with coordinator's R-12 (also 103). Resolution: swarm-02 keeps 103 (complete diff); R-12 moved to 108. 103 approved, writer dispatched. F-01/F-02 (retry_pending dead state, DLQ sink throws) recorded in FAILURE_LEDGER.
Ledger: 42 proposals, 16 approved, 16 integrated.

### Security worker complete, 104/105 approved (~03:32 UTC)
D1 (Kit webhook) and D2 (resource download) P0s confirmed live. Diffs: 104 (2 files, 6/6 regression), 105 (3 files, 4/4 regression). Both approved, writer dispatched (isolated worktree, website repo).
Ledger: 42 proposals, 18 approved, 16 integrated.

### 103 integrated (~03:35 UTC)
Attempt fencing (3 files, 46/46 tests) merged as 218db490. Purely additive.
Ledger: 42 proposals, 18 approved, 17 integrated.

### 104/105 written, ready for review (~03:38 UTC)
Security P0s (Kit webhook HMAC, resource-download auth) committed on tenanos-wave/P-20260923-104-105-security (9ca7d043, 1df0f98c). Writer repaired canonical diffs (missing new file mode). Status: written, NOT integrated — website repo is Nolan's FYD work area; merge decision belongs to Nolan/constitutional sprint.
Ledger: 42 proposals, 18 approved, 17 integrated, 2 written (104/105).

### P0 lease fixes integrated (~03:48 UTC)
108 (holder-bound renew), 106 (abort on rowCount), 107 (fencing token) merged as 870069ca7. All gates pass (10/10 lease, 8/8 lifecycle, 11/11 invariants, etc.).
Ledger: 42 proposals, 18 approved, 20 integrated, 2 written (104/105).

### WAVE CLOSE-OUT - INT-FINAL (2026-09-24 ~06:30 MDT / 12:30 UTC)

Branch tips (read-only verified on the Pig, never pushed):
- PING repo /home/nolan/projects/ping: tenanos-wave/integration @ 51d4a187
- Gateway repo /home/nolan/ping: tenanos-wave-gateway/integration @ 63ad28388
Every commit SHA recorded in STATE.json verified via `git cat-file -t` on the Pig.

PING integration (INT-PING worktree, final tip 51d4a187):
- Integrated (15): 002 (b769ba5d, 22/22), 003 (0798f869, 15/15), 004 (1b653b35, 20/20),
  005 (b526b352, 16/16, src/tenanos/checkpoints/schema.ts), 006 (c716deb9, 14/14),
  007 (a0b44816, 4/4), 008 (e72ad4ad, 9/9, FL-E3-03 supersession guard),
  009 (9cb4ad65, 6/6), 011 (25873a5b, 10/10), 013 (da6533e6, 15/15),
  014 (47764b5a, 8/8), 090 (fcf3859f, 11/11), 093 (ca8946d4, 12/12),
  094 (805d0213, 29/29), 101 (51d4a187, 8/8).
- Merged-tree gates: scoped jest 20 suites / 234 tests all pass; strict tsc clean over src/tenanos/**.
- 103: duplicate_already_on_branch (merged at 218db490, not re-applied; apply-check confirms all 3 files already present at 51d4a187).

Gateway integration (INT-GW, tip 63ad28388):
- Integrated (5): 097 (3cb7a77c3, 12/12 test_evidence_authority.js),
  099 (b7f1f78d0, tsc strict + 23/23 jest),
  109 (5c671369e, 5/5 test_ops_time_authority.js),
  110 (ed4371b13, 5/5 test_orchestration_time_authority.js),
  088 (two-stage: BLOCKED-088 on the behavior gate, then integrated at 76f030cd8 with fixture-fix follow-up 63ad28388).
- 088 detail: 8 URL assertion changes (T5, T6, OB-1..OB-6, all ?tenant=acme; no logic weakened) + 4 fixture namespace additions (mission payload namespace for T6; replayEvt/witnessEvt/witnessRejected top-level namespace for OB-4).

Rejected:
- 010: rejected (non-conforming duplicate of 090; throw semantics violate the standing typed BUDGET_EXHAUSTED decision). Delta 1 folded in (OmniRoute non-authority header line on budgets.ts at 090's integration); delta 2 (cost dimension) OPEN, needs a coordinator call.
- 081: rejected_from_wave (one-owner rule; constitutional sprint owns /home/nolan/projects/constitutional-runtime; sprint has not acted; routing via INBOUND-FROM-TENANOS-WAVE.md stands).

Untouched (reserved for Nolan): 104, 105 remain `written` on tenanos-wave/P-20260923-104-105-security (website repo, his FYD work area); merge decision is his. Byte-identical before/after this worker.

Repairs made at integration time (all semantics-preserving):
- 093: integrated from diffs/P-20260923-093.rebased.diff (v2026-09-24.1-rebased), not the original; repaired unterminated doc comment + 5 missing commas.
- 094: de-nested verification/verification/ to verification/; tests converted to jest under src/tenanos/__tests__/; 3 tsc-strict type errors repaired.
- 101: diff_ref repointed to diffs/P-20260923-101.restored.diff (the named diffs/P-20260923-101.diff was never staged); test relocated to src/tenanos/__tests__/.
- 090: added the "OmniRoute quota is not a budget authority (fail-open B16)." header line.
- 013: isDeadExecutor delegates to canonical 006 isOverdue; mirrored predicate removed.
- 007/093 seam: GrantResolver stays 007's single grant-resolution interface; 093 is classification Lookup + fail-closed guard.
- 088: fixed backticks-in-template-literal SyntaxError and trace.forbidden null-deref (404s had become 500s).

C1 durable checkpoint re-run against canonical 005: PASS.
- Isolated Pig worktree /home/nolan/tenanos-c1-tree (detached at 51d4a187); canonical src/tenanos/checkpoints/schema.ts tsc-compiled into the test dir (module never modified).
- Key finding: the old inline record shape is REJECTED by the canonical validator (CheckpointSchemaError), so the harness now builds canonical records (decimal checkpoint_id, values as {$ref}, versions_seen lineage) and validates fail-closed pre-persist.
- 5/5 tests PASS, two consecutive runs (3.3s, 2.3s), EXIT=0 both.
Report: scratch/checkpoint-test/RERUN-REPORT.md.

Merged-state spot checks (read-only, at tips):
- (a) `generated_runtime_authoritative: true` on gateway tip: only gateway/routes/constitution.js:113 (computed boolean with real backend proof, out of 109's scope). PASS.
- (b) src/tenanos/runs/schema.ts on PING tip: attempt_id TEXT PRIMARY KEY. PASS.
- (c) Base CREATE TABLE tenanos_run_attempts present (RUN_IDENTITY_SCHEMA_SQL); the 103 ALTER ADD COLUMN IF NOT EXISTS is not dangling. PASS.

Residual debt (carried forward, not closed):
- OB-8 pre-existing failure (test_replay_observability.js): fails on pristine tip too (services object missing replayProvider); unrelated to tenant gating.
- 088 follow-ups: Orca scheduler GETs (/stats, /pending, /active in missions.js) intentionally left ungated until the scheduler is tenant-aware; repository_dead_letters has no tenant column (per-tenant DLQ views need column + backfill migration).
- FL-E4-002 / FC-C1-03: cross-process SQL atomicity (fencing conditional UPDATE) unproven; filesystem surrogate tested, no Postgres available in this environment.
- 104/105 parked for Nolan (untouched by this worker).

Ledger: 44 proposals, 39 integrated, 2 written (104/105), 1 rejected (010), 1 rejected_from_wave (081), 1 duplicate_already_on_branch (103).
STATE.json merged by INT-FINAL (sole writer); backup at /tmp/STATE.json.bak-int-final.
No pushes made by any wave worker; no repo commits by INT-FINAL (read-only on repos).
