# LANE 11 — Provider Inventory (read-only harvest)

**Date:** 2026-09-25 ~20:15 MDT · **Lane:** 11 (provider inventory, read-only)
**Mode:** NO-EDIT DEFAULT. Inventory only. No files changed, no commits, no pushes.
**Scope:** every agent-provider surface in PING — Copilot, Hermes, Goose, OpenCode, Ollama, Codex, Crush, Gemini CLI, Qwen CLI, Aider, cloud subagents, Meta AI worker.
**Method:** code reads (file:line cited), one light Pig read per gap check, no builds, no test runs, no FYD lanes disturbed.

---

## 1. Per-provider table

Key: **request shape** = what the caller passes; **result shape** = what comes back; **usage** = token/credit/quota accounting.

### 1a. Copilot (via copilot-broker on Pig WSL `~/copilot-broker`)

| Aspect | Evidence |
|---|---|
| Callers | `~/workspace/pig-fb/copilot-broker/src/broker.js` `dispatch(task)` (:26-99) is the only entry point; `cli-runner.js` `runCopilotTask(opts)` (:19-109) spawns the CLI. No other caller exists in the workspace (grep: only broker.js imports it). Note: broker tests use `workdir: '/tmp'`; no production dispatcher wires `dispatch()` today (see Gap G-04). |
| Request shape | `{ prompt: string, workdir: string (REQUIRED), maxAiCredits: positive number (soft ceiling), model?: string|null, timeoutMs: 300000 default, env, spawnFn }` — `cli-runner.js:21-30`. CLI argv: `copilot -p <prompt> --output-format json --max-ai-credits <n> --allow-all-tools [--model m]` (`cli-runner.js:44-46`). Task routing pre-CLI: `task-tiers.js` T0/T1 stay local, T2/T3/T4 may invoke Copilot (`broker.js:27-45`). |
| Result shape | `ExecutionResult`: `{status, classification, classification_source, requested_credit_ceiling, actual_reported_usage, result_text, model, timed_out, started_at, completed_at, spawn_error, stderr_tail, event_summary:{terminal_signals, transient_signals, saw_result, result_exit_code, stream_exit_code}}` (`cli-runner.js:77-107`). Broker wraps into evidence: `{route:'copilot', tier, identity_id, invoked_copilot, classification, model, requested_credit_ceiling, actual_reported_usage, started_at, completed_at, timed_out, event_summary, stderr_tail, result_text}` (`broker.js:81-99`). |
| Streaming | YES (only provider that streams observably). `--output-format json` emits a JSONL event stream; `jsonl-classifier.js` parses it incrementally (`classifyStream`, :73-124). Usage events seen: `event.usage ?? event.aiCredits ?? event.credits` (`jsonl-classifier.js:59-67`). |
| Errors | Classifications from `jsonl-classifier.js`: `TEMPORARY_FAILURE` (timeout), `TOOL_FAILURE` (spawn error), plus terminal/transient signals from stream events. Timeout: `setTimeout` + `child.kill('SIGKILL')` at `timeoutMs` (`cli-runner.js:55-59`). Spawn error resolves, never throws (`:60-77`). |
| Cancellation | YES (only provider with a working cancel path): timer-driven `SIGKILL` on timeout; result reports `timed_out:true`. No mid-flight operator cancel API; cancellation = coordinator timeout only. |
| Usage accounting | YES (only provider with usage accounting). Per-task: `requested_credit_ceiling` vs `actual_reported_usage` (from stream usage events; null when stream reports none). Per-identity persistent state at `~/copilot-broker/state/identities.json` (observed 2026-09-25 15:27 MDT): `quota_remaining`, `quota_reset_at`, `quota_state` (OK/LOW/EXHAUSTED/STALE/UNKNOWN), `task_count`, `last_success_at`, `last_failure_at`, `consecutive_unknown_failures`. Quota eligibility gate: `remaining >= estimated + safety_reserve(50)`; UNKNOWN/STALE quota fails closed (`quota-model.js:69-94`). Cost model is explicitly an ESTIMATE (`cost-model.js:18-28`): T2=25, T3=100, T4=400 AI credits; no GitHub pricing API. Observed quota unit drift: state says `chat_requests (observed; cost model uses AI credits ESTIMATE)` — the model prices in AI credits while the observed quota unit is chat requests (see Gap G-09). Identity_5/identity_6 exist in state (piging87 + one more) but the registry only authorizes identity_1..4 (`AGENT_PROFILES` in `external_agent_adapter.js:141-181`; see Open Q3). |
| Worktree conventions | `workdir` is REQUIRED per call; comment: "disposable worktree cwd per task" (`cli-runner.js:38-39`). `--allow-all-tools` granted 2026-09-25 because non-interactive `-p` mode auto-denied every tool call (comment, :33-42). No provisioning code found that creates the disposable worktree; convention is documented intent, not enforced mechanism. |
| PII/secrets | `credential-boundary.js`: `buildChildEnv()` scrubs ambient token overrides; `assertNoTokenMaterial()` on evidence and identity records (`broker.js:100-101`). |

