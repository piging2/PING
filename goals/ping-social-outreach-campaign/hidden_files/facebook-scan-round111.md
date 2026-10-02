# Facebook delta scan — round 111
Date: 2026-09-21 ~20:24 MDT. Read-only run (no sends, no likes, no comments, no DMs).
Prior watermark: 1790032426 (2026-09-21 17:13 MDT). New watermark: 1790043508 (2026-09-21 20:18 MDT).

## Method
- facebook-cli `groups posts --group-id <id> --sort-by NEW_POSTS --limit 20 --min-timestamp 1790032426` across the 6 Western Colorado groups. 120 posts fetched, 33 in window.
- Groups: Western Colorado Message Board & Classifieds (5456977881034408), Buy & Sell in Grand Junction (108728816001912), Delta (1504277980997243), Orchard Mesa (486356801008208), Fruita (3741333852807065), Living In Grand Junction Colorado (1082777608577867).
- --min-timestamp behaved correctly this round: verified against WCMB's newest post (1790031879 = 17:04:39 MDT, "Secondtimeco.com") which correctly fell outside the window. The round-88/90 unreliability note did not reproduce.
- Empty-caption posts resolved via `facebook-cli post read` (author + media exposed, matching the round99 social.search behavior; author exposure fine this round).
- NOTE: the round-110 facebook-dms.md entry references a "facebook-scan-round110.md" report file, but no such file exists in hidden_files/. Flagging as a minor gap; this round's file follows the round99 format.

## In-window posts: 33
| Group | Posts | Content summary |
|---|---|---|
| WCMB | 0 | Newest post 17:04:39 MDT, pre-window |
| Buy & Sell GJ | 20 | Personal resale: bottle warmer, Broncos tickets, suitcase, baby bathtub, serger/sewing machine, John Deere disc harrow, Harry Potter hat, Nike shoes, bike trailer, solar security light, DJ controller, kegerator, kitchenware, ATV, plant ladder, AC/DC hoodie, china cabinet, 2004 Ford F-150, 1 empty-caption share; PLUS 1 trade promo (property cleanup + dump runs, Necko LaVato) |
| Delta | 2 | 2 shares (Alisa Lamm; Thunder Mountain: Art, Poetry & Music) |
| Orchard Mesa | 1 | Share (Ellis Hovey) |
| Fruita | 8 | ISO custom leather work request; Good News Club school post; Mesa County land-development-code civic post; viral share 14c/59r (Gary Riegel); Peer 180 recovery-org share; riding-lessons share (Dare to Dream Inc.); 2 empty (Christine Kline unresolvable; 1 photo-only) |
| Living In GJ | 2 | Paddleboard outing invite; 1 share (Mark Wingerter) |

## Judgment
- **Genuine home-service business signals: 1.** Necko LaVato, property cleanup + dump runs promo (Buy & Sell GJ, 20:12 MDT). Junk-removal/hauling trade fit, GJ area. NOT added: no phone/email published in the post ("Message me" only), not in Messenger contacts, no existing thread, so no contact channel exists. Fails the pipeline quality bar (verified contact info required). Logged as a sighting.
- **New-business radar hits: 0.** No grand-opening / now-open / just-launched trade posts.
- **New prospects added to pipeline.md: 0.** Nothing met the quality bar.
- **Repeat sightings of pipeline businesses: 0.**

## Notable sightings (intel only, not added)
- **Necko LaVato** (personal profile; owner_id 100002906210597): "Property cleanup and dump runs, trying to group together a couple loads to save everyone some money. Message me or let me know what you need cleaned up and we can make a deal for sure." Photo shows a pickup truck (media OCR "27 FOSTE AWD 3L"). Posted Buy & Sell in Grand Junction 20:12 MDT. Deduped clean against leads.md, pipeline.md, facebook-dms.md, and western-co-prospects.jsonl. Messenger contacts search for "Necko" and "LaVato" returned 0 hits; threads search returned nothing. DM BLOCKED by the CLI contact constraint; no published phone/email to reroute. Watch item: add if re-sighted with published contact info.
- **Kaitlyn Lawson** (Fruita, 17:43 MDT): ISO custom leather work + detailed tooling on the Western Slope. Customer-side request, not a business promo. Demand signal: Western Slope custom-leather-tooling demand.
- **Rachel Williams Shriver** (Living In GJ, 20:10 MDT): paddleboard outing invite ("Come paddle board with me one more time!"). Recreation guide/personal, not home-service.
- **Dare to Dream Inc.** (Fruita, 19:53 MDT): horse-riding lessons business lifestyle share ("several of our students"), no promo, not home-service.
- **Peer 180 RCO-Recovery Community Organization** (Fruita, 17:55 MDT): share of recovery-org content; nonprofit, not a prospect.
- **Gary Riegel** (Fruita, 18:17 MDT): empty-caption share, 14 comments / 59 reacts; viral share, not business.
- Alisa Lamm (Delta), Thunder Mountain: Art, Poetry & Music (Delta), Ellis Hovey (Orchard Mesa), Mark Wingerter (LivingGJ + Buy&Sell cross-post), Christine Kline (Fruita, no media, no caption): shares or unresolvable; logged without guessing. Not prospect-grade.

## Channel state
- facebook-cli cloud session healthy (me = Nolan Geske, no auth errors). 0 DMs sent, 0 attempted, 0 parked. DM daily count: 0/10 (no round-111 sends prior to this scan).
- Watermark advance: 1790032426 -> 1790043508.

## Notes for the main engine
- Evening window resale-heavy as usual; one genuine junk-haul trade promo but contactless (no phone, no email, no Messenger route). No action needed beyond cadence.
- Next round covers posts newer than 1790043508 (2026-09-21 20:18 MDT).
- INFRA: facebook-cli is NOT installed on the Pig WSL (`command not found` via pigwsl-run.sh). This scan ran through the cloud-session facebook-cli on the sandbox (healthy, same as round99). The Pig bridge itself (ssh + wsl round-trip) verified working. Recommendation: treat local facebook-cli as the group-scan path; the Pig bridge stays the path for anything needing the Pig's headed Chrome session.
