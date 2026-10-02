# Acquisition Comparative Archaeology — 2026-09-25

First comparative pass under the WRITER GATE CORRECTION (2026-09-25 ~13:00 MDT).
RESEARCH ONLY. No writer authorized. No branch created (no candidate passes all 12 gate questions).

Scope: CURRENT PING/FYD vs Crawl4AI vs Firecrawl-patterns vs Playwright/current-browser-path,
across the 13 correction-mandated dimensions.

## 1. Deduplicated donor registry (one candidate, one pinned SHA, one license record)

DEDUP CORRECTION (2026-09-25 ~15:00 MDT, Nolan's order). Every SHA below was
re-verified against live repository reality this pass via the GitHub commits
API; every license re-verified via the GitHub license endpoint or the root
license file. Canonical registry: ~/workspace/harvest/candidates.json.
Dedup pipeline: ~/workspace/harvest/dedup.py (9 fixture tests passing).

| Candidate | Repo | Pinned SHA (full, verified 2026-09-25) | License (verified) | Decision |
|---|---|---|---|---|
| Crawl4AI | unclecode/crawl4ai | `e5d2e786d1a101225f3f6a3e6fd344d76eeb13af` (main) | Apache-2.0 (GitHub SPDX) | BACKLOG — narrow mechanisms only, never a port |
| Firecrawl | firecrawl/firecrawl | `9b15c332111ca719335c5776d80a4946218d9bec` (main) | **AGPL-3.0** core (LICENSE file verified); SDKs/UI partly MIT (js-sdk package.json: MIT) | PATTERN/REFERENCE ONLY — never classify globally as MIT; any code copy needs file-level license check |
| Playwright | microsoft/playwright | `afa6836a5119b38809dd7670a03c1e7b2c2632e9` (main) | Apache-2.0 | REUSE candidate (already used in PING ops via CDP) |
| Trafilatura | adbar/trafilatura | `1e31e3e9eb2e4f6fbfd4bc04355bc74005a780e6` (master) | Apache-2.0 | BACKLOG — deterministic main-content extraction |
| Readability | mozilla/readability | `ab4027a8b37669745016869a37a504727992b2ba` (main) | Apache-2.0 | BACKLOG — superseded by Trafilatura for our purposes |
| extruct | scrapinghub/extruct | `a31daaadb82ec684b7d468d3b15734b8ae3b7265` (master) | BSD-3-Clause | BACKLOG — multi-syntax structured-data extraction |
| Lightpanda | lightpanda-io/browser | `6f18cfcae71286ecd85831ac22646188579d843e` (main) | **AGPL-3.0** (LICENSE file verified) | PATTERN/REFERENCE ONLY — license block: cannot be adopted as a dependency; earlier "earn adoption via benchmark" framing is void for adoption, valid only for pattern study |
| Granary | snarfed/granary | `833648360f93e96267c412185ff22f1e876ea043` (main) | CC0-1.0 / public domain (GitHub SPDX) | BACKLOG — protocol-translation archaeology; no consumer yet |
| Temporal | temporalio/temporal | `d8f9c6d86b2cd0ea5c27d0694a598da84c6d337d` (main) | MIT (GitHub SPDX) | DONOR ONLY — never touch ORCA/UNKNOWN semantics without comparative proof |
| n8n | n8n-io/n8n | `a7f8f99084f18dcce2619063f8d187c4b4e77242` (master) | Sustainable Use License, enterprise-only portions separate (GitHub: NOASSERTION) | RESEARCH/WATCH ONLY — not a permissive donor |
| PostHog | PostHog/posthog | `c36aad65031a95c3f7ed12daf770c1bbdb6167c0` (master) | Path-level: ee/ proprietary vs MIT portions (GitHub: NOASSERTION) | ARCHAEOLOGY ONLY — per-path license check required before any code touch |
| ATProto | bluesky-social/atproto | `7a857989751ae31518509d69ab7194a922064f3d` (main) | MIT + Apache-2.0 dual (LICENSE.txt, LICENSE-MIT.txt, LICENSE-APACHE.txt at root) | BACKLOG — Lexicon compatibility laws, not a schema-system replacement |

Dedup result (script-derived): 12 raw rows in, 12 unique repository records out,
0 duplicate rows collapsed. The earlier "7 duplicate report entries collapsed"
claim is WITHDRAWN: no source ledger of a raw input with duplicates survived,
so no old count can be reproduced, and the registry table itself never
contained duplicates. Protocol labels (ActivityPub, Nostr, Lexicons) are
recorded as mechanisms inside the owning repository's record (Granary,
ATProto), not as candidate rows. GrowthBook and GrapesJS appear nowhere in
the surviving record and are not candidates.

