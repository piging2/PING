export TSX_TSCONFIG_PATH=/home/nolan/fyd-missions/shard-0/tsconfig.json
cd /home/nolan/projects/ping && node_modules/.bin/tsx --import /home/nolan/fyd-missions/shard-0/redirect-loader.mjs /home/nolan/fyd-missions/shard-0/harness.ts /home/nolan/fyd-missions/shard-0/fixtures /home/nolan/fyd-missions/shard-0/smoke.jsonl 0 5 /home/nolan/fyd-missions/shard-0/smoke.log && echo ===SMOKE-OUT=== && cat /home/nolan/fyd-missions/shard-0/smoke.log && python3 -c "
import json
for l in open('/home/nolan/fyd-missions/shard-0/smoke.jsonl'):
    r=json.loads(l); print(r['mission'], r['fixture'].split('/')[-1], r['mutation'], r['outcome'], r['failure_stage'], r['sections'], r['determinism']['match'])
"
