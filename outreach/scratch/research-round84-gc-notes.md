# Research round 84: general contractors / remodelers / home builders, Western Colorado

Date: 2026-09-18. Segment: independent, owner-operated GCs, remodelers, custom builders,
design-build firms, kitchen/bath renovators. No franchises or chains. No Denver or Front Range.

Geography covered: Roaring Fork Valley (Glenwood Springs, Rifle, Carbondale, Aspen, Basalt),
Southwest corner (Durango, Cortez, Pagosa Springs), plus Bayfield and Silt.

## Result: 6 qualified records (target was 8-12; honest shortfall, see constraints)

All 6 were checked against dedup-names-round84.txt (748 names) with no matches, including
fuzzy/DBA variants. Every email or form below was verified in live fetched own-site text;
indexed snippets alone were never accepted.

| # | Business | City | Route verified live on own site | Email |
|---|----------|------|---------------------------------|-------|
| 1 | McSwain Builders | Aspen | contact form + published email (privacy policy page) | team@mcswainbuilders.com |
| 2 | Elevation Custom Builders | Durango | published email + phone (contact page) | info@elevationcustombuilders.com |
| 3 | Altitude Renovation | Durango | published email + phone + estimate form (footer) | Luke@altituderenovation.com |
| 4 | Franklin Remodeling LLC | Carbondale | genuine consultation intake form (homepage) | none published |
| 5 | Down Valley Design Center | Rifle | genuine free-consultation form (homepage) | none published |
| 6 | Top Drawer Construction | Durango | project intake section (homepage) | none published |

Standouts:
- McSwain Builders is the strongest record: independent design-build firm, custom homes plus
  full-home remodeling and kitchens/baths across the Roaring Fork Valley, 500+ projects claimed,
  owner Frank McSwain promises personal follow-up, and the site runs Buildertrend (KNOWN stack
  signal). Email and phone both live-verified. Pitch angle: intake, scheduling, and client-update
  automation across active jobs; missed-call capture for a busy owner.
- Elevation Custom Builders (Durango) is the cleanest email route: info@elevationcustombuilders.com
  published on its own contact page alongside 970.335.9380. Design-build with in-house designers.
- Altitude Renovation (Durango) is a locally owned bath/kitchen remodeler with a published email
  and an estimate-request flow, a classic PING fit (estimate follow-up, missed calls).
- Franklin Remodeling LLC (Carbondale) qualifies on its genuine consultation form; Squarespace
  site, full-service GC since 2021 per own site and CO entity mirror.

## Why only 6: verification constraints this round

- Own-site email verification is mandatory and several real, relevant businesses publish no
  email and expose no form in fetchable text (DM Neuman, Aspen Built, Durango Remodeling,
  Asher Custom Homes, Ponderosa Builders, Kaegebein, Divide Creek Builders, Stewart Custom
  Builders, Brown Mountain Builders, Home Run Construction and Design).
- Several own-site fetches failed outright this round (Biohab Builders, Skywalker Construction,
  Clover Street Construction, Custom Touch Builders returned empty), and each failure ended
  browser fetching for that pass, which limited how many candidates could be checked.
- I preferred an honest shortfall over relaxing the live-verification rule.

## Near-misses (real businesses, own sites, but no live-verifiable email or qualifying form)

- DM Neuman Construction, Glenwood Springs (dmneuman.com): residential custom homes,
  renovations, commercial remodels/new construction, Roaring Fork Valley. Fetched homepage
  shows no email, contact link, or form. Phone (970) 945-7502 from place data.
- Aspen Built Inc., Carbondale (aspenbuilt.net): residential/commercial construction, custom
  homes, remodels, design-build, ADUs, Aspen to Rifle. No email or form in fetched text.
  Owner Abdi Pirzadeh and (970) 618-3555 from search evidence only.
- Durango Remodeling LLC, Durango (durangoremodel.com): 20+ years, 300+ residential remodels,
  whole-home/kitchen/bath. No email or form in fetched homepage text. (970) 340-0860.
- Crawford Design Build, Carbondale (crawforddesignbuildllc.com): custom luxury homes,
  Aspen/Roaring Fork. JS-heavy site returned almost no text. (970) 618-0480.
- Kaegebein Fine Homebuilding, Carbondale (kfhomebuilding.com): custom homes, Roaring Fork
  Valley; partners Nathan Kaegebein and Scott McClung. Contact page shows addresses only;
  footer email office@kfhomebuilding.com appears in the search index but could not be
  live-verified in fetched text. Note: large operation ($50M+/yr claimed), weaker fit for
  smallest-shop-first targeting.
