#!/usr/bin/env python3
"""Deterministic send-eligibility gate for the PING Social outreach engine.

PROSE IS NOT AUTHORITY. Notes may inform humans; notes NEVER resurrect a
completed sequence.

Implements the precedence from the 2026-09-21 CEO directive (highest first):
  1. CANONICAL STRUCTURED STATE (JSONL row + pipeline.md row)
  2. explicit suppression
  3. verified communication history (per-recipient sent-mail counts + logs)
  4. derived projection (touch gaps, next-eligible dates)
  5. notes / free text (leads.md, learnings.md) -- advisory ONLY, never
     authoritative

Fail-closed invariant: if structured state and a note disagree, DO NOT SEND.
The checker emits a discrepancy record as evidence and requires explicit
reconciliation before any send to that recipient.

Usage (run by the agent BEFORE any email send, DM, or form submit):
  python3 send-eligibility.py --business "Name" --email addr \
      --action {cold-email,followup-f1,followup-f2,review-triggered,dm,form-submit} \
      --gmail-sent-count N [--campaign NAME] [--day YYYY-MM-DD]

--gmail-sent-count is the per-recipient count from the MANDATORY agent-run
Gmail verification: `in:sent to:<addr>`. It is REQUIRED: if it is missing,
the check fails closed (exit 3). Never guess it.

Exit codes: 0 = ELIGIBLE (send may proceed)
            1 = INELIGIBLE (clean block, no discrepancy)
            2 = DISCREPANCY (fail closed; reconciliation required)
            3 = ERROR / incomplete inputs

Discrepancies are appended to eligibility-discrepancies.jsonl.
Reconciliations are appended to eligibility-reconciliations.md:
  YYYY-MM-DD | <discrepancy_id> | <recipient> | <state_hash> | <note hashes> | <text>
A reconciliation covers a discrepancy only while the structured state hash
is unchanged; if the structured state changes, the check re-evaluates.
Every run appends an audit row to eligibility-audit.jsonl.
"""
import argparse
import datetime
import hashlib
import json
import os
import re
import sys

HOME = os.path.expanduser("~")
OUTREACH = os.path.join(HOME, "workspace/outreach")
YOUR_FILES = os.path.join(HOME, "workspace/your_files")

JSONL_DEFAULT = os.path.join(YOUR_FILES, "western-co-prospects.jsonl")
PIPELINE_DEFAULT = os.path.join(OUTREACH, "pipeline.md")
LEADS_DEFAULT = os.path.join(OUTREACH, "leads.md")
LEARNINGS_DEFAULT = os.path.join(OUTREACH, "learnings.md")
FOLLOWUPS_DEFAULT = os.path.join(OUTREACH, "follow-ups.md")
FB_DMS_DEFAULT = os.path.join(OUTREACH, "facebook-dms.md")
QUEUE_DIR_DEFAULT = OUTREACH
SWEEP_DIR_DEFAULT = os.path.join(HOME, "workspace/goals/ping-social-outreach-campaign/hidden_files")
DISCREP_DEFAULT = os.path.join(OUTREACH, "eligibility-discrepancies.jsonl")
AUDIT_DEFAULT = os.path.join(OUTREACH, "eligibility-audit.jsonl")
RECONCILE_DEFAULT = os.path.join(OUTREACH, "eligibility-reconciliations.md")

ACTIONS = ("cold-email", "followup-f1", "followup-f2", "review-triggered",
           "dm", "form-submit")

# Marker regexes, longest first, case-insensitive.
TOUCH_RX = re.compile(r"\bF2 SENT\b|\bF1 SENT\b|\bDM SENT\b|\bSUBMITTED\b|\bSENT\b",
                      re.IGNORECASE)
