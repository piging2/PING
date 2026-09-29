#!/usr/bin/env python3
"""authority-check.py <surface> -- fail-closed pre-action authority gate.

Nolan's 90h GO binding directive (2026-09-29): the general bug is that a
scheduled external-action worker acted on a stale stand-down because nothing
forced it to consume current authoritative state before acting.

A schedule is NOT authorization. A stale note is NOT authorization.
A cleared platform timer is NOT authorization.

This gate consumes, in order:
  1. AUTHORITY.json (owner/operator-write-only; workers never write it).
     Missing/unreadable/invalid -> FAIL-CLOSED deny.
  2. The surface's status: HELD/SUPPRESSED -> deny; unknown surface -> fail-closed.
  3. Platform restriction state:
       - tiktok: tiktok-like-recovery-state.json (status BLOCKED, or the most
         recent review decision is "hold").
       - other surfaces: affirmative restriction/hold markers in the recent
         pass-log tail (negation clauses like "no blocks, checkpoints, or
         warnings" are excluded first).
  4. Capability/authorization window in AUTHORITY.json (checked before the
     unstructured log tail: a hard capability flag is more current than
     prose, e.g. instagram ACTIVE after the hold lift but the session still
     unauthenticated denies here, not via a stale log note).
  5. Recent execution history tail for explicit holds (same scan).

Conflicting states (e.g. AUTHORITY.json says ACTIVE but a tripwire is BLOCKED
or the log tail shows an unresolved restriction: a cleared platform timer is
NOT authorization) -> deny AND emit a reconciliation report under
authority-conflicts/.

Exit codes: 0 AUTHORIZED. 1 DENIED (hold/tripwire/capability). 2 CONFLICT
(deny + reconciliation file written). 3 FAIL-CLOSED (infra: file missing,
unreadable, invalid). Exactly one verdict line is printed either way.

Environment overrides (for tests only):
  AUTHORITY_JSON_PATH, AUTHORITY_CONFLICTS_DIR, OUTREACH_ROOT.
"""

import json
import os
import re
import sys
from datetime import datetime, timezone

SURFACES = ("tiktok", "instagram", "facebook", "threads", "x",
            "outreach-engine")

# platform log files scanned for affirmative hold/restriction markers
LOG_FILE = {
    "tiktok": "tiktok-engagement.md",
    "instagram": "instagram-engagement.md",
    "facebook": "facebook-engagement.md",
    "threads": "threads-engagement.md",
    "x": "x-engagement.md",
    # outreach-engine has no engagement log; its structured state is the cron
    # schedule (currently enabled:false) plus AUTHORITY.json.
    "outreach-engine": None,
}

TAIL_LINES = 80

# Log chronological order per surface. threads-engagement.md is newest-first
# (latest pass at the top of the file); the tail scan must read the most
# recent entries, not the oldest. All other engagement logs are oldest-first
# (pass sections appended chronologically).
LOG_ORDER_NEWEST_FIRST = {"threads"}

# A clause is a sentence fragment (split on . ; and newlines). A clause that
# contains a negation word AND any restriction term negates the whole
# enumerated list ("No action block, checkpoint, or rate warning.",
# "No restriction/checkpoint/action-block/login signal.") and must never
# count as a restriction event. Clause-level matching is required because the
# pass logs enumerate several terms after a single "no"; stripping text only
# up to the first term leaves the rest exposed, which caused false conflicts
# on the threads and x tails (2026-09-29).
NEGATOR_RE = re.compile(r"\b(no|none|without|never|zero|0)\b", re.IGNORECASE)
# A clause that LIFTS a restriction ("hold lifted", "restriction cleared",
# "session restored") is not an affirmative hold marker either. Without this,
# a historical line like "owner HOLD lifted mid-morning" false-conflicts.
LIFT_RE = re.compile(
    r"\b(lifted|cleared|resolved|restored|resumed|reopened|re-enabled)\b",
    re.IGNORECASE)
