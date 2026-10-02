# Round 38 research scratch (2026-09-12) — status

## Segments delegated
1. Chimney sweep / chimney & fireplace services (Western Colorado). Subagent working: qualifiers to ~/workspace/outreach/research-scratch-round38-chimney.md, JSONL to ~/workspace/outreach/jsonl-additions-round38-chimney.jsonl, drafts to ~/workspace/outreach/drafts/round38-<slug>-email.md.
2. Appliance repair (Western Colorado). Subagent working: qualifiers to ~/workspace/outreach/research-scratch-round38-appliance.md, JSONL to ~/workspace/outreach/jsonl-additions-round38-appliance.jsonl, drafts to ~/workspace/outreach/drafts/round38-<slug>-email.md.

Recent segments avoided per instructions: rounds 37 drywall/pest, 36 movers/masonry, 35 doors/garage doors, 32 locksmiths/pressure wash. Broader coverage check (grep of leads.md): chimney 8 mentions, appliance 15 mentions, no dedicated research rounds for either. Seasonal: mid-September is prime pre-heating-season chimney sweep booking; appliance repair is urgency-driven year round.

## Review intelligence (own work, 8 HOT/WARM prospects checked 2026-09-12)
- Clean Pro Restoration (GJ): 4.8 over 21 reviews (Birdeye), no new bad review. SEO/AEO pass recorded.
- Western Slope Pest Control (GJ): 5.0 everywhere (Angi/Birdeye/HomeAdvisor), no trigger.
- Crosstech Electrical (Montrose): 5.0 over 80 reviews (Birdeye), no trigger. SEO/AEO pass recorded. Stack upgrade: CONFIRMED Wix (wixstatic asset paths observed on own site).
- Integrity Electric (Delta): stale 3.2 over 5 reviews (Birdeye). Older undated review describes repeated unanswered calls before a callback; another from 2018 about a billing mixup. No verifiable NEW bad review, so no trigger per the strict 7-day rule. Noted in notable_reviews + review_velocity.
- Honk-Key Lock & Safe (Montrose/GJ, HOT): own press release references 5-star Google reviews; no bad review surfaced.
- Southwest Septic (Durango): 5.0 over 66 reviews (NiceJob), no trigger. SEO/AEO pass recorded.
- Grand Valley Concrete Polishing (Clifton): no Google review count surfaced; BBB-area listings for the similarly named Grand Valley Concrete LLC (GJ) are unrelated. No trigger.
- The Wash Squad (GJ): franchise subdomain site with own testimonials; no bad review surfaced.
- RESULT: 0 review triggers this round. No follow-ups.md entries needed. No prospect had an active ladder on the checked set.

## SEO/AEO (own work, 5 HOT/WARM prospects, observable evidence only)
- Clean Pro Restoration: ai_discoverability=moderate. Branded own site indexed with service, FAQ, and service-area pages; footer NAP (2956 D 1/2 Road, GJ, (970) 628-1477); 4.8 reviews. Weak spot: no structured data observed, answer-oriented content is sales copy rather than FAQ schema.
- Crosstech Electrical: ai_discoverability=moderate. Branded indexed; owner-named, credential-led copy (Master Electrician, Tesla Certified); service towns listed. Wix builder. Thin service-page depth.
- Southwest Septic: ai_discoverability=moderate. 5.0 over 66 reviews with NiceJob review presence; own site verified with published email. Answer-oriented content depth unknown.
- Honk-Key Lock & Safe: ai_discoverability already moderate (2026-09-12 SEO/AEO pass). No change.
- The Wash Squad: ai_discoverability already weak (franchise territory). No change.

All review/SEO updates applied to ~/workspace/your_files/western-co-prospects.jsonl atomically (read all 286 rows, patched 4, wrote .tmp, verified line count, shutil.move after validation).

## Completed worker reports (2026-09-13 UTC)

### Chimney sweep (completed 2026-09-13 05:22 UTC)
Qualifiers: ~/workspace/outreach/research-scratch-round38-chimney.md; JSONL: ~/workspace/outreach/jsonl-additions-round38-chimney.jsonl (3 rows, parsed clean).
1. Alpine Chimney Sweep, LLC (Pagosa Springs, WARM, own-site phone 303.968.0036, est. 2012 family-owned, phone/text-only booking; primary MISSED_CALL_LEAD_CAPTURE medium; busy season August through February). Draft: drafts/round38-alpine-chimney-sweep-email.md (parked, no email).
2. Ashes Away (Durango, WATCH, no published phone/email on own site; primary SEO low; WordPress CONFIRMED). Draft: drafts/round38-ashes-away-email.md (parked).
3. Service Monkey Fireplace (Silverthorne, WATCH, Summit County outward expansion, no published phone/email; primary AUTOMATION low; STRONG INDICATION hosted website builder). Draft: drafts/round38-service-monkey-fireplace-email.md (parked).
Zero new-filing hits. Colorado SOS database requires interactive navigation unavailable in this research context; left for a browser-capable parent run.