# A marker directly negated ("not sent", "never sent", "not submitted") is
# the absence of a send, never a touch. Hardened 2026-09-22: negations were
# systematically miscounted as sends (e.g. pipeline prose "not sent").
NEGATED_RX = re.compile(
    r"\b(not|never)\s+(F2 SENT|F1 SENT|DM SENT|SENT|SUBMITTED)\b",
    re.IGNORECASE)
# "sent mail" is the Gmail Sent-folder reference in verification prose
# ("verified in sent mail"), never a send marker. Hardened 2026-09-23:
# the bare word "sent" inside "verified in sent mail" phantom-counted a
# third touch on three F2 candidates whose real history was 2 sends.
SENT_MAIL_RX = re.compile(r"\s+mail\b", re.IGNORECASE)
DATE_RX = re.compile(r"(\d{4}-\d{2}-\d{2})")
COMPLETE_PHRASES = ("ladder complete", "no further touches", "never again")
SUPPRESS_HARD = ("suppress", "declined", "bounced", "opt-out", "optout",
                 "franchise")

# A note line "suggests outreach" if it hints another touch is due/eligible.
# A line that merely records a completed send is history, not a suggestion;
# a line asserting completion/suppression is an asserts-done signal.
SUGGEST_RX = re.compile(
    r"\beligible\b|\bqueued\b|"
    r"\b(send|re-?contact|revisit|reach out|draft)\b[^.]{0,40}\b(f1|f2|follow-?up|touch)\b|"
    r"\b(f1|f2|follow-?up|touch)\b[^.]{0,40}\b(send|draft|queued|eligible|pending|due)\b|"
    r"\bf1\b|\bf2\b(?!\s*sent)",
    re.IGNORECASE)
# A note line that asserts completion/suppression (used when structured says eligible).
NOTE_ASSERTS_DONE_RX = re.compile(
    r"\b(ladder complete|no further touches|never again|suppressed|declined|"
    r"opt-?out|bounced|do not contact)\b",
    re.IGNORECASE)


def norm(s):
    return re.sub(r"\s+", " ", (s or "").strip().lower())


ROW_STATUS_RX = re.compile(
    r"^(QUEUED|DRAFTED|SENT|SUBMITTED|SKIPPED|NEW|WATCH|PARKED|EXCLUDED|"
    r"DUPLICATE|CONTACTED|DM\s+SENT)\b[\s0-9\-/]*", re.I)


def is_row_subject(raw, business):
    """True if this pipeline.md line is a prospect row about `business`.

    Row formats in this corpus put the prospect name first:
      "- Kooler Garage Doors | garage doors | ..."
      "- QUEUED 2026-09-10 | Winch & Willow Services LLC | ..."
      "- **Winch & Willow Services LLC** (business Page ...) | cleaning | ..."
    Audit/near-miss prose names several prospects mid-sentence; those lines
    are NOT row-subject and need segment-level attribution instead.
    """
    head = raw.lstrip()
    head = re.sub(r"^[-*]\s*", "", head)
    head = re.sub(r"^\*\*", "", head)
    head = ROW_STATUS_RX.sub("", head).lstrip()
    head = head.lstrip("|").lstrip()
    return norm(head).startswith(norm(business))


def attributed_text(raw, business, email):
    """Return (text, dropped_markers) for touch counting on a pipeline hit.

    A row-subject line is scanned whole: every marker in the row describes
    this prospect's outreach. Any other line is audit prose that may name
    several prospects; only ";"- / "|"-delimited segments that mention this
    prospect (by name or email) contribute. Markers belonging to other
    named prospects are excluded and reported via dropped_markers.

    Rationale (2026-09-24): pipeline.md:2748 names "Kooler Garage Doors"
    alongside "Alpine Property Services pipeline SENT 2026-09-23 cold";
    the unscoped substring scan counted Alpine's SENT as Kooler's touch,
    manufacturing a JSONL-vs-pipeline discrepancy that blocked a legitimate
    cold send. Fail direction preserved: a genuine row-subject line still
    counts all its markers, and the Gmail hard block remains the backstop.
    """
    if is_row_subject(raw, business):
        return raw, 0
    b, e = norm(business), norm(email)
    kept, dropped = [], 0
    for seg in re.split(r"[;|]", raw):
        low = norm(seg)
        if (b and b in low) or (e and e in low):
            kept.append(seg)
        else:
            dropped += len(TOUCH_RX.findall(seg))
    return " ".join(kept), dropped


