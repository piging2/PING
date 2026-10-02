#!/usr/bin/env python3
"""Mechanical never-re-engage guard for PING Social engagement passes.

The never-re-engage rule cannot live only as prose in a task header. This
script is the mechanical boundary: before any like or comment is selected
or executed, the caller passes (candidate account, platform) through this
guard, which consults the existing durable interaction history
(~/workspace/outreach/instagram-engagement.md and facebook-engagement.md)
and classifies each candidate:

  ELIGIBLE              no prior engagement found, may proceed
  ALREADY_ENGAGED       exact match in durable history, must skip
  BLOCKED               ambiguous identity match (fail closed) or an
                        explicitly blocked account, must skip
  UNKNOWN-UNCHECKABLE   the history could not be consulted, fail closed

No new database and no new truth store. The markdown logs remain the
authoritative history. This script builds a derived, rebuildable index
from those logs and refuses to trust a stale copy: the index is rebuilt
whenever the source log is newer (compared by sha256, not just mtime).
Deleting the index is always safe; it is regenerated on next use.

Wiring:
  - Facebook: ~/workspace/pig-fb/run_pass.sh runs `filter --fb-job` on the
    job JSON before anything is copied to the Pig. Blocked actions are
    stripped with a durable audit line; zero eligible actions ends the pass
    without touching the Pig. The LLM cannot bypass this by forgetting.
  - Instagram: the cron body runs `filter` on the discovery candidates
    before the engagement phase, and `record` after each completed action
    so a restart re-consults reality. `verify` post-pass checks the reported
    actions against the pre-pass snapshot.

Subcommands:
  check   --platform P --account A [--url U]      classify one candidate
  filter  --platform P --in CAND.json --out ELIG.json [--fb-job] [--audit]
          classify a batch; writes eligible-only output plus a pass manifest
  record  --platform P --account A [--url U] --action like|comment|follow
          immediately record a completed action in the durable log
          (follow is X-only; other platforms fail closed)
  verify  --platform P --report R.json            post-pass violation check
  rebuild                                        force index rebuild

Exit codes: 0 = the check ran (see JSON for the decision); 2 = usage error;
3 = history unreadable, fail closed (no eligibility assumed).
"""
import argparse
import difflib
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone

BASE_DIR = os.environ.get(
    "ENGAGEMENT_GUARD_DIR", os.path.expanduser("~/workspace/outreach"))
PASSES_DIR = os.environ.get(
    "ENGAGEMENT_GUARD_PASSES_DIR",
    os.path.expanduser(
        "~/workspace/goals/ping-social-outreach-campaign/hidden_files/engagement-passes"))
LOG_FILES = {
    "instagram": os.path.join(BASE_DIR, "instagram-engagement.md"),
    "facebook": os.path.join(BASE_DIR, "facebook-engagement.md"),
    "threads": os.path.join(BASE_DIR, "threads-engagement.md"),
    "x": os.path.join(BASE_DIR, "x-engagement.md"),
    "tiktok": os.path.join(BASE_DIR, "tiktok-engagement.md"),
}
INDEX_FILE = os.path.join(BASE_DIR, ".engagement-history-index.json")
DECISIONS_FILE = os.path.join(PASSES_DIR, "engagement-guard-decisions.jsonl")

ELIGIBLE = "ELIGIBLE"
ALREADY_ENGAGED = "ALREADY_ENGAGED"
BLOCKED = "BLOCKED"
UNKNOWN = "UNKNOWN-UNCHECKABLE"

HANDLE_RE = re.compile(r"@([A-Za-z0-9_.]{1,40})")
IG_URL_RE = re.compile(
    r"https?://(?:www\.)?instagram\.com/p/([A-Za-z0-9_-]+)/?")
THREADS_POST_RE = re.compile(
    r"https?://(?:www\.)?threads\.(?:com|net)/@([A-Za-z0-9_.]{1,40})"
    r"/post/([A-Za-z0-9_-]+)/?")
X_URL_RE = re.compile(
    r"https?://(?:www\.)?(?:x\.com|twitter\.com)/([A-Za-z0-9_]{1,15})"
    r"/status/(\d+)/?")
TT_URL_RE = re.compile(
    r"https?://(?:www\.)?tiktok\.com/@([A-Za-z0-9_.]{1,24})"
    r"/video/(\d+)/?")
FB_PERMALINK_RE = re.compile(r"/permalink/(\d+)")
FB_POSTS_RE = re.compile(r"/posts/(\d+)")
FB_FBID_RE = re.compile(r"[?&](?:story_fbid|fbid|v)=(\d{6,})")
# Media-surface post URLs (2026-09-24, orphan-model lane): /videos/, /reel/
# and /photo/ permalinks carry the post ID in the path, and /watch/ carries
# it as ?v=. These share the one post-ID regex set with the intent ledger
# (which imports them from here); add new FB URL shapes here, not in the
# ledger.
FB_MEDIA_RE = re.compile(r"/(?:videos|reel|photo)/(\d{6,})")
FB_WATCH_RE = re.compile(r"/watch/\?[^#\s]*v=(\d{6,})")
# Opaque pfbid post tokens (2026-09-29, pass-143 blind spot): /posts/pfbidXXX
# carries no numeric post ID, so intents and candidates using this form were
# invisible to the never-re-engage index on BOTH sides (135 terminal ledger
# intent URLs used it at pass-143 build time, plus 13 pass-143 candidates).
# The token is a stable per-post identifier: same post -> same token, so it
# joins same-form URLs exactly like a numeric post ID (as post:pfbidXXX, a
# namespace disjoint from post:<digits>). NOTE: it cannot join a pfbid URL
# to the same post's canonical /permalink/<digits> URL; that cross-form
# case remains unjoinable by ID (name/recency rules cover it in curation).
FB_PFBID_RE = re.compile(r"/posts/(pfbid[A-Za-z0-9]+)")
# One shared tuple for every FB URL->post-ID extraction site in this file
# (parse_facebook incl. its GUARD-RECORD block, and _fb_post_ids). The
# intent ledger imports the individual regexes from here; add new FB URL
# shapes to FB_PFBID_RE-style definitions above and to this tuple, not in
# the ledger. FB_BARE_ID_RE stays separate: it matches prose, not URLs.
FB_URL_ID_RES = (FB_PERMALINK_RE, FB_POSTS_RE, FB_FBID_RE,
                 FB_MEDIA_RE, FB_WATCH_RE, FB_PFBID_RE)
# Bare condensed post IDs as written in pass like-lists, e.g.
# "Throwback Thursday (4476644419276001)". 2026-09-24 fix (pass 111): these
# were invisible to the never-re-engage index, which only matched full URLs.
# Fail-closed: a bare long number that is not a post ID can only ever ADD a
# block, never permit a re-engagement. 13+ digits keeps years/phone fragments
# out; the negative lookbehind avoids matching the tail of /permalink/ URLs.
FB_BARE_ID_RE = re.compile(r"(?<![/\w])\((\d{13,})\)")
FB_SLUG_RE = re.compile(r"facebook\.com/([A-Za-z0-9_.-]+)/")
GUARD_RECORD_RE = re.compile(
    r"GUARD-RECORD\s+platform=(\w+)\s+action=(\w+)\s+account=([^\s]+)"
    r"(?:\s+url=([^\s]+))?")


def fail(msg):
    print("engagement-guard: %s" % msg, file=sys.stderr)


# ---------------------------------------------------------------- parsing
def norm_ig_handle(handle):
    return handle.strip().lstrip("@").lower()


def norm_fb_name(name):
    n = name.lower()
    n = re.sub(r"[^a-z0-9 ]", " ", n)
    n = re.sub(r"\s+", " ", n).strip()
    if not n:
        return ""
    tokens = n.split()
    stripped = list(tokens)
    while len(stripped) > 1 and stripped[-1] in (
            "page", "pages", "llc", "inc", "co", "corp", "ltd", "llp",
            "company", "services", "service", "group", "team", "pros"):
        stripped.pop()
    return " ".join(stripped) if stripped else n