### Appliance repair (completed 2026-09-13 05:24 UTC)
Qualifiers: ~/workspace/outreach/research-scratch-round38-appliance.md; JSONL: ~/workspace/outreach/jsonl-additions-round38-appliance.jsonl (10 rows, parsed clean against schema; carries a "town" field stripped at merge).
1. Vista Appliance Repair (Durango, WARM, owner Matt Macomber, own-site phone 970-903-0653; primary MISSED_CALL_LEAD_CAPTURE medium). Draft parked (no email).
2. Miller's Appliance Service (GJ, WARM, (970) 243-3897 directory-listed; MISSED_CALL_LEAD_CAPTURE low). Draft parked.
3. Affordable Appliance Repair (GJ, WATCH, (970) 434-8496 directory-listed; RE-VERIFICATION CAVEAT: direct own-site fetch failed during research, own-site verification pending). Draft parked.
4. Grand Valley Appliance (Clifton, WARM, (970) 640-6715 directory-listed; MISSED_CALL_LEAD_CAPTURE low). Draft parked.
5. Coyote Appliance Repair (Pagosa Springs, WATCH, (970) 264-3555 directory-listed; low). Draft parked.
6. Bob's Place Reconditioned Appliances (Cortez, WARM, own-site phone (970) 564-5959; low). Draft parked.
7. Old Town Repair LLC (Steamboat Springs, WATCH, (970) 879-8633 directory-listed; low). Draft parked.
8. Westernslope Appliance (Glenwood Springs, WATCH, (970) 355-9886 directory-listed; WEBSITE_REVAMP medium, revamp_candidate=yes). Draft parked (portfolio link included).
9. Durango Appliance (Durango, WATCH, (970) 799-7500 directory-listed; AEO_AI_DISCOVERABILITY low). Draft parked.
10. Appliance Specialty Co (Montrose, WATCH, no contact info; low). Draft parked. REFERENCE ONLY.
Zero new-filing hits. Phone provenance: only Vista, Bob's Place, and Yampa Valley (below) are own-site-confirmed; the rest are directory-listed with own-site verification outstanding.

### Window cleaning fill pass (own work, 2026-09-13)
Pool was thin against the 15-25 target. Exploratory snow-removal pass aborted (Durango Snow Removal domain parked; J&J Snow Removal directory-only, no own site; aboveallpro.com now resolves to a spam parking page). Window-cleaning searches (GJ, Steamboat) surfaced Yampa Valley Window Cleaners (yampavalleywindowcleaners.com): Steamboat Springs, serves Routt County, owner Christian published, crew of five, own-site phone (970) 367-7749, fully insured; primary MISSED_CALL_LEAD_CAPTURE (medium); WATCH. Draft: drafts/round38-yampa-valley-window-cleaners-email.md (parked, no email). Blue Jay Window Cleaning (GJ, owner Justin Rand) was a near-miss: contact-page fetch failed, own-site phone unverified; excluded pending re-verify. First Impressions and High Country Window Washers already in pipeline (dedupe). Western Slope Window Cleaning is Thumbtack-only (excluded per own-site rule).

## Merged JSONL (built 2026-09-13)
~/workspace/outreach/jsonl-additions-round38-research.jsonl: 14 rows, ranked strongest-first per tight-cap directive, validated clean against prospect-schema.json (required fields, enums, patterns, no extra keys). 11 mergeable (verified phone + signal); 3 REFERENCE ONLY (no verified contact info: Appliance Specialty Co, Ashes Away, Service Monkey Fireplace) marked in notes as do-not-merge-until-a-channel-exists. Parent merges only what fits under the 300-active cap; nothing appended to the canonical store directly.

## Draft audit (own work, 2026-09-13)
All 14 drafts (3 chimney, 10 appliance, 1 window cleaning) verified: exact disclosure first, body 114-120 words each (within the 80-120 band), zero em dashes, zero hedges (might/could/struggling), primary opportunity only, no invented facts. All parked: zero published emails across 14 qualifiers.

## Still pending
- Merge children's JSONL into one pipeline-additions file (DONE: pipeline-additions-round38-research.md).
- Append Round 38 section to leads.md (DONE).
- pipeline-additions-round38-research.md with status NEW rows (DONE).
- jsonl-additions-round38-research.jsonl merged file (DONE, 14 rows, validated).
- Software-playbook Ecosystem notes update (DONE: chimney sweep + appliance repair section 2026-09-12).
- Final sweep summary (this report).
