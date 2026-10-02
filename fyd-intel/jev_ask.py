#!/usr/bin/env python3
"""TYPESAFE_JEV decision launcher.

WORKLOAD -> LOGICAL INTELLIGENCE PROFILE -> MODEL CONTRACT
-> PROVIDER ADAPTER -> EXACT REQUEST -> RESPONSE ATTESTATION -> RESULT.

Usage:
  jev_ask.py --profile TYPESAFE_JEV --purpose classification \\
      --type choice --instructions "..." --criteria '{"yes":"...","no":"..."}' \\
      --state "apple"

Application code requests a LOGICAL PROFILE, never a model string.
There is no --model flag; attempting one is a hard failure. The contract
(jev_contract.py + model_contract.json) resolves the profile to the exact
pinned request, and the provider response is attested before anything is
consumed. Jev returns typed decisions (choice/noul/score), never prose.
"""

import argparse
import datetime
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import jev_contract
from jev_contract import ContractError

# Jev's bounded domain: fast bounded semantic decisions.
ALLOWED_PURPOSES = {
    "classification",
    "policy-judgment",
    "routing",
    "claim-verification",
    "ambiguity-triage",
    "tool-gating",
    "confidence-escalation",
}
# Deterministic software owns these; Jev is never called for them.
DETERMINISTIC_BLOCKED = {
    "hash", "hashing",
    "schema-validate", "schema-validation",
    "exact-match", "exact-matching",
    "permissions", "authorize", "authorization",
    "arithmetic",
    "state-transitions",
    "execution",
    "dedupe", "deduplication",
    "replay",
    "projection", "project",
    "render", "rendering",
    "batch-exec", "batch-execution",
    "url-sanitize", "url-sanitization",
}
# Generative intelligence owns these; Jev is not the generative lane.
GENERATIVE_BLOCKED = {
    "writing", "generation", "open-ended-reasoning", "research",
    "site-composition", "conversation",
}

# Conservative per-call cost estimate for budget gating (measured ~$0.00003).
BUDGET_ESTIMATE_USD = 0.001

SSH_KEY = "/home/hatch/.ssh/id_ed25519"
SSH_KNOWN = "/home/hatch/workspace/pig/known_hosts"
SSH_PROXY = "nc -X connect -x hatch-egress-proxy:3130 %h %p"
SSH_TARGET = "nolan@100.79.154.43"
WORKER_WIN = r"C:\Users\nolan\.local\share\pigi\jev-decide.ps1"


TYPESAFE_HOST = "api.typesafe.ai"
TYPESAFE_CREDENTIAL = "custom.typesafe"


def run_direct_courier(request):
    """Execute the exact request against the direct TypeSafe API on this
    machine, using the stored custom.typesafe credential.

    The courier is dumb: it knows no models, no endpoints, no profiles.
    It only executes the exact request handed to it, and only against
    api.typesafe.ai. Auth comes from the skill credential store; no raw
    keys are printed, logged, or persisted here.
    """
    import time
    start = time.monotonic()
    try:
        sys.path.insert(0, "/home/hatch/workspace/skills/skill-creator/bin")
        sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
        from api_call import api_call, ApiRequestError
    except Exception as e:  # noqa: BLE001 - missing skill plumbing fails closed
        return {"ok": False, "error_class": "DIRECT_AUTH_UNAVAILABLE",
                "error_body": f"typesafe skill api_call unavailable: {e}"[:300]}
    data = json.dumps(request["body"]).encode("utf-8")
    try:
        status, parsed = api_call(
            "POST", request["url"], data=data,
            credential=TYPESAFE_CREDENTIAL, allowed_hosts=[TYPESAFE_HOST],
            extra_headers={"Content-Type": "application/json"},
            timeout=60,
        )
    except Exception as e:  # noqa: BLE001 - ApiRequestError and transport errors
        status = getattr(e, "status", None)
        body = getattr(e, "body", b"")
        if isinstance(body, bytes):
            body = body.decode("utf-8", "replace")
        return {"ok": False, "error_class": "DIRECT_HTTP_ERROR",
                "http_status": status, "status_code": status,
                "error_body": f"{type(e).__name__}: {body}"[:300]}
    latency_ms = int((time.monotonic() - start) * 1000)
    return {"ok": True, "body": parsed if isinstance(parsed, dict) else {},
            "latency_ms": latency_ms,
            "http_status": status, "status_code": status}


