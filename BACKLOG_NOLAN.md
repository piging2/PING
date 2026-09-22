# BACKLOG_NOLAN — personal social operation

Authoritative backlog for the PING Social outreach machine, engagement passes, content, and Pig automation. Split from ~/workspace/BACKLOG.md on 2026-09-21 (Nolan's call): product engineering lives in BACKLOG_PING.md. ~/workspace/BACKLOG.md is now just the split index.

Rule: evidence over activity. An item is DONE only when a tool result verifies it.
Item numbering is preserved from the combined backlog; it is not sequential.
## NOLAN DECISIONS LOCKED (2026-09-19, one-grill architecture)

The seven grill questions are resolved. Full detail in ~/workspace/GRILLING-BRIEF.md (the ONE active operator decision surface). Condensed:

1. **300-row JSONL cap: DROP THE ARBITRARY FREEZE.** Quality belongs at admission/dedup/exclusion/validation, not at a row-count cap. Before changing anything: snapshot and verify current stores, then remove/adjust only the policy enforcing the freeze. No record deletion.
2. **Projection owner: the operation that creates the state change owns same-run projection.** Reconciler is the backstop, not the normal writer. Audit the last three send rounds for the round-87 lapse.
3. **Status store wins: canonical prospect JSONL is the status authority** for records that exist there. CSV/pipeline.md/leads.md/queue files are projections/views and must not overrule it. Inventory fields and current writers/readers before converging; no blind overwrites. The queue stays authoritative for execution intent only.
4. **Fenix and Cooley's: parked OUTCOME_UNKNOWN / MANUAL_VERIFICATION_REQUIRED.** No re-submit, no inferred outcomes.
5. **Threads worker: re-dispatched idempotently** (observe-before-act; already-followed gets observed completion recorded, never repeated).
6. **Observe -> review: the continuous engine owns the loop** after Sunday's post.
7. **Worker-deliverable validator: build the smallest scripted gate** around actual failure classes, invoked by a real acceptance path in the same unit. A validator with no caller is NOT completion.
## DONE (2026-09-19, backlog lane)

1. **Stale pipeline.md header** — was "Research-only database. No one in this file has been contacted." Now states it is a lifecycle database with reconciled statuses. Verified: header text replaced.
2. **18 legacy CONTACTED statuses** — each reconciled against round-5/6 records and draft files: 4 SUBMITTED 2026-09-08 (forms with confirmations), 3 SKIPPED 2026-09-08 (no honest route), 11 DRAFTED (orphaned pre-queue email drafts, never sent, draft files verified to exist). Zero CONTACTED remain in pipeline.md or leads.md. Backup: /tmp/pipeline.md.pre-backlog-bak.
3. **Manual CSV path drift** — section 5, section-11 file map, and section 16a pointed at `~/workspace/your_files/western-co-business-owner-list.csv`, which no longer exists. Fixed to the living 30-column CSV in the goal files dir; row count corrected to 211; all 30 columns written out verbatim; the "21 intelligence columns + conversion trio" claim corrected to 18 (the conversion trio lives on the JSONL rows). Backup: /tmp/manual.pre-backlog-bak.
4. **content-queue.md ranking hygiene** — 40 rows renumbered 1-40 in document order. Was: duplicate rank 21 (three of them), duplicate 11/12, out-of-order 38/39, one stray bullet. The J&S Seamless bullet folded into the table as row 38 with its source preserved. Round sections untouched, no facts changed. Backup: /tmp/content-queue.md.pre-backlog-bak.
5. **JSONL/CSV status projection lapse** — round 87 fired 8 Gmail-verified sends (2026-09-19 UTC) but never projected them into suppression_state / next_eligible_action / last_signal, violating manual section 8/16c and blinding pre-send-check.py's JSONL leg. Backfilled via `outreach/scripts/backfill-jsonl-projection.py` (dry-run first, all guards passed, snapshots in goal hidden_files/backfill-snapshots/): 4 cold sends to `ladder F1 2026-09-23`; 4 F2 sends appended with F2 SENT and ladder-complete state. 8 JSONL rows + 4 CSV rows, every field verified after write.
6. **pre-send-check.py QUEUED false positive** — verified already fixed in code (QUEUED lines downgraded to WARN; acceptance regex excludes them). No patch needed.
7. **Wrong Facebook group ID** — verified corrected in facebook-dms.md, facebook-scan-round92.md, learnings.md, and the round-92 sweep. Correct: 2803047646497352. Historical logs keep the wrong value as observed; no edits.
8. **Round-14 form outcomes** — Element Plumbing and Western Refrigeration already resolved SKIPPED 2026-09-11 by later research. Fenix Home Services and Cooleys remain "outcome unknown," parked per the no-repeat rule. Gmail searched 2026-09-09 through 2026-09-20 plus all-time from both domains: zero confirmations, zero replies. Parked state stands (see BLOCKED). Nolan confirmed 2026-09-19: stays parked OUTCOME_UNKNOWN / MANUAL_VERIFICATION_REQUIRED, no re-submit, no inferred outcomes.
9. **Learnings reconciliation** — every standing lesson in learnings.md now has a disposition (applied / process / open), appended as a dated entry 2026-09-19.

10. **Projection-owner enforcement: rounds 85-87 audit** (perfecting-pass 2026-09-19): rounds 85 and 86 were zero-send rounds (outreach/learnings.md lines 807-808), so no same-run projection obligation existed for either; the round-87 lapse (8 Gmail-verified sends, no same-run projection) was already backfilled and field-verified (DONE item 5). The lapse is confirmed isolated, not systemic across the last three send rounds. No further action.
11. **Stale "in-follow-up-ladder" vocabulary** (perfecting-pass 2026-09-19): canonical vocabulary confirmed in outreach/prospect-source-of-truth.md (2026-09-13 migration: `in-follow-up-ladder` -> `ladder F1/F2 <date>`). Verified no contamination: canonical JSONL (305 rows) has 0 stale values, pipeline.md 0, leads.md 0; queue files since 2026-09-23 already use canonical values (the engine's queue-writing practice self-corrected ~09-21/23). Historical queue files 09-13..09-22 keep the stale prose and are left as observed. Fixed the last live template source: outreach/prospect-schema.json `suppression_state` description no longer blesses the deprecated value (schema re-validated after edit).
    - *REGRESSION 2026-09-22 (perfecting-pass):* the 2026-09-17-written email-queue-2026-09-20.md instructed the 09-20 send run to set `suppression_state in-follow-up-ladder` on 4 F1 rows (Groundskeepers, Aspen Floor & Home Services, Blackbird Kitchen and Bath, Irrigation Monkey); the run executed it verbatim. Bounded self-heal: snapshot + dry-run + verified apply `-> ladder F2 2026-09-26` (matches each row's own next_eligible_action), 302 rows, 0 stale values re-verified, digest regenerated, copies re-synced. Residuals for the engine: backfill last_signal with the 09-20 F1 sends, log F1 results in follow-ups.md, annotate jsonl-merge-round31.py:114. Full record: FAILURE_LEDGER.md FL-20260922-001. Lesson: queue files written before a vocabulary fix are live stale-prose hazards; the queue producer must self-check vocabulary against prospect-schema.json at write time.

Side finding: `your_files/western-co-prospects.jsonl` is a symlink to the goal-dir file, not a second copy. One canonical JSONL. pre-send-check.py reads it through the symlink; no path change needed.
## OPEN
1. **Self-assessed content scores await real metrics.** Humor/content scores are self-assessed until actual posts provide real metrics. After the Sunday 2026-09-20 15:00 post, the CONTINUOUS ENGINE owns the OBSERVE -> REVIEW loop (Nolan's call 2026-09-19): observe real platform metrics, record evidence, review prior assumptions/scores, update the rules, propose the next action.
   - *Perfecting-pass 2026-09-20 19:51 MDT:* post EXECUTED 15:05:55 MDT: ping-pig-suit.png posted (queue.json posted=true, posted_at=2026-09-20T21:05:55.692751+00:00; sunday-post-execution-2026-09-20.md records Pig worker result ok=true, composer acted as Page "PING Social", no duplicates/restrictions). Observe window is open; the continuous engine's OBSERVE -> REVIEW loop owns next action. First unposted queue item is ping-pig-president.png. Item stays OPEN until metrics-based review closes it.
2. **Content queue is structurally clean but not signal-ranked.** The renumber preserved document order. The ranking rule says signal frequency outranks everything (e.g., the mobile-welder item has 14 observed shops but sits at 21, below one-signal items). First establish whether the ranking rule is current and canonical; if it is, fix the ranking implementation. Continuous-engine empirical investigation; grill only if competing current policies are found.
   - *Perfecting-pass 2026-09-20 01:51 MDT (canonical-status check, read-only):* the ranking rule is current and canonical. Defined once in `outreach/content-queue.md` ("## Ranking rule": rank by (1) pattern repetition across real prospects, (2) PING-solution tie, (3) timeliness; "Higher repeated real-world signal outranks everything"). Confirmed by the ops manual section 16 ("New content ideas enter `outreach/content-queue.md` under its ranking rule") and section 16a ("its ranking rule is unchanged (real-signal frequency first)"). No competing policies found anywhere. Discrepancy verified: mobile-welder row (Times seen 14) sits at rank 21 below rows with 1-2 signals (ranks 7, 10, 16, 17, 20). Rule-internal tension noted: the rule lists three ranking factors but closes with "outranks everything," so a mechanical frequency-only re-sort would silently resolve that tension. Re-ranking implementation left to the continuous engine (content decisions are Nolan's); NOT marked done.
3. **Worker-deliverable validator.** Multiple rounds show worker claims exceeding delivered files (counts, dedup, draft eligibility). Build the SMALLEST validator around actual failure classes (duplicate, exclusion violation, required deliverable missing, claimed completion without evidence, schema violation). It must be invoked by a real acceptance path in the same unit; a validator with no caller is not completion (Nolan's call 2026-09-19).
4. **300-row JSONL freeze removal.** Snapshot and verify current stores first, then remove/adjust only the policy enforcing the arbitrary freeze. No record deletion. Owner: outreach engine.
5. **Projection-owner enforcement.** [DONE 2026-09-19 — see DONE item 10: rounds 85/86 were zero-send; round-87 lapse already backfilled and confirmed isolated.]
6. **Status-store convergence.** Inventory status fields and current writers/readers across JSONL, CSV, pipeline.md, leads.md, and queue files before converging on the canonical-authority rule. No blind overwrites of conflicting records. Owner: outreach engine.
7. **Stale "in-follow-up-ladder" vocabulary.** [DONE 2026-09-19 — see DONE item 11: canonical vocabulary confirmed, zero contamination in JSONL/pipeline.md/leads.md, queue files self-corrected since 09-23, prospect-schema.json description fixed.]
8. **Orphaned-draft disposition for the 11 newly-DRAFTED rows.** The round-5/6 drafts exist but were never queued or sent. The engine should run a round-89-style orphan audit: revive (re-verify and queue) or retire each. Owner: outreach engine.
5. **Bounce detection is a manual sweep step, not a script.** Every send round runs it (verified round 87), but nothing enforces it. Low priority while the manual step holds.
6. **Scope-honesty check is engine practice, not a gate.** Since round 86 the engine checks covered/exhausted lists before committing segment scope. A scripted pre-research gate would make it stick. Low priority.
7. **Pig C: disk-pressure early warning.** 2026-09-20 P0 incident: C: hit 6.87% free (31.74 GB) before emergency evacuation. CONTAINED 2026-09-20 16:06 MDT at 11.58% free (53.51 GB). Root causes: Docker VHDX (151 GB) + Ubuntu VHDX (65 GB) on C:, browser ML models (~4 GB each x4), opencode.db (8.1 GB), no monitoring. Build: (a) scheduled disk-space check (provisional thresholds: <10% free = DEGRADED/investigate, <7.5% = CRITICAL, rapid sustained loss = investigate regardless of percentage), (b) runbook for safe evacuation (caches first, then models, then databases with verification), (c) dashboard showing C:/D:/E: free space trends. Prevents recurrence of the 2026-09-20 emergency. Status: STORAGE_P0 = CONTAINED (not FULLY_RESOLVED).
8. **P0 storage root-cause investigation.** 2026-09-20 incident follow-up (Nolan's directive): prefer configuration/root-cause fixes over periodic emergency deletion. Investigate: (1) WHAT caused the rapid growth? (2) WHICH writers are capable of multi-GB/hour growth? (3) Why were three separate browser profiles carrying ~4 GB copies of the same-version on-device model? (4) Can those models share storage or be safely excluded from these automation profiles? (5) Why did opencode.db reach ~8.1 GB? (6) What is its growth rate and retention policy? (7) Can opencode.db be relocated/configured onto D: permanently instead of eventually growing on C: again? (8) Which Docker operations grow docker_data.vhdx without returning host space? (9) Can disk pressure be surfaced before operational degradation? (10) Which large-file classes are safe to place on D:/E: by default? Do NOT restore opencode.db to C merely because the application expects its old path; first determine the supported configuration/storage-location mechanism. Watch whether browser weights automatically regenerate (useful evidence).
## BLOCKED
1. **Instagram CDP wedge** — discovery subprocess never returns; pass 74 classified TEMPORARY_FAILURE; no guard filtering or actions. Owner: Pig-side fix (Nolan). Do not touch the live account from here.
2. **Threads engagement** — direct post permalinks redirect to the home feed (12/12 reproduced); pass 45 found candidates but did not execute Phase B. A worker was assigned to follow six seed accounts and redesign feed-container targeting; no verified completion. Owner: whoever owns the Threads lane; needs independent verification before credit.
3. **Fenix + Cooleys form outcomes** — "outcome unknown," parked per the no-repeat rule. Remote verification exhausted (no confirmations, no replies in Gmail). Owner: Nolan, manual verification only.
4. **ENVIRONMENT_READY=NO** — three Nolan-only items: restart Docker Desktop on the Pig, launch one fresh minimal Codex task against the WSL repo, provision the OCI Object Storage bucket. Held, no nudges while he is away. Owner: Nolan.
7. **Sunday 2026-09-20 15:00 post** — Nolan chose POST on the unproven business-agent path. Execution and the prove-before-then work are his call. Backlog lane does not touch the queue, schedule, or captions.
## AUTOMATION AND RUN ROBUSTNESS (moved from the FYD grill lane 2026-09-21; Nolan's call: this is Pig automation, not FYD's product frontier)

These were FYD-028 through FYD-032 in the combined backlog. The wake-lock idea is scoped-lifecycle (acquire -> run -> release); no global power policy, no campaign engine, no architecture expansion.
**FYD-028 — Scoped wake lock is not implemented.** Automation runner must acquire wake inhibitor -> run -> release on success/failure/cancellation/exception. Per Nolan 2026-09-21: do not globally disable sleep; encode the requirement in the automation lifecycle.
- EVIDENCE: FL-20260921-033 closed; standby root cause established 2026-09-21 08:42 MDT.
- VALUE: This is the missing invariant: active automation requires execution host availability.
- FAILURE MODE: Next long pass dies mid-batch at the next standby; same failure, new ledger entry.
- MINIMUM CHANGE: Wake acquire/release wrapper in the automation runner with release in all exit paths.
- PROOF: Real pass records WAKE INHIBITOR ACQUIRED/RELEASED in run record.
- DEPENDENCIES: FYD-029.
- RISK: high (recurrence of a proven killer).
- STATUS: OPEN
**FYD-029 — No durable run record exists.** Required fields: run id, host, start, wake inhibitor acquired, browser lock acquired, page created, last checkpoint, suspend/resume detected, completion, wake inhibitor released.
- EVIDENCE: gap found by grill; 2026-09-21 directive names the fields.
- VALUE: Without the record, the next failure is diagnosed from memory again.
- FAILURE MODE: Pass dies; nobody knows whether it suspended, lost the page, or never started.
- MINIMUM CHANGE: One JSONL run record per automation run with the named fields.
- PROOF: One real run produces a complete record.
- DEPENDENCIES: FYD-028.
- RISK: medium.
- STATUS: OPEN
**FYD-030 — Post-suspend revalidation is missing.** If the machine suspends anyway, the run must revalidate browser, session, page, auth state, and checkpoint before resuming, not blindly continue.
- EVIDENCE: gap found by grill; directive names the requirement.
- VALUE: Blind resume after suspend is how unauthorized or duplicated actions happen.
- FAILURE MODE: Resume on a dead page target repeats or skips actions; duplicates land.
- MINIMUM CHANGE: Suspend/resume detection + revalidation gate before any further action.
- PROOF: Test or real run shows SUSPEND/RESUME DETECTED then revalidation then safe resume or safe abort.
- DEPENDENCIES: FYD-028, FYD-029.
- RISK: medium-high.
- STATUS: OPEN
**FYD-031 — Browser lock + page-reopen fixes are unproven in real operation.** FL-20260921-016 and the wake-recovery repairs stay OPEN until a real FB pass and a real IG pass validate them. Ledger open.
- EVIDENCE: repairs applied 2026-09-21; no real pass since.
- VALUE: Code change is not proof; only a real pass with receipts is.
- FAILURE MODE: Claimed fixed, actually broken; next pass dies the same way at 3am.
- MINIMUM CHANGE: Run one real FB pass and one real IG pass; require expected results, no duplicates, no unauthorized actions, receipts.
- PROOF: Pass receipts + ledger entries closed.
- DEPENDENCIES: FYD-028.
- RISK: high until proven.
- STATUS: OPEN
**FYD-032 — Idempotent bounded batches are a recorded lesson, not a design.** Future campaigns need: action plan -> bounded batches -> durable cursor -> idempotency -> per-action receipt -> UNKNOWN handling -> reconciliation. Do NOT build the campaign engine now; record the invariant.
- EVIDENCE: 2026-09-21 directive names the design; pool-seeds pass lost 44 actions to one opaque failure.
- VALUE: A sleeping machine must lose at most the current bounded action, not the whole campaign.
- FAILURE MODE: Next 2,000-action effort is one opaque browser pass again.
- MINIMUM CHANGE: This entry is the record. When any batch work starts, it must cite this entry's design.
- PROOF: Next batch design references FYD-032.
- DEPENDENCIES: none.
- RISK: medium (future cost).
- STATUS: OPEN
## How to work this file

- Pick the top OPEN item you can verify with a tool result. Do the work, verify, log it in learnings.md, move it to DONE with the evidence.
- Never mark DONE on a worker's word alone. Delivered artifacts and live verification outrank narration.
- BLOCKED items move only when the owner acts. Do not nudge Nolan on held items.