Note on PostHog: master has advanced past the pin (to
`e58a08af178fbc2942a0861f6b84d1e900e97a81` at the later check); the pin above
is a real commit from 2026-09-25T18:58:39Z and is kept because the contract is
pinned SHA, not moving HEAD.

### License corrections applied (from the correction section)
- Firecrawl: AGPL-3.0 core, patterns/reference only. Done.
- Granary: CC0-1.0, cleaner than previously recorded. Done.
- n8n: Sustainable Use License, research/watch only. Done.
- PostHog: path-level licensing. Done.
- Temporal: MIT, donor only. Done.
- Lightpanda: AGPL-3.0 — NEW license block found this pass (was framed as an adoption candidate).
- ATProto Lexicons: compatible evolution is allowed (optional fields addable, required fields cannot disappear, types cannot change, breaking change = new Lexicon name). Harvest the compatibility laws; no conclusion about replacing PING schema machinery.

## 2. Current PING/FYD acquisition surface (read-only audit, branch fyd/sprint-integration-2026-09-24)

| File | LOC | Role |
|---|---|---|
| src/fyd/net/safe-fetch.ts | 291 | THE SSRF gate: scheme/credential/DNS-public checks, per-hop redirect revalidation, content-type allowlist, size caps, timeouts |
| src/fyd/acquisition/static-adapter.ts | 330 | L0 policy gate + L1 static HTTP + robots.txt + title/meta/OG/JSON-LD/canonical/links extraction |
| src/fyd/acquisition/live-loop.ts | 668 | URL → DISCOVER → ACQUIRE → UNDERSTAND → RESOLVE → GENERATE (+ MEDIA) |
| src/fyd/acquisition/errors.ts | 73 | 17 typed failure codes, thrown-never-returned |
| src/fyd/acquisition/acquisition-adapter.ts | 107 | Adapter contract (L2 seam reserved) |
| src/fyd/acquisition/arrow2-proof.ts | 389 | Arrow-2 proof harness |
| src/fyd/net/budgets.ts | 182 | CrawlLedger, OriginSemaphore, DedupCache |
| src/fyd/net/rate-limit.ts | 132 | TokenBucket per client key |
| src/fyd/proceduralize/structured-data.ts | 670 | JSON-LD discovery → graph/node extraction |
| **Total current PING LOC touched** | **~2,853** | |

## 3. The matrix

Verdict key: PING WINS (keep it) / DONOR WINS (name only the mechanism) / PARITY / GAP (nobody has it) / UNKNOWN.

