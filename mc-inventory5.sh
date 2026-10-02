#!/bin/bash
cd /home/nolan/projects/ping || exit 1
echo "=== fixture file head ==="
head -40 src/fyd/proceduralize/__fixtures__/happy-place-graph.ts
echo "=== fixture export sizes ==="
node -e "
const fs=require('fs');
for (const f of ['happy-place-graph','coppersmith-graph','happy-place-rich-graph']) {
  try {
    const src=fs.readFileSync('src/fyd/proceduralize/__fixtures__/'+f+'.ts','utf8');
    const ids=[...src.matchAll(/id:\s*['\"]([^'\"]+)['\"]/g)].map(m=>m[1]);
    console.log(f,'id-strings:',ids.length,'sample:',JSON.stringify(ids.slice(0,3)));
  } catch(e){ console.log(f,'ERR',e.message); }
}
" 2>/dev/null || echo "no node"
echo "=== wave2 objects on Pig ==="
find /home/nolan -maxdepth 4 -iname '*wave2*' 2>/dev/null | grep -v -e '.git' | grep -v -e 'worktrees' | head -20
echo "=== jsonl with 1000 records hunt ==="
find /home/nolan/projects/ping -name '*.jsonl' 2>/dev/null | grep -v -e 'node_modules' | grep -v -e '.git/' | head -20
echo "=== cron schedule lines ==="
for f in ~/workspace/cron.d/minutely/heartbeat__interval@30m.md ~/workspace/cron.d/runonce/pig-retry-after-commute__runonce@2026-09-17T08:20:00.md ~/workspace/system-cron.d/hourly/deterministic-doctor__interval@1h.md; do
  echo "--- $f"
  grep -m2 -e '^schedule\|every\|cron:' "$f" | head -4
done
ls ~/workspace/cron.d/secondly ~/workspace/cron.d/hourly ~/workspace/cron.d/daily ~/workspace/cron.d/weekly ~/workspace/cron.d/monthly ~/workspace/cron.d/yearly 2>/dev/null | head
