# Capability/Authority Vocabulary Audit — PING Systems

**Date:** 2026-09-13 · **Mode:** read-only audit · **Auditor:** subagent (depth 2)
**Scope:** `C:\Users\nolan\PING` (canonical repo, commit 6e359a26 [main]), the active worktree `C:\Users\nolan\.local\share\opencode\worktree\a0b0bfa71232ff53146749a3cad1f1b9013dc3e9\curious-squid` (branch constitutional-convergence-v2, bce92787), and local workers under `~/workspace`.

**Headline finding:** There is no single live capability vocabulary. Four competing "capability" languages exist in the code, and the only one designed for exterior agents (the gateway `CapabilityAuthority` model) is committed but **not wired into the gateway server** — it is dead code today. The only live exterior contract is `POST /events` on the ping-gateway container.

---

## 1. Capability model hunt: what exists, with citations

### 1A. Gateway CapabilityAuthority model (worktree only — NOT in canonical, NOT wired)

Location: worktree `gateway/capability_authority.js` (full text read, 890 lines). Committed 2026-09-12 in `43a6cd2e` on curious-squid. **Absent from canonical** `C:\Users\nolan\PING\gateway` (verified by directory listing; no `capability_authority.js`, `exterior_auth_middleware.js`, `workspace_registry.js`, or `routes/capabilities.js` there).

**Vocabulary — capability names (dotted, namespaced):**
- `fs.list`, `fs.read`, `fs.write`, `fs.patch` — `capability_authority.js:565-608` (route handlers), profile lists at `:186-218`
- `git.status`, `git.diff`, `git.log`, `git.branch`, `git.checkout`, `git.commit` — `:611-680`; `git.push` explicitly throws ("not yet implemented with promotion authorization", `:687`)
- `repo.inspect` — `:700-711`
- `process.list`, `service.inspect` — `:719-734`
- `knowledge.search`, `event.search` — `:739-750`
- `command.run`, `test.run`, `build.run` — router exists `:753-758` but **throws fail-closed** ("not yet implemented with policy scoping"); also listed in `_isWriteCapability` at `:125-132`

**Vocabulary — per-capability descriptor (from `routes/capabilities.js` GET /discover, 20 entries):** `name`, `level` (0/1/2/4), `description`, `parameters`, `returns`, `status` ∈ {VERIFIED, IMPLEMENTED, NOT_IMPLEMENTED, DISABLED}, `riskLevel` ∈ {LOW, MEDIUM, HIGH}, `requiredPermission` ∈ {OBSERVE, WORKSPACE_WRITE, EXECUTE, PROMOTION}, `workspaceScope`, `repositoryScope`, `executionPermitted`, `externalSideEffects`, `destructiveBehavior`, `verificationStatus` ∈ {REMOTE_TESTED, NOT_REMOTE_TESTED, NOT_IMPLEMENTED}, plus `scope`.

**Vocabulary — agent profiles** (`capability_authority.js:186-218`, `_loadAgentProfiles`):
```js
'muse': {
  level: 1,
  workspace: `${this._workspaceRoot}/muse`,
  allowedCapabilities: [
    'fs.list', 'fs.read', 'fs.write', 'fs.patch',
    'repo.inspect',
    'git.status', 'git.diff', 'git.log',
    'process.list', 'service.inspect',
    'knowledge.search', 'event.search'
  ],
  deniedPaths: ['secrets/*', 'credentials/*', '.env', '*.pem', '*.key'],
  maxFileSize: 10485760,      // 10MB
  maxCommandTimeout: 30000,   // 30s
  maxConcurrentOps: 5
},
'muse-level-2': {
  level: 2,
  workspace: `${this._workspaceRoot}/muse`,
  allowedCapabilities: [
    'fs.list', 'fs.read', 'fs.write', 'fs.patch',
    'repo.inspect',
    'git.status', 'git.diff', 'git.log', 'git.branch', 'git.checkout', 'git.commit',
    'process.list', 'service.inspect',
    'knowledge.search', 'event.search'
  ],
  deniedPaths: ['secrets/*', 'credentials/*', '.env', '*.pem', '*.key'],
  maxFileSize: 104857600,     // 100MB
  maxCommandTimeout: 120000,  // 2min
  maxConcurrentOps: 10
}
```
Note: L1 is named "Observe" but grants `fs.write`/`fs.patch` — the L1/L2 seam already identified (`exterior_auth_middleware.js` names: `'Muse Level 1 (Observe)'`, `'Muse Level 2 (Workspace Write)'`, seeded at lines 78-90).

