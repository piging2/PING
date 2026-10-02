# Pig ALWAYS-ON power policy soak proof — 2026-09-27

Policy applied 2026-09-27 ~16:53 MDT (Nolan's direct override, superseding the 16:11 AC-only policy).
Soak window: 16:53 MDT -> 17:50 MDT (~57 min untouched, no synthetic keep-awake).
Expected effective policy: sleep NEVER on AC and DC; display independent
(AC 15 min, DC 2 min); hibernate / critical-battery / thermal protections untouched.

Full change record: ~/workspace/pig/power-policy-change-2026-09-27.md

## Criterion 1 — EFFECTIVE POLICY: PASS

Read back via `powercfg /query SCHEME_CURRENT SUB_SLEEP` and `SUB_VIDEO` at ~17:50 MDT
(read-back, not set-command trust):

- Sleep after: AC 0x00000000 (Never), DC 0x00000000 (Never)  -- as expected
- Turn off display: AC 0x00000384 (900s = 15 min), DC 0x00000078 (120s = 2 min)  -- as expected
- Hibernate after: AC 0x00000000, DC 0x7fffffff -- unchanged
- Allow hybrid sleep / wake timers: unchanged
- SUB_BATTERY read-back: critical battery notification ON (AC/DC), critical battery action
  0x00000002 (hibernate, AC/DC), low/critical/reserve levels normal -- protections untouched.
  No SUB_BATTERY / SUB_PROCESSOR (thermal) / power-button setting was ever changed.

## Criterion 2 — NO STANDBY TRANSITION: PASS

Probe method: local .ps1 (`Get-WinEvent -FilterHashtable @{LogName='System'; Id=506;
StartTime='2026-09-27 16:53'}` -> count), copied to Pig via pig_scp, executed with
`powershell -NoProfile -ExecutionPolicy Bypass -File`, remote copy deleted after.
Result: count = 0. Zero Kernel-Power Event ID 506 (standby entries) since 16:53 MDT.

## Criterion 3 — TUNNEL CONTINUITY: PASS

All pig-route-watch probes in the 16:53-17:50 MDT window show PIG_REACHABLE:

- 17:01 MDT: proxy TCP OK, Tailscale tunnel OK, SSH OK
- 17:11 MDT: proxy TCP OK, Tailscale tunnel OK, SSH banner OK
- 17:21 MDT: proxy TCP OK, Tailscale tunnel OK, SSH banner OK (OpenSSH_for_Windows_9.x)
- 17:31 MDT: proxy TCP OK, Tailscale TUNNEL_OK, SSH banner OK
- 17:41 MDT: proxy TCP OK, Tailscale tunnel OK, SSH banner OK
- Pig SSH watch 17:18 MDT: PIG_OK, consecutive_failures 0, no transition, no alert

Zero failure entries in the window. (Note: 3rd outage window of the day ended before
16:53; pass-127's 15:01 MDT DEPENDENCY_FAILURE is pre-window and not counted.)

## Criterion 4 — HEARTBEAT CONTINUITY: PASS

Pig health heartbeat (pig-health-heartbeat, 15m cadence), all in-window runs healthy:

- 16:56 MDT: UP -- SSH, WSL (uptime 52344s), Docker, postgres, gateway, journal_gateway,
  Ask FYD, disk 11%, C: 13.7% free, CDP 4/4, FYD 200/200, watchdog_fyd HEALTHY
- 17:11 MDT: UP -- SSH/WSL/Docker/gateway/postgres/CDP 4-of-4/FYD all ok
- 17:26 MDT: UP -- all checks ok, no transitions

No HOST_ASLEEP, no NETWORK_DOWN, no DEGRADED classification in the window.

## Criterion 5 — REPRESENTATIVE AUTOMATION: PASS

FB engagement pass 133 (representative automation):

- 17:26 MDT dispatch: pass fb-20260927-233121, worker_pid 29520 launched ON THE PIG;
  dispatch verified against live Pig transport (ssh pigwsl PIG_OK), intent ledger marked.
- 17:35 MDT collection: collect_pass.sh ran, progress_lines_recorded=2 for pass
  fb-20260927-233121 (worker alive, writing progress), 0 failures. No ledger/Pig problem.
  -> successful dispatch AND collection against the Pig. Survives.

Other automation in-window (all reached the Pig; noted for completeness):

- Threads engagement pass 128 (17:01): ELIGIBILITY_EMPTY, 0 actions; browser-health
  verified Pig all-UP (16:56 health-state) + direct ssh probe ROUTE_OK.
- IG engagement pass 146 (17:01-17:12): Pig CDP probe 9226 ALIVE, health gate HEALTHY;
  0 candidates (genuine empty per 5/5 positive controls), no action block.
- FB collect runs 17:06 / 17:21: ok; only finding is the pre-existing 77h-stale
  2026-09-24 dispatch (known since 2026-09-24, already RECONCILIATION_REQUIRED, not new).
- TikTok engagement pass 83 (17:45-18:10): Pig SSH healthy; single probe comment on
  @phandroids APPLIED cleanly, then driver ABORTED on TikTok's "temporarily blocked
  from commenting" (genuine TikTok platform restriction; 14 comments never attempted
  per fail-closed policy). Not a Pig failure.

## Supporting: workspace mirror

mirror-workspace-to-pig.sh last ran exit=0 (chunks ok=216 failed=0) at
2026-09-27T22:23:52Z (16:23:52 MDT) -- post-16:11-policy mirror is green. No mirror
run and no mirror failure occurred in the 16:53-17:50 window.

## VERDICT: SOAK PASS

All five criteria pass. Zero standby transitions under the always-on policy;
tunnel and health heartbeat continuously healthy; the representative Facebook
engagement pass dispatched and collected against the Pig in-window. No repairs
attempted; no power settings changed during this run.
