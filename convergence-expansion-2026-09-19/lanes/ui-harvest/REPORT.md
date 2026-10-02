# UI Harvest Report — 2026-09-19

Lane: ui-harvest (READ-ONLY) · Worktree @ 1995f0a59 · No worktree files modified.
Method: source inspection on the Pig + live probes against `ping-gateway` :8080
(the UI's configured backend, `NEXT_PUBLIC_GATEWAY_URL` default `http://localhost:8080`).
A screen counts as WIRED only if a live probe returned the data it renders.

## Surfaces inspected

1. **ui-next** (`CascadeProjects/infra/ui-next`) — Next.js 14 operator console. Routes:
   `/` (landing), `/chat` (chat + cockpit + architecture views), `/command-center`
   (cockpit / command / chat tabs). 26 components, `lib/gateway.ts` client,
   Dockerfile + `/api/health` route. **Not deployed**: nothing listens on :3000 on the
   Pig; no compose service references it. Console is source-only today.
2. **presentping/** — PPTX/civilization-visual generator (`pptxgenjs` + `sharp`).
   No UI served, no code references it. Orphan artifact tool.
3. **gateway/simple_server.js** — dev stub with canned `/system/state` whose shape no
   longer matches the real gateway. Stale mock.
4. **constitutional-compiler/frontends/typescript** — compiler frontend, not a UI
   surface (build tooling). No findings.
5. **Live gateway route inventory** (probed 2026-09-19): 200s — `/system/state`,
   `/mc/knowledge`, `/mc/missions/pending`, `/mc/missions/active`, `/mc/dashboard`,
   `/mc/replay/stats`, `/mc/witness/stats`, `/mc/missions/stats`,
   `/api/v1/ollama/models`; 500 — `POST /api/v1/ollama/chat` ("fetch failed");
   503 — `/health` (unhealthy: qdrant error, embedding not_initialized);
   401 — `/events` (auth required); 404 — `/api/v1/ollama/status`,
   `/api/v1/ollama/autocomplete`, `/objects*`, `/graph/query`.

Prior art: `NotLiveInventory.tsx` already lists 13 phantom/unwired surfaces. This pass
verified those claims, found the inventory itself has drifted (F7), and found 4 more
orphan components it never listed (F8).

## Finding counts by classification

| Classification | Count | Findings |
|---|---|---|
| MOCK (fabricated data / failure-inverting) | 4 | F1 MissionControlHeader, F3 ArchitectureView, F4 empty-state "Operational" + dead buttons, F11 Next /api/health |
| DEAD (action or backend nonfunctional) | 4 | F2 chat POST 500, F4 suggested-action buttons, F5 prompt buttons, F9 dead lib exports |
| UNWIRED (real capability, no UI) | 3 | F6 graph edges + types, F13 /health component detail, F14 /events auth boundary |
| ORPHAN (unreachable code / undeployed) | 3 | F8 MessageList cluster (4 comps), F12 ui-next undeployed, F16 presentping |
| STALE (doc/inventory drift) | 3 | F7 NotLiveInventory drift, F15 simple_server stub, F17 evolution spec |
| FRICTION / cosmetic | 2 | F10 latency NaN + no back-nav, F18 chat-tab dead end |
| **Total** | **18** | full traces in UI_HARVEST_BACKLOG.md |

Headline pattern: the **mounted** command-center panels (CockpitDashboard, MissionCards,
LivingRepository, SemanticMemory, KnowledgeGalaxy-data) are honestly wired with loading /
error / empty states and source labels — the "projection, not authority" discipline held
there. The rot is concentrated on **/chat**: its header, architecture tab, empty state,
and prompt sidebar all fabricate or dead-end, and its one real action (Send) 500s
because the gateway cannot reach ollama (ollama itself is up on :11434).

## Top 3 highest-leverage UI items

1. **F1 — De-mock MissionControlHeader (wire to /health).** The header is the first
   thing an operator sees and it currently inverts failure into success ("Ollama
   connected" while chat 500s, "Gateway healthy" while /health is 503). Both
   `GET /health` and `GET /api/v1/ollama/models` are live and unauthenticated; this is
   a small read-only change that removes the single most trust-damaging element in the
   console. (Same fix pattern covers F3.)
2. **F2 — Fix gateway -> ollama connectivity.** `POST /api/v1/ollama/chat` returns 500
   "fetch failed" while ollama answers 200 on :11434, so this is gateway container
   networking / OLLAMA_URL config, not a missing model. Restores the entire /chat
   surface, which is otherwise fully built (bubbles, metadata, empty state, prompt
   sidebar). UI-side, add a persistent unavailable banner.
3. **F13 — Surface /health component detail in CockpitDashboard.** The richest operator
   signal in the system (per-component status, gateway memory, event_runtime
   emitted/persisted/dispatched, integration config state showing posthog/email/sms
   registered-but-unconfigured, qdrant error, embedding not_initialized) is one
   unauthenticated GET away and rendered nowhere. A read-only panel here explains the
   503 at a glance and gives the operator the "why" behind every other dashboard zero.

## Notes / caveats

- "Wired" is judged against the **running** gateway (devin-boundary2 image), which is
  older than the worktree: `/mc/*` routes have no definitions in the worktree's
  `gateway/` tree but answer 200 live. Certified-vs-running gap is real here; UI traces
  above use the running backend as ground truth.
- F12 gates everything: until ui-next is served (:3000 or otherwise), all console fixes
  are latent. Suggest pairing F12 with any F1-F3 work.
- No browser automation was used or needed; all findings are source- and probe-evidence.
