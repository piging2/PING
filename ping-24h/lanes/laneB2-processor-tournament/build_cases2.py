#!/usr/bin/env python3
"""Lane B2: build EG (engagement guard) and GR (grill-20) cases, append to cases.json."""
import json, os, importlib.util, hashlib

LANE = os.path.expanduser("~/workspace/ping-24h/lanes/laneB2-processor-tournament")
RAW = os.path.join(LANE, "raw")

spec = importlib.util.spec_from_file_location("eg", os.path.expanduser("~/workspace/outreach/engagement-guard.py"))
g = importlib.util.module_from_spec(spec); spec.loader.exec_module(g)
idx = g.load_index()
fb = idx["platforms"]["facebook"]; ig = idx["platforms"]["instagram"]; x = idx["platforms"]["x"]

def digest(o): return hashlib.sha256(json.dumps(o, sort_keys=True).encode()).hexdigest()[:16]

evidence_envelope = {
    "facebook": {"log_sha256": fb["log_sha256"], "names_n": len(fb["names"]), "post_ids_n": len(fb["post_ids"])},
    "instagram": {"log_sha256": ig["log_sha256"], "handles_n": len(ig["handles"])},
    "x": {"log_sha256": x["log_sha256"], "handles_n": len(x["handles"])},
    "ledger": "action-intent-ledger.jsonl merged at every load_index via _fb_ledger_engaged_post_ids (terminal-aware)",
}

# pick real engaged facts from the index
eng_name1 = sorted(fb["names"])[3] if len(fb["names"]) > 3 else sorted(fb["names"])[0]
eng_name2 = sorted(fb["names"])[10] if len(fb["names"]) > 10 else sorted(fb["names"])[1]
eng_ig = sorted(ig["handles"])[2]
eng_x = sorted(x["handles"])[1]
eng_post = sorted(fb["post_ids"])[0]  # like 'post:100001909343220'
eng_post_num = eng_post.split(":", 1)[1]
eng_url = "https://www.facebook.com/watch/?v=%s" % eng_post_num

Q_EG = "What is the probability (0 to 1) that the correct guard verdict for this candidate is ELIGIBLE rather than drop (ALREADY_ENGAGED or BLOCKED)?"
EVID_EG = {"rules": "check() vs durable history index: engaged handle/name/post-id -> ALREADY_ENGAGED; fuzzy/token-subset near-miss -> BLOCKED; empty identity -> UNKNOWN-UNCHECKABLE; else ELIGIBLE. Final-label source = the index+ledger history itself.",
           "index_envelope": evidence_envelope}

cases = []
def add(contract, cid, inp, evidence, muse_shadow, jev=False, jev_question=None):
    cases.append({"contract": contract, "id": cid, "input": inp, "evidence": evidence,
                  "muse_shadow": muse_shadow, "jev_shadow": jev, "jev_question": jev_question})

add("engagementGuard/v1", "EG-01", {"platform": "facebook", "account": eng_name1, "url": None}, dict(EVID_EG), "DROP", True, Q_EG)
add("engagementGuard/v1", "EG-02", {"platform": "facebook", "account": eng_name2, "url": None}, dict(EVID_EG), "DROP", True, Q_EG)
add("engagementGuard/v1", "EG-03", {"platform": "instagram", "account": eng_ig, "url": None}, dict(EVID_EG), "DROP", True, Q_EG)
add("engagementGuard/v1", "EG-04", {"platform": "x", "account": eng_x, "url": None}, dict(EVID_EG), "DROP", True, Q_EG)
add("engagementGuard/v1", "EG-05", {"platform": "facebook", "account": None, "url": eng_url}, dict(EVID_EG), "DROP", True, Q_EG)
add("engagementGuard/v1", "EG-06", {"platform": "facebook", "account": "brand new shop grand junction co", "url": None}, dict(EVID_EG), "ELIGIBLE", True, Q_EG)
add("engagementGuard/v1", "EG-07", {"platform": "instagram", "account": "zzznotarealhandle999", "url": None}, dict(EVID_EG), "ELIGIBLE", False, Q_EG)
add("engagementGuard/v1", "EG-08", {"platform": "facebook", "account": None, "url": "https://www.facebook.com/watch/?v=999999999999999"}, dict(EVID_EG), "ELIGIBLE", False, Q_EG)
add("engagementGuard/v1", "EG-09", {"platform": "facebook", "account": None, "url": None}, dict(EVID_EG), "ABSTAIN", False, None)
fuzzy_name = eng_name1 + "s"  # near-miss of an engaged name -> BLOCKED expected
add("engagementGuard/v1", "EG-10", {"platform": "facebook", "account": fuzzy_name, "url": None}, dict(EVID_EG), "DROP", False, None)

