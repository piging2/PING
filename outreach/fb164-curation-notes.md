# FB pass-164 curation notes (2026-09-30 ~09:31 MDT)

Pool: 542 candidates (fb164-candidates.json) -> 430 fresh after builder pre-filter
(ledger-engaged 28, engaged-name 81, engaged-post-id 3; 2440 ledger IDs consulted).
Provisional: 71 likes, NOT used as-is (pass-129 misfire mix).

## Author resolutions (facebook-cli post read --url, 9 total)

- Christmas lights post (4089982987803805): owner "All Around Window Washing"
  (100063588307402), serving Arvada/Denver/Lakewood/Westminster/Broomfield/Boulder.
  DROP: Denver metro, out-of-corridor.
- Grand Adventure Balloon (4090039757798128): owner "GrandAdventure BalloonTours"
  (100057278747536), Page-authored. KEEP (like).
- Tire post (28656214514018457): owner "The Lube Shop Tire & Brakes"
  (61575411640086), 188 Gunnison River Dr, Delta, Page-authored. KEEP (like+comment).
- Sage Bloom Studio (2300390730725106): owner "Sage Bloom Studio LLC"
  (61574749112382), GJ, Page-authored. KEEP (like).
- Aila Thai (28656158087357433): owner "Aila Thai kitchen" (61577145728709),
  Delta, Page-authored. KEEP (like+comment).
- Surf To Turf (785736171301211): owner "Surf To Turf" (61577454879701),
  Palisade, Page-authored. KEEP (like+comment).
- Peach Street Distillers (2300449780719201): owner "Eric Gilbert" (701520643),
  personal profile. KEEP as like-only.
- Bootcamp recap (4090041207797983): owner "Jennifer Lopez" (100000582241550),
  personal profile. KEEP as like-only.
- Slingshot Auto Glass shoutout (4090023431133094): owner "Ernesto Kingpin Martinez"
  (100057347186845), personal profile (podcast episode). KEEP as like-only.
- Grand Gloss Boss (28405994822357001): owner "Grand Gloss Boss" (61579271855122),
  auto detailing, Page-authored. KEEP (like).

## Ledger checks

All 22 curated keeps checked against `_fb_ledger_engaged_post_ids()` using
PREFIXED "post:<id>" form (pass-156 lesson): 0 blocked.

## At-dispatch guard

Guard blocked 2: both Cassi RossGeske friend-post likes
(SKIPPED_REENGAGEMENT, page slug 100000086800463 engaged before).
Final dispatch: 20 likes + 3 comments, pass_id fb-20260930-153100.

## Drop classes this pass

Blocked business (Western Colorado Chimney x4, incl. Redlands near-dups);
locality-unverified fail-closed (Queen of Clean-Up, Homegrown Hauling,
yard-cleanup-720, Open Ledger Bookkeeping x2); fail-closed personal-profile
(Paint Wizards x2, AG Property Services, bando-the-barber bare link);
recency (North Fork Flowers EXECUTED 09-27, Grub:30 FAILED 09-27,
Blessed Harvest EXECUTED 09-27, Chef Uma pass-154); reel format (Cassi Doughbra
reel); real-estate class; missing-pet; Boolesque/Halloween; road construction;
"Dreaming of" spam; ISO/job threads; politics; fundraisers; thin no-names;
out-of-corridor (Durango, Glenwood, CO Desi, Denver metro).

## Near-dup collapses

Farm Stand Friday Whitewater (GJ MB kept / Orchard Mesa dropped);
Peach Street Distillers (GJ MB kept / Palisade Msg dropped);
Rise and Shine Bakes (Montrose kept / Ridgway dropped);
Aila Thai (1 of 5 cross-posts kept); Surf To Turf (1 of 4 cross-posts kept).
