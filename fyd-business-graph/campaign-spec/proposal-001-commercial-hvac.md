# Proposal 001: Commercial HVAC campaign for Coppersmith Plumbing

**Status:** PROPOSAL ONLY. Shown to the owner, never executed. This file is the
PREVIEW artifact of the campaign compiler; the compiler stops at APPROVAL.
**Generated:** 2026-10-04 | **Spec:** `campaign-spec.schema.json` v1 |
**Business graph:** `../business-graph/coppersmith-graph.json`

## WHY

Three of the four observed services on the Coppersmith website are HVAC --
Heating & Cooling, HVAC, and Ventilation -- yet the brand name, the sample
campaign history, and the graph's placeholder marketing subtree all say
"Plumbing." The business's operating graph has **zero observed paths** from any
service to a Lead, Customer, or Outcome, and no observed Campaign node at all.
The evidence says Coppersmith sells HVAC (3 of 4 services, website-claimed,
over-25-years Western Colorado presence) but has no observed marketing
machinery promoting it. A commercial-HVAC campaign targets the business's
highest-margin, most-underrepresented service line and -- because nothing is
observed -- would create the first real Campaign -> Engagement -> Lead ->
Conversion -> Outcome evidence the graph can learn from (directive sections
10/11: outcome history is the moat).

## The CampaignSpec (validates against the schema)

```json
{
  "objective": "acquire_leads",
  "offer_refs": [
    "website-business-2f1327c09d622175-service-78962f315c55",
    "website-business-2f1327c09d622175-service-2dbc12c16f83",
    "website-business-2f1327c09d622175-service-a2008c93fb04"
  ],
  "audience_query": {
    "geo": { "type": "business_market" },
    "segment": "commercial_property_managers",
    "interest_hints": ["facility maintenance", "commercial buildings"],
    "exclusions": ["residential-only service requests"]
  },
  "channels": ["meta_ads", "facebook_page_post"],
  "budget": { "amount_usd": 300, "currency": "USD" },
  "time_window": { "start": "2026-10-05T00:00:00-06:00", "end": "2026-10-19T23:59:59-06:00" },
  "creative_refs": ["new:commercial-hvac-maintenance-offer"],
  "success_metric": { "metric": "leads", "target": 15, "window": "campaign_duration" },
  "approval_policy": { "min_tier": "HIGH", "approver": "owner" }
}
```

## AUDIENCE

Commercial property managers in the business's served market. Structured query:
`geo = business_market` (resolves to `market:western-colorado` via the Business
`serves`-> edge), `segment = commercial_property_managers`, exclusions for
residential-only requests. Deduplication, suppression, and frequency caps execute
as software at AUDIENCE QUERY time; no prose targeting.

## CHANNEL

Marked against `meta-archaeology/capability-matrix.md` (2026-10-04 inventory):

- **meta_ads** -- Ad account 143762378 is ACTIVE, USD, payment method present,
  min daily budget $1.00. BUT: zero campaign history (fresh account), no
  datasets/pixels (0 datasets; `ads_pixel_event_*` BLOCKED), no Instagram
  business account attached (IG boost/publish BLOCKED), no Conversions API tool
  in the catalogue (UNKNOWN). This proposal therefore does NOT promise
  conversion tracking; measurement is leads-only (forms/calls), not pixel
  outcomes. Campaign creation writes (`ads_create_campaign`, `ads_create_ad_set`,
  `ads_create_ad`) are SUPPORTED NOW but write-gated: HIGH tier, explicit
  owner authorization.
- **facebook_page_post** -- Page draft/create/publish via facebook-cli is
  SUPPORTED NOW (write-gated). BUT: the three managed Pages belong to Nolan's
  businesses ("How To Be Popular", "PING Social", "Go Save The Ocean"); there
  is NO connected Coppersmith Page. Organic posting for Coppersmith is
  BLOCKED until the owner connects and authorizes the Coppersmith Page.

