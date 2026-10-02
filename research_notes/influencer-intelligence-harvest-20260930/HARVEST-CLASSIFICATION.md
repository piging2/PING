# HARVEST CLASSIFICATION: Influencer-Platform Intelligence Survey

Date: 2026-09-30. Companion to REPORT.md (full evidence, reproducibility log).

Classification rubric: ADOPT NOW (build the adapter now) / ADAPT LATER (harvestable when a funded use case exists) / PATTERN ONLY (take the idea, never the product) / REJECT (not worth touching). Default is skeptical. Replaceability requirement for any ADAPT LATER candidate: answer its semantic role, its containing PING interface, and what canonical information survives its removal.

## Classification table

| # | Platform | Classification | One-line reason |
|---|----------|---------------|-----------------|
| 1 | Modash | ADAPT LATER | Best raw creator-intelligence API surface: public docs, public pricing, agent-explicit. Sales-gated key, $16.2k/yr Discovery, no funded use case yet. |
| 2 | Upfluence | ADAPT LATER | Only vendor with a native MCP server plus write tools (shortlist, approve, outreach). Beta, sales-gated, token cost unknown in dollars. |
| 3 | HypeAuditor | ADAPT LATER | Strongest independent fraud and audience-quality vetting surface, with HypeAgent MCP. Narrow to the quality-gate role, not discovery. |
| 4 | CreatorIQ | PATTERN ONLY | Bi-directional API plus signed webhooks is the pattern for campaign ops, but PING must never make a vendor its system of record. |
| 5 | impact.com | PATTERN ONLY | Public, well-documented attribution/action-lifecycle API shape worth harvesting. No affiliate program exists at PING, so no adapter. |
| 6 | Traackr | PATTERN ONLY | Abigail's core idea (decision history, not performance data, as the training signal) maps onto PING's outcome-to-learning path. No public docs, no adapter. |
| 7 | Influencity | REJECT | No public docs, no MCP evidence, weaker data claims than Modash. Nothing it offers that the stronger candidates do not cover better. |
| 8 | Captiv8 | REJECT | No public developer surface found. Enterprise platform sale, not an intelligence layer. |
| 9 | Sprout Social Influencer Marketing | REJECT | Owned-account analytics API is strong, but influencer discovery and campaign ops are UI-led, not headless. |
| 10 | Aspire | REJECT | Contradictory signals on whether an API exists at all; no public docs, no MCP, nothing verifiable to drive. |

## Adapter-spike needs (ADAPT LATER only)

A bounded adapter spike for each would test: (a) credential provisioning (can a key be issued without a months-long sales process), (b) a thin REST or MCP client wrapped as a PING INTELLIGENCE observation producer, (c) emitting OBSERVATION events into the existing event plane with vendor records cited as evidence, never promoted to canonical objects, (d) removal drill: unplug the adapter and confirm all derived PING state survives.

- Modash spike: Discovery API search-by-bio/audience against a fixed test brief; emit creator profiles as observations; verify collaboration-history classification fields land in evidence, not PING claims. Blocked on: sales-gated key, $16,200/yr Discovery or $10,000/yr Raw commitment.
- Upfluence spike: MCP server read tools behind PING authorization; write tools (shortlist, outreach) fire only from an APPROVED proposal through the existing authorization seam. Blocked on: MCP beta access on request, dollar token pricing.
- HypeAuditor spike: run fraud/audience verdicts on a test creator set; record verdicts as evidence with the underlying metrics cited. Blocked on: post-beta MCP pricing, API credit band confirmation (~$208-300/month reported, not vendor-confirmed).

## What none of them are

Zero candidates are classified ADOPT NOW. That is the honest result: every one of the ten requires a sales conversation to provision a working key, none has a funded PING use case today, and two of the strongest agent surfaces (Upfluence MCP, HypeAgent) are in beta. Building adapters now would create maintained code with no consumer, the same broken seam as the 25 stuck claim-generation missions.

## The single most important finding

Among all ten vendors, only Modash pairs public API documentation with public pricing, and it is still the one explicitly positioning its API for "AI applications and agents." Meanwhile the storika.ai technical diligence guide (Sept 2026) confirms the structural fact of this market: no major creator platform currently offers true self-serve headless access; every key provisioning path routes through sales. For the six-layer architecture this means layer 3 (INTELLIGENCE) can treat vendor platforms as adapter candidates but cannot depend on any of them as always-available infrastructure. The design consequence: build the INTELLIGENCE adapter interface against a self-serve source first (a public API, a community MCP, or PING's own acquisition), and keep every vendor adapter behind the same observation-producer contract so a sales-gated sensor can be swapped in later without touching PING truth.
