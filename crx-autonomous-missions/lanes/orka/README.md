# Orka harvest lane

Research lane for the CRX autonomous-missions campaign. Source project: Orka (orka-agents/orka), an experimental Kubernetes-native platform that runs durable AI agent Tasks against pluggable coding-agent CLIs. This README is the human-readable companion to `mechanisms.jsonl`; every serious claim names its source file and line. No prose-only handoff.

Scope limits honored in this lane: research only, no CRX implementation, no FYD/Jev/Pig work, no pushes, no deployments, no Kubernetes adoption proposal, no credentials in any output. Kubernetes-specifics below are translated into Kubernetes-free semantics wherever possible.

## 1. Source identity

- Repository: `orka-agents/orka` (this is the expected Provider -> Agent -> Task project supporting Codex, Claude Code, Copilot CLI, and OpenCode; confirmed by the `AgentRuntimeType` enum: `claude`, `codex`, `copilot`, `opencode` in `api/v1alpha1/task_types.go`, line 18).
- HEAD observed 2026-09-23: commit `cb73ac8019117c4e86d04fcfd3237ac65f56662a`, committed 2026-09-23T15:11:12Z ("fix(acp): cancellation, session cleanup, proxy EOF, and session dir fixes (#658)").
- License: MIT, copyright Microsoft Corporation (`LICENSE`, lines 1-4). All mechanism records carry `MIT (Microsoft Corporation)`.
- Project status: the repo describes itself as experimental and not production-ready (source: `website/docs`, intro statements on the project site). Therefore `IMPLEMENTATION != PRODUCTION PROOF` applies to everything below; mechanisms are design evidence, not hardened guarantees.
- Method: source files fetched via the GitHub contents API at the pinned commit; shallow clone attempt stalled and was discarded. No live cluster was run. Line numbers below refer to the pinned commit.

## 2. Central question: is TASK AS DURABLE RESOURCE cleaner than conversational or coordinator state?

Yes, with a precise split that matters for CRX:

1. Orka does not persist the conversation as the unit of record. It persists the *work authority* as the unit of record: immutable intent (`TaskSpec`), the frozen execution binding (`AgentExecutionBinding`), per-attempt identity and outcome (`PromptAttempt` / `TaskStatus`), and authority revocations. The coordinator (TaskReconciler, ACP dispatcher) keeps no durable private state; every reconcile reads the records and re-derives. Recovery after leadership change is therefore a classification problem over records, not a memory problem. Source: `internal/controller/acp_recovery.go`, line 101 (`recoverStaleAttempts`: "It resumes only states that provably crossed no prompt request-write boundary and makes all potentially accepted prompts terminally OutcomeUnknown without allocating a replacement attempt.").
2. Conversational state is demoted to a payload projection. The docs state session streams are "a read model derived from task events tagged with sessionName" (`website/docs/reference/execution-events.md`, Task event list API section). Sessions are not the control plane.
3. CRX-relevant conclusion: keep the CRX event journal as the control authority; add a durable per-attempt Run identity with write-once binding and honest-unknown terminal semantics. Orka's `PromptAttempt` record is the strongest single mechanism to ADAPT for CRX's proven gap (no durable per-attempt Run identity). See `orka-outcome-unknown-fail-closed` and `orka-write-once-execution-binding` in `mechanisms.jsonl`.

## 3. Mechanism index

| ID | HARVEST_CLASS | One-line |
|---|---|---|
| `orka-durable-task-record` | PATTERN | Immutable work intent plus projected status; coordinator holds no durable private state. |
| `orka-write-once-execution-binding` | ADAPT | Immutable routing authority frozen before dispatch; all workers validate against it. |
| `orka-outcome-unknown-fail-closed` | ADAPT | Side-effect-boundary failure semantics: pre-boundary requeues, post-boundary goes terminally OutcomeUnknown, never replayed. |
| `orka-identity-fenced-job-authority` | ADAPT | Worker authority bound to immutable UID identity, never to names; stale incarnations refused, never adopted. |
| `orka-controller-epoch-fencing` | PATTERN | Every authoritative mutation carries a CAS-acquired leadership epoch; stale leaders cannot commit. |
| `orka-fenced-admission-and-execution` | WATCH | Durable capacity reservations with expiry plus exact-instance (pod UID + boot ID) fencing. |
| `orka-digest-pinned-runtime-profile` | PATTERN | Rollouts change a pinned sha256 digest; identity change is rollout, never in-place mutation. |
| `orka-split-credential-roles` | ADAPT | Non-overlapping credential roles with identity references, never values, in durable records. |
| `orka-provenance-admission-gate` | PATTERN | Validating admission rejects untrusted writes to identity/provenance fields; workers cannot self-attribute. |
| `orka-typed-per-task-event-stream` | ADAPT | Per-task sequenced typed event stream with resumable subscription and explicit terminal events. |
| `orka-authority-revocation-ledger` | ADAPT | Durable revocation records survive worker cleanup; stale-worker writes are rejected, never adopted. |
| `orka-aging-priority-queue` | PATTERN | Priority plus bounded aging plus promotion; deterministic multi-key tiebreak. |
| `orka-cron-child-task-scheduling` | PATTERN | Schedule cursor with explicit re-anchoring on missed windows; concurrency Forbid default. |
| `orka-cas-verified-publication` | PATTERN | Content-addressed deltas, exact-ref CAS push, independent verification, typed delivery states. |
| `orka-ordered-finalizer-cleanup` | PATTERN | Cleanup finalizer with explicit ordered revocation list before object deletion. |
| `orka-secretless-credential-bootstrap` | PATTERN | Worker boots with zero credentials; one-time signed seeding binds to instance nonce plus Ed25519 key. |
| `orka-single-control-authority` | ADAPT | Outbox/SQLite stores are committed behind Kubernetes fences; never a second control authority. |
| `orka-delegation-guardrails` | ADAPT | Fan-out caps enforced as requeue-at-limit, child tasks visible in parent status. |
| `orka-isolated-job-per-task` | REJECT | Falsified claim: agent tasks do NOT run as isolated per-task Jobs in current source. |

