# Segment research notes — chimney sweep / fireplace & stove (round 1721, 2026-09-24)

7 candidates, all NEW, all dedupe-clean against all four dedupe files
(dedupe-jsonl.txt, dedupe-leads.txt, dedupe-pipeline.txt, dedupe-fbdm.txt).
Checked 2026-09-24 via exact and variant name greps; zero matches.

Deliberately NOT padded to 8. The strict filters (tight geography, all
existing dedupe names, several closures, one chain-affiliated store, and
directory-only listings) reduced the usable pool to 7 solid independents.

## Segment context (general, not a claim about any single business)

Late September is pre-season for the Western Slope: first cold snaps drive
annual pre-burn-season chimney cleaning, safety inspections, stove tune-ups
and parts orders before October/November demand peaks. Businesses with
phone-only or form-only lead capture are most exposed to missed calls and
slow response during the rush. Strong angles: after-hours missed-call text
back, estimate/service-request follow-up, online scheduling for cleaning
appointments, and annual-maintenance recall lists.

## Final candidates

1. Inside and Out Fireplace & Patio (Montrose) — own-site email and phone,
   contact form, 20+ years serving the Western Slope. MISSED_CALL_LEAD_CAPTURE.
2. Woodstove Warehouse (Grand Junction) — own-site phone, contact form,
   Facebook linked from own site, locally owned since 1990 per own site.
   MISSED_CALL_LEAD_CAPTURE.
3. The Fireplace Company (Carbondale) — own-site email and phone, contact form
   with CAPTCHA; serves Carbondale and Rifle. MISSED_CALL_LEAD_CAPTURE.
4. The Fireplace Expert (Carbondale) — owner-operator Arturo Rojo per own-site
   About. Refreshed home page but old .html service pages still indexed;
   WEBSITE_REVAMP + SEO candidate.
5. Fireplace West (Grand Junction) — phone-only, dated content templates,
   repetitive manufacturer copy. WEBSITE_REVAMP + SEO candidate.
6. Colorado Fireside (Montrose) — family owned since 2000 per own site;
   Montrose + Glenwood Springs locations (local multi-location independent,
   no franchise observed). MISSED_CALL_LEAD_CAPTURE.
7. True North Hearth and Home (Montrose) — own-site phone (Montrose number)
   and email; Montrose + Glenwood Springs locations (local multi-location
   independent, no franchise observed). MISSED_CALL_LEAD_CAPTURE.

## Skipped / excluded

- InspectionFire LLC (Grand Junction): its live own site is an
  inspection-camera/software platform, not a consumer chimney-sweep service.
- Dave's Chimney and Stove Service (Montrose): own-site fetch failed; two
  listings mark it permanently closed and one 2022 review reports the owner
  passed away in winter 2021 with the company possibly closed. Excluded as
  unreconciled/closed risk.
- Flue Doctor (Montrose): directory listing only, possibly temporarily
  closed, no own site. Excluded.
- Chimney Sweep Records Ltd. (Grand Junction address): resolves to a
  Denver-oriented Santa Chimney Services domain; address mismatch. Excluded.
- Stove Depot and Chimney Works (Montrose, stovedepotcw.com): name matches
  the dedupe exclusion list (minor suffix variant "and" vs "&"). Excluded.
- Parachute Chimney Sweep Professionals: outside allowed geography, no
  qualifying own site.
- Mountain Glory Chimney Cleaners (Montrose): directory listing only, no own
  site found. Excluded.
- Alpine Stove & Fireplace LLC (Montrose): no own website found (only
  dealer-locator and directory listings). Excluded.
- High Mountain Hearth Solutions Inc (Uncompahgre): Uncompahgre is not in the
  allowed town list. Excluded on geography.
- Out-of-geography results (Glenwood Springs-only shops, Gunnison,
  Silverthorne, Frisco, Minturn, Steamboat Springs, Parachute): excluded.
- Ace/Collbran Supply: chain-affiliated hardware, not a dedicated
  fireplace-service prospect. Roaring Firewood: firewood manufacturing, not
  chimney/fireplace service.
- All remaining already-deduped names in the four dedupe files were skipped
  without re-research.

## Search coverage

Targeted searches ran across Grand Junction, Fruita, Palisade, Clifton,
Loma, Mack, De Beque, Collbran, Delta, Montrose, Rifle and Carbondale for
chimney sweep, fireplace, stove and hearth businesses. Most searches
surfaced already-deduped names, out-of-area providers, or directory-only
listings. No franchises or chains were included; independence was re-verified
at research time.

## File

- segment-round1721-chimney.jsonl — 7 lines, key order and string types
  validated programmatically 2026-09-24.
