# Phantom Hunt — Checkpoint (ORCA FINISH Wave 1, Lane C5, RETRY)
Started: 2026-09-23 ~19:29 MDT (session 19d32634). First attempt died in infra daemon restart with no checkpoint; nothing was written.

## Mission
Hunt phantom mechanisms in PING backend (/home/nolan/ping, branch refactor/runtime-authority-convergence, READ-ONLY, 17 dirty files — do not touch) and CRX (/home/nolan/crx/app), all via `~/workspace/pig/pigwsl-run.sh`. Classification only: KEEP / WIRE / MERGE / DELETE / ARCHIVE. No deletions, no edits, no git mutations.

## Plan
1. Verify Pig access + git state of both repos (SHA, branch, dirty count).
2. Grep sweep A: execution-path phantom keywords — synthetic, fabricated, mock, stub, TODO, FIXME, no-op, placeholder, hardcoded, "not implemented".
3. Grep sweep B: scheduler/autonomous-loop claims — cron, schedule, dispatcher, executor, daemon, loop, worker, "run_" entries.
4. Grep sweep C: duplicate authorities — two classes claiming same sovereign capability (ProjectionAuthority, IdentityAuthority, etc.).
5. Grep sweep D: zero-caller symbol verification (cross-check key exported symbols).
6. README claim audit: ORCA/orca-cli READMEs vs source reality (MCP/DAG/claiming already falsified 2026-09-18).
7. Classify each finding into PHANTOM-REGISTRY.md + KEEP list with boundaries.
8. Checkpoint appends every ~15 min.

## Findings log (appended as found)

## 19:45 MDT — first three confirmed phantoms (pig cc6856c3, branch refactor/runtime-authority-convergence, 17 dirty files)
- P-1 prompt-only execution engine: `ping-runtime/orchestration/execution/engine.js` registers ONE worker port with `executor: null` (line 93-96); `WorkerPort.execute()` has ZERO production callers (grep `.execute(` across repo: no WorkerPort.execute caller); `dispatchToAssignment()` never calls `.execute()` — builds prompt, stores prompt artifact, returns prompt to completionHandler. 2026-09-18 forensic "dispatch returns no_executor" verified live.
- P-2 duplicate single-authority claim: `ping-runtime/agents/worker_port.js` ("Constitutional Port", header claims "Single worker authority for all worker operations") has ZERO require() callers; it is a second WorkerPort coexisting with orchestration/execution/worker_port.js.
- P-3 fabricated autonomous loop: `gateway/continuous_reflection_loop.js` (321 lines, Ω.25 "the runtime literally learns from itself") — zero instantiations, zero require() callers anywhere. Fully written, never run.
- CRX app (/home/nolan/crx/app, NOT a git repo — no SHAs possible): 121-line FastAPI event store; `print(app.routes)` debug leftover at module level; DATABASE_URL shown redacted in wrapper output (unverifiable from this channel; note in registry).
Next: scheduler reality, dashboard fabrication claim, mock/synthetic sweep, zero-caller audit, README claims, authority duplicates.

## 19:55 MDT — more results
- Scheduler (ping-runtime/orchestration/execution/scheduler.js): REAL — functioning assignment algorithm. Not a phantom.
- Dashboard (ping-runtime/orchestration/dashboard.js): genuine aggregation over graph/queue/certifier inputs, no hardcoded numbers. KEEP-with-caveat (velocity metrics measure an engine that never executes — the metrics are real computations over mostly-empty streams).
- agents/worker_port.js references `CustomWorkerProvider (current)` — need to check whether that provider exists anywhere.
Next: TODO/synthetic sweep on execution paths; README/documentation-only audit; autonomy challenge library PHANTOM note; zero-caller audit of remaining execution classes.

## 20:05 MDT
- Challenge-library "PHANTOM: canonical run identity + attempt identity" refers to orca-remediation/orca_control_loop.js v1 (RUN_ID used as identity; v2 fixed with record-before-dispatch, M-3). Outside mandated scope (not in /home/nolan/ping or /home/nolan/crx/app) — will note as context only.
- Two schedulers coexist: `ping-runtime/orchestration/mission_scheduler.js` (Core v1, wired into gateway/routes/mission_control.js — alive) and `ping-runtime/orchestration/execution/scheduler.js` (ORCA engine, alive within engine). KEEP-with-boundary: different substrates (MissionRuntime/WorkerRuntime vs WorkerPortRegistry); no live conflict because ORCA dispatch never executes (P-1).
Next: duplicate class-name scan; zero-caller audit of remaining execution classes; README documentation-only audit.

## 20:15 MDT
- P-4 duplicate IdentityAuthority: 4 declarations. Live paths use (a) compiled `gateway/constitutional-dist/identity-authority.js` (required by routes/identities.js, social_ingest_adapter.js, knowledge_ingest_adapter.js — bypasses kernel) and (b) `ping-runtime/authorities/identity_authority.js` (extends KernelIdentityAuthority, required by ping-runtime/gateway modules). `runtime/constitutional/dist/` is a second compiled copy with ZERO requirers. Two different dist builds, two different hashes. CLASSIFY: MERGE (single source-owned authority; dist = build output, not committed source).
- P-5 dead copy: `gateway/replay/kernel/witness_authority.js` — 0 requirers, near-duplicate of `runtime/kernel/authorities/witness_authority.js` (197 vs 191 lines). CLASSIFY: DELETE candidate.
Next: dist dir size; execution-class caller audit; README audit; autonomy-challenge M-3 context recorded (scope-adjacent only).

## 20:25 MDT — P-7 SMOKING GUN (fabricated autonomous loop)
- `ping-runtime/orchestration/execution/engine.js:579-648` `startAutonomousLoop()` — for each dispatched mission it FABRICATES worker output inline: `findings: [{file: mission.target || 'x', line: 0, bypass_type: 'auto_scan', confidence: 0.85}], confidence: 0.85`. No worker runs, no prompt executes, no LLM called. Then `collectWorkerOutput` + `_resolveMission` (consensus) run over the synthetic outputs, producing dashboard closure rates. Exposed via live HTTP endpoint POST /orchestration/engine/loop. This is the 2026-09-18 "synthetically fabricated dashboard closure" finding, verified in current source.
- CORRECTION to earlier checkpoint: the ORCA engine is NOT an unwired island — gateway_runtime.js:339 initializes it and mounts /orchestration routes. It is INTENTIONALLY a parallel non-executing authority per DOC-CONTRACT at gateway_runtime.js:326-336 (discoverOllama kept false until Orca-vs-live-spine convergence decision). So the engine itself = KEEP (Nolan prohibited deleting ORCA; in-repo contract). The fabricated loop + dead-code paths inside it are the DELETE candidates.
Next: README documentation-only audit; git history deleted-but-referenced check; then write registry.

## 20:35 MDT — FINAL
- All sweeps complete. PHANTOM-REGISTRY.md written with 8 phantoms (P-1..P-8), 8-item KEEP list, context notes, open questions.
- Summary: prompt-only execution engine (P-1), duplicate WorkerPort single-authority claim (P-2), fabricated never-run reflection loop (P-3), competing IdentityAuthority live paths + dead dist copy (P-4, MERGE), dead WitnessAuthority copy (P-5), dead worker subclasses (P-6), fabricated autonomous-loop success path on a LIVE endpoint (P-7), CRX debug leftover (P-8). Engine-as-a-whole = KEEP per in-repo DOC-CONTRACT + Nolan's no-delete-ORCA order.
- Resumability: registry is complete and self-contained. No in-progress sweeps.