# Precautionary pacing prose ("risking rate-limit flags") describes the
# operator's decision to SKIP engagement to avoid a restriction, not a
# platform restriction event. Without this carve-out the \brate[- ]limit\b
# affirmative marker false-conflicts on the operator's own log prose
# (x passes 2026-09-29: AUTHORITY-DENY-CONFLICT on zero real signal, twice).
# Kept narrow: only clauses containing BOTH a risk word AND rate-limit are
# stripped. A real platform event ("rate limit hit", "temporarily blocked",
# "rate-limit warning received") has no risk word and still fires.
PRECAUTIONARY_RE = re.compile(r"\brisk(?:ing|s)?\b", re.IGNORECASE)
RATE_LIMIT_RE = re.compile(r"\brate[- ]limits?\b", re.IGNORECASE)
# Meta-prose about the gate's own prior classifications (x pass 2026-09-29
# ~13:14 MDT: AUTHORITY-DENY-CONFLICT on 'log-tail "rate-limit" markers
# classified as the operator's own pacing prose' -- prose *describing* a
# reconciliation, not a new restriction). A real platform event is phrased as
# an event ("rate limit hit", "rate-limit warning received"), never as a
# discussion of log markers. Kept narrow: only clauses that mention
# rate-limit AND gate/log-marker vocabulary are stripped.
META_PROSE_RE = re.compile(
    r"log-tail|markers|reconciliation|pacing prose", re.IGNORECASE)
# One-driver browser-lock mechanics (x pass 2026-09-29 ~13:14 MDT:
# 'the follow driver held the one-driver X Chrome lock', 'Gate held clean').
# 'held' as a verb describing lock mechanics is not an account hold. A real
# hold ('account held', 'placed on hold', 'owner hold') has no
# lock/driver/clean context. Kept narrow: only held+lock/driver/held-clean
# clauses are stripped.
HELD_RE = re.compile(r"\bheld\b", re.IGNORECASE)
LOCK_MECHANICS_RE = re.compile(r"\bheld clean\b|lock|driver", re.IGNORECASE)
# Bare "on hold" restriction-state detection (interval 09, Nolan's directive).
# The affirmative list catches "held"/"owner hold" but bare "on hold"
# ("deployment is on hold") was a false negative: the gate looked green while
# the prose expressed a restriction. Rule: restriction STATE, not vocabulary.
# Fires only when "on hold"/"on-hold" is governed by a state verb asserting a
# current restriction (is/are/remains/stays/put/placed/currently/still).
# Meta-prose ABOUT holds (reporting, documenting, testing) is stripped below
# like other negated clauses. A naive \bon[ -]?hold\b substring would
# recreate the false-positive class just eliminated, so the state verb is
# required.
ON_HOLD_STATE_RE = re.compile(
    r"\b(?:is|are|was|were|remains?|stay(?:s|ed|ing)?|put|placed?|"
    r"currently|still)\b[^.;\n]{0,30}?\bon[ -]?hold\b",
    re.IGNORECASE)
ON_HOLD_META_RE = re.compile(
    r"\b(?:report|duration|documentation|describes?|test|fixture|"
    r"verif(?:y|ies|ication)|handling)\b",
    re.IGNORECASE)
RESTRICTION_TERM_RE = re.compile(
    r"restriction|restrictions|block|blocks|blocked|checkpoint|checkpoints|"
    r"warning|warnings|rate[- ]limits?|signals?|action[- ]blocks?|"
    r"stand-?down|owner[- ]hold|temporarily blocked|"
    r"verification (challenge|nudge)",
    re.IGNORECASE)


def strip_negated_clauses(line):
    """Remove clauses whose restriction terms are negated, lifted, or merely
    precautionary pacing prose.

    "No action block, checkpoint, or rate warning." -> the whole clause goes.
    "owner HOLD lifted mid-morning" -> the hold was lifted, not imposed.
    "risking rate-limit flags, so we skipped" -> precautionary, not an event.
    A clause without a negation/lift/precaution word is kept verbatim for the
    affirmative scan that follows.
    """
    kept = []
    for clause in re.split(r"[.;\n]", line):
        # Lock-mechanics 'held' ('the driver held the X Chrome lock', 'gate
        # held clean') is not an account hold. This branch does not require a
        # RESTRICTION_TERM_RE hit because 'held' lives only in AFFIRMATIVE_RES.
        if HELD_RE.search(clause) and LOCK_MECHANICS_RE.search(clause):
            continue
        # Bare "on hold" restriction state ("deployment is on hold"). Strip
        # only meta-prose about holds (reporting/documenting/testing) or a
        # negated/lifted hold; a genuine state claim is kept for the
        # affirmative scan. The state-verb requirement in ON_HOLD_STATE_RE is
        # what keeps "report on hold duration" from ever reaching here.
        if ON_HOLD_STATE_RE.search(clause) and (
                ON_HOLD_META_RE.search(clause)
                or NEGATOR_RE.search(clause)
                or LIFT_RE.search(clause)):
            continue
        if RESTRICTION_TERM_RE.search(clause) and (
                NEGATOR_RE.search(clause) or LIFT_RE.search(clause)
                or (PRECAUTIONARY_RE.search(clause)
                    and RATE_LIMIT_RE.search(clause))
                or (RATE_LIMIT_RE.search(clause)
                    and META_PROSE_RE.search(clause))):
            continue
        kept.append(clause)
    return " ".join(kept)

