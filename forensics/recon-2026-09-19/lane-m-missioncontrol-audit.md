# LANE-M: Mission Control truth audit

**Lane:** M (Mission Control truth auditor). **Mode:** read-only (observational GETs only; no edits, no commits, no merges, no DB writes, no restarts, no secret reads).
**Date:** 2026-09-18 (MDT). **Auditor:** LANE-M subagent.

**Code locations distinguished:**
- PUBLIC_GITHUB: main branch of /home/nolan/ping (pushed; superset UI).
- LOCAL_BRANCH: constitutional-convergence-v2 (HEAD 84da2d40c) and oracle/deploy-2026-09-18 (public, untouched per operator rule; assessed only).
- LOCAL_WORKTREE: /home/nolan/worktrees/constitutional-convergence at 84da2d40c (audit target; UI is CascadeProjects/infra/ui-next).
- LIVE_RUNTIME: Pig WSL gateway listening on :8080 (probed read-only 2026-09-18 ~19:23 MDT).

**Method:** inventoried every fetch() call in the UI, matched each URL against gateway route mounts in gateway/bootstrap/gateway_runtime.js and the router files, read the handlers for mocks/fixtures/hardcoding, then verified the live routes with read-only GETs. Prior findings reused: backlog falsified-premises section (AcquisitionManager and ConstitutionalEventStore are PHANTOM; EventRepository LEGACY_UNREACHABLE; IEventAuthority DORMANT) was read first so no audit claim rests on those names.

---

## 1. Backend route inventory (gateway, LOCAL_WORKTREE)

Mounts that matter (gateway/bootstrap/gateway_runtime.js):
- `/system` -> routes/system.js: `/system/state` REAL (SystemAuthority.getSystemState). Nothing else in that file is UI-relevant.
- `/mc` -> routes/mission_control.js: all REAL, event-backed, requirePG-guarded (honest 503 when PG down):
  - GET /mc/dashboard, /mc/business/{who-needs-followup, stalled-estimates, pending-reviews, ai-recommendations, today-work, unpaid-invoices, at-risk-projects, marketing}
  - GET /mc/inbox, /mc/queues, /mc/queues/:eventType
  - GET /mc/missions/active, /mc/missions/pending, /mc/missions/stats, /mc/missions/:id/trace
  - GET /mc/knowledge, /mc/system, /mc/activity
  - GET /mc/bridge, /mc/event-mission-bridge, /mc/scheduler, /mc/workers
  - GET /mc/replay/stats, /mc/witness/stats, /mc/replay/trace/:correlationId
  - GET /mc/dead-letters, /mc/dead-letters/stats, /mc/dead-letters/:id
