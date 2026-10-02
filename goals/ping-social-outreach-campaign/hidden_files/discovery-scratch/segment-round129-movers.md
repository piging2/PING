# Segment Round 129 — Residential Moving Companies (Western Colorado Corridor)
source=corridor-research round-129 | date=2026-09-23 | researcher=subagent (research-only)

Geography: Grand Junction, Fruita, Palisade, Clifton, Collbran, Loma, Mack, De Beque, Delta, Montrose, Rifle, Carbondale.
Prior: batch 3 (2026-09-08) covered Denver metro movers only. This is the first dedicated Western Corridor mover segment.

## CANDIDATES (3 staged — no padding)

### 1. Gentle Hands Moving LLC — Grand Junction — WARM
- trade: moving (residential)
- town: Grand Junction, CO (directory address: 3145 E Rd, Grand Junction; serves Grand Junction + surrounding area per own site)
- contact: own-site estimate/request form at https://gentlehandsmovingllc.jobbersites.com/ ("Get an Estimate" / request form, verified on own site); phone (970) 417-6199 = directory-sourced (search listing; NOT observed on own site)
- owner: unstated (described as family-run / locally owned on own site and directories; no name published)
- independence: independent; family-owned, locally owned; no franchise signals as of 2026-09-23; crew described as a team (size unstated)
- angle: MISSED_CALL_LEAD_CAPTURE — small family crew living on phone + quote form; mid-move and after-hours calls go to voicemail; quote-speed decides bookings
- stack: CONFIRMED Jobber (site is a Jobber-hosted jobbersites.com build with request form) -> likely-friction: Jobber quote workflow exists but after-hours/mid-job inbound calls still hit voicemail with no instant capture -> possible-opportunity: missed-call text-back + quote follow-up automation alongside Jobber -> confidence: platform CONFIRMED, friction WEAK INDICATION (inferred, not observed)
- status: WARM (own-site form verified)
- dedupe: `check-prospect-collision.py "Gentle Hands Moving"` = CLEAR; grep leads.md/pipeline.md/facebook-dms.md = no hits

### 2. Double Diamond Moving & Storage — Carbondale — WATCH
- trade: moving (residential, one of four service paths alongside designer logistics, art handling, contractor logistics)
- town: Carbondale, CO (HQ: 1900 Dolores Way, Carbondale; also Gypsum warehouses)
- contact: own-site phone +1-970-927-3770 (published on own homepage); no email or quote form observed on homepage this round
- owner: Zak Fishkin & Lupe Sanchez (stated as Founders/Owners on own site)
- independence: independent; established 2009; full team page (dispatch, bookkeeper, warehouse ops, van foremen = 3+ crews); no franchise signals as of 2026-09-23
- angle: MISSED_CALL_LEAD_CAPTURE — residential inquiries compete with their designer-logistics core; quote-speed decides whether a residential lead books or bounces
- stack: STRONG INDICATION of proprietary in-house software (own site: "Web-accessible proprietary software" online inventory system for designer workflow) -> likely-friction: residential quote path is not a first-class flow on the site; inbound residential calls likely handled manually -> possible-opportunity: dedicated residential capture/quote-speed layer without touching the designer system -> confidence: custom software STRONG INDICATION, residential-stack UNKNOWN
- status: WATCH (own-site phone only; email/form not observed)
- dedupe: `check-prospect-collision.py "Double Diamond Moving"` = CLEAR; grep = no hits

### 3. Elevated Moves — Carbondale — WATCH
- trade: moving (residential) + storage
- town: Carbondale, CO (1925 Dolores Way, Carbondale, CO 81623)
- contact: phone (970) 366-6413 = directory-sourced (servicextc.com, yellowpages.com, loc8nearme.com); own site elevatedmoves.co could NOT be verified this round (fetch failed); naopm profile references elevated-moves.com (unverified)
- owner: unstated (yellowpages: "founded by local, highly trained, professional movers and investors"; ~10 years in business; no names published)
- independence: independent; no franchise signals as of 2026-09-23; bonded per directory
- angle: MISSED_CALL_LEAD_CAPTURE — phone-centric operation; quote-speed decides bookings
- stack: UNKNOWN (no own-site evidence verified)
- status: WATCH (directory-sourced phone; own site unverified)
- dedupe: `check-prospect-collision.py "Elevated Moves"` = CLEAR; grep = no hits

