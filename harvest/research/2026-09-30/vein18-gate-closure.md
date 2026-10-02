# VEIN-18 gate closure: isPublicIp v6 transition-form gap, 2026-09-30

Date: 2026-09-30. Researcher: vein-18 direct child of the FYD x PING harvest pass (flat swarm, no subagents). READ ONLY on the Pig; no repo writes, no writer dispatch from this side.

## Lineage (keyed claims)

- The 09-28 gap was proven against HEAD 4a8c5f2e92eef2a3cb6a11582c37f01c38dfacd9 on branch fyd/sprint-integration-2026-09-24: isPublicIp's v6 branch ACCEPTED NAT64/6to4/v4-compat private-embedded IPv4 (09-28 paper: ~/workspace/harvest/research/2026-09-28/vein18-ssrf-url-safety.md). HARVEST-narrow was named; the gate was not run.
- This pass keys to HEAD ed3ff708b87df904068d785c6dee35646daf1b15 on branch fyd/builder-harvest-trackc-2026-09-28 (verified via git rev-parse on the Pig). The convergence writers rewrote isPublicIp (rewrite commits touching src/fyd/net/safe-fetch.ts: 0264d517 "hardening: fail-closed vocabulary gate + SSRF effective-destination boundary", a6f64f5d, 795227b6).
- The module's own docstring now names the boundary explicitly: transition/encapsulation encodings (IPv4-compatible ::/96, 6to4 2002::/16, NAT64 64:ff9b::/96, ISATAP :0:5EFE:, IPv4-translatable ::ffff:0:0/96) are decoded to their EFFECTIVE IPv4 destination and classified as IPv4; Teredo fails closed (XOR-obfuscated); documentation/benchmarking/unspecified fail closed.

## Gate method (hostile matrix, executed not inferred)

The actual isPublicIp was executed on the Pig from a byte-identical read-only copy of the repo file (sha256 694d2059de6047e0a5b5cefb4ce306e38534b2bcbfe8de313ddc77cf39435005 for both /tmp/vein18/safe-fetch.ts and the repo file; /tmp copy deleted after the run). Node v22.23.2 with --experimental-strip-types imported the .ts verbatim; no retyping, no transcription of the logic. Harness: ~/workspace/harvest/research/2026-09-30/vein18-matrix.mjs.

Result: 31/31 PASS. Every case below shows the ACTUAL function output.

### MUST REJECT (expected false, got false on all)

| input | label | got |
|---|---|---|
| ::1 | v6 loopback | false |
| 0:0:0:0:0:0:0:1 | v6 loopback expanded spelling | false |
| :: | v6 unspecified | false |
| fe80::1 | v6 link-local | false |
| 64:ff9b::7f00:1 | NAT64 embedding 127.0.0.1 | false |
| 64:FF9B::7F00:1 | NAT64 uppercase spelling | false |
| 64:ff9b::a9fe:a9fe | NAT64 embedding 169.254.169.254 (metadata endpoint) | false |
| 64:ff9b::c0a8:1 | NAT64 embedding 192.168.0.1 | false |
| 2002:7f00:1:: | 6to4 embedding 127.0.0.1 | false |
| 2002:ac10:: | 6to4 embedding 172.16.0.0 | false |
| ::ffff:127.0.0.1 | v4-mapped dotted | false |
| ::ffff:10.0.0.1 | v4-mapped dotted RFC1918 | false |
| 0:0:0:0:0:ffff:7f00:1 | v4-mapped uncompressed hex | false |
| ::7f00:1 | v4-compat spelling | false |
| 0:0:0:0:0:0:127.0.0.1 | v4-compat dotted uncompressed | false |
| 0:0:0:0:ffff:0:7f00:1 | SIIT translatable ::ffff:0:0/96 | false |
| 2606:4700:4700:1234:0:5efe:7f00:1 | ISATAP loopback under a public prefix | false |
| ::ffff:1:2:3 | mapped-adjacent unassigned space | false |
| 2001::1 | Teredo | false |
| 2001:db8::1 | documentation range | false |
| 2001:2::1 | benchmarking range | false |
| 127.0.0.1 | v4 loopback | false |
| 10.1.2.3 | v4 RFC1918 | false |
| 169.254.169.254 | v4 metadata endpoint | false |
| 100.64.0.1 | v4 CGNAT | false |

### MUST ACCEPT (expected true, got true on all, no false positives)

| input | label | got |
|---|---|---|
| 93.184.216.34 | public v4 | true |
| 8.8.8.8 | public v4 | true |
| 2606:4700:4700::1111 | public v6 | true |
| 64:ff9b::5db8:d822 | NAT64 embedding 93.184.216.34 (public) | true |
| ::ffff:93.184.216.34 | v4-mapped embedding public v4 | true |
| 2002:5db8:d822:: | 6to4 embedding 93.184.216.34 (public) | true |

