---
name: "typesafe"
description: "Use Typesafe when the user asks for Typesafe or this provider's API."
---

# Typesafe

## Purpose
Use Typesafe with the user-connected `custom.typesafe` credential.

## Tooling
Add service-specific CLIs under `~/workspace/skills/typesafe/bin/`.

Python CLIs must import `/opt/hatch/skills/skill-creator/bin/dynamic_credentials.py` and call `add_surrogate_to_request(...)`, `url_with_surrogate_query_param(...)`, or `url_with_surrogate_path_segment(...)` before authenticated requests, matching where the provider reads the key. If they use `urllib`, read JSON responses with `read_json_response(resp)` from the same helper instead of calling `resp.read()` directly. They must send only `hsurr:*` values, and only to the hosts below.

## Auth
The credential is already stored; nothing here collects one. Never ask the user to paste a raw key in chat, set a secret environment variable, pass a secret flag, or write an auth file.

A 401 or 403 is a question about the request before it is a question about the key. Check that the credential was attached at all: a request built without the helpers named under Tooling carries nothing, and that looks exactly like a wrong or under-scoped token. Only once a request that did carry the credential is still rejected, call `credentials.request_api_access` with `reconnect` to replace it. The connector is stored as `custom.typesafe`.

## Operating Rules
1. Use this skill when the user asks for Typesafe or this provider's API.
2. Restrict authenticated requests to: api.typesafe.ai.
3. Do not print, log, or persist raw credentials.
4. If auth is missing or rejected, follow the Auth section rather than asking for a key.
5. Proven request shapes (verified 2026-09-27 with `bin/ts-smoke.py`):
   - `GET /v1/models` returns 200 with an authenticated key.
   - `POST /v1/systemone` requires `state` plus `questions`; e.g.
     `{"model":"jev-latest","state":{...},"questions":{"q":{"type":"noul","instructions":"..."}}}`
     returns 200 with typed answers under `answers`.
