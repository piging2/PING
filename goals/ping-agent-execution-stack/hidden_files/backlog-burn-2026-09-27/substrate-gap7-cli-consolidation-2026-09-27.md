# Gap 7 Implementation: skill-CLI request-envelope consolidation (2026-09-27)

## Discover / understand / classify

Harvest sources read in full: `skills/github/bin/gh-api.py`,
`skills/typesafe/bin/ts-smoke.py`, `skills/vercel/bin/vercel-api.py`,
`skills/x-api/bin/xapi.py`, `skills/x-api/bin/follow-batch.py`, plus the
shared `/opt/hatch/skills/skill-creator/bin/dynamic_credentials.py` and the
401/403 rule in each skill's SKILL.md line ~19-21.

### What was duplicated (the envelope)
- `ensure_allowed_url` + `add_surrogate_to_request` + `read_json_response`
  call pattern (gh-api, vercel-api, ts-smoke get/post each re-stated it)
- HTTPError handling shape: read error body, print/return `HTTP {code}`,
  exit code mapping (gh/vercel: stderr + exit 1; ts-smoke: `(code,
  {"http_error", "detail": body[:200]})`; xapi: `(code, body[:500])`)
- The skill-docs rule "a 401/403 is a question about the request before it
  is a question about the key" existed only in prose, not in code.

### What is per-CLI (untouched)
- Credential names/hosts/base URLs: custom.github/api.github.com,
  custom.typesafe/api.typesafe.ai, custom.vercel/api.vercel.com,
  custom.x/api.x.com
- Extra headers (GitHub Accept + X-GitHub-Api-Version; ts-smoke
  Content-Type; xapi User-Agent), per-call timeouts (30/20/30/60)
- ts-smoke check logic, SystemOne smoke payload, safe diagnostics
- **xapi.py `surrogate()`**: authdc-subprocess-based credential retrieval,
  deliberately NOT migrated to add_surrogate_to_request (per-CLI auth
  logic, do-not-touch). Its follow/like command dispatch and write
  semantics are byte-identical in behavior.
- follow-batch.py: no HTTP envelope at all (subprocess to xapi.py +
  ledger logging) — classified per-CLI, left unchanged.

## Smallest delta

New: `~/workspace/skills/skill-creator/bin/api_call.py`
- `ApiRequestError(status, body)` typed error: keeps raw error bytes,
  decoded `detail`, `is_auth_question` (401/403), `auth_hint()` encoding
  the skill-docs rule. Other errors (DynamicCredentialError, URLError)
  propagate untouched, exactly as before.
- `api_call(method, url, *, credential, entry_name, allowed_hosts,
  extra_headers, data, timeout, response_format="json"|"raw")`:
  allowlist check, header assembly via add_header (same as the CLIs used),
  surrogate attach when credential given (credential=None for xapi's
  pre-attached header), urlopen, JSON/raw read, HTTPError ->
  ApiRequestError with the full raw body preserved.

Each CLI now delegates: gh-api/vercel-api print `HTTP {status}: {detail}`
+ exit 1 on ApiRequestError; ts-smoke converts to its exact
`(code, {"http_error", "detail": body[:200]...})` tuple; xapi converts to
`(status, body.decode()[:500])`.

Deviation from the recon: the recon said "skill-creator/bin", but
`/opt/hatch/skills/skill-creator/bin` is a read-only mount (verified:
touch -> EROFS), so the module lives in a workspace mirror at
`~/workspace/skills/skill-creator/bin/api_call.py`. Each CLI inserts the
workspace path first; `dynamic_credentials` is still imported from /opt.
No git-tracked files were touched (skills/* are untracked in the workspace
repo), so no branch/worktree was needed.

## Falsification evidence

Baselines captured BEFORE the rewrite (/tmp/gap7-baseline), re-run AFTER
(/tmp/gap7-after), all read-only:

| smoke | baseline exit | after exit | output |
|---|---|---|---|
| ts-smoke.py (models + systemone) | 0 | 0 | byte-identical, SMOKE_PASS |
| gh-api.py GET /user | 0 | 0 | byte-identical (login piging2) |
| vercel-api.py GET /v9/projects?limit=1 | 0 | 0 | byte-identical |
| xapi.py me | 1 | 1 | identical RuntimeError: no access_token in custom.x surrogate map (pre-existing; traceback differs only in line numbers) |

Additional proofs:
- Loopback (127.0.0.1 http.server): json/raw success, typed 401 with
  full body bytes + `is_auth_question` + hint, allowlist refusal via
  DynamicCredentialError — LOOPBACK_PASS.
- xapi envelope end-to-end with stubbed surrogate (real network, fake
  token, read-only): returned (403, body[:500]) through the delegated
  path — XAPI_ENVELOPE_PASS.
- gh/vercel 404 error paths (read-only): exit 1, `HTTP 404: {full body}`
  on stderr — same contract as original.
- follow-batch.py: not smoke-testable without side effects (a run would
  perform follows or append batch-start log lines); unchanged code, no
  envelope involved. xapi's "follow" output shape is untouched.

## Open item for parent
- `custom.x` surrogate map currently has NO access_token entry (baseline
  `xapi.py me` fails identically before and after; consolidation did not
  cause this). The x-api credential likely needs
  `credentials.request_api_access` reconnect per the skill doc. Flagged,
  not acted on (out of scope).

GAP7-IMPL VERIFIED
