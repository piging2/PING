# ARCH-A: Execution Path inventory (P0 autonomy sprint, 2026-09-27)

Worker: arch-A (read-only). Scope: EXECUTION PATH surface only.
Repo: ~/workspace is one git repo (root /home/hatch/workspace), branch `burn/outreach-caps-2026-09-27`
(HEAD 98f0915, 2026-09-27). Do NOT touch the HPP original; it was not read. :3200 untouched.

## 1. The ONE reached execution path the P0 mission should use

The P0 mission ("Analyze my website and make emergency services more prominent")
should dispatch through the Lane D witnessed dispatch API with agent=ollama.
Every arrow below is code-present and acceptance-proven on the Pig's :3100
(see mission-control/LANE-D-DISPATCH.md acceptance table: mission mc-m-63d04f4517f9
SUCCEEDED, concurrency proof mc-m-c3dc03efaf23 + mc-m-58d7ad5e332e, UNKNOWN probe).

Note on location: this path's code exists ONLY in the untracked extract
`lane-p01/tree/` (git status: `?? lane-p01/`, tarball dated 2026-09-27 00:34).
Its paths are Pig paths (/home/nolan/...); the deployment target is the Pig.

Arrow by arrow for POST /api/mc/dispatch:

1. `POST /api/mc/dispatch` -> `lane-p01/tree/src/app/api/mc/dispatch/route.ts:214`
   (export async function POST). Fail-closed validation: prompt 1..2000 chars,
   agent in {ollama, identity_1..4}, tenant in {happy-place, coppersmith-plumbing},
   capability in the agent's adapter allowlist, namespace `tenant::<id>`.

2. Adapter authorize -> `route.ts:277` `adapterCall('authorize', ...)`
   -> `lane-p01/tree/src/app/api/mc/_lib/mc-dispatch.ts` adapterCall
   -> `spawnSync('node', [ADAPTER_SHIM, ...])` where
   ADAPTER_SHIM = `/home/nolan/workspace/mission-control/lane-d/adapter-call.js`
   (mc-dispatch.ts:34). Denial -> 403 + MC_AGENT_DENIED, mission state DENIED, never FAILED.

3. Adapter issue work order -> `route.ts:293` `adapterCall('issue', ...)`
   -> deterministic work_order_id = sha256('workorder:'+taskId)[0:16].

4. Lifecycle events -> `route.ts` emit() -> `appendDispatchEvent`
   (mc-dispatch.ts) -> `MC_MISSION_CREATED` / `MC_RUN_QUEUED` /
   `MC_EXECUTION_STARTED` / `MC_AGENT_AUTHORIZED` appended to the existing journal
   JOURNAL_PATH = `/home/nolan/workspace/fyd-journal-gateway/events.jsonl`
   (mc-dispatch.ts:31).

5. Artifacts -> `route.ts` publishArtifact() -> prompt.txt, workorder.json,
   context.json under ARTIFACT_ROOT =
   `/home/nolan/workspace/mission-control/artifacts/<missionId>/` (mc-dispatch.ts:32).

6. Execute -> agent === 'ollama' -> `runOllama(prompt, deadlineS)` at
   `route.ts:129` -> `fetch('http://127.0.0.1:11434/api/generate',
   {model: 'qwen2.5-coder:1.5b', ...})` (OLLAMA_URL / OLLAMA_MODEL, mc-dispatch.ts:45-46).
   Deadline 180s; expiry -> kind 'timeout' -> MC_RUN_UNKNOWN, never FAILED.

7. Result envelope -> 8-field envelope built at `route.ts` (~line 360) ->
   `adapterCall('verify', ...)` at `route.ts:376` -> vendored adapter
   verifyResultEnvelope (binding, echoes, status, deadline).

8. Terminal -> `publishArtifact(missionId, 'result', 'result.json', ...)` then
   exactly one of: `MC_RUN_SUCCEEDED` / `MC_RUN_FAILED` (transport-failed or
   agent-reported failure) / `MC_RUN_UNKNOWN` (timeout, broker blocked, or
   verification failure; carries `reconciliation_state: "RECONCILIATION IN PROGRESS"`).

9. Readback -> `GET /api/mc/missions/<id>` re-projects the journal on every
   request (no mission store; the journal is the state). Projection is
   deterministic: same journal -> byte-identical JSON (proven in LANE-D-DISPATCH.md).

Why ollama and not the alternatives for P0:
- ollama is the only transport with the catalog claim PROVEN (route.ts GET,
  lines 75-84) and lane-D acceptance evidence; zero spend, local, bounded.
- FIXED_CONSTRAINTS (mc-dispatch.ts:49-55) are read_only / no_writes /
  no_network / no_canonical_events / no_mission_state_writes, which matches the
  P0 plan exactly: the mission produces analysis + a proposed patch as TEXT
  (capability text.transform); applying the patch is the separate owner-approved
  effectful step (hours 8-12 of the sprint), not something the agent does.
