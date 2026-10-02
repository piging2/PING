# VEIN 18 research record: URL safety / SSRF defenses
Date: 2026-09-28. Researcher: harvest pass, VEIN 18 (security, high priority). RESEARCH ONLY, no writes to any repo.
PING HEAD examined: 4a8c5f2e92eef2a3cb6a11582c37f01c38dfacd9 on fyd/sprint-integration-2026-09-24 (/home/nolan/projects/ping, Pig WSL).
Dedup: candidates.json already carries both candidates (unclecode/crawl4ai, firecrawl/firecrawl). This record adds mechanisms under the existing rows; no new candidate rows created.

## AREA
URL normalization, redirect policy, DNS-rebinding protection, private/link-local address protection, robots handling, content-type detection, resource limits, failure taxonomy, determinism of the fetch bound. Scope: the server-side fetch gate that turns an arbitrary agent/user URL into bytes (PING's SSRF boundary).

## CURRENT PING IMPLEMENTATION
The one canonical SSRF gate is `src/fyd/net/safe-fetch.ts` (291 lines; the media pipeline's `src/fyd/media/safe-fetch.ts` is a shim re-exporting it; exactly one implementation per the module docstring).

- URL normalization: WHATWG `URL` parse and `toString()` canonicalization, `checkUrlShape` (lines 161-178). http/https only, credential-bearing URLs rejected, per hop.
- Private address protection: `isPublicIp` (lines 72-129) blocks 127/8, RFC1918 (10/8, 172.16/12, 192.168/16), 169.254/16 (incl. 169.254.169.254 metadata endpoint), CGNAT 100.64/10, multicast/reserved, 0/8, ::1, fe80::/10, fc00::/7, ff00::/8, and IPv4-mapped IPv6 in BOTH dotted (`::ffff:127.0.0.1`) and hex (`::ffff:7f00:1`) tail forms, recursively rechecked against the v4 rule.
- DNS: `hostResolvesPublic` (lines 132-159) rejects if DNS fails, if no answers, or if ANY resolved address is non-public (all-answers rule, not first-match).
- Redirect policy: `redirect: "manual"` (line 203); loop at lines 194-198 re-validates scheme, credentials, and DNS for EVERY hop; hop budget `maxRedirects` default 5 (line 65), deterministic terminal failure "Too many redirects (>N)" (line 261); a redirect into private space is rejected before being fetched (proven by test, see below). Cross-scheme redirect http->file: is rejected by per-hop `checkUrlShape`.
- DNS-rebinding across redirects: ANSWERED IN CODE, not inferred. The fetch loop resolves and re-validates DNS on each hop (lines 194-198), so a redirect target hostname is re-resolved before its fetch; `check_redirect`-equivalent semantics are inline. `hostile.test.ts` line 191 ("fails closed on a redirect pivot into private space (never fetches it)") proves the redirect-to-private case end to end with a stubbed fetch.
- Robots: minimal inline parser `robotsAllowsPath` (`src/fyd/acquisition/static-adapter.ts` lines 308+), honors Disallow for User-agent `*` / `fyd-socialbot` / `fyd-media-ingest`; missing robots.txt is fail-open by documented choice; `policy.requireRobotsTxt` has no public off switch. Fetched through the same gate (`fetchText`, maxRedirects 2).
- Content-type: allowlist prefixes checked BEFORE buffering (lines 233-237), e.g. `safeFetchPage` allows only `text/html`.
- Resource limits: content-length precheck (lines 238-242), streaming abort cap (lines 244-258), per-request timeout via `AbortSignal.timeout` (line 204), defaults 15MB / 20s / 5 hops (lines 63-65).
- Failure taxonomy: 17-code typed `AcquisitionFailureCode` plus deterministic prefix mapping in `classifyFetchFailure` (`src/fyd/acquisition/errors.ts`), fail-closed fallback `ACQ_NETWORK_ERROR`. L0 policy gate (`static-adapter.ts` lines 124-166) adds scheme/credential/DNS-public checks plus a registrable-domain allowlist before any fetch.
- Determinism: hop budget is a hard deterministic bound; no retries, no jitter in the gate.

## EXTERNAL IMPLEMENTATION

### Donor A: unclecode/crawl4ai, pin e5d2e786d1a101225f3f6a3e6fd344d76eeb13af (HEAD, committed 2026-09-25T06:35:50Z, verified via commits API same day)
License: Apache-2.0 (spdx via GitHub; LICENSE body head verified: "Apache License, Version 2.0, January 2004"). Code donor is legally clean for adaptation with attribution.
Mechanism location: `deploy/docker/egress_broker.py` (209 lines, the docker server distribution's SSRF core), `deploy/docker/egress_proxy.py` (347 lines, localhost pinning forward-proxy), `deploy/docker/utils.py` lines 354-371 (`validate_url_destination`).

The strongest mechanism, in their own words (module docstring): prior defenses were "enumerate-badness (a hand-maintained list of blocked CIDRs) and resolve-then-discard", which missed whole families and left a DNS-rebinding TOCTOU. Replaced with one rule:

    reject any resolved IP where `not ip.is_global`

evaluated on every transition-embedded IPv4 form as well: v4-mapped (`::ffff:/96`), NAT64 (`64:ff9b::/96`), 6to4 (`2002::/16`), v4-compatible (`::/96`), via `_embedded_v4_forms`. Plus `resolve_and_pin()`: resolve ONCE, reject if ANY answer is non-global, return the exact IP to dial with Host/SNI preserved so no second attacker-controlled resolution is used. `check_redirect()` applies the same rule per redirect. Failures are opaque (`EgressBlocked("URL blocked")`, never echoing IP/hostname, explicitly to avoid a DNS oracle). Browser path: `enforce_egress` routes Chromium through the pinning proxy so the browser never resolves the target itself, strips `--proxy-server` / `--host-resolver-rules` / `--ignore-certificate-errors` launch flags, and forces TLS verification on.
Security history: the module is the product of an internal review plus an external report (secsys_codex, 2026-04-18) covered by adversarial tests `deploy/docker/tests/test_security_ssrf_crawl.py`, `test_security_ssrf_egress.py`, `test_security_ssrf_seeder.py`, `test_security_webhook_pinning.py`. Maintenance: very active, HEAD is 2026-09-25.
Weaknesses vs PING: no explicit hop cap observed on their redirect handling (browser-driven), no content-type pre-buffer allowlist in the examined files, error opacity trades away the diagnostic detail PING's taxonomy uses.

### Donor B: firecrawl/firecrawl, pin 9b15c332111ca719335c5776d80a4946218d9bec (verified live 2026-09-28; current HEAD 58b06b90d2955b6f5eb036fb5e6e78c3348827e7, noted per dedup contract; safeFetch.ts byte-identical between pin and HEAD)
License: AGPL-3.0 (GitHub license endpoint spdx_id, verified live). CORE IS AGPL-3.0: PATTERN/REFERENCE ONLY. Nothing copied; never cloned. Note: upstream moved from mendableai/firecrawl to firecrawl/firecrawl (301 on the old name); canonical identity is now firecrawl/firecrawl, matching candidates.json.
Mechanism location: `apps/api/src/scraper/scrapeURL/engines/utils/safeFetch.ts`. The pattern: an undici dispatcher with a `connect`-event interceptor (`attachSecurityCheck`) that inspects `socket.remoteAddress` at connect time and destroys the socket (`InsecureConnectionError`) when `isIPPrivate` (ipaddr.js `range() !== "unicast"`, which covers loopback, private, link-local, unique-local, multicast, reserved, carrierGradeNat, unspecified, broadcast, and ipv4Mapped) returns true. This is a POST-connect check, so it closes the resolve-then-dial TOCTOU at the socket layer, at the cost of completing a TCP handshake before teardown. `apps/api/src/lib/validateUrl.ts` contributes only scheme checks and a `resolveRedirects` helper using `redirect: "follow"` with `maxRedirections: 5000` (far weaker than PING's 5) and no per-hop revalidation of its own.
Weaknesses vs PING: no pre-connect DNS validation, no credential-URL rejection in `checkUrl`, naive `protocolIncluded` regex, 5000-hop redirect ceiling, no content-type gating observed.

## MECHANISM WORTH HARVESTING
Crawl4AI `egress_broker.py`: the single-rule `not ip.is_global` evaluated over transition-embedded IPv4 forms (`_embedded_v4_forms`: v4-mapped, NAT64 64:ff9b::/96, 6to4 2002::/16, v4-compat ::/96), adapted into PING's `isPublicIp` v6 branch. Secondary, same donor: `resolve_and_pin` semantics (resolve once, dial the pinned IP) and opaque failure reasons. Complementary Firecrawl pattern (reference only): post-connect `socket.remoteAddress` verification via an undici dispatcher interceptor, the Node-idiomatic way to close the same TOCTOU without reworking dial logic.

## WHY IT IS BETTER
PROVEN, not inferred. I executed PING's actual v6 branch logic against transition-form inputs and Crawl4AI's actual `_embedded_v4_forms` + `is_global` rule against the same inputs:

| input (DNS AAAA answer) | PING isPublicIp | Crawl4AI is_forbidden_ip |
|---|---|---|
| 64:ff9b::7f00:1 (NAT64 embedding 127.0.0.1) | true (ACCEPTED) | forbidden |
| 64:ff9b::a00:1 (NAT64 embedding 10.0.0.1) | true (ACCEPTED) | forbidden |
| 2002:7f00:1:: (6to4 embedding 127.0.0.1) | true (ACCEPTED) | forbidden |
| 2002:a00:1:: (6to4 embedding 10.0.0.1) | true (ACCEPTED) | forbidden |
| ::7f00:1 (v4-compat embedding 127.0.0.1) | true (ACCEPTED) | forbidden |
| ::ffff:127.0.0.1 (v4-mapped) | rejected (handled) | forbidden |
| 2606:4700:4700::1111 (real public v6) | true (correct) | allowed (correct) |

Enumerate-badness is structurally blind to any future transition form; one semantic rule ("not globally routable") is not. This is exactly the bypass family Crawl4AI's own review found in their prior code, documented in the module docstring.
Second concrete gap the same mechanism fixes: same-hop DNS-rebinding TOCTOU. PING validates DNS at safe-fetch.ts line 197, then `fetchImpl` (line 203, global fetch) performs its own independent resolution at connect time. A fast-flux hostname can answer public to the validator and private to the connector. PING's per-hop re-validation does NOT close this: re-validating before each hop still leaves a resolve-then-dial gap inside every hop. Crawl4AI's resolve-and-pin (and Firecrawl's post-connect socket check) provably close it because the entity that resolves is the entity that dials.

## WHAT NOT TO COPY
The docker-server distribution shape: `egress_proxy.py`, `enforce_egress` browser-flag scrubbing (PING L2 browser path is not implemented; record as the pattern to use when it lands), FastAPI `HTTPException` wiring, the `CRAWL4AI_ALLOW_INTERNAL_URLS` escape-hatch semantics (PING's policy layer owns allowlisting), Firecrawl's 5000-hop redirect ceiling, Firecrawl's naive `protocolIncluded` regex, Firecrawl's abuse-domain DB blocklist (`blocklist.ts`, unrelated to SSRF). Do not adopt opaque errors wholesale without reworking `classifyFetchFailure`, which depends on reason prefixes; that is BACKLOG.

## PING AUTHORITY IT MUST REMAIN UNDER
`fyd/net/safe-fetch.ts` is the ONE canonical SSRF gate (Rule of One; no new authority). The harvest lands inside `isPublicIp` as an added unwrapping step plus, for the TOCTOU half, either a pinned-dial path or an undici connect-interceptor inside `safeFetch`. No new module, no new config surface, no new runtime service.

## MINIMAL PATCH
1. In `isPublicIp` v6 branch: unwrap transition forms before the public verdict. Node has no `ip.is_global`; implement the equivalent: for `64:ff9b::/96`, `2002::/16`, `::/96` (and keep the existing `::ffff:` handling), extract the embedded IPv4 and recurse `isPublicIp` on it; reject when the embedded form is non-public. Keep the existing explicit list (audit clarity), add the unwrapping.
2. (Follow-on, separate writer task) close the same-hop TOCTOU with a post-connect `remoteAddress` re-check on the fetch path (Firecrawl pattern), or a pinned-dial via a custom undici dispatcher (Crawl4AI semantics); either keeps `fyd/net` as the single authority.
3. Opaque the private-IP fail reason (drop the echoed address) once `classifyFetchFailure` is decoupled from reason prefixes; BACKLOG.

## EXPECTED DELETION-SIMPLIFICATION
CURRENT PING LOC TOUCHED: ~60 (isPublicIp v6 branch plus call sites unchanged). DONOR LOC EXAMINED: ~560 (egress_broker.py, egress_proxy.py, utils.py SSRF section, validateUrl.ts, safeFetch.ts, tests). EXPECTED PING LOC ADDED: ~30-40. EXPECTED PING LOC REMOVED: 0 (additive restriction; the explicit CIDR list stays for readability). NET LOC: ~+35. NEW DEPENDENCIES: 0. NEW AUTHORITIES: 0. NEW RUNTIME SERVICES: 0.

## TEST THAT PROVES IMPROVEMENT
Add to the existing hostile suite (`src/fyd/acquisition/__tests__/hostile.test.ts` style, injectable `dnsLookup`, no real network):
1. `dnsLookup` returns `[{address: "64:ff9b::7f00:1"}]` for a seed hostname: expect fetch never issued and `ACQ_PRIVATE_IP`. Same for `2002:7f00:1::` and `::7f00:1`.
2. Redirect-chain variant: seed resolves public, 302 Location points at a hostname resolving to `64:ff9b::a00:1`: expect `ACQ_PRIVATE_IP` at the acquire stage and the private URL never fetched (mirrors the existing pivot test at line 191).
3. Positive controls: `2606:4700:4700::1111` and a plain public A record still pass the gate (no false positives on legitimate global IPv6).
4. TOCTOU half (when the pinned-dial/socket-check lands): `dnsLookup` returns public but `fetchImpl` is instrumented to observe the address actually dialed; with fast-flux stubbing, assert the connection target equals the validated pinned IP, never a second resolution's answer.

## BENCHMARK IF RELEVANT
None. This is a correctness/security harvest; the metric is hostile-URL classes rejected (before/after matrix above), not throughput.

## SECURITY CONSEQUENCES
- Closes an SSRF bypass class: attacker-controlled DNS returning NAT64/6to4/v4-compat addresses that embed RFC1918/loopback/link-local IPv4. In NAT64-routed or 6to4-routed environments these reach the embedded private target; PING accepts such URLs today.
- The resolve-and-pin/socket-check half removes the residual same-hop DNS-rebinding window that per-hop re-validation alone cannot close.
- Opaque failure reasons remove a minor DNS-oracle (resolved internal IPs currently echoed into fail reasons, which flow into acquisition reports).
- Residual risks after this harvest: Teredo `2001::/32` embedding is uncovered on BOTH sides (neither unwraps it); https-to-http downgrade redirects are still allowed by scheme check; robots.txt missing-file is fail-open (documented, keep); the 5-hop bound plus any-answer-non-global rule make large-scale internal port-scanning via redirect chains impractical but the initial connection attempt still completes a TCP handshake before any post-connect teardown (Firecrawl-pattern cost).
- No new attack surface: patch is additive restriction inside the existing gate, zero new dependencies, zero new authorities.

## MIGRATION-RISK
Low. `isPublicIp` is exported and shared by the acquisition adapter and the media shim; the change only newly rejects addresses that are semantically non-global (no legitimate public traffic uses NAT64/6to4/v4-compat forms to reach real services; positive controls in the test prove global v6 still passes). Run the existing `src/fyd/net/__tests__` suite plus `hostile.test.ts` before and after. The TOCTOU half is a larger change (dial path) and should ship as a separate tested step.

## DECISION
HARVEST, narrow and license-clean: adapt Crawl4AI's single-rule transition-form unwrapping (`deploy/docker/egress_broker.py`, Apache-2.0, attribution preserved) into `fyd/net/safe-fetch.ts isPublicIp`; record resolve-and-pin / post-connect socket verification as the follow-on hardening for the same-hop rebinding window (Firecrawl pattern is reference-only, AGPL). PING WINS outright on redirect policy (deterministic 5-hop bound with per-hop re-validation vs Firecrawl's 5000 and Crawl4AI's browser-driven hops), failure taxonomy (17 typed codes vs opaque/generic), content-type pre-buffer gating, and URL normalization strictness (WHATWG parse vs prefix/regex checks); those areas need nothing.

## Per-candidate license record (for the harvest DB; existing rows, no new rows)
- Crawl4AI (unclecode/crawl4ai): Apache-2.0. License endpoint + LICENSE body verified at pin e5d2e786d1a101225f3f6a3e6fd344d76eeb13af. No file-level exceptions found in the examined SSRF files. No copyleft. Apache-2.0 patent grant applies. Attribution: preserve Apache-2.0 notice if code is adapted. Security history: SSRF reported externally 2026-04-18 (secsys_codex), fixed; internal review found IPv6-mapped bypass; both addressed in the harvested module. Maintenance: very active (HEAD 2026-09-25). Suggested mechanisms append: "egress_broker single-rule is_global + transition-form unwrapping + resolve-and-pin (SSRF); pinning forward-proxy pattern for browser egress".
- Firecrawl (firecrawl/firecrawl): AGPL-3.0 (license endpoint spdx_id, verified live 2026-09-28). PATTERN/REFERENCE ONLY per binding law; no code copied, no clone made (GitHub API reads only). SDKs partly MIT but irrelevant here. Copyleft/network-copyleft: any adapted AGPL code would trigger share-alike; not pursued. Suggested mechanisms append: "post-connect socket.remoteAddress check via undici connect interceptor (pattern only)".
- Branch note: upstream moved mendableai/firecrawl -> firecrawl/firecrawl (301). candidates.json already uses the canonical name; no conflict.

## Evidence rule for estimates (per binding law)
No lines-saved fiction claimed. Numbers above are measured: PING files read in full (1809 lines acquisition + 616 lines net), donor files read in full (~560 lines plus tests).
