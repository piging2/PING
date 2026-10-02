# Agent E — Context / Retrieval + Knowledge + Freshness + Entity Resolution
**Recon track 14-17. Date: 2026-09-18. Read-only recon; no repo mutation.**
**Method: Pig WSL probes + live `ping-gateway` docker logs (LIVE RUNTIME TRACE where noted).**
**Checked-out branch: `feature/approval-effect-identity` (NOT main; NOT the codex branch).**

---

## (a) Context implementation comparison

Nine context-shaped implementations exist across the source universe. Two claim the name "ContextPack" and are mutually incompatible.

| # | Implementation | Location | Shape / pipeline | Maturity |
|---|---|---|---|---|
| 1 | **ContextCompiler + ContextIntegration** (JS, "PING Core v1") | `ping-runtime/context/context_compiler.js` (175 lines), `context_integration.js` (61 lines) | Ref-list pack: `canonical_object_refs`, `artifact_refs`, `evidence_refs` (event_ids), `relationship_refs`, `source_metadata`, `retrieval_manifest` (hash of inputs only), id `ctx_<hash16>`. `issueWorkOrderWithContext` injects `context_pack_id` + `context_refs` into WorkOrder input. | **BUILT_NOT_LIVE** — zero instantiations outside its own files and tests (verified `git grep` over all JS/TS). |
| 2 | **ContextPackBuilder** (Python, "Rule 2") | `runtime/cognitive/context_pack.py` (182 lines) + `models.py` | Content-carrying pack: `question`, `highest_authority`, `authority_chain`, `authority_resolution`, `lineage`, `supporting_documents`, `supporting_claims`, `contradictions`, `citations`, `witness_roots`, `confidence`. `validate_or_raise` enforces authority + evidence. | **PROVEN_INTEGRATION** — wired via `ReasoningGateway` -> `Supervisor` -> workers -> subprocess tools (`runtime/tools/*.py`), exposed at `brainos/orchestration/src/mission_control/app.py` `/reasoning/query` + `/reasoning/health` + `/reasoning/cache/invalidate`. Not observed live (no live mission_control service found). |
| 3 | **KnowledgeRetrieval** (JS, "Phase A.3 RAG") | `gateway/knowledge_retrieval.js` (151 lines) | **Question -> embed -> Qdrant topK -> Ollama -> answer. No pack, no authority resolution, no tenant scoping, no witness.** | **WIRED_UNPROVEN (live-adjacent)** — registered in live `gateway/bootstrap/wiring.js` container as `knowledgeRetrieval` and invoked from `gateway/activities/knowledge.activity.js`. `ping-gateway` container is live; qdrant currently `unhealthy` (degraded). |
| 4 | **ContextRetrievalAuthority** (JS, "Phase 16") | `gateway/context_retrieval_authority.js` (408 lines) | Mission -> Repository -> CurrentFile -> Neighbors -> ArchitectureMemory -> Facts -> Patterns -> PreviousFailures -> SuccessfulFixes -> Goals -> Mission -> CompressedTranscript -> PromptAuthority. Witnessed, ranked, deterministic. | **BUILT_NOT_LIVE** — never instantiated in non-test code. |
| 5 | **ContextCompressionAuthority** (JS, "Phase 12") | `gateway/context_compression_authority.js` (640 lines) | Hierarchical conversation summaries -> fact extraction -> entity graph -> relationship graph -> vector embeddings -> constitutional transcript (postgres+qdrant+ollama tables). | **BUILT_NOT_LIVE** — never instantiated in non-test code. |
| 6 | **ContextAuthority** (execution engine) | `ping-runtime/orchestration/execution/context_authority.js` (298 lines) | `buildContext(mission, workerId)`: repo slice from intelligence graph (RepositoryKnowledgeIndex) — file nodes, dep graph, ADR index, relevant authorities. Straight repo-slice, no pack. | **WIRED_UNPROVEN** — instantiated in `ping-runtime/orchestration/execution/engine.js:76`; engine.js referenced from `gateway/bootstrap/gateway_runtime.js` and `ping-runtime/orchestration/index.js`. Live-ness of engine path not traced to the running gateway. |
| 7 | **Context packets** (legacy) | `ping-runtime/orchestration/generate_context_packets.js` (230 lines) + `ContextPackets.json` | Static doc-packets (kernel/replay/witness/gateway/commit/worker) generated from Windows `c:\Users\nolan\PING\...` paths. | **PRESERVED_INACTIVE** — historical; `ConstitutionalQueryAPI.js` reads the legacy `ContextPackets.json`. |
| 8 | **Root CLI builder** | `context_pack_builder.py` (108 lines, root) | Read-only CLI assembling "Context Pack v2" via `runtime/tools/*.py`; explicitly does NOT call Ollama. | **EXPERIMENTAL** — duplicates #2. |
| 9 | **LifecycleContext** | `gateway/lifecycle_context.js` (120 lines) | Lifecycle-scoped context carrier (not fully audited this pass). | **UNKNOWN** |

