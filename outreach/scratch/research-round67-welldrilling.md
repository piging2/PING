# Research round 67: water well drilling companies, Western Colorado (SEGMENT B)
2026-09-16. Research-only, no business contacted. Output JSONL: `scratch/research-round67-welldrilling.jsonl` (4 rows, canonical 33-field schema).

## Segment: water well drilling (residential and agricultural)

Qualified: 4 (2 with own-site email routes, 2 phone-only WATCH). Prior coverage from rounds 23 and 62 held up: 16 names deduped, zero repeats. The pool is genuinely thin; the four below are the only own-site-verified drillers found across 21 towns.

| Business | Town | Route | Priority |
|---|---|---|---|
| Animas Well Drilling LLC | Durango | info@animaswelldrilling.com + 970-259-4700 (own site, live fetch) | WARM |
| Shelton Drilling Corp. | Rifle | wsdi@rof.net + 970-927-4182 (own site, live fetch) | WARM |
| McCracken Well Drilling | Montrose | 970-275-6613 (phone-only, own site, live fetch) | WATCH |
| DAK Drilling & Well Service | Ignacio | (970) 247-9685 (phone-only, own site, live fetch) | WATCH |

Details:
1. **Animas Well Drilling LLC, Durango** (WARM). Second-generation family-owned, 20+ years in La Plata County and the Four Corners. Own site animaswelldrilling.com live-fetched (homepage + well-inspection page). Email info@animaswelldrilling.com and phone 970-259-4700 verbatim on own site, plus a contact form ("one of our reps will respond within one business day"). WordPress CONFIRMED (/wp-content/ paths on live fetch). BBB A+ rating per bbb.org listing (verified third-party). Primary: MISSED_CALL_LEAD_CAPTURE, high confidence; secondary AUTOMATION (form-to-follow-up). Stack: WordPress CONFIRMED -> form exists but no chat/scheduling widget, "you'll speak directly with someone" framing means a human answers every call today -> after-hours call/text capture plus form follow-up -> high confidence.
2. **Shelton Drilling Corp., Rifle** (WARM). Own site sheltondrilling.com live-fetched. Phone 970-927-4182 and email wsdi@rof.net verbatim on own site. Wayne Shelton licensed CO water well driller since 1981 (directory bio, not own site, so owner_name left blank). Site is a sparse single-page Thryv build: hours (Mon-Fri 8-5, closed weekends), contact info, nothing else. Thryv STRONG INDICATION (footer links to thryv.com Terms/Privacy). Legacy rof.net ISP email is a WEAK INDICATION of low marketing-tech maturity. Primary: MISSED_CALL_LEAD_CAPTURE, high confidence (rig crews in the field, closed weekends, no after-hours path). Secondary: SOCIAL_PRESENCE. Stack: Thryv STRONG INDICATION -> Thryv is a marketing platform so basic web presence exists, but no online scheduling or call routing observed -> missed-call capture during field hours -> medium-high confidence.
3. **McCracken Well Drilling, Montrose** (WATCH, phone-only). Own site mccrackenwelldrilling.co live-fetched: 30+ years, family owned and operated, bonded/insured/certified, services Delta/Mesa/Montrose/Garfield/Ouray/San Miguel counties plus Gunnison, Telluride, Grand Junction. Services: well drilling, water production, management, consulting, testing, equipment install/repair. Phone 970-275-6613 verbatim on own site ("Give us a call" CTA, "Make an Appointment" is an anchor link, not a real booking flow). No email published on own site; mccrackenwelldrilling@gmail.com appears only in a 2019 Colorado DWR pump report PDF, not on the own site, so it is not used. Site platform UNKNOWN (simple one-pager, no identifiable builder). Primary: MISSED_CALL_LEAD_CAPTURE, high confidence (phone-only CTA, crews on rigs all day). Revamp candidate: false (site is functional, not a broken/very-non-technical-owner case).
4. **DAK Drilling & Well Service, Ignacio** (WATCH, phone-only). Own site DAKDRILLING.COM live-fetched: full-service drilling and well contractor, 46+ years, based in Ignacio serving Durango, Bayfield, Pagosa Springs, Cortez, Silverton, plus NM. Air rotary and casing advance methods, cisterns, gallery wells, pump repair, water treatment, emergency service advertised. Phone (970) 247-9685 verbatim on own site ("For a free estimate, please call us"). No email on own site. Site platform UNKNOWN (plain static HTML). Primary: MISSED_CALL_LEAD_CAPTURE, high confidence; secondary AUTOMATION (emergency service advertised = after-hours call capture angle). Revamp candidate: false.

Segment shape: Southwest Colorado (Durango/Ignacio) and the Montrose/Rifle corridors hold the surviving Western Slope drillers. Northwest (Craig, Meeker, Maybell) produced zero own-site-verified drillers, and the mountain pockets (Ouray, Silverton, Nucla, Naturita) produced none. Well drilling is year-round ag and rural demand, so there is no seasonal deadline hook; the pitch is steady-state missed-call and follow-up pain, since drillers live on rigs and pump trucks all day and most inbound is phone-first. Trade fit is strong across all four (each own site names water well drilling explicitly), and all are independent owner-operated shops, no franchises anywhere.