def sha1(s):
    return hashlib.sha1(s.encode("utf-8")).hexdigest()[:16]


def read_jsonl_rows(path):
    rows = []
    try:
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line:
                    try:
                        rows.append(json.loads(line))
                    except json.JSONDecodeError:
                        pass
    except OSError:
        pass
    return rows


def find_jsonl_row(rows, business, email):
    b, e = norm(business), norm(email)
    for r in rows:
        if b and norm(r.get("business_name")) == b:
            return r
        if e and norm(r.get("email")) == e:
            return r
    return None


def find_pipeline_rows(path, business, email):
    hits = []
    b, e = norm(business), norm(email)
    try:
        with open(path, encoding="utf-8", errors="replace") as fh:
            for ln, raw in enumerate(fh, 1):
                low = norm(raw)
                if (b and b in low) or (e and e in low):
                    hits.append((ln, raw.rstrip("\n")))
    except OSError:
        pass
    return hits


def touch_markers(text):
    """Count accepted-touch markers; returns (count, dates, complete, collapsed).

    One touch per ladder rung: the same rung (SENT / F1 SENT / F2 SENT /
    DM SENT / SUBMITTED) re-described on different dates is one touch, not
    two. The earliest dated description wins; a dated description refines an
    undated one. `collapsed` lists (rung, kept_date, dropped_date) tuples so
    callers can log the evidence. Rationale (2026-09-23): a stale queue note
    ("F1 sent 2026-09-16") re-describing the same F1 that follow-ups.md
    records as F1 SENT 2026-09-17 phantom-counted a third touch and blocked
    four legitimate F2s. Genuine duplicate sends are still caught by the
    Gmail-sent-count hard block (ladder budget 3), which is the backstop.

    Guards (2026-09-22, extended 2026-09-23):
    1. Negations ("not sent", "never sent", "not submitted") are not sends.
    2. "sent mail" is the Gmail Sent-folder reference in verification prose
       ("verified in sent mail"), never a send marker. Without this guard
       the bare word "sent" inside "sent mail" phantom-counts an extra
       touch (2026-09-23: three F2 candidates read as ladder-complete).
    3. The same (marker, date) pair described twice (e.g. a pipeline row
       plus a dedup-audit line referencing the same send) counts once.
       Distinct ladder rungs (SENT vs F1 SENT vs F2 SENT) never dedup
       against each other. Caveat: two genuinely distinct sends of the
       same rung on the same date would merge; that does not occur in
       this system (one touch per rung per prospect), and the
       Gmail-vs-structured cross-check remains the backstop.
    """
    seen_pairs = set()
    best_by_rung = {}
    collapsed = []
    for m in TOUCH_RX.finditer(text):
        start, end = m.start(), m.end()
        # Guard 1: a directly negated marker is the absence of a send.
        if NEGATED_RX.search(text[max(0, start - 16):end]):
            continue
        marker_class = m.group(0).upper()
        # Guard 2: "sent mail" is the Gmail Sent-folder reference, not a send.
        if marker_class == "SENT" and SENT_MAIL_RX.match(text[end:]):
            continue
        # Associate the nearest same-line date; an identical
        # (marker, date) pair is one touch no matter how often re-described.
        ls = text.rfind("\n", 0, start) + 1
        le = text.find("\n", end)
        line = text[ls:] if le == -1 else text[ls:le]
        line_off = start - ls
        best, best_dist = None, None
        for dm in DATE_RX.finditer(line):
            dist = abs(dm.start() - line_off)
            if best_dist is None or dist < best_dist:
                best, best_dist = dm.group(1), dist
        pair = (marker_class, best)
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)
        # Guard 3: the same rung re-described on a different date is still
        # one touch (2026-09-23: stale "F1 sent 2026-09-16" queue note vs
        # the Gmail-verified F1 SENT 2026-09-17). Keep the earliest dated
        # description; a dated description refines an undated one.
        if marker_class in best_by_rung:
            prev = best_by_rung[marker_class]
            if best and (prev is None or best < prev):
                collapsed.append((marker_class, best, prev))
                best_by_rung[marker_class] = best
            elif best != prev:
                collapsed.append((marker_class, prev, best))
        else:
            best_by_rung[marker_class] = best
    dates = [d for d in best_by_rung.values() if d]
    low = text.lower()
    complete = any(p in low for p in COMPLETE_PHRASES)
    return len(best_by_rung), dates, complete, collapsed


