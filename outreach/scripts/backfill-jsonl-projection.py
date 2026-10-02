#!/usr/bin/env python3
"""Backfill JSONL/CSV status projection for the round-87 2026-09-19 UTC sends.

The engine's send rounds own status projection (manual section 8, 16c:
suppression_state / next_eligible_action / last_signal in the same run).
Round 87 fired 8 Gmail-verified sends but never projected them, leaving
pre-send-check.py's JSONL leg blind to ladder state.

Evidence: hidden_files/sweep-2026-09-18-round87.md ("8/8 Gmail-accepted and
sent-mail verified", "4 F2 day-11 seasonal touches SENT ... All 4 ladders
complete; watch only", "4 new cold ladders armed ... F1 windows open
2026-09-23"); round 88 confirms the batch ("2026-09-19 UTC day 8/10 CONSUMED
(round-87 batch, 02:16-02:17 UTC 2026-09-19)").

Scope: ONLY the 8 round-87 sends, ONLY the three status fields, ONLY rows
that already exist. No new rows, no deletions, no other field touched.
Both JSONL copies stay byte-identical; the CSV gets the same three fields
for the 4 rows it holds (the 4 F2 businesses have no CSV rows).

Usage: --dry-run (default) prints the planned edits; --apply writes them
after snapshotting every touched file to hidden_files/backfill-snapshots/.
"""
import argparse, csv, io, json, os, shutil, sys, time

HOME = os.path.expanduser('~')
GOAL = os.path.join(HOME, 'workspace/goals/ping-social-outreach-campaign')
JSONL_GOAL = os.path.join(GOAL, 'files/western-co-prospects.jsonl')
JSONL_YF = os.path.join(HOME, 'workspace/your_files/western-co-prospects.jsonl')
CSV = os.path.join(GOAL, 'files/western-co-business-owner-list.csv')
SNAP = os.path.join(GOAL, 'hidden_files/backfill-snapshots')

FIELDS = ('last_signal', 'suppression_state', 'next_eligible_action')

# For the 4 F2 rows the F1 projection already exists, so last_signal is
# APPENDED to (never replaced) and suppression/next are only replaced when
# they still hold the known pre-F2 ladder values. Anything else aborts.
F2_APPEND_LAST = '; 2026-09-19 F2 SENT (Gmail accepted, verified in sent mail; round 87); ladder complete, watch only'
F2_EXPECTED_SUP = 'ladder F2 2026-09-22'
F2_EXPECTED_NEXT = 'F2 eligible 2026-09-22 (F1 sent 2026-09-13)'
F2_NEW_SUP = 'none'
F2_NEW_NEXT = 'none (ladder complete 2026-09-19; watch only)'

# Audited update set: key = normalized business_name fragment; value = new fields.
# kind 'cold': all three fields must be empty before write.
# kind 'f2': last_signal appended, sup/next replaced only from expected stale values.
UPDATES = {
    # 4 cold sends (initial touches; F1 day 4-7 window opens 2026-09-23)
    'decktec outdoor designs': {'kind': 'cold', 'fields': {
        'last_signal': '2026-09-19 SENT (Gmail accepted, verified in sent mail; round 87)',
        'suppression_state': 'ladder F1 2026-09-23',
        'next_eligible_action': 'F1 draft eligible 2026-09-23+ (initial sent 2026-09-19)',
    }},
    'eckert renovations': {'kind': 'cold', 'fields': {
        'last_signal': '2026-09-19 SENT (Gmail accepted, verified in sent mail; round 87)',
        'suppression_state': 'ladder F1 2026-09-23',
        'next_eligible_action': 'F1 draft eligible 2026-09-23+ (initial sent 2026-09-19)',
    }},
    'miracle maids of denver': {'kind': 'cold', 'fields': {
        'last_signal': '2026-09-19 SENT (Gmail accepted, verified in sent mail; round 87)',
        'suppression_state': 'ladder F1 2026-09-23',
        'next_eligible_action': 'F1 draft eligible 2026-09-23+ (initial sent 2026-09-19)',
    }},
    'pride n service junk removal': {'kind': 'cold', 'fields': {
        'last_signal': '2026-09-19 SENT (Gmail accepted, verified in sent mail; round 87)',
        'suppression_state': 'ladder F1 2026-09-23',
        'next_eligible_action': 'F1 draft eligible 2026-09-23+ (initial sent 2026-09-19)',
    }},
    # 4 F2 sends (ladders complete; watch only)
    'mh electrical & solar': {'kind': 'f2', 'fields': {}},
    'sanders & johnson': {'kind': 'f2', 'fields': {}},
    'smart garage door service': {'kind': 'f2', 'fields': {}},
    'to the t plumbing': {'kind': 'f2', 'fields': {}},
}


def norm(s):
    return (s or '').strip().lower()


def load_jsonl(path):
    with open(path, encoding='utf-8') as f:
        return f.read().splitlines()


