import json, collections
rows = [json.loads(l) for l in open('/home/nolan/fyd-factory-shard2/results.jsonl')]
print(collections.Counter(r['outcome'] for r in rows))
for r in rows:
    print(r['mission'], r['outcome'], r['failure_stage'], (r['failure_note'] or '')[:90],
          'warn:', len(r['warnings']), 'sec:', r['section_count'], 'unbound:', r['unbound_claim_count'])
    if r['warnings']:
        print('   warnings:', r['warnings'][:3])
