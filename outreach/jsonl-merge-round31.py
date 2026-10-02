#!/usr/bin/env python3
"""Round 31 JSONL merge: updates + new rows (FB scan, F1 ladder, intel).
Research additions merge separately when the research subagent delivers.
Follows the JSONL safety rule: read fully, build in memory, validate, tmp write, verify, os.replace.

DEPRECATED ONE-SHOT (2026-09-22): do NOT rerun. This script hardcodes the
deprecated suppression_state value "in-follow-up-ladder" (line ~114,
f1_common), which was replaced on 2026-09-19 by the canonical ladder
vocabulary ("ladder F1 <date>" / "ladder F2 <date>", see
outreach/prospect-schema.json). Rerunning it would reintroduce the
regression recorded in FAILURE_LEDGER.md FL-20260922-001. Kept as a
historical record only.
"""
import json, os, re, sys

HOME = os.path.expanduser("~")
JSONL = HOME + "/workspace/your_files/western-co-prospects.jsonl"
SCHEMA = HOME + "/workspace/outreach/prospect-schema.json"

FIELDS = ["email","business_name","owner_name","phone","website","trade","city","state",
"region","source","revamp_candidate","notes","intel_updated","website_quality",
"booking_mechanism","missed_call_risk","social_presence","review_velocity",
"notable_reviews","new_filing_signal","stack_signals","opportunity_primary",
"opportunity_secondary","opportunity_evidence","opportunity_confidence",
"ai_discoverability","priority_state","last_signal","suppression_state",
"next_eligible_action"]

ENUMS = {
 "ai_discoverability": {"strong","moderate","weak","unknown",""},
 "missed_call_risk": {"high","medium","low","unknown",""},
 "website_quality": {"strong","moderate","weak","unknown",""},
 "opportunity_primary": {"NEW_BUSINESS_SETUP","MISSED_CALL_LEAD_CAPTURE","WEBSITE_REVAMP","SEO","AEO_AI_DISCOVERABILITY","SOCIAL_PRESENCE","AUTOMATION","INTEGRATION","UNKNOWN",""},
 "opportunity_secondary": {"NEW_BUSINESS_SETUP","MISSED_CALL_LEAD_CAPTURE","WEBSITE_REVAMP","SEO","AEO_AI_DISCOVERABILITY","SOCIAL_PRESENCE","AUTOMATION","INTEGRATION","UNKNOWN",""},
 "opportunity_confidence": {"high","medium","low",""},
 "priority_state": {"HOT","WARM","WATCH","SUPPRESS",""},
 "revamp_candidate": {"yes","no",""},
}

def blank():
    return {f: "" for f in FIELDS}

def validate(rec):
    errs = []
    for f in FIELDS:
        if f not in rec:
            errs.append(f"missing field {f}")
    for f, allowed in ENUMS.items():
        v = rec.get(f, "")
        if v not in allowed and not rec.get("_migration_note"):
            errs.append(f"bad enum {f}={v!r}")
    if not rec.get("business_name"):
        errs.append("empty business_name")
    if rec.get("intel_updated") and not re.match(r"^\d{4}-\d{2}-\d{2}$", rec["intel_updated"]):
        errs.append(f"bad intel_updated {rec['intel_updated']!r}")
    return errs

