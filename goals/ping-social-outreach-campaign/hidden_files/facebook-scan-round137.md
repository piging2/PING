# Facebook scan — round 137 (2026-09-24, ~09:21-09:40 MDT)

READ-ONLY lane. NO DMs sent. No copy drafted. No pipeline/leads/facebook-dms.md/JSONL writes.
DM daily count on this lane: 0 sent (read-only worker; no send authority).

## Scan window
- Watermark in: 1790202171 (2026-09-23 16:22:51 MDT)
- Watermark out: 1790263752 (2026-09-24 09:29:12 MDT; latest post seen, Orchard Mesa farmstand update)
- Posts fetched per group (in-window / total returned):
  - Western Colorado Message Board & Classifieds 5456977881034408: 13/14 (1 API leak below watermark, new-members post 09-23 09:08, ignored)
  - Buy & Sell in Grand Junction 108728816001912: 20/20
  - Delta 1504277980997243: 12/12
  - Orchard Mesa 486356801008208: 9/9
  - Fruita 3741333852807065: 20/20
  - Living In Grand Junction Colorado 1082777608577867: 8/8
- Total in-window: 82 posts. Delta scan; no NEW home-service-trade candidates staged this round (see repeat sightings below).

## Repeat sightings (enrichment only; no duplicate rows)

### Spurlock Immaculate Lawncare-Services — lawncare / weed & brush clearing — Fruita/Delta area
- Post: https://facebook.com/groups/3741333852807065/permalink/4476756412598135/ (Fruita group, 2026-09-24 07:16 MDT)
- Author resolution: facebook-cli post read owner_name/username = "Spurlock Immaculate Lawncare-Services" (Page id 61588596701556), Page-authored, no personal author needed.
- Enrichment: new "free estimate" weed/brush-clearing ad today; caption phone (970) 307-2298 matches pipeline row. Existing pipeline row NEW; Message button verified PRESENT Pig-side round 136; DM ATTEMPT round 136 OUTCOME UNKNOWN (NO RETRY per rule; reconcile via thread check). New ad is a fresh last_signal candidate for the main job.
- DM-eligibility: Page-authored, already verified.

### Amber's House Cleaning LLC — house cleaning — Grand Junction area
- Posts (same holiday promo, cross-posted): Western Colorado https://facebook.com/groups/5456977881034408/permalink/28606006819038187/ (09-24 07:20), Buy & Sell GJ https://facebook.com/groups/108728816001912/permalink/3421255461415881/ (09-24 07:19), Fruita https://facebook.com/groups/3741333852807065/permalink/4476760412597735/ (09-24 07:20)
- Author resolution: facebook-cli post read owner_name = "Amber Pena" (personal profile 100013498248337), posting her own business's promo.
- Enrichment: holiday-season scheduling urgency angle ("Thanksgiving ~9 weeks, Christmas ~13 weeks, schedule filling fast"). No phone in caption (CTA is messenger/schedule; pipeline row already notes phone UNKNOWN). Posted across 3 groups this morning = active FB marketing.
- DM-eligibility: CLI Message-button check 403'd again (server-side gate, unchanged); Pig-side verification required.

### Legacy Home Solutions — painting / home maintenance — Fruita/GJ area
- Post: https://facebook.com/groups/3741333852807065/permalink/4476700099270433/ (Fruita group, 2026-09-24 06:15 MDT)
- Author resolution: facebook-cli post read owner_name = "Andres Perez" (personal profile), business named in caption; phone 970-258-7378 (matches pipeline row).
- Enrichment: fall-maintenance angle (yard cleanup, exterior maintenance, painting touch-ups, repairs; free estimates). Seasonal repeat of round-135 signal; owner is actively prospecting again this week.
- DM-eligibility: phone/DM route per existing row; CLI check 403'd.

### Coyote Rolloff Services / High Desert Haulers — dumpster rental + junk removal — Delta/Montrose area
- Post: https://facebook.com/groups/1504277980997243/permalink/1808687090556329/ (Delta group, 2026-09-23 16:47 MDT)
- Author resolution: facebook-cli post read owner_name = "Joshua Bowsher" (personal profile); caption tags both Pages @[61559100902731:2048:Coyote Rolloff Services] and @[100088807365318:2048:High Desert Haulers]; sites Coyoterolloffservices.com, Hdhjunkremoval.com; phone 970-901-7956.
- Enrichment: re-post of the two brands together; both already in pipeline (Coyote NEW/WATCH; High Desert in pipeline + JSONL).
- DM-eligibility: phone-route per existing rows.

### Elevate Rides — luxury airport transportation (GJT) — Grand Junction
- Post: https://facebook.com/groups/3741333852807065/permalink/4476763462597430/ (Fruita group, 2026-09-24 07:23 MDT)
- Author resolution: facebook-cli post read owner_name = "Elevate Rides" (Page id 61592088232504), Page-authored; site www.elevaterid3s.com.
- Enrichment: another marketing post today. SKIPPED round 135 (transportation, not home-service trade; held in summary only). Same verdict this round; no row staged.

### Lovemore Real Estate — Delta realtor
- Post: https://facebook.com/groups/1504277980997243/permalink/1809251543833217/ (Delta group, 09-24 07:34) — listing promo 455 Dodge, Delta, $284,000.
- Author resolution: owner_name = "Lovemore Real Estate" (Page id 61555807961132), Page-authored. Already in facebook-dms.md. Not a home-service trade. No action.

### Jennifer Thomas (realtor)
- Post: https://facebook.com/groups/1504277980997243/permalink/1808696953888676/ (Delta, 09-23 17:07) — "Sold!" promo, phone 970-209-2378, agency name truncated in caption ("Mir..."). Already in facebook-dms.md. Not a home-service trade. No action.

