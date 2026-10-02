# Convergence backlog — EXECUTION BACKLOG (freeze lifted 2026-09-18)

The backlog freeze is OVER (Nolan 2026-09-18). This is now an execution backlog: as implementation and falsification produce stronger evidence, reprioritize freely. A P0 may be demoted, a P2 may become P0, a proposed mechanism may be deleted. Evidence wins; do not preserve bad priorities because they appeared in an earlier prompt.

Every objective still carries two independent dimensions:

- SEVERITY: P0 / P1 / P2 / P3 = how bad it is IF true.
- EVIDENCE STATE: DECLARED / INFERRED / SOURCE_VERIFIED / REACHABILITY_VERIFIED / LIVE_VERIFIED / FALSIFIED / BLOCKED = how far the claim has climbed the proof ladder (below). A P0 / INFERRED blocks promotion only if it verifies. A P0 / FALSIFIED stays in history but blocks nothing. Severity must never be mutated as a proxy for confidence.

Operating spec (single authoritative copy): `~/workspace/forensics/execution-wbd-2026-09-19.md`. Operating loop, lanes, merge/push/commit law, epistemics, guardrails and proof packets live there, not here. This file is the objective inventory plus reference rulings. Do not duplicate spec text into this file.

## Reference rulings (kept here; spec details in the WBD)

**Epistemic rule:** what is declared? what is observable? what is demonstrably effective? what evidence promotes it? Proof ladder: DECLARED -> EXISTENCE -> IMPORTABILITY -> REACHABILITY -> EXECUTION -> PERSISTENCE -> EVIDENCE -> REPLAY -> REPRODUCIBILITY -> CERTIFICATION. EFFECTIVE classes: PHANTOM / DORMANT / LEGACY_UNREACHABLE / EFFECTIVE.

**Event Authority ruling (provisional, strongly evidenced, Nolan 2026-09-18):** EFFECTIVE/CANONICAL = UnifiedEventRuntime -> PostgreSQL -> ping_events (certified ce3f8687c5; treat as certified unless falsified). LEGACY/UNREACHABLE = EventRepository. DORMANT = IEventAuthority (zero implementations). PHANTOM/FALSIFIED = AcquisitionManager, ConstitutionalEventStore (zero executable-source hits; CERTIFICATION.md only). Provisional until runtime parity is established: the open question is SOURCE AUTHORITY vs DEPLOYED EFFECTIVE AUTHORITY, not "which authority".

## Process rule (applies to every future coding agent)

A failing test may expose an architectural defect, but it does not authorize moving constitutional ownership to make the test pass.

## P0

- **Deployment provenance.** Every running image must answer source SHA, tree hash, image digest, schema version, deployment time and target. Precedes promotion.
- **Certified → running promotion gate.** Reproducible path from certified convergence SHA to build artifact to Oracle/Pig deployment, with certification attached to that exact artifact. Never certify tree A while executing tree B.
- **Single-writer coordination.** One mutation executor per branch. Other agents audit read-only. Codex may implement a bounded requirement; the coordinator adversarially falsifies afterward. No simultaneous semantic writers on constitutional-convergence-v2.
- **Event Authority runtime parity [P0 / SOURCE_VERIFIED for the authority; INFERRED for deployed parity].** The P0 question is: is the UnifiedEventRuntime we certified actually the Event Authority executing in the deployed artifact? Prove the full chain, each assertion separately: SOURCE (code says this is the path) -> BUILD/DEPLOYMENT ARTIFACT -> BOOTSTRAP (composition: bootstrap constructs this implementation) -> REACHABILITY (an externally reachable runtime path invokes it) -> UnifiedEventRuntime.emit() -> canonicalization/identity -> INSERT ping_events -> PostgreSQL durable commit -> readback -> IDENTITY (what lands has the canonical event identity/hash) -> RESTART (same event still retrievable; persistence is durable, not merely process-visible) -> downstream consumer sees the correct event -> ARTIFACT PARITY (the deployed process contains the certified source revision). Then prove DB sequencing, replay ordering, collision behavior and restart behavior against the deployed artifact.

## Falsified premises — DISCARDED, not open questions (evidence on disk, 2026-09-18)

Per `~/workspace/forensics/event-authority-ordering-forensics-2026-09-18.md` (read-only forensic audit). These are negative institutional memory: do not reopen them merely because documentation still names them. A fresh agent that rediscovers these names in CERTIFICATION.md must check this section first.

- **AcquisitionManager: FALSIFIED.** PHANTOM: zero executable-source hits repo-wide; the only reference is in CERTIFICATION.md. There is no AcquisitionManager -> persistence seam to close because there is no AcquisitionManager.
- **ConstitutionalEventStore as persistence authority: FALSIFIED.** PHANTOM: zero executable-source hits; only CERTIFICATION.md mentions. "Likely persistence authority" was name-based only. The proven authority is UnifiedEventRuntime + PostgreSQL ping_events.
- **EventRepository: LEGACY_UNREACHABLE (verified live).** Constructed and initialized in the live bootstrap (its DDL creates repository_events), but getEventRepository() has zero external callers and all appendEvent call sites sit in files unreachable from the live bootstrap.
- **IEventAuthority: DORMANT (verified).** Interface is subscribe/unsubscribe/publish/getHistory/clearHistory over execution-lifecycle event types; zero implementations exist. Not the event persistence authority. A different concern (pub/sub lifecycle), not a competing event store.

