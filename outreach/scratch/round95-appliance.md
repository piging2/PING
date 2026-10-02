# Round 95 research scratch: appliance repair, Western Colorado deep pass
Date: 2026-09-19
Worker: single research subagent. No Facebook (Pig down). Web search + browser.open.

## Scope honesty
Appliance repair: 4th WCO deep pass (rounds 9, 10, 20, 38 before this; round 77 re-touched several). Pool is thin and heavily worked. Honest yield this round: **0 new verified qualifiers** (all converting checks need a live own-site open and browser.open went terminal mid-run), **1 verification upgrade to an existing pipeline row** (Appliance Specialty Co, own site live + service-request form confirmed, with a B2B-usability caveat), **1 downgrade flag to an existing row** (Grand Valley Appliance: own domain lapsed and listed for sale), **1 clean priority re-verification** (East River Appliance), **1 Century contact-page re-check** (no verbatim email, phone own-site confirmed), and **8 genuinely new names** with own sites known but no live verification this turn (near-misses with one-link converting checks).

## Tooling caveat (2026-09-19)
browser.open worked for the first four fetches (East River, Century, Best Appliance, Appliance Specialty Co) then failed at the service level on millersapplianceservice.com; the failure is terminal for this turn, so all remaining own-site claims rest on search-indexed evidence unless marked page-verified. A rerun with healthy page fetch should convert several near-misses quickly since own domains are known.

---

## (a) PRIORITY RE-VERIFICATION: East River Appliance, Gunnison valley

- Own site: http://eastriverappliance.com/index.html (opened live 2026-09-19, page-verified)
- About (KNOWN): family owned and operated business, domestic appliance repair in the Gunnison valley; over 23 years of experience; specializes in washers, dryers, ovens, refrigerators, dishwashers; certified warranty repairs for many name brands; mainly services Crested Butte and surrounding areas, weekly service calls in Gunnison
- Contact (KNOWN): the contact section reads "Give us a call or send us an email to schedule an appointment with one of our technicians" but **no verbatim email and no phone number rendered in the fetched page text, and no form rendered**
- Email easriv@qwestoffice.net appears on visitcrestedbutte.com (tourism directory business page), NOT on the own site; does not qualify per hard rules
- Phone (970) 349-0219 directory-listed (visitcrestedbutte.com, namesandnumbers.com); NOT seen on own site
- Certifications from directory: EPA certified for refrigeration; authorized warranty service for Frigidaire, Viking, Bosch, Gaggenau, Asko, Thermador, Sub-Zero, Dacor, Fisher-Paykel, U-Line, GE, Miele, Kenmore (directory-sourced, not page-verified)
- Owner/family: family owned and operated (own-site claim); no names stated
- Stack: UNKNOWN (fetched page text carried no platform signals; simple static HTML look; no wp-content, builder, or CDN markers observed)
- Opportunity: MISSED_CALL_LEAD_CAPTURE, medium confidence (family shop, phone/email intake only, weekly out-of-town runs to Gunnison where call-backs lag)
- One-line pitch angle: a valley-known warranty-certified family shop that still takes appointments by phone and a contact page without an address; every missed call while techs are on the road goes to the next name in the valley
- Verdict: stays NEAR-MISS. Converting check: locate the own-site contact page or a mailto link rendering the verbatim email/phone. NOT in pipeline.md / leads.md / JSONL under any variant (checked 2026-09-19).

## (b) Century Appliance contact-page check (existing row, pipeline line 821)

- Contact page https://grandjunctionapplianceservices.com/contact/ opened live 2026-09-19
- Verbatim email: NOT present. The "Email Us" section renders as icon placeholders only (no mailto text), consistent with leads.md:2271
- Phone: "Call or text (970) 261-2599" CONFIRMED own-site published (matches directory metadata); this confirms the phone-route element of the row
- Own-site facts (KNOWN): family owned local business, serving the Grand Valley for over 20 years; residential plus rental-unit servicing; emergency service calls, regular maintenance; serves Clifton, Fruitvale, Glade Park, Grand Junction, Fruita, Loma, Mack, Palisade, the Redlands, White Water
- Copy-drift observation (INFERRED): own site says "over 20 years"; directory metadata says 30 years experience, opened in the Grand Valley 20 years ago. Minor, worth one-line verification when the row is worked
- Verdict: no email-route upgrade. Row stays NEW (VERIFY contact page for verbatim email before drafting). Converting check unchanged: verbatim email rendering on the contact page.

