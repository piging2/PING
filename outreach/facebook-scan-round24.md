# 2026-09-11 — Delta-scan #19 (Round 24) — new posts since 01:48 MDT

**Result: 0 new genuine prospects. Quiet overnight window; 4 new posts across 10 groups, all skipped. One repeat sighting of an existing pipeline prospect (2nd Time Around Co).**

## Method

- Scanned 10 target groups via facebook-cli `groups posts --sort-by NEW_POSTS --limit 25 --min-timestamp 1789112907` (window 2026-09-11 01:48 to ~05:15 MDT).
- All 10 group IDs returned clean, including the Colorado Business Mingle replacement ID 5355730651191326 (no 404 this run; 0 posts).
- 2 ambiguous posts resolved via social.search post_url lookup (the empty-caption Buy & Sell GJ post and the Fruita tree post); 1 in-scope-look promo (spa) author-resolved as well. social.search 3/3 this window.

## New prospects

None. The 4 new posts this window:

1. Buy & Sell GJ, 03:17 MDT: empty-caption photo post by **2nd Time Around Co** (handle constructionmaterialsParachute, bio: new metal roofing/siding supplies, secondtimeco.com, Parachute CO). This is a REPEAT of the existing pipeline prospect "2nd Time Around Co" (already NEW in pipeline.md, phone 970-216-6905 published in an earlier Palisade post, DM parked). New post, same business, no new contact info. Not re-added. https://facebook.com/groups/108728816001912/permalink/3407270649481029/
2. Buy & Sell GJ, 03:01 MDT: B&W Companion 5th Wheel Hitch Head resale ($120, Grand Junction). Automotive resale, skipped. https://facebook.com/groups/108728816001912/permalink/3407260286148732/?sale_post_id=3407260286148732
3. Fruita, 05:14 MDT: personal "happy Friday" fall-trees post by Melody Clifton (handle melody.clifton.975616). Not a business promo, skipped. https://facebook.com/groups/3741333852807065/permalink/4462972273976549/
4. Colorado Business Networking, 02:55 MDT: promo for **The Good Place Spa** (handle TheGoodPlaceMassage): $25 off facials Fri-Sun + free wax, booking via booking.mangomint.com/thegoodplacemassageandspaco. Massage/beauty spa, not a home-service trade; also already runs MangoMint online booking (stack already solved). Skipped as out of trade scope. https://facebook.com/groups/2803047646497352/permalink/4064851716983599/

Boundary repeat (not counted as new): the COBizNet "Old Stage Stop in Rollinsville" photo post (01:48:27 MDT, Gwenn Charvet) sits exactly on the prior watermark; it was already handled in round 23.

## Observed but not pursued

- Western Colorado Message Board & Classifieds, Delta, Orchard Mesa, Living In Grand Junction Colorado, Palisade, Glenwood Springs: 0 new posts in window.
- The Good Place Spa promo (above): out of home-service trade scope.

## Parked DM drafts

None this round (no prospects). No DMs sent and none attempted (browser blackout until 2026-09-11 16:05 MDT; Messenger CLI cannot send to non-contacts).

## Notes

- Empty-caption post_url lookup remains the only thing finding promos in Buy & Sell GJ; this window it surfaced a repeat of 2nd Time Around Co rather than a new business. Worth noting they are an active poster (now seen in both Palisade and Buy & Sell GJ groups) and remain phone-only NEW in pipeline.md with 970-216-6905.
- Overnight hours (01:48-05:15) continue to be the quietest window; 4 new posts vs 3 in the prior window. Daytime scans should rebound.
- Dedupe: "2nd Time Around Co" matched existing entries in facebook-dms.md (line 322), pipeline.md (line 555), and leads.md (line 1745). "Good Place" had zero hits in all three files but was skipped on trade-scope grounds regardless.

## Watermark

- Max post timestamp seen this window: 1789125245 (2026-09-11 05:14 MDT).
- Next scan should use min-timestamp 2026-09-11 05:14 MDT (unix 1789125245).
