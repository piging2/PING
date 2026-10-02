import json
from collections import Counter
r = json.load(open('/home/nolan/projects/ping/cohort-rerun/rerun-g3-employment-results.json'))
for b in r:
    print('====', b['site_id'], 'employment =', b.get('employment'))
    ed = b.get('employment_drops', [])
    print('  employment drops:', Counter((d['predicate'], d['outcome']) for d in ed))
    print('  persons_observed:', b.get('persons_observed'), 'person_objects:', b.get('person_objects'))
    print('  employment_rels:', b.get('employment_rels'))