def structured_verdict(row, pipeline_hits, action, today, business, email):
    """Level 1+2: canonical structured state and explicit suppression.

    JSONL and pipeline.md describe the SAME outreach, so touch counts are
    compared (max wins) rather than summed. A disagreement between the two
    canonical sources is itself a fail-closed discrepancy.

    pipeline.md hits are attribution-scoped (2026-09-24): a row-subject
    line is scanned whole; audit prose naming several prospects only
    contributes segments that mention this prospect, so another prospect's
    SENT/SUBMITTED in the same line can never count as this one's touch.
    """
    reasons = []
    blocked = False
    j_text, p_text = "", ""
    state_parts = []

    if row:
        sig = row.get("last_signal") or ""
        sup = row.get("suppression_state") or ""
        nxt = row.get("next_eligible_action") or ""
        j_text = sig + " " + sup + " " + nxt
        state_parts.append("jsonl:" + norm(j_text))
    else:
        reasons.append("WARN: no canonical JSONL row; structured state incomplete")
    pipe_lines = []
    for ln, raw in pipeline_hits:
        state_parts.append("pipeline:%d:%s" % (ln, norm(raw)))
        attr_text, dropped = attributed_text(raw, business, email)
        if dropped:
            reasons.append(
                "STRUCTURED: pipeline.md:%d cross-prospect attribution "
                "filtered %d marker(s) belonging to other named prospects "
                "(not counted)" % (ln, dropped))
        pipe_lines.append(attr_text)
    p_text = " ".join(t for t in pipe_lines if t)

    j_touches, j_dates, j_complete, j_collapsed = touch_markers(j_text)
    p_touches, p_dates, p_complete, p_collapsed = touch_markers(p_text)
    for rung, kept, dropped in j_collapsed + p_collapsed:
        reasons.append(
            "STRUCTURED: same-rung redescription collapsed: %s kept %s, "
            "dropped %s (one touch per rung; stale-date prose, not a new send)"
            % (rung, kept, dropped))
    internal_disagreement = []
    if row and pipeline_hits and j_touches != p_touches:
        internal_disagreement.append(
            "MISMATCH: JSONL records %d touch(es) but pipeline.md records %d; "
            "canonical structured sources disagree" % (j_touches, p_touches))
    touches = max(j_touches, p_touches)
    all_dates = j_dates + p_dates
    complete = j_complete or p_complete

    # Level 2: explicit suppression (part of structured truth, checked first
    # because a hard suppression ends the evaluation).
    sup = norm((row or {}).get("suppression_state"))
    for hard in SUPPRESS_HARD:
        if sup.startswith(hard) or re.search(r"\b%s\b" % re.escape(hard), sup):
            blocked = True
            reasons.append("SUPPRESSION: suppression_state=%r (hard block)" %
                           ((row or {}).get("suppression_state")))
            break
    m = re.search(r"cooldown[^\d]*(\d{4}-\d{2}-\d{2})?", sup)
    if not blocked and "cooldown" in sup:
        if not m or not m.group(1) or m.group(1) >= today:
            blocked = True
            reasons.append("SUPPRESSION: cooling down (%r)" %
                           ((row or {}).get("suppression_state")))

    # next_eligible_action
    nxt = (row or {}).get("next_eligible_action") or ""
    if not blocked:
        low = norm(nxt)
        if low in ("none", "none (ladder complete; watch only)") or low.startswith("none"):
            blocked = True
            reasons.append("STRUCTURED: next_eligible_action=%r (no eligible action)" % nxt)
        else:
            dm = DATE_RX.search(nxt)
            if dm and dm.group(1) > today and "eligible" in low:
                blocked = True
                reasons.append("STRUCTURED: next_eligible_action not yet eligible: %r" % nxt)

    # Ladder completion from structured state alone.
    if not blocked and (complete or touches >= 3):
        blocked = True
        reasons.append("STRUCTURED: ladder complete (%d accepted touches recorded)" % touches)

    # Action-specific touch budgets.
    if not blocked:
        if action == "cold-email" and touches > 0:
            blocked = True
            reasons.append("STRUCTURED: cold-email requested but %d prior touch(es) recorded" % touches)
        elif action == "followup-f1" and touches != 1:
            blocked = True
            reasons.append("STRUCTURED: F1 requires exactly 1 prior touch, found %d" % touches)
        elif action == "followup-f2" and touches != 2:
            blocked = True
            reasons.append("STRUCTURED: F2 requires exactly 2 prior touches, found %d" % touches)

    # Touch-gap timing (derived from structured dates).
    last_send = max(all_dates) if all_dates else None
    first_send = min(all_dates) if all_dates else None
    if not blocked and last_send and action in ("followup-f1", "followup-f2"):
        need = 4 if action == "followup-f1" else 10
        if first_send and first_send > today:
            blocked = True
            reasons.append("TIMING: structured send dates are in the future; cannot verify timing")
        elif first_send:
            gap = (datetime.date.fromisoformat(today) -
                   datetime.date.fromisoformat(first_send)).days
            if gap < need:
                blocked = True
                reasons.append("TIMING: only %d day(s) since first send; %s needs >=%d" %
                               (gap, action, need))
    if not blocked and action in ("followup-f1", "followup-f2") and not first_send:
        blocked = True
        reasons.append("TIMING: follow-up requested but no structured send date found; "
                       "cannot verify the ladder window (fail closed)")

    return {"blocked": blocked, "reasons": reasons, "touches": touches,
            "last_send": last_send, "first_send": first_send,
            "complete": complete, "state_blob": " || ".join(state_parts),
            "internal_disagreement": internal_disagreement}


