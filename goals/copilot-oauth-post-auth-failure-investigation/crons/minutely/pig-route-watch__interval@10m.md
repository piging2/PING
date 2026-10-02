---
id: pig-route-watch
title: Pig route watch (10m, emergency diagnostics)
enabled: true
owner: goal:copilot-oauth-post-auth-failure-investigation
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-17T14:21:20
  every: 10m
delivery:
  - chat_id: d96a472e-4130-41a3-bf2d-851477ee9279
metadata:
  originating_chat_context_json: '{"chat_id":"d96a472e-4130-41a3-bf2d-851477ee9279","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"762ed945-64a8-49ff-94f4-9a3332c8a8e4"}'
  presentation_locale: en-US
---
Check Pig reachability via the layered health check. Run: `python3 ~/workspace/goals/copilot-oauth-post-auth-failure-investigation/hidden_files/pig-health-check.py 2>&1`.

The script tests three layers and reports one of:
- PIG_REACHABLE: All layers OK.
- PROXY_UNAVAILABLE: Cannot TCP-connect to hatch-egress-proxy:3130.
- TAILSCALE_UNREACHABLE: Proxy accepts but CONNECT tunnel fails.
- PIG_UNREACHABLE / SSH_UNAVAILABLE: Tunnel OK but SSH banner fails.
- ROUTE_UNAVAILABLE: DNS resolution fails.

EMERGENCY RULE (Nolan 2026-10-01, binding core directive): a Pig route failure is an EMERGENCY unless the current time falls inside a commute blackout window: Monday-Friday, America/Denver, 07:00-07:45 or 15:45-16:45. Inside the window the outage is expected: stay silent. Outside the window, a non-reachable result is a PIG ROUTE EMERGENCY: report immediately with the word EMERGENCY up front, the specific failure layer, timestamp, and commute-window status (outside).

If result is PIG_REACHABLE, stay silent (healthy). Do not notify.

This is a Pig access infrastructure issue, not a Pig outage. Do not say "Pig is down" unless the failure is at the SSH layer with the proxy and Tailscale both healthy.

This is Pig availability monitoring only via the Tailscale tunnel proxy. It does not route OAuth traffic. Read-only diagnostics only; never restart, reboot, kill, or reconfigure anything.
