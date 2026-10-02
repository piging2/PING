# EventBridge trust forensics: `_skipGovernance: true`

Observed: 2026-09-22 evening. Source revision: worktree jev-surgical @ cc6856c3bc78e0535e66f168c66dc31abee2c073 (detached, uncommitted). Read-only; no source modified. Follows [DISPATCH-PATH-FORENSICS.md](sandbox://workspace/jev/evidence/DISPATCH-PATH-FORENSICS.md) (do not redo); its identified next uncertainty.

## PROBLEM
EventBridge bridges two tables into the canonical spine with `_skipGovernance: true`, on the premise that rows are "already governed in source table" (event_bridge.js:184, 283). That is the internal analogue of LP-2 (SYNTHETIC-CONFIDENCE-CEILING.md). Determine: what tables, what writers, whether verdict-shaped payloads can arrive, and what boundary makes the trust checkable.

## LIVENESS
EventBridge IS live in the running gateway: instantiated and started at gateway/bootstrap/gateway_runtime.js:463-468 (poll 5s, batch 50). UnifiedEventRuntime honors the skip at unified_event_runtime.js:107. EventGovernance IS wired (gateway_runtime.js:226-227, 437) — it is simply never consulted for bridged rows.

What skipping governance actually skips (unified_event_runtime.js:73-121; event_governance.js:149-190): registered-type re-check (redundant — step 2 type validation still runs), authority_owner mismatch (inert on the emit path — validateEvent reads `event.authority_owner`, which emit never sets), canonical namespace shape check, namespace ownership check. For verdict-shaped types (REPLAY_COMPLETED et al.) governance would PASS anyway (type registered, namespace 'replay' has an owner). So the skip is mostly inert for the verdict-forgery class specifically — the real defect is the FALSE PREMISE plus a second, less-visible ingestion route with weaker provenance. Governance was never the barrier; the premise that the source tables were governed was.

## TABLE / WRITER / PAYLOAD INVENTORY

### Table A — `repository_events` (bridge emits with source='repository_events')
Schema (runtime/kernel/event_repository.js:24-51): event_id PK, object_id, event_type, aggregate_type, sequence, payload JSONB, witness JSONB, timestamp, authority, authority_version, causation_id, correlation_id, created_at, RuntimeID, PreviousEventHash, CanonicalEventHash, ReducerHash, WitnessHash, ReplayHash, chain_root.

Writers — NONE LIVE in the running gateway:
- `EventRepository.appendEvent` (runtime/kernel/event_repository.js:102) performs NO governance: no registry check, no namespace check, no payload validation — only hash chaining. Any event_type passes.
- `GatewayToKernelAdapter` instantiates + initializes EventRepository (runtime/kernel/gateway_adapter.js:27,147; wired at gateway_runtime.js:388-389), and constructs `ConstitutionalExecutionPipeline` (gateway_adapter.js:37) whose Stage 2 appends with `request.event_type` verbatim — but `executeEvent` has ZERO live callers in the gateway (only initialize + shutdown). Wired-but-idle.
- Singleton factories `getCapabilityScheduler`, `getAgentMemoryAuthority`, `getDistributedDesktopAgents`, `getAutomaticMissionGenerator` are NEVER invoked (grep-verified) — capability_scheduler, agent_memory_authority, distributed_desktop_agents, automatic_mission_generator are DORMANT. (`authority_registry.js` instantiates AppendOrchestrator, but nothing requires authority_registry in the bootstrap — also DORMANT.)
- Remaining writer classes: migrations (table creation only), tests, manual SQL, any external process with DB credentials. The bridge polls regardless of writer — a row from ANY of these enters the spine.

Status: LIVE-BRIDGED, DORMANT-WRITTEN (in the running gateway). The bridge adds a 5s-delayed ingestion route to a table nobody in the gateway writes to — dead in practice today, live as a mechanism.

### Table B — `canonical_events` (bridge emits with source='canonical_events')
Schema (gateway/canonical_event_envelope.js:174-190): event_id UUID PK, event_type, event_version, tenant_id, timestamp, sequence, source, actor, causation_id, correlation_id, payload JSONB, metadata JSONB, processed BOOLEAN.

Writers — ONE LIVE:
- `POST /canonical-events` (gateway/routes/canonical_events.js:20-42, mounted at gateway_runtime.js:702, PG-gated only). Accepts `{tenant_id, event_type, source, actor, payload}` with PRESENCE-ONLY validation; `executeEmitEvent` (canonical_event_envelope.js) re-checks presence only. No auth middleware at route or mount layer (only express.json() + CORS globally, gateway_runtime.js:117-127 — same posture as POST /events per the LP-2 record). Arbitrary event_type, arbitrary payload, arbitrary tenant_id/actor/source strings.
- `executeEmitEvent` has no other callers (grep-verified). Replay validator/canonicalizer authorities reference canonical_events but are not instantiated in the bootstrap.

Status: LIVE-BRIDGED, LIVE-WRITTEN via unauthenticated HTTP. The "already governed in source table" claim is FALSE: the source table's only gate is field-presence on an unauthenticated route.

### Provenance losses at the bridge (both tables)
- The emitted ping_events row's `source` is rewritten to 'repository_events'/'canonical_events'. The canonical_events row's own `source` column is DROPPED (not bridged; only tenant_id/actor land as `payload._tenant_id`, `payload._actor`). A tenant-claimed source string disappears entirely.
- Namespace: bridge passes no `options.namespace` → 'core::system'. A tenant's canonical_events row (tenant_id arbitrarily claimed) becomes a core::system ping_events row — TENANT PRIVACY BOUNDARY CROSSED at the bridge, exactly where governance is skipped.
- event_id is re-hashed (sha256 of {eventType, source:'canonical_events'|'repository_events', payload+bridge markers}) — no continuity with the source row's event_id except the `_canonical_event_id`/`_repository_event_id` payload markers.

## VERDICT-PAYLOAD REACHABILITY: YES (both tables)

All verdict types are registered (235 events, gateway/generated/event_registry.json): REPLAY_COMPLETED, WITNESS_CREATED, LINEAGE_CREATED, JEV_DECISION_EVALUATED. Step-2 type validation passes them. The bridge copies `row.event_type` verbatim into `UnifiedEventRuntime.emit`.

Traversal for a bridged REPLAY_COMPLETED with `payload.replay.verified=true`:
1. Bridge emit → ping_events (governance skipped, handlers fire — same as any emit).
2. EventToMissionBridge._handleEvent(REPLAY_COMPLETED) → WITNESS_CREATE mission (event_to_mission_bridge.js:65).
3. MissionScheduler (≤5s) → WorkerRuntime.dispatch, event_type=REPLAY_COMPLETED → WitnessWorker.handle (canonical_workers.js:480-530), gate at :493 checks ONLY `payload.replay.verified === true` → attests → WITNESS_CREATED.
4. Bridge maps WITNESS_CREATED → LINEAGE_CREATE (line 66) → LineageWorker → LINEAGE_CREATED (terminal, line 67).
5. Consumers: /witness/stats inflated (mission_control.js:568-587), witness chain tails polluted (590-620), event journal holds apparently-verified attestation. (Per dispatch forensics: Qdrant NOT reached — EmbeddingService INDEXABLE_TYPES and the graph-projection subscriber exclude these types.)
- WITNESS_CREATED bridged directly: same from step 4. JEV_DECISION_EVALUATED: terminal in ping_events (no bridge mapping) — journaled, readable by any future decision consumer. LINEAGE_CREATED: terminal.

Concrete live path today: `POST /canonical-events {tenant_id:'x', event_type:'REPLAY_COMPLETED', source:'x', actor:'x', payload:{replay:{verified:true}}}` → INSERT canonical_events (processed=FALSE) → ≤5s later EventBridge emits to ping_events with _skipGovernance → WITNESS_CREATED. No auth, no payload validation, no governance at any hop. This is LP-2's internal twin: unbounded synthetic attestation, one extra hop.

For repository_events the same traversal holds for any row any DB writer inserts; the writers are dormant in the gateway but the poll is live, so the mechanism is ACTIVE, the producers are QUIET.

## PER-SOURCE EVIDENCE CLASSIFICATION

| Source | Writer class | Payload classification | Bridge classification | Downstream trust |
|---|---|---|---|---|
| repository_events | none live; dormant kernel pipeline / singletons; external DB writers | SELF-ASSERTED unless kernel-produced (DERIVED via hash chain) — bridge cannot distinguish | INHERITED (copies payload + row fields verbatim) | FULL: identical ping_events shape, handlers fire, missions dispatched, stats/read-authority consume |
| canonical_events via POST | unauthenticated HTTP, presence-only validation | SELF-ASSERTED (actor/source/tenant_id are free strings) | INHERITED + namespace rewritten tenant→core::system | FULL: same as above |

The taxonomy note: a canonical_events row with event_type REVIEW_RECEIVED from a tenant is the table's honest use (business event, tenant-scoped — though the namespace rewrite still mislabels it). A row with event_type REPLAY_COMPLETED is SELF-ASSERTED wearing the bridge's "already governed" claim. The bridge has no classifier — honest business events and verdict-shaped forgeries ride the identical path.

## SMALLEST CONSTITUTIONAL BOUNDARY

No new authority needed. The material to enforce on already exists (registry, bridge, governance). Three parts, in priority order:

1. **Verdict-class denylist at the bridge (fail-closed).** `VERDICT_CLASS = {REPLAY_COMPLETED, WITNESS_CREATED, WITNESS_REJECTED, LINEAGE_CREATED, JEV_DECISION_EVALUATED, MISSION_*, WITNESS_CREATE, LINEAGE_CREATE}` — verdict/mission-shaped event types are NEVER bridged. A matching row is logged, marked processed with a rejection reason, and not emitted. Genuine verdicts are unaffected: workers emit directly through UnifiedEventRuntime (BaseWorker._emit → ping_events), never through these tables. This closes both tables for the verdict class with one check.
2. **Remove `_skipGovernance` from bridge emits** (the premise was false; make the claim checkable) AND **preserve tenant namespace**: bridge canonical_events rows with `namespace: tenant::<tenant_id>` so the canonical privacy boundary is validated instead of crossed. If governance rejects a bridged business event, that rejection is evidence the row was never governed — fail closed and visible.
3. **Chain-field requirement for repository_events**: bridge only rows with non-null CanonicalEventHash + RuntimeID + chain_root — the falsifiable definition of "kernel-produced." Rows lacking them are the dormant-writer/forgery class; reject and log.

(a) alone closes the verdict-shaped hole. (a)+(b) close the namespace hole and make the trust claim machine-checkable. (c) is the repository-side equivalent for when the kernel pipeline is reactivated.

Deliberately NOT proposed: payload schema validation per event type at the bridge (duplicates the spine; the spine never validates payloads either — that is the LP-2 boundary, separate decision), auth on the bridge poll (it reads local tables; the writer side is what needs auth).

## FALSIFICATION CONDITION

After the fix, all must hold:
1. `POST /canonical-events` with `event_type:'REPLAY_COMPLETED'`, `payload:{replay:{verified:true}}` → row stored but NOT bridged: no ping_events row of that type from source 'canonical_events', no WITNESS_CREATED, no witness-stats change; bridge stats/logs record the verdict-class rejection.
2. Manual INSERT into repository_events with `event_type:'REPLAY_COMPLETED'`, `payload:{replay:{verified:true}}`, null chain fields → same rejection (no emit).
3. Legitimate business event through `POST /canonical-events` (e.g. REVIEW_RECEIVED with full fields) still bridges into ping_events under `tenant::<tenant_id>` namespace (no liveness regression on the table's honest use).
4. Genuine pipeline still produces WITNESS_CREATED for kernel-verified replays through bridge→mission→dispatch (no liveness regression on the true path).
5. Existing suites: `gateway/test_witness_adversarial.js` (7 WEAK reject, 5 STRONG hold).
If (1) passes but (3) breaks, the boundary is wrong (too broad). If the fix only denylists without (2), namespace laundering persists.

## EVIDENCE PACKET
- Problem: EventBridge `_skipGovernance: true` trust claim (event_bridge.js:184, 283).
- Source evidence: file:line citations throughout (worktree jev-surgical @ cc6856c3bc78e0535e66f168c66dc31abee2c073).
- Key false-premise findings: (a) `EventRepository.appendEvent` performs no governance — "already governed in source table" is false for repository_events; (b) the only live canonical_events writer is an unauthenticated presence-only HTTP route — false for canonical_events too; (c) the bridge rewrites tenant rows to core::system, crossing the privacy boundary precisely where governance is skipped.
- Live reachability: canonical_events path is LIVE end-to-end (unauthenticated POST → bridge → WITNESS_CREATED); repository_events path is mechanism-ACTIVE with dormant producers. Deployment-proven status NOT established (Sep-16 drift check open — do not claim production reachability).
- Files touched: none (read-only investigation).
- Authority before/after: no change. Persistence effect: none. Security effect: verdict-shaped forgery via POST /canonical-events is a security-relevant finding; reported, not exploited — no forged rows were inserted during this investigation.
- Tests: existing suites referenced; no new tests written (investigation only).

## DRIFT-MAP PREP (secondary)

Status: PREP ONLY. No deployment access was used; nothing was run against any deployment.

Deployment target (from memory, 2026-09-13/16): the Pig-hosted `ping-gateway` Docker container (image `curious-squid-gateway:phase4-eventauth8`, built FROM the live eventauth8 image rather than the dirty worktree; previous container preserved as `ping-gateway-prev`). 2026-09-16 observation: the running gateway was configured for `POSTGRES_DB=crx_runtime` (via `ping-postgres`), NOT the `ping_runtime` DB holding 872 ping_events — spine identity for the Sep-16 deployment is an open question.

Artifacts/configs/version pins the drift map will need:
- `docker inspect ping-gateway` → image digest, created timestamp, env (POSTGRES_DB, ports, mounts).
- `docker images curious-squid-gateway` → which tag/digest is actually running vs preserved.
- Source commit the image was built FROM (build provenance; per 09-13 it was built from the live image, not a git commit — provenance may be irrecoverable; record as UNKNOWN if so).
- `gateway/generated/event_registry.json` hash + event count inside the image (worktree: 235 events).
- `ping_bridge_cursors` content + bridge stats from the deployment DB (is EventBridge running there?).
- PG schema version: table list + migration ledger state in the deployment DB (crx_runtime vs ping_runtime — which is the deployment spine?).
- Enabled workers: WorkerRuntime registration in the deployed image (canonical_workers.js eventTypes) — is the deployed witness path the same shape?
- `SELECT count(*)`, latest timestamps from ping_events in whichever DB the deployed gateway writes to.

Access required: Pig SSH (verified working path: ~/workspace/pig/pigwsl-run.sh), Docker access on the Pig, read-only Postgres access to the deployment DB. Safety constraints: `docker inspect` / `docker images` / `docker exec` read-only queries and SELECTs only; no container restart, stop, exec-writes, or schema changes; no writes to any deployment table. Confirm with Nolan before any deployment touch, even read-only — the read-only constraint is his standing rule for the drift lane.

## NEXT UNCERTAINTY

The `repository_events` dormant-writer inventory is closed for the running gateway, but the 2026-09-16 memory observation remains open: "that database's latest observed event was 2026-09-16 06:52 MDT, and the writer responsible remains unidentified" (872 ping_events in brain-postgres/ping_runtime, invisible to the current gateway). Combined with today's finding — a live bridge polling two tables with no live gateway writers — the unidentified writer class matters: if anything (migration, cron, orphaned container, old gateway `ping-gateway-prev`) writes verdict-shaped rows to either bridged table or directly to ping_events, it attests without governance. Next: Sep-16 deployment drift map (which image is running, which DB it writes, whether ping-gateway-prev or another process still writes), then the writer inventory for the deployment spine. After that: integration research (external systems as executor/adapter/index/source/transport) per the directive's fallback.
