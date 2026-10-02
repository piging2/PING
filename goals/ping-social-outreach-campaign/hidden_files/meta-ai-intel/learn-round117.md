# Campaign learnings — outreach-engine round 117 (2026-09-22 ~14:15-15:00 MDT)

## 1. Corridor segment pools are exhausting (VERIFIED)
Two more corridor trade segments hit duplicates-only this round: appliance repair (21 near-misses, ALL duplicates of existing leads/pipeline rows, out-of-geography, directory-only, or lead-gen doorway pages) and chimney sweeps/service (17 near-misses, same pattern). Round 116 hit zero yield in irrigation/sprinkler + fencing. Corridor research yield across rounds 115-117: 5 -> 0 -> 1 new qualifiers. The established-trade segment research play is running out of new businesses in the 12-town corridor; future candidate yield will come from new-business radar (genuinely new formations), social discovery, and Meta AI segments, not from re-researching the same segments.
Evidence: scratch/research-pipeline-rows-round117.md (full near-miss logs), scratch/research-pipeline-rows-round116.md (0 staged), pipeline.md round-115 section (5 staged). Verified by the engine: dedupe greps against leads.md / pipeline.md / facebook-dms.md / canonical JSONL.

## 2. Meta AI negative claims need independent verification (reliability data point 32)
The b-new-business-radar answer claimed "no website found" for RER Plumbing and HVAC LLC; independent web search found rergj.com live with published phone (970-596-3300) and email (info@rergj.com). This repeats the round-19 avnconstructionllc.com correction (Meta AI said no website found, site was live). Standing rule: Meta AI's negative existence/absence claims get zero default trust; verify before recording.
Evidence: scratch/meta-ai-verification-round117.jsonl.

## 3. b-radar "opened/filed within 60-90 days" is systematically unreliable (reliability data point 33)
Third strike: this file's claims were RER formed 2023-08-28 (only an address-change filing 2025-10-24), Kooler Garage Doors = 2025 expansion of a 2015 Gunnison firm, Pride and American Dream = expansions/PR pushes not formations. Prior: round-19 Contour Curbing false-new; round-20 zero verifiable dates. The b-radar prompt's newness claims get zero default trust; a new-filing tag requires an exact verifiable formation date.
Evidence: ingested.log round-117 entry; web search results (opengovco.com/business/20231905447).

## 4. Archival procedure is clean and repeatable (operational)
Archived the 4 weakest WATCH rows (Alpine Shades, Colorado Awning and Screen, Rocky Mountain Plumbing & Heating, Mt Lincoln Plumbing; reasons in prospect-archive.jsonl), merged 5 deferred round-115 rows + RER + Affordable Appliance LLC: 297 -> 299 -> 300 active. The round-53 precedent (archive 6, promote 5) worked the same way. Headroom policy: keep merging new qualifiers only after archival review at 297+.

## 5. Send-pool constraint is contact-route quality, not the cap (operational)
Slot 10 of the 2026-09-22 UTC cap unfilled for the third straight round. The strict own-site rule + WATCH-stays-on-watch + corridor-only rule + zero new HOT/WARM email-route prospects together mean the queue of send-eligible emails is genuinely empty, not merely capped. Email-route prospect discovery (own-site published email + real signal) is the bottleneck; phone-route prospects accumulate but the engine's send path is email-first.

## 6. FB corridor trade-promo volume is near zero this week (channel intelligence)
Delta-scan #117: 200 posts across 10 groups, 74 in-window, 0 corridor trade promos; all 5 trade sightings came from the Denver-area networking group (1 parked beyond-corridor, 2 repeat, 2 unverified-location). Western Colorado groups carried resale + community content only. Third window this week with zero western-CO trade promos. Organic FB trade discovery in the corridor is seasonal/thin right now; the channel's current value is the networking groups, which are mostly out-of-corridor.
Evidence: facebook-scan-round117.md.
