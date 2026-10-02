# PING Social — LinkedIn engagement log

Week-1 warmup rules (strict, per 2026-09-13 automation plan + 2026-09-14 task):
- LIKES ONLY. No comments until week 2, max 2/day then. No connection requests, no DMs, ever.
- Max 10 likes per day, 1 pass per day. 90-240s randomized pacing between actions.
- Business Pages and real operator profiles first. Western Colorado home-service trade businesses (plumbing, HVAC, electrical, roofing, landscaping, garage doors, pest control). Skip personal, political, off-trade, recruiter spam, engagement bait.
- Halt instantly on any checkpoint, CAPTCHA, restriction, unusual-activity notice, or verification challenge. Two aborted passes in any 7-day window pauses the whole channel.
- All actions run as Nolan Geske from the Pig's dedicated li-profile Chrome (CDP :9224). Cloud brain discovers, Pig hands execute. Worker: ~/workspace/pig-linkedin/engage.js.
- Every liked post below is on the never-re-engage list forever.

## Never re-engage (liked posts, off-limits forever)
- https://www.linkedin.com/posts/colorado-commercial-repairs_commercialequipment-hospitalityindustry-westerncolorado-activity-7430010431362215936-0CR7
- https://www.linkedin.com/posts/colorado-commercial-repairs_commercialhvac-springmaintenance-grandjunction-activity-7434990317394722817-CIT4
- https://www.linkedin.com/posts/colorado-commercial-repairs_commercialkitchen-fryerrepair-kitchensafety-activity-7436442313343729665-lAvo
- https://www.linkedin.com/posts/mesa-turf-masters_winter-tree-watering-in-grand-junction-fruita-activity-7417230291087302656-4uhF
- https://www.linkedin.com/posts/mesa-turf-masters_put-your-lawn-in-grand-junction-co-on-this-activity-7407084944126132224-cGjx

## 2026-09-14 — Pass 1 (first warmup pass, ~09:55-10:10 MDT)
5 likes, all registered (aria-pressed=true verified). Pacing 90-240s. logged_in: true throughout. No checkpoints, CAPTCHAs, restrictions, or unusual-activity signals. First execution attempt failed 0/5 ("like button not found"): LinkedIn labels the detail-page Like button "React Like", not "Like". Worker fixed (selector /^like\b/i -> /\blike\b/i in engage.js doLike, deployed to Pig) and the pass re-ran clean 5/5. Also fixed: Pig-side check_login.js was a stale copy using dead aria-label selectors and falsely reported logged_out; the fixed local copy was deployed and now reports LOGIN ok.

### Likes
- Colorado Commercial Repairs LLC (Grand Junction, facilities services) — commercial equipment / hospitality / Western Colorado post — https://www.linkedin.com/posts/colorado-commercial-repairs_commercialequipment-hospitalityindustry-westerncolorado-activity-7430010431362215936-0CR7
- Colorado Commercial Repairs LLC — commercial HVAC spring maintenance, Grand Junction post — https://www.linkedin.com/posts/colorado-commercial-repairs_commercialhvac-springmaintenance-grandjunction-activity-7434990317394722817-CIT4
- Colorado Commercial Repairs LLC — commercial kitchen fryer repair / kitchen safety post — https://www.linkedin.com/posts/colorado-commercial-repairs_commercialkitchen-fryerrepair-kitchensafety-activity-7436442313343729665-lAvo
- Mesa Turf Masters (Grand Junction, landscaping) — winter tree watering in Grand Junction/Fruita post — https://www.linkedin.com/posts/mesa-turf-masters_winter-tree-watering-in-grand-junction-fruita-activity-7417230291087302656-4uhF
- Mesa Turf Masters — lawn care in Grand Junction post — https://www.linkedin.com/posts/mesa-turf-masters_put-your-lawn-in-grand-junction-co-on-this-activity-7407084944126132224-cGjx

### Skipped (discovery notes)
- COPPERSMITH PLUMBING COMPANY INC (Grand Junction, 28 followers): company page has "No posts yet".
- Grand Mesa Mechanical Inc (Grand Junction): "No posts yet".
- Pure Water Solutions: "No posts yet".
- Peaceful Valley Irrigation & Landscaping (Grand Junction): "No posts yet".
- Knott Laboratory (Centennial, civil engineering): not Western CO home-service; skipped.
- SGM Inc (Glenwood Springs, civil engineering): not home-service trade; skipped.
- Rocky Mountain Platinum Contractors LLC: posts tab had no extractable posts.
- The Mountain States Pipe Trades Association: trade association hiring post (9mo), recruiter-ish; skipped.
- Plumbing Manufacturers International (McLean VA), PHCC National (Falls Church VA), Plumbing + HVAC Magazine (Oshawa ON), Plumbing World (New Zealand): national/international, not local businesses; skipped.
- Origin Plumbing Heating Cooling Electrical (Greeley): posts actively but Northern Colorado, outside Western CO targeting; skipped.
- HighRidge Systems (Durango?): marketing/tech posts about home-service market observations, not a trade business; skipped.
- Discovery method that works: company /posts/ page -> innerHTML regex for linkedin.com/posts/ permalinks, with the "..." menu -> "Embed this post" dialog as fallback. LinkedIn's SPA exposes no post hrefs or data-urns in the DOM otherwise.

### Anomalies
- None on the account. Worker bugs only (login false-negative, like-button label), both fixed and deployed.

---

## 2026-10-02 — Channel reactivated (standing params, Nolan binding)

Supersedes the Sept 13 warmup scope above (warmup waived; likes-only scope overridden):

- 100 connection invites per WEEK, distributed across 2h passes (~14/day pace).
  Weekly counter enforced by `linkedin-weekly-cap.py`; stops sending invites at cap.
- 15 likes per pass every 2 hours.
- No DMs, no messages. Connections target relevant local business people only;
  likes are thoughtful engagement on relevant posts.
- Fail-closed on any checkpoint/CAPTCHA/restriction/verification wall.
- Nolan's stance: they are not going to flag us; scale back only on an actual
  restriction/flag.

Hard login gate: Nolan must log into LinkedIn himself in the Pig's li-profile
Chrome window (CDP :9224, isolated from the FB :9223 browser). `check_login.js`
gates every pass; if not logged in, the pass ends immediately with zero actions
and logs "waiting on Nolan login". Never enter credentials, never wait on 2FA.

Two restriction signals in 7 days pauses the channel (per the Sept 13 plan).
HOLD markers: `[HOLD:restriction]`, `[HOLD:checkpoint]`, `[HOLD:logged-out]`.

## Never re-engage (connected profiles, off-limits forever)
- (none yet)
