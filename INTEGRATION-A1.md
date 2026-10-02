# INTEGRATION-A1: Free headless agent CLIs on the Pig (WSL)

Survey date: 2026-09-15 ~20:15 MDT. Environment: WSL Ubuntu on the Pig, Node 22.23.2
at /usr/local/bin, npm global root /home/nolan/.local/node-v22.23.2-linux-x64/lib/node_modules
(bins in .../bin: gemini, qwen, crush). Python 3.14.4.

Wrappers live in ~/workspace/bin/ (`prompt-gemini.sh`, `prompt-qwen.sh`, `prompt-crush.sh`,
`prompt-goose.sh`, `prompt-aider.sh`, `prompt-opencode.sh`, shared `_pig-ssh.sh`).
Each takes the prompt as args or stdin, SSHes to the Pig, and runs the tool via the
Pig-side dispatcher /home/nolan/.local/bin/prompt-run. On missing auth the wrapper
prints `NOLAN-AUTH-REQUIRED` and exits 3.

## Result summary

- Working headless agents: **0**
- NOLAN-AUTH-REQUIRED: **6** (all of them)
- FAILED (install): aider (see below; auth also required)

Every tool installs cleanly except aider, but every tool refuses to run headless without
Nolan completing a one-time auth step (browser OAuth login or pasting a personal key).
No login flows were attempted, per the free-only constraint.

## Per tool

### 1. Gemini CLI
- Version installed: 0.60.0
- Install: `npm i -g @google/gemini-cli`
- Headless invocation: `gemini -p "prompt"` (also `-o json` supported)
- Auth state: NOLAN-AUTH-REQUIRED. Free tier exists but needs Nolan's Google account
  browser OAuth (or GEMINI_API_KEY / GOOGLE_GENAI_USE_VERTEXAI / GOOGLE_GENAI_USE_GCA in
  ~/.gemini/settings.json). No auth configured (~/.gemini has no settings.json).
- Smoke: `timeout 60 gemini -p "Reply with exactly: SMOKE_OK"` -> exit 41,
  "Please set an Auth method in your /home/nolan/.gemini/settings.json or specify one of
  the following environment variables before running: GEMINI_API_KEY,
  GOOGLE_GENAI_USE_VERTEXAI, GOOGLE_GENAI_USE_GCA"

### 2. Qwen Code
- Version installed: 0.23.4
- Install: `npm i -g @qwen-code/qwen-code`
- Headless invocation: `qwen -p "prompt"` (deprecated flag; positional prompt is one-shot)
- Auth state: NOLAN-AUTH-REQUIRED. `--auth-type` choices: openai, openai-responses,
  anthropic, qwen-oauth, gemini, vertex-ai. The free option (qwen-oauth, 2000 req/day)
  needs Nolan's browser login to a Qwen/Alibaba account.
- Smoke: `timeout 60 qwen -p "Reply with exactly: SMOKE_OK"` -> exit 1,
  "No auth type is selected. Please configure an auth type (e.g. via settings or
  `--auth-type`) before running in non-interactive mode."

### 3. Crush
- Version installed: v0.94.2
- Install: `npm i -g @charmland/crush` (note: the package is NOT `crush-cli`;
  `crush-cli` 404s on npm)
- Headless invocation: `crush run "prompt"` (stdin pipes also supported)
- Auth state: NOLAN-AUTH-REQUIRED. `crush login` platforms: hyper, copilot, openai.
  The GitHub Copilot path would piggyback Nolan's existing Copilot subscription, but the
  login itself is a browser OAuth flow he must do.
- Smoke: `timeout 60 crush run "Reply with exactly: SMOKE_OK"` -> exit 124 (timeout),
  zero output. Crush hangs silently without a TTY when unauthenticated instead of
  printing an error. Wrapper treats empty-output-on-timeout as NOLAN-AUTH-REQUIRED.

### 4. Goose
- Version installed: 1.50.1
- Install: `GOOSE_BIN_DIR=/home/nolan/.local/bin curl -fsSL https://github.com/block/goose/releases/download/stable/download_cli.sh | bash`
  (script header now points at github.com/aaif-goose/goose)
- Headless invocation: `goose run --text "prompt"` (or `--instructions file`, `-` for stdin)
- Auth state: NOLAN-AUTH-REQUIRED. No provider configured (~/.config/goose missing).
  `goose configure` is interactive-only; a provider (API key) or local model must be set.
- Smoke: `timeout 60 goose run --text "Reply with exactly: SMOKE_OK"` -> "error: No
  provider configured. Run 'goose configure' first."

### 5. Aider
- Version installed: NONE (install failed)
- Install attempted: `pip3 install --user --break-system-packages aider-chat`
- Auth state: NOLAN-AUTH-REQUIRED (aider always needs a provider API key) AND
  install FAILED. Root cause: PyPI only offers aider-chat up to 0.16.0 (2023) for
  Python 3.14; that build pins ancient setuptools, which crashes on 3.14
  (`pkgutil has no attribute 'ImpImporter'`, removed in 3.14). Modern aider-chat
  requires Python < 3.14. Fix options if ever wanted: deadsnakes Python 3.12 in WSL
  + venv install, still needs Nolan's API key.
- Smoke: not run (no binary).

### 6. OpenCode
- Version installed: 1.18.31 (pre-existing at /home/nolan/.opencode/bin/opencode,
  symlinked into ~/.local/bin)
- Install: n/a (already present)
- Headless invocation: `opencode run "prompt"` (`--format json` for machine output)
- Auth state: NOLAN-AUTH-REQUIRED. `opencode auth list` shows 0 credentials;
  ~/.local/share/opencode/auth.json does not exist. `opencode providers login` needs
  Nolan's browser/key per provider.
- Smoke: `timeout 60 opencode run "Reply with exactly: SMOKE_OK"` -> exit 124 (timeout),
  zero output. Like crush, opencode hangs without a TTY when unauthenticated instead of
  erroring. Wrapper fails fast on the missing auth.json instead of hanging.

## Notes for the coordinator
- Exit codes observed: gemini 41 and qwen 1 fail fast with clear auth errors;
  crush/opencode hang silently (exit 124 on timeout). Wrappers normalize all to
  `NOLAN-AUTH-REQUIRED` + exit 3.
- Nothing here costs money to set up, but nothing works for free without Nolan:
  Gemini (Google OAuth free tier), Qwen (qwen-oauth free tier, 2000 req/day), and
  Crush via GitHub Copilot login are the three genuinely-free options once Nolan
  does the one-time browser login. Goose could go keyless via Ollama/local models
  but that means running an LLM on the Pig (heavy). Aider and OpenCode need
  provider keys or provider logins.
- Suggested Nolan ask (morning): "Log into Gemini CLI and Qwen Code once on the Pig
  (`gemini` / `qwen` then browser OAuth) for two free headless agents; optional:
  `crush login copilot` to reuse your Copilot seat."
