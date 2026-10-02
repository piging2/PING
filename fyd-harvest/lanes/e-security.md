# FYD HARVEST AUDIT — LANE E: HOSTILE-INPUT SECURITY

**Date:** 2026-09-22
**Branch audited:** `fyd/builder-composition` (read-only via Pig bridge; zero writes, zero installs, zero test runs)
**Threat model:** acquisition/ingestion accepts arbitrary customer URLs. Every URL, header, redirect, HTML byte, JSON-LD block, feed item, image reference, and fact string is attacker-controlled until proven otherwise.
**Scope:** `src/fyd/net/` (safe-fetch, budgets, rate-limit), `src/fyd/onboarding/` (anonymous preview + extractor), `src/fyd/media/` (discover, ingest, derivatives, select), `src/fyd/proceduralize/` (structured-data, feed-parser, proceduralizer), `src/fyd/acquisition/` (adapter contract), `src/fyd/object/` (view/capabilities), every `href=`/`src=` render sink under `src/fyd`, URL-accepting API routes, `src/middleware.ts`, the ActivityPub adapter.

---

## 0. What the `javascript:` fix actually covers (and what it does not)

The fix is `resolveSafeLink` in `src/fyd/sitespec/safe-link.ts`: parser-based (not scheme-regex), per-capability allowlists (`navigate` → http/https only; `call` → tel: from phone chars; `email` → mailto: from address shape), control-character rejection, relative refs non-navigable without a safe base.

**Covered (verified at each sink):**
- `src/fyd/components/renderer.tsx:727` — `safeWebsite()` gates the site-renderer website link.
- `src/fyd/components/renderer.tsx:1447` — social links each gated.
- `src/fyd/components/contact-link.tsx:169` — `method.actionUri`, built by `contactMethodFor` (`src/fyd/object/object-projection.ts:122`), which returns null unless `resolveSafeLink` says safe.

**NOT covered — raw observed strings still reach executable sinks:**
1. `src/fyd/object/view.ts` `buildCapabilities()` (~lines 187–193): `contact.website` → `href` with **no gate at all**; `contact.phone` → `"tel:" + raw`; `contact.email` → `"mailto:" + raw`. These `ObjectCapability` hrefs render **ungated** in:
   - `src/fyd/ui/fyd-circle.tsx:545` (`<a href={a.href}>`),
   - `src/fyd/object/evidence-chrome.tsx:111-138` (`<a href={cap.href}>`),
   - `src/fyd/ui/identity-object.tsx:237` (`<a href={c.href}>`),
   - `src/fyd/ui/object-layer/presentation-spec.ts:180-186` → `PeekCard.tsx:148` (`<a href={action.href}>`).
2. `src/fyd/ui/spatial/center-portal.tsx:103` — `href={f.value}` gated only by an ad-hoc `f.value.startsWith("https://")` (blocks `javascript:` by luck of prefix, not by policy).
3. Competing implementations of the same rule (sovereignty violation): `isSafeWebHref` regex in `src/fyd/preview/types.ts:46` (`/^https:\/\/[^\s/$.?#].[^\s]*$/i`) — scheme-regex-based, exactly the pattern `safe-link.ts`'s docs reject ("There is no scheme regex to smuggle past"). Used correctly today (`openWebsite` in `capabilities/runtime.ts:101-104` refuses unsafe hrefs before `window.open`; `ObjectCircle.tsx:314`, `portal-circle.tsx:105`, `preview/pipeline.ts:101` re-gate), but three authorities for one rule means the next caller picks the wrong one.

**Bottom line:** the fix covers the site-spec renderer and the contact-link component. It does **not** cover the ObjectView capability path, which is the path that renders on the Circle, the evidence chrome, and the peek cards.

---

## 1. Threat-by-threat findings

Verdicts: **VULNERABLE** / **MITIGATED** / **UNKNOWN** (needs a live test) / **N/A**.

