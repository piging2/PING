#!/usr/bin/env python3
"""Build segment-round1721-chimney.jsonl with exact key order, then validate."""
import json, pathlib

KEYS = ["email","business_name","owner_name","phone","website","trade","city",
        "state","region","source","revamp_candidate","notes","intel_updated",
        "website_quality","booking_mechanism","missed_call_risk",
        "social_presence","review_velocity","notable_reviews","new_filing_signal",
        "stack_signals","opportunity_primary","opportunity_secondary",
        "opportunity_evidence","opportunity_confidence","ai_discoverability",
        "priority_state","last_signal","suppression_state","next_eligible_action",
        "conversion_state","converted_at","conversion_evidence"]

F = dict(state="CO", region="Western Colorado", source="research",
         intel_updated="2026-09-24", priority_state="NEW",
         last_signal="2026-09-24 discovery research (round1721)")

def rec(**kw):
    d = {k: "" for k in KEYS}
    d.update(F)
    d.update(kw)
    assert list(d.keys()) == KEYS, f"key order drift: {list(d.keys())}"
    return d

rows = [
 rec(
  email="sales@inside-and-out.com",
  business_name="Inside and Out Fireplace & Patio",
  phone="(970)249-2855",
  website="https://www.insideandoutfireplace.com/",
  trade="fireplace, stove & outdoor living",
  city="Montrose",
  booking_mechanism="contact form, email, phone (no online booking observed)",
  missed_call_risk="medium",
  website_quality="moderate",
  opportunity_primary="MISSED_CALL_LEAD_CAPTURE",
  opportunity_evidence="Own-site contact form asks for first name, last name, phone and product details; inquiries route to a general form/email and the showroom phone with no online appointment booking observed.",
  opportunity_confidence="medium",
  notes="Gas, wood and pellet fireplaces/stoves, installation and outdoor living. Own site says serving the Western Slope for over 20 years. No franchise affiliation observed.",
 ),
 rec(
  business_name="Woodstove Warehouse",
  phone="(970) 241-6956",
  website="https://www.woodstovewarehousegj.com/",
  trade="wood stove, fireplace & chimney sweep",
  city="Grand Junction",
  booking_mechanism="phone and contact form (no online booking observed)",
  missed_call_risk="medium",
  social_presence="Facebook (linked from own site)",
  website_quality="moderate",
  opportunity_primary="MISSED_CALL_LEAD_CAPTURE",
  opportunity_evidence="Locally owned and operated since 1990 per own-site About content. Own-site testimonial indicates chimney sweeping service. Multiple service pages but phone/contact-form driven with no online appointment booking observed.",
  opportunity_confidence="medium",
  notes="Sales, installation, repair and maintenance. No franchise affiliation observed. Certified Quadra-Fire dealer status is dealership, not franchise, per observed evidence.",
 ),
 rec(
  email="office@thefpco.com",
  business_name="The Fireplace Company",
  phone="(970) 963-3598",
  website="https://thefpco.com/",
  trade="fireplace, chimney sweep & masonry repair",
  city="Carbondale",
  booking_mechanism="contact form (arithmetic CAPTCHA), email, phone",
  missed_call_risk="medium",
  website_quality="moderate",
  opportunity_primary="MISSED_CALL_LEAD_CAPTURE",
  opportunity_evidence="Own-site contact page routes inquiries through a form, email and phone. Site uses 'Schedule Service Appointment' and 'Book Your Consultation' language but no online booking mechanism was observed.",
  opportunity_confidence="medium",
  notes="Sales, installation, repairs, upgrades, chimney inspections/sweeping, masonry repairs, relining. Own site explicitly serves Carbondale and Rifle. No franchise affiliation observed.",
 ),
 rec(
  business_name="The Fireplace Expert",
  owner_name="Arturo Rojo",
  phone="9709872962",
  website="https://tfpe.net/",
  trade="fireplace sales, service & chimney repair",
  city="Carbondale",
  booking_mechanism="phone (no online booking observed)",
  missed_call_risk="medium",
  website_quality="weak",
  revamp_candidate="yes",
  opportunity_primary="WEBSITE_REVAMP",
  opportunity_secondary="SEO",
  opportunity_evidence="Home page appears recently refreshed while older .html service pages remain indexed; inconsistent web footprint suggesting SEO/AEO opportunity.",
  opportunity_confidence="medium",
  ai_discoverability="weak",
  notes="Fireplace sales, repair, annual tune-ups/cleaning, chimney repair/relining, wood stoves, custom mountain designs. Own-site About content says founded 1997 by owner-operator Arturo Rojo. Address on own site: 768 Colorado 133, Carbondale. No franchise affiliation observed.",
 ),
 rec(
  business_name="Fireplace West",
  phone="970-245-2448",
  website="http://www.gjfireplacewest.com/",
  trade="fireplace & stove sales and service",
  city="Grand Junction",
  booking_mechanism="phone only (no online booking or own-site email observed)",
  missed_call_risk="medium",
  website_quality="weak",
  revamp_candidate="yes",
  opportunity_primary="WEBSITE_REVAMP",
  opportunity_secondary="SEO",
  opportunity_evidence="Own-site pages show very old content templates with repetitive manufacturer/product copy and call-us CTAs. No online booking or own-site email observed.",
  opportunity_confidence="medium",
  ai_discoverability="weak",
  notes="Fireplace sales, installation, service and repair; wood and pellet stoves. No franchise affiliation observed.",
 ),
 rec(
  business_name="Colorado Fireside",
  phone="(970) 249-7731",
  website="https://www.coloradofireside.com",
  trade="fireplace & stove sales, installation",
  city="Montrose",
  booking_mechanism="phone (no online booking observed)",
  missed_call_risk="medium",
  website_quality="moderate",
  stack_signals="site footer credits Unleash Media",
  opportunity_primary="MISSED_CALL_LEAD_CAPTURE",
  opportunity_evidence="Own site lists Montrose phone prominently with no online booking observed. 'FAMILY OWNED AND OPERATED since 2000' per own site.",
  opportunity_confidence="medium",
  notes="Fireplaces, wood/pellet/gas appliances, masonry products, grills; sales, parts, installation. Operates Montrose and Glenwood Springs locations as a local multi-location independent; no franchise affiliation observed.",
 ),
 rec(
  email="sales@truenorthfireplaces.com",
  business_name="True North Hearth and Home",
  phone="970-787-4747",
  website="https://www.truenorthfireplaces.com/",
  trade="fireplace, heating stoves, hot tubs & outdoor kitchens",
  city="Montrose",
  booking_mechanism="phone and email (no online booking observed)",
  missed_call_risk="medium",
  website_quality="unknown",
  opportunity_primary="MISSED_CALL_LEAD_CAPTURE",
  opportunity_evidence="Own site lists phone and email as contact routes with no online booking observed.",
  opportunity_confidence="medium",
  notes="Montrose showroom at 19107 US-550 Unit 102; also a Glenwood Springs location. Local multi-location independent, not a franchise, per observed evidence. Phone and email taken verbatim from the business's own-site contact text.",
 ),
]

out = pathlib.Path.home() / "workspace/goals/ping-social-outreach-campaign/hidden_files/discovery-scratch/segment-round1721-chimney.jsonl"
with open(out, "w") as fh:
    for r in rows:
        fh.write(json.dumps(r, ensure_ascii=False) + "\n")

# validate
ok = True
with open(out) as fh:
    lines = fh.read().splitlines()
print(f"lines: {len(lines)}")
for i, ln in enumerate(lines, 1):
    d = json.loads(ln)
    if list(d.keys()) != KEYS:
        ok = False; print(f"LINE {i}: key order BAD")
    for k, v in d.items():
        if not isinstance(v, str):
            ok = False; print(f"LINE {i}: {k} not str")
print("KEY ORDER + TYPES OK" if ok else "VALIDATION FAILED")
print("businesses:", [json.loads(l)["business_name"] for l in lines])
