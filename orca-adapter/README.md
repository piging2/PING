# ORCA / Headless Agent Adapter — LANE C

The thinnest vertical slice over EXISTING authorities:

```
Execution {missionId, runId, executionId, attempt}   (lane A: WorkerRuntime / ExecutionAuthority owns)
  -> adapter.js (this module — a consumer, never an authority)
  -> authorizeWorkOrder / issueWorkOrder  (vendored proven external_agent_adapter.js)
  -> hermes transport  (~/workspace/bin/prompt-hermes.sh -> Pig wsl -> hermes-run.sh -> venv python hermes_cli/main.py --safe-mode -z <prompt>)
  -> stdout artifact captured  (PING-owned result_path, atomic write)
  -> 8-field result envelope extracted + verified
  -> recordVerifiedResult  (INJECTED event runtime only; UnifiedEventRuntime -> ping_events)
  -> outcome {completed | failed | unknown | denied | escalated} x effect_state {effect_unknown | effect_hold | effect_none} + evidence links
```

No new event store, no identity registry, no scheduler, no workflow engine.

## The REAL execution path (proven, not narrated)

| Step | Mechanism | Proven by |
|---|---|---|
| Authorize | `authorizeWorkOrder` fail-closed; profiles: hermes LIVE, cloud-subagent LIVE, ollama LIVE, identity_1..4 LIVE; identity_5..10 DENIED; codex/opencode blocked | vendored byte-identical adapter; live broker AUTHORIZED_IDENTITY_IDS=1..4 |
| Issue | `issueWorkOrder`; `work_order_id = sha256('workorder:' + taskId)[0:16]` — same (executionId, attempt) re-issues the same work order | synthetic selftest (idempotency PASS) |
| Invoke | `prompt-hermes.sh` scp's the prompt to `C:\Users\nolan\hermes-bridge\hermes-prompt.txt` (persistent path since 2026-09-26; C:\Windows\Temp was volatile and lost the files 2026-09-25), runs `wsl -u nolan -- bash /mnt/c/Users/nolan/hermes-bridge/hermes-run.sh` -> venv python hermes_cli/main.py --safe-mode -z <prompt> (safe mode verified live 2026-09-26: HERMES_SAFE_MODE=1, plugin discovery skipped, exit 0). Prompt INLINE ONLY — hermes cannot see WSL/cloud paths | live smoke 2026-09-26: exit 0, envelope returned |
| Effect state | every outcome carries `effect_state` (effect_unknown / effect_hold / effect_none); a verified completion records effect_unknown, never clean success (worker self-report is not verification, O5); denied -> effect_none; escalated/unknown -> effect_unknown; the canonical event records it in metadata | synthetic selftest 40/40 (incl. 15 effect-state checks) + cond8 re-fire 2026-09-26 |
| Capture | stdout -> PING-owned artifact `evidence/result-<executionId>-a<attempt>.json` (temp+rename, atomic) | live smoke artifact on disk |
| Verify | `verifyResultEnvelope`: authorized==invoked==result agent; exact echo of work_order_id/context_pack_id/capability; status in {completed, failed}; output/error pairing; deadline | synthetic selftest (bad echo -> ESCALATED, no event) |
| Record | `recordVerifiedResult` with the INJECTED runtime -> canonical `WORKER_COMPLETED`/`WORKER_FAILED` on `ping_events`; event identity owned by `UnifiedEventRuntime.computeEventId` | witnessed run orca-run-mu6wmbzn 2026-09-18 (2 events, IDs recomputed locally). In THIS sandbox the runtime is not injected (lane A owns the spine); live smoke ran `recorded: false` honestly |

## What does NOT exist here (fenced, never callable)

