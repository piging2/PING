#!/bin/bash
# Lane B live emission: boundary probe + 19 governed POST /events to the Oracle gateway.
set -u
echo "__B64BODIES__" | base64 -d > /tmp/laneb_bodies.json
echo "__B64BOUNDARY__" | base64 -d > /tmp/laneb_boundary.json
python3 - <<'PYEOF'
import json, urllib.request, urllib.error
GW = 'http://127.0.0.1:8080'
def post(path, obj):
    req = urllib.request.Request(GW + path, data=json.dumps(obj).encode(),
                                 headers={'Content-Type': 'application/json'}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()
    except Exception as e:
        return -1, repr(e)
out = {}
b = json.load(open('/tmp/laneb_boundary.json'))
code, resp = post('/events', b)
out['boundary'] = {'http': code, 'resp': resp[:400]}
results = []
for body in json.load(open('/tmp/laneb_bodies.json')):
    b2 = {k: v for k, v in body.items() if not k.startswith('_')}
    code, resp = post('/events', b2)
    try:
        rj = json.loads(resp)
    except Exception:
        rj = {'raw': resp[:300]}
    results.append({'label': body.get('_label'), 'http': code,
                    'event_id': rj.get('event_id'), 'event_type': rj.get('event_type'),
                    'error': rj.get('error'), 'message': (rj.get('message') or '')[:200]})
out['bodies'] = results
json.dump(out, open('/tmp/laneb_emit_results.json', 'w'), indent=1)
print(json.dumps({'boundary': out['boundary'],
                  'ok': sum(1 for r in results if r['http'] == 200),
                  'total': len(results)}))
PYEOF
