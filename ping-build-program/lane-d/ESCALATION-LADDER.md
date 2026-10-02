# WEB ACQUISITION ESCALATION LADDER (lane D, v1)

Status: spec + minimal spike proven 2026-09-23. Reconciles Nolan's directive
(HTTP -> JSON-LD -> HTML -> browser -> intelligence) with the existing PING
design (L0-L4 in `src/fyd/proceduralize/ACQUISITION-STACK.md` and the
types-only `AcquisitionAdapter` in `src/fyd/acquisition/acquisition-adapter.ts`).
This ladder is the per-PAGE rung sequence; multi-page discovery (L3) re-enters
the ladder per page. It KEEPS the proven PING pipeline (safe-fetch gate,
jsonld library, regex extractor) and formalizes the parts PING only had as
types: sufficiency criteria, rung determinism, evidence per rung, cost budgets.

## Rung 0: POLICY GATE (no content fetch)

- Entry: every acquisition, every redirect hop, every discovered page.
- Work: URL canonicalization (lowercase host, strip fragment, drop default
  ports, reject malformed; credential-bearing URLs rejected); scheme
  allowlist (http/https only); SSRF defense (resolve hostname per hop,
  reject loopback/RFC1918/link-local/multicast/reserved/IPv4-mapped
  equivalents/CGNAT 100.64/10 incl. 169.254.169.254); domain policy (seed's
  registrable domain allowed, others only from explicit allowlist);
  robots.txt fetch + honor (disallow, crawl-delay) -- NO off switch;
  per-domain rate limit; descriptive UA (`FYD-SocialBot/1.0` style).
- Exit OK: `PolicyDecision{allowed:true, normalizedUrl}` -> proceed to R1.
- Exit BLOCKED: terminal for this URL. Typed reason mapped to the lane-K
  13-class taxonomy. NEVER retried via another mechanism (no proxy
  escalation, no stealth UA, no IP-swap retry).
- Cost: one robots.txt GET per origin per TTL (cached), DNS lookups.
  Deterministic on (canonical URL, DNS answers, robots bytes).

## Rung 1: HTTP STATIC FETCH (the only rung that touches the network for content)

- Entry: R0 allowed.
- Work: single GET through the SSRF gate semantics of `src/fyd/net/safe-fetch.ts`:
  manual redirects (max 5, every hop re-runs R0), `text/html` (plus feed/
  sitemap types only when that is the requested resource), content-length
  pre-check + streaming abort at `maxBodyBytes` (default 5MB HTML, 15MB
  absolute ceiling), 20s timeout, no cookie jar, no auth headers.
- Evidence preserved: raw bytes (transient), `evidenceHash` = sha256(raw
  bytes), `finalUrl`, `statusCode`, `contentType`, `bytes`, `redirectChain`,
  `fetchedAt`. Raw bytes are dropped after extraction; only the hash and
  the structured observations persist.
- Exit OK: bytes hashed -> R2. Exit fail: typed failure (HTTP 4xx/5xx, size
  cap, timeout, content-type reject). A 404 here is terminal for the page:
  404 mid-ladder does NOT escalate to a browser; it is recorded as
  SOURCE_UNAVAILABLE and returned honestly.
- Cost: one HTTP round trip + bytes. No browser, no tokens. Predictable.

## Rung 2: STRUCTURED-DATA EXTRACTION (CPU only, no network)

- Entry: R1 OK.
- Work: discover `application/ld+json` blocks; parse with the `jsonld`
  library (never hand-rolled); expand @graph, @id merges, blank-node
  re-keying by content hash; REJECT remote @context fetches (record as
  unsupported evidence); plus OpenGraph/meta tags, canonical URL, title,
  hreflang/lang. Malformed blocks are recorded, never fatal.
- Evidence preserved: per-block `{index, ok, parsed|error}`,
  `evidenceHash` of the R1 bytes (unchanged), extracted node list.