## NEAR-MISSES
- Jo Mama's Movers (Montrose) — DEDUPE COLLISION: already in canonical JSONL + pipeline.md (L641). Not staged.
- The MOOving Company (Montrose) — DEDUPE COLLISION: already in canonical JSONL. Not staged.
- All Pro Moving & Commercial Warehousing (Grand Junction) — Atlas van-line affiliation (own-site evidence). Excluded: national van line.
- Bailey's Moving & Storage (Grand Junction) — Allied agent (baileysallied.com). Excluded: van-line agent.
- Mesa Moving and Storage (Grand Junction) — United Van Lines agent (own-site evidence). Excluded: van-line affiliation (chain re-check at research time).
- Allied Van Lines / Two Men and a Truck (Grand Junction; Gypsum) — national / franchise. Excluded.
- Affordable Actions Moving Services (Grand Junction) — affordableactions.com is now a parked GoDaddy domain; directory flagged "possibly temporarily closed." Excluded: appears defunct.
- Olde Towne Moving & Storage (Carbondale) — PitchBook: Acquired/Merged, operating subsidiary of Cadogan Tate, PE-backed. Excluded: chain check at research time (acquired, no longer independent).
- Exodus Moving & Storage (Crawford) — home base Crawford, CO; serves Rifle but not corridor-based. Excluded: out of geography.
- Transylvania Moving Co. — Beverly/Salem, MA. Excluded: out of geography (greatguysmove "Rifle" ranking is long-distance aggregator noise).
- Moving Colorado LLC — Denver (2921 W 38th Ave). Excluded: out of geography.
- Right Way Movers — Oceanside, CA. Excluded: out of geography.
- Fantastic Movers — Lakewood/Denver-based (1388 Garrison St), serves Western Slope but home base is Denver metro. Excluded: out of geography.
- Cowboy Moving & Storage — Denver-based, Rifle is a service page. Excluded: out of geography.
- A to B Movers / Cherry's Custom Delivery & Moving / Major Movers — Glenwood Springs base (out of geography) and/or directory-only. Excluded.
- Vogy's House Moving (Montrose) — structure/house moving (home lifting), not residential household moving. Excluded: wrong trade.
- Animas Moving (Durango), Peak to Peak Movers (Silverthorne), The Moving Van (Steamboat Springs) — out of geography.
- Thomas Moving Services (Montrose) — real local mover (BBB profile, founded 2011) but NO own site or FB Page found; directory-only. Near-miss per strict rule (not staged).
- Self Help Movers (Delta, 7454 CO-65) — directory-only place listing; no own site/FB Page verified. Near-miss per strict rule (not staged).
- Fruita / Palisade / Clifton / Collbran / Loma / Mack / De Beque — no dedicated independent residential movers surfaced; only lead-gen pages (movingexpertsusa, loadup, movers-nearme.us) and aggregator rankings of out-of-area companies.

## REVIEW FINDINGS
- Gentle Hands Moving LLC: own-site Google reviews 4.9 aggregate, all shown reviews 5-star; directory AI summary strongly positive. No 1-3 star snippets found. (Own-site snippets only; Google profile not directly accessed.)
- Double Diamond Moving & Storage: directory rating 5.0 (8 reviews). No negative snippets found.
- Elevated Moves: mixed signals — 4.1/14 on servicextc.com; vanlinesmove.com shows one 1/5 review (~a year ago, no text captured) alongside an aggregator-claimed 4.8 (1500 reviews, treat as weak). PAIN CATEGORY: unknown (no review text captured).
- Jo Mama's / MOOving: already tracked; not re-examined (MOOving greatguysmove showed 11 positive / 1 negative, no text).
- Google review profiles were not directly accessible for snippet mining this round; findings are from own-site and directory snippets only.

## SEO-AEO FINDINGS (own-site evidence only)
- Gentle Hands Moving LLC: MODERATE ai_discoverability — FAQ block (how to contact, pricing basis, service areas), explicit services list, embedded Google reviews, estimate form. Thin service-area content, no pricing.
- Double Diamond Moving & Storage: MODERATE ai_discoverability — deep structured content (service paths, team/owners, warehouse locations, est. 2009, residential moves named) but designer-logistics framing dilutes residential relevance.
- Elevated Moves: UNKNOWN — no own-site evidence verified this round.

## RADAR FINDINGS
- NEW-BUSINESS RADAR: no new moving companies found in chamber/ribbon-cutting coverage (Grand Junction Business Times 2026 archives, 1037 The River summer ribbon-cutting roundup, GJEP new-business announcements). Ribbon cuttings found: engineering firm, Natural Grocers, locksmith, EquipmentShare, credit union. No moving-company grand openings, no chamber new-member movers.
- No source=new-filing tags (no filed/opened dates within 60-90 days confirmed for any mover).
- Gentle Hands Moving LLC is plausibly a newer micro-mover (Jobber-hosted site pattern) but no founding date found; NOT tagged.

## SEGMENT NOTES
- Thin honest yield: 3 staged. The corridor's independent residential-mover pool is genuinely small; the two strongest names (Jo Mama's, MOOving) were already in the canonical JSONL, which the dedupe system caught correctly.
- Chain re-check at research time paid off twice: Mesa Moving (United agent) and Olde Towne (acquired by Cadogan Tate) both looked like independents at directory level but failed the affiliation check from own-site/verified sources.
- Movers in this corridor skew toward mountain-logistics hybrids (Double Diamond, Elevated) rather than pure residential shops; the pure residential shops (Gentle Hands) are tiny phone-and-form operations — exactly the MISSED_CALL_LEAD_CAPTURE profile.
- Software signal of the round: Jobber is CONFIRMED in active use by a corridor mover (Gentle Hands via jobbersites.com). Quote-capture tooling exists in the trade; the gap is live inbound-call handling, not booking software.
- No software pricing changes, new tools, or competitor moves observed in any of the 10 categories this round.
