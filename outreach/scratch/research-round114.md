# Research Round 114 — segment research (~2026-09-22 05:20 MDT)

Two fresh segments probed: INSULATION and GENERATOR INSTALLATION. Locksmiths re-probed
as a fallback (round-32 segment, mostly exhausted). Tool constraint: browser_open died
mid-round (fetch failure); no more page opens after Accurate Insulation / Grand Valley
Home Insulation homepages. Verification after that point is search-snippet only.

## Qualifiers: 0 (honest result; strict own-site bar held)

## Segment 1: INSULATION (corridor)

- Accurate Insulation (Grand Junction HQ 2173 River Road 81505; Montrose 113 Rose Ln Unit F;
  phone 970-241-8871; accurate-insulation.net, live). EXCLUDED as CHAIN: own site states
  "part of the Installed Building Products family of companies" (IBP, national publicly
  traded). WHOIS registrant: Installed Building Products. No-franchise/no-chain rule
  applies to national corporate branches. Has own-site /contact-us/ quote form, but
  ineligible on independence grounds.
- Grand Valley Home Insulation (GJ, 395 W Valley Cir 81507; +1-970-640-3908; owner
  James D. Schooley per BBB; grandvalleyhomeinsulation.com live). NEAR-MISS: homepage
  render shows phone only, no own-site email, no contact form fields observed. Weak
  revamp/AEO profile (thin brochure site). Retry candidate if a contact page with a form
  is ever verified live.
- Adobe Creek Environmental Services DBA ACES (GJ/Fruita; 783 Valley Ct / 785 12 22 Rd;
  (970) 241-3341; founded early 2011 by Brandon Warnke; locally owned; spray foam, batts,
  blown-in, concrete lifting foam, epoxy coatings). NEAR-MISS: no own website found in
  search (directory listings only: Porch, localprobook, 247locksmiths-style dirs).
  Qualifies only on own-site discovery.

Segment heat: insulation is genuinely fresh in this campaign (no round-32-style work,
no JSONL rows on these three), but contact-route yield is poor: one chain exclusion,
two near-misses. The owner-operated profile (GVHI sole proprietorship, ACES
owner-operator) fits the MISSED_CALL_LEAD_CAPTURE pattern (owner on jobs, thin office
coverage), and cash/check-only intake (GVHI) is a stack-grade signal of low
tech-readiness. Recommend one more live-browser verification pass on GVHI contact page
before abandoning the segment.

## Segment 2: GENERATOR INSTALLATION (corridor)

Thin independent pool; segment sits inside the electrical trade mostly.
- Colorado Energy Systems (Glenwood Springs; standby generators sales/install/service;
  coloradoenergysystems.com). ALREADY IN JSONL (WARM; service@coloradoenergysystems.com
  unverified on own site). Dedup skip.
- Ganzer Electric LLC (GJ, 678 Wild Rose Way 81507; (970) 255-8207; principal
  Justin P Ganzer). NEAR-MISS / directory-only: no own website found (usageneratorinstallers
  lead-broker listing, Manta, BuildZoom only).
- Richardson's Electric (GJ) and Aaron Anthony Electric (GJ): usageneratorinstallers.com
  directory entries only; no independent own-site generator presence surfaced. SKIP.
- usageneratorinstallers.com is a directory/lead-broker surface, not a business presence.

Segment heat: poor. Generators in the corridor are installed by generic electricians or
single-trade specialists with directory-only presence. No fresh qualifiers; retire the
segment until the electrical segment pass maps independent shops with own sites.

## Fallback re-probe: LOCKSMITHS (round-32 segment, 6 existing JSONL rows)

- Honk-Key Lock & Safe (GJ + Montrose; honkkeylocksafe.com). ALREADY IN JSONL (HOT;
  hello@honkkeylocksafe.com + press-published info@honkkeylocksafe.com). Note: GJ
  storefront grand opening ~June 2026 (press release ~94 days ago) = new-business-style
  signal, already captured.
- DC Lock, Inc. (GJ, 1685 Clymer Way 81503; (970) 241-8612; owner David Kaiser; dclock.com
  + dclockgj.com). NEAR-MISS: directories only carry phone; no own-site email/form surfaced. NEW EVIDENCE 2026-09-24 round-132: owner Kaiser self-declared on dmca.com ("My name is Kaiser, I own DC LOCK, INC."). Still no own-site email/form surfaced; hold stands.
- Simmons Lock & Key (GJ, 322 S 2nd St; simmonskey.com). Round-32 near-miss; no new
  contact route found this round.
- Ken's Services (GJ, 1411 Rood Ave; (970) 201-0403; kensservices.com). SUPERSEDED 2026-09-24 round-132: own site grandvalleylocksmith.com states "Formerly Ken's Services" with the same (970) 201-0403 number; brand retired into Grand Valley Locksmith Service (staged to pipeline). Do not keep both.
- Exclusions re-applied: KeyMe kiosks (national), Guardian Interlock (national interlock
  chain).

## Also considered and rejected as segments (not fresh)

- Septic: rounds 12/17/31/32 worked deeply. Concrete: rounds 17/21/100 worked.
- Tree service: round-54 tree care second pass (Big Horn, High Country already touched).
- Metal roofing / roofing: 17 JSONL rows, worked.
- Irrigation/sprinkler: round-45 pass logged Aztec, Majestic, Chuck's, Lush Green;
  Outpour Irrigation and Maple Leaf Landscaping are fresh names but unverifiable this
  round (browser_open died before own-site checks). Park for a future live round.

## Summary

- Segments probed: insulation, generator installation (+ locksmith fallback re-probe)
- Qualifiers: 0
- Near-misses: 6 (Grand Valley Home Insulation, Adobe Creek Environmental, Ganzer
  Electric, DC Lock, Ken's Services, Simmons Lock & Key [round-32 re-verify hold])
- Chain/franchise exclusions: 1 (Accurate Insulation, IBP Family of Companies)
- Dedup skips (already in JSONL/pipeline): Colorado Energy Systems, Honk-Key Lock & Safe
- JSONL adds: 0 | Pipeline adds: 0 | Active rows: 112 of 300 cap (no cap pressure)
- New-business radar: no new-filing finds; Honk-Key GJ storefront (June 2026) already in JSONL.

Biggest lesson this round: the IBP ownership of Accurate Insulation is exactly the
acquisition-between-research-and-send hazard the round brief warned about; chain
re-verification at research time (not just send time) caught it.
