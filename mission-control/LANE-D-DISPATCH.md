# Lane D: Mission Control dispatch UI/API — ledger

**Date:** 2026-09-26 · **Branch:** `fyd/sprint-integration-2026-09-24` (working branch; the
`fyd-factory` branch from the 2026-09-24 notes is no longer the checkout) · **No push.**

## What was built (additive, namespaced only)

Repo `/home/nolan/projects/ping`, all under the Lane D ownership surface:

- `src/app/api/mc/_lib/mc-dispatch.ts` (new) — journal I/O, deterministic mission
  projector, artifact publisher, adapter-shim caller. No new store, no new authority.
- `src/app/api/mc/dispatch/route.ts` (new) — `GET` dispatch catalog (agents/capabilities
  from the live adapter), `POST` witnessed dispatch.
- `src/app/api/mc/missions/route.ts` (new) — mission list, projected live from the journal.
- `src/app/api/mc/missions/[id]/route.ts` (new) — mission detail (agent, run, execution,
  start/end, capabilities granted, artifacts, evidence, events, result, reconciliation).
- `src/app/mission-control/page.tsx` (additive edit) — new `DISPATCH` tab + `DispatchPanel`:
  [New Mission] form (Prompt, Identity/Tenant, Agent, Capabilities) → [Dispatch];
  mission list with status badges; detail view.

Support glue (NOT in the repo, not an authority):
- `/home/nolan/workspace/mission-control/lane-d/adapter-call.js` — thin transport to the
  EXISTING `ExternalAgentAdapter` (`/home/nolan/worktrees/orca-autonomy/ping-runtime/
  external-agent/external_agent_adapter.js`): `profiles` / `authorize` / `issue` / `verify`.
  The adapter owns every decision; the shim only forwards.
- Artifacts: `/home/nolan/workspace/mission-control/artifacts/<mission_id>/`
  (prompt.txt, workorder.json, context.json, result.json), each published via
  `MC_ARTIFACT_PUBLISHED` with sha256.
- Events: `MC_*` types appended to the EXISTING journal
  `/home/nolan/workspace/fyd-journal-gateway/events.jsonl` (same envelope as `emit.py`).

## Dispatch flow (POST /api/mc/dispatch)

