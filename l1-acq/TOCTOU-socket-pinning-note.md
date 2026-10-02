# TOCTOU Socket-Pinning: Decision-Ready Research Note

Lane L1-ACQ, 2026-09-29. Research only; no code built, no network stack written.

## The gap (recap)

`src/fyd/net/safe-fetch.ts` validates DNS at check time, but the production
fetch (global fetch, undici under the hood) re-resolves independently at dial
time. A hostile DNS that answers differently per query (rebinding) can steer
the socket to an address the gate never validated. The module header documents
this honestly; it is accepted for demo inputs. Socket-pinning is required
before untrusted public URL ingestion.

## Verified environment facts (probed, not from memory)

- Node v22.23.2; undici 6.28.0 present in the project's dependency tree
  (hoisted transitive dependency, not currently a direct one).
- Construction probe passed: `new Agent({ connect: { lookup: fn } })`
  builds cleanly, and `fetch(url, { dispatcher })` is the accepted wiring
  shape for a custom agent.
- Source-verified in undici (`lib/core/connect.js`, `buildConnector`): the
  agent's `connect` options are spread into both `tls.connect()` and
  `net.connect()` at dial time. A custom `lookup` is genuinely honored at
  socket creation, not merely accepted by the constructor.
- Source-verified: TLS SNI still derives from the URL host
  (`servername = servername || options.servername || util.getServerName(host)`).
  Dialing a pinned IP keeps certificate verification hostname-bound; pinning
  the address does not weaken TLS identity.

## Options

### A. Per-hop pinned lookup via undici Agent + dispatcher (RECOMMENDED)

At each validated hop, build a `lookup` closure over the already-validated
address set and fetch with `fetch(url, { dispatcher: new Agent({ connect:
{ lookup: pinnedLookup } }) })`. The gate keeps doing the validation; the
pinned lookup simply refuses to resolve to anything outside the validated
set and fails closed on mismatch.

- Pros: smallest change; no new network stack; reuses existing
  fetch/redirect/TLS machinery; per-hop re-pinning composes with the
  existing max-5-redirects per-hop revalidation; fits the existing
  `SafeFetchDeps` injection seam (no new authority).
- Cons: undici must become a direct dependency (or the ~20-line connector
  shim vendored); it is currently transitive-only.
- Effort: small.

### B. Post-connect peer verification (defense in depth, pairs with A)

After connect, assert `socket.remoteAddress` is in the validated set before
any request bytes are written (via a custom undici `connect` wrapper).

- Pros: catches residual steering even if DNS pinning were bypassed; cheap.
- Cons: deeper undici integration than A; alone it still opens a TCP
  connection to the attacker (aborted before data flows, which is acceptable
  for SSRF but less clean than A).
- Verdict: adopt with A, not instead of A.

### C. Pinning forward proxy (the Crawl4AI harvest pattern)

All acquisition egress routes through a localhost forward proxy that does
validated resolve-and-connect itself; the app never dials directly. The
harvest matrix records this as Crawl4AI's pattern ("pinning forward-proxy
pattern for browser egress").

- Pros: single egress choke point; also covers the future L2 browser path,
  which will not use undici.
- Cons: new supervised infrastructure; bigger blast radius; overkill for the
  current L1-only static path.
- Verdict: defer until L2 browser escalation is authorized (Q9); then this
  becomes the right answer for browser egress.

### D. Custom resolve-and-dial (NOT RECOMMENDED)

Pre-resolve, dial the IP directly, hand-set Host header and SNI.

- Cons: this is the bespoke network stack the lane was told not to build;
  it reimplements redirect/TLS/cookie handling and invites subtle breakage.

### Explicitly not recommended

OS-level DNS hardening, pinning to a single DoH resolver (does not fix a
lying authoritative server), or declaring the current gate sufficient.

## Decision needed (owner via coordinator)

1. Adopt A as the pre-untrusted-ingestion gate (implies: undici becomes a
   direct dependency, or the connector shim is vendored).
2. A alone for the first cut, or A+B together.
3. C deferred until the L2/Q9 decision lands.

## What "done" looks like

`safeFetch` accepts a pinned dispatcher through `SafeFetchDeps`; new hostile
test: DNS returns a public IP at validation time and a private IP at dial
time, and the test asserts the private address is never dialed (via
lookup-call inspection). The existing 72-test adversarial suite stays green.