The writers also landed their own coverage: src/fyd/net/__tests__/ssrf-adversarial.test.ts carries an "isPublicIp adversarial matrix" describe block (transition forms plus positive controls). The media shim src/fyd/media/safe-fetch.ts remains a pure re-export; still exactly one SSRF implementation.

## Residual TOCTOU trace at ed3ff708 (survives, honestly documented)

Read the full fetch path in safeFetch: per hop, checkUrlShape (scheme, credentials) then hostResolvesPublic(hostname, dnsLookup) which validates the address set DNS returns at check time; then fetchImpl(shape.url.toString(), ...) where fetchImpl defaults to the global fetch (undici), which performs its own independent DNS resolution at connect time. A hostile DNS answering differently per query (rebinding) can steer the socket after validation. Per-hop re-validation does NOT close this: it closes redirect pivots, not the resolve-then-dial window inside a hop.

Grep of src/fyd/net, src/fyd/acquisition, src/fyd/media at ed3ff708: zero occurrences of "remoteAddress". No post-connect socket verification exists anywhere on the path. No pinned dial. The module's own docstring carries a "Residual TOCTOU note" admitting the gap ("must pin the validated address at the socket layer (not implemented here). This is reported honestly rather than claimed away."). The 09-28 paper had already classified this half as a follow-on BACKLOG item; the writers did not land it, and the comment block says so.

## Per-candidate record: unclecode/crawl4ai egress_broker (transition-form unwrapping + resolve-and-pin)

