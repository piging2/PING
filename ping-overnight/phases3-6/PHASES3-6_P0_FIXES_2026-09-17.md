# PING Phases 3-6 P0 Fixes: Evidence Report
**Date:** 2026-09-17
**Agent:** single implementing agent, sequential phases
**Branch:** `constitutional-convergence-v2` @ `099927152b93e0de7c1a120bc88d73fb939c1502` (HEAD unchanged, no commits, no pushes)

## Constraints honored
- No commits, pushes, merges, resets, history rewrites, branch deletions, cleans, or destructive DB operations. `git status` went from 16 to 21 dirty lines (my 5 edited files); HEAD unchanged.
- No credential values printed at any point. Bearer tokens lived only in shell variables.
- Never ran `docker compose down -v`, volume prune, or system prune. Only `up -d --build --no-deps gateway` (gateway container only).
- `ping-postgres` (30 min uptime, healthy) and `ping-qdrant` (10 h uptime, healthy) were never restarted or modified administratively. Only the gateway was recreated (4 times, once per deploy).
- No Pig reboot. `ping-oci-queue.timer` not found on the Oracle host; nothing timer-related was touched.
- Playbook revision `194a2b85bde957ed`: no playbook code or data was touched. (Its store was not located in Postgres, Qdrant, or the release tree; nothing in the playbook domain was modified.)
- Orphan knowledge node `4917265ee67e678c` still present, status `candidate`. Never deleted.
- One canonical event authority (UnifiedEventRuntime), mission authority (MissionRuntime), scheduler (MissionScheduler), worker routing (WorkerRuntime), and human-gated learning preserved. No new stores, schedulers, dispatchers, or authorities created.
- Temp files cleaned from `C:\Windows\Temp` (ping-live/, live_*.js, w_*.js, p7_ingest.js) and from /tmp on Pig and cloud.

## Deployment method
The live gateway has no source mounts, so each fix was applied to the live release tree
`/opt/ping/releases/bce92787b0da631ed9218e2255607562c9dff731/ping-oracle-clean-snapshot`,
backed up as `.bak-20260917`, then the gateway image was rebuilt and only the gateway container recreated.
Live files use CRLF; hashes below are the live (CRLF) values.

---

## Phase 3: Per-principal namespace ACL — VERIFIED 12/12

**Trace.** Auth: `gateway/exterior_auth_middleware.js` resolves bearer to `req.authenticatedAgent.agentId`
(principals: `muse`, `muse-level-2`). Namespace decision owner: `CanonicalizationService.authorizeNamespace()`
in `ping-runtime/canonicalization/canonicalization_service.js`. `POST /events` builds source
`api:<agentId>` and authorizes. `CapabilityAuthority` governs executable capabilities, not namespace
resolution, so no second authorization authority was created.

**Changes.**
- `ping-runtime/canonicalization/canonicalization_service.js`: branch `d8be9cd8` -> `85969ec7`.
  Added optional `namespaceEntitlements` map; explicit namespace claims denied unless the source is listed;
  unknown sources with explicit claims fail closed; implicit resolution unchanged; without a map the old
  syntax-only behavior remains.
- `gateway/bootstrap/gateway_runtime.js`: branch `572a6d27` -> `e8d76c2f`.
  Configured explicit policy: `api:muse` and `api:muse-level-2` -> `core::owner`;
  `review-authority`, `customer-authority`, `project-authority`, `email-connector`, `sms-connector`,
  `google-connector`, `github-connector` -> `tenant::hpp`.
- Live: canon service `36f40996` (bak) -> `08747d1c`; gateway runtime `880d0d06` (bak) -> `55439573`.

**Proof.** 9/9 matrix passed (401s, 403 on malformed/unauthorized namespaces, 200 on entitled, implicit
namespace persisted as `core::owner`, re-emit idempotent at 1423 events). Receipts:
`d12284b6afca2488346474a7e2bffbc8191c5e23d445bfc46521e13b6513a7dc`,
`2a56b0ec28f83a1f78d78582cc38ed5bb00f9b24276ee1051806f85da1b9b916`,
`ecfab03d0b9d204f10e39446be1143af02f1656ff172a74915ef58f4928b5b87`.

