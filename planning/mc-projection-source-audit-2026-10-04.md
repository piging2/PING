# Mission Control Projection Data-Source Audit
**Date:** 2026-10-04 (audited against live Pig gateway)
**Scope:** Mission Control surface — landing page, `/command-center` (cockpit + command tabs), and the linked `/chat` page. Audit only; no UI code modified.
**UI repo:** `/home/nolan/ping/CascadeProjects/infra/ui-next` (Pig), branch `lane/mc-mission-card-endpoints`
**Gateway:** `/home/nolan/ping/gateway`, probed live at `http://localhost:8080` from the Pig (WSL), 2026-10-05 ~02:24 UTC

## Classification key
- **PROVEN** — data source exists and is live; widget renders it (or its absence) honestly.
- **SUSPECT** — source exists but is stale/unreachable/miswired, OR source is missing and the widget renders a quiet-but-misleading state (empty list, fallback defaults, wrong diagnosis label).
- **UNKNOWN** — source unclear or missing and the widget fabricates liveness (static/mock/random data presented as live).

## Method
1. Enumerated every fetch call in every MC-surface component.
2. Checked route existence in gateway source (`routes/*.js`, `bootstrap/gateway_runtime.js`).
3. Probed each UI-called endpoint against the live gateway (`curl`, status codes recorded below).
4. Checked relative-fetch components against the Next.js app's actual API routes (only `src/app/api/health/route.ts` exists; `next.config.js` has no rewrites).

## Live gateway probe results (Pig, 2026-10-05 ~02:24 UTC)
- `200` `/system/state` — live, fresh `generated_at`, real counts (repo 0 nodes, missions 0, knowledge 0 — honestly empty, not mocked)
- `404` `/api/v1/missions/cards` (GET), `/api/v1/decision/weights`, `/api/v1/mixer`, `/api/v1/knowledge-graph`, `/api/v1/timeline`, `/api/v1/constitutional/objects`, `/api/v1/health/organizational`, `/api/v1/system/nightshift`, `/api/v1/reasoning/weights`, `/api/v1/memory/summary`, `/api/v1/ollama/jobs`, `/api/v1/ollama/status`, `/api/v1/mcp/providers`, `/api/v1/chat`
- `401` `/api/v1/repository/living`, `/mc/missions/pending`, `/mc/inbox`, `/mc/activity` — **exist but auth-guarded** (Bearer <redacted>)
- POST-only (exist, auth-guarded, no GET): `/api/v1/missions/cards/:id/approve`, `/api/v1/missions/cards/:id/reject`, `/api/v1/missions/cards/reorder`

## Structural finding (read first)
The gateway **already exposes a real Mission Control data plane** the UI never calls: `/mc/inbox`, `/mc/missions/active`, `/mc/missions/pending`, `/mc/missions/stats`, `/mc/missions/:id/trace`, `/mc/activity`, `/mc/queues`, `/mc/replay/stats`, `/mc/witness/stats`, `/mc/dead-letters` (all in `routes/mission_control.js`, mounted at `/mc`, auth-guarded). Meanwhile the UI calls **14 endpoints that do not exist** on the gateway. The convergence direction is: rewire UI calls to `/mc/*` and `/system/state`, not build new endpoints. (`/mc/*` 401s are honest auth behavior, not failures.)

A second structural finding: six command-tab widgets use **relative** `fetch('/api/v1/...')`, which resolves against the Next.js origin — where no such routes exist and no rewrite proxies to the gateway. Even if the gateway grew those endpoints, the relative-fetch widgets would still 404. They must use the `apiFetch` gateway client like the cockpit widgets do.

## Per-widget audit

