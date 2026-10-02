# ORCA Inventory — what ORCA actually does TODAY (2026-09-23)

Archaeology lane C1, Wave 1 of ORCA FINISH. All inspections read-only. Nothing
modified in any repo. Deliverable dir: `~/workspace/orca-finish/wave1/orca-arch/`
(checkpoint: `CHECKPOINT.md`).

## Headline

ORCA today is a **complete but currently dormant** autonomous execution stack
living on the Pig in branch `feature/orca-autonomy` (worktree
`/home/nolan/worktrees/orca-autonomy`, checked out at `ae55b77ff`). It does
NOT run continuously. Its real capability, proven live on 2026-09-18 and
independently audited, is a **bounded coordinator loop that observes the live
PING spine, delegates bounded tasks to exterior agents through a fail-closed
WorkOrder boundary, and records outcomes as canonical PING events**. It is not
a facade anymore (the facade was the pre-A5 `ExecutionEngine`, see #7 below),
but it is not a running service either: last witnessed execution 2026-09-18,
no scheduler/cron/service keeps it alive, A7 (continuous operation) was never built.

What it actually does, stage by stage (traced from source at branch tip):

1. **OBSERVE** (read-only): `MissionRuntime.getStats/getPending/getActive`,
   `ping_events` 24h counts, most-recent completed mission, gateway `/health`.
   No authority crossed.
2. **PLAN**: objective text → tasks with capability + constraints (data artifact).
3. **AUTHORIZE**: `external_agent_adapter.authorizeWorkOrder` — fail-closed
   (unknown agent / PENDING_AUTH / blockedExternal / capability not in profile /
   bad namespace / constraints not tightening / missing no_canonical_events +
   no_mission_state_writes → denied). Plus an internal policy classifier
   (`orca_policy.js`) whose decision is persisted as evidence.
4. **DELEGATE**: `issueWorkOrder` builds (never sends) the closed 14-field
   envelope (deterministic `work_order_id = sha256('workorder:'+taskId)[0:16]`
   at A5; stable `(objective_id, task_key)`-derived after 6a342dd27); principal
   always `ping:external-agent-adapter`. Then spawns the exterior worker:
   Hermes via `hermes_dispatch.py` (venv python → `hermes_cli/main.py -z`,
   prompt inline in a transient file, result via crash-safe atomic rendezvous
   file since 6a342dd27); goose/qwen/crush CLI invocations proven in cli-proofs.
5. **MONITOR**: 180s dispatcher timeout < 10min work-order deadline; timeout →
   honest `failed` envelope (never fabricated success); transport failure →
   bounded re-plan; protocol failure (no parseable envelope) → escalate.
6. **VERIFY**: `verifyResultEnvelope` binds authorized==invoked==result agent,
   echo of work_order_id/context_pack_id/capability, completed/failed
   output-error rules, `verifiedAt <= deadline`; invalid is non-retryable.
7. **RECORD**: `recordVerifiedResult` asks **PING's own**
   `UnifiedEventRuntime` (injected, identity by `computeEventId`) to emit
   `WORKER_COMPLETED`/`WORKER_FAILED`. ORCA mints no event identity; ORCA
   emits no canonical events itself.
8. **ASSESS → FOLLOW-UP / RETRY / ESCALATE / CLOSE**: follow-up input is
   built from live state at follow-up time with `causation_id` = prior
   event_id; worker-reported `failed` → same taskId re-issued with
   attempt+1 (max 2 attempts, max 2 work orders per run); auth denial,
   validation failure, or retry exhaustion → escalate (exit 3). Exit 0 on
   close. 10-state status ledger (`orca_status_model.js`) enforces legal
   transitions only.
9. **Crash safety** (commit 6a342dd27, untested in witnessed form per its own
   commit message): durable objective identity from logical intent only,
   durable budget + cancellation under `PING_DATA_ROOT/objectives/`,
   single-coordinator claim via PostgreSQL session-level advisory lock
   (SIGKILL-safe: DB releases on session drop), attempt recorded BEFORE
   dispatch, dispatcher writes rendezvous result atomically, `reconcileStartup()`
   before any new dispatch, completed objectives refuse fresh work.

## Inventory table

| # | Artifact | Repo / location / SHA | What it actually does | Caller → callee | State read / written | Side effects | Status | Classify |
|---|---|---|---|---|---|---|---|---|
| 1 | `feature/orca-autonomy` branch (115 orca/ files) | `/home/nolan/ping`, ref → `ae55b77ff82a893d50c48ab299117b2f705a0f03`; worktree `/home/nolan/worktrees/orca-autonomy` @ same SHA, clean | The only durable ORCA implementation. Contains the A5 loop, A6 remediation, measurements, evidence, and two convergence commits | — | — | — | Live (as code), **dormant (not running)** | **KEEP** |
| 2 | Commit `992e12725` "ORCA autonomy: real orchestration layer above PING constitutional spine" | same repo (reachable ancestor of #1; `git cat-file -t` = commit) | Added `orca/control-loop/` + evidence, 12-profile adapter, honest `/orchestration/engine/loop` route; removed synthetic autonomy metrics (preserved deprecated synthetic path) | — | — | — | History (superseded by 6a342dd27 + convergence commits) | **ARCHIVE** (history; do not cherry-pick) |
| 3 | `ping-runtime/external-agent/external_agent_adapter.js` (canonical) | branch tip; vendored byte-copy retired 2026-09-18 (workstream e) | Owns ONE PING-side decision: "may PING issue work order W delegating capability C to exterior agent A under constraints K?" Exports `authorizeWorkOrder`, `issueWorkOrder` (now with stable `workOrderId` override), `verifyResultEnvelope`, `recordVerifiedResult`. 12 unique `AGENT_PROFILES` (hermes, codex, opencode, cloud-subagent, ollama, identity_1–4, goose, qwen, crush); 11 marked LIVE; 2 `blockedExternal` (opencode permanent, codex time-bounded, expired 2026-09-17) | loop delegate() → authorize/issue; adapter → injected `eventRuntime.emit` | reads profiles (in-module data); writes: none of its own — only via injected PING runtime | emits WORKER_COMPLETED/WORKER_FAILED **through PING's runtime only** | Live code, exercised by witnessed runs + tests | **KEEP + WIRE** (this is the WorkOrder boundary ORCA must bottom out through; no new authority needed) |
| 4 | `orca/control-loop/orca_control_loop.js` | branch tip, 1192 lines / 60KB, runs on Pig WSL under node 22 | The coordinator: `main()` → durable objective identity → cancel check → completed check → PG advisory-lock claim → `reconcileStartup()` → `observe()` → `buildPlan()` → `delegate()` (t1) → `assessAndFollowUp()` (t2) → `99-close.json` / escalate / fatal. Reads live PING state; spawns workers; verifies; records | `run-loop.sh` → this; this → adapter, `dispatchHermes()`, `MissionRuntime`, `UnifiedEventRuntime`, policy modules, objective-runtime | reads: `ping_missions`, `ping_events`, gateway /health; writes: evidence JSONs + `PING_DATA_ROOT/objectives/` durable state; **never writes mission state or canonical events directly** | spawns Hermes subprocess on Windows side; inserts canonical events via PING runtime; writes evidence files | Dormant (no runner active; last witnessed run 2026-09-18) | **KEEP** |
| 5 | `orca/control-loop/objective-runtime.js` | branch tip, 18.6KB | PING-side durable-state module: `deriveObjectiveId` (intent-only), `deriveWorkOrderId`/`deriveAttemptId`, atomic temp+rename writes, `acquireCoordinatorLock` (PG advisory lock on dedicated client; refuses to use the gateway's unsound `AdvisoryLock` pool pattern), durable budget, cancellation, rendezvous result paths | loop main()/delegate() | writes `PING_DATA_ROOT/objectives/<id>/` | PG advisory-lock acquire/release | Dormant (same as #4) | **KEEP** |
| 6 | `orca/control-loop/hermes_dispatch.py` | branch tip, 4.2KB | Spawns Hermes: venv python → `hermes_cli/main.py -z <inline prompt>`, working dir `C:\Users\nolan\AppData\Local\hermes\hermes-agent`; captures stdout/stderr; on timeout returns code; since remediation writes an atomic rendezvous record (result-file path + metadata JSON via argv) so a killed coordinator reconciles instead of losing output | loop `dispatchHermes()` (subprocess, 180s timeout) | reads prompt file; writes rendezvous result file + prints envelope | spawns Windows process; transient prompt files in `C:\Windows\Temp` (cleaned) | Dormant | **KEEP** |
| 7 | `orca/control-loop/run-loop.sh` | branch tip, 532 bytes | Launcher: resolves `PGPASSWORD` at the process boundary from the live `ping-gateway` container env (`docker exec ... printenv POSTGRES_PASSWORD`); values never touch disk/logs; `exec node .../orca_control_loop.js` | human/cron → loop | none (env only) | starts the loop process | Dormant | **KEEP** |
| 8 | `orca/control-loop/policy/` (`orca_policy.js`, `orca_status_model.js`, `recovery_decisions.js`) | branch tip, ~29KB total | `classifyDelegation` (AUTO_EXECUTE / REQUIRES_HUMAN_APPROVAL decision classes from live governance), 10-state status model with legal-transition enforcement (`OrcaStatusLedger`), retry/follow-up decision tables. Decisions persisted as evidence; adapter stays the final gate | loop delegate() | reads nothing external; writes evidence JSONs | none | Dormant | **KEEP** |
| 9 | `orca/measurements/` (`measure.js`, `index.js`, `measure.test.js`, `MEASUREMENTS.md`) | branch tip | 10 autonomy metrics derived **only** from canonical `ping_events` rows (read-only SELECTs, no writes); honesty contract: measured / proxy / insufficient_evidence (null, never fabricated) / not_applicable; raw counts, no percentages | `index.js` → PG; `measure.js` pure | reads `ping_events`/`ping_missions` | none | Dormant | **KEEP** |
| 10 | `gateway/routes/orchestration.js` `POST /orchestration/engine/loop` | branch tip (diff in 992e12725, retained at tip) | Route now `await engine.startAutonomousLoop(...)` and reports honest fields (`executed/dispatched/resolved/unexecuted/unexecutedReasons/autonomousExecution/measurementStatus`); the synthetic path preserved as `startAutonomousLoop_SYNTHETIC_HISTORICAL_DEPRECATED` | HTTP caller → engine | reads engine dashboard | none | Live in branch; no traffic observed (orchestration surface orphaned from business path per 2026-09-13 audit) | **KEEP** (route), **ARCHIVE** the deprecated synthetic function |
| 11 | Pre-A5 ORCA `ExecutionEngine` fabric (`ping-runtime/orchestration/execution/`: engine.js, scheduler.js, mission_compiler.js, consensus_engine.js, worker_port.js, capability_registry.js/json, etc.) | mainline HEAD + branch | The 2026-09-18 forensic verdict: facade. Instantiated at gateway boot, internally wired, but `executor: null` on the only registered port (`opencode:local`, 0 tasks completed); `dispatchToAssignment` builds a prompt artifact and waits — never calls `execute()`; private EventQueue disconnected from the PING spine. Nothing executes through it | gateway boot → initialize(); nothing calls it on the business path | in-memory + container-ephemeral JSON files | none real | **Dormant / dead** (superseded by the WorkOrder boundary path) | **DELETE or ARCHIVE** after convergence review (decision for Nolan/parent; do NOT act in this lane) |
| 12 | `orca/control-loop/evidence/run-*/` (+ `status-ledger.json`) | branch, ~60 evidence JSONs | Audit trail of witnessed runs (orca-run-mu6wmbzn, orca-run-mu6x9eeh, orca-run-mu725l0c FAIL, etc.): objective/observe/plan/policy/workorder/dispatch/verify/result/assess/close/escalate artifacts | written by the loop | filesystem | none | Frozen evidence | **KEEP/ARCHIVE** (do not delete: it is the A5 proof record) |
| 13 | A5 docs (`ORCA-ROLE.md`, `ORCA-INVENTORY.md`, `RESTART-RECOVERY-DESIGN.md`, `SECTION-6..9`, `THRESHOLD-CALIBRATION.md`, `CONTROL-LOOP-DESIGN.md`, `SPINE-TRACE.md`, `A5-CERTIFICATION-RECORD.md`, `ORACLE-INSPECTION.md`) | branch | Boundary definitions, bounded-autonomy policy, hierarchical causation, certification binding (points at 992e12725 and the independent audit verdict) | — | none | none | Documentation-only | **KEEP** |
| 14 | A6 FAIL evidence (`00b1194fe` commit message + `a6-restart-proof-2026-09-18.md` referenced in cert record) | branch history | Witnessed: SIGKILLed run orca-run-mu725l0c restarted as orca-run-mu72ads8 → no durable reconstruction, duplicate delegation. Honest FAIL that drove 6a342dd27 | — | none | none | History | **KEEP** (the antifragile proof) |
| 15 | Independent audit verdicts (sandbox, not Pig) | `~/workspace/goals/ping-agent-execution-stack/hidden_files/orca-a5-audit-verdict-2026-09-18.md` ("A5 SUBSTANTIALLY PROVEN"), `orca-a6-readiness-2026-09-23.md`, `orca-cli-proofs/{CERTIFICATION.md, goose,qwen,crush,opencode-proof.json}` | Independent verification of A5 claims against live PG + evidence files; A6 re-proof sequencing note (witnessed re-proof of 6a342dd27 still pending) | — | none | none | Evidence | **KEEP** |
| 16 | Local staging copies | `~/workspace/orca-dispatch-test/` (SPINE-TRACE.md, CONTROL-LOOP-DESIGN.md, hermes_dispatch.py, run-loop.sh, orca-audit2.js, orca-audit3.js), `~/workspace/orca-remediation/` (objective-runtime.js, orca_control_loop.js, hermes_dispatch.py, delegate.new.js, main.new.js, adapter-compat-test.js, lock-test.js, ledger-selftest.js, patch_adapter.py, ship.sh), `~/workspace/orca-workstream-d/` (external_agent_adapter.js, validate_dispatcher_profiles.js, AGENT_PROFILES.md, fix_backslash.py, fix_boundary.py, transfer.sh) | Pre-commit staging of files now committed on the branch (validate_dispatcher_profiles: 64/64 PASS re-run during audit). `patch_adapter.py` was the surgical script that added the stable `workOrderId` override (landed in 6a342dd27). `orca-audit2/3.js` are one-off live-PG audit scripts (note: contain a PGPASSWORD placeholder — credential hygiene, do not run blindly) | — | none (copies) | none | Redundant with branch | **ARCHIVE** (do not delete until Wave-1 merge decision; they are the only off-Pig copies) |
| 17 | `~/workspace/orca-omniroute-audit-2026-09-13.md` | sandbox | Pre-A5 read-only audit: documents the ExecutionEngine facade state (executor: null, disconnected from spine). Superseded by A5 but historically accurate | — | none | none | Documentation-only (historical) | **ARCHIVE** |
| 18 | `~/workspace/orca-autonomy-work/pig-{get,node,put}.sh` | sandbox | Pig file-transfer helpers | — | none | none | Tooling | **KEEP** (harmless utility) |
| 19 | `grpc-js` `orca.*` files under `gateway/node_modules` | mainline | gRPC xDS ORCA load-reporting protobuf (telemetry), unrelated to PING ORCA | — | none | none | Dead-end for this task | **IGNORE** |
| 20 | CRX library `~/workspace/crx-autonomous-missions/repos/orca/` | sandbox (harvest library) | `orca-cli/orca` open-source Go "orchestration layer for AI coding agents" (week-1 skeleton: `orca version` only; `orca_list_runs` unimplemented). **A different Orca entirely** — no relationship to PING-backend ORCA | — | none | none | External reference | **IGNORE** (do not conflate) |

### Not found anywhere (searched, read-only)

- `orca-cli` as a PING-backend CLI: **does not exist** (the only "orca CLI" is the Go project's `orca version`).
- `MissionCompiler`, `ConsensusEngine`, `ExecutionEngine` as live authorities: exist only as the dormant pre-A5 fabric (#11) and as A5-doc names; no live role.
- `orca_dispatch`, `orca_list_runs` as PING-backend commands/endpoints: **not found** (`orca_list_runs` exists only in the Go project's README claims).
- `startAutonomousLoop` as a real execution path: **deprecated in place** (`_SYNTHETIC_HISTORICAL_DEPRECATED`); the route reports honest non-execution.
- Any cron, systemd unit, or service running the ORCA loop: **none found**. No continuous operation exists.

## Classification summary

- **KEEP**: branch `feature/orca-autonomy` + worktree, canonical adapter (wire it as the WorkOrder boundary), control loop + objective-runtime + hermes_dispatch + run-loop.sh + policy modules, measurements, evidence dirs, A5/A6 docs and independent audit verdicts, Pig transfer helpers.
- **WIRE**: the canonical `external_agent_adapter.js` is the PING-owned execution seam; ORCA FINISH should bottom ORCA out through it rather than building anything new.
- **MERGE**: none pending from this lane's findings (the two convergence commits are already on the branch; Jev/Orca `emit()` adjacency is a sequencing note for the parent).
- **DELETE**: only as a future Nolan-approved step — the pre-A5 `execution/` fabric (#11) and the deprecated synthetic function (#10). Not acted on here.
- **ARCHIVE**: commit 992e12725 as history, A6 FAIL evidence (kept as proof), local staging copies (#16) and the 2026-09-13 audit (#17) after the wave-1 merge decision.

## Evidence chain (how this inventory was built)

- Pig `/home/nolan/ping` @ `refactor/runtime-authority-convergence` / `cc6856c3bc78e0535e66f168c66dc31abee2c073`: `git status` (17 dirty, none orca), `find -iname '*orca*'` (no orca sources in working tree; only stale `.git/refs+logs+worktrees` admin entries and grpc-js node_modules), `git ls-tree -r HEAD | grep -c '^orca/'` = 0, `git ls-tree -r ae55b77ff | grep -c '^orca/'` = 115.
- Git forensics: `.git/refs/heads/feature/orca-autonomy` → `ae55b77ff...`; `git cat-file -t 992e12725` = commit; `git log --all -i --grep=orca` (6 real ORCA commits); reflog/stash reviewed (no orca entries of note); `git grep -il orca HEAD` → no orca/ source dir, only prose/comment mentions in docs (`AGENTS.md`, `docs/*`), stale comments (`gateway/routes/missions.js:32` "for Orca scheduler"), and symbol-name mentions (`priority_boundary.js`, `mission_runtime.js`, `worker_runtime.js`); `git log --all --diff-filter=D -- '*orca*'` → zero deleted orca files.
- `git show --stat 992e12725` + commit message (90 files, honest-route diff); `git cat-file -p` full read of `orca/control-loop/orca_control_loop.js` (1192 lines), `delegate()` and `main()` traced line-by-line; profile-key/status extraction from the canonical adapter via node.
- `~/workspace/orca-omniroute-audit-2026-09-13.md` (pre-A5 facade audit), `orca-a5-audit-verdict-2026-09-18.md` (independent "SUBSTANTIALLY PROVEN"), `orca-a6-readiness-2026-09-23.md` (re-proof pending), `orca-cli-proofs/`; all local sandbox orca dirs listed and classified.
