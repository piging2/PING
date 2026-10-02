# S5 — SEMANTIC AUDIT: core missions/ + mcp/ + intent/ + intents/ + mission_control_*
Worker: S5 (core missions + MCP + intent). READ-ONLY; COMMITS CREATED: NONE. PROPOSE ONLY.
Date: 2026-09-23 ~20:05-20:45 MDT. Base: /home/nolan/ping @ refactor/runtime-authority-convergence (HEAD cc6856c, 4 dirty files noted in F14). Transport: ssh pigwsl stdin-fed. Raw scan outputs: ~/workspace/constitutional-sprint/fleet/semantic/s5-scratch/scan*.out
Scope boundary: Agent 08 owns mission→patch→commit pipeline mechanics (noted, not duplicated).

## TRACE SUMMARY (DEFINED → IMPORTED → CONSTRUCTED → INITIALIZED → STARTED → REGISTERED → CALLED → PERSISTING → READ BACK → RESTARTED → TESTED)

LIVE spine (verified wired): UnifiedEventRuntime.emit → EventToMissionBridge (subscribed in bootstrap, ping-runtime/orchestration/event_to_mission_bridge.js:95-154) → MissionRuntime.create → ping_missions (Postgres) → MissionScheduler (5s poll) → MISSION_WORKER_MAP label → WorkerRuntime.dispatch(eventTypes match) → 8 canonical workers (canonical_workers.js) → CanonicalWorker._emit → UnifiedEventRuntime.emit → ping_events. Replay arrow: REPLAY_VERIFY → ReplayWorker → KernelReplayExecutionProvider → gateway/replay/kernel/deterministic_replay_engine.js (real JS, EXISTS — see F12 correction).
DORMANT/ORPHAN: mcp/ping_mcp_server.py (no transport, no backend, no importers); runtime/supervisor.py (0 callers); runtime/cognitive/supervisor.py (reachable only via dormant brainos lane); gateway/tool_authority.js (0 importers); gateway/mission_authority_v2.js (0 importers); gateway/automatic_mission_generator.js (0 importers); ping-runtime/temporal/ (0 external importers); mission_control_*.py + brainos mission_control/app.py (not running, not mounted); ExecutionEngine/Orca (initialized + route-mounted at /orchestration but declared NOT the spine); intent/ vs intents/ registries (singular read by scripts; plural read by test-only generators).

## FINDINGS — shared-record rows

### F1 — Unauthenticated mission injection → automatic worker execution (LIVE)
- DOMAIN: missions | COMPONENT: gateway/routes/missions.js → MissionRuntime → MissionScheduler → WorkerRuntime
- CLAIM: Mission creation is an authorized capability-gated action.
- EVIDENCE: gateway/routes/missions.js:22 `router.post('/')` reads missionType/payload/priority/createdBy from req.body with NO auth middleware; mounted at /missions (gateway/bootstrap/gateway_runtime.js:802-803). MissionScheduler polls getPending() every 5s (mission_scheduler.js:190-213) and dispatches any pending mission; WorkerRuntime.dispatch (worker_runtime.js:88-112) matches eventTypes only. grep for authoriz/authenticate/permission across both files returned only comments + register()/getStats() lines.
- CALLER: any HTTP client reaching the gateway | CALLEE: missionRuntime.create | WRITER: unauthenticated caller | READER: MissionScheduler._poll | AUTHORITY: NONE
- CLASSIFICATION: LIVE / BROKEN BOUNDARY (authorization at tool-call/mission-creation time absent)
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: yes — mission creation bypasses capability checks entirely; missions are work units that trigger worker execution within one poll cycle.
- DEPENDENCIES: MissionRuntime, MissionScheduler, WorkerRuntime, canonical workers | AFFECTS AGENTS: Agent 08 (pipeline continues past here), Agent 06 (capability/auth)
- WHY→EVIDENCE→MINIMUM CHANGE→TEST→RESULT: WHY: unauthenticated party can queue arbitrary work (e.g. CUSTOMER_ONBOARD with crafted payload) that workers execute automatically. EVIDENCE: above. MINIMUM CHANGE: gate POST /missions behind the same authn/authz the gateway uses elsewhere (or restrict to localhost/trusted network + require createdBy identity), AND have MissionScheduler reject missions whose mission_type is not in MISSION_WORKER_MAP (currently it skips with a log line — keep skip, add event). TEST: unauthenticated POST /missions → expect 401/403; authenticated POST → 200 and mission dispatched. RESULT: not tested (propose-only).