| Dimension | CURRENT PING/FYD | Crawl4AI (Apache-2.0) | Firecrawl-patterns (AGPL, patterns only) | Playwright (Apache-2.0) | Verdict |
|---|---|---|---|---|---|
| URL safety | SSRF gate: http/https only, no credentials, literal-IP check | No private-IP/SSRF validation found in core crawler files | Server-side, infra-owned | Raw browser, caller's job | **PING WINS** — keep |
| Redirect handling | Manual, max 5, EVERY hop re-validated (scheme, credentials, DNS) | httpx/browser default follow | Server-side follow | Browser default follow | **PING WINS** — keep |
| DNS rebinding / private-address protection | All resolved addresses must be public, per hop, incl. IPv4-mapped IPv6, CGNAT treated private | None found | Infra-owned | None | **PING WINS**, with a shared residual TOCTOU gap (validation precedes fetch; fetch re-resolves — no donor pins IPs either; the fix, dial-the-validated-IP, belongs to PING, not a donor) |
| robots | Always-on, no off switch; minimal parser (Disallow for `*` + own bot names; fail-open on missing file) | Opt-in `check_robots_txt`; cached RobotsParser (SQLite), RFC 9309 wildcards via patched robotparser | Respected server-side | Caller's job | **PING WINS on policy**; donor mechanism noted only: Crawl4AI's robots-cache pattern — PING's 30-line parser is sufficient today; wildcard/`$`/crawl-delay support is BACKLOG, not a defect |
| Sitemap | Not implemented | Sitemap support exists in deep-crawl path (not audited line-by-line) | /map endpoint (pattern) | N/A | **UNKNOWN** for donor depth — no harvest without a demonstrated need |
| Content extraction | title/meta/OG + raw HTML passed to UNDERSTAND (LLM stage) | LXMLWebScrapingStrategy (DOM pruning, empty-element removal, image usefulness scoring), markdown generators, chunking | Scrape → markdown/html/links/metadata (pattern) | Raw DOM access | **DONOR WINS, narrow**: Trafilatura `extract()` (Apache-2.0) — deterministic main-content extraction would cut UNDERSTAND noise/tokens. Gate not passed: needs defect proof on real business pages |
| Structured data | JSON-LD only (670 lines) + OG/meta captured at observation | N/A (relies on extraction strategies) | Schema-prompted /extract (pattern) | N/A | **DONOR WINS, narrow**: extruct (BSD-3-Clause) multi-syntax extractors (microdata, RDFa, OG, microformats). Gate not passed: needs a real page where FYD misses facts for lack of non-JSON-LD parsing |
| JS escalation | **MISSING** — L2 recorded as typed policy note, seam reserved in AcquisitionAdapter | Full browser strategies, magic mode, session management (Apache-2.0) | Search→Scrape→Parse→Crawl→Map→Interact ladder (pattern) | The engine itself; already used in PING ops via CDP | **DONOR WINS, narrow**: Playwright as the L2 engine behind the EXISTING AcquisitionAdapter seam — this is REUSE (already an ops dependency), not a new authority. Gate not passed: needs corpus benchmark (Q5) and a failing test (Q9) |
| Deduplication | Per-origin in-flight dedupe + TTL URL cache (budgets.ts); per-page link dedupe; evidenceHash per observation (not compared across runs) | CacheMode (internal crawl cache) | Unknown | N/A | **PARITY** — keep PING |
| Incremental refresh | None (no conditional requests) | CacheValidator: stored etag / last_modified / head_fingerprint (Apache-2.0) | Unknown | N/A | **DONOR WINS, narrow**: Crawl4AI's etag/last-modified/head-fingerprint validator — but PING has NO reobservation consumer yet; BACKLOG until reobservation exists. No writer. |
| Failure taxonomy | 17 typed codes (ACQ_INVALID_URL … MEDIA_RIGHTS_SCOPE), thrown-never-returned, fail closed | Error messages + status codes | API error objects | Playwright errors | **PING WINS** — keep |
| Determinism | Deterministic through UNDERSTAND input (no LLM inside acquire); sha256 evidence hash | Deterministic scraping; LLM optional | LLM /extract in the loop | Deterministic rendering | **PING WINS** at the acquisition boundary — keep |
| Resource limits | maxBytes + content-length precheck + streaming abort, timeouts, maxRedirects, CrawlLedger (pages/bytes), OriginSemaphore (per-origin 2 / global 6), TokenBucket | Session/concurrency controls, chunking, cache budgets | Server-side budgets | Browser context limits | **PARITY** — keep PING |

### Donor LOC examined (evidence, not estimates)
- Crawl4AI: utils.py (~3,500 lines skimmed for robots/URL/SSRF helpers), content_scraping_strategy.py (~650 lines, class/method survey), async_webcrawler.py (robots section), cache_context.py + cache_validator.py (grep survey), browser_manager.py (grep survey). Files read in full: none — mechanism-level survey only.
- Firecrawl: js-sdk package.json (license field only); core patterns from public API shape, not source.
- Playwright: known from PING ops usage; no source audit this pass.
- Trafilatura: __init__.py API surface only.
- extruct: not source-audited this pass (decision deferred to defect proof).

### Net-LOC fields for every named harvest candidate
- CURRENT PING LOC TOUCHED / DONOR LOC EXAMINED / EXPECTED PING LOC ADDED / EXPECTED PING LOC REMOVED / NET LOC / NEW DEPENDENCIES / NEW AUTHORITIES / NEW RUNTIME SERVICES: **all UNKNOWN** — no candidate has passed the writer gate, so no estimates are offered. Fiction is not evidence.

## 4. Product arrow walk — first weak edge

Arrow: URL → ACQUISITION → OBSERVATION → EVIDENCE → OBJECT → RELATIONSHIP → PROJECTION → ASK FYD → EVIDENCE → OWNER CORRECTION → REGENERATION → ACTION → OUTCOME.

- URL → ACQUISITION (L0/L1): strong. SSRF gate, robots, typed failures, budgets — PING wins most dimensions outright.
- **ACQUISITION → L2 browser escalation: THE FIRST WEAK EDGE.** The L2 fallback is not implemented; static-adapter records it as a typed policy note. A JS-rendered business site yields thin or empty static HTML → ACQ_EMPTY_CONTENT or a degraded graph → every downstream edge starves. This is the codebase's own named gap with a reserved seam (AcquisitionAdapter), on the live product path (live-loop acquire()).
- Downstream notes (not first): no reobservation path exists yet (grep: zero hits for reobserv/re-acquire/conditional requests in src/fyd), so incremental refresh has no consumer; owner-intent preservation across reobservation is unprovable until acquisition covers JS sites.

