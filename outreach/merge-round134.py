#!/usr/bin/env python3
"""Round 134 canonical JSONL merge: archive 7 weakest WATCH, insert 7 discovery-staged NEW rows.
Safety: read fully -> build in memory -> validate -> write .tmp -> re-read/verify -> os.replace.
"""
import json, os, sys

CANON = "/home/hatch/workspace/your_files/western-co-prospects.jsonl"
ARCH = "/home/hatch/workspace/outreach/prospect-archive.jsonl"
TMP = CANON + ".round134.tmp"

with open(CANON) as f:
    raw_lines = f.readlines()
rows = [json.loads(l) for l in raw_lines]
print("loaded rows:", len(rows))
assert len(rows) == 305, "expected 305 rows, got %d" % len(rows)

ARCHIVE_NAMES = [
    "Griffith Plumbing/Mechanical Services LLC",
    "Binkley & Mapes Roofing LLC",
    "Rescue 1 Plumbing",
    "Kruger Roofing",
    "Qualtire Plumbing & Heating",
    "Faith Roofing, LLC",
    "WD Yards Inc",
]
by_name = {r["business_name"]: (i, r) for i, r in enumerate(rows)}
for n in ARCHIVE_NAMES:
    assert n in by_name, "archive candidate missing: " + n
    r = by_name[n][1]
    assert r.get("priority_state") == "WATCH", "not WATCH: " + n
    ss = r.get("suppression_state") or ""
    assert not ss.startswith("declined") and not ss.startswith("bounced"), "suppressed: " + n
    assert "ladder" not in ss, "in ladder: " + n

archived = []
kept = []
for r in rows:
    if r["business_name"] in ARCHIVE_NAMES:
        a = dict(r)
        a["archived_at"] = "2026-09-24"
        a["archive_reason"] = "quality-cap 300 active: weakest WATCH, no signal in 2+ sweeps, lowest fit (phone-only, no email route, no next action); archived by outreach-engine round 134 to make room for 7 discovery-verified NEW candidates"
        archived.append(a)
    else:
        kept.append(r)
assert len(archived) == 7 and len(kept) == 298

with open(ARCH, "a") as f:
    for a in archived:
        f.write(json.dumps(a) + "\n")
print("archived 7 -> prospect-archive.jsonl")

def R(name, trade, city, phone, email, website, source, priority, opp1, opp2, conf,
      booking, mcr, wq, revamp, notes, nxt, last_signal, suppression, opp_ev,
      review_vel="", stack="site platform UNKNOWN; FSM/CRM/estimating UNKNOWN",
      ai_disc="unknown", owner=""):
    return {
        "business_name": name, "trade": trade, "city": city, "state": "CO",
        "region": "Western Colorado", "phone": phone, "email": email,
        "website": website, "owner_name": owner, "source": source,
        "revamp_candidate": revamp, "notes": notes, "intel_updated": "2026-09-24",
        "website_quality": wq, "booking_mechanism": booking,
        "missed_call_risk": mcr, "social_presence": "", "review_velocity": review_vel,
        "notable_reviews": "", "new_filing_signal": "", "stack_signals": stack,
        "opportunity_primary": opp1, "opportunity_secondary": opp2,
        "opportunity_evidence": opp_ev, "opportunity_confidence": conf,
        "ai_discoverability": ai_disc, "priority_state": priority,
        "last_signal": last_signal, "suppression_state": suppression,
        "next_eligible_action": nxt, "conversion_state": "",
        "converted_at": "", "conversion_evidence": "",
    }

