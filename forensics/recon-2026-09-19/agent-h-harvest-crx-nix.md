# Recon Agent H: Public Ecosystem Harvest + CRX Archaeology + Nix-Inspired Audit + Economic Architecture

**Date:** 2026-09-18/19 (read-only recon; no mutation performed)
**Sources:** local historical repo `/tmp/crx-runtime` @ 6c4b531 (single-commit clone); live PING tree on the Pig via `pigwsl-run.sh` (read-only: `/home/nolan/ping`, worktrees); public web (official docs preferred, fetched text only, no browser actions).
**Evidence hierarchy used:** LIVE RUNTIME TRACE > CURRENT EXECUTABLE CODE > INTEGRATION TEST > HISTORICAL CODE > DOCUMENTATION > COMMENTS > NAMING > INTENT.
**Read-only law compliance:** no edits, commits, installs, DB writes, restarts, secret reads, or external actions. Only writable artifact is this file. One compiled JS test was executed locally (pure computation over local corpus JSON, no shared state) and it falsified a CRX certification claim; details in section A.

**Maturity labels used below:** PROVEN_RUNTIME, PROVEN_DURABLE, PROVEN_RESTART, PROVEN_INTEGRATION, PROVEN_UNIT, WIRED_UNPROVEN, BUILT_NOT_LIVE, EXPERIMENTAL, DOCUMENTED_ONLY, COORDINATOR_CLAIMED, PRESERVED_INACTIVE, LEGACY, FALSIFIED, UNKNOWN.

---

## A. CRX-RUNTIME ARCHAEOLOGY

### A.1 What the CRX checkout actually contains

`/tmp/crx-runtime` @ 6c4b531 ("Freeze constitutional object model with 7 definitions") is a single-commit tree whose durable content is:

- `CRX_CONSTITUTION.md` — 8 axioms, root/derived fact taxonomy, 5 root authorities (Identity, Lineage, Event Recording, Replay, Policy), 1 derived (State), 2 eliminated (Witness, Canonicalization), minimum replay set, elimination test.
- `constitutional/WITNESS_PROTOCOL.md`, `constitutional/REPLAY_BOUNDARY.md` — MAY/MUST-NOT boundary lists, witness flow spec.
- `certification/` — frozen golden vectors (`vectors/replay_vectors_manifest.json`, `hashes/corpus_sha256.txt`, `hashes/witness_roots.txt`), corpus JSON (`tests/corpus/*.json`, `tests/replay/corpus/*.json`), certification tests (`tests/certification/*.test.ts`), ~17 certification reports.
- `constitutional-integration-lab/extracted/js_txt/*.js` — the strongest actual code in the repo: `canonical_fingerprint_service.js` (479 LOC, fingerprint.schema.3.0), `formal_invariant_graph_verifier.js` (262 LOC), `deterministic_replay_harness.js` (296 LOC), 15+ `merkle_anchor_*` modules (~3,800 LOC), `domain_lockfile_fingerprint_guard.js`.
- `constitutional-integration-lab/extracted/runtime/` — thin stubs (`identity_engine.ts` 15 LOC, `canonical_engine.ts` 18 LOC, `dag_validator.ts` 13 LOC).
- `dist/runtime/replay/*.js` — 15 compiled JS files (witness_authority, merkle_tree, canonical_json, deterministic_replay_engine, replay_verification, etc.). **The TypeScript sources they were compiled from are absent from this checkout** (`runtime/` is an empty directory; `git log -- runtime/replay/...` returns nothing; single-commit clone so history cannot answer whether they ever existed).

### A.2 Constitution comparison: CRX vs current PING

| CRX Constitution (2026-06-07, frozen) | Current PING (2026-09-18, live) | Assessment |
|---|---|---|
| Axiom 1: Identity determinism (pure function of content + identity law) | IdentityAuthority.generateId -> CanonicalBytes.serialize -> CanonicalAuthority.hashBytes; F7 requirements (injective encoding over admitted value domain, era-marked old rows) | CONVERGED. PING's identity pipeline is the CRX axiom made executable. CRX's stricter schema details (NFC, type rejection, domain separation) are recoverable refinements. |
| Axiom 2: Lineage acyclicity (DAG, no self-ancestry) | Lineage edges as root facts; lineage authority ownership | CONVERGED in principle. CRX's `dag_validator.ts` stub was a documented Axiom-2 violation; check whether PING's `graph_validator.ts` does transitive DFS before trusting it (WIRED_UNPROVEN until traced). |
| Axiom 3: Event append-only sovereignty | UnifiedEventRuntime = SOLE canonical event authority; Postgres `ping_events` canonical truth; EventRepository as derived projection adapter | CONVERGED and stricter than CRX: CRX never settled a single runtime; PING did (2026-09-18 rulings). |
| Axiom 4: Replay determinism at a bounded time | Replay reader work in progress (P0: ordering + replay certification); replay-transcript.ts, deterministic_replay_engine.ts IMPLEMENTED per intents/replay/authority.md | PARTIAL. CRX claimed certification (falsified below); PING honestly treats this as open P0 work. |
| Axiom 5: Policy primacy on mutation | Policy authority; approval gate (test exposing restart persistence failure 88c9651be) | PING's live approval work is the CRX axiom operationalized. |
| Axiom 6: State is derived, not authoritative | Postgres = canonical truth; projections rebuildable; "State never overrides substrate" | CONVERGED. |
| Axiom 7: Separation of recording and reconstruction | Explicit: EventRecording vs Replay authorities; LegacyIngressAdapter validate/normalize/authenticate/namespace/canonicalize before acceptance | CONVERGED; PING's adapter makes the separation a runtime gate, not just a document. |
| Axiom 8: Witness is verification, not origin | Witness = derived replay attestation; witness_root = proof-content identity; WITNESS_CREATE bypass removed (91e1337f4) | CONVERGED on semantics. DIVERGED on authority: CRX's elimination test *eliminated Witness as an independent authority* (absorbed by Identity + Replay); PING retains WitnessAuthority as a named owner (witness_authority.ts IMPLEMENTED; witness intent manifest). PING's 2026-09-18 constitutional decisions supersede the CRX elimination table; do not carry the CRX authority inventory forward as binding. |
| Minimum replay set (9 elements) | PING's minimum replay set exists as concept (canonical events -> authoritative sequence -> bounded replay reader) | CONVERGED in intent; PING's set is narrower (event log + sequence) and the ordering-scope decision is still open. CRX's list (claims, policy decisions, witnesses) is worth re-checking when PING's replay reader matures, but it is a checklist, not law. |
| Canonicalization merged into Identity (not an independent authority) | tenant.ping.v1.json identity authority; serializer envelope coverage open item | CONVERGED. CRX's "normalization is a phase of identity assignment" matches PING's CanonicalBytes.serialize placement. |