def _ssh_base(connect_timeout):
    return [
        "ssh", "-i", SSH_KEY,
        "-o", "BatchMode=yes",
        "-o", f"ConnectTimeout={connect_timeout}",
        "-o", f"UserKnownHostsFile={SSH_KNOWN}",
        "-o", f"ProxyCommand={SSH_PROXY}",
        SSH_TARGET,
    ]


def run_courier(request):
    """Ship the exact request to the Pig courier and return its result dict.

    The courier is a dumb POST adapter: it knows no models, no endpoints,
    no profiles. It only executes the exact request handed to it.
    """
    payload = {"url": request["url"], "body": request["body"]}
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", prefix="jev-request-",
        encoding="utf-8", delete=False,
    ) as f:
        json.dump(payload, f)
        local_path = f.name
    ts = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    remote_path = f"C:/Windows/Temp/jev-request-{ts}.json"
    try:
        scp = [
            "scp", "-i", SSH_KEY,
            "-o", "BatchMode=yes",
            "-o", "ConnectTimeout=25",
            "-o", f"UserKnownHostsFile={SSH_KNOWN}",
            "-o", f"ProxyCommand={SSH_PROXY}",
            local_path, f"{SSH_TARGET}:{remote_path}",
        ]
        r = subprocess.run(scp, capture_output=True, text=True, timeout=60)
        if r.returncode != 0:
            return {"ok": False, "error_class": "SCP_FAILED",
                    "error_body": r.stderr[-300:]}
        cmd = (f"powershell.exe -NoProfile -ExecutionPolicy Bypass -File "
               f"{WORKER_WIN} -RequestFile {remote_path}")
        r = subprocess.run(_ssh_base(120) + [cmd], capture_output=True,
                           text=True, timeout=150)
        out = (r.stdout or "").strip()
        if not out:
            return {"ok": False, "error_class": "WORKER_NO_OUTPUT",
                    "error_body": (r.stderr or "")[-300:]}
        try:
            return json.loads(out)
        except json.JSONDecodeError:
            return {"ok": False, "error_class": "WORKER_BAD_JSON",
                    "error_body": out[-300:]}
    finally:
        Path(local_path).unlink(missing_ok=True)


def _today_spend(lane_dir):
    ledger = lane_dir / "jev-decisions.jsonl"
    total = 0.0
    today = datetime.date.today().isoformat()
    try:
        for line in ledger.read_text(encoding="utf-8").splitlines():
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue
            if str(rec.get("ts", ""))[:10] == today:
                try:
                    total += float(rec.get("cost_usd") or 0)
                except (TypeError, ValueError):
                    pass
    except FileNotFoundError:
        pass
    return total


def _write_ledger(lane_dir, record):
    ledger = lane_dir / "jev-decisions.jsonl"
    with ledger.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")


def _answer_summary(question_id, answers):
    ans = answers.get(question_id, {})
    summary = {"type": ans.get("type")}
    if ans.get("type") == "choice":
        summary["choice"] = ans.get("choice")
        summary["probabilities"] = ans.get("probabilities")
        summary["confidence"] = ans.get("confidence")
    elif ans.get("type") == "noul":
        summary["noul"] = ans.get("noul")
    elif ans.get("type") == "score":
        summary["score"] = ans.get("score")
        summary["legend"] = ans.get("legend")
        summary["probabilities"] = ans.get("probabilities")
        summary["confidence"] = ans.get("confidence")
    return summary