def parse_instagram(text):
    """Return (engaged_handles, engaged_post_shortcodes). Only likes,
    comments, and already-engaged declarations count. Skipped lines never
    count as engagement."""
    handles = set()
    shortcodes = set()
    sections = re.split(r"(?m)^## ", text)
    for sec in sections:
        lines = sec.split("\n")
        i = 0
        while i < len(lines):
            line = lines[i].rstrip()
            low = line.lower()
            m = re.match(r"^(likes|comments)\s*:\s*(.*)$", line,
                         re.IGNORECASE)
            if m:
                blob = m.group(2)
                i += 1
                while i < len(lines):
                    nxt = lines[i].rstrip()
                    if nxt.strip() == "" or nxt.lstrip().startswith("- "):
                        blob += "\n" + nxt
                        i += 1
                    else:
                        break
                for h in HANDLE_RE.findall(blob):
                    handles.add(norm_ig_handle(h))
                for sc in IG_URL_RE.findall(blob):
                    shortcodes.add(sc)
                continue
            m2 = re.match(
                r"^newly added to already-engaged[^:]*:\s*(.*)$", line,
                re.IGNORECASE)
            if m2:
                for h in HANDLE_RE.findall(m2.group(1)):
                    handles.add(norm_ig_handle(h))
            i += 1
        for m in GUARD_RECORD_RE.finditer(sec):
            if m.group(1) == "instagram":
                handles.add(norm_ig_handle(m.group(3)))
                if m.group(4):
                    sm = IG_URL_RE.search(m.group(4))
                    if sm:
                        shortcodes.add(sm.group(1))
    handles.discard("nolanpigi")
    return sorted(handles), sorted(shortcodes)


def parse_threads(text):
    """Return (engaged_handles, engaged_post_codes). Threads handles
    normalize exactly like Instagram handles. Only likes, comments, and
    already-engaged declarations count. Skipped lines never count."""
    handles = set()
    postcodes = set()
    sections = re.split(r"(?m)^## ", text)
    for sec in sections:
        lines = sec.split("\n")
        i = 0
        while i < len(lines):
            line = lines[i].rstrip()
            m = re.match(r"^(likes|comments)\s*:\s*(.*)$", line,
                         re.IGNORECASE)
            if m:
                blob = m.group(2)
                i += 1
                while i < len(lines):
                    nxt = lines[i].rstrip()
                    if nxt.strip() == "" or nxt.lstrip().startswith("- "):
                        blob += "\n" + nxt
                        i += 1
                    else:
                        break
                for h in HANDLE_RE.findall(blob):
                    handles.add(norm_ig_handle(h))
                for pm in THREADS_POST_RE.finditer(blob):
                    handles.add(norm_ig_handle(pm.group(1)))
                    postcodes.add(pm.group(2))
                continue
            m2 = re.match(
                r"^newly added to already-engaged[^:]*:\s*(.*)$", line,
                re.IGNORECASE)
            if m2:
                for h in HANDLE_RE.findall(m2.group(1)):
                    handles.add(norm_ig_handle(h))
            i += 1
        for m in GUARD_RECORD_RE.finditer(sec):
            if m.group(1) == "threads":
                handles.add(norm_ig_handle(m.group(3)))
                if m.group(4):
                    pm = THREADS_POST_RE.search(m.group(4))
                    if pm:
                        handles.add(norm_ig_handle(pm.group(1)))
                        postcodes.add(pm.group(2))
    handles.discard("nolanpigi")
    return sorted(handles), sorted(postcodes)


def parse_x(text):
    """Return (engaged_handles, engaged_post_ids). X handles normalize
    exactly like Instagram handles (lowercased, @ stripped). Post identity
    is the numeric status id from x.com/<handle>/status/<id> URLs. Likes,
    comments, follows, and already-engaged declarations count; skipped
    lines never count. X engagement expanded 2026-09-25 (Nolan's order):
    follows + comments + likes via the browser route (supersedes the
    likes-only rule of 2026-09-15)."""
    handles = set()
    postids = set()
    sections = re.split(r"(?m)^## ", text)
    for sec in sections:
        lines = sec.split("\n")
        i = 0
        while i < len(lines):
            line = lines[i].rstrip()
            m = re.match(r"^(likes|comments|follows)\s*:\s*(.*)$", line,
                         re.IGNORECASE)
            if m:
                blob = m.group(2)
                i += 1
                while i < len(lines):
                    nxt = lines[i].rstrip()
                    if nxt.strip() == "" or nxt.lstrip().startswith("- "):
                        blob += "\n" + nxt
                        i += 1
                    else:
                        break
                for h in HANDLE_RE.findall(blob):
                    handles.add(norm_ig_handle(h))
                for pm in X_URL_RE.finditer(blob):
                    handles.add(norm_ig_handle(pm.group(1)))
                    postids.add(pm.group(2))
                continue
            m2 = re.match(
                r"^newly added to already-engaged[^:]*:\s*(.*)$", line,
                re.IGNORECASE)
            if m2:
                for h in HANDLE_RE.findall(m2.group(1)):
                    handles.add(norm_ig_handle(h))
            i += 1
        for m in GUARD_RECORD_RE.finditer(sec):
            if m.group(1) == "x":
                handles.add(norm_ig_handle(m.group(3)))
                if m.group(4):
                    pm = X_URL_RE.search(m.group(4))
                    if pm:
                        handles.add(norm_ig_handle(pm.group(1)))
                        postids.add(pm.group(2))
    handles.discard("geskenolan")
    return sorted(handles), sorted(postids)


def parse_tiktok(text):
    """Return (engaged_handles, engaged_video_ids). TikTok handles
    normalize exactly like Instagram handles (lowercased, @ stripped).
    Video identity is the numeric id from tiktok.com/@<handle>/video/<id>
    URLs. Only likes, comments, and already-engaged declarations count;
    skipped lines never count."""
    handles = set()
    videoids = set()
    sections = re.split(r"(?m)^## ", text)
    for sec in sections:
        lines = sec.split("\n")
        i = 0
        while i < len(lines):
            line = lines[i].rstrip()
            m = re.match(r"^(likes|comments)\s*:\s*(.*)$", line,
                         re.IGNORECASE)
            if m:
                blob = m.group(2)
                i += 1
                while i < len(lines):
                    nxt = lines[i].rstrip()
                    if nxt.strip() == "" or nxt.lstrip().startswith("- "):
                        blob += "\n" + nxt
                        i += 1
                    else:
                        break
                for h in HANDLE_RE.findall(blob):
                    handles.add(norm_ig_handle(h))
                for pm in TT_URL_RE.finditer(blob):
                    handles.add(norm_ig_handle(pm.group(1)))
                    videoids.add(pm.group(2))
                continue
            m2 = re.match(
                r"^newly added to already-engaged[^:]*:\s*(.*)$", line,
                re.IGNORECASE)
            if m2:
                for h in HANDLE_RE.findall(m2.group(1)):
                    handles.add(norm_ig_handle(h))
            i += 1
        for m in GUARD_RECORD_RE.finditer(sec):
            if m.group(1) == "tiktok":
                handles.add(norm_ig_handle(m.group(3)))
                if m.group(4):
                    pm = TT_URL_RE.search(m.group(4))
                    if pm:
                        handles.add(norm_ig_handle(pm.group(1)))
                        videoids.add(pm.group(2))
    handles.discard("nolanpigi")
    return sorted(handles), sorted(videoids)


def _fb_names_from_skip(text):
    # Only harvest explicit "Name (already liked/handled ..., never-re-engage)"
    # annotations, not whole skip sentences.
    names = set()
    pat = re.compile(
        r"([A-Za-z0-9][^;()\n]{2,80}?)\s*\(([^)]*(?:never-re-engage|"
        r"already liked|already handled)[^)]*)\)")
    for m in pat.finditer(text):
        for part in m.group(1).split("/"):
            nm = part.strip().rstrip(",.")
            if nm and len(nm) > 2:
                names.add(norm_fb_name(nm))
    return names


