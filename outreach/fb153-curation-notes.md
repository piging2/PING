# FB Pass 153 curation notes (2026-09-29 ~13:30 MDT)

Discovery: fb153-discover.py, 531 candidates, 43 trade-keyword hits. All 20
group surfaces healthy. Page timelines still 0 posts (since pass 115).

Builder pre-filter (build-fb-job.py 153, TARGET_LIKES=75): 531 -> 414 fresh
(blocked: ledger-engaged 40, engaged-name 76, engaged-post-id 1; ledger
consulted: 2419 engaged post IDs). Provisional: 59 likes. Eyeballed and NOT
used as-is (pass-129 lesson). Usual misfire mix present: real-estate 5x,
bank/lender 2x, AGPS 3x, ProFinish 4x, fireplace/pellet-stove 3x (ALL verified
Western Colorado Chimney owner_id 61565264274777 via post read -> blocked
business, dropped), Durango 5x, CO Desi 3x, CO BizNet out-of-corridor
(Gemini Construction Evans CO, Vecinos Mexican Grill Severance CO),
missing-pet, handyman-spam, for-sale, fund-drive, viral feed author.

Author resolutions via facebook-cli post read --url (16 reads this pass).

KEEPS (2 likes, 0 comments):
1. LIKE Jacob Land / Rough Idle Diagnostics Halloween check-engine promo
   (GJ Message Board 2299557644141748; personal profile author -> like only;
   new post today; last engagement passes 78/93 (09-20/09-22), outside 7-day
   window; GJ-local auto diagnostics, 970-589-1986). Near-dup cross-post in
   GJ community (1664762378773292) collapsed to this one.
2. LIKE Grand Valley Welcome Mat Local Lore page launch (Fruita
   4481772742096502; community org Page 61591331289549 -> likes only per body).

DROPS (terminal-aware, ledger + pass-log joined):
- Dough Pros weekly update (EXECUTED pass-144, window).
- Smith Family Orchard Store Maker post (EXECUTED 09-24, window).
- Aila Thai Kitchen (like+comment pass-131, window).
- Bodan's Detailing BOGO (like+comment EXECUTED pass-143 ~18h ago, window).
- Efird Family Homestead sourdough update (EXECUTED pass-140, window).
- Blessed Harvest preorders (EXECUTED 09-27, window).
- Whitewater farm stand Friday (EXECUTED 09-23, window).
- Grub:30 (FAILED 09-27, terminal block).
- Korean Corn Dogs (recency).
- Sunny Thai (EXECUTED pass-144, window).
- Cattlemen's / Sassy Creative (pass-151, window).
- PRUF / Yoga Dance More / Elite Pool / Happy Strides / Self-Hope (pass-152, window).
- Mary Ritcherson brows (personal-profile author, pass-152 precedent).
- ALI Logistics (B2B, serves all US, not local business promo).
- REMAX Mountain West building site (real-estate class).
- Gio Quintana handyman (personal profile + personal plea).
- ProFinish 4x (cross-post spam, pass-151 precedent).
- Parade of Homes 2x (real-estate class).

Tool note: action-intent-ledger.py `check` returns a fixed unrelated intent
(2026-09-14 PING Social page like) for every URL queried -- its URL matcher
is broken. Used direct JSONL grep for post IDs/names instead (0 hits for all
shortlist URLs). `never_reengage.py` standalone path still stale (file does
not exist); builder pre-filter + manual curation + at-dispatch guard remain
the live mechanism (pass-143 note confirms).