### Historical commits (all exist, none on the checked-out branch or main)

| SHA | Message | Where it lives | What it does |
|---|---|---|---|
| `902f40f44` | fix(context): make ContextPack selection replayable | `codex/context-workorder-convergence` only (also `remotes/origin/...`) | Adds `_canonicalizeEvents`: validates event shape, ISO-normalizes timestamps, dedups by `event_id`, **throws on conflicting content for the same event_id**, sorts by event_id, attaches `content_hash`; sorts all ref lists. |
| `b30790f3f` | feat(workorder): bind authorized ContextPack identity | `codex/context-workorder-convergence` only | `external_agent_adapter.js issueWorkOrder` gains required `contextPackId`; envelope + result schema + **result identity hash (`external-result:sha256`) includes `context_pack_id`** — the actual executor binding. BOUNDARY.md / WORKORDER_SCHEMA.json / RESULT_SCHEMA.json updated. |
| `f20f6b9c4` | feat(context): verify tenant-scoped canonical evidence | `codex/context-workorder-convergence` only | `UnifiedEventRuntime.getCorrelationGroup(correlationId, limit, namespace)` gains optional SQL tenant filter; compiler threads namespace through; adversarial tests. |

Key divergence facts:
- On `main`, `ping-runtime/context/context_compiler.js` **does not exist** (0 lines).
- On the checked-out branch, the compiler is the **pre-fix** version from `808363f91` (no canonicalization, no conflict detection, no tenant filter); the `external-agent/` directory **does not exist** there either, so `issueWorkOrderWithContext` cannot execute even in principle.
- `git merge-base --is-ancestor 902f40f44 HEAD` → **NO**.

### Audit of the JS ContextCompiler against the required fields

| Field | Current checkout branch | Codex branch (with 902f40f44+f20f6b9c4) |
|---|---|---|
| Event normalization | None (verbatim payload/metadata) | Shape validation + ISO timestamp normalization + content_hash |
| Duplicate delivery | Ref-level Set dedup only | Event-level dedup by event_id |
| Conflicting event identity | Silent (first wins by Set) | **Throws** on content conflict for same event_id |
| Ordering | Arrival order from correlation query | Deterministic sort by event_id |
| Selected-event manifest | `retrieval_manifest.hash` covers `{mission_id, query, correlation_id}` **only — not the selected events** (fails its own replay claim) | Same (fix commit did not touch the manifest input set) |
| Payload refs | Bare string tags (`customer:<id>`, `artifact:<id>`) — no payload carried | Same |
| Namespace | None on refs | namespace = event.namespace ?? metadata.namespace; tenant filter at query |
| Principal | None | None |
| Correlation | correlation_id | correlation_id |
| Causation | None (relationship_refs are payload joins, not causal) | None |
| Evidence references | event_ids | event_ids |
| Knowledge references | None | None |
| Compiler version | None | None |
| Source versions | None | None |

### (a) verdict — ContextPack boundary hypothesis FALSIFIED

The hypothesis "ContextPack is THE model-independence boundary: QUESTION -> INTENT -> GRAPH EXPANSION -> LEXICAL -> VECTOR -> EVIDENCE RANKING -> CONTEXT COMPILER -> CONTEXTPACK -> MODEL/EXECUTOR, with no bypass" is **falsified** by current executable code and live runtime trace:

