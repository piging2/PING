# Harvest ledger entry — 2026-09-30: influencer/creator-intelligence platforms

Source survey: `~/workspace/research_notes/influencer-intelligence-harvest-20260930/REPORT.md`
(per-platform findings, evidence grades, full reproducibility log) and
`HARVEST-CLASSIFICATION.md`. Filed verbatim per Nolan's 2026-09-30 steer.
No procurement, no vendor contact. All ten are INTELLIGENCE-layer (layer 3)
adapter candidates only; never PING truth.

## Classifications

### ADAPT LATER
- Modash: best raw creator API, public docs + public pricing ($16.2k/yr
  Discovery / $10k/yr Raw), agent-explicit. Blocked: sales-gated key, no
  funded use case.
- Upfluence: only native MCP server, beta, OAuth, write tools (shortlist,
  approve, outreach). Blocked: beta access, dollar cost UNKNOWN.
- HypeAuditor: strongest fraud/audience vetting via HypeAgent MCP;
  quality-gate role only, not discovery.

### PATTERN ONLY
- CreatorIQ: bi-directional API + signed webhooks as the campaign-ops
  pattern. PING never makes a vendor its system of record.
- impact.com: attribution API shape worth harvesting; no affiliate program
  at PING, so no adapter.
- Traackr: Abigail (launched 2026-09-23) — decision-history-as-training-signal
  maps to PING's outcome-to-learning path. No public docs, no adapter.

### REJECT
- Influencity, Captiv8, Sprout Social Influencer Marketing, Aspire —
  no verifiable headless surface (reasons in HARVEST-CLASSIFICATION.md).

Zero ADOPT NOW — the honest result.

## Key structural finding
No major creator platform offers true self-serve headless access; every key
path routes through sales. Only Modash pairs public docs with public pricing
and agent positioning. Design consequence for layer 3 (INTELLIGENCE): build
the adapter interface against a self-serve source first (public API,
community MCP, or PING's own acquisition); keep every vendor adapter behind
the same observation-producer contract so a sales-gated sensor swaps in later
without touching PING truth.

## Follow-up candidates (outside the ten; clear the self-serve bar)
- influencers.club: public docs, single key, $249/mo, hosted MCP.
- SocialCrawl: public OpenAPI 3.1, local MCP.
Both deserve a future bounded look only.

## Standing note
PING Social's P0 is the owner loop, not creator infrastructure; classify
accordingly. Adapter spikes (if ever funded) must: (a) provision a key
without a months-long sales process, (b) wrap as a PING INTELLIGENCE
observation producer, (c) emit OBSERVATION events with vendor records cited
as evidence, never promoted to canonical objects, (d) pass a removal drill.
