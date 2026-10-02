#!/bin/bash
docker inspect ping-gateway --format '{{json .HostConfig}}' | python3 -c "
import json,sys
h = json.load(sys.stdin)
skip = {'Memory','MemorySwap'}
for k in sorted(h):
    if k in skip: continue
    v = h[k]
    if v in (None, '', 0, {}, [], False): continue
    print(k, '=', json.dumps(v)[:200])"
