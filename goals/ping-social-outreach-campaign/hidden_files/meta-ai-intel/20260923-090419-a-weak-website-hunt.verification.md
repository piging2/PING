# Verification: 20260923-090419-a-weak-website-hunt.md (distill sweep 2026-09-23)

Meta AI listed 12 businesses (answer 10567 chars, contract passed). Each
independently web-searched; nothing taken from the captured answer at face
value. Collision guard run for all 12 before any staging
(check-prospect-collision.py): 7 COLLISIONS, 5 CLEAR.

## VERIFIED-NEW (4) - staged to pipeline.md

1. **Adams Electric** | electrician | Palisade (720 38 1/4 Rd per Manta; 604 Moss
   Way per CMac.ws) | (970) 216-3598 directory-published | CONFIRMED: Manta
   listing (unclaimed, 1-4 staff, $500K-1M rev est.) + CMac.ws address/phone
   match. No own website found anywhere. | WEBSITE_REVAMP (high) +
   MISSED_CALL_LEAD_CAPTURE | WATCH, phone route | collision CLEAR.

2. **Wesley Electric** | electrician | Palisade (637 Aldrea Vista Ct) |
   (970) 464-5936 directory-published | CONFIRMED: Superpages/YP unclaimed
   listing + Birdeye (1 review, 3.0). No own website, no reviews elsewhere. |
   WEBSITE_REVAMP (high) + MISSED_CALL_LEAD_CAPTURE | WATCH, phone route |
   collision CLEAR.

3. **Automatic Energy Solutions** | electrician | Montrose (223 N 1st St) |
   +1 970-765-0678 (place-data) | CONFIRMED: GBP place_id 1185265362835226
   (no website link on GBP) + BuildZoom (active CO electrical contractor
   license, top 24% BZ score). No own website found. | WEBSITE_REVAMP
   (medium-high) + MISSED_CALL_LEAD_CAPTURE | WATCH, phone route |
   collision CLEAR.

4. **Steve Huck Plumbing & Heating** | plumbing / heating | Carbondale
   (130 Shadowood Ln) | (970) 963-1179 directory-published | CONFIRMED:
   ShowMeLocal unclaimed profile + Birdeye (3 reviews, 2.3). No own website.
   IDENTITY CAVEAT: distinct from "Huck's Heating & Plumbing" (Glenwood
   Springs, 1285 Graceland Dr) and "Huck Steve Plumbing & Heating"
   (New Castle, 271 Mikala Ln); reconcile before outreach. | WEBSITE_REVAMP
   (high) + MISSED_CALL_LEAD_CAPTURE | WATCH, phone route | collision CLEAR.

## Duplicates re-served (7) - no new rows, existing records stand

- Palisade Electric Service (pipeline.md:1673 NEW row, phone-only).
- Reliable Pest Control (pipeline.md:2567 near-miss; round-110 fail-closed
  under strict gate, round-112 near-miss; this answer adds no new material
  evidence).
- Golden Eagle Pest Control (pipeline.md:1284 WATCH row).
- Absolute Heat & Air (pipeline.md:2520 NEW row). RE-SERVE OF REFUTED CLAIM:
  the answer again cites gluke2758.wixsite.com/absolute-hvac-repair, proven
  on 2026-09-22 to be a Kansas City, MO air-duct-cleaning company, not the
  Montrose business. Row stands with corrected "no own site" status.
- O'Neill Heating and Plumbing LLC (pipeline.md:2521 NEW row).
- Mesa Door Systems (pipeline.md:2132 NEW row).
- Four Seasons Plumbing Heating (canonical JSONL + pipeline.md NEW row).

## Excluded (1)

- Lush Green Landscapes (Palisade): EXISTS but the weakness claim is REFUTED.
  lushgreenservices.com is a full multi-page WordPress site (services, blog,
  free-quote form, reviews, service area, "Now Hiring"). Already in leads.md
  as reference-only WATCH (round-119 enrichment); stays reference-only.
  Extends reliability data point 32 (Meta AI negative claims need
  verification, not acceptance).

## Method notes

- JSONL NOT edited (canonical store at 300-active cap; pipeline staging only,
  per rounds 114-121 pattern).
- 7/12 re-serve rate traced to the pack's JSONL-only negative signals:
  pipeline-staged names were missing. Promoted to machinery this pass:
  self-audit-2026-09-23-negative-signals-pipeline.md
  (build-context-pack.py now merges pipeline.md staged marker-carrying rows;
  new pack version 3801389981 carries 113 negative names).
- PING emission: prospect rows are not PING-emittable per the intelligence
  boundary (round-118 precedent); the generalizable finding (negative-signal
  gap + fix) is recorded as a dated self-audit note, not an observation.
