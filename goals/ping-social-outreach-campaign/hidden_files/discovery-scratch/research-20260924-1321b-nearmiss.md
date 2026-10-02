# Research near-miss / exclusion log: round20260924-1321b
Run date: 2026-09-24 (America/Denver). Worker task: own-live-site contact-page re-verification.
Segments: (A) window-cleaning near-misses from research-scratch-round16.md (2026-09-10);
(B) siding/exteriors near-misses staged NEW in pipeline.md round-42 (lines 1192-1194).
Dedupe sources: dedupe-names-20260924.json (2288 lowercase names), grep -i in leads.md,
facebook-dms.md, pipeline.md. Zero JSONL rows staged this run: every investigated business
was already tracked in pipeline.md/leads.md/dedupe list, dead, or out of scope. This is the
correct fail-closed outcome per the round-1721 lesson.

## SEGMENT A: window cleaning (round-16 near-misses)

### 1. Blue Jay Window Cleaning (Grand Junction) - ALREADY TRACKED, no row
Verification performed: live fetch of https://bluejaywc.com/ (verbatim URL from search result).
The fetched page text rendered the About/Team/Services content: "Founded by Justin Rand",
family-owned, "intentionally keep our team small", owner personally oversees customer
communication/scheduling/quality control. No email, phone, or contact form appeared in the
fetched page text. Images served from img1.wsimg.com (GoDaddy site-builder asset host).
Owner name Justin Rand is confirmed stated on the own site (matches pipeline record).
Dedupe: pipeline.md line 2272 carries this business as NEW (WATCH, source=research-round89);
leads.md line 3383 also references it. Outcome: duplicate. No JSONL row.
Contact-route status remains UNVERIFIED on the own site (phone (970) 260-2015 is
directory-derived only, does not qualify). Note for engine: round-89 row already records the
phone-gate flag; no action from this run.

### 2. Above All Window Cleaning and Services (Grand Junction) - ALREADY TRACKED, no row
Verification performed: search for a verbatim own-site contact URL (aboveallpro.com /
windowcleaninggj.com / windowcleaninggrandjunctionco.com). No verbatim own-site contact page
URL was returned, and the live contact-page fetch could not be completed this run (browser
fetch capacity was exhausted by an earlier tool failure; no further fetches permitted this
turn). The business is already fully tracked: pipeline.md line 2709 NEW (WATCH,
source=corridor-research round-121) and leads.md line 3474. Outcome: duplicate. No JSONL row.
Intel note: leads.md line 3474 records that own domain windowcleaninggrandjunctionco.com is
PARKED (domain-for-sale). Email aboveallservices@yahoo.com remains third-party-only
(namesandnumbers directory), never own-site confirmed. A future pass could probe
aboveallpro.com directly for a live contact page.

### 3. Out Of Sight Window Cleaning (Durango) - DEAD SITE, OUT OF SCOPE, no row
Verification performed: live fetch of https://www.outofsightdurango.com/ (verbatim URL from
search result). The domain no longer serves the window-cleaning site: it renders Vietnamese
adult-content spam ("Phim Sex GG", links to provacvacunas.com). The domain is compromised
or expired and repurposed. Outcome: dead site; no contact route exists on the own site.
Additionally Durango is outside the standing geography (Mesa County corridor + Delta,
Montrose, Rifle, Carbondale only). Not in dedupe-names list and not in leads.md /
facebook-dms.md / pipeline.md, but excluded on dead-site + out-of-scope grounds. No JSONL row.

### 4. Squeegee Monkey Window Washing (Durango) - ALREADY TRACKED, OUT OF SCOPE, no row
Verification performed: live fetch of https://squeegeemonkeydurango.com/contact-us/
(verbatim own-site URL from search result). The own-site contact page shows, verbatim:
"Ready for cleaner windows? Have a question about our services? We are easy to reach and we
respond fast. Give us a call, send us a message, or fill out the form below and we will get
back to you with a straightforward, no-obligation quote." Published: 463 Turner Dr #104c,
Durango, CO 81303; (970) 903-1581; hours Mon-Fri 08:00-17:00; Facebook link
facebook.com/squeegeemonkeydurango. Contact route VERIFIED on the own site (phone + own-site
contact form). Stack: no stack signals observed in the fetched page text -> UNKNOWN.
Dedupe: "squeegee monkey window washing" is present in dedupe-names-20260924.json, and
pipeline.md line 1097 carries it as NEW (phone route only, owner Casey MacNiven, est. 2013).
Outcome: duplicate. No JSONL row. Also Durango is outside the standing geography, and the
own-site team listing shows ~8 staff (larger than the smallest-shop-first profile).

### 5. Curbside Cleaners (Grand Junction) - ALREADY TRACKED, no row
Verification performed: live fetch of https://curbsidecleaners.com/news/schedule-service/
(verbatim own-site URL from search result). The fetched page shows, verbatim: 970-260-2349
and estimates@curbsidecleaners.com, plus own-site nav links to Facebook
(CurbsideCleanersGrandJunction), Instagram (curbsidecleanerscolorado), and a Housecall Pro
booking link (book.housecallpro.com, nav label "Schedule Appiontment" - typo on own site).
Contact route VERIFIED on the own site (phone + email + online booking). Stack: WordPress
CONFIRMED via /wp-content/uploads/2021/08/logo-01-Final-01.png paths; Housecall Pro STRONG
INDICATION via the own-site booking link.
Dedupe: leads.md line 3470 and pipeline.md line 2705 carry this business; pipeline.md line
2705 shows it QUEUED for the 2026-09-25 UTC cold slot 8 with draft
drafts/round121-curbside-cleaners-email.md. Outcome: duplicate, already in send pipeline.
No JSONL row.

