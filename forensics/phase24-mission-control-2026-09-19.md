# Phase 24 Mission Control UI: Forensics Report
Date: 2026-09-19
Lane: Phase 24 (Mission Control parallel lane)
Worktree: `/home/nolan/worktrees/constitutional-convergence-authority-law`
Branch: `constitutional-convergence-authority-law`

## Objective

Rebuild Mission Control as a projection, explanation, and authorized control surface. It must never become another authority. Every mounted surface must read from a real backend route with a verified response contract. Phantom surfaces (backed by nonexistent routes) are preserved in the tree but not mounted. Unwired surfaces are listed in a visible inventory, not silently dropped.

Governing law: "Refactor authority, preserve mechanism."

## Per-Surface Classification

### REAL + REPAIRED (mounted, wired to real routes)

**CockpitDashboard** (was: REAL + WRONG CONTRACT)
- Was crashing on real `/system/state` data (expected wrong shape), contained hardcoded "Ready", "Healthy", "Immutable", fake zero metrics, "Genesis Initialized".
- Now: reads `/system/state`, `/mc/dashboard`, `/mc/replay/stats`, `/mc/witness/stats`, `/mc/missions/stats`. Labels every value with its source route and scope. Displays the event-count discrepancy across sources instead of collapsing to one number. No hardcoded health assertions.

**MissionCards** (was: PHANTOM mutation contract)
- Was calling nonexistent mission-card mutation routes.
- Now: read-only. Reads `/mc/missions/pending` and `/mc/missions/active` via MissionRuntime. Deduplicates by mission_id, renders actual fields (type, status, priority, assignee, timestamps, error). Explicitly labels itself read-only; Mission Control never mutates mission state.

**KnowledgeGalaxy** (was: PHANTOM route)
- Was calling `/api/v1/knowledge-graph` (nonexistent).
- Now: rewired to `/mc/knowledge?limit=100` (real route returning knowledge graph projection nodes). Maps node_id, node_type, label, confidence, namespace to the galaxy visualization. Labels that the edge feed has no backing route (renders nodes only).

**LivingRepository** (was: UNWIRED)
- Was calling `/api/v1/repository/living` (nonexistent).
- Now: rewired to `/system/state` repository section (real, via SystemAuthority). Renders intents, authorities, capabilities, specifications, total_nodes, total_edges.

**SemanticMemory** (was: PHANTOM)
- Had no backing route.
- Now: rewritten to read `/system/state` knowledge + qdrant sections (real, via SystemAuthority). Shows knowledge objects, reflections, skills, policies, evidence, witnesses, plus vector store status/collections/points. Honest "unavailable" fallback if `/system/state` does not respond.

### PHANTOM (preserved in tree, NOT mounted)

These components remain in the source tree per the preservation law but are not mounted in production:

- **ConstitutionalLifecycle**: calls `/api/lifecycle` (nonexistent). Renders a default-healthy view that infers failure into success.
- **NightShift**: calls `/api/v1/system/nightshift` (nonexistent).
- **DecisionEngine**: calls `/api/v1/decision/weights` (nonexistent). Persists weight edits only to local state.
- **ConstitutionalMixer**: calls `/api/v1/mixer` (nonexistent). Persists mix edits only to local state.
- **ReasoningPuppetStrings**: calls `/api/v1/reasoning/weights` (nonexistent). Persists edits only to local state.
- **OllamaControlRoom**: calls `/api/v1/ollama/jobs` and `/api/v1/ollama/status` (nonexistent). Real routes are `/api/v1/ollama/chat`, `/api/v1/ollama/models`, `/api/v1/ollama/autocomplete`.
- **MCPOrchestration**: calls `/api/v1/mcp/*` (nonexistent), including pause/resume/reconnect mutations with no backend.
- **MissionControlHeader**: already unmounted. Polled nonexistent routes for its status pills.
- **ObservatoryMode**: already unmounted. No backing route.
- **ArchitectureView**: already unmounted. Rendered a static diagram with no live data.

### UNWIRED (preserved in tree, NOT mounted, listed in inventory)

- **TimeMachine**: calls `/api/v1/timeline` (nonexistent). Timeline visualization preserved for a future real timeline route.
- **ConstitutionalObjects**: calls `/api/v1/constitutional/objects` (nonexistent). Authority/law browser preserved for a future real route.
- **OrganizationalHealth**: calls `/api/v1/health/organizational` (nonexistent). Preserved for a future real health route.

### Chat surface

- `/chat` was directly calling nonexistent `/api/v1/chat`.
- Now: calls real `/api/v1/ollama/chat` via gateway URL from environment (no hardcoded localhost:8080).
- `lib/gateway.ts`: `streamChat` and `chat` helpers now target `/api/v1/ollama/chat` (real). Removed the `model` field from the request body (the real route uses its internal router model, ignores client model).
- `MissionControlHeader` and `ArchitectureView` were already unmounted from the chat path.