1. **Live runtime has no ContextPack at all.** `ping-gateway` (image `ping-gateway:devin-boundary2`, `node gateway/server.js`, running 25h) registers canonical workers (`observation`, `claim`, `classification`, `recommendation`, `projection`, `replay`, `knowledge-promotion`) — but **zero** context/ContextPack/ContextCompiler registrations in startup logs.
2. **Direct RAG answer path is wired.** `gateway/knowledge_retrieval.js` answers questions via Qdrant -> Ollama with no pack, no authority resolution, no tenant scoping; registered in the live gateway bootstrap (`gateway/bootstrap/wiring.js:111`) and invoked from `gateway/activities/knowledge.activity.js`. This directly contradicts the Python pipeline's "Rule 1: No direct vector search answers" and the `context_pack.py` docstring "Every answer must originate from a Context Pack."
3. **Temporal mission path has no pack.** `ping-runtime/temporal/workflows/mission_workflow.js` -> `activities.executeWorkOrder` carries raw `input`; the only `context_pack_id` mention is inside a commented-out TODO. The live-ish temporal container (`ping-temporal-dev`, up 25h) has nothing to compile against.
4. **JS boundary is unexecutable on the active branch.** No instantiations of `ContextCompiler`/`ContextIntegration` anywhere; the `external-agent/` adapter they were designed to feed does not exist on the checked-out branch or main. The three commits that would make the boundary real exist only on the unmerged `codex/context-workorder-convergence` branch.
5. **Two incompatible "ContextPack" types coexist.** #1 is a ref-list (pointers only, no payload); #2 is a content-carrying pack. Both claim canonicity. Even the pipeline stages in the hypothesis are only partially real: GRAPH EXPANSION exists as a Python tool call (`runtime/tools/graph_expand.py`); LEXICAL and EVIDENCE RANKING have no dedicated code (ranking exists only inside `EvidenceAuthority.rank`, a JS scoring function); INTENT has no implementation.
6. **`synthesize_answer` swallows all failures** (`runtime/cognitive/supervisor.py`): `except Exception: answer = "Supervisor synthesis unavailable — Context Pack returned directly."` — the enforcement path degrades silently.

What the boundary claim would need to become true: gate every `inference_adapter.chat/embed` call behind a pack-required wrapper (or formally bless KnowledgeRetrieval as a default-deny legacy ingress with allowlist), land the codex-branch work (canonicalization + conflict-throw + tenant filter + adapter `contextPackId` binding) onto the active branch, and unify the two pack types.

---

## (b) Knowledge-chain coverage + negative states

Target chain: SOURCE -> SNAPSHOT -> OBSERVATION -> CLAIM -> EVIDENCE -> ASSESSMENT -> VERIFIED/PROMOTED KNOWLEDGE.

| Link | Code | Maturity |
|---|---|---|
| SOURCE | `gateway/github_snapshot.js` (`GitHubSnapshot extends RepositoryProvider`, GITHUB_* env config); `DocumentIngestion` registered in `gateway/bootstrap/wiring.js` | **WIRED_UNPROVEN** (github_snapshot); document ingestion wired in bootstrap |
| SNAPSHOT | `gateway/snapshot_authority.js` `SnapshotAuthority.createRepositorySnapshot` — repo *metadata* snapshot (stars, forks, open_issues), not per-file content hashes | **BUILT_NOT_LIVE** |
| OBSERVATION | `OBSERVATION_CREATED` events via gateway; `observation` canonical worker registered in live gateway logs handling 20 event types (LEAD_CREATED, CUSTOMER_CREATED, GITHUB_COMMIT_SYNCED, DOCUMENT_IMPORT, ...) | **PROVEN_RUNTIME** (registered in live `ping-gateway` startup) |
| CLAIM | `ClaimWorker` (`ping-runtime/workers/canonical_workers.js:128`): handles `OBSERVATION_CREATED`/`CLAIM_GENERATE`, emits `CLAIM_CREATED` with `causation_id`; knowledge graph nodes default `status='candidate'` | **PROVEN_RUNTIME** (worker registered live); node lifecycle **PROVEN_INTEGRATION** |
| EVIDENCE | `ping-runtime/evidence/evidence_authority.js` `EvidenceAuthority.rank`: score = confidence x provenance x (approved?1.2) x (fallback?0.5) x (rejected?0.2); **null confidence -> 0.5 "neutral: below any explicit assessment but above rejected"** | **WIRED_UNPROVEN** |
| ASSESSMENT | Human approval events (`SNIPPET_APPROVED/AI_RESPONSE_ACCEPTED/...`) -> `KnowledgePromoter` (ADD-only update: approved=1.0 / rejected=0.2). No machine assessment step exists; rank() is scoring, not a state. | **WIRED_UNPROVEN** (promoter registered live); machine assessment **absent** |
| VERIFIED/PROMOTED | `knowledge_nodes.status` candidate -> approved/rejected; `confidence_provenance` column distinguishes model vs canonical provenance | Code **PROVEN_INTEGRATION**; live promotion path via registered promoter worker |

