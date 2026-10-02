# Research scratch, round 95 (2026-09-19 20:12 MDT)

Segment focus: Western Colorado appliance repair deep pass, Western Colorado handyman deep pass,
round 16 window-cleaning + garage-door near-miss route verification, and if time permits,
round 94 locksmith near-miss verification.

Pipeline status for qualifiers: NEW with source=research-round95.
All rows verified against leads.md and pipeline.md. No em dashes used.

---

## Segment 1: Appliance repair (Western Colorado deep pass)

Worker report received 2026-09-19 20:30 MDT. Full report at
scratch/round95-appliance.md. This was the 4th Western Colorado appliance deep
pass (rounds 9, 10, 20, 38 before; round 77 re-touched several). Honest yield:
0 new verified qualifiers. browser.open died mid-run, so every unworked candidate
needs one live own-site open on the next pass.

Verification outcomes on existing rows (annotated in pipeline.md):
- Century Appliance, GJ: contact page re-opened live. No verbatim email (icon
  placeholders only). Own-site phone (970) 261-2599 VERIFIED ("Call or text").
  Row stays NEW with phone route verified. Copy drift noted: own site says 20+
  years, directory says 30.
- Appliance Specialty Co, Montrose: own site opened live; "Request Service" form
  confirmed (Name/Phone/Email/Address/City/Zip + appliance detail fields), but it
  is a customer service-request type requiring address, so not draft-ready B2B
  per precedent. Row stays WATCH.
- Grand Valley Appliance, Clifton: DOWNGRADE. grandvalleyappliance.com now resolves
  to a GoDaddy domain-for-sale page ($750). Own-site evidence is dead. Row
  annotated SUPPRESSED until re-verified. No contact before re-verification.
- Coyote Appliance Repair, Pagosa: undated Manta review complaining about no
  returned calls; not a trigger, corroborates the missed-call angle. Stays WATCH.
- East River Appliance, Gunnison valley: own site opened live. Family
  owned/operated, 23+ years, Crested Butte primary + weekly Gunnison runs. Contact
  says "send us an email" but no verbatim email or phone rendered, no form.
  easriv@qwestoffice.net is tourism-directory only. Stays near-miss.
- Miller's Appliance Service, GJ: re-check blocked.
- Best Appliance Service, Montrose: own site opened live. Homepage states
  "currently scheduling service calls approximately 2-3 weeks out... We are
  running as fast as we can with the resources we have available": the clearest
  missed-revenue signal in the segment, but no email or form on the own site
  (phone directory-only). Stays near-miss; converting check is a contact page or
  footer render.

8 genuinely new names with own domains known, all dedup-clean per worker
(search-indexed only; one live open each; NOT added): Affordable Appliance LLC
Delta (applianceservicecolorado.com; family-owned since 2001; owner Ann Tillotson;
BBB A+; 4.8/90 reviews; distinct from pipeline-tracked Affordable Appliance Repair
GJ, do not conflate), RC Pro Appliance Craig (rcproappliance.com), Au Appliance
Repair LLC Bayfield (auappliance.com), ABCD Appliance LLC Bayfield
(abcdappliancellc.com), Genesis Appliance Service Inc GJ
(grandjunctionappliancerepair.com; Disabled Veteran Owned; weak legacy-builder
signal), Optimal Appliance Repair GJ (optimalappliance.com), Always Right Service
GJ (alwaysrightservice.com; 8am-11:30pm 7 days), Home Appliance Repair & Sales GJ
(homeappliancegj.net). Plus 9 named no-own-site near-misses and 19 directory-only
names in the worker report.

Skips: Sears, Fix Appliance Repair lead-broker, SEO templates, trade mismatches,
prior-art holds.

Playbook-worthy: (1) Best Appliance Service's public 2-3-week scheduling backlog
is the clearest missed-revenue signal in the segment. (2) The lapsed Grand Valley
domain suggests a cheap domain-health sweep of the 2026-09-13 own-site-verified
batch is worthwhile.

---

## Segment 2: Handyman (Western Colorado deep pass)

Worker report received 2026-09-19 20:29 MDT. Full report at
scratch/round95-handyman.md. Audit applied by coordinator: browser_open went
terminal mid-turn for all workers, so the two worker-proposed NEW qualifiers
(Brennan The Handyman and Steamboat Handyman, both Steamboat Springs) rest on
search-indexed own-site evidence without a live render. Per the round-94
precedent, both are logged as near-misses with converting checks rather than
added as NEW. Dedupe verified clean independently.

Notable verified outcomes:
- Right Fix Handyman, Durango: own site render-verified live; homepage states
  "We are not taking any new clients." Existing pipeline row annotated as
  SUPPRESSED; no outreach until re-check. Squarespace CONFIRMED.
