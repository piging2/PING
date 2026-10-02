#!/usr/bin/env python3
"""
Phase-2 paid benchmark runner. RUNS ON THE PIG ONLY.

Reads OPENROUTER_API_KEY from C:\\Users\\nolan\\AppData\\Local\\hermes\\.env
itself (same .env-preferred precedence as hermes_cli). The key is NEVER
printed, logged, copied to another file, or passed as a process argument; it
is used only as an in-process HTTP Authorization header for openrouter.ai.

Per call it enforces the 11-field escalation contract and the hard $5 total
cap (checks the local ledger before issuing each call; halts if the cap
would be exceeded).

Outputs (in OUT_DIR): results.jsonl, cost-ledger.jsonl, run files, contracts/.
Stdlib only (urllib). No key material ever appears in any output.
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

ENV_PATHS = [
    r"/mnt/c/Users/nolan/AppData/Local/hermes/.env",  # WSL python
    r"C:\Users\nolan\AppData\Local\hermes\.env",       # Windows python
]
API_BASE = "https://openrouter.ai/api/v1"
HARD_CAP_USD = 5.0
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def load_key():
    """Read OPENROUTER_API_KEY from the Hermes .env (never printed).

    Same documented mechanism as hermes_cli (.env preferred); tries the
    WSL path form first, then the Windows path form.
    """
    for path in ENV_PATHS:
        if not os.path.exists(path):
            continue
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("OPENROUTER_API_KEY="):
                    val = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if val:
                        return val
    raise RuntimeError("OPENROUTER_API_KEY not found in Hermes .env")


def api_get(key, path):
    req = urllib.request.Request(
        API_BASE + path,
        headers={"Authorization": "Bearer " + key,
                 "HTTP-Referer": "https://ping.social",
                 "X-Title": "PING FYD intelligence-router benchmark"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def api_post(key, path, payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        API_BASE + path, data=data,
        headers={"Authorization": "Bearer " + key,
                 "Content-Type": "application/json",
                 "HTTP-Referer": "https://ping.social",
                 "X-Title": "PING FYD intelligence-router benchmark"},
    )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            body = json.load(r)
        return body, time.time() - t0, None
    except urllib.error.HTTPError as e:
        return None, time.time() - t0, f"HTTP {e.code}: {e.read(300).decode('utf-8', 'replace')}"


def ledger_total():
    total = 0.0
    lp = os.path.join(OUT_DIR, "cost-ledger.jsonl")
    if os.path.exists(lp):
        with open(lp) as f:
            for line in f:
                line = line.strip()
                if line:
                    total += json.loads(line).get("cost_usd", 0.0)
    return round(total, 6)


def resolve_deepseek_free(key):
    models = api_get(key, "/models")["data"]
    cands = [m["id"] for m in models
             if "deepseek" in m["id"].lower() and m["id"].endswith(":free")]
    if not cands:
        raise RuntimeError("no deepseek :free variant in live catalog")
    for prefer in ("flash", "v4"):
        for c in cands:
            if prefer in c.lower():
                return c
    return cands[0]


def main():
    only = sys.argv[1:]  # optional subset of candidate ids
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(os.path.join(OUT_DIR, "contracts"), exist_ok=True)

    with open(os.path.join(BASE_DIR, "candidates.json")) as f:
        candidates = [c for c in json.load(f)["candidates"]
                      if c["invoke"] == "openrouter-pigside"]
    if only:
        candidates = [c for c in candidates if c["id"] in only]
    problems = ["p1-graph", "p2-render-sink", "p3-mobile-overflow"]

    key = load_key()
    # Auth check first (no spend): mirrors the 2026-09-26/27 lane pattern.
    auth = api_get(key, "/auth/key")
    print(f"auth OK: {json.dumps(auth.get('data', {}))[:120]}", flush=True)

    for cand in candidates:
        model = cand["model"]
        if model.startswith("RESOLVE_AT_RUNTIME"):
            model = resolve_deepseek_free(key)
            print(f"resolved free slug: {model}", flush=True)
        pricing = cand["pricing_usd_per_1m"]

        for prob in problems:
            task_id = (f"bench-{prob}-{cand['id']}-"
                       f"{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}")
            pack_path = os.path.join(BASE_DIR, "problems", prob, "evidence.md")
            with open(pack_path, encoding="utf-8") as f:
                pack = f.read()

            # Conservative pre-call cost estimate: full max_tokens + measured
            # input length (chars/4 ~ tokens).
            max_tokens = cand.get("max_tokens", cand["max_output_tokens"])
            est_in = len(pack) // 4
            est_cost = round(est_in / 1e6 * pricing["input"]
                             + max_tokens / 1e6 * pricing["output"], 6)
            if ledger_total() + est_cost > HARD_CAP_USD:
                print(f"HARD CAP: {ledger_total()} + est {est_cost} > "
                      f"{HARD_CAP_USD}; halting.", flush=True)
                return

            contract = {
                "TASK_ID": task_id,
                "WHY_AI_IS_NEEDED": (
                    "Benchmark cognition for the intelligence-escalation "
                    "router: diagnose a real solved FYD failure from a "
                    "compact evidence pack. Doctrine-mandated benchmark "
                    "before routing real work."),
                "WHY_HEADLESS_WAS_INSUFFICIENT": (
                    "Headless baseline (hermes-baseline, Tier 1) runs the "
                    "same packs; paid tiers are measured on verified "
                    "progress per dollar ABOVE that baseline."),
                "CHEAPER_ATTEMPTS": (
                    "Tier 0: deterministic scorer + sealed answer keys. "
                    "Tier 1: Hermes headless baseline on identical packs. "
                    "Tier 2 free candidate runs before paid tiers."),
                "EXPECTED_OUTPUT": ("Diagnosis / patch spec / test spec / "
                                    "risks, four sections, from the evidence "
                                    "pack only."),
                "MAX_INPUT": cand["max_input_tokens"],
                "MAX_OUTPUT": cand["max_output_tokens"],
                "MAX_COST": est_cost,
                "MODEL_TIER": cand["tier"],
                "RESULT": None,   # filled after the call
                "VERIFICATION": None,  # filled by deterministic scorer
            }

            body, latency_s, err = api_post(key, "/chat/completions", {
                "model": model,
                "messages": [{"role": "user", "content": pack}],
                "max_tokens": cand.get("max_tokens", cand["max_output_tokens"]),
                "temperature": 0.2,
            })
            if err or not body:
                print(f"[{task_id}] CALL FAILED: {err}", flush=True)
                continue
            if isinstance(body, dict) and body.get("error"):
                print(f"[{task_id}] API ERROR: {json.dumps(body['error'])[:200]}",
                      flush=True)
                continue
            msg = body["choices"][0]["message"]
            # Reasoning models may put work in reasoning_content; content can
            # be empty when the budget ran out during thinking. Concatenate
            # (reasoning marked) so the diagnosis is still gradeable.
            reasoning = msg.get("reasoning_content") or msg.get("reasoning") or ""
            content = msg.get("content") or ""
            text = (("[REASONING]\n" + reasoning + "\n[/REASONING]\n" if reasoning and not content else "")
                    + content).strip()
            if not text:
                print(f"[{task_id}] EMPTY content "
                      f"(finish_reason={body['choices'][0].get('finish_reason')}); "
                      f"skipping without ledger entry", flush=True)
                continue
            usage = body.get("usage", {})
            in_tok = usage.get("prompt_tokens")
            out_tok = usage.get("completion_tokens")
            cost = round((in_tok or 0) / 1e6 * pricing["input"]
                         + (out_tok or 0) / 1e6 * pricing["output"], 6)

            run_file = os.path.join(
                OUT_DIR, f"{task_id}.txt")
            with open(run_file, "w", encoding="utf-8") as f:
                f.write(text)

            contract["RESULT"] = {"run_file": os.path.basename(run_file),
                                  "model": model,
                                  "finish_reason": body["choices"][0].get("finish_reason")}
            contract["VERIFICATION"] = ("pending: deterministic score.py "
                                        "against sealed answer key")
            with open(os.path.join(OUT_DIR, "contracts", f"{task_id}.json"),
                      "w") as f:
                json.dump(contract, f, indent=1)

            record = {
                "task_id": task_id,
                "timestamp_utc": datetime.now(timezone.utc).isoformat(),
                "candidate": cand["id"], "tier": cand["tier"],
                "model": model, "problem": prob,
                "latency_s": round(latency_s, 1),
                "input_tokens": in_tok, "output_tokens": out_tok,
                "cost_usd": cost,
                "run_file": os.path.basename(run_file),
                "contract_file": f"contracts/{task_id}.json",
            }
            with open(os.path.join(OUT_DIR, "results.jsonl"), "a") as f:
                f.write(json.dumps(record) + "\n")
            new_total = ledger_total() + cost
            with open(os.path.join(OUT_DIR, "cost-ledger.jsonl"), "a") as f:
                f.write(json.dumps({
                    "task_id": task_id,
                    "timestamp_utc": record["timestamp_utc"],
                    "model": model, "input_tokens": in_tok,
                    "output_tokens": out_tok, "cost_usd": cost,
                    "running_total_usd": new_total}) + "\n")
            print(f"[{task_id}] in={in_tok} out={out_tok} "
                  f"latency={latency_s:.0f}s cost=${cost} "
                  f"total=${new_total}", flush=True)


if __name__ == "__main__":
    main()
