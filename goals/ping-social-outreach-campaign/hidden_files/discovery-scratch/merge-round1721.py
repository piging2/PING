#!/usr/bin/env python3
"""Validate + merge round1721 segment rows into segment-round1721.jsonl."""
import json, sys, os, unicodedata

SCRATCH = os.path.expanduser("~/workspace/goals/ping-social-outreach-campaign/hidden_files/discovery-scratch")
SCHEMA_FIELDS = ["email","business_name","owner_name","phone","website","trade","city","state",
"region","source","revamp_candidate","notes","intel_updated","website_quality","booking_mechanism",
"missed_call_risk","social_presence","review_velocity","notable_reviews","new_filing_signal",
"stack_signals","opportunity_primary","opportunity_secondary","opportunity_evidence",
"opportunity_confidence","ai_discoverability","priority_state","last_signal","suppression_state",
"next_eligible_action","conversion_state","converted_at","conversion_evidence"]

def norm(s):
    return unicodedata.normalize("NFKD", s).encode("ascii","ignore").decode().lower().strip()

dedupe = set()
for f in ("dedupe-jsonl.txt","dedupe-leads.txt","dedupe-pipeline.txt","dedupe-fbdm.txt"):
    p = os.path.join(SCRATCH, f)
    if os.path.exists(p):
        with open(p) as fh:
            for line in fh:
                if line.strip(): dedupe.add(norm(line.strip()))

rows, errors, seen = [], [], set()
for src in ("segment-round1721-chimney.jsonl","segment-round1721-carpet.jsonl"):
    p = os.path.join(SCRATCH, src)
    if not os.path.exists(p):
        errors.append(f"MISSING {src}"); continue
    with open(p) as fh:
        for i, line in enumerate(fh, 1):
            line = line.strip()
            if not line: continue
            try:
                r = json.loads(line)
            except Exception as e:
                errors.append(f"{src}:{i} JSON parse: {e}"); continue
            if list(r.keys()) != SCHEMA_FIELDS:
                errors.append(f"{src}:{i} field order/keys mismatch: {list(r.keys())[:5]}...")
                continue
            if not r["business_name"].strip():
                errors.append(f"{src}:{i} empty business_name"); continue
            n = norm(r["business_name"])
            if n in dedupe:
                errors.append(f"{src}:{i} DUPLICATE of existing: {r['business_name']}")
            if n in seen:
                errors.append(f"{src}:{i} intra-run duplicate: {r['business_name']}")
            seen.add(n)
            rows.append(r)

tmp = os.path.join(SCRATCH, "segment-round1721.jsonl.tmp")
out = os.path.join(SCRATCH, "segment-round1721.jsonl")
if errors:
    print("ERRORS:")
    for e in errors: print(" -", e)
    print(f"{len(rows)} rows parsed, not merged until errors fixed.")
    sys.exit(1)
with open(tmp, "w") as fh:
    for r in rows:
        fh.write(json.dumps(r, ensure_ascii=False) + "\n")
os.replace(tmp, out)
print(f"MERGED OK: {len(rows)} rows -> {out}")
print("chimney:", sum(1 for r in rows if "chimney" in r["trade"] or "fireplace" in r["trade"] or "stove" in r["trade"]))
print("carpet:", sum(1 for r in rows if "carpet" in r["trade"] or "upholstery" in r["trade"] or "rug" in r["trade"]))