The key known clue holds up: CRX's "Witness is verification, not origin. Witness is a derived fact. Witness does not require an independent authority. Replay owns verification. Identity owns identity proof generation." PING's live code implements exactly this flow (witness_authority.ts header comment: "Witness Flow: event stream -> canonicalization -> fingerprint -> invariant verification -> replay state -> witness root", lifted nearly verbatim from `constitutional/WITNESS_PROTOCOL.md`). The recovery happened; what did not carry over were the regression anchors (see A.4).

### A.3 Mechanisms worth recovering (specific: file + mechanism + why)

1. **`constitutional-integration-lab/extracted/js_txt/canonical_fingerprint_service.js` (fingerprint.schema.3.0) — frozen domain registry + strict canonicalization.** Mechanism: `FINGERPRINT_DOMAINS` is a frozen 19-domain registry (SNAPSHOT, ARTIFACT, ANCHOR, EXECUTION_RECORD, ...); `fingerprintWithDomain(domain, value)` builds a length-prefixed preimage over canonical bytes with the domain as a prefix, SHA-256; `canonicalize()` enforces UTF-8 NFC normalization, rejects BigInt/Symbol/Function/undefined, preserves negative zero, rejects sparse arrays and circular references, versions the schema. Why: PING's identity pipeline exists, but CRX's schema is strictly stronger than PING's current serializer on the exact F7 concerns (injective encoding over an admitted value domain, explicit rejection of inadmissible values). Harvest as the template for the F7 "admitted value domain" rules; do not patch PING's serializer blindly (per the 2026-09-18 F7 ruling), use this as the candidate rule set with a test vector per rule.
2. **`constitutional-integration-lab/extracted/js_txt/formal_invariant_graph_verifier.js` — invariant topology binding.** Mechanism: frozen `INVARIANT_NODES` + `REQUIRED_EDGES` (constitutional ordering) + forbidden-edge list; DFS cycle detection; the graph's fingerprint is computed and bound into the replay proof, so a skipped pipeline stage invalidates the witness. Why: PING has `invariant_runner.ts` and `replay_invariants.ts`; binding the *required topology's fingerprint* into the witness root is the mechanism that would have caught a "stage silently skipped" class of drift. Directly relevant to the 12-leaf vs 13-leaf witness drift open item: the leaf count is a topology signal.
3. **`constitutional-integration-lab/extracted/js_txt/deterministic_replay_harness.js` (replay.3.0) — double-execution + structural diff.** Mechanism: run the replay twice, deep-compare structurally, emit a structural diff naming the diverged field; immutable proof boundary; registry fingerprint binding; scheduler fingerprint stability. Why: this is the cheapest honest replay-determinism proof PING's P0 work needs (run twice, diff, name the field). It is also the mechanism behind the standing rule "every cycle must reduce uncertainty": a structural diff is falsifiable evidence, not a pass/fail boolean.
4. **`constitutional-integration-lab/extracted/js_txt/merkle_anchor_chain_validator.js` + `merkle_anchor_replay_verifier.js` — authority-negative advisory validation.** Mechanism: modules declare in their headers "NEVER mutates anchors, NEVER assigns correctness, NEVER blocks execution, NEVER injects authority"; `validateMerkleAnchorChain` checks chronological ordering, parent->child linkage continuity, root-hash forks, and *replay within the same chain* (same merkle root appearing twice); `detectAnchorReplay(previousEvidence, currentEvidence)` flags identical roots as replay signals. Why: two mechanisms in one. (a) The "canonical, advisory, replay-safe, authority-negative" contract is the pattern PING's audit/diagnostic workers should copy. (b) Same-chain replay detection is the cheap detector for the witness-drift class (two different roots for the same content, or one root replayed where a new one was expected).
5. **`constitutional-integration-lab/extracted/js_txt/domain_lockfile_fingerprint_guard.js` — lockfile with embedded fingerprint.** Mechanism: a lockfile carries `lockfile_fingerprint` = domain-fingerprinted hash of the locked domain set; CI recomputes and fails closed on mismatch. Why: template for PING's intent/registry versioning and for the Nix-inspired "declared input set" (section C): every durable registry gets a self-verifying fingerprint, checked mechanically, not by convention.
6. **`dist/runtime/replay/deterministic_failure.js` (compiled; source absent) — typed deterministic failure factory.** Mechanism: failures are constructed as typed values (`CANONICALIZATION_ERROR` with reason payload) via `DeterministicFailureFactory`, not thrown as ad-hoc errors. Why: matches PING's principle "failures must have typed, deterministic semantics" (failure taxonomy). Recover the factory pattern when PING's failure taxonomy is implemented; do not treat the compiled file as the implementation (no source).
7. **Frozen golden corpus (`tests/corpus/*.json`, `certification/vectors/replay_vectors_manifest.json`, `certification/hashes/corpus_sha256.txt`, `certification/hashes/witness_roots.txt`) — content-addressed regression anchors.** Mechanism: five replay vectors (minimal, multi_event, lineage, violation, unicode) with pinned canonical bytes (base64), fingerprint, witness root, leaf count, tree height, and corpus file hashes. Why: this is the *idea* PING most needs and did not inherit — PING implements the witness flow but has no pinned golden vectors tying its witness implementation to known-good roots. The 12-leaf vs 13-leaf drift is exactly the failure this mechanism prevents. Recover the pattern (golden vectors + manifest + CI check), regenerate the vectors from PING's *current* implementation after the depth/F7 semantics settle, then freeze.