Validate fail-closed (prompt 1–2000 chars; agent ∈ {ollama, identity_1..4} — identity_5..10
DENIED; tenant ∈ {happy-place, coppersmith-plumbing}; capability ∈ agent's adapter
allowlist; namespace `tenant::<id>`) → adapter `authorizeWorkOrder` (denial → 403 +
`MC_AGENT_DENIED`, mission state DENIED, never FAILED) → adapter `issueWorkOrder` →
`MC_MISSION_CREATED` / `MC_RUN_QUEUED` / `MC_EXECUTION_STARTED` / `MC_AGENT_AUTHORIZED` →
artifacts → execute via the agent's proven transport (ollama: `POST 127.0.0.1:11434/
api/generate` qwen2.5-coder:1.5b; identity_1..4: quota pre-check + proven
`copilot-broker/dispatch-task.js` caller) → build 8-field result envelope → adapter
`verifyResultEnvelope` → terminal event:

- valid + completed → `MC_RUN_SUCCEEDED`
- valid + agent-reported failure, or prompt never delivered (transport error) → `MC_RUN_FAILED`
- deadline exceeded, broker blocked/timed-out, or envelope fails verification →
  `MC_RUN_UNKNOWN` with `reconciliation_state: "RECONCILIATION IN PROGRESS"`

Timeouts never render as FAILED. UNKNOWN is terminal-informative, never collapsed.

## Acceptance-path evidence (per step, all live on :3100)

| Step | Evidence |
|---|---|
| Real bounded prompt entered | `prompt.txt` artifact `mc-m-63d04f4517f9` contains the submitted prompt |
| Authorized headless agent selected | `ollama` (adapter status LIVE); catalog offers exactly `ollama, identity_1..4` — `identity_5` absent from catalog, `POST` as `identity_5` → 403 `agent_denied`; bad capability (`email.send`) → 403 `capability_denied` |
| Dispatch → mission/run/execution created | `mc-m-63d04f4517f9`, run `…-r1`, execution `…-x1`, work_order `4c2f…` (adapter-issued, `sha256('workorder:'+taskId)[0:16]`) |
| Agent receives prompt/context | ollama `/api/generate` called with the prompt; `workorder.json` input echoes prompt digest; result envelope `evidence.model=qwen2.5-coder:1.5b` |
| Artifact/result produced | 4 artifacts w/ sha256: prompt, work-order, context, result |
| Evidence links result to execution | `result.json` carries `mission_id` + `run_id` + `execution_id` + `work_order_id` matching the mission record |
| Event plane records lifecycle | journal holds `MC_MISSION_CREATED, MC_RUN_QUEUED, MC_EXECUTION_STARTED, MC_AGENT_AUTHORIZED, 4×MC_ARTIFACT_PUBLISHED, MC_RUN_SUCCEEDED` for the mission |
| Projection updates | `GET /api/mc/missions/<id>` → `SUCCEEDED` with full detail |
| Refresh preserves state | mission detail byte-identical (minus `as_of`) across a full :3100 restart (stop → start-3100.sh → re-GET) |
| Replay reconstructs state | two consecutive projections of the same journal → byte-identical JSON |

## Concurrency proof

Two `POST /api/mc/dispatch` in parallel (`mc-m-c3dc03efaf23` tenant coppersmith-plumbing,
`mc-m-58d7ad5e332e` tenant happy-place, both `text.transform`): distinct mission/run/
execution/work-order ids, distinct artifact dirs, zero shared event ids, per-mission
`context.json` tenant correct, both `SUCCEEDED`. No collision on identity, run,
execution, workspace, artifacts, or events.

## UNKNOWN first-class (proven, incl. a real bug found and fixed)

- Synthetic probe `mc-m-test-unknown-02` (`MC_RUN_UNKNOWN`) → API renders `status:
  UNKNOWN`, `reconciliation_state: "RECONCILIATION IN PROGRESS"`, never FAILED/NO_MATCH.
  UI badge + the mandated `OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS` string in the bundle.
- **Bug found by the proof:** the first probe (`mc-m-test-unknown-01`) rendered CREATED —
  two same-timestamp events sorted by `event_id` applied out of causal order
  (`MC_RUN_UNKNOWN` before `MC_MISSION_CREATED`). Fixed in the emitter, not the
  projector: `appendDispatchEvent` now guarantees strictly increasing per-mission
  acceptance timestamps (+1ms bump on ties). Rebuilt, restarted, re-probed → UNKNOWN
  correct. The `-01` mission remains in the journal as labeled synthetic evidence of the
  hazard. Live timeout→UNKNOWN emission path is code-present (deadline branch) but has
  not been live-fired; broker transports (identity_1..4) are implemented + quota-gated
  but acceptance-proven only on ollama (zero spend; no quota consumed).

## Ops record

- `npm run build` green (exit 0) twice; routes `/api/mc/dispatch`, `/api/mc/missions`,
  `/api/mc/missions/[id]` in build output.
- :3100 restarted ONLY via `/home/nolan/start-3100.sh` from non-PTY ssh, twice;
  `NEXT_PUBLIC_FYD_DEMO_OWNER_MODE=1` verified live in the server process env both times.
- :3103/:3104 untouched. No FYD files touched. No push. No credentials, no spend, no
  external contact.

## Lane C coordinator note — decision (no action)

Lane C reported (a) gateway ORCA ExecutionEngine live-but-orphaned (`executor: null`,
`dispatchToAssignment` never calls `execute()`, no PING events) and (b) a stale comment
at `worker_runtime.js:10`. **Decision: no action — both are outside Lane D's patch
surface** (Lane A owns WorkerRuntime; my lane is additive `mission-control/` + `api/mc/`
only, and the constraints forbid editing Lane A's files). Lane D's dispatch path does
not route through the gateway ExecutionEngine (it uses adapter authorize/issue →
agent transport → adapter verify → journal events), so the orphaned engine does not
affect this acceptance path. Flagged for Lane A.

## What remains unverified / for follow-up

1. Live timeout→UNKNOWN firing (deadline branch) — code-present, not live-fired.
2. Broker transports identity_1..4 — implemented, quota pre-check fail-closed, marked
   PROTOTYPE in the catalog; no quota spent in this lane.
3. Hermes agent — adapter says LIVE but not offered in this slice's catalog (transport
   not re-verified in this lane).
4. Journal divergence: sandbox `~/workspace/fyd-journal-gateway/events.jsonl` (14 events,
   backfill) vs Pig's (7 + new dispatch events). The :3100 projection reads the Pig's
   copy; unification is out of scope for this lane.
5. Phone-viewport check of the DISPATCH tab — needs browser delegation (subagent cannot
   operate the live browser).
6. UI `GET /api/mc/dispatch` catalog failure mode renders an error string (fine), and
   the pre-existing TODAY/AGENTS tabs still 404 their (uncommitted, lost) routes —
   pre-existing, not this lane's.
