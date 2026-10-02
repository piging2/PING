# HOSTILE-INPUT PROCESSOR CONTRACT (lane D, P0)

Status: v1 contract spec, 2026-09-23. Feeds the FYD 500-site factory program.
Nothing here is implemented; this is the bound sheet every crawl worker
implementation must prove before it touches arbitrary business websites.

Rule this contract obeys: arbitrary-site crawling belongs in a HARDENED,
EGRESS-CONSTRAINED worker boundary, NEVER beside PING's trusted runtime.
Crawl4AI's security history (SSRF via untrusted request bodies, PDF resource
exhaustion, arbitrary file write, DOM XSS) is the warning. See also
`src/fyd/proceduralize/ACQUISITION-STACK.md` section 5 (the L0-L4 escalation
design and its ADOPT/HARVEST/REJECT table); this contract is the hardening
layer under every L0-L3 implementation.

## 1. What counts as hostile input

Any bytes the FYD factory did not author: third-party HTML pages, feeds,
sitemaps, JSON-LD blocks, OpenGraph/meta tags, images, PDFs, office
documents, redirect chains, DNS answers, robots.txt bodies, CAPTCHA/WAF
challenge pages, cookie walls, and the text those pages carry. Every parser
that touches these bytes runs inside this contract. Extracted web text stays
labeled untrusted evidence and never enters an instruction channel unquoted
(ACQUISITION-STACK.md section 4.8).

## 2. What PING already has (verified read-only, 2026-09-23)

| Asset | File | What it covers |
|---|---|---|
| The ONE SSRF gate | `src/fyd/net/safe-fetch.ts` | Scheme allowlist (http/https only); no credential-bearing URLs; DNS resolved per hop; IP blocklist: loopback, RFC1918, link-local (incl. 169.254.169.254), multicast, reserved, IPv4-mapped IPv6 of same, CGNAT 100.64/10 (tailnet never fetched); manual redirects max 5 with per-hop re-validation; content-type allowlist pre-check; content-length pre-check plus streaming abort; defaults 15MB max body, 20s timeout. `safeFetchPage`: text/html, 5MB. Injected DNS/fetch deps make it fixture-testable. The media pipeline re-exports it (exactly one SSRF implementation; `src/fyd/media/safe-fetch.ts` is a shim). |
| Crawl budget | `src/fyd/net/budgets.ts` | `CrawlBudget` page+byte caps (anonymous preset: 6 pages, 8MB); `OriginSemaphore` (2 per origin, 6 global); `DedupCache` bounded TTL. In-memory, single-instance, restart resets (documented). |
| Rate limit / quota | `src/fyd/net/rate-limit.ts` | `TokenBucket`, `GenerationQuota`, `AnonymousGate`. Client key is caller IP (documented limitation: untrusted behind X-Forwarded-For without a trusted proxy). |
| Composed anonymous entry point | `src/fyd/onboarding/anonymous-preview.ts` | Paste-URL preview is the ONLY anonymous entry point doing network I/O, and it consumes the three modules above. |
| Deterministic structured-data parse | `src/fyd/proceduralize/structured-data.ts` | JSON-LD via the `jsonld` library, never a hand-rolled processor. |
| Hostile-markup stripping | `src/fyd/onboarding/extractor.ts` | Strips `<script>`/`<style>` before text extraction; bounded loops (10 headings, 20 list items). |
| Browser presence | `package.json` devDependencies | `playwright` and `@playwright/test` ^1.63.0 (dev only). The only in-repo browser user is `src/fyd/preview/capture.ts`, a MANUAL tsx screenshot script for authorized portal previews, not a crawl worker. Its URL check is a `^https://` regex only. It must never be pointed at hostile targets as-is. |
| Failure vocabulary | lane K `FAILURE-TAXONOMY.md` | 13 closed classes. This contract maps every bound violation to one (section 7). |

### Gaps this contract closes (none of these exist yet)

1. No worker/process isolation: untrusted fetch+parse runs in the same Node
   process as the trusted runtime. A hostile page that exhausts memory or
   hangs a parser can take the trusted runtime with it.
