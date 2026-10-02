# UI Harvest Backlog — PING UI surfaces

Pass date: 2026-09-19 ~14:30 MDT · Lane: ui-harvest (READ-ONLY, no worktree files modified)
Worktree: /home/nolan/worktrees/constitutional-convergence-authority-law @ 1995f0a59
Method: source read on Pig via pigwsl-run.sh + LIVE probes against ping-gateway :8080 (the UI's
configured backend). A screen is WIRED only if a live probe returned the data it renders.

Trace key: SCREEN -> USER INTENT -> API -> AUTHORITY -> EVENT -> RESULT -> EVIDENCE.
Classifications: MOCK (fabricated data), DEAD (action/backend nonfunctional), ORPHAN (unreachable
code or undeployed surface), UNWIRED (real backend capability with no UI), STALE (doc/inventory
drifted from reality), FRICTION (UX dead-end / cosmetic).

Related prior art: `CascadeProjects/infra/ui-next/src/components/NotLiveInventory.tsx` already
inventories 13 phantom/unwired surfaces. This pass VERIFIED most of those claims, and found the
inventory itself has drifted (F7) plus 4 orphan components it never listed (F8).

---

## F1 — MissionControlHeader renders fabricated status pills (MOCK, mounted)

- SCREEN: `/chat` page header (`MissionControlHeader`, mounted in `src/app/chat/page.tsx`)
- INTENT: operator glances at model / gateway / ollama / latency / context health
- TRACE: screen -> no API call at all -> no authority -> no event -> renders hardcoded
  `gateway: 'healthy'`, `ollama: 'connected'`, `model: 'qwen3-coder'`; a 2s interval "simulates
  runtime updates" with `Math.random()` latency (`// Simulate runtime updates`)
- EVIDENCE: `src/components/MissionControlHeader.tsx:17-36`; live 2026-09-19:
  `GET /health` -> 503 unhealthy; `POST /api/v1/ollama/chat` -> 500 "fetch failed".
  The pill says "connected" while the backend it names is broken. This is the exact
  failure-inverting pattern the inventory condemns in ConstitutionalLifecycle.
- CLASSIFICATION: MOCK (failure-inverting)
- PROPOSED MINIMUM FIX: replace simulation with `GET /health` + `GET /api/v1/ollama/models`
  (both live, unauthenticated); render `unknown`/`unhealthy` honestly on failure. If that is
  too much work, unmount the header until wired.
- VALUE: HIGH — stops the operator trusting a dead backend; restores credibility of the
  whole console
- RISK: LOW (read-only GETs)

## F2 — /chat Send is dead: POST /api/v1/ollama/chat -> 500 (DEAD backend wiring)

- SCREEN: `/chat` -> message input -> Send button
- INTENT: chat with CRX/PING through ollama
- TRACE: screen -> `POST {GATEWAY}/api/v1/ollama/chat` -> gateway attempts upstream ollama
  fetch -> fails (`{"status":"error","error":"fetch failed"}`) -> no authority reached ->
  no event -> UI appends "Request failed: ..." as an assistant message
- EVIDENCE: live probe 2026-09-19 `POST /api/v1/ollama/chat` -> 500; `curl :11434/api/tags`
  -> 200 (ollama IS up on the Pig host). Failure is gateway->ollama connectivity/config
  (container networking or OLLAMA_URL), not ollama being down.
- CLASSIFICATION: DEAD (backend wiring; UI error handling itself works)
- PROPOSED MINIMUM FIX: fix gateway ollama upstream address (host networking / env);
  UI-side add a persistent banner when chat is unavailable instead of per-message errors.
- VALUE: HIGH — restores the primary surface of the /chat route
- RISK: LOW-MEDIUM (gateway config change; no code authority changes)

## F3 — ArchitectureView is a hardcoded "all healthy" diagram (MOCK, mounted)

- SCREEN: `/chat` -> Architecture tab (`ArchitectureView`, mounted)
- INTENT: see system architecture health at a glance
- TRACE: screen -> no API -> no authority -> no event -> four nodes hardcoded
  `status: 'healthy'` (Next.js UI, Gateway, Ollama, qwen3-coder)
