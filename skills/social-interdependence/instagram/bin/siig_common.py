#!/usr/bin/env python3
"""siig_common.py: shared paths, atomic IO, and small helpers for the
Instagram autonomous-engagement skill.

State lives under SI_IG_STATE (default: <skill>/state). All durable writes
are atomic (tmp file + os.replace) or append-only JSONL. Nothing here writes
to the production outreach ledger or logs; tests point ENGAGEMENT_GUARD_DIR
and SI_IG_STATE at scratch directories.
"""
import json
import os
import re
import time
from datetime import datetime, timezone

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE_ROOT = os.environ.get(
    "SI_IG_STATE", os.path.join(SKILL_DIR, "state"))

OUTREACH_DIR = os.environ.get(
    "ENGAGEMENT_GUARD_DIR", os.path.expanduser("~/workspace/outreach"))
# The guard/authority CODE stays single-copy in the real outreach tree; only
# the DATA tree (logs, holds, eligibility-data) is overridable for tests.
GUARD_CODE_DIR = os.environ.get(
    "ENGAGEMENT_GUARD_CODE_DIR", os.path.expanduser("~/workspace/outreach"))
GUARD_PY = os.path.join(GUARD_CODE_DIR, "engagement-guard.py")
AUTHORITY_PY = os.path.join(GUARD_CODE_DIR, "authority-check.py")

PLATFORM = "instagram"
ACCOUNT = "nolanpigi"
TENANT = "ping-social"
ACTOR = "pigi-ai"

IG_POST_RE = re.compile(
    r"https?://(?:www\.)?instagram\.com/p/([A-Za-z0-9_-]+)/?")


def utcnow():
    return datetime.now(timezone.utc)


def iso_now():
    return utcnow().isoformat()


def ensure_state_dirs():
    for sub in ("leases", "learner", "drafts", "discovery"):
        os.makedirs(os.path.join(STATE_ROOT, sub), exist_ok=True)


def atomic_write_json(path, obj):
    ensure_state_dirs()
    tmp = path + ".tmp.%d" % os.getpid()
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")
    os.replace(tmp, path)


def read_json(path, default=None):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def append_jsonl(path, obj):
    ensure_state_dirs()
    line = json.dumps(obj, ensure_ascii=False, sort_keys=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def read_jsonl(path):
    rows = []
    if not os.path.isfile(path):
        return rows
    with open(path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except ValueError as e:
                raise RuntimeError(
                    "corrupt JSONL at %s line %d: %s" % (path, i, e))
    return rows


def sha256_text(text):
    import hashlib
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def norm_handle(handle):
    return (handle or "").strip().lstrip("@").lower()


def post_shortcode(url):
    m = IG_POST_RE.search(url or "")
    return m.group(1) if m else None


def target_ref(handle, post_url):
    sc = post_shortcode(post_url)
    if sc:
        return "post:%s" % sc
    return "handle:%s" % norm_handle(handle)


def batch_id_now(prefix="ig"):
    return "%s-%s" % (prefix, utcnow().strftime("%Y%m%d%H%M%S"))
