# Independent Falsifier Report — Hermes Reached-Path Proof Lane
**Date:** 2026-09-27 (~01:45 UTC; 2026-09-26 19:45 MDT)
**Falsifier role:** O5 (Mission Control finish directive; implementer never certifies itself)
**Target lane:** `~/workspace/orca-mc-convergence/hermes-proof/` (`PROOF-REPORT.md`, 8 cond scripts, `evidence/`)
**Verdict under test:** "Hermes is NOT an executor candidate; 6/8 PASS, 2 FAIL (DEFECT-1 bridge down, DEFECT-2 no effect-state vocabulary)."

## Overall verdict: STANDS

I re-ran every re-runnable leg with my own commands and observations. DEFECT-1 and DEFECT-2 are both real, precisely located, and reproducible RIGHT NOW. All substantive claims survive. I found three cosmetic inaccuracies (none verdict-affecting), recorded below. Nothing I observed contradicts the lane's conclusion: **Hermes is NOT an executor candidate** until DEFECT-1 is repaired and cond1 re-fires green; effectful capabilities additionally require DEFECT-2 closed.

## Preflight (own observation)
- `~/workspace/orca-mc-convergence/hermes-proof/` exists with `PROOF-REPORT.md`, 8 cond scripts, `evidence/` (8 cond evidence files + 2 result artifacts). PASS.
- Pig reachable over the documented SSH transport (key `~/.ssh/id_ed25519`, proxy `hatch-egress-proxy:3130`, userknownhosts `~/workspace/pig/known_hosts`): `echo pig-ssh-ok` returned in 1.9s, no secrets passed as arguments. PASS.
- `~/workspace/bin/prompt-hermes.sh` is the canonical live bridge path (matches `PROMPT_HERMES_SH` in `orca-adapter/adapter.js`). The lane's path correction is correct.

## Per-claim results

### Claim 1 — cond1 FAIL: transport exit 127, venv/Scripts/python.exe missing. **CONFIRMED**
Re-observed directly on the Pig right now:
- `hermes-run.sh` line 11 (`exec "$VENV_PY" ...` with `VENV_PY=.../hermes-agent/venv/Scripts/python.exe`) fails with `No such file or directory`, **exit 127, zero stdout bytes** — the exact signature the lane reported.
- `venv/` now holds a **Linux** venv (`bin/`, `lib/`, `lib64/`, no `Scripts/`); `pyvenv.cfg` home = `/home/nolan/.local/share/uv/python/cpython-3.11-linux-x86_64-gnu/bin` (uv 0.12.19). Both launchers (`hermes-run.sh` line 11, `hermes-launch.py` line 10 `VENV_PY = BASE + r"\venv\Scripts\python.exe"`) require the Windows layout.
- My own dispatch through `orca-adapter`'s `dispatchExecution` (harmless read-only probe, evidence to `/tmp/fal-ev` only, lane files untouched): transport exitCode **127**, elapsed 4645ms, adapter outcome `escalated` with `honestOutcome: unknown`, reason `worker_protocol_failure`, `recorded: false`, zero stdout/stderr bytes. Exact code captured, no collapse to `failed`, no retry, no canonical event. The adapter's honest handling of this failure is real.

### Claim 2 — regression window (good smoke 2026-09-26 13:21 UTC, then Linux venv replaced Windows venv). **CONFIRMED with tighter bounds**
- The lane's exact "13:21 UTC" timestamp has no independent primary record in the lane's own artifacts (self-referential). But independent corroboration exists: `~/memory/2026-09-26.md` line 929 records the Orca adapter lane's `6d80db4` as "25/25 synthetic + live smoke", and `orca-adapter/adapter.js` + `test/live-smoke.js` were both written 2026-09-26 13:38 UTC — a live smoke through the full bridge (which requires the Windows venv python) happened at or before ~13:38 UTC.
- **Tightened by my own reobservation:** the Linux venv was created **2026-09-26 09:05:41 -0600 (MDT) = 15:05:41 UTC** (Pig-side `ls --time-style=full-iso` on the venv dir). So the Windows venv was destroyed/replaced between ~13:38 UTC and 15:05:41 UTC on 2026-09-26. The lane's "after 2026-09-26 13:21" claim is consistent with this; I can narrow it to that ~90-minute window.
- Falsifier note: this means DEFECT-1 is a *regression*, not a from-scratch absence — the repair recipe (rebuild the Windows venv in place) is the correct class of fix, not a redesign.

