#!/usr/bin/env python3
"""Lane B2: bounded Jev shadow sampling via the connected custom.typesafe credential.

Skill-documented flow only (api_call with credential surrogate). Zero authority,
zero execution effect, zero policy effect. Outputs never written to any canonical
record. Budget: ~41 main + ~35 stability + 5 evidence-sensitivity calls.
Writes raw/jev-samples.json.
"""
import json, os, sys, time

sys.path.insert(0, os.path.expanduser("~/workspace/skills/skill-creator/bin"))
sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
from api_call import api_call, ApiRequestError

LANE = os.path.expanduser("~/workspace/ping-24h/lanes/laneB2-processor-tournament")
RAW = os.path.join(LANE, "raw")
HOST = "api.typesafe.ai"
CRED = "custom.typesafe"
BASE = "https://%s/v1" % HOST

with open(os.path.join(RAW, "cases-with-baselines.json")) as f:
    records = json.load(f)["records"]
by_id = {r["id"]: r for r in records}

def call(state, question, timeout=30):
    payload = {"model": "jev-latest",
               "state": state,
               "questions": {"q": {"type": "noul", "instructions": question}}}
    data = json.dumps(payload).encode()
    t0 = time.perf_counter()
    try:
        status, ans = api_call("POST", BASE + "/systemone", data=data,
                               credential=CRED, allowed_hosts=[HOST],
                               extra_headers={"Content-Type": "application/json"},
                               timeout=timeout)
        ms = (time.perf_counter() - t0) * 1000
        p, conf = None, None
        if status == 200 and isinstance(ans, dict):
            q = (ans.get("answers") or {}).get("q") or {}
            p, conf = q.get("noul"), q.get("confidence")
        return {"http": status, "p": p, "confidence": conf, "latency_ms": round(ms, 1), "error": None}
    except ApiRequestError as e:
        ms = (time.perf_counter() - t0) * 1000
        return {"http": e.status, "p": None, "confidence": None,
                "latency_ms": round(ms, 1), "error": "ApiRequestError %s" % e.status}
    except Exception as e:
        ms = (time.perf_counter() - t0) * 1000
        return {"http": None, "p": None, "confidence": None,
                "latency_ms": round(ms, 1), "error": type(e).__name__}

def state_for(rec):
    return {
        "contract": rec["contract"],
        "contract_version": rec["contract"].split("/")[-1],
        "shadow_mode": True,
        "input_facts": rec["input"],
        "evidence_refs": {"input_digest": rec["input_digest"], "evidence_digest": rec["evidence_digest"]},
        "evidence_summary": rec["evidence"],
    }

samples = []
main_ids = [r["id"] for r in records if r.get("jev_shadow_planned")]
print("main sample ids:", len(main_ids))
for i, cid in enumerate(main_ids):
    rec = by_id[cid]
    res = call(state_for(rec), rec["jev_question"])
    samples.append({"id": cid, "contract": rec["contract"], "kind": "main",
                    "question": rec["jev_question"], **res,
                    "baseline_output": rec["baseline_output"]})
    print(i + 1, cid, res["http"], res["p"], res["latency_ms"], res["error"])

# stability repeats (same input, repeated calls)
for cid, reps in [("AW-01", 10), ("CR-01", 10), ("RG-03", 5), ("GV-01", 5), ("EG-06", 5)]:
    rec = by_id[cid]
    for k in range(reps):
        res = call(state_for(rec), rec["jev_question"])
        samples.append({"id": cid, "contract": rec["contract"], "kind": "stability",
                        "rep": k + 1, **res, "baseline_output": rec["baseline_output"]})
    print("stability", cid, "done")

# evidence sensitivity: perturb one evidence element, measure output change
sens = []
# 1. AW: flip codex blockedUntil far-future (AW-08) vs expired (AW-07) — reuse existing pair
r8, r7 = by_id["AW-08"], by_id["AW-07"]
for rep, base in (("blocked", r8), ("expired", r7)):
    res = call(state_for(base), base["jev_question"])
    samples.append({"id": base["id"], "contract": base["contract"], "kind": "evidence_sensitivity",
                    "perturb": "codex.blockedUntil=%s" % rep, **res, "baseline_output": base["baseline_output"]})
    sens.append((base["id"], rep, res["p"]))
# 2. GV: flip isSite true->false on GV-01 shape
g1 = dict(by_id["GV-01"])
g1s = {"contract": g1["contract"], "input": {"viewerId": "u1", "controllerId": "u1", "isSite": False},
       "input_digest": "sens-flip", "evidence_digest": "sens-flip", "evidence": g1["evidence"],
       "baseline_output": ["object.reference"]}
res = call({"contract": g1["contract"], "contract_version": "v1", "shadow_mode": True,
            "input_facts": g1s["input"], "evidence_refs": {}, "evidence_summary": g1["evidence"]},
           by_id["GV-01"]["jev_question"])
samples.append({"id": "GV-01b", "contract": g1["contract"], "kind": "evidence_sensitivity",
                "perturb": "isSite true->false", **res, "baseline_output": g1s["baseline_output"]})
sens.append(("GV-01b", "isSite=false", res["p"]))
# 3. RG: uncertain latest (RG-03) vs completed latest (RG-07)
for cid in ("RG-03", "RG-07"):
    rec = by_id[cid]
    res = call(state_for(rec), rec["jev_question"])
    samples.append({"id": cid, "contract": rec["contract"], "kind": "evidence_sensitivity",
                    "perturb": "latest attempt uncertain vs completed", **res, "baseline_output": rec["baseline_output"]})
    sens.append((cid, "rg-evidence", res["p"]))
print("sensitivity:", sens)

n_ok = sum(1 for s in samples if s["http"] == 200 and s["p"] is not None)
print("samples:", len(samples), "ok:", n_ok)
with open(os.path.join(RAW, "jev-samples.json"), "w") as f:
    json.dump({"generated_at": "2026-09-28T15:0x MDT lane B2", "provider": "typesafe/jev-latest",
               "status": "SHADOW_ONLY_ZERO_AUTHORITY", "n": len(samples), "samples": samples}, f, indent=1)
