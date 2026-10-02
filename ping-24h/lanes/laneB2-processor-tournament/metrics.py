#!/usr/bin/env python3
"""Lane B2: compute per-contract tournament metrics. Prints tables; writes raw/metrics.json."""
import json, os, statistics

LANE = os.path.expanduser("~/workspace/ping-24h/lanes/laneB2-processor-tournament")
RAW = os.path.join(LANE, "raw")

with open(os.path.join(RAW, "cases-with-baselines.json")) as f:
    records = json.load(f)["records"]
with open(os.path.join(RAW, "jev-samples.json")) as f:
    jev = json.load(f)["samples"]
by_id = {r["id"]: r for r in records}

# positive-class mapping per contract (for Brier / FP-FN bookkeeping)
POS = {
    "mc.authorize_work_order/v1": ("GRANT", "p_grant"),
    "grantsForViewer/v1": ("__maintain__", "p_maintain"),
    "planActions/v1": ("__includes_disc__", "p_includes"),
    "classifyReview/v1": ("positive", "p_positive"),
    "reconcileGate/v1": ("ALLOW", "p_allow"),
    "engagementGuard/v1": ("ELIGIBLE", "p_eligible"),
    "grill20Composition/v1": ("decide", "p_decide"),
}
DISC = {"PA-01": "like", "PA-02": "like", "PA-04": "propose_site_patch", "PA-05": "follow", "PA-06": "follow"}
COST = {
    "mc.authorize_work_order/v1": ("HIGH: false GRANT can issue a work order to an unauthorized/unavailable agent (C4, possible external effect; reversible via HOLD/reconcile)", "LOW-MODERATE: false DENY stalls a mission; operator retries"),
    "grantsForViewer/v1": ("LOW: false maintain-bundle offers propose actions; owner still approves exact digest", "LOW: degraded UX"),
    "planActions/v1": ("LOW: false affordance fails at use", "LOW: missing affordance"),
    "classifyReview/v1": ("MODERATE-HIGH: abusive/spam review auto-pathed as positive; reputational risk", "LOW: moderator labor"),
    "reconcileGate/v1": ("HIGH: false ALLOW re-dispatches duplicate/uncertain intent; possible double external effect", "LOW-MODERATE: false REFUSE stalls until reconciled"),
    "engagementGuard/v1": ("MODERATE: false ELIGIBLE re-engages an already-engaged post (platform spam risk)", "LOW: false drop loses one engagement opportunity"),
    "grill20Composition/v1": ("HIGH: false decide = autonomous action crossing owner authority", "LOW-MODERATE: false escalate interrupts the owner"),
}

def label_of(rec):
    c, bo = rec["contract"], rec["baseline_output"]
    if c == "grantsForViewer/v1":
        return 1 if "site.propose" in bo else 0
    if c == "planActions/v1":
        return 1 if DISC.get(rec["id"]) in (bo.get("capabilities") if isinstance(bo, dict) else []) else 0
    if c == "engagementGuard/v1":
        if bo == "ELIGIBLE": return 1
        if bo in ("ALREADY_ENGAGED", "BLOCKED"): return 0
        return None  # UNKNOWN-UNCHECKABLE: abstain
    if c == "grill20Composition/v1":
        return 1 if bo == "decide" else 0
    pos, _ = POS[c]
    return 1 if bo == pos else 0

def pct(x): return round(100 * x, 1)

main = [s for s in jev if s["kind"] == "main"]
contracts = sorted({r["contract"] for r in records})

out = {"contracts": {}, "notes": []}
for c in contracts:
    recs = [r for r in records if r["contract"] == c]
    js = [s for s in main if s["contract"] == c]
    # baseline stats
    lat_b = sorted(r["baseline_ms"] for r in recs if r["baseline_ms"] is not None)
    def q(p_, arr):
        if not arr: return None
        i = min(len(arr) - 1, int(p_ * len(arr)))
        return round(arr[i], 3)
    abst_b = sum(1 for r in recs if r["baseline_output"] is None or
                 (c == "engagementGuard/v1" and r["baseline_output"] == "UNKNOWN-UNCHECKABLE"))
    # jev stats
    ok = [s for s in js if s["p"] is not None]
    lat_j = sorted(s["latency_ms"] for s in ok)
    agree, brier_terms, fp, fn = 0, [], 0, 0
    disagreements = []
    for s in ok:
        rec = by_id[s["id"]]
        lab = label_of(rec)
        if lab is None: continue
        pred = 1 if s["p"] >= 0.5 else 0
        agree += (pred == lab)
        brier_terms.append((s["p"] - lab) ** 2)
        if pred == 1 and lab == 0: fp += 1; disagreements.append((s["id"], "FP", s["p"], rec["baseline_output"]))
        if pred == 0 and lab == 1: fn += 1; disagreements.append((s["id"], "FN", s["p"], rec["baseline_output"]))
    n_j = len(brier_terms)
    # stability
    stab = {}
    for cid in sorted({s["id"] for s in jev if s["kind"] == "stability"}):
        if by_id[cid]["contract"] != c: continue
        ps = [s["p"] for s in jev if s["kind"] == "stability" and s["id"] == cid and s["p"] is not None]
        if ps: stab[cid] = {"n": len(ps), "mean": round(statistics.mean(ps), 3),
                            "min": round(min(ps), 3), "max": round(max(ps), 3),
                            "range": round(max(ps) - min(ps), 3)}
    # muse-shadow agreement (NOT independent evidence; same operator/model family)
    def norm_muse(c_, mo):
        if c_ == "engagementGuard/v1":
            return {"DROP": "drop", "ELIGIBLE": "eligible", "ABSTAIN": "abstain"}.get(mo, mo)
        return mo
    def norm_base(c_, bo):
        if c_ == "engagementGuard/v1":
            if bo in ("ALREADY_ENGAGED", "BLOCKED"): return "drop"
            if bo == "ELIGIBLE": return "eligible"
            return "abstain"
        if c_ == "planActions/v1" and isinstance(bo, dict):
            return bo.get("capabilities")
        return bo
    ma = sum(1 for r in recs if norm_base(c, r["baseline_output"]) == norm_muse(c, r["muse_shadow"]))
    out["contracts"][c] = {
        "n_cases": len(recs),
        "baseline": {"judged": len(recs) - abst_b, "abstained": abst_b,
                     "abstention_typed": c == "engagementGuard/v1",
                     "latency_ms": {"p50": q(0.5, lat_b), "p95": q(0.95, lat_b)}},
        "jev": {"n_sampled": len(js), "n_scored": n_j,
                "agreement_at_0.5": {"agree": agree, "n": n_j, "pct": pct(agree / n_j) if n_j else None},
                "brier": round(sum(brier_terms) / n_j, 4) if n_j else None,
                "fp": fp, "fn": fn, "disagreements": disagreements,
                "latency_ms": {"p50": q(0.5, lat_j), "p95": q(0.95, lat_j)},
                "cost_per_call": "UNKNOWN (API does not report cost)"},
        "muse_shadow": {"agreement": ma, "n": len(recs), "pct": pct(ma / len(recs)),
                        "note": "same operator/model family as tournament runner; NOT independent evidence"},
        "fp_cost": COST[c][0], "fn_cost": COST[c][1],
        "stability": stab,
    }