- identity_1..4 broker transports are implemented but NOT acceptance-proven
  (GET catalog claim: PROTOTYPE; LANE-D-DISPATCH.md: "broker transports
  (identity_1..4) are implemented + quota-gated but acceptance-proven only on
  ollama (zero spend; no quota consumed)").
- Hermes-backed dispatch is UNPROVEN for success (see BROKEN below).

## 2. Implementation inventory with classifications

### KEEP

- `orca-adapter/adapter.js` (tracked; commits a4e1e93 2026-09-27, 25e33e9, 470745b
  2026-09-27 on current branch). `dispatchExecution` (line 752): identity fence
  (identity_5..10 DENIED) -> authorizeWorkOrder (vendored
  `orca-adapter/vendor/external_agent_adapter.js`) -> tenant threading ->
  reconcile gate (atomic idempotency reservation under cross-process index lock)
  -> issueWorkOrder -> transport invoke (hermes default, or injected transportFn)
  -> envelope extract -> verifyResultEnvelope -> recordVerifiedResult via injected
  event runtime -> artifact + typed outcome (completed/failed/unknown/denied/escalated).
  Failure handling proven honest by the 8-condition hermes-proof lane + independent
  falsifier (see orca-mc-convergence/hermes-proof/PROOF-REPORT.md and
  FALSIFIER-REPORT-2026-09-26.md). KEEP as the strongest executor spine; it is
  currently NOT wired to /api/mc/dispatch (wiring it in is post-P0 work, not the
  P0 path).
- `mission-control/frontdoor_adapters.py:130` `SpineDryRunObserverAdapter`
  (tracked; 470745b 2026-09-27). Bounded dispatch proven through the MissionIntent
  front door: `mi.submit` (mission_intent.py:1044) -> validate -> authorize
  (adapter via `_call_adapter`, mission_intent.py:430) -> `mi.dispatch`
  (mission_intent.py:626) -> `_DryRunObserverExecutor.execute`
  (frontdoor_adapters.py:56) runs the legacy spine observer as a dry-run
  subprocess -> journal events. End-to-end test with the REAL observer in
  `mission-control/tests/test_mission_intent.py` (line 10, 212-246). KEEP as the
  proven reference adapter and front-door contract; its mission class is
  read-only observer work, not the FYD website mission.
- `mission-control/mission_intent.py` (tracked; 470745b). The MissionIntent front
  door: validate (327) -> authorize (468) -> dispatch (626) with revocation
  enforcement inside dispatch() (H7 defect-3) -> submit (1044). KEEP as the
  authority model; no production caller currently wires it to FYD missions
  (callers are tests, falsifier scripts, hostile-test harness).
- Ollama transport inside route.ts (`runOllama`, route.ts:129). KEEP: the proven
  P0 executor (see path above).
- `orca-adapter/vendor/external_agent_adapter.js` (tracked). The vendored proven
  adapter (authorizeWorkOrder / issueWorkOrder / verifyResultEnvelope). KEEP;
  it is the authority both the lane-D route and the orca-adapter consume.
  Two other copies exist (`orca-workstream-d/external_agent_adapter.js`,
  `tenanos-wave/swarm-20/reference/external_agent_adapter.js`); see DUPLICATE.

### WIRE

- `lane-p01/tree/src/app/api/mc/dispatch/route.ts` + `mc-dispatch.ts` (UNTRACKED:
  git status `?? lane-p01/`; no /api/mc implementation exists anywhere in the
  tracked tree, confirmed by find). This IS the reached front door (acceptance
  evidence in mission-control/LANE-D-DISPATCH.md), but it has no
  version-controlled home. WIRE = commit it into the repo (or its canonical
  home) before the P0 mission runs, so the path is reviewable and redeployable
  from a clean checkout. Related: ADAPTER_SHIM
  `/home/nolan/workspace/mission-control/lane-d/adapter-call.js` exists NOWHERE
  in this workspace (`mission-control/lane-d/` contains only
  LANE-C-NOTE-DECISION.md); it is live on the Pig per the lane-D acceptance
  evidence. Wire a vendored copy into the repo next to
  `mission-control/_adapter_shim.js` (same shape: authorize|issue over the
  vendored adapter).
- `runBroker` in route.ts (route.ts:165) -> `spawnSync('node',
  ['/home/nolan/copilot-broker/dispatch-task.js', taskFile])` with quota
  pre-check against `/home/nolan/copilot-broker/state/identities.json`
  (mc-dispatch.ts:47-48). Implemented and fail-closed, but NOT acceptance-run
  in lane D ("not acceptance-run in this lane (no quota spent)"). The broker
  itself lives on the Pig, not in this workspace. WIRE = needs one live
  acceptance dispatch per identity_1..4 before any P0 reliance; do not use for
  the P0 mission.

### HARVEST

- `mission-control/_adapter_shim.js` (tracked). Thin transport to the vendored
  adapter (authorize|issue), "same shape as the lane-D adapter-call.js support
  glue". No production callers (only mission_intent.py docstring, hostile-test
  harness, track-a copies). HARVEST = this is the pattern to copy when vendoring
  the missing adapter-call.js.
