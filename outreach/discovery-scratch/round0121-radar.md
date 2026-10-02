# New-business radar — round 0121
Run date: 2026-09-25 ~01:21-02:10 MDT (scheduled 2026-09-25 01:21 MDT).
Lane: new-business radar only. RESEARCH ONLY. No pipeline.md / leads.md / facebook-dms.md / JSONL writes were made by this lane. 300-active cap respected; nothing inserted anywhere.

## RADAR WINDOW + SOURCES CHECKED

Window: 2026-06-27 to 2026-09-25 (60-90 days). Corridor: Mesa County towns + Delta, Montrose, Rifle, Carbondale. Trade list: plumbing, HVAC, electrical, roofing, landscaping, tree, pest, septic, concrete, garage door, fence, painting, handyman, remodeling, cleaning. No franchises/chains.

1. **Colorado SOS business database** — the co.colorado.gov/search-business-records page is a Drupal info page linking out to the legacy search (sos.state.co.us/biz/BusinessEntityCriteriaExt.do). The criteria page GET returned 200 via curl. The actual search POST (searchName=plumbing, cmd=Search) timed out twice (HTTP 000, 45s). Recorded as a failed source attempt; no filings obtained. Consistent with prior rounds' finding that this channel is not reachable from the VM.
2. **social.search sweep 1** (grand opening / new business Grand Junction area, since 2026-06-27): 19 FB posts. Raw file /tmp/zeitgeist-3a9f8a84-305e-4e92-95d0-eddb1e04c071.xml. Yield: no new trade businesses. Fuzzy's Taco Shop (chain), Lil Richard's (food), Sensory Store (retail), Graff Dairy (ownership change), rec center, Liberty Apartments groundbreaking, SURPStone (manufacturing, out of scope), R.P.E. Den (gym, out of scope).
3. **social.search sweep 2** (plumbing/handyman just-opened + chamber ribbons, since 2026-07-01): 12 FB posts. Raw file /tmp/zeitgeist-85aed6bc-181c-48d8-8775-5d919f4484bc.xml. Yield: the candidates below.
4. **social.search sweep 3** (chamber ribbon cuttings, since 2026-07-27): 3 posts. Raw file /tmp/zeitgeist-acadcb45-e6e9-47af-85ca-36e76fdeeceb.xml. Yield: Wyo Roots (Wyoming, out of geography), "LUXE" ribbon (no identifiable trade/location), B&J #3 (posted in a Ventura County food-fan group, no Western Slope link). Zero corridor hits.
5. **Web search — GJ chamber ribbon cuttings / new members**: only stale Business Times archive items (oldest: Oct 2025 Kitchen Tune-Up franchise cutting, already ruled out in prior rounds). No verifiable new trade ribbon cuttings.
6. **Web search — Montrose/Delta chamber new members**: no published new-member lists with dates surfaced; nothing verifiable.
7. **City business-license new-issue lists**: not surfaced by web search for GJ/Montrose/Delta; not findable this run.
8. **facebook-cli verification**: post read on the SpiritDeWolf promo (confirmed Delta group post, business card shows published phone); groups details on the B&J #3 group (dead end). Page profile/timeline lookup for SpiritDeWolf Services page was 403 (page not publicly readable via CLI) — no date obtained.

## QUALIFYING HITS

**Zero.** No brand-new trade business with a verifiable filing/opening date in the window was found this run. Honest zero recorded. The only first-sightings were either already known from prior radar (SpiritDeWolf — see WATCHLIST) or lack the required Western Slope address (Clogzilla — see WATCHLIST). Nothing was staged with source=new-filing because no candidate met the date-evidence bar, and nothing was inserted per the 300-active cap.

## WATCHLIST (near-misses with reasons)

