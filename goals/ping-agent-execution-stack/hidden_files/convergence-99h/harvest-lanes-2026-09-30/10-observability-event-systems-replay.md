# READER LANE 10: OBSERVABILITY / EVENT SYSTEMS / REPLAY

**Date:** 2026-09-30 ~18:10 MDT. **Scope:** mature event sourcing, OpenTelemetry semantics, durable workflow histories, deterministic replay, deployment certification. **Posture:** read-only reconnaissance. Nothing installed, no dependencies added, no repo modified, no authorities/stores/services created. The only write is this file.

**Binding constraints honored:** NO SECOND EVENT SPINE. Anything proposing to replace the canonical PING event writer or duplicate the event log is a REJECT. Observability must never become a hidden source of canonical truth (CRX audit invariant).

---

## 1. SEARCH RECORD (where I looked, what I found, what was unreachable)

**PING source locations from the task** (`/home/nolan/projects/ping`, `/home/nolan/projects/ping-fyd-converged`): UNREACHABLE from this machine. Home here is `/home/hatch`, not `/home/nolan`; those paths do not exist. I did not treat this as a dead end: the freshest PING implementation evidence available to me is (a) the CRX observability audit done via the Pig bridge on 2026-09-22 against `/home/nolan/ping @ cc6856c3` (`~/workspace/crx-audit/04-observability-map.md` + `~/workspace/crx-audit/partials/agent-c-observability.md`, read-only method, runtime probes included), (b) the mission/event-bus convergence plan dated 2026-09-24 (`~/workspace/ping-convergence/mission-event-bus-convergence-plan.md`), and (c) the deployment-convergence forensics dated 2026-09-30 (today: `~/workspace/goals/ping-agent-execution-stack/hidden_files/deployment-convergence/DEPLOYMENT-MAP-2026-09-30.md`, `OWNER-DECISIONS-2026-09-30.md`) plus Nolan's 30 locked decisions in `~/MEMORY.md`. Where a claim below rests on the 2026-09-22 audit, it is marked with its date; the event-plane findings were re-confirmed by today's deployment-convergence forensics (ping_events row counts, append-only trigger, sequence column).

**FYD locations searched:** `~/workspace/fyd-build` (src, server, package.json), `~/workspace/transfer/fyd-harvest`, plus the fyd-* worktree dirs. FYD's event/observability surface was verified by grep over `src/` and `server/`: zero references to `ping_events`, `UnifiedEventRuntime`, `eventRuntime`, `opentelemetry`, `traceparent`, `correlation`, `correlationId`, `traceId`, or `requestId`. `package.json` dependencies are `sharp` only (dev: jest, react, typescript, style-dictionary). FYD has no event system, no tracing, no metrics, no correlation IDs. Its explainability surface is build-time only: `src/fyd/why/` (`why-this.ts`, `field-triple.ts`, `load-observations.ts`) and `src/fyd/claims/claims.ts`.

