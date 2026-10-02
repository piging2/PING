# Ingest round 66 - b-new-business-radar (2026-09-16 ~05:20 MDT)

File processed: 20260916-090428-b-new-business-radar.md (answer captured 03:06 MDT today)
Answer list: 8 named businesses, all claimed as new LLC/inc filings July 2026.

## Qualified (5) - written to scratch/ingest-round66-b.jsonl (canonical 33-field schema; NOT merged to pipeline.md or canonical JSONL per standing rule)

All five have VERIFIED CDOS formation dates inside the 60-90 day window (2026-06-18 to 2026-07-18 relative to 2026-09-16), corroborated across multiple opencorpdata.com / opengovco.com CDOS-mirror zip tables (source data.colorado.gov, the CDOS open-data mirror). All are filing-only presences: no owned website, GBP, phone, email, or Facebook page found in independent web search, so all are priority_state WATCH (no published contact route), intel type=new-filing, source=meta-ai-intel, opportunity_primary=NEW_BUSINESS_SETUP, confidence medium.

1. Gold Leaf Roofing LLC - Glenwood Springs - roofer. Formed 2026-07-08 (70 days). Principal address 50 Deer Valley Dr, Glenwood Springs, CO 81601; agent Jeston Alan Long. Verification: opencorpdata/opengovco CDOS-mirror zip-code tables show "Gold Leaf Roofing LLC | 50 Deer Valley Dr, Glenwood Springs, CO 81601 | Jeston Alan Long | 2026-07-08" in 6+ independent table pages.
2. GH Paint L.L.C. - Grand Junction - painting contractor. Formed 2026-07-08 (70 days). 2978 Bret Dr, GJ 81504; agent Arthur Garret Holt. Verification: same-table corroboration across opengovco CDOS mirrors (435 32rd 225 LLC page, ContentCrafters LLC page, Royal Prodigies LLC page, Chic Junktique LLP page, Marketing Solutions LLC page) all show identical row with form date 2026-07-08.
3. Skilled Hands Handyman Services LLC - Grand Junction - handyman/home repair. Formed 2026-07-10 (68 days). 610 Peace Dr, GJ 81504; agent Jacob Daniel Sebold. Verification: corroborated across opencorpdata Titan Academy page, 05 Racing LLC page, Veteran Craftsman Solutions page, Royal Prodigies page, Magi Crafts page, A Cut Above Landscaping page.
4. Golden Arrow Property Services LLC - Grand Junction - property maintenance/landscaping/cleaning. Formed 2026-07-14 (64 days). 391 Sunnyside Ct Unit H, GJ 81504; agent Lidia Esther Lopez Hernandez. Verification: corroborated across Titan Academy, 05 Racing, Chic Junktique, Veteran Craftsman pages.
5. BlueSky Pressure Washing LLC - Grand Junction - pressure washing/exterior cleaning. Formed 2026-07-18 (exactly 60 days, window edge). 3127 Brownie Cir Spc 34, GJ 81504; agent Alondra Chavez. Verification: corroborated across 05 Racing, Chic Junktique, A Cut Above Landscaping pages.

Note: the 8th item, Stone Surgeon LLC's row in these same tables confirms the round-60 qualified date 2026-07-19 exactly, which cross-validates that the mirror tables are consistent with the round-60 entity-page verification.

## Excluded (3)

1. Stone Surgeon LLC (Grand Junction) - dupe: already in pipeline.md, qualified round 60 as source=meta-ai-intel new-filing. Meta AI re-served it (reliability pattern continues).
2. Trueview Windows & Doors, Inc (Grand Junction) - dupe: already in pipeline.md, qualified round 60 as source=meta-ai-intel new-filing. Meta AI re-served it.
3. Aces Roofing LLC (Grand Junction) - NOT NEW: CDOS entity #20231384362, form date 2023-04-05 per the opencorpdata entity page (transaction history: formed 2023-04-05, filings 2024/2025/2026, principal office 608 Round Table Rd, GJ 81504, agent Luis Alberto Matias Martinez, good standing). Meta AI's claim "formed in July 2026 window, listed with BlueSky in same batch" is FALSE. RELIABILITY DATA POINT #7: batch-adjacency inference failure, same failure mode as round-60's Archuleta Cleaning Services (data point #4). The entity exists (name + address match) but is a 3+ year old business, so it does not qualify for the new-business radar.

## Reliability summary

- Explicit SOS formation dates: correct 6/6 this round (Gold Leaf, GH Paint, Skilled Hands, Golden Arrow, Stone Surgeon re-verified, BlueSky) and 12/13 cumulative since round 60 (adding Aces, where Meta AI gave NO explicit date, only a batch-adjacency claim). Explicit dates remain trustworthy; adjacency claims remain untrustworthy.
- Novelty/dedupe claims: Meta AI re-served 2/8 as new that are already in pipeline (Stone Surgeon, Trueview). Standing rule holds: always dedupe independently, never trust its negative lists.
- Website-absence: Meta AI claimed no websites for the five qualifiers; independent search found no sites/GBPs for any of them (consistent).

## c-review-complaint-signals status (not ingested)

20260916-090703-c-review-complaint-signals.md.CAPTURE_FAILED plus contract-report.json. The contract validator REJECTED the answer (exit 3 equivalent): 12 entries parsed, 0 VALID, all 12 classified CONTRADICTED, min_required 3, hard violation "only 0 VALID entries, need 3". Fail-closed per contract: nothing extracted, nothing promoted. RELIABILITY DATA POINT: this is the second consecutive c-brief rejection (round 62 also 0/10 VALID, REJECTED). The c-brief output continues to fail its own machine-checkable contract; two rejections in two days suggests the brief's prompt or the worker's answer format is systematically off, not a flaky run.

## j/k files

20260916-014854-j-clowning-pattern-mining.md and 20260916-015126-k-clowning-distribution.md are live-clowning marketing-machinery briefs, out of this engine's ingest scope. Not processed.

## DISTILL

Skipped. No mechanism-level finding meets the PING bar: the verification of 5 new filing dates and the Aces batch-adjacency false claim extend the already-recorded round-52/round-60 operational rules (no pipeline add without a verified filing date; never trust novelty/adjacency claims) but do not rise above them. Operational value retained in outreach machinery. No OBSERVATION_CREATED emitted.
