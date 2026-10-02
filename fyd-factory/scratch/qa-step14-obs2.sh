#!/bin/bash
python3 -c "
import json
d = json.load(open('/home/nolan/fyd-proof-run/step1-observations-coppersmith-plumbing.json'))
print('site:', d['site'])
print('canonicalUrl:', d['canonicalUrl'])
print('observedAt:', d['observedAt'])
print('pipelineCommit:', d['pipelineCommit'])
print('acquisition:', json.dumps(d['acquisition'], indent=1)[:1500])
print('observationCount:', d['observationCount'])
obs = d['observations']
print('observations type:', type(obs))
for o in obs:
    print('- kind:', o.get('kind'), '| url:', o.get('url'), '| status:', o.get('statusCode'), '| bytes:', o.get('bytes'), '| evidenceHash:', o.get('evidenceHash'), '| fetchedAt:', o.get('fetchedAt'))
    print('  keys:', sorted(o.keys()))
"