- EVIDENCE: `src/components/ArchitectureView.tsx:13-30`; live `/health` is 503;
  live models are `qwen2.5-coder:7b/14b`, so even the hardcoded model name is wrong.
- CLASSIFICATION: MOCK
- PROPOSED MINIMUM FIX: derive node statuses from `GET /health` components object
  (gateway/qdrant/embedding/event_runtime all present); or unmount until wired.
- VALUE: MEDIUM-HIGH — same failure-inversion class as F1
- RISK: LOW (read-only)

## F4 — EmptyStateRedesign: dead "Suggested Actions" + hardcoded "Operational" (DEAD + MOCK)

- SCREEN: `/chat` empty state (`EmptyStateRedesign`, mounted when no messages)
- INTENT: operator picks a suggested action to get started
- TRACE: screen -> action `<button>`s have NO onClick -> nothing happens; status badge
  hardcodes "Operational"
- EVIDENCE: `src/components/EmptyStateRedesign.tsx:112-121` (button without onClick);
  "Operational" hardcoded near line 101
- CLASSIFICATION: DEAD buttons + MOCK status
- PROPOSED MINIMUM FIX: wire buttons to fill the chat input (or remove them); drop the
  hardcoded status or bind it to `/health`
- VALUE: MEDIUM (first-run UX; the empty state is the front door of /chat)
- RISK: LOW

## F5 — PromptLibrary prompt buttons do nothing (DEAD)

- SCREEN: `/chat` sidebar (`PromptLibrary`, mounted in chat view mode)
- INTENT: click a quick-start prompt to insert it into chat
- TRACE: screen -> category toggle works; individual prompt `<button>`s have no onClick
  -> no API -> no effect
- EVIDENCE: `src/components/PromptLibrary.tsx:116-121`
- CLASSIFICATION: DEAD
- PROPOSED MINIMUM FIX: lift an `onSelect(prompt)` callback to `chat/page.tsx` that fills
  the input; or render prompts as non-button text
- VALUE: MEDIUM (sidebar exists solely for this action)
- RISK: LOW

## F6 — KnowledgeGalaxy: edges hardcoded [], every node mislabeled "Implementation" (UNWIRED + mislabeled)

- SCREEN: `/command-center` -> Command tab -> Knowledge Galaxy
- INTENT: explore the knowledge graph: what relates to what
- TRACE: screen -> `GET /mc/knowledge?limit=100` -> 200, 86 nodes, ALL
  `node_type: "event"`, NO edges key in response -> UI does
  `setData({ nodes: mapped, edges: [] })` (edges hardcoded empty despite full edge-render
  code downstream) -> `typeOf()` substring-matches "authority"/"capability", defaulting
  everything else to `Implementation` -> all 86 event-nodes pile into the outer
  "Implementation" ring; Authority/Capability rings permanently empty
- EVIDENCE: `src/components/KnowledgeGalaxy.tsx:97,109-121`; live probe 2026-09-19
  (`node_types: Counter({'event': 86})`, `"edges" in response == False`)
- CLASSIFICATION: UNWIRED (edges missing on both sides) + MISLABELED (type coercion)
- PROPOSED MINIMUM FIX: UI minimum — stop coercing: render `node_type` honestly
  (an "Event" ring, or raw type labels) instead of forcing Authority/Capability/
  Implementation. Backend follow-up — emit edges and real node types from /mc/knowledge.
- VALUE: HIGH for the intel value of the graph view (a node cloud with no relationships
  is decoration); backend work required for full value
- RISK: LOW (read-only; UI change is label-only)

## F7 — NotLiveInventory has drifted from reality (STALE)