## Not staged (dedupe-clean, but not home-service trades; held in this summary per round-135 precedent)

### SKIPPED (not staged): Boat & RV Storage, Bonnie Hatch — storage — west of Fruita
- Post: https://facebook.com/groups/108728816001912/permalink/3421327604742000/ (Buy & Sell GJ, 2026-09-24 08:35 MDT)
- Author resolution: facebook-cli post read owner_name = "Bonnie Hatch" (personal profile 100000158481195), posting her own storage offering.
- Detail: outdoor uncovered boat/RV storage west of Fruita, $2.50/linear ft/month, seasonal Oct 1 - May 30, phone 970-462-8536 spelled out; explicitly no FB Messenger. Dedupe clean across leads/pipeline/facebook-dms/JSONL.
- Verdict: not a home-service trade (matches round-135 River City Storage skip). Row text if parent wants it:
  - NEW | Boat & RV Storage (Bonnie Hatch) | boat/RV storage (outdoor, uncovered) | west of Fruita, CO | (970) 462-8536 (post-published, spelled out; no FB Messenger) | no site | independent individual operator, seasonal Oct-May | MISSED_CALL_LEAD_CAPTURE (low-medium; seasonal intake, no messenger) | stack: UNKNOWN | WATCH (source=discovery-research round-137 fb-scan; NOT staged: storage, not a home-service trade; dedupe clean) | 2026-09-24 | NEW
- DM-eligibility: no business Page; phone route only (CLI profile check on personal profile 403'd; no Message button expectation).

### SKIPPED (not staged): Michoacana "Mi Chelelo" — paleteria/food — Delta
- Post: https://facebook.com/groups/1504277980997243/permalink/1808691500555888/ (Delta, 09-23 16:56) — hours/staffing apology: limited staffing, inconsistent hours, "visited and found us closed."
- Author resolution: owner_name = "Michoacana "Mi Chelelo"" (Page id 61588840240952), Page-authored. Dedupe clean.
- Verdict: food retail, not a home-service trade. Signal is a real operational pain (staffing/hours communication) but out of scope for staging. CLI profile check 403'd.

### SKIPPED (not staged): LeaShawn Lee — hair color service — GJ area
- Post: https://facebook.com/groups/108728816001912/permalink/3421350618073032/ (Buy & Sell GJ, 09-24 08:59) — Saturday Sept 26 9AM color-service availability, "Message me."
- Author resolution: owner_name = "LeaShawn Lee" (personal profile 100054811156813). Dedupe clean. Beauty trade, out of scope. No row staged.

## Non-prospect classifications
Yard sales / for-sale items (all groups, ~60+ posts: furniture, quilts, hats, generators, sheds, ornaments, golf cart, baby clothes, toys); "Shatterproof Ornaments $5" cross-posted individual seller; "No HOA!!!" real-estate filler; Doughbra's sourdough preorder posts (Orchard Mesa + Western Colorado, forms.gle link); PAN DULCE MEXICANO food seller (Buy & Sell); farmstand menu update (Orchard Mesa, health story); "Best chiropractor?" solicitation; lost dog "Ducky"; Fall Festival questions/events; Rides Bar & Grill Fruita Fall Festival event; Team River Runner GJ burger fundraiser; Rocky Horror shadow cast event (Delta); "Last event of 2026" racing event (Living in GJ); Happy Little Finds volunteer calls (Fruita + Living in GJ); Denali water-bucket spam cross-posted in 3 groups (bot-like).

## New-business radar hits
None this round. No "grand opening" / "now open" / "just launched" trade posts found in any of the 6 groups.

## Social discovery (social.search, public signals only; all unverified/confirmed labels)
- SIGNAL: Detailed negative review of "Elite Electric, Plumbing & HVAC" (Grand Junction-area trade business) posted by Maureen Saltzer in a Colorado group on 2026-09-22 (29 likes, 50 comments). Pain categories: disputed billing ($49.95 quote → $212 charge), warranty denied by one tech then honored by another at 1/10th the quoted replacement cost; "regrets staying after the ownership change." Source: https://www.facebook.com/groups/810615887739997/permalink/1743888744412702/ . Label: signal (not verified independently; review-intel step belongs to the main job).
- UNVERIFIED: "Downtown Philly Town" food truck, Grand Junction, reportedly ~2 months open as of Sep 2026 (posted 2026-09-20). Food, not home-service trade. https://www.facebook.com/reel/2102464597020594/
- UNVERIFIED: an unidentified "grand opening of my new business" reel (2026-09-21, no business name, dark underexposed video). No actionable identity. https://www.facebook.com/reel/1384923210347199/
- Off-topic noise: real-estate listing reels (Cindy Ficklin, Kelly Maves), non-local complaint posts (NY, AZ, KY) — discarded.

## Message-button checks
CLI `profile info` 403'd again for both tested profiles (Page 61588840240952, personal 100000158481195) with "Profile Not Accessible" server-side gate — same standing limitation as round 135. Pig-side verification remains the only path for DM-eligible Pages; no checks attempted Pig-side per lane separation.

## Notes for the execution job
- Spurlock's new Fruita-group ad this morning is fresh last_signal material on an already-NEW row whose DM attempt is in OUTCOME-UNKNOWN reconciliation; do not treat the new post as a new DM trigger.
- Amber's House Cleaning LLC and Legacy Home Solutions both re-posted this morning with seasonal urgency angles (holiday schedule fill; fall maintenance) — active FB marketers, strong fresh signal on existing NEW rows.
- The Delta-group dumpster post couples Coyote Rolloff Services and High Desert Haulers under one phone (970-901-7956); both are already tracked.
- Storage, food, beauty, transportation, and real-estate sightings were all classified non-trade and not staged, consistent with round-135 precedent.
