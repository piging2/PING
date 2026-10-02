# MEMORY HARVEST — Agent Memory Systems Research

Lane: CRX autonomous-missions / memory. Research only. No code adopted into CRX.
Date: 2026-09-23. All claims below were checked against cloned source (commit SHAs recorded);
README prose was treated as untrusted until confirmed in code. Falsified claims are listed
explicitly in §FALSIFIED.

## What was studied

| Project | Commit studied | License | What it is |
|---|---|---|---|
| Letta (ex-MemGPT), `archive` branch (retired V1 API server) | `56ba9c2` (2026-08-13) | Apache-2.0 | Self-editing memory blocks, archival/recall paging, git-backed memory |
| Graphiti (Zep's OSS engine) | `13587ea` | Apache-2.0 | Bi-temporal knowledge graph, hybrid retrieval |
| LangGraph | `bdb85b5` | MIT | Store (namespaced long-term memory) + checkpointer |
| LangMem | `9d033b4` (2026-09-08) | MIT | LLM upsert manager, running-summary compression |
| mem0 | `83b07b1` (2026-09-23) | Apache-2.0 | Phased fact-extraction pipeline, entity boosts, TTL |
| LightRAG | `6702eea` (2026-09-23) | MIT | Multi-mode KG+vector retrieval, token budgets |
| Memary | `b2331a2` (2024-10-18) | MIT | Dual-store entity memory (stream + aggregated) |
| MemoryBank / SiliconFriend | `cf61c41` | MIT | Ebbinghaus forgetting curve, recall reinforcement |
| Cognee | `663a2dc` (2026-09-19) | Apache-2.0 | ECL pipeline, contradiction + provenance tasks, feedback weights |
| GraphRAG (Microsoft) | `82b87bf` | MIT | Hierarchical Leiden communities, incremental indexing |
| Memori | `574b1ea` | Apache-2.0 | SQL-native memory, Rust core, full attribution on write |
| chamnan | `9c76ab0` (2026-09-23) | MIT | Repo-local markdown memory, secret redactor, concurrency tests |
| OpenAI ChatGPT memory | docs only (no source) | — | Two-tier saved-memories + chat-history; background "dreaming" |

Also consulted: Du et al. *Rethinking Memory in LLM-based Agents* (arXiv:2505.00675,
six operations: Consolidation, Updating, Indexing, Forgetting, Retrieval, Compression);
Liu et al. *Memory for Autonomous LLM Agents* (arXiv:2603.07670, write–manage–read loop);
MemoryBank paper (arXiv:2305.10250). Note: the `letta-ai/letta` main branch at HEAD is a
pointer README — all real code lives in `letta-ai/letta-code`; the retired V1 was studied
via the `archive` branch. Zep's only open-source path is Graphiti; Zep Community Edition
is deprecated (per Zep FAQ, re-verified 2026-08-27 by third-party review).

## The question

Not "which memory framework to install". **What memory operations actually improve
autonomous engineering?** The answer, after source inspection, is narrower than the
marketing: the operations with production-grade mechanisms are write qualification,
contradiction/supersession handling, tenant scoping, provenance, budget-bounded retrieval,
and forgetting. Everything else is either retrieval plumbing or aspirational.

---

## 1. WORKING CONTEXT

**Letta core memory blocks** (`letta-archive/letta/schemas/memory.py`, `Memory` class):
in-context memory is a list of labeled `Block`s, each with `label`, `value`, `description`,
`limit` (char budget), and `read_only`. Blocks render into the system prompt inside
`<memory_blocks>` with `<description>`, `<metadata>` (chars_current/chars_limit/read_only),
and `<value>` tags — i.e., the agent sees its own memory *budget and mutability* in-context.
The agent edits its own working memory through tools (`core_memory_append`,
`core_memory_replace`, `memory_apply_patch`, `memory_rethink`, `memory_str_replace`).
`ContextWindowOverview` makes the full context budget (system, core, archival, recall,
summary, filesystem, tools) a first-class typed object. Key detail: `core_memory_replace`
requires the exact `old_content` to be present or it raises — fail-closed replacement,
no silent overwrite (`core_tool_executor.py:328`).

**LangMem running summary** (`langmem/src/langmem/short_term/summarization.py`):
`summarize_messages` compresses oldest messages once cumulative tokens cross
`max_tokens_before_summary`, carrying a `RunningSummary` with `summarized_message_ids` —
only never-summarized messages are processed, so summarization is idempotent across turns.
Tool-call/tool-result pairs are never split mid-sequence.

**LightRAG token-budgeted assembly** (`LightRAG/lightrag/base.py`, `QueryParam`):
`max_entity_tokens`, `max_relation_tokens`, `max_total_tokens` are hard budgets on the
retrieved context; `only_need_context` / `only_need_prompt` separate retrieval from
generation so a worker can fetch context without an LLM call.

**chamnan roll-up injection** (`chamnan/docs/architecture.md`): session start injects only
*titles* of `memory/decisions` and `memory/lessons` plus the two most recent titles;
full detail stays behind a `## Full Detail` marker that is never injected — retrieve
titles, expand on demand.

## 2. WRITE QUALIFICATION (admission)

This is the operation the surveys say everyone skips and where quality rots.

**mem0 phased batch pipeline** (`mem0/mem0/memory/main.py::_add_to_vector_store`): Phase 0
gather session scope + last messages; Phase 1 retrieve existing memories (top_k=10,
scoped by user_id/agent_id/run_id); Phase 2 single LLM extraction call producing facts;
Phase 3 batch embed; Phase 4–5 md5-hash dedup within batch AND against existing hashes;
Phase 6 batch insert + batch history. Extraction failures raise `LLMError` instead of
returning `[]` — the code comments say the old silent `return []` made callers unable to
distinguish "LLM unavailable" from "no facts extracted" (typed failure semantics, mirroring
CRX's never-silently-empty rule).

**mem0 UUID→integer remap** (same file): before the LLM sees existing memories, real UUIDs
are remapped to small integers (`uuid_mapping[str(idx)] = mem.id`) — "anti-hallucination":
the model can reference memories by index but can never invent or leak a real memory ID.

**Graphiti edge resolution** (`graphiti/graphiti_core/utils/maintenance/edge_operations.py::
resolve_extracted_edges`): returns a `(resolved, invalidated, new)` triple. Within-batch
exact dedup on normalized fact key; hybrid-search candidate retrieval for both duplicates
and invalidation candidates; a Redis dedup cache covers recently-resolved edges not yet
visible in graph indexes (a real pipeline-race consistency mechanism);
`filter_existing_duplicate_of_edges` skips pairs already linked by `IS_DUPLICATE_OF`.

**Graphiti LLM dedup classification** (`graphiti/graphiti_core/prompts/dedupe_edges.py`):
the prompt explicitly distinguishes *duplicate* from *contradicted* — "same relationship
but updated title — contradiction, NOT a duplicate" — with `duplicate_facts` and
`contradicted_facts` as separate outputs.

**LangMem upsert policy** (`langmem/src/langmem/knowledge/extraction.py::create_memory_manager`):
`enable_inserts` / `enable_updates` / `enable_deletes` flags; the base manager defaults
deletes to **False** (fail-closed); the store manager defaults deletes to True but routes
through explicit `(namespace, key)` delete ops. Phases (`MemoryPhase`) can vary policy
per pass.

**Letta read_only blocks + char limits** (`core_tool_executor.py`): any edit tool raises
on `read_only` blocks (`READ_ONLY_BLOCK_EDIT_ERROR`); blocks carry `limit` and the
rendered prompt shows `chars_current/chars_limit` so the agent self-regulates.

## 3. RETRIEVAL

**LightRAG dual-level keywords** (`LightRAG/lightrag/operate.py::get_keywords_from_query`):
the LLM splits a query into high-level keywords (global/relationship retrieval) and
low-level keywords (local/entity retrieval); results cached in a hashing KV store;
caller-supplied keywords skip extraction. Modes: `local` (entity-centric), `global`
(relationship-centric), `hybrid`, `naive`, `mix` (KG+vector), `bypass` — mode is an
explicit retrieval-strategy selector on `QueryParam`.

**Graphiti hybrid RRF** (`edge_operations.py`): `EDGE_HYBRID_SEARCH_RRF` fuses semantic,
keyword (BM25), and graph traversal via reciprocal rank fusion for candidate edges.

**mem0 entity-linked boosting** (`mem0/mem0/memory/main.py::_compute_entity_boosts`):
entities extracted from the query are embedded, matched against a separate entity store
(threshold ≥ 0.5), and memories linked to matched entities get a score boost in [0, 0.5].
Entity↔memory links are maintained on every add/update/delete
(`_link_entities_for_memory`, `_remove_memory_from_entity_store`).

**Memori two-stage funnel** (`Memori/core/src/retrieval/pipeline.rs`):
`dense_limit` candidates → rerank → `final_limit`; retrieval is always entity-scoped
(`entity_id` + `query_text` in `RetrievalRequest`).

**LangGraph store search** (`langgraph/libs/checkpoint/langgraph/store/base/__init__.py`):
`search(namespace_prefix, query=None, filter, limit, offset, refresh_ttl)` — natural-language
query (vector, when the adapter has an index config) *combined* with exact key-value filters
inside a namespace prefix. Batch ops (`GetOp`/`PutOp`/`SearchOp`/`ListNamespacesOp`) let a
worker do point-get + semantic search in one round trip.

## 4. CONTRADICTION

**Graphiti deterministic invalidation** (`edge_operations.py::resolve_edge_contradictions`):
pure timestamp logic, no LLM: if the new edge's `valid_at` is after the old edge's
`valid_at` and their validity windows overlap, the old edge gets
`invalid_at = new.valid_at` and `expired_at = now()`. **The old fact is never deleted.**
Queries filter on validity windows, so history is preserved and the current truth is
derived. This is the strongest mechanism found for CRX's "correction survival" gap.

**Cognee non-destructive contradicts edges** (`cognee/cognee/tasks/graph/detect_contradictions.py`):
opt-in pipeline task (default off); LLM compares facts in the 1-hop neighborhood of
touched entities (deterministic `Entity:<name>` IDs make cross-ingestion matching work);
each contradiction is surfaced twice — a logged warning AND a `contradicts` edge carrying
both facts + reason + confidence. Non-destructive: only adds edges, never rewrites;
returns input unchanged; swallows its own errors so detection can never break ingestion.
Structural relationships (`contains`, `is_part_of`, `made_from`, `exists_in`,
`contradicts`) are excluded from comparison.

## 5. SUPERSESSION

Graphiti's bi-temporal model *is* the supersession mechanism (see §4): supersession =
append new edge + stamp old edge `invalid_at`. Complementary: **Letta git-backed memory**
(`letta-archive/letta/services/block_manager_git.py::GitEnabledBlockManager`): writes go
to git first (source of truth), PostgreSQL is a read cache; `get_block_at_commit` and
`get_block_history` give point-in-time memory reads. **mem0 `_update_memory`** preserves
`created_at`, bumps `updated_at`, rehashes, re-links entities, and appends an `UPDATE`
history row with old+new values.

## 6. STALENESS

**mem0 `expiration_date`** (`mem0/mem0/memory/main.py::_normalize_expiration_date`,
`_payload_is_expired`): per-memory TTL in YYYY-MM-DD; `search`/`get_all` hide expired
rows by default (`show_expired=False`); malformed dates fail closed with `ValueError`
at write time.

**LangGraph store TTL** (`store/base/__init__.py`): `put(..., ttl=<minutes>)`; reads take
`refresh_ttl` — TTLs are refreshed on access when requested (access-extends-lifetime,
a softer MemoryBank).

## 7. FORGETTING

The surveys' headline finding: only 4/27 surveyed systems implement forgetting. Source
inspection found exactly one real implementation:

**MemoryBank Ebbinghaus** (`memorybank/memory_bank/memory_retrieval/forget_memory.py`):
`forgetting_curve(t, S) = exp(-t*S/5)` over days-since-last-recall; at load time each
dialog is kept with probability = retention, otherwise **probabilistically deleted**
from the JSON bank (`initial_load_forget_and_save`); `update_memory_when_searched`
reinforces recalled memories (`memory_strength += 1`, `last_recall_date = now`) —
retrieval is consolidation. This is the only system where forgetting is a first-class
operation rather than a cap or a manual delete. (Memary's "human-like forgetting"
marketing is falsified — see §FALSIFIED.)

## 8. AUTHORITY RANKING

**Cognee feedback weights** (`cognee/cognee/tasks/memify/apply_feedback_weights.py`):
`stream_update_weight = w + α(rating − w)`, clipped to [0,1], 4-decimal rounding;
feedback 1–5 normalized to 0–1; separate alpha for explicit vs implicit feedback
(`FEEDBACK_SOURCE_EXPLICIT/IMPLICIT`, `IMPLICIT_FEEDBACK_ALPHA_FACTOR`); elements that
no longer exist are "pruned" but the feedback row stays pending until a max-attempt cap
bounds rescans. Outcome (QA feedback) directly moves the retrieval weight of the graph
elements that produced it — the only failure-memory→ranking loop found in source.

**Memary entity salience** (`memary/src/memary/memory/entity_knowledge_store.py`):
dual store — `MemoryStream` (raw timestamped mentions) and `EntityKnowledgeStore`
(entity → count, last-seen date); salience = frequency × recency, injected whole into
the prompt. Crude but deterministic and cheap.

## 9. PROVENANCE

**Cognee provenance ledger** (`cognee/cognee/tasks/provenance/record_provenance.py`):
opt-in (`PROVENANCE_TRACKING`, default off); appends document→chunk→entity→relationship
lineage to a relational ledger, one chained transaction per task invocation; ledger keys
prefixed `{dataset_id}:{raw_id}` because entity IDs are globally deterministic
(name-derived uuid5) — without the prefix, two tenants mentioning the same entity would
share one version chain. Hard constraint: returns input unchanged, swallows own errors;
missing ctx degrades to `source_ref_key=None`, never a raise.

**mem0 history table** (`mem0/memory/storage.py`, `main.py::db.add_history` /
`batch_add_history`): every ADD/UPDATE/DELETE appends `(memory_id, old, new, event,
created_at, updated_at, actor_id, role)` — full audit trail of memory evolution.

**Memori write attribution** (`Memori/core/src/augmentation/pipeline.rs`):
every augmentation payload carries entity id, process id, framework, LLM
(provider/sdk/version/model), platform, and storage dialect; IDs are SHA-hashed
(`hash_id`). Provenance is stamped at write time, not reconstructed later.

## 10. COMPRESSION

**LangMem running summary** (see §1): idempotent incremental summarization of working
context with `summarized_message_ids` — the only compression mechanism found that is
safe to re-run.

**GraphRAG community reports** (`graphrag/packages/graphrag/graphrag/index/workflows/
create_community_reports*.py`): per-community LLM summaries over entities/relationships/
claims — consolidation of a graph neighborhood into a retrievable summary node.

**OpenAI "dreaming"** (docs only): background process that curates chat history into
memory state to offset saved-memory staleness — the industrial version of a sleeptime
consolidation agent. Letta's archive has the open analogue: `sleeptime_memory_persona.txt`
("consolidate memories into more concise blocks, identify patterns, make inferences").

## 11. CONSOLIDATION

**GraphRAG incremental community merge** (`graphrag/packages/graphrag/graphrag/index/
update/communities.py::_update_and_merge_communities`): delta-run communities get IDs
remapped by `old_max + 1` and concatenated with old — append-only knowledge growth
without re-clustering the world.

**Cognee consolidate_entities** (`cognee/cognee/tasks/memify/consolidate_entities.py`):
`detect_entity_duplicates` (top-k vector similar pairs → union-find clustering,
same-type only) then `merge_entity_duplicates` — vector+symbolic dedup before graph
write.

**Graphiti communities** (`graphiti/graphiti_core/utils/maintenance/community_operations.py`):
label-propagation clustering + LLM summaries, with `update_community` for refresh —
communities are derived truth rebuilt from source edges, never hand-edited.

## 12. TENANT ISOLATION

**LangGraph store namespaces** (`langgraph/libs/checkpoint/langgraph/store/base/
__init__.py`): hierarchical tuple namespaces (`("memories", "{langgraph_user_id}")`
templated in LangMem), `MatchCondition` prefix/suffix/wildcard matching,
`ListNamespacesOp` for navigation. Isolation is structural: search is always
`namespace_prefix`-scoped.

**mem0 identity scoping** (`mem0/mem0/memory/main.py`): every vector search filters on
`user_id`/`agent_id`/`run_id`; `_validate_and_trim_entity_id` rejects empty or
whitespace-containing IDs; top-level entity params are rejected in favor of `filters`.

**Cognee dataset-prefixed ledger keys** (see §9): `{dataset_id}:{raw_id}` — required
because deterministic entity IDs would otherwise collide across tenants.

---

## Memory-category coverage map

| CRX memory category | Best source mechanism(s) |
|---|---|
| WORKING CONTEXT | Letta blocks w/ budgets+read_only; LangMem running summary; LightRAG token budgets; chamnan title-only roll-up |
| EPISODIC MEMORY | Graphiti EpisodicNode (valid_at per episode, `episodes` list on edges); mem0 per-message provenance (actor_id, role) |
| SEMANTIC KNOWLEDGE | Graphiti entity graph + communities; mem0 fact store + entity store |
| DECISIONS | chamnan `memory/decisions` (markdown beside code, title roll-up at session start) |
| OWNER CORRECTIONS | Graphiti temporal invalidation (correction = new edge, old edge stamped not deleted); Letta git history |
| TASK HISTORY | LangGraph checkpointer (thread-scoped checkpoints, serde incl. encrypted); mem0 history table |
| FAILURE MEMORY | Cognee feedback weights (outcome→weight loop); mem0 history events |
| PROCEDURAL MEMORY | 2026 consensus: `CLAUDE.md`/`AGENTS.md` as declarative procedural memory (survey-backed); chamnan `memory/rules` |
| REPOSITORY KNOWLEDGE | chamnan MAP.md/STATE.md index committed beside code, stdlib-only, no network |
| RUNTIME OBSERVATIONS | Cognee provenance ledger; Memori write attribution; Graphiti episodes |

## Cross-cutting findings

1. **Write qualification beats retrieval cleverness.** The systems with the best retrieval
   (LightRAG modes, Graphiti RRF) still rot without admission control; the durable quality
   gains come from dedup-before-write (mem0 hashes, Graphiti exact-key dedup), contradiction
   classification (Graphiti dedupe prompt, Cognee contradicts edges), and fail-closed edit
   tools (Letta exact-match replace).
2. **Never delete on correction; stamp and supersede.** Graphiti (temporal invalidation),
   Cognee (contradicts edges), Letta (git history), mem0 (history table) all converge:
   deletion destroys the evidence needed to adjudicate later disputes.
3. **Forgetting is nearly absent industry-wide** (4/27 in the survey; 1 real implementation
   found in source: MemoryBank). TTL/expiration (mem0, LangGraph) is the pragmatic
   substitute; probabilistic Ebbinghaus decay is the principled one.
4. **Tenant isolation is structural, not a filter bolt-on**: namespace-scoped search
   (LangGraph), identity-scoped filters (mem0), prefixed ledger keys (Cognee).
5. **Provenance must be stamped at write time** (Memori attribution, Cognee ledger,
   mem0 history) — reconstruction after the fact does not work.
6. **Auxiliary memory work must never break the main path**: Cognee's tasks return input
   unchanged and swallow their own errors; mem0 raises typed errors instead of returning
   `[]` so callers can distinguish failure from emptiness.
7. **Secret hygiene at ingestion is measurable**: chamnan's redactor ships with measured
   precision/recall on a synthetic corpus and documents its ceiling honestly (no-network
   rule forecloses live-key verification). Directly relevant to CRX's "untrusted inputs
   projected into memory with no trust gate" gap.

## FALSIFIED / ASPIRATIONAL CLAIMS (checked in source, do not harvest as mechanisms)

- **Memary "human-like forgetting"**: no decay, pruning, or forgetting function exists in
  `src/memary/`; the only removal path is `clearMemory` (total wipe: JSON files cleared +
  `MATCH (n) DETACH DELETE n`). The dual-store salience (count×recency) is real; forgetting
  is marketing. (`memary` @ `b2331a2`, `src/memary/agent/chat_agent.py`, `src/memary/memory/entity_knowledge_store.py`)
- **LangMem "maintains a versioned history of all changes"**: docstring claim in
  `create_memory_store_manager`; the write path is `store.put` (overwrite) + `store.delete`
  with no history table (`langmem` @ `9d033b4`, `src/langmem/knowledge/extraction.py:1193,1276`).
- **mem0 v1-style ADD/UPDATE/DELETE/NOOP consolidation loop**: the current OSS `add()`
  (`mem0` @ `83b07b1`) uses an *additive* pipeline (extract → hash-dedup → insert);
  contradiction-driven update/delete now only happens via explicit `update()`/`delete()`
  calls. The LOCOMO-era consolidation loop is gone from the default path.
- **`letta-ai/letta` main branch**: contains no implementation (pointer README to
  `letta-ai/letta-code`); the retired V1 server lives on the `archive` branch.
- **Zep open-source**: only Graphiti (`getzep/graphiti`) is OSS; Zep Community Edition is
  deprecated. "Zep mechanisms" = Graphiti mechanisms.
- **OpenAI memory internals** (bio tool, ~100-block cap, six-layer injection): from
  third-party reverse-engineering write-ups, not from source; treat as WATCH-grade.

## Harvest-class summary

- **ADAPT** (mechanism sound, needs CRX-shaped reimplementation): Graphiti temporal
  invalidation, mem0 phased pipeline + UUID remap + history, Cognee provenance ledger +
  contradicts edges + feedback weights, LangMem upsert policy + running summary,
  MemoryBank forgetting, Letta git memory + fail-closed replace, GraphRAG incremental
  merge, Memori attribution, memary salience.
- **REUSE** (directly portable pattern): mem0 expiration_date semantics, LightRAG token
  budgets, LangGraph namespace+TTL store contract, chamnan redactor discipline.
- **PATTERN** (adopt the shape, not the code): LightRAG dual keywords + modes, Graphiti
  RRF + dedupe-classify prompt, Letta blocks + ContextWindowOverview, chamnan repo-local
  markdown memory.
- **WATCH**: OpenAI two-tier/dreaming (docs only).
- **REJECT**: Memary "forgetting" (unimplemented), LangMem versioned-history (docstring-only).