2. No robots.txt honoring in the fetch path. The types-only
   `AcquisitionAdapter` says `requireRobotsTxt: always true in production`,
   but no implementation exists. Politeness must be a boundary, not a comment.
3. No PDF/office-document handling at all (no code, no policy). The factory
   will meet PDFs on real business sites; the choice is resource-capped
   parsing or explicit reject, never unbounded open.
4. No parse-stage resource caps: no DOM-node cap, no text-byte cap, no
   link cap, no parse wall-clock budget beyond the fetch timeout. Regex
   extractors have bounded loops today, but there is no contract saying
   every parser must.
5. No scratch-sandbox filesystem policy: media writes (`derivatives.ts`,
   `ingest.ts`) and snapshot writes (`snapshot-store.ts`) are ad-hoc
   paths. Crawl workers need basename-confined, realpath-checked writes
   (the crawl4ai lesson: basename + realpath + O_NOFOLLOW).
6. No anti-bot/CAPTCHA/cookie-wall doctrine: Nolan's standing rule is
   detect and record as blocked, never bypass. This contract makes it a
   typed, tested outcome.
7. No per-job memory (RSS) cap or CPU wall-clock kill for workers.

## 3. The contract: precise, testable bounds

Every bound below has the form NAME / LIMIT / TEST. Limits are contract
defaults; callers may tighten, never loosen, and any loosening requires a
contract revision. "Test" names the fixture-driven test that proves the bound
(lane R owns fixtures; this contract defines the fixture requirements).

### 3.1 Fetch bounds (L0-L1)

| ID | Bound | Default limit | Test |
|---|---|---|---|
| F1 | Per-response body cap (HTML/text) | 5 MiB; streaming abort on exceed | Serve fixture with lying Content-Length and one with chunked 50 MiB; assert abort before full buffer |
| F2 | Per-response body cap (media) | 15 MiB | Fixture: 30 MiB image; assert reject |
| F3 | Per-request timeout (connect+headers+body) | 20 s | Fixture: slow-loris server; assert TIMEOUT record at deadline |
| F4 | Whole-acquisition wall clock | 120 s default (callers set per job) | Fixture: 40 slow pages; assert acquisition aborts with TIMEOUT |
| F5 | Redirect hops | max 5, manual chain | Fixture: 10-hop chain; assert abort with hop count in record. Fixture: infinite A<->B loop; assert abort |
| F6 | Scheme allowlist | http, https only | Fixtures: `javascript:`, `data:`, `file:`, `ftp:` URLs; assert reject before DNS |
| F7 | Credential-bearing URLs | reject at L0 | Fixture: `https://user:pass@host/`; assert reject, no secret in record |
| F8 | DNS re-resolution | resolve before connect AND after every redirect | Fixture: first hop resolves public, redirect target resolves to 10.0.0.5; assert abort, record the offending IP |
| F9 | IP blocklist | loopback (127/8, ::1), RFC1918, link-local incl. 169.254.169.254, multicast, reserved, CGNAT 100.64/10, IPv4-mapped IPv6 of the above | Fixtures: each class; assert reject with the exact address in the record. Cloud metadata endpoint gets its own named fixture |
| F10 | Content-type allowlist | checked before buffering; HTML path allows `text/html` (+ feed/sitemap types when that is the requested resource) | Fixture: `Content-Type: application/octet-stream` on a page URL; assert reject |
| F11 | Per-origin and global concurrency | 2 per origin, 6 global per worker (reuse `OriginSemaphore` semantics) | Concurrency probe fixture; assert cap respected |
| F12 | robots.txt | fetch, parse, honor disallows AND crawl-delay; parse failure fails closed to disallow-all | Fixtures: disallowed path fetched -> skip with policy note; malformed robots.txt -> treated as deny-all. Upstream default off is rejected: our default is on with no public off switch |

### 3.2 Parse bounds (L1 output)

