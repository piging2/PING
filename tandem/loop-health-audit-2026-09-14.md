# Loop Health Audit 2026-09-14

Audit time: Mon 2026-09-14 ~14:15 MDT. Auditor: loop-health subagent (parent orchestrator).
Scope: prove the continuous loop RESEARCH -> DISTILL -> VERIFY -> PING -> BUSINESS AGENT -> DECISION -> ACTION -> OUTCOME -> NEW EVIDENCE runs, find the smallest missing seam, repair only that.

## Verdict

The loop runs continuously today. Every stage produces durable output and the next stage consumes it, with two exceptions noted below. One real scheduler dispatch gap was proven: meta-ai-intel-pass did not fire at 03:04 or 09:04 MDT on 2026-09-14, and no durable trace of the skip exists anywhere. The work was not lost. Two minimal repairs were made (see Repairs). No new scheduler, database, or authority was built.

## Stage trace (evidence per stage)

### RESEARCH: meta-ai-intel-pass (interval 6h, anchor 2026-09-13T15:04:06 America/Denver)

Produces durable output: YES.
- runs.jsonl lines (28 total in ~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/runs.jsonl), job.json envelopes, answer .md files, .provenance.json sidecars. Latest: 20260914-102446-b-new-business-radar.md answer captured (status answer_captured, then verified, then accepted_by_ping per sidecar transitions).

Consumed by next stage: YES.
- Engine step 4e reads answer files newer than the ingested.log watermark and reads each .provenance.json sidecar.
- next-brief.py reads runs.jsonl for rotation (failed runs never advance; failed briefs retried before advancing).
- reconcile.py R1/R5 reads runs.jsonl plus sidecars.

Dispatch health: 2 of the last 4 expected ticks fired (9/13 15:04 ok, 9/13 21:04 recorded infra failure: Meta AI logged out on the Pig). The 9/14 03:04 and 09:04 ticks never fired; see Tick analysis. Next tick 9/14 15:04 MDT per scheduler status.

### DISTILL: outreach engine step 4e (inside ping-social-outreach-engine, interval 3h)

Produces durable output: YES.
- ingested.log entries ending in explicit DISTILL lines (distilled with event_ids, or skipped with a one-line reason). Example 9/14 11:25 MDT round 52: processed 20260914-102446-b-new-business-radar.md, VERIFIED 10/10, 3 qualified to pipeline, DISTILL emitted OBSERVATION_CREATED event 874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7.
- Sidecar status transitions via mark-verified.sh (verified 2026-09-14T17:19:21Z by round 52).

Consumed by next stage: YES. PING gateway accepted the event; engine watermark (ingested.log) gates the next pass.

### VERIFY: mark-verified.sh plus independent web search

Produces durable output: YES. Sidecar transitions (researched -> validated -> verified -> accepted_by_ping) and verification reports (for example verified-20260913-191216-a.md referenced in ingested.log).

Consumed by next stage: YES. emit-observation.py fail-closes without the verified transition; the PING intelligence boundary (no unverified research promoted) is enforced here.

### PING: gateway ping_events

Produces durable output: YES. 37 OBSERVATION_CREATED events accepted (sunday-post decision record verified 1983 total events across 28 types on 2026-09-14; latest accepted event 874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7).

Consumed by next stage: PARTIAL. PING read-back in the continuous loop happens only ad hoc: route-next.py v2 does PING retrieval with a with/without-PING counterfactual, and the sunday-post decision did a read-only lookup. No scheduled stage reads PING back into business-agent decisions today. The emit path is healthy; the read-back path is not scheduled. Noted as an observation, not repaired: wiring scheduled PING read-back is a larger design decision than the smallest seam.

### BUSINESS AGENT: ping-social-outreach-engine (interval 3h, anchor 2026-09-09T02:12:55 America/Denver)

Produces durable output: YES. Sweep summaries (hidden_files/sweep-*.md, rounds 32 through 52), pipeline.md, canonical JSONL, drafts, engagement logs.

Consumed by next stage: YES. Every sweep runs the full operating loop and records decisions in the sweep summary sections (NEW SIGNALS, FOLLOW-UPS, OPPORTUNITIES, HOT PROSPECTS, SUPPRESSED, LEARNING with PING-DISTILL line).

