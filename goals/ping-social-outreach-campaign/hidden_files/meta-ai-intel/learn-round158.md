# LEARN — outreach-engine round 158 (2026-09-28)

## Observation: the logged-in Pig search/pages surface finds business Pages that web/social search missed; the post-published phone is the identity anchor, and namesake rejection is the safety step

VERIFIED this round: both discovery-1338 FB prospects were staged with "no owned website or business Page found" after web + social search (facebook-cli returned 403 on the non-friend personal profiles that posted). The Pig's logged-in https://www.facebook.com/search/pages/?q= surface found a Page for BOTH:
- Southwest Tree Service -> https://www.facebook.com/SouthWestTree (the plain "SouthwestTreeService" slug was a Keller, TX namesake, checked and rejected)
- Colorado Disposal Services -> https://www.facebook.com/profile.php?id=61593054720912 (1 follower)

Identity was anchored on the post-published phone: Southwest Tree Service's Page publishes (970) 623-5225, exact-match with the number in the prospect's own group post, plus a poster-name match ("Check made payable to Bobby Schenck") and the "Happy Autumn" promo matching the discovery signal. Colorado Disposal's Page publishes (970) 549-6422, exact-match with the post-published number, plus info@coloradodisposalservices.com and "junk removal ... across the Western Slope" (trade + geography). Both Pages showed a Message button on the rendered Page (check-page-generic.js hasMessageButton=true). Both passed the send-eligibility gate (exit 0, Gmail-verified sent count 0 via business-name in:sent search). Both initial DMs sent via send-dm-v2.js with in-thread verification (verify_sent_text_visible=true, screenshots archived).

PATTERN (generalizable, durable rule): when discovery records "no Page found," that verdict is scoped to the surfaces it checked (web search, logged-out social search, facebook-cli). The logged-in Pig search/pages is a fourth surface that can overturn it. The post-published phone number is the identity anchor that makes the match trustworthy: a Page is the right Page when it publishes the same phone that appeared in the prospect's own post, corroborated by name/location/trade. Namesake rejection is the mandatory safety step: generic trade names ("Southwest Tree Service", "Integrity Painting", "Paragon H2O") collide across states, so check the slug, URL, and location before accepting a candidate Page. This round's Keller-TX rejection is the same trap class as the GJ-franchise vs Montrose-place-listing "Integrity Painting" collision the pipeline already records.

WHY IT MATTERS: the phone-only prospect pool keeps growing while the DM lane has idle capacity (2026-09-28 UTC DM count 4/10 after this round). This pattern converts "no Page found" phone-only prospects into verified DM-eligible ones WITHOUT lowering the identity bar: the phone match is stricter than the old "Page exists with a Message button" check, because it ties the Page to the prospect's own published contact. It is the standing conversion path for the phone-only backlog, ahead of any email-route invention.

UNCERTAIN: the hit rate of the logged-in search surface across more prospects (2/2 this round, small sample); whether very-low-follower Pages (Colorado Disposal: 1 follower) deliver DMs differently than established Pages; whether the search/pages surface stays reachable under the Pig's normal load.

SOURCE EVIDENCE: subagent round-158 report (fb-page-search.js candidate lists with the TX namesake rejected; check-page-generic.js hasMessageButton=true + rendered Page text for both Pages; send-eligibility.py --action dm --gmail-sent-count 0 exit 0 for both; send-dm-v2.js verify_sent_text_visible=true for both, screenshots southwest-tree-r158-1790626892835.png and colorado-disposal-r158-1790626918510.png); facebook-dms.md "## Round 158" section; pipeline.md lines 2976-2977 (DM SENT with verification notes); drafts/dm-round158-southwest-tree.txt (614 bytes) and drafts/dm-round158-colorado-disposal.txt (611 bytes).

## Provenance

- Raw artifact: this file (learn-round158.md), written by outreach-engine round 158.
- Verification: the Pig script outputs, gate exits, and send verifications are in the subagent's report and facebook-dms.md; screenshots on the Pig's /tmp/pig-fb-r158/ (ephemeral, filenames in the log).
- Nothing here is a prospect row; no unverified claims; no contact info invented; phone numbers quoted are the prospects' own published numbers.
