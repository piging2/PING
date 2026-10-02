# Business decisions: b-new-business-radar round 52 (2026-09-14)

Source run: 20260914-102446 (accepted PING event 874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7, accepted 2026-09-14 17:19:45 UTC).
Raw answer: ~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/20260914-102446-b-new-business-radar.md
Provenance: 20260914-102446-b-new-business-radar.provenance.json (state: verified, accepted_by_ping)
Ingested.log: round 52 line, DISTILL observation emitted as event 874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7
Pipeline: ~/workspace/outreach/pipeline.md lines 1441-1445 (three NEW/WATCH entries added round 52)
Canonical JSONL: NO records exist for any of the three in western-co-prospects.jsonl (244 lines checked; see gap note)
Engagement history: no matches in facebook-engagement.md or instagram-engagement.md for any of the three

## Decision: Captain Ron Handyman L.L.C. -> WATCH

Known: Colorado LLC (Entity #20261834684-equivalent record on OpenGovCO), formed 2026-07-14 (62 days before 2026-09-14, inside the 60-90 day window), good standing, principal address 449 Renaissance Ct, Grand Junction, CO 81507, registered agent Ronald Reagan Cummings (same address).
Evidence: OpenGovCO business formation lists sourced from data.colorado.gov (Colorado Department of State), e.g. https://opengovco.com/business/20241864601 (zip-code list showing the filing); independent search 2026-09-14 confirms the same filing data.
Uncertain: whether the business is operating at all; trade is inferred from the name only (handyman/home repair, no service description anywhere); no owner contact beyond the agent name; no revenue, crew, or customer evidence.
Entity identity: the LLC entity on file with Colorado SOS. Platform/account identity: UNKNOWN (no Facebook page, no Instagram, no Google Business Profile found).
Business relevance: Grand Junction = Western Colorado, primary geography. Handyman trade = target segment (owner-operator handyman shops are the classic missed-call pain fit).
Opportunity status: filing-only; no website, no GBP, zero web presence beyond SOS mirrors.
Contactability: NONE evidenced. No phone, email, or website published on any filing record, directory, or search result.
Existing interaction history: none.
Suppression/eligibility: NEW entry pipeline.md:1443, status WATCH. Not suppressed; not previously contacted.
Justified action: none today. WATCH until a contact route surfaces (new filing plus target trade/geography keeps it eligible; acting now would mean blind outreach with no honest channel).

## Decision: Tote and Trailer Moving LLC -> WATCH

Known: Colorado DLLC, Entity #20261773343, formed 2026-06-24 (82 days before 2026-09-14, inside window), good standing, principal address 605 Glacier Dr, Grand Junction, CO 81507, registered agent Ryan Michael Jones (same address).
Evidence: https://opengovco.com/business/20261773343 (OpenGovCO, CDOS-sourced); independent search 2026-09-14 confirms filing details.
Uncertain: whether operating; trade inferred from name (moving/home services); no service description, fleet, or customer evidence.
Entity identity: the LLC entity on file with Colorado SOS. Platform/account identity: UNKNOWN (no social page, website, or GBP found).
Business relevance: Grand Junction = Western Colorado. Moving is home-service adjacent; new moving outfits live on phone/SMS booking, which fits the missed-call capture angle if contact ever appears.
Opportunity status: filing-only; no website, no GBP, zero web presence beyond SOS mirrors.
Contactability: NONE evidenced. No phone, email, or website published anywhere.
Existing interaction history: none.
Suppression/eligibility: NEW entry pipeline.md:1444, status WATCH. Not suppressed; not previously contacted.
Justified action: none today. WATCH until a contact route surfaces.

## Decision: AB Steel LLC -> WATCH

Known: Colorado DLLC, Entity #20261763154, formed 2026-06-23 (83 days before 2026-09-14, inside window), good standing, principal address 653 Terrace Dr, Grand Junction, CO 81507, registered agent Acom Unlimited LLC (a registered-agent service, not an individual owner).
Evidence: https://opengovco.com/business/20261763154 (OpenGovCO, CDOS-sourced); independent search 2026-09-14 confirms filing details.
Uncertain: whether operating; trade inferred from name (steel/fence/welding per round-52 intake; not independently confirmable); no services, projects, or customer evidence. Note: the agent being a commercial registered-agent service weakens the owner-operator assumption; could be a placeholder or investment entity rather than a working trade shop.
Entity identity: the LLC entity on file with Colorado SOS. Platform/account identity: UNKNOWN (no social page, website, or GBP found).
Business relevance: Grand Junction = Western Colorado. Fence/steel/welding is home-service adjacent; weaker target fit than handyman or moving, and the commercial agent raises the chance this is not an owner-operator trade business.
Opportunity status: filing-only; no website, no GBP, zero web presence beyond SOS mirrors.
Contactability: NONE evidenced. No phone, email, or website published anywhere.
Existing interaction history: none.
Suppression/eligibility: NEW entry pipeline.md:1445, status WATCH. Not suppressed; not previously contacted.
Justified action: none today. WATCH until a contact route surfaces; treat as weakest of the three (agent-service registered agent + unverified trade).

## Exclusion confirmations (seven Meta AI claims, remain excluded)

1. Only Option Handyman Service LLC: excluded; operating since at least 2023, Meta AI's low-review-count newness heuristic was disproven.
2. Red Rock Gutters LLC: excluded; advertising as an established local option since 2024, and already in the pipeline.md:1370 excluded batch (duplicate).
3. Disanza Gutterworks LLC: excluded; Angi listing dates it to ~2023, not new.
4. Pride Plumbing Heating & Cooling LLC: excluded; serving Grand Junction since 2016, already in pipeline (leads.md:1518 / pipeline.md:630 duplicate).
5. A Cut Above Landscaping & Lawn Care LLC: excluded; the LLC was dissolved 2025-03-25 (dead filing, not a new business; near-miss to a different Commerce City business).
6. Mascarenas Lawn Care Services LLC: excluded; entity delinquent since 2021.
7. Mesa Seamless Gutters LLC: excluded; already in the pipeline.md:1370 excluded batch and newness never confirmed (chamber new-member label is not a formation date).

All seven exclusions were re-verified in the round-52 ingestion pass and each is grounded in evidence, not heuristics.

## Radar yield diagnosis (decision-engine view)

Round 52 researched 10 named businesses and produced zero actionable business decisions. Three were verified as genuinely new Colorado filings inside the 60-90 day window, but all three lack any published contact route, so the only justified action is WATCH; seven were mislabeled as new (established, dissolved, delinquent, or duplicated). Optimized for justified business opportunities discovered, the radar's yield this round is zero.

Diagnosis, by category:
- Insufficient contactability: all three verified new filings have no phone, email, website, or social page. A filing without a contact route is not an opportunity yet; it is a future-watch item. This is the primary yield killer.
- Weak targeting: 7 of 10 Meta AI newness claims were wrong. Chamber new-member labels, low review counts, directory presence, and expansion press are unreliable newness substitutes. The accepted generalizable rule (PING event 874da5eea9503c023011061b1482b9cb206525989e242661b43f8c28217caeb7) is now: new-business claims require a verified Colorado SOS formation date, and the operational rule is no pipeline add without one.
- Insufficient context: for the three qualified filings, nothing is known beyond the filing itself (trade inferred from name, no operating evidence). Verification confirmed newness, not opportunity.
- No finding of genuinely no actionable opportunity in the market; the radar simply has not yet produced a new filing with a real contact route.

## Downstream implications

1. Do not draft emails, forms, or DMs for any of the three businesses. There is no honest contact channel.
2. Keep all three in pipeline.md as NEW/WATCH entries; recheck for a published contact route (website, GBP, Facebook page, chamber listing with phone) in a future round, at which point WATCH can convert to ACT.
3. If the radar keeps returning filing-only businesses, the next justified improvement is to the brief (existing machinery, not new infrastructure): require the research agent to report only businesses with a published contact route, or to tag filing-only results separately so verification effort is not spent on uncontactable entities.
4. Gap noted for the parent agent: the three accepted businesses have pipeline.md entries but no records in the canonical western-co-prospects.jsonl. Whether filing-only WATCH entities belong in the canonical store is a schema decision the parent should make; the agent running step 4e (pipeline add) should either add them with contact fields blank and priority WATCH, or leave them pipeline-only by rule.
