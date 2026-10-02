#!/usr/bin/env python3
"""Generate jsonl-additions-round53-meta.jsonl with schema validation.
Round 53: independent verification of Meta AI Western Colorado candidates.
All facts independently verified 2026-09-14 via public web. No emails found
on any candidate own site, so all rows are WATCH phone-only. No drafts.
"""
import json, re, sys

OUT = "/home/hatch/workspace/outreach/jsonl-additions-round53-meta.jsonl"

BASE = dict(
    email="", owner_name="", social_presence="", review_velocity="",
    notable_reviews="", new_filing_signal="", revamp_candidate="",
    opportunity_secondary="", ai_discoverability="unknown",
    suppression_state="eligible", next_eligible_action="watch",
    conversion_state="", converted_at="", conversion_evidence="",
    state="CO", region="Western Colorado",
    source="meta-ai-intel (round 53), independently verified 2026-09-14",
    intel_updated="2026-09-14",
    last_signal="2026-09-14 independent web verification, business active",
    priority_state="WATCH",
)

ROWS = [
 dict(business_name="Griffith Plumbing/Mechanical Services LLC",
  owner_name="Richard and Calie Griffith", phone="970-858-6555",
  website="http://www.griffithplumbinggj.com/",
  trade="plumbing and HVAC (service, repair, replacement, new construction)",
  city="Grand Junction",
  notes="Independent family-owned shop. Own site states owned and operated by Richard and Calie Griffith. CO Licensed Master Plumbing Contractor, State Level Master Mechanical, EPA and NATE certified, Xcel Energy Trade Partner. BBB profile corroborates business and phone. Contact page has web form only, no published email. Mailing address PO Box 1847, Grand Junction CO 81502.",
  website_quality="moderate", booking_mechanism="phone + web form",
  missed_call_risk="medium", stack_signals="UNKNOWN",
  opportunity_primary="MISSED_CALL_LEAD_CAPTURE",
  opportunity_evidence="Service and repair business with field techs; own site invites appointment scheduling by phone or form; no after-hours answering evidence observed.",
  opportunity_confidence="medium"),

 dict(business_name="Avalanche Heating Cooling Plumbing", phone="970-234-9555",
  website="http://www.avalanchegj.com/",
  trade="HVAC and plumbing (installation and service, emergency service)",
  city="Grand Junction",
  notes="Independent American Standard dealer per own site (site uses independent dealer language). Local Business Times article reported the firm founded in 2007. Site publishes license numbers PC0002872 and MP00600556. Address 2796 Winters Ave B, Grand Junction per listings. No published email found.",
  website_quality="moderate", booking_mechanism="phone-only",
  missed_call_risk="high", stack_signals="UNKNOWN",
  opportunity_primary="MISSED_CALL_LEAD_CAPTURE",
  opportunity_evidence="Advertises fast and friendly emergency service with on-call technician; emergency calls arriving when techs are on jobs are the clearest leak.",
  opportunity_confidence="medium"),

 dict(business_name="Double Diamond Plumbing & Heating", phone="970-242-5547",
  website="",
  trade="plumbing and HVAC (service, repair, remodeling)",
  city="Grand Junction",
  notes="Real local business per Yellow Pages (family owned and operated since 1993) and BuildZoom (active CO plumbing license, 126 permits since 1997). Address 979 22 Rd, Grand Junction CO 81505. Both historical domains are compromised: doublediamondplumbingandheating.com now shows a generic template site with Texas testimonials and an 833 number, and doublediamondplumbinghvac.com is a parked GoDaddy lead-gen page. Website field left blank; phone is the contact route.",
  website_quality="weak", booking_mechanism="phone-only",
  missed_call_risk="medium", stack_signals="UNKNOWN",
  opportunity_primary="MISSED_CALL_LEAD_CAPTURE",
  opportunity_evidence="Established family shop with service and repair intake; no digital front door beyond phone, so missed calls are invisible.",
  opportunity_confidence="medium"),

 dict(business_name="Durham Plumbing & Heating", phone="970-263-9252",
  website="",
  trade="plumbing and heating",
  city="Grand Junction",
  notes="Listed in the Blue Book contractor directory since 2007; BuildZoom shows permit activity 2023 through 2025, indicating current operation. Address 2111 Zion Rd, Grand Junction per listings. Ownership not established from public sources. Own site could not be fetched during verification.",
  website_quality="unknown", booking_mechanism="phone-only",
  missed_call_risk="medium", stack_signals="UNKNOWN",
  opportunity_primary="MISSED_CALL_LEAD_CAPTURE",
  opportunity_evidence="Active service shop with multi-year permit history; phone is the only confirmed contact route.",
  opportunity_confidence="low"),

 dict(business_name="Binkley & Mapes Roofing LLC", phone="970-434-7864",
  website="https://www.binkleymapesroofing.com/",
  trade="roofing (residential and commercial) and remodeling",
  city="Grand Junction",
  notes="Own site states locally operated family business serving Grand Junction for over 40 years. Fully insured and licensed, free estimates. Service area covers Redlands, Clifton, Montrose, Glenwood Springs, Craig, Cortez, Durango, Rifle, Battlement Mesa and Delta. No published email.",
  website_quality="moderate", booking_mechanism="phone + web form",
  missed_call_risk="medium", stack_signals="UNKNOWN",
  opportunity_primary="MISSED_CALL_LEAD_CAPTURE",
  opportunity_evidence="Free-estimate funnel for roofing projects; crews on roofs all day while inbound estimate calls go unanswered.",
  opportunity_confidence="medium"),

 dict(business_name="Diversified Roofing", phone="970-749-8463",
  website="https://www.diversegc.com/",
  trade="roofing, gutters and siding",
  city="Durango",
  notes="Correction from Meta AI claim: own site brands as Diversified Roofing based in Durango, not Grand Junction. Own site states 100 percent local family business with 10 plus years experience. Address 29318 U.S. 160 unit a, Durango CO 81303. Serves Durango, Bayfield, Pagosa Springs, Silverton, Cortez and surrounding counties. No published email.",
  website_quality="moderate", booking_mechanism="phone + web form",
  missed_call_risk="medium", stack_signals="UNKNOWN",
  opportunity_primary="MISSED_CALL_LEAD_CAPTURE",
  opportunity_evidence="Roofing and gutter shop with free-quote funnel; owner-led field crews typical for this segment.",
  opportunity_confidence="medium"),

 dict(business_name="Lunsford Plumbing, Heating & Cooling LLC", phone="970-242-5790",
  website="http://www.lunsfordplumbing.com/",
  trade="plumbing, heating and cooling",
  city="Grand Junction", revamp_candidate="yes",
  notes="Own site active (Lunsford PHC). Master Plumber Certified, Master Mechanical Contractor, Backflow Certified. Address 2481 Commerce Blvd, Grand Junction per listings. Owner identity not confirmed from public sources. Thin site, possible website revamp angle.",
  website_quality="weak", booking_mechanism="phone-only",
  missed_call_risk="medium", stack_signals="UNKNOWN",
  opportunity_primary="MISSED_CALL_LEAD_CAPTURE",
  opportunity_evidence="Service shop with phone-only intake; thin site suggests low technical maturity.",
  opportunity_confidence="medium"),

 dict(business_name="Coppersmith Plumbing & HVAC", phone="970-245-3869",
  website="http://www.coppersmithplumbing.com/",
  trade="plumbing and HVAC",
  city="Grand Junction", revamp_candidate="yes",
  notes="BuildZoom reports top 4 percent in Grand Junction with 380 permits in 3 years, indicating a larger operation than a small owner shop. Address 630 Maldonado St, Grand Junction CO 81501. Independent, no franchise affiliation found; ownership not confirmed. Thin site, possible website revamp angle.",
  website_quality="weak", booking_mechanism="phone-only",
  missed_call_risk="medium", stack_signals="UNKNOWN",
  opportunity_primary="MISSED_CALL_LEAD_CAPTURE",
  opportunity_evidence="High-volume service shop; phone-only intake at this scale means after-hours and mid-job calls leak.",
  opportunity_confidence="low"),

 dict(business_name="Rescue 1 Plumbing", phone="970-812-1715",
  website="https://www.rescueoneplumbing.com/",
  trade="plumbing (repairs, water heaters, drains, sewer, commercial)",
  city="Grand Junction",
  notes="Own site states family-owned business with 25 plus years of experience; member of the Grand Junction and Palisade Chambers of Commerce. Address 554 25 Rd, Grand Junction CO 81505. Emergency services on weeknights and Saturdays. Canonical site is rescueoneplumbing.com; a separate rescue1plumbing.com domain exists with a different phone (970-812-7272), treat as non-canonical. No published email.",
  website_quality="moderate", booking_mechanism="phone-only",
  missed_call_risk="high", stack_signals="UNKNOWN",
  opportunity_primary="MISSED_CALL_LEAD_CAPTURE",
  opportunity_evidence="Sells emergency availability on weeknights and Saturdays with fast response promises; emergency callers work down a list until someone answers.",
  opportunity_confidence="medium"),

 dict(business_name="Aspen Foundation Repairs", phone="1-970-235-0092",
  website="https://aspenfoundationrepairs.com/",
  trade="foundation repair, waterproofing and concrete leveling",
  city="Rifle",
  notes="Own site states locally owned crew based in Rifle with 40 plus years combined experience; BBB accredited. Address 732 Buckhorn Dr Unit B, Rifle CO 81650. Serves the Western Slope and Roaring Fork Valley. Affiliated Supportworks dealer (independent dealer network; products installed with written warranty). Project and estimate driven, so missed-call fit is weaker than emergency trades.",
  website_quality="strong", booking_mechanism="phone + web form",
  missed_call_risk="low", stack_signals="UNKNOWN",
  opportunity_primary="MISSED_CALL_LEAD_CAPTURE",
  opportunity_evidence="Free-estimate funnel for high-ticket foundation work; intake still runs through one phone line and a form.",
  opportunity_confidence="low"),

 dict(business_name="Midnight Plumbing & Heating", phone="970-241-5894",
  website="https://midnightplumbingandheating.com/",
  trade="plumbing and heating",
  city="Grand Junction",
  notes="Listing self-description: heating and plumbing experts serving Grand Junction and Western Colorado since 1995, locally owned and operated. Address 779 24 Rd, Grand Junction. Active site with web form. Ownership not confirmed from public sources. A separate directory listing shows a Montrose address that may be related.",
  website_quality="moderate", booking_mechanism="phone + web form",
  missed_call_risk="medium", stack_signals="UNKNOWN",
  opportunity_primary="MISSED_CALL_LEAD_CAPTURE",
  opportunity_evidence="Long-standing local service shop; phone and form intake with no observed after-hours coverage.",
  opportunity_confidence="medium"),

 dict(business_name="Alpha Plumbing & Heating", phone="970-874-8375",
  website="",
  trade="plumbing and heating",
  city="Delta",
  notes="Delta County Chamber of Commerce member listing: 3335 1600 Rd, Delta CO 81416, (970) 874-8375. Distinct business from the Summit County Alpha Plumbing Heating & Gas already in the pipeline. No own website found. Small independent shop inferred; ownership not confirmed from public sources.",
  website_quality="unknown", booking_mechanism="phone-only",
  missed_call_risk="medium", stack_signals="UNKNOWN",
  opportunity_primary="MISSED_CALL_LEAD_CAPTURE",
  opportunity_evidence="Small-town service shop with phone-only intake; classic owner-answers-own-phone profile.",
  opportunity_confidence="medium"),

 dict(business_name="Bros Roofing LLC", phone="970-975-0927",
  website="https://brosroofingllc.com/",
  trade="roofing (residential replacement, repairs, gutters)",
  city="Grand Junction",
  notes="Own site describes a local roofing company based in Grand Junction. Address 2420 E Main St, Grand Junction CO 81501. Contact page publishes (970) 975-0927; map listings show a different number (970) 660-3990 that may be stale. Contact form only, no published email. Ownership not confirmed from public sources.",
  website_quality="moderate", booking_mechanism="phone + web form",
  missed_call_risk="medium", stack_signals="UNKNOWN",
  opportunity_primary="MISSED_CALL_LEAD_CAPTURE",
  opportunity_evidence="Free-estimate funnel; local crew on roofs while estimate requests arrive by phone and form.",
  opportunity_confidence="medium"),

 dict(business_name="Kruger Roofing", phone="970-241-7530",
  website="http://www.krugerroofing.com/",
  trade="roofing (residential and commercial) and metal wall panels",
  city="Grand Junction",
  notes="Own site states locally owned and operated business serving the Grand Valley since 1979. Address 1050 Kimball Ave, Grand Junction. Service area includes Montrose, Rifle, Delta, Moab UT, Fruita and Palisade. No published email.",
  website_quality="moderate", booking_mechanism="phone + web form",
  missed_call_risk="medium", stack_signals="UNKNOWN",
  opportunity_primary="MISSED_CALL_LEAD_CAPTURE",
  opportunity_evidence="Established local roofer with free-estimate funnel; estimate and repair calls arrive while crews are on jobs.",
  opportunity_confidence="medium"),
]

