#!/usr/bin/env bash
# prune.sh — enforce the retention policy declared in each backup manifest.
# Provider-neutral: operates on a vault directory (local today, synced to
# any object store tomorrow). Never prunes blindly: a backup without a
# manifest is quarantined for human review, never deleted.
#
# Usage: ./prune.sh --vault <dir> [--dry-run] [--keep-n N] [--keep-days D]
set -euo pipefail

VAULT=""; DRYRUN=0; KEEP_N=""; KEEP_DAYS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --vault) VAULT="$2"; shift 2;;
    --dry-run) DRYRUN=1; shift;;
    --keep-n) KEEP_N="$2"; shift 2;;
    --keep-days) KEEP_DAYS="$2"; shift 2;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac
done
[ -n "$VAULT" ] || { echo "missing --vault" >&2; exit 2; }
[ -d "$VAULT" ] || { echo "vault not a dir: $VAULT" >&2; exit 2; }

python3 - "$VAULT" "$DRYRUN" "${KEEP_N:-}" "${KEEP_DAYS:-}" <<'EOF'
import json, os, sys, shutil
from datetime import datetime, timezone

vault, dryrun = sys.argv[1], sys.argv[2] == "1"
keep_n_override = sys.argv[3] or None
keep_days_override = sys.argv[4] or None
now = datetime.now(timezone.utc)

manifests = sorted(f for f in os.listdir(vault) if f.endswith(".manifest.json"))
quarantine = os.path.join(vault, "quarantine")
entries = []
for m in manifests:
    try:
        d = json.load(open(os.path.join(vault, m)))
        created = datetime.fromisoformat(d["created_at_utc"].replace("Z", "+00:00"))
        entries.append((created, m, d))
    except Exception as e:
        print("WARN: unreadable manifest %s (%s); skipping" % (m, e))
        continue

# Backups without manifests: quarantine, never delete.
manifested = {d["artifact"] for _, _, d in entries}
for f in os.listdir(vault):
    if f.endswith(".enc") and f not in manifested:
        q = os.path.join(quarantine, f)
        if dryrun:
            print("DRY-RUN: would quarantine manifest-less artifact %s" % f)
        else:
            os.makedirs(quarantine, exist_ok=True)
            shutil.move(os.path.join(vault, f), q)
            print("quarantined manifest-less artifact: %s" % f)

entries.sort(key=lambda e: e[0], reverse=True)  # newest first
to_delete = []
for i, (created, m, d) in enumerate(entries):
    keep_n = int(keep_n_override or d["retention"]["keep_last_n"])
    keep_days = int(keep_days_override or d["retention"]["keep_days"])
    age_days = (now - created).total_seconds() / 86400
    if i < keep_n:
        reason = "kept (within keep_last_n=%d)" % keep_n
    elif age_days <= keep_days:
        reason = "kept (age %.1fd <= keep_days=%d)" % (age_days, keep_days)
    else:
        to_delete.append((m, d))
        reason = "DELETE (rank %d >= keep_last_n=%d, age %.1fd > keep_days=%d)" % (i, keep_n, age_days, keep_days)
    print("%s: %s" % (reason, m))

for m, d in to_delete:
    art = os.path.join(vault, d["artifact"])
    man = os.path.join(vault, m)
    if dryrun:
        print("DRY-RUN: would delete %s and %s" % (d["artifact"], m))
    else:
        for p in (art, man):
            if os.path.exists(p):
                os.remove(p)
        print("deleted %s and manifest" % d["artifact"])
print("prune complete: %d candidate(s) for deletion" % len(to_delete))
EOF
