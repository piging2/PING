# READER LANE 1: ACQUISITION / WEB UNDERSTANDING
Ecosystem harvest sweep, CEO-ORDER-ECOSYSTEM-HARVEST-2026-09-30, binding law from Nolan Geske, 2026-09-30.
Read-only reconnaissance. Nothing installed, no dependencies added, no authorities/stores/services created, no repo modified.

Report date: 2026-09-30 ~18:10 MDT. Author: Reader Lane 1 (subagent).

## 1. Where I searched and what I found

- `/home/nolan/projects/ping`: UNREACHABLE from this sandbox (no such directory; this VM is /home/hatch, not the Pig). Not searched further.
- `/home/nolan/projects/ping-fyd-converged`: UNREACHABLE (same reason).
- `~/workspace/lane-p01/tree`: SEARCHED. Synced copy of the Pig FYD-repo vocab-ssrf tree (inventory note: sha256 of `src/fyd/net/safe-fetch.ts` identical to Pig `/home/nolan/projects/ping` HEAD blob 694d2059de6047e0a5b5cefb4ce306e38534b2bcbfe8de313ddc77cf39435005). Contains the full FYD acquisition implementation: `src/fyd/acquisition/` (adapter types, static adapter, live loop, arrow2 proof, errors), `src/fyd/net/` (safe-fetch, budgets, rate-limit), `src/fyd/proceduralize/` (structured-data, microdata, vocabulary, feed-parser, generator, proceduralizer), plus ACQUISITION-STACK.md (the lane's own 2026-09-21 evaluation of Crawl4AI 0.9.3 and Playwright 1.63.0).
- `~/workspace/acquisition-seam`: SEARCHED. LANE ACQ-1 (2026-09-24) deliverable: `acquire-url.ts` (the single SSRF-hardened seam, zero deps beyond node stdlib), `hostile-battery.ts`, `battery-results-2026-09-24.txt` (58/58 pass), README with adoption plan.
- `~/workspace/crx-audit`: SEARCHED (index + 07-harvest-ledger). The CRX audit covered memory, MCP, and observability only. NO acquisition/web-understanding implementation found in CRX; its external harvest candidates were OTel shapes, idempotency patterns, and Pino. Nothing harvestable for this lane.
- `~/workspace/fyd-lane/net/safe-fetch.ts`: SEARCHED. Earlier copy of the FYD SSRF fetch module.
- `~/workspace/ts-spaces/lightpanda-research`: SEARCHED. Internal Lightpanda evaluation dated 2026-09-15 (recommendation: pilot one sweep behind automatic fallback; Lightpanda first, Chromium fallback; fallback rate under ~20% before expanding).
- PING existing implementation: from this sandbox, the freshest reachable PING-side evidence IS the FYD tree on the Pig, mirrored in lane-p01. I treat "PING EXISTING" as that implementation (they are the same codebase: the Pig repo is `/home/nolan/projects/ping` containing `src/fyd/*`). No separate PING acquisition subsystem was found or claimed.

## 2. FYD CURRENT (the baseline every candidate is measured against)

FYD already owns a complete, policy-gated acquisition stack. The pieces, all found in the searched trees:

**HTTP/SSRF layer (two parallel implementations, convergence already on the record).**
`src/fyd/net/safe-fetch.ts` (repo, updated by commit 0264d517, 2026-09-28, vocab-ssrf) and `acquire-url.ts` (LANE ACQ-1 seam, 2026-09-24). Guard set: http/https only, credential-bearing URLs rejected, per-hop DNS resolution with every address required public (loopback, RFC1918, link-local incl. 169.254.169.254, unique-local, multicast, reserved, 0/8, 198.18.0.0/15, CGNAT 100.64/10, doc ranges, IPv4-mapped/translated IPv6 all rejected; DNS failure is fail-closed), IP pinning closes the DNS-rebinding TOCTOU on the direct path, manual redirect following (5 hops, every hop re-validated), per-hop 20s timeout, content-type allowlist checked before buffering, content-length pre-check plus aborting streaming cap (15MB), explicit egress-proxy transport with no env sniffing. 58/58 hostile battery passes. LANE ACQ-1's adoption plan already says: converge safe-fetch and acquire-url into ONE seam (delete the duplicate logic). That convergence is on the record; my lane adds nothing except that external evidence now strengthens the case (see Crawl4AI below).

**Acquisition stack (L0-L4 escalation).** `src/fyd/acquisition/acquisition-adapter.ts` (typed interface), `static-adapter.ts` (L0 policy gate + L1 static HTTP implemented), `live-loop.ts`, `errors.ts`, `arrow2-proof.ts`. L0: canonicalization, scheme/userinfo checks, DNS-public, registrable-domain allowlist, robots.txt honored with NO public off switch, per-domain rate limiting, descriptive user agent. L1: single GET through the SSRF gate, HTML/feeds only, title/meta/OG/JSON-LD/links via node-html-parser plus `discoverStructuredData`. Observations carry provenance: url, finalUrl, redirectChain, fetchedAt, statusCode, contentType, bytes, levelUsed, evidenceHash (sha256 of raw bytes), policyNotes, typed escalation record. L2 (browser fallback): NOT implemented; recorded as typed policy note instead of silently skipped. L3 bounded discovery: page/depth budgets typed but discovery unimplemented. L4: AI interpretation last-resort on observations only.

**Web understanding.** `src/fyd/proceduralize/`: JSON-LD discovery via the real `jsonld` library v9.0.0 (offline by design, schema.org context rewritten to inline @vocab, remote contexts refused; deterministic blank-node rekeying by content hash), microdata extraction with a schema.org vocabulary gate, `feed-parser.ts` (RSS/Atom), `vocabulary.ts` (entity-type classification), `proceduralizer.ts` (deterministic fact extraction). The code comments cite the failure that motivated the jsonld library: the old hand-rolled flattener silently dropped the entire Rank Math @graph on the Coppersmith site.

**Browser path.** Playwright is the intended L2 engine per ACQUISITION-STACK.md (2026-09-24 standing), `playwright-core ^1.63.0` pinned in the transfer pw-env, `@playwright/test ^1.63.0` in the repo devDependencies, and Playwright-over-CDP (:9223 house browser) is the operational pattern proven in engagement and proof work. No acquisition L2 adapter implementation exists yet.

**Identified gap (the only functional hole in L1):** no boilerplate-stripped main-content extraction. The L1 adapter emits title/meta/links/JSON-LD but its visible-text producer is raw DOM text via node-html-parser. There is no Readability-class library in the dependency tree.

## 3. Candidate evaluations

Each follows the mandated shape: PRODUCT NEED -> FYD CURRENT -> PING EXISTING -> CRX HARVESTABLE -> EXTERNAL -> REACHED/UNREACHED -> DUPLICATION RISK -> SECURITY/TRUST BOUNDARY -> SMALLEST DELTA -> verdict.

### Candidate A: Crawl4AI (current: 0.9.4, released 2026-09-23)

PRODUCT NEED -> A hardened crawl engine covering crawl planning, dynamic escalation (HTTP to browser), structured extraction, anti-bot detection, cache/revalidation, and provenance capture.

FYD CURRENT IMPLEMENTATION -> FYD has the L0-L4 escalation design and L0/L1 implemented natively in TypeScript (see section 2). The 2026-09-21 ACQUISITION-STACK.md already evaluated Crawl4AI 0.9.3: verdict HARVEST the design patterns (SSRF destination validation, declarative request trust boundary, DomainMapper/AsyncUrlSeeder discovery patterns, Shadow DOM flattening, 40+ CMP consent-dismissal list, 3-tier anti-bot detection tiers as telemetry), REJECT the Docker server, REJECT LLM extraction, REJECT anti-bot proxy escalation/stealth, REJECT building a crawling platform.

PING EXISTING IMPLEMENTATION -> Same as FYD current (shared tree on the Pig; no separate PING crawler found).

CRX HARVESTABLE IMPLEMENTATION -> None found (CRX audit covered memory/MCP/observability only).

EXTERNAL IMPLEMENTATION -> Crawl4AI 0.9.4 (PyPI, 2026-09-23), Apache 2.0, verified from the official GitHub release notes and CHANGELOG. This release closes three coordinated-disclosure advisories: (1) SSRF via robots.txt: the `check_robots_txt` fetch could make the server fetch internal addresses; (2) SSRF via link preview: the URL seeder fetched internal links and returned their <head> to the caller; (3) config gate bypass: a `{"type": "dict"}` wrapper let a forbidden LLMConfig through, letting a non-admin API client read server environment variables. The release notes state the shared root cause verbatim: "The Docker server sends every attacker-influenced fetch through one egress rule... The browser, the PDF downloader, and the job webhook all went through it. The robots.txt check and the URL seeder did not. They used their own HTTP clients." Both SSRF paths now route through the server's pinning egress proxy. Also new: PruningContentFilterLXML (10x faster pruning, now default). Prior release 0.9.3 (August 2026) closed five advisories, four in the PDF path (arbitrary file write, SSRF via PDF redirects, unbounded PDF DoS, XSS in cleaned_html) and one DOM XSS in the Playground. The prior-intelligence claim (0.9.4+ fixed SSRF paths and an env-var trust-boundary leak) is CONFIRMED from primary sources.

REACHED/UNREACHED -> REACHED (official release notes, CHANGELOG, SECURITY.md read; nothing executed, no live crawl run).

DUPLICATION RISK -> High if taken as a dependency (it would duplicate FYD's L0/L1/L2 semantics in Python behind a second network surface); zero if kept to design harvest.

SECURITY/TRUST BOUNDARY -> The 0.9.4 root-cause statement is the argument for FYD's single-seam law: even Crawl4AI's own security-hardened team shipped per-component HTTP clients that bypassed their own egress rule twice (robots.txt, seeder), and a config-gate bypass leaked env vars to non-admin clients. Any FYD use of the Docker server would add an authenticated network surface with a demonstrated advisory cadence (5 in 0.9.3, 3 in 0.9.4, both security releases one month apart). The library path would pull a Python runtime plus browser toolchain into the TypeScript process: a dependency, not a harvest.

SMALLEST DELTA -> None in code. Port the patterns on the existing HARVEST list into FYD's own adapter: the pinned CMP consent-dismissal list (for the future L2), shadow-DOM flattening technique, the 3-tier anti-bot detection tiers as honest block telemetry (detection only, never the proxy escalation), the seeder/sitemap-first discovery ordering (for L3). Keep the L0-L4 semantics FYD already owns.

ADAPT (design patterns only; REJECT the library and REJECT the Docker server). Justification: 0.9.4's own postmortem proves the failure class FYD's one-seam law exists to prevent; importing the dependency would reintroduce exactly that class.

### Candidate B: Playwright (current: 1.63.0)

PRODUCT NEED -> A real renderer for the L2 browser-rendered fallback: bounded, deterministic, evidence-grade page rendering when L1 static fetch is insufficient (typed gaps like EMPTY_BODY_AFTER_JS, CONTENT_BEHIND_CLIENT_RENDER, SHADOW_DOM_CONTENT).

FYD CURRENT IMPLEMENTATION -> Design-doc verdict is already HARVEST-as-L2-engine: pinned playwright + pinned browser build together, visible-only locators and aria snapshots for deterministic extraction, deterministic CMP dismissal from a pinned list, wall-clock budget per page, blocks detected and recorded as evidence, never proxied/stealthed around. Not yet implemented as an acquisition adapter; operational precedent exists (Pig CDP :9223 house browser for engagement/proof work, pw-env playwright-core ^1.63.0).

PING EXISTING IMPLEMENTATION -> Same operational Playwright-over-CDP pattern (shared tooling).

CRX HARVESTABLE IMPLEMENTATION -> None found.

EXTERNAL IMPLEMENTATION -> Playwright 1.63.0 (npm, September 2026), verified against the official release notes by the FYD lane. Test-focused release (named test locks, frameLocator improvements, Locator.visible, tracing ariaSnapshots/screenSnapshots). Scraping-relevant: visible-only locators and aria snapshots are the two primitives the L2 design already names. Ecosystem caution confirmed in the design doc: 1.63 renamed tracing capture parameters on the wire and silently broke third-party drivers until pinned, so playwright and its browser build must be pinned together.

REACHED/UNREACHED -> REACHED (official release notes; version verified via npm by the FYD lane; no live browser launched for this lane's evaluation).

DUPLICATION RISK -> None. It fills the explicitly-open L2 slot; the AcquisitionAdapter interface was designed for exactly this engine.

SECURITY/TRUST BOUNDARY -> Local process, no third party. The trust boundary is the target page itself: rendered content is hostile (XSS into extraction pipelines, prompt injection into any downstream model). FYD's design already contains this: AI interpretation is L4 on observations only, extracted text never enters an instruction channel unquoted, no login/form submission/interaction beyond deterministic consent dismissal, no cross-acquisition state (no cookie jar, no profile reuse), each acquisition starts clean.

SMALLEST DELTA -> Implement the L2 adapter behind the existing AcquisitionAdapter interface: one bounded render function (wall-clock budget, per-acquisition timeout), visible-only locator extraction + aria snapshot, CMP dismissal from the pinned list, output the same AcquiredObservation shape with levelUsed=2 and the escalation reason recorded. Estimated small, reviewable, and testable against the existing hostile fixtures pattern. No new authority: the adapter consumes the same L0 policy gate and the same SSRF-vetted navigation.

ADOPT (pinned, scope-locked to L2 behind the existing interface). Justification: it is the already-decided L2 engine, the interface seam already exists, and the delta is a bounded implementation of a designed slot, not a new subsystem.

### Candidate C: Lightpanda (Zig headless browser, CDP-compatible)

PRODUCT NEED -> A cheap middle tier between static HTTP and full Chromium: high-concurrency public-page rendering for JS-lite text extraction, relieving pressure on the Chromium queue.

FYD CURRENT IMPLEMENTATION -> No Lightpanda usage. FYD's acquisition has L1 (static) and a designed-but-unbuilt L2 (Playwright/Chromium). Prior internal research (~/workspace/ts-spaces/lightpanda-research, 2026-09-15) already evaluated it for a different workload and recommended: "Pilot one sweep behind an automatic fallback. Keep Chromium as the authority for high-fidelity and authenticated work." Suggested gate: fallback rate under ~20% before expanding; bind CDP to loopback; disable telemetry; never copy session state into the pool.

PING EXISTING IMPLEMENTATION -> None found.

CRX HARVESTABLE IMPLEMENTATION -> None found.

EXTERNAL IMPLEMENTATION -> lightpanda-io/browser on GitHub, ~34.4k stars (secondary source). Status per its own README and multiple independent evaluations (2026-03 to 2026-09): BETA, with the project's own warning that errors and crashes remain possible. AGPL-3.0 license (legal review required before any networked/served use; noted in both internal research and external evaluations). Zig-built, V8 JS engine, partial Web API coverage, no layout engine, CDP and WebDriver BiDi endpoints so existing Playwright/Puppeteer code can target it. Vendor benchmark claims: ~9x faster, ~16x less memory than Chrome on its own 100-page benchmark (treated as vendor claims by every evaluator). Independent evaluations: roughly 5% of sites crash (go-code evaluation, secondary), React/Vue/Angular SPAs routinely fail (secondary), screenshots and PDFs explicitly unsupported (secondary), CDP compatibility still WIP with caveats (multiple evaluators, March 2026 nightly builds). Telemetry on by default (disable via documented env flag). On the prior-intelligence claims: "promising but immature" CONFIRMED (beta status, partial APIs, crash reports). "OOM reports": NOT verified as a Lightpanda-side problem; the evidence found points the other way (case studies of migrations FROM Chromium TO Lightpanda reducing OOM kills and infra cost). "Incomplete Playwright/CDP compatibility": CONFIRMED by multiple independent evaluations.

REACHED/UNREACHED -> REACHED via secondary evaluations and the internal 2026-09-15 research; official repo not fetched in this pass, no live run.

DUPLICATION RISK -> Medium if adopted as an acquisition tier now: it would add a second renderer with different fidelity characteristics behind the same evidence contract, and any observation it produces would need Chromium re-verification to be evidence-grade, which is the pilot's own admission.

SECURITY/TRUST BOUNDARY -> AGPL-3.0 is the hard boundary (source-disclosure obligations if served over a network; needs legal clearance first). Beta crash surface plus partial Web APIs mean its output cannot be evidence-grade without a Chromium truth gate, which defeats the cost argument until the fallback rate is proven low. Telemetry default-on is a data-egress consideration.

SMALLEST DELTA -> Zero code now. The pre-existing pilot plan (2026-09-15) already defines the only acceptable entry: one boring public-page sweep, pinned build, Lightpanda first with automatic Chromium fallback, fallback-rate gate under ~20%, content-fidelity spot checks. FYD's target corpus (small home-service business sites, mostly static or template-built) is the friendliest possible workload, so the pilot is cheap to run when the time comes.

LEARN (REFERENCE for the tier-routing idea: HTTP -> JS-lite -> Chromium -> managed, cheapest capable browser first). Justification: beta status, AGPL gate, and incomplete CDP compatibility make it unfit as an evidence producer today; the internal pilot plan already exists and should not be re-litigated.

### Candidate D: Firecrawl (managed extraction API + AGPL self-host)

PRODUCT NEED -> One-call page-to-markdown/JSON extraction with automatic JS rendering, site crawl/map, and LLM structured extraction.

FYD CURRENT IMPLEMENTATION -> FYD owns the fetch and the structured extraction deterministically (sections 2). The only gap is boilerplate-stripped main content (Candidate G). Firecrawl's hosted /scrape and /extract would duplicate both owned layers.

PING EXISTING IMPLEMENTATION -> None found.

CRX HARVESTABLE IMPLEMENTATION -> None found.

EXTERNAL IMPLEMENTATION -> firecrawl.dev hosted API (freemium: 500-1000 credits/month free tier per secondary sources, September 2026; paid from $19/month). Self-hosted core: AGPL-3.0, Docker Compose stack of roughly five services (API server, queue workers, Playwright microservice, Redis, Postgres), ~8GB RAM recommended (secondary sources). Endpoints: /scrape, /crawl, /map, /search, /extract (LLM-powered, now succeeded by /agent), MCP server with ~25 tools. ~179k GitHub stars claimed by a secondary source (unverified against the repo; recorded as unverified).

REACHED/UNREACHED -> REACHED via secondary sources and self-host deployment docs; official repo/docs not fetched in this pass; pricing from secondary sources, not the official pricing page.

DUPLICATION RISK -> High. Hosted use duplicates FYD's L0/L1 and the proceduralizer; self-host duplicates the entire acquisition stack plus adds Redis/Postgres/Playwright operations.

SECURITY/TRUST BOUNDARY -> Hosted: every target URL and every page's content transits a third party, and FYD's egress policy (section 2) is explicit that observations stay tenant-scoped with provenance recorded at the adapter boundary. A third-party fetch path is a second fetch path, which the URL TRUST directive forbids. Self-host: AGPL-3.0 for the engine, and an operational surface (multi-container, Redis health, Playwright workers) that FYD has no reason to operate when it already owns the primitives. The LLM extraction endpoint also contradicts the L4 design (AI interpretation after deterministic extraction, on observations only, lowest confidence tier).

SMALLEST DELTA -> None. The only harvestable item is API-shape ideas (scrape/crawl/map/extract response envelopes), which FYD's AcquiredObservation already covers more rigorously (evidenceHash, escalation record, policyNotes).

REJECT as dependency or service; REFERENCE for API response-shape ideas only. Justification: third-party content path violates the one-seam law, and the self-host weight buys nothing FYD does not already own.

### Candidate E: Browserbase (managed headless Chromium over CDP)

PRODUCT NEED -> Production browser fleet without operating one: isolated Chromium sessions over CDP, stealth, proxies, CAPTCHA solving, session recordings.

FYD CURRENT IMPLEMENTATION -> FYD already operates Playwright against a house browser over CDP and pins playwright-core for the L2 design. The fleet-operations problem Browserbase solves (concurrency, session lifecycle, fleet health) does not exist at FYD's acquisition scale (bounded, per-acquisition, page budgets in the tens).

PING EXISTING IMPLEMENTATION -> The Pig house-browser pattern already covers the "browser as a service I control" need.

CRX HARVESTABLE IMPLEMENTATION -> None found.

EXTERNAL IMPLEMENTATION -> Proprietary SaaS (secondary sources, September 2026): REST control plane creates sessions, Playwright/Puppeteer drive over wss CDP. Stealth fingerprinting, residential proxies, CAPTCHA solving, session recording/replay, persistent contexts. Pricing per browser-hour (Startup $99/month for 500 hours per secondary sources). SOC 2 Type II.

REACHED/UNREACHED -> REACHED via secondary sources; official docs/pricing not fetched in this pass.

DUPLICATION RISK -> Medium: it would replace owned Playwright-over-CDP with a rented equivalent.

SECURITY/TRUST BOUNDARY -> All acquisition traffic and any session state transit third-party infrastructure: a second egress path outside the FYD adapter boundary. Worse, its headline value-adds (stealth fingerprinting, proxy rotation, CAPTCHA solving) are the exact capabilities FYD's policy REJECTS: "detect and report blocks honestly; never escalate with proxies or stealth profiles. A blocked page is evidence of a block, not a problem to route around." Adopting Browserbase would mean paying for the circumvention features FYD refuses to use.

SMALLEST DELTA -> None. If fleet operations ever become the bottleneck, the first move is the existing house-browser pattern scaled, not a SaaS.

REJECT. Justification: proprietary third-party egress path plus a value proposition (stealth/anti-bot) that directly contradicts FYD's standing anti-circumvention policy.

### Candidate F: Scrapy (Python crawl framework)

PRODUCT NEED -> Mature crawl orchestration: request scheduling, politeness (robots.txt, throttling, crawl-delay), deduplication, depth limits, retries, feed exports, HTTP caching.

FYD CURRENT IMPLEMENTATION -> FYD has robots.txt honoring (stricter: no off switch), per-domain rate limiting (`src/fyd/net/rate-limit.ts`), budgets (`budgets.ts`), manual redirect bounds, and typed page/depth budgets. It lacks adaptive throttling and a proven URL-deduplication design (L3 discovery is unimplemented, so the need is latent, not current).

PING EXISTING IMPLEMENTATION -> None found.

CRX HARVESTABLE IMPLEMENTATION -> None found.

EXTERNAL IMPLEMENTATION -> Scrapy (Python, BSD-3), current line 2.18.x per secondary sources. Verified from official docs: ROBOTSTXT_OBEY exists but library-level defaults are ROBOTSTXT_OBEY=False and DOWNLOAD_DELAY=0 (the startproject scaffold sets True/1; two sets of defaults, a documented footgun). AutoThrottle extension adapts delay to measured latency; CONCURRENT_REQUESTS defaults 16 (high for small targets). Official docs warn it does NOT act on robots Crawl-delay/Request-rate directives (translate manually into delays). Interactive shell for selector proving, feed exports (JSON/CSV/XML, stable field order since 2.18.0), media pipeline, caching DNS resolver, HTTP cache middleware. Crawlee (Apify) is the newer entrant in the same slot with autoscaling concurrency and a 429/crawl-delay-reactive throttling manager.

REACHED/UNREACHED -> REACHED via official docs and secondary migration guides; no code executed.

DUPLICATION RISK -> High as a dependency (Python runtime in a TypeScript system; would duplicate the owned L0/L1); zero as a pattern source.

SECURITY/TRUST BOUNDARY -> As a dependency it would be a second fetch implementation outside the SSRF seam: unacceptable under the one-seam law. As a pattern source there is no boundary crossed.

SMALLEST DELTA -> None in code. Study two patterns when L3 discovery is built: (1) AutoThrottle's latency-adaptive backoff as the model for per-domain politeness beyond FYD's fixed rate limits; (2) the dupefilter + HTTP-cache-middleware pairing for request deduplication and citable raw-response retention. Note FYD's existing stance is already stricter than Scrapy's defaults (robots required, no off switch), so the harvest is the adaptation algorithm and the cache design, not the policy.

LEARN (patterns only; the Python dependency is REJECTED by the runtime boundary). Justification: FYD already owns stricter politeness policy; only the adaptive-throttle and dedup/cache algorithms are worth studying when L3 is built.

### Candidate G: Structured extraction, JS-native (@mozilla/readability) vs Trafilatura vs Extruct

PRODUCT NEED -> The one functional gap in FYD's L1: boilerplate-stripped main-content extraction (article body text with structure preserved) so the L1 sufficiency gate can judge "does this page answer the site-object questions" on cleaned content rather than raw DOM text.

FYD CURRENT IMPLEMENTATION -> JSON-LD via the real `jsonld` library v9.0.0 (offline, deterministic), hand-rolled microdata with vocabulary gate, feed parsing via fast-xml-parser, node-html-parser for title/meta/links. No Readability-class extractor anywhere in the tree (the only "readability" hits are test fixture names).

PING EXISTING IMPLEMENTATION -> None found beyond the shared FYD tree.

CRX HARVESTABLE IMPLEMENTATION -> None found.

EXTERNAL IMPLEMENTATION ->
- @mozilla/readability (npm): the original JavaScript implementation (Firefox Reader View), Mozilla Public License 2.0. Scores elements by text density/link ratio, strips nav/ads/chrome, returns title, content, textContent, excerpt, byline. Independent September 2026 evaluation (sanand0/research, 20-page corpus): tied first at 79/100 overall with trafilatura/readability-lxml, and the winner on heading-ID preservation and cleanliness among the JS options. Pure JS, zero native dependencies, runs on any DOM (works with node-html-parser or linkedom documents, no browser needed).
- Trafilatura (Python): best reported F1 (0.937 per secondary sources), very fast (0.08s avg in the same evaluation), but Python-only. Wrong runtime for FYD; porting its heuristics to TS would be a rewrite, not a harvest.
- Extruct (Python): unified JSON-LD/microdata/RDFa/OpenGraph/microformats extraction. FYD already owns this layer deterministically (jsonld lib + microdata.ts + vocabulary gate); nothing to take.

REACHED/UNREACHED -> REACHED (npm package identity and license from the Mozilla repo lineage; evaluation results from the September 2026 independent benchmark; Trafilatura/Extruct from official docs via secondary sources; no code executed).

DUPLICATION RISK -> None for @mozilla/readability: it fills the identified L1 gap and does not overlap the JSON-LD/microdata/feed pipeline. Trafilatura/Extruct would duplicate owned code.

SECURITY/TRUST BOUNDARY -> @mozilla/readability is a pure function over an already-fetched DOM string: no network, no env access, no native code. It operates inside the existing trust boundary (content already passed the SSRF gate). Output is still untrusted extracted text and keeps the existing provenance (evidenceHash of raw bytes, levelUsed). MPL-2.0 as a dependency is file-level copyleft; it does not infect the application.

SMALLEST DELTA -> One npm dependency plus a thin wrapper in the L1 adapter: parse HTML (already done via node-html-parser or a Readability-compatible DOM), run Readability, emit `mainContent` (text + structured HTML) on the AcquiredObservation for the sufficiency gate and the proceduralizer. Estimated tens of lines. It completes the L0-L4 contract's "deterministic parse" step without any LLM.

ADOPT (@mozilla/readability, npm, pinned). Trafilatura: LEARN (algorithm ideas only, wrong runtime). Extruct: REJECT (FYD's structured-data layer already supersedes it deterministically). Justification: this is the single missing commodity primitive in FYD's acquisition stack, it is the original implementation of the algorithm, and the delta is one small dependency.

## 4. Answer: what code can be deleted or never written

NEVER WRITE:
- A crawling platform. Already REJECTED in FYD's own design doc; every candidate re-confirms it (Crawl4AI would duplicate L0-L4 in Python; Firecrawl self-host adds five containers to re-own owned primitives; Scrapy is the wrong runtime).
- LLM extraction at acquisition time. L4 already covers AI interpretation after deterministic extraction, on observations only, lowest confidence tier. Crawl4AI's and Firecrawl's LLM endpoints are the pattern to keep out.
- A second fetch path anywhere, ever. Crawl4AI 0.9.4's postmortem is the industry proof: their robots.txt fetch and their seeder used their own HTTP clients and both became SSRF advisories. FYD's one-seam law (acquire-url.ts / safe-fetch.ts convergence) is the correct architecture, and the convergence already on the record should complete.
- A hand-rolled JSON-LD processor or microdata parser. Already replaced (jsonld v9.0.0 + microdata.ts with vocabulary gate); the Rank Math @graph drop is the standing cautionary tale.
- Stealth, proxy escalation, CAPTCHA solving, or any anti-bot circumvention. Policy already REJECTS; Browserbase's value proposition is the negative proof.
- A managed-browser SaaS integration. Playwright over CDP is already owned and operated.

DELETE (already on the record, restated with new supporting evidence): converge `src/fyd/net/safe-fetch.ts` and the LANE ACQ-1 `acquire-url.ts` into exactly one seam per the URL TRUST directive (LANE ACQ-1 README section "Adoption", step 2). The 0.9.4 advisories show that parallel fetch implementations drift into SSRF; FYD currently has two. This is a writer task, not a reader task; recorded here as the lane's duplication finding.

ADOPT (write the small deltas):
1. @mozilla/readability (npm, pinned): the L1 main-content primitive. Tens of lines.
2. Playwright (pinned with its browser build, 1.63.x line): the L2 render adapter behind the existing AcquisitionAdapter interface. Bounded implementation of a designed slot.

## 5. Ranked candidates

1. Playwright 1.63: ADOPT. The already-decided L2 engine; pin browser build with the library; implement the bounded L2 adapter behind the existing AcquisitionAdapter interface (visible-only locators, aria snapshots, deterministic CMP dismissal, blocks recorded as evidence).
2. @mozilla/readability (npm, MPL-2.0): ADOPT. The single missing commodity primitive: boilerplate-stripped main content for the L1 sufficiency gate; pure JS, zero native deps, no network, one small dependency.
3. Crawl4AI 0.9.4: ADAPT (patterns only). Harvest the CMP list, shadow-DOM flattening, anti-bot detection tiers as telemetry, and seeder-first discovery ordering; its 0.9.4 SSRF postmortem validates FYD's single-seam law and rules out the dependency and the Docker server.
4. Scrapy: LEARN. Study AutoThrottle's latency-adaptive backoff and the dupefilter/HTTP-cache pairing when L3 discovery is built; the Python dependency is out of scope and FYD's robots policy is already stricter.
5. Lightpanda: LEARN (REFERENCE for tier-routing). Beta, AGPL-3.0 legal gate, incomplete CDP compatibility; keep the existing pilot plan (Lightpanda first, automatic Chromium fallback, sub-20% fallback gate) and write no code until beta stabilizes and legal clears AGPL.
6. Firecrawl: REJECT (REFERENCE for API response-shape ideas only). Hosted = third-party content path violating the one-seam law; self-host = five containers to re-own owned primitives.
7. Browserbase: REJECT. Proprietary SaaS egress path whose headline features (stealth, proxies, CAPTCHA solving) directly contradict FYD's standing anti-circumvention policy.

## 6. Verification notes and limits

- Crawl4AI 0.9.4 facts (three advisories, shared root cause, env-var leak via LLMConfig dict wrapper, PruningContentFilterLXML) verified against the official GitHub release notes, CHANGELOG, SECURITY.md, and PyPI page. Release date 2026-09-23 per the changelog.
- Lightpanda beta status, AGPL-3.0, ~34.4k stars, vendor 9x/16x benchmark claims, ~5% crash rate, SPA failures, CDP WIP: from the project's own README via evaluators plus four independent evaluations (godex spec, go-code investigation, check_cep lessons, mouse-mcp evaluation) and the internal 2026-09-15 research. No live run performed; vendor numbers treated as claims.
- The "OOM reports" prior intelligence could not be verified as a Lightpanda-side defect; evidence found points the opposite direction (migrations from Chromium to Lightpanda reducing OOM pressure).
- Firecrawl/Browserbase pricing, tiers, and star counts are from secondary sources (September 2026); not verified against official pricing pages. Star counts recorded as unverified.
- Scrapy defaults (ROBOTSTXT_OBEY=False library-level, CONCURRENT_REQUESTS=16, no Crawl-delay action) verified against official Scrapy docs.
- @mozilla/readability evaluation scores from the September 2026 independent benchmark (sanand0/research); not re-run.
- FYD implementation facts from files read in ~/workspace/lane-p01/tree (synced Pig copy, sha256-verified identity) and ~/workspace/acquisition-seam. The Pig repos themselves were unreachable from this sandbox; per standing repo law, Pig-local state is authoritative and the synced copy is the freshest reachable evidence.
- No code was executed against live targets; no live crawl or browser launch was performed for this evaluation.
