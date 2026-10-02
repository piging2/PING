#!/usr/bin/env python3
"""Weekly SI-03 audit: cross-check Nolan-directed messages against escalation-log.jsonl.

For the week window, every Nolan-directed question must have a matching
grill-20 record. A Nolan-directed question with no matching record is a
PROCESS VIOLATION (SI-03: no question reaches Nolan without an
escalate-record; decide-records prove the negative half).

Matching contract (deterministic, no LLM):
  1. EXPLICIT: message extract names a log record index (record_ref) that
     exists inside the window -> clean MATCH.
  2. EXACT: normalized message question == normalized log record question
     -> clean MATCH.
  3. CONTAINMENT: normalized message text is a substring of the normalized
     record question (or vice versa), shorter side >= 30 chars
     -> WEAK_MATCH (flagged for human review, NOT counted as a match).
Everything else with no partner is UNMATCHED.

Log records with no Nolan-directed message are informational:
  - verdict=decide with no message: expected (the classifier resolved it).
  - verdict=escalate with no message: WARNING (an escalate means it
    reached Nolan; the question extract is probably incomplete).

Message extract input format (JSONL, one object per line):
  {"source": "memory/2026-09-27.md",
   "ts": "2026-09-27T14:05:00-06:00",
   "kind": "nolan_directed_question",
   "question": "verbatim or summarized question text put to Nolan",
   "record_ref": 16}           # optional log line index; null if unknown

Only kind == "nolan_directed_question" is cross-checked.

Usage:
  python3 weekly-audit.py --log escalation-log.jsonl \\
      --messages messages-2026-09-28.jsonl \\
      --start 2026-09-28T00:00:00-06:00 --end 2026-10-05T00:00:00-06:00 \\
      --out /tmp/audit-report.md
  python3 weekly-audit.py --demo        # worked example on synthetic input

Exit 0: report written (violations may still be present; they are IN the
report, not a crash). Exit 2: usage/input error.

What the real 2026-10-04 run needs (see module docstring bottom):
  1. The full escalation-log.jsonl (read-only).
  2. A message-extract JSONL compiled by the INDEPENDENT auditor (not the
     engine that filed the records) from: daily notes under ~/memory/
     (2026-09-28 .. 2026-10-04), main-chat excerpts where a question went
     to Nolan, and any other channel where Nolan was asked something.
     Every entry kind="nolan_directed_question" with verbatim question text.
  3. Week window: 2026-09-28T00:00:00 .. 2026-10-05T00:00:00 (user tz).
"""

import argparse
import json
import re
import sys
from datetime import datetime

QUESTION_KIND = "nolan_directed_question"
MIN_CONTAIN_CHARS = 30


def parse_ts(ts):
    if not isinstance(ts, str) or not ts.strip():
        return None
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        from datetime import timezone
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def norm(s):
    """Deterministic normalization: lowercase, alnum+space only, collapsed."""
    s = (s or "").lower()
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def load_log(path, start, end):
    """Return [(index, record, ts)] for records in window (read-only)."""
    out = []
    with open(path, encoding="utf-8") as f:
        for idx, line in enumerate(f):
            if not line.strip():
                continue
            rec = json.loads(line)
            ts = parse_ts(rec.get("ts", rec.get("timestamp")))
            if ts is None:
                out.append((idx, rec, None))  # lint flags it; keep for completeness
                continue
            if start <= ts < end:
                out.append((idx, rec, ts))
    return out


def load_messages(path, start, end):
    """Return [(index, extract)] for Nolan-directed questions in window."""
    out = []
    with open(path, encoding="utf-8") as f:
        for idx, line in enumerate(f):
            if not line.strip():
                continue
            m = json.loads(line)
            if m.get("kind") != QUESTION_KIND:
                continue
            ts = parse_ts(m.get("ts"))
            if ts is not None and not (start <= ts < end):
                continue
            out.append((idx, m))
    return out


