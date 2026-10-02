# EXECUTION-CORE: Forensic Report (Canonical-Core Side)

Date: 2026-09-24 UTC. Base: `/home/nolan/ping` (live PING runtime home).
Role: read-only forensic investigator, EXECUTION-CORE (canonical-core side).
Sibling investigator owns the TypeScript EXECUTION-ADAPTER side; only the seam is documented here.

**COMMITS CREATED: NONE.** No repo writes. No staging. No restarts. No process touches. No container mutation. No DB mutation.

## 0. The headline finding: the live gateway image runs a CapabilityAuthority that no longer exists in the source tree

The running production gateway container (`ping-gateway`, image `ping-gateway:devin-boundary2`, built ~7 days ago, up 33h) executes a
`gateway_runtime.js` that differs materially from the current source tree at `/home/nolan/ping/gateway/bootstrap/gateway_runtime.js`.
A read-only `docker cp` from the live container proves the image bundles:

- `gateway/capability_authority.js` (889 lines) — a real, implementing **CapabilityAuthority**, wired in the image's composition root:
  image `gateway_runtime.js` lines 106-107 (`require('../capability_authority')`, `require('../routes/capabilities')`),
  lines 136-144 (service locals), lines 401-458 (instantiation: `capabilityAuthority = new CapabilityAuthority(this._pool, runtimeRegistry, '/app/workspace')`,
  `await capabilityAuthority.initialize()`, wiring of FilesystemAuthority/CommitAuthority/PatchAuthority/RepositoryAuthority/SimpleGitAdapter as
  prerequisite routing authorities), lines 745-749 (services return), lines 910-928 (mount of `/capabilities` routes with
  `createCapabilityRoutes(services.capabilityAuthority, services, services.exteriorAuthMiddleware)`).
- `gateway/exterior_auth_middleware.js` — wraps `/events`, `/canonical-events`, `/ingest`, `/orchestration`, `/missions`, `/ai`, `/connectors` in the
  image (image `gateway_runtime.js` lines 790, 794, 798, 900, 916-920).
- `gateway/workspace_registry.js` and `gateway/routes/capabilities.js`.

None of these four files exist in the current source tree (verified: `ls` returns "No such file or directory"; `git log -- gateway/capability_authority.js`
is empty, so the file was never tracked at this path in current history). The source tree's `gateway_runtime.js` mounts `/events`, `/ingest`,
`/orchestration`, `/missions`, `/ai`, `/connectors` WITHOUT any exterior-auth middleware and has NO `/capabilities` mount.

The release-candidate gateway (`ping-rc-gateway`, image `ping-gateway:rc-4d522a6b`, 3 days old) does NOT contain `capability_authority.js`
(`docker exec ... ls` fails), so the rc line matches the current source tree. The live prod image predates the removal.

Consequence for this report: **the executor CapabilityAuthority is LIVE in production** (devin-boundary2 image), **ABSENT from the source tree and rc line**.
Every claim below is tagged for which runtime it holds in: [PROD-IMAGE], [SOURCE], or [BOTH].

## 1. Actual core execution authority; is the executor CapabilityAuthority live?

**Yes, in the live production image. No, in the current source tree.**

### 1a. Live CapabilityAuthority (prod image only)