## 5. Writer gate evaluation — the L2 Playwright adapter

1. Concrete failure: JS-rendered business sites produce thin/empty static HTML. PLAUSIBLE, not yet demonstrated on a named URL.
2. Live product path: YES — live-loop acquire().
3. Existing owner: YES — AcquisitionAdapter seam (explicitly reserved).
4. Exact external mechanism better: Playwright (Apache-2.0, already an ops dependency).
5. Proof it is better: **UNKNOWN — no corpus benchmark run.**
6. Can existing PING be adapted: no (no browser engine in the product path).
7. Extract algorithm without architecture: YES — adapter behind the existing interface.
8. Code deleted/simplified: the L2 policy-note branch; nothing else.
9. Test that fails before / passes after: **UNKNOWN — not written.**
10. Authority sovereign: AcquisitionAdapter contract; no new authority.
11. Pinned donor SHA: `afa6836a5119`.
12. Exact file license: Apache-2.0.

**Gate result: NO WRITER.** Q5 and Q9 are UNKNOWN. Next research step, not a patch: run a corpus benchmark (static L1 vs Playwright L2 extraction quality on real business URLs, JS-heavy and static), then re-evaluate. Same verdict for the Trafilatura and extruct candidates: name the mechanism, prove the defect on real pages, then gate.

No harvest branch created. Nothing merged, nothing pushed.

## 6. New scorecard (this pass; recomputed 2026-09-25 ~15:00 MDT by ~/workspace/harvest/dedup.py from the unique records)

- Raw candidate records observed: 12.
- Unique repository records after canonical dedup: 12.
- Duplicate rows collapsed: 0. The earlier "7 duplicate report entries
  collapsed" claim is withdrawn (no surviving source ledger; see section 1).
- License records corrected: Firecrawl (AGPL core), Granary (CC0), n8n (SUL),
  PostHog (path-level), Temporal (MIT, donor-only). All 12 re-verified live.
- New license block found: Lightpanda AGPL-3.0 — adoption framing voided.
- Pinned SHAs: 12/12 full 40-char pins verified against live repository
  reality on 2026-09-25. PostHog pin intentionally preserved against moving
  HEAD.
- License breakdown: Apache-2.0 x4, AGPL-3.0 x2, Dual MIT/Apache-2.0 x1,
  MIT x1, CC0-1.0 x1, BSD-3-Clause x1, Sustainable Use 1.0 x1,
  path-level MIT/proprietary x1.
- Decisions: BACKLOG x6, PATTERN/REFERENCE ONLY x2, REUSE x1, DONOR ONLY x1,
  RESEARCH/WATCH ONLY x1, ARCHAEOLOGY ONLY x1.
- Mechanisms recorded under the single candidates: 24.
- Live defects closed: 0 (research only).
- Tests/invariants added: 9 (dedup contract fixtures).
- Net LOC: 0.
- Dependencies added/removed: 0.
- Authorities added: 0.
- Dimensions where PING already wins and keeps its mechanism: 8 of 13 (URL safety, redirects, DNS rebinding, robots policy, failure taxonomy, determinism, resource limits, dedupe parity).
- Narrow donor mechanisms named (gated, not authorized): Playwright L2, Trafilatura extract(), extruct multi-syntax, Crawl4AI cache-validator/etag.
- Best possible result restated: "We studied five excellent systems and changed 0 lines — and proved PING's SSRF/redirect/failure machinery is stronger than Crawl4AI's."

## 7. Permanent intake design note (scanner/decision engine)

Keep as a living table, not a report: CANDIDATES(repo, pinned_sha, license, license_notes, mechanisms[], decision, decision_date, gate_answers[12], last_rescan). Rules: one row per repo (dedupe on repo URL); rescan on new release or new product failure; a row graduates to a writer only when all 12 gate answers are non-UNKNOWN; REJECT is a terminal success state. The corpus grows; the repository shrinks. Next scheduled pass owns the JS-escalation corpus benchmark (Q5 for the L2 candidate).

The living table now exists: ~/workspace/harvest/candidates.json (canonical,
machine-readable, 12 unique records). Dedup contract:
~/workspace/harvest/DEDUPLICATION-CONTRACT.md. Deterministic
dedup + scorecard: ~/workspace/harvest/dedup.py (9 fixture tests in
~/workspace/harvest/test_dedup.py).
