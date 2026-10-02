# Goose Pre-Provider Discovery — 2026-10-01 14:0x MDT (read-only)

All findings VERIFIED by direct inspection unless marked INFERENCE or UNKNOWN.
Nothing was configured, installed, downloaded, or changed. No credentials were entered or printed.

## GOOSE (installed)
- Version: 1.52.0 (VERIFIED via `goose.exe info` and `--help`)
- Location: `C:\Users\nolan\AppData\Local\Goose\dist-windows\Goose.exe` (Electron shell) +
  backend `C:\Users\nolan\AppData\Local\Goose\dist-windows\resources\bin\goose.exe` (255 MB, VERIFIED)
- Config: `%APPDATA%\Block\goose\config\config.yaml` — contains extensions only, NO provider section (VERIFIED)
- CURRENT PROVIDER: none configured (VERIFIED — "No provider/model configured" strings; config has no provider keys)
- CLI surface (VERIFIED from `--help`): `configure`, `info`, `doctor`, `mcp`, `acp` (run goose as ACP agent server on stdio),
  `serve` (ACP server over HTTP/WebSocket), `session`, `run`, `recipe`, `skills`, `plugin`, `schedule`, `gateway`,
  `update`, `term`, `local-models`, `completion`, `review`
- Setup-flow strings found in the installed binary (VERIFIED): "How would you like to set up your provider?",
  "OpenRouter Login (Recommended)", "Sign in with OpenRouter to automatically configure models",
  "Tetrate Agent Router Service Login", "Manual Configuration / Choose a provider and enter credentials manually",
  "OpenRouter setup complete! You can now use goose."
- Provider identifiers found in the installed binary (VERIFIED): openrouter, gemini_oauth, chatgpt_codex,
  codex (marked "[Deprecated: use chatgpt_codex or codex-acp instead]"), codex-acp, github_copilot, kimi_code,
  xai_oauth, huggingface, databricks, databricks_v2, ollama, ollama_cloud, plus generic ACP client
  (`crates\goose\src\acp\provider.rs`) and `toolshim`.
