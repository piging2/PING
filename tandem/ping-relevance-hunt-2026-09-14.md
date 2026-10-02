# PING_RELEVANCE hunt, 2026-09-14

Task: find ONE honest positive instance of causal PING reuse, or record NONE.
Verdict: **PING_RELEVANCE = NONE.** No manufactured causality. This is a correct result, not a failure.

## PING corpus checked (live, 2026-09-14 ~14:12-14:25 MDT)

Live retrieval via pg_probe.py is flaky (PSQL_FAILED on a direct probe at 14:12 MDT; succeeded with retries minutes later and again for business-context.py). Nothing about the corpus below depends on the flaky window: the event inventory, the sidecar accepted_by_ping transitions, and the dossiers' recorded PING sections all agree.

Verified business-relevant accepted observations (everything else is old e2e/test noise or infrastructure events):

1. `874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7` (b-new-business-radar, accepted 2026-09-14 17:19:45 UTC): Meta AI newness claims unreliable without a verified Colorado SOS formation date; operational rule: no pipeline add without one. An orphan-recovery duplicate emission exists (`2fd53ac8c3a17`, accepted 17:33 UTC) with no sidecar provenance; it carries the same knowledge and adds nothing.
2. `428b561f974e1` (c-review-complaint-signals, accepted 2026-09-14 15:55:11 UTC): review-complaint intel reliability finding distilled from the 9/13 c-brief.
3. `3c7db6727f666` (learn-20260913-round44, accepted 2026-09-13 21:17:42 UTC): emerald ash borer confirmed on Colorado's Western Slope (Carbondale, state-confirmed September 2026; ~15% of urban forest is ash) as a tree-service demand signal.

Marketing-intel findings D1-D6 (~/workspace/marketing-intel/discoveries.md) are NOT in PING. They are engine research artifacts from external sources, consulted by the router as external marketing intelligence, never retrieved from PING.

## Counterfactuals run

### C1: Router counterfactual, Captain Ron Handyman L.L.C.

WITHOUT PING: dossier without PING-derived rows still has next_justified_action=sync_first (engine-side pipeline-gap fact, not PING). Decide: SYNC_REQUIRED.
WITH PING: same dossier plus the accepted b-radar event. Decide: SYNC_REQUIRED.
Verdict: NONE. Already recorded as RD-20260914-02 (dry-run) and RD-20260914-04 (executed); the amendment on RD-20260914-04 confirms the verdict holds even under the ping_check inconsistency (outcome-neutral). Both runs agree because the A11 sync gate dominates the decision, not PING knowledge.

### C2: Router counterfactual, Tote and Trailer Moving LLC

Same structure: sync_first in both runs, SYNC_REQUIRED in both runs. Verdict: NONE. Recorded as RD-20260914-03 (dry-run).

### C3: Router counterfactual, AB Steel LLC

Run fresh in this hunt: `python3 route-next.py --dry-run --business "AB Steel LLC"` (printed only, not appended; no new log records). With-PING brief retrieved the accepted event OK via business-context.py (decision_rule quoted, verification verified). WITHOUT PING: same sync_first dossier. Both runs selected SYNC_REQUIRED; options and reasons identical.
Verdict: NONE. The PING decision rule is informative in the brief but never enters decide_one; the A11 gate decides.

### C4: Round-52 ingestion decisions (3 WATCH + 7 exclusions + 3 pipeline adds)

WITHOUT PING: newness verified via SOS-filing mirrors (engine-side web evidence); WATCH chosen because no contact route exists (contact_absence fact, engine-side); seven exclusions grounded in Angi/directory dates, a dissolution record (A Cut Above, 2025-03-25), a delinquency (Mascarenas), and pipeline duplicate matches (Red Rock Gutters, Mesa Seamless Gutters at pipeline.md:1370).
WITH PING: the accepted rule ("no pipeline add without a verified SOS formation date") describes the same verification the ingest already performed; it adds no constraint the evidence did not already impose. Exclusions identical; WATCH identical.
Verdict: NONE. Timeline check confirms this is not even close: the rule was distilled FROM this round's verification work (accepted 11:19 MDT, after the round's 08:09-11:16 MDT ingest window). Causality runs ingest -> PING, never PING -> ingest.

### C5: RD-20260914-01 (v1 router, RESEARCH_MORE for Captain Ron)