- `orca-dispatch-test/orca_control_loop.js` (tracked). Section-20 vertical slice
  OBSERVE->...->VERIFY with delegation through authorize/issue and "the
  registered Hermes worker executes". A demo loop, not a production caller.
  HARVEST = the delegation pattern; do not promote the loop itself.
- `sprint-2026-09-24/orca/lane-f-harness/` (tracked). Concurrency harness
  calling dispatchExecution. HARVEST = the concurrency test pattern.

### MERGE

- (none required on this surface for P0; the orca-adapter and the lane-D route
  are intentionally separate layers today, adapter vs API. Do not merge them
  during the sprint.)

### DELETE-LATER

- (none flagged for deletion on this surface today; the DEAD items below are
  inert archive material and cost nothing while untouched. Deletion is a
  post-sprint cleanup decision, not P0 work.)

### DEAD

- Gateway ORCA ExecutionEngine: `gateway-hardening/build/app/ping-runtime/orchestration/execution/engine.js`
  (line 204 `dispatchToAssignment`, line 663 call site) and
  `gateway-hardening/build/app/gateway/routes/orchestration.js`. Live-but-orphaned
  per mission-control/LANE-D-DISPATCH.md:100-105: `executor: null` on its only
  port, `dispatchToAssignment` never calls `execute()`, no PING events. The
  orca-adapter/adapter.js header (lines 31-35) lists it under FABRICATED /
  REJECTED paths. The whole `gateway-hardening/` dir is build output of a
  hardening lane, not a deployment. DEAD: never route a mission through it.
- `MissionRuntime` / `MissionScheduler` implementations: every hit is archive
  material with no live callers:
  `convergence-zoom-2026-09-19/lane-d-execution/pig-src/ping-runtime/orchestration/mission_runtime.js`
  and `mission_scheduler.js` (2026-09-19 convergence snapshot),
  `ce002/src/mission_runtime.js` + `ce002/src/mission_scheduler.js`
  (completion-effect experiment), `tenanos-wave/swarm-*/...` (evidence copies),
  `fyd-lane/harvest-wave1/code-evidence/event_to_mission_bridge.js`.
  DEAD: historical, superseded by the mission_intent.py front door.
- `WorkerRuntime` / `ExecutionAuthority`: no live implementation found. Hits are
  the same archive set (convergence snapshot
  `.../ping-runtime/workers/worker_runtime.js`, `canonical_workers.js`;
  tenanos-wave evidence; `scratch/durable-exec-src/triggerdev/...` which is a
  vendored third-party CLI source). The only non-archive `worker_runtime.js` is
  `sprint-2026-09-24/orca/wr-effect-unknown/patch/worker_runtime.js`, a sprint
  patch file, not a runtime. The lane-D route and orca-adapter both treat
  "WorkerRuntime / ExecutionAuthority" as lane-A-owned concepts that this code
  consumes but does not implement. DEAD as implementations; the names survive
  only as authority labels.
- `ExecutionAdapter` / `ContainerExecutionAdapter`: NO implementation exists
  anywhere in the searched surface (zero hits in orca-adapter/,
  mission-control/, lane-p01/; full-workspace grep hits were only the archive
  set above). DEAD (never born): do not invent one; P0.3 "strike fiction" applies.

### BROKEN

- Hermes-backed dispatch via `dispatchHermes` (orca-adapter/adapter.js:670 ->
  `spawnSync('bash', ['/home/hatch/workspace/bin/prompt-hermes.sh'])`, prompt
  via stdin -> ssh -> Pig `C:\Users\nolan\hermes-bridge\hermes-run.sh` ->
  venv python `hermes_cli/main.py --safe-mode -z <prompt>`).
  Status: UNPROVEN for success, and the bridge has a documented down/up history:
  (a) independent falsifier 2026-09-27 ~01:45 UTC
  (orca-mc-convergence/hermes-proof/FALSIFIER-REPORT-2026-09-26.md) re-observed
  DEFECT-1 live: `venv/Scripts/python.exe` missing (Linux venv had replaced the
  Windows venv in window 2026-09-26 ~13:38-15:05 UTC), transport exit 127, zero
  stdout; verdict "Hermes is NOT an executor candidate", 6/8 PASS 2 FAIL;
  (b) AGENTS.md "Hermes bridge repair (2026-09-26, P2 lane, Nolan-authorized)"
  records the rebuild per INTEGRATION.md and claims the 8-condition proof
  re-passed after moving to the persistent path
...[truncated 2681 chars]