- `/missions` -> routes/missions.js: GET /missions/stats, POST /missions, GET /missions/pending, GET /missions/active. REAL (missionRuntime).
- `/orchestration` -> routes/orchestration.js: missions CRUD, dispatch, engine, workers. REAL.
- `/api/v1/ollama` -> routes/ollama.js: POST /chat, GET /models, POST /autocomplete. REAL. NOTE: there is NO /api/v1/ollama/status and NO /api/v1/ollama/jobs.
- `/knowledge` -> routes/knowledge.js: /stats, /search, /nodes, /nodes/:id/neighborhood, /edges. REAL. NOTE: there is NO /api/v1/knowledge-graph.
- `/api/v1/repository` -> repository routes. No /living sub-route checked; UI uses relative /api/v1/repository/living (Next.js, not gateway).
- No gateway route exists for: /api/v1/chat, /api/v1/timeline, /api/v1/knowledge-graph, /api/v1/decision/weights, /api/v1/mixer, /api/v1/reasoning/weights, /api/v1/mcp/*, /api/v1/missions/cards*, /api/v1/system/nightshift, /api/v1/memory/summary, /api/v1/health/organizational, /api/v1/constitutional/objects, /api/lifecycle, /api/witness, /api/missions.

**Next.js app routes:** only /api/health (returns {status:'healthy'}). No rewrites in next.config.js. Therefore every relative fetch('/api/...') in the UI hits a nonexistent route (404) in production.

---

## 2. Truthfulness table (UI surfaces in LOCAL_WORKTREE, mounted on /command-center)

| Surface | URL called | Route exists? | Handler/data reality | Verdict |
|---|---|---|---|---|
| CockpitDashboard (tab) | GET http://localhost:8080/system/state | Yes | Real JSON, but component reads keys that do not exist in the response (s.objects.total, s.graph.nodes/edges, s.services.postgresql, s.lifecycle.*). Actual keys: knowledge, missions, replay, postgres, qdrant, containers, git, repository, metrics. Rendering real data would throw on s.objects (undefined.total). Panels 7-10 fully hardcoded: Compiler "Ready" + 6 checkmarks; Replay "Ready", Log Entries 0, Blocks 0, Genesis "Initialized"; Git "Immutable"/"Stored"; Mission Queue all 0. Growth Rate shows literal "+0%". | MISLEADING + broken on real data |
| ConstitutionalLifecycle | GET /api/lifecycle (relative, Next.js) | No | 9 stages hardcoded all-healthy with invented confidence (1.0/0.95/0.8/0.75/0.7) and invented latencies (150ms, 2000ms). Poll silently fails and the invented defaults persist. Default-healthy inversion hides real failure. | PHANTOM |
| OrganizationalHealth | GET /api/v1/health/organizational (relative) | No | Nothing renders except the honest fallback "Health data unavailable". The surface promises a health score the backend cannot supply. | PHANTOM (honest fallback) |
| NightShift | GET /api/v1/system/nightshift (relative) | No | Error state shown ("Failed to fetch"). Page-level GET http://localhost:8080/api/v1/system/nightshift also 404s, silently swallowed, badge stays hidden. | PHANTOM |
| LivingRepository | GET /api/v1/repository/living (relative) | No | Shows "Repository growth data unavailable". | PHANTOM (honest fallback) |
| DecisionEngine | GET/POST http://localhost:8080/api/v1/decision/weights | No | Falls back to 0.5 for every weight; slider drags POST to a nonexistent route, .catch swallows. Sliders imply persistent configuration; nothing persists. | PHANTOM / MISLEADING |
| ConstitutionalMixer | GET/POST http://localhost:8080/api/v1/mixer | No | Same pattern as DecisionEngine. | PHANTOM / MISLEADING |
| ReasoningPuppetStrings | GET/POST /api/v1/reasoning/weights (relative) | No | Shows "saving" spinner, POSTs into the void (Next.js 404), .finally clears spinner. Reset Defaults also pretends to persist. | PHANTOM / MISLEADING |
| KnowledgeGalaxy | GET http://localhost:8080/api/v1/knowledge-graph | No | Shows "Knowledge graph unavailable". The "Replay Verified" color mode labels a verification claim over a data field (replay_verified) that no backend populates; default grey reads as "not verified". The honest wire target is GET /mc/knowledge or /knowledge/nodes. | PHANTOM (honest fallback) |
| TimeMachine | GET http://localhost:8080/api/v1/timeline | No | Shows "Timeline unavailable". Play/scrub controls are client-side only. Metrics (authority_drift, mission_throughput, replay_success_rate) have no backend. | PHANTOM (honest fallback) |
| OllamaControlRoom | GET /api/v1/ollama/jobs, /api/v1/ollama/status (relative) | No | Gateway has no /jobs or /status under /api/v1/ollama. Loading skeleton then empty; Run buttons POST to nonexistent /api/v1/ollama/jobs/{id}/run (spinner, then nothing). | PHANTOM |
| SemanticMemory | GET /api/v1/memory/summary (relative) | No | Fallback message "Qdrant not connected" is itself misleading: the failure is a 404, not a Qdrant diagnosis. | PHANTOM / MISLEADING fallback |
| ConstitutionalObjects | GET /api/v1/constitutional/objects (relative) | No | Error box. | PHANTOM (honest fallback) |
| MissionCards | GET /api/v1/missions/cards; POST /api/v1/missions/cards/reorder; POST /api/v1/missions/cards/{id}/{approve,reject} (all relative) | No | All 404. Approve/reject mutations optimistically update local state only when r.ok, so they visibly do nothing; reorder POST silently swallowed. On oracle/deploy-2026-09-18 the same component fetches http://localhost:8080/api/missions, which also does not exist (gateway mounts /missions, not /api/missions). | PHANTOM |
| MCPOrchestration | GET /api/v1/mcp/{providers, events, capability-matrix, queue, replay} (relative); POST /api/v1/mcp/providers/{name}/{pause,resume,reconnect} (relative) | No | All 404. Provider toggle/reconnect buttons hit nonexistent routes; optimistic state update only on d.status==='ok', so they visibly do nothing. Replay tab claims "Read-only replay queue" but sources it from a nonexistent route instead of the real /mc/replay/stats. | PHANTOM |
| MissionControlHeader | none (not mounted in command-center) | n/a | Hardcoded gateway 'healthy', ollama 'connected'; Math.random() latency (50-150ms) and context usage every 2s; Math.random() tok/s. Dead code; phantom if mounted. | PHANTOM (unmounted) |
| ObservatoryMode | none (not mounted) | n/a | Fully hardcoded: "Healthy", "99.9% uptime", "Connected / qwen3-coder loaded", "Optimal / 0.2ms latency", P50 45ms / P95 120ms / P99 280ms, 24 req/min, 42 tok/s, 1.2s avg; Math.random() bar chart. | PHANTOM (unmounted) |
| ArchitectureView | none (not mounted) | n/a | Hardcoded all-healthy four-node diagram. | PHANTOM (unmounted) |
| Landing page (/) | none | n/a | Hardcoded "All systems nominal" with green dot. | MISLEADING |
| Chat tab / gateway.ts chat() | POST http://localhost:8080/api/v1/chat | No | Gateway exposes POST /api/v1/ollama/chat, not /api/v1/chat. /chat page would fail. Command-center chat tab honestly says "coming soon". | PHANTOM route; honest tab placeholder |
| gateway.ts fetchSystemState() | GET /system/state | Yes | Interface drift: declares replay.success_rate/failures/witness_coverage, organizational_health, metrics.total_errors, which getSystemState never returns. No callers of fetchSystemState exist in the UI. | TRUTHFUL backend; drifted unused type |

**/system/state backend (REAL route, MISLEADING pockets)**, ping-runtime/runtime/system_authority.js:
- collectReplay: `total_runs` = count of ALL events (getAllEvents length), not replay runs. This is the previously reported "counting all events as replay runs". Also only counts REPLAY_COMPLETED nowhere. MISLEADING.
- collectMissions: `completed` = count of MISSION_CREATED events; queued/executing/failed/blocked hardcoded 0. MISLEADING.
- collectKnowledge: uses getEventsByType(..., limit=1) then .length, so knowledge_objects and reflections are capped at 1; skills/policies/evidence/proofs/witnesses/replay_certificates/historical_snapshots partially hardcoded 0 (witnesses: 0 is the "hardcoded witnesses" finding). MISLEADING.
- collectRepository: file-based, mostly honest; duplicate_warnings hardcoded 0.
- collectPostgres/collectQdrant/collectContainers/collectGit: honest live reads.

