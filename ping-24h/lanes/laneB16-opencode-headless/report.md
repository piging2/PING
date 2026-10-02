# Lane B16: OpenCode headless path verification

**Date:** 2026-09-28, probes run ~15:20-15:40 MDT
**Scope:** Read-only investigation. Nothing installed, no config modified, no adapter file touched, no interactive auth attempted, gateway / jev-shadow missions / :3100 untouched.
**Transport:** `ssh -F ~/.ssh/pig-config pigwsl` (lands in Windows cmd.exe as nolan); WSL reached via `wsl -- bash -c` through `~/workspace/pig/pigwsl-run.sh`.

## Bottom line

The adapter's block reason ("No headless CLI on the Pig; only OpenCode.exe desktop (Electron). No safe invocation path.") is **factually stale**. A headless-capable OpenCode CLI binary exists on the Pig's WSL side, executes, and completed non-interactive runs against the Pig's local Ollama with zero stored credentials. The desktop-app-only observation is true for the Windows side only; it missed the WSL binary installed 2026-09-14.

## Evidence

### 1. Headless binary exists (WSL side)

- Path: `/home/nolan/.opencode/bin/opencode`
- Size: 185,030,784 bytes, dated 2026-09-14 11:28, executable bit set
- md5 prefix: `62de86118eba145a` (first 16 hex chars, for identity)
- `opencode --version` -> `1.18.31`, RC=0
- It is the ONLY opencode binary on the machine: not in `/usr/local/bin`, not in `~/bin`, not on PATH (`command -v opencode` returns nothing), not on Windows PATH (`where opencode` -> not found), not in `C:\Program Files`, `C:\Program Files (x86)`, or `%APPDATA%\npm`.
- Companion dirs: `/home/nolan/.opencode/` (bin, node_modules, package.json depending on `@opencode-ai/plugin@1.18.31`), `/home/nolan/.config/opencode/` (opencode.json, opencode.jsonc).

### 2. Headless subcommands confirmed

`opencode --help` lists, among others:
- `opencode run [message..]` - "run opencode with a message". `-i/--interactive` defaults to false, so `run` is non-interactive by default.
- `opencode serve` - "starts a headless opencode server"
- `opencode attach <url>`, `opencode providers` (auth management), `opencode session`, `opencode export`

### 3. Auth state: zero credentials, local-Ollama provider configured

- `opencode providers list` -> `Credentials ~/.local/share/opencode/auth.json` / `0 credentials`. The file `~/.local/share/opencode/auth.json` does not exist.
- Direct db inspection (table/row counts only, no secret values read): sqlite db at `/home/nolan/.local/share/opencode/opencode.db` (438,272 bytes, 2026-09-18 08:43) has `account`: 0 rows, `credential`: 0 rows, `account_state`: 0 rows, `session`: 13 rows. The 13 sessions prove opencode was used before, necessarily via a credential-free provider since none exist.
- Config `/home/nolan/.config/opencode/opencode.json` defines exactly one provider:
  `{"$schema":"https://opencode.ai/config.json","provider":{"ollama":{"npm":"@ai-sdk/openai-compatible","name":"Ollama local","options":{"baseURL":"http://localhost:11434/v1"},"models":{"qwen2.5-coder:7b":{"name":"Qwen 2.5 Coder 7B"}}}}}`
- No `OPENCODE_*` / `ANTHROPIC_*` / `OPENAI_*` / `OPENROUTER_*` exports in `~/.bashrc`, `~/.profile`, `~/.bash_profile`.
- Ollama IS running on the Pig at `http://localhost:11434`. `/api/tags` returns: `qwen2.5-coder:1.5b`, `qwen2.5-coder:14b`, `qwen2.5-coder:7b`, `llama3:latest`, `nomic-embed-text:latest`. The configured model `qwen2.5-coder:7b` is pulled.
- Direct Ollama inference works: `qwen2.5-coder:7b` "Say OK" -> "OK" (~1.6s); `qwen2.5-coder:14b` "Say OK" -> "OK" (~17.4s incl. 14.7s model load).

### 4. Live smoke tests through `opencode run` (headless)

All runs: `OPENCODE_DISABLE_UPDATE_CHECK=true /home/nolan/.opencode/bin/opencode run -m ollama/qwen2.5-coder:7b [--format json] "<prompt>"`, working dir `/tmp/opencode-smoke`.

- Run A (default format, trivial prompt "Reply with exactly these two words and nothing else: SMOKE OK"): agent loop started (`> build . qwen2.5-coder:7b`), model attempted a `webfetch` tool call to `https://example.com/smokecheck` instead of following the instruction. Path mechanically worked; model ignored the instruction.
- Run B (`--format json`, same prompt): RC=0, 3 JSON events (`step_start`, `step_finish` reason `stop`, one text part), finished in ~3.4s. The text part contained pseudo-tool JSON `{"name":"smoke","arguments":{"text":"OK"}}` as literal text, not a real tool call.
- Run C (`--format json`, "List the filenames in /tmp/opencode-smoke. Reply with only the filenames."): RC=0, `step_finish` reason `stop`. Model emitted `{"name":"read","arguments":{"path":"/tmp/opencode-smoke"}}` as TEXT, never as a real `tool_use` event. No `permission_asked` events occurred in any run.
- Run D (`-m ollama/qwen2.5-coder:14b`, same trivial prompt): RC=1, `{"name":"UnknownError","data":{"message":"Unexpected server error. Check server logs for details.","ref":"err_e0ffb394"}}` after ~4s. Direct Ollama 14b inference works, so this is an opencode-side failure with that model, cause not diagnosed (out of read-only scope to fix; logs not pulled).