def match(messages, log_records):
    """Deterministic matching. Returns dict report structure."""
    by_index = {i: (rec, ts) for i, rec, ts in log_records}
    used = set()
    matched, weak, unmatched = [], [], []

    log_norm = {i: norm((rec.get("question") or rec.get("decision") or ""))
                for i, rec, ts in log_records}

    for mi, m in messages:
        mq = norm(m.get("question", ""))
        hit = None
        # 1. explicit reference
        ref = m.get("record_ref")
        if isinstance(ref, int) and ref in by_index and ref not in used:
            hit = (ref, "explicit")
        else:
            # 2. exact normalized equality
            for li, lq in log_norm.items():
                if li in used or not lq or not mq:
                    continue
                if lq == mq:
                    hit = (li, "exact")
                    break
        # 3. containment (weak)
        weak_cands = []
        if hit is None and mq:
            for li, lq in log_norm.items():
                if li in used or not lq:
                    continue
                if (mq in lq or lq in mq) and min(len(mq), len(lq)) >= MIN_CONTAIN_CHARS:
                    weak_cands.append(li)
        if hit is not None:
            li, how = hit
            used.add(li)
            matched.append({"message_index": mi, "record_index": li,
                            "how": how, "message": m, "record_ts": str(by_index[li][1])})
        elif weak_cands:
            weak.append({"message_index": mi, "candidate_records": weak_cands, "message": m})
        else:
            unmatched.append({"message_index": mi, "message": m})

    log_only = []
    for li, rec, ts in log_records:
        if li not in used:
            verdict = rec.get("verdict")
            flag = None
            if verdict == "escalate":
                flag = "WARNING: escalate record with no Nolan-directed message found"
            log_only.append({"record_index": li, "verdict": verdict,
                             "question": (rec.get("question") or rec.get("decision") or "")[:120],
                             "flag": flag})
    return {"matched": matched, "weak_matches": weak,
            "unmatched_messages": unmatched, "log_records_without_message": log_only}


def render_markdown(rep, start, end):
    L = []
    L.append("# SI-03 weekly audit report")
    L.append("")
    L.append("Window: %s .. %s" % (start.isoformat(), end.isoformat()))
    L.append("")
    L.append("## Summary")
    L.append("- Clean matches: %d" % len(rep["matched"]))
    L.append("- Weak matches (human review): %d" % len(rep["weak_matches"]))
    L.append("- UNMATCHED Nolan-directed questions (PROCESS VIOLATIONS): %d"
             % len(rep["unmatched_messages"]))
    L.append("- Log records with no message: %d" % len(rep["log_records_without_message"]))
    L.append("")
    L.append("## Matched (clean)")
    for m in rep["matched"]:
        L.append("- msg#%d -> record#%d (%s): %s"
                 % (m["message_index"], m["record_index"], m["how"],
                    (m["message"].get("question") or "")[:100]))
    if not rep["matched"]:
        L.append("(none)")
    L.append("")
    L.append("## Weak matches (needs human review)")
    for w in rep["weak_matches"]:
        L.append("- msg#%d candidates=%s: %s"
                 % (w["message_index"], w["candidate_records"],
                    (w["message"].get("question") or "")[:100]))
    if not rep["weak_matches"]:
        L.append("(none)")
    L.append("")
    L.append("## PROCESS VIOLATIONS: Nolan-directed questions with no record")
    for u in rep["unmatched_messages"]:
        L.append("- VIOLATION msg#%d [%s] %s"
                 % (u["message_index"], u["message"].get("source"),
                    (u["message"].get("question") or "")[:140]))
    if not rep["unmatched_messages"]:
        L.append("(none)")
    L.append("")
    L.append("## Log records with no Nolan-directed message (informational)")
    for r in rep["log_records_without_message"]:
        line = "- record#%d verdict=%s: %s" % (r["record_index"], r["verdict"], r["question"])
        if r["flag"]:
            line += "  <-- %s" % r["flag"]
        L.append(line)
    if not rep["log_records_without_message"]:
        L.append("(none)")
    L.append("")
    return "\n".join(L)