NEW = [
    R("Mullenax Construction & Roofing", "roofing / general contractor", "Rifle",
      "(970) 625-5154", "", "gregmullenaxroofing.com",
      "meta-ai-intel a-weak-website-hunt 20260924-090654 (round 133); verified by discovery lane",
      "WATCH", "MISSED_CALL_LEAD_CAPTURE", "WEBSITE_REVAMP", "medium",
      "phone-only", "high", "weak", "yes",
      "Silt HQ (2254 Mustang, Silt), Rifle office 514 Will Ave per Manta; stage as Rifle prospect only, NO De Beque presence verified; in business since 1983; 27+ Birdeye reviews 4.4; own site CAPTCHA-gated (weak digital front door); no chain signals 2026-09-24",
      "watch; FB Message-button check candidate",
      "2026-09-24 discovery-verified NEW (round 133)", "",
      "Phone-first intake behind CAPTCHA-gated site; Rifle service area; field crews, since 1983"),
    R("Confluence Electric", "electrical", "Carbondale",
      "(970) 618-7243", "Service@Confluence.LLC", "confluence.llc",
      "meta-ai-intel a-weak-website-hunt 20260924-090654 (round 133); verified by discovery lane",
      "WARM", "MISSED_CALL_LEAD_CAPTURE", "", "medium",
      "phone-first; own site + published email", "high", "moderate", "no",
      "851 Latigo Loop, Carbondale; license EC.0102385; advertises 24/7; 28-31 reviews at 5 stars; Meta AI weak-website label was STALE (live domain, active license, healthy reviews); small basic site, phone-first",
      "queued-draft; draft round134-confluence-electric-email.md; rolls to 09-28 FIFO",
      "2026-09-24 discovery-verified NEW (round 133); email route drafted round 134", "queued-draft",
      "Own-site email Service@Confluence.LLC + phone on confluence.llc/contact-us; 24/7 advertised by a small shop; emergency calls perishable",
      review_vel="5 stars, 28-31 reviews"),
    R("Coven's Plumbing", "plumbing", "Loma",
      "(970) 986-9341", "", "",
      "meta-ai-intel a-weak-website-hunt 20260924-090654 (round 133); verified by discovery lane",
      "WATCH", "MISSED_CALL_LEAD_CAPTURE", "WEBSITE_REVAMP", "medium",
      "phone-only", "high", "weak", "yes",
      "1480 12 1/2 Rd, Loma 81524; active license COPC-2125/MP-994, 166 permits pulled since 2009; NO own website anywhere; unclaimed directory profiles; Birdeye 4.1/7",
      "watch; FB Message-button check candidate",
      "2026-09-24 discovery-verified NEW (round 133)", "",
      "Licensed active shop with deep permit history, no own website; phone-only intake",
      review_vel="4.1/7 Birdeye"),
    R("Cheerful Cesspool Services", "septic", "Cedaredge",
      "(970) 856-3019", "", "",
      "meta-ai-intel d-segment-deep-dive 20260924-090420 (round 133); verified by discovery lane",
      "WATCH", "MISSED_CALL_LEAD_CAPTURE", "WEBSITE_REVAMP", "medium",
      "phone-only", "high", "weak", "yes",
      "18758 Surface Creek Rd, Cedaredge; Delta County official septic installer/cleaner list (county-published phone, email N/A); EPA Region 8 doc corroboration; NO own website; NO Facebook page found; essentially invisible online",
      "watch",
      "2026-09-24 discovery-verified NEW (round 133)", "",
      "County-listed pumper, phone-only micro-shop, invisible online; missed-call + revamp angles"),
    R("On A Budget Rooter", "septic / drain", "Delta",
      "(970) 209-3237", "", "onabudgetrooter.com",
      "meta-ai-intel d-segment-deep-dive 20260924-090420 (round 133); verified by discovery lane",
      "WATCH", "MISSED_CALL_LEAD_CAPTURE", "", "medium",
      "phone-only (own site phone-only CTA)", "high", "moderate", "no",
      "1575 F Lane, Delta 81416; 24/7 emergency but phone-only intake; own live site has repetitive template text + placeholder testimonial names; third-party email Onabudgetrooter@yahoo.com is NOT own-site verified (own site shows no email) -> kept unverified per own-site rule; FMCSA active LLC",
      "watch; re-verify email on own site before any draft",
      "2026-09-24 discovery-verified NEW (round 133)", "",
      "24/7 emergency promise with phone-only intake; thin real digital trust layer (placeholder testimonials)"),
    R("Grand Valley Curbing", "concrete landscape curbing", "Grand Junction",
      "", "", "grandvalleycurbing.com",
      "research-round133 (round 133); verified by discovery lane",
      "WARM", "MISSED_CALL_LEAD_CAPTURE", "AUTOMATION", "high",
      "online form (own-site Get Your Free Estimate)", "high", "moderate", "no",
      "Locally owned and operated, established 1996; own site promises response within 24 hours; no owner name published (Onsite Owner(s)); no chain/franchise signals 2026-09-24; form is a customer quote flow with no B2B invitation -> no form submit",
      "watch; FB Message-button check candidate (form-only route)",
      "2026-09-24 discovery-verified NEW (round 133)", "",
      "Own 24-hour response promise while curbing crews run machines on-site all day during the pre-freeze flatwork window; estimate follow-up is the leak to automate",
      review_vel="5.0 referenced in place records"),
    R("Concrete Raising Services (CRS)", "concrete lifting / leveling", "Delta",
      "(970) 874-7397", "info@crslevel.com", "crslevel.com",
      "research-round133 (round 133); verified by discovery lane; email verbatim on own-site contact page, re-verified live by outreach-engine round 134",
      "WATCH", "MISSED_CALL_LEAD_CAPTURE", "AUTOMATION", "high",
      "email + online form", "high", "moderate", "no",
      "22235 H75 Rd, Delta; Locally Owned & Operated in Delta, CO; WordPress CONFIRMED; unrelated namesakes in IL/AB/TX/OH -> Delta CO entity only; chain re-verify at outreach time",
      "queued-draft; draft round134-concrete-raising-services-email.md; rolls to 09-28 FIFO",
      "2026-09-24 discovery-verified NEW (round 133); email route drafted round 134", "queued-draft",
      "Lifting jobs run 1-3 hours with crew hands-on; free-estimate intake depends on callbacks; tail of paving season means phones ring while crews are under slabs",
      stack="WordPress CONFIRMED (wp-content assets on crslevel.com); FSM/CRM/estimating UNKNOWN"),
]

