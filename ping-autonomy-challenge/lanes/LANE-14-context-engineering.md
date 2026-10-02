# LANE 14: CONTEXT ENGINEERING

**Wave 1, PING Autonomy Grand Challenge**
**Researcher report. Research / Falsification / Harvest only. No implementation.**
**Date: 2026-09-23**

## Mission

More autonomy with less context. Coding agents drown in their own context. This lane studies how serious systems avoid drowning, then argues what PING should harvest, in canonical mechanism format, with falsification attached.

**Method:** read docs and source where available, SHA-pinned. For compaction: find the actual algorithm (LLM summarization? truncation with markers? structured extraction?) and state what is provably lost in each. For handoffs: argue the minimal survival set from failure cases, not intuition.

**Note on style:** no em dashes anywhere in this file, per Nolan's standing rule.

---

## 1. Source ledger (all SHAs pinned at research time)

| ID | Repo / source | HEAD SHA (12) | Status |
|---|---|---|---|
| S1 | openhands/software-agent-sdk | 5b36cacccc2b | public, pulled 2026-09-23 |
| S2 | openhands/docs | 3d3fc4fe3e4b | public, pulled 2026-09-23 |
| S3 | ccomkhj/ccomkhj.github.io | fcc336e00e94 | public, pulled 2026-09-23 |
| S4 | jmagly/aiwg | a3f8bcc2dccd | public, pulled 2026-09-23 |
| S5 | arturseo-geo/claude-code-skills | 3ee68efb4f96 | public, pulled 2026-09-23 |
| S6 | mateuscmarim/marim-harness | (unavailable) | auth challenge on public URL; likely private or renamed. Content used only via search snippet; do not treat as pinned. |
| S7 | mxcoppell/bootloader.live | 7c962edc1a77 | public, pulled 2026-09-23 |
| S8 | deepmyst/mysti | 6d709229b519 | public, pulled 2026-09-23 |
| S9 | netclaw-dev/netclaw | 69c5e0f1f697 | public, pulled 2026-09-23 |
| S10 | ramparte/agent-building-playbook | ca2ab73f4837 | public, pulled 2026-09-23 |
| S11 | frankiesoltero/soltero-skills | c4ea4e444144 | public, pulled 2026-09-23 |
| S12 | rearclabs/bilinc | (unavailable) | auth challenge on public URL; content used via search snippet only. |
| S13 | adamcelove/context-efficient-wiki | 7205af14724d | public, pulled 2026-09-23 |
| S14 | Cloudgeni-ai/opengeni | ed5402a00668 | public, pulled 2026-09-23 (PR #235, Codex-parity compaction) |
| S15 | harshsinghmp/skills | cd9623ce5135 | public, pulled 2026-09-23 |
| S16 | marius-manola/personal-brand | 9502703bee75 | public, pulled 2026-09-23 |
| S17 | signalnine/thunderdome | 6525216160b8 | public, pulled 2026-09-23 |
| S18 | d-sorganization/maxwell-daemon | 1428696b63bd | public, pulled 2026-09-23 |
| P1 | Anthropic platform docs, compaction | n/a (live docs) | https://platform.claude.com/docs/en/build-with-claude/compaction, read 2026-09-23 |
| P2 | "The Complexity Trap: Simple Observation Masking Is as Efficient as LLM Summarization for Agent Context Management" | arXiv 2508.21433 | JetBrains Research; summarized as NeurIPS 2025 on 500 SWE-bench instances (via netclaw S9). Key falsification source for this lane. |
| P3 | Liu et al., "Lost in the Middle" | arXiv 2307.03172 | position U-shape; cited via soltero-skills S11 |
| P4 | SWE-Pruner paper | arXiv 2601.16746 | line-level task-aware pruning at the agent-environment boundary |
| P5 | OpenDev, "Building Effective AI Coding Agents" | arXiv 2603.05344 | staged pressure thresholds, ~54% lower peak consumption (via S11) |

**Closed-source systems in this report** (Claude Code, Cursor, Codex CLI, Copilot, Gemini CLI, Cline, OpenCode): algorithm claims are triangulated from official docs, reverse-engineering writeups, and cross-agent comparison tables (S3, S4, S5, S7, S8). Mark their MECHANISM entries accordingly; treat numeric trigger points as build-specific.

---

## 2. Mechanisms (canonical format)

Format key: HARVEST_CLASS in {ADOPT (take as-is), ADAPT (take the shape, change the internals), INSPIRED (steal one idea), DEBUNKED (tested and lost), HOLD (wait for evidence)}. FALSIFICATION states the claim this mechanism kills or the condition under which this mechanism itself dies.

---
### M1. Two-stage auto-compaction (micro-compaction of tool results, then LLM summary)

- **MECHANISM_ID:** M1-TWO-STAGE-AUTOCOMPACT
- **PROBLEM:** Summarizing a whole trajectory in one LLM pass wastes the summary budget on reconstructible content (file reads, test outputs) and starves irreplaceable content (decisions, corrections, rejected approaches).
- **SOURCE:** Claude Code behavior, documented by independent teardown S3 and S5, confirmed in official API docs P1.
- **PINNED_SHA:** fcc336e00e94 (S3 post "Compaction Is State Transfer"), 3ee68efb4f96 (S5 autocompaction deep dive).
- **SOURCE_LOCATION:** `_posts/2026-07-18-CompactionIsStateTransfer.md` (S3); `skills/context-engineering/references/autocompaction.md` (S5); platform.claude.com docs (P1, "Context editing" for tool-result clearing).
- **MATURITY:** Production (Claude Code, closed source; API-level in P1).
- **INVARIANT:** Before any LLM summary runs, deterministically replace large old tool results with cleared-content markers. Classify context by recoverability, not by recency alone.
- **IMPLEMENTATION:** Stage 1: scan for large old tool results (file reads, shell outputs, search/web results, file edits) and replace their bodies with a short marker; originals persist on disk. Stage 2: at trigger (Claude Code: ~83.5% of 200K, i.e. ~167K with a hardcoded 33K buffer reserved for the summary plus next turn, per S5), run one LLM summarization turn with tools blocked over the messages after the latest compact boundary (never re-summarizing an already-compacted summary, per S3). `/compact <focus>` adds a user-supplied focus to the summarizer prompt; persistent compact instructions live in CLAUDE.md (per S3). Claude Code additionally prefilters single oversize bash outputs (>5000 chars) with a separate model call that decides whether to compress, original saved to disk (via S7-report blog-v2 comparison).
- **FAILURE_MODE:** Lossy, and the loss is invisible: exact error messages, variable names, line numbers, rejected alternatives and their rationale, and the *why* behind a choice are the first casualties (S4, S5). Auto-compact is not a compression algorithm; it is a summarization. Users report output quality degrading without visibility into what was discarded (S4, citing Stulberg).
- **PING_EXISTING_ANALOG (best effort):** PING's plain-English digest rebuilt after every sweep is a human-readable Stage 2; there is no deterministic Stage 1 tool-result clearing in the outreach/engine pipeline analogous to micro-compaction.
- **GAP:** The recoverability classification (Reconstructible = keep a pointer; Reproducible = keep the command plus the important result; Irreplaceable = keep the meaning itself, per S3) is exactly the policy PING agents lack when they dump full tool output into reports.
- **HARVEST_CLASS:** ADAPT. The invariant (clear tool results before summarizing; classify by recoverability) ports directly. The exact trigger math is Claude-Code-specific.
- **FALSIFICATION:** Kills "summarize the transcript directly." It is itself falsified by M6 below: if summaries add less than their cost (trajectory elongation, >7% summary cost), the two-stage pipeline can be worse than cheap Stage 1 alone. Fails closed only if Stage 1 markers carry enough identity to re-fetch (a marker that loses the file path is pure information destruction).
- **DEPENDENCIES:** A stable artifact store where cleared tool results can be re-fetched by reference (PING already has files/JSONL; the marker format is the missing piece).
- **CONTEXT_SAVED:** 40-60% in coding trajectories. Reasoning: tool outputs are typically the majority of trajectory tokens, and Stage 1 removes most of them before the LLM summary ever runs, so the summary budget concentrates on the irreplaceable third row.

### M2. Summary as state transfer, not as compression

- **MECHANISM_ID:** M2-SUMMARY-AS-STATE-TRANSFER
- **PROBLEM:** Treating compaction output as "the compressed conversation" misses that the post-compaction context is an assembled state, and only one part of it is the summary.
- **SOURCE:** S3 (ccomkhj, "Compaction Is State Transfer").
- **PINNED_SHA:** fcc336e00e94.
- **SOURCE_LOCATION:** `_posts/2026-07-18-CompactionIsStateTransfer.md`, lines ~L144-205.
- **MATURITY:** Community analysis, convergent with P1's API design (compaction block + kept recent turns + reloaded context).
- **INVARIANT:** New context after compaction = persistent instructions + summary of decisions and progress + state reloaded from source + sometimes a recent verbatim tail. The summary is one ingredient, never the whole meal.
- **IMPLEMENTATION:** After the latest compact boundary: (1) persistent instruction files re-read from disk (CLAUDE.md, AGENTS.md), (2) the LLM summary of decisions/progress, (3) state reloaded from source (branch, diff, task list), (4) optional verbatim tail. Claude Code's `/compact` does not summarize raw history that was already compacted; it starts after the latest compact boundary, so summaries never recursively re-summarize.
- **FAILURE_MODE:** Any one of the four ingredients failing silently produces a subtly broken successor: stale instructions (instruction file changed mid-run), hallucinated summary, reloaded state that does not match what the summary claims, or a tail that contradicts the summary. The S3 author classifies by recovery type precisely because "re-read from source" is the load-bearing step.
- **PING_EXISTING_ANALOG (best effort):** PING's MEMORY.md + daily notes + JSONL events are the raw material, but no single mechanism assembles all four ingredients into one post-restart context. PING's mission-brief handoffs approximate (2) only.
- **GAP:** "Reloaded from source" is the cheapest high-signal ingredient and the one PING workers skip most often: re-reading the canonical file/DB state after a restart instead of trusting a summary's claim about it.
- **HARVEST_CLASS:** ADOPT. Make every worker-restart packet assemble all four slots explicitly; leave a slot empty rather than filling it with guesses.
- **FALSIFICATION:** Kills "one good summary is enough." Dies if source-of-truth reads are expensive or unavailable; then the summary must carry what it cannot re-verify, and its loss budget must widen.
- **DEPENDENCIES:** Canonical source-of-truth reads (PING event log, pipeline JSONL); instruction files kept on disk (PING has AGENTS.md, MEMORY.md).
- **CONTEXT_SAVED:** 0% by itself (it is a completeness discipline, not a compression), but it converts 10-30% of wasted context: workers stop carrying "what the file probably contains" and carry "where to re-read it."

### M3. Server-side compaction API (on-demand, threshold, and client-compact)

- **MECHANISM_ID:** M3-SERVER-COMPACTION-API
- **PROBLEM:** Every agent reimplements summarization plumbing (prompt, loop, history rewrite) slightly wrong; the provider can do it once, correctly, on the server.
- **SOURCE:** Anthropic platform docs (P1).
- **PINNED_SHA:** n/a, live docs read 2026-09-23. Beta headers: `compact-2026-09-04` (on-demand), `compact-2026-01-12` (threshold, per S4).
- **SOURCE_LOCATION:** https://platform.claude.com/docs/en/build-with-claude/compaction (overview page).
- **MATURITY:** Beta (both modes), documented 2026.
- **INVARIANT:** Compaction is a first-class API operation with three flavors; all preserve a word-for-word recent tail; the summary is a first-class block that replaces what came before it.
- **IMPLEMENTATION:** (a) On-demand: app sends a compaction request, gets a server-written summary block, swaps it in as the first message in place of what it summarizes; can run in the background while work continues; app keeps recent turns verbatim with thinking preserved. (b) Threshold: one parameter on ordinary requests; API compacts automatically when input tokens hit the trigger; response continues as usual, the API drops what came before the block (on Fable 5.1/Opus 5.5, thinking blocks in kept turns must be dropped). (c) Client: write your own summarizer; the API only supplies the "compact on the client" pattern. Supporting pages: custom summarization prompts (when the default drops something later turns need), "compact again" for already-compacted conversations, and usage accounting for compaction calls.
- **FAILURE_MODE:** Server-side summary is a black box with no audit trail of what was dropped (custom prompt is the only steering). Threshold mode runs *inside* the request that crosses the threshold, adding latency on the critical path. On-demand background mode needs the swap to be race-free. Codex's variant (M9) goes further with an *encrypted opaque* blob: completely unauditable, a dealbreaker for compliance-sensitive systems (S6/S7 comparison).
- **PING_EXISTING_ANALOG (best effort):** None. PING runs its own summarization in worker prompts (client-compact pattern).
- **GAP:** If PING ever moves summarization to the provider, the "custom summarization prompt" slot is the control surface: the Handoff Contract (section 3) should be expressible as that prompt.
- **HARVEST_CLASS:** INSPIRED. PING is model-agnostic; server compaction ties it to one provider. Harvest the *shape*: background compaction, first-class summary blocks, mandatory verbatim tail, custom prompt as control surface.
- **FALSIFICATION:** Kills "you must hand-roll summarization." It dies for PING on vendor lock-in and auditability: an encrypted opaque summary blob is incompatible with PING's evidence-before-eloquence standard (SOUL.md).
- **DEPENDENCIES:** Provider support; a swap-safe message-history layer.
- **CONTEXT_SAVED:** Same order as M1 (30-50%); the savings are in code you do not write and summarizer prompts you do not maintain, not in tokens.

### M4. Condenser framework: condensers as pure, composable strategies over an event stream

- **MECHANISM_ID:** M4-CONDENSER-FRAMEWORK
- **PROBLEM:** Context-window management is usually one hardcoded strategy; you cannot A/B strategies, and condensation logic tangles with the agent loop.
- **SOURCE:** OpenHands software-agent-sdk (S1), docs (S2), secondary analysis S17.
- **PINNED_SHA:** 5b36cacccc2b (S1); 3d3fc4fe3e4b (S2).
- **SOURCE_LOCATION:** `openhands-sdk/openhands/sdk/context/condenser/README.md` (S1); `openhands/memory/condenser/impl/{llm_summarizing_condenser,structured_summary_condenser,llm_attention_condenser}.py` (older paths, documented in codewiki mirror S18 lineage).
- **MATURITY:** Production (OpenHands default), with a paper: "The OpenHands Software Agent SDK" reports up to 2x per-turn API cost reduction with no benchmark degradation (P5-adjacent, overfitted.cloud).
- **INVARIANT:** The agent's context is a chronological event stream; condensers are stateless pure strategies that map (event stream) to (condensed view). Four shipped strategies: `LLMSummarizingCondenser` (cheap LLM summarizes dropped block into free text), `StructuredSummaryCondenser` (function-calling forces fixed fields, rendered to Markdown), `LLMAttentionCondenser` (model ranks events by importance, keeps top ones, no summary), `RecentEventsCondenser` (keep last N, drop rest), plus `AmortizedCondenser` (verbatim recent + summarized old) and `NoOpCondenser` (debugging).
- **IMPLEMENTATION:** At intervals or on `LLMContextWindowExceedError` (S2 llm-error-handling guide: with a condenser configured, the SDK emits a condensation request instead of raising), the condenser takes the oldest messages (excluding system prompt), sends them to a cheaper model with a summarization prompt, and replaces them with one summary message. Defaults from S17: `keep_first=2` pins initial system/user messages; summaries-of-summaries accumulate across repeated condensations; the tail stays verbatim. Summaries are marked as special event types (`CondensationAction`) so they are distinguishable from real history.
- **FAILURE_MODE:** `LLMAttentionCondenser` is lossy-and-forgetting (silently drops what the model deemed unimportant, no record). Event-count triggers misfire because event count and token length are not linearly related (S1 issue #1172). Condensation destroys the prompt cache, though regular condensation keeps the rebuild cost low (S1 README).
- **PING_EXISTING_ANALOG (best effort):** PING's event log is the same event-stream substrate; PING lacks the strategy layer (no named, swappable condensation strategies, no `NoOp` baseline for measurement).
- **GAP:** PING cannot currently answer "which condensation strategy is active" or A/B two strategies on the same event stream. The `NoOpCondenser` for debugging is the most portable idea in this mechanism: always keep one code path that does nothing, so you can measure what the strategy costs and saves.
- **HARVEST_CLASS:** ADAPT. The framework shape (strategies as pure functions over the event log, special summary event type, cheap-model summarization, pinned head, verbatim tail) ports cleanly to PING's event model. The exact parameter values (max_size, keep_first) are tuning.
- **FALSIFICATION:** Kills "one compaction strategy is enough." Dies on the P2 finding below: if the summarizer strategy elongates trajectories, the framework needs a cost accountant, not just a strategy registry.
- **DEPENDENCIES:** Full event log retained regardless of condensation (PING has this); token-usage signal per turn to drive triggers (PING partial).
- **CONTEXT_SAVED:** Reported up to 2x per-turn API cost reduction (OpenHands, S1 README). Net savings depend on strategy; masking variants (M6) match this at lower cost.
### M5. Condensation recorded as an event (auditability of loss)

- **MECHANISM_ID:** M5-CONDENSATION-AS-EVENT
- **PROBLEM:** Once a summary replaces history, nobody can answer "what did we lose, and when?" Compaction becomes un-auditable.
- **SOURCE:** OpenHands (S1, S2, P5-paper).
- **PINNED_SHA:** 5b36cacccc2b (S1).
- **SOURCE_LOCATION:** condenser README (S1); the Overfitted paper P5-adjacent description: "The results of any given condensation are stored in the event log as a CondensationEvent. Before sending the event history to the LLM, the agent applies these condensation events by removing forgotten events and inserting summaries."
- **INVARIANT:** The event log is never rewritten. Condensation appends a `CondensationEvent`/`CondensationAction` that references forgotten event ID ranges plus the summary text. The condensed *view* is a projection; the *log* is append-only.
- **IMPLEMENTATION:** `LLMSummarizingCondenser` emits "a range of forgotten event IDs + a text summary"; `StructuredSummaryCondenser` emits "forgotten event IDs + rendered Markdown"; `LLMAttentionCondenser` emits "forgotten event IDs, no summary." Condensers stay stateless because all state lives in the log. A `CondensationRequest` event can be injected by the agent, the user, or the error path.
- **FAILURE_MODE:** Forgotten events are still gone from the working context; the event record only proves *that* they were forgotten, it does not restore them (unless the full log is separately persisted, which OpenHands does but a thin client might not). `LLMAttentionCondenser` leaves no summary at all, so the record is just a tombstone list.
- **PING_EXISTING_ANALOG (best effort):** Direct analog: PING's event log is append-only; a PING "compaction" should be a typed event (e.g. OBSERVATION_COMPACTED) carrying forgotten-ID ranges and the summary, never a rewrite of history. This matches PING's "never duplicate the event system" continuity guardrail.
- **GAP:** PING has no typed compaction event; compaction-like summaries currently live in free-form digest text, which is not machine-queryable for "what was forgotten."
- **HARVEST_CLASS:** ADOPT. This is the cheapest high-value harvest in the lane: a schema, not a system.
- **FALSIFICATION:** Kills "rewrite the history in place." Dies if the log itself is the memory bottleneck; then you need log archival tiers (M10), not just tombstones.
- **DEPENDENCIES:** Append-only event log (PING has); event IDs stable across condensation (PING has via JSONL).
- **CONTEXT_SAVED:** 0% tokens directly. Saves 100% of the audit question "what did compaction drop?" which today is unanswerable.

### M6. Observation masking (cheap deterministic forgetting beats smart forgetting)

- **MECHANISM_ID:** M6-OBSERVATION-MASKING
- **PROBLEM:** LLM summarization is expensive, slow, and (per P2) can actively harm efficiency by masking the failure signals that would make an agent stop.
- **SOURCE:** "The Complexity Trap" (P2, arXiv 2508.21433; JetBrains Research, 500 SWE-bench instances); implemented in SWE-agent; recommended as primary defense in S9.
- **PINNED_SHA:** n/a for the paper (arXiv ID 2508.21433); S9 netclaw-dev/netclaw at 69c5e0f1f697 records the recommendation.
- **SOURCE_LOCATION:** P2 sections on trajectory elongation (Figure 4) and cost; S9 `docs/research/context-management-patterns.md` L171-192.
- **MATURITY:** Research-validated (NeurIPS 2025 track), operationalized in SWE-agent.
- **INVARIANT:** Replace old tool *outputs* with placeholders while keeping the reasoning/action history (the tool calls themselves, what was attempted, in what order). Mask by rule, not by judgment.
- **IMPLEMENTATION:** SWE-agent's Observation Masking uses a rolling window (M=10 tail turns kept in the paper's main experiments) and replaces older observations with a mask. Deterministic, no LLM call. Result (P2): matched or beat LLM summarization in 4 of 5 settings; both achieve >50% cost reduction vs unmanaged contexts; LLM-Summary caused 13-15% longer trajectories ("trajectory elongation": summaries act as a reinforcing signal that encourages the agent to keep going, masking failure signals that would prompt earlier termination); summary generation itself consumed >7% of total costs.
- **FAILURE_MODE:** Masking is still lossy: the exact content of old observations is gone, so a detail that becomes relevant later (a path seen in passing) cannot be recovered except by re-running the command. Rolling windows keyed on turn count misfire on heterogeneous turn sizes. Dies on tasks where old observations carry irreplaceable one-time evidence (rare in coding, common in web research).
- **PING_EXISTING_ANALOG (best effort):** Partial: PING workers already drop old tool output in reports by convention, but there is no deterministic masking policy with a measured window.
- **GAP:** The falsification itself is the gap-filler: PING should measure, not assume, that its summarization earns its keep. The paper's experimental setup (same windows for masking and summarization, cost measured end-to-end including summary generation and trajectory length) is directly portable as a PING evaluation protocol.
- **HARVEST_CLASS:** ADAPT. Adopt the policy shape (mask observations older than N turns, keep the action/reasoning skeleton) and, more importantly, adopt the *evaluation*: any summarizer must beat the masking baseline on total cost-to-outcome, not on per-turn token count.
- **FALSIFICATION:** Kills "LLM summarization is the best default" and "summarization always reduces cost." It is itself falsified on tasks where old observations are one-shot evidence; PING missions include such tasks (prospect research), so masking needs an exception list (evidence-graded findings must survive, per Nolan's operating principles).
- **DEPENDENCIES:** Turn/token accounting; a mask marker format; re-runnable tools (so masked observations are reproducible).
- **CONTEXT_SAVED:** >50% cost reduction vs unmanaged (P2). The provocative part: most of the LLM-summarizer's savings are captured by a regex.

### M7. Head-plus-tail truncation with a byte-counted elision marker

- **MECHANISM_ID:** M7-HEAD-TAIL-ELISION
- **PROBLEM:** A single noisy command (a 100KB test dump) blows the context window and distracts the model; naive truncation hides how much was cut and where.
- **SOURCE:** SWE-agent proposal (result 0 in SWE-agent search; repo issue text), S18 lineage.
- **PINNED_SHA:** 1428696b63bd (S18, d-sorganization/maxwell-daemon, the SWE-agent-adjacent fork carrying the issue text).
- **SOURCE_LOCATION:** issue "Truncate large bash observations to keep agents within context budget" (acceptance criteria block).
- **MATURITY:** Design-stage acceptance criteria (high quality as a spec).
- **INVARIANT:** Truncate deterministically at insertion time; the on-disk trajectory keeps the full output; the model sees head + tail joined by a stable elision marker that states exactly how many bytes and lines were omitted.
- **IMPLEMENTATION:** Config `observation_max_bytes` (default 16384) and `observation_head_ratio` (default 0.5); stdout/stderr truncated independently; marker like `... [truncated 47213 bytes, 412 lines elided] ...`; trajectory step gains `observation_truncated` flag plus `bytes_omitted` counts; `--observation-max-bytes 0` disables; marker text is stable (no timestamps) so trajectory diffs stay meaningful; `bench inspect` shows both the as-sent view and the full on-disk view.
- **FAILURE_MODE:** Head+tail assumes the signal is at the edges; stack traces and test failures often are, but not always (a failure buried mid-log is invisible). 16KB default is arbitrary and task-dependent. Still no substitute for structured extraction of the one failing assertion.
- **PING_EXISTING_ANALOG (best effort):** None formal; workers eyeball-truncate long outputs ad hoc.
- **GAP:** The elision-marker-with-counts convention plus the dual-view (as-sent vs on-disk) is directly portable to PING tool-call logging.
- **HARVEST_CLASS:** ADAPT. The marker format and the on-disk-full / in-context-truncated split port directly. Defaults need PING tuning.
- **FALSIFICATION:** Kills "truncate silently." Dies if tools cannot reproduce their output (then the on-disk copy is the only record and must be referenced, not just stored).
- **DEPENDENCIES:** Trajectory/event log with per-step fields (PING has); byte-level output capture (PING has via exec logs).
- **CONTEXT_SAVED:** Bounded per-call: any single observation can never exceed its cap. In noisy missions this converts unbounded blowups into a fixed 16KB ceiling per call, typically 60-90% of the worst single-call tokens.

### M8. RL-trained in-place self-summarization (Cursor)

- **MECHANISM_ID:** M8-RL-SELF-COMPACTION
- **PROBLEM:** Prompt-based summarization is a one-shot guess at what matters; and the compact call itself costs a full conversation prefill, destroying the KV cache.
- **SOURCE:** Cursor approach, via comparison tables S7 (bootloader.live) and S6 (marim-harness); mechanism writeup at blog-v2 (search result 4).
- **PINNED_SHA:** 7c962edc1a77 (S7); S6 SHA unavailable.
- **SOURCE_LOCATION:** S7 `posts/context-window-compacting/blog.md` comparison table; blog-v2-peach.vercel.app "Agent Context Compaction" (KV-cache analysis).
- **MATURITY:** Production (Cursor), mechanism partially reverse-engineered; RL-training claim is vendor-adjacent (50% error reduction claimed in S6; treat as vendor-reported, not independently verified).
- **INVARIANT:** Train the summarizer (RL) rather than prompt it; decode the summary directly on the existing conversation's KV cache so the compact call itself needs no prefill; keep the summary tight (~1K tokens in S6's table).
- **IMPLEMENTATION:** Near-capacity trigger; RL-trained self-summary; "history-as-files" (S6) alongside the summary; continuation in the same session. The KV-cache point is architectural: Claude Code/Codex compact calls use a fresh system prompt and pass history as content, costing a full prefill; Cursor decodes on the live cache, eliminating even that prefill. Post-compaction, normal requests still benefit from provider prompt caching on the shared system-prefix.
- **FAILURE_MODE:** RL-trained summarizers are opaque about their loss profile; a ~1K summary is extremely aggressive and its error modes are not public. Training cost is borne by the vendor; PING cannot replicate the RL part, only the KV-cache part. Vendor-reported 50% error reduction has no independent replication found in this research pass.
- **PING_EXISTING_ANALOG (best effort):** None.
- **GAP:** Two portable ideas: (1) compact *on the live context* (stream the summary as a continuation, then truncate) instead of a fresh summarization call; (2) measure summarizer quality by downstream error rate, not by summary aesthetics.
- **HARVEST_CLASS:** INSPIRED. The RL part is not harvestable; the KV-cache-aware compaction shape and the "evaluate the summarizer on downstream errors" discipline are.
- **FALSIFICATION:** Kills "summarization quality is a prompt-engineering problem." It dies on auditability: an RL summarizer's loss profile is unknowable without vendor transparency, which conflicts with PING's evidence standard.
- **DEPENDENCIES:** Provider KV-cache behavior (PING does not control); a downstream-error evaluation harness (PING partial, via mission outcomes).
- **CONTEXT_SAVED:** The ~1K summary target is 1-2 orders of magnitude smaller than typical prompt-based summaries; if the error claim holds, this is the highest compression ratio in the lane. Treat the ratio as claimed, not proven.

### M9. Hybrid summary-plus-recency (Codex checkpoint pattern)

- **MECHANISM_ID:** M9-CHECKPOINT-SUMMARY-PLUS-RECENCY
- **PROBLEM:** Pure-summary compaction ("replace everything") destroys immediate working context: the last few turns are where the agent's short-term intent lives.
- **SOURCE:** Codex CLI behavior, via S6/S7 comparisons and S14 (opengeni PR #235 reimplements Codex parity client-side, which documents the algorithm precisely).
- **PINNED_SHA:** ed5402a00668 (S14, PR "codex-parity client compaction").
- **SOURCE_LOCATION:** S14 PR body: one threshold (`0.9 x (window - reserved output - 20k)`), provider usage as the signal (char/4 estimate before first call), rebuild of active history as **retained user messages + one checkpoint summary**; assistant/tool/reasoning rows superseded to the audit trail only; Codex's checkpoint prompt and summary prefix used verbatim with a fixed `SUMMARY_BUFFER_TOKENS` output cap; per-model-call checks throw `CompactionNeededError` when crossed; unified recovery for provider overflow (force compact, single in-activity retry, or preempt with `reason: "context_compacted"`).
- **INVARIANT:** Post-compaction history = retained user messages + one checkpoint summary. Never summary alone, never raw alone.
- **IMPLEMENTATION:** Trigger at 90% of (window minus reserved output minus 20K). On trigger, mid-turn checks per model call raise `CompactionNeededError`; the turn's recovery unifies compaction with provider overflow handling. The retained user messages are the verbatim intent trail; the summary covers everything else. S6's table: Codex keeps ~20K recent user tokens alongside the summary, and calls summary+recency "strictly better than Claude Code's replace everything" for working context.
- **FAILURE_MODE:** The retained set is *user messages*, not assistant reasoning; if the agent's key state lived in its own reasoning blocks, it is summarized away. Mid-turn compaction preempts the active turn (`reason: "context_compacted"`), which can strand half-finished tool sequences. OpenAI's server-side Codex path uses an encrypted opaque blob (S6/S7): fast but unauditable.
- **PING_EXISTING_ANALOG (best effort):** PING's mission briefs approximate "retained user messages" (the original task text); the checkpoint-summary half is ad hoc.
- **GAP:** The precise rebuild rule (verbatim intent trail + one summary, nothing else) is a cleaner contract than PING's current ad hoc handoffs.
- **HARVEST_CLASS:** ADAPT. Adopt the rebuild rule and the mid-turn `CompactionNeededError` pattern (typed preemption, not silent truncation). Reject the encrypted-opaque server path on auditability grounds.
- **FALSIFICATION:** Kills "summary-only compaction." Dies where assistant reasoning (not user messages) carries the working state; then the retained set must include the agent's own recent reasoning blocks (M3's preserved-thinking option covers this).
- **DEPENDENCIES:** Typed error/preemption path in the agent loop; usage accounting per call.
- **CONTEXT_SAVED:** Same family as M1 (40-60%), with better working-context retention per token than pure summary; the 20K recent-token floor is the price.
### M10. Staged pressure thresholds (adaptive, not one cliff)

- **MECHANISM_ID:** M10-STAGED-PRESSURE
- **PROBLEM:** A single compaction cliff (e.g. 95%) means the system does nothing until it does the most expensive thing; cheap defenses never get a chance.
- **SOURCE:** S11 (soltero-skills agent playbook, citing OpenDev arXiv 2603.05344); convergent with S9 (netclaw tiered approach) and Anthropic's own hierarchy.
- **PINNED_SHA:** c4ea4e444144 (S11); 69c5e0f1f697 (S9).
- **SOURCE_LOCATION:** S11 playbook.md "Make context compaction adaptive/progressive with staged pressure thresholds"; S9 L188-192.
- **MATURITY:** Reported (OpenDev: ~54% lower peak consumption), pattern-level.
- **INVARIANT:** Apply increasingly aggressive, cheaper-first measures as token pressure rises: warn >0.70, mask old observations >0.80, prune >0.85, full summarize >0.99; calibrated against the API's reported prompt_tokens. Anthropic's recommended hierarchy (S9): (1) tool result clearing (cheapest, reversible), (2) compaction/summarization (lossy but structured), (3) structured note-taking (external memory), (4) sub-agent isolation (each gets own context window).
- **IMPLEMENTATION:** Netclaw's recommendation (S9): Phase 1 clears old tool results (keep tool call name + "result cleared" placeholder); Phase 2, if still over threshold, runs structured summarization. OpenDev's staged version reports ~54% lower peak consumption. The ordering is cost-ordered: each stage is tried only if the cheaper one did not relieve pressure.
- **FAILURE_MODE:** Thresholds are model- and task-specific; miscalibrated stages thrash (summarize, then immediately mask, then summarize again). "Structured note-taking" as a pressure response can become unbounded writing. The hierarchy assumes tool results are the bulk; on reasoning-heavy trajectories the stages misfire.
- **PING_EXISTING_ANALOG (best effort):** PING has the safety-tripwire pattern (drop volume on warning) but no staged context-pressure ladder.
- **GAP:** PING's context defense is currently binary (full context or manual intervention). The four-rung ladder with the "cheapest reversible first" ordering is the harvest.
- **HARVEST_CLASS:** ADOPT. The ladder is cheap to implement and composes with M1 (Stage 1 = rung 1), M6 (rung 2a), M2/M4 (rung 2b), M12 (rung 3), M11 (rung 4).
- **FALSIFICATION:** Kills "one trigger, one strategy." Dies if pressure measurement is unreliable (the PING equivalent of S1 issue #1172: if you cannot trust your token accounting, staged thresholds fire at the wrong times).
- **DEPENDENCIES:** Trustworthy per-turn token accounting (the load-bearing dependency of the whole lane).
- **CONTEXT_SAVED:** ~54% lower peak consumption (OpenDev, reported). More importantly, it converts average cost: most sessions never reach the expensive rungs.

### M11. Sub-agent isolation (fresh context windows as the unit of scale)

- **MECHANISM_ID:** M11-SUBAGENT-ISOLATION
- **PROBLEM:** One context window cannot hold a multi-day mission; compaction degrades quality, and the supervisor that accumulates all workers' context saturates.
- **SOURCE:** Universal pattern; tabulated in S6/S7 (Claude Code Task tool no-recursion; Cursor built-in + tree, 1 level; Codex manual max 6 threads depth 1); failure analysis in S16-derived skill (benjaminastera, "supervisor bottleneck"); Anthropic multi-agent research system notes (via S16).
- **PINNED_SHA:** 9502703bee75 (S16, marius-manola handoff posts citing Anthropic); 7c962edc1a77 (S7).
- **SOURCE_LOCATION:** S7 comparison table "Sub-agents" row; S16 `replay-failed-multi-agent-workflow.mdx` (supervisor bottleneck, divergence, error propagation mitigations).
- **MATURITY:** Production standard ("Sub-agent isolation is standard," S6).
- **INVARIANT:** Fan out bounded sub-contexts for parallel or long-running work; the supervisor receives only distilled summaries under an output schema, never raw worker transcripts; checkpoint the supervisor's state without carrying full history.
- **IMPLEMENTATION:** Claude Code: Task tool spawns subagents (no recursion by default). Cursor: built-in + custom + cloud agents in a tree, 1 level. Codex: manual, max 6 threads, depth 1. S16's mitigations: output schema constraints on worker returns (distilled summaries only), supervisor checkpointing, convergence checks against shared goals, TTLs on agent execution, validation of worker outputs before downstream consumption (error propagation), circuit breakers with retry.
- **FAILURE_MODE:** Supervisor bottleneck (accumulates all workers' context, saturates anyway); coordination overhead can negate parallelization gains; divergence (workers drift without central coordination); error propagation (one worker's bad output poisons downstream workers). Anthropic's own report: the multi-agent research system used substantially more tokens and was a poor fit for highly dependent work.
- **PING_EXISTING_ANALOG (best effort):** Direct analog: PING's subagent pattern (this very lane structure) with final-report handoffs; the parent receives distilled reports, not transcripts. The missing piece is the output-schema constraint (reports are free-form) and supervisor checkpointing.
- **GAP:** PING subagent handoffs are prose; there is no schema constraining what a worker may return, which lets transcripts' worth of detail leak upward. S16's "distilled summaries only, schema-constrained" is the fix.
- **HARVEST_CLASS:** ADAPT. Keep the fan-out; add the schema and the supervisor checkpoint.
- **FALSIFICATION:** Kills "give every worker the full mission context." Dies on highly dependent work (Anthropic's finding): when subtasks are tightly coupled, isolation costs more than it saves; then keep one context and pay for it.
- **DEPENDENCIES:** A handoff schema (section 3); supervisor-side state store.
- **CONTEXT_SAVED:** Supervisor context grows with (workers x summary size) instead of (workers x transcript size): typically 80-95% of worker tokens never reach the supervisor. The workers' own windows are the real savings: each gets a fresh full window.

### M12. Three-tier working/archival memory with agent-managed paging (MemGPT/Letta)

- **MECHANISM_ID:** M12-TIERED-AGENT-MEMORY
- **PROBLEM:** Retrieval-centric systems decide from outside what enters context; the agent is a passive recipient and cannot curate its own working set.
- **SOURCE:** MemGPT (Packer et al., ICLR 2024) / Letta; deep dives S13 (adamcelove) and S12 (bilinc, SHA unavailable); SOTA briefing S15-lineage (parcha-ai recall doc, SHA unavailable, content via snippet).
- **PINNED_SHA:** 7205af14724d (S13).
- **SOURCE_LOCATION:** S13 `entities/ai-memory/memgpt-letta.md`; S12 `research/findings/architectures/memgpt-letta.md`.
- **MATURITY:** Production (Letta claims 1M+ stateful agents; #1 open-source agent platform on Terminal-Bench per S4-search snippet; treat vendor-adjacent claims as reported).
- **INVARIANT:** Context window = RAM, external stores = disk, tool calls = syscalls. Three tiers: Core Memory (always in context: persona + human/user blocks + custom blocks, fixed size, agent-editable), Recall Memory (searchable conversation history), Archival Memory (unlimited, vector-indexed). The *agent itself* pages between tiers via function calls.
- **IMPLEMENTATION:** Self-editing tools: `core_memory_append`, `core_memory_replace`, `archival_memory_insert`, `archival_memory_search`, `conversation_search`. Memory pressure / context overflow evicts to external tables; retrieval pages back on demand. Later additions: "sleep-time compute" (async agent rewrites memory off the critical path; Letta blog) and Context Repositories (git-based versioning of agent memory: commit history, branching, rollback; Feb 2026 per S4-snippet). Letta's Aug 2025 benchmark claim: a plain agent with filesystem tools (grep/open/search) scored 74.0% on LoCoMo with GPT-4o-mini, above Mem0's 68.5%: their conclusion is that tool-use competence beats retrieval-mechanism cleverness.
- **FAILURE_MODE:** The agent can mismanage its own memory (never evict, evict the wrong thing, write junk to core memory); archival retrieval is only as good as the embeddings and the agent's queries; self-editing adds tool-call overhead to every session. Git-versioned memory adds storage and merge complexity.
- **PING_EXISTING_ANALOG (best effort):** Strong partial analog: PING's MEMORY.md + daily notes + memory_search/memory_get ≈ core + recall; the vector/event substrate ≈ archival. Missing: the agent *self-editing* its working set via tools (PING memory is curated by the main agent with human-in-the-loop conventions, not paged by workers), and the explicit fixed-size core budget.
- **GAP:** PING has no fixed budget for "always-in-context" memory and no paging discipline; injected context grows by accretion (this lane's own task description carries a huge standing-context block, which is the problem statement in miniature).
- **HARVEST_CLASS:** ADAPT. Adopt the tier discipline and the fixed core-memory budget; adapt the paging to PING's evidence-graded style (writes to core memory should carry provenance, not just agent whim).
- **FALSIFICATION:** Kills "static retrieval pipelines are enough." It is falsified by its own benchmark footnote: if plain filesystem tools beat the fancy memory system, the harvest is *tool-use competence for memory management*, not the three-tier ontology. Dies for PING if agent self-edits cannot be audited (SOUL.md evidence standard).
- **DEPENDENCIES:** Tool-calling model; vector store for archival; a memory-write audit trail.
- **CONTEXT_SAVED:** Core memory is fixed at a few KB by construction: everything else is pay-per-retrieval. Versus "inject all standing context every turn" (PING's current posture), this is 70-90% of injected tokens in long missions. The savings are structural, not per-call.

### M13. Write-time fact extraction (Mem0) and bi-temporal invalidation (Zep/Graphiti)

- **MECHANISM_ID:** M13-FACT-EXTRACTION-AND-INVALIDATION
- **PROBLEM:** Storing raw transcripts as "memory" means retrieval returns stale, contradictory, bloated text; nothing knows a fact was superseded.
- **SOURCE:** Mem0 (arXiv 2504.19413; claims via S15-snippet: 26% relative LLM-judge improvement over OpenAI memory on LoCoMo, 91% lower p95 latency, >90% token savings vs full-context; graph variant +~2%); Zep/Graphiti (arXiv 2501.13956; bi-temporal knowledge graph).
- **PINNED_SHA:** n/a (papers); S15-lineage SHA unavailable; claims via search snippet from parcha-ai SOTA doc.
- **SOURCE_LOCATION:** arXiv 2504.19413 (Mem0); arXiv 2501.13956 (Zep).
- **MATURITY:** Production services; benchmarks are vendor-reported and contested (Zep's rebuttal: LoCoMo is only 16-26k tokens, a full-context baseline scores ~73% beating Mem0's 68.5%; Mem0's 2026 numbers use different judges/models; not comparable).
- **INVARIANT:** (a) At write time, extract atomic facts from interactions and consolidate with add/update/delete, so memory stores *claims*, not transcripts. (b) Never delete on update: new facts *invalidate* old edges with bi-temporal stamps (`valid_at`/`invalid_at` for world time, `created_at`/`expired_at` for transaction time). Staleness is then a query, not a guess.
- **IMPLEMENTATION:** Mem0: every interaction runs fact extraction; the store holds structured memory objects; retrieval is semantic search plus graph lookups. Zep: every edge carries both times; a superseding fact sets `invalid_at` on the old edge instead of deleting it, preserving the full history of what was believed when.
- **FAILURE_MODE:** Fact extraction is itself an LLM call with its own error rate; bad extractions poison the store with confident false facts. Bi-temporal graphs grow monotonically; "never delete" needs a compaction story of its own. Benchmark warfare (above) means the headline numbers should not drive the decision.
- **PING_EXISTING_ANALOG (best effort):** PING's memory claims (the `claim:` lines, memory_search with replaced/superseded tracking, `muse.memory_explain` showing what replaced what) are a hand-rolled version of exactly this: PING already does add/update/delete consolidation with provenance. Bi-temporal invalidation is the gap: PING tracks replacement chains, not valid-time windows.
- **GAP:** The stale-context detection question ("how do you know your context is outdated?") gets its only principled answer in this lane from bi-temporal edges: a fact is stale iff `now > invalid_at` or a newer edge contradicts it. PING's digest text cannot answer that query.
- **HARVEST_CLASS:** ADAPT. PING's claim system is the right substrate; add valid-time/invalidation semantics to memory claims so staleness is queryable. Treat the benchmark numbers as marketing; the *mechanism* is the harvest.
- **FALSIFICATION:** Kills "store transcripts and retrieve by similarity" and "delete on update." Dies if extraction quality is poor: a fact store with 80% extraction precision is worse than a transcript with good search, because the errors are invisible and confident.
- **DEPENDENCIES:** A claim/fact store with provenance (PING has the skeleton); an extraction pass (PING does this by hand in main-agent curation).
- **CONTEXT_SAVED:** >90% token savings vs full-context retrieval claimed (Mem0); realistically 50-80% for PING's use, because atomic facts are 1-2 orders of magnitude smaller than the transcripts they replace, and invalidation prevents re-injecting contradicted facts (which is pure waste).

### M14. Structured extraction as the summary format (not free text)

- **MECHANISM_ID:** M14-STRUCTURED-SUMMARY
- **PROBLEM:** Free-text summaries are unqueryable: you cannot ask "which files were modified" or "what is still failing" without re-reading the whole summary and hoping the summarizer mentioned it.
- **SOURCE:** OpenHands `StructuredSummaryCondenser` (S1/S18): function-calling forces fixed fields, rendered to Markdown; Anthropic `/insights` facets (S4: goal categories, satisfaction, friction extracted with Haiku at session start); S3's recovery-type classification.
- **PINNED_SHA:** 5b36cacccc2b (S1); 3ee68efb4f96 (S5, citing /insights).
- **SOURCE_LOCATION:** S1 condenser README ("force the model to fill in a fixed set of fields via function calling" -> "a rendered Markdown summary"); S4 L98-107.
- **MATURITY:** Production (OpenHands); product feature (/insights).
- **INVARIANT:** The summarizer fills a fixed schema (goals, files modified, failing tests, decisions, open questions, remaining work), not a blank page. The schema is the contract between the summarizer and every future reader.
- **IMPLEMENTATION:** `StructuredSummaryCondenser` uses function calling with a `StateSummary` schema; the result renders to Markdown with fixed sections. `/insights` extracts facets (goal categories, satisfaction, friction) across up to 50 sessions with Haiku, generating CLAUDE.md additions and usage suggestions. S3's three recovery types (Reconstructible/Reproducible/Irreplaceable) are a schema for *what to preserve*, which is the same idea one level up.
- **FAILURE_MODE:** The schema is a bet on what future readers need; fields not in the schema are dropped by construction. Schema drift across versions breaks comparability. Function-calling extraction adds a structured-output failure mode (invalid enums, empty required fields).
- **PING_EXISTING_ANALOG (best effort):** PING's digest format is free text; subagent final reports are free text. The lane's own canonical mechanism format is the closest thing to a fixed schema in the ecosystem, and it exists only for these challenge reports.
- **GAP:** Every PING summary (digests, handoffs, final reports) should be schema-constrained; the schema for worker handoffs is specified in section 3 of this report.
- **HARVEST_CLASS:** ADOPT. Fixed schemas for all machine-read summaries; free text only for human-facing narrative.
- **FALSIFICATION:** Kills "a good prompt is enough for a good summary." Dies if the schema is wrong: a bad schema loses more than free text, because the loss is systematic and invisible. Mitigation: version the schema and keep one free-text "anything else the next reader must know" field (a pressure valve).
- **DEPENDENCIES:** A schema registry with versions (new for PING); structured-output-capable models (PING has).
- **CONTEXT_SAVED:** 0% tokens directly; saves *reader* tokens: a fixed schema lets a successor read only the fields it needs (selective field reads ≈ 50-80% of a full-summary read for task-local needs). This is the task-local retrieval mechanism for summaries.

### M15. Sleep-time compute (memory maintenance off the critical path)

- **MECHANISM_ID:** M15-SLEEP-TIME-COMPUTE
- **PROBLEM:** Memory rewriting (consolidation, dedup, re-summarization) done inline steals context and latency from the task the agent is actually doing.
- **SOURCE:** Letta "sleep-time compute" (letta.com/blog/sleep-time-compute, via S15-snippet); convergent with S16's "ambient continuity" (state file maintained passively, handoff skill v2.1.0).
- **PINNED_SHA:** n/a (vendor blog); S15 cd9623ce5135 covers the ambient-continuity variant.
- **SOURCE_LOCATION:** Letta sleep-time compute blog; S15 `skills/agent-handoff/SKILL.md` (Ambient Continuity mode: live state file probed on every workspace entry, checkpoints on milestone/decision/correction/abandonment).
- **MATURITY:** Product feature (Letta); community skill (S15).
- **INVARIANT:** Memory maintenance runs asynchronously, outside the task's context window and off its latency budget. The task thread never pays for consolidation.
- **IMPLEMENTATION:** An async agent rewrites memory (re-summarize, dedupe, extract facts) while the primary agent is idle or between turns. S15's ambient mode: a live state file is maintained passively and probed on every workspace entry, so continuity survives abrupt endings with no explicit handoff request; checkpoints fire on milestones, decisions, corrections, and abandonments.
- **FAILURE_MODE:** Async rewrites race with live state (the primary agent acts on a fact the sleeper just invalidated, or vice versa). A passively maintained state file rots if the checkpoint triggers miss (no milestone fired, no write happened). Debugging "what did the sleeper change and why" needs its own audit trail.
- **PING_EXISTING_ANALOG (best effort):** PING's cron-driven digests, memory curation, and the nightly alignment synthesis are sleep-time compute in spirit; they run on schedules, not on memory-pressure signals.
- **GAP:** PING's maintenance is schedule-driven, not event-driven: nothing rewrites a worker's working memory when pressure rises, only when the clock says so.
- **HARVEST_CLASS:** ADAPT. Keep the cron layer; add pressure-triggered async consolidation (M10's rungs 2b/3 running in a side thread with a merge protocol).
- **FALSIFICATION:** Kills "do memory maintenance inline." Dies on race conditions: without a merge protocol (last-writer-wins is not one), async maintenance corrupts faster than it consolidates.
- **DEPENDENCIES:** A merge/conflict protocol for memory writes; an audit trail of sleeper actions.
- **CONTEXT_SAVED:** Removes the consolidation tax from the task window: typically 5-15% of task tokens today (the "let me summarize where we are" turns), plus the latency win.

### M16. Dependency context: what does this task actually need to know

- **MECHANISM_ID:** M16-DEPENDENCY-CONTEXT
- **PROBLEM:** Agents inject everything reachable (full repo, full history, full standing context) instead of everything *needed*; most injected context is never attended to.
- **SOURCE:** SWE-Pruner (P4, arXiv 2601.16746): line-level, query-conditioned pruning at the agent-environment boundary, 23-38% token reduction on SWE-Bench with +1.2-1.4pp success; Aider repo map (S6/S7): PageRank-ranked symbol map as static structural context; Cursor "dynamic discovery" (S6/S7).
- **PINNED_SHA:** n/a (paper); 7c962edc1a77 (S7, repo-map row).
- **SOURCE_LOCATION:** P4 (SWE-Pruner abstract/conclusion); S7 comparison table "Memory" row (Aider: "Repo map (PageRank)").
- **MATURITY:** Research (SWE-Pruner) + production (Aider repo map, Cursor dynamic discovery).
- **INVARIANT:** Context assembly is a function of (task, query), not of (everything available). Prune at the boundary where environment content enters the agent: keep lines relevant to the query, drop the rest, with structure-preserving compression.
- **IMPLEMENTATION:** SWE-Pruner: lightweight binary classifiers trained on synthetic code-question pairs decide line relevance conditioned on the query; adaptive thresholding; sits as middleware between agent and environment, orthogonal to history managers. Aider: static repo map of ranked symbols always in context (cheap, structural, no retrieval latency). Cursor: dynamic discovery via semantic index (helps, but adds vector-DB complexity and latency, per S6's "hyped/overrated" note).
- **FAILURE_MODE:** Classifier-based pruning has a relevance-error rate; pruned-away lines are invisible to the agent (worse than masked, which at least marks the absence). Repo maps go stale as code changes. Dynamic discovery adds infrastructure and latency that can exceed the savings.
- **PING_EXISTING_ANALOG (best effort):** PING injects large standing-context blocks into every subagent task (the task prompt at the top of this very assignment is the exhibit). There is no per-task dependency analysis: every worker gets the full liturgy regardless of what its lane needs.
- **GAP:** This is PING's largest structural waste: standing context is injected, not depended-upon. A per-lane/per-task context manifest (this task needs: X, Y; explicitly not Z) would cut worker prompts by more than any summarizer.
- **HARVEST_CLASS:** ADOPT the discipline (context manifests per task), ADAPT the machinery (PING's tasks are prose, not code lines; the "classifier" is a task-to-context-section mapping, maintainable by hand at PING's scale).
- **FALSIFICATION:** Kills "inject everything, the model will attend to what matters" (P3, Lost in the Middle, says it will not: middle-position accuracy degrades). Dies if the dependency analysis is wrong: under-injection causes failures that are hard to distinguish from model incompetence. Mitigation: the worker can request missing context by section (the M12 paging analog), and every such request is logged as a manifest miss to improve the mapping.
- **DEPENDENCIES:** A sectioned standing-context store (PING's injected files are already sectioned; the manifest format is the missing piece); a miss-logging loop.
- **CONTEXT_SAVED:** 50-80% of *injected* tokens per worker. Reasoning: the standing blocks (AGENTS.md excerpt alone is ~90K chars in this task) dominate worker prompts; most lanes need <20% of the sections. This is the single largest estimated saving in the lane, and it requires no model calls at all.

### M17. Stale-context detection (how you know your context is outdated)

- **MECHANISM_ID:** M17-STALE-CONTEXT-DETECTION
- **PROBLEM:** No summarizer or retriever can tell you its output is stale; staleness is discovered via failure (the agent acts on dead facts).
- **SOURCE:** Zep/Graphiti bi-temporal invalidation (M13, arXiv 2501.13956); S16 handoff failure-state "Stale" (evidence or authorization expired -> re-read the source or obtain fresh approval); OpenHands `keep_first` + summaries-of-summaries (staleness compounds across condensations); S3 "reload from source."
- **PINNED_SHA:** 9502703bee75 (S16); 5b36cacccc2b (S1); fcc336e00e94 (S3).
- **SOURCE_LOCATION:** S16 `design-multi-agent-handoffs.mdx` (Stale row); S1 condenser README (summaries-of-summaries); S3 (state reloaded from source).
- **MATURITY:** Pattern-level; no system in this survey does it end-to-end.
- **INVARIANT:** Staleness must be *represented*, not inferred: every context item that can go stale carries (source pointer, observed-at time, validity condition or expiry). The four detection mechanisms found: (1) bi-temporal invalidation (M13): a fact is stale iff now > invalid_at or a contradicting edge exists; (2) typed Stale state in handoffs (S16): evidence/authorization carries expiry, and the receiver's safe action is re-read or re-approval; (3) reload-from-source (S3): post-compaction state is re-read, never trusted from the summary; (4) compaction tombstones (M5): forgotten-ID ranges let a successor ask "was the thing I need in the forgotten range?"
- **IMPLEMENTATION:** Tag injected facts with source + timestamp + TTL where applicable (authorizations always; prices/availability always; "current" anything always). On handoff, the Stale check is mechanical: expired -> re-read. On compaction, prefer re-reading source over summarizing claims about source (S3's recoverability table). Keep the tombstone log (M5) so staleness is at least *detectable* ("the file list I need was summarized away at condensation #3").
- **FAILURE_MODE:** TTLs are guesses; too short and the agent re-reads constantly (the savings evaporate), too long and staleness bites anyway. Bi-temporal graphs answer staleness only for facts *in* the graph. Tombstones detect loss but do not recover it.
- **PING_EXISTING_ANALOG (best effort):** PING's memory claims carry learned dates and replacement chains (partial); authorizations in outreach carry no machine-readable expiry; digests carry no observed-at stamps.
- **GAP:** PING has no validity metadata on injected context. The cheapest start: stamp every handoff field with observed-at, and mark authorizations/scope with explicit expiry (S16's Stale row).
- **HARVEST_CLASS:** ADOPT the representation (source + observed-at + expiry on handoff fields); ADAPT the machinery (start with handoffs, extend to memory claims later).
- **FALSIFICATION:** Kills "the summary is current because it was just written." A summary written one minute ago about a revoked credential is stale; recency is not validity. Dies if nobody maintains the validity metadata; then it is worse than nothing (false confidence).
- **DEPENDENCIES:** The Handoff Contract (section 3) as the carrier format.
- **CONTEXT_SAVED:** Negative direct savings (metadata costs tokens), but it converts a class of silent failures into cheap re-reads. Estimate: prevents 1-3% of mission failures that today present as mysterious misbehavior; in token terms it *costs* ~2-5% to save the failures.

### M18. Position discipline (Lost in the Middle)

- **MECHANISM_ID:** M18-POSITION-DISCIPLINE
- **PROBLEM:** Where context sits in the window changes whether it is used; key evidence buried mid-context is effectively absent.
- **SOURCE:** P3 (Liu et al., arXiv 2307.03172); S11 (soltero-skills playbook: "Place the highest-signal content at the beginning or end of the context window, never buried in the middle"); replicated across 18 frontier models per Chroma "context rot" (via S11).
- **PINNED_SHA:** c4ea4e444144 (S11).
- **SOURCE_LOCATION:** S11 playbook.md, tier "Proven."
- **MATURITY:** Research-validated, model-agnostic.
- **INVARIANT:** Retrieval/QA accuracy is U-shaped over position. Assemble context so key evidence sits at the edges (start or end), never in the middle.
- **IMPLEMENTATION:** Order the assembled prompt: persistent instructions first, then the task, then bulk context, then the handoff/evidence summary and the immediate next action last. Summaries and handoff contracts go at the *end* (recency edge), not after the system prompt. The beginning edge holds the goal and the standing rules.
- **FAILURE_MODE:** Position is a second-order effect; it does not fix bad content. Over-rotating on position can fragment narrative coherence. The U-shape is measured on QA/retrieval, not on long agentic trajectories; the transfer is plausible but not directly validated for multi-step tool use.
- **PING_EXISTING_ANALOG (best effort):** PING's subagent prompts currently put the massive standing-context block *before* the task, burying the actual task in the middle. This is the anti-pattern, verbatim.
- **GAP:** Reorder worker prompts: goal + task first, standing sections needed per manifest (M16), handoff contract last. Zero new machinery.
- **HARVEST_CLASS:** ADOPT. It is free.
- **FALSIFICATION:** Kills "order does not matter." Dies as a primary strategy: it is a multiplier on good content, not a substitute.
- **DEPENDENCIES:** M16 (manifest) to know what the edges should hold.
- **CONTEXT_SAVED:** 0% tokens. Saves *effective* context: the same tokens, better used. Measurable as improved task success at fixed token budgets.

### M19. Checkpoint handoff file (the write is the thinking)

- **MECHANISM_ID:** M19-CHECKPOINT-HANDOFF-FILE
- **PROBLEM:** Long tasks accumulate decisions, abandoned attempts, discovered state, and errors; the next session inherits either everything (noise) or nothing (amnesia).
- **SOURCE:** S10 (ramparte/agent-building-playbook, `patterns/checkpoint-handoff-file.md`); S15 (harshsinghmp handoff skill, three modes: inbound resumption, outbound dispatch, ambient continuity).
- **PINNED_SHA:** ca2ab73f4837 (S10); cd9623ce5135 (S15).
- **SOURCE_LOCATION:** S10 `patterns/checkpoint-handoff-file.md`; S15 `skills/agent-handoff/SKILL.md`.
- **MATURITY:** Community pattern, widely converged (S10, S15, S16 all describe the same shape independently).
- **INVARIANT:** At a checkpoint, write a deliberately structured document capturing *only* what the next session needs: current goal, completed work, in-progress work, tried-and-abandoned (with why), next concrete action, artifact locations. The session that reads it starts with a clean window containing exactly this briefing. The act of writing is itself the distillation.
- **IMPLEMENTATION:** S10's field list: task goal, final state, decisions made, failed attempts + why abandoned, unresolved questions, files changed, tests run, assumptions worth revisiting, recommendations for the next session. S15 adds: outbound packets generated *before* dispatching subagents or stepping away (>30 min, or task prompt >3 sentences); inbound resumption leading with unanswered open questions; ambient mode probing for prior state on every workspace entry. "A bad journal entry narrates feelings and activity; a good one hands the next session everything it needs to resume cold."
- **FAILURE_MODE:** Handoff files rot (written once, never updated, then trusted). They grow: without a budget they become mini-transcripts. The "why abandoned" field is the first dropped under time pressure, and it is the highest-value field (prevents the successor from re-trying the dead end). Ambient probing on every entry adds latency and can resurrect dead work.
- **PING_EXISTING_ANALOG (best effort):** PING's subagent final reports and the GRILLING-BRIEF.md convention are handoff files; daily memory notes are journals. Missing: the fixed field list, the budget, and the outbound-before-dispatch discipline (workers are dispatched with the task text, not a packet).
- **GAP:** Standardize the packet format (section 3), put a token budget on it, and require the packet *before* dispatch, not after completion.
- **HARVEST_CLASS:** ADOPT. This is the direct ancestor of the Handoff Contract.
- **FALSIFICATION:** Kills "the next session can read the transcript." Dies when checkpoints are too frequent (write cost exceeds read savings) or too rare (the packet is stale on arrival); the checkpoint cadence must be tied to milestones, not the clock.
- **DEPENDENCIES:** The contract schema (section 3); a checkpoint trigger (milestone/decision/correction/abandonment, per S15).
- **CONTEXT_SAVED:** A checkpoint packet is typically 1-5% of the transcript it replaces: 95%+ savings per handoff, at the cost of the write (one focused model turn, no tools).

### M20. Typed handoff failure states (the receiver must not improvise)

- **MECHANISM_ID:** M20-TYPED-HANDOFF-STATES
- **PROBLEM:** Every failed handoff looks the same ("something went wrong"), so receivers improvise, and improvisation under uncertainty is where missions die.
- **SOURCE:** S16 (marius-manola, three posts converging on the same table); Microsoft multi-agent guidance (via S16).
- **PINNED_SHA:** 9502703bee75 (S16).
- **SOURCE_LOCATION:** `content/blog/design-multi-agent-handoffs.mdx`, `test-multi-agent-handoffs.mdx`, `replay-failed-multi-agent-workflow.mdx`.
- **MATURITY:** Pattern-level, argued from operational experience.
- **INVARIANT:** Distinguish at minimum six states, each with a prescribed safe next action: Invalid (artifact violates contract -> reject, record field-level error), Incomplete (required work/evidence missing -> request it or escalate), Stale (evidence/authorization expired -> re-read source or fresh approval), Conflicting (two workers' claims incompatible -> preserve both sources, route to resolver/human), Blocked (policy/dependency prevents progress -> stop, explain, notify owner), Retryable (transient dependency failed -> retry within an external budget, then fail visibly).
- **IMPLEMENTATION:** The handoff packet carries a status field with one of these values; the receiver's first act is to validate the packet against the contract and set the state. "Do not treat every failed handoff as a model problem. A timeout, revoked credential, changed record, and ambiguous instruction need different responses." For parallel branches that disagree, the synthesis step retains the competing evidence and states the resolution rule.
- **FAILURE_MODE:** Six states are a floor, not a ceiling; real failures blend (stale *and* conflicting). Misclassification is itself a failure mode (calling a policy block "retryable" retries into a wall). The table needs a resolver for Conflicting, which is an org-level, not technical, decision.
- **PING_EXISTING_ANALOG (best effort):** PING's failure vocabulary (BLOCKED, rate-limit stops, "fail closed") is informal; subagent reports do not carry a typed status.
- **GAP:** Adopt the six states as the `status` field of the Handoff Contract. This is the cheapest coordination upgrade in the lane.
- **HARVEST_CLASS:** ADOPT.
- **FALSIFICATION:** Kills "a handoff either works or it doesn't." Dies if states are recorded but the prescribed actions are not enforced; a typed state with no handler is decoration.
- **DEPENDENCIES:** The contract schema (section 3); handlers for each state in the orchestrator.
- **CONTEXT_SAVED:** 0% tokens; converts untyped failure-recovery thrash (the most expensive tokens in any mission: repeated confused retries) into single prescribed actions.

---

## 3. Centerpiece: THE HANDOFF CONTRACT

### 3.1 Why this shape, argued from failure cases

Each field below exists because a real, observed failure mode demands it. Nothing is here from intuition.

| # | Failure case (observed) | What died | Contract field that prevents recurrence |
|---|---|---|---|
| F1 | Context saturation drops early messages first; the successor drifts from the original goal while sounding confident (S3/S5: early framing over-weighted, then lost; Ada study P4-search: goal drift induced by context saturation) | The goal | **GOAL_VERBATIM**: the original task text, copied, never re-derived or paraphrased |
| F2 | Compaction eats exact error messages, variable names, line numbers (S4, S5: "tends to lose: exact error messages... specific numeric values") | Debuggability | **OPEN_FAILURES**: each unresolved failure with the exact artifact (message, location), not a summary of it |
| F3 | Compaction eats rejected alternatives and their rationale (S4, S5); the successor re-tries the dead end (S10: the "why abandoned" field is the highest-value field) | Weeks of compute | **DECISIONS**: accepted AND rejected, each with one-line rationale; especially user corrections, which S3 classifies as Irreplaceable |
| F4 | Two workers return incompatible claims; the synthesizer picks one silently (S16: Conflicting -> preserve both sources, route to resolver) | Truth | **EVIDENCE**: pointers (source + digest + observed-at), never conclusions alone; conflicts carried as conflicts |
| F5 | An approval or credential expires mid-mission; the successor acts on a dead authorization (S16: Stale -> re-read or fresh approval) | Authorization | **AUTHORIZATIONS**: scope + expiry, machine-readable; expired = do not proceed |
| F6 | Worker dies mid-write; the successor cannot tell what completed (S16: Incomplete vs Invalid; S15: ambient continuity after abrupt endings) | Idempotency | **STATE**: done / in-flight / next-action, with artifact pointers + digests so the successor can verify rather than trust |
| F7 | Receiver improvises a new path after a failure (S16: "proves that the receiver does not improvise a new path") | Mission integrity | **STATUS** (M20's six states) + **RECOVERY_RULE**: the prescribed next action for the current state; unknown -> fail closed |
| F8 | Standing rules that are load-bearing (disclosure lines, signoffs, "never X") get paraphrased away by summarizers (S4: nuanced decisions reduced to high-level summaries) | Compliance | **CONSTRAINTS**: verbatim rules that must survive, marked as non-paraphrasable |
| F9 | Successor cannot re-fetch what the summary mentions (S3: "a path or pointer" for Reconstructible; M5 tombstones) | Recoverability | **ARTIFACTS**: every referenced file/record/event by path-or-ID + content digest; the digest is the integrity check, the pointer is the re-fetch |
| F10 | Summaries of summaries compound staleness and error (S1: "summaries are also summarized in future condensations") | Fidelity over time | **GENERATION** counter + **SOURCE_SPAN**: which event/message IDs this packet covers; a packet may only be built from the log, never from a previous packet (no recursive summarization, per S3) |
| F11 | The next reader needs one field, re-reads everything (M14) | Reader tokens | **Schema-fixed sections** so a successor can read selectively |
| F12 | Position burial: the handoff's key content sits mid-prompt and is under-attended (P3/M18) | Attention | **Placement rule**: GOAL first, packet last (recency edge); never bury the packet mid-context |

### 3.2 The minimal field set

A handoff packet is valid iff it carries all of the following. "Minimal" means: remove any one field and a named failure case above becomes possible again.

```
HANDOFF_PACKET v1
  packet_id:            stable ID (uuid)
  mission_id:           correlation ID for the whole mission
  from_worker / to_role: who wrote it, who should read it
  generation:           integer; increments per rewrite
  source_span:          [first_event_id, last_event_id] covered; MUST reference the log, never a prior packet
  observed_at:          wall-clock time of writing (for staleness math)
  status:               one of {OK, INVALID, INCOMPLETE, STALE, CONFLICTING, BLOCKED, RETRYABLE} (M20)
  goal_verbatim:        the original task text, copied exactly (F1)
  state:                { done: [...], in_flight: [...], next_action: "..." } with artifact pointers (F6)
  decisions:            [{ choice, rationale, rejected_alternatives_with_why }] (F3)
  open_failures:        [{ exact_error_or_observation, location, attempted }] (F2)
  evidence:             [{ claim, source_pointer, digest, observed_at }] (F4)
  artifacts:            [{ path_or_id, digest, kind }] (F9)
  authorizations:       [{ scope, granted_by, expires_at }] (F5)
  constraints:          [verbatim non-paraphrasable rules] (F8)
  recovery_rule:        prescribed next action for `status`; default: fail closed (F7)
  open_questions:       questions the successor must answer before proceeding (S15 inbound mode leads with these)
  notes_for_successor:  free-text pressure valve, budgeted (M14: the schema needs one escape hatch)
```

### 3.3 Rules that make the contract work

1. **Build from the log, never from a packet.** Recursive summarization compounds error (F10, S1, S3). A generation-N packet is built by reading `source_span` from the event log, not by summarizing the generation-(N-1) packet.
2. **Pointers, not copies.** Artifact and evidence bodies stay in the store; the packet carries pointers + digests (F9, M2, M5). A digest mismatch on re-fetch = treat as STALE.
3. **Verbatim where it matters.** GOAL_VERBATIM and CONSTRAINTS are copied character-for-character (F1, F8). Everything else may be distilled.
4. **Typed status or it did not happen.** A packet without a valid `status` is INVALID (M20). The receiver validates first, acts second.
5. **Stale is mechanical.** Any field with `expires_at` < now, or whose source digest changed, flips the packet (or that field) to STALE; the safe action is re-read or fresh approval, never proceed-and-hope (F5, M17).
6. **Conflicts are carried, not resolved silently.** Two incompatible claims ride along as a conflict with both provenances; resolution is a recorded decision with a stated rule (F4, S16).
7. **Budgeted.** Target: the packet is 1-5% of the source_span it covers (M19). If it exceeds budget, the span is too wide; narrow it (more frequent checkpoints), do not bloat the packet.
8. **Placed at the edges.** Goal first, packet last in the successor's prompt (F12, M18).
9. **Written before dispatch, read before acting.** Outbound packets are generated *before* spawning the successor (S15); the successor's first act is validation against this contract, not work.

### 3.4 What the contract deliberately excludes

- Full transcripts (M11: the supervisor never needs them).
- Reasoning traces, except the one-line rationale per decision (M6: keep the action skeleton, mask the rest).
- Reconstructible content in full (S3: file contents, diffs, branch state -> pointers).
- Feelings, activity narration, status prose (S10: "a bad journal entry narrates feelings and activity").
- Anything the successor can re-derive cheaper than reading (M2's "state reloaded from source").

---

## 4. Cross-cutting findings

**F1. The falsification that matters most (P2, "The Complexity Trap").** On 500 SWE-bench instances, simple observation masking matched or beat LLM summarization in 4 of 5 settings; both cut >50% of cost vs unmanaged; LLM summarization caused 13-15% longer trajectories because summaries mask the failure signals that make agents stop, and summary generation itself cost >7% of the total. Implication for PING: *no summarizer ships without beating the masking baseline on total cost-to-outcome.* Summarization is guilty until proven innocent.

**F2. Convergence is real.** Five independent sources (S1/OpenHands, S3/Claude Code teardown, S10/ramparte, S15/handoff skill, S16/manola) describe the same handoff shape: goal, state, decisions + rejected, open failures, next action, artifact pointers, typed status. When independent implementations converge, the shape is load-bearing.

**F3. The auditability line.** Three mechanisms in this lane fail PING's evidence standard on auditability alone: Codex's encrypted opaque server-side blob (M9), Cursor's RL summarizer with an unknowable loss profile (M8), and any free-text summary with no tombstone record (M5). Harvest the shapes, reject the black boxes.

**F4. PING's biggest waste is not summarization quality, it is injection policy.** M16's estimate (50-80% of worker prompt tokens are unneeded standing context) dwarfs every summarizer's savings. A per-task context manifest + sectioned standing store + miss-logging loop is the highest-ROI harvest in the lane and needs no model calls.

**F5. Token accounting is the load-bearing dependency.** Staged thresholds (M10), trigger calibration (M1/M4/M9), the masking-vs-summary evaluation (M6/F1), and the packet budget rule (3.3.7) all die without trustworthy per-turn token accounting. S1's issue #1172 (event count is not a proxy for token length) is the warning: measure tokens, not turns.

**F6. Recency is not validity.** A one-minute-old summary of a revoked credential is stale (M17). Every authorization and every "current" fact needs source + observed-at + expiry. This is cheap and almost nobody does it.

---

## 5. Harvest ranking (by expected ROI for PING)

| Rank | Mechanism | Class | Why |
|---|---|---|---|
| 1 | M16 dependency context (per-task manifests) | ADOPT discipline | 50-80% of worker tokens, zero model calls |
| 2 | M6 observation masking + the P2 evaluation protocol | ADAPT | >50% cost cut for near-zero complexity; the evaluation is the real harvest |
| 3 | Section 3 Handoff Contract | ADOPT | Standardizes every worker boundary; kills whole failure classes |
| 4 | M10 staged pressure ladder | ADOPT | Cheapest-reversible-first; composes with everything |
| 5 | M5 condensation-as-event (typed tombstones) | ADOPT | Schema-only; makes loss auditable |
| 6 | M1 stage-1 tool-result clearing by recoverability | ADAPT | Concentrates summary budget on the irreplaceable |
| 7 | M14 structured summaries (fixed schema + one free-text valve) | ADOPT | Selective reads; machine-queryable state |
| 8 | M20 typed handoff states | ADOPT | Converts failure thrash into prescribed actions |
| 9 | M12 tiered memory w/ fixed core budget | ADAPT | Structural fix for accretion; needs audit on self-edits |
| 10 | M13 bi-temporal invalidation on memory claims | ADAPT | Makes staleness a query; PING's claim system is the right substrate |
| 11 | M18 position discipline | ADOPT | Free; goal first, packet last |
| 12 | M2 summary-as-state-transfer assembly | ADOPT | Four-slot assembly incl. reload-from-source |
| 13 | M4 condenser framework (strategies as pure functions + NoOp baseline) | ADAPT | A/B-able strategies; the NoOp path is the portable gem |
| 14 | M9 hybrid summary+recency rebuild rule | ADAPT | Cleaner than ad hoc handoffs; reject the opaque server path |
| 15 | M15 sleep-time compute w/ merge protocol | ADAPT | Off-critical-path consolidation; needs the merge protocol first |
| 16 | M7 head-tail elision markers | ADAPT | Bounded per-call blowups; dual as-sent/on-disk views |
| 17 | M17 staleness representation | ADOPT (start w/ handoffs) | Costs tokens to save failures; start narrow |
| 18 | M8 RL self-compaction | INSPIRED | KV-cache insight only; RL part not harvestable, loss profile unauditable |
| 19 | M3 server compaction API | INSPIRED | Shape only; vendor lock-in + black box conflict with evidence standard |

---

## 6. Open questions

1. **Masking window calibration for non-coding missions.** P2's M=10 rolling window is tuned on SWE-bench. What is the right masking policy for PING's prospect-research missions, where old observations are often one-shot evidence (M6's falsification)? Is there a task-type-dependent masking schedule, and who maintains it?
2. **The summarizer evaluation harness.** F1 demands every summarizer beat masking on total cost-to-outcome. What is PING's equivalent of SWE-bench for this: a fixed set of missions with known-good outcomes, run under NoOp vs masking vs summarization? Who builds it, and what is the pass bar?
3. **Packet budget enforcement.** Rule 3.3.7 targets 1-5% of source span. What happens mechanically when a worker emits an over-budget packet: reject-and-rewrite, or accept-and-flag? What is the rewrite loop's own budget?
4. **Recursive-packet detection.** Rule 3.3.1 forbids building packets from packets. How is this enforced: by convention, by checking `source_span` against prior packet IDs, or structurally (packets are not in the event log's summarizable range)?
5. **Merge protocol for sleep-time compute.** M15 dies on races. What is PING's merge rule when the async consolidator and a live worker touch the same memory claim: last-writer-wins with tombstones, worker-wins, or a conflict queue for the main agent?
6. **Manifest miss cost.** M16 lets workers request missing context by section and logs misses. What is the miss budget before the manifest is declared wrong and the task re-planned? Unbounded miss-requests recreate the injection problem.
7. **Digest algorithm for artifact pointers.** The contract (F9) needs content digests on every artifact pointer. Which digest, and where is it computed: at write time by the worker, or by the store? What happens on mismatch mid-mission: STALE the field, or STALE the packet?
8. **Bi-temporal claims vs the existing claim system.** M13 proposes valid-time/invalidation semantics on PING memory claims. Is this a migration of the existing `claim:` lines or a parallel structure? What is the invalidation trigger: a contradicting observation, a human correction, or both?
9. **Checkpoint cadence.** M19 ties checkpoints to milestones, not the clock. What counts as a milestone in a PING outreach mission vs a research mission? Too frequent = write cost exceeds savings; too rare = stale packets.
10. **The 1K-summary question.** M8 claims ~1K-token RL summaries with 50% error reduction (vendor-reported, unverified). If PING ever tests aggressive summarization, what is the smallest summary that still passes the Handoff Contract's required fields? The contract sets a *floor* on information; does any summary below ~2K tokens even fit the schema?
11. **Position effects on agentic trajectories.** M18's U-shape is validated on QA/retrieval, not on multi-step tool use. Does goal-first/packet-last ordering actually improve PING worker outcomes, or does narrative coherence dominate? Needs an A/B, not an assumption.
12. **Encrypted/opaque compaction and compliance.** If a future provider offers server-side compaction as an opaque blob (M9's Codex path), is there any PING mission class where the speed is worth the auditability loss? The lane's provisional answer is no; Nolan should confirm it is a standing prohibition.

---

## 7. Source notes and confidence

- Highest confidence: OpenHands condenser framework (S1, source-read README + paper), the P2 falsification (peer-reviewed track, 500 instances), the handoff-shape convergence (five independent sources), Anthropic's compaction API docs (P1, first-party).
- Medium confidence: Claude Code trigger numbers (~83.5%, 33K buffer) and microcompaction internals (closed source; triangulated from S3/S4/S5 teardowns, consistent across sources but build-specific).
- Lower confidence / flagged: Cursor's RL training and 50% error reduction (vendor-adjacent, no independent replication found); Letta's scale claims (vendor-reported); Mem0/Zep benchmark numbers (actively contested between vendors; mechanisms retained, numbers distrusted); marim-harness and bilinc content (SHAs unavailable; used only as corroborating snippets, never as sole support).
- Not verified in this pass: the actual OpenHands condenser source code bodies (only READMEs and docs were read; function-level claims like `StateSummary` fields come from the codewiki mirror S18-lineage and should be re-verified against S1 source before implementation).

---

*End of LANE-14 report. Research/falsification/harvest only; no implementation performed.*
