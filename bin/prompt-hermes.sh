#!/bin/bash
# prompt-hermes.sh — send a headless prompt to Hermes (oneshot mode) via the Pig SSH boundary.
# Usage: prompt-hermes.sh "your prompt"      or      echo "your prompt" | prompt-hermes.sh
# Prints the model's final response on stdout. Any prompt content is safe (file-based, no shell quoting).
# Pig-side bridge lives at the PERSISTENT path C:\Users\nolan\hermes-bridge\
# (moved out of C:\Windows\Temp 2026-09-26 — Temp is volatile; originals were
# silently lost 2026-09-25). Do not move the bridge back to Temp.
set -u
if [ $# -gt 0 ]; then PROMPT="$*"; else PROMPT="$(cat)"; fi
[ -z "${PROMPT// }" ] && { echo "usage: prompt-hermes.sh \"prompt\" | stdin" >&2; exit 2; }
KEY=/home/hatch/.ssh/id_ed25519
KH=/home/hatch/workspace/pig/known_hosts
PROXY='nc -X connect -x hatch-egress-proxy:3130 %h %p'
NOLAN="nolan@100.79.154.43"
PIG_BRIDGE='C:/Users/nolan/hermes-bridge'
# Job-scoped wake lease (2026-09-27, Nolan): Hermes headless runs are
# authorized long-running Pig jobs. The lease is held by the launching
# powershell for exactly the hermes-run.sh lifetime; kernel thread teardown
# releases it if the session dies. wake-bracket.sh only defines functions and
# the WAKE_WRAP_PS constant at source time (no side effects).
source /home/hatch/workspace/pig-fb/wake-bracket.sh
WAKE_WRAP_WIN="$WAKE_WRAP_PS"
TF="$(mktemp /tmp/hermes-prompt.XXXXXX)"
printf '%s' "$PROMPT" > "$TF"
# F1 (2026-09-26): the scp/ssh diagnostic "why" must survive into the adapter
# evidence artifact. scp stderr is captured and reported on failure; ssh
# stderr is intentionally NOT discarded (a bare 2>/dev/null here used to make
# every transport-layer failure look like an empty worker response).
SCP_ERR="$(mktemp /tmp/hermes-scp-err.XXXXXX)"
scp -i "$KEY" -o BatchMode=yes -o ConnectTimeout=25 -o UserKnownHostsFile="$KH" -o ProxyCommand="$PROXY" \
  "$TF" "$NOLAN:$PIG_BRIDGE/hermes-prompt.txt" >/dev/null 2>"$SCP_ERR" || { echo "scp failed: $(cat "$SCP_ERR")" >&2; rm -f "$TF" "$SCP_ERR"; exit 1; }
rm -f "$TF" "$SCP_ERR"
# Deploy the canonical wake-wrap.ps1 (pinned per dispatch). Warn-and-proceed:
# the bracket degrades to today's behavior (no inhibition) if the file is
# absent, so a failed deploy must not fail the prompt.
scp -i "$KEY" -o BatchMode=yes -o ConnectTimeout=25 -o UserKnownHostsFile="$KH" -o ProxyCommand="$PROXY" \
  /home/hatch/workspace/pig-fb/wake-wrap.ps1 "$NOLAN:$WAKE_WRAP_WIN" >/dev/null 2>&1 || \
  echo "prompt-hermes: WARNING: wake-wrap.ps1 scp failed; run proceeds without wake lease" >&2
HERMES_TS=$(date +%Y%m%d-%H%M%S)
HERMES_RUN_ID="hermes-$HERMES_TS"
HERMES_PS=$(cat <<EOF
$(wake_ps_acquire "$HERMES_RUN_ID" "Hermes headless prompt run")
\$c = 0
wsl -u nolan -- bash /mnt/c/Users/nolan/hermes-bridge/hermes-run.sh
\$c = \$LASTEXITCODE
$(wake_ps_release "$HERMES_RUN_ID")
exit \$c
EOF
)
HERMES_B64=$(printf '%s' "$HERMES_PS" | iconv -t UTF-16LE | base64 -w0)
ssh -i "$KEY" -o BatchMode=yes -o ConnectTimeout=900 -o UserKnownHostsFile="$KH" -o ProxyCommand="$PROXY" \
  "$NOLAN" "powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand $HERMES_B64"