def parse_facebook(text):
    """Return dict with post_ids, page_slugs, names, blocked_names."""
    post_ids = set()
    slugs = set()
    names = set()
    for rx in FB_URL_ID_RES + (FB_BARE_ID_RE,):
        for m in rx.finditer(text):
            post_ids.add("post:%s" % m.group(1))
    for m in FB_SLUG_RE.finditer(text):
        slug = m.group(1).lower()
        if slug not in ("groups", "profile.php"):
            slugs.add(slug)
    sections = re.split(r"(?m)^## ", text)
    for sec in sections:
        lines = sec.split("\n")
        i = 0
        mode = None
        while i < len(lines):
            line = lines[i].rstrip()
            if re.match(r"^###\s*likes\s*$", line, re.IGNORECASE):
                mode = "likes"
                i += 1
                continue
            if re.match(r"^###\s*comments", line, re.IGNORECASE):
                mode = "comments"
                i += 1
                continue
            if re.match(r"^#{1,3}\s+\S", line):
                mode = None
                i += 1
                continue
            stripped = line.lstrip()
            if mode == "likes" and stripped.startswith("- "):
                body = stripped[2:]
                nm = re.split(r"\s+[-\u2013\u2014]\s+", body, maxsplit=1)[0]
                nm = nm.strip().rstrip(",.")
                if nm and not nm.lower().startswith("http"):
                    names.add(norm_fb_name(nm))
            elif mode == "comments":
                m = re.match(r"^(\d+)\.\s+(.+)$", stripped)
                if m:
                    nm = re.split(r"[,;\u2013\u2014]", m.group(2),
                                  maxsplit=1)[0].strip()
                    if nm and not nm.lower().startswith("http"):
                        names.add(norm_fb_name(nm))
            elif stripped.startswith("- ") or re.match(r"^\d+\.", stripped):
                mode = None
            i += 1
        for m in re.finditer(
                r"^-\s+(?:LIKE|COMMENT)\s+(https?://[^\s]+)\s*\(([^)]+?)\s+post\)",
                sec, re.IGNORECASE | re.MULTILINE):
            nm = m.group(2).strip()
            if nm:
                names.add(norm_fb_name(nm))
        for m in re.finditer(r"^-\s+([^(]+?)\s+\(like[^)]*\),\s+post\s+(https?://\S+)",
                             sec, re.IGNORECASE | re.MULTILINE):
            nm = m.group(1).strip().lstrip("- ").strip()
            if nm:
                names.add(norm_fb_name(nm))
        for m in GUARD_RECORD_RE.finditer(sec):
            if m.group(1) == "facebook":
                if m.group(3):
                    names.add(norm_fb_name(m.group(3)))
                if m.group(4):
                    for rx in FB_URL_ID_RES:
                        for pm in rx.finditer(m.group(4)):
                            post_ids.add("post:%s" % pm.group(1))
    blocked = _fb_names_from_skip(text)
    names.difference_update({"", "facebook"})
    blocked.difference_update({""})
    return {
        "post_ids": sorted(post_ids),
        "page_slugs": sorted(slugs),
        "names": sorted(names),
        "blocked_names": sorted(blocked),
    }


# ---------------------------------------------------------------- ledger
def _fb_ledger_engaged_post_ids(exclude_pass_ids=()):
    """Facebook post IDs that must not be re-engaged, derived from the
    action-intent ledger with terminal-state awareness.

    An intent counts as prior engagement when its latest observation is
    terminal EXECUTED, FAILED, or UNKNOWN_EXECUTION, or when the intent is
    still open (stage EXECUTION, or ACTION_INTENT_DURABLE with no observation
    yet: outcome unknown, fail closed). Intents whose every observation is
    terminal NOT_ATTEMPTED are proven non-executions and stay eligible.

    (2026-09-25, pass-118 fix: pass log sections 113+ record targets as
    prose without per-action URLs, so parse_facebook()'s post_ids miss them.
    The ledger is the only complete post-ID history; without this merge the
    guard re-admitted 12 already-engaged posts into one provisional job.)

    exclude_pass_ids: pass IDs whose records are ignored. Used only by the
    offline eligibility replay to reconstruct the pre-incident state;
    production paths always pass nothing.
    """
    ledger = os.path.join(BASE_DIR, "action-intent-ledger.jsonl")
    engaged = set()
    try:
        f = open(ledger, "r", encoding="utf-8", errors="replace")
    except OSError:
        return engaged  # ledger unreadable: md history still applies
    intent_url = {}
    obs_terminal = {}
    for line in f:
        if '"platform": "facebook"' not in line and '"intent_id"' not in line:
            continue
        try:
            d = json.loads(line)
        except Exception:
            continue
        rt = d.get("record_type")
        iid = d.get("intent_id")
        if rt == "intent" and iid and d.get("platform") == "facebook":
            if d.get("pass_id") in (exclude_pass_ids or ()):
                continue
            if d.get("url"):
                intent_url[iid] = d["url"]
        elif rt == "observation" and iid:
            if d.get("pass_id") in (exclude_pass_ids or ()):
                continue
            obs_terminal[iid] = d.get("terminal")
    f.close()
    for iid, url in intent_url.items():
        if obs_terminal.get(iid) == "NOT_ATTEMPTED":
            continue  # proven non-execution: eligible again
        engaged.update(_fb_post_ids(url))
    return engaged


# ---------------------------------------------------------------- index
def _sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def build_index():
    data = {"built_at": datetime.now(timezone.utc).isoformat(),
            "platforms": {}}
    for platform, path in LOG_FILES.items():
        if not os.path.isfile(path):
            raise FileNotFoundError("history log missing: %s" % path)
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
        if platform == "instagram":
            handles, shortcodes = parse_instagram(text)
            payload = {"handles": handles, "shortcodes": shortcodes}
        elif platform == "threads":
            handles, postcodes = parse_threads(text)
            payload = {"handles": handles, "shortcodes": postcodes}
        elif platform == "x":
            handles, postids = parse_x(text)
            payload = {"handles": handles, "shortcodes": postids}
        elif platform == "tiktok":
            handles, videoids = parse_tiktok(text)
            payload = {"handles": handles, "shortcodes": videoids}
        else:
            payload = parse_facebook(text)
        payload["log_sha256"] = _sha256_file(path)
        data["platforms"][platform] = payload
    tmp = INDEX_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, sort_keys=True)
        f.write("\n")
    os.replace(tmp, INDEX_FILE)
    return data


def load_index():
    """Load the derived index, rebuilding if the source logs changed.
    Raises if the history cannot be consulted (fail closed)."""
    for platform, path in LOG_FILES.items():
        if not os.path.isfile(path):
            raise FileNotFoundError("history log missing: %s" % path)
    data = None
    if os.path.isfile(INDEX_FILE):
        try:
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError):
            data = None
    if data is not None:
        fresh = True
        for platform, path in LOG_FILES.items():
            payload = data.get("platforms", {}).get(platform)
            if not payload or payload.get("log_sha256") != _sha256_file(path):
                fresh = False
                break
        if fresh:
            _merge_ledger_facebook(data)
            return data
    data = build_index()
    _merge_ledger_facebook(data)
    return data


def _merge_ledger_facebook(data):
    """Merge ledger-derived engaged post IDs into the facebook payload.

    Applied on every load_index() (not just rebuild): the intent ledger
    grows independently of the md logs, so a cached index would otherwise
    miss engagements recorded since the last md-log change.
    """
    try:
        payload = data["platforms"]["facebook"]
    except (KeyError, TypeError):
        return
    merged = set(payload.get("post_ids") or []) | _fb_ledger_engaged_post_ids()
    payload["post_ids"] = sorted(merged)


# ---------------------------------------------------------------- classify
def _fuzzy_block(a, b, threshold):
    if not a or not b:
        return False
    if abs(len(a) - len(b)) > max(len(a), len(b)) * 0.4:
        return False
    return difflib.SequenceMatcher(None, a, b).ratio() >= threshold


def _token_subset(a, b):
    ta, tb = set(a.split()), set(b.split())
    if len(ta) < 2 or len(tb) < 2:
        return False
    return ta <= tb or tb <= ta


def check_instagram(index, account, url=None):
    payload = index["platforms"]["instagram"]
    handle = norm_ig_handle(account or "")
    if not handle:
        return UNKNOWN, "empty account identity, cannot check history"
    if handle in payload["handles"]:
        return ALREADY_ENGAGED, "handle @%s engaged in a prior pass" % handle
    if url:
        m = IG_URL_RE.search(url)
        if m and m.group(1) in payload["shortcodes"]:
            return ALREADY_ENGAGED, "post URL engaged in a prior pass"
    for known in payload["handles"]:
        if _fuzzy_block(handle, known, 0.9):
            return BLOCKED, ("ambiguous identity: @%s closely resembles "
                             "engaged @%s, failing closed") % (handle, known)
    return ELIGIBLE, "no prior engagement found in durable history"


def _fb_post_ids(url):
    ids = set()
    if not url:
        return ids
    for rx in FB_URL_ID_RES:
        for m in rx.finditer(url):
            ids.add("post:%s" % m.group(1))
    return ids