### T1. Stored XSS via ungated capability hrefs — VULNERABLE (highest urgency)
- **Chain (fully traced):** hostile `<meta property="og:url" content="javascript:alert(document.domain)">` or JSON-LD `"url": "javascript:alert(document.domain)"` → `ogToField` maps `og:url`→`website` (`proceduralizer.ts:318`); `LITERAL_FACTS` maps JSON-LD `url`→`website` (`structured-data.ts`); `cleanString` (`proceduralizer.ts:358`) strips tags and collapses whitespace but leaves the scheme intact → `website` fact → object graph field → `composeObjectView` reads `field(obj, "website")` (`view.ts`) → `buildCapabilities` pushes `{ kind: "website", href: contact.website }` with no gate (`view.ts:~192`) → clickable "Website" button in fyd-circle, evidence-chrome, identity-object, PeekCard.
- **Also:** `tel:`/`mailto:` caps in `buildCapabilities` do zero validation (unlike `contactMethodFor`, which gates). `tel:`/`mailto:` cannot execute script, but an unvalidated phone like `+1\u0000...` or 2000-char garbage reaches the dialer string; and any future change of those prefixes to `navigate` inherits the hole silently.
- **Why the existing fix missed it:** `resolveSafeLink` was applied to the renderer and contact-link paths, but `buildCapabilities` (the ObjectView path) was written as trusted-internal and interpolates raw graph fields.
- **Concrete threat test:** ingest HTML containing `<meta property="og:url" content="javascript:alert(1)">`; assert every rendered `website` capability href across `fyd-circle`, `evidence-chrome`, `identity-object`, `PeekCard` is either absent or `http(s):`. Today the test fails (href renders verbatim).

### T2. SSRF bypass via IPv6 hex-form IPv4-mapped addresses — VULNERABLE
- **Location:** `src/fyd/net/safe-fetch.ts` `isPublicIp()`. The IPv4-mapped check is `low.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)` — dotted quad only. `http://[::ffff:7f00:1]/` (hex form of 127.0.0.1) matches none of the v6 guards and returns **true** (public). Same gap for `::ffff:0:127.0.0.1`-style forms. Untested-but-likely gaps in the same function: 6to4 `2002:7f00:1::`, NAT64 `64:ff9b::7f00:1`, Teredo `2001::/32`, unspecified `::`.
- **This is exactly the class Crawl4AI closed in 0.8.8** ("rejects any resolved address that is not globally routable, evaluated on IPv6 transition forms too — NAT64 `64:ff9b::/96`, 6to4 `2002::/16`, IPv4-mapped, and the unspecified `::` — which previously bypassed the explicit blocklist").
- **Concrete threat test:** `isPublicIp("::ffff:7f00:1")`, `isPublicIp("::ffff:0:7f00:1")`, `isPublicIp("64:ff9b::7f00:1")`, `isPublicIp("2002:7f00:1::")`, `isPublicIp("::")` must all be false. Today the first is true.

### T3. DNS rebinding (TOCTOU between gate DNS check and fetch connect) — VULNERABLE
- **Location:** `safe-fetch.ts` `hostResolvesPublic()` resolves via `dns.lookup`, then `fetchImpl` re-resolves independently at TCP connect. An attacker-controlled domain with TTL-0 DNS can pass the gate on a public IP and rebind to `169.254.169.254` / `127.0.0.1` before connect. No peer-IP pinning anywhere.
- **Crawl4AI 0.9.3 (GHSA-q5rj-45vw-vp2g) fixed this exact shape** by "validating the peer IP of the response actually read back."
- **Concrete threat test:** a test DNS name alternating between a public IP and `169.254.169.254`; fetch must fail closed on the rebind. Today it can succeed.

### T4. Resolved-address echo to anonymous callers (DNS oracle) — VULNERABLE
- **Location:** `safe-fetch.ts` fail reasons include the resolved address verbatim (`"DNS for " + hostname + " resolves to non-public " + a.address`), and `POST /api/fyd/onboarding/preview` returns `res.reason` to **unauthenticated** callers (`anonymous-preview.ts` → route maps `fetch-failed` → 502 with message). An attacker can enumerate internal DNS → IP mappings through the public preview endpoint.
- **Crawl4AI 0.8.8:** "SSRF errors no longer echo the resolved address."
- **Concrete threat test:** `POST /api/fyd/onboarding/preview` with `{"url":"http://internal-only-host/"}` must return a generic failure with no IP literal in the body. Today the IP leaks.

