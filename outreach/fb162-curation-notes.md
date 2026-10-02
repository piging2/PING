# fb162 curation notes (2026-09-30 ~07:30 MDT)

Provisional: 62 likes from build-fb-job.py (542 candidates -> 427 fresh; blocked: ledger-engaged 36, engaged-name 76, engaged-post-id 3; ledger consulted: 2438 post IDs). Provisional NOT used as-is (pass-129 lesson).

Manual curation over provisional + fresh-pool promo sweep:
- Sweep script: fb162-curation-sweep.py (class filters + PREFIXED post:ID ledger check via engagement-guard._fb_ledger_engaged_post_ids(); home-feed newsfeed sources excluded as non-eligible personal-profile surfaces).
- facebook-cli post-read author resolutions (5): Legacy Furniture (2014600962562515), Delta community meal (1815158469909191), Ridgway dryer vent + gas fireplace (28654589917514250 / 28642060438767198), GJ community BOGO detail (1664756462107217).
- RIDGELINE FITNESS author resolved separately (4612786535710867): personal profile Alexa Endsley.

KEEPERS (3):
1. LIKE Legacy Furniture LLC showroom post (Durango group 786995948656362, permalink 2014600962562515). Page-authored (owner Legacy Furniture LLC, id 100091489283796). New post 2026-09-29, GJ business 579 1/2 North Commercial Dr, Grand Junction CO, 970-250-4448. Ledger-clean (PREFIXED check). Last business engagement: pass 82 (2026-09-21), ~9 days, outside the 7-day recency window (pass-154 precedent).
2. COMMENT same post (Page-authored, comment-eligible): "A walk-through showroom beats a catalog every time. GJ hardwoods doing the talking, resin just holding the frame." (18 words, voice-compliant).
3. LIKE Ridgeline Fitness ski-fit promo (Orchard Mesa 2376973139292229, permalink 4612786535710867). Personal-profile author (Alexa Endsley 100024015951351) -> like only per pass-153 precedent. Business web-verified: Ridgeline Fitness, 805 E South Ave, Grand Junction, CO 81501 (ridgelinefitness.com). Ledger-clean.

DROPS:
- Western Colorado Chimney x2 (Ridgway dryer vent / gas fireplace): blocked business (pass-157 precedent).
- Bodan's Detailing BOGO (GJ community 1664756462107217): pass-143 business recency.
- Delta community meal (1815158469909191): personal profile Elizabeth Wilcox, thin, no business named -> fail-closed.
- Paint Wizards x2 (Orchard Mesa / WesternCO Msg): fail-closed, friends-only personal-profile precedent (pass-157).
- AG Property Services (Orchard Mesa): pass-1/pass-39 never-re-engage, personal profile.
- Grub:30 October (Montrose/Ridgway cross-posts): FAILED 09-27 terminal block.
- Chef Uma Thai fall promo (Ridgway): pass-154 window.
- ProFinish Drywall cross-post (Ridgway 28634719466167962): engaged pass-160 (~4h prior).
- Blessed Harvest preorder (Orchard Mesa 4613765708946283): EXECUTED 09-27, window.
- North Fork Flowers homecoming (Delta): EXECUTED 09-27, window.
- Queen of Clean-Up / Homegrown Hauling / "Yard cleanup 720" / Forget Me Not $20/hr: locality unverified, fail-closed precedent.
- Open Ledger-style bookkeeping promos (CO BizNet): locality unverifiable, fail-closed.
- Bando the Barber bare link: fail-closed bare-URL precedent.
- Durango detail promo (2014894499199828): out-of-corridor geography (Durango), author unresolvable value.
- Workhorse Custom Remodeling (Durango, 303 number): locality unverified, Denver-metro area code -> fail-closed.
- Real-estate class (Montrose ag property, Paonia $409.9k, GJ $1.475M lot): non-eligible.
- Boolesque Halloween (Montrose/Ridgway): event, thin.
- Silent auction fundraiser (Fruita): fundraiser, thin.
- BoT politics (Palisade Msg), Halloween lists, missing-pet, ISO threads, "Give us a call today" thin no-name, Cultura Barbershop Longmont (out-of-corridor), travel-agency "Trips" (thin), saree seller (CO Desi, out-of-corridor).

never_reengage.py standalone filter path still stale (file does not exist); builder pre-filter + manual curation + at-dispatch guard remain the live mechanism.
