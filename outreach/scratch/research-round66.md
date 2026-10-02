# Research round 66: locksmiths (re-verify) + evaporative/swamp cooler service (new segment)
2026-09-16. Research-only, no business contacted. Output JSONL: `scratch/research-round66.jsonl` (11 rows, canonical 33-field schema).

## Segment (a): Western Colorado locksmiths (re-verified, not a new segment)

Round 66 re-scanned locksmiths because 6 near-misses from round 32 needed live verification. Locksmiths are NOT a new segment; all 9 candidates cleared the 886-name dedupe file (zero hits) and all 8 previously-qualified locksmith names (Linville, J Lock, Lyons, Belles, Honk-Key, Inside Out, A Bargain, Cortez, Vail) were excluded.

Qualified: 9 (2 with email/form routes, 7 phone-only WATCH).

| Business | Town | Route | Priority |
|---|---|---|---|
| Tri-County Locksmith Service | Glenwood Springs | tricountylocksmithservice@gmail.com + homepage contact form (owner: Wayne Winton) | WARM |
| Gene's Lock and Key | Glenwood Springs | explicit own-site contact invitation (homepage form flow), 40+ yrs | WARM |
| American Locksmithing LLC | Montrose | 970-249-0134 (phone-only) | WATCH |
| Pagosa Armor Locksmith | Pagosa Springs | (970) 264-2747 (phone-only) | WATCH |
| S&S Lock Service | Bayfield | (970) 779-8008 (phone-only) | WATCH |
| Open Door Lockout Services | Bayfield | (970)903-6185 (phone-only, 24-hr/<45-min promise) | WATCH |
| Telluride Locksmith | Telluride | 970-728-5625 (phone-only, since 1974) | WATCH |
| Steve's Safe Services | Fruita | (970) 640-5637 (phone-only, safe/vault specialist) | WATCH |
| 1 of Those Locksmith Guys | Fruita | (970) 314-1575 (phone-only; phone from indexed own-site data) | WATCH |

Segment shape: the surviving pool is overwhelmingly phone-only owner-operators. The default primary opportunity is MISSED_CALL_LEAD_CAPTURE (high confidence where 24/7 is advertised), because a lockout caller who hits voicemail dials the next company. Pre-winter lockout season plus ski-season approach is the seasonal hook (car-key calls rise in winter; resort-town visitor traffic).

Skip patterns this round: Simmons Lock & Key (GJ, since 1945) still has no verifiable email/form; Durango Lock and Key own site failed to fetch; directory-only shops (Village Locksmith, Local Locksmith Company LLC Carbondale, Eagle Lock & Key, Rifle Lock and Safe, North Fork Lock and Key Hotchkiss, Lee's Keys Plus/ACC Steamboat); franchise (Brothers Locksmith Rifle); national SEO pages; Gunnison = nothing but kiosks/chains.

New-business radar: nothing eligible in the 60-90 day window; only Honk-Key's GJ grand opening press release (2026-06-19), excluded per dedupe.

## Segment (b): Evaporative/swamp cooler service and winterization (NEW segment)

This segment was never covered. Honest verdict: thin. The dedicated cooler-service space on the Western Slope is absorbed by big HVAC shops already in the record (Home Comfort, Peterson's, Haining, Fenix, M&R, Snipps, Rescue 1, Appliance Doctor, Climate Control, Whatley, Sonny's), all deduped. Yield: 2.

1. **GPS Plumbing & Mechanical LLC, Grand Junction** (HOT). Own site advertises "swamp cooler startup, shutdown, and pad replacement"; family-owned; contact email gpsplumbingco@gmail.com and (970) 234-1773; Gmail address is a WEAK INDICATION of low marketing-tech maturity. Primary: MISSED_CALL_LEAD_CAPTURE, high confidence. Caveat: email verified via search-indexed own-site content; re-verify on a live fetch before drafting.
2. **Jumbo Home Services LLC, Grand Junction** (WATCH). Explicit "Swamp cooler startup / winterization and repair" in service list plus a seasonal care plan with spring/fall start-up and winterization; phone-only CTA (970) 644-6053. WordPress STRONG INDICATION. Primary: MISSED_CALL_LEAD_CAPTURE, high confidence. Serves Grand Junction, Clifton, Palisade, Fruita.

Seasonal why-now: 2026-09-16 sits squarely in the Western Slope winterization window (shut down and drain before the first hard freeze, typically October). Owners are on roofs all day and calls ring unanswered; shutdown-booking inbound surges right now.

Skip patterns: national SEO template sites (buzzswampcoolerrepair.com, local-services-nearme.com, localservice-close-by.com); out-of-geography (True North Heating Colorado Springs, Mighty Plumbing Denver, asph.com Rio Rancho, American Appliance Denver); dead site (Cooling's Heating and Air Montrose, parked LNMP page); directory-only (E&C Lawn Care GJ lists winterization only on a Yardbook profile); Comfort Air Cortez (no explicit cooler evidence on own site).

New-business radar: none found.

## Verification flags for the parent (one live-browser verification each)
1. GPS Plumbing & Mechanical LLC email on live fetch (gpsplumbingco@gmail.com was verified via indexed content, not a live fetch).
2. Jumbo Home Services LLC contact page (may exist but was not fetched; only the homepage was).
3. Gene's Lock and Key deeper contact page (invitation lives on the homepage; no deeper form URL surfaced).
4. 1 of Those Locksmith Guys (tlsguys.com) full page fetch failed; phone (970) 314-1575 formatting confidence is lower.

## Enum check
All rows use legal enums: priority HOT/WARM/WATCH, opportunity_confidence high/medium/low, ai_discoverability strong/moderate/weak, stack grades CONFIRMED/STRONG INDICATION/WEAK INDICATION/UNKNOWN, booking_mechanism from observed patterns, suppression_state=eligible, source=research-round66.