**LIVE_RUNTIME probe results (read-only GETs, 2026-09-18 ~19:23 MDT):**
- GET /system/state: 200. postgres.total_events = 0, replay.status = "unavailable", qdrant "unavailable", uptime_seconds 93322. Confirms the response shape mismatch with CockpitDashboard.
- GET /mc/replay/stats: 200. total_replays 26, verified 26, unverified 0, by_reason kernel_verified 26, provider {engine_version v1, replays_processed 1, events_replayed 1, failures 0}. TRUTHFUL and completely unwired.
- GET /mc/witness/stats: 200. attestations 26, refusals 0. TRUTHFUL and completely unwired.
- GET /mc/dashboard: 200. Real business metrics (workerActivity 9, aiRecommendations 1), missions {completed: 191, scope: persistent}, eventSummary total 45. TRUTHFUL and completely unwired.
- **Contradiction found:** /mc/* routes see 26-45 live events while /system/state's SystemAuthority sees 0 (replay "unavailable", postgres 0). The SystemAuthority's eventReadAuthority disagrees with the unifiedEventRuntime used by the /mc routes. Two backends, two truths; the cockpit trusts the wrong one. Recommend Lane P or W-0 falsify which event source each service is actually bound to in the deployed artifact.

---

## 3. Mutation button audit (does it hit a real authorized backend transition?)

| Button | Target | Real route? | Verdict |
|---|---|---|---|
| MissionCards reorder up/down | POST /api/v1/missions/cards/reorder (Next.js) | Nonexistent | UNSUPPORTED (silently swallowed) |
| MissionCards approve/reject | POST /api/v1/missions/cards/{id}/{approve,reject} (Next.js) | Nonexistent; no approve/reject contract anywhere in gateway | UNSUPPORTED |
| MCPOrchestration provider pause/resume toggle | POST /api/v1/mcp/providers/{name}/{pause,resume} (Next.js) | Nonexistent | UNSUPPORTED |
| MCPOrchestration reconnect | POST /api/v1/mcp/providers/{name}/reconnect (Next.js) | Nonexistent | UNSUPPORTED |
| OllamaControlRoom Run job | POST /api/v1/ollama/jobs/{jobId}/run (Next.js) | Nonexistent | UNSUPPORTED |
| ReasoningPuppetStrings slider (debounced save) | POST /api/v1/reasoning/weights (Next.js) | Nonexistent | UNSUPPORTED (shows fake "saving") |
| ReasoningPuppetStrings Reset Defaults | POST /api/v1/reasoning/weights (Next.js) | Nonexistent | UNSUPPORTED |
| DecisionEngine slider commit | POST http://localhost:8080/api/v1/decision/weights | Nonexistent | UNSUPPORTED (silently swallowed) |
| ConstitutionalMixer slider commit | POST http://localhost:8080/api/v1/mixer | Nonexistent | UNSUPPORTED (silently swallowed) |
| CockpitDashboard Refresh | GET /system/state | Real | SUPPORTED (read-only refresh) |
| KnowledgeGalaxy zoom/pan/search, color-mode select | none | n/a | Client-side only, no backend mutation |
| TimeMachine play/scrub/prev/next | none | n/a | Client-side only |

No UI mutation button reaches any real backend transition. The only real backend mutations the gateway offers (POST /missions, POST /orchestration/missions/:id/dispatch) have no UI caller.

---

## 4. Assessment: oracle/deploy-2026-09-18 UI honesty commits (assessed only, branch untouched)

Series by "Trish Nikitha" (external authorship, unaudited; noted, not a blocker finding):
- 25a03ab96 "stop fabricating mission API responses": replaced mock-data fabrication in src/app/api/missions/route.ts with honest 503s. Correct direction.
- de1aa3e16 "remove unsupported mission mutations": deleted fake Start/Edit/Delete buttons from MissionDetail. Correct.
- fe5f30324 "remove unwitnessed mission detail contract": gutted MissionDetail's fake contract (was fetching nonexistent /api/missions/{id}). Correct.
- 6b4222467 "hide fixture-backed missions board": replaced the /missions page (AllIssues fixture UI) with an honest "Missions unavailable until a gateway contract is configured and witnessed" notice. Correct direction.

Gaps the series does NOT cover: all four commits target the deploy branch's extended UI layer (missions pages, MissionDetail, all-issues), which does not exist in LOCAL_WORKTREE. The command-center phantoms audited above (MCPOrchestration, MissionCards, ConstitutionalLifecycle, OllamaControlRoom, DecisionEngine, ConstitutionalMixer, ReasoningPuppetStrings, KnowledgeGalaxy, TimeMachine, NightShift, SemanticMemory, OrganizationalHealth, ConstitutionalObjects, CockpitDashboard hardcoded panels) are present IDENTICALLY on oracle/deploy-2026-09-18 (TimeMachine, MCPOrchestration, command-center page verified byte-identical; CockpitDashboard same hardcoded panels with a framer-motion wrapper; MissionCards points at the equally nonexistent http://localhost:8080/api/missions). The honesty series hid one fixture board while leaving the larger phantom fleet intact on the same branch. The underlying mock components (all-issues, selectors) remain in tree, merely unmounted.

---

## 5. Ordered mutation list (by leverage; for the Mission Control writer lane)

**A. Delete / quarantine (highest leverage: removes false claims and a live crash)**
1. CockpitDashboard: fix or remove. The /system/state shape mismatch will throw on real data (s.objects undefined). Delete hardcoded panels 7-10 (Compiler, Replay, Git Snapshot, Mission Queue) or rewire panel 8 to GET /mc/replay/stats and panel 10 to GET /mc/missions/stats. This is the highest-leverage single change: it removes four invented status blocks and a crash.
2. ConstitutionalLifecycle: delete the hardcoded 9-stage all-healthy default. It inverts failure visibility (default healthy is the most dangerous phantom). If kept, it must render an explicit "no data" state until a real lifecycle contract exists.
3. MissionControlHeader, ObservatoryMode, ArchitectureView: delete outright (unmounted, Math.random metrics, hardcoded "99.9% uptime" / "All systems nominal" style claims).
4. Landing page "All systems nominal": delete the claim or bind it to a real /health probe.
5. MCPOrchestration provider pause/resume/reconnect buttons: remove until a real provider-control contract exists. Optimistic UI updates on nonexistent routes are the worst mutation pattern in the tree.
6. ReasoningPuppetStrings: remove the fake "saving" indicator and Reset persistence claim; quarantine the panel with an explicit "not wired to any backend" state.
7. DecisionEngine / ConstitutionalMixer: same treatment; sliders that POST into the void must not imply persistence.

**B. Wire to real routes (medium leverage: honest backends exist, zero UI callers)**
8. Build a Replay/Witness panel on GET /mc/replay/stats + /mc/witness/stats + /mc/replay/trace/:correlationId (live-verified: 26 verified replays, 26 attestations). This is the cheapest truthful win in the whole audit.
9. Wire KnowledgeGalaxy to GET /mc/knowledge (or /knowledge/nodes) and DROP the "Replay Verified" color mode until per-node verification data exists in the backend contract.
10. Wire MissionCards read path to GET /mc/missions/active|pending|stats (or /missions/*); keep approve/reject/reorder hidden until a real backend contract exists (no such contract today).
11. Wire NightShift to GET /mc/system or /mc/scheduler (or hide until then); fix the page-level fetch URL (currently /api/v1/system/nightshift, nonexistent).
12. Wire MCPOrchestration read tabs to GET /mc/{bridge, event-mission-bridge, scheduler, workers} and the Replay tab to /mc/replay/stats; drop provider mutation buttons (no contract).
13. Wire chat to the real POST /api/v1/ollama/chat (exists) or keep "coming soon".
14. Fix SemanticMemory fallback: distinguish 404 (no route) from Qdrant-down; wire to /system/state qdrant section when the panel is kept.
15. TimeMachine: either derive snapshots from /mc/activity windows or quarantine; the authority_drift / mission_throughput / replay_success_rate metrics have no backend and must not be invented.

**C. Keep hidden until backend contracts exist (post-witness-convergence)**
16. OrganizationalHealth gauge: no org-health authority exists; the gateway.ts organizational_health field is aspirational. Keep hidden.
17. All mission mutation buttons (approve/reject/reorder/start/edit/delete/run-job): hidden until each maps to an authorized backend transition with a witnessed contract.
18. Ollama job list/run: hidden until a real /jobs contract lands on the gateway (only /chat, /models, /autocomplete exist).

**D. Backend fixes required (for the owning lane; Lane-M is read-only, listed not changed)**
19. SystemAuthority.collectReplay: total_runs must count REPLAY_COMPLETED, not all events.
20. SystemAuthority.collectMissions: completed must not equal MISSION_CREATED count; queued/executing/failed/blocked must come from missionRuntime, not hardcoded 0.
21. SystemAuthority.collectKnowledge: remove the limit=1 cap (counts saturate at 1); witnesses/replay_certificates/historical_snapshots must be derived or omitted, not hardcoded 0.
22. Resolve the live contradiction: /system/state sees 0 events while /mc/* sees 26-45. Determine which event source the deployed SystemAuthority is actually bound to.

---

## 6. Limits of this audit

- Static route analysis plus live GET probes; POST/mutation paths were never exercised (read-only mandate).
- Which gateway build/source revision the live :8080 process runs was not established (SOURCE vs DEPLOYED authority question is Lane P / W-0 territory).
- PUBLIC_GITHUB main carries a larger UI superset (143 more files than the worktree, including store/ and issue-tracking UI with mock-data imports); only the convergence-worktree subset was fully audited. The main-branch extras were not line-audited.
- Auth model of the mutation routes was not assessed (no auth middleware observed in the audited UI paths; gateway-level auth is out of Lane-M scope).
