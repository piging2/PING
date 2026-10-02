# COHORT-2 Acquisition Report

**Date:** 2026-09-24 (UTC)
**Controller:** cohort2
**Pipeline commit:** `e48ef710cb889bf4d59b833ef9766067a9e2bbf0` (branch `fyd-factory`)
**AI calls:** 0 across all 15 sites (deterministic-only run; worker has no model access)
**Marker:** ACQUISITION_TEST_ONLY, night_preview_only

## Objective

Run a second real-site acquisition cohort of 10 to 15 public businesses in the Mesa County corridor and neighboring towns, targeting the platforms wave 1 missed: Wix, Squarespace, Webflow, JS-heavy or SPA sites, plus two to three WordPress sites for comparison. Acquisition testing only.

## Repository isolation (read this first)

The Pig worktree at `/home/nolan/projects/ping` was on branch `fyd-factory` at the requested commit `e48ef710`, but it was **dirty** (multiple modified files under `src/fyd/`). Running imports directly from it would not prove results against the requested commit. A detached pristine worktree was created at `/home/nolan/cohort2-pristine`, pinned to exactly `e48ef710cb889bf4d59b833ef9766067a9e2bbf0`, with `node_modules` symlinked from the original install. All pipeline imports ran from the pristine worktree. The original Pig repository was not modified by this cohort work.

## Cohort composition (15 sites)

13 sites fetched successfully (homepage HTTP 200), 2 honest failure records.

| Site | Business | Town | Platform (confirmed) | Pages OK | Facts |
|---|---|---|---|---|---|
| tt-hvac | T&T HVAC | Grand Junction | Wix | 1 | 5 |
| mountain-air-roasters | Mountain Air Roasters | Grand Junction | Wix | 1 | 17 |
| bistro-317 | Bistro 317 | Grand Junction | Wix | 1 | 17 |
| pantuso | Ristorante Pantuso | Grand Junction | Wix | 1 | 7 |
| carrie-johnson-photo | Carrie Johnson Photography | Grand Junction | Squarespace | 2 | 36 |
| fanclubbrands | Fan Club Brands | Grand Junction | Squarespace | 3 | 37 |
| klik-boutique | Klik Boutique | Grand Junction | Rain POS | 9 | 12 |
| inspired-expressions | Inspired Expressions | Grand Junction | Square Online | 1 | 1 |
| geodav-tech | geodav.tech | Grand Junction | Gridsome (Vue SSG) | 8 | 16 |
| stellas | Stella's Fried Pork Tenderloins | Grand Junction | SpotHopper | 4 | 14 |
| mj-thomas-photo | MJ Thomas Photography | Grand Junction | WordPress | 1 | 1 |
| legacy-coffee | Colorado Legacy Coffee | Grand Junction | Custom CMS (Beacon-style) | 8 | 71 |
| hog-and-hen | The Hog and the Hen | Grand Junction | WordPress | 1 | 3 |
| snooks-bbq | Snook's Bottom BBQ | Grand Junction | unknown (bot-walled) | 0 | 0 |
| copeka-coffee | Copeka Coffee | Grand Junction | Squarespace (robots-blocked) | 0 | 0 |

Platform distribution: Wix 4, Squarespace 2 (+1 robots-blocked), WordPress 2 (+1 custom CMS), Rain POS 1, Square Online 1, Gridsome/Vue SSG 1, SpotHopper 1, bot-walled 1.

**Webflow did not materialize.** Targeted public search across the corridor (Grand Junction, Fruita, Palisade, Clifton, Delta, Montrose, Rifle, Carbondale) found no verifiable local business on Webflow. Prescreen signals initially suggested Webflow nowhere; the cohort ran without it.

**Corrections to prescreen guesses:** klik-boutique was flagged "shopify" by the signal detector, but the hits were JavaScript variable names inside Rain POS code (`shopify_full_refund_via_partial_logic`). Script paths (`pos-app/js`) and `media.rainpos.com` assets confirm Rain POS, a retail POS/ecommerce platform. The acquisition JSON records the correction. legacy-coffee was guessed WordPress; its URL structure (`cms_websites/`, `/files/2026/08/`) is a custom CMS, so it is recorded as `wordpress-custom-cms`.

