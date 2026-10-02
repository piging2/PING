# fb146 curation notes (2026-09-29 01:28 MDT pass; 1 curated like)

Discovery: fb146-discover.py, 530 candidates, 53 trade-keyword hits. All 20
group surfaces healthy. Page timelines 0 posts (persistent since pass 115).

Builder (build-fb-job.py 146, TARGET_LIKES=75): 530 -> 408 fresh
(blocked: ledger-engaged 51, engaged-name 68, engaged-post-id 3; ledger: 2294
engaged post IDs). Provisional: 67 likes, eyeballed and NOT used as-is
(pass-129 lesson: usual misfire mix - AGPS 5x, real-estate 7x, bank/lender
ads 3x, handyman-spam 3x, WCO pellet stove 2x, CLOGZILLA, missing-pet,
ProFinish 4x cross-posts, Durango solar/junk, side-jobs, ISO asks).

Fresh-pool sweep beyond provisional (parent only, no subagent; promo-signal
scan + full 53 trade-hit eyeball + wide-net scan): final 1 like.

Terminal-aware ledger checks (intent -> observation joins):
- Phat Foodz food truck (Palisade): like EXECUTED + comment FAILED ~16h ago
  (pass-143, fb-20260928-093112) -> terminal block. Dropped.
- Cedaredge swamp-cooler handyman / Travis Baca (Roofing B): like EXECUTED
  ~6h ago (pass-144, fb-20260929-013207) -> recency. Dropped.
- ProFinish Drywall & Paint 4x cross-posts: engaged 2026-09-20 + pass-79
  comment quarantine -> prior engagement. Dropped.
- Fruita pressure-washing startup: EXECUTED pass-144 -> recency. Dropped.

Author verifications (facebook-cli post read):
- Knightly Cleaning Co (CO BizNet): owner Kristen Knight, personal profile;
  flyer lists 719-669-7579 (CO Springs area code), claims statewide service
  -> locality unverifiable for the corridor (Bullseye-Texture precedent).
  Dropped.
- Mom Car Refresh (GJ Message Board): owner Tessa Dinkel, personal profile;
  post is an interest-check ("thinking about adding a new service"), not a
  genuine promo. Dropped.
- AF Maintenance & Janitorial LLC (GJ community): owner Anjanee Prescott,
  personal profile; business is a named Grand Junction LLC, genuine local
  promo, 0 prior mentions in ledger + facebook-engagement.md. KEEP (like-only
  per pass-141/143 personal-profile trade-promo precedent).

Other drops: real-estate 8x, bank/lender ads 3x, handyman-spam 3x (EXECUTED
09-24 AND 09-27), AG Property Services 5x (blocked business), WCO pellet
stove 2x (blocked business), CLOGZILLA (719, out-of-corridor), Bullseye
Texture (blocked), Durango solar (Cortez, out-of-corridor), Durango junk
removal (505 NM, out-of-corridor), missing-pet reward, ISO asks (mattress
haul, house cleaner, Glenwood housing), side-jobs 2x, no-name/fail-closed
(picket fence, carpet Matt, haul-it-all 970-901-7956, Emily bakery,
"call us for a free quote", "fall tree needs", "fun event Saturday"),
Morehouse produce (stale Sept 23), CO Desi saree 2x (out-of-corridor),
Witches Night Out (event org, fail-closed), "my friend Tony" tree referral,
Pawcasso's/Roice-Hurst fundraiser (EXECUTED pass-143), Dry Creek vendor
solicitation (Centennial, out-of-corridor), GJ community excavation
(720 Denver number), Blessed Harvest (EXECUTED 09-27), GJ trees garden chat.

Keeps (1): AF Maintenance & Janitorial LLC rare Thursday opening
(GJ community, like-only, unique page string).

- Note: `never_reengage.py` standalone filter path still stale (file does not
  exist); builder pre-filter + manual curation + at-dispatch guard remain the
  live mechanism.
- Next: collector records observations; next scheduled pass (2h) builds
  pass-147 at full caps 75+20 (no-scale-back: retry, never lower).