- Then run the SUFFICIENCY GATE (see below) on the R2 output. If
  SUFFICIENT -> TERMINAL at R2 with `levelUsed: 2`, no escalation.
- Cost: CPU milliseconds. This is where most small-business sites terminate:
  WordPress Rank Math/Yoast JSON-LD, Wix/Squarespace schema blocks.

## Rung 3: HTML DEEP PARSE (CPU only, no network)

- Entry: R2 insufficient (typed gap, e.g. `INSUFFICIENT_STRUCTURED_DATA`).
- Work: the proven `onboarding/extractor.ts` semantics: strip
  `<script>`/`<style>` BEFORE text extraction (injected markup cannot plant
  facts); regex extractors with bounded loops (10 headings, 20 list items);
  tel:/mailto: links preferred over body regexes; OG fallbacks. See
  SANITIZATION-BOUNDARY.md for the full sanitization rules.
- Evidence preserved: PageEvidence fields, each with its source note
  (`tel:` link, `json-ld`, body regex, meta). JSON-LD-derived and
  visible-text-derived claims keep DISTINCT provenance labels; acquisition
  NEVER silently picks a winner on conflicts (see conflict rule).
- Then run the SUFFICIENCY GATE again. If SUFFICIENT -> TERMINAL at R3.
- Cost: CPU milliseconds. Escalation to R4 happens ONLY on a typed
  JavaScript-content gap, never on "might be nicer with JS".

## Rung 4: BROWSER RENDER (bounded; DELEGATED, not executed by this lane)

- Entry: R3 insufficient WITH a typed gap of `EMPTY_BODY_AFTER_JS`,
  `CONTENT_BEHIND_CLIENT_RENDER`, or `SHADOW_DOM_CONTENT` -- i.e. R3 text
  is empty/trivial AND R1 bytes contain JS-app markers (empty #root with
  bundled scripts, __NEXT_DATA__ with no prerendered content, etc.).
  R4 is never entered speculatively.
- Work (executed by the FYD factory's browser worker, per the pinned
  Playwright 1.63.0 L2 design): wall-clock budget per page, visible-only
  locators + aria snapshots (deterministic observation shape, same class as
  R3 output + `levelUsed: 4` flag), deterministic consent dismissal from a
  pinned CMP list, no login, no forms, no interaction beyond consent.
- Anti-bot doctrine: detect and RECORD blocks as typed evidence
  (`BLOCKED_BY_ANTIBOT`, `BLOCKED_BY_CAPTCHA`, `BLOCKED_BY_COOKIE_WALL`);
  NEVER escalate with proxies, stealth profiles, or retry tricks.
  A blocked page is evidence of a block, not a problem to route around.
- Exit: sufficient -> TERMINAL; blocked -> TERMINAL with typed block.
- Cost: seconds of wall clock + CPU. Predictable because the gate, not
  curiosity, triggers it.

## Rung 5: BOUNDED DISCOVERY (multi-page; L3)

- Entry: explicit `allowDiscovery: true` on the request AND the seed page's
  sufficiency evaluation shows a typed multi-page gap
  (`NEEDS_MULTIPAGE_OBJECTS`: menu, services list, staff, locations).
- Work: sitemap/RSS inventory first, then internal links from acquired
  pages; page budget (seed + N), byte budget, depth cap; each discovered
  page re-enters at R0; media/binaries skipped by content type.
- NEVER crawls the open web; stays inside the domain policy.
- Cost: bounded by the budgets; over-budget stops are recorded, not silent.

## Rung 6: INTELLIGENCE (model; last resort, L4)

- Entry: deterministic extraction (R2-R4 + the extraction lane) ran on all
  acquired observations and a required field is still unfilled; the gap is
  typed and recorded.
- Work: the model operates on ACQUIRED OBSERVATIONS ONLY. It gets no
  browser, no network, no new URLs. Acquired text is untrusted input and
  never enters an instruction channel unquoted (prompt-injection boundary).
- All AI-produced claims carry the LOWEST confidence tier, keep the source
  observation's provenance, and are marked AI-interpreted so evidence
  grading can distinguish them from deterministic observations.
