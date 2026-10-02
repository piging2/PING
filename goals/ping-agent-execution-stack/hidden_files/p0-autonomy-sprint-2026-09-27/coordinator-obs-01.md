# Coordinator direct observation 01 (T+0, 2026-09-27 ~13:00 MDT)

## Reached dispatch path (read directly, not from reports)
File: ~/workspace/lane-p01/tree/src/app/api/mc/dispatch/route.ts (424 lines)
Lib: ~/workspace/lane-p01/tree/src/app/api/mc/_lib/mc-dispatch.ts (404 lines)

POST /api/mc/dispatch:
1. Fail-closed validation: prompt/agent/capability/tenant; agent in SLICE_AGENTS; tenant in SLICE_TENANTS (happy-place, coppersmith-plumbing); capability non-empty.
2. loadProfiles() via adapterCall('profiles') -> lane-d shim -> ExternalAgentAdapter (existing authority).
3. Capability check: profile.allowedCapabilities.includes(capability) AND adapterCall('authorize', {agentId, capability, namespace, constraints}).
4. adapterCall('issue', ...) builds work order envelope (attempt: 1).
5. appendDispatchEvent lifecycle events -> JOURNAL_PATH=/home/nolan/workspace/fyd-journal-gateway/events.jsonl (Pig-side).
6. publishArtifact x4 (prompt.txt, workorder.json, context.json, result.json) -> ARTIFACT_ROOT=/home/nolan/workspace/mission-control/artifacts (Pig-side).
7. Execute: runOllama (fetch OLLAMA_URL on Pig) or runBroker (spawnSync node BROKER_DISPATCH, Pig-side).
8. adapterCall('verify', resultEnvelope) -> terminal event MC_RUN_SUCCEEDED / MC_RUN_FAILED / MC_RUN_UNKNOWN (UNKNOWN first-class, never collapsed).
9. GET /api/mc/missions re-projects journal via projectMissions() (deterministic, replay-safe ordering fix 2026-09-26).

## Boundary hypotheses (to be confirmed/falsified by archaeology workers A-D)
- B1 (P0.8, CONFIRMED by code): missionId = sha256('mission|agent|tenant|capability|promptDigest|nowIso'). No idempotency key in DispatchBody. Retry/double-click/concurrent POST mints duplicate missions. appendDispatchEvent dedups events by content-derived event_id, but the MISSION identity itself is time-derived. This is the highest-leverage dispatch-front-door boundary.
- B2 (P0.5): tenant comes from request body, whitelist-validated but client-supplied. Server-authoritative binding not proven yet.
- B3 (P0.13): appendDispatchEvent writes directly to events.jsonl via appendFileSync. Header claims "existing append-only PING journal JSONL (same envelope as emit.py)". Whether this passes through UnifiedEventRuntime/governance or bypasses it is OPEN - worker C owns.
- B4 (P0.6): attempt identity is fragmented across events (mission_id/run_id/execution_id present; actor_id, input digest, started_at/finished_at, result digest, error classification scattered or absent). No single durable attempt record.
- B5 (P0.11/P0.12): no proposal object, no approval binding, no digest-locked apply path exists yet on this route. The P0 mission needs: structured proposal -> WAITING_APPROVAL -> Nolan approves exact digest -> canonical transition -> regenerated FYD projection.

## FYD target grounding
- SiteSpec model: src/fyd/sitespec/ (types, schemas, validator, render-model, public-projection, binding-verifier). Spec is DATA: pages -> sections (component + query + presentation). FYDPresentation carries PROPOSED copy/display changes only.
- Tenant sites: src/app/sites/happy-place/page.tsx (SITE_ID=happy-place, compiles via compilePublicSite -> generateSiteSpec from PING-backed graph), src/app/sites/coppersmith-plumbing/.
- "Make emergency services more prominent" maps to a PROPOSED FYDPresentation patch (heading/copy/featuredIds/objectOrder) on the relevant section -> owner approval -> canonical transition -> recompiled projection. No new UI needed for the proof beyond NOW-answers.
- :3200 frozen until 19:00 MDT. All FYD mission work in separate branches/trees.

## Transport
- Pig SSH PIG_OK at ~13:00 MDT (was flaky 11:11-12:47). Sibling hardening + reconciliation workers running. Verify before Pig-dependent runtime proofs.

## Next
- Await arch A-D reports (T+1 ~13:53 MDT): reached-path map + first broken boundary each. Then dispatch execution-spine workers on B1 (idempotency) and the confirmed top boundary.

## Fold-in: post-recovery reconciliation (2026-09-27 ~13:00 MDT, parent intel)
- Transport STABLE (3x PIG_REACHABLE ~90s apart). Outage cause: UNKNOWN, Pig-side clean (no Tailscale/log evidence; points at egress-proxy-to-tailnet path or transient tailnet data-plane).
- Live DB (brain-postgres): ping_runtime 2,536 ping_events (latest 08:18 MDT); ping_missions 497 rows; mission_events / mission_executions / canonical_events = 0 rows. crx_runtime abandoned (739 events, all unprocessed, latest 09-16). ping-vault running but unhealthy.
- D1 jev-shadow failure loop (LIVE): "No owner defined for namespace 'jev'" fails every gateway mission. -> spine worker S1 dispatched.
- D2 bridge re-fires events for 2-day-old missions (one completed): possible event duplication, mechanism unproven. -> worker C redirected.
- D3 reaper-vs-HOLD: lease expiry re-dispatches HOLD missions ~60s later = auto-retry of unknown outcomes, violates P0.7. Needs Nolan's design word; escalate as ONE DECISION when the sprint reaches it. -> worker B recorded.
- Namespace ownership lookup ("No owner defined for namespace") -> worker B redirected as top identity boundary.
- events.jsonl <-> ping_events writer relationship; why mission_* tables empty -> worker C redirected.
- Social reconciliation: FB pass 128 RECONCILED (89 EXECUTED, 0 FAILED); pass 130 preserved NOT_ATTEMPTED; IG 2 UNKNOWNs + X 5 follows NOT retried; 42 Sept-24 FB UNKNOWNs await deliberate reconcile. Instagram blocked on Nolan re-login.
- MC wiring branch + staged UI patch HELD per P0.1/P0.2 (no duplication with recovery coordinator).
- Tunnel-keepalive hardening: no design exists yet; parent-level decision (sibling worker running).