Dispatch health: complete. Run records exist for every expected 3h tick (11:12, 08:12, 05:12, 02:12 MDT today and back through 9/12). Last run 9/14 11:33 MDT succeeded; next 14:12 MDT.

### DECISION

routing-decisions.jsonl (~/workspace/tandem/routing-decisions.jsonl): produced ad hoc by route-next.py dry runs (RD-20260914-02, RD-20260914-04, decision_outcome records). Consumed by: NOTHING on a schedule; no cron or engine step reads or writes it. The router selects but never executes by design. Observation only: the DECISION stage of the live loop is carried by sweep summaries and the sunday-post decision record, not by this file. Not repaired (wiring it in exceeds the smallest seam).

Sunday post decision: ~/workspace/ping-content/sunday-post-decision-2026-09-14.md exists, thorough, decision POST ping-pig-suit.png. The runonce cron referenced it but carried no execution-time POST/DEFER/RESEARCH MORE decision step. REPAIRED (see Repairs).

### ACTION

Produces durable output: YES.
- Email: Gmail accepts within the 10-per-UTC-day cap (round 47 verified 10/10 in sent mail; pre-send-check.py reconciles before every send).
- Engagement: facebook-engagement-pass every 6h (pass 43 today 11:26 MDT, 5/5 actions landed, logged), instagram-engagement-pass every 3h (pass 18 running at audit time; passes 14-16 logged login failures durably, pass 17 recovered).
- Sunday post: runonce scheduled 2026-09-20T15:00 MDT, enabled.

Consumed by next stage: YES. Outcomes feed responses.md, angle-performance.md, follow-ups.md.

### OUTCOME

Produces durable output: YES. responses.md, angle-performance.md (per-round outcome rows), follow-ups.md updated every sweep. Zero prospect replies to date; the single genuine reply (Roaring Fork Landscapes, "No interest", 2026-09-10) is recorded with suppression_state declined and priority_state SUPPRESS. The recording machinery is verified working; the absence of replies is a result, not a gap.

### NEW EVIDENCE

Produces durable output: YES. runs.jsonl sweep lines via append-sweep-run.py (origin outreach-engine, per-stage counts), ingested.log, sweep summaries, daily memory log entries, goal timeline entries.

