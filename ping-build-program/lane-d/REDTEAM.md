# RED-TEAM RESULTS (lane D)

Harness: `spike/redteam.mjs` — 10 hostile scenarios as injected fixtures
(no real network; the fixtures ARE the remote server). All assertions are
fail-closed: every hostile input must produce a typed, recorded outcome,
never a silent success, silent empty, or escalation-by-another-mechanism.

Result: **23/23 pass** (`node redteam.mjs` exits 0).

| # | Attack / failure | Expected | Observed |
|---|---|---|---|
| 1 | JS injection: phone-shaped string inside `<script>` + real `tel:` link | Script content never becomes a fact; `tel:` wins | PASS: phone = `+15551234567` (tel:), `999-0000` absent from evidence, terminal at R3 |
| 2 | Meta-refresh loop (`refresh` to self) | Recorded, never followed by the static path | PASS: exactly 1 page fetch; `META_REFRESH_SEEN -> /refresh-loop` in policyNotes |
| 3 | 10MB HTML (declared + streamed) | Streaming abort at 5MB cap | PASS: `Body exceeded size limit`, `INVALID_PAYLOAD`, terminal, zero escalation records |
| 4 | Gzip bomb (small transfer, >5MB decoded) | Abort on DECODED bytes | PASS: same abort; the byte counter is authoritative, content-length only a hint |
| 5 | Redirect chain, 6 hops | Cap at 5, chain recorded | PASS: `Too many redirects`, all 6 hops in the record |
| 6 | Redirect to `169.254.169.254` (DNS-rebinding/SSRF) | Per-hop R0 re-validation rejects | PASS: `DNS ... resolves to non-public`, terminal, no retry |
| 7 | Redirect to `javascript:` URL | Scheme allowlist rejects | PASS: `Scheme not allowed: javascript:` |
| 8 | Fake JSON-LD (`telephone: +1-800-000-0000`) vs visible `tel:+13035551212` | BOTH preserved with distinct provenance; conflict flagged; NO silent winner | PASS: `phone` (tel:) and `phoneJsonLd` (json-ld) both on the observation; `CONFLICTING_SOURCES` in policyNotes with the explicit note that adjudication belongs to the resolution lane |
| 9 | 404 mid-ladder | Terminal `SOURCE_UNAVAILABLE`; never escalates to R4 | PASS: `levelUsed: 1`, no R2/R3/R4 records, no escalation array entries past R1 |
| 10 | Content mutating between fetches | Per-rung input hashes detect it | PASS: two fetches -> different evidenceHashes; `verifyRungInputConsistency` returns `CONTENT_CHANGED` on a mixed observation and `consistent` on a clean one |

## Bugs the red team caught in the spike (all fixed, re-verified)

1. `jsonld.flatten()` returns a top-level node ARRAY, not `{"@graph": [...]}`.
   The spike read only `flat["@graph"]` and silently found zero business
   nodes — the same class of bug as the Coppersmith `@graph` miss, caught
   here by fixture 8. (PING's `structured-data.ts` handles this correctly.)
2. A redirect-hop rejected by the policy gate was not marked terminal, so
   the observation's `noEscalation` flag was wrong. DNS-rebinding aborts are
   now terminal by construction.
3. The R4 JS-marker regex missed `<div id="app"></div>` (whitespace +
   non-`root` ids); stan.store's real shell initially misclassified as
   `EMPTY_BODY_NO_JS_MARKERS`. Marker list is now whitespace-tolerant and
   covers `root`/`app`/`__next`/`__NEXT_DATA__`/`ng-app`/`data-reactroot`.

## Residual risks (not covered; handed to lane R as fixture requirements)

- Real browser rendering (R4 execution) is unproven by this lane by design;
  the factory's Playwright worker must prove it against recorded fixtures.
- Challenge pages that return 200 with JS (Cloudflare "verify you are
  human") currently look like `CONTENT_BEHIND_CLIENT_RENDER`; the R4 worker
  needs a challenge-page classifier so those become typed BLOCKED instead
  of delegated renders.
- The spike's robots.txt parser is minimal (Disallow prefix match +
  crawl-delay); production should ADAPT a tested library (see
  HARVEST-REPORT.md), not ship the 40-line version.
