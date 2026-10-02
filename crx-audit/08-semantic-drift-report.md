# DELIVERABLE 8 — SEMANTIC DRIFT REPORT

**Source:** `partials/agent-f-external-drift.md` (full item register). Pattern confirmed: documentation describes what was intended or true at a point in time, then stayed still while the code moved.

## Verified mismatches (docs claim vs source/current shows)

| ID | Claim location | Claim | Current reality | Class | Sprint relevance |
|---|---|---|---|---|---|
| D-01 | `AGENTS.md` | "no `ping_events` table" | `ping_events` exists since 2026-07-29 (739–2321 rows), the canonical journal | STALE | P0 — operator doc contradicts the spine; correct or remove |
| D-02 | Historical certification docs (Qdrant→MCP→OpenWebUI chain) | live memory chain working | point-in-time archaeology; current MCP surface dead, OpenWebUI a silo | ARCHAEOLOGICAL | P1 — banner as historical, do not cite |
| D-03 | `MCP_CERTIFICATION.md` | 10/11 tools working | current tool surface: zero callers, fail-open, stubs | ARCHAEOLOGICAL | P1 — anyone planning tool work will be misled |
| D-04 | `IDEMPOTENCY_IMPLEMENTATION.md` | IdempotencyManager exists | class does not exist in tree | DOCUMENTED_ONLY | P1 |
| D-05 | `current_state_audit.md` | `infrastructure_adapter_interface.js` listed | missing — and `ollama_adapter.js` dangling-requires it | DOCUMENTED-AND-MISSING | P0 — the provider seam is named after a file that isn't there |
| D-06 | (code comments) | `beforeMCPExecution`/`afterMCPExecution` | phantom names, zero hits | PHANTOM | P1 — do not plan on these names |
| D-07 | Architecture docs | OpenTelemetry implemented | zero OTel packages; env vars unread | DOCUMENTED-AND-MISSING | P1 |
| D-08 | `PING_OBJECT_VERTICAL_SLICE.md` | Patches 7–9 pending | status unverified against cc6856c3 | UNRESOLVED | P1 — verify before citing |
| D-09 | (asserted) | "CanonicalIdentityService is bypassed" | CORRECTED: it is called in the TS kernel; the real split is JS legacy authorities vs TS service vs Python | CORRECTED-INFERENCE | P0 context for identity convergence |
| D-10 | `current_state_audit.md` | healthy observability surface | `/ops/status` 500s, hardcoded healthy, fabricated UI numbers | STALE | P0 — banner hard |
| D-11 | Docker status of ping-qdrant | "unhealthy" = broken | service answers 1.18.2; probe broken (no curl in image, streak 3136) | OBSERVABILITY-MISLEAD | P1 |

## Correction for prior drift claims (from this audit)
- "CanonicalIdentityService bypassed" (D-09): wrong. TS kernel callers exist; the split is three-way.
- Topology correction: live stores are the **brain-*** services per gateway env — earlier lane assumptions centered on ping-postgres must be re-read against brain-postgres.

## Drift guardrails recommended (mechanical, no new infra)
1. **One-line banners** on archaeological certs (`MCP_CERTIFICATION.md`, historical memory-chain reports): "historical as of <date>, not current runtime truth."
2. **Source-classification tags** on docs (same 7-level scale as this audit) so future readers know what a doc claims to be.
3. `AGENTS.md` one-line correction for D-01.
4. The "no new files" discipline: dead-schema tables and phantom-name comments are the two fastest drift producers; `09-minimal-patch-queue.md` includes a doc-truth pass.