### T5. ActivityPub adapter fetches outside the SSRF gate — VULNERABLE (latent)
- **Location:** `src/fyd/adapters/activitypub/webfinger.ts:78` — `fetch(actorUri)` where `actorUri` is a remote-supplied WebFinger `self` link; default redirect following (20 hops), no scheme check, no private-IP DNS validation. `endpoints.ts:38` POSTs a signed activity to a remote-supplied `inboxUrl`, same exposure class.
- **Mitigating context:** today only the dev probe (`probe-roundtrip.ts`) calls these; no production route wires them. The shape matches Crawl4AI 0.8.7's webhook-SSRF advisory (blocklist + `follow_redirects=False`).
- **Concrete threat test:** `resolveAcct("acct:x@attacker")` with the attacker's WebFinger returning `self` → `http://169.254.169.254/` must be refused before connect. Today it is fetched.

### T6. Anonymous rate limit bypass via X-Forwarded-For spoofing — VULNERABLE (known, documented)
- **Location:** `src/app/api/fyd/onboarding/preview/route.ts` `clientIdFor()` trusts `x-forwarded-for` without a trusted-proxy check; `rate-limit.ts` documents this as "the known next boundary." Rotating the header gives unlimited anonymous generations → unlimited SSRF probing through T2/T3/T4.
- **Concrete threat test:** N requests with rotating `X-Forwarded-For` must still hit the quota. Today each new value gets a fresh bucket.

### T7. `javascript:`/`data:`/`file:` at the fetch gate — MITIGATED
- `checkUrlShape` (`safe-fetch.ts`) allowlists `http:`/`https:` only; rejects `file:`, `data:`, `javascript:`, `vbscript:`, `blob:`. Every hop of every redirect is re-validated (`redirect: "manual"` loop, max 5, per-hop scheme+credential+DNS check). `discover.ts` `pushUnique` additionally drops non-`http(s)` and `data:` image refs.

### T8. Credential-bearing URLs — MITIGATED (fetch), note on handling
- Rejected at `checkUrlShape` before DNS/fetch. Credentials never reach the redirect chain (chain entries are pushed only after the shape check passes), never reach the claim store (claims record post-gate `finalUrl`), and fail reasons carry the hostname only — not userinfo. No logging of raw URLs found in the path.

### T9. Redirect-to-private-address — MITIGATED
- Manual redirect loop re-runs scheme, credential, and DNS validation on **every** hop; a redirect into private space is rejected, not followed. Max 5 redirects; loops terminate with "Too many redirects."

### T10. Oversized responses / decompression bombs — MITIGATED
- `content-length` pre-check + streaming abort at `maxBytes` (15 MB default, 5 MB page, 1 MB preview). Undici auto-decompresses gzip/br, and the streaming reader counts **post-decompression** bytes, so a zip bomb aborts at the cap instead of filling memory; aborting also bounds decompressor CPU. Media pipeline adds a second guard: `derivatives.ts` `MAX_SOURCE_DIMENSION` 8000 / `MAX_SOURCE_PIXELS` 64M, rejected before full decode.

### T11. Infinite navigation / resource explosion — MITIGATED
- Anonymous preview fetches exactly one page (no link following). Media ingest caps at 40 images/site. Budgets (`budgets.ts`): 6 pages / 8 MB per anonymous generation, 2 in-flight per origin / 6 global, dedup cache, token bucket (burst 3) + 10 generations/hour/client. L3 discovery exists only as types (`acquisition-adapter.ts`) — no implementation to explode yet.

### T12. Malformed HTML — MITIGATED
- `extractor.ts` uses bounded regexes (cannot throw on pathological input; worst case is a missed field). `discover.ts` uses `node-html-parser` (commodity parser). `structured-data.ts` discovery regex is bounded; parse failures are recorded as `malformed-block` unsupported evidence, never thrown.

### T13. Malformed JSON-LD / parser crashes — MITIGATED
- Three nested fail-closed layers: `discoverStructuredData` try/catch per block, `expandJsonLdBlocks` try/catch per expansion (records `expansion-failed`), `extractor.ts parseJsonLd` try/catch (silently ignored). Remote `@context` SSRF is closed by design: `offlineDocumentLoader` throws for every URL except schema.org, and schema.org is rewritten to an inline `{"@vocab"}` — the pipeline **never fetches remote contexts**.