- SCREEN: `/command-center` -> Command tab -> "Preserved surfaces, not live" panel
- INTENT: operator trusts the honesty inventory as the canonical phantom list
- TRACE: inventory claims vs verified reality —
  (a) "MissionControlHeader: Already unmounted. Polled nonexistent routes." -> actually
  MOUNTED on /chat and polls nothing (it mocks, F1);
  (b) "ArchitectureView: Already unmounted." -> actually MOUNTED on /chat (F3);
  (c) "Real routes: /api/v1/ollama/chat, /api/v1/ollama/models, /api/v1/ollama/autocomplete"
  -> live: chat is 500, models is 200, autocomplete is 404.
- EVIDENCE: `src/components/NotLiveInventory.tsx:21-23` vs `src/app/chat/page.tsx`
  imports; live probes 2026-09-19
- CLASSIFICATION: STALE (inventory drift — the honesty system itself is now dishonest)
- PROPOSED MINIMUM FIX: regenerate the inventory from the import graph + live route
  probes (mechanical: which components are imported by a route, which fetch targets
  return non-404/5xx)
- VALUE: MEDIUM — the inventory is the trust anchor for "projection, not authority";
  drift here undermines it
- RISK: NONE (doc/component text change)

## F8 — Orphan cluster never inventoried: MessageList, MessageInput, ModelSelector, MarkdownRenderer (ORPHAN)

- SCREEN: none (unreachable from any route)
- INTENT: n/a (dead code path: a richer chat message list with markdown, copy/regenerate/
  edit actions, model picker, autosizing input)
- TRACE: `MessageList` imports `MarkdownRenderer` + `@/types`; nothing imports
  `MessageList`, `MessageInput`, or `ModelSelector`; `src/types.ts` (`ChatMessage`, `Chat`,
  `OllamaModel`) exists only to serve this cluster (+ a `SessionConfig` duplicate of
  lib/gateway.ts). The live chat page uses `PremiumChatBubble` instead.
- EVIDENCE: repo-wide grep 2026-09-19 — zero importers outside the cluster;
  NotLiveInventory lists 13 surfaces but not these 4
- CLASSIFICATION: ORPHAN (code)
- PROPOSED MINIMUM FIX: add the four to NotLiveInventory as ORPHAN (preservation law:
  keep in tree, label honestly) — or adopt MessageList as the chat renderer and retire
  PremiumChatBubble (one chat renderer, not two)
- VALUE: LOW-MEDIUM (tree hygiene; honest inventory)
- RISK: NONE

## F9 — lib/gateway.ts dead exports; chat page duplicates chat() (DEAD code + duplicate)

- SCREEN: n/a (library)
- INTENT: single gateway client for the UI
- TRACE: `fetchSystemState`, `chat()`, `streamChat()` are never imported by any
  component; `chat/page.tsx` re-implements the POST inline (and drops `temperature`);
  `streamChat` sends `stream: false` and yields once — fake streaming
- EVIDENCE: repo-wide import grep 2026-09-19
- CLASSIFICATION: DEAD code + DUPLICATE concept
- PROPOSED MINIMUM FIX: make `chat/page.tsx` use `chat()` from the lib; delete
  `streamChat` or implement real SSE streaming
- VALUE: LOW (maintainability; prevents future divergence bugs)
- RISK: NONE

## F10 — chat latency NaN + /chat is a navigation dead-end (FRICTION)

- SCREEN: `/chat`
- INTENT: see response metadata; navigate back to Command Center
- TRACE: `generationTime: data.latency_ms / 1000` -> NaN when the field is absent
  (bubble hides it via falsy guard — cosmetic only); page contains zero links to
  `/command-center` (grep for href: none)
- EVIDENCE: `src/app/chat/page.tsx:49`, `src/components/PremiumChatBubble.tsx:61-63`
- CLASSIFICATION: FRICTION / cosmetic
- PROPOSED MINIMUM FIX: `data.latency_ms != null ? data.latency_ms/1000 : undefined`;
  add a header link back to /command-center
- VALUE: LOW
- RISK: NONE

## F11 — Next /api/health hardcodes healthy; Dockerfile trusts it (MOCK)