Consumed: YES, by the next cycle (rotation, watermark, reconciliation, next sweep's reply check).

## Tick analysis (the missing 03:04 / 09:04 ticks)

Expected meta-ai-intel-pass ticks from the 6h anchor: 9/13 15:04, 9/13 21:04, 9/14 03:04, 9/14 09:04, 9/14 15:04 (America/Denver).

Scheduler run records show only: 9/13 15:04:06 (succeeded, b-new-business-radar, ~32 businesses) and 9/13 21:04:06 (succeeded at the scheduler level; worker outcome infra, d-segment-deep-dive, Meta AI logged out on the Pig, no answer captured, reconciler match on MISSING file).

The 9/14 03:04 and 9/14 09:04 ticks have NO run records. Scheduler status confirms: last_run 9/13 21:05:36 MDT, next_run 9/14 15:04:06 MDT, consecutive_failures 0, nothing queued. The scheduler itself skipped them.

This is a real reliability gap (dispatch gap), not an observability-only gap, AND it is an observability gap:
- Failures during execution ARE recorded durably. Proof: the 9/12 02:12 MDT outreach-engine run is recorded as failed with error_text "invalid restart checkpoint; durable owner failed without replay", and the 9/13 21:04 meta-ai run is recorded with its infra outcome in result_summary. A tick that fired and failed would leave a record. These ticks left nothing, so they were never dispatched.
- No durable artifact records the skip: not cron.runs, not runs.jsonl, not the ledger, not reconciliation (reconcile.py R1-R6 read artifacts, never the scheduler; a never-fired tick is invisible to all of them).

Impact was contained, not zero:
- The rotation policy ("a failed run never advances the rotation; retry failed briefs before advancing") means the failed d-segment-deep-dive brief is retried on the next pass rather than skipped forever.
- A manual recovery ran b-new-business-radar at 9/14 10:24 MDT (job.json initiated_by "manual:antifragility-b-recovery"); the answer was captured, verified 10/10 by round 52, and distilled to PING. So RESEARCH output flowed today despite the missed ticks, via manual intervention.
- The engine's watermark ingest (files newer than ingested.log) catches up on any captured file regardless of which tick produced it.

Root cause of the dispatch gap is not provable from available records. The 9/13 evening round-47 engine report noted a "Subagent daemon restart" with subagents dying without checkpoint; a scheduler outage spanning the 03:04 and 09:04 ticks, with next_run recomputed to the next future anchor tick on recovery and no backfill, fits all observations. If it recurs, Repair 2 below will capture it durably.

ping-pipeline-reconcile status: created 2026-09-14 10:03 MDT, zero run records, first tick 2026-09-14 16:03:27 MDT. Reconciliation today ran ad hoc (reports at 10:27-11:33 MDT, LATEST.json gap_count 0 at 11:32 MDT). Not broken; untested as a cron. Note: its `at` field (16:03:27) is the UTC wall-clock time of file creation interpreted in America/Denver, shifting the intended 10:03 MDT anchor by exactly one 6h period; the tick set {10:03, 16:03, 22:03, 04:03} is unchanged, so this is cosmetically wrong but functionally harmless. First scheduled fire will exercise it.

## Repairs made (smallest provable seams only)

### Repair 1: sunday-post execution-time decision step (explicitly required)

ping-social-sunday-post (runonce 2026-09-20T15:00 MDT) previously referenced the 2026-09-14 decision record and carried STOP guardrails, but had no auditable POST/DEFER/RESEARCH MORE decision step before execution. Added step 1: the worker must create ~/workspace/ping-content/sunday-post-execution-2026-09-20.md recording the authorized item, the current first-unposted queue item, Pig reachability, image presence, and any new evidence since 2026-09-14, then record exactly one verdict (POST / DEFER / RESEARCH MORE) with reasons. Only an explicit POST continues to the posting procedure (steps 2-7, which re-verify the same preconditions fail-closed at execution time, and which now also require the Pig-side acting-as-Page confirmation and live duplicate check before the post lands). DEFER and RESEARCH MORE stop after writing the record and report plainly. The 2026-09-14 authorization is not re-decided; the step records the execution-time verdict only. Verified via cron.view after update.

### Repair 2: scheduler tick-coverage check in the reconciliation watchdog (the dispatch-gap seam)

Added step 5 to ping-pipeline-reconcile: after reconcile.py runs, the worker derives expected tick times since the previous reconciliation report for meta-ai-intel-pass (6h anchor 2026-09-13T15:04:06 America/Denver) and ping-social-outreach-engine (3h anchor 2026-09-09T02:12:55 America/Denver), confirms each has a scheduler run record, and appends any missing tick to the reconciliation report (.md and .json, bumping LATEST.json gap_count) as rule R7, step SCHEDULE, state GAP, with the dispatch-gap note. Quiet on a single gap; the existing three-consecutive rule surfaces a persistent one. This is the smallest seam that makes the proven failure class (ticks that never fire, invisible to R1-R6) durably visible, using the existing watchdog and no new infrastructure. Verified via cron.view after update.

## What was NOT changed

- No new scheduler, database, event store, or authority. Nolan's rule honored.
- route-next.py / routing-decisions.jsonl not wired into the scheduled loop; PING read-back not scheduled. Both flagged above as observations for the parent agent; wiring either is larger than the smallest seam.
- The meta-ai-intel-pass body itself was not changed; its rotation retry policy already handles missed work correctly.

## Open questions for the parent agent

1. Whether the 03:04/09:04 dispatch gap was a scheduler outage (likely, given the 9/13 evening daemon restart note) or something else; R7 will now capture any recurrence with a durable record.
2. Whether to schedule PING read-back into the business-agent loop (currently ad hoc) and whether to wire route-next.py decisions into a scheduled stage.
3. The reconcile cron's `at` timestamp is UTC wall-clock stored as Denver time (cosmetic, harmless); correct it only if tick-phase exactness ever matters.
