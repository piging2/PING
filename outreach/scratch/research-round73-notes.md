# Research notes, round 73 (2026-09-17)

Segments: (Job 1) re-verification of 8 round-72 tile/stone near-misses against live own-site contact pages; (Job 2A) chimney, fireplace, and stove services in Durango, Cortez, Pagosa Springs, Bayfield, Mancos; (Job 2B) residential garage-door sales, service, and repair in the same five towns.

## Honest verdict: 0 qualified. 14 parked WATCH rows written. 0 drafts.

Two structural reasons, documented below:

1. The strict own-site contact bar: qualification requires the exact email readable on the live site or a live-verified acceptable contact route. Indexed-only own-site evidence is WATCH, never draft-eligible. No candidate produced a live-verified route this run.
2. Live page fetching was terminally blocked mid-run: the fetch of https://rubentilestone.com/contact/ failed, and the run instruction made that failure terminal for this turn (no retries, no workarounds via exec/curl/invented endpoints). Every near-miss therefore parks with its exact re-verification target instead of a qualified row.

Output files: [research-round73.jsonl](sandbox://workspace/outreach/scratch/research-round73.jsonl) (14 rows, all 33 canonical fields in exact order, validated programmatically), builder script at [build-round73.py](sandbox://workspace/outreach/scratch/build-round73.py). NOT merged into pipeline.md or canonical JSONL; parent merges.

## Counts by segment

| Segment | Qualified | Parked (rows) | Excluded |
|---|---|---|---|
| Job 1 tile/stone near-misses (re-verify) | 0 | 8 | 0 |
| A: chimney/fireplace/stove | 0 | 3 | 6 |
| B: garage doors | 0 | 3 | 5 |
| Total | 0 | 14 | 11 |

## Job 1: the 8 near-miss outcomes (all parked, none re-verified)

1. **TileCare Innovations, New Castle.** PARKED. Live homepage fetched 2026-09-17 (http://tilecareinnovations.com/): tile/grout restoration, concrete and flagstone cleaning/sealing, commercial pressure washing, property-management clientele, monthly/yearly maintenance programs, family owned since 2010. CONFIRMED GoDaddy builder (img1.wsimg.com). No email, phone, or form rendered on the homepage. Directory-only phone (970) 984-2125 and owner Brian Harris are third-party, not own-site evidence. Re-verification target: live-fetch the site's contact page (homepage fetch worked; /contact failed this run) and look for a site-published email or form.
2. **Ruben Tile Stone, Carbondale.** PARKED. Own contact page indexed (https://rubentilestone.com/contact/); NAP 0171 CO-133, Carbondale and (970) 596-6680 are directory-sourced. The live contact fetch failed terminally this run. Re-verification target: live-fetch the contact page and homepage; look for site-published email/phone/form.
3. **American Tile and Marble, New Castle.** PARKED. Live homepage fetched 2026-09-17: Dustin Allison, serving Vail and Roaring Fork valleys since 1994, tile installation and remodeling. No email or form rendered. Re-verification target: live-fetch the contact page; render check plus email/form search.
4. **Marble Stone & Tile Restoration, Glenwood Springs.** PARKED (no own site). Directory listings only; phone (970) 618-5403 directory-sourced. Specialty: marble, terrazzo, granite, tile/grout, resurfacing, refinishing, sealer application, acrylic removal. Re-verification target: search for an own site; if none, it is phone-only and below the email bar.
5. **SteamMaster Stone Care Division, Glenwood Springs.** PARKED (dedup ambiguity). Directory phone (970) 925-2968. Pipeline already has SteamMaster Restoration and Cleaning (Minturn, steammaster.com, WARM); Glenwood also shows a separate SteamMaster Restoration & Cleaning LLC with (970) 827-5555 / (970) 453-2342. Do not create a duplicate row. Re-verification target: confirm from steammaster.com's own live site whether Stone Care is the same company/division and whether a distinct contact route exists.
6. **Everlast Tile Company, Carbondale.** PARKED (no own site). HomeAdvisor-only; in business since 2000; remodel/flooring specialist. Re-verification target: search for an own site.
7. **Williams Wall to Wall Cleaning Restoration & Maintenance, Glenwood Springs.** PARKED (no own site, marginal fit). Directory phone (970) 945-9472; president Tom Williams per directory. Tile/stone is one line among carpet, fire/water restoration, duct cleaning. Re-verification target: search for an own site; low priority.
8. **Mr. Vac Cleaning & Restoration, Glenwood Springs.** PARKED. Own contact page indexed (https://mrvac.net/contact/) with indexed own-site content showing info@mrvac.net, (970) 928-9738, 2316 South Glen Ave; BBB A+, 4.8 stars / 43 reviews; 24-hour emergency restoration; broad Western Slope coverage. Indexed-only email is NOT draft-eligible. Re-verification target: live-fetch mrvac.net/contact/ and confirm info@mrvac.net renders on the live page. Marginal tile fit (one line among many services); low priority.

## Segment A: chimney, fireplace, stove (SW corner)

New parked rows (dedup-clean vs leads.md, pipeline.md, canonical JSONL; all indexed-only):

- **Holy Smokes Stoves and Fireplace, Pagosa Springs.** Own site holysmokespagosa.com; wood/gas/pellet sales, installation, service, chimney cleaning; 104 Goldmine Dr; phone (970) 264-4441. Reviews 4.5 / 17; one surfaced review alleged an urgent no-heat voicemail was never returned (review signal only, never a verified fact, never quote in outreach). Missed-call risk graded high on the review signal plus fall demand. Re-verification target: live-fetch the own-site contact page for an email or form.
- **Homespun Comforts, Pagosa Springs.** Hearth, home, spa, window treatments; 301 N Pagosa Blvd Unit B-6; owners Sara and Doug Anderson (directory description); phone (970) 946-4673 directory-sourced. Own site homespuncomforts.com cited in directories but not verified live. Reviews 4.5 / 23. Re-verification target: live-fetch homespuncomforts.com (homepage + contact) and verify the site is live; look for email/form.
- **San Juan Hearth and Renewables, Durango.** Own site sanjuanhearth.com; 21804 Highway 160 Unit A, Durango; owner Teague Barto (indexed content); indexed own-site content publishes info@sanjuanhearth.com and 970-247-1924 (email blank in JSONL because indexed-only). Wood/gas/outdoor hearth sales, installation, service; chimney systems. Round50 dropped this as an unwritten backup, so no duplicate exists. Re-verification target: live-fetch the contact page and confirm info@sanjuanhearth.com renders; then fill the email field and draft the missed-call angle.

Pipeline dedup hits (already covered; NOT new rows; new intel recorded here):

- **Ashes Away, Durango.** Already pipeline NEW/WATCH ("no published phone or email, ashesawaydurango.com"). New third-party intel 2026-09-17: an ICC-RSF directory listing shows speck@frontier.net and (970) 375-7776; indexed own-site content confirms chimney sweep/inspection/repair/dryer-vent services across Durango, Mancos, Cortez, Bayfield, Pagosa Springs and a 4.8 / 93 review footprint. The email is directory-sourced, not own-site, so it stays non-eligible. Re-verification target: live-fetch the own-site contact page for a site-published email or form.
- **Pagosa Peak Custom Fireplaces, Pagosa Springs.** Already pipeline QUEUED (draft round50-pagosa-peak-email.md in cold FIFO). Own contact page publishes pagosapeakscf@gmail.com, (970) 264-2006, and an online contact form (indexed own-site content); certified shop, Level 1/2/3 chimney inspections, BCI Media site (aging, revamp candidate). No new row. A future live-fetch of http://www.pagosafireplaces.com/contact.html would firm up the contact route before the queued send.

Exclusions (6):

- Kick Ash Chimney Sweep, Arlie's Chimney Sweep, Aaron's Clean Sweep, Animas Chimney Sweeps, Be-Wise Chimney Sweeps: directories/BBB/Porch only, no own site established. Parked as phone-only; below the email-route bar unless an own site surfaces.
- adamchimneysweep.com Durango page: templated geographic SEO page with an Aurora address; nonlocal lead-page risk; excluded.

## Segment B: garage doors (SW corner)

New parked rows (dedup-clean; all indexed-only):

- **Adams Overhead Door, Durango.** Own site adamsohd.com; phone (970) 385-5608 (own-site indexed); 29318 Highway 160, Durango; custom shop-built doors; Clopay and LiftMaster dealer. Indexed own-site page copy states a contact form exists ("fill out a form today... our owner will be in touch"), but the form was not live-verified. Reviews 4.3 / 43 (Porch). Re-verification target: live-fetch the contact/get-in-touch page and verify the form renders.
- **Professional Garage Door, Cortez.** Own site professionalgaragedoorco.com; more than 20 years, locally owned; residential/commercial, Clopay and LiftMaster dealer; Cortez and Durango; phone (970) 565-8400. Round35 near-miss: contact page copy mentions a form but fields did not render. CAUTION: pipeline already carries a DIFFERENT business, "Professional Garage Doors" of Montrose (progaragedoors.biz, pgdtammy@gmail.com, QUEUED); do not merge them. Re-verification target: live-fetch the Cortez contact page and verify the form fields render; a still-broken form is itself the pitch.
- **DeVilbiss Garage Doors.** Own site devilbissgaragedoors.com; indexed own-site content shows devilbissgaragedoors@gmail.com, (505) 444-0216, and coverage of Cortez, Durango, Bayfield, Pagosa Springs. Parked out-of-region: round35 classified it as Farmington NM-based, outside the requested Colorado towns. Reconsider only if the SW pool thins further; live-verify the email on the own site first.

Pipeline dedup hit (already covered; NOT a new row; new intel recorded here):

- **Bearfoot Garage Doors, Pagosa Springs/Durango.** Already pipeline NEW (phone-only WATCH, round14 re-qualified). New indexed own-site intel 2026-09-17: bearfootgaragedoors.com confirms locally owned/family-operated, 35+ years, residential repair and installation, 24/7 emergency repair, same-day service, coverage of Pagosa Springs, Durango, Bayfield and nearby towns; phones (970) 251-0479 (Pagosa) and (970) 230-3839 (Durango); indexed own-site text references appointment/contact forms; strong FAQ/location-page content (AI discoverability looks strong from observable content). Re-verification target: live-fetch the own-site contact/appointment page and verify a form or email renders.

Exclusions (5):

- Precision, A1, Dave's Garage Door (national franchises/location pages): excluded under the no-franchise rule.
- Prutch's Garage Door (Gunnison/Rifle): partnered with multi-state Guild Garage Group; acquired Kenny's Overhead Doors Oct 2024; corporate roll-up, permanently out of the local pool (round35).
- mckeedoor.com: Ohio/Kentucky commercial door company, wrong region (round35).

## Ecosystem notes

- Chimney segment timing: September is the pre-heating-season sweep and inspection rush (NFPA 211 Level 1/2/3 inspections are the industry language; Pagosa Peak is certified). The parent task supplied recent Facebook buyer-post demand for chimney services in the region, so this segment is warm from the demand side even though supply-side contact routes are thin. Phone dependency is extreme in this trade (round50 found 9 of 10 phone-route); the Missed Call angle is the primary wedge, with Automation for booking/follow-up.
- Garage door timing: emergency positioning dominates (Bearfoot advertises 24/7 emergency repair; Adams and Professional Garage Door sell repair/service alongside sales). Emergency trades are missed-call sensitive by nature: stuck-door callers dial the next company. Mid-September fall-prep angle: pre-winter spring and seal checks before the first cold snap. Professional Garage Door's possibly broken contact form is itself a pitch if confirmed.
- AI discoverability readings: Bearfoot shows the strongest observable signal (deep FAQ, location/service pages, consistent NAP, strong review footprint). Most chimney shops are directory-thin with no branded social page; their AEO depends entirely on getting the own site indexed and the contact route live.

## Stack signals and grades

- TileCare Innovations: CONFIRMED GoDaddy (img1.wsimg.com, live fetch).
- Ruben Tile Stone, American Tile and Marble, Marble Stone & Tile Restoration, Everlast, Williams Wall to Wall: UNKNOWN (no own-site page live-fetched or no site).
- SteamMaster Stone Care Division: UNKNOWN (no own site; dedup ambiguity).
- Mr. Vac: UNKNOWN (no live fetch this run).
- Holy Smokes, Homespun Comforts, San Juan Hearth and Renewables, Professional Garage Door (Cortez), DeVilbiss: UNKNOWN (indexed own-site content only; platforms not observed).
- Adams Overhead Door: WEAK INDICATION small custom dealer site (branded domain, shop-built door content, Clopay/LiftMaster badges; platform not observed).

## What a follow-up run should do (in this order)

1. Live-fetch the contact pages for the strongest email candidates first: sanjuanhearth.com (confirm info@sanjuanhearth.com), mrvac.net/contact/ (confirm info@mrvac.net), holysmokespagosa.com, homespuncomforts.com, adamsohd.com, professionalgaragedoorco.com (verify the form renders), ashesawaydurango.com, tilecareinnovations.com, rubentilestone.com/contact/, american-tileandmarble.com.
2. For any candidate where a site-published email or B2B-inviting form renders live, fill the email field, flip priority_state to WARM, suppression_state to NEW, and draft. Nothing is draft-eligible before that.
3. Do not re-run: chimney-sweep directory-only shops (no own site = no route), Lighthouse Outdoor Lighting (national franchise), Prutch's/Guild (corporate), adamchimneysweep.com (SEO lead page), Professional Garage Doors of Montrose vs Professional Garage Door of Cortez (distinct; do not merge).
4. Merge the 14 parked rows from research-round73.jsonl into the canonical set only after re-verification, per the parent's merge step. Parked rows stay WATCH and ineligible.

## Files written

- [research-round73.jsonl](sandbox://workspace/outreach/scratch/research-round73.jsonl): 14 parked WATCH rows, 33 canonical fields in exact order, validated programmatically (every line parses; every object has exactly 33 keys in the canonical order; no em/en dashes in any string).
- [build-round73.py](sandbox://workspace/outreach/scratch/build-round73.py): the row builder + validator, kept for reproducibility.
- This notes file.
