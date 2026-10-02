# ORCA FINISH — Wave 1, Lane C7 (MISSION-CONTROL AUDIT) — CHECKPOINT

Session: b1cb154b-517b-4c7a-92d2-912a841b307d | Started: 2026-09-23 ~19:30 MDT
Attempt: RETRY after infra daemon restart (first attempt wrote nothing).

## Objective
Audit what Mission Control renders TODAY: what is real state vs invented vs missing.
Prior fact to re-verify: 2026-09-18 forensic found dashboard closure outputs were synthetically fabricated.

## Plan
1. Locate Mission Control UI source in Pig website repo `/home/nolan/projects/ping` (branch fyd-factory) via `~/workspace/pig/pigwsl-run.sh`. Search for mission control / dashboard / run status components.
2. Trace each displayed field back to its data source (API route -> backend query).
3. Inspect Pig backend `/home/nolan/ping`: find projection/API endpoints Mission Control reads; check whether each returned field comes from a real query (ping_events, ping_missions, etc.) or is synthesized/defaulted in code.
4. Check local sandbox `~/workspace/tenanos-wave/` for TenantOS convergence notes on Mission Control.
5. For each observability field (objective, principal, run status, work graph, ready, running, blocked, completed, attempts, agent/model, tools, capabilities, checkpoints, effects, receipts, unknowns, artifacts, tests, commits, failures, retries, next selected work) record: displayed? / data source / REAL / SYNTHESIZED / MISSING with code evidence.
6. Deliverables in `~/workspace/orca-finish/wave1/mission-control/`:
   - CHECKPOINT.md (this file; append incrementally)
   - MISSION-CONTROL-AUDIT.md (final per-field table + synthesized-removal list)

## Safety
READ-ONLY. No commits/resets/cleans/restores/checkouts/adds/pushes/branch changes/deletions/history rewrites. Never touch `/home/nolan/projects/ping-constitutional`. Bounded Pig commands. Write NOTHING into repos. All notes go to `~/workspace/orca-finish/wave1/mission-control/`.

## Findings log
(append below as work proceeds)

### 19:30 — Start
- Checkpoint file written first. Next: locate Mission Control UI source in the website repo.

### 19:35 — Website repo (/home/nolan/projects/ping, fyd-factory @ e48ef710)
- No Mission Control run-observability UI exists. "dashboard"/"mission" hits are media-pipeline status (src/lib/system-status.ts, src/lib/metrics.ts — constitutional score dashboard, not runs) and ui architecture components. No run status / work graph components anywhere in src/.
- Conclusion: the website repo has NO run Mission Control surface to audit.

### 19:40 — Backend (/home/nolan/ping, refactor/runtime-authority-convergence @ cc6856c3)
- Mission Control = gateway routes `gateway/routes/mission_control.js` (681 lines), mounted at `/mc` (gateway_runtime.js:810). Business-question widgets + mission endpoints, all gated by requirePG (503 + degraded when PG/services absent). Honest fail-closed design.
- Mission endpoints: /dashboard, /missions/active, /missions/pending, /missions/stats, /missions/:id/trace, /system, /scheduler, /workers, /bridge, /replay/stats, /witness/stats, /dead-letters/*.
- Backed by MissionRuntime (ping-runtime/orchestration/mission_runtime.js, 412 lines): real SQL against ping_missions (columns: mission_id, mission_type, status, priority, payload, result, assigned_to, created_by, created_at, started_at, completed_at, error, retries, retry_at, lease_until, claimed_at).
- Scheduler getStats: real counters + `scope: 'session'` literal. Worker getStats: per-worker status/running/maxConcurrent/totalProcessed/totalFailed/lastHeartbeat/eventTypes/capabilities — REAL, session-scoped.
- brainos/orchestration/src/mission_control/app.py (1614 lines, dated 2026-06-22) is an older system-observability FastAPI (infra/memory/model-capability/backup), NOT run observability. Out of scope for the run fields.
- ui-next MissionControlHeader.tsx: `// Simulate runtime updates` — Math.random() latency/contextUsage, hardcoded model 'qwen3-coder', gateway 'healthy', ollama 'connected'. FABRICATED, but it is the chat UI header, not run observability.

### 19:50 — Fabrication re-verification (2026-09-18 "dashboard closure outputs synthetically fabricated")
- Closest current analog: ping-runtime/orchestration/dashboard.js ExecutiveDashboard velocity block: `closure_rate`/`engineering_velocity`/`worker_efficiency` return 0 when no data (`> 0 ? ... : 0`), and every field is `|| 0`-defaulted when sources are absent. A 0% closure rate is indistinguishable from "no merge data". RE-VERIFIED: pattern still present in current source. Original 2026-09-18 evidence file not located (no "dashboard" hits under evidence/2026-09-18/).
- Additional synthesis: getStats() calls add hardcoded `scope: 'persistent'` / `scope: 'session'` literals; /mc/dashboard clamps negative business metrics to 0 ("Ensure no negative values") — masks event inconsistencies instead of surfacing them (window/cap honestly labeled via totalEvents/truncated).

### 20:00 — TenantOS convergence notes (~/workspace/tenanos-wave)
- swarm-02/ENGINE-INVENTORY.md (2026-09-23) independently documents the exact gaps: G-01 no ping_mission_attempts (retries counts failures not claims; claimed_at/started_at overwritten; two executions indistinguishable); G-03 complete() updates row before emitting MISSION_COMPLETED (row-vs-journal divergence); G-04 no depends_on edges / no ready-set query (DAG-by-convention); G-05 zero checkpoint matches in ping-runtime.
- Independently re-verified each with bounded greps: zero "checkpoint" matches in ping-runtime JS, zero "ping_mission_attempts", zero "depends_on".

### 20:05 — Per-field table compiled into MISSION-CONTROL-AUDIT.md. Inspection count ~30. Done; writing deliverable.
