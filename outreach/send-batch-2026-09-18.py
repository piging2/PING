#!/usr/bin/env python3
"""Send the 2026-09-18 UTC cap batch (10 queued drafts) sequentially, with
per-send timeout and sent-mail verification. One attempt per recipient; never
loop retries on an approval stall. Writes results to send-results-2026-09-18.md.
"""
import re, subprocess, json, time, sys, os

DRAFTS_DIR = os.path.expanduser("~/workspace/outreach/drafts")
OUT = os.path.expanduser("~/workspace/outreach/send-results-2026-09-18.md")
ORDER = [
    "round50-f1-high-noon-solar.md",
    "round50-f1-preferred-garage-doors.md",
    "round50-f1-renwick-tiles.md",
    "round50-f1-shaw-solar.md",
    "round50-f1-sunsense-solar.md",
    "round50-f1-top-notch-hardwood-flooring.md",
    "round43-bb-plumbing-heating-email.md",
    "round45-comfort-air-email.md",
    "round48-american-asphalt-email.md",
    "round50-whitewolf-cabinets-email.md",
]
SEND_TIMEOUT = 420


def parse_draft(path):
    text = open(path, encoding="utf-8").read()
    lines = text.splitlines()
    to_line = next(l for l in lines if l.lower().startswith("to:"))
    subj_line = next(l for l in lines if l.lower().startswith("subject:"))
    to = re.search(r"[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}", to_line).group(0)
    subject = subj_line.split(":", 1)[1].strip()
    blank = next(i for i, l in enumerate(lines) if l.strip() == "")
    body = "\n".join(lines[blank + 1 :]).strip()
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
for i, fname in enumerate(ORDER, 1):
    path = os.path.join(DRAFTS_DIR, fname)
    try:
        to, subject, body = parse_draft(path)
    except Exception as e:
        results.append((i, fname, "PARSE_FAIL", str(e)))
        continue
    # body sanity: disclosure line first, no em dashes
    if not body.startswith("Please read before replying"):
        results.append((i, fname, "BODY_CHECK_FAIL",
                        "body does not start with disclosure line; skipped"))
        continue
    if "\u2014" in body:
        results.append((i, fname, "BODY_CHECK_FAIL",
                        "body contains em dash; skipped"))
        continue
    rc, out, err = run(["hatch_gws_cli", "gmail", "+send",
                        "--to", to, "--subject", subject, "--body", body],
                       SEND_TIMEOUT)
    if rc == "TIMEOUT" or "pending_user_confirmation" in out or \
            "approval prompt timed out" in out or "timed out before the user" in (out + err):
        note = "receipt timed out / approval stall; verifying in sent mail"
        ok = sent_verify(to)
        results.append((i, fname, f"{'SENT' if ok else 'NOT_SENT'} (receipt timed out)",
                        f"{note} -> {'found in sent mail' if ok else 'not found in sent mail'}"))
        continue
    if rc == 0 and ("ok" in out.lower() or "sent" in out.lower()):
        ok = sent_verify(to)
        results.append((i, fname, "SENT" if ok else "UNCERTAIN",
                        f"cli rc=0, sent-mail verify {'found' if ok else 'NOT found'}"))
    else:
        results.append((i, fname, "SEND_FAIL",
                        f"rc={rc} out={out[:200]} err={err[:200]}"))

with open(OUT, "w", encoding="utf-8") as f:
    f.write("# Send batch results — 2026-09-18 UTC cap\n\n")
    f.write(f"Run: {time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime())}\n\n")
    for i, fname, status, note in results:
        f.write(f"- Slot {i} {fname}: **{status}** — {note}\n")
    f.write("\n")

accepted = sum(1 for _, _, s, _ in results if s.startswith("SENT"))
print(f"RESULT: {accepted}/10 accepted")
for i, fname, status, note in results:
    print(f"  {i}. {fname}: {status} | {note[:120]}")