REQUIRED = ["email","business_name","owner_name","phone","website","trade","city","state",
 "region","source","revamp_candidate","notes","intel_updated","website_quality",
 "booking_mechanism","missed_call_risk","social_presence","review_velocity",
 "notable_reviews","new_filing_signal","stack_signals","opportunity_primary",
 "opportunity_secondary","opportunity_evidence","opportunity_confidence",
 "ai_discoverability","priority_state","last_signal","suppression_state",
 "next_eligible_action","conversion_state","converted_at","conversion_evidence"]

ENUMS = {
 "website_quality": {"strong","moderate","weak","unknown",""},
 "missed_call_risk": {"high","medium","low","unknown",""},
 "opportunity_primary": {"NEW_BUSINESS_SETUP","MISSED_CALL_LEAD_CAPTURE","WEBSITE_REVAMP",
   "SEO","AEO_AI_DISCOVERABILITY","SOCIAL_PRESENCE","AUTOMATION","INTEGRATION","UNKNOWN",""},
 "opportunity_secondary": {"NEW_BUSINESS_SETUP","MISSED_CALL_LEAD_CAPTURE","WEBSITE_REVAMP",
   "SEO","AEO_AI_DISCOVERABILITY","SOCIAL_PRESENCE","AUTOMATION","INTEGRATION","UNKNOWN",""},
 "opportunity_confidence": {"high","medium","low",""},
 "ai_discoverability": {"strong","moderate","weak","unknown",""},
 "priority_state": {"HOT","WARM","WATCH","SUPPRESS",""},
 "revamp_candidate": {"yes","no",""},
 "conversion_state": {"","replied","meeting","customer"},
}

