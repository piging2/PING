# Evidence Binding — ORCA Autonomy Remediation Unit, Phase 0

**Branch:** `feature/orca-autonomy` (worktree `/home/nolan/worktrees/orca-autonomy`, Pig WSL)
**HEAD at binding time:** `0b8acadfc` (authority-bypass sweep)
**Forensic commits:** `8899087a3` (A5 record), `00b1194fe` (A6 proof), `b323f91cf` (crash windows), `5c23e2f7c` (autonomy bounds), `0b8acadfc` (authority bypass)
**Evidence root:** `orca/control-loop/evidence/`
**Binder role:** read-only. Line numbers verified against `git HEAD` (`0b8acadfc`). Nothing edited, nothing committed.

**Commit-to-finding mapping:**
- `00b1194fe` → findings 1, 2, 4, 9
- `b323f91cf` → findings 2, 8, 9 (and informed 3, 4)
- `5c23e2f7c` → findings 5, 6, 7, 10 (B8)
- `0b8acadfc` → findings 10, 11
- `8899087a3` (A5 certification record) → no direct finding; provenance only

**Grading note:** Every code line below was read directly by the binder at HEAD. The
two canonical `WORKER_FAILED` event hashes quoted in finding 1 are the A6 report's
own PG read-backs (not re-queried by the binder in this pass); the duplication
itself (task 1 re-issued under a new work_order_id) is verified from the loop's
own persisted artifacts.

---

## 1. A6 restart duplication — restart created a second run with new workorder, repeated task 1

**Evidence:** `orca/control-loop/evidence/a6-restart-proof-2026-09-18T14-55-00-000Z/a6-restart-proof-2026-09-18.md` (commit `00b1194fe`)

**Code (mechanism — why a new workorder is inevitable):**
- `orca/control-loop/orca_control_loop.js:65` — `const RUN_ID = 'orca-run-' + Date.now().toString(36);` (fresh per process)
- `orca/control-loop/orca_control_loop.js:273` — `const taskId = \`${RUN_ID}-${taskKey}\`;` (run-scoped)
- `ping-runtime/external-agent/external_agent_adapter.js:227-229`:
```js
function workOrderId(taskId) {
  return crypto.createHash('sha256').update('workorder:' + taskId).digest('hex').slice(0, 16);
}
```