def history_verdict(business, email, action, gmail_count, today, paths):
    """Level 3: verified communication history.

    gmail_count is REQUIRED (agent-run per-recipient `in:sent to:<addr>`).
    Returns (blocked, reasons, history_touches).
    """
    reasons = []
    blocked = False
    history_touches = 0

    if gmail_count is None:
        return True, ["HISTORY: per-recipient Gmail sent-mail count not provided "
                      "(--gmail-sent-count); mandatory verification missing, fail closed"], 0

    # Local acceptance logs: email-queue files, follow-ups.md, facebook-dms.md,
    # sweep summaries.
    candidates = [os.path.join(paths["queue_dir"], f)
                  for f in os.listdir(paths["queue_dir"])
                  if f.startswith("email-queue-") and f.endswith(".md")] \
        if os.path.isdir(paths["queue_dir"]) else []
    candidates += [paths["followups"], paths["fb_dms"]]
    if os.path.isdir(paths["sweep_dir"]):
        for root, _, files in os.walk(paths["sweep_dir"]):
            for fn in files:
                if fn.startswith("sweep-"):
                    candidates.append(os.path.join(root, fn))
    needles = [n.lower() for n in (business, email) if n]
    accept = re.compile(r"\bf1 sent\b|\bf2 sent\b|\bdm sent\b|\bsubmitted\b|"
                        r"\baccepted\b|\bemail sent\b|\bform submitted\b|"
                        r"\bsent\+verified\b", re.IGNORECASE)
    for path in candidates:
        if not os.path.exists(path):
            continue
        try:
            text = open(path, encoding="utf-8", errors="replace").read()
        except OSError:
            continue
        for ln, raw in enumerate(text.splitlines(), 1):
            low = raw.lower()
            if not any(n in low for n in needles):
                continue
            if accept.search(low) and "queued" not in low:
                # Hardened touch_markers: negated markers ("not sent") and
                # same-line (marker, date) re-descriptions do not inflate.
                history_touches += touch_markers(raw)[0] or 1
                reasons.append("HISTORY-LOG: acceptance recorded: %s:%d: %s" %
                               (os.path.basename(path), ln, raw.strip()[:120]))

    # Gmail count is the strongest history signal.
    if gmail_count >= 3:
        blocked = True
        reasons.append("HISTORY: Gmail shows %d sent message(s) to this recipient; "
                       "ladder budget (3) exhausted" % gmail_count)

    # review-triggered 90-day rule.
    if action == "review-triggered":
        try:
            ftext = open(paths["followups"], encoding="utf-8", errors="replace").read()
        except OSError:
            ftext = ""
        cutoff = (datetime.date.fromisoformat(today) -
                  datetime.timedelta(days=90)).isoformat()
        for ln, raw in enumerate(ftext.splitlines(), 1):
            low = raw.lower()
            if any(n in low for n in needles) and "trigger=review" in low:
                dm = DATE_RX.search(raw)
                if dm and dm.group(1) >= cutoff:
                    blocked = True
                    reasons.append("HISTORY: review-triggered message already sent on %s "
                                   "(max one per 90 days)" % dm.group(1))

    return blocked, reasons, max(history_touches, 0)