**Phase 3 follow-up (resolved): `/ingest` principal spoofing.**
`POST /ingest` accepted free-form `body.source` and authorized `authorizeNamespace(body.source, body.namespace)`.
REPRODUCED: `muse-level-2` (entitled to `core::owner` only) claimed `source=review-authority` and wrote to
`tenant::hpp` (HTTP 201, event `0d0579d1f0c582582c6a861400a32ea2e6a0bddc070863adc89484bc76ff0a7b`).
No internal HTTP callers of `/ingest` exist; only the 2 exterior principals hold bearer credentials.
Fix (narrow): `gateway/routes/ingest.js` branch `f1c1abda` -> `518a698c`; live `591f9b29` (bak) -> `fedd0b2b`.
Authorization now binds to the authenticated principal `api:<agentId>`; `body.source` remains emitted
provenance only. Tests: spoof -> 400 ("Source 'api:muse-level-2' is not entitled to namespace 'tenant::hpp'"),
legit `core::owner` ingest -> 201 (event `9926b75eae4df2e22eb62cfbab1e918c8d4184c33d0cc8cad0ed14df25ec7f26`),
explicit `tenant::hpp` -> 400. Phase 3 total: **12/12**.

---

## Phase 4: `/knowledge/nodes` provenance preservation — VERIFIED

**Trace.** `gateway/routes/knowledge.js` `POST /nodes` destructured only nodeType/label/data/entityType/entityId/
namespace/status/confidence and dropped `nodeId`, `sourceEventId`, `correlationId`. `KnowledgeGraph.addNode()`
already persisted all three (`options.nodeId` honored verbatim else deterministic sha256 default;
`source_event_id`, `correlation_id` columns). No KnowledgeGraph identity change needed.

**Changes.** `gateway/routes/knowledge.js`: branch `2ff8b245` -> `d4550677`; live `2c27b154` (bak) -> `e0a99568`.
Route now destructures `nodeId`/`sourceEventId`/`correlationId` and passes them into the existing options object.

**Proof (ordinary API).**
1. Canonical source event via `POST /events`: `e96f5306c6e5a3f2990eb0b1d83d3e07a9669d24c2de617bea2c37c911f88c4a`
   (OBSERVATION_CREATED, `core::owner`).
2. `POST /knowledge/nodes` with `nodeId=p4-test-node-003`, `sourceEventId=<event>`,
   `correlationId=p4-2026-09-17-c` returned exactly `{"status":"ok","nodeId":"p4-test-node-003"}`.
3. DB row: `p4-test-node-003 | e96f5306... | p4-2026-09-17-c | candidate` (source_event_id and correlation_id
   persisted unchanged).
4. `GET /knowledge/nodes?namespace=tenant::phase5-test` returns the node with identical fields.
Orphan `4917265ee67e678c` untouched.

---

## Phase 5: `SNIPPET_APPROVED` mission dispatch — VERIFIED

**Trace.** `EVENT_MISSION_MAP` (event_to_mission_bridge.js) had no approval-family entries, so the bridge never
created missions for them. `MISSION_WORKER_MAP` (mission_scheduler.js) had no knowledge-promotion mission type,
so the scheduler would skip such missions. The `knowledge-promotion` worker (KnowledgePromoter) was already
registered for `[SNIPPET_APPROVED, SNIPPET_REJECTED, AI_RESPONSE_ACCEPTED, AI_RESPONSE_REJECTED]`, and the
scheduler dispatches on the original business `event_type`, so no new worker or dispatcher was needed.

**Changes.**
- `ping-runtime/orchestration/event_to_mission_bridge.js`: branch `167d7c7b` -> `bf6f2cfa`; live `be7ad1e2`
  (bak) -> `3911a04c`. Added `SNIPPET_APPROVED / SNIPPET_REJECTED / AI_RESPONSE_ACCEPTED / AI_RESPONSE_REJECTED ->
  { missionType: 'KNOWLEDGE_PROMOTE', priority: 2 }`.
- `ping-runtime/orchestration/mission_scheduler.js`: branch `7e98b7ec` -> `51a883f0`; live `cc0fa09d` (bak) ->
  `3be173ee`. Added `KNOWLEDGE_PROMOTE: 'knowledge-promotion'`.
