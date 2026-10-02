#!/usr/bin/env python3
# invalidate-skip-list.py -- P0 repair step 2.
# Invalidates skip-list entries whose ONLY negative evidence is the broken
# firstPost gate ("no post link found"). History is PRESERVED in the ledger;
# nothing is deleted. Entries move back to eligible/reconciliation state.
import json, glob, os
from datetime import datetime, timezone

BASE = os.path.expanduser('~/workspace/goals/ping-social-outreach-campaign/hidden_files')
PASSES = os.path.join(BASE, 'engagement-passes')
LATEST_SKIP = os.path.join(PASSES, 'ig-skip-list-20260924-1101.json')
TS = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M')

hist = {}
first_seen = {}
for f in sorted(glob.glob(os.path.join(PASSES, 'ig*-discover-*.result.json'))):
    d = json.load(open(f))
    for nm in d.get('near_misses', []):
        a = nm['account'].lstrip('@').lower()
        hist.setdefault(a, set()).add(nm.get('reason'))
        first_seen.setdefault(a, f)

skip = json.load(open(LATEST_SKIP))
skipn = [(x, x.lstrip('@').lower()) for x in skip]

invalidated = []
kept = []
for orig, norm in skipn:
    reasons = hist.get(norm)
    if reasons == {'no post link found'}:
        invalidated.append({'handle': orig, 'reasons': sorted(reasons),
                            'first_rejected_in': os.path.basename(first_seen[norm])})
    else:
        kept.append(orig)

note = ('previously rejected because observer was defective: the only negative '
        'evidence was the ig-discover.js firstPost gate ("no post link found"), which '
        'fires on DOM extraction failure (current IG DOM renders no /p/ or /reel/ '
        'anchors in the CDP session), not on empty feeds. Proven by experiment '
        'ig-nearmiss-experiment-2026-09-24.md. Returned to eligible/reconciliation '
        'state on 2026-09-24.')

ledger = {
    'action': 'skip_list_invalidation',
    'date': '2026-09-24',
    'source_skip_list': os.path.basename(LATEST_SKIP),
    'source_entries': len(skip),
    'invalidated_entries': len(invalidated),
    'kept_entries': len(kept),
    'invalidation_note': note,
    'invalidated': sorted(invalidated, key=lambda e: e['handle'].lower()),
}
ledger_path = os.path.join(PASSES, 'ig-skip-invalidation-2026-09-24.json')
json.dump(ledger, open(ledger_path, 'w'), indent=2)

new_skip_path = os.path.join(PASSES, f'ig-skip-list-{TS}.json')
json.dump(kept, open(new_skip_path, 'w'), indent=2)

print('invalidated:', len(invalidated), 'kept:', len(kept))
print('ledger:', ledger_path)
print('new skip list:', new_skip_path)