### Claim 3 — cond2-7 PASS with the exact reported behaviors. **CONFIRMED (all re-run)**
- **cond2** (nonzero exit): `wsl -u nolan -- false` over ssh -> **RC=1** (my own run). `prompt-hermes.sh` tail-calls ssh as its last command with `set -u` only, so script exit = ssh exit; my cond1 probe observed 127 end-to-end (ssh 127 -> spawnSync 127 -> artifact exitCode 127). Exact-code capture confirmed against my own artifact, not the lane's.
- **cond3** (malformed): empty stdin -> `usage: prompt-hermes.sh "prompt" | stdin` on stderr, **rc=2** in <1s (my run). `adapter.validateExecution({})` throws `execution.missionId required (non-empty string)` (my run). `dispatchExecution` with `transport: 'telepathy'` throws `unknown transport: telepathy (only 'hermes' is proven)` (my run). Pig-side `hermes-launch.py` with no argv -> **IndexError traceback, rc=1** (my run via the Linux venv python; loud and nonzero, untyped, acceptable).
- **cond4** (timeout): my own dispatch with `timeoutMs: 2000` returned in **2008ms** (bounded: 2000 <= 2008 < 6000), outcome `unknown`, reason `dispatcher_timeout`, `reconcileOwnedBy: caller`, artifact `timedOut: true`, `exitCode: null`. No collapse to failed, no retry. Confirmed against my own `/tmp/fal-ev/result-fal-cond4-a1.json`.
- **cond5** (missing WSL): positive leg `wsl -u nolan -- whoami` -> `nolan`, rc=0 (my run; confirms `nolan` is the WSL username, not a distro). Negative leg `wsl -d no-such-distro-xyz -- hostname` -> **RC=255**, error text `There is no distribution with the supplied name. Error code: Wsl/Service/WSL_E_DISTRO_NOT_FOUND` on **stdout** (196 bytes), stderr empty — so it survives the bridge's stderr discard. Matches the lane's claim exactly.
- **cond6** (missing Hermes): chain audit by my own probes — `hermes-run.sh` PRESENT (content re-read), `hermes-launch.py` PRESENT, `hermes_cli/main.py` PRESENT, `hermes.exe` PRESENT (`AppData/Local/hermes/bin/`), **`venv/Scripts/python.exe` MISSING** — the single broken link. Live symptom identical to cond1. Confirmed.
- **cond7** (interrupted worker): my own faithful replication — backgrounded `prompt-hermes.sh`, SIGTERMed the ssh child at ~3s via `pkill -TERM -f 'hermes-run\.sh'` -> **wrapper rc=143, zero stdout bytes, no envelope**. Adapter synthetic leg (signal-killed transport record, partial stdout) through `dispatchExecution`: `escalated` / `honestOutcome: unknown`, reason `worker_protocol_failure`, `transportError` recorded, **not** collapsed to failed. Confirmed.

### Claim 4 — honest failure handling on every failure condition. **CONFIRMED**
Re-observed on cond1 and cond4 legs (task requirement), plus the cond7 synthetic leg: exact exit codes (`exitCode: 127`, not a mangled sentinel), UNKNOWN/`escalated` never collapsed to `failed`, no silent retry, no canonical event (`recorded: false`), `reconcileOwnedBy: caller`. The unknownOutcome invariant in `outcomes.js` (UNKNOWN is never treated as a terminal worker verdict) is enforced in code, not just prose.