## 4. Findings with source evidence

### 4.1 Task as durable work authority, not conversation record

- `TaskSpec` holds immutable intent: type, prompt, references, timeout, schedule, retry policy (`api/v1alpha1/task_types.go`). CEL rules freeze task type, provenance, agent prompt, and agent runtime references after creation.
- `TaskStatus` is a projected durable state: phase, attempts, `JobUID` (line 462; comment: "This UID is the only trustworthy link back to the authoritative Job"), execution outcome, delivery state, workspace lifecycle, child tasks, last schedule cursor.
- The controller keeps no durable private state. Recovery classifies records by where they sat relative to the request-write boundary (`internal/controller/acp_recovery.go`, line 101).
- CRX lesson: the missing piece is not more journaling; it is a first-class per-attempt Run record with immutable identity and write-once binding. Conversational content stays a projection, not a control authority.

### 4.2 Write-once execution binding

- `AgentExecutionBinding` is write-once and authoritative for routing, recovery, cancellation, settlement, and finalization (`api/v1alpha1/agent_execution_binding_types.go`, line 97). It freezes task and namespace identity, agent UID and generation, runtime protocol and backend, snapshot digest, runtime profile, and binding digest.
- Every ACP dispatcher builds decisions only from immutable snapshots; a `PromptAttemptPreSubmissionRecovery` structure requires proof that a prompt "was not accepted" before anything may re-submit (`internal/store/control_types.go`).
- CRX lesson: one canonical Run binding event tying mission, attempt, worker profile, input digest, and authorization snapshot, recorded before execution begins.

### 4.3 OutcomeUnknown is terminal, and that is the point

- `api/v1alpha1/task_runtime_types.go`, line 66: execution-state machine; line 85 comment: "OutcomeUnknown is terminal and must never be treated as generic retryable failure. The terminal marker must be a unique durable value, never an empty or omitted string."
- Recovery message in source: "outcome is unknown and was not replayed" (`internal/controller/acp_recovery.go`, restore constants near lines 30-40).
- CRX lesson: this is exactly CRX's typed-failure rule. The mechanism maps 1:1 onto the CRX failure model: never silently convert failure (or ambiguity) into empty success; give ambiguity its own durable terminal value with a unique marker, not an empty field.

### 4.4 Worker authority binds to UID identity, never names

- For native job-backed tasks: `BackoffLimit: 0` (no retries at Job level; controller owns retry semantics), `RestartPolicy: Never`, per-task service account and network policy (`internal/controller/job_builder.go`, line 482).
- Recovery refuses to adopt a same-name Job whose UID does not match `status.jobUID`; unbound Jobs are deleted, not adopted (`internal/controller/task_job_identity.go`, line 64 `recoverTaskJob`).
- `TaskJobAuthorityStore` (SQLite) revokes job authority when the binding changes; revocations persist through cleanup and are checked on writes (`internal/store/task_data_transaction.go`, line 23).
- CRX lesson: for disposable CRX subagents, bind worker authority to an immutable attempt/run identity plus worktree identity; a process with the same name is not the same worker.

### 4.5 Leadership epoch fencing

- `ControllerEpochManager` acquires a monotonic epoch via optimistic CAS on a lease/ConfigMap; control loops hold a `fence` they attach to every ACP control mutation (`internal/controller/controller_epoch.go`, line 50 `Start`).
- `ControlRecordMutationStatus` records `controllerEpochName`, `epoch`, `operationID`, `operationDigest`, monotonic `version` (`api/v1alpha1/control_record_types.go`, line 31).
- On leadership change, `recoverStaleAttempts` classifies every old-epoch attempt before admitting new work.
- CRX lesson: CRX's journal sequence plus authoritative runtime lease already provides the substrate for the same property (monotonic writer identity on every authoritative mutation). No new control plane needed.

