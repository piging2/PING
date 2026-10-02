# LANE 6 - HIVEKEEP: persistent context / memory / retrieval

Status: HYPOTHESIS until replayed from a clean checkout. Lane 6 read only; no commits, no pushes, no tree modifications. Pin verified against local shallow clone at ~/workspace/ping-24h/donors/hivekeep/ (HEAD matches below).

Builds on Lane G (memory lane, wave-1). Lane G covered architecture, categories, scopes, provenance gaps, lifecycle. This lane re-verified the memory subsystem directly in code and goes deeper on the three strongest harvestable mechanisms, all in the persistent-context / retrieval discipline. It does not redo Lane G's catalog.

## Donor card

- Repository: https://github.com/MarlBurroW/hivekeep (canonical; kdegeek/hivekeep is a fork)
- License: MIT (Copyright (c) 2024-2026 marlburrow) - OBSERVED IN CODE (LICENSE file)
- Current SHA: 7d023c952e46861070683825ff545daf981910f0 - OBSERVED IN CODE (git rev-parse HEAD on local clone matches Lane G pin)
- Version/date: package.json 1.10.0; HEAD commit 2026-09-17 "fix: integrate reviewed chat, installer, provider and dependency updates (#49)" - OBSERVED IN CODE
- Activity: active at pin; last commit 11 days before Lane G's 2026-09-28 read - DOCUMENTED (commit log) / CLAIMED BY AUTHOR (release cadence per third-party listings, Lane G)
- Language: TypeScript (Bun runtime, Hono server, React client, Drizzle ORM) - OBSERVED IN CODE
- Deployment model: self-hosted single-container, single-user / small-group platform; one SQLite file per instance; explicitly not multi-tenant per-user (codebase comment in settings.ts, per Lane G; verified stance "small-group product, not multi-tenant per-user") - OBSERVED IN CODE / DOCUMENTED
- Persistence model: SQLite via better-sqlite3 + Drizzle ORM; sqlite-vec virtual table (memories_vec) for KNN; FTS5 virtual table (memories_fts); tables: memories (archive), agent_profiles (one row per agent) - OBSERVED IN CODE (memory.ts, schema.ts)
- Memory model: two layers. (1) Curated per-agent profile document (agent_profiles table), always injected into the stable/cached system-prompt segment, hard-budgeted (MEMORY_PROFILE_MAX_TOKENS, default 1500, BPE count). (2) Episodic archive (memories table), never auto-injected, searched on demand via recall tool. One LLM call per compaction batch both extracts archive items and rewrites the profile. - OBSERVED IN CODE (memory-maintenance.ts runMemoryMaintenance) / DOCUMENTED (memory.md)
- Event model: SSE events (memory:created/updated/deleted, agent-profile:updated); no event sourcing for memory mutation (in-place UPDATE, no version rows) - OBSERVED IN CODE
- Retrieval/ranking model: hybrid sqlite-vec KNN + FTS5 fused by Reciprocal Rank Fusion (rrfK=60, ftsBoost=0.5); cosine-distance similarity threshold 0.5 as spam filter; recency as tie-break only (stable sort by updatedAt within equal RRF scores); retrieval_count incremented on recall results as telemetry but deliberately excluded from scoring - OBSERVED IN CODE (searchMemories, searchByVector, searchByFTS, trackRetrievals)
- Standing context contains: what the agent knows: current state, standing preferences, active work, durable conventions, key decisions with reasoning and absolute dates, open threads/commitments; plus a ## Pinned section holding user-explicit "remember this forever" entries - DOCUMENTED (memory.md section 3) / OBSERVED IN CODE (buildProfileBlock)
- Archive contains: what happened: dated events, past details, one-off facts, episodic atomized items in four flat categories (fact | preference | decision | knowledge), unbounded accumulation unless explicitly forgotten - OBSERVED IN CODE (schema.ts, deleteMemory hard-deletes)

### Explicitly absent (mission focus questions answered honestly)

