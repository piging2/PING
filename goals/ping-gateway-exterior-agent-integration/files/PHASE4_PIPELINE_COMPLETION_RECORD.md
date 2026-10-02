# PIPELINE COMPLETION RECORD — Phase 4: Event Pipeline Boundary + Live Vertical Slice
Date: 2026-09-12 (MDT). Mode: PIPELINE COMPLETION MODE per Nolan's directive.

## 1. ALL WORKTREES DISCOVERED
| Worktree | Branch | HEAD | State |
|---|---|---|---|
| C:/Users/nolan/PING | main (CANONICAL, do not modify) | 6e359a2 | dirty (pre-existing .tmp.driveupload churn, .dockerignore) — untouched |
| .../worktree/.../curious-squid | constitutional-convergence-v2 (**ACTIVE**, implementation authority) | e1297c5 | dirty (our patches) |
| .../worktree/.../calm-garden | opencode/calm-garden | aaec592 | dirty (unrelated prior work; contains untracked kernel/event_authority.py + runtime/authorities/observation_authority.py) |
| .../worktree/.../eager-moon | opencode/eager-moon | aaec592 | 1 modified file (replay_types.ts) |
| .../worktree/.../kind-comet | opencode/kind-comet | aaec592 | 1 modified file (replay_types.ts) |
| C:/Users/nolan/PING-promotion | constitutional-trunk-promotion | 7a93b80 | 3 untracked gateway test files |

No worktree contained a prior fix for the event-pipeline auth boundary. Active branch is the sole implementation authority. Nothing pushed.

## 2. ACTIVE BRANCH + HEAD
`constitutional-convergence-v2` @ e1297c5 (worktree curious-squid). All patches applied here only.

## 3. WHAT WAS ACTUALLY LIVE (verified by real execution, not code reading)
- Gateway live on 100.79.154.43:8080, Postgres-backed (hasPG=true). `ping_events`: 1583 events, 27 types.
- Phase 3 had secured only /ai, /connectors, /capabilities. **Unauthenticated WRITE surface was live**: POST /events, POST /canonical-events, POST /ingest (plus legacy HPP families: customers, reviews, projects, deployments, tenants, runtime, repository, orchestration, knowledge, missions, ai_workspace, ollama, /api/v1/ollama).
- /ops, /governance, /constitution: all GET-only, read-only, no secrets. Left public (deliberate, per "do not blindly patch").
- Proven live before patching: unauthenticated POST /events reached UnifiedEventRuntime.emit and was rejected only by event-type governance ("Unknown event_type: pipeline.probe") — i.e., the write path was reachable anonymously.

## 4. SURGICAL PATCHES PERFORMED
**Patch A — event pipeline auth boundary** (`gateway/bootstrap/gateway_runtime.js`, 3 lines):
- Mounted `services.exteriorAuthMiddleware.middleware()` on `/events`, `/canonical-events`, `/ingest` (same pattern Phase 3 used for /ai, /connectors).
**Patch B — emission provenance** (`gateway/routes/events.js`, +4/-1 lines):
- POST /events now derives `source` from `req.authenticatedAgent`: `api:<agentId>` (fallback `api`). Persisted rows now carry the emitting agent.
**Patch C — replay path SQL** (`ping-runtime/events/unified_event_runtime.js`):
- `getDescendants`/`getAncestors`: `ARRAY[event_id]::varchar[]` (fixed recursive-CTE type mismatch).
- `getDescendants`: added `created_at` to CTE (fixed `ORDER BY created_at` on missing column).
Deployment: images `curious-squid-gateway:phase4-eventauth` → `phase4-eventauth2` → `phase4-eventauth3` → `phase4-eventauth4`; container `ping-gateway` recreated each time with identical env/volumes/ports/restart-policy (env cloned programmatically on the Pig; secrets never left the machine). Rollback images retained: before-phase2, phase2-fix, phase2-fix2, phase3-auth.