### 1b. Hermes (Pig Windows-native, Hermes Agent v0.21.2)

| Aspect | Evidence |
|---|---|
| Callers | `~/workspace/bin/prompt-hermes.sh` (cloud-side; scp prompt file + ssh `wsl -u nolan -- bash /mnt/c/Windows/Temp/hermes-run.sh`); dispatcher path: `~/workspace/orca-remediation/orca_control_loop.js:dispatchHermes` (:310-371) → `~/workspace/orca-remediation/hermes_dispatch.py` → `C:\Users\nolan\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe hermes_cli/main.py -z <prompt>`. Swarm agents (incl. this lane's own machinery) call `prompt-hermes.sh` directly. AGENTS.md (2026-09-25): hermes-run.sh/launcher were lost from `C:\Windows\Temp` and reconstructed. |
| Request shape | One-shot: single prompt string (`hermes.exe -z <prompt> --safe-mode -t <toolsets>`, profile comment `external_agent_adapter.js:101`). `prompt-hermes.sh`: prompt via file (never nested shell quoting), arg or stdin. ORCA path: prompt file path = argv[1] so concurrent dispatchers don't clobber (`hermes_dispatch.py:14-25`). |
| Result shape | Raw model stdout on stdout; exit code mirrors hermes. NO 8-field envelope emitted by the provider itself. ORCA path wraps in rendezvous record `orca-rendezvous/1`: `{schema, attempt_id, work_order_id, objective_id, dispatch_started_at, dispatch_finished_at, timed_out, returncode, stdout, stderr, error}` — atomic write (temp file + os.replace, `hermes_dispatch.py:92-116`). Note: rendezvous is a TRANSPORT record, not a ResultEnvelope (the 2026-09-18 convergence verdict V11). |
| Streaming | NO. Print-at-end: `sys.stdout.write(r.stdout)` only after `subprocess.run` completes (`hermes_dispatch.py:67-75`). ~11s typical (contract §4). |
| Errors | Exit-code contract (`hermes_dispatch.py:83-91`): 0/hermes code = worker outcome; **124** = worker timeout (600s); **125** = dispatcher failure. No structured error taxonomy beyond this. |
| Cancellation | PARTIAL. No cancel API; cancellation = coordinator-side `SIGKILL` after `DISPATCH_TIMEOUT_MS` (`orca_control_loop.js:346-353`). Objective-level durable cancellation exists (`cancel.requested` marker → no new work, `:1064-1074`), but an in-flight Hermes run is killable only by the timeout timer. No heartbeat. |
| Usage accounting | NONE. No token/credit counters anywhere in the Hermes path. Profile notes "Free model (openrouter). No quota risk" (`external_agent_adapter.js:105`). |
| Worktree conventions | Windows-native CWD `C:\Users\nolan`; CANNOT see WSL/cloud paths (verified 2026-09-17: WSL scratch fixture unreadable; profile comment `:98-100`). Work orders must carry input inline, never by file path. |
| Auth | Bearer/token material resolved at process boundary; profile comment in AGENT15 report: scoping is "filesystem blindness only; no sandbox flag" (`AGENT15-CODEX-HERMES-ADAPTER.md:1a`). |

### 1c. Ollama (Pig WSL, `qwen2.5-coder:1.5b`)

| Aspect | Evidence |
|---|---|
| Callers | `~/workspace/bin/prompt-ollama.sh` (cloud-side; scp prompt + runner script, ssh run, scp response back). Contract profile: `~/workspace/orca-workstream-d/external_agent_adapter.js:167-175` (status LIVE). |
| Request shape | Prompt string (arg or stdin); `OLLAMA_MODEL` env override (default `qwen2.5-coder:1.5b`). Prompt travels as `C:/Windows/Temp/ollama-prompt.txt`; runner starts server if needed (`docker start ollama` or `ollama serve`), runs `timeout 600 ollama run <model> < promptfile`. |
| Result shape | Raw stdout of `ollama run`, ANSI-stripped; NO envelope, NO JSON. |
| Streaming | NO. |
| Errors | `scp` failures → "prompt upload failed"/"runner upload failed", exit 1; ssh exit captured as "(run exited $?)". No error taxonomy. |
| Cancellation | WEAK. Runner-side `timeout 600` only; no caller-side timer in `prompt-ollama.sh` (ssh has `ConnectTimeout=25` for connect, not run). No SIGKILL path documented for the caller. |
| Usage accounting | NONE. Only `/api/tags` probed; no `/api/generate` token counts captured (grep: 1 occurrence of `11434/api`, tags only). Contract §4 says evidence SHOULD carry `model, promptTokens, completionTokens` — not implemented by the script. |
| Worktree conventions | None; inline prompt only. |

### 1d. Goose (Pig `~/.local/bin/goose`)

| Aspect | Evidence |
|---|---|
| Callers | `~/workspace/bin/prompt-goose.sh` → Pig `prompt-run goose <b64>`: requires `~/.config/goose/config.yaml` else `NOLAN-AUTH-REQUIRED` (exit 3). `goose run --text <prompt>` with `timeout 150`. `~/.local/bin/prompt-run:21-25`. Goose binary verified present on Pig 2026-09-25. |
| Request shape | Prompt string, base64-wrapped over ssh. |
| Result shape | Raw stdout. |
| Streaming | NO (output captured then printed). |
| Errors | Sentinel string `NOLAN-AUTH-REQUIRED` + exit **3** if no provider configured; `timeout 150` → exit 124 on hang; exit **2** bad usage. |
| Cancellation | `timeout 150` only. |
| Usage accounting | NONE. |
| Worktree conventions | None observed. |

### 1e. OpenCode (Pig `~/.opencode/bin/opencode`)

| Aspect | Evidence |
|---|---|
| Callers | `~/workspace/bin/prompt-opencode.sh` → `prompt-run opencode <b64>`: `opencode run --model ollama/qwen2.5-coder:7b <prompt>`, `timeout 150`. Verified installed on Pig 2026-09-25 (`~/.opencode/bin` has `opencode`). NOTE: the ORCA profile still says opencode is "No headless CLI on the Pig; only OpenCode.exe desktop" (`external_agent_adapter.js:113-116`) — that entry is STALE; superseded by the live CLI (`~/workspace/orca-workstream-d/AGENT_PROFILES.md` header note). |
| Request shape | Prompt string; model pinned `ollama/qwen2.5-coder:7b` (local, no account). |
| Result shape | Raw stdout. |
| Streaming | NO. |
| Errors | Same as prompt-run family: NOLAN-AUTH-REQUIRED exit 3 if Nolan must log in; timeout 150 → 124. |
| Cancellation | `timeout 150` only. |
| Usage accounting | NONE. |
| Worktree conventions | None observed. |

### 1f. Codex (OpenAI Codex CLI on Pig)

| Aspect | Evidence |
|---|---|
| Callers | No dispatcher exists (2026-09-18 verdict V10: grep for `codex exec` returns only profile data strings). Invocation template in profile: `codex exec --ignore-user-config -s read-only --ephemeral --skip-git-repo-check -C <dir> <prompt>` (`external_agent_adapter.js:103-111`). Binary verified present on Pig 2026-09-25 (`/mnt/c/Users/nolan/.codex/bin/wsl/d52321d8cd5e913f/codex`). |
| Request shape | Prompt string, scoped `-C <dir>` working dir. |
| Result shape | Raw stdout (no envelope; never dispatched). |
| Streaming | UNKNOWN (never dispatched in PING machinery). |
| Errors | `blockedExternal` object with time-gated retry (`blockedUntil: 2026-09-17T06:01:00Z`, expired). No live error data. |
| Cancellation | NONE implemented. |
| Usage accounting | NONE. |
| Worktree conventions | Strongest of all providers: `-s read-only` (hard OS-level sandbox), `--ephemeral` session, `--ignore-user-config`, scoped `-C <dir>`. Profile comment calls it "Preferred when quota available." |
| Auth | Nolan-human-initiated only; no work order, no capability grant, no verification on the human path (`AGENT15-CODEX-HERMES-ADAPTER.md:1b`). |

### 1g. Crush (Pig, `crush run -m copilot/gpt-4o-mini`)

| Aspect | Evidence |
|---|---|
| Callers | `~/workspace/bin/prompt-crush.sh` → `prompt-run crush <b64>`: `crush run -m copilot/gpt-4o-mini <prompt>`, `timeout 30`. |
| Request shape | Prompt string. |
| Result shape | Raw stdout. |
| Streaming | NO. |
| Errors | `NOLAN-AUTH-REQUIRED` exit 3 on "No providers configured"; timeout 30 → 124. |
| Cancellation | `timeout 30` only. |
| Usage accounting | NONE (uses Copilot backend but bypasses the broker's accounting entirely — see Gap G-05). |
| Worktree conventions | None observed. |

### 1h. Gemini CLI (Pig `gemini`)

| Aspect | Evidence |
|---|---|
| Callers | `~/workspace/bin/prompt-gemini.sh` → `prompt-run gemini <b64>`: `gemini -p <prompt>`, `timeout 90`. |
| Request shape / result | Prompt string in, raw stdout out. |
| Streaming | NO. |
| Errors | `NOLAN-AUTH-REQUIRED` exit 3 on "Please set an Auth method"/"Do you want to continue". |
| Cancellation | `timeout 90` only. |
| Usage accounting | NONE. |

### 1i. Qwen CLI (Pig, backed by local Ollama)

| Aspect | Evidence |
|---|---|
| Callers | `~/workspace/bin/prompt-qwen.sh` → `prompt-run qwen <b64>`: `qwen --auth-type openai --openai-api-key ollama --openai-base-url http://localhost:11434/v1 --model qwen2.5-coder:7b -p <prompt>`, `timeout 150`. |
| Request shape / result | Prompt string in, raw stdout out. |
| Streaming / errors / cancellation | NO stream; `timeout 150` only; no usage accounting. |

### 1j. Aider

| Aspect | Evidence |
|---|---|
| Callers | `~/workspace/bin/prompt-aider.sh` → `prompt-run aider`: always `need_auth` — aider-chat cannot install on Pig Python 3.14 and always needs a provider key. Exit 3, no execution path. Status: effectively UNREGISTERED/unusable. |

### 1k. Cloud subagents (PRIMARY fleet)

| Aspect | Evidence |
|---|---|
| Callers | The dispatching cloud agent itself (this lane session is a subagent; spawned via the runtime's subagent mechanism). Profile: `external_agent_adapter.js:118-127` (status LIVE), contract §3. |
| Request shape | WorkOrder `input` object embedded inline in the dispatch prompt; `~/workspace/multi-runtime-workorder-contract.md:§3`. No cross-environment file paths. |
| Result shape | Final report text; expected to return the 8-field envelope (worker final report), per contract §4. |
| Streaming | Provider-internal (tool-call streaming visible to the parent runtime); no standardized streaming contract in PING. |
| Errors | Runtime-delivered terminal results; no PING-level error taxonomy observed. |
| Cancellation | Runtime-level (parent can stop a subagent); no PING contract-level cancellation observed. |
| Usage accounting | NONE at PING level (cloud cost is outside PING's view). |
| Worktree conventions | None; isolated session. |

### 1l. Meta AI research worker (Pig headed Chrome, CDP)

| Aspect | Evidence |
|---|---|
| Callers | `~/workspace/pig-fb/meta-ask.js` + `~/workspace/pig-fb/meta-pass.sh`, cron `meta-ai-intel-pass` (6h). (Worker inventory 2026-09-13, §2.) |
| Request shape | Research brief + versioned context pack (sha1[:10]), opened in a new meta.ai tab. |
| Result shape | Raw answer bytes + `.provenance.json` sidecar (`brief_id, timestamp, research_agent=meta-ai, context_pack_version, status=unverified`). |
| Streaming | YES — waits for streamed answer with stable-text detection, up to ~9 min (`meta-ask.js:133`); 60s stall watchdog. |
| Errors | `INFRA` reasons: `pack_build_failed`, `cdp_down_after_relaunch`, `scp_failed`, `worker_failed`, `pull_failed` → exit 2. |
| Cancellation | Stall watchdog only. |
| Usage accounting | NONE. |
| Worktree conventions | Output files land in `hidden_files/meta-ai-intel/`; no execution workspace (research only). |

---

## 2. Existing task/result-like contracts — verdicts

| # | Contract | Location | Verdict | Basis |
|---|---|---|---|---|
| C1 | **WorkOrder envelope (14 required + causation_id) + 8-field ResultEnvelope** | `~/workspace/orca-workstream-d/external_agent_adapter.js` (`authorizeWorkOrder`, `issueWorkOrder`, `verifyResultEnvelope`, `recordVerifiedResult`); schemas `WORKORDER_SCHEMA.json`/`RESULT_SCHEMA.json` (Pig worktree copies); contract `~/workspace/multi-runtime-workorder-contract.md` v1.0.0-draft | **LIVE (worktree)** | Proven live 2026-09-16/17 (harvest-12h); code reads confirm all four adapter functions, closed envelopes (`additionalProperties:false`), deterministic `work_order_id=sha256('workorder:'+taskId)[0:16]` (`external_agent_adapter.js:190-192`). G1 (dual identity) CLOSED in the Pig worktree: `stableWorkOrderId(explicit, taskId)` validates an explicit override as lowercase hex 32-128 chars else falls back to the derived id (Pig `/home/nolan/worktrees/orca-autonomy/ping-runtime/external-agent/external_agent_adapter.js:235-251`, verified via `pigwsl-run.sh` 2026-09-25; compat test `~/workspace/orca-remediation/adapter-compat-test.js`). NOT live in the main PING repo: `ping-runtime/external-agent/` does not exist there; Temporal `executeWorkOrder` is a fabricated-success STUB (`AGENT15` report §1c; convergence verdict V16). |
| C2 | **ORCA 10-state WorkOrder lifecycle + durable attempt layer** | `orca/control-loop/orca_status_model.js`, `objective-runtime.js` (Pig worktree `feature/orca-autonomy`); control loop `~/workspace/orca-remediation/orca_control_loop.js` | **LIVE (worktree)** | PLANNED→AUTHORIZED→QUEUED→RUNNING→EVIDENCE_PENDING→VERIFIED→CLOSED with side exits (verdict V7); attempt recorded BEFORE dispatch, `attempt_id=work_order_id+'-attempt-'+n`, PG advisory lock, durable budget/cancellation (verdict V6; A6-readiness doc confirms commit `6a342dd27` implemented it 2026-09-18). Timeout honesty: `status:failed` envelope, never fabricated success (V8). Crash-safe rendezvous: atomic os.replace drop files (V11; `hermes_dispatch.py:92-116`). G3 (attempt lease/heartbeat) still OPEN — dispatch_started/finished timestamps only, no lease, no heartbeat (see Gap G-03). |
| C3 | **Copilot broker ExecutionResult/evidence contract** | `~/workspace/pig-fb/copilot-broker/src/{broker,cli-runner,quota-model,cost-model,credential-boundary,jsonl-classifier,task-tiers,identity-state}.js` | **LIVE (Pig)** | Full test suite in `test/` (9 test files). Streaming JSONL classification, usage extraction, per-task credit ceiling vs actual, per-identity quota state at `~/copilot-broker/state/identities.json` (observed live 2026-09-25). BUT: the broker's `dispatch()` has no production caller in the workspace — it is reachable only on the Pig; evidence flow back to PING dispatch is undocumented (Gap G-04). |
| C4 | **ORCA rendezvous record `orca-rendezvous/1`** | `~/workspace/orca-remediation/hermes_dispatch.py` | **LIVE (remediation, 2026-09-18+)** | Atomic transport record with attempt/work_order/objective ids, stdout/stderr, returncode, timeout flag. It is a TRANSPORT record, not a ResultEnvelope — envelope extraction (8-field) is the coordinator's job and the `hermes_dispatch.py` print path carries raw stdout, not the envelope (V11, and code read `:59-91`). |
| C5 | **`tools/execution` ExecutionRequest/ExecutionResult (canonical JSON, secret redaction, `authorization.performed=false` marker)** | Referenced by `~/workspace/ping-overnight/multiruntime/EXECUTION_CONTRACT.md` §1 as "main branch" | **DEAD (locally)** | `~/workspace/tools/execution/` does not exist in this workspace. Referenced contract only; no local code to adopt. Mark unverified until read from the main branch. |
| C6 | **`BaseWorker.ts` Task interface (`taskId, missionId, capability, parameters, retryCount`)** | Referenced by EXECUTION_CONTRACT.md as `workers/canonical/BaseWorker.ts` | **PARTIAL (externally referenced)** | Not present locally; shape is compatible with C1 but less constrained (no identity derivation, no verification gate). No local adoption evidence. |
| C7 | **prompt-run family contract (b64 prompt → stdout; exit 2 bad usage; exit 3 NOLAN-AUTH-REQUIRED)** | `~/.local/bin/prompt-run` (Pig), `~/workspace/bin/prompt-*.sh` | **LIVE (Pig)** | De facto standard for goose/opencode/crush/gemini/qwen/aider. Provider set: gemini(90s), qwen(150s), crush(30s), goose(150s), aider(always-auth), opencode(150s). Uniform error sentinel `NOLAN-AUTH-REQUIRED`. No envelope, no usage, no structured errors beyond exit codes. |
| C8 | **Task-shape fragments in convergence specs** | `~/workspace/ping-overnight/multiruntime/EXECUTION_CONTRACT.md` (Mission identity, WorkerRuntime `register/dispatch`, MissionRuntime state machine) | **PROPOSED** | Reuse mapping + contract text only; no local implementation found. Compatible with C1/C2 but superseded by them in detail. |

No PING-native contract literally named `AgentTask`/`AgentResult` exists: the only hits in the workspace are third-party repos (autogen `asyncio.create_task` variables, crewai evaluation dicts) — not PING contracts.

---

## 3. Proposed minimal AgentTask/AgentResult contract (from observed shapes only)

Derivation rule: every field below appears verbatim in ≥2 live code paths, or in exactly one path with no contradiction. Fields NOT observed are listed as OPEN. No freezing from docs alone: anything observed only in a spec (not in code or live state) is marked `[spec-only]`.

### AgentTask (the dispatchable unit)

```jsonc
{
  // --- identity (observed: C1 adapter + C2 attempt layer) ---
  "task_id": "string, non-empty; caller-owned stable task key, NEVER run/PID/wall-clock derived",
  "work_order_id": "string, lowercase hex, 32-128 chars when caller-supplied (validated, never minted) else sha256('workorder:'+task_id)[0:16] — stableWorkOrderId()",
  "attempt": "integer >= 1; attempt copy wo={...workOrder, attempt:n} goes to transport AND verification",
  "correlation_id": "string; threading root",
  "causation_id": "string|null",

  // --- authority (observed: C1 authorizeWorkOrder) ---
  "agent_id": "string; registered profile key only (unknown => denied, fail-closed)",
  "capability": "string; must be in the agent profile's allowedCapabilities",
  "namespace": "string; ^(core|tenant)::[a-z0-9_.-]+$",
  "principal": "constant 'ping:external-agent-adapter'; issued, never self-asserted",
  "constraints": {
    "read_only": true, "allowed_workspace": "string (required key per schema)",
    "no_network": true, "no_writes": true,
    "no_canonical_events": true,   // hard-required
    "no_mission_state_writes": true // hard-required
  },

  // --- payload (observed: prompt-*.sh, hermes_dispatch.py, broker) ---
  "input": "object; MUST be inline — no cross-environment file paths (Hermes cannot see WSL/Pig paths; cloud subagents cannot see Pig paths)",
  "context_pack_id": "string; REQUIRED non-empty by schema, but existence/authorship is NOT verified at issuance today (see Gap G-06) — treat as echo-binding only",

  // --- scheduling (observed: C1, C2, broker) ---
  "deadline": "ISO-8601 absolute cutoff; enforced at verification (verifiedAt > deadline => invalid, non-retryable)",
  "timeout_ms": "[OPEN] — observed per-provider (600000 hermes/ollama, 150000 goose/opencode/qwen, 90000 gemini, 30000 crush, 300000 copilot default) but NOT part of any shared contract; deadline is the contract's only temporal boundary",
  "result_path": "string; PING-owned persistence path; executor never writes here (coordinator captures stdout and writes it)",
  "mission_id": "string; REQUIRED non-empty by schema, but ORCA mints correlation labels, not MissionRuntime missions (Gap G-07) — provenance label needed"
}
```

### AgentResult (the returnable unit)

```jsonc
{
  // --- binding echoes (observed: C1 verifyResultEnvelope) ---
  "work_order_id": "must echo issued work_order_id exactly",
  "context_pack_id": "must echo issued context_pack_id exactly",
  "agent_id": "authorized == invoked == result agent, all three must match",
  "capability": "must echo issued capability exactly",

  // --- outcome (observed: C1; broker classifications; hermes exit codes) ---
  "status": "'completed' | 'failed' ONLY",
  // completed => output non-null AND error null
  // failed    => output null AND error non-empty string
  "output": "any|null",
  "error": "string|null",
  "evidence": "OPEN object; agent-reported, not canonical truth. Observed keys per family: started_at, ended_at, host, capability_performed + {prompt_length, response_length} (hermes) | {model} (ollama; promptTokens/completionTokens spec-only, unimplemented) | {identity_used} (copilot)",

  // --- verification metadata (observed: C1, C2, C3) ---
  "verified_at": "ISO; must be <= deadline",
  "result_id": "sha256('external-result:' + stableStringify({work_order_id, mission_id, task_id, attempt, agent_id, capability, context_pack_id, namespace})) full 64-hex — binds attempt, so retries yield distinct identities"
}
```

### Explicit OPEN fields (not observed — do not freeze)

- `timeout_ms` / lease / heartbeat: no attempt-level lease or heartbeat exists anywhere (Gap G-03). `deadline` is the only temporal boundary; heartbeats are NOT evidence-backed.
- `usage` / token counts: observed ONLY for Copilot (`requested_credit_ceiling`, `actual_reported_usage` from stream events). No provider reports prompt/completion tokens in the envelope today. A `usage` block would be a new design, not a harvest.
- `streaming` protocol: observed as JSONL-on-stdout (Copilot) and in-browser stable-text (Meta AI); no shared streaming envelope.
- `priority`, `routing hints`, `budget reservation id`: not observed in any live path (budget lives outside the envelope per contract §1A, dispatcher-side only).
- `workspace` provisioning: "disposable worktree cwd" is a comment in `cli-runner.js:38-39`, no provisioning code — not contract-ready.
- `cancellation_reason` taxonomy: only TIMEOUT vs operator marker exist; no shared vocabulary.

---

## 4. Gaps (with evidence)

| ID | Gap | Evidence |
|---|---|---|
| G-01 | **No usage accounting for 8 of 9 providers.** Only Copilot reports usage (`actual_reported_usage`, per-identity quota state). Hermes, Ollama, Goose, OpenCode, Codex, Crush, Gemini, Qwen, cloud subagents: zero token/credit counters. | Grep across `bin/prompt-*.sh` and `~/.local/bin/prompt-run`: no token/eval-count capture (ollama runner probes only `/api/tags`). `identities.json` is the sole usage store in the ecosystem. |
| G-02 | **No contract-level cancellation.** Every provider's "cancel" is a timeout timer (`SIGKILL` at 600s/300s/150s/90s/30s per provider). No heartbeat, no mid-flight operator cancel API, no `cancellation_reason` vocabulary. Objective-level durable cancel exists (`cancel.requested` marker → no new work; `orca_control_loop.js:1064-1074`) but cannot stop an in-flight run except via the timeout timer. | `hermes_dispatch.py:57-91`; `cli-runner.js:55-59`; `orca_control_loop.js:346-353`. |
| G-03 | **No attempt lease / heartbeat.** Attempt records carry `dispatch_started_at`/`dispatch_finished_at` (rendezvous) and `dispatch_pid`; nothing specifies a lease, staleness threshold, or heartbeat fields. Crash reconciliation = coordinator timeout + rendezvous, which works but is unspecified. | 2026-09-18 verdict U1; re-checked: no lease/heartbeat in `orca-remediation/orca_control_loop.js` or broker code today. |
| G-04 | **Copilot broker has no production dispatcher.** `broker.dispatch()` is tested (9 test files) and deployed on the Pig, but no caller in the workspace invokes it; the four WorkOrder families' evidence flow "broker response → dispatcher wraps in 8-field envelope" has no implementing dispatcher in code. The live `identities.json` shows identities 1-4 active (task_counts 13/10/1/2) so SOME caller exists outside the workspace, or calls happened historically. | Grep `pig-fb/`: only `broker.js`/`cli-runner.js` reference `runCopilotTask`. |
| G-05 | **Crush bypasses broker accounting.** `prompt-run crush` calls `crush run -m copilot/gpt-4o-mini` — it spends from the Copilot identity pool while the broker's quota model, identity state, and per-task ceilings never see it. | `~/.local/bin/prompt-run:17-20` vs `broker.js` quota gate. |
| G-06 | **ContextPack binding is echo-only.** `issueWorkOrder` requires only a non-empty `context_pack_id` string; no issuance-time existence/authorship check. ORCA mints synthetic ids (`orca-context-<objective16>`). 2026-09-18 verdicts F4/U2; unchanged today. | Adapter code read (no pack lookup in `issueWorkOrder`); convergence doc F4/U2. |
| G-07 | **mission_id provenance is unlabeled.** Schema requires `mission_id`, but the ORCA loop mints ORCA-scoped correlation labels, not MissionRuntime missions; the echo binding then asserts a mission provenance the id doesn't carry. | 2026-09-18 verdict G9; `orca_control_loop.js` objective ids are sha256('objective:'+...) — labels, not missions. |
| G-08 | **Opencode profile is stale.** Registry says "No headless CLI on the Pig" (`external_agent_adapter.js:113-116`), but the live CLI `~/.opencode/bin/opencode` exists and `prompt-opencode.sh` dispatches it. Any `authorizeWorkOrder` against the `opencode` profile grants with a wrong capability set (`allowedCapabilities: []` + blockedExternal string) — and the Pig-side profile (the live one) hasn't been re-read this lane for whether it was updated. | Profile comment vs `prompt-run:26-29` + Pig check 2026-09-25. |
| G-09 | **Quota unit drift in broker accounting.** Live `identities.json` reports `quota_unit: "chat_requests (observed; cost model uses AI credits ESTIMATE)"` — the cost model prices tasks in AI credits (T2=25/T3=100/T4=400) while the observed quota is denominated in chat requests. Eligibility compares `quota_remaining` (chat requests) against `estimated + reserve` (AI credits). Unit mismatch is unaddressed in code. | `~/copilot-broker/state/identities.json` (Pig, 2026-09-25); `cost-model.js:22-28`; `quota-model.js:84-90`. |
| G-10 | **Temporal `executeWorkOrder` is a fabricated-success stub.** Any mission routed through `mission_activities.js` returns canned success without executing. Cited as G7 in the convergence doc; the stub is still present per the AGENT15 report §1c (2026-09-23). | Verdict V16; `AGENT15-CODEX-HERMES-ADAPTER.md:1c`. |
| G-11 | **No envelope for 7 of 9 providers.** Hermes, Ollama, Goose, OpenCode, Crush, Gemini, Qwen return raw stdout only; the 8-field ResultEnvelope exists only where a coordinator wraps it (ORCA path for Hermes; contract-mandated for cloud subagents). Envelope extraction (parse stdout → envelope) is coordinator-side convention, not a provider contract. | Code reads: all `prompt-*.sh` print raw stdout; rendezvous record ≠ envelope (V11). |
| G-12 | **Aider is registered-by-script but permanently unusable** (always exits NOLAN-AUTH-REQUIRED; aider-chat won't install on Pig Python 3.14). It occupies a provider slot in `bin/` with no execution path. | `prompt-aider.sh` comment; `prompt-run:21-22` (`need_auth`). |
| G-13 | **`tools/execution` (ExecutionRequest/ExecutionResult) is referenced but absent locally** — cannot be adopted or falsified from local evidence. | `~/workspace/tools/execution/` missing; EXECUTION_CONTRACT.md §1. |

### P0s found in FYD product code
None observed by this lane. (This lane reads provider surfaces, not FYD product code.)

---

## 5. Batched open questions (with evidence)

**Q1. Is the `identities.json` identity_5/identity_6 vs registry identity_1..4 divergence known?** Live state shows `identity_5` (piging87) and a truncated `identity_6` with ACTIVE/OK quota 200, while the converged registry authorizes only identity_1..4 (`external_agent_adapter.js:141-181`; broker `DEFAULT_IDENTITY_ID='identity_1'`, `broker.js:23`). If 5/6 spend quota outside the fail-closed profile list, the broker's authorization story has a live hole. Evidence: Pig `~/copilot-broker/state/identities.json` (2026-09-25 15:27 MDT).

**Q2. What spends Copilot quota outside the broker, and is that sanctioned?** G-05 (Crush on `copilot/gpt-4o-mini`) plus `identities.json` task_counts (13/10/1/2 across identities 1-4) with no workspace caller of `broker.dispatch()` (G-04) implies either an off-workspace dispatcher or historical runs. Evidence: `prompt-run:17-20`; broker grep results.

**Q3. Should the minimal AgentTask freeze `deadline` as the ONLY temporal boundary, or adopt per-provider `timeout_ms` values?** Observed timeouts are 600s (Hermes, Ollama), 300s (Copilot default), 150s (Goose, OpenCode, Qwen), 90s (Gemini), 30s (Crush). None are in any shared contract; only `deadline` is. Freezing them would be design, not harvest. Evidence: table §1.

**Q4. ContextPack issuance gate: compiler-derived-or-registry-verified (convergence G2 proposal) — adopt as a hard gate?** Today the binding is echo-only (G-06); `ContextCompiler` exists in the worktree (V13) but the ORCA path mints synthetic ids. This is a design decision, not a harvestable fact. Evidence: adapter code (no lookup); V13/V14.

**Q5. `mission_id` provenance label: require MissionRuntime-backed missions, or add a `mission_kind: mission|correlation_label` field?** The echo binding currently asserts provenance the id doesn't carry (G-07). Design decision for the parent. Evidence: G9 verdict; `orca_control_loop.js` id derivation.

**Q6. CRX harvest ideas to adopt?** The mandated `/home/nolan/crx-swarm/crx-runtime-main` path does not exist on this machine (ls empty 2026-09-25). Goose's permission model exists locally at `~/workspace/crx-autonomous-missions/repos/goose/crates/goose/src/permission/` (permission_judge, permission_inspector, permission_store) — ideas-only candidates: (a) agents-are-workers: Goose's permission JUDGE is a separate component from the executor; (b) bounded capability contracts: Goose permission store = per-tool allow/deny data, parallel to AGENT_PROFILES; (c) proposal != execution: Goose's judge/inspector split mirrors the broker's classify-before-dispatch. None are imported; all would need mapping to the WorkOrder constraints model. Evidence: paths above; CRX TOKEN-ECONOMICS.md documents campaign-level (not per-call) token accounting — no per-provider usage model to harvest there.

**Q7. Should Aider's slot be removed from `bin/` and any registry, and should the stale opencode profile row be corrected?** Aider can never execute (G-12); the opencode profile contradicts the live CLI (G-08). Both are small cleanups; Aider's removal needs Nolan's call only if anything depends on the slot (nothing found). Evidence: G-08, G-12.

---

## 6. Verdict summary

- **DONE.** Real provider surface mapped for 12 surfaces (9 script-dispatched + Copilot broker + cloud subagents + Meta AI worker), all shapes cited to file:line or observed live state.
- **Strongest live contracts:** C1 (WorkOrder/ResultEnvelope, Pig worktree — G1 identity fix verified landed) and C3 (Copilot broker — streaming, usage, quota, tests). C2 (ORCA attempt layer) is the strongest durable-execution model. C5/C6 are dead/externally-referenced locally.
- **Minimal AgentTask/AgentResult** (§3) is derived from observed shapes only; six fields explicitly OPEN (no heartbeat, no token usage, no streaming protocol, no priority/budget, no workspace provisioning, no cancel taxonomy).
- **13 gaps** filed with evidence; the sharpest: no usage accounting for 8/9 providers (G-01), no contract cancellation (G-02), Copilot broker with no production dispatcher (G-04), Crush quota bypass (G-05), quota unit drift (G-09), fabricated Temporal stub (G-10).
- **7 batched questions** for the parent; no interruption of Nolan.
- Constraints honored: no worktree files touched (read-only `pigwsl-run.sh` greps only), no builds, no test runs, no FYD lane disturbance, no commits/pushes, no secret reads.
