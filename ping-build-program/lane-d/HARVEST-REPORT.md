# LANE D HARVEST REPORT — WEB ACQUISITION

## PROBLEM

FYD's core loop starts with URL -> OBSERVATIONS, and the acquisition
mechanics were the least-implemented part of the pipeline: PING had a
proven fetch gate (`safe-fetch.ts`), proven structured-data parsing (the
`jsonld` library), and a proven regex extractor, but the ESCALATION LADDER
(HTTP -> JSON-LD -> HTML -> browser -> intelligence) existed only as types
(`AcquisitionAdapter`) plus a design doc. No sufficiency criteria, no
deterministic rung decisions, no per-rung evidence hashing, no stated
conflict rule, no sanitization boundary doc, no hostile-input proof.

## PING ALREADY HAS

(Verified read-only in `/home/nolan/projects/ping`, branch `fyd-factory`.)

- `src/fyd/net/safe-fetch.ts` — the ONE canonical SSRF gate: scheme
  allowlist, credential-URL rejection, per-hop DNS re-resolution, IP
  blocklist (loopback/RFC1918/link-local/multicast/reserved/IPv4-mapped
  CGNAT 100.64/10 incl. 169.254.169.254), manual redirects max 5,
  content-type allowlist, content-length pre-check + streaming abort.
  `safeFetchPage`: text/html, 5MB. Injected DNS/fetch deps: fixture-ready.
- `src/fyd/net/budgets.ts` — `CrawlBudget`/`CrawlLedger` (fail-closed),
  `OriginSemaphore`, `DedupCache`. `src/fyd/net/rate-limit.ts` —
  `TokenBucket`, `GenerationQuota`.
- `src/fyd/proceduralize/structured-data.ts` — JSON-LD via the `jsonld`
  library, offline by design (remote @context refused), deterministic
  blank-node re-keying. The Coppersmith @graph failure is fixed on this path.
- `src/fyd/onboarding/extractor.ts` — regex extractor: strips
  script/style first, bounded loops, tel:/mailto: precedence.
- `src/fyd/proceduralize/ACQUISITION-STACK.md` — the L0-L4 design this
  lane formalizes; decision table already HARVESTs crawl4ai's design and
  Playwright as the L2 engine, REJECTs the Docker server / LLM extraction
  / proxy escalation / robots-off.
- `src/fyd/acquisition/acquisition-adapter.ts` — the types-only contract
  (L0 gate, L1-L3, escalation records, evidenceHash) this ladder implements.

## EXTERNAL CANDIDATES