**Vocabulary — verbs/lifecycle:** `authorize(request)` → `execute(request, services)` → `_routeCapability` (prefix-routed: `fs.`→filesystem, `git.`→git, `repo.`→repository, `process.|service.`→runtime, `knowledge.|event.`→knowledge, `command.|test.|build.`→execution). Audit trail: Postgres table `capability_requests` (`:138-176`), in-memory fallback. Workspace scoping via `workspace_registry.js` (`agent_workspaces` table: `agent_id, workspace_path, repository_id, repository_path, canonical_repository`; default `repository_id: 'muse-workspace'`, lines 127-138).

**Dead-code proof:** case-insensitive `Select-String '(?i)capabil'` against worktree `gateway/server.js` returns zero hits; no `require('...routes/capabilities')` or `createCapabilityRoutes` reference exists anywhere in the worktree outside `gateway/routes/capabilities.js` itself. The `/capabilities` surface is implemented but **unmounted**.

### 1B. constitutional-compiler runtime capability-registry (canonical repo — orphaned)

- `C:\Users\nolan\PING\constitutional-compiler\runtime\registry\capability-registry.json` (~40 entries) + `capability-registry.ts` (loader class; header claims "Single source of truth for all capability definitions").
- **Vocabulary:** CamelCase capability id → `{authority, transport, mcpTool, replaySchema{eventType, fields[]}, witnessSchema{fields[]}}`. Authorities referenced: `FilesystemAuthority`, `GitAuthority`, `BrowserAuthority`, `DeploymentAuthority`. Sample entries: `MissionPlanning`, `CodeGeneration`, `FileOperations`, `GitOperations`, `Navigate`, `Click`, `Type`, `Snapshot`, `Deployment`, `CommandExecution`, `ShellExecution`.
- **Contradiction:** a repo-wide `Select-String 'capability-registry'` (excluding node_modules) returns **zero consumers**. Nothing imports or requires it. The `registry/` directory does not exist in the curious-squid worktree. It is an unreferenced artifact despite its "single source of truth" header.

### 1C. ORCA capability registry — docs only, no live code

- `C:\Users\nolan\PING\ORCA_RESEARCH_AND_INTEGRATION_READINESS.md:25`: "Orca's capability registry holds exactly one registered worker (`opencode:local`)"; `:113`: "ORCA's registry is superseded by PING's connector registry"; `:183`: "WorkerPortRegistry + `capability_registry.json` (opencode:local)".
- Verified: the string `opencode:local` appears **nowhere** in the repo (all extensions searched). No `worker_port.js` exists anywhere in the repo. No ORCA registry file exists. The "PING's connector registry" that supposedly supersedes it has no implementation either (see 1E).

### 1D. OmniRouter design vocabulary (doc only)

- `C:\Users\nolan\PING\constitutional-compiler\runtime\OMNIROUTER.md`: routing pipeline `Request → normalization → authority check → capability routing → provider routing → connector routing → Response`. Components: `OmniRouter`, `AuthorityEngine`, `CapabilityRouter`, `ProviderRouter`, `ConnectorRegistry`. No live implementation of `CapabilityRouter`/`ProviderRouter`/`ConnectorRegistry` was found.

### 1E. Connector model (canonical — partially live vocabulary, no registry)

- `C:\Users\nolan\PING\gateway\connector_authority.js`: `ConnectorAuthority._normalize(provider, raw)` → `ObservationAuthority` envelope; `publishContract()` at lines ~84-90: `{authority_id: 'connector-authority', consumes: ['provider acquisition'], produces: ['ObservationEnvelope','KnowledgeObject','observation event','runtime trace'], guarantees: ['provider_normalization','no_direct_persistence']}`.
- `C:\Users\nolan\PING\CONNECTOR_MATRIX.md`: every connector implements 8 methods — `authenticate()`, `discover()`, `health()`, `sync(service)`, `events(service)`, `objects(service)`, `query(q)`, `permissions()`. Inventory: `ping-runtime/connectors/connector_registry.js` (167 LOC) was listed 2026-07-27 but **no longer exists**; `connectors/` dir today holds only `github/` and `google-user-profile/`.

