# VEIN 1 CLOSE-OUT BENCHMARK — L1 vs L2 corpus + Trafilatura/extruct defect proof
2026-09-26. RESEARCH ONLY. No PING/FYD writes, no branches, no commits.

## 1. PING audit freshness

- Branch: `fyd/sprint-integration-2026-09-24` — same branch as the 2026-09-25 audit.
- HEAD: `c93a7ced`.
- `git log` on `src/fyd/acquisition/`: newest commits are `1bfff543` (2026-09-25, ARROW 2 real acquisition proof) and `ae1002ad` (2026-09-25, Track F live URL acquisition loop). Both were already covered by yesterday's audit. **No changes since 2026-09-25.**
- Working tree: no tracked-file modifications (only untracked build/media artifacts: `.next.*`, `public/fyd-media/*`, `tsconfig.arrow6.tsbuildinfo`).
- L1 implementation `src/fyd/acquisition/static-adapter.ts` (330 LOC, `StaticAcquisitionAdapter`) is unchanged: L0 policy gate, L1 static HTTP via `safeFetchPage`, raw HTML attached for UNDERSTAND, title/meta/OG/JSON-LD/canonical/links extraction via `node-html-parser`. L2 remains a typed policy note: "L2 browser-rendered fallback is NOT implemented in this build ... the Crawl4AI adapter seam is reserved for it (harvest lane evaluating; integration needs a named gap + Nolan's go)."
- L2 seam still exists as a typed contract in `src/fyd/acquisition/acquisition-adapter.ts`: `AcquisitionLevel = 0 | 1 | 2 | 3`, "L2 bounded browser-rendered fallback (only on typed L1 insufficiency) -> L3 bounded discovery ... -> L4 AI interpretation only after deterministic extraction is exhausted."
- Method: read-only `cat` of both files via Pig WSL + `git rev-parse`/`git log`/`git status`. No code executed from the repo.

Donor pins (unchanged from 2026-09-25, not re-verified this pass): Playwright `afa6836a5119` (Apache-2.0), Trafilatura `1e31e3e9eb2e4f6fbfd4bc04355bc74005a780e6` (Apache-2.0), extruct `a31daaadb82ec684b7d468d3b15734b8ae3b7265` (BSD-3-Clause).

## 2. Corpus (11 URLs; 1 candidate dropped)

Rationale: (a) JS-heavy / real Western Slope trade-business homepages — the exact pages the L2 fallback would serve on the live product path; (b) static controls where L2 should add nothing. Reachability verified with curl (normal Chrome UA, 2-4 requests per URL total across the whole pass; no hammering). `07 airstreamplumbing.com` dropped: empty reply from server (dead).

| ID | URL | Rationale |
|---|---|---|
| 01 | https://www.prideplumbingphc.com/ | GJ plumbing/HVAC business |
| 02 | https://www.amicomechanical.com/ | GJ plumbing/mechanical business |
| 03 | https://www.bergernelsonconstruction.com/ | GJ construction/plumbing business |
| 04 | http://www.theplumber1.com/ | Glenwood Springs plumbing business |
| 05 | https://www.thespeedyelectricians.com/fruita-co/ | Fruita electrician, content-heavy |
| 06 | http://84lumber.com/ | Corporate site (benchmark only, not a prospect) |
| 08 | https://example.com/ | Static control |
| 09 | https://en.wikipedia.org/wiki/Plumbing | Static control, heavy nav |
| 10 | https://schema.org/Plumber | Static control, structured-data rich |
| 11 | https://httpbin.org/html | Static control, minimal HTML |
| 12 | https://www.einpresswire.com/article/911408780/pride-plumbing-heating-cooling-expands-commercial-plumbing-and-hvac-solutions-in-grand-junction | Business-news article control (boilerplate-heavy) |

## 3. L1 vs L2 benchmark + Q5 verdict