### F2 — capabilities[] registered on workers but never consulted (LIVE)
- DOMAIN: missions | COMPONENT: ping-runtime/workers/worker_runtime.js
- CLAIM: Workers are authorized against their registered capabilities before dispatch.
- EVIDENCE: register() stores capabilities (worker_runtime.js:38); they are surfaced in getStats() (line 122) only. dispatch() (lines 88-112) checks `entry.eventTypes.length > 0 && entry.eventTypes.includes(eventType)` and concurrency — no capability predicate anywhere in the file.
- CALLER: MissionScheduler._dispatch | CALLEE: entry.worker.handle(event) | WRITER: — | READER: getStats consumers | AUTHORITY: none (field exists, unenforced)
- CLASSIFICATION: LIVE / DEAD FIELD (authorization theater)
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: yes — capability registry (orchestration/execution/capability_registry.js + dirty capability_registry.json) is disconnected from the live dispatch path.
- DEPENDENCIES: canonical workers, capability_registry.json | AFFECTS AGENTS: Agent 06
- WHY→EVIDENCE→MINIMUM CHANGE→TEST→RESULT: WHY: a field named "capabilities" that never gates is worse than no field — it invites false trust. EVIDENCE: above. MINIMUM CHANGE: either (a) add a capability predicate to dispatch() (mission metadata declares required capability; worker's registered capabilities must include it) or (b) delete the capabilities option + getStats field and document eventTypes as the sole routing key. TEST: register worker with eventTypes matching but capabilities mismatching mission requirement → expect dispatch refusal under (a). RESULT: not tested (propose-only).

### F3 — ToolAuthority (the only permission-checked tool caller) is dormant and fail-open (DORMANT)
- DOMAIN: mcp/tool-calling | COMPONENT: gateway/tool_authority.js
- CLAIM: Tool calls are permission-checked at call time.
- EVIDENCE: 388-line ToolAuthority with getToolManifest(mission) reading mission.allowed_tools + _checkToolPermission on executeTool (lines 104-134). ZERO importers (grep over gateway/, ping-runtime/). _checkToolPermission: `if (!this._permissionAuthority) return { allowed: true }` — fail-open. No permission_authority implementation exists anywhere (ls exit=2).
- CALLER: none | CALLEE: tool.implementation | WRITER: — | READER: — | AUTHORITY: none (name only)
- CLASSIFICATION: DORMANT / FAIL-OPEN DESIGN / ORPHAN
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: yes — the one tool-calling authority with authz is unwired; its design defaults to allow-all.
- DEPENDENCIES: none live | AFFECTS AGENTS: Agent 06, S6 (MCP-adjacent)
- WHY→EVIDENCE→MINIMUM CHANGE→TEST→RESULT: WHY: resurrecting this file as-is creates allow-all tool execution. EVIDENCE: above. MINIMUM CHANGE: make _checkToolPermission fail-closed (no permissionAuthority → {allowed:false}), implement or delete PermissionAuthority, and either wire ToolAuthority into the live worker path or delete it (classify history: archive, don't delete silently). TEST: executeTool without permissionAuthority → expect throw, not success. RESULT: not tested (propose-only).

### F4 — VerifyReplay mission "completed" is a commit-time stamp, not runtime verification (FAKE VERIFICATION)
- DOMAIN: missions | COMPONENT: missions/VerifyReplay/{mission.yaml, results.json, workspace.json, proofs/execution.json}
- CLAIM: mission.yaml status:"completed" + results.json claim a completed, evidence-backed VerifyReplay mission.
- EVIDENCE: committed 2026-07-05 in d596aa596 ("feat(kernel): freeze constitutional replay kernel"). Cited evidence proofs/replay-proof.json does NOT exist (ls proofs → no such dir). Cited authority "ReplayAuthority" has no Python implementation (runtime/authorities/ has no replay authority; the live ones are gateway/replay_authority.js + gateway/replay/kernel/). Cited implementation "runtime/kernel/replay" — the live JS replay engine is at gateway/replay/kernel/ (runtime/replay/ does not exist at all — see F12). proofs/execution.json is just {"mission":"VerifyReplay","status":"completed"}. The only test referencing the mission (tests/test_mission_graph.py) asserts the graph-builder output contains the mission's name/authorities — self-referential, proves the builder not the mission. No test ever executed the mission's claimed verification.
- CALLER: scripts/workspace_builder.py (artifact author) | CALLEE: — | WRITER: freeze commit | READER: scripts/mission_graph.py, tests/test_mission_graph.py | AUTHORITY: none
- CLASSIFICATION: FAKE VERIFICATION / COMMIT-TIME ASSERTION (classify history: keep as record of the freeze, but fix the status claim)
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: yes — "completed" status with no attached proof or execution record.
- DEPENDENCIES: scripts/workspace_builder.py, scripts/mission_graph.py | AFFECTS AGENTS: Agent 20 (competing proposals), Agent 03 (replay)
- WHY→EVIDENCE→MINIMUM CHANGE→TEST→RESULT: WHY: a "completed" verification mission with no proof file or execution record pollutes the convergence map. EVIDENCE: above. MINIMUM CHANGE: either attach the real proof (run the replay determinism suite against gateway/replay/kernel and store the certificate as proofs/replay-proof.json) or change mission.yaml status to an honest value (e.g. "frozen-unverified") with a note. TEST: after attach, tests/test_mission_graph.py + a new proof-existence assertion pass. RESULT: not tested (propose-only).

### F5 — Two parallel intent registries: intent/ vs intents/ (DUPLICATE)
- DOMAIN: intent | COMPONENT: intent/*.intent.yaml (8 files) vs intents/*/intent-manifest.yaml (20 dirs)
- CLAIM: one canonical intent registry ("The registry is machine-readable… canonical entry point for navigation" — intent/README.md).
- EVIDENCE: intent/ schema: intent/owner/spec/implements/produces/consumes/depends_on/forbidden/proofs — read by scripts/intent_graph_builder.py:24-29 (ROOT/"intent" glob *.intent.yaml) + intent-map.yaml. intents/ schema: intent/mission/authority/capabilities/owns/consumes/produces/specifications/evidence/status/action — read by gateway/generated/{event,deployment,state_machine,workflow}_generator.js whose only consumers are gateway/test_wave2_*.js (dormant). Same domains claimed divergently: capability → intent/ says implements runtime/authorities/authority_router.py; intents/capability says owns runtime/kernel/capability/ICapabilityAuthority.ts, evidence "PROVEN — interface only, no concrete implementation", status missing_implementation. execution → intent/ says owner ExecutionAuthority, forbidden subprocess; intents/execution says authority ExecutionContextBuilder, owns runtime/kernel/execution/*.ts, status mostly_intact.
- CALLER: intent_graph_builder.py (singular) / gateway/generated/* (plural) | CALLEE: — | WRITER: past sprint waves | READER: intent_cli.py, mission_graph.py (singular); test_wave2_* (plural) | AUTHORITY: none (neither is enforced at runtime)
- CLASSIFICATION: DUPLICATE / DIVERGENT REGISTRIES
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: partial — consumers that read one registry see a different authority map than the other.
- DEPENDENCIES: scripts/intent_*.py, gateway/generated/* | AFFECTS AGENTS: Agent 14 (semantic), Agent 20
- WHY→EVIDENCE→MINIMUM CHANGE→TEST→RESULT: WHY: two "canonical entry points" with conflicting authority claims. EVIDENCE: above. MINIMUM CHANGE: pick one as canonical (recommend intent/ — it has live consumers in scripts/), mark the other historical, and port the intents/ evidence/status/action annotations (they carry forensic value, e.g. "6 competing capability systems") into the canonical one. TEST: intent_cli + mission_graph outputs unchanged; no consumer of intents/ remains except tests. RESULT: not tested (propose-only).

### F5b — intent/execution.intent.yaml forbids subprocess; its implementation IS subprocess (INTENT VIOLATION)
- DOMAIN: intent | COMPONENT: intent/execution.intent.yaml vs runtime/authorities/execution_authority.py
- CLAIM: forbidden: [subprocess].
- EVIDENCE: intent/execution.intent.yaml: forbidden: subprocess, implements: runtime/authorities/execution_authority.py. execution_authority.py:59 `self.adapter = adapter or SubprocessExecutionAdapter()` — the default adapter is literally SubprocessExecutionAdapter; run_command/run/run_docker all go through it. Used by runtime/tool_router.py + runtime/supervisor.py.
- CALLER: tool_router.py, supervisor.py | CALLEE: SubprocessExecutionAdapter.execute | WRITER: — | READER: — | AUTHORITY: ExecutionAuthority (violates its own intent)
- CLASSIFICATION: LIVE / INTENT VIOLATION
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: yes — intent forbids what the implementation defaults to.
- DEPENDENCIES: runtime/authorities/execution_authority.py | AFFECTS AGENTS: Agent 06
- WHY→EVIDENCE→MINIMUM CHANGE→TEST→RESULT: WHY: the intent registry makes a falsifiable claim that is false. EVIDENCE: above. MINIMUM CHANGE: either remove `forbidden: subprocess` from the intent (if subprocess-via-authority is the accepted design) or introduce a non-subprocess default adapter. TEST: test_runtime_authority_boundaries.py passes + intent validation (scripts/intent_validation.py) run against the updated intent. RESULT: not tested (propose-only).

### F6 — ExecutionEngine (Orca) initialized + route-mounted alongside the live spine (DUPLICATE LIVE SYSTEMS)
- DOMAIN: missions | COMPONENT: ping-runtime/orchestration/execution/engine.js + gateway/bootstrap/gateway_runtime.js:339-340,657,792-793
- CLAIM: "Single canonical mission system" (mission_runtime.js header: "Replaces 12 dead mission implementations").
- EVIDENCE: bootstrap constructs `new ExecutionEngine()`, awaits initialize({discoverOllama:false}), and mounts /orchestration routes on it — while its own comment (lines 330-336) says "Orca is a parallel execution authority, NOT the production spine… Keep DISABLED until an explicit Orca-vs-live-spine convergence decision is made." It is NOT disabled. Meanwhile gateway/ still holds mission_authority.js, mission_generator.js, automatic_mission_generator.js (674 lines, ZERO importers — its repository_events writers at lines 595/624/653 never fire), mission_planner.js, mission_execution_authority.js, mission_rule_authority.js, mission_event_bus.js, mission_authority_v2.js (0 importers), gateway/repositories/mission_repository.js. The "12 dead" were not replaced; new systems were added on top.
- CALLER: bootstrap | CALLEE: /orchestration routes | WRITER: — | READER: any HTTP client | AUTHORITY: contested (two systems)
- CLASSIFICATION: DUPLICATE / DIVERGENT LIVE WIRING
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: yes — standing invariant 8 (one authority per decision).
- DEPENDENCIES: gateway routes, ping-runtime/orchestration/* | AFFECTS AGENTS: Agent 08, Agent 20
- WHY→EVIDENCE→MINIMUM CHANGE→TEST→RESULT: WHY: two mission-execution systems share the live gateway; the dead ones were never removed. EVIDENCE: above. MINIMUM CHANGE: honor the existing comment — do not initialize ExecutionEngine until the convergence decision, or formally adopt Orca and retire MissionScheduler/WorkerRuntime. Archive (don't delete) the confirmed-dead generators after proving deadness (no importers + no route mounts + no cron). TEST: gateway boots with only one mission system; /orchestration absent-or-present per the decision; mission flow e2e still works. RESULT: not tested (propose-only).

### F7 — ReplayWorker verifies a single event, not the causal chain (VERIFICATION SCOPE GAP)
- DOMAIN: missions | COMPONENT: ping-runtime/workers/canonical_workers.js:424-443 (_buildReplayEvents)
- CLAIM: REPLAY_VERIFY → REPLAY_COMPLETED verified:true means the chain verified.
- EVIDENCE: _buildReplayEvents returns [triggering event] only; the Postgres correlation-group query (SELECT … WHERE metadata->>'correlation_id' = $1) is a code comment: "In production, this would query Postgres… For now, return the triggering event as a single-event replay." The kernel engine itself is real (gateway/replay/kernel/deterministic_replay_engine.js) and violations are genuinely evaluated — for ONE event. WitnessWorker then attests REPLAY_COMPLETED. Chain-level claim rests on single-event evidence. The code is honest about the gap (not fake — partial).
- CALLER: ReplayWorker.handle | CALLEE: KernelReplayExecutionProvider.executeReplay | WRITER: — | READER: WitnessWorker | AUTHORITY: ReplayAuthority (gateway)
- CLASSIFICATION: LIVE / PARTIAL (honest gap, not fabrication)
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: partial — chain-verification semantics overclaim single-event verification.
- DEPENDENCIES: ping_events, MissionRuntime.getTrace (already has the correlation query pattern) | AFFECTS AGENTS: Agent 03, Agent 02 (witness)
- WHY→EVIDENCE→MINIMUM CHANGE→TEST→RESULT: WHY: verified:true on REPLAY_COMPLETED is read downstream as chain verification. EVIDENCE: above. MINIMUM CHANGE: implement the correlation-group Postgres query in _buildReplayEvents (reuse MissionRuntime.getTrace's query), keep the single-event fallback with reason 'single_event_fallback' in the replay record so consumers can distinguish. TEST: REPLAY_VERIFY on a 3-event correlation chain → event_count==3, verified reflects all three. RESULT: not tested (propose-only).

### F8 — mcp/ping_mcp_server.py is not an MCP server and has no backend (DORMANT)
- DOMAIN: mcp | COMPONENT: mcp/ping_mcp_server.py
- CLAIM: "PING MCP Server — Thin proxy to Mission Control" (module docstring).
- EVIDENCE: 215 lines, 12 plain functions doing requests.get to MISSION_CONTROL_URL (default http://mission-control:8000) with NO auth headers and NO MCP protocol (no stdio/JSON-RPC, no tool schema registration); __main__ is a print-based test harness. Zero live importers (only .next build artifacts, presentping configs, research scripts mention "mcp" in passing). Nothing listens on :8000 (curl → 000). The real mission-control surface is gateway/routes/mission_control.js mounted at /mc (read-only: zero POST/PUT/DELETE routes).
- CALLER: none | CALLEE: http://mission-control:8000/* | WRITER: — | READER: none | AUTHORITY: none
- CLASSIFICATION: DORMANT / MISNAMED / ORPHAN
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: no (dormant); latent: credential_inventory() would proxy /credentials/inventory unauthenticated IF a backend existed.
- DEPENDENCIES: none live | AFFECTS AGENTS: S6 (MCP-adjacent), Agent 06
- WHY→EVIDENCE→MINIMUM CHANGE→TEST→RESULT: WHY: the name promises an MCP surface that does not exist; anyone planning "the MCP layer" will read this. EVIDENCE: above. MINIMUM CHANGE: rename/archive as historical proxy sketch; if an MCP surface is wanted, build it on the live /mc + /missions + /events routes with auth. TEST: n/a. RESULT: not tested (propose-only).

### F9 — mission_control surface sprawl: 4 implementations, 1 live (DUPLICATE)
- DOMAIN: mission_control | COMPONENTS: gateway/routes/mission_control.js (LIVE, mounted /mc, 681 lines, read-only — zero POST/PUT/DELETE/PATCH) vs mission_control_knowledge_apis.py (Flask, not running, no bootstrap ref) vs mission_control_authority_endpoint.py (FastAPI stub, self-describes as "does not implement complex resolution logic — that's for Phase E.3", not running) vs brainos/orchestration/src/mission_control/app.py (1614 lines, CORSMiddleware allow_origins=["*"] + allow_credentials=True, not running, not referenced in bootstrap, no brainos processes in ps).
- CALLER: HTTP (only /mc live) | CALLEE: unifiedEventRuntime.query, missionRuntime | WRITER: — | READER: dashboards | AUTHORITY: none (read-only)
- CLASSIFICATION: DUPLICATE / 1 LIVE + 3 DORMANT
- CONFIDENCE: HIGH
- BROKEN BOUNDARY: partial — CORS allow-* in brainos app.py is a latent authz hole if that file is ever started.
- DEPENDENCIES: gateway bootstrap | AFFECTS AGENTS: Agent 12 (observability)
- WHY→EVIDENCE→MINIMUM CHANGE→TEST→RESULT: WHY: four "Mission Control"s invite wiring the wrong one. EVIDENCE: above. MINIMUM CHANGE: archive the two root .py files + brainos app into history (they predate the JS gateway; worktrees/ copies exist for archaeology); keep /mc as the single surface; fix or flag the brainos CORS config if it is ever revived. TEST: /mc/dashboard returns 200 with event-backed numbers; no other mission-control listener on the host. RESULT: not tested (propose-only).

### F10 — Supervisor sprawl: deterministic orphan + LLM supervisor in dormant lane (ORPHAN / DORMANT)
- DOMAIN: intent/tool-calling | COMPONENTS: runtime/supervisor.py vs runtime/cognitive/supervisor.py
- CLAIM: one supervisor runtime.
- EVIDENCE: runtime/supervisor.py (103 lines, "deterministic orchestrator" over runtime/tool_router.py via ExecutionAuthority + subprocess) — ZERO callers found. runtime/cognitive/supervisor.py (259 lines, LLM qwen2.5-coder:14b, WorkerProtocol, ContextPack, workers) — imported only by runtime/cognitive/reasoning_gateway.py and brainos/.../mission_control/app.py (dormant lane). Model output lands in answer["answer"] only; no persistence to ping_events/ping_missions/repository_events on any live path (reasoning_gateway has no gateway route; brainos not running). The 6 Python tools in runtime/tools/ are read-only search tools; tool_router.py whitelists them (fixed TOOL_MAP) — no arbitrary tool execution.
- CALLER: none live | CALLEE: tool_router.py / inference_adapter | WRITER: — | READER: — | AUTHORITY: none
- CLASSIFICATION: ORPHAN (deterministic) + DORMANT (cognitive)
- CONFIDENCE: MEDIUM-HIGH
- BROKEN BOUNDARY: no live model-output-as-fact path found (good). The 2026-09-16/17 live-capture assumption that a supervisor drives the gateway is not supported by current wiring.
- DEPENDENCIES: runtime/tools/*, runtime/authorities/execution_authority.py | AFFECTS AGENTS: Agent 14, Agent 06
- WHY→EVIDENCE→MINIMUM CHANGE→TEST→RESULT: WHY: two supervisors, neither driving the live gateway — anyone wiring "the supervisor" picks wrong. EVIDENCE: above. MINIMUM CHANGE: archive one (recommend keeping cognitive/ as the design direction, archiving the stdin orphan) after confirming no cron/CI invokes runtime/supervisor.py. TEST: grep CI workflows + crons for supervisor.py references → none. RESULT: not tested (propose-only).

### F11 — Namespace privacy boundary is cooperative, not enforced (GAP)
- DOMAIN: missions | COMPONENT: ping-runtime/workers/worker_runtime.js (dispatch sets worker._event) + canonical_workers.js:31-74 (CanonicalWorker._emit preserves namespace from this._event)
- CLAIM: worker emissions preserve the triggering event's namespace (privacy boundary).
- EVIDENCE: works for canonical workers via _emit. A worker that calls unifiedEventRuntime.emit directly bypasses it; ping-runtime/agents/base_worker.js (older generation, 88 lines, used by the zero-importer ping-runtime/agents/replay_worker.js) has no _emit at all. No runtime enforcement — convention only.
- CALLER: canonical workers | CALLEE: UnifiedEventRuntime.emit | WRITER: workers | READER: downstream subscribers | AUTHORITY: none (convention)
- CLASSIFICATION: LIVE / COOPERATIVE BOUNDARY (honest in code, unenforced)
- CONFIDENCE: MEDIUM
- BROKEN BOUNDARY: partial — cross-namespace leak possible via non-cooperative emission.
- DEPENDENCIES: UnifiedEventRuntime, EventGovernance | AFFECTS AGENTS: Agent 06, Agent 02
- WHY→EVIDENCE→MINIMUM CHANGE→TEST→RESULT: WHY: tenant::<id> namespaces are the privacy boundary; convention-only enforcement is a leak path. EVIDENCE: above. MINIMUM CHANGE: have WorkerRuntime.dispatch wrap/validate: workers emit only through a runtime-provided emitter bound to the triggering event's namespace (or EventGovernance.validateEvent rejects namespace mismatch on worker-sourced events). TEST: worker emitting without namespace → event rejected or namespaced automatically. RESULT: not tested (propose-only).

### F12 — Corrections to sibling reports (for coordinator)
- EVENT-FORENSICS §2D cites "event_to_mission_bridge.js:95 (mission creation)" under ping-runtime/events/ — the file does not exist there; it is at ping-runtime/orchestration/event_to_mission_bridge.js (154 lines, verified). Correction only, no behavior change.
- REACHABILITY §2 C5 says "/home/nolan/ping/runtime/replay/ exists but is empty" — it does NOT exist (ls → ENOENT, verified twice). The live JS replay engine is gateway/replay/kernel/ (15 files incl. deterministic_replay_engine.js), reached via gateway/kernel_replay_execution_provider.js:18. The certification tests import ../../runtime/replay/* — they import from a nonexistent path (worse than empty).
- CONFIDENCE: HIGH (direct ls/require-path evidence)

### F13 — Shadow/duplicate mission persistence notes
- Mission state is dual-persisted by design: ping_missions table (MissionRuntime) + MISSION_* events in ping_events (mission_runtime.js:97-100,129-133,148-151,178-181). Not shadow — both are live and getTrace() joins them.
- gateway/automatic_mission_generator.js (dormant, 0 importers) contains repository_events INSERT writers (lines 595/624/653 per event-forensics) that never fire. Orphan producer-side code — archive, don't delete silently.
- CLASSIFICATION: DESIGNED DUALITY (live) + ORPHAN PRODUCER (dormant) | CONFIDENCE: HIGH

### F14 — Dirty worktree state at audit time (integrity note)
- /home/nolan/ping @ cc6856c has 4 dirty files: M gateway/package-lock.json, M gateway/package.json, M ping-runtime/orchestration/execution/capability_registry.json (modified 2026-09-21 13:26, registers opencode:local worker with 12 capabilities incl. orchestration.merge), M tools/fyd-site-projection/dump.py; ?? deliverables/. Runtime state (capability registry) is versioned in git and dirty — convergence decisions about capability_registry.json should treat the file as runtime-state-in-git, not source. CONFIDENCE: HIGH (git status)

## MISSION→PATCH→COMMIT HANDOFF (for Agent 08 — not duplicated)
- No git/child_process usage in canonical_workers.js, mission_scheduler.js, worker_runtime.js, event_to_mission_bridge.js. The git-op seam is gateway/repository_port.js + gateway/simple_git_adapter.js (+ docker_port.js, verify/*) — Agent 08's pipeline audit should trace from WorkerRuntime.dispatch results into those adapters. Note: unauthenticated POST /missions (F1) means any patch/commit path downstream of worker execution inherits the injection.

## SUMMARY
Biggest live risks: (1) POST /missions unauthenticated + auto-dispatch within 5s (F1); (2) no capability authorization anywhere in the live mission path — the capabilities[] field is display-only (F2); (3) the only permission-checked tool authority is dormant AND fail-open (F3). Biggest classification findings: VerifyReplay "completed" is a commit-time stamp with missing proof artifacts (F4); intent/ vs intents/ are divergent duplicate registries (F5); ExecutionAuthority violates its own intent's forbidden:subprocess (F5b); Orca/ExecutionEngine is initialized + route-mounted despite its own comment saying keep disabled, on top of a "replaced 12 dead implementations" claim that left the dead ones in place (F6). Honest-but-partial: ReplayWorker verifies single events not chains (F7); namespace boundary is cooperative (F11). Dormant but named-dangerously: mcp/ping_mcp_server.py (F8), 3 extra mission-controls (F9), 2 supervisors (F10), tool_authority (F3). Corrections for siblings: F12. Integrity: F14.

## NEXT ADJACENT GAP
The identity seam the authority-map flagged (gateway identity_<16hex> vs uuidv5 OIDC vs demo-owner, no bridge) intersects this block at created_by: POST /missions accepts an arbitrary createdBy string with no identity binding, and MissionRuntime stores it verbatim (mission_runtime.js:84). So the unauthenticated mission path (F1) is also an unattributed-action path: missions in ping_missions cannot be attributed to a real principal. The next worker should trace identity→mission→worker attribution end to end: who can claim to be createdBy, whether any audit consumer reads created_by, and whether the three identity namespaces collide in ping_missions/ping_events.
