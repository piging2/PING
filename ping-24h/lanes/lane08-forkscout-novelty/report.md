# Lane 08: ForkScout and Obscure-Runtime Novelty Search

STATUS: HYPOTHESIS. All findings are source-read observations from shallow clones at the pinned SHAs below. Not yet replayed from a clean checkout. Treat every mechanism claim as provisional until an independent replay verifies it.

Run date: 2026-09-28. Read-only everywhere: no tree was modified, nothing was pushed or committed. Write targets were limited to this lane directory and the permitted shallow donor clones under ~/workspace/ping-24h/donors/.

## Scope and method

Covered ForkScout plus obscure or new runtimes that could introduce mechanisms not represented by lanes 2 through 7. Four donors investigated total (the allowed maximum, including ForkScout): ForkScout, WAHIB-EL-KHADIRI/AgentOS, ShibaClaw, oxgeneral/ORCH. Each was shallow-cloned fresh and read at the pinned SHA. Public web discovery was used only to find candidates, never as evidence. Every mechanism below is separated by evidence status: OBSERVED IN CODE, DOCUMENTED, DEMONSTRATED BY TEST, INFERRED, CLAIMED BY AUTHOR, SPECULATIVE.

Lanes 2 through 7 reference map (used for overlap checks): Talos (capability tokens, exact fingerprints, single execution funnel, monotonic governor); Nerve (transactional outbox, CAS terminal transitions, drain-before-drive, quiescence); POLYROB (goal lifecycle, three-valued liveness, verified completion, wake fingerprints, re-entry budgets); AgentArk (learning gates, canaries, promotion reports, replay gate); Pernix (skill-embedded verification, counterfactual replay as research, evidence expiry); MatrixClaw (external runtime adapters, normalized event envelopes, persisted thread attachments, approval bridging); MyAgens (tool-output injection defense, delegation permission caps, backend failover, memory injection defense); Goated (handler-level readiness, stale-evidence rules, bounded restart); Hivekeep (standing-context routing, anti-feedback-loop retrieval); Pioneer (persistent coordinator, startup authority quarantine, credential-authority fencing, observe-before-replay); lane 7 (Pi, Muse, nanoMuse).

## Candidate dispositions

1. ForkScout -- INVESTIGATED. Potentially novel mechanism: one-shot restart/resume context consumed before re-entry.
2. ShibaClaw -- INVESTIGATED. Potentially novel mechanisms: per-iteration nonce-delimited tool-result framing; fingerprint-bound approve-once automation grants.
3. AgentOS (WAHIB-EL-KHADIRI/AgentOS) -- INVESTIGATED. Potentially novel mechanism: checkpointed LLM-boundary replay with fork-from-checkpoint branching.
4. ORCH (oxgeneral/ORCH) -- INVESTIGATED. Potentially novel mechanism: path-scope prefix leases preventing concurrent agents from touching overlapping file scopes.
5. Clank (ClankLabs/Clank) -- REJECTED. Multi-channel single-daemon gateway with agent pool, shared sessions, memory, and tools is represented by MatrixClaw (external runtime adapters, normalized event envelopes, approval bridging) plus Pioneer (persistent coordinator).
6. Wayland -- REJECTED. No identifiable canonical runtime found; closest analog (compositor IPC skills) is represented by POLYROB/MyAgens skill systems. Mechanism UNKNOWN, do not invent identity.
7. ThinClaw -- REJECTED. Durable identity, routines, and WASM/MCP extension model are represented by Pioneer (durable binding), POLYROB (goal routines), and MatrixClaw (executor interchange).
8. ZeroClaw -- REJECTED. Supervised autonomy, sandboxing, and cryptographic tool receipts are represented by Talos (capability tokens, exec receipts) and Pioneer (credential fencing).
9. NanoClaw -- REJECTED. Per-group container isolation is sandbox deployment; authority is represented by Talos and external execution by MatrixClaw.
10. PicoClaw -- REJECTED. Go rewrite and low resource use are implementation compression, not a new invariant.
11. nanobot -- REJECTED. Small Python core with channels, memory, cron, and subagents is represented by nanoMuse, Hivekeep (memory routing), POLYROB (goals), and MatrixClaw (channels).
12. TrustClaw -- REJECTED. OAuth integrations and disposable remote execution are represented by Pioneer (credential authority) and MatrixClaw (external workers).
13. AstrBot -- REJECTED. Plugin-rich multi-channel chatbot with sandbox is represented by MatrixClaw (adapters, normalized envelopes).
14. FireClaw -- REJECTED. Firecracker microVM packaging of OpenClaw is deployment isolation, not a runtime mechanism.
15. Syne -- REJECTED. No identifiable project found. UNKNOWN.
16. Retinue (jklthinking/retinue) -- REJECTED. Durable task baton with holder, acceptance checks, and append-only receipt chain is represented by POLYROB (goal lifecycle, acceptance checks, verified completion) and Talos (receipts). PolyForm Noncommercial license also blocks code harvest.
17. Rousseau Agent (sebastienrousseau/rousseau-agent) -- REJECTED. SLSA-3/cosign supply-chain provenance is build infrastructure, not a runtime authority mechanism; the runtime itself is represented by Goated and MatrixClaw.
18. remote-agent-kit -- REJECTED. Loca packaging with end-to-end delivery/reply/ACK health checks is represented by Goated (handler-level readiness) and MatrixClaw (external-worker attachment).
19. AgentOS (varshith-06/agentos) -- REJECTED. Syscall-boundary permission checks are represented by Talos (policy at mint, capability tokens); kill -9 resume with zero re-execution is represented by Nerve (restart recovery); billed journaling is an economic layer, not a runtime invariant PING adopts. Its runtime-invented planner teams are model-authority, which PING rejects architecturally.
20. AgentOS (Kishorevijay07/agentos) -- REJECTED. Task-Graph DAG with capability-matched scheduling is capability-eligibility where PING is already stronger (per the MatrixClaw comparison); the corrective-task Reflector overlaps AgentArk's learning loop.
21. AgentOS (wuyifeishu/agentos) -- REJECTED. Skill marketplace plus subagent dispatch is represented by MyAgens (skill bundles) and POLYROB (subagents).