| # | Widget | File | Data source (endpoint -> table/projection) | Class | Notes |
|---|--------|------|----------------------------------------------|-------|-------|
| 1 | GatewayStatus (landing) | `src/components/GatewayStatus.tsx` | `GET {GATEWAY_URL}/system/state` -> live gateway probe | PROVEN | Three honest states: checking / reachable / unreachable + retry. Never static "nominal". |
| 2 | Night-shift badge (command-center header) | `src/app/command-center/page.tsx` | `apiFetch('/api/v1/system/nightshift')` -> **404 on gateway** | SUSPECT | Fail-quiet: 404 -> `setNightShift(false)`. Honest (badge just hidden) but the endpoint was never built. |
| 3 | Ollama status badge (header) | `src/app/command-center/page.tsx` | `apiFetch('/api/v1/ollama/status')` -> **404 on gateway** (only exists as hardcoded stub in dev `simple_server.js`) | SUSPECT | Fail-quiet -> renders 'unknown'. Honest label, dead source. |
| 4 | Repository panel | `CockpitDashboard.tsx` | `GET /system/state` -> `repository` section (repo graph projection) | PROVEN | Live. Currently 0 nodes — rendered as 0, not faked. |
| 5 | PostgreSQL panel | `CockpitDashboard.tsx` | `GET /system/state` -> `postgres` section (event spine) | PROVEN | Live. |
| 6 | Qdrant panel | `CockpitDashboard.tsx` | `GET /system/state` -> `qdrant` section | PROVEN | Live. |
| 7 | Lifecycles panel | `CockpitDashboard.tsx` | none — backend does not report lifecycle keys | PROVEN | Renders `NotReported()`: "State: Unknown / Not reported by the gateway." Honest UNKNOWN. |
| 8 | System Health panel | `CockpitDashboard.tsx` | `GET /system/state` -> sections + `metrics` | PROVEN | Live. |
| 9 | Knowledge panel | `CockpitDashboard.tsx` | `GET /system/state` -> `knowledge` section | PROVEN | Live. |
| 10 | Compiler Status panel | `CockpitDashboard.tsx` | none | PROVEN | Honest `NotReported()`. |
| 11 | Replay Status panel | `CockpitDashboard.tsx` | `GET /system/state` -> `replay` section | PROVEN | Live. |
| 12 | Git Snapshot panel | `CockpitDashboard.tsx` | none — "backend returns an empty git object" | PROVEN | Honest `NotReported()`. |
| 13 | Mission Queue panel | `CockpitDashboard.tsx` | `GET /system/state` -> `missions` section | PROVEN | Live (all zeros right now, shown as zeros). |
| 14 | OperationalFlow (Events->Objects->Knowledge->Missions->Replay) | `dashboard/OperationalFlow.tsx` | `GET /system/state`, derived per-section | PROVEN | Comment in code: "Stages the backend does not expose (e.g. INGRESS) are omitted, not invented." |
| 15 | ActivityStream | `dashboard/ActivityStream.tsx` | Derived from consecutive `/system/state` snapshots (`diffSnapshots`) | PROVEN | Explicitly labeled "derived from consecutive system-state snapshots, not a live event feed". Never invents events. |
| 16 | AttentionQueue ("Needs attention") | `dashboard/AttentionQueue.tsx` | Derived from `/system/state` thresholds | PROVEN | Empty = honest "All clear", not an absent panel. |
| 17 | ReplayMicrograph | `dashboard/ReplayMicrograph.tsx` | Derived from `/system/state` `replay` section | PROVEN | Zero runs -> "Replay health is unknown, not healthy." Never draws a fake time series. |
| 18 | ConstitutionalLifecycle | `src/components/ConstitutionalLifecycle.tsx` | **Hardcoded initial state**; polls `fetch('/api/lifecycle')` — route exists neither in Next.js nor on the gateway | UNKNOWN | **WORST OFFENDER #1.** Renders 9 pipeline stages as `health: 'healthy'` with invented confidence scores (0.7-1.0) and latencies (150ms, 2000ms). Poll failures are swallowed (`console.error` only) so the fabricated "healthy" defaults persist forever. Pure mock-as-live. |
| 19 | OrganizationalHealth | `src/components/OrganizationalHealth.tsx` | `fetch('/api/v1/health/organizational')` relative -> Next.js 404; gateway 404 | SUSPECT | Rendering is honest ("Health data unavailable") but the source was never built; `organizational_health` only exists as a section inside `/system/state`. |
| 20 | NightShift | `src/components/NightShift.tsx` | `fetch('/api/v1/system/nightshift')` relative -> Next.js 404; gateway 404 | SUSPECT | Honest "Error: Failed to fetch". Source missing. |
| 21 | LivingRepository | `src/components/LivingRepository.tsx` | `fetch('/api/v1/repository/living')` relative -> Next.js 404; gateway 401 (exists, auth-guarded) | SUSPECT | Honest "Repository growth data unavailable". Doubly broken: wrong origin AND unauthenticated. |
| 22 | DecisionEngine | `src/components/DecisionEngine.tsx` | `fetchJson('/api/v1/decision/weights')` -> **404 on gateway** | SUSPECT | **Looks live.** Load failure silently falls back to 0.5 for every slider with no "unavailable" indicator. Commit failures do show an honest banner. |
| 23 | ConstitutionalMixer | `src/components/ConstitutionalMixer.tsx` | `fetchJson('/api/v1/mixer')` -> **404 on gateway** | SUSPECT | Same silent-0.5 pattern as DecisionEngine. |
| 24 | ReasoningPuppetStrings | `src/components/ReasoningPuppetStrings.tsx` | `fetch('/api/v1/reasoning/weights')` relative -> Next.js 404; gateway 404; POST same | SUSPECT | **WORST OFFENDER #3.** Silent fallback to `DEFAULT_WEIGHTS` presented as config; footer claims "Changes are debounced and saved automatically" while POSTs 404 and failures are swallowed (`.finally(setSaving(false))`). Reads fake AND writes fake. |
| 25 | KnowledgeGalaxy | `src/components/KnowledgeGalaxy.tsx` | `fetchJson('/api/v1/knowledge-graph')` -> **404 on gateway** | SUSPECT | Honest error banner. Source missing. |
| 26 | OllamaControlRoom | `src/components/OllamaControlRoom.tsx` | `fetch('/api/v1/ollama/jobs')` + `/status` relative -> Next.js 404; gateway 404 | SUSPECT | **Looks live.** Poll failures are silently swallowed; renders an empty job list, which reads as "no jobs" when it means "no data". |
| 27 | TimeMachine | `src/components/TimeMachine.tsx` | `fetchJson('/api/v1/timeline')` -> **404 on gateway** | SUSPECT | Honest error banner. Source missing. |
| 28 | SemanticMemory | `src/components/SemanticMemory.tsx` | `fetch('/api/v1/memory/summary')` relative -> Next.js 404; gateway 404 | SUSPECT | **Misleading label.** Any fetch failure renders "Qdrant not connected" — a wrong diagnosis (the endpoint doesn't exist; Qdrant may be fine). |
| 29 | ConstitutionalObjects | `src/components/ConstitutionalObjects.tsx` | `apiFetch('/api/v1/constitutional/objects')` -> **404 on gateway** | SUSPECT | Honest error banner. Source missing (this is a known backlog gap). |
| 30 | MissionCards | `src/components/MissionCards.tsx` | `GET /api/v1/missions/cards` -> **404 (no GET route exists)**; POST approve/reject/reorder exist, auth-guarded | SUSPECT | GET renders an honest 404 error banner, so the widget is permanently empty against the live gateway. POST routes are real (`routes/mission_cards.js`, decider derived from authenticated caller, fabricated-identity rejected) but the UI sends no auth header -> would 401. Approval chain is implemented server-side; the read half is missing. |
| 31 | MCPOrchestration | `src/components/MCPOrchestration.tsx` | `fetch('/api/v1/mcp/...')` x5 relative -> Next.js 404; gateway 404 | SUSPECT | **Looks live.** `.catch(() => setLoading(false))` leaves empty providers/events/matrix/queue/replay arrays -> renders empty tables as if the MCP plane were idle. POST toggle/reconnect also 404s silently. |
| 32 | MissionControlHeader (/chat page) | `src/components/MissionControlHeader.tsx` | **None — `Math.random()`** | UNKNOWN | **WORST OFFENDER #2.** Comment literally says `// Simulate runtime updates`. Initial state hardcodes `gateway: 'healthy'`, `ollama: 'connected'`, `model: 'qwen3-coder'`; a 2s interval randomizes latency, contextUsage, and tok/s readouts. Fabricated liveness on a page linked from the landing page. |
| 33 | Chat sendMessage (/chat page) | `src/app/chat/page.tsx` | `apiPost('/api/v1/chat')` -> **404 on gateway** (real chat is `POST /api/v1/ollama/chat`) | SUSPECT | Honest "Request failed" message. Wrong endpoint path. |

Not on the surface (excluded from counts): `ObservatoryMode` (unreferenced dead component), `ArchitectureView`, `EmptyStateRedesign`, `PromptLibrary`, `MessageList`, `MessageInput`, `PremiumChatBubble`, `ModelSelector` (chat-page chrome, no data claims audited), provenance primitives (`FreshnessBadge` etc. — honest by design: UNKNOWN without a timestamp).

## The three worst offenders
1. **ConstitutionalLifecycle** — nine pipeline stages rendered "healthy" with invented confidence scores and latencies from hardcoded initial state; the only live input (poll of `/api/lifecycle`) hits a route that exists nowhere, and failures are swallowed. A visitor sees a fully healthy constitutional pipeline that is pure fiction.
2. **MissionControlHeader** (`/chat`) — `Math.random()`-driven latency, context usage, and tok/s "streaming" readouts behind a `// Simulate runtime updates` comment, with gateway/ollama hardcoded healthy/connected. Fabrication, not approximation.
3. **ReasoningPuppetStrings** — silent default weights shown as live configuration, plus a footer promise ("Changes are debounced and saved automatically") that is false: saves POST to a nonexistent route and swallow failures. Deceptive in both directions.

## Tallies
- Widgets audited: **33**
- PROVEN: **15** (all `/system/state`-backed: GatewayStatus, 10 cockpit panels incl. 3 honest NotReported, OperationalFlow, ActivityStream, AttentionQueue, ReplayMicrograph)
- SUSPECT: **16** (source missing or miswired; ~half render honest errors, ~half render quiet misleading states)
- UNKNOWN (fabricates liveness): **2**
- **Does any widget fabricate liveness? YES** — ConstitutionalLifecycle and MissionControlHeader present static/random data as live system state.

## Recommended smallest corrections (for the parent to schedule, not this lane)
1. Delete or gate `ConstitutionalLifecycle`'s hardcoded defaults behind UNKNOWN until `/api/lifecycle` exists; better: derive from `/system/state` like the cockpit does.
2. `MissionControlHeader`: wire to the real gateway probe (`/system/state`) or remove the simulated metrics.
3. `ReasoningPuppetStrings` / `DecisionEngine` / `ConstitutionalMixer`: mark weights UNKNOWN when the fetch fails; surface save failures.
4. Rewire the command tab to the existing `/mc/*` + `/system/state` data plane instead of the 14 nonexistent `/api/v1/*` endpoints; fix relative-fetch widgets to use the `apiFetch` gateway client.
5. `MissionCards`: add the missing `GET /api/v1/missions/cards` (or point the UI at `/mc/missions/pending`) and send the exterior auth credential the POST routes require.
6. `SemanticMemory`: fix the "Qdrant not connected" label to a neutral "Memory data unavailable".

## Proof level
SOURCE (code) + live gateway probes from the Pig. Not a browser rendering test — a real browser pass should confirm the 404/401 banners render as coded.
