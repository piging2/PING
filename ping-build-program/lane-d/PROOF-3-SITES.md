# PROOF: 3 REAL BUSINESS WEBSITES THROUGH THE ESCALATION LADDER

Method: lane-D spike (`spike/ladder.mjs`, mirrors PING's `safe-fetch.ts`,
`structured-data.ts` via the `jsonld` library, and `extractor.ts`
semantics), executed with real egress on the Pig (the sandbox proxy
allowlists only a few hosts; the Pig has production-like egress).
Read-only GETs, robots.txt honored, per-origin single fetches, descriptive
UA. No logins, no forms, no bypasses.

## Site 1: Coppersmith Plumbing & HVAC (FYD demo business)
URL: https://www.coppersmithplumbing.com/ (Grand Junction CO, WordPress + Rank Math)

- Rung path: **R0 -> R1 -> R2, terminal sufficient-at-R2. Escalation correctly NOT triggered.**
- R0: policy allowed; robots.txt honored, crawl-delay 10s recorded.
- R1: 200, text/html, 117,900 bytes in 762ms total. evidenceHash
  `131bacaa7ee28f49...` (sha256 of raw bytes).
- R2: 1 JSON-LD block parsed via the `jsonld` library; the Rank Math
  `@graph` envelope EXPANDED (this is the exact failure the 2026-09-21
  Coppersmith run notes recorded against the old hand-rolled flattener):
  business facts = name "Coppersmith Plumbing - HVAC - Mechanical",
  telephone "970-245-3869". Title entity-decoded ("&" not "&amp;").
- Sufficiency gate: identity (title) + contact (JSON-LD telephone) +
  offerings (business node of known type) -> SUFFICIENT. R3 never ran.
- Observation: `levelUsed: 2`, escalation records
  `[R0->R1:policy-allowed, R1->R2:structured-extraction]`, per-rung input
  hashes recorded, `truncated: false`.

## Site 2: Happy Place Carpentry (FYD demo business / portfolio asset)
URL: https://happy-place-platform.vercel.app/

- Rung path: **R0 -> R1 -> R2, terminal sufficient-at-R2. Escalation correctly NOT triggered.**
- R1: 200, 139,618 bytes, 5.5s. evidenceHash `865b8e7432216388...`.
- R2: 1 JSON-LD block; business facts = name "Happy Place Carpentry LLC",
  telephone "+15412865190". Canonical URL observed:
  `https://happyplacecarpentry.com` (differs from the fetched host;
  recorded, not "corrected").
- Gate SUFFICIENT at R2. Cheapest possible terminal rung after fetch.

## Site 3: Stan Store (real business, stan.store - creator commerce platform)
URL: https://stan.store/

- Rung path: **R0 -> R1 -> R2 -> R3 -> R4, escalation-decided. Escalation correctly TRIGGERED.**
- R1: 200, text/html, only 2,913 bytes. evidenceHash `7108d1c7ef4e6355...`
  (identical across two runs 30 minutes apart: same bytes -> same hash,
  the determinism invariant holding in production).
- R2: 0 JSON-LD blocks. R3: 147 visible chars, 0 headings, 0 links,
  no phone/email -> sufficiency gate fails with typed gaps.
- R4 decision: body empty AND JS-app marker present
  (`<div id="app"></div>` empty shell) -> typed gap
  `CONTENT_BEHIND_CLIENT_RENDER`, escalation record
  `R3->R4:CONTENT_BEHIND_CLIENT_RENDER` with the input hash. The spike
  does NOT render (R4 execution is delegated to the factory's pinned
  Playwright worker); it emits the typed ESCALATE record. No speculative
  browser spend, no retry, no bypass.

## What the proof shows

1. The ladder is deterministic in the wild: same URL + same bytes ->
   same rung path (stan.store reproduced byte-identical across runs).
2. Content change is handled, not hidden: Coppersmith's bytes shifted
   between two runs (same length, different hash); the rung decision is a
   function of (URL, bytes), so a different decision on different bytes is
   correct behavior, and both hashes are on the record.
3. Cheap rungs suffice for the target profile (template/SSR business
   sites); the expensive rung fires only on a typed JS-content gap.
4. Cost per acquisition (cheap path): 762ms - 5.5s wall clock, one HTTP
   fetch + CPU milliseconds. No browser, no tokens. R4 cost is bounded by
   the factory's `browserWallClockMs`; R6 by a token ceiling. Maximum cost
   is knowable before the first fetch (budgets in ESCALATION-LADDER.md).

## Bonus real-world observations (same runs)

- https://www.vagaro.com/ and https://linktr.ee/: **R0 policy block**,
  `robots.txt disallows /` -> typed PERMISSION_DENIED, no fetch attempted.
  The robots boundary works on real sites.
- https://www.cava.com/, https://www.warbyparker.com/, https://beacons.ai/:
  **HTTP 403** -> typed PERMISSION_DENIED/BLOCKED, recorded as blocked,
  never retried via another mechanism (anti-bot doctrine in action).
- 12 real sites probed total; 0 triggered R4 except stan.store. For the
  FYD target profile (small-business brochure sites), R4 is a rare path:
  this validates making the browser gated-and-delegated rather than
  always-on.
