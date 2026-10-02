# PIG POWER POLICY: automatic sleep/idle = NEVER on AC and battery
Evidence file: 2026-10-01. Directive: Nolan, verbatim "PIG POWER POLICY — AUTHORIZE NOW"
(2026-10-01 ~13:06 MDT). Executor: Pigi subagent via ssh pigwsl.

## Binding directive (summary)
Pig is an automation/worker host; availability outranks battery conservation.
Set automatic sleep/idle timeout to NEVER on BOTH AC and battery at the
OS power-plan layer (no wake-lock hacks, no synthetic activity). Capture
before-values, make the smallest host-level change, re-read effective policy
after applying, then run a bounded observation past the previously implicated
idle interval. Report BEFORE -> CHANGE -> AFTER -> OBSERVED BEHAVIOR.
Safety boundary honored: no firmware/hardware battery protection, thermal
shutdown, or battery-management safety cutoffs touched or disabled.

## BEFORE (recorded by wave coordinator, 2026-10-01 ~11:56 MDT)
Scheme: Balanced (381b4222-f694-41f0-9685-ff5bb260df2e)
- SUB_SLEEP / STANDBYIDLE (Sleep after): AC = 0x708 (1800 s = 30 min), DC = 0x0 (Never)
- SUB_VIDEO / VIDEOIDLE (Turn off display after): AC = 0x78 (120 s), DC = 0x78 (120 s)
  -- left UNCHANGED per directive (display may turn off; must not suspend worker)

## CHANGE
1. Coordinator change, 2026-10-01 ~12:17 MDT: `powercfg /change standby-timeout-ac 0`
   (AC 30 min -> Never). Evidence: ~/workspace/pig/host-policy-ac-sleep-2026-10-01.md.
2. This task's directed change (AC AND battery -> Never): on re-read, BOTH values
   were already 0x0. standby-timeout-dc has been Never since at least the 11:56
   reading. No change was necessary; NOTHING was changed in this task. No other
   power settings (thermal, CPU, display, lid, hibernation, wake timers, updates)
   were touched.

## AFTER (re-read by this task, 2026-10-01 ~13:08 MDT, `powercfg /query SCHEME_CURRENT`)
- SUB_SLEEP / STANDBYIDLE: AC = 0x00000000 (Never), DC = 0x00000000 (Never)
- SUB_SLEEP / HIBERNATEIDLE: AC = 0x0 (Never), DC = 0x7fffffff (~68 y, effectively Never)
- SUB_SLEEP / HYBRIDSLEEP: AC = On, DC = On (unchanged)
- Allow wake timers: AC = Enable, DC = Disable (unchanged)
Target state (AC + idle -> AWAKE, BATTERY + idle -> AWAKE) is in effect at the
powercfg layer for the two directed settings.

## Rollback (exact)
  powercfg /change standby-timeout-ac 30
(30 = minutes; restores the coordinator's 0x708 before-value. DC was already
Never and needs no rollback. Run via the Pig the same way the change was made.)

## OBSERVED BEHAVIOR

### Event-log forensics (System log, Microsoft-Windows-Kernel-Power, 506/507/105)
All 506 events carry Reason: Idle Timeout. 507 exits are Input Touchpad/Keyboard
(Nolan actively using the machine through the day).

Timeline (Pig local, MDT):
- 09:50:00 enter -> 09:54:27 exit (AC)
- 11:24:40 power source change: AcOnline=false (UNPLUGGED, battery 100%)
- 11:27:26 enter -> 11:28:33 exit (battery)
- 11:30:34 enter -> 11:34:26 exit (battery)  <-- route died ~11:31, self-recovered
- 11:34:44 power source change: AcOnline=true (RE-PLUGGED, battery 95%)
- 11:40:04 enter -> 11:41:05 exit (AC)
- 11:46:10 enter -> 11:48:54 exit (AC)
- 12:40:21 enter -> 12:40:31 exit (AC)   <-- AFTER the 12:17 AC->Never change
- 12:45:06 enter -> 12:55:20 exit (AC)   <-- AFTER the 12:17 AC->Never change

### Findings
1. The directed change is INSUFFICIENT as a fix. 506 "Idle Timeout" entries
   continued at 12:40 and 12:45 PM, after standby-timeout-ac was set to 0.
   The standby idle timeout does not govern Modern Standby entry on this system
   (entries follow display-off/idle on S0 regardless of the STANDBYIDLE value).
2. The ROUTE-LOSS mechanism is narrower than "idle -> standby". The route died
   ONLY inside the battery window (11:24:40-11:34:44). On AC, even a 10-minute
   Modern Standby entry (12:45:06-12:55:20) does NOT kill the route.
   Mechanism: battery + Modern Standby -> WiFi adapter power-save disassociation
   -> Tailscale CONNECT failure -> SSH unreachable. The operative control is the
   WiFi adapter's battery power management, not the standby idle timeout.
3. The WiFi-adapter power-management layer was NOT changed: Nolan's directive
   forbids altering unrelated settings unless independently proven and reported
   first. This is that report: the next boundary is the wireless adapter's
   "allow the computer to turn off this device" / power-saving-mode on battery.
   Changing it needs Nolan's explicit word.

### Bounded observation (past the old 30-min AC idle interval)
Method: 14 SSH transport probes (proxy -> Tailscale CONNECT -> SSH banner),
3 minutes apart (~42 min total, past the previous 0x708/30-min AC timeout),
no synthetic activity on the host (probes do not reset the Windows idle timer).
Baseline 506 count at start: 7 (last 10 h).
RESULT: pending (background run in progress at time of writing).
