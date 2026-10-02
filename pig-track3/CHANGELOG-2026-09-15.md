# TRACK 3 change log — 2026-09-15 (editors + terminals, WSL as engineering plane)

## VS Code 1.137.0 (User install, nolan)
- Config: C:\Users\nolan\AppData\Roaming\Code\User\settings.json
- Backup: settings.json.bak-20260915 (same dir). Prior .bak files left untouched.
- Added: "terminal.integrated.profiles.windows"."Ubuntu (WSL)" -> C:\Windows\System32\wsl.exe -d Ubuntu
- Added: "terminal.integrated.defaultProfile.windows" = "Ubuntu (WSL)"
- Installed: ms-vscode-remote.remote-wsl v0.104.3 (was missing; Cursor already had anysphere.remote-wsl)
- Runtime state nudge: globalStorage/storage.json (backup storage.json.bak-20260915),
  windowsState.lastActiveWindow.folder: file:///c:/Users/nolan/PING -> vscode-remote://wsl%2Bubuntu/home/nolan/ping;
  stale backupPath removed. VS Code rewrites this file at runtime, so this is a nudge, not a lock.

## Cursor 3.16.17 (User install, nolan)
- Config: C:\Users\nolan\AppData\Roaming\Cursor\User\settings.json
- Backup: settings.json.bak-20260915 (same dir).
- Added: same "Ubuntu (WSL)" terminal profile + defaultProfile.windows = "Ubuntu (WSL)".
- Already had: anysphere.remote-wsl-1.0.13; last active window already vscode-remote://wsl+ubuntu/home/nolan/ping;
  ~/.cursor-server already exists in WSL.

## Windows Terminal
- Config: C:\Users\nolan\AppData\Local\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json
- Backup: settings.json.bak-20260915 (same dir).
- defaultProfile: {61c54bbd-c2c6-5271-96e7-009a87ff44bf} (Windows PowerShell)
  -> {fe59664b-10ce-556b-87d2-11f760c2c727} (Ubuntu, source Microsoft.WSL)
- All profiles retained: Windows PowerShell, Command Prompt, Azure Cloud Shell, Ubuntu.

## Verification (2026-09-15)
- A: remote-wsl present both editors; Cursor already opened /home/nolan/ping via WSL remote (storage.json).
- B: C:\Windows\System32\wsl.exe -d Ubuntu -- bash -c 'whoami; pwd; ls -d /home/nolan/ping' as nolan -> OK.
- C: default terminal/profile = Ubuntu (WSL) in all three tools.
- F: no settings.json references C:\Users\nolan\PING; VS Code lastActiveWindow no longer the Windows mirror.
- G: no new ping/PING dirs under C:\Users\nolan; no git repos touched; no deletions.

## Known limitations
- GUI click-through not possible from here; terminal behavior verified via the exact command the profile runs.
- ~/.vscode-server installs on first Remote-WSL connect (not pre-seeded).
- python.defaultInterpreterPath still Windows-side uv Python (correct for Windows-side windows; remote windows govern their own).