- AREA: URL -> ACQUISITION (server-side fetch gate; SSRF boundary).
- CURRENT PING (post-rewrite, ed3ff708): isPublicIp decodes transition/encapsulation forms to the effective IPv4 and classifies as IPv4; hostile matrix 31/31 PASS above. PING now covers the donor's full _embedded_v4_forms set (v4-mapped, NAT64 /96, 6to4 /16, v4-compat /96) PLUS SIIT-translatable ::ffff:0:0/96 and ISATAP, which the donor does not unwrap; Teredo fails closed on both sides. The TOCTOU half (resolve-and-pin / post-connect socket check) is NOT in PING; it survives as the documented residual.
- EXACT REPO + SHA: unclecode/crawl4ai, pin e5d2e786d1a101225f3f6a3e6fd344d76eeb13af, re-verified via GitHub commits API 2026-09-30 (commit exists, author unclecode, date 2026-09-25T06:35:50Z). Mechanism re-read at the pinned SHA (deploy/docker/egress_broker.py, mechanism level): one rule "reject any resolved IP where not ip.is_global" over _embedded_v4_forms; resolve_and_pin() resolves once, rejects if ANY answer is non-global, returns the exact IP to dial with Host/SNI preserved; check_redirect() re-validates and pins per redirect; opaque errors; egress forward-proxy plus Chromium flag scrubbing for the browser path.
- LICENSE: Apache-2.0 (license endpoint + LICENSE body verified 2026-09-28; no file-level exceptions in the examined SSRF files; no copyleft; Apache-2.0 patent grant applies; attribution required if adapted). Firecrawl's complementary socket-check pattern is AGPL-3.0: pattern/reference only, never adapted.
- MECHANISM WORTH HARVESTING: the transition-form unwrapping (already landed by the writers at ed3ff708) and, as the surviving follow-on, resolve_and_pin semantics (resolve once, dial the pinned IP) or the post-connect socket.remoteAddress verification (Firecrawl pattern).
- WHY IT IS BETTER: for the unwrapping half, it is now MOOT: PING's rewrite covers the donor set and more, proven by the 31/31 matrix. For the TOCTOU half: pinning makes the resolving entity the dialing entity, which per-hop re-validation provably cannot do (mechanism-level argument; no live fast-flux proof run in this pass).
- WHAT NOT TO COPY: the docker-server distribution shape (egress_proxy.py, enforce_egress browser-flag scrubbing: PING has no L2 browser path; keep as the pattern for when it lands), the CRAWL4AI_ALLOW_INTERNAL_URLS escape-hatch semantics (PING's policy layer owns allowlisting), opaque errors wholesale (classifyFetchFailure depends on reason prefixes; decoupling is BACKLOG), Firecrawl's 5000-hop redirect ceiling and naive protocolIncluded regex.
- PING AUTHORITY IT MUST REMAIN UNDER: fyd/net/safe-fetch.ts, the one canonical SSRF gate. Any TOCTOU follow-on (pinned dial or undici connect interceptor) lives inside safeFetch. No new module, no new authority, no new config surface.
- MINIMAL PATCH: unwrapping half: none needed, landed. TOCTOU half (if a writer ever takes it): resolve once in hostResolvesPublic, thread the validated address set into a pinned dial (undici dispatcher with a connect interceptor verifying socket.remoteAddress, or Host/SNI-preserved dial of the pinned IP); additive restriction.
- EXPECTED DELETION-SIMPLIFICATION: unwrapping half already landed by writers (their commits). Donor LOC examined ~560 (09-28 measured). This pass: new deps 0, new authorities 0, net LOC change from this pass 0 (read-only).
- TEST THAT PROVES IMPROVEMENT: unwrapping half: the 31/31 hostile matrix above (plus the repo's own ssrf-adversarial matrix). TOCTOU half: fast-flux stub test, dnsLookup returns public while an instrumented dispatcher observes the dialed address from a second private resolution; before: connection attempted to the private address; after: only the pinned IP is dialed (or the socket is destroyed). Not yet written or run.
- BENCHMARK IF RELEVANT: none; correctness/security metric is hostile-URL classes rejected.
- SECURITY CONSEQUENCES: the NAT64/6to4/v4-compat/ISATAP/SIIT SSRF bypass class is closed at ed3ff708. The surviving residual: same-hop DNS rebinding can still steer the socket between validation and connect; exploiting it requires attacker-controlled DNS for an attacker-chosen hostname (in threat model: arbitrary agent/user URLs), and per-hop re-validation already closes redirect pivots, so the exposure is the initial hop's resolve-then-dial window. The module documents this honestly rather than claiming it away.
- MIGRATION-RISK: none for the landed half (additive restriction; positive controls prove no false positives on legitimate global v6). The TOCTOU half would be a larger dial-path change; ships as a separate tested step if ever taken.
- DECISION: REJECT (PING WINS) for the transition-form unwrapping mechanism: the 09-28 named gap is closed at ed3ff708 with broader coverage than the donor, proven by the 31/31 executed hostile matrix. BACKLOG for the resolve-and-pin / post-connect-check follow-on: the residual TOCTOU survives, honestly documented; the 12 writer-gate questions do not all pass (see below), so no writer dispatch.

## 12 writer-gate questions against the TOCTOU follow-on (explicit)

1. Concrete current PING/FYD failure: same-hop DNS-rebinding TOCTOU in safeFetch at ed3ff708. Proven by code trace (hostResolvesPublic validates, then fetchImpl/undici re-resolves independently; no pinning, no remoteAddress check) and admitted in the module's Residual TOCTOU note. No live fast-flux reproduction run in this pass, so live defect proof is INCOMPLETE.
2. Live product path: yes, safeFetch/safeFetchImage/safeFetchPage gate media ingestion and page discovery.
3. Existing PING mechanism that owns it: hostResolvesPublic + per-hop revalidation in fyd/net/safe-fetch.ts.
4. Exact external mechanism better: crawl4ai egress_broker.resolve_and_pin (Apache-2.0, pin e5d2e786, re-verified 2026-09-30); Firecrawl post-connect socket.remoteAddress check (AGPL-3.0, pattern only).
5. Proof it is better: mechanism-level only; no live comparative proof run. INCOMPLETE.
6. Can PING be adapted instead: yes, undici dispatcher connect interceptor or pinned dial, zero new deps.
7. Can the algorithm be extracted without the architecture: yes, small mechanism.
8. What code gets deleted/simplified: additive; nothing deleted.
9. What test fails before and passes after: fast-flux stub test described above. NOT YET WRITTEN/RUN.
10. What authority remains sovereign: fyd/net/safe-fetch.ts; zero new authorities.
11. Pinned donor SHA: e5d2e786d1a101225f3f6a3e6fd344d76eeb13af (re-verified 2026-09-30).
12. Exact file license: Apache-2.0 (crawl4ai); AGPL-3.0 for the Firecrawl pattern (reference only).

Gate verdict on the follow-on: questions 1, 5, and 9 are not satisfied. Any material UNKNOWN means research continues, no writer. BACKLOG, unchanged from 09-28. NO CODE WRITTEN by this researcher; no writer dispatch.

## Evidence notes

- No lines-saved fiction. Numbers are measured: 31 executed matrix cases, sha256-verified verbatim module execution, donor file re-read at the pinned SHA.
- New info from donor since 09-28: crawl4ai v0.9.4 (23 Sep 2026) was a security release closing coordinated-disclosure SSRF advisories in robots.txt and link-preview paths that bypassed the Docker server's egress controls; the pinned egress_broker mechanism is unchanged by that, and the pin stands.

VERDICT: GAP CLOSED (REJECT/PING WINS). The 09-28 v6 transition-form bypass is dead at ed3ff708, proven by a 31/31 executed hostile matrix against the verbatim module; PING's coverage (NAT64, 6to4, v4-mapped, v4-compat, SIIT, ISATAP, Teredo/documentation/benchmarking fail-closed) now exceeds the donor's _embedded_v4_forms set. The residual same-hop DNS-rebinding TOCTOU survives, is honestly documented in the module, and stays BACKLOG (12-gate not passed; no writer dispatch).
