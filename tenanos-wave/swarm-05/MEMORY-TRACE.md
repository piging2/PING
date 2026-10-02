# MEMORY-TRACE — TenantOS execution substrate (swarm-05)

Date: 2026-09-23. Scope: the live PING substrate on the Pig (gateway source at
`/home/nolan/ping-gateway-src`, deployed as `ping-gateway:devin-boundary2`;
verified byte-identical to the running container via `docker cp`).
The Next.js repo at `/home/nolan/projects/ping` contains no memory
implementation of its own (only incidental string matches); FYD product
surfaces are the hard exclusion zone and were not traced beyond that check.

Three durable memory implementations exist. No fourth was built.

| # | Implementation | Module | Store |
|---|---|---|---|
| M1 | Append-only event memory (source truth) | `ping-runtime/events/unified_event_runtime.js` | Postgres `ping_events` |
| M2 | Lifecycle knowledge memory (curated candidates) | `ping-runtime/knowledge/knowledge_graph.js` + `knowledge_promoter.js` | Postgres `knowledge_nodes` / `knowledge_edges` |
| M3 | Semantic projection memory (vector retrieval) | `ping-runtime/embeddings/embedding_service.js` | Qdrant collection `knowledge` (768-d cosine) |

Read plane (not durable memory, traced because it decides what workers see):
R1 `ping-runtime/evidence/evidence_authority.js` (accumulate / verify / rank —
ADD-only reads), R2 `ping-runtime/search/hybrid_search.js` (front door:
semantic leg + KG leg + evidence rank).

---

## M1 — ping_events: append-only event memory

**WHO WRITES?** `UnifiedEventRuntime.emit(eventType, source, payload, options)`
callers: business emitters (review/customer/project/connector/system via the
canonicalization service), `mission_runtime` (`MISSION_CREATED/ASSIGNED/
STARTED/COMPLETED/FAILED`), replay/witness/lineage internals, worker runtime.
Insert is `ON CONFLICT (event_id) DO NOTHING` — idempotent, never rewrites.

**WHAT IS WRITTEN?** Rows: `event_id, event_type, source, timestamp, payload
(JSONB), metadata (JSONB), namespace`. Producer confidence rides in
`metadata.confidence` when the producer computed one.

**WHERE?** Postgres (`ping_runtime`, per live-DB probes 2026-09-22/23; 2321
rows, latest 2026-09-22 17:34 MDT).

**IDENTITY?** Deterministic SHA-256 `event_id` over
`{eventType, source, [namespace], [logical_id|payload]}` — no `Date.now()`,
no randomness. Same causal content re-emitted yields the same id.

**TENANT?** `namespace` column; `core::system` default is owned by `emit()`
only. (A `core::system` bridge-rewrite path exists in code but is unexercised.)

**PROVENANCE?** `source`, `causation_id`/`correlation_id`, `metadata`,
recomputable `canonical_hash` (`verifyCanonicalObject`).

**CONFIDENCE?** The spine **carries but does not compute** confidence; each
worker re-evaluates at its hop. `metadata.confidence` is optional.

**WHO READS?** `EventReadAuthority`, the graph-projection subscriber (M2
writer), the embedding-projection subscriber (M3 writer),
`EventToMissionBridge` (drives missions), `EvidenceAuthority.accumulate`
(R1), replay provider.

**WHEN?** On every emit (projection subscribers, mission bridge); on search
(accumulate); on replay/verify.

**HOW RANKED?** Events are not ranked; they are ordered by timestamp.
Ranking happens downstream (R1).

**HOW INVALIDATED?** Never in place. Invalidation is a new event. The 7
events lost in the 2026-09-13 degraded window stand as `HISTORICAL_DATA_LOSS`
— deliberately never re-emitted or reconstructed.

**HOW CORRECTED?** `emit()` fails closed on `event_id` conflict with
differing payload (returns an error instead of treating it as a harmless
duplicate). No `UPDATE`/`DELETE` on `ping_events` exists anywhere in source.
Correction = a new compensating event, never a mutation.

**HOW FORGOTTEN?** Never. Append-only; no retention, TTL, or delete path
found in source.

**DO WORKERS ACTUALLY CONSUME IT?** Yes — the only memory all workers share.
`EventToMissionBridge` turns events into missions; both projection
subscribers feed M2/M3 from it.

**Classification: KEEP.** The append-only, content-identified, fail-closed
event log is the correct source-truth layer. It is the one memory whose
re-emission semantics are already right (`DO NOTHING`).

---

## M2 — knowledge_nodes: lifecycle knowledge memory

