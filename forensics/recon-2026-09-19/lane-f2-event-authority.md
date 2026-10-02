# LANE-F2 FALSIFICATION PACKET: Event Authority

Lane: F2 (independent falsification). Strictly read-only investigation. No source edits, no commits, no DB writes, no restarts, no secret reads.
Blindness: lane-p and all other lanes' conclusion files were NOT read. All verdicts below are re-derived from primary source.

## TARGET CLAIM

"Exactly one effective Event Authority": UnifiedEventRuntime is the single canonical event pipeline, every event flows through UnifiedEventRuntime.emit() into ping_events, and no other component mints, orders, or persists canonical events.

## LAYERS EXAMINED

- LOCAL_WORKTREE: /home/nolan/worktrees/constitutional-convergence, branch constitutional-convergence-v2, SHA 84da2d40c9dae3c4f7c6070845e073b1471d245a
- LIVE_RUNTIME: container `ping-gateway`, image `ping-gateway:devin-boundary2` (image id ad4c82c97bd1), built 2026-09-16T12:54:22Z, host Pig (100.79.154.43), cmd `node gateway/server.js`, up 26h at inspection time
- LOCAL_BRANCH (reference only): /home/nolan/ping, branch feature/approval-effect-identity, SHA 88c9651be

## ATTACKS ATTEMPTED

1. Enumerated every INSERT/UPDATE against ping_events in live /app and the worktree (outside tests).
2. Enumerated alternate event tables and their writers (repository_events, canonical_events, events, event_processing).
3. Traced the live boot chain end to end: server.js -> bootstrap/gateway_runtime.js, every require and every `new`.
4. Checked EventRepository.appendEvent reachability from the live bootstrap.
5. Checked ConstitutionalEventStore and AcquisitionManager for any code existence.
6. Checked IEventAuthority for implementations.
7. Enumerated every UnifiedEventRuntime.emit call site reachable live.
8. Checked the EventBridge convergence path for identity preservation across the bridge.
9. Checked the live event_registry.json against the event types the HPP authorities actually emit.
10. Compared live container file hashes against worktree HEAD to detect build drift.
11. Searched live /app for SQLite or filesystem event logs acting as authorities.
12. Searched live /app for test-only code wired into the production boot chain.

## WHAT BROKE

### BREAK-1: CanonicalEventEnvelope is a second EFFECTIVE event authority in the live runtime

The live bootstrap instantiates, initializes, and mounts TWO event authorities side by side:

- /app/gateway/bootstrap/gateway_runtime.js:480: `canonicalEventEnvelope = new CanonicalEventEnvelope(this._storage, { repoRoot });` followed by `await canonicalEventEnvelope.initialize();`
- /app/gateway/bootstrap/gateway_runtime.js:513: `unifiedEventRuntime = new UnifiedEventRuntime({...})`
- /app/gateway/bootstrap/gateway_runtime.js:790: POST /events mounted on the runtime
- /app/gateway/bootstrap/gateway_runtime.js:794: POST /canonical-events mounted on the envelope (behind exterior auth middleware)

The envelope performs every authority function independently:

- Identity minting under its OWN scheme: /app/gateway/canonical_event_envelope.js `generateEventId()` builds a deterministic UUID v5 from `(tenantId, eventType, timestamp, sequence)`. UnifiedEventRuntime mints SHA-256 hex (live build) or `event_<16hex>` via IdentityAuthority (worktree). Different algorithms, different inputs, different ID spaces.
- Ordering under its OWN sequence: per-tenant `MAX(sequence)+1` (/app/gateway/canonical_event_envelope.js `getNextSequence()`), vs the runtime's PG-global sequence.
- Persistence to its OWN table: /app/gateway/canonical_event_envelope.js:174 `INSERT INTO canonical_events ... ON CONFLICT (tenant_id, sequence) DO NOTHING`.
- Validation of its own: required-field checks only (no registry, no governance, no IdentityAuthority, no CanonicalizationService).
- Its own read model: GET /canonical-events reads canonical_events only.

Live writers through the envelope (all mounted in the running gateway):

- /app/gateway/routes/canonical_events.js:29: POST /canonical-events calls `canonicalEventEnvelope.executeEmitEvent()` directly. Any authenticated caller can create canonical events that never touch UnifiedEventRuntime.
- /app/ping-runtime/business/review_authority.js:78: `executeFlagReview` writes `review.flagged` ONLY via `this._events.executeEmitEvent()` (the envelope). No parallel emit to ping_events.
- /app/ping-runtime/business/customer_authority.js:541, project_authority.js:150,197,301, ai_workspace_authority.js:88: same pattern.

The two components' own headers make mutually exclusive claims. UnifiedEventRuntime: "Single canonical event pipeline. Every event flows through here." CanonicalEventEnvelope: "Every tenant (HPP, future) emits events through this envelope." Both cannot be true. The envelope's path falsifies the runtime's.

