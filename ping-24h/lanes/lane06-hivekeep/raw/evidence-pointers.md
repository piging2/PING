# Lane 6 (Hivekeep) - raw evidence pointers

Pin: https://github.com/MarlBurroW/hivekeep @ 7d023c952e46861070683825ff545daf981910f0
(local shallow clone at ~/workspace/ping-24h/donors/hivekeep/ verified HEAD == this SHA)

## Verbatim boundary test (single source of truth in code)

src/server/services/memory-maintenance.ts:28-30 (exported const BOUNDARY_TEST):
"Should this influence the Agent's behavior in most future conversations, without anyone mentioning it? Yes -> the profile. No, but it may matter when a topic comes back -> the archive."

Occurrences:
- memory-maintenance.ts:28 (exported const, used in buildMaintenancePrompt)
- memory.md:159 (design doc quote block)
- memory.md:226 (profile-vs-archive arbitration instruction)
- src/server/tools/memory-tools.ts:120-123 (memorize tool description, paraphrase + "use edit_profile instead")
- src/server/tools/memory-tools.ts:287-291 (edit_profile tool description, paraphrase from other side)
- src/server/services/prompt-builder.ts:773 (tool-guidance block, paraphrase)
- src/server/services/prompt-builder.ts:311-335 (buildProfileBlock "## Your memory" block, paraphrase "Rule of thumb")

## v1 failure measurements (memory.md section 1, DOCUMENTED / CLAIMED BY AUTHOR)

Measured on production DB 2026-08-08, 205 memories, 12 Agents:
- 50% of memories never recalled once
- top memory injected 330 times; next 191/172/165
- retrieval_count measures injection, not usefulness; multiplied into score
- importance recalibration drifted top memories to importance 8.6-10 on their own
- ~10 memories injected per turn (~800-1200 tokens), mostly same ones, rarely related
- v1 scoring: temporal decay per category, importance weight, retrieval boost, subject boost, regex intent detection, adaptive-K, recalibration, pruning (~1200 lines)

## Relevance-only ranking (memory.ts)

searchMemories() comment (OBSERVED IN CODE):
"Relevance to the query is the only ranking signal. v1 multiplied the fused
score by temporal decay, importance, retrieval count, subject and category
boosts; on real data that produced a winner-take-all archive where a handful
of memories were returned forever and half the corpus was never surfaced
once. Recency only breaks ties."

- Vector arm: sqlite-vec KNN, cosine-distance threshold = 1 - similarityThreshold (0.5)
- FTS arm: FTS5, terms >= 3 chars, AND-then-OR fallback, prefix matching
- Fusion: RRF weight 1/(rrfK+i+1), rrfK=60, ftsBoost=0.5 (config.ts:349-367)
- Tie-break: updatedAt desc. retrieval_count excluded from score.
- trackRetrievals(): increments retrieval_count + last_retrieved_at, fire-and-forget (telemetry only)
- isDuplicateMemory(): catch { return false } -- FAIL-OPEN on embedding failure (OBSERVED IN CODE)
- createMemory(): embedding failure -> store without vector; vec insert failure -> log.warn only, "boot reconciliation sweep cannot repair a missing vec row, only orphans" (OBSERVED IN CODE)

## Guardrails (memory-maintenance.ts, agent-profile.ts)

- enforcePinned(previous, next): reinstate previous Pinned section verbatim; if rewrite dropped it, unshift it; comment: "pinned entries are the one thing a user explicitly asked to keep forever, so it is enforced in code rather than trusted to instruction-following"
- enforceBudget(content, budget, tolerance=1.2): tolerated overshoot within 1.2x; beyond that drop whole trailing sections, Pinned ordered first regardless of position; single over-budget section left alone (cannot drop without cutting mid-line)
- runMemoryMaintenance: never throws; missing/empty profile block -> keep old profile ("losing a curated profile to one bad generation is worse than a stale one"); profile write = enforceBudget(enforcePinned(old, new)); "A failed call never loses the profile (write is transactional: old content is only replaced by a validated new one)"
- editProfile (agent-profile.ts:232-249): throws ProfileBudgetError / ProfileLineNotFoundError with actionable messages; budget reject names what to prune
- Config: MEMORY_PROFILE_MAX_TOKENS default 1500 (config.ts:367); MEMORY_MAX_RELEVANT default 10

## Tests (bun:test, headers read)

- memory-maintenance.test.ts: parseMaintenanceResponse (9 tests incl. keep-old-on-bad-parse, apply-archive-when-profile-malformed), enforcePinned (4 tests), enforceBudget (6 tests), selectArchiveIndex
- memory.test.ts: (headers not enumerated in this lane; Lane G noted RRF/FTS pure-function coverage)
- review_memories (memory-tools.ts:341-448): LLM audit returning {type: contradiction|duplicate|stale|clutter, memoryIds, description, suggestion: delete|merge|update}; "For contradictions, flag both memories and let the Agent decide which is correct." -- auto-resolves nothing (OBSERVED IN CODE)

## Explicitly absent (grep-confirmed in memory subsystem)

- No KNOWN/UNKNOWN/CONFLICTED/STALE/INFERRED evidence tags in stored state (memory.ts, memory-maintenance.ts, memory-tools.ts, schema.ts)
- No supersession/retraction lifecycle: updateMemory = in-place UPDATE (content overwrite, updatedAt bump, no version row); deleteMemory = hard DELETE from memories + memories_vec (no tombstone)
- No tenant isolation: settings.ts comment (per Lane G) "not multi-tenant per-user"; scope = private|shared per-agent only
- sourceMessageId stored (CreateMemoryInput.sourceMessageId, schema column) but never returned by recall/list result mapping (memory-tools.ts result mapping returns id/content/category/subject/importance/scope/authorAgentName/age/sourceContext only)
- sourceContext is LLM-written 1-2 sentence summary at extraction time (OBSERVED IN CODE: addIfNotDuplicate passes sourceContext from maintenance LLM item)
