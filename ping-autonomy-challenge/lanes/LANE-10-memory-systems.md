# LANE 10: MEMORY SYSTEMS - Adversarial Survey, Falsification, Harvest

**Wave 1, PING Autonomy Grand Challenge. Research / falsification / harvest only. No code changed, no systems built.**

Mission: interrogate how production memory systems decide what to remember, how retrieval actually works, how wrong memories get corrected, whether forgetting is real, and whether provenance survives. Reject "embed conversation and retrieve nearest chunks" as sufficient.

Every mechanism below was required to answer twelve questions before surviving:
**WHY** was this remembered? **WHO** observed it? **WHAT** evidence supports it? **WHEN**? **FOR WHICH TENANT**? **IS IT CURRENT**? **WHAT CONTRADICTS IT**? **WHO MAY READ IT**? **CAN IT EXPIRE**? **CAN IT BE CORRECTED**? **CAN IT BE FORGOTTEN**? **DID IT AFFECT AN ACTION**?

---

## 1. Sources + pinned SHAs

All source reads were done against local clones. SHAs are `git rev-parse HEAD` of the exact tree read.

| # | System | Repo | SHA (pinned) | What was read |
|---|--------|------|--------------|---------------|
| S1 | Mem0 (OSS Python SDK) | `mem0ai/mem0` | `47a69e1e72dc562b6fdd49a9ef892229afc7508a` | `mem0/memory/main.py` (3868 lines: full write/read/correct/forget paths), `storage.py` (SQLite history), `utils.py`, `configs/prompts.py` (extraction prompts), `memory/telemetry.py` |
| S2 | Letta (current) | `letta-ai/letta` | `5bcdd177d70fa2b31a754cfcd801e77b2e1ab16a` | `README.md` only. **Finding:** this repo is now a pointer; all source moved to `letta-ai/letta-code`. Recorded so nobody cites "Letta source" from the wrong repo. |
| S3 | Letta Code (V2 agent harness) | `letta-ai/letta-code` | `2bc00344def41f696fade772cc51eb9f1dc0ba66` | `src/memory-constraints.ts`, `src/memory-confinement.ts`, `src/memory-frontmatter.ts`, `src/skills/builtin/` memory skills |
| S4 | Letta V1 (classic MemGPT architecture, archive branch) | `letta-ai/letta` branch `archive` | `56ba9c25552605eec89de8ed3dc6394b625c1993` | `letta/schemas/memory.py`, `letta/schemas/block.py`, `letta/schemas/passage.py`, `letta/services/passage_manager.py`, `letta/services/archive_manager.py`, `letta/functions/function_sets/base.py` |
| S5 | Graphiti (Zep's temporal KG, open source) | `getzep/graphiti` | `13587ea382a86aa6e011ee537ce5e595d078b691` | `graphiti_core/graphiti.py` (`add_episode`, `search`, `search_`), `graphiti_core/nodes.py`, `graphiti_core/edges.py`, `graphiti_core/utils/maintenance/edge_operations.py` (`resolve_extracted_edges`) |
| S6 | LangGraph (store + checkpointer) | `langchain-ai/langgraph` | `7daa3ab49d678a5da75edb08baa87db4a2be52c3` | `libs/checkpoint/langgraph/store/base/__init__.py` (`BaseStore`: put/get/search/delete/TTL), `libs/checkpoint/langgraph/checkpoint/base/__init__.py` (thread/checkpoint lineage) - sparse checkout of `libs/checkpoint`, `libs/store` |
| S7 | OpenAI ChatGPT memory | docs + third-party RE | n/a (product, closed) | `help.openai.com` Memory FAQ (`https://help.openai.com/en/articles/8590148`); independent reverse-engineering writeup (`loustloust04-del/lost-in-blossom` docs). **All product-internals claims below are marked UNVERIFIED-BY-SOURCE.** |
| S8 | Anthropic memory (API Memory Tool beta + Managed Agents memory stores) | docs (via mirrors) | n/a (product, closed) | `memory_20250818` tool description (memdb adapter docs); Managed Agents memory docs mirrored in `seangsisg/claude-code-docs` (`docs__en__managed-agents__memory.md`), `jojowadaxi/ai-agent-trending` skill, `folken2/nuvel` SKILL.md, `lh8ppl/core-memory-kit` research note (verified against `platform.claude.com/docs` 2026-07-21). Cross-checked across 4+ independent mirrors; marked DOCS-ONLY. |
| S9 | Zep product | paper + docs | n/a | arXiv `2501.13956` ("ZEP: A Temporal Knowledge Graph Architecture for Agent Memory"); `help.getzep.com/graph-overview`. Product internals = S5 (Graphiti) + paper. |
| S10 | Vector-store tenancy | docs | n/a | Qdrant multitenancy docs (payload `group_id` partitioning; `is_tenant` formal multitenancy), mirrored in two independent repos. Pattern-level only. |

**Deliberately not surveyed as primary sources:** LangChain's older `ConversationBufferMemory` (superseded by LangGraph), Mem0's hosted platform internals (closed), Zep Cloud internals (closed).

**Clone locations (durable, for re-verification):** `~/workspace/ping-autonomy-challenge/work-lane10/src/{mem0,letta,letta-code,letta-v1,graphiti,langgraph}/`

---

## 2. Mechanisms (canonical format)

Field key: MECHANISM_ID | PROBLEM | SOURCE | PINNED_SHA | SOURCE_LOCATION | MATURITY | INVARIANT | IMPLEMENTATION | FAILURE_MODE | PING_EXISTING_ANALOG | GAP | HARVEST_CLASS | FALSIFICATION | DEPENDENCIES | MEMORY_QUESTIONS_ANSWERED.

HARVEST_CLASS values: **ADOPT** (take the mechanism nearly as-is) / **ADAPT** (take the idea, reimplement for PING) / **PATTERN** (architectural pattern, no code to lift) / **REJECT** (fails interrogation - recorded so we don't re-learn it).

---

### 2.1 Mem0 (S1)

**M1 - Additive LLM-gated write (V3 phased batch pipeline)**
- PROBLEM: Raw conversation is not memory; someone must decide what is worth keeping, deduplicate it, and link it to existing knowledge.
- SOURCE: mem0ai/mem0 | SHA `47a69e1e` | `mem0/memory/main.py::_add_to_vector_store` (L879-1206), `mem0/configs/prompts.py::ADDITIVE_EXTRACTION_PROMPT` (L468+)
- MATURITY: PRODUCTION (OSS + hosted; this is the current shipping write path)
- INVARIANT: **Every persisted memory was either (a) emitted by the extraction LLM from the current messages, or (b) inserted raw with `infer=False`. Nothing enters the vector store without passing through the dedup hash gate.** The LLM sees: new messages, last-10 session messages, top-10 similar existing memories (UUIDs remapped to integers as an anti-hallucination measure), and an observation date for grounding relative time references.
- IMPLEMENTATION: 8 phases. (0) Gather last-10 session messages from SQLite. (1) Retrieve top-10 similar existing memories by embedding. (2) One LLM call with `ADDITIVE_EXTRACTION_PROMPT` returns `{"memory": [{text, attributed_to, linked_memory_ids}]}`. (3) Batch-embed extracted texts. (4-5) CPU-side processing + MD5 hash dedup against existing hashes and within-batch hashes. (6) Batch insert vectors + payloads (`data`, `hash`, `text_lemmatized`, `created_at`, `updated_at`, scope ids). (7) Batch entity extraction + linking (see M4). (8) Persist raw messages (last-10 window) + append history rows (see M3).
- FAILURE_MODE: **The extraction prompt says "When in doubt, extract."** The write gate is deliberately recall-biased: over-extraction is the design, dedup downstream is the hope. Consequence: memory bloat, near-duplicate facts with different phrasings evading the MD5 gate (hash is on exact text, not meaning), and **assistant messages are extraction sources** - the model's own output (including hallucinations) can be laundered into "memory" attributed to the user's context. LLM extraction failure raises (fail-closed on 429/5xx) rather than silently returning empty - good - but a *successful* extraction of garbage is indistinguishable from truth downstream. No confidence score is stored on the memory.
- PING_EXISTING_ANALOG: Meta AI tandem pipeline: Muse builds context pack, Meta AI researches, answer lands in `hidden_files/meta-ai-intel/` as **UNVERIFIED** with `.provenance.json`, and only verified claims become observations. PING already does what mem0 does not: quarantine-then-verify.
- GAP: PING has no bounded, deterministic write gate with dedup for machine-generated observations; the tandem verification step is the analog but it is human/LLM-judgment-based, not a pipeline.
- HARVEST_CLASS: **ADAPT** - the phased pipeline shape (gather context, retrieve similar, extract, hash-dedup, link, ledger) is sound; the "when in doubt, extract" bias and assistant-message sourcing must be inverted for PING (precision-biased, user/evidence-sourced).
- FALSIFICATION: Would be falsified if `add()` wrote raw messages directly by default. Checked: `infer=True` is the default and the raw path only runs with explicit `infer=False`. Also checked: `timestamp`/`reference_date` raise `ValueError("Platform-only...")` in OSS - temporal grounding of *queries* is a paywalled feature, not present in OSS.
- DEPENDENCIES: LLM provider, embedding provider, vector store, SQLite.
- MEMORY_QUESTIONS_ANSWERED: WHY (LLM judged it memorable per prompt - weak, prompt-defined), WHO (actor_id/role in payload when present; often absent), WHAT (raw messages kept 10-deep per session scope only), WHEN (created_at/updated_at; observation-date grounding in prompt), TENANT (user_id/agent_id/run_id payload scoping), CURRENT (updated_at; no validity window), CONTRADICTS (nothing - additive-only, contradictions accumulate), READ (whoever queries with the scope filter), EXPIRE (soft-hide via expiration_date), CORRECTED (explicit update() only), FORGOTTEN (**no** - see M3), ACTION (no - memories are inert text).

**M2 - Hybrid retrieval: semantic + BM25 + entity boosts, fused and thresholded**
- PROBLEM: Pure vector search misses exact-term matches and entity-centric queries.
- SOURCE: mem0ai/mem0 | SHA `47a69e1e` | `mem0/memory/main.py::_search_vector_store` (L1628-1732), `_compute_entity_boosts` (L1733+)
- MATURITY: PRODUCTION
- INVARIANT: **Retrieval always returns at most `limit` items, always scoped by the caller-supplied tenant filter, always excluding expired payloads unless `show_expired=True`, and every item carries its fused score.** No retrieval path bypasses the tenant filter (search() raises ValueError without a scope id).
- IMPLEMENTATION: (1) Lemmatize query for BM25, extract entities from query. (2) Embed query. (3) Semantic search over-fetches `max(limit*4, 60)`. (4) Keyword search where the store supports it. (5) BM25 normalize. (6) Entity boosts from M4's entity store. (7-8) `score_and_rank` fuses semantic + BM25 + entity signals with a hard `threshold` (default 0.1). (9) Format as `MemoryItem`s with promoted payload keys.
- FAILURE_MODE: Threshold is score-scale-dependent and provider-dependent; a 0.1 cosine floor is nearly no floor. Over-fetch of 60 with a tiny limit means ranking quality decides everything and the fusion weights are opaque to the caller. **No retrieval-time record**: what was retrieved for a given action is not logged anywhere, so "DID IT AFFECT AN ACTION" is unanswerable after the fact.
- PING_EXISTING_ANALOG: none - PING has no retrieval layer with scored, thresholded results.
- GAP: PING needs a read path that returns evidence-graded, scored results *and logs what was retrieved per action*.
- HARVEST_CLASS: **ADAPT** - the over-fetch + fuse + threshold shape; add retrieval logging (the missing 12th question).
- FALSIFICATION: Would be falsified if `search()` worked without tenant scope. Checked: `ValueError` raised when filters lack user_id/agent_id/run_id. Would be falsified if expired memories were hard-deleted: they are not (soft-hide only).
- DEPENDENCIES: vector store with `keyword_search` support (degrades gracefully to semantic-only where unsupported).
- MEMORY_QUESTIONS_ANSWERED: WHY (score above threshold - mechanistic, not semantic), WHO (n/a at read), WHAT (the memory text + payload), WHEN (created_at/updated_at returned), TENANT (enforced), CURRENT (expired filtered), CONTRADICTS (no), READ (caller with scope), EXPIRE (respected), CORRECTED (n/a), FORGOTTEN (n/a), ACTION (**no - retrieval is unlogged**).

**M3 - Append-only SQLite history ledger (the audit trail mem0 actually has)**
- PROBLEM: "Who changed this memory and when" must survive the change itself.
- SOURCE: mem0ai/mem0 | SHA `47a69e1e` | `mem0/memory/storage.py::SQLiteManager` (full file), `main.py::history()` (L1946), `_update_memory`/`_delete_memory` history writes
- MATURITY: PRODUCTION
- INVARIANT: **Every mutation (ADD/UPDATE/DELETE) appends exactly one row `(memory_id, old_memory, new_memory, event, created_at, updated_at, is_deleted, actor_id, role)` to the history table. History rows are never updated or deleted by any code path** (`reset()` drops the whole table; there is no per-memory history purge).
- IMPLEMENTATION: SQLite table `history`, thread-locked, transactional. `get_history(memory_id)` returns the full ordered ledger. The `messages` table keeps the last 10 raw messages per session scope (sliding window, hard-evicted beyond 10) as extraction context.
- FAILURE_MODE: **This is the mechanism that makes "forgetting" a lie (see failure catalog).** `vector_store.delete()` hard-deletes the vector, but the SQLite ledger retains `old_memory`/`new_memory` content forever, and `delete_all()` loops `_delete_memory` which writes a DELETE row *containing the deleted text*. There is no redaction API. `reset()` drops tables but the vector store's `delete_col()` is provider-dependent. Also: `actor_id`/`role` are only populated on the `infer=False` raw path and procedural path; LLM-extracted memories typically have **no actor recorded** - the ledger says *what* changed, not *who decided*.
- PING_EXISTING_ANALOG: PING's event/evidence plane (Oracle) + the tandem `.provenance.json` sidecars. PING's daily `~/memory/*.md` notes are also append-only.
- GAP: PING's ledger story is spread across files; mem0's single-table ledger is a cleaner primitive - but PING must add the redaction capability mem0 lacks.
- HARVEST_CLASS: **ADAPT** - append-only mutation ledger per memory, with actor + reason mandatory (mem0 makes them optional; PING must not), plus a redaction operation (which mem0 lacks and Anthropic has - see M21).
- FALSIFICATION: Would be falsified if `delete()` purged history. Checked: `_delete_memory` writes a DELETE row with `is_deleted=1` and the full previous text. Confirmed lie: "deleted" memories persist in SQLite.
- DEPENDENCIES: SQLite (local file; `history_db_path` config).
- MEMORY_QUESTIONS_ANSWERED: WHY (no - event type only), WHO (**partial** - actor_id/role often null), WHAT (old/new text - **yes, strongest of the 12**), WHEN (yes), TENANT (no - history table has no scope column; must join back to payload), CURRENT (is_deleted flag), CONTRADICTS (no), READ (anyone with the DB file), EXPIRE (no), CORRECTED (UPDATE rows - yes), FORGOTTEN (**no - ledger is forever**), ACTION (no).

**M4 - Entity store: second index over extracted entities with link-back**
- PROBLEM: Fact-level vector search cannot answer "everything we know about X".
- SOURCE: mem0ai/mem0 | SHA `47a69e1e` | `main.py::_upsert_entity` (L605), `_link_entities_for_memory` (L707), `_compute_entity_boosts` (L1733), `_existing_entities_by_text`
- MATURITY: PRODUCTION (OSS)
- INVARIANT: **Every entity record links back to the memory IDs it was extracted from (`linked_memory_ids`), and entity matching is exact-text first, semantic (≥0.95) second.** Update/delete of a memory strips and re-links its entity edges.
- IMPLEMENTATION: Entities extracted per memory (batch), normalized (lowercased key), embedded; exact match on normalized text wins, else semantic search with 0.95 threshold merges. Payload: `{data, entity_type, linked_memory_ids, scope filters}`. Query-time: entities extracted from the query boost memories linked to the same entities.
- FAILURE_MODE: 0.95 cosine is extremely strict - near-duplicate entities ("NYC" vs "New York City") will fork into two entity records; the exact-text fast path then never merges them. Entity extraction is LLM-free? (extract_entities_batch - check: it is a lightweight extractor, weaker than the main LLM.) Weak extractor + strict merge = fragmented entity graph.
- PING_EXISTING_ANALOG: `~/memory/people/` and `~/memory/groups/` pages - hand-curated entity resolution, strictly better precision, zero automation.
- GAP: automated entity linking with human-grade merge discipline.
- HARVEST_CLASS: **PATTERN** - linked_memory_ids back-pointer is the harvestable primitive (evidence graph); the 0.95 threshold is a cautionary tale.
- FALSIFICATION: Would be falsified if entity search ignored scope. Checked: entity store operations take `search_filters` (user_id/agent_id/run_id) throughout.
- DEPENDENCIES: embedding model, second vector collection (`entity_store`).
- MEMORY_QUESTIONS_ANSWERED: WHY (no), WHO (no), WHAT (entity text + linked ids), WHEN (no timestamps on entity records - **gap**), TENANT (yes, filters), CURRENT (no), CONTRADICTS (no), READ (scoped), EXPIRE (no), CORRECTED (re-linked on update), FORGOTTEN (stripped on delete - from the *index*; see M3 for the ledger), ACTION (no).

**M5 - Tenant scoping by mandatory filter + immutable identity keys**
- PROBLEM: One shared vector index must never serve tenant A's memories to tenant B.
- SOURCE: mem0ai/mem0 | SHA `47a69e1e` | `main.py::search` filter validation (L1379+), `add` `_build_filters_and_metadata` (L314), `_strip_identity_keys` (L143), `update()` docstring
- MATURITY: PRODUCTION
- INVARIANT: **(a) `search()`/`get_all()` raise unless filters contain user_id, agent_id, or run_id. (b) Identity keys are write-once: `update()` explicitly strips user_id/agent_id/run_id/actor_id from update payloads - a memory can never be re-scoped to another tenant after creation.**
- IMPLEMENTATION: `_build_filters_and_metadata` splits caller input into payload metadata vs. effective vector-store filters; `_validate_and_trim_entity_id` sanitizes; `_strip_identity_keys` on update prevents tenant migration. `get(memory_id)` is the exception: unscoped direct UUID fetch (mitigated by unguessable uuid4).
- FAILURE_MODE: Tenancy is a **query-time convention over a shared index**, not a storage boundary. Any code path that forgets the filter (custom vector-store provider, direct index access, `get()` by leaked UUID, backup restore) crosses tenants. There is no defense-in-depth (no per-tenant collections, no encryption boundary). See failure catalog.
- PING_EXISTING_ANALOG: PING is single-tenant today (Nolan's substrate) - the analog is future work; the tandem's per-goal `hidden_files/` scoping is the closest existing boundary.
- GAP: PING has no tenant model at all yet; when it needs one, this shows both the cheap pattern and why it is insufficient alone.
- HARVEST_CLASS: **ADAPT** - mandatory-scope-at-read (fail-closed) + immutable identity keys are both directly adoptable; add storage-level isolation for anything beyond one tenant.
- FALSIFICATION: Would be falsified if any read path defaulted to unscoped. Checked: `search`, `get_all` raise; `get` is by-id (documented exception). Would be falsified if update could change user_id: checked, stripped.
- DEPENDENCIES: vector store filter support.
- MEMORY_QUESTIONS_ANSWERED: TENANT (**yes - strongest answer**), READ (whoever presents the scope id - **weak: bearer-token semantics, no ACL**), others no.

**M6 - Expiration as soft-hide (`expiration_date`)**
- PROBLEM: Some memories should stop being used after a date without being destroyed (audit needs them).
- SOURCE: mem0ai/mem0 | SHA `47a69e1e` | `main.py::_normalize_expiration_date` (L427), `_payload_is_expired` (L442), `_search_vector_store` Step 7, `_get_all_from_vector_store`
- MATURITY: PRODUCTION
- INVARIANT: **Expired memories are excluded from `search()` and `get_all()` by default; they remain fully stored and are returned when `show_expired=True` or fetched by `get()`.**
- IMPLEMENTATION: `expiration_date` (YYYY-MM-DD) in payload; `_payload_is_expired` compares against now at read time (no background sweeper).
- FAILURE_MODE: Expiry is evaluated at read time in Python, not in the index - every candidate is fetched then filtered, so expiry never reduces index size or cost. No notification on expiry. A caller passing `show_expired=True` (or `get()`) resurrects expired memories with no audit of the override.
- PING_EXISTING_ANALOG: none.
- GAP: PING needs expiry-with-audit for time-bound business facts (e.g., "EAB confirmed in Carbondale Sept 2026" is news, not forever-truth).
- HARVEST_CLASS: **ADAPT** - soft-hide + explicit override flag + log the override (the part mem0 misses).
- FALSIFICATION: Would be falsified if expired rows were deleted. Checked: never deleted; filter-only.
- DEPENDENCIES: none.
- MEMORY_QUESTIONS_ANSWERED: CURRENT (**partial** - "expired" is a coarse boolean, not a validity window), EXPIRE (**yes**), others no.

**M24 - Procedural memory (distilled skill text as a memory type)**
- PROBLEM: Episodic facts ("user likes X") and procedural knowledge ("how we do Y") need different extraction and different retrieval.
- SOURCE: mem0ai/mem0 | SHA `47a69e1e` | `main.py::_create_procedural_memory` (L1993), `PROCEDURAL_MEMORY_SYSTEM_PROMPT`, `add(..., memory_type="procedural_memory")` (requires `agent_id`)
- MATURITY: PRODUCTION (narrow)
- INVARIANT: **Procedural memories are created only via an explicit `memory_type` flag, only agent-scoped, via a dedicated summarization prompt - never by the general extraction path.**
- IMPLEMENTATION: LLM summarizes the conversation into a procedure document; stored as a normal memory with `memory_type: procedural_memory` payload marker; same retrieval path (no type-aware ranking).
- FAILURE_MODE: The type marker exists but **retrieval is type-blind** - procedural and episodic memories compete in one ranking. The distillation prompt can launder one-off events into "procedures."
- PING_EXISTING_ANALOG: PING's skills/playbooks (`~/workspace/skills/`, tandem prompts) - versioned procedure documents, human-curated.
- GAP: type-aware retrieval (procedure vs. fact vs. commitment).
- HARVEST_CLASS: **PATTERN** - keep memory *types* as first-class with type-aware read paths; mem0 only half-does this.
- FALSIFICATION: Would be falsified if the general path could emit procedural memories. Checked: `memory_type` other than `procedural_memory` raises `Mem0ValidationError`.
- DEPENDENCIES: LLM.
- MEMORY_QUESTIONS_ANSWERED: WHY (explicit caller intent - **yes**), others as M1.

**Mem0-wide falsification note:** `mem0/AGENTS.md` claims a `mem0/graphs/` package with 4 graph providers (Neo4j, Memgraph, Kuzu, Apache AGE). **The directory does not exist in this tree** and `main.py` contains zero references to graph memory. Graph memory is platform-only (docs at `docs/platform/features/graph-memory.mdx`). Any harvest plan that assumes OSS graph memory is building on a stale doc.

---

### 2.2 Letta V1 - classic (S4, archive branch)

**M7 - Core memory blocks: agent self-editing working memory**
- PROBLEM: An agent needs writable, always-visible working memory that survives across turns without retrieval.
- SOURCE: letta-ai/letta (archive) | SHA `56ba9c25` | `letta/schemas/memory.py::Memory` (Block list, `compile()` renders `<memory_blocks>` into every system prompt), `core_memory_append` / `core_memory_replace` / `rethink_memory` in `letta/functions/function_sets/base.py`, `letta/schemas/block.py` (`limit`, `read_only`)
- MATURITY: PRODUCTION (was the flagship; now deprecated/maintenance)
- INVARIANT: **Core memory is the only memory that is (a) written by the agent itself through explicit tool calls, (b) rendered into every prompt, (c) bounded by per-block character limits, and (d) protected by a `read_only` flag the agent cannot unset.** `core_memory_replace` requires an exact-match `old_content` (compare-and-swap on text); `rethink_memory` rewrites a whole block.
- IMPLEMENTATION: `Memory.blocks: List[Block]` with `label`, `value`, `description`, `limit` (default `CORE_MEMORY_BLOCK_CHAR_LIMIT`), `read_only`. Rendered as XML-ish `<memory_blocks>` in the system prompt with chars_current/chars_limit metadata so the agent can see its own budget. Edits persist to the DB via block manager.
- FAILURE_MODE: **The agent is the sole write gate with no dedup, no review, no confidence.** Whatever the agent writes under pressure (long context, misleading user input) becomes permanent working memory. `read_only` is enforced in rendering metadata, but the *agent* sets blocks' initial flags - a confused agent can mark its own poison read-only... actually the flag protects *from* the agent. The real poison vector: user tells agent "remember that my SSN is X" - agent appends to core memory, now in every prompt forever, exfiltrated to the LLM provider on every call. No expiry, no contradiction detection between blocks.
- PING_EXISTING_ANALOG: `~/MEMORY.md` (curated long-term memory, human/agent-curated, always in context) - PING's closest analog, but PING's is curated by the operator loop, not self-written by the agent mid-task.
- GAP: PING's MEMORY.md has no char budget enforcement, no read_only protection, no exact-match replace semantics.
- HARVEST_CLASS: **ADAPT** - the block/budget/read_only trio is excellent; the *agent-as-sole-writer* needs a verification gate for PING (operator-approved writes to canonical memory).
- FALSIFICATION: Would be falsified if core memory went through retrieval. Checked: `compile()` injects all blocks into the system prompt unconditionally - **no retrieval step at all** (this is the anti-RAG extreme: full injection, like ChatGPT's saved memories).
- DEPENDENCIES: relational DB (blocks table), agent tool loop.
- MEMORY_QUESTIONS_ANSWERED: WHY (agent's judgment at tool-call time - captured in the tool trace), WHO (the agent; user-originated content laundered through agent), WHAT (block value + description), WHEN (block updated_at in DB), TENANT (agent_id scoping), CURRENT (no validity - **stale blocks persist**), CONTRADICTS (no detection), READ (the agent, always), EXPIRE (no), CORRECTED (**yes - append/replace/rethink by the agent**), FORGOTTEN (replace with empty string - **yes, real** for core), ACTION (blocks are in every prompt - **yes, maximally action-affecting**).

**M8 - Archival memory passages: agent-curated, tagged, timestamped long-term store**
- PROBLEM: Working memory is tiny; the agent needs a large searchable attic it controls.
- SOURCE: letta-ai/letta (archive) | SHA `56ba9c25` | `archival_memory_insert` / `archival_memory_search` in `letta/functions/function_sets/base.py` (L164-240), `letta/services/passage_manager.py`, `letta/schemas/passage.py`, `letta/services/archive_manager.py`
- MATURITY: PRODUCTION (deprecated with V1)
- INVARIANT: **Every archival write is an explicit agent tool call with free-text content, optional tags, and a server timestamp; every read is agent-initiated semantic search with tag and datetime-range filters; passages live in agent-scoped archives that can be attached to multiple agents.**
- IMPLEMENTATION: `archival_memory_insert(content, tags)` → passage row (`organization_id`, `created_at`, embedding) in the agent's archive. `archival_memory_search(query, tags, tag_match_mode, start/end_datetime, top_k)` → semantic search returning id/timestamp/content/tags. `delete_passage_from_archive_async` for forgetting. Archives are shareable: `attach_agent_to_archive_async` lets multiple agents read/write one archive (shared memory).
- FAILURE_MODE: **No dedup, no contradiction handling, no provenance beyond created_at.** The agent decides what to store; two agents sharing an archive can write contradictory passages with no mechanism to notice. `organization_id` scopes to org, but **shared archives are an explicit cross-agent (cross-tenant-ish) channel with no read/write ACL distinction** - attach is all-or-nothing. Recall memory (conversation search) is a third store with the same properties.
- PING_EXISTING_ANALOG: Outreach pipeline JSONL records (append-only observations with source tags) - similar shape, but PING's are machine-written with source attribution, not agent-whim.
- GAP: PING lacks an agent-writable scratch attic distinct from canonical memory; the analog would need write-gating.
- HARVEST_CLASS: **PATTERN** - the *separation* of core (always-injected) vs archival (retrieved) vs recall (verbatim history) is the harvestable idea; the ungated agent-write is not.
- FALSIFICATION: Would be falsified if archival insert did extraction/dedup. Checked: the tool docstring says "Add information to long-term archival memory" - content goes in verbatim as the agent wrote it. No pipeline.
- DEPENDENCIES: vector DB (passage embeddings), relational DB.
- MEMORY_QUESTIONS_ANSWERED: WHY (agent's stated purpose at insert - in tool args), WHO (agent; `organization_id` only), WHAT (content verbatim), WHEN (created_at), TENANT (org + archive attach list), CURRENT (no), CONTRADICTS (no), READ (any agent attached to the archive), EXPIRE (no), CORRECTED (no update path on passages - **delete + re-insert only**), FORGOTTEN (delete passage - **yes, hard**), ACTION (only if agent searches - no log of what was retrieved).

**M9 - Git-backed memory filesystem (memory as versioned files)**
- PROBLEM: Agent memory edits need history, diff, rollback, and human review - i.e., everything git already does.
- SOURCE: letta-ai/letta (archive) | SHA `56ba9c25` | `letta/schemas/memory.py::_render_memory_blocks_git`, `_render_memory_filesystem`, `letta/services/block_manager_git.py`
- MATURITY: EXPERIMENTAL (late V1; carried into V2 as MemFS)
- INVARIANT: **Memory blocks are projected to `$MEMORY_DIR/**/*.md` files; every agent edit is a git commit; history/rollback/review come from git, not from a bespoke ledger.**
- IMPLEMENTATION: `system/persona` → `<self>` section; `system/*` → nested `<memory>` tags with `<projection>$MEMORY_DIR/...` paths; external files → file tree. Git-enabled agents edit files; the harness commits.
- FAILURE_MODE: Git history is append-only by default - **secrets committed to memory are in history forever** (same redaction gap as M3). Merge conflicts between concurrent agent edits; the file tree rendering assumes label paths are filesystem-safe.
- PING_EXISTING_ANALOG: PING's file-based memory (`~/MEMORY.md`, daily notes, people pages) is *already* this pattern, minus the git discipline and minus agent write access.
- GAP: PING's memory files are not git-committed per edit (no repo here at all - check: is ~/workspace a git repo? Unknown; treat as gap).
- HARVEST_CLASS: **ADAPT** - adopt the projection discipline (memory blocks ↔ files ↔ git history); this is the strongest provenance story in the survey.
- FALSIFICATION: Would be falsified if git history were optional decoration. Checked: `block_manager_git.py` exists as the persistence backend; frontmatter validation (carried into V2, see M12) is enforced by hook.
- DEPENDENCIES: git, filesystem.
- MEMORY_QUESTIONS_ANSWERED: WHY (commit message - if the agent writes one), WHO (committer), WHAT (diff - **yes**), WHEN (commit time), TENANT (repo per agent), CURRENT (HEAD), CONTRADICTS (no), READ (repo readers), EXPIRE (no), CORRECTED (new commit - **yes**), FORGOTTEN (**no - history retains**; needs `git filter-repo`), ACTION (no direct link).

### 2.3 Letta Code V2 (S3)

**M10 - MemFS budget constraints (deterministic, hook-enforced)**
- PROBLEM: File-based agent memory grows until it eats the context window.
- SOURCE: letta-ai/letta-code | SHA `2bc00344` | `src/memory-constraints.ts` (`validateMemoryTreeConstraints`, `DEFAULT_MEMORY_CONSTRAINTS_CONFIG`), enforced by installed git hook
- MATURITY: PRODUCTION (current)
- INVARIANT: **No memory tree is accepted that violates: maxDepth 2, 20k chars/file, 65,536 core chars, required `MEMORY.md` root index, required per-directory index. Validation is pure, deterministic, and runs in the git hook - the agent cannot bypass it by persuasion.**
- IMPLEMENTATION: `validateMemoryTreeConstraints(reader, {config, layout, requireRootMarker})` - pure function over a `MemoryTreeReader` interface; the same implementation is embedded in the git hook (self-contained, no package dependency at hook time). Config is versioned (`.memfs.config.json`, `version: 1`, unknown fields rejected).
- FAILURE_MODE: Budgets are syntactic (chars, depth), not semantic - 65k chars of poison fits the budget fine. The hook validates *shape*, not *truth*. Depth-2 cap may force unnatural flattening of genuinely hierarchical knowledge.
- PING_EXISTING_ANALOG: `~/MEMORY.md` curation discipline (human) - no machine enforcement.
- GAP: machine-enforced memory budgets with a versioned policy file.
- HARVEST_CLASS: **ADOPT** - the pure-validator + hook-embedding + versioned-config pattern ports directly.
- FALSIFICATION: Would be falsified if the agent could write oversized files (hook is advisory). Checked: the hook embeds the validator and rejects; the memory-confinement launcher (M11) is fail-closed when no sandbox exists - the codebase consistently chooses rejection over degradation.
- DEPENDENCIES: git hooks, filesystem.
- MEMORY_QUESTIONS_ANSWERED: WHY (no), WHO (no), WHAT (no), WHEN (no), TENANT (no - budget only), CURRENT (no), CONTRADICTS (no), READ (no), EXPIRE (no), CORRECTED (no), FORGOTTEN (no), ACTION (no). **This mechanism answers none of the 12 - it is a guardrail, not a memory. Included because PING needs guardrails with this exact fail-closed character.**

**M11 - Memory confinement: sandboxed memory workers (fail-closed cross-tenant boundary)**
- PROBLEM: Background memory-consolidation agents must not read other agents' memories.
- SOURCE: letta-ai/letta-code | SHA `2bc00344` | `src/memory-confinement.ts`, `src/headless-memory-worker.ts`, `src/permissions/memory-confinement-launcher.ts`
- MATURITY: PRODUCTION (current)
- INVARIANT: **A memory worker can read the host broadly, write harness state and its own memory, and CANNOT read or write other agents' memory. If no kernel sandbox backend is available, the launcher throws rather than running with a weaker policy.**
- IMPLEMENTATION: `createMemoryConfinementLauncher` wraps the worker process in the OS sandbox (seatbelt/seccomp-style via `detectSandboxBackend()`); fail-closed on absence.
- FAILURE_MODE: Sandbox escapes are outside the threat model of the code; the interesting failure is *availability*: on hosts without sandbox support, memory workers refuse to run at all (fail-closed = denial of consolidation). Also "read the host broadly" is a large surface for a worker that only needs its own memory dir.
- PING_EXISTING_ANALOG: none - PING has no memory workers and no sandboxing.
- GAP: the entire concept: unattended consolidation with a hard tenant boundary.
- HARVEST_CLASS: **ADAPT** - the fail-closed launcher pattern; PING's consolidation (dreams-like, see M22) must run under an equivalent boundary.
- FALSIFICATION: Would be falsified if confinement degraded gracefully. Checked: "Throws when no supported kernel sandbox is available rather than silently running with a weaker policy." Explicit fail-closed.
- DEPENDENCIES: OS sandbox backend.
- MEMORY_QUESTIONS_ANSWERED: TENANT (**yes - process-enforced**), READ (**yes - allowlist semantics**), others no. Guardrail, like M10.

**M12 - Frontmatter authorization: protected fields the agent cannot touch**
- PROBLEM: Some memory metadata (ownership, immutability) must be settable only by the trusted operator, never by the agent.
- SOURCE: letta-ai/letta-code | SHA `2bc00344` | `src/memory-frontmatter.ts::validateMemoryFileFrontmatter`
- MATURITY: PRODUCTION (current)
- INVARIANT: **`read_only` is a protected field: the agent cannot set it on a new file, change it, or remove it. Only the holder of `previousContent` (the trusted caller, not the change author) can. Unknown frontmatter keys are rejected; `name`+`description` are mandatory in v2.**
- IMPLEMENTATION: Pure validator comparing proposed content against trusted previous content; scalar string-prefix matching deliberately avoids YAML interpretation ("Do not interpret YAML or turn a quoted value into a different authorization decision"). Self-contained for hook embedding.
- FAILURE_MODE: Protection is only as strong as the hook deployment; a memory repo without the hook installed has no protection. `description` is mandatory but its *truthfulness* is unchecked.
- PING_EXISTING_ANALOG: PING's people-page frontmatter conventions (none enforced).
- GAP: machine-enforced protected metadata on memory files.
- HARVEST_CLASS: **ADOPT** - the protected-field pattern (operator-only `verified:`, `tenant:`, `expires:` fields) is directly what PING's tandem "UNVERIFIED → verified" promotion needs.
- FALSIFICATION: Would be falsified if the agent could self-protect files. Checked: `previousContent === null` (new file) + `read_only` → error. The check is against trusted prior state, not the proposal.
- DEPENDENCIES: git hook (same as M10).
- MEMORY_QUESTIONS_ANSWERED: WHO (committer vs. operator distinguished - **partial**), READ (**yes - read_only enforced**), CORRECTED (blocked when read_only - **yes**), others no.

### 2.4 Graphiti / Zep (S5, S9)

**M13 - Episodic write: raw observation preserved, semantics derived**
- PROBLEM: Derived facts lose the evidence they came from; when the derivation is wrong you cannot re-derive.
- SOURCE: getzep/graphiti | SHA `13587ea3` | `graphiti_core/graphiti.py::add_episode` (L1043+), `graphiti_core/nodes.py::EpisodicNode`
- MATURITY: PRODUCTION
- INVARIANT: **Every `add_episode` persists the raw `episode_body` as an `EpisodicNode` with `source_description`, `reference_time` (valid_at), and group scoping BEFORE any extraction runs. Extraction produces nodes/edges; the episode is never mutated by extraction.**
- IMPLEMENTATION: Episode node saved with UUID, group_id, source type (message/text/json), content verbatim, `created_at` (ingest time) vs `valid_at` (reference_time - when the described event happened). Previous episodes retrieved as extraction context. Entity/edge extraction then runs against prior graph state.
- FAILURE_MODE: Episodes are append-only and **there is no redaction path in OSS** - a poisoned or PII-containing episode persists raw forever (`delete_episode` exists in the MCP server but is a blunt instrument; the paper's architecture has no per-episode redaction). `reference_time` is caller-supplied - a lying caller backdates facts. Concurrent `add_episode` calls for different group_ids needed a request-scoped driver fix (issue #1676 - the shared-driver clobbering bug), i.e., **the tenant boundary had a real race until recently**.
- PING_EXISTING_ANALOG: Tandem `.provenance.json` sidecars + raw answer files in `hidden_files/meta-ai-intel/` - PING already preserves raw observations before derivation. This is PING's strongest existing alignment with any surveyed system.
- GAP: PING's raw-preservation is per-research-task, not a uniform episode primitive across all memory writes.
- HARVEST_CLASS: **ADAPT** - make "raw episode first, derivation second, episode immutable" the uniform write primitive; add redaction (borrow M21).
- FALSIFICATION: Would be falsified if extraction mutated episodes. Checked: episode saved before extraction; extraction only creates nodes/edges + episodic edges linking them.
- DEPENDENCIES: graph DB (Neo4j/FalkorDB/Neptune), LLM, embedder.
- MEMORY_QUESTIONS_ANSWERED: WHY (episode ingested - caller intent), WHO (caller identity - **weak, not recorded on the node**), WHAT (**yes - raw body preserved**), WHEN (**yes - created_at vs valid_at distinguished**), TENANT (**yes - group_id**, modulo the fixed race), CURRENT (valid_at on edges, not episodes), CONTRADICTS (no at episode level), READ (group-scoped), EXPIRE (expired_at exists on edges - see M15), CORRECTED (new episode supersedes - see M15), FORGOTTEN (**no real redaction**), ACTION (no).

**M14 - Entity resolution: semantic dedup of extracted entities**
- PROBLEM: "NYC", "New York", "New York City" must become one node or the graph forks.
- SOURCE: getzep/graphiti | SHA `13587ea3` | `graphiti_core/utils/maintenance/node_operations.py`, `dedup_helpers.py`
- MATURITY: PRODUCTION
- INVARIANT: **Newly extracted entities are resolved against existing nodes by hybrid search before creation; duplicates merge into the existing node rather than forking.**
- IMPLEMENTATION: For each extracted entity, search existing nodes (name embedding + full-text), LLM-judged dedup, merge attributes/summaries into the surviving node.
- FAILURE_MODE: Resolution is LLM-judged - **an attacker who controls episode text can engineer entity merges** ("Acme Corp" the bakery vs "Acme Corp" the client - merge them and facts cross-contaminate). Merge is destructive to the distinction; the pre-merge nodes' separate identities are not preserved as first-class history. Over-merge and under-merge both silent.
- PING_EXISTING_ANALOG: `~/memory/people/INDEX.md` - human-curated, exact.
- GAP: entity merge with preserved pre-merge provenance.
- HARVEST_CLASS: **PATTERN** - resolve-before-create; but keep merge events in the ledger (which Graphiti does not).
- FALSIFICATION: Would be falsified if entities were created without resolution. Checked: `resolve_extracted_entities` runs per episode before node creation.
- DEPENDENCIES: LLM judge, embedder.
- MEMORY_QUESTIONS_ANSWERED: WHAT (merged node summary), WHEN (no), TENANT (group-scoped), CONTRADICTS (merge hides it - **anti-answer**), others no.

**M15 - Temporal edge invalidation: contradiction timestamps, never deletes**
- PROBLEM: "Alice works in marketing" (March) vs "Alice moved to engineering" (June) - both true, at different times. Deleting the old fact destroys history; keeping both without time bounds poisons retrieval.
- SOURCE: getzep/graphiti | SHA `13587ea3` | `graphiti_core/edges.py::EntityEdge` (`valid_at`, `invalid_at`, `expired_at`), `graphiti_core/utils/maintenance/edge_operations.py::resolve_extracted_edges` (L325+), `combined_extraction.py` (LLM emits `invalid_at` for contradicted edges)
- MATURITY: PRODUCTION
- INVARIANT: **Contradiction never deletes. When a new edge contradicts an existing edge, the old edge gets `invalid_at = <new fact's time>` and the new edge gets `valid_at`. Retrieval filters to edges valid at the query's reference time (default: now).**
- IMPLEMENTATION: Per new edge: (1) exact-dedup within batch; (2) fetch existing edges between the same node pair (duplicate candidates); (3) hybrid-search wider invalidation candidates; (4) LLM judges duplicate vs contradict vs independent; (5) contradicted edges stamped `invalid_at`, saved. Search uses temporal relevance: `invalid_at` in the past excludes the edge for "now" queries but it remains answerable for historical queries.
- FAILURE_MODE: **The contradiction judge is an LLM call per edge - the single most poisonable step in the pipeline.** A crafted episode can invalidate true edges ("actually Alice never worked in marketing") with no human review, no confidence threshold, and no appeal - the invalidation *looks* like legitimate temporal evolution. There is no "disputed" state; the judge's verdict is final and silent. Also `expired_at` vs `invalid_at` semantics are subtle and caller-dependent.
- PING_EXISTING_ANALOG: none - PING has no validity-window primitive at all. This is the biggest representational gap in PING's memory.
- GAP: bitemporal facts (valid_at/invalid_at) with contradiction as a first-class event.
- HARVEST_CLASS: **ADAPT** - the bitemporal edge is the single most harvestable representation in the survey; but the LLM-judge needs a confidence + human/appeal path for PING (operator-verified invalidation, not silent).
- FALSIFICATION: Would be falsified if contradiction deleted edges. Checked: `resolve_extracted_edges` returns `(resolved, invalidated, new)` and invalidated edges are *saved with timestamps*, not deleted. Would be falsified if search ignored time: checked, `search()` docs state "uses the current date and time as the reference point for temporal relevance."
- DEPENDENCIES: LLM judge, graph DB with datetime range indexes.
- MEMORY_QUESTIONS_ANSWERED: WHY (new episode contradicted it - in the invalidation linkage), WHO (no), WHAT (fact text on edge + episodes), WHEN (**yes - valid_at/invalid_at/expired_at, bitemporal**), TENANT (group_id), CURRENT (**yes - validity window is the answer**), CONTRADICTS (**yes - invalidation IS the contradiction record**), READ (group-scoped), EXPIRE (**yes - expired_at**), CORRECTED (**yes - supersession by timestamp**), FORGOTTEN (no - history preserved by design), ACTION (no).

**M16 - Group-partitioned hybrid search with temporal filtering**
- PROBLEM: Retrieval must respect tenant boundaries AND time.
- SOURCE: getzep/graphiti | SHA `13587ea3` | `graphiti.py::search` (L1586), `search_` (L1662), `graphiti_core/search/` (RRF fusion, cross-encoder rerank, node-distance rerank)
- MATURITY: PRODUCTION
- INVARIANT: **Every search takes `group_ids`; results are RRF-fused across vector + BM25 + BFS graph expansion, cross-encoder reranked, and temporally filtered to the reference time. `search_` returns episodes + nodes + edges + communities together.**
- IMPLEMENTATION: `SearchConfig` presets (`EDGE_HYBRID_SEARCH_RRF`, `COMBINED_HYBRID_SEARCH_CROSS_ENCODER`, `EDGE_HYBRID_SEARCH_NODE_DISTANCE` with `center_node_uuid` for proximity rerank). `handle_multiple_group_ids` decorator fans out per group.
- FAILURE_MODE: RRF + cross-encoder is a relevance black box - **no explanation of why a fact was returned**, no score surfaced to the agent by default. Community summaries are LLM-generated and can drift from member facts. Temporal filtering defaults to "now" - historical questions need explicit reference times or they get the current-truth answer to a past-truth question (silent temporal mismatch).
- PING_EXISTING_ANALOG: none.
- GAP: scored, explainable, temporally-pinned retrieval.
- HARVEST_CLASS: **ADAPT** - the *config-preset* pattern (named search strategies) plus mandatory group scoping; add score explanation (mem0's `explain=True` does this better).
- FALSIFICATION: Would be falsified if group_ids were optional decoration. Checked: all node/edge getters take group_id; the #1676 fix shows the boundary was load-bearing enough to race.
- DEPENDENCIES: embedder, cross-encoder, graph DB.
- MEMORY_QUESTIONS_ANSWERED: WHY (no - black box), WHEN (reference time - **partial**), TENANT (yes), CURRENT (temporal filter - **partial**), READ (group members), others no.

### 2.5 LangGraph (S6)

**M17 - Namespaced KV store: hierarchy as the tenant boundary, TTL as expiry**
- PROBLEM: Cross-thread, cross-user facts need a boring, predictable store with explicit scoping and death.
- SOURCE: langchain-ai/langgraph | SHA `7daa3ab4` | `libs/checkpoint/langgraph/store/base/__init__.py::BaseStore` (L708+): `put` (L856), `get`, `search`, `delete`, `TTLConfig` (L545)
- MATURITY: PRODUCTION
- INVARIANT: **(a) Every item lives at `(namespace tuple, key)`; namespaces are hierarchical (`("users", user_id)`, `("agents", agent_id)`); search is prefix-scoped. (b) `put` is an upsert - same (namespace, key) overwrites. (c) TTL is per-item, in minutes, sliding (refreshed on read AND write), and expiry deletion is opportunistic/lazy.**
- IMPLEMENTATION: `batch([PutOp|GetOp|SearchOp|DeleteOp])` - all access through atomic op batches. Semantic search is opt-in per store (`index={dims, embed, fields}`) and per item (`index=[field paths]` or `index=False`). `list_namespaces` with match conditions. TTL: `supports_ttl` must be explicitly set by the adapter; default off.
- FAILURE_MODE: **No versioning, no history, no provenance fields at all** - `put` overwrites silently; the previous value is unrecoverable. The store is amnesiac about its own mutations: it answers none of the 12 questions except TENANT/EXPIRE. Sliding TTL means **a frequently-read poisoned fact never expires** - reads refresh the poison's lease. Opportunistic expiry deletion means "expired" items may still be returned by a lagging adapter. Semantic search disabled by default means most deployments are exact-key lookup - the "memory" is a dict.
- PING_EXISTING_ANALOG: none directly; the outreach JSONL store is append-only where this is overwrite-only - opposite philosophies.
- GAP: PING needs both: an overwrite-friendly working store AND an append-only ledger; LangGraph shows what happens when you only build the first.
- HARVEST_CLASS: **ADAPT** - namespace-hierarchy scoping and per-item TTL are clean primitives; **never adopt the amnesiac overwrite** - pair every put with a ledger entry (M3-style).
- FALSIFICATION: Would be falsified if put versioned. Checked: `put` → `PutOp` → upsert; no version field on `Item` (fields: namespace, key, value, created_at, updated_at - timestamps only, no history).
- DEPENDENCIES: store adapter (memory/postgres/etc.).
- MEMORY_QUESTIONS_ANSWERED: WHEN (**partial** - created_at/updated_at only), TENANT (**yes - structural**), CURRENT (updated_at), READ (namespace holders), EXPIRE (**yes - TTL, sliding**), CORRECTED (overwrite - **destructive, no record**), FORGOTTEN (**yes - delete is hard, no ledger**), others no.

**M18 - Checkpointing: thread-scoped event-sourced state with time travel**
- PROBLEM: An agent's working state (which step, what values) must survive crashes and be rewindable.
- SOURCE: langchain-ai/langgraph | SHA `7daa3ab4` | `libs/checkpoint/langgraph/checkpoint/base/__init__.py` (`Checkpoint` TypedDict L93, `CheckpointTuple` L140, thread_id docs L183-199, delete/copy/prune APIs)
- MATURITY: PRODUCTION
- INVARIANT: **All runnable state is a function of `(thread_id, checkpoint_id)` lineage: each checkpoint has a parent; `get_tuple` history gives full time travel; `delete_thread` / `copy` / `prune` are the lifecycle ops. `thread_id` is the sole isolation boundary.**
- IMPLEMENTATION: Checkpoints store channel values + versions + pending sends; serde is pluggable (msgpack/jsonplus/encrypted). The docs' own example: "Conversational memory: reuse the same thread_id across invocations."
- FAILURE_MODE: **thread_id is a bearer token with no ACL** - knowledge of the ID is total access to the conversation. There is no per-message redaction: to forget one message you replay history without it (manual surgery). Checkpoint payloads include everything (tool args,中间 state) - a checkpoint store breach is a full conversation breach. `delete_thread` is provider-dependent (hard delete where supported).
- PING_EXISTING_ANALOG: PING's run ledger / workflow resumability (`runs.jsonl` in tandem) - same lineage idea, thinner.
- GAP: checkpoint lineage with parent links for PING's multi-day missions (crash recovery + audit).
- HARVEST_CLASS: **PATTERN** - (thread_id, parent_checkpoint_id) lineage + serde versioning; do not inherit the bearer-token tenancy.
- FALSIFICATION: Would be falsified if checkpoints were content-addressed or ACL'd. Checked: keyed by caller-supplied thread_id string; no ACL layer in the base API.
- DEPENDENCIES: checkpointer adapter (memory/postgres/redis).
- MEMORY_QUESTIONS_ANSWERED: WHY (no), WHO (no), WHAT (**yes - full state snapshot**), WHEN (checkpoint timestamps), TENANT (**weak - thread_id only**), CURRENT (latest checkpoint), CONTRADICTS (no - linear history), READ (thread_id holders), EXPIRE (prune - **yes, coarse**), CORRECTED (time travel + fork - **yes, via replay**), FORGOTTEN (**partial - delete_thread**), ACTION (**yes - checkpoints ARE the action state**).

### 2.6 OpenAI (S7, docs + RE - mark accordingly)

**M19 - ChatGPT memory: model-written bio facts, full-dump injection**
- PROBLEM: Personalize a chat product without building retrieval infrastructure.
- SOURCE: OpenAI Help Center Memory FAQ (`https://help.openai.com/en/articles/8590148`) + independent RE writeup (UNVERIFIED-BY-SOURCE for internals: `bio`-tool claim, ~100-block cap, six-layer injection, 96%-proactive claim)
- MATURITY: PRODUCTION (consumer product)
- INVARIANT (documented): **Saved memories are user-visible, user-deletable, stored separately from chat history (deleting a chat does not delete memories derived from it), and a log of deleted memories may be retained up to 30 days. The model updates/combines/removes memories on its own.**
- IMPLEMENTATION (per RE, unverified): a `bio` tool invoked by the conversation model persists single-sentence facts; all saved memories injected into every prompt (no vector retrieval); since 2025 a six-layer injection (saved memories, response preferences, notable past topics, user insights, recent conversations, interaction metadata); a hidden "User Knowledge Memories" layer not visible/editable in settings.
- FAILURE_MODE: **Full-dump injection means every memory is in every prompt - maximum action-affecting, zero retrieval precision.** No eviction when full (manual delete only). The hidden layer is uncorrectable and unforgottable by the user. "Memory updated" confirmations train users to accept model-initiated writes they didn't review. 30-day deleted-memory retention means delete ≠ gone (same lie as M3, but vendor-side).
- PING_EXISTING_ANALOG: none - PING must never do full-dump injection.
- GAP: n/a (negative example).
- HARVEST_CLASS: **REJECT** as architecture; **ADAPT** one UX idea: user-visible memory list with one-tap delete (transparency PING should exceed, not match).
- FALSIFICATION: The `bio`-tool/full-dump/100-block claims are single-source RE (loustloust04-del writeup citing "multiple security researchers" without links). Treat internals as **unverified**; the FAQ claims (user control, 30-day log, chat-history reference layer) are first-party and reliable.
- DEPENDENCIES: n/a (closed).
- MEMORY_QUESTIONS_ANSWERED: WHY (**no - model-decided, 96% proactive per unverified RE**), WHO (the model), WHAT (user-visible list - **partial**; hidden layer - **no**), WHEN (timestamps per RE - unverified), TENANT (account - **yes**), CURRENT (no validity), CONTRADICTS (model "combines" - opaque), READ (the account + OpenAI), EXPIRE (no), CORRECTED (user edit or model auto-update - **partial**), FORGOTTEN (**no - 30-day log; hidden layer never**), ACTION (**yes - injected into every prompt**).

### 2.7 Anthropic (S8, docs-only - cross-verified across mirrors)

**M20 - API Memory Tool (beta `memory_20250818`): model emits intent, client owns storage**
- PROBLEM: Give the model a memory vocabulary without Anthropic owning the store.
- SOURCE: Anthropic API docs via memdb adapter writeup + DZP reference (DOCS-ONLY)
- MATURITY: BETA
- INVARIANT: **The model only ever emits `memory_save` / `memory_recall` / `memory_delete` tool calls; ALL storage semantics (persistence, search, tenancy, forgetting) belong to the client's `BetaAbstractMemoryTool` implementation.**
- IMPLEMENTATION: Client registers `{"type": "memory_20250818"}`; reference impl `BetaLocalFilesystemMemoryTool` = JSON files on disk, exact-key lookup, single-user, single-process.
- FAILURE_MODE: The reference implementation is demo-grade: **no search beyond exact key, no tenancy, no audit** - anyone wiring the reference impl into production gets a memory system that answers ~2 of the 12 questions. The split is honest but pushes all hard problems to the client.
- PING_EXISTING_ANALOG: PING's tool-based agent loops (tools own the semantics) - same philosophy.
- GAP: n/a.
- HARVEST_CLASS: **PATTERN** - the intent/storage split is the right seam: PING's agents should emit memory *intents* against a PING-owned store with real semantics, never implement storage ad hoc.
- FALSIFICATION: Would be falsified if the API persisted anything server-side. Checked across mirrors: client-side files under `/memories/` namespace; server keeps nothing.
- DEPENDENCIES: client implementation.
- MEMORY_QUESTIONS_ANSWERED: (none inherently - delegated to the implementation; the honest null answer).

**M21 - Managed Agents memory stores: versioned, audited, redactable file memory**
- PROBLEM: Multi-agent, multi-session learning needs memory with accountability: who wrote what, when, from which session - plus correction without history destruction, plus real forgetting for secrets.
- SOURCE: Anthropic Managed Agents memory docs, cross-verified across 4 mirrors (`seangsisg/claude-code-docs`, `jojowadaxi/ai-agent-trending`, `folken2/nuvel`, `lh8ppl/core-memory-kit` - the last verified verbatim against `platform.claude.com/docs` 2026-07-21). DOCS-ONLY (no source access).
- MATURITY: PUBLIC BETA (announced 2026-04-23; beta header `agent-memory-2026-07-22`)
- INVARIANT: **Every mutation (create/update/delete, including agent-side filesystem writes to the mount) creates an immutable `memver_...` version recording `operation` (created/modified/deleted), `created_by` actor (`session_actor`/`api_actor`/`user_actor`), `session_id`, `api_key_id`, and timestamps. The audit trail survives redaction.**
- IMPLEMENTATION:
  - Stores are filesystems mounted at `/mnt/memory/<store>/`; the agent reads/writes with its normal bash/code tools. Max 8 stores/session.
  - Scoping: organization-level or user-level stores, per-store read/write permissions (e.g., shared read-only reference store + writable per-user store).
  - Optimistic concurrency: `precondition: {content_sha256}` on update/delete → `409 memory_precondition_failed_error` on mismatch (compare-and-swap; concurrent agents don't clobber).
  - Rollback: list versions (filter by memory_id/operation/session_id/api_key_id/time), retrieve any version's content, write it back as a new version.
  - Redaction: `POST .../memory_versions/{id}/redact` scrubs content/sha/size/path **but preserves actor + timestamps**; the current head of a live memory cannot be redacted (write a new version or delete first). Redactions themselves are audited.
  - Audit: "detailed audit log that records which agent and session each memory came from"; memory updates surface as session events in Console.
  - ZDR-eligible (zero data retention) for compliance.
- FAILURE_MODE: Version immutability means **storage grows monotonically** - a chatty agent creates unbounded versions; no compaction story documented. Redaction preserves *that a redaction happened* (metadata survives) - the fact of the secret's existence is still visible. The 8-store cap and mount-path conventions are soft contracts. Beta: API surface may change.
- PING_EXISTING_ANALOG: Tandem provenance sidecars (who/when/source) + `hidden_files/` per-goal scoping - same instincts, no versioning, no redaction, no CAS.
- GAP: This is the closest thing in the survey to PING's needs: versioned + audited + redactable + CAS-guarded memory. PING has none of the four as primitives.
- HARVEST_CLASS: **ADAPT** - the full invariant set (immutable versions, actor-typed audit, CAS preconditions, redact-preserving-audit) is the blueprint for PING's canonical memory write path. Highest-value harvest in the survey.
- FALSIFICATION: Cross-verified across 4 independent mirrors including one checked verbatim against official docs; endpoint paths, beta header, and error codes match across sources. Would be falsified by the GA release changing semantics - mark for re-verification at GA.
- DEPENDENCIES: Anthropic platform (closed); the *pattern* ports to any file store + ledger.
- MEMORY_QUESTIONS_ANSWERED: WHY (**partial** - operation + session context), WHO (**yes - created_by actor types + session/api-key ids**), WHAT (**yes - versioned content**), WHEN (**yes**), TENANT (**yes - org/user scoping + per-store permissions**), CURRENT (head version), CONTRADICTS (no), READ (**yes - per-store read/write ACLs**), EXPIRE (no documented TTL), CORRECTED (**yes - new version; rollback supported**), FORGOTTEN (**yes - delete + redact, the only real forgetting in the survey**), ACTION (**partial - session events in Console**).

**M22 - Dreams: offline consolidation that never mutates its inputs**
- PROBLEM: Online memory writes are hasty; consolidation (dedup, contradiction resolution, summarization) needs to happen offline without corrupting the live store.
- SOURCE: Anthropic dreaming docs via `lh8ppl/core-memory-kit` research note (verified against `platform.claude.com/docs/en/managed-agents/dreams` 2026-07-21). DOCS-ONLY.
- MATURITY: BETA (`dreaming-2026-04-21`)
- INVARIANT: **A dream is an async job over (memory_store + 1-100 session_ids) whose output is a wholly separate NEW memory store. "The dream itself never deletes or modifies its inputs."**
- IMPLEMENTATION: `POST /v1/dreams` with input store, session list, model, instructions (≤4096 chars). Runs minutes to tens of minutes. Output store is then leveraged or discarded (review gate).
- FAILURE_MODE: Consolidation is LLM-judged with undisclosed methodology (the 6x Harvey claim has undisclosed methodology - treat as marketing). A bad dream produces a confident, wrong consolidated store; the review gate is the only defense and it's optional ("leveraging vs discarding" is a paraphrase, not a literal API gate - the actual control may be weaker).
- PING_EXISTING_ANALOG: PING's digest rebuilds (outreach MD digest rebuilt after every sweep) and the `meta-ai-intel-pass` distill sweep - same shape, synchronous and inline rather than async and isolated.
- GAP: async, input-immutable consolidation as a primitive.
- HARVEST_CLASS: **ADAPT** - the input-immutability invariant is the harvestable core: PING's consolidation passes should write new projections, never mutate source observations.
- FALSIFICATION: Verified verbatim against official docs per the mirror ("never deletes or modifies its inputs" - confirmed quote).
- DEPENDENCIES: Anthropic platform.
- MEMORY_QUESTIONS_ANSWERED: WHY (dream instructions + input sessions), WHO (dream job owner), WHAT (output store diffable against input), WHEN (job time), others no. (Consolidation provenance, not memory provenance.)

### 2.8 Vector-store tenancy pattern (S10, docs)

**M23 - Payload-partitioned tenancy (`group_id` filter convention; Qdrant `is_tenant`)**
- PROBLEM: One shared vector index, many tenants, no cross-reads.
- SOURCE: Qdrant multitenancy docs (mirrored in `timtimtim3/enterprise-rag-infrastructure`, `kiri2sama/bmad-qdrant-knowledge-management`). DOCS-ONLY, pattern-level.
- MATURITY: PRODUCTION
- INVARIANT (formal mode): **With `is_tenant` payload indexing, each tenant's vectors get a separate HNSW index partition inside one collection; queries filtered to the tenant key physically cannot score other tenants' vectors.**
- IMPLEMENTATION: Tag every point `payload.group_id = <tenant>`; query with `must: [group_id == X]`. Informal mode = same filter without the dedicated index (correctness by convention). Mem0 (M5) and Graphiti (M16) both implement the informal mode.
- FAILURE_MODE: **Informal mode fails open the moment any code path omits the filter** - and the filter is a caller-side convention, not a storage guarantee. Even in formal mode, operational paths (backups, replicas, admin APIs, `get()` by point ID, scroll/export) bypass the query filter. Tenant enumeration via error messages/timing is unaddressed. This is the mechanism behind the cross-tenant entries in the failure catalog.
- PING_EXISTING_ANALOG: none (single-tenant today).
- GAP: storage-level tenant isolation for PING's future multi-business memory.
- HARVEST_CLASS: **ADAPT** - use formal partition mode where available; never rely on informal filter convention alone; treat `get-by-id` and export paths as tenant-crossing until proven otherwise.
- FALSIFICATION: Pattern is documented vendor behavior; the "physically cannot score" claim for `is_tenant` is vendor documentation, not independently tested here.
- DEPENDENCIES: vector DB with multitenancy support.
- MEMORY_QUESTIONS_ANSWERED: TENANT (**yes - the only question it answers**), READ (**partial - filter-holders**), others no.

---

## 3. Failure catalog - adversarial conditions

### 3.1 Poisoned memory (adversarial or accidental writes that corrupt future behavior)

| System | How poisoning gets in | What happens next | Defense present? |
|--------|----------------------|-------------------|------------------|
| Mem0 | "When in doubt, extract" + assistant messages are extraction sources. Attacker (or the model's own hallucination) plants a fact in conversation; the extractor dutifully persists it. MD5 dedup is exact-text, so paraphrased poison bypasses it. | Poison is retrieved by hybrid search like any fact; no confidence, no provenance check at read. | Hash dedup only. **No.** |
| Mem0 | `infer=False` raw path writes caller text verbatim with no extraction at all. | Same as above, faster. | **No.** |
| Letta V1 | The agent itself is the write gate; a user message like "remember my SSN is X / remember Alice was fired" becomes core or archival memory via tool call. | Core memory is injected into EVERY prompt - poison achieves maximum blast radius automatically. | `read_only` blocks (protect FROM agent, not from user-via-agent). **No content defense.** |
| Letta V1 | Shared archives: any attached agent's writes are readable by all attached agents. | Cross-agent poison with no attribution beyond agent id. | **No.** |
| Graphiti | Poison episode → entity extraction → **LLM contradiction judge can be engineered to invalidate TRUE edges** ("actually Alice never worked in marketing"). The invalidation looks like legitimate temporal evolution. | Old truth timestamped invalid; poison becomes current truth; history preserved but retrieval defaults to "now". | **No** - judge verdict is final, silent, no confidence, no appeal. |
| Graphiti | Entity-merge engineering: crafted text merges two distinct entities ("Acme Bakery" + "Acme Client"). | Facts cross-contaminate across the merged node. | **No** - merge is destructive to the distinction. |
| LangGraph Store | `put` overwrites by (namespace, key) - anyone with the namespace path can overwrite any key. | Previous value unrecoverable; poison indistinguishable from legitimate update. | **No** - no versioning, no writer auth in base API. |
| OpenAI | 96%-proactive (unverified) model-initiated writes; user trains to click "Memory updated" without review. | Hidden "User Knowledge Memories" layer uneditable. | User-visible list only. **Mostly no.** |
| Anthropic Managed Agents | Agent writes to mounted filesystem with normal tools - a prompt-injected agent writes poison files. | Poison is versioned and attributed (session_actor), so it is *traceable*; rollback and redaction exist. | **Partial-to-yes** - best in survey: audit + CAS + rollback + redact. |
| Anthropic Dreams | Bad consolidation bakes poison into the new store with a clean, confident structure. | Review gate is the only defense; optionally skipped. | **Weak.** |

**PING harvest:** Poisoning is the #1 unaddressed failure across OSS systems. Only Anthropic's versioned+audit+redact stack treats poisoning as expected. PING's existing UNVERIFIED-quarantine (tandem) is the right instinct - extend it from research artifacts to ALL machine memory writes.

### 3.2 Stale memory treated as current

| System | Behavior |
|--------|----------|
| Mem0 | Additive-only extraction (V3): contradictions accumulate as separate memories. `updated_at` changes only on explicit `update()`. Retrieval has no validity concept; expired soft-hide is date-based only. **Stale facts are the default outcome**, not the edge case. |
| Letta V1 | Core blocks and archival passages have no validity windows; `rethink_memory` is manual. Stale blocks persist until the agent notices. |
| Graphiti | **Best in survey**: `invalid_at`/`expired_at` + temporal filtering at search; "now" is the default reference. Residual risk: historical questions asked without explicit reference time get current-truth answers (silent temporal mismatch). |
| LangGraph Store | `updated_at` only; sliding TTL can *extend* a stale fact's life indefinitely if it keeps getting read. |
| OpenAI | Model "combines" memories opaquely; no validity representation documented. |
| Anthropic | Head-version = current by definition; no validity windows documented. Rollback is manual. |

**PING harvest:** Adopt bitemporal validity (M15) - it is the only representation in the survey that makes "was true, now isn't" first-class. Everything else either deletes history or accumulates contradictions.

### 3.3 Cross-tenant leakage

| System | Boundary | How it breaks |
|--------|----------|---------------|
| Mem0 | Query-time filter convention over a shared index (M5); `search`/`get_all` fail-closed without scope. | `get(memory_id)` is unscoped (UUID-guessing only mitigation); any custom vector-store provider or direct index access bypasses filters; backups/exports are unscoped; **deleted content survives in SQLite history with no scope column**. |
| Letta V1 | `organization_id` + archive attach list. | Shared archives are all-or-nothing (no read/write split); attach is the only granularity. |
| Letta V2 | **Process-level sandbox** (M11): memory workers cannot read other agents' memory; fail-closed without a sandbox backend. | Strongest OSS boundary in the survey - but only for *workers*, not for the main agent loop. |
| Graphiti | `group_id` on every node/edge; per-request driver scoping. | Had a real concurrency race (issue #1676) where concurrent group_ids clobbered the shared driver - **the tenant boundary was racy until the fix**. Informal filter mode elsewhere. |
| LangGraph | `thread_id` / namespace path = bearer token. | Knowledge of the ID is total access; no ACL; checkpoint stores leak full conversation state. |
| Anthropic | Org/user-scoped stores with per-store read/write permissions; read-only shared + writable private pattern. | Strongest in survey (M21). Residual: mount-path conventions are soft; 8-store cap. |
| OpenAI | Account boundary. | Builder of a custom GPT cannot read your chats (documented); training-data use is the orthogonal leak vector (on by default for consumer accounts). |
| Vector DBs | Payload filter (informal) vs `is_tenant` partitions (formal). | Informal mode fails open on any filter omission; operational paths (scroll, export, admin) bypass filters in both modes. |

**PING harvest:** Today's PING is single-tenant (Nolan), so this is future-proofing - but the direction is clear: **fail-closed mandatory scope (M5) + process sandbox for workers (M11) + per-store ACLs (M21)**. Never the bearer-token pattern (M17/M18) alone.

### 3.4 Uncorrectable / unforgottable memory

| System | Correction | Forgetting | Verdict |
|--------|-----------|------------|---------|
| Mem0 | Explicit `update()` (identity keys immutable - good). LLM never auto-corrects in V3 pipeline. | `delete()` hard-deletes the vector **but the SQLite ledger keeps the full text forever**; `delete_all` writes DELETE rows containing the text; no redaction API; `reset()` is provider-dependent. **Delete is a lie.** |
| Letta V1 | Agent rewrites own blocks (append/replace/rethink). Archival passages: delete + re-insert only, no update. | Core: replace-with-empty works (real). Archival: hard delete (real, if no backup). Git-memFS: **history retains everything** (needs filter-repo). |
| Graphiti | Supersession by new episode (temporal invalidation). | No redaction path in OSS; episodes append-only; `delete_episode` blunt. **Forgetting is not a primitive.** |
| LangGraph | Overwrite (destructive, no record). | Hard delete (real, no record). **Forgets too well** - the opposite failure: no audit that anything was ever there. |
| OpenAI | User edit or model auto-update; hidden layer uneditable. | 30-day deleted-memory log retained; hidden layer never forgettable. **Delete is a lie (vendor-side).** |
| Anthropic | New version; rollback supported; CAS prevents clobber. | Delete + per-version redact preserving audit. **The only real forgetting in the survey.** |
| Vector DBs | n/a | Point delete is real at the index; replicas/backups are the lie. |

**PING harvest:** The survey splits into "can't forget" (mem0, Graphiti, OpenAI, git-memFS) and "forgets without a trace" (LangGraph). Only Anthropic does both: **forget the content, keep the audit**. That is the target invariant for PING: *redaction preserves the ledger entry (who/when/what-happened) while destroying the content*.

### 3.5 Telemetry / side-channel (bonus finding)

- **Mem0** phones home to PostHog (`us.i.posthog.com`) on every `add/search/update/delete/history/get_all` call: event name + provider class names + collection name + embedding dims + **md5-hashed user_id/agent_id/run_id** (`process_telemetry_filters`). Content is not sent, but the *pattern* of memory operations (when, how often, which tenant-hash, which providers) leaves the box on every call. Opt-out exists (`MEM0_TELEMETRY`), but it is opt-out. For PING: any memory library with telemetry is a side-channel on mission tempo - vendor it, strip it, or gate it.
- **Anthropic** memory updates surface as session events in Console (documented, expected) - auditability, not a leak, but operators should know reads/writes are visible to the platform.

---

## 4. What survives interrogation - harvest list for PING

Ranked by value × confidence:

1. **Versioned, audited, redactable writes (M21, ADAPT).** Immutable `memver_`-style versions; actor-typed audit (who: session/api/user; when; from which session); CAS preconditions on concurrent writes; redaction that scrubs content but preserves the audit entry. This single mechanism answers more of the 12 questions than any other in the survey. PING's tandem quarantine + provenance sidecars are the seed; this is the grown form.
2. **Bitemporal validity (M15, ADAPT).** `valid_at`/`invalid_at` on facts; contradiction as timestamping, never deletion; temporal filtering at read with explicit reference time. PING's biggest representational gap - business facts change (EAB arrives, shops close, owners sell) and PING currently has no way to say "was true until X".
3. **Raw-episode-first writes (M13, ADAPT).** Immutable raw observation preserved before derivation; derivation links back to episodes. PING's tandem already does this for research; make it the uniform write primitive.
4. **Append-only mutation ledger with mandatory actor+reason (M3, ADAPT).** Mem0's ledger shape is right; its optionality (null actors) and missing redaction are the fixes. Every PING memory mutation appends (who, what changed old→new, why, when, tenant).
5. **Protected metadata fields (M12, ADOPT).** Operator-only fields (`verified`, `tenant`, `expires`) that the agent cannot set/change/remove, enforced against trusted prior state - the missing enforcement behind PING's UNVERIFIED→verified promotion.
6. **Deterministic budget constraints, hook-enforced (M10, ADOPT).** Versioned policy file, pure validator, embedded in the write path. PING's MEMORY.md needs machine budgets, not just curation discipline.
7. **Fail-closed memory workers (M11, ADAPT).** Sandboxed consolidation workers that cannot read other tenants' memory and refuse to run without the sandbox. For PING's future multi-business memory.
8. **Mandatory tenant scope at read + immutable identity keys (M5, ADAPT).** Fail-closed when scope is absent; identity keys write-once. Plus formal index partitioning (M23), never filter-convention alone.
9. **Input-immutable offline consolidation (M22, ADAPT).** Consolidation jobs write new projections, never mutate source observations. PING's digest rebuilds already lean this way; make it an invariant.
10. **Hybrid retrieval with scores, thresholds, and retrieval logging (M2+M16, ADAPT).** Over-fetch + fuse + threshold is fine; the survey-wide missing piece is **logging what was retrieved for each action** - without it, "DID IT AFFECT AN ACTION" is unanswerable everywhere except checkpointed systems.
11. **Sliding TTL done right (M17, ADAPT with fix).** Per-item expiry is a good primitive; fix LangGraph's flaw: reads must NOT refresh the TTL of low-confidence/poisonable facts, and expiry deletion must be guaranteed, not opportunistic.
12. **The intent/storage split (M20, PATTERN).** Agents emit memory intents; the substrate owns semantics. PING's agents should never hand-roll storage.

**Explicitly rejected:** full-dump injection (M19 as architecture - no retrieval, everything in every prompt); amnesiac overwrite stores without a ledger (M17's put semantics alone); agent-as-sole-ungated-writer (M7/M8 without a verification gate); "when in doubt, extract" (M1's bias - invert to precision for PING); filter-convention tenancy without storage partitioning (M23 informal mode).

---

## 5. Open questions

1. **Anthropic GA drift:** M21/M22 are public-beta, cross-verified but docs-only. Re-verify version/redact/CAS semantics at GA; beta headers (`agent-memory-2026-07-22`, `dreaming-2026-04-21`) and endpoint paths may change.
2. **OpenAI internals unverified:** the `bio`-tool / full-dump / 100-block / six-layer claims rest on one RE writeup. The user-facing controls (visible list, delete, 30-day log, Temporary Chat) are first-party. Do not cite the internals as fact.
3. **Mem0 graph memory:** docs claim OSS graph providers; the code has none (platform-only). If a future mem0 version restores `mem0/graphs/`, re-survey - a graph layer would change M1/M2's failure modes.
4. **Contradiction-judge trust:** no surveyed system puts a confidence score or appeal path on contradiction judgments (M15's LLM judge is the sharpest instance). Open design question for PING: operator-verified invalidation vs. autonomous with confidence thresholds.
5. **Retrieval-action linkage:** no surveyed system logs (memory_id → action_id) at read time. This is the least-built, most-needed primitive for "DID IT AFFECT AN ACTION" - likely a PING-original contribution.
6. **Multi-tenant PING:** PING is single-tenant today. When the second tenant arrives, the order is: formal index partitioning + mandatory scope (M5+M23) + per-store ACLs (M21) + sandboxed workers (M11). Deciding this *before* the second tenant is cheaper than retrofitting.
7. **Consolidation methodology:** Anthropic's "Dreams" and Zep's community summarization both rely on undisclosed LLM-judge methodology. Any PING consolidation pass needs a published, testable reconciliation policy, not vibes.
8. **Forgetting vs. evidence law:** redaction-preserving-audit (M21) is the best known answer, but some jurisdictions want proof of *what* was forgotten and some want proof it *is* forgotten - these conflict. PING needs a stated policy before the first redaction request arrives.
9. **Embedding-model drift:** no surveyed system versions the embedding model alongside the vectors. A model swap silently invalidates every similarity score in the store. PING's ledger should record the embedding model + version per memory.
10. **PING analog verification:** the PING_EXISTING_ANALOG column is best-effort from MEMORY.md/AGENTS.md as injected; several analogs ("no retrieval layer", "no tenant model") are absences I could not fully verify against the full PING codebase in this lane's scope. Treat as pointers for the implementing lane, not as established fact.

---

## 6. Method notes / limitations

- Source-verified (S1-S6): every mechanism cites file + line ranges against the pinned SHA. Docs-only (S7-S10): marked as such, cross-checked across independent mirrors where possible.
- Adversarial stance held throughout: the two sharpest falsifications were (a) mem0's documented-but-absent graph package, and (b) the letta-ai/letta repo being a pointer, not source - both would have corrupted the survey if taken at face value.
- "Embed conversation and retrieve nearest chunks" was rejected as sufficient by every mechanism that survived: the survivors all add at least two of {write gating, tenant scoping, versioning/audit, temporal validity, contradiction handling, redaction} on top of the vector substrate. None of the pure-vector approaches cleared the 12 questions.
- No live systems were run; no benchmarks executed. Behavioral claims (e.g., mem0's exact dedup behavior, Graphiti's judge dynamics) are code-reading claims, not runtime-verified.