Effect classification: CanonicalEventEnvelope = EFFECTIVE at LIVE_RUNTIME (instantiated, initialized, serving writes) and EFFECTIVE at LOCAL_WORKTREE (still instantiated at gateway/bootstrap/gateway_runtime.js:399-400, still mounted at :696, still injected into all four HPP authorities). Count of effective event authorities: TWO, not one.

### BREAK-2: Two paths produce different IDs for the same logical event

The live EventBridge (/app/ping-runtime/events/event_bridge.js, RUNNING: container logs show 5s poll cycles with `DEBUG canonical_events unprocessed count: 0`) re-emits canonical_events rows through `this._eventRuntime.emit()`. That call mints a NEW event ID (SHA-256 in the live build). The original UUID v5 survives only inside the mutated payload (`payload._canonical_event_id`, event_bridge.js) and metadata (`original_event_id`). The payload itself is mutated before hashing, so even content identity diverges. Result: one logical event, two IDs, two tables, no shared identity key. The worktree's replacement (LegacyIngressAdapter) keeps the same property by design: it emits through UnifiedEventRuntime.emit and records the cross-reference in `metadata.legacy_ingress.canonical_event_id` / `metadata.original_event_id` (legacy_ingress_adapter.js:265,273,360). The old bridge's own successor header (worktree event_bridge.js:1-22) lists "identity reminted" among the frozen defects. State: SOURCE_VERIFIED at both layers, LIVE_VERIFIED that the bridge runs.

### BREAK-3: Dotted-type canonical events can never reach ping_events in the live build (coverage gap)

The HPP authorities emit dotted event types: `review.flagged`, `project.created`, `project.updated`, `project.artifact_added` (review_authority.js, customer_authority.js, project_authority.js, ai_workspace_authority.js). The live event_registry.json contains zero dotted types (`review.flagged` grep count: 0; registry uses SCREAMING_SNAKE). The live UnifiedEventRuntime.emit validates type via `isRegistered()` (live event_validator.js:123; live emit has no capability exception) and returns `{ status: 'error', code: 'UNKNOWN_EVENT_TYPE' }`. The live bridge does NOT mark such rows processed on rejection, so they retry every 5s forever and NEVER land in ping_events. Consequence: canonical_events rows of these types are persistence invisible to every ping_events consumer (/events, EventReadAuthority, replay). Replay asymmetry confirmed at code level. Live manifestation: not yet observed (bridge log history shows 0 unprocessed rows and 0 "emit rejected" lines in the available window), so this break is REACHABILITY_VERIFIED, pending a single dotted-type emission to become LIVE_VERIFIED. The worktree closes this specific gap via the MC-1 capability-bound registry exception (legacy_ingress_adapter.js:307-310); the live image predates it.

### BREAK-4: The live deployment runs pre-convergence code with a live governance bypass

- Build drift: live /app/ping-runtime/events/unified_event_runtime.js sha256 2f56ba17e694eff76d0a2384510415759937a6dd2c44a4a06ed26d8b7491807c vs worktree 0bc2cc32e1a635d05f91821b905370d2cb9e78cfc37867e0f6cd7119305e1f3e. Live /app/ping-runtime/events/event_bridge.js 15f20949a4e58a74b05f08645c0f608b22d784ff16ba23b9c77102ca21b6d281 vs worktree d5c6ac81e33971da2a8ec60acc270085b9a06796c52635f12c64e2a420028c63. The live UER blob (git blob c82089498a032f5eeceb43a1cc619a438d418b74) exists in NO local git history (`git log --all --find-object` empty in /home/nolan/ping/.git, which the worktree shares). Image built 2026-09-16T12:54:22Z with no labels and no /app/.git: source SHA of the live build is UNRECOVERABLE.
- The live image therefore predates the MC-1 convergence work (2026-09-18): it still runs the RETIRED EventBridge (worktree header: "CLASSIFICATION: PRESERVED_INACTIVE... RETIRED and no longer wired into the gateway... Superseded by LegacyIngressAdapter"), and it has NO legacy_ingress_adapter.js and zero wiring for it.
- Live governance bypass is REAL, not theoretical: live emit honors the boolean `options._skipGovernance` (/app/ping-runtime/events/unified_event_runtime.js:106-107: `if (this._eventGovernance && !options._skipGovernance)`), and the live bridge passes `_skipGovernance: true` on every bridged emit. The worktree closed this (forgeable bypass rejected without the capability object). So in LIVE_RUNTIME, bridged events skip governance entirely while direct events do not: two acceptance standards for the same table.

### BREAK-5 (supporting): namespace and provenance bypass on the envelope path

