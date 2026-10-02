# Lane B — Duplicate Authorities (2026-09-22)

"Duplicate" here means: two or more LIVE-or-plausibly-live components claiming the SAME
responsibility. Deliberate shims (PATCH_004 gateway→kernel re-exports) are NOT duplicates.

## CONFIRMED duplicates (same responsibility, ≥2 real implementations)

### D1. OllamaAdapter ×3 (+ OllamaProvider = 4th)
- `adapters/ollama_adapter.js` (144) — imported BY gateway/ollama_adapter.js (header says so)
- `gateway/ollama_adapter.js` (338) — imported by gateway/verify/11_ollama.js, runtime_io_authority.js, technology_authority.js
- `gateway/adapters/ollama_adapter.js` (495) — referenced in an adapter registry map; all three mutually different code (597/733 diff lines)
- `ping-runtime/orchestration/execution/ollama_provider.js` — 4th module, the one actually wired into ExecutionEngine (live path)
Danger: model-provider behavior can diverge 4 ways. Reconcile to one (ollama_provider is live).

### D2. WorkerRegistry ×3 (naming collision — WORST offender)
- `gateway/worker_registry.js` (334) — event-sourced worker lifecycle registry; imported by gateway/background_workers.js
- `ping-runtime/orchestration/worker_registry.js` (413) — LLM PERSONA catalog (WORKERS = {authority_auditor: {persona, role, ...}}); ZERO code importers
- `runtime/kernel/workers/worker-registry.ts` (74) — clean Map-based registry + capability index; ZERO TS importers
Three different responsibilities sharing one name; two are orphaned. (3) is the cleanest design.

### D3. ArtifactAuthority ×2
- `ping-runtime/orchestration/execution/artifact_authorities.js` (329) — LIVE (wired in engine.js), ctor(artifactStore, eventQueue); also home of all 5 artifact classes
- `gateway/artifact_authority.js` (135) — pure-contract variant, ctor(dependencies); ZERO importers → orphaned/superseded

### D4. replay_worker.py ×2 / witness_worker.py ×2
- `workers/replay_worker.py` vs root `replay_worker.py` (244 diff lines; same CLAIM_GENERATED→REPLAY_EXECUTED responsibility); workers/ version is wired in kernel/event_dispatcher.py, root version has no importers
- `workers/witness_worker.py` vs root `witness_worker.py` (247 diff lines); same story
Root copies look legacy. (Also `ping-runtime/agents/replay_worker.js` (27-line thin adapter) vs ReplayWorker in `canonical_workers.js` (760) — JS-side overlap, both reachable; less dangerous.)

### D5. PatchAuthority v1 vs v2
- `gateway/patch_authority.js` (626) vs `gateway/patch_authority_v2.js` (781) — totally different code; NEITHER has importers. Versioned duplicate, both dormant.

### D6. Qdrant clients ×2–3
- `adapters/qdrant_adapter.js` vs `ping-runtime/search/qdrant_adapter.js` (REST, no dep) vs `gateway/qdrant_client.js` (referenced as the "proven pattern"). Importers exist for the search one (embedding_service, technology_authority, gateway_runtime).

### D7 (unverified, flagged). mission_authority vs mission_authority_v2
- Both exist in gateway/; importer check not done. Same v1/v2 smell as PatchAuthority.

## NOT duplicates (verified clean convergence)

- **IdentityAuthority**: `ping-runtime/authorities/identity_authority.js` is an explicit PATCH_004 SHIM
  re-exporting `runtime/kernel/authorities/identity_authority.js` (67 requires hit the shim — by design).
  The Python (`runtime/authorities/identity_authority.py`, live in py lane) and TS
  (`runtime/constitutional/src/identity-authority.ts`, newest, unwired) are cross-language
  parallels, not accidental dupes — but the three live impls (JS kernel, Python, TS-newest)
  DO need a convergence decision eventually.
- **VerificationAuthority**: gateway file is a PATCH_004 shim subclassing the kernel impl. Clean.

## Cross-language parallels (not accidental, but convergence-relevant)
JS kernel impl (live) / Python impl (live in py lane) / TS newest-layer impl (unwired):
IdentityAuthority, and the worker pairs (ReplayWorker/WitnessWorker in canonical_workers.js
vs workers/*.py). Each serves its runtime today; the TS layer (Patch 7B) is the stated future.