L1: curl raw HTML, then Python extraction mirroring `static-adapter.ts` (first `<title>`, first 200 `<meta>` split into meta vs `og:`-prefixed, `application/ld+json` script blocks counted ok/unparseable, raw HTML char count = what UNDERSTAND receives, naive tag-strip char count as diagnostic).
L2: portable Windows node + `playwright-core` `chromium.connectOverCDP('http://127.0.0.1:9223')` on the house browser, one tab at a time, `domcontentloaded` + 3s bounded hydration, then title/meta/OG/JSON-LD/`innerText.length`, tab closed. 10/10 loads returned structured results; research script removed from the Pig afterward.

| ID | curl | L1: title / meta,og / ld / naiveChars | L2: title / m,o / ld / visibleChars / ms | JS-DELTA |
|---|---|---|---|---|
| 01 | 403 (Cloudflare block page) | "Attention Required! \| Cloudflare" / 2,0 / 0,0 / 772 | "Plumbing & HVAC Professionals in Grand Junction \| Pride Plumbing, Heating & Cooling" / 7,3 / 1,0 / 5973 / 4153 | **YES (+5,201)** — real browser passed Cloudflare; L1 saw only the block page |
| 02 | 200 | "Amico Plumbing & Mechanical Inc \| ..." / 8,4 / 0,0 / 3811 | same title / 8,4 / 0,0 / 3360 / 4433 | no (-451; hidden-text artifact) |
| 03 | 200 (114-byte JS stub) | None / 0,0 / 0,0 / 0 | None / 1,0 / 0,0 / 582 / 4210 | **YES (+582)** — L1 got `window.onload -> /lander` stub; L2 followed to /lander |
| 04 | 403 (Cloudflare "Just a moment") | "Just a moment..." / 2,0 / 0,0 / 58 | "Just a moment..." / 2,0 / 0,0 / 267 / 6507 | PARTIAL — both blocked; L2 loads only the challenge page |
| 05 | 200 | "Electrician Fruita CO ..." / 14,12 / 1,0 / 18821 | same / 14,12 / 1,0 / 11078 / 3922 | no |
| 06 | 200 | "Lumber Yard \| Building Materials Supplier" / 5,0 / 0,0 / 6435 | same / 5,0 / 0,0 / 1513 / 4480 | no |
| 08 | 200 | "Example Domain" / 1,0 / 0,0 / 142 | same / 1,0 / 0,0 / 129 / 3601 | no |
| 09 | 200 | "Plumbing - Wikipedia" / 5,5 / 1,0 / 42344 | same / 5,5 / 1,0 / 34107 / 3961 | no |
| 10 | 200 | "Plumber - Schema.org Type" / 2,0 / 1,0 / 24809 | same / 2,0 / 1,0 / 23985 / 4084 | no |
| 11 | 200 | None / 0,0 / 0,0 / 3594 | None / 0,0 / 0,0 / 3595 / 3675 | no |
| 12 | 200 | "Pride Plumbing Heating & Cooling Expands ..." / 11,10 / 1,0 / 11657 | same / 11,10 / 1,0 / 7342 / 4165 | no |

### Q5 VERDICT (plain numbers)

**YES, L2 beats L1 — narrowly, and only on the typed-insufficiency classes the AcquisitionAdapter contract already names.** 2 of 11 pages (18%) were fully rescued: 01 (Cloudflare-blocked for curl-L1: 0 business facts -> 5,973 visible chars, proper title, 7 meta / 3 OG / 1 JSON-LD) and 03 (JS-redirect stub: 0 chars -> 582 chars on /lander). On 8 of 11 pages L1 and L2 extracted byte-identical metadata fields (title/meta/OG/JSON-LD counts all match) — L2 adds nothing on ordinary server-rendered pages. On 1 of 11 (04) both failed (hard bot-block; L2 only renders the challenge). On no page did L2 surface more metadata fields than a successful L1.

Two mechanism notes: the 01 delta is bot-block evasion by a real browser, not JS execution (the page is server-rendered); the 03 delta is genuine JS execution (redirect). Cost: L2 3.6-6.5 s/page vs L1 0.4-2.5 s/page. The negative L2-vs-L1 char deltas on static pages (05, 06, 09, 12) are a measurement artifact: `innerText` counts rendered visible text only (excludes hidden nodes, alt text, noscript), while the naive strip counts every text node; fields are identical, so nothing is lost.

