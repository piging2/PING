# DELIVERABLE 6 — ADVERSARIAL TEST MATRIX

**Design only — none executed.** Sources: `partials/agent-d-vertical.md` (memory T1–T10), `partials/agent-b-mcp.md` (MCP T1–T18), `partials/agent-c-observability.md` (observability T1–T16). Full TEST / FAILURE MODE / EXPECTED SAFE / CURRENT-FROM-SOURCE / EVIDENCE per test in the partials; this matrix is the queue view.

## Memory adversarial tests (Agent D)

| ID | Test | Predicted now | Priority |
|---|---|---|---|
| T1 | Stale memory: previously-true fact becomes false | FAIL — no freshness/staleness marker anywhere | P1 |
| T2 | Contradictory memory: two valid observations disagree | FAIL — ranking silently chooses | P1 |
| T3 | Poisoned memory: untrusted content steers control | FAIL on prompt paths / N/A live spine; P0 if IntelligenceWorker re-enabled | P0-conditional |
| T4 | Cross-tenant memory | PASS via HybridSearch / FAIL at store layer | P1 |
| T5 | Duplicate memory: same fact observed repeatedly | FAIL — multiplication by design | P2 |
| T6 | Provenance loss | PASS (HybridSearch, KG rows) / FAIL (Orca getContext) | P1 |
| T7 | Correction survival: correction recorded, source refreshes | FAIL — demotion on refresh, proven in source logic (`addNode` ON CONFLICT) | P0 |
| T8 | Deletion/forgetting | FAIL — no mechanism; P0 on first PII case | P2→P0 |
| T9 | Ranking instability | WEAK PASS | P3 |
| T10 | Empty retrieval | PASS / WEAK PASS | P3 |

## MCP adversarial tests (Agent B)

| ID | Test | Current (as-wired) | Priority |
|---|---|---|---|
| T1 | Duplicate invocation (same logical call twice) | no idempotency; ToolAuthority undedupeable, ToolGateway overwrites history | P0 |
| T2 | Retry after ambiguous timeout | no timeouts at all; outcome unknown forever | P0 |
| T3 | Timeout after side effect | n/a — no timeouts, no side-effect tracking | P0 |
| T4 | Server disappears mid-request | no transport, no deadline | P0 |
| T5 | Malformed response | no result-schema enforcement | P1 |
| T6 | Schema version change | silent overwrite on re-registration | P1 |
| T7 | Tool renamed/removed | n/a — nothing live | P2 |
| T8 | Oversized result | no size caps | P1 |
| T9 | Malicious tool result (exfil/prompt-shaped) | no trust boundary; results flow to agent unexamined | P0 |
| T10 | Instruction injection in tool result | no boundary design | P0 |
| T11 | Unauthorized tool/argument | fail-open allow-all | P0 |
| T12 | Cross-tenant invocation | no principal identity | P0 |
| T13 | Credential leakage (args/results/logs/traces/memory) | no scrubbing; keys observed in container env | P1 |
| T14 | Cancellation race | no cancellation semantics | P1 (P0 once tools gain side effects) |
| T15 | Concurrent duplicate dispatch | no dedupe | P1 |
| T16 | Partial execution (multi-step fails halfway) | n/a | P2 |
| T17 | Tool succeeds but persistence of record fails | no persistence at all | P0 |
| T18 | Persistence succeeds but response delivery fails | n/a | P0 |

**Critical answer (OBSERVED FACT): the system CANNOT distinguish NOT STARTED vs STARTED vs SUCCEEDED vs FAILED vs TIMED OUT vs CANCELLED vs UNKNOWN.** No timeouts, no cancellation, no UNKNOWN state; UNKNOWN would collapse into FAILED or hang forever.

## Observability adversarial tests (Agent C)

| ID | Test | Current (from source) | Priority |
|---|---|---|---|
| T1 | Missing `correlation_id` | defaults silently; silent fragmentation already in prod (595 distinct correlation_ids) | P1 |
| T2 | Duplicate `correlation_id` | no uniqueness; `/events/correlation/:id` would return a merged lie | P1 |
| T3/T10 | Orphaned span / trace-says-failure | n/a — no spans | P3 (dormant) |
| T4 | Tool execution with no audit event | **no audit plane exists** — nothing would notice | P0 |
| T5 | Audit event with no execution | n/a — no audit plane; phantom-completion was a real past bug class | P1 |
| T6 | Memory retrieval with no provenance | writes carry provenance 68/68; retrieval surfacing unverified | P1 |
| T7 | Memory write with no originating event | `knowledge_graph.js` INSERT accepts caller-supplied `source_event_id`; no NOT NULL/FK | P1 |
| T8 | Health healthy while dependency dead | **already the steady state** (posthog/email/sms "healthy" unconfigured; event_runtime hardcoded) | P0 |
| T9 | Logger says success while transaction rolls back | console.log at intent points; no commit-coupled logging | P1 |
| T11 | Secret in payload/trace | **no scrubbing** in `emit()`; free-form JSONB; keys in container env | P0 |
| T12 | PII in memory/trace | namespace boundary only; field-level policy unverified | P2 |
| T13 | Huge payload into `ping_events.payload` | no size cap observed | P2 |
| T14 | High-cardinality labels | n/a — no backend; P1 the day `metrics_port` gets a provider | P3 (dormant) |
| T15 | Observability sink unavailable | trivially satisfied today; **regression risk** for future wiring — keep `emit()` sink-independent | P1 (guardrail) |
| T16 | Consumer trusts `generated_runtime_authoritative: true` | **hardcoded literal** while reporting empty/degraded internals | P1 |

## Queue order for the sprint (P0 first)
1. T7 correction survival (memory) — real bug in source logic, fix is small.
2. T11 secret scrubbing + T13 size cap at `emit()` boundary (append-only store: PII/secrets are permanent once written).
3. T8 health honesty (dependency probes; stop asserting healthy-by-construction).
4. T4 audit plane for tool execution + T17 dispatch journal in `ping_events` (before any tool ships).
5. UNKNOWN-OUTCOME state machine + T1/T2 idempotency design (before any side-effecting tool ships).
6. T1/T2 correlation integrity (uniqueness/scoping) — already fragmenting in prod.
7. T3 poisoned memory — gates IntelligenceWorker re-enablement.
