#!/bin/bash
# prompt-ollama.sh — headless local LLM prompt via Ollama (free, no keys, no cloud auth).
# Usage: prompt-ollama.sh "your prompt here"
#        echo "your prompt" | prompt-ollama.sh
# Env: OLLAMA_MODEL (default: qwen2.5-coder:1.5b)
# The model runs on the Pig's WSL Ubuntu over SSH. Prompt travels as a file
# (never embedded in nested shell quoting, which breaks across ssh/cmd/wsl).
MODEL="${OLLAMA_MODEL:-qwen2.5-coder:1.5b}"
KEY=/home/hatch/.ssh/id_ed25519
KH=/home/hatch/workspace/pig/known_hosts
PX='nc -X connect -x hatch-egress-proxy:3130 %h %p'
PIG=nolan@100.79.154.43

# Gather prompt: args win, else stdin (pipe).
if [ $# -gt 0 ]; then
  PROMPT="$*"
elif [ -t 0 ]; then
  echo "usage: prompt-ollama.sh \"prompt...\"  or  echo prompt | prompt-ollama.sh" >&2
  exit 2
else
  PROMPT="$(cat)"
fi

# Runner script executed inside WSL: ensures server is up, runs model on the
# prompt file, captures response to a .out file.
RUNNER="$(mktemp /tmp/ollama-run.XXXXXX.sh)"
cat > "$RUNNER" <<'EOF'
#!/bin/bash
export PATH="$HOME/.local/bin:$PATH"
exec >/mnt/c/Windows/Temp/ollama-resp.out 2>&1
if ! curl -s --max-time 4 http://127.0.0.1:11434/api/tags >/dev/null; then
  # server lives in the 'ollama' docker container; restart it if stopped,
  # else fall back to a plain WSL serve
  docker start ollama >/dev/null 2>&1 || { nohup ollama serve >/tmp/ollama-serve.log 2>&1 & }
  sleep 8
fi
timeout 600 ollama run __MODEL__ < /mnt/c/Windows/Temp/ollama-prompt.txt 2>/dev/null | sed -e 's/\x1B\[[0-9;?]*[a-zA-Z]//g' -e 's/\r//g'
EOF
sed -i "s/__MODEL__/$MODEL/" "$RUNNER"

PROMPTF="$(mktemp /tmp/ollama-prompt.XXXXXX.txt)"
printf '%s' "$PROMPT" > "$PROMPTF"

SSHO=(-i "$KEY" -o BatchMode=yes -o ConnectTimeout=25 -o UserKnownHostsFile="$KH" -o ProxyCommand="$PX")
# shellcheck disable=SC2086
scp -q "${SSHO[@]}" "$PROMPTF" "$PIG:C:/Windows/Temp/ollama-prompt.txt" || { echo "prompt upload failed" >&2; rm -f "$PROMPTF" "$RUNNER"; exit 1; }
scp -q "${SSHO[@]}" "$RUNNER" "$PIG:C:/Windows/Temp/ollama-run.sh" || { echo "runner upload failed" >&2; rm -f "$PROMPTF" "$RUNNER"; exit 1; }
rm -f "$PROMPTF" "$RUNNER"
ssh "${SSHO[@]}" "$PIG" 'wsl -u nolan -- bash /mnt/c/Windows/Temp/ollama-run.sh' || echo "(run exited $?)"
OUTF="$(mktemp /tmp/ollama-resp.XXXXXX.out)"
scp -q "${SSHO[@]}" "$PIG:C:/Windows/Temp/ollama-resp.out" "$OUTF" && cat "$OUTF"
STATUS=$?
ssh "${SSHO[@]}" "$PIG" 'del C:\Windows\Temp\ollama-prompt*.txt C:\Windows\Temp\ollama-run*.sh C:\Windows\Temp\ollama-resp.out' >/dev/null 2>&1
rm -f "$OUTF"
exit $STATUS
