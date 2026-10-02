# LANE E: Acquisition falsification — evidence pack (2026-09-25 ~09:36-09:38 MDT)

Target: /home/nolan/projects/ping @ fyd/sprint-integration-2026-09-24 (commit 82b42053), Pig WSL.
Gate under test: src/fyd/net/safe-fetch.ts (canonical; src/fyd/media/safe-fetch.ts is a pure re-export shim).
Method: real safeFetch/safeFetchPage with REAL DNS (node:dns/promises) and REAL global fetch. No mocks.
Loopback listener on 127.0.0.1:18923 logged every inbound connection (proof of no-connect vs connect).

## Attack results

33 probes. 30 BLOCKED, 3 LEAKED (one root cause: D1).

| # | Attack | Expected | Actual | Evidence |
|---|--------|----------|--------|----------|
| B1 | http://127.0.0.1:18923/ | BLOCKED | BLOCKED | reason="DNS rejected: IP literal is not public routable space: 127.0.0.1"; listener: 0 connects |
| B2 | http://127.0.0.1/ | BLOCKED | BLOCKED | same reason, hops=0 |
| B3 | http://localhost:18923/ | BLOCKED | BLOCKED | reason="DNS rejected: DNS for localhost resolves to non-public 127.0.0.1"; 0 connects |
| B4 | http://[::1]:18923/ | BLOCKED | BLOCKED | IP literal not public; 0 connects |
| B5 | http://10.0.0.1/ | BLOCKED | BLOCKED | IP literal not public |
| B6 | http://192.168.1.1/ | BLOCKED | BLOCKED | IP literal not public |
| B7 | http://172.16.5.4/ | BLOCKED | BLOCKED | IP literal not public |
| B8 | http://169.254.169.254/ | BLOCKED | BLOCKED | IP literal not public (link-local/metadata) |
| B9 | http://169.254.169.254/latest/meta-data/ | BLOCKED | BLOCKED | IP literal not public |
| C1 | http://[::ffff:127.0.0.1]:18923/ | BLOCKED | BLOCKED | dotted v4-mapped caught; 0 connects |
| C2 | http://[::ffff:7f00:1]:18923/ | BLOCKED | **LEAKED** | isPublicIp("::ffff:7f00:1")=true; HTTP 200, 15b body; LISTENER LOGGED CONNECT 2026-09-25T15:36:28.586Z |
| C3 | http://[::FFFF:7F00:1]:18923/ | BLOCKED | **LEAKED** | same; connect logged 15:36:28.595Z (case-insensitive bypass) |
| C4 | (repeat hex) | BLOCKED | **LEAKED** | connect logged 15:36:28.598Z |
| D1 | http://2130706433:18923/ (decimal) | BLOCKED | BLOCKED | normalized to 127.0.0.1, rejected; 0 connects |
| D2 | http://0x7f000001:18923/ (hex) | BLOCKED | BLOCKED | normalized to 127.0.0.1, rejected |
| D3 | http://017700000001:18923/ (octal) | BLOCKED | BLOCKED | normalized to 127.0.0.1, rejected |
| E1-5 | file:///etc/passwd, data:text/html, javascript:alert(1), ftp://, gopher:// | BLOCKED | BLOCKED | reason="URL rejected: Scheme not allowed: <scheme>:"; fetch never attempted |
| F1 | http://user:pass@example.com/ | BLOCKED | BLOCKED | reason="URL rejected: Credential-bearing URLs are rejected" |
| F2 | https://user:pass@127.0.0.1:18923/ | BLOCKED | BLOCKED | credential check fires before DNS check |
| G1 | http://10.0.0.1.nip.io:18923/ | BLOCKED | BLOCKED | reason="DNS rejected: DNS for 10.0.0.1.nip.io resolves to non-public 10.0.0.1" (real DNS) |
| G2 | http://127.0.0.1.nip.io:18923/ | BLOCKED | BLOCKED | resolves to non-public 127.0.0.1; 0 connects |
| G3 | http://169.254.169.254.nip.io/latest/meta-data | BLOCKED | BLOCKED | resolves to non-public 169.254.169.254 |
| H1 | httpbin redirect -> http://127.0.0.1:9/ | BLOCKED | BLOCKED | hop 1 re-validated: IP literal not public; hops=1 |
| H2 | httpbin redirect -> http://169.254.169.254/latest/meta-data | BLOCKED | BLOCKED | hop 1 re-validated; hops=1 |
| H3 | httpbin redirect -> http://10.0.0.1.nip.io/ | BLOCKED | BLOCKED | hop 1 DNS re-validated; hops=1 |
| H4 | httpbin redirect -> https://example.com/ (control) | SUCCEED | SUCCEED | 559b, final=https://example.com/, hops=1 (redirects followed when safe) |
| H5 | httpbin redirect -> http://user:pass@example.com/ | BLOCKED | BLOCKED | hop 1 shape check: credential-bearing; hops=1 |
| H6 | httpbin redirect -> file:///etc/passwd | BLOCKED | BLOCKED | hop 1 shape check: scheme; hops=1 |
| I1 | httpbin /bytes/300000, maxBytes=100000 | BLOCKED | BLOCKED | reason="Declared size 102400 exceeds limit 100000" (content-length pre-check) |
| I2 | httpbin /stream-bytes/300000 chunked, maxBytes=100000 | BLOCKED | BLOCKED | reason="Body exceeded size limit 100000" (streaming abort, no content-length) |
| I3 | httpbin /delay/10, timeoutMs=2500 | BLOCKED | BLOCKED | reason="Fetch failed: The operation was aborted due to timeout" (2507ms) |
| J1 | https://example.com/ via safeFetchPage (control) | SUCCEED | SUCCEED | 559b text/html, hops=0 |
| S1 | HTTP://EXAMPLE.COM/ | SUCCEED | SUCCEED | scheme/host normalization fine |
| S2 | http://example.com./ (trailing dot) | SUCCEED | SUCCEED | 559b (resolves to same public IP; benign) |
| S3 | http://@example.com/ (empty userinfo) | SUCCEED | SUCCEED | 559b; empty credentials stripped by URL parser, no leak |

