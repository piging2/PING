# Pipeline-ready rows, round 95 research (2026-09-19)

Segments: Western Colorado appliance repair deep pass, Western Colorado handyman deep
pass, round 16 window-cleaning + garage-door near-miss route verification, round 94
locksmith near-miss verification (direct).

No em dashes used.

## Audit standard applied
Only own-site-published emails or live (render-verified) contact forms and phones
qualify a prospect for NEW. Search-indexed own-site evidence without a live render
stays a near-miss with a converting check, consistent with round 94 (0 NEW among
locksmiths when browser_open failed). browser_open went terminal mid-turn for all
workers, so live verification was unavailable for most candidates.

All proposed rows below were deduped against leads.md, pipeline.md, and the
canonical JSONL/CSV. No em dashes used.

---

## NEW candidates: handyman

AUDIT OUTCOME: 0 added as NEW. The two worker-proposed qualifiers are downgraded
to near-misses because neither had a live render this turn.

- Brennan The Handyman, Steamboat Springs (worker-proposed NEW; audit: NEAR-MISS)
  - Own domain https://www.brennanthehandyman.com/. Search-indexed own-site contact
    page text: "Please call me, text me or fill in your information and give me an
    idea of what you need help with." Own-site phone (970) 439-0275 via the same
    crawl. Owner Brennan Counts; solo; 420 Alpine Ct; Birdeye 5.0/33.
  - Dedupe: clean (no hits in leads.md, pipeline.md, JSONL, CSV under any variant).
  - Converting check: one live render of the contact page to confirm the form and
    published phone. Re-propose as NEW (WARM, MISSED_CALL_LEAD_CAPTURE, medium)
    once confirmed.

- Steamboat Handyman, Steamboat Springs (worker-proposed NEW; audit: NEAR-MISS)
  - Own domain http://www.steamboathandyman.com/. Search-indexed Housecall Pro
    booking link under the business's own account (STRONG INDICATION of Housecall
    Pro stack). Email HelpMe@steamboathandyman.com is directory-listed only, NOT
    own-site verified; do not claim it as an own-site email.
  - Dedupe: clean.
  - Converting check: one live render of the own site to confirm the booking flow
    and any own-site email/form. Re-propose as NEW (WARM, AUTOMATION, medium)
    once confirmed.

## Verification updates to EXISTING rows (annotated, not new rows)

- Right Fix Handyman, Durango (pipeline NEW, research-round76): own site
  render-verified live 2026-09-19; homepage states "We are not taking any new
  clients." Row annotated: SUPPRESSED, no outreach until re-check. Squarespace
  CONFIRMED. No duplicate row added.

- Captain Ron Handyman L.L.C., Grand Junction (pipeline NEW, WATCH): CDOS confirms
  still good standing (formed 2026-07-14); no phone, email, or website anywhere.
  No route upgrade; stays WATCH. No change made.

- Above Board Home Services, Delta (pipeline SKIPPED): re-check inconclusive
  (fetch failure). Remains SKIPPED/pending.

## Dedup discards (already tracked; not re-added)
- Two Rivers Handyman, Glenwood Springs: pipeline SUBMITTED 2026-09-09.
- Astra Yah Handyman, Durango: pipeline SKIPPED.
- Handyman Ivan, Gunnison: pipeline NEW (WATCH); no new contact info this round.

---

## NEW candidates: appliance repair

AUDIT OUTCOME: 0 added as NEW. browser.open died mid-run for this worker too, so
all unworked candidates need one live own-site open on the next pass. This is the
4th Western Colorado appliance deep pass (rounds 9, 10, 20, 38 before); the pool
is thin and heavily worked.

Verification outcomes (existing rows annotated in pipeline.md):
- Century Appliance, Grand Junction: contact page re-opened live 2026-09-19. No
  verbatim email (icon placeholders only). Own-site phone (970) 261-2599 VERIFIED
  ("Call or text"). Row annotated; stays NEW with phone route verified.
- Appliance Specialty Co, Montrose: own site opened live; "Request Service" form
  confirmed (Name/Phone/Email/Address/City/Zip + appliance detail fields), but it
  is a customer service-request type requiring address, so not a draft-ready B2B
  route per precedent. Row annotated; stays WATCH.
- Grand Valley Appliance, Clifton: DOWNGRADE. grandvalleyappliance.com now resolves
  to a GoDaddy domain-for-sale page ($750). Own-site evidence is dead. Row annotated
  SUPPRESSED until re-verified. No contact before re-verification.
- Coyote Appliance Repair, Pagosa Springs: Manta profile shows a dated-but-yearless
  review complaining about no returned phone calls. Undated, so not a review trigger,
  but it corroborates the row's MISSED_CALL_LEAD_CAPTURE angle. Stays WATCH.
- East River Appliance, Gunnison valley: own site opened live 2026-09-19.
  Family owned/operated, 23+ years, Crested Butte primary + weekly Gunnison runs.
  Contact section says "send us an email" but no verbatim email or phone rendered,
  no form. easriv@qwestoffice.net is tourism-directory only. Stays near-miss.
- Miller's Appliance Service, Grand Junction: re-check blocked (fetch failure).
- Best Appliance Service, Montrose: own site opened live 2026-09-19. Homepage
  states they are "currently scheduling service calls approximately 2-3 weeks
  out... We are running as fast as we can with the resources we have available":
  the clearest missed-revenue signal in the segment, but no email or form on the
  own site (phone directory-only). Stays near-miss; converting check is a contact
  page or footer render.