| Candidate | Version | License | Verdict |
|---|---|---|---|
| crawl4ai (engine design: SSRF validation, declarative request boundary, DomainMapper/AsyncUrlSeeder, 40+ CMP consent list, 3-tier anti-bot *detection*) | 0.9.3 (PyPI) | Apache-2.0 | HARVEST design only (reaffirmed). Never the Python dep in the TS runtime, never the Docker server (RCE/SSRF/file-write advisory history), never its LLM extraction, never proxy/stealth escalation. |
| Playwright (L2/L4 browser engine) | 1.63.0 (npm) | Apache-2.0 | HARVEST as the R4 engine, pinned browser+lib together. Owned by the FYD factory, not this lane. |
| `jsonld` (JSON-LD expansion) | 9.0.0 (npm) | BSD-3-Clause | ADOPT — already adopted by PING; re-proven by this lane (expands Rank Math @graph on the real Coppersmith site; the spike's hand-rolled `@graph` assumption failed and the library path succeeded). |
| `robots-parser` (robots.txt honoring — the gap PING's fetch path still has: types say `requireRobotsTxt: always true`, no implementation) | npm (MIT) | MIT | ADAPT — small, mature, no vendor veto. My spike hand-rolled a minimal parser for the proof; production must use the tested library, not the 40-line version. |
| Firecrawl (SaaS extraction API) | current | proprietary SaaS | REJECT for the production hot path: vendor veto triggers (recurring paid dependency, target URLs + page content in vendor custody, extraction pipeline changes version-to-version = rung decisions stop being reproducible, egress cost at 100k FYDs). Useful as a benchmark reference only. |
| Mozilla Readability (article text extraction) | current | Apache-2.0 | REJECT — wrong tool: article heuristics vs business-homepage evidence. PING's deliberately dumber bounded regex extractor is more predictable and already proven. Harvest nothing. |

## LICENSES

All adopted/harvested components are permissive and compatible with PING's
proprietary tree: Apache-2.0 (crawl4ai design, Playwright), BSD-3-Clause
(jsonld 9.0.0), MIT (robots-parser). No copyleft, no paid licenses, no
license obligations beyond attribution. Nothing in this lane introduces a
new runtime dependency: the only production additions proposed are
`robots-parser` (ADAPT) and the already-present `jsonld` + `playwright`.

## TESTED

- Spike `spike/ladder.mjs` (R0 policy gate, R1 static fetch, R2
  structured-data via `jsonld`, R3 HTML deep parse, sufficiency gate,
  R4/R5/R6 decision points, per-rung input hashing, conflict rule).
- 3 real business sites on production-like egress (PROOF-3-SITES.md):
  Coppersmith (R2 terminal, @graph expanded, phone from JSON-LD),
  Happy Place (R2 terminal), stan.store (R4 escalation-decided on typed
  `CONTENT_BEHIND_CLIENT_RENDER`; byte-identical hash across runs).
- 12 real sites probed; robots blocks (vagaro, linktr.ee) and 403
  anti-bot blocks (cava, warbyparker, beacons.ai) produced typed BLOCKED
  outcomes with no bypass attempts.
- Red team: 23/23 fixture checks pass (REDTEAM.md): script-injection,
  meta-refresh loop, 10MB HTML, gzip bomb, 6-hop redirect chain,
  DNS-rebinding to 169.254.169.254, `javascript:` redirect, fake JSON-LD
  vs visible content, 404 mid-ladder, content mutation between rungs.

## WINNER

**Keep PING's proven pipeline; adopt the formalized ladder around it.**
The winner is not a new dependency — it is the deterministic rung
machinery (ESCALATION-LADDER.md + SANITIZATION-BOUNDARY.md) with PING's
existing components in their proven seats: `safe-fetch.ts` at R0/R1,
`jsonld` at R2, `extractor.ts` semantics at R3, pinned Playwright at R4
(factory-owned), and the sufficiency gate + per-rung hashing + conflict
rule as the new connective tissue.

## ADOPT-ADAPT-REJECT

- ADOPT: `jsonld` 9.0.0 (already in PING; re-proven). The ladder spec
  (ESCALATION-LADDER.md), the sanitization boundary
  (SANITIZATION-BOUNDARY.md), per-rung evidence hashing, the
  CONTENT_CHANGED fail-closed rule, and the conflict rule (both preserved,
  never silently adjudicated at fetch time).
- ADAPT: `robots-parser` (MIT) for the R0 robots.txt implementation gap;
  crawl4ai's 3-tier anti-bot *detection* tiers as the R4 block classifier
  vocabulary; crawl4ai's 40+ CMP consent-dismissal list as the reference
  for the factory's R4 worker.
- REJECT: crawl4ai as a dependency / Docker server / LLM extraction /
  proxy-or-stealth escalation (all previously decided, reaffirmed);
  Firecrawl in the hot path (vendor veto); Readability (wrong tool);
  building a PING crawler platform (explicit non-goal); shipping the
  spike's hand-rolled robots parser to production.

## CODE WE DO NOT NEED TO WRITE

- An SSRF gate (exists, proven, `safe-fetch.ts`).
- A JSON-LD processor (the `jsonld` library; hand-rolling one is how the
  Coppersmith @graph was missed, and the spike re-demonstrated the
  failure mode when it assumed a `@graph` envelope).
- A headless-browser abstraction (Playwright, pinned; factory-owned).
- A crawl frontier/scheduler (budgets.ts covers the bounded case; L3
  discovery is sitemap/RSS-first, not open-web crawling).
- An article-text extractor (Readability) — the bounded regex extractor
  is the right shape for business-homepage evidence.
- A SaaS extraction dependency (Firecrawl) — rejected on determinism,
  custody, and cost grounds.

## MINIMAL PING WRAPPER

The production implementation is a thin, reviewable module behind the
existing `AcquisitionAdapter` types, and it is **the FYD factory's to
write** (this lane owns acquisition mechanics research, not the factory's
pipeline):

```
acquire(request, policy):  // one function, no framework
  R0: safeFetchPage-adjacent policy gate + robots-parser + budgets.ts ledger
  R1: safeFetchPage (already exists) -> evidenceHash
  R2: structured-data.ts (already exists) -> sufficiency gate
  R3: extractor.ts (already exists) -> sufficiency gate
  R4: typed ESCALATE -> factory Playwright worker (pinned 1.63.0)
  R5: sitemap/RSS-first discovery, each page re-enters R0
  R6: observations-only model call, lowest confidence, quoted input
```

New code is only: the sufficiency predicate, the escalation decision
records, per-rung input hashing, the conflict flag, and the meta-refresh/
challenge-page classifiers. Everything heavy already exists.

## FAILURE TEST

`node spike/redteam.mjs` — 23 checks, all passing, runnable offline with
zero network. Covers: injection, refresh loops, oversized bodies, gzip
bombs, redirect chains, DNS rebinding, scheme smuggling, structured-data
conflicts, 404s, and inter-rung content mutation. The factory's R4 worker
must extend this with recorded browser fixtures (challenge-page
classification is the known gap).

## PRODUCT CAPABILITY UNLOCKED

URL -> trusted OBSERVATIONS with a **predictable cost**: the common case
(one fetch + CPU milliseconds, no browser, no tokens) is proven on real
business sites at 762ms-5.5s; the expensive rungs (browser, model) fire
only on typed, recorded gaps. Every observation carries its evidence
hash, rung path, and escalation decisions — so "WHY DID FYD CHANGE" (lane
J) and "trace to evidence" (lane N) have the acquisition leg they need.
The hostile-input boundary (HOSTILE-INPUT-CONTRACT.md +
SANITIZATION-BOUNDARY.md) means the factory can point this at 500 real
business sites without the fetcher becoming the attack surface.

## BYTES-DEPENDENCY COST

- New runtime dependencies proposed: **one** (`robots-parser`, MIT,
  kilobytes). `jsonld` and `playwright` already in PING's tree.
- Per-acquisition cost (proven): R0-R3 = 1 HTTP fetch + CPU ms
  (762ms-5.5s observed); R4 = bounded by `browserWallClockMs`
  (factory-owned); R6 = token ceiling. No per-page SaaS fees, no new
  hosted service, no credential surface. At 10 / 1,000 / 100,000 FYDs
  the cost scales with fetches, not with vendors.
- Spike + docs live in `~/workspace/ping-build-program/lane-d/`; zero
  bytes added to the PING repo by this lane (research artifacts only,
  per the operating model).
