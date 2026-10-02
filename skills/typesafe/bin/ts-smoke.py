#!/usr/bin/env python3
"""TypeSafe API smoke test: models catalog + one minimal Jev SystemOne call.

Usage: ts-smoke.py [--no-systemone]
Exit 0 on success; prints safe diagnostics only (no credentials, no raw bodies).
"""
import json
import sys

sys.path.insert(0, "/home/hatch/workspace/skills/skill-creator/bin")
sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
from api_call import api_call, ApiRequestError

HOST = "api.typesafe.ai"
CRED = "custom.typesafe"
BASE = f"https://{HOST}/v1"


def get(path, timeout=20):
    try:
        return api_call("GET", BASE + path,
                        credential=CRED, allowed_hosts=[HOST], timeout=timeout)
    except ApiRequestError as e:
        return e.status, {"http_error": e.status,
                          "detail": e.body[:200].decode("utf-8", "replace")}


def post(path, payload, timeout=30):
    data = json.dumps(payload).encode("utf-8")
    try:
        return api_call("POST", BASE + path, data=data,
                        credential=CRED, allowed_hosts=[HOST],
                        extra_headers={"Content-Type": "application/json"},
                        timeout=timeout)
    except ApiRequestError as e:
        return e.status, {"http_error": e.status,
                          "detail": e.body[:200].decode("utf-8", "replace")}


def main():
    ok = True

    status, models = get("/models")
    model_ids = []
    if status == 200 and isinstance(models, dict):
        data = models.get("data", models)
        if isinstance(data, list):
            model_ids = [m.get("id") for m in data if isinstance(m, dict)][:10]
    print(json.dumps({"check": "models", "http": status,
                      "models": model_ids if status == 200 else models}))
    if status != 200:
        ok = False

    if "--no-systemone" not in sys.argv:
        payload = {
            "model": "jev-latest",
            "state": {"smoke_test": True, "note": "key verification call"},
            "questions": {
                "smoke": {"type": "noul", "instructions": "Is this a smoke test?"}
            },
        }
        status, ans = post("/systemone", payload)
        safe = {}
        if status == 200 and isinstance(ans, dict):
            answers = ans.get("answers", {})
            smoke = answers.get("smoke", {}) if isinstance(answers, dict) else {}
            safe = {"noul": smoke.get("noul"), "confidence": smoke.get("confidence")}
        print(json.dumps({"check": "systemone", "http": status,
                          "answer": safe if status == 200 else ans}))
        if status != 200:
            ok = False

    print("SMOKE_PASS" if ok else "SMOKE_FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
