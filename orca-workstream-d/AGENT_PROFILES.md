# Dispatcher-Family Agent Profiles (ORCA AUTONOMY, workstream d)

**Date:** 2026-09-18
**Registry:** `ping-runtime/external-agent/external_agent_adapter.js`, `AGENT_PROFILES`
**Adapter:** same file, functions `authorizeWorkOrder`, `issueWorkOrder`, `verifyResultEnvelope`, `recordVerifiedResult`
**Schemas:** `WORKORDER_SCHEMA.json`, `RESULT_SCHEMA.json` (closed envelopes, byte-copied from the proven reference)
**Boundary doc:** `BOUNDARY.md`
**Contract:** `~/workspace/multi-runtime-workorder-contract.md` (authoritative for family behavior)
**Validation:** `validate_dispatcher_profiles.js` (node, uses only the registry's own mechanism)

## The four families (from the contract, section 3)

The contract's gap note names exactly four dispatcher families that need
registered `AGENT_PROFILES` entries before `authorizeWorkOrder` can grant
them: cloud subagents, Hermes, Ollama, Copilot broker. Hermes was already
profiled in the reference adapter; the other three are registered here as
data (no new machinery). Codex and OpenCode profiles are carried over
unchanged from the reference; they are not ORCA dispatcher families.

Registration mechanism: a profile is a data entry in `AGENT_PROFILES`
(agent_id key, transport, invocation, allowedCapabilities, maxConstraints,
status, family, notes). `status` is `LIVE` (verified, grantable) or
`PENDING_AUTH` (registered for a family awaiting a one-time login;
`authorizeWorkOrder` denies it, so it is never usable before verification).

## 1. cloud-subagent (PRIMARY fleet)

- **agent_id:** `cloud-subagent` (dispatcher-assigned family identity; per-worker identities are future data-only additions)
- **Runtime:** cloud subagent, ephemeral and replaceable, spawned by the dispatcher. Exercised now: this workstream itself runs as a cloud subagent.
- **Capabilities:** orchestration.plan, orchestration.review, text.transform, text.summarize, documentation.generate, dead_code.analyze, test.generate. The dispatcher maintains a narrower capability allowlist per deployment; the profile ceiling is the maximum PING may grant.
- **Input contract:** the WorkOrder `input` object; the dispatcher embeds it inline in the dispatch prompt. No cross-environment file-path assumptions: the worker must never be handed WSL or Pig paths it cannot see.
- **Output contract:** the 8-field result envelope (work_order_id, context_pack_id, agent_id, capability, status, output, evidence, error) returned in the worker's final report. `result_path` is PING-owned; no family may treat it as a writable output path.
- **Evidence contract:** startedAt, endedAt, host, capabilityPerformed, notes (ISO timestamps). No credentials, tokens, or private material anywhere in the envelope.
- **Timeout:** task-dependent. The dispatcher sets an absolute ISO `deadline` with margin above the estimated duration; the invoker enforces it. A result with verifiedAt past the deadline is invalid and non-retryable. On timeout the invoker reports status failed, output null, error non-empty (for example "timeout after <deadline>"); only PING emits WORKER_FAILED via recordVerifiedResult.
- **Retry semantics:** retries live only in PING's orchestration layer; workers never self-retry, never decide promotion, never select workers. Retries increment `attempt`; the same task_id re-issues the same work_order_id. Validation failure is non-retryable and can never reach canonical event authority.
- **Workspace requirements:** inline prompt only; no writable workspace granted by the envelope (maxConstraints read_only/no_writes/no_network all true; constraints may only tighten).
- **Authorization requirements:** profile exists with status LIVE; capability in allowedCapabilities; namespace matches ^(core|tenant)::[a-z0-9_.-]+$; constraints tighten maxConstraints; no_canonical_events true and no_mission_state_writes true (hard-required).
- **Status:** LIVE.

## 2. hermes

- **agent_id:** `hermes`
- **Runtime:** Hermes Agent v0.21.2, oneshot subprocess. Dispatcher invocation: `~/workspace/bin/prompt-hermes.sh` with the prompt string as the single argument. Windows-native transport; working directory C:\Users\nolan; it cannot see WSL or cloud paths (verified 2026-09-17).
- **Capabilities:** fixture.read, text.transform, text.summarize. Research and analysis only.
- **Input contract:** the prompt string, INLINE ONLY. Work orders to Hermes must carry input inline, never by file path.
- **Output contract:** the worker emits ONLY the 8-field result envelope on stdout; PING captures it and writes `result_path`.
- **Evidence contract:** startedAt, endedAt, host, promptLength, responseLength, capabilityPerformed (ISO timestamps). No secrets.
- **Timeout:** about 11s typical response; the dispatcher sets the deadline with margin above that. Late results are rejected as invalid, non-retryable.
- **Retry semantics:** same as family 1: PING orchestration only; attempt increments; validation failure non-retryable.
- **Workspace requirements:** inline only; the Hermes filesystem is its authority boundary; no WSL/Pig paths.
- **Authorization requirements:** same gate as family 1; research/analysis capabilities only.
- **Status:** LIVE (proven live 2026-09-16/17).

## 3. ollama

- **agent_id:** `ollama`
- **Runtime:** Ollama via `~/workspace/bin/prompt-ollama.sh`, prompt string as the argument, stdout envelope. Default model qwen2.5-coder:1.5b (proven live).
- **Capabilities:** text.transform, text.summarize, documentation.generate, dead_code.analyze, test.generate. Fast code and analysis; keep tasks small-model appropriate.
- **Input contract:** the prompt string, inline.
- **Output contract:** stdout envelope only; `result_path` stays PING-owned.
- **Evidence contract:** startedAt, endedAt, host, model, promptTokens, completionTokens, capabilityPerformed (ISO timestamps). No secrets.
- **Timeout:** about 3s typical; dispatcher sets the deadline with margin.
- **Retry semantics:** same as family 1.
- **Workspace requirements:** inline prompt only; maxConstraints read_only/no_writes/no_network.
- **Authorization requirements:** same gate as family 1.
- **Status:** LIVE (proven live).

## 4. copilot (broker identities 1-4)

- **agent_id:** one of `identity_1`, `identity_2`, `identity_3`, `identity_4` (piging2, nolangese-sudo, piging1, piging86). Anything else fails closed: unknown agent, issuance denied.
- **Runtime:** Copilot broker on Pig WSL (~/copilot-broker); the broker routes the task to the named identity.
- **Capabilities:** test.generate, documentation.generate, dead_code.analyze. Coding tasks; the profile ceiling is the maximum PING may grant and the dispatcher narrows per deployment.
- **Input contract:** the coding task description, inline in the WorkOrder.
- **Output contract:** the broker response is returned to the dispatcher; the dispatcher wraps it in the 8-field result envelope; `result_path` stays PING-owned.
- **Evidence contract:** startedAt, endedAt, host, identityUsed (one of the four), capabilityPerformed (ISO timestamps). No credentials, tokens, or quota material in evidence or anywhere in the envelope.
- **Timeout:** task-dependent; the dispatcher sets the deadline with margin. Quota gating is EXTERNAL to the envelope: the dispatcher checks remaining >= cost + reserve before issuing and fails closed on unknown or stale quota.
- **Retry semantics:** same as family 1.
- **Workspace requirements:** inline task description only; broker resolves credentials at the process boundary, never inside a WorkOrder.
- **Authorization requirements:** same gate as family 1, plus the identity must be one of the four registered profiles.
- **Status:** LIVE (four authorized identities; execution pool live).

## Grant path (what authorizeWorkOrder enforces, in order)

1. agent_id must be a registered profile, else denied (unknown agent).
2. blockedExternal profiles denied while the block is active (opencode: permanent; codex: time-bounded, expired 2026-09-17T06:01:00Z).
3. status PENDING_AUTH denied: registered but never grantable before the one-time login is verified.
4. capability must be in the profile's allowedCapabilities.
5. namespace must match the namespace pattern.
6. constraints must be an object and may only tighten the profile's maxConstraints.
7. no_canonical_events and no_mission_state_writes must both be true (hard-required).

`issueWorkOrder` builds (never sends) the closed 14-field envelope with deterministic work_order_id = sha256('workorder:' + taskId)[0:16]; principal is always `ping:external-agent-adapter`. `verifyResultEnvelope` binds authorized agent == invoked agent == result agent, exact echo of work_order_id/context_pack_id/capability, completed/failed output-error rules, evidence as object, verifiedAt ISO and within deadline. `recordVerifiedResult` asks PING's injected canonical event runtime to emit WORKER_COMPLETED or WORKER_FAILED; the worker never receives runtime access or event credentials.

## What was NOT registered

Goose, OpenCode, Gemini CLI, Qwen Code, Crush (one-time login pending), Aider, Roo Code: owned by the CLI auth worker; this workstream does not touch them. If any is verified later, it is added as a data entry with status PENDING_AUTH until the one-time login is proven, then flipped to LIVE. Nothing here creates a new authority, event store, mission DB, or worker queue.