---

## Donor card: ForkScout

- Repository: https://github.com/Forkscout/forkscout
- SHA: d72e5e6995e1015df1d0d28a698b6db4800478c5 (2026-03-16), version 3.0.0
- License: README claims MIT; NO LICENSE file observed at this pin
- Activity: stale; head commit 2026-03-16
- Language: TypeScript on Bun (package.json marked "private": true)
- Architecture: single-process Bun agent; channels for Telegram, WhatsApp, Discord, Slack, LINE, Teams, terminal; ai-sdk LLM providers; MCP servers; tools directory; agent-invoked self-restart tooling.
- Other claims not verified and not relied upon: per-session permission modes, masked credential requests, incognito log purging (seen in release notes, not read in code).

### Mechanism card: one-shot restart continuation context
- Mechanism: Restart context (reason plus continueTask) is written to .agents/restart-context.json before a restart, then read and immediately deleted (unlinkSync) at startup before the continuation self-message fires. The continuation can fire at most once: consume-before-reentry semantics.
- Evidence: OBSERVED IN CODE. src/tools/validate_and_restart.ts (write before restart); src/channels/telegram/startup.ts loadRestartContext() (read then unlinkSync, then auto-continue).
- Comparison to lanes 2-7: Nerve's outbox and POLYROB's re-entry budgets are idempotent at-least-once recovery; none use consume-before-reentry. The semantic is distinct but the implementation is filesystem-race-prone (parse-then-unlink, no fsync) and strictly weaker than PING's idempotent patterns.
- Verdict: USEFUL TEST HARVESTED. The harvestable artifact is a test asserting a restart continuation fires exactly once across a restart (not zero, not twice), not the implementation.

### Known gaps (documented anti-patterns, no mechanism card)
- OBSERVED IN CODE: restart authorization is prompt-text discipline only. The tool description says ONLY on explicit user instruction, but no code checks the caller.
- OBSERVED IN CODE: pattern-based process kills (pkill -9 -f 'src/index.ts', pkill -9 -f 'forkscout-agent', port-based kill of :3200) in package.json scripts and the restart script.
- OBSERVED IN CODE: the smoke test spawns a --cli process and accepts ANY non-empty output as a pass; the expected "reply with only the single word: ok" is never checked. It smoke-tests a process that is not the replacement.
- OBSERVED IN CODE: git tag -f forkscout-last-good HEAD is forced before the old process dies and before the replacement proves healthy. The known-good marker advances on typecheck plus smoke output, not on replacement health.
- Overall: ForkScout is unsafe as a system; only the test assertion above is worth harvesting.

