# pig-ssh.sh -- ONE shared SSH helper for Pig worker scripts (Step 3).
# Source this file; do not copy the boilerplate into another script.
# Preserves the existing semantics exactly: key auth, BatchMode, pinned
# known_hosts (fails closed on host-key change), egress-proxy ProxyCommand.
# Override the timeout per caller by setting PIG_TIMEOUT before calling.
#   source "$(dirname "$0")/pig-ssh.sh"
#   PIG_TIMEOUT=10 pig_ssh "powershell -NoProfile -Command ..."
#   pig_scp local-file "$PIG:C:/remote/path"
PIG_KEY=/home/hatch/.ssh/id_ed25519
PIG_KH=/home/hatch/workspace/pig/known_hosts
PIG="muse-ssh@100.79.154.43"
PIG_PROXY='nc -X connect -x hatch-egress-proxy:3130 %h %p'
: "${PIG_TIMEOUT:=25}"

pig_ssh() {
  ssh -i "$PIG_KEY" -o BatchMode=yes -o ConnectTimeout="$PIG_TIMEOUT" \
    -o UserKnownHostsFile="$PIG_KH" -o "ProxyCommand=$PIG_PROXY" "$PIG" "$@"
}

pig_scp() {
  scp -i "$PIG_KEY" -o BatchMode=yes -o ConnectTimeout="$PIG_TIMEOUT" \
    -o UserKnownHostsFile="$PIG_KH" -o "ProxyCommand=$PIG_PROXY" "$@"
}
