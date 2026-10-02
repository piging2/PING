# INTEGRATION-A2: Ollama + local coder model (free, headless)

Date: 2026-09-16 ~02:15 UTC (2026-09-15 20:15 MDT)
Status: WORKING

## What was found
The Pig already runs Ollama as a Docker container (`ollama`, image `ollama/ollama`,
port 11434 published to WSL). The official `install.sh` needs sudo for /usr/local
(it timed out), and ollama.com's Linux tarball URL 307-redirects to a GitHub
release asset that 404s. Fix: copied the matching CLI straight out of the running
container with `docker cp ollama:/usr/bin/ollama ~/.local/bin/ollama`.

## Versions / models
- Ollama: 0.30.11 (server in Docker + CLI at /home/nolan/.local/bin/ollama, same version)
- Models (persist in Docker volume `compose_ollama_data`, survive restarts):
  - qwen2.5-coder:1.5b — 986 MB — PULLED TONIGHT, default
  - qwen2.5-coder:7b — 4.7 GB — pre-existing, verified working
  - qwen2.5-coder:14b — 9.0 GB — pre-existing (not smoke-tested)
  - llama3:latest — 4.7 GB — pre-existing
  - nomic-embed-text:latest — 274 MB — pre-existing

## Working headless invocation (inside Pig WSL, PATH includes ~/.local/bin)
```
echo "Reply with exactly: SMOKE_OK" | timeout 180 ollama run qwen2.5-coder:1.5b
```
Smoke result: printed `SMOKE_OK`, exit 0, ~3.1s (model warm). Verified again via the
wrapper: args mode, stdin mode, and OLLAMA_MODEL=qwen2.5-coder:7b all return clean output.

## Wrapper: ~/workspace/bin/prompt-ollama.sh
Takes prompt as args or stdin, runs on the Pig over SSH, prints the response.
Env: `OLLAMA_MODEL` (default `qwen2.5-coder:1.5b`).
Robustness: uploads prompt + runner script as files (no nested quoting),
checks the API is up and runs `docker start ollama` if the container is down,
strips ANSI spinner sequences from output, cleans up Pig temp files after each run.

## Notes
- 1.5b is fast (~3-13s end to end incl. SSH) and follows exact instructions; quality on
  real coding tasks untested, use 7b for anything harder.
- Fully free: local inference, no keys, no accounts, no cloud calls.