### A.4 Outdated CRX claims that must NOT be carried forward

1. **The FCA-10.5/11/12 "PASSED" certifications are non-reproducible from this artifact set (FALSIFIED, live).** `certification/reports/certification_report.md` claims "All determinism guarantees, authority boundaries, and replay equivalence requirements have been verified and frozen," citing `runtime/replay/` as the authoritative implementation with "zero duplicate implementations." In this checkout `runtime/` is an empty directory and the TS sources are absent. Worse, the *compiled* artifacts that do exist are internally inconsistent: running the shipped `dist/tests/certification/replay-unicode.test.js` throws `TypeError: canonical_json_1.CanonicalJson.stringify is not a function` (the compiled `CanonicalJson` exposes `canonicalize`, not `stringify`). The certification suite cannot pass from this artifact set. Historical CRX certification is therefore not evidence of anything about the CRX runtime, let alone the PING runtime. Cite the corpus vectors as data; never cite the verdicts.
2. **The internal contradiction between `reports/continuity_breaks.md` and `certification/reports/certification_report.md` (same date, 2026-06-07).** The former documents that replay was never migrated, witness was never migrated, the identity engine violates Axiom 1 (no Unicode normalization), and the DAG validator violates Axiom 2 (no transitive traversal). The latter certifies all of it PASSED. Both cannot be true. The continuity-breaks report is the honest one (it names files, line numbers, and LOC counts). Lesson for PING: the 2026-09-18 rules (pre-commit manifest, "the agent checked it is insufficient," cross-agent verification) exist precisely because this failure mode is real and was lived.
3. **The authority elimination table is CRX law, not PING law.** CRX's Phase 6 eliminates Witness and Canonicalization as authorities and demotes State. PING's 2026-09-18 constitutional decisions (UnifiedEventRuntime sole event authority; EventRepository as projection adapter; witness semantics under active convergence) supersede it. Do not import the CRX authority inventory as a checklist PING must conform to.
4. **REPLAY_BOUNDARY.md's MUST-NOT list was never enforced (self-admitted: all four enforcement mechanisms "NOT_IMPLEMENTED").** The one documented violation (env-var dependence in `db.ts`) was the honest part. Do not copy the boundary list as if it were a proven control; if PING wants replay purity, enforce it via import restrictions + CI (the mechanisms CRX named but never built).
5. **"Zero dependencies / pure infrastructure-independent" framing around the replay kernel.** The kernel imports Node `crypto` and the clean-room procedure requires `npx tsc`; the real clean-room blocker in this checkout is missing sources, not dependencies. PING should frame reproducibility as "reproducible from declared inputs" (section C), not "zero dependencies."

### A.5 What PING demonstrably recovered from CRX (live trace, not documentation)

- The witness flow (event stream -> canonicalization -> fingerprint -> lineage/invariant verification -> replay state -> witness root) is implemented in PING's `runtime/kernel/replay/witness_authority.ts` with the same step structure and a domain-separated Merkle tree (`merkle_tree.ts`: "Hash domain constants for constitutional governance").
- The file layout of PING's `runtime/kernel/replay/` (deterministic_replay_engine, witness_authority, merkle_tree, canonical_json, replay_event_stream, replay_verification, canonical_event_envelope, canonical_hash_authority) is the CRX `runtime/replay/` layout the CRX certification *described* but the CRX checkout *lost*.
- The duplicate-authority disease CRX's reports tracked is still live in PING: `intents/witness/intent-manifest.yaml` evidence notes a "CRITICAL: Complete duplicate subsystem in runtime/kernel/witness/ (WitnessEngine, WitnessBuilder, verification-engine, replay-verifier, lineage-verifier, cryptographic-authorities)" with status `fragmented` and action to eliminate it. The CRX `AUTHORITY_REUSE_MATRIX.md` / `DUPLICATE_AUTHORITY_GRAPH.md` discipline (classify each implementation as CANONICAL/LEGACY_INGRESS/COMPATIBILITY/PRESERVED_INACTIVE/FORENSIC/DERIVED/UNKNOWN before touching it) is the correct tool; it matches Nolan's 2026-09-18 "never delete merely because authority is settled; classify first" ruling.

