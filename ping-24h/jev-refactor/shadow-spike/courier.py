#!/usr/bin/env python3
"""Shadow-spike Jev courier: direct TypeSafe API, pinned jev-1.13.0.

SHADOW ONLY. No production decisions, no authorization, no canonical writes.
Cost computed locally from input tokens at $0.042/MTok. 429/529 fail closed
(stop the run, no retry). Module-level spend accumulator stops at $4.50.
"""
import hashlib
import json
import sys
import time

sys.path.insert(0, "/home/hatch/workspace/fyd-intel")
sys.path.insert(0, "/home/hatch/workspace/skills/skill-creator/bin")
import jev_contract
from api_call import api_call, ApiRequestError

COST_PER_MTOK_USD = 0.042
SPEND_STOP_USD = 4.50
CONTRACT_VERSION = "systemone-v1/jev-1.13.0"

_spent_usd = 0.0
_calls = 0


class StopRun(Exception):
    """429/529 or spend stop: fail closed, stop issuing calls."""


def spent():
    return _spent_usd


def ncalls():
    return _calls


def ask(question_id, qtype, instructions, state, criteria=None, timeout=10):
    """One Jev question. Returns a result dict; raises StopRun on 429/529/spend."""
    global _spent_usd, _calls
    if _spent_usd >= SPEND_STOP_USD:
        raise StopRun(f"spend stop ${_spent_usd:.4f}")
    question = {"type": qtype, "instructions": instructions}
    if criteria is not None:
        question["criteria"] = criteria
    request = jev_contract.build_request(
        "TYPESAFE_JEV", state, {question_id: question})
    body_bytes = json.dumps(request["body"]).encode("utf-8")
    t0 = time.monotonic()
    try:
        status, parsed = api_call(
            "POST", request["url"], data=body_bytes,
            credential="custom.typesafe", allowed_hosts=["api.typesafe.ai"],
            extra_headers={"Content-Type": "application/json"},
            timeout=timeout)
    except Exception as e:  # ApiRequestError and transport errors
        status = getattr(e, "status", None)
        if status in (429, 529):
            raise StopRun(f"fail-closed on HTTP {status}")
        return {"ok": False, "error_class": type(e).__name__,
                "http_status": status,
                "error_body": str(e)[:200]}
    latency_ms = int((time.monotonic() - t0) * 1000)
    if status in (429, 529):
        raise StopRun(f"fail-closed on HTTP {status}")
    if status != 200 or not isinstance(parsed, dict):
        return {"ok": False, "error_class": "BAD_STATUS",
                "http_status": status, "latency_ms": latency_ms}
    ok, reason = jev_contract.attest("TYPESAFE_JEV", parsed)
    usage = parsed.get("usage") or {}
    in_tok = usage.get("input_tokens") or 0
    out_tok = usage.get("output_tokens") or 0
    cost = (in_tok / 1_000_000) * COST_PER_MTOK_USD
    _spent_usd += cost
    _calls += 1
    answers = parsed.get("answers", {})
    ans = answers.get(question_id, {})
    dist = None
    result = None
    if ans.get("type") == "choice":
        result = ans.get("choice")
        dist = ans.get("probabilities")
    elif ans.get("type") == "noul":
        result = ans.get("noul")
        dist = {"true": ans.get("noul"),
                "false": 1 - (ans.get("noul") or 0)}
    elif ans.get("type") == "score":
        result = ans.get("score")
        dist = ans.get("probabilities")
    return {
        "ok": ok, "attested": ok, "attest_reason": reason,
        "jev_result": result, "jev_distribution": dist,
        "jev_confidence": ans.get("confidence"),
        "jev_latency_ms": latency_ms,
        "input_tokens": in_tok, "output_tokens": out_tok,
        "jev_cost_usd": cost,
        "model": parsed.get("model"),
        "http_status": status,
    }


def digest(obj):
    if not isinstance(obj, str):
        obj = json.dumps(obj, sort_keys=True)
    return "sha256:" + hashlib.sha256(obj.encode("utf-8")).hexdigest()
