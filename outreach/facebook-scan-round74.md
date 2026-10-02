# Facebook Delta-Scan #74 (2026-09-17 ~02:16 to ~05:19 MDT, round 74, read-only)

Window: watermark 1789633018 -> 1789643391. 8 posts across 8 groups, all scanned with NEW_POSTS sort, min-timestamp 1789633018, one page per group.
- Western Colorado Message Board & Classifieds (5456977881034408): 0
- Buy & Sell in Grand Junction (108728816001912): 5 in-window, all personal resale (tamalero package offer 05:09; Yamaha clarinet mouthpiece $20 03:01; sterling silver turquoise earrings $20 02:59; vintage E.O. Brody milk glass bud vase $10 02:59; Nokia BL-5J battery $20 02:57)
- Delta (1504277980997243): 0
- Orchard Mesa (486356801008208): 0
- Fruita (3741333852807065): 2 (weather/morning-greeting post 05:09; one empty-caption unresolvable post 4469205456686564 at 04:35)
- Living In Grand Junction Colorado (1082777608577867): 0
- Colorado Business Networking (2803047646497352): 1 (empty-caption unresolvable post 4073071256161645 at 04:00)
- Colorado Business Mingle (5355730651191326): 0

Quiet overnight window, verified real not an API gap: in-window posts appear at 02:57, 02:59, 03:01, 04:00, 04:35, and 05:09 MDT, so the min-timestamp filter is functioning and 5 of 8 groups genuinely had no new posts. This matches the overnight quiet pattern of scan #73.

## Findings
- 0 new genuine home-service trade prospects.
- 0 new-business radar hits (no "grand opening", "now open", "just launched").
- Demand signals: none actionable. Complaint signals: none actionable.
- Repeat sightings of tracked businesses: none.
- 2 unresolvable empty-caption posts logged without guessing (author stripped): Fruita 4469205456686564 (04:35), CO Business Networking 4073071256161645 (04:00).

## KC Electrical Services LLC (Delta, CO) Facebook Page check, for 2026-09-18 UTC email-queue slot-8
VERDICT: NOT VERIFIED.

Reason: no Facebook business Page for KC Electrical Services LLC (Delta, CO) could be located through any read-only route available in this cloud session:
- Three rounds of web search returned no Facebook page URL. ZoomInfo references a "KC Electrical Services Facebook page" but the page is gated and exposes no URL. The iglobal.co listing shows a "Facebook" social button but its fetched text exposes no target URL.
- Their own site (https://www.kcelectricservice.com/) is phone-only: no email, no social links, only "Call Now: 970-417-2300".
- facebook-cli has no Pages search command; a public-groups search (groups search --role any --keywords "KC Electrical Services") returned only unrelated KC-area contractor groups, no Delta page.
- social.search, three attempts (one location-filtered to Delta, Colorado, one Facebook-wide), returned no results.
- A Facebook place_id seen on the web (3643046922686477) could not be resolved: facebook-cli profile info returned HTTP 403 ("command currently unavailable... gated server-side"), so it cannot be confirmed as the business Page.

Messenger CLI contact route: cannot be evaluated without a Page/profile ID; per the standing constraint the Messenger CLI refuses to send to anyone not in synced Messenger contacts, so even a Page URL would still require a contact-resolution check.

Decision for slot-8: email stays on HOLD (site phone-only, kcelectricalservices@gmail.com is indexed-only). The FB-first route is also blocked until a verified Page with a Message button is found. Recommended next step: resolve the Page on the Pig's headed Chrome (Facebook native search for the business name, which works there) and verify identity plus Message button before committing the slot. If no Page is found there either, reroute the slot to another prospect or keep KC for the phone-number route in pipeline.

0 DMs sent, 0 attempted (read-only run; Facebook engagement is Pig-only and this session has no Pig driver). New watermark: 1789643391.