| Business | Trade | Reason it did not qualify |
|---|---|---|
| SpiritDeWolf Services (Travis Baca, Delta area) | Handyman / multi-trade (carpentry, plumbing fixes, electrical, drywall, painting, decks, fencing, gutter cleaning, tile/flooring, swamp-cooler service) | NOT NEW. Already radar-processed in round56 ("no independent dated formation or opening evidence; not qualified") and promoted in FB group posts as early as 2025-09-01 (Montrose Business Board). Freshest sighting 2026-09-21 in Delta Colorado Message Board with published phone 970-765-1097 and a FB Page — but active since 2025, so it cannot be a new filing. Excluded on age, not thinness. |
| Clogzilla Drain Cleaning, LLC | Drain cleaning | Announced 2026-09-16 on FB a comeback from a family-emergency break plus EXPANSION to the Western Slope, promo window 2026-09-21 to 2026-10-21. Existing business expanding, not a new filing, and no Western Slope town/address confirmed yet. Same expansion shape as the Screen Medic round127 precedent, but without a confirmed address. Watch for a concrete Western Slope location before qualifying. |
| Kleeman & Sons Plumbing (Fruita, 970-589-5430) | Plumbing | Already tracked — present in the dedupe corpus ("kleeman sons plumbing"). DEDUPED, not repeated. |
| Countryside Service Inc ((970) 523-9210) | Plumbing/service | Already tracked — present in the dedupe corpus ("countryside service inc"). DEDUPED, not repeated. |
| Joe's Family Plumbing, Inc. (Shane Shipley) | Plumbing | New business signal (owner awaiting Colorado plumbing-board paperwork, posted 2026-08-07) but located in Sterling, CO (northeastern Colorado). Out of corridor geography. |
| WeDo Plumbing | Plumbing | Announced 2026-09-02, opening scheduled 2026-09-08 — but Littleton, CO. Out of corridor geography. |
| Morris & Son Sewer & Drain LLC | Sewer/drain/winterization | Serving Cotopaxi, Texas Creek, Westcliffe, Howard, Salida. Out of corridor geography. |
| Balanced Plumbing L.L.C. | Plumbing/remodeling | Golden, CO (Living in Golden group). Out of corridor geography. |
| Mr. Rooter Plumbing of Northern Colorado | Plumbing | Franchise. Hard rule: no franchises/chains. Also out of geography. |
| SURPStone (Jill Layton, Grand Junction) | Concrete pavers from recycled plastic | Manufacturing startup, one-person operation profiled by KKCO 2026-09-22. Not a home-service trade. |
| The R.P.E. Den | 24/7 powerlifting gym | Family ribbon cutting 2026-08-02. Not a home-service trade. |
| B&J #3 (Jay M Skousen) | Unknown (ribbon cutting 2026-09-19) | Posted in the "I love Corn Burritos" food-fan group; no Western Slope link verifiable. Unverifiable. |

## METHOD NOTES

- Dedupe ran against leads.md, pipeline.md, facebook-dms.md (312/47/127 name extractions, normalized), and western-co-prospects.jsonl (305 records), combined into /tmp/dedupe_all.txt (627 normalized names). Every name above was checked; matches were the two DEDUPED rows and the SpiritDeWolf prior-radar history.
- The SOS channel remains the structural gap for this lane: the legacy search POST is unreachable from the VM (two timeouts this run). All filing-date evidence this run came from social/web sources; no filing date was invented for any candidate.
- The Delta Colorado Message Board group ID is 251941363127196 (30k members, open) — a productive radar surface for Delta-area trades going forward.
- The GJ Chamber member-calendar URL from the round127 notes (business.gjchamber.org/events/calendar) 404s on browser.open; do not reuse that exact URL. The chamber calendar still looks like the highest-signal radar channel (round127 precedent), but it needs a working link or the FB lane's recurring scan.
- Net finding: a genuinely dry window for brand-new trade filings this run. The active new-business signal in the corridor continues to be expansions/relaunches (Clogzilla Western Slope expansion) rather than new independent shops.

Files touched: this report only. Raw social results in /tmp (zeitgeist-3a9f8a84-*.xml, zeitgeist-85aed6bc-*.xml, zeitgeist-acadcb45-*.xml) — ephemeral; key facts preserved above.
