# FYD GitHub Harvest Report — 2026-09-21 (harvest lane, READ-ONLY)

## 1. Pipeline status (evidence, not narrative)

The GitHub API pipeline is **blocked**. Evidence:

- `~/workspace/skills/github/bin/gh-api.py GET /user/repos?per_page=100` → 3x `RemoteDisconnected` (egress proxy dropping the connection), then consistent `HTTP 401: {"message": "Bad credentials"}` on `/rate_limit` (credential attached correctly per the skill's surrogate flow).
- Standing record (MEMORY.md): "The GitHub 401 is a platform egress-proxy fault, not a bad token; repo creation and push blocked until fixed." Nolan's standing order: do not regenerate the credential, do not ask him to paste one.
- `browser.open` on github.com also failed this session (browser-service fetch failure).

**No GitHub code was reachable by this lane.** No repo listing, no file reads, no clone. This is a restriction (platform fault), not a transient failure; retrying the same call will not fix it.

## 2. What was actually surveyed (route-around)

Since the pipeline is blocked, this harvest ran against the next-best reachable parallel-project material, all read-only, all already on this machine:

- `~/workspace/goals/ping-agent-execution-stack/files/OPERATING_SPEC.md` — the 2026-09-19 read-only forensic pass on worktree `/home/nolan/ping`, HEAD `88c9651be`. Nine authority records with PROVEN/FALSIFIED/DORMANT/PARTIAL verdicts, exact file paths, line numbers, and evidence citations. This is the closest thing to a code survey available: every candidate below cites a forensically verified path.
- `~/workspace/goals/ping-agent-execution-stack/files/RUNTIME-DISTRIBUTION-V1-MANIFEST.md` + `runtime-manifest.json` — the allowlist/dependency-closure pattern.
- Standing memory law (tenant identity boundary, authority ownership).
- The FYD lane's own `~/workspace/fyd-lane/repo/` (graph.ts, render-model.ts, bindings tests) was inspected only to avoid duplicating what FYD already has; it is the product, not a harvest source.

**Known parallel projects (from records, not API):** `/home/nolan/projects/ping` (PING runtime + FYD SiteSpec work, branch `fyd/sitespec-generator`), the `ping-website` worktree, HPP (frozen, archaeology only). None inspectable from this lane. **Code-level harvest stays deferred until the GitHub pipeline unblocks.** What follows is pattern-level harvest from forensically verified records, which is the correct granularity for FYD's current frontier anyway.

Conventions: LICENSE is UNKNOWN for every candidate (license files were not inspected; these are Nolan's own repos). VERSION/SHA = `88c9651be` (forensic HEAD) unless noted. Nothing below was imported, copied, or modified. No commits, no pushes, no writes to any repo.

## 3. Harvest candidates (KEEP / ADAPT / REJECT)

### C1. Deterministic event identity + idempotent append — ADAPT

- **SOURCE:** `/home/nolan/ping`, `ping-runtime/events/unified_event_runtime.js` (emit(), ~349-line class), forensic HEAD `88c9651be`.
- **PURPOSE:** Canonical event acceptance: `event_id = SHA-256(JSON.stringify({eventType, source, [namespace], logical_id|payload}))`; `INSERT ... ON CONFLICT (event_id) DO NOTHING` (rowCount>0 = persisted, else deduplicated). Same logical event hashes identically across processes; re-emit is a safe no-op.
- **DEPENDENCY COST:** Low if harvested as a ~30-line function. Full UnifiedEventRuntime pulls in Postgres pool, event validator, governance, time authority — do NOT import the class; harvest the identity+dedup pattern only.
- **AUTHORITY ASSUMPTIONS:** Assumes callers supply a stable `logical_id` (timestamp-stripped) for logical identity; assumes JSON.stringify key order is stable (insertion order — deterministic only if callers construct the object identically; **flag**: key-sorting or a canonical serializer is required before FYD depends on this).
- **Identity era answers:** identity era = content-hash over logical fields (no UUIDs, no timestamps in the hash); canonical bytes = JSON.stringify of the identity object (see flag above); hash domain = SHA-256 hex; event era = `ping_events` journal; replay contract = journal read-back (note: PING's own replay does NOT consume the journal — see D1; FYD must not copy that defect).
- **FYD WRAPPER sketch:** `fydTransitionId({stage, objectId, ownerId, logicalPayload})` → sha256 hex. Use for the owner transition journal: PROPOSED → APPROVED → ACCEPTED → OBSERVED_COMPLETE transitions each get a stable, dedup-safe ID. Re-running the same approval cannot double-apply it.
- **TEST:** Same logical transition hashed in two processes → identical ID. Emit twice → second is dedup, state unchanged. Key-order permutation → must still hash identically (canonical serializer required).
- **Harvest questions:** REMOVE CODE? No (new code, but tiny). REMOVE AMBIGUITY? Yes — transition identity becomes content-derived, not incidental. IMPROVE TRUST? Yes — idempotent approvals. MAKE REGENERATION MORE CORRECT? Yes — stable transition IDs let regen prove it applied exactly the approved transitions. Others: no.
- **Verdict: ADAPT** (pattern only, with canonical-serialization fix).

### C2. Event → mission map + atomic lease claim — ADAPT

- **SOURCE:** `/home/nolan/ping`, `ping-runtime/orchestration/event_to_mission_bridge.js` (EVENT_MISSION_MAP) + `mission_runtime.js` (create: `mission_id = hash(missionType:event_id)`, `INSERT ... ON CONFLICT DO NOTHING`; claim: atomic `UPDATE ... WHERE status='created'` with 60s lease), HEAD `88c9651be`.
- **PURPOSE:** Deterministic pipeline orchestration: each canonical event maps to exactly one mission type; one mission per triggering event; crashed workers re-dispatch after lease expiry.
- **DEPENDENCY COST:** Medium. The map is cheap; the lease needs a store. FYD does not need MissionScheduler/WorkerRuntime — harvest the map + idempotent mission-ID pattern.
- **AUTHORITY ASSUMPTIONS:** Assumes the event journal is the single trigger source; assumes lease expiry is an acceptable re-dispatch semantic (at-least-once).
- **FYD WRAPPER sketch:** The FYD customer loop IS a pipeline (acquire → extract → project → ask → correct → approve → regenerate → observe → refresh). A `LOOP_STAGE_MAP` (e.g. `EVIDENCE_COMMITTED → EXTRACTION_RUN`, `OWNER_CORRECTION → REGENERATION_RUN`) with `run_id = hash(stage, triggering_transition_id)` gives idempotent, resumable loop stages. Crash mid-regen → lease expires → stage re-runs exactly once logically.
- **TEST:** Kill a stage mid-run; re-trigger → exactly one logical execution, no duplicate side effects (side effects must be idempotent or keyed by run_id).
- **Harvest questions:** REMOVE AMBIGUITY? Yes — "did the regen run?" becomes a queryable mission state, not a guess. MAKE REGENERATION MORE CORRECT? Yes — resumable stages. MAKE ACTION SAFER? Partially — bounded retries via lease. Others: no.
- **Verdict: ADAPT** (map + idempotent-run-ID + lease pattern; not the scheduler).

### C3. ADD-only evidence verification (accumulate → verify → rank) — ADAPT

- **SOURCE:** `/home/nolan/ping`, `ping-runtime/evidence/evidence_authority.js` (class ~line 21; `accumulate`, `verify` ~line 76), wired `gateway_runtime.js:527`. File header law: "this authority never mutates events, only reads."
- **PURPOSE:** Retrieval evidence verification: verify = recompute canonical hash + lineage + namespace consistency; Qdrant hits traced back to a real `ping_events` row by `source_event_id`.
- **DEPENDENCY COST:** Low-Medium. The pattern is small; the Qdrant/hybrid-search half is irrelevant to FYD now.
- **AUTHORITY ASSUMPTIONS:** Assumes a canonical object hash function exists (`verifyCanonicalObject` in `gateway/canonical_object.js`); assumes lineage fields (correlation/causation) are present on records. **Flag:** `ConstitutionalVerificationAuthority` (constitutional_verification_authority.js:68) is a second read-side verifier whose relationship to EvidenceAuthority was never traced (forensic status UNKNOWN_NONBLOCKING) — harvest ONE verifier pattern, do not import both.
- **FYD WRAPPER sketch:** This is the direct ancestor of FYD's required `verifyPresentationBinding(binding, graph)`: accumulate candidate bindings for a render, verify each by recomputing the claim's evidence hash and walking claim → evidence → observation → source, rank/drop unverifiable ones. Unsupported binding → FAIL CLOSED OR OMIT. Same shape, FYD-sized.
- **TEST:** Inject a binding whose evidence was deleted → verifier returns UNVERIFIED (never "healthy"). Inject a binding with a tampered claim → hash mismatch → FAIL CLOSED. Ask FYD answer cites only verified bindings.
- **Harvest questions:** REMOVE AMBIGUITY? Yes — binding verdicts become recomputed, not asserted. IMPROVE TRUST? Yes — this is the mechanism behind "NO CUSTOMER FACT WITHOUT A TRACEABLE BASIS." REDUCE AI USE? Yes — deterministic verification replaces LLM self-checking. MAKE REGENERATION MORE CORRECT? Yes — regen re-verifies before render. Others: no.
- **Verdict: ADAPT** — highest-value harvest for the current frontier (Ask FYD → WHY THIS → corrections).

### C4. WitnessWorker failure-honesty gate — ADAPT (pattern)

- **SOURCE:** `/home/nolan/ping`, `ping-runtime/workers/canonical_workers.js:451-510` (WitnessWorker.handle), HEAD `88c9651be`.
- **PURPOSE:** On REPLAY_COMPLETED with `verified !== true`, the worker REFUSES to attest and emits `WITNESS_REJECTED` (reason `unverified_replay:<reason>`) — it never fabricates an attestation.
- **DEPENDENCY COST:** Near zero (a conditional + a typed rejection event).
- **AUTHORITY ASSUMPTIONS:** None beyond: attestation is a derived claim that requires a verified input.
- **FYD WRAPPER sketch:** Encode Nolan's truth-model law as code: any FYD attestation (regen-complete, refresh-applied, correction-survived) checks its evidence precondition first; on missing evidence emit `ATTESTATION_REJECTED` with reason, never a success. Missing evidence NEVER becomes HEALTHY — this is that law, executable.
- **TEST:** Regen with a missing evidence ref → `ATTESTATION_REJECTED(reason=missing_evidence)`, no success claim. All preconditions met → attestation emitted.
- **Harvest questions:** IMPROVE TRUST? Yes — the single most load-bearing invariant of the product. REMOVE AMBIGUITY? Yes — success/failure/rejected are typed states. Others: no.
- **Verdict: ADAPT.**

### C5. Registry-exclusive capability resolution — ADAPT

- **SOURCE:** `/home/nolan/ping`, `ping-runtime/runtime/capability_resolver.js:1-60`, HEAD `88c9651be`. Loads `gateway/generated/capability_registry.json` at startup, **throws if missing**; indexes by name and authority; rejects duplicate names; computes registry hash.
- **PURPOSE:** "Runtime resolves capabilities exclusively from capability_registry.json" — no capability exists unless it is in the registry.
- **DEPENDENCY COST:** Low. The loader is small; the registry is a JSON file FYD authors.
- **AUTHORITY ASSUMPTIONS:** Assumes the registry file is versioned/deployed with the runtime; assumes fail-closed at boot (missing registry = no startup, not degraded startup).
- **FYD WRAPPER sketch:** FYD's future action substrate ("ONE USER INTENT → MANY PROVIDER-SPECIFIC CAPABILITY RESOLUTIONS": FYD follow, ActivityPub follow, newsletter.subscribe, etc.) needs exactly this: a `fyd-capabilities.json` registry; the action planner may only resolve capabilities present in it; unknown provider action → UNCONFIGURED/UNAVAILABLE, never attempted. This is also where the "newsletter.subscribe requires explicit consent, never inferred from follow" rule gets enforced mechanically.
- **TEST:** Request an unregistered capability → typed rejection, no attempt. Registry missing at boot → fail closed. Duplicate capability name → load-time error.
- **Harvest questions:** MAKE ACTION SAFER? Yes — this is the mechanism. REMOVE AMBIGUITY? Yes — capability existence is a file, not a guess. ENABLE ANOTHER PROJECTION LATER? Yes — new providers enter via registry, not code changes. Others: no.
- **Verdict: ADAPT.** (Not needed for the immediate loop, but it is the cheapest correct foundation for the action substrate when that seam opens.)

### C6. Causation-preserving emission (namespace / correlation / causation / confidence) — ADAPT

- **SOURCE:** `/home/nolan/ping`, `ping-runtime/workers/canonical_workers.js:1-70` (BaseWorker._emit), HEAD `88c9651be`.
- **PURPOSE:** Every downstream emission preserves `namespace`, `correlation_id`, `causation_id` (= triggering event_id); distinguishes explicit null from missing confidence via `hasOwnProperty`; tags inherited confidence with `confidence_source='inherited'`.
- **DEPENDENCY COST:** Near zero (field-preservation discipline in emit paths).
- **AUTHORITY ASSUMPTIONS:** Assumes upstream records carry the fields; assumes "explicit null ≠ missing" is meaningful to consumers (it is, for the truth model: UNKNOWN vs UNSET).
- **FYD WRAPPER sketch:** FYD's lineage requirement (visible value → object field → claim/fact → evidence → observation → source) needs exactly this: every derived claim records `causation_id` (the evidence/observation it derives from) and `confidence_source` (direct / derived / inherited / owner-asserted). WHY THIS is then a causation-chain walk, not a reconstruction.
- **TEST:** Derive a claim from evidence → claim carries `causation_id` of the evidence and `confidence_source='derived'`. Drop the evidence → WHY THIS reports the chain as broken (UNVERIFIED), not silently intact.
- **Harvest questions:** REMOVE AMBIGUITY? Yes. IMPROVE TRUST? Yes (WHY THIS). MAKE REGENERATION MORE CORRECT? Yes — regen can verify causation chains survived. Others: no.
- **Verdict: ADAPT.**

### C7. Terminal lineage records — ADAPT (fold into C6)

- **SOURCE:** `/home/nolan/ping`, `ping-runtime/workers/canonical_workers.js:513-548` (LineageWorker), HEAD `88c9651be`. `causationChain = [metadata.causation_id]`; persists as `LINEAGE_CREATED` terminal event.
- **PURPOSE:** Materialized lineage records for audit.
- **FYD WRAPPER sketch:** FYD probably does not need a separate lineage worker yet; the C6 fields make lineage derivable by query. Record the pattern; implement only if WHY THIS queries get slow.
- **Verdict: ADAPT** (deferred; pattern recorded).

### C8. Runtime allowlist manifest + dependency-closure build gate — ADAPT

- **SOURCE:** `/home/nolan/ping` distribution work, `runtime-manifest.json` (schema `ping-runtime-manifest/v1`, HEAD `88c9651be`) + `RUNTIME-DISTRIBUTION-V1-MILESTONE.md`: the build **fails** if runtime code imports anything outside the allowlist. Constitutional property: "production cannot accidentally depend on an audit artifact."
- **PURPOSE:** Deliberate distribution boundary: SOURCE / RUNTIME / EVIDENCE separation.
- **DEPENDENCY COST:** Low (a manifest file + an import-graph check in the FYD build/test).
- **FYD WRAPPER sketch:** FYD's determinism contract is `SiteSpec = f(ObjectGraph, OwnerPolicy, ViewerContext, GeneratorVersion)`. A `fyd-generator-manifest.json` allowlisting exactly those inputs, with a test that fails if the generator reads anything else (wall clock, env, network), mechanically enforces semantic determinism. This is cheaper than reviewing every generator change by hand.
- **TEST:** Generator test suite includes an import/input audit: any new undeclared input source → test failure.
- **Harvest questions:** REMOVE AMBIGUITY? Yes — generator inputs become explicit. MAKE REGENERATION MORE CORRECT? Yes. REDUCE AI USE? Indirectly — deterministic boundary reduces temptation to let the model improvise. Others: no.
- **Verdict: ADAPT.**

### C9. Tenant-config identity boundary — ADAPT (with a hard caveat)

- **SOURCE:** PING website repo (`/home/nolan/projects/ping`), `website/src/config/tenant.ping.v1.json`, via `tenant-config.ts`; a second tenant = a new JSON file, not a fork (memory records 2026-09-16/17).
- **PURPOSE:** Tenant identity (name, tagline, brand, nav, contact, provenance) as config authority; components read identity from config.
- **DEPENDENCY COST:** Trivial (a JSON file + a loader).
- **AUTHORITY ASSUMPTIONS:** Assumes identity ≠ isolation. **Caveat (from the audit): namespace/config separation is NOT a privacy boundary.** FYD must still enforce PRINCIPAL → TENANT → OBJECT → CAPABILITY before customer #2's private state is load-bearing.
- **FYD WRAPPER sketch:** FYD tenant identity as `tenant.<id>.v1.json` (business name, brand tokens, owner policy defaults, provenance). Presentation policy (PUBLIC/HIDDEN/FOLLOWERS/PING_ONLY) lives here per-object-class, separate from factual state.
- **TEST:** Second tenant = new JSON file; no code fork; first tenant's private objects unreachable from second tenant's context (enforcement test, not config test).
- **Harvest questions:** ENABLE ANOTHER PROJECTION LATER? Yes — identity travels with the tenant config. REMOVE AMBIGUITY? Partially — identity source is singular. Others: no.
- **Verdict: ADAPT** (identity only; isolation is separate future work, explicitly not claimed).

### C10. IdentityAuthority / CanonicalAuthority (constitutional canonicalization) — DEFER

- **SOURCE:** Standing law names them (IdentityAuthority = event identity owner; CanonicalAuthority / constitutional canonicalization path = canonical hash owner), but their implementations live in the Pig-side PING tree, which this lane cannot reach.
- **Identity era answers:** UNANSWERED — what identity era, what canonical bytes, what hash domain, what event era, what replay contract are all UNKNOWN until the code is inspected.
- **Verdict: DEFER** — do not harvest names without mechanisms (that would be the exact "name claims more than mechanism proves" failure). Revisit when the GitHub pipeline unblocks. Note C1's key-order flag is the concrete instance of why this matters.

## 4. Danger list — FLAG, do not harvest

These are the exact mistakes FYD must not inherit, with the forensic evidence for each:

- **D1. ReplayWorker + DeterministicReplayEngine — REJECT (fake replay).** Forensic status REPLAY PARTIAL: `_buildReplayEvents` returns ONLY the triggering in-memory event; the production journal query (`SELECT * FROM ping_events WHERE metadata->>'correlation_id'`) exists only as an unwired comment — replay never reads back the canonical journal. The kernel provider re-mints identities (`evt-ping-${i}-${hash}`) and remaps PING types to kernel `artifact_commit`/`artifact_update`: replayed envelopes are provably NOT the canonical representation. If FYD says REPLAY VERIFIED it must have read persisted canonical records and reconstructed the projection; this code does not.
- **D2. PostgresEventStore (`runtime/adapters/postgres_event_store.ts:37`) — REJECT.** Doc header self-declares "Authority: YES / Creates Truth: YES"; zero runtime instantiations (only imported by never-constructed RepositoryAuthority). Textbook name-claims-more-than-mechanism-proves.
- **D3. Event Write Authority (`gateway/event_write_authority.js`) — REJECT.** Self-titled authority with ZERO instantiations anywhere. Same failure class as D2.
- **D4. CanonicalEventEnvelope (`gateway/canonical_event_envelope.js`) — REJECT.** Legacy-ingress representation authority; identity reminting across the EventBridge into `ping_events` is a known non-blocking convergence defect. Do not inherit tenant-scoped event IDs or the bridge-remint pattern.
- **D5. EventRepository (`runtime/kernel/event_repository.js`) — REJECT as authority.** Lane B PROVEN: derived hash-chain audit/projection adapter; never generates identity/hash/sequence (all caller-supplied); multi-writer with no DB unique constraint on `(object_id, sequence)` — contention surface. Keep as historical reference only.
- **D6. IEventAuthority (`runtime/kernel/events/event-authority-interface.ts`) — REJECT.** Dormant interface; zero `implements` in the tree.
- **D7. ConstitutionalEventStore, AcquisitionManager, `batchCollectEvidence` — REJECT.** FALSIFIED phantoms; never existed in any commit. (Their absence is itself evidence: names in docs are not mechanisms.)
- **D8. Legacy Python witness paths — REJECT.** `uuid4` ids and simulated `sig_` signatures — attestation theater.
- **D9. `processed` column semantics (`ping_events.processed`) — FLAG.** Legacy "processed" is not health, not verification, not completion. FYD's status ladder (PROPOSED → APPROVED → ACCEPTED → OBSERVED_COMPLETE) must never collapse into a boolean.
- **D10. Namespace as privacy boundary — FLAG.** Audit: historical namespace isolation is not sufficient evidence of tenant isolation. FYD: config/namespace separation is identity, not isolation; enforce PRINCIPAL → TENANT → OBJECT → CAPABILITY before customer #2.
- **D11. Any `healthy` / `verified` / `certified` naming — FLAG per the truth-model law.** Missing evidence NEVER becomes HEALTHY; telemetry absent = UNKNOWN; provider unconfigured = UNAVAILABLE/UNCONFIGURED; attempted-but-unobserved = OUTCOME_UNKNOWN. C4 is the executable form of this law.

## 5. Harvest-question scorecard (per candidate, YES answers only)

| Candidate | Remove code? | Remove ambiguity? | Improve trust? | More expressive graph? | Enable projection? | Safer action? | Reduce AI? | More correct regen? |
|---|---|---|---|---|---|---|---|---|
| C1 transition identity | – | YES | YES | – | – | – | – | YES |
| C2 loop stage map | – | YES | – | – | – | partial | – | YES |
| C3 binding verifier | – | YES | YES | – | – | – | YES | YES |
| C4 failure-honesty gate | – | YES | YES | – | – | – | – | – |
| C5 capability registry | – | YES | – | – | YES | YES | – | – |
| C6 causation fields | – | YES | YES | – | – | – | – | YES |
| C7 lineage worker | – | – | – | – | – | – | – | – (deferred) |
| C8 generator manifest | – | YES | – | – | – | – | indirect | YES |
| C9 tenant config | – | partial | – | – | YES | – | – | – |

No candidate scored YES on "remove code" — these are all small additive patterns, which is correct: the harvest rule is CAN THIS REMOVE AMBIGUITY / IMPROVE TRUST / MAKE REGENERATION MORE CORRECT, and the winners score there.

## 6. The 2–3 harvests that most shorten the FYD customer loop

Ranked by distance to the current frontier (Ask FYD → WHY THIS → owner corrections → safe regeneration):

1. **C3 — the binding verifier (EvidenceAuthority pattern).** The loop's current broken step is EVIDENCE → SERVICE OBJECT EXTRACTION, and the next steps are all trust steps: Ask FYD must cite evidence, WHY THIS must walk claim → evidence → source, corrections must not render unverified claims. A `verifyPresentationBinding` built on accumulate → verify (recompute hash + lineage) → rank/drop is the mechanical core of all three. Nothing else on this list unblocks the frontier as directly.
2. **C1 — deterministic transition identity + idempotent append.** The loop's later half is proposal → approval → regeneration → source change → safe regeneration. Without stable, content-derived transition IDs, "correction survives regen" and "owner customization survives source refresh" are unprovable. This is the cheapest primitive with the most leverage on the loop's second half.
3. **C4 — the failure-honesty gate.** One conditional, near-zero cost, and it is Nolan's truth-model law made executable: no attestation without verified preconditions. It protects every PASS the loop claims from the D1/D2/D3 failure class (names claiming more than mechanisms prove).

C6 (causation fields) is the fourth: it makes WHY THIS a chain walk instead of a reconstruction, and should ride along with C3. C2, C5, C8, C9 are real but serve later seams (resumable stages, action substrate, generator determinism enforcement, multi-tenant identity) — record, do not build now.

## 7. What this lane did NOT do (constraints honored)

- No git writes, no commits, no pushes, no repo modifications of any kind.
- Did not touch `~/workspace/BACKLOG_PING.md` or `~/workspace/BACKLOG_NOLAN.md`.
- Did not touch the Pig.
- Did not start any new lane or architecture.
- Did not regenerate, rotate, or request any credential (per Nolan's standing order).
- This report is the only file written: `~/workspace/fyd-lane/harvest-report.md`.

## 8. Open items for the parent

- **GitHub pipeline:** still blocked by the documented egress-proxy fault. Code-level harvest (actual file reads, license checks, SHA pins) cannot proceed until it clears. The pattern-level harvest above is sufficient for the current frontier; nothing in sections 3–6 requires the pipeline.
- **C10 (IdentityAuthority/CanonicalAuthority):** era questions unanswered; needs code inspection when reachable.
- **LICENSE fields:** recorded UNKNOWN throughout; confirm from the repos when the pipeline unblocks (these are Nolan's own repos, but the ledger should not assert what it has not seen).
