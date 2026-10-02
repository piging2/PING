#!/usr/bin/env python3
"""TYPESAFE_JEV contract tests. No provider calls are made here: these prove
the mapping, the fail-closed paths, and the attestation rules locally.

Run: python3 test_model_contract.py
"""

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import jev_contract
from jev_contract import ContractError, attest, build_request, resolve_profile

PASS = []
FAIL = []


def check(name, fn):
    try:
        fn()
    except AssertionError as e:
        FAIL.append((name, f"assertion: {e}"))
    except Exception as e:  # noqa: BLE001 - a test must never die silently
        FAIL.append((name, f"unexpected {type(e).__name__}: {e}"))
    else:
        PASS.append(name)


def expect_fail(name, fn):
    def wrapper():
        try:
            fn()
        except ContractError:
            return
        raise AssertionError("expected ContractError, got success")
    check(name, wrapper)


def good_questions():
    return {
        "is_fruit": {
            "type": "choice",
            "instructions": "Is the state a fruit?",
            "criteria": {"yes": "is a fruit", "no": "is not a fruit"},
        }
    }


def attested_response(model="jev-1.13.0", provider="TypeSafe"):
    return {
        "id": "gen-dec-test",
        "model": model,
        "provider": provider,
        "answers": {
            "is_fruit": {
                "type": "choice",
                "choice": "yes",
                "probabilities": {"yes": 0.99, "no": 0.01},
                "confidence": 0.99,
            }
        },
        "usage": {"input_tokens": 120, "output_tokens": 12, "cost": 5.04e-06},
    }


# 1. TYPESAFE_JEV resolves deterministically to the exact pinned triple.
def t_resolve_exact():
    prof = resolve_profile("TYPESAFE_JEV")
    assert prof["provider"] == "typesafe", prof
    assert prof["model"] == "jev-1.13.0", prof
    assert prof["mode"] == "decisions", prof
    assert prof["endpoint"] == "https://api.typesafe.ai/v1/systemone", prof
check("TYPESAFE_JEV -> jev-1.13.0 direct (exact triple)", t_resolve_exact)


# 2. TYPESAFE_JEV != typesafe/jev-router.
def t_not_router():
    prof = resolve_profile("TYPESAFE_JEV")
    assert prof["model"] != "typesafe/jev-router", prof["model"]
    assert "router" not in prof["model"].lower(), prof["model"]
check("TYPESAFE_JEV != typesafe/jev-router", t_not_router)


# 3. TYPESAFE_JEV != ~typesafe/jev-latest (floating alias).
def t_not_latest():
    prof = resolve_profile("TYPESAFE_JEV")
    assert prof["model"] not in ("~typesafe/jev-latest", "typesafe/jev-latest"), prof["model"]
    assert "latest" not in prof["model"].lower(), prof["model"]
check("TYPESAFE_JEV != ~typesafe/jev-latest", t_not_latest)


# 4. Missing mapping -> FAIL.
def t_missing_contract():
    resolve_profile("TYPESAFE_JEV", contract_path="/nonexistent/model_contract.json")
expect_fail("missing mapping -> FAIL", t_missing_contract)


# 5. Unknown profile -> FAIL.
def t_unknown_profile():
    resolve_profile("TYPESAFE_LUNA")
expect_fail("unknown profile -> FAIL", t_unknown_profile)


# 6. Caller attempts model override -> FAIL.
def t_caller_override():
    build_request("TYPESAFE_JEV", "apple", good_questions(),
                  model="typesafe/jev-router")
expect_fail("caller model override -> FAIL", t_caller_override)


# 6b. The built request carries the pinned model from the contract, never the caller.
def t_built_request_exact():
    req = build_request("TYPESAFE_JEV", "apple", good_questions())
    assert req["body"]["model"] == "jev-1.13.0", req["body"]
    assert req["url"] == "https://api.typesafe.ai/v1/systemone", req
check("built request carries pinned model only", t_built_request_exact)


# 7. Unexpected response model (Luna fallback) -> FAIL, do not consume.
def t_unexpected_response_model():
    ok, reason = attest("TYPESAFE_JEV", attested_response(model="openai/gpt-6-luna"))
    assert ok is False, f"consumed a Luna response: {reason}"