def parse(line):
    return json.loads(line) if line.strip() else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--csv-only', action='store_true',
                    help='apply only the CSV portion (JSONL already done)')
    args = ap.parse_args()

    skip_jsonl = args.csv_only

    matched = {}
    new_lines = None
    if not skip_jsonl:
        lines = load_jsonl(JSONL_GOAL)
        rows = [parse(l) for l in lines]
        # Every update key must match exactly one existing JSONL row.
        for key in UPDATES:
            hits = [i for i, r in enumerate(rows) if r and key in norm(r.get('business_name'))]
            if len(hits) != 1:
                sys.exit('ABORT: key %r matched %d JSONL rows (need exactly 1)' % (key, len(hits)))
            matched[key] = hits[0]
    # No update may clobber unexpected data: cold rows must have all three
    # fields empty; f2 rows must still hold the known pre-F2 ladder values.
    if not skip_jsonl:
        for key, i in matched.items():
            kind = UPDATES[key]['kind']
            r = rows[i]
            if kind == 'cold':
                for f in FIELDS:
                    if r.get(f):
                        sys.exit('ABORT: %s already has %s=%r; refusing to overwrite' % (
                            r['business_name'], f, r[f]))
            else:
                if r.get('suppression_state') != F2_EXPECTED_SUP or r.get('next_eligible_action') != F2_EXPECTED_NEXT:
                    sys.exit('ABORT: %s has unexpected ladder state %r / %r; refusing to transition' % (
                        r['business_name'], r.get('suppression_state'), r.get('next_eligible_action')))
                if 'F2 SENT' in (r.get('last_signal') or ''):
                    sys.exit('ABORT: %s last_signal already mentions F2 SENT; refusing to double-append' % r['business_name'])

        new_lines = list(lines)
        for key, i in matched.items():
            r = dict(rows[i])
            if UPDATES[key]['kind'] == 'cold':
                for f in FIELDS:
                    r[f] = UPDATES[key]['fields'][f]
            else:
                r['last_signal'] = (r.get('last_signal') or '') + F2_APPEND_LAST
                r['suppression_state'] = F2_NEW_SUP
                r['next_eligible_action'] = F2_NEW_NEXT
            new_lines[i] = json.dumps(r, ensure_ascii=False)

    # CSV: the 4 cold rows only; F2 businesses have no CSV rows by design.
    with open(CSV, encoding='utf-8') as f:
        csv_text = f.read()
    creader = csv.DictReader(io.StringIO(csv_text))
    cfields = creader.fieldnames
    for f in FIELDS:
        if f not in cfields:
            sys.exit('ABORT: CSV missing column %s' % f)
    crows = list(creader)
    cmatched = {}
    for key in [k for k in UPDATES if UPDATES[k]['kind'] == 'cold']:
        hits = [i for i, r in enumerate(crows) if key in norm(r.get('business_name'))]
        if len(hits) != 1:
            sys.exit('ABORT: key %r matched %d CSV rows (need exactly 1)' % (key, len(hits)))
        cmatched[key] = hits[0]
    for key, i in cmatched.items():
        for f in FIELDS:
            if crows[i].get(f):
                sys.exit('ABORT: CSV %s already has %s=%r' % (crows[i]['business_name'], f, crows[i][f]))
    for key, i in cmatched.items():
        for f in FIELDS:
            crows[i][f] = UPDATES[key]['fields'][f]
    out = io.StringIO()
    w = csv.DictWriter(out, fieldnames=cfields, lineterminator='\n')
    w.writeheader()
    w.writerows(crows)
    new_csv = out.getvalue()

    plan = 'Planned: '
    if not skip_jsonl:
        plan += '8 JSONL rows x 3 fields, '
    plan += '4 CSV rows x 3 fields.'
    print(plan)
    if not skip_jsonl:
        for key in UPDATES:
            new_sup = UPDATES[key]['fields']['suppression_state'] if UPDATES[key]['kind'] == 'cold' else F2_NEW_SUP
            print('  -', rows[matched[key]]['business_name'], '->', new_sup)
    else:
        for key in cmatched:
            print('  -', crows[cmatched[key]]['business_name'], '->', UPDATES[key]['fields']['suppression_state'])
    if not args.apply:
        print('DRY RUN. Pass --apply to write (snapshots first).')
        return

    os.makedirs(SNAP, exist_ok=True)
    ts = time.strftime('%Y%m%d-%H%M%S')
    snap_srcs = [CSV] if skip_jsonl else [JSONL_GOAL, CSV]
    for src in snap_srcs:
        dst = os.path.join(SNAP, ts + '-' + os.path.basename(src) + '.bak')
        shutil.copy2(src, dst)
        print('snapshot:', dst)
    if not skip_jsonl:
        with open(JSONL_GOAL, 'w', encoding='utf-8') as f:
            f.write('\n'.join(new_lines) + '\n')
        if not os.path.samefile(JSONL_GOAL, JSONL_YF):
            shutil.copy2(JSONL_GOAL, JSONL_YF)  # keep the alias copy byte-identical
    with open(CSV, 'w', encoding='utf-8') as f:
        f.write(new_csv)
    print('APPLIED.')


if __name__ == '__main__':
    main()