def run(log_path, msg_path, start_s, end_s, out_path=None):
    start = parse_ts(start_s)
    end = parse_ts(end_s)
    if start is None or end is None or not (start < end):
        print("error: bad --start/--end window", file=sys.stderr)
        return 2
    try:
        log_records = load_log(log_path, start, end)
        messages = load_messages(msg_path, start, end)
    except (OSError, json.JSONDecodeError) as e:
        print("error: %s" % e, file=sys.stderr)
        return 2
    rep = match(messages, log_records)
    rep["window"] = {"start": start_s, "end": end_s}
    rep["counts"] = {"log_records_in_window": len(log_records),
                     "nolan_directed_messages": len(messages)}
    md = render_markdown(rep, start, end)
    if out_path:
        base = out_path
        with open(base, "w", encoding="utf-8") as f:
            f.write(md + "\n")
        with open(base + ".json", "w", encoding="utf-8") as f:
            json.dump(rep, f, indent=1, default=str)
        print("wrote %s and %s.json" % (base, base))
    else:
        print(md)
    print("counts: log=%d messages=%d clean=%d weak=%d VIOLATIONS=%d"
          % (len(log_records), len(messages), len(rep["matched"]),
             len(rep["weak_matches"]), len(rep["unmatched_messages"])))
    return 0


def demo():
    """Worked example on fully synthetic input."""
    import tempfile, os
    d = tempfile.mkdtemp(prefix="weekly-audit-demo-")
    logp = os.path.join(d, "log.jsonl")
    msgp = os.path.join(d, "messages.jsonl")
    log = [
        {"ts": "2026-10-01T10:00:00-06:00", "question": "Should the TikTok probe cadence be restored to 2h?",
         "checks": {"locked_invariant": False}, "check_evidence": {"locked_invariant": "no invariant covers this"},
         "verdict": "escalate", "failed_checks": ["locked_invariant"],
         "cost_of_being_wrong": "probe volume only", "recommended_default": "restore", "outcome": "asked Nolan"},
        {"ts": "2026-10-02T10:00:00-06:00", "question": "Bump Instagram like cap from 50 to 55?",
         "checks": {"locked_invariant": True}, "check_evidence": {"locked_invariant": "standing ramp policy"},
         "verdict": "decide", "failed_checks": [], "cost_of_being_wrong": "low",
         "recommended_default": "follow ramp", "outcome": "decided"},
        {"ts": "2026-10-03T10:00:00-06:00", "question": "Switch outreach signoff to include LLC name?",
         "checks": {"locked_invariant": False}, "check_evidence": {"locked_invariant": "no invariant"},
         "verdict": "decide", "failed_checks": [], "cost_of_being_wrong": "low",
         "recommended_default": "no change", "outcome": "decided"},
    ]
    msgs = [
        {"source": "chat-2026-10-01", "ts": "2026-10-01T10:05:00-06:00",
         "kind": "nolan_directed_question",
         "question": "Should the TikTok probe cadence be restored to 2h?", "record_ref": 0},
        {"source": "memory/2026-10-02.md", "ts": "2026-10-02T09:00:00-06:00",
         "kind": "nolan_directed_question",
         "question": "Can we greenlight the new PING Social tagline for the site header?",
         "record_ref": None},
        {"source": "memory/2026-10-02.md", "ts": "2026-10-02T09:30:00-06:00",
         "kind": "note", "question": "Nolan approved the tagline in chat", "record_ref": None},
    ]
    with open(logp, "w") as f:
        for r in log:
            f.write(json.dumps(r) + "\n")
    with open(msgp, "w") as f:
        for m in msgs:
            f.write(json.dumps(m) + "\n")
    print("demo inputs: %s" % d)
    return run(logp, msgp, "2026-09-28T00:00:00-06:00", "2026-10-05T00:00:00-06:00")


def main(argv):
    ap = argparse.ArgumentParser(description="SI-03 weekly audit cross-check")
    ap.add_argument("--log", default="escalation-log.jsonl")
    ap.add_argument("--messages", default="messages.jsonl")
    ap.add_argument("--start")
    ap.add_argument("--end")
    ap.add_argument("--out")
    ap.add_argument("--demo", action="store_true")
    a = ap.parse_args(argv)
    if a.demo:
        return demo()
    if not a.start or not a.end:
        print("error: --start and --end required (or use --demo)", file=sys.stderr)
        return 2
    return run(a.log, a.messages, a.start, a.end, a.out)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
