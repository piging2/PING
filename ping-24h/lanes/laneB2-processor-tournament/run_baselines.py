#!/usr/bin/env python3
"""Lane B2: execute deterministic baselines for all 7 tournament contracts.
READ ONLY against production. Reconcile-gate uses fresh tmp dirs only.
Engagement guard reads the real index+ledger (read-only).
Writes raw/cases-with-baselines.json.
"""
import json, os, subprocess, importlib.util, hashlib, time

LANE = os.path.expanduser("~/workspace/ping-24h/lanes/laneB2-processor-tournament")
RAW = os.path.join(LANE, "raw")
BASELINE_AT = "2026-09-28T14:5x MDT (lane B2 run)"

with open(os.path.join(RAW, "cases.json")) as f:
    cases = json.load(f)["cases"]
with open(os.path.join(RAW, "cases-eg-gr.json")) as f:
    cases += json.load(f)["cases"]

NODE_CONTRACTS = {"mc.authorize_work_order/v1", "grantsForViewer/v1", "planActions/v1",
                  "classifyReview/v1", "reconcileGate/v1"}
node_cases = [c for c in cases if c["contract"] in NODE_CONTRACTS]

t0 = time.time()
p = subprocess.run(["node", os.path.join(LANE, "baselines.cjs")],
                   input=json.dumps(node_cases).encode(), capture_output=True, timeout=300)
node_wall = time.time() - t0
if p.returncode != 0:
    raise SystemExit("baselines.cjs failed: " + p.stderr.decode()[:2000])
node_results = {r["id"]: r for r in json.loads(p.stdout.decode())}

# EG baseline: fresh read-only index load
spec = importlib.util.spec_from_file_location("eg", os.path.expanduser("~/workspace/outreach/engagement-guard.py"))
eg = importlib.util.module_from_spec(spec); spec.loader.exec_module(eg)
idx = eg.load_index()

records = []
for c in cases:
    rec = {"id": c["id"], "contract": c["contract"], "input": c["input"],
           "evidence": c["evidence"], "muse_shadow": c["muse_shadow"],
           "jev_shadow_planned": c.get("jev_shadow", False), "jev_question": c.get("jev_question"),
           "baseline_at": BASELINE_AT}
    if "overrides" in c:
        rec["input_overrides"] = c["overrides"]
    if c["contract"] in NODE_CONTRACTS:
        r = node_results[c["id"]]
        rec["baseline_output"] = r["output"]
        rec["baseline_detail"] = r["detail"]
        rec["baseline_reason"] = r["reason"]
        rec["baseline_extra"] = r["extra"]
        rec["baseline_ms"] = r["baseline_ms"]
        rec["input_digest"] = r["input_digest"]
        rec["evidence_digest"] = r["evidence_digest"]
        rec["baseline_error"] = r["error"]
        rec["baseline_identity"] = "deterministic function executed read-only (local mirrors; see evidence.source)"
    elif c["contract"] == "engagementGuard/v1":
        t = time.perf_counter()
        verdict, reason = eg.check(idx, c["input"]["platform"], account=c["input"]["account"], url=c["input"]["url"])
        ms = (time.perf_counter() - t) * 1000
        rec["baseline_output"] = verdict
        rec["baseline_detail"] = None
        rec["baseline_reason"] = reason
        rec["baseline_extra"] = {}
        rec["baseline_ms"] = round(ms, 3)
        rec["input_digest"] = hashlib.sha256(json.dumps(c["input"], sort_keys=True).encode()).hexdigest()[:16]
        rec["evidence_digest"] = hashlib.sha256(json.dumps(c["evidence"], sort_keys=True).encode()).hexdigest()[:16]
        rec["baseline_error"] = None
        rec["baseline_identity"] = "engagement-guard.py check() vs live index+ledger (read-only)"
    elif c["contract"] == "grill20Composition/v1":
        fc = c["input"]["failed_checks"]
        composed = "decide" if (isinstance(fc, list) and len(fc) == 0) else "escalate"
        recorded = c["evidence"]["recorded_verdict"]
        rec["baseline_output"] = composed
        rec["baseline_detail"] = {"recorded_verdict": recorded, "match": composed == recorded,
                                  "schema_anomalies": c["evidence"]["schema_anomalies"]}
        rec["baseline_reason"] = None
        rec["baseline_extra"] = {}
        rec["baseline_ms"] = 0.01
        rec["input_digest"] = hashlib.sha256(json.dumps(c["input"], sort_keys=True).encode()).hexdigest()[:16]
        rec["evidence_digest"] = hashlib.sha256(json.dumps(c["evidence"], sort_keys=True).encode()).hexdigest()[:16]
        rec["baseline_error"] = None
        rec["baseline_identity"] = "SI-03 template composition rule applied to the logged record (deterministic)"
    # muse agreement vs baseline (same operator/model family: NOT independent evidence)
    bo, mo = rec.get("baseline_output"), rec.get("muse_shadow")
    if c["contract"] == "planActions/v1" and isinstance(bo, dict):
        bo = bo.get("capabilities")
    rec["muse_shadow_agreement"] = (bo == mo) if bo is not None else None
    records.append(rec)

n_err = sum(1 for r in records if r["baseline_error"])
print("records:", len(records), "baseline errors:", n_err, "node wall s:", round(node_wall, 1))
for r in records:
    if r["baseline_error"]:
        print("ERR", r["id"], r["baseline_error"][:120])

with open(os.path.join(RAW, "cases-with-baselines.json"), "w") as f:
    json.dump({"baseline_at": BASELINE_AT, "n": len(records),
               "node_contracts_wall_s": round(node_wall, 2), "records": records}, f, indent=1)
