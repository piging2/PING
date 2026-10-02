# Hermes Reached-Path Proof — Report (2026-09-27)

**Lane:** hermes-proof (`~/workspace/orca-mc-convergence/hermes-proof/`)
**Question:** Reobserve the WSL bridge and PROVE the full path
Windows caller -> batch bridge -> PowerShell -> WSL Hermes -> exit status ->
artifact/result -> Mission Control event/evidence, across all 8 conditions.
**Authority:** Nolan, `~/workspace/fyd-autonomy/batch5-owner-disposition.md`;
O1-O17 in `~/workspace/fyd-autonomy/scratch/axioms.md`.
**Method (per coordinator steering):** verify AGAINST the orca-adapter spine
(`orca-adapter/adapter.js`, `outcomes.js`, `vendor/external_agent_adapter.js`),
not from scratch. Reobservation of adapter-covered behavior + the MC
event/evidence leg; uncovered conditions become precise defect reports.

## Verdict

**Hermes is NOT a real executor candidate.** The bridge is DOWN (DEFECT-1), and
the spine cannot express EFFECT_UNKNOWN/HOLD for verified completions
(DEFECT-2). 6 of 8 conditions pass; the 2 failures are precise, located, and
repairable. What the adapter DOES correctly under failure is proven: exact
exit-code capture, no silent swallowing, honest UNKNOWN/ESCALATED, no
collapse to failed, no retry, no canonical event on unverified outcomes.

Candidacy requires: DEFECT-1 repaired + cond1 re-fired green, then DEFECT-2
closed before any effectful capability is ever granted.

## Preflight

| Check | Result |
|---|---|
| `~/workspace/pig-fb/` exists | YES |
| `prompt-hermes.sh` present | YES — **path correction:** not under `pig-fb/`; the canonical live path is `/home/hatch/workspace/bin/prompt-hermes.sh` (matches `PROMPT_HERMES_SH` in `orca-adapter/adapter.js`) |
| Pig reachable over existing SSH transport | YES — `ssh` with the script's key/proxy flags returned `pig-ssh-ok` in 1.5s; no secrets passed as arguments |

## Proven path under test

```
dispatchExecution (orca-adapter/adapter.js)
 -> [1] identity fence: identity_5..10 DENIED
 -> [2] authorizeWorkOrder (vendored, fail-closed)     <- AUTHORITY LEG
 -> [3] issueWorkOrder (deterministic id, re-authorizes)
 -> [4] dispatchHermes: spawnSync bash /home/hatch/workspace/bin/prompt-hermes.sh (prompt via stdin)
      -> scp prompt -> Pig C:\Windows\Temp\hermes-prompt.txt
      -> ssh nolan@100.79.154.43 'wsl -u nolan -- bash /mnt/c/Windows/Temp/hermes-run.sh'
          -> exec <venv>/Scripts/python.exe C:\Windows\Temp\hermes-launch.py <prompt file>
              -> subprocess [VENV_PY, hermes_cli/main.py, -z, prompt]
 -> extractEnvelope (balanced-brace JSON scan)
 -> verifyResultEnvelope (binding, echoes, status, deadline)
 -> recordVerifiedResult (injected UER only; null in this sandbox -> recorded:false, honest)
 -> outcome {completed|failed|unknown|denied|escalated} + atomic artifact (temp+rename)
 -> MC event leg: mission-control/emit.py -> fyd-journal-gateway/events.jsonl
```

Note: there is no PowerShell leg in the current Hermes path (the chain is
bash -> ssh -> wsl.exe -> bash -> python). The "PowerShell" step from the
original task description matches older/other bridge family patterns
(x-*.ps1), not this one.

## Per-condition results

### cond1 — success: exit 0 + artifact + verified envelope — FAIL
- Live dispatch via `dispatchExecution` (harmless read-only prompt, 1420 bytes):
  **transport exit 127**, elapsed 5098ms, empty stdout, empty stderr.
- Artifact `evidence/result-cond1-a1.json`: `exitCode: 127`, `timedOut: false`,
  `outcome: "unknown"`, `reason: "worker_protocol_failure"`,
  `extraction.reason: "no JSON object found in worker stdout"`,
  `recorded: false`. Outcome `escalated` with `honestOutcome: unknown`.