## 5. TESTS ACTUALLY RUN (all against the running gateway from the Pig)
- Unauthenticated GET/POST /events → 401; POST /canonical-events → 401; POST /ingest → 401; invalid token → 401.
- Public read-only preserved: /governance/stats → 200, /constitution → 200, /ops/health|drift|dashboard|system → 200.
- Authenticated L1 POST /events (OBSERVATION_CREATED) → 200, event persisted; row shows `source='api:muse'`, namespace `core::system`, correlation_id set.
- Unknown event_type POST → 500 typed `Unknown event_type` (governance enforced).
- **Live self-improvement cycle**: my OBSERVATION_CREATED → EventToMissionBridge mission CLAIM_GENERATE (completed) → ClaimWorker → CLAIM_CREATED → mission CLASSIFICATION_CREATE (completed) → CLASSIFICATION_CREATED → mission RECOMMENDATION_CREATE (completed) → PROJECTION_CREATE → REPLAY_COMPLETED → WITNESS_CREATED → LINEAGE_CREATED. Claim payload carries `"source": "api:muse"` end to end.
- **Terminology (per 2026-09-12 steering)**: what is PROVEN is an event-driven, replayable *improvement-pipeline mechanics* chain. NOT YET PROVEN: intelligent self-improvement. Worker cognition is template-level; do not call the mechanical slice "self-improvement" without qualification.
- Replay: GET /events/:id/descendants → full 8-deep causal chain (depth 0..7); ancestors/correlation endpoints share the fixed code path.
- node --check passed on every patched file; gateway booted clean on every redeploy (`Gateway running on http://0.0.0.0:8080`, `ping_events already has data — skipping seed`).