### Negative knowledge states — inventory (code vs documentation)

| State | Real code state? |
|---|---|
| UNKNOWN | **No.** Only generic `UNKNOWN`/`UNKNOWN_ERROR` failure codes in `gateway/deterministic_failure_envelope.js` and replay kernel — unrelated to knowledge. |
| INSUFFICIENT_EVIDENCE | **No** (JS and Python both zero hits). |
| CONFLICTING_EVIDENCE | **No as a knowledge state.** Exists only as transient *findings*: Python `ContradictionWorker` populates `pack.contradictions`; the JS compiler throws on conflicting event content but does not record the conflict as a knowledge state. |
| STALE | **No as a knowledge state.** "STALE" appears only in `accepted_by_ping` epoch discussions (docs), never on knowledge nodes. |
| UNVERIFIED | **No** (zero hits both languages). |
| NOT_APPLICABLE | **No** (zero hits). |
| NO_OPPORTUNITY_FOUND | **No** (zero hits). |

Nearest existing: `status` enum {candidate, approved, rejected} on `knowledge_nodes`; `rejected` (0.2 confidence) functions as the only negative pole. There is no way for the system to say "we looked and there is not enough evidence" vs "we never looked."

---

## (c) Freshness / invalidation — design only, no implementation

### The two freshness questions
1. Git changes one file -> which knowledge became stale? **Nothing in PING can answer this today.**
2. A connector updates a record -> what must recompile? **Nothing tracks this today.**

### What exists today (the gap baseline)
- **Snapshot granularity is wrong for the job.** `SnapshotAuthority.createRepositorySnapshot` snapshots repo *metadata* (stars/forks/issues), not content. Per-file content hashes exist only as a static artifact (`RepositoryKnowledgeIndex/filesystem.json`, `dependency_graph.json`) with no runtime consumer found.
- **No dependency edges.** No table/edge links a snapshot unit -> compiler inputs -> compiler outputs -> knowledge nodes. `knowledge_nodes` carries per-node provenance (`source_event_id`, `correlation_id`, `confidence_provenance`) but nothing pointing *upstream* to what could invalidate it.
- **Invalidation today = TTL + manual delete.** `runtime/cognitive/context_pack_cache.py`: 24h file cache keyed by `sha256(question)[:16]` + `authority_root`; invalidation is only a per-question DELETE endpoint (`/reasoning/cache/invalidate`). A cached pack can serve for 24h while its underlying evidence changes, with no signal.
- **No staleness column anywhere** on knowledge nodes or packs.

### Minimum metadata design (design only)

Per snapshot unit (file, record, message batch):
- `snapshot_id`, `content_hash` (sha256 of canonical bytes), `captured_at`, `source_version` (connector/schema version), `namespace`.

Per dependency edge (the missing table):
- `edge { from: snapshot_id@content_hash, to: derived_id, kind: INPUT_OF | OUTPUT_OF | INVALIDATES, compiler: name, compiler_version }`.

Per compiler run:
- `input_manifest` (content hashes of all inputs + `compiler_version` + `compiler_input_schema`), `output_manifest` (content hashes of all outputs), `run_id`, deterministic inputs -> deterministic outputs (so recompile of unchanged inputs is a no-op).

Per knowledge node:
- `freshness: FRESH | STALE(reason) | UNKNOWN`, `stale_reason` (e.g. `input <snapshot_id> changed <old_hash> -> <new_hash>`), `derived_from` (list of compiler run_ids), `last_verified_at`.

Invalidation protocol (targeted, incremental):
1. On snapshot write: compare `content_hash` to previous for that unit; if changed, walk dependency edges `INPUT_OF` -> affected compiler runs -> their `OUTPUT_OF` nodes.
2. Mark affected knowledge nodes `STALE(reason)` (never delete; append-only per the promoter contract).
3. Schedule incremental recompile of only affected runs (same compiler version + same other inputs -> expected same outputs except changed unit; verify by re-running and diffing `output_manifest`).
4. Downstream consumers (packs) must carry the compiler manifest; a pack whose inputs are all `FRESH` is servable, otherwise it recompiles or serves with explicit `STALE_INPUTS` disclosure.