- Root cause (observed directly on the Pig):
  `hermes-run.sh: line 11: /mnt/c/Users/nolan/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe: No such file or directory`.
  The `venv` is now a **Linux** venv (`pyvenv.cfg` home =
  `.../cpython-3.11-linux-x86_64-gnu/bin`); the Windows venv the launchers
  require is gone. Last known-good: 2026-09-26 13:21 UTC smoke (exit 0).
- The adapter handled the failure exactly per contract (see cond2/cond6), but
  the success path does not currently exist. -> DEFECT-1.

### cond2 — nonzero exit: exact code captured, no silent swallowing — PASS
- Channel: `wsl -u nolan -- false` -> ssh RC=1 (observed live). Exact codes
  propagate; nothing mangles them.
- Script: `prompt-hermes.sh` tail-calls ssh as its last command (`set -u`
  only, no `set -e`, no trap), so script exit = ssh exit. Observed
  end-to-end in cond1: ssh 127 -> spawnSync status 127 -> artifact
  `exitCode: 127`. The x-follow-run.ps1 lesson (explicit `exit $LASTEXITCODE`)
  is satisfied by structure; nothing interposes between ssh and script exit.
- Adapter: the live 127 was captured EXACTLY (`exitCode: 127`) and NOT
  swallowed: outcome `unknown`/`worker_protocol_failure`, never collapsed to
  `failed`, no retry, no canonical event.
- **Finding (stderr opacity):** `prompt-hermes.sh` sends ssh stderr to
  `/dev/null` and scp output to `/dev/null 2>&1` (scp failure prints only
  "scp failed", exit 1). The artifact carries the code but not the diagnostic
  message; the *why* of a 127 requires Pig-side access. wsl.exe errors that
  arrive on stdout (e.g. WSL_E_DISTRO_NOT_FOUND) do survive into `stdoutTail`.
- Worker-level `failed` envelope could not be live-fired (bridge down); the
  verified-failed path is covered by the adapter selftest (25/25 PASS).

### cond3 — malformed invocation: typed error, no hang — PASS
- Empty prompt via stdin -> `usage: prompt-hermes.sh "prompt" | stdin` on
  stderr, **rc=2 in 4ms**. No-args + /dev/null stdin -> same. No hang, no SSH
  attempted (exits before scp).
- `adapter.validateExecution({})` throws `execution.missionId required
  (non-empty string)` before any dispatch.
- `dispatchExecution` with `transport: 'telepathy'` throws
  `unknown transport: telepathy (only 'hermes' is proven)`.
- Empty worker stdout -> `worker_protocol_failure` -> ESCALATED,
  `honestOutcome: unknown`, non-retryable, never canonical (cond1 live).
- **Finding:** `hermes-launch.py` with no argv dies with an untyped
  `IndexError` traceback (rc=1). Loud and nonzero, so acceptable, but the
  Pig-side launcher has no typed argument validation (unlike the empty-prompt
  check it does have, rc=2).

### cond4 — timeout/cancellation: bounded wait, typed outcome — PASS
- Live dispatch with `timeoutMs: 2000` (bridge needs ~5s even to fail, so the
  dispatcher must give up first): returned in **2016ms**.
- Outcome `unknown`, reason `dispatcher_timeout`, `reconcileOwnedBy: caller`;
  artifact `evidence/result-cond4-a1.json`: `timedOut: true`,
  `exitCode: null`, `outcome: unknown`.
- Bounded wait proven (2000 <= 2016 < 6000). UNKNOWN never collapsed to
  failed; the adapter attempted no retry. The Pig-side chain was killed
  locally and may linger remotely — the honest distributed-systems semantic,
  with reconcile-vs-retry owned by the caller (WorkerRuntime/MC), never the
  adapter.

### cond5 — missing WSL — PASS
- Positive leg (live, read-only): WSL present; distros `Ubuntu` (default,
  Running) and `docker-desktop` (Running); `wsl -u nolan -- whoami` -> `nolan`,
  rc=0. (Note: `nolan` is the WSL *username*, not a distro.)