The v1 brief cited the PING operational rule, but the selected action and its execution (the 14:00 MDT read-only contact-route search in routing-evidence/rd-20260914-01-research.md) were driven by the contact-route gap, which is engine-side. Without the PING line in the brief, the same gap produces the same RESEARCH_MORE. The evidence file itself concludes: "What this changes: Nothing about the WATCH decision."
Verdict: NONE.

### C6: Round-52 step-7 DISTILL skip

Decision: no additional emission this round because the round-52 learnings were operational outreach notes, not generalizable intelligence. The stated reason is a judgment about the learnings themselves; the already-emitted tandem finding is referenced as a note, not a cause. Without PING knowledge the judge sees the same learnings and makes the same call.
Verdict: NONE. This was the closest near-miss and I declined to stretch it.

### C7: Marketing-intel D1-D6 (each checked)

D1 (Quo missed-call text-back), D2 (owned signals, HYPOTHESIS), D3 (review loop), D4 (competitor watch), D5 (no internal glue), D6 (AI voice, HYPOTHESIS). None is in PING; all predate any PING retrieval; the routing records (RD-20260914-01/02/03/04 and the new AB Steel run) carry changes_decision=false for all six with the reasons. For the three round-52 prospects they change nothing because the candidates are zero-contact filing-only prospects, not onboarded clients.
Verdict: NONE for each. This is by design: marketing-intel is a separate track and its findings never entered PING.

### C8: Emerald ash borer knowledge (event 3c7db6727f666)

All EAB usage traces to the engine's own round-44 discovery, which is what the PING observation recorded: the Ross Tree Company draft (round 8, predates the 9/13 acceptance by weeks), pipeline.md segment notes (2026-09-10 batch, predates), follow-ups.md round-44 market signal (same round as the emission), content-queue.md item 21 (round-44 idea). No decision after 2026-09-13 21:17 UTC cites EAB from PING; every use is the engine re-reading its own learning.
Verdict: NONE. Genuine business knowledge, zero causal reuse so far.

### C9: Review-complaint reliability finding (event 428b561f974e1)

Accepted 09:55 MDT 9/14. Round-52 review intel ran in the same window; its "review-triggered lane stays unused" rationale is an engine evidence constraint (Birdeye/Angi do not render individual review dates in public text fetch), not the PING finding. No post-acceptance decision cites the finding anywhere in the workspace.
Verdict: NONE. No downstream consumer yet.

### C10: RD-20260914-04 decision_outcome (Captain Ron sync to canonical JSONL)

This was machinery executing the router's SYNC_REQUIRED selection (one conformant JSONL row, gaps 195 -> 194, SOS entity ID corrected). Execution, not a new decision, and not informed by PING.
Verdict: NONE.

## The strongest future candidate (not manufactured, watch for it)

The next b-new-business-radar round after 2026-09-14 17:19 UTC is the staged venue. If it returns Meta AI newness claims and the ingest excludes a claim that would otherwise have been added to pipeline.md specifically by applying the accepted operational rule (no pipeline add without a verified Colorado SOS formation date), that will be the first genuine causal reuse: WITHOUT PING = added on an unverified claim; WITH PING = excluded by the rule, with decision provenance naming event 874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7. No such round exists yet (latest intel runs are i-gj-weekend-scan 19:50 and g-local-network-opportunities 13:43/13:40 MDT). When it runs, compare the exclusion list against the pre-acceptance baseline (7/10 mislabeled in round 52) and record the counterfactual then.

## Notes for the parent agent

- No synthetic decisions were made. The only router run in this hunt was --dry-run (printed, not appended to routing-decisions.jsonl). No schedules, databases, authorities, or emissions were created or touched.
- The AB Steel dossier is the third round-52 business now covered by an executed counterfactual; its record exists only in this hunt's stdout, not the log. If the parent wants it logged, rerun without --dry-run.
- Watch item: pg_probe PSQL_FAILED is intermittent (failed 14:12, recovered 14:15+). Retrieval flakiness, not data loss: the corpus cross-checks against sidecars and dossiers.
- The orphan-duplicate event 2fd53ac8c3a17 (b-radar, 17:33 UTC) has no sidecar provenance; treat it as the same knowledge as 874da5..., not a second finding.