What exists vs gap: exists = per-node `source_event_id`/`correlation_id` provenance + content-hash utilities (`CanonicalAuthority.hash`) + ADD-only node updates. Gap = everything else: no snapshot content hashes at runtime, no dependency edges, no compiler manifests (neither pack type carries compiler_version/source versions), no freshness states, no invalidation walker, no incremental recompile.

---

## (d) Entity resolution — audit + design

### Audit: identity across sources today
- `git grep -i "dedupe|mergeIdentit|mergeEntit|entityResolution|resolveIdentity|identity_resolution"` over all JS/Python (non-test): **zero hits. No merge/dedupe/resolve logic exists anywhere. PING does not merge any identities today — silently or otherwise.**
- What exists instead: parallel, unlinked identifiers.
  - JS compiler emits bare tags: `customer:<id>`, `project:<id>`, `lead:<id>`, `invoice:<id>` (duplicated `if` lines in `_extractCanonicalObjectRefs`, e.g. `project_id` checked twice — copy-paste, harmless).
  - `knowledge_nodes(entity_type, entity_id)` columns exist with an index, but nothing resolves `github_user:octocat` == `email:nolan@x.com` == `crm_contact:42`.
  - Connectors (`github_connector`, `google_connector`, `email_connector`, `sms_connector`, `posthog_connector`) each carry their own identity scheme; `CustomerAuthority`/`ProjectAuthority` are referenced as optional compiler dependencies but were not found as implemented authorities (constructor accepts null; `dependencies` lists only `eventRuntime` when they are absent).
  - `ContextCompressionAuthority` builds an "entity graph" per conversation (Phase 12) but is **BUILT_NOT_LIVE** (never instantiated).

### Design (no implementation): evidence-backed entity resolution
Rules: no silent merges; no sensitive-trait inference (race, religion, health, politics, etc. never used as match signals); every merge reversible.

1. **Candidate generation** (recall-oriented, cheap signals only): normalized email equality, phone equality, exact username match within one namespace, org domain + name fuzzy match. Each candidate pair gets `candidate_id`.
2. **Evidence attachment**: each match signal is stored as an evidence record `{ signal, source, source_version, observed_at, strength }` linked to the candidate. Signals are additive; absence of a signal is not negative evidence.
3. **Confidence + ambiguity**: `confidence = f(signals)` with an explicit `AMBIGUOUS` band (e.g. 0.4–0.75). Above threshold -> auto-link with `LINKED` state; inside band -> `NEEDS_HUMAN_DECISION`, surfaced to an operator queue; below -> `NOT_LINKED`.
4. **Human decision when necessary**: operator approves/rejects with a reason; decision recorded as an event (`ENTITY_LINK_DECIDED`) with principal + timestamp (human decisions are first-class evidence, same as the promoter pattern).
5. **Reversible merge**: links are edges (`entity_link { from, to, state, decided_by, evidence[] }`), never row merges. **Split** = add a `superseded` edge + emit `ENTITY_LINK_SPLIT`; history is append-only so the pre-merge view is replayable.
6. **History**: full link ledger retained; knowledge nodes referencing a merged entity keep their original `entity_id` plus a resolved `canonical_entity_id` projection — the projection is rebuildable, the source is untouched.

---

## (e) Decision-ownership rows

| Decision | Owner (code) | Maturity |
|---|---|---|
| Which events enter a mission's context | `ContextCompiler._getCorrelationGroup` -> `UnifiedEventRuntime.getCorrelationGroup` (codex: +namespace filter) | BUILT_NOT_LIVE (compiler); runtime PRESUMED (PG live, `ping-postgres` up 21h) |
| Conflicting event identity -> fail vs merge | `ContextCompiler._canonicalizeEvents` (throws) | **Exists only on unmerged codex branch**; active branch silently first-wins |
| ContextPack identity | JS: `ctx_<sha256(mission_id,query,correlationId,retrieval_hash)[:16]>`; Python: `sha256(question)[:16]` + `authority_root` cache key | BUILT_NOT_LIVE / PROVEN_INTEGRATION |
| Whether a WorkOrder carries authorized context | `ExternalAgentAdapter.issueWorkOrder` (`contextPackId` required, in result identity hash) | **Exists only on unmerged codex branch**; dir absent on active branch |
| Authority resolution for an answer | `ContextPackBuilder._resolve_authority` + `Supervisor._enforce_authority` | PROVEN_INTEGRATION |
| Answer synthesis input | `Supervisor.synthesize_answer` (pack JSON as sole model input) | PROVEN_INTEGRATION (with silent-failure caveat) |
| Direct RAG answers (bypass) | `KnowledgeRetrieval.answerQuestion` | WIRED_UNPROVEN (live gateway bootstrap) |
| Repo-slice context for code missions | `ContextAuthority.buildContext` in execution engine | WIRED_UNPROVEN |
| Observation -> Claim | `ClaimWorker` (live-registered) | PROVEN_RUNTIME |
| Claim -> Classification -> Recommendation | canonical workers (live-registered) | PROVEN_RUNTIME (registration observed; per-event behavior not traced) |
| Candidate -> approved/rejected | `KnowledgePromoter` on human approval events (live-registered) | PROVEN_RUNTIME (registration) |
| Evidence ranking | `EvidenceAuthority.rank` | WIRED_UNPROVEN |
| Pack cache lifetime | `ContextPackCache` (24h TTL, per-question manual invalidate) | PROVEN_INTEGRATION |