def notes_scan(business, email, paths):
    """Level 5: notes are advisory. Returns (suggesting_lines, asserts_done_lines)."""
    suggesting, asserts_done = [], []
    b, e = norm(business), norm(email)
    for path in (paths["leads"], paths["learnings"]):
        try:
            text = open(path, encoding="utf-8", errors="replace").read()
        except OSError:
            continue
        for ln, raw in enumerate(text.splitlines(), 1):
            low = norm(raw)
            if not ((b and b in low) or (e and e in low)):
                continue
            ref = "%s:%d: %s" % (os.path.basename(path), ln, raw.strip()[:160])
            if NOTE_ASSERTS_DONE_RX.search(low):
                asserts_done.append(ref)
            elif SUGGEST_RX.search(low):
                suggesting.append(ref)
    return suggesting, asserts_done


def load_reconciliations(path):
    recs = {}
    try:
        with open(path, encoding="utf-8", errors="replace") as fh:
            for raw in fh:
                parts = [p.strip() for p in raw.split("|")]
                if len(parts) >= 6 and parts[1].startswith("DISC-"):
                    recs[parts[1]] = {"state_hash": parts[3],
                                      "note_hashes": set(parts[4].split(",")),
                                      "text": raw.strip()}
    except OSError:
        pass
    return recs


def emit_discrepancy(path, record):
    record["discrepancy_id"] = "DISC-%s-%s" % (
        datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d%H%M%S"),
        sha1(record["recipient"] + record["action"])[:6])
    with open(path, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(record, sort_keys=True) + "\n")
    return record["discrepancy_id"]


