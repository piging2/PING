# SANITIZATION BOUNDARY (lane D, v1)

Companion to ESCALATION-LADDER.md. Every web page is untrusted. This is the
exact line raw bytes cross to become observations. Anything not named here
does not cross.

## What crosses: typed observations only

Raw bytes enter at R1, get hashed (sha256), get parsed at R2/R3, and then
DIE. What persists downstream is: the `AcquiredObservation` record (URL,
finalUrl, fetchedAt, statusCode, contentType, bytes, truncated, levelUsed,
depth, title, meta, openGraph, jsonLd nodes, canonicalUrl, links,
policyNotes, evidenceHash, escalation array) plus the extracted
`PageEvidence` fields. Raw HTML never enters the journal, the object graph,
or any context beyond the extraction window. (Matches HOSTILE-INPUT-CONTRACT.md
retention rule and ACQUISITION-STACK.md egress policy 8-9.)

## Text extraction rules (R3, from the proven extractor.ts)

1. Strip `<script>...</script>`, `<style>...</style>` FIRST, case-insensitive,
   non-greedy, before ANY text extraction. Injected markup inside script
   blocks cannot plant fake contact facts (e.g. a JSON phone inside a
   `<script>` ad tag never becomes "the business phone").
2. Strip remaining tags; decode HTML entities (&amp; &lt; &gt; &quot;
   &#39;/&apos; numeric refs; &nbsp; -> space); collapse whitespace.
3. Bounded loops: max 10 headings (h1-h3, dedup, <=140 chars), max 20 list
   items (dedup, 3-120 chars). Every regex loop has a hard iteration cap
   so a 10MB pathological page cannot pin the parser.
4. Text byte cap: extraction stops consuming visible text at 1MB of decoded
   text; `truncated: true` is set on the observation and recorded in
   policyNotes. Never silently truncated.
5. `noscript` content IS readable (it is fallback text, not executable);
   `template`, `iframe` srcdoc, and `data-*` payloads are NOT extracted
   (they are application state, not page statements).

## Contact-fact precedence (prevents planted-fact injection)

- Phone: `tel:` link first, then JSON-LD `telephone`, then body regex.
  A `tel:` link is an explicit dial action by the site author; a phone-shaped
  string in body text is weaker evidence.
- Email: `mailto:` link first, then JSON-LD `email`, then body regex;
  `example.*` addresses are rejected.
- Address: JSON-LD `address` (PostalAddress) only; body regexes do not
  produce addresses (too many false positives; address claims need schema
  structure).
Every contact fact records its source note (`tel:`/`mailto:`/`json-ld`/
body-regex/meta) on the claim. Confidence tiers flow from the source note.

## URL canonicalization (R0)

- Parse; reject on parse failure. Lowercase scheme+host. Strip fragment.
  Drop default ports (80/443). Reject any userinfo. Internationalized
  hostnames are converted via the platform's IDNA (no manual punycode).
- Internal links are absolutized against `finalUrl` (after redirects, not
  the seed) and re-canonicalized; links to non-http(s) schemes are dropped,
  not extracted (`javascript:`, `mailto:` for navigation except the contact
  path above, `tel:` except the contact path above).

## Robots / ToS respect (bounded authorized automation)

- robots.txt is fetched per origin (TTL-cached), parsed, and honored:
  disallows, crawl-delay, and (by convention) sitemap hints. NO public off
  switch; the adapter types already say `requireRobotsTxt: always true`.
- The crawler NEVER: logs in, submits forms, solves CAPTCHAs, dismisses
  anything but deterministic consent banners from a pinned CMP list,
  follows a block with proxy/stealth retry, or ignores a 403/429 as a
  routing problem. Anti-bot, CAPTCHA, and cookie-wall pages become typed
  BLOCKED observations (`BLOCKED_BY_ANTIBOT` etc. in the lane-K vocabulary),
  recorded as evidence of a block, never bypassed.
- UA identifies FYD with a contact path. Per-domain rate limits apply even
  when robots.txt is absent.

## Hostile-parse caps (R2/R3; closes the "no parse-stage caps" gap)

- Max JSON-LD blocks parsed per page: 25; max single block size: 256KB.
  Oversized/malformed blocks -> recorded as unsupported evidence, never fatal.
- Max DOM-equivalent nodes for regex passes: bounded by the 5MB fetch cap
  plus the 1MB text cap; no unbounded `.` across the whole buffer in a
  single regex (all content regexes are non-greedy with closing delimiters).
- Parse wall-clock budget per page: 5s. Exceeded -> `PARSE_TIMEOUT`,
  fail closed, observation records what was extracted before the budget died.
- Link extraction cap: 2000 links per page, internal/external classified.
  Beyond the cap: `LINKS_TRUNCATED` in policyNotes.

## Redirect chains

- Max 5 hops; every hop re-runs R0 (scheme, DNS re-resolution,
  IP re-validation). A redirect into private space aborts the acquisition
  and is recorded as a policy note (DNS-rebinding defense).
- Meta-refresh and JS `location=` redirects are NOT followed by the static
  path: they are client behavior. A meta-refresh to another URL is recorded
  in policyNotes (`META_REFRESH_SEEN -> <url>`) and does not trigger a
  fetch; R4 (browser) may observe it if R4 is entered for a typed reason.
  Meta-refresh LOOPS (refresh to self) are therefore impossible in R1-R3
  by construction: the static fetcher never executes them.

## Compression bombs

- Gzip/deflate/br are decoded by the HTTP layer, but the SIZE CAP applies
  to DECODED bytes via the streaming abort (content-length pre-check is
  only a hint; the streaming byte counter is the authority). A 10KB gzip
  that decodes to 1GB dies at `maxBodyBytes` with `BODY_EXCEEDED_SIZE_LIMIT`.
  The fetcher never buffers the full decoded body before checking.

## What is REJECTED, not parsed

- Content-type not in the allowlist (binaries, media, office docs):
  rejected at R1 pre-check. PDFs are REJECTED by default (per the contract;
  Crawl4AI's PDF-path advisory history is the reason). No PDF/office
  parsing exists; adding it requires a resource-capped parser behind this
  same contract, not an open.
- Charset: decode as declared charset (meta/header), fallback UTF-8 with
  replacement characters. Invalid byte sequences never throw; they become
  U+FFFD. The evidenceHash is over the RAW bytes, so a decode quirk never
  changes what was witnessed.

## Prompt-injection boundary

Extracted web text is untrusted evidence at every rung. No acquired text
enters an instruction channel unquoted -- at R6 the model receives
observations as quoted data with the provenance label attached. This is
stated in ACQUISITION-STACK.md section 4.8 and restated here because it is
the most likely boundary to erode under "helpful" refactoring.

## Invariants (testable)

- S1: script/style content never appears in extracted text or facts.
- S2: every extracted fact carries a source note; a fact without one is a bug.
- S3: same bytes -> same evidenceHash, always, on any machine.
- S4: any truncation sets `truncated: true` + a policy note; silent
  truncation is a contract violation.
- S5: a blocked page yields a BLOCKED observation with a typed reason,
  never an empty observation and never a retry through another mechanism.