---

## (f) Contradictions

1. **"Every answer must originate from a Context Pack"** (`runtime/cognitive/context_pack.py` docstring; "Rule 2: Context Pack mandatory") vs **`gateway/knowledge_retrieval.js`** answering directly from Qdrant -> Ollama, registered in the live gateway bootstrap. The system's two halves state opposite laws.
2. **"Rule 1: No direct vector search answers"** (Python health endpoint) vs **"Phase A.3: Question -> Embedding -> Qdrant Search -> Top K -> Ollama -> Answer"** (`knowledge_retrieval.js` header). Same contradiction, stated as rules.
3. **"fix(context): make ContextPack selection replayable"** (902f40f44) vs the active branch not containing the fix — and the retrieval manifest still hashing inputs-only, not selected events, so even the fixed version does not make *selection* replayable, only ordering deterministic.
4. **Python pack (content-carrying) vs JS pack (ref-list)** — two incompatible canonical types under one name; no adapter between them.
5. **`KnowledgePromoter` is ADD-only ("data is never rewritten")** vs `knowledge_graph.js` `ON CONFLICT (node_id) DO UPDATE SET data=..., status=...` — updates on conflict contradict the append-only claim at the SQL layer (mitigated: status/confidence transitions are the intended mutation, but `data` is overwritten).
6. **`synthesize_answer` enforces the pack then catches everything** — `except Exception` downgrades any enforcement failure to a canned string, so the boundary fails open in exactly the case it matters.
7. **ContextCache re-validates cached packs via `_enforce_authority`** (good) but keys on `sha256(question)[:16]` — 16 hex chars (~64 bits) with no per-tenant keying in the filename; `authority_root` collision check is string equality on possibly-null fields.

---

## (g) Unknowns

1. Is `brainos/.../mission_control` `/reasoning/query` the live serving path, or is the live surface the `gateway/server.js` HTTP API? (Live gateway logs show EventBridge + canonical workers; no reasoning endpoint observed.)
2. Is `ping-runtime/orchestration/execution/engine.js` (with `ContextAuthority`) actually invoked by the running gateway, or only referenced by `gateway_runtime.js`?
3. Does `UnifiedEventRuntime.getCorrelationGroup` read a live `ping_events` table with real rows (PG is up; content not inspected — read-only SELECT was authorized but not exercised this pass)?
4. `gateway/lifecycle_context.js` — 120 lines, not audited; purpose unknown.
5. Whether the `claim -> classification -> recommendation` workers do anything beyond registration (log evidence was startup-only).
6. `runtime/tools/*.py` (authority_search, graph_expand, etc.) — real implementations or stubs behind the subprocess protocol? (Referenced but not read this pass.)

---

## (h) Candidate deletions / merges

