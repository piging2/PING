#!/usr/bin/env python3
"""OpenRouter API CLI. Auth via the stored custom.openrouter connector credential.

Subcommands:
  models [filter]     List models (GET /models); optional case-insensitive substring filter.
  credits             Show credit balance (GET /credits).
  chat --model M --prompt P [--system S] [--max-tokens N]
                      Chat completion (POST /chat/completions). Prints assistant text.
"""
import argparse
import json
import sys
import urllib.request

sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
import dynamic_credentials as dc

CRED = "custom.openrouter"
HOSTS = ["openrouter.ai"]
BASE = "https://openrouter.ai/api/v1"


def _request(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if data:
        req.add_header("Content-Type", "application/json")
    dc.add_surrogate_to_request(req, CRED, allowed_hosts=HOSTS)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return dc.read_json_response(resp)
    except urllib.error.HTTPError as e:
        try:
            detail = json.loads(e.read().decode() or "{}")
        except Exception:
            detail = {}
        raise SystemExit(f"OpenRouter HTTP {e.code}: {detail.get('error', {}).get('message', 'no detail')}")


def cmd_models(args):
    data = _request("GET", "/models")
    models = data.get("data", [])
    filt = (args.filter or "").lower()
    for m in models:
        mid = m.get("id", "")
        if filt and filt not in mid.lower() and filt not in str(m.get("name", "")).lower():
            continue
        pricing = m.get("pricing", {})
        print(f"{mid}\tname={m.get('name', '')}\tprompt={pricing.get('prompt', '')}\tcompletion={pricing.get('completion', '')}")


def cmd_credits(args):
    data = _request("GET", "/credits")
    print(json.dumps(data.get("data", data), indent=2))


def cmd_chat(args):
    messages = []
    if args.system:
        messages.append({"role": "system", "content": args.system})
    messages.append({"role": "user", "content": args.prompt})
    body = {"model": args.model, "messages": messages}
    if args.max_tokens:
        body["max_tokens"] = args.max_tokens
    data = _request("POST", "/chat/completions", body)
    choices = data.get("choices", [])
    if choices:
        print(choices[0].get("message", {}).get("content", ""))
    else:
        print(json.dumps(data, indent=2)[:2000])


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("models")
    p.add_argument("filter", nargs="?")
    p.set_defaults(fn=cmd_models)

    p = sub.add_parser("credits")
    p.set_defaults(fn=cmd_credits)

    p = sub.add_parser("chat")
    p.add_argument("--model", required=True)
    p.add_argument("--prompt", required=True)
    p.add_argument("--system")
    p.add_argument("--max-tokens", type=int)
    p.set_defaults(fn=cmd_chat)

    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
