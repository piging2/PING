# Night shift log — 2026-09-15 evening → 2026-09-16 morning MDT
Nolan asleep ~19:45 → ~03:45. Standing orders: keep everything going, maximize within rails, fail closed, log everything, one morning summary.

## 19:45 — Shift start, health check
All four Pig browser profiles ALIVE (Chrome/153.0.8010.36, 83 chrome processes):
- :9223 fb — facebook.com/home.php open, session live
- :9225 x — x.com/home open, session live
- :9226 ig — instagram.com open, session live
- :9227 tt — tiktok.com/foryou open, session live
No action needed. No Chrome relaunches, no profile touches.

Baselines:
- TikTok: caps halved 30+10 after first-pass abort (1 failed like "like button not found", driver abort on possible checkpoint/rate-limit). Next pass 19:45 MDT.
- IG/Threads: 50+12 / 45+12, every 2h. X: 30 likes, every 4h. FB: every 3h. Unfollow crons (IG + FB pages) overnight.
- Seed list v1: 36 creators, 17 verified TikTok handles (tech-creator-seed-list.md). Expansion researcher dispatched to build v2.

## 19:55 — IG session probe (read-only)
- Pass 29 (~19:05) had failed: IG session logged out, restore_saved_login failed 3x, note said manual re-login needed.
- Read-only CDP probe of :9226 existing tabs (no navigation, no clicks): ig=logged_in, threads=no_tab.
- Conclusion: Nolan's 19:23 manual login HOLDS. The 19:05 failure predates it. Next IG pass (~21:05) should run normally. Threads tab absent is normal; the driver navigates to threads.com itself per pass.
- No login workaround attempted or needed. Nothing for the morning list on IG.
- Sleep timer set: wake ~20:52 to check the TikTok 19:45 pass result.

## 19:46 — Seed list v2 complete (expansion researcher)
- ~/workspace/outreach/tech-creator-seed-list.md now v2: 64 creators, 27 VERIFIED / 8 UNVERIFIED / 29 NOT FOUND (v1: 36, 17/4/15). All v1 entries and VERIFIED statuses preserved.
- Top 10 now: @garyvee, @hankgreen1 (8.1M, biggest new add), @cleoabram, @mkbhd, @lewis, @realcodiesanchez, @ahormozi, @patrickbetdavid, @linustech, @mcuban.
- Key adds: MKBHD (fills pure-tech-reviewer slot), Cleo Abram, ThePrimeagen (dev), Kyle Balmer (AI), Guy Raz (founder stories), Neil Patel + Eric Siu (Marketing School).
- New impersonator traps flagged: @zmcraft1 (not Matt Wolfe), @austinevans297, @_ijustinee (not iJustine), @dave.lee.country7381, fake Theo accounts, @graham.stephan0 fan account.
- Deliberate exclusions from VERIFIED: Mrwhosetheboss, NetworkChuck, Austin Evans, Matt Wolfe (unconfirmed/conflicting evidence) — stayed UNVERIFIED, do-not-engage.

## 19:46 — Watch handoff (replacement agent on shift)
- Previous watch agent finished early; I take the loop until ~03:30 MDT. All hard boundaries inherited and in force.
- Takeover health check: CDP :9223, :9225, :9226, :9227 all HTTP 200. Pig healthy, no Chrome relaunches needed.
- Baselines confirmed: TikTok 19:45 pass (30+10 halved) in flight; IG next ~21:05 (19:23 manual login holds per 19:55 probe); Threads needs the IG session; X 30-like passes every 4h; FB every 3h; unfollow crons overnight. Seed list v2 live (64 creators, 27 VERIFIED).
- Sleeping to ~20:50 to catch the TikTok 19:45 pass result.