def _threads_post_ids(url):
    ids = set()
    if not url:
        return ids
    for m in THREADS_POST_RE.finditer(url):
        ids.add("post:%s" % m.group(2))
    return ids


def _x_post_ids(url):
    ids = set()
    if not url:
        return ids
    for m in X_URL_RE.finditer(url):
        ids.add("post:%s" % m.group(2))
    return ids


def _tiktok_post_ids(url):
    ids = set()
    if not url:
        return ids
    for m in TT_URL_RE.finditer(url):
        ids.add("post:%s" % m.group(2))
    return ids


def _platform_post_ids(platform, url):
    if platform == "threads":
        return _threads_post_ids(url)
    if platform == "x":
        return _x_post_ids(url)
    if platform == "tiktok":
        return _tiktok_post_ids(url)
    return _fb_post_ids(url)


def check_facebook(index, account=None, url=None):
    payload = index["platforms"]["facebook"]
    if not account and not url:
        return UNKNOWN, "empty account identity and no URL, cannot check history"
    for pid in _fb_post_ids(url):
        if pid in payload["post_ids"]:
            return ALREADY_ENGAGED, "post %s engaged in a prior pass" % pid
    if url:
        m = FB_SLUG_RE.search(url)
        if m:
            slug = m.group(1).lower()
            if slug in payload["page_slugs"]:
                return ALREADY_ENGAGED, "page slug %s engaged before" % slug
    name = norm_fb_name(account) if account else ""
    # 2026-09-18: pass job builders name comment actions "<Business> (comment)"
    # to keep within-pass page strings unique. That suffix defeats the
    # exact-name match above (the engaged history stores the bare business
    # name), so check the suffix-stripped form too; fail closed either way.
    candidates = [name]
    if name.endswith(" comment"):
        candidates.append(name[: -len(" comment")].rstrip())
    for cand in candidates:
        if not cand:
            continue
        if cand in payload["names"]:
            return ALREADY_ENGAGED, "page '%s' engaged in a prior pass" % cand
        if cand in payload["blocked_names"]:
            return BLOCKED, "page '%s' explicitly blocked in history" % cand
        for known in payload["names"]:
            if _fuzzy_block(cand, known, 0.85) or _token_subset(cand, known):
                return BLOCKED, ("ambiguous identity: '%s' closely resembles "
                                 "engaged '%s', failing closed") % (cand, known)
    return ELIGIBLE, "no prior engagement found in durable history"


def check_threads(index, account, url=None):
    payload = index["platforms"]["threads"]
    handle = norm_ig_handle(account or "")
    if not handle:
        m = THREADS_POST_RE.search(url or "")
        if m:
            handle = norm_ig_handle(m.group(1))
    if not handle and not url:
        return UNKNOWN, "empty account identity and no URL, cannot check history"
    if handle and handle in payload["handles"]:
        return ALREADY_ENGAGED, "handle @%s engaged in a prior pass" % handle
    if url:
        pm = THREADS_POST_RE.search(url)
        if pm and pm.group(2) in payload["shortcodes"]:
            return ALREADY_ENGAGED, "post URL engaged in a prior pass"
    if handle:
        for known in payload["handles"]:
            if _fuzzy_block(handle, known, 0.9):
                return BLOCKED, ("ambiguous identity: @%s closely resembles "
                                 "engaged @%s, failing closed") % (handle, known)
    return ELIGIBLE, "no prior engagement found in durable history"


def check_x(index, account, url=None):
    payload = index["platforms"]["x"]
    handle = norm_ig_handle(account or "")
    if not handle:
        m = X_URL_RE.search(url or "")
        if m:
            handle = norm_ig_handle(m.group(1))
    if not handle and not url:
        return UNKNOWN, "empty account identity and no URL, cannot check history"
    if handle and handle in payload["handles"]:
        return ALREADY_ENGAGED, "handle @%s engaged in a prior pass" % handle
    if url:
        pm = X_URL_RE.search(url)
        if pm and pm.group(2) in payload["shortcodes"]:
            return ALREADY_ENGAGED, "post URL engaged in a prior pass"
    if handle:
        for known in payload["handles"]:
            if _fuzzy_block(handle, known, 0.9):
                return BLOCKED, ("ambiguous identity: @%s closely resembles "
                                 "engaged @%s, failing closed") % (handle, known)
    return ELIGIBLE, "no prior engagement found in durable history"


def check_tiktok(index, account, url=None):
    payload = index["platforms"]["tiktok"]
    handle = norm_ig_handle(account or "")
    if not handle:
        m = TT_URL_RE.search(url or "")
        if m:
            handle = norm_ig_handle(m.group(1))
    if not handle and not url:
        return UNKNOWN, "empty account identity and no URL, cannot check history"
    if handle and handle in payload["handles"]:
        return ALREADY_ENGAGED, "handle @%s engaged in a prior pass" % handle
    if url:
        pm = TT_URL_RE.search(url)
        if pm and pm.group(2) in payload["shortcodes"]:
            return ALREADY_ENGAGED, "video URL engaged in a prior pass"
    if handle:
        for known in payload["handles"]:
            if _fuzzy_block(handle, known, 0.9):
                return BLOCKED, ("ambiguous identity: @%s closely resembles "
                                 "engaged @%s, failing closed") % (handle, known)
    return ELIGIBLE, "no prior engagement found in durable history"


def check(index, platform, account=None, url=None):
    if platform == "instagram":
        return check_instagram(index, account, url)
    if platform == "threads":
        return check_threads(index, account, url)
    if platform == "x":
        return check_x(index, account, url)
    if platform == "tiktok":
        return check_tiktok(index, account, url)
    if platform == "facebook":
        return check_facebook(index, account, url)
    return UNKNOWN, "unknown platform %s" % platform


def open_manifests(platform):
    """Accounts already ACTED ON in an open (today's) pass manifest count
    as engaged for within-pass dedup and restart safety. Merely being
    selected as eligible does not block a re-filter after a restart; only
    a durable `record` of execution does."""
    seen = set()
    if not os.path.isdir(PASSES_DIR):
        return seen
    today = datetime.now().date().isoformat()
    for fname in sorted(os.listdir(PASSES_DIR)):
        if not fname.startswith(platform + "-pass-") or not fname.endswith(".json"):
            continue
        path = os.path.join(PASSES_DIR, fname)
        try:
            with open(path, "r", encoding="utf-8") as f:
                man = json.load(f)
        except (json.JSONDecodeError, OSError):
            continue
        if str(man.get("date", "")) != today:
            continue
        for item in man.get("executed", []):
            acct = item.get("account") or ""
            if acct:
                seen.add(norm_ig_handle(acct) if platform in ("instagram",
                                                              "threads",
                                                              "x",
                                                              "tiktok")
                         else norm_fb_name(acct))
            for pid in _platform_post_ids(platform, item.get("url", "")):
                seen.add(pid)
    return seen


def _latest_manifest(platform):
    if not os.path.isdir(PASSES_DIR):
        return None
    today = datetime.now().date().isoformat()
    best = None
    for fname in sorted(os.listdir(PASSES_DIR)):
        if not fname.startswith(platform + "-pass-") or not fname.endswith(".json"):
            continue
        path = os.path.join(PASSES_DIR, fname)
        try:
            with open(path, "r", encoding="utf-8") as f:
                man = json.load(f)
        except (json.JSONDecodeError, OSError):
            continue
        if str(man.get("date", "")) == today:
            best = path
    return best


# ---------------------------------------------------------------- commands
def cmd_check(args):
    try:
        index = load_index()
    except Exception as e:
        fail("history unreadable: %s" % e)
        print(json.dumps({"decision": UNKNOWN, "reason": str(e)}))
        return 3
    decision, reason = check(index, args.platform, args.account, args.url)
    print(json.dumps({"platform": args.platform, "account": args.account,
                      "url": args.url, "decision": decision, "reason": reason}))
    return 0