### 1F. ToolAuthority / ToolGateway (worktree — a third "capability" word: "tool")

- Worktree `gateway/tool_authority.js`: "Refactor 6 — Tool Authority for Inference. Pipeline: Mission → Tool Authority → Tool Manifest → Inference." Vocabulary: `tool_id → tool descriptor`, `toolCategories`. `registerTool(toolDescriptor)`. No tools are registered in the code.

### 1G. WorkerRegistry (worktree gateway)

- Worktree `gateway/worker_registry.js`: `registerWorker(workerId, workerMetadata)` with `worker_type`, `worker_metadata`; lifecycle events `WorkerRegistered`, `WorkerStarted`, `WorkerCompleted`. A "worker" registration vocabulary exists, but no workers are registered in the repo.

### 1H. The actually-live exterior surface: the event pipeline

- `POST /events` on the ping-gateway container (port 8080) with Bearer L1/L2 auth; emission stamps `source: api:<agentId>`. Event families flow `OBSERVATION_CREATED → … → CLAIM_CREATED → … → WITNESS_CREATED`. `GET /events/:id/descendants|ancestors`, `/events/correlation/:id` (verified live previously). `/ops`, `/governance`, `/constitution` are public GET. This is the de facto exterior contract today.

### 1I. Stale catalog claim

- `C:\Users\nolan\PING\CONSTITUTIONAL_CONVERGENCE_PATCH_CATALOG.md` D2 names the canonical capability-registry owner as `constitution/registry/capability_registry.py` (`get_registry()`) — **that path does not exist** in the repo. Aspirational/stale.

---

## 2. Exterior contract: what an exterior agent can already request

### 2A. The designed (but unmounted) contract: `routes/capabilities.js`

Endpoints (all under `/capabilities`, Express router in worktree `gateway/routes/capabilities.js`):
1. `POST /capabilities` — execute a capability. Request body: `{capability: "fs.read", parameters: {repoId, filePath, ...}, scope: {repoId}}`. Headers: `Authorization: Bearer <key>`; optional `X-Session-Id`. The `authorization` block is built server-side from the authenticated identity (agentId from credential, NOT from body). Response: `{status: 'ok'|'denied', result, authorization: {granted, policy, agentId, workspace, scope}, requestId}`; denied → HTTP 403; errors → 500 with `{status:'error', error, code:'INTERNAL_ERROR'}` (no stack traces).
2. `GET /capabilities/discover` — returns `{agentId, profile, workspace, capabilities: [...20 descriptors...], totalCapabilities, deniedPaths, limits}` filtered to the agent's profile.
3. `GET /capabilities/stats` — aggregate counts from `capability_requests` (no auth middleware on this route).
4. `GET /capabilities/health` — `{status:'ok', authority:'CapabilityAuthority', initialized, agentProfiles}` (no auth middleware).

Auth (`exterior_auth_middleware.js`): `Authorization: Bearer <api_key>` → lookup in `exterior_agent_credentials` (Postgres; in-memory fallback seeded from `MUSE_LEVEL_1_KEY`/`MUSE_LEVEL_2_KEY` env or generated `pk_<64hex>`); resolves `{agentId: 'muse'|'muse-level-2', agentName}`. Missing → 401 MISSING_AUTH; invalid/expired → 401 INVALID_CREDENTIAL. Unknown agentIds are fail-closed at authorize time (`capability_authority.js:234-242`).

**Status: code-complete, never mounted — not requestable today.**

### 2B. The live contract today

An exterior agent (Muse over SSH/HTTP) can: `POST /events` (Bearer L1/L2, e.g. `OBSERVATION_CREATED` with `statement/source span/confidence` evidence), traverse `GET /events/:id/descendants|ancestors`, read `/ops`, `/governance`, `/constitution` (public GET), and `POST /missions` (authenticated). It **cannot** call `POST /capabilities` — the route is not registered in `server.js`.

---

## 3. Mapping real workers onto the existing vocabulary

