# Round-32 pressure washing / exterior cleaning research scratch (2026-09-12)

Segment: Pressure Washing / Exterior Cleaning, Western Colorado.
Type: research only. No emails sent, no forms submitted, no canonical JSONL edits.

## Towns covered

Grand Junction, Fruita, Palisade, Clifton, Montrose, Delta, Gunnison, Durango,
Cortez, Pagosa Springs, Glenwood Springs, Rifle, Carbondale, Aspen, Steamboat
Springs, Craig, Meeker. Incidental coverage: Silt, Basalt, Parachute, Eagle.

## Final qualified candidate count: 2

The strict own-site rule (real business-owned website AND own-site email in
rendered page text OR a rendered working contact form, both verified via
browser_open) filtered out almost everything. Two candidates qualified:

1. Grime Fighters, Grand Junction. Own-site contact form verified on the
   business contact page. Phone (970) 902-0119. Serves Grand Junction, Fruita,
   Palisade. Bin cleaning and pressure washing. WARM.
2. Pro Mobile Wash, Durango. Own-site email chris@promobilewash.com and phone
   970-403-2085 verified on the business contact page. Fleet washing core
   business, plus residential and commercial. WARM.

Both are already written to
~/workspace/outreach/jsonl-additions-round32-pressurewash.jsonl (2 lines,
30 fields, validated).

## Skip patterns with named examples

- Directory or lead-marketplace listings only, no business-owned site found:
  High Pressure Specialties (Fruita), BB Master Blasters (Montrose),
  LZM Pressure Washing (Cortez), Dirty Jerry's Pressure Washing Service
  (Glenwood Springs), Aspen Pressure Washing LLC (Angi/HomeAdvisor only).
- National or city-template lead-generation pages, not local businesses:
  Show Me Pressure Washing, Slideoo, Buzz Fence Pressure Washing, Ezer Design,
  Sprayfirst Pressure Washing (Pagosa Springs template), A&T Pressure Cleaning
  (Steamboat Springs template), H2O Pressure Washing Inc (template subdomain).
- Dedup exclusions, even where qualifying-looking: Alpine Pressure
  (alpinepressure.com, Roaring Fork Valley), Elevation Wash Services (Montrose),
  The Wash Squad (Grand Junction subsite), Simmons Pressure Washing (Parachute).
- Own site verified but phone-only, no email and no rendered form in fetched
  text: Rocky Mountain Sweeping (Grand Junction), Summit Sweeping & Asphalt
  Maintenance (Silt), Colorado Powerwash and Seal (Eagle, also a stone
  sealing specialty, marginal segment fit).
- Franchise or multi-city chain feel: Sparkling and Beyond (Steamboat Springs
  and Pagosa Springs city pages, 239 Florida area code).
- Adjacent trade, pressure washing not the business: Pristine View Cleaners
  (Pagosa Springs, window cleaning), WBS Coatings (Cortez, industrial
  oil-and-gas painting and coating).
- Non-local HQ despite regional listings: Ultimate Powerwashing LLC
  (Commerce City / Denver metro, phone 702-300-3132), Colorado Pro Wash
  (Denver), Tendit Group (multi-state).
- Fetch failure on an own-domain candidate: durangopressurewash.com and
  wishywashyco.com both failed browser_open on 2026-09-12; retry next round.

## Seasonal timing notes

- Fall house washing before winter: homeowners want siding, decks, and
  driveways cleaned before freeze and snow arrive. Good seasonal hook for
  Grime Fighters residential angle.
- Commercial holiday preparation: storefronts, sidewalks, and parking areas
  get cleaned ahead of holiday foot traffic. Fits Pro Mobile Wash commercial
  and fleet washing, and Summit Sweeping commercial accounts if verified later.
- Spring pollen season: pollen coats siding and outdoor surfaces, creating a
  natural re-engagement reason for recurring services like bin cleaning and
  fleet washing.

## Near-misses for later verification

1. Wishy Washy, Grand Junction (wishywashyco.com). Local pressure washing
   business, own site, phone +19704324207 in search text. Site fetch failed
   2026-09-12. Retry contact page for email or form.
2. Durango Pressure Wash (durangopressurewash.com). Own domain, Durango
   pressure washing business. Fetch failed 2026-09-12. Do not retry this
   turn; retry next round.
3. Rocky Mountain Sweeping, Grand Junction (rockymtnsweeping.com). Own site,
   commercial pressure washing, recurring service, phone 970-260-5118.
   No own-site email or rendered form observed. Recheck for a contact page.
4. Summit Sweeping & Asphalt Maintenance, Silt (summitsweepingasphalt.com).
   Own site, owners Derek and Traci Vondette, phone (970) 876-1914, Garfield
   County and surrounding service. No own-site email or rendered form
   observed. Recheck for a contact page.
5. Mighty Bins Cleaning, Durango service area. Own-site Durango page verified;
   phone (505) 592-1392; page says customers can reach the company through
   its website, but no form rendered in fetched text. Recheck contact flow.
6. Colorado Powerwash and Seal, Eagle (copowerwashandseal.com). Own site,
   BBB A+, pressure washing listed, address 20 Sunset Ct, Eagle, CO 81631.
   Stone cleaning and sealing specialty; no email observed. Marginal segment
   fit, revisit only if pressure washing is their active pitch.
