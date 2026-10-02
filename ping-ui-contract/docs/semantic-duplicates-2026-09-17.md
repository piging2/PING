# Semantic duplicate analysis: 17 PING UI projection schemas

Date: 2026-09-17. Rule: consolidate only where two schemas describe the same semantic object, judged by shared identity field plus shared authority source. Aesthetic similarity, shared envelope inheritance, and overlapping field names are not grounds for consolidation. No em dashes are used in this document.

## Verdict

**No pair of the 17 schemas qualifies for consolidation.** Each pair that shares a domain was compared for same-object, same-identity, same-authority overlap, and every comparison fails on at least one axis. Detail below, followed by the only near-misses worth watching.

## Pairwise evidence

### event vs evidence
Different objects. event projects one canonical event (identity: event_id, authority: UnifiedEventRuntime over ping_events). evidence projects claim support via the A-62 lineage chain (identity: evidence_id, authority: lineage machinery). Evidence references source_event_id, but a reference is not identity sharing: one event can underpin many evidence records and one evidence record can span many events. Consolidation would collapse source truth and derived claim support, violating SOUL section 9 (truth layers). **Keep separate.**

### event vs artifact
Different objects. event_id vs artifact_id+hash; UnifiedEventRuntime vs no proven artifact authority. Artifacts are content-addressed bytes; events are ordered occurrences. **Keep separate.**

### artifact vs evidence
Different objects. artifact answers "what the system produced"; evidence answers "what supports a system claim". Both cite the A-62 chain in their descriptions, which is the only overlap, and it is a shared lineage context, not a shared object. identity fields (artifact_id vs evidence_id) and maturity (UNKNOWN vs EXPERIMENTAL) differ. **Keep separate.**

### event vs correlation
Different objects. correlation is a derived grouping (identity: correlation_id) over events; its authority is the event runtime but its object is the group, not the event. The correlation schema itself warns correlation_id is not run identity; the same logic makes it not event identity. Consolidation would erase the one-to-many group structure. **Keep separate.**

### mission vs run vs execution
Three distinct objects at three granularities, all deliberately separated by the ADR:
- mission: durable PING mission (identity: id; authority: MissionRuntime/MissionScheduler over ping_missions; PROVEN/IMPLEMENTED).
- run: one autonomous attempt (identity: run_id; authority: none, UNPROVEN by design, gap-labeled per ADR boundary B).
- execution: one authoritative executor call (identity: execution_id; authority: ExecutionAuthority; EXPERIMENTAL/CONTRACT_DEFINED).
mission links to runs conceptually and runs link to executions, but identity fields differ, authorities differ, and maturities differ. The run schema exists precisely to keep the missing layer typed rather than folding it into mission or execution. **Keep all three separate.** Folding run into mission would reintroduce the fabrication the ADR explicitly forbids.

### authority vs capability vs worker
- authority: constitutional authority projection (identity: authority_id; authority source: UNKNOWN read path).
- capability: grant vocabulary (identity: capability_id; enforcement UNPROVEN per ADR boundary C).
- worker: fleet runtime instance (identity: worker_id; state machine active/idle/blocked/retired).
A capability belongs to an authority and a worker exercises capabilities, but none shares identity or authority source with another. Consolidating authority and capability would recreate the permission-plane confusion the ADR's one-authority-model rule exists to prevent. **Keep separate.**

### identity vs namespace
identity projects principals/agents/workers/tenants (identity_id + kind). namespace projects a syntax-validity flag for a namespace string. Different identities, different semantics. The temptation is to fold namespace into identity as a "tenant identity", but ADR boundary I (tenant.ping.v1.json does not exist) and boundary A (syntax is not entitlement) both forbid that merge: namespace is a syntactic fact, identity is a principal claim. **Keep separate.**

### projection vs envelope
Not the same kind of thing. envelope is the in-band maturity/proof metadata wrapper (no entity identity). projection is a generic derived-view entity type (projection_id + projection_kind). The envelope is carried by allOf inheritance into every schema including projection. Merging them would confuse metadata with object type. **Keep separate.**

### error vs everything
error is a value type (code + boundary) with no entity identity and no authority beyond the ContractError class. No overlap. **Keep separate.**

### pagination vs everything
pagination is a list wrapper convention (items + total + limit + offset), not an entity. No overlap. **Keep separate.**

### automation-health vs projection
automation-health is a concrete aggregate over the A-01 field model (identity: platform + generated_at; RUNTIME_VERIFIED). projection is a generic untyped view. automation-health could in principle be expressed as a projection_kind, but it has a proven authority source and a registered field model, while projection has neither; folding it into the generic schema would lose the proven semantics. **Keep separate.**

### execution vs worker
execution is one executor call (execution_id); worker is a fleet runtime (worker_id, heartbeat). An execution runs on a worker's host, but the call and the runtime are different objects with different liveness semantics. **Keep separate.**

## Near-misses to watch (not consolidations)

1. **projection.json as a catch-all.** projection_kind is a free string with no registry. Risk: future authors mint projection kinds that duplicate typed schemas (e.g. a "missionHealth" kind instead of using mission/automation-health). Guard: require new projection_kind values to be registered with an authority source and a gap analysis against existing typed schemas before use.

2. **envelope placement divergence.** Not a duplicate but a contract inconsistency: JSON schemas require maturity/source at top level; index.mjs writes them under `_envelope`. Documented in schema-audit.md finding 1. Resolving it may change which schemas need versioning (see versioning.md).

3. **correlation "limit 200 per gateway".** A claim about gateway behavior lives inside a UI projection schema. If the gateway limit changes, the schema description is stale but no contract test catches it. Consider moving gateway-behavior claims into api-client docs and keeping the schema to the data shape.
