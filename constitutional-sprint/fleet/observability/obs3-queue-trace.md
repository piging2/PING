# OBS3 — Worker & Queue Traceability (mechanism-level trace)

**Worker:** OBS3 (queue/worker trace). **Scope:** `/home/nolan/ping` @ `refactor/runtime-authority-convergence` (PRIMARY, read-only). **Date:** 2026-09-23 ~20:30 MDT.
**Method:** code reads + live read-only probes (SELECTs on `ping_runtime` DB, GETs on `:8080/mc/*` and `/health`). No writes, no restarts, no secrets printed.
**Note for Agent 12:** this is the mechanism trace (how each queue/worker behaves on failure); verdicts/recovery posture belong to Agent 12.

## Live queue/worker topology (confirmed)

```
ping_events (2429 rows, all processed=FALSE — dead column, see F3)
  ├─ in-process .on() handlers (synchronous, inside UnifiedEventRuntime.emit)
  │    ├─ EventToMissionBridge → creates rows in ping_missions (471 completed live)
  │    └─ EmbeddingService subscriber → Qdrant projection
  ├─ IntegrationManager → posthog / email / sms providers (synchronous fan-out)
  └─ (secondary tables, both EMPTY live: repository_events=0, canonical_events=0)
       └─ EventBridge 5s poll (batch 50) → re-emit into ping_events (0 bridged live)

ping_missions → MissionScheduler poll (5s, maxConcurrent=3) → WorkerRuntime.dispatch
  → canonical workers: observation, claim, classification, recommendation,
    projection, replay, witness, lineage (+ optional knowledge-promotion; intelligence DORMANT by design)
  → each worker emits the next event via UnifiedEventRuntime.emit → next mission (chain)
Failure path: retry (persistent, ping_missions.retries) → exhaustion → repository_dead_letters
```

## Visibility matrix — can an operator see it RIGHT NOW?

| Queue / worker | Depth | Lag | Failures | Dead letters | Verdict |
|---|---|---|---|---|---|
| EventBridge 5s poll (secondary tables → ping_events) | NO depth metric. `/mc/bridge` shows running/pollInterval/cursors but no backlog count. (Both source tables are 0 rows right now, so this is latent, not live.) | Cursor position exposed (`lastRepoEventId`, `lastCanonicalEventId`) but no "events behind cursor" count. | `errors` counter only, session-scoped, in-memory. | n/a — failed items never reach the DLQ (see P0-1). | PARTIAL — running/health visible, depth+lag not. |
| IntegrationManager (posthog/email/sms) | n/a (sync fan-out) | n/a | Per-integration `errorCount` + 1000-entry in-memory event log; surfaced in `/health` `components.integrations`. | n/a | YES for failure counts; NO retry/DLQ exists. |
| In-process `.on()` handlers (EventToMissionBridge, EmbeddingService) | n/a | n/a | Emit step 6 catches handler throws → `console.error` only, **no counter at all**. Bridge's own `_handleEvent` catches → `stats.failed++` (session). | n/a | NO — failures are log-only; a mission-creation failure is invisible except in docker logs. |
| ping_missions → MissionScheduler → WorkerRuntime | **YES**: `/mc/missions/stats` = persistent SQL `GROUP BY status` (live: 471 completed, 0 pending/running). | Scheduler stats (session): dispatched/completed/failed/skipped, `processing` count. No explicit staleness/backlog-age metric. | Per-worker `totalFailed` + scheduler `failed` (session). `WorkerRuntime.health()` has a 60s stale threshold but is **not HTTP-exposed**; `/mc/workers` shows raw `lastHeartbeat` timestamps only. | **YES**: `repository_dead_letters` table + `GET /mc/dead-letters`, `/dead-letters/stats`, `/dead-letters/:id`. Live: 0. | YES — best-observed queue in the system. |
| Replay / Witness | counts via `/mc/replay/stats` (REPLAY_COMPLETED verified/unverified/by_reason; live 66/66 verified, kernel_verified) and `/mc/witness/stats` (66 attestations, 0 refusals); `/mc/replay/trace/:correlationId` for chain forensics. | Provider stats (session): replays_processed=9, events_replayed=9, failures=0. | `witness_rejected` count + provider `failures`. | n/a | YES — event-derived, no fabricated verdicts. |
| Embedding/Qdrant projection | stats in `/health`: embedded/fallback/failed/projected (session). | No lag metric. | `failed` count (session). | n/a | PARTIAL — counts exist, no lag, no retry. |
| DB / pool health | `/health`: gateway uptime/memory, integration status. **pg pool saturation (total/idle/waiting clients) is not exposed anywhere.** | n/a | n/a | n/a | PARTIAL — process health yes, DB-connection health no. |

## Failed-item fates (the core question)

**P0-1 — EventBridge per-item failure = SILENT DROP.** `event_bridge.js` `_bridgeRepositoryEvents` / `_bridgeCanonicalEvents`: a per-row `emit()` failure is caught, `console.error` + `stats.errors++`, but the cursor `this._lastRepoEventId = rows[rows.length - 1].event_id` advances past the whole batch **including failed rows**. Next poll's `WHERE event_id > <cursor>` skips them forever. For `canonical_events` the row stays `processed=FALSE` but the cursor still passes it. So the "secondary tables converge into ping_events" guarantee is broken under any bridge-time failure (validation error, governance rejection, DB hiccup). No retry, no DLQ, no durable error record. Currently latent (both source tables empty), live the moment they get rows.