- **Gateway ORCA ExecutionEngine** (`ping-runtime/orchestration/execution/engine.js`, Pig-side): live-but-orphaned. `executor: null` on its only port; `dispatchToAssignment` builds a prompt artifact and never calls `execute()`; emits only its private EventQueue, never PING events. Mounted at `/orchestration` but receives no business traffic. Cannot be edited from this sandbox; documented in `~/workspace/orca-omniroute-audit-2026-09-13.md`.
- **orca-cli/orca README claims** (github.com/orca-cli/orca @ 5beeefc): MCP server, runner/claiming, pod lifecycle, constraint engine, TUI, DAG execution, twelve CLI commands — zero code. Its adapter port (`internal/adapter`) is REJECTED as a harvest (unproven, zero implementations). See `~/workspace/autonomous-missions/ORCA-ARCHAEOLOGY-2026-09-23.md`.
- **`worker_runtime.js:10` comment** ("Workers register as WorkerPorts in the Orca scheduler") — Pig-side; the business path never touches `WorkerPortRegistry` (unresolved mismatch, documented 2026-09-13). Lane A owns those files.

## UNKNOWN semantics (binding)

UNKNOWN is a distributed-systems state, not an error code. The adapter:

- dispatcher timeout -> `unknown` (`dispatcher_timeout`). The worker may still be running; the dispatcher does not know. **Never collapsed into failed.**
- unparseable worker output / invalid envelope -> `escalated` with `honestOutcome: unknown`. Non-retryable; can NEVER reach canonical event authority.
- event-plane emission rejected -> `unknown` (`canonical_emission_rejected`). Lane-J fail-closed: no terminal event exists, the caller retries on the normal path.
- `terminalOutcome()` throws if asked to label `unknown` as terminal.

Reconcile-vs-retry on UNKNOWN is owned by the CALLER (WorkerRuntime / Mission Control), never this adapter.

## Reconcile gate (S5 RETRY-AFTER-UNKNOWN closure)

The adapter never blindly re-dispatches. Before any transport invocation, `dispatchExecution` enforces:

- **Idempotency key** — `idempotencyKeyFor({execution, input, tenant_id, capability})`: sha256 over canonical intent bytes (task identity + inputs hash + tenant + capability). Same intent -> same key; the attempt number is deliberately excluded so a retry resolves to the same key.
- **Prior-outcome lookup** — append-only `idempotency-index.jsonl` in the evidenceDir. If the latest prior attempt for the key is uncertain (outcome unknown/escalated, contract `status:'unknown'`, `effect_state` `effect_unknown`, or dispatched-but-never-concluded), a new attempt is REFUSED with a typed refusal (`reconciliation_required`) unless the caller supplies `opts.reconciliation = { checked, found, decidedBy }`, which is validated and persisted. Only then may a NEW `execution.attempt` proceed.
- **Duplicate attempts** — same key + same attempt string is always refused (`duplicate_attempt`): the attempt already has its evidence. A pre-write `existsSync` guard makes never-overwrite hold even if the index is lost.
- **Unknown-outcome signal (front-door H5b contract)** — every UNKNOWN outcome the adapter emits carries `{status:'unknown', summary, effect_may_have_occurred}`; the front door maps it to UNKNOWN/HOLD. The gate keys its prior-outcome lookup on the same signal.
- **Contract envelope on every post-dispatch outcome** — completed/failed returns also carry top-level `status` ('completed'/'failed', the worker's verified verdict) and a string `summary`, so the front door's executor-result validator accepts the adapter's envelope without synthesis. Denials (`outcome:'denied'`, pre-invocation refusals incl. gate refusals) intentionally carry no `status`: there is no 'denied' in the front door's executor-status enum; the future wiring lane maps a denied return to an authorization-style refusal, never through the executor-result validator.
- **1a** artifact and API return agree on the outcome label (`escalated` + `honestOutcome:'unknown'` on protocol failures). **1b** every unknown-path return carries `reconcileOwnedBy:'caller'` explicitly. **1c** the spawn signal (`SIGKILL`/...) is captured into the artifact evidence (transport `signal` field, else extracted from error text, else explicit null with provenance). **F1** ssh/scp diagnostics are no longer discarded by `bin/prompt-hermes.sh`; the adapter captures transport stderr into the artifact.

Refusals are `outcome:'denied'` with `effect_state:'effect_none'` (the refused call dispatched nothing) and a machine-readable `reconciliation` block. The adapter never reconciles and never retries by itself.

## Identity containment

Copilot identities 1-4 only. `identity_5..10` are DENIED twice: the vendored adapter denies unknown agents fail-closed, and `adapter.js` names the DENIED set explicitly. Broker containment (`pig-fb/copilot-broker/src/broker.js`: AUTHORIZED_IDENTITY_IDS=1..4) stays fail-closed; this adapter never touches the broker.

## Tenant threading (lane B handoff)

`dispatchExecution` accepts `opts.tenantId` — the scheduler dispatch event's authoritative `event.tenant_id` (lane B). It is validated fail-closed against the namespace (`tenant_namespace_mismatch` throws before dispatch on contradiction; malformed IDs rejected) and threaded into every evidence artifact as top-level `tenant_id` (null for core executions), the worker prompt context line, and the returned outcome. The broker is untouched.

## Usage

```js
const { dispatchExecution } = require('./adapter.js');
const result = await dispatchExecution({
  execution: { missionId: 'm', runId: 'r', executionId: 'e', attempt: '1' },
  agentId: 'hermes',
  capability: 'text.summarize',
  namespace: 'core::system',
  constraints: { read_only: true, no_writes: true, no_network: true,
                 no_canonical_events: true, no_mission_state_writes: true,
                 allowed_workspace: 'core::system' },
  taskBrief: 'Summarize the input.',
  input: { text: '...' },
  eventRuntime: null,           // inject UnifiedEventRuntime to record canonically
  evidenceDir: './evidence',    // default
});
// result: { outcome: 'completed'|'failed'|'unknown'|'denied'|'escalated',
//           work_order_id, result_id?, event_id?, recorded, artifactPath, ... }
```

## Tests

- `test/adapter-selftest.js` — 43 synthetic checks (no external effects): identity fence, fail-closed auth, envelope extraction, UNKNOWN propagation (timeout / protocol failure / emission rejected), verified completed/failed paths, determinism, no-event-on-invalid, reconcile-gate duplicate refusal + never-overwrite. `node test/adapter-selftest.js`.
- `test/reconcile-gate-selftest.js` — 40 hostile checks mirroring the P4 S5 scenario: idempotency-key stability, 3x retry of an unknown intent -> exactly 1 transport invocation, attempt-1 artifact byte-identical after refused retries, reconciliation record unlocks exactly one NEW attempt as a NEW file, invalid/absent reconciliation refused (transport never runs), each unknown needs its own reconciliation, contract signal on all unknown paths, contract envelope on completed/failed, 1a/1b/1c, worker-reported unknown, corrupt-index fail-closed. `node test/reconcile-gate-selftest.js`.
- `test/tenant-threading-selftest.js` — 18 synthetic checks: tenant resolve/derive/core, mismatch fail-closed (no transport invoked), malformed rejection, tenant_id threaded into result + artifact, prompt line. `node test/tenant-threading-selftest.js`.
- `test/live-smoke.js` — ONE real dispatch to Hermes with a synthetic read-only prompt (no event runtime injected). 2026-09-26: PASS, `work_order_id=58f29ce0d7cf2a51`, `result_id=964f180161f88ded1df7e5805943f6b0de8f6c249924024d2a43b4a65506df6a`, artifact `evidence/result-smoke-e1-a1.json`.

## Vendor provenance (do not edit)

- `vendor/external_agent_adapter.js` — byte-identical copy of `~/workspace/orca-workstream-d/external_agent_adapter.js`, sha256 `755a6e7ce564707cbf9d786c1d1a9a739ef10d4beafc12b642b181d74f751504` (the witnessed 2026-09-18 contract).
- `canonicalization/canonicalization_service.js` — SHIM, not the authority. Exports only NAMESPACE_RE (the contract pattern), because the vendored adapter requires `../canonicalization/canonicalization_service.js` and the real authority lives Pig-side. Behavior is identical to the proven fallback path.