**Artifacts (observed, read from the loop's own evidence dirs):**
- `orca/control-loop/evidence/run-2026-09-18T14-32-43-163Z/workorder-t1.json` → `work_order_id=c003d479f611a792`, `task_id=orca-run-mu725l0c-t1-queue-summary`
- `orca/control-loop/evidence/run-2026-09-18T14-36-27-080Z/workorder-t1.json` → `work_order_id=9f1105aa7e1b4bd0`, `task_id=orca-run-mu72ads8-t1-queue-summary`
- Same logical task (`t1-queue-summary`) delegated twice; the SIGKILLed run's dir contains **no** `dispatch-t1-a2.json` (verified by listing).

**Reported (A6 §5(d), commit `00b1194fe`):** two distinct canonical events for one logical task — `WORKER_FAILED 2a616cff9ecff9233db66eab4ae1cf2f383a9297d0cc347f9eabdbcdb20a72d2` (14:35:43Z) then `WORKER_FAILED 0a6342dfe3795913b38110edeedc7db09abfef9e39a04095bd171cd5484588a8` (14:39:27Z).

**VERIFICATION:** VERIFIED (code mechanism + artifacts read directly; event hashes are the report's read-backs)

---

## 2. Work-order in-memory lifetime — workorders/counters in memory, reset per process

**Evidence:** A6 report §2 (`issueWorkOrder` "in-memory only"); crash-windows §window A ("`issueWorkOrder` is a pure function")

**Code:**
- `orca/control-loop/orca_control_loop.js:75` — `let workOrdersUsed = 0;` (module-scope counter; fresh on every process start)
- `ping-runtime/external-agent/external_agent_adapter.js:276-323` — `issueWorkOrder(...)` builds and returns the envelope; the only durable write on the delegation path is `save('workorder-T.json', workOrder)` in the *loop* (loop:305), not in the adapter
- `orca/control-loop/policy/orca_status_model.js:121-125`:
```js
class OrcaStatusLedger {
  constructor() {
    this._dir = null;
    this._states = new Map(); // unit -> current status
    this._ledger = [];
  }
```
(unit states live in a process-local `Map`)

**VERIFICATION:** VERIFIED

---

## 3. Run-ID construction — wall-clock based

**Evidence:** A6 report §2; autonomy-bounds report §3 (commit `5c23e2f7c`)

**Code** (`orca/control-loop/orca_control_loop.js:64-65`):
```js
const RUN_TS = new Date().toISOString().replace(/[:.]/g, '-');
const RUN_ID = 'orca-run-' + Date.now().toString(36);
```
(`RUN_ID` derives from `Date.now()` wall-clock; two processes in the same millisecond share it — autonomy-bounds §3.)

**VERIFICATION:** VERIFIED

---

## 4. Work-order-ID construction — embeds run ID

**Evidence:** A6 report §2; crash-windows §D2 / idempotency matrix (commit `b323f91cf`)

**Code:**
- `ping-runtime/external-agent/external_agent_adapter.js:227-229` (the minter):
```js
function workOrderId(taskId) {
  return crypto.createHash('sha256').update('workorder:' + taskId).digest('hex').slice(0, 16);
}
```
- `ping-runtime/external-agent/external_agent_adapter.js:307` — `work_order_id: workOrderId(taskId),`
- `orca/control-loop/orca_control_loop.js:273` — `const taskId = \`${RUN_ID}-${taskKey}\`;` (the hash input carries the wall-clock `RUN_ID`)

Deterministic within a run; a restarted process cannot re-derive a prior run's `work_order_id` because it cannot know the prior `RUN_ID`.

**VERIFICATION:** VERIFIED

---

## 5. Two-work-order budget scope — enforced per process, not per run/objective

**Evidence:** autonomy-bounds report §1, B1 (commit `5c23e2f7c`); crash-windows §7 "bound-reset finding" (commit `b323f91cf`)

**Code:**
- `orca/control-loop/orca_control_loop.js:49` — `const MAX_WORK_ORDERS = 2;`
- `orca/control-loop/orca_control_loop.js:280-283` (enforcement point, inside `delegate()`):
```js
const decision = orcaPolicy.classifyDelegation({
    adapter, agentId: AGENT_ID, capability, namespace: NAMESPACE, constraints: CONSTRAINTS,
    workOrdersUsed, runBounds: { maxWorkOrders: MAX_WORK_ORDERS, maxAttempts: MAX_ATTEMPTS },
});
```
- `orca/control-loop/orca_control_loop.js:308` — `workOrdersUsed += 1;` (increment against the in-memory counter at :75)
- Documented scope ("per run"): `orca/control-loop/orca_control_loop.js:21` — `* Bounds (bounded autonomy): max 2 work orders per run, ...`

Live probe (autonomy-bounds §1, B1): two independent node processes each returned AUTO_EXECUTE at used=0,1 and REQUIRES_HUMAN_APPROVAL at used=2,3. A6 demonstrated the consequence: the restarted run got a fresh 2-workorder budget.

**VERIFICATION:** VERIFIED

---

## 6. Absence of cancellation — no CANCELLED status, no signal handling

**Evidence:** autonomy-bounds report §2 (commit `5c23e2f7c`)

**Code:**
- `orca/control-loop/policy/orca_status_model.js:32-48` — `STATUSES` holds exactly 10 states: PLANNED, AUTHORIZED, QUEUED, RUNNING, BLOCKED, FAILED, EVIDENCE_PENDING, VERIFICATION_FAILED, VERIFIED, CLOSED. **No CANCELLED.**
- `orca/control-loop/policy/orca_status_model.js:45`:
```js
const TERMINAL = Object.freeze(['FAILED', 'VERIFICATION_FAILED', 'CLOSED']);
```
- Binder's own repo grep (read-only, 2026-09-18): zero matches for `cancel`, `abort`, `SIGINT`, `SIGTERM`, `shutdown`, `process.on` across `orca/control-loop/orca_control_loop.js`, `orca/control-loop/policy/*.js`, `orca/control-loop/run-loop.sh`, `orca/control-loop/hermes_dispatch.py`.

**VERIFICATION:** VERIFIED (positive proof of absence: status list and grep both confirm)

---

## 7. Absence of concurrency exclusion — no PID lock, advisory lock, lease, or objective claim

**Evidence:** autonomy-bounds report §3 (commit `5c23e2f7c`)

**Code / absence:** Binder grep across `orca/control-loop/` (run-loop.sh, loop, policy): no `pidfile`, no `flock`, no advisory lock, no `lease`, no `claim`, no mutual-exclusion construct of any kind. The only lease references in the tree are PING-mission leases (`MissionRuntime.reapExpiredLeases`, referenced as *policy data* in `orca/control-loop/policy/recovery_decisions.js:7-10,77-80`) — they govern PING missions, not the loop, and the loop holds none of them.

Observed consequence (autonomy-bounds §3): `RUN_ID`/`EVIDENCE_DIR` same-millisecond collision window; shared fixed dispatch script path `C:\Windows\Temp\orca-hermes-dispatch.py` (loop:203-204); two processes can interleave canonical events with no arbitrator.

**VERIFICATION:** VERIFIED

---

## 8. Dispatch crash window B — inside `dispatchHermes`; stdout-only envelope return

**Evidence:** crash-windows report §window B (commit `b323f91cf`)

**Code:**
- `orca/control-loop/orca_control_loop.js:202-221` — `function dispatchHermes(promptText, workOrderId) { ... }`:
```js
const r = spawnSync(VENV_PY, [winDispatch, winPrompt], {
      timeout: DISPATCH_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8',
    });
    ...
    return { stdout: r.stdout || '', stderr: (r.stderr || '').slice(0, 2000), exitCode: r.status, timedOut: !!timedOut, startedAt, endedAt };
```
- `orca/control-loop/hermes_dispatch.py:23-24` (the only Python on the live loop path):
```python
sys.stdout.write(r.stdout)
sys.stderr.write(r.stderr)
```
(the envelope leaves the worker **only** via stdout; no rendezvous file)
- `orca/control-loop/orca_control_loop.js:323` — `const ext = extractEnvelope(disp.stdout);` (extraction from the stdout string)

On SIGKILL during this window the in-memory `spawnSync` handle dies and the orphaned worker's result is unrecoverable — demonstrated live in A6 run 1 (no `dispatch-t1-a2.json`; leftover `C:\Windows\Temp\orca-hermes-dispatch.py`).

**VERIFICATION:** VERIFIED

---

## 9. D2 duplicate worker execution — restart creates second distinct event for one logical task

**Evidence:** crash-windows report §D2 + idempotency matrix (commit `b323f91cf`); A6 report §5(d) (commit `00b1194fe`)

**Code:**
- `ping-runtime/external-agent/external_agent_adapter.js:412-451` — `recordVerifiedResult(...)` commits the canonical event:
```js
const verification = verifyResultEnvelope(result, workOrder, { invokedAgentId, verifiedAt });
```
- `ping-runtime/events/unified_event_runtime.js:83` — `const eventId = crypto.createHash('sha256').update(JSON.stringify(identity)).digest('hex');` (event_id computed inline from `eventType/source/namespace/logical_id`)
- `ping-runtime/events/unified_event_runtime.js:149` — `INSERT INTO ping_events (...) VALUES (...) ON CONFLICT (event_id) DO NOTHING`
- `ping-runtime/external-agent/external_agent_adapter.js:337-350` — `resultIdentity`/`logical_id` embeds the **run-scoped** `work_order_id`/`task_id`/`mission_id`

The dedup only fires for the same logical identity; finding 4 shows a restarted process can never re-derive the pre-crash `work_order_id`, so cross-restart the conflict never fires and a second distinct `WORKER_*` event is committed for one logical task.

**VERIFICATION:** VERIFIED (code path read directly; live event pair is the A6 report's PG read-back — see grading note)

---

## 10. Dead forbidden-action enforcement — `prohibitedAction`/`PROHIBITED_ACTIONS` exported, zero call sites on the live path

**Evidence:** autonomy-bounds report §1, B8 (commit `5c23e2f7c`); authority-bypass report §4 (commit `0b8acadfc`)

**Code:**
- `orca/control-loop/policy/orca_policy.js:59` — `const PROHIBITED_ACTIONS = Object.freeze([` (17 entries; entries at lines 60-76)
- `orca/control-loop/policy/orca_policy.js:94-96`:
```js
function prohibitedAction(action) {
  return PROHIBITED_ACTIONS.find(p => p.action === action) || null;
}
```
- `orca/control-loop/policy/orca_policy.js:251-252` — `PROHIBITED_ACTIONS, prohibitedAction,` (exported)
- Binder repo-wide grep (excluding the policy file itself): **zero call sites** of `prohibitedAction` or references to `PROHIBITED_ACTIONS` in `orca/control-loop/orca_control_loop.js`, `ping-runtime/external-agent/`, or anywhere else.

**Discrepancy note (binder correction):** both reports state "18 entries". Executing the module at HEAD (`node -e`, `PROHIBITED_ACTIONS.length`) returns **17**; the file is unchanged since `992e12725` (before all five forensic commits), so the count was 17 for every report. The 17 entries span policy:60-76.

**VERIFICATION:** VERIFIED (as 17 entries, zero call sites — report's "18" is off by one)

---

## 11. Dead result-acceptance classifier — `classifyResultAcceptance` never called; behavior only via adapter call order

**Evidence:** authority-bypass report §4 (commit `0b8acadfc`)

**Code:**
- `orca/control-loop/policy/orca_policy.js:199-210`:
```js
function classifyResultAcceptance() {
  return decisionRecord(
    DECISION_CLASSES.REQUIRES_VERIFICATION,
    'external_agent_adapter.verifyResultEnvelope + orca_role§2:not-the-evidence-authority',
    'No worker output becomes loop truth until verifyResultEnvelope validates it and recordVerifiedResult records it as a canonical event.',
    'verify-then-record',
    {}
  );
}
```
- `orca/control-loop/policy/orca_policy.js:255` — `classifyResultAcceptance,` (exported)
- Binder repo-wide grep: **zero call sites** anywhere (definition + export only).
- The real (live) behavior the classifier describes exists only as adapter call order: `orca/control-loop/orca_control_loop.js:343` — `const record = await adapter.recordVerifiedResult({...})` → internally `verifyResultEnvelope` (`external_agent_adapter.js:412-413`).

**VERIFICATION:** VERIFIED

---

## Summary of verification grades

| # | Finding | Grade |
|---|---------|-------|
| 1 | A6 restart duplication | VERIFIED (code + artifacts; event hashes per report's PG read-back) |
| 2 | Work-order in-memory lifetime | VERIFIED |
| 3 | Run-ID construction (wall-clock) | VERIFIED |
| 4 | Work-order-ID construction (embeds run ID) | VERIFIED |
| 5 | Budget scope per process, not per run | VERIFIED |
| 6 | Absence of cancellation | VERIFIED |
| 7 | Absence of concurrency exclusion | VERIFIED |
| 8 | Dispatch crash window B | VERIFIED |
| 9 | D2 duplicate worker execution | VERIFIED (code path; event pair per report's PG read-back) |
| 10 | Dead forbidden-action enforcement | VERIFIED (17 entries at HEAD, not 18; zero call sites) |
| 11 | Dead result-acceptance classifier | VERIFIED |

**Discrepancies the binder corrected (not edited in sources):**
- "18 entries" for `PROHIBITED_ACTIONS` → actually **17** at HEAD (and at all five commits; file untouched since `992e12725`). Module execution confirms `length: 17`.
- autonomy-bounds report cites `workOrdersUsed` at `loop:75` → HEAD has it at `loop:75` too — confirmed accurate (not a discrepancy).
- crash-windows report cites window-B `dispatchHermes` at `loop:202-221` → confirmed accurate; envelope-return line at `loop:215`.
