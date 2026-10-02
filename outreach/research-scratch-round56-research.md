# Round 56 research notes (2026-09-14)

## Task
Research two genuinely new Western Colorado trade segments and deliver 15 to 25 verified, deduplicated candidates for the PING Social outreach engine.

## Segments chosen
1. **Mobile mechanics / independent auto repair** (Western Colorado)
2. **Mobile auto glass** (Western Colorado)

Both are genuinely new to the campaign. Prior rounds covered locksmiths (rounds 26, 32), pool/spa (round 15), masonry (round 36), plus concrete, roofing, deck work, and builders. Generator service was investigated in round 47 and found too thin, so it was excluded. Barn/agricultural buildings was considered as a second segment but the independent Western Colorado pool looked thin, so mobile auto glass was chosen instead.

## Timing
Research conducted 2026-09-14 into early 2026-09-15 UTC. Dedup checks run against leads.md, pipeline.md, and western-co-prospects.jsonl (305 lines at check time, above the stated 300-row cap).

## Final qualifier count: 6 (honest under-count)
Target was 15 to 25. The pool of independent Western Colorado mobile mechanics and mobile auto glass shops with an own website publishing an email address or a working contact form proved genuinely thin. Six passed every gate; the rest failed on the own-site contact-route rule. No candidates were forced.

## Qualifiers
1. A Duck Mobile Mechanics LLC, Grand Junction. aduckmobile.com. Own-site contact form with name and email fields. Phone (970) 234-5169. HOT. Extremely sparse site, very non-technical owner profile.
2. Grand Junction Mobile Mechanic / DBA Mobile Wrench LLC, Grand Junction. gjmobilemechanic.com. Own-site free-quote form (first name, last name, email, phone). Phone (970) 644-0918. Advertises 24/7. HOT. Services: automotive repair, heavy-duty diesel, hydraulics, farm equipment, transmission, diagnostics, brakes, preventative maintenance.
3. A-Wiser Auto Glass, Grand Junction. awiserautoglass.com. Own-site contact page publishes awiserautoglass@yahoo.com and a contact form. Phone (970) 778-5055. WARM. Local family-owned; free mobile service to the Grand Junction area; 5.0 with 46 reviews on Birdeye observed 2026-09-14.
4. Easy Glass, Grand Junction. gjeasyglass.com. Own-site contact page publishes easyglassri@gmail.com. Phone (970) 200-5646. No form observed. HOT. 100 percent mobile, claims 24/7 mobile scheduling. Service area: Grand Junction, Fruita, Redlands, Orchard Mesa, Clifton, Palisade, Mesa County and the wider Western Slope (Rifle to Montrose).
5. Windshields Express, Grand Junction. grandjunctionautoglass.com. Own-site contact page publishes windshieldsexpress@yahoo.com. Phone (970) 243-2201. No form; the business explicitly rejects forms in favor of phone calls ("rather than sending you through page after page of cold lifeless forms, we want you to call us"). WARM. Family owned by Andy and Camille Nack, founded 1997. Mobile plus in-shop; huge Western Slope service list (30 plus towns). Legacy WordPress (index.php URLs, strong indication).
6. Driven Diagnostics, Grand Junction. drivendiagnostics.com. Own site publishes info@drivendiagnostics.com and references an online contact form. Phone (970) 986-9927. WARM. Family-owned shop-based auto and diesel repair (not mobile, included in the auto-repair sweep). Hours Mon to Thu 7 AM to 6 PM. Note: own site lists two addresses (2872 I-70 Business Loop Unit 2A and 371 Indian Rd); address not verified.

## Near-misses (all rejected, with reasons)
- Driven Diagnostics was phone-only on first look; re-check of own-site pages confirmed email and form, so it qualified.
- Grand Junction Onsite Truck Repair (grandjunctiontruckrepair.com): own site, phone (970) 373-4657 only. No email or form. Rejected.
- Open Road Auto and Rv Repair (Montrose, Google Sites): owner Robert Kimball, weekend-only, phone/text only. No own domain. Rejected.
- T and T Mobile Mechanic (Montrose): directory listings only, no own site. Rejected.
- Cunningham Express Mobile Mechanic (Palisade, cunninghammechanic.com): own Wix site but phone (970) 783-1094 only. Rejected.
- Will's Mobile Repair and Jr Mobile Mechanics (Grand Junction): no own site found. Rejected.
- Ultra Bond (windshieldrepairgrandjunction.com, Grand Junction): own site, phone (970) 256-0200 only; no email or form observed. Also franchise-adjacent (national Ultra Bond brand). Rejected.
- Epic Auto Glass (epicglass.net, Durango): own site, 30 plus years, on-site service, phone (970) 422-8044 only. Rejected.
- Glass Masters (glassmastersdurango.com, Durango): site would not load, unverifiable. Rejected.
- Animas Glass (animasglass.com, Durango): full-service residential/commercial/auto glass, no email or form observed. Weaker trade fit. Rejected.
- Fas-Break (Durango): franchise system. Excluded per rule.
- Safelite, Glass Doctor, Glass America: chains/franchises. Excluded per rule.
- Drew's Repair LLC (Eagle County, mobile truck repair, BBB A): no own site found. Rejected.
- Top Dog Repair and Towing (Glenwood Springs area, BBB A+): no own site found. Rejected.
- Colorado Diesel Repair And Fabrication (Grand Junction, coloradodieselrepairfab.com): own site exists but would not load for verification this round; also 2.1 stars across 32 reviews on Birdeye. Left unverified; reconsider only if the site loads and the reputation picture improves.
- 23 Diesel and Offroad (Grand Junction): own site hinted (contact form mentioned in third-party FAQ) but not verified. Left unverified.
- Glass Pros Inc (Grand Junction): listed in directories, own site not confirmed. Left unverified.
- JC Mobile Tires and Services (Fruita): directory listings only. Rejected.
- Diesel Doctor (dieseldoctorco.com, Grand Junction): shop-based with a Fullbay request mechanism; phone otherwise; not a mobile mechanic. Left out of this round.

## Patterns observed
- The dominant failure mode is phone-only businesses: most small mobile mechanics and glass shops publish only a phone number, or have no own site at all. This is a strong missed-call-lead-capture signal category, but they fail the strict own-site contact-route rule.
- Yahoo and Gmail addresses are the norm for these shops (4 of 6 qualifiers), which is consistent with very non-technical owners.
- 24/7 and mobile positioning is common; missed-call risk is the primary opportunity for all 6.
- Windshields Express is an important caution: a phone-first business that explicitly dislikes forms. The B2B angle for them must be email or DM only, never a form pitch.
- Barn/agricultural buildings remains unworked and thin; generator service stays excluded per round 47 findings.

## Dedup
grep for each qualifier name and domain across leads.md, pipeline.md, and the canonical JSONL returned zero matches. All 6 are genuinely new to the campaign.

## Files
- JSONL additions: ~/workspace/outreach/jsonl-additions-round56-research.jsonl (6 rows, 33 keys, validated)
- Pipeline additions: ~/workspace/outreach/pipeline-additions-round56.md
- Canonical JSONL is at 305 lines, above the 300-row cap, so every row carries next_eligible_action HELD: canonical JSONL at 300/300 cap; pipeline.md only.
