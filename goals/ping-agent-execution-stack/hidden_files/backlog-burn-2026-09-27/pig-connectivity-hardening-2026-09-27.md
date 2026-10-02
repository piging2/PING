# Pig connectivity hardening — 2026-09-27

## Incident
- Outage: ~11:11 MDT to ~12:47 MDT (about 3.5h). Signature: proxy TCP to
  hatch-egress-proxy:3130 OK, CONNECT tunnel returned empty response /
  broken pipe, SSH never reached. Class: TAILSCALE_UNREACHABLE / PROXY_FAILED.
- Recovery: 12:47 MDT (pig-ssh-watch probe PIG_OK, consecutive_failures 3 -> 0).

## Root cause diagnosis (Pig-side evidence)
PROVEN:
- The Pig never slept during the outage. Zero Kernel-Power 506/507
  (Modern Standby enter/exit) events between 17:00 and 18:50 UTC.
  Standby cycling only began 12:38 MDT, after/during recovery, while Nolan
  was physically at the machine (power-source-change events 12:38:51, 12:43:57).
- No reboot: Windows uptime since 2026-09-16 10:00:07 AM (11 days).
- tailscaled.exe running continuously since boot (PIDs from 09/16);
  Tailscale service Running/Automatic; no Service Control Manager events
  for Tailscale in the window.
- WiFi stayed associated: DHCP lease obtained 2026-09-25 3:58 PM, no
  WLAN-AutoConfig connect/disconnect events 17:00-18:50 UTC. Currently
  connected to NETGEAR88 at 85% signal, 192.168.1.5, gateway 192.168.1.1.
- Wired Ethernet (Intel I219-LM) link DISCONNECTED four times during the
  outage window: 11:10:22, 11:15:26, 11:43:26, 12:11:28 MDT (e1dexpress
  event 27, "Network link is disconnected"). It is still physically
  disconnected now.
- Recovery coincided with Nolan's physical interaction: network
  disconnect/reconnect at 12:39:03 / 12:43:58-59 (NetworkProfile 10001 ->
  10000) and standby cycles 12:38-12:48, transport back at 12:47.
- tailscale netcheck now: UDP true, public IPv4 72.174.13.159:50061,
  nearest DERP Denver 18.5ms, UPnP port mapping working.

NOT PROVEN (honest UNKNOWN):
- The exact wedged layer. Candidates: (a) Windows kept a dead default
  route / socket state after the wired NIC flapped while WiFi stayed
  associated; (b) the home router/switch had an upstream event that took
  the wired switch ports down repeatedly (WiFi radio stayed up);
  (c) the egress proxy's own tailnet path to the Pig failed (proxy TCP
  stayed reachable, so the proxy process was alive; only its upstream
  dial to 100.79.154.43:22 failed). The Pig-side link flaps correlate
  exactly with the outage window, so (a)/(b) are the leading theories.
- Sleep was already ruled out by Nolan and is confirmed ruled out by the
  event log. Power policy was verified and NOT changed: Balanced scheme,
  AC standby 1800s (0x708), DC standby 1200s (0x4b0).

## Headed Chrome (CDP :9223)
- HEALTHY. `http://127.0.0.1:9223/json/version` answers: Chrome/153.0.8010.53.
  No restart was needed.
- Documented recovery if it ever drops: `schtasks /run /tn PigiFBLogin`
  relaunches the headed Chrome (see ~/workspace/pig-fb/ensure-cdp.sh).
  Per-port probe: ~/workspace/pig-fb/cdp-health.sh (9223 fb, 9225 x, 9226 ig, 9227 tt).

## Hardening implemented (job-scoped, reversible)
1. Pig-side self-healing watchdog:
   - Files: C:\Users\nolan\ping-tunnel-watch\watchdog.ps1,
     watchdog.log, state.json.
   - Scheduled Task `PING-TunnelWatch`: every 5 minutes, as SYSTEM,
     NO wake-to-run (does not keep the machine awake; only heals the path
     while awake).
   - Every run checks: (1) default IPv4 gateway ping (2s timeout),
     (2) `tailscale netcheck` => UDP true + DERP latency present
     (ICMP tailscale ping is NOT used: this tailnet's op nodes do not
     answer it, verified), (3) sshd Running + :22 listening.
   - Remediation (consecutive-failure gated, 30-min cooldown each, all logged):
     gateway dead 2x -> ipconfig /renew; tailnet dead 3x with gateway OK ->
     Restart-Service Tailscale; sshd down -> Restart-Service sshd.
   - Never: reboot, firewall changes, power-policy changes, broad process
     kills, wake.
   - Verified live: manual `schtasks /run` => gateway=OK tailnet=OK sshd=OK.
   - Removal: `schtasks /delete /tn "PING-TunnelWatch" /f` then
     `rmdir /s /q C:\Users\nolan\ping-tunnel-watch`.
2. Local-side detection cron `pig-tunnel-watch` (5m, goal-owned by
   ping-agent-execution-stack): runs
   ~/workspace/ops-watches/check-pig-tunnel-watch.sh (raw CONNECT probe,
   the reliable probe from the pig-ssh-watch contract). Detection only;
   re-establishment is Pig-side. Reports on transition / every 6th
   consecutive failure; silent when healthy. State:
   ~/workspace/pig-fb/.tunnel-watch-state.json.
   - Removal: cron.remove id pig-tunnel-watch + delete the script and state file.
3. Existing watches left in place: pig-ssh-watch (30m), pig-route-watch (10m),
   ops-watch-gateway (5m).

## What was NOT done (standing rules)
- No power-policy change (verified 1800/1200, left alone; no global
  never-sleep). The watchdog does not prevent sleep; it heals the tunnel
  path whenever the machine is awake. If Nolan wants zero sleep-related
  risk windows, that is his explicit call, not ours.
- No reboot, no firewall changes, no broad kills, no credential handling.
- The flapping wired NIC was left as-is (currently disconnected, not
  flapping). Recommendation for Nolan: if the Ethernet cable is plugged
  into a dead switch port, unplug it or disable the adapter in Device
  Manager to stop future route flaps; or replace the cable/port.

## Stability verdict
- Layered health check PIG_REACHABLE 3/3 across spaced probes:
  18:58:05Z, 18:59:35Z, 19:01:06Z (tunnel TUNNEL_OK, SSH banner
  SSH-2.0-OpenSSH_for_Windows_9 each time).
- Watchdog live-run 12:57 MDT: gateway=OK tailnet=OK sshd=OK.
- Detection cron `pig-tunnel-watch` enabled, first run ~13:03 MDT.
- VERDICT: route stable at hardening time. Root cause of the 11:11-12:47
  window: not sleep, not reboot, not tailscaled restart; wired-NIC link
  flaps correlate exactly with the window, exact wedged layer UNKNOWN
  (see diagnosis). The watchdog now self-heals the observed failure
  classes; the 5m CONNECT probe will catch the next one within minutes.
