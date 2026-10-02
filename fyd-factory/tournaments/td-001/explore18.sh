#!/bin/bash
set -u
ls /home/nolan/ping/var/fyd-projections/ 2>/dev/null || echo "NO PROJECTION DIR"
for f in /home/nolan/ping/var/fyd-projections/*.json; do
  [ -f "$f" ] || continue
  echo "== $f"
  python3 -c "
import json
d = json.load(open('$f'))
g = d['graph']
from collections import Counter
print('objects:', len(g['objects']))
print(Counter((o['schema'], o['visibility']) for o in g['objects']))
print('meta siteId:', d['meta']['siteId'], 'dumpedAt:', d['meta'].get('dumpedAt'))
"
done
