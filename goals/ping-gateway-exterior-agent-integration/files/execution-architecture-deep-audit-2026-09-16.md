# Execution Architecture Deep Audit

**Date:** 2026-09-16
**For:** Nolan, decision-ready, for approval when his quota resets
**Repo:** `/home/nolan/ping`, branch `constitutional-convergence-v2`, HEAD `d0ad44e28` (threads 4, 5, 6; thread 1 audited the same tree at file level). This is NOT main (`6e359a2` per the 2026-09-12 baseline). Findings below are scoped to this branch unless marked otherwise.
**Method:** planning and read-only. No modifications, migrations, commits, deployments, dependency installs, Docker changes, worktree creation, or git mutation. Live code reads only.
**Access:** Pig SSH tunnel was down ~10:29-10:38 MDT for all worker sessions (egress proxy silently dropped CONNECT). 5 of 8 threads completed with live repo evidence after recovery. Threads 3 (identifiers), 7 (model/security), 8 (tests) were BLOCKED for fresh reads; their sections use labeled secondary evidence: the 2026-09-13 continuity audit (`continuity-audit-2026-09-13.md`, code-verified at the time) and the 2026-09-12 infrastructure baseline (`MUSE_PING_FULL_READ_ONLY_BASELINE.md`, live-probed at the time). Both are dated and stale-marked wherever used.

**Grading legend.** PROVEN = read in code or observed live on 2026-09-16. INFERRED = follows from proven mechanics (stdlib, SQL, code structure), marked as inference. NOT PROVEN = no evidence found, not asserted. NOT DEFINED = no code or doc defines it. SECOND-HAND = from a prior dated report, not re-verified. Stale = from the 2026-09-12 baseline; do not treat as current state.

---

## 1. EXECUTION MODEL FOUND

There is not one execution model. There are three competing implementations of "run work," plus a fourth dead-but-present authority class. They share no event store, no artifact store, no database, no identity scheme, no wire protocol, and no caller/callee relationship in either direction.

```
(A) ORCA / ping-runtime/orchestration
    ExecutionEngine.dispatchToAssignment
    - No subprocess, no container, no thread, no Python. Zero hits for
      child_process/spawn/docker/python in the live path (PROVEN).
    - "Execution" = build a prompt via ArtifactRouter, store a prompt
      artifact, return it in the HTTP response. THE CALLER IS THE EXECUTOR.
    - Only registered worker port: OpenCodeWorkerPort with executor: null,
      so WorkerPort.execute() returns {error:'no_executor'}. Nothing ever
      calls .execute() (PROVEN). No code assigns a non-null executor.
    - Autonomous loop FABRICATES worker output inline (hardcoded
      confidence: 0.85) and feeds it to collectWorkerOutput (PROVEN).
    - Boot comment (gateway_runtime.js:330-335): "authority, NOT the
      production spine... Keep DISABLED until an explicit Orca-vs-live-spine
      convergence decision is made." DiscoverOllama: false at boot.
    - Missions: in-memory array. Lost on restart (PROVEN).
    - Route POST /orchestration/* has NO auth middleware (PROVEN).

(B) PING CORE JS SPINE (gateway + runtime/)
    - Canonical durable event store: ping_events via UnifiedEventRuntime
      (PROVEN; route comment designates it the spine).
    - MissionRuntime -> MissionScheduler (5s poll, maxConcurrent 3,
      gateway_runtime.js:552-561) -> WorkerRuntime.dispatch
      -> in-process worker.handle(event) (SECOND-HAND 2026-09-13, PROVEN wired
      at boot by thread 2's read of gateway_runtime.js).
    - ping_missions: PG table, lifecycle created -> assigned -> running ->
      completed/failed -> archived; atomic lease claim via conditional
      UPDATE (PROVEN); 5s lease reaper returns expired leases to created
      (PROVEN); retries invisible until retry_at; exhausted -> failed ->
      DeadLetterAuthority -> repository_dead_letters (PROVEN).
    - runtime/execution_runtime.js: ExecutionRuntime with RollbackCoordinator
      (compensating actions in reverse, per-call success/failed recorded);
      step 8 publishes events via NATS, NOT the PG event store (PROVEN).
    - Gateway capability map (STALE 2026-09-12, live-probed then):
      command.run / test.run / build.run are NOT_IMPLEMENTED stubs that
      fail closed. The gateway cannot execute OS commands.

(C) PYTHON RUNTIME
    - ExecutionAuthority -> ExecutionAdapter.execute(request) ->
      SubprocessExecutionAdapter -> subprocess.run (PROVEN, 72-line file).
    - "One execution" = one ExecutionRequest -> one subprocess -> one
      anonymous in-memory result. No registry, no persistence, no
      correlation ID anywhere in the layer (PROVEN).
    - THE ONLY REAL OS-LEVEL EXECUTION IN THE REPO (PROVEN).
    - Callers (all construct the default authority directly):
      supervisor.py (tool subprocess, 30s, NO try/except: timeout crashes
        main()), tool_router.py (tool scripts, 15s, blanket except),
      worker_protocol.py (call_tool, 30s, dead `except TimeoutError`
        handler: TimeoutExpired is not a TimeoutError subclass on the Pig's
        Python 3.14.4, verified live), constitutional_event_loop.py and
      constitutional_runtime.py (run_docker -> docker exec brain-postgres
        psql, per poll, 1.0s/0.5s loops), projection_replay.py (module
      singleton, NO timeout passed: can block forever, PROVEN).
    - Executions NEST: supervisor spawns python tool_router.py spawns python
      tool script; one supervisor run = up to 12 subprocesses (PROVEN).
    - run_docker is a LIVE one-line wrapper (contradicts starting evidence):
      constitutional_event_loop.py:61 and constitutional_runtime.py:41.
      The only docker usage in repo code is docker exec into brain-postgres
      for psql; no mounts/env/network/resource limits in code (PROVEN).
    - No caller passes env or cwd: children inherit the ENTIRE parent
      environment, including secrets (PROVEN absence; risk INFERRED).
    - SQL is f-string-interpolated into the psql command (event_id, LIMIT,
      error text with only quote-doubling) (PROVEN code shape; exploitability
      INFERRED).
    - No EXECUTION_* events are emitted on this path (PROVEN absence).
    - Module docstring "All subprocess and child-process execution flows
      through this authority" is FALSE: >=10 other files use subprocess
      directly, some with shell=True (PROVEN by grep).

(DEAD) gateway/execution_authority.js (+ 5 sibling legacy authority files):
zero require() anywhere in gateway/, ping-runtime/, runtime/ (PROVEN).
Its contract advertises replay_inputs, deterministic_dispatch, rollback:
aspirational dead code. EventRoutingAuthority is likewise never
instantiated; its EXECUTION_STARTED/COMPLETED/FAILED chain is dead (PROVEN).
```

