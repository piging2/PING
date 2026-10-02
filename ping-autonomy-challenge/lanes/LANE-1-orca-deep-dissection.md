# LANE 1 , ORCA DEEP DISSECTION (internal ORCA AUTONOMY program)

**Lane:** 1 (Wave 1, PING Autonomy Grand Challenge)
**Date:** 2026-09-23
**Mode:** research / falsification / harvest only. No new construction proposed.

## 0. Scope clarification (read first)

There are **two different Orcas**, and this lane's task materials name the internal one:

1. **Internal "ORCA AUTONOMY" program** (this lane's subject): a control loop + durable objective substrate + fail-closed WorkOrder adapter + dispatcher-family profiles built *above* the live PING spine, developed 2026-09-16..18 in `/home/nolan/worktrees/orca-autonomy` (Pig; branch `feature/orca-autonomy`) with staging copies in `~/workspace/orca-{dispatch-test,remediation,workstream-d,autonomy-work}/`. This lane dissects it mechanism by mechanism below.
2. **orca-cli/orca** (external, github.com/orca-cli/orca @ `5beeefc`, 2026-05-08): already dissected to completion by LANE C PHASE 3 on 2026-09-23 (`~/workspace/autonomous-missions/ORCA-ARCHAEOLOGY-2026-09-23.md`, mechanisms A1-A15, harvest list, persistent watch design; snapshot in `~/workspace/crx-autonomous-missions/mechanisms.jsonl.orca-snapshot`). I cite it, not redo it. Where the two overlap (worker death, dependency edges, run identity), I cross-reference lane C's verdicts.

The internal program's earlier history (A0 facade -> A5 coordinator claim) is in memory (`memory/2026-09-18.md` L257, L320, L351, L602; `memory/2026-09-13.md` L213). Memory is treated as context, not evidence; mechanisms below are verified against the workspace source files themselves.

---

## 1. Inventory of sources examined

All paths below are `~/workspace/`. Files are **unstaged staging copies** (workspace git shows them as `??`, never committed; the committed canonical state lives on the Pig worktree per memory commit `6a342dd27`, which I could not verify from this sandbox).

| Source | Size / date | What it is |
|---|---|---|
| `orca-dispatch-test/CONTROL-LOOP-DESIGN.md` | 7.3 KB, 2026-09-18 12:00 | Stage map, bounds, witnessed run `orca-run-mu6wmbzn`, known flaw (t2 false negative), remaining gaps G1-G6 |
| `orca-dispatch-test/SPINE-TRACE.md` | 8.8 KB, 2026-09-18 12:00 | Exact event->mission->scheduler->worker call path (Path A live spine, Path B ORCA delegation), seams, identity proof |
| `orca-dispatch-test/orca_control_loop.js` (v1) | 20.1 KB / 437 lines, 2026-09-18 11:56, sha `bc61bcc5…` | First control loop: run-scoped identities, spawnSync dispatch, no durability, no reconciliation. Superseded by the remediation version. |
| `orca-dispatch-test/hermes_dispatch.py` (v1) | 990 B, 2026-09-18 11:55 | Thin dispatcher: subprocess `hermes_cli/main.py -z <prompt-file>`; prints stdout. No rendezvous. |
| `orca-dispatch-test/run-loop.sh` | 532 B, 2026-09-18 11:56 | Launcher: resolves PG creds from the live gateway container env at the process boundary |
| `orca-dispatch-test/orca-audit2.js`, `orca-audit3.js` | 1.3 / 1.1 KB, 2026-09-18 12:00 | Post-run audit probes: mission chain completeness, WORKER_FAILED/WORKER_COMPLETED counts, mission row counts |
| `orca-remediation/objective-runtime.js` | 18.6 KB / 508 lines, 2026-09-18 16:19, sha `c9247b5d…` | PING-side durable substrate: identity derivation, atomic writes, advisory-lock coordinator claim, budget, cancellation |
| `orca-remediation/orca_control_loop.js` (v2) | 60.6 KB / 1192 lines, 2026-09-18 16:19, sha `4abc75ee…` | Remediated loop: durable identity, crash-safe rendezvous, startup reconciliation, policy gates, ledger transitions, escalation contract |
| `orca-remediation/hermes_dispatch.py` (v2) | 4.2 KB, 2026-09-18 16:07 | Dispatcher with atomic rendezvous write (tempfile + os.replace), argv-passed prompt + result + metadata paths |
| `orca-remediation/delegate.new.js` | 15.1 KB, 2026-09-18 16:08 | Staging draft of the remediated `delegate()`, superseded by the version inlined in `orca_control_loop.js` v2 |
| `orca-remediation/main.new.js` | 8.7 KB, 2026-09-18 16:08 | Staging draft of the remediated `main()` , **references `objRuntime.claimCoordinatorLock`, which does not exist** in the shipped `objective-runtime.js`; stale, superseded |
| `orca-remediation/lock-test.js` | 5.1 KB, 2026-09-18 16:21 | Adversarial test of the advisory-lock claim incl. real SIGKILL-of-holder; runs against the Pig worktree paths, not here |
| `orca-remediation/ledger-selftest.js` | 2.2 KB, 2026-09-18 16:15 | Replays all ledger transition sequences the loop uses against the real `OrcaStatusLedger` (Pig paths); asserts illegal edges throw |
| `orca-remediation/adapter-compat-test.js` | 1.5 KB, 2026-09-18 16:18 | Verifies `stableWorkOrderId` override behavior + backward compat with the legacy minter (Pig worktree adapter) |
| `orca-remediation/patch_adapter.py` | 2.4 KB, 2026-09-18 16:07 | Surgical idempotent patch adding `stableWorkOrderId` to the Pig worktree adapter |
| `orca-remediation/ship.sh` | 660 B, 2026-09-18 16:04 | (Superseded) chunked base64 ship to the Pig; AGENTS.md later recorded scp as the fast path |
| `orca-workstream-d/AGENT_PROFILES.md` | 9.3 KB, 2026-09-18 11:54, sha `8f300dab…` | Four dispatcher-family profiles + grant path + PENDING_AUTH semantics |
| `orca-workstream-d/external_agent_adapter.js` | 19.4 KB / 405 lines, 2026-09-18 11:54, sha `755a6e7ce…` | The canonical adapter: `authorizeWorkOrder`, `issueWorkOrder`, `verifyResultEnvelope`, `recordVerifiedResult`. **Workspace copy is the PRE-patch version** (no `stableWorkOrderId`; `patch_adapter.py` targets the Pig worktree copy only) |
| `orca-workstream-d/validate_dispatcher_profiles.js` | 5.3 KB, 2026-09-18 11:54 | 26 assertions over the registry mechanism (families, determinism, fail-closed paths, envelope round trip, runtime reentry) |
| `orca-workstream-d/transfer.sh`, `fix_backslash.py`, `fix_boundary.py` | small, 2026-09-18 | Pig transfer + two one-off repair scripts (not mechanisms) |
| `orca-autonomy-work/pig-get.sh`, `pig-node.sh`, `pig-put.sh` | 304/605/819 B, 2026-09-18 12:04 | Pig transfer/run utilities (infra tooling, not autonomy mechanisms) |
| `orca-omniroute-audit-2026-09-13.md` | 2026-09-13 | Read-only audit of the live gateway: ORCA ExecutionEngine internals (live-but-orphaned, executor:null), live spine, registries, consumers, verdicts |
| `multi-runtime-workorder-contract.md` | 2026-09-18 11:41 | Authoritative contract v1.0.0-draft: adapter functions, 14-field envelope, family contracts, timeout/failure semantics, forbidden list, provenance |
| Memory (`memory/2026-09-18.md`, `2026-09-13.md`, `2026-09-19.md`, `2026-09-23.md`) | via memory_search | Program history, witnessed runs, falsifications, Nolan's standing calls; used as context, never as mechanism evidence |

**Not present in workspace (critical gaps in what I could verify):** `orca/control-loop/policy/orca_policy.js` (`classifyDelegation`, `classifyRetry`, `classifyFollowUp`, `classifyResultAcceptance`, `prohibitedAction`, `PROHIBITED_ACTIONS`, `DECISION_CLASSES`, `escalateUndecidable`), `orca/control-loop/policy/orca_status_model.js` (`OrcaStatusLedger`), `orca/control-loop/vendor/` (v1's vendored adapter), `orca/ORCA-ROLE.md`, `WORKORDER_SCHEMA.json` / `RESULT_SCHEMA.json`, and the whole `/home/nolan/worktrees/orca-autonomy` tree. Anything below that depends on these is marked accordingly.

**Falsification note on the two versions:** v1 (`orca-dispatch-test/orca_control_loop.js`) derives ALL identities from `RUN_ID` (`taskId = RUN_ID-taskKey`, `correlationId: RUN_ID`, `contextPackId: orca-context-RUN_ID`), uses blocking `spawnSync`, keeps the budget as a process-local counter, and has no reconciliation. The remediation (v2) was built specifically because v1 lost a dispatch on kill (memory: `orca-run-mu725l0c` attempt 2 orphaned mid-spawnSync). v1 is the failure that produced the mechanisms in v2. Nothing in v1 should be harvested except as a negative example.

---

## 2. Mechanisms (canonical format)

Conventions: `PINNED_SHA` uses the workspace file sha (these files are uncommitted staging copies; no git history exists for them). MATURITY scale: `proven-in-production` = witnessed on the live spine with evidence; `tested` = exercised by a test driver (even if only on the Pig); `aspirational` = written but unexecuted; `broken` = falsified by evidence. `PING_EXISTING_ANALOG` is best-effort (lane 19 adjudicates).

---

### M-1. Durable objective identity (logical intent only)

- **MECHANISM_ID:** M-1
- **PROBLEM:** A coordinator restart must rediscover the same objective instead of creating a duplicate objective, duplicate budget, and duplicate work.
- **SOURCE:** `orca-remediation/objective-runtime.js`
- **PINNED_SHA:** workspace file sha `c9247b5d37a0969c`, 2026-09-18 16:19
- **SOURCE_LOCATION:** `deriveObjectiveId` (lines ~57-68)
- **MATURITY:** tested (lock-test / self-tests exercise the module; memory claims 39 assert drivers + gates behind commit `6a342dd27`, coordinator-claimed)
- **INVARIANT:** `objective_id = sha256('objective:' + stableStringify({namespace, objective_text, constraints}))`; no PID, wall clock, run ID, attempt number, or worker identity may enter the identity.
- **IMPLEMENTATION:** canonical JSON with sorted keys (`stableStringify`), hashed with a domain prefix. `registerObjective` is re-entrant: same logical intent on restart returns the existing `objective.json` (touching only `reconciled_at`), never mints a new record. Durable state lives under `PING_DATA_ROOT/objectives/<objective_id>/`.
- **FAILURE_MODE:** text-level identity is brittle to paraphrase: two semantically identical objectives with different wording mint different IDs (no semantic dedup). Constraints are part of the hash, so tightening a budget silently forks the objective.
- **PING_EXISTING_ANALOG:** `UnifiedEventRuntime.computeEventId` content-based identity (SPINE-TRACE section 5); `MissionRuntime.create` `mission_id = sha256(missionType:event_id)[0:16]` + `ON CONFLICT DO NOTHING`.
- **GAP:** none in the mechanism; the gap is that PING's mission layer has no objective-level (multi-mission intent) identity at all.
- **HARVEST_CLASS:** DIRECT_REUSE
- **FALSIFICATION:** show two restarts of the same objective text producing different `objective_id`s, or a restart producing a duplicate `objective.json`.
- **DEPENDENCIES:** `stableStringify`; a writable `PING_DATA_ROOT`.

---

### M-2. Stable work-order identity per (objective_id, task_key) + override minter

- **MECHANISM_ID:** M-2
- **PROBLEM:** Retries and restarts must re-issue the *same* work order, not mint run-scoped duplicates that double-consume budget and confuse reconciliation.
- **SOURCE:** `orca-remediation/objective-runtime.js` + `orca-remediation/patch_adapter.py`
- **PINNED_SHA:** `c9247b5d37a0969c` / patch script 2026-09-18 16:07
- **SOURCE_LOCATION:** `deriveWorkOrderId` (objective-runtime.js); `stableWorkOrderId` (injected into the Pig worktree adapter by `patch_adapter.py`; **absent from the workspace adapter copy**)
- **MATURITY:** tested (`adapter-compat-test.js`: deterministic, override honored, invalid rejected, null/undefined fall back to legacy minter)
- **INVARIANT:** `work_order_id = sha256('work-order:' + objectiveId + ':' + taskKey)`; a restart rediscovers the same work order. An explicit override must be validated lowercase hex (32-128 chars), never minted.
- **IMPLEMENTATION:** `patch_adapter.py` rewrites `issueWorkOrder`'s mint line from `workOrderId(taskId)` to `stableWorkOrderId(workOrderId, taskId)`, where the explicit value (derived by the loop from (objective_id, task_key)) wins and the historical `sha256('workorder:'+taskId)[0:16]` minter is preserved as fallback. `authorizeWorkOrder` (the durable one in objective-runtime.js) returns the existing record on re-entry.
- **FAILURE_MODE:** two minters coexist during the compat window (legacy taskId-derived vs (objective_id,task_key)-derived); a caller mixing them gets two IDs for one task. The validation regex rejects uppercase hex, which is fail-closed but could surprise a caller.
- **PING_EXISTING_ANALOG:** `MissionRuntime.create` idempotent `mission_id` + `ON CONFLICT DO NOTHING`; adapter `workOrderId` legacy minter.
- **GAP:** the dual-minter window is a known transitional hazard, not yet collapsed.
- **HARVEST_CLASS:** DIRECT_REUSE (with the eventual retirement of the legacy minter, see delete list D-4)
- **FALSIFICATION:** show a restart re-issuing a different `work_order_id` for the same (objective_id, task_key), or an override that bypasses validation.
- **DEPENDENCIES:** M-1; the adapter patch applied exactly once (idempotent script).

---

### M-3. Attempt identity + record-before-dispatch

- **MECHANISM_ID:** M-3
- **PROBLEM:** The crash window between "dispatcher spawned" and "attempt recorded" makes a killed coordinator unable to tell a lost attempt from an in-flight one, so restarts either duplicate work or abandon it.
- **SOURCE:** `orca-remediation/orca_control_loop.js` (v2)
- **PINNED_SHA:** workspace file sha `4abc75ee506c1ead`, 2026-09-18 16:19
- **SOURCE_LOCATION:** `dispatchHermes` (async spawn, PID persisted immediately after spawn); `delegate()` attempt loop ("Attempt recorded BEFORE dispatch: the crash window between 'dispatched' and 'recorded' is closed by construction")
- **MATURITY:** tested (design exercised by the 39-driver suite per memory; the v1 failure it fixes is documented: `orca-run-mu725l0c` attempt 2 orphaned mid-spawnSync, memory `memory/2026-09-18.md#L478`)
- **INVARIANT:** `attempt_id = workOrderId + '-attempt-' + N`; the work-order record is updated to `RUNNING` with `attempt_count`, `last_attempt_id`, and `dispatch_pid` **before** the dispatcher can return; PID is written durably the moment the child exists.
- **IMPLEMENTATION:** v2 replaced v1's blocking `spawnSync` with async `spawn`, capturing `child.pid` and persisting it via `updateWorkOrder` immediately. `recordAttemptOutcome` appends to the work order's `attempt_history` (DISPATCHING -> outcome). Reconciliation reads `last_attempt_id` + `dispatch_pid` to classify the attempt (see M-7).
- **FAILURE_MODE:** PID reuse across the WSL/Windows boundary could theoretically make a dead PID look alive; the mechanism mitigates with a bounded 30s wait plus refusal to redispatch while the PID reads alive, but `pidAlive` on WSL PIDs for Windows-spawned dispatchers is the weakest link (the dispatcher is a Windows process; the coordinator probes from WSL).
- **PING_EXISTING_ANALOG:** `MissionRuntime.assign` conditional `UPDATE ... WHERE status='created'` with 60s lease (atomic claim); lane C A1 attempt-row shape (unbuilt).
- **GAP:** attempt-level durable identity exists in the ORCA substrate but not in PING's mission layer (crx-audit gap #3, confirmed by lane C).
- **HARVEST_CLASS:** ADAPT (the record-before-dispatch ordering is the portable part; PID-probing is the weak part, see M-4)
- **FALSIFICATION:** show a kill between spawn and the `updateWorkOrder` call producing an attempt the reconciler cannot classify, or show PID reuse causing a false "alive" classification.
- **DEPENDENCIES:** M-2; atomic `updateWorkOrder` (M-5).

---

### M-4. PG advisory-lock single-coordinator claim (SIGKILL-safe)

- **MECHANISM_ID:** M-4
- **PROBLEM:** Two concurrent coordinators for the same objective double-dispatch work; file/PID locks leave stale holders after SIGKILL and cannot span the WSL/Windows PID namespaces.
- **SOURCE:** `orca-remediation/objective-runtime.js`
- **PINNED_SHA:** `c9247b5d37a0969c`
- **SOURCE_LOCATION:** `coordinatorLockKey`, `acquireCoordinatorLock`, `releaseCoordinatorLock`
- **MATURITY:** tested (`lock-test.js`: determinism, mutual exclusion across two sessions, **real SIGKILL of the holder then clean re-acquire**, diagnostic-file lifecycle). Note: the test ran on the Pig; the workspace copy is untested here.
- **INVARIANT:** exactly one live coordinator owns execution per objective; the claim is a PostgreSQL **session-level** advisory lock on a **dedicated client** (never a pool); crash safety comes from the database releasing the lock when the holder's session drops, never from PID probing.
- **IMPLEMENTATION:** key = `sha256('orca-coordinator-v1:' + objectiveId)` -> two int32s (`pg_try_advisory_lock`). Acquire is atomic (no read-then-write race). A diagnostic `coordinator-claim.json` is written but explicitly marked non-authoritative ("DIAGNOSTIC ONLY: authority is the PostgreSQL advisory lock, not this file"). The code comments name the unsoundness it replaces: `gateway/advisory_lock.js`'s `AdvisoryLock` acquires/releases across pooled connections.
- **FAILURE_MODE:** if the DB itself is the thing that died, no coordinator can claim (fail-closed, correct). A network partition that drops the session releases the lock while the old coordinator still believes it holds it; the loop has no fencing token, so a partitioned-then-reconnected coordinator could dispatch after a successor took over. (Unaddressed in the sources.)
- **PING_EXISTING_ANALOG:** `MissionRuntime.assign` 60s lease + `reapExpiredLeases` (per-mission, not per-coordinator). No per-coordinator mutual exclusion exists in PING.
- **GAP:** the file-lock predecessor (`claimCoordinatorLock`, referenced by the stale `main.new.js` draft) was replaced; the unsound pooled `AdvisoryLock` in the gateway still exists per the code comment.
- **HARVEST_CLASS:** DIRECT_REUSE
- **FALSIFICATION:** show two coordinators both acquiring for the same objective, or a SIGKILLed holder's lock surviving (the lock-test asserts the opposite; re-run it).
- **DEPENDENCIES:** PostgreSQL reachable at claim time; a dedicated `pg.Client` held for the run lifetime (SIGINT/SIGTERM handlers release it).

---

### M-5. Atomic durable writes under PING_DATA_ROOT

- **MECHANISM_ID:** M-5
- **PROBLEM:** A crash mid-write leaves torn JSON that a restart then parses as state, corrupting reconciliation.
- **SOURCE:** `orca-remediation/objective-runtime.js`
- **PINNED_SHA:** `c9247b5d37a0969c`
- **SOURCE_LOCATION:** `atomicWrite`; layout helpers `objectiveDir`, `workOrderPath`, `rendezvousResultPath`
- **MATURITY:** tested (implicitly by the whole suite; no dedicated torn-write test in the workspace copies)
- **INVARIANT:** every durable write is temp-file + rename in the same directory; a crash can only ever leave the previous complete record or nothing, never a torn file. All ORCA durable state lives under `PING_DATA_ROOT/objectives/<objective_id>/` (`objective.json`, `budget_reservations.json`, `work_orders/<wo>.json`, `results/<wo>.result.json`), not in a second canonical store.
- **IMPLEMENTATION:** `fs.writeFileSync(tmp)` with a pid+timestamp-suffixed temp name, `fs.renameSync(tmp, filePath)`, unlink-on-failure. `readJson` returns null on ENOENT and throws on corrupt JSON (fail-loud, never treated as absent).
- **FAILURE_MODE:** rename is atomic only within one filesystem; if `PING_DATA_ROOT` spans mounts, the guarantee degrades (the dispatcher collector has a copy+unlink fallback for exactly this, which is non-atomic).
- **PING_EXISTING_ANALOG:** `UnifiedEventRuntime.emit` `INSERT ... ON CONFLICT DO NOTHING` (idempotent event persistence); PG transactional writes in `MissionRuntime`.
- **GAP:** none; but note this is filesystem durability, weaker than PG transactions. The work-order state and the canonical events can diverge (see open question Q-4).
- **HARVEST_CLASS:** DIRECT_REUSE
- **FALSIFICATION:** kill -9 during a write and show a torn JSON file being parsed as state.
- **DEPENDENCIES:** POSIX rename semantics on the data dir filesystem.

---

### M-6. Crash-safe dispatch rendezvous (dispatcher-side atomic result file)

- **MECHANISM_ID:** M-6
- **PROBLEM:** When the coordinator dies mid-dispatch, the worker's output dies with the coordinator's stdout pipe: the attempt's result is unrecoverable and the work order can never be settled honestly.
- **SOURCE:** `orca-remediation/hermes_dispatch.py` (v2)
- **PINNED_SHA:** 2026-09-18 16:07
- **SOURCE_LOCATION:** whole file; rendezvous write block ("Atomic rendezvous write: temp file in the same directory, then os.replace")
- **MATURITY:** tested (part of the remediation suite; the mechanism directly answers the witnessed v1 failure `orca-run-mu725l0c` where attempt 2 was "orphaned mid-spawnSync, no dispatch-t1-a2.json, result unrecoverable")
- **INVARIANT:** the dispatcher (an independent process) atomically writes a rendezvous record (`orca-rendezvous/1` schema: attempt/work_order/objective ids, started/finished timestamps, timed_out, returncode, full stdout/stderr) to a path passed via argv, independent of the coordinator's lifetime; at-least-once physical transport, idempotent logical work; exactly-once execution is explicitly NOT claimed.
- **IMPLEMENTATION:** `tempfile.mkstemp` in the target directory + `os.replace`; on rendezvous-write failure the dispatcher still prints the envelope to stdout (live path unaffected) and the attempt record stays honest about the miss. The coordinator collects the drop file into the durable results dir (`collectRendezvousDrop`, atomic rename on `/mnt/c`). Prompt path also comes via argv (v1's shared `hermes-prompt.txt` clobbering between concurrent dispatchers was fixed in v1 already and retained).
- **FAILURE_MODE:** memory's concurrency note (`memory/2026-09-18.md#L509`): the shared dispatcher *script* path `C:\Windows\Temp\orca-hermes-dispatch.py` is copied+unlinked per dispatch and races between concurrent dispatches; the "concurrent dispatchers never clobber" claim covers only the prompt file. Two objectives dispatching simultaneously can clobber the script copy.
- **PING_EXISTING_ANALOG:** none at the dispatcher level; PING's `recordVerifiedResult` persistence of the captured envelope to `result_path` is the PING-owned half.
- **GAP:** the rendezvous drop filename must match exactly between the Windows path given to the dispatcher and the WSL path the coordinator polls (`rendezvousDropPath` vs `rendezvousDropWinPath` carry an explicit comment about this); a mismatch makes collection silently impossible.
- **HARVEST_CLASS:** DIRECT_REUSE
- **FALSIFICATION:** kill the coordinator mid-dispatch and show the rendezvous file absent or torn, or show two concurrent dispatches clobbering each other's result files.
- **DEPENDENCIES:** M-5; shared `C:\Windows\Temp` visible to both the Windows dispatcher and WSL coordinator.

---

### M-7. Startup reconciliation (rediscover, never regenerate)

- **MECHANISM_ID:** M-7
- **PROBLEM:** After a coordinator crash, naive restart either redispatches in-flight work (duplicate execution) or abandons it (lost work); terminal work must never be regenerated.
- **SOURCE:** `orca-remediation/orca_control_loop.js` (v2)
- **PINNED_SHA:** `4abc75ee506c1ead`
- **SOURCE_LOCATION:** `reconcileStartup`, `reconcileRunningWorkOrder`, `acceptRendezvousResult`, and the `delegate()` re-entry guards
- **MATURITY:** tested (suite per memory; the reconciliation paths are the most heavily branched code in v2). Live restart proof (A6) was still unwitnessed at the time of these sources (CONTROL-LOOP-DESIGN G4).
- **INVARIANT:** reconciliation runs before any new dispatch and classifies every durable work order: terminal -> never touched; AUTHORIZED -> dispatch normally; RUNNING -> (a) rendezvous result present -> verify+accept the existing result, (b) no result + dispatcher possibly alive -> bounded 30s wait, then leave RUNNING and **refuse** redispatch, (c) no result + dispatcher verifiably dead -> mark DISPATCH_LOST, re-authorize for a new attempt within budget. A COMPLETED work order is returned as a cached accepted result, never re-dispatched. Terminal non-completed work is refused reuse as success (escalates for human disposition).
- **IMPLEMENTATION:** `listWorkOrders` enumerates the durable dir; `recordAttemptOutcome` logs RENDEZVOUS_RECOVERED / DISPATCH_LOST into `attempt_history`; `acceptRendezvousResult` reuses the single accept path (extract -> gate -> verify -> record -> terminal state). `delegate()` re-entry: COMPLETED+cached returns the terminal envelope+event ids; RUNNING throws Escalation refusing parallel dispatch.
- **FAILURE_MODE:** case (b) depends on `pidAlive` across the WSL/Windows boundary (see M-3); a false "alive" leaves a work order stuck RUNNING until an operator intervenes (no timeout on the stuck-RUNNING state in the sources). A restart during the 30s reconcile wait is safe (idempotent) but untested in the sources.
- **PING_EXISTING_ANALOG:** `MissionRuntime.reapExpiredLeases` (orphan recovery -> `created`); `failWithRetry` retry_pending + `retry_at` backoff; ce002's `reconcileLostCompletions()` (per lane C, variant-only).
- **GAP:** no stuck-RUNNING watchdog; the reconciler cannot distinguish "dispatcher alive but hung" from "dispatcher making progress".
- **HARVEST_CLASS:** ADAPT (the classify-before-dispatch discipline is the portable part)
- **FALSIFICATION:** crash a coordinator mid-RUNNING and show the restart either double-dispatching the attempt or losing a rendezvous-present result.
- **DEPENDENCIES:** M-3, M-5, M-6; the single accept path (M-10/M-11).

---

### M-8. Fail-closed WorkOrder authorization gate (the one decision)

- **MECHANISM_ID:** M-8
- **PROBLEM:** Delegation to an exterior agent must be deniable on every axis (agent, capability, namespace, constraints) without the worker ever being able to self-authorize.
- **SOURCE:** `orca-workstream-d/external_agent_adapter.js`
- **PINNED_SHA:** workspace sha `755a6e7ce564707c`, 2026-09-18 11:54
- **SOURCE_LOCATION:** `authorizeWorkOrder`
- **MATURITY:** tested (`validate_dispatcher_profiles.js`, 26 assertions: grant paths for all LIVE families, unknown-agent denial, `identity_5` denial, PENDING_AUTH denial)
- **INVARIANT:** the module owns exactly one decision: "may PING issue work order W delegating capability C to external agent A under constraints K?" Every check fails closed with a reason; unknown agents, `blockedExternal` agents, unlisted capabilities, bad namespaces, non-tightening constraints, or missing `no_canonical_events`/`no_mission_state_writes` all deny.
- **IMPLEMENTATION:** ordered 7-step gate (registered profile -> not blockedExternal -> not PENDING_AUTH -> capability in allowlist -> namespace regex -> constraints object that only tightens the profile maximum -> hard-required `no_canonical_events=true` and `no_mission_state_writes=true`). Returns `{granted}` or `{granted:false, reason}`; `issueWorkOrder` throws `WORK_ORDER_DENIED` on denial. The header documents the non-duplication: it does not duplicate `CapabilityAuthority.authorize` (agent-initiated, against PING), `CanonicalizationService.authorizeNamespace`, or `WorkerRuntime.dispatch`.
- **FAILURE_MODE:** `codex`'s time-bounded block expired 2026-09-17 and quota state was uncertain (per 09-13 audit); the gate re-grants automatically after expiry with no re-verification of quota. Profile data is code, so a bad merge can silently widen `allowedCapabilities`.
- **PING_EXISTING_ANALOG:** `CapabilityAuthority.authorize` (the mirror decision: may agent A invoke capability C *against PING*); `WorkerRuntime.dispatch` eventTypes routing.
- **GAP:** none in the gate; the gap is operational (stale block metadata).
- **HARVEST_CLASS:** DIRECT_REUSE
- **FALSIFICATION:** find an input the gate grants that violates one of the seven checks, or show `issueWorkOrder` succeeding after `authorizeWorkOrder` denied.
- **DEPENDENCIES:** `AGENT_PROFILES` data (M-20); `NAMESPACE_RE` (M-21).

---

### M-9. Closed WorkOrder envelope (build, never send)

- **MECHANISM_ID:** M-9
- **PROBLEM:** Workers must receive exactly the authorized task with no room to smuggle fields (credentials, widened constraints, self-asserted principal) into the delegation.
- **SOURCE:** `orca-workstream-d/external_agent_adapter.js`; contract `multi-runtime-workorder-contract.md` sections 1-2
- **PINNED_SHA:** `755a6e7ce564707c`
- **SOURCE_LOCATION:** `issueWorkOrder`
- **MATURITY:** tested (validate_dispatcher_profiles round trip; contract v1.0.0-draft checked field-by-field against the reference implementation)
- **INVARIANT:** the envelope is closed (`additionalProperties: false` in WORKORDER_SCHEMA.json): exactly 14 fields (`work_order_id`, `agent_id`, `mission_id`, `task_id`, `correlation_id`, `context_pack_id`, `attempt`, `principal`, `namespace`, `capability`, `input`, `constraints`, `result_path`, `deadline`, + optional `causation_id`); `principal` is always the constant `ping:external-agent-adapter`; the function builds the envelope but never transmits it (transport is the dispatcher's job).
- **IMPLEMENTATION:** field-by-field validation (non-empty strings, input is an object, deadline parses as ISO date, attempt is a positive int); `result_path` is PING-owned (the worker never writes it; PING captures stdout and writes it).
- **FAILURE_MODE:** the envelope is only as closed as the schema file, which is not in the workspace copies; a drift between code and WORKORDER_SCHEMA.json would silently open or close fields.
- **PING_EXISTING_ANALOG:** canonical event envelopes via `UnifiedEventRuntime.emit` (typed, namespaced).
- **GAP:** none.
- **HARVEST_CLASS:** DIRECT_REUSE
- **FALSIFICATION:** construct an envelope with a 15th field that the adapter accepts, or show a worker-supplied `principal` surviving issuance.
- **DEPENDENCIES:** M-8; WORKORDER_SCHEMA.json.

---

### M-10. Result-envelope verification with echo binding (non-retryable validation)

- **MECHANISM_ID:** M-10
- **PROBLEM:** A worker's output must be bound to the exact authorization that produced it, or a stale/replayed/forged result can become canonical state.
- **SOURCE:** `orca-workstream-d/external_agent_adapter.js`
- **PINNED_SHA:** `755a6e7ce564707c`
- **SOURCE_LOCATION:** `verifyResultEnvelope`, `resultIdentity`
- **MATURITY:** tested (round-trip assertions; the v2 loop's timeout and protocol-failure paths exercise the invalid branches)
- **INVARIANT:** authorized agent == invoked agent == result agent; exact echo of `work_order_id`, `context_pack_id`, `capability`; `completed` requires non-null output + null error; `failed` requires null output + non-empty error; `evidence` is an object; `verifiedAt` is ISO and within `deadline`. **Validation failure is non-retryable and can never reach canonical event authority.**
- **IMPLEMENTATION:** 8-field result envelope checked field by field; `result_id = sha256('external-result:' + stableStringify(binding))` over the bound fields becomes the event `logical_id` (idempotent re-emission). The worker prompt (`buildWorkerPrompt`) instructs echo-only JSON to make the binding checkable.
- **FAILURE_MODE:** envelope extraction (`extractEnvelope`) does brace-matching on stdout; a worker printing a second JSON object (e.g. in a stack trace) could shift which object is extracted. The contract's timeout rule (dispatcher reports failed, never fabricates) is only as strong as the dispatcher's honesty.
- **PING_EXISTING_ANALOG:** `EvidenceAuthority.verify` (hash recompute, `source_event_id` trace-back) per lane C.
- **GAP:** no replay protection beyond `logical_id` dedup at emission (a replayed envelope re-emits as deduplicated, which is correct but silent).
- **HARVEST_CLASS:** DIRECT_REUSE
- **FALSIFICATION:** show a result with a mismatched `work_order_id` or `agent_id` passing verification, or a `verifiedAt > deadline` result being accepted.
- **DEPENDENCIES:** M-9; the worker prompt contract.

---

### M-11. Canonical recording through the injected runtime only (ORCA mints nothing)

- **MECHANISM_ID:** M-11
- **PROBLEM:** If the orchestrator can emit canonical events directly, there are two event authorities and identity can fork.
- **SOURCE:** `orca-workstream-d/external_agent_adapter.js`; `orca-dispatch-test/SPINE-TRACE.md` section 2
- **PINNED_SHA:** `755a6e7ce564707c`
- **SOURCE_LOCATION:** `recordVerifiedResult`
- **MATURITY:** proven-in-production (witnessed run `orca-run-mu6wmbzn`: 2 real `WORKER_COMPLETED` events with recomputed identity exact-match, SPINE-TRACE section 5; memory also records a `WORKER_FAILED` on Hermes timeout with PG read-back)
- **INVARIANT:** the exterior process never receives the event runtime or event credentials; only PING's `recordVerifiedResult`, called with PING's `UnifiedEventRuntime`, emits `WORKER_COMPLETED`/`WORKER_FAILED`; event identity stays with `computeEventId` (the adapter's former `canonicalEventId` mirror was deliberately removed 2026-09-17).
- **IMPLEMENTATION:** after `verifyResultEnvelope` passes, emit with `logical_id = result_id`, `correlation_id` / `causation_id` threaded from the work order; rejected emission returns invalid (no phantom completion). ORCA-side, the v2 loop "emits no canonical events itself" (CONTROL-LOOP-DESIGN section 2).
- **FAILURE_MODE:** if `eventRuntime.emit` throws after the worker already acted externally, the envelope is verified but the canonical event is missing; the retry path re-dispatches, which can duplicate external effects (the unknown-external-effect gap, lane C primitive #7).
- **PING_EXISTING_ANALOG:** this *is* the PING spine mechanism (`UnifiedEventRuntime.emit` single writer); the ORCA contribution is the discipline of routing exterior results through it without minting.
- **GAP:** none in the mechanism; the gap is the missing effect ledger for the failure mode above.
- **HARVEST_CLASS:** DIRECT_REUSE (as a standing rule: exterior results reenter only through the injected runtime)
- **FALSIFICATION:** show a canonical `WORKER_COMPLETED` whose `event_id` does not recompute from `computeEventId`, or show the loop emitting a canonical event by any other path.
- **DEPENDENCIES:** M-10; `UnifiedEventRuntime`.

---

### M-12. Deterministic worker selection (SHA-256 hash pick over sorted candidates)

- **MECHANISM_ID:** M-12
- **PROBLEM:** Worker selection must be reproducible and auditable, not dependent on iteration order or wall clock.
- **SOURCE:** `orca-omniroute-audit-2026-09-13.md` section 3a (source-read of the live gateway)
- **PINNED_SHA:** n/a (audit doc, 2026-09-13; gateway source `capability_registry.js:~150-190`, `scheduler.js:90-112`, `worker_port.js:~280`)
- **SOURCE_LOCATION:** `CapabilityRegistry.findWorkers` -> sort by (1) count of worker capabilities sharing the capability's first dot-segment, (2) avg quality, (3) current load; `selectWorker()` takes a deterministic SHA-256 hash pick; ORCA `Scheduler._selectWorker` sorts by recent-assignment count then load, same hash pick; `WorkerPortRegistry.findAvailable` sorts by load then latency
- **MATURITY:** aspirational (selection logic is real code but had exactly 1 registered worker and zero business traffic; the engine never calls `execute()` anyway, see M-26)
- **INVARIANT:** given the same registry state, the same capability always selects the same worker.
- **IMPLEMENTATION:** exact capability-index lookup, optional state/quality/load filters, deterministic ordering, SHA-256 over the sorted list to pick. (Documented from the audit; not re-verified against gateway source in this lane.)
- **FAILURE_MODE:** with one registered worker the determinism is vacuous; quality/load fields were `0`/idle, so the sort was untested under real variance.
- **PING_EXISTING_ANALOG:** `WorkerRuntime.dispatch` pure `eventTypes.includes(eventType)` string match (first-match-wins iteration order); `MissionScheduler._poll` -> `getPending` priority-ordered claim.
- **GAP:** PING's live dispatch is deterministic by registration order, not by a scored selection; there is no load/quality-aware selection on the live path.
- **HARVEST_CLASS:** PATTERN_ONLY (the hash-pick-over-sorted-candidates pattern; the ORCA engine around it is rejected, M-26)
- **FALSIFICATION:** show two identical registry states selecting different workers, or show the sort being order-dependent.
- **DEPENDENCIES:** a populated capability registry (which ORCA never had).

---

### M-13. Live-spine worker routing + conditional-SQL lifecycle (the machinery ORCA observes)

- **MECHANISM_ID:** M-13
- **PROBLEM:** Missions must move through a lifecycle no concurrent scheduler can corrupt, and workers must be selected by a single canonical decider.
- **SOURCE:** `orca-dispatch-test/SPINE-TRACE.md` section 1
- **PINNED_SHA:** n/a (trace doc, 2026-09-18; verified live against the running gateway that day)
- **SOURCE_LOCATION:** `mission_runtime.js` (`assign`/`start`/`complete`/`fail`/`failWithRetry`/`renewLease`/`reapExpiredLeases`), `mission_scheduler.js:122` (`_poll`), `worker_runtime.js:105` (`dispatch`), `event_to_mission_bridge.js`
- **MATURITY:** proven-in-production (191 completed missions; 21 full lifecycles + a complete OBSERVATION->LINEAGE chain observed live 2026-09-18)
- **INVARIANT:** lifecycle transitions are conditional single-row SQL (`assign`: `WHERE status='created'` with a 60s lease, so concurrent claims cannot steal); `WorkerRuntime.dispatch()` is the single canonical execution decider (pure `eventTypes` string match; empty eventTypes = dormant, never matches); dispatching builds the worker event on the **original** `payload.event_type`, never on `mission_type` (phantom-complete prevention).
- **IMPLEMENTATION:** bridge subscribes to 33 event types, creates missions with `mission_id = sha256(missionType:event_id)[0:16]` + `ON CONFLICT DO NOTHING`; scheduler polls every 5s (renew leases, reap expired, `getPending` ordered by priority DESC, created_at ASC); `failWithRetry` backs off to `retry_pending`, exhaustion routes to the dead-letter authority; worker-emitted downstream events re-enter the bridge, forming multi-hop chains.
- **FAILURE_MODE:** `MISSION_*` lifecycle events carry their own correlation_ids (the bridge emits them without one), so correlation-id traces miss them (this caused the t2 false negative; the v2 loop works around it by querying `payload->>'missionId'` alongside the trace).
- **PING_EXISTING_ANALOG:** this is PING's own spine; ORCA's role is observer/delegator, not owner.
- **GAP:** the dead-letter authority (P0-5) is named but its implementation was not in this lane's sources.
- **HARVEST_CLASS:** DIRECT_REUSE (as the substrate everything else stands on; not ORCA's to claim)
- **FALSIFICATION:** show a double-claimed mission (two workers assigned), or a mission completed without its worker event being emitted (phantom completion).
- **DEPENDENCIES:** PostgreSQL; the bridge's event-type map.

---

### M-14. Bounded autonomy envelope (durable budgets)

- **MECHANISM_ID:** M-14
- **PROBLEM:** An autonomous loop without hard bounds can run away (unbounded work orders, infinite retries); process-local counters reset on restart, silently renewing the budget.
- **SOURCE:** `orca-remediation/objective-runtime.js` + `orca-remediation/orca_control_loop.js` (v2)
- **PINNED_SHA:** `c9247b5d37a0969c` / `4abc75ee506c1ead`
- **SOURCE_LOCATION:** `reserveWorkOrderBudget` (idempotent per work order id; `budget_reservations.json`); `MAX_WORK_ORDERS=2`, `MAX_ATTEMPTS=2`, `DISPATCH_TIMEOUT_MS=180000`, `WORK_ORDER_TTL_MS=600000`; budget check in `delegate()` before authorization
- **MATURITY:** tested (the durable-budget path is part of the remediation suite; memory notes "finding 5" was the process-local counter)
- **INVARIANT:** the work-order budget is durable and idempotent: reserving the same work order id twice consumes once; a restart cannot double-consume or reset the budget; exhaustion refuses new work with `budget-exhausted`.
- **IMPLEMENTATION:** `budget_reservations.json` maps work_order_id -> reserved_at; `objective.json` carries `work_orders_used`/`max_work_orders`; every `delegate()` call re-reads durable usage before proceeding. Attempt budget enforced in the retry loop (`attempt > MAX_ATTEMPTS` -> terminal FAILED + Escalation).
- **FAILURE_MODE:** the budget counts work *orders*, not cost or wall-clock; two expensive work orders cost the same budget as two cheap ones. No storm detection across objectives (CONTROL-LOOP-DESIGN G5).
- **PING_EXISTING_ANALOG:** `MissionRuntime` retry `max_attempts` + backoff; scheduler 5-minute dispatch timeout (per 09-19 memory).
- **GAP:** cross-objective / cross-run rate limiting does not exist.
- **HARVEST_CLASS:** DIRECT_REUSE
- **FALSIFICATION:** restart a coordinator mid-objective and show `work_orders_used` resetting or a third work order being issued against a limit of 2.
- **DEPENDENCIES:** M-1, M-2, M-5.

---

### M-15. Durable cancellation (operator signal survives restart)

- **MECHANISM_ID:** M-15
- **PROBLEM:** An operator must be able to stop an objective's *future* work without killing in-flight workers and without the stop being forgotten on restart.
- **SOURCE:** `orca-remediation/objective-runtime.js` + `orca-remediation/orca_control_loop.js` (v2)
- **PINNED_SHA:** `c9247b5d37a0969c` / `4abc75ee506c1ead`
- **SOURCE_LOCATION:** `cancelRequestPath`, `recordCancellation`; v2 `main()` steps 2-3
- **MATURITY:** tested (suite); not witnessed against a live in-flight worker in this lane's sources
- **INVARIANT:** creating the `cancel.requested` marker file records a durable cancellation (`objective.json`: `state=CANCELLED`, `cancellation.in_flight_workers_may_continue=true`); cancellation blocks all new work, survives restarts, and is never equated with killing a worker.
- **IMPLEMENTATION:** startup checks the marker before claiming the coordinator lock; `delegate()` re-checks `objRec.cancellation` before every delegation (exit 4 / Escalation). A COMPLETED objective on restart issues no fresh work; a genuinely new budget epoch requires a new objective (new identity).
- **FAILURE_MODE:** in-flight workers are deliberately *not* stopped; a runaway worker keeps running until its own timeout. There is no forced-kill path in the mechanism (by design, but an operator may expect one).
- **PING_EXISTING_ANALOG:** none at the objective level; mission-level `fail`/dead-letter is the closest.
- **GAP:** no operator visibility into *which* in-flight workers were allowed to continue.
- **HARVEST_CLASS:** DIRECT_REUSE
- **FALSIFICATION:** show a cancelled objective issuing a new work order after restart, or a cancellation being lost on restart.
- **DEPENDENCIES:** M-1, M-5, M-4 (checked before lock claim).

---

### M-16. Timeout as honest failure (no fabricated success)

- **MECHANISM_ID:** M-16
- **PROBLEM:** A dispatcher timeout is the easiest place to fabricate a success ("assume it worked"), which then becomes canonical state built on nothing.
- **SOURCE:** `orca-dispatch-test/orca_control_loop.js` (v1) + `orca-remediation/orca_control_loop.js` (v2); contract section 5
- **PINNED_SHA:** `bc61bcc5…` / `4abc75ee506c1ead`
- **SOURCE_LOCATION:** `timeoutEnvelope` (both versions); v2 `dispatchHermes` coordinator-side 180s SIGKILL
- **MATURITY:** proven-in-production (memory: `orca-run-mu725l0c` t1 Hermes timeout -> `WORKER_FAILED 2a616cff…` committed with PG read-back, `memory/2026-09-18.md#L478`)
- **INVARIANT:** on timeout the dispatcher constructs a **failed** envelope (`status: failed`, `output: null`, non-empty error, evidence noting "dispatcher-side timeout report, not worker output"); a timeout is never reported as success, and the attempt record marks TIMED_OUT with the PID dead so reconciliation will not mistake it for in-flight work.
- **IMPLEMENTATION:** coordinator-side timer kills the dispatcher hard at 180s; the failed envelope flows through the normal verify->record path and becomes a canonical `WORKER_FAILED`, which then enters the retry policy (M-17/M-19).
- **FAILURE_MODE:** the 600s dispatcher-internal timeout (hermes_dispatch.py `subprocess.run(timeout=600)`) is longer than the coordinator's 180s kill; a hung worker is always killed by the coordinator first, so the dispatcher's own timeout path is nearly dead code.
- **PING_EXISTING_ANALOG:** scheduler `_dispatchWithTimeout` hung-worker watchdog (per lane C primitive #5, O5 repair).
- **GAP:** none.
- **HARVEST_CLASS:** DIRECT_REUSE
- **FALSIFICATION:** show a timed-out attempt recorded as `completed` or a `WORKER_COMPLETED` emitted for an attempt with no worker output.
- **DEPENDENCIES:** M-10, M-11.

---

### M-17. Follow-up only from verified evidence (dependency release)

- **MECHANISM_ID:** M-17
- **PROBLEM:** An autonomous loop that plans follow-up work from unverified worker output compounds hallucinations: each step builds on the last step's unconfirmed claims.
- **SOURCE:** `orca-remediation/orca_control_loop.js` (v2)
- **PINNED_SHA:** `4abc75ee506c1ead`
- **SOURCE_LOCATION:** `assessAndFollowUp`; `buildPlan` `followUpPolicy`
- **MATURITY:** proven-in-production (witnessed `orca-run-mu6wmbzn`: t2's input was built from the live `getTrace` at follow-up time, `causation_id` = t1's `WORKER_COMPLETED` event_id `bce4d7cb…`)
- **INVARIANT:** follow-ups are proposed only from VERIFIED evidence (`classifyFollowUp` requires `derivedFromVerified`); task-2's input is assembled from **live state at follow-up time**, never from the plan; the causal link is `causation_id` = the prior task's canonical event id.
- **IMPLEMENTATION:** `20-assess.json` records remaining work (non-terminal missions from t1's verified output + structural evidence-chain verification of the most recent completed mission); if follow-up is needed, the loop re-queries `MissionRuntime.getTrace` plus the `MISSION_*` lifecycle query (the G1 fix) and delegates t2 with `causationId = t1.record.event_id`. Both events share `correlation_id = orca-run-*`.
- **FAILURE_MODE:** the v1 run demonstrated the failure: `trimMission` dropped the `result` field and the correlation trace missed `MISSION_*` events, so t2 honestly reported a false-negative chain gap. The worker was honest relative to lossy input; the loop's input assembly was the defect (fixed in v2 with the `result_recorded` presence bit + dual query).
- **PING_EXISTING_ANALOG:** the bridge's event-chained multi-hop missions (downstream events re-enter the bridge); `causation_id` threading in `UnifiedEventRuntime`.
- **GAP:** no dependency-aware ready-set (multi-dependency gating) exists in the internal materials; orca-cli/orca's `run_dependencies` has no gating code (lane C A4). Next-task selection is a 2-task linear pipeline, not a DAG scheduler.
- **HARVEST_CLASS:** ADAPT (the verified-evidence-only + live-input-at-follow-up-time discipline)
- **FALSIFICATION:** show a t2 delegated with input copied from the plan rather than re-observed, or a follow-up issued after a FAILED (not VERIFIED) t1.
- **DEPENDENCIES:** M-10, M-11, M-13.

---

### M-18. Policy consult before gate + prohibition/result-acceptance enforcement

- **MECHANISM_ID:** M-18
- **PROBLEM:** Dead policy code (`prohibitedAction()`, `classifyResultAcceptance()`) that is never called at the real decision boundary gives the appearance of governance with none of the effect (findings 10/11 in the remediation).
- **SOURCE:** `orca-remediation/orca_control_loop.js` (v2) referencing `./policy/orca_policy.js`
- **PINNED_SHA:** `4abc75ee506c1ead` (loop side only)
- **SOURCE_LOCATION:** `enforceProhibitions` (called before authorization becomes externally effective; hit -> PROHIBITED + durable evidence + Escalation), `gateResultAcceptance` (called immediately before `recordVerifiedResult`; PROHIBITED verdict refuses acceptance), `classifyDelegation`/`classifyRetry`/`classifyFollowUp` consults with persisted decision records; `--probe-prohibited=` test hook
- **MATURITY:** **aspirational-from-here**: the entire `policy/` directory (`orca_policy.js`, `orca_status_model.js`) is **absent from the workspace copies**; the loop side is present but the decision functions it calls cannot be verified in this lane. `ledger-selftest.js` replays edge sequences against the real ledger on the Pig.
- **INVARIANT (claimed):** policy is consulted *before* the fail-closed gate; the adapter remains the final gate; a gate denial maps to REQUIRES_HUMAN_APPROVAL, never to a bypass. External execution success can never self-certify canonical success.
- **IMPLEMENTATION (claimed):** decision classes (`AUTO_EXECUTE`, `REQUIRES_HUMAN_APPROVAL`, `PROHIBITED`); every consult persists a `policy-<tag>.json` evidence artifact; prohibitions are matched against both the action and the brief text.
- **FAILURE_MODE:** unverifiable here. Risk: the policy could be more permissive than the adapter gate, creating a consult-then-ignore pattern; or the brief-text substring match could false-positive on innocent text.
- **PING_EXISTING_ANALOG:** `CapabilityAuthority` + approval machinery (`approvals`, `approval_policies` tables exist but are dormant on the live path, per 09-19 memory).
- **GAP:** the policy module itself is the gap in this lane's sources.
- **HARVEST_CLASS:** WATCH (adopt only after the module is produced and its tests pass)
- **FALSIFICATION:** produce `orca_policy.js` and show any claimed consult not happening at the stated boundary, or a PROHIBITED action being dispatched.
- **DEPENDENCIES:** the missing `policy/` module; M-8 (the adapter stays the final gate regardless).

---

### M-19. Typed status ledger with persisted evidence per transition

- **MECHANISM_ID:** M-19
- **PROBLEM:** Stage transitions recorded only in logs are unauditable; illegal transitions (e.g. VERIFIED on a failed envelope) are reachable by accident.
- **SOURCE:** `orca-remediation/orca_control_loop.js` (v2) + `orca-remediation/ledger-selftest.js`, referencing `./policy/orca_status_model.js`
- **PINNED_SHA:** `4abc75ee506c1ead`
- **SOURCE_LOCATION:** `transition(unit, to, evidence, detail)` calls throughout `delegate()`; legal edge sequences enumerated in `ledger-selftest.js`
- **MATURITY:** **aspirational-from-here** (same missing-module caveat as M-18): the ledger class is absent from workspace; the self-test replays 13 sequences (success, retry-success, failed-no-retry, transport-replan, protocol-failure, verification-failed, policy-deny, prohibition, reconcile-from-null variants, escalate-from-planned/running) and asserts illegal edges throw.
- **INVARIANT (claimed):** every unit moves through a typed transition graph; illegal edges throw; every transition names its backing evidence artifact. Sections 7/8/9 doctrine: a verified failed envelope takes FAILED, never VERIFIED; VERIFIED may only CLOSE.
- **IMPLEMENTATION (from the self-test):** edge sequences like `PLANNED -> AUTHORIZED -> QUEUED -> RUNNING -> EVIDENCE_PENDING -> FAILED -> PLANNED -> AUTHORIZED -> QUEUED -> …` (retry re-plans through the authorized path); `RUNNING -> EVIDENCE_PENDING` separates "result captured" from "result verified".
- **FAILURE_MODE:** the v2 `delegate()` in the workspace copy contains a subtle deviation from the `delegate.new.js` draft in terminal-work-order handling (v2 returns cached success only for COMPLETED; the draft treated any terminal+terminal-info as cached). Which is canonical is unresolvable without the Pig worktree.
- **PING_EXISTING_ANALOG:** lane C A2 (orca-cli/orca's pure transition table) with the same enforcement warning: Orca's table was not enforced at the store layer; the ledger here claims enforcement at the transition call site.
- **GAP:** store-layer enforcement (the lane C A2 finding) is not addressed in the visible code; enforcement is by convention at call sites.
- **HARVEST_CLASS:** WATCH (same as M-18; the pattern converges with lane C's A2 harvest)
- **FALSIFICATION:** produce the ledger module and show an illegal edge the loop uses not throwing, or a transition without a backing artifact.
- **DEPENDENCIES:** the missing `orca_status_model.js`; M-23.

---

### M-20. Agent profile data registry (LIVE / PENDING_AUTH / blockedExternal)

- **MECHANISM_ID:** M-20
- **PROBLEM:** Dispatcher families need to be registered before they can be granted, but registration must not equal authorization: a family awaiting a one-time login must be visible yet unusable.
- **SOURCE:** `orca-workstream-d/AGENT_PROFILES.md` + `orca-workstream-d/external_agent_adapter.js`
- **PINNED_SHA:** `8f300dab00fb3da7` / `755a6e7ce564707c`
- **SOURCE_LOCATION:** `AGENT_PROFILES` (hermes, codex, opencode, cloud-subagent, ollama, identity_1..4)
- **MATURITY:** tested (26 assertions; hermes/ollama/copilot exercised live 2026-09-16/17 per the doc)
- **INVARIANT:** profiles are data, not code; `status: PENDING_AUTH` registers a family but `authorizeWorkOrder` denies it (never grantable before the one-time login is verified); `blockedExternal` denies while active (opencode: permanent; codex: time-bounded); unknown agent ids fail closed.
- **IMPLEMENTATION:** each profile carries transport, invocation, allowedCapabilities, maxConstraints, status, family, notes; the copilot family holds exactly the four pre-authorized identities and `identity_5` is denied as unknown. Registration of a new family is a data entry, never new machinery ("If any is verified later, it is added as a data entry with status PENDING_AUTH until the one-time login is proven, then flipped to LIVE").
- **FAILURE_MODE:** time-bounded blocks re-grant automatically on expiry with no re-verification (codex, 09-13 audit). Quota gating for copilot is explicitly EXTERNAL to the envelope (dispatcher checks `remaining >= cost + reserve`, fail-closed on unknown/stale quota) , a dispatcher that skips the check is not caught by the adapter.
- **PING_EXISTING_ANALOG:** `CapabilityAuthority` agent profiles (`/app/gateway/capability_authority.js:185`, same shape by design).
- **GAP:** Goose, Gemini CLI, Qwen Code, Crush, Aider, Roo Code unregistered (owned by the CLI auth worker, explicitly out of scope).
- **HARVEST_CLASS:** DIRECT_REUSE
- **FALSIFICATION:** show a PENDING_AUTH profile being granted, or an unregistered agent id passing `authorizeWorkOrder`.
- **DEPENDENCIES:** M-8; the one-time login verification process (human/CLI-auth-worker side).

---

### M-21. Namespace regex with authority fallback

- **MECHANISM_ID:** M-21
- **PROBLEM:** The adapter needs a namespace validity rule, but inventing a third pattern when the canonicalization authority owns the first would fork the namespace definition.
- **SOURCE:** `orca-workstream-d/external_agent_adapter.js`
- **PINNED_SHA:** `755a6e7ce564707c`
- **SOURCE_LOCATION:** `NAMESPACE_RE` definition (top of file)
- **MATURITY:** tested (grant-path assertions use `core::owner` etc.)
- **INVARIANT:** prefer the canonicalization authority's export when present; otherwise fall back to the contract pattern `^(core|tenant)::[a-z0-9_.-]+$`; never invent a third pattern.
- **IMPLEMENTATION:** `require('../canonicalization/canonicalization_service.js')`, use `.NAMESPACE_RE` if exported else the literal regex. CONTROL-LOOP-DESIGN G3 notes the branch drift (this branch's service does not export it yet; the loop worked around it with a symlink to the proven copy).
- **FAILURE_MODE:** silent fallback: if the authority later exports a *different* pattern, behavior changes without any code change in the adapter. The drift (G3) is still unreconciled in these sources.
- **PING_EXISTING_ANALOG:** `CanonicalizationService.authorizeNamespace` (the authority itself).
- **GAP:** G3 branch divergence.
- **HARVEST_CLASS:** PATTERN_ONLY (the "prefer authority, fall back to contract, never invent" discipline)
- **FALSIFICATION:** show the adapter accepting a namespace the authority rejects, or vice versa.
- **DEPENDENCIES:** `canonicalization_service.js`.

---

### M-22. Prompt-via-argv concurrency discipline

- **MECHANISM_ID:** M-22
- **PROBLEM:** Concurrent dispatchers sharing one prompt file (`hermes-prompt.txt`) clobber each other's input.
- **SOURCE:** `orca-dispatch-test/hermes_dispatch.py` (v1, retained in v2)
- **PINNED_SHA:** 2026-09-18 11:55
- **SOURCE_LOCATION:** `prompt_file = sys.argv[1]`; per-attempt filenames `orca-<attemptId>-prompt.txt` in v2
- **MATURITY:** tested (in continuous use since v1)
- **INVARIANT:** the prompt path comes from argv, never a hardcoded shared file; each attempt gets its own prompt file, cleaned up after dispatch.
- **IMPLEMENTATION:** coordinator writes the prompt to `WIN_TMP/orca-<attemptId>-prompt.txt`, passes the Windows path to the dispatcher, unlinks after. The dispatcher script itself is copied per dispatch to `C:\Windows\Temp\orca-hermes-dispatch.py` (which is the residual race noted in M-6).
- **FAILURE_MODE:** the per-dispatch script copy/unlink still races (M-6); prompt files are unique per attempt so they are safe.
- **PING_EXISTING_ANALOG:** none (dispatcher-level hygiene).
- **HARVEST_CLASS:** PATTERN_ONLY (small, correct; fold into any dispatcher work)
- **FALSIFICATION:** run two concurrent dispatches and show crossed prompts.
- **DEPENDENCIES:** shared temp dir visible to both sides.

---

### M-23. Evidence-per-stage artifacts (numbered run dir)

- **MECHANISM_ID:** M-23
- **PROBLEM:** A control loop whose stage transitions live only in stdout cannot be audited, replayed, or reconciled after the fact.
- **SOURCE:** `orca-remediation/orca_control_loop.js` (v2); `orca-dispatch-test/CONTROL-LOOP-DESIGN.md` section 1
- **PINNED_SHA:** `4abc75ee506c1ead`
- **SOURCE_LOCATION:** `save(name, obj)` calls; `EVIDENCE_DIR = evidence/run-<RUN_TS>/`
- **MATURITY:** proven-in-production (the witnessed run's evidence dir is the audit basis for CONTROL-LOOP-DESIGN and the orca-audit2/3 probes)
- **INVARIANT:** every stage transition is backed by a persisted artifact or live runtime state: `00-objective.json`, `01-observe.json`, `02-plan.json`, `policy-<tag>.json`, `prohibition-<tag>.json`, `workorder-<tag>.json`, `dispatch-<tag>-a<n>.json`, `verify-<tag>-a<n>.json`, `result-<tag>.json`, `20-assess.json`, `99-close.json` / `99-escalate.json` / `99-fatal.json`.
- **IMPLEMENTATION:** plain JSON files, one per stage per attempt; the close/escalate artifacts carry work-order ids, event ids, and the assessment. Note these are *run-scoped* evidence; the durable cross-restart state is the objective dir (M-5), not the evidence dir.
- **FAILURE_MODE:** evidence dir is keyed by run timestamp, so a restart starts a new dir; correlating the pre-crash and post-crash evidence requires the shared `objective_id`/`correlation_id`. Nothing enforces that every `save()` actually happens before the corresponding transition (convention, not mechanism).
- **PING_EXISTING_ANALOG:** `ping_events` canonical journal (stronger); per-run `runs.jsonl` ledgers in the campaign.
- **GAP:** run evidence is not itself content-addressed or hash-chained.
- **HARVEST_CLASS:** PATTERN_ONLY (the numbered-stage convention; PING's journal remains the authority)
- **FALSIFICATION:** show a stage transition in the loop with no corresponding artifact, or two runs writing to the same evidence dir.
- **DEPENDENCIES:** filesystem; M-1 (for cross-run correlation).

---

### M-24. Escalation exit-code contract

- **MECHANISM_ID:** M-24
- **PROBLEM:** A coordinator's outcome must be machine-readable by whatever supervises it (cron, operator, parent loop): "closed", "needs human", "crashed", "cancelled", and "someone else owns it" are different states.
- **SOURCE:** `orca-remediation/orca_control_loop.js` (v2)
- **PINNED_SHA:** `4abc75ee506c1ead`
- **SOURCE_LOCATION:** `main()` catch blocks + `releaseClaimAndExit`
- **MATURITY:** tested (paths are explicit in code; the `--fault=deny` hook exercises the escalation path against the live gate)
- **INVARIANT:** exit 0 = closed (objective marked COMPLETED, no fresh work on restart); exit 2 = fatal (stack in `99-fatal.json`); exit 3 = Escalation (reason + detail in `99-escalate.json`, ledger unit moved to BLOCKED); exit 4 = cancelled; exit 5 = lock/contention (another coordinator holds the claim, or PG unreachable: exit without dispatching).
- **IMPLEMENTATION:** `Escalation` class carries `{tag, detail}`; the catch block persists the artifact, releases the coordinator claim, ends the pool, and exits. SIGINT/SIGTERM release the claim before exiting (130/143).
- **FAILURE_MODE:** exit 5 conflates "another coordinator holds it" with "PG unreachable": an operator cannot tell contention from outage without reading logs.
- **PING_EXISTING_ANALOG:** typed failure semantics doctrine (SOUL.md section 11); mission FAILED vs failed-with-retry vs dead-letter.
- **GAP:** no structured outcome event on the canonical journal for the run itself (the run's outcome lives in files, not in `ping_events`).
- **HARVEST_CLASS:** PATTERN_ONLY
- **FALSIFICATION:** show an escalation exiting 0, or a fatal error exiting 3.
- **DEPENDENCIES:** M-4, M-19.

---

### M-25. Credentials at the process boundary

- **MECHANISM_ID:** M-25
- **PROBLEM:** Dispatcher scripts need PG credentials; baking them into files, logs, or WorkOrders leaks them into evidence and chat transcripts.
- **SOURCE:** `orca-dispatch-test/run-loop.sh`
- **PINNED_SHA:** 2026-09-18 11:56
- **SOURCE_LOCATION:** whole file
- **MATURITY:** tested (in use for the witnessed runs)
- **INVARIANT:** secrets are resolved at the process boundary from the live gateway container env (`docker exec ping-gateway printenv POSTGRES_PASSWORD`) into env vars; values never touch disk, logs, or tool output. The contract (section 6) extends the rule: no secrets in `input`/`output`/`evidence`; brokers resolve credentials at the process boundary, never inside a WorkOrder.
- **IMPLEMENTATION:** `export PGPASSWORD="$(docker exec …)"` then `exec node …`; the adapter header states "No secrets handled."
- **FAILURE_MODE:** env vars are visible to any process that can read `/proc/<pid>/environ`; the threat model here is evidence hygiene, not OS-level secrecy.
- **PING_EXISTING_ANALOG:** Secure Vault / bearer-token-in-container-env practice (MEMORY.md).
- **GAP:** none.
- **HARVEST_CLASS:** PATTERN_ONLY (operational hygiene, already PING practice)
- **FALSIFICATION:** find a credential value in any evidence artifact, log, or WorkOrder.
- **DEPENDENCIES:** docker access to the gateway container.

---

### M-26. ORCA ExecutionEngine private event queue + artifact store (dead-by-design)

- **MECHANISM_ID:** M-26
- **PROBLEM:** (Anti-mechanism, recorded for the delete list.) The pre-remediation ORCA engine kept its own event queue, artifact store, in-memory mission list, and disk JSON capability registry, disconnected from the PING spine.
- **SOURCE:** `orca-omniroute-audit-2026-09-13.md` sections 2A, 5, 6, 9
- **PINNED_SHA:** n/a (audit doc, 2026-09-13)
- **SOURCE_LOCATION:** `ping-runtime/orchestration/execution/` (engine.js 716L, event_queue.js 205L, artifact_store.js, capability_registry.js/json); `gateway_runtime.js:354-366, 871-872`
- **MATURITY:** broken (live-but-orphaned by documented decision: `dispatchToAssignment` builds a prompt artifact and returns it; it never calls `workerPort.execute()`; the sole port was constructed with `executor: null`; the engine emits only on its private queue, never on PING events; capability_registry.json held 1 worker with 0 completed tasks; all disk state inside the container image filesystem, i.e. ephemeral)
- **INVARIANT (violated):** none; this is the competing-authority residue the remediation was built to route around.
- **IMPLEMENTATION:** 14 modules; HTTP-mounted at `/orchestration` (11 endpoints) but never called by the business path; standalone CLI writing `phase38_report.json`.
- **FAILURE_MODE:** the failure mode is existence: a second scheduler, second registry, second event queue beside the live spine, inviting future code to wire into the wrong one.
- **PING_EXISTING_ANALOG:** the live spine (M-13) is the correct analog that already exists.
- **GAP:** the convergence decision ("Keep DISABLED until an explicit Orca-vs-live-spine convergence decision") was still open at audit time.
- **HARVEST_CLASS:** REJECT (as a system; M-12's selection pattern is separately PATTERN_ONLY)
- **FALSIFICATION:** n/a (already falsified by the audit: executor null, no business traffic, documented deferral comment).
- **DEPENDENCIES:** none (that is the point).

---

### M-27. MissionCompiler catalog (planner vocabulary)

- **MECHANISM_ID:** M-27
- **PROBLEM:** A general planner needs a vocabulary of mission types to decompose objectives into; without it, planning is objective-specific hand code.
- **SOURCE:** `orca-omniroute-audit-2026-09-13.md` section 2A
- **PINNED_SHA:** n/a (audit doc, 2026-09-13)
- **SOURCE_LOCATION:** `execution/mission_compiler.js:4-49` (10 MISSION_TYPES: ENTROPY_REDUCTION, WITNESS_IMPROVEMENT, DEAD_CODE_AUDIT, REPLAY_PROOF, DEPENDENCY_AUDIT, AUTHORITY_AUDIT, SERIALIZATION_AUDIT, DOCUMENTATION, TEST_GENERATION, CERTIFICATION)
- **MATURITY:** aspirational (emits internal `mission_created` events on the private queue; CONTROL-LOOP-DESIGN G6: "decomposition is objective-specific; wiring MissionCompiler's catalog for general objectives is future work")
- **INVARIANT:** none enforced.
- **IMPLEMENTATION:** catalog of 10 mission types compiled from the intelligence graph; the v2 control loop does not use it (its plan is built by `buildPlan` for the audit objective).
- **FAILURE_MODE:** the catalog types are PING-self-improvement-shaped (dead code audit, replay proof); they do not generalize to arbitrary operator objectives.
- **PING_EXISTING_ANALOG:** `MissionRuntime` mission types on the live path (business/worker event types).
- **GAP:** planner generality (G6) is an open program gap.
- **HARVEST_CLASS:** WATCH
- **FALSIFICATION:** show the catalog driving a real decomposition in any witnessed run.
- **DEPENDENCIES:** M-26's engine (which is rejected) or a new planner.

---

### M-28. MCP control plane usage (NEGATIVE FINDING)

- **MECHANISM_ID:** M-28
- **PROBLEM:** The task brief asks for Orca's MCP control plane usage. There is none.
- **SOURCE:** all internal materials (absence verified by search); lane C for the external project
- **PINNED_SHA:** n/a
- **SOURCE_LOCATION:** n/a (no MCP code, config, or tool definitions in any internal orca material; the control surfaces are: the v2 loop's argv/env interface, the dispatcher's argv interface, and the engine's HTTP `/orchestration` endpoints)
- **MATURITY:** n/a
- **INVARIANT:** n/a
- **IMPLEMENTATION:** n/a. The closest things to a "control plane" in the internal program are: (1) the PG advisory-lock coordinator claim (M-4, mutual exclusion), (2) the HTTP `/orchestration` mount (11 endpoints, live but orphaned, M-26), (3) `run-loop.sh` process-boundary credential injection (M-25). None is MCP.
- **FAILURE_MODE:** n/a
- **PING_EXISTING_ANALOG:** n/a (PING's MCP posture is separately owned per lane C: MCP stays an adapter, never an authority)
- **GAP:** if a future autonomy design wants agent-initiated control (list runs, stage work, review), orca-cli/orca's README describes exactly that API (`orca_list_runs`, `orca_stage`, `orca_review`) but lane C falsified it: `internal/mcp/doc.go` is a 4-line stub, zero implementation (A13, REJECT).
- **HARVEST_CLASS:** REJECT (nothing to harvest; recorded so no later lane invents an Orca MCP mechanism)
- **FALSIFICATION:** produce any MCP server/tool definition in the internal orca materials.
- **DEPENDENCIES:** none.

---

### Mechanism coverage against the brief's required topics

| Required topic | Covered by | Notes |
|---|---|---|
| task graph | M-17, M-27 | 2-task linear pipeline + verified-evidence follow-up; no DAG engine exists internally (orca-cli/orca's `run_dependencies` is data-only, lane C A4) |
| durable state | M-5, M-1, M-2 | `PING_DATA_ROOT/objectives/<id>/` layout; atomic writes |
| run identity | M-1 (+ RUN_ID as explicit non-identity) | RUN_ID is the correlation root of one epoch; no identity derives from it (v1 violated this; v2 fixed it) |
| attempt identity | M-3 | `workOrderId-attempt-N` + record-before-dispatch |
| worker assignment | M-8, M-9, M-12, M-13 | fail-closed gate + closed envelope + deterministic selection (aspirational) + live eventTypes routing (production) |
| worktree isolation | , | **no mechanism in the internal materials** (dev worktrees are not a worker-isolation mechanism). The real one is lane C A5 (orca-cli/orca, HARVEST_DIRECTLY) |
| worker death handling | M-3, M-6, M-7, M-16 + M-13 | dispatcher death (rendezvous+reconcile), worker timeout (honest failure), live-spine lease expiry + reaper + dead-letter |
| resume | M-7 | startup reconciliation before any new dispatch |
| checkpointing | M-23, M-19 | numbered evidence artifacts; typed ledger (module unverified here) |
| dependency release | M-17 | follow-up only from verified evidence; causation_id threading; no multi-dependency gating anywhere |
| failure propagation | M-10, M-11, M-16, M-24 + M-13 | non-retryable validation failure; WORKER_FAILED canonical events; retry policy; escalation exit codes; live-spine failWithRetry -> dead-letter |
| MCP control plane usage | M-28 | **none exists** (negative finding, explicit) |
| operator intervention points | M-15, M-24, M-18 | cancel.requested marker; escalation exit 3 + `99-escalate.json`; REQUIRES_HUMAN_APPROVAL; --objective= human-once; --probe-prohibited=/--fault= test hooks |
| next-task selection | M-17, M-14 | assess remaining work from verified output; budget gates; live-spine `getPending` priority order |

---

## 3. WHAT CAN ORCA DELETE FROM PING'S DESIGN?

Standing context first: Nolan's 2026-09-18 call prohibits ORCA from becoming another execution authority (no ORCA event store, queue, scheduler, retry manager, identity authority, or parallel evidence ledger), and the 2026-09-19 audit falsified claims that PING *lacked* the spine machinery (EventBridge retired but superseded, WITNESS_CREATED already binds witness_root, the WorkOrder envelope already exists, approvals tables exist but dormant, ExecutionEngine live on the boot path). So the honest delete list is short and specific. Nothing in the internal orca materials justifies deleting `UnifiedEventRuntime`, the bridge, `MissionRuntime`, the scheduler, or the canonical workers; the remediation was built on the explicit premise that the live spine wins.

### D-1. The ORCA ExecutionEngine's private universe (M-26) , DELETE CANDIDATE, needs Nolan's convergence call

`ping-runtime/orchestration/execution/` (engine, scheduler, private EventQueue, artifact store, artifact router/authorities, consensus engine, merge gate, context authority, worker state machine, ollama provider) plus the disk `capability_registry.json` and the `/orchestration` HTTP mount. The 09-13 audit proved it is live-but-orphaned: it never executes (`executor: null`), emits only on its private queue, holds state in container-ephemeral disk, and has zero business traffic; the convergence-deferral comment documents this as a decision awaiting Nolan. The v2 control loop (M-1..M-25) is the replacement orchestration layer above the spine. **Reasoning:** it is the exact second-authority residue the program was ordered not to create; every future reader must be told which scheduler/registry/queue is real. **Condition:** Nolan's explicit convergence decision (the audit deferred it; memory shows he ordered ORCA converted into a real layer *above* the spine, which implies this engine's removal, but the removal itself was never explicitly ordered). Keep `mission_compiler.js`'s catalog vocabulary (M-27) under WATCH before deleting.

### D-2. The vendored byte-copy adapter , ALREADY DELETED, verify on the Pig

The v2 loop header states: "The vendored byte-copy under vendor/ was retired; the loop requires the canonical module owned by workstream (d)." The workspace v1 tree has no `vendor/` dir, consistent with retirement. **Reasoning:** two copies of the adapter is two authorities for the grant decision. **Action:** confirm `orca/control-loop/vendor/` is gone on the Pig worktree (not verifiable from here).

### D-3. File/PID-based coordinator locking , DELETE, replaced by M-4

The stale `main.new.js` draft references `objRuntime.claimCoordinatorLock` (synchronous, file-based), which does not exist in the shipped substrate; the remediation replaced it with the PG advisory-lock claim. Separately, the shipped code comments name `gateway/advisory_lock.js`'s `AdvisoryLock` as unsound (acquire/release across pooled connections). **Reasoning:** PID probing cannot span the WSL/Windows namespaces and leaves stale holders after SIGKILL; the pooled advisory lock is a correctness bug. **Action:** delete the stale `main.new.js`/`delegate.new.js` drafts (archival, not constitutional) and repair or remove the gateway `AdvisoryLock` pool usage.

### D-4. The legacy taskId-derived work_order_id minter , DELETE after the compat window

`workOrderId(taskId) = sha256('workorder:'+taskId)[0:16]` is preserved as fallback inside `stableWorkOrderId`. Once all callers pass the (objective_id, task_key)-derived override, the legacy minter is a second identity scheme for the same concept. **Reasoning:** two minters is a fork waiting to happen (M-2 failure mode). **Condition:** verify no caller depends on the legacy derivation, then collapse to one minter. Backward-compat tests (`adapter-compat-test.js`) pin the fallback, so this needs a deliberate deprecation, not a silent edit.

### D-5. The A0 facade path (`startAutonomousLoop` synthetic outputs) , DELETE CANDIDATE, gated on Nolan

Memory (`memory/2026-09-18.md` L257, L304): ORCA was resolved as a prompt/coordination facade with synthetically fabricated dashboard closure outputs; Nolan accepted the forensic result and prohibited deleting ORCA outright, ordering conversion instead; "labeling ORCA and removing or bannering synthetic output still require Nolan's architectural call." The v2 loop deliberately leaves the facade path "untouched and preserved." **Reasoning:** synthetic closure metrics are invalid evidence (the memory record is explicit); a facade that fabricates success next to a real loop is a trust hazard. **Condition:** Nolan's word, already flagged as required.

### D-6. Non-deterministic mission ID minter on `/orchestration` , DELETE if the surface survives D-1

`routes/orchestration.js` mints `mission_${Date.now()}_${Math.random()…}` (09-13 audit section 9.5). **Reasoning:** random IDs violate the content-identity invariant everything else in the system enforces (M-1, M-11, M-13). If `/orchestration` is kept for manual use after D-1, replace with deterministic identity; if removed, this dies with it.

### D-7. The ORCA disk-file capability registry as a second capability surface , DELETE, consolidate to PG

`execution/capability_registry.json` (rewritten on every mutation, container-ephemeral) vs the PG `capability_registry` table on the live spine (51-table `ping_runtime` DB). **Reasoning:** two capability surfaces; the file one never had more than one worker and zero traffic. Consolidate on the PG-backed registry.

### What ORCA explicitly must NOT delete (anti-list, for lane 19)

- `UnifiedEventRuntime` single-writer invariant, `computeEventId` identity, the bridge, `MissionRuntime` conditional-SQL lifecycle, `MissionScheduler`, `WorkerRuntime.dispatch`, canonical workers: the 09-19 audit falsified the claims that these were missing or broken. They are the substrate the remediation stands on.
- The `AGENT_PROFILES` codex/opencode entries: carried over from the proven reference; opencode is permanently blocked and codex's block is time-bounded. They are dormant data, not dead code demanding deletion.
- The approval machinery (`approvals`, `approval_policies` tables): dormant, not absent; the M-18 policy consult may eventually wire into it.

### DELETE_OUR_NEED harvests (mechanisms that remove a PING need)

- M-4 deletes the need for a coordinator heartbeat/watchdog or stale-holder detector: the DB releases the lock on session drop.
- M-6 deletes the need for a coordinator-to-dispatcher liveness protocol: the rendezvous file is the protocol.
- M-7 + M-15 delete the need for operator runbooks for "restarted mid-run" and "stop future work": both are durable state transitions now.
- M-14 deletes the need for process-local budget counters and the restart-amnesia they cause.

---

## 4. Open questions (could not resolve from these sources)

**Q-1. The `policy/` module.** `orca_policy.js` (`classifyDelegation`, `classifyRetry`, `classifyFollowUp`, `classifyResultAcceptance`, `prohibitedAction`, `PROHIBITED_ACTIONS`, `DECISION_CLASSES`, `escalateUndecidable`) and `orca_status_model.js` (`OrcaStatusLedger`) are imported by the v2 loop but absent from every workspace copy. M-18 and M-19 are therefore **unverifiable claims in this lane**; `ledger-selftest.js` replays edge sequences against the real ledger only on the Pig. Needed: the module sources + their test results.

**Q-2. A5 verification.** Memory records the coordinator's claim of "real WorkOrder execution above the existing PING spine, autonomous follow-up, genuine timeout-to-retry recovery" (commit `992e12725`, unpushed branch `feature/orca-autonomy`) and also records that Pigi had *not* independently completed the promised audit of the commit, event IDs, and test counts. The two witnessed runs in my sources (`orca-run-mu6wmbzn` success, `orca-run-mu725l0c` timeout+kill) are consistent with A5 but are coordinator-reported. Needed: independent event-ID recomputation and test-count audit.

**Q-3. The mu725l0c orphan vs the rendezvous.** Memory says attempt 2 of `orca-run-mu725l0c` was "orphaned mid-spawnSync, no dispatch-t1-a2.json, result unrecoverable." The remediation's rendezvous (M-6) exists precisely to make that recoverable. Unclear whether the rendezvous was deployed for that run (the run predates or coincides with the remediation commit `6a342dd27`). Needed: confirm a post-remediation kill-restart run shows RENDEZVOUS_RECOVERED.

**Q-4. Filesystem state vs canonical events divergence.** The durable objective/work-order state (M-5) lives in JSON files; the canonical outcomes live in `ping_events`. No two-phase commit binds them: `updateWorkOrder(...COMPLETED...)` and `recordVerifiedResult` can diverge on crash. The v2 loop orders them (record first, then mark COMPLETED) and reconciliation re-derives from files, but a crash between the two leaves a verified event with a non-COMPLETED work order (safe: re-accept is idempotent via `logical_id`) or a COMPLETED work order with no event (unsafe: cached "success" with no canonical evidence). Needed: the actual ordering guarantee and which divergence direction was chosen.

**Q-5. `pidAlive` across the WSL/Windows boundary.** The reconciler's case (b) ("dispatcher possibly alive, refuse redispatch") hinges on probing a Windows-spawned dispatcher PID from WSL. The failure mode (false "alive" -> work order stuck RUNNING with no watchdog) is unaddressed. Needed: evidence the probe is reliable or a stuck-RUNNING timeout.

**Q-6. Stale draft divergence.** `delegate.new.js` vs the inlined v2 `delegate()` differ in terminal-work-order handling (draft: any terminal+terminal-info returns cached success; v2: only COMPLETED does). `main.new.js` references a nonexistent `claimCoordinatorLock`. Which is canonical is unresolvable without the Pig worktree. Needed: worktree diff.

**Q-7. Dead-letter authority (P0-5).** Named in SPINE-TRACE as the exhaustion route for `failWithRetry`, but its implementation was not in this lane's sources. Needed: file:line for the dead-letter path.

**Q-8. G1 fix verification.** The t2 false-negative fix (result_recorded presence bit + `MISSION_*`-by-payload query) is in the v2 code, but no witnessed rerun with the fix appears in these sources. Needed: a post-fix t2 run showing `chain_complete: true` for the same mission.

**Q-9. Concurrent-dispatcher script race.** Memory (`memory/2026-09-18.md#L509`) notes the shared `C:\Windows\Temp\orca-hermes-dispatch.py` copy/unlink races between concurrent dispatchers; the remediation did not fix it (only the prompt file is per-attempt). Needed: either per-attempt script paths or a mutex.

**Q-10. Exit-5 ambiguity.** Exit code 5 conflates "another coordinator holds the claim" with "PG unreachable." Needed: split the code or enrich the log/artifact so an operator can distinguish contention from outage.

---

## 5. Method honesty log

- No code was executed in this lane. All maturity claims of "tested" rest on test scripts present in the sources (and memory's account of their runs), not on executions I performed. Anything I could not verify is marked `aspirational-from-here` (M-18, M-19) or listed in section 4.
- The workspace copies are uncommitted staging snapshots dated 2026-09-18; the committed state (memory: `6a342dd27`, `992e12725` on `feature/orca-autonomy`) lives on the Pig worktree, which is not mounted in this sandbox. File shas in section 1 are workspace-file shas, not commit shas.
- The external orca-cli/orca findings are lane C's, cited with file pointers, not re-derived.
- Memory entries were used as context for program history and Nolan's standing calls, never as mechanism evidence. Where memory and source disagree (e.g. the workspace adapter lacking `stableWorkOrderId` that memory says was committed), the source is reported as-is and the disagreement is noted.
- No web search was needed; all findings are grounded in the workspace materials.