| Worker (local path) | Function (plain) | Closest existing term | Fit? |
|---|---|---|---|
| `~/workspace/pig-fb/engage.js` | Facebook likes/comments via CDP on the Pig's headed Chrome | compiler-registry `Click`/`Type` (BrowserAuthority) | **GAP** — that registry is orphaned, browser-typed for MCP, and engage.js drives a real logged-in browser session, not an MCP tool |
| `~/workspace/pig-fb/meta-ask.js` | Asks Meta AI a research question in the Pig's Chrome, saves answer | — | **GAP** — no "research/ask" term anywhere |
| `~/workspace/pig-fb/check_cdp.js` | Probes CDP :9223, reports Facebook login state | — | **GAP** — closest is `service.inspect`/`health()`, but those are gateway-internal, not CDP-session probes |
| `~/workspace/pig-fb/run_pass.sh` | Copies job to Pig, runs engage.js over SSH, returns result JSON | — | **GAP** — orchestration script, no term |
| `~/workspace/pig-fb/meta-pass.sh` | Builds context pack, runs Meta AI research brief, captures answer + provenance sidecar | — | **GAP** — no term |
| `~/workspace/pig-fb/ensure-cdp.sh` | Ensures CDP up; fires PigiFBLogin recovery task on demand | — | **GAP** — recovery/watchdog, no term |
| `~/workspace/tandem/build-context-pack.py` | Builds versioned research context pack from source artifacts | `knowledge.search`-adjacent | **GAP** — composes context from local files for delegation; nothing in any registry describes it |
| `~/workspace/tandem/emit-observation.py` | POSTs `OBSERVATION_CREATED` to `http://127.0.0.1:8080/events` on the Pig via SSH with runtime-resolved Bearer token | **Live: the gateway event-ingest contract** (`POST /events`, `OBSERVATION_CREATED`) | **MAPS — to the live event pipeline, not to the CapabilityAuthority model** (which has no `event.emit` capability) |
| `~/workspace/bin/pig` / `pigread.py` | SSH transport to the Pig (the actual exterior-agent channel) | — | **GAP** — the transport every worker rides on has no vocabulary entry; `command.run` is the nearest CapabilityAuthority term but it is NOT_IMPLEMENTED and workspace-scoped |
| Skills (`/opt/hatch/skills/*`: gmail, instagram, facebook-cli, messenger_read, etc.) | Product API interfaces (read/send/search/publish) | `ToolAuthority` `tool_id` registrations (Mission→Tool Authority→Tool Manifest→Inference); connector 8-method interface | **GAP** — no skill is registered as a tool, and Gmail/Instagram/Facebook adapters exist only as unwrapped adapters in CONNECTOR_MATRIX.md Tier 2 ("need wrapping") |

Only one real worker has a home in existing vocabulary: `emit-observation.py` → the live `POST /events` / `OBSERVATION_CREATED` contract.

---

## 4. Gaps and overlaps

**Capabilities in the model with no worker:** essentially the entire CapabilityAuthority catalog — no real worker invokes `fs.*`, `git.*`, `repo.inspect`, `process.list`, `service.inspect`, `knowledge.search`, or `event.search` through the gateway. `command.run`, `test.run`, `build.run`, `logs.read` are NOT_IMPLEMENTED; `git.push` is DISABLED.

**Workers with no place in the model:** engage.js, meta-ask.js, check_cdp.js, run_pass.sh, meta-pass.sh, ensure-cdp.sh, build-context-pack.py, bin/pig (+pigread.py), and all product skills.

**Same concept defined differently (the real problem):**
1. **"Capability" × 4:** CapabilityAuthority dotted verbs (`fs.write`); compiler-registry CamelCase (`FileOperations → FilesystemAuthority/mcp/write`); ToolAuthority "tools" (`tool_id`); connector 8-method interface (`sync/events/objects/query`). No mapping table exists between any two.
2. **"Worker" × 3:** ORCA's dead `opencode:local` registry; gateway `WorkerRegistry` (`worker_id`/`worker_type`, zero registrations); compiler-registry `authority` field. Three registries, none live for real workers.
3. **"Registry" × 3, all broken:** compiler-registry (orphaned, zero consumers), ORCA registry (superseded, no code), "PING's connector registry" (cited as the superseding owner, no implementation file).
4. **Self-contradictions:** compiler-registry.ts header claims "Single source of truth" with zero references; ORCA readiness doc declares ORCA's registry superseded by a connector registry that doesn't exist; L1 profile named "Observe" grants `fs.write`/`fs.patch`; `GET /discover` advertises 20 capabilities while profiles grant ≤12 and several listed are NOT_IMPLEMENTED.