### 4.6 Fenced admission and execution (WATCH)

- Capacity reservations are durable objects keyed on (pool UID, task UID, attempt, epoch) with a per-instance target and expiry; reclaimers expire unsealed claims; a reservation is authoritative for pre-admission (`api/v1alpha1/runtime_pool_types.go`, line 486).
- Execution is fenced to the exact runtime instance: pod UID plus boot ID form a `RuntimeInstanceID`; session leases carry generation counters; scale is fixed 0..1 per pool.
- CRX lesson: transfer the semantics (durable admission identity, fencing to exact instance, expiry reclamation), not the Kubernetes substrate.

### 4.7 Digest-pinned runtime profile

- `RuntimePoolProfileSpec` pins a sha256 digest covering adapter/CLI builds, ACP profile, tool allowlist, approval policy, MCP config, model limits, CLI args, resource class, and workspace intent. Container images must be digest-pinned. Rolling an update changes the digest; the pool drains and replaces instances, never mutating them.
- CRX lesson: digest the agent runtime profile (prompt pack, tool policy, model config) per attempt; a profile change is a new binding, not an in-place edit.

### 4.8 Split credential roles

- Non-overlapping roles: SourceRead, TargetRead, TargetWrite, Forge, Provider, PromptBroker, PublisherAuthz, ArtifactCapability (`internal/store/control_types.go`; `api/v1alpha1/task_runtime_types.go`; `website/docs/concepts/security.md`).
- Records carry namespace, secret name, key, secret UID, and resource version; never values. The provider proxy means "LLM credentials stay in the cluster; developers get a ServiceAccount token, not an API key."
- The ACP broker reauthorizes per tool call (tool allowlist, approval policy, sandbox policy); ACP runtimes cannot push code, publishers cannot call models.
- Transaction tokens (`website/docs/concepts/transaction-tokens.md`): vendor-neutral OAuth Transaction Token profile (RS256, `typ: txntoken+jwt`, txn/scope/req_wl claims); TTS (RFC 8693) mints child-scope tokens; child scopes must be a subset of the parent; tokens are request-scoped, fail-closed, and redacted from status/events/logs.
- CRX lesson: directly addresses CRX's proven action-level authorization gap; adopt role separation and identity-references-only when CRX builds any MCP/tool path.

### 4.9 Provenance admission gate

- Validating webhook (`internal/admission/task_provenance.go`, `task_coordination.go`) rejects writes to `spec.requestedBy`, `spec.transaction`, and transaction labels/annotations unless they carry the authorized safe prefix or come from the controller. Safe context digests can be set only by the controller.
- CRX lesson: verify-before-attribute. Agent-emitted provenance fields must be validated at the durable-write boundary, not trusted from the worker.

### 4.10 Per-task typed event stream

- 40 typed events (`internal/events/execution_event.go`); per-task sequenced stream with `after=N` cursor; SSE with the task sequence as event id; terminal events close the stream (`website/docs/reference/execution-events.md`).
- `DeleteExecutionEvents` is called in task cleanup (`internal/controller/task_controller.go`).
- CRX lesson: CRX has `ping_events`; Orka's pattern adds per-run typed streams with resumable cursors and explicit terminal frames, a fit for CRX run timelines.

### 4.11 Delegation guardrails

- `delegate_task` tool: `allowedAgents`, `maxDepth`, `maxConcurrentChildren` enforced by the controller; hitting `maxConcurrentChildren` requeues rather than failing; parent status lists `childTasks` (`website/docs/concepts/architecture.md`, multi-agent section).
- CRX lesson: for parent agents spawning disposable subagents, caps belong at the dispatch authority with requeue-at-limit semantics, and child run identities stay visible in the parent record.

### 4.12 Cron scheduling as child tasks

- Scheduled tasks create one child Task per tick; `lastScheduleTime` cursor; missed windows beyond the starting deadline (default 100s) are skipped with the cursor re-anchored to now so the schedule resumes instead of freezing (`internal/controller/task_controller.go`, `handleScheduled`).
- History limits default to 3 successful and 1 failed child (`internal/controller/task_spec_defaults.go`); `ConcurrencyPolicy: Forbid` is the default.
- CRX lesson: the re-anchor-on-miss pattern and history limits transfer to any CRX recurring-mission machinery.

### 4.13 CAS-verified publication, separate from execution