- Captain Ron Handyman L.L.C., Grand Junction: CDOS still good standing
  (formed 2026-07-14); no phone, email, or website anywhere; stays WATCH.
- Above Board Home Services, Delta: re-check inconclusive (fetch failure);
  remains SKIPPED/pending.
- 15 near-misses with converting checks, concentrated in Steamboat, Montrose,
  and the Roaring Fork Valley. Strongest: Hammer & Neill (Montrose, Squarespace,
  contact page render-verified but no email visible), Shaw Enterprises (Mancos,
  WordPress, "Get in touch" intake), Little Lions Handyman (Montrose, pure solo
  "my truck is my office", phone-only, strong missed-call profile).
- Skips with reasons logged: network/franchise-pattern naming (thehandymannetworkusa.com),
  templated lead-gen (handyman.us, netlify.app pages, handydoesit.com multi-city
  pages, 855-number multi-city SEO), drywall-primary trades, directory-only no-site
  operators, Instagram-only presence (Reliable Handyman of Colorado, Bayfield).
- Review baselines: Brennan 5.0/33 and Steamboat Handyman 5.0/513 on Birdeye;
  TRIGGER NO for both.
- Playbook-worthy: (1) Housecall Pro booking on Steamboat Handyman = resort-town
  shops already run FSM booking; the pitch must be automation depth
  (abandoned-booking win-back, seasonal repeat nudges), not basic capture.
  (2) Google business.site pages (Garnet Bird Ridgway, Valley Handyman GWS) are
  the "no real site" tell in rural pockets = WEBSITE_REVAMP angle with the
  portfolio proof asset. (3) Paused operations are real: Right Fix's own site says
  "not taking any new clients" = always verify the site before any engine touch,
  not just the profile. (4) Solo-operator call/text intake (Little Lions, Brennan)
  is the purest missed-call profile in the segment.

---

## Segment 3: Round 16 window-cleaning + garage-door near-miss route verification

Worker report received 2026-09-19 20:30 MDT. Full report at
scratch/round95-round16-verification.md. Conversions: 0. A browser_open failure
on First Impressions' site was declared terminal for the turn.

Still-near-miss (4), all dedup-clean, each with a single converting check:
1. Curbside Cleaners, GJ (exterior cleaning): strongest. Own-domain-indexed email
   estimates@curbsidecleaners.com on curbsidecleaners.com/news/schedule-service/
   plus own-site-indexed phone 970-260-2349. AUTOMATION, high confidence, WARM if
   accepted. Converting check: one live open confirming the email or a live form.
2. Above All Window Cleaning and Services, GJ: directory-only email
   aboveallservices@yahoo.com. TRIGGER NO.
3. Out Of Sight Window Cleaning, Durango: own site www.outofsightdurango.com known
   but unopened; phone (970) 749-7000. TRIGGER NO.
4. Grand Valley Garage Doors, Olathe/Delta: Clopay dealer, owner Scott Petersheim,
   (970) 216-5273, Google 4.9/126, BBB A+. Directory-only email not own-site
   confirmed. Cleanest genuinely-new near-miss in this segment.

Existing-row verification upgrades: Blue Jay (own site live; owner personally
oversees comms/scheduling; high-confidence AUTOMATION read; stays WATCH),
Professional Garage Doors (pgdtammy@gmail.com reconfirmed verbatim), Squeegee
Monkey (Free Quote form confirmed), Wenco (still suppressed, customer form only),
First Impressions (fetch failed; route still unverified). Bailey's Garage Doors &
More and Montrose Garage Doors got verification upgrades in the worker report
(Bailey's own-site phone (970) 272-1711 + Request Service page live; Montrose own-site
phone (970) 240-9320 + "Fast response times across the Western Slope" promise,
Duda STRONG INDICATION), but no active data rows were locatable in leads.md,
pipeline.md, or the JSONL files, so findings are preserved in the worker report
only. No duplicate rows added.

Permanent skips: Prutch's Garage Door (Guild Garage Group roll-up), Overhead Door
Company of Grand Junction (franchise), Glassy Window Cleaning (directory-only).

Review baselines: all TRIGGER NO. Montrose Garage Doors has September 2026
positive review momentum (4.9/104) worth re-checking.

Playbook-worthy: (1) Garage-door shops in this market live on their inboxes
(Gmail/Yahoo addresses are the norm), so email is the natural qualification
channel there. (2) The "your own site already promises speed you cannot deliver
without backup" angle fits Montrose (promises fast response across seven towns on
one office line) and Blue Jay (owner fields calls while on rope work).

---

## Segment 4: Locksmith near-miss verification (round 94 carryover, run directly)

Method: public web search only. browser.open terminally blocked this turn, so no
live own-site page fetches were possible. Converting checks relied on search-indexed
own-site text, chamber pages, and directory evidence. Nothing below is a live page
verification except Locksmith of Craig's homepage (fetched before the block).

