# LANE 12 raw evidence log (code-reading notes, 2026-09-28)

Canonical tree: /home/nolan/projects/ping @ 0264d517 (verified via pigwsl-exec.sh).
All reads read-only. route.ts read but never modified (locked lane).

## mc-dispatch.ts (src/app/api/mc/_lib/mc-dispatch.ts, 458 lines)
- L23: JOURNAL_PATH hardcoded to /home/nolan/workspace/fyd-journal-gateway/events.jsonl
- L24: ARTIFACT_ROOT /home/nolan/workspace/mission-control/artifacts
- L39-45: DEADLINES: ollama 180, identity_1..4 600 (seconds)
- L58-64: FIXED_CONSTRAINTS read_only/no_writes/no_network/no_canonical_events/no_mission_state_writes
- L66-72: MissionStatus includes UNKNOWN
- L162-168: MISSION_TERMINAL_STATUSES = SUCCEEDED, FAILED, DENIED; UNKNOWN explicitly NOT terminal
- L182-185: mintEventId deterministic: 'mc-d-' + sha256(kind|missionId|eventType|summary)[0:12]
- L186-205: loadJournalEvents skips malformed lines ("never fabricate")
- L212-244: maxMissionTimestamp + strictly-increasing per-mission timestamps (Lane D ordering fix; probe mc-m-test-unknown-01 referenced in comment only)
- L245-275: appendDispatchEvent: journalHas check -> duplicate-skipped; else appendFileSync (no fsync)
- L278-290: adapterCall spawns node ADAPTER_SHIM, 30s timeout
- L296-417: projectMissions pure projection; MC_RUN_UNKNOWN -> status UNKNOWN, reconciliation_state from event data or 'RECONCILIATION IN PROGRESS'
- L421-437: findPriorMission read-only lookup

## dispatch/route.ts (src/app/api/mc/dispatch/route.ts, 526 lines, LOCKED lane)
- L139-170: runOllama; abort/AbortError -> timeout kind, else transport-failed
- L175+: runBroker (broker transport)
- L306: missionId = 'mc-m-' + sha256(mission|agent|tenant|capability|promptDigest|idempotencyKey)[0:12]
- L321-353: duplicate POST: terminal -> original + duplicate_suppressed:true; non-terminal -> 409 HOLD, zero new events
- L359-368: profile LIVE + allowedCapabilities check (pre-dispatch only)
- L371-373: emit helper, no try/catch
- L390-407: authorize deny -> MC_MISSION_CREATED + MC_AGENT_DENIED, 403
- L408-418: issue failure -> MC_MISSION_CREATED + MC_RUN_UNKNOWN, 503
- L415-418: MC_EXECUTION_STARTED emitted BEFORE transport call (intent checkpoint before effect)
- L434-436: transport call (runOllama await / runBroker sync)
- L441-448: transport-failed -> MC_RUN_FAILED ("prompt was never delivered")
- L450-460: timeout -> MC_RUN_UNKNOWN
- L464-508: verify invalid -> MC_RUN_UNKNOWN (non-retryable); verified -> result.json artifact -> SUCCEEDED/FAILED

## mc-dispatch-identity.ts
- L60-80: resolveCaller maps x-mc-caller-key to server-side registry; null on missing/unknown (refuse, never body tenant)

## agents/route.ts
- L210-219: reconciler/hold/resume/cancel/RETRY NOW withheld: "no mutation exists yet"; idempotencyKey etc exposed as null "pending the ORCA port-lane reconciler contract"

## secret-broker
- src/lib/secrets/secret-broker.ts L133: MAX_TOTAL_LEASE_SECONDS 86400; L319-352 renew re-checks scope, caps total lifetime
- __tests__/secret-broker.redteam.test.ts L233-250 rotation; L251-294 renewal (expired denied, max-lifetime denied, tenant mismatch denied)

## mc-approval/approval_request.py
- L25-28: SILENCE IS NEVER APPROVAL; no EXPIRE_APPROVE branch
- L73-85: TERMINAL set; EXPIRY_POLICY_OUTCOMES default HOLD -> EXPIRED

## gateway tests (read, not executed)
- tools/fyd-journal-gateway/__tests__/dedupe.test.mjs header: same request_id twice, restart survival, 20 concurrent, torn line, malformed request_id 400
- src/fyd/tenant/__tests__/h-crash-window.test.ts L153 crash window journal gateway; L358 owner event log commit boundary
- src/fyd/tenant/__tests__/f-journal-privacy.test.ts L113 tenant privacy hostile both directions

## negative greps
- no *.test.ts references mc-dispatch (canonical tree)
- no 'reap' or '_processing' under src/app/api/mc (canonical Next.js tree)
- no 'quiesc' under src (canonical tree)
- only route.ts writes MC_* dispatch events (canonical tree)
- CORRECTION 2026-09-28 ~14:35 MDT: reapExpiredLeases EXISTS in Pig-side ping-runtime
  (/home/nolan/wr-integrate/ping-runtime/orchestration/mission_runtime.js:331):
  UPDATE ping_missions SET status='created', assigned_to=NULL, lease_until=NULL,
  claimed_at=NULL, retry_at=NOW() WHERE status IN ('running','assigned') AND
  lease_until < NOW(), plus MISSION_LEASE_EXPIRED emit per reclaimed mission.
  Semantics: lease-expired -> created -> redispatch. This is the AGENTS.md
  2026-09-24 Reaper-vs-HOLD open design gap, confirmed in code. The earlier
  "workspace-wide grep empty" was a false negative (the first grep had not
  finished; the background result later returned 5 doc hits).

## donor files read
- ~/workspace/runtime-harvest/wave1-donor-reports.md (full)
- ~/workspace/ping-24h/lanes/lane03-nerve-polyrob/report.md (full, 235 lines)
- ~/workspace/ping-24h/lanes/lane07-pi-nanomuse/report.md (Pi-1 card, L63-110)
- ~/workspace/ping-24h/lanes/lane08-forkscout-novelty/report.md (full, 140 lines)
