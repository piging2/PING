# Fresh independent audit: RD-20260914-04 (Captain Ron Handyman L.L.C. sync)

Auditor role: fresh independent agent, no history of the program. Sources: the listed artifacts only. Where a fact is asserted only by the workstream's own record, it is marked as unattested. No em dashes anywhere in this file.

## Reconstruction

WHAT BUSINESS. Captain Ron Handyman L.L.C., Grand Junction, Colorado. Cited identically in the RD-20260914-04 routing decision (selection.business), the dossier (identity.canonical_name), pipeline.md line 1443, the sync evidence file chain item 1, and the appended JSONL record (business_name).
Cite: routing-decisions.jsonl (RD-20260914-04 record), knowledge/dossiers/captain-ron-handyman-llc.json, outreach/pipeline.md:1443, tandem/routing-evidence/rd-sync-captain-ron-2026-09-14.md items 1 and 8.

KNOWN. Colorado DLLC Entity #20261853316, formed 2026-07-14, good standing; principal address 449 Renaissance Ct, Grand Junction, CO 81507; registered agent Ronald Reagan Cummings (same address). Round-52 new filing (b-new-business-radar, 2026-09-14), inside the 60-90 day window. Filing-only presence: no phone, email, website, GBP, or Facebook page published. Pipeline status NEW, priority WATCH, opportunity NEW_BUSINESS_SETUP. Dossier built 2026-09-14T19:58:41Z. PING accepted event 874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7 (verification block: grade verified, method independent web search round 52, 10/10 named businesses verified).
Cite: dossier (facts, pipeline, verification, identity blocks); business-decisions-2026-09-14.md (Decision: Captain Ron -> WATCH, lines 11-18); pipeline.md:1443; opengovco entity page (independent fetch, entity table lines 8-38).

UNKNOWN. Whether the filing has any operating presence beyond the filing; owner contact beyond the agent name; trade is inferred from the name only (dossier: "handyman (inferred from name only; no service description evidenced)"). Platform account UNKNOWN. PING retrieval was UNCHECKABLE (PSQL_FAILED probe, fail-closed), so no PING-derived fact was relied upon.
Cite: dossier open_questions and identity_confidence: inferred; decision_outcome observation (business-context.py retrieval UNCHECKABLE).

EVIDENCE USED. The dossier JSON; pipeline.md:1443; business-decisions-2026-09-14.md; entity-identities.md; the round-52 meta-ai-intel raw answer and provenance sidecar; the RD-20260914-01 research evidence file (rd-20260914-01-research.md); the opengovco entity page lookup (query-level log Q1-Q5); business-context.py brief.
Cite: routing-decisions.jsonl RD-20260914-04 evidence list; sync evidence file chain items 2, 3, 5, and the query log.

PING CONTRIBUTION. None. PING retrieval during the run was UNCHECKABLE (PSQL_FAILED, fail-closed; disk evidence only). The record's counterfactual executed with-PING and without-PING runs; both selected SYNC_REQUIRED; ping_relevance verdict NONE. This matches the earlier RD-20260914-01 influence experiment, reported as a failed causal-reuse experiment (verdict NULL). The decision carried the uncertainty forward rather than treating UNCHECKABLE as PASS.
Cite: sync evidence file item 3; RD-20260914-04 counterfactual and ping_relevance blocks; RD-20260914-01 ping_influence_experiment. Independently confirmed: re-running business-context.py returns RETRIEVAL STATUS: UNCHECKABLE, PSQL_FAILED.

STATE. WATCH + SYNC_FIRST: present in the pipeline as NEW (pipeline.md:1443), absent from the canonical prospect JSONL, therefore in the pipeline-vs-JSONL gap class with sync SYNC_FIRST.
Cite: pipeline-jsonl-gaps.jsonl row schema (RD-20260914-04 pipeline_state.row); dossier sync_gaps and next_justified_action.

OPTIONS CONSIDERED. Nine options for this business in RD-20260914-04: SYNC_REQUIRED (selected); RESEARCH_MORE (rejected: already executed under RD-20260914-01, negative outcome recorded, gap twice-evidenced); DRAFT_EMAIL_OR_DM, SEND_COLD_EMAIL_OR_DM, SUBMIT_CONTACT_FORM (rejected: no contact route, SYNC_FIRST blocks ACT); EMIT_OBSERVATION_TO_PING (rejected: engine step-4e owns emission); ADD_TO_CANONICAL_JSONL_BY_ROUTER (rejected: sync is parent-owned, router selects only); FACEBOOK_ENGAGEMENT (rejected: cron-owned, Pig-only); SUNDAY_POST (rejected: slot already decided).
Cite: routing-decisions.jsonl RD-20260914-04 options_considered and why_not_others.

WHY SELECTED. The dossier's next_justified_action is sync_first: the entity is known to the engine but absent from the canonical prospect JSONL. Per A11 it must synchronize before any ACT routing; per A10 its JSONL absence is never outreach permission. WATCH holds until the sync clears.
Cite: dossier next_justified_action; RD-20260914-04 why_selected; authority_refs A10, A11.