**WHO WRITES?** Three writers: (a) the graph-projection subscriber in
`gateway/bootstrap/gateway_runtime.js` (~line 682): on 17 event types
(`OBSERVATION_CREATED`, `CLAIM_CREATED`, `REVIEW_RECEIVED`, …) it calls
`addNode('event', label, {...}, { status: 'candidate', confidence:
event.metadata?.confidence ?? null, sourceEventId, correlationId,
confidenceProvenance })` — always `candidate`; (b) `POST /knowledge/nodes`
(`gateway/routes/knowledge.js:67`) with caller-supplied `status` — **no
internal callers found**; (c) the `KnowledgePromoter` worker
(`ping-runtime/knowledge/knowledge_promoter.js`, registered in
`canonical_workers.js`) via `updateNodeBySourceEvent` — lifecycle fields
only (`status`, `confidence`).

**WHAT IS WRITTEN?** `knowledge_nodes` rows: `node_id, node_type,
entity_type, entity_id, label, data (JSONB), source_event_id, namespace,
confidence (REAL, null-preserving), status (candidate|approved|rejected),
correlation_id, confidence_provenance, created_at, updated_at`; plus
`knowledge_edges` (typed relations, `ON CONFLICT DO NOTHING`).

**WHERE?** Postgres, same gateway pool (`knowledge_*` tables created by
`KnowledgeGraph.initialize()`).

**IDENTITY?** Deterministic `node_id = sha256(nodeType:label:
JSON.stringify(data))[0:16]`. Same observation re-emitted → same row.
(`source_event_id` is *not* part of the identity and is *not* refreshed on
conflict.)

**TENANT?** `namespace` column (`core::system` default); `queryNodes`
filters by it; `HybridSearch` drops cross-namespace hits **after** the
search (no server-side filter on the other legs).

**PROVENANCE?** `source_event_id` (back-link to M1), `correlation_id`
(observation chain), `confidence_provenance` (`spine` vs `inference` etc.).

**CONFIDENCE?** Null-preserving: an observation with no producer confidence
stores NULL ("not yet assessed"). The **only** authorized recompute is human
approval via the promoter (`approved → 1.0`, `rejected → 0.2`).

**WHO READS?** `GET /knowledge/nodes`, the KG context leg of `HybridSearch`,
the promoter (for updates). **The mission/worker plane does not read it**:
zero references to `knowledgeGraph`/`hybridSearch` in
`ping-runtime/orchestration/` (verified by grep).

**WHEN?** On `POST /knowledge/search` (hybrid), on `GET /nodes`.

**HOW RANKED?** The graph does not rank. `EvidenceAuthority.rank` scores
`effectiveConfidence × provenance × (approved ? 1.2 : 1.0)`, ×0.5 for
fallback embeddings, ×0.2 for rejected. **Wiring gap (secondary finding):**
`HybridSearch` passes KG nodes with a `status` string but never sets the
`approved`/`rejected` booleans `rank()` reads — so the approved boost and
the rejected penalty are dead code for KG results today; ranking falls back
to confidence alone (1.0 vs 0.5 still orders approved above candidate, which
is why the existing F1 test passes despite the dead path).

**HOW INVALIDATED?** Rejection: `status='rejected'`, `confidence=0.2`. The
row is retained, never deleted.

**HOW CORRECTED?** In-place overwrite of `status`/`confidence` via
`updateNodeBySourceEvent`. **There is no lifecycle history table** — prior
states are lost (only `updated_at` moves). The correction *signal* survives
in M1 (`SNIPPET_APPROVED` / `SNIPPET_REJECTED` rows), but the materialized
node carries no transition log. Correction survival is therefore
convention-only, not provable from the node row. (Converged pipeline must
fix this: lifecycle transitions as events.)

**HOW FORGOTTEN?** No delete path, no TTL, no suppression list. `ON DELETE
CASCADE` on edges exists but nothing deletes nodes.

**DO WORKERS ACTUALLY CONSUME IT?** Only the `KnowledgePromoter` itself.
No mission worker, capability, or agent reads the knowledge graph or hybrid
search today. The MEMORY → WORKER link is unbuilt.

**Classification: REFACTOR (P0 fix + lifecycle history).** Keep the store
and the promoter-owned lifecycle; fix the conflict demotion (see P0-FIX.diff);
add a transition log so corrections provably survive; wire `status` →
`approved`/`rejected` booleans into `HybridSearch` so `rank()` honors its
contract. Do not add a fourth store.

---

## M3 — Qdrant vectors: semantic projection memory

**WHO WRITES?** `EmbeddingService.subscribe(eventRuntime)` — async
projection on 19 `INDEXABLE_TYPES` (`OBSERVATION_CREATED`,
`CLAIM_CREATED`, `RECOMMENDATION_CREATED`, `REVIEW_*`, `CUSTOMER_*`,
`PROJECT_*`, `ESTIMATE_*`, `LEAD_*`, `INVOICE_*`, `GITHUB_COMMIT_SYNCED`,
`GOOGLE_REVIEW_RECEIVED`, …). `projectToQdrant` upserts one point per event.
Failures are logged and counted, never thrown onto the emitter.