| ID | Bound | Default limit | Test |
|---|---|---|---|
| P1 | DOM node cap | 200,000 nodes; abort parse above | Fixture: deeply nested 1M-node page; assert abort, not OOM |
| P2 | Extracted visible-text cap | 2 MiB per page | Fixture: 10 MiB of lorem text; assert truncation flagged in observation, not silently cut |
| P3 | Link cap | 10,000 links per page | Fixture: 100k-link farm page; assert cap + `truncated_links` note |
| P4 | JSON-LD block cap | 50 blocks, 512 KiB total | Fixture: 200-block page; assert cap |
| P5 | Meta/OG map cap | 500 entries | Fixture: meta-bomb page; assert cap |
| P6 | Parse wall-clock budget | 10 s per page (regex + DOM + JSON-LD) | Fixture: pathological regex input; assert budget abort, TIMEOUT-classed as parse-deadline |
| P7 | Script/style strip | `<script>` and `<style>` removed before any text or claim extraction | Fixture: script tag planting fake phone number; assert the planted fact never becomes a claim |
| P8 | No regex with catastrophic backtracking | every extractor pattern reviewed; pathological-input test per extractor | Fixture suite: nested quantifiers input; assert linear-ish completion inside P6 |

### 3.3 Render bounds (L2 browser fallback, behind the escalation ladder only)

L2 runs ONLY when L1's sufficiency gate fails with a typed evidence gap
(`EMPTY_BODY_AFTER_JS`, `CONTENT_BEHIND_CLIENT_RENDER`, `SHADOW_DOM_CONTENT`).
"Would be nicer with JS" is never a trigger. (See WEB-ACQUISITION-AUDIT.md
escalation ladder for the sufficiency criteria.)

| ID | Bound | Default limit | Test |
|---|---|---|---|
| R1 | Per-page render wall clock | 30 s incl. navigation + settle | Fixture: page with infinite pending XHR; assert kill at budget |
| R2 | Fresh browser context per acquisition | no profile reuse, no persistent cookies, no shared state between acquisitions | Two acquisitions, same target; assert no cookie/session leakage |
| R3 | No authenticated browsing | no login, no form submission, no credential entry; interaction limited to deterministic consent dismissal from a pinned CMP list | Fixture: login-walled page; assert PERMISSION_DENIED record, never a credential prompt |
| R4 | Consent handling | deterministic auto-dismissal from pinned CMP list only; no human-posed consent clicks | Fixture: CMP banner; assert dismiss or record `consent_not_dismissible` |
| R5 | Browser egress | browser worker inherits the same egress allowlist as the fetch worker (section 5); no additional domains | Fixture: page pulling scripts from a third-party ad domain; the adapter records it; cross-domain XHR/fetch by the page is permitted (rendering reality) but the worker never navigates the top frame off the allowed set |
| R6 | Render output parity | L2 output is the same `AcquiredObservation` shape as L1 plus `levelUsed: 2` and the escalation reason | Fixture pair: static page fetched at L1 and L2; assert shape parity |

### 3.4 PDF / office-document bounds

Default posture: REJECT. Parse only when the acquisition request explicitly
opts into document parsing AND the worker has a capped parser available.

| ID | Bound | Default limit | Test |
|---|---|---|---|
| D1 | Default reject | application/pdf and office types are rejected at the content-type gate unless `allowDocuments: true` | Fixture: PDF link; assert reject with `documents_not_enabled` |
| D2 | Download cap | same F1/F2/F3/F8/F9 bounds; downloads pass through the SSRF gate, never around it | Fixture: PDF behind a redirect to 169.254.169.254; assert reject |
| D3 | Page cap | 200 pages (crawl4ai 0.9.3 reference default: 2000; ours is tighter for business docs) | Fixture: 500-page PDF; assert abort at cap with page count recorded |
| D4 | Byte cap | 20 MiB per document | Fixture: 100 MiB PDF; assert abort |
| D5 | Parse wall clock | 30 s per document | Fixture: decompression-bomb PDF; assert kill, not OOM |
| D6 | Sink confinement | extracted images/text written basename-confined into the scratch sandbox with realpath containment (no path traversal, no symlink escape, O_NOFOLLOW semantics) | Fixture: PDF with `../../evil` embedded filename; assert containment |
| D7 | No scripted documents | macros / embedded JS in office docs are never executed; extraction is text+structure only | (policy; enforced by parser choice) |