Skip patterns this round: mineral-exploration diamond core drilling (Godbe), foundation/micropile drilling (Catamount), oilfield service rigs (Piceance Well Service, Cullum Hot Oil), retired-driller advocacy blogs (The Connector), water-treatment-only (Sweet Water Pagosa), municipal-scale production wells (Stewart Brothers), directory-only shops with no own site (Valley Drilling Co, Western American Drilling, San Juan Drilling, Ground Water Development, Dallas Creek Water Co, Montezuma Well Service, San Juan Water Works).

New-business radar: nothing eligible in the 60-90 day window this round. No new-filing signals found.

## EXCLUDED (name + exact reason)
| Name | Reason |
|---|---|
| Artesian Services Inc (Grand Junction) | already covered (prior coverage list) |
| Williams Drilling Company (Gunnison) | already covered |
| Wildcat Drilling & Pump (Cedaredge/Crawford) | already covered |
| Himes Drilling Co., Inc. (Grand Junction) | already covered |
| Brooks Well Services Inc (Durango) | already covered |
| B & J Pump & Well Services (Steamboat Springs) | already covered |
| Aqua Tec Systems Inc (New Castle) | already covered |
| San Juan Pump Co (Montrose) | already covered |
| Valley Pump Co (Delta) | already covered |
| Kamerzell Bros Well & Pump Service | already covered |
| Tri County Well & Pump Service (Castle Rock) | already covered, out of geography |
| Hier Drilling Co (Castle Rock) | already covered, out of geography |
| Colorado Pump Service & Supply Co (Castle Rock) | already covered, pump-only, out of geography |
| Smart Living Water (Grand Junction) | already covered, water treatment, not drilling (trade mismatch) |
| GeoWater Services (Evergreen) | already covered, out of geography |
| Piceance Well Service (Grand Junction) | trade mismatch: oil/gas workover and service rigs, not water well drilling (own site pwsrigs.com) |
| Godbe Drilling (Montrose) | trade mismatch: mineral exploration diamond core drilling (own site godbedrilling.com, live-fetched) |
| Catamount Drilling (Montrose) | trade mismatch: foundation/micropile/soil-nail drilling (own site catamountdc.com, live-fetched) |
| The Connector LLC (Pagosa Springs) | trade mismatch: retired driller running a well-advocacy/testing consultancy, sold drilling business (own site theholeyconnector.com, live-fetched) |
| Cullum Hot Oil Service Inc (Cortez) | trade mismatch: oilfield hot oil service, not water well (directory-only) |
| Stewart Brothers Drilling Company | out of scope: municipal-scale large-diameter production wells, NM-based (own site) |
| Sweet Water Pagosa (Pagosa Springs) | trade mismatch: water treatment primary, not drilling (directory + Google profile) |
| Beeman Brothers Drilling (Durango/Bayfield) | dead site: own domain beemanbrothersdrilling.com hijacked by Indonesian gambling spam (live fetch); Durango domain failed to fetch; phone/email only from directories |

## NEAR-MISS (exact re-verification targets)
1. **Justice Water Systems (Pagosa Springs)** - Meta/Google data lists it as "well water drilling service", own site http://www.justicewater.com/, phone (970) 731-1200. Re-verify: live fetch justicewater.com (fetch failed in round 67) and confirm drilling services on the own site.
2. **First Drilling LLC (Montrose)** - firstdrilling.com is a parked Spaceship for-sale page ($1,788) on live fetch; phone (970) 249-3501, address 2990 N Townsend Ave. Re-verify: find their current own site if any; until then it is directory-only.
3. **Ucolo Water Well Service LLC (Dove Creek)** - Durable-site ucolowaterwellservice.mydurable.com failed to fetch in round 67; phone (970) 565-9339. Re-verify: live fetch of the own site.
4. **Valley Drilling Co (Montrose, since 1973)** - no own site found; phone (970) 249-5256, 12658 6450 Rd, directory-only. Re-verify: find an own site.
5. **Western American Drilling (Craig)** - no own site found; phone (970) 824-3410, 96197 E US-40, directory-only. Re-verify: find an own site.
6. **San Juan Drilling (Montrose)** - no own site found; phone (970) 249-6470, 17923 6250 Rd, directory-only. Re-verify: find an own site.
7. **Montezuma Well Service (Cortez)** - no own site found, directory-only. Re-verify: find an own site.
8. **San Juan Water Works (Pagosa Springs)** - no own site found, directory-only. Re-verify: find an own site.
9. **San Juan Drilling / Dallas Creek / Ground Water Development (Montrose)** - all directory-only, no own sites found. Re-verify: find own sites.

## Verification flags for the parent (one live-browser verification each)
1. McCracken Well Drilling email: mccrackenwelldrilling@gmail.com appears ONLY in a 2019 Colorado DWR pump-installation report PDF, not on the own site. Do not use unless confirmed on a live own-site fetch.
2. DAK Drilling & Well Service: phone-only on own site; no email published anywhere found in this round.
3. Animas Well Drilling email (info@animaswelldrilling.com) and Shelton Drilling email (wsdi@rof.net) are both verbatim on live-fetched own-site pages, clean to use.
4. Beeman Brothers Drilling: confirm the hijack is not a transient redirect before permanently excluding the domain.

## Enum check
All rows use legal enums: priority WARM/WATCH, opportunity_confidence high/medium/low, ai_discoverability strong/moderate/weak/unknown, stack grades CONFIRMED/STRONG INDICATION/WEAK INDICATION/UNKNOWN, suppression_state=eligible, next_eligible_action=draft outreach, source=research-round67, new_filing_signal empty, conversion fields empty.
