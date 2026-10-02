# Pipeline-ready rows — round 94 Meta AI tandem ingest (2026-09-19)

**Standing rule: parent merges; pipeline.md not touched by this ingest.**

## Independent verification gate (this worker)

6 claimed VERIFIED-NEW from the cron's report re-audited via independent web search. Result: 5 VERIFIED-NEW, 1 DUPLICATE the cron missed. Cron's FAILED classification of "Day Or Night Heating & Co" SANITY-CONFIRMED: still only lead-farm template pages with unfilled tokens and a (410) 752-1880 Maryland placeholder phone; no GBP, no owned site, no local phone. It stays out (fail-closed).

**Miss caught:** Chrome Pest Control / Chrome Mosquito & Pest Control is already in leads.md (round 18, QUEUED 2026-09-10, draft round18-chrome-pest-control-email.md) and pipeline.md line 746 (QUEUED). The cron's fuzzy/variant-spelling dedupe missed "Chrome Pest Control" vs "Chrome Mosquito & Pest Control". It is a DUPLICATE and is NOT re-added below. Note: leads.md round 18 already has site-published email Chromeent@outlook.com for it; the QUEUED draft stands.

### 5 VERIFIED-NEW candidates (all WATCH, source=meta-ai-intel, intel type weak-website, status NEW, phone-route only)

- **Wellman Heating & Air** | HVAC | Grand Junction (101 Mesa View Ave, 81503) | (970) 852-8920 (Manta, chamberofcommerce, ShowMeLocal; directory-published); own site wellmanheatingandair.com | John Wellman (owner) | family-owned owner-operator, 2-man crew; GJ HVAC License #20263024; Birdeye 4.7/696 reviews; Mon-Fri 8-5; phone-first intake, no online scheduling observed | MISSED_CALL_LEAD_CAPTURE (medium) | stack: UNKNOWN | WATCH (source=meta-ai-intel, intel=weak-website; phone-route) | 2026-09-19 | NEW

- **Cold Canyon Electric** | electrician | Montrose (1825 Launa Dr / 16447 6275 Rd) | (970) 275-9422 (own-site header + Birdeye + namesandnumbers; directory-published) | Dave (owner, Master Electrician since 2007) | serving CO since 2008, 8 crews, Montrose/Telluride/Crested Butte; Lutron Smart Home + Generac certified installers; Birdeye 4/12 reviews | MISSED_CALL_LEAD_CAPTURE (medium; established shop, no clear online booking path) | stack: UNKNOWN | WATCH (source=meta-ai-intel, intel=weak-website; phone-route; note coldcanyonelectric@gmail.com exists only in a Mountain Village municipal PDF, not a contact route) | 2026-09-19 | NEW

- **Bennick's Roofing** | roofer | Cortez (600 S Washington St TRLR 21, 81321) | (970) 565-4695 (myHomePro, namesandnumbers, roof.info; directory-published); NO website anywhere | Earl Bennick (owner) | since 1990 (roof.info); ~1 employee owner-operator; myHomePro explicitly records no website | WEBSITE_REVAMP (medium; zero web presence, very non-technical owner profile) + MISSED_CALL_LEAD_CAPTURE secondary (phone-only intake) | stack: UNKNOWN | WATCH (source=meta-ai-intel, intel=weak-website; phone-route) | 2026-09-19 | NEW

- **Critters R US Pest Control** | pest control / wildlife | Craig (574 Legion St, 81625) | (970) 824-5505 (Steamboat Chamber listing, namesandnumbers, staysafe.org; directory-published); localsearch.com listed site is EXPIRED, effectively no functional site | unknown | founded 2004, 1-4 employees; locally owned, licensed & insured; CO Dept of Agriculture licensed; free estimates | WEBSITE_REVAMP (medium; 20-yr shop, dead web presence) + MISSED_CALL_LEAD_CAPTURE secondary (phone-only route) | stack: UNKNOWN | WATCH (source=meta-ai-intel, intel=weak-website; phone-route) | 2026-09-19 | NEW

- **TK's Bugs 'n' Stuff** | pest control | Craig (921 Langford Dr, 81625) | (970) 367-6849 (namesandnumbers verified, staysafe.org, place record; directory-published); alt (970) 824-6386 on unclaimed Manta page only; NO website anywhere | Ty Kuberry (owner, per Manta) | established 2007, ~2 employees; locally owned, res + commercial, no annual contracts required | MISSED_CALL_LEAD_CAPTURE (medium; phone-first intake, first-to-answer-wins trade) + WEBSITE_REVAMP secondary (no web presence) | stack: UNKNOWN | WATCH (source=meta-ai-intel, intel=weak-website; phone-route) | 2026-09-19 | NEW

### Reliability data point 9 for the tandem log

9. h-marketing-intelligence brief asked for marketing TACTICS (sections A-D); Meta AI answered with businesses instead (prompt-adherence miss on that brief, though the businesses were usable).

### Additional findings from this independent audit

8. Chrome Pest Control slipped the cron's dedupe: already in leads.md round 18 QUEUED as "Chrome Mosquito & Pest Control". Variant-name dedupe gap ("Chrome Pest Control" vs "Chrome Mosquito & Pest Control") needs hardening.
10. Meta AI's "verified via AAE-HVAC contractor page" claim for Day Or Night Heating & Co was a third-party lead-farm template page (unfilled tokens, Maryland placeholder phone). Independent verification treated it as a lead-farm bio; stayed out.
