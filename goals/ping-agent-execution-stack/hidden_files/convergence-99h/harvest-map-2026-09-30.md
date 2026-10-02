# ECOSYSTEM HARVEST MAP 2026-09-30
## Synthesis of 10 reader lanes, CEO-ORDER-ECOSYSTEM-HARVEST-2026-09-30 plus the ADDENDUM (HARVEST FOR OPTIONALITY, binding, Nolan, 2026-09-30 ~18:15 MDT)

Coordinator: harvest sweep coordinator (subagent). Date: 2026-09-30 ~18:30 MDT.
Posture: read-only synthesis. No code changed, no installs, no pushes. Reports are the only artifacts.

Ten lane reports synthesized (all on disk at `harvest-lanes-2026-09-30/`):
1. 01-acquisition-web-understanding (Crawl4AI 0.9.4 postmortem validates the one-seam law)
2. 02-digital-twin-knowledge-representation (Wikidata/Splink/Datomic patterns into Postgres)
3. 03-agent-execution-runtimes (interrupt + typed receipts as patterns, platforms rejected)
4. 04-permissions-authorization-policy (v0 live, one proven gap: attenuated delegation)
5. 05-cms-visual-editing (Puck/Lexical WRAP, backends REJECT as second truth stores)
6. 06-local-first-collaborative-state (CRDT REFERENCE only, SiteSpec hygiene checklist)
7. 07-protocol-federation-agent-interop (MCP WRAP as perimeter, ATProto ADAPT, never authorizer)
8. 08-search-retrieval-memory (RRF + server-side Qdrant filters ADAPT, pre-generation binding beats the market)
9. 09-marketing-growth-intelligence (always-valid inference ADAPT, metric schema ADAPT, Meridian LEARN)
10. 10-observability-event-systems-replay (SLSA/OTel/CloudEvents, Temporal REJECT, falsification attempted)

Common evidence note: every lane recorded `/home/nolan/projects/ping` as unreachable from its sandbox and used workspace/Pig evidence instead. Lane 4 reached the Pig directly via pigwsl-exec and verified PING's capability system against live code; its findings on the reached system are the strongest first-party verification in the sweep.

---

## 1. THE REFRAMED ANSWER: THE SMALLEST PART THAT DESERVES TO EXIST

The addendum asks: what is the minimum FYD substrate that preserves maximum future optionality? The ten lanes converge on this answer:

**PING's irreducible core (own):** the canonical append-only event log with content-addressed identity and a single admission authority; the evidence authority (verify/rank, ADD-only); the claim/evidence/provenance model with pre-generation grading and fail-closed refusal; the capability/authorization primitives (operator caller registry, digest-bound proposals, typed approval/denial with event evidence, tenant boundary that refuses before I/O, the v0 credential boundary where agents hold capabilities and executors hold secrets); the mission runtime (idempotent creation, atomic claims, leases, retry-to-dead-letter, emission-gated completion); the namespace privacy boundary.

**FYD's irreducible core (own):** SiteSpec as a declarative data IR (kind `fyd.sitespec@1`); the BindingVerifier invariant (every factual public render value must have a valid binding to an authorized graph value/evidence basis, generated copy typed distinctly, UNBOUND fails closed); the design-system compiler (no arbitrary CSS generation, ever); the deterministic acquisition policy gate (the single SSRF-hardened seam); the deterministic render model (same ObjectGraph + OwnerIntent + SiteSpec version + Renderer version + ViewerContext class yields the same semantic RenderModel).

**Everything else is projection or commodity.** The website is the first product expression, not the asset. The asset is: WHAT THE ENTITY IS / WHAT WE KNOW ABOUT IT / WHY WE BELIEVE IT / WHAT IT OWNS / HOW IT RELATES / WHAT THE OWNER WANTS / WHAT ACTIONS ARE ALLOWED / WHAT ACTUALLY HAPPENED. No lane found a mature system that already provides all of that as one coherent lightweight substrate, and no lane disproved the L0-L6 north-star model (see section 6).

The lanes' collective answer to "what code can we delete or never write because this ecosystem already solved the commodity part" is the DUPLICATION TO KILL section below. The lanes' collective answer to "what must we still own" is the SURVIVED PRIMITIVES ranking (section 4/5).

---

## 2. HARVEST MAP

### 2.1 UNWIRED GOLD (capability possessed but not reached)

Things we already have that are not yet wired, reachable, or exercised. These are the cheapest wins in the sweep because no external dependency is involved.

- **TracePort/MetricsPort abstract seams (lane 10):** the exact interfaces an OTel provider would implement. Keep the seams; they are the wrap point.
- **The auth-gated /events traversal API (lane 10):** children/descendants/ancestors/correlation-group, already protected. A real lineage query surface.
- **`schema_version` in prod metadata (lane 10):** the hook for envelope versioning and upcasting, present but unconventioned.
- **WITNESS_CREATED / REPLAY_COMPLETED event types (lane 10):** emitted vocabulary with no consumers. The replay story starts here.
- **The append-only trigger + sequence column on the Oracle plane (lane 10):** same guarantees missing on the Pig plane. Known convergence gap.
- **CRX `feature/namespace-entitlements` @ 49d25df (lane 4, intra-ecosystem gold):** 55 lines adding `authorizeNamespace()` validating explicit namespace claims against a per-principal entitlement map, with ingest routes authorizing against the authenticated principal, never `body.source`. Unmerged side work; the pattern is ADAPT-worthy. The rule "body.source is provenance, never authority" is the single most valuable line.
- **The SitePatch seam as the only edit channel (lanes 5, 6):** digest-bound site-patch proposals + human approval + draft/published lifecycle with revision history. The future visual editor plugs here, not around it.
- **Experiment-record payload shape on MissionRuntime (lane 9):** hypothesis/treatment/metrics/guardrails/window/outcome belongs in the EXPERIMENT_RUN mission payload; the statistical scorer behind it is missing.
- **The v0 credential boundary direction (lane 4):** P0-SECRET-01 live (139/139 falsifier, 234/234 selftests). Residual delta: SECRET REFERENCE to AUTHORIZED BROKER and retiring the dormant `explicitToken` valve.