File (recovered read-only from the running container; line numbers refer to the image's copy): `gateway/capability_authority.js`.

- Contract: "Exterior-Agent Capability Boundary. Enforces policy-based capability authorization for exterior agents. Routes capability requests to
  existing authorities without duplicating logic. This authority ONLY authorizes and routes; it does NOT implement capabilities."
  (image `capability_authority.js:1-14`).
- `authorize(request)` (image `capability_authority.js:230-~300`): fail-closed. Unknown agentId is DENIED (no default-allow).
  Agent profiles are hardcoded in `_loadAgentProfiles` (image `capability_authority.js:185-215`): `muse` (level 1) and `muse-level-2`, each with an
  `allowedCapabilities` allow-list (`fs.list/read/write/patch`, `repo.inspect`, `git.status/diff/log` [+branch/checkout/commit at level 2],
  `process.list`, `service.inspect`, `knowledge.search`, `event.search`), `deniedPaths` (`secrets/*`, `credentials/*`, `.env`, `*.pem`, `*.key`),
  `maxFileSize`, `maxCommandTimeout`, `maxConcurrentOps`.
- Workspace binding: when the request scope names a repoId/workspace, `authorize` looks up the agent's workspace in the workspace registry and REJECTS
  user-supplied values that differ (image `capability_authority.js:256-288`): "EXPLICIT RESOURCE AUTHORIZATION: Do not allow user-provided repoId."
- Canonical repo protection: `if (workspace.canonical_repository)` returns denied with reason "Canonical repository is not writable through
  exterior-agent boundary" (image `capability_authority.js:289-300`).
- Filesystem sandboxing: `_canonicalizePath` uses `path.resolve` + `fs.realpath` (symlink resolution) and `_isPathContained` enforces containment of
  every target path inside the agent's authorized workspace root (image `capability_authority.js:58-136`). `_routeFilesystem` throws
  "File path outside authorized workspace" on violation (image `capability_authority.js:549,580,586`).
- Execution: `execute(request, services)` (image `capability_authority.js:438-488`) authorizes FIRST, then routes by capability prefix:
  `fs.*` -> FilesystemAuthority/PatchAuthority, `git.*` -> git adapter, `repo.*` -> RepositoryAuthority, `process.*`/`service.*` -> runtime routing,
  `knowledge.*`/`event.*` -> knowledge routing, `command.*`/`test.*`/`build.*` -> `_routeExecution`.
- **Arbitrary command execution is fail-closed in the live authority**: `_routeExecution` throws
  "`<capability>` not yet implemented with policy scoping" (image `capability_authority.js:776-779`).
- Receipts: every authorize+execute, granted or denied, is written to the Postgres `capability_requests` table
  (`request_id, agent_id, session_id, capability, parameters, authz, granted, result, audit_status`), with in-memory fallback when Postgres is
  unavailable (image `capability_authority.js:784-817`). Request IDs are content-hash derived via CanonicalAuthority
  (image `capability_authority.js:820-828`).
- A deliberate non-duplication constraint is stated in the header: routing only, no second implementation of any capability (image `capability_authority.js:10-14`).

### 1b. Source tree: CapabilityAuthority is gone; runtime authority is trust-by-wiring

In the current source tree there is no implementing `CapabilityAuthority`. What exists is `ping-runtime/runtime/capability_resolver.js`
(a metadata/introspection resolver: checks that a capability declares `provider`, `required_secrets`, `runtime_dependencies`; source lines 10-127).
It is exposed to constitution/ops introspection (`gateway_runtime.js:180-181` source, `_constitutionRoutes` around source lines 714-717, 769-772) but is NOT
inserted into worker dispatch or mission execution. It authorizes nothing.

The source tree's de facto execution authority is **trust-by-construction**: fixed worker registration, event-type routing, mission conditional
state transitions (see section 2).

### 1c. Dormant executor family (source tree; also dormant in prod image as far as the composition root shows)

- `gateway/execution_authority.js` (29-158): dynamically requires an authority implementation module and executes it, emits started/completed/failed
  events, creates a witness. NOT registered in source `gateway/bootstrap/wiring.js` and NOT referenced by source `gateway_runtime.js`. Performs NO
  actor/capability/approval check before `require(implementationModule)` + `authority.execute(...)` (source lines 67-78). **DORMANT, and unsafe if revived.**
- `gateway/sequence_authority.js` (35-82): sequential step execution; stops at first failed step; no rollback/compensation. DORMANT.
- `gateway/parallel_execution_authority.js`, `gateway/event_routing_authority.js`: same dormant family, referenced only by the cluster itself.
- `gateway/mission_execution_authority.js` (84-188): proposal admission -> patch validation -> test -> replay -> approval -> commit; but
  `_runTests`, `_runReplay`, `_commit` are placeholders (source lines 305-370); the "commit" only hashes and reports success. DORMANT/ASPIRATIONAL.
- `gateway/business_action_authority.js`, `gateway/effect_authority.js`: only implementation files + tests reference them. DORMANT.
- `gateway/local_first_execution_authority.js` (898 lines): Phase 36K offline control-plane/execution-plane design. The repo's own dormant-classification
  system labels it dormant: `ping-runtime/orchestration/dormant_classifications/gateway_local_first_execution_authority.json`. DORMANT.
- `gateway/approval_authority.js`: approval state machine (source lines 86-336). **Auto-approve by default**: `_determineApprovalPolicy` returns
  `policy_automatic` with comment "Default to automatic policy for now" (source lines 135-150); `_evaluateApprovalConditions` sets
  `tests_passed: testResults.passed || true` (source lines 160-182, always true); `_determineApprovalStatus` returns `approved` for automatic policy.
  Nothing live calls it, but it is BROKEN if revived: automatic approval with un-falsifiable test condition.
- Temporal `ping-runtime/temporal/activities/mission_activities.js` (16-57): external-agent authorization is commented-out TODO; the active activity
  returns a stub success. DORMANT/STUB.
- `ConstitutionalExecutionPipeline`, `ReducerExecutor`, `ProjectionExecutor`: legacy pipeline; live `/events` explicitly bypasses it. DORMANT/LEGACY.
- Python worker layer (`kernel/event_dispatcher.py`, `workers/worker_runtime.py`): HTTP-polling worker loop against the gateway. **No worker container is
  running** (`docker ps`: only `ping-gateway`, `ping-rc-gateway`, infra). DORMANT.

## 2. Approved proposal -> execution -> state change (with runtime authorization/sandboxing)

There are two distinct live execution planes. The approved-proposal plane exists only in the prod image; the event/mission plane is live in both.

### 2a. Event -> mission -> worker plane (LIVE in both image lines)

1. Ingress. Website adapter submits a signed BFF envelope to `POST /events`. `gateway/routes/events.js` (source lines 67-135) selects the social or
   knowledge ingest adapter.
2. Social ingest authorization (source `gateway/social_ingest_adapter.js:80-139`): rejects private-key-looking material, verifies Ed25519 proof,
   validates vocabulary and payload shape; `OBJECT_UPDATED` binds the signing public key to a journal identity (source lines 140-159); normalizes the
   event and preserves the client proof (source lines 267-331).
   **Boundary gap**: the generic `POST /events` branch accepts `{event_type, aggregate_id, aggregate_type, event_data}` and routes it directly to
   `UnifiedEventRuntime.emit` with no signature or capability gate observed in the route (source `gateway/routes/events.js:116-135`). LIVE direct-mutation
   ingress.
3. `UnifiedEventRuntime.emit` (source `ping-runtime/events/unified_event_runtime.js:67-207`): derives a deterministic event ID, validates the event type,
   checks event governance, persists FIRST to `ping_events`, then dispatches handlers and routes integrations, and returns `{status:'ok', eventId, event}`
   as the receipt. Semantic event-ID collisions fail closed; only verified idempotent duplicates return ok.
4. `EventToMissionBridge` creates deterministic missions (source `ping-runtime/orchestration/mission_runtime.js:58-104`).
5. `MissionScheduler` claims/starts missions with lease renewal and reaping, dispatches the original business event to the registered worker for its
   event type (source `ping-runtime/orchestration/mission_scheduler.js:150-276`; `worker_runtime.js:61-111` checks registration then event-type match).
   Authorization here is by construction: fixed `MISSION_WORKER_MAP`, registration, event-type match, conditional mission transitions
   (source `mission_runtime.js:106-177`).
6. Workers emit downstream canonical events through the same runtime, preserving correlation/causation chains
   (source `ping-runtime/workers/canonical_workers.js:20-86`).
7. Scheduler completes, retries (backoff; source `mission_runtime.js:179-240`), fails, or dead-letters.

**No general sandbox** was found in this plane. Connectors that could act externally are stubs: `EmailIntegration.send` only queues in memory
(`ping-runtime/connectors/email_integration.js:1-2` header "Stub ... not functional until SMTP provider configured"; `send` at line 14 pushes to
`_sentEmails` and returns `status:'queued'`). No SMTP send path exists.

### 2b. Capability plane (LIVE in prod image only)

`/capabilities` route -> `ExteriorAuthMiddleware` (authentication must precede `authorize`; image `capability_authority.js:220-228` comment:
"The agentId must come from authenticated identity, not from request body") -> `CapabilityAuthority.authorize` (fail-closed policy check,
workspace binding, canonical-repo protection) -> `_routeCapability` to the pre-existing authority (filesystem/git/repo/process/knowledge) with
path containment enforced -> receipt in `capability_requests`. Command/test/build execution is fail-closed (throws). Sandboxing = path containment +
capability allow-list + denied paths + timeout/size/concurrency caps per agent profile.

## 3. Receipts, attestations, verifiability

- **Event receipts (both lines)**: `UnifiedEventRuntime.emit` returns only after durable insertion or a verified idempotent duplicate; semantic
  collisions fail closed (source `unified_event_runtime.js:122-207`). Persisted `ping_events` records carry event ID, type, source, timestamp, payload,
  namespace, causal/correlation metadata. Anyone with journal access can re-read and re-derive. The website attestation gate consumes this on the
  adapter side (EXECUTION-ADAPTER domain).
- **Capability receipts (prod image only)**: `capability_requests` rows with request_id, authz JSON, granted flag, result, audit_status
  (image `capability_authority.js:784-817`).
- **Witness attestations (both lines)**: `WitnessWorker` emits `WITNESS_CREATED` with `attestation: witness-<event_id prefix>` and causation linkage
  (source `canonical_workers.js:451-510`). Failure-honesty gate (W7): on `REPLAY_COMPLETED` with `replay.verified !== true`, the witness REFUSES to
  attest and emits `WITNESS_REJECTED` instead (source `canonical_workers.js:467-489`). `ReplayWorker` performs structural no-op (`verified:false`)
  when no provider is injected; the live composition root injects `KernelReplayExecutionProvider` (source `gateway_runtime.js:592` area /
  `replayProvider = new KernelReplayExecutionProvider()`), making replay verification actually execute.
- **Dead letters (source; wired)**: exhausted retries are recorded by `DeadLetterAuthority` into `repository_dead_letters` with witness + replayable flag
  (source `dead_letter_authority.js:38-~120`; wired at source `gateway_runtime.js:541-556`; consumed by `mission_scheduler.js:289-303`).
  Caveat: the prod image predates this wiring (image line numbers differ); verify against the image before claiming it in production.
- **Mission events**: mission transitions emit mission events, but transition and emission are separate operations, not one transaction
  (source `mission_runtime.js:89-102, 127-136, 149-177`). A DB transition can succeed while its event emission fails.

Who can independently verify: any reader of `ping_events` (event receipts), `capability_requests` (prod image; capability receipts),
`repository_dead_letters` (failure receipts), and the witness event chain via correlation/causation IDs.

## 4. State-changing mechanisms: classification

CLASSIFICATION values: LIVE (executes state changes in production), DORMANT (code exists, no live caller), DUPLICATE (second live owner of the same
capability), CONFLICTING (two live owners that disagree). No CONFLICTING pair was found executing simultaneously; the prod-image/source-tree DIVERGENCE
is the closest analogue and is flagged per-row in SCOPE.

| # | Component | Scope | Classification |
|---|-----------|-------|----------------|
| 1 | `UnifiedEventRuntime.emit` -> `ping_events` | both | LIVE (canonical journal mutation) |
| 2 | Social/knowledge ingest adapters (Ed25519) | both | LIVE adapters |
| 3 | Generic `POST /events` unsigned branch | both | LIVE direct-mutation ingress (broken boundary, see row 21) |
| 4 | `MissionRuntime` + `MissionScheduler` + `WorkerRuntime` + `EventToMissionBridge` | both | LIVE execution plane |
| 5 | Canonical workers (observation, claim, classification, recommendation, projection, replay, witness, lineage; optional knowledge-promotion) | both | LIVE |
| 6 | `IntelligenceWorker` | both | DORMANT (explicit `[DOC-CONTRACT / KEEP-DORMANT]`, `eventTypes:[]`, skipped at `canonical_workers.js:727-738`) |
| 7 | `KernelReplayExecutionProvider` injected into `ReplayWorker` | both | LIVE specialized executor |
| 8 | CapabilityAuthority + `/capabilities` + exterior-auth middleware + workspace registry | PROD-IMAGE ONLY | LIVE (absent from source/rc) |
| 9 | `CapabilityResolver` (metadata) | both | LIVE introspection only; not an execution gate |
| 10 | `ExecutionAuthority` (`gateway/execution_authority.js`) | source | DORMANT (unsafe if revived: no actor/capability/approval check before dynamic require+execute) |
| 11 | `SequenceAuthority` / `ParallelExecutionAuthority` / `EventRoutingAuthority` | source | DORMANT family |
| 12 | `MissionExecutionAuthority` | source | DORMANT/ASPIRATIONAL (placeholder tests/replay/commit) |
| 13 | `BusinessActionAuthority` / `EffectAuthority` | source | DORMANT |
| 14 | `LocalFirstExecutionAuthority` | source | DORMANT (repo's own `dormant_classifications/gateway_local_first_execution_authority.json`) |
| 15 | `ApprovalAuthority` | source | DORMANT; BROKEN-IF-REVIVED (auto-approve default, `tests_passed || true`) |
| 16 | Temporal mission activities | both | DORMANT/STUB (auth is TODO comments; active path returns stub success) |
| 17 | `ConstitutionalExecutionPipeline` + `ReducerExecutor`/`ProjectionExecutor` | both | DORMANT/LEGACY (live `/events` bypasses) |
| 18 | Python worker layer (`kernel/event_dispatcher.py`, `workers/worker_runtime.py`) | both | DORMANT (no container running) |
| 19 | `DeadLetterAuthority` -> `repository_dead_letters` | source | LIVE (wired into scheduler exhaustion); image-lineage caveat |
| 20 | Email/SMS connectors | both | LIVE-loaded, STUB (in-memory queue; no external effect) |
| 21 | `/mc` mission-control routes | both | LIVE, read-only (GET-only, `mission_control.js:62-664`) |
| 22 | `ExecutionEngine` + `/orchestration` routes | both | LIVE-loaded competing subsystem; state-change reachability not fully traced (see open question) |
| 23 | Generated `WorkflowExecutor` / `StateMachineExecutor` | both | LIVE-loaded; execution reachability unknown (see open question) |
| 24 | HPP business authority routes (reviews/customers/projects/connectors/identities/ingest) | both | LIVE-possible competing mutations (see open question) |

No DUPLICATE live owners of the same capability were found. The one live executor (CapabilityAuthority) explicitly routes to pre-existing authorities
rather than re-implementing them (image `capability_authority.js:10-14`).

## 5. Mid-execution failure, partial state, retry, compensation

- **Event persistence before dispatch**: `UnifiedEventRuntime.emit` persists the event, then dispatches handlers/integrations; handler or integration
  failures are logged and swallowed while `emit` still returns success (source `unified_event_runtime.js:173-207`). Semantics: durable event,
  best-effort side effects. A consumer reading only the return receipt cannot distinguish full from partial fan-out.
- **Mission transitions vs mission events**: not transactionally coupled (source `mission_runtime.js:89-177`). A mission can transition state while its
  mission event fails to emit.
- **Worker exceptions propagate** to `MissionScheduler` (source `worker_runtime.js:86-104`); the scheduler retries with backoff
  (source `mission_runtime.js:179-240`), renews leases and reaps stale ones (source `mission_scheduler.js:150-260`).
- **Exhaustion**: `_failMission` records a dead letter via `DeadLetterAuthority.recordDeadLetter` when `retries >= max_attempts`
  (source `mission_scheduler.js:289-303`); dead letters carry witness + replayable flag.
- **No compensation mechanism was found anywhere.** `SequenceAuthority` stops at first failed step with no rollback (source `sequence_authority.js:35-82`).
  `MissionExecutionAuthority` has no enclosing try/catch or transaction around its multi-step flow (source `mission_execution_authority.js:84-188`).
- **Retry-idempotency**: deterministic event IDs make duplicate emissions idempotent at the journal layer; capability request IDs are content-hash
  derived, so retried identical requests are recognizable in `capability_requests`.

## 6. Authorization/sandboxing summary

| Plane | Authorization | Sandboxing |
|-------|---------------|------------|
| Signed ingest (`/events` via adapters) | Ed25519 proof + vocabulary/schema + journal identity binding | Schema/vocabulary validation |
| Generic `/events` POST | NONE observed in route | None |
| Mission/worker dispatch | Trust-by-construction (registration, event-type match, conditional transitions) | None |
| Capability plane (prod image) | Fail-closed agent profiles, allow-list, workspace binding, canonical-repo denial | Path containment (realpath), denied paths, size/timeout/concurrency caps; command execution fail-closed |
| Connectors | N/A (stubs) | N/A |

## 7. Findings table (shared record format; consumed by convergence auditor)

DOMAIN is `EXECUTION-CORE` for all rows. SCOPE tags PROD-IMAGE vs SOURCE per row.

| DOMAIN | COMPONENT | CLAIM | EVIDENCE | CALLER | CALLEE | WRITER | READER | AUTHORITY | CLASSIFICATION | CONFIDENCE | BROKEN BOUNDARY | DEPENDENCIES | AFFECTS AGENTS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| EXECUTION-CORE | CapabilityAuthority (prod image) | Executor CapabilityAuthority is LIVE in production: authorize-first, route-to-existing-authority, receipted | image gateway/capability_authority.js:26-39 (ctor/init), :230-300 (authorize), :438-488 (execute), :784-817 (receipts); image gateway_runtime.js:401-458 (wiring), :910-928 (/capabilities mount) | image gateway_runtime.js | capability_authority.js, filesystem/commit/patch/repository authorities | CapabilityAuthority._logRequest | auditors reading capability_requests | CapabilityAuthority (exterior-agent boundary) | LIVE | HIGH | none found in its path | IDENTITY-CORE (agentId must come from authenticated identity), TIME-CORE (constitutionalTimeAuthority in request IDs), IDENTITY-CORE (CanonicalAuthority hash for IDs) | EXECUTION-ADAPTER (website adapter attests), GOVERNANCE-CORE |
| EXECUTION-CORE | CapabilityAuthority vs source tree | CapabilityAuthority, exterior-auth middleware, workspace registry, /capabilities routes exist ONLY in the prod image; absent from source tree and rc line | ls fails for all four paths in /home/nolan/ping; git log empty for gateway/capability_authority.js; docker exec ping-rc-gateway ls fails; docker diff of image gateway_runtime.js vs source shows the removal | n/a (drift) | n/a | n/a | n/a | n/a | DIVERGENCE (live-but-untracked vs source) | HIGH | source tree no longer describes production; any rebuild from source silently drops the execution authority and route authentication | BUILD/DEPLOY-CORE (image provenance), EXECUTION-ADAPTER | GOVERNANCE-CORE, Agent 20 |
| EXECUTION-CORE | ExteriorAuthMiddleware (prod image) | /events, /canonical-events, /ingest, /orchestration, /missions, /ai, /connectors are auth-wrapped in production | image gateway_runtime.js:790,794,798,900,916-920 vs source gateway_runtime.js (no middleware on those mounts) | image gateway_runtime.js | exterior_auth_middleware.js | n/a | n/a | ExteriorAuthMiddleware | LIVE | HIGH | source tree suggests these routes are unauthenticated; production is not | IDENTITY-CORE (authN source of agentId) | EXECUTION-ADAPTER |
| EXECUTION-CORE | capability authorize/execute | authorize is fail-closed (unknown agent denied; allow-list; workspace binding; canonical-repo write denial); command/test/build execution throws | image capability_authority.js:230-300; :776-779 | image capability routes | _routeCapability | _logRequest | capability_requests readers | CapabilityAuthority | LIVE | HIGH | none | n/a | GOVERNANCE-CORE |
| EXECUTION-CORE | capability sandboxing | filesystem capabilities are path-contained via realpath into the agent workspace; denied paths for secrets | image capability_authority.js:58-136, :526-615; agent profiles :185-215 | _routeFilesystem | FilesystemAuthority/PatchAuthority | n/a | n/a | CapabilityAuthority | LIVE | HIGH | none | n/a | n/a |
| EXECUTION-CORE | UnifiedEventRuntime.emit | Canonical journal mutation: deterministic IDs, governance check, persist-first, dispatch-after, receipted; collisions fail closed | ping-runtime/events/unified_event_runtime.js:67-207 | gateway/routes/events.js | ping_events | event handlers, integrations, readers | UnifiedEventRuntime | LIVE | HIGH | handler/integration failures swallowed after persistence (partial fan-out invisible in receipt) | GOVERNANCE-CORE (event governance), IDENTITY-CORE (deterministic ID), TIME-CORE (timestamps) | EXECUTION-ADAPTER, REPLAY-CORE, WITNESS-CORE |
| EXECUTION-CORE | social/knowledge ingest adapters | Ed25519 proof verification, private-key rejection, vocabulary/schema validation, OBJECT_UPDATED identity binding | gateway/social_ingest_adapter.js:80-139, :140-159, :267-331 | gateway/routes/events.js | UnifiedEventRuntime | ping_events | downstream workers | ingest adapter | LIVE | HIGH | none in signed path | IDENTITY-CORE (journal identity) | EXECUTION-ADAPTER |
| EXECUTION-CORE | generic POST /events | Unsigned direct-mutation ingress: {event_type, aggregate_id, aggregate_type, event_data} routes straight to emit with no observed signature/capability gate | gateway/routes/events.js:116-135 | HTTP client | UnifiedEventRuntime | ping_events | workers | none observed | LIVE | MEDIUM (route code read; full middleware chain in prod image not re-verified for this branch) | unsigned mutation ingress bypasses the ingest authorization boundary | EXECUTION-ADAPTER (BFF envelope is the intended gate) | SECURITY-CORE, GOVERNANCE-CORE |
| EXECUTION-CORE | MissionRuntime + MissionScheduler + WorkerRuntime | Live execution plane: deterministic mission creation, lease claim/start, worker dispatch, retry/backoff, exhaustion | ping-runtime/orchestration/mission_runtime.js:58-240; mission_scheduler.js:88-303; ping-runtime/workers/worker_runtime.js:28-111 | EventToMissionBridge, MissionScheduler | canonical workers | ping_missions, ping_events | /mc readers | MissionRuntime | LIVE | HIGH | authorization is trust-by-construction only (no capability check at dispatch) | TIME-CORE (leases), WITNESS-CORE (mission events) | EXECUTION-ADAPTER |
| EXECUTION-CORE | canonical workers | Live chain observation->claim->classification->recommendation->projection->replay->witness->lineage; downstream events preserve correlation/causation | ping-runtime/workers/canonical_workers.js:20-86 (BaseWorker._emit), :700-738 (registration); :451-510 (WitnessWorker) | WorkerRuntime | UnifiedEventRuntime | ping_events | lineage/projection readers | WorkerRuntime | LIVE | HIGH | none | IDENTITY-CORE (namespaces) | REPLAY-CORE, WITNESS-CORE |
| EXECUTION-CORE | IntelligenceWorker | Structurally dormant by explicit contract (eventTypes:[]); duplicates classification+recommendation pair | canonical_workers.js:713-724 (KEEP-DORMANT contract), :727-738 (skip loop) | none | none | none | none | WorkerRuntime (registration gate) | DORMANT | HIGH | re-enablement without the contract's two conditions would create a DUPLICATE live classifier | n/a | Agent 20 |
| EXECUTION-CORE | ReplayWorker + KernelReplayExecutionProvider | Deterministic replay executes live via injected provider; without provider it is a verified:false no-op | gateway_runtime.js (replayProvider = new KernelReplayExecutionProvider()); canonical_workers.js replay worker | WorkerRuntime | kernel replay engine | replay results in events | WitnessWorker | ReplayWorker | LIVE | HIGH | when provider absent, REPLAY_COMPLETED carries verified:false and WitnessWorker refuses attestation (WITNESS_REJECTED) | REPLAY-CORE | WITNESS-CORE |
| EXECUTION-CORE | WitnessWorker | Attests verified replays; refuses unverified (WITNESS_REJECTED); emits WITNESS_CREATED with causation | canonical_workers.js:451-510 | WorkerRuntime | UnifiedEventRuntime | ping_events (WITNESS_CREATED/REJECTED) | verifiers | WitnessWorker | LIVE | HIGH | none | REPLAY-CORE (verified flag) | WITNESS-CORE, EXECUTION-ADAPTER |
| EXECUTION-CORE | DeadLetterAuthority | Exhausted missions recorded to repository_dead_letters with witness + replayable flag; wired into scheduler | gateway/dead_letter_authority.js:38-120; gateway_runtime.js:541-556; mission_scheduler.js:289-303 | MissionScheduler._failMission | repository_dead_letters | DeadLetterAuthority | /mc dead-letter readers | DeadLetterAuthority | LIVE (source); image-lineage caveat | MEDIUM-HIGH | none | WITNESS-CORE | n/a |
| EXECUTION-CORE | ExecutionAuthority (gateway/execution_authority.js) | Dormant; dynamic require+execute with no actor/capability/approval check; unsafe if revived | gateway/execution_authority.js:29-158 (:67-78 dispatch); absent from bootstrap/wiring.js and gateway_runtime.js | none live | dynamic module | n/a | n/a | none | DORMANT | HIGH | revival without an authorization gate would be remote-code-capable | GOVERNANCE-CORE (needs ruling before any rewire) | Agent 20 |
| EXECUTION-CORE | Sequence/Parallel/EventRouting authorities | Dormant executor family; sequence stops at first failure with no rollback/compensation | gateway/sequence_authority.js:35-82 et al.; callers only inside the dormant cluster | none live | none | n/a | n/a | none | DORMANT | HIGH | no compensation semantics anywhere | n/a | Agent 20 |
| EXECUTION-CORE | MissionExecutionAuthority | Dormant/aspirational; placeholder tests/replay/commit; no try/catch or transaction across steps | gateway/mission_execution_authority.js:84-188, :305-370 | none live | none | n/a | n/a | none | DORMANT | HIGH | n/a | n/a | Agent 20 |
| EXECUTION-CORE | ApprovalAuthority | Dormant; auto-approve default (policy_automatic) with un-falsifiable test condition (tests_passed || true) | gateway/approval_authority.js:135-150, :160-182 | none live | approvals tables | n/a | n/a | none | DORMANT (BROKEN-IF-REVIVED) | HIGH | auto-approval would launder untested changes as approved | n/a | GOVERNANCE-CORE, Agent 20 |
| EXECUTION-CORE | Temporal activities | Dormant/stub; external-agent authorization is TODO comments; active path returns stub success | ping-runtime/temporal/activities/mission_activities.js:16-57 | none live | none | n/a | n/a | none | DORMANT/STUB | HIGH | stub success could be mistaken for real authorization | n/a | Agent 20 |
| EXECUTION-CORE | ConstitutionalExecutionPipeline / ReducerExecutor / ProjectionExecutor | Legacy; live /events bypasses the kernel pipeline | kernel pipeline files; routes/events.js bypass | none live | none | n/a | n/a | none | DORMANT/LEGACY | MEDIUM | n/a | n/a | Agent 20 |
| EXECUTION-CORE | Python worker layer | Complete alternate worker runtime (poll gateway, dispatch, mark processed); no container running | kernel/event_dispatcher.py; workers/worker_runtime.py; docker ps shows no worker container | none live | gateway HTTP API | n/a | n/a | none | DORMANT | HIGH | if started, would be a DUPLICATE live executor of the same event stream | BUILD/DEPLOY-CORE | Agent 20 |
| EXECUTION-CORE | CapabilityResolver | Live-loaded metadata/introspection only; declares provider/secrets/dependencies; authorizes nothing, invoked by nothing at execution time | ping-runtime/runtime/capability_resolver.js:10-127; gateway_runtime.js:180-181, :714-717, :769-772 | constitution/ops routes | none at execution | n/a | introspection readers | none (metadata) | LIVE (introspection only) | HIGH | name suggests authority; behavior is not | n/a | GOVERNANCE-CORE |
| EXECUTION-CORE | connectors (email/sms) | Live-loaded but stubs: EmailIntegration.send queues in memory; no SMTP send path exists | ping-runtime/connectors/email_integration.js:1-30; email_connector.js | connector routes | in-memory array | n/a | sync readers | none | LIVE (stub) | HIGH | status:'queued' could be mistaken for delivered | n/a | EXECUTION-ADAPTER |
| EXECUTION-CORE | /mc mission-control routes | Live, strictly read-only (GET-only): dashboards, queues, missions, replay/witness stats, dead letters | gateway/routes/mission_control.js:62-664 (no POST/PUT/DELETE) | HTTP GET | read models | n/a | operators | none (read) | LIVE (read-only) | HIGH | none | n/a | n/a |
| EXECUTION-CORE | ExecutionEngine + /orchestration | Live-initialized and route-mounted competing execution subsystem; state-change reachability NOT fully traced | gateway_runtime.js:433-476, :514-577, :682-683, :792-793 | /orchestration routes | unknown | unknown | unknown | ExecutionEngine | LIVE-LOADED (reachability OPEN) | MEDIUM | possible second execution owner; needs caller trace | GOVERNANCE-CORE | Agent 20 |
| EXECUTION-CORE | WorkflowExecutor / StateMachineExecutor | Generated, live-loaded; whether they mutate state or only describe is NOT established | gateway_runtime.js:176-185 | unknown callers | unknown | unknown | unknown | unknown | LIVE-LOADED (reachability OPEN) | LOW-MEDIUM | n/a | n/a | Agent 20 |
| EXECUTION-CORE | partial failure semantics | emit persists before dispatch (handlers swallowed); mission transitions not transactional with mission events; no compensation anywhere | unified_event_runtime.js:173-207; mission_runtime.js:89-177; sequence_authority.js:35-82 | n/a | ping_events, ping_missions | runtimes | downstream readers | runtimes | LIVE | HIGH | receipts do not distinguish full vs partial fan-out | WITNESS-CORE (attestation scope) | EXECUTION-ADAPTER, Agent 20 |

## 8. Patch assessment (strict rule)

No constitutional evidence unambiguously established a safe correction, so **no patch was applied** to the isolated sprint worktree and no
proposal diff was written for the live runtime. The two strongest candidates were evaluated and rejected as patches:

1. Generic `POST /events` unsigned ingress: adding a gate could break legitimate internal callers (bridge/scheduler use in-process paths; the route's
   full caller set in the prod image was not enumerated). A proposal needs EXECUTION-ADAPTER's caller inventory first. Flagged as a finding, not patched.
2. Re-adding CapabilityAuthority to the source tree: a design/lineage decision for GOVERNANCE-CORE and BUILD/DEPLOY-CORE, not a smallest-safe correction.
   Flagged as DIVERGENCE, not patched. No second canonical authority was created.

## 9. Open questions / recommended follow-ups

1. Trace `ExecutionEngine` method calls from `/orchestration` routes: which methods mutate state, what authorizes them, what receipts they produce,
   and whether they conflict with `MissionRuntime` (needs EXECUTION-ADAPTER or a deeper core pass).
2. Trace generated `WorkflowExecutor`/`StateMachineExecutor` callers to decide executor vs introspection.
3. Enumerate callers of the generic `POST /events` branch (prod image) before any ingress-gate proposal.
4. Resolve the prod-image/source-tree divergence: decide the canonical home of CapabilityAuthority + exterior-auth middleware (GOVERNANCE-CORE,
   BUILD/DEPLOY-CORE). The rc line already matches the sourceless state; the next prod deploy from source would silently drop execution authorization.
5. HPP business routes (reviews/customers/projects/connectors/identities/ingest) were not fully traced for state mutation; listed as LIVE-possible.
6. `witness_authority.js` (gateway) vs core `WitnessWorker`: both exist; the gateway one feeds the dormant ExecutionAuthority cluster, the core one is
   live. Confirm no live caller of the gateway witness authority (looks DORMANT, supporting the cluster).

## 10. Seam note for EXECUTION-ADAPTER (sibling)

- The website repo treats `/home/nolan/ping` as the external canonical runtime; its user-facing grants are not the executor CapabilityAuthority
  (per `authority-map/AUTHORITY-MAP.md`).
- The website attestation gate verifies receipts against core's `ping_events`; it does not re-verify capability receipts (`capability_requests`, prod
  image only).
- `POST /events` is the canonical ingress seam; the signed BFF envelope path is authorized, the generic branch is not.
- No cross-domain writes were made; cross-domain items appear only in the DEPENDENCIES column above.
