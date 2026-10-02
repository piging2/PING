# FYD WILL NOT BUILD LEDGER
## Living ENFORCED checklist (Addendum ruling, 2026-09-30 ~18:15 MDT, Nolan, binding)

**Law:** This ledger is enforced, not absolute. A listed capability defaults to HARVEST / WRAP / ADAPT. An internal build of a listed capability requires EXPLICIT EVIDENCE that existing solutions fail a FYD requirement, recorded on the entry before any writer begins work. Last verified dates keep the ledger honest; entries older than 90 days are stale and must be re-verified before blocking anything.

**Schema per entry:** CAPABILITY / EXISTING SOLUTION(S) / WHY COMMODITY / HARVEST-ADAPTER STRATEGY / EXCEPTION CRITERIA / LAST VERIFIED / OWNER.

---

### 1. General-purpose web crawler
- CAPABILITY: robots-aware politeness crawling with JS rendering
- EXISTING SOLUTION(S): Crawl4AI, Scrapy, Playwright, Lightpanda
- WHY COMMODITY: fetching plus politeness are solved; FYD's delta is policy, not crawl
- HARVEST-ADAPTER STRATEGY: own the acquisition contract (AcquireRequest -> AcquireResult, section 7 of the harvest map); own the single SSRF-hardened fetch seam and the policy gate; adapt crawl patterns (CMP lists, shadow-DOM flattening, seeder-first ordering) into owned code; use the browser as an adapter (Playwright pinned, Lightpanda pilot)
- EXCEPTION CRITERIA: explicit evidence that all listed solutions fail a FYD acquisition requirement under the trust-boundary constraints
- LAST VERIFIED: 2026-09-30
- OWNER: lane 1 (acquisition)

### 2. CMS / content backend as a truth store
- CAPABILITY: visual page editor with content management backend
- EXISTING SOLUTION(S): Puck (editor shell), Sanity / Payload (hosted backends), Lexical (rich text)
- WHY COMMODITY: editing chrome and rich-text trees are solved; FYD's delta is SiteSpec plus the binding verifier
- HARVEST-ADAPTER STRATEGY: WRAP Puck behind a SiteSpec adapter (digest-bound proposals stay the only edit channel); WRAP Lexical when plain strings stop sufficing; ADAPT Sanity's content-source-map and overlay patterns; REJECT any hosted content lake as a second truth store
- EXCEPTION CRITERIA: a reached product arrow requires multi-tenant admin content that cannot live in the object graph
- LAST VERIFIED: 2026-09-30
- OWNER: lane 5 (cms)

### 3. Collaborative real-time sync infrastructure
- CAPABILITY: CRDT-based simultaneous editing with sync servers
- EXISTING SOLUTION(S): Automerge 3.5.0, Yjs 13.6.33
- WHY COMMODITY: convergence is a solved data structure; both are MIT and mature
- HARVEST-ADAPTER STRATEGY: REFERENCE only; optionality behind a narrow "converge drafts, emit structured patch" interface; apply the ten-rule SiteSpec hygiene checklist (stable IDs, explicit nulls, ISO-8601 strings, version marker); CRDTs converge data, never trust; fix index-derived section IDs (T7) before any convergence work
- EXCEPTION CRITERIA: a specified concurrent owner/agent/offline flow exists; then integrate behind the narrow interface, draft layer only
- LAST VERIFIED: 2026-09-30
- OWNER: lane 6 (local-first)

