# Facebook group delta-scan #37 (round 42) — detached, read-only

Window: 2026-09-13 08:02:25 → 2026-09-13 11:11:49 MDT (min-timestamp 1789308145, carried forward from scan #36 / round 41)
Method: `facebook-cli groups posts --sort-by NEW_POSTS --min-timestamp 1789308145 --limit 25` on the 6 Western Colorado groups in task scope. social.search with the exact post_url successfully identified the author of the one genuine business post (facebook-cli strips authors; 0 comments so comment-read fallback was unnecessary). No likes, no comments, no DMs (read-only scan; engagement owned by the engagement cron; Messenger CLI contact restriction stands). No checkpoints or action blocks; all six group reads succeeded on the first call.

- 42 new posts across the 6 groups. **0 new genuine home-service trade prospects.**
- Engagement: 0 likes, 0 comments (no engagement actions taken in this scan).
- DMs: 0 sent, 0 skips, 0 reroutes (no uncontacted business prospects in window).

## Counts per group

| Group | New posts |
|---|---|
| Western Colorado Message Board & Classifieds | 3 |
| Buy & Sell in Grand Junction | 20 |
| Delta | 2 |
| Orchard Mesa | 2 |
| Fruita | 9 |
| Living In Grand Junction Colorado | 6 |

Late-morning Sunday traffic (08:02 to 11:12 MDT). All 42 posts fall into: for-sale marketplace listings (tonneau cover, pet beds, stilettos, Cavalier, wall decor, dolls, decorative rocks, stadium seats, angel ornaments, batteries, lunch box, bed frame, boots, desk, boom box, tires, hitch cargo box), one heavily cross-posted honor-system sourdough stand, personal-life posts (sunset photo, Trick-or-Treat Street question), community/event posts, and two small-business promos plus one trade-business hiring post.

## New prospects

None. The one genuine trade-business post in this window (Fruita landscape company hiring a project manager) is an existing pipeline prospect with a new signal, not a new prospect (see below).

## New signals on existing prospects

- **C.S. Landscaping / C&S Landcaping** (Fruita, CO; Sam Smith; cslandscaping.co) — already in pipeline.md line 842, status NEW (added 2026-09-10 from Instagram research as a solo portfolio-posting landscaper). New signal 2026-09-13 09:42 MDT: posted "looking for experienced project manager for my landscape company based out of Fruita, mostly hardscape, construction projects. $25-$30hr" in the Fruita group (post https://facebook.com/groups/3741333852807065/permalink/4465279110412532/, author resolved via social.search post_url lookup). This contradicts the solo-operator read: the company is hiring mid-tier management, a genuine growth signal for hardscape/construction work. Hiring-manager pain (crew coordination, project intake) is a natural PING angle on top of the existing missed-call fit. Suggested pipeline-row update: last_signal = "hiring project manager ($25-30/hr, hardscape/construction) 2026-09-13", priority_state at least WARM, opportunity_primary = AUTOMATION (crew coordination/scheduling) or MISSED_CALL_LEAD_CAPTURE, intel_updated 2026-09-13.

## Repeat sightings

- Doughbra's Stand (honor-system sourdough farm stand, 3101 Applewood St, Grand Junction 81506, owner working toward college tuition goals): cross-posted 3 more times in this window (2x Western Colorado Message Board & Classifieds, 1x Buy & Sell in Grand Junction). Food/micro-stand, not a home-service trade business, so no prospect record; repeat cross-post activity only.

## Demand signals (customer-side)

None. No customer asks for trade services in this window.

## New-business radar

None. No "grand opening" / "now open" / "just launched" posts in this window. (The Teriyaki Madness post is a customer asking when a restaurant opens, not a business announcement.)

## Skips (flagged)

- Permanent jewelry 5%-off appointment promo (WC Message Board, 2026-09-13 09:25): personal-service promo, not a home-service trade business. Skipped, out of scope.
- Boat/RV/trailer-moving + junk haul-off side-work offer (Fruita, 2026-09-13 10:43): individual gig/side-work ad, not a trade business. Skipped.
- "Anyone know when Teriyaki Madness is going to open?" (Living In Grand Junction): customer-side question about a restaurant. Skipped, not a trade business.
- Open-house listing on Tiara Rado Golf Course (Living In Grand Junction): realtor listing, not a trade business. Skipped.
- ISO first-time homebuyer programs / realtors (Living In Grand Junction): customer-side ask. Skipped.
- Palisade Sunday Farmers Market vendor post (distillery, award-winning bottles): beverage vendor promo, not a trade business. Skipped.
- Oktoberfest '26 benefit recap (Living In Grand Junction): community event post. Skipped.
- Delta group hashtag-only keychain/halloween-decor post and empty posts (Delta, Orchard Mesa, Fruita x3, Living In Grand Junction): no content to evaluate. Skipped.
- All 20 Buy & Sell in Grand Junction marketplace listings: private sellers, not businesses. Skipped.

## Watermark

- Next scan min-timestamp: 1789319509 (2026-09-13 11:11:49 MDT), the newest post seen this window (soft tri-fold tonneau cover listing, Buy & Sell in Grand Junction).

## Candidate rows in pipeline format (for parent to merge)

- SIGNAL UPDATE (existing row, pipeline.md line 842): **C.S. Landscaping** (@c.s__landscaping, Sam Smith) | landscaping / hardscaping | Fruita, CO | cslandscaping.co | Sam Smith | unstated | NEW 2026-09-13 hiring signal: "looking for experienced project manager for my landscape company based out of Fruita, mostly hardscape, construction projects. $25-$30hr" (Fruita group, https://facebook.com/groups/3741333852807065/permalink/4465279110412532/). Growth signal contradicts solo-operator read; crew-coordination and project-intake angles now valid. | status NEW -> WARM candidate | last_signal 2026-09-13

## JSONL merge

- Zero new rows. One signal update on an existing pipeline row (C.S. Landscaping, Fruita) for the parent to apply.
