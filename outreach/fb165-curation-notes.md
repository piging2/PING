# FB pass-165 curation notes (2026-09-30 ~11:26 MDT)

## Discovery
- fb165-discover.py (cloned from fb164, both pass literals updated): 537 candidates, 45 trade-keyword hits. All 20 group surfaces healthy; the 4 Page timelines (Evolve Fitness, KREX5 FOX4, Tony Laubach, Joe Ruch) zero-post again (persistent since pass 115).

## Builder
- `build-fb-job.py 165` (TARGET_LIKES=75): pre-filter 537 -> 415 (ledger-engaged 40, engaged-name 79, engaged-post-id 3; 2460 ledger post IDs consulted). Provisional: 75 likes, 25 comment-vet candidates.
- Provisional eyeball: classic pass-129 misfire mix. Dropped: real-estate spam (Colorado 4 Lot Deal, SIX FURNISHED HOMES, "Dreaming of true freedom/cozy home" xN, Room for your passions, Last Frontier Lodge $738k MLS listing), fundraisers (Pivot Energy lawsuit), Halloween/Boolesque/Falloween event class, missing-pet (Betty), road construction, political, ISO threads (landscaper, rental, wall mount, mechanic), hiring (plumbers apprentice, Holiday Inn), Starbucks matcha saga, Air Show, Wing Wednesday near-dups collapsed, "Dreaming of" spam, thin no-names, Durango/Glenwood/CO Desi + Denver-metro out-of-corridor.

## Author resolutions (facebook-cli post read --url, 6 reads)
- Gas fireplace annual service (Redlands, sweep [305]) -> owner Western Colorado Chimney, owner_id 61565264274777 = the exact blocked ID from pass-140. DROPPED. The builder's URL-parse pre-filter missed it (new group-post IDs from a blocked owner).
- Dryer vent (Ridgway [165] / Redlands [291]) -> same owner: Western Colorado Chimney 61565264274777. DROPPED both (pass-140 warning validated again: WCO Chimney owner-ID check is mandatory on vent/chimney/fireplace/pellet-stove posts).
- Wing Wednesday (GJ MB) -> Cattlemens Bar & Grill, Page 100063563440884. Page-authored: like + comment.
- Bread Barn (GJ MB) -> B&S Express Sourdough Bakery, Page 100067175630615. Page-authored: like + comment.
- Dynamic Diesel (Ridgway) -> Lindsay Yeates (personal profile). Like-only.
- Leather wallet at Cedaredge Applefest (Roofing B) -> CreativeTinkering, Page 61593930241733. Page-authored: like + comment.

## Curated keeps (11 likes + 3 comments, honest below-cap count)
Likes: Cattlemens Bar & Grill Wing Wednesday (Loma); HIGHLIGHT OPENING salon Oct 8 (GJ MB, personal author); flooring company referral Jon & Jamie (Montrose, personal); Montrose Garage Doors shoutout (Ridgway testimonial, personal); Bread Barn / B&S Express Sourdough Bakery (Orchard Mesa, 158 29 1/2 Rd GJ); pumpkin empanadas farm food (Ridgway); cattle panels in stock (Ridgway); APPLE STOCK orchard (Ridgway); Dynamic Diesel (Ridgway); AA Elite Flooring hardwood install/refinish (Ridgway, 970-417-6847); CreativeTinkering leather wallet (Cedaredge Applefest booth).
Comments (Page-authored only, voice-rule compliant, all under 20 words, no em dashes, no selling, no PING mention):
- Cattlemens: "Wing Wednesday in Loma is a public service. Buffalo plus cold beer is the correct midweek decision."
- B&S Express: "Everything Cheddar sourdough sounds dangerously good. Orchard Mesa Friday plans just made themselves."
- CreativeTinkering: "Hand-stitched Horween leather at Applefest is a strong booth game. That patina pitch sells itself."

## Notable drops
- Clean Queens (Lafayette = Denver metro, out-of-corridor); basketball-court repair (720 number, locality unverified, fail-closed); painting rebrand + website makeover + Google Business Checkup (CO BizNet, locality/business unverified, fail-closed); All Around Window Washing Christmas lights (Denver metro, pass-164 precedent); PRUF Magic Wednesdays, Aila Thai x2, Surf To Turf x3, Peach Street Distillers, Blessed Harvest x2, Sage Bloom Studio x2, Rise and Shine Bakes, Farm Stand Friday 4182 Hwy 50, Varner Equipment auction, Grub:30, Chef Uma, North Fork Flowers (all recently-engaged businesses, recency rule); Paint Wizards x2 / AG Property Services / Open Ledger bookkeeping / bando-the-barber (fail-closed personal-profile or locality-unverifiable, pass-164 precedent); "Free estimate" / Olathe nails (thin, fail-closed); Thursday Grand Valley roundup (event class); Ridgway Farmer's Market vote (civic class); Detail Doctor / piercing special / bathroom remodel (Durango, out-of-corridor); Glenwood mulch (out-of-corridor); Colorado Springs moving (out-of-corridor); Denver/CS realtor bedroom staging (out-of-corridor).

## Dispatch outcome
- NOT DISPATCHED: run_pass.sh authority gate returned AUTHORITY-DENY-CONFLICT. Fail-closed honored; nothing sent to the Pig, nothing written to the intent ledger.
- Cause: the gate's log-tail affirmative-marker scan matched the instagram-surface clause in the pass-164 authority note ("IG engagement HELD per 90h GO; authority DENY precedent"). The scan is surface-blind: the clause describes instagram, not facebook. AUTHORITY.json facebook = ACTIVE, capability authorized=true (set by Nolan Geske, 2026-09-29 90h GO binding state).
- Platform health confirmed independent of the gate: degraded probe exit 0; pass-164 worker executed cleanly 10:05-10:20 MDT (EXECUTED observations, no platform warnings).
- Standing note for future passes: the marker sits in the facebook log tail, so every future pass hits the same conflict until the owner records a reconciliation in AUTHORITY.json (owner/operator-write-only). The gate supports tail_scan_from_line for exactly this. Do NOT edit the pass-164 log line to evade the gate (log-tampering bypass of a safety mechanism).
- Durable artifacts: fb165-curated-job.json (bare list, reusable next pass after reconciliation), /tmp/fb-job-20260930-173030.json (dispatch format; ephemeral), fb165-candidates.json, fb165-sweep.txt, fb165-curation-sweep.py.
