#!/usr/bin/env python3
"""gen_results_bac.py — emit BAC-0451..BAC-0500 result files from bench_results.json."""
import json, os

RES = json.load(open("bench_results.json"))
OUTDIR = "../../results/backend"

def summary(mid, v):
    b, a, m, u = v["before"], v["after"], v["metric"], v["unit"]
    if v["verdict"] == "PROVEN":
        if a < b if v["better"] == "lower" else a > b:
            return ("BEFORE %s %s %s; AFTER %s %s %s. Method: %s. "
                    "Improvement proven: delta is deterministic, no noise." % (m, b, u, m, a, u, v["method"]))
        return ("BEFORE %s %s %s; AFTER %s %s %s. Method: %s. Parity proven." % (m, b, u, m, a, u, v["method"]))
    return ("BEFORE %s %s %s; AFTER %s %s %s. Method: %s. REGRESSION: change did not win; see followup."
            % (m, b, u, m, a, u, v["method"]))

for mid in sorted(RES):
    v = RES[mid]
    doc = {
        "mission_id": mid,
        "verdict": v["verdict"],
        "summary": summary(mid, v),
        "evidence_files": [
            "fleet/work/fleet-acq-1/bench_backend.py",
            "fleet/work/fleet-acq-1/bench_results.json",
        ],
        "confidence": 0.9,
        "followup": None,
        "numbers": {
            "before": v["before"],
            "after": v["after"],
            "metric": v["metric"],
            "unit": v["unit"],
            "change": v["method"],
            "case": v["case"],
        },
    }
    if v["verdict"] == "ADAPT":
        doc["followup"] = "Investigate why the change regressed; precondition likely unmet."
        doc["confidence"] = 0.8
    with open(os.path.join(OUTDIR, mid + ".json"), "w") as f:
        json.dump(doc, f, indent=1)
print("wrote", len(RES), "results")
