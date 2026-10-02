# New-business radar research, step 3: 2026-09-26 19:21 run

Lane: PING Social discovery-research, new-business radar (step 3).
No outreach performed. No drafts written. No canonical files modified.

## Method

Authoritative newness source: official Colorado business-entity Socrata dataset, dataset ID 4ykn-tg5h (https://data.colorado.gov/resource/4ykn-tg5h.json).
Queried on 2026-09-26 for approved-town principal addresses with formation dates from 2026-06-28 through 2026-09-26.
Returned 1,180 rows. A trade-name filter identified 126 possible home-service trade names as a discovery filter only.

Mirrors (OpenGovCO, OpenCorpData, SpotOnColorado, Bizapedia) were used for corroboration only, never as sole newness evidence.

## Staged candidates

ZERO. No business satisfied both an authoritative SOS formation date in the window and a verified owned website or Facebook Page publishing contact information.

## Researched names with SOS evidence (all excluded)

| Business | Town | SOS formation date | SOS entity ID | Outcome |
|---|---|---|---|---|
| This Guy Home Service LLC | Fruita | 2026-09-24 | 20268187119 | No owned local web/Facebook presence found |
| Bruce Construction LLC | Carbondale | 2026-09-24 | 20268195738 | No owned local web/Facebook presence found |
| Gonzalez Siding LLC | Rifle | 2026-09-24 | 20268197354 | No owned local web/Facebook presence found |
| T & L Complete Cleaning Solutions LLC | Grand Junction | 2026-09-24 | 20268194070 | No owned local web/Facebook presence found |
| Kokopelli Lawn Company LLC | Grand Junction | 2026-09-20 | 20268161856 | No owned local web/Facebook presence found |
| Iron Horse Heating Cooling and Plumbing LLC | Montrose | 2026-08-20 | 20268037761 | Matching named site found, but it is a California company, not the Montrose entity |
| Coyote Electric and Home Services LLC | Grand Junction | 2026-08-07 | 20261968845 | No owned local web/Facebook presence found |
| Blue Sage Roofing LLC | Palisade | 2026-07-21 | 20261874550 | No owned local web/Facebook presence found |
| Powerz Roofing LLC | Rifle | 2026-07-18 | 20261866343 | No owned local web/Facebook presence found |
| MC Carpentry LLC | Rifle | 2026-07-11 | 20261845943 | No owned local web/Facebook presence found |
| JAST Carpentry LLC | Rifle | 2026-07-10 | 20261844753 | No owned local web/Facebook presence found |
| L + L Construction LLC | Carbondale | 2026-07-09 | 20261840937 | Only unrelated businesses under that name found |
| Pappa G's Woodshed & Dirt Works LLC | Clifton | 2026-07-07 | 20261832677 | No owned local web/Facebook presence found |
| Jhef Construction LLC | Clifton | 2026-07-03 | 20261825162 | No owned local web/Facebook presence found |
| Hillside Home Repair LLC | Grand Junction | 2026-07-02 | 20261822776 | No owned local web/Facebook presence found |
| Patterson's Clean Living LLC | Delta | 2026-07-02 | 20261823565 | No owned local web/Facebook presence found |
| Los Carnales Drywall LLC | Grand Junction | 2026-06-29 | 20261802975 | No owned local web/Facebook presence found |
| Loghill Electric LLC | Montrose | 2026-06-28 | 20261798015 | No owned local web/Facebook presence found |
| Captain Ron Handyman L.L.C. | Grand Junction | 2026-07-14 | 20261853316 | Already a pipeline NEW prospect (round-52, filing-only WATCH); also no owned contact presence |

## Exclusion reasons beyond absent owned presence

Existing out-of-area business, not a new local service business:
- Assemblage Works Ltd. (Carbondale, formed 2026-06-29, ID 20261803025): matching owned website belongs to an established Portland, Oregon architecture studio.

Contradicted newness:
- High Desert Decor Painting & Flooring (formed 2026-07-07): its own public material claims more than ten years in business.

Continuation/rename risk, fail closed:
- The High Desert Handyman LLC (Grand Junction, formed 2026-08-10): a "High Desert Handyman Services" trade name by the same local operator existed in Grand Junction since 2022-01-27. Treated as a likely rename/continuation, not a new independent business.
- Twiztedcreationz (Clifton): matching owned website is an automotive customization business in Wortham, Texas, not the Clifton entity and not an eligible trade.

No matching owned local presence, additional names searched and excluded:
Arbor Pro Tree Experts (Montrose), Chase's Home Solutions, Walleye Window Washing (Grand Junction), Blue Truck Gutter Cleaning (Fruita), Grand Valley Pickup Junk Removal (Grand Junction), Shaka Tree Care (Montrose), Cutting Edge Tree and Landscaping, Charlys Omni Services, Family Legacy Mechanical Services, Nexus Mechanical, ORHA Construction, Brotherhood Landscapes, G Money Finishes, Summit Site Services, Control Forge, Red Oak Excavation, Vertex Building Group, Diamond Building Group, Bautista Carpentry, Glacier Peak Group (Carbondale).

## Dedupe checks

Required surfaces checked on 2026-09-26 for every researched name:
- python3 ~/workspace/outreach/check-prospect-collision.py (required collision script)
- ~/workspace/outreach/leads.md
- ~/workspace/outreach/pipeline.md
- ~/workspace/goals/ping-social-outreach-campaign/hidden_files/discovery-2026-09-26-1321.md
- ~/workspace/goals/ping-social-outreach-campaign/hidden_files/discovery-2026-09-26-0721.md

Results:
- All researched names are clear across all four surfaces except Captain Ron Handyman L.L.C., which is already a pipeline NEW prospect (round-52, filing-only WATCH, no contact route). It is excluded as a duplicate.
- Earlier discovery work found collisions for 11 trade-name candidates that were excluded from this run: ADER Construction, BlueSky Pressure Washing, JACG Roofing, Mesa Cleaning Co., New Rise Cleaning Co., Plumb Perfect Designs, SRS Construction, Sims Family Cleaning Co., Skilled Hands Handyman Services, Telluride Drywall, Valley Landscape.
- Known pipeline collisions observed and respected: JACG Roofing LLC, Homeworx Roofing & Interior LLC, Simply Mini Splits Ltd, R & C Tree Service LLC, Western Slope Fleet Washing LLC, Blue River Epoxy Coatings LLC, Mesa Cleaning Co. LLC, A Duck Cleaner LLC, Legacy Lawns LLC, New Rise Cleaning Co LLC, Telluride Drywall LLC.

## Cap note

Active-prospect count is at the 300 cap, so no canonical prospect additions were made. pipeline.md, leads.md, and canonical prospect JSONL were not modified in this run.

## Conclusion

Zero staged candidates. The official state API provided strong newness evidence for 20+ in-window trade businesses, but none had an independently verifiable owned website or Facebook Page publishing contact information, which is a hard requirement. The defensible result is an empty stage set, recorded here for the next run.