with open(os.path.join(RAW, "metrics.json"), "w") as f:
    json.dump(out, f, indent=1)

# EG fair re-run: decisive ledger fact disclosed
try:
    with open(os.path.join(RAW, "jev-eg-fair.json")) as f:
        fair = json.load(f)["samples"]
    fa = sum(1 for s in fair if s["p"] is not None and
             ((s["p"] >= 0.5) == (s["baseline_output"] == "ELIGIBLE")))
    out["contracts"]["engagementGuard/v1"]["jev_fair"] = {
        "n": len(fair), "agree_at_0.5": fa,
        "brier": round(sum((s["p"] - (1 if s["baseline_output"] == "ELIGIBLE" else 0)) ** 2
                           for s in fair if s["p"] is not None) / len(fair), 4),
        "note": "same 6 cases re-run with the decisive per-case ledger-membership fact in state; main-run envelope carried only counts/digests (evidence asymmetry)",
    }
    with open(os.path.join(RAW, "metrics.json"), "w") as f:
        json.dump(out, f, indent=1)
except FileNotFoundError:
    pass

# baseline evidence-sensitivity summary (observed, not fitted)
out["evidence_sensitivity_baseline"] = {
    "mc.authorize_work_order/v1": "AW-08 (codex blockedUntil far-future) DENY vs AW-07 (expired) GRANT: output moves with the evidence flip",
    "grantsForViewer/v1": "GV-01 (isSite true) bundle granted vs GV-04 (isSite false) object.reference only: moves",
    "reconcileGate/v1": "RG-03 (latest attempt uncertain) REFUSE vs RG-07 (latest completed) ALLOW: moves",
    "engagementGuard/v1": "EG-05 ALREADY_ENGAGED -> ELIGIBLE when the single ledger post-id fact is removed from the in-memory index (on-disk index untouched)",
    "classifyReview/v1": "not probed (lexicon perturbation would change the function, not the evidence)",
    "planActions/v1": "not probed",
    "grill20Composition/v1": "not probed (composition is a pure function of failed_checks)",
}
out["evidence_sensitivity_jev"] = {
    "AW blocked->expired": {"AW-08 p": 0.06, "AW-07 p": 0.54, "moves": True},
    "GV isSite true->false": {"main GV-01 p": "see samples", "GV-01b p": 0.34, "moves": True},
    "RG uncertain->completed": {"RG-03 p": 0.41, "RG-07 p": 0.79, "moves": True},
}
with open(os.path.join(RAW, "metrics.json"), "w") as f:
    json.dump(out, f, indent=1)

for c in contracts:
    m = out["contracts"][c]
    print("=" * 78)
    print(c)
    print("  baseline: n=%d judged=%d abstained=%d lat_p50=%s lat_p95=%s ms" % (
        m["n_cases"], m["baseline"]["judged"], m["baseline"]["abstained"],
        m["baseline"]["latency_ms"]["p50"], m["baseline"]["latency_ms"]["p95"]))
    print("  jev: n_sampled=%d scored=%d agree@0.5=%s/%s (%s%%) brier=%s fp=%d fn=%d lat_p50=%s lat_p95=%s ms" % (
        m["jev"]["n_sampled"], m["jev"]["n_scored"], m["jev"]["agreement_at_0.5"]["agree"],
        m["jev"]["n_scored"], m["jev"]["agreement_at_0.5"]["pct"], m["jev"]["brier"],
        m["jev"]["fp"], m["jev"]["fn"], m["jev"]["latency_ms"]["p50"], m["jev"]["latency_ms"]["p95"]))
    for d_ in m["jev"]["disagreements"]:
        print("    disagree:", d_)
    print("  muse_shadow agree: %d/%d (%s%%)" % (m["muse_shadow"]["agreement"], m["muse_shadow"]["n"], m["muse_shadow"]["pct"]))
    if m["stability"]:
        for k, v in m["stability"].items(): print("  stability", k, v)