POST /canonical-events and the HPP authorities bypass the CanonicalizationService namespace boundary (`core::system` default owned by UnifiedEventRuntime.emit), EventGovernance privacy checks, and the constitutional time/identity authorities (envelope uses its own timestamp call and UUID v5). A second, ungoverned ingress surface into durable event state. State: LIVE_VERIFIED (route mounted, writers live).

## WHAT HELD

1. UnifiedEventRuntime is the SOLE writer to ping_events. In live /app, the only non-test `INSERT INTO ping_events` is /app/ping-runtime/events/unified_event_runtime.js. (Worktree: same, plus tests/evals.) To break this, a second INSERT path would need to be wired into the boot chain; none is.
2. Exactly ONE UnifiedEventRuntime instance exists in the live boot chain (/app/gateway/bootstrap/gateway_runtime.js:513; all other `new UnifiedEventRuntime` hits are test_ files not required live). To break: instantiate a second runtime against a different pool/table in the boot path.
3. EventRepository.appendEvent is LEGACY_UNREACHABLE from the live bootstrap. The require chain (/app/gateway/event_repository.js:12 -> ../runtime/kernel/event_repository; required only by bootstrap/constitutional_runtime.js:2 and gateway/constitutional_execution_pipeline.js:2) has NO requirer in the live chain (server.js -> bootstrap/gateway_runtime.js only; recursive grep confirms nothing live requires constitutional_runtime, constitutional_execution_pipeline, or gateway/event_repository). The repository_events table EXISTS in the live DB (the running bridge SELECTs it every 5s with errors=0) but is write-dormant. To break: wire constitutional_runtime.js or the repository routes into the boot chain and call appendEvent.
4. ConstitutionalEventStore = PHANTOM. Zero code references across the worktree (.js/.ts/.py); only 2 documentation mentions in CERTIFICATION.md. To break: produce an implementation.
5. AcquisitionManager = PHANTOM. Same: zero code references; doc-only mentions. To break: produce an implementation.
6. IEventAuthority = DORMANT. Single interface declaration at runtime/kernel/events/event-authority-interface.ts:8; zero implementations found. To break: implement and wire it.
7. append_orchestrator.js = DORMANT. Present in live /app/gateway and the worktree; required by nothing in the live chain. To break: require it from the boot path.
8. No SQLite or filesystem event authority. sqlite hits in live /app are doc comments only (repository_interface.js:9 mentions backends in prose). No filesystem event log is read as an authority by the boot chain (repository_events.json in the worktree root is unreferenced by live routes/bootstrap). To break: wire a sqlite/file writer into event acceptance.
9. No test-only authority code is booted in production. test_*.js files ship in the image but none are required by server.js or gateway_runtime.js. The one naming collision checked: kernel_replay_execution_provider.js:15,113 instantiates `./replay/kernel/canonical_event_envelope` CanonicalEventEnvelope, which is a kernel replay DATA format class, not the gateway authority. Different class, same name; not a writer.
10. The narrower claim "ping_events has exactly one writer, UnifiedEventRuntime" HOLDS at both layers. What fails is only the unscoped "exactly one effective Event Authority" for the system as a whole.

BLOCKED (not a finding, a limit): live DB row counts for ping_events / canonical_events / repository_events would need POSTGRES_PASSWORD from the container env; reading it is a secret read this lane is not authorized to perform. All live-runtime conclusions above rest on code reachability plus live container logs, not row counts.

## VERDICT

FALSIFIED as stated.

At LIVE_RUNTIME there are TWO effective event authorities, not one: UnifiedEventRuntime -> ping_events AND CanonicalEventEnvelope -> canonical_events. The envelope is live-instantiated, live-initialized, serves authenticated writes at POST /canonical-events, is injected into four live-mounted business authorities, and mints/orders/persists/serves events under an independent identity scheme (UUID v5), independent per-tenant sequence, and independent table, bypassing the registry, governance, canonicalization, and identity authorities. Converged rows carry two different IDs. In the live build, dotted-type business events can additionally never converge into ping_events at all.

The claim HOLDS only under a narrowed scope: "the PING spine canonical log (ping_events) has exactly one writer." To make the unscoped claim true, one of: (a) retire CanonicalEventEnvelope as a writer and route all HPP emissions through UnifiedEventRuntime.emit, keeping the envelope as a read/projection view; or (b) re-scope the claim explicitly and treat canonical_events as a separate bounded authority, with the ID/ordering/validation divergences documented as accepted rather than converged.

Note for the coordinator: the live image (built 2026-09-16, source SHA unrecoverable, no labels) predates the MC-1 convergence work (2026-09-18, LegacyIngressAdapter + retired bridge + closed governance bypass). The worktree STILL wires CanonicalEventEnvelope as a live writer (gateway/bootstrap/gateway_runtime.js:399-400,696), so redeploying current source does not by itself restore single-authority status; it only repairs the convergence mechanism.