def _audit(decisions, platform):
    os.makedirs(PASSES_DIR, exist_ok=True)
    ts = datetime.now(timezone.utc).isoformat()
    with open(DECISIONS_FILE, "a", encoding="utf-8") as f:
        for d in decisions:
            f.write(json.dumps({"ts": ts, "platform": platform, **d}) + "\n")
    log_path = LOG_FILES[platform]
    counts = {}
    for d in decisions:
        counts[d["decision"]] = counts.get(d["decision"], 0) + 1
    blocked_bits = []
    for d in decisions:
        if d["decision"] != ELIGIBLE:
            label = ("SKIPPED_REENGAGEMENT" if d["decision"] == ALREADY_ENGAGED
                     else d["decision"])
            blocked_bits.append("%s (%s: %s)" % (
                d.get("account") or d.get("url") or "?", label, d["reason"]))
    line = ("- GUARD %s filter %s: checked=%d eligible=%d blocked=%d%s\n" % (
        ts, platform, len(decisions), counts.get(ELIGIBLE, 0),
        len(decisions) - counts.get(ELIGIBLE, 0),
        (" [" + "; ".join(blocked_bits) + "]") if blocked_bits else ""))
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(line)


def cmd_filter(args):
    try:
        index = load_index()
    except Exception as e:
        fail("history unreadable, failing closed: %s" % e)
        return 3
    try:
        with open(args.in_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except Exception as e:
        fail("cannot read candidates: %s" % e)
        return 2
    if args.fb_job:
        actions = raw.get("actions", []) if isinstance(raw, dict) else []
        candidates = [{"account": a.get("page") or a.get("account"),
                       "url": a.get("url"), "_action": a} for a in actions]
    else:
        items = raw if isinstance(raw, list) else raw.get("candidates", [])
        candidates = [{"account": c.get("account") or c.get("handle"),
                       "url": c.get("url") or c.get("post_url"),
                       "_action": c} for c in items]
    inpass = open_manifests(args.platform)
    # Within-run dedup (2026-09-15 fix): the same job may intentionally pair
    # a like and a comment on one page/post (the standard engagement pattern
    # since 2026-09-09, and the shape the task body itself specifies).
    # Keying the in-run set on page name alone silently stripped those
    # pairs (2026-09-14/15: every comment paired with a like was blocked).
    # Identity here is the durable never-re-engage identity: the account
    # handle for instagram/threads/x/tiktok (see check_instagram/check_x/
    # check_tiktok/check_threads: "handle @x engaged in a prior pass"), the
    # page name for facebook. Blocking a second like on a different video of
    # the same handle within one job is intended: the durable rule would bar
    # that handle next pass anyway. (2026-09-15 night watch: the tiktok pass-2
    # log note claiming "account+action, NOT identity+action" was a misread;
    # for tiktok the account handle IS the identity.)
    # Dedup the current job on (identity, action type) instead: true
    # duplicates (two likes on one page, two comments on one post) are still
    # blocked, while like+comment pairs pass. Candidates without an action
    # type (e.g. Instagram discovery candidates) keep the old page-level
    # dedup. Prior-manifest dedup above stays page-level per the
    # never-re-engage rule.
    inrun = set()
    decisions = []
    eligible_items = []
    blocked_items = []
    try:
        elig_data = load_eligibility_data()
    except RuntimeError as e:
        fail("eligibility state unreadable, failing closed: %s" % e)
        return 3
    for c in candidates:
        account, url = c["account"], c["url"]
        raw_action = c["_action"] if isinstance(c["_action"], dict) else {}
        atype = str(raw_action.get("type") or "").strip().lower()
        key = (norm_ig_handle(account) if args.platform in ("instagram",
                                                             "threads",
                                                             "x",
                                                             "tiktok")
               else norm_fb_name(account or ""))
        pids = _platform_post_ids(args.platform, url)
        if key and (key in inpass or any(p in inpass for p in pids)):
            decision, reason = (ALREADY_ENGAGED,
                                "already acted on in an open pass manifest "
                                "today (within-pass dedup)")
        elif atype and ((key, atype) in inrun
                        or any((p, atype) in inrun for p in pids)):
            decision, reason = (ALREADY_ENGAGED,
                                "duplicate %s on this page/post in the same "
                                "job (within-pass dedup)" % atype)
        elif not atype and key and key in inrun:
            decision, reason = (ALREADY_ENGAGED,
                                "already selected in the same job "
                                "(within-pass dedup)")
        else:
            try:
                decision, reason = check(index, args.platform, account, url)
            except Exception as e:
                fail("check failed, failing closed: %s" % e)
                return 3
            if decision == ELIGIBLE:
                # Dispatch-time eligibility re-evaluation (2026-10-01 P0):
                # the full reason set is evaluated live here, never trusting
                # plan-time state, so a block added between planning and
                # dispatch still denies the action.
                try:
                    elig = eligibility_check(
                        index,
                        {"platform": args.platform,
                         "type": atype or None,
                         "url": url, "page": account,
                         "text": raw_action.get("text"),
                         "group_id": raw_action.get("group_id"),
                         "group_name": raw_action.get("group_name"),
                         "feed": raw_action.get("feed")},
                        data=elig_data)
                except RuntimeError as e:
                    fail("eligibility state unreadable, failing closed: %s" % e)
                    return 3
                if elig["decision"] != "ELIGIBLE":
                    decision = (ALREADY_ENGAGED
                                if elig["primary_reason"] == "ALREADY_ENGAGED"
                                else BLOCKED)
                    reason = ("eligibility %s [%s]: %s"
                              % (elig["decision"], elig["primary_reason"],
                                 "; ".join(elig["evidence"]))[:400])
        d = {"account": account, "url": url, "action": atype or None,
             "decision": decision, "reason": reason}
        decisions.append(d)
        if decision == ELIGIBLE:
            eligible_items.append(c["_action"])
            if atype:
                if key:
                    inrun.add((key, atype))
                for p in pids:
                    inrun.add((p, atype))
            elif key:
                inrun.add(key)
        else:
            blocked_items.append(d)
    if args.fb_job:
        out = dict(raw)
        out["actions"] = eligible_items
    else:
        out = {"candidates": eligible_items}
    os.makedirs(os.path.dirname(os.path.abspath(args.out_path)), exist_ok=True)
    with open(args.out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1)
        f.write("\n")
    os.makedirs(PASSES_DIR, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    manifest = {
        "platform": args.platform,
        "date": datetime.now().date().isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "eligible": [{"account": (c.get("page") or c.get("account") or
                                  c.get("handle")),
                     "url": c.get("url")} for c in eligible_items],
        "executed": [],
        "blocked": blocked_items,
        "pre_pass_snapshot": index["platforms"][args.platform],
    }
    manifest_path = os.path.join(
        PASSES_DIR, "%s-pass-%s.json" % (args.platform, ts))
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=1)
        f.write("\n")
    if args.audit:
        _audit(decisions, args.platform)
    summary = {
        "platform": args.platform,
        "checked": len(decisions),
        "eligible": len(eligible_items),
        "blocked": blocked_items,
        "eligible_file": args.out_path,
        "manifest": manifest_path,
    }
    print(json.dumps(summary, indent=1))
    return 0


def cmd_record(args):
    # 2026-09-25 (Nolan's X ramp order): follows are a first-class X action.
    # Fail closed: follow is only recordable on platform x.
    if args.action == "follow" and args.platform != "x":
        fail("action=follow is only supported on platform x")
        return 2
    log_path = LOG_FILES[args.platform]
    if not os.path.isfile(log_path):
        fail("history log missing: %s" % log_path)
        return 3
    ts = datetime.now(timezone.utc).isoformat()
    line = ("GUARD-RECORD platform=%s action=%s account=%s%s\n" % (
        args.platform, args.action, args.account,
        (" url=%s" % args.url) if args.url else ""))
    with open(log_path, "a", encoding="utf-8") as f:
        f.write("- %s %s" % (ts, line))
    manifest_path = args.manifest or _latest_manifest(args.platform)
    if manifest_path:
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                man = json.load(f)
            man.setdefault("executed", []).append(
                {"account": args.account, "url": args.url,
                 "action": args.action, "at": ts})
            tmp = manifest_path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(man, f, indent=1)
                f.write("\n")
            os.replace(tmp, manifest_path)
        except (json.JSONDecodeError, OSError) as e:
            fail("could not update manifest: %s" % e)
    print(json.dumps({"recorded": True, "platform": args.platform,
                      "account": args.account,
                      "manifest": manifest_path}))
    return 0


def cmd_verify(args):
    try:
        with open(args.report, "r", encoding="utf-8") as f:
            report = json.load(f)
    except Exception as e:
        fail("cannot read report: %s" % e)
        return 2
    manifest_path = report.get("manifest")
    snapshot = None
    if manifest_path and os.path.isfile(manifest_path):
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                man = json.load(f)
            snapshot = man.get("pre_pass_snapshot")
        except (json.JSONDecodeError, OSError):
            snapshot = None
    expected = "handles" if args.platform in ("instagram", "threads", "x", "tiktok") else "names"
    if snapshot and expected in snapshot:
        index = {"platforms": {args.platform: snapshot}}
    else:
        try:
            index = load_index()
        except Exception as e:
            fail("history unreadable: %s" % e)
            return 3
    violations = []
    actions = report.get("actions", []) if isinstance(report, dict) else []
    for a in actions:
        account = a.get("account") or a.get("handle")
        url = a.get("url")
        decision, reason = check(index, args.platform, account, url)
        if decision != ELIGIBLE:
            violations.append({"account": account, "url": url,
                               "decision": decision, "reason": reason,
                               "verdict": "VIOLATION"})
    result = {"platform": args.platform, "checked": len(actions),
              "violations": violations,
              "ok": len(violations) == 0}
    print(json.dumps(result, indent=1))
    return 0


def cmd_rebuild(_args):
    try:
        data = build_index()
    except Exception as e:
        fail("rebuild failed: %s" % e)
        return 3
    for platform, payload in data["platforms"].items():
        keys = [k for k in payload if k != "log_sha256"]
        print("%s: %s" % (platform, {k: len(payload[k]) for k in keys}))
    return 0


# ------------------------------------------------- engagement eligibility
#
# ONE deterministic eligibility authority (CEO order ENGAGEMENT ELIGIBILITY
# P0, 2026-10-01). Candidate + action + platform + engagement history +
# suppression/block state + corridor policy + provider capability ->
# ELIGIBLE / INELIGIBLE / UNKNOWN + reason codes. UNKNOWN = do not dispatch.
#
# Enforced twice: plan-time (curate subcommand stamps per-action eligibility
# evidence into the job) and dispatch-time (cmd_filter re-evaluates the full
# reason set live, evidence-check verifies envelope freshness; run_pass.sh
# denies actions with missing or stale evidence). Prose never authorizes or
# denies: only the data files below and the derived engagement history do.

ELIGIBILITY_DATA_DIR = os.path.join(BASE_DIR, "eligibility-data")
ELIGIBILITY_DATA_FILES = ("corridor.json", "blocked-businesses.json",
                          "precedent-registry.json", "action-capability.json")
ELIGIBILITY_TTL_SEC = 6 * 3600  # curated eligibility evidence older than this is stale
ELIGIBILITY_VERSION = "engagement-guard.eligibility_check/v1"

# First match in this order is the primary reason; all firing reasons are kept.
REASON_PRECEDENCE = (
    "CAPABILITY_MISSING", "PROVIDER_UNSUPPORTED", "BLOCKED", "SUPPRESSED",
    "ALREADY_ENGAGED", "OUTSIDE_CORRIDOR", "THIN_NO_NAME",
    "AUTHOR_UNVERIFIABLE", "EVENT_DROP", "FUNDRAISER_DROP", "DUPLICATE",
    "UNKNOWN",
)

FB_GROUP_RE = re.compile(r"/groups/(\d+)/")
FB_PERMALINK_RE = re.compile(r"/permalink/(\d+)")
FB_MENTION_RE = re.compile(r"@\[(\d+):\d+:([^\]]+)\]")
PHONE_RE = re.compile(r"\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}")
DOMAIN_RE = re.compile(r"(?:https?://|www\.)[\w.-]+\.[a-z]{2,}", re.I)


def _norm_text(s):
    """Plain lowercase/alphanumeric normalization for haystack matching.
    Distinct from norm_fb_name (which strips corporate suffixes for
    business-name comparison)."""
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", (s or "").lower())).strip()


def load_eligibility_data():
    """Load the four eligibility data files. Raises on missing or invalid
    content: unreadable eligibility state fails closed (exit 3)."""
    data = {}
    for name in ELIGIBILITY_DATA_FILES:
        path = os.path.join(ELIGIBILITY_DATA_DIR, name)
        try:
            with open(path, "r", encoding="utf-8") as f:
                data[name] = json.load(f)
        except (OSError, ValueError) as e:
            raise RuntimeError("eligibility data unreadable: %s: %s" % (path, e))
    data["_sha256"] = {n: _sha256_file(os.path.join(ELIGIBILITY_DATA_DIR, n))
                       for n in ELIGIBILITY_DATA_FILES}
    return data


def _surface_status(platform):
    """Read the surface status from AUTHORITY.json (read-only). Returns the
    status string, or None when the file cannot be read; the suppression
    check is then skipped with an evidence note (the mechanical
    authority-check gate already fail-closes on unreadable AUTHORITY.json)."""
    path = os.path.join(BASE_DIR, "AUTHORITY.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            surfaces = json.load(f).get("surfaces", {})
        return (surfaces.get(platform) or {}).get("status")
    except (OSError, ValueError):
        return None


def _candidate_group_id(candidate):
    gid = candidate.get("group_id")
    if gid:
        return str(gid)
    m = FB_GROUP_RE.search(candidate.get("url") or "")
    return m.group(1) if m else None


def _candidate_post_id(candidate):
    m = FB_PERMALINK_RE.search(candidate.get("url") or "")
    return m.group(1) if m else None


def _candidate_mention_ids(candidate):
    hay = "%s %s" % (candidate.get("page") or "", candidate.get("text") or "")
    return {m.group(1) for m in FB_MENTION_RE.finditer(hay)}


def _candidate_identities(candidate):
    """Normalized business-identity names from page @-mentions in the
    candidate's descriptor and post text."""
    hay = "%s %s" % (candidate.get("page") or "", candidate.get("text") or "")
    return {_norm_text(m.group(2)) for m in FB_MENTION_RE.finditer(hay)}


def _has_business_identity(candidate):
    """A candidate names an identifiable business when it carries a page
    @-mention, a phone number, or a website domain."""
    text = "%s %s" % (candidate.get("page") or "", candidate.get("text") or "")
    return bool(FB_MENTION_RE.search(text) or PHONE_RE.search(text)
                or DOMAIN_RE.search(text))


def eligibility_check(index, candidate, data=None, batch_seen=None,
                      surface_status="__auto__"):
    """The single deterministic eligibility function.

    candidate keys: platform, type (or action), url, page, text, group_id,
    group_name, feed (truthy when the candidate comes from the home feed
    rather than a group).

    Returns a dict: decision (ELIGIBLE/INELIGIBLE/UNKNOWN), primary_reason,
    reasons (all firing codes, precedence order), evidence (human-readable
    refs to the data that fired). No wall-clock use: the returned verdict is
    deterministic for the same inputs. batch_seen is an optional set used to
    detect within-batch duplicates across sequential calls.
    """
    if data is None:
        data = load_eligibility_data()
    reasons = []   # (precedence_index, code, evidence_string)
    evidence_notes = []

    def add(code, ev):
        reasons.append((REASON_PRECEDENCE.index(code), code, ev))

    platform = candidate.get("platform") or ""
    action = candidate.get("type") or candidate.get("action") or ""
    url = candidate.get("url") or ""
    account = candidate.get("page") or ""
    text = candidate.get("text") or ""
    hay = _norm_text("%s %s" % (account, text))

    # 0. unknown identity: nothing to judge. Short-circuits before every
    # other rule so an empty candidate can never collect a spurious
    # INELIGIBLE label; UNKNOWN is the honest code and it is not dispatched.
    if not url and not account and not text:
        return {
            "decision": "UNKNOWN",
            "primary_reason": "UNKNOWN",
            "reasons": ["UNKNOWN"],
            "evidence": ["empty candidate identity: no url, page, or text"],
        }

    # 1. provider capability (skipped for action-less discovery candidates)
    caps = data["action-capability.json"]["platforms"]
    if action:
        if platform not in caps:
            add("PROVIDER_UNSUPPORTED",
                "action-capability.json: platform '%s' is not listed" % platform)
        elif action not in caps[platform] or not caps[platform][action]:
            add("CAPABILITY_MISSING",
                "action-capability.json: action '%s' is not supported on %s"
                % (action, platform))

    # 2. blocked businesses
    blocked = data["blocked-businesses.json"]["businesses"]
    post_id = _candidate_post_id(candidate)
    mention_ids = _candidate_mention_ids(candidate)
    for b in blocked:
        canon = b["canonical"]
        why = None
        if post_id and post_id in set(b.get("post_ids", [])):
            why = "post %s" % post_id
        elif mention_ids & set(b.get("page_ids", [])):
            why = "page id match"
        elif _norm_text(canon) in hay:
            why = "name match '%s'" % canon
        else:
            for v in b.get("variants", []):
                if v and _norm_text(v) in hay:
                    why = "variant match '%s'" % v
                    break
        if why:
            add("BLOCKED", "blocked-businesses.json: %s (%s)" % (canon, why))

    # 3. surface suppression
    status = _surface_status(platform) if surface_status == "__auto__" else surface_status
    if status is None and surface_status == "__auto__":
        evidence_notes.append("surface status not consulted: AUTHORITY.json unreadable")
    elif status == "SUPPRESSED":
        add("SUPPRESSED", "AUTHORITY.json: surface %s is SUPPRESSED" % platform)

    # 4. already engaged: derived history + precedent business registry
    if platform == "facebook":
        d, r = check_facebook(index, account, url)
    else:
        d, r = check(index, platform, account, url)
    if d == "ALREADY_ENGAGED":
        add("ALREADY_ENGAGED", "guard index: %s" % r)
    elif d == "BLOCKED":
        add("BLOCKED", "guard index: %s" % r)
    for b in data["precedent-registry.json"]["already_engaged_businesses"]:
        names = [_norm_text(b["canonical"])] + [_norm_text(v) for v in b.get("variants", [])]
        names = [n for n in names if len(n) >= 4]
        idents = _candidate_identities(candidate)
        why = None
        hit = idents & set(names)
        if hit:
            why = "business identity match '%s'" % sorted(hit)[0]
        else:
            for n in names:
                if n in hay:
                    why = "name match '%s'" % n
                    break
        if why:
            add("ALREADY_ENGAGED",
                "precedent-registry.json: %s (%s; %s)"
                % (b["canonical"], why, b["evidence"]))

    # 5. corridor policy (facebook group posts; feed posts defer to text signals)
    corridor_local = None
    if platform == "facebook":
        groups = data["corridor.json"]["groups"]
        gid = _candidate_group_id(candidate)
        if gid and gid in groups:
            g = groups[gid]
            corridor_local = (g.get("corridor") == "in")
            evidence_notes.append("corridor.json: group %s (%s) -> %s"
                                  % (gid, g.get("name"), g.get("corridor")))
            if not corridor_local:
                add("OUTSIDE_CORRIDOR",
                    "corridor.json: group %s (%s) -> out (%s)"
                    % (gid, g.get("name"), g.get("reason")))
        elif gid:
            corridor_local = None
            evidence_notes.append("corridor.json: group %s has no corridor entry"
                                  % gid)
            add("UNKNOWN", "corridor.json: group %s has no corridor entry; "
                           "unknown locality fails closed" % gid)
        elif candidate.get("feed"):
            evidence_notes.append("corridor: feed post, no group membership; "
                                  "text signals only")
        else:
            gname = _norm_text(candidate.get("group_name") or "")
            matched = None
            if gname:
                alias_map = {}
                for ggid, g in groups.items():
                    for a in [g.get("name")] + g.get("aliases", []):
                        if a:
                            alias_map[_norm_text(a)] = (ggid, g)
                for key, gdata in data["corridor.json"].get(
                        "group_name_aliases", {}).items():
                    for a in [key] + gdata.get("aliases", []):
                        alias_map.setdefault(_norm_text(a),
                                             (None, dict(gdata, name=key)))
                if gname in alias_map:
                    matched = alias_map[gname]
            if matched:
                ggid, g = matched
                corridor_local = (g.get("corridor") == "in")
                disp = ggid if ggid else g.get("name")
                evidence_notes.append("corridor.json: group %s (%s) -> %s"
                                      % (disp, g.get("name"), g.get("corridor")))
                if not corridor_local:
                    add("OUTSIDE_CORRIDOR",
                        "corridor.json: group %s (%s) -> out (%s)"
                        % (disp, g.get("name"), g.get("reason")))
            else:
                evidence_notes.append("corridor: no group id or name; "
                                      "text signals only")
        for city in data["corridor.json"].get("cities_out", []):
            if city and re.search(r"\b%s\b" % re.escape(city), hay):
                add("OUTSIDE_CORRIDOR",
                    "corridor.json: out-of-corridor city signal '%s'" % city)
                break
        for canon, b in data["corridor.json"].get("businesses", {}).items():
            hit = _norm_text(canon) in hay or any(
                _norm_text(v) in hay for v in b.get("variants", []))
            if hit and b.get("corridor") == "out":
                add("OUTSIDE_CORRIDOR",
                    "corridor.json: business '%s' -> out (%s)"
                    % (canon, b.get("reason")))

    # 6. fail-closed class precedents
    rules = data["precedent-registry.json"]["class_rules"]
    au = rules["author_unverifiable"]
    if any(s in hay for s in au["signals"]) and not FB_MENTION_RE.search(
            "%s %s" % (account, text)):
        add("AUTHOR_UNVERIFIABLE",
            "precedent-registry.json: author_unverifiable signal matched "
            "(%s)" % au["evidence"])
    for rule_key in ("event_drop", "fundraiser_drop"):
        rule = rules[rule_key]
        for s in rule["signals"]:
            if re.search(r"\b%s\b" % re.escape(s), hay):
                add(rule["reason"],
                    "precedent-registry.json: %s signal '%s' (%s)"
                    % (rule_key, s, rule["evidence"]))
                break
    if platform == "facebook" and corridor_local is False \
            and not _has_business_identity(candidate):
        add("THIN_NO_NAME",
            "precedent-registry.json: thin_no_name (no identifiable business; "
            "%s)" % rules["thin_no_name"]["evidence"])

    # 7. within-batch duplicate
    if batch_seen is not None:
        if post_id:
            key = ("post", post_id)
        else:
            key = ("ident", tuple(sorted(_candidate_identities(candidate))),
                   action, _norm_text(account)[:64])
        if key in batch_seen:
            add("DUPLICATE", "duplicate candidate within this batch")
        else:
            batch_seen.add(key)

    deny = [c for _, c, _ in reasons if c != "UNKNOWN"]
    codes = sorted({c for _, c, _ in reasons},
                   key=REASON_PRECEDENCE.index)
    if deny:
        decision = "INELIGIBLE"
    elif "UNKNOWN" in codes:
        decision = "UNKNOWN"
    else:
        decision = "ELIGIBLE"
    primary = (min(reasons, key=lambda t: t[0])[1] if reasons else None)
    return {
        "decision": decision,
        "primary_reason": primary,
        "reasons": codes,
        "evidence": [ev for _, _, ev in
                     sorted(reasons, key=lambda t: t[0])] + evidence_notes,
    }


def stamp_evidence(action, verdict, data):
    """Stamp a per-action eligibility evidence envelope onto an ELIGIBLE
    action dict (plan-time gate). The evidence hash covers the decision,
    reasons, evidence refs, function version, TTL, and the data-file
    digests, so any tampering or data change is detectable at dispatch."""
    body = {
        "decision": verdict["decision"],
        "reasons": verdict["reasons"],
        "evidence": verdict["evidence"],
        "function": ELIGIBILITY_VERSION,
        "ttl_sec": ELIGIBILITY_TTL_SEC,
        "data_sha256": data["_sha256"],
    }
    env = dict(body)
    env["checked_at"] = datetime.now(timezone.utc).isoformat()
    env["evidence_hash"] = hashlib.sha256(
        json.dumps(body, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    action = dict(action)
    action["eligibility"] = env
    return action


def verify_evidence(action, data, now=None):
    """Dispatch-time envelope verification. Returns (ok, reason). Refuses
    missing envelopes, hash mismatches, non-ELIGIBLE decisions, data-file
    changes since planning, and stale evidence."""
    env = action.get("eligibility") if isinstance(action, dict) else None
    if not isinstance(env, dict):
        return False, "missing eligibility envelope"
    body = {k: env.get(k) for k in ("decision", "reasons", "evidence",
                                    "function", "ttl_sec", "data_sha256")}
    want = hashlib.sha256(
        json.dumps(body, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    if env.get("evidence_hash") != want:
        return False, "evidence_hash mismatch: envelope tampered or rebuilt"
    if env.get("decision") != "ELIGIBLE":
        return False, "envelope decision is %s, not ELIGIBLE" % env.get("decision")
    if env.get("data_sha256") != data["_sha256"]:
        return False, "eligibility data changed since planning: re-evaluate"
    try:
        checked = datetime.fromisoformat(env["checked_at"])
    except (TypeError, ValueError):
        return False, "envelope checked_at unreadable"
    now = now or datetime.now(timezone.utc)
    age = (now - checked).total_seconds()
    if age < 0 or age > ELIGIBILITY_TTL_SEC:
        return False, "eligibility evidence stale (age %.0fs, ttl %ds)" % (age, ELIGIBILITY_TTL_SEC)
    return True, "ok"


def load_eligibility_snapshot(exclude_pass_ids=(), log_cut_marker=None):
    """Reconstruct the engagement-history state for the offline replay:
    parse the facebook log text cut before log_cut_marker and merge the
    intent ledger excluding exclude_pass_ids. Production paths never call
    this; they use load_index() (live state)."""
    path = LOG_FILES["facebook"]
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()
    if log_cut_marker:
        idx = text.find(log_cut_marker)
        if idx == -1:
            raise RuntimeError("replay marker not found in facebook log: %s"
                               % log_cut_marker)
        text = text[:idx]
    parsed = parse_facebook(text)
    payload = {
        "log_sha256": "snapshot",
        "post_ids": sorted(parsed["post_ids"]),
        "names": sorted(parsed["names"]),
        "slugs": sorted(parsed["page_slugs"]),
        "page_slugs": sorted(parsed["page_slugs"]),
        "blocked_names": sorted(parsed["blocked_names"]),
    }
    merged = set(payload["post_ids"]) | _fb_ledger_engaged_post_ids(
        exclude_pass_ids=exclude_pass_ids)
    payload["post_ids"] = sorted(merged)
    return {"platforms": {"facebook": payload}}


def cmd_curate(args):
    """Plan-time gate: read a curated candidate list, run the single
    eligibility function over it, stamp per-action evidence on the survivors,
    and write the dispatch-ready job. Non-ELIGIBLE candidates are dropped
    with their reason codes recorded; they never reach dispatch."""
    try:
        data = load_eligibility_data()
    except RuntimeError as e:
        sys.stderr.write("ELIGIBILITY STATE UNREADABLE: %s\n" % e)
        return 3
    index = load_index()
    try:
        with open(args.in_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except (OSError, ValueError) as e:
        sys.stderr.write("curate input unreadable: %s\n" % e)
        return 2
    items = raw.get("actions", raw) if isinstance(raw, dict) else raw
    if not isinstance(items, list):
        sys.stderr.write("curate input must be a list or {\"actions\": [...]}\n")
        return 2
    # Optional text join: when the candidates file is provided, post text and
    # group names are joined by post ID so the text-signal rules (event,
    # fundraiser, business identity) evaluate on the full evidence.
    text_by_pid = {}
    group_by_pid = {}
    if args.candidates:
        try:
            with open(args.candidates, "r", encoding="utf-8") as f:
                craw = json.load(f)
            citems = craw if isinstance(craw, list) else craw.get("candidates", [])
            for c in citems:
                if not isinstance(c, dict):
                    continue
                m = FB_PERMALINK_RE.search(c.get("url") or "")
                if m:
                    text_by_pid[m.group(1)] = c.get("text")
                    if c.get("group"):
                        group_by_pid[m.group(1)] = c.get("group")
        except (OSError, ValueError) as e:
            sys.stderr.write("curate candidates unreadable: %s\n" % e)
            return 2
    batch_seen = set()
    actions = []
    dropped = []
    for item in items:
        if not isinstance(item, dict):
            dropped.append({"item": item, "decision": "UNKNOWN",
                            "reasons": ["UNKNOWN"]})
            continue
        pid_m = FB_PERMALINK_RE.search(item.get("url") or "")
        pid = pid_m.group(1) if pid_m else None
        candidate = {
            "platform": item.get("platform") or args.platform,
            "type": item.get("type") or item.get("action") or "like",
            "url": item.get("url"),
            "page": item.get("page"),
            "text": item.get("text") or (text_by_pid.get(pid) if pid else None),
            "group_id": item.get("group_id"),
            "group_name": item.get("group_name") or (group_by_pid.get(pid) if pid else None),
            "feed": item.get("feed"),
        }
        verdict = eligibility_check(index, candidate, data=data,
                                    batch_seen=batch_seen)
        if verdict["decision"] == "ELIGIBLE":
            actions.append(stamp_evidence(item, verdict, data))
        else:
            dropped.append({"url": candidate["url"], "page": candidate["page"],
                            "decision": verdict["decision"],
                            "primary_reason": verdict["primary_reason"],
                            "reasons": verdict["reasons"]})
    job = {"actions": actions, "minDelaySec": 60, "maxDelaySec": 120,
           "eligibility": {
               "function": ELIGIBILITY_VERSION,
               "checked_at": datetime.now(timezone.utc).isoformat(),
               "eligible": len(actions),
               "dropped": dropped,
           }}
    with open(args.out_path, "w", encoding="utf-8") as f:
        json.dump(job, f, ensure_ascii=False, indent=1)
    print(json.dumps({"eligible": len(actions), "dropped": len(dropped),
                      "out": args.out_path}))
    return 0


def cmd_evidence_check(args):
    """Dispatch-time gate: verify every action's eligibility envelope.
    Exit 0 when all envelopes verify; exit 1 lists the refusals."""
    try:
        data = load_eligibility_data()
    except RuntimeError as e:
        sys.stderr.write("ELIGIBILITY STATE UNREADABLE: %s\n" % e)
        return 3
    try:
        with open(args.in_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except (OSError, ValueError) as e:
        sys.stderr.write("evidence-check input unreadable: %s\n" % e)
        return 2
    items = raw.get("actions", raw) if isinstance(raw, dict) else raw
    bad = []
    for i, item in enumerate(items):
        ok, why = verify_evidence(item, data)
        if not ok:
            bad.append({"index": i, "url": (item or {}).get("url"),
                        "refusal": why})
    print(json.dumps({"checked": len(items), "refused": len(bad), "bad": bad}))
    return 1 if bad else 0


def main():
    p = argparse.ArgumentParser(description="mechanical never-re-engage guard")
    sub = p.add_subparsers(dest="cmd", required=True)

    c = sub.add_parser("check")
    c.add_argument("--platform", required=True, choices=["instagram", "facebook", "threads", "x", "tiktok"])
    c.add_argument("--account", default=None)
    c.add_argument("--url", default=None)
    c.set_defaults(fn=cmd_check)

    f = sub.add_parser("filter")
    f.add_argument("--platform", required=True, choices=["instagram", "facebook", "threads", "x", "tiktok"])
    f.add_argument("--in", dest="in_path", required=True)
    f.add_argument("--out", dest="out_path", required=True)
    f.add_argument("--fb-job", action="store_true")
    f.add_argument("--audit", action="store_true")
    f.set_defaults(fn=cmd_filter)

    r = sub.add_parser("record")
    r.add_argument("--platform", required=True, choices=["instagram", "facebook", "threads", "x", "tiktok"])
    r.add_argument("--account", required=True)
    r.add_argument("--url", default=None)
    r.add_argument("--action", required=True, choices=["like", "comment", "follow"])
    r.add_argument("--manifest", default=None)
    r.set_defaults(fn=cmd_record)

    v = sub.add_parser("verify")
    v.add_argument("--platform", required=True, choices=["instagram", "facebook", "threads", "x", "tiktok"])
    v.add_argument("--report", required=True)
    v.set_defaults(fn=cmd_verify)

    b = sub.add_parser("rebuild")
    b.set_defaults(fn=cmd_rebuild)

    cu = sub.add_parser("curate")
    cu.add_argument("--platform", required=True, choices=["instagram", "facebook", "threads", "x", "tiktok"])
    cu.add_argument("--in", dest="in_path", required=True)
    cu.add_argument("--out", dest="out_path", required=True)
    cu.add_argument("--candidates", default=None,
                    help="optional candidates JSON to join post text/group by post ID")
    cu.set_defaults(fn=cmd_curate)

    ec = sub.add_parser("evidence-check")
    ec.add_argument("--in", dest="in_path", required=True)
    ec.set_defaults(fn=cmd_evidence_check)

    args = p.parse_args()
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
