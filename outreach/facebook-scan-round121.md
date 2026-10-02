# Facebook delta-scan #121 (round 121)

Window: creation_time > 1790140184 (2026-09-22 23:09:44 MDT) through ~02:14 MDT scan time.
Route: facebook-cli groups posts --sort-by NEW_POSTS --limit 35 x6 (CLI caps at 20 per group; 20, 20, 20, 20, 18, 20 returned), local in-window filter. Read-only; no DMs sent, no likes, no comments.
Post content/author resolved per-post via `facebook-cli post read --url` for the empty-caption post and the trade promo (2 reads, both OK; returns owner_name + media_type).

## Posts scanned per group
- Western Colorado Message Board & Classifieds (5456977881034408): 20 fetched, 1 in-window: 2ND TIME AROUND CO metal roofing & supplies promo, Parachute CO, posted by Jeffrey Grant (23:33). GENUINE TRADE PROSPECT.
- Buy & Sell in Grand Junction (108728816001912): 20 fetched, 6 in-window: 2nd Time Around Co page entshare of the same metal-roofing flyer (00:08, resolved: same business, second sighting); Brown sectional sofa $25 (23:03); Needoh Halloween advent calendar $60 (22:43); dog calming aids bundle $15 (22:42); dog training leads/leash $12 (22:41); Mayhem wheels $1,250 (22:40). All except the share are personal resale, skipped.
- Delta, Colorado Community Message Board (1504277980997243): 20 fetched, 0 in-window.
- Orchard Mesa, Colorado Message Board (486356801008208): 20 fetched, 0 in-window.
- Fruita, Colorado Message Board (3741333852807065): 18 fetched, 0 in-window.
- Living In Grand Junction Colorado (1082777608577867): 20 fetched, 0 in-window.

Total: 118 posts fetched, 7 in-window posts reviewed.

## Classification summary
- Home-service trade business promos: 1 business, 2 sightings (2ND TIME AROUND CO)
- Demand/ISO signals: 0
- Hiring/growth signals: 0
- Personal resale: 5 (Buy & Sell GJ: sofa, Needoh calendar, dog calming aids, dog training leads, Mayhem wheels)
- Empty shares resolved: 1 (Buy & Sell GJ 00:08, resolved: business page share of the metal-roofing flyer, not empty content)
- Personal/social/community: 0
- Non-trade promos: 0
- Grand-opening / new-business radar hits: 0
- Review/complaint threads: 0
- New genuine prospects: 1

## Trade promo (worth flagging)
- **2nd Time Around Co** — metal roofing & supplies, Parachute CO (81635). Flyer: "2ND TIME AROUND CO — NEW METAL ROOFING & SUPPLIES, ESTABLISHED IN 2011, Parachute, Colorado. CUSTOM CUT TO YOUR PROJECT... Serving Homeowners & Contractors." Caption: "Great prices on metal roofing and supplies. Call us today for a fast free quote 970-216-6905, installation available upon request, Secondtimeco.com." Posting evidence: posted by personal account Jeffrey Grant to W CO Message Board (23:33 MDT); shared by the business's own Facebook page ("2nd Time Around Co") into Buy & Sell GJ (00:08 MDT). Post URL (primary): https://facebook.com/groups/5456977881034408/permalink/28587274724244730/ . Signals: active marketer (dual post+share within one hour), homeowner+contractor customer base, phone-first contact (970-216-6905), published site Secondtimeco.com. No business record in leads.md needed to be re-checked by parent lane (this lane does not dedupe; flag only). Possible angle: capture every call / instant quotes / follow-up for a phone-heavy materials supplier that also installs on request.

## Repeat sightings
- The 2nd Time Around Co flyer is the only repeat this window (own post + page share, 35 min apart). No known prior prospects (e.g. Your House Will Sparkle) reposted in the corridor groups.

## Observed-but-not-pursued
- None of note. Buy & Sell GJ continues 100% personal resale apart from the roofing share.

## Dedupe
1 new business surfaced; dedupe against leads.md / pipeline.md / JSONL left to the parent outreach lane (read-only lane, no writes). 0 confirmed duplicates within this lane.

## Pipeline / JSONL / DM log
No edits made by this lane (read-only): 1 trade-promo candidate flagged for parent (2nd Time Around Co). No pipeline.md section added. DM count: 0/10 (no DMs in this lane by design).

## Watermark
Old: 1790140184 (2026-09-22 23:09:44 MDT).
New: 1790143692 (2026-09-23 00:08:12 MDT, max creation_time observed across all 6 groups, 2nd Time Around Co page share in Buy & Sell GJ at 00:08).

## Notes for parent
- 118 fetched / 7 in-window / 1 trade promo (2 sightings) / 1 new genuine prospect / 0 grand-opening / 0 hiring / 0 complaints.
- Window was only ~59 min (23:09 to 00:08 MDT); Delta, Orchard Mesa, Fruita, and LivingInGJ produced zero in-window posts.
- Raw dumps: ~/workspace/outreach/scratch/scan121/scan121-<groupid>.json (6 files); per-post resolutions: ~/workspace/outreach/scratch/scan121/posts/metalroof.json, empty1.json.
