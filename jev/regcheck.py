import json, sys
r = json.load(open(sys.argv[1]))
print('top keys:', list(r.keys())[:10])
def find(events, name):
    if isinstance(events, dict):
        return events.get(name)
    if isinstance(events, list):
        for e in events:
            if isinstance(e, dict) and e.get('event_type') == name:
                return e
    return None
ev = r.get('events', r)
for t in ['REPLAY_COMPLETED','WITNESS_CREATED','WITNESS_REJECTED','LINEAGE_CREATED','JEV_DECISION_EVALUATED','REPLAY_VERIFY','WITNESS_CREATE']:
    e = find(ev, t)
    print(t, '->', json.dumps(e)[:300] if e else 'NOT FOUND')