### 2.2 EXTERNAL GOLD (external primitives eliminating meaningful commodity code)

- **MCP official TypeScript SDK v2 (lane 7):** WRAP. When a reached product arrow needs an external agent perimeter, wrap the official SDK behind PING's capability/approval interface. Framing, versioning, discovery, and task polling are solved commodity. Never the authorizer (the spec has no per-call authorization; PING's approval authority gates every tools/call).
- **OpenTelemetry trace context (lane 10):** WRAP behind TracePort. W3C traceparent fills the request_id-at-ingress gap; spans are a side channel, never truth. Semantic conventions are the attribute vocabulary.
- **SLSA provenance + Sigstore keyless signing (lane 10):** ADAPT. Nolan's SOURCE to BUILD to ARTIFACT to DEPLOYMENT to PROCESS to SERVED BYTES to SERVED BEHAVIOR chain is binding law with zero implementation; the stale-image failure it prevents has been proven twice. Journal DEPLOYMENT_CERTIFIED events into ping_events. No custom signing PKI, no attestation format, no provenance sidecar.
- **Playwright 1.63, pinned with its browser build (lane 1):** ADOPT as the L2 render adapter behind the existing AcquisitionAdapter interface. Bounded implementation of a designed slot.
- **@mozilla/readability (lane 1):** ADOPT, pinned. The single missing commodity primitive in FYD's L1 (boilerplate-stripped main content). Pure JS, zero native deps, tens of lines of wrapper.
- **Puck @puckeditor/core (lane 5):** WRAP behind a SiteSpec adapter. MIT self-hosted editor shell; config generated from FYD's component registry; publish through the digest-bound proposal gate. Never Puck Cloud AI (design mode violates "no arbitrary CSS generation, ever").
- **Lexical (lane 5):** WRAP when FYDPresentation.copy outgrows plain strings. JSON-tree rich text behind the presentation-binding seam; never a hand-built editor.
- **Always-valid sequential inference, mSPRT / confidence sequences (lane 9):** ADAPT. Port the published closed-form construction (~100 lines of pure code, no dependency) as the deterministic scorer behind EXPERIMENT_RUN result JSONB. Turns "never declare a winner early" from operator discipline into machine-enforced mathematics.
- **Normalized metric schema + UTM taxonomy (lane 9):** ADAPT. Adopt the Buffer/GA4 source/medium/campaign convention verbatim; port the normalized-row schema as deterministic code. Cheapest delta in the lane and the prerequisite for everything statistical.
- **Qdrant native hybrid (lane 8):** ADAPT. Server-side filters (fixes the audit's WEAK-filter finding, a privacy boundary) + sparse/BM25 prefetch with server-side RRF fusion. Keep the thin no-dependency adapter.
- **RRF (lane 8):** ADAPT. ~15 lines replacing the naive concat fusion in hybrid_search.js; envelopes and the verification gate stay.

### 2.3 PATTERN GOLD (design worth stealing, no dependency)

- **Content source maps through the render pipeline (addendum signal, lane 5 gap):** Sanity's mechanic (rendered value maps to source document + field, stable keyed selectors surviving reordering) ported onto FYD's deeper chain: RENDERED VALUE to OBJECT FIELD to CLAIM to EVIDENCE to OBSERVATION to EXTERNAL SOURCE. Powers both EDIT THIS and WHY THIS. The harvest is a generalized SourceBinding carried by the render model (render node to object field to evidence refs); the renderer cannot casually invent factual content because factual render nodes require bindings. (See section 8.)
- **Design system as machine-readable capability surface (addendum signal, lane 5):** one vocabulary (FYD component registry + design tokens + constraints) for site planner, owner editor, agent, and renderer. Prevents generated-site entropy. FYD's design-system compiler already owns the law; the harvest is exposing it as the shared contract.
- **Attenuated capability tokens, macaroon construction (lane 4):** ADAPT. Chained-HMAC caveats ported into PING's registry as the grant envelope. Closes the one proven gap in the reached capability system: delegation with attenuation, no operator round trip, no ambient authority. Do not adopt a macaroon library (fragmented, unmaintained); the construction is ~200 lines to own.
- **RFC 8693 delegation chains (lane 4):** ADAPT. Optional `delegation: [{principal, capability, at, attenuated_from}]` chain on the work order; the dispatcher appends its hop; the 403 gate rejects chains with revoked links. Under 100 lines. The audit half of the macaroon grant.
- **ATProto Lexicons + granular scopes (lane 7):** ADAPT. Port the schema pipeline direction (published schema docs, content-hash pinning, generated validators and types), the scope grammar (resource:positional?params), and progressive consent into PING's own capability layer. This directly repairs PING's two documented defects: weak custom validators and fail-open permission checks. Explicitly excluded: DIDs as identity authority, Sync as an event spine.
- **MCP 2026-07-28 authorization mechanics (lane 4):** REFERENCE, mirror four items at PING's own boundary: audience binding (every grant names its exact resource), the no-transit rule (an executor must not accept or forward a capability token minted for a different hop), WWW-Authenticate-style machine-readable denial guidance on the 403 gate, and a protected-resource-metadata analog (machine-readable capability surface document).
- **Wikidata statement model (lane 2):** ADAPT into Postgres. Claim rank (preferred/normal/deprecated), references, qualifiers (valid_from/valid_until/point_in_time, determination method), rank_reason. Buys preserved source disagreement, temporal facts, per-claim provenance. No new store.
- **RDF 1.2 statement/assertion identity split (lane 2):** ADAPT into the Postgres claim schema. A claim row is the canonical statement (content hash of subject/predicate/object); assertion rows carry (claim_id, source_event_id, evidence_state, confidence, asserted_at). Dedup falls out naturally.
- **Splink Fellegi-Sunter pattern (lane 2):** ADAPT the pattern into PING's Postgres resolver (candidate blocking on indexed keys, weighted field scoring, every decision recorded as an event with factor breakdown, below-threshold pairs to a review queue, never auto-merged). Splink itself stays an offline calibration REFERENCE, never a runtime dependency.
- **Datomic transaction-as-entity + valid-time axis (lane 2):** ADAPT two ideas into Postgres: make the transaction/ingest a first-class row (who/why/correlation id) that facts reference; add valid_from/valid_until to the claim/fact table (bitemporal-lite).
- **Durable interrupt: checkpoint before pause, lease-exempt while awaiting human, resume through the claim path (lane 3):** ADAPT. Add `awaiting_approval` (or `suspended`) mission status: lease-exempt, checkpointed in JSONB, resumable through the atomic claim path. Sources: LangGraph interrupt/checkpoint, MAF approval-request events. This is the machinery the CEO-ordered reconcile gate needs when the first external-effect worker arrives.
- **Typed approval requests (lane 3):** ADAPT. An approval request is a canonical event with a request_id; the approval response is a canonical event referencing that request_id and carrying the authenticated approver principal. Source: MAF FunctionApprovalRequestContent.
- **Typed receipts (lane 3):** ADAPT. Each mission_type declares its result schema; complete() validates before the emission-gated MISSION_COMPLETED event. Tens of lines. Source: PydanticAI output_type discipline.
- **Temporal determinism discipline + getVersion (lane 3, lane 10):** ADAPT. Push nondeterminism to explicitly journaled boundaries (journal the input, not just the output); record worker-code version markers in history so replay branches explicitly instead of diverging silently.
- **CloudEvents envelope discipline (lane 10):** ADAPT. Type-versioning rule (additive keeps the type; breaking mints a new type; never rewrite stored events); formalize the existing `schema_version` key; publish the ping_events to CloudEvents mapping table. No SDK, no column renames.
- **Event-sourcing upcasting (lane 10):** ADAPT the Axon EventUpcasterChain shape with enforced ordering: pure functions keyed by (event_type, from_version) applied only on replay/projection read paths, never at write. ~100 lines plus tests.
- **OTel span links (lane 10):** ADAPT. Optional `links` array in event metadata for non-parent associations (batch fan-in, retried-then-superseded chains), which the single causation_id cannot express.
- **GrowthBook experiment-record schema + check order (lane 9):** ADAPT the schema only (goal/guardrail/secondary metrics, guardrail-first reading, SRM-analog integrity gate, won/lost/inconclusive verdicts). REJECT the engine (randomization model mismatch for organic content).
- **SparkToro attention-affinity method (lane 9):** ADAPT the method onto PING's own observations (behavioral cohort selectors, one-vote-per-member aggregation, baseline-relative affinity, shown confidence). REJECT the vendor data product (no purchase, no rented audience database).
- **NIP-46 permission grammar + NIP-33 parameterized replaceable records (lane 7):** LEARN. Remote-signer permission grammar (method[:params]) with key-custody separation; d-tag addressing for mutable records on immutable logs.
- **Senzing entity model (lane 2):** LEARN. Record/entity/relationship separation, sequence-neutral re-evaluation, withheld ambiguity. The product itself is rejected as a second truth store.
- **OpenHands sandbox shape (lane 3):** LEARN. Per-session sandbox tier as the future home of side-effecting workers (typed action events, isolated container over a bounded API, observations back on the stream). REJECT the platform.
- **Sanity Presentation overlay (lane 5):** LEARN. Editor-as-projection overlay (click-to-edit on the served render) as the reference design for owner visual editing; the hosted content lake stays out.
- **Payload blocks/lexical patterns (lane 5):** LEARN. Blocks-field composition schema and Lexical integration as reference implementations; the CMS backend is rejected as a competing truth store.
- **Scrapy politeness algorithms (lane 1):** LEARN. Latency-adaptive backoff and dupefilter/HTTP-cache pairing for when L3 discovery is built. FYD's robots policy is already stricter.
- **Lightpanda tier-routing (lane 1):** REFERENCE. HTTP to JS-lite to Chromium, cheapest capable first. Keep the existing pilot plan; no code until beta stabilizes and AGPL clears legal.
- **Crawl4AI design patterns (lane 1):** ADAPT patterns only. CMP consent-dismissal list, shadow-DOM flattening, anti-bot detection tiers as telemetry, seeder-first discovery ordering. Its 0.9.4 SSRF postmortem validates the one-seam law.

### 2.4 DUPLICATION TO KILL (recommendations only; no action taken)

Per the addendum, readers open falsification threads with owning lanes; owning lanes respond with evidence; consolidate to KEEP/WRAP/MERGE/RETIRE/DELETE. These threads are OPEN, not executed.

- **T1 (lane 1):** `src/fyd/net/safe-fetch.ts` vs LANE ACQ-1 `acquire-url.ts`: two SSRF-hardened fetch seams. Converge into exactly one seam. Crawl4AI 0.9.4's postmortem (their robots.txt fetch and seeder used their own HTTP clients; both became SSRF advisories) is the industry proof that parallel fetch implementations drift into vulnerabilities. Owning lane: FYD acquisition.
- **T2 (lane 10):** `ConstitutionalEventBus` vs `UnifiedEventRuntime` (the bus is proven lossy; UER is canonical); the ~10 dormant direct writers to the legacy `events` table (each one instantiation away from forking truth); eight dead tables with zero rows and zero writers (`canonical_events`, `events`, `repository_events`, `mission_events`, `event_outbox`, `audit_log`, `telemetry_metrics`, `lineage`); unwired telemetry providers and `OTEL_*`/`LOKI_URL` env fiction; fabricated ui-next "live" metrics (`Math.random()`) and the hardcoded `generated_runtime_authoritative: true`; the never-merged `feature/temporal-durable-execution` branch (second spine in waiting; extract its mechanics-vs-truth constraint design as reference, then archive). Owning lane: PING runtime.
- **T3 (lane 7):** the weak custom parameter validator in ToolGateway (ignores JSON-Schema required). Replace with generated validators from published, content-pinned schemas in the Lexicon direction. Owning lane: PING tool plane.
- **T4 (lane 8):** the client-side post-retrieval namespace filter in `hybrid_search.js` (move server-side into Qdrant prefetches; privacy boundary, not quality tweak) and the naive concat-then-`evidence.rank` fusion (replace with RRF). Note the KG leg's `verified: true`-by-assertion should become real verification or be labeled asserted when touched. Owning lane: gateway.
- **T5 (lane 4):** the archived `ExteriorAuthMiddleware` stays archived (superseded by the operator caller registry + capability registry); rename `pig-fb/capability-registry.json` (worker strategy projection) to kill the name collision with the auth capability registry; retire the dormant `explicitToken` valve in credential-boundary.js in favor of secret references. Owning lane: pig-fb broker.
- **T6 (lane 10):** the Pig-plane append-only gap: no append-only trigger, no sequence column (Oracle plane has both). Wire the same guarantees. Owning lane: PING runtime.
- **T7 (lane 6):** index-derived section IDs (`pageSlug:component:index`) are position-dependent identity. Plan creation-time stable IDs that survive insert/move. Recorded as a follow-up, not implemented in any lane. Owning lane: FYD SiteSpec.

### 2.5 REJECTED (with reasons and exception criteria)

The ledger is enforced, not absolute. Every REJECT carries the evidence bar for revisiting.

- **Crawl4AI as a dependency or Docker server (lane 1):** would duplicate L0-L4 in Python behind a second network surface; demonstrated advisory cadence (5 in 0.9.3, 3 in 0.9.4, one month apart). Revisit: none realistic.
- **Firecrawl (lane 1):** hosted is a third-party content path violating the one-seam law; self-host is five containers re-owning owned primitives. Revisit: none.
- **Browserbase (lane 1):** proprietary SaaS whose headline features (stealth, proxies, CAPTCHA solving) contradict FYD's standing anti-circumvention policy. Revisit: none.
- **Builder.io (lane 5):** hosted parallel stack with open XSS-class issues; adopting strands SiteSpec and the deterministic renderer. Revisit: none.
- **A schema-driven admin CMS backend as content authority (lane 5):** Payload/Sanity backends are competing truth stores next to the object graph. Revisit: a reached product arrow requiring multi-tenant admin content that cannot live in the object graph.
- **Adopting a CRDT now (lane 6):** no simultaneous-editing workload exists; a second edit channel beside the SitePatch seam; sync infrastructure is a new subsystem. Revisit: a specified concurrent owner/agent/offline flow, then behind a narrow interface, draft layer only.
- **Automerge-repo / sync servers / hosted sync infrastructure (lane 6):** whole infrastructure around an unused core. Revisit: with the CRDT adoption trigger above.
- **Temporal as a platform (lanes 3, 10):** second event spine, sovereignty violation, operational weight; our own experiment branch violates Temporal determinism rules in its first 80 lines. Revisit only if: a measured incident shows MissionRuntime leases/retries insufficient for durable timers/signals; a bounded experiment survives replay-divergence tests; the determinism discipline is lint-enforced. All three.
- **LangGraph / MAF / OpenHands / CrewAI as frameworks (lane 3):** each wants to become mission truth, the dispatch brain, or a second worker kingdom. Harvest patterns only. Revisit: none; the brain/hands law stands.
- **OpenFGA / SpiceDB / Zanzibar (lane 4):** second authorization authority; tuples replicate what the tenant namespace already decides. Revisit: a reached arrow requiring multi-hop relationship authorization the tenant boundary cannot express (e.g., two tenants sharing one object with different per-object relations).
- **Cedar engine / OPA (lane 4):** second policy decision point; "authority is prose in Rego" is the failure mode. Revisit: policy count or change rate makes code-enforced gates unmaintainable (trigger: 50+ distinct policies changing faster than weekly with non-operator authors), or a polyglot executor fleet where in-process gates cannot be the single implementation.
- **PydanticAI as a worker plane (lane 3):** Python-only, agent-loop not runtime. Revisit: none.
- **GraphRAG as a system (lane 8):** cost, factoid underperformance, KnowledgeGraph authority duplication, provenance-hostile LLM summaries. Revisit: none; citation discipline already learned.
- **Post-hoc NLI citation checking at runtime (lane 8):** probabilistic, strictly weaker than the deterministic pre-generation grade-and-throw. Revisit: none at runtime; metrics usable offline.
- **A neural reranker before a consumer exists (lane 8):** RAG theater; the DAWN precedent shows zero lift at 10x latency. Revisit: a real consumer plus measured lift.
- **A new memory system, Mem0/Zep-style (lane 8):** the audit's findings are broken paths, not a missing authority. Revisit: proven representational failure of the existing paths.
- **A universal job market, NIP-90-style (lane 7):** PING missions are already the typed work queue. Revisit: none.
- **A second event spine of any kind (lane 10):** EventStoreDB, any new bus, any new event table or writer. Revisit: Nolan's explicit word only; the bar is proven representational failure of ping_events.
- **An OTel backend stack (lane 10):** Collector/Tempo/Jaeger/Prometheus are unneeded weight; spans project from ping_events. Revisit: measured query pain when projecting.
- **A Bayesian attribution/MMM product today (lane 9):** Meridian on page-level data would be fake learning. Revisit: real geo-granular spend/outcome data exists; then re-evaluate ADOPT of the library itself.
- **Content bandits for allocation (lane 9):** wrong tool for the regime (tiny traffic, unstable arms). Revisit: a high-traffic, stable-arm allocation problem actually appears.
- **A custom agent wire protocol (lane 7):** WRAP the MCP SDK when needed; never invent. Revisit: never.
- **Hand-rolled sequential-testing math, experiment schemas, UTM taxonomies (lane 9):** the published methods are the commodity. Revisit: none.

### 2.6 OPTIONALITY TO PRESERVE

- **Visual editing:** Puck behind the SiteSpec adapter; replaceable without touching truth.
- **Rich text:** Lexical behind the presentation seam; only when plain strings stop sufficing.
- **Draft convergence:** Automerge/Yjs behind a "converge drafts, then emit a structured patch" interface; not integrated until a real concurrent flow exists.
- **External agent perimeter:** official MCP SDK v2 behind the capability/approval interface; no writer time until a reached product arrow needs it.
- **Federation:** Fedify as the future adapter, strictly outside the trust kernel; inbound activities enter as UNVERIFIED observations.
- **Reranking:** verify-then-rerank contract (trust outranks relevance); no model in the path until a consumer and measured lift.
- **Trace backend:** OTel behind TracePort, or no backend at all; spans are a side channel.
- **Attribution:** Meridian/GeoX as reference; adopt nothing until real geo-granular data exists.
- **Browser tiers:** Lightpanda pilot behind the Chromium truth gate; fallback-rate gate under ~20% before expanding.
- **Experiment inference:** the always-valid scorer behind EXPERIMENT_RUN result JSONB; the 30-post protocol keeps running as prose law until then.

---

## 3. COMMODITY BOUNDARIES

**COMMODITY (rent, wrap, adapt, or reference; never own the machinery):** crawl patterns; the browser engine; the CMS editor shell; the rich-text engine; visual-overlay editing plumbing; protocol interop and wire framing (MCP SDK); event envelope shape (CloudEvents); trace context propagation (OTel); token constructions (macaroon/Biscuit shapes); sequential-testing mathematics; experiment-record schema; metric taxonomy; CRDT convergence; scope grammars; deployment attestation tooling (SLSA/Sigstore); schema-definition language shape (Lexicon direction); sandboxing shape for side-effecting workers; attention-affinity scoring discipline.

**OWN (evidence semantics, user intent, authorization, outcomes; the differentiating substrate):** the canonical event log and its admission authority; content-addressed identity with separated causation/correlation/persistence order; the evidence authority and per-result evidence envelopes; pre-generation claim grading with fail-closed refusal; the claim/assertion identity split with ranks, references, and qualifiers; entity resolution with explainable scoring and review queues; the capability registry with attenuated delegation and auditable chains; digest-bound proposals with typed approval/denial and event evidence; the tenant boundary that refuses before I/O; the v0 credential boundary (agents hold capabilities, executors hold secrets); the namespace privacy boundary enforced through workers into knowledge; the BindingVerifier invariant at the projection boundary; SiteSpec as the declarative experience IR with deterministic rendering; the deterministic acquisition policy gate and the single fetch seam; owner intent and visibility policy as separate truths from evidence; outcome learning (five separate scores, confidence bookkeeping, negative knowledge, claim-level outcome binding).

The through-line the lanes kept rediscovering: software decides what is true and possible; intelligence proposes presentation. Owner owns publication intent; evidence and visibility policy are separate truths.

---

## 4. PING PRIMITIVES THAT SURVIVED FALSIFICATION

Ranked by: product value / differentiation / optionality created / replacement cost / proof quality / maintenance cost. Nothing is preserved just because it was built; the lanes tried to kill these and could not.

1. **Canonical append-only event log (UnifiedEventRuntime, single writer):** content-addressed event IDs, append-only trigger on the Oracle plane, auth-gated traversal API. The substrate every evidence claim rests on. Proof: audited 2026-09-22, live row counts, replay vocabulary emitted. Maintenance: low.
2. **Pre-generation claim grading + fail-closed refusal (Ask FYD):** SUPPORTED/DERIVED/INFERRED/UNKNOWN graded before rendering; the module throws rather than render an uncited SUPPORTED claim; 152 tests plus hostile fixtures. The strongest position in the sweep: strictly stronger than anything in the external RAG market. Proof: highest. Maintenance: low.
3. **Evidence authority (verify/rank, ADD-only):** every retrieval result carries `{canonical_hash, namespace, confidence, evidence:[eventIds], verified, source}` tracing to ping_events. Proof: audited. Maintenance: low.
4. **Capability/authorization primitives:** operator-provisioned caller registry (identities 1-4, rest denied); digest-bound proposals (exact canonical bytes + sha256); typed approval/denial with event evidence; tenant boundary refusing before I/O with typed REJECTED; the v0 credential boundary (P0-SECRET-01: 139/139 falsifier, 234/234 selftests; agents hold capabilities, executors hold secrets). Proof: strongest first-party verification in the sweep (lane 4 reached the Pig). Maintenance: low.
5. **MissionRuntime:** idempotent creation (sha256 mission_id, ON CONFLICT DO NOTHING), atomic claims (conditional UPDATEs, race losers get rowCount 0), leases with reclaim, retry-to-dead-letter, emission-gated completion (MISSION_COMPLETED must be accepted by the event authority before the row transitions). Proof: O4 repair proven, ITEM4 audit. Maintenance: low.
6. **Namespace privacy boundary (core::/tenant::):** fail-closed regex validation in the event pipeline, preserved through workers into knowledge. The privacy plane the lanes' server-side filter work extends. Proof: audited. Maintenance: low.
7. **The four-way identity separation:** semantic identity (content hash), causation_id, correlation_id, persistence order (sequence) kept distinct in schema and in production data. Ahead of most bespoke event systems; OTel keeps the same distinctions. Proof: verified in prod rows. Maintenance: low. (Known weak piece: correlation_id fragments; lifecycle grouping needs mission_id in metadata. Small delta.)

**Narrowed but kept:** MissionRuntime's row-state recovery (no code-level resumption needed today; the determinism contract formalized instead). The KG leg (starved promotion; incremental-promotion discipline adapted, no new builder).

**What the falsification mandate could not kill:** no lane found a mature one-substrate system covering evidence provenance + identity resolution + object graph + owner intent + capabilities + cross-channel projection + outcome history (lane 10 attempted explicitly and failed). The Postgres-plus-libraries 80% hypothesis did not hold: roughly half the mechanics in lane 10's scope are commodity, none of the authority/governance/provenance guarantees are.

---

## 5. FYD PRIMITIVES THAT SURVIVED FALSIFICATION

Ranked by the same criteria.

1. **BindingVerifier:** the factual-binding gate at the evidence/object-graph projection seam. Presentation bindings classified direct/derived/generated/owner_authored; UNBOUND fails closed at the emission gate. No external equivalent found. This is the seam any visual editor's output must pass through, and the candidate home of the generalized SourceBinding (section 8).
2. **SiteSpec as declarative data IR:** kind `fyd.sitespec@1`; pages/sections with component registry names; FYDQuery tagged unions (declare how to fetch, never the objects); theme tokens; draft/published status with revision; deterministic render model via resolveQuery (updatedAt desc, id tiebreak). Verified clean against the addendum's attack list: expresses pages/sections/object queries/components/design tokens/capability bindings/owner overrides/source bindings; contains no arbitrary JS, no secrets, no DB queries, no customer React, no canonical truth. One hygiene smell: index-derived section IDs (T7).
3. **Design-system compiler:** "no arbitrary CSS generation, ever." The LLM/agent proposes intent patches; the owner approves; the compiler renders. The shared vocabulary the addendum asks for.
4. **Deterministic acquisition policy gate:** L0 canonicalization + SSRF gate + registrable-domain allowlist + robots honored with no off switch + per-domain rate limiting; L1 static fetch with provenance (url, finalUrl, redirectChain, fetchedAt, evidenceHash, policyNotes, typed escalation). 58/58 hostile battery passes. The one-seam law, now validated by an industry postmortem.
5. **ObjectProvenanceView:** one provenance record per rendered field with a quiet customer-facing line. The existing display surface the deeper SourceBinding chain extends.

**Ask FYD posture confirmed (lane 8, verified in source):** fully evidence-bounded, not artificially narrow; answers only from the public authorized object graph + public evidence + safe derivations; says it does not know when unsupported. That behavior is the product. The impressive demo is not "AI answers everything" but "AI knows what it knows."

**Media posture (addendum, standing):** ingest public business media when legitimately permitted; preserve source URL / observed_at / digest / MIME / dimensions / rights basis / derivative relationship; serve optimized derivatives; never permanent-copy arbitrary third-party media; never an uncontrolled image proxy.

---

## 6. LAYER MODEL FALSIFICATION VERDICT

Model under test (not constitutionalized): L0 observation/evidence -> L1 object/relationship -> L2 owner intent/visibility -> L3 capability/authorization -> L4 experience IR (SiteSpec, future FeedSpec/CampaignSpec) -> L5 projection adapters -> L6 interaction/outcome evidence. AI operates across layers, owns none.

**Verdict: not disproved.** Lane 10 tested it explicitly against OTel, Temporal, event sourcing, and SLSA: OTel lives at L0/L6 (no contradiction); Temporal collapses L0 with execution (different axis; its history-to-replay loop confirms the L6-to-L0 feedback shape); event sourcing maps cleanly onto L0->L1->L5 (the north-star is a superset); SLSA is provenance of L4/L5 artifacts (confirms them as artifact layers). No lane found an architecture the model cannot describe.

**Refinement proposed (not constitutionalized):** L2 (owner intent/visibility) and L3 (capability/authorization) are BOTH a layer (intent and capability flow down into L4) AND a cross-cutting enforcement plane (checked at every layer boundary). Evidence from every mature system studied: authorization and visibility are enforced at boundaries, not as a horizontal stage. PING's namespace rides inside the event envelope; OTel validates baggage at propagation edges; Sigstore pins identity at signing and verifying edges. The stack diagram should show L2/L3 as a vertical bar alongside the horizontal flow, not only as rungs. Counter-evidence: PING's L2 genuinely feeds L4 (owner overrides shape SiteSpec), which is layer-like. Keep both readings until the falsification threads weigh in.

**The moat, restated after falsification:** NOT cryptography, NOT replay, NOT objects, NOT agents. The moat is the compounding entity model: WHAT YOU ARE + WHAT YOU OWN + WHAT THE WORLD SAYS ABOUT YOU + WHAT YOU CONFIRMED + HOW YOU WANT TO PRESENT YOURSELF + WHO/WHAT YOU RELATE TO + WHAT HUMANS/AGENTS MAY DO + WHAT ACTIONS ACTUALLY WORKED. Website builder becomes one application. Social another. Concierge another. Marketing another. Agent automation another. That is why the data/authority layer matters.

---

## 7. THE ACQUISITION CONTRACT (formalized per the addendum)

Acquisition is a trust boundary, not a feature. Crawl4AI 0.9.4 is a security release (SSRF via robots.txt and link preview; env-var disclosure via a config gate bypass); its postmortem states the shared root cause: per-component HTTP clients that bypassed the one egress rule. FYD's contract:

**AcquireRequest:** URL + policy. The policy names: allowed schemes (http/https only), DNS-public requirement with IP pinning, redirect bounds with per-hop revalidation, content-type allowlist, size caps, depth bounds, browser-execution bounds, per-domain rate limits, robots handling. FYD owns the policy.

**AcquireResult:** observations + evidence + diagnostics. Observations carry provenance: url, finalUrl, redirectChain, fetchedAt, statusCode, contentType, bytes, levelUsed, evidenceHash (sha256 of raw bytes), policyNotes, typed escalation record. FYD owns result semantics and provenance.

**Crawler owns fetching only.** Implementations evolve behind the contract: static HTTP, Playwright L2, Lightpanda (behind the Chromium truth gate), future services. The acquisition worker runs on a separate network plane from the trusted app: constrained against localhost, private networks, cloud metadata, redirect-to-private, DNS rebinding, file URLs, unexpected schemes, oversized responses, unbounded depth, unbounded browser execution. This is not theoretical; recent crawler vulnerabilities demonstrate the class. Do not choose one crawler forever.

---

## 8. THE SOURCE-BINDING PATTERN (content source maps, harvested not copied)

Sanity's 2026 architecture carries content source maps: rendered values retain a mapping back to source document + field, with stable keyed selectors surviving array reordering, turning the rendered experience into a portal back to the structured source. FYD's deeper version of the chain:

RENDERED VALUE -> OBJECT FIELD -> CLAIM -> EVIDENCE -> OBSERVATION -> EXTERNAL SOURCE

This powers both EDIT THIS and WHY THIS. The harvest is not Sanity's datastore; it is source maps through the render pipeline:

- Generalize the BindingVerifier into a SourceBinding carried by the render model: render node -> object field -> evidence refs.
- The renderer cannot casually invent factual content: factual render nodes require bindings.
- Generated presentation copy is allowed but typed distinctly (the direct/derived/generated/owner_authored classification already exists; harvest existing semantics before naming).
- Stable keyed selectors must survive reordering: this is the same identity-stability requirement as T7 (index-derived section IDs). Fix identity once; both EDIT THIS and the CRDT door benefit.
- WHY THIS is trust infrastructure, not the primary product. It appears when needed: "Why does it say this?" / "Where did you get these hours?" The owner wants GET ME CUSTOMERS / KEEP THIS CORRECT / MAKE CHANGES EASY.

This is experiment E3 below.

---

## 9. TOP 10 QUESTIONS STILL UNANSWERED

1. Is ping_events actually reconstructive, or merely archival? The replay vocabulary is emitted but reconstructive replay is not an exercised runtime path. (Lane 10.)
2. Does the attenuated capability token (macaroon envelope + delegation chain) hold under adversarial test: wrong object, wrong tenant, expired, widened caveat, all fail closed with structured denial? (Lane 4.)
3. Should the render model carry a generalized SourceBinding (render node -> object field -> evidence refs), and does EDIT THIS / WHY THIS work end to end on a served page? (Addendum signal; lane 5 gap.)
4. What is the first broken step in Ask FYD's evidence path? Verified: extraction, not retrieval (service facts live as free prose in the description field; the proceduralizer never emits Service objects). Can it emit them? (Lane 8.)
5. What version is the deployed ping-qdrant, and does it support server-side BM25/sparse inference and prefetch filters? (Lane 8.)
6. correlation_id fragments (595 distinct over 739 events): is mission lifecycle grouping broken, and does mission_id need to move into metadata? (Lane 10.)
7. Where does the 2026-09-30 P0 capability registry artifact live? Lane 4 searched the Pig and did not find it as a distinct artifact; recorded UNVERIFIED. (Lane 4.)
8. What will the independent INTELLIGENCE_RESEARCH P0 build, and where does it duplicate what this harvest found? The comparison happens after, never before; the P0 must not be biased. (Addendum ruling.)
9. Do section IDs become creation-time stable before any draft-layer convergence work, or does the index-derived scheme get fixed at the same time as the first CRDT-adjacent change? (Lane 6.)
10. Does one SiteSpec compile to ActivityPub, ATProto, and MCP projections, or does L5 need a second IR (FeedSpec/CampaignSpec are named as future)? The north-star says one substrate, many projections; it is unproven past web. (Lanes 5, 7.)

## 10. TOP 5 EXPERIMENTS THAT ANSWER THEM

Each experiment is bounded, falsifiable, and settles exactly one question.

**E1. The replay proof.** Replay one real mission end-to-end from ping_events through current worker code with a recorded worker-version marker; diff the reconstructed outcome against the original. Settles Q1: the log is reconstructive or archival. (Lane 10's experiment.)

**E2. The attenuation proof.** Mint one attenuated capability token from the existing registry for a real bounded effect (e.g., post one comment on post:123, tenant hpp, expires in 2h); dispatch through the orca adapter with the delegation chain attached; attempt four exceedances (wrong object, wrong tenant, after expiry, widened caveat); verify each fails closed with a structured denial at the 403 gate while the legitimate effect executes with full evidence. Settles Q2. (Lane 4's experiment.)

**E3. The source-binding proof.** Generalize one render node to carry a SourceBinding (rendered value -> object field -> claim -> evidence -> observation -> external source); exercise EDIT THIS and WHY THIS on a served page; verify generated copy stays distinctly typed and UNBOUND factual values still fail closed. Settles Q3.

**E4. The retrieval hardening proof.** Port RRF fusion and server-side Qdrant namespace filters into hybrid_search.js; verify the audit's WEAK-filter finding closes (cross-namespace candidates never leave the store) and fusion quality improves on a logged query set; confirm the deployed Qdrant version's sparse support first. Settles Q5 and half of Q4's downstream.

**E5. The interrupt proof.** Add the lease-exempt awaiting_approval mission status with a JSONB checkpoint column plus the typed approval-request/response event correlation (request_id, authenticated approver principal) for one bounded non-external flow; verify the HOLD/lease-expiry gap closes (reapExpiredLeases does not touch it) and resume re-enters through the atomic claim path. Settles the core of lane 3's ADAPT set and unblocks the ITEM4 reconcile gate design.

---

## 11. OPEN DUPLICATION FALSIFICATION THREADS

Per the addendum: reader finds duplication -> harvest map entry -> falsification thread -> owning lane responds with evidence -> consolidate -> KEEP/WRAP/MERGE/RETIRE/DELETE. Threads T1-T7 (section 2.4) are OPEN. Owning lanes respond; readers do not modify lanes. No thread may close with DELETE until the owning lane's evidence is on the record and deadness is proven per the constitutional rule.

## 12. STANDING NOTES

- INTELLIGENCE_RESEARCH P0 stays INDEPENDENT. Its acceptance (REAL QUESTION to REAL RESEARCH to SOURCES to SYNTHESIS to EVIDENCE to RESULT) never depends on harvest completion. The later comparison may reveal duplication; that is good, not a failure.
- The FYD WILL NOT BUILD LEDGER is a separate living file (`fyd-will-not-build-ledger.md`), enforced: before proposing a new subsystem, check the ledger; listed capabilities default to HARVEST/WRAP/ADAPT; internal builds need explicit evidence existing solutions fail a FYD requirement.
- Current writers keep their own surfaces. Reader findings open threads; they do not modify code. Only after synthesis: consolidate.
- HARVEST WIDELY. CONVERGE SLOWLY. KEEP THE PRODUCT LOOP RUNNING. OUTSOURCE COMMODITY. OWN SEMANTICS. OWN EVIDENCE. OWN USER INTENT. OWN AUTHORIZATION. OWN OUTCOMES. KEEP THE EXPERIENCE LAYER REPLACEABLE.