### Landing page

- Removed hardcoded "All systems nominal" badge.
- Now reads: "Live system status is shown inside the Command Center" (neutral, no health claim).
- Fixed mislabeled "Cockpit View" link (now correctly labeled "Chat", points to /chat).

## Files Changed (10)

All under `CascadeProjects/infra/ui-next/src/` (authorized Mission Control UI partition):

1. `app/command-center/page.tsx` (modified): removed phantom status polling (NightShift, Ollama jobs/status), removed phantom component imports (ConstitutionalLifecycle, NightShift, DecisionEngine, ConstitutionalMixer, ReasoningPuppetStrings, TimeMachine, OllamaControlRoom, MCPOrchestration), unmounted OrganizationalHealth (nonexistent route), mounted only real-route components plus NotLiveInventory.
2. `app/chat/page.tsx` (modified): `/api/v1/chat` to `/api/v1/ollama/chat`, gateway URL from environment.
3. `app/page.tsx` (modified): removed "All systems nominal", fixed "Cockpit View" to "Chat" link label.
4. `components/CockpitDashboard.tsx` (rewritten): real `/system/state` contract, multi-source event counts with discrepancy display, no hardcoded health.
5. `components/KnowledgeGalaxy.tsx` (patched): `/api/v1/knowledge-graph` to `/mc/knowledge?limit=100` with node mapping.
6. `components/LivingRepository.tsx` (patched): `/api/v1/repository/living` to `/system/state` repository.
7. `components/MissionCards.tsx` (rewritten): read-only, real `/mc/missions/pending` + `/mc/missions/active`.
8. `components/SemanticMemory.tsx` (rewritten): `/system/state` knowledge + qdrant.
9. `components/NotLiveInventory.tsx` (new): visible inventory of 12 preserved-but-not-live surfaces with classification and reason.
10. `lib/gateway.ts` (patched): chat helpers to `/api/v1/ollama/chat`.

## Discrepancy Handling

The backend currently reports conflicting event counts across scopes (observed 2026-09-18):
- `/system/state` postgres.total_events = 0, replay.status = "unavailable"
- `/mc/replay/stats` total_replays = 26, verified = 26
- `/mc/witness/stats` attestations = 26
- `/mc/dashboard` eventSummary.total = 45, missions.completed = 191

The CockpitDashboard displays all four values side by side, each labeled with its source route and scope, with an explicit banner stating the endpoints consult different runtime bindings and scopes so their counts disagree, and that the disagreement is shown rather than resolved. It does not select one value as canonical. A backend follow-up is open to reconcile these scopes (see below).

## Tests

- **Transfer verification**: all 5 rewritten/new files transferred via chunked base64 with SHA-256 verification on both sides. All checksums matched.
- **Patch verification**: surgical patch script applied 7 replacements across 5 files; all old-text matches were unique and verified before replacement.
- **Em-dash check**: no em dashes in any changed file.
- **Route verification**: every mounted component's backend route verified against the Lane M audit (2026-09-18) and direct route inspection (2026-09-19).
- **TypeScript/Next build**: NOT RUN. `ui-next` has no `node_modules` in the worktree. This is a gap; a build should be run when dependencies are available.
- **Gateway tests**: not applicable (no backend code changed).

## Backend Follow-ups (not in this lane's scope)

1. **Event count scope reconciliation**: `/system/state`, `/mc/dashboard`, `/mc/replay/stats`, and `/mc/witness/stats` report different event counts from different scopes. The UI surfaces the discrepancy; the backend should document or reconcile the scopes.
2. **KnowledgeGalaxy edges**: `/mc/knowledge` returns nodes but no edge feed. The galaxy renders nodes only. If edge relationships should be visualized, a real edge route is needed.
3. **Unwired surfaces**: TimeMachine, ConstitutionalObjects, and OrganizationalHealth are preserved but have no backend routes. If these visualizations are wanted, real routes must be built.
4. **Phantom Ollama routes**: `OllamaControlRoom` expects `/api/v1/ollama/jobs` and `/api/v1/ollama/status`, which do not exist. The real Ollama routes are chat, models, and autocomplete.

## Forbidden Files (untouched)

The following were modified or created by other lanes and were NOT touched, staged, or modified in this lane:
- `gateway/canonical_event_envelope.js` (modified by another lane)
- `ping-runtime/events/legacy_ingress_adapter.js` (modified by another lane)
- `ping-runtime/events/convergence_derivation.js` (untracked, another lane)
- `ping-runtime/events/convergence_identity.js` (untracked, another lane)
- `database/migrations/` (untracked, another lane)
- `tests/event-authority-convergence/` (untracked, another lane)

## Commit

Single bounded Phase 24 unit. Only the 10 explicit Phase 24 files staged. No forbidden files staged.