# schema sanity: required keys present, enums legal
REQ = ["email","business_name","owner_name","phone","website","trade","city","state","region",
"source","revamp_candidate","notes","intel_updated","website_quality","booking_mechanism",
"missed_call_risk","social_presence","review_velocity","notable_reviews","new_filing_signal",
"stack_signals","opportunity_primary","opportunity_secondary","opportunity_evidence",
"opportunity_confidence","ai_discoverability","priority_state","last_signal","suppression_state",
"next_eligible_action","conversion_state","converted_at","conversion_evidence"]
OPP1 = {"NEW_BUSINESS_SETUP","MISSED_CALL_LEAD_CAPTURE","WEBSITE_REVAMP","SEO",
"AEO_AI_DISCOVERABILITY","SOCIAL_PRESENCE","AUTOMATION","INTEGRATION","UNKNOWN",""}
PRIO = {"HOT","WARM","WATCH","SUPPRESS",""}
for r in NEW:
    missing = [k for k in REQ if k not in r]
    assert not missing, (r["business_name"], missing)
    assert r["opportunity_primary"] in OPP1, r["business_name"]
    assert r["opportunity_secondary"] in OPP1, r["business_name"]
    assert r["priority_state"] in PRIO, r["business_name"]
    assert r["business_name"]
    assert r["opportunity_confidence"] in {"high","medium","low",""}, r["business_name"]
existing = {r["business_name"] for r in kept}
for r in NEW:
    assert r["business_name"] not in existing, "duplicate: " + r["business_name"]

final = kept + NEW

# RESPONSE PROJECTION for existing rows with round-129 sends (rows that exist in JSONL)
PROJ = {
    "Pest Away Spraying": "F1 eligible 2026-09-28 to 2026-10-01 (initial cold SENT 2026-09-24, no reply)",
    "Kooler Garage Doors": "F1 eligible 2026-09-28 to 2026-10-01 (initial cold SENT 2026-09-24, no reply)",
    "Western Slope Junk Removal": "F1 eligible 2026-09-28 to 2026-10-01 (initial cold SENT 2026-09-24, no reply)",
}
for r in final:
    if r["business_name"] in PROJ and "SENT 2026-09-24" not in (r.get("last_signal") or ""):
        r["last_signal"] = ((r.get("last_signal") or "") + "; " if r.get("last_signal") else "") + "initial cold SENT 2026-09-24 (round 129)"
    if r["business_name"] in PROJ and not (r.get("next_eligible_action") or "").startswith("F1 eligible"):
        r["next_eligible_action"] = PROJ[r["business_name"]]

with open(TMP, "w") as f:
    for r in final:
        f.write(json.dumps(r) + "\n")

# verify: re-read tmp
with open(TMP) as f:
    vlines = f.readlines()
vrows = [json.loads(l) for l in vlines]
assert len(vrows) == 305, "tmp count %d" % len(vrows)
vn = {r["business_name"] for r in vrows}
for n in ARCHIVE_NAMES:
    assert n not in vn, "archive failed: " + n
for r in NEW:
    assert r["business_name"] in vn, "insert failed: " + r["business_name"]
active = sum(1 for r in vrows if r.get("priority_state") != "SUPPRESS")
print("tmp verified: 305 rows,", active, "active; archived absent, new present")
os.replace(TMP, CANON)
print("ATOMIC REPLACE DONE")