- Negative leg (live, channel level, non-destructive):
  `wsl -d no-such-distro-xyz -- hostname` -> **RC=255**, stdout =
  `There is no distribution with the supplied name. Error code:
  Wsl/Service/WSL_E_DISTRO_NOT_FOUND` (UTF-16 from wsl.exe), stderr empty.
  The error text arrives on stdout, so it survives the bridge's stderr
  discard into the adapter's `stdoutTail`.
- Adapter trace for this shape (nonzero exit, no JSON envelope):
  `worker_protocol_failure` -> ESCALATED, `honestOutcome: unknown`,
  non-retryable, never canonical — mechanism observed live in cond1.
- Full E2E with WSL actually removed: destructive, forbidden by lane
  contract — NOT fired; documented here instead.

### cond6 — missing Hermes — PASS (condition answered with live evidence)
- Pig-side chain audit (read-only): `hermes-run.sh` PRESENT (reconstructed
  2026-09-25), `hermes-launch.py` PRESENT, `hermes_cli/main.py` PRESENT,
  `hermes.exe` PRESENT (`AppData/Local/hermes/bin/`).
  **`venv/Scripts/python.exe` MISSING** — the single broken link; no Windows
  python exists anywhere on the Pig.
- Live symptom = cond1: exit 127, empty stdout/stderr; adapter: `exitCode:
  127`, `outcome: unknown`/`worker_protocol_failure`, `recorded: false`,
  ESCALATED, non-retryable, never canonical, never collapsed to failed.
- This condition is the live proof of the missing-component handling; the
  missing component itself is DEFECT-1.

### cond7 — interrupted worker mid-run — PASS
- Live transport kill: `prompt-hermes.sh` backgrounded, its ssh child
  SIGTERMed at ~3s mid-flight -> **script rc=143**, zero envelope bytes on
  stdout. No envelope produced.