# --- GR: grill-20 verdict composition replay of the full escalation log ---
Q_GR = "What is the probability (0 to 1) that the correct verdict composition for these check answers is decide rather than escalate?"
log_path = os.path.expanduser("~/workspace/fyd-autonomy/escalation-log.jsonl")
gr_cases = []
dec = json.JSONDecoder()
with open(log_path) as f:
    for i, line in enumerate(f, 1):
        line = line.strip()
        if not line: continue
        objs = []
        rest = line
        line_anomalies = []
        while rest.strip():
            try:
                obj, idx2 = dec.raw_decode(rest)
                objs.append(obj); rest = rest[idx2:]
            except Exception as e:
                line_anomalies.append("unparseable remainder on line %d: %s" % (i, str(e)[:80]))
                rest = ""
        if len(objs) > 1:
            line_anomalies.append("line %d holds %d concatenated JSON objects (malformed JSONL)" % (i, len(objs)))
        for oi, d in enumerate(objs):
            checks = d.get("checks"); fc = d.get("failed_checks"); verdict = d.get("verdict")
        # schema notes
        anomalies = list(line_anomalies)
        if not isinstance(checks, dict): anomalies.append("checks not a dict")
        if isinstance(fc, list) and fc and isinstance(fc[0], dict): anomalies.append("failed_checks items are objects, not strings")
        if verdict not in ("decide", "escalate"): anomalies.append("verdict not decide|escalate: %r" % verdict)
        ev_map = d.get("check_evidence")
        missing_ev = []
        if isinstance(checks, dict) and isinstance(ev_map, dict):
            for k in checks:
                if not ev_map.get(k): missing_ev.append(k)
        if missing_ev: anomalies.append("checks missing evidence: %s" % ",".join(missing_ev))
        # template composition: decide iff failed_checks empty
        composed = "decide" if (isinstance(fc, list) and len(fc) == 0) else "escalate"
        # my pre-registered judgment = the template composition (recorded before baseline run)
        gr_cases.append({
            "contract": "grill20Composition/v1", "id": "GR-%02d%s" % (i, ("o%d" % (oi + 1)) if len(objs) > 1 else ""),
            "input": {"question": d.get("question"), "checks": checks, "failed_checks": fc,
                      "recommended_default": d.get("recommended_default"), "cost_of_being_wrong": d.get("cost_of_being_wrong")},
            "evidence": {"source": "fyd-autonomy/escalation-log.jsonl", "ts": d.get("ts"),
                         "composition_rule": "template SI-03: verdict=decide requires failed_checks==[]; verdict=escalate requires failed_checks non-empty (+ cost_of_being_wrong non-empty)",
                         "recorded_verdict": verdict, "schema_anomalies": anomalies},
            "muse_shadow": composed,
            "jev_shadow": len(gr_cases) < 6, "jev_question": Q_GR if len(gr_cases) < 6 else None,
        })
cases.extend(gr_cases)

# sanity-run the guard on the EG cases now (baseline pre-check, results merged later by the runner)
for c in cases:
    if c["contract"] != "engagementGuard/v1": continue
    v, reason = g.check(idx, c["input"]["platform"], account=c["input"]["account"], url=c["input"]["url"])
    c["_precheck"] = {"verdict": v, "reason": reason}

with open(os.path.join(RAW, "cases-eg-gr.json"), "w") as f:
    json.dump({"cases": cases}, f, indent=1)
print("eg+gr cases:", len(cases))
for c in cases:
    if c["contract"] == "engagementGuard/v1":
        print(c["id"], c["input"], "->", c["_precheck"]["verdict"], "| muse:", c["muse_shadow"])