### Near-miss carryover list from round 94 research

Locksmith of Craig (Craig), Sharp Locks (Cortez), Affordable Mobile Locksmith (Clifton),
Simmons Lock & Key (Delta), 4 Seasons Locksmithing (Delta), Rifle Lock & Safe (Rifle),
North Fork Lock and Key (Hotchkiss), Bob's Lock & Key (Durango/Ignacio), ACC Lock and Key (Steamboat),
Cortez Locksmith & Safe Company (Cortez).

### Findings

1. Locksmith of Craig, Craig
   - Own homepage fetched successfully before the block: verblocksmith.com showed only
     "Locksmith of Craig", a Call control, and emergency 24-hour home and auto lockout
     support. No own-site email or form exposed.
   - Review evidence: Google 4.7 average across 12 reviews; BBB A+; seven years in business.
   - Review verification: a 1-star review text was confirmed in search-indexed directory
     text: customer locked out of a running car in the morning, left a voicemail and a
     text, never heard back, despite the advertised 24-hour response. No date attached
     to the review text found, so it is intel-only and NOT a review trigger.
   - Business is named-owner: Brandon Verbeck (also listed under Brandon's Locksmithing
     on the BBB, same address 105 W Victory Way, Suite 202, Craig). Possible
     listing-name fragmentation, do not split into two rows.
   - Phone: 970-824-5772. Alternate search-indexed phone (970) 629-9224 appears on one
     directory page, treat as unverified alternate.
   - Opportunity: MISSED_CALL_LEAD_CAPTURE, medium-high.
   - Stack: UNKNOWN.
   - Status: still a near-miss (phone-only route; no own-site email/form verified).

2. Sharp Locks, Cortez
   - sharplockspremium.com fetch failed; no own site accessible. Third-party evidence
     only: Cody Sharp, phone 970-739-3278, 705 Memorial Dr, 4.8/5 across 25 Porch reviews.
   - DO NOT conflate with Cortez Locksmith & Safe Company: different address, different
     phone, different name. Two separate Cortez-area businesses.
   - Status: still a near-miss (directory-only).

3. Affordable Mobile Locksmith, Clifton
   - Third-party listings associate it with amlgj.com (domain of Affordable Mobile
     Locksmith, Grand Junction), Patrick Beaty, phone 970-822-5625, 24/7 service.
   - The Clifton listing may be the same business as the GJ one (AML GJ), but do not
     merge on assumption: Clifton vs Grand Junction listings, same phone.
   - No own-site email/form verification achieved this turn.
   - Status: still a near-miss.

4. Simmons Lock & Key, Delta
   - Resolved: the Delta location is tied to the long-running Grand Junction company
     (simmonskey.com, serving since 1945, 75+ years, owners Floyd Miller and Linda Miller).
   - Delta chamber evidence identifies Floyd Miller as owner, phone 970-874-4202,
     weekdays 9 to 5 and weekends on call. The chamber page's "Send Email" button is a
     chambermaster function, not an own-site contact route.
   - The Delta shop appears to be a regional branch of the GJ company, not an
     independent shop: not a new pipeline row. The parent company's own-site contact
     route was not verified this turn.
   - Status: still a near-miss (regional branch, no own-site Delta email/form verified).

5. 4 Seasons Locksmithing, Delta
   - Directory-only: phone 970-874-3614. No own site found.
   - Status: still a near-miss.

6. Rifle Lock & Safe, Rifle
   - Directory-only: phone 970-625-3357. Reported founded 1981. No own site found.
   - Status: still a near-miss.

7. North Fork Lock and Key, Hotchkiss
   - Directory-only: phone 970-389-6218, reported 24 hours, five years in business.
     No own site found.
   - Status: still a near-miss.

