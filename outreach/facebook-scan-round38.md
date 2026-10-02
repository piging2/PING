# Facebook group delta-scan #33 (round 38) — detached, read-only

Window: 2026-09-12 20:10 → 23:14 MDT (min-timestamp 1789265418, per round 37 watermark)
Method: `facebook-cli groups posts --sort-by NEW_POSTS --min-timestamp 1789265418 --limit 25` on the 6 Western Colorado groups in task scope. The single one-liner share had no visible business content and no comments; author could not be resolved via CLI (no social.search availability in this run) — logged as a skip. No DMs, likes, or comments (Messenger CLI non-contact restriction; CLI has no like/comment write actions; browser engagement session owned by the engagement cron). No checkpoints or action blocks; all six group reads succeeded on the first call.

- 27 new posts across 6 groups. **0 new genuine home-service trade prospects.**
- Engagement: 0 likes, 0 comments (no eligible business posts in window; browser engagement remains owned by the engagement cron).
- DMs: 0 sent, 0 skips, 0 reroutes (no business prospects in window).

## Counts per group

| Group | New posts |
|---|---|
| Western Colorado Message Board & Classifieds | 4 (all personal resale: metal easels, wooden sign, tapestry, recliner) |
| Buy & Sell in Grand Junction | 18 (all personal resale: toddler chair, couch, welder, trucks, costumes, helmet/goggles, tires, printer, dollhouse, insulation saw, kitchen toy, etc. + 1 lost-dog community post) |
| Delta | 0 |
| Orchard Mesa | 0 |
| Fruita | 5 (lost-dog community post, SeeJaneRanch farm diary with #GroundBeefForSale, wife congratulations, one-liner share, garage sale notice) |
| Living In Grand Junction Colorado | 0 |

Note: Buy & Sell GJ returned 18 posts this window, under the 20-per-page API limit, so no mid-window pagination gap.

## New prospects

None. No genuine home-service/trade business promos in this window.

## Repeat sightings

- **Coldiron's Creations and Property Service**: not sighted (Delta had zero new posts; statewide groups out of scope). The round 35 fall-cleanup promo (Delta 12:00 MDT) remains the F1 hook; F1 stays parked (no contact-capable DM channel; do not re-draft without a genuinely new post).
- **Memphis Auto Spa, RG Resin, Monument View Coffee Shop**: not in the 6 scanned groups this window. Monument View remains excluded from DM actions per the standing rule.

## Demand signals (customer-side, not prospects)

- Buy & Sell GJ 22:45 MDT / Fruita 22:45 MDT: lost-dog community posts for "Frankie" (escaped from a doggy day care facility near Grand and S Apple St, Fruita; 970-596-1728). Community/personal, not a home-service trade. Signal/unverified.

## New-business radar

- None. No grand-opening or new-business trade posts in this window.

## Notable skips (with reasons)

- **SeeJaneRanch** (Fruita, ranch diary post, #GroundBeefForSale): agricultural operation, out of the home-service trade segment. Skipped.
- Fruita one-liner share "Sharing Information" (21:27 MDT): no visible business content, zero comments/reactions; author not resolvable via available CLI tools this run. Skipped.
- Fruita garage sale notice (509 W. Applewood Dr, 9/13), wife congratulations post: personal posts, no business signal. Skipped.
- Metal easels, wooden sign, tapestry, recliner (WC Message Board); toddler chair, couch, welder, F250s, costumes, helmet/goggles, tires, printer, dollhouse, insulation saw, kitchen toy, recliner (Buy & Sell GJ): all personal resale. Skipped.
- Lost-dog posts: community, not business. Skipped.

## Watermark

- Max post timestamp seen: 1789274723 (2026-09-12 22:45:23 MDT, Buy & Sell GJ lost-dog post). Next scan should use min-timestamp 1789274723.
