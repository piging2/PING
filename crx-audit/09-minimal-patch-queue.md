# DELIVERABLE 9 — MINIMAL PATCH QUEUE

**Dependency-ordered.** Each patch extends an existing authority; none creates a second event, memory, tool, permission, identity, or observability authority. New dependencies: **Pino only** (PQ-11), everything else zero. Patches marked ⛔ are blocked on grill answers and must not start early.

## Track A — event/identity truth (smallest, most load-bearing)

| # | Patch | Touches | Evidence | Why now |
|---|---|---|---|---|
| PQ-1 | E-07: llhttp runtime-identity era fix (`process.versions.http_parser ?? process.versions.llhttp`) | `runtime/kernel/*identity*` (9 lines, fully tested in source worktree) | 07 E-07 | canonical-bytes integrity for replay era IDs; trivial, proven |
| PQ-2 | E-01: duplicate-suppression early return in `UnifiedEventRuntime.emit()` + integration-trace enrichment | `ping-runtime/events/unified_event_runtime.js` (same file) | 07 E-01; 05 gap #7 | fixes real double-dispatch on the live boot path (PG dedupe doesn't stop in-process handler re-fire) |
| PQ-3 | Correction-survival fix: `addNode` `ON CONFLICT` must not demote `approved`→`candidate` on re-emission | `gateway/knowledge_graph.js` (+ graph subscriber) | 05 gap #7; 06 T7 (P0) | proven bug in source logic; fires the moment any node is approved |
| PQ-4 | E-03b: deterministic canonical event-ID minting (`V2:event_type:namespace:payload_hash`) with key-order-insensitive hashing | new small module + `emit()` call site | 07 E-03 | current IDs use insertion-order-sensitive `JSON.stringify` — replay determinism risk |
| PQ-5 | `causation_id` on `MISSION_*` lifecycle events | `ping-runtime/orchestration/mission_runtime.js` | 05 gap #5; 04 correlation map | strict causation walks currently stop at the mission boundary |
| PQ-6 | E-03a: collision witness emitter (phased AFTER PQ-4) | new emitter + `collision_witnesses` consumer of existing journal | 07 E-03 | proves the collision policy instead of asserting it |

## Track B — boundaries (append-only store means mistakes are permanent)

| # | Patch | Touches | Evidence | Why now |
|---|---|---|---|---|
| PQ-7 | `emit()` boundary: payload size cap + secret/PII redaction hook (OTTL-shaped rules, in-code, zero dep) | `ping-runtime/events/unified_event_runtime.js` (+ rule table) | 06 T11 (P0), T13; 07 ext #5 | append-only store + untrusted inputs (reviews, commits) in INDEXABLE_TYPES = permanent secret/PII risk |
| PQ-8 | `request_id` at ingress + propagate on causation chain; health honesty (dependency probes; replace hardcoded healthy; fix `/ops/status` 500; banner or remove `generated_runtime_authoritative` literal; remove `Math.random()` "live" UI numbers) | emitters, `server.js` health, `ui-next` header | 04 phantoms; 06 T8, T16 | stop asserting truth by construction |
| PQ-9 | E-06: namespace-required + bounded + evidence-verified context primitives | `ContextCompiler`/HybridSearch call sites | 07 E-06; 02 Path-2 filter weakness | smallest tenant guardrail; do NOT import the full compiler |
| PQ-10 | E-08: EventRepository write-anchoring regression gate | test suite (fail-before tests exist) | 07 E-08 | keeps the journal append-only while Track A mutates it |

## Track C — gated on operator decisions ⛔ (do NOT start until the grill is answered)

| # | Patch | Gate |
|---|---|---|
| PQ-11 | Memory convergence: pick ONE memory authority; wire retrieval into the worker decision path with provenance preservation; resolve Ollama reachability (`ping-ollama` hostname) or pause fallback projection | Grill Q2 (memory), Q7 (fallback-vector policy), Q8 (Qdrant revive/replace/retire), D-Q4 |
| PQ-12 | Run unit: durable per-attempt execution identity (adapt E-04 IDs; advisory-lock helper REJECTED as unsound) | Grill Q4 (Mission→Run→Executions), D-Q2 |
| PQ-13 | Tool-plane decision + dispatch journal in `ping_events` + UNKNOWN-OUTCOME state machine + Idempotency-Key design (external #2) — design and journal first, no tool implementations | Grill Q1 (which tool plane), Q5 (event-derived vs persisted DecisionUnit), MCP Q3–Q6 |
| PQ-14 | Human-signal ingress for knowledge promotion (emitter for `SNIPPET_APPROVED`/`AI_RESPONSE_ACCEPTED` — UI, route, or agent) | Grill Q3, D-Q1 |
| PQ-15 | Pino structured logging adoption (the one dependency) | Grill Q10; trivially separable |

## Files that would change (ungated tracks only)
- `ping-runtime/events/unified_event_runtime.js` (PQ-2, PQ-7)
- `runtime/kernel` identity modules (PQ-1, PQ-4 module)
- `gateway/knowledge_graph.js` + graph subscriber in `gateway_runtime.js` (PQ-3)
- `ping-runtime/orchestration/mission_runtime.js` (PQ-5)
- `server.js`/health routes, `ui-next` header component (PQ-8)
- `ContextCompiler`/HybridSearch call sites (PQ-9)
- test suite (PQ-10)
- New: canonical ID-minting module; collision-witness emitter; redaction rule table

## New dependencies proposed
- **Pino only** (PQ-15, gated). Everything else: zero.
