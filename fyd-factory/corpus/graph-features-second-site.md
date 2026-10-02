# Graph features to structural variations: second-site (clearwater-plumbing-demo)

Fixture: `~/workspace/fyd-factory/corpus/fixtures/clearwater-plumbing-demo.json`
Manifest: `~/workspace/fyd-factory/corpus/manifests/second-site.json`
Purpose: the ONE excellent materially-different local business site after the HPP clone.
HPP is hospitality; this graph is a plumbing trade business, built to stress different
information architecture.

## Feature to structure map

1. person relationships (3 people, employs rels: owner/lead plumber, service technician,
   office manager/dispatcher)
   -> team/expert treatment. People section with role-labeled cards; owner card
   surfaced near the top (hero-adjacent or about) since the owner personally signs off
   on work. Roles are plain job titles, never credentials.

2. many services (12 services, provides rels, two with price_hint)
   -> service discovery architecture. A 12-item list needs more than one card grid:
   group into buckets (diagnostic, install/replace, emergency), or a dedicated services
   page with anchor nav. Consider a "most called for" featured subset on home with the
   full catalog one tap away. price_hint fields feed the trust strip, never quotes.

3. two locations (Grand Junction shop + Fruita service depot, located_at rels)
   -> location navigation. Locations section listing both; per-location contact/hours
   if they ever diverge; a location switcher in the contact area. Service-area list
   (area_served field, 8 towns) renders as a coverage list, not a map claim.

4. conflicting evidence pair (business hours Sat 8-12 from website-ingestion vs Sat 8-2
   from directory:google-business-profile; both preserved, see meta.conflictPair)
   -> conflict/attribution treatment. The site must not silently pick one. Render the
   website value as primary with a provenance label, and surface the disagreement
   ("Google lists Sat until 2 PM; the shop's site says 12 PM") rather than merging.
   This is the evidence-fidelity stress test for the second site.

5. rich evidence (3 provenance kinds: website-derived, directory-derived, owner-asserted;
   evidenceRef on every relationship)
   -> proof/trust sections. Trust strip near conversion points built only from
   bound fields: licensed_insured, warranty, pricing, response. Every trust claim
   traceable to its provenance ref; nothing invented.

6. FAQs as articles (5 articles, publishes rels, tags ["faq"])
   -> knowledge section. FAQ accordion or knowledge-base treatment; prime grounding
   material for Ask FYD. Questions are the voice of the customer; keep verbatim.

7. emergency hours + 24/7 emergency service object
   -> persistent emergency CTA. Sticky call action on mobile; the emergency service
   object gets featured placement, not buried in the grid. Contact discoverability
   is the must-win: one-glance tel: action.

8. trust-signal fields on the business (licensed_insured, warranty, pricing, response)
   -> conversion hierarchy. These four fields are the conversion argument for a trade
   business; place them adjacent to every contact CTA, not on a separate page.

## What makes this graph different from HPP (hospitality)

HPP is menu/venue/experience browsing. This graph is problem-to-technician matching:
the visitor has a broken thing and a clock running. Structure should optimize for
"what do you fix, how fast, what does it cost to get you here, who shows up" in that
order. Service discovery and contact discoverability outrank browsing and storytelling.
