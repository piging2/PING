# Agent CLI Integration

Headless agent CLIs available from this workspace. Pig-side CLIs run through the SSH boundary:
`nolan@100.79.154.43` via the egress proxy (key `/home/hatch/.ssh/id_ed25519`,
known_hosts `/home/hatch/workspace/pig/known_hosts`,
`ProxyCommand=nc -X connect -x hatch-egress-proxy:3130 %h %p`).
Shared helper: `~/workspace/bin/_pig-ssh.sh` (source it, then `pig_exec "<remote command>"`).
Wrappers take the prompt as args or stdin and print the response on stdout.
Convention: exit 3 + `NOLAN-AUTH-REQUIRED` means Nolan must do a one-time login first.

## WORKING tonight (verified end-to-end)

| Tool | Wrapper | Invocation | Notes |
|------|---------|------------|-------|
| Hermes (desktop agent) | [prompt-hermes.sh](sandbox://workspace/bin/prompt-hermes.sh) | `prompt-hermes.sh "prompt"` | Repaired 2026-09-15 (see below). Smoke: `WRAPPER_OK`. |
| Ollama (local) | [prompt-ollama.sh](sandbox://workspace/bin/prompt-ollama.sh) | `prompt-ollama.sh "prompt"` | qwen2.5-coder:1.5b default (`OLLAMA_MODEL` override; 7b verified too). Smoke: `SMOKE_OK` in ~3s. Fully free, no keys. |

## Installed, waiting on Nolan's one-time auth (all exit 3 today)

| Tool | Wrapper | Free path once he logs in |
|------|---------|---------------------------|
| Gemini CLI 0.60.0 | [prompt-gemini.sh](sandbox://workspace/bin/prompt-gemini.sh) | Google account OAuth, free tier |
| Qwen Code 0.23.4 | [prompt-qwen.sh](sandbox://workspace/bin/prompt-qwen.sh) | `qwen-oauth`, 2000 req/day free |
| Crush v0.94.2 | [prompt-crush.sh](sandbox://workspace/bin/prompt-crush.sh) | `crush login copilot` (his Copilot seat) |
| Goose 1.50.1 | [prompt-goose.sh](sandbox://workspace/bin/prompt-goose.sh) | provider key, or local model |
| OpenCode 1.18.31 | [prompt-opencode.sh](sandbox://workspace/bin/prompt-opencode.sh) | provider login/key |
| Aider | [prompt-aider.sh](sandbox://workspace/bin/prompt-aider.sh) | install blocked too: needs Python < 3.14 (deadsnakes 3.12) + provider key |

Morning ask: run `gemini` and `qwen` once on the Pig and do the browser OAuth for two free headless agents; optional `crush login copilot`.

## Hermes repair (2026-09-15 night shift)

- Install: `C:\Users\nolan\AppData\Local\hermes\`. A botched `hermes update` left a dead
  uv-trampoline venv (missing PyYAML et al); `hermes.exe`/`hermes-acp.exe` and the venv
  python all failed with "uv trampoline failed to spawn Python child process".
- Fix: broken venv preserved as `hermes-agent/venv.broken-2026-09-15`; fresh venv created with
  `cpython-3.11.15-windows-x86_64-none\python.exe -m venv`; 67 packages via
  `bin/uv.exe pip install --python <venv-python> -e hermes-agent`.
- Lessons: **Windows paths required** for `venv` creation (WSL `/mnt/c/...` paths make venv
  exit 0 while creating nothing); a Windows python mangles `/mnt/c/...` args into
  `C:\mnt\c\...`, so the interpreter path is WSL-form but its script argument is `C:\`-form;
  plain `pip install -e` hung in the resolver, `uv pip` finished in seconds.
- Headless (verified live): `venv/Scripts/python.exe hermes_cli/main.py -z "<prompt>"`
  (oneshot mode). Pig-side launcher: `C:\Windows\Temp\hermes-run.sh` +
  `C:\Windows\Temp\hermes-launch.py` (prompt via argv, no shell-quoting issues).
- Note: `gateway_state.json` is stale (pid long dead); the desktop app manages the gateway, left alone.

## Hermes repair (2026-09-26, P2 lane, Nolan-authorized via Batch 7 #20)
- DEFECT-1: `hermes-agent/venv` had been replaced by a LINUX venv (window 2026-09-26 ~13:38-15:05 UTC) — `venv/Scripts/python.exe` gone, every dispatch exit 127 empty. Rebuilt per the 2026-09-15 recipe with corrections: old venv preserved as `venv.broken-2026-09-26`; fresh venv from the REAL uv dir `C:\Users\nolan\AppData\Roaming\uv\python\cpython-3.11.15-windows-x86_64-none\python.exe` (the `cpython-3.11-windows-x86_64-none` JUNCTION trips "untrusted mount point" errors — do not use it); `uv.exe pip install --python <venv>\Scripts\python.exe -e hermes-agent` run from `C:\Users\nolan\AppData\Local\hermes` (the `-e` path is relative to the parent). All Pig-side python work via `ssh ... 'cmd /c "..."'` with Windows-form paths.
- Bridge moved to PERSISTENT `C:\Users\nolan\hermes-bridge\` (hermes-run.sh, hermes-launch.py, hermes-prompt.txt); `prompt-hermes.sh` updated; Temp copies deleted after the 8-condition proof re-passed. Do not move it back to Temp. Kept out of `AppData\Local\hermes` (desktop app's domain).
- `hermes-launch.py` now passes `--safe-mode` to `main.py` (real flag: HERMES_SAFE_MODE=1, ignores user config/rules, skips plugin discovery; live smoke exit 0 in ~11s) and has a typed argv check (usage, rc=2).
- WSL interop note: `wsl -u nolan -- cmd.exe /c ...` fails with "untrusted mount point" (sandbox restriction); wsl bash CAN still exec the venv python.exe directly — the bridge path is unaffected.
- If 127-empty recurs: check (1) `venv\Scripts\python.exe` exists, (2) the hermes-bridge files exist. Unknown cause for the Linux-venv replacement; the signature is exact and the recipe is here.

## Ollama (2026-09-15 night shift)

- Server runs in the `ollama` Docker container on the Pig (port 11434 in WSL); CLI was
  extracted from the container to `/home/nolan/.local/bin/ollama` (0.30.11).
- Models persist in the `compose_ollama_data` volume: qwen2.5-coder:1.5b (986 MB, pulled
  tonight, default), qwen2.5-coder:7b (4.7 GB, verified), 14b + llama3 + nomic-embed-text
  pre-existing. Wrapper auto-starts the container if down.
- 1.5b: fast (~3-13s incl. SSH), follows exact instructions; use 7b for harder tasks.

## Detail fragments

- [INTEGRATION-A1.md](sandbox://workspace/INTEGRATION-A1.md) — npm CLI survey (versions, install commands, auth states, smoke results)
- [INTEGRATION-A2.md](sandbox://workspace/INTEGRATION-A2.md) — Ollama survey

## Standing rules

- FREE ONLY: no paid keys, no purchases, no subscriptions, no key-hunting. Anything needing
  Nolan's browser OAuth or personal key is NOLAN-AUTH-REQUIRED, never attempted.
- Never read `AppData/Local/hermes/.env` or exfiltrate secrets; using configured environments is fine.