# Affirmative markers of a real hold or restriction.
AFFIRMATIVE_RES = [
    re.compile(r"temporarily blocked", re.I),
    re.compile(r"\bstand-?down\b", re.I),
    re.compile(r"\bowner[- ]hold\b", re.I),
    re.compile(r"\bheld\b", re.I),
    ON_HOLD_STATE_RE,
    re.compile(r"restriction signal", re.I),
    re.compile(r"\baction[- ]block\b", re.I),
    re.compile(r"\bcheckpoint\b", re.I),
    re.compile(r"verification (challenge|nudge)", re.I),
    re.compile(r"\brate[- ]limit\b", re.I),
]


def utcnow():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def verdict(code, surface, reason):
    kind = {0: "AUTHORITY-ALLOW", 1: "AUTHORITY-DENY",
            2: "AUTHORITY-DENY-CONFLICT", 3: "AUTHORITY-FAIL-CLOSED"}[code]
    print(f"{kind} surface={surface} reason={reason}", flush=True)
    return code


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def tiktok_restriction(outreach_root):
    """Return a restriction description string, or None if clear."""
    path = os.path.join(outreach_root, "tiktok-like-recovery-state.json")
    try:
        st = load_json(path)
    except (OSError, ValueError) as e:
        return f"tripwire unreadable: {e}"
    if str(st.get("status")) != "CLEAR":
        return (f"tripwire status={st.get('status')} "
                f"(durable_like_cap={st.get('durable_like_cap')}); "
                "a recorded review is required to clear it")
    reviews = st.get("reviews") or []
    if reviews and str(reviews[-1].get("decision")).lower() == "hold":
        return (f"latest tripwire review decision=hold "
                f"(pass_id={reviews[-1].get('pass_id')}); "
                "no owner decision has re-authorized action")
    return None


# A pass-section header starts the execution history; everything before it is
# standing header/rules boilerplate, which must never be scanned for
# restriction markers (its prose affirmatively names the events the gate
# watches for, e.g. "surface to Nolan on block, checkpoint, ...").
# Matches "### Pass 143", "## Pass 1 — ...", "## 2026-09-10 — Pass 1".
# Does NOT match "## Header rules (read before every pass)" or "## Passes".
PASS_SECTION_RE = re.compile(r"^#{2,3}\s+(Pass\b|\d{4}-\d{2}-\d{2})",
                             re.IGNORECASE)


def tail_affirmative_markers(log_path, from_line=0, newest_first=False):
    """Scan the log tail for affirmative hold/restriction markers.

    Negation/lift clauses are stripped first, so routine lines like
    'no blocks, checkpoints, or warnings' or 'hold lifted' never match.
    from_line skips lines superseded by a recorded owner reconciliation
    (AUTHORITY.json tail_scan_from_line): only lines appended after the
    reconciliation decision count as current state.
    newest_first: the log's most recent entries are at the top
    (threads-engagement.md). Lines are reversed into chronological order
    first so the scanned "recent tail" is actually recent. Without this the
    scan reads the oldest passes and a fresh restriction would go
    undetected: fail-open on the safety gate (2026-09-29).
    """
    try:
        with open(log_path, "r", encoding="utf-8") as f:
            lines = f.read().splitlines()
    except OSError:
        return None  # missing log is not evidence of a restriction
    # from_line is in file-line coordinates (recorded at reconciliation time);
    # apply it before dropping the header so existing reconciliations keep
    # their meaning.
    lines = lines[from_line:]
    # Drop standing header/rules boilerplate: only pass sections are
    # execution history. In every log the header precedes the first pass
    # section in file coordinates, regardless of chronological order.
    # If no pass header is found, scan everything.
    for i, ln in enumerate(lines):
        if PASS_SECTION_RE.match(ln):
            lines = lines[i:]
            break
    if newest_first:
        lines = lines[::-1]  # chronological: oldest -> newest
    recent = lines[-TAIL_LINES:]
    hits = []
    for ln in recent:
        stripped = strip_negated_clauses(ln)
        for rx in AFFIRMATIVE_RES:
            m = rx.search(stripped)
            if m:
                hits.append(f"{m.group(0)} :: {ln.strip()[:160]}")
                break
    return hits