### T14. Prototype pollution via JSON-LD `__proto__` — MITIGATED
- No merge/assign sinks in the pipeline. `offlineContext` uses object spread (copies `__proto__` as an own data property; does not touch the prototype). All downstream access is reads (`rec["@type"]`, `Object.keys`, `Map.set`). `JSON.parse` alone does not pollute.
- **Concrete threat test (to lock it in):** run `extractStructuredData` on a block containing `{"__proto__":{"polluted":true}}` and `{"@type":"LocalBusiness","__proto__":{"x":1}}`; assert `({}).polluted === undefined` and no fact named `polluted`/`x` is emitted.

### T15. Malicious PDFs — N/A
- No PDF parsing exists anywhere under `src/fyd` (grep for `pdf` returns nothing outside tests). The 0.9.3 PDF advisories have no FYD surface to map to. If a PDF tier is ever added, it must arrive with the 0.9.3 mitigations pre-applied (per-hop destination checks, byte/page caps unraisable by callers, no caller-chosen output paths, escaped text sinks).

### T16. HTML/script injection into stored observation text — MITIGATED (text), see T1 for hrefs
- Observations store raw hostile strings, but every text render path is React-escaped JSX. No `dangerouslySetInnerHTML` in `src/fyd` render paths. (The two `dangerouslySetInnerHTML` uses in the repo are first-party: `app/layout.tsx` static org JSON-LD, and `app/blog/[slug]/page.tsx` rendering repo-committed markdown via `renderMarkdown` — see T17.)

### T17. Blog `renderMarkdown` javascript: href — VULNERABLE (low; first-party content)
- `src/lib/blog.ts` `renderInline`: `[text](url)` → `<a href="$2">` with no scheme check; `[x](javascript:alert(1))` renders a live javascript: link into `dangerouslySetInnerHTML`. Content is repo-committed markdown (author = Nolan), so exploitability requires repo write access — low urgency, but the sink should still be gated for defense in depth.

### T18. Path traversal in cache/download filename derivation — MITIGATED
- Derivative files are content-addressed: `public/fyd-media/<sha256>/<name>-<width>w.<ext>` (`derivatives.ts`); attacker-controlled filenames never reach the filesystem (`ingest.ts` uses the URL pathname only for role/title heuristics). Claim store paths are gated by `isValidResourceId` (`claim/store.ts`). `manifestPath`/`publicDir` are operator-supplied, not remote-derived. (Defense-in-depth adapt from Crawl4AI 0.9.0: add a realpath-containment assertion on `publicDir` writes.)

### T19. Cookie/session handling — MITIGATED
- Node's global fetch has no cookie jar; `safe-fetch.ts` sends no cookies, no auth headers, only a static `User-Agent`. No credentialed requests are possible through the gate.

### T20. Observation poisoning (fake facts from hostile markup) — ACCEPTED BY DESIGN, note
- HTML comments, hidden divs, and hostile JSON-LD become `OBSERVED`-class claims. The claim machine labels them website statements (weakest class), which is the honest posture — but a hostile or compromised customer site can plant arbitrary "observed" business facts that render on FYD surfaces. Worth a product-level decision, not a code bug.

### T21. robots.txt — GAP (policy, not hostile-input)
- Nolan's ladder requires L0 robots/policy checks. `requireRobotsTxt` exists only as a field on the unimplemented `AcquisitionPolicy` type (`acquisition-adapter.ts`). The live paths (`safeFetchPage`, media ingest, anonymous preview) perform **no** robots.txt fetch or check.

### T22. `src/middleware.ts` `/build/*` restriction — noted as the existing boundary style
- `DISABLED_PAGE_PREFIXES` 404s `/build/*`, `/objects/*`, `/sites/*`, `/portal-rail/*`, `/o/*` **page** routes; API routes are explicitly never disabled. Clean, narrow, documented pattern — the model for future boundary rules (e.g. "anonymous URL-accepting routes must pass through `fyd/net`").

---

## 2. Crawl4AI 2026 hardening vs FYD — fix-class comparison

Primary source: `unclecode/crawl4ai` CHANGELOG.md + release notes (0.9.3, 2026-08-31; 0.9.0, 2026-06-18; 0.8.9/0.8.8, 2026-06-04; 0.8.7, 2026-06-01).