- Divide Creek Builders, Carbondale (dividecreekbuilders.com): custom homes since 1996
  (Dean Filiss, now Max Filiss). No email or form in fetched text; also a larger
  prestigious-scale builder.
- Stewart Custom Builders, Basalt (stewartcustombuilders.com): GC + HOA management, 35+
  years, Roaring Fork Valley. No email/form in fetched homepage text.
- Brown Mountain Builders, Pagosa Springs (brownmountainbuilders.com): family GC,
  established in Colorado in 2024 (newer business). Squarespace site; no email/form in
  fetched homepage text. Worth re-checking its contact page in a later round.
- Asher Custom Homes, Durango (ashercustomhomes.com): luxury custom homes, 25+ years.
  Phone (970) 259-0195 on site; no email or form visible.
- Ponderosa Builders, Durango (ponderosabuildersdurango.com): custom homes, renovations,
  remodels, kitchens, baths; founded by Michael Hale, 28 years in Durango. No email/form
  in fetched text.
- Home Run Construction and Design, Bayfield (homerunconstructionanddesign.com): outdoor
  living design-build (decks, pergolas, outdoor kitchens), founder Anthony Hotter,
  (970) 507-1984. Segment is outdoor-living specialist rather than core GC/remodel, and no
  email/form verified.
- Custom Touch Builders, Durango (customtouchbuilders.com): custom homes, Russ Turpin,
  40+ years. Homepage fetch returned no text (JS-heavy); could not verify contact route.
- Biohab Builders, Durango (biohab.com): green custom homes/design-build. Own-site fetch
  failed; only a third-party old PDF exposed biohab@gobrainstorm.net, which does not meet
  the live-verification rule.
- Skywalker Construction, Durango (skywalkerconstruction.com): own-site fetch failed.
- Clover Street Construction, Cortez (cloverstreetconstruction.com): new builds, remodels,
  welding, tile. Own-site fetch failed. Phones conflict between (970) 508-0830 and
  (970) 814-9154.

## Exclusions

- Hurst Construction, Cortez: its domain now serves a generic "Home Improvement Specialist
  Network" lead-broker template, not the real business. Excluded as compromised/hijacked
  web presence.
- Grand River Construction, Glenwood Springs: asphalt/paving/road contractor (CDOT work),
  civil/infrastructure first, not residential GC/remodel.
- Hart Construction, Pagosa Springs: commercial-first (commercial buildings, snow removal,
  excavation, trucking), describes itself as the largest construction company in Archuleta
  County; not the small owner-operated remodel target.
- Four Seasons Sunrooms: franchise/national brand. Haselden Construction and RA Nelson:
  larger multi-location/regional firms. Builder FirstSource: national chain.
  Community Builders: nonprofit, not a contractor. Candelaria Construction (Cortez):
  civil/aggregate/hauling-first.

## Other candidates surfaced but not yet verified (for future rounds)

Durango area: JT Builders Inc. (BBB A+, custom homes, (970) 769-1029, not in dedup),
Mantell-Hecathorn Builders / hbuilders.com (Cortez, energy-efficient custom),
HTI Builders (Pagosa, htibuilders.com, (970) 946-1186), Durango Custom Works LLC
(37 Sierra Ave, (970) 382-7654), Premier Homes of Durango, Custom Homes by Vernon Leslie
(Pagosa, vlcustomhomes.com), Alternative Home Builders (Pagosa, ahbpagosa.com),
Our Home Pagosa, Dandee Contractors, Tim Brown Custom Homes (Pagosa, directory only),
GAP Construction (Rifle, family-owned since 2004), Escalante Builders (Rifle area),
Renninger Log Homes (Silt/Rifle/Meeker/Craig).
Roaring Fork: Diemoz Construction (Glenwood, diemoz.net), High Country Building Group
(Glenwood), Key Elements Construction (Carbondale), DCA Construction (Carbondale),
Maley Building Corporation (Basalt), Independence Construction Group (Basalt),
GM Johnson Construction (Basalt), Showcase Custom Homes (Carbondale), LC Construction
(Glenwood), Cruzan Construction (Cortez), Bulldog Construction, ANAM Construction,
First Cut, BWD Construction, Hillside Designs, Spruce Mountain, IB Construction,
JT Builders, Ramos Construction. None matched the dedup file.

## New-business radar

No verified new filings this round. Brown Mountain Builders (Pagosa Springs) states
"Established in Colorado in 2024" on its own site, but no Colorado SOS filing date was
independently verified, so no new_filing_signal was set. No SOS-sourced dates were used.

## Files

- /home/hatch/workspace/outreach/scratch/research-round84-gc-raw.jsonl (6 records, key
  order validated)
- /home/hatch/workspace/outreach/scratch/research-round84-gc-notes.md (this file)
