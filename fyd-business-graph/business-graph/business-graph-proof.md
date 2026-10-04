# Business Operating Graph: Coppersmith Plumbing — Proof

**File:** `coppersmith-graph.json` | **Generated:** 2026-10-04 | **Directive:** `~/workspace/directives/2026-10-04-backend-assault-narrowed.md` section 4

**Grounding:** every observed node is copied character-for-character from
`ping-fyd-converged/src/fyd/proceduralize/__fixtures__/coppersmith-graph.ts`
(`COPPERSMITH_GRAPH`, machine-generated 2026-09-21T13:50:00Z from
https://www.coppersmithplumbing.com/, source digest `5e9f1433...f72342c005a70e`).
Per the fixture header, all observed claims are `website_statement` (claimed by
the website, never verified fact). Nothing is invented on the observed side.

## Node counts by type (22 total)

| Type | Count | Source |
|---|---|---|
| Business | 1 | observed |
| Service | 4 | observed |
| Market | 1 | observed |
| Location | 1 | observed |
| Person | 1 | observed |
| Website | 1 | observed |
| SocialIdentity | 1 | observed |
| Content | 1 | sample |
| Audience | 1 | sample |
| Campaign | 1 | sample |
| Creative | 1 | sample |
| Channel | 1 | sample |
| Offer | 1 | sample |
| Engagement | 1 | sample |
| Lead | 1 | sample |
| Conversion | 1 | sample |
| Customer | 1 | sample |
| Outcome | 1 | sample |
| Spend | 1 | sample |

**Observed: 10 nodes. Sample: 12 nodes** (every sample id prefixed `sample:`).

## Edge counts by rel (23 total)

| rel | Count | Source |
|---|---|---|
| offers | 4 | observed (fixture rels `rel-f450fdb901a6baa3`, `rel-095378b4d4a047a4`, `rel-de5dba2de5173fc0`, `rel-bbe63e103139111b`) |
| serves | 1 | observed (business description: "serviced Western Colorado for over 25 years") |
| located_at | 1 | observed (fixture rel `rel-d0a40ed4fc7eb0ab`; Grand Junction, CO 81501) |
| employs | 1 | observed (inverse of fixture `works_for` rel `rel-8627fe1497c235f5`) |
| owns | 1 | observed (business fields.website = https://coppersmithplumbing.com) |
| claims | 1 | observed (fixture `links_to` rel `rel-9a6aa2e50f4789ed` → author profile) |
| published | 1 | sample |
| targets | 2 | sample (1 business-level, 1 campaign-level) |
| runs | 1 | sample |
| received | 1 | sample |
| converted | 1 | sample |
| produced | 1 | sample |
| uses | 1 | sample |
| publishes_to | 1 | sample |
| promotes | 1 | sample |
| produces | 3 | sample |
| costs | 1 | sample |

**Observed: 9 edges. Sample: 14 edges.** Every rel comes verbatim from the
directive's edge maps (section 4); no invented edge types. Machine-validated:
JSON parses, every edge endpoint exists, every rel is in-map.

## Observed facts (the honest foundation)

- **Business:** "Coppersmith Plumbing - HVAC - Mechanical", phone 970-245-3869, hours Mo–Fr 07:30–16:00.
- **Services (4):** Plumbing; Heating & Cooling; HVAC; Ventilation (each with its service_href).
- **Market:** Western Colorado. **Location:** Grand Junction, Colorado, 81501, United States.
- **Person:** `coppersmithplm` (website author identity). **Website:** coppersmithplumbing.com. **SocialIdentity:** the `coppersmithplm` author profile, claimed via sameAs.

## Traversals (machine-run against the graph)

**T1 — What services does Coppersmith offer, in which market?**
Path: `Business --offers--> Service` + `Business --serves--> Market`.
Answer: Plumbing, Heating & Cooling, HVAC, Ventilation — served in **Western Colorado**.
All observed. Note the site's services are HVAC-heavy (3 of 4) despite the "Plumbing" brand name.

**T2 — Which audience does the campaign target, through which channel?**
Path: `Campaign --targets--> Audience` + `Campaign --publishes_to--> Channel` + `Campaign --promotes--> Offer` + `Campaign --costs--> Spend`.
Answer: "Emergency Plumbing Rapid Response" targets **Grand Junction homeowners with urgent plumbing needs** through **Facebook**, promoting "24/7 emergency plumbing service" at **$500 ad spend**.
All sample — the business has zero observed campaign machinery.

**T3 — What outcomes has the business produced?**
Path: `Business --produced--> Outcome` vs `Campaign --produces--> {Engagement, Lead, Conversion}`.
Answer: business.produced → "Completed emergency repair with 5-star review" (**sample — honesty flag**). campaign.produces → ad engagement → burst-pipe lead → booked job (**all sample**). The graph answers honestly: **zero observed outcomes**.

## Observed vs sample (the honesty gaps — sample-only edges)

Every edge from `Business` that touches the commercial loop is sample-only:
`published`, `targets`, `runs`, `received`, `converted`, `produced` — and all 8
`Campaign` edges (`targets`, `uses`, `publishes_to`, `promotes`, `produces` x3, `costs`).
The observed subgraph is: business → services, market, location, person, website,
social identity. The demo has no real leads, customers, campaigns, spend, or outcomes.

## Most interesting thing (not visible in a flat entity list)

The graph's shape *is* the finding: the observed evidence lives entirely in the
top row (who the business is, what it sells, where it is), and the entire
marketing-and-outcomes subtree hangs below on `sample:` placeholders. A flat
entity list would show "4 services, 1 location" and call it a day; the operating
graph shows the **missing feedback loop** — there is no path from any observed
node to a Lead, Customer, or Outcome. That is exactly the directive's broken
pipe (OBSERVE → EVIDENCE → LEARNING → BUSINESS GRAPH → OPPORTUNITY): until Bee
or a real campaign feeds observations into `produces`/`received`/`converted`
edges, FYD cannot learn "this offer converts, this channel performs." The graph
makes the learning gap structurally visible instead of hiding it behind prose.

## Validation

`/tmp/bizgraph-validate.py` (ephemeral): JSON parses; 23/23 edge endpoints
resolve; 23/23 rels in the directive maps; counts above. Exit 0.