- Env names found in binary (VERIFIED): OPENROUTER_API_KEY, OPENROUTER_HOST (default https://openrouter.ai/api/v1),
  OLLAMA_HOST (default http://localhost:11434), GOOGLE_API_KEY, GOOGLE_HOST,
  hosted Gemini endpoint https://generativelanguage.googleapis.com/v1beta/openai,
  GROQ_HOST, GITHUB_COPILOT_HOST, HF_TOKEN/HF_HOST, LITELLM_HOST/LITELLM_API_KEY,
  CODEX_COMMAND, CODEX_SKIP_GIT_CHECK.
- OpenRouter auth: browser-based flow against https://openrouter.ai/api/v1/auth/keys (VERIFIED strings).
- Ollama model discovery: via `/api/tags` ("Ollama api/tags not available ... using static model list" fallback string, VERIFIED).

## WSL
- Distro: Ubuntu, x86_64 (VERIFIED)
- WSL Goose CLI config (`~/.config/goose/config.yaml`): GOOSE_PROVIDER=ollama, GOOSE_MODEL=qwen2.5-coder:7b (VERIFIED).
  Note: with Ollama actually living on the Windows host (see below), the WSL CLI reaches it through the
  WSL localhost relay (VERIFIED working path).
- No ollama binary, no ~/.ollama, no ollama process in WSL (VERIFIED).

## OLLAMA — where it actually lives
- NOT in WSL. It is a Docker container on the Windows host: name `ollama`, image `ollama/ollama`,
  ports `0.0.0.0:11434->11434/tcp` (VERIFIED via `docker ps`).
- Container env: OLLAMA_HOST=0.0.0.0:11434, NVIDIA_VISIBLE_DEVICES=all (GPU passthrough configured, VERIFIED).
  Models stored in Docker volume `compose_ollama_data` -> /root/.ollama (VERIFIED).
- **SECURITY NOTE (not changed, flagged):** the container publishes 11434 on 0.0.0.0, so it is reachable from the LAN
  (subject to Windows Firewall). Nolan's constraint was "do not expose Ollama to the LAN" — currently it IS
  LAN-published by the existing container config. No change made; operator decision.
- Windows localhost -> http://127.0.0.1:11434: listener present (Docker, PID via com.docker.backend) (VERIFIED).
- WSL -> localhost:11434: works via wslrelay.exe (PID 23084 listening on [::1]:11434, VERIFIED).
- Case verdict: closest to **A (Windows localhost -> Ollama works)**. The A/B/C/D/E framing assumed Ollama in WSL;
  reality: Ollama is on the Windows host and reachable from both Windows and WSL. No pre-Goose network fix required.

## OLLAMA MODELS (from `ollama list` + `ollama show`, local metadata only, nothing downloaded)

| MODEL ID | SIZE | PARAMS | QUANT | FAMILY | CONTEXT | CLASS (inference labeled) |
|---|---|---|---|---|---|---|
| qwen2.5-coder:1.5b | 986 MB | 1.5B | Q4_K_M | qwen2 | 32768 | SMALL/FAST (INFERENCE; coding-capable but tiny) |
| qwen2.5-coder:7b | 4.7 GB | 7.6B | Q4_K_M | qwen2 | 32768 | CODING (INFERENCE; also GENERAL) |
| llama3:latest | 4.7 GB | 8.0B | Q4_0 | llama | 8192 | GENERAL (INFERENCE) |
| qwen2.5-coder:14b | 9.0 GB | 14.8B | Q4_K_M | qwen2 | 32768 | CODING, larger (INFERENCE) |
| nomic-embed-text:latest | 274 MB | 137M | F16 | nomic-bert | 2048 | EMBEDDING (VERIFIED by arch/name) |

Modified dates: 14b/llama3/embed/7b ~3 months ago; 1.5b ~2 weeks ago.

## PIG HARDWARE (read-only)
- CPU: 12th Gen Intel i7-12850HX (VERIFIED)
- RAM: 63.7 GB total, 32.5 GB free (VERIFIED)
- GPU: NVIDIA RTX A2000 8GB Laptop GPU + Intel UHD (VERIFIED; AdapterRAM reports 4GB but device name states 8GB)
- Disk: 49.4 GB free on C: (VERIFIED)
- Arch: 64-bit Windows, x86_64 WSL (VERIFIED)
- LOCAL MODEL ASSESSMENT (all INFERENCE, not benchmarked):
  - GOOD LOCAL DEFAULT SIZE: 7-8B Q4 (~4.7 GB; fits in 8 GB VRAM)
  - PRACTICAL MAX SIZE: 14B Q4 (~9 GB; exceeds VRAM, spills to 64 GB system RAM — usable, slower)
  - LIKELY TOO LARGE: 30B+ Q4 (~18 GB+) without further quantization
  - GPU use by the Ollama container: passthrough configured; actual GPU utilization UNKNOWN (nvidia-smi not run — would be light, not done)

## OPENROUTER SUPPORT (installed v1.52.0)
- Available: YES (VERIFIED). Provider id `openrouter`. Login flow "Recommended" via https://openrouter.ai/api/v1/auth/keys;
  manual config with OPENROUTER_API_KEY (VERIFIED). Default host https://openrouter.ai/api/v1 (VERIFIED).
- Model ID format: OpenRouter-style `vendor/model` (e.g. `anthropic/claude-sonnet-4` seen as default, VERIFIED string).
- Custom model entry: supported via manual configuration (INFERENCE from "Manual Configuration" flow).
- Base URL configurable: YES (OPENROUTER_HOST, VERIFIED).
- Nolan's candidate free-model IDs (openrouter/free, nvidia/nemotron-3-ultra:free, poolside/laguna-s-2.1:free,
  cohere/north-mini-code:free) recorded as CANDIDATES only — not verified against the live catalog, not configured.

## GOOGLE/GEMINI SUPPORT
- Available: YES (VERIFIED). `gemini_oauth` provider (OAuth login, VERIFIED); GOOGLE_API_KEY + GOOGLE_HOST env names
  (VERIFIED); hosted endpoint https://generativelanguage.googleapis.com/v1beta/openai (VERIFIED).
- Model picker / manual IDs: INFERENCE — manual configuration path exists; exact GUI labels UNKNOWN.

## ACP SUPPORT (installed v1.52.0)
- Goose AS an ACP server: YES (VERIFIED) — `goose.exe acp` (stdio) and `goose.exe serve` (HTTP/WebSocket).
- Goose CONSUMING ACP agents as a provider: YES (VERIFIED) — `crates\goose\src\acp\provider.rs`.
- Codex via ACP: provider id `codex-acp` EXISTS in this build (VERIFIED). The older `codex` CLI provider is
  deprecated in favor of `chatgpt_codex` or `codex-acp` (VERIFIED strings).
- Claude Code via ACP: no `claude`-ACP provider id found in the binary (UNKNOWN — not verified present).
- Custom ACP agent: supported via the generic ACP provider module (INFERENCE).

## CODEX
- Installed: YES, in WSL only — `~/.local/bin/codex` -> `@openai/codex` npm package (VERIFIED).
- Version: codex-cli 0.159.2 (VERIFIED).
- Windows: not on PATH (VERIFIED); `C:\Users\nolan\.codex` exists but contains only sqlite state (no auth.json seen).
- WSL `~/.codex`: sqlite + tmp only, no auth.json visible → authenticated state UNKNOWN (not probed further; no tokens touched).
- ACP-compatible invocation: via Goose's `codex-acp` provider id (VERIFIED in Goose binary). No `acp` flag found in
  `codex --help` output (checked, none seen). No autonomous Codex work was run.

## HERMES
- Installed: YES, in WSL — `~/.local/bin/hermes` -> uv tool `hermes-agent` (VERIFIED).
- Version: Hermes Agent v0.19.0 (2026.7.20), pip-installed (VERIFIED).
- `hermes-acp`: EXISTS — "Run Hermes Agent as an ACP stdio server" (VERIFIED from --help). Options include
  --check, --setup, --setup-browser. Nothing was started or configured.
- Windows `C:\Users\nolan\AppData\Local\hermes\bin\hermes.exe` (6.8 KB) is NOT a valid Win32 application
  (VERIFIED — fails to execute); likely a stub. hermes-acp.exe/bu.exe present but not probed.
- Provider interface / local HTTP / CLI interface: UNKNOWN (not probed; discovery only).

## EXISTING CREDENTIAL NAMES (presence only, no values)
- Windows user env: OPENROUTER_API_KEY ABSENT, GOOGLE_API_KEY ABSENT, GEMINI_API_KEY ABSENT,
  OPENAI_API_KEY ABSENT, ANTHROPIC_API_KEY ABSENT (all VERIFIED via IsNullOrEmpty=True)
- WSL env: all five ABSENT (VERIFIED via printenv)
- Goose config (Windows): no provider section, no key names (VERIFIED)
- Goose config (WSL): provider=ollama, model=qwen2.5-coder:7b, no key names (VERIFIED)
- Codex config: no auth.json in either ~/.codex (VERIFIED absent); auth state UNKNOWN
- NOTE: Nolan mentioned pointing at his OpenRouter key — the key itself was NOT located in env or configs during
  this discovery. He will enter it in the Goose UI.

## ZERO-COST ROUTING PLAN (proposed, NOT implemented)
- Goose Desktop -> Ollama provider @ http://localhost:11434 -> local models (qwen2.5-coder:7b default;
  1.5b for fast/cheap; 14b when quality matters; nomic-embed-text for embeddings).
  Status: AVAILABLE + CONFIGURABLE. Switching between local models: MANUAL.
