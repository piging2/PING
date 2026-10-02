#!/usr/bin/env python3
"""
Benchmark runner. Feeds the byte-identical evidence pack for each problem to
one candidate, captures the response + timing, scores it deterministically,
and appends to results.jsonl + cost-ledger.jsonl.

Usage:
  run.py --candidate <id> [--dry-run] [--problems p1-graph,p2-render-sink]

--dry-run loads every candidate config and pack and validates the invocation
plan WITHOUT calling any model (harness self-check).

Candidate invocation:
  - hermes-baseline: pack piped to ~/workspace/bin/prompt-hermes.sh (Tier 1
    headless, Pig-side free model). Timeout 600s.
  - openrouter_*: executed PIG-SIDE ONLY by run_openrouter_pig.py, which reads
    OPENROUTER_API_KEY from C:\\Users\\nolan\\AppData\\Local\\hermes\\.env
    itself. The key is never printed, logged, copied, or passed as an
    argument. This runner never handles the key.

Cost accounting uses live-catalog pricing from candidates.json.
"""
import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone

BASE = os.path.dirname(os.path.abspath(__file__))
PROBLEMS = ["p1-graph", "p2-render-sink", "p3-mobile-overflow"]
HERMES_SH = "/home/hatch/workspace/bin/prompt-hermes.sh"
HARD_CAP_USD = 5.0


def load_candidates():
    with open(os.path.join(BASE, "candidates.json")) as f:
        return json.load(f)["candidates"]


def ledger_total():
    total = 0.0
    lp = os.path.join(BASE, "cost-ledger.jsonl")
    if os.path.exists(lp):
        with open(lp) as f:
            for line in f:
                line = line.strip()
                if line:
                    total += json.loads(line).get("cost_usd", 0.0)
    return round(total, 6)


def estimate_cost(candidate, in_tokens, out_tokens):
    pricing = candidate.get("pricing_usd_per_1m", {})
    return round(in_tokens / 1e6 * pricing.get("input", 0.0)
                 + out_tokens / 1e6 * pricing.get("output", 0.0), 6)


def invoke_hermes(pack_text, timeout=600):
    t0 = time.time()
    r = subprocess.run(["bash", HERMES_SH], input=pack_text,
                       capture_output=True, text=True, timeout=timeout)
    dt = time.time() - t0
    return r.stdout, r.stderr, dt, r.returncode


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--candidate", required=True)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--problems", default=",".join(PROBLEMS))
    args = ap.parse_args()

    candidates = load_candidates()
    cand = next((c for c in candidates if c["id"] == args.candidate), None)
    if not cand:
        print(f"unknown candidate {args.candidate}", file=sys.stderr)
        sys.exit(2)
    problems = [p for p in args.problems.split(",") if p in PROBLEMS]

    plan = []
    for p in problems:
        pack_path = os.path.join(BASE, "problems", p, "evidence.md")
        with open(pack_path) as f:
            pack = f.read()
        plan.append((p, pack))

    if args.dry_run:
        # Validate everything except the model call.
        assert cand.get("invoke"), f"candidate {cand['id']} missing invoke method"
        assert cand["invoke"] in ("hermes-bridge", "openrouter-pigside"), \
            f"unknown invoke method {cand['invoke']}"
        for p, pack in plan:
            assert len(pack) > 1000, f"pack {p} suspiciously small"
            assert "## Your task" in pack, f"pack {p} missing task block"
        print(f"dry-run OK: candidate={cand['id']} problems={[p for p, _ in plan]} "
              f"invoke={cand['invoke']} max_input={cand['max_input_tokens']} "
              f"max_output={cand['max_output_tokens']}")
        return

    results_path = os.path.join(BASE, "results.jsonl")
    ledger_path = os.path.join(BASE, "cost-ledger.jsonl")
    score_py = os.path.join(BASE, "score.py")

    for p, pack in plan:
        task_id = f"bench-{p}-{cand['id']}-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
        if cand["invoke"] == "hermes-bridge":
            text, err, latency_s, rc = invoke_hermes(pack)
            if rc != 0:
                print(f"[{task_id}] hermes invoke failed rc={rc}: {err[-300:]}",
                      file=sys.stderr)
                continue
            in_tok = out_tok = None  # headless baseline: token counts unavailable
            cost = 0.0
        elif cand["invoke"] == "openrouter-pigside":
            print(f"[{task_id}] openrouter candidates run via run_openrouter_pig.py "
                  f"on the Pig (key never leaves the Pig).", file=sys.stderr)
            sys.exit(3)
        else:
            raise AssertionError("unreachable")

        if ledger_total() + cost > HARD_CAP_USD:
            print(f"HARD CAP: ledger {ledger_total()} + {cost} > {HARD_CAP_USD}; halting.",
                  file=sys.stderr)
            sys.exit(4)

        run_file = os.path.join(
            BASE, "runs",
            f"{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-{cand['id']}-{p}.txt")
        with open(run_file, "w") as f:
            f.write(text)
        key = os.path.join(BASE, "answer-keys", f"{p}.key.json")
        breakdown = json.loads(subprocess.run(
            [sys.executable, score_py, key, run_file, "--json"],
            capture_output=True, text=True, check=True).stdout)

        record = {
            "task_id": task_id,
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "candidate": cand["id"],
            "tier": cand["tier"],
            "model": cand.get("model"),
            "problem": p,
            "score": breakdown["total"],
            "score_breakdown": breakdown,
            "latency_s": round(latency_s, 1),
            "input_tokens": in_tok,
            "output_tokens": out_tok,
            "cost_usd": cost,
            "run_file": os.path.basename(run_file),
        }
        with open(results_path, "a") as f:
            f.write(json.dumps(record) + "\n")
        with open(ledger_path, "a") as f:
            f.write(json.dumps({
                "task_id": task_id, "timestamp_utc": record["timestamp_utc"],
                "model": cand.get("model") or cand["id"],
                "input_tokens": in_tok, "output_tokens": out_tok,
                "cost_usd": cost, "running_total_usd": ledger_total() + cost,
            }) + "\n")
        print(f"[{task_id}] score={breakdown['total']} latency={latency_s:.0f}s cost=${cost}")


if __name__ == "__main__":
    main()
