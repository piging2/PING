import json
recs = [json.loads(l) for l in open('/home/nolan/fyd-missions/shard-0/results.patched-0-99.jsonl') if l.strip()]
print('records:', len(recs))
from collections import Counter
print('outcomes:', dict(Counter(r['outcome'] for r in recs)))
print('mutations:', dict(Counter(r['mutation'] for r in recs)))
print('categories:', dict(Counter(r.get('category') for r in recs)))
leaks = [r for r in recs if r['mutation'] == 'unbound-claim' and r['sentinel_rendered']]
print('unbound-claim sentinel rendered (expect 0):', len(leaks))
for r in leaks: print(' LEAK', r['mission'], r['fixture'])
uc = [r for r in recs if r['mutation'] == 'unbound-claim']
print('unbound-claim missions:', len(uc), 'rendered:', sum(1 for r in uc if r['sentinel_rendered']), 'unbound_claim_count>0:', sum(1 for r in uc if r['unbound_claim_count'] > 0))
crashes = [r for r in recs if r['outcome'] == 'CRASH']
print('crashes:', len(crashes))
for r in crashes[:3]: print(' CRASH', r['mission'], r['findings'][0]['message'][:120] if r['findings'] else '')