- Goose Desktop -> OpenRouter provider (OPENROUTER_API_KEY entered by Nolan in the UI) -> hosted free models,
  model IDs chosen at config time from the live catalog. Status: AVAILABLE + CONFIGURABLE. MANUAL switching.
- Goose Desktop -> Google/Gemini (gemini_oauth login or GOOGLE_API_KEY) -> direct allocation.
  Status: AVAILABLE. No key present today.
- Goose Desktop -> codex-acp provider -> Codex CLI 0.159.2 (WSL) for coding/execution.
  Status: CONFIGURABLE (provider id verified in build; end-to-end not tested).
- Future: Goose generic ACP provider -> hermes-acp (Hermes Agent v0.19.0 ACP stdio server). Status: FUTURE.
- Future: PING -> authorized execution request -> Goose/Codex/Hermes adapter -> execution -> result/evidence -> PING.
  Status: FUTURE. Explicitly NOT wired in this task (no ping_events, MissionRuntime, UnifiedEventRuntime, Postgres).
- Automatic routing by Goose itself: NOT claimed — no evidence in this build that Goose auto-routes across providers.
  Routing today is MANUAL SWITCHING; PING-side routing is FUTURE.

## PRE-GOOSE FIX REQUIRED
**NO PRE-GOOSE FIX REQUIRED** for Ollama reachability — Windows localhost:11434 is live and serving the model list.
Flagged (not fixed, operator decision): the Ollama container publishes 0.0.0.0:11434, i.e. LAN-reachable.

## EXACT GUI NEXT STEP (labels from the installed build's own strings; VERIFIED items marked)
1. Launch Goose from the Start Menu/Desktop shortcut (must be interactive; it exits under SSH).
2. Welcome screen: "How would you like to set up your provider?" (VERIFIED string)
3. For zero-cost local: choose "Manual Configuration" (VERIFIED string) -> provider `ollama` ->
   host defaults to http://localhost:11434 (VERIFIED default) -> pick a model discovered via /api/tags
   (VERIFIED mechanism) or type the model id (e.g. qwen2.5-coder:7b).
4. For hosted free models: choose "OpenRouter Login (Recommended)" (VERIFIED string) and sign in, or manual
   configuration with OPENROUTER_API_KEY (VERIFIED env name); then select a current free model from the catalog.
5. Test with a safe prompt (e.g. "Say 'hello' and nothing else.").
Steps 3-4's exact per-screen labels beyond the quoted strings are INFERENCE — the quoted strings are VERIFIED.

## BLOCKERS
- None for discovery. Next actions need Nolan: interactive Goose launch + provider choice (+ OpenRouter key entry if wanted).

## UNKNOWNS
- Exact Desktop GUI labels beyond the setup-choice strings (would need Nolan's eyes on the welcome screen).
- Whether the GUI exposes every CLI-verified provider id.
- Codex authenticated state (no auth.json found; not probed deeper).
- Whether the Ollama container is actually using the NVIDIA GPU at runtime.
- Hermes provider/HTTP/CLI interface details (not probed).
- Tetrate Agent Router Service provider details (string only).
- Live OpenRouter free-model catalog (must be checked at configuration time).