check("unexpected response model (Luna) -> FAIL", t_unexpected_response_model)


# 8. Router/fallback response -> FAIL.
def t_router_response():
    ok, reason = attest("TYPESAFE_JEV", attested_response(model="typesafe/jev-router"))
    assert ok is False, f"consumed a router response: {reason}"


def t_latest_response():
    ok, reason = attest("TYPESAFE_JEV", attested_response(model="~typesafe/jev-latest"))
    assert ok is False, f"consumed a floating-alias response: {reason}"
check("router response -> FAIL", t_router_response)
check("floating-alias response -> FAIL", t_latest_response)


# 9. The direct pinned echo (jev-1.13.0, no build suffix) is accepted.
def t_pinned_direct_accepted():
    ok, reason = attest("TYPESAFE_JEV", attested_response(model="jev-1.13.0"))
    assert ok is True, f"rejected the direct pinned echo: {reason}"
check("pinned direct echo jev-1.13.0 -> ACCEPT", t_pinned_direct_accepted)


# 9b. The old OpenRouter echoes are no longer the pinned model -> REJECT.
def t_old_openrouter_echo_rejected():
    for stale in ("typesafe/jev-1.13", "typesafe/jev-1.13-20260917"):
        ok, reason = attest("TYPESAFE_JEV", attested_response(model=stale))
        assert ok is False, f"consumed a stale OpenRouter echo {stale}: {reason}"
check("stale OpenRouter echoes -> REJECT", t_old_openrouter_echo_rejected)


# 9c. Direct TypeSafe responses carry no provider field; that still attests.
def t_no_provider_field_accepted():
    resp = attested_response(model="jev-1.13.0")
    del resp["provider"]
    ok, reason = attest("TYPESAFE_JEV", resp)
    assert ok is True, f"rejected a providerless direct response: {reason}"
check("direct response without provider field -> ACCEPT", t_no_provider_field_accepted)


# 10. Provider mismatch -> FAIL.
def t_provider_mismatch():
    ok, reason = attest("TYPESAFE_JEV", attested_response(provider="OpenAI"))
    assert ok is False, f"consumed a wrong-provider response: {reason}"
check("wrong provider -> FAIL", t_provider_mismatch)


# 11. Response with no typed answers -> FAIL.
def t_no_answers():
    resp = attested_response()
    del resp["answers"]
    ok, reason = attest("TYPESAFE_JEV", resp)
    assert ok is False, f"consumed an answerless response: {reason}"
check("response with no answers -> FAIL", t_no_answers)


# 12. Non-object response never raises; it fails attestation.
def t_non_dict_response():
    ok, reason = attest("TYPESAFE_JEV", None)
    assert ok is False, "None response attested True"
check("non-object response -> FAIL (no raise)", t_non_dict_response)


# 13. Chat/prose question types are rejected at build time (Jev is not generative).
def t_prose_rejected():
    build_request("TYPESAFE_JEV", "apple", {
        "essay": {"type": "chat", "instructions": "Write about apples."}
    })
expect_fail("chat/prose question type -> FAIL", t_prose_rejected)


# 14. A corrupted contract that points at the router fails at resolve time.
def t_corrupted_contract_router():
    with tempfile.TemporaryDirectory() as td:
        bad = {
            "profiles": {
                "TYPESAFE_JEV": {
                    "provider": "openrouter",
                    "model": "typesafe/jev-router",
                    "mode": "decisions",
                    "endpoint": "https://openrouter.ai/api/alpha/decisions",
                }
            },
            "never": ["typesafe/jev-router"],
        }
        p = Path(td) / "model_contract.json"
        p.write_text(json.dumps(bad), encoding="utf-8")
        resolve_profile("TYPESAFE_JEV", contract_path=str(p))
expect_fail("contract pointing at router -> FAIL at resolve", t_corrupted_contract_router)


print(f"PASS {len(PASS)}/{len(PASS) + len(FAIL)}")
for name in PASS:
    print(f"  ok   {name}")
if FAIL:
    print("FAILURES:")
    for name, why in FAIL:
        print(f"  FAIL {name}: {why}")
    sys.exit(1)
print("ALL CONTRACT TESTS GREEN")
