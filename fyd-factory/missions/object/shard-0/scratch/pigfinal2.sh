python3 - <<'PYEOF'
import json, statistics
from collections import Counter
recs = [json.loads(l) for l in open('/home/nolan/fyd-missions/shard-0/results.jsonl') if l.strip()]
print('records:', len(recs), 'missions:', recs[0]['mission'], '..', recs[-1]['mission'])
print('outcomes:', dict(Counter(r['outcome'] for r in recs)))
print('failure_stage:', dict(Counter(r['failure_stage'] for r in recs if r['failure_stage'])))
print('mutations:', dict(Counter(r['mutation'] for r in recs)))
print('categories:', dict(Counter(r.get('category') for r in recs)))
print('crashes:', sum(1 for r in recs if r['outcome']=='CRASH'))
print('det mismatches:', sum(1 for r in recs if not r['determinism']['match']))
print('unsafe>0:', sum(1 for r in recs if r['unsafe_url_count']>0), 'hidden leaks:', sum(r['hidden_leaked_count'] for r in recs if r['hidden_leaked_count']>0))
print('unbound_claim_count>0:', sum(1 for r in recs if r['unbound_claim_count']>0))
print('sentinel rendered (unbound-claim):', sum(1 for r in recs if r['mutation']=='unbound-claim' and r['sentinel_rendered']))
print('sentinel rendered (tamper):', sum(1 for r in recs if r['mutation']=='unbound-claim-tamper' and r['sentinel_rendered']))
for stage in ('mutate','generate','render','determinism_check','verify'):
    vals = sorted(r['latencies_ms'][stage] for r in recs if stage in r['latencies_ms'])
    if vals:
        p50 = vals[int(0.5*len(vals))]; p95 = vals[int(0.95*len(vals))]
        print(f'lat {stage}: p50={p50}ms p95={p95}ms max={vals[-1]}ms')
nr = [r for r in recs if r['outcome']=='NEEDS_REVIEW']
print('NEEDS_REVIEW breakdown:', Counter((r['mutation'], r['failure_stage']) for r in nr))
PYEOF