---

## Donor card: AgentOS (WAHIB-EL-KHADIRI/AgentOS)

- Repository: https://github.com/WAHIB-EL-KHADIRI/AgentOS
- SHA: 094d1eac251b0137c60d4a59db0ab2b07a87f754 (2026-09-23), version 0.1.0
- License: Apache-2.0 (LICENSE file and Cargo.toml; open core, separate proprietary Enterprise edition)
- Activity: active; head 2026-09-23
- Language: Rust workspace (crates: kernel, llm, trace, vault, bus, cli, memory, plugins, registry, sdk) plus dashboard
- Architecture: kernel with journal, supervisor, persistence; LLM provider abstraction; trace recorder with checkpoint chains; encrypted vault with permission sets.

### Mechanism card: checkpointed forkable LLM-boundary replay
- Mechanism: A recorded agent session can be re-executed deterministically at the LLM provider boundary with no API key, and forked from any recorded checkpoint with a different prompt, continuing live. Three cooperating pieces: (1) ThoughtRecorder writes checkpoints with checkpoint_id and parent_checkpoint_id chains and fork_from() creates a new branch rooted at any earlier checkpoint; (2) ReplayProvider serves RecordedResponse entries in order at the provider boundary, impersonating the recorded model so replayed requests are byte-identical; (3) with_fallback() gives fork semantics: when the recording is exhausted, a live provider continues from the fork point. CLI exposes replay --session and fork --session --from --at --prompt.
- Evidence: OBSERVED IN CODE (crates/llm/src/replay.rs; crates/trace/src/recorder.rs; crates/cli/src/commands.rs) and DEMONSTRATED BY TEST (replay.rs: test_replay_serves_responses_in_order, test_exhausted_without_fallback_errors, test_exhausted_with_fallback_continues_live, test_recorded_response_serde_roundtrip; recorder.rs: test_record_checkpoint, test_fork_from_checkpoint, test_get_by_checkpoint). Lane did not execute the tests or build the crate.
- Comparison to lanes 2-7: Pernix counterfactual replay is research-only; Nerve resume is linear; AgentArk replay gate is version pinning; PING's own replay is verification-from-clean-checkout. None branch a recorded run from an arbitrary checkpoint with recorded-LLM-prefix plus live continuation. Deterministic replay as a branching/exploration substrate is not represented.
- Verdict: NEW INVARIANT FOUND.
- Caveat: the repository's own AGENTS.md requires replay claims to be reproducible and demos to be honest; this lane verified code and shipped tests only, not an executed replay.

---

## Donor card: ShibaClaw

- Repository: https://github.com/RikyZ90/ShibaClaw
- SHA: 6e807c67635742c16c48ea83f9c0fc77af4d1d76 (2026-09-17), version 1.0.1
- License: Apache-2.0 (LICENSE file present at this pin)
- Activity: active; v1.0.0 released 2026-09-08, v1.0.1 on 2026-09-17
- Language: Python
- Architecture: agent loop with per-iteration context rebuild, session permission modes, automation service with approve-once grants, masked credential requests.
- Claims not verified: ContextVar tool scoping, masked credential requests staying outside model context, incognito session log purge. Marked CLAIMED BY AUTHOR / DOCUMENTED; not relied upon.

### Mechanism card: per-iteration nonce-delimited tool-result framing
- Mechanism: Every tool result is wrapped server-side in <tool_output_<nonce> name="...">...</tool_output_<nonce>>, where the nonce is a fresh secrets.token_hex(8) regenerated once per agent loop iteration. Occurrences of the closing tag inside the content are escaped; content matching injection phrases ("ignore previous instructions", "new system prompt", "you are now <role>" regex) is replaced with a sanitized SECURITY WARNING notice. The static system prompt discloses the current delimiter and instructs the model that everything inside is literal data, never commands.
- Evidence: OBSERVED IN CODE. shibaclaw/agent/context.py (nonce init, regenerate_nonce, add_tool_result wrapping/escaping/sanitizer, system prompt lines 301-302); shibaclaw/agent/loop.py line 729 (regenerate per loop run).
- Comparison to lanes 2-7: the untrusted-output-framing invariant overlaps MyAgens tool-output injection defense. The value here is the compact concrete pattern: per-iteration regeneration, closing-tag escaping, and injection-phrase sanitizer in one place.
- Verdict: SMALLER IMPLEMENTATION FOUND.

