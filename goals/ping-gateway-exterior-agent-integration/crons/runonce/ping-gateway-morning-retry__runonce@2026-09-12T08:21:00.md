---
id: ping-gateway-morning-retry
title: PING gateway morning retry
enabled: true
owner: goal:ping-gateway-exterior-agent-integration
mode: task
schedule:
  kind: runonce
  timezone: America/Denver
  at: 2026-09-12T08:21:00
timeout_secs: 1800
metadata:
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"becf5bef-af58-41fb-a3d7-aa640cc91b4f"}'
  presentation_locale: en-US
---
PING gateway full troubleshooting and MVP retry, scheduled for Saturday morning per Nolan's order ("put it on hold, do the entire troubleshooting again tomorrow morning").

Objective: rerun the complete systematic pass from scratch and push as far through the exterior-agent MVP as the environment permits, with disciplined forensics at every failure boundary. Report the outcome to Nolan in chat either way; he expects this report.

Known-good facts (treat as established unless live tests contradict):
- Gateway: http://100.79.154.43:8080, numeric address only. Local DNS for `pig` is stale in this runtime; never rely on it.
- The runtime proxy env currently defaults to port 3128, which is ordinary internet egress with NO tailnet route. Every request to the tailnet MUST override the proxy port to 3130 (read the proxy base from env as currently configured, only swapping the port). Never print proxy values or credentials.
- Unauthenticated POST /capabilities returns 401 MISSING_AUTH; that proves the path is alive.
- POST /capabilities is the live route (previously 400 on empty body, now 401 without auth). GET /capabilities, /capabilities/discover, /capabilities/health previously 404; live API behavior is authoritative, so re-probe but expect discovery may be POST-based.
- The two PING credentials (Level 1 and Level 2) were pasted by Nolan in the main conversation on 2026-09-11 ~21:01 MDT and are in context. NEVER print, echo, log, store in files, or expose either value; never log Authorization headers. Use each only inline in its auth-test requests.

Execution:
1. Transport first: confirm proxy port 3130 override works, unauthenticated POST /capabilities returns 401 MISSING_AUTH (path alive). Low-rate retries only if transport fails (immediate x3, 5s x3, 30s x3); classify persistent/intermittent/recovering.
2. Auth retry, canonical `Authorization: Bearer <credential>`, Level 1 then Level 2 independently. Record status, body/error code, latency, PING-vs-proxy origin. Classify failures precisely (network/proxy/TLS/routing/missing auth/invalid auth/authorization/capability validation/downstream).
3. If auth succeeds, continue immediately down the MVP path until a genuine blocker: capability discovery (follow what the live API serves) -> advertised capabilities per principal -> workspace discovery via the API (never assume a path) -> fs.list -> fs.read -> fs.write if authorized (disposable test file only, create/read-back/verify/delete) -> git.status/diff/log (confirm isolated worktree before anything else) -> test.run/build.run only within advertised policy. If command.run is unrestricted or ambiguous, do NOT use it; report as a policy gap.
4. At every failure, walk the hierarchy: client -> proxy -> tailnet/tunnel -> PING host -> HTTP listener -> authentication -> principal resolution -> capability authorization -> workspace scope -> capability implementation -> PING authority -> filesystem/Git/runtime. Do not assume the first error message is the root cause.
5. Classify every capability as exactly one of: VERIFIED / PARTIALLY VERIFIED / BLOCKED / NOT ADVERTISED / NOT AUTHORIZED / NOT IMPLEMENTED / UNAVAILABLE / UNKNOWN.

Stop conditions: never modify canonical PING source; no commits unless the live contract explicitly authorizes AND the worktree is clearly isolated; never push; never touch main; no secrets exposure; no destructive/admin activity; never escape the authorized workspace. If any write occurred, finish with an audit step verifying canonical PING is unchanged.

Logging: append a redacted forensic log to ~/workspace/ping-gateway-diagnostics/mvp-retry-2026-09-12.md (endpoint, method, status, sanitized response, timing, profile, capability, result, failure layer, likely root cause, confidence). No credentials, tokens, cookies, secrets, auth headers, or sensitive filesystem contents. Also append a short dated entry to ~/memory/2026-09-12.md.

Final chat report in this exact structure: 1. OVERALL RESULT 2. AUTH RESULT 3. NETWORK/TUNNEL RESULT 4. LIVE PRINCIPAL / PROFILE 5. CAPABILITY DISCOVERY RESULT 6. MVP OPERATIONS REACHED 7. FIRST REMAINING BLOCKER 8. ROOT CAUSE 9. EVIDENCE 10. NEXT ACTION 11. capability-by-capability status table. If everything succeeds, state explicitly the exterior-agent MVP is end-to-end verified. If something fails, name the exact next layer needing a fix. No em dashes in the report.
