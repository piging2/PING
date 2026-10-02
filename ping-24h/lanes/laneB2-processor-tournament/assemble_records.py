#!/usr/bin/env python3
"""Lane B2: assemble the final raw records file beside report.md."""
import json, os

LANE = os.path.expanduser("~/workspace/ping-24h/lanes/laneB2-processor-tournament")
RAW = os.path.join(LANE, "raw")

with open(os.path.join(RAW, "cases-with-baselines.json")) as f:
    base = json.load(f)
with open(os.path.join(RAW, "jev-samples.json")) as f:
    jev = json.load(f)
with open(os.path.join(RAW, "jev-eg-fair.json")) as f:
    fair = json.load(f)
with open(os.path.join(RAW, "metrics.json")) as f:
    metrics = json.load(f)

records = {
    "tournament": "PING processor tournament, lane B2 (Phase 4 execution of the lane-11 design)",
    "generated_at": "2026-09-28T15:10 MDT",
    "t_plus": "T+0.75 approx (T+0 = 2026-09-28 14:26 MDT)",
    "rules": ["ZERO authority", "ZERO execution effect", "ZERO policy effect",
              "Jev never grants, authorizes, or decides anything canonical; Jev stays SHADOW",
              "shadow outputs never written to any canonical record, never fed back into any decision",
              "read-only against production; no gateway/scheduler-mission/:3100 contact; no pushes; no new credentials"],
    "processors": {
        "deterministic_baseline": "the incumbent function for each contract, executed read-only on replay cases; the final-label source for this tournament",
        "jev_shadow": "typesafe/jev-latest via POST /v1/systemone (noul questions), bounded samples, skill-documented credential flow only",
        "local_model": "NOT AVAILABLE this run (no ollama binary in this sandbox); column recorded UNKNOWN, not collapsed",
        "muse_shadow": "muse-self-inference: the tournament operator's own judgments, pre-registered before baseline execution; same model family as the runner; NOT independent evidence",
        "codex_shadow": "NOT USED this run (would require dispatch-path invocation with external effect surface); recorded UNKNOWN"
    },
    "cost_models_pre_registered": {
        "mc.authorize_work_order/v1": {"FP_false_GRANT": "HIGH", "FN_false_DENY": "LOW-MODERATE"},
        "grantsForViewer/v1": {"FP": "LOW", "FN": "LOW"},
        "planActions/v1": {"FP": "LOW", "FN": "LOW"},
        "classifyReview/v1": {"FP_false_positive": "MODERATE-HIGH", "FN": "LOW"},
        "reconcileGate/v1": {"FP_false_ALLOW": "HIGH", "FN_false_REFUSE": "LOW-MODERATE"},
        "engagementGuard/v1": {"FP_false_ELIGIBLE": "MODERATE", "FN_false_drop": "LOW"},
        "grill20Composition/v1": {"FP_false_decide": "HIGH", "FN_false_escalate": "LOW-MODERATE"},
    },
    "n_cases": base["n"],
    "n_jev_samples": jev["n"] + fair["n"],
    "cases": base["records"],
    "jev_samples": jev["samples"],
    "jev_eg_fair_samples": fair["samples"],
    "metrics": metrics,
    "unknowns": [
        "Jev cost per call (API does not report it)",
        "Jev model_version/commit (not published; version endpoints 404)",
        "Jev confidence field (null, never populated)",
        "Pig WSL unreachable this run (SSH hung silently, killed per hang-recovery rule); canonical-tree baselines ran on local mirrors instead; mirror-vs-HEAD equivalence NOT verified this run",
        "classifyReview final-label source = human moderation decisions: NOT FOUND locally; accuracy vs human = UNKNOWN",
        "callerScope, mc-dispatch-identity, EstimatorFlags: deterministic baselines not executable locally (files absent); not run this tournament",
        "Calibration NOT established for any processor on any contract (n too small everywhere; Jev stays SHADOW)",
    ],
}

with open(os.path.join(LANE, "tournament-records-2026-09-28.json"), "w") as f:
    json.dump(records, f, indent=1)
print("records:", records["n_cases"], "jev samples:", records["n_jev_samples"])
print("bytes:", os.path.getsize(os.path.join(LANE, "tournament-records-2026-09-28.json")))