**Merges (preferred — preserve behavior):**
- M1. Unify the two ContextPack types: either make the JS ref-list pack a *projection* of the Python content pack (refs resolve against pack contents), or formally classify one canonical and the other a compatibility adapter. Two canonicals is the sharpest architectural amnesia in this track.
- M2. Fold `context_pack_builder.py` (root CLI) into `runtime/cognitive/` — it duplicates the builder via the same `runtime/tools`.
- M3. Merge the three never-instantiated retrieval authorities (#4, #5) into one retrieval design doc + one implementation, or delete; three parallel "context" authorities with zero callers is dead surface.

**Deletions / archival (prove deadness first per the no-amnesia rule):**
- D1. `ping-runtime/orchestration/generate_context_packets.js` + `ContextPackets.json` + `ConstitutionalQueryAPI.js` — Windows-path legacy; superseded by every newer pack.
- D2. `ping-runtime/context/context_compiler.js.backup` — backup file in source tree.
- D3. `gateway/activities/knowledge.activity.js` imports `{ knowledgeRetrieval }` (lowercase) but `knowledge_retrieval.js` exports `{ KnowledgeRetrieval }` (verified `module.exports` tail) — the activity's `knowledgeRetrieval.answerQuestion(...)` would throw TypeError at call time. The `wiring.js` registration uses the correct capitalized form. The activity wrapper is dead code on the bypass path.
- D4. The duplicated `if` lines in `_extractCanonicalObjectRefs` (each id checked twice verbatim) — trivial cleanup if the file survives.

**Do NOT delete:** the codex-branch context work (902f40f44/b30790f3f/f20f6b9c4) — it is the only version with conflict detection, tenant filtering, and executor binding; it needs landing, not archival.

---

## (i) Top-5 highest-confidence improvements

1. **Close the bypass or bless it explicitly.** Either gate `inference_adapter.chat/embed` behind a ContextPack-required wrapper, or formally classify `KnowledgeRetrieval` as a default-deny legacy ingress with an explicit allowlist. Today the two halves of the system state opposite laws, and the bypass is the one wired into the live gateway bootstrap. (Falsifies the boundary; highest constitutional risk.)
2. **Land the codex-branch context work onto the active branch.** Canonicalization + conflict-throw + deterministic ordering + tenant-scoped evidence + `contextPackId` bound into the work-order envelope and result identity hash exist only on unmerged `codex/context-workorder-convergence`. The active branch's compiler is strictly weaker and its adapter is absent.
3. **Make packs self-describing and replayable for real.** Add `compiler_version`, `input_manifest` (content hashes of selected events), `source_versions` to both pack types; change `retrieval_manifest` to hash the selected events, not just the query inputs. Without this, "replayable selection" is a commit message, not a property.
4. **Add negative knowledge states and freshness.** `UNKNOWN / INSUFFICIENT_EVIDENCE / CONFLICTING_EVIDENCE / STALE / UNVERIFIED` as real node states plus `freshness + stale_reason + derived_from` columns, backed by the dependency-edge design in (c). The system currently cannot distinguish "never looked" from "looked and found nothing," and cached packs can serve stale evidence for 24h silently.
5. **Fix the silent-failure enforcement.** `Supervisor.synthesize_answer`'s bare `except Exception` turns pack-validation failures into a canned string — fail closed (raise/emit) instead. Enforcement that degrades to a string is not enforcement.

---

## Evidence log (for cross-agent verification)

- Live: `docker logs ping-gateway` (image `ping-gateway:devin-boundary2`, entry `node gateway/server.js`): canonical workers registered (observation/claim/classification/recommendation/projection/replay/knowledge-promotion); **zero context/ContextPack lines**. Containers: ping-gateway, ping-postgres, ping-qdrant (unhealthy), ping-temporal-dev, ollama all up.
- `git grep -n "new ContextCompiler"` / `"new ContextIntegration"` / `"issueWorkOrderWithContext"` (all JS/TS, non-test): hits only inside `ping-runtime/context/context_integration.js` itself.
- `git grep -n "new ContextRetrievalAuthority\|new ContextCompressionAuthority"`: zero non-test hits.
- `git grep -i "dedupe\|mergeIdentit\|mergeEntit\|entityResolution\|resolveIdentity\|identity_resolution"` (JS+PY, non-test): zero hits.
- Negative states `INSUFFICIENT_EVIDENCE|CONFLICTING_EVIDENCE|STALE|UNVERIFIED|NOT_APPLICABLE|NO_OPPORTUNITY_FOUND` in `runtime/cognitive/*.py` and all JS (non-test): zero hits.
- `invalidate|Invalidat` (non-test): only `context_pack_cache.py` + `/reasoning/cache/invalidate` endpoint.
- Branch facts: `git merge-base --is-ancestor 902f40f44 HEAD` = NO; `git show main:ping-runtime/context/context_compiler.js` = absent; `git branch --all --contains <sha>` = codex branch only, for all three SHAs.
- Checked-out branch: `feature/approval-effect-identity`; `ping-runtime/external-agent/` absent on disk there.