## Verification upgrades to EXISTING pipeline rows (not new rows)

### U1. Appliance Specialty Co, Montrose (pipeline NEW, WATCH reference-only, line 1169)
- Upgrade: own site https://appliancespecialtyco.com/ opened live 2026-09-19 (page-verified)
- Own-site facts (KNOWN): over 30 years of experience; appliance repair and installation, Montrose and surrounding areas; refrigerators, freezers, ovens, ranges, cooktops, dishwashers, washers, dryers, microwaves; all major brands incl. Sub-Zero, Wolf, Bosch
- Route finding: a "Request Service" form CONFIRMED on the homepage: "Fill out the form below and we'll get back to you to schedule an appointment," fields Role, Name, Phone, Email, Address, City, Zip Code, Gate Code / Access Notes, Appliance Type, Brand, Model Number, Serial Number, Problem Description
- B2B-usability caveat (per Sonny's precedent): this is a customer service-request form requiring address and appliance details; no honest B2B answer exists without a free-text message path, so it is NOT a draft-ready B2B route under current rules. No own-site email or phone observed.
- Stack: UNKNOWN (fetched text, no platform signals)
- Action: parent annotates the existing row: own site live, service-request form confirmed but customer-type; stays WATCH. The single converting check for a B2B route would be a mailto email or a contact page rendering the phone.

### U2. Grand Valley Appliance, Clifton (pipeline NEW WARM, line 1164) - DOWNGRADE FLAG
- Finding: https://grandvalleyappliance.com/ opened live 2026-09-19 and resolves to a GoDaddy domain-for-sale page ("grandvalleyappliance.com is for sale, Buy now for $750"). The own-domain evidence on the existing row is DEAD.
- The business may still operate under a new domain or directory-only; phone (970) 640-6715 remains directory-listed only
- Action: parent annotates the existing row: own site lapsed, for sale; row needs re-verification of site/phone before any contact. Do NOT add a new row.

### U3. Coyote Appliance Repair, Pagosa Springs (pipeline NEW WATCH, line 1162)
- No live open this turn (browser.open terminal). Search-indexed evidence: own site coyoterepair.com listed, 355 Coyote Dr, Pagosa Springs, phone (970) 264-3555 directory metadata; Manta profile describes it as family owned and operated, opened 2000, 2-4 employees
- Action: none this turn; live open remains the converting check.

### U4. Miller's Appliance Service, Grand Junction (pipeline NEW WARM, line 1159)
- Blocked: browser.open failed at the service level on millersapplianceservice.com; retry on the next pass. No new evidence.

---

## Qualified candidates
None this round. The strict rule (own-site published email verbatim OR own-site-verified live contact form, page-verified) was not met by any business because the live page-fetch service died mid-run. No new pipeline rows were created; nothing was written to pipeline.md, leads.md, your_files, or JSONL. This is a tooling throttle, not proof of an empty pool: 8 new names have own sites known and each needs one live open.

---

## Near-misses (each with its single converting check)

### Own domain known; one live open needed (homepage/contact page, capture verbatim email or live contact form)

1. Affordable Appliance LLC, Delta - applianceservicecolorado.com (cited on lacartes.com and namesandnumbers.com business listings as the business website). 339 Main St, Delta; family-owned since 2001; owner Ms. Ann Tillotson (BBB, A+ rating); 970-874-1062 / fax 970-874-1067 (directory); Viking appliance repair, refurbished-appliance sales, appliance parts; serves Ouray to Paonia. NEW, zero dedup hits. Check: live open of applianceservicecolorado.com homepage/contact page for verbatim email or form. Note: distinct from the pipeline-tracked Affordable Appliance Repair (Grand Junction, affordableapplianceco.com); different town, different domain, different owner.
2. RC Pro Appliance, Craig - rcproappliance.com. 1111 W Victory Way Ste 133, Craig; "dedicated to serving Craig and the surrounding counties"; 970-620-4220 directory metadata. NEW, zero dedup hits. Check: live open.
3. Au Appliance Repair LLC, Bayfield - auappliance.com. 650 Co Rd 501, Bayfield; 970-884-6170 directory metadata; Mon-Fri + Sat morning hours. NEW, zero dedup hits. Check: live open.
4. ABCD Appliance LLC, Bayfield - abcdappliancellc.com. 1731 Bayfield Pkwy, Bayfield; 970-946-9218 directory metadata. NEW, zero dedup hits. Check: live open.
5. Genesis Appliance Service Inc, Grand Junction - grandjunctionappliancerepair.com. 970-361-0733 (own-site search snippet); Disabled Veteran Owned; 10+ years; Mesa County; wine coolers, disposals, compactors, gas fireplaces/grills. WEAK INDICATION legacy website builder from search-indexed page source (publishImages, ~master~master~, tp.gif, shapes.action paths = Homestead/WebsiteBuilder-style). NEW, zero dedup hits. Check: live open.
6. Optimal Appliance Repair, Grand Junction - optimalappliance.com. 771 26 1/2 Rd, GJ; 970-462-1331 directory metadata. NEW, zero dedup hits. Check: live open.
7. Always Right Service, Grand Junction - alwaysrightservice.com. 632 Carlsbad Dr, GJ; 970-254-0600; 8am-11:30pm 7 days (unusually long hours = intake exposure). NEW, zero dedup hits. Check: live open.
8. Home Appliance Repair & Sales, Grand Junction - homeappliancegj.net. 227 S 9th St, GJ; 970-242-8338; Birdeye/MBP 1.0 from 2 reviews (undated in snippet). NEW, zero dedup hits. Check: live open.
9. Southwest Appliance, Durango - southwestapplianceinc.com. 21 Davidson Creek Rd; +19702590521 directory metadata; factory-trained techs; GE, Whirlpool, Jenn-Air, Bosch, Thermador, Sub-Zero, Wolf, BlueStar. Pipeline narrative near-miss (line 42). Check: live open of services/contact page.
10. Best Appliance Service, Montrose - bestapplsvc.com (opened live 2026-09-19, page-verified, so this check is narrower than the others). Best family, residential appliance service since the mid-70s, relocated to Montrose 1997, voted "Best in the Valley for Appliances" many years running; parts sales + service (retail closed 2012); in-home repair in Montrose, Olathe, Ridgway, Ouray. CURRENT NEWS on own site: "currently scheduling service calls approximately 2-3 weeks out in the Montrose / Olathe area (1-3 weeks generally in the Ridgway / Ouray area)... We are running as fast as we can with the resources we have available" = strong missed-revenue signal. No email or form rendered on the homepage; phone (970) 240-9798 directory-only. Check: a contact page or footer render showing the verbatim email or phone (homepage itself was fully fetched and has none).

### No own site located; check is locate a live own site publishing contact info

11. Expert Appliance Repair, Craig - locally owned by Phil Vallem, factory authorized servicer, (970) 326-7305 directory-only (namesandnumbers). NEW, zero dedup hits.
12. MD Appliance & Refrigeration, Craig - refrigerators and freezers, (970) 276-3420 directory-only. NEW, zero dedup hits.
13. Alpine Appliance and Refrigeration, Steamboat Springs - 2567 Riverside Dr, +19708797979, meta.ai place listing only. NEW, zero dedup hits. Distinct from pipeline-tracked Alpine Appliance (Pagosa Springs, alpineappliancepagosa.com); note for the parent if both get worked.
14. Swayze Farms, Ignacio - 645 Co Rd 515, +19709462672, meta.ai place listing only with appliance repair service as primary category. NEW, zero dedup hits. Thin; verify trade fit as well as contact (name suggests farm-primary).
15. Mark's Appliance Repair, Rifle - 101 East Ave, in-home service, mapquest listing only. NEW, zero dedup hits.
16. Marks Home Appliance Repairs, Basalt - (970) 625-0938 directory-only. NEW, zero dedup hits.
17. Mountain Valley Appliance, Silt - (970) 876-5559, Birdeye 3.0 / 38 reviews, directory-only. NEW, zero dedup hits.
18. Roaring Fork Appliance Repair, Aspen - (970) 319-5599, directory-only. NEW, zero dedup hits. Near-variant of round-77 near-miss "Roaring Fork Appliance and Home Repair, Carbondale" (localsearch template only); treat as distinct listing unless proven same.
19. Aspen To Vail Appliance Services, Carbondale/Aspen - meta.ai place listing only, +19709632146. Round-77 near-miss, re-observed; still no own site.

---

## Dedup discards (already pipeline-tracked; verified again this round, NOT re-added)
- San Miguel Appliance, Telluride (sanmiguelappliance.com, locally owned, factory authorized JennAir/GE/Whirlpool/KitchenAid/Maytag): pipeline.md NEW (draft-eligible) line 1994.
- Sopris Appliance Repair, Carbondale (493 N 8th St, (970) 948-9321 directory): pipeline.md NEW WATCH line 2004.
- Durango Appliance / Advanced Appliance Repair LLC / AAA Appliance Repair Of Durango (158 Bodo Dr #B; second listing 1224 Co Rd 307 points at same domain durangoadvancedappliancerepair.com): pipeline.md NEW WATCH line 1165 (identity fragmentation already the noted angle).
- Appliance Specialty Co, Montrose: pipeline.md NEW WATCH line 1169; upgrade U1 above.
- D & C Services, Montrose (62715 Jig Rd, (970) 249-7460 directory): pipeline.md NEW WATCH line 2002.
- Deti Repair Service, Montrose (commercial restaurant equipment, (970) 249-9579 directory): pipeline.md NEW WATCH line 2001.
- Affordable Appliance Repair, Grand Junction (affordableapplianceco.com, (970) 434-8496): pipeline.md NEW WATCH line 1166. Distinct from near-miss #1 (Delta).
- Alpine Appliance, Pagosa Springs (alpineappliancepagosa.com, 970-731-0857): pipeline.md NEW line 1997. Distinct from near-miss #13 (Steamboat).
- Coyote Appliance Repair, Pagosa Springs: pipeline.md NEW WATCH line 1162; upgrade note U3 above.
- Bob's Place Reconditioned Appliances, Cortez (bobsplacereconditionedappliances.com, (970) 564-5959): round-38 pipeline row; BBB A+ re-observed this round.
- Vista Appliance Repair, Durango: round-38 pipeline row.
- Miller's Appliance Service, Grand Junction: round-38 pipeline row; upgrade U4 blocked.
- Grand Valley Appliance, Clifton: round-38 pipeline row; downgrade flag U2 above.
- Sonny's Appliance Repair and Sales, Cortez: prior-art SKIPPED (Formstack form requires street address, no honest B2B answer); not re-added.
- Western Slope Appliance, Montrose: prior-art SKIPPED (PerimeterX bot challenge); not re-added.
- Western Slope Appliance note: search-indexed services page shows Request Service / Call Now / Email Us links, but the site remains behind the press-and-hold challenge; not re-opened.
- The Appliance Doctor, Grand Junction: prior-art SKIPPED (customer-only scheduling form); not re-added.
- East River Appliance: leads.md near-miss (line 2134) + pipeline ecosystem note (line 59); re-verified this round, still near-miss.

## Skips with reasons
- Sears Home Services (Montrose, Durango, Cortez, Craig, GJ, Pagosa listings): franchise, excluded by standing rule.
- Fix Appliance Repair (Durango, Cortez, Rifle, Pagosa location pages on fixtappliancerepair.com): national SEO lead-broker template, excluded.
- Bro's Handyman Service (Durango, Rifle): handyman-primary, 855 lead-gen number, excluded.
- SEO/lead-gen templates: appliance-repair.us, appliancerepairnearme.cc, corkd.com, popuprepair.com, repair-appliances.com, vierascheibner.com, findusnow.com, allappliancepro.com. Excluded.
- Neli Virtual Appliance Repair: remote-only virtual service, not a WCO local shop, excluded.
- American Home Shield: national home-warranty company, excluded.
- The Fireplace Company, Carbondale (thefpco.com): hearth/fireplace sales and service, not major appliance, excluded (trade mismatch).
- Bishop Air Colorado, Dolores/Cortez: HVAC primary, commercial refrigeration secondary, excluded (trade mismatch).
- Chuck's Expert Services, Pagosa: HVAC primary, excluded (trade mismatch).
- CKR-Mechanical, Telluride: HVAC primary (prior art round 77), excluded.
- All Temp Services Inc, GJ: HVAC/commercial refrigeration primary, excluded (trade mismatch).
- A1 Dryer Vent Cleaning, GJ: dryer-vent specialty only, not major appliance, excluded.
- Northwest Tool Repair, Craig: Hotsy pressure-washer dealer, trade mismatch, excluded.
- V and L Appliance Services, GJ (u77s.top business-listing link, (833) 904-1488): thin directory-level entry on a listing host, no own site, excluded (directory-only).
- Columbia Appliance Repair (Telluride meta.ai listing, 855 number): lead-broker, excluded (prior art round 77).

---

## Ecosystem notes: appliance repair, Western Colorado
- Market shape: the WCO appliance trade is dominated by dealer-service hybrids (Tri-River Montrose, Western Slope Appliance Montrose, Alpine Pagosa, Southwest Appliance Durango) and phone-only family shops; the strict own-site rule keeps yield low, consistent with the 2026-09-09 yield note. Best Appliance Service's public "2-3 weeks out" scheduling note is the clearest missed-revenue signal in the segment.
- Coyote Appliance Repair (pipeline WATCH): a Manta profile review (dated "Jul 26", updated "Sep 04", years unknown) reads "One week of no returned phone calls... Zero communication with the property manager. Ditto with the owner." Undated = NOT a review trigger, but it corroborates the existing MISSED_CALL_LEAD_CAPTURE angle for that row with direct customer language.
- Grand Valley Appliance: own domain lapsed and for sale ($750 on GoDaddy). Watch for this pattern across 2026-09-13 own-site-verified rows; a quick domain-health sweep of the round-38 batch would be cheap insurance (U2).
- Bayfield produced two unworked names with own sites (Au, ABCD) and GJ four (Genesis, Optimal, Always Right, Home Appliance Repair & Sales); Delta one (Affordable Appliance LLC). Gunnison/Crested Butte remains thin beyond East River / Black Bear / PK's.
- Towns covered this pass: Montrose, Delta, Cedaredge/Paonia/Hotchkiss (search), Durango, Cortez/Mancos/Dolores, Steamboat Springs/Craig, Rifle/Silt/Carbondale/Basalt, Telluride/Ouray/Ridgway/Norwood, Pagosa Springs/Bayfield/Ignacio, Fruita/Palisade/Grand Junction, Gunnison/Crested Butte (re-verification). Gaps for a future pass: Meeker, New Castle, Parachute, Snowmass Village, Glenwood Springs, Ouray town-proper, Naturita/Nucla.
- The Appliance Doctor (GJ) domain appliancedrgj.com appeared in search metadata with a different phone (+19707731000) than the prior-art row; no action taken, noted for the row owner.

## Review baselines
None required this round: zero NEW qualifiers were added (all candidates are near-misses pending live own-site opens), so no review checks were triggered. For the parent's future use, passing observations: Affordable Appliance LLC (Delta) shows loc8nearme 4.8/90 with June 2026 and April 2026 dated positive reviews (pre-window, no trigger); Home Appliance Repair & Sales (GJ) shows 1.0 from 2 reviews (undated in snippet); Best Appliance Service YP reviews date to 2023 (Randy, pre-window). No reviewer identities recorded.
