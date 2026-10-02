#!/bin/bash
# ping-offhost-copy.sh -- off-host second copy of PING daily backups (ops lane)
# Runs on ping-core-01 at 04:30 UTC, after the local pg-backup (03:30) and
# qdrant-snapshot (04:00) jobs. Encrypts each artifact, uploads ciphertext +
# sidecars via the selected driver, confirms presence, logs.
#
# DESTINATION INTENTIONALLY LEFT AS A PLACEHOLDER.
# Set PING_OFFHOST_DRIVER to one of: oci_os | pig_scp | s3_via_pig
# With no driver configured this script fails closed and changes nothing.
#
# Companion brief: ~/workspace/ops-lane/OFFHOST-BACKUP-BRIEF.md
set -uo pipefail

BACKUP_DIR=/opt/ping/backups
QDRANT_DIR=$BACKUP_DIR/qdrant
LOG=$BACKUP_DIR/offhost-copy.log
LOCK=$BACKUP_DIR/.offhost-copy.lock
DRIVER="${PING_OFFHOST_DRIVER:-}"
# --- destination placeholders: filled at install time after Nolan's choice ---
OCI_BUCKET="${PING_OFFHOST_OCI_BUCKET:-__OCI_BUCKET_UNSET__}"
OCI_NAMESPACE="${PING_OFFHOST_OCI_NAMESPACE:-__OCI_NAMESPACE_UNSET__}"
PIG_DEST="${PING_OFFHOST_PIG_DEST:-__PIG_DEST_UNSET__}"        # e.g. nolan@100.79.154.43:/mnt/c/ping-offhost/
S3_BUCKET="${PING_OFFHOST_S3_BUCKET:-__S3_BUCKET_UNSET__}"
S3_STAGING="${PING_OFFHOST_S3_STAGING:-__S3_STAGING_UNSET__}"   # pig-local staging dir for the s3 hop
KEY_FILE="${PING_OFFHOST_KEY_FILE:-/root/.ping-offhost/offhost.key}"

log() { echo "$(date -u +%FT%TZ) $*" >> "$LOG"; }

fail_closed() { log "FAIL $*"; echo "FAIL: $*" >&2; exit 1; }

[ -n "$DRIVER" ] || fail_closed "no destination configured: set PING_OFFHOST_DRIVER (oci_os|pig_scp|s3_via_pig)"
[ -r "$KEY_FILE" ] || fail_closed "encryption key not readable: $KEY_FILE"

exec 9>"$LOCK"
flock -n 9 || { log "SKIP another off-host copy holds the lock"; exit 0; }

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

encrypt_one() { # $1 = plaintext path -> prints ciphertext path in $WORK
  local src="$1" base dst
  base=$(basename "$src")
  dst="$WORK/$base.age"
  if command -v age >/dev/null 2>&1; then
    age --encrypt --identity "$KEY_FILE" --output "$dst" "$src" \
      || fail_closed "age encrypt failed for $base"
  else
    # gpg symmetric fallback; passphrase via fd 0 from the key file, never argv
    gpg --batch --yes --pinentry-mode loopback --passphrase-fd 0 \
      --symmetric --cipher-algo AES256 --output "$dst" "$src" < "$KEY_FILE" \
      || fail_closed "gpg encrypt failed for $base"
  fi
  sha256sum "$dst" | sed "s|$WORK/||" > "$dst.sha256"
  echo "$dst"
}

driver_oci_os() { # $1 = ciphertext, $2 = sidecar
  case "$OCI_BUCKET$OCI_NAMESPACE" in *__UNSET__*)
    fail_closed "oci_os driver selected but OCI bucket/namespace placeholders unset" ;;
  esac
  command -v oci >/dev/null 2>&1 || fail_closed "oci cli not installed"
  for f in "$1" "$2"; do
    oci os object put --bucket-name "$OCI_BUCKET" --namespace "$OCI_NAMESPACE" \
      --file "$f" --name "ping-offhost/$(basename "$f")" --force \
      || fail_closed "oci os object put failed for $(basename "$f")"
  done
  oci os object list --bucket-name "$OCI_BUCKET" --namespace "$OCI_NAMESPACE" \
    --prefix "ping-offhost/$(basename "$1")" \
    | grep -q "$(basename "$1")" \
    || fail_closed "oci presence check failed for $(basename "$1")"
}

driver_pig_scp() { # $1 = ciphertext, $2 = sidecar
  case "$PIG_DEST" in *__UNSET__*)
    fail_closed "pig_scp driver selected but PIG_DEST placeholder unset" ;;
  esac
  for f in "$1" "$2"; do
    scp -q "$f" "$PIG_DEST" || fail_closed "scp failed for $(basename "$f") to $PIG_DEST"
  done
}

driver_s3_via_pig() { # $1 = ciphertext, $2 = sidecar (two hops: host -> pig staging -> s3)
  case "$S3_BUCKET$S3_STAGING$PIG_DEST" in *__UNSET__*)
    fail_closed "s3_via_pig driver selected but S3/Pig placeholders unset" ;;
  esac
  for f in "$1" "$2"; do
    scp -q "$f" "$PIG_DEST" || fail_closed "scp to pig staging failed for $(basename "$f")"
  done
  log "STAGED on pig; s3 hop runs on the Pig via its existing AWS credentials"
  # NOTE: the Pig-side `aws s3 cp` step is a separate small script installed on
  # the Pig at execution time; it is NOT run from here (no credential handling
  # on this host). Until it exists, this driver stages only and logs PENDING.
  log "PENDING s3 hop for $(basename "$1") (pig-side uploader not yet installed)"
}

log "START driver=$DRIVER"

LATEST_PG=$(ls -t "$BACKUP_DIR"/ping-postgres-*.dump 2>/dev/null | head -1)
LATEST_QD=$(ls -t "$QDRANT_DIR"/knowledge-*.snapshot 2>/dev/null | head -1)
[ -n "${LATEST_PG:-}" ] || fail_closed "no postgres dump found"
[ -n "${LATEST_QD:-}" ] || fail_closed "no qdrant snapshot found"

for artifact in "$LATEST_PG" "$LATEST_QD"; do
  [ -r "$artifact.sha256" ] || fail_closed "missing sha256 sidecar for $(basename "$artifact")"
  ( cd "$(dirname "$artifact")" && sha256sum -c "$(basename "$artifact").sha256" ) \
    >> "$LOG" 2>&1 || fail_closed "local sha256 mismatch for $(basename "$artifact")"
  ct=$(encrypt_one "$artifact")
  case "$DRIVER" in
    oci_os)    driver_oci_os "$ct" "$ct.sha256" ;;
    pig_scp)   driver_pig_scp "$ct" "$ct.sha256" ;;
    s3_via_pig) driver_s3_via_pig "$ct" "$ct.sha256" ;;
    *) fail_closed "unknown driver: $DRIVER" ;;
  esac
  log "OK $(basename "$artifact") -> $(basename "$ct") driver=$DRIVER"
done

log "DONE driver=$DRIVER"
