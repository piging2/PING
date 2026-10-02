---
id: pig-power-soak-proof-2026-09-27
title: Pig always-on policy steady-state proof
enabled: false
owner: goal:pig-ac-only-no-sleep-policy-soak-proof
mode: task
schedule:
  kind: runonce
  timezone: America/Denver
  at: 2026-09-27T17:50:00
metadata:
  originating_channel_context_json: '{"originating_channel":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"762ed945-64a8-49ff-94f4-9a3332c8a8e4"}'
  presentation_locale: en-US
  paused_for_completed_goal_id: goal_25c3cf324658
---
Verify the steady-state proof for the Pig ALWAYS-ON power policy applied 2026-09-27 ~16:53 MDT (America/Denver), which superseded the 16:11 AC-only policy per Nolan's direct override. Expected effective policy: sleep NEVER on AC and on battery; display independent (AC 15 min, DC 2 min); hibernate/critical-battery/thermal protections untouched. Window: 16:53 MDT to now (~17:50 MDT).

Change record: ~/workspace/pig/power-policy-change-2026-09-27.md (includes the supersession entry). SSH helper: `source ~/workspace/pig-fb/pig-ssh.sh`, then `PIG_TIMEOUT=25 pig_ssh '<command>'` for Windows shell or `pig_scp <local> "$PIG:C:/path"` to copy files up.

Collect and report each criterion with one evidence line:

1. EFFECTIVE POLICY: read back via `powercfg /query SCHEME_CURRENT SUB_SLEEP` and `SUB_VIDEO` (grep the "Current" index lines; do NOT trust that the set commands succeeded). PASS = Sleep after AC 0x00000000 and DC 0x00000000; Turn off display AC 0x00000384 (15 min) and DC 0x00000078 (2 min).

2. NO STANDBY TRANSITION: count Kernel-Power Event ID 506 (standby entries) in the Pig's System log with StartTime >= '2026-09-27 16:53'. Suggested robust method: write a tiny probe .ps1 locally (Get-WinEvent -FilterHashtable @{LogName='System'; Id=506; StartTime='2026-09-27 16:53'} piped to a count), pig_scp it to the Pig, run with `powershell -NoProfile -ExecutionPolicy Bypass -File`, then delete the remote copy. PASS = count 0. If the Pig is unreachable via SSH, that is a FAIL finding (tunnel down), not a pass.

3. TUNNEL CONTINUITY: inspect the tunnel-watch state and logs under ~/workspace/pig/ and ~/memory/2026-09-27.md for the window 16:53-17:50 MDT. Every probe in the window must show TUNNEL_OK / healthy. List any failure entries with timestamps.

4. HEARTBEAT CONTINUITY: same window for the Pig health heartbeat (15m cadence): all checks healthy, no HOST_ASLEEP or NETWORK_DOWN classifications.

5. REPRESENTATIVE AUTOMATION: the Facebook engagement pass dispatches 17:26 MDT with collection ~17:35 MDT. Check its logs for successful dispatch AND collection against the Pig. Note any other automation that ran in-window and whether it reached the Pig.

6. VERDICT: SOAK PASS or SOAK FAIL with the evidence. If FAIL, name the failing criterion and quote the evidence. Do NOT attempt repairs; do not change power settings.

Write a short proof summary to ~/workspace/pig/power-soak-proof-2026-09-27.md and report the verdict plus one line per criterion back to the main chat. Stay silent on routine healthy details beyond the verdict lines.
