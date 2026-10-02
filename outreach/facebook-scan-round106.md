# Facebook delta scan — Round 106

Date: 2026-09-21 (early morning). Watermark in: 1789967765 (2026-09-20 23:16 MDT). Watermark out: 1789987541 (2026-09-21 04:45 MDT).
Method: facebook-cli groups posts --group-id on all 6 Western Colorado groups, local filter on creation_time > watermark, author identification via social.search with post_url for empty-caption/business posts.

## In-window posts: 6

1. **Fruita 04:45 MDT** — empty-caption shared photo post. Author identified via social.search: KaraLee Boudreaux (personal profile, follower count 1, no business content). Verdict: personal share, ignore.
2. **Fruita 00:36 MDT** — Rides Bar & Grill Fruita Fall Festival week promo (Monday Night Football, Tuesday Blues Jam, karaoke, DJ, live music, mural artist call). Author identified via social.search: posted by the Rides Bar & Grill Page itself, 152 S Mesa Street, Fruita, 621 followers. Verdict: restaurant, previously logged non-prospect, out of trade.
3. **Fruita 00:07 MDT** — lost pet ("My Gracie is missing from Country Village"). Personal, ignore.
4. **Fruita 23:31 MDT** — spay/neuter PSA. Personal/cause, ignore.
5. **Buy & Sell GJ 02:12 MDT** — "Ofertas relampago $160" sale post. Resale, ignore.
6. **Buy & Sell GJ 23:47 MDT** — lighted display case/vanity for sale ($100, Mack/GJ). Resale, ignore.

## Results
- New genuine home-service prospects: 0. No pipeline.md additions this round.
- New-business radar hits: 0 (no grand opening / now open posts).
- Review-triggered signals in groups: 0.
- Repeat sightings of pipeline businesses: 0.
- Out-of-segment sightings: Rides Bar & Grill festival promo (restaurant, previously logged).
- DMs: 0 sent, 0 attempted, 0 parked drafts. DM daily count: 0/10.
- facebook-cli session healthy (me = Nolan Geske, no auth errors).

## Files
- Report: this file (facebook-scan-round106.md).
- Log entry: facebook-dms.md "## 2026-09-21 — Round 106 delta scan".
- Raw JSON: ~/workspace/outreach/scratch/scan106-<groupid>.json (6 files).