- Evidence tags: there are NO KNOWN / UNKNOWN / CONFLICTED / STALE / INFERRED tags in stored memory state (grep-confirmed across memory.ts, memory-maintenance.ts, memory-tools.ts, schema.ts). "Stale" appears only as an LLM-suggested audit label in the review_memories tool output, which auto-resolves nothing. - OBSERVED IN CODE
- Retraction/supersession semantics: none. updateMemory overwrites content in place (updatedAt bumped, no version preserved); deleteMemory hard-deletes the row and its vec row (no tombstone). Contradiction "resolution" is an LLM maintenance action ("update" when new content "contradicts, supersedes, or enriches") that overwrites, plus review_memories which detects contradictions/duplicates/staleness and "lets the Agent decide". - OBSERVED IN CODE
- Dedup is fail-open: isDuplicateMemory returns false when embeddings fail; createMemory stores without a vector when the embedding provider is unavailable, logging only. - OBSERVED IN CODE

---

## Mechanism 1: Standing-context admission rule (the boundary test)

PROBLEM: Without a decision rule, standing context either hoards everything (LLMs overfill an always-visible document for fear of losing information) or loses durable material into the archive where it stops shaping behavior. Both layers grow by vibes.

INVARIANT: Material enters standing context if and only if it satisfies this test: "Should this influence the Agent's behavior in most future conversations, without anyone mentioning it?" Yes goes to the profile (standing context). No, but it may matter when a topic comes back, goes to the archive (recallable). - DOCUMENTED (memory.md section 3) / OBSERVED IN CODE (exported const BOUNDARY_TEST, memory-maintenance.ts:28)

MECHANISM: One sentence, stated verbatim at every decision point that routes information: the maintenance-call prompt (arbitrating integrate-into-profile vs add-to-archive), the memorize tool description, the edit_profile tool description, the ## Your memory system-prompt block, and the tool-guidance block in the prompt builder. (Lane G counted three; direct read found the same text in five places: maintenance prompt, memorize, edit_profile, profile block, tool guidance.) An exported code constant (BOUNDARY_TEST) is the single source of truth for the prompt copy; the tool descriptions carry close paraphrases. Demotion is defined as filing, not forgetting: a resolved project leaves the profile at rewrite time but its trace must exist in the archive or summaries. - OBSERVED IN CODE

WHY IT WORKS: The test is operationalizable by both humans and models: "most future conversations" is a frequency claim, "without anyone mentioning it" is an unprompted-influence claim. The anti-hoarding half matters as much as the admission half: the prompt explicitly states "nothing is ever lost by going to the archive", which is what keeps the profile small without fighting the model. The economic framing makes it a real constraint: every profile line pays permanent rent from the token budget every turn (and invalidates prompt cache on rewrite); archive storage is free until queried, so it can be exhaustive. Index vs content.

FAILURE IT PREVENTS: Standing-context bloat (per-turn cost, cache invalidation, attention dilution) and silent loss of durable behavioral material into an unsearched archive. It also answers the mission's focus question directly: yes, Hivekeep's standing context is defined to contain ONLY material expected to influence most future interactions unprompted. That is the admission rule, stated as the rule.

ASSUMPTIONS: (1) The model's judgment at each decision point tracks the test's intent; the rule is prompt prose, not a mechanically enforced gate (only the token budget is code-enforced). (2) "Most future conversations" is predictable enough at write time to be a stable routing signal. (3) The archive is actually searchable later, so "filing not forgetting" is true (depends on recall quality, Mechanism 2).

PING EQUIVALENT: PING has richer context layers (standing projections, evidence archive, MC surfaces) but, per Lane G and the first-pass synthesis, no single stated routing rule deciding what gets promoted to standing context vs stays in the evidence archive. Mission Control changes item 1 in first-pass findings already flags this harvest.

PING STRONGER-WEAKER-DIFFERENT: DIFFERENT, with PING weaker on this axis as a stated discipline. PING's primitives are richer; Hivekeep's contribution is not a primitive but a policy sentence applied with verbatim discipline at every decision point. Honest limit: the test is enforced by prose repetition, not by code; PING should harvest the wording discipline, not mistake it for a gate.

TEST WE CAN STEAL: A verbatim-consistency test across decision points: assert the boundary-test sentence is identical in the maintenance prompt, the memory tool descriptions, and the system-prompt block (drift detector). Hivekeep states it "verbatim in three places" but has no test pinning that; the paraphrases in prompt-builder.ts and the tool descriptions already drift from the constant. Second steal: an admission-audit test: for a sample of standing-context entries, each must be classifiable by a reviewer under the test, and entries failing the test must be demotable to the archive with trace preserved.