Gate status: Q5 is now ANSWERED with numbers. Q9 (failing test) remains open for the writer phase. The evidence supports exactly what the contract already says: L2 as a **bounded fallback on typed L1 insufficiency** behind the existing seam — not a general replacement.

## 4. Trafilatura defect proof — PROOF FOUND

Trafilatura 2.2.0 (Apache-2.0, pip-installed, never cloned) run offline on the saved corpus HTML.

The test that would fail before and pass after is: acquiring `https://www.einpresswire.com/article/911408780/pride-plumbing-heating-cooling-expands-commercial-plumbing-and-hvac-solutions-in-grand-junction` currently yields **117,694 chars of raw HTML** (11,657 naive-stripped, including "Privacy Policy" and "newsletter" boilerplate markers) passed to UNDERSTAND; with deterministic main-content extraction it would yield **5,206 chars of article body text** containing the headline, the service facts ("trenchless pipe relining", "preventive maintenance"), the company name ("Pride Plumbing"), the locality ("Grand Junction"), and the contact block ("815-569-5291", "info@prideplumbingphc.com") — all six probe facts verified present in the extracted output, both boilerplate markers verified absent.

Supporting: 05 (business site) 18,821 -> 5,727 chars (70% noise cut); 09 (Wikipedia) 42,344 -> 31,064. The defect is pollution, not omission: UNDERSTAND currently receives ~22x the article's characters on page 12, most of it nav/footer boilerplate.

## 5. extruct defect proof — PROOF FOUND

extruct (BSD-3-Clause, pip-installed, never cloned) run offline on the saved corpus HTML, syntaxes microdata/rdfa/opengraph/microformat/json-ld.

The test that would fail before and pass after is: acquiring `https://www.amicomechanical.com/` currently yields **zero structured facts** from the structured-data stage (PING's `structured-data.ts` is JSON-LD-only per the 670-line audit, and the page carries no JSON-LD blocks — extruct confirms json-ld: 0); with multi-syntax extraction it would yield a **schema.org/LocalBusiness record** with name "Amico Plumbing & Mechanical Inc.", streetAddress "595 N. Westgate Drive", addressLocality "Grand Junction", addressRegion "Colorado", postalCode "81505", telephone "970-241-6258" — verified in extruct's microdata output.

Precision note: the adapter's OG pass does capture `og:description` ("970-241-6258 - 24-hour services. FREE estimates..."), so the phone exists as unstructured prose; what is missed is the **typed** LocalBusiness name/address/telephone record — exactly the facts the OBJECT stage wants without NLP-parsing a marketing sentence. Also of note: 05 and 09 carry 73 and 311 RDFa statements respectively (mostly role/menu vocab noise), so a harvest would need the microdata/RDFa-type filter, not a blind dump.

## 6. Methodology caveats

- Bot-blocking: 2 of 11 pages Cloudflare-blocked curl; the real browser rescued 1 of 2. Bot outcomes depend on IP/reputation, not just rendering.
- Selection bias: hand-picked corpus, trade-site heavy, n=11. Not a random sample of the acquisition workload.
- House-browser state: persistent logged-in Chrome profile (Nolan's) on a residential IP. A clean-room browser could see different bot-block behavior.
- L1 mirror: Python regex approximation of the `node-html-parser` extraction in `static-adapter.ts`, not the TS code itself. Entity decoding differs cosmetically (`&amp;` in titles); field counts are unaffected.
- innerText-vs-strip asymmetry (see Q5 notes): negative deltas on static pages are hidden-text artifacts, not L2 losses.
- Trafilatura/extruct ran offline on saved HTML: deterministic, zero additional requests.
- Respectful load: 2 requests per URL total (1 curl + 1 CDP page load), 2-5s pacing, one tab at a time, no screenshots, no interaction with FB tabs. Research script deleted from the Pig after the run; pip venv removed after analysis. No AGPL/SUL code ever entered `research/`.
- Failing-test (Q9) artifacts were NOT written into PING per the research-only scope; the prose test shapes above are the handoff for the writer phase.
