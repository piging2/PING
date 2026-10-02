#!/usr/bin/env python3
"""Lane B2 follow-up: EG Jev re-run WITH the decisive ledger fact disclosed.

The main-run EG envelope carried index counts/digests but not per-case
membership, an evidence asymmetry vs the deterministic guard. This probe
tests rule-following once the decisive fact is present. 6 calls, kind=evidence_sensitivity.
"""
import json, os, sys, time
sys.path.insert(0, os.path.expanduser("~/workspace/skills/skill-creator/bin"))
sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
from api_call import api_call, ApiRequestError

LANE = os.path.expanduser("~/workspace/ping-24h/lanes/laneB2-processor-tournament")
RAW = os.path.join(LANE, "raw")
HOST = "api.typesafe.ai"; CRED = "custom.typesafe"; BASE = "https://%s/v1" % HOST

with open(os.path.join(RAW, "cases-with-baselines.json")) as f:
    by_id = {r["id"]: r for r in json.load(f)["records"]}

def call(state, question, timeout=30):
    payload = {"model": "jev-latest", "state": state,
               "questions": {"q": {"type": "noul", "instructions": question}}}
    data = json.dumps(payload).encode()
    t0 = time.perf_counter()
    try:
        status, ans = api_call("POST", BASE + "/systemone", data=data, credential=CRED,
                               allowed_hosts=[HOST], extra_headers={"Content-Type": "application/json"},
                               timeout=timeout)
        ms = (time.perf_counter() - t0) * 1000
        p = None
        if status == 200 and isinstance(ans, dict):
            p = ((ans.get("answers") or {}).get("q") or {}).get("noul")
        return {"http": status, "p": p, "latency_ms": round(ms, 1), "error": None}
    except ApiRequestError as e:
        return {"http": e.status, "p": None, "latency_ms": round((time.perf_counter() - t0) * 1000, 1),
                "error": "ApiRequestError %s" % e.status}

facts = {
    "EG-01": "DECISIVE FACT: this facebook page name appears in the durable engagement history (engaged in a prior pass).",
    "EG-02": "DECISIVE FACT: this facebook page name appears in the durable engagement history (engaged in a prior pass).",
    "EG-03": "DECISIVE FACT: this instagram handle appears in the durable engagement history (engaged in a prior pass).",
    "EG-04": "DECISIVE FACT: this x handle appears in the durable engagement history (engaged in a prior pass).",
    "EG-05": "DECISIVE FACT: this facebook post id appears in the durable engagement history (engaged in a prior pass, ledger-merged).",
    "EG-06": "DECISIVE FACT: no record of this candidate in the durable engagement history or the intent ledger.",
}
out = []
for cid, fact in facts.items():
    rec = by_id[cid]
    state = {"contract": rec["contract"], "contract_version": "v1", "shadow_mode": True,
             "input_facts": rec["input"],
             "decisive_ledger_fact": fact,
             "rule": "engaged in durable history -> ALREADY_ENGAGED (drop); no record -> ELIGIBLE"}
    res = call(state, rec["jev_question"])
    out.append({"id": cid, "contract": rec["contract"], "kind": "evidence_sensitivity",
                "perturb": "decisive ledger-membership fact disclosed", "question": rec["jev_question"],
                "baseline_output": rec["baseline_output"], **res})
    print(cid, res["http"], res["p"], res["latency_ms"])

with open(os.path.join(RAW, "jev-eg-fair.json"), "w") as f:
    json.dump({"n": len(out), "samples": out}, f, indent=1)
