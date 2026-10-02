#!/usr/bin/env python3
"""authority-check.py <surface> -- fail-closed pre-action authority gate.

Nolan's 90h GO binding directive (2026-09-29): the general bug is that a
scheduled external-action worker acted on a stale stand-down because nothing
forced it to consume current authoritative state before acting.

A schedule is NOT authorization. A stale note is NOT authorization.
A cleared platform timer is NOT authorization.

This gate consumes, in order:
  0. holds.json (THE machine-readable hold state; prose in engagement-md
     headers NEVER constitutes a hold). An active hold for the surface ->
     DENIED. Missing/unreadable/invalid -> FAIL-CLOSED deny.
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
  AUTHORITY_JSON_PATH, AUTHORITY_CONFLICTS_DIR, OUTREACH_ROOT,
  HOLDS_JSON_PATH.
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
# "session restored", "hold removed") is not an affirmative hold marker
# either. Without this, a historical line like "owner HOLD lifted
# mid-morning" false-conflicts.
LIFT_RE = re.compile(
    r"\b(lifted|cleared|resolved|restored|resumed|reopened|re-enabled|"
    r"removed)\b",
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
# Explicit prose negation of a hold-state claim ('x not held', 'X is not
# on hold', "x isn't held") is a claim of NOT held, never a hold. This is a
# NEW defect class from the 2026-10-01 19:14 MDT x incident: the gate fired
# on the bare \bheld\b inside 'holds.json x not held' (an explicit NOT-held
# claim), false-DENY-CONFLICTing every X pass. The pointer-bump workaround
# was rejected; the parser is fixed instead.
#
# Semantics follow send-eligibility.py's "directly negated marker" precedent
# ('not sent' is the absence of a send, never a touch): the negator must
# DIRECTLY govern the hold token. Allowed forms:
#   not held / never held / n't held (isn't, wasn't, hasn't been)
#   is|are|was|were|be not|never held
#   not on hold / never on hold / is not on hold
# Neutralized, never dropped: the negated span is substituted out but the
# rest of the clause is still scanned, so a real restriction asserted
# alongside it ('x not held, checkpoint received') still fires.
#
# Anything that is NOT an explicit direct negation stays ambiguous and
# keeps firing: fail closed on ambiguity ('whether x is held', 'is x held?',
# 'reportedly held', 'not currently held' with an adverb gap). Deliberately
# tight: an adverb gap ('not released, still held') must never neutralize a
# real affirmative claim.
HELD_NEGATED_RE = re.compile(
    r"\b(?:is|are|was|were|be|been|being)\s+(?:not|never)\s+held\b"
    r"|\b(?:not|never)\s+held\b"
    r"|\b(?:not|never)-held\b"
    r"|\b\w+n't\s+(?:been\s+)?held\b"
    r"|\b(?:is|are|was|were)\s+not\s+on[ -]?hold\b"
    r"|\b(?:not|never)\s+on[ -]?hold\b",
    re.IGNORECASE)
# Explicit held=false assignment: machine-readable NOT-held state
# (x passes 2026-10-01 11:14/13:14 MDT: pass logs document
# 'holds.json: x held=false' when recording the gate result; the bare
# \bheld\b in HELD_RE fired on it and the gate DENY-CONFLICTed on its own
# documentation, self-reinforcing every pass). Neutralized, never dropped:
# the assignment is substituted out but the rest of the clause is still
# scanned, so a real hold asserted alongside it still fires. 'held=true',
# 'account held', 'placed on hold', 'owner hold' are untouched by this.
HELD_FALSE_RE = re.compile(r"\bheld\b[\"']?\s*[:=]\s*false\b", re.IGNORECASE)
# Meta-prose about the gate's own prior verdicts/classifications
# ('authority-check.py x exited 2 (AUTHORITY-DENY-CONFLICT)', 'the tail
# scanner fired on the bare token "held"', 'the single log-tail marker is
# the word "held"', 'false-positive review'). This is the gate talking about
# itself, not the world asserting a hold. Without this, a false-positive
# denial self-reinforces: the denial is logged, the log line re-triggers the
# denial on the quoted/discussed token, forever (2026-10-01 x passes: line
# 1236 documents the false positive on 'x not held' and re-fires on it).
# Strip only when the clause asserts no OTHER affirmative marker after the
# gate vocabulary, the discussed token, and negated hold claims are removed:
# a real restriction documented alongside gate meta-prose still fires.
# A bare pasted gate verdict over a REAL hold ('AUTHORITY-DENY-CONFLICT: x
# held') keeps firing on the hold words after the verdict token is removed.
GATE_META_RE = re.compile(
    r"authority-check\.py"
    r"|AUTHORITY-(?:ALLOW|DENY(?:-CONFLICT)?|FAIL-CLOSED)"
    r"|\btail scanner\b"
    r"|\bfalse[- ]positives?\b"
    r"|\bbare token\b"
    r"|\blog-tail markers?\b"
    r"|\bthe word [\"']held[\"']",
    re.IGNORECASE)
_QUOTED_HELD_RE = re.compile(r"[\"']held[\"']", re.IGNORECASE)
# Surface-name tokens for cross-surface attribution (fb pass 165,
# 2026-09-30 ~11:33 MDT: the clause "IG engagement HELD per 90h GO"
# false-conflicted surface=facebook -- the HELD was scoped to Instagram,
# and the same note explicitly allowed facebook). A hold/restriction marker
# explicitly scoped to a DIFFERENT surface must not block the surface being
# checked. Kept fail-safe: a marker with no surface token, or one naming
# the checked surface (even alongside others), still fires.
# X matches uppercase only: lowercase x is ordinary prose.
_SURFACE_TOKEN_SRC = {
    "tiktok": [(r"\btiktok\b", True)],
    "instagram": [(r"\big\b", True), (r"\binstagram\b", True)],
    "facebook": [(r"\bfacebook\b", True), (r"\bfb\b", True)],
    "threads": [(r"\bthreads\b", True)],
    "x": [(r"(?<![A-Za-z])X(?![A-Za-z])", False)],
    "outreach-engine": [(r"\boutreach[- ]engine\b", True)],
}
SURFACE_TOKENS = {
    s: [re.compile(p, re.IGNORECASE if ci else 0) for p, ci in toks]
    for s, toks in _SURFACE_TOKEN_SRC.items()
}
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
# Deliberation ABOUT a hold ("discussing whether to put the campaign on
# hold", "should we put the campaign on hold", "proposal: put the campaign
# on hold") is not a hold in force: the hold is being considered, not
# imposed. Without this carve-out the "put"/"placed" placement verbs in
# ON_HOLD_STATE_RE fire on proposal prose and the gate denies on zero real
# signal (interval 09 blind spot). Kept narrow on purpose:
#   - "whether" before the state verb always marks a question about the
#     state, never an assertion ("whether the campaign is on hold").
#   - other deliberation verbs only neutralize the placement verbs
#     put/placed, the verbs proposals use. An adjunct like "after
#     discussing, the campaign is on hold" still asserts a current hold via
#     "is" and keeps firing. A bare recommendation ("we should put the
#     campaign on hold") stays fail-closed: intent is not discussion.
ON_HOLD_DISCUSS_RE = re.compile(
    r"\b(?:whether|discuss(?:ed|ing|es|ion)?|consider(?:ed|ing|s|ation)?|"
    r"propos(?:e[sd]?|al|ing)|debat(?:e[sd]?|ing)|talk(?:ed|ing|s)? about|"
    r"think(?:ing)? about|maybe|should we)\b",
    re.IGNORECASE)
ON_HOLD_PLACEMENT_VERB_RE = re.compile(r"put|placed?", re.IGNORECASE)
RESTRICTION_TERM_RE = re.compile(
    r"restriction|restrictions|block|blocks|blocked|checkpoint|checkpoints|"
    r"warning|warnings|rate[- ]limits?|signals?|action[- ]blocks?|"
    r"stand-?down|owner[- ]hold|temporarily blocked|"
    r"verification (challenge|nudge)",
    re.IGNORECASE)


def on_hold_deliberated(clause):
    """True when the clause's 'on hold' match is deliberation, not state.

    See ON_HOLD_DISCUSS_RE for the narrowing rules. The deliberation marker
    must precede the state verb: "the campaign is on hold, whether we like
    it or not" asserts a hold first and keeps firing.
    """
    m = ON_HOLD_STATE_RE.search(clause)
    if not m:
        return False
    dm = ON_HOLD_DISCUSS_RE.search(clause[:m.start()])
    if not dm:
        return False
    if dm.group(0).lower() == "whether":
        return True
    return bool(ON_HOLD_PLACEMENT_VERB_RE.match(m.group(0)))


def _gate_meta_only(clause):
    """True when the clause only discusses the gate's own prior verdicts or
    classifications and asserts no other restriction.

    The discussed token is quoted or named as gate vocabulary ('the bare
    token "held"', 'authority-check.py x exited 2 (AUTHORITY-DENY-CONFLICT)',
    'the single log-tail marker is the word "held"'); a genuine hold claim
    ('account held', 'held=true', 'placed on hold', 'owner hold') is never
    phrased as gate meta-prose. After removing the gate vocabulary, the
    discussed token, and negated hold claims, any remaining affirmative
    marker keeps the clause, so a real restriction documented alongside the
    meta-prose still fires.
    """
    if not GATE_META_RE.search(clause):
        return False
    rest = GATE_META_RE.sub(" ", clause)
    rest = _QUOTED_HELD_RE.sub(" ", rest)
    rest = HELD_NEGATED_RE.sub(" ", rest)
    rest = HELD_FALSE_RE.sub(" ", rest)
    return not any(rx.search(rest) for rx in AFFIRMATIVE_RES)


def strip_negated_clauses(line, surface=None):
    """Remove clauses whose restriction terms are negated, lifted, or merely
    precautionary pacing prose.

    "No action block, checkpoint, or rate warning." -> the whole clause goes.
    "owner HOLD lifted mid-morning" -> the hold was lifted, not imposed.
    "risking rate-limit flags, so we skipped" -> precautionary, not an event.
    A clause without a negation/lift/precaution word is kept verbatim for the
    affirmative scan that follows.

    surface: when given, also strip clauses whose affirmative marker is
    explicitly scoped to a DIFFERENT surface ("IG engagement HELD" while
    checking facebook). Only strips when the clause names another surface
    and does NOT name the checked surface; ambiguous clauses still fire.
    """
    kept = []
    for clause in re.split(r"[.;\n]", line):
        # Explicitly-negated machine hold state ('holds.json: x held=false',
        # '"held": false') is a claim of NOT held, never a hold. Substitute
        # the assignment out but keep scanning the rest of the clause: a
        # real hold asserted alongside it must still fire.
        clause = HELD_FALSE_RE.sub(" ", clause)
        # Explicit prose negation of a hold-state claim ('x not held',
        # 'X is not on hold', "x isn't held") is a claim of NOT held, never
        # a hold. Same neutralization discipline as the machine assignment
        # above: substitute the negated span out, keep scanning the rest of
        # the clause. Anything not an explicit direct negation stays
        # ambiguous and keeps firing (fail closed).
        clause = HELD_NEGATED_RE.sub(" ", clause)
        # Meta-prose ABOUT the gate's own prior verdicts/classifications
        # ('authority-check.py x exited 2 (AUTHORITY-DENY-CONFLICT)', 'the
        # tail scanner fired on the bare token "held"') describes the gate,
        # not a restriction. Drop the clause only when it discusses the gate
        # and asserts nothing else; anything still affirmative after removing
        # the gate vocabulary and discussed token keeps the clause.
        if _gate_meta_only(clause):
            continue
        # Lock-mechanics 'held' ('the driver held the X Chrome lock', 'gate
        # held clean') is not an account hold. This branch does not require a
        # RESTRICTION_TERM_RE hit because 'held' lives only in AFFIRMATIVE_RES.
        if HELD_RE.search(clause) and LOCK_MECHANICS_RE.search(clause):
            continue
        # Bare "on hold" restriction state ("deployment is on hold"). Strip
        # only meta-prose about holds (reporting/documenting/testing),
        # deliberation about a hold ("discussing whether to put the campaign
        # on hold"), or a negated/lifted hold; a genuine state claim is kept
        # for the affirmative scan. The state-verb requirement in
        # ON_HOLD_STATE_RE is what keeps "report on hold duration" from ever
        # reaching here.
        if ON_HOLD_STATE_RE.search(clause) and (
                ON_HOLD_META_RE.search(clause)
                or NEGATOR_RE.search(clause)
                or LIFT_RE.search(clause)
                or on_hold_deliberated(clause)):
            continue
        if RESTRICTION_TERM_RE.search(clause) and (
                NEGATOR_RE.search(clause) or LIFT_RE.search(clause)
                or (PRECAUTIONARY_RE.search(clause)
                    and RATE_LIMIT_RE.search(clause))
                or (RATE_LIMIT_RE.search(clause)
                    and META_PROSE_RE.search(clause))):
            continue
        # Cross-surface attribution: a hold/restriction marker explicitly
        # scoped to a different surface is not a hold on the checked
        # surface. Strip only when the clause names another surface and does
        # not name the checked surface; anything ambiguous still fires.
        if surface in SURFACE_TOKENS and any(
                rx.search(clause) for rx in AFFIRMATIVE_RES):
            self_hit = any(rx.search(clause)
                           for rx in SURFACE_TOKENS[surface])
            other_hit = any(rx.search(clause)
                            for s, toks in SURFACE_TOKENS.items()
                            if s != surface for rx in toks)
            if other_hit and not self_hit:
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


def tail_affirmative_markers(log_path, from_line=0, newest_first=False,
                             surface=None):
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
    surface: passed through for cross-surface marker attribution.
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
        stripped = strip_negated_clauses(ln, surface)
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
    holds_path = os.environ.get(
        "HOLDS_JSON_PATH", os.path.join(outreach_root, "holds.json"))

    # 0. Executable hold state: missing/unreadable/invalid = fail closed.
    #    An active hold here denies the pass at BOTH build time (the cron
    #    body runs this gate before discovery/job build) and dispatch time
    #    (run_*_pass.sh runs this gate before anything reaches the Pig).
    try:
        holds_state = load_json(holds_path)
        hold_entry = holds_state["holds"][surface]
    except (OSError, ValueError, KeyError, TypeError) as e:
        return verdict(3, surface,
                       f"holds.json missing/unreadable/invalid: {e}; "
                       "fail closed")

    if hold_entry.get("held"):
        return verdict(
            1, surface,
            f"HELD (holds.json): {hold_entry.get('reason', 'no reason')} "
            f"(set_by={hold_entry.get('set_by')} "
            f"set_at={hold_entry.get('set_at')} ref={hold_entry.get('ref')})")

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
            newest_first=(surface in LOG_ORDER_NEWEST_FIRST),
            surface=surface) or []
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
