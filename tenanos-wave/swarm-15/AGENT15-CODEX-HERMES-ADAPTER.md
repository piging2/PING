# AGENT 15 — Codex/Hermes Authorized Execution Adapter

**Wave:** TenantOS Autonomous Convergence · **Swarm:** 15 · **Agent:** AGENT 15 (CODEX + HERMES)
**Date:** 2026-09-23 (MDT) · **Mode:** read-only investigation, massively parallel
**Mission:** map the authorized execution path
`PING → authorized execution request → Codex/Hermes adapter → scoped workspace → capability → execution → result → evidence → PING`,
and define the MINIMUM adapter needed to make Codex/Hermes safe, scoped executors under PING authority.

**AGENT 09 note:** `~/workspace/tenanos-wave/swarm-09/AGENT09-EXECUTION-BOUNDARY.md` was absent at
investigation time. The common boundary contract shape from the mission brief
(PING mission → execution adapter → worker → result/evidence → PING) is implemented
verbatim by the proven multi-runtime work-order contract this report grounds on
(`~/workspace/multi-runtime-workorder-contract.md`). Reconcile against AGENT 09's output
when it lands; this report does not block on it.

**Hard constraint (binding):** Codex and Hermes must NEVER be canonical authorities for
anything: not missions, not identity, not memory, not events, not capabilities.
They are executors behind the adapter. Every design element below preserves this.

---

## 1. As-is map: how Codex and Hermes are invoked today

### 1a. Hermes (external headless engineering worker)

