#!/usr/bin/env python3
"""Send the 2026-09-19 UTC cap batch (8 GO slots) sequentially, with
per-send timeout and sent-mail verification. One attempt per recipient; never
loop retries on an approval stall. Writes results to send-results-2026-09-19.md.
"""
import re, subprocess, json, time, os

DRAFTS_DIR = os.path.expanduser("~/workspace/outreach/drafts")
OUT = os.path.expanduser("~/workspace/outreach/send-results-2026-09-19.md")
# 8 GO slots from email-queue-2026-09-19.md (slots 1-6, 8, 9; slots 7/10 held/suppressed)
ORDER = [
    ("F2", "round78-f2-mh-electrical-solar.md"),
    ("F2", "round78-f2-sanders-johnson.md"),
    ("F2", "round78-f2-smart-garage-door.md"),
    ("F2", "round78-f2-to-the-t.md"),
    ("COLD", "round27-decktec-outdoor-designs-email.md"),
    ("COLD", "round27-eckert-renovations-email.md"),
    ("COLD", "round27-miracle-maids-denver-email.md"),
    ("COLD", "round27-pride-n-service-junk-removal-email.md"),
]
SEND_TIMEOUT = 420


def parse_draft(path):
    text = open(path, encoding="utf-8").read()
    lines = text.splitlines()
    to, subject = None, None
    subj_idx = None
    for i, l in enumerate(lines):
        s = l.strip()
        if s.lower().startswith("to:") or s.lower().startswith("- to:"):
            m = re.search(r"[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}", s)
            if m:
                to = m.group(0)
        if s.lower().startswith("subject:") or s.lower().startswith("- subject:"):
            subject = re.sub(r"^-?\s*subject:\s*", "", s, flags=re.I)
            subj_idx = i
    if not to or not subject or subj_idx is None:
        raise ValueError("missing To/Subject")
    # body: everything after the first blank line following the Subject line
    body = ""
    for j in range(subj_idx + 1, len(lines)):
        if lines[j].strip() == "":
            body = "\n".join(lines[j + 1:]).strip()
            break
    if not body:
        raise ValueError("empty body")
    return to, subject, body


def run(cmd, timeout):
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return p.returncode, p.stdout, p.stderr
    except subprocess.TimeoutExpired:
        return "TIMEOUT", "", "command timed out"


def sent_verify(to_addr):
    """Check sent mail for a message to this address. Returns True/False."""
    for _ in range(3):
        rc, out, err = run(
            ["hatch_gws_cli", "gmail", "users", "messages", "list",
             "--params", json.dumps({"userId": "me",
                                     "q": f"in:sent to:{to_addr}",
                                     "maxResults": 5}),
             "--format", "json"], 60)
        if rc == 0:
            try:
                data = json.loads(out)
            except Exception:
                data = {}
            msgs = data.get("messages", [])
            if msgs:
                return True
        time.sleep(15)
    return False


results = []
for kind, fname in ORDER:
    path = os.path.join(DRAFTS_DIR, fname)
    try:
        to, subject, body = parse_draft(path)
    except Exception as e:
        results.append((kind, fname, "PARSE_FAIL", str(e)))
        continue
    if not body.startswith("Please read before replying"):
        results.append((kind, fname, "BODY_CHECK_FAIL",
                        "body does not start with disclosure line; skipped"))
        continue
    if "\u2014" in body:
        results.append((kind, fname, "BODY_CHECK_FAIL",
                        "body contains em dash; skipped"))
        continue
    rc, out, err = run(["hatch_gws_cli", "gmail", "+send",
                        "--to", to, "--subject", subject, "--body", body],
                       SEND_TIMEOUT)
    if rc == "TIMEOUT" or "pending_user_confirmation" in out or \
            "approval prompt timed out" in out or "timed out before the user" in (out + err):
        note = "receipt timed out / approval stall; verifying in sent mail"
        ok = sent_verify(to)
        results.append((kind, fname, f"{'SENT' if ok else 'NOT_SENT'} (receipt timed out)",
                        f"{note} -> {'found in sent mail' if ok else 'not found in sent mail'}"))
        continue
    if rc == 0 and ("ok" in out.lower() or "sent" in out.lower()):
        ok = sent_verify(to)
        results.append((kind, fname, "SENT" if ok else "UNCERTAIN",
                        f"cli rc=0, sent-mail verify {'found' if ok else 'NOT found'}"))
    else:
        results.append((kind, fname, "SEND_FAIL",
                        f"rc={rc} out={out[:200]} err={err[:200]}"))

with open(OUT, "w", encoding="utf-8") as f:
    f.write("# Send batch results — 2026-09-19 UTC cap\n\n")
    f.write(f"Run: {time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime())}\n\n")
    for kind, fname, status, note in results:
        f.write(f"- {kind} {fname}: **{status}** — {note}\n")
    f.write("\n")

accepted = sum(1 for _, _, s, _ in results if s.startswith("SENT"))
print(f"RESULT: {accepted}/{len(ORDER)} accepted")
for kind, fname, status, note in results:
    print(f"  {fname}: {status} | {note[:120]}")