## 6. CLASSIFICATION
**BLOCKERS fixed**: unauthenticated canonical event writes (Patch A); broken replay traversal (Patch C).
**NON-BLOCKING DEFECTS (recorded, not fixed)**:
- `/ops/status` → 500 (empty body). Pre-existing; sibling /ops/* endpoints return 200. One of the aggregated getStats() calls throws. Read-only observability only.
- `/constitution/graph` → 500: handler calls undefined `buildDependencyGraph` instead of the lazy `getBuildDependencyGraph()`. Read-only.
- `/canonical-events` stats returns `[]`; CanonicalEventEnvelope path looks dormant vs the live UnifiedEventRuntime spine. The two event systems overlap; spine is live.
- Pre-existing encoding churn in gateway_runtime.js (Phase 3 rewrite mangled non-ASCII comments to `?"`/`\u0015`). Cosmetic; node parses it; container boots.
- `/canonical-events` POST accepts caller-supplied `source`/`actor` (self-asserted provenance) — mitigated by auth requirement; envelope path appears dormant.
**OBSERVATIONS**:
- Worker cognition is template-level (recommendation = "Review and take action / Standard business workflow step"). The machinery runs; the intelligence is nascent. No fake self-improvement claimed.
- ClaimWorker logs "Processing OBSERVATION_CREATED for unknown" — the worker doesn't yet consume the new `api:muse` source field. Next seam.
- Legacy HPP write families (customers/reviews/projects/deployments/tenants/runtime/repository/orchestration/knowledge/missions/ai_workspace/ollama, /api/v1/ollama) remain unauthenticated. Dormant demo surface; next coherent boundary if Nolan wants it.
**DORMANT**: calm-garden's untracked `kernel/event_authority.py` + `runtime/authorities/observation_authority.py` (possible alternative event authority — not live, not touched); EventBridge canonical poller (0 rows, idle); canonical_events envelope path.

## 7. NEXT EXECUTABLE PIPELINE STEP
The mechanical slice is complete and live:
`authenticated trigger → producer → event → governance → Postgres → evidence → claim → classification → recommendation → projection → replay → witness → lineage`, all replayable via the API.
Next: make the workers consume the new agent provenance (`api:muse`) instead of logging "unknown", and evaluate one real RECOMMENDATION end-to-end through the governed /capabilities boundary (L2) with Nolan's approval for any mutation — that closes `recommendation → authorized mutation → test → evidence → replay`.

---

# TenantOS steering pass (2026-09-12 ~13:10 to 13:35 MDT)

Nolan tightened the standard: no unqualified "self-improvement" claims, discovery before every patch across all worktrees, TenantOS-grade boundaries, audit don't blindly patch.

## Discovery results (3 parallel tracks, read-only)

### Canonical authorities
- **Canonical event authority: ping_events via UnifiedEventRuntime = CANONICAL_LIVE.** canonical_events = DORMANT (0 rows) with a live-but-idle compatibility bridge (EventBridge polls every 5s, marks source='canonical_events'). repository_events = 0 rows, DORMANT. No conflicting authority.
- **Canonical provenance authority: NONE EXISTS in any worktree.** gateway/provenance_authority.js is dormant artifact-lineage (zero code references everywhere). No ActorAuthority anywhere. The originator seam was greenfield.
- Provenance contradiction: POST /canonical-events accepts caller-declared source/actor from the body even behind auth, while /events derives source from the verified credential. 36 distinct source values in ping_events.

### Tenant/security boundary findings
- Identity at boundary: YES (api:muse from verified credential, ExteriorAuthMiddleware sets only {agentId, agentName}).
- Tenant/context on /events path: ABSENT. No tenant_id; namespace defaults core::system. The tenant authority itself (POST /tenants) is unauthenticated.
- Capability check after auth on /events: ABSENT. "Muse Level 1 (Observe)" is a seed name only; middleware treats L1/L2 identically. L1 can write. Least-privilege gap recorded.
- Fail closed: /events, /canonical-events, /ingest, /missions all 401 anonymous. BUT the boundary was bypassable: **POST /missions (unauthenticated) wrote ping_missions and emitted MISSION_CREATED into ping_events** (verified in code: missions.js:22, mission_runtime.js:87-88, source hardcoded 'mission-runtime', createdBy caller-supplied). Fixed this session by mounting the middleware on /missions.
- Governance across legacy families: presence checks only; tenant_id caller-supplied, no ownership verification.

### Write-surface classification (all 13 families, live probes)
- LIVE (unauthenticated PG writes): missions, customers, reviews, projects, knowledge, tenants, deployments, runtime, repository (/api/v1/repository), ai-workspace.
- DORMANT: orchestration (in-memory only), /api/v1/ollama (no persistence; compute exposure only).
- customers/reviews/projects/ai_workspace emit into canonical_events via the envelope, bypassing the /canonical-events HTTP auth.
- No other worktree mounts auth on any of these families. Nothing to deduplicate.

### Public read routes (evidence-based, not "GET-only")
- SAFE_PUBLIC: /health, /ops/health, /ops/drift, /runtime/fingerprint.
- SENSITIVE_PUBLIC: /ops/dashboard, /ops/system (container+image names, git branch/author/messages, PG volumes), /governance/* (full NAMESPACE_OWNERS, enumerates every valid event type), /constitution, /constitution/contracts (DI startup_order, authority contracts).
- ZERO consumers require unauthenticated access (no callers in 6 worktrees, no HEALTHCHECK, no fleet code). Public-by-default, not public-by-design. Decision deferred, not patched.

### Defects (root-caused, downstream-checked)
- /ops/status 500: ops.js:19 calls fingerprint.generate(), only getFingerprint() exists. Zero consumers. Record-and-continue.
- /constitution/graph 503 live ("Container not available", container not passed at gateway_runtime.js:785-799); latent bare buildDependencyGraph at constitution.js:183. Zero consumers. Record-and-continue.
- Neither blocks the pipeline.

### Event counts reconciled
- ping_events = 1,655 at 2026-09-12 13:12:14 MDT (direct psql, ping-postgres/ping_runtime).
- 1,583 has provenance: GET /events/stats ~13:08 MDT. 1,583 + 72 events emitted that day = 1,655 exactly. Append-only, no deletions, single PG instance.
- 1,542: provenance unknown, found in no workspace or memory file. Retired as a figure; cannot be used as historical truth.
- Rule: report exact query + target + timestamp; never compare counts without timestamps.

## Patches this session (all minimal, tested, live-verified)
1. `ping-runtime/workers/canonical_workers.js` (+17): BaseWorker._emit threads the originating principal as metadata.originator. Explicit option wins, then inherited metadata, then the api:-prefixed source convention. Null when unknown (fail closed).
2. `gateway/bootstrap/gateway_runtime.js`: mount ExteriorAuthMiddleware on /missions (closes the ping_events injection bypass).
3. `ping-runtime/orchestration/event_to_mission_bridge.js` (+1): thread originator into mission payload.
4. `ping-runtime/orchestration/mission_scheduler.js` (+1): copy originator into worker-event metadata.
- Two image builds this session (phase4-eventauth5, phase4-eventauth6); second was required because live verification of the first exposed the bridge/scheduler gap. Process note: batch patches per build going forward.
- Encoding incident: a PowerShell Set-Content -NoNewline on an array concatenated canonical_workers.js into one line; restored via git checkout (file was clean at HEAD) and re-applied with explicit UTF-8 no-BOM byte handling. Lesson: never pass arrays to Set-Content -NoNewline; use [System.IO.File] with explicit encoding.

## Live verification (image curious-squid-gateway:phase4-eventauth6)
- Anonymous POST /missions: 401. Authenticated POST /missions: 200 (mission 3e6a7b3b453b1d98).
- Anonymous POST /events: 401. Authenticated POST /events: 200.
- Full chain from authenticated OBSERVATION_CREATED (f571d0a8...): all 7 worker-hop events carry metadata.originator=api:muse (CLAIM_CREATED through LINEAGE_CREATED).
- /governance/stats still public 200 (unchanged, deliberate pending decision).
- Local commit e8398308 on constitutional-convergence-v2. NOT pushed.

## Terminology (binding)
- PROVEN: event-driven, replayable improvement-pipeline mechanics with principal-attributed provenance.
- NOT YET PROVEN: intelligent self-improvement (worker cognition still template-level).
