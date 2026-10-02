#!/usr/bin/env python3
"""Validate research-scratch JSONL against the 33-field canonical schema + enums."""
import json, sys

FIELD_ORDER = ["business_name","email","owner_name","phone","website","trade","city",
"state","region","source","revamp_candidate","notes","intel_updated","website_quality",
"booking_mechanism","missed_call_risk","social_presence","review_velocity",
"notable_reviews","new_filing_signal","stack_signals","opportunity_primary",
"opportunity_secondary","opportunity_evidence","opportunity_confidence",
"ai_discoverability","priority_state","last_signal","suppression_state",
"next_eligible_action","conversion_state","converted_at","conversion_evidence"]

ENUMS = {
  "priority_state": {"HOT","WARM","WATCH","SUPPRESS"},
  "opportunity_primary": {"NEW_BUSINESS_SETUP","MISSED_CALL_LEAD_CAPTURE","WEBSITE_REVAMP",
      "SEO","AEO_AI_DISCOVERABILITY","SOCIAL_PRESENCE","AUTOMATION","INTEGRATION","UNKNOWN"},
  "opportunity_secondary": {"","NEW_BUSINESS_SETUP","MISSED_CALL_LEAD_CAPTURE","WEBSITE_REVAMP",
      "SEO","AEO_AI_DISCOVERABILITY","SOCIAL_PRESENCE","AUTOMATION","INTEGRATION","UNKNOWN"},
  "opportunity_confidence": {"high","medium","low",""},
  "ai_discoverability": {"strong","moderate","weak","unknown",""},
  "missed_call_risk": {"high","medium","low","unknown",""},
  "website_quality": {"strong","moderate","weak","unknown",""},
  "revamp_candidate": {"yes","no",""},
  "state": {"CO",""},
  "region": {"Western Colorado",""},
}

def main(path):
    errors = []
    n = 0
    names = []
    for i, line in enumerate(open(path), 1):
        line = line.strip()
        if not line:
            errors.append(f"line {i}: blank line")
            continue
        n += 1
        try:
            d = json.loads(line)
        except Exception as e:
            errors.append(f"line {i}: bad JSON: {e}")
            continue
        keys = list(d.keys())
        if keys != FIELD_ORDER:
            missing = [k for k in FIELD_ORDER if k not in keys]
            extra = [k for k in keys if k not in FIELD_ORDER]
            misordered = keys != FIELD_ORDER and not missing and not extra
            errors.append(f"line {i}: key order/fields wrong "
                          f"(missing={missing}, extra={extra}, misordered={misordered})")
        for k, legal in ENUMS.items():
            v = d.get(k, "")
            if v not in legal:
                errors.append(f"line {i}: field {k} illegal value {v!r}")
        if not d.get("business_name"):
            errors.append(f"line {i}: empty business_name")
        if not d.get("email") and "form" not in (d.get("booking_mechanism") or "").lower():
            errors.append(f"line {i}: empty email with no contact-form booking route")
        names.append(d.get("business_name","").lower())
    dups = {x for x in names if names.count(x) > 1}
    if dups:
        errors.append(f"duplicate business_name values: {sorted(dups)}")
    print(f"rows={n} errors={len(errors)}")
    for e in errors[:50]:
        print("ERR:", e)
    return 1 if errors else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