- SCREEN: deployment healthcheck
- INTENT: orchestrator knows whether UI+gateway are actually up
- TRACE: `GET /api/health` -> `{status:'healthy'}` unconditionally; Dockerfile
  `HEALTHCHECK curl -f http://localhost:3000/api/health`
- EVIDENCE: `src/app/api/health/route.ts`; `CascadeProjects/infra/ui-next/Dockerfile`;
  live gateway `GET /health` -> 503 at the same time
- CLASSIFICATION: MOCK
- PROPOSED MINIMUM FIX: make the route proxy-check `GET {GATEWAY_URL}/health` with a
  short timeout and degrade honestly (200 healthy / 503 degraded with detail)
- VALUE: MEDIUM (deploy-time truth; prevents "healthy" containers backed by a 503 gateway)
- RISK: LOW

## F12 — ui-next is not deployed anywhere (ORPHAN, deployment)

- SCREEN: all of `/`, `/chat`, `/command-center`
- INTENT: operator opens the console
- TRACE: Dockerfile exists, `.next` build output exists in-tree, but nothing listens
  on :3000 on the Pig and no compose/service definition references ui-next outside its
  own directory
- EVIDENCE: `curl :3000` -> 000/no listener 2026-09-19; repo-wide compose/Dockerfile
  grep (only ping-runtime orchestration JSON data-files mention it)
- CLASSIFICATION: ORPHAN (deployment)
- PROPOSED MINIMUM FIX: add a compose service (or document the intended deploy target
  and who starts it); until then label the surface "not deployed" in the repo
- VALUE: MEDIUM — the console cannot be used at all until served; all other UI fixes
  are moot without this
- RISK: LOW (additive infra)

## F13 — GET /health component detail has no UI surface (UNWIRED, hidden capability)

- SCREEN: none
- INTENT: operator diagnoses WHY the gateway is unhealthy and watches runtime vitals
- TRACE: `GET /health` (live, unauthenticated, 503) returns a rich components object:
  gateway memory (rss/heap), event_runtime (emitted 36 / persisted 36 / dispatched 10 /
  failed 0 / handlers 28), event_governance (36 passed, 0 rejected), integrations
  (posthog/email/sms registered but apiKey/smtpHost/fromNumber "not configured",
  0 sent), qdrant `{error: "fetch failed"}`, embedding `not_initialized` ->
  NO component reads it; CockpitDashboard "Stores" shows only /system/state's
  qdrant "unavailable"
- EVIDENCE: live `GET /health` body 2026-09-19; grep: no `/health` fetch in ui-next src
- CLASSIFICATION: UNWIRED (backend capability not exposed)
- PROPOSED MINIMUM FIX: add a read-only "/health components" panel to CockpitDashboard
  (per-component status pills + event_runtime counters + integration config state)
- VALUE: HIGH — single richest operator signal available; explains the 503, the qdrant
  outage, and the unconfigured integrations at a glance
- RISK: LOW (read-only GET)

## F14 — /events exists but needs auth; UI has no auth story (UNWIRED, by design)

- SCREEN: none
- INTENT: submit/query events through the UI
- TRACE: `GET /events?limit=1` -> 401 `{"status":"denied","reason":"Missing
  authentication","code":"MISSING_AUTH"}` -> UI has no login/token handling and no
  submission surface
- EVIDENCE: live probe 2026-09-19
- CLASSIFICATION: UNWIRED (by design — Mission Control is a projection surface per
  commit efaaf69c9 "Phase 24: Mission Control as projection surface, not authority")
- PROPOSED MINIMUM FIX: none now; record the read-only boundary in NotLiveInventory
  so a future auth story is a conscious decision, not an accident
- VALUE: LOW (documents boundary)
- RISK: NONE

## F15 — gateway/simple_server.js is a stale, shape-incompatible mock backend (STALE MOCK)

