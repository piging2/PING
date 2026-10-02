#!/usr/bin/env python3
"""Assemble round-40 research candidates into a validated staging JSONL.
Inputs: ~/workspace/outreach/round40-candidates-painting.json,
        ~/workspace/outreach/round40-candidates-irrigation.json
Dedup:  ~/workspace/outreach/dedup-names-round40.txt
Output: ~/workspace/outreach/jsonl-additions-round40-research.jsonl (30 schema fields)
        ~/workspace/outreach/research-round40.md (markdown list)
Validates enums/patterns against prospect-schema.json. Does NOT touch canonical JSONL."""
import json, re, sys, os

W = os.path.expanduser("~/workspace/outreach")
FIELDS = ["business_name","email","owner_name","phone","website","trade","city","state","region",
 "source","revamp_candidate","notes","intel_updated","website_quality","booking_mechanism",
 "missed_call_risk","social_presence","review_velocity","notable_reviews","new_filing_signal",
 "stack_signals","opportunity_primary","opportunity_secondary","opportunity_evidence",
 "opportunity_confidence","ai_discoverability","priority_state","last_signal","suppression_state",
 "next_eligible_action"]

ENUMS = {
 "ai_discoverability": {"strong","moderate","weak","unknown",""},
 "missed_call_risk": {"high","medium","low","unknown",""},
 "opportunity_confidence": {"high","medium","low",""},
 "opportunity_primary": {"NEW_BUSINESS_SETUP","MISSED_CALL_LEAD_CAPTURE","WEBSITE_REVAMP","SEO",
   "AEO_AI_DISCOVERABILITY","SOCIAL_PRESENCE","AUTOMATION","INTEGRATION","UNKNOWN",""},
 "opportunity_secondary": {"NEW_BUSINESS_SETUP","MISSED_CALL_LEAD_CAPTURE","WEBSITE_REVAMP","SEO",
   "AEO_AI_DISCOVERABILITY","SOCIAL_PRESENCE","AUTOMATION","INTEGRATION","UNKNOWN",""},
 "priority_state": {"HOT","WARM","WATCH","SUPPRESS",""},
 "revamp_candidate": {"yes","no",""},
 "website_quality": {"strong","moderate","weak","unknown",""},
}
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

def norm(s):
    s = (s or "").strip().lower()
    s = re.sub(r"\s+(llc|inc|co|ltd|corp|company|services|service)\.?$", "", s)
    return re.sub(r"\s+", " ", s)

def main():
    cands = []
    for fn in ["round40-candidates-painting.json", "round40-candidates-irrigation.json"]:
        p = os.path.join(W, fn)
        if os.path.exists(p):
            cands += json.load(open(p))
        else:
            print(f"missing input {fn}, continuing", file=sys.stderr)
    dedup = set(l.strip() for l in open(os.path.join(W, "dedup-names-round40.txt")) if l.strip())
    dedup_norm = {norm(x) for x in dedup}
    rows, md, skipped = [], [], 0
    for c in cands:
        name = (c.get("business_name") or "").strip()
        if not name:
            print("SKIP: empty business_name", file=sys.stderr); skipped += 1; continue
        key = norm(name)
        if key in dedup_norm:
            print(f"DUP-SKIP: {name}", file=sys.stderr); skipped += 1; continue
        dedup_norm.add(key)
        nf = (c.get("new_filing_signal") or "").strip()
        if nf and not DATE.match(nf):
            print(f"BAD-DATE-SKIP: {name} new_filing_signal={nf!r}", file=sys.stderr); skipped += 1; continue
        row = {
            "business_name": name,
            "email": (c.get("email") or "").strip(),
            "owner_name": (c.get("owner_name") or "").strip(),
            "phone": (c.get("phone") or "").strip(),
            "website": (c.get("website") or "").strip(),
            "trade": (c.get("trade") or "").strip(),
            "city": (c.get("city") or "").strip(),
            "state": "CO",
            "region": "Western Colorado",
            "source": "new-filing" if nf else "research",
            "revamp_candidate": (c.get("revamp_candidate") or "").strip(),
            "notes": ("source=new-filing. " if nf else "") + (c.get("notes") or "").strip(),
            "intel_updated": "2026-09-13",
            "website_quality": (c.get("website_quality") or "").strip(),
            "booking_mechanism": (c.get("booking_mechanism") or "").strip(),
            "missed_call_risk": (c.get("missed_call_risk") or "unknown").strip(),
            "social_presence": (c.get("social_presence") or "").strip(),
            "review_velocity": (c.get("review_velocity") or "").strip(),
            "notable_reviews": (c.get("notable_reviews") or "").strip(),
            "new_filing_signal": nf,
            "stack_signals": (c.get("stack_signals") or "UNKNOWN").strip(),
            "opportunity_primary": (c.get("opportunity_primary") or "UNKNOWN").strip(),
            "opportunity_secondary": (c.get("opportunity_secondary") or "").strip(),
            "opportunity_evidence": (c.get("opportunity_evidence") or "").strip(),
            "opportunity_confidence": (c.get("opportunity_confidence") or "low").strip(),
            "ai_discoverability": (c.get("ai_discoverability") or "unknown").strip(),
            "priority_state": (c.get("priority_state") or "WATCH").strip(),
            "last_signal": "2026-09-13 research round 40",
            "suppression_state": "none",
            "next_eligible_action": "draft email",
        }
        for f, allowed in ENUMS.items():
            if row[f] not in allowed:
                print(f"BAD-ENUM-SKIP: {name} {f}={row[f]!r}", file=sys.stderr); row = None; break
        if row is None: skipped += 1; continue
        assert set(row.keys()) == set(FIELDS), f"field mismatch on {name}"
        rows.append(row)
        md.append(f"- **{name}** | {row['trade']} | {row['city']} | {row['website'] or 'no site'} | phone {row['phone'] or 'n/a'} | email {row['email'] or 'n/a'} | {row['priority_state']} | {row['opportunity_primary']} ({row['opportunity_confidence']}) | site {row['website_quality']} | revamp {row['revamp_candidate'] or 'n/a'}{' | NEW FILING ' + nf if nf else ''}\n  - Evidence: {row['opportunity_evidence']}\n  - Stack: {row['stack_signals']} | Booking: {row['booking_mechanism'] or 'unknown'} | Social: {row['social_presence'] or 'unknown'}\n  - Notes: {row['notes']}")
    out = os.path.join(W, "jsonl-additions-round40-research.jsonl")
    with open(out + ".tmp", "w") as f:
        for r in rows:
            f.write(json.dumps(r) + "\n")
    lines = [l for l in open(out + ".tmp") if l.strip()]
    assert len(lines) == len(rows)
    for l in lines:
        o = json.loads(l); assert set(o.keys()) == set(FIELDS)
    os.replace(out + ".tmp", out)
    mdp = os.path.join(W, "research-round40.md")
    with open(mdp, "w") as f:
        f.write("# Round 40 research — painting + irrigation (Western Colorado, 2026-09-13)\n\n")
        f.write(f"{len(rows)} candidates staged in jsonl-additions-round40-research.jsonl. Canonical JSONL NOT touched (300-row cap).\n\n")
        f.write("\n".join(md) + "\n")
    print(f"wrote {len(rows)} rows -> {out} (skipped {skipped})")
    print(f"wrote markdown -> {mdp}")

main()