rows = []
with open(JSONL, encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line:
            rows.append(json.loads(line))
by_name = {r["business_name"]: r for r in rows}
print(f"loaded {len(rows)} rows", file=sys.stderr)

def upd(name, **kw):
    r = by_name.get(name)
    if not r:
        print(f"WARN: no row for {name}", file=sys.stderr)
        return
    r.update(kw)

# --- intel updates ---
upd("Honk-Key Lock & Safe",
    ai_discoverability="strong",
    intel_updated="2026-09-12",
    last_signal="2026-09-12: branded search shows strong discoverability (own site + GlobeNewswire GJ grand-opening release 2026-06-19, 5-star Google reviews cited, 1-800-Unlocks listing)",
    notes="Owner Austin Hohnke (own site). Serves Montrose, GJ/Mesa County, Aspen/Crested Butte for safe/specialty work. GJ storefront grand opening 2026-06-19 (GlobeNewswire) = expansion signal. Press contact info@honkkeylocksafe.com is an alternate to hello@honkkeylocksafe.com; verify which is live before sending. Emergency lockout callers dial the next company in seconds.",
    next_eligible_action="2026-09-14 UTC queue (round-27 draft round27-honk-key-lock-safe-email.md; verify hello@ vs info@ before sending)")
upd("Durango Decks Inc",
    notable_reviews="unreachable/no-response pattern: BBB 1-star 2024-07 (month of failed contact, callback no-show, no communication); Angi 3.6/5 across 5 reviews",
    intel_updated="2026-09-12",
    last_signal="2026-09-12 review check: no NEW bad reviews, so no review trigger; 2024-07 BBB 1-star recorded as missed-call evidence")
upd("The Fence Whisperer",
    intel_updated="2026-09-12",
    last_signal="2026-09-12: own-site contact form assessed, general 'please use our Contact Form' copy, not B2B-unmistakable, skipped per standing rule",
    next_eligible_action="form route SKIPPED 2026-09-12 (not B2B-unmistakable); phone route 970-317-8573 / 970-560-0164 when a calling path exists; watch")
upd("Alpine Pressure",
    next_eligible_action="2026-09-14 UTC queue (bumped by F1 priority + round-26 FIFO; draft round29-alpine-pressure-email.md)")
upd("Apex Waste Solutions",
    next_eligible_action="2026-09-14 UTC queue (bumped by F1 priority + round-26 FIFO; draft round30-apex-waste-solutions-email.md)")

# --- new rows ---
def add(**kw):
    r = blank()
    r.update(kw)
    if r["business_name"] in by_name:
        print(f"WARN: duplicate {r['business_name']}, skipping", file=sys.stderr)
        return
    rows.append(r)
    by_name[r["business_name"]] = r

add(business_name="ReliableMC", trade="home remodeling & handyman", city="Eagle",
    state="CO", region="Colorado (expansion)",
    source="Facebook group scan round 21 (Colorado Business Networking); winter-prep promo signal round 31",
    notes="FB Page 100068580073131, 2,590+ followers. Remodeling/handyman selling free estimates; kitchens, bathrooms, decks, repairs. FB DM is the only contact route (no phone/email/site in posts).",
    intel_updated="2026-09-12", website_quality="", booking_mechanism="fb dm",
    missed_call_risk="medium", social_presence="fb only",
    opportunity_primary="MISSED_CALL_LEAD_CAPTURE", opportunity_secondary="AUTOMATION",
    opportunity_evidence="Known: actively promoting in Colorado Business Networking, including a winter-prep promo (windows/doors/gutters/heat tape) posted twice 2026-09-12 ~00:31 MDT. Inferred: inbound interest from posts with no capture system beyond Facebook messaging.",
    opportunity_confidence="medium",
    priority_state="WARM",
    last_signal="2026-09-12: winter-prep promo (windows/doors/gutters/heat tape) posted 2x in Colorado Business Networking ~00:31 MDT",
    suppression_state="eligible",
    next_eligible_action="DM draft parked (round 21); refresh angle with winterization pitch when FB session restores")

f1_common = dict(
    state="CO", region="Colorado (expansion)",
    source="PING Social outreach round 1/2 (2026-09-08); F1 ladder round 31",
    intel_updated="2026-09-12",
    opportunity_primary="MISSED_CALL_LEAD_CAPTURE", opportunity_secondary="AUTOMATION",
    opportunity_confidence="medium", priority_state="WARM",
    suppression_state="in-follow-up-ladder",  # DEPRECATED 2026-09-19: canonical vocabulary is "ladder F1 <date>" / "ladder F2 <date>". Do NOT copy this value; see FL-20260922-001.
    next_eligible_action="F1 queued for 2026-09-13 UTC cap (initial sent 2026-09-08); F2 eligible 2026-09-18+",
    last_signal="2026-09-08 email SENT (verified in sent mail); F1 draft queued 2026-09-12, no reply")

add(business_name="MH Electrical & Solar", trade="electrical / solar", city="Denver",
    email="hello@mhelectricalandsolar.com", owner_name="Matt Heenan",
    phone="(303) 915-0914", website="http://www.mhelectricalandsolar.com/",
    notes="Family-owned since 2015. Residential/commercial electrical (panels, wiring, lighting, EV charging) + solar installs and storage. Licensed, insured, bonded, in-house electricians. Email from third-party listing (findenergy), not on own site; accepted 2026-09-08 with no bounce.",
    missed_call_risk="high", social_presence="",
    opportunity_evidence="Known: owner-led electrical/solar shop; best opportunities arrive after office hours (failing panel, EV charger questions, solar projects). Inferred: inbox-based intake while owner/electricians are on jobs means quotes sit unread.",
    website_quality="", booking_mechanism="", **f1_common)

add(business_name="Sanders & Johnson Heating, Cooling & Plumbing", trade="HVAC / plumbing",
    city="Denver", email="contactus@sandersandjohnson.com",
    owner_name="Jim Sanders", phone="(720) 619-2021",
    website="https://www.sandersandjohnson.com",
    notes="Family-owned since 1977, 'one of the few remaining family-owned HVAC and plumbing companies in Denver metro'. Heating, cooling, plumbing, water heaters, IAQ, same-day emergency, financing. ~20 employees (third-party, unverified).",
    missed_call_risk="high",
    opportunity_evidence="Known: 10pm furnace failures, Sunday leaks, estimate questions arrive outside office hours; techs and dispatchers juggle the phones. Inferred: after-hours callers reach voicemail and call the next shop.",
    website_quality="", booking_mechanism="", **f1_common)

add(business_name="To The T Plumbing, Heating & Air", trade="plumbing / HVAC",
    city="Thornton", email="admin@tothetplumbingandheating.com",
    owner_name="Nate", phone="(720) 464-1609",
    website="https://www.tothetplumbingandheating.com",
    notes="Family-owned and operated since 2005 (per own site). Plumbing + HVAC, 24/7 emergency service, online booking, club memberships, financing. Team page lists office manager, marketing manager, dispatch coordinator, call-center rep.",
    missed_call_risk="high",
    opportunity_evidence="Known: 24/7 emergency positioning; burst pipes at 2am, holiday AC failures, mid-job calls. Inferred: somebody always pays the price for availability, usually the people already working.",
    website_quality="", booking_mechanism="", **f1_common)

add(business_name="Smart Garage Door Service", trade="garage doors", city="Denver",
    email="info@smartgaragedoorco.com", owner_name="Dmitrii Reison",
    phone="(720) 299-5604", website="https://www.smartgaragedoorco.com/",
    notes="Family-owned since 2017. Garage door spring/opener repair and replacement, smart opener installs, new doors, commercial doors, 24/7 emergency repair with rapid-response fleet. BBB A+ accredited. Email published on company YouTube channel.",
    missed_call_risk="high",
    opportunity_evidence="Known: 24/7 emergency promise; stuck-open garage at midnight is a security problem. Inferred: somebody must answer every call, pulling techs off installs.",
    website_quality="", booking_mechanism="", **f1_common)

# --- validate all ---
bad = 0
for r in rows:
    errs = validate(r)
    if errs:
        bad += 1
        print(f"INVALID {r.get('business_name')}: {errs}", file=sys.stderr)
if bad:
    print(f"{bad} invalid rows, aborting", file=sys.stderr)
    sys.exit(1)

# --- atomic write ---
tmp = JSONL + ".tmp"
with open(tmp, "w", encoding="utf-8") as f:
    for r in rows:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")
with open(tmp, encoding="utf-8") as f:
    check = [json.loads(l) for l in f if l.strip()]
assert len(check) == len(rows), "line count mismatch"
for name in ["ReliableMC","MH Electrical & Solar","Honk-Key Lock & Safe"]:
    assert any(r["business_name"] == name for r in check), f"missing {name}"
os.replace(tmp, JSONL)
print(f"OK: {len(rows)} rows written")