| # | Crawl4AI fix class | FYD exposure? | Adapt? |
|---|---|---|---|
| 1 | SSRF via redirect (0.9.3, GHSA-q5rj-45vw-vp2g): hand-resolved redirects, per-hop destination check, 5-hop bound, **peer-IP validation to close DNS rebinding** | Partial: per-hop checks + 5-hop bound exist; **peer-IP/DNS-rebinding close missing** (T3) | **YES — pin peer IP or re-validate post-connect** |
| 2 | IPv6 transition-form SSRF bypass (0.8.8): NAT64 `64:ff9b::/96`, 6to4 `2002::/16`, IPv4-mapped, `::` | **Same exposure** (T2): hex-form `::ffff:7f00:1` passes `isPublicIp` | **YES — extend `isPublicIp` to all transition forms; normalize mapped-v4 before the check (0.8.7 technique)** |
| 3 | SSRF errors echo resolved address (0.8.8) | **Same exposure** (T4): fail reasons leak resolved IPs to anonymous callers | **YES — generic caller-facing messages; full detail server-side only** |
| 4 | Arbitrary file write via request-controlled paths (0.9.3 GHSA-xpp7-j28w-2gvx; 0.8.7 `output_path`; 0.9.0 basename+realpath+O_NOFOLLOW) | Not exposed: content-addressed writes; add realpath-containment assert as depth | Adapt the **pattern** (containment assertion), no live bug |
| 5 | Uncapped PDF download/parse DoS (0.9.3, 100 MiB / 2000 pages, unraisable by untrusted callers) | N/A today; the **"untrusted callers cannot raise caps"** rule applies to FYD's budgets when L2/L3 land | **YES as a standing rule** |
| 6 | XSS via unescaped text in `cleaned_html` (0.9.3); stored XSS via innerHTML (0.8.7); DOM XSS → token theft (0.9.3) | **Same class, live** (T1): raw observed URL → executable href in four render paths | **YES — route all capability hrefs through `resolveSafeLink`** |
| 7 | Webhook SSRF: blocklist + `follow_redirects=False` (0.8.7) | Latent in ActivityPub adapter (T5) | **YES when the adapter goes live: route through `safe-fetch`** |
| 8 | Proxy-mediated SSRF (0.8.9): validate proxy destinations too | N/A: FYD honors no request-supplied proxy | Standing rule: never accept request-supplied proxy config |
| 9 | LLM credential exfiltration via request `base_url` (0.8.8) | N/A today (zero model calls) | **YES as a standing rule** for the future intelligence lane |
| 10 | Secure-by-default server: auth on, loopback bind, declarative-only request bodies, CORS deny-by-default, bounded queues, generic 5xx + correlation IDs (0.9.0) | Partial: the anonymous preview route is intentionally unauthenticated; fail reasons are **not** generic (T4); no correlation IDs | **YES — generic errors + correlation IDs on anonymous routes** |
| 11 | CRLF-safe logging (0.8.8) | Unknown: fail reasons embed hostile hostnames/URLs; if these reach logs unscrubbed, log injection is possible | Check log sinks; strip CR/LF/control chars |
| 12 | AST/hook sandbox RCE, hardcoded JWT, `/execute_js` (0.8.7/0.8.0) | N/A: no eval, no hooks, no JS execution endpoints | — |

**Worth-adapting summary:** peer-IP/DNS-rebinding close; IPv6 transition-form blocklist; no resolved-address echo; `resolveSafeLink` on every capability href; generic anonymous errors with correlation IDs; untrusted-body/caps discipline for all future acquisition tiers; ActivityPub through `safe-fetch` before it goes live.

---

## 3. Backlog items (each with its threat test as acceptance test)

