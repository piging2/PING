# Sync evidence: RD-20260914-04 (SYNC_REQUIRED) for Captain Ron Handyman L.L.C.

Executed 2026-09-14 by the capstone workstream (BUSINESS-AGENT SEAM, priority #14).
This is the query-level verification log (audit fix: earlier rounds lacked query-level logs).

## Chain walked

1. REAL BUSINESS: Captain Ron Handyman L.L.C., Grand Junction, CO.
2. DOSSIER: read fresh at `tandem/knowledge/dossiers/captain-ron-handyman-llc.json`
   (builder tandem/entity-dossier.py, built 2026-09-14T19:58:41Z). Filing-only:
   449 Renaissance Ct, agent Ronald Reagan Cummings, no phone/email/website
   published, SOS formation 2026-07-14 (verified, grade verified, PING event
   874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7).
3. PING RETRIEVAL: `tandem/business-context.py "Captain Ron Handyman L.L.C."`
   -> RETRIEVAL STATUS: UNCHECKABLE. Probe error (fail-closed, nothing
   invented): PSQL_FAILED; no ping_events rows mention this business. Disk
   evidence only: the round-52 meta-ai-intel answer mentions the business.
   UNCHECKABLE was never treated as PASS; the router carried the uncertainty
   forward in its counterfactual (ping_relevance verdict NONE, both runs
   selected SYNC_REQUIRED).
4. STATE: WATCH + SYNC_FIRST, per `tandem/pipeline-jsonl-gaps.jsonl` line 39
   (pre-sync run): disposition WATCH, jsonl_absent true, sync SYNC_FIRST,
   pipeline_ref pipeline.md:1443.
5. DECISION: `tandem/route-next.py --business "Captain Ron Handyman L.L.C."`
   selected SYNC_REQUIRED (dry-run inspected first, then appended).
   Record: RD-20260914-04 in `tandem/routing-decisions.jsonl`, authority
   A11/A10/A7, ping_relevance NONE from the EXECUTED counterfactual
   (with-PING vs without-PING runs agreed), router v2.
6. AUTHORITY: (a) the campaign's own canonical store: the operations manual
   (16a) names the JSONL the ONE source of truth and every prospecting batch
   merges into it; (b) the directive's SYNC_FIRST mandate as encoded in
   AUTHORITY-V2 A10 (absence from the canonical JSONL is never outreach
   permission; it is a fail-closed sync signal) and A11 (SYNC_FIRST must
   synchronize before any ACT routing). This sync is an internal durable
   write to our own store, not an external commitment; no outreach was
   decided or performed.
7. DURABLE INTENT: the routing decision record RD-20260914-04 IS the durable
   intent (selection SYNC_REQUIRED for this business; the router's execution
   field hands execution to the pipeline machinery, which this workstream
   performed).
8. ACTION: appended exactly one record (line 245) to
   `goals/ping-social-outreach-campaign/files/western-co-prospects.jsonl`.
   All 33 canonical fields present, all strings, no _migration_note (that
   key exists only on CSV-migrated rows). Every field is known (dossier /
   gaps file / verified SOS evidence), inferred-and-labeled (trade), or
   explicitly empty = unknown. No contact route, URL, phone, or email was
   invented: those fields are empty. Priority WATCH. Source cites
   pipeline.md:1443 and the round-52 meta-ai-intel run 20260914-102446.
9. OBSERVATION: re-read the appended line; it parses as JSON; it validates
   against `outreach/prospect-schema.json` (the canonical validator) and is
   the first schema-conformant row in the file. Baseline note: all 244
   pre-existing rows fail the same schema (missing conversion_state /
   converted_at / conversion_evidence, added 2026-09-13 and never
   backfilled). That drift predates this sync; this workstream did not
   mutate the existing rows.
10. OUTCOME: re-ran `tandem/discover-pipeline-jsonl-gaps.py`. Gap count
    195 -> 194; grep confirms Captain Ron Handyman L.L.C. no longer appears
    in the gap class. The sync gate is cleared for this business; the WATCH
    disposition stands (no contact route surfaced, so no outreach).
11. NEW EVIDENCE: the JSONL record itself (line 245), the 194 gap count, this
    file, and the entity-ID correction below.
12. AUDITABLE RECORD: decision_outcome record for RD-20260914-04 appended to
    `tandem/routing-decisions.jsonl` with execution, observation, outcome,
    new-evidence paths, and next step.

## Query-level verification log: SOS entity ID

The dated decisions file `tandem/business-decisions-2026-09-14.md` line 13
uses loose entity-ID phrasing for Captain Ron ("Entity #20261834684-equivalent
record on OpenGovCO"). That phrasing was never verified. The dossier itself
carries no entity ID. Per the parent's finding, the 20261834684 phrasing
actually belongs to Wakefield and Company, LLC. The dated file is NOT edited
(history stands); this correction is recorded as new evidence here.

- Q1 (2026-09-14, browser.search): "Captain Ron Handyman L.L.C. Colorado
  Secretary of State entity ID Grand Junction" -> SOS guidance pages only,
  no direct entity hit.
- Q2 (browser.search): 'opengovco "Captain Ron Handyman" LLC business' ->
  81507 zip-code listings on opengovco entity pages confirming the filing
  (449 Renaissance Ct, agent Ronald Reagan Cummings, form date 2026-07-14),
  but no dedicated Captain Ron entity page in results.
- Q3 (browser.search): '"Captain Ron Handyman L.L.C." opengovco.com/business/'
  -> same zip-code listings; still no direct page.
- Q4 (browser.open, URL copied verbatim from search result 4):
  https://opengovco.com/business/20261773343 (Tote and Trailer Moving LLC,
  entity verified in the dated file) -> its "Businesses in the same zip
  code" table carried an outlink on "Captain Ron Handyman L.L.C.".
- Q5 (browser.open via that page's outlink, not a guessed URL):
  https://opengovco.com/business/20261853316 ->
  **Captain Ron Handyman L.L.C. (Entity #20261853316)**, DLLC, good standing,
  formed 2026-07-14, registered office 449 Renaissance Ct, Grand Junction,
  CO 81507; registered agent RONALD REAGAN CUMMINGS (same address).
  Data provider: Colorado Department of State (CDOS), via data.colorado.gov.

VERIFIED ENTITY ID: **20261853316**. This is the ID used in the sync record's
notes and opportunity_evidence fields. The dated decisions file's
"20261834684-equivalent" phrasing is superseded by this direct lookup and is
left unedited in place.
