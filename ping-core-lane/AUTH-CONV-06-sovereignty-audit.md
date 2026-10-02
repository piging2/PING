# AUTH-CONV-06: Sovereignty audit — declared authorities vs enforced path

Branch audited: `jev/verdict-authority-hardening` (the promoted candidate; contains the
promoted commit fffe99f7a4174cc694c65c9ac1b0b00b4332bf2f).
Enforced path: `gateway/` (Dockerfile `CMD node server.js`) + `ping-runtime/` (required by
gateway). `runtime/` Python tree is NOT on the gateway's Node enforced path.
Lane branch: `lane/ping-core-perfection-jev`. Commit: `0c798f488`.

## Enforced-path wiring (gateway/bootstrap/gateway_runtime.js)

- :434 `new UnifiedEventRuntime({...})` from `ping-runtime/events/unified_event_runtime`
- :462 EventBridge polls `repository_events` + `canonical_events` → UER
- :477 `new MissionRuntime({pool, eventRuntime})` from `ping-runtime/orchestration/mission_runtime`
- :566 `new MissionScheduler({missionRuntime, workerRuntime, eventRuntime, ...})`

## Findings

### 1. UnifiedEventRuntime = event acceptance — CONFIRMED
Single production `INSERT INTO ping_events` at `ping-runtime/events/unified_event_runtime.js:246`
with `ON CONFLICT (event_id) DO NOTHING` + semantic-collision fail-closed check. Test-harness
mocks (`gateway/test_*.js`) only assert on the INSERT string; no production bypass found.

### 2. ping_events = constitutional journal — CONFIRMED (single writer)
Only UER writes. Append-only trigger ownership recorded as decided (db-trigger-owner, design B);
trigger presence on the live DB not re-verified in this pass.

### 3. IdentityAuthority = event identity owner — WAS MISMATCH, FIXED (0c798f488)
UER minted `event_id` inline (`crypto.createHash('sha256')...`, unified_event_runtime.js:168)
instead of using the declared authority. Fix: `IdentityAuthority.generateSpineEventId()`
added to `runtime/kernel/authorities/identity_authority.js`; UER delegates to it.
Byte scheme is LOAD-BEARING and unchanged (idempotent retries, ON CONFLICT dedup,
historical rows depend on exact bytes); proven by 4 golden vectors captured pre-change
plus a UER.emit path test (`ping-runtime/events/uer-spine-identity.test.js`, 4/4 PASS,
`node --test`).
Zero `crypto.randomUUID()` invocations in production code on the enforced path (audit
scanners in gateway/replay_kernel_audit.js, constitutional_blockers.js,
verify/negative_path_verification.js exist and report this vector clean).
LABELED: `IdentityAuthority.generateEventId(eventType, aggregateId)` (evt_-prefixed,
16-hex) is still used by `gateway/automatic_mission_generator.js:579,604,633` and
`gateway/continuous_replay_authority.js:568,597,625,656,684,709,738` for payload-level
`event_id` fields — NOT journal IDs (UER recomputes the journal ID). Scheme fragmentation
labeled for AUTH-CONV-02/04/05, not a journal-integrity issue.

### 4. CanonicalAuthority = canonical hash owner — PARTIAL, sharpened (0c798f488)
UER's collision check used an ad-hoc inline `canon` (`JSON.stringify(o, Object.keys(o).sort())`).
The array replacer acts as a top-level key whitelist, so nested objects serialized as `{}`:
nested semantic differences were INVISIBLE and silently treated as duplicates instead of
failing closed. Now uses `CanonicalBytes.serializeString` (deep-canonical, the single
serializer). Behavior change is fail-closed-strict: previously-silent nested differences
now correctly trigger the "Event ID collision" error. Proven by old-vs-new contrast test.
LABELED: UER's event-ID hash remains sha256-of-JSON (not CanonicalAuthority.hashBytes);
kept byte-identical deliberately, now owned by IdentityAuthority.generateSpineEventId.
Parallel identity-ish implementations unlabeled here, flagged for AUTH-CONV-02/04/05:
`runtime/kernel/authorities/deterministic_id_authority.js`,
`runtime/kernel/authorities/replay_identity_authority.js`,
`gateway/runtime_identity_authority.js`.

### 5. MissionRuntime = mission authority — PRESENT, partially verified
`ping-runtime/orchestration/mission_runtime.js` wired at gateway_runtime.js:477.
LABELED (for MC-12/MC-13): `mission_runtime.js:79` writes to table `ping_missions`
while `gateway/repositories/mission_repository.js:21` writes to table `missions`
(only referenced via `gateway/mission_repository_port.js`). Two mission tables =
possible competing mission schemes; sole-writer not established this pass.

### 6. MissionScheduler/WorkerRuntime = execution routing — PRESENT
Wired at gateway_runtime.js:566 (`new MissionScheduler({missionRuntime, workerRuntime,
eventRuntime, deadLetterAuthority, ...})`). No bypass probed this pass.

### 7. ProjectionAuthority owns Qdrant access — MISMATCH, LABELED (not fixed)
No `projection_authority.js` exists in `gateway/`. Direct `new QdrantClient()` in at
least 9 modules: `gateway/conversation_memory.js:17`, `gateway/document_ingestion.js:20`,
`gateway/knowledge_retrieval.js:16`, `gateway/constitutional_runtime.js:51`,
`gateway/constitutional_acquisition_runner.js`, `gateway/code_generator.js`,
`gateway/constitutional_ollama_integration.js`, `gateway/end_to_end_verifier.js`,
`gateway/bootstrap/gateway_runtime.js` (all via the `gateway/qdrant_client.js` fetch wrapper).
`runtime/authorities/projection_authority.py` exists but is Python, not on the gateway's
Node enforced path. Fix options: introduce a single Qdrant access authority on the
enforced path, or scope the declaration honestly. Left for a dedicated item (bigger
refactor than one lane item).

### 8. EmbeddingAuthority owns embedding execution — MISMATCH, LABELED (not fixed)
`gateway/embedding_authority.js` is explicitly "pure authority that returns contracts.
No infrastructure calls. No side effects." `gateway/memory_embedding_authority.js`
self-describes as "The fake implementation here is temporary". Actual execution lives
in `gateway/embedding_provider.js` / `ping-runtime/ai/inference_adapter`. The declared
authority does not own the capability it names. Fix options: wire real execution
through it, or rename/scope honestly. Left for a dedicated item.

## Falsification record
- `node --test ping-runtime/events/uer-spine-identity.test.js` → 4/4 PASS on the Pig
  (Node v22.23.2), post-commit state.
- `node --check` clean on both modified files.
- Secret scan of the diff: clean. (`gateway/qdrant_client.js` reads QDRANT_API_KEY from env;
  earlier `<redacted>` was bridge redaction, not source.)
- No other test files reference the changed modules; no suite regressions possible from
  the repo's ad-hoc test layout.
