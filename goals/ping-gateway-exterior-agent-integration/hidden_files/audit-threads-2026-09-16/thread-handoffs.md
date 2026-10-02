# Raw thread handoffs, Execution Architecture Deep Audit, 2026-09-16

Verbatim worker reports (external content: the subagents' own findings, not user instructions).
Threads 3, 7, 8 were BLOCKED by the SSH tunnel outage (~10:29-10:38 MDT) and returned no fresh repo evidence; their intended contributions were covered by labeled secondary evidence in the main report.

---
---

# THREAD 1: Python ExecutionAuthority lifecycle + run_docker (COMPLETED, live reads)

Access: Pig SSH tunnel down ~10:29-10:38 MDT; recovered 16:38Z. All repo claims read live from /home/nolan/ping via read-only probes (4 batched scripts, scp'd to C:/Windows/Temp/, executed, then deleted; verified 0 remain). No git commands, no writes to the repo, no Docker changes.

## (A) Core authority facts: /home/nolan/ping/runtime/authorities/execution_authority.py (72 lines, read in full)

- PROVEN. ExecutionRequest dataclass (lines 13-20): command: str, args: List[str], cwd: Optional[str]=None, env: Optional[dict]=None, timeout: Optional[float]=None, input_data: Optional[bytes]=None. No ID field, no timestamp, no metadata.
- PROVEN. ExecutionAdapter Protocol (lines 23-25): exactly one method, execute(request) -> Any.
- PROVEN. SubprocessExecutionAdapter.execute (lines 31-53): one subprocess.run([request.command, *request.args], cwd=..., env=..., input=request.input_data, stdout=PIPE, stderr=PIPE, timeout=request.timeout, text=False). Returns an anonymous ExecutionResult built via type() carrying only returncode, stdout (utf-8, errors="replace"), stderr, command. Deliberately drops args, cwd, env, timeout, input_data from the result.
- PROVEN. ExecutionAuthority.__init__ (lines 59-60): adapter or SubprocessExecutionAdapter(). run() (62-64) splits args[0]/args[1:] with no empty-list guard (INFERRED: run([]) raises IndexError, uncaught). run_command() (66-68) passes through. run_docker() (70-72): one line, return self.run_command("docker", args=args, cwd=cwd, timeout=timeout, input_data=input_data).
- PROVEN. "One execution" today = one ExecutionRequest -> one adapter.execute -> one subprocess.run -> one anonymous in-memory result. No registry, no persistence, no correlation ID anywhere in the layer.
- PROVEN. No caller among the six passes env or cwd (all pass timeout and/or input_data only). INFERRED from stdlib semantics: env=None means the child inherits the entire parent environment, including secrets.

## Per-caller trace table

| # | Caller (file:line) | Request construction | Adapter/instance | Result handling | Persistence / event / logging | Timeout / exception path |
|---|---|---|---|---|---|---|
| 1 | runtime/supervisor.py:26-38 (call_tool) | Fresh ExecutionAuthority() per call; run_command('python', [TOOL_ROUTER], timeout=30, input_data=<tool+args JSON>) | Default adapter | returncode != 0 -> {'error': stderr}; json.loads(stdout); success flag checked | None. No logger imported. Error dicts folded into in-memory tool_outputs, printed as final JSON. | PROVEN gap: no try/except around the authority call. TimeoutExpired (30s) or OSError propagates uncaught -> crashes main() (which only guards json.load, lines 89-94). |
| 2 | runtime/tool_router.py:29-42 (run_script, default timeout=15) | Fresh ExecutionAuthority() per call; run_command('python', [path], timeout=timeout, input_data=<args JSON>) | Default adapter | returncode != 0 -> {'error': stderr}; json.loads(stdout) | None. main() prints {'success': True/False} to stdout. | PROVEN: blanket except Exception -> {'error': str(e)} (line 41). Timeout (15s) is caught and survives as an error dict. |
| 3 | runtime/cognitive/worker_protocol.py:39-56 (WorkerProtocol.call_tool, static, default timeout=30) | Fresh ExecutionAuthority() per call; run([sys.executable, path], timeout=timeout, input_data=<args JSON>) | Default adapter | returncode != 0 -> {'error': stderr[:500]}; json.loads(stdout) | None. | PROVEN dead handler: except TimeoutError (line 51) is unreachable for real subprocess timeouts. Verified live on the Pig's Python 3.14.4: issubclass(subprocess.TimeoutExpired, TimeoutError) -> False; MRO is TimeoutExpired -> SubprocessError -> Exception. Timeouts fall to generic except Exception -> same {'error': str(e)} shape, but the intended timeout message never fires. |
| 4 | runtime/constitutional_event_loop.py:57-71 (run_psql_query) | Fresh ExecutionAuthority() per query; run_docker(['exec', 'brain-postgres', 'psql', '-U','postgres','-d','crx_runtime','-t','-c', query], timeout=30) | Default adapter | returncode != 0 -> logger.error(stderr) -> None; else stdout.strip() | Side-effect persistence only: fetch_unprocessed_events (74-115) parses psql output into Events; mark_event_processed (118+) INSERTs into event_processing. Execution itself is never logged or stored. | PROVEN: all exceptions -> logger.error -> None. Fetch failure -> [] (loop idles); mark failure -> silent. |
| 5 | runtime/constitutional_runtime.py:37-51 (run_psql_query) | Identical shape to #4; run_docker([...psql...], timeout=30) | Default adapter | Same as #4 | Same as #4, plus mark_event_failed (122-144). process_event (147-164) ignores mark_event_processed's return value (line 156). run_runtime_loop (167-214): batch 10, SLEEP_INTERVAL=0.5s. | Same as #4. |
| 6 | projection_replay.py:82-93 (ProjectionReplay.run_psql_query) | Module-level singleton EXECUTION_AUTHORITY = ExecutionAuthority() (line 32) - the only caller that reuses an instance | Default adapter | Same shape | Read events from PG -> rebuild Qdrant projections. | PROVEN: no timeout passed (line 86) -> subprocess.run(timeout=None) can block forever. Minor: line 85 builds an unused cmd list, then re-specifies args inline on line 86. |

## Nesting, fan-out, correlation (all PROVEN from code)

- Executions nest: YES. supervisor.call_tool spawns python tool_router.py as a subprocess (supervisor.py:29); inside that process tool_router.run_script spawns python <tool_script> as a subprocess (tool_router.py:34). Two-level subprocess nesting, each level constructing its own fresh ExecutionAuthority.
- One higher-level operation invokes multiple tool scripts: YES. supervisor.build_context_from_tools (supervisor.py:52-69) loops DEFAULT_TOOLSET (6 tools, 4 without artifact_id) sequentially -> one supervisor run = up to 6 router execs + 6 tool execs = 12 subprocess executions. No aggregate timeout; INFERRED worst case ~6x30s=180s.
- Implicit correlation ID: NONE. ExecutionRequest has no ID; no caller generates one; no invocation is logged (only failure stderr in the two DB loops). Higher-level run/mission/job concepts exist but are not plumbed in: mission_id appears in scripts/ machinery (knowledge_event_bus.py:105, constitutional_planner.py builds a "VerifyReplay" mission plan, mission_scoring.py, worktree_executor.py); WorkerTask.task_id exists but call_tool is a static method that never takes a task (and send_task returns error="not_implemented", worker_protocol.py:59-70); the event loops correlate via event_id in the DB event_processing table, but the psql docker exec invocations themselves are untracked - if the exec dies after dispatch but before the mark, the event is silently reprocessed next poll (INFERRED from code mechanics).
- Timeout semantics: enforced by subprocess.run(timeout=...) which kills the child then raises subprocess.TimeoutExpired. INFERRED (stdlib behavior, not repo-verified): partial stdout/stderr attached to the exception object is discarded - the adapter has no except clause and no caller inspects it (PROVEN absence of any .output/partial handling).
- Cancellation semantics: NOT DEFINED. No cancel API, no signal handling, no process-group management; all calls are blocking/synchronous. PROVEN absent.
- stdout/stderr capture: PROVEN. Both PIPEd, decoded utf-8 with errors="replace".
- Exit-code semantics: PROVEN. Raw returncode returned; every caller treats != 0 as failure. No special-casing of signal deaths (negative codes) or of specific codes.
- Exception semantics: PROVEN per caller (table above). Adapter-level: TimeoutExpired, OSError (missing binary), IndexError (empty args) all propagate raw from execute. Only the test file injects custom adapters; all six production call sites use the default (also PROVEN: scripts/constitutional_planner.py:37 is only a plan-graph node label {"kind": "Authority", "name": "ExecutionAuthority"}, not a call site).
- Partial side effects: possible and only partially visible. A child killed on timeout may already have committed DB writes via psql or tool-script effects; callers see only stderr-on-nonzero or an exception. In the event loops, a timeout mid-INSERT is indistinguishable from a clean empty result, so at-least-once reprocessing (duplicates) is possible. INFERRED from code mechanics, graded accordingly.

## (C) run_docker verdict: LIVE convenience wrapper, not dead, not an adapter backend

- PROVEN implementation: run_docker is a one-line wrapper (execution_authority.py:70-72) delegating to run_command("docker", ...). The ExecutionAdapter protocol exposes only execute(request); no DockerExecutionAdapter class exists anywhere; run_docker is not an adapter target.
- Starting evidence was wrong: run_docker HAS callers. runtime/constitutional_event_loop.py:61 and runtime/constitutional_runtime.py:41, both inside run_psql_query helpers doing docker exec brain-postgres psql -U postgres -d crx_runtime -t -c <query>. Plus a test: tests/test_runtime_authority_boundaries.py:85-100 (test_execution_authority_can_wrap_docker_commands) asserts the wrapper yields command="docker" with args preserved. projection_replay.py:86 calls run_command('docker', ...) directly, proving run_docker is pure sugar.
- PROVEN semantics: args pass straight to the docker CLI; nothing in code sets mounts, env, network, or resource limits. The only docker usage in-repo is docker exec into the existing brain-postgres container, so container-level sandboxing is external config, not code.
- Security assumptions (PROVEN code shapes; risk graded INFERRED): (1) SQL is f-string-interpolated into the psql command - event_id at constitutional_event_loop.py:123-124 and constitutional_runtime.py:102-103, LIMIT {limit} at :84/:64, error text escaped only via .replace("'", "''") in mark_event_failed. (2) psql is invoked with -U postgres, no -h, no PGPASSWORD env passed - relies on in-container trust/peer auth (INFERRED); the POSTGRES_PASSWORD = "postgres" module constants (event_loop.py:52, runtime.py:33) are defined but never used in the exec args. (3) Child inherits the full parent environment (no env passed).
- Liveness: not dormant. The two loops call it on every poll (SLEEP_INTERVAL 1.0s / 0.5s). Daemon state verified live and read-only this session: docker ps shows brain-postgres (postgres:15-alpine) Up 26 minutes, Docker server 29.5.3 - so the exec path currently works.

## CONTRADICTIONS (surfaced, not resolved)

1. "All subprocess and child-process execution flows through this authority" (module docstring, lines 1-5) is FALSE. PROVEN by grep (excluding .git/, worktrees): at least 10 other files import/use subprocess directly - constitutional_completion_audit.py:15,31; generate_schema_reality.py:9,29; destructive_recovery_certification.py:13; tools/projection_sovereignty_audit.py:17,41 (with shell=True); context_pack_builder.py:13,25; test_event_ingestion.py:7,47,58 (shell=True); constitutional_completion_audit_simple.py:13,28; secret_audit.py:6,50; _test_lineage.py:6; _test_pipeline.py:6,23.
2. "Single authority for all execution transport decisions" (class docstring, line 57) vs. reality: 5 of 6 production call sites instantiate a fresh ExecutionAuthority() per invocation; only projection_replay.py uses a module singleton. There is no shared instance, no registry, no state - the "authority" is a stateless constructor call.
3. Falsy-success in run_psql_query: successful INSERT/UPDATE via psql -t returns "" -> mark_event_processed returns False / logs nothing, identical to a real failure (None). PROVEN (constitutional_runtime.py:98-120, constitutional_event_loop.py:118-140). Callers ignore the return anyway (runtime.py:156, event_loop.py:176).
4. Two near-duplicate constitutional loops - constitutional_event_loop.py (251 lines, 1.0s sleep) and constitutional_runtime.py (230 lines, 0.5s sleep) implement the same fetch/mark/dispatch/loop shape. Which is canonical is NOT PROVEN.
5. Aspirational adapter claim: docstring says "Temporal and other backends are adapters behind the same interface." No Temporal adapter was located in this audit's search scope (adapter greps only) - NOT PROVEN either way; flagging as unverified rather than asserting.

## UNKNOWNS (NOT PROVEN)

- Whether supervisor.py / tool_router.py / worker_protocol.py are executed in production at all (static audit only; no process inventory).
- Which of the two constitutional loops is the live one (no deployment manifest checked).
- Whether brain-postgres trust-auth is intentional (PG pg_hba.conf not inspected; POSTGRES_PASSWORD constant is dead in the exec path).
- Dispatcher handler behavior downstream of dispatch() (out of scope).
- Any historical incidents from env inheritance or the unhandled supervisor timeout (no logs pulled).
- worktrees/agent-smoke-abc123def456/ is a full duplicate copy of the audited files (a container of the same name is running per docker ps) - whether it diverges from main is unknown; excluded from all findings above.

---
---

# THREAD 2: Gateway / Orca mission execution path (COMPLETED, live reads)

## The highest-value finding, first

Orca does NOT bottom out in the Python ExecutionAuthority, nor in any OS execution primitive at all. It is a genuinely separate execution model - in fact it does not execute anything. The "ExecutionEngine" is a prompt-dispatch and consensus-evaluation coordinator. Mission "execution" is delegated to external agents over HTTP: POST /orchestration/missions/:id/dispatch returns prompts to the caller, and the caller (a desktop agent, per the route docstring) is expected to do the actual work and POST /orchestration/missions/:id/output when done. There is no subprocess, container, thread, or Python invocation anywhere in the Orca path. Verified from two independent angles:

Angle 1 - code path analysis (PROVEN). ExecutionEngine.dispatchToAssignment(missionId, completionHandler) (ping-runtime/orchestration/execution/engine.js:177-241) never spawns anything. It builds a prompt via ArtifactRouter, stores a prompt artifact, transitions worker state labels, and only if a completionHandler callback was passed would it hand the prompt off. The only live caller, gateway/routes/orchestration.js:144, calls it without a completionHandler, so the dispatch result is serialized straight into the HTTP response (orchestration.js:149-161). Worker results re-enter only via POST /orchestration/missions/:id/output -> engine.collectWorkerOutput (orchestration.js:179). The engine's own "autonomous loop" confirms the pattern: startAutonomousLoop (engine.js:579-648) fabricates worker output inline (hardcoded {findings:[{file: mission.target||'x', line:0, bypass_type:'auto_scan', confidence:0.85}]} at lines 615-625) and feeds it to collectWorkerOutput. No external process is ever invoked.

Angle 2 - primitive inventory (PROVEN). grep over ping-runtime/orchestration/execution/*.js for child_process|spawn|execFile|execSync|fork|python|docker returns zero hits in the live files. WorkerPort.execute(mission, context) (worker_port.js:113-145) is the only designed injection point (this._executor(mission, context)), but: (a) engine.initialize() registers OpenCodeWorkerPort with executor: null (engine.js:93-97), making execute() return {error:'no_executor'}; (b) no code anywhere assigns a non-null executor; (c) .execute( is never called on any WorkerPort in the repo. OllamaProvider.queryModel (ollama_provider.js:114-150) can HTTP POST to Ollama, but nothing wires it into missions, and boot passes discoverOllama: false (gateway_runtime.js:339) so no Ollama workers even register. The Python ExecutionAuthority (runtime/authorities/execution_authority.py) bottoms out at subprocess.run (SubprocessExecutionAdapter.execute, line ~36) and is imported only by Python files (runtime/supervisor.py, runtime/constitutional_event_loop.py, runtime/constitutional_runtime.py, runtime/cognitive/worker_protocol.py, runtime/tool_router.py). No JS file requires, spawns, or HTTP-calls any Python code (greps for python, child_process, and cross-language localhost HTTP all negative in live paths).

## End-to-end trace (Orca path), with cites

1. HTTP request. POST /orchestration/missions -> gateway/routes/orchestration.js:39-77. Body: {type, target, priority, description, requiredCapabilities, metadata, files}. Auth: NONE (PROVEN) - the mount this._app.use('/orchestration', createOrchestrationRoutes(services.executionEngine)) (gateway/bootstrap/gateway_runtime.js:790-791) applies no auth middleware, and asyncHandler (gateway/route_middleware.js) is logging/error only. Contrast: /events etc. mount under the same _mountRoutes with PG-dependent guards; Bearer enforcement, if any, lives outside this file (not found in gateway/bootstrap/).
2. Mission creation. Ad-hoc object pushed to engine._missions (orchestration.js:69). ID: mission_${Date.now()}_${Math.random().toString(36).slice(2,8)} (orchestration.js:53) - no identity authority involved. Compiler-created missions (from emitGitDiff/compileMissions) instead get deterministic msn_${sha256(type+overrides).slice(0,16)} (mission_compiler.js:180) - two different ID schemes, PROVEN.
3. Worker selection. _executeMission (engine.js:156-175) checks this._workerPorts.findAvailable(cap, 1); Scheduler.schedule/scheduleForConsensus picks workers; WorkerStateMachine.transition(workerId,'assigned'). Registered at boot: exactly one OpenCodeWorkerPort (workerId opencode:local, executor null). This is scheduling of labels, not processes.
4. Dispatch (the "execution" step). POST /orchestration/missions/:id/dispatch -> dispatchToAssignment builds context+prompt per worker, stores a prompt artifact (engine.js:208-215), transitions worker to running, returns {missionId, workers, outputs} with prompt lengths. The response IS the dispatch; the HTTP client is the executor.
5. Worker output / result. POST /orchestration/missions/:id/output (orchestration.js:175-196) -> collectWorkerOutput (engine.js:243-277): produces a proposal artifact, records quality/confidence, checks completion, _resolveMission (engine.js:289-417) runs ConsensusEngine.evaluate, emits chained events, writes consensus + merge-decision artifacts.
6. Persistence. Filesystem JSON only: events -> ping-runtime/orchestration/event_queue/*.json (event_queue.js:7,179-181), artifacts -> ping-runtime/orchestration/artifact_store/*.json (artifact_store.js:5,178). Missions live in the in-memory engine._missions array - lost on restart (PROVEN; no mission persistence in Orca).

## Identity findings

- Orca mission IDs: route-created mission_<epochMs>_<rand6> (non-deterministic, non-authoritative); compiler-created msn_<sha16> (content-deterministic). INFERRED: neither is collision-safe or issued by an authority; route IDs are timestamp+random, compiler IDs can collide across different runs of identical input.
- Orca worker IDs: static strings (opencode:local; ollama:<model> if discovered). Event IDs: content-hash sha256(eventType+data) 16-hex with in-memory dedup set (event_queue.js:55-61).
- Python world identity: runtime/authorities/identity_authority.py:78-96 - IdentityAuthority.generate_id() uses uuidv7 (PG-backed SELECT uuidv7() when available, pure-Python fallback), plus generate_deterministic_id (uuid5) and generate_short_id. The JS gateway has its own gateway/identity_authority.js with generateId(prefix, context) - but Orca does not use it.
- Verdict: three separate identity schemes (ad-hoc strings / uuidv7 / generateId), no shared identity authority between Orca and Python (PROVEN by absence of any import/use).

## Lifecycle events

Orca's EventQueue (event_queue.js:43-97) emits, validates against EventValidator/EventGovernance, dedups by content hash, persists to JSON files, and dispatches to in-process subscribers. Event types observed in code: git_diff, mission_created (mission_compiler.js:127), worker_registered, worker_state_changed, worker_execution_started/completed (only if execute() is ever called - it isn't), worker_completed, consensus_reached/failed, merge_decision_created, mission_accepted/rejected, knowledge_compiled, worker_progress. These are a private event bus - no bridge forwards them to the gateway's canonical PG event store or to the Python world (PROVEN by absence; RepositoryStore/UnifiedEventRuntime are separate objects the engine never touches).

## Worktrees / workspaces / cleanup / retry / timeout / cancellation

- None. Zero hits for worktree/workspace/tempdir/cwd in the Orca execution dir (PROVEN). WorkerStateMachine.isStuck(timeoutMs=300000) / recoverStuckWorkers (worker_state_machine.js:78-91) only flips a state label to 'failed' - there is no process to kill, no retry, no cancellation, no lease. (MissionRuntime in the other JS spine has retries, retry_at, lease_until columns - see Contradictions.)
- The Python ExecutionAuthority accepts timeout per request and WorkerProtocol.call_tool uses timeout=30 (worker_protocol.py:47), mapping TimeoutError to an error dict. Python workers run as authority.run([sys.executable, path], ...) subprocesses with JSON over stdin (worker_protocol.py:46-47) - this is the only real OS-level execution in the whole picture, and it belongs to the Python world only.

## Shared primitives? No. (PROVEN, multiple angles)

| Concern | Orca / gateway JS | Python runtime | Shared? |
|---|---|---|---|
| Execution bottom | nothing (HTTP in/out; fabricated outputs in loop) | subprocess.run([python, tool.py]) | No |
| Event store | in-mem + JSON files (orchestration/event_queue/) | PG crx_runtime (+ docker brain-postgres) | No |
| Mission persistence | in-memory array (restart loses) | Python: own state; JS spine: PG ping_missions | No |
| DB | JS gateway defaults POSTGRES_DB=crx, user crx (gateway_runtime.js:135-139); compose postgres defines only crx_runtime | crx_runtime, user postgres (constitutional_runtime.py:30-32) | No - different DB names |
| Identity | ad-hoc strings / content hashes | uuidv7 via IdentityAuthority | No |
| HTTP bridge either direction | none found (greps negative) | none found | No |
| Artifact store | JSON files orchestration/artifact_store/ | PG-backed | No |

Legacy JS execution-authority files (gateway/execution_authority.js, local_first_execution_authority.js, mission_execution_authority.js, parallel_execution_authority.js, execution_graph_authority.js, execution_plan_authority.js): confirmed dead - zero require of any of them anywhere in gateway/, ping-runtime/, or runtime/ (PROVEN). The legacy gateway/execution_authority.js was a "pure authority dispatch" design (authority registry + event routing), never subprocess-based.

## CONTRADICTIONS (surfaced, not resolved)

1. The repo itself declares Orca is not the production spine. gateway_runtime.js:330-335 (verbatim): "authority, NOT the production spine: the live spine's single inference owner is AIRuntime + ping-runtime/ai/ollama_provider.js (default localhost:11434), and the single worker-identity decider is WorkerRuntime.dispatch (P3 audit A). Enabling this here would register a second, unconsumed Ollama worker pool - contradicting single-owner convergence. Keep DISABLED until an explicit Orca-vs-live-spine convergence decision is made." So a second live JS mission system exists: MissionRuntime (ping_missions PG table with retries/leases) -> MissionScheduler (5s poll) -> WorkerRuntime.dispatch -> in-process worker.handle(event). Meanwhile mission_runtime.js:1-11 claims to be the "Single canonical mission system... Replaces 12 dead mission implementations." Three claimant systems (Orca / MissionRuntime-spine / Python runtime), each asserting canonicity.
2. WorkerRuntime.dispatch is called "the single worker-identity decider" by the gateway comment, but Orca's WorkerPortRegistry.findAvailable/Scheduler independently assign workers for Orca missions - two worker-selection authorities on the same gateway.
3. Engine calls itself an "execution engine" (CONSTITUTIONAL EXECUTION ENGINE, dashboard) yet executes nothing; its autonomous loop resolves missions with fabricated confidence: 0.85 outputs - a consensus simulation, not execution. Any dashboard "closure rate" from the loop is synthetic.

## UNKNOWNS / NOT PROVEN

- Whether /orchestration is intentionally unauthenticated or auth is applied at an outer layer (reverse proxy/container) - NOT PROVEN from repo code; no auth middleware found in gateway/bootstrap/ or the route file.
- Whether the JS gateway in production actually reaches PG (crx DB doesn't exist in the checked-in docker-compose.yml, which only defines crx_runtime) - NOT PROVEN; likely degraded-mode in compose.
- Whether any desktop agent actually uses the /orchestration dispatch/output loop in practice (the route docstring says "Desktop agents submit missions here") - NOT PROVEN; no client code found in-repo.
- Python cron/worker entrypoint specifics (supervisor/constitutional_event_loop mission lifecycle) - out of scope; only the bottoming-out and identity were verified.

## Bottoming-out verdict

Genuinely separate execution models, and the split is not clean layering - it is two (arguably three) competing implementations of "run work." Orca: coordination/consensus over HTTP with externalized execution and fabricated loop outputs. Python: subprocess-per-tool via ExecutionAuthority (the only real OS execution). PING Core v1 spine: in-process JS worker handlers with PG-backed mission leases/retries. They share no event store, no artifact store, no DB, no identity scheme, no wire protocol. The repo's own comments acknowledge the duplication is unresolved ("explicit Orca-vs-live-spine convergence decision" pending).

## Access note

Working route from this sandbox: IPv6 CONNECT through hatch-egress-proxy:3130 with Proxy-Authorization (the checked-in helpers' nc -X connect on 3130 without auth fails). Durable tooling set up (may help sibling threads): ~/workspace/pig-audit/runpig (scp probe -> run in WSL -> clean up), ~/workspace/pig-audit/gproxy.py, ~/workspace/pig-audit/pig.conf; probes archived in ~/workspace/pig-audit/probes/. All probes were read-only; every C:/Windows/Temp probe copy was deleted after its run.

---
---

# THREAD 4: Event Authority Deep Trace + Replay Semantics (COMPLETED, live reads)

Branch audited: constitutional-convergence-v2 (HEAD d0ad44e28). All findings repo-verified by direct code read unless marked [SECOND-HAND]. Repo untouched; probes ran from C:/Windows/Temp scripts, cleaned up.

## 1. Event component map

There is no EventAuthority / IEventAuthority class anywhere in the repo (PROVEN). gateway/event_routing_authority.js:40-66 defines EventRoutingAuthority whose three methods (emitExecutionStarted/Completed/Failed) delegate to this._eventAuthority.emitExecutionX(...), but no class ever implements those methods, and EventRoutingAuthority is never instantiated in production code (zero new EventRoutingAuthority matches). gateway/execution_authority.js (ExecutionAuthority.executeAuthority, lines 61-122) is likewise never required by any production file (zero matches outside itself). Consequence: the entire EXECUTION_STARTED/COMPLETED/FAILED emission chain is dead code. No EXECUTION_* events are emitted on any live path (corroborates starting evidence).

### Stores (PROVEN, all present in code)

| # | Store / table | Writer (live) | Reader | Status |
|---|---|---|---|---|
| 1 | ping_events | UnifiedEventRuntime.emit() (ping-runtime/events/unified_event_runtime.js:147-152) | GET /events* routes (with fallback), traversal APIs, bridge dedup subquery | Canonical spine per gateway/routes/events.js:76-78 ("emit directly through UnifiedEventRuntime (ping_events), not through the kernel pipeline") |
| 2 | repository_events (+ event_processing) | EventRepository.appendEvent (runtime/kernel/event_repository.js:102-145); kernel pipeline; ~20 gateway authorities | EventReadAuthority (runtime/kernel/event_read_authority.js:42-43); EventBridge | Legacy-but-wired: reads and bridge poll it; the /events routes only consult it via the read authority and fall back to ping_events |
| 3 | event_outbox | EventOutbox.write() (gateway/event_outbox.js:111-153) | _processOutbox 1s publisher -> Redis/in-memory bus (:170-213) | Exists but never instantiated in bootstrap (zero new EventOutbox in gateway/bootstrap); outbox pattern is unwired dead-ish code |
| 4 | constitutional_events + constitutional_snapshots | ConstitutionalEventSourcing.emitEvent/createSnapshot (gateway/constitutional_event_sourcing.js:97-140,393) | Same class, into in-memory Maps | Parallel event-sourcing implementation |
| 5 | canonical_events | POST /canonical-events route; TenantOS writers | EventBridge._bridgeCanonicalEvents -> re-emitted into ping_events | Second envelope model (UUID PK, per-tenant sequence) |
| 6 | legacy events table | nobody current | projection_replay.py:read_events, runtime/constitutional_event_loop.py | Legacy Python loops only |

### Authority verdicts (PROVEN from code)

- DURABLE EVENTS: UnifiedEventRuntime + ping_events. It is what the live gateway routes write and read; the route comment explicitly designates it the canonical spine; EventBridge's own docstring says "Single source of truth: UnifiedEventRuntime" (event_bridge.js:17).
- EVENT IDENTITY: split, two incompatible schemes. ping_events: content-addressed event_id = sha256({eventType, source, [namespace], [logical_id|payload]}) (unified_event_runtime.js:80-83) with ON CONFLICT DO NOTHING idempotency (:147-149). Kernel/repository_events: identityAuthority.generateEventId = canonical-hash of {type:'evt', event_type, aggregate_id} only (identity_authority.js:262-264, generateId:66-76) - deterministic on (type, aggregate) alone, ignoring payload/timestamp; plain INSERT with no conflict handling (event_repository.js:116-144).
- ORDERING: no single owner. repository_events orders by caller-supplied sequence per object_id (options.sequence || 1 - the caller, not the store, assigns it; runtime/kernel/execution/constitutional_execution_pipeline.js:32) plus a PreviousEventHash hash chain (event_repository.js:154-177). ping_events has no sequence column and no hash chain - ordering is timestamp only. event_outbox orders by created_at, outbox_id.
- HASHING: CanonicalAuthority (runtime/kernel/authorities/canonical_authority.js:209-212): hash() = sha256 over CanonicalBytes.serialize(); hashChain() (:221-224) hashes the hashes. Applied to event fields in the kernel schema (standard_event_schema.js:281-300: CanonicalEventHash covers event_id/type/aggregate ids/version/sequence/authority/timestamp/payload/ReplayID/PreviousEventHash/ReducerHash; ReplayHash additionally includes witness). ping_events rows carry no hashes at all - identity is the only integrity mechanism.
- REPLAY: DeterministicReplayEngine (runtime/kernel/replay/deterministic_replay_engine.ts:44-88) as invoked through ReplayAuthority -> kernel_replay_execution_provider.js:executeReplay. What the replay path actually reads: a ReplayEventStream built from a transcript's state.replay_events (or synthetic test corpus), not a live query against any store.

## 2. Transaction boundary / partial-failure behavior (evidence only)

No transaction boundary connects execution -> event -> artifact on any live path (PROVEN). The pieces exist but are unwired or bypassed:

| Scenario | Code behavior |
|---|---|
| emit() validation/governance fails | Returns {status:'error'} before persistence; nothing stored, no handlers run (unified_event_runtime.js:86-119). PROVEN |
| Execution (handler) succeeds, ping_events persist fails | emit() returns {status:'error','Persist failed:...'} (:159-162); handlers never dispatched. But this is event-ingestion, not an execution unit - there is no execution record to roll back. PROVEN |
| Event persists, downstream handler fails | Handler exceptions are logged and swallowed (:171-173); integration errors swallowed (:180-182); caller still gets {status:'ok'}. Partial failure is silent to the caller. PROVEN |
| Both persist, caller never receives response | Event is durable; retry with identical inputs -> same event_id -> ON CONFLICT DO NOTHING (no duplicate row) BUT handlers re-dispatch (:153-158 then :165-174 unconditionally). At-least-once delivery, at-most-once persistence. PROVEN |
| Kernel pipeline (runtime/kernel/execution/constitutional_execution_pipeline.js:17-109) | Real transaction: BEGIN (:23) -> event append + dispatch + reducer + witness + verification + projection (projection gets {client}, :90) -> COMMIT (:97); any throw -> ROLLBACK (:99-102); verification failure -> explicit ROLLBACK (:83-87). But the route comment (gateway/routes/events.js:76-78) states this pipeline is deliberately bypassed ("reducer/projection registries are empty and EventBridge adds a 5s delay for no benefit"), and gateway_adapter.executeEvent has zero production callers. PROVEN both the mechanism and the bypass |
| Kernel pipeline caller-timeout retry | Retry with same (event_type, aggregate_id) -> same deterministic event_id -> plain INSERT -> PK violation -> rollback -> artifact.fail (event_repository.js:116-144). Not idempotent; caller sees an error, not the prior result. PROVEN |
| Outbox crash between commit and publish | Row stays published=FALSE; 1s publisher replays on restart (event_outbox.js:97-102,170-213); <=5 attempts then dead-letter (:175, getFailedEvents). At-least-once; no subscriber-side dedup (Redis + in-memory bus, handler errors logged, :220-238). PROVEN - but unwired: never instantiated in bootstrap |
| TransactionBoundary (gateway/transaction_boundary.js:44-69) | BEGIN/operation/COMMIT, ROLLBACK on error, nested prohibited. Zero instantiations in bootstrap. PROVEN unwired |
| EventBridge cursor/bridge dedup | event_id NOT IN (SELECT event_id FROM ping_events WHERE source='repository_events') (event_bridge.js:155-157) compares the original repository_events.event_id against new content-hash ping_events.event_ids - these can never match (bridge re-emits with sha256 identity, new id at :180-197). The guard is vacuous; real dedup comes from the ping_bridge_cursors cursor and emit()'s ON CONFLICT DO NOTHING. PROVEN by reading both sides |
| ExecutionAuthority.executeAuthority catch path (gateway/execution_authority.js:110-121) | If event emission throws, the catch block's own emitExecutionFailed await can throw inside the catch (dead delegate chain), masking the original error. INFERRED from code structure; unreachable anyway since the class is never instantiated |

## 3. Replay semantics: (A) - reconstructing/verifying state from historical events. PROVEN

- DeterministicReplayEngine.replay() (deterministic_replay_engine.ts:44-88): fresh ReplayStateMachine, applyEvent per event in stream order, then canonicalize stream -> fingerprint -> run invariants -> witness root. Pure fold; nothing re-executes the original work.
- kernel_replay_execution_provider.js:executeReplay (:31-160): converts PING events into CanonicalEventEnvelopes + ReplayEventStream and runs the engine - a verification/reconstruction, not re-execution.
- projection_replay.py (docstring, lines 1-13): "Read events -> Rebuild Qdrant projections... No canonical state reconstruction (objects, lineage, entities, relationships, claims). Just: Can system rebuild Qdrant from events?" - explicitly (A), and explicitly limited.
- ConstitutionalEventSourcing.reconstructState (constitutional_event_sourcing.js:161-183): folds _applyEvent per event from a snapshot - (A).
- Replay tests (tests/certification/replay_determinism.test.js, replay-ordering-fuzz.test.ts, test/constitutional_replay.test.js): assert deterministic ID generation, same-inputs->same-outputs compiler runs, and event-ordering determinism - they test determinism of pure functions/streams, not re-running executions. (A)-flavored.
- The one place hinting at (B): ContinuousReplayAuthority.replayBranch(branch, commit) (continuous_replay_authority.js:252-307) replays "branches/PRs" and mints ReplayCertificates carrying branch, commit, execution_graph_hash - but it delegates to replayAuthority.replayBranch, which routes to the same fold-based executeReplay. No original-execution re-invocation exists. No code path implements (B) or (C).

## 4. Reproducibility-evidence inventory

| Evidence | Verdict | Code |
|---|---|---|
| Input capture | PROVEN captured | Full payload JSONB in ping_events; witness input_hash/output_hash (runtime/kernel/authorities/witness_authority.js:76-90); ExecutionAuthority contract lists replay_inputs: [AuthorityVersion, NodeHash, InputArtifactHashes] (gateway/execution_authority.js:147) - but that class is dead, so the contract is aspirational |
| Environment capture | PROVEN captured, explicitly provenance-only | RuntimeID fingerprint: node version, platform, arch, hostname, cpu model/count, memory, v8/openssl/uv/zlib versions (runtime_identity_authority.js:101-140); code comments state "provenance only", and startup_timestamp/authority_versions/constitution versions were deliberately moved OUT to ReplayIdentity |
| Code/version capture | PROVEN (partial) | authority, authority_version, constitutional_version on events; ReplayCertificate records branch + commit (continuous_replay_authority.js:50-51); ReplayID = hash of canonical/reducer/authority graph hashes (replay_identity_authority.js:195-208) - i.e., which reducers/authorities existed, not source bytes |
| Container image capture | NOT PROVEN - no image field in any event, witness, fingerprint, or certificate |
| Dependency capture | NOT PROVEN - no dependency manifest; EngineProfile covers runtime libs (v8/openssl) only, not npm packages |
| Model/version capture | NOT PROVEN - embeddingModel: 'nomic-embed-text' is code config (gateway_runtime.js region); no model name/version in OBSERVATION_CREATED or any event payload |
| Tool version capture | NOT PROVEN - identityAuthority mints tool/tool_exec IDs but they are not wired onto spine events [SECOND-HAND: continuity-audit-2026-09-13.md:40] |
| Filesystem state | NOT PROVEN |
| Network state | NOT PROVEN |
| Randomness / seeds | NOT PROVEN - no seed captured anywhere |
| Timestamps | PROVEN captured, live (not controlled) | timestamp TIMESTAMPTZ on every ping_events row; ConstitutionalTimeAuthority.nowAsISOString() (unified_event_runtime.js:130); no freeze/mock capability found in the time authority (no freeze/setNow/override symbols) - replay folds recorded timestamps, it does not control time |
| External API responses | NOT PROVEN as responses - external data arrives as payload (e.g. review payloads), but raw response envelopes/bytes are not preserved; ObservationWorker keeps documentId + a derived observation object only (canonical_workers.js:98-121) |
| Ordering guarantee for replay | INFERRED - replay consumes an explicitly ordered ReplayEventStream; ping_events itself has no sequence, so any replay from the spine depends on timestamp ordering or caller-supplied order |

## 5. CONTRADICTIONS (surfaced, not resolved)

1. Two authorities both claim to be the event authority. UnifiedEventRuntime docstring: "Single canonical event pipeline. Every event flows through here." EventBridge docstring: "Single source of truth: UnifiedEventRuntime." Yet a parallel kernel pipeline (repository_events + chain hashing + EventRepository + EventReadAuthority + transaction support) is fully implemented, read by the read authority, and polled by the bridge - while gateway/routes/events.js:76-78 says the kernel path is bypassed because "reducer/projection registries are empty." Both cannot be the authority; the code comments disagree with each other.
2. The constitutional transaction story vs. the live path. TransactionBoundary, EventOutbox, and the kernel execution pipeline all implement real transactional semantics (BEGIN/COMMIT/ROLLBACK, outbox pattern) - none are instantiated in the running gateway bootstrap. The live spine (UnifiedEventRuntime.emit) has no transaction spanning event+artifact: persistence, handler dispatch, and integration routing are sequential steps with swallowed errors.
3. Read/write split. Writes go to ping_events (UnifiedEventRuntime); the EventReadAuthority used by the routes reads repository_events, with ping_events only as a fallback when the authority returns empty (routes/events.js:17-21). A reader of GET /events may see a different store than the writer wrote to.
4. Bridge dedup is vacuous (see table): the NOT IN subquery can never match by construction.
5. "Replay" is hash-verification theater in one place and a real fold in another: ContinuousReplayAuthority frames replay as branch/PR continuous verification with certificates, but underneath it is the same pure event-fold - the certificate's commit/branch fields describe the code being certified, while the folded events describe data; nothing links a given execution's code version to its replay except the ReplayID graph hashes.
6. Dead code with live-sounding names: EventAuthority/IEventAuthority do not exist; ExecutionAuthority (gateway) and EventRoutingAuthority are never instantiated - yet ExecutionAuthority's contract advertises replay_inputs, determinism: deterministic_dispatch, and rollback: none. Any doc or agent citing these as live capabilities is citing dead code.

## 6. UNKNOWNS

- Whether ping_events' lack of a sequence column / hash chain has ever caused an ordering dispute in production (NOT PROVEN either way; the expression indexes on causation_id/correlation_id provide causal order, not total order).
- The 53/53 replay-tests-passing claim: the test files exist and their assertions are (A)-flavored, but I did not execute them (read-only, no dependency installs); pass status on this branch is NOT PROVEN.
- ping_missions table and mission lifecycle (referenced in the second-hand audit): not re-verified on this branch; treated as NOT PROVEN here.
- Whether EventBridge.start()'s 5s poll loop is actually running in the deployed gateway (wired in gateway_runtime.js:62-70 on the PG-dependent path, but the running container image phase4-eventauth6 is two builds newer than the audited source lineage [SECOND-HAND: continuity-audit-2026-09-13.md:18,71] - live behavior may differ from this source).
- Retention: no TTL found on ping_events, repository_events, event_outbox (published rows cleaned after 7d via cleanOldEvents, but nothing calls it in bootstrap - INFERRED from zero callers), constitutional_events. Growth is unbounded as far as the code shows.

Net verdict: durable-event authority = UnifiedEventRuntime/ping_events (live but thin: content-hash identity, no sequencing, no hash chain, swallowed downstream errors); identity/hashing authority = CanonicalAuthority + identityAuthority (two incompatible ID schemes); ordering = fragmented; replay = semantics (A) pure state-reconstruction/verification with no execution re-running; the execution->event->artifact transaction boundary exists only in unwired code, and the nominal EventAuthority does not exist at all.

---
---

# THREAD 5: Failure Vocabulary + Persistence/Crash Matrix + Retry/Idempotency (COMPLETED, live reads)

Thread 5 of 8. Repo: /home/nolan/ping, branch constitutional-convergence-v2, HEAD d0ad44e28. All claims below are repo-verified unless marked otherwise. Access note: Pig SSH was down for my session from ~10:29 to ~10:38 MDT (egress proxy silently dropped CONNECT to 100.79.154.43 while allowing other hosts; recovered after coordinator's notice). 12 read-only probe scripts run, all cleaned up. No writes to the repo, no git mutations.

## (1) Failure vocabulary table

| Term | Grade | Where defined | States / shape | Who sets | Who reads | Applies to |
|---|---|---|---|---|---|---|
| pending / processing / completed / failed | PROVEN | runtime/execution_runtime.js:102,187,197,206 (executionReport.status); runtime/cognitive/models.py:65 (TaskStatus enum: pending/in_progress/completed/failed); gateway/automatic_mission_generator.js:216,274,284 (mission.status); gateway/routes/orchestration.js:56, mission_control.js:242 | Execution reports, tasks, missions | ExecutionRuntime, mission generators | ExecutionRuntime callers (this._executions map, returned report) | Executions, tasks, missions |
| consensus_reached / consensus_failed | PROVEN defined, INFERRED dead | gateway/generated/event_generator.js:269-270, gateway/generated/state_machine_generator.js:104-105 (state-machine transition consensus->completed/failed) | Event types + transition guards | ConsensusEngine (generated registry) | No live consumer found | Missions (consensus path, generated layer only) |
| running | PROVEN | execution_runtime.js:102 (status:'running'); continuous_replay_authority.js:32 (ReplayStatus.RUNNING) | Execution + replay lifecycle | ExecutionRuntime; ContinuousReplayAuthority | Not traced | Executions; replays |
| comparing / accepted / rejected | PROVEN | gateway/continuous_replay_authority.js:30-38 (ReplayStatus: pending/running/completed/failed/comparing/accepted/rejected) | Replay certificate lifecycle | ContinuousReplayAuthority | Not traced | Replays only |
| {status:'ok'} / {status:'error'} | PROVEN | ping-runtime/events/unified_event_runtime.js emit() returns {status:'ok', eventId, event} or {status:'error', error, eventId} | Canonical emit result | UnifiedEventRuntime | gateway/routes/events.js POST / (throws on non-ok -> 500) | Event emission |
| {success:true} / {success:false} | PROVEN | gateway/append_orchestrator.js (append returns {success:true, object_id,...}); runtime/supervisor.py:36 (out.get('success')) | Artifact append result; tool-router response | AppendOrchestrator; tool_router.py | AppendOrchestrator callers; supervisor.py | Artifacts; tool calls |
| processed / failed (event_processing) | PROVEN | runtime/kernel/event_read_authority.js:303-330 (markProcessed/markFailed -> event_processing table: processed bool, retries int, last_error) | Worker-side event bookkeeping | Workers via POST /events/processed, /events/failed (workers/worker_runtime.py:65) | getUnprocessedEvents (excludes any row present in event_processing) | Events (repository_events stream) |
| FailureCodes | PROVEN | gateway/deterministic_failure_envelope.js:~105-116: UNKNOWN, AUTHORITY_ERROR, COMPILATION_ERROR, VALIDATION_ERROR, REPLAY_ERROR, WITNESS_ERROR, STORAGE_ERROR, NETWORK_ERROR, PARSING_ERROR, HASH_ERROR | Failure classification | DeterministicFailureEnvelope producers | Not traced to a consumer | Failures (generic) |
| FailureCode + ReplayPhase | PROVEN | gateway/replay/kernel/deterministic_failure.js:18-52: PARENT_NOT_FOUND, DUPLICATE_EVENT_ID, DUPLICATE_ARTIFACT_ID, INVALID_LINEAGE_*, UNKNOWN_EVENT_TYPE, DUPLICATE_LEAF_ID, EXECUTION_LIMIT_EXCEEDED, CANONICALIZATION_ERROR, INVARIANT_VIOLATION, CYCLE_DETECTED, FORBIDDEN_EDGE_DETECTED, INTERNAL_ERROR; phases STATE_TRANSITION/LINEAGE_VALIDATION/CANONICALIZATION/WITNESS_GENERATION/INVARIANT_CHECK/MERKLE_CONSTRUCTION | Replay failure envelopes | ReplayStateMachine (replay_state_machine.js:75-109), deterministic_replay_engine | Replay pipeline | Replays only, not execution lifecycle |
| failureCode / failureReason | PROVEN | gateway/event_port.js:93-107 (emitActivityFailed: failureCode: error.name \|\| 'UNKNOWN_ERROR') | Activity failure events | EventPort | Event subscribers | Activities |
| mission_status / execution_status DB columns | PROVEN (values partly) | gateway/self_improvement_loop.js:194 (WHERE mission_status='pending'); :150 (execution_status==='completed'); control_center_subscription.js:220-257, materialized_views.js:37-98 (GROUP BY) | Status columns exist; only 'pending'/'completed' literals found in code | Mission/subscription writers | Self-improvement loop, dashboards | Missions, executions |
| degraded: true + HTTP 503 | PROVEN | gateway/bootstrap/gateway_runtime.js:151 (boot log), :692-700 (/events /context /api/v1/repository /system /canonical-events /tenants /deployments /runtime /ingest -> 503 {error:'Postgres unavailable', degraded:true}) | Gateway health posture | GatewayRuntime (single SELECT 1 probe, connectionTimeoutMillis:3000 at :141; no retry, no recovery) | HTTP clients | Gateway routes (not executions/events) |
| healthy / degraded / ready | PROVEN | gateway_runtime.js:730,736,741,755; gateway/health_authority.js:46 (expects healthy/ready/running) | Component health | Health checks | /health consumers | Components |
| dead_lettered (repository_dead_letters) | PROVEN | gateway/dead_letter_authority.js:1-80 ("FAILED -> DeadLetterAuthority -> repository_dead_letters -> Witness -> Replay"; columns incl. retry_count, failure_reason, replayable BOOLEAN) | Terminal failure store | DeadLetterAuthority (required by routes/mission_control.js, bootstrap/gateway_runtime.js) | Replay path (replayable flag) | Jobs/missions that exhausted retries |
| ROLLBACK | PROVEN (DB tx only) | gateway/transaction_boundary.js:62,94; gateway/lifecycle_context.js:56; gateway/postgres_adapter.js:72; gateway/migration_engine.js:158; append_orchestrator.js ("Rollback on any error" then throw) | SQL ROLLBACK / SAVEPOINT | TransactionBoundary, LifecycleContext, AppendOrchestrator | Callers see thrown error | DB transactions, not business sagas |
| PARTIAL | NOT DEFINED BY PING | No occurrence in runtime/*.py, gateway/*.js, workers/ (code) | - | - | - | - |
| ABORTED | NOT DEFINED BY PING | Zero hits in code | - | - | - | - |
| CANCELLED | NOT DEFINED BY PING | Zero hits in code | - | - | - | - |
| TIMEOUT (as status) | NOT DEFINED BY PING | Only connectionTimeoutMillis:3000 (PG connect); no timeout status vocabulary | - | - | - | - |
| SUCCESS (as status) | NOT DEFINED BY PING | Only hit is a display string in gateway/nversion_determinism.js:367 (a verification tool, not a status) | - | - | - | - |
| UNKNOWN (as status) | NOT DEFINED BY PING as execution status | Only FailureCodes.UNKNOWN (envelope) and a google_drive adapter event_type default; runtime_registry default 'unknown' in database/canonical_events.sql:139 | - | - | - | - |
| IdempotencyManager | NOT DEFINED BY PING (as code) | gateway/IDEMPOTENCY_IMPLEMENTATION.md specifies idempotency_manager.js + idempotency_keys/execution_tokens/replay_tokens tables, but the file does not exist on this checkout; lifecycle_context.js:8 mentions "idempotency through context tracking" in a doc comment only; no new IdempotencyManager found. Second-hand note: workspace migration docs claim an idempotency-manager.ts bug fix in commit a70d9f86, but find for idempotency-manager*/idempotency* across the repo returned nothing. | Doc-only | - | - | - |

Also observed: three different success shapes coexist with no mapping: {status:'ok'} (emit), {success:true} (artifact append), {status:'completed'} (execution report). No unification found.

## (2) Persistence/crash matrix (evidence only)

Canonical emit path = UnifiedEventRuntime.emit() (ping-runtime/events/unified_event_runtime.js:73): (1) sha256 content-addressed event_id over {eventType, source, [namespace], [logical_id|payload]}; (2) validation; (3) governance; (4) INSERT INTO ping_events ... ON CONFLICT (event_id) DO NOTHING; (5) in-process handler dispatch (errors caught+logged); (6) integration routing (errors caught+logged); returns {status:'ok'}. Route POST /events throws -> asyncHandler -> HTTP 500 {error} (gateway/route_middleware.js).

| Row | Existing behavior | Grade |
|---|---|---|
| Before execution | Validation/governance rejection -> {status:'error'} (or 500 via route); _stats.failed++; nothing persisted | PROVEN (unified_event_runtime.js steps 2-3; routes/events.js POST) |
| During execution | ExecutionRuntime: lifecycle step failure -> RollbackCoordinator runs compensating actions in reverse order (continues past individual rollback failures, records per-call status:'success'/'failed') -> executionReport.status='failed', errors appended, rollback_attempted=true, rollback_result recorded, report frozen in this._executions | PROVEN (runtime/execution_runtime.js:150-212; runtime/rollback_coordinator.js) |
| After execution, before artifact persistence | AppendOrchestrator: any error -> rollbackTransaction -> throw; caller gets exception, {success:true} never returned. "No partial persistence" claimed in transaction_boundary.js docstring | PROVEN for the throw path (gateway/append_orchestrator.js) |
| After artifact persistence, before event persistence | Artifact append commits in its own transaction and returns {success:true}; ExecutionRuntime step 8 (_emitEvent) then publishes via NATS (runtime/execution_runtime.js:415), not the DB event store. If validation/NATS publish throws, rollback runs over executedInfrastructureCalls only - whether the already-committed artifact append is inside that set is not established from the code read. No cross-boundary (artifact-store <-> event) atomicity found. | NOT DEFINED BY PING (combined guarantee) |
| After event persistence, before response | Persistence confirmed (rowCount>0 -> persisted); handler dispatch failures and integration routing failures are caught, logged, and do not affect the response -> client gets {status:'ok'} while downstream delivery silently failed | PROVEN (unified_event_runtime.js steps 6-7) |
| Process crash | No SIGTERM/SIGINT handlers in gateway/bootstrap/gateway_runtime.js. No graceful-shutdown or in-flight-request accounting found | NOT DEFINED BY PING |
| Container crash | Nothing found (no restart-policy or recovery logic in repo scope) | NOT DEFINED BY PING |
| Host crash | Nothing found | NOT DEFINED BY PING |
| Retry | Outbox relay: publish_attempts < 5, 1s setInterval loop, attempts+error_message recorded on failure (gateway/event_outbox.js:97-100,170-215); after 5 failures rows sit unpublished with no dead-letter transition found. RetryPolicy: maxRetries 5, exponential backoff 1s->60s, deterministic jitter (gateway/retry_policy.js); RetryAuthority default policy 3 attempts (gateway/retry_authority.js); mission jobs carry {max_retries:3, backoff:'exponential'} (gateway/mission_authority_v2.js:81); exhausted -> DeadLetterAuthority -> repository_dead_letters. Python worker loop: consecutive-error MAX_RETRIES then worker exits (workers/worker_runtime.py) | PROVEN (each as cited) |
| Duplicate request | ON CONFLICT (event_id) DO NOTHING -> no-op, counted in _stats.deduplicated; deterministic event_id means identical content never double-persists. Replay kernel: duplicate event/artifact/leaf IDs -> deterministic failure envelope (DUPLICATE_EVENT_ID etc.) | PROVEN (unified_event_runtime.js step 5; replay_state_machine.js:75-109) |

Critical sub-findings for the crash matrix:
- Silent non-persistence: if this._pool is null, emit() skips the INSERT entirely and still returns {status:'ok'} (the if (this._pool) guard, unified_event_runtime.js step 5). PROVEN in code.
- Failed worker events are never retried by the poller: markFailed inserts an event_processing row, and getUnprocessedEvents only returns repository_events rows with no event_processing entry (runtime/kernel/event_read_authority.js:334-349). The retries counter increments but nothing reschedules. So worker-level event retry is NOT DEFINED BY PING (at-most-once redelivery from the poll loop after first failure).
- Outbox pattern is defined but unwired: EventOutbox (write-in-transaction + 1s relay publisher + uq_outbox_event_id) exists at gateway/event_outbox.js, TransactionBoundary exposes outbox.append per transaction, and OUTBOX_ARCHITECTURE.md mandates it - but no new EventOutbox and no new TransactionBoundary construction was found in gateway non-test code. The canonical POST /events path bypasses both (direct INSERT). Two persistence paradigms coexist; the constitutional one has no proven live wiring. Grade: defined PROVEN, wired INFERRED-no.

## (3) Retry/idempotency findings

- Content-addressed IDs: PROVEN for the canonical event spine - event_id = sha256(JSON of {eventType, source, namespace?, logical_id|payload}) (unified_event_runtime.js step 1). Dedup is via ON CONFLICT DO NOTHING (idempotent retry preserved by design; comment explicitly says so).
- Connector dedup: NOT PROVEN. No connector-specific dedup code found beyond the spine-level ON CONFLICT DO NOTHING and the replay kernel's duplicate-ID rejection. The "connector dedup" from the night-shift report was not located in runtime/, gateway/, workers/, or ping-runtime/.
- Observation/artifact content-addressed IDs: PARTIALLY PROVEN. Event IDs are content-addressed (above). No content-addressed artifact ID mechanism found in the artifact store paths examined (append_orchestrator.js uses supplied constitutionalObject.id); DUPLICATE_ARTIFACT_ID exists only in the replay kernel's failure codes.
- Exactly-once vs at-least-once: NOT DEFINED BY PING. No "exactly-once"/"at-least-once" claim string exists in code. Observed semantics: at-least-once delivery attempts with idempotent persistence (dedup on content hash) -> effectively-once persistence, but dispatch/integration side effects (steps 6-7) have no dedup and failures are swallowed, so side effects are at-least-once with silent loss possible.
- Backoff: PROVEN (RetryPolicy: exponential, base 1s, cap 60s, 50% deterministic jitter, maxRetries 5; RetryAuthority default 3 attempts; mission config {max_retries:3, backoff:'exponential'}).
- Worker/client-supplied IDs are dropped: workers/repository_client.py::emit_event generates uuid4() and POSTs it, but routes/events.js ignores req.body.event_id and computes the content hash - so a worker's retry with a new uuid but identical payload still dedups (good), while a retry with a changed payload (e.g., new timestamp) produces a different event_id and double-persists (the logical_id option exists to prevent this, but workers don't pass it). INFERRED from code.

## CONTRADICTIONS

1. "No partial persistence" (transaction_boundary.js docstring) vs. the live path: the canonical emit path does not use TransactionBoundary at all (unwired), and ExecutionRuntime persists artifacts then publishes events via NATS in separate steps with no shared transaction. The guarantee is stated but not on the executed path.
2. "Duplicate requests must never execute business logic twice" (IDEMPOTENCY_IMPLEMENTATION.md) vs. reality: the specified idempotency_manager.js does not exist; the doc describes tables and response-reuse that have no code.
3. {status:'ok'} vs actual durability: emit returns ok when (a) the INSERT was skipped for lack of a pool, (b) dispatch/integration delivery failed. "ok" means "accepted into the spine," not "durably delivered."

## UNKNOWNS (marked, not papered over)

- Who sets/reads TaskStatus transitions in runtime/cognitive/models.py (setters not traced).
- Who consumes ReplayStatus and the FailureCodes/FailureCode envelopes outside the replay pipeline.
- Whether committed artifact appends are included in RollbackCoordinator's executedInfrastructureCalls.
- Whether EventOutbox/TransactionBoundary are constructed via dynamic require somewhere (grep found none; treated as unwired, INFERRED).
- Full mission_status value set (only 'pending' literal found in code).
- Recovery semantics for process/container/host crash: NOT DEFINED BY PING anywhere found.
- Python execution path failure vocabulary: confirmed returncode != 0 -> {'error': ...} (supervisor.py:28-36) and out.get('success') check; nothing richer found.

---
---

# THREAD 6: Worktree Ownership + Concurrency (COMPLETED, live reads)

Access: SSH tunnel was down 10:29-10:38 MDT for all sessions (egress proxy closed every CONNECT to 100.79.154.43 with "Broken pipe"). Tunnel recovered ~10:38; ~15 read-only probe batches via nolan@100.79.154.43 -> wsl -u nolan, all grep/sed/cat/ls/git <read-only> against /home/nolan/ping. Zero git mutations, zero writes to the repo, zero container/docker actions. Temp probe scripts in C:/Windows/Temp/ all deleted afterward (verified ALL_CLEAN); local scratch removed. Did not touch the live worktrees/agent-smoke-abc123def456/ tree.

## 1. Worktree/workspace mechanism inventory

M1. scripts/worktree_executor.py:12-24 - prepare_worktree(mission_name) (PROVEN, read in full). Creates <repo>/worktrees/<mission_name>/ via mkdir(parents=True, exist_ok=True) plus a worktree.json marker ({"mode": "git-worktree", "status": "prepared", "notes": ["no-commit","no-edit-main-tree","replay-required"]}). It does not run git worktree add - the mode field claims "git-worktree" but the mechanism is a plain directory plus marker. Ownership key = mission name. No delete/cleanup function exists anywhere in the file or repo (PROVEN: grep for remove/delete/teardown/prune of worktree/workspace in scripts/ returned nothing). exist_ok=True means concurrent runs for the same mission silently share one dir. Sole caller: scripts/learning_loop.py:76, hardcoded mission "VerifyReplay".

M2. scripts/workspace_builder.py:12-55 - build_workspace / prepare_workspace(mission_name) (PROVEN, read in full). Creates <repo>/workspaces/<mission_name>/ + workspace.json (mode: "isolated-worktree"). Same properties as M1: mission-keyed, no cleanup, no locking, no agent/run distinction. Sole caller: scripts/learning_loop.py:70 (also hardcoded "VerifyReplay").

M3. Real git worktree, created live during this audit. git worktree list shows two entries: the main checkout and /home/nolan/ping/worktrees/agent-smoke-abc123def456 on branch agent/smoke-abc123def456 (PROVEN, observed 10:39 MDT). It contains .agent-worktree.json (PROVEN, read): {"agent_id":"smoke","run_id":"abc123def456","branch":"agent/smoke-abc123def456","base":"constitutional-convergence-v2","repo":"/home/nolan/ping","created_at":"2026-09-16T16:27:28Z","capability":"smoke-test","state":"active","container":"1ec3e51..."}. This matches the orchestration spec's proposed manifest schema field-for-field - the spec is being implemented live by the Phase 3 smoke workstream right now. The creation code (supervisor) was not found in the repo (PROVEN: zero hits for ping-supervisor.lock, agent-worktree.json, worktree-ledger outside the smoke tree), so the creator is external to /home/nolan/ping.

M4. No git worktree invocations in any shipped code (PROVEN: repo-wide grep for git worktree across runtime/, gateway/, workers/, scripts/ .py/.js/.ts/.sh returned zero code hits). The only git-level enforcement is git's own (one branch per worktree).

M5. gateway/workspace_registry.js does not exist in this repo (PROVEN: find maxdepth 5, zero hits). It existed only in the Windows opencode worktree's operational gateway per the 9/12 baseline - different codebase, not the WSL canonical repo. The WSL gateway's routes/ai_workspace.js is a HuggingFace sentiment/tag/parse API, unrelated to agent workspaces.

M6. Mission-lease ownership - ping-runtime/orchestration/mission_runtime.js + mission_scheduler.js (PROVEN, read key sections). Lifecycle created -> assigned -> running -> completed/failed -> archived in ping_missions with assigned_to, lease_until, heartbeats. Claim is atomic: UPDATE ... SET status='assigned' ... WHERE mission_id=$2 AND status='created' (mission_runtime.js:108). MissionScheduler._poll() every 5s: Arrow 0 renews leases for in-processing missions, Arrow 1 reapExpiredLeases() resets expired running/assigned missions to created (mission_runtime.js:277-283) - this is the orphan/crash recovery path. Scheduler is instantiated and started in gateway/bootstrap/gateway_runtime.js:552-561 with maxConcurrent: 3. Retry policy default {max_attempts: 3, backoff_delay_ms: 5000} (mission_scheduler.js:97-98); exhaustion -> failed + DLQ via deadLetterAuthority (wired at gateway_runtime.js:540-550).

M7. gateway/advisory_lock.js (266 lines) - PG advisory locks keyed on (aggregateType, aggregateId) for mission/execution/queue/schedule, header: "Every mutable aggregate must have one writer. Application mutexes prohibited." (PROVEN, read). Zero callers (PROVEN: repo-wide grep) - the one-writer design is implemented but not wired into any execution path. Session-scoped PG locks would be crash-safe if used.

## 2. Ownership model the existing implementation assumes (descriptive only)

Three coexisting, unconnected models: (a) the scripts layer (M1/M2) assumes mission-scoped ownership - one directory per mission name, shared by any concurrent run of that mission, no per-agent or per-run isolation, no cleanup, treated as disposable scratch that is never actually disposed; (b) the execution layer (M6) assumes mission-record ownership with lease-based worker claiming - a mission belongs to whichever worker holds a live lease (assigned_to + lease_until), leases are heartbeated, and the scheduler reaps expired leases so crashed workers' missions return to created; ownership is durable in Postgres and survives process death; (c) the in-progress git-worktree path (M3) assumes (agent_id, run_id)-scoped supervisor ownership with the per-worktree manifest as the ownership record - one worktree per run, recorded container id, state: active. Nothing in the repo connects these three layers; there is no flock, no lockfile, no ledger, and no teardown code for the filesystem workspaces.

## 3. Concurrency findings

- Two executions simultaneously: yes, explicitly. MissionScheduler runs with maxConcurrent: 3 (gateway_runtime.js:558); the design anticipates multiple schedulers.
- Atomic claim under concurrency: PROVEN by test. gateway/test_durability_invariants.js:303-310: "scheduler-A claims successfully", "scheduler-B is rejected", "assignment not stolen" - the conditional UPDATE ... WHERE status='created' makes double-claim impossible.
- Worker crash while marked active: possible, and recovered by design. test_durability_invariants.js:269-292 proves expired leases are reclaimed to created with assignment cleared, while live leases are untouched; completed missions are never reclaimed (:365-368). Renewal happens before reaping each poll so slow workers aren't falsely reaped (test_lease_renewal.js, "Arrow 0", non-fatal renewal failure).
- Event sequence allocation is racy and lossy. gateway/canonical_event_envelope.js:100-107: getNextSequence = SELECT COALESCE(MAX(sequence),0)+1 per tenant with no lock and no transaction; insert at :174-185 uses ON CONFLICT (tenant_id, sequence) DO NOTHING and returns the event object without checking rowCount. Two concurrent emits for one tenant can compute the same sequence; the loser's event is silently dropped while the caller is told it persisted (PROVEN from code; INFERRED consequence). No test covers this race (NOT PROVEN to be tested - the ON CONFLICT tests found are for ping_missions insert dedup, a different path).
- Artifact/event IDs are deterministic (content-derived). canonical-identity-service.ts:96-98: generateEventId = UUIDv5(event, source:timestamp); canonical_event_envelope.js:72-74: UUIDv5(tenantId:eventType:timestamp:sequence) (PROVEN). Two executions with identical inputs produce the same ID. gateway/content_addressing.js makes sha256/blake3 canonical hash the primary identity with deterministic UUIDv5 alias and a deduplicate(content) method (:209) - content-addressed by design (PROVEN); whether ingest actually routes through it was NOT traced (NOT PROVEN).
- Duplicate submissions: mission creation is idempotent via INSERT INTO ping_missions ... ON CONFLICT DO NOTHING (reflected in test mocks; mission_id is the PK). Event ingest is not safely idempotent: the only conflict clause covers (tenant_id, sequence); a duplicate with identical event_id (same tenant/type/timestamp/sequence) would hit the event_id PK with no ON CONFLICT clause and raise (INFERRED from the single-clause INSERT; NOT PROVEN by a live test).
- Retries are idempotent by state machine. test_durability_invariants.js:221-254: retry_pending missions are invisible before retry_at and visible after; exhausted retries -> failed, never re-enter pending; DLQ recorded exactly once (:341-346).
- Two agents sharing one worktree: nothing prevents it. Git prevents one branch in two worktrees, but no code in the repo enforces exclusive per-run access to a worktree directory; the M1/M2 mechanisms actively share by mission name. Two executions mutating the same repository on different branches is structurally fine; same-branch concurrent mutation has no guard beyond git's own.
- Locks: only M7 (unwired advisory locks) and M6 (lease heartbeats + conditional updates). No flock, no lockfiles, no in-process mutexes anywhere in the execution path (PROVEN by absence in greps).

## 4. CONTRADICTIONS

1. Spec status vs reality: the brief said the orchestration worktree spec is "not yet implemented" - the repo now contains a live worktrees/agent-smoke-abc123def456/ with a spec-schema .agent-worktree.json created 10:27 MDT today. Implementation began during this audit window.
2. VerifyReplay marker: brief said the stray dir was "since removed during setup" - git status shows " D worktrees/VerifyReplay/worktree.json" (uncommitted working-tree deletion; the dir is gone from disk) alongside " M .gitignore". Removal happened, but it is uncommitted and unverified against the ledger.
3. prepare_worktree claims mode: "git-worktree" while never invoking git - the marker misdescribes its own mechanism.
4. "One writer per aggregate" (advisory_lock.js header) vs the event ingest path, which allocates sequences with an unlocked MAX+1 - the stated invariant is violated exactly where concurrent writers collide.
5. Scope mismatch with prior evidence: the 9/12 baseline's gateway/workspace_registry.js and 6 opencode worktrees describe the Windows C:\Users\nolan\PING tree and its opencode worktrees, not /home/nolan/ping. Claims from that baseline do not transfer to the WSL repo without re-verification.

## 5. UNKNOWNS (NOT PROVEN)

- The worktree-creation supervisor code (who ran git worktree add, who writes the manifest, what the flock/ledger/teardown logic is) - not in the repo.
- Whether content_addressing.js:deduplicate is wired into any ingest path.
- Whether runtime/workers/*.py (github/planner/projection/reasoner/retriever workers) participate in the lease system - worker_base.py has no heartbeat/lease/crash mentions.
- Crash semantics of the smoke container itself (container 1ec3e51... was running; what reaps it on host reboot - NOT DEFINED in repo).
- Whether the MAX+1 sequence race has ever caused a silent event loss in production; which constraint fires first on a full-duplicate resubmission.
- Whether the lease tests (mock-based, "No Postgres, no Docker" per their headers) pass against live PG - they prove logic, not deployment behavior.

Net: the implemented ownership model is mission-scoped scratch dirs (never cleaned) plus lease-claimed mission records (crash-recovered by a 5s reaper), with a per-(agent,run) manifest-owned git-worktree model being built live at this moment. The sharpest proven defect is the unlocked event-sequence allocation with silent drop on conflict.

---
---

# Secondary evidence used for BLOCKED threads (labeled in main report)

- THREAD 3 (identifiers/domains): secondary = starting-evidence identifier/domain tables (superseded where live threads disagreed) + continuity-audit-2026-09-13.md (event IDs content-addressed; mission IDs deterministic from mission type + source event; no run_id/parent_run_id; two event-envelope models) + thread 2 identity findings (PROVEN live) + thread 5 vocab (PROVEN live) + thread 6 mission IDs (PROVEN live).
- THREAD 7 (model access/network/security): secondary = MUSE_PING_FULL_READ_ONLY_BASELINE.md sections 6-8 (2026-09-12, live-probed then: gateway capability map with NOT_IMPLEMENTED execution stubs, unauthenticated /ai/* POST routes, denied-path regex bypass, broad unauthenticated surface, fail-closed authz design, requestId timestamp-hash, no constant-time key comparison) + LiteLLM design doc (completed 2026-09-16, undeployed) + thread 1 fresh findings (env inheritance, f-string SQL) + thread 2 fresh (unauthenticated /orchestration) + thread 5 fresh (ok != durable) + thread 6 fresh (MAX+1 silent drop).
- THREAD 8 (test contracts): secondary = starting evidence (test_runtime_authority_boundaries.py adapter injection + docker wrap) + thread 1 live verification (docker wrap test asserted; adapter injection corroborated) + thread 4 live reads (replay test files exist, (A)-flavored assertions) + thread 6 live reads (test_durability_invariants.js, test_lease_renewal.js, mock-based). The 53/53 replay, 42/42 and 108/108 regression pass claims remain SECOND-HAND and NOT PROVEN on this branch (no test was executed; read-only, no installs).
