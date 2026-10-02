#!/usr/bin/env python3
"""jev_ask.py launcher tests. Every refusal path must make ZERO provider
calls; the courier stub raises if it is ever invoked on those paths.

Run: python3 test_jev_ask.py
"""

import json
import shutil
import sys
import tempfile
from pathlib import Path

LANE = Path(__file__).resolve().parent
sys.path.insert(0, str(LANE))
import jev_ask

PASS = []
FAIL = []


def check(name, fn):
    try:
        fn()
    except AssertionError as e:
        FAIL.append((name, f"assertion: {e}"))
    except Exception as e:  # noqa: BLE001
        FAIL.append((name, f"unexpected {type(e).__name__}: {e}"))
    else:
        PASS.append(name)


class ExplodingCourier:
    """Raises if the launcher ever attempts a provider call."""

    def __init__(self):
        self.calls = []

    def __call__(self, request):
        self.calls.append(request)
        raise AssertionError("provider courier was invoked on a refusal path")


def make_lane(per_day_usd=5.0, disabled=False, spent_today=0.0):
    td = Path(tempfile.mkdtemp(prefix="jev-lane-"))
    shutil.copy(LANE / "model_contract.json", td / "model_contract.json")
    (td / "budgets.json").write_text(json.dumps({"per_day_usd": per_day_usd}),
                                     encoding="utf-8")
    if disabled:
        (td / "DISABLED").write_text("stopped", encoding="utf-8")
    if spent_today:
        (td / "jev-decisions.jsonl").write_text(
            json.dumps({"ts": "2026-09-26T10:00:00", "cost_usd": spent_today})
            + "\n", encoding="utf-8")
    return td


def base_args(lane, purpose="classification"):
    return ["--lane-dir", str(lane),
            "--profile", "TYPESAFE_JEV",
            "--purpose", purpose,
            "--type", "choice",
            "--instructions", "Is the state a fruit?",
            "--criteria", json.dumps({"yes": "is a fruit", "no": "is not a fruit"}),
            "--state", "apple"]


def t_disabled_zero_calls():
    lane = make_lane(disabled=True)
    c = ExplodingCourier()
    rc = jev_ask.run(base_args(lane), courier=c)
    assert rc == 5, f"expected 5, got {rc}"
    assert c.calls == [], "courier called while DISABLED"
check("DISABLED -> refuse, zero provider calls", t_disabled_zero_calls)


def t_budget_zero_calls():
    lane = make_lane(per_day_usd=0.000001, spent_today=0.0001)
    c = ExplodingCourier()
    rc = jev_ask.run(base_args(lane), courier=c)
    assert rc == 4, f"expected 4, got {rc}"
    assert c.calls == [], "courier called past budget ceiling"
check("budget exceeded -> refuse, zero provider calls", t_budget_zero_calls)


def t_deterministic_blocked_zero_calls():
    lane = make_lane()
    c = ExplodingCourier()
    rc = jev_ask.run(base_args(lane, purpose="hashing"), courier=c)
    assert rc == 3, f"expected 3, got {rc}"
    assert c.calls == [], "courier called for deterministic kind"
check("deterministic purpose (hashing) -> refuse, zero provider calls",
      t_deterministic_blocked_zero_calls)


def t_generative_blocked_zero_calls():
    lane = make_lane()
    c = ExplodingCourier()
    rc = jev_ask.run(base_args(lane, purpose="writing"), courier=c)
    assert rc == 3, f"expected 3, got {rc}"
    assert c.calls == [], "courier called for generative purpose"
check("generative purpose (writing) -> refuse, zero provider calls",
      t_generative_blocked_zero_calls)


def t_unknown_purpose_zero_calls():
    lane = make_lane()
    c = ExplodingCourier()
    rc = jev_ask.run(base_args(lane, purpose="astrology"), courier=c)
    assert rc == 3, f"expected 3, got {rc}"
    assert c.calls == [], "courier called for unknown purpose"
check("unknown purpose -> refuse, zero provider calls", t_unknown_purpose_zero_calls)


def t_model_flag_hard_fail():
    lane = make_lane()
    c = ExplodingCourier()
    rc = jev_ask.run(base_args(lane) + ["--model", "typesafe/jev-router"], courier=c)
    assert rc == 2, f"expected 2, got {rc}"
    assert c.calls == [], "courier called despite --model override attempt"