AUTHORITY. AUTHORITY-V2 A11/A10/A7 (quoted verbatim in the routing record's authority_refs), plus the operations manual 16a (the JSONL is the ONE source of truth and every prospecting batch merges into it, cited in the sync evidence file item 6). The sync is an internal durable write to the campaign's own store, not an external commitment; no outreach was decided or performed.
Cite: RD-20260914-04 input_state.authority_refs and selection.authority_relied_upon; sync evidence file item 6.

EXECUTED. Yes. The decision_outcome record for RD-20260914-04 (ts 2026-09-14T20:07:42.873121+00:00) reports executed: true, by the BUSINESS-AGENT SEAM capstone workstream (priority #14), consistent with the router's execution field prescribing that the parent/pipeline machinery performs the sync. The router itself never executes.
Cite: routing-decisions.jsonl decision_outcome record; RD-20260914-04 execution note ("See decision_outcome record").

WHAT HAPPENED. Exactly one record was appended as line 245 of goals/ping-social-outreach-campaign/files/western-co-prospects.jsonl: 33 canonical fields, all strings, no _migration_note (non-CSV row), phone/email/website/owner empty (not invented), trade labeled inferred-from-name, priority WATCH, SOS entity ID 20261853316 in notes and opportunity_evidence. The sync evidence file was written with a query-level log that corrected the entity ID from the dated decisions file's loose "20261834684-equivalent" phrasing (which belonged to Wakefield and Company, LLC) to the verified 20261853316, leaving the dated file unedited. The decision_outcome record was appended.
Cite: western-co-prospects.jsonl line 245; sync evidence file items 8-12 and query log Q1-Q5; routing-decisions.jsonl decision_outcome.

OUTCOME. The sync gate is cleared for this business: it is now in the canonical store with priority WATCH and verified entity #20261853316. The gap class went from 195 to 194 (attested) and currently reads 194 with Captain Ron absent (independently verified). WATCH disposition stands; no contact route surfaced, so no outreach is justified.
Cite: decision_outcome outcome and new_evidence; independent re-run of discover-pipeline-jsonl-gaps.py (194 gaps, 0 matches for "captain ron").

WHAT NEXT. WATCH until a contact route surfaces. Recheck Captain Ron for a published phone/email/website in a later radar round; if one surfaces, route WATCH to ACT through the existing verification and pipeline machinery.
Cite: decision_outcome next_step; sync evidence file item 10; RD-20260914-04 next_step.

## Independent Verification

(a) business-context.py re-run for "Captain Ron Handyman L.L.C.": RETRIEVAL STATUS: UNCHECKABLE; probe error PSQL_FAILED (fail-closed, nothing invented); disk evidence only (round-52 meta-ai-intel answer mentions the business); all consumed fields UNCHECKABLE; "Decision NONE (fail-closed)". This exactly matches the evidence file's claim in item 3 and the decision_outcome's observation. Deterministic on re-run.

(b) discover-pipeline-jsonl-gaps.py re-run: pipeline NEW parsed: 195; jsonl unique names: 241; gap count: 194; dispositions ACT 120 / WATCH 31 / RESEARCH_MORE 43; wrote pipeline-jsonl-gaps.jsonl and the dated MD. grep for "captain ron" in the gaps file returns 0 matches. The post-sync state (194 gaps, Captain Ron absent) is independently confirmed. The pre-sync 195 and the 195-to-194 delta are attested only by the evidence file (see Audit Gaps).

(c) New JSONL record validation against outreach/prospect-schema.json: all 33 schema fields present (no missing required fields, no enum violations, all values strings, _migration_note correctly absent for a non-CSV row). Field-by-field check against the dossier: city/state/region, opportunity_primary NEW_BUSINESS_SETUP, priority WATCH, filing date 2026-07-14, address 449 Renaissance Ct, agent Ronald Reagan Cummings, trade labeled "(inferred from name only; no service description evidenced)" all agree with dossier/pipeline.md:1443. Phone, email, website, owner_name are empty, not invented. Exactly one Captain Ron record exists in the 245-line file. Baseline spot-check: all 244 pre-existing rows miss required conversion_* fields, matching the evidence file's drift note (it did not mutate them).

(d) routing-decisions.jsonl ordering: 6 records, timestamps strictly ascending (20:01:29 to 20:07:42 UTC), sequence RD-20260914-01 decision then outcome, RD-20260914-02 dry_run, RD-20260914-03 dry_run, RD-20260914-04 dry_run=false then its outcome. Append-only consistent. RD-20260914-02 and RD-20260914-03 are dry runs with no outcomes, which is the expected pattern.

(e) SOS entity ID 20261853316: page text fetched from the evidence file's verbatim cited URL https://opengovco.com/business/20261853316 (text fetch only; not a browser visit). The page shows: Captain Ron Handyman L.L.C. (Entity #20261853316), DLLC, formed 2026-07-14, good standing, principal address 449 Renaissance Ct, Grand Junction, CO 81507, registered agent RONALD REAGAN CUMMINGS, data provider CDOS via data.colorado.gov. This plausibly and exactly matches the dossier, the sync record's notes, and the pipeline row. The Q1-Q4 search sequence in the query log cannot be independently re-observed, but the Q5 endpoint result is confirmed.

Artifact-level inconsistency found: RD-20260914-04's routing decision record reports ping_retrieval status OK with accepted event and verification verified, while the sync evidence file (item 3) and the decision_outcome record both report UNCHECKABLE (PSQL_FAILED). My independent re-run sides with the outcome record (UNCHECKABLE). The routing record's ping block looks stale or carried from the dry-run. It is outcome-neutral because ping_relevance was NONE (both counterfactual runs selected SYNC_REQUIRED), but the records disagree and a reader of the routing record alone would get the wrong retrieval status.

## Falsification Verdicts

WRONG BUSINESS: REFUTED. Decision, dossier, pipeline.md:1443, gap row, JSONL record, and the independently fetched opengovco entity page all name the same entity: Captain Ron Handyman L.L.C., 449 Renaissance Ct, Grand Junction, CO, Entity #20261853316.

INSUFFICIENT EVIDENCE: REFUTED. Filing facts were verified via the CDOS-sourced opengovco page; the contact-route absence was twice-evidenced (RD-20260914-01 negative research outcome plus round-52 verification); the dossier grades every fact; the SOS ID correction was done with a query-level log.

STALE KNOWLEDGE: REFUTED. All facts are dated 2026-09-14; the one stale item (the "20261834684-equivalent" phrasing in business-decisions-2026-09-14.md line 13, which actually belonged to Wakefield and Company, LLC) was identified, superseded by the verified 20261853316, and left unedited in place as history.

BAD ROUTING: REFUTED. Research had already been executed with an honest negative outcome, so re-research was rejected for cause; every outreach channel was rejected because no contact route exists and SYNC_FIRST fail-closes; PING emission and router-performed sync were rejected on authority boundaries. SYNC_REQUIRED was the only action that closed the sync_first state, and both counterfactual runs agreed.

UNAUTHORIZED ACTION: REFUTED. The action was taken under cited authority A11/A10/A7 plus operations manual 16a; it was an internal durable write to the campaign's own canonical store, creating no external commitment and performing no outreach.

DUPLICATE ACTION: REFUTED. Exactly one Captain Ron record exists in the JSONL (line 245 of 245); the outcome record states one row only, no second list, no PING emission.

UNKNOWN EXECUTION: REFUTED. Execution is durably evidenced: JSONL line 245 exists, parses, and validates against the schema; the decision_outcome record documents execution with observation, outcome, and new-evidence paths; the gap class re-verified at 194 without this business.

WRONG OUTCOME: REFUTED. Independent re-run of discover-pipeline-jsonl-gaps.py yields 194 gaps with Captain Ron absent; the appended record is present and schema-conformant.

BAD LEARNING: REFUTED. The recorded learning matches the verified facts: PING retrieval was UNCHECKABLE (confirmed by independent re-run) and was never treated as PASS; the uncertainty was carried forward in the counterfactual (ping_relevance NONE); the negative research outcome was recorded honestly; the entity-ID correction was logged as new evidence without rewriting history.

## Audit Gaps

1. The pre-sync state cannot be reconstructed from artifacts alone. The claim that the gap class was 195 with Captain Ron present at pipeline-jsonl-gaps.jsonl line 39 is attested only by the sync evidence file. The discovery script regenerated the gaps file (now 194 lines, Captain Ron absent), and no snapshot of the pre-sync file exists among the listed artifacts. Only the end state (194, absent) is independently verifiable.

2. Consequently, the 195 to 194 delta is unattested except by the workstream's own record. My re-run confirms 194 post-sync, which is consistent with one removal, but the prior 195 is not independently provable.

3. The routing decision record for RD-20260914-04 and the sync evidence file / decision_outcome disagree on PING retrieval status (OK/verified vs UNCHECKABLE/PSQL_FAILED). My independent re-run matches the outcome record, indicating the routing record's ping block is stale. A reader relying on the routing record alone would believe PING retrieval succeeded. Outcome-neutral here (ping_relevance NONE), but the records should be reconciled.

4. The actor identity ("BUSINESS-AGENT SEAM capstone workstream, priority #14") and the Q1-Q4 search steps in the SOS query log are attested only by the workstream's own records. I independently verified the Q5 endpoint result but not the search sequence, and there is no independent artifact identifying who performed the append.

5. Whether the router's with-PING / without-PING counterfactual was genuinely executed live is attested only by the record's method claim ("decide_one executed twice over two real input states; outcome never hand-coded"). I re-ran business-context.py (UNCHECKABLE, deterministic) and the routing script's --help (it supports --dry-run and explicitly "selects; never schedules, never emits to PING, never mutates evidence"), but I did not run the live routing pass because --dry-run appends to routing-decisions.jsonl and I would not mutate evidence artifacts as an auditor.

6. No artifact records the exact wall-clock duration or byte-level append proof of the JSONL write beyond the presence of line 245 and the outcome record's timestamp; append-only file ordering is the sole integrity mechanism, and no signature or checksum covers the new row.
