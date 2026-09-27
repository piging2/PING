# Writer W2: lane-d adapter shim reconstruction + proof (2026-09-27)

Single-writer semantic unit: restore the missing lane-d adapter transport
(`adapter-call.js`) and prove it against the REAL adapter. No stubs, no
reimplementation of adapter decisions, no deployment.

## Deliverables

- Pig runtime path: `/home/nolan/workspace/mission-control/lane-d/adapter-call.js`
  (sha256 `12b3209f5c80e079585e56086a00d326a1fd1a4847e5d754458134ff2311bb23`,
  byte-identical to the repo copy, `node --check` clean, live `profiles`
  smoke tested).
- Repo copy: `mission-control/lane-d/adapter-call.js` on branch
  `p0/front-door-idempotency` (this file + this report, one small commit,
  no push, no main/master).

## The adapter's real interface (file:line)

Canonical copy (arch-A verified by reading, not assumed):
`/home/nolan/workspace/orca-adapter/vendor/external_agent_adapter.js`
(sha256 `7e3e3af92e13249b768b5c1ceb4719c3e4ad5b5a51386e5feba78412c1d25c8b`).

- `AGENT_PROFILES` (line 60): data map. `ollama`: status `LIVE`, family
  `ollama`, allowedCapabilities `["text.transform","text.summarize",
  "documentation.generate","dead_code.analyze","test.generate"]`,
  maxConstraints `{read_only,no_writes,no_network}` (all true).
  `identity_1..4` present, `LIVE`; `identity_5` absent entirely.
- `authorizeWorkOrder({agentId, capability, namespace, constraints})`
  (line 185): returns `{granted:true,...}` or `{granted:false,reason}`.
  Never throws on a verdict; fail-closed on unknown agent, bad capability,
  bad namespace, loose constraints.
- `issueWorkOrder({...14 fields..., attempt=1})` (line 226): THROWS
  `WORK_ORDER_DENIED` on denial (the throw carries the verdict). Returns
  envelope with `work_order_id = sha256('workorder:'+taskId)[0:16]`
  (line 177 `workOrderId`). No `workOrderId` override parameter.
- `verifyResultEnvelope(result, workOrder, {invokedAgentId, verifiedAt})`
  (line 306): returns `{valid:true, retryable:false, result_id}` or
  `{valid:false, reason, retryable:false}`. `result_id` =
  `resultIdentity(result, workOrder)` (line 288):
  `sha256('external-result:' + stableStringify(binding))`.
- `recordVerifiedResult` (line 367), `resultIdentity` (288),
  `stableWorkOrderId` NOT present (see divergence below).

Divergence vs the orca-autonomy worktree copy
(`/home/nolan/worktrees/orca-autonomy/ping-runtime/external-agent/
external_agent_adapter.js`, 24161 bytes, sha256
`b32ad888aa8e5404a1ec0ae54361c0379d301d3f840f4e4d1cea78625e410c9f`):
the worktree copy additionally exports `stableWorkOrderId(explicit,
taskId)` (line 235) and `issueWorkOrder` accepts a `workOrderId` override
(line 294); it also registers extra profiles (`goose`, `qwen`, `crush`)
and carries the stale hermes invocation note that the vendor copy had
reconciled on 2026-09-26. The lane-D ledger pointed at the worktree copy;
arch-A names the vendor copy canonical and the ledger is treated as
UNPROVEN per brief, so the shim wires the vendor copy. Both copies agree
on the authorize/issue/verify surface the route uses.

## The shim's argv/JSON contract

`node /home/nolan/workspace/mission-control/lane-d/adapter-call.js <op> [payload-json]`
(op in `profiles|authorize|issue|verify`; payload is one argv JSON string,
exactly as `mc-dispatch.ts` `adapterCall` invokes it).

- `profiles` (no payload) -> exit 0, `{"ok":true,"profiles":{...}}`
- `authorize` -> exit 0, `{"ok":true,"granted":bool,"reason":...}`.
  Adapter throw -> exit 2 (a crashed authorize is not a verdict; the route
  maps non-zero exit to 503 `adapter_error`, never to a fabricated DENIED).
- `issue` -> exit 0, `{"ok":true,"workOrder":{...}}`; adapter throw
  (incl. `WORK_ORDER_DENIED`) -> exit 0,
  `{"ok":false,"error":...,"code":...,"reason":...}`.
- `verify` -> exit 0,
  `{"ok":true,"valid":bool,"result_id":...,"reason":...,"error":...}`;
  adapter throw -> exit 0 `{"ok":false,...}`.
- Bad op, missing/unparseable payload, adapter load failure -> exit 2,
  never a verdict.

E2 divergence (also committed as a comment in the shim header): retries
must be byte-identical; idempotency_key is a salt, not a request name.
Retry identity lives in the mission layer: missionId derives from the
idempotency key as a salt in the hash, taskId = missionId + ':task:1',
work_order_id derives from taskId. The shim forwards the issue payload
as-is, but the canonical vendor adapter SILENTLY IGNORES a `workOrderId`
override field (no `stableWorkOrderId`; only the worktree copy honors
it). Never assume the override is honored. Future hardening: persist the
idempotency key in `MC_MISSION_CREATED` event_data so an audit can prove
which key produced a mission (today the key is hashed into the mission id
but not stored).