8. Bob's Lock & Key, Durango/Ignacio
   - New progress: own-site URL resolved this round: bobslockandkeydurango.com
     (from a Yellow Pages listing's "Other Link"). Family-owned since 1991, serving
     Durango, Bayfield, and Ignacio; PO Box 3456, Durango, CO 81302; phone (970) 385-4870.
   - The live site's contact route (email or form) was NOT verified this turn because
     page fetching was blocked. Do not invent it.
   - Status: near-miss upgraded from "no URL in snippets" to "URL resolved, live page
     check pending". Strong verification candidate for a future round with browser
     access. Not added to pipeline.

9. ACC Lock and Key, Steamboat Springs
   - MapQuest says local family-owned, serving Routt and Moffat counties, and its
     "Generated from the website" label implies an own site exists, but no exact
     own-domain URL surfaced in search results.
   - Status: still a near-miss (URL unresolved).

10. Cortez Locksmith & Safe Company, Cortez
    - Newly surfaced own-domain search evidence from cortezlocksmithandsafe.com:
      own-domain indexed contact page offers phone 970-565-4782 and "our quick form";
      indexed content says 25 years' experience, licensed and insured, ALOA member,
      emergency and scheduled residential/commercial/automotive work across Montezuma
      County, local Cortez address 26 W Andrew Ln.
    - Dedupe: ALREADY in pipeline.md (line 972) as NEW, added 2026-09-11, with the
      own-site quick contact form and phone on record. Also in leads.md line 2622.
    - This turn's evidence corroborates the existing pipeline row. No new row added.
    - Opportunity: MISSED_CALL_LEAD_CAPTURE, high. This is the strongest locksmith
      conversion candidate and it is already tracked.

### New locksmith businesses surfaced this round (not round-94 carryover)

11. Durango Lock and Key, Durango
    - Was a round-32 near-miss. Now own site resolved: durangolockandkey.com,
      phone (970) 903-6673, 4.8 across 74 reviews.
    - Live contact route not verified this turn (fetching blocked).
    - Not in leads.md or pipeline.md. Logged as near-miss with resolved URL,
      candidate for future verification.

12. Open Door Lockout Services, Bayfield
    - Already in pipeline.md (line 1828) as NEW with own site
      opendoorlockoutservices.com and phone (970) 903-6185, high
      MISSED_CALL_LEAD_CAPTURE. No new row added.

13. Steamboat Lock and Key, Steamboat Springs
    - New discovery: Google Business Site steamboat-lock-and-key.business.site,
      40630 Anchor Way, (970) 879-0408.
    - A GBS contact route may exist but was not verified this turn.
    - Not in leads.md or pipeline.md. Logged as near-miss.

14. Lee's Keys, Steamboat Springs
    - New discovery, directory-only: 1306 Lincoln Ave, Steamboat Springs.
    - Not in leads.md or pipeline.md. Logged as near-miss.

15. Glenwood Springs locksmith cluster (directory-only, no own sites found)
    - After Hours Lockout, Glenwood, (970) 309-3805
    - Alpine Locksmith, Glenwood, (970) 379-9145
    - Gene's Lock & Key, Glenwood, (970) 945-6307
    - Glenwood Lock & Key, Glenwood, (970) 945-7561
    - None in leads.md or pipeline.md. Logged as near-misses.

16. Dwight's Lock & Safe
    - Name appears in local results but no firm address, phone, or site resolved.
    - Logged as near-miss (identity unresolved).

### Skips and exclusions
- Denver locksmiths (Brother Locksmith Denver, and similar) were excluded: out of
  geography per Western Colorado first targeting.
- Minute Key kiosks and similar lead-broker/chain-style results excluded.
- No chain or franchise prospects were added.

### Locksmith outcome
No new pipeline rows this round. The strongest conversion candidate, Cortez Locksmith
& Safe Company, was already in pipeline from 2026-09-11 and this round's evidence
corroborates it. Locksmith of Craig, Sharp Locks, Simmons Delta, Bob's Lock & Key,
Durango Lock and Key, and Steamboat Lock and Key are documented near-misses with
resolved or partially resolved routes for future browser-verified rounds.

---

## Segment 5: Review baselines

Recorded in scratch/reviews-round95.md. Review-trigger discipline: only a dated review
posted on or after 2026-09-08 that is 2 stars or lower, or a 3-star review mentioning
phone/response/wait/scheduling, triggers a tailored message. Undated reviews are
intel-only. Reviewers are never identified.

---

## Playbook observations

Collected in the software-playbook section below after worker reports arrive.

---

## Pipeline additions

Proposed rows are collected in scratch/pipeline-additions-round95-research.md.
Only fully qualified, deduped NEW rows with source=research-round95 are appended
to pipeline.md.

---

## Segment heat

- Appliance repair: 4th Western Colorado pass; pool is thin and heavily worked.
  0 new verified qualifiers. 8 genuinely new names with known own domains await
  one live open each on a future round with healthy page fetch.
- Handyman: 2nd dedicated Western Colorado pass; genuinely thin in rural pockets.
  Steamboat and Montrose were the productive towns. 0 NEW added (search-indexed
  only); 2 near-misses with resolved routes (Brennan The Handyman, Steamboat
  Handyman).
- Round 16 verification: 0 conversions. Curbside Cleaners (GJ) is the strongest
  pending conversion (own-domain-indexed email + phone; one live open away).
- Locksmith: 0 new rows. Cortez Locksmith & Safe Company corroborated (already
  in pipeline). Bob's Lock & Key and Durango Lock and Key URLs resolved, live
  checks pending.
- Cross-segment: browser_open went terminal mid-turn for all workers, so this
  round's yield is verification upgrades and resolved routes, not new qualifiers.
  A future round with healthy page fetch should convert several near-misses
  quickly since own domains are now known for the top candidates.

---

## Locksmith conversion verification notes

Folded into the Findings section above.