def check_no_emdash(s, where):
    if "\u2014" in s or "\u2013" in s:
        raise ValueError("em/en dash found in %s" % where)

lines = []
names = set()
for i, r in enumerate(ROWS):
    row = dict(BASE); row.update(r)
    missing = [k for k in REQUIRED if k not in row]
    if missing: raise ValueError("row %d missing %s" % (i, missing))
    extra = [k for k in row if k not in REQUIRED]
    if extra: raise ValueError("row %d extra %s" % (i, extra))
    for k, allowed in ENUMS.items():
        if row[k] not in allowed:
            raise ValueError("row %d bad enum %s=%r" % (i, k, row[k]))
    if not row["business_name"]: raise ValueError("row %d empty name" % i)
    if row["business_name"] in names: raise ValueError("dup name " + row["business_name"])
    names.add(row["business_name"])
    for k, v in row.items():
        if isinstance(v, str): check_no_emdash(v, "row %d %s" % (i, k))
    if not re.match(r"^$|^\d{4}-\d{2}-\d{2}$", row["converted_at"]):
        raise ValueError("row %d bad converted_at" % i)
    lines.append(json.dumps(row, ensure_ascii=False))

with open(OUT, "w") as f:
    f.write("\n".join(lines) + "\n")
print("wrote %d rows to %s" % (len(lines), OUT))