**Dropped candidates (not in cohort):** gentle-hands-moving (Wix site now 404s at both the listed path and the account root; site appears gone), sarah-hall-photo (homepage now identifies Colorado Springs, fails the corridor geography rule), lucy-blues-barkery (domain now parks with a JS redirect to `/lander`), apricity-nails and seventh-street-deli (DNS resolution failures, no site to test), spindle-digital (platform signals inconclusive after FontAwesome false positives; superseded by geodav-tech as the JS-framework data point).

## Fetch methodology and compliance

- `robots.txt` fetched and evaluated per site with an RFC 9309-aware parser (`urllib`-style longest-match, ties to Allow) against our crawler user agent before any content fetch.
- Sequential requests only, minimum 2 seconds between ALL requests.
- Maximum 9 content pages per site (homepage + up to 8 subpages); in practice Wix and JS-shell sites yielded 1 page (see new class below).
- Public pages only. No forms, no logins, no contact, no outreach.
- Media: URLs and page provenance recorded only. Zero image bytes downloaded.
- Blocked fetches recorded as data, never retried.

## Per-site metrics

For each fetched site: facts are 100 percent DIRECT_FACT, 100 percent deterministic, 0 AI-derived. Sitespec valid and render model OK on all 13. Evidence coverage 1.0, conflicts 0.

| Site | Structured sources | Body-text facts | Body yield | JSON-LD facts | Unmapped events | Schema loss rate |
|---|---|---|---|---|---|---|
| tt-hvac | html-meta, opengraph | 0 | 0.0 | 0 | 0 | 0.0 |
| mountain-air-roasters | html-meta, json-ld, opengraph | 0 | 0.0 | 9 | 1 | 0.1000 |
| bistro-317 | html-meta, json-ld, opengraph | 0 | 0.0 | 10 | 1 | 0.0909 |
| pantuso | html-meta, json-ld, opengraph | 0 | 0.0 | 2 | 0 | 0.0 |
| carrie-johnson-photo | html-meta, json-ld, opengraph | 0 | 0.0 | 16 | 10 | 0.3846 |
| fanclubbrands | html-meta, json-ld, opengraph | 0 | 0.0 | 9 | 9 | 0.5000 |
| klik-boutique | html-meta | 0 | 0.0 | 0 | 0 | 0.0 |
| inspired-expressions | opengraph | 0 | 0.0 | 0 | 0 | 0.0 |
| geodav-tech | html-meta, opengraph | 0 | 0.0 | 0 | 0 | 0.0 |
| stellas | html-meta, json-ld | 0 | 0.0 | 10 | 2 | 0.1667 |
| mj-thomas-photo | html-meta | 0 | 0.0 | 0 | 0 | 0.0 |
| legacy-coffee | html-meta, opengraph | 0 | 0.0 | 0 | 0 | 0.0 |
| hog-and-hen | html-meta | 0 | 0.0 | 0 | 0 | 0.0 |

Cohort totals: 237 facts (html-meta 46, json-ld 56, opengraph 135). Schema mapping loss (cohort): 23 unmapped-property events / (56 mapped JSON-LD facts + 23 unmapped events) = **0.291**. This is an event-level approximation; the runner keeps per-kind counts, not the full literal-property denominator, which is noted in each JSON.

Relationships: 3 kept (bistro-317, mountain-air-roasters, stellas: 1 each), 2 dropped (stellas). Unsupported types: only the `unmapped-property` kind, 23 events total.

Failure records:
- **snooks-bbq**: fetch failure. Homepage 403 and robots.txt 403 from a bot-wall ("403 - Forbidden | Access to this page is forbidden."). Recorded honestly, not retried.
- **copeka-coffee**: robots-blocked. Genuine `User-agent: *` / `Disallow: /` in a Squarespace robots.txt. Zero pages fetched by policy.

## The four wave-1 primitives, re-measured

**1. Generic body-text extraction. Verdict: remains the number-one primitive, confirmed on new platforms.**
Cohort 2 produced **0 body-text facts across all 13 fetched sites** (body_text_facts = 0, body_text_fact_yield = 0.0 everywhere), spanning Wix, Squarespace, Rain POS, Square Online, Gridsome, SpotHopper, WordPress, and a custom CMS. Combined with wave 1 (0 body-HTML facts on 7 content sites), the pipeline has now extracted zero body-HTML facts from **20 of 20** real business sites. Every fact comes from head metadata (html-meta, opengraph, json-ld). The entire visible page body, where the business's actual services, menus, hours, and pricing live, is untouched.

