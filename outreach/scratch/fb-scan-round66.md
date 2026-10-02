# Facebook delta-scan #66 (round 66)

Window: posts newer than unix 1789544560 (2026-09-16 01:42:40 MDT) to ~05:15 MDT 2026-09-16.
Scan run: 2026-09-16 ~05:15-05:20 MDT, read-only (Pig-only engagement rule).

## Groups scanned (facebook-cli groups posts, sort=NEW_POSTS, min-timestamp 1789544560, limit 25)
| Group | ID | New posts in window |
|---|---|---|
| Western Colorado Message Board & Classifieds | 5456977881034408 | 0 |
| Buy & Sell in Grand Junction | 108728816001912 | 1 |
| Delta, Colorado Community Message Board | 1504277980997243 | 0 |
| Orchard Mesa, Colorado Message Board | 486356801008208 | 0 |
| Fruita, Colorado Message Board | 3741333852807065 | 1 (below-watermark leak, see notes) |
| Living In Grand Junction Colorado | 1082777608577867 | 0 |

Total posts triaged: 2. Overnight window, very thin volume.

## Trade signals

### (a) Repeat sighting: standing-seam metal roofing operator (likely 2nd Time Around Co), Parachute / GJ area
- Post: https://facebook.com/groups/108728816001912/permalink/3412515385623222/ (Buy & Sell in Grand Junction, 2026-09-16 02:28:47 MDT, creation_time 1789547327)
- Content: "Standing seam machine panels rolled on site by a 25 year experienced tech on site !!! $1 - 81635. Standing seam panels rolled on site call for your appointment time. 970-216-6905. We also can produce custom trims. For every detail you need, clips and hardware available."
- Assessment: STRONG INDICATION this is the same operator as 2nd Time Around Co (Parachute, CO), already in pipeline.md as NEW (2026-09-10): identical phone 970-216-6905, same Parachute ZIP 81635, same metal-roofing supplies + installation trade. This is a repeat variant ad, not a new prospect.
- Action: NO new pipeline entry (dedup rule). No author-lookup run needed; author identity already on record (Business Page handle constructionmaterialsParachute, resolved round 15).
- Prospect note: 2nd Time Around Co remains pipeline NEW, phone-only (no email/website), DM parked. The repeat ad confirms the operator is actively posting.

### (d) Sub-watermark empty-caption post, Fruita (unresolvable)
- Post: https://facebook.com/groups/3741333852807065/permalink/4467916946815415/ (Fruita, creation_time 1789534799 = 2026-09-15 22:59:59 MDT, i.e., ~43 min BELOW the old watermark; API boundary leak on MOST_RECENT_ACTIVITY ordering)
- Content: empty. 0 comments, 0 reactions (verified via post comments read).
- Assessment: unresolvable, logged without guessing. Precedent: round 64 edge-case handling.

## Radar / demand / complaints
- New-business radar hits: 0 ("grand opening" / "now open" / "just launched": none).
- Demand signals (resident ISO trade service): 0 in window.
- Complaint signals (about a business): 0.
- Complaint signals from the log's perspective: none new.

## Observed but not pursued
- None beyond the two posts above. All four zero-post groups returned genuinely empty result sets.

## Sends
- 0 DMs sent, 0 attempted. Read-only run; Facebook engagement is Pig-only. Standing Messenger-CLI restriction unchanged (cannot DM non-contacts).

## Watermark
- Old: 1789544560 (2026-09-16 01:42:40 MDT)
- New: 1789547327 (2026-09-16 02:28:47 MDT) — max creation_time seen this scan.

## Notes
- facebook-cli cloud session healthy; facebook-cli me returned Nolan Geske.
- Posts nest under `data` key; `content`/`creation_time`/`post_url` all present.
- Only 2 posts in a ~3.6h overnight window; quietest window since round 64. No new prospects to feed the parent pipeline.
