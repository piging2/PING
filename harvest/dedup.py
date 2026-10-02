#!/usr/bin/env python3
"""Harvest dedup pipeline.

Contract (Nolan 2026-09-25): one candidate, one pinned SHA, one license
record, many mechanisms.

  - Primary dedup key: canonical repository identity (normalized owner/repo).
  - Aliases (e.g. "ATProto/Lexicons") and protocol labels (e.g. ActivityPub,
    Nostr) never create new candidate rows; they merge into the owning repo's
    mechanisms/aliases.
  - FAIL CLOSED: conflicting pinned SHAs or conflicting license records for
    the same repo identity abort the run instead of choosing silently.
  - The scorecard is derived from the unique records only.

Usage:
  python3 dedup.py                  -> validate candidates.json, print scorecard JSON
  python3 dedup.py --check FILE     -> dedup records in FILE (same schema) only
"""

import json
import re
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
REGISTRY = HERE / "candidates.json"

UNVERIFIED = "UNVERIFIED"


def normalize_repo_key(value):
    """Normalize any repo reference to canonical 'owner/repo'.

    Accepts: 'owner/repo', 'https://github.com/owner/repo',
    'github.com/owner/repo', 'Owner/Repo', trailing '.git', trailing '/'.
    """
    v = (value or "").strip().lower()
    v = re.sub(r"^https?://", "", v)
    v = re.sub(r"^github\.com/", "", v)
    v = v.rstrip("/")
    if v.endswith(".git"):
        v = v[:-4]
    if "/" not in v:
        raise ValueError("cannot extract owner/repo from %r" % value)
    parts = v.split("/")
    if len(parts) != 2 or not all(parts):
        raise ValueError("cannot extract owner/repo from %r" % value)
    return parts[0] + "/" + parts[1]


def sha_status(sha):
    """True if sha is a full 40-char hex pin, False if missing/UNVERIFIED."""
    if not sha or sha == UNVERIFIED:
        return False
    return bool(re.fullmatch(r"[0-9a-f]{40}", str(sha).lower()))


class DedupConflict(Exception):
    pass


def dedupe(records):
    """Group records by canonical repo key; merge mechanisms/aliases.

    Raises DedupConflict when one repo identity carries more than one
    distinct pinned SHA or more than one distinct license record.
    Returns (unique_records, merge_notes).
    """
    groups = {}
    merge_notes = []
    for rec in records:
        key = normalize_repo_key(rec.get("repo") or rec.get("repo_url") or rec.get("url"))
        groups.setdefault(key, []).append(rec)

    unique = []
    for key, rows in groups.items():
        if len(rows) > 1:
            merge_notes.append(
                "%d raw rows collapsed into one record for %s" % (len(rows), key)
            )
        shas = {str(r.get("pinned_sha") or "").strip() for r in rows}
        shas = {s for s in shas if s}
        if len(shas) > 1:
            raise DedupConflict(
                "conflicting pinned SHAs for %s: %s" % (key, sorted(shas))
            )
        licenses = {str(r.get("license") or "").strip() for r in rows}
        licenses = {x for x in licenses if x}
        if len(licenses) > 1:
            raise DedupConflict(
                "conflicting license records for %s: %s" % (key, sorted(licenses))
            )

        merged = dict(rows[0])
        merged["canonical_repo"] = key
        merged["pinned_sha"] = sorted(shas)[0] if shas else UNVERIFIED
        merged["license"] = sorted(licenses)[0] if licenses else UNVERIFIED

        mechanisms = []
        for r in rows:
            for m in r.get("mechanisms") or []:
                if m not in mechanisms:
                    mechanisms.append(m)
        merged["mechanisms"] = mechanisms

        aliases = []
        for r in rows:
            for a in r.get("aliases") or []:
                if a not in aliases:
                    aliases.append(a)
        merged["aliases"] = aliases

        unique.append(merged)

    unique.sort(key=lambda r: r["canonical_repo"])
    return unique, merge_notes


def scorecard(unique, raw_count, merge_notes):
    decisions = Counter(r.get("decision") for r in unique)
    licenses = Counter(r.get("license") for r in unique)
    verified = [r for r in unique if sha_status(r.get("pinned_sha"))]
    return {
        "raw_records_observed": raw_count,
        "unique_repositories": len(unique),
        "duplicate_rows_collapsed": raw_count - len(unique),
        "pinned_shas_verified_full_length": len(verified),
        "unverified_shas": [
            r["canonical_repo"] for r in unique if not sha_status(r.get("pinned_sha"))
        ],
        "decisions": dict(decisions),
        "licenses": dict(licenses),
        "total_mechanisms": sum(len(r.get("mechanisms") or []) for r in unique),
        "merge_notes": merge_notes,
    }


def run(path=None):
    path = Path(path) if path else REGISTRY
    with open(path) as f:
        payload = json.load(f)
    records = payload.get("candidates", payload) if isinstance(payload, dict) else payload
    unique, merge_notes = dedupe(records)
    return unique, scorecard(unique, len(records), merge_notes)


def main(argv):
    check_path = None
    if "--check" in argv:
        i = argv.index("--check")
        check_path = argv[i + 1]
    try:
        unique, sc = run(check_path)
    except DedupConflict as e:
        print(json.dumps({"status": "CONFLICT", "error": str(e)}, indent=2))
        return 2
    except (ValueError, KeyError, FileNotFoundError) as e:
        print(json.dumps({"status": "ERROR", "error": str(e)}, indent=2))
        return 1
    print(json.dumps({"status": "OK", "scorecard": sc}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
