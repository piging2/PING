#!/usr/bin/env python3
"""Send the 3 remaining 2026-09-18 UTC cap slots (7, 8, 9) with format-aware
body extraction. One attempt per recipient; verify every acceptance in sent
mail; kill on approval stall, never loop retries."""
import subprocess, json, time, os

DRAFTS = os.path.expanduser("~/workspace/outreach/drafts")
OUT = os.path.expanduser("~/workspace/outreach/send-results-2026-09-18b.md")
DISC = "Please read before replying:"


def get_body_43(path):
    text = open(path, encoding="utf-8").read()
    body = text.split("---\n", 1)[1]
    # drop the draft word-count note line, keep the rest verbatim
    lines = [l for l in body.splitlines() if "(Word count:" not in l]
    return "\n".join(lines).strip()


def get_body_45(path):
    text = open(path, encoding="utf-8").read()
    return text[text.index(DISC):].strip()


def get_body_48(path):
    text = open(path, encoding="utf-8").read()
    body = text[text.index(DISC):].strip()
    body = body.split("## WHY THIS BUSINESS")[0].strip()
    return body


JOBS = [
    ("round45-comfort-air-email.md",
     "office@comfortairco.com",
     "When every tech is already on a call",
     get_body_45),
    ("round48-american-asphalt-email.md",
     "asphalt@americanasphalt.biz",
     "Your 30 years in Glenwood deserve a better front door",
     get_body_48),
]


def run(cmd, timeout):
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return p.returncode, p.stdout, p.stderr
    except subprocess.TimeoutExpired:
        return "TIMEOUT", "", "command timed out"


def sent_verify(to_addr):
    for _ in range(3):
        rc, out, err = run(
            ["hatch_gws_cli", "gmail", "users", "messages", "list",
             "--params", json.dumps({"userId": "me",
                                     "q": f"in:sent to:{to_addr}",
                                     "maxResults": 5}),
             "--format", "json"], 60)
        if rc == 0:
            try:
                msgs = json.loads(out).get("messages", [])
            except Exception:
                msgs = []
            if msgs:
                return True
        time.sleep(15)
    return False


results = []
for fname, to, subject, extractor in JOBS:
    body = extractor(os.path.join(DRAFTS, fname))
    if not body.startswith(DISC):
        results.append((fname, "BODY_CHECK_FAIL",
                        "body does not start with disclosure line; skipped"))
        continue
    if "\u2014" in body:
        results.append((fname, "BODY_CHECK_FAIL", "em dash in body; skipped"))
        continue
    rc, out, err = run(["hatch_gws_cli", "gmail", "+send",
                        "--to", to, "--subject", subject, "--body", body], 420)
    stalled = (rc == "TIMEOUT" or "pending_user_confirmation" in out
               or "approval prompt timed out" in out
               or "timed out before the user" in (out + err))
    ok = sent_verify(to)
    if stalled:
        results.append((fname, "SENT" if ok else "NOT_SENT",
                        f"receipt timed out/approval stall; sent-mail verify {'found' if ok else 'NOT found'}"))
    elif rc == 0:
        results.append((fname, "SENT" if ok else "UNCERTAIN",
                        f"cli rc=0; sent-mail verify {'found' if ok else 'NOT found'}"))
    else:
        results.append((fname, "SEND_FAIL", f"rc={rc} {out[:150]} {err[:150]}"))

with open(OUT, "w", encoding="utf-8") as f:
    f.write("# Send batch results — 2026-09-18 UTC cap, slots 7-9 retry\n\n")
    for fname, status, note in results:
        f.write(f"- {fname}: **{status}** — {note}\n")

acc = sum(1 for _, s, _ in results if s == "SENT")
print(f"RESULT: {acc}/3 accepted")
for fname, status, note in results:
    print(f"  {fname}: {status} | {note[:130]}")
