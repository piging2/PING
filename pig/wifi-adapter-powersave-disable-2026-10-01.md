# PIG POWER LANE: Wi-Fi adapter battery power-save disabled (narrow change)
Evidence file: 2026-10-01. Directive: Nolan, binding (2026-10-01 ~13:22 MDT):
change the narrow proven mechanism — the Wi-Fi adapter's battery power-saving
behavior that permits the adapter to be powered down. Smallest setting change
only; no unrelated powercfg changes; no firmware/thermal/battery-protection
changes (none touched).

## BEFORE (2026-10-01 ~13:28 MDT, read-only probe)
- Power source: AC (Win32_Battery BatteryStatus=2), charge 100%.
- Wireless adapter: `Wi-Fi` / Intel(R) Wi-Fi 6E AX211 160MHz, Status Up.
  Registry key: HKLM\...\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}\0000
  (DriverDesc verified).
- PnPCapabilities: ABSENT (= 0x0 default) => Device Manager checkbox
  "Allow the computer to turn off this device to save power" was CHECKED:
  the OS was permitted to power down the Wi-Fi adapter (e.g. during Modern
  Standby on battery — the isolated route-kill mechanism).
- Set-NetAdapterPowerManagement exists but has NO parameter for this checkbox
  (only offloads / selective-suspend / wake / device-sleep-on-disconnect),
  so the registry path is the correct control.
- Unchanged, recorded for context: Wireless Adapter Settings power-saving
  mode on DC = 0x2 (Medium Power Saving); STANDBYIDLE AC/DC = Never (prior lane).

## CHANGE (2026-10-01 ~13:30-13:32 MDT)
Single narrow change: PnPCapabilities 0x0 -> 0x10 (16) on the Intel AX211 key
only. Bit 0x10 = uncheck "Allow the computer to turn off this device to save
power". Wake capability bits preserved (WakeOnMagicPacket/WakeOnPattern stay
Enabled). No other adapter, no power plan, no firmware/thermal setting touched.
To make the PnP power policy effective immediately, the adapter was restarted
via Disable-NetAdapter/Enable-NetAdapter, guarded by a one-time SYSTEM
scheduled task (PigWifiReenable, fired 13:32 Pig-local, then deleted).
Planned route outage ~13:30-13:32 during the restart — this is the
TAILSCALE_UNREACHABLE blip pig-route-watch logged at 13:31 MDT, NOT a
spontaneous failure and NOT a power-save event. Tunnel verified TUNNEL_OK at
~13:33 MDT.
Scripts: ~/workspace/pig/power-lane/{probe-before,probe-cmdlet,apply-change,reenable,probe-after}.ps1
Pig-side copies: C:/Users/nolan/pig-power-lane/

## AFTER (2026-10-01 ~13:34 MDT, re-read)
- PnPCapabilities = 16 (0x10): OS may NOT turn off the Wi-Fi adapter.
- Adapter Wi-Fi Status: Up, Intel(R) Wi-Fi 6E AX211 160MHz (recovered cleanly
  from the restart; watchdog confirmed Up, task deleted).
- Power source: AC, 100%. No new Kernel-Power 506/507 entries across the
  change window (last: 12:45:06 enter / 12:55:20 exit, pre-change).

## ROLLBACK (exact, if needed)
Remove-ItemProperty -Path \
"HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e972-e325-11ce-bfc1-08002be10318}\0000" \
-Name PnPCapabilities
(restores absent = default 0 = checkbox checked). Then restart the adapter the
same guarded way, or reboot.

## OBSERVED BEHAVIOR

### Bounded post-change observation (2026-10-01 13:33:58–13:52:16 MDT)
10 route probes (egress proxy -> Tailscale -> Windows SSH, `pig "echo ALIVE"`),
120 s apart: **10/10 ROUTE_OK**, zero failures. Log:
~/workspace/pig/power-lane/observation-2026-10-01.log

### Modern Standby entries during the window (post-change, on AC)
- 13:39:24 enter -> 13:39:43 exit
- 13:46:20 enter -> 13:46:27 exit
- 13:51:32 enter -> (no exit logged by 13:53 query; probe 10 at 13:52:14
  returned ROUTE_OK while the entry was still open)
The route survived all three post-change Modern Standby entries, including
one probe taken mid-entry.

### Honest limits of this observation
- The Pig was on AC (100%) for the whole lane. The previously failing
  condition is Modern Standby **on battery**; it did not occur, so a
  battery-condition PASS/FAIL is NOT established today.
- AC standby entries did not kill the route before the change either
  (12:45 10-min entry), so AC survival is a no-regression signal, not proof
  of the battery fix.
- What IS established: the single narrow setting is in effect
  (PnPCapabilities=16 read back), the adapter restarted cleanly, no new
  failure modes appeared, and the route is stable across post-change
  standby entries.

### Definitive proof still requires a battery window
Either (a) the next natural unplug: pig-route-watch (5-min) will page
PIG ROUTE EMERGENCY on failure or stay silent on survival; or (b) Nolan
unplugs the Pig for ~15 min while idle so a battery Modern Standby entry
occurs under observation. If the route dies in a battery standby again:
ROLL BACK via the exact command above and reassess (next candidate would be
the Wireless Adapter Settings power-saving mode on DC, currently 0x2
Medium — deliberately NOT changed in this lane).

### Attribution note
The 13:31 MDT TAILSCALE_UNREACHABLE logged by pig-route-watch was this
lane's planned adapter restart (~13:30:xx disable -> 13:32 watchdog
re-enable), not a spontaneous outage and not a power-save event. Excluded
from reachability evidence per parent instruction.