### Claim 5 — adapter selftests 25/25 and 19/19 green. **PARTIALLY FALSIFIED (cosmetic)**
- `test/adapter-selftest.js`: **25/25 green, 0 FAIL** — CONFIRMED exactly (25 `check(` calls, 25 PASS lines).
- `test/tenant-threading-selftest.js`: the lane claims **19/19**. My run: **18 PASS lines, 0 FAIL, "ALL PASS"**. The file contains 18 `check(...)` calls plus the `function check(name, cond, detail)` definition (19 string matches of `check(`) — the lane appears to have counted the definition. True assertion count is **18/18, all green**. The substantive claim (suite fully green) stands; the headline number is off by one.
- `orca-adapter/` is untracked in git (`?? orca-adapter/`), file mtime 2026-09-26 13:38:11 UTC (predates the proof lane), so this count is not a post-lane mutation.

### Claim 6 — MC journal events with claimed statuses. **CONFIRMED**
All verified in the canonical `~/workspace/fyd-journal-gateway/events.jsonl` (not just the lane's local mirror):
- `mc-bf-37c748c2202f` MC_LANE_STARTED / STARTED
- 8x MC_GATE_RESULT: `mc-bf-c2234be66a5e` FAIL (cond1), `mc-bf-c4e5fd692fdd`/`mc-bf-0d8c555777cf`/`mc-bf-a5394b38a63c`/`mc-bf-f08b3e21cd50`/`mc-bf-2a351e2d8ba1`/`mc-bf-826988901204` PASS (cond2-7), `mc-bf-5c723b3882be` FAIL (cond8)
- `mc-bf-71300d33c83d` MC_ARTIFACT_PUBLISHED / PUBLISHED
- `mc-bf-338aa65aa439` MC_LANE_COMPLETED / PROOF_COMPLETE_BRIDGE_DOWN
Every event_id the report names exists with the exact type and status claimed.

### Claim 7 (DEFECT-2) — cond8 FAIL-partial: authority runs before dispatch, but outcomes.js has no EFFECT_UNKNOWN/HOLD for verified completions. **CONFIRMED**
Direct code reading (no reliance on the lane's analysis):
- **Transport-not-authority: PROVEN.** `dispatchExecution` runs the identity fence (`DENIED_IDENTITY_IDS`, adapter.js:113/286), `vendor.authorizeWorkOrder` (adapter.js:296), `issueWorkOrder` re-authorization (adapter.js:314) **before** `dispatchHermes` (adapter.js:333). `prompt-hermes.sh` contains **zero** authority references (`grep -c authoriz` = 0): pure transport.
- **No effect-state vocabulary: PROVEN.** `outcomes.js` is exactly `{completed, failed, unknown, denied, escalated}` — no external-effect dimension. `terminalOutcome()` accepts only COMPLETED/FAILED. A verified `completed` envelope from an effectful capability would record clean; exit-1 != no-effect is honored for failures/unknowns but not for verified completions. O4's EFFECT_UNKNOWN/HOLD requirement for post-effect outcomes is not expressible.
- **Supporting gaps confirmed:** `buildWorkerPrompt(workOrder, taskBrief, tenantId)` (adapter.js:138) never receives `constraints` (dispatch site adapter.js:326) — constraints are authorization-time gates only, never rendered into the worker prompt. The vendored profile documents `hermes.exe -z PROMPT --safe-mode -t <toolsets>` (external_agent_adapter.js:63/67), but `hermes-launch.py` line 22 runs `[VENV_PY, MAIN_PY, "-z", prompt]` with no such flags.
- Nuance on the lane's safe-mode sentence: the literal claim "main.py contains no 'safe-mode' string" is technically true (literal-hyphen grep = 0), but main.py *does* implement `_apply_safe_mode(args)` reading `args.safe_mode` (8 underscore-form matches). The material point survives regardless: the actual launcher invocation never passes any safe flag, so the read-only posture rests on capability allowlisting + prompt text, not an enforced invocation flag.

### Minor cosmetic inaccuracies (not verdict-affecting)
1. **19/19 -> 18/18** (tenant-threading selftest; counting error, suite green either way).
2. **"no Windows python exists anywhere on the Pig"** (cond6) is overstated: a Windows `python.exe` does exist at `.../hermes-agent/venv.broken-2026-09-15/Scripts/python.exe` (the 2026-09-15 repair leftover, itself broken). The substantive claim — no usable Windows python at the hardcoded `venv/Scripts/python.exe` path, and none in the scanned locations — holds.
3. **Safe-mode sentence** (above): literally true but understates main.py's `safe_mode` support; defect substance unaffected.

## DEFECT-1 repair recipe: CONFIRMED correct pointer
`~/workspace/INTEGRATION.md` line 31, "## Hermes repair (2026-09-15 night shift)", is the right recipe: fresh venv via `cpython-3.11.15-windows-x86_64-none\python.exe -m venv`, 67 packages via `uv pip install --python <venv-python> -e hermes-agent`, plus the critical lessons (Windows paths required for `venv` creation — WSL `/mnt/c/...` paths silently create nothing; Windows python mangles `/mnt/c/...` args; use `uv pip`, not plain pip). The repair must run **with Windows paths from the Windows side** (or a path-form that the Windows interpreter resolves), since the current breakage was caused by creating a Linux venv at the Windows-layout path. I did NOT attempt the repair (out of my allowed paths; touches shared interpreter state the Hermes desktop app may use — per the lane, needs the owning lane + Nolan's authority context).

## DEFECT-2 closure note
Closing DEFECT-2 requires: (a) an effect-state field in the outcome + artifact + canonical event (or an explicit `effect_unknown` outcome), (b) a definition of which capabilities may ever report EFFECT_PROVEN and by what independent verification (worker self-report is a claim, O5), and (c) reconciling the launcher's actual flags with the profile's documented safe invocation. Until then, Hermes must not be granted any effectful capability even after DEFECT-1 is repaired.

## Per-lane spend accounting (falsifier's own)
- Live adapter dispatches: 2 (cond1 re-run 4645ms, cond4 re-run 2008ms) + 1 synthetic-seam dispatch (7c). **0 model tokens burned**: the bridge 127s before `hermes_cli` ever launches; the cond4 probe timed out at the dispatcher before any worker output; the interrupt probe killed its transport at ~3s with a harmless echo-level prompt.
- Pig-side read-only probes: ~14 ssh invocations (venv audit, pyvenv.cfg, chain audit, missing-distro, launcher argv, safe-mode greps, python.exe scan, interrupt-orphan check). All `wsl -u nolan --` presence/behavior checks, no destructive action, no live E2E with WSL removed.
- Local runs: adapter selftests (25/25, 18/18), cond3 malformed legs (rc=2, typed throws), prompt-hermes.sh structure reads.
- No retries on identical failure; no loop. One transient ssh 255 hiccup retried once successfully.
- Files written: this report only (lane dir). My scratch evidence went to `/tmp/fal-ev/` (3 artifacts) and `/tmp/fal-*.js|sh`; the lane's `evidence/` was never modified.

## What I did NOT do (per contract)
- No code changes anywhere. No journal writes (read-only greps of `events.jsonl`). No effectful Hermes prompts (all prompts echo-level/read-only). No venv repair attempt. No candidacy declaration.

## Bottom line
The proof lane's verdict **STANDS**: 6/8 PASS, 2 FAIL, Hermes is NOT an executor candidate. Both defects are real and re-observable right now. The lane's evidence is honest and its failure handling is proven against independent reobservation. Three cosmetic inaccuracies (18 not 19, the venv.broken python.exe existence, the safe-mode sentence nuance) deserve correction in the report but change nothing substantive. Recommended follow-up: fix the 19/19 count and the two sentences in PROOF-REPORT.md, then hand DEFECT-1 to the owning lane with the INTEGRATION.md recipe and the 2026-09-26 13:38-15:05 UTC regression window.