- Cost: tokens, bounded by observation size. Predictable; never first instinct.

## The sufficiency gate (what makes the ladder deterministic)

The gate is a pure predicate:

```
sufficient(obs, requiredFields) -> { sufficient: bool, gaps: Gap[] }
```

- `requiredFields` for a business site: `identity` (name), `contact`
  (phone OR email OR address), `offerings` (non-trivial descriptive text:
  >= 200 visible chars OR >= 3 headings OR >= 3 list items OR a JSON-LD
  node of a known business type).
- Output is one of: SUFFICIENT (terminal, record `levelUsed` and the rung
  at which sufficiency was first reached), or a typed gap set.
- Typed gaps: `INSUFFICIENT_STRUCTURED_DATA`, `EMPTY_BODY_AFTER_JS`,
  `CONTENT_BEHIND_CLIENT_RENDER`, `SHADOW_DOM_CONTENT`,
  `NEEDS_MULTIPAGE_OBJECTS`, `BLOCKED_BY_ANTIBOT`,
  `BLOCKED_BY_CAPTCHA`, `BLOCKED_BY_COOKIE_WALL`, `SOURCE_UNAVAILABLE`,
  `POLICY_BLOCKED`, `CONTENT_CHANGED`.
- Determinism invariant: the same canonical URL + the same rung-input
  bytes hash + the same policy config ALWAYS produce the same rung
  decisions, including the decision to STOP. Every rung hashes its input
  (`rungInputHash`); if a later rung's input hash differs from the hash
  the previous rung recorded, that is `CONTENT_CHANGED`: fail closed,
  abort the acquisition for that page, record the mismatch, never merge
  observations from two different byte sets.

## Escalation decision records

Every rung transition (including the decision to stop) is recorded:

```
{ from: Rung, to: Rung, reason: Gap|terminal-reason, at: ISO8601,
  inputHash: sha256, outputHash?: sha256 }
```

The `escalation` array on `AcquiredObservation` (from the existing
`AcquisitionAdapter` types) carries exactly this. No silent escalation,
no silent sufficiency.

## Conflict rule: fake JSON-LD vs visible content

If structured data contradicts visible text, acquisition preserves BOTH
as separate claims with distinct provenance labels (`source: json-ld`
vs `source: html-visible-text`) and flags `CONFLICTING_SOURCES` on the
observation. Acquisition is evidence collection, not adjudication:
adjudication (RESOLVE priority json-ld > opengraph > html-meta) belongs
to the extraction/resolution lane (the FYD factory) and must apply on
explicitly provenance-graded claims, never on silently merged input.
A silent pick at fetch time is canonical corruption.

## Cost predictability

Per acquisition: R0+R1 (1-N HTTP requests) + R2+R3 (CPU ms) are the
expected path; R4 fires only on typed JS gaps; R5 only with an explicit
discovery flag and a multi-page gap; R6 only on typed post-extraction
gaps. The maximum cost of an acquisition is known BEFORE the first fetch:
`acquisitionTimeoutMs` + `pageBudget` * (`maxBodyBytes` + `browserWallClockMs`)
+ R6 token ceiling. Budgets are consumed in `src/fyd/net/budgets.ts`
semantics (CrawlLedger fail-closed).

## What changed vs PING's existing L0-L4

- Nothing structural. This spec (a) names the rungs per Nolan's ladder
  vocabulary so the directive and the code speak the same language, (b)
  makes the sufficiency predicate explicit and testable (PING had "typed
  sufficiency" as intent; now it is a function with defined inputs and
  gap types), (c) adds per-rung input hashing + CONTENT_CHANGED fail-closed
  (new), (d) adds the conflict rule (new: PING preserved both implicitly
  via separate extractor paths but never stated the rule), (e) pins cost
  budgets per rung (new), (f) states explicitly that R4 browser execution
  is DELEGATED to the factory (this lane proves decisions, not renders).
