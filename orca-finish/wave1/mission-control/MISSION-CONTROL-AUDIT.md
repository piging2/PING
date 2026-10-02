# MISSION CONTROL AUDIT — Wave 1, Lane C7 (ORCA FINISH)

Date: 2026-09-23. Scope: what Mission Control renders TODAY — real state vs invented vs missing.
Retry after daemon restart; all findings re-verified against current source this session.

## What "Mission Control" is (verified)

1. **Pig website repo** `/home/nolan/projects/ping` (fyd-factory @ e48ef710): NO run-observability Mission Control UI exists. The only "dashboard"/"mission" hits are media-pipeline status (`src/lib/system-status.ts`, `src/lib/metrics.ts` — a constitutional-score dashboard, not runs). There is no run-status / work-graph component in `src/`.
2. **Pig backend** `/home/nolan/ping` (refactor/runtime-authority-convergence @ cc6856c3): the live Mission Control is the gateway API `gateway/routes/mission_control.js` (681 lines), mounted at `/mc` (`gateway/bootstrap/gateway_runtime.js:810`). It is API-only; there is no rendered run-dashboard UI consuming it in either repo. "MISSION CONTROL RENDERS THIS" = the `/mc/*` JSON responses.
3. `brainos/orchestration/src/mission_control/app.py` (2026-06-22 FastAPI) is older system-observability (infra/memory/models/backup), not run observability — out of scope for the per-run fields.

## Per-field verdicts

Legend: **REAL** = backed by a live query against ping_events / ping_missions / runtime state.
**SYNTH** = defaulted/fabricated in code (quoted). **MISSING** = no source exists.

| # | Field | Displayed by Mission Control? | Data source | Verdict | Evidence (one line) |
|---|---|---|---|---|---|
| 1 | objective | Yes (inside payload) | `ping_missions.payload` JSONB via `/mc/missions/active`, `/pending`, `/:id/trace` | REAL (creator-dependent) | `SELECT * FROM ping_missions ...` returns payload; no dedicated objective column, so it only exists if the creator wrote `payload.objective`. |
| 2 | principal | Yes | `ping_missions.created_by` | REAL (often null) | Column is real SQL, but nullable — `INSERT ... created_by ... options.createdBy \|\| null`. Unattributed missions render with no principal. |
| 3 | run status | Yes | `ping_missions.status` (`created/assigned/running/completed/failed/retry_pending`) | REAL, with divergence caveat | Real column, conditional transitions. Caveat G-03: `complete()` sets row=`completed` BEFORE emitting `MISSION_COMPLETED`; if emit fails, row truth and journal truth silently diverge (swarm-02 ENGINE-INVENTORY §2b, re-verified in `mission_runtime.js`). |
| 4 | work graph | No | — | MISSING | Zero `depends_on` in ping-runtime (verified); G-04: ordering is "DAG-by-convention, not data"; no ready-set query, no cycle rejection. |
| 5 | ready work | Yes | `/mc/missions/pending` → `WHERE status='created' OR (status='retry_pending' AND retry_at<=NOW()) ORDER BY priority DESC, created_at ASC` | REAL | Direct SQL in `mission_runtime.js:getPending`. |
| 6 | running work | Yes | `/mc/missions/active` → `WHERE status IN ('assigned','running')` | REAL | Direct SQL in `getActive`. |
| 7 | blocked work | No | — | MISSING | No `blocked` status exists; `retry_pending` is scheduled-backoff, not blocked. Nothing distinguishes "waiting on dependency/approval". |
| 8 | completed work | Count only | `/mc/missions/stats` → `GROUP BY status` counts | REAL count / MISSING list | Counts are real SQL; there is no `/missions/completed` list endpoint. |
| 9 | attempts | Yes, as `retries` | `ping_missions.retries` | PARTIAL — wrong semantics | Real stored integer, but G-01: `retries` counts failures, not claims; `claimed_at`/`started_at` are overwritten per claim; no `ping_mission_attempts` table (verified: zero matches). Two physical executions of one mission are indistinguishable. What renders does NOT answer "how many attempts". |
| 10 | agent/model | Worker name yes; model no | `ping_missions.assigned_to` | REAL (name) / MISSING (model) | `assigned_to` is a real worker-name string. No model column; per-worker `capabilities` exist in `worker_runtime.getStats()` (session-scoped, REAL) but are never joined to a mission. |
| 11 | tools | No | — | MISSING | No tool-usage tracking in mission schema or events. |
| 12 | capabilities | No per-run | worker_runtime session stats only | MISSING per-run | `getStats()` returns per-worker `capabilities` (REAL, session scope) — not attached to any mission/run. |
| 13 | checkpoints | No | — | MISSING | Zero `checkpoint` matches in ping-runtime JS (verified); G-05. Only bridge consumer-offset cursors exist as a pattern, not exposed per mission. |
| 14 | effects | No (as a named field) | `ping_missions.result` JSONB could carry them | MISSING as a field | `result` JSONB exists (with `duration_ms` injected by `complete()`), but there is no effects contract and `getTrace` does not surface effects. |
| 15 | receipts | No | — | MISSING | No receipt construct in schema, events, or trace. |
| 16 | unknowns | No | — | MISSING | No unknown/uncertainty field anywhere in mission schema. |
| 17 | artifacts | No (mission-linked) | `ping-runtime/orchestration/artifact_store/` exists standalone | MISSING as mission-linked | `getTrace` returns `{mission, correlation_id, events, eventCount}` only — artifacts are never joined. |
| 18 | tests | No | — | MISSING | No test field in mission schema or trace. |
| 19 | commits | No | — | MISSING | No commit/SHA field in mission schema or trace. |
| 20 | failures | Yes | `ping_missions.error` TEXT + `MISSION_FAILED` events + `/mc/dead-letters*` | REAL | `error` column set by `fail()`/`failWithRetry()`; dead-letter endpoints honestly 404/degrade when absent. |
| 21 | retries | Yes | `ping_missions.retries` | REAL | Real counter incremented in `failWithRetry` with backoff (`retry_at`) and exhaustion (`max_attempts`→`failed`). |
| 22 | next selected work | Implicit only | `/mc/missions/pending` ordering | REAL (implicit) | `ORDER BY priority DESC, created_at ASC` defines "next", but no endpoint labels it "next"; consumer must take row 1. |
| 23 | (cross-cutting) row vs journal | — | `ping_missions` vs `ping_events` | DIVERGENCE RISK | G-03: `complete()` updates the row before emitting; `/mc/missions/*` read rows, `/mc/activity` reads the journal. The two can disagree and neither endpoint says so. |

