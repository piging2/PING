# DRAFT — Machine-level monitoring classification
# Determines the failed layer. Never reports "Pig frozen" from a missing port.

## Layer stack (checked top-down; first failure names the incident)
1. PROBE TRANSPORT (local): hatch-egress-proxy:3130 TCP + CONNECT.
   Fail here => classification UNKNOWN (transport), never "Pig down".
2. HOST: UP / ASLEEP / RESUMING / DOWN / UNKNOWN
3. WINDOWS: UP / DOWN
4. TAILSCALE: UP / DOWN
5. WSL: UP / DOWN
6. DOCKER: UP / DOWN   (daemon + ping-postgres + ping-gateway containers)
7. GATEWAY: UP / DOWN  (/health)
8. FYD: UP / DOWN      (:3100 local + tailnet probe)
9. BROWSER AUTOMATION: UP / DOWN (CDP 9223/9225/9226/9227 + one-driver lock state)

## HOST state determination (evidence-typed, no guessing)
- UP: SSH probe answers within timeout.
- ASLEEP: SSH fails AND positive standby evidence exists:
  (a) SleepStudy session with entry time near the failure window and no exit, or
  (b) on next successful contact, Kernel-Power 506 with timestamp in the window
      and no matching 507 before contact, or
  (c) Power-Troubleshooter wake source on resume pointing at the window.
  "SSH down" alone is NEVER sufficient for ASLEEP.
- RESUMING: SSH fails but the host answered a probe <10 min ago and a 506/507
  pair (exit) was observed, or tunnel state is flapping during a known wake.
- DOWN: SSH fails for >30 min with NO standby signature (no 506 in the window
  on next contact, no SleepStudy session) and no transport failure.
- UNKNOWN: probe transport failed (proxy/CONNECT), or SSH failed with no
  standby evidence yet and insufficient time to distinguish. UNKNOWN is
  legitimate and must not be collapsed into ASLEEP or DOWN.

## Retroactive reclassification
When the host is next reachable, the classifier re-examines the window's
Kernel-Power/SleepStudy evidence and reclassifies UNKNOWN -> ASLEEP or DOWN
with the evidence attached. The health log records both the at-the-time and
the reclassified state.

## Per-layer determination
- WINDOWS: UP if WMI responds and LastBootUpTime is sane and no Event 41
  (unexpected shutdown) since last check; DOWN otherwise.
- TAILSCALE: UP if the Tailscale service is Running and `tailscale status`
  shows the tailnet; DOWN if service stopped/absent or status fails.
- WSL: UP if `wsl -l -v` lists Ubuntu Running; DOWN otherwise.
- DOCKER: UP if daemon answers and ping-postgres + ping-gateway are running;
  DOWN otherwise.
- GATEWAY: UP if /health returns 200 healthy; DOWN on connect/refused/5xx;
  UNKNOWN on probe-transport failure.
- FYD: UP if :3100 answers 200 (local) — tailnet :3100 flakiness is reported
  as its own NETWORK observation, not as FYD DOWN.
- BROWSER AUTOMATION: UP if all 4 CDP ports answer and the one-driver lock is
  in a sane state; DOWN names the dead ports.

## Alerting rule
Alert on first transition into any non-UP state (except UNKNOWN, which pages
only if it persists >30 min or repeats 3 consecutive checks). Recovery posts
one "recovered" line with the retroactive classification. No alert storms:
while a non-UP state persists, at most one reminder per 6th consecutive check.

## What changes in pig-health.sh
The script keeps its read-only probes but its state machine adopts the HOST
five-state model and the layer stack above. The "evidence-weighted standby"
heuristic is replaced by the positive-evidence rule: without 506/SleepStudy
evidence, an SSH failure is UNKNOWN, not ASLEEP. The at-the-time UNKNOWN is
reclassified on next contact.