def emit_audit(path, record):
    with open(path, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(record, sort_keys=True) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--business", default="")
    ap.add_argument("--email", default="")
    ap.add_argument("--action", required=True, choices=ACTIONS)
    ap.add_argument("--campaign", default="ping-social-outreach")
    ap.add_argument("--gmail-sent-count", type=int, default=None)
    ap.add_argument("--day", default=None)
    ap.add_argument("--reconcile-note", default="")
    args = ap.parse_args()

    if not args.business and not args.email:
        print("ERROR: --business or --email is required")
        return 3
    today = args.day or datetime.date.today().isoformat()
    recipient = args.business or args.email

    paths = {
        "jsonl": os.environ.get("ELIG_JSONL", JSONL_DEFAULT),
        "pipeline": os.environ.get("ELIG_PIPELINE", PIPELINE_DEFAULT),
        "leads": os.environ.get("ELIG_LEADS", LEADS_DEFAULT),
        "learnings": os.environ.get("ELIG_LEARNINGS", LEARNINGS_DEFAULT),
        "followups": os.environ.get("ELIG_FOLLOWUPS", FOLLOWUPS_DEFAULT),
        "fb_dms": os.environ.get("ELIG_FBDMS", FB_DMS_DEFAULT),
        "queue_dir": os.environ.get("ELIG_QUEUE_DIR", QUEUE_DIR_DEFAULT),
        "sweep_dir": os.environ.get("ELIG_SWEEP_DIR", SWEEP_DIR_DEFAULT),
        "discrep": os.environ.get("ELIG_DISCREP", DISCREP_DEFAULT),
        "audit": os.environ.get("ELIG_AUDIT", AUDIT_DEFAULT),
        "reconcile": os.environ.get("ELIG_RECONCILE", RECONCILE_DEFAULT),
    }

    rows = read_jsonl_rows(paths["jsonl"])
    row = find_jsonl_row(rows, args.business, args.email)
    pipeline_hits = find_pipeline_rows(paths["pipeline"], args.business, args.email)

    # --- Level 1+2: structured state and suppression ---
    sv = structured_verdict(row, pipeline_hits, args.action, today,
                            args.business, args.email)
    state_hash = sha1(sv["state_blob"] + "|gmail=%s" % args.gmail_sent_count)

    # --- Level 3: verified history ---
    hb, h_reasons, h_touches = history_verdict(
        args.business, args.email, args.action, args.gmail_sent_count,
        today, paths)

    # Cross-check: structured touch count vs Gmail-verified count.
    # NOTE (F-01 fix 2026-09-24): the truthiness gate on sv["touches"] is
    # removed on purpose. touches=0 with gmail>0 is a stale-structured-state
    # discrepancy (stall path), not "nothing to compare". Any mismatch fails
    # closed with DISCREPANCY (exit 2); ELIGIBLE (exit 0) requires agreement.
    cross_reasons = []
    if args.gmail_sent_count is not None and row:
        if args.gmail_sent_count > sv["touches"]:
            cross_reasons.append(
                "MISMATCH: Gmail verifies %d sent message(s) but structured state "
                "records only %d touch(es); structured state is stale" %
                (args.gmail_sent_count, sv["touches"]))
        elif args.gmail_sent_count < sv["touches"]:
            cross_reasons.append(
                "MISMATCH: structured state claims %d touch(es) but Gmail verifies "
                "only %d; cannot trust the structured count" %
                (sv["touches"], args.gmail_sent_count))

    structured_blocked = sv["blocked"] or hb
    structured_reasons = sv["reasons"] + h_reasons

    # --- Level 4: derived projection is folded into structured_verdict
    # (touch gaps, next-eligible dates) ---

    # --- Level 5: notes (advisory only) ---
    suggesting, asserts_done = notes_scan(args.business, args.email, paths)

    discrepancy_needed = None
    disc_evidence = {}
    if sv["internal_disagreement"]:
        discrepancy_needed = "canonical structured sources disagree with each other"
        disc_evidence = {"structured": sv["internal_disagreement"]}
    elif structured_blocked and suggesting:
        discrepancy_needed = (
            "structured state blocks the send but note(s) suggest outreach is "
            "still eligible/pending")
        disc_evidence = {"structured": structured_reasons,
                         "notes_suggesting": suggesting}
    elif not structured_blocked and asserts_done:
        discrepancy_needed = (
            "structured state looks eligible but note(s) assert the sequence "
            "is complete/suppressed")
        disc_evidence = {"structured": ["eligible per structured state"],
                         "notes_asserting_done": asserts_done}
    elif cross_reasons:
        discrepancy_needed = "structured touch count disagrees with Gmail-verified history"
        disc_evidence = {"structured": ["touches=%d" % sv["touches"]],
                         "history": ["gmail_sent_count=%d" % args.gmail_sent_count],
                         "detail": cross_reasons}

    # Reconciliation: a recorded reconciliation covers a discrepancy only
    # while the structured state hash is unchanged.
    reconciled = False
    note_hashes = set()
    if discrepancy_needed:
        note_lines = (disc_evidence.get("notes_suggesting") or []) + \
                     (disc_evidence.get("notes_asserting_done") or [])
        note_hashes = {sha1(norm(l)) for l in note_lines}
        for disc_id, rec in load_reconciliations(paths["reconcile"]).items():
            if rec["state_hash"] == state_hash and note_hashes and \
                    note_hashes <= rec["note_hashes"]:
                reconciled = True
                structured_reasons.append(
                    "RECONCILED: %s covers this discrepancy (state unchanged)" % disc_id)
                break

    ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
    if discrepancy_needed and not reconciled:
        disc_id = emit_discrepancy(paths["discrep"], {
            "ts": ts, "recipient": recipient, "email": args.email,
            "campaign": args.campaign, "action": args.action,
            "state_hash": state_hash, "reason": discrepancy_needed,
            "evidence": disc_evidence,
            "note_hashes": sorted(note_hashes),
        })
        emit_audit(paths["audit"], {
            "ts": ts, "recipient": recipient, "campaign": args.campaign,
            "action": args.action, "verdict": "DISCREPANCY",
            "discrepancy_id": disc_id, "reasons": [discrepancy_needed]})
        print("DISCREPANCY %s: %s" % (disc_id, discrepancy_needed))
        print("  Structured state and notes disagree. DO NOT SEND.")
        print("  Evidence written to %s" % paths["discrep"])
        print("  To reconcile: correct the authoritative structured record, then append")
        print("  a reconciliation line to %s covering %s" % (paths["reconcile"], disc_id))
        for k, v in disc_evidence.items():
            for item in (v if isinstance(v, list) else [v]):
                print("  - [%s] %s" % (k, item))
        return 2

    if args.reconcile_note:
        with open(paths["reconcile"], "a", encoding="utf-8") as fh:
            fh.write("%s | PENDING | %s | %s | %s | %s\n" % (
                today, recipient, state_hash,
                ",".join(sorted(note_hashes)) if note_hashes else "-",
                args.reconcile_note.replace("|", "/").strip()))

    if structured_blocked:
        emit_audit(paths["audit"], {
            "ts": ts, "recipient": recipient, "campaign": args.campaign,
            "action": args.action, "verdict": "INELIGIBLE",
            "reasons": structured_reasons})
        print("INELIGIBLE: %s / %s / %s" % (recipient, args.campaign, args.action))
        for r in structured_reasons:
            print("  - %s" % r)
        return 1

    emit_audit(paths["audit"], {
        "ts": ts, "recipient": recipient, "campaign": args.campaign,
        "action": args.action, "verdict": "ELIGIBLE",
        "reasons": ["structured state clear", "history clear", "notes advisory only"]})
    print("ELIGIBLE: %s / %s / %s (gmail_sent_count=%s, structured_touches=%d)" %
          (recipient, args.campaign, args.action, args.gmail_sent_count, sv["touches"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