## Clowning night shift (Meta AI) — started ~19:50 MDT
- Briefs: j-clowning-pattern-mining (new patterns from verified intel) and k-clowning-distribution (rollout strategy).
- Route: standard tandem machinery (build-context-pack.py + new-job.sh + meta-pass.sh), sequential on the Pig. No contracts/*.json (gate 4b is research-specific; briefs carry their own authoritative output contract with explicit override of the generic business-list contract).
- Note: no marketing-intel goal dir exists; captures land in the standard meta-ai-intel dir (outreach-campaign goal hidden_files) with provenance sidecars. Audit artifacts in the skill's runs/.

## 19:52 MDT — watch mechanism change (Pigi)
Two agent-loop watch attempts ended their turns early (a backgrounded `sleep` does not wake a completed agent; standing lesson re-confirmed). Replaced with durable machinery: `night-watch-cycle` cron, hourly, first run 20:50 MDT, owned by goal:ping-social-brand-launch, REMOVE in the morning. This is the honest version of what Nolan asked about keeping agents alive: scheduled jobs + files are what survive the night.
Clowning shift (Meta AI, 2 briefs) still running as a bounded coordinator.

## Brief 1 DONE (j-clowning-pattern-mining, ~20:05 MDT)
- Meta AI answer captured: 15,659 chars, 7 pattern candidates. Sidecar: answer_captured (UNVERIFIED), pack db323157ef.
- All 7 candidates PASSed the competitive_signal_pass gates (evidence >= 2, OBSERVED, no named businesses, no em dashes). Audit artifacts in skills/competitive-signal-pass/runs/.
- PROMOTED 1: pattern_unknown_stack_majority ("The Unknown Stack Majority", 9/12 CMS-unknown). Validated by compose_pattern.py; live queue re-ranked: 6 patterns, all draft.
- EXCLUDED 6 as duplicates/subsumed by existing patterns (gates cannot see cross-pattern dupes; queue hygiene applied): zero_chat_club and form_only_booking (covered by pattern_no_booking_path), seven_claim_247 and afterhours_claim_gap (covered by pattern_247_no_afterhours), crm_black_hole (covered by pattern_no_visible_stack), phantom_tracker_two (covered by pattern_conflicting_numbers).
- Nothing published, nothing tagged. Queue awaits Nolan's approval.

## Brief 2 DONE (k-clowning-distribution, ~20:25 MDT)
- Meta AI answer captured: 17,010 chars, 7 rollout recommendations. Sidecar: answer_captured (UNVERIFIED), pack 786813e410.
- All 7 recommendations PASSed the competitive_signal_pass gates (each grounded in 2+ cited system facts; audit artifacts in runs/).
- Survivors saved as DRAFT to ~/workspace/marketing-intel/distribution-strategy.md (strategy notes, not patterns; kept out of the pattern queue). Headliners: Receipts Before Punchlines, Capability Gated Punchlines, Human Gate At Every Stage, Q1 To Q10 Ladder.
- Nothing published, nothing tagged. Strategy awaits Nolan's approval alongside the pattern queue.
- Machinery note: no contracts/*.json were created (gate 4b is research-contract-specific); briefs carried their own authoritative output contracts with explicit override of the generic business-list contract. meta-pass.sh itself untouched. Captures live in the standard meta-ai-intel dir (outreach-campaign goal hidden_files); no marketing-intel goal dir exists.

## 19:53 MDT — Meta AI clowning shift complete
Both briefs done through the tandem machinery + competitive_signal_pass gates.
Brief 1 (pattern mining): 7 candidates, 6 were rephrasings of existing patterns, 1 genuinely new promoted: "The Unknown Stack Majority" (9 of 12 mapped sites run on mystery tech, only 3 confirmed WordPress). Live queue now 6 patterns, all DRAFT.
Brief 2 (distribution strategy): 7 gate-passed recommendations saved as draft strategy doc. Standouts: Receipts Before Punchlines, Capability Gated Punchlines (no clowning a problem until the fix is provable), Human Gate At Every Stage, Q1 To Q10 Ladder for sequencing stories as capabilities get proven.
Nothing published, nobody tagged. Queue + strategy await Nolan's approval in the morning.

## 19:58 MDT — improvement leg added (Nolan's call)
night-watch-cycle cron updated: every cycle now also advances the single highest-confidence convergence improvement (reasoning → rule → test → deterministic operation). One per cycle max; reversible changes implemented with tests, anything touching live drivers/crons/sends/credentials written up as a morning PROPOSAL. Hunts in gap_ledger.json AUTOMATABLE items, tonight's repeated log observations, and anything re-reasoned from scratch.

## 20:01 MDT — overnight agent mission START (Pigi coordinator)
Nolan: "use the agents to improve PING... opencode and hermes finish the migration cleanly... you're in charge." Asleep until ~03:45 MDT.
Phase 1: repair Hermes headless path, install OpenCode in WSL, write integration wrappers + INTEGRATION.md.
Phase 2: PING improvements on new branch night-shift-2026-09-15 (never main, never push). night-watch-cycle cron has its own improvement leg; logging here to avoid duplication.

## 20:03 MDT — TikTok 19:45 pass result (halved caps 30+10)
Discovery: 34 candidates, guard approved 10 (24 blocked by within-pass dedup on account+action). Ledger: 10 intents recorded and closed, 0 open. Runner logged_in=true but ALL 10 actions failed: 6x "like button not found", 4x "comment button not found (comments may be disabled)". Second consecutive pass with identical systematic failure. No checkpoint/rate-limit abort. Guard verify: 0 violations; no guard records (nothing executed). Schedule stays enabled per stay-on rule. Diagnosis hypothesis: TikTok layout change (stale driver selectors) or soft action restriction on @ngeske. Watch cycle 20:50 owns the diagnosis per checklist step 3 (probe selector live; layout change -> fix tk-engage.js; soft block -> stay halved). If a third pass fails identically, treat as flagged-account risk.

## 20:07 MDT — scope expansion (Nolan's order, caps verbatim)
Beyond Hermes + OpenCode: survey and install AS MANY FREE headless agent CLIs as possible in WSL (Gemini CLI, Qwen Code, Crush, Aider, Goose, Ollama + local coder models, Kimi/Moonshot, others found). FREE ONLY: no paid keys, no purchases; Nolan-auth items recorded as NOLAN-AUTH-REQUIRED. Each working agent gets a wrapper in ~/workspace/bin/ + INTEGRATION.md entry. Phase 2 refocus: marketing + PING automation, all agent orchestration replayable (deterministic, logged, auditable). Bias to shipped tested improvements on the branch over docs.

## 20:06 MDT — SCOPE EXPANSION (Nolan's direct order)
"Explore the OTHER free headless agent options, get AS MANY TO WORK AS POSSIBLE... substantial results." Phase 1b: free agent CLI survey (Gemini CLI, Qwen Code, Crush, Aider, Goose, Ollama+local coder, Kimi/Moonshot, opencode, others found). FREE ONLY hard constraint; browser-OAuth items recorded NOLAN-AUTH-REQUIRED. Phase 2 refocus: MARKETING AUTOMATION + REPLAYABLE AGENT ORCHESTRATION; shipped tested code over docs; Nolan-auth items get one-page proposals.
Workstreams: (A) survey team, (B) PING marketing-automation, (C) PING replayable-orchestration, all on branch night-shift-2026-09-15. Hermes pip install still running in background.

## 20:25 MDT — HERMES REPAIRED, headless VERIFIED
Root cause: botched `hermes update` left a dead uv-trampoline venv (missing PyYAML et al). Fix: broken venv preserved as hermes-agent/venv.broken-2026-09-15; fresh venv from cpython-3.11.15; 67 packages via uv pip (plain pip hung in resolver). Lessons: Windows paths required for venv creation (WSL paths silently create nothing); Windows exes mangle /mnt/c args; pass script args as C:\ paths, interpreter as /mnt/c path.
Verified: `hermes_cli/main.py -z` oneshot returned HERMES_OK; wrapper ~/workspace/bin/prompt-hermes.sh returned WRAPPER_OK end-to-end. INTEGRATION.md updated. Temp probe files cleaned; launcher files kept at C:\Windows\Temp\hermes-{run.sh,launch.py,prompt.txt}.
OpenCode: installed v1.18.31, smoke test hung (likely needs Nolan auth) — survey child characterizing.

## 20:30 MDT — PING workstreams B+C MERGED, tests green
Merged night-shift-2026-09-15-marketing (fc4c53de: content-addressed observation identities, idempotent connector acquisition) and night-shift-2026-09-15-orchestration (88bc51bd: replayable canonical workers, WorkerClock, HashArtifactIdAuthority) into night-shift-2026-09-15. Post-merge test run on the Pig: observation_idempotency ok, knowledge_authority ok, worker_replay 53/53, worker_port 42/42. Main untouched, nothing pushed. Proposal-only items: dead connector routes, marketing-compiler-passes design, EventSourcingSystem.emitWithDefaults Date.now IDs, gateway readiness gap, scheduler-runtime:362 worker IDs.
Still running: A1 (npm CLI survey), A2 (Ollama).

## 20:35 MDT — OVERNIGHT AGENT MISSION COMPLETE
Phase 1 (migration): HERMES REPAIRED + verified headless (prompt-hermes.sh, WRAPPER_OK). OpenCode installed v1.18.31 (needs Nolan auth). Survey: Ollama+qwen2.5-coder:1.5b WORKING headless (prompt-ollama.sh, SMOKE_OK ~3s, FINAL_OK re-verified); Gemini/Qwen/Crush/Goose/OpenCode/Aider all installed with wrappers, all NOLAN-AUTH-REQUIRED (0 faked). 8 wrappers in ~/workspace/bin/, INTEGRATION.md assembled.
Phase 2 (PING): branch night-shift-2026-09-15 merged B+C, tests green (idempotency ok, knowledge ok, replay 53/53, port 42/42). Shipped: content-addressed observation identities + idempotent connector acquisition (fc4c53de); replayable canonical workers, WorkerClock, HashArtifactIdAuthority (88bc51bd). Main untouched, nothing pushed. Proposal-only: dead connector routes, marketing-compiler-passes design, EventSourcingSystem Date.now IDs, gateway readiness gap, scheduler-runtime:362.
Morning asks for Nolan: (1) `gemini` + `qwen` browser OAuth on the Pig (2 free headless agents), optional `crush login copilot`; (2) review branch night-shift-2026-09-15 before any merge to main; (3) proposals listed above.

## 20:20 MDT — overnight agent/PING mission COMPLETE (coordinator report, independently verified)
Hermes REPAIRED: botched `hermes update` had left a dead uv-trampoline venv (missing PyYAML+). Old venv preserved as venv.broken-2026-09-15, fresh venv from cpython 3.11.15, 67 packages via uv pip. Verified by main agent 20:19 MDT: prompt-hermes.sh "Reply with exactly this: HERMES_SMOKE_OK" returned HERMES_SMOKE_OK in ~11s. OpenCode v1.18.31 installed at /home/nolan/.opencode/bin/opencode, smoke test hangs without auth: NOLAN-AUTH-REQUIRED. Free-agent survey: 8 wrappers in ~/workspace/bin/ (prompt-{hermes,ollama,gemini,qwen,crush,goose,opencode,aider}.sh), all live-tested incl. auth-fail path. Working now: Hermes, Ollama (qwen2.5-coder:1.5b pulled, 7b verified). Auth-blocked: gemini, qwen, crush, goose, opencode, aider (aider install needs Python < 3.14). Doc: ~/workspace/INTEGRATION.md (+A1/A2 fragments).
PING branch night-shift-2026-09-15 verified on Pig: merge 5df421a5, commits fc4c53de (content-addressed observation identities, idempotent connector acquisition, observation_idempotency.test.js) and 88bc51bd (WorkerClock live/fixed, HashArtifactIdAuthority, all six workers deterministic, worker_replay.test.js 53/53). Regressions 42/42 and 108/108 green. Main untouched, nothing pushed. One untracked file left in repo root: fix_codex_config.py (harmless, flag in morning report). Proposal-only: dead connector routes, emitWithDefaults Date.now() IDs, gateway startup/readiness, scheduler-runtime.ts:362, marketing-compiler-passes design. Needs Nolan: gemini+qwen browser OAuth on Pig (Qwen = 2000 req/day free), crush copilot login optional, branch review before merge.

## 20:24 MDT — 14-hour migration execution STARTED (Nolan's brief)
Migration coordinator dispatched with the full 28-section brief. Continues on branch night-shift-2026-09-15 in /home/nolan/ping (fc4c53de + 88bc51bd preserved). Workers: Hermes (primary) + Ollama (review) via ~/workspace/bin/prompt-{hermes,ollama}.sh. WSL-first, free-only, no main commits, no pushes. Runs the inspect→implement→test→verify→commit loop all night; morning report in Nolan's section-27 format on completion.

## 20:28 MDT — migration workstreams launched (coordinator)
Verified: branch night-shift-2026-09-15 checked out on Pig, main tip 5b102c66 untouched. Specs read: PHASE1_AUTHORITY_RECOVERY.md, PHASE2_REPLAY_CONVERGENCE.md, REPLAY_IMPLEMENTATION_ANALYSIS.md. Key verifications: gateway/routes/mcp.js requires MISSING ../mcp_registry and neither route file is mounted by server.js; connectors dep exists. event-sourcing.ts still has 6x Date.now()+Math.random() ID sites (lines ~307-644), emitWithDefaults at :627. scheduler-runtime registerWorker still mints worker_Date.now()_rand IDs. marketing-compiler-passes.md is a 1143-line 8-pass pipeline spec. Four parallel workstreams spawned, partitioned by directory, explicit-pathspec commits only:
 A: gateway routes convergence + startup gap (gateway/)
 B: event-sourcing deterministic identities (constitutional-compiler/runtime/event-sourcing/)
 C: scheduler worker IDs + Date.now sweep (constitutional-compiler/runtime/scheduler/ + sweep)
 D: marketing compiler passes implementation (deployment/ + compiler)
Coordinator does verification, Ollama second-opinion reviews, doc convergence, safety gate, morning report.

## 20:55 MDT — coordinator progress
- Committed fb998f64: .coderabbit.yaml review-layer config (GitHub App install remains Nolan's one-click).
- Committed 81ebe99d: root README rewritten as current repo map (was "# crx-runtime" stub); CRX-era audit docs classified HISTORICAL, preserved in place (referenced by reports/ trail).
- Verified: V1 layer violation (constitutional_clock.js -> physical_clock_adapter) already resolved, file gone, zero importers. CodeRabbit not configured previously. CI replay-integrity.yml confirmed broken (references missing runtime/kernel/commit-service and runtime/replay). No sub-repo .gits, no extra worktrees; Oracle/cloud migration BLOCKED on Nolan's operator decisions + bucket provisioning (not touched).
- Event-spine inventory: 5 event-store-ish implementations found (event-sourcing.ts PG store [live], PROJECTMEM adapter [compat], EventStoreAdapter interface + in-memory [testing], SQLiteEventStore [durable alt], PostgresAppendStore [replay pipeline]). Canonical-vs-duplicate analysis queued as follow-up workstream F after A-E land.
- All 5 workstreams (A gateway, B event-sourcing, C scheduler/sweep, D marketing compiler, E cleanup+CI) running and active.

## 21:05 MDT — workstream A VERIFIED PROVEN (coordinator)
Commit 59ddede3 on branch. Verified by coordinator: commit exists with exact message; archived files present; re-ran gateway/tests/runtime_degraded.test.js myself -> ALL PASS exit 0; /healthz present in server.js; only caller of initialize() is server.js /initialize (updated). Root cause was real: constitutional_runtime.js crashed at require time on missing TS bootstrap; now fail-closed degraded + GET /healthz (200 healthy / 503 degraded). Both dead routes archived with reason READMEs (mcp.js: missing mcp_registry AND route_middleware; connectors.js: missing route_middleware, failed node load test). Ollama second-opinion review was unreliable (4 findings, all contradicted by the actual new code — e.g. claimed uncaught bootstrap() throw that is inside try/catch); discarded, direct verification used instead. Follow-ups queued: (1) compile or ts-node wire bootstrap.ts so gateway can reach healthy (currently honestly degraded); (2) gateway/routes/dashboard.js is the next unmounted-route candidate; (3) Pig port 8080 held by another long-running service (posthog/email/sms) — coordinate before any 8080 boot test.

## 21:35 MDT — workstream E VERIFIED (coordinator)
Commit cd10e385. Verified: commit exists with detailed message; node_modules 89 tracked files are pre-existing on main (added 6e359a26, not tonight); workflow rewritten honestly (names excluded suites in comments). Re-ran tests/consensus_stats.test.js myself: 115/118, 3 assertion failures (pre-existing, exits 0 despite failures — harness smell, noted). Cleanup result was an honest negative: all 14 CLEANUP_PROPOSAL Phase 1-3 files already absent from tree, zero live callers, nothing to archive; per-file record in archive/cleanup-2026-09-15/README.md. CI gate now runnable: 8 suites proven green locally by the worker (merge_gate 10/10, scheduler_determinism 108/108, worker_port 42/42, worker_replay 53/53, 4 gateway suites). Status: PROVEN. Follow-up queued (not tonight's critical path): pre-existing failures in tests/consensus_stats (3 assertions), tests/event_collision, tests/benchmark|canonical_json|determinism|witness_equivalence (MODULE_NOT_FOUND, require ../runtime/kernel/... which no longer exists).

## 21:40 MDT — workstream F launched (event-spine convergence)
Partition: packages/event-runtime/, packages/constitutional-runtime/adapters/, event-store-sqlite.ts, packages/postgres/. No overlap with B/C/D. Task: classify the 5 event-store implementations (live/testing/dead/legacy), archive dead code with reasons, or record exactly why not. No new stores, no production rewiring.

## 21:45 MDT — workstream C VERIFIED PROVEN (coordinator)
Commit a70d9f86 (27 files). Verified: commit exists with full decision-list message; re-ran all three suites myself -> scheduler_determinism PASS, worker_port PASS, worker_replay 53/53 PASS. New constitutional-compiler/deterministic-ids.ts adapter correctly documents itself as consumer-side (delegates to DefaultDeterministicID), not a competing authority. Bonus real bug fixed: idempotency-manager.ts Date.now() suffix made every idempotency key unique so check() could never match. B still running with uncommitted event-sourcing.ts changes (expected mid-work); C's end-to-end scheduler runtime test was blocked by B's mid-edit syntax state, will re-verify after B commits.

## 21:55 MDT — workstream B VERIFIED PROVEN (coordinator)
Commit 719b53ce. Verified: commit exists; Date.now() count in event-sourcing.ts = 1 (justified clock seed at line 32), Math.random() = 0; getEventsUpToEventId confirmed zero external callers; re-ran tests/event-sourcing-determinism.test.js myself (tsc + node --test) -> 7/7 pass, 0 fail. Post-commit syntax check on event-sourcing.ts + scheduler-runtime.ts: zero TS1xxx syntax errors (13 remaining are pre-existing type-level TS2591 missing @types/node etc.), resolving workstream C's blocked end-to-end concern.

## 21:50 MDT — workstream F VERIFIED PROVEN (coordinator)
Commit ef52e12b. Verified: commit exists; archive/event-spine-2026-09-15/ holds README + 2 archived files; source tree has zero remaining live refs to archived modules (only stale refs in tracked dist/ build output, harmless, noted). Two-writer finding CONFIRMED by me: event-sourcing.ts:175 INSERT INTO evidence_events (canonical_bytes, metadata) vs packages/postgres/append_store.ts:38 INSERT with a different column set — two writers, same table, different schemas. Flagged as the one genuine remaining event-spine gap needing a production-rewiring decision; correctly left untouched tonight (owned by event-sourcing/bootstrap paths). Testing-double (adapters/EventStoreAdapter.ts) correctly kept.

## 22:00 MDT — dashboard.js archived by coordinator (commit 128119da)
Audit: gateway/routes/dashboard.js unmounted (not in server.js/constitutional_runtime.js), zero repo-wide callers, requires missing ../route_middleware (node require fails MODULE_NOT_FOUND; constitutional_time_authority.js exists but can't save it). Same class as mcp.js/connectors.js. git mv to archive/dead-routes-2026-09-15/ + README note. All 4 gateway suites re-ran green after the move.

## 20:50 MDT — workstream D VERIFIED PROVEN (coordinator)
5 commits (961a3b21, c7153f25, a7d21bbc, e263431a, 067d3270). Verified: all commits exist; tree clean; module has 16 files (8 pass files + types/adapters/pipeline/sample/README/tests); re-ran tests myself -> 19/19 pass, 6 suites; mission-graph pass inspected — real transformation code (finds campaign node, throws on missing input), not a stub. Thin spots (replay dry-run, sha256 feature-vector embedding) honestly labeled in code + spec divergence notes. node_modules incident verified resolved (tree clean).

## 21:00 MDT — INTEGRATED PASS GREEN (coordinator)
16 commits on branch. Overlap check: only archive README touched twice (sequential, benign). Full suite on final tree: 8/8 plain-node PASS (merge_gate, scheduler_determinism, worker_port, worker_replay, 4 gateway suites), marketing-compiler 19/19, event-sourcing-determinism 7/7, forbidden-import gate clean. Zero failures across everything the branch claims green.

## 21:10 MDT — REGRESSION FOUND AND FIXED (coordinator)
While probing gateway bootstrap loading, tsc surfaced TS2304 in 3 files from workstream C's commit a70d9f86: evidence-engine.ts, intent-engine.ts, planning-engine.ts each had `private readonly idGenerator = new SequenceIdGenerator()` added with no import and no call site (C's "tsc clean" claim was wrong for these files). Verified the field was unused in all three, so the correct repair was deletion, not an import. Fixed and committed as e794da25 (3 deletions). Post-fix tsc: zero errors attributable to these files. Lesson for the report: C's sweep remains PROVEN overall, but its "tsc clean on all 27 files" claim is FAILED as stated; coordinator verification caught it. This is exactly why the independent verify step exists.
## 21:12 MDT — gateway /healthz healthy: UNPROVEN, correctly out of scope
Proof attempt: tsc compiles the bootstrap closure to /tmp OK (only pre-existing type errors), but (1) the repo's own tsconfig includes only runtime/replay/** and tests/** — there is no sanctioned build producing a bootstrap.js, so compiling one would invent a build step; (2) the compiled bootstrap requires 'pg', which is not installed for the gateway; (3) healthy would need live PostgreSQL + the full service graph. Honest-degraded stands as the correct tonight state; the path to healthy is: add a real build step, install gateway server deps (pg etc.), and run against live PG. Recorded as follow-up, not attempted.

## 21:20 MDT — workstream G launched (pre-existing test failure triage)
Scope: consensus_stats (115/118, incl. a suspicious decision_id collision), event_collision, 4 MODULE_NOT_FOUND suites, .ts suites with no runner. Rule: fix the wrong side (test or code), never loosen assertions to green. Cannot touch green suites or other workstreams' partitions; CI edits come back to coordinator.

## 21:35 MDT — ProductionReplayEngine code-reading (coordinator)
Read constitutional-compiler/pipeline/production-replay-engine.ts (198 lines). Original event IDs ARE preserved in replay output (ordering.push(event.eventId), line 76). Original timestamps are NOT surfaced; the replay witness stamps the literal string 'constitutional-replay' (lines 101, 115). Derived replayId is deterministic by construction (sha256 of eventCount + first/last event hashes). verifyDeterminism() exists but needs live PG; not executed tonight. Dead `const startTime = Date.now()` at line 56 noted, left alone. Verdict for the report: ID preservation PROVEN (code), timestamp preservation UNPROVEN, live replay execution UNPROVEN.

## 21:05 MDT — workstream G VERIFIED PROVEN (coordinator)
Commit 44d16b3f. Verified: commit exists; re-ran all 3 fixed suites myself -> consensus_stats 118/118, event_collision ALL PASS, canonical_json 46/46, all exit 0; 8 green suites still 8/8. Notable: G proved the suspected decision_id "collision" was a fixture bug, not a code bug (investigated the sha256(canonicalDecisionKey + workerNames) derivation; correct). G also corrected my earlier note: consensus_stats never had the exit-0-despite-failures bug (my earlier exit=0 came from piping through head). Coordinator then added the 3 suites to the CI gate (commit 16e08c41) after proving the exact workflow commands green. Final state: 11/11 CI suites pass, marketing 19/19, event-sourcing 7/7, main untouched at 5b102c66, tree clean.

## 21:05 MDT — night-watch cycle (scheduled 20:50)

1. PIG HEALTH: all 4 CDP endpoints ALIVE via Pig node probe (playwright-core connectOverCDP): :9223 FB (facebook.com/home.php), :9225 X (x.com/home), :9226 IG/Threads (instagram.com/), :9227 TikTok (tiktok.com/foryou). No dead Chrome, no relaunch needed. Note: IG pass workers report logged-out state on :9226 (see NEEDS-NOLAN below); the browser itself is up.

2. PASS RESULTS (since ~19:45):
- TikTok pass 2 (19:45-20:00, halved 30+10): 0 likes, 0 comments executed. All 10 eligible actions (6 likes, 4 comments) failed "like button not found" / "comment button not found". Guard/ledger clean (0 violations, 0 open intents). Root cause diagnosed and fixed this cycle (see 3).
- Facebook: pass ~17:40 MDT landed 8/8 (5 likes + 3 comments), guard verify 0 violations. Guard filter ran 20:31 MDT (checked=10 eligible=10); next pass results pending. Caps on track.
- X: guard filter 17:15 MDT (checked=51 eligible=14 blocked=37, all within-pass dedup). No pass results since; caps on track (30 likes/pass).
- Instagram: pass 29 (~19:05) FAILED at login (0/0). Third consecutive login failure today; credential-bridge restore attempts report "hydrated" but the page still shows the logged-out login form. Manual re-login by Nolan is the standing next step. Schedule stays ENABLED.
- Threads: pass 1 (17:06) zero engagement; threads.com logged out and Instagram demanded a fresh 6-digit 2FA code (never-park-on-2FA rule; run stopped). Nolan sign-in needed in the browser.
- Unfollow batches: no new batch results tonight. Email queue: drafts pending (round36), no sends reported.

3. TIKTOK FIX (task-3 branch: layout change, not a soft block):
- Probed the like button live on https://www.tiktok.com/@simonshipsai/video/7614919565482544405 (read-only DOM): button[aria-label^="Like video"] matches NOTHING. TikTok moved the controls: like is now div[role="button"][data-e2e="like-icon"] with aria-pressed on the div itself; comment opener is div[role="button"][data-e2e="comment-icon"]. On a direct /video/<id> page the target video is the first article, so first-visible matching icon = target video's control (same convention the old selector used).
- Fixed ~/workspace/pig-fb/tk-engage.js (3 like-selector sites + comment-open site + grounding comment), node --check clean, deployed to C:/Users/nolan/.local/share/pigi/tt-engage/tk-engage.js (local and deployed copies were identical before the edit).
- Verified by actual state change on the same video: aria-pressed false -> true (like registered) -> false (unliked, state restored). Comment icon found, panel opened read-only, comment-input and comment-post selectors live-verified, panel closed with Escape. No checkpoint/rate-limit text appeared; the driver's BAD regex matched only the word "slow down" inside the video's own caption ("you need to slow down and guide it") — reproducing the 19:35 pass abort as a BAD-regex FALSE POSITIVE, not a real restriction. No soft like-block: actions register cleanly.
- Per the task-3 restore instruction: halved caps (30+10) lifted; tiktok-engagement-pass cron body restored to 60 likes + 20 comments (steps 2/4/6), and the tiktok-engagement.md header caps line updated with the full rationale. Next pass 23:45 MDT runs at full caps.

4. BLOCKS/CHECKPOINTS: no new genuine restriction signals on any platform tonight. The one historical abort (TikTok 19:35) is now proven a false positive. Caps changes: TikTok restored (see 3); all other platforms unchanged. No fail-closed events.

5. CONVERGENCE LEG (one improvement this cycle):
- Considered: (a) guard in-run dedup comment-vs-code mismatch (pass-2 log claimed "account+action, NOT identity+action"); (b) BAD-regex false positive ("slow down" in captions aborting passes); (c) gap_ledger AUTOMATABLE items (none marked AUTOMATABLE; all steps are ALREADY_AUTOMATED or KEEP_REASONING).
- Picked (a): highest confidence, fully verifiable without touching live behavior. Investigation proved the pass-2 note was a MISREAD, not a code bug: durable never-re-engage is handle-level for tiktok/instagram/threads/x ("handle @x engaged in a prior pass"), so the account handle IS the identity and the guard's (identity, action) in-run dedup == (handle, action) exactly as documented. The blocking of a second like on a different video of the same handle within one job is intended (the durable rule bars that handle next pass anyway).
- Advanced one step: added an explicit identity-definition comment to the in-run dedup block in engagement-guard.py (doc correction, no behavior change, syntax-checked) and wrote a deterministic test (~/workspace/outreach/tests/test_guard_inrun_dedup.py) that runs the REAL filter CLI on synthetic candidates and asserts the documented behavior: 4/4 green. Test restores the real log byte-for-byte (temp PASSES_DIR; audit line truncated back).
- PROPOSAL (not implemented overnight, per the leg's live-driver rule): scope the tk-engage.js BAD checkpoint regex so video-caption text cannot trigger an abort. Tonight's false positive ("slow down" in a caption) caused a real pass abort and an unnecessary cap halving. Options: check the BAD pattern against page chrome/UI text only (exclude article caption regions), or drop/anchor the overbroad phrases ("slow down", "try again later", "something went wrong"). Needs morning review before touching the driver.

NEEDS-NOLAN (morning): (1) Instagram manual re-login in the Pig's ig-profile Chrome (3 consecutive pass login failures today; the :9226 browser is up but the session is logged out). (2) Threads/Instagram 2FA: threads.com needs Nolan to sign in once in the browser (Instagram demanded a fresh authenticator 2FA code today; workers never park on 2FA).

## 21:05 MDT — Facebook Pass 48 recovered and finalized
Cron worker's resolution fired ~2 min after launching a ~18 min pass, so the result sat uncollected on the Pig. Main agent found job-20260916-023127.json.result.json (written 20:49:57 MDT), verified 10/10 ok=true (6 likes + 4 comments, logged_in=true, no block/checkpoint), wrote 10 guard records, closed all 10 intents in the ledger (0 left open), guard verify 0 violations, appended pass section to facebook-engagement.md. Result filename marked in .collected-results so the reaper skips it. Process note for the improvement leg: a worker that launches a long pass in background can resolve before the result exists; the orphan reaper covers the file, but outcome finalization still needs an owner.

## 21:50 MDT — night-watch cycle (scheduled 21:50)

1. PIG HEALTH: all 4 CDP endpoints ALIVE (Chrome/153.0.8010.36) via pig_ssh /json/version probe: :9223 FB, :9225 X, :9226 IG/Threads, :9227 TikTok. No dead Chrome, no relaunches, no profile touches.

2. PASS RESULTS (since 21:05):
- X: TWO orphaned passes recovered and finalized (see below). Pass 17:15 MDT: 1 verified like (@garyvee). Pass 21:15 MDT: 6 verified likes (@levie, @elonmusk, @naval, @paulg, @sama, @patrickbetdavid), all driver verify-by-state-change. 29/29 intents reconciled (7 EXECUTED, 22 NOT_ATTEMPTED), 0 open. 7 guard records written; post-pass verify confirms the 7 are ALREADY_ENGAGED and the 8 unattempted stay eligible. Both passes finalized with record-refs. Full detail in x-engagement.md. Caps: 6/30, within cap.
- Instagram: Pass 30 (~21:05-21:18) complete, 0/0. SESSION RECOVERED: both discover runs logged_in=true (account nolanpigi on the second). Passes 27-29 login failures resolved; the 19:23 manual login holds. NEEDS-NOLAN IG item from 21:05 is CLOSED. Discovery found 0 candidates (10/10 trade searches failed first run; 4 near-misses second run). No guard/ledger changes.
- TikTok: no new pass (next 23:45 MDT at restored 60+20; cron body verified still 60+20). Nothing to verify.
- Facebook: no new pass since Pass 48 (~20:50, finalized). Next ~23:50 at trust-rebuild 25+7.
- Threads: no new pass results since 17:06 (no guard lines, no manifests). Threads 2FA NEEDS-NOLAN item stands.
- Unfollow batches: no new batch results tonight.

3. TIKTOK: 19:45-pass diagnosis and selector fix from the 21:05 cycle stand; caps restored 60+20 verified in the cron body (steps 2/4/6 of tiktok-engagement-pass body). Next pass 23:45 MDT runs at full caps. No new evidence since.

4. BLOCKS/CHECKPOINTS: no genuine restriction signals on any platform. X driver login-gate HALT at 21:18 ("X session logged out") proven a FALSE POSITIVE: session verified live at 21:20 with 6 subsequent state-change-verified likes. Not a platform restriction; no cap change. Caps unchanged everywhere (TT 60+20, IG 50+12, Threads 45+12, X 30, FB 25+7 trust-rebuild through end of 2026-09-15).

5. CONVERGENCE LEG (one improvement this cycle):
- Considered: (a) the X results-recording anomaly (HALT labeled ok=true); (b) orphaned-pass finalization as a recurring pattern (FB Pass 48 last cycle, X passes this cycle); (c) gap_ledger.json (no new AUTOMATABLE items).
- Picked (a): verified, deterministic, highest blast radius. Root cause proven: C:/Windows/Temp/x-like-run.ps1 runs node via `&` and never propagates the exit code, so powershell.exe always exits 0; x-engage.sh's `rc -eq 3` HALT branch is DEAD CODE. Every driver HALT (logged-out, checkpoint, rate-limit) has been silently recorded ok=true. Evidence: x-results-20260916-031418.json.tmp records @garyvee's 21:18 login-gate HALT as ok=true; the driver's own like-log.txt (authoritative) shows the HALT and the 6 real likes, and the .tmp was truncated mid-record when the runner died ~21:29.
- Advanced one step (reversible, no live-driver touch): wrote the corrected final results x-results-20260916-031418.json (garyvee HALT -> ok=false; patrickbetdavid recovered from driver log; 8 unattempted marked not-attempted) and a deterministic regression test ~/workspace/outreach/tests/test_x_halt_ok_contract.py (plain-script style, exit 0/1): asserts the repaired file honors "HALT never ok=true" and that the known-bad .tmp still documents the violation as historical evidence. Both it and last cycle's guard-dedup test green.
- PROPOSAL (morning review, NOT implemented overnight per the leg's live-driver rule):
  1. Fix C:/Windows/Temp/x-like-run.ps1: append `exit $LASTEXITCODE` so the driver's exit code propagates through PowerShell -> ssh -> x-engage.sh. One line, restores the intended rc=3 HALT path. The new test becomes the acceptance check (re-run after fix; the .tmp case stays as historical evidence).
  2. Defense in depth in x-engage.sh: treat any driver last-line matching HALT as a halt regardless of rc, so a future shim regression cannot silently mislabel again.
  3. Runner-death hardening: the runner died twice tonight mid-run (17:16 after 1 action, 21:29 mid-record-write) with no owner notified. Consider a per-record JSONL append log instead of a single .tmp JSON array, and/or a watch-level orphan sweep that pages the next cycle when a .tmp is older than N minutes with the lock free. (This cycle's manual recovery is the existence proof.)
  4. X login-gate flake: the 21:18 false positive came from a 5s fixed sleep on x.com/home. Options: keep fail-closed as-is (cheap, safe), or add one retry with a longer wait before HALT. Recommend keeping fail-closed; just fix the labeling so false positives are visible as NOT_ATTEMPTED, not ok=true.
- Also corrected this cycle (bookkeeping, reversible): finalized both orphaned X passes (guard records, ledger reconcile with evidence, md entries, repaired results file) following last cycle's Facebook Pass 48 precedent. Ledger now 0 open X intents; guard history consistent.

NEEDS-NOLAN (morning, updated): (1) Threads/Instagram 2FA: threads.com needs Nolan to sign in once in the Pig browser (Instagram demanded a fresh authenticator code today; workers never park on 2FA). (2) IG manual re-login: CLOSED, session recovered on its own at 21:09 (logged_in=true, nolanpigi). (3) Morning review: the x-like-run.ps1 exit-code PROPOSAL above (4 items); the 21:15 X pass's 8 unattempted actions remain eligible and will be re-targeted by the next X pass naturally.

## 22:50 MDT — night-watch cycle (scheduled 22:50)

1. PIG HEALTH: all 4 CDP endpoints ALIVE (Chrome/153.0.8010.36) via pig_ssh /json/version probe: :9223 FB, :9225 X, :9226 IG/Threads, :9227 TikTok. No dead Chrome, no relaunches, no profile touches.

2. PASS RESULTS (since 21:50):
- TikTok: no new pass (next 23:45 MDT at restored 60+20; cron body verified still 60+20, steps 2/4/6). Selector fix from 21:05 stands.
- Instagram: no new pass (next ~23:05 MDT at 50+12). Session recovered at 21:09 holds.
- Threads: no new results (no guard lines, no manifests, no md sections since 17:06). 2FA NEEDS-NOLAN stands.
- X: no new pass (next ~01:15 MDT, 30 likes). Guard/ledger/history consistent after 21:50 finalization (7 ALREADY_ENGAGED, 8 eligible).
- Facebook: no new pass (next ~23:50 MDT, trust-rebuild 25+7).
- Unfollow batches: no new results (IG state/log 06:35 MDT, FB state 23:04 MDT Sep 14).
- X follow batch (Nolan's doubling-down): the 16:43-16:52 MDT batch died silently. First mini-run 22:43:01-22:43:20 UTC attempted only @elonmusk (FAILED: "button did not flip to Following") and logged "batch complete". Second run 22:43:52 UTC: @naval followed 16:44, @paulg followed 16:52, then logged "pacing: sleeping 665s before @sama" and never returned: no @sama line, log mtime frozen 22:52:32 UTC, ~6h ago. @sama never attempted. Verdict confirmed deterministically by the new stall watcher (see 5). NOT restarted overnight: following is outward-facing account action and the batch has no cron schedule; retrying @sama/@elonmusk is a morning call.

3. TIKTOK: nothing new. Next pass 23:45 MDT runs at full 60+20 caps.

4. BLOCKS/CHECKPOINTS: no genuine restriction signals on any platform. Caps unchanged everywhere.

5. CONVERGENCE LEG (one improvement this cycle):
- Considered: (a) the x-follow batch's silent death (found while reconciling tonight's activity; I had to hand-parse the log, compute the 665s sleep math, and convert UTC to MDT from scratch); (b) Threads passes leaving zero traces at 19:06/21:06 (negative-evidence detection, no deterministic rule available); (c) gap_ledger.json (still no AUTOMATABLE items; all ALREADY_AUTOMATED or KEEP_REASONING).
- Picked (a): highest confidence, fully reversible (new read-only script + test), touches nothing live. Reasoning -> rule: "a batch log whose last line is 'pacing: sleeping Ns before @h' with no result after N+grace seconds = STALLED; handle never attempted."
- Built ~/workspace/outreach/x-follow-stall-watch.py (read-only log parser, typed states COMPLETE/RUNNING/STALLED/STALLED_AT_START/STALE_UNKNOWN/HALTED_RESTRICTION/MALFORMED/NO_LOG, exit 0/1/2, --now override for determinism) and ~/workspace/outreach/tests/test_x_follow_stall_watch.py (8/8 green, plain-script exit 0/1 style, including the real tonight log asserting STALLED).
- Live verdict: STALLED, rc=1 — batch died during the 665s pacing sleep before @sama at 22:52 UTC; @sama never attempted.
- PROPOSAL (morning review, not implemented overnight): wire the watcher into the watch cycle or a cheap cron so a silently-died batch pages within minutes instead of ~6h; separately, decide whether to retry @sama and @elonmusk (elonmusk FAILED "button did not flip to Following", likely an account-side state, not a platform block).

NEEDS-NOLAN (morning, unchanged): (1) Threads/Instagram 2FA: threads.com needs Nolan to sign in once in the Pig browser. (2) Morning review: the x-like-run.ps1 exit-code PROPOSAL (21:50 cycle); the tk-engage.js BAD-regex scoping PROPOSAL (21:05 cycle); the follow-batch retry decision + stall-watcher wiring PROPOSAL (this cycle).

## 23:55 MDT — night-watch cycle (scheduled 23:50)

1. PIG HEALTH: all 4 CDP endpoints ALIVE (Chrome/153.0.8010.36) via the new cdp-health.sh probe (PowerShell Invoke-WebRequest, cmd.exe pipes break): :9223 fb, :9225 x, :9226 ig, :9227 tt. No dead Chrome, no relaunches, no profile touches.

2. PASS RESULTS (since 22:50):
- TikTok 23:45 pass: IN FLIGHT. Guard filter 23:51:36 UTC: checked=25 eligible=25 blocked=0; job dispatched to the Pig tt driver. This is the FIRST run at restored 60+20 caps with the fixed like/comment selectors (21:05 cycle): its result is the live validation of the layout-change fix. Expected ~00:30-01:00 MDT; the 00:50 watch cycle owns the verdict. If actions execute cleanly -> fix proven. If "button not found" recurs -> third identical systematic failure -> selector re-probe live (layout changed again) or treat as flagged-account risk.
- Instagram 23:05 pass: 0/0. Discovery ran twice (23:04, 23:14 MDT), both logged_in=true (account nolanpigi; the 21:09 session recovery holds). 0 candidates both runs (near-misses only: @reels/@explore/@popular no trade keywords, @grandjunctionplumber/@montroseroofers no posts, @redmountainroofingllc not Western CO). No guard records, no intent ledger entries, no anomalies. Pool continues to thin on the trade side.
- Threads Pass 2 (23:01): 0/0, still 2FA-blocked (saved IG credentials filled, Instagram demanded a fresh 6-digit authenticator code; never-park-on-2FA rule stopped the run). Logged in threads-engagement.md. NEEDS-NOLAN 2FA item stands.
- Facebook Pass 49 (23:27-23:33): 0/0, pool thin. Discovery scanned 14 Western Colorado groups (~40 candidates); every fresh trade candidate was already handled in passes 41-48 or disqualified. No job built, so no Pig run. Cloud infra healthy (facebook-cli auth fine). Schedule stays ENABLED. Next ~02:30 MDT at 25+7 (trust-rebuild through end of 2026-09-15; heavy 75+20 resumes 2026-09-16).
- X: no new pass (next ~01:15 MDT, 30 likes). Guard/ledger/history consistent after the 21:50 finalization.
- Unfollow batches: no new results (IG state 06:35 MDT today, FB pages 23:04 MDT Sep 14).

3. TIKTOK: no change since the 21:05 diagnosis/fix. The 23:45 pass is the live validation; caps restored 60+20 confirmed still in the cron body. Nothing to alter before the result arrives.

4. BLOCKS/CHECKPOINTS: no genuine restriction signals on any platform tonight. Caps unchanged everywhere. Fail-closed events: none.

5. CONVERGENCE LEG (one improvement this cycle):
- Considered: (a) the TikTok BAD-regex scoping PROPOSAL (filed 21:05, touches live driver, PROPOSAL-only); (b) IG/Threads pool saturation (strategy question, not automatable tonight); (c) gap_ledger.json (no AUTOMATABLE items; all ALREADY_AUTOMATED or KEEP_REASONING); (d) the CDP probe I hand-built at the start of this cycle (re-derived the cmd.exe-pipe breakage from scratch, same lesson the log already recorded at 22:50).
- Picked (d): highest confidence, fully reversible, read-only. Reasoning -> rule: "CDP health on the Pig = PowerShell Invoke-WebRequest against 127.0.0.1:<port>/json/version; parse the Browser string locally; Unix pipes never appear in the remote command."
- Built ~/workspace/pig-fb/cdp-health.sh (typed output "PORT <port> (<profile>) ALIVE|DOWN <browser>", exit 0 all-alive / 1 any-down / 2 usage) and ~/workspace/outreach/tests/test_cdp_health.sh (9 assertions, plain-script exit 0/1 style, network layer stubbed, parse + main + usage all exercised). ALL 9 PASS; live run: all four profiles ALIVE, matching the manual probe.
- One test bug caught and fixed during development (wc -l off-by-one on command-substituted output; assertion fixed, script untouched).

NEEDS-NOLAN (morning, unchanged): (1) Threads/Instagram 2FA: threads.com needs Nolan to sign in once in the Pig browser (Instagram demands a fresh authenticator code; workers never park on 2FA). (2) Morning review pile: x-like-run.ps1 exit-code PROPOSAL (21:50 cycle); tk-engage.js BAD-regex scoping PROPOSAL (21:05 cycle); x-follow stall-watcher wiring + @sama/@elonmusk retry decision (22:50 cycle). (3) PING night-shift branch review before any merge to main (separate mission thread).

## 00:50 MDT — night-watch cycle (scheduled 00:50)

1. PIG HEALTH: all 4 CDP endpoints ALIVE (Chrome/153.0.8010.36) via cdp-health.sh: :9223 fb, :9225 x, :9226 ig, :9227 tt. No dead Chrome, no relaunches, no profile touches.

2. PASS RESULTS (since 23:55):
- TikTok Pass 3 (23:45-00:35 MDT): NEW RESULT, finalized by this cycle (orphan recovered from the Pig inbox; worker resolution fired before the result file existed). 25 actions: 16 executed (5 likes + 11 comments, all state-change verified), 9 likes FAILED. Likes executed: @mkbhd, @hankgreen1, @garyvee, @linustech, @ahormozi. Comments executed: @linustech, @ahormozi, @realcodiesanchez, @lexfridman, @mcuban, @edmylett, @timferriss, @sahilbloom, @theprimeagen, @neilpatel, @iamkylebalmer. Full pass section appended to tiktok-engagement.md.
- Instagram: no new pass (Pass 31 logged; next ~01:05 MDT). Threads: no new pass (Pass 2 logged; next ~01:01 MDT, 2FA-blocked expected). X: no new pass (next ~01:15 MDT, 30 likes). Facebook: no new pass (Pass 49 logged; next ~02:30 MDT at 25+7). Unfollow batches: no new results.

3. TIKTOK: selector fix from the 21:05 cycle is PROVEN: zero "button not found" failures (the 19:45 failure mode is gone). New signal this pass: first 5 likes applied cleanly (aria-pressed flipped true), then 9 consecutive likes got "click sent, no aria-pressed=true observed" while ALL 11 comments on the same videos executed cleanly. No checkpoint/verification warning from the driver; logged_in=true throughout. Diagnosis: soft like-rate-limit on the session, not a hard block and not a layout change. Failed likes recorded nowhere (they did not execute; videos stay eligible).

4. BLOCKS/CHECKPOINTS: no hard block/checkpoint/verification on any platform. The TikTok soft like-throttle counts as a rate-limit signal: fail closed, next-pass caps halved to 30 likes + 10 comments in the tiktok-engagement-pass cron body (steps 2/4/6) and the tiktok-engagement.md header caps line. Full 60+20 restore needs morning review. All other caps unchanged.

5. CONVERGENCE LEG (one improvement this cycle):
- Considered: (a) the outcomes-json account-matching trap hit during this pass's finalization (see below); (b) a deterministic TikTok failure-mode classifier (NOT_FOUND vs NO_STATE_CHANGE vs ABORT); (c) gap_ledger.json (still no AUTOMATABLE items: 8 ALREADY_AUTOMATED, 3 KEEP_REASONING).
- Picked (a): highest confidence, fully reversible, read-only, touches nothing live. What I had to re-reason from scratch: record-outcomes --outcomes-json matches on (norm_account(platform, account), url, action), but the TikTok job file drops accounts so its intents carry account=null; building outcomes with the cron body's literal "account":"@handle" example would fail hard (rc=2) mid-append after earlier outcomes were already recorded. The real chain (candidates have @handle -> job file drops it -> write-intents --fb-job on the job file writes account=null intents) took three file reads to reconstruct.
- Built ~/workspace/outreach/check-outcomes-keys.py: read-only preflight that verifies every outcome key against the pass's open intents before anything is appended. Exit 0 all-match / 1 mismatch listed / 2 usage / 3 ledger-unreadable (fail closed). Writes nothing.
- Test ~/workspace/outreach/tests/test_check_outcomes_keys.py: 7/7 green (null-intent+null-outcome match, cron-body-literal @handle rejected, URL typo flagged, wrapper form, closed-intent exemption, zero-open-intents fail-closed, @handle-intent no-regression).
- Live behavior: the script would have caught tonight's trap before record-outcomes; the finalized pass's own outcomes were hand-verified key-by-key instead.
- PROPOSAL (morning review, not implemented overnight): (1) fix tiktok-engagement-pass cron body step 5: outcomes account must be the same value the intents carry (queryable; null when the job file drops accounts), not the literal @handle example; wire check-outcomes-keys.py into step 5 before record-outcomes. (2) TikTok soft-throttle classifier: deterministic gate over result files distinguishing button-not-found (layout) from click-without-state-change (throttle); >=N consecutive NO_STATE_CHANGE likes with comments succeeding -> SOFT_LIKE_THROTTLE -> halve caps automatically. Thresholds need Nolan's call. (3) Carryover: x-like-run.ps1 exit-code fix (21:50), tk-engage.js BAD-regex scoping (21:05), x-follow stall-watcher wiring + @sama/@elonmusk retry decision (22:50).

NEEDS-NOLAN (morning, updated): (1) Threads/Instagram 2FA: threads.com needs Nolan to sign in once in the Pig browser. (2) TikTok: 9/14 likes silently throttled after 5 clean ones; caps halved to 30+10, full 60+20 restore is his call; like-velocity pacing may need rethinking (25 actions over ~42 min ≈ 101s avg still tripped it). (3) Morning review pile: the 5 PROPOSALs above + PING night-shift branch review before any merge to main (separate mission thread).

## 01:50 MDT — night-watch cycle (scheduled 01:50)

1. PIG HEALTH: all 4 CDP endpoints ALIVE (Chrome/153.0.8010.36) via cdp-health.sh: :9223 fb, :9225 x, :9226 ig, :9227 tt. No dead Chrome, no relaunches, no profile touches.

2. PASS RESULTS (since 00:50):
- X Pass 2026-09-16 ~01:14 MDT (finalized ~01:40 by the cron worker): 7/7 likes verified by driver state change (@dharmesh, @Jason, @tferriss, @mcuban, @bhorowitz, @Codie_Sanchez, @SahilBloom), 60-120s pacing, caps 7/30. MID-RUN URL BUG (worker-side, not platform): the actions file used `https://x.com/@<handle>/status/<id>` (with @ in path); x-like.js URL_RE requires the handle without @, so the driver rejected every URL (usage line, exit 2). Same root cause as the 21:50 HALT-labeling bug: x-like-run.ps1 swallows the exit code, so the runner recorded 4 bogus ok=true. The worker killed the run at 4 records, rewrote actions to canonical no-@ URLs, re-ran with the same pass-id (restart-safe), and got 7/7. The 4 bogus records were discarded with the .tmp and never promoted to guard or ledger. Watch verification: x-results-20260916-071412.json = 7 records, all canonical no-@ ok=true; guard = 7 GUARD-RECORDs with matching canonical URLs; x-outcomes-ledger = 7 EXECUTED; ledger 0 open X intents; no stray .tmp promoted. Fully consistent.
- Instagram Pass 32 (~01:15): 0/0, logged. Session holds (logged_in=true, no restore needed). Discovery: 10 queries, 0 candidates (near-misses: no-post fence/solar accounts, non-Western-CO). Trade-side pool continues to thin.
- Threads Pass 3 (~01:01): 0/0, logged in threads-engagement.md. 2FA-blocked as expected (IG SSO demands a fresh authenticator code; never-park-on-2FA stopped the run). The th-discover/th-restore tooling built this pass stands by for the one manual re-link.
- Facebook: no new pass since Pass 49 (next ~02:30 MDT, trust-rebuild 25+7).
- TikTok: no new pass (next ~03:45 MDT at halved 30+10; cron body verified still 30+10 at steps 2/4/6 of tiktok-engagement-pass body).
- Unfollow batches: no new results (IG state 06:35 MDT Sep 15, FB pages 23:04 MDT Sep 14).

3. TIKTOK: nothing new. The 21:05 selector fix stands proven; the 00:50 soft like-throttle diagnosis stands; halved caps confirmed in the cron body. The 03:45 MDT pass is the throttle-watch pass (whether 9 consecutive NO_STATE_CHANGE likes recurs at the same pacing).

4. BLOCKS/CHECKPOINTS: no genuine restriction signals on any platform. The X mid-run URL bug was worker-side contract violation, caught and repaired by the worker itself. Caps unchanged everywhere (TT 30+10 halved, IG 50+12, Threads 45+12, X 30, FB 25+7 trust-rebuild through end of 2026-09-15).

5. CONVERGENCE LEG (one improvement this cycle):
- Considered: (a) tonight's X actions-URL bug (the @-form violated a contract that exists in the driver's URL_RE and in the cron body text but was never mechanically enforced); (b) the TikTok soft-throttle classifier PROPOSAL (00:50 cycle, thresholds need Nolan's call, not implemented); (c) an outcomes-ledger cosmetic wart found while verifying: x-outcomes-ledger-20260916-071412.json records URLs in the @-form (`https://x.com/@dharmesh/status/...`) while guard and results use canonical no-@ (future canonical-URL normalizer candidate, deferred); (d) gap_ledger.json (still no AUTOMATABLE items; 8 ALREADY_AUTOMATED, 3 KEEP_REASONING).
- Picked (a): highest confidence, fully reversible (new read-only script + test), touches nothing live. Reasoning -> rule: "an X dispatch preflight must validate the actions file against the driver's own URL_RE before any run, and fail closed if the contract cannot be read."
- Built ~/workspace/outreach/check-x-actions-urls.py: extracts `const URL_RE` from x-like.js at runtime (no drift if the driver changes; fails closed exit 2 on flags or unparseable literal), validates list-of-dicts, list-of-strings, or {"actions": [...]} forms, exit 0 all-valid / 1 invalid listed / 2 usage|unreadable|contract-unreadable. Test ~/workspace/outreach/tests/test_check_x_actions_urls.py: 10/10 green (canonical pass, exact tonight @-form rejected, twitter.com/www variants pass, non-x rejected, mixed batch flags only the bad one, string-list form, malformed file exit 2, no-args exit 2, real driver + real tonight actions file 7/7 OK, missing driver exit 2).
- Live check: the script would have caught tonight's bug before dispatch (the @-form fails the driver's own regex).
- PROPOSAL (morning review, not implemented overnight): wire check-x-actions-urls.py into x-engagement-pass cron body step 4 as a hard pre-dispatch gate (exit != 0 -> stop the pass, log, no retry). Same for check-outcomes-keys.py at step 5 (already proposed 00:50). One-line cron-body edits, but cron bodies are live machinery, so they wait for Nolan.

NEEDS-NOLAN (morning, unchanged plus additions): (1) Threads: one manual re-link in the Pig's ig-profile Chrome (threads.com -> Continue with Instagram -> Continue to Threads as nolanpigi). (2) TikTok: full 60+20 restore is his call after the 03:45 throttle-watch pass. (3) Morning review pile: x-like-run.ps1 exit-code fix (21:50); tk-engage.js BAD-regex scoping (21:05); x-follow stall-watcher wiring + @sama/@elonmusk retry decision (22:50); check-outcomes-keys.py wiring + cron step 5 outcomes-account fix (00:50); TikTok soft-throttle classifier thresholds (00:50); check-x-actions-urls.py pre-dispatch gate (this cycle). (4) PING night-shift branch review before any merge to main (separate mission thread).

## 02:50 MDT — night-watch cycle (scheduled 02:50)

1. PIG HEALTH: all 4 CDP endpoints ALIVE (Chrome/153.0.8010.36) via cdp-health.sh: :9223 fb, :9225 x, :9226 ig, :9227 tt. No dead Chrome, no relaunches, no profile touches.

2. PASS RESULTS (since 01:50):
- Facebook Pass 50 (~02:26-02:40 MDT, finalized by the cron worker itself): 0/0, pool dry for the second consecutive pass (14-20 groups scanned, all fresh candidates disqualified or already handled). Heavy ceiling 75+20 now in force (trust-rebuild 25+7 expired end of 2026-09-15 MDT, correctly resumed). No job built, no Pig run, 0 open intents. Schedule stays ENABLED per stay-on rule.
- TikTok: no new pass (next ~03:45 MDT at halved 30+10; cron body verified still 30+10 at steps 2/4/6). Throttle-watch pass: will show whether the 9-consecutive-NO_STATE_CHANGE-like pattern recurs.
- Instagram: no new pass (next ~03:15 MDT). Threads: no new pass (next ~03:01 MDT, 2FA-blocked expected). X: no new pass (next ~05:15 MDT). Unfollow batches: no new results.
- Pig result-dir sweep: no uncollected result/pass JSON files on the Pig (C:\Windows\Temp), no stray .tmp. Nothing orphaned since TikTok Pass 3.

3. TIKTOK: nothing new. Selector fix stands proven; soft-throttle diagnosis stands; halved caps in the cron body confirmed. Next pass 03:45 MDT is the throttle watch; the 03:50 cycle owns the verdict.

4. BLOCKS/CHECKPOINTS: no genuine restriction signals on any platform. Caps unchanged everywhere (TT 30+10 halved, IG 50+12, Threads 45+12, X 30, FB 75+20 heavy ceiling resumed).

5. CONVERGENCE LEG (one improvement this cycle):
- Considered: (a) the recurring orphaned-pass pattern (FB Pass 48, X 17:15/21:15, TikTok Pass 3: four orphans in one night, each hand-found and finalized by a watch agent 1-2h late); (b) FB Pass 49+50 consecutive zero-pool (strategy question, not automatable tonight); (c) gap_ledger.json (still no AUTOMATABLE items; 8 ALREADY_AUTOMATED, 3 KEEP_REASONING).
- Picked (a): highest confidence, fully reversible (new read-only script + test), touches nothing live. Reasoning -> rule: "open intents (per the ledger's own fold: no observation, no finalize, no reconciliation) older than the grace window = ORPHAN_STALE, a pass that died between write-intents and record-outcomes and needs finalization. Younger = ORPHAN_RUNNING (a pass may be in flight), not an alert."
- Built ~/workspace/outreach/orphan-pass-watch.py (read-only, never writes; typed states NO_ORPHANS/ORPHAN_RUNNING/ORPHAN_STALE; exit 0 nothing stale / 1 stale found / 2 usage or ledger-unreadable, fail closed; --now override for determinism; --grace-minutes default 90; --platform filter).
- Built ~/workspace/outreach/tests/test_orphan_pass_watch.py: 23/23 green (empty, closed, stale, young-running, mixed, platform filter, missing-ledger fail-closed, byte-identical read-only proof, UNKNOWN_EXECUTION/reconciliation/finalize closing semantics, execution-only-stays-open, zero-grace usage error, LIVE PARITY: real ledger agrees with action-intent-ledger.py list-unknown at 0 open).
- Honest negative during build: the first version assumed an uppercase schema and missed that finalize/reconciliation records close intents; the live-parity check against the real ledger flagged the false positive (8 bogus STALE passes), and the schema was corrected to match action-intent-ledger.py's actual _derive/_open_intents fold. The parity test now pins that agreement.
- PROPOSAL (morning review, not implemented overnight): wire orphan-pass-watch.py into this cycle's checklist step 2 (and/or the pass crons' post-run step) as a hard gate: exit 1 -> page the next cycle / log an explicit ORPHAN_STALE line instead of relying on a watch agent to notice. The four tonight orphans are the existence proof it would have caught them hours earlier.

NEEDS-NOLAN (morning, unchanged): (1) Threads: one manual re-link in the Pig's ig-profile Chrome (threads.com -> Continue with Instagram -> Continue to Threads as nolanpigi). (2) TikTok: full 60+20 restore is his call after the 03:45 throttle-watch pass. (3) Morning review pile: x-like-run.ps1 exit-code fix (21:50); tk-engage.js BAD-regex scoping (21:05); x-follow stall-watcher wiring + @sama/@elonmusk retry decision (22:50); check-outcomes-keys.py wiring + cron step 5 outcomes-account fix (00:50); TikTok soft-throttle classifier thresholds (00:50); check-x-actions-urls.py pre-dispatch gate (01:50); orphan-pass-watch.py wiring (this cycle). (4) PING night-shift branch review before any merge to main (separate mission thread).

## 03:50 MDT — night-watch cycle (scheduled 03:50; last cycle of the night)

1. PIG HEALTH: all 4 CDP endpoints ALIVE (Chrome/153.0.8010.36) via cdp-health.sh: :9223 fb, :9225 x, :9226 ig, :9227 tt. No dead Chrome, no relaunches, no profile touches.

2. PASS RESULTS (since 02:50):
- TikTok Pass 4 (03:47-03:53 MDT, halved 30+10): NEW RESULT, finalized by the cron worker itself. 1 like executed cleanly (@cleoabram: aria-pressed flipped true), then the DRIVER SELF-ABORTED with "possible checkpoint, rate limit, or block detected; stopping pass" before the second action. logged_in=true throughout. 13/13 intents closed by record-outcomes (1 EXECUTED, 12 NOT_ATTEMPTED on abort), 0 open. Guard: 1 record (@cleoabram like), post-pass verify 0 violations. Full pass section appended to tiktok-engagement.md.
- Instagram Pass 33 (~03:15): 0/0, logged. Session holds (logged_in=true, no restore needed). 10 trade queries, 0 candidates (near-misses only). Pool continues to thin.
- Threads Pass 4 (~03:01): 0/0, logged in threads-engagement.md. Session still not active in the ig-profile Chrome; th-restore.js inert again (final "Continue to Threads" click does nothing to automation). No 2FA code used, no checkpoint. Manual re-link NEEDS-NOLAN stands.
- Facebook: no new pass (next ~05:30 MDT at heavy 75+20). X: no new pass (next ~05:15 MDT, 30 likes). Unfollow batches: no new results (IG state 06:35 MDT Sep 15, FB pages 23:04 MDT Sep 14).

3. TIKTOK (step-3 branch: throttle, NOT clean, NOT layout): the 03:45 pass is the throttle-watch pass and it CONFIRMED the throttle-class signal for the second consecutive pass (Pass 3: 9/9 tail likes failed no-state-change with 11/11 comments executing; Pass 4: driver self-abort at action 2). Deterministic verdicts from the new classifier (see 5): Pass 3 = SOFT_LIKE_THROTTLE, Pass 4 = RESTRICTION_SIGNAL. Per the rails this is a BLOCKED-class signal, not an optimization problem: the worker already halved caps to 15 likes + 5 comments in the tiktok-engagement-pass cron body (steps 4 and 6, with the two-pass rationale), verified in place by this cycle. Full 60+20 restore stays Nolan's morning call. Abort ambiguity documented in the classifier output: the driver tests its BAD regex against document.body.innerText (which includes video captions) and does not record which phrase matched, so Pass 4's abort is restriction-signal OR caption-text false positive (same class as the proven 19:35 false positive); fail closed either way. @cleoabram now never-re-engage at handle level; the 12 unattempted handles stay eligible.

4. BLOCKS/CHECKPOINTS: the TikTok Pass 4 abort is the only restriction signal tonight. Fail-closed response: caps halved to 15+5 (worker-applied, cycle-verified). No genuine signals on IG/FB/X/Threads. Caps now: TT 15+5, IG 50+12, Threads 45+12, X 30, FB 75+20 heavy. No other changes.

5. CONVERGENCE LEG (one improvement this cycle):
- Considered: (a) the TikTok throttle/abort diagnosis I had to re-reason by hand this cycle (pass result JSON -> driver regex -> caption-false-positive class -> verdict); (b) Threads' silent zero-trace passes (no deterministic rule available); (c) gap_ledger.json (still no AUTOMATABLE items).
- Picked (a): highest confidence, fully reversible, read-only, touches nothing live. Reasoning -> rule: "a TikTok result/outcomes file classifies into exactly one deterministic verdict from fixed note patterns; abort records are inherently ambiguous because the driver tests BAD against body.innerText (captions included) without recording the matched phrase."
- Built ~/workspace/outreach/tiktok-failure-classify.py: per-action classes (LIKE_EXECUTED/COMMENT_EXECUTED/EXECUTED, LIKE_NO_STATE_CHANGE, SELECTOR_NOT_FOUND, PASS_ABORT, NOT_ATTEMPTED/OTHER_FAILURE/UNCLASSIFIED) -> pass verdicts (CLEAN, NO_ACTION, SOFT_LIKE_THROTTLE, LAYOUT_SUSPECT, RESTRICTION_SIGNAL, MIXED_SIGNALS, UNRESOLVED_FAILURES). Threshold flag for throttle (default 3), exit 0/1/2, JSON to stdout, read-only.
- Built ~/workspace/outreach/tests/test_tiktok_failure_classify.py: 12/12 green, plain-script exit 0/1 style, including LIVE PARITY on both real passes (Pass 3 outcomes -> SOFT_LIKE_THROTTLE with 9 nsc / 11 comments; Pass 4 results -> RESTRICTION_SIGNAL with the abort-context note pinned).
- One test bug caught and fixed during development: sub-threshold failures (2 no-state-change) were verdicting CLEAN with exit 0 because UNRESOLVED_FAILURES only counted OTHER_FAILURE/UNCLASSIFIED; now any failure-class record below signal thresholds verdicts UNRESOLVED_FAILURES, exit 1.
- PROPOSAL (morning review, not implemented overnight): (1) wire tiktok-failure-classify.py into this cycle's checklist step 3 and/or the tiktok-engagement-pass cron post-run step as the deterministic failure-mode gate: RESTRICTION_SIGNAL/LAYOUT_SUSPECT -> page the cycle with the verdict; (2) driver-side repair: record the matched BAD phrase in the abort note so future aborts are disambiguable (this removes the false-positive ambiguity class at the source); (3) cap-action thresholds (auto-halve at N consecutive throttle verdicts, auto-restore after M clean passes) need Nolan's call.

NEEDS-NOLAN (morning, final list): (1) Threads: one manual re-link in the Pig's ig-profile Chrome (threads.com -> Continue with Instagram -> Continue to Threads as nolanpigi); 4 passes tonight all 2FA/session-blocked. (2) TikTok: two consecutive soft rate-limit signals; caps at 15+5; full 60+20 restore is his call, plus like-velocity pacing may need rethinking (Pass 3 tripped it at ~101s avg pacing). (3) Morning review pile: x-like-run.ps1 exit-code fix (21:50); tk-engage.js BAD-regex scoping (21:05); x-follow stall-watcher wiring + @sama/@elonmusk retry decision (22:50); check-outcomes-keys.py wiring + cron step 5 outcomes-account fix (00:50); TikTok soft-throttle classifier thresholds (00:50); check-x-actions-urls.py pre-dispatch gate (01:50); orphan-pass-watch.py wiring (02:50); tiktok-failure-classify.py wiring + BAD-phrase-in-abort-note driver repair (this cycle). (4) PING night-shift branch review before any merge to main (separate mission thread). (5) The night-watch-cycle cron itself is temporary per its charter: remove it in the morning.

## 04:50 MDT — night-watch cycle (scheduled 04:50; likely last cycle before removal)

1. PIG HEALTH: all 4 CDP endpoints ALIVE (Chrome/153.0.8010.36) via cdp-health.sh: :9223 fb, :9225 x, :9226 ig, :9227 tt. No dead Chrome, no relaunches, no profile touches.

2. PASS RESULTS (since the 03:50 entry): no new engagement passes in the window. Verified deterministically with the new pass-sweep.py (see 5) against the night-shift log's own mtime as watermark: all six evidence sources (tiktok, instagram, threads, x, facebook, unfollow) report nothing newer than the last entry. Expected: no scheduled passes fall in 03:50-04:50 (next: Threads ~05:01, IG ~05:15, X ~05:15, FB ~05:30, TikTok ~07:45). Unfollow batches: no new results (states unchanged).

3. TIKTOK: no new result. Pass 4 verdict stands (RESTRICTION_SIGNAL / throttle class, caps at 15+5 per the 03:50 cycle). "like button not found" has NOT recurred; the selector fix stands proven since Pass 3. Full 60+20 restore stays Nolan's morning call. Next pass ~07:45 MDT is the continued throttle watch.

4. BLOCKS/CHECKPOINTS: no new restriction signals on any platform. Caps unchanged: TT 15+5, IG 50+12, Threads 45+12, X 30, FB 75+20.

5. CONVERGENCE LEG (one improvement this cycle):
- Considered: (a) the hand-reasoned step-2 sweep I do every cycle (mtime-scan history files + result dir, eyeball vs last entry) — highest confidence, fully reversible, read-only; (b) gap_ledger.json (still no AUTOMATABLE items; 8 ALREADY_AUTOMATED, rest KEEP_REASONING); (c) Threads silent zero-trace passes (no deterministic rule available).
- Picked (a). Reasoning -> rule: "for each platform, the newest mtime across its history file + its result files (plus unfollow logs) strictly greater than the last log entry's timestamp = new evidence; otherwise nothing new."
- Built ~/workspace/outreach/pass-sweep.py: per-platform newest-mtime vs watermark, JSON to stdout, exit 0 nothing new / 1 new evidence / 2 usage-or-unreadable (fail closed). Read-only, never writes.
- Built ~/workspace/outreach/tests/test_pass_sweep.py: 18/18 green (quiet fixture, single-platform new, watermark boundary exact-mtime-is-not-newer, bad-watermark exit 2, missing-dir exit 2, unfollow-only new, byte-identical read-only proof, JSON-only stdout, LIVE PARITY: real dirs agree nothing is newer than the last log entry).
- Honest negative during build: my hand-guessed watermark (09:50:00 UTC) was WRONG; the script flagged tiktok-engagement.md (mtime 09:50:01, the 03:50 cycle's own log append) as new evidence. Root cause: I estimated the previous cycle's write time instead of deriving it. Fixed: the parity test derives the watermark from the night-shift log file's own mtime. The script caught a real human error before it became a rule.
- PROPOSAL (morning review, not implemented overnight): wire pass-sweep.py into this cycle's checklist step 2 (and/or the pass crons' post-run step) as the deterministic newest-evidence gate: exit 1 -> emit an explicit NEW_EVIDENCE line naming the platform instead of a hand sweep.

NEEDS-NOLAN (morning, unchanged from 03:50): (1) Threads: one manual re-link in the Pig's ig-profile Chrome (threads.com -> Continue with Instagram -> Continue to Threads as nolanpigi). (2) TikTok: two consecutive soft rate-limit signals; caps at 15+5; full 60+20 restore is his call. (3) Morning review pile: x-like-run.ps1 exit-code fix; tk-engage.js BAD-regex scoping; x-follow stall-watcher wiring + @sama/@elonmusk retry decision; check-outcomes-keys.py wiring + cron step 5 outcomes-account fix; TikTok soft-throttle classifier thresholds; check-x-actions-urls.py pre-dispatch gate; orphan-pass-watch.py wiring; tiktok-failure-classify.py wiring + BAD-phrase-in-abort-note driver repair; pass-sweep.py wiring (this cycle). (4) PING night-shift branch review before any merge to main (separate mission thread). (5) The night-watch-cycle cron is temporary per its charter: remove it this morning. This 04:50 run was not removed by the cycle (no self-removal without an explicit directive); it is now due for removal.