check("--model override attempt -> hard fail, zero provider calls",
      t_model_flag_hard_fail)


def t_success_path():
    lane = make_lane()
    seen = {}

    def stub(request):
        seen["request"] = request
        return {
            "ok": True, "status_code": 200, "latency_ms": 312,
            "body": {
                "id": "sysone-canary",
                "model": "jev-1.13.0",
                "answers": {
                    "q1": {"type": "choice", "choice": "yes",
                           "probabilities": {"yes": 0.99, "no": 0.01},
                           "confidence": 0.99}
                },
                "usage": {"input_tokens": 120, "output_tokens": 12},
            },
        }

    rc = jev_ask.run(base_args(lane), courier=stub)
    assert rc == 0, f"expected 0, got {rc}"
    req = seen["request"]
    assert req["body"]["model"] == "jev-1.13.0", req["body"]
    assert req["url"] == "https://api.typesafe.ai/v1/systemone", req
    assert req["body"]["questions"]["q1"]["type"] == "choice"
    ledger = lane / "jev-decisions.jsonl"
    rec = json.loads(ledger.read_text(encoding="utf-8").strip().splitlines()[-1])
    for field in ("logical_profile", "requested_model", "response_model",
                  "provider", "request_id", "decision_type", "answer",
                  "latency_ms", "input_tokens", "output_tokens", "cost_usd"):
        assert field in rec, f"ledger missing {field}"
    assert rec["logical_profile"] == "TYPESAFE_JEV"
    assert rec["requested_model"] == "jev-1.13.0"
    assert rec["response_model"] == "jev-1.13.0"
    assert rec["status"] == "PASS"
    assert "OPENROUTER" not in json.dumps(rec), "credential material in ledger"
check("success path: exact request, attested, ledger complete", t_success_path)


def t_attestation_reject_zero_consume():
    lane = make_lane()

    def stub(request):
        return {
            "ok": True, "status_code": 200, "latency_ms": 900,
            "body": {"id": "gen-x", "model": "openai/gpt-6-luna",
                     "provider": "OpenAI",
                     "answers": {"q1": {"type": "choice", "choice": "yes",
                                       "probabilities": {"yes": 1.0},
                                       "confidence": 1.0}}},
        }

    rc = jev_ask.run(base_args(lane), courier=stub)
    assert rc == 6, f"expected 6, got {rc}"
    ledger = lane / "jev-decisions.jsonl"
    rec = json.loads(ledger.read_text(encoding="utf-8").strip().splitlines()[-1])
    assert rec["status"] == "ATTESTATION_REJECTED", rec
    assert rec["response_model"] == "openai/gpt-6-luna", rec
check("router-fallback response -> ATTESTATION_REJECTED, not consumed",
      t_attestation_reject_zero_consume)


def t_default_courier_is_direct_typesafe():
    lane = make_lane()
    seen = {}
    real = jev_ask.run_direct_courier

    def fake_direct(request):
        seen["request"] = request
        return {
            "ok": True, "status_code": 200, "latency_ms": 200,
            "body": {
                "id": "sysone-sel",
                "model": "jev-1.13.0",
                "answers": {
                    "q1": {"type": "choice", "choice": "no",
                           "probabilities": {"yes": 0.02, "no": 0.98},
                           "confidence": 0.98}
                },
                "usage": {"input_tokens": 100, "output_tokens": 10},
            },
        }

    jev_ask.run_direct_courier = fake_direct
    try:
        rc = jev_ask.run(base_args(lane))
    finally:
        jev_ask.run_direct_courier = real
    assert rc == 0, f"expected 0, got {rc}"
    assert seen["request"]["url"] == "https://api.typesafe.ai/v1/systemone", seen
    assert seen["request"]["provider"] == "typesafe", seen
check("default courier for TYPESAFE_JEV is direct TypeSafe (no Pig hop)",
      t_default_courier_is_direct_typesafe)


print(f"PASS {len(PASS)}/{len(PASS) + len(FAIL)}")
for name in PASS:
    print(f"  ok   {name}")
if FAIL:
    print("FAILURES:")
    for name, why in FAIL:
        print(f"  FAIL {name}: {why}")
    sys.exit(1)
print("ALL LAUNCHER TESTS GREEN")