### 3.5 Filesystem bounds

| ID | Bound | Default limit | Test |
|---|---|---|---|
| S1 | Scratch sandbox | one per-run directory (e.g. `/var/tmp/ping-crawl/<job-id>/`); the worker may write ONLY inside it | Worker attempt to write `/etc/pass`-style path and `../` escape; assert refusal |
| S2 | Write confinement | basename + realpath containment check before every write; symlink escape refused | Fixture: symlink inside sandbox pointing outside; assert refusal |
| S3 | Artifact caps | 100 files, 50 MiB total per run | Fixture: page with 500 images discovered; assert cap |
| S4 | Cleanup | sandbox deleted (or scheduled for deletion) when the job ends, success or failure | Kill a worker mid-run; assert sandbox reclaimed |
| S5 | No raw-byte retention | raw bytes live only for hashing + extraction; the persisted output is the structured observation | Audit: assert no raw HTML/PDF bytes in any durable store after job end |

### 3.6 Network / egress bounds

| ID | Bound |
|---|---|
| E1 | The worker's application layer may initiate connections ONLY to: the seed URL's registrable domain, domains in the request's explicit `allowedDomains`, and the system DNS resolver. Nothing else. |
| E2 | DNS answers are filtered by F9 before connect, on every hop (F8). |
| E3 | The worker carries no proxy credentials and no proxy-escalation path. Anti-bot proxy escalation is REJECTED (ACQUISITION-STACK.md decision table); blocks are recorded, not routed around. |
| E4 | Recommended deploy containment (recorded, not assumed): worker process gets no `NET_RAW`, no access to loopback services except the job's own IPC channel, writable scratch on a noexec mount. |
| E5 | A descriptive user agent identifies FYD with a contact path; crawl-delay honored (F12). |

### 3.7 Worker resource bounds

| ID | Bound | Default limit | Test |
|---|---|---|---|
| C1 | RSS cap per worker | 1 GiB; kernel/cgroup or supervisor kills on exceed | Fixture: page triggering runaway DOM growth; assert kill + TIMEOUT-classed record |
| C2 | CPU wall clock per job | F4 budget; hard kill, not graceful hope | Fixture: infinite JS loop page at L2; assert kill |
| C3 | Worker lifetime | one acquisition job per worker process, then exit; or a bounded pool with per-job RSS+wall-clock kill | Leak fixture: job that grows globals; assert next job starts clean |
| C4 | Secret hygiene | worker receives NO tokens, NO API keys, NO credential handles in its environment or argv; capability handles stay with the trusted side (lane L). The IPC return channel carries observations and failure records only. | Env-dump probe fixture; assert zero secret material |

## 4. Minimum viable hardened boundary for the factory's crawl workers

The smallest boundary that satisfies this contract, and the reason each
piece is load-bearing rather than ornamental:

1. **Separate OS process per acquisition job.** The parser, fetcher, and any
   renderer run in a child process that the trusted runtime spawns and
   supervises. The trusted runtime never `require`s hostile bytes into its
   own heap. Why: C1/C2/P1/P6 kills must be able to land on a hung parser
   without risking the journal, the event authority, or in-flight requests.
2. **The ONE fetch gate, ported not duplicated.** The worker's fetch path is
   `safe-fetch.ts` logic (same module if the worker is Node, a line-by-line
   port if it is not). A second implementation is a DUP-lane convergence
   violation. All of section 3.1 lives here.
3. **Narrow typed IPC.** Worker returns `AcquiredObservation[]` plus
   `FailureRecord[]` over stdio/JSON. The trusted side validates the shape
   before anything touches the object graph or evidence store. No raw bytes
   cross except inside the sandbox.
4. **Per-run scratch sandbox** (S1-S5), created by the supervisor, deleted
   by the supervisor.
5. **Robots honored** (F12) with fail-closed parse.
6. **Browser only at L2**, fresh context per job (R1-R6), no auth (R3).
7. **PDFs rejected by default**, capped when enabled (D1-D7).
8. **Every bound violation emits a lane-K failure record** (section 7),
   never a silent empty result. The observability lane (J) records
   source/run/bounds-hit/bytes/cost per job so Nolan can answer WHY a
   site produced no FYD.

