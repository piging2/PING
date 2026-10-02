#!/usr/bin/env python3
"""Round 53 JSONL merge: archive 6 weakest, promote 5, update 2 intel rows.
Follows the JSONL safety rule: read fully, build in memory, validate, tmp write, verify, os.replace.
NEVER edit the file directly; always use this full-rewrite pattern."""
import json, os, re, sys

HOME = os.path.expanduser("~")
JSONL = HOME + "/workspace/your_files/western-co-prospects.jsonl"
ARCHIVE = HOME + "/workspace/outreach/prospect-archive.jsonl"
META_ADD = HOME + "/workspace/outreach/jsonl-additions-round53-meta.jsonl"
RES_ADD = HOME + "/workspace/outreach/jsonl-additions-round53-research.jsonl"

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

def validate(rec):
    errs = []
    for f in FIELDS:
        if f not in rec: errs.append("missing " + f)
    for f, allowed in ENUMS.items():
        if rec.get(f, "") not in allowed: errs.append(f"bad enum {f}={rec.get(f)!r}")
    if not rec.get("business_name"): errs.append("empty business_name")
    if rec.get("intel_updated") and not re.match(r"^\d{4}-\d{2}-\d{2}$", rec["intel_updated"]):
        errs.append("bad intel_updated")
    return errs

rows = []
with open(JSONL, encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line: rows.append(json.loads(line))
print(f"loaded {len(rows)} rows", file=sys.stderr)
by_name = {r["business_name"]: r for r in rows}

# --- 1. archive the 6 weakest (no email, no website, stale 09-11/09-12 signals, no contact route) ---
ARCHIVE_NAMES = [
    "High Country Window Washers",
    "Kenny's Overhead Doors",
    "Elijah Williams (trash can cleaning)",
    "Copeland's Detailing Domain",
    "Kevlar Garage Services LLC",
    "RG Resin",
]
archived = []
kept = []
for r in rows:
    if r["business_name"] in ARCHIVE_NAMES:
        archived.append(r)
    else:
        kept.append(r)
assert len(archived) == 6, f"expected 6 archived, got {len(archived)}"
rows = kept
by_name = {r["business_name"]: r for r in rows}
with open(ARCHIVE, "a", encoding="utf-8") as f:
    for r in archived:
        r = dict(r)
        r["archived_round"] = "round53"
        r["archived_reason"] = "no email, no website, stale 2026-09-11/12 signal with no new signal in 2+ sweeps, no contact route beyond parked DM; weakest WATCH/WARM bench rows, archived to hold the 300-active cap"
        f.write(json.dumps(r, ensure_ascii=False) + "\n")
print(f"archived {len(archived)} rows", file=sys.stderr)

# --- 2. intel updates on existing rows ---
def upd(name, **kw):
    r = by_name.get(name)
    if not r:
        print(f"WARN: no row for {name}", file=sys.stderr); return
    r.update(kw)

upd("RAM Pest Control",
    intel_updated="2026-09-14",
    last_signal="2026-09-14 review check: no NEW dated 2-star-or-under review, no trigger. pestcontrolreviews.com aggregate 4.6/5 across 20 reviews; one undated Google review complains rates doubled without notice (intel only, pricing transparency). Angi 5.0/2 (2013).",
    notable_reviews="Undated Google review (via pestcontrolreviews.com aggregate): rates doubled without notice. Angi 5.0/2 reviews (2013, verified).",
    ai_discoverability="moderate",
    notes="Rifle pest control, 818 Taugenbaugh Blvd Ste 104, (970) 620-3541, rampestcontrol.net. Markets emergency + same-day service while own site admits manpower constraint; fall rodent/wasp pressure compounds it. Appears in Today's Homeowner best-pest-control roundups (Rifle/Clifton/Fruita). No review trigger as of 2026-09-14.")
upd("Mr Patch Drywall LLC",
    intel_updated="2026-09-14",
    last_signal="2026-09-14 market intel: PatchMaster national drywall franchise opened Grand Junction 2026-08-31 (EIN Presswire), serving the whole Western Slope. Direct competitive entry into Mr Patch's niche and town. No review trigger.",
    notes="Guy Purcella, Grand Junction drywall repair / popcorn ceiling removal, 40+ years, Google Sites website (weak), photo-based email quotes, accepting a limited number of jobs in 2026 (capacity constraint, own site). PatchMaster franchise entry 2026-08-31 is competitive pressure, not a prospect (franchise). AEO: WEAK.")

# --- 3. promote 5 (strongest verified: Monument WARM + 4 KNOWN-ownership WATCH) ---
PROMOTE = {"Monument Garage Door", "Rescue 1 Plumbing",
           "Griffith Plumbing/Mechanical Services LLC",
           "Binkley & Mapes Roofing LLC", "Kruger Roofing"}
added = 0
for path in (META_ADD, RES_ADD):
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line: continue
            r = json.loads(line)
            if r["business_name"] in PROMOTE:
                if r["business_name"] in by_name:
                    print(f"WARN: duplicate {r['business_name']}, skipping", file=sys.stderr)
                    continue
                rows.append(r); by_name[r["business_name"]] = r; added += 1
print(f"promoted {added} rows", file=sys.stderr)
assert added == 5, f"expected 5 promoted, got {added}"

# --- 4. validate all ---
bad = 0
for r in rows:
    errs = validate(r)
    if errs:
        bad += 1
        print(f"INVALID {r.get('business_name')}: {errs}", file=sys.stderr)
if bad:
    print(f"{bad} invalid rows, aborting", file=sys.stderr); sys.exit(1)

# --- 5. atomic write ---
tmp = JSONL + ".tmp"
with open(tmp, "w", encoding="utf-8") as f:
    for r in rows:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")
with open(tmp, encoding="utf-8") as f:
    check = [json.loads(l) for l in f if l.strip()]
assert len(check) == len(rows), "line count mismatch"
for name in PROMOTE:
    assert any(r["business_name"] == name for r in check), f"missing {name}"
for name in ARCHIVE_NAMES:
    assert not any(r["business_name"] == name for r in check), f"still present {name}"
os.replace(tmp, JSONL)
active = sum(1 for r in check if r.get("priority_state") != "SUPPRESS")
print(f"OK: {len(check)} rows written, {active} active", file=sys.stderr)
