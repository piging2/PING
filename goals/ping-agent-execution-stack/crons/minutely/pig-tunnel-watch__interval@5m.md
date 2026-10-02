---
id: pig-tunnel-watch
title: 'Pig tunnel watch: CONNECT probe (5m, emergency diagnostics)'
enabled: true
owner: goal:ping-agent-execution-stack
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-27T13:03:02
  every: 5m
timeout_secs: 120
delivery:
  - chat_id: d96a472e-4130-41a3-bf2d-851477ee9279
metadata:
  tags: [cron:automatic-interval-anchor]
  originating_chat_context_json: '{"chat_id":"d96a472e-4130-41a3-bf2d-851477ee9279","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"762ed945-64a8-49ff-94f4-9a3332c8a8e4"}'
  presentation_locale: en-US
---
Pig tunnel watch (5m, detection + emergency diagnostics). Run `~/workspace/ops-watches/check-pig-tunnel-watch.sh`; it prints one line and exits 0 on TUNNEL_OK, 1 on TUNNEL_FAIL.

EMERGENCY RULE (Nolan 2026-10-01, binding core directive): a Pig route failure is an EMERGENCY unless the current time falls inside a commute blackout window: Monday-Friday, America/Denver, 07:00-07:45 or 15:45-16:45. Inside the window the outage is expected: log quietly to ~/memory/YYYY-MM-DD.md under a "Pig tunnel watch" heading and do not report. Outside the window it is a PIG ROUTE EMERGENCY.

On EMERGENCY (TUNNEL_FAIL outside the commute window): immediately run the layered diagnostics in the same run: `python3 ~/workspace/goals/copilot-oauth-post-auth-failure-investigation/hidden_files/pig-health-check.py 2>&1`. Localize the first failing boundary (proxy TCP / Tailscale CONNECT / SSH banner / DNS). Report: the word EMERGENCY up front, the failure layer, consecutive failure count, timestamp, commute-window status (outside), and the localized boundary. This is detection plus read-only diagnostics only.

Re-establishment lives on the Pig as Scheduled Task `PING-TunnelWatch` (every 5 min, as SYSTEM, no wake-to-run): it self-heals gateway loss (ipconfig /renew), a wedged Tailscale path (targeted Restart-Service Tailscale after 3 consecutive failures with gateway OK), and sshd loss. This cron never remediates from the cloud side; never restart, reboot, kill, or reconfigure anything; never touch the Pig beyond the read-only probes.

Reporting: on TUNNEL_OK stay silent (if the state file showed a prior failure count, note the recovery transition once, then stay silent). On TUNNEL_FAIL inside a commute window: memory log only, no report. On TUNNEL_FAIL outside the window: report the emergency on transition (first failure after a healthy stretch) and repeat every 6th consecutive failure while it persists. State: ~/workspace/pig-fb/.tunnel-watch-state.json. Log transitions to ~/memory/YYYY-MM-DD.md under a "Pig tunnel watch" heading.
