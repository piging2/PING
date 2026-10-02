# Goose Desktop on the Pig: install + WSL migration (2026-10-01)

## What was installed
- Goose Desktop v1.52.0 (aaif-goose/goose release) at `C:\Users\nolan\AppData\Local\Goose\dist-windows\Goose.exe`.
- Start Menu shortcut and Desktop shortcut both created.
- The Desktop's backend is a bundled `goose.exe serve` (ACP server on 127.0.0.1, TLS, pinned cert).

## How "operates in WSL Ubuntu" was achieved
Goose has no WSL mode. The only Windows shell override is the `GOOSE_SHELL` env var,
read by the Developer extension's shell tool (crates/goose/src/agents/platform_extensions/developer/shell.rs).
A tiny C# shim was compiled on the Pig to `C:\Users\nolan\AppData\Local\Goose\bash.exe`:

- Goose runs `<GOOSE_SHELL> -c "<command>"` for any shell not named pwsh/powershell/cmd.
- The shim writes the command byte-for-byte to a temp .sh file and runs
  `wsl.exe -d Ubuntu bash <script>`, so quoting, pipes, &&, and newlines all survive.
- It is named bash.exe on purpose: goose tells the model the shell is `bash`, which is true.
- The Windows working directory is inherited and wsl.exe translates it to /mnt/<drive>/... automatically.
- Windows user env var `GOOSE_SHELL` points at the shim, so every future launch from
  Nolan's shortcuts picks it up. It is not set inside WSL, so the WSL CLI is unaffected.

Verified: echo/pwd/whoami, nested quotes with pipes, multiline commands, exit code 42
propagation, zero temp-file leaks, and the WSL goose CLI (v1.50.1) is reachable from inside.

Honest limits (not faked):
- Only the Developer extension's `shell` tool runs in Ubuntu. File tools (read/write/edit/tree)
  still run Windows-native against Windows paths. The model must spell WSL paths correctly.
- The UI and backend remain Windows processes. There is no supported WSL backend mode.

## Session migration (10 WSL CLI sessions, reversible)
- Windows data dir found empirically: `%APPDATA%\Block\goose\`
  (config: `...\config`, sessions: `...\data\sessions\sessions.db`). The v1.52.0 backend
  still uses the legacy Block-era paths on Windows.
- WSL source: `/home/nolan/.local/share/goose/sessions/sessions.db` (live data was in the
  1.6 MB WAL, so the copy used the SQLite backup API for a WAL-consistent snapshot).
- Schemas are identical (schema_version 16 both sides); the desktop's fresh empty db was
  backed up before any write.
- Migrated by copy, never by move: 10 sessions, 26 messages, 8 usage_ledger rows.
  Content hashes match exactly between the WSL backup and the desktop db.
- One deliberate translation: session `SMOKE_OK check complete` had working_dir
  `/mnt/c/Users/nolan`, which cannot be a Windows process cwd, so it became
  `C:\Users\nolan` (wsl.exe translates it back on spawn; round trip verified).
- Nine sessions keep Linux working_dirs (/tmp, /tmp/goose-dns-rebinding). No valid Windows
  cwd exists for those, so on resume the shell spawn will fail with a clear OS error and
  the model can navigate elsewhere. Their history is fully intact.
- WSL originals untouched. Reversal: restore `win-sessions-fresh-20261001.db` over the
  desktop sessions.db, or delete the desktop db and relaunch (backend recreates it).

## Backups (also in ~/workspace/goose-migration/)
- `wsl-sessions-backup-20261001.db` (126,976 bytes): WAL-consistent copy of the WSL source.
- `win-sessions-fresh-20261001.db` (4,096 bytes): the desktop's fresh db before migration.
- Pig-local copies at `/home/nolan/goose-migration-wsl-backup-20261001.db` and
  `/home/nolan/win-sessions-fresh-20261001.db`.

## What Nolan still needs to do
1. Open Goose from the Start Menu/Desktop shortcut. The app exits when launched from an
   SSH session (it stayed alive 45s+ in-session but was gone after the session closed),
   so launch it interactively.
2. Complete the welcome/provider setup in the UI (no provider is configured yet;
   WSL CLI uses ollama/qwen2.5-coder:7b, which the desktop config does not inherit).
3. Confirm the 10 sessions appear in the chat history. I verified the rows and hashes in
   the db and a clean backend start against it, but the visual check needs eyes on the UI.
