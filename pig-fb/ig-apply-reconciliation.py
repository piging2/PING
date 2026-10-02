#!/usr/bin/env python3
"""ig-apply-reconciliation.py -- the single authoritative writer of the IG skip list.

Consumes a reconciliation JSON produced by ig-nearmiss-followup.js and applies
it to the skip list. Rules (Nolan 2026-09-24):
- Only skip_eligible reconciled outcomes (CONFIRMED_EXCLUDE / CONFIRMED_EMPTY)
  may enter the skip list, each with its evidence recorded.
- RECOVERED_CANDIDATE removes the handle from skip (history kept).
- STILL_UNKNOWN / DEFERRED never enter skip and never become permanent rejects.
- Never rebuilds from raw near_misses; history is appended, never rewritten.

Usage:
  python3 ig-apply-reconciliation.py --skip <skip.json> --reconciliation <recon.json>
      --out <new-skip.json> --ledger <history.json> [--dry-run]
"""
import argparse, json, os, sys
from datetime import datetime, timezone

def norm(h): return h.lstrip('@').strip().lower()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--skip', required=True)
    ap.add_argument('--reconciliation', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--ledger', required=True)
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    now = datetime.now(timezone.utc).isoformat()

    skip = json.load(open(a.skip))
    skipn = {norm(x): x for x in skip}
    recon = json.load(open(a.reconciliation))
    ledger = json.load(open(a.ledger)) if os.path.exists(a.ledger) else {}

    counts = {'added': 0, 'already': 0, 'recovered_removed': 0, 'unknown_kept': 0, 'deferred': 0}
    for r in recon.get('reconciled', []):
        h = norm(r['account'])
        ev = ledger.setdefault(h, [])
        disp = r['disposition']
        entry = {'ts': now, 'disposition': disp,
                 'reason': r.get('disposition_reason'),
                 'evidence': r.get('evidence'),
                 'source': recon.get('source_result')}
        if r.get('skip_eligible') and disp in ('CONFIRMED_EXCLUDE', 'CONFIRMED_EMPTY'):
            if h not in skipn:
                skipn[h] = r['account']
                counts['added'] += 1
                entry['action'] = 'skip_added'
            else:
                counts['already'] += 1
                entry['action'] = 'skip_confirmed'
            ev.append(entry)
        elif disp in ('RECOVERED_CANDIDATE', 'RECOVERED_REVIEW'):
            # Recovered (REVIEW = passes gates but needs A2 review, e.g. personal
            # account type): never skip-eligible; remove from skip if present.
            if h in skipn:
                del skipn[h]
                counts['recovered_removed'] += 1
                entry['action'] = 'skip_removed_recovered'
            else:
                entry['action'] = 'recovered_not_in_skip'
            ev.append(entry)
        elif disp == 'DEFERRED':
            counts['deferred'] += 1
            entry['action'] = 'deferred_not_skipped'
            ev.append(entry)
        else:  # STILL_UNKNOWN and anything else: never a permanent reject
            counts['unknown_kept'] += 1
            entry['action'] = 'unknown_not_skipped'
            ev.append(entry)

    new_skip = sorted(skipn.values(), key=lambda s: s.lower())
    if not a.dry_run:
        json.dump(new_skip, open(a.out, 'w'), indent=2)
        json.dump(ledger, open(a.ledger, 'w'), indent=2)
    print(json.dumps({'ok': True, 'dry_run': a.dry_run,
                      'skip_before': len(skip), 'skip_after': len(new_skip),
                      'counts': counts}))

if __name__ == '__main__':
    main()