**2. Tiered schema.org handling. Confirmed, with platform skew.**
23 unmapped-property events across 5 sites; cohort loss rate 29.1 percent. Squarespace sites are the worst offenders (fanclubbrands 50.0 percent, carrie-johnson-photo 38.5 percent), followed by SpotHopper (16.7 percent) and Wix (9 to 10 percent). Sites with no JSON-LD at all (Rain POS, Square Online, Gridsome, WordPress x3, custom CMS) contribute zero mapped and zero unmapped, which flatters the cohort average while hiding that they expose no structured data whatsoever.

**3. Dropped relationship and entity ledger. Confirmed at smaller scale.**
2 dropped vs 3 kept relationships. The small numbers reflect that Wix and JS-shell sites emit almost no JSON-LD with `@id` references, not that the mapping improved. The ledger primitive still has no per-property or per-relationship detail in the runner output (counts only).

**4. Builder-agnostic services, offerings, products, menus. Confirmed missing.**
Object fields across all 13 sites are limited to business/location basics (description, phone, site_name, title, website, locality, address_*). Zero menu items from 4 restaurant sites, zero products from 2 retail sites, zero service lists from the HVAC and agency sites. The pipeline has no generic extraction for what a business sells or does.

## New generic failure classes found in cohort 2

**A. Robots.txt parser false positives (corrects a wave-1 finding).**
Wave 1 reported 2 robots-blocked sites. Re-evaluation with an RFC 9309-aware parser (longest-match within the applicable `*` group, instead of treating any `Disallow: /` line anywhere in the file as a universal block) shows both wave-1 blocks were false positives: their `Disallow: /` lines sat in bot-specific sections (e.g. PetalBot) while `User-agent: *` allowed crawling. The cohort-2 prescreen's crude parser repeated the same mistake on 5 more sites; the fixed parser cleared 4 of them (gentle-hands-moving, tt-hvac, mountain-air-roasters, bistro-317) and confirmed 1 genuine block (copeka-coffee). Any acquisition pipeline parsing robots.txt section-blind will manufacture blocks that do not exist. This is a new generic acquisition failure class.

**B. Wix hash-router crawl boundary.**
All 4 Wix sites yielded exactly 1 page (the homepage). Wix sites drive navigation through client-side routing, so static `href` extraction finds no subpages. The bounded crawl (home + keyword-filtered hrefs) is effectively a homepage-only crawl on Wix. Any depth assumption in acquisition planning fails silently on Wix.

**C. Platform signal false positives.**
Two instances: FontAwesome `fa-` CSS classes tripped the Squarespace detector (spindle-digital prescreen), and Rain POS JavaScript variable names tripped the Shopify detector (klik-boutique, corrected post-fetch). Signal detectors that match substrings in page text need negative evidence rules, or platform identification must be confirmed post-fetch from script paths, asset hosts, and generator meta.

**D. Bot-wall 403 class.**
snooks-bbq returns 403 for both the homepage and robots.txt itself, a hosting-level bot wall (same shape as wave-1's pride-plumbing). When the policy endpoint is walled, there is no robots verdict to honor; the honest record is a fetch failure, not a robots block.

## Deliverables

- `acquisitions/<site-id>.json`: 15 files, one per site, wave-1 schema preserved with added metrics: `platform_identified`, `platform_evidence`, `body_text_facts`, `body_text_fact_yield`, `jsonld_fact_count`, `schema_mapping_loss_rate`, `schema_mapping_loss_note`.
- `raw/`: fetched corpus (robots.txt, homepage, subpages, manifest.jsonl per site).
- `fetch/`: sites2.tsv, fetch-cohort2.sh, robots_allows.py, prescreen artifacts and logs.
- `run/`: cohort2-run.mts (pipeline runner, controller `cohort2`), sites2.json, transfer/stage scripts, enrich-cohort2.py.

## Bottom line

Cohort 2 put 7 new platforms through the real pipeline at the pinned commit with zero AI calls: 13 sites rendered to valid specs, 237 deterministic facts, and the same structural gaps as wave 1. Body-text extraction is still the number-one primitive (0/20 sites across both cohorts). The robots-parser correction overturns wave 1's "2 robots blocks" finding and is itself a new generic class, alongside the Wix crawl boundary and platform-signal false positives. Webflow remains unrepresented in the corridor sample.