What is explicitly NOT required yet: a container runtime (OS process +
supervisor + deploy recommendations in E4 is the minimum), a proxy mesh,
or a dedicated crawl cluster. Those are scale answers, not safety answers.

## 5. Failure mapping: every bound violation to the lane-K taxonomy

Bound violations are deterministic policy outcomes, not retries of the same
hope. Mapping (class; retryable?; notes):

| Violation | Lane-K class | Retry? | Evidence the record carries |
|---|---|---|---|
| F6/F7 scheme or credentialed URL | PERMISSION_DENIED | No | the rejected URL shape (user:pass redacted) |
| F8/F9 DNS non-public / redirect into private space | PERMISSION_DENIED | No | offending address, hop index |
| F12 robots disallow | PERMISSION_DENIED | No | the disallowed path + robots rule |
| F12 robots parse failure | PERMISSION_DENIED | No | fail-closed decision, raw robots ref |
| F5 too many redirects / loop | PERMANENT | No | hop count, chain |
| F1/F2 body over cap | PERMANENT | No | declared size vs cap |
| F10 content-type not allowed | PERMANENT | No | the content-type seen |
| P1/P3/P4/P5 artifact caps | PERMANENT | No | which cap, observed value |
| P6 parse deadline | TIMEOUT | Yes, capped | phase=parse, deadline, elapsed |
| D1 documents not enabled | UNSUPPORTED | No | content-type seen (discovery result, not an error) |
| D3/D4/D5 document caps | PERMANENT | No | pages/bytes/ms vs cap |
| R3 login wall / auth required | PERMISSION_DENIED | No | the auth signal seen |
| Anti-bot / WAF / CAPTCHA block page | PERMISSION_DENIED | No | block vendor signal if identifiable, page hash; NEVER bypass, NEVER proxy-escalate |
| Cookie wall beyond deterministic dismissal | PERMISSION_DENIED | No | `consent_not_dismissible` |
| F3 fetch timeout (connect/headers/body) | TIMEOUT | Yes, idempotent reads | phase, deadline, elapsed |
| DNS failure / connect refused / 5xx | SOURCE_UNAVAILABLE | Yes, budgeted | transport signal |
| 429 / rate-limit headers | RATE_LIMITED | Yes, provider-directed | reset time if given |
| 404 on first-seen seed | PERMANENT | No | status, URL |
| 410 / Sunset on known endpoint | SOURCE_CHANGED | No | migration hint if advertised |
| Unrecognized failure signal | TRANSIENT | Yes, capped | `original_signal` verbatim (mandatory) |

Never-silent invariant (lane K section 6): a failed fetch returns a failure
record, never an empty success. "The provider had nothing" (legitimate empty,
e.g. page with no JSON-LD) is a normal observation with the field absent,
not a failure.

## 6. Failure modes the factory will meet (doctrine, not workarounds)