**CRX mine searched:** `~/workspace/crx-audit` (the observability map is the single best artifact in the mine for this lane), `~/workspace/crx-convergence-sweep` (inventory notes `feature/temporal-durable-execution`, `feature/event-runtime-deduplication`, `feature/knowledge-replay-routing` as branch names with content not pulled), `~/workspace/crx-autonomous-missions` (contains `repos/alex2481kobe-orca/src/agent-events.js`, a lane-executor event normalizer; operational, not canonical). The CRX GitHub remote (`https://github.com/ngesk2/crx-runtime.git`) was REACHABLE via anonymous git: main = `6c4b5317` (matches Nolan's recheck), and I read-only fetched the `feature/temporal-durable-execution` branch (commit `1fcfa79`, 2026-09-17) to inspect a prior Temporal experiment. `event-runtime-deduplication` and `feature/knowledge-replay-routing` branch contents were not pulled: recorded as UNREACHED (names/SHAs confirmed, content not inspected; no finding claimed from them).

**Local prior art:** `~/obs-scratch/` holds 13 repos cloned 2026-09-23 (agentops, braintrust-sdk, helicone, langfuse-python, langtrace, openai-agents-python, openinference, openllmetry, opik, phoenix, weave, semantic-conventions, semantic-conventions-genai). These are LLM/agent telemetry SDKs, adjacent to but not in this lane's core (event systems/replay, not prompt tracing). I used `semantic-conventions` (opentelemetry/semantic-conventions @ `838e414`) as a primary source for OTel semantics. The other twelve were not evaluated; depth over breadth.

---

## 2. PING EXISTING IMPLEMENTATION (described precisely, before any external judgment)

**Single canonical event writer.** `UnifiedEventRuntime` (`ping-runtime/events/unified_event_runtime.js`) is the sole production writer of the `ping_events` table (verified by repo-wide scan excluding tests/evals, 2026-09-24). `emit()` mints a deterministic content-addressed `event_id` = SHA-256 over `{eventType, source, [namespace], [logical_id|payload]}`. Live write path proven: `/health` showed emitted == persisted == 216 with 0 failures. The legacy `ConstitutionalEventBus` (`gateway/event_bus.js`) is a proven-lossy competing writer (deterministic `generateId` over constant input collapses all publishes onto one row via `ON CONFLICT DO UPDATE`); it is deprecation-marked and unwired from the live gateway. The sanctioned legacy-ingestion pattern is `EventBridge` (`ping-runtime/events/event_bridge.js`): poll legacy tables, re-emit through `UER.emit()` with dedup and persisted cursors. Immutability is enforced at the DB layer on the Oracle plane: `trg_ping_events_append_only` (BEFORE DELETE OR UPDATE raises), plus a `sequence` column with UNIQUE constraint (2026-09-30 forensics). The Pig plane's `ping_events` (2568 rows, live) has no sequence column and no trigger: a known convergence gap.

**Centralized event identity.** One identity scheme, four distinct concepts kept separate in schema and in production data (739-row window, 2026-09-22):
- **Semantic identity:** `event_id`, the content hash. Two emits of the same content dedupe to one row by construction.
- **Causation:** `causation_id` in `metadata` (indexed, `idx_ping_events_causation`); 144 of 739 events carry a parent link, 0 self-links.
- **Correlation:** `correlation_id` in `metadata` (indexed); inherited down worker chains by `BaseWorker._emit`. Caveat, already visible in prod: 595 distinct correlation_ids over 739 events, so `correlation_id` fragments mission lifecycles rather than grouping them; lifecycle grouping requires `payload->>'missionId'` (camelCase, absent from metadata).
- **Persistence order:** `sequence` (Oracle plane) separate from both identity and causation.
- **Privacy plane:** `namespace` column (`core::system` default, `tenant::<id>` boundary), preserved through workers and into `knowledge_nodes`.
- **Memory linkage:** every `knowledge_nodes` row carries `source_event_id` + `correlation_id` (68/68 in prod).
- **Read API:** auth-gated `/events` routes expose children/descendants/ancestors/correlation-group traversal (recursive CTEs).
- **Missing identities (the gaps):** no `request_id` at HTTP ingress (a request cannot be joined to the mission it spawns except by timestamp), no `tool_call_id` (MCP/tool calls are a blind spot), governance verdicts are memory-only counters (a rejection leaves no durable record), `trace_id`/`span_id` exist only in the unwired `opentelemetry_witness_instrumentation.js`.

**Replay/witness machinery.** Present but largely unwired or static: `replay_log.js` (direct `events`-table writer, unwired), `ReplayKernel` / `ReplayAuditReport` / `ReplayKernelAudit` (static codebase audits, not runtime), `REPLAY_COMPLETED` events emitted in prod (18 in the window), `knowledge_compiler.replayPass()` (dormant; reads the deprecated bus's `events` table), `witness_chain.js` (unwired), `WITNESS_CREATED` events in prod, `opentelemetry_witness_instrumentation.js` (unwired, "witness activation DEFERRED"). Verdict: the vocabulary of replay and witness exists in the event stream, but reconstructive replay (rebuild state from the log) is not an exercised runtime path today.

**Source to served certification concept.** This is decided law, not implementation. Nolan's locked decisions (2026-09-30): certify `SOURCE -> BUILD -> ARTIFACT -> DEPLOYMENT -> PROCESS -> SERVED BYTES -> SERVED BEHAVIOR`; until then the deployment field stays UNKNOWN/NOT YET REACHED; `LOCAL MERGE != BUILT != DEPLOYED != SERVED`, prove each transition. Current implementation state: the `/ops/drift` detector is degraded (`platformHash: null`), `/ops/status` 500s on `fingerprint.generate is not a function` in the deployed build, and the stale-image failure has been proven twice (container md5 != repo source). No signing, no provenance attestations, no served-manifest anywhere. The deployment-convergence lane is certifying transitions manually today.

**What PING does NOT have (verified 2026-09-22, no evidence of change since):** no OpenTelemetry in any lockfile; `OTEL_*`/`LOKI_URL` env vars with zero code readers (config fiction); no Prometheus/Grafana/Loki/Tempo; `TracePort` and `MetricsPort` exist as abstract unwired seams; `telemetry_subsystem.js` unwired with DDL disagreeing with the actual `telemetry_metrics` table (0 rows); `audit_log` table exists with 0 rows and no writers; application logging is unstructured `console.log` with no correlation context and ignored `LOG_LEVEL`; the ui-next dashboard fabricates "live" numbers via `Math.random()`; `/ops` responses hardcode `generated_runtime_authoritative: true`.

---

## 3. CANDIDATE EVALUATIONS

Each in the required shape. No em dashes used anywhere in this report.

### CANDIDATE 1: OpenTelemetry trace context, span links, baggage, semantic conventions

**PRODUCT NEED** -> Distributed trace context across HTTP ingress, gateway, workers, and tool calls; a standard correlation vocabulary for the missing request_id; standard attribute names for any future metrics/traces plane. PING's correlation-identity map names the exact hole: no request_id at ingress, no trace context in console logs, TracePort abstract and unwired.

**FYD CURRENT IMPLEMENTATION** -> None. No tracing, no correlation IDs, no OTel dependency. FYD would be a downstream consumer of any trace context PING propagates (e.g., Ask FYD request -> trace_id), not a producer.

**PING EXISTING IMPLEMENTATION** -> Custom correlation_id/causation_id in ping_events metadata (not W3C); TracePort/MetricsPort abstract seams unwired; opentelemetry_witness_instrumentation.js unwired; OTEL_* env vars with zero readers. The seam exists; the wiring does not.

**CRX HARVESTABLE IMPLEMENTATION** -> The CRX observability map's seam inventory (TracePort exists) and its correlation-identity map (the request_id gap). Nothing else; no OTel code in the mine.

**EXTERNAL IMPLEMENTATION** -> OpenTelemetry (CNCF). Verified against the local primary-source clone opentelemetry/semantic-conventions @ 838e414 and spec-derived material. The model: every span carries trace_id (the correlation scope shared by the whole distributed operation), span_id, and parent span_id (the causal predecessor). W3C traceparent header format `00-{trace_id}-{span_id}-{trace_flags}` (32-hex trace_id, 16-hex span_id). Span links: references to other spans with a causal or associative relationship that is NOT parent-child (the canonical example: a batch job processing 100 messages links to the producing spans rather than pretending one message is the parent of the batch). Baggage: key/value pairs propagated alongside trace context for cross-boundary business context. Semantic conventions: a standard attribute vocabulary (HTTP, messaging, DB, CloudEvents spans, genai) so polyglot telemetry stays correlatable. Resource concept: the service identity spans belong to. Note from a secondary source (opentelemetry.io blog 2026, via notes): span events are being deprecated in favor of log-based events carrying trace/span IDs, which is exactly the shape PING's console.log lacks.

**REACHED/UNREACHED** -> REACHED. Primary source: local clone of opentelemetry/semantic-conventions. Trace data model confirmed via spec-derived references (W3C traceparent structure, span/link/baggage semantics consistently described across independent sources).

**DUPLICATION RISK** -> LOW if confined to the observability plane behind TracePort; FATAL if misunderstood. OTel traces are sampled, lossy, unordered observations. They must never be consulted as truth and must never become a second writer of canonical state. The standing invariant ("observability failure must not change canonical business semantics") is the guardrail: spans are emitted as a side channel; business logic reads ping_events only.

**SECURITY/TRUST BOUNDARY** -> Trace context crosses trust boundaries by design (traceparent headers on every ingress/egress). Baggage and span attributes can leak PII/secrets into telemetry stores; PING's audit already proved there is no payload scrubbing in emit() (adversarial test T11), so any OTel wiring must inherit the namespace (tenant::) privacy boundary and add attribute allowlisting before span export. Treat incoming traceparent/baggage as untrusted input: validate format, never trust a client-asserted trace_id for authorization decisions.

**SMALLEST DELTA** -> (1) Implement a TracePort provider using the OTel API (no collector/backend needed): accept or mint W3C traceparent at HTTP ingress, which fills the missing request_id gap (request_id := trace_id); propagate trace_id as correlation_id and parent span as causation_id into UER.emit metadata. (2) Emit spans as a fire-and-forget side channel; project them from ping_events if no backend is wanted. (3) Adopt the semantic-conventions attribute vocabulary for any future metrics. Do NOT deploy the OTel Collector, Tempo, Jaeger, or any trace backend; do NOT treat spans as canonical.

**ADOPT / WRAP / ADAPT / LEARN / REJECT / REFERENCE** -> **WRAP**. Use the OTel SDK/API behind the existing TracePort interface for trace-context propagation and span emission; adopt W3C traceparent as the ingress correlation standard. Separately **ADAPT** the span-links concept: add an optional `links` array to event metadata for non-parent associations (batch fan-in, retried-then-superseded chains), which PING's single causation_id cannot express today.

### CANDIDATE 2: SLSA provenance attestations + Sigstore keyless signing

**PRODUCT NEED** -> Cryptographic proof for the first three links of Nolan's certification chain: SOURCE -> BUILD -> ARTIFACT. Today those links rest on manual forensics (md5 comparisons that have twice proven the deployed image stale). Nothing in the pipeline signs or attests anything.

**FYD CURRENT IMPLEMENTATION** -> None. No signing, no provenance, no served manifest.

**PING EXISTING IMPLEMENTATION** -> None. The drift detector exists but is degraded (platformHash null). Deployment-convergence forensics (2026-09-30) record image digests (e.g., sha256:4aa9d7f6...) manually in markdown. The deployment gate is human judgment today.

**CRX HARVESTABLE IMPLEMENTATION** -> None.

**EXTERNAL IMPLEMENTATION** -> SLSA (Supply-chain Levels for Software Artifacts), spec v1.2 referenced at slsa.dev. Build track: L1 provenance exists (describes build platform, process, top-level inputs); L2 provenance is signed and from a hosted build service (GitHub Artifact Attestations gives this nearly free); L3 builds are isolated with the signing key unreachable from user build steps (slsa-github-generator reusable workflows). Sigstore (Linux Foundation): keyless signing. Cosign uses OIDC tokens from the CI platform as identity, a short-lived Fulcio certificate, and the Rekor transparency log; no long-lived keys to manage or leak. in-toto is the attestation envelope. Two load-bearing maxims from independent guides: "a signature proves who; provenance proves how" (an attacker with a valid key signs malware happily), and "verification belongs at the deployment gate, not at the end of the build; a build verifying its own output proves nothing." Critical scope limit, verified across sources: SLSA covers SOURCE -> BUILD -> ARTIFACT only. It says nothing about DEPLOYMENT -> PROCESS -> SERVED BYTES -> SERVED BEHAVIOR; those links need runtime attestation (digest pinning at deploy, a served-manifest endpoint, deployment receipts).

**REACHED/UNREACHED** -> REACHED via multiple independent guides quoting the SLSA spec and Sigstore mechanics consistently. Primary slsa.dev/sigstore.dev pages not fetched in this pass; the model is stable across sources.

**DUPLICATION RISK** -> LOW. Attestations are metadata about artifacts, not a competing truth store. The failure mode is theater: generating attestations nobody verifies. The mitigation is structural: verification happens at the deployment gate, and the verification result is journaled into ping_events (see smallest delta), so the canonical log, not a sidecar, carries the certification.

**SECURITY/TRUST BOUNDARY** -> Sigstore's public Rekor log is public: attestation contents (source repo, commit SHA, builder identity) become public facts. Acceptable for the open repos; for private code use GitHub's internal Sigstore instance (no public transparency log). The OIDC certificate identity must pin the exact workflow identity (repository + workflow file + ref); a loose identity lets any workflow in the org mint "valid" provenance. Keyless means no key to leak, but OIDC token issuance becomes the trust root: protect workflow trigger hygiene (no `pull_request_target` on untrusted forks minting releases).

**SMALLEST DELTA** -> (1) Emit SLSA provenance for gateway images in CI (GitHub Artifact Attestations for L2; slsa-github-generator if L3 is wanted later). (2) At the deployment gate, verify the attestation and pin the image digest, then journal a `DEPLOYMENT_CERTIFIED` event into ping_events carrying {source_commit, artifact_digest, attestation_bundle_hash, verifier_identity}: the external provenance is wired INTO the canonical log instead of creating a sidecar truth. (3) Close PROCESS -> SERVED with a served-manifest endpoint reporting the running image digest, so each link of Nolan's chain has evidence. Do not build a provenance database; do not invent an attestation format.

**ADOPT / WRAP / ADAPT / LEARN / REJECT / REFERENCE** -> **ADAPT**. Use upstream Sigstore/SLSA tooling unmodified for the commodity half (signing, attestation generation); port the pattern (provenance plus gate verification) into PING's own deployment certification, with the certification ledger living in ping_events. What we never write: a custom image-signing PKI, a bespoke attestation format, a provenance sidecar database.

### CANDIDATE 3: CloudEvents 1.0 envelope + versioning discipline

**PRODUCT NEED** -> A disciplined, versioned event envelope for ping_events (and any future producers) before the event-type space grows; explicit schema-evolution rules so old events stay readable during replay; an interop vocabulary for emitting events to the outside world (webhooks, partner feeds).

**FYD CURRENT IMPLEMENTATION** -> None; FYD emits no events.

**PING EXISTING IMPLEMENTATION** -> An implicit envelope: (event_id, event_type, timestamp, source, namespace, payload JSONB, metadata JSONB). Event-type validation exists in UER admission. `schema_version` already appears in production metadata keys, but no versioning convention is codified anywhere. No envelope spec document.

**CRX HARVESTABLE IMPLEMENTATION** -> None specific. (Notable: OTel's semantic-conventions repo, held locally, ships CloudEvents span conventions mapping cloudevents.event_id/source/type, confirming the envelope's status as the interop standard.)

**EXTERNAL IMPLEMENTATION** -> CloudEvents 1.0 (CNCF): envelope attributes specversion, id, source, type, time, subject, datacontenttype, dataschema, data. The spec standardizes the envelope and stays agnostic about payload. Versioning practice, consistent across independent sources: keep specversion fixed at 1.0 (the envelope version is not the payload version); carry payload-schema version in the `type` via a `.v{n}` major suffix (com.example.user.created.v1 -> v2) for breaking changes; additive changes keep the same type with tolerant readers; optional `dataschema` URI points at the payload schema (or a schema registry). Extension attributes carry cross-cutting concerns in lowercase: the documented pattern adds `correlationid`, `causationid`, `sequence`/`sequencetype`, `streamid`, `tenantid` as extensions, with sequence atomically allocated by the append-only store. One ADR-quality source shows exactly this shape working against a SQLite append-only store: producers supply id and time, the store allocates sequence, large bodies are referenced never embedded, secrets never appear in context attributes.

**REACHED/UNREACHED** -> REACHED. Spec attributes and versioning practice verified across independent sources; the CloudEvents spec repo itself was not cloned in this pass.

**DUPLICATION RISK** -> LOW. It is a spec, not a runtime. The risk is churn disguised as standardization: renaming PING's columns to CloudEvents names would touch the canonical store for interop fashion. The safe move is a documented mapping plus a projection, not a rename.

**SECURITY/TRUST BOUNDARY** -> The envelope does not fix trust; `data` is opaque to it, exactly like PING's payload JSONB, so the no-scrubbing gap (T11) applies equally. Extension attributes are the right place for tenant/correlation/causation precisely because they can be enforced and indexed without parsing payload. Note the documented rule "secrets must not appear in widely logged context attributes": envelope attributes get logged everywhere, so tenant_id/correlation_id are fine in the envelope, tokens and PII are not.

**SMALLEST DELTA** -> ADAPT the discipline into UER's admission authority, no new dependency, no column renames: (1) codify the type-versioning rule (additive change keeps the type; breaking change mints a new type or goes through an upcaster; never rewrite stored events); (2) formalize the existing `schema_version` metadata key as the payload-schema version and require it on new event types; (3) publish the mapping table ping_events <-> CloudEvents (event_id<->id, event_type<->type, source<->source, timestamp<->time, namespace<->tenantid extension, correlation_id/causation_id<->extensions, sequence<->sequence extension) so any future external emission is a projection of the canonical row, not a redesign.

**ADOPT / WRAP / ADAPT / LEARN / REJECT / REFERENCE** -> **ADAPT**. Port the envelope discipline and versioning rules into PING's event admission authority; keep PING's column names and the single canonical writer; no CloudEvents SDK on the canonical path.

### CANDIDATE 4: Event-sourcing upcasting (Axon EventUpcasterChain pattern; EventStoreDB as the negative example)

**PRODUCT NEED** -> Reading old ping_events rows (old payload shapes) through current code during replay and projection. The moment a payload schema changes, replay of history either breaks loudly or, worse, degrades silently. The deployment-convergence decisions already mandate COALESCE read paths with DEFAULT UNKNOWN for missing fields; that is half of an upcasting policy without the machinery.

**FYD CURRENT IMPLEMENTATION** -> None, but FYD's claims/why modules are consumers of PING evidence and would inherit whatever read-path compatibility PING provides.

**PING EXISTING IMPLEMENTATION** -> `schema_version` in prod metadata (the hook, no convention); no upcaster registry; tolerant-reader behavior unverified; in-place migration forbidden by standing law (append-only trigger, "do not rewrite historical IDs"). Replay of old missions against new worker code is the concrete risk; no version-marker mechanism exists.

**CRX HARVESTABLE IMPLEMENTATION** -> None. (The `feature/knowledge-replay-routing` branch name suggests related thought; content UNREACHED, no claim made.)

**EXTERNAL IMPLEMENTATION** -> Two complementary data points. Axon Framework: stores a per-event-type revision string alongside each serialized event and runs an EventUpcasterChain on the read path; each upcaster transforms revision x to x+1, chains compose so any old event walks up to current, 1-to-many and stateful upcasting supported; documented failure mode: upcaster ordering is NOT enforced by the framework (a real bug class caught only by a reflection test). EventStoreDB: deliberately has NO built-in upcasting; it is a journal, and the community pattern is copy-and-transform to a new stream or tolerant readers in consumers. Microsoft's event-sourcing pattern catalog lists the four strategies in preference order: tolerant deserialization (additive changes), event versioning (version in envelope or type name), upcasting (transform on read, stored events unchanged, chain them), in-place migration (breaks immutability, last resort). A further warning from an independent spec: catch-all "skip on deserialization error" during replay converts a hard failure into silent event loss, the projection silently diverges, nothing fails loudly. That warning maps directly onto PING's adversarial tests T7/T9.

**REACHED/UNREACHED** -> REACHED. Axon mechanics via framework documentation quoted in an engineering outcome doc; EventStoreDB's lack of upcasting via community consensus; Microsoft Learn pattern catalog.

**DUPLICATION RISK** -> LOW. Upcasting is a read-path pattern, not a store. The risks are the documented ones: unordered upcaster chains (adopt Axon's shape but enforce ordering explicitly, e.g., a registered (event_type, from_version) map rather than classpath scanning) and silent loss (fail loudly on unparseable events during replay; never skip-with-log on the canonical path).

**SECURITY/TRUST BOUNDARY** -> Upcasters execute on read and can change what history means without touching the store: they must be versioned, code-reviewed, and their identity recorded in replay provenance (which upcaster chain version produced this projection). PII note: if a future redaction policy applies to old events, the upcaster layer is where it executes, which makes the chain security-relevant code, not mere compatibility shims.

**SMALLEST DELTA** -> A small explicit registry, not a framework: pure functions keyed by (event_type, from_version) -> transformed payload, chained from stored `schema_version` to current, applied ONLY in replay/projection read paths, never at write, never mutating the store; the replay output records the upcaster chain version in its provenance. Codify the rule already implicit in the COALESCE decision: additive = tolerant read, breaking = new event type or upcaster, never in-place rewrite. Estimated scope is on the order of a hundred lines plus tests, not a new subsystem.

**ADOPT / WRAP / ADAPT / LEARN / REJECT / REFERENCE** -> **ADAPT**. Port the upcaster-chain pattern (Axon's shape, minus the framework, with enforced ordering) into PING's replay/projection read path. Do not adopt Axon, EventStoreDB, or a schema-registry service.

### CANDIDATE 5: Temporal (durable workflow histories, deterministic replay, getVersion)

**PRODUCT NEED** -> Durable mission execution with crash recovery; deterministic replay of worker chains; safe evolution of worker code while missions are in flight.

**FYD CURRENT IMPLEMENTATION** -> None.

**PING EXISTING IMPLEMENTATION** -> MissionRuntime (`ping_missions`: deterministic mission_id = sha256(missionType:event_id | canonical_payload)[0:16], status lifecycle created -> assigned -> running -> completed/failed -> archived, leases, retries, `retry_at`); worker-chain events in ping_events (OBSERVATION_CREATED -> ... -> REPLAY_COMPLETED); `replay_log.js` unwired; ReplayKernel static-only. PING already owns a mission model and an event history; what it lacks is Temporal's specific mechanics: durable timers, signals/queries, and enforced determinism.

**CRX HARVESTABLE IMPLEMENTATION** -> The CRX remote holds `feature/temporal-durable-execution` @ `1fcfa79` (2026-09-17, fetched and inspected read-only in this pass). It is a real prior experiment: a Temporal workflow wrapping PING's MissionRuntime with explicit constitutional constraints ("Temporal owns execution mechanics: retry, wait, resume, history. PING owns business state: missions, events, evidence. PING mission_id is the workflowId. Temporal runId is operational metadata only. Workflow does NOT emit canonical events directly. Workflow does NOT change mission truth directly. Activities invoke PING authorities."). Status: activities are stubs with TODOs, tests verify file structure only, never merged, 13 days stale. Tellingly, the workflow file itself violates Temporal's determinism rules (`decidedAt: new Date().toISOString()` inside workflow code; Temporal requires its deterministic time APIs): the experiment demonstrates, in our own mine, exactly the hazard the literature warns about (determinism rules you can violate by accident and discover in production).

**EXTERNAL IMPLEMENTATION** -> Temporal: the workflow's event history is the durable source of truth; crashed workers resume by replaying history to reconstruct state; workflow code must be deterministic (no wall-clock, no randomness, no direct I/O, no map iteration; SDK-provided deterministic alternatives exist); all nondeterminism is pushed to activities, whose results are journaled in history; `Workflow.getVersion(changeId, min, max)` records a version marker in history so old executions replay the old code path and new executions take the new one, with compatibility branches retained until pre-change executions drain. An independent critique worth recording: replay preserves the logic faithfully, including bugs ("it guarantees your bug survives a crash intact"); durability is orthogonal to correctness.

**REACHED/UNREACHED** -> REACHED via multiple independent secondary sources describing the same model consistently (SDK guides, docs mirrors, the getVersion pattern). Primary temporal.io docs not fetched in this pass. The in-mine experiment branch WAS reached and inspected.

**DUPLICATION RISK** -> FATAL as a platform. Temporal's history is an event log with its own writer, identity (workflowId/runId), and replay machinery: adopting it as the execution substrate duplicates the canonical event spine, violating the binding no-second-spine law and Nolan's "never duplicate PING's event system" directive. It also adds heavyweight infrastructure (Temporal server, its database, SDK versioning discipline) for mechanics PING partially covers (leases, retries, retry_at). The in-mine experiment's own constitutional constraints are an admission of the sovereignty problem they were designed to contain.

**SECURITY/TRUST BOUNDARY** -> Temporal journals all activity inputs/outputs durably; PII/secrets in workflow args would be persisted in a second store outside PING's namespace boundary and outside the append-only governance. The experiment's "activities invoke PING authorities" constraint does not solve where the history lives.

**SMALLEST DELTA** -> Do not adopt the platform. Harvest two patterns without the dependency: (1) the determinism discipline: push nondeterminism (clocks, randomness, LLM calls, I/O) to explicitly journaled boundaries, recording the nondeterministic INPUT in the event, not just the output, so replay is reconstructive rather than re-executive; (2) the getVersion pattern: record a worker-code version marker in mission/worker events (PING's prod metadata already carries `canonical_version`: formalize it) so replay of old missions against new worker code branches explicitly instead of diverging silently. Both fit inside the existing MissionRuntime + ping_events machinery.

**ADOPT / WRAP / ADAPT / LEARN / REJECT / REFERENCE** -> **REJECT** as a platform/dependency (second event spine; sovereignty violation; operational weight; our own experiment stalled at stubs and already exhibits the determinism hazard). The two patterns above are recorded as ADAPT-grade takeaways inside the rejection. Keep the `feature/temporal-durable-execution` branch as REFERENCE for its constitutional-constraint design (mechanics-vs-truth separation) in case durable timers/signals are ever genuinely needed; do not merge it.

---

## 4. THE FOUR-WAY DISTINCTION (who keeps correlation, causation, persistence order, and semantic identity distinct)

This was the lane's specific brief. Findings:

- **PING keeps all four distinct, in schema and in data.** Semantic identity = content-hashed `event_id`. Causation = `causation_id` (parent event). Correlation = `correlation_id` (worker-chain scope). Persistence order = `sequence` (Oracle plane). Verified in production rows, not just DDL. Gaps: no links equivalent (one causation_id cannot express fan-in or supersession); correlation_id fragments instead of grouping (595 distinct over 739 events); mission_id lives in payload, not metadata, so the lifecycle join is a JSON extraction.
- **OpenTelemetry keeps all four distinct, and adds a fifth relationship.** trace_id = correlation scope; parent span = causation; span links = association without parenthood (the concept PING lacks); timestamps/export order = persistence order, explicitly NOT guaranteed to match causal order (backends reconstruct); span identity = locator (trace_id + span_id), not a content hash. OTel's honesty about unordered arrival is the lesson: never infer causation from arrival order.
- **Temporal collapses causation into persistence order by design.** The history sequence IS the causal order; there is no separate causation pointer because the log is the execution. Correlation scope = workflowId/runId. Semantic identity of behavior = "replay produces the same commands." This is elegant but is exactly why it cannot coexist with PING's log: two systems each claiming "the log is the truth" is the second-spine violation in its purest form.
- **CloudEvents separates identity from ordering at the spec level.** `id` = per-occurrence identity; `source` = provenance; correlation/causation/sequence ride as extension attributes, explicitly optional and orthogonal. The spec refuses to conflate them, which is why it adapts cleanly onto PING's envelope.

Net: PING's four-way separation is already principled and ahead of most bespoke event systems. The missing piece is the OTel links concept (non-parent association), and the weak piece is correlation_id fragmentation. Both are small deltas, not new systems.

---

## 5. HARVEST MAP

**UNWIRED GOLD** (capability possessed but not reached):
- TracePort/MetricsPort abstract seams: the exact interfaces an OTel provider would implement. Keep the seams; they are the wrap point.
- The auth-gated `/events` traversal API (children/descendants/ancestors/correlation group): a real lineage query surface, already protected.
- `schema_version` in prod metadata: the hook for envelope versioning and upcasting, present but unconventioned.
- `WITNESS_CREATED` / `REPLAY_COMPLETED` event types: emitted vocabulary with no consumers; the replay story starts here.
- The append-only trigger + `sequence` on the Oracle plane: wire the same guarantees on the Pig plane (known convergence gap).

**EXTERNAL GOLD** (external primitive eliminating meaningful commodity code):
- W3C trace context (traceparent/trace_id/span_id/baggage): eliminates any bespoke distributed-correlation scheme; fills the request_id gap.
- SLSA provenance + Sigstore keyless signing: eliminates custom image-signing PKI and manual md5 forensics for SOURCE -> BUILD -> ARTIFACT.
- CloudEvents envelope attribute vocabulary: eliminates a bespoke envelope spec document.

**PATTERN GOLD** (design worth stealing, no dependency):
- OTel span links: non-parent association for fan-in/supersession.
- Axon EventUpcasterChain shape (with enforced ordering): read-path schema evolution.
- Temporal getVersion: version markers in history for code evolution.
- Temporal determinism discipline: nondeterminism only at journaled boundaries; journal the input, not just the output.
- CloudEvents type-versioning rule: additive keeps the type, breaking mints a new type, never rewrite stored events.
- "Verification belongs at the deployment gate": a build verifying its own output proves nothing.
- ORCA `agent-events.js` truncation discipline (from the CRX mine): never silently truncate telemetry; when you cut, record the cut. (That file documents a real incident where silent truncation lost 58 percent of a report.) Applies to any future PING telemetry or log aggregation.

**DUPLICATION TO KILL** (competing implementations, one semantic job; all need Nolan's call per the convergence plan, this lane only reports):
- `ConstitutionalEventBus` vs `UnifiedEventRuntime`: the bus is proven lossy; UER is canonical. Deprecation marked; needs archival, not repair.
- The ~10 dormant direct writers to the legacy `events` table (`constitutional_runtime.js`, `witness_chain.js`, `replay_log.js`, `eventstore_persistence.js`, `event_write_authority.js`, et al.): importable, constructible, one instantiation away from forking truth. Classify each, then archive.
- Dead tables with zero rows and zero writers: `canonical_events`, `events`, `repository_events`, `mission_events`, `event_outbox`, `audit_log`, `telemetry_metrics`, `lineage`. Schema without writers is a trap.
- Unwired providers and fiction config: `telemetry_subsystem.js`, `metrics_port.js`/`trace_port.js` provider references that do not exist, `opentelemetry_witness_instrumentation.js`, `OTEL_*`/`LOKI_URL` env vars with zero readers.
- Fabricated authority: ui-next `Math.random()` "live" metrics, hardcoded `generated_runtime_authoritative: true`.
- The `feature/temporal-durable-execution` branch: a second execution spine in waiting. Keep as reference, do not merge.

**REJECTED** (attractive, contaminating, or unjustified):
- Temporal as a platform (second event spine; see Candidate 5).
- EventStoreDB or any event store as canonical storage (second spine; and it has no upcasting anyway).
- OTel Collector / Tempo / Jaeger / Prometheus backend stack (unneeded weight; spans and metrics are projectable from ping_events when the time comes).
- CloudEvents SDK adoption or column renames (churn; the adapter/mapping pattern suffices).
- Any new event bus, event table, or "observability service" with its own writers.

**OPTIONALITY TO PRESERVE**:
- The Port seams (TracePort/MetricsPort): delete dead providers, keep the interfaces.
- The projection boundary: spans, metrics, and external event feeds are projections OF ping_events, never second writers.
- The temporal branch's constitutional-constraint design as a reference document for mechanics-vs-truth separation if durable timers are ever needed.

---

## 6. WHAT CODE WE DELETE OR NEVER WRITE (the lane's first-class question)

**Never write:**
1. A bespoke distributed-trace correlation scheme: W3C traceparent + OTel context propagation is the commodity answer (WRAP behind TracePort).
2. A custom span/metric attribute vocabulary: OTel semantic conventions (already held locally).
3. A bespoke event-envelope specification: adapt CloudEvents 1.0 attribute discipline onto the existing envelope.
4. An event-sourcing framework, schema-registry service, or history-rewriting migration runner: versioned upcaster functions on the read path suffice.
5. A custom image-signing PKI, attestation format, or provenance database: Sigstore/SLSA tooling for the commodity half, with certification events journaled into ping_events.
6. A durable-execution engine or second event log: Temporal rejected; PING's MissionRuntime + ping_events is the spine.
7. A metrics/traces backend built from scratch: when needed, OTel SDK projecting from ping_events, not a new store.
8. A second audit log: `audit_log` is 0 rows with no writers; audit-worthy occurrences (governance verdicts, deployments) should become first-class ping_events types, not a parallel table.

**Delete (needs Nolan's call; reported, not executed):** ConstitutionalEventBus and the dormant `events`-table writers; the eight dead tables; unwired telemetry providers and env fiction; fabricated dashboard numbers and the hardcoded authority literal; the never-merged temporal experiment branch (after extracting its constraint design as reference).

---

## 7. RANKED TOP CANDIDATES

1. **SLSA provenance + Sigstore keyless signing -> ADAPT.** Nolan's SOURCE -> BUILD -> ARTIFACT -> DEPLOYMENT -> PROCESS -> SERVED BYTES -> SERVED BEHAVIOR chain is binding law with zero implementation, and the stale-image failure it prevents has been proven twice; journal DEPLOYMENT_CERTIFIED events into ping_events.
2. **OpenTelemetry trace context (traceparent, links, baggage, semantic conventions) -> WRAP.** Fills the request_id-at-ingress hole, the top gap in the correlation-identity map; the TracePort seam already exists; spans stay a side channel, never truth.
3. **CloudEvents 1.0 envelope discipline -> ADAPT.** Codify type-versioning and the existing schema_version key into UER admission before the event-type space grows; no SDK, no renames.
4. **Event-sourcing upcasting (Axon chain shape, enforced ordering) -> ADAPT.** Small read-path registry making replay robust to payload evolution; the COALESCE decision already points here; never rewrite stored events.
5. **Temporal -> REJECT as a platform** (second event spine, sovereignty violation, operational weight; our own mine's experiment stalled at stubs and violates Temporal determinism rules in its first 80 lines), with two ADAPT-grade takeaways recorded: the determinism discipline (journal nondeterministic inputs at explicit boundaries) and the getVersion pattern (worker-version markers in history).

**Honorable REFERENCE:** TigerBeetle's deterministic state-machine discipline for replay work; ORCA `agent-events.js` truncation discipline (never silently truncate telemetry); the `feature/temporal-durable-execution` branch kept as a reference for its mechanics-vs-truth constraint design.

---

## 8. FALSIFICATION ANALYSIS (binding addendum, Nolan 2026-09-30 ~18:15 MDT: do not protect PING from the evidence)

### 8a. Does a mature one-substrate system exist?

The mandate: report it if any mature system provides evidence provenance + identity resolution + object graph + owner intent + capabilities + cross-channel projection + outcome history as ONE coherent lightweight substrate. Finding: **no such system was found in this lane's scope.** What the ecosystem actually offers, per the candidates evaluated:

- **Temporal:** durable execution + history. No evidence-provenance semantics, no object graph, no owner intent, no capability model, no cross-channel projection. Execution mechanics, not an intelligence substrate.
- **EventStoreDB / Axon:** journal + projections. No identity resolution, no owner intent, no capabilities; projections are read models, not channel adapters.
- **OpenTelemetry:** observation plane only. Locator IDs (trace/span), no identity resolution, no object graph, no owner intent.
- **CloudEvents:** envelope only. **SLSA/Sigstore:** artifact provenance only.

No examined system unifies all seven concerns. The falsification attempt failed, which is itself evidence: this lane's research supports, not refutes, the thesis that the unified substrate is PING's differentiated part. Stated plainly per the mandate: the commodity half is real and large, but the "one coherent substrate" does not exist off the shelf.

### 8b. Could Postgres plus libraries replace ~80 percent of PING?

Honest component-by-component accounting, scoped to this lane (event/replay/observability). I did not audit the full PING architecture, so no claim is made beyond this scope.

**Commodity-replaceable mechanics (roughly half the machinery in this scope):** ping_events storage, the append-only trigger, and the sequence column are plain Postgres DDL. The /events traversal API is recursive CTEs, already just SQL. MissionRuntime's job mechanics (leases, retries, retry_at) could be replaced by a Postgres-backed durable job library (pg-boss, graphile-worker). Trace propagation is the OTel SDK. Attestation format is SLSA/Sigstore. Envelope discipline is CloudEvents.

**No library equivalent found for:** content-addressed semantic event identity with dedup; verdict-class admission authority with event-type validation and fail-closed governance; the namespace privacy boundary enforced through workers into knowledge; semantic collision detection; event-to-knowledge provenance bindings (source_event_id, confidence_provenance); the certification ledger semantics (DEPLOYMENT_CERTIFIED as canonical events).

**What a wholesale replacement would lose:** single-writer enforcement, fail-closed governance, deterministic identity/dedup, and the evidence bindings that make "why does the system believe this" answerable. The 80-percent hypothesis does NOT hold for this scope: roughly half the mechanics are commodity, the guarantees are not. The correct posture per the evidence is libraries for the commodity half, PING-owned code for the authority/governance/provenance half, which is exactly what the WRAP/ADAPT classifications above implement.

### 8c. North-star layer model: attempted disproof

Model under test (not constitutionalized): L0 observation/evidence -> L1 object/relationship -> L2 owner intent/visibility -> L3 capability/authorization -> L4 experience IR -> L5 projection adapters -> L6 interaction/outcome evidence, with AI operating across layers and owning none.

- **OTel** (Resource -> Scope -> Span/Metric/Log) is a signal layering living entirely at L0 (observations) and L6 (telemetry as outcome evidence). It has no L1-L4. No contradiction; it sits below the model, not beside it.
- **Temporal** (history as truth) collapses L0 with execution and has no L1/L2/L3. Different axis: durable execution versus intelligence substrate. Its history -> replay -> history loop CONFIRMS the L6 -> L0 feedback shape.
- **Event sourcing / CQRS** (events -> aggregates -> projections) maps cleanly onto L0 -> L1 -> L5, with no native L2/L3. This supports the north-star as a superset rather than refuting it.
- **SLSA** (source -> build -> artifact) is provenance OF L4/L5 artifacts: orthogonal, and confirms L4/L5 as artifact layers that need provenance.

**Strongest challenge found:** L2 (owner intent/visibility) and L3 (capability/authorization) look less like stacked layers and more like cross-cutting concerns. Evidence from every mature system studied: authorization and visibility are enforced at boundaries, not as a horizontal stage. PING's namespace rides inside the event envelope; OTel validates baggage at propagation edges; Sigstore pins identity at the signing and verifying edges; CloudEvents keeps tenantid as an envelope extension checked by consumers. A pure stack would place authorization between the object graph and the IR; the ecosystem places it at every edge.

**Counter-evidence:** PING's L2 genuinely feeds L4 (owner overrides shape SiteSpec), which is layer-like behavior, not just a filter.

**Verdict:** the attempted disproof did not disprove. Refinement proposed, not constitutionalized: treat L2/L3 as BOTH a layer (intent and capability flow down into L4) AND a cross-cutting enforcement plane (checked at every layer boundary). The stack diagram should show them as a vertical bar alongside the horizontal flow, not only as rungs.

### 8d. REJECT exception criteria (the FYD WILL NOT BUILD ledger is enforced, not absolute)

Per the addendum, every REJECT carries the evidence bar for revisiting:

- **Temporal as a platform:** revisit ONLY IF all three hold: (a) a measured incident shows MissionRuntime leases/retries insufficient for a genuine need such as durable timers or signals surviving restarts; (b) a bounded experiment demonstrates the mechanics-vs-truth constraint surviving replay-divergence tests; (c) the determinism discipline is lint-enforced (the current experiment branch violates it in its first 80 lines). All three, not one.
- **EventStoreDB or any event store as canonical storage:** revisit only if Postgres operationally outgrows the event log AND the replacement preserves single-writer, append-only, and content-addressed identity. Note it buys no upcasting anyway.
- **OTel backend stack (Collector, Tempo, Jaeger, Prometheus):** revisit on measured query pain when projecting spans or metrics from ping_events, not on anticipated volume.
- **CloudEvents SDK adoption or column renames:** revisit if a major external integration demands native CloudEvents binary-mode interop; the mapping table suffices until then.
- **Any new event bus, event table, or event writer:** no revisit without Nolan's explicit word. The bar is proven representational failure of ping_events, per standing law.

---

## 9. TEN CLOSING QUESTIONS (final; closes the report per the binding addendum)

1. **WHAT DID WE THINK WE NEEDED TO BUILD?** A full observability stack: metrics, traces, audit log, replay machinery, deployment certification, each as its own subsystem.
2. **WHAT ALREADY EXISTS?** One genuinely good thing: a canonical append-only event log with content-addressed identity, separated causation/correlation/order, an auth-gated lineage API, and a decided (not implemented) source-to-served certification chain. Plus unwired seams (TracePort/MetricsPort) exactly where the commodity plugs in.
3. **WHAT IS COMMODITIZED?** Trace context propagation (W3C/OTel), event envelope shape (CloudEvents), build provenance (SLSA/Sigstore), schema-evolution patterns (upcasting), the determinism discipline for replay (Temporal's rules). None of these need inventing.
4. **WHAT REMAINS UNSOLVED?** Reconstructive replay as an exercised runtime path (vocabulary emitted, machinery unwired); the DEPLOYMENT -> PROCESS -> SERVED half of the certification chain (SLSA stops at ARTIFACT); request_id at ingress; durable governance verdicts; the Pig-plane append-only gap.
5. **WHAT SHOULD FYD HARVEST?** Nothing directly: FYD emits no events and needs no tracing of its own. FYD inherits whatever PING provides (trace context on Ask FYD requests, evidence bindings from the event log). FYD's harvest is staying a consumer, not building a producer.
6. **WHAT SHOULD FYD NEVER BUILD?** Its own event bus, its own correlation-ID scheme, its own deployment attestation system. All three live in PING or in commodity tooling. Per the addendum these are enforced-ledger entries, not absolute prohibitions: each carries exception criteria (section 8d), and internal build needs explicit evidence the existing solution fails a FYD requirement.
7. **WHAT EXISTING PING CODE IS NOW DUPLICATIVE?** The DUPLICATION TO KILL list in section 5: the lossy event bus, ten dormant writers, eight dead tables, unwired providers, env fiction, fabricated UI numbers, the temporal experiment branch.
8. **WHAT NEW OPTIONALITY DOES THIS CREATE?** Wrapping OTel behind TracePort keeps every future backend (or none) a config choice; journaling deployment certification into ping_events makes the certification chain queryable like any other lineage; the upcaster registry makes payload evolution a routine read-path concern instead of a migration project.
9. **WHAT ASSUMPTION DID THIS FALSIFY?** Two. First, that PING needs an observability "system" built: the industry commoditized every plane PING lacks except the two things that are genuinely PING's (the canonical event log and the source-to-served certification ledger). Second, per the falsification mandate: that a mature one-substrate system exists off the shelf, and that Postgres plus libraries could replace ~80 percent of PING. Neither held (section 8a/8b). Also falsified in passing: that Temporal could be safely wrapped (our own experiment branch violates Temporal's determinism rules in its first 80 lines).
10. **WHAT ONE EXPERIMENT WOULD SETTLE THE REMAINING QUESTION?** Replay one real mission end-to-end from ping_events through current worker code with a recorded worker-version marker, and diff the reconstructed outcome against the original: a single honest replay run settles whether the log is actually reconstructive or merely archival.