Honesty note: the capability matrix inventories **Nolan's** connected Meta
assets, not Coppersmith's. This proposal is a typed plan; it is not executable
against Coppersmith today because no authorized Coppersmith channel exists.

## MESSAGE (direction, not final copy)

Angle: commercial HVAC reliability and maintenance from a 25-year Western
Colorado contractor. Claims limited to website-claimed evidence (per the
graph's claim policy, all observed statements are `website_statement`, never
verified fact): "serviced Western Colorado for over 25 years", Mon-Fri
07:30-16:00 availability, phone 970-245-3869. No final copy; creative draft
(`new:commercial-hvac-maintenance-offer`) is generated at preview time.

## EXPECTED ACTION

Viewer -> ad/page post -> calls 970-245-3869 or submits a quote request ->
Lead object -> (if booked) Conversion -> Outcome. Every step records evidence
on the business graph (Campaign `produces`->Lead -> `produces`->Conversion ->
Business `produced`->Outcome), replacing the current `sample:` placeholders
with observed data. That closes the broken pipe the graph proof identified.

## EVIDENCE

Each bullet cites the graph node/edge id or the capability-matrix section.

- 3 of 4 observed Service nodes are HVAC-family: `website-business-2f1327c09d622175-service-78962f315c55` (HVAC, /services/hvac/), `-2dbc12c16f83` (Heating & Cooling, /services/hvac/cooling/), `-a2008c93fb04` (Ventilation, /services/hvac/ventilation/) -- all via observed `offers` edges `rel-de5dba2de5173fc0`, `rel-095378b4d4a047a4`, `rel-bbe63e103139111b`.
- Market claim: `website-business-2f1327c09d622175 --serves--> market:western-colorado` ("serviced Western Colorado for over 25 years", website_statement).
- Location: `website-business-2f1327c09d622175-location` = Grand Junction, Colorado, 81501, United States.
- Gap: zero observed edges of type `runs`, `received`, `converted`, `produced` on the Business node; the entire Campaign subtree is `sample:` placeholders (business-graph-proof.md, "honesty gaps"). There is no path from any observed node to a Lead, Customer, or Outcome.
- Capability marks: ad account 143762378 ACTIVE / USD / payment method present / min daily budget $1.00 (matrix section 1); zero datasets (matrix 2f); no IG business account (matrix 2c); Coppersmith has no managed Page in the inventory (matrix 2b); write operations are documented but write-gated (matrix section 3).
- Bee: a live Bee adapter has ingested 34 real events (7 conversations, 12 facts, 13 todos) into ping_events. None of them concern Coppersmith Plumbing; forcing a connection would manufacture relevance. The graph's own observed evidence is primary; Bee is recorded here as a candidate evidence input only if future events relate to the business.

## AUTHORITY TIER (run through authority_tiers.classify())

Compiler action plan:

| # | Action | kind / target | Tier | Required check |
|---|---|---|---|---|
| 1 | Generate this preview | `preview_generate` -> `proposal-001` (local, no spend) | **LOW** | automatic |
| 2 | Create draft ad campaign in ad account 143762378 (post-approval, first execution action) | `modify_external_account`, spend_usd=300, external, reversible | **HIGH** | explicit_authorization |

Rule fired for action 2: `spend_usd > 0` (spend 300 < 500, so HIGH, not VERY HIGH).
Deterministic confirmation: any campaign with spend_usd > 0 classifies at
minimum HIGH. `approval_policy.min_tier` is set to HIGH accordingly (bounded
approval not required: spend under $500, audience under 10,000).

## What happens next (and what does not)

Nothing executes from this file. If the owner approves: the compiler's later
execution phase would emit actions 2+ through `modify_external_account` and
`publish_external` kinds, each re-classified at dispatch time, each requiring
its recorded check. Receipts, outcomes, and learnings would flow back onto the
business graph. That phase is not this proposal.
