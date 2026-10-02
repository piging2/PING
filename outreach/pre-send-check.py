#!/usr/bin/env python3
"""Pre-send reconciliation gate (GAP 3, 2026-09-13).

Before any email send or form/DM submit, the sweep MUST reconcile the
candidate against every local source of send truth. A crash between Gmail
acceptance and local logging must never cause a duplicate send.

Checks (local sources only):
  1. The JSONL row's status fields: suppression_state, last_signal,
     next_eligible_action. Declined/bounced/opt-out/franchise/cooldown/ladder
     rows fail; a last_signal showing SENT/SUBMITTED/DM SENT already recorded
     fails; a next_eligible_action naming a future date fails.
  2. The sweep's own sent-log: today's email-queue file, follow-ups.md,
     and today's sweep summary, grepped for the business name/email.

NOT checked here (no Gmail access from a script): Gmail's actual sent mail
for the current UTC day. The agent MUST still run the Gmail cap-count via
the Gmail tool before sending; this script prints that step as a blocking
reminder. Exit 0 means "local sources clear, proceed to the Gmail check";
exit 1 means DO NOT SEND.

Usage: pre-send-check.py --business "Business Name" [--email a@b.com]
"""
import argparse, datetime, json, os, re, sys

HOME = os.path.expanduser('~')
JSONL = os.path.join(HOME, 'workspace/your_files/western-co-prospects.jsonl')
OUTREACH = os.path.join(HOME, 'workspace/outreach')
HIDDEN = os.path.join(HOME, 'workspace/goals/ping-social-outreach-campaign/hidden_files')

TODAY = datetime.date.today().isoformat()  # UTC date on this machine


def find_row(business, email):
    with open(JSONL, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            if business and r.get('business_name', '').lower() == business.lower():
                return r
            if email and r.get('email', '').lower() == email.lower():
                return r
    return None


def check_row(r):
    """Returns a list of (severity, message). severity: fail | warn."""
    out = []
    sup = (r.get('suppression_state') or '').strip()
    sig = r.get('last_signal') or ''
    nxt = r.get('next_eligible_action') or ''
    if re.match(r'declined\b', sup):
        out.append(('fail', 'suppression_state=%r: hard decline, never contact' % sup))
    elif re.match(r'bounced\b', sup):
        out.append(('fail', 'suppression_state=%r: address bounced, retired' % sup))
    elif re.match(r'opt-out\b', sup):
        out.append(('fail', 'suppression_state=%r: recipient opted out, never contact' % sup))
    elif re.match(r'franchise\b', sup):
        out.append(('fail', 'suppression_state=%r: franchise/chain, no local buying authority, never contact' % sup))
    elif re.match(r'cooldown\b', sup):
        m = re.search(r'(\d{4}-\d{2}-\d{2})', sup)
        if not m or m.group(1) >= TODAY:
            out.append(('fail', 'suppression_state=%r: cooling down' % sup))
    elif re.match(r'ladder\b', sup):
        out.append(('warn', 'suppression_state=%r: in follow-up ladder; only the scheduled ladder touch may send' % sup))
    sent_markers = ('SENT', 'SUBMITTED', 'DM SENT')
    if any(m in sig.upper() for m in sent_markers):
        out.append(('fail', 'last_signal already records outreach: %r' % sig[:100]))
    m = re.search(r'(\d{4}-\d{2}-\d{2})', nxt)
    if m and m.group(1) > TODAY and 'eligible' in nxt.lower():
        out.append(('fail', 'next_eligible_action not yet eligible: %r' % nxt[:100]))
    return out


def check_sent_logs(business, email):
    """Grep the sweep's own sent-logs for this business.

    Returns (fails, warns). FAIL on explicit acceptance language (the send
    definitely happened); WARN on bare mentions (the agent eyeballs them).
    A line mentioning QUEUED is downgraded to WARN even when it also matches
    the acceptance regex (round-47 false positive: QUEUED rows describe a
    future flip, e.g. "status flips to F1 SENT only after Gmail acceptance",
    not a send that happened).
    """
    fails, warns = [], []
    candidates = [
        os.path.join(OUTREACH, 'email-queue-%s.md' % TODAY),
        os.path.join(OUTREACH, 'follow-ups.md'),
        os.path.join(OUTREACH, 'facebook-dms.md'),
    ]
    for root, _, files in os.walk(HIDDEN):
        for fn in files:
            if fn.startswith('sweep-%s' % TODAY):
                candidates.append(os.path.join(root, fn))
    needles = [n.lower() for n in (business, email) if n]
    accept = re.compile(r'\bf1 sent\b|\bf2 sent\b|\bdm sent\b|\bsubmitted\b|'
                        r'\baccepted\b|\bemail sent\b|\bform submitted\b')
    for path in candidates:
        if not os.path.exists(path):
            continue
        try:
            text = open(path, encoding='utf-8', errors='replace').read()
        except OSError:
            continue
        for ln, raw in enumerate(text.splitlines(), 1):
            low = raw.lower()
            if not any(n in low for n in needles):
                continue
            hit = '%s:%d: %s' % (os.path.basename(path), ln, raw.strip()[:120])
            if accept.search(low) and 'queued' not in low:
                fails.append(hit)
            else:
                warns.append(hit)
    return fails, warns


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--business', required=True)
    ap.add_argument('--email', default='')
    a = ap.parse_args()

    fails, warns = [], []
    r = find_row(a.business, a.email)
    if not r:
        print('WARN: no JSONL row for %r; cannot reconcile row state' % a.business)
        warns.append('no-row')
    else:
        for sev, msg in check_row(r):
            print(('%s: %s' % (sev.upper(), msg)))
            (fails if sev == 'fail' else warns).append(msg)

    log_fails, log_warns = check_sent_logs(a.business, a.email)
    for h in log_fails:
        print('FAIL: sent-log already records outreach: %s' % h)
        fails.append(h)
    for h in log_warns:
        print('WARN: sent-log mentions %r, agent eyeball required: %s' % (a.business, h))
        warns.append(h)
    if not log_fails and not log_warns:
        print('OK: no sent-log hit for %r in today\'s logs' % a.business)

    print('MANUAL (blocking): reconcile against Gmail actual sent mail for the '
          'current UTC day via the Gmail tool, then send only within the cap. '
          'If Gmail shows this recipient already sent, SKIP.')
    if fails:
        print('RESULT: DO NOT SEND (%d blocking reasons)' % len(fails))
        return 1
    print('RESULT: local sources clear; proceed to the Gmail check')
    return 0


if __name__ == '__main__':
    sys.exit(main())
