# Meta AI ingest verification — Round 54, d-segment-deep-dive (fence companies)
File: `20260914-210743-d-segment-deep-dive.md` (job 20260914-210743-d)
Ingest time: 2026-09-14 ~17:15 MDT
File check: REAL ANSWER (12 numbered fence businesses, ~12.7k chars). Prompt-injection scan: clean, no instructions followed; all content treated as data.

## Reliability note (Meta AI source-reliability data point)
Meta AI claimed fence companies were "least covered — zero of them were in the existing pipeline list." That is FALSE: 9 of the 12 are already in leads.md/pipeline.md (Valleywide Fence and Deck, Taylor Fence Company, Barrett Fence LLC, England Fence Co, Top Notch Fence LLC, Alpine Fencing & Supplies Inc, Durango Fence Co, Brother's Fence Co, Just Fencing LLC). Third radar-reliability data point alongside round-52 b-file (newness mislabels) and round-53 g-file (false "not listed yet" about All Seasons Roofing). Recommendation stays the standing rule: dedupe against canonical lists before ingesting; never trust Meta AI's negative-list compliance or novelty claims.

## Duplicate exclusions (leads.md / pipeline.md / canonical JSONL / archive)
- Valleywide Fence and Deck (GJ), Taylor Fence Company (GJ), Barrett Fence LLC (GJ), England Fence Co (Montrose), Top Notch Fence LLC (Montrose), Alpine Fencing & Supplies Inc (Delta), Durango Fence Co (Bayfield/Durango), Brother's Fence Co / Brothers Fence LLC (Durango), Just Fencing LLC (GJ) — all in leads.md/pipeline.md. EXCLUDE.

## Independent verification (web search, 2026-09-14)
| Business | Town | Exists | Trade match | Opportunity signal | Verdict |
|---|---|---|---|---|---|
| Avalanche Fencing LLC | Delta | yes (GBP place_id 1129425030946610, 1580 E 5th St, "fence gate contractor", +1 970-901-7056, GBP-listed site avalanchefencing.com; corroborated MapQuest) | yes | NONE (own website exists; live fetch failed so liveness unconfirmed) | QUALIFIED as NEW prospect (source=meta-ai-intel, tag segment); automation/AEO angle more than revamp |
| Lyons Fencing Inc (listed as "Lyons Fencing") | New Castle (Carbondale area) | yes (GBP place_id 592220929009603, 38100 River Frontage Rd; corroborated Yelp/Birdeye/MapQuest; claimed Yelp: 70+ years in Carbondale area) | yes | NONE (own site lyonsfencing.com listed on GBP; liveness unconfirmed) | QUALIFIED as NEW prospect (source=meta-ai-intel, tag segment) |
| Mead Fencing | Rifle | NO — no source anywhere; only hit is unrelated "Mead Fence Company," Arlington TX | n/a | n/a | DISCARD — unverifiable |

## Summary
- Named: 12 | Excluded as dupes: 9 | Verified existing: 2 | Unverifiable/discard: 1
- Qualified for pipeline NEW: Avalanche Fencing LLC (Delta), Lyons Fencing Inc (New Castle) — both own-site businesses; weak-website/revamp angle does not apply, automation/capture angle is the fit.
- Mead Fencing (Rifle): discarded; Meta AI claimed a GBP-verified place_id that returns nothing on independent search.