**P0-2 — In-process handler throw in `emit()` = silent, uncounted.** `unified_event_runtime.js` step 6: `catch (err) { console.error(...) }` — no counter, no retry, no DLQ. If `EventToMissionBridge._handleEvent` throws (it has its own try/catch → `stats.failed++`, still log-only), the event stays durable in `ping_events` but **no mission is ever created** — the worker pipeline permanently skips it. The embedding-service handler path has the same fate. This is the live production chain (missions are flowing: 63 scheduler dispatches this session).

**OK — mission/worker failure path is sound.** `MissionScheduler._failMission` → `MissionRuntime.failWithRetry` (persistent: `ping_missions.retries`, `retry_pending`, `retry_at`; default max_attempts=3, backoff 5000ms) → exhaustion marks `failed` and `DeadLetterAuthority.recordDeadLetter` writes `repository_dead_letters` (with `RetryPolicy` failure classification + replayability flag). Lease reaper (`reapExpiredLeases` + Arrow-0 renewal) recovers crashed workers. This is the one queue with retry + DLQ + durable failure state.

**Gaps around the good path:**
- G1: DLQ is listable (`/mc/dead-letters*`) but `DeadLetterAuthority.replayDeadLetter()` has **no HTTP route** — dead letters can be seen but not replayed through the API.
- G2: every runtime stat except mission depth and DLQ is `scope: 'session'` — a gateway container restart (33h uptime now) zeroes bridge/worker/scheduler/integration counters.
- G3: `ping_events.processed` is a **dead column** — 2429/2429 rows FALSE, nothing live sets it (`mission_event_bus.js` sets it on the dormant `mission_events` table only). Any future "unprocessed queue" logic built on `ping_events.processed` is broken by default.
- G4: `WorkerRuntime.lastHeartbeat` updates only on dispatch completion; idle workers (observation: 0 processed) show boot-time heartbeats, i.e. permanently "stale" by the 60s rule if anyone reads `/mc/workers` naively. `health()` itself isn't HTTP-exposed.

## Alerting

**NONE.** Exhaustive grep over `gateway/`, `ping-runtime/events/`, `ping-runtime/workers/`, `ping-runtime/orchestration/` for alert/slack/pager/notify: the only hits are an SMS connector with an `'alerts'` *capability string* (connector-registry metadata, nothing sends through it on failure), a `TriggerTypes.MONITORING_ALERT` enum that is never fired, and the unwired `ControlCenterSubscription` (poll-and-notify, not instantiated in bootstrap). Failure visibility = `console.error` (docker logs) + session counters + the `/mc/*` read endpoints. No thresholds, no paging, no DLQ-growth alert, no stale-worker alert. **Log archaeology is the entire alerting story.**

## Dormant-but-present queue machinery (don't confuse with live)

- `gateway/mission_event_bus.js` (`mission_events` table): NOT wired in bootstrap. Its handler errors are `console.error`'d and then the row is **still marked `processed=TRUE`** — if re-enabled as-is, failures would be silent drops marked done.
- `workers/*.py` (claim/lineage/observation/projection/replay/witness_worker.py, worker_runtime.py): referenced only by `Dockerfile.worker-runtime`; no such container is running (gateway runs a single `node gateway/server.js`); the JS `canonical_workers` fleet is the live one.
- `ControlCenterSubscription`, `IntelligenceWorker` (dormant by doc-contract), Python `workers/` — not on any live path.

## Live numbers (2026-09-23 ~20:30 MDT, read-only)

- DB `ping_runtime`: ping_events=2429 (all unprocessed), canonical_events=0, repository_events=0, repository_dead_letters=0, ping_missions pending/running=0 (471 completed), mission_events=0, bridge cursors empty.
- `/mc/system`: bridge running (5s poll, 0 bridged, 0 errors); scheduler 63 dispatched / 63 completed / 0 failed; workers claim=9, classification=9 processed, rest idle.
- `/mc/replay/stats`: 66 replays, 66 verified (`kernel_verified`), 0 unverified; provider 9 processed / 0 failures. `/mc/witness/stats`: 66 attestations, 0 refusals. `/mc/dead-letters/stats`: 0 total.
- `/health`: healthy; integrations posthog/email/sms healthy, 0 events sent, 0 errors.

## Next adjacent gap (for the coordinator)

**No end-to-end chain-lag metric.** Per-stage counters exist (bridge, scheduler, per-worker, replay), but nothing measures "time from a business event's emission to its terminal LINEAGE_CREATED" — so a silently stalled chain (e.g. P0-2 dropping the mission-creation step) is indistinguishable from an idle system in every current stat. A cheap fix: timestamp-diff between the originating event and the terminal event per `correlation_id`, surfaced on `/mc/replay/trace/:correlationId` or a new `/mc/chains/lag` endpoint. Related: pg pool saturation is unexposed — a pool-exhaustion cascade would appear only as timeouts in logs.
