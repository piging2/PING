---
id: blocked-capability-probe
title: Blocked capability recovery probe
enabled: true
owner: goal:ping-social-outreach-campaign
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-18T14:28:20
  every: 6h
timeout_secs: 600
metadata:
  tags: [cron:automatic-interval-anchor]
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"96fe733e-ce49-4745-b2b9-63bbab812c2b"}'
  presentation_locale: en-US
---
Lightweight recovery probe for BLOCKED browser capabilities (approved policy 2026-09-18, ORCA hardening workstream D): BLOCKED → read-only CDP probe every 6h → evidence-backed success → normal scheduling restored.

Run: `~/workspace/pig-fb/blocked-capability-probe.sh`

It probes each BLOCKED capability in ~/workspace/pig-fb/{ig,th}-capability-state.json with cdp-ig-probe.js (connectOverCDP to the Pig's ig-profile Chrome :9226, 20s timeout, read-only, no navigation, no actions), skipping any capability probed within the last 6h (PROBE_DEFERRED). It records last_probe, probe_result, consecutive_failures, and derived next_probe in the state files, and appends evidence to ~/workspace/goals/ping-social-outreach-campaign/hidden_files/blocked-capability-probes.log.

The probe NEVER restarts, kills, or force-closes the ig-profile Chrome. The manual close/reopen remains the operator's (BLOCKED_EXTERNAL_OPERATOR_ACTION). The ONLY writer allowed to flip BLOCKED → AVAILABLE is ~/workspace/pig-fb/ig-recovery-test.sh; on RECOVERY_DETECTED the probe runs it only if IG_CANARY_POST_URL is configured, otherwise it records RECOVERY_DETECTED_UNLOCK_PENDING and surfaces the operator action in the final message.

Keep runs quiet: report only RECOVERY_DETECTED, INCONCLUSIVE_PIG_UNREACHABLE streaks, or errors. A routine WEDGE_PERSISTS is expected and stays quiet (one evidence-log line).
