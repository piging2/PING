#!/bin/bash
# diagnose shard C state
echo "== shard-c log (size + first/last lines) =="
ls -la /home/nolan/fyd-compile-harness/shard-c.log
head -20 /home/nolan/fyd-compile-harness/shard-c.log
echo "== processes mentioning queue-runner =="
ps aux | grep -F "queue-runner" | grep -v grep
echo "== manifest C status counts =="
node -e 'const fs=require("node:fs");const l=fs.readFileSync("/home/nolan/fyd-compile-harness/queue-shard-c/manifest.jsonl","utf8").split("\n").filter(x=>x.trim()).map(JSON.parse);const c={};for(const j of l)c[j.status]=(c[j.status]||0)+1;console.log(JSON.stringify(c));console.log("attempts sum:",l.reduce((a,j)=>a+j.attempts,0));console.log("last_error sample:",JSON.stringify(l.find(j=>j.last_error)?.last_error));'
echo "== results-shard-c jsonl =="
wc -l /home/nolan/fyd-compile-harness/results-shard-c.jsonl 2>/dev/null || echo "no jsonl yet"
ls /home/nolan/fyd-compile-harness/results-shard-c/ 2>/dev/null | wc -l