### Endpoints that are honestly fail-closed (verified, no synthesis)
- All PG-backed routes: `requirePG` → 503 `{error:'Postgres unavailable', degraded:true}`.
- `/mc/bridge`, `/mc/scheduler`, `/mc/workers`, `/mc/event-mission-bridge`: return `{status:'degraded', message:...}` when the service is uninitialized.
- `/mc/dead-letters/:id`: 404 when absent.
- `/mc/dashboard` business metrics derive from real event counts with honest truncation metadata (`totalEvents`, `truncated`, window, cap).

## SYNTHESIZED fields — must be removed or re-backed before Mission Control can claim to project a run

1. **`ExecutiveDashboard` velocity block** (`/home/nolan/ping:ping-runtime/orchestration/dashboard.js`, `generate()`): `closure_rate`, `engineering_velocity`, `worker_efficiency` evaluate to `0` when there is no data (`(mergedCount + rejectedCount) > 0 ? ... : 0`), and every field in the report is `|| 0`-defaulted when its source object is absent. A reader cannot distinguish "0% closure" from "no merge data". **Re-verification of the 2026-09-18 forensic** ("dashboard closure outputs were synthetically fabricated"): the pattern is still present in current source. It is not a fixed fake number, but it synthesizes a value (0) where the honest answer is "no data". Fix: emit `null`/`"no_data"` with the reason, per the file's own sibling standard in `mission_control.js` ("If a widget has no data, it returns empty with the precise upstream reason").
2. **`MissionControlHeader.tsx`** (`/home/nolan/ping:CascadeProjects/infra/ui-next/src/components/MissionControlHeader.tsx`): `// Simulate runtime updates` — `latency: Math.random() * 100 + 50`, `contextUsage: Math.random() * 4096`, hardcoded `model: 'qwen3-coder'`, `gateway: 'healthy'`, `ollama: 'connected'`. Pure fabrication. (Scope note: this is the chat UI header, not run observability — but it is the only "Mission Control"-named UI surface, and it invents everything it shows.)
3. **Hardcoded `scope` labels in stats**: `mission_runtime.getStats()` appends `scope: 'persistent'`; `mission_scheduler`/`worker_runtime`/`event_to_mission_bridge` `getStats()` append `scope: 'session'`. Literals, not queried. Low severity, but they are asserted provenance that is not measured — remove or derive.
4. **`/mc/dashboard` negative-clamp**: `for (const k of Object.keys(business)) { if (business[k] < 0) business[k] = 0; }` — masks event-count inconsistencies (e.g. more `INVOICE_PAID` than `INVOICE_SENT`) instead of surfacing the anomaly. Re-back by emitting the raw value plus an `anomaly` flag, or drop the metrics that can go negative.

## What is MISSING before "one query explains a run" is true

No single endpoint answers all 23 fields today. The closest, `/mc/missions/:id/trace`, returns `{mission, correlation_id, events, eventCount}` — real, but silent on: work graph (4), blocked work (7), attempts vs retries (9), model (10), tools (11), capabilities per-run (12), checkpoints (13), effects (14), receipts (15), unknowns (16), mission-linked artifacts (17), tests (18), commits (19). Filling these requires: `ping_mission_attempts` (G-01), `depends_on` edges + ready-set query (G-04), checkpoint emission (G-05), and artifact/test/commit linkage in the trace — all of which the TenantOS convergence notes (swarm-02 ENGINE-INVENTORY.md, 2026-09-23) already specify as invention-required.

## Inspection count
~30 bounded inspections: website repo greps (6), `mission_control.js` (4 reads), `mission_runtime.js` (full read), `mission_scheduler.js` (2), `worker_runtime.js` (1), `event_to_mission_bridge.js` (2), `app.py` (2), `dashboard.js` (2), evidence/2026-09-18 greps (4), tenanos-wave notes (4), route mount verification (1), ui-next (3), website metrics/system-status (2).

## Open questions / blockers
1. No rendered run-dashboard UI exists in either repo — if the ORCA finish criteria require a *rendered* Mission Control (not just the `/mc` API), that UI does not exist and this audit covers the projection layer only.
2. The original 2026-09-18 forensic artifact was not located (no "dashboard" hits under `/home/nolan/ping/evidence/2026-09-18/`); the re-verification above is against the closest current analog (`ExecutiveDashboard` closure/velocity outputs).
3. `payload` is schemaless: whether "objective" is answerable depends on each mission creator writing `payload.objective`. No contract enforces it.
4. Row-vs-journal divergence (G-03) means `/mc/missions/*` (row truth) and `/mc/activity` + trace events (journal truth) can disagree silently; any consumer combining them should reconcile.