### Mechanism card: fingerprint-bound approve-once automation grants
- Mechanism: An automation approval grant is bound to a SHA-256 fingerprint of the exact (schedule, payload) tuple. approve_job stores the fingerprint at approval time; job_is_approved recomputes it at execution and requires equality. Any edit that changes the fingerprint clears the grant automatically; deny clears it. Any drift in schedule, message, heartbeat file, delivery target, channel, session key, or profile voids the standing grant without further review.
- Evidence: OBSERVED IN CODE. shibaclaw/automation/grants.py (operation_fingerprint, job_is_approved); shibaclaw/automation/service.py (approve path lines 515-516, drift invalidation 616-617, deny 525, creation 493-494).
- Comparison to lanes 2-7: Talos has one-shot approval fingerprints but no durable standing grant; its standing rules key on exact (harness, subcommand) pairs without content-hash binding or explicit drift invalidation. POLYROB's wake gate requires fresh approval per new payload (stricter, no grant at all). A durable, content-addressed, self-invalidating standing grant is not represented.
- Verdict: NEW INVARIANT FOUND.

---

## Donor card: ORCH

- Repository: https://github.com/oxgeneral/ORCH
- SHA: c066dc013e98e08d753ce204e604e04621dd4167 (2026-08-01), release v1.0.34
- License: MIT (LICENSE file present)
- Activity: head 2026-08-01
- Language: TypeScript (strict)
- Architecture: CLI orchestrator for teams of coding agents (Claude Code, Codex, Cursor adapters); task state machine todo -> in_progress -> review -> done with auto-retry; scope locking; inter-agent messaging; plain YAML/JSON stores, no database.

### Mechanism card: scope-prefix leases for concurrent agents
- Mechanism: Each task declares a scope as an array of glob patterns. At dispatch, the orchestrator builds a ScopeIndex (compressed radix trie over pattern bases) of all in_progress task scopes and blocks any candidate whose scope overlaps, emitting task:scope_overlap. Overlap is decided conservatively: prefix relationship between bases, or sibling file-like patterns in the same non-root directory. The contract allows false positives but never false negatives. Tasks with no scope are unconstrained by convention.
- Evidence: OBSERVED IN CODE (src/domain/scope.ts; src/application/orchestrator.ts lines 778-796) and DEMONSTRATED BY TEST (test/unit/domain/scope.test.ts; test/integration/scope-index.e2e.test.ts exist; lane did not execute them).
- Comparison to lanes 2-7: Talos achieves conflict-freedom by serializing everything through a single execution funnel. No lane partitions concurrency with path-scope leases. The novelty is safe parallelism via conservative scope partitioning, not conflict-freedom per se.
- Verdict: NEW INVARIANT FOUND.

---

## Summary of verdicts

| Donor | Mechanism | Verdict |
|---|---|---|
| ForkScout | one-shot restart continuation context | USEFUL TEST HARVESTED |
| AgentOS (wahib) | checkpointed forkable LLM-boundary replay | NEW INVARIANT FOUND |
| ShibaClaw | per-iteration nonce-delimited tool framing | SMALLER IMPLEMENTATION FOUND |
| ShibaClaw | fingerprint-bound approve-once automation grants | NEW INVARIANT FOUND |
| ORCH | scope-prefix leases for concurrent agents | NEW INVARIANT FOUND |

Three new invariants, one smaller implementation, one harvested test. This lane does NOT conclude "no novel mechanism found." All verdicts are hypotheses until replayed from a clean checkout by an independent verifier. ForkScout's system-level safety findings remain negative: it is an adversarial case study, not a donor to adopt.

## Recommended follow-ups for the coordinator

1. AgentOS fork-replay deserves a replay verification: build the Rust workspace from a clean checkout, record a session, replay it deterministically, fork from a checkpoint, and confirm byte-identical LLM-boundary requests.
2. ShibaClaw's approve-once grants and nonce framing are small, self-contained, and Apache-2.0 licensed: both are harvest candidates without a build.
3. ORCH's scope index is MIT licensed and pure TypeScript with no side effects: directly portable as a concurrency-partitioning primitive.
4. ForkScout pin note: the tree at the pinned SHA claims MIT in the README but ships no LICENSE file; any future harvest must resolve the license state first.