CODE WE ACTUALLY NEED: none. The harvest is one sentence of policy prose plus the economic framing (permanent rent vs free-until-queried). Portable as documentation and prompt text, not code.

VERDICT: NEW INVARIANT FOUND

---

## Mechanism 2: Anti feedback-loop retrieval invariant

PROBLEM: Any retrieval signal that measures exposure (how often a memory was injected) rather than usefulness will compound: injected memories score higher, get injected again, and the archive collapses to a winner-take-all set while most of the corpus is never surfaced.

INVARIANT: Relevance to the query is the ONLY ranking signal. Telemetry that measures retrieval frequency (retrieval_count) or self-rated importance is recorded but must never multiply a ranking score. Recency breaks ties only. - OBSERVED IN CODE (searchMemories comment block) / DOCUMENTED (memory.md section 5)

MECHANISM: v1 multiplied the fused score by temporal decay, importance weight, retrieval-count boost, subject boost, category intent regexes, recency multiplier, and ran importance recalibration. Measured on the production DB 2026-08-08 (205 memories, 12 agents): the top memory was injected 330 times, the next 191/172/165, while 50% of the corpus was never recalled once; importance recalibration drifted top memories to 8.6-10 on its own. The author concluded the loop is inherent to the design, not a tuning problem, after three generations of nerfs failed. v2 deleted the entire scoring apparatus (~1200 lines of heuristics: temporal decay, importance weight, retrieval boost, subject boost, regex intent detection, adaptive-K, recalibration, pruning, plus the consolidation service) and replaced it with plain hybrid search: sqlite-vec KNN + FTS5 fused by RRF, similarity threshold 0.5 as a spam filter, stable sort by updatedAt within equal RRF scores. retrieval_count and last_retrieved_at columns stay in the schema and are still incremented on recall results, explicitly as UI telemetry. importance stays as display-only metadata. - DOCUMENTED (memory.md sections 1, 5, 9) / OBSERVED IN CODE (memory.ts) / DEMONSTRATED BY TEST (headers only; test bodies not executed in this lane)

WHY IT WORKS: Ranking and telemetry are separated by construction. The score function has no input that the ranking process itself produces, so there is no fixed-point loop to converge on. Recency-as-tie-break keeps determinism without letting recency manufacture relevance. Deleting the heuristics instead of tuning them removed the parameter surface where the loop hid.

FAILURE IT PREVENTS: The measured v1 failure class: retrieval frequency manufacturing relevance (one memory injected 330 times, half the corpus invisible), importance self-ratings drifting upward without evidence, and per-turn injection of ~800-1200 tokens of stale memories unrelated to the current message. First-pass findings already dispositioned this as a harvest invariant for MC's search intent router.

ASSUMPTIONS: (1) The production measurements in memory.md are accurate (205 memories, 12 agents, injection counts) - CLAIMED BY AUTHOR, production-DB statistics quoted in the design doc, not independently re-verifiable from this read-only pass. (2) Pure relevance ranking is sufficient for an archive where the agent formulates its own recall queries (v2 recall is agent-driven, not per-message auto-injection). (3) RRF over vec+FTS with a fixed similarity threshold does not itself create a subtler exposure loop. The mechanism's core claim, that usefulness-unproven signals must never be ranking multipliers, does not depend on assumption 1 being exact.

PING EQUIVALENT: MC's search intent router and any ranked retrieval surface. First-pass findings item 2 under "3 Mission Control changes" already states the harvest: usefulness-unproven signals must never be ranking multipliers; relevance is the only ranking signal; recency breaks ties only.

PING STRONGER-WEAKER-DIFFERENT: UNKNOWN for PING's current retrieval internals from this lane (no PING canonical tree access; the verification boundary in first-pass findings covers only the workspace trees). The invariant is portable regardless of PING's current state: it is a negative constraint on any ranking function.

TEST WE CAN STEAL: (1) Score-purity property test: double a memory's retrieval_count and assert rank order is unchanged for a fixed query (retrieval frequency must not be a ranking input). (2) Usefulness-unproven-signal audit: enumerate every multiplier in the ranking path and require each to cite the evidence that it measures usefulness rather than exposure; fail on any multiplier fed by access counts, recency, or self-ratings. (3) Corpus-coverage regression: the v1 failure signature (top item injected N times while a large fraction of the corpus is never surfaced) as a canary metric on retrieval telemetry.

