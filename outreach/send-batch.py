#!/usr/bin/env python3
"""Send a queued UTC-day email batch from draft files, in queue order.

Usage: python3 send-batch.py <draft-file> [<draft-file> ...]
Each draft file has header lines (To:, Subject:) followed by the message body.
Sends via hatch_gws_cli gmail +send (arg list, no shell quoting), then verifies
EVERY acceptance by locating the message in Sent before proceeding to the next.
Stops on any approval stall or failed verification; never loops retries.

Exit codes: 0 all sent+verified; 1 partial/stalled (stdout records progress).

ELIGIBILITY GATE (2026-09-21, FL-20260921-030): before EVERY +send, the
batch runs ~/workspace/outreach/send-eligibility.py for the recipient with
the per-recipient Gmail sent-mail count. The checker's exit code is the
gate: any non-zero exit stops the batch. PROSE IS NOT AUTHORITY: notes in
leads.md/learnings.md can never authorize a send.
"""
import subprocess, sys, json, time, re, os

ELIGIBILITY = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "send-eligibility.py")

def parse_draft(path):
    to, subject, body_lines = None, None, []
    in_header = True
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            s = line.rstrip("\n")
            if in_header:
                if s.strip() == "":
                    in_header = False
                    continue
                for seg in s.split("|"):
                    seg = seg.strip()
                    if seg.startswith("To:") and to is None:
                        to = seg[3:].strip()
                    elif seg.startswith("Subject:") and subject is None:
                        subject = seg[8:].strip()
                continue
            body_lines.append(s)
    body = "\n".join(body_lines).strip("\n")
    return to, subject, body

def cli(*args, timeout=120):
    return subprocess.run(["hatch_gws_cli"] + list(args), capture_output=True,
                          text=True, timeout=timeout)


def gmail_sent_count(to_addr):
    """Count messages in sent mail to this exact recipient (level-3 history)."""
    r = cli("gmail", "+triage", "--query", f"in:sent to:{to_addr}",
            "--max", "50", "--format", "json")
    try:
        data = json.loads(r.stdout)
    except Exception:
        return None
    items = data.get("messages") or data.get("items") or []
    return len(items)


def action_from_filename(path):
    """Derive the outreach action from the draft filename convention
    round<N>-(f1|f2)-<slug>.md. Follow-up drafts MUST keep the f1/f2 infix;
    anything else is treated as a cold email (strictest budget)."""
    name = os.path.basename(path).lower()
    if "-f2-" in name:
        return "followup-f2"
    if "-f1-" in name:
        return "followup-f1"
    if "review" in name:
        return "review-triggered"
    return "cold-email"


def eligibility_gate(path, to):
    """Run the deterministic eligibility checker; exit 0 means send may proceed."""
    count = gmail_sent_count(to)
    args = [sys.executable, ELIGIBILITY, "--email", to,
            "--action", action_from_filename(path)]
    if count is not None:
        args += ["--gmail-sent-count", str(count)]
    # count None -> flag omitted -> checker fails closed (mandatory verification)
    r = subprocess.run(args, capture_output=True, text=True, timeout=120)
    return r.returncode, r.stdout.strip()

def verify_in_sent(to_addr, subject, window="newer_than:2h"):
    q = f'in:sent to:{to_addr} {window}'
    r = cli("gmail", "+triage", "--query", q, "--max", "5", "--format", "json")
    try:
        data = json.loads(r.stdout)
    except Exception:
        return False, "triage-unparseable"
    items = data.get("messages") or data.get("items") or []
    for m in items:
        subj = (m.get("subject") or "").lower()
        if subject.lower().split(",")[0] in subj or subj in subject.lower():
            return True, m.get("id", "?")
    return False, f"not-found ({len(items)} sent-to-address hits)"

def main(files):
    log = []
    sent_count = 0
    for path in files:
        to, subject, body = parse_draft(path)
        if not to or not subject or not body:
            log.append(f"PARSE FAIL {path}: missing To/Subject/body")
            break
        gate_rc, gate_out = eligibility_gate(path, to)
        if gate_rc != 0:
            log.append(f"BLOCKED {to} | {subject}: send-eligibility gate failed "
                       f"(exit {gate_rc}); batch STOPPED. {gate_out[:300]}")
            break
        try:
            r = cli("gmail", "+send", "--to", to, "--subject", subject, "--body", body)
        except subprocess.TimeoutExpired:
            log.append(f"STALL {to} | {subject}: +send timed out (approval stall); batch STOPPED")
            break
        if r.returncode != 0:
            log.append(f"CLI ERROR {to} | {subject}: rc={r.returncode} stderr={r.stderr[:300]}; batch STOPPED")
            break
        time.sleep(2)
        ok, detail = verify_in_sent(to, subject)
        if not ok:
            log.append(f"UNVERIFIED {to} | {subject}: send returned but {detail}; batch STOPPED (receipt may have timed out; check sent mail before re-sending)")
            break
        sent_count += 1
        log.append(f"SENT+VERIFIED {to} | {subject} | id={detail}")
    for line in log:
        print(line, flush=True)
    print(f"RESULT {sent_count}/{len(files)}")
    return 0 if sent_count == len(files) else 1

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: send-batch.py <draft> [draft ...]", file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1:]))