- Pig orphan check ran immediately after the kill (remote chain already gone
  in this instance — the 127-defect kills it at ~5s anyway; the semantic
  point stands: a killed local transport cannot know the worker's fate).
- Adapter leg (synthetic seam `transportFn`, signal-kill record
  `exitCode: null`, partial stdout): `extractEnvelope` -> unbalanced ->
  **ESCALATED, `honestOutcome: unknown`**, artifact `reason:
  worker_protocol_failure`, `transportError` recorded. Never failed, never
  retried, never canonical.

### cond8 — result after potential external effect — FAIL (partial)
- **Transport-not-authority: PROVEN.** Authority is checked in
  `dispatchExecution` steps 1-3 BEFORE any dispatch: (1) identity fence
  (`identity_5..10` DENIED); (2) `authorizeWorkOrder`
  (`vendor/external_agent_adapter.js:171`) fail-closed — known profile, not
  blockedExternal/PENDING_AUTH, capability in the profile allowlist,
  namespace valid, constraints tighten the profile maximum, HARD-requires
  `no_canonical_events=true` and `no_mission_state_writes=true`;
  (3) `issueWorkOrder` re-authorizes. The bridge scripts
  (`prompt-hermes.sh`, `hermes-run.sh`, `hermes-launch.py`) contain zero
  authority checks: pure transport.
- **EFFECT_UNKNOWN/HOLD for verified completions: NOT implemented ->
  DEFECT-2.** The outcome vocabulary (`outcomes.js`) is
  {completed, failed, unknown, denied, escalated} — no external-effect
  dimension. A verified `completed` envelope from an effectful capability
  would go `terminalOutcome(COMPLETED)` -> `WORKER_COMPLETED` (when a runtime
  is injected) with nothing distinguishing "completed, no possible effect"
  from "completed after unknown effects". Exit-1 != no-effect is honored for
  failures/unknowns but not for verified completions. The worker's
  `evidence.capabilityPerformed` is self-report (O5: worker output is a claim).
- Supporting gaps: constraints are authorization-time gates only —
  `buildWorkerPrompt` never renders them into the worker prompt and nothing
  technically enforces them on the worker process. The vendored profile
  documents `hermes.exe -z PROMPT --safe-mode -t <toolsets>`, but the actual
  `hermes-launch.py` runs `[VENV_PY, MAIN_PY, "-z", prompt]` with no
  `--safe-mode`/toolset flags, and `main.py` contains no `safe-mode` string
  (Pig-side grep, RC=1). The read-only posture rests on capability-name
  allowlisting + prompt instructions, not an enforced sandbox flag.
- The transport half of Q10/HOLD holds: the adapter propagates UNKNOWN and
  never retries (cond4/cond7); reconcile-vs-retry belongs to the caller
  (WorkerRuntime/Mission Control).
- No live fire: an effectful prompt is forbidden by the lane contract, and
  the harmless prompts used here cannot cross an external-effect boundary.

## Defect reports

### DEFECT-1: Hermes Windows venv missing (bridge DOWN) — cond1, cond6
- **What:** `C:\Users\nolan\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe`
  does not exist. The `venv` directory now holds a **Linux** venv
  (`pyvenv.cfg`: `home = /home/nolan/.local/share/uv/python/cpython-3.11-linux-x86_64-gnu/bin`).
  Both `hermes-run.sh` (line 11: `exec "$VENV_PY"`) and `hermes-launch.py`
  (`VENV_PY = BASE + r"\venv\Scripts\python.exe"`) require the Windows layout.
- **Symptom:** every dispatch fails in ~5s with exit 127 and empty output —
  the exact known signature from the 2026-09-25 Temp-loss incident.
- **Regression window:** after the 2026-09-26 13:21 UTC successful smoke.
  (A `venv.broken-2026-09-15` directory is also present from the earlier repair.)
- **Repair recipe (NOT done by this lane):** rebuild the Windows venv per
  `~/workspace/INTEGRATION.md` ("Hermes repair (2026-09-15 night shift)"):
  Windows cpython 3.11 + `uv pip install --python <venv-python> -e hermes-agent`
  (67 packages). Out of this lane's allowed paths; touches shared Pig-side
  interpreter state that the Hermes desktop app may also use — needs the
  owning lane + Nolan's authority context.
- **Re-verify after repair:** re-run `cond1-success.js`; expect exit 0,
  verified envelope, artifact, then the cond2 worker-failed-envelope leg that
  could not be live-fired this round.

### DEFECT-2: no external-effect state in the outcome/event vocabulary — cond8
- **What:** `orca-adapter/outcomes.js` has no EFFECT_UNKNOWN / EFFECT_PROVEN
  dimension, and `verifyResultEnvelope` does not assess effects. A verified
  `completed` envelope is recorded `COMPLETED`/`WORKER_COMPLETED` with no
  HOLD possible — violating Q10/O4 for the verified-completion case
  ("once execution might have crossed an external-effect boundary,
  disappearance/failure becomes EFFECT_UNKNOWN/HOLD, never inferred clean").
- **Where:** `~/workspace/orca-adapter/outcomes.js`,
  `~/workspace/orca-adapter/adapter.js` (step 7-8),
  `~/workspace/orca-adapter/vendor/external_agent_adapter.js`
  (`verifyResultEnvelope`).
- **Also in scope:** (a) constraints never reach the worker prompt and are
  not technically enforced; (b) documented `--safe-mode -t <toolsets>`
  invocation does not match the actual launcher.
- **To close:** add an effect-state field to the outcome + artifact +
  canonical event (or an explicit `effect_unknown` outcome), define which
  capabilities may ever report EFFECT_PROVEN and by what independent
  verification (worker self-report is not verification, O5), and reconcile the
  launcher's actual flags with the profile's documented safe invocation.

## Findings (non-defect)

- **F1 — stderr opacity:** `prompt-hermes.sh` discards ssh stderr
  (`2>/dev/null`) and scp output (`>/dev/null 2>&1`). Artifacts carry the
  exit code but not the diagnostic message. (cond2)
- **F2 — untyped Pig-side argv errors:** `hermes-launch.py` with no argv dies
  with `IndexError` (rc=1). Loud and nonzero; acceptable, but untyped.
  (cond3)
- **F3 — `wsl -u nolan`:** `nolan` is the WSL username on the default
  (Ubuntu) distro, not a distro name. (cond5)
- **F4 — no PowerShell leg** in the current Hermes path: bash -> ssh ->
  wsl.exe -> bash -> python. (method note)

## MC events emitted

Journal: `~/workspace/fyd-journal-gateway/events.jsonl`
(local mirror: `events.jsonl` in this dir). Lane: `hermes-proof`.

| event_id | type | status | condition |
|---|---|---|---|
| mc-bf-37c748c2202f | MC_LANE_STARTED | STARTED | lane open |
| mc-bf-c2234be66a5e | MC_GATE_RESULT | FAIL | cond1 success path |
| mc-bf-c4e5fd692fdd | MC_GATE_RESULT | PASS | cond2 nonzero exit |
| mc-bf-0d8c555777cf | MC_GATE_RESULT | PASS | cond3 malformed invocation |
| mc-bf-a5394b38a63c | MC_GATE_RESULT | PASS | cond4 timeout |
| mc-bf-f08b3e21cd50 | MC_GATE_RESULT | PASS | cond5 missing WSL |
| mc-bf-2a351e2d8ba1 | MC_GATE_RESULT | PASS | cond6 missing Hermes |
| mc-bf-826988901204 | MC_GATE_RESULT | PASS | cond7 interrupted worker |
| mc-bf-5c723b3882be | MC_GATE_RESULT | FAIL | cond8 effect boundary |

Each gate event links its evidence artifact via `evidence_link`.

## Spend accounting

Per-lane log: `spend.jsonl`. 3 live Hermes-destined invocations, 0 model
tokens burned (the bridge 127'd before `hermes_cli` ever launched; the
interrupt probe was killed at 3s):

| ts (UTC) | cond | kind | prompt bytes | elapsed | result |
|---|---|---|---|---|---|
| 2026-09-27T01:26:44 | 1 | live dispatch | 1420 | 5098ms | exit 127, escalated |
| 2026-09-27T01:31:00 | 4 | live dispatch, timeout 2000ms | 1410 | 2016ms | unknown/dispatcher_timeout |
| 2026-09-27T01:36:00 | 7 | live transport interrupt | 62 | 3000ms | killed, rc=143, no envelope |

All other legs were ssh-only presence/behavior checks (no model cost) or
local synthetic runs. No retries beyond single-assertion fixes in test
scripts; no repeated identical failures (loop ceiling respected). No live
drivers, cron bodies, FYD surfaces, or design-sprint files touched. No
destructive or externally-visible Hermes tasks run; all prompts harmless and
read-only.

## Replay notes (for the independent falsifier, O5)

- Every condition is a rerunnable script in this dir (`cond1-success.js`,
  `cond2-nonzero-exit.sh`, `cond3-malformed.sh`, `cond4-timeout.js`,
  `cond5-missing-wsl.sh`, `cond6-missing-hermes.sh`, `cond7-interrupted.sh`,
  `cond8-effect-boundary.sh`). Deterministic except for live Pig-side timing.
- `mc_emit.py` wraps `mission-control/emit.py` (idempotent on event_id) and
  mirrors to the local `events.jsonl`.
- Adapter synthetic suites re-ran green: `test/adapter-selftest.js` (25/25),
  `test/tenant-threading-selftest.js` (19/19).
- Expected replay deltas: cond1 stays FAIL until DEFECT-1 is repaired
  (then it should go green and unlock the cond2 worker-failed live leg);
  cond8 stays FAIL until DEFECT-2 is closed. Everything else should
  reproduce as PASS.

## Bottom line for the parent

- **Preflight:** pass (with path correction: bridge script lives at
  `~/workspace/bin/prompt-hermes.sh`).
- **6/8 PASS** (2,3,4,5,6,7). **2 FAIL** (1: bridge down; 8: effect-state gap).
- **Hermes is NOT an executor candidate** until DEFECT-1 is repaired and
  cond1 re-fires green; effectful capabilities additionally require
  DEFECT-2 closed.
- The adapter's failure handling is proven honest across every failure
  condition: exact exit codes, no swallowing, UNKNOWN/ESCALATED never
  collapsed to failed, no silent retries, no canonical events on unverified
  outcomes, authority checked before dispatch.