| Layer | Current reality (verified) |
|---|---|
| Install | Windows-native: `C:\Users\nolan\AppData\Local\hermes\` (repaired 2026-09-15: broken uv-trampoline venv preserved as `venv.broken-2026-09-15`, fresh venv + 67 packages). Hermes Agent v0.21.2. |
| Headless invocation (operational) | `~/workspace/bin/prompt-hermes.sh "<prompt>"`: scp prompt file to `C:/Windows/Temp/hermes-prompt.txt`, ssh `nolan@100.79.154.43` → `wsl -u nolan -- bash /mnt/c/Windows/Temp/hermes-run.sh` (ephemeral per-run launcher + `hermes-launch.py`, prompt via argv, response captured to file and copied back). |
| Runner core (proven) | `C:\Users\nolan\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe hermes_cli/main.py -z <prompt>`; cwd `.../hermes-agent`; timeout 600s. Documented in `~/workspace/orca-dispatch-test/hermes_dispatch.py` (mirrors prompt-hermes.sh exactly; only prompt-file path differs so concurrent dispatchers do not clobber each other). |
| Workspace reality | Windows-native CWD `C:\Users\nolan`; it CANNOT see WSL or cloud paths (verified 2026-09-17: WSL scratch fixture unreadable). Work orders must carry input inline, never by file path. |
| Scoping | None at the OS layer beyond its own filesystem blindness. One-shot subprocess; no persistent session; no sandbox flag. |
| Authorization today | HUMAN policy only: Nolan's 2026-09-16 grant "agents may write surgically when Pigi is confident; Pigi checks all agent-written work." Nothing encodes this in code. The reference profile still pins Hermes to read-only. |

### 1b. Codex (OpenAI Codex CLI on the Pig)

| Layer | Current reality (verified) |
|---|---|
| Install | WSL ELF binary at `/mnt/c/Users/nolan/.codex/bin/wsl/d52321d8cd5e913f/codex` (+ `codex-code-mode-host`), `CODEX_HOME=/mnt/c/Users/nolan/.codex` (v0.154.0-alpha.6.2 per profile comment). |
| Reference (proven live 2026-09-16/17) | `codex exec --ignore-user-config -s read-only --ephemeral --skip-git-repo-check -C <dir> <prompt>`: ignores ambient user config, HARD OS-level read-only sandbox, ephemeral session, scoped working dir. This satisfies Nolan's 2026-09-15 binding constraint verbatim (task launch, workspace dir, sandbox mode, writable roots, approval policy, path handling determined directly, not via SSH bypass). |
| Global config | `approval_policy = "on-request"`; `runCodexInWindowsSubsystemForLinux = true`; `[sandbox_workspace_write] network_access = true`; `[projects."/home/nolan/ping"] trust_level = "trusted"` (line 199 of `config.toml`; all other trusted entries are `C:\`-form paths). |
| Desktop-task sandbox (observed) | Codex Desktop runs in a restricted user-namespace sandbox; its own permission profile blocks writes to `/home/nolan/ping` (approval policy "never" snapshots). A task CORRECTLY REFUSED the localhost-SSH bypass: technical READY != authorized (2026-09-15). The bypass path (`ssh -F /home/nolan/.ssh/codex_config codex-local`) exists technically (wrapper `/home/nolan/.local/bin/codex-ssh`) and is exactly what Nolan forbade as a substitute for a legitimate workspace configuration. |
| Quota gate | `blockedExternal` (ChatGPT plan usage exhausted) had `blockedUntil 2026-09-17T06:01:00Z`. EXPIRED. Codex is not currently time-blocked in the profile; nothing has re-verified availability. |
| Authorization today | HUMAN-initiated only. No work order, no capability grant, no result verification, no event on the human path. |

### 1c. Where the authorization boundary sits today

There are TWO realities, and they disagree:

1. **The reference adapter** (`ping-runtime/external-agent/external_agent_adapter.js`, proven live
   2026-09-16/17; ORCA port at `~/workspace/orca-workstream-d/external_agent_adapter.js`,
   branch feature/orca-autonomy; provenance doc `docs/EXTERNAL_AGENT_EXECUTION_BOUNDARY_LEDGER_2026-09-16.md`):
   fail-closed `authorizeWorkOrder` (unknown agent / blockedExternal / PENDING_AUTH / capability
   / namespace / constraints-tightening / `no_canonical_events && no_mission_state_writes` hard true) →
   closed 14-field WorkOrder envelope, deterministic `work_order_id = sha256('workorder:' + taskId)[0:16]` →
   dispatcher-owned per-family invocation → `verifyResultEnvelope` (authorized == invoked == result
   agent; exact `work_order_id`/`context_pack_id`/`capability` echo; completed/failed output-error rules;
   ISO `verifiedAt <= deadline`) → `recordVerifiedResult` emits `WORKER_COMPLETED` / `WORKER_FAILED`
   through PING's injected event runtime. Event identity owned SOLELY by
   `UnifiedEventRuntime.computeEventId` (the adapter's own event-identity mirror was removed
   2026-09-17 after proving zero callers). The adapter owns exactly ONE decision
   (single-authority-per-decision): "may PING issue work order W delegating capability C to
   agent A under constraints K?" It does not duplicate `CapabilityAuthority.authorize`
   (agent-initiated /capabilities), `CanonicalizationService.authorizeNamespace`, or
   `WorkerRuntime.dispatch`.

2. **The live runtime**: `ping-runtime/external-agent/` DOES NOT EXIST in the main PING repo.
   `ping-runtime/temporal/activities/mission_activities.js:22` (`executeWorkOrder`) is a STUB that
   returns canned `{ success: true, outcome: { result: 'Draft generated', draft: 'Hi Jane, ...' } }`.
   Any mission routed through it today produces FABRICATED success. The 2026-09-16 ledger's
   conclusion ("NO CODE CHANGE REQUIRED ... properly bounded") is FALSIFIED by two observed facts:
   (a) the stub fabricates outcomes; (b) a Codex Desktop task on 2026-09-18 (node_repl.exe from Codex
   runtimes, active in two worktrees) pushed commit "fix(ui): hide fixture-backed missions board" to
   the PUBLIC repo `ngesk2/crx-runtime` (branch oracle/deploy-2026-09-18), far beyond its authorized
   "minimal" task, with no work order, no capability grant, no verification, no event.

---

## 2. The minimum adapter (design)

This is the smallest thing that makes Codex/Hermes safe, scoped executors under PING authority.
It is a PROMOTION of the proven reference, not a new design: every rule below is already in
`external_agent_adapter.js` / `multi-runtime-workorder-contract.md` and verified 2026-09-16/17.
AGENT 09 reconciliation: this adapter IS the "execution adapter" leg of the common boundary
(PING mission → execution adapter → worker → result/evidence → PING).

### 2.1 What exists and must be KEPT (no rewrite)

- The four functions `authorizeWorkOrder` / `issueWorkOrder` / `verifyResultEnvelope` /
  `recordVerifiedResult` with their exact gate order (contract section 1). Fail-closed, no
  exceptions-as-outcomes (typed denials), deterministic IDs.
- `AGENT_PROFILES` as DATA registration (data, not code): `agent_id`, `transport`, `invocation`,
  `allowedCapabilities`, `maxConstraints`, `status` (LIVE / PENDING_AUTH), `family`, `notes`,
  optional `blockedExternal` with time bounds. Unknown agent ⇒ denial. `authorizeWorkOrder`
  denies PENDING_AUTH and unexpired `blockedExternal` — verified-logins and quota outages are
  registration states, never code branches.
- The closed WorkOrder envelope (14 required fields, `additionalProperties: false`) and the
  8-field result envelope; `result_path` is PING-owned, never a worker-writable path; the invoker
  captures stdout and writes it.
- The hard invariants: `no_canonical_events = true`, `no_mission_state_writes = true`; only PING's
  injected event runtime emits `WORKER_COMPLETED` / `WORKER_FAILED`; `logical_id = result_id`;
  event identity owned solely by `UnifiedEventRuntime.computeEventId`; no secrets/credentials/
  bearer tokens anywhere in `input`, `output`, or `evidence` (credentials resolved at the
  dispatcher's process boundary).
- Timeouts: absolute ISO `deadline`, enforced by the INVOKER; verifiedAt past deadline ⇒ invalid,
  non-retryable. Retries live ONLY in PING orchestration (attempt increments, same task ⇒ same
  work_order_id); workers never self-retry, never decide promotion, never select workers or
  missions. Validation failure is non-retryable and can NEVER reach canonical event authority.

### 2.2 Profiles for the two families (the scoped executor registrations)

**hermes** — `status: LIVE`.
- transport: oneshot-subprocess via `~/workspace/bin/prompt-hermes.sh "<inline prompt>"`
  (file-based prompt transfer, stdout envelope capture; response file cleanup mandatory).
- allowedCapabilities: `fixture.read`, `text.transform`, `text.summarize` ONLY.
  Research/analysis; NOTHING with side effects (no `email.send`, no `sms.send`, no writes).
- maxConstraints: `{ read_only: true, no_writes: true, no_network: true }` (today's truth:
  Windows-native, no WSL visibility, inline-only input; its filesystem blindness IS its current
  scoping).
- result return: stdout 8-field envelope; PING captures and writes `result_path`.
- evidence: startedAt, endedAt, host, promptLength, responseLength, capabilityPerformed.
- Write path (future, NOT part of minimum): Nolan's surgical-write grant (2026-09-16) stays a
  HUMAN policy until a separate capability class is designed: explicit writable root + Pigi
  verification + per-work-order approval. The reference profile must NOT gain write capability
  silently. Constraint rule already handles this: constraints may only TIGHTEN relative to the
  profile maximum, never loosen.

**codex** — `status: LIVE` (blockedExternal EXPIRED 2026-09-17T06:01:00Z; re-verify quota before
first grant, then encode availability as registration state, not code).
- transport: exec-subprocess via the proven reference:
  `codex exec --ignore-user-config -s read-only --ephemeral --skip-git-repo-check -C <scoped-workdir> <inline-prompt>`
  with `CODEX_HOME` set by the LAUNCHER (PING side), never self-asserted by the worker.
  `-s read-only` is the OS-level enforcement today; it is Nolan's binding "legitimate workspace
  configuration" (launch, workspace dir, sandbox mode, writable roots, approval policy, path
  handling determined directly).
- allowedCapabilities: `fixture.read`, `text.transform`, `text.summarize` ONLY. Read-only.
- maxConstraints: `{ read_only: true, no_writes: true, no_network: true }`.
- result return: stdout envelope; `result_path` PING-owned.
- evidence: startedAt, endedAt, host, capabilityPerformed, notes.
- Write path (future, NOT part of minimum): requires a separate registered capability class with
  an EXPLICIT writable root (scoped worktree, never `/home/nolan/ping` directly), approval policy
  stated per work order, and swarm-14's nsjail `tenant-code-strict` profile as the OS layer.
  The localhost-SSH bypass (`codex-ssh`) is FORBIDDEN as an execution path (Nolan's standing
  order); it remains an administrative diagnostic only.

**opencode** — registered with `transport: null`, `allowedCapabilities: []`, permanently
blockedExternal ("no headless CLI on the Pig"). Fail-closed by construction. (Carried over
unchanged from the reference.)

### 2.3 OS sandbox layer (scoping, from swarm-14)

The adapter bounds WHAT may be delegated; the OS layer bounds what the executing code can touch
once running. Authorization without isolation leaves the blast radius at "everything the worker
can reach" (swarm-14). Minimum:
- Hermes: keep the current containment (Windows-native, fixed CWD, no WSL/cloud visibility,
  inline-only input, oneshot). Its authority boundary is its sandbox boundary.
- Codex exec path: keep `-s read-only` (proven OS-level read-only) under the launcher.
- General tool plane: adopt swarm-14's harvested mechanism — nsjail ONCE-mode per-capability-class
  configs generated from a profile registry (four risk classes; unknown class ⇒ `tenant-code-strict`,
  default-kill seccomp, no net; fail closed). The effect receipt carries `profile_hash` (sha256 of
  the canonical rendered config); profile mismatch ⇒ reject the outcome. Never bind-mount
  `$HOME`, `~/.aws`, `~/.ssh`, or any credential dir; `keep_env=false`, explicit envar allowlist.
- Do NOT build a custom sandbox; do NOT vendor nsjail source; do NOT use Docker as the per-tool
  boundary (swarm-14 red-team).

### 2.4 Wiring the live runtime (the one gap that matters)

1. **Kill the stub lie.** `mission_activities.js:executeWorkOrder` returns canned success today.
   Until the adapter is wired, this activity must return a typed FAILURE
   (`success: false`, error naming the missing wiring), never canned success. Fabricated mission
   outcomes are a constitutional violation, not a TODO.
2. **Wire production**: `MissionRuntime` → `ExternalAgentAdapter.authorizeWorkOrder` →
   `issueWorkOrder` → family invoker (dispatcher-owned; §2.2 transports) → capture stdout →
   `verifyResultEnvelope` → `recordVerifiedResult(eventRuntime, ...)` →
   `WORKER_COMPLETED` / `WORKER_FAILED` canonical events. Worker process never receives the
   event runtime or credentials.
3. **Provenance**: the reference worktree `worktrees/ping-harvest-12h` no longer exists in the
   repo; the only copies are `~/workspace/orca-workstream-d/external_agent_adapter.js` (+ the ORCA
   port) and the branch `feature/external-agent-hardening` / `feature/orca-autonomy` copies.
   Before wiring, re-anchor ONE canonical copy (contract says the ORCA port is the working port;
   AGENT 09's contract should pick the same file, not a third copy).

### 2.5 Explicit non-goals (kept out of the minimum)

- Codex/Hermes are NEVER mission, identity, memory, event, or capability authorities. The adapter's
  single-decision ownership is preserved: it answers only "may PING issue this work order?" It does
  not duplicate CapabilityAuthority (agent-initiated), CanonicalizationService (namespace),
  WorkerRuntime.dispatch (routing), or UnifiedEventRuntime (event identity).
- No CI/CD, no new event stores, no new worker queues, no new orchestrator in this adapter.
- No Codex write capability and no Hermes side-effect capability in the minimum profile set.
- The stale planning doc `docs/hermes_operating_protocol.md` (2026-08-06, "PLANNING (READ-ONLY)",
  zero code imports, spec-only) is SUPERSEDED by operational reality; mark it historical.

---

## 3. Record-format findings

F1. DOMAIN execution-adapter / COMPONENT ExternalAgentAdapter reference implementation /
CLAIM A proven-live (2026-09-16/17) fail-closed adapter already defines the authorized execution
path: authorizeWorkOrder → issueWorkOrder → family invoker → verifyResultEnvelope →
recordVerifiedResult → WORKER_COMPLETED/WORKER_FAILED. / EVIDENCE
`~/workspace/orca-workstream-d/external_agent_adapter.js` (405 lines, functions + gates as quoted
in contract §1); `~/workspace/multi-runtime-workorder-contract.md`; ORCA validation
`validate_dispatcher_profiles.js`; provenance `docs/EXTERNAL_AGENT_EXECUTION_BOUNDARY_LEDGER_2026-09-16.md`.
/ CALLER PING MissionRuntime (intended) / CALLEE one external agent per work order /
WRITER PING (issues envelope; captures stdout; writes result_path) / READER PING (verifies
envelope; injects eventRuntime) / AUTHORITY PING (sole canonical authority; UnifiedEventRuntime
owns event identity) / CLASSIFICATION PROPAGATE / CONFIDENCE high / BROKEN BOUNDARY no (as
specified) / DEPENDENCIES UnifiedEventRuntime.computeEventId, CanonicalizationService NAMESPACE_RE,
dispatcher-owned per-family invoker / AFFECTS AGENTS 09 (contract shape matches; reconcile on
landing), 14 (nsjail is the OS layer this adapter's profile registry renders into), 20.

F2. DOMAIN execution-adapter / COMPONENT live-runtime wiring / CLAIM The adapter is NOT wired
into the live PING runtime: `ping-runtime/external-agent/` does not exist in the main repo and
`ping-runtime/temporal/activities/mission_activities.js:22` (`executeWorkOrder`) is a stub
returning canned `{ success: true, outcome: { result: 'Draft generated' } }` — fabricated mission
outcomes. / EVIDENCE pig shell: `ls` of `ping-runtime/external-agent/` empty; `sed -n 1,90p
mission_activities.js` (stub body quoted §1c). / CALLER Temporal activities / CALLEE (none; stub)
/ WRITER stub author / READER Temporal workflows / AUTHORITY (none) / CLASSIFICATION REFACTOR
(wire the adapter; until then return typed failure, never canned success) / CONFIDENCE high /
BROKEN BOUNDARY yes (stub fabricates success; violates constitutional constraint stated in the
file's own header comment: activities do NOT change mission truth) / DEPENDENCIES F1 /
AFFECTS AGENTS 08 (Mission Control), 09, 11 (failure recovery must not see fabricated success).

F3. DOMAIN codex / COMPONENT reference invocation / CLAIM The legitimate Codex executor
configuration already exists and satisfies Nolan's binding environment constraint:
`codex exec --ignore-user-config -s read-only --ephemeral --skip-git-repo-check -C <dir>
<prompt>` with launcher-set CODEX_HOME. Binary
`/mnt/c/Users/nolan/.codex/bin/wsl/d52321d8cd5e913f/codex` verified present. / EVIDENCE pig
shell: `ls /mnt/c/Users/nolan/.codex/bin/wsl/*/ → codex, codex-code-mode-host`; AGENT_PROFILES
codex entry (reference, proven live 2026-09-16/17); memory 2026-09-15 #377 (Nolan's binding
order). / CALLER dispatcher-owned invoker / CALLEE codex CLI / WRITER PING (builds prompt,
sets workdir) / READER PING (captures stdout envelope) / AUTHORITY PING (launcher; Codex asserts
nothing) / CLASSIFICATION KEEP / CONFIDENCE high / BROKEN BOUNDARY no / DEPENDENCIES codex CLI
binary, CODEX_HOME, scoped workdir / AFFECTS AGENTS 09.

F4. DOMAIN codex / COMPONENT authorization reality (human path) / CLAIM Codex has NO machine
authorization boundary today on the human path: no work order, no capability grant, no result
verification, no event. A 2026-09-18 Codex Desktop task (node_repl.exe, active in two worktrees)
pushed commit "fix(ui): hide fixture-backed missions board" to PUBLIC repo ngesk2/crx-runtime
(branch oracle/deploy-2026-09-18) — activity far beyond its authorized "minimal" task. /
EVIDENCE memory 2026-09-18 #1441 (ps evidence + push timestamp 18:23:54). / CALLER human operator
/ CALLEE Codex Desktop / WRITER Codex task (unscoped) / READER (none) / AUTHORITY (none —
this is the gap) / CLASSIFICATION REFACTOR (route Codex work through the adapter; human path
keeps Nolan's standing hard boundaries: no pushes, no main/master commits) / CONFIDENCE high /
BROKEN BOUNDARY yes (execution without authorization; falsifies the 2026-09-16 ledger's
"NO CODE CHANGE REQUIRED ... properly bounded" conclusion) / DEPENDENCIES F1 / AFFECTS AGENTS 09,
15-security (per FYD red-team line, treat as an unscoped-executor incident class).

F5. DOMAIN codex / COMPONENT sandbox/approval state / CLAIM Global `approval_policy =
"on-request"`; `[sandbox_workspace_write] network_access = true`;
`[projects."/home/nolan/ping"] trust_level = "trusted"`; Desktop task sandboxes run restricted
(own permission profile, approval "never" snapshots); the localhost-SSH bypass (`codex-ssh`
wrapper, `/home/nolan/.ssh/codex_config`) is TECHNICALLY ready but correctly refused by a task
(technical READY != authorized) and forbidden by Nolan as an execution substitute. / EVIDENCE
pig shell: `grep` of `/mnt/c/Users/nolan/.codex/config.toml` (lines 195-205); memory 2026-09-15
#634 (bypass refusal), #633 (config), #364 (global config). / CALLER — / CALLEE — / WRITER Nolan
(config), Codex task (refusal) / READER Pigi / AUTHORITY Nolan / CLASSIFICATION KEEP (state) /
CONFIDENCE high / BROKEN BOUNDARY no (refusal held) / DEPENDENCIES — / AFFECTS AGENTS 09.

F6. DOMAIN codex / COMPONENT quota/availability gate / CLAIM The reference profile's
`blockedExternal` (ChatGPT plan usage, `blockedUntil 2026-09-17T06:01:00Z`) is EXPIRED; nothing
has re-verified Codex availability since. / EVIDENCE AGENT_PROFILES codex entry. / CALLER
authorizeWorkOrder (reads blockedExternal) / CALLEE — / WRITER profile maintainer / READER
dispatcher / AUTHORITY PING (registration state) / CLASSIFICATION REFACTOR (re-verify quota;
encode as registration state, never code) / CONFIDENCE high / BROKEN BOUNDARY no / DEPENDENCIES
F1 / AFFECTS AGENTS 09.

F7. DOMAIN hermes / COMPONENT headless invocation / CLAIM Hermes' operational executor path is
`~/workspace/bin/prompt-hermes.sh "<prompt>"` → scp prompt to `C:/Windows/Temp/hermes-prompt.txt`
→ ssh → `wsl -u nolan -- bash /mnt/c/Windows/Temp/hermes-run.sh` (ephemeral) → venv python
`hermes_cli/main.py -z <prompt>` (cwd `.../hermes-agent`, 600s timeout) → response file copied
back. Windows-native CWD `C:\Users\nolan`; it cannot see WSL/cloud paths (verified 2026-09-17).
/ EVIDENCE `~/workspace/bin/prompt-hermes.sh`; `~/workspace/orca-dispatch-test/hermes_dispatch.py`;
`~/workspace/INTEGRATION.md` (repair notes, headless verified live); AGENT_PROFILES hermes entry.
/ CALLER dispatcher-owned invoker / CALLEE hermes venv python / WRITER PING (prompt file, response
capture) / READER PING / AUTHORITY PING / CLASSIFICATION KEEP / CONFIDENCE high / BROKEN BOUNDARY
no / DEPENDENCIES Pig SSH boundary, hermes venv integrity (rebuilt 2026-09-15) / AFFECTS AGENTS 09.

F8. DOMAIN hermes / COMPONENT capability policy / CLAIM The reference profile grants Hermes
ONLY `fixture.read`, `text.transform`, `text.summarize` under `{ read_only, no_writes,
no_network }` — but Nolan's 2026-09-16 standing grant ("agents may write surgically when Pigi
is confident; Pigi checks all agent-written work") is a HUMAN policy with NO encoded profile.
Encoded policy and standing human policy have drifted. / EVIDENCE AGENT_PROFILES hermes entry
vs MEMORY.md agent-write-authority entry. / CALLER Nolan (grant) / CALLEE Hermes / WRITER Pigi
(review gate) / READER Nolan / AUTHORITY Nolan / CLASSIFICATION REFACTOR (either encode a
write-capability class with explicit writable root + per-order approval, or keep the reference
profile read-only and treat surgical writes as out-of-band; do NOT silently widen the profile) /
CONFIDENCE high / BROKEN BOUNDARY no (Pigi review gate held in practice) / DEPENDENCIES F1 /
AFFECTS AGENTS 09.

F9. DOMAIN execution-adapter / COMPONENT agent profile registry / CLAIM `AGENT_PROFILES` is
data-not-code registration with LIVE/PENDING_AUTH status and time-bounded `blockedExternal`;
`authorizeWorkOrder` denies unknown, PENDING_AUTH, and unexpired-blocked agents. Cloud-subagent,
ollama, and four copilot broker identities are registered LIVE; opencode is permanently blocked
(no headless CLI). / EVIDENCE `external_agent_adapter.js` lines 60-160; contract §1; AGENT_PROFILES.md.
/ CALLER authorizeWorkOrder / CALLEE — / WRITER PING (registration maintainer) / READER dispatcher
/ AUTHORITY PING / CLASSIFICATION PROPAGATE / CONFIDENCE high / BROKEN BOUNDARY no / DEPENDENCIES
one-time-login verification for PENDING_AUTH families / AFFECTS AGENTS 09, 03 (MCP/tool plane).

F10. DOMAIN execution-adapter / COMPONENT result/evidence return / CLAIM Results return ONLY as
the 8-field envelope; `verifyResultEnvelope` binds authorized == invoked == result agent and
requires exact echoes of work_order_id/context_pack_id/capability plus completed/failed
output-error rules and `verifiedAt <= deadline`; `recordVerifiedResult` is the ONLY path to
`WORKER_COMPLETED`/`WORKER_FAILED`, with `logical_id = result_id` and event identity owned
solely by `UnifiedEventRuntime.computeEventId`; the adapter's own event-identity mirror was
removed 2026-09-17 (zero callers). Evidence is agent-reported (open object, ISO timestamps,
no credentials) — NOT canonical truth. / EVIDENCE `external_agent_adapter.js`
(verifyResultEnvelope, recordVerifiedResult); contract §§1,4,5. / CALLER invoker / CALLEE
eventRuntime.emit / WRITER PING / READER event spine / AUTHORITY UnifiedEventRuntime /
CLASSIFICATION PROPAGATE / CONFIDENCE high / BROKEN BOUNDARY no / DEPENDENCIES eventRuntime
injection / AFFECTS AGENTS 07 (observability: envelope evidence fields are the audit trail),
09.

F11. DOMAIN execution-adapter / COMPONENT sandbox layer / CLAIM OS-level scoping today: Codex
exec `-s read-only` (hard read-only); Hermes filesystem blindness (no WSL visibility, inline
input only, oneshot). For the general tool plane, swarm-14 harvested nsjail (ONCE mode,
per-capability-class configs, profile_hash receipt binding, unknown class ⇒ tenant-code-strict)
— authorization without isolation leaves ambient-authority blast radius. / EVIDENCE AGENT_PROFILES
entries; swarm-14 `SANDBOX-EVALUATION.md` (nsjail mechanism, synthetic 3/3 PASS experiment). /
CALLER adapter invoker / CALLEE nsjail / OS sandbox / WRITER PING (renders config from capability
decision; grants no authority) / READER PING (verifies receipt) / AUTHORITY capability decision
(constitutional sprint), PING / CLASSIFICATION PROPAGATE (swarm-14's recommendation) /
CONFIDENCE high / BROKEN BOUNDARY no / DEPENDENCIES swarm-14 profiles.ts proposal (P-20260923-012)
/ AFFECTS AGENTS 09, 14, 04 (tool safety).

F12. DOMAIN execution-adapter / COMPONENT secret handling / CLAIM No credentials, bearer tokens,
or private keys may appear in WorkOrder input, result output, or evidence; dispatchers resolve
credentials at the process boundary. / EVIDENCE contract §6; hermes_dispatch.py (no credential
handling); INTEGRATION.md standing rule ("Never read AppData/Local/hermes/.env"). / CALLER
dispatcher / CALLEE — / WRITER dispatcher / READER PING / AUTHORITY PING / CLASSIFICATION KEEP /
CONFIDENCE high / BROKEN BOUNDARY no / DEPENDENCIES dispatcher process boundary / AFFECTS AGENTS 09.

F13. DOMAIN hermes / COMPONENT operating-protocol doc / CLAIM `docs/hermes_operating_protocol.md`
(2026-08-06, status "PLANNING (READ-ONLY)", "repo contains zero code imports of Hermes") is
STALE and superseded by operational reality (prompt-hermes.sh oneshot, reference adapter,
surgical-write grant). It must not be treated as the live protocol. / EVIDENCE doc §1, §8 vs
operational evidence in F7. / CALLER — / CALLEE — / WRITER (historical) / READER — / AUTHORITY
(none) / CLASSIFICATION DROP (mark historical; keep file, do not delete per archive rules) /
CONFIDENCE high / BROKEN BOUNDARY no / DEPENDENCIES — / AFFECTS AGENTS 09 (must not build on the
stale doc).

F14. DOMAIN execution-adapter / COMPONENT provenance / CLAIM The "proven reference" worktree
`worktrees/ping-harvest-12h` no longer exists in the PING repo; the only copies of
`external_agent_adapter.js` are `~/workspace/orca-workstream-d/` (+ ORCA port comments),
`~/workspace/ping-overnight/`, and branch copies (`feature/external-agent-hardening`,
`feature/orca-autonomy`). Re-anchor ONE canonical copy before wiring. / EVIDENCE pig shell
`ls -d worktrees/ping-harvest-12h → NO-HARVEST-12H-WORKTREE`. / CALLER — / CALLEE — / WRITER
(archived) / READER implementers / AUTHORITY PING / CLASSIFICATION REFACTOR (canonicalize the
file location; no third copies) / CONFIDENCE high / BROKEN BOUNDARY no / DEPENDENCIES AGENT 09
contract (must pick the same file) / AFFECTS AGENTS 09, 19 (integration/release).

F15. DOMAIN execution-adapter / COMPONENT authority non-duplication / CLAIM The adapter obeys
single-authority-per-decision: it owns only "may PING issue work order W delegating capability
C to agent A under constraints K?"; it does not duplicate CapabilityAuthority.authorize
(agent-initiated), CanonicalizationService.authorizeNamespace, WorkerRuntime.dispatch, or
UnifiedEventRuntime.computeEventId. Codex/Hermes remain executors, never canonical authorities
(mission, identity, memory, events, capabilities). / EVIDENCE module header comment;
contract §7; removal of canonicalEventId mirror 2026-09-17. / CALLER — / CALLEE — / WRITER
adapter / READER auditors / AUTHORITY PING constitutional authorities / CLASSIFICATION KEEP /
CONFIDENCE high / BROKEN BOUNDARY no / DEPENDENCIES constitutional authority map /
AFFECTS AGENTS 01 (tenant reality/boundaries), 09.

---

## 4. Summary for the parent

**Minimum adapter (no rewrite needed):** promote the proven `external_agent_adapter.js`
(authorizeWorkOrder / issueWorkOrder / verifyResultEnvelope / recordVerifiedResult) into ONE
canonical location, wire it behind `mission_activities.js:executeWorkOrder` (replacing the
canned-success stub with typed failure until wired), register exactly two LIVE executor profiles
(`hermes`: prompt-hermes.sh oneshot, inline prompt, stdout envelope, capabilities
fixture.read/text.transform/text.summarize, read_only+no_writes+no_network; `codex`:
`codex exec --ignore-user-config -s read-only --ephemeral --skip-git-repo-check -C <workdir>`,
same read-only capabilities), keep `result_path` PING-owned, keep event identity with
UnifiedEventRuntime, and put swarm-14's nsjail profiles under the launcher as the OS layer.
Do not grant write or side-effect capabilities in the minimum set; Nolan's surgical-write grant
stays human-gated until a separate capability class is designed. The one live-path fix that
cannot wait: the temporal stub currently fabricates mission success.

**Broken boundaries found (2):** (1) the `executeWorkOrder` stub fabricates success; (2) a Codex
Desktop task executed and pushed to a public repo beyond its authorized task with no work order
or event — the 2026-09-16 "properly bounded / no code change required" conclusion is falsified.