No probe threw: every rejection returned { ok:false } (fail-closed, no exceptions to callers).

## End-to-end chain trace (live, production modules, real network)

URL: https://www.coppersmithplumbing.com/ (live refetch 2026-09-25 09:37 MDT)

1. SAFE FETCH: safeFetchPage -> 117,900 bytes, HTTP 200, text/html, finalUrl=https://www.coppersmithplumbing.com/, 0 hops.
2. RAW OBSERVATION: bytes written to raw/coppersmith-plumbing/index.html, sha256=58ffeebb9d2050e112b6b282f0c118dea18cc47600b369d09fb6a86b35abbd6a (matches SHA256.txt).
3. EVIDENCE: runExtractionPipeline(AcquiredSource{raw: <117900 bytes>}) -> factsDiscovered=50, DIRECT_FACT=50, bySource={html:12, html-meta:2, json-ld:29, opengraph:7}, graphNodesVisited=11, privateWithheld=1.
4. OBJECT GRAPH: 8 objects (ping.social.business@1, location@1, person@1, external_identity@1, service@1), 7 relationships (located_at, offers, works_for, links_to). Business node id=website-business-2a0017a7abb77125: title="Coppersmith Plumbing - HVAC - Mechanical" (DIRECT_FACT), phone="970-245-3869" (DIRECT_FACT). Street address withheld from graph (privateWithheld=1).

The regression-corpus assertion (phone 970-245-3869 as DIRECT_FACT, 11 @graph nodes) reproduces on LIVE bytes, not just the stored corpus.

Artifacts in this dir: attack.mts, supp.mts, chain.mts (harnesses), listener.mjs, connections.log (3 connects = the 3 LEAKED probes), chain-graph.json, chain-report.json, raw/coppersmith-plumbing/index.html + SHA256.txt.

## Defects

D1 (CONFIRMED, exploitable): isPublicIp's IPv4-mapped branch only matches dotted-decimal (::ffff:1.2.3.4). Hex form ::ffff:7f00:1 (= 127.0.0.1) classifies as PUBLIC and live-fetches loopback. Same for any private target, e.g. ::ffff:a00:1 = 10.0.0.1. Smallest fix (src/fyd/net/safe-fetch.ts, isPublicIp v6 branch): after lowercasing, match /^::ffff:([0-9a-f:.]+)$/; if tail contains ".", recurse as today; else if /^[0-9a-f]{1,8}$/ on the colon-stripped tail, convert low-32-bit hex to dotted quad and recurse; else return false (fail closed).

R1 (residual risk, not a defect): DNS is validated by the gate but fetch re-resolves at connect time (two independent resolutions; TOCTOU DNS-rebinding window within a hop). Hardening direction: pin the validated IP per hop and fetch via IP with original Host header / TLS SNI. Larger change; flagging for Lane A triage.

## Phantom-path sweep

- src/fyd/media/safe-fetch.ts is a pure re-export shim (no second implementation).
- Live safeFetch callers: src/fyd/onboarding/anonymous-preview.ts, src/fyd/media/ingest.ts only.
- proceduralizer.acquire() takes injected fetchImpl and has ZERO non-test callers (test seam only).
- src/app/api/mc/technology/route.ts fetch() calls use hardcoded 127.0.0.1 health URLs (dashboard self-probe), no user input.
- Zero mentions of acquireUrl anywhere. No second fetch path found.
