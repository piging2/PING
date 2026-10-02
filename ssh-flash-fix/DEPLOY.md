# SSH flash fix — deploy package (DEPLOYED 2026-09-17 ~09:40 MDT)

Deployed and verified live in two stages (X/PopBrowser/FB, then LI/IG/TT). All seven tasks re-registered with
`-WindowStyle Hidden`, confirmed via Get-ScheduledTask on the registered
tasks (not just the XML files), all in Ready state. Live pre-deploy
exports kept in live-backups-2026-09-17/.

Root cause (verified live 2026-09-17): the visible console flashes come from
Task Scheduler tasks launching powershell.exe without `-WindowStyle Hidden`,
not from the SSH hop itself. Three tasks, one flag each.

Preflight results (run live against the Pig via SSH, exact outputs):

1. `(Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Services\sshd').Type`
   returned `16` (0x10, not interactive). The sshd service CANNOT create
   desktop windows. The session-0 analysis is proven, not inferred.

2. PigiFBLogin (definition was not in the workspace): InteractiveToken,
   triggers at logon AND every 5 minutes, action
   `powershell.exe -NoProfile -ExecutionPolicy Bypass -File
   "C:\Users\nolan\.local\share\pigi\chrome-cdp-watchdog.ps1"` with no
   `-WindowStyle Hidden`. This is a THIRD flash source on the same 5-minute
   metronome, so the package now covers three tasks, not two.

3. Exactly one registration per task name, all in `\` (the doubled lines in
   `schtasks /query /fo list` output were a display quirk, confirmed via
   Get-ScheduledTask).

## Pre-deployment verification (run on the Pig, PowerShell)

COMPLETED live 2026-09-17 via SSH. Results:

1. OpenSSH Server service, desktop interaction: Type = `16` (0x10, not
   interactive). The sshd service CANNOT create desktop windows. Proven.

2. PigiFBLogin task action: InteractiveToken, logon + every-5-min triggers,
   `powershell.exe` WITHOUT `-WindowStyle Hidden`. Third flash source found;
   patched and added to the package below.

## Deploy (run on the Pig, elevated PowerShell, when approved)

```powershell
# 1. Back up the live task definitions
$dir = 'C:\Users\nolan\.local\share\pigi'
Copy-Item "$dir\PigiXLogin.xml" "$dir\PigiXLogin.xml.bak-2026-09-17"
Copy-Item "$dir\PigiPopBrowser.xml" "$dir\PigiPopBrowser.xml.bak-2026-09-17"
Copy-Item "$dir\PigiFBLogin.xml" "$dir\PigiFBLogin.xml.bak-2026-09-17" -ErrorAction SilentlyContinue
# NOTE: PigiFBLogin.xml may not exist as a file on disk even though the task
# is registered. If the backup copy fails, export it first:
# (Export-ScheduledTask -TaskName 'PigiFBLogin') | Out-File "$dir\PigiFBLogin.xml.bak-2026-09-17" -Encoding utf8

# 2. Copy the patched files over (*.hidden.xml -> *.xml)

# 3. Re-register all three tasks
$xml = [System.IO.File]::ReadAllText("$dir\PigiXLogin.xml", [System.Text.Encoding]::UTF8)
Register-ScheduledTask -TaskName 'PigiXLogin' -Xml $xml -Force

$xml = [System.IO.File]::ReadAllText("$dir\PigiPopBrowser.xml", [System.Text.Encoding]::UTF8)
Register-ScheduledTask -TaskName 'PigiPopBrowser' -Xml $xml -Force

$xml = [System.IO.File]::ReadAllText("$dir\PigiFBLogin.xml", [System.Text.Encoding]::UTF8)
Register-ScheduledTask -TaskName 'PigiFBLogin' -Xml $xml -Force

# 4. Confirm the flag landed on the REGISTERED task (the meaningful check)
(Get-ScheduledTask -TaskName 'PigiXLogin').Actions.Exec.Arguments
(Get-ScheduledTask -TaskName 'PigiPopBrowser').Actions.Exec.Arguments
(Get-ScheduledTask -TaskName 'PigiFBLogin').Actions.Exec.Arguments
```

All three should print Arguments containing `-WindowStyle Hidden`.

## Rollback

Restore the .bak files over the live XMLs and re-run step 3 with the originals.

## Notes

- The patch is exactly one line per file across three tasks: `-NoProfile
  -ExecutionPolicy Bypass` becomes `-NoProfile -WindowStyle Hidden
  -ExecutionPolicy Bypass`. Originals in ~/workspace/pig-fb/ are untouched;
  the PigiFBLogin patch was derived from a live export of the registered
  task (byte-identical except the one line).
- Quirk (pre-existing, not introduced): both XMLs declare encoding="UTF-16"
  but are stored as UTF-8 without BOM. The install path reads them with
  explicit UTF-8, so this is harmless; leave it alone.
- Deliberately not changed: the 15+ `pig_ssh "powershell ..."` call sites
  (session-0, already invisible), no global PTY/auth/architecture changes.
- Deferred as broader rework: SSH multiplexing (ControlMaster) to cut the
  ~5 sessions per pass.