## Phase 1 (reconstruct): PASS

- Transport verified first: `echo PIG_OK` round-trip through
  `pigwsl-exec.sh` returned `PIG_OK`, rc=0, before any Pig-side work.
- CLI contract read from `lane-p01/tree/src/app/api/mc/_lib/mc-dispatch.ts`
  (`adapterCall`, lines ~274-283) and `dispatch/route.ts` (authorize/issue/
  verify call sites and expected shapes). `LANE-D-DISPATCH.md` read as the
  documented behavior. Real adapter interface read line-by-line (above).
- No ambiguity found in the contract; no adapter behavior invented; the
  shim is a thin transport in the `_adapter_shim.js` family pattern.

## Phase 2a (shim vs REAL adapter, Pig-side): 23/23 PASS

Harness drove the shim exactly as `adapterCall` does (spawnSync
`node <shim> <op> [json]`), agent=ollama, tenant=happy-place,
capability=text.transform, FIXED_CONSTRAINTS
(read_only/no_writes/no_network/no_canonical_events/no_mission_state_writes).

- profiles: exit 0, ok:true, ollama LIVE, text.transform allowed,
  identity_5 absent. authorize: granted:true for the valid request;
  granted:false for identity_5 and for capability email.send. issue:
  ok:true, work_order_id `f6351048e90c95ab` == independently computed
  sha256('workorder:'+taskId)[0:16]; issue for identity_5 -> ok:false,
  code `WORK_ORDER_DENIED`, exit 0. Real ollama call
  (qwen2.5-coder:1.5b, P0 website-analysis prompt shape, read-only)
  returned text; verify -> valid:true, result_id
  `beceba9f4143683c0c4f1f64b2edb3547368f703dbfb2bb95de9df01cc6dba3e`
  == independently computed `adapter.resultIdentity` (direct require,
  not via the shim). verify with tampered work_order_id -> valid:false.
  Bad op / missing payload -> exit 2.
- Scratch mission: `mc-m-dc857acc71fb` (idempotency key `w2-harness-001`).

## Phase 2b (full fixed route end-to-end, scratch journal): PASS

Compiled the actual p0 branch route (`lane-p01/tree/src/app/api/mc/
dispatch/route.ts` + `_lib/mc-dispatch.ts`) with tsc; only the two
filesystem roots redirected to scratch (`/tmp/w2-scratch/journal`,
`/tmp/w2-scratch/artifacts`) via sed on a copy. Adapter shim path left
as the REAL reconstructed shim; adapter = REAL vendored adapter; ollama =
REAL (container restarted once to clear a wedged WSL->docker TCP path;
models on a named volume, nothing lost; `qwen2.5-coder:1.5b` probe
returned `PROBE_OK` before the run).

- POST (P0 website-analysis prompt, agent=ollama, tenant=happy-place,
  capability=text.transform, idempotency_key=`w2-route-001`) ->
  http 200, `status: SUCCEEDED`, mission `mc-m-c08a212ca0cd`,
  run `mc-m-c08a212ca0cd-r1`, execution `...-x1`,
  work_order_id `c4416079d2505c17`,
  result_id `e340162fa17d0229c52f813b941728a14a9757ca7b29d6b377c265ce8ab5da1c`.
- Journal: 9 events in causal order: MC_MISSION_CREATED, MC_RUN_QUEUED,
  MC_EXECUTION_STARTED, MC_AGENT_AUTHORIZED, 4x MC_ARTIFACT_PUBLISHED,
  MC_RUN_SUCCEEDED. Projection reads the mission back as SUCCEEDED with
  full detail (agent/run/execution/work order/artifacts/evidence).
- Artifacts on disk: `prompt.txt`, `workorder.json`, `context.json`,
  `result.json`, each with sha256, all four published via
  MC_ARTIFACT_PUBLISHED.
- Byte-identical retry (same idempotency key): http 200,
  `duplicate_suppressed:true`, ZERO new events. The E2 idempotency claim
  holds against the real stack.

## Environment notes (for W3)

- The Pig's WSL->docker TCP path was wedged at harness start (port
  proxies accepted then RST; affected all containers). One
  `docker restart ollama` cleared it for ollama (200 on :11434 after).
  Other containers' published ports still RST at last check; out of this
  unit's scope, flagged for infra.
- Latent (not this unit's to fix): `appendDispatchEvent` assumes the
  journal directory already exists (`mkdirSync` covers only the artifact
  root's parent). The production journal dir pre-exists, so this never
  bites live; the scratch harness had to pre-create it.
- Untouched per stop rules: :3100 (never restarted, never probed), the
  served tree, :3200, the HPP original, the production journal
  (`/home/nolan/workspace/fyd-journal-gateway/events.jsonl` was only
  read for shape, never written). No push.

## GO / NO-GO for W3 deployment: GO

The reconstructed shim round-trips the REAL canonical adapter on all
four ops (23/23), and the REAL fixed route drives a REAL mission from
MC_MISSION_CREATED through MC_RUN_SUCCEEDED with artifacts, projection,
and byte-identical retry suppression proven (all evidence above). The
served :3100's `adapter_unavailable` 503 was caused solely by the absent
shim file; the shim now exists at the exact `ADAPTER_SHIM` path the route
expects. W3 may deploy and run the live mission.
