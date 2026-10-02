"""TYPESAFE_JEV model contract.

Architecture: WORKLOAD -> LOGICAL INTELLIGENCE PROFILE -> MODEL CONTRACT
-> PROVIDER ADAPTER -> EXACT REQUEST -> RESPONSE ATTESTATION -> RESULT.

Application code requests a logical profile (TYPESAFE_JEV). It never
supplies a model string. This module is the only place that maps a
profile to an exact provider/model/endpoint triple, and the only place
that judges whether a provider response may be consumed.

Every failure here is closed: ContractError on the build path, and a
(False, reason) attestation on the response path. A failed attestation
means DO NOT CONSUME THE DECISION.
"""

import json
import re
from pathlib import Path

LANE_DIR = Path(__file__).resolve().parent
CONTRACT_FILE = LANE_DIR / "model_contract.json"

DECISION_TYPES = ("choice", "noul", "score")


class ContractError(Exception):
    """Raised for any contract violation before provider dispatch."""


def load_contract(path=None):
    p = Path(path) if path is not None else CONTRACT_FILE
    if not p.exists():
        raise ContractError(f"model contract missing at {p} -> FAIL CLOSED")
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except ContractError:
        raise
    except Exception as e:
        raise ContractError(f"model contract unreadable at {p}: {e} -> FAIL CLOSED")


def resolve_profile(name, contract_path=None):
    """Resolve a logical profile to its exact (provider, model, mode, endpoint).

    Raises ContractError for: missing contract, unknown profile, incomplete
    mapping, or a mapping that resolves to a banned model/router/alias.
    """
    contract = load_contract(contract_path)
    profiles = contract.get("profiles", {})
    if name not in profiles:
        raise ContractError(f"unknown logical profile {name!r} -> FAIL CLOSED")
    prof = dict(profiles[name])
    for field in ("provider", "model", "mode", "endpoint"):
        if not prof.get(field):
            raise ContractError(
                f"profile {name!r} has no {field} configured -> FAIL CLOSED"
            )
    banned = contract.get("never", [])
    model = prof["model"]
    lowered = model.lower()
    if model in banned or "router" in lowered or "latest" in lowered or "luna" in lowered:
        raise ContractError(
            f"profile {name!r} resolves to banned model {model!r} -> FAIL CLOSED"
        )
    return prof


def build_request(profile_name, state, questions, contract_path=None, model=None):
    """Build the EXACT provider request for a logical profile.

    Callers pass a profile, never a model string. Passing model=... is a
    caller override and hard-fails. Questions must be typed decisions
    (choice/noul/score); chat/prose prompts are rejected here.
    """
    if model is not None:
        raise ContractError(
            f"caller attempted model override ({model!r}) for profile "
            f"{profile_name!r}: application code requests a profile, never a "
            f"model string -> FAIL CLOSED"
        )
    prof = resolve_profile(profile_name, contract_path)
    if not isinstance(questions, dict) or not questions:
        raise ContractError("questions must be a non-empty object -> FAIL CLOSED")
    for qid, q in questions.items():
        if not isinstance(q, dict):
            raise ContractError(f"question {qid!r} is not an object -> FAIL CLOSED")
        qtype = q.get("type")
        if qtype not in DECISION_TYPES:
            raise ContractError(
                f"question {qid!r} has type {qtype!r}: Jev takes typed decisions "
                f"{DECISION_TYPES}, never chat/prose -> FAIL CLOSED"
            )
        if not q.get("instructions"):
            raise ContractError(
                f"question {qid!r} has no instructions -> FAIL CLOSED"
            )
    body = {"model": prof["model"], "state": state, "questions": questions}
    return {
        "url": prof["endpoint"],
        "body": body,
        "profile": profile_name,
        "requested_model": prof["model"],
        "provider": prof["provider"],
        "mode": prof["mode"],
    }


def attest(profile_name, response, contract_path=None):
    """Verify a provider response corresponds to the pinned Jev family/build.

    Returns (ok, reason). Never raises on malformed responses: a bad
    response simply fails attestation, and a failed attestation means
    DO NOT CONSUME THE DECISION.
    """
    try:
        prof = resolve_profile(profile_name, contract_path)
    except ContractError as e:
        return False, str(e)
    if not isinstance(response, dict):
        return False, f"response is not a JSON object (got {type(response).__name__})"
    resp_model = response.get("model")
    if not isinstance(resp_model, str) or not resp_model:
        return False, "response has no model field: cannot verify pinned build"
    pattern = prof.get("response_model_re") or ("^" + re.escape(prof["model"]) + "$")
    if not re.match(pattern, resp_model):
        return False, (
            f"unexpected response model {resp_model!r}: does not match pinned "
            f"family/build for {prof['model']!r} -> DO NOT CONSUME"
        )
    expected_provider = prof.get("expected_provider")
    resp_provider = response.get("provider")
    if expected_provider and resp_provider is not None and resp_provider != expected_provider:
        return False, (
            f"unexpected provider {resp_provider!r}: expected {expected_provider!r} "
            f"-> DO NOT CONSUME"
        )
    answers = response.get("answers")
    if not isinstance(answers, dict) or not answers:
        return False, "response has no typed answers -> DO NOT CONSUME"
    return True, "attested: response model matches pinned Jev family/build"