def run(argv, courier=None):
    """Entry point. Returns an exit code; never raises on refusal paths."""
    lane_dir = Path(__file__).resolve().parent
    # Courier selection: an explicit courier (tests) wins. Otherwise the
    # request's provider decides. "typesafe" goes direct from this machine
    # via the stored custom.typesafe credential; anything else keeps the
    # Pig courier (which holds the OpenRouter key for the other model).
    courier_explicit = courier

    # Hard-fail any caller attempt to supply a model string. There is no
    # --model flag: application code requests a profile, never a model.
    for token in argv:
        if token == "--model" or token.startswith("--model="):
            print("REFUSED: --model is not a thing. Application code requests a "
                  "logical profile (TYPESAFE_JEV); the contract chooses the model.",
                  file=sys.stderr)
            return 2

    ap = argparse.ArgumentParser(description="TYPESAFE_JEV decision launcher")
    ap.add_argument("--profile", required=True)
    ap.add_argument("--purpose", required=True)
    ap.add_argument("--type", required=True, choices=["choice", "noul", "score"])
    ap.add_argument("--instructions", required=True)
    ap.add_argument("--criteria", default=None,
                    help="JSON object (choice) or array (score)")
    ap.add_argument("--state", required=True)
    ap.add_argument("--question-id", default="q1")
    ap.add_argument("--session-id", default=None)
    ap.add_argument("--lane-dir", default=None)
    try:
        args = ap.parse_args(argv)
    except SystemExit as e:
        return int(e.code or 0)

    if args.lane_dir:
        lane_dir = Path(args.lane_dir)

    # 1. Lane stopped? Zero provider calls.
    if (lane_dir / "DISABLED").exists():
        print("REFUSED: TYPESAFE_JEV lane is STOPPED "
              f"(see {lane_dir / 'DISABLED'}). No dispatch.", file=sys.stderr)
        return 5

    # 2. Purpose gating: deterministic and generative work never reach Jev.
    purpose = args.purpose.lower().replace("_", "-")
    if purpose in DETERMINISTIC_BLOCKED:
        print(f"REFUSED: purpose '{args.purpose}' is deterministic work; "
              "Jev is never called for it.", file=sys.stderr)
        return 3
    if purpose in GENERATIVE_BLOCKED:
        print(f"REFUSED: purpose '{args.purpose}' is generative work; Jev is "
              "not the generative lane.", file=sys.stderr)
        return 3
    if purpose not in ALLOWED_PURPOSES:
        print(f"REFUSED: purpose '{args.purpose}' is not a bounded Jev decision "
              f"point. Allowed: {sorted(ALLOWED_PURPOSES)}", file=sys.stderr)
        return 3

    # 3. Daily spend ceiling. Zero provider calls when exceeded.
    try:
        budgets = json.loads((lane_dir / "budgets.json").read_text(encoding="utf-8"))
        ceiling = float(budgets.get("per_day_usd", 5.0))
    except Exception:  # noqa: BLE001 - unreadable budget file fails closed
        print("REFUSED: budgets.json unreadable; cannot verify spend ceiling.",
              file=sys.stderr)
        return 4
    spent = _today_spend(lane_dir)
    if spent + BUDGET_ESTIMATE_USD >= ceiling:
        print(f"REFUSED: daily spend ceiling ${ceiling} reached "
              f"(today ${spent:.6f}).", file=sys.stderr)
        return 4

    # 4. Build the EXACT request from the contract. No caller model strings.
    try:
        criteria = json.loads(args.criteria) if args.criteria else None
    except json.JSONDecodeError:
        print("REFUSED: --criteria is not valid JSON.", file=sys.stderr)
        return 2
    question = {"type": args.type, "instructions": args.instructions}
    if criteria is not None:
        question["criteria"] = criteria
    if args.type in ("choice", "score") and criteria is None:
        print(f"REFUSED: --type {args.type} requires --criteria.", file=sys.stderr)
        return 2
    try:
        request = jev_contract.build_request(
            args.profile, args.state, {args.question_id: question},
            contract_path=str(lane_dir / "model_contract.json"),
        )
    except ContractError as e:
        print(f"REFUSED: {e}", file=sys.stderr)
        return 2

    # 5. Dispatch through the dumb courier.
    if courier_explicit is not None:
        courier = courier_explicit
    elif request.get("provider") == "typesafe":
        courier = run_direct_courier
    else:
        courier = run_courier
    result = courier(request)
    ts = datetime.datetime.now().isoformat(timespec="seconds")
    state_sha = hashlib.sha256(args.state.encode("utf-8")).hexdigest()

    if not result.get("ok"):
        _write_ledger(lane_dir, {
            "ts": ts, "status": "COURIER_FAIL",
            "logical_profile": args.profile,
            "requested_model": request["requested_model"],
            "response_model": None, "provider": request["provider"],
            "request_id": None, "question_id": args.question_id,
            "decision_type": args.type, "answer": None,
            "state_sha256": state_sha, "instructions": args.instructions,
            "latency_ms": result.get("latency_ms"),
            "input_tokens": None, "output_tokens": None, "cost_usd": 0.0,
            "error_class": result.get("error_class"),
            "http_status": result.get("http_status"),
        })
        print(f"COURIER_FAIL: {result.get('error_class')} "
              f"(http {result.get('http_status')})", file=sys.stderr)
        return 1

    body = result.get("body") or {}

    # 6. ATTEST before consuming. A failed attestation means the decision
    # is NOT consumed, however plausible it looks.
    ok, reason = jev_contract.attest(
        args.profile, body,
        contract_path=str(lane_dir / "model_contract.json"),
    )
    usage = body.get("usage") or {}
    if not ok:
        _write_ledger(lane_dir, {
            "ts": ts, "status": "ATTESTATION_REJECTED",
            "logical_profile": args.profile,
            "requested_model": request["requested_model"],
            "response_model": body.get("model"),
            "provider": body.get("provider"),
            "request_id": body.get("id"),
            "question_id": args.question_id,
            "decision_type": args.type, "answer": None,
            "state_sha256": state_sha, "instructions": args.instructions,
            "latency_ms": result.get("latency_ms"),
            "input_tokens": usage.get("input_tokens"),
            "output_tokens": usage.get("output_tokens"),
            "cost_usd": usage.get("cost") or 0.0,
            "attestation_reason": reason,
        })
        print(f"ATTESTATION_REJECTED: {reason}. DO NOT CONSUME.",
              file=sys.stderr)
        return 6

    answers = body.get("answers", {})
    _write_ledger(lane_dir, {
        "ts": ts, "status": "PASS",
        "logical_profile": args.profile,
        "requested_model": request["requested_model"],
        "response_model": body.get("model"),
        "provider": body.get("provider"),
        "request_id": body.get("id"),
        "question_id": args.question_id,
        "decision_type": args.type,
        "answer": _answer_summary(args.question_id, answers),
        "state_sha256": state_sha, "instructions": args.instructions,
        "latency_ms": result.get("latency_ms"),
        "input_tokens": usage.get("input_tokens"),
        "output_tokens": usage.get("output_tokens"),
        "cost_usd": usage.get("cost") or 0.0,
    })
    print(json.dumps({
        "status": "PASS",
        "logical_profile": args.profile,
        "requested_model": request["requested_model"],
        "response_model": body.get("model"),
        "provider": body.get("provider"),
        "request_id": body.get("id"),
        "decision_type": args.type,
        "answer": _answer_summary(args.question_id, answers),
        "latency_ms": result.get("latency_ms"),
        "input_tokens": usage.get("input_tokens"),
        "output_tokens": usage.get("output_tokens"),
        "cost_usd": usage.get("cost"),
    }, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(run(sys.argv[1:]))