def write_conflict_report(conflicts_dir, surface, authority_entry,
                          tripwire_note, log_markers):
    os.makedirs(conflicts_dir, exist_ok=True)
    path = os.path.join(
        conflicts_dir,
        f"authority-conflict-{surface}-{utcnow().replace(':', '')}.json")
    report = {
        "surface": surface,
        "ts": utcnow(),
        "authority_json_status": (authority_entry or {}).get("status"),
        "authority_reason": (authority_entry or {}).get("reason"),
        "tripwire_restriction": tripwire_note,
        "log_tail_markers": log_markers,
        "reconciliation_required": (
            "AUTHORITY.json says ACTIVE but a tripwire or the recent pass log "
            "shows an unresolved hold/restriction. A cleared platform timer is "
            "NOT authorization. Do not act until the owner reconciles these "
            "states and records the decision in AUTHORITY.json (and in the "
            "platform tripwire review entry where one exists)."),
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    return path


def main(argv):
    if len(argv) != 2 or argv[1] not in SURFACES:
        print(f"usage: authority-check.py {{{'|'.join(SURFACES)}}}",
              file=sys.stderr)
        return 3
    surface = argv[1]

    outreach_root = os.environ.get("OUTREACH_ROOT",
                                   os.path.expanduser("~/workspace/outreach"))
    authority_path = os.environ.get(
        "AUTHORITY_JSON_PATH", os.path.join(outreach_root, "AUTHORITY.json"))
    conflicts_dir = os.environ.get(
        "AUTHORITY_CONFLICTS_DIR",
        os.path.join(outreach_root, "authority-conflicts"))

    # 1. Canonical state: missing/unreadable/invalid = fail closed.
    try:
        authority = load_json(authority_path)
        entry = authority["surfaces"][surface]
    except (OSError, ValueError, KeyError, TypeError) as e:
        return verdict(3, surface,
                       f"AUTHORITY.json missing/unreadable/invalid: {e}; "
                       "fail closed")

    status = str(entry.get("status", "")).upper()

    # 2. Owner/operator status.
    if status in ("HELD", "SUPPRESSED"):
        return verdict(
            1, surface,
            f"{status}: {entry.get('reason', 'no reason recorded')} "
            f"(set_by={entry.get('set_by')} set_at={entry.get('set_at')})")
    if status != "ACTIVE":
        return verdict(3, surface,
                       f"unknown status {status!r}; fail closed")

    # 3. Platform restriction state (structured tripwires).
    tripwire_note = None
    if surface == "tiktok":
        tripwire_note = tiktok_restriction(outreach_root)
        if tripwire_note:
            path = write_conflict_report(conflicts_dir, surface, entry,
                                         tripwire_note, [])
            return verdict(
                2, surface,
                f"CONFLICT: AUTHORITY.json ACTIVE but restriction stands: "
                f"{tripwire_note}. Reconciliation report: {path}")

    # 4. Capability/authorization window (before the unstructured log tail:
    #    a hard capability flag outranks prose).
    cap = entry.get("capability") or {}
    if cap.get("authorized") is False:
        return verdict(1, surface,
                       f"capability not authorized: {cap.get('notes', '')}")

    # 5. Recent execution history tail: explicit holds in the pass log.
    #    tail_scan_from_line (set by a recorded owner reconciliation) skips
    #    log lines that predate the reconciliation decision; only newer lines
    #    count as current state.
    log_name = LOG_FILE[surface]
    log_markers = []
    if log_name:
        from_line = entry.get("tail_scan_from_line") or 0
        log_markers = tail_affirmative_markers(
            os.path.join(outreach_root, log_name), from_line,
            newest_first=(surface in LOG_ORDER_NEWEST_FIRST)) or []
        if log_markers:
            path = write_conflict_report(conflicts_dir, surface, entry,
                                         tripwire_note, log_markers)
            return verdict(
                2, surface,
                f"CONFLICT: AUTHORITY.json ACTIVE but recent pass log shows "
                f"unresolved hold/restriction markers ({len(log_markers)}). "
                f"Reconciliation report: {path}")

    return verdict(0, surface, "authorized")


if __name__ == "__main__":
    sys.exit(main(sys.argv))