## P0 (continued)

- **Witness contract freeze [P0 / INFERRED].** Resolve 12/13 leaves, construction version, algorithm, leaf count, replay-engine version, canonicalization/hash versions, law manifest, input-set identity and truncation semantics. P0 INTERIM INVARIANT (Nolan 2026-09-18): existing 12-leaf roots MUST NOT be destroyed, rewritten, or silently recomputed while canonical root semantics remain unresolved. This does NOT certify 12-leaf roots as the final canonical representation; evidence decides between 12-leaf canonical, 12-leaf legacy, migration, dual representation, or a different root model. If 12-leaf roots were legitimately produced historically, preserve their meaning through explicit versioning (witness_algorithm_version, witness_input_schema_version); if they were never canonical/live, do not invent an era to preserve dead behavior.
- **Witness trigger continuity [P0 / INFERRED].** Incoming investigator headline (unverified): the witness trigger arrow is disconnected at frozen HEAD by commit 91e1337f4. Do NOT accept the headline as architecture truth. Falsification protocol: H0 = 91e1337f4 did NOT disconnect the effective witness trigger; H1 = 91e1337f4 changed reachable runtime composition such that the previous witness trigger ceased to execute. Establish BEFORE (trigger producer -> trigger event -> consumer -> witness output), AT (exact changed edge), AFTER/frozen HEAD (producer -> ??? -> witness consumer), and LIVE/DEPLOYED (whether the path actually executes). A removed import or changed registration is not automatically an effective disconnection if another path took over. If the arrow is truly disconnected, the system records what happened but fails to complete a constitutional evidence stage: event creation, persistence, mission execution, worker result and replay can all succeed while witness generation silently does not.
- **Replay completeness.** A truncated/skipped replay cannot yield an ordinary verified:true. Bind the intended input set; make missing/malformed/truncated input observable and fail-closed.
- **Approval/effect identity.** Before real email/SMS/CRM/calendar actions: distinguish proposed → approved → attempted → observed → verified; retry uses the same logical effect identity. First broken arrow in a real business execution proof.

## P1

- **Context authority convergence.** One ContextPack schema, one compiler, tenant/principal/evidence binding, no direct RAG answer bypass.
- **Targeted recompilation.** Source snapshot → dependency edges → derived claim IDs → invalidation → incremental recompilation. PING's principal knowledge-system objective.
- **Authority inventory.** EventRepository (LEGACY_UNREACHABLE, verified), IEventAuthority (DORMANT, verified), AcquisitionManager and ConstitutionalEventStore (PHANTOM/FALSIFIED, do not re-investigate) are already classified. Classify the remainder — Python event writers, old WitnessAuthority variants, capability registries, old schedulers, worker runtimes — into CANONICAL, ADAPTER, DERIVED, PRESERVED_INACTIVE, LEGACY, or UNKNOWN. No deletion yet.
- **Result truth.** Separate "worker returned," "worker claims success," "execution completed," "outcome verified." A ResultEnvelope cannot make the worker the judge of its own correctness.
- **Durable orchestration.** Decide the crash/retry/lease journal before adding more autonomous workers. Harvest mechanisms, not another framework: keyed recovery, same-transaction discipline, stable idempotency keys, durable checkpoints, webhook-resumed approvals.
- **Mission Control truthfulness.** Remove or quarantine every fixture/mock/hardcoded production surface. UI claim ≤ backend proof.

## P2

- **Multi-runtime execution boundary.** JS/Python/Codex/Hermes remain executors behind one WorkOrder/Result contract. Preserve implementations; never let another runtime mint independent constitutional truth.
- **Projection discipline.** Postgres canonical; Qdrant/Neo4j/Redis rebuildable. No second source of truth.
- **Source-universe reduction.** Machine-readable inventory of strongest implementation, SHA, maturity, authority, deployment status and supersession for every major subsystem. Do not delete branches yet.
- **Five-year replay proof.** After today's correctness is settled, prove historical execution remains reconstructible across schema, worker, policy, canonicalization and hash-version changes.

## P3

- **Knowledge/entity/freshness layer.** Negative knowledge states, reversible entity resolution, evidence conflicts, freshness policies, provenance-aware knowledge promotion.

## Rogue Witness branch disposition

Do not merge, do not delete. Harvest the deterministic-root test idea, compare its preimage against the ratified Witness construction, adversarially audit its contract changes. Its compute_witness_root(claim_id, replay_success, state_snapshot) may be deterministic while still constitutionally wrong: determinism alone does not prove the correct replay boundary, policy commitment, canonicalization version, event set and engine version are bound.

## Harvest principle

Harvest mechanisms, not authority claims. Useful: golden vectors, structural replay diffing, invariant-graph fingerprints, domain lockfile fingerprints. Even historical CRX "PASSED" certifications were falsified by shipped artifacts.