---

## B. ECOSYSTEM HARVEST

Format per system: PROBLEM SOLVED | BEST MECHANISM | PING ANALOG | VERDICT | WHY. Verdicts: HARVEST (take the mechanism), ADOPT (use the system/pattern wholesale, gated), REJECT (do not import). Sources were official docs / current spec text fetched 2026-09-18; maturity labels are mine.

### Durable execution / orchestration

**Temporal.** Long-running workflows that survive crashes and deploys. Best mechanism: event-sourced workflow history + deterministic replay of workflow code against that history, with the hard workflow/activity purity split (no clocks, no random, no direct IO in workflow code; all side effects in activities). PING analog: `runtime/temporal` durable mission workflow + UnifiedEventRuntime. HARVEST the purity split and the history-as-source-of-truth replay contract (PING's P0 ordering/replay work needs exactly this contract); REJECT the external cluster architecture (PING is Postgres-first; do not add a Temporal cluster).

**Restate.** Durable execution for HTTP services without operating a cluster. Best mechanism: journaled durable handlers keyed by idempotency key; recovery = replay the journal for that key; virtual-object state co-located with the handler. HARVEST the keyed-journal recovery pattern (invocation id + journal replay) for PING worker recovery semantics; REJECT its journal storage (Postgres already owns that).

**DBOS.** (Stronger system, not on the list.) Durable execution with zero new infrastructure. Best mechanism: the workflow log commits in the *same Postgres transaction* as the business writes, so execution state and business state can never diverge; recovery reads the step output back and skips the step. PING analog: canonical Postgres event store. HARVEST the same-transaction commit discipline for PING's event acceptance path (canonical event + its effects commit atomically); this is the concrete mechanism behind O3 durability testing. DBOS Inc's framing ("durable execution is to application logic what transactions were to data") is the right ambition statement.

**Inngest.** Durable serverless background functions. Best mechanism: `step.run()` memoization addressed by a hash of the step name; the function body is re-invoked and completed steps are injected from saved results. HARVEST step-name-hash-addressed memoization as the cheap idempotency mechanism for PING agent tool loops (a tool call keyed by (mission, step-name-hash) is never executed twice).

**Hatchet.** Distributed task queue + durable workflows. Best mechanism: fairness queues / rate limiting / sticky assignment for multi-tenant task distribution. PING analog: engagement-pass crons with caps. HARVEST only the fair-queue/limiter semantics as the design for engagement and worker scheduling (per-pass caps, per-account budgets); REJECT as a workflow engine (overlaps Temporal/DBOS space PING already covers).

**Dagster.** Data pipelines modeled as assets. Best mechanism: software-defined assets + a first-class asset lineage graph; declarative automation and freshness policies ("recompute this asset when upstream changes or when it goes stale"). HARVEST the asset-centric lineage model as the shape of PING's knowledge compilation: a knowledge claim is an asset, its sources are upstream assets, freshness is a policy. Directly feeds the missing link in section D.

**Prefect.** Python-native orchestration. Best mechanism: event-driven automations with a small trigger grammar (`expect: [event]`, posture reactive/proactive, threshold/within) that fire deployments; events are first-class and emittable from anywhere (`emit_event`). HARVEST the trigger grammar for PING's event-driven hooks and the O3 mission scheduler; REJECT the Python-centric execution model.

**Argo Workflows.** Kubernetes-native workflow execution. Best mechanism: artifact passing between steps via named, content-addressed artifact references (volumes/S3). REJECT as an engine (PING is not K8s-native); HARVEST the artifact-passing convention: steps exchange content URIs, never inline blobs (PING's event payloads should reference artifact identities the same way).

**Kestra.** Declarative orchestration. Best mechanism: orchestration *as data* — YAML flows that are schema-validated before execution, LLM-generable, and round-tripped from UI edits back into the same YAML. HARVEST for PING's intent manifests and research briefs: one file renders the prompt and drives the validator so they cannot drift (this is already Nolan's research-contract rule; Kestra is the industry proof that the pattern scales). Their "agent-skills validate every task type against a live schema before generating output" is the exact mechanism for PING's brief/validator pairing.

**Dapr.** (Stronger system, not on the list.) Portable microservice building blocks. Best mechanism: virtual actors with turn-based single-threaded execution (one logical thread per entity, reentrancy rules explicit). HARVEST the turn-based concurrency model for PING workers: one worker owns one entity's turn, no interleaving, which makes worker behavior replayable. REJECT the sidecar deployment complexity.

### Agent frameworks

**LangGraph.** Stateful multi-step agents with cycles. Best mechanism: StateGraph + checkpointer that persists full state after every node, `thread_id`-scoped resume, `interrupt_before/after` as named graph positions, and time travel over state history. PING analog: missions + event sourcing. HARVEST: (1) checkpoint-after-node with thread-scoped resume as the mission durability contract; (2) interrupts as first-class node types, so PING's approval gates are graph positions with evidence, not bolted-on pauses. Note the caution from the field: background/async checkpointing can lose the newest checkpoint on hard crash; sync the checkpoint before acknowledging the step (same lesson as DBOS's same-transaction commit).

**OpenAI Agents SDK.** Lightweight multi-agent orchestration. Best mechanism: handoffs (explicit delegation between specialized agents as typed events) + guardrails (input/output validators that trip a wire on violation). HARVEST both: model PING worker delegation as handoff events in the canonical log (the deferred RESEARCH_TASK_ASSIGNED event is this shape), and put guardrail validators on worker input/output boundaries with tripwire semantics.

