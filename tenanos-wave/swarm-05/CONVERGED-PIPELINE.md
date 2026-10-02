# CONVERGED-PIPELINE — one memory pipeline for the TenantOS execution loop

Date: 2026-09-23 (swarm-05). Constraint honored: no fourth memory system, no
second orchestrator/event authority/capability system. Everything below is
mapped onto M1/M2/M3/R1/R2 as traced in MEMORY-TRACE.md.

## The pipeline

```
OBSERVATION → MEMORY CANDIDATE → VALIDATION/PROMOTION → DURABLE MEMORY
    → RETRIEVAL → CONTEXT PACK → WORKER → (new OBSERVATION…)
```

| Stage | Existing owner (no new system) | Change needed |
|---|---|---|
| OBSERVATION | `UnifiedEventRuntime.emit` → `ping_events` (M1) | none — KEEP |
| MEMORY CANDIDATE | graph-projection subscriber → `knowledge_nodes` (M2, `status='candidate'`); embedding subscriber → Qdrant (M3) | P0 fix (I1); both stay pure projections of M1 |
| VALIDATION/PROMOTION | `KnowledgePromoter` on `SNIPPET_APPROVED/REJECTED`, `AI_RESPONSE_ACCEPTED/REJECTED` → `updateNodeBySourceEvent` | KEEP as the sole lifecycle writer; add transition log (I4) |
| DURABLE MEMORY | M1 + M2 + M3 | none new |
| RETRIEVAL | `HybridSearch` + `EvidenceAuthority` (R2/R1) | wire `status`→`approved`/`rejected` booleans so `rank()` honors its contract |
| CONTEXT PACK | **new minimal assembler** (fits in `src/tenanos/**` per wave root rule) | build: retrieval results → worker context; enforces I3 |
| WORKER | mission workers / capability executors | consume the context pack; emit results as new OBSERVATIONs |

The loop closes into the mission pipeline at both ends: mission results
enter as OBSERVATIONs (via `emit`), and Mission Control uses RETRIEVAL to
decide NEXT WORK.

## Status taxonomy (single vocabulary across M1/M2/M3)

| Status | Meaning | Today |
|---|---|---|
| OBSERVED | raw capture exists; no claim made | M1 event; M2 `candidate` + null/low confidence |
| CLAIMED | an identity asserts it (not yet proven) | `CLAIM_CREATED` events |
| DERIVED | produced by inference; model-provenance confidence | `inference_adapter` 0.8-style values, tagged as model provenance, never conflated with producer confidence |
| OWNER_ASSERTED | tenant owner asserts (attestation, owner patch) | `operator-attestation` / `AI_RESPONSE_ACCEPTED` |
| VERIFIED | human/owner approval recorded | M2 `approved`, confidence 1.0 (promoter only) |
| CORRECTED | a prior VERIFIED/OWNER_ASSERTED state was revised by a human | promoter overwrite today — **not provable** (no transition log); pipeline adds it |
| SUPERSEDED | replaced by a newer observation/claim; retained for audit | **missing** — needs supersede-link (new event type, not a new store) |
| UNKNOWN | no assessment; null confidence | M2 null-confidence candidates |

Transitions: `OBSERVED → CLAIMED → VERIFIED`, `OBSERVED → VERIFIED`,
`VERIFIED → CORRECTED → VERIFIED`, `any → SUPERSEDED`, `any → UNKNOWN`
never (unknown is initial, not a regression). **No transition may move
backward except through an explicit human correction event.**

## Invariants (the convergence contract)

- **I1 — One lifecycle writer.** Only the promoter path writes `status`/
  `confidence` on existing nodes. `addNode`'s `ON CONFLICT` refreshes
  `data`/`namespace`/`correlation_id`/`confidence_provenance` only
  (P0-FIX.diff). `POST /knowledge/nodes` keeps insert-with-status for new
  rows; on conflict it must not regress lifecycle either.
- **I2 — Re-emission is lifecycle-idempotent.** Replaying/retrying/
  re-ingesting an event reproduces its *observation projection* and nothing
  else, in M1 (`DO NOTHING`), M2 (P0 fix), M3 (same point id).
- **I3 — Retrieval score never becomes truth.** `rank_score` is
  presentation-only and dies with the result list. `confidence` keeps its
  provenance (`spine` vs `inference` vs `human-approval`). `verified` is a
  boolean from evidence trace, never inferred from rank. The CONTEXT PACK
  assembler drops `rank_score` before worker input and passes
  `{text, status, confidence, confidence_provenance, evidence, verified}`.
- **I4 — Corrections are events first, projections second.** Every
  lifecycle transition is recorded as a durable transition (ordered log;
  minimal form: reuse M1 by emitting `KNOWLEDGE_TRANSITIONED` events, or a
  `knowledge_transitions` table — coordinator's call, not a new authority).
  The materialized row is a pure function of the ordered transitions, so any
  auditor can replay candidate→approved→rejected and prove the final state.
- **I5 — Tenant boundary everywhere.** `namespace` on M1/M2/M3; no
  cross-namespace read; move the M3 filter server-side when the adapter
  allows it.
- **I6 — Forgetting is explicit, never silent.** Retraction is a
  first-class `SUPERSEDED`/retraction event; rows are never quietly
  deleted. (Privacy-driven hard delete, if ever required, goes through the
  constitutional authority, not the memory pipeline.)

## Correction-survival proof (what "proven" means here)

1. **Regression tests** (`p0-regression-test.js`): on the pre-fix module the
   three lifecycle tests FAIL (approved→candidate, rejected→candidate,
   approve→reject→re-emit→candidate); on the fixed module all six PASS.
   This proves re-emission can no longer clobber a human decision.
2. **Transition log (to build):** with I4, correction survival becomes
   *replayable*: given the ordered transition events, the final state is
   deterministic and any re-emission that is not a transition event cannot
   alter it. The test for I4: replay transitions out of order / with a
   duplicate re-emission interleaved → final state still equals the last
   human transition.
3. **Signal durability:** the correction *signal* already survives in M1
   (`SNIPPET_APPROVED`/`SNIPPET_REJECTED` rows are append-only). The gap
   was only ever the materialized M2 row — closed by I1+I4.

## What the coordinator must decide (not swarm-05's call)

1. Landing of P0-FIX.diff: direct gateway-tree patch vs port of the fixed
   module into `src/tenanos/**` (wave root rule). The diff is against the
   live deployed code; the regression test is placement-agnostic
   (`MODULE_PATH` env).
2. I4's transition-log form: `KNOWLEDGE_TRANSITIONED` events in M1 (zero
   new tables) vs a `knowledge_transitions` table.
3. CONTEXT PACK assembler scope: minimal (field filtering + I3
   enforcement) — must not grow into a second orchestrator.
4. Whether `POST /knowledge/nodes` keeps caller-supplied `status` on the
   insert path (it has no internal callers; consider promoter-only).

## Deliberately not proposed

- No new store, no vector-DB migration, no event-authority changes
  (constitutional sprint owns that mapping).
- No backfill of the currently-demoted rows: rows demoted by the bug are
  identifiable (`status='candidate'` + `confidence=1.0` + a matching
  `SNIPPET_APPROVED` in M1) and re-promotable via the promoter path once
  the fix lands — a defined remediation, not a schema migration.