### 4. Agent runtime platform
- CAPABILITY: durable agent execution with retries, timers, human-in-the-loop
- EXISTING SOLUTION(S): Temporal, LangGraph, Microsoft Agent Framework, OpenHands, CrewAI
- WHY COMMODITY: workflow mechanics are solved; PING's MissionRuntime owns mission truth
- HARVEST-ADAPTER STRATEGY: REJECT all as platforms (second truth store risk); ADAPT patterns only: durable interrupt / checkpoint / lease-exempt awaiting_approval status; typed approval request/response event correlation; per-mission-type typed result schemas validated at complete(); Temporal determinism discipline plus versioned replay branches
- EXCEPTION CRITERIA: all three must hold: a measured incident shows MissionRuntime leases/retries insufficient for durable timers/signals; a bounded experiment survives replay-divergence tests; determinism discipline is lint-enforced
- LAST VERIFIED: 2026-09-30
- OWNER: lane 3 (agent runtimes)

### 5. External authorization / policy engine as decision authority
- CAPABILITY: relationship-based authorization, policy evaluation
- EXISTING SOLUTION(S): OpenFGA/SpiceDB (Zanzibar), Cedar, OPA
- WHY COMMODITY: policy evaluation is solved; PING owns the authorization decision at its own boundary
- HARVEST-ADAPTER STRATEGY: REJECT as decision authorities (never a second decision point); ADAPT shape-level ideas only: scope grammars, machine-readable denial guidance, protected-resource-metadata analog for the capability surface
- EXCEPTION CRITERIA: (OpenFGA) a reached arrow requires multi-hop relationship authorization the tenant boundary cannot express; (Cedar/OPA) 50+ distinct policies changing faster than weekly with non-operator authors, or a polyglot executor fleet where in-process gates cannot be the single implementation
- LAST VERIFIED: 2026-09-30
- OWNER: lane 4 (permissions)

### 6. Second event spine / event store
- CAPABILITY: event sourcing backend, replay, subscriptions
- EXISTING SOLUTION(S): EventStoreDB, Temporal history, any new event table/bus
- WHY COMMODITY: event storage mechanics are solved; ping_events with the UnifiedEventRuntime single writer is the constitutional authority
- HARVEST-ADAPTER STRATEGY: REJECT all; ADAPT only the upcasting registry shape (read-path only, enforced ordering) and versioned-type discipline
- EXCEPTION CRITERIA: Nolan's explicit word only; the bar is proven representational failure of ping_events
- LAST VERIFIED: 2026-09-30
- OWNER: lane 10 (observability)

### 7. Observability backend stack
- CAPABILITY: trace/metric/log collection and querying
- EXISTING SOLUTION(S): OTel collector, Tempo, Jaeger, Prometheus, Loki
- WHY COMMODITY: collection infrastructure is solved; spans project from ping_events
- HARVEST-ADAPTER STRATEGY: WRAP OTel trace context behind the existing TracePort seam (side channel, never truth); adopt semantic conventions as the attribute vocabulary; no backend stack
- EXCEPTION CRITERIA: measured query pain when projecting spans/metrics from ping_events
- LAST VERIFIED: 2026-09-30
- OWNER: lane 10 (observability)

### 8. Deployment attestation infrastructure
- CAPABILITY: build provenance, artifact signing, deployment certification
- EXISTING SOLUTION(S): SLSA, Sigstore (Fulcio/Rekor)
- WHY COMMODITY: provenance format and keyless signing are solved
- HARVEST-ADAPTER STRATEGY: ADAPT. Journal DEPLOYMENT_CERTIFIED into ping_events; follow the provenance shape; never build custom signing PKI or attestation formats
- EXCEPTION CRITERIA: explicit evidence the standard formats cannot express a FYD deployment requirement
- LAST VERIFIED: 2026-09-30
- OWNER: lane 10 (observability)

### 9. General agent wire protocol
- CAPABILITY: cross-agent communication protocol
- EXISTING SOLUTION(S): MCP (official SDK v2), NIP-46, ATProto
- WHY COMMODITY: framing, discovery, and capability negotiation are solved by existing specs
- HARVEST-ADAPTER STRATEGY: WRAP the official MCP TS SDK v2 behind PING's capability/approval interface when a reached product arrow needs an external perimeter; ADAPT ATProto scope grammar and progressive consent into PING's own capability layer; MCP is never the authorizer (PING approval authority gates every tools/call)
- EXCEPTION CRITERIA: never (the custom-protocol rejection is unconditional)
- LAST VERIFIED: 2026-09-30
- OWNER: lane 7 (protocol)