- Execution and delivery are separate state machines. Publication uses content-addressed deltas, exact-ref push with expected remote SHA (CAS), independent verification (`VerifiedRemoteSHA`, `VerifiedExact` receipt), and typed delivery states (`PublicationOutcomeUnknown`, `DeliveryConflict`, `CredentialBlocked`).
- `BranchClaim` compare-and-swap governs branch ownership.
- CRX lesson: worker completion is not objective completion; verification and external delivery need their own durable outcomes. Directly supports CRX's "maximize verified autonomous throughput" mandate.

### 4.14 Single control authority

- ACP payload/outbox SQLite stores are explicitly "SQLite behind Kubernetes fences": committed under K8s epoch and session fences; SQLite is never a second control authority (`website/docs/concepts/architecture.md`, store section; `internal/store/task_data_transaction.go`).
- Execution snapshots are AES-256-GCM encrypted at rest with a 32-byte controller-managed key; losing the key fails startup closed rather than minting a new one and orphaning snapshots (`cmd/agent_execution_snapshot_secret.go`).
- CRX lesson: CRX already has one-owner-per-concern; this mechanism is the precedent to cite when anyone proposes a second orchestration universe.

### 4.15 Secretless worker bootstrap

- Provider-hosted supervisors boot with zero credentials; the provider-visible template carries only a public nonce and an Ed25519 public key; the controller signs nonce plus request body with a controller-only seed; a captured snapshot contains no secrets (`workers/acp/supervisor/credential_bootstrap.go`).
- CRX lesson: worker materialization should never bake credentials into the template.

## 5. Falsified or qualified claims (README CLAIM != IMPLEMENTATION)

1. FALSIFIED: "Each task runs as an isolated Kubernetes Job." Older README text and stale fork crawls say this; current source says otherwise. `type: ai` and `type: container` tasks run in per-task Jobs, but `type: agent` (built-in coding-agent) tasks run in pooled RuntimePool supervisors, and "there is no agent Job fallback" (`website/docs/concepts/architecture.md`, controller section). Recorded as `orka-isolated-job-per-task` with HARVEST_CLASS `REJECT`.
2. FALSIFIED: `website/docs/concepts/architecture.md` project structure comment says `api/v1alpha1/` holds "Type definitions for the nine Orka CRDs". Current source has 29 files in `api/v1alpha1/` (2 fake/dev-only), i.e. 27 production CRDs across 4 API groups, not 9. The count claim is stale; the "27 CRDs" statement elsewhere in the same doc is accurate.
3. QUALIFIED: "Everything is a durable record" is lifecycle-scoped. `DeleteExecutionEvents`, session locks, result artifacts, authority revocations, and publication bundles are all deleted by the task finalizer on task deletion (`internal/controller/task_controller.go`, `finalizeTask`). Durable across execution failures and restarts; not archival.
4. QUALIFIED: Session serial execution uses an `active_task` lock with no timeout ("There is no timeout; if the lock holder crashes, the lock persists until the task is deleted," `website/docs/concepts/architecture.md`, store section). A crashed holder blocks the session until cleanup; Orka accepts this and does not add heartbeats. Relevant failure model for any CRX session analog.
5. QUALIFIED: `IMPLEMENTATION != PRODUCTION PROOF`. The project labels itself experimental and not production-ready. Mechanisms are extracted from design and implementation evidence, not from production operating history.

## 6. What NOT to take from Orka

- Do not propose Kubernetes as the CRX substrate. All mechanisms above are recorded in Kubernetes-free semantics; the K8s Job, Pod, and Secret machinery is Orka's deployment detail, not the lesson.
- Do not create a second orchestration universe. Orka's own invariant (single control authority, section 4.14) argues against bolting a parallel durable store onto CRX; adapt into the existing event journal.
- Do not copy the RuntimePool scale-to-zero supervisor machinery. The transferable parts are reservation identity, instance fencing, and digest-pinned profiles (mechanisms 6 and 7).
- Do not treat older fork-crawl README text as current: the isolated-Job-per-task claim is stale for agent tasks (falsification 1).

## 7. Transfer recommendation for the parent agent

Highest value, lowest cost, ordered:

1. ADAPT `orka-outcome-unknown-fail-closed` into CRX run attempts: give per-attempt outcomes an explicit terminal `OutcomeUnknown` with a unique durable marker, never an empty field. Matches CRX's typed-failure rule directly.
2. ADAPT `orka-write-once-execution-binding`: one canonical Run binding event per attempt (mission, attempt, worker profile, input digest, authorization snapshot) recorded before execution begins. This is the durable per-attempt Run identity CRX has proven missing.
3. ADAPT `orka-authority-revocation-ledger`: bind worker authority to the immutable attempt identity; stale incarnations get rejected writes, never adopted, with a durable revocation record.
4. ADOPT the discipline of 4.14 (`orka-single-control-authority`) as the standing guardrail against second-universe proposals.
5. WATCH `orka-fenced-admission-and-execution` and `orka-split-credential-roles` for when CRX builds any MCP/tool-execution path.
