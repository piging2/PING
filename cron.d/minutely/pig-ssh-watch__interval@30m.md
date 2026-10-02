---
id: pig-ssh-watch
title: Pig SSH recovery watch (30m, alert-only)
enabled: true
mode: task
schedule:
  kind: interval
  timezone: America/Denver
  at: 2026-09-24T17:17:59
  every: 30m
delivery:
  - chat_id: d96a472e-4130-41a3-bf2d-851477ee9279
metadata:
  tags: [cron:automatic-interval-anchor]
  originating_chat_context_json: '{"chat_id":"76d7c127-fea6-44d1-a77e-1665978229c6","origin_provider":"main","chat_kind":"direct","event_kind":"message","require_mention":false,"device_id":"9d0e7f13-3c74-4270-807d-f10839e6f2ea"}'
  presentation_locale: en-US
---
Pig SSH recovery watch with escalation (30m, alert-on-transition). Diagnosis and alerting only; never a recovery system.

STATE: ~/workspace/pig-fb/.ssh-watch-state.json holds {"consecutive_failures": N, "last_class": "<OK|HOST_UNREACHABLE|TAILNET_OR_NETWORK|SSH_SERVICE|AUTH|WSL_DOWN|UNKNOWN>", "last_alerted_class": "..."}. Create it if missing; update it every run.

PROBE CONTRACTS (fixed 2026-09-25 after a false HOST_UNREACHABLE alarm):
- `~/workspace/pig-fb/pigwsl-exec.sh` reads the script from STDIN (`bash -s`), NOT from `-s`/`$1` args. The correct invocation is: `echo 'echo PIG_OK' | timeout 60 ~/workspace/pig-fb/pigwsl-exec.sh`. Passing `-s 'echo PIG_OK'` as arguments silently produces no output and always fails. Never use the argument form.
- The tunnel proxy at hatch-egress-proxy:3130 accepts UNAUTHENTICATED CONNECT for tailnet targets. Do NOT use curl with credentials in the proxy URL; curl misfires here (407/000/52 flakiness) and produced the false alarm. The reliable TCP probe is a raw CONNECT:
  `timeout 12 python3 -c 'import socket; s=socket.create_connection(("hatch-egress-proxy",3130),timeout=8); s.sendall(b"CONNECT 100.79.154.43:22 HTTP/1.1\r\nHost: 100.79.154.43:22\r\n\r\n"); print(s.recv(12).decode("latin1","replace")); s.close()'`
  A response containing " 200" means the TCP path to the Pig is open.
- Windows-only SSH (bypasses WSL): `timeout 30 ssh -F /home/hatch/.ssh/pig-config -o BatchMode=yes -o ConnectTimeout=10 pigwsl "echo WIN_OK"`

EACH RUN:
1. Run `echo 'echo PIG_OK' | timeout 60 ~/workspace/pig-fb/pigwsl-exec.sh` and look for PIG_OK in the output.
2. If PIG_OK appears:
   - If consecutive_failures was > 0: report loudly to chat "Pig SSH is usable." (recovery transition). Reset state to consecutive_failures 0, last_class OK.
   - Else: stay completely silent.
   - On a confirmed recovery the swarm orchestrator will spawn the D-SHIP lane (staged in ~/workspace/lane-d-impl/SHIP-PLAN.md) and then the EDGE-1 port.
3. If the check fails (timeout, non-zero exit, or no PIG_OK): increment consecutive_failures.
   - While consecutive_failures < 4: stay completely silent. Just update the state file.
   - When consecutive_failures reaches 4, and on every run while it stays >= 4: run the READ-ONLY diagnostic and classify exactly one of:
     * TAILNET_OR_NETWORK: local Tailscale is not connected. Check with `tailscale status`; anything other than Connected puts you here. No further probes needed.
     * HOST_UNREACHABLE: Tailscale is connected but the raw CONNECT probe above does NOT return " 200". There is no TCP route to the Pig (tailnet IP 100.79.154.43) port 22.
     * WSL_DOWN: the CONNECT probe returns 200 AND the Windows-only SSH prints WIN_OK, but the full pigwsl-exec (Windows -> WSL) check fails. The route and Windows SSH are fine; the WSL layer is not responding.
     * SSH_SERVICE: CONNECT probe returns 200 but the Windows-only SSH fails or times out (and stderr does not show an auth rejection).
     * AUTH: an SSH banner/handshake is received but authentication is rejected ("Permission denied" in stderr).
     * UNKNOWN: the diagnostic is inconclusive or none of the above cleanly applies. Never guess; UNKNOWN is a valid answer.
   - Record evidence every classified run: append the timestamp, classification, consecutive-failure count, and raw probe outputs to ~/memory/YYYY-MM-DD.md under a "Pig SSH watch" heading, and update the state file's last_class.
   - Alert loudly to chat ONLY on classification transition (new class != last_alerted_class, or the first escalation at 4 failures). The alert names the classification and the evidence location. Do NOT repeat the alert on subsequent runs with the same classification. Keep checking every 30m regardless of state.
4. HARD LIMITS: never restart, reboot, kill processes, or mutate firewall rules on any machine. No automatic recovery actions of any kind. No credential handling. Do not run other commands, do not touch production, do not retry in a loop within a run. This turns darkness into actionable state without creating a recovery system.