8 genuinely new names with own domains known, all dedup-clean per worker
(search-indexed only; converting check = one live open each; NOT added):
Affordable Appliance LLC, Delta (applianceservicecolorado.com; family-owned since
2001; owner Ann Tillotson; BBB A+; 4.8/90 reviews); RC Pro Appliance, Craig
(rcproappliance.com); Au Appliance Repair LLC, Bayfield (auappliance.com); ABCD
Appliance LLC, Bayfield (abcdappliancellc.com); Genesis Appliance Service Inc,
Grand Junction (grandjunctionappliancerepair.com; Disabled Veteran Owned; weak
legacy-builder signal); Optimal Appliance Repair, Grand Junction
(optimalappliance.com); Always Right Service, Grand Junction
(alwaysrightservice.com; 8am-11:30pm 7 days); Home Appliance Repair & Sales,
Grand Junction (homeappliancegj.net). Plus 9 named no-own-site near-misses and
19 directory-only names in the worker report. Distinct from pipeline-tracked
Affordable Appliance Repair (GJ, affordableapplianceco.com): different town,
domain, owner. Do not conflate.

Skips: Sears (all towns), Fix Appliance Repair lead-broker, SEO templates
(appliance-repair.us, corkd), trade mismatches (fireplace, HVAC, dryer vent,
tool rental), prior-art holds (Sonny's, Western Slope Appliance Montrose, The
Appliance Doctor).

---

## Route verification: round 16 window-cleaning + garage-door near-misses

AUDIT OUTCOME: 0 conversions. No near-miss produced a fully page-verified NEW
qualifier. A browser_open failure on First Impressions' site was declared terminal
for the turn, so later research is search-indexed evidence only.

Still-near-miss (4), each with a single converting check; all dedup-clean:
1. Curbside Cleaners, GJ (exterior cleaning): strongest. Own-domain-indexed email
   estimates@curbsidecleaners.com on curbsidecleaners.com/news/schedule-service/
   plus own-site-indexed phone 970-260-2349. AUTOMATION, high confidence, WARM if
   accepted. Converting check: one live open confirming the email or a live form.
2. Above All Window Cleaning and Services, GJ: directory-only email
   aboveallservices@yahoo.com. Birdeye 4.6/291; old no-show chatter undated or
   years old. TRIGGER NO.
3. Out Of Sight Window Cleaning, Durango: own site www.outofsightdurango.com known
   but unopened; phone (970) 749-7000. Birdeye 5.0/30. TRIGGER NO.
4. Grand Valley Garage Doors, Olathe/Delta: Clopay dealer, owner Scott Petersheim,
   (970) 216-5273, Google 4.9/126, BBB A+. Directory-only email not own-site
   confirmed. Cleanest genuinely-new near-miss in this segment.

Existing-row verification upgrades (no new rows; notable items):
- Blue Jay Window Cleaning: own site opened live 2026-09-20. Founder Justin Rand
  confirmed; site states he personally oversees communication, scheduling,
  operations, and quality control. High-confidence AUTOMATION read; stays WATCH.
  (Row already reflected this; re-verified.)
- Professional Garage Doors, Montrose: own-site email pgdtammy@gmail.com
  reconfirmed verbatim; phone and address published. Row already had it; no change.
- Squeegee Monkey Window Washing: homepage Free Quote form confirmed. Row already
  noted passive contact form; re-verified.
- Wenco Garage Doors: still suppressed (customer form, no B2B invite). Row already
  SKIPPED; no change.
- First Impressions Window Cleaning: own-site fetch failed; route still unverified.
  Row already flagged VERIFY-ON-SITE; no change.
- Bailey's Garage Doors & More (Rifle) and Montrose Garage Doors: worker reported
  verification upgrades (Bailey's own-site phone (970) 272-1711 confirmed live +
  Request Service page live; Montrose Garage Doors own-site phone (970) 240-9320
  confirmed live + "Fast response times across the Western Slope" promise, Duda
  STRONG INDICATION), but no active data rows were locatable in leads.md,
  pipeline.md, or the JSONL files (only research-note mentions). Findings preserved
  in scratch/round95-round16-verification.md; no rows annotated.

Permanent skips: Prutch's Garage Door (Guild Garage Group roll-up), Overhead Door
Company of Grand Junction (franchise), Glassy Window Cleaning (directory-only).

---

## Locksmith: round 94 near-miss verification

0 NEW rows. Cortez Locksmith & Safe Company was the strongest conversion candidate
but is already in pipeline.md (NEW, 2026-09-11); this round's own-domain evidence
corroborates the existing row, so no duplicate row added. Locksmith of Craig,
Sharp Locks, Affordable Mobile Locksmith, Simmons Lock & Key (Delta branch of the
GJ company), 4 Seasons Locksmithing, Rifle Lock & Safe, North Fork Lock and Key,
Bob's Lock & Key, ACC Lock and Key remain near-misses. Bob's Lock & Key and
Durango Lock and Key had own-site URLs resolved this round (bobslockandkeydurango.com,
durangolockandkey.com) but live contact-route checks were blocked; converting
checks are one live render each. Steamboat Lock and Key (business.site) and Lee's
Keys are new directory-level discoveries logged as near-misses. None were in
leads.md or pipeline.md. Details in scratch/research-scratch-round95.md.
