#!/usr/bin/env bash
# backup.sh — create an encrypted, digested, manifested backup per
# trackc-tenant-backup/backup/spec/backup-contract.md (contract v1).
#
# Usage:
#   VAULT=/path/to/vault BACKUP_KEY="$(cat keyfile)" ./backup.sh \
#       --tenant <tenant> --source <source-id> --src <source-dir>
#
# Key: read from env BACKUP_KEY (passphrase). Never log it.
# Outputs: <vault>/<tenant>-<ts>-<sourceid>.tar.gz.enc + .manifest.json
set -euo pipefail

TENANT=""; SOURCE_ID=""; SRC=""; VAULT="${VAULT:-}"
KEEP_N="${KEEP_N:-10}"; KEEP_DAYS="${KEEP_DAYS:-30}"

while [ $# -gt 0 ]; do
  case "$1" in
    --tenant) TENANT="$2"; shift 2;;
    --source) SOURCE_ID="$2"; shift 2;;
    --src) SRC="$2"; shift 2;;
    --vault) VAULT="$2"; shift 2;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac
done

[ -n "$TENANT" ] || { echo "missing --tenant" >&2; exit 2; }
[ -n "$SOURCE_ID" ] || { echo "missing --source" >&2; exit 2; }
[ -n "$SRC" ] || { echo "missing --src" >&2; exit 2; }
[ -n "$VAULT" ] || { echo "missing --vault (or VAULT env)" >&2; exit 2; }
[ -n "${BACKUP_KEY:-}" ] || { echo "BACKUP_KEY env is required" >&2; exit 2; }
[ -d "$SRC" ] || { echo "src not a dir: $SRC" >&2; exit 2; }
mkdir -p "$VAULT"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
RFC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STAMP="${TENANT}-${TS}-${SOURCE_ID}"
ARTIFACT="${STAMP}.tar.gz.enc"
MANIFEST="${STAMP}.manifest.json"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

GIT_SHA="none"
if [ -d "$SRC/.git" ]; then
  GIT_SHA="$(git -C "$SRC" rev-parse --short HEAD 2>/dev/null || echo none)"
fi

# 1. Deterministic-ish tar of the source tree (relative paths only).
tar -C "$SRC" -cf "$WORK/plain.tar" --exclude-vcs --sort=name \
  --owner=0 --group=0 --numeric-owner . 2>/dev/null
gzip -n -9 -c "$WORK/plain.tar" > "$WORK/plain.tar.gz"
PLAIN_SHA="$(sha256sum "$WORK/plain.tar.gz" | cut -d' ' -f1)"
PLAIN_SIZE="$(stat -c%s "$WORK/plain.tar.gz")"

# 2. Per-file manifest (relative path, size, sha256), sorted.
FILES_JSON="$(cd "$SRC" && find . -path ./.git -prune -o -type f -print | sort | while IFS= read -r f; do
  rel="${f#./}"
  sz="$(stat -c%s "$f")"
  h="$(sha256sum "$f" | cut -d' ' -f1)"
  printf '{"path":%s,"size_bytes":%s,"sha256":"%s"}\n' \
    "$(printf '%s' "$rel" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')" \
    "$sz" "$h"
done | python3 -c 'import json,sys; print(json.dumps([json.loads(l) for l in sys.stdin]))')"

# 3. Encrypt with AEAD (gpg symmetric, AES256). Key via fd, never argv/log.
printf '%s' "$BACKUP_KEY" | gpg --batch --yes --pinentry-mode loopback \
  --passphrase-fd 0 --symmetric --cipher-algo AES256 \
  -o "$WORK/$ARTIFACT" "$WORK/plain.tar.gz"
CIPH_SHA="$(sha256sum "$WORK/$ARTIFACT" | cut -d' ' -f1)"
CIPH_SIZE="$(stat -c%s "$WORK/$ARTIFACT")"

# 4. Atomic publish: artifact then manifest.
cp "$WORK/$ARTIFACT" "$VAULT/$ARTIFACT.tmp.$$"
mv "$VAULT/$ARTIFACT.tmp.$$" "$VAULT/$ARTIFACT"

python3 - "$VAULT/$MANIFEST" <<EOF
import json, sys
manifest = {
  "contract_version": "backup-contract/1",
  "tenant": "$TENANT",
  "source_id": "$SOURCE_ID",
  "source_git_sha": "$GIT_SHA",
  "created_at_utc": "$RFC",
  "artifact": "$ARTIFACT",
  "plaintext_sha256": "$PLAIN_SHA",
  "ciphertext_sha256": "$CIPH_SHA",
  "plaintext_size_bytes": $PLAIN_SIZE,
  "ciphertext_size_bytes": $CIPH_SIZE,
  "encryption": {"scheme": "gpg-symmetric", "cipher": "AES256"},
  "files": $FILES_JSON,
  "retention": {"keep_last_n": $KEEP_N, "keep_days": $KEEP_DAYS},
  "restore_command": "./restore-verify.sh <artifact> <manifest> <keyfile> <destdir>"
}
open(sys.argv[1] + ".tmp", "w").write(json.dumps(manifest, indent=2) + "\n")
EOF
mv "$VAULT/$MANIFEST.tmp" "$VAULT/$MANIFEST"

echo "BACKUP_OK tenant=$TENANT source=$SOURCE_ID artifact=$ARTIFACT"
echo "plaintext_sha256=$PLAIN_SHA"
echo "ciphertext_sha256=$CIPH_SHA"
echo "files=$(echo "$FILES_JSON" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')"
