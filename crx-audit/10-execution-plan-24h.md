# DELIVERABLE 10 — 24-HOUR EXECUTION PLAN

**Scope:** the audit's minimal patch queue (09), adversarial tests (06), harvest ledger (07), drift corrections (08). Read-only tonight; the mutation sprint starts only on Nolan's GO.

## Sprint order (reordered by the audit — not the original brief order)

| Window | Work | Deliverable |
|---|---|---|
| T+0–1 | **Baseline freeze + grill decision gate.** Fresh worktree off cc6856c3 (main worktree has 16 dirty files). Resolve live-DB topology question (brain-postgres vs ping-postgres) read-only. Operator answers the blocking grill (index). If memory/tool-plane questions stay unanswered: Track C stays gated, Tracks A+B proceed. | frozen baseline; GO/conditional-GO |
| T+1–4 | **Track A — event/identity truth.** PQ-1 (llhttp), PQ-2 (dedupe early return), PQ-3 (correction survival), PQ-5 (mission causation_id), PQ-4 (canonical ID minting). All same-file/small, all test-covered. | hardened spine |
| T+4–8 | **Track B — boundaries.** PQ-7 (emit size cap + redaction), PQ-8 (request_id + health honesty; kill fabricated UI numbers or banner them), PQ-9 (namespace-required/bounded context primitives), PQ-10 (write-anchoring gate). | leak-proof append-only store |
| T+8–12 | **Track C-1 — memory convergence** (gated). Pick ONE memory authority; wire retrieval into the worker path with provenance preserved; resolve Ollama reachability or pause fallback projection; decide promoter emitter. | one live memory loop |
| T+12–16 | **Track C-2 — execution identity.** Durable Run unit; tool-plane decision; dispatch journal in `ping_events`; UNKNOWN-OUTCOME state machine; Idempotency-Key design. Design + journal first, no tool implementations yet. | auditable execution unit |
| T+16–20 | **Adversarial integration tests** (06 queue order): T7 correction survival, T11/T13 boundary tests, T8 health honesty, T4 audit plane, UNKNOWN-OUTCOME, T1/T2 correlation integrity, T3 poisoned-memory (gates IntelligenceWorker). | executed test matrix |
| T+20–22 | **Vertical-trace proof:** demonstrate ONE full REQUEST→IDENTITY→…→RECALL path on the newly wired memory (deliverable 05's absent arrows, now present), with evidence. | traced vertical slice |
| T+22–24 | **Truth reconciliation:** banner archaeological certs (08), fix `AGENTS.md` D-01, final evidence ledger, daily-diff footer (index format). | audit-clean docs |

## Rules of the road
1. **No new authority** — every patch extends an existing one.
2. **No new infra** — no Prometheus/Grafana/Tempo/Loki/vector-DB/MCP-gateway startup.
3. **No new deps** except Pino (grill-gated).
4. **Phantom code** (ConversationMemory, dead authorities, fake certs) is bannered/removed only — never "revived" as-is.
5. **Append-only discipline:** PQ-7 before any test that emits novel payloads.
6. **Topology check first:** every runtime observation states which DB it read.

## Original brief checklist (mapped)
- [x] reality matrix → 01 · [x] memory map → 02 · [x] MCP map → 03 · [x] observability map → 04
- [x] vertical trace gaps → 05 · [x] adversarial matrix → 06 · [x] harvest ledger → 07
- [x] semantic drift → 08 · [x] patch queue → 09 · [x] execution plan → this file
- [ ] operator questions → **index.md (consolidated — do NOT edit GRILLING-BRIEF.md in this read-only audit)**