---

## 5. Verdict

**No.** There is no single coherent existing vocabulary that could serve as the common capability language with only additive registrations. The two models that conflict:

- **(A) The worktree CapabilityAuthority model** — the only one with an exterior contract, authentication, policy levels, and audit. But it is (i) unwired/dead code, (ii) scoped to workspace-repo file/git operations, and (iii) its vocabulary (`fs.write`, `git.commit`) cannot describe the real workers' actions (liking a Facebook post, asking Meta AI a question, probing CDP) without severe semantic stretch.
- **(B) The canonical compiler-registry model** — broader action vocabulary (Navigate, Click, Type, CommandExecution) that is *closer* to what real workers do, but it is an orphaned JSON file with zero consumers, no auth, no policy, no audit, and no route.

**Minimal reconciliation proposal (no redesign, additive only):**
1. Pick (A) as the common language — it is the only model with auth/policy/audit and an exterior-agent contract shape.
2. Wire `routes/capabilities.js` into the worktree `gateway/server.js` (one `app.use('/capabilities', ...)` + service injection) so the surface is live.
3. Register the real workers additively as new capability names under two new namespaces that match what they actually do: `browser.engage` (engage.js: like/comment via CDP), `browser.session_check` (check_cdp.js), `research.ask` (meta-ask.js), `research.context_pack` (build-context-pack.py), `event.emit` (emit-observation.py → POST /events), `transport.ssh_exec` (bin/pig), `skill.invoke` (skills, mirroring ToolAuthority's `tool_id` descriptors).
4. Delete or formally deprecate the orphaned `constitutional-compiler/runtime/registry/capability-registry.json` (or demote its header claim) so "capability registry" means exactly one thing; record the CamelCase→dotted mapping for the overlapping entries (FileOperations→fs.*, GitOperations→git.*, Navigate/Click/Type→browser.*) in one mapping doc rather than a second registry.
5. Fix the L1 seam (drop `fs.write`/`fs.patch` from the `muse` profile) before any exterior agent is granted L1.

Until steps 1–2 happen, the honest statement is: **the live common language is the event pipeline** (`POST /events`, `OBSERVATION_CREATED`); capability-style execution has no live surface, and every real action worker currently runs outside all four models over SSH.

---

### Key file references (read-only, verified 2026-09-13)
- Worktree root: `C:\Users\nolan\.local\share\opencode\worktree\a0b0bfa71232ff53146749a3cad1f1b9013dc3e9\curious-squid`
- `…\curious-squid\gateway\capability_authority.js` — profiles :186-218; write-capability list :125-132; authorize :228-420; routers :424-758
- `…\curious-squid\gateway\exterior_auth_middleware.js` — credential seeding :78-90; middleware :228-252
- `…\curious-squid\gateway\routes\capabilities.js` — endpoints: POST `/` , GET `/discover`, GET `/stats`, GET `/health`
- `…\curious-squid\gateway\workspace_registry.js` — `agent_workspaces` schema :35-38; defaults :127-138
- `…\curious-squid\gateway\tool_authority.js`, `tool_gateway.js`, `worker_registry.js` — competing tool/worker vocabularies
- `C:\Users\nolan\PING\constitutional-compiler\runtime\registry\capability-registry.json` / `.ts` — orphaned registry
- `C:\Users\nolan\PING\constitutional-compiler\runtime\OMNIROUTER.md` — design-only routing vocabulary
- `C:\Users\nolan\PING\gateway\connector_authority.js` — connector contract (~:84-90)
- `C:\Users\nolan\PING\ORCA_RESEARCH_AND_INTEGRATION_READINESS.md:25,113,183` — ORCA registry claims
- `C:\Users\nolan\PING\CONNECTOR_MATRIX.md`, `CONSTITUTIONAL_CONVERGENCE_PATCH_CATALOG.md` (D2) — stale registry references