**The bottoming-out answer:** Orca does NOT bottom out in the Python ExecutionAuthority. They are genuinely separate execution systems, and the split is not clean layering: it is three competing implementations of "run work." Orca executes nothing at all (prompt dispatch over HTTP, disabled at boot); the JS spine executes in-process JS handlers with PG-backed mission leases; Python executes OS subprocesses. The repo's own comments acknowledge the duplication is unresolved ("explicit Orca-vs-live-spine convergence decision" pending). This is the direct evidence for the SOUL.md Constitutional Rule of One concern.

---

## 2. EXISTING PRIMITIVES WE SHOULD REUSE

Only primitives proven by code or tests. Nothing here is speculative.

1. **ExecutionAdapter protocol + adapter injection** (`runtime/authorities/execution_authority.py`). The one-method `execute(request)` seam is real; only the test file injects custom adapters, but the seam is the correct place for future Docker/Temporal/container backends. (PROVEN)
2. **Content-addressed event identity + idempotent persist.** `event_id = sha256({eventType, source, namespace?, logical_id|payload})` with `INSERT ... ON CONFLICT DO NOTHING` in UnifiedEventRuntime. Duplicate-safe by construction. (PROVEN)
3. **Atomic mission lease claim.** `UPDATE ... SET status='assigned' WHERE mission_id=$2 AND status='created'`; proven by `test_durability_invariants.js` that scheduler-B cannot steal scheduler-A's claim. (PROVEN by test, mock-based)
4. **Lease reaper for crash recovery.** `reapExpiredLeases()` returns expired running/assigned missions to `created`, never touches live leases or completed missions; renewal runs before reaping each poll. (PROVEN by test, mock-based)
5. **Retry state machine.** `retry_pending` invisible before `retry_at`, visible after; exhausted retries never re-enter pending; DLQ recorded exactly once. (PROVEN by test, mock-based)
6. **RollbackCoordinator pattern.** Compensating actions run in reverse order, continuing past individual rollback failures, per-call `status:'success'/'failed'` recorded, `rollback_attempted`/`rollback_result` on the report. (PROVEN code)
7. **RetryPolicy / RetryAuthority.** Exponential backoff 1s to 60s with deterministic jitter, maxRetries 5; mission default `{max_retries:3, backoff:'exponential'}`. (PROVEN code)
8. **CanonicalBytes.serialize hashing + hash chains.** `CanonicalAuthority.hash()` = sha256 over canonical bytes; `hashChain()` hashes the hashes; `PreviousEventHash` chain in the kernel schema. (PROVEN code; note: the live spine `ping_events` carries no hashes, identity only)
9. **RuntimeID provenance fingerprint.** node version, platform, arch, hostname, cpu model/count, memory, v8/openssl/uv/zlib versions; code comments explicitly scope it as provenance-only. (PROVEN code)
10. **`.agent-worktree.json` manifest schema.** Being written live by the Phase 3 smoke workstream into `worktrees/agent-smoke-abc123def456/`: agent_id, run_id, branch, base, repo, created_at, capability, state, container. Matches the orchestration spec field-for-field. The creating supervisor is external to the repo (PROVEN absent from repo). (PROVEN file, live prototype)
11. **PG advisory-lock design** (`gateway/advisory_lock.js`, 266 lines, keyed on aggregate type+id, "Every mutable aggregate must have one writer"). Implemented but zero callers. The design is sound and crash-safe (session-scoped); it needs wiring, not rewriting. (PROVEN code, unwired)
12. **Outbox pattern** (`gateway/event_outbox.js`: write-in-transaction, 1s relay publisher, `uq_outbox_event_id`, <=5 attempts then dead-letter). Implemented but never instantiated in bootstrap. (PROVEN code, unwired)

---

## 3. DUPLICATION RISKS