- **Bot detection (Cloudflare, DataDome, PerimeterX, custom WAFs):** detect
  the block page honestly (status, challenge markers), emit
  PERMISSION_DENIED with the evidence, move on. Detection tiers are honest
  telemetry (harvested from crawl4ai's design); proxy escalation and
  stealth profiles are REJECTED. A blocked page is evidence of a block.
- **CAPTCHAs:** we do not solve, outsource, or bypass them. Recorded as
  blocked (PERMISSION_DENIED). No exceptions; this is a Nolan-level rule.
- **Infinite scroll / lazy-loaded content:** L2 renders with a bounded
  settle budget (R1). Content that needs unbounded scrolling to appear is
  recorded as a typed evidence gap (`CONTENT_BEHIND_INTERACTION`), not
  chased. No auto-scroll loops without a hard iteration cap.
- **Cookie walls / consent gates:** deterministic dismissal from the pinned
  CMP list only (R4). Anything else is PERMISSION_DENIED.
- **Shadow DOM content:** recorded as `SHADOW_DOM_CONTENT` evidence gap;
  renderers flatten it when the L2 engine supports it (crawl4ai's
  flatten_shadow_dom is the reference to harvest), never by injecting
  scripts into the page.
- **Honeypot links / crawler traps:** link cap (P3) plus per-acquisition
  page budget (L3 design) bound the damage; trap-looking URL patterns are
  recorded in policy notes, not followed on suspicion alone.
- **Slowloris / tarpit servers:** F3/F4/C2 kill them; the record says
  TIMEOUT, not SOURCE_UNAVAILABLE (a slow provider is not a down provider).

## 7. Contract test kit (fixture requirements for lane R)

Each ID in section 3 must have at least one fixture + assertion. Minimum
fixture set: lying Content-Length server; chunked 50 MiB stream; slow-loris
socket; 10-hop and cyclic redirect chains; each F9 address class
(127.0.0.1, 10.x, 172.16.x, 192.168.x, 169.254.169.254, ::1, ::ffff:10.0.0.1);
scheme fixtures (javascript:, data:, file:, ftp:); credentialed URL;
DNS-rebinding hop; oversized robots; malformed robots; disallow fixture;
meta-bomb page; 1M-node DOM; 100k-link page; script-planted fake phone;
pathological regex input; 500-page PDF; decompression-bomb PDF;
path-traversal filename PDF; symlink-escape sandbox attempt; infinite-XHR
L2 page; login-wall page; CMP banner page; WAF block page fixture.
Fixtures are recorded/synthetic; no live hostile targets in tests.

## 8. Standing decisions applied

- **No live credentials tonight:** all contract tests are fixture-driven;
  the worker's secret hygiene (C4) means the crawl path never needs a
  credential anyway. OAuth flows (Facebook/ATProto/other) are queued for
  Nolan's morning decision and are out of scope for this contract: the
  acquisition worker never carries them.
- **Vendor veto:** this contract proposes NO new vendor and NO new
  dependency. The bounds are implementable with `safe-fetch.ts` (exists),
  a child-process supervisor (Node stdlib), and Playwright (already a
  devDependency, L2-only, behind the escalation ladder). Any future proposal
  to put a paid crawler (Firecrawl-style SaaS, managed crawl fleet) in the
  hot path goes through the VETO GATE: cost at 10/1,000/100,000 FYDs,
  replaceability, data custody, and what fails if the vendor disappears.
- **Optionality test:** every engine behind the adapter boundary is
  replaceable (static fetcher, Playwright L2, a future capped PDF parser).
  Callers see `AcquiredObservation`, never the engine.

## 9. Open questions for the coordinator (not blockers)

1. Should the worker be Node (direct `safe-fetch.ts` reuse) or a
   memory-safer runtime for parsing (Rust/Go sidecar)? Node wins on
   reuse; a sidecar wins on hostile-parse memory safety. Recommend: Node
   worker first (contract is identical), sidecar only on demonstrated
   parser-escape evidence.
2. Where does the supervisor live in the factory topology: per-factory-host
   daemon or per-job spawn from the trusted runtime? Per-job spawn is
   simpler and matches C3; a daemon needs the same kill semantics proven.
3. robots.txt cache TTL and shared crawl-delay state across jobs: lane M
   (source registry) owns operational metadata; coordinate the robots cache
   there rather than inventing a second store.

## 10. Proof ledger (this lane, this deliverable)

- External systems evaluated for hardening lessons: crawl4ai 0.9.3
  (already evaluated in ACQUISITION-STACK.md; its caps and sink-confinement
  pattern harvested as D2-D6/S2, its Docker server and LLM extraction
  rejected there too).
- PING modules harvested: `fyd/net/safe-fetch.ts`, `budgets.ts`,
  `rate-limit.ts`, `anonymous-preview.ts` composition pattern,
  `proceduralize/structured-data.ts` (library-not-handrolled rule),
  lane K failure taxonomy (13 classes, never-silent invariant).
- Dependencies adopted: none. Dependencies rejected: new ones (none needed).
- Hand-written infra avoided: the entire fetch gate, budget, and
  rate-limit machinery already exists; the contract reuses it.
- Kill criteria applied: no new authority, no new database, no new
  framework, no duplicate SSRF implementation, no SaaS crawler, no
  credential surface in the worker.