- Emission of approval events still requires the established authorized human action (authenticated `/events`);
  the maps only route arrivals. Test used isolated `tenant::phase5-test` node data; production revision
  `194a2b85bde957ed` never referenced.

**Proof (ordinary API, end to end).**
1. Source event `ce4d6ee14a2c4bb389a03d84b353f83269e6d3234afeda34298565f3690c51b2`.
2. Candidate node `p5-test-node-001` created via `POST /knowledge/nodes` (namespace `tenant::phase5-test`).
3. Approval emitted via `POST /events`: `b6816f11dcb47a178edbb63eb58b83e52ec6f49493d0f2e9e3e5cee7170fa2f6` (SNIPPET_APPROVED).
4. Gateway log: `[EventToMissionBridge] SNIPPET_APPROVED -> mission 6e8c020c8acbb9f9 (KNOWLEDGE_PROMOTE)`.
5. Mission `6e8c020c8acbb9f9` = sha256(`KNOWLEDGE_PROMOTE:b6816f11...`)[:16] (deterministic, predicted exactly):
   type `KNOWLEDGE_PROMOTE`, `completed`, assigned to `knowledge-promotion`; lifecycle
   MISSION_CREATED -> ASSIGNED -> STARTED -> COMPLETED.
6. Node `p5-test-node-001`: status `approved`, confidence `1.0` per the live promoter's established contract
   (approval -> confidence 1.0; the live promoter does not read payload confidence).

**Observed drift (pre-existing, not introduced):** live `knowledge_promoter.js` (`91605378`) differs from branch
(`7406f6d09`): live approves at confidence 1.0 / rejects at 0.2 and emits no `KNOWLEDGE_PROMOTED` event; the
branch version reads `payload.confidence` and emits `KNOWLEDGE_PROMOTED`. Canonical downstream evidence in
production is the mission completion record plus the node's promoted status.

---

## Phase 6: `REPLAY_VERIFY` mission dispatch — VERIFIED

**Trace.** `MISSION_WORKER_MAP` already had `REPLAY_VERIFY -> replay` and the `replay` worker was registered for
`[REPLAY_VERIFY, PROJECTION_CREATED]`, but the bridge had no `REPLAY_VERIFY` event entry (only
`PROJECTION_CREATED -> REPLAY_VERIFY` mission), so directly emitted `REPLAY_VERIFY` events created no mission.
No loop hazard: ReplayWorker emits `REPLAY_COMPLETED`, never `REPLAY_VERIFY`. Mission IDs are deterministic
(sha256 `missionType:event_id`[:16]) with `ON CONFLICT DO NOTHING`, so idempotency is structural.

**Changes.** `ping-runtime/orchestration/event_to_mission_bridge.js`: branch `bf6f2cfa` -> `bc992a9c`;
live `3911a04c` -> `fb4d8eb6`. Added `REPLAY_VERIFY: { missionType: 'REPLAY_VERIFY', priority: 1 }`.
No dispatcher or scheduler created.

**Proof.**
1. Direct `REPLAY_VERIFY` via `POST /events`: `7a47ce6e3935897a9fd9da8d7e47f1cf46dc4184ef48b9b1e5e1c58d1b402384`.
2. Gateway log: `[EventToMissionBridge] REPLAY_VERIFY -> mission af3758af637bd983 (REPLAY_VERIFY)`;
   `[ReplayWorker] Processing REPLAY_VERIFY for p6-replay-doc-001`.
3. Mission `af3758af637bd983` (predicted deterministic ID): type `REPLAY_VERIFY`, `completed`, assigned to `replay`.
4. `REPLAY_COMPLETED eaeb82ef8c4106aab3ee5a5603d4ef89e5ccc33bfdd8c3e455508e770be2cbbd`:
   `verified=true`, `reason=kernel_verified`, `upstreamEventId=7a47ce6e...`; WITNESS_CREATED and LINEAGE_CREATED followed.
5. Idempotency: re-emitting the identical event returned the same event ID; mission count stayed 1
   (`completed`); REPLAY_COMPLETED count stayed 1; no duplicate execution.

---

## Final state
- Gateway healthy (`/health` 200, container `Up (healthy)`); Postgres and Qdrant healthy and uninterrupted.
- All four phases implemented in branch `constitutional-convergence-v2`, deployed live, and proven through the
  ordinary authenticated API. No commits or pushes made.