CODE WE ACTUALLY NEED: none. The harvest is the invariant plus the deletion discipline (delete the scoring heuristics rather than tuning them). No importable code; the RRF hybrid search itself is standard.

VERDICT: NEW INVARIANT FOUND (built on a production-measured ASSUMPTION FALSIFIED: retrieval frequency as a usefulness signal)

---

## Mechanism 3: Deterministic guardrails around standing-context mutation (prompt requests, code enforces)

PROBLEM: An LLM rewrite of standing context can silently drop exactly what the user explicitly asked to keep, or blow past the context budget. Instruction-following is not a preservation mechanism.

INVARIANT: The prompt requests; the code enforces. Anything the user explicitly asked to keep forever is protected by deterministic post-processing around the LLM call, never by the prompt alone. A failed or malformed rewrite never destroys the previous standing context.

MECHANISM: Three composed guards in the maintenance write path (memory-maintenance.ts, agent-profile.ts), all OBSERVED IN CODE and DEMONSTRATED BY TEST (bun:test suites, headers + test names read; bodies not executed):
1. enforcePinned: after the LLM rewrite, the previous ## Pinned section is reinstated verbatim (replacing the model's version if altered, unshifting it if dropped). Code comment: "pinned entries are the one thing a user explicitly asked to keep forever, so it is enforced in code rather than trusted to instruction-following." Empty previous Pinned sections are not resurrected.
2. enforceBudget: the rewrite is measured with the shared BPE token estimator against MEMORY_PROFILE_MAX_TOKENS (default 1500). Overshoot within 1.2x tolerance is kept (do not cut a document mid-sentence); beyond tolerance, whole trailing sections are dropped with Pinned ordered first regardless of its position, and the truncation is logged with before/after counts. A single over-budget section is left alone (nothing to drop without cutting mid-line).
3. Transactional write: runMemoryMaintenance never throws; a missing or empty profile block keeps the old profile ("losing a curated profile to one bad generation is worse than a stale one"); the write is enforceBudget(enforcePinned(old, new)) and old content is only replaced by a validated new one. The edit_profile tool path throws typed ProfileBudgetError / ProfileLineNotFoundError with actionable messages (what to prune, what was missing) instead of failing blindly.
Context packaging for models: the profile is injected into the stable (cached) prompt segment, so rewrites invalidate cache at compaction frequency only; the per-turn volatile segment lost ~1k tokens of auto-injected memories vs v1; the hot path has no embedding call.

WHY IT WORKS: Preservation and budgeting are separated from generation. The model is free to be creative inside the document; the two properties that must hold unconditionally (pinned lines survive, budget holds) are enforced by pure functions on strings, which are unit-testable without any model. The fail-closed direction is correct: a bad generation costs staleness (keep old), never loss.

FAILURE IT PREVENTS: Silent deletion of user-pinned standing context by an LLM rewrite; unbounded growth of always-injected context (permanent token rent); one bad generation wiping a curated document; opaque budget rejections the model cannot act on.

ASSUMPTIONS: (1) The Pinned section convention is respected at write time (edit_profile pin:true routes there; the UI writes there). (2) The BPE token estimator approximates the serving model's tokenizer well enough for the 1.2x tolerance to be safe. (3) Keeping a stale profile on bad generation is acceptable, which assumes the next compaction will repair it.

PING EQUIVALENT: PING's standing doctrine is "deterministic policy boundaries authorize" and the first-pass synthesis flagged this harvest as "verify PING already does this." The pattern mirrors PING's authority thinking: the model proposes (rewrite text), deterministic code disposes (pinned reinstatement, budget truncation, transactional write).

PING STRONGER-WEAKER-DIFFERENT: DIFFERENT, likely PING STRONGER on the doctrine but Hivekeep SMALLER as a concrete composition. What Hivekeep contributes is not the idea but the small tested reference: pinned-verbatim reinstatement + Pinned-first truncation ordering + keep-old-on-bad-generation as one packaging discipline for model-facing standing context, in ~100 lines with 10 unit tests. Lane G already noted Hivekeep tests each guard separately, not composed.