**B1. Gate every ObjectView capability href through `resolveSafeLink`.** Fix `buildCapabilities` (`src/fyd/object/view.ts`) to resolve `website`/`phone`/`email` via `resolveSafeLink` and emit no capability on `non_navigable` (matching `contactMethodFor`'s contract). Also replace the ad-hoc `startsWith("https://")` in `center-portal.tsx:103` with the same gate. *Threat test:* ingest `<meta property="og:url" content="javascript:alert(1)">` + JSON-LD `"url":"javascript:alert(1)"`; assert no rendered `website` capability href in fyd-circle, evidence-chrome, identity-object, PeekCard, center-portal is non-http(s). (Closes T1; the Crawl4AI stored-XSS analog.)

**B2. Close the IPv6 transition-form SSRF bypass in `isPublicIp`.** Normalize IPv4-mapped/6to4/NAT64/Teredo forms to their embedded v4 before the blocklist check (Crawl4AI 0.8.7 technique) and explicitly reject `::`, `64:ff9b::/96`, `2002::/16`, `2001::/32`, and hex-form `::ffff:` embeddings. *Threat test:* `isPublicIp` returns false for `::ffff:7f00:1`, `::ffff:0:7f00:1`, `64:ff9b::7f00:1`, `2002:7f00:1::`, `::`, `2001::1`; true for a real public v6. (Closes T2.)

**B3. Close DNS rebinding (validate the peer IP actually connected to).** Pin DNS per fetch (custom undici lookup that reuses the validated addresses) or re-validate the socket's remote address post-connect and abort on mismatch, per Crawl4AI 0.9.3. *Threat test:* TTL-0 hostname alternating public ↔ `169.254.169.254`; every fetch fails closed. (Closes T3.)

**B4. Stop echoing resolved addresses to anonymous callers.** Strip IP literals from `SafeFetchFail.reason` at the API boundary; return generic messages (`fetch-failed`) with a server-side correlation ID (Crawl4AI 0.9.0 pattern). *Threat test:* preview POST against an internal-only hostname returns no IP literal in the response body. (Closes T4.)

**B5. Route the ActivityPub adapter through `fyd/net`.** `resolveAcct`/`postToInbox` must use `safeFetch` (manual redirects, per-hop checks) before the adapter is wired to any production route; add an explicit "not for production use until gated" marker. *Threat test:* WebFinger `self` → `http://169.254.169.254/` is refused pre-connect. (Closes T5.)

**B6. Harden the anonymous client key.** Do not trust `X-Forwarded-For` without a configured trusted proxy; fall back to the socket remote address, and document the deploy requirement. *Threat test:* rotating `X-Forwarded-For` still exhausts the quota. (Closes T6.)

**B7. Unify URL safety under one authority.** Deprecate `isSafeWebHref` (regex) and the inline `startsWith` checks in favor of `resolveSafeLink`; keep exactly one implementation of "is this URL safe to navigate" (SOUL.md rule of one). *Threat test:* grep finds no scheme-regex URL validation outside `safe-link.ts`. (Structural; prevents the next T1.)

**B8. Add the standing acquisition rules before L2/L3 land:** (a) untrusted callers can never raise byte/timeout/redirect caps; (b) no request-supplied proxy config, ever; (c) no request-supplied LLM `base_url` when the intelligence lane goes model-backed; (d) realpath-containment assertion on media/claim writes; (e) per-crawl wall-clock budget; (f) generic 5xx + correlation IDs on all anonymous routes. *Threat test:* each rule gets one negative test in `src/fyd/net/__tests__/`.

**B9. Lock in the already-mitigated classes with regression tests:** `__proto__` JSON-LD → no prototype pollution, no phantom facts (T14); 5 MB hostile XML → `parseFeedXml` returns null without throwing and within a time bound (billion-laughs probe, T12-adjacent); `data:`/`file:`/`javascript:` image refs → never fetched (T7); credential URL → rejected pre-DNS with no credential in any stored record (T8).

**B10. Decide robots.txt posture.** Either implement the L0 robots check the ladder requires or record an explicit, dated decision not to (with rationale). *Threat test:* fetch of a robots-disallowed path behaves per the recorded decision. (T21.)

---

## 4. Notes and open unknowns (need a live test, not a code read)

- Whether undici actually routes `http://[::ffff:7f00:1]/` to loopback in the deploy environment (logic says yes; unproven here).
- Whether `@fedify/fedify`'s `lookupWebFinger` applies any SSRF validation of its own (affects T5 severity, not the fix).
- Whether `fast-xml-parser` expands DTD internal entities by default (billion-laughs probe in B9 will answer).
- Whether fail reasons containing hostile hostnames reach any log sink unscrubbed (CWE-117 check).
- `normalizeFetchKey` lowercases hostnames — fine; no security content.

**Method note:** every finding above is grounded in a file:line read on branch `fyd/builder-composition` via the Pig bridge. Nothing was executed, modified, installed, or committed. Verdicts marked VULNERABLE are code-path-verified (the hostile input has an unbroken path from ingestion to sink); verdicts marked MITIGATED cite the exact guard.
