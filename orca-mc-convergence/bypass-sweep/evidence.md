# Bypass discovery sweep — evidence

Sweep: 2026-09-26 ~20:35 MDT. Investigator: read-only lane. No code changed.

## Repos actually scanned

- `/home/hatch/workspace` — the single git repo holding everything below
  (HEAD `ba653ac`, branch `mc/audit-payload-lifecycle`). Subtrees scanned:
  `orca-mc-convergence/`, `orca-adapter/`, `mission-control/`, `pig-fb/`,
  `outreach/`, `bin/`, `cron.d/`.
- Front-door branch `mc/mission-intent-frontdoor @ 537d264` inspected via
  `git show` (validate/authorize/dispatch/observe/submit, `_call_adapter`,
  `frontdoor_adapters.detect_bypass`).
- `/home/nolan/projects/ping` — DOES NOT EXIST on this machine (confirmed
  missing; matches the front-door lane's own discovery note).
- `~/workspace/orca-adapter` is not a separate repo; it lives inside
  `/home/hatch/workspace`.
- Pig-side live code (e.g. the 9 `mission_runtime.js` copies) is NOT
  observable from here; this sweep covers only what is reachable on this
  machine.

## Front-door contract (reference)

`mission_intent.submit()` = validate (schema) → idempotency (journal-backed,
E2 collision fail-closed, in-flight → HOLD) → authorize (existing
`ExternalAgentAdapter.authorizeWorkOrder` via node shim, fail-closed) →
dispatch (issue work order via `_adapter_shim.js`, run Executor) → observe
(`MC_LANE_STARTED/COMPLETED/FAILED`, denial/duplicate events to journal).

## Findings (ranked by severity)

### 1. cron-direct-dispatch — SEVERE: the entire live engagement pipeline bypasses the front door

Zero references to `mission_intent`, `frontdoor`, or `front-door` anywhere in
`pig-fb/` or `outreach/` outside prose logs (grep 2026-09-26). Every live
dispatch path below skips all four front-door checks (validate / authorize /
idempotency / observe):

| Path | Effect | Driver |
|---|---|---|
| Instagram + Threads passes | likes, comments (external) | `pig-fb/run_ig_pass.sh` → `ig-engage.js` on Pig Chrome :9226 |
| Facebook passes | likes, comments (external) | `pig-fb/engage.js` on Pig Chrome :9223 |
| X passes | likes, comments, follows (external) | `pig-fb/x-engage.sh` → `x-like.js` / `x-comment.js` / `x-follow.js` on Pig Chrome :9225 |
| Cold email batches | Gmail sends (external) | `outreach/send-batch.py` (+ dated variants) via `hatch_gws_cli gmail +send` |
| TikTok / Threads (browser-task route) | likes (external) | cron-driven browser tasks; no local driver, still no front door |

Context: only ONE X pass was ever migrated as a mission
(`mc/pass-migration-proof @ 28c92f4`, replay-only proof). The migration
recommendation's preconditions (sibling re-proof, executor of record,
Nolan's live-dispatch authorization) remain unmet, so no live pass migrates.
The engagement pipeline is the highest-volume dispatch surface on the
machine and it is 100% outside the front door.

### 2. direct-executor-call — HIGH: `bin/prompt-hermes.sh` invokes Hermes with no gate at all

`bin/prompt-hermes.sh` (lines 1-30): takes an arbitrary prompt, `scp`s it to
`C:/Users/nolan/hermes-bridge/hermes-prompt.txt` on the Pig, then SSH-runs
`hermes-run.sh`. No validate, no capability authorization, no idempotency
key, no journal observation. This is the raw transport the P2
executor-of-record verdict explicitly demoted ("Hermes-raw is transport, not
an executor"). Any caller with shell access can dispatch headless agent
execution past every control-plane check. (Other `hermes_dispatch.py` /
`prompt-hermes` hits are archived probes under `orca-dispatch-test/`,
`orca-remediation/`, `orca-finish/`, `hermes-proof/` — not live paths.)

### 3. adapter-bypass — MEDIUM: the executor-of-record's enforcement point has no live caller, and the front door skips the consequence gate

- `orca-adapter/adapter.js` exports `dispatchExecution` (line 284) and
  `dispatchHermes` (line 216). Repo-wide grep: **zero callers** outside the
  file itself (only the internal `dispatchHermes` call at line 347 and the
  exports at 472/475). `dispatchExecution` contains the full step 1-4 path
  including the consequence `policyGate` (step 2c). It is currently dead
  code from this repo's perspective.
- The front door does NOT call it: `_issue_work_order`
  (`mission_intent.py:364`) shells out to the vendor adapter directly via
  `_adapter_shim.js` (`_SHIM`, line 89) with "authorize"/"issue" ops.
- `mission_intent.py` contains **zero** references to `policyGate` or
  `consequence`. The consequence lane's explicit handoff note ("call
  policyGate with strict:true") was not implemented on the front-door path,
  so the certified POLICY_TABLE (APPROVAL_REQUIRED for publication, material
  spend, credential use, host mutation, data destruction, etc.) is not
  evaluated for front-door dispatches.

### 4. observation-gap — MEDIUM: `detect_bypass()` is blind to all live dispatch volume

`frontdoor_adapters.py:208` `detect_bypass()` raises `ValueError` for any
mission class not in `MIGRATED_CLASSES`. Every live pass (IG/FB/X/Threads/
TikTok/email) is unmigrated, so the detector covers exactly one class (the
x-pass proof) and is blind to 100% of current live dispatch. Bypass
detection exists only where bypass is already impossible by migration.

### 5. Archived duplicates — LOW (not live bypasses; retirement candidates)

~40 archived copies of `external_agent_adapter.js`, `mission_runtime.js`,
and dispatch test harnesses under `orca-workstream-d/`,
`orca-remediation/`, `orca-finish/`, `tenanos-wave/`, `orca/`,
`ping-overnight/drift-sources/`, `ce002/`, `f01-fix/`,
`constitutional-sprint/`. Verified unreachable from live code paths (probe /
drift-source / red-team artifacts). Not bypasses; feed to the
duplicate-authority retirement program (prove deadness first, per #24).

## Explicitly not bypasses

- `outreach/pass-sweep.py`, `outreach/orphan-pass-watch.py`: verified
  read-only watchers (docstrings + code: stat/ledger reads only, never
  dispatch).
- `mission-control/spine_observe.py`: dry-run observer, no dispatch.
- Subagent spawn (this runtime's own machinery): agent delegation, not
  Mission Control missions; out of scope for the MC front door.
- `orca-adapter/test/live-smoke.js`: test-only caller of the adapter.

## Bottom line

The front door is certified and correct for the one migrated class, but the
machine's real dispatch volume (engagement passes, email, Hermes prompts)
flows through five legacy paths with zero front-door contact, and the one
detector that could catch bypass only watches migrated classes. Closing this
means migrating (or retiring) the legacy dispatchers, not hardening the
front door further.