### 5. Windows side (confirms what the adapter saw, and its limit)

- `C:\Users\nolan\AppData\Local\Programs\@opencode-aidesktop\OpenCode.exe` (231,548,456 bytes, 2026-09-14) plus Electron support files (`chrome_*.pak`, `ffmpeg.dll`, `resources/`, `Uninstall OpenCode.exe`) = the Electron desktop app. No CLI bundled in that directory. This is the "OpenCode.exe desktop" the adapter block refers to, and it is all that exists on the Windows side.

## Exact invocation (verified working)

```bash
OPENCODE_DISABLE_UPDATE_CHECK=true /home/nolan/.opencode/bin/opencode run \
  -m ollama/qwen2.5-coder:7b \
  --format json \
  --dir /path/to/workdir \
  "<prompt>"
```

Run from the Pig WSL side as user nolan (via the `pigwsl` SSH hop + `wsl --`). Non-interactive by default. Each run spawns a local opencode server on a random port and appends a session row to `~/.local/share/opencode/opencode.db`.

**Auth mechanism:** none required. The configured provider is local Ollama (`http://localhost:11434/v1`), which takes no API key. Zero credentials are stored anywhere on the machine.

## The free-tier question, answered precisely

- **opencode.ai free tier (Zen models): NOT usable headless today.** Zero credentials stored; `opencode providers login` is an interactive OAuth/device flow that requires Nolan. This lane did not attempt it per instructions.
- **No-cost headless inference: YES, via local Ollama.** No API spend, no login, works now. Trade-off is model quality (see failure modes).

## Failure modes observed

1. **Not on PATH.** Any adapter integration must use the absolute path `/home/nolan/.opencode/bin/opencode` or export PATH. A bare `opencode` invocation fails.
2. **Small-model instruction following is weak through the opencode agent loop.** `qwen2.5-coder:7b` hallucinated tool calls (webfetch to example.com/smokecheck) and emitted pseudo-tool JSON as text instead of real `tool_use` events, across 3 runs. Direct Ollama API calls to the same model behave normally, so this is an opencode-loop + small-model interaction issue. For real worker tasks this model is suspect; larger local models were not validated through opencode.
3. **`qwen2.5-coder:14b` fails inside opencode** (`UnknownError`, RC=1, ref `err_e0ffb394`) while working via direct Ollama API. Model-specific, undiagnosed.
4. **Headless permission behavior untested.** No run produced a well-formed tool call, so no `permission_asked` event was ever observed. Do NOT assume headless `run` auto-allows or auto-denies tool permissions; the first real tool-using task must be observed. (`--auto` exists but is flagged "dangerous" in help; not tested.)
5. **Update/phone-home on invocation.** opencode may check for updates per invocation; `OPENCODE_DISABLE_UPDATE_CHECK=true` was set for all probes and should be set by any adapter integration.
6. **Ollama is a runtime dependency.** If the Ollama service on the Pig stops, every headless run fails. Ollama was running at probe time; its autostart/persistence was not verified.
7. **Each run writes a session** to the local sqlite db. Not a blocker, but the db grows with use.

## What would falsify this report

- `/home/nolan/.opencode/bin/opencode` missing, non-executable, or `--version` failing.
- `~/.local/share/opencode/auth.json` appearing with credentials, or `account`/`credential` rows > 0 (would change the auth story).
- Ollama down at `http://localhost:11434` (would break the only working headless model path).
- `opencode run` hanging indefinitely on a trivial prompt (would indicate the headless loop is not actually usable non-interactively).

## Recommended next step (for parent, not this lane)

Before the adapter block is lifted, run one observed tool-using task headless (e.g. a `read` of a scratch file) to characterize permission behavior in `run` mode, and decide the model story (7b is weak through the loop; 14b errors; opencode.ai Zen needs Nolan's interactive login). This lane's read-only mandate is complete.

## Verdict

OPENCODE HEADLESS VIABLE (exact invocation: `OPENCODE_DISABLE_UPDATE_CHECK=true /home/nolan/.opencode/bin/opencode run -m ollama/qwen2.5-coder:7b --format json --dir <workdir> "<prompt>"` on Pig WSL as nolan; auth mechanism: none required, local Ollama provider at http://localhost:11434/v1 with zero stored credentials; caveat: opencode.ai free tier is NOT logged in and needs Nolan's interactive login, and qwen2.5-coder:7b showed weak instruction-following through the opencode agent loop in smoke tests)