**WHAT IS WRITTEN?** Points: `{ id, vector[768], payload: { kind,
namespace, canonical_hash, source_event_id, event_type, text,
embedding: 'ollama'|'fallback', model, projected_at: null } }`.

**WHERE?** Qdrant (`ping-qdrant` container), collection `knowledge`.

**IDENTITY?** `toQdrantId(event_id)` — UUID-shaped from the event id hex.
Re-projection of the same event upserts the same point (idempotent).

**TENANT?** `namespace` in the payload only. **The Qdrant adapter has no
server-side filter** — `HybridSearch` enforces the privacy boundary by
dropping cross-namespace hits in code after retrieval.

**PROVENANCE?** `source_event_id`, `canonical_hash`, `model` name.

**CONFIDENCE?** The `embedding` flag: `'fallback'` when Ollama is
unreachable — a deterministic seeded vector (`seededVector(sha256({text,
model}))`), never a silent halt. Fallback points are down-ranked (×0.5) by
`rank()`. Note: fallback vectors are *deterministic per text*, so two
different texts never collide, but fallback-vs-real similarity scores are
not comparable — the flag, not the score, carries that meaning.

**WHO READS?** Only the semantic leg of `HybridSearch`
(`POST /knowledge/search`).

**WHEN?** On search queries.

**HOW RANKED?** Qdrant cosine score first, then `EvidenceAuthority.rank`
(×0.5 for fallback). Every hit is verified by tracing `source_event_id`
back to a real `ping_events` row (`EvidenceAuthority.verify`).

**HOW INVALIDATED?** No invalidation. Re-projection upserts over the same
point id.

**HOW CORRECTED?** By re-projection — but only new *events* trigger it.
The promoter's approve/reject does **not** re-project: a vector keeps its
candidate-era text forever, and node `status` is not in the Qdrant payload
at all. Approval is invisible to the semantic leg.

**HOW FORGOTTEN?** No delete path found. Points accumulate.

**DO WORKERS ACTUALLY CONSUME IT?** No. Only `HybridSearch`, which itself
has no worker callers today.

**Classification: KEEP (mechanism), REFACTOR (wiring).** The projection is
sound and idempotent; the privacy boundary should move server-side when the
adapter supports it; approval/rejection should propagate (or be joined at
read time) so the semantic leg does not serve stale candidate-era state as
if it were current.

---

## Cross-cutting findings

1. **Retrieval score is not truth — mostly honored.** `rank()` outputs
`rank_score` alongside `confidence`, `verified`, `evidence:[eventIds]`;
null confidence maps to 0.5 (neutral), never 1.0. The taxonomy rule holds in
R1/R2 code. The one breach is M2's demotion bug: a re-emitted row reads
`{status:'candidate', confidence:1.0}` — a retrieval consumer cannot tell
whether 1.0 means "human approved" or "demoted residue". The P0 fix removes
the breach at the write path.

2. **Re-emission semantics differ per memory — only M1 is correct.**
M1: `DO NOTHING` (safe). M2: `DO UPDATE` including `status` (P0 — unsafe).
M3: upsert same point id (safe for identity, but blind to lifecycle).

3. **The MEMORY → WORKER edge is missing.** Missions are driven by
`EventToMissionBridge` (M1 → mission), but no worker reads M2/R2. The
converged loop must add retrieval-into-context-pack as a worker input, or
memory stays a human dashboard feature.

4. **Test harness blind spot.** `gateway/test_knowledge_search.js`'s
`MockPool` models `INSERT INTO knowledge_nodes` as blind append — it never
simulates `ON CONFLICT`. The demotion path was therefore untestable in the
existing suite, which is how the P0 shipped. The regression test in this
bundle parses the module's own `DO UPDATE SET` clause so the harness tracks
the code.

5. **Dead code.** `ping-runtime/orchestration/generate_context_packets.js`
reads `c:\Users\nolan\PING\orchestration\*.json` — legacy, not wired into
anything. Classification: **DROP** (archive, do not port).

## Mechanism classification summary

| Mechanism | Verdict |
|---|---|
| `ping_events` / `UnifiedEventRuntime` | KEEP |
| `knowledge_nodes` / `KnowledgeGraph` | REFACTOR (P0 fix; add lifecycle history) |
| `KnowledgePromoter` (sole lifecycle writer) | KEEP — PROPAGATE as the pattern for all lifecycle writes |
| `EmbeddingService` / Qdrant projection | KEEP |
| `EvidenceAuthority` + `HybridSearch` | KEEP; REFACTOR (wire status→approved/rejected; server-side namespace filter when available) |
| `test_knowledge_search.js` MockPool | REFACTOR (model ON CONFLICT) |
| `generate_context_packets.js` | DROP |
| Any new memory store / orchestrator / event authority | FORBIDDEN — would be the fourth system |