| Concern | Implementation 1 | Implementation 2 | Implementation 3+ | Verdict |
|---|---|---|---|---|
| Execution authority | Python ExecutionAuthority (real OS exec) | JS ExecutionRuntime + RollbackCoordinator (runtime/) | Orca ExecutionEngine (prompt dispatch, disabled); gateway/execution_authority.js (dead) | 3 live claimants + 1 dead |
| Event authority | UnifiedEventRuntime / ping_events (live spine) | Kernel pipeline: repository_events + EventRepository + EventReadAuthority + PreviousEventHash chain (implemented, bypassed by routes) | ConstitutionalEventSourcing (in-memory Maps); Orca private event_queue (JSON files); canonical_events (TenantOS envelope, bridged) | No EventAuthority class exists anywhere (PROVEN) |
| Identity | Python IdentityAuthority: uuidv7 (+ uuid5 deterministic, short ids) | JS identityAuthority.generateId(prefix, context) | Orca: mission_`<ts>`_`<rand>` / msn_`<sha16>` ad-hoc; ping_events: sha256 content hash; repository_events: canonical hash of (type, aggregate) only; gateway requestId: timestamp hash (not replay-deterministic) | 5+ schemes, no shared issuer |
| Run/mission abstraction | ping_missions PG lifecycle + leases | Orca in-memory missions | scripts/ mission plans (VerifyReplay); Python WorkerTask (send_task not_implemented) | No shared run/mission record |
| Replay | DeterministicReplayEngine (pure fold + fingerprint + witness) | projection_replay.py (Qdrant rebuild only, "no canonical state reconstruction" per its own docstring) | ContinuousReplayAuthority (certificates over the same fold) | All semantics (A); no re-execution path |
| Worktree ownership | scripts/worktree_executor.py: mission-scoped dir + worktree.json claiming mode "git-worktree" without invoking git | scripts/workspace_builder.py: workspaces/ + workspace.json, same properties | .agent-worktree.json: (agent_id, run_id)-scoped real git worktree, written by external supervisor (live prototype) | None shipped connects them; no teardown code anywhere |
| Credential/model boundary | Gateway /ai/* POST routes, unauthenticated (STALE 2026-09-12) | LiteLLM design (per-run expiring keys, provider creds out of images): exists, NOT deployed | Python children inherit full parent env (all provider keys visible to every tool script) | No single boundary |
| Failure vocabulary | Missions/executions: pending/processing/completed/failed/running | Replay: pending/running/completed/failed/comparing/accepted/rejected + FailureCode/ReplayPhase | Emit: {status:'ok'/'error'}; append/tool-router: {success:true/false}; FailureCodes envelope (UNKNOWN..HASH_ERROR); activity failures: failureCode | No unification; three success shapes |
| DB | crx_runtime (Python; compose's only defined PG) | crx (JS gateway default POSTGRES_DB, user crx; does not exist in compose) | brain-postgres container (the live exec target) | Gateway likely degraded in compose (INFERRED) |
| Artifact store | Orca: JSON files (artifact_store/) | JS: append_orchestrator (PG, transactional, throws on error) | Python: none (stdout JSON folded into memory) | No shared store |

---

## 4. DECISIONS ANSWERED BY THE REPO

Graded ANSWERED BY REPO / PARTIALLY ANSWERED / NOT DEFINED.

1. **Auditable unit: tool invocation or agent run?** NOT DEFINED. Python's auditable unit is one anonymous subprocess request (no execution_id). The JS spine's durable unit is the mission (ping_missions). Orca's is an HTTP dispatch. No shared execution_id or run_id exists in any schema. (PROVEN absences)
2. **Python path or Gateway/Orca path?** PARTIALLY ANSWERED. Python is the only path that executes OS work (PROVEN). The JS spine executes in-process JS handlers (PROVEN wired). Orca executes nothing and is boot-disabled by its own comment (PROVEN). The repo does not crown a canonical execution spine; three compete.
3. **Worktree ownership?** NOT DEFINED. Three models (mission-scoped scratch dirs, lease-claimed mission records, per-(agent,run) manifest) with no code connecting them; the manifest model exists only as a live prototype written by an external supervisor. No ownership decision in repo code.
4. **Partial-persistence failure semantics?** PARTIALLY ANSWERED. Artifact append: any error throws, no partial persistence (PROVEN). Event emit: persists then swallows downstream handler/integration failures while returning {status:'ok'} (PROVEN). Kernel pipeline: real BEGIN/COMMIT/ROLLBACK (PROVEN) but deliberately bypassed by the live routes (PROVEN comment). Outbox + TransactionBoundary: implemented, unwired (PROVEN). No unified execution-to-event-to-artifact transaction boundary exists on any live path (PROVEN).
5. **LiteLLM-only or direct provider access?** NOT DEFINED. The LiteLLM design (per-run expiring keys, creds out of images) exists but is not deployed and not in repo code. Gateway /ai/* POST routes were unauthenticated as of 2026-09-12 (STALE). Python tool children inherit the full parent environment including any provider keys (PROVEN absence of env passing).
6. **Network allowlist contents?** NOT DEFINED. No allowlist found in any thread's scope. (Thread 7 BLOCKED; treat as NOT PROVEN.)
7. **Fly Machines role?** NOT DEFINED. No Fly code surfaced in any thread. The orchestration directive already says Fly is not required and should not be the current foundation.
8. **GPU under same abstraction or separate class?** NOT DEFINED. No repo evidence in any thread's scope. (Thread 7 BLOCKED.)
9. **Replay/reproducibility level?** ANSWERED BY REPO: semantics (A) only, reconstructing/verifying state from historical events. DeterministicReplayEngine is a pure fold (replay, canonicalize, fingerprint, invariants, witness). projection_replay.py's own docstring limits it to Qdrant rebuild ("No canonical state reconstruction"). ContinuousReplayAuthority's certificates sit over the same fold. No code path re-invokes the original execution. (PROVEN)
10. **Enforce the capability gate now or later?** PARTIALLY ANSWERED. PolicyEngine.check_capability/require_capability exist with zero callers on the Python path (PROVEN). Gateway execution capabilities (command.run etc.) are fail-closed stubs (STALE 2026-09-12). De facto state = later; nothing in the repo forces now, and nothing wires the gate.

---

## 5. REMAINING HUMAN DECISIONS

Ranked by architectural impact. Only choices the repository cannot answer.

1. **Crown one execution spine.** Python subprocess authority, JS in-process spine, and Orca cannot all own "execution." Pick the owner; convert the others to consumers or archive them. Everything else (identity, events, replay, worktrees) depends on this call.
2. **Where does OS-level execution live?** Make the Python ExecutionAuthority the sole subprocess backend (ExecutionAdapter seam ready for Docker/container/Temporal adapters), or grow a real executor in the JS spine. Today only Python can run OS commands; the gateway stubs fail closed.
3. **Define the auditable unit.** Tool invocation vs agent run vs mission. This decides execution_id/run_id semantics across all layers and is the prerequisite for identity, lineage, and replay meaning anything.
4. **Settle the event authority.** Is ping_events/UnifiedEventRuntime canonical? What happens to repository_events + kernel pipeline, constitutional_events, canonical_events, Orca's private queue? Includes the sharpest proven defect: unlocked `SELECT MAX(sequence)+1` with silent event drop on conflict and no rowCount check.
5. **Settle worktree ownership.** Adopt the per-(agent,run) manifest-owned git worktree as the single model? Then define who creates, tears down, and reaps worktrees and containers on crash. The creating supervisor currently lives outside the repo; that is a sovereignty gap.
6. **Settle the model boundary.** Deploy LiteLLM-only with per-run expiring keys, and close or authenticate the unauthenticated /ai/* and /orchestration surfaces. Until then, provider keys are reachable from routes and inherited by every Python tool child.
7. **One identity authority.** Python uuidv7, JS generateId, content-hash event IDs, ad-hoc Orca IDs, timestamp-hash requestIds: pick the issuer per identifier class. Cross-layer correlation is impossible until this is one system.
8. **Set the replay promise.** Keep verification-only (A), or require execution reproducibility (B/C)? This determines the evidence capture list: container image, dependency manifest, model/tool versions, seeds, and filesystem/network state are all NOT captured today.
9. **Capability gate: now or explicitly later.** Wire PolicyEngine into ExecutionAuthority.run and the gateway, or record a dated deferral with a trigger. The current state is accidental, not decided.
10. **Unify failure vocabulary and the persistence contract.** Three success shapes ({status:'ok'}, {success:true}, {status:'completed'}), and PARTIAL/ABORTED/CANCELLED/TIMEOUT-as-status do not exist anywhere. Process/container/host crash semantics are NOT DEFINED anywhere. Write the contract or accept the gaps explicitly.

---

## 6. CONTRADICTIONS

Documentation vs code, and one subsystem vs another. Surfaced, not resolved.

1. "All subprocess and child-process execution flows through this authority" (module docstring) vs >=10 files using subprocess directly, some with shell=True. FALSE. (PROVEN)
2. "Single authority for all execution transport decisions" (class docstring) vs 5 of 6 production call sites constructing a fresh ExecutionAuthority per invocation; no shared instance, no registry, no state. It is a stateless constructor call. (PROVEN)
3. Docstring "Temporal and other backends are adapters behind the same interface" vs no Temporal adapter found anywhere. (NOT PROVEN either way; unverified claim)
4. "No partial persistence" (transaction_boundary.js docstring) vs the live emit path never instantiating TransactionBoundary. The guarantee is stated but not on the executed path. (PROVEN)
5. IDEMPOTENCY_IMPLEMENTATION.md specifies idempotency_manager.js plus idempotency_keys/execution_tokens/replay_tokens tables vs the file does not exist on this checkout. Doc-only idempotency. (PROVEN)
6. "Single canonical event pipeline. Every event flows through here." (UnifiedEventRuntime) vs a fully implemented parallel kernel pipeline (repository_events + hash chains + transactions) that the routes deliberately bypass, plus constitutional event sourcing in memory, plus Orca's private JSON event queue. (PROVEN)
7. mission_runtime.js: "Single canonical mission system... Replaces 12 dead mission implementations." vs gateway_runtime.js:330-335: "NOT the production spine... Keep DISABLED until an explicit Orca-vs-live-spine convergence decision is made." Three claimant systems. (PROVEN)
8. Orca presents as "CONSTITUTIONAL EXECUTION ENGINE" with an autonomous loop resolving missions at fabricated confidence 0.85 vs it executes nothing and is disabled at boot. Any dashboard closure rate from the loop is synthetic. (PROVEN)
9. prepare_worktree claims mode "git-worktree" vs it never invokes git worktree (plain mkdir + marker). (PROVEN)
10. advisory_lock.js: "Every mutable aggregate must have one writer. Application mutexes prohibited." vs event ingest allocating sequences with an unlocked MAX+1 and dropping the loser silently. The invariant is violated exactly where concurrent writers collide. (PROVEN)
11. EventBridge dedup guard (`event_id NOT IN (SELECT event_id FROM ping_events WHERE source='repository_events')`) vs the bridge re-emitting with new sha256 content-hash IDs: the comparison can never match. Vacuous guard; real dedup comes from the cursor + ON CONFLICT. (PROVEN)
12. Read/write split: writes go to ping_events; EventReadAuthority reads repository_events with ping_events only as fallback. A GET /events reader may see a different store than the writer wrote to. (PROVEN)
13. emit() returns {status:'ok'} when the INSERT was skipped (null pool) or downstream dispatch/integration failed silently. "ok" means accepted into the spine, not durable or delivered. (PROVEN)
14. Worker event retries: the retries counter increments on markFailed, but getUnprocessedEvents only returns rows with NO event_processing entry, so failed events are never rescheduled by the poller. Vocabulary says retries; mechanics say at-most-once redelivery after first failure. (PROVEN)
15. Two near-duplicate Python constitutional loops (constitutional_event_loop.py, 1.0s sleep; constitutional_runtime.py, 0.5s sleep). Which is canonical is NOT PROVEN. Both share the falsy-success defect: successful psql INSERT via -t returns "" which is indistinguishable from failure. (PROVEN)
16. Scope: the 2026-09-12 baseline's gateway/workspace_registry.js and 6 opencode worktrees describe the Windows C:\Users\nolan\PING tree, not /home/nolan/ping. Claims from that baseline do not transfer to the WSL repo without re-verification. (PROVEN by absence in WSL repo)
17. Orca mission IDs: route-created mission_`<epochMs>`_`<rand6>` vs compiler-created msn_`<sha16>`: two ID schemes inside one subsystem, neither issued by an authority. (PROVEN)
18. worker_protocol.py: except TimeoutError intended to catch subprocess timeouts vs TimeoutExpired not subclassing TimeoutError on Python 3.14 (verified live): the intended timeout message never fires. (PROVEN)
19. supervisor.py has no try/except around the authority call: a 30s TimeoutExpired or OSError propagates uncaught and crashes main(). (PROVEN)
20. projection_replay.py passes no timeout: subprocess.run(timeout=None) can block forever. (PROVEN)

---

## 7. HIGH-RISK UNKNOWNS

Only unknowns capable of changing the architecture.

1. **Is any desktop agent actually using the /orchestration dispatch/output loop?** It is the only Orca consumer path, it is unauthenticated, and no client code was found in-repo. If nobody uses it, Orca is removable weight. If someone does, it is a live unauthenticated remote-prompt surface. NOT PROVEN.
2. **Which Python loops actually run in production?** supervisor.py / tool_router.py / constitutional_event_loop.py / constitutional_runtime.py were audited statically only. No process inventory was performed (read-only scope). If the Python path is not running anywhere, the "only real OS execution" is dormant code and the architecture decision changes shape. NOT PROVEN.
3. **Does the JS gateway reach Postgres in production?** Compose defines only crx_runtime; the gateway defaults to database crx, user crx. If PG is unreachable, the gateway is in degraded in-memory mode and every PG-backed guarantee (durable audit, mission leases, event search) is absent at runtime. INFERRED likely degraded; NOT PROVEN live.
4. **Has the MAX+1 sequence race already caused silent event loss?** Two concurrent emits for one tenant can compute the same sequence; the loser is dropped with no error. There is no retroactive way to detect past losses. NOT PROVEN either way.
5. **Is /orchestration intentionally unauthenticated?** No auth middleware in gateway/bootstrap or the route file. If an outer layer (reverse proxy, container network policy) enforces auth, the repo does not show it. NOT PROVEN.
6. **Who owns the worktree supervisor?** The live .agent-worktree.json manifests are written by code outside the repo. If that supervisor is committed into the repo later, it becomes a fourth execution/worktree owner. The Phase 3 smoke workstream (worktrees/agent-smoke-abc123def456/, container 1ec3e51..., created 2026-09-16T16:27:28Z) is a separate authorized workstream; do not touch it during this audit. NOT DEFINED in repo.

---

## 8. RECOMMENDED NEXT AUDIT

Not ready for human decisions on items 2, 3, and the degraded-mode question until this evidence exists. Exact missing evidence:

1. **Process inventory on the Pig** (read-only): which Python processes (supervisor, event loops, worker_protocol consumers) and which gateway containers are actually running; `docker ps` full output; whether brain-postgres is the live exec target. Closes unknown #2.
2. **Live Postgres inspection** (read-only queries): does database `crx` exist; row counts and recency for ping_events, repository_events, ping_missions, event_processing, repository_dead_letters; any rows in event_outbox. Closes unknown #3 and grounds the degraded-mode question.
3. **Orchestration traffic check** (read-only logs): any POST to /orchestration/* in the gateway's recent logs; any desktop-agent consumer. Closes unknowns #1 and #5.
4. **Execute the test suites** on this branch (replay 53/53 claim, durability invariants, lease renewal, authority boundaries): the 53/53 and regression claims are SECOND-HAND and NOT PROVEN on constitutional-convergence-v2. Note: thread 6's lease tests are mock-based ("No Postgres, no Docker"); live-PG runs would prove deployment behavior.
5. **Re-verify the 2026-09-12 gateway security surface** (/ai/*, /ops, /governance, denied-path regex, /orchestration auth) against the current build: the baseline predates this branch and labels are STALE.

After 1-5: READY FOR HUMAN DECISIONS on the ten items in section 5.

---

## Appendix A. Execution traces

### A1. Python ExecutionAuthority path (PROVEN, thread 1)

supervisor.call_tool -> fresh ExecutionAuthority() -> run_command('python', [TOOL_ROUTER], timeout=30, input_data=json) -> ExecutionRequest(command='python', args=[...]) -> SubprocessExecutionAdapter.execute -> subprocess.run([...], stdout=PIPE, stderr=PIPE, timeout=30, text=False) -> anonymous ExecutionResult (returncode, stdout utf-8 errors=replace, stderr, command). returncode != 0 -> {'error': stderr}; else json.loads(stdout); 'success' flag checked. No logging, no persistence, no event, no ID. Exceptions (TimeoutExpired, OSError) propagate uncaught out of supervisor.main(). Nested: tool_router.run_script repeats the same shape one level down (timeout=15, blanket except Exception).

### A2. Gateway/Orca mission path (PROVEN, thread 2)

POST /orchestration/missions (no auth) -> ad-hoc mission object in engine._missions, id mission_`<ts>`_`<rand>` -> _executeMission checks WorkerPortRegistry.findAvailable -> POST /orchestration/missions/:id/dispatch -> dispatchToAssignment builds prompt via ArtifactRouter, stores prompt artifact, transitions worker label to 'running', returns {missionId, workers, outputs} WITH THE PROMPTS IN THE HTTP RESPONSE -> external caller does the work (nothing in-repo) -> POST /orchestration/missions/:id/output -> collectWorkerOutput -> ConsensusEngine.evaluate -> chained events to the private JSON event queue + consensus/merge artifacts to the JSON artifact store. Missions never persisted; restart loses them. Autonomous loop variant: startAutonomousLoop fabricates findings inline (confidence 0.85) and calls collectWorkerOutput directly.

### A3. run_docker path (PROVEN, thread 1)

constitutional_event_loop.run_psql_query / constitutional_runtime.run_psql_query -> fresh ExecutionAuthority() -> run_docker(['exec','brain-postgres','psql','-U','postgres','-d','crx_runtime','-t','-c',<f-string SQL>], timeout=30) -> run_command('docker', args=...) -> subprocess.run(['docker', ...]). Result: returncode != 0 -> logger.error(stderr) -> None; else stdout.strip(). fetch_unprocessed_events parses psql -t output into Events; mark_event_processed/mark_event_failed INSERT/UPDATE via the same path. Successful INSERT returns "" (falsy), indistinguishable from failure; callers ignore the return value anyway. Live daemon state 2026-09-16 ~10:40 MDT: brain-postgres Up 26 minutes, Docker 29.5.3, so the path currently works.

---

## Appendix B. Identifier table

| Identifier | Scheme (proven) | Issuer | Grade |
|---|---|---|---|
| execution_id | none; Python result is anonymous; ExecutionRuntime keeps in-memory executionReport (key scheme not traced) | none | NOT DEFINED |
| run_id | none in any schema; exists only in the live smoke prototype's .agent-worktree.json | external supervisor (not in repo) | NOT DEFINED (prototype only) |
| mission_id | ping_missions PK (ON CONFLICT DO NOTHING); Orca route: mission_`<epochMs>`_`<rand6>`; Orca compiler: msn_`<sha256(type+overrides)[:16]>`; continuity audit 2026-09-13: deterministic from mission type + source event | multiple, none authoritative | PROVEN multiple schemes |
| job_id | mission job config {max_retries, backoff}; exhausted -> repository_dead_letters | mission_authority_v2 / DeadLetterAuthority | PARTIALLY PROVEN |
| task_id | Python WorkerTask.task_id exists; send_task returns error="not_implemented"; runtime/cognitive/models.py TaskStatus enum (setters not traced) | partially wired | PROVEN exists, INFERRED mostly unwired |
| worker_id | static labels (opencode:local, ollama:`<model>`); lease holder assigned_to; workers/worker_runtime.py | WorkerPortRegistry / MissionScheduler | PROVEN |
| agent_id | exterior_agent_credentials PG table (auth truth); Orca manifest agent_id; agent IDs exposed on /capabilities/health (STALE 2026-09-12) | gateway auth layer / external supervisor | PROVEN |
| request_id | timestamp hash, not replay-deterministic (STALE 2026-09-12) | gateway route_middleware | PROVEN (stale) |
| correlation_id / causation_id | metadata on ping_events; expression indexes (thread 4); causation+correlation IDs in emit metadata (SECOND-HAND 2026-09-13) | UnifiedEventRuntime | PROVEN present; total order NOT DEFINED |
| trace_id | no hits surfaced | - | NOT PROVEN |
| event_id | ping_events: sha256({eventType, source, namespace?, logical_id|payload}); repository_events: canonical hash of (type, aggregate) only, no conflict handling; Orca: sha256(eventType+data) 16-hex, in-memory dedup | UnifiedEventRuntime / identityAuthority / Orca EventQueue | PROVEN, incompatible schemes |

---

## Appendix C. Domain table

| Domain | What the repo actually implements | Grade |
|---|---|---|
| agent | External worker identity: exterior_agent_credentials (PG auth truth); desktop agent as Orca's HTTP executor; Meta AI as research worker (delegation architecture, out of repo scope) | PROVEN |
| worker | Lease-claimed mission consumer (MissionScheduler, assigned_to + lease_until + heartbeats); Orca WorkerPort label with null executor | PROVEN |
| mission | JS spine: PG-backed execution unit with lease lifecycle; Orca: in-memory coordination object; scripts/: static plan (VerifyReplay) | PROVEN, three meanings |
| run | NOT DEFINED in any schema; prototype-only in .agent-worktree.json | NOT DEFINED |
| task | Python WorkerTask (dispatch not implemented); TaskStatus enum pending/in_progress/completed/failed (models.py, setters untracked) | PROVEN exists, INFERRED unwired |
| job | Mission job config + dead-letter unit (repository_dead_letters, retry_count, failure_reason, replayable) | PROVEN |
| execution | Python: one anonymous subprocess request; runtime/execution_runtime.js: in-memory execution report with rollback record; Orca: prompt dispatch, no execution | PROVEN, three meanings |

---

## Appendix D. Event authority map

| Store | Writer (live) | Reader | Status |
|---|---|---|---|
| ping_events | UnifiedEventRuntime.emit() | GET /events* (primary), traversal APIs, bridge cursor | Canonical spine per route comment; content-hash ID; ON CONFLICT DO NOTHING; no sequence, no hash chain, no hashes on rows |
| repository_events + event_processing | EventRepository.appendEvent; ~20 gateway authorities; workers via POST /events/processed, /events/failed | EventReadAuthority; EventBridge poll | Legacy-but-wired; caller-assigned sequence; PreviousEventHash chain; plain INSERT, no conflict handling |
| event_outbox | EventOutbox.write() | 1s publisher -> Redis/in-memory bus | Implemented, never instantiated in bootstrap: unwired |
| constitutional_events + constitutional_snapshots | ConstitutionalEventSourcing | same class, in-memory Maps | Parallel event-sourcing implementation |
| canonical_events | POST /canonical-events; TenantOS writers | EventBridge._bridgeCanonicalEvents -> re-emitted into ping_events | Second envelope (UUID PK, per-tenant sequence) |
| legacy events table | nobody current | projection_replay.py, constitutional_event_loop.py | Legacy Python readers only |
| Orca event_queue/*.json | Orca EventQueue | in-process subscribers | Private bus; no bridge to any PG store |

EventAuthority / IEventAuthority: does not exist (PROVEN). EventRoutingAuthority and gateway ExecutionAuthority: never instantiated (PROVEN). No EXECUTION_* events on any live path (PROVEN).

---

## Appendix E. Failure vocabulary (PROVEN code reads, thread 5)

Defined: pending/processing/completed/failed (execution reports, tasks, missions); running; ReplayStatus pending/running/completed/failed/comparing/accepted/rejected (replay certificates only); {status:'ok'}/{status:'error'} (emit); {success:true/false} (artifact append, tool router); processed/failed + retries + last_error (event_processing); FailureCodes UNKNOWN/AUTHORITY_ERROR/COMPILATION_ERROR/VALIDATION_ERROR/REPLAY_ERROR/WITNESS_ERROR/STORAGE_ERROR/NETWORK_ERROR/PARSING_ERROR/HASH_ERROR (deterministic_failure_envelope); FailureCode + ReplayPhase incl. PARENT_NOT_FOUND, DUPLICATE_EVENT_ID, DUPLICATE_ARTIFACT_ID, CYCLE_DETECTED, FORBIDDEN_EDGE_DETECTED (replay kernel only); failureCode/failureReason on activity events; mission_status/execution_status DB columns (only 'pending'/'completed' literals found); degraded:true + 503 (gateway PG-unavailable posture; single SELECT 1 probe, 3s connect timeout, no retry); healthy/degraded/ready (component health); dead_lettered (repository_dead_letters); ROLLBACK (DB transactions only, not business sagas).

NOT DEFINED BY PING (zero code hits): PARTIAL, ABORTED, CANCELLED, TIMEOUT as a status, SUCCESS as a status, UNKNOWN as an execution status. IdempotencyManager: specified in IDEMPOTENCY_IMPLEMENTATION.md, file does not exist on this checkout (doc-only). Three success shapes coexist with no mapping.

---

## Appendix F. Persistence/crash matrix (PROVEN unless noted)

| Scenario | Behavior |
|---|---|
| Before execution | Validation/governance rejection -> {status:'error'}, nothing persisted |
| During execution | ExecutionRuntime: step failure -> RollbackCoordinator compensates in reverse -> report status 'failed', errors appended, frozen in memory map |
| After execution, before artifact persist | AppendOrchestrator: any error -> rollbackTransaction -> throw; {success:true} never returned |
| After artifact, before event | Artifact commits in own transaction; ExecutionRuntime then publishes via NATS (not PG store); whether the committed artifact is inside the rollback set is NOT established; no cross-boundary atomicity found |
| After event, before response | Row persisted; handler/integration failures caught, logged, swallowed; caller gets {status:'ok'} anyway; pool-null also returns ok with no INSERT |
| Process crash | No SIGTERM/SIGINT handlers in gateway bootstrap; no graceful shutdown or in-flight accounting: NOT DEFINED |
| Container crash | Nothing found: NOT DEFINED |
| Host crash | Nothing found: NOT DEFINED |
| Retry | Outbox relay <=5 attempts then rows sit unpublished (no dead-letter transition found); RetryPolicy exp 1s-60s jitter maxRetries 5; mission {max_retries:3}; exhausted -> DeadLetterAuthority; Python worker loop exits after MAX_RETRIES consecutive errors |
| Duplicate request | ping_events: ON CONFLICT DO NOTHING, counted as deduplicated; retry with identical inputs re-dispatches handlers (at-least-once delivery, at-most-once persistence); kernel pipeline: same (type, aggregate) -> same event_id -> plain INSERT -> PK violation -> rollback -> artifact.fail (not idempotent); canonical_event_envelope: duplicate (tenant_id, sequence) -> ON CONFLICT DO NOTHING without rowCount check -> silent drop (PROVEN code; production occurrence NOT PROVEN) |

---

## Appendix G. Worktree and concurrency (PROVEN, thread 6)

Ownership models: (a) scripts layer, mission-scoped scratch dirs, shared by concurrent runs of the same mission, never cleaned, no locking; (b) execution layer, lease-claimed mission records in PG, crash-recovered by the 5s reaper; (c) live prototype, per-(agent,run) manifest-owned real git worktree, supervisor external to repo. No flock, no lockfile, no ledger, no teardown code for filesystem workspaces. Concurrency: MissionScheduler maxConcurrent 3; atomic claim proven by test; worker crash recovered by lease expiry; two agents sharing one worktree: nothing prevents it (git's one-branch-per-worktree is the only guard); duplicate submissions: mission creation idempotent via ON CONFLICT, event ingest not safely idempotent.

---

## Appendix H. Model-provider and credential boundaries

- LiteLLM design (local model aliases, per-run expiring virtual keys, central routing/fallback/usage logging/limits, provider creds out of agent images, sidecar shim only for non-OpenAI-compatible CLIs): completed 2026-09-16, NOT deployed, not in repo code. Role defined as infrastructure, not constitutional authority. (Design, not primitive)
- Gateway /ai/* POST routes were unauthenticated as of 2026-09-12 (STALE baseline, live-probed then; needs re-verification on this branch).
- Python tool children inherit the full parent environment; no caller passes env. Any provider credential in the parent process environment is visible to every tool script. (PROVEN absence; risk INFERRED)
- POSTGRES_PASSWORD = "postgres" module constants exist in the Python loops but are never used in the docker exec args; psql relies on in-container trust/peer auth (INFERRED). (PROVEN code shape)
- Bearer credential truth is the PG exterior_agent_credentials table, not container env (SECOND-HAND 2026-09-13; env vars are seed values for empty table or degraded mode).

---

## Appendix I. Security properties (graded)

| Property | Grade | Basis |
|---|---|---|
| Gateway fail-closed authorization (unknown agents denied, user repoId rejected, canonical repo protected, path containment via realpath) | PROVEN (stale) | Live-probed 2026-09-12; re-verification needed on this branch |
| /orchestration routes require auth | CONTRADICTED | No auth middleware in gateway/bootstrap or route file (PROVEN 2026-09-16 code) |
| Denied-path credential protection matches | CONTRADICTED | Regex anchored to absolute path, never matches (live-probed 2026-09-12) |
| Broad unauthenticated surface (/ai/* POST, /connectors sync+oauth, /ops, /governance, health disclosing agent IDs) | PROVEN (stale) | Live-probed 2026-09-12; re-verification needed |
| Gateway execution capabilities fail closed (command.run/test.run/build.run NOT_IMPLEMENTED) | PROVEN (stale) | Live-probed 2026-09-12 |
| Python tool subprocesses cannot see parent secrets | CONTRADICTED | env=None in every caller; full inheritance (PROVEN 2026-09-16) |
| SQL passed to psql is injection-safe | NOT PROVEN | f-string interpolation of event_id/LIMIT/error text (PROVEN code shape 2026-09-16); only quote-doubling on error text |
| Event emission durable when it returns ok | CONTRADICTED | ok returned with pool-null skip and swallowed downstream failures (PROVEN 2026-09-16) |
| Concurrent event ingest never loses events | CONTRADICTED | Unlocked MAX+1 sequence with silent ON CONFLICT drop, no rowCount check (PROVEN 2026-09-16) |
| Orca autonomous loop outputs represent real work | CONTRADICTED | Fabricated inline findings at confidence 0.85 (PROVEN 2026-09-16) |
| "No partial persistence" holds on the live path | CONTRADICTED | TransactionBoundary never instantiated in bootstrap (PROVEN 2026-09-16) |
| LiteLLM per-run keys isolate provider credentials | NOT PROVEN | Design only, undeployed |
| Docker sandboxing (mounts, env, network, limits) for agent workloads | NOT PROVEN | Only docker usage is exec into brain-postgres; no sandboxing in code (PROVEN 2026-09-16) |
| Request IDs replay-deterministic | CONTRADICTED | Timestamp hash (STALE 2026-09-12) |

---

## Appendix J. Replay vs execution reproducibility

Replay semantics: (A) reconstructing/verifying state from historical events. PROVEN. DeterministicReplayEngine: fresh ReplayStateMachine, applyEvent per stream event, canonicalize, fingerprint, invariants, witness root. Pure fold; nothing re-executes. kernel_replay_execution_provider.executeReplay: converts PING events to CanonicalEventEnvelope + ReplayEventStream, runs the engine. Tests assert determinism of pure functions/streams, not re-running executions. ContinuousReplayAuthority.replayBranch mints certificates over the same fold; its commit/branch fields describe code being certified while folded events describe data; only ReplayID graph hashes link them.

Evidence captured: full payload JSONB (PROVEN); witness input_hash/output_hash (PROVEN); RuntimeID provenance fingerprint (PROVEN, explicitly provenance-only); authority/authority_version/constitutional_version on events (PROVEN); ReplayCertificate branch+commit (PROVEN); ReplayID = hash of canonical/reducer/authority graph hashes, i.e. which reducers/authorities existed, not source bytes (PROVEN).

NOT captured: container image (NOT PROVEN); dependency manifest (NOT PROVEN; EngineProfile covers v8/openssl only); model name/version in events (NOT PROVEN; embeddingModel is code config); tool versions on spine events (NOT PROVEN; SECOND-HAND 2026-09-13); filesystem state (NOT PROVEN); network state (NOT PROVEN); randomness/seeds (NOT PROVEN); external API response envelopes (NOT PROVEN; only derived observations kept); time control: timestamps recorded live, no freeze/mock in the time authority (PROVEN absence).

Ordering for replay: ping_events has no sequence column; replay consumes an explicitly ordered ReplayEventStream, so spine replay depends on timestamp ordering or caller-supplied order (INFERRED).

The 53/53 replay-tests-passing claim and the 42/42 and 108/108 regression claims are SECOND-HAND (2026-09-13 era) and NOT PROVEN on constitutional-convergence-v2; the test files exist with (A)-flavored assertions but were not executed (read-only, no installs).

---

## Appendix K. Test contracts (what each test actually establishes)

- tests/test_runtime_authority_boundaries.py: establishes the ExecutionAdapter protocol is a real injection seam (custom adapters) and that run_docker wraps docker commands with args preserved. Does NOT establish production behavior; all production call sites use the default adapter. (PROVEN by thread 1's read)
- gateway/test_durability_invariants.js: atomic lease claim (no double-claim, no steal), expired-lease reclamation to created with assignment cleared, live leases untouched, completed missions never reclaimed, retry_pending visibility around retry_at, exhausted retries never re-enter pending, DLQ exactly once. Mock-based ("No Postgres, no Docker" headers): proves logic, NOT deployment behavior. (PROVEN by thread 6's read)
- gateway/test_lease_renewal.js: renewal before reaping each poll; slow workers not falsely reaped; non-fatal renewal failure. Same mock caveat. (PROVEN by thread 6's read)
- Replay determinism tests (tests/certification/replay_determinism.test.js, replay-ordering-fuzz.test.ts, test/constitutional_replay.test.js): deterministic ID generation, same-inputs-to-same-outputs compiler runs, event-ordering determinism. (A)-flavored; do not test re-execution. Pass status on this branch NOT PROVEN. (PROVEN existence + assertion flavor by thread 4)
- Threads 3/7/8 BLOCKED: identifier-table and model/security fresh reads did not complete; those sections rest on dated secondary evidence as labeled. Do not treat them as current-state proof.

---

## Provenance of this report

- Thread 1 (Python ExecutionAuthority + run_docker): completed, live reads.
- Thread 2 (Gateway/Orca mission path + bottoming-out): completed, live reads.
- Thread 3 (identifiers/domains): BLOCKED (tunnel outage); secondary evidence only.
- Thread 4 (event authority + replay): completed, live reads.
- Thread 5 (failure vocabulary + crash matrix): completed, live reads.
- Thread 6 (worktrees + concurrency): completed, live reads.
- Thread 7 (model access + network/security): BLOCKED (tunnel outage); secondary evidence only.
- Thread 8 (test contracts): BLOCKED (tunnel outage); partial corroboration from threads 1, 4, 6 live reads.

Raw thread handoffs are preserved under the goal's hidden_files for the next audit. No repo state was modified to produce this report.