**Pydantic AI.** Type-safe agent development. Best mechanism: dependency injection of a typed `RunContext` into agent runs + Pydantic-validated structured outputs. HARVEST the DI pattern: PING workers receive a typed capability context (which authorities they may call) instead of ambient imports; this makes the authority-boundary story executable rather than documentary. Structured-output validation at the type level is the input side of the guardrail pattern above.

**HumanLayer.** Human approval/contact as tools. Best mechanism: the 12-factor-agents contract, specifically factor 6 (launch/pause/resume with simple APIs) and factor 7 (contact humans with tools via async channels + webhooks, never by holding a process open). PING analog: the approval gate work (88c9651be). HARVEST the webhook-resume pattern: requesting approval ends the worker's turn and returns; the human response arrives as an event that resumes the mission. This is the durable shape of "human in control."

### Coding agents

**OpenHands.** Autonomous software-dev agents. Best mechanism: the typed event stream as the agent's memory substrate (every observation and action is an event). HARVEST the principle (PING already lives it: events are the substrate); REJECT the heavyweight Docker-per-task runtime.

**Goose.** Local-first agent runner. Best mechanism: recipes — declarative, shareable agent runbooks with pinned tool allowlists. HARVEST for PING's research prompts: the four rotating Meta AI briefs should become recipes (declared inputs, declared tool/capability allowlist, expected output schema), which is also the reproducibility story of section C applied to research.

**OpenCode.** Terminal-native coding agent. Best mechanism: provider-agnostic model interface. Minimal harvest; PING's model access should stay behind one interface, but this is already the LiteLLM-shaped idea below. REJECT as an adoption target.

### Protocols and infrastructure

**MCP (Model Context Protocol, spec rev 2026-07-28).** Standard tool/data connection for agents. Best mechanism: the tool contract (namespaced names, human-readable title/description, `inputSchema`/`outputSchema` in JSON Schema, structured output) over JSON-RPC, now with a stateless core (per-request protocol version in `_meta`, `server/discover`, no session handshake). HARVEST the tool contract as the shape of PING's capability declarations, and the deprecation discipline (12-month removal clock, dual-era clients, never adopt deprecated primitives). REJECT: sampling/roots/logging (deprecated by SEP-2577), server-held subscriptions (wrong cost model for PING).

**A2A (Agent-to-Agent, Linux Foundation).** (Stronger system, not on the list.) Agent discovery and delegation. Best mechanism: the Agent Card + AgentSkill discovery contract. HARVEST the discovery contract shape: PING workers publish machine-readable capability cards; delegation decisions read cards, not folklore.

**LiteLLM.** Multi-provider LLM gateway. Best mechanism: unified proxy with fallbacks, load balancing, and per-key spend tracking. VERDICT: ADOPT the pattern, gate the system. Harvest fallbacks + spend tracking behind PING's single model interface; do not run the full proxy until call volume justifies the operational cost (evidence-gated adoption).

**OpenTelemetry.** Vendor-neutral observability. Best mechanism: the GenAI semantic conventions (`gen_ai.*` spans) + OTLP export, extended by OpenInference. HARVEST the conventions, not necessarily the SDK everywhere: PING's agent/tool spans should emit GenAI-conformant attributes so Phoenix, Langfuse, Datadog, or a future PING-native UI can all consume the same traces. PING evidence events should carry trace context (trace_id/span_id) so evidence and traces join.