### 10. Vector RAG stack as the retrieval authority
- CAPABILITY: hybrid retrieval, reranking, citation checking
- EXISTING SOLUTION(S): GraphRAG, neural rerankers, post-hoc NLI citation checkers, Mem0/Zep-style memory systems
- WHY COMMODITY: fusion math and embedding retrieval are solved; PING's delta is pre-generation evidence binding
- HARVEST-ADAPTER STRATEGY: ADAPT RRF (~15 lines replacing naive concat fusion) and Qdrant server-side hybrid (filters + sparse leg); REJECT GraphRAG as a system; REJECT runtime NLI citation checking (strictly weaker than deterministic grade-and-throw); REJECT neural reranking until a real consumer and measured lift exist; REJECT new memory systems until proven representational failure of existing paths
- EXCEPTION CRITERIA: (reranker) a real consumer plus measured lift; (memory system) proven representational failure of existing retrieval paths
- LAST VERIFIED: 2026-09-30
- OWNER: lane 8 (search)

### 11. Bayesian marketing attribution engine
- CAPABILITY: media-mix modeling, geo-experiment design, attribution
- EXISTING SOLUTION(S): Google Meridian, GeoX
- WHY COMMODITY: the two-layer architecture (MMM + geo experiments) is published open science
- HARVEST-ADAPTER STRATEGY: LEARN the architecture; adopt nothing until real geo-granular spend/outcome data exists; then re-evaluate ADOPT of the library itself (not a build)
- EXCEPTION CRITERIA: real geo-granular spend and outcome data exist
- LAST VERIFIED: 2026-09-30
- OWNER: lane 9 (marketing)

### 12. Experiment allocation bandits
- CAPABILITY: multi-armed bandit traffic allocation
- EXISTING SOLUTION(S): commercial bandit products
- WHY COMMODITY: allocation math is solved
- HARVEST-ADAPTER STRATEGY: REJECT for now (wrong tool for tiny-traffic, unstable-arm regimes); ADAPT always-valid sequential inference instead (mSPRT / confidence sequences, ~100 lines)
- EXCEPTION CRITERIA: a high-traffic, stable-arm allocation problem actually appears
- LAST VERIFIED: 2026-09-30
- OWNER: lane 9 (marketing)

### 13. Knowledge-graph builder as the entity authority
- CAPABILITY: entity resolution, knowledge graph construction
- EXISTING SOLUTION(S): Splink, Senzing, GraphRAG knowledge builders
- WHY COMMODITY: matching math and graph construction are solved; PING owns resolution evidence and decisions
- HARVEST-ADAPTER STRATEGY: ADAPT Splink's Fellegi-Sunter pattern (blocking, weighted scoring, decision events with factor breakdown, review queue, never auto-merge) into Postgres; ADAPT Senzing's record/entity/relationship separation; Splink stays an offline calibration reference, never a runtime dependency
- EXCEPTION CRITERIA: proven representational failure of the Postgres-native resolver
- LAST VERIFIED: 2026-09-30
- OWNER: lane 2 (digital twin)

### 14. Custom capability-token construction
- CAPABILITY: attenuated delegation tokens
- EXISTING SOLUTION(S): macaroon libraries, Biscuit
- WHY COMMODITY: the chained-HMAC caveat construction is published and stable
- HARVEST-ADAPTER STRATEGY: ADAPT the construction (~200 lines owned), not a library (fragmented, unmaintained); pair with RFC 8693-style delegation chains (<100 lines) for the audit half
- EXCEPTION CRITERIA: an actively maintained, audited library for the exact construction appears
- LAST VERIFIED: 2026-09-30
- OWNER: lane 4 (permissions)