TEST WE CAN STEAL: The composed adversarial test Hivekeep lacks: feed the rewrite path a model output that drops the Pinned section AND exceeds budget simultaneously; assert pinned lines survive verbatim and truncation still applies with Pinned-first ordering. (Hivekeep's enforcePinned and enforceBudget suites test each guard in isolation.) Second steal: keep-old-on-malformed-generation test (already in their parseMaintenanceResponse suite; worth mirroring for any PING standing-context mutation path).

CODE WE ACTUALLY NEED: none. The guards are ~100 lines of string/section manipulation tied to Hivekeep's markdown profile format; the harvest is the pattern and the tests, reimplementable in PING's own context-packaging layer if a gap is found there.

VERDICT: MECHANISM BENCHMARKED

---

## Relation to the mission's focus questions

- Standing-context admission rule (does it contain only material expected to influence most future interactions unprompted?): ANSWERED by Mechanism 1. Hivekeep's standing context is defined by exactly that test, applied verbatim at every routing decision point. Harvest the sentence and the verbatim-everywhere discipline.
- Retrieval without popularity feedback loops: ANSWERED by Mechanism 2. The invariant is "relevance is the only ranking signal; telemetry must never multiply a score," built on a production-measured winner-take-all failure (330 injections vs 50% never surfaced) that three generations of tuning could not fix. Deletion beat tuning.
- Evidence compilation with KNOWN/UNKNOWN/CONFLICTED/STALE/INFERRED tags: ABSENT in Hivekeep. No stored evidence tags exist; the closest is an LLM-suggested "stale" label in an audit tool that resolves nothing. PING is already stronger here (first-pass findings item 10); nothing to harvest, and the absence is recorded so nobody mistakes Hivekeep for having an evidence-typing system.
- Evidence retraction/supersession semantics: ABSENT in Hivekeep. Updates overwrite in place with no version preserved; deletes are hard deletes with no tombstones; contradiction "resolution" is LLM overwrite plus an audit tool that "lets the Agent decide." This is a documented weakness, not a mechanism. PING's HOLD/SUPERSEDED semantics are already stronger (first-pass findings item 4); the steal is the negative test list (supersession audit test, retraction-lifecycle test), already captured in wave-1.
- Context packaging for models (bounded, budgeted): ANSWERED by Mechanism 3. 1500-token default budget, BPE-measured, Pinned-first truncation, keep-old-on-failure transactional write, injection into the cached stable prompt segment.

## What PING should take (ranked)

1. The boundary-test sentence as a stated standing-context admission rule, repeated verbatim at every promotion/demotion decision point, with the economic framing (always-present context pays permanent rent; the archive is free until queried). (Mechanism 1)
2. The anti feedback-loop invariant as an explicit retrieval-policy constraint: no usefulness-unproven signal (retrieval frequency, recency, importance self-ratings) may multiply a ranking score; relevance ranks, recency breaks ties. Plus the deletion discipline: when scoring heuristics compound exposure into relevance, delete them rather than tuning. (Mechanism 2)
3. The composed adversarial test for standing-context mutation guards (pinned dropped + budget blown simultaneously), and the keep-old-on-bad-generation fail-closed write. (Mechanism 3)

Nothing in Hivekeep's storage layer, category schema, scoping model, or contradiction handling exceeds PING; those are REJECT for adoption (flat 4-category schema, no tenant isolation, in-place overwrite, fail-open dedup, provenance stored-but-hidden). The harvest is entirely policy invariants, one sentence of routing prose, and tests.

## Verification notes

- Pin re-verified: local shallow clone HEAD == 7d023c952e46861070683825ff545daf981910f0; package.json 1.10.0; LICENSE MIT; HEAD commit 2026-09-17.
- All mechanism claims above were read directly from the pinned tree (file:line pointers in raw/evidence-pointers.md). Claim tags used: OBSERVED IN CODE (read the implementation), DOCUMENTED (memory.md design doc), DEMONSTRATED BY TEST (bun:test suites exist with covering test names; bodies not executed), CLAIMED BY AUTHOR (production-DB measurements quoted in memory.md, not independently re-verifiable here), INFERRED where noted.
- Not verified: runtime behavior (no tests executed, Bun toolchain not run); production statistics in memory.md beyond the author's word; full commit history (shallow clone, no tags); the PING canonical tree (not reachable from this environment), so PING STRONGER-WEAKER-DIFFERENT assessments on PING's side rest on the first-pass findings' verification boundary, not direct PING source reads.
- Raw evidence pointers: [raw/evidence-pointers.md](sandbox://workspace/ping-24h/lanes/lane06-hivekeep/raw/evidence-pointers.md)