**NATS.** Lightweight messaging. Best mechanism: JetStream (persistent streams, durable consumers, deduplication windows) plus built-in KV and ObjectStore. REJECT as the event backbone (Postgres is PING's canonical truth; two backbones = two truths). HARVEST: (1) the deduplication-window pattern for idempotent event ingestion; (2) KV-with-watch as the shape for PING's *operational* (non-canonical) state.

**Postgres.** Durable relational truth. Best mechanism: ACID + JSONB/GIN + pgvector + LISTEN/NOTIFY + logical replication + advisory locks. PING analog: canonical event store. HARVEST/ADOPT: the outbox-via-logical-replication pattern — projections consume the Postgres WAL and never dual-write; this mechanically eliminates the dual-write drift class. Advisory locks for singleton workers (one mission scheduler, one projection leader).

**Qdrant.** Vector search. Best mechanism: HNSW with filter-*during*-traversal (not post-filter), scalar/binary/product quantization ladder, hybrid dense+sparse with RRF, payload-indexed multitenancy. PING analog: ProjectionAuthority over Qdrant. HARVEST: (1) filtered ANN as the retrieval contract (every PING similarity query carries its authority/tenant filter into the traversal); (2) the quantization ladder for cost control; (3) store provenance in the payload (event_id, claim_id, derivation hash) so every retrieved vector is traceable to its source evidence.

**Neo4j.** Graph database. Best mechanism: the GDS algorithm library (centrality, community detection) over a property graph. REJECT as a primary store (PING's graph is derived from events + lineage edges; a second writable graph is a second truth). HARVEST the algorithm shapes: run PageRank/centrality-style importance scoring as batch jobs over PING's *derived* graph to rank knowledge claims by structural importance.

**ClickHouse.** Analytical queries over huge logs. Best mechanism: MergeTree + materialized views that precompute aggregates deterministically. REJECT as an operational store. HARVEST the materialized-view pattern for PING projections: precomputed aggregates over the event log with a deterministic refresh rule (refresh = replay events in [last_refresh, now)).

**MinIO.** S3-compatible object storage. Best mechanism: object locking / immutability (WORM) + versioning + erasure coding. PING analog: artifact content store. HARVEST immutability-by-policy: artifact bodies are content-addressed *and* object-locked, so the store itself cannot silently change bytes (defense in depth under the identity guarantee).

### Developer experience / operations

**Nix.** See section C (dedicated audit).

**Backstage.** Service sprawl. Best mechanism: the software catalog (every component registered with owner + lifecycle metadata) + docs-as-code co-located with the component. HARVEST the catalog-with-ownership pattern: every PING authority/worker/intent registered once with an owner and lifecycle state; this is the machine-readable form of the authority inventory work. REJECT the full portal.

**Sentry.** Error tracking. Best mechanism: issue grouping by normalized fingerprint + release tracking. HARVEST error fingerprinting for PING's failure taxonomy: typed failures (section A.3.6) grouped by normalized signature become the grouping key of the contradiction/failure ledger, so recurrence is measurable.

**Langfuse.** LLM app observability. Best mechanism: LLM-as-judge *execution tracing* — every score links to the full trace of the judge's reasoning, prompt, and cost. HARVEST the pattern for PING verification: every VERIFIED claim links to the evidence trace that verified it (score -> execution trace, claim -> verification trace). REJECT the SaaS dependency; replicate the pattern over PING's own event/trace substrate.

**Phoenix (Arize).** Open observability/eval foundation. Best mechanism: OpenTelemetry-native traces with evaluation from individual spans up to whole agent trajectories and sessions. HARVEST trajectory-level evaluation: PING missions are evaluated as whole trajectories against replay, not as single calls. Of the two, Phoenix's compose-around-your-own-system posture fits PING better than Langfuse's packaged workflow (matches Nolan's reuse-before-create, own-the-substrate stance); Phoenix OSS core is the closer analog.

### Stronger systems not on the original list, named explicitly

- **dbt.** The closest industry analog to PING's knowledge-compounding ambition: SQL models form a DAG, every model is tested, docs generate from the same source, and `dbt run` recompiles only what changed (+downstream). HARVEST the DAG-of-models + test-every-model + change-aware-rebuild discipline as the template for PING's knowledge compilation layer.
- **OpenLineage.** Open standard for lineage events. HARVEST the event format: PING's lineage edges could be emitted as OpenLineage-compatible events, making PING's lineage interoperable instead of bespoke.
- **Apache Iceberg.** Table format with snapshot lineage and time travel. HARVEST snapshot isolation + manifest-based metadata for PING's knowledge snapshots: a knowledge snapshot is a manifest of content-addressed parts, time-travelable, with snapshot lineage.
- **Temporal.** Already covered above; named here because it belongs in any stronger-systems list for durable execution.

---

## C. NIX-INSPIRED AUDIT: MINIMAL REPRODUCIBILITY MECHANISMS FOR PING KNOWLEDGE

Harvest the ideas, not the system. Do NOT import: the Nix language, the `/nix/store` daemon, per-derivation sandboxing machinery, or the flake UX. The question answered: *what would make a PING knowledge result reproducible from declared inputs?*

### Harvested concepts (what Nix actually guarantees)

1. **Content addressing.** A derivation's output path is a function of its inputs' hashes. Same inputs -> same address, bit-identical, verifiable by anyone holding the inputs. (Nix store paths; CRX's frozen domain fingerprint registry is the same idea at the hash-function level.)
2. **Immutable store.** Once written, an artifact never changes; "updating" means writing a new address. Old results stay addressable as long as something references them.
3. **Explicit dependency graphs.** A derivation declares every input; there are no ambient dependencies. The build graph is data, inspectable before execution.
4. **Reproducibility from a lockfile.** `flake.lock` pins every input to an exact commit/content hash; evaluation ignores the URLs and uses the pins. A flake without its lockfile is incomplete.
5. **Reachability GC.** The collector deletes exactly the store paths not reachable from live roots. Storage cost is proportional to live knowledge, not history.
6. **Pure evaluation boundary.** Pure evaluation forbids undeclared inputs (network, clock, host filesystem). Impurity is either rejected or explicitly declared and audited (fixed-output derivations: the *expected* hash is declared up front, the content is fetched, the hash is checked).
7. **Portable snapshots.** A closure (derivation + all referenced store paths) can be copied between machines and re-realized identically.

### Minimal mechanism list for PING (the smallest set that buys reproducibility)

1. **Declared input lockfile per derivation.** Every knowledge derivation (a claim produced from sources, a projection rebuilt from events, a research answer distilled into the corpus) records its inputs as content hashes: event ID ranges, source document spans (hash + offsets), model version + prompt hash + seed, code/derivation version. No wall-clock reads, no unpinned "latest." This is the `flake.lock` of knowledge, and it is also the shape of CRX's `domain_lockfile_fingerprint_guard.js` (section A.3.5).
2. **Content-addressed derivation outputs.** The address of a derived claim = hash(declared inputs + derivation code version). Re-deriving from the same inputs yields the same address; a changed address *means* changed inputs or changed law. Store the derivation record at that address, immutably.
3. **Explicit claim-to-source dependency edges.** Each derived claim persists edges to exactly the inputs that produced it (event IDs, source spans, parent claims). This is the targeted-recompile enabler and the single most Nix-like thing PING lacks (see section D).
4. **Pure derivation boundary with declared impurity.** Derivation functions are deterministic given declared inputs. LLM calls are the impurity: handle them as fixed-output derivations — declare the expected output hash when re-deriving (cache hit by content hash of (model, prompt, seed)), and on a miss record the new output with its full provenance. Never re-sample silently.
5. **Lockfile verification in CI.** Recompute a derivation's declared input hashes from the live substrate and fail closed on mismatch (the CRX lockfile-guard pattern). A knowledge claim whose inputs no longer resolve is STALE, never silently current.
6. **Reachability GC over derived knowledge.** Roots = live indexes, active missions, published digests. Anything unreachable is collectible. This is what makes the marginal cost of knowledge *fall*: storage and re-verification budgets track live knowledge, not accumulated history.
7. **Portable knowledge snapshots.** A snapshot = input lockfile + derivation graph + output hashes, exportable without the original runtime (the CRX minimum-replay-set idea, applied to knowledge rather than events).

### What reproducibility is NOT (do not import)

- Bit-identical LLM outputs across providers (impossible; the fixed-output-declaration pattern handles this honestly instead).
- A global sandbox around every derivation (cost without benefit at PING's scale; the purity boundary is at the derivation-function level, enforced by code review + CI checks, not by a daemon).
- The Nix expression language or store layout (PING's substrate is Postgres + content-addressed object storage; the mechanisms above compose with that).

---

## D. ECONOMIC ARCHITECTURE: DOES THE MARGINAL COST OF UNDERSTANDING FALL?

### The compounding loop under test

```
SOURCE CHANGE -> TARGETED RECOMPILE -> BETTER KNOWLEDGE -> BETTER CONTEXT
  -> BETTER EXECUTION -> NEW OUTCOME EVIDENCE -> BETTER KNOWLEDGE -> ...
```

If every new question requires re-reading the corpus, cost is O(corpus) per question and the architecture is failing. If sources compile incrementally into reusable verified knowledge, each cycle amortizes prior work and marginal cost falls.

### Link-by-link assessment (evidence-graded)

1. **SOURCE CHANGE -> TARGETED RECOMPILE: MISSING.** There is no machine-maintained dependency graph from a source change to the set of derived knowledge claims it affects. Today a source change either does nothing (knowledge goes silently stale) or triggers unbounded re-derivation (agent re-reads, re-distills). The distill/observation machinery (`emit-observation.py`, meta-ai-intel ingestion with dedupe and verification gates) is real but it is *append-oriented*: new observations enter; nothing computes the affected subgraph of existing claims. Maturity: UNKNOWN leaning MISSING (no contrary evidence found in the recon scope).
2. **TARGETED RECOMPILE -> BETTER KNOWLEDGE: PARTIAL (WIRED_UNPROVEN).** Deterministic replay exists as a mechanism (PING's replay kernel implements the CRX flow), and the tandem verification gate (verify-before-promote, sidecar provenance) is a genuine recompile-then-verify step. But it operates on *incoming* research, not on invalidating *existing* knowledge when sources change. The recompile half exists; the targeting half does not.
3. **BETTER KNOWLEDGE -> BETTER CONTEXT: EXISTS, PARTIAL.** Knowledge graph, projections (Qdrant), intents manifests, context packs (`build-context-pack.py` retrieves authoritative context from source artifacts with negative signals from JSONL coverage). Retrieval works. What is missing is provenance on the context: a context pack does not carry the derivation hashes of its contents, so a consumer cannot tell whether its context is current.
4. **BETTER CONTEXT -> BETTER EXECUTION: EXISTS.** The 8 canonical workers, the mission bridge, the delegation architecture (Muse orchestrates, PING coordinates underneath), and the standing rules (verify-then-execute, grill persistently) are all execution improvements driven by accumulated context. This link is the strongest in the loop.
5. **BETTER EXECUTION -> NEW OUTCOME EVIDENCE: WEAK.** PING records evidence events (OBSERVATION_CREATED, mission outcomes), but outcome capture is agent-disciplined, not mechanism-enforced. There is no schema that says "every execution that changed the world must close with a measured outcome event," and no check that it happened. Evidence exists where agents were diligent; diligence is not a mechanism.
6. **NEW OUTCOME EVIDENCE -> BETTER KNOWLEDGE: WEAK, PROCESS-ONLY.** The distill sweep exists as a scheduled process, and contradiction preservation is a stated principle, but there is no closed loop in which a verified outcome automatically promotes, demotes, or retires the knowledge claim that predicted it. Learning is a cron job's side effect, not a feedback control.

### The single highest-leverage missing link

**TARGETED RECOMPILE: a machine-maintained, content-addressed dependency graph from every derived knowledge claim back to its source inputs (event ranges, document spans, parent claims), with invalidation and re-derivation driven by source changes.**

Why this one, and not the others:

- It is the gate for links 1, 2, and 6 simultaneously. With it: a source change computes the affected subgraph (link 1), re-derives exactly that subgraph deterministically and re-verifies (link 2), and verified outcomes invalidate-or-confirm the claims they touch (link 6 becomes mechanical). Without it, every other improvement leaks: better retrieval over stale knowledge is faster wrongness; outcome evidence with no invalidation path is write-only learning.
- It is the convergence point of all three harvests: Nix's explicit dependency graphs + reachability (section C.3/C.6), dbt's change-aware rebuild of a DAG of tested models, Dagster's declarative freshness policies, and CRX's own lineage-as-root-fact (Axiom 2) plus the frozen corpus vectors as regression anchors.
- It directly serves the standing rule "every cycle must reduce uncertainty": an invalidation event names exactly which claims lost their basis, which is falsifiable, ownable (contradiction records require an owner and closure condition), and measurable (net verified contradictions closed).
- It is bounded and reversible: start with claim->source edges on new derivations only (no backfill of history — the 2026-09-18 ruling already forbids speculative backfills), a recompute function over the affected subgraph, and the existing verification gate as the acceptance check. The failure mode of *not* building it is the architecture quietly becoming a write-only journal with O(corpus) question cost.

Concrete shape (plan, not execution): each new derived claim stores `derived_from: [content hashes of inputs]`; a source-change event triggers `affected = reverse_reachable(change)`; the affected set is re-derived via the pure derivation boundary (section C.4) and re-verified; claims whose inputs no longer resolve become STALE (never silently current); GC collects unreachable derivations. The 12-leaf vs 13-leaf witness drift is the canary: under this mechanism, a witness implementation change would invalidate exactly the witness-root claims and force re-derivation against the golden vectors, instead of leaving two roots in dispute.

---

## E. CONTRADICTIONS

1. **CRX certification vs CRX continuity breaks (same repo, same date).** `certification/reports/certification_report.md` (2026-06-07) certifies FCA-10.5/11/12 PASSED with "zero duplicate implementations" in `runtime/replay/`. `reports/continuity_breaks.md` (2026-06-07) documents that replay was never migrated, witness was never migrated, `identity_engine.ts` violates Axiom 1, and `dag_validator.ts` violates Axiom 2. Live falsification: the shipped `dist/tests/certification/replay-unicode.test.js` throws `TypeError: canonical_json_1.CanonicalJson.stringify is not a function`. The certification verdicts are FALSIFIED as reproducible claims. Standing lesson (already PING policy): "the agent checked it" is insufficient; claims need machine-checkable evidence.
2. **CRX constitution vs PING authority reality on Witness.** CRX's elimination test (Phase 6) eliminates Witness as an independent authority. PING implements `WitnessAuthority` as a named owner, removed the WITNESS_CREATE bypass, and binds `witness_root` into WITNESS_CREATED. Resolution: PING's 2026-09-18 constitutional decisions supersede CRX law; the CRX elimination table must not be imported as a conformance checklist. The *semantics* (witness = verification, not origin) converged; the *jurisdiction* diverged legitimately.
3. **CRX "clean-room reproducibility" vs missing sources.** The clean-room report claims anyone can reproduce the certification from a clone, but the TS sources for `runtime/replay/` are absent from the checkout (single-commit clone; `runtime/` is empty; git history cannot answer). Compiled `dist/` JS exists but is internally inconsistent with the tests. A clean-room procedure that cannot rebuild from source is not a clean room. PING's reproducibility principle (sanitized harness + setup/teardown + assertions surviving without credentials) is the correct replacement standard.
4. **Recovered witness flow vs missing regression anchors.** PING faithfully recovered CRX's witness flow (step order, domain-separated Merkle tree) but did not inherit CRX's golden corpus vectors as regression anchors — and the 12-leaf vs 13-leaf witness drift is now an open PING item. The mechanism that would have caught it was left behind with the vectors.
5. **Duplicate-authority tracking: CRX documented it, PING still lives it.** CRX's `AUTHORITY_REUSE_MATRIX.md` / `DUPLICATE_AUTHORITY_GRAPH.md` classified duplicates before acting. PING's `intents/witness/intent-manifest.yaml` currently reports a "CRITICAL: complete duplicate subsystem in runtime/kernel/witness/" with status `fragmented`. The discipline exists in both; the condition persists in PING. Per Nolan's 2026-09-18 ruling: classify each implementation (CANONICAL / LEGACY_INGRESS / COMPATIBILITY / PRESERVED_INACTIVE / FORENSIC / DERIVED / UNKNOWN) before any elimination.

## F. UNKNOWNS

1. Whether the missing `runtime/replay/*.ts` TypeScript sources ever existed in `ngesk2/crx-runtime` git history (local clone is a single commit; `git log --all -- runtime/replay/...` is empty). A remote history inspection would answer it; out of scope for this read-only pass.
2. Whether PING's current `witness_authority.ts` reproduces CRX's golden vectors (e.g., `minimal_replay` -> witness root `3cdd550c...`, leaf_count 14, tree_height 4). This is the highest-value falsification experiment available: feed `tests/corpus/minimal_replay.json` through PING's WitnessAuthority and compare. Proposed, not executed (would require compiling PING's TS; read-only law).
3. Whether PING's `graph_validator.ts` performs transitive DFS cycle detection or repeats CRX's `dag_validator.ts` Axiom-2 violation (self-reference + duplicate-parent checks only). Read of the file would answer; flagged as WIRED_UNPROVEN.
4. The true current maturity of TARGETED RECOMPILE in PING (section D link 1): assessed MISSING from recon scope, but a full-repo trace of the distill/observation path could reveal partial wiring I did not see.
5. Whether `CanonicalJson.stringify` vs `canonicalize` in CRX's dist is API drift or a stale test expectation; unresolvable without sources. Recorded as evidence of the provenance gap, not as a claim about either side.
6. Current upstream state of fast-moving specs at read time: MCP 2026-07-28 (stateless core, SEP-2577 deprecations) and LangGraph 1.0 (durable state, `langgraph.prebuilt` moved to `langchain.agents`) were verified against current sources; pin versions before building on any of them.