- SCREEN: n/a (dev fixture)
- INTENT: develop the UI against a local stub gateway
- TRACE: stub serves canned `/system/state` with shape
  `{timestamp, services, compiler, replay, witness, objectGraph, ollama, gateway}` vs the
  real gateway's `{version, containers, git, repository, knowledge, missions, replay,
  postgres, qdrant, metrics}`; stub's `/api/v1/ollama/status` is 404 on the live gateway
- EVIDENCE: `gateway/simple_server.js:76-110`
- CLASSIFICATION: STALE MOCK
- PROPOSED MINIMUM FIX: regenerate stub responses from live shapes (or delete the stub;
  it is not referenced by ui-next package.json scripts)
- VALUE: LOW (dev confusion only)
- RISK: NONE

## F16 — presentping/ is an orphan artifact generator (ORPHAN)

- SCREEN: none served
- INTENT: (apparent) generate PING architecture slide decks / civilization visuals
- TRACE: `package.json` (`ping_presentation`, pptxgenjs + sharp), `engine/` +
  `config/` + `artifacts/` producing narrative/camera/district JSON -> no code imports
  it, no doc references it as a live surface, no UI serves it
- EVIDENCE: repo-wide grep 2026-09-19 — references only inside ping-runtime
  orchestration JSON data files (word matches, not wiring)
- CLASSIFICATION: ORPHAN
- PROPOSED MINIMUM FIX: document purpose + owner (website content pipeline?) or move
  under an archived/marketing directory with a README
- VALUE: LOW
- RISK: NONE

## F17 — CRX_UI_EVOLUTION_SPECIFICATION.md "Current State" is obsolete (STALE)

- SCREEN: n/a (doc)
- INTENT: plan UI evolution from an accurate baseline
- TRACE: spec's "Current State Analysis" describes a pre-redesign UI: fetches
  `localhost:8080/api/v1/chat` (a route that never existed), "No prompt library",
  "No alternate views", "No observability features" — all superseded by the current
  command-center/chat/architecture UI
- EVIDENCE: `CascadeProjects/infra/ui-next/CRX_UI_EVOLUTION_SPECIFICATION.md`
- CLASSIFICATION: STALE
- PROPOSED MINIMUM FIX: mark superseded with a pointer to current reality, or refresh
  the baseline section
- VALUE: LOW
- RISK: NONE

## F18 — command-center "Chat" tab is a link-out dead end (FRICTION)

- SCREEN: `/command-center` -> Chat tab
- INTENT: switch to chat without losing context
- TRACE: tab renders a static "Chat lives on its own route" panel with an
  "Open Chat" link (full page navigation to /chat)
- EVIDENCE: `src/app/command-center/page.tsx` chat-tab branch
- CLASSIFICATION: FRICTION (minor)
- PROPOSED MINIMUM FIX: acceptable as-is; or make it a real tab that embeds the chat
  view instead of a placeholder panel
- VALUE: LOW
- RISK: NONE

---

## Verified WIRED (not findings — recorded so the next pass doesn't re-litigate)

- CockpitDashboard: 5 live sources (`/system/state`, `/mc/dashboard`, `/mc/replay/stats`,
  `/mc/witness/stats`, `/mc/missions/stats` — all 200 live), loading skeleton, per-source
  error list, source labels, discrepancy banner when counts disagree. Exemplary.
- MissionCards (`/mc/missions/pending`, `/mc/missions/active`): wired, loading/error/empty
  states, read-only with source label.
- LivingRepository, SemanticMemory (`/system/state` blocks): wired, loading + empty/failed
  states, honest `unknown` rendering.
- DecisionEngine / MCPOrchestration / ConstitutionalMixer / ReasoningPuppetStrings /
  NightShift / TimeMachine / ConstitutionalObjects / OrganizationalHealth /
  ConstitutionalLifecycle / OllamaControlRoom / ObservatoryMode: inventory's PHANTOM/
  UNWIRED classifications VERIFIED (spot-checked DecisionEngine: POSTs to nonexistent
  `/api/v1/decision/weights` with `.catch(()=>{})` silent swallow; all unmounted).
- `end_to_end_verifier.js` "available_endpoints" (`/objects`, `/graph/query`): 404 live —
  verifier doc claims are stale, noted for the record.