### 6. First Impressions Window Cleaning (Grand Junction) - ALREADY TRACKED, no row
Verification performed: attempted live fetch of http://firstimpressionsgj.com (verbatim URL
from search result); the browser fetch failed (browser-service could not fetch the requested
page) and retry was barred this turn, so no own-site contact verification was completed.
Dedupe: pipeline.md line 1032 carries this business as NEW (Tier B, phone 970-778-5376
marked third-party extract VERIFY-ON-SITE). Outcome: duplicate. No JSONL row. Contact-route
status remains UNVERIFIED on the own site (directory phone only); the live check is still
open for a future pass.

### 7. Glassy Window Cleaning (Grand Junction) - ALREADY TRACKED, no row
Verification performed: web search for an own site ("Glassy Window Cleaning Grand Junction
website owner operated window cleaning"). No own site was returned; the business appears as
a Google Business profile (business.google.com) only, consistent with the round-16
directory-only finding. Dedupe: leads.md line 3471 and pipeline.md line 2706 carry this
business as NEW (WATCH, source=corridor-research round-121) with own site
glassycleanwindows.com, phone (970) 205-9089 own-site verbatim, and a same-day quote form
- already verified in round-121. Outcome: duplicate. No JSONL row.

## SEGMENT B: siding / exteriors (round-42 near-misses, already in pipeline.md)

### 8. Grand Valley Seamless Siding (Grand Junction) - ALREADY IN PIPELINE, no row per task
Task instruction: already staged NEW in pipeline.md line 1192; no new JSONL rows regardless.
Re-verification attempt: live own-site contact-page fetch could not be completed this run
(browser fetch capacity exhausted after the First Impressions failure; no further fetches
permitted this turn). Search-indexed own-site text (grandvalleyseamlesssiding.com) shows a
CONTACT block with office address "2925 D-1/2 Road, Grand Junction, CO 81504", working
hours Mon-Sat 09:00-17:00, and phone 970-261-1080, plus owner Rick Miller named on the own
site (since 2010, 30+ years in construction). This is SEARCH-SNIPPET evidence only and does
NOT qualify under the strict own-site verbatim-read rule. Outcome: STILL UNVERIFIED.
Recommended next step for engine: one live fetch of https://grandvalleyseamlesssiding.com/
(contact section is on the homepage) to confirm email/phone, then enrich the existing
pipeline row. No JSONL row written (task instruction).

### 9. CL Deck and Porches (Durango) - ALREADY IN PIPELINE, no row per task
Task instruction: already staged NEW in pipeline.md line 1194; no new JSONL rows regardless.
Re-verification attempt: live own-site contact-page fetch could not be completed this run
(same fetch-capacity constraint as above). Search-indexed own-site text
(cldeckandporches.com) shows a free-quote CTA "Give us a call at (970) 508-8060 for a free
quote!" on the own-site homepage. This is SEARCH-SNIPPET evidence only and does NOT qualify
under the strict rule. Outcome: STILL UNVERIFIED. Recommended next step: one live fetch of
https://www.cldeckandporches.com/ to confirm the phone on the own site, then enrich the
existing pipeline row. Note: Durango is outside the standing geography; the engine may want
to keep this row at WATCH or flag geography before any send. No JSONL row written (task
instruction).

## Summary counts
- Investigated: 9 businesses (7 segment A + 2 segment B).
- Staged JSONL rows: 0. All 7 segment-A businesses are already tracked in pipeline.md,
  leads.md, and/or the dedupe-names list (Squeegee Monkey, Curbside Cleaners, Blue Jay,
  Above All, Glassy, First Impressions), except Out Of Sight Window Cleaning whose own
  domain now serves adult-content spam (dead site, plus out of geography).
- Segment B: both businesses already in pipeline.md; live re-verification deferred (fetch
  capacity), both remain still-unverified under the strict rule.
- Chains/franchises encountered: none.
- New emails/phones/owner names invented: none.

## SEGMENT C (intended): junk removal / hauling + irrigation winterization — PARTIAL, worker interrupted

Assigned worker 437f3420 closed at hard stop (2026-09-24 ~13:48 MDT) with no output files produced and no businesses investigated on record. Zero candidates staged, zero verified contact routes, zero stack grades. This segment must be re-run in a future discovery pass: target small independent junk removal / hauling / cleanout shops and irrigation / sprinkler-blowout services advertising the fall winterization window (now through mid-November) in the Mesa County corridor + Delta, Montrose, Rifle, Carbondale, under the strict own-site-only contact rule with the two-layer dedupe (dedupe-names-20260924.json + grep leads.md / facebook-dms.md / pipeline.md).

## Final counts (merged run)
- JSONL rows staged to research-20260924-1321b.jsonl: 0 (empty file; no candidate passed the strict own-site-verified + dedupe gates).
- Businesses investigated: 9 (7 window-cleaning near-misses + 2 siding/exteriors). Junk removal / irrigation segment: 0 investigated (partial).
- Chains/franchises encountered: none.
- New emails/phones/owner names invented: none.